/**
 * TraceBack — Download face-api.js model weights locally
 * Run once: node download-models.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ✅ Correct source — GitHub raw (official face-api.js repo)
const BASE   = 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights';
const OUTDIR = path.join(__dirname, 'public', 'weights');

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

function download(filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(OUTDIR, filename);
    const file = fs.createWriteStream(dest);

    function get(rawUrl, depth) {
      if (depth > 10) return reject(new Error('Too many redirects'));
      const parsed  = require('url').parse(rawUrl);
      const lib     = parsed.protocol === 'https:' ? https : require('http');
      const options = { hostname: parsed.hostname, path: parsed.path, headers: { 'User-Agent': 'Mozilla/5.0' } };
      lib.get(options, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(res.headers.location, depth + 1);
        }
        if (res.statusCode !== 200) {
          res.resume(); file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} → ${rawUrl}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          const size = fs.statSync(dest).size;
          console.log(`  ✅  ${filename}  (${(size/1024).toFixed(1)} KB)`);
          resolve();
        });
      }).on('error', e => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(e);
      });
    }
    get(`${BASE}/${filename}`, 0);
  });
}

(async () => {
  console.log('\n📦  Downloading face-api.js model weights...\n');
  for (const f of FILES) {
    process.stdout.write(`  ⬇  ${f} ... `);
    try {
      await download(f);
    } catch (e) {
      console.log(`\n  ❌  Failed: ${e.message}`);
      process.exit(1);
    }
  }
  console.log('\n✅  All models downloaded to public/weights/');
  console.log('🚀  Now restart the server: node server.js\n');
})();
