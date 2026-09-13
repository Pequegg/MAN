/* Op-Art Fan - modulo: js/ui/duel.js */

"use strict";

/* ---------- Pantalla de duelos ---------- */
var _duels=null;

function renderDuelLevels(){
  var sel=$("duelLevel");
  if(!sel) return;
  var opts=LEVELS.filter(function(l){ return !l.boss; });
  if(sel.options.length===opts.length) return;
  sel.innerHTML="";
  opts.forEach(function(l){
    var o=document.createElement("option");
    o.value=l.id; o.textContent="Nivel "+l.id+" – "+l.name;
    sel.appendChild(o);
  });
}

function renderDuel(){
  renderDuelLevels();
  refreshMenuCoins();
  var off=$("duelOffNote");
  if(!Duel.authed()){
    off.style.display="block";
    off.innerHTML="Para los duelos necesitas <b>cuenta Google</b> (botón del registro). Así tus amigos y retos viajan contigo."+
      "<br><button class='btn small gold' id='duelGoGoogle' style='margin-top:8px;'>Iniciar sesión</button>";
    var g=$("duelGoGoogle"); if(g){ g.onclick=function(){ if(window.Auth&&Auth.login) Auth.login(); }; }
    $("duelCodePanel").style.display="none";
    $("duelFriendsPanel").style.display="none";
    $("duelList").innerHTML="";
    $("duelBadge").style.display="none";
    return;
  }
  off.style.display="none";
  $("duelCodePanel").style.display="block";
  $("duelFriendsPanel").style.display="block";
  var codeEl=$("duelMyCode");
  if(codeEl) codeEl.textContent="…";
  Duel.myCode().then(function(c){ if(codeEl) codeEl.textContent=c; }).catch(function(){});
  loadDuelFriends();
  loadDuelList();
}

function loadDuelFriends(){
  var listEl=$("duelFriendsList"); if(!listEl) return;
  listEl.innerHTML='<div class="sub" style="padding:6px;">Cargando…</div>';
  Duel.friends().then(function(fr){
    var cnt=$("duelFriendsCount"); if(cnt) cnt.textContent=fr.length;
    if(!fr.length){ listEl.innerHTML='<div class="sub" style="padding:6px;">Aún no tienes amigos. Agrega su código arriba.</div>'; return; }
    listEl.innerHTML="";
    fr.forEach(function(f){
      var btn=document.createElement("button");
      btn.className="btn small pink";
      btn.textContent="\u2694\uFE0F Retar";
      btn.onclick=function(){ duelRetar(f); };
      var row=document.createElement("div");
      row.className="friend-row";
      row.innerHTML='<span class="big-avatar sm">'+(f.avatar||"\u{1F464}")+'</span>'+
        '<span class="grow" style="font-weight:800;">'+esc(f.name||"Amigo")+'</span>';
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }).catch(function(e){
    listEl.innerHTML='<div class="sub" style="padding:6px; color:#ff8a7b;">'+esc(e.message)+'</div>';
  });
}

function duelRetar(f){
  var sel=$("duelLevel"); var lv=parseInt(sel?sel.value:"1",10)||1;
  Duel.create(f, lv).then(function(id){
    toast("Reto creado. ¡Juega tu lado!","\u2694\uFE0F");
    loadDuelList();
    setTimeout(function(){ session.duel={id:id, at:Date.now()}; startGame(lv); }, 350);
  }).catch(function(e){ toast(e.message,"","err"); });
}

function duelPlay(id){
  var d=(_duels||[]).find(function(x){ return x.id===id; });
  if(!d) return;
  session.duel={id:id, at:Date.now()};
  startGame(d.level_id);
}

function loadDuelList(){
  var listEl=$("duelList"); if(!listEl) return;
  listEl.innerHTML='<div class="sub" style="padding:6px;">Cargando…</div>';
  Duel.list().then(function(ds){
    _duels=ds||[];
    var badge=$("duelBadge");
    var pending=(ds||[]).filter(function(d){ return Duel.canPlay(d); }).length;
    if(badge){ badge.textContent=pending||0; badge.style.display = pending>0?"inline-flex":"none"; }
    listEl.innerHTML="";
    if(!ds||!ds.length){ listEl.innerHTML='<div class="sub" style="padding:6px;">Sin duelos todavía. Reta a un amigo \u2191</div>'; return; }
    var oppUids=[];
    ds.forEach(function(d){ var o=Duel.opponent(d); if(o) oppUids.push(o); });
    oppUids=oppUids.filter(function(x,i){ return oppUids.indexOf(x)===i; });
    var names={};
    if(oppUids.length){
      SupRemote.get("users","uid=in.("+oppUids.map(SupRemote.enc).join(",")+")&select=uid,profile").then(function(rows){
        (rows||[]).forEach(function(r){ if(r&&r.profile) names[r.uid]={name:r.profile.name||"", avatar:r.profile.avatar||""}; });
        ds.forEach(function(d){ renderDuelRow(d,names); });
      }).catch(function(){ ds.forEach(function(d){ renderDuelRow(d,names); }); });
    } else {
      ds.forEach(function(d){ renderDuelRow(d,names); });
    }
  }).catch(function(e){
    listEl.innerHTML='<div class="sub" style="padding:6px; color:#ff8a7b;">'+esc(e.message)+'</div>';
  });
}

function renderDuelRow(d,names){
  var listEl=$("duelList"); if(!listEl) return;
  var opp=Duel.opponent(d);
  var info=names[opp]||{name:"…", avatar:""};
  var lv=levelDef(d.level_id);
  var row=document.createElement("div");
  row.className="duel-row";
  var stateTxt, stateCls="", action="";
  if(d.status==="finished"){
    var on=Duel.iWon(d);
    stateCls=on?"ok":"no";
    stateTxt=on?"Ganaste":"Perdiste";
  } else if(Duel.canPlay(d)){
    stateCls="go";
    stateTxt="Tu turno";
    action='<button class="btn small gold" data-retry="1">Jugar \u25B6</button>';
  } else if(Duel.waitingOther(d)){
    stateTxt="Esperando a "+esc(info.name||(expWithUid(opp)))+"\u2026";
  } else {
    stateTxt="…";
  }
  var mine=Duel.myScore(d), opos=Duel.opScore(d);
  var scoreTxt = (d.scores&&Object.keys(d.scores).length>=1) ? ("<b>"+mine+"</b> vs <b>"+opos+"</b>") : "";
  row.innerHTML=
    '<div class="row" style="gap:10px; align-items:center; padding:8px 6px;">'+
      '<span class="big-avatar sm">'+(info.avatar||"\u{1F464}")+'</span>'+
      '<div class="grow">'+
        '<div style="font-weight:800;">'+esc(info.name||"jugador")+'</div>'+
        '<div class="sd" style="font-size:11px; color:var(--dim);">Nivel '+d.level_id+' · '+(lv?esc(lv.name):"")+(scoreTxt?" · "+scoreTxt:"")+'</div>'+
      '</div>'+
      '<div><span class="chip '+(stateCls?"c-"+stateCls:"")+'" style="white-space:nowrap;">'+stateTxt+'</span></div>'+
    '</div>'+action;
  row.querySelectorAll("[data-retry]").forEach(function(b){
    b.onclick=function(){ duelPlay(d.id); };
  });
  listEl.appendChild(row);
}
function expWithUid(u){ return u?String(u).slice(0,6):""; }

$("duelBack").addEventListener("click", function(){ sfxClick(); goMenu(); });
$("duelAddFriend").addEventListener("click", function(){
  ensureAudio(); sfxClick();
  var v=($("duelFriendIn").value||"").trim();
  if(!v){ toast("Escribe un código","\u{1F4AC}"); return; }
  Duel.addFriend(v).then(function(r){
    if(r&&r.ok){
      toast("¡Ahora son amigos con "+r.name+"!","\u{1F91D}");
      $("duelFriendIn").value="";
      loadDuelFriends();
    } else {
      toast(r&&r.error?r.error:"No se pudo agregar","","err");
    }
  }).catch(function(e){ toast(e.message,"","err"); });
});
$("duelCodeCopy").addEventListener("click", function(){
  ensureAudio();
  var c=$("duelMyCode").textContent;
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(function(){ toast("Código copiado: "+c,"\u{1F4CB}"); });
  else toast("Tu código: "+c,"\u{1F4CB}");
});