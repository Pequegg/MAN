// bundle.cjs - genera un index.html autocontenido (CSS+JS inline).
// Sin assets externos el juego sigue funcionando al 100% (decor procedural
// + sintetizador). Usa el directorio de salida como primer argumento.
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan';
const OUT = process.argv[3] || path.join(ROOT, 'dist');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (all, src) => '<scr' + 'ipt>' + fs.readFileSync(path.join(ROOT, src), 'utf8') + '</scr' + 'ipt>');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('bundle ->', path.join(OUT, 'index.html'), html.length, 'bytes');