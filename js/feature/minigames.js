/* Op-Art Fan - Minijuegos del Catalogo (modulo lazy, MG). Ocho juegos breves
   20-60 s, solo toques, canvas #cv, paleta activa y assets de audio existentes.
   Rotan por dia (semilla de fecha -> 1 juego diario dentro del reto diario).
   No reemplazan el modo Historia ni contaminan el ranking local. Cada juego
   define init/tick/paint/tap; el runner compartido lleva tiempo, toque y fin. */
(function () {
  "use strict";

  /* ---------- helpers menores ---------- */
  function $(id) { return document.getElementById(id); }
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
  function seedInt() {
    var k = parseInt(todayKey(), 10);
    var rnd = mulberry32(k * 104729 + 91);
    return Math.floor(rnd() * 8);
  }
  function sfx(n) { try { if (n === "hit" && window.sfxHit) sfxHit(); else if (window.sfxClick) sfxClick(); } catch (e) {} }

  /* ---------- CSS (una sola inyeccion, no toca presupuesto) ---------- */
  if (!document.getElementById("mgStyle")) {
    var s = document.createElement("style");
    s.id = "mgStyle";
    s.textContent =
      "#btnMG{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:16px;" +
      "border:1px solid rgba(255,215,100,.45);background:linear-gradient(135deg,rgba(255,215,100,.16),rgba(255,120,90,.08));" +
      "margin-bottom:10px;cursor:pointer;transition:transform .15s;}" +
      "#btnMG:hover{transform:scale(1.02);}" +
      "#btnMG .gi{font-size:26px;width:44px;height:44px;border-radius:50%;background:rgba(255,215,100,.14);" +
      "display:flex;align-items:center;justify-content:center;flex:none;}" +
      "#btnMG .gt{flex:1;}" +
      "#btnMG .gt .tn{font-weight:900;font-size:15px;color:var(--t1,#fff);}" +
      "#btnMG .gt .td{font-size:12px;color:var(--t2,#ffd764);margin-top:2px;}" +
      "#btnMG .ga{font-size:11px;color:rgba(255,255,255,.55);}" +
      ".mg-hud{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:5;" +
      "background:rgba(0,0,0,.55);border:1px solid rgba(255,215,100,.35);border-radius:999px;" +
      "padding:6px 14px;font-weight:900;font-size:13px;color:var(--t1,#fff);" +
      "display:flex;gap:12px;align-items:center;white-space:nowrap;}" +
      ".mg-hud .mh-b{color:var(--t2,#ffd764);}" +
      "#screen-mg{bottom:0;}";
    document.head.appendChild(s);
  }

  /* ---------- almacen local minimo (prefijo propio, no toca ls core) ---------- */
  function gLS(k, d) { try { var v = localStorage.getItem("mg:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sLS(k, v) { try { localStorage.setItem("mg:" + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- auditorio de partidas de minijuego (para perfil) ---------- */
  function record() { var r = gLS("rec", {}); return { best: num(r.best), plays: num(r.plays), wins: num(r.wins) }; }
  function bumpRec(r) {
    var ro = record();
    if (r > ro.best) ro.best = r;
    ro.plays = (ro.plays || 0) + 1;
    if (typeof r === "number" && r > 0) ro.wins = (ro.wins || 0) + 1;
    sLS("rec", ro);
  }

  /* ---------- definicion de los 8 juegos ---------- */
  var GAMES = [
    { id: "pincel",  name: "Trazo del Pincel",  ico: "\u{1F58C}", min: 25, max: 30,
      goal: 400, desc: "Reproduce el trazo de caligraf\u00EDa lo m\u00E1s fiel y r\u00E1pido que puedas.",
      init: function (g) { g.p = []; g.c = 0; g.trail = []; },
      tick: function (g, dt) { g.c += dt; },
      paint: function (g, c, ctx, W, H) {
        var px = W * 0.20, py = H * 0.78, rad = W * 0.34;
        ctx.strokeStyle = ctx.fillStyle = "rgba(255,215,100,.22)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.bezierCurveTo(px + rad, py - H * 0.55, px + rad * 1.4, py - H * 0.1, px + rad * 1.9, py - H * 0.28);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,215,100,.45)";
        ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.283); ctx.fill();
        if (g.p.length) {
          ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(g.p[0].x, g.p[0].y);
          for (var i = 1; i < g.p.length; i++) ctx.lineTo(g.p[i].x, g.p[i].y);
          ctx.stroke();
        }
      },
      tap: function (g, x, y, down) { if (down) { g.p.push({ x: x, y: y }); g.score = Math.max(g.score, Math.min(g.p.length * 3, g.goal)); } }
    },
    { id: "bambu", name: "Tel\u00E9fono de Bamb\u00FA", ico: "\u{1F38C}", min: 25, max: 35,
      goal: 250, desc: "Memoriza y repite la secuencia que toca el tambor.",
      init: function (g) { g.seq = []; g.pos = 0; g.show = 秀; g.showT = 0; },
      tick: function (g, dt) {
        g.showT -= dt;
        if (g.showT <= 0) { g.show = null; }
        if (!g.show && g.pos >= g.seq.length) {
          g.seq.push(Math.floor(Math.random() * 4));
          g.pos = 0; g.show = g.seq.slice(); g.showT = 1.0 + g.seq.length * 0.22;
        }
      },
      paint: function (g, c, ctx, W, H) {
        var n = 4, bw = Math.min(W * 0.16, 120), bh = Math.min(H * 0.14, 90);
        var x0 = (W - bw * n) / 2, y0 = H * 0.2;
        var cols = ["#ff5d5d", "#ffd764", "#4fe08a", "#7fd4ff"];
        for (var i = 0; i < n; i++) {
          ctx.fillStyle = cols[i];
          ctx.beginPath(); ctx.roundRect(x0 + i * bw, y0, bw - 8, bh, 12); ctx.fill();
          ctx.fillStyle = "#000"; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("" + (i + 1), x0 + i * bw + (bw - 8) / 2, y0 + bh / 2);
        }
        if (g.show) {
          var idx = g.show[0];
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
          ctx.strokeRect(x0 + idx * bw + 4, y0 + 4, bw - 16, bh - 8);
        }
      },
      tap: function (g, x, y, down) {
        if (!down || !g.show) return;
        var n = 4, bw = Math.min(W * 0.16, 120), bh = Math.min(H * 0.14, 90);
        var x0 = (W - bw * n) / 2, y0 = H * 0.2;
        for (var i = 0; i < n; i++) {
          if (x >= x0 + i * bw && x <= x0 + i * bw + bw - 8 && y >= y0 && y <= y0 + bh) {
            if (g.show[0] === i) { g.show.shift(); g.pos++; g.score = Math.min(g.score + 15, g.goal); sfx("hit"); }
            else { g.seq = []; g.pos = 0; g.show = null; g.score = 0; }
            return;
          }
        }
      }
    },
    { id: "tambor", name: "Ritmo del Tambor", ico: "\u{1F941}", min: 25, max: 40,
      goal: 220, desc: "Toca justo cuando el p\u00E9ndulo pasa por el centro.",
      init: function (g) { g.ph = 0; },
      tick: function (g, dt) { g.ph += dt * 1.15; if (g.ph > 2 * Math.PI) g.ph -= 2 * Math.PI; },
      paint: function (g, c, ctx, W, H) {
        var cx = W / 2, cy = H * 0.3, R = H * 0.22;
        ctx.strokeStyle = "rgba(255,215,100,.4)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
        ctx.fillStyle = "#ffd764";
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.283); ctx.fill();
        var a = Math.cos(g.ph), b = Math.sin(g.ph);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + a * R, cy + b * R); ctx.stroke();
        ctx.fillStyle = "#ffb347";
        ctx.beginPath(); ctx.arc(cx + a * R, cy + b * R, 16, 0, 6.283); ctx.fill();
      },
      tap: function (g, x, y, down) {
        if (!down) return;
        var cx = W / 2, cy = H * 0.3;
        var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dist > H * 0.2 && dist < H * 0.3) {
          var v = Math.cos(g.ph);
          if (Math.abs(v) > 0.82) { g.score = Math.min(g.score + 30, g.goal); sfx("hit"); }
          else if (Math.abs(v) > 0.4) { g.score = Math.min(g.score + 8, g.goal); }
          else { g.score = Math.max(0, g.score - 10); }
        }
      }
    },
    { id: "farol", name: "Farolillo Zigzag", ico: "\u{1F4A1}", min: 25, max: 45,
      goal: 500, desc: "Gu\u00EDa el farolillo toca a toca: cambia de direcci\u00F3n en cada cruce.",
      init: function (g) { g.dir = 1; g.x = 0; g.y = 0.5; g.q = 0; },
      tick: function (g, dt) {
        g.x += g.dir * dt * 0.9;
        if (g.x > 1 || g.x < 0) { g.dir *= -1; g.x = clamp(g.x, 0, 1); g.q++; g.score = Math.min(g.score + 20, g.goal); }
      },
      paint: function (g, c, ctx, W, H) {
        var y = g.y * H;
        ctx.strokeStyle = "rgba(255,215,100,.3)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = "#ffd764";
        ctx.beginPath(); ctx.arc(g.x * W, y, 12, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#cf8f2e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(g.x * W, y + 12); ctx.lineTo(g.x * W, y + 30); ctx.stroke();
      },
      tap: function (g, x, y, down) {
        if (!down) return;
        if (y < g.y * H) g.y = Math.max(0.05, g.y - 0.18); else g.y = Math.min(0.95, g.y + 0.18);
        g.score = Math.min(g.score + 5, g.goal);
      }
    },
    { id: "grulla", name: "Vuelo de la Grulla", ico: "\u{1F4AB}", min: 25, max: 60,
      goal: 300, desc: "Mant\u00E9n a la grulla en vuelo: toques cortos para aletear.",
      init: function (g) { g.vy = 0; g.y = 0.4; g.wind = 250; g.gate = -1; },
      tick: function (g, dt) {
        g.vy += dt * 2.6; g.y += g.vy * dt;
        if (g.y < 0.06) { g.y = 0.06; g.vy = Math.max(0, g.vy); }
        if (g.y > 0.94) { g.y = 0.94; g.vy = 0; }
        g.wind -= dt * 130;
        if (g.wind < -g.x * 40) { g.wind = W; g.gate = 0.35 + Math.random() * 0.3; }
        if (g.gate >= 0 && g.wind < W * 0.5) {
          if (Math.abs(g.y - g.gate) < 0.16) { g.score = Math.min(g.score + 15, g.goal); g.gate = -1; }
        }
      },
      paint: function (g, c, ctx, W, H) {
        ctx.fillStyle = "#9ae6ff";
        ctx.beginPath();
        ctx.moveTo(g.wind - 18, g.y * H - 18); ctx.lineTo(g.wind + 22, g.y * H); ctx.lineTo(g.wind - 18, g.y * H + 18);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5cbfe6";
        ctx.beginPath(); ctx.arc(g.wind - 28, g.y * H, 20, 0, 6.283); ctx.fill();
        ctx.fillStyle = g.score > g.goal * 0.6 ? "rgba(255,215,100,.35)" : "rgba(255,120,90,.3)";
        ctx.fillRect(0, 0, W * 0.02, H);
        ctx.fillRect(W * 0.5, 0, W * 0.02, H);
        ctx.fillRect(W - W * 0.02, 0, W * 0.02, H);
      },
      tap: function () { g.vy = -1.1; sfx("hit"); }
    },
    { id: "monedas", name: "Cuenta las Monedas", ico: "\u{1FA99}", min: 25, max: 40,
      goal: 300, desc: "Cuenta las monedas que se encienden y toca su n\u00FAmero.",
      init: function (g) { g.n = 0; g.ansOn = false; g.ansT = 0; g.answer = 0; },
      tick: function (g, dt) {
        if (g.ansOn) {
          g.ansT -= dt;
          if (g.ansT <= 0) { g.answer = 0; spawnCoins(g); }
          return;
        }
        g.ansT -= dt;
        if (g.ansT <= 0) { g.ansOn = true; g.ansT = 12; }
      },
      paint: function (g, c, ctx, W, H) {
        if (g.ansOn) {
          ctx.fillStyle = "#fff"; ctx.font = "32px serif"; ctx.textAlign = "center";
          ctx.fillText("?"+g.answer, W / 2, H * 0.55);
          return;
        }
        ctx.fillStyle = "#ffd764";
        for (var i = 0; i < g.n; i++) {
          var a = (i / Math.max(1, g.n)) * 6.283;
          var r = 28 + (i % 9) * 6;
          var x = W / 2 + Math.cos(a) * r * 1.6;
          var y = H * 0.45 + Math.sin(a) * r * 0.8;
          ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.283); ctx.fill();
        }
      },
      tap: function (g, x, y, down) {
        if (!down) return;
        if (g.ansOn) {
          g.answer = (g.answer * 10 + 1) % 100;
          if (g.answer === g.n) { g.score = Math.min(g.score + 40, g.goal); g.ansOn = false; g.ansT = 2.5; g.n = 0; sfx("hit"); }
          else if (g.answer > g.n) { g.answer = 0; }
        }
      }
    },
    { id: "mandala", name: "Memoria del Mandala", ico: "\u{1F4D2}", min: 30, max: 45,
      goal: 260, desc: "Repite el patr\u00F3n que se ilumina, cada vez m\u00E1s largo.",
      init: function (g) { g.seq = [0]; g.pos = 0; g.show = 1; g.hot = -1; },
      tick: function (g, dt) {
        if (g.show) { g.show -= dt; if (g.show <= 0) { g.pos = 0; g.hot = -1; } return; }
      },
      paint: function (g, c, ctx, W, H) {
        var cx = W / 2, cy = H * 0.22;
        for (var i = 0; i < 6; i++) {
          var a = i * 6.283 / 6 - 1.57;
          var x = cx + Math.cos(a) * W * 0.25, y = cy + Math.sin(a) * W * 0.25;
          var on = false;
          if (g.hot === i) on = true体裁;
          ctx.fillStyle = on ? "#ffd764" : "rgba(255,215,100,.25)";
          ctx.beginPath(); ctx.arc(x, y, 16, 0, 6.283); ctx.fill();
        }
        if (g.hot === -1 && g.pos >= g.seq.length) {
          g.seq.push((g.seq[g.seq.length - 1] + 1 + Math.floor(Math.random() * 5)) % 6);
          g.show = 1.0 + g.seq.length * 0.18;
        }
        g.hot = (g.hot === -1 && g.show <= 0 && g.pos < g.seq.length) ? g.seq[g.pos] : -1;
      },
      tap: function (g, x, y, down) {
        if (!down) return;
        var cx = W / 2, cy = H * 0.22;
        for (var i = 0; i < 6; i++) {
          var a = i * 6.283 / 6 - 1.57;
          var px2 = cx + Math.cos(a) * W * 0.25, py2 = cy + Math.sin(a) * W * 0.25;
          if (Math.abs(x - px2) < 24 && Math.abs(y - py2) < 24) {
            if (g.hot === i) { g.hot = -1; g.pos++; g.score = Math.min(g.score + 20, g.goal); sfx("hit"); }
            else { g.seq = [0]; g.pos = 0; g.hot = -1; g.show = 0; g.score = 0; }
            return;
          }
        }
      }
    },
    { id: "veloz", name: "Toque Veloz", ico: "\u{26A1}", min: 20, max: 30,
      goal: 220, desc: "Toca todas las linternas encendidas antes de que se apaguen.",
      init: function (g) { g.tG = 0; g.tn = null; },
      tick: function (g, dt) {
        if (g.tn) { g.tG -= dt; if (g.tG <= 0) { g.tn = null; g.score = Math.max(0, g.score - 25); } }
      },
      paint: function (g, c, ctx, W, H) {
        if (!g.tn) g.tn = { x: W * 0.1 + Math.random() * W * 0.8, y: H * 0.1 + Math.random() * H * 0.8 };
        ctx.fillStyle = "#ffd764";
        ctx.beginPath(); ctx.arc(g.tn.x, g.tn.y, 18, 0, 6.283); ctx.fill();
        ctx.fillStyle = "rgba(255,215,100,.3)";
        ctx.beginPath(); ctx.arc(g.tn.x, g.tn.y, 26, 0, 6.283); ctx.fill();
        ctx.fillStyle = g.tn.y > H * 0.5 ? "#ffffff" : "#000";
        ctx.fillRect(g.tn.x - 3, g.tn.y + 5, 6, 14);
      },
      tap: function (g, x, y, down) {
        if (!down || !g.tn) return;
        if (Math.abs(x - g.tn.x) < 34 && Math.abs(y - g.tn.y) < 34) {
          g.score = Math.min(g.score + 15, g.goal); g.tn = null; sfx("hit");
        }
      }
    }
  ];

  /* ---------- runner compartido ---------- */
  var RG = null, rafId = 0, lastT = 0;
  var cv = null, ctx = null, W = 0, H = 0; /* W/H se actualizan en resize */

  function resize() {
    try {
      var wr = document.getElementById("gameWrap");
      W = (wr && wr.clientWidth) || cv.width || 360;
      H = (wr && wr.clientHeight) || cv.height || 640;
    } catch (e) { W = 360; H = 640; }
  }

  function onDown(e) {
    if (!RG) return;
    var pt = e.touches ? e.touches[0] : e;
    var r = cv.getBoundingClientRect();
    featTap((pt.clientX - r.left) / Math.max(1, r.width || W) * W,
            (pt.clientY - r.top) / Math.max(1, r.height || H) * H, true);
  }

  function featTap(x, y, down) {
    if (!RG || !RG.game) return;
    try { RG.game.tap(RG, x, y, down); } catch (e) {}
  }

  function tick(dt) {
    if (RG.game && RG.game.tick) { try { RG.game.tick(RG, dt); } catch (e) {} }
    if (RG.score >= RG.goal) { finish(true); return; }
    RG.time -= dt;
    if (RG.time <= 0) { finish(RG.score >= RG.goal * 0.5); }
  }

  function paint() {
    if (!RG || !ctx) return;
    try {
      ctx.clearRect(0, 0, W, H);
      if (RG.game && RG.game.paint) RG.game.paint(RG, RG, ctx, W, H);
      var hb = document.getElementById("mgHud");
      if (hb) hb.textContent = (RG.game ? RG.game.ico + " " + RG.game.name : "") + "  ·  Meta " +
        num(Math.min(RG.score, RG.goal)) + "/" + num(RG.goal) + "  ·  T " + Math.max(0, Math.ceil(RG.time)) + "s";
    } catch (e) {}
  }

  function loop(t) {
    if (!RG) { rafId = 0; return; }
    var dt = Math.min(0.06, (t - lastT) / 1000) || 0.016;
    lastT = t;
    tick(dt);
    paint();
    if (RG) rafId = requestAnimationFrame(loop);
  }

  function finish(won) {
    var score = RG.score;
    bumpRec(score);
    var out = {
      score: score, goal: RG.goal, won: won, levelObj: { id: "mg" }, levelId: "mg",
      newRecord: score > record().best, bestCombo: 0
    };
    RG = null;
    if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) {} rafId = 0; }
    try { cv.removeEventListener("pointerdown", onDown); } catch (e) {}
    try { cv.removeEventListener("touchstart", onDown); } catch (e) {}
    try { show("screen-mg"); } catch (e) {}
    try { hide("screen-mg"); } catch (e) {}
    try { showMap = window.showScreen; } catch (e) {}
    if (window.showResult) { window.showResult(out); }
    else if (window.finishGame) { window.finishGame(true, out); }
    else if (window.showRes) { window.showRes(out); }
    else { try { show("screen-result"); } catch (e) {} }
  }

  function showScreen(name) { if (window.showResult || typeof w == "undefined") return; }

  function start() {
    try { window._featMode = "mg"; } catch (e) {}
    cv = document.getElementById("cv") || $("cv");
    if (!cv) { toast("No hay lienzo", "\u{1F4A1}"); return; }
    cv = cv.tagName ? cv : (document.querySelector("canvas") || cv);
    try { ctx = cv.getContext("2d"); } catch (e) { ctx = null; }
    resize();
    var idx = seedInt();
    var game = GAMES[idx % GAMES.length];
    RG = { game: game, score: 0, time: game.max, goal: game.goal, seed: idx };
    if (game.init) { try { game.init(RG); } catch (e) {} }
    RG.game = game;
    try { ensureScreen(); } catch (e) {}
    try { show("screen-game"); } catch (e) {}
    try {
      var hud = document.createElement("div");
      hud.id = "mgHud"; hud.className = "mg-hud";
      var wr = document.getElementById("gameWrap") || document.body;
      wr.appendChild(hud);
    } catch (e) {}
    try { cv.addEventListener("pointerdown", onDown, { passive: true }); } catch (e) {}
    try { cv.addEventListener("touchstart", onDown, { passive: true }); } catch (e) {}
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function isToday() {
    var k = gLS("last", "");
    if (k === todayKey()) return true;
    sLS("last", todayKey());
    return false;
  }

  function current() {
    var game = GAMES[seedInt() % GAMES.length];
    return {
      id: "mg." + game.id, ico: game.ico, name: game.name, desc: game.desc + " (" + game.min + "–" + game.max + " s)",
      time: game.max, goal: game.goal, isMG: true
    };
  }

  function intoPerfil(box) {
    if (!box) return;
    var c = current();
    box.innerHTML =
      '<div class="perf-sec mgs">' +
      '<div class="ps-t">\u{1F3A2} Minijuego del d\u00EDa</div>' +
      '<button class="mg-btn" onclick="(function(){try{ window.MG && MG.start(); }catch(e){}})()">' +
      '<span class="gi">' + c.ico + '</span>' +
      '<span class="gt"><span class="tn">' + c.name + '</span>' +
      '<span class="td">' + c.desc + '</span></span>' +
      '<span class="ga">Jugar \u203A</span></button>' +
      '<div class="mg-rec">R\u00E9cord: ' + num(record().best) + ' \u00B7 Partidas: ' + num(record().plays) +
      ' \u00B7 Victorias: ' + num(record().wins) + '</div>' +
      '</div>';
    box.style.display = "";
  }

  function menuBtn(ref) {
    if (!ref || document.getElementById("btnMG")) return;
    var c = current();
    var b = document.createElement("button");
    b.id = "btnMG";
    b.innerHTML = '<span class="gi">' + c.ico + '</span>' +
      '<span class="gt"><span class="tn">Minijuego de hoy</span>' +
      '<span class="td">' + c.name + '</span></span><span class="ga">\u203A</span>';
    b.addEventListener("click", function () { try { window.MG && MG.start(); } catch (e) {} });
    ref.parentNode.insertBefore(b, ref);
  }

  window.MG = {
    start: start, current: current, record: record,
    games: function () { return GAMES.map(function (g) { return { id: g.id, name: g.name, ico: g.ico, min: g.min, max: g.max, goal: g.goal }; }); },
    intoPerfil: intoPerfil, menuBtn: menuBtn, seedInt: seedInt
  };
})();
