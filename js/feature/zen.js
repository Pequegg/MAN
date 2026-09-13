/* Op-Art Fan - Modo Zen "El Río" (modulo lazy). Nivel fabricado registrado en
   dailyDef (sin tocar core) + boton en el menu. El wrapper de features.js
   marca _featMode="zen" para que pushScore no contamine el ranking. */
(function(){
  "use strict";

  function zenLevel(){
    var prev = (typeof pb!=="undefined" && pb) ? (pb["zen"]||0) : 0;
    return {
      id:"zen", name:"Zen · El Río", boss:false,
      c:["#daf6e5","#7fdea8","#1f9d63","#0e5c3a","#f2fff7"], bg:"#03180d", target:"#baffdc",
      goal: Math.max(prev+300, 900), time: 90, interval: 1.0, simul: 1, wind: 0.06, osc: 0.6,
      trap: 0, gold: 0.08, pt:"wave", bd:"clouds", dec:"smoke", bhv:"swing"
    };
  }

  function startZen(){
    try{ ensureAudio(); }catch(e){}
    dailyDef["zen"] = zenLevel();
    startGame("zen");
  }

  function btn(ref){
    if(!ref || document.getElementById("btnZen")) return;
    var b = document.createElement("button");
    b.className = "menu-btn";
    b.id = "btnZen";
    b.innerHTML = '<span class="ico">&#x1F9D8;</span><span class="grow"><div>Zen · El Río</div><div class="desc">Sin fin: fluye y busca tu récord</div></span><span class="sub">&gt;</span>';
    b.addEventListener("click", function(){ try{ sfxClick(); }catch(e){} startZen(); });
    ref.parentNode.insertBefore(b, ref);
  }

  function line(res){
    if(!res || !res.levelObj || res.levelObj.id!=="zen") return null;
    return res.won ? "\u{1F30A} Zen: superaste tu r\u00E9cord en el R\u00EDo." : "\u{1F30A} Zen: se acab\u00F3 el tiempo. Respira y vuelve.";
  }

  window.Zen = { start: startZen, btn: btn, line: line, level: zenLevel };

  /* autoclocacion: si el boton Perfil ya existe, ubicarnos antes que el */
  try{
    var ref = document.getElementById("btnPerfil");
    if(ref) btn(ref);
  }catch(e){}
})();