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
  // remoto diario
  if(FIREBASE_URL){
    var url=FIREBASE_URL.replace(/\/$/,"")+"/daily/"+todayKey()+".json";
    fetch(url).then(function(r){return r.json();}).then(function(j){
      if(j){ Object.keys(j).forEach(function(k){ var v=j[k]; if(v&&v.score!=null) rows.push(v); }); }
      var du={}; rows.forEach(function(e){ if(!e.uid) return; if(!du[e.uid]||e.score>du[e.uid].score) du[e.uid]=e; });
      var merged=Object.keys(du).map(function(k){return du[k];});
      merged.sort(function(a,b){return b.score-a.score;});
      renderRankRows(list, merged.slice(0,20), uid());
    }).catch(function(){ rows.sort(function(a,b){return b.score-a.score;}); renderRankRows(list, rows.slice(0,20), uid()); });
  } else {
    var du2={}; rows.forEach(function(e){ if(!e.uid) return; if(!du2[e.uid]||e.score>du2[e.uid].score) du2[e.uid]=e; });
    var merged2=Object.keys(du2).map(function(k){return du2[k];});
    merged2.sort(function(a,b){return b.score-a.score;});
    renderRankRows(list, merged2.slice(0,20), uid());
  }
}
$("dailyPlay").addEventListener("click", function(){ ensureAudio(); sfxClick(); startGame("daily"); });