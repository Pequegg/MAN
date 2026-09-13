/* Op-Art Fan - modulo: js/arena/realtime.js */

"use strict";

/* ---------- Supabase Realtime (protocolo Phoenix v2) sin SDK ----------
   Socket WebSocket minimal: heartbeat, join de canales, programáticos
   postgres_changes (fila completa) y broadcast de la app. Si el WebSocket
   no esta disponible o no conecta, Live cae a polling REST (offline-first). */
var RT = (function(){
  var ws=null, refN=1, jrN=1, topics={}, subs=[], hb=null, retryT=null, attempts=0;
  var connected=false, woken=false, statusCb=null;

  function on(){
    return typeof WebSocket!=="undefined" &&
      typeof SUPABASE_URL!=="undefined" && SUPABASE_URL &&
      typeof SUPABASE_ANON_KEY!=="undefined" && SUPABASE_ANON_KEY;
  }
  function wsUrl(){
    return SUPABASE_URL.replace(/^https?/, "wss") +
      "/realtime/v1/websocket?apikey="+encodeURIComponent(SUPABASE_ANON_KEY)+"&vsn=1.0.0";
  }
  function nextRef(){ return "rt-"+(refN++); }

  function connect(){
    if(ws || !on()) return false;
    try{ ws=new WebSocket(wsUrl()); }catch(e){ ws=null; return false; }
    ws.onopen=function(){
      connected=true; attempts=0;
      startHeartbeat();
      try{ (statusCb||noop)(true); }catch(e){}
      joinAll();
    };
    ws.onmessage=function(ev){ parse(ev.data); };
    ws.onclose=function(){ teardown(); scheduleReconnect(); };
    ws.onerror=function(){ try{ ws.close(); }catch(e){ } };
    return true;
  }
  function teardown(){
    connected=false;
    stopHeartbeat();
    ws=null;
    try{ (statusCb||noop)(false); }catch(e){}
  }
  function scheduleReconnect(){
    if(retryT) return;
    if(!woken) return;               // no reconectar si nunca se uso
    attempts++;
    var delay=Math.min(15000, 1000*Math.pow(1.8, attempts));
    retryT=setTimeout(function(){ retryT=null; connect(); }, delay);
  }
  function joinAll(){ for(var t in topics){ if(topics[t]) sendJoin(t, topics[t]); } }
  function join(topic, cfg){
    topics[topic]=cfg||{};
    if(!ws){ connect(); }
    if(connected){ sendJoin(topic, topics[topic]); }
  }
  function unjoin(topic){ delete topics[topic]; sendLeave(topic); }
  function sendJoin(topic, cfg){
    if(!ws||!connected) return;
    var payload={config:cfg, timeout:10000};
    ws.send(JSON.stringify([null, nextRef(), topic, "phx_join", payload]));
  }
  function sendLeave(topic){
    if(!ws||!connected) return;
    ws.send(JSON.stringify([String(jrN++), nextRef(), topic, "phx_leave", {}]));
  }
  function broadcast(topic, event, payload){
    if(!ws||!connected||!topics[topic]) return false;
    ws.send(JSON.stringify([topic, nextRef(), topic, "broadcast", {event:event, payload:payload||{}}]));
    return true;
  }
  function startHeartbeat(){
    stopHeartbeat();
    hb=setInterval(function(){
      if(ws&&connected) ws.send(JSON.stringify([null, nextRef(), "phoenix", "heartbeat", {}]));
    }, 25000);
  }
  function stopHeartbeat(){ if(hb){ clearInterval(hb); hb=null; } }

  function parse(data){
    var m;
    try{ m=JSON.parse(data); }catch(e){ return; }
    if(!Array.isArray(m)||m.length<5) return;
    var topic=m[2], event=m[3], payload=m[4]||{};
    if(event==="phx_reply"){
      try{ (statusCb||noop)(true); }catch(e){}
      fire(topic, {replied:true, status:payload.status, response:payload.response||{}});
      return;
    }
    if(event==="postgres_changes"){
      var row=rowOf(payload);
      if(row!==null) fire(topic, row);
      return;
    }
    if(event==="broadcast"){
      fire(topic, {broadcast:true, event:payload.event, payload:payload.payload||{}});
      return;
    }
  }
  // Versiones: la nueva deja payload.data con {record,...}; las viejas dejan payload.data=la fila
  function rowOf(payload){
    var d=payload&&payload.data;
    if(!d) return null;
    if(typeof d==="object" && d.record && d.record instanceof Object) return d.record;
    if(typeof d==="object" && d.type && (d.data&&d.data instanceof Object)) return d.data;
    return d;
  }

  function sub(topic, cb){ subs.push({topic:topic, cb:cb}); }
  function unsub(topic){ subs=subs.filter(function(s){ return s.topic!==topic; }); }
  function fire(topic, data){
    subs.forEach(function(s){ if(s.topic===topic){ try{ s.cb(data); }catch(e){} } });
  }

  function status(cb){ statusCb=cb; return connected; }
  function kiss(){ woken=true; }
  function noop(){}

  // Boot: socket + canal broadcast publico para avisos globales
  function boot(){
    if(!on()) return false;
    woken=true;
    join("realtime:public", {
      broadcast:{ack:false, self:false}, presence:{key:""}, postgres_changes:[], private:false
    });
    return true;
  }

  return {
    on:on, boot:boot, connect:connect, join:join, unjoin:unjoin,
    broadcast:broadcast, sub:sub, unsub:unsub, status:status, connected:function(){ return connected; }
  };
})();