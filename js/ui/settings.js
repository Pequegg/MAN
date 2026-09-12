/* Op-Art Fan - modulo: js/ui/settings.js */

"use strict";

/* ---------- Ajustes ---------- */
function paintToggle(){ $("colorblindToggle").classList.toggle("on", !!settings.colorblind); }
$("colorblindToggle").addEventListener("click", function(){ settings.colorblind=!settings.colorblind; paintToggle(); saveAll(); toast(settings.colorblind?"Modo daltónico activado":"Modo daltónico desactivado","\u{1F441}"); });
function paintSound(){ $("soundToggle").classList.toggle("on", !muted); }
$("soundToggle").addEventListener("click", function(){
  muted=!muted; ls("muted",muted); paintSound();
  if(muted){ try{ if(MUSIC && MUSIC.stop) MUSIC.stop(); }catch(e){} }
  else { ensureAudio(); }
  toast(muted?"Sonido silenciado":"Sonido activado", muted?"\u{1F507}":"\u{1F50A}");
});
paintSound();