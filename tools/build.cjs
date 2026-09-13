// build.cjs - BUILD DE PRODUCCION de Op-Art Fan (hosting 100% estatico)
//   1) Regenera sw.js (CORE autogenerado desde index.html + VERSION hash)
//      -> tools/gen-sw.cjs
//   2) Genera dist/: bundle index.html autocontenido (CSS+JS inline) y copia
//      sw.js, manifest.webmanifest y los assets (para que la PWA funcione
//      en el build de produccion, no solo en la raiz del repo).
// Uso: node tools/build.cjs
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan';
const OUT = process.argv[3] || path.join(ROOT, 'dist');

// 1) service worker autogenerado
require(path.join(__dirname, 'gen-sw.cjs'))(ROOT);

// 2) dist/
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
let out = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
out = out.replace(/<script src="([^"]+)"><\/script>/g, (all, src) => '<scr' + 'ipt>' + fs.readFileSync(path.join(ROOT, src), 'utf8') + '</scr' + 'ipt>');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), out);
console.log('dist/index.html', out.length, 'bytes');

// PWA: sw + manifest + iconos + assets junto al bundle
for (const rel of ['sw.js', 'manifest.webmanifest']) {
  fs.copyFileSync(path.join(ROOT, rel), path.join(OUT, rel));
  console.log('dist/' + rel, 'copiado');
}
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
console.log('dist/assets/ copiado');

console.log('BUILD OK -> dist/');