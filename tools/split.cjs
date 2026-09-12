/* Split index.html -> proyecto con carpetas (extraccion mecanica por lineas). */
const fs = require('fs');
const path = require('path');
const SRC = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/index.html';
const OUT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';
const html = fs.readFileSync(SRC, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script found'); process.exit(1); }
const body = m[1];
const lines = body.split('\n'); // line k (0-based) == file line k+596
const CS = []; // content slice helper: file lines a..b inclusive
function slice(a, b) { return lines.slice(a - 595, b - 595 + 1).join('\n'); }
function write(rel, parts) {
  const full = [];
  full.push('/* Op-Art Fan - modulo: ' + rel + ' */');
  full.push('"use strict";');
  parts.forEach(p => { full.push(p.trim()); });
  const out = full.join('\n\n');
  const fp = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, out);
  console.log(rel, out.length, 'bytes');
}

// Datos de configuracion y constantes de arena
write('js/config/settings.js', [
  slice(601, 606),
  slice(1087, 1096)
]);

// Utilidades base
write('js/core/util.js', [ slice(608, 620) ]);

// Datos: niveles, tienda, skins, logros
write('js/levels/levels.js', [ slice(659, 680), slice(683, 706), slice(708, 727) ]);
write('js/levels/daily.js', [ slice(734, 752) ]);

// Estado global
write('js/core/state.js', [
  slice(636, 651),
  slice(653, 657),
  'var lastCompletedNormal = (function(){ var m=0; completed.forEach(function(c){ if(c<18 && c>m) m=c; }); return m; })();'
]);

// Audio base (WebAudio) + gestos
write('js/core/audio.js', [ slice(622, 634) ]);

// Motor: layout, prerender del abanico y fondo
write('js/core/engine.js', [ slice(1806, 2079) ]);

// Arena: grupos, temporadas, armario, reto diario, entrada, inicio/fin, handlers UI
write('js/arena/arena.js', [
  slice(1083, 1189),
  slice(1191, 1249),
  slice(1251, 1313),
  slice(1315, 1360),
  slice(1362, 1377),
  slice(1379, 1449),
  slice(1796, 1804)
]);

// Mini-juegos de arena: datos + logica + renders
write('js/arena/minigames.js', [ slice(1451, 1794) ]);

// Motor de partida: startGame, update, input, decor, render, finishGame
write('js/core/game.js', [ slice(2082, 2752) ]);

// Pantallas UI
write('js/ui/settings.js', [ slice(773, 776) ]);
write('js/ui/menu.js', [ slice(777, 790) ]);
write('js/ui/tutorial.js', [ slice(754, 759) ]);
write('js/ui/register.js', [ slice(761, 771) ]);
write('js/ui/levels.js', [ slice(792, 824) ]);
write('js/ui/shop.js', [ slice(826, 884) ]);
write('js/ui/ach.js', [ slice(886, 897) ]);
write('js/ui/rank.js', [ slice(899, 959) ]);
write('js/ui/daily.js', [ slice(961, 991) ]);
write('js/ui/results.js', [ slice(993, 1071) ]);
write('js/ui/end.js', [ slice(1073, 1081) ]);
write('js/ui/nav.js', [
  slice(729, 732),
  slice(2755, 2762)
]);

console.log('DONE');