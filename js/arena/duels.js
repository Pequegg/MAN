/* Op-Art Fan - modulo: js/arena/duels.js */

"use strict";

/* ---------- Duelos asincronicos (Fase 2) ----------
   - p1 crea el duelo y juega su lado ya; p2 recibe el reto.
   - Ambos juegan el MISMO nivel; la huella de la partida se valida
     en el server (submit_duel_play) y, con los dos lados, se resuelve.
   - Amigos por codigo (RPC add_friend) para poder retar a quien quieras. */
var Duel = (function(){
  function on(){
    return typeof SupRemote !== "undefined" && SupRemote.on();
  }
  function authed(){
    return on() && typeof Auth !== "undefined" && Auth.isAuthed && Auth.isAuthed() && !!Auth.uid();
  }
  function myUid(){ return (typeof Auth!=="undefined" && Auth.uid) ? Auth.uid() : null; }

  function code(){
    var s="";
    var chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for(var i=0;i<6;i++) s+=chars[(Math.random()*chars.length)|0];
    return s;
  }

  // Mis duelos (como p1 o p2), mas recientes primero
  function list(){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    var or="or=(p1.eq."+SupRemote.enc(myUid())+",p2.eq."+SupRemote.enc(myUid())+")&order=created.desc&limit=50";
    return SupRemote.get("duels", or);
  }

  // Crear reto contra un amigo en un nivel concreto (el seed y el id los
  // decide el server; el cliente nunca elige su propia huella).
  function create(opp, level){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.rpc("create_duel",{p_opp:(opp&&opp.uid)||opp, p_level:level}).then(function(r){
      if(r && r.error) throw new Error(r.error);
      return r.id;
    });
  }

  function friends(){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.get("friends","uid=eq."+SupRemote.enc(myUid())+"&order=name").then(function(rows){ return rows||[]; });
  }

  function addFriend(codeIn){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.rpc("add_friend",{p_code:codeIn});
  }

  function myCode(){
    if(!authed()) return Promise.reject(new Error("slv: se requiere cuenta Google"));
    return SupRemote.rpc("my_friend_code",{}).then(function(r){ return (r&&r.code)||""; });
  }

  // Huella de una partida terminada (GS + ms real)
  function huella(g, ms){
    return {
      score: Math.max(0, Math.floor(g.score||0)),
      combo: Math.max(1, Math.min(20, g.bestCombo||1)),
      hits: (g.hits||0) + (g.catches||0),
      fails: g.fails||0,
      ms: Math.floor(ms||0)
    };
  }

  // Al terminar mi lado: envia la huella al server y resuelve/espera.
  // Devuelve una promesa con el resultado {status, won, reward, ...}.
  function submit(h){
    if(!authed() || !session.duel) return Promise.reject(new Error("no duel"));
    var id=session.duel.id;
    return SupRemote.rpc("submit_duel_play",{
      p_duel:id, p_score:h.score, p_combo:h.combo, p_hits:h.hits, p_fails:h.fails, p_ms:h.ms
    }).then(function(r){ return r; });
  }

  // Gancho desde finishGame(): toma la huella de la partida recien jugada.
  function submitFromGame(g){
    var startedAt=g&&g.startedAt?g.startedAt:0;
    var h=huella(g, (typeof performance!=="undefined"?performance.now():Date.now())-startedAt);
    return submit(h).then(function(r){
      var el=(typeof $==="function")?$("resLevelLine"):null;
      session.duel=null;
      if(r && r.status==="finished"){
        if(typeof refreshMenuCoins==="function") refreshMenuCoins();
        if(typeof toast==="function"){
          toast(r.won?"\u{1F3C6} ¡Ganaste el duelo! +"+r.reward+" monedas":"\u{1F614} Perdiste el duelo (+"+r.reward+" monedas)", r.won?"\u{1F947}":"\u{1F3AF}");
          if(r.won && r.bonus) toast("¡Racha de "+r.streak+"! Bonus +"+r.bonus,"\u{1F525}");
        }
        if(el && el.textContent==="") el.textContent = r.won ? "\u{1F3C6} ¡Ganaste el duelo! \u0394+"+r.reward : "\u{1F614} Derrota en el duelo \u0394+"+r.reward;
      } else if(r && r.status==="waiting"){
        if(typeof toast==="function") toast("Duelo jugado: esperando a tu rival","\u2694\uFE0F");
        if(el && el.textContent==="") el.textContent="\u2694\uFE0F Tu lado enviado. Esperando al rival\u2026";
      }
      return r;
    }).catch(function(e){
      session.duel=null;
      if(typeof toast==="function") toast("Duelo: "+(e&&e.message?e.message:e),"","err",3000);
      return null;
    });
  }

  function opponent(d){ return d.p1===myUid() ? (d.p2||"") : (d.p1||""); }
  function mySide(d){ return d.p1===myUid() ? "p1" : "p2"; }
  function myScore(d){ return (d.scores&&d.scores[d.p1===myUid()?"p1":"p2"])||0; }
  function opScore(d){ return (d.scores&&d.scores[d.p1===myUid()?"p2":"p1"])||0; }
  function doneX(d,side){ return side==="p1" ? (d.done1||0) : (d.done2||0); }
  function played(d){ return doneX(d,"p1")>0 && doneX(d,"p2")>0; }
  function canPlay(d){
    if(!d || d.status==="finished") return false;
    var me=mySide(d);
    return doneX(d,me)===0;
  }
  function waitingOther(d){ return !canPlay(d) && !played(d); }
  function iWon(d){ return d.status==="finished" && d.winner && d.winner===myUid(); }

  return {
    on:on, authed:authed, myUid:myUid, list:list, create:create,
    friends:friends, addFriend:addFriend, myCode:myCode,
    huella:huella, submit:submit, submitFromGame:submitFromGame,
    opponent:opponent, mySide:mySide, myScore:myScore, opScore:opScore,
    played:played, canPlay:canPlay, waitingOther:waitingOther, iWon:iWon
  };
})();