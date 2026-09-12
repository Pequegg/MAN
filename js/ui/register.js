/* Op-Art Fan - modulo: js/ui/register.js */

"use strict";

/* ---------- Registro ---------- */
var selectedAvatar = profile.avatar || AVATARS[0];
function fillAvatars(){ var g=$("avatarGrid"); g.innerHTML=""; AVATARS.forEach(function(a){ var d=document.createElement("div"); d.className="avatar-box"+(a===selectedAvatar?" on":""); d.textContent=a; d.onclick=function(){ ensureAudio(); sfxClick(); selectedAvatar=a; g.querySelectorAll(".avatar-box").forEach(function(x){x.classList.remove("on");}); d.classList.add("on"); }; g.appendChild(d); }); }
function paintAuth(){
  var row=$("authRow"), st=$("authStatus"), txt=$("gBtnTxt");
  if(!row) return;
  if(typeof Auth==="undefined" || !Auth.isAuthed() || !Auth.uid()){
    row.style.display="flex";
    if(txt) txt.textContent="Continuar con Google (guarda tu progreso)";
    if(st) st.style.display="none";
    return;
  }
  row.style.display="none";
  if(st){
    st.style.display="block";
    st.innerHTML="\u2705 Sesión de Google conectada · tu progreso se guarda en la nube. <a href='#' id='signOutLink' style='color:var(--gold);'>salir</a>";
    var so=$("signOutLink");
    if(so) so.onclick=function(e){ e.preventDefault(); try{ Auth.signOut(); }catch(err){ location.reload(); } };
  }
}
$("googleBtn").addEventListener("click", function(){
  sfxClick();
  if(typeof Auth!=="undefined" && Auth.isAuthed() && Auth.uid()){ Auth.signOut(); return; }
  Auth.googleLogin();
});
$("registerBtn").addEventListener("click", function(){
  ensureAudio(); sfxClick();
  var n=$("nameInput").value.trim();
  if(!n){ toast("Escribe tu nombre o apodo primero","\u270B","err"); $("nameInput").focus(); return; }
  profile = {name:n.slice(0,16), avatar:selectedAvatar};
  saveAll(); saveArena();
  refreshMenu(); goMenu(); toast("¡Hola, "+esc(profile.name)+"!","\u{1F44B}");
  if(typeof Auth!=="undefined" && Auth.isAuthed() && Auth.uid()){ toast("Progreso guardado en tu cuenta Google","\u2601\uFE0F"); }
});
$("nameInput").addEventListener("keypress", function(e){ if(e.key==="Enter") $("registerBtn").click(); });