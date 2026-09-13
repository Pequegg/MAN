// test-budget: presupuesto de primera carga y de todo el proyecto.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';
const KB = b => Math.round(b / 1024) + ' KB';

let fail = 0;
const ok = (n, g) => { console.log((g ? 'OK   ' : 'FAIL ') + n); if (!g) fail++; };

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');

// scripts en orden de carga
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
let jsBytes = 0;
const sizes = [];
for (const s of srcs) {
  const b = fs.readFileSync(path.join(ROOT, s), 'utf8').length;
  jsBytes += b; sizes.push([s, b]);
}

// "primera pantalla": lo minimo para tutorial/menu/registro = index + css + todos
// los scripts (el juego es un solo bundle; la carga inteligente entra en assets)
const firstLoad = html.length + css.length + jsBytes;
console.log('index.html      ', KB(html.length));
console.log('css/style.css   ', KB(css.length));
console.log('scripts (' + srcs.length + ')', KB(jsBytes));
console.log('TOTAL carga inicial', KB(firstLoad));

ok('primera carga bajo 230 KB (movil 3G friendly)', firstLoad < 230 * 1024);

const maxBy = {};
sizes.forEach(([s, b]) => { const dir = s.split('/')[1]; if (!maxBy[dir] || b > maxBy[dir]) maxBy[dir] = b; });
let biggest = maxBy['core'] || 0;
ok('archivo mas grande < 40 KB (carga progresiva razonable)', Object.keys(maxBy).every(k => maxBy[k] < 40 * 1024));

// assets: todos los referenciados existen
let missing = [];
fs.readdirSync(path.join(ROOT, 'assets', 'images')).forEach(f => { if (f.endsWith('.png')) {} });
LEVELS_CHECK: {
  const levels = [];
  const src = fs.readFileSync(path.join(ROOT, 'js/levels/levels.js'), 'utf8');
  const vals = [...src.matchAll(/bd:"([a-z]+)"/g)].map(m => m[1]);
  [...new Set(vals)].forEach(bd => {
    if (!fs.existsSync(path.join(ROOT, 'assets/images/bg-' + bd + '.png'))) missing.push('images/bg-' + bd);
  });
}
for (const n of ['hit', 'miss', 'trap', 'gold', 'combo', 'buy', 'ach', 'boss']) {
  if (!fs.existsSync(path.join(ROOT, 'assets/audio/sfx', n + '.wav'))) missing.push('sfx/' + n);
}
for (const n of ['calm', 'party', 'epic']) {
  if (!fs.existsSync(path.join(ROOT, 'assets/audio/music', n + '.wav'))) missing.push('music/' + n);
}
ok('todos los assets referenciados existen', missing.length === 0);
if (missing.length) console.log('  faltan:', missing.join(', '));

// tamanos de audio por tipo (musica RTTI: < 1.5 MB)
let musicWorst = 0;
for (const n of ['calm', 'party', 'epic']) {
  const s = fs.statSync(path.join(ROOT, 'assets/audio/music', n + '.wav')).size;
  musicWorst = Math.max(musicWorst, s);
  console.log('  music/' + n + '.wav', KB(s));
}
ok('musica individual < 1.5 MB (se carga bajo demanda)', musicWorst < 1.5 * 1024 * 1024);

// ningun asset esta vacio
let empty = [];
const scan = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) scan(p);
  else if (fs.statSync(p).size <= 4) empty.push(p);
});
scan(path.join(ROOT, 'assets'));
ok('ningun asset vacio o corrupto (0 bytes)', empty.length === 0);

console.log(fail ? ('FALLOS: ' + fail) : 'PRESUPUESTO OK');
process.exit(fail ? 1 : 0);