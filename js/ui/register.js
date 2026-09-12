/* Op-Art Fan - modulo: js/ui/register.js */

"use strict";

/* ---------- Registro ---------- */
var selectedAvatar = profile.avatar || AVATARS[0];
function fillAvatars(){ var g=$("avatarGrid"); g.innerHTML=""; AVATARS.forEach(function(a){ var d=document.createElement("div"); d.className="avatar-box"+(a===selectedAvatar?" on":""); d.textContent=a; d.onclick=function(){ ensureAudio(); sfxClick(); selectedAvatar=a; g.querySelectorAll(".avatar-box").forEach(function(x){x.classList.remove("on");}); d.classList.add("on"); }; g.appendChild(d); }); }
$("registerBtn").addEventListener("click", function(){
  ensureAudio(); sfxClick();
  var n=$("nameInput").value.trim();
  if(!n){ toast("Escribe tu nombre o apodo primero","\u270B","err"); $("nameInput").focus(); return; }
  profile = {name:n.slice(0,16), avatar:selectedAvatar};
  saveAll(); refreshMenu(); goMenu(); toast("¡Hola, "+esc(profile.name)+"!","\u{1F44B}");
});
$("nameInput").addEventListener("keypress", function(e){ if(e.key==="Enter") $("registerBtn").click(); });