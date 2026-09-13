/* Op-Art Fan - modulo: js/ui/live.js */

"use strict";

/* ---------- Pantalla de salas en vivo (Fase 3) ---------- */
var _liveRooms=null, _liveMine=null, _oppWas=false;

function renderLiveLevels(){
  var sel=$("liveLevel");
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

function renderLive(){
  renderLiveLevels();
  refreshMenuCoins();
  var off=$("liveOffNote");
  Live.subscribe(roomView);
  if(typeof window.RT!=="undefined" && RT.status) RT.status(function(c){ paintRt(c); });
  paintRt(typeof window.RT!=="undefined" ? RT.connected() : false);
  if(!Live.authed()){
    off.style.display="block";
    off.innerHTML="Para las salas <b>en vivo</b> necesitas <b>cuenta Google</b> (botón del registro). Dos jugadores, el mismo nivel, marcador a tiempo real."+
      "<br><button class='btn small gold' id='liveGoGoogle' style='margin-top:8px;'>Iniciar sesión</button>";
    var g=$("liveGoGoogle"); if(g){ g.onclick=function(){ if(window.Auth&&Auth.login) Auth.login(); }; }
    $("liveRoomPanel").innerHTML="";
    $("liveLobbyPanel").style.display="none";
    $("liveResultLine").style.display="none";
    return;
  }
  off.style.display="none";
  $("liveLobbyPanel").style.display="block";
  loadLiveRooms();
  loadLiveMine();
  renderRoom();
}

function paintRt(ok){
  var chip=$("liveRtChip");
  if(!chip) return;
  chip.textContent=ok?"realtime ●":"realtime ○ (polling 2s)";
  chip.className="chip "+(ok?"c-ok":"");
  var a=$("adminRt"); if(a) a.textContent=ok?"conectado ●":"sin websocket (polling)";
}

function loadLiveRooms(){
  var listEl=$("liveRoomsList"); if(!listEl) return;
  Live.rooms().then(function(rows){
    _liveRooms=rows||[];
    listEl.innerHTML="";
    if(!rows||!rows.length){ listEl.innerHTML='<div class="sub" style="padding:6px;">No hay salas abiertas. ¡Crea una y espera rival!</div>'; return; }
    rows.forEach(renderRoomRow);
  }).catch(function(e){
    listEl.innerHTML='<div class="sub" style="padding:6px; color:#ff8a7b;">'+esc(e.message)+'</div>';
  });
}
function renderRoomRow(r){
  var listEl=$("liveRoomsList"); if(!listEl) return;
  var lv=levelDef(r.level_id);
  var row=document.createElement("div");
  row.className="duel-row";
  var hasG=r.guest?"1 jugador":"esperando rival…";
  row.innerHTML=
    '<div class="row" style="gap:10px; align-items:center; padding:8px 6px;">'+
      '<span class="big-avatar sm">🕹️</span>'+
      '<div class="grow">'+
        '<div style="font-weight:800;">Sala de '+esc(lv?lv.name:"")+'</div>'+
        '<div class="sd" style="font-size:11px; color:var(--dim);">Nivel '+r.level_id+' · '+hasG+'</div>'+
      '</div>'+
      (r.host!==Live.myUid()?'<button class="btn small cyan" data-join="1">Unirme</button>':
        '<button class="btn small ghost" data-mine="1">Tu sala</button>')+
    '</div>';
  row.querySelectorAll("[data-join]").forEach(function(b){
    b.onclick=function(){ liveJoin(r.id); };
  });
  row.querySelectorAll("[data-mine]").forEach(function(b){
    b.onclick=function(){ liveGoRoom(r.id); };
  });
  listEl.appendChild(row);
}
function loadLiveMine(){
  var listEl=$("liveMineList"); if(!listEl) return;
  Live.mine().then(function(rows){
    _liveMine=rows||[];
    listEl.innerHTML="";
    if(!rows||!rows.length){ listEl.innerHTML='<div class="sub" style="padding:6px;">No tienes salas activas.</div>'; return; }
    rows.forEach(function(r){
      var lv=levelDef(r.level_id);
      var row=document.createElement("div");
      row.className="duel-row";
      row.innerHTML=
        '<div class="row" style="gap:10px; align-items:center; padding:8px 6px;">'+
          '<span class="big-avatar sm">⚡</span>'+
          '<div class="grow">'+
            '<div style="font-weight:800;">Sala '+(r.status==="playing"?"en juego":esc(lv?lv.name:""))+'</div>'+
            '<div class="sd" style="font-size:11px; color:var(--dim);">'+(r.status==="playing"?(r.h_score+" — "+r.g_score)+" · ":"")+esc(lv?lv.name:"")+'</div>'+
          '</div>'+
          '<button class="btn small gold" data-go="1">Entrar</button>'+
        '</div>';
      row.querySelectorAll("[data-go]").forEach(function(b){ b.onclick=function(){ liveGoRoom(r.id); }; });
      listEl.appendChild(row);
    });
  }).catch(function(e){});
}

function liveGoRoom(id){ Live.attach(id); renderRoom(); }

function liveJoin(id){
  Live.join(id).then(function(){
    toast("¡Estás en la sala! Espera al anfitrión","\u{1F3AE}");
    renderRoom(); loadLiveRooms();
  }).catch(function(e){ toast(e.message,"","err"); });
}
function liveCreate(){
  var sel=$("liveLevel"); var lv=parseInt(sel?sel.value:"1",10)||1;
  Live.create(lv).then(function(){
    toast("Sala creada. Espera rival y pulsa ▶ Empezar","\u{1F3AE}");
    renderRoom(); loadLiveRooms();
  }).catch(function(e){ toast(e.message,"","err"); });
}
function liveStart(){
  Live.start().then(function(){ toast("¡Comenzando…!","\u{1F3AE}"); })
    .catch(function(e){ toast(e.message,"","err"); });
}
function liveLeave(){
  Live.leave().then(function(){
    $("liveResultLine").style.display="none";
    renderRoom(); loadLiveRooms(); loadLiveMine();
  }).catch(function(e){ toast(e.message,"","err"); });
}

/* Vista de la sala actual (se repinta con cada update de Realtime/polling) */
function roomView(r){
  if(!r) return;
  renderRoom();
  var started = r.status==="playing" && !Live.myDone() && !(typeof running!=="undefined"&&running);
  if(started){
    var liveOn=!!$("screen-live").classList.contains("on")||!!$("screen-game").classList.contains("on");
    if(liveOn){ startGame(r.level_id); }
    else if(typeof Nx!=="undefined"&&Nx.push){ Nx.push("live","Tu rival ha empezado la sala de nivel "+r.level_id,"\u{1F3AE}"); }
  }
}
function renderRoom(){
  var box=$("liveRoomPanel"); if(!box) return;
  var r=Live.current();
  if(!r){
    var last=Live.lastOutcome();
    if(last){
      $("liveResultLine").style.display="block";
      $("liveResultLine").textContent= last.won? "\u{1F3C6} ¡Ganaste la sala! +"+last.reward+" monedas"
        : (last.owner==="cancel"?"Sala cerrada por el rival": "\u{1F614} Perdiste (+"+last.reward+" monedas)");
    }
    box.innerHTML='<div class="panel center sub" style="color:var(--dim);">Estás fuera de sala. Crea una nueva o únete arriba.</div>';
    return;
  }
  $("liveResultLine").style.display="none";
  var lv=levelDef(r.level_id);
  var isHost=Live.mySide()==="host";
  var your=Live.myScore(), opp=Live.opScore();
  var st="";
  if(r.status==="open") st='<span class="chip c-go">abierta</span>';
  else if(r.status==="ready") st='<span class="chip c-go">lista · esperando a '+ (isHost?"entrar a juego":"el anfitrión")+'</span>';
  else if(r.status==="playing") st='<span class="chip c-ok">🔴 en juego</span>';
  else if(r.status==="finished") st='<span class="chip '+(Live.iWon()?"c-ok":"c-no")+'">'+(!r.winner?"cerrada":(Live.iWon()?"¡ganaste!":"perdiste"))+'</span>';
  var canStart=isHost&&r.status==="ready"&&!!r.guest;
  var act='';
  if(canStart) act+='<button class="btn pink grow" id="liveGoStart">▶ Empezar nivel</button>';
  if(r.status!=="playing") act+='<button class="btn ghost grow" id="liveGoLeave">Salir</button>';
  var rname=r.guest?(isHost?"Rival":"Anfitrión"):"Esperando rival…";
  box.innerHTML=
    '<div class="panel">'+
      '<div class="row" style="gap:10px; align-items:center; margin-bottom:8px;">'+
        '<span class="big-avatar sm">🔴</span><div class="grow"><div style="font-weight:900;">Sala '+esc(lv?lv.name:"")+'</div>'+
        '<div class="sd" style="font-size:11px; color:var(--dim);">Nivel '+r.level_id+(r.started?" · empezó":'')+'</div></div>'+st+
      '</div>'+
      '<div class="live-vs">'+
        '<div class="live-side '+(r.status==="finished"&&Live.iWon()?'win':'')+'"><b>Tú</b><div class="live-score">'+num(your)+'</div>'+(Live.myDone()?'<span class="chip c-ok">hecho</span>':'')+'</div>'+
        '<div class="live-ico">VS</div>'+
        '<div class="live-side '+(r.status==="finished"&&!Live.iWon()&&r.winner?'win':'')+'"><b>'+esc(rname)+'</b><div class="live-score">'+num(opp)+'</div>'+(Live.opDone()?'<span class="chip c-ok">jugó</span>':'')+'</div>'+
      '</div>'+
      (r.status==="playing"?'<div class="sub center" style="font-size:12px; color:var(--dim); margin-top:8px;">Juega el nivel: tu acierto suma en vivo.\u2003</div>':'')+
      '<div class="row wrap" style="gap:8px; margin-top:10px;">'+act+'</div>'+
    '</div>';
  var gs=$("liveGoStart"); if(gs) gs.onclick=function(){ liveStart(); };
  var gl=$("liveGoLeave"); if(gl) gl.onclick=function(){ liveLeave(); };
}

$("liveBack").addEventListener("click", function(){ sfxClick(); goMenu(); });
$("liveCreate").addEventListener("click", function(){ ensureAudio(); sfxClick(); liveCreate(); });