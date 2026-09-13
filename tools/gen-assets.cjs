// gen-assets.cjs - genera fondos PNG (node-canvas), 8 SFX y 6 pistas de musica (WAV)
// Salida: assets/images/*.png, assets/audio/sfx/*.wav, assets/audio/music/*.wav
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('C:/Users/1903c/AppData/Local/Temp/opencode/node_modules/canvas');

const OUT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/assets';
const W = 1024, H = 1536;
const TAU = Math.PI * 2;

// ---------- datos de niveles (reutiliza js/levels/levels.js) ----------
let LEVELS = [];
(function () {
  const src = fs.readFileSync('C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/js/levels/levels.js', 'utf8');
  const fn = new Function(src + '\n; return LEVELS;');
  LEVELS = fn();
})();
const firstOf = {};
LEVELS.forEach(l => { if (!firstOf[l.bd]) firstOf[l.bd] = l; });

function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- fondos ----------
function grad(c, hh) { const g = c.createLinearGradient(0, 0, 0, hh); return g; }

function drawBg(lv) {
  const c = createCanvas(W, H);
  const o = c.getContext('2d');
  const r = rng(lv.id * 7919);
  const cols = lv.c;
  const bg0 = lv.bg, bg1 = lv.bg;
  const sky = grad(o, H);
  sky.addColorStop(0, bg0);
  sky.addColorStop(0.55, mix(bg0, '#0a0a12', 0.55));
  sky.addColorStop(1, '#050307');
  o.fillStyle = sky; o.fillRect(0, 0, W, H);
  glow(o, W * 0.72, H * 0.14, Math.max(W, H) * 0.5, cols[cols.length - 1], 0.35);

  const bd = lv.bd;
  // capas por motivo
  if (bd === 'calli') {
    inkStroke(o, -40, H * 0.10, W + 40, H * 0.06, cols[1], 0.10, W * 0.11);
    inkStroke(o, W * 0.08, H * 0.38, W * 0.92, H * 0.30, cols[1], 0.09, W * 0.055);
    inkStroke(o, W * 0.30, H * 0.52, W * 0.85, H * 0.40, cols[1], 0.06, W * 0.028);
    o.globalAlpha = 0.75; o.fillStyle = cols[cols.length - 2];
    o.fillRect(W * 0.80, H * 0.20, W * 0.085, W * 0.085);
    o.font = 'bold ' + Math.floor(W * 0.045) + 'px "Ma Shan Zheng", serif';
    o.fillStyle = 'rgba(250,240,225,0.85)';
    o.fillText('青', W * 0.06, H * 0.30);
    o.globalAlpha = 1;
  } else if (bd === 'waves') {
    for (let i = 0; i < 3; i++) {
      const y = H * (0.10 + i * 0.13);
      o.strokeStyle = hexa(cols[1 + i], 0.28 - i * 0.05);
      o.lineWidth = W * (0.045 - i * 0.012);
      o.beginPath();
      for (let x = 0; x <= W; x += 8) { const yy = y + Math.sin(x * 0.012 + i * 1.7 + r() * 0.4) * 26 + Math.sin(x * 0.05) * 7; x === 0 ? o.moveTo(x, yy) : o.lineTo(x, yy); }
      o.stroke();
    }
    glow(o, W * 0.24, H * 0.10, W * 0.5, cols[1], 0.4);
  } else if (bd === 'trees') {
    inkStroke(o, -60, H * 0.06, W * 0.72, H * 0.20, cols[3], 0.5, W * 0.07);
    inkStroke(o, W * 0.55, H * 0.12, W * 0.30, H * 0.02, cols[3], 0.4, W * 0.02);
    inkStroke(o, W * 0.62, H * 0.16, W * 0.40, H * 0.05, cols[3], 0.35, W * 0.013);
    for (let i = 0; i < 46; i++) {
      const x = (r() * W * 1.2) - W * 0.1, y = H * 0.02 + r() * H * 0.24;
      o.fillStyle = hexa(r() < 0.5 ? cols[2] : cols[1], 0.4 + r() * 0.4);
      o.beginPath(); o.arc(x, y, W * (0.004 + r() * 0.007), 0, TAU); o.fill();
    }
  } else if (bd === 'pond') {
    for (let i = 0; i < 8; i++) {
      const x = (i * 173 + 40) % W, y = H * 0.08 + (i * 47) % (H * 0.28);
      o.strokeStyle = hexa(cols[2], 0.18); o.lineWidth = 2.5;
      o.beginPath(); o.ellipse(x, y, 26 + i * 3, 12, 0, 0, TAU); o.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = W * 0.25 + i * W * 0.22, y = H * 0.06 + r() * H * 0.05;
      koi(o, x, y, cols[1], !!i);
    }
    glow(o, W * 0.5, H * 0.25, W * 0.7, cols[3], 0.22);
  } else if (bd === 'lanterns') {
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * W * 0.14 + (r() - 0.5) * 30, topY = -6 + (i % 3) * 14;
      o.strokeStyle = hexa(cols[2], 0.7); o.lineWidth = 1.6;
      o.beginPath(); o.moveTo(x, topY); o.lineTo(x, topY + 26); o.stroke();
      glow(o, x, topY + 52, 120, i % 2 ? '#ff9040' : '#ff4a3a', 0.5);
      o.fillStyle = i % 2 ? '#e6390f' : '#f2a611';
      o.beginPath(); o.ellipse(x, topY + 52, 17, 22, 0, 0, TAU); o.fill();
      o.strokeStyle = 'rgba(255,220,160,0.6)'; o.lineWidth = 2.5;
      o.beginPath(); o.moveTo(x - 17, topY + 52); o.lineTo(x + 17, topY + 52); o.stroke();
      o.strokeStyle = 'rgba(255,220,160,0.4)';
      o.beginPath(); o.moveTo(x, topY + 74); o.lineTo(x, topY + 88); o.stroke();
      o.fillStyle = 'rgba(255,220,160,0.35)';
      o.beginPath(); o.arc(x, topY + 88, 3.5, 0, TAU); o.fill();
    }
  } else if (bd === 'clouds') {
    for (let i = 0; i < 9; i++) {
      const x = (i * 223 + r() * 60) % W, y = H * 0.03 + (i * 31) % (H * 0.3);
      o.fillStyle = hexa(cols[1], 0.10 + r() * 0.06);
      o.beginPath(); o.arc(x - 26, y, 14, 0, TAU); o.arc(x, y, 22, 0, TAU); o.arc(x + 30, y, 12, 0, TAU); o.fill();
    }
    glow(o, W * 0.5, H * 0.4, W * 1.0, cols[2], 0.14);
  } else if (bd === 'dragon') {
    inkStroke(o, -30, H * 0.16, W * 1.05, H * 0.10, '#ffe27a', 0.42, W * 0.045);
    inkStroke(o, W * 0.35, H * 0.05, W * 0.62, H * 0.14, '#ffe27a', 0.30, W * 0.02);
    inkStroke(o, W * 0.62, H * 0.02, W * 0.95, H * 0.13, '#ffe27a', 0.22, W * 0.014);
    for (let i = 0; i < 5; i++) { o.fillStyle = hexa(cols[3], 0.25); o.beginPath(); o.arc(W * (0.15 + i * 0.18), H * 0.13 + (i % 2) * 26, 4, 0, TAU); o.fill(); }
    mistBands(o, H * 0.5);
  } else if (bd === 'phoenix') {
    for (let i = 0; i < 7; i++) {
      const y0 = H * 0.28 - i * H * 0.045, y1 = H * (0.05 + i * 0.018) + r() * 14;
      o.strokeStyle = hexa(i % 2 ? '#ff7b2e' : '#e0481b', 0.2);
      o.lineWidth = W * (0.02 - i * 0.0018);
      o.beginPath(); o.moveTo(W * 0.10, y0); o.quadraticCurveTo(W * 0.45, y1, W * 0.94, H * 0.20 + i * 4); o.stroke();
      glow(o, W * 0.5, H * 0.12, W * 0.6, '#ffd98c', 0.30);
    }
  } else if (bd === 'wall') {
    // cielo nocturno con resplandor frio + montanas en silueta
    glow(o, W * 0.28, H * 0.10, W * 0.7, '#9db2cc', 0.25);
    glow(o, W * 0.82, H * 0.14, W * 0.45, cols[1], 0.18);
    ['#1d232c', '#161b22', '#10141a'].forEach((cc, zi) => {
      o.fillStyle = hexa(cc, 0.95);
      o.beginPath(); o.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 14) {
        o.lineTo(x, H * (0.44 + zi * 0.08) - Math.abs(Math.sin(x * 0.006 + zi * 2.3)) * H * (0.20 - zi * 0.05));
      }
      o.lineTo(W, H); o.closePath(); o.fill();
    });
    // trazado serpenteante de la muralla (dos pasadas: base oscura + cara clara iluminada)
    const wallY = t => H * (0.36 + 0.10 * t + 0.045 * Math.sin(t * 4.5 + 1.1) + 0.02 * Math.sin(t * 9));
    const band = H * 0.10;
    const tOf = x => (x + 20) / (W + 40);
    const trace = (off) => {
      o.beginPath();
      for (let x = -20; x <= W + 24; x += 12) {
        const y = wallY(tOf(x)) + off;
        x === -20 ? o.moveTo(x, y) : o.lineTo(x, y);
      }
      o.stroke();
    };
    o.lineCap = 'round'; o.lineJoin = 'round';
    o.strokeStyle = hexa(cols[4], 0.95); o.lineWidth = band; trace(0);
    o.strokeStyle = hexa(cols[0], 0.95); o.lineWidth = band * 0.62; trace(-band * 0.2);
    // textura de bloques de piedra
    o.strokeStyle = 'rgba(20,24,30,0.35)'; o.lineWidth = 2;
    for (let x = 4; x <= W; x += 26) {
      const y = wallY(tOf(x));
      o.beginPath(); o.moveTo(x, y - band * 0.42); o.lineTo(x, y - band * 0.2); o.stroke();
      o.beginPath(); o.moveTo(x - 13, y - band * 0.31); o.lineTo(x + 13, y - band * 0.31); o.stroke();
    }
    // almenas
    o.fillStyle = hexa(cols[0], 0.95);
    for (let x = 2; x <= W + 14; x += 30) {
      o.fillRect(x - 8, wallY(tOf(x)) - band * 0.42 - 11, 16, 11);
    }
    // torres vigia con saeteras y luz calida
    for (const tt of [0.18, 0.52, 0.85]) {
      const x = tt * W, y = wallY(tt), tw = W * 0.085, th = H * 0.13;
      o.fillStyle = hexa(cols[0], 0.95);
      o.fillRect(x - tw / 2, y - th - band * 0.3, tw, th + band * 0.3);
      o.strokeStyle = 'rgba(20,24,30,0.5)'; o.lineWidth = 2.5;
      o.strokeRect(x - tw / 2, y - th - band * 0.3, tw, th + band * 0.3);
      o.fillStyle = hexa(cols[3], 0.95);
      o.fillRect(x - tw * 0.34, y - th * 0.72, tw * 0.10, th * 0.3);
      o.fillRect(x + tw * 0.24, y - th * 0.72, tw * 0.10, th * 0.3);
      o.fillStyle = hexa(cols[1], 0.95);
      for (let a = 0; a < 3; a++) o.fillRect(x - tw / 2 + a * tw / 3 + 3, y - th - band * 0.3 - 12, tw / 3 - 6, 12);
      glow(o, x, y - th + band * 0.3, tw * 0.9, '#ffce7a', 0.55);
    }
    mistBands(o, H * 0.72);
    glow(o, W * 0.5, H * 0.24, W * 0.9, cols[3], 0.2);
  } else if (bd === 'terracotta') {
    for (let row = 0; row < 3; row++) {
      const by = H * 0.03 + row * H * 0.115;
      for (let i = 0; i < Math.ceil(W / 52); i++) {
        if ((i + row) % 2) continue;
        const x = 16 + i * 52 + r() * 6;
        o.fillStyle = hexa(row % 2 ? cols[2] : cols[1], 0.30);
        o.fillRect(x - 9, by + 22, 18, 20);
        o.beginPath(); o.arc(x, by + 12, 14, 0, TAU); o.fill();
        o.strokeStyle = 'rgba(20,10,4,0.35)'; o.lineWidth = 2;
        o.beginPath(); o.moveTo(x - 7, by + 8); o.lineTo(x - 2, by + 14); o.stroke();
        o.beginPath(); o.moveTo(x + 7, by + 8); o.lineTo(x + 2, by + 14); o.stroke();
        o.beginPath(); o.moveTo(x - 4, by + 18); o.lineTo(x + 4, by + 18); o.stroke();
      }
    }
    mistBands(o, H * 0.5);
  } else if (bd === 'silk') {
    for (let i = 0; i < 4; i++) {
      const ys = H * (0.06 + i * 0.09);
      o.strokeStyle = hexa(cols[i + 1], 0.2);
      o.lineWidth = W * (0.045 - i * 0.006);
      o.beginPath(); o.moveTo(-30, ys);
      o.bezierCurveTo(W * 0.2, ys + 40, W * 0.4, ys - 50, W * 0.6, ys + 14);
      o.bezierCurveTo(W * 0.8, ys + 60, W * 0.9, ys - 30, W * 1.06, ys + 20);
      o.stroke();
    }
    glow(o, W * 0.3, H * 0.30, W * 0.6, cols[2], 0.2);
  } else if (bd === 'temple') {
    o.fillStyle = hexa(cols[2], 0.5); o.fillRect(W * 0.14, H * 0.20, W * 0.32, H * 0.05);
    o.fillStyle = hexa(cols[2], 0.4); o.fillRect(W * 0.22, H * 0.25, W * 0.16, H * 0.08);
    o.fillStyle = hexa(cols[1], 0.5);
    o.beginPath(); o.moveTo(W * 0.08, H * 0.20); o.lineTo(W * 0.30, H * 0.08); o.lineTo(W * 0.52, H * 0.20); o.closePath(); o.fill();
    o.beginPath(); o.moveTo(W * 0.13, H * 0.255); o.lineTo(W * 0.30, H * 0.15); o.lineTo(W * 0.47, H * 0.255); o.closePath(); o.fill();
    o.strokeStyle = hexa(cols[4], 0.4); o.lineWidth = 2;
    o.beginPath(); o.moveTo(W * 0.08, H * 0.20); o.lineTo(W * 0.02, H * 0.22);
    o.moveTo(W * 0.52, H * 0.20); o.lineTo(W * 0.58, H * 0.22); o.stroke();
    for (let i = 0; i < 2; i++) {
      const x = W * (0.16 + i * 0.3);
      o.fillStyle = i ? '#e6390f' : '#f2a611';
      o.beginPath(); o.ellipse(x, H * 0.32, 10, 13, 0, 0, TAU); o.fill();
    }
    glow(o, W * 0.5, H * 0.3, W * 0.9, cols[2], 0.22);
  } else if (bd === 'mountain') {
    for (const [off, cc] of [[0, cols[1]], [0.055, cols[2]], [0.11, cols[3]]]) {
      o.fillStyle = hexa(cc, 0.28);
      o.beginPath(); o.moveTo(0, H * 0.75);
      for (let x = 0; x <= W; x += W / 7) {
        o.lineTo(x, H * (0.30 + off * 2) + Math.sin(x * 0.015 + off * 9) * H * (0.10 - off * 0.4));
      }
      o.lineTo(W, H * 0.75); o.closePath(); o.fill();
    }
    mistBands(o, H * 0.68);
    glow(o, W * 0.3, H * 0.2, W * 0.7, '#d8fff0', 0.2);
  } else if (bd === 'opera') {
    for (const [x, cc] of [[W * 0.24, '#f0ede4'], [W * 0.76, '#d8a94a']]) {
      o.strokeStyle = hexa(cc, 0.32); o.lineWidth = 2.5;
      o.beginPath(); o.ellipse(x, H * 0.16, W * 0.06, H * 0.05, 0, 0, TAU); o.stroke();
      o.strokeStyle = hexa('#b0281f', 0.6); o.lineWidth = 3;
      o.beginPath(); o.moveTo(x - 8, H * 0.16 - H * 0.04); o.quadraticCurveTo(x, H * 0.16 + H * 0.06, x + 8, H * 0.16 - H * 0.04); o.stroke();
    }
    mistBands(o, H * 0.4);
    glow(o, W * 0.8, H * 0.18, W * 0.5, '#b0281f', 0.2);
  } else {
    mistBands(o, H * 0.5);
  }
  // viñeta
  const vg = o.createRadialGradient(W * 0.5, H * 0.45, H * 0.35, W * 0.5, H * 0.55, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  o.fillStyle = vg; o.fillRect(0, 0, W, H);
  return c.toBuffer('image/png');
}

