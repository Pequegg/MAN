/* Op-Art Fan - modulo: js/core/state.js */

"use strict";

/* ---------- Estado global ---------- */
var profile = ls("profile") || {name:"", avatar:AVATARS[0]};
var coins = ls("coins") || 0;
var inventory = ls("inventory") || {};
var equipped = ls("equipped") || [];
var completed = ls("completed") || [];
var pb = ls("pb") || {};
var achievements = ls("achievements") || [];
var totalEarned = ls("totalEarned") || 0;
var ownedSkins = ls("ownedSkins") || [];
var activeSkin = ls("activeSkin") || "clasico";
var settings = ls("settings") || {colorblind:false};
var introDone = ls("introDone") || false;
var introDoneKey = "introDone";
var session = { activeNow:[], usedRevive:false, lastIn:0 };
function saveAll(){ ls("profile",profile); ls("coins",coins); ls("inventory",inventory); ls("equipped",equipped); ls("completed",completed); ls("pb",pb); ls("achievements",achievements); ls("totalEarned",totalEarned); ls("ownedSkins",ownedSkins); ls("activeSkin",activeSkin); ls("settings",settings); ls("introDone",introDone); if(typeof Db!=="undefined" && Db.queueSync) Db.queueSync(); }

/* ---------- Toasts ---------- */
function toast(msg, ico, cls, ms){ var t=document.createElement("div"); t.className="toast"+(cls?" "+cls:""); t.innerHTML="<span class='t-ico'>"+(ico||"")+"</span><span>"+msg+"</span>"; $("toasts").appendChild(t); setTimeout(function(){ t.classList.add("out"); setTimeout(function(){ t.remove(); },320); }, ms||2600); }
function unlock(id){ if(achievements.indexOf(id)>-1) return; achievements.push(id); saveAll(); var a = ACH.find(function(x){return x.id===id;}); if(a){ sndPlay("ach"); toast("<b>¡Logro desbloqueado!</b> "+esc(a.name), a.icon, "ach", 3800); } }
function flash(kind){ var f=$("flashOverlay"); f.className=kind||""; f.classList.add("on"); setTimeout(function(){ f.classList.remove("on"); }, kind==="gold"?500:250); }
function bump(){ var c=$("comboBadge"); c.classList.add("bump"); setTimeout(function(){ c.classList.remove("bump"); },130); }

var lastCompletedNormal = (function(){ var m=0; completed.forEach(function(c){ if(c<18 && c>m) m=c; }); return m; })();