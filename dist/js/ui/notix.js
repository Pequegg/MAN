/* Op-Art Fan - modulo: js/ui/notix.js */

"use strict";

/* ---------- Avisos in-app (campana) ---------- */
var Nx=(function(){
  var KEY="nxlist";
  function all(){ try{ var v=ls(KEY); return v?JSON.parse(v):[]; }catch(e){ return []; } }
  function save(a){ ls(KEY, JSON.stringify(a.slice(0,80))); }
  function push(type, text, ico, data){
    var a=all();
    a.unshift({type:type||"info", text:String(text||""), ico:ico||"", at:Date.now(), read:false, data:data||{}});
    save(a);
    try{ renderNxBadge(); }catch(e){}
    try{ if(window.sfxClick) sfxClick(); }catch(e){}
    return a[0];
  }
  function unread(){ return all().filter(function(n){ return !n.read; }).length; }
  function renderNxBadge(){
    var b=$("notixBadge"); if(!b) return;
    var n=unread();
    b.textContent=n||0;
    b.style.display=n>0?"inline-flex":"none";
  }
  function clear(){
    ls(KEY,"");
    renderNxBadge();
  }
  function render(){
    renderNxBadge();
    var listEl=$("notixList"); if(!listEl) return;
    var a=all();
    a.forEach(function(n){ n.read=true; });
    save(a); renderNxBadge();
    if(!a.length){ listEl.innerHTML='<div class="sub" style="padding:6px;">Sin avisos por ahora.</div>'; return; }
    listEl.innerHTML="";
    a.forEach(function(n){
      var row=document.createElement("div");
      row.className="duel-row";
      row.innerHTML='<div class="row" style="gap:10px; align-items:center; padding:8px 6px;">'+
        '<span class="big-avatar sm">'+(n.ico||"\u{1F4DD}")+'</span>'+
        '<div class="grow">'+
          '<div style="font-weight:700; font-size:13px;">'+esc(n.text)+'</div>'+
          '<div class="sd" style="font-size:11px; color:var(--dim);">'+fmtTime(n.at)+'</div>'+
        '</div></div>';
      listEl.appendChild(row);
    });
    renderLiveWs();
  }
  function renderLiveWs(){ /* place holder para el estado RT */ }
  function fmtTime(ts){
    var d=new Date(ts), h=d.getHours(), m=d.getMinutes();
    return ("0"+h).slice(-2)+":"+("0"+m).slice(-2);
  }
  return {all:all, push:push, unread:unread, renderNxBadge:renderNxBadge, render:render, clear:clear};
})();

function renderNotix(){ Nx.render(); refreshMenuCoins(); }

$("notixBack").addEventListener("click", function(){ sfxClick(); goMenu(); });
$("notixClear").addEventListener("click", function(){ sfxClick(); Nx.clear(); Nx.render(); });