function mix(a, b, t) {
  const p = v => parseInt(v.slice(1), 16);
  const pa = p(a) || 0, pb = p(b) || 0;
  const m = (x, y) => Math.round(x + (y - x) * t);
  const c1 = (pa >> 16) & 255, c2 = (pa >> 8) & 255, c3 = pa & 255;
  const d1 = (pb >> 16) & 255, d2 = (pb >> 8) & 255, d3 = pb & 255;
  return '#' + [m(c1, d1), m(c2, d2), m(c3, d3)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function hexa(hex, a) { return 'rgba(' + (parseInt(hex.slice(1), 16) >> 16 & 255) + ',' + (parseInt(hex.slice(1), 16) >> 8 & 255) + ',' + (parseInt(hex.slice(1), 16) & 255) + ',' + a + ')'; }
function glow(o, x, y, r, col, a) {
  const g = o.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, hexa(col, a)); g.addColorStop(1, hexa(col, 0));
  o.fillStyle = g; o.beginPath(); o.arc(x, y, r, 0, TAU); o.fill();
}
function inkStroke(o, x0, y0, x1, y1, col, a, wd) {
  o.strokeStyle = hexa(col, a); o.lineWidth = wd; o.lineCap = 'round';
  o.beginPath(); o.moveTo(x0, y0);
  o.bezierCurveTo(x0 + (x1 - x0) * 0.25, y0 - (y1 - y0) * 0.3, x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.3, x1, y1);
  o.stroke();
}
function koi(o, x, y, col, flip) {
  o.save(); o.translate(x, y); if (flip) o.scale(-1, 1);
  o.fillStyle = hexa(col, 0.75);
  o.beginPath(); o.ellipse(0, 0, 26, 10, 0, 0, TAU); o.fill();
  o.beginPath(); o.moveTo(24, 0); o.lineTo(40, -9); o.lineTo(40, 9); o.closePath(); o.fill();
  o.strokeStyle = 'rgba(220,120,40,0.8)'; o.lineWidth = 1.6;
  o.beginPath(); o.moveTo(-12, -3); o.quadraticCurveTo(0, -8, 14, -2); o.stroke();
  o.restore();
}
function mistBands(o, y) {
  for (let i = 0; i < 4; i++) {
    const yy = y + i * H * 0.07;
    o.fillStyle = 'rgba(238,243,255,' + (0.05 + i * 0.012) + ')';
    o.beginPath(); o.ellipse(W * 0.5 + Math.sin(i * 2.4) * W * 0.2, yy, W * 0.7, H * 0.03 + i * 2, 0, 0, TAU); o.fill();
  }
}

// ---------- sintesis WAV ----------
const SR = 44100;
function renderWav(events, dur, rate) { rate = rate || SR;
  const n = Math.floor(dur * rate);
  const buf = new Float32Array(n);
  for (const e of events) {
    const t0 = Math.floor(e.t * rate);
    const durS = Math.max(1, Math.floor(e.d * rate));
    const end = Math.min(n, t0 + durS);
    for (let i = t0; i < end; i++) {
      const p = (i - t0) / durS;
      const env = Math.min(1, p * 60) * Math.pow(1 - p, e.dec != null ? e.dec : 4);
      const freq = e.f0 + (e.f1 - e.f0) * p;
      let s = 0;
      if (e.type === 'sine') s = Math.sin(TAU * freq * (i / rate));
      else if (e.type === 'square') s = Math.sign(Math.sin(TAU * freq * (i / rate)));
      else if (e.type === 'saw') s = 2 * ((freq * (i / rate)) % 1) - 1;
      else if (e.type === 'tri') s = 2 / Math.PI * Math.asin(Math.sin(TAU * freq * (i / rate)));
      else if (e.type === 'noise') s = Math.random() * 2 - 1;
      buf[i] += s * env * e.v * 0.35;
    }
  }
  for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * 1.4) * 0.9;
  return encode(buf);
}
function encode(buf, rate) { rate = rate || SR;
  const n = buf.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, buf[i] * 32767, true);
  return Buffer.from(ab);
}
const N = f => f, S = f => f * 2;

