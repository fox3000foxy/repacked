// repack_audio.js — Ultra-aggressive audio compression for Minecraft resource packs
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

const inputFolder = path.resolve('pack/assets');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// 🔹 Collect all audio files
async function collectAudio(baseFolder) {
  const basePosix = baseFolder.replace(/\\+/g, '/');
  const pattern = `${basePosix}/**/sounds/**/*.{ogg,wav,mp3,flac}`;
  const audioFiles = glob.sync(pattern, { nodir: true, nocase: true });
  console.log(`🔍 Pattern: ${pattern}`);
  console.log(`🔍 Audio files found: ${audioFiles.length}`);
  return audioFiles;
}

function ffmpegRun(input, output, extraOptions = []) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(input)
      .output(output)
      .outputOptions(extraOptions)
      .on('end', () => resolve())
      .on('error', err => reject(err));
    cmd.run();
  });
}

// 🔹 Get audio info via ffprobe
function probeFile(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

async function compressAudio(baseFolder) {
  const files = await collectAudio(baseFolder);
  if (files.length === 0) {
    console.log('⚠️ No audio files found.');
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let skipped = 0;

  // Process in chunks of 8 for concurrency
  for (let i = 0; i < files.length; i += 8) {
    const chunk = files.slice(i, i + 8);
    await Promise.all(
      chunk.map(async file => {
        try {
          const statBefore = await fs.stat(file);
          totalBefore += statBefore.size;

          // Detect category from path
          const isMusic = /music|bgm|ambient|record|disc/i.test(file);

          // Probe to get info
          let channels = 2;
          let sampleRate = 44100;
          let duration = 0;
          try {
            const info = await probeFile(file);
            const stream = info.streams.find(s => s.codec_type === 'audio');
            if (stream) {
              channels = stream.channels || 2;
              sampleRate = parseInt(stream.sample_rate) || 44100;
              duration = parseFloat(stream.duration) || parseFloat(info.format.duration) || 0;
            }
          } catch (_) {}

          // Ultra-aggressive settings (still acceptable in-game):
          //
          // Music/ambient: stereo, 22.05kHz, VBR q0 (~64kbps stereo)
          //   - lowpass at 10kHz before downsampling
          //   - trim silence at start/end
          //
          // Effects: mono, 16kHz, VBR q-1 (~32kbps mono)
          //   - lowpass at 7.5kHz
          //   - trim silence at start/end
          //   - most MC SFX have no useful content above 7-8kHz

          // Build audio filter chain
          const filters = [];

          // Trim silence from start (threshold -50dB)
          filters.push('silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.02');

          // Trim silence from end (reverse → trim → reverse)
          filters.push('areverse');
          filters.push('silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.02');
          filters.push('areverse');

          // Lowpass to help encoder and avoid aliasing artifacts
          if (isMusic) {
            filters.push('lowpass=f=10000');
          } else {
            filters.push('lowpass=f=7500');
          }

          const opts = [
            '-vn',
            '-map_metadata', '-1',
            '-af', filters.join(','),
            '-c:a', 'libvorbis',
          ];

          if (isMusic) {
            opts.push('-q:a', '0');           // VBR q0 (~64kbps stereo)
            opts.push('-ar', '22050');        // 22.05 kHz
            // keep stereo for music
          } else {
            opts.push('-q:a', '-1');          // VBR q-1 (~32kbps mono)
            opts.push('-ar', '16000');        // 16 kHz — plenty for SFX
            opts.push('-ac', '1');            // mono
          }

          const tempOut = file + '.tmp.ogg';
          await ffmpegRun(file, tempOut, opts);

          // Only replace if the new file is actually smaller
          const statAfter = await fs.stat(tempOut);
          if (statAfter.size < statBefore.size) {
            fs.moveSync(tempOut, file, { overwrite: true });
            totalAfter += statAfter.size;
            const saved = ((1 - statAfter.size / statBefore.size) * 100).toFixed(1);
            const rel = path.relative(baseFolder, file).replace(/\\/g, '/');
            console.log(`✅ ${rel} — ${(statBefore.size / 1024).toFixed(0)}K → ${(statAfter.size / 1024).toFixed(0)}K (−${saved}%) [${isMusic ? 'music' : 'sfx'}]`);
          } else {
            fs.removeSync(tempOut);
            totalAfter += statBefore.size;
            skipped++;
          }
        } catch (err) {
          console.error(`⚠️ Error processing ${file}:`, err.message || err);
        }
      })
    );
    console.log(`  Progress: ${Math.min(i + 8, files.length)}/${files.length}`);
  }

  const savedTotal = totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0.0';
  console.log(`\n📊 Total: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB (−${savedTotal}%)`);
  console.log(`📊 ${skipped} files skipped (already optimal)`);
}

// 🔹 Main
(async () => {
  console.log('🔊 Ultra-aggressive audio compression (OGG Vorbis)...');
  await compressAudio(inputFolder);
  console.log('🎉 Done!');
})();
