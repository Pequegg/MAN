/* Op-Art Fan - modulo: js/ui/end.js */

"use strict";

/* ---------- Créditos finales ---------- */
function renderEnd(lv){
  $("endIco").textContent = lv && lv.boss2 ? "\u{1F525}" : "\u{1F3EE}";
  $("endHead").textContent = lv && lv.boss2 ? "¡VENCISTE A NIAN! LA LEYENDA DEL ABANICO TERMINA" : "¡JUGADOR LEGENDARIO DEL ABANICO!";
  $("endName").textContent = profile.name;
  $("endName2").textContent = profile.name;
  toast("\u{1F451} ¡Felicidades, "+esc(profile.name)+"!", "\u{1F38A}", "ach", 5000);
}
$("endMenu").addEventListener("click", function(){ ensureAudio(); sfxClick(); goMenu(); });