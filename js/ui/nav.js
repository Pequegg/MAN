/* Op-Art Fan - modulo: js/ui/nav.js */

"use strict";

/* ---------- Navegación / pantallas ---------- */
var screens = ["tutorial","register","menu","levels","shop","ach","rank","daily","arena","aresult","duel","live","notix","admin","game","result","end"];
var _mv=null;
function mvOK(){ if(_mv!==null) return _mv; try{ _mv = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }catch(e){ _mv=true; } return _mv; }
function show(name){
  var prev=null;
  screens.forEach(function(s){ var el=$("screen-"+s); if(!el) return; var on=el.classList.contains("on"); if(on) prev=s; el.classList.toggle("on", s===name); });
  var el=$("screen-"+name);
  if(!el) return;
  el.scrollTop=0;
  if(prev && prev!==name){
    if(mvOK()){
      el.dataset["dir"] = screens.indexOf(name) > screens.indexOf(prev) ? "in" : "back";
      el.classList.remove("ent"); void el.offsetWidth; el.classList.add("ent");
    } else { el.classList.remove("ent"); }
  }
}
function goMenu(){ show("menu"); refreshMenuCoins(); refreshDuelBadge(); if(typeof Nx!=="undefined"&&Nx.renderNxBadge){ try{ Nx.renderNxBadge(); }catch(e){} } }
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
  // Realtime: socket + canal publico (avisos globales) en segundo plano
  try{
    if(typeof RT!=="undefined"){
      if(RT.boot) RT.boot();
      if(RT.sub) RT.sub("realtime:public", function(m){
        if(m && m.broadcast && m.event==="notice" && m.payload && m.payload.text
           && typeof Nx!=="undefined" && Nx.push){ Nx.push("notice", m.payload.text, "\u{1F4E2}"); }
      });
    }
    if(typeof Nx!=="undefined" && Nx.renderNxBadge) Nx.renderNxBadge();
  }catch(e){}
  Auth.boot(finishBoot);
}
window.addEventListener("load", boot);