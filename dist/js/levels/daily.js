/* Op-Art Fan - modulo: js/levels/daily.js */

"use strict";

/* ---------- Desafío diario (semilla por fecha) ---------- */
var dailyDef = {};
function dailySeed(){ return todayKey().split("-").join(""); }
function generateDaily(){
  var s = Number(dailySeed()); var r = mulberry32(s + 12345);
  var themes = LEVELS.slice(0,15);
  var t = themes[Math.floor(r()*themes.length)];
  var goal = Math.round(900 + r()*(21000-900));
  var time = Math.round(28 + r()*(60-28));
  var interval = +(0.6 + r()*(1.4-0.6)).toFixed(2);
  var trap = +(r()*0.3).toFixed(2);
  var cols = t.c.slice().sort(function(){ return r()-0.5; });
  dailyDef["daily"] = {
    id:"daily", name:"Desafío del " + todayKey(), boss:false,
    c:cols, bg:t.bg, target:t.target, goal:goal, time:time, interval:interval, simul:Math.round(1+r()*3),
    wind:+(r()*0.5).toFixed(2), osc:+(0.6+r()*0.9).toFixed(2), trap:trap, gold:r()<0.3?0.07:0.05,
    pt:t.pt, bd:t.bd, dec:t.dec, bhv:t.bhv
  };
}