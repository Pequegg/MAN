/* Op-Art Fan - modulo: js/ui/results.js */

"use strict";

/* ---------- Resultados ---------- */
var lastResult=null;
function showResult(res){
  lastResult=res;
  var lv=res.levelObj; var name=lv?lv.name:res.dailyName;
  var ico, head, sub;
  if(res.bossWon){ ico="\u{1F47B}"; }
  else if(res.won){ ico="\u{1F389}"; }
  else { ico="\u{1F62D}"; }
  head = res.won ? "¡Nivel completado!" : "Se acabó el tiempo";
  if(res.bossWon){ head = lv.boss2 ? "¡"+lv.name+" vencido! CONSEGUISTE TODO" : "¡"+lv.name+" vencido! Juego completado"; }
  sub = res.won ? "Has alcanzado la meta" : "La meta era "+num(res.goal);
  $("resIco").textContent=ico;
  $("resHead").textContent=head;
  $("resSub").textContent=sub;
  $("resScore").textContent=num(res.score);
  $("resRecord").style.display = res.newRecord ? "block" : "none";
  $("resGoal").textContent=num(res.goal);
  $("resCombo").textContent="x"+res.bestCombo;
  $("resFails").textContent=res.fails;
  $("resCoins").textContent="+ "+num(res.coinsGained);
  var line="";
  if(res.won){
    if(res.unlockedNext){ line="\u{1F513} ¡Desbloqueaste el nivel "+res.nextId+"!"; }
    if(lv && lv.id>=17 && res.firstTime){ line+=" \u{1F3C6} ¡Juego completado!"; }
    if(res.isDaily){ line="\u{1F5D3} Desafío diario completado."; }
  } else {
    if(res.reviveUsed){ line="\u{1F4AB} El Revivir te dio segundos extra."; }
  }
  $("resLevelLine").textContent=line;
  showNextBtn(res);
  var share="\u{1F3AE} Op-Art Fan \u{2014} "+ (lv?name:"Desafío diario") +"\n\u{1F3AF} Puntaje: "+num(res.score)+"\u{2B50} Combo: x"+res.bestCombo;
  $("shareText").value=share;
  show("result");
}
function showNextBtn(res){
  var btn=$("resNext");
  var lv=res.levelObj;
  if(res.isDaily || !lv || (lv.boss2 && res.won)){
    btn.textContent = res.won && lv && (lv.id===17 || lv.id===18) ? "\u{1F451} Créditos" : "Menú \u25B6";
    $("resRetry").textContent = res.isDaily ? "\u{21BB} Reintentar" : "\u{21BB} Reintentar";
    if(btn.textContent.indexOf("Créditos")>-1){ btn.style.display="flex"; } else { btn.style.display="flex"; }
    return;
  }
  if(lv && res.won && lv.id<18 && levelUnlocked(lv.id+1)){
    btn.textContent="Siguiente \u25B6";
  } else if(lv && lv.id<18){
    btn.textContent = res.won ? "Siguiente \u25B6" : "Reintentar \u25B6";
  } else {
    btn.textContent="Menú \u25B6";
  }
}
$("resRetry").addEventListener("click", function(){
  ensureAudio(); sfxClick();
  if(lastResult && lastResult.isDaily) startGame("daily");
  else if(lastResult && lastResult.levelId!=null) startGame(lastResult.levelId);
  else goMenu();
});
$("resNext").addEventListener("click", function(){
  ensureAudio(); sfxClick();
  var res=lastResult; if(!res) return;
  var lv=res.levelObj;
  if(res.isDaily || !lv){ goMenu(); return; }
  if(res.won && (lv.id===17||lv.id===18)){ renderEnd(lv); show("end"); return; }
  if(res.won && lv.id<18 && levelUnlocked(lv.id+1)){ startGame(lv.id+1); return; }
  startGame(lv.id);
});
$("resMenu").addEventListener("click", function(){ ensureAudio(); sfxClick(); goMenu(); });
$("resShare").addEventListener("click", function(){
  ensureAudio();
  var txt=$("shareText").value;
  function done(){ toast("Puntaje compartido","\u{1F4AC}"); }
  if(navigator.share && navigator.canShare && navigator.canShare({text:txt})){ navigator.share({title:"Op-Art Fan", text:txt}).then(done).catch(function(){}); }
  else if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done).catch(function(){ showShareFallback(); }); }
  else { showShareFallback(); }
});
function showShareFallback(){
  var t=$("shareText"); t.style.display="block"; t.focus(); t.select(); toast("Copia el texto de abajo","\u{1F4CB}",null,2500);
}