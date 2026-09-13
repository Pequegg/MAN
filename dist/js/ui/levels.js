/* Op-Art Fan - modulo: js/ui/levels.js */

"use strict";

/* ---------- Pantalla de niveles ---------- */
function levelUnlocked(id){
  if(id===1) return true;
  if(id===18) return LEVELS.filter(function(l){return l.id<18;}).every(function(l){ return completed.indexOf(l.id)>-1; });
  if(completed.indexOf(id-1)>-1) return true;
  return false;
}
function renderLevels(){
  var eq = equipSummaryHtml(); $("equipSummary").innerHTML = eq;
  var list=$("levelList"); list.innerHTML="";
  LEVELS.forEach(function(lv){
    var unlocked = levelUnlocked(lv.id);
    var best = pb[lv.id]||0;
    var card=document.createElement("div");
    card.className="cell-card"+(unlocked?"":" locked");
    var grad="linear-gradient(135deg,"+lv.c[0]+","+lv.c[lv.c.length-1]+")";
    var badge = lv.boss ? '<span class="tag new">'+(lv.boss2?"JEFE 2":"JEFE")+'</span>' : "";
    var nm = lv.name + badge;
    var sd = unlocked ? (lv.boss ? ("Meta: "+lv.goal+" atrapadas \u00B7 "+lv.time+"s") : ("Meta: "+num(lv.goal)+" \u00B7 "+lv.time+"s")) : "Completa el nivel anterior";
    if(best>0) sd += (lv.boss?(" \u00B7 Récord: "+num(best)):(" \u00B7 Récord: "+num(best)));
    card.innerHTML='<div class="lvl-num" style="background:'+grad+'">'+lv.id+'</div>'+
      '<div class="meta"><div class="nm">'+nm+'</div><div class="sd">'+esc(sd)+'</div></div>'+
      (unlocked?'<span style="font-size:16px;color:var(--cyan);">\u25B6</span>':'\u{1F512}');
    if(unlocked){
      card.style.cursor="pointer";
      card.addEventListener("click", function(){
        ensureAudio(); sfxClick();
        if(lv.boss){ startGame(lv.id); } else { startGame(lv.id); }
      });
    }
    list.appendChild(card);
  });
}