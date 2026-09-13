/* Op-Art Fan - modulo: js/ui/daily.js */

"use strict";

/* ---------- Desafío diario ---------- */
function renderDaily(){
  var d=dailyDef["daily"]; if(!d) return;
  $("dailyName").textContent="\u{1F4CD} "+d.name;
  $("dailyDesc").textContent="Meta de "+num(d.goal)+" en "+d.time+"s \u00B7 velocidad "+Math.round(100/d.interval)+"%";
  $("dailyGoal").textContent="Meta: "+num(d.goal);
  $("dailyTime").textContent="Tiempo: "+d.time+"s";
  $("dailySpeed").textContent="Ritmo: alto";
  var mine=ls("dailyBest")||{};
  var db=mine[todayKey()];
  var el=$("dailyPlay"); el.textContent = db!=null ? ("Volver a jugar (récord de hoy: "+num(db.score)+")") : "Jugar el desafío";
  var list=$("dailyRankList");
  var rows=localScores().filter(function(e){ return entryInRange(e,"hoy"); });
  var mergeAnd=function(src){
    var du={}; src.forEach(function(e){ if(!e.uid) return; if(!du[e.uid]||e.score>du[e.uid].score) du[e.uid]=e; });
    var merged=Object.keys(du).map(function(k){return du[k];});
    merged.sort(function(a,b){return b.score-a.score;});
    renderRankRows(list, merged.slice(0,20), uid());
  };
  if(SupRemote.on()){
    SupRemote.get("daily","date=eq."+SupRemote.enc(todayKey())+"&order=score.desc.nullslast&limit=40")
      .then(function(rem){ mergeAnd(rows.concat(rem||[])); })
      .catch(function(){ mergeAnd(rows); });
  } else {
    mergeAnd(rows);
  }
}
$("dailyPlay").addEventListener("click", function(){ ensureAudio(); sfxClick(); startGame("daily"); });