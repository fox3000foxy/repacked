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

// 🔹 Collecte des textures carrées uniquement
async function collectTextures(baseFolder) {
  const textures = {};
  const hashMap = {};
  let maxTileSize = 0;
  let maxFile = "";

  // 🔹 glob sur tous les sous-dossiers de textures
  const files = glob.sync(`${baseFolder}/**/textures/**/*.png`);
  console.log(`🔍 Total PNG trouvés: ${files.length}`);

  for (const file of files) {
    if (file.endsWith("_portal.png")) continue; // ignorer *_portal.png

    const metadata = await sharp(file).metadata();
    if (metadata.width !== metadata.height) continue; // seulement carrées

    const size = metadata.width;
    if (size > maxTileSize) {
      maxTileSize = size;
      maxFile = file;
    }

    const h = await hashImage(file);
    if (!hashMap[h]) {
      hashMap[h] = file;
      const relativeName = path.relative(baseFolder, file).replace(/\\/g, "/").replace(".png", "");
      textures[relativeName] = file;
    }
  }

  console.log(`⚠️ Texture la plus grande: ${maxFile || "(aucune)"} (${maxTileSize}px)`);
  console.log(`✅ Textures carrées à traiter: ${Object.keys(textures).length}`);
  return { textures, maxTileSize };
}

// 🔹 Génération des atlases
async function generateAtlases(textures, outputFolder) {
    const entries = Object.entries(textures);
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

        for (const [i, [name, file]] of slice.entries()) {
            const metadata = await sharp(file).metadata();

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
            mapping[name] = { 
                texture: `atlases/atlas_${atlasIndex}.png`, 
                x, y, width: metadata.width, height: metadata.height, custom_model_data: i + 1 
            };

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
            fs.removeSync(file);
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
      await fs.writeJson(modelFile, json, { spaces: 2 });
      console.log(`✏️ Modèle mis à jour: ${modelFile}`);
    }
  }
}

// 🔹 Main
(async () => {
  console.log("🔎 Collecte des textures et déduplication...");
  const { textures } = await collectTextures(inputFolder);

  if (Object.keys(textures).length === 0) {
    console.log("⚠️ Aucune texture carrée à traiter. Vérifie le dossier ou les fichiers _portal.png.");
    return;
  }

  console.log("🖼️ Génération des atlas...");
  const atlases = await generateAtlases(textures, outputFolder);

  console.log("✏️ Réécriture des modèles JSON...");
  await rewriteModels(inputFolder, atlases);

  console.log("🎉 Optimisation terminée !");
})();
