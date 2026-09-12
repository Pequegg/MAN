/* Op-Art Fan - modulo: js/ui/rank.js */

"use strict";

/* ---------- Ranking (local + Firebase) ---------- */
var onlineRank=false, rankBusy=false;
function localScores(){ return ls("localScores")||[]; }
function saveLocalScores(a){ ls("localScores", a.slice(0,300)); }
function pushScore(entry){
  var a=localScores(); a.push(entry); saveLocalScores(a);
  if(FIREBASE_URL) postRemote(entry);
}
function postRemote(entry){
  try{
    var url=FIREBASE_URL.replace(/\/$/,"")+"/scores/"+uid()+".json";
    fetch(url,{method:"PUT",body:JSON.stringify(entry)}).catch(function(){});
  }catch(e){}
}
function fetchRemote(){ return new Promise(function(resolve){
  if(!FIREBASE_URL || rankBusy){ resolve([]); return; }
  rankBusy=true;
  var url=FIREBASE_URL.replace(/\/$/,"")+"/scores.json";
  fetch(url).then(function(r){ return r.json(); }).then(function(j){
    var out=[]; if(j){ Object.keys(j).forEach(function(k){ var v=j[k]; if(v && v.score!=null) out.push(v); }); }
    onlineRank=true; resolve(out);
  }).catch(function(){ resolve([]); }).then(function(){ rankBusy=false; });
}); }
function entryInRange(e, f){
  var d=new Date(e.ts);
  if(f==="hoy"){ return todayKey()=== (d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")); }
  if(f==="semana"){ var dd=new Date(); var day=(dd.getDay()+6)%7; var m=new Date(dd); m.setDate(dd.getDate()-day); m.setHours(0,0,0,0); return d.getTime()>=m.getTime(); }
  return true;
}
function renderRankRows(container, entries, meUid){
  if(!entries.length){ container.innerHTML='<div class="center sub" style="padding:20px; color:var(--dim);">Todavía no hay puntajes aquí. \u00A1Sé el primero!</div>'; return; }
  var h="";
  entries.forEach(function(e,i){
    var isMe = e.uid===meUid;
    h+='<div class="rank-row'+(isMe?" me":"")+'"><span class="rank-num med'+(i<3?i+1:"")+'">'+(i+1)+'</span><span class="rank-av">'+esc(e.avatar||"")+'</span><span class="rank-name">'+esc(e.name||"Anónimo")+(isMe?' <span class="tag rec">TÚ</span>':'')+'</span><span class="rank-score">'+num(e.score||0)+'</span></div>';
  });
  container.innerHTML=h;
}
function openRanking(){
  openRanking.filter = "siempre";
  paintRankFilters("siempre");
  loadRanking("siempre");
}
function paintRankFilters(f){ document.querySelectorAll("#screen-rank .fil").forEach(function(x){ x.classList.toggle("on", x.dataset.f===f); }); }
document.querySelectorAll("#screen-rank .fil").forEach(function(x){
  x.addEventListener("click", function(){ sfxClick(); var f=x.dataset.f; openRanking.filter=f; paintRankFilters(f); loadRanking(f); });
});
function loadRanking(f){
  $("rankList").innerHTML='<div class="center sub" style="padding:20px; color:var(--dim);">Cargando\u2026</div>';
  var all=localScores();
  fetchRemote().then(function(remote){
    all=all.concat(remote);
    var inRange=all.filter(function(e){ return e.uid && entryInRange(e,f); });
    var byUid={};
    inRange.forEach(function(e){ if(!byUid[e.uid] || (e.score||0)>(byUid[e.uid].score||0)) byUid[e.uid]=e; });
    var merged=Object.keys(byUid).map(function(k){return byUid[k];}).filter(function(e){ return entryInRange(e,f); });
    merged.sort(function(a,b){ return (b.score||0)-(a.score||0); });
    renderRankRows($("rankList"), merged.slice(0,20), uid());
    $("rankNote").innerHTML = onlineRank && FIREBASE_URL ? '' : '<div class="note-off">\u26A0 Modo sin conexión: el ranking es local a este dispositivo. Para el ranking online global, configura FIREBASE_URL (cerca del inicio del código).</div>';
  });
}