/* Op-Art Fan - modulo: js/ui/menu.js */

"use strict";

/* ---------- Menú ---------- */
function refreshMenu(){
  var av=$("menuAvatar"); av.textContent=profile.avatar;
  var fr=frameById(activeFrame);
  av.className="big-avatar"+(fr.cls?" "+fr.cls:"");
  $("menuName").textContent=profile.name;
  $("menuTitle").textContent=titleById(activeTitle).name;
  var mm=$("menuMascot"); if(mm){ mm.style.display=activeMascot?"inline-flex":"none"; mm.textContent=(mascotById(activeMascot)||{}).icon||""; }
  $("menuCoins").textContent=num(coins); paintToggle(); renderMenuStatus(); showAuthChip();
  if(typeof adminCheck==="function"){ try{ adminCheck(); }catch(e){} }
}
$("menuMascot").addEventListener("click", function(){ ensureAudio(); sfxClick(); var f=mascotPhrase(activeMascot); if(f) toast(f, mascotById(activeMascot).icon); });
function showAuthChip(){
  var mc=$("menuCloud");
  if(mc) mc.style.display = (typeof Auth!=="undefined" && Auth.isAuthed && Auth.isAuthed() && Auth.uid()) ? "inline-flex" : "none";
}
function renderMenuStatus(){
  var tierEl=$("menuTier"), stEl=$("menuStreak");
  if(tierEl){ try{ var t=seasonTier(); tierEl.innerHTML=t.ico+" <b>"+esc(t.nm)+"</b> <span style='opacity:.7;font-weight:700;'>"+num(t.pts)+" pts</span>"; }catch(e){ tierEl.innerHTML="\u2728 Novato"; } }
  if(stEl){ try{ var s=dayStreak(); if(s>0){ stEl.style.display="inline-flex"; stEl.innerHTML="\u{1F525} <b>"+s+"</b> "+(s===1?"día":"días"); } else { stEl.style.display="none"; } }catch(e){} }
}
function refreshMenuCoins(){ $("menuCoins").textContent = num(coins); $("levelsCoins").textContent = num(coins); $("shopCoins").textContent = num(coins); var dc=$("duelCoins"); if(dc) dc.textContent=num(coins); var ac=$("armCoins"); if(ac) ac.textContent=num(coins); var rc=$("arenaCoins"); if(rc) rc.textContent=num(coins); var lc=$("liveCoins"); if(lc) lc.textContent=num(coins); }
$("btnPlay").addEventListener("click", function(){ sfxClick(); renderLevels(); refreshMenuCoins(); show("levels"); });
$("btnDaily").addEventListener("click", function(){ ensureAudio(); sfxClick(); unlock("diario"); generateDaily(); renderDaily(); show("daily"); });
$("btnShop").addEventListener("click", function(){ sfxClick(); renderShop(); show("shop"); });
$("btnAch").addEventListener("click", function(){ sfxClick(); renderAch(); show("ach"); });
$("btnRank").addEventListener("click", function(){ sfxClick(); openRanking(); show("rank"); });
$("btnArmario").addEventListener("click", function(){ sfxClick(); renderArmario(); refreshMenuCoins(); show("armario"); });
$("btnDuel").addEventListener("click", function(){ sfxClick(); renderDuel(); show("duel"); });
$("btnLive").addEventListener("click", function(){ sfxClick(); renderLive(); show("live"); });
$("btnNotix").addEventListener("click", function(){ sfxClick(); renderNotix(); show("notix"); });
$("btnAdmin").addEventListener("click", function(){ sfxClick(); renderAdmin(); show("admin"); });
$("btnCredits").addEventListener("click", function(){ sfxClick(); show("end"); });
$("levelsBack").onclick = $("shopBack").onclick = $("achBack").onclick = $("rankBack").onclick = $("dailyBack").onclick = function(){ sfxClick(); goMenu(); };

function itemInfo(id){ return ITEMS.find(function(i){return i.id===id;}); }
function equippedCounts(){ var map={}; equipped.forEach(function(id){ map[id]=(map[id]||0)+1; }); return map; }
function equipSummaryHtml(){ if(!equipped.length) return '<span class="chip">Equipo: ninguno</span>'; var h='<span class="chip">Equipo:</span>'; equipped.forEach(function(id){ var it=itemInfo(id); if(!it) return; h+=' <span class="chip">'+it.icon+' '+it.name+' x'+(inventory[id]||0)+'</span>'; }); return h; }