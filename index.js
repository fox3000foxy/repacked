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
  const atlasSize = 8192 / 2; // taille max de l'atlas

  const atlasDir = path.join(outputFolder, "atlases");
  fs.ensureDirSync(atlasDir);

  // Guillotine-style bin packer (simple, efficace pour rectangles variés)
  class GuillotineBin {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.freeRects = [{ x: 0, y: 0, w: w, h: h }];
      this.used = [];
    }

    insert(w, h) {
      // find best free rect by smallest area leftover
      let bestIndex = -1; let bestScore = Infinity;
      for (let i = 0; i < this.freeRects.length; i++) {
        const r = this.freeRects[i];
        if (w <= r.w && h <= r.h) {
          const leftover = (r.w * r.h) - (w * h);
          if (leftover < bestScore) { bestScore = leftover; bestIndex = i; }
        }
      }
      if (bestIndex === -1) return null;
      const free = this.freeRects.splice(bestIndex, 1)[0];
      const node = { x: free.x, y: free.y, w, h };
      this.used.push(node);

      // split the free rect into two (right and bottom)
      const right = { x: free.x + w, y: free.y, w: free.w - w, h: h };
      const bottom = { x: free.x, y: free.y + h, w: free.w, h: free.h - h };
      if (right.w > 0 && right.h > 0) this.freeRects.push(right);
      if (bottom.w > 0 && bottom.h > 0) this.freeRects.push(bottom);

      this._mergeFreeList();
      return node;
    }

    _rectContained(a, b) {
      return a.x >= b.x && a.y >= b.y && (a.x + a.w) <= (b.x + b.w) && (a.y + a.h) <= (b.y + b.h);
    }

    _mergeFreeList() {
      // remove any free rects contained in another
      for (let i = 0; i < this.freeRects.length; i++) {
        for (let j = i + 1; j < this.freeRects.length; j++) {
          const a = this.freeRects[i], b = this.freeRects[j];
          if (this._rectContained(a, b)) { this.freeRects.splice(i, 1); i--; break; }
          if (this._rectContained(b, a)) { this.freeRects.splice(j, 1); j--; }
        }
      }
    }
  }

  // On crée plusieurs atlas jusqu'à placer toutes les textures
  while (start < entries.length) {
    const slice = entries.slice(start, start + 16384); // large chunk, pack until full
    // sort by max(side) desc to place big rects first
    slice.sort((a, b) => Math.max(b[1].width, b[1].height) - Math.max(a[1].width, a[1].height));

    const bin = new GuillotineBin(atlasSize, atlasSize);
    const composites = [];
    const mapping = {};
    const filesPlaced = new Set();
    let idCounter = 1;

    for (const [hash, data] of slice) {
      const w = data.width, h = data.height;
      const node = bin.insert(w, h);
      if (!node) continue; // will be packed in next atlas

      // add composite entry
      composites.push({ input: data.file, left: node.x, top: node.y });
      filesPlaced.add(data.file);

      for (const name of data.names) {
        mapping[name] = {
          texture: `atlases/atlas_${atlasIndex}.png`,
          x: node.x, y: node.y, width: w, height: h, custom_model_data: idCounter++
        };
      }
    }

    if (composites.length === 0) break; // nothing placed (shouldn't happen)

    const atlas = sharp({ create: { width: atlasSize, height: atlasSize, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } });
    await atlas.composite(composites).png().toFile(path.join(atlasDir, `atlas_${atlasIndex}.png`));
    fs.writeJsonSync(path.join(atlasDir, `atlas_${atlasIndex}.json`), mapping, { spaces: 2 });

    // remove files that were placed
    for (const f of filesPlaced) {
      try { fs.removeSync(f); } catch(e) { /* ignore */ }
    }

    console.log(`✅ Atlas créé: ${path.join(atlasDir, `atlas_${atlasIndex}.png`)} (${Object.keys(mapping).length} textures)`);
    atlases.push(mapping);

    // advance start by number of entries attempted (some may remain unplaced)
    // remove placed entries from entries list
    const remaining = [];
    for (const [hash, data] of slice) {
      if (!filesPlaced.has(data.file)) remaining.push([hash, data]);
    }

    // replace entries[start .. start+slice.length) with remaining
    entries.splice(start, slice.length, ...remaining);
    // if nothing remaining in the slice, move start forward by remaining length 0 -> advance
    if (remaining.length === 0) start += 0; // all placed, entries length reduced
    // If entries still include unplaced items at the same start index, increment atlasIndex to make progress
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
