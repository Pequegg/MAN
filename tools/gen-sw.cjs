// gen-sw.cjs - regenera sw.js con la lista CORE autogenerada desde los
// <script src> reales de index.html y una VERSION = hash corto del contenido
// (bump automatico en cada build). Invocado desde tools/build.cjs.
const fs = require('fs');
const path = require('path');

function main(root) {
const ROOT = root || process.argv[2] || 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Scripts en orden de carga (los <script src=...>), nunca a mano.
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

// Ficheros que se precachean (CORE): el índice, el css, el manifest y los
// scripts split. Los assets de música/fondos siguen bajo demanda en runtime.
const FEAT = ['./js/feature/features.js', './js/feature/perfil.js', './js/feature/spirit.js', './js/feature/poems.js'];
const CORE = ['./', './index.html', './css/style.css', './manifest.webmanifest',
  './assets/images/icon-192.png', './assets/images/icon-512.png',
  './assets/images/icon-maskable-512.png', './assets/images/apple-touch-icon.png']
  .concat(scripts.map(s => './' + s))
  .concat(FEAT);

// Version: hash corto (djb2, 8 hex) del contenido en orden. Cualquier cambio
// en un script css o html cambia la version -> el SW se actualiza solo.
function hash8(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}
let blob = html;
for (const s of scripts) {
  try { blob += s + fs.readFileSync(path.join(ROOT, s), 'utf8'); } catch (e) { blob += s; }
}
for (const f of FEAT) {
  try { blob += f + fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { blob += f; }
}
blob += fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const VERSION = 'opartfan-v2-' + hash8(blob);

const sw = `/* Op-Art Fan - Service Worker (GENERADO por tools/gen-sw.cjs)
   cache-first para estaticos, cache con red primero para navegacion,
   los assets de musica/fondos se cachean bajo demanda.
   NO EDITAR A MANO: la lista CORE y la VERSION se regeneran en cada build. */
const VERSION = ${JSON.stringify(VERSION)};
const CORE = ${JSON.stringify(CORE, null, 2)};

self.addEventListener('install', function (e) {
  e.waitUntil((function () {
    var cache = caches.open(VERSION);
    return cache.then(function (c) {
      return Promise.all(CORE.map(function (rel) {
        return c.add(new URL(rel, self.location).href).catch(function () {});
      }));
    });
  })());
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navegacion: red primero, cache como respaldo (siempre la version nueva)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // estaticos: cache primero, y se actualiza en segundo plano
  e.respondWith(
    caches.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    })
  );
});
`;

fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
console.log('sw.js -> VERSION ' + VERSION + ' | CORE ' + CORE.length + ' ficheros (' + Math.round(sw.length / 1024) + ' KB)');
}

if (typeof module !== 'undefined' && module.exports) module.exports = main;
if (require.main === module) main();