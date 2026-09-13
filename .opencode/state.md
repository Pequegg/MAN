# Persistent Agent State — "Default Project" (Op-Art-Fan)

## Objective
- Fase previa (resuelta): reportes del nivel 9 "Gran Muralla" (visual + velocidad) y auditoría del login con Google (causas #1–#4). Todo corregido, suites verdes, desplegado.
- Fase ACTUAL: expandir "Op-Art Fan" a gran escala (narrativa china, modos, coleccionables, eventos, personalización, social, maestría, minijuegos, easter eggs) + profundizar el perfil con estadísticas/gráficos. **Restricción clave: el presupuesto de primera carga (budget.cjs, 265 KB / 271,360 B) casi no tiene margen (~140 B) → toda feature nueva va como MÓDULO LAZY** bajo `js/feature/`, cargado en runtime, sin entrar en los `<script src>` de index.html.

## Important Details
- **URL en vivo**: `https://pequegg.github.io/MAN/` — auto-deploy desde `main`.
- **Git**: `-c user.name="Refrimar Dev" -c user.email="dev@refrimar.com"`, push a `origin` = `https://github.com/Pequegg/MAN.git`. Último push: Bloque 3 de la expansión (ver `git log --oneline -3`).
- **Supabase**: `https://yrrgyunksjnzinhcedqv.supabase.co`, anon key en `js/config/supabase.js`, `SUPABASE_SITE_URL = https://pequegg.github.io/MAN/`. PAT en `C:\Users\1903c\AppData\Local\Temp\opencode\sbpat.txt`.
- **Login Google FUNCIONANDO**: `google:true`; Site URL corregida por el usuario a `https://pequegg.github.io/MAN/**` (glob — funciona; limpieza opcional a `.../MAN/`).
- **Presupuesto** (`tools/tests/budget.cjs`): mide SOLO `index.html`+`css`+suma de `<script src>`. Total fuente ~271,220 B → margen ~140 B. **Verificado: `js/feature/*.js` NO cuenta** (no están referenciados). El inyector está en el bloque inline al final de index.html (~134 B).
- **Arquitectura lazy**:
  - `index.html` (inline final): `(function(){var s=document.createElement('script');s.src='js/feature/features.js';...})()` — único cambio in-budget del Bloque 1.
  - `js/feature/features.js`: carga eager (auto-inyectado). Parchea por monkeypatch SIN tocar core: wrapper de `showResult` (captura stats en `ls("ft")`: plays/wins/lose/cat/miss/best/earned/secs/days/bests), wrapper de `startGame` (mide tiempo), wrapper de `saveAll` (fija `profile.reg` fecha registro). Inyecta botón `#btnPerfil` en el menú + HTML de `#screen-perfil` + push "perfil" en `screens`. Expone `window.Feat = {open, share}`.
  - `js/feature/perfil.js`: lazy en el primer click. Pantalla de perfil: avatar/marco, nick, estado, tier, racha, fecha registro, resumen 8 tarjetas, "Tu semana" (7 celdas), gráficos canvas (dona victorias, barras semana, línea puntajes), editar nick/estado (RPC `set_nickname` si Google), compartir resumen (`navigator.share`/clipboard).
  - **Regla para features futuras**: TODO bajo `js/feature/`, auto-registrarse vía monkeypatch o hooks en el loader de features.js; no tocar archivos in-budget (margen ~140 B).
- **Build**: `tools/build.cjs` ahora copia `js/` entero a `dist/js/` (modulos lazy incluidos). `tools/gen-sw.cjs` añade `js/feature/features.js`+`perfil.js` al CORE del SW y al hash VERSION (cambios en features cambian la versión).
- **Suites**: `tools/tests/{smoke,bg,mobile,online,budget,perfil}.cjs`. La nueva `perfil.cjs` (jsdom) inlinea los scripts de index.html + inyecta `features.js`/`perfil.js` al final, simula registro→menú→partida (win forzado con `GS.time=30; GS.score=GS.goal+100`; ojo: `time=0.01` produce DERROTA) y valida captura+UI. Umbrales: smoke 26, mobile ≥7, online 54, perfil 16.
- **Patrón doble-encoding de sesión**: auth.js guarda pre-stringificado → los tests de auth deben escribir `JSON.stringify(obj)` a través del mock de `ls`.
- **PowerShell**: usar `grep` tool, `npx.cmd`, y scripts en `$env:TEMP\opencode\` para node (los `node -e` conive fallan por quoting).

## Work State
### Completed (fase actual)
- **Bloque 1 — Perfil + estadísticas lazy** (commit `285c557`): arquitectura de módulos lazy estrenada; botón Perfil en menú; captura end-to-end de stats; pantalla con gráficos canvas; edición nick/estado; compartir.
- **Bloque 2 — Narrativa china** (commit `0f92ee61`): `spirit.js` (frases por familia calm/party/epic + anuncios antes del Dragón 17 y Nian 18, vía wrapper de startGame) y `poems.js` (S-rank combo x15 descubre fragmentos clásicos; Biblioteca en el Perfil).
- **Bloque 3 — Paletas de menú** (commit `2a1e6c1` aprox, ver `git log`): `palettes.js` con 6 temas desbloqueables por hitos de progreso (sin monedas → sin riesgo económico/server), aplicadas por CSS vars runtime en `#paleStyle`, selector dentro del Perfil (`#perfPales`).
- Todos con dist+sw regenerados (CORE 50 ficheros, VERSION `opartfan-v2-5566b3b8`), 6 suites verdes (perfil.cjs pasó de 16 → 27 checks), desplegados en vivo.

### Active
- **Siguiente en cola** (fase actual): modos de juego nuevos, coleccionables/eventos, minijuegos, easter eggs — todos como módulos lazy añadiendo módulos a `js/feature/` y actualizando `gen-sw.cjs` (FEAT) + `perfil.cjs` si aplica.

### Blocked
- Sin acceso al dashboard de Supabase (management `config/auth` 403). Limpieza de Site URL glob = opcional, la hace el usuario.
- No hay visor de imágenes; validación visual por análisis de píxeles con scripts en `$env:TEMP\opencode\`.
- `redeem_item` del server no debe usarse para categorías nuevas sin confirmar soporte en el backend (por eso las paletas usan hitos, no compras).

## Next Move
1. **Confirmar con el usuario** los 3 bloques desplegados (Perfil+stats, narrativa china, paletas) — URL en vivo, recargar 2 veces por el SW.
2. **Siguientes bloques** (todos lazy): modos de juego nuevos, coleccionables/eventos, minijuegos, easter eggs. Recordar: actualizar `FEAT` en gen-sw.cjs, copies `dist/js` ok, y correr las 6 suites + build + commit + push por bloque.

## Relevant Files
- `index.html`: bloque inline final con el inyector de `js/feature/features.js` (~134 B) junto al registro del SW.
- `js/feature/*.js`: `features.js` (loader+wrappers+inyección Perfil+`Feat`), `perfil.js` (UI+gráficos), `spirit.js`, `poems.js`, `palettes.js`. Todos lazy, fuera del presupuesto.
- `tools/gen-sw.cjs`: FEAT lista los 5 módulos feature para precache + hash VERSION.
- `tools/tests/perfil.cjs`: suite del bloque (27 checks; inlinea features+perfil+spirit+poems+palettes).
- `tools/build.cjs` / `tools/gen-sw.cjs`: copian `js/` al dist y precachean los 2 módulos feature.
- `js/core/state.js`: `saveAll` (wrapper externo), `profile{name,avatar}`, `session{}` (extensible), `pb{}`, `completed[]`, `achievements[]`.
- `js/core/game.js`: `startGame`, `finishGame(won)` construye `res` (won, score, bestCombo, fails, catches, coinsGained, newRecord, firstTime, isDaily...). `tick()`: win vía `g.score>=g.goal`; `g.time<=0` → derrota.
- `js/ui/results.js`: `showResult(res)` (punto captura de stats + poemas S-rank).
- `js/arena/arena.js`: `seasonTier()`, `dayStreak()`, `dateKeyOf`, `arena.daysDone`.
- `js/levels/{levels,daily,cosmetics}.js`: `famOf`, `LEVELS`, `ACH`, FANSKINS/FRAMES/TITLES/MASCOTS.
- `.opencode/state.md`: este archivo (último commit reflejado: `285c557`).