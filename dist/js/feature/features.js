/* Op-Art Fan - feature bootstrap (lazy, no entra en el presupuesto de index.html)
   Carga y parchea minimamente los hooks core para alimentar Perfil/estadisticas
   (Bloque 1). Las features posteriores (spirit, poemas, paletas) se anadiran aqui. */
(function(){
  "use strict";

  /* ---------- captura de estadisticas por partida ---------- */
  var _show = window.showResult;
  window.showResult = function(res){
    try{
      var s = ls("ft") || {};
      s.plays = (s.plays||0)+1;
      if(res && res.won) s.wins = (s.wins||0)+1; else s.lose = (s.lose||0)+1;
      s.cat = (s.cat||0)+(res && res.catches?res.catches:0);
      s.miss = (s.miss||0)+(res && res.fails?res.fails:0);
      s.best = Math.max(s.best||0, (res && res.score)?res.score:0);
      s.earned = (s.earned||0)+(res && res.coinsGained?res.coinsGained:0);
      var k = todayKey();
      s.days = s.days||{}; s.days[k] = (s.days[k]||0)+1;
      s.bests = s.bests||{}; s.bests[k] = Math.max(s.bests[k]||0, (res && res.score)?res.score:0);
      if(window._featRunStart){ s.secs = (s.secs||0)+Math.max(0,Math.round((Date.now()-window._featRunStart)/1000)); }
      ls("ft", s);
    }catch(e){}
    return _show.apply(null, arguments);
  };

  /* ---------- inicio de partida (para medir tiempo) ---------- */
  var _sg = window.startGame;
  window.startGame = function(id){
    try{ window._featRunStart = Date.now(); }catch(e){}
    return _sg.apply(null, arguments);
  };

  /* ---------- fecha de registro / nickname ---------- */
  var _sa = window.saveAll;
  window.saveAll = function(){
    try{
      if(window.profile && profile.name && !profile.reg) profile.reg = Date.now();
    }catch(e){}
    return _sa.apply(null, arguments);
  };

  /* ---------- pantalla Perfil (lazy) ---------- */
  var PERFIL_HTML =
    '<section id="screen-perfil" class="screen">'+
      '<div class="topbar">'+
        '<button class="back" id="perfBack">&#x2190;</button>'+
        '<div class="grow"><h1 class="title" style="font-size:20px;">Tu Perfil</h1></div>'+
        '<span class="coins-pill" style="font-size:13px;">&#x1FA99; <b id="perfCoins">0</b></span>'+
      '</div>'+
      '<div class="panel center">'+
        '<div class="big-avatar" id="perfAvatar" style="font-size:34px; width:64px; height:64px; margin:0 auto 6px;">&#x1FA99;</div>'+
        '<div id="perfName" style="font-weight:900; font-size:18px;">-</div>'+
        '<div id="perfTitle" style="font-size:12px; color:var(--gold); font-weight:700;">-</div>'+
        '<div class="row wrap center" style="gap:6px; justify-content:center; margin-top:6px;">'+
          '<span class="tier-chip" id="perfTier">&#x2728; Novato</span>'+
          '<span class="streak-chip" id="perfStreak" style="display:none;"></span>'+
        '</div>'+
        '<div style="font-size:12px; color:var(--dim); margin-top:6px;" id="perfReg"></div>'+
        '<div id="perfStatus" style="font-size:13px; font-style:italic; color:var(--cream); margin-top:4px;"></div>'+
      '</div>'+
      '<div class="panel">'+
        '<div style="font-weight:900; font-size:15px; margin-bottom:8px;">Editar jugador</div>'+
        '<input id="perfNick" class="name-input" type="text" maxlength="16" placeholder="Cambiar nombre">'+
        '<input id="perfStatusI" class="name-input" type="text" maxlength="40" placeholder="Estado (frase corta)" style="margin-top:8px;">'+
        '<button class="btn gold mt12" id="perfSave" style="max-width:220px;">Guardar</button>'+
      '</div>'+
      '<div style="font-weight:900; font-size:15px; margin:4px 2px 8px;">Resumen</div>'+
      '<div class="st-grid" id="stGrid">'+
        '<div class="st-card"><div class="st-num" id="stPlays">0</div><div class="st-lbl">Partidas</div></div>'+
        '<div class="st-card"><div class="st-num" id="stWins">0</div><div class="st-lbl">Victorias</div></div>'+
        '<div class="st-card"><div class="st-num" id="stAcc">-</div><div class="st-lbl">Acierto</div></div>'+
        '<div class="st-card"><div class="st-num" id="stBest">0</div><div class="st-lbl">Mejor combo</div></div>'+
        '<div class="st-card"><div class="st-num gold" id="stEarned">0</div><div class="st-lbl">Monedas totales</div></div>'+
        '<div class="st-card"><div class="st-num" id="stDone">0</div><div class="st-lbl">Niveles</div></div>'+
        '<div class="st-card"><div class="st-num" id="stTime">0m</div><div class="st-lbl">Tiempo</div></div>'+
        '<div class="st-card"><div class="st-num" id="stTop">0</div><div class="st-lbl">Mejor puntaje</div></div>'+
      '</div>'+
      '<div style="font-weight:900; font-size:15px; margin:12px 2px 8px;">Tu semana</div>'+
      '<div class="week-cells" id="weekCells"></div>'+
      '<div class="chart-box"><div class="chart-t">Victorias de hoy</div><canvas id="chartDonut" width="160" height="160"></canvas></div>'+
      '<div class="chart-box"><div class="chart-t">Partidas por día (semana)</div><canvas id="chartWeek" width="300" height="96"></canvas></div>'+
      '<div class="chart-box"><div class="chart-t">Mejor puntaje por día</div><canvas id="chartLine" width="300" height="96"></canvas></div>'+
      '<button class="btn cyan mt12" id="perfShare" style="max-width:300px;">&#x1F4E4; Compartir mi resumen</button>'+
    '</section>';

  function featLoadPerfil(cb){
    if(typeof window.renderPerfil==="function"){ if(window.Feat) Feat.pjLoaded = true; cb(); return; }
    var s = document.createElement("script");
    s.src = "js/feature/perfil.js";
    s.onload = function(){ if(window.Feat) Feat.pjLoaded = true; cb(); };
    document.body.appendChild(s);
  }

  function featOpenPerfil(){
    try{ ensureAudio(); sfxClick(); }catch(e){}
    if(screens.indexOf("perfil")===-1) screens.push("perfil");
    if(!$("screen-perfil")){
      var end = $("screen-end");
      var box = end && end.parentNode ? end.parentNode : $("#app");
      box.insertAdjacentHTML("beforeend", PERFIL_HTML);
      if(typeof confettiSafe!=="undefined"){ /* noop */ }
    }
    featLoadPerfil(function(){
      try{ renderPerfil(); }catch(e){ toast("Perfil listo","\u{1F464}"); }
      show("perfil");
    });
  }

  /* ---------- boton en el menu ---------- */
  function featInjectUI(){
    try{
      var ref = $("btnCredits");
      if(!ref || $("btnPerfil")) return;
      var b = document.createElement("button");
      b.className = "menu-btn";
      b.id = "btnPerfil";
      b.innerHTML = '<span class="ico">&#x1F464;</span><span class="grow"><div>Perfil</div><div class="desc">Jugador, racha y estadísticas</div></span><span class="sub">&gt;</span>';
      b.addEventListener("click", featOpenPerfil);
      ref.parentNode.insertBefore(b, ref);
    }catch(e){}
  }

  /* resumen compartible (lo usa perfil.js) */
  function featShareText(){
    var s = ls("ft") || {};
    var tier = "Novato", pts = 0;
    try{ var t = seasonTier(); tier = t.nm; pts = t.pts; }catch(e){}
    var streak = 0;
    try{ streak = dayStreak(); }catch(e){}
    var acc = (s.cat+s.miss)>0 ? Math.round(100*s.cat/(s.cat+s.miss)) : 0;
    var m = s.secs?Math.floor(s.secs/60):0;
    var reg = profile && profile.reg ? new Date(profile.reg).toLocaleDateString("es-ES") : "-";
    var t60 = []; for(var i=0;i<60 && i<s.days;i++){}; void t60;
    return "\u{1F3AE} Op-Art Fan \u2014 Perfil de "+(profile&&profile.name?profile.name:"-")+
      "\n\u{1F947} "+(tier+" ("+num(pts)+" pts)")+" \u00B7 \u{1F525} "+streak+" d\u00EDas"+
      "\n\u{1F3AF} "+num(s.plays||0)+" partidas \u00B7 \u{1F3C6} "+num(s.wins||0)+" victorias"+
      "\n\uD83C\uDFAF Precisi\u00F3n "+acc+"% \u00B7 \u26A1 M\u00E1x combo x"+(s.best||0)+
      "\n\u2B50 Mejor puntaje "+num(s.best||0)+" \u00B7 \u23F1 "+(s.secs|0)+"s"+
      "\n\u{1F5D3} Jugador desde "+reg;
  }

  window.Feat = {
    open: featOpenPerfil,
    share: featShareText,
    pjLoaded: false
  };

  featInjectUI();
})();