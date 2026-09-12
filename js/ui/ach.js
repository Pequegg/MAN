/* Op-Art Fan - modulo: js/ui/ach.js */

"use strict";

/* ---------- Logros ---------- */
function renderAch(){
  $("achCount").textContent = achievements.length+"/"+ACH.length;
  var list=$("achList"); list.innerHTML="";
  ACH.forEach(function(a){
    var u = achievements.indexOf(a.id)>-1;
    var c=document.createElement("div");
    c.className="cell-card ach-card"+(u?"":" locked");
    c.innerHTML='<div class="ach-medal">'+a.icon+'</div><div class="meta"><div class="nm">'+a.name+'</div><div class="sd">'+esc(a.desc)+'</div></div>'+(u?'<span style="color:var(--gold); font-weight:900;">\u2713</span>':'<span style="color:var(--dim);">\u{1F512}</span>');
    list.appendChild(c);
  });
}