/* Op-Art Fan - modulo: js/loader/assets.js */
"use strict";

// Mapa declarativo de casets. Los asset generados viven en /assets.
// Si un archivo falta, cada modulo degrada al pintado procedimental (NONE),
// asi nunca hay pantalla en blanco.

var CASETS = {
  bg: {},   // bg[nivel] = "assets/images/bg-<bd>.png"
  music: { calm: ['assets/audio/music/calm', 'assets/audio/music/heron-boat',
                  'assets/audio/music/chensa-ci', 'assets/audio/music/hutan-ci'],
           party: ['assets/audio/music/party', 'assets/audio/music/ying',
                   'assets/audio/music/martyn', 'assets/audio/music/chirautou'],
           epic: ['assets/audio/music/epic', 'assets/audio/music/heavenly-rive',
                  'assets/audio/music/rao', 'assets/audio/music/guocuhou'] },
  sfx: { hit: 'assets/audio/sfx/hit', miss: 'assets/audio/sfx/miss',
         trap: 'assets/audio/sfx/trap', gold: 'assets/audio/sfx/gold',
         combo: 'assets/audio/sfx/combo', buy: 'assets/audio/sfx/buy',
         ach: 'assets/audio/sfx/ach', boss: 'assets/audio/sfx/boss' }
};

function famOf(lvl){
  if (lvl.boss) return 'epic';
  var b = String(lvl.bd || '');
  if (/calli|waves|trees|pond|clouds|silk/.test(b)) return 'calm';
  if (/lanterns|phoenix|firew|terracotta|dragon|opera/.test(b)) return 'party';
  return 'epic';
}

var AssetBank = {
  _img: {}, missing: 0, preloaded: 0, preTotal: 0,
  plan: function () {
    var map = {};
    LEVELS.forEach(function (l) { map[l.id] = 'assets/images/bg-' + l.bd + '.png'; });
    CASETS.bg = map;
  },
  // cargador incremental: lista de nombres -> callback por lote
  lint: function (paths) {
    var self = this;
    this.preTotal += paths.length;
    paths.forEach(function (src) {
      var img = new Image();
      img.onload = function () { self.preloaded++; if (src.indexOf(CASETS.bg[GS.currentLevel]) > -1) {} };
      img.onerror = function () { self.missing++; self.preloaded++; };
      img.src = src;
      self._img[src] = img;
    });
    if (this.preloaded >= this.preTotal) {}
  },
  has: function (src) {
    var i = this._img[src];
    return !!(i && i.complete && i.naturalWidth > 0);
  },
  // fondo de nivel: imagen si esta lista, si no null (el nivel pinta bd puro)
  bg: function (lvl) {
    var i = this._img[CASETS.bg[lvl.id]];
    if (!(i && i.complete && i.naturalWidth > 0)) return null;
    return i._img || i; // los stubs de test exponen el bitmap real en _img
  },
  // consumo bajo demanda: garantiza los fondos de una lista de niveles
  demand: function (ids) {
    var self = this, pending = [];
    ids.forEach(function (id) {
      var src = CASETS.bg[id];
      if (src && !self._img[src]) {
        var img = new Image();
        img.onload = function () { self.preloaded++; };
        img.onerror = function () { self.missing++; self.preloaded++; };
        img.src = src;
        self._img[src] = img;
      }
    });
    return pending;
  }
};

// ---------- sonido real con archivos (SND) ----------
// Se usa AC/tone como base; herohunde a .wav cuando el contexto ya existe.
function sndPlay(caset) {
  var src = CASETS.sfx[caset];
  if (!AC || muted || !src) { return; }
  try {
    var r = sndPlay._cache && sndPlay._cache[src];
    if (r) { SNDN.cue(AC, r); return; }
    var x = new XMLHttpRequest();
    x.open('GET', src + '.wav', true);
    x.responseType = 'arraybuffer';
    x.onload = function () {
      AC.decodeAudioData(x.response, function (buf) {
        sndPlay._cache = sndPlay._cache || {};
        sndPlay._cache[src] = buf;
        if (!muted) SNDN.cue(AC, buf);
      }, function () {});
    };
    x.onerror = function () {};
    x.send();
  } catch (e) {}
}
sndPlay._cache = {};

