const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1) CSS
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('no <style> block found');
fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'css/style.css'), '/* Op-Art Fan - estilos (extraidos de index.html) */\n' + m[1]);
console.log('css/style.css', m[1].length, 'bytes');

// 2) body interiores (lineas 263-594, 1-based)
const L = html.split('\n');
const body = L.slice(261, 594).join('\n');

// 3) orden de carga de scripts
const order = [
  'js/config/settings.js',
  'js/core/util.js',
  'js/levels/levels.js',
  'js/levels/daily.js',
  'js/core/state.js',
  'js/core/audio.js',
  'js/core/engine.js',
  'js/arena/arena.js',
  'js/arena/minigames.js',
  'js/core/game.js',
  'js/ui/settings.js',
  'js/ui/menu.js',
  'js/ui/tutorial.js',
  'js/ui/register.js',
  'js/ui/levels.js',
  'js/ui/shop.js',
  'js/ui/ach.js',
  'js/ui/rank.js',
  'js/ui/daily.js',
  'js/ui/results.js',
  'js/ui/end.js',
  'js/loader/assets.js',
  'js/ui/nav.js',
];
const scripts = order.map(s => '  <script src="' + s + '"></script>').join('\n');

const head = [
  '<!DOCTYPE html>',
  '<html lang="es">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">',
  '<meta name="theme-color" content="#1b0a05">',
  '<meta name="description" content="Op-Art Fan - abanico mandala interactivo con tematica china: 18 niveles, arena, ranking y musica.">',
  '<title>Op-Art Fan</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">',
  '<link rel="stylesheet" href="css/style.css">',
  '<noscript><p style="padding:20px;color:#fff;text-align:center;">Op-Art Fan necesita JavaScript. Activalo para jugar.</p></noscript>',
  '</head>',
  '<body>',
].join('\n');

const tail = ['</body>', '</html>'].join('\n');

const out = head + '\n' + body + '\n\n' + scripts + '\n' + tail;
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('index.html', out.length, 'bytes');