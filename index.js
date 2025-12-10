// index.js
const fs = require("fs-extra");
const path = require("path");
const sharp = require("sharp");
const glob = require("glob");
const crypto = require("crypto");

const inputFolder = path.resolve("assets");       // dossier assets en entrée
const outputFolder = path.resolve("assets"); // dossier assets en sortie

// 🔹 Générer un hash pour déduplication
async function hashImage(file) {
  const data = await fs.readFile(file);
  return crypto.createHash("md5").update(data).digest("hex");
}

// 🔹 Collecte des textures (inclut non-carrées) et déduplication par hash
async function collectTextures(baseFolder) {
  const textures = {}; // map relativeName -> { hash }
  const hashMap = {}; // map hash -> { file, width, height, names: [] }
  let maxTileSize = 0;
  let maxFile = "";

  // 🔹 glob sur tous les sous-dossiers de textures
  const files = glob.sync(`${baseFolder}/**/textures/**/*.png`);
  console.log(`🔍 Total PNG trouvés: ${files.length}`);

  for (const file of files) {
    if (file.endsWith("_portal.png")) continue; // ignorer *_portal.png

    const metadata = await sharp(file).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Mise à jour de la plus grande dimension rencontrée
    const maxDim = Math.max(width, height);
    if (maxDim > maxTileSize) {
      maxTileSize = maxDim;
      maxFile = file;
    }

    const h = await hashImage(file);

    const relativeName = path.relative(baseFolder, file).replace(/\\/g, "/").replace(".png", "");

    if (!hashMap[h]) {
      hashMap[h] = { file, width, height, names: [relativeName] };
    } else {
      // duplicate: add alias name to the existing hash entry
      hashMap[h].names.push(relativeName);
    }

    // store reference so models can map by relative name later
    textures[relativeName] = { hash: h };
  }

  console.log(`⚠️ Texture la plus grande: ${maxFile || "(aucune)"} (${maxTileSize}px)`);
  console.log(`✅ Textures uniques à traiter: ${Object.keys(hashMap).length}`);
  console.log(`✅ Noms de textures référencés (avec alias): ${Object.keys(textures).length}`);
  return { textures, maxTileSize, hashMap };
}

// 🔹 Génération des atlases
async function generateAtlases(hashMap, outputFolder) {
  // Nous travaillons sur les entrées uniques (par hash)
  const entries = Object.entries(hashMap); // [hash, {file,width,height,names}]
    const atlases = [];
    let atlasIndex = 1;
    let start = 0;
    const atlasSize = 8192; // taille max de l'atlas

    const atlasDir = path.join(outputFolder, "atlases");
    fs.ensureDirSync(atlasDir);

    while (start < entries.length) {
        const slice = entries.slice(start, start + 2048); // max 2048 textures par atlas
        let x = 0, y = 0, rowHeight = 0;

        let atlas = sharp({
          create: { width: atlasSize, height: atlasSize, channels: 4, background: { r:0,g:0,b:0,alpha:0 } }
        });
        const composites = [];
        const mapping = {};
        const filesToRemove = [];

        // 🔹 Trier par hauteur décroissante pour meilleur packing
        slice.sort((a,b) => b[1].height - a[1].height);

        for (const [i, [hash, data]] of slice.entries()) {
          const file = data.file;
          const metadata = { width: data.width, height: data.height };

          if (x + metadata.width > atlasSize) {
            x = 0;
            y += rowHeight;
            rowHeight = 0;
          }

          if (y + metadata.height > atlasSize) {
            console.warn(`⚠️ L'atlas ${atlasIndex} est plein, certaines textures seront mises dans le prochain atlas`);
            break;
          }

          composites.push({ input: file, left: x, top: y });

          // Pour chaque nom (alias) qui pointe vers ce fichier, on crée une entrée identique
          for (const name of data.names) {
            mapping[name] = {
            texture: `atlases/atlas_${atlasIndex}.png`,
            x, y, width: metadata.width, height: metadata.height, custom_model_data: i + 1
            };
          }

          filesToRemove.push(file);
          x += metadata.width;
          rowHeight = Math.max(rowHeight, metadata.height);
        }

        atlas = atlas.composite(composites);

        const atlasPath = path.join(atlasDir, `atlas_${atlasIndex}.png`);
        await atlas.png().toFile(atlasPath);

        const jsonPath = path.join(atlasDir, `atlas_${atlasIndex}.json`);
        fs.writeJsonSync(jsonPath, mapping, { spaces: 2 });

        // 🔹 Supprimer les images originales après l'atlas généré
        for (const file of filesToRemove) {
        //   try { fs.removeSync(file); } catch(e) { /* ignore */ }
        }

        console.log(`✅ Atlas créé: ${atlasPath} (${Object.keys(mapping).length} textures)`);

        atlases.push(mapping);
        start += slice.length;
        atlasIndex++;
    }

    return atlases;
}



// 🔹 Réécriture des modèles JSON pour pointer sur les atlas
async function rewriteModels(baseFolder, atlases) {
  const modelFiles = glob.sync(`${baseFolder}/**/models/item/**/*.json`);
  
  for (const modelFile of modelFiles) {
    const json = await fs.readJson(modelFile);

    if (!json.textures || !json.textures.layer0) continue;

    const texName = json.textures.layer0.replace(/^minecraft:/, "").replace(/^.*\//, ""); 
    let replaced = false;

    for (const atlas of atlases) {
      for (const [name, data] of Object.entries(atlas)) {
        if (name.endsWith(texName)) {
          json.textures.layer0 = data.texture;
          json.custom_model_data = data.custom_model_data;
          replaced = true;
          break;
        }
      }
      if (replaced) break;
    }

    if (replaced) {
    //   await fs.writeJson(modelFile, json, { spaces: 2 });
      console.log(`✏️ Modèle mis à jour: ${modelFile}`);
    }
  }
}

// 🔹 Main
(async () => {
  console.log("🔎 Collecte des textures et déduplication...");
  const { textures, hashMap } = await collectTextures(inputFolder);

  if (Object.keys(hashMap).length === 0) {
    console.log("⚠️ Aucune texture unique à traiter. Vérifie le dossier ou les fichiers _portal.png.");
    return;
  }

  console.log("🖼️ Génération des atlas...");
  const atlases = await generateAtlases(hashMap, outputFolder);

  console.log("✏️ Réécriture des modèles JSON...");
  await rewriteModels(inputFolder, atlases);

  console.log("🎉 Optimisation terminée !");
})();
