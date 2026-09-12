// test-bg: verifica que el fondo procedimental (fallback) y el fondo ilustrado
// (assets) funcionan en TODOS los niveles. Usa node-canvas real para pintar y
// leer pixeles, y un stub de Image que decodifica los PNG del proyecto.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/jsdom');
const { createCanvas, loadImage } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/canvas');

const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';
let html = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = fs.readFileSync(ROOT + 'css/style.css', 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (a, s) => '<script>' + fs.readFileSync(ROOT + s, 'utf8') + '</script>');

let fail = 0;
const ok = (n, g, extra) => { console.log((g ? 'OK   ' : 'FAIL ') + n + (extra ? '  ' + extra : '')); if (!g) fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const ctxCache = new WeakMap();
const realCtx = el => {
  let c = ctxCache.get(el);
  if (!c) {
    const cw = Math.max(2, el.width || 360), ch = Math.max(2, el.height || 640);
    const canvas = createCanvas(cw, ch);
    c = canvas.getContext('2d');
    ctxCache.set(el, c);
  }
  return c;
};

class FakeImage {
  constructor() { this._img = null; }
  set src(v) {
    if (!v || !v.startsWith('assets/')) { setTimeout(() => this.onerror && this.onerror(), 0); return; }
    const p = path.join(ROOT, v);
    loadImage(p).then(img => {
      this._img = img; this._nw = img.width; this._nh = img.height;
      setTimeout(() => this.onload && this.onload(), 0);
    }).catch(() => setTimeout(() => this.onerror && this.onerror(), 0));
  }
  get src() { return this._src; }
  get complete() { return !!this._img; }
  get naturalWidth() { return this._nw || 0; }
  get naturalHeight() { return this._nh || 0; }
}

let errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://op-art-fan.local/',
  beforeParse(wd) {
    wd.Image = FakeImage;
    wd.HTMLCanvasElement.prototype.getContext = function () { return realCtx(this); };
    wd.requestAnimationFrame = () => 0; // sin frames: solo interesa prerender + pixel
    wd.cancelAnimationFrame = () => {};
    wd.addEventListener('error', e => errs.push(String(e.message)));
  },
});
const d = dom.window;
// jsdom no hace layout: dimensionamos gameWrap para setCvSize
Object.defineProperty(d.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.id === 'gameWrap' ? 375 : 0; } });
Object.defineProperty(d.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.id === 'gameWrap' ? 667 : 0; } });

(async () => {
  await wait(300);
  // desautomatizamos: no partidas en cola; solo prerender de cada nivel
  const sample = wd => {
    const cv = wd.bgOff || wd.document.getElementById('cv');
    const ctx = cv.getContext('2d');
    let total = 0, alphaOk = true;
    const pts = [];
    for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 3; gy++) {
      const px = ctx.getImageData(Math.floor(cv.width * (gx + 0.5) / 5), Math.floor(cv.height * (gy + 0.5) / 3), 1, 1).data;
      total += px[0] + px[1] + px[2];
      if (px[3] < 250) alphaOk = false;
      pts.push([px[0], px[1], px[2]]);
    }
    return { total, pts, alphaOk, ok: alphaOk && total > 60 };
  };
  const run = async id => {
    d.AssetBank._img = {};
    d.startGame(id);           // prerender con cache vacia -> fallback procedural
    await wait(60);
    const fb = sample(d);
    d.AssetBank.demand([id]);  // carga el png real
    await wait(180);
    d.GS.lv = d.levelDef(id);
    d.prerender();             // rerender ya con el asset listo
    const as = sample(d);
    return { fb, as };
  };

  const diffs = [];
  for (let id = 1; id <= 18; id++) {
    const r = await run(id);
    if (!r.fb.ok) { ok('L' + id + ' pintado (fallback)', false); continue; }
    ok('L' + id + ' pintado (fallback)', true);
    if (r.as) {
      let dt = 0;
      for (let i = 0; i < r.as.pts.length; i++) {
        const a = r.as.pts[i], b = r.fb.pts[i];
        dt += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      }
      const differs = dt > 90 && r.as.ok;
      if (differs) diffs.push(id);
      ok('L' + id + ' asset != fallback', differs, 'delta ' + dt);
    } else {
      ok('L' + id + ' asset != fallback (skip)', false);
    }
  }
  ok('al menos 5 niveles muestran el asset real', diffs.length >= 5, 'asset-lv: ' + diffs.join(','));
  ok('sin errores JS en bucle de bgs', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(fail ? 'FALLOS: ' + fail : 'BG OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });