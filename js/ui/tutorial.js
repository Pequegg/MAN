/* Op-Art Fan - modulo: js/ui/tutorial.js */

"use strict";

/* ---------- Tutorial ---------- */
var tutSlide=0;
function showTut(){ var tls=document.querySelectorAll(".tut-slide"), ds=document.querySelectorAll(".dots span"); tls.forEach(function(x,i){x.classList.toggle("on",i===tutSlide);}); ds.forEach(function(x,i){x.classList.toggle("on",i===tutSlide);}); $("tutNext").textContent = tutSlide===2?"Empezar":"Continuar"; }
$("tutNext").addEventListener("click", function(){ ensureAudio(); sfxClick(); if(tutSlide>1){ finishIntro(); } else { tutSlide++; showTut(); } });
$("tutSkip").addEventListener("click", function(){ ensureAudio(); sfxClick(); finishIntro(); });
function finishIntro(){ introDone=true; saveAll(); show("register"); fillAvatars(); }