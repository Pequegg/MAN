/* Op-Art Fan - modulo: js/core/util.js */

"use strict";

var P = "opartfan:";
function ls(k, v){ if (v === undefined) { try { var s = localStorage.getItem(P+k); return s==null?null:JSON.parse(s);}catch(e){return null;} } try { localStorage.setItem(P+k, JSON.stringify(v)); }catch(e){} }
function uid(){ var au=(typeof Auth!=="undefined" && Auth.isAuthed && Auth.isAuthed()) ? Auth.uid() : null; if(au) return au; var u = ls("uid"); if (!u){ u = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2,10); ls("uid", u); } return u; }
var AVATARS = ["\u{1F98A}","\u{1F431}","\u{1F436}","\u{1F43C}","\u{1F438}","\u{1F984}","\u{1F419}","\u{1F916}","\u{1F60E}","\u{1F47D}"];
function todayKey(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function weekKey(){ var d=new Date(); var day=(d.getDay()+6)%7; var m=new Date(d); m.setDate(d.getDate()-day); m.setHours(0,0,0,0); return m.getTime(); }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function $(id){ return document.getElementById(id); }
function num(n){ return Math.floor(n).toLocaleString("es-ES"); }
function skel(n){ var h='<div class="skels">'; for(var i=0;i<n;i++) h+='<div class="skel"></div>'; return h+'</div>'; }