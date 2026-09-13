# Persistent Agent State — "Default Project" (Op-Art-Fan)

## Objective
- Resolver el reporte del usuario sobre el nivel 9 "Gran Muralla" (primero "se ve raro", luego "el abanico se mueve muy rápido") y después su auditoría del login con Google (causas #1–#4), aplicando los parches de código, respetando las 5 suites verdes y sin poder tocar el dashboard de Supabase.

## Important Details
- **URL en vivo**: `https://pequegg.github.io/MAN/` — auto-deploy desde `main`.
- **Git**: commits con `-c user.name="Refrimar Dev" -c user.email="dev@refrimar.com"`, push a `origin` = `https://github.com/Pequegg/MAN.git`. Último push: `d0a9334`.
- **Supabase**: `https://yrrgyunksjnzinhcedqv.supabase.co`, anon key en `js/config/supabase.js`, `SUPABASE_SITE_URL = https://pequegg.github.io/MAN/`. PAT en `C:\Users\1903c\AppData\Local\Temp\opencode\sbpat.txt`.
- **Login Google FUNCIONANDO (verificado)**: `google:true` en `/auth/v1/settings`; authorize 302 al consent con Client ID `1069421375978-s7hgl0mgn0mdmdqipn618ia028ae25k7.apps.googleusercontent.com`; callback ya redirige a `https://pequegg.github.io/MAN/...` (antes apuntaba a `http://localhost:3000` → usuario corrigió la Site URL en el dashboard de Supabase; quedó como `https://pequegg.github.io/MAN/**`, glob — funciona, se puede limpiar a `.../MAN/` si se quiere). El usuario confirmó login OK. Nota: el fallback de error de GoTrue usa la Site URL; el return real usa el `redirect_to` del state.
- Confirmado por API: `/auth/v1/settings` devuelve `"google": true` (prov. activado por usuario siguiendo la guía). Causa #1 de la auditoría RESUELTA en dashboard.
- **Management API**: `/v1/projects/.../database/query` funciona (SELECT), pero `config/auth` da 403 por scope — no se pueden consultar URL config / redirects por API.
- **Patrón doble-encoding de sesión**: `auth.js` guarda la sesión ya pre-stringificada con `ls(SK, JSON.stringify(obj))` y `ls` (util.js) vuelve a stringificar → almacenado doble-encoded. `session()` hace `JSON.parse(JSON.parse(raw))`. Los tests que re-mockean `global.ls` deben ESCRIBIR la sesión con `global.ls('sb-session', JSON.stringify(obj))` para replicar el patrón; escribir el objeto directo genera un único encode y hace que `JSON.parse` del auth reviente (null). Ya está corregido en `online.cjs` (4b/4c verdes).
- **Presupuesto**: `budget.cjs` mide el HTML/CSS/scripts FUENTE (no dist); personalola suma y el umbral es 265 KB → **271,360 bytes**. Total fuente actual 271,069 bytes → margen 291 bytes (SVG de mascota colapsado mecánicamente en index.html: solo whitespace entre tags; sangría de scripts eliminada).
- **Problema del SVG**: el harness de `smoke.cjs` colapsa whitespace de tags (booleano `wrap` true de prettier) pero replica el render real conservando texto intacto; el SVG está en una línea ensanchada por el formateador con `<circle>...</circle>` colapsado a `<circle/>`.
- **Harness de render de logros**: `JSDOM` + `node-canvas` con el SU-8 grabber (línea `SU-8 <script src` ≈ 4110 en el smoke original) inyectado tras `app.innerHTML` inicial; logra arrancar y llegar a `menu`.
- **PowerShell**: execution policy bloquea `npx.ps1`; usar `npx.cmd`. One-liners largos con `node -e` fallan por quoting de PowerShell → usar archivos script en `$env:TEMP\opencode\`.

## Work State
### Completed
- **Fix visual mejoras en partida** (commit `d0a9334`): `#badgesRow` (mejoras activadas) anclada al borde inferior tapaba el abanico (`cy=h-14`); movida arriba bajo el HUD (`top:calc(max(8px,env(safe-area-inset-top))+54px)`). Regenerados dist+sw (VERSION `opartfan-v2-b8586dc5`); suites verdes.
- **Login Google desbloqueado (dashboard)**: la pieza final era la **Site URL en Supabase = `http://localhost:3000`**, que hacía que el callback redirigiera ahí → "No se puede acceder al sitio web" en el móvil. El usuario fijó la URL en el dashboard. Login confirmado funcionando.
- **Fix armario vacío** (commit `00c2eb4`): la pantalla `armario` faltaba en `screens` de `nav.js:6` (solo 17 de 18 pantallas). `show("armario")` nunca asignaba `.on` (quedaba oculta aunque los ítems se renderizaban) y tampoco la apagaría al salir. Añadida al orden de ruteo. Cobertura smoke nueva (armario visible/mascotas/abanicos/vuelta a menu). Regenerados dist+sw (VERSION `opartfan-v2-07979a25`). 5 suites verdes.
- **Fix visual nivel 9** (commit `3380c95`):... (ver histórico). `gen-assets.cjs` caso `wall` rediseñado (2 pasadas de piedra, bloques, almenas, 3 torres vigía con luz cálida `#ffce7a`, montañas en silueta, resplandor frío); filtro CLI `node tools/gen-assets.cjs wall`; fallback `engine.js` armonizado. Regenerados `dist/` y `sw.js`.
- **Fix velocidad abanico nivel 9** (commit `7196f14`): causa `bhv:"tremor"` (cada frame suma salto aleatorio en `game.js:57`) → `bhv:"swing"` en `js/levels/levels.js:15`. Regenerados `dist/` y `sw.js`.
- **Parche login #2 (refresh) en `js/core/auth.js`**: `refresh()` con grant `refresh_token`; `boot()` revienta sesión vencida con refresh y refresca en segundo plano si expira en <10 min; exporta `refresh:refresh`; vuelta de Google con `?error` muestra toast `"No se pudo iniciar sesión..."`; catch de `oauthReturn` muestra toast de error en vez de vacío.
- **Parche login #3 (Logros) en `js/ui/ach.js`**: `renderAch` defensivo con `typeof ACH/achievements!==undefined` para no romper si falta una dependencia.
- **Sesión** Cobertura refresh en `tools/tests/online.cjs` (mock fetch `/token?grant_type=refresh_token`, asserts de sesión vencida, refresh revive, boot revive) — **verde tras escribir la sesión con double-encoding** (patrón real de auth).
- **Presupuesto**: index.html 29.928→29.406 bytes (SVG colapsado + sangría scripts), CSS −1 byte. Total fuente 271,069 bytes, margen 291.
- **Suites verdes (todas)**: smoke 22 OK + winErrors 0, bg OK 18/18, mobile OK, online 54 OK, budget OK.
- **Causa #4 (sw.js)**: ya estaba en `opartfan-v2` con CORE completo (45 módulos, incluye supabase/auth/db/armario/duel/notix/admin), `skipWaiting()` + `clients.claim()` + navegación network-first — ya resuelta en código.
- **Commit + push**: `05110ad` "fix login google: refresh..." con `dist/` y `sw.js` regenerados (VERSION `opartfan-v2-072217a2`). Desplegado en vivo.

### Active
- **Confirmar con el usuario**: que el Armario ya muestre contenido tras el fix `00c2eb4` (dijo "te digo lo del armario" — recordárselo) y que las mejoras ya se vean arriba tras `d0a9334` (2 refrescos/pestaña privada por el SW).

### Blocked
- Si el usuario demuestra de nuevo el bloqueo de Google Cloud: asegurar que eligió consent screen **Público/Externo** (Interno solo sirve para cuentas del mismo Workspace de Google).
- No hay visor de imágenes; la validación fue por análisis de píxeles con scripts en `$env:TEMP\opencode\`.

## Next Move
1. **Confirmar Armario** con el usuario en vivo (`d0a9334` desplegado; doble refresh).
2. **Opcional limpieza**: Site URL en Supabase quedó como `https://pequegg.github.io/MAN/**` (glob echado por GoTrue en el fallback); cambiarlo a `https://pequegg.github.io/MAN/` en Auth → URL Configuration y mantener `https://pequegg.github.io/MAN/**` solo en Redirect URLs.
3. **Opcional**: publicar la app en el consent screen de Google para quitar la advertencia "app no verificada".

## Relevant Files
- `js/core/auth.js`: `refresh()` + `boot()` con refresh de sesión vencida (≈líneas 165-190), export `refresh:refresh`, toast de error en `oauthReturn`.
- `js/ui/ach.js`: `renderAch` defensivo.
- `index.html`: SVG colapsado, sangría de scripts quitada (29,406 bytes fuente).
- `tools/tests/online.cjs`: cobertura refresh 4b/4c (mock fetch `/token?grant_type=refresh_token`, escritura de sesión con `JSON.stringify` para replicar el doble-encode).
- `tools/gen-assets.cjs`: filtro CLI `wall`, bloque `bd==='wall'` rediseñado.
- `js/core/engine.js`: fallback `bd==="wall"` armonizado.
- `js/levels/levels.js`: nivel 9 con `bhv:"swing"`.
- `tools/build.cjs` / `tools/gen-sw.cjs` / `tools/tests/{smoke,bg,mobile,online,budget}.cjs`: build y suites verdes.
- `js/config/supabase.js`: `SUPABASE_URL` y anon key.
- `dist/` y `sw.js`: regenerados en `05110ad` (VERSION `opartfan-v2-072217a2`).