// SFX
function genSfx() {
  const out = { hit: [], miss: [], trap: [], gold: [], combo: [], buy: [], ach: [], boss: [] };
  out.hit = renderWav([{ t: 0, d: 0.09, f0: 320, f1: 140, type: 'square', v: .5, dec: 6 }], 0.12);
  out.miss = renderWav([{ t: 0, d: 0.18, f0: 240, f1: 85, type: 'saw', v: .4, dec: 3 }], 0.2);
  out.trap = renderWav([{ t: 0, d: 0.3, f0: 110, f1: 55, type: 'sine', v: .6, dec: 2.5 },
    { t: 0.01, d: 0.12, f0: 0, f1: 0, type: 'noise', v: .25, dec: 5 }], 0.32);
  out.gold = renderWav([{ t: 0, d: .09, f0: 659, f1: 659, type: 'sine', v: .5, dec: 5 },
    { t: .09, d: .09, f0: 880, f1: 880, type: 'sine', v: .5, dec: 5 },
    { t: .18, d: .12, f0: 1318, f1: 1318, type: 'sine', v: .45, dec: 4 }], 0.34);
  out.combo = renderWav([{ t: 0, d: .07, f0: 392, f1: 392, type: 'square', v: .35, dec: 6 },
    { t: .07, d: .07, f0: 523, f1: 523, type: 'square', v: .35, dec: 6 },
    { t: .14, d: .09, f0: 659, f1: 784, type: 'square', v: .4, dec: 5 }], 0.26);
  out.buy = renderWav([{ t: 0, d: .1, f0: 1568, f1: 1568, type: 'tri', v: .4, dec: 5 },
    { t: .07, d: .14, f0: 2093, f1: 2093, type: 'tri', v: .35, dec: 4 }], 0.24);
  out.ach = renderWav([{ t: 0, d: .12, f0: 523, f1: 523, type: 'tri', v: .45, dec: 4 },
    { t: .11, d: .12, f0: 659, f1: 659, type: 'tri', v: .45, dec: 4 },
    { t: .22, d: .12, f0: 784, f1: 784, type: 'tri', v: .45, dec: 4 },
    { t: .33, d: .3, f0: 1046, f1: 1046, type: 'tri', v: .5, dec: 2 }], 0.7);
  out.boss = renderWav([{ t: 0, d: .6, f0: 65, f1: 40, type: 'sine', v: .6, dec: 1.5 },
    { t: 0, d: .5, f0: 166, f1: 220, type: 'saw', v: .22, dec: 3 }], 0.7);
  return out;
}

