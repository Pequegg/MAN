/* Op-Art Fan - Service Worker (GENERADO por tools/gen-sw.cjs)
   cache-first para estaticos, cache con red primero para navegacion,
   los assets de musica/fondos se cachean bajo demanda.
   NO EDITAR A MANO: la lista CORE y la VERSION se regeneran en cada build. */
const VERSION = "opartfan-v2-9aef8265";
const CORE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./assets/images/icon-maskable-512.png",
  "./assets/images/apple-touch-icon.png",
  "./js/config/settings.js",
  "./js/config/supabase.js",
  "./js/core/remote.js",
  "./js/core/db.js",
  "./js/core/economy.js",
  "./js/core/auth.js",
  "./js/core/util.js",
  "./js/levels/levels.js",
  "./js/levels/daily.js",
  "./js/core/state.js",
  "./js/levels/cosmetics.js",
  "./js/core/audio.js",
  "./js/core/engine.js",
  "./js/arena/arena.js",
  "./js/arena/minigames.js",
  "./js/arena/duels.js",
  "./js/arena/realtime.js",
  "./js/arena/live.js",
  "./js/core/game.js",
  "./js/ui/settings.js",
  "./js/ui/menu.js",
  "./js/ui/tutorial.js",
  "./js/ui/register.js",
  "./js/ui/levels.js",
  "./js/ui/shop.js",
  "./js/ui/ach.js",
  "./js/ui/rank.js",
  "./js/ui/daily.js",
  "./js/ui/results.js",
  "./js/ui/end.js",
  "./js/loader/assets.js",
  "./js/ui/armario.js",
  "./js/ui/duel.js",
  "./js/ui/live.js",
  "./js/ui/notix.js",
  "./js/ui/admin.js",
  "./js/ui/nav.js",
  "./js/feature/features.js",
  "./js/feature/perfil.js",
  "./js/feature/spirit.js",
  "./js/feature/poems.js",
  "./js/feature/palettes.js",
  "./js/feature/zen.js",
  "./js/feature/talismans.js",
  "./js/feature/events.js",
  "./js/feature/minigames.js"
];

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
