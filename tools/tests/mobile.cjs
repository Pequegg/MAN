// test-mobile: simula movil (viewport 375x667, touch, dpr 2) y verifica
// arranque, partida con puntero y tolerancia de la arena sin crasheos.
const fs = require('fs');
const { JSDOM } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/jsdom');
const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';

let html = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = fs.readFileSync(ROOT + 'css/style.css', 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (a, s) => '<script>' + fs.readFileSync(ROOT + s, 'utf8') + '</script>');

const mkCtx = () => {
  const grad = { addColorStop: () => {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set: () => true,
  });
};

let fail = 0;
let errs = [];
const ok = (n, g) => { console.log((g ? 'OK   ' : 'FAIL ') + n); if (!g) fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://op-art-fan.local/',
  beforeParse(wd) {
    Object.defineProperty(wd, 'innerWidth', { value: 375, configurable: true });
    Object.defineProperty(wd, 'innerHeight', { value: 667, configurable: true });
    Object.defineProperty(wd, 'devicePixelRatio', { value: 2, configurable: true });
    wd.HTMLCanvasElement.prototype.getContext = function () { return mkCtx(); };
    wd.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
    wd.preventDefault = () => {};
    wd.addEventListener('error', e => errs.push(String(e.message)));
    wd.addEventListener('unhandledrejection', e => errs.push('unhandled:' + e.reason));
  },
});
const d = dom.window;
const q = s => d.document.querySelector(s);
const tap = el => {
  if (!el) return;
  el.dispatchEvent(new d.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 }));
  el.dispatchEvent(new d.MouseEvent('click', { bubbles: true, cancelable: true }));
};

(async () => {
  await wait(120);
  ok('arranca en movil sin errores JS', errs.length === 0);
  ok('sin scroll horizontal (meta viewport)', /width=device-width/.test(html));

  // registro rapido
  if (q('#screen-tutorial')) tap(q('#tutSkip'));
  await wait(60);
  if (q('#screen-register')) { q('#nameInput').value = 'Móvil'; tap(q('#registerBtn')); }
  await wait(120);
  ok('menu movil', !!q('#screen-menu.on'));

  // partida con puntero (toca el abanico)
  tap(q('#btnPlay'));
  await wait(80);
  tap(q('#levelList .cell-card'));
  await wait(120);
  ok('partida nivel 1 con puntero', !!q('#screen-game.on') && d.GS && d.GS.mode === 'fan');
  if (d.GS && d.GS.mode === 'fan') {
    d.GS.time = 0.001;
    await wait(150);
  }
  ok('fin de partida movil', !!q('#screen-result.on'));
  // partida de arena tolerante (varios fotogramas del canvas)
  tap(q('#resMenu'));
  await wait(60);
  tap(q('#btnArena'));
  await wait(60);
  tap(q('#arenaPlay'));
  await wait(150);
  ok('arena movil (render minigame sin crash)', !!q('#screen-game.on') && (!d.GS || d.GS.mode !== 'fan'));
  for (let i = 0; i < 20; i++) { await wait(30); }
  tap(q('#hud'));
  ok('sin errores en 20+ frames de arena', errs.length === 0);
  if (errs.length) console.log('  erres:', errs.slice(0, 5).join(' | '));
  console.log(fail ? 'FALLOS: ' + fail : 'MOBILE OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });