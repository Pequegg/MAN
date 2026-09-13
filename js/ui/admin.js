/* Op-Art Fan - modulo: js/ui/admin.js */

"use strict";

/* ---------- Panel de admin (produccion) ----------
   Solo visible si la sesion es admin (RPC is_admin server-side).
   Estadisticas del proyecto + otorgar monedas + aviso global. */
var AdminT=false;

function adminCheck(){
  var b=$("btnAdmin"); if(b) b.style.display="none";
  if(typeof Live==="undefined"||!Live.authed()) return;
  SupRemote.rpc("is_admin",{}).then(function(r){
    AdminT = r===true;
    if(b) b.style.display=AdminT?"flex":"none";
  }).catch(function(){});
}

function renderAdmin(){
  refreshMenuCoins();
  var off=$("adminOffNote");
  if(!Live.authed()){
    off.style.display="block";
    off.innerHTML="Para el panel admin necesitas <b>cuenta Google</b> y estar dado de alta en la tabla <code>admins</code> del proyecto Supabase.";
    return;
  }
  off.style.display="none";
  loadAdminStats();
  if(typeof window.RT!=="undefined" && RT.status) RT.status(function(c){ var a=$("adminRt"); if(a) a.textContent=c?"conectado ●":"sin websocket (polling)"; });
}
function loadAdminStats(){
  var el=$("adminStats"); if(!el) return;
  el.innerHTML='<div class="sub" style="padding:6px;">Cargando…</div>';
  SupRemote.rpc("admin_stats",{}).then(function(st){
    if(st.error){ el.innerHTML='<div class="sub" style="padding:6px; color:#ff8a7b;">'+esc(st.error)+'</div>'; return; }
    var stats=[
      ["👥 Usuarios", st.users||0],
      ["⚔️ Duelos (activos)", (st.duels||0)+" / abiertos "+(st.duelsOpen||0)],
      ["🔴 Salas (abiertas)", (st.rooms||0)+" / "+(st.roomsOpen||0)],
      ["🤝 Amistades", st.friends||0],
      ["🛒 Compras", st.purchases||0]
    ];
    var h='<div class="stat-grid">';
    stats.forEach(function(s){ h+='<div class="stat"><span>'+s[0]+'</span><b>'+s[1]+'</b></div>'; });
    h+='</div>';
    h+='<div style="font-weight:800; margin:10px 0 4px;">Top puntajes</div>';
    h+='<div style="font-size:12px; color:var(--dim);">'+(Array.isArray(st.topScores)&&st.topScores.length
      ? st.topScores.map(function(t,i){ return (i+1)+". <b>"+esc(t.n||"-")+"</b> · "+num(t.s||0); }).join('<br>')
      : "sin datos")+'</div>';
    if(st.notice){ h+='<div class="chip c-go" style="margin-top:8px;">Aviso activo: '+esc(st.notice)+'</div>'; }
    el.innerHTML=h;
  }).catch(function(e){ el.innerHTML='<div class="sub" style="padding:6px; color:#ff8a7b;">'+esc(e.message)+'</div>'; });
}

function adminGrant(){
  var code=($("adminGrantCode").value||"").trim().toUpperCase();
  var amt=parseInt($("adminGrantAmt").value,10);
  if(!code){ toast("Escribe un código amigo","\u{1F4AC}"); return; }
  if(!amt||isNaN(amt)){ toast("Cantidad inválida","","err"); return; }
  SupRemote.rpc("admin_grant",{p_code:code, p_amount:amt}).then(function(r){
    if(r.error) throw new Error(r.error);
    toast("OK: +"+amt+" a "+code+" => "+r.coins+" monedas","\u{1F4B0}");
    loadAdminStats();
  }).catch(function(e){ toast(e.message,"","err"); });
}
function adminPublishNotice(){
  var txt=($("adminNoticeIn").value||"").trim();
  SupRemote.rpc("admin_notice",{p_text:txt}).then(function(r){
    if(r.error) throw new Error(r.error);
    toast("Aviso "+(txt?"publicado":"borrado"),"\u{1F4E2}");
    if(window.RT&&RT.broadcast) RT.broadcast("realtime:public","notice",{text:txt});
    $("adminNoticeIn").value="";
    loadAdminStats();
  }).catch(function(e){ toast(e.message,"","err"); });
}

$("adminBack").addEventListener("click", function(){ sfxClick(); goMenu(); });
$("adminGrantBtn").addEventListener("click", function(){ ensureAudio(); sfxClick(); adminGrant(); });
$("adminNoticeBtn").addEventListener("click", function(){ ensureAudio(); sfxClick(); adminPublishNotice(); });
$("adminNoticeClear").addEventListener("click", function(){ ensureAudio(); $("adminNoticeIn").value=""; adminPublishNotice(); });