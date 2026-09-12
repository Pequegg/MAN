# Op-Art Fan

Abanico mandala interactivo con temática china:
18 niveles progresivos, reto diario, arena con temporadas y grupos, tienda,
logros, perfil/avatar, ranking local y global, modo daltónico y música real.

Proyecto de **hosting 100% estático**: sin build en producción, se publica tal
cual en GitHub Pages, Netlify o cualquier CDN.

---

## Estructura del proyecto

```
index.html              Página única: estructura + orden de carga de scripts
css/style.css           Estilos (extraídos del HTML original)
js/
  config/settings.js    Constantes de arena, temporadas y rangos
  core/
    util.js             Helpers ($, randoms, fechas, localStorage)
    state.js            Estado global persistido, toasts, logros
    audio.js            Web Audio: synth de SFX + gancho a sonidos reales
    engine.js           Layout, prerender del abanico y del fondo
    game.js             Partida principal: update, input, render, fin
  levels/
    levels.js           Los 18 niveles + datos de tienda/skins/logros
    daily.js            Definición del reto diario
  arena/
    arena.js            Entrada/salida de arena, grupos, temporadas, armario
    minigames.js        4 mini-juegos de arena (caligrafía, faroles, rueda, tambor)
  ui/                   Render y eventos de cada pantalla (settings, menu,
                        tutorial, register, levels, shop, ach, rank, daily,
                        results, end, nav)
  loader/
    assets.js           Mapa de assets + carga inteligente + música + fallbacks
assets/
  images/               14 fondos ilustrados (uno por decoración de nivel)
  audio/sfx/            8 sonidos reales (acierto, fallo, trampa, oro, combo,
                        compra, logro, jefe)
  audio/music/          3 pistas ambientales en loop (calma, fiesta, épica)
tools/
  gen-assets.cjs        Regenera PNG + WAV (requiere node-canvas)
  split.cjs / build.cjs Regeneran el split y la estructura a partir del monolito
  tests/                Suite de validación (jsdom + node-canvas)
```

## Cómo funciona la carga (carga inteligente)

1. **Primera pantalla rápida**: `index.html` solo enlaza los scripts en orden;
   no hay bloqueos ni fetch inicial. El juego arranca de inmediato.
2. **Fondos**: `AssetBank.plan()` registra un fondo por nivel. `boot()` pide los
   niveles 1-3 y, en segundo plano, el resto (`AssetBank.demand`). Cada partida
   precarga los 2 niveles siguientes.
3. **Música**: Bajo demanda por familia temática (`calm` → `party` → `epic`),
   en loop con fade, elegida por el nivel (`famOf`). Se detiene al terminar la
   partida. El botón *Sonido y música* de Ajustes la silencia.
4. **SFX**: los clásicos sintetizados (`tone()`) se mantienen como capa base;
   cuando hay contexto de audio se disparan los WAV reales (`sndPlay`) — acierto,
   trampa, celda dorada, combo, compra, logro y victoria de jefe.
5. **Tolerancia a fallos**: si un asset falta (404, red lenta, offline), cada
   módulo degrada con elegancia: el nivel pinta el decor procedural original, la
   música calla y el synth sigue sonando. **Nunca pantalla en blanco.** Los
   errores de carga se capturan y solo se registran en consola.

## Medio y contenido generado

- **Imágenes**: `tools/gen-assets.cjs` (node-canvas) pinta los 14 fondos a partir
  de la paleta de cada nivel (tinta, olas, ciruelo, carpas, faroles, dragón, fénix,
  muralla, terracota, seda, templo, karst, ópera, niebla).
- **Música**: síntesis aditiva en WAV (22 kHz, loops sin costura) — 3 pistas
  (calma 158 s / fiesta / épica). Muy ligeras para móvil.
- **SFX**: 8 efectos PCM 16-bit (44,1 kHz).

## Tests

Herramientas en `tools/tests/` (necesitan `jsdom` y `canvas` en `node_modules`):

```bash
node tools/tests/smoke.cjs     # flujo completo: tutorial→registro→menú→nivel→resultado→tienda→logros→ranking→diario→arena
node tools/tests/mobile.cjs    # simulación móvil (viewport 375x667, puntero)
node tools/tests/budget.cjs    # presupuesto de primera carga (<220 KB) y que todos los assets existen
node tools/tests/bg.cjs        # valida fondo procedural + asset real en los 18 niveles (pixeles)
```

## En línea

**Ya está publicado**: <https://pequegg.github.io/MAN/>

- El deploy es automático (GitHub Pages, rama `main`, carpeta raíz): cada `git push`
  a `main` se publica en 1-2 minutos.
- Es una **PWA instalable**: en móvil abre la URL y usa *Añadir a pantalla de inicio*
  (Android) o *Agregar a pantalla de inicio* (iOS). Se abre a pantalla completa y
  sigue jugable **offline** gracias al service worker (`sw.js`), que precachea el
  núcleo y cachea bajo demanda fondos y música.
- Tras publicar una versión nueva, la primera visita pide la última versión por red
  (los navegadores actualizan el `sw.js` solos); si estás en modo avión, usa la caché.

## Ranking mundial (Arena online)

La Arena y el reto diario funcionan **100% local** (guardan en tu dispositivo).
Para que **todo el mundo** comparta el reto diario y se vea un **ranking mundial**,
activa la capa online de Firebase con un solo comando (Windows):

```bash
powershell -ExecutionPolicy Bypass -File tools\firebase-online.ps1
```

El script instala `firebase-tools`, te pide entrar con tu cuenta de Google (una
sola vez, se abre el navegador; plan gratuito Spark), crea el proyecto y la
Realtime Database, sube las reglas de prueba y deja la URL puesta en
`js/config/settings.js`. Luego solo hay que subir el cambio:

```bash
git add js/config/settings.js
git commit -m "firebase online"
git push
```

Si prefieres hacerlo a mano: crea una base en
[Firebase Realtime Database](https://console.firebase.google.com) y pega su URL en
`js/config/settings.js`:

```js
var FIREBASE_URL = "https://tuproyecto-default-rtdb.europe-west1.firebasedatabase.app/";
```

Reglas de prototipo (archivo `firebase-rules.json`): lectura/escritura abiertas
solo bajo `/arena/*` (miembros, puntos de temporada y marcador del reto diario).
Con eso la Arena sincroniza **grupos, temporadas y el ranking mundial** entre todos
los jugadores.

## Publicar (alternativas)

1. GitHub Pages: ya activo; cualquier push a `main` redeploya.
2. Netlify/Vercel: importa el repo; framework = *None*; public dir = `/`.
3. Cualquier CDN/Hosting estático: sube todo tal cual.

Extensiones posibles en `tools/gen-assets.cjs`: `assets/audio/music/` ya admite
varias candidatas por familia (heron-boat, ying, heavenly-rive…) si se amplía el
mapa de `CASETS.music`.