// Musica: loops discretos (pad + arpegio), sin costura
function genMusic() {
  const maps = {
    calm: { bpm: 72, seed: 11, root: 261.63, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [0, 2, 7], [2, 4, 9], [0, 4, 7]], pen: 0, vol: 0.3 },
    party: { bpm: 120, seed: 23, root: 349.23, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [0, 4, 7]], pen: 1, vol: 0.26 },
    epic: { bpm: 88, seed: 37, root: 130.81, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 10], [0, 5, 7], [8, 12, 15], [0, 7, 12]], pen: 0, vol: 0.34 }
  };
  const out = {};
  for (const nm of Object.keys(maps)) {
    const cfg = maps[nm];
    const spb = 60 / cfg.bpm;
    const dur = 8 * 4 * spb;
    const ev = [];
    const r = rng(cfg.seed);
    function note(t, d, fi, v, type, f1) {
      if (fi <= 0) return;
      ev.push({ t, d, f0: fi, f1: f1 == null ? fi : f1, type, v, dec: type === 'sine' ? 2.2 : 5 });
    }
    const seat = (sem, oct) => cfg.root * Math.pow(2, sem / 12 + (oct || 0));
    for (let b = 0; b < 8; b++) {
      const ch = cfg.chords[b % cfg.chords.length];
      const bt = b * 4 * spb;
      for (const s of ch) {
        note(bt, spb * 4, seat(s, 0), cfg.vol, 'tri');
        note(bt, spb * 4, seat(s, 0) * 2, cfg.vol * 0.4, 'sine');
      }
      for (const k of [0, 2]) note(bt + k * spb, spb * 0.9, seat(ch[0], -1), cfg.vol * 1.3, 'sine');
      const seq = [ch[0], ch[1], ch[2], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12];
      for (let i = 0; i < 8; i++) {
        const tt = bt + i * spb * 0.5;
        if (tt + spb * 0.42 > dur - 0.05) continue;
        note(tt, spb * 0.42, seat(seq[i], 1), cfg.vol * 0.55, cfg.pen ? 'square' : 'tri');
      }
      if (cfg.pen) {
        for (let i = 1; i < 8; i += 2) {
          const tt = bt + i * spb * 0.5 + spb * 0.22;
          if (tt + spb * 0.3 > dur - 0.05) continue;
          const f = seat(seq[i], 2);
          note(tt, spb * 0.3, f, cfg.vol * 0.4, 'sine', f * 2.74);
        }
      }
      for (const k of [0, 2]) { note(bt + k * spb + spb * 0.5, spb * 0.4, seat(ch[1], 0), cfg.vol * 0.5, 'sine'); }
    }
    // fade de entrada (0->dur*0.18) para loop sin click
    const raw = renderWav(ev, dur, 22050);
    const sampleN = (raw.length - 44) / 2;
    const fadeIn = Math.floor(dur * 0.18 * 22050);
    const final = new Float32Array(sampleN);
    for (let i = 0; i < final.length; i++) {
      let v = raw.readInt16LE(44 + i * 2) / 32767;
      if (i < fadeIn) v *= i / fadeIn;
      final[i] = v;
    }
    out[nm] = encode(final, 22050);
  }
  return out;
}

