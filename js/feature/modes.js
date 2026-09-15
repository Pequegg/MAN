/* Op-Art Fan - Modos de juego nuevos (Bloque 6, lazy). Reusa UNA sola partida
   del modo fan clasico con variantes de reglas que se activan desde el Perfil:
     . perfecto  - ganas SOLO si terminas sin fallos (0 fails)
     . reves     - el tablero se mueve espejado (X invertida) y el tiro es opuesto
     . mania     - meta x3, rapido y fratico: combo por cada 3 aciertos seguidos
   Cada modo registra su propio PB (ls "mo:rec"), NO toca ranking local ni
   remoto (misma garantia que MG: nunca ensucia localScores). TODO lazy. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function num(n) { return (typeof n === "number") ? Math.round(n) : 0; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function todayKey() {
    var d = new Date(), p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function seedIdx() {
    try {
      var k = parseInt(todayKey(), 10);
      var r = mulberry32(k * 8191 + 53);
      return Math.floor(r() * MODOS.length);
    } catch (e) { return 0; }
  }
  function sfx(n) { try { if (n === "hit" && window.sfxHit) sfxHit(); else if (window.sfxClick) sfxClick(); } catch (e) {} }

  /* ---------- almacen propio (prefijo "mo:", no toca ls core) ---------- */
  function gLS(k, d) { try { var v = localStorage.getItem("mo:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sLS(k, v) { try { localStorage.setItem("mo:" + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- los 3 modos ---------- */
  var MODOS = [
    { id: "perfecto", ico: "\u{1F3AF}", nm: "Perfecto", de: "Victoria solo sin fallos. Cero margen.",
      goal: null, pact: function (g) { g._moPerfect = true; } },
    { id: "reves", ico: "\u{1F53B}", nm: "A contracorriente", de: "Tablero espejado: todo al rev\u00E9s.",
      goal: null, pact: function (g) { g._moReverse = true; } },
    { id: "mania", ico: "\u{1F60D}", nm: "Fiebre", de: "Meta x3 y combo rabioso. \u00A1A tope!",
      goal: 3, pact: function (g) { g._moMania = true; } }
  ];

  function setMo(id) {
    var cur = current();
    if (cur.id === id) { sLS("cur", null); }
    else { sLS("cur", id); }
    try { if (window.toast) toast("Modo " + (cur.id === id ? "normal" : nameOf(id)), "\u{1F3C5}"); } catch (e) {}
  }
  function current() {
    var id = gLS("cur", null) || "perfecto";
    var m = MODOS.filter(function (x) { return x.id === id; })[0];
    return m || MODOS[0];
  }
  function nameOf(id) { var m = MODOS.filter(function (x) { return x.id === id; })[0]; return m ? m.nm : "normal"; }
  function list() { return MODOS.map(function (m) { return { id: m.id, ico: m.ico, nm: m.nm, de: m.de }; }); }

  /* ---------- record propio por modo (sin tocar ranking) ---------- */
  function rec(id) { var r = gLS("rec:" + id, {}); return { best: num(r.best), wins: num(r.wins), plays: num(r.plays) }; }
  function bumpRec(id, score, won) {
    var r = rec(id);
    r.plays = (r.plays || 0) + 1;
    if (won) r.wins = (r.wins || 0) + 1;
    if (score > (r.best || 0)) r.best = score;
    sLS("rec:" + id, r);
  }

  /* ---------- wrappers (monkeypatch; NUNCA metemos stats en ranking) ---------- */
  var _sg = window.startGame;
  if (typeof _sg === "function") {
    window.startGame = function () {
      try {
        var m = current();
        if (window.GS && m) { m.pact && m.pact(window.GS); window._featMo = m.id; }
        if (m && m.goal && window.GS) window.GS.goal = Math.round((window.GS.goal || 1) * m.goal);
      } catch (e) {}
      return _sg.apply(null, arguments);
    };
  }

  var _sh = window.showResult;
  if (typeof _sh === "function") {
    window.showResult = function (res) {
      var mo = window._featMo || null;
      var r;
      try { r = _sh.apply(null, arguments); } catch (e) { r = null; }
      window._featMo = null;
      try {
        if (!mo) return r;
        var won = !!(res && res.won);
        if (mo === "perfecto" && won) { var f = 0; try { f = res.fails || 0; } catch (e) {} won = f === 0; }
        if (won && res && res.score !== undefined) bumpRec(mo, res.score, true);
      } catch (e) {}
      void won;
      return r;
    };
  }

  /* ---------- UI: selector en Perfil (lazy) ---------- */
  function into(box) {
    if (!box) return;
    var c = current();
    var h = '<div class="ps-t">\u{1F3C5} Modo de juego</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;">';
    MODOS.forEach(function (m) {
      var act = m.id === c.id;
      var rc = rec(m.id);
      h += '<button class="mo-btn' + (act ? " on" : "") + '" data-mo="' + m.id + '"' +
        (act ? ' style="border-color:var(--gold,#ffd764);background:rgba(255,215,100,.12);"' : "") + '>' +
        '<span>' + m.ico + '</span>' +
        '<div><b>' + esc(m.nm) + '</b><div class="mo-de">' + esc(m.de) + '</div>' +
        '<div class="mo-rec">PB ' + num(rc.best) + ' \u00B7 ' + num(rc.wins) + ' victorias</div></div></button>';
    });
    h += '</div>' +
      '<div style="font-size:11px;opacity:.65;margin-top:9px;">Elige el modo en el Perfil y juega normal: la variante se aplica sola. Los records de modo no entran en el ranking.</div>';
    box.innerHTML = h;
    var bs = box.querySelectorAll(".mo-btn");
    for (var i = 0; i < bs.length; i++) {
      (function (b) {
        b.addEventListener("click", function () {
          sfx("click");
          setMo(b.getAttribute("data-mo"));
          if (current) into(box);
        });
      })(bs[i]);
    }
  }

  function menuBtn(ref) {
    if (!ref || $("btnModos")) return;
    var b = document.createElement("button");
    b.id = "btnModos";
    b.className = "menu-btn";
    b.innerHTML = '<span class="ico">&#x1F3C5;</span><span class="grow"><div>Modo de juego</div>' +
      '<div class="desc">' + esc(current().nm) + ' — variante activa</div></span><span class="sub">\u203A</span>';
    b.addEventListener("click", function () { try { if (window.Feat) window.Feat.open("perfil"); } catch (e) {} });
    var refNode = $("btnPerfil");
    var anchor = refNode || ref;
    anchor.parentNode.insertBefore(b, anchor);
  }

  /* ---------- CSS lazy (una sola inyeccion) ---------- */
  if (!$("moStyle")) {
    var s = document.createElement("style");
    s.id = "moStyle";
    s.textContent =
      ".mo-btn{display:flex;align-items:center;gap:9px;padding:10px;border-radius:14px;" +
      "border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);cursor:pointer;" +
      "flex:1;min-width:140px;text-align:left;transition:transform .12s;}" +
      ".mo-btn:hover{transform:translateY(-1px);}" +
      ".mo-btn b{font-size:13px;display:block;}" +
      ".mo-btn .mo-de{font-size:10px;opacity:.7;margin-top:2px;}" +
      ".mo-btn .mo-rec{font-size:10px;color:var(--gold,#ffd764);margin-top:4px;}";
    document.head.appendChild(s);
  }

  window.Mo = {
    into: into, list: list, current: current, nameOf: nameOf, setMo: setMo,
    rec: rec, seedIdx: seedIdx, menuBtn: menuBtn
  };
})();
