/* Op-Art Fan - modulo: js/ui/menu.js */

"use strict";

/* ---------- Menú ---------- */
function refreshMenu(){ $("menuAvatar").textContent = profile.avatar; $("menuName").textContent = profile.name; $("menuCoins").textContent = num(coins); paintToggle(); renderMenuStatus(); showAuthChip(); }
function showAuthChip(){
  var mc=$("menuCloud");
  if(mc) mc.style.display = (typeof Auth!=="undefined" && Auth.isAuthed && Auth.isAuthed() && Auth.uid()) ? "inline-flex" : "none";
}
function renderMenuStatus(){
  var tierEl=$("menuTier"), stEl=$("menuStreak");
  if(tierEl){ try{ var t=seasonTier(); tierEl.innerHTML=t.ico+" <b>"+esc(t.nm)+"</b> <span style='opacity:.7;font-weight:700;'>"+num(t.pts)+" pts</span>"; }catch(e){ tierEl.innerHTML="\u2728 Novato"; } }
  if(stEl){ try{ var s=dayStreak(); if(s>0){ stEl.style.display="inline-flex"; stEl.innerHTML="\u{1F525} <b>"+s+"</b> "+(s===1?"día":"días"); } else { stEl.style.display="none"; } }catch(e){} }
}
function refreshMenuCoins(){ $("menuCoins").textContent = num(coins); $("levelsCoins").textContent = num(coins); $("shopCoins").textContent = num(coins); }
$("btnPlay").addEventListener("click", function(){ sfxClick(); renderLevels(); refreshMenuCoins(); show("levels"); });
$("btnDaily").addEventListener("click", function(){ ensureAudio(); sfxClick(); unlock("diario"); generateDaily(); renderDaily(); show("daily"); });
$("btnShop").addEventListener("click", function(){ sfxClick(); renderShop(); show("shop"); });
$("btnAch").addEventListener("click", function(){ sfxClick(); renderAch(); show("ach"); });
$("btnRank").addEventListener("click", function(){ sfxClick(); openRanking(); show("rank"); });
$("btnCredits").addEventListener("click", function(){ sfxClick(); show("end"); });
$("levelsBack").onclick = $("shopBack").onclick = $("achBack").onclick = $("rankBack").onclick = $("dailyBack").onclick = function(){ sfxClick(); goMenu(); };

function itemInfo(id){ return ITEMS.find(function(i){return i.id===id;}); }
function equippedCounts(){ var map={}; equipped.forEach(function(id){ map[id]=(map[id]||0)+1; }); return map; }
function equipSummaryHtml(){ if(!equipped.length) return '<span class="chip">Equipo: ninguno</span>'; var h='<span class="chip">Equipo:</span>'; equipped.forEach(function(id){ var it=itemInfo(id); if(!it) return; h+=' <span class="chip">'+it.icon+' '+it.name+' x'+(inventory[id]||0)+'</span>'; }); return h; }