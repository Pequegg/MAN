/* Op-Art Fan - Eventos semanales + Omikuji diario (modulo lazy).
   Retos deterministas por semana (seed) y suerte diaria por fecha. Sin
   economia: solo trofeos y animo. Inyecta CSS y bloques en Perfil. */
(function(){
  "use strict";

  if(!document.getElementById("evtsStyle")){
    var s = document.createElement("style");
    s.id = "evtsStyle";
    s.textContent =
      ".perf-sec.evts{margin-top:14px;}"+
      ".wkr-row{display:flex;align-items:center;gap:8px;padding:7px 10px;margin-top:6px;"+
      "border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.04);}"+
      ".wkr-row.ok{border-color:#ffd764;background:rgba(255,215,100,.10);}"+
      ".wkr-row .st{width:22px;text-align:center;font-size:15px;flex:none;}"+
      ".wkr-row .lt{flex:1;font-size:13px;line-height:1.35;}"+
      ".wkr-row .lt b{color:var(--t2,#ffd764);font-weight:700;}"+
      ".omk{margin-top:6px;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.45;"+
      "background:linear-gradient(135deg,rgba(255,215,100,.14),rgba(255,120,90,.10));"+
      "border:1px solid rgba(255,215,100,.35);}"+
      ".omk .ot{font-weight:700;color:#ffd764;}"+
      ".omk .od{margin-top:3px;color:var(--t1,#f4f0e2);opacity:.92;}";
    document.head.appendChild(s);
  }

  function get(k, d){ try{ var v = localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } }
  function ls(k, v){ if(arguments.length>1){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } else { return get(k, null); } }
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  function dtk(d){ var p=function(n){return n<10?"0"+n:""+n;}; return ""+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate()); }
  function wkKey(d){
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dow = (x.getDay()+6)%7;
    x.setDate(x.getDate()-dow);
    return dtk(x);
  }
  function dayIndex(d){ return Math.floor(d.getTime()/86400000); }

  function weekPlays(){ /* partidas esta semana */
    var now = new Date(), k = wkKey(now);
    var f = ls("ft"); if(!f || !f.days) return 0;
    var sum = 0;
    for(var i=0;i<7;i++){
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
      if(wkKey(d)===k) sum += (f.days[dtk(d)]||0);
    }
    return sum;
  }
  function weekWins(){ /* niveles completados esta semana (contador keyed por semana) */
    var wk = ls("wkDone")||{};
    return (wk.k===wkKey(new Date())) ? (wk.win||0) : 0;
  }

  function retos(){
    var rnd = mulberry32(dayIndex(new Date())/7|0 * 7919 + 13);
    var x = 3 + Math.floor(rnd()*3);       /* 3-5 partidas */
    var y = 2 + Math.floor(rnd()*2);       /* 2-3 niveles */
    var wp = weekPlays();
    var ww = weekWins();
    return [
      { ic:"\uD83C\uDFC3", t:"Juega <b>"+x+"</b> partidas esta semana", need:wp, want:x, ok:wp>=x },
      { ic:"\uD83D\uDD25", t:"Alcanza un <b>S-rank</b> (combo x15)", need:0, want:0, ok:sRank() },
      { ic:"\uD83C\uDFC6", t:"Completa <b>"+y+"</b> niveles esta semana", need:ww, want:y, ok:ww>=y }
    ];
  }

  function sRank(){
    var f = ls("ft"); return !!(f && f.best>=15);
  }

  function addWinCount(n){
    var k = wkKey(new Date());
    var wk = ls("wkDone")||{};
    if(wk.k!==k){ wk = {k:k, win:0}; }
    wk.win = (wk.win||0)+(n||0);
    ls("wkDone", wk);
  }

  function intoRetos(box){
    if(!box) return;
    box.innerHTML = "";
    var d = document.createElement("div");
    d.className = "perf-sec evts";
    d.innerHTML = '<div class="ps-t">\u{1F4C5} Retos de la semana</div>';
    retos().forEach(function(r){
      var row = document.createElement("div");
      row.className = "wkr-row"+(r.ok?" ok":"");
      row.innerHTML = '<span class="st">'+(r.ok?"\u2713":r.ic)+'</span><span class="lt">'+r.t+
        '</span><span class="st">'+(r.want>0?Math.min(r.need,r.want)+"/"+r.want:(r.ok?"\u2713":"\u2014"))+'</span>';
      d.appendChild(row);
    });
    box.appendChild(d);
    box.style.display = "";
  }

  var OMK = [
    { grade:"\u5927\u5409", t:"Gran Fortuna", m:"El drag\u00F3n sonr\u00EDe: hoy tu combo brillar\u00E1 un poco m\u00E1s. Apunta alto y fluye." },
    { grade:"\u4E2D\u5409", t:"Fortuna Media", m:"D\u00EDa equilibrado. Cierra los ojos un segundo antes de cada objetivo." },
    { grade:"\u5C0F\u5409", t:"Fortuna Peque\u00F1a", m:"Los esp\u00EDritus soplan suave hoy. Juega con calma y la suerte llegar\u00E1 sola." },
    { grade:"\u5F8C\u5409", t:"Suerte Tard\u00EDa", m:"El primer intento ser\u00E1 el espejismo. Respira: la victoria llega al segundo." },
    { grade:"\u51F6", t:"Suerte Dif\u00EDcil", m:"Nian ronda tu sombra. No te rindas: hasta el drag\u00F3n m\u00E1s fiero cay\u00F3 ante la constancia." },
    { grade:"\u5927\u51F6", t:"Gran Dificultad", m:"Hoy el r\u00EDo baja torrente. Si caes, ser\u00E1 solo el empuj\u00F3n para volar." }
  ];

  function fortune(){
    var rnd = mulberry32(dayIndex(new Date())*104729 + 7);
    var idx = Math.floor(rnd()*OMK.length);
    return OMK[idx];
  }

  function intoFortune(box){
    if(!box) return;
    box.innerHTML = "";
    var d = document.createElement("div");
    d.className = "perf-sec evts";
    d.innerHTML = '<div class="ps-t">\u{1F3D5} Omikuji de hoy</div>';
    var o = fortune();
    var w = document.createElement("div");
    w.className = "omk";
    w.innerHTML = '<div class="ot">'+o.grade+' \u2014 '+o.t+'</div><div class="od">'+o.m+'</div>';
    d.appendChild(w);
    box.appendChild(d);
    box.style.display = "";
  }

  window.Wk = { retos: retos, intoRetos: intoRetos, intoFortune: intoFortune, fortune: fortune, addWinCount: addWinCount };
})();