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
  config/supabase.js    URL del proyecto + llave anon (el interruptor del online)
  core/
    util.js             Helpers ($, randoms, fechas, localStorage)
    remote.js           Cliente Supabase (PostgREST) sin SDK + RPC
    db.js               Capa de datos offline-first: local + sync a la nube
    economy.js          Economía (Fase 1): compras con transacción (RPC) o local
    auth.js             Login Google (PKCE) + sesión de invitado (GoTrue)
    state.js            Estado global persistido, toasts, logros
    audio.js            Web Audio: synth de SFX + gancho a sonidos reales
    engine.js           Layout, prerender del abanico y del fondo
    game.js             Partida principal: update, input, render, fin
  levels/
    levels.js           Los 18 niveles + datos de tienda/skins/logros
    daily.js            Definición del reto diario
    cosmetics.js        Cosmética (Fase 1): abanicos, marcos, títulos, mascotas, tienda rotativa
  arena/
    arena.js            Entrada/salida de arena, grupos, temporadas, armario
    minigames.js        4 mini-juegos de arena (caligrafía, faroles, rueda, tambor)
  ui/                   Render y eventos de cada pantalla (settings, menu,
                        tutorial, register, levels, shop, armario, ach, rank,
                        daily, results, end, nav)
  loader/
    assets.js           Mapa de assets + carga inteligente + música + fallbacks
assets/
  images/               14 fondos ilustrados (uno por decoración de nivel)
  audio/sfx/            8 sonidos reales (acierto, fallo, trampa, oro, combo,
                        compra, logro, jefe)
  audio/music/          3 pistas ambientales en loop (calma, fiesta, épica)
supabase/
  arena.sql             Esquema SQL (tablas + RLS) para ejecutar en Supabase
tools/
  gen-assets.cjs        Regenera PNG + WAV (requiere node-canvas)
  split.cjs / build.cjs Regeneran el split y la estructura a partir del monolito
  supabase-setup.ps1    Guía para conectar el proyecto Supabase
  tests/                Suite de validación (jsdom + node-canvas + red simulada)
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

La Arena, el reto diario y el ranking comparten datos por internet ya que el
**esquema SQL ya está aplicado en el proyecto Supabase del jugador** y la llave
**anon** ya vive en `js/config/supabase.js`. Las tablas creadas son: `scores`,
`daily`, `group_members`, `group_pts`, `arena_daily`, `users`, `duels`,
`friends`, `purchases`; con índices y políticas RLS (los anónimos solo tocan sus
datos). Si algún día clonas este repo en otro proyecto Supabase, el orden es:

1. Dashboard → **SQL Editor** → pega el contenido de `supabase/arena.sql` → **Run**
   (crea tablas, índices, RLS y el RPC `redeem_item`, todo idempotente).
2. Copia tu llave **anon public** (Settings → API) y pégala en
   `js/config/supabase.js`:
   `var SUPABASE_ANON_KEY = "eyJ...tu-llave-anon...";`

Con eso la Arena sincroniza **grupos, temporadas y el ranking mundial**, y el reto
diario + ranking global se comparten por internet. Sin llave o sin red, todo sigue
funcionando local (offline-first).

### Cuentas (Fase 0) — "Continuar con Google"

La pantalla de registro muestra un botón **"Continuar con Google"**: entra con tu
cuenta, el juego **migra el progreso de invitado a tu cuenta** (monedas, niveles
desbloqueados, arena, puntajes) y desde entonces se **sincroniza en la nube** —
abre el juego en otro dispositivo con la misma cuenta y verás tu progreso allí.

- El juego sigue funcionando 100 % como invitado (local) sin login.
- Todo paso por la capa `js/core/db.js`: siempre guarda en local primero
  (offline-first) y sincroniza cuando hay sesión + red; los conflictos se resuelven
  por *último guardado gana*.
- El chip **☁️ nube** en el menú indica sesión conectada.

Para habilitar el botón de Google en tu proyecto Supabase:
1. Corre `supabase/arena.sql` (crea también la tabla `users`).
2. Dashboard → **Authentication → Providers → Google**: actívalo con tus claves de
   la Google Cloud Console (el botón solo escribe/lee si la llave anon está puesta).
3. En **Authentication → URL Configuration**, añade
   `https://pequegg.github.io/MAN/` como *Site URL* y redirect válido (o tu propio
   dominio).

### Configurar el proyecto

```bash
powershell -ExecutionPolicy Bypass -File tools\supabase-setup.ps1
```

Ese script comprueba si tienes la CLI de Supabase y, si el proyecto ya está
enlazado, sube el esquema automáticamente; si no, te indica exactamente los 2
clics que quedan en el dashboard.

## Publicar (alternativas)

1. GitHub Pages: ya activo; cualquier push a `main` redeploya.
2. Netlify/Vercel: importa el repo; framework = *None*; public dir = `/`.
3. Cualquier CDN/Hosting estático: sube todo tal cual.

Extensiones posibles en `tools/gen-assets.cjs`: `assets/audio/music/` ya admite
varias candidatas por familia (heron-boat, ying, heavenly-rive…) si se amplía el
mapa de `CASETS.music`.

## Roadmap (especificación v2.0 "Online")

Se siguió la spec `SPEC-op-art-fan-v2.md`. **Capa de datos elegida: Supabase**
(en vez de Firebase): el jugador ya tenía su proyecto, es SQL real (PostgREST
abierto, sin SDK) y el esquema/RLS vive en un solo archivo versionable.

- ✅ **Fase 0 — Fundaciones**: capa `DB` offline-first (`js/core/db.js`),
  auth Google (PKCE) + invitado (`js/core/auth.js`), perfil en la nube (tabla
  `users`), migración del progreso local al loguear, ranking/diario/arena online.
- ✅ **Fase 1 — Identidad y economía**: armario completo (mascota, abanico, marco,
  título) con **validación server-side** por el RPC `redeem_item` (transacción,
  bloqueo de fila, auditoría en `purchases`), tienda **rotativa** diaria (semilla
  de `daily.js`), y 8 abanicos + 6 marcos + 5 títulos + 4 mascotas de contenido.
  *Criterio cumplido*: dos dispositivos con la misma cuenta ven el mismo
  inventario y equipamiento (se sincroniza en `users.profile`).
  Módulos: `js/levels/cosmetics.js`, `js/core/economy.js`, `js/ui/armario.js`.
- ⬜ **Fase 2 — Duelos asíncronos**: tabla `duels` ya creada en el SQL; falta el
  flujo reto => huella validada => `resolve_duel` (RPC anti-trampas) => recompensas.
- ⬜ **Fase 3 — Tiempo real y producción**: salas 1v1 (realtime), push, admin.

Criterios de aceptación de la Fase 0 (verificables): el juego funciona igual con y
sin red; al loguear con Google, el progreso local aparece en la nube y en otro
dispositivo.