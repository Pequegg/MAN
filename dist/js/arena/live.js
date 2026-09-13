/* Op-Art Fan - modulo: js/arena/live.js */

"use strict";

/* ---------- Salas 1v1 EN VIVO (Fase 3) ----------
   Dos jugadores juegan el MISMO nivel a la vez; el marcador se ve
   en tiempo real (Supabase Realtime via RT) con fallback a polling
   REST cada 2s. Al terminar, cada lado envia su huella y el RPC
   live_submit resuelve (con desempate por tiempo). Recompensas:
   victoria +15, derrota +5.
   Flujo de pantalla: #screen-live crea/une, cuando status cambia a
   'playing' ambos arrancan el nivel, y finishGame llama a
   Live.finishFromGame (igual que los duelos).
*/
var Live = (function(){
  var cur=null, cb=null, pollT=null, lastPush=0, lastSig="", outcome=null;
  var TBL="live_rooms", TOPIC="realtime:public:live_rooms";

  function on(){ return typeof SupRemote!=="undefined" && SupRemote.on(); }
  function authed(){
    return on() && typeof Auth!=="undefined" && Auth.isAuthed && Auth.isAuthed() && !!Auth.uid();
  }
  function myUid(){ return (typeof Auth!=="undefined" && Auth.uid) ? Auth.uid() : null; }
  function code(){
    var c="", chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for(var i=0;i<6;i++) c+=chars[(Math.random()*chars.length)|0];
    return c;
  }

  // Lobby: salas abiertas/listas recientes (cualquiera las ve)
  function rooms(){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    var cut=Date.now()-600000;
    return SupRemote.get(TBL, "status=in.(open,ready)&created.gt."+cut+"&order=created.desc&limit=20")
      .then(function(rows){ return rows||[]; });
  }
  // Mis salas activas
  function mine(){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    var or="or=(host.eq."+SupRemote.enc(myUid())+",guest.eq."+SupRemote.enc(myUid())+")";
    return SupRemote.get(TBL, or+"&status=neq.finished&order=created.desc&limit=10")
      .then(function(rows){ return rows||[]; });
  }

  function create(level){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.rpc("live_create",{p_level:level}).then(function(r){
      if(r && r.error) throw new Error(r.error);
      attach(r.id); return r.id;
    });
  }
  function join(id){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.rpc("live_join",{p_room:id}).then(function(r){
      if(r.error) throw new Error(r.error);
      attach(id);
      return r;
    });
  }
  function start(){
    if(!cur||!authed()) return Promise.reject(new Error("no room"));
    if(mySide()!=="host") return Promise.reject(new Error("solo el anfitrion empieza"));
    if(cur.status!== "ready") return Promise.reject(new Error("falta rival"));
    return SupRemote.rpc("live_start",{p_room:cur.id}).then(function(r){
      if(r && r.error) throw new Error(r.error);
      cur=merge(r); fire();
      return cur;
    });
  }
  function leave(){
    if(!cur||!authed()) return Promise.reject(new Error("no room"));
    var id=cur.id;
    if(cur.status!=="finished"){
      return SupRemote.rpc("live_leave",{p_room:id}).then(function(r){
        detach(); return {left:true};
      });
    }
    detach(); return Promise.resolve({left:true});
  }

  function attach(id){
    if(cur&&cur.id===id) return;
    detach();
    outcome=null;
    cur={id:id, status:"open", level_id:1, h_score:0, g_score:0, h_done:0, g_done:0};
    sync().then(function(row){
      if(row){ cur=merge(row); fire(); }
    }).catch(function(){});
    RT.join(TOPIC, {
      broadcast:{ack:false, self:false}, presence:{key:""}, private:false,
      postgres_changes:[{event:"*", schema:"public", table:TBL, filter:"id=eq."+id}]
    });
    RT.sub(TOPIC, onRT);
    if(!pollT) pollT=setInterval(poll, 2000);
  }
  function detach(){
    if(pollT){ clearInterval(pollT); pollT=null; }
    RT.unsub(TOPIC);
    RT.unjoin(TOPIC);
    cur=null; cb=null; lastSig=""; lastPush=0;
  }
  function lastOutcome(){ return outcome; }
  function onRT(msg){
    if(msg&&msg.broadcast){ fire(); return; }
    if(msg&&msg.children) return;
    var row=msg;
    if(row&&row.id&&cur&&row.id===cur.id){ cur=merge(row); fire(); }
  }
  function poll(){
    if(!cur||cur.status==="finished") return;
    sync().then(function(row){
      if(!row){ return; }
      if(!cur||cur.id!==row.id) return;
      cur=merge(row); fire();
    }).catch(function(){});
  }
  function sync(){
    return SupRemote.get(TBL, "id=eq."+SupRemote.enc(cur.id)).then(function(rows){
      return rows&&rows[0]||null;
    });
  }
  function merge(row){
    var n={};
    ["id","host","guest","level_id","status","seed","h_score","g_score","h_combo","g_combo",
     "h_hits","g_hits","h_fails","g_fails","h_ms","g_ms","h_done","g_done","winner","started","created"].forEach(function(k){
      n[k]=row[k]!==undefined&&row[k]!==null?row[k]:n[k];
    });
    return n;
  }
  function sig(r){
    return [r.status,r.h_score,r.g_score,r.h_done,r.g_done,r.winner||""].join("|");
  }
  function fire(){
    if(!cur) return;
    var s=sig(cur);
    if(s===lastSig) return;
    lastSig=s;
    if(cb){ try{ cb(cur); }catch(e){} }
  }
  function subscribe(fn){ cb=fn; if(cur) fire(); }

  // Enviar mi marcador en vivo (limitado a ~2/s; el RPC dispara Realtime).
  function sendScore(score){
    if(!cur||cur.status!=="playing"||!authed()) return;
    var now=Date.now();
    if(now-lastPush<500) return;
    lastPush=now;
    SupRemote.rpc("live_score",{p_room:cur.id, p_score:Math.max(0,Math.floor(score||0))}).catch(function(){});
  }

  // ---- helpers de la sala actual ----
  function mySide(){ return cur&&myUid()? (cur.host===myUid()?"host":"guest") : null; }
  function myScore(){ return cur? (mySide()==="host"?cur.h_score:cur.g_score) : 0; }
  function opScore(){ return cur? (mySide()==="host"?cur.g_score:cur.h_score) : 0; }
  function opReady(){ return cur? mySide()==="host" ? !!cur.guest : !!cur.host : false; }
  function myDone(){ return cur? (mySide()==="host"?cur.h_done:cur.g_done)>0 : false; }
  function opDone(){ return cur? (mySide()==="host"?cur.g_done:cur.h_done)>0 : false; }
  function iWon(){ return cur&&cur.winner? cur.winner===myUid() : false; }

  // Al terminar mi partida (hook de finishGame)
  function finishFromGame(g){
    if(!authed()||!cur) return Promise.resolve(null);
    var startedAt=cur.started||g.startedAt||0;
    var ms=(typeof performance!=="undefined"?performance.now():Date.now())-startedAt;
    var h = (typeof Duel!=="undefined"&&Duel.huella)? Duel.huella(g, ms) : {
      score:Math.max(0,Math.floor(g.score||0)),
      combo:Math.max(1,Math.min(20,g.bestCombo||1)),
      hits:(g.hits||0)+(g.catches||0), fails:g.fails||0, ms:Math.floor(ms||0)
    };
    var id=cur.id;
    return SupRemote.rpc("live_submit",{
      p_room:id, p_score:h.score, p_combo:h.combo, p_hits:h.hits, p_fails:h.fails, p_ms:h.ms
    }).then(function(r){
      if(r.error) throw new Error(r.error);
      outcome=mergeOutcome(r);
      detach();
      if(typeof refreshMenuCoins==="function") refreshMenuCoins();
      return r;
    }).catch(function(e){
      outcome={error:(e&&e.message?e.message:"live")};
      detach();
      if(typeof toast==="function") toast("En vivo: "+(e&&e.message?e.message:e),"","err",3000);
      return null;
    });
  }
  function mergeOutcome(r){
    return {won:!!r.won, reward:r.reward||0, my:r.my, op:r.op, winner:r.winner||null};
  }

  return {
    on:on, authed:authed, myUid:myUid,
    rooms:rooms, mine:mine, create:create, join:join, start:start, leave:leave,
    attach:attach, detach:detach, subscribe:subscribe, sendScore:sendScore,
    current:function(){ return cur; }, lastOutcome:lastOutcome, mySide:mySide, myScore:myScore, opScore:opScore,
    opReady:opReady, myDone:myDone, opDone:opDone, iWon:iWon, finishFromGame:finishFromGame
  };
})();