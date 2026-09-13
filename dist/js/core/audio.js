/* Op-Art Fan - modulo: js/core/audio.js */

"use strict";

/* ---------- Audio (Web Audio API) ---------- */
var AC=null, muted = ls("muted")||false;
function ensureAudio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==="suspended") AC.resume(); }
function tone(freq, dur, type, vol, slideTo){ if(!AC || muted) return; try{ var t0=AC.currentTime; var o=AC.createOscillator(), g=AC.createGain(); o.type=type||"square"; o.frequency.setValueAtTime(freq,t0); if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0+dur); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol||0.15,t0+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0+dur+0.02);}catch(e){} }
function sfxHit(combo){ tone(440+Math.min(combo,20)*28, .09, "square", .12, 660+Math.min(combo,20)*20); if(combo>=8){ sndPlay("combo"); } else { sndPlay("hit"); } }
function sfxGold(){ tone(660,.08,"triangle",.16); setTimeout(function(){ tone(880,.08,"triangle",.16); },70); setTimeout(function(){ tone(1320,.1,"triangle",.14); },140); sndPlay("gold"); }
function sfxMiss(){ tone(180,.18,"sawtooth",.16,90); sndPlay("miss"); }
function sfxTrap(){ tone(150,.25,"sawtooth",.18,60); tone(90,.3,"square",.14,50); sndPlay("trap"); }
function sfxWin(){ [523,659,784,1046].forEach(function(f,i){ setTimeout(function(){ tone(f,.14,"triangle",.16); }, i*110); }); sndPlay("ach"); }
function sfxLose(){ [330,262,196].forEach(function(f,i){ setTimeout(function(){ tone(f,.18,"sawtooth",.14); }, i*130); }); sndPlay("miss"); }
function sfxClick(){ tone(700,.05,"square",.07); }
var _mr=null;
function _reduceMotion(){ if(_mr===null){ try{ _mr = typeof matchMedia!=="undefined" && !!matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ _mr=false; } } return _mr; }
function vibrate(p){ if(_reduceMotion() || !navigator.vibrate) return; try{ navigator.vibrate(p); }catch(e){} }
function hapticTick(){ vibrate(6); }
document.addEventListener("pointerdown", function(ev){
  ensureAudio();
  if(ev && ev.target && ev.target.closest){ var t=ev.target.closest(".btn,.menu-btn,.tab,.fil,.back"); if(t) hapticTick(); }
}, {passive:true});