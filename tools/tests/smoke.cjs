// smoke-split: carga el proyecto estructurado (css/style.css + scripts externos
// en el orden real de index.html) y recorre tutorial -> registro -> menu ->
// niveles -> partida -> resultado -> tienda/logros/ranking/diario -> arena.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/jsdom');

const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';
let html = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = fs.readFileSync(ROOT + 'css/style.css', 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
const order = [];
html = html.replace(/<script src="([^"]+)"><\/script>/g, (all, src) => {
  order.push(src);
  return '<scr' + 'ipt>' + fs.readFileSync(ROOT + src, 'utf8') + '</scr' + 'ipt>';
});
console.log('cargados', order.length, 'scripts en orden');

const vc = new VirtualConsole();
const jsdomErrs = [];
vc.on('jsdomError', e => jsdomErrs.push(String(e.message).slice(0, 200)));

const mkCtx = () => {
  const grad = { addColorStop: () => {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(1) });
      return () => {};
    },
    set: () => true,
  });
};
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://op-art-fan.local/',
  virtualConsole: vc,
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () { return mkCtx(); };
    w.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
    w.cancelAnimationFrame = id => clearTimeout(id);
    w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    w.addEventListener('error', e => { errs.push(String(e.message)); failed = true; });
  },
});
const w = dom.window;
let failed = false, errs = [];
let step = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
async function raf(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) await wait(16); }
function cs(sel) { return w.document.querySelector(sel); }
function text(sel) { const e = cs(sel); return e ? (e.textContent || '').trim() : null; }
function ok(name, good) {
  step++;
  if (good) console.log(`OK   ${name}`);
  else { console.log(`FAIL ${name}`); failed = true; }
}
function click(sel) {
  const e = cs(sel); if (!e) return false;
  e.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
}

(async () => {
  await raf(80);
  ok('tutorial visible al arranque', !!cs('#screen-tutorial.on') || (!!cs('#screen-tutorial') && w.introDone === false));
  if (cs('#screen-tutorial')) { click('#tutSkip'); }
  await raf(40);
  ok('register visible', !!cs('#screen-register.on'));
  if (cs('#screen-register.on')) {
    const inp = cs('#nameInput'); if (inp) { inp.value = 'Prueba'; }
    click('#registerBtn');
  }
  await raf(100);
  ok('menu after register', !!cs('#screen-menu.on'));
  if (cs('#screen-menu.on')) click('#btnPlay');
  await raf(80);
  ok('18 level cards', !!cs('#screen-levels.on') && w.document.querySelectorAll('#levelList .cell-card').length === 18);
  const cards = w.document.querySelectorAll('#levelList .cell-card');
  if (cards.length) cards[0].click();
  await raf(100);
  ok('level 1 started', !!cs('#screen-game.on') && w.GS && w.GS.mode === 'fan');
  if (w.GS && w.GS.mode === 'fan') { w.GS.time = 0.01; w.GS.score = w.GS.goal; }
  await raf(200);
  ok('result visible', !!cs('#screen-result.on'));
  if (cs('#screen-result.on')) click('#resMenu');
  await raf(60);
  click('#btnShop'); await raf(70);
  ok('shop', !!cs('#screen-shop.on'));
  click('#btnAch'); await raf(70);
  ok('ach', !!cs('#screen-ach.on'));
  click('#btnRank'); await raf(70);
  ok('rank', !!cs('#screen-rank.on'));
  click('#btnDaily'); await raf(70);
  ok('daily', !!cs('#screen-daily.on') && (text('#dailyName') || '').length > 0 && /Meta/.test(text('#dailyGoal') || ''));
  click('#btnArena'); await raf(70);
  ok('arena visible', !!cs('#screen-arena.on'));
  ok('arena mode label', /Reto de hoy/.test(text('#arenaModeName') || ''));
  const jn = cs('#arenaJoinIn'); if (jn) { jn.value = 'ABCD'; }
  click('#arenaCreate'); await raf(70);
  ok('grupo creado', !!cs('#arenaGroupList') && cs('#arenaGroupList').children.length > 0);
  click('#arenaPlay'); await raf(120);
  ok('arena game started', !!cs('#screen-game.on') && w.GS && w.GS.mode.indexOf && w.GS.mode !== 'fan');
  if (w.GS && w.GS.mode && w.GS.mode !== 'fan') {
    w.GS.calli = w.GS.calli || {};
    w.GS.time = 0.001;
  }
  await raf(200);
  ok('aresult visible', !!cs('#screen-aresult.on'));
  click('#btnDuel'); await raf(120);
  ok('duel visible (offline: aviso de cuenta)', !!cs('#screen-duel.on') && !!cs('#duelOffNote'));
  ok('duelos sin sesion: sin listados', cs('#duelList') && cs('#duelList').children.length === 0);
  console.log('winErrors:', errs.length, errs.join(' | '));
  if (jsdomErrs.length) console.log('jsdomErrors:', jsdomErrs.length, jsdomErrs.slice(0, 3).join(' | '));
  process.exit(failed ? 1 : 0);
})().catch(err => { console.error('CRASH', err); process.exit(2); });