var SNDN = {
  cue: function (ctx, buf) {
    var s = ctx.createBufferSource();
    s.buffer = buf;
    var g = ctx.createGain();
    var v = (buf.duration > 3) ? 0.5 : 0.7;
    g.gain.setValueAtTime(v, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + buf.duration);
    s.connect(g); g.connect(ctx.destination); s.start();
  },
  cueLoop: function (ctx, buf, vol) {
    var s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    var g = ctx.createGain();
    g.gain.value = vol == null ? 0.3 : vol;
    s.connect(g); g.connect(ctx.destination); s.start();
    return { src: s, g: g };
  }
};

// ---------- musica: 1 pista en loop por familia + fade ----------
var MUSIC = {
  _ctx: null, _g: null, _playing: null, _bufs: {}, _handle: null,
  _cur: null,
  ensure: function () {
    if (!this._ctx && !muted) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },
  load: function (fam, cb) {
    var self = this;
    if (this._bufs[fam]) { cb && cb(this._bufs[fam]); return; }
    var cands = CASETS.music[fam] || CASETS.music.calm;
    var walk = function (i) {
      if (i >= cands.length) { cb && cb(null); return; }
      var x = new XMLHttpRequest();
      x.open('GET', cands[i] + '.wav', true);
      x.responseType = 'arraybuffer';
      x.onload = function () {
        if (x.status !== 200 && x.status !== 0) { walk(i + 1); return; }
        self.ensure() && self.ensure().decodeAudioData(x.response, function (b) {
          self._bufs[fam] = b; cb && cb(b);
        }, function () { walk(i + 1); });
      };
      x.onerror = function () { walk(i + 1); };
      x.send();
    };
    walk(0);
  },
  play: function (fam) {
    if (muted || this._playing === fam) return;
    var self = this;
    this._playing = fam;
    this.load(fam, function (buf) {
      if (!buf || self._playing !== fam || muted) { if (!buf) self._playing = null; return; }
      self.ensure();
      var ctx = self._ctx; if (!ctx) { self._playing = null; return; }
      if (self._cur) { try { self._cur.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        var old = self._cur; old.src.stop(ctx.currentTime + 0.6); } catch(e){} }
      self._g = ctx.createGain();
      self._g.gain.value = 0.0001;
      self._g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 1);
      self._g.connect(ctx.destination);
      var h = SNDN.cueLoop(ctx, buf, 0.28);
      h.src.connect(self._g);
      self._cur = h;
    });
  },
  stop: function () {
    this._playing = null;
    if (this._cur) { try { this._cur.g.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + 0.4); var c = this._cur; c.src.stop(this._ctx.currentTime + 0.5); } catch (e) {} this._cur = null; }
  }
};

// ---------- pantalla de carga del primer arranque ----------
function afnShow(p, t) {
  var el = $('loading');
  if (!el) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#0f0b2a;';
    var bar = document.createElement('div');
    bar.style.cssText = 'width:60%;max-width:320px;height:10px;border-radius:6px;background:rgba(169,155,255,.22);overflow:hidden;';
    bar.innerHTML = '<div id="afnFill" style="height:100%;width:0;background:#7a6bff;transition:width .25s;"></div>';
    var txt = document.createElement('div');
    txt.id = 'afnTxt';
    txt.style.cssText = 'margin-top:12px;color:#ffd643;font-family:ZCOOL XiaoWei,serif;letter-spacing:2px;';
    wrap.appendChild(bar); wrap.appendChild(txt);
    wrap.id = 'loading';
    document.body.appendChild(wrap);
    el = wrap;
  }
  el.style.cssText += 'display:flex;';
  var f = $('afnFill'), t2 = $('afnTxt');
  if (f) f.style.width = (p * 100 | 0) + '%';
  if (t2) t2.textContent = t || 'Cargando…';
}
function afnHide() { var el = $('loading'); if (el) el.style.display = 'none'; }

// errores de carga nunca tapan la UI
window.addEventListener('error', function (e) {
  try { afnHide(); } catch (_) {}
  try { console && console.warn('(no fatal) ' + e.message); } catch (_) {}
}, true);