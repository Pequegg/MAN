/* Op-Art Fan - modulo: js/ui/nav.js */

"use strict";

/* ---------- Navegación / pantallas ---------- */
var screens = ["tutorial","register","menu","levels","shop","ach","rank","daily","arena","aresult","duel","game","result","end"];
function show(name){ screens.forEach(function(s){ $("screen-"+s).classList.toggle("on", s===name); }); var el=$("screen-"+name); if(el) el.scrollTop=0; }
function goMenu(){ show("menu"); refreshMenuCoins(); refreshDuelBadge(); }
function refreshDuelBadge(){
  var badge=$("duelBadge");
  if(!badge) return;
  if(typeof Duel==="undefined" || !Duel.authed()){ badge.style.display="none"; return; }
  Duel.list().then(function(ds){
    var pending=(ds||[]).filter(function(d){ return Duel.canPlay(d); }).length;
    badge.textContent=pending||0;
    badge.style.display=pending>0?"inline-flex":"none";
  }).catch(function(){ badge.style.display="none"; });
}

function finishBoot(){
  if(!introDone){ tutSlide=0; showTut(); show("tutorial"); }
  else if(!profile.name){ selectedAvatar=profile.avatar||AVATARS[0]; $("nameInput").value=""; paintAuth(); show("register"); }
  else { refreshMenu(); goMenu(); showAuthChip(); }
}
function boot(){
  // activos: plan + pantalla de carga + precarga progresiva sin bloquear
  try{
    AssetBank.plan();
    afnShow(0.02, "Preparando…");
    if (AssetBank.demand) {
      AssetBank.demand([1,2,3]);
      var firstDone=false, tStart=Date.now(), iv=setInterval(function(){
        var ok=true;
        for(var i=1;i<=3;i++){ if(!AssetBank.has(CASETS.bg[i])) ok=false; }
        if(ok || Date.now()-tStart>5000){
          clearInterval(iv);
          if(!firstDone){ firstDone=true; afnHide(); AssetBank.demand([4,5,6]); }
        }
      },80);
    } else { afnHide(); }
  }catch(e){ try{ afnHide(); }catch(_){} }
  fillAvatars();
  generateDaily();
  Auth.boot(finishBoot);
}
window.addEventListener("load", boot);