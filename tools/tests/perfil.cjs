// perfil: verifica el modulo lazy de Perfil (features.js + perfil.js): boton en
// el menu, captura de estadisticas tras una partida, tarjetas y graficos canvas.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/jsdom');

const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';
let html = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = fs.readFileSync(ROOT + 'css/style.css', 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (all, src) => {
  return '<scr' + 'ipt>' + fs.readFileSync(ROOT + src, 'utf8') + '</scr' + 'ipt>';
});
const feat = fs.readFileSync(ROOT + 'js/feature/features.js', 'utf8');
const perfil = fs.readFileSync(ROOT + 'js/feature/perfil.js', 'utf8');
html = html.replace('</body>', '<scr' + 'ipt>' + feat + '</scr' + 'ipt><scr' + 'ipt>' + perfil + '</scr' + 'ipt></body>');

const vc = new VirtualConsole();
const jsdomErrs = [];
vc.on('jsdomError', e => jsdomErrs.push(String(e.message).slice(0, 200)));

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
  if (cs('#screen-tutorial')) click('#tutSkip');
  await raf(40);
  if (cs('#screen-register.on')) {
    const inp = cs('#nameInput'); if (inp) inp.value = 'Prueba';
    click('#registerBtn');
  }
  await raf(100);
  ok('menu con boton Perfil', !!cs('#screen-menu.on') && !!cs('#btnPerfil'));
  const s0 = w.ls('ft');
  ok('sin stats antes de jugar', !s0 || !s0.plays);
  click('#btnPerfil');
  await raf(120);
  ok('perfil visible', !!cs('#screen-perfil.on'));
  ok('resumen renderizado', !!cs('#stGrid') && cs('#stGrid').children.length === 8);
  ok('cripto tarjetas semana', cs('#weekCells') && cs('#weekCells').children.length === 7);
  ok('fecha registro puesta', (text('#perfReg') || '').indexOf('Jugador desde') === 0);
  click('#perfBack');
  await raf(60);
  ok('vuelve al menu', !!cs('#screen-menu.on') && !cs('#screen-perfil.on'));
  click('#btnPlay');
  await raf(80);
  const cards = w.document.querySelectorAll('#levelList .cell-card');
  if (cards.length) cards[0].click();
  await raf(100);
  ok('partida iniciada', !!cs('#screen-game.on') && w.GS && w.GS.mode === 'fan');
  if (w.GS) { w.GS.time = 30; w.GS.score = w.GS.goal + 100; }
  await raf(60);
  ok('resultado visible', !!cs('#screen-result.on'));
  try { w.ls('_probe', { p: 1 }); } catch (e) {}
  const s1 = w.ls('ft');
  ok('stats capturadas (1 partida)', !!s1 && s1.plays === 1);
  ok('victoria registrada', s1.wins === 1);
  ok('dias contados', !!s1.days && s1.days[w.todayKey()] === 1);
  click('#resMenu');
  await raf(60);
  ok('resultado oculto', !cs('#screen-result.on'));
  click('#btnPerfil');
  await raf(120);
  ok('perfil actualizado (1 partida)', text('#stPlays') === '1');
  ok('graficos renderizados', cs('#chartDonut') && cs('#chartDonut').getAttribute('width') > '0');
  const ni = cs('#perfStatusI'); if (ni) ni.value = 'La tinta fluye';
  click('#perfSave');
  await raf(80);
  ok('estado guardado', (w.profile.status || '') === 'La tinta fluye');
  console.log('winErrors:', errs.length, errs.join(' | '));
  if (jsdomErrs.length) console.log('jsdomErrors:', jsdomErrs.length, jsdomErrs.slice(0, 3).join(' | '));
  process.exit(failed ? 1 : 0);
})().catch(err => { console.error('CRASH', err); process.exit(2); });