// ---------- main ----------
const ONLY = process.argv[2] ? process.argv[2].toLowerCase() : null;
fs.mkdirSync(path.join(OUT, 'images'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'audio', 'sfx'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'audio', 'music'), { recursive: true });

for (const lv of LEVELS) {
  if (firstOf[lv.bd] !== lv) continue;
  if (ONLY && lv.bd !== ONLY) continue;
  const buf = drawBg(lv);
  fs.writeFileSync(path.join(OUT, 'images', 'bg-' + lv.bd + '.png'), buf);
  console.log('bg-' + lv.bd + '.png', Math.round(buf.length / 1024) + ' KB');
}
if (ONLY) { console.log('DONE assets (solo ' + ONLY + ')'); process.exit(0); }
const sfx = genSfx();
for (const k of Object.keys(sfx)) {
  fs.writeFileSync(path.join(OUT, 'audio', 'sfx', k + '.wav'), sfx[k]);
  console.log('sfx/' + k + '.wav', Math.round(sfx[k].length / 1024) + ' KB');
}
for (const nm of ['calm', 'party', 'epic']) {
  const buf = genMusic()[nm];
  fs.writeFileSync(path.join(OUT, 'audio', 'music', nm + '.wav'), buf);
  console.log('music/' + nm + '.wav', Math.round(buf.length / 1024) + ' KB');
}
console.log('DONE assets');