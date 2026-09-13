/* Op-Art Fan - modulo: js/core/remote.js */

"use strict";

/* ---------- Cliente Supabase (PostgREST) sin dependencias ----------
   Habla directo con la API REST de Supabase usando fetch, sin librerias.
   Con SUPABASE_ANON_KEY vacia el juego funciona solo en local. */
var SupRemote = (function(){
  function on(){
    return typeof SUPABASE_URL!=="undefined" && SUPABASE_URL &&
           typeof SUPABASE_ANON_KEY!=="undefined" && SUPABASE_ANON_KEY;
  }
  function base(){ return SUPABASE_URL.replace(/\/$/,"")+"/rest/v1"; }
  function enc(s){ return encodeURIComponent(String(s)); }
  function head(pref){
    var h={"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json"};
    if(pref) h["Prefer"]=pref;
    return h;
  }
  function ok(r){ if(!r.ok) throw new Error("supabase http "+r.status); return r; }
  function get(table,q){
    return fetch(base()+"/"+table+(q?"?"+q:""),{headers:head()}).then(ok).then(function(r){ return r.json(); });
  }
  function upsert(table, rows, merge){
    return fetch(base()+"/"+table,{
      method:"POST",
      headers:head("resolution="+(merge===false?"ignore-duplicates":"merge-duplicates")+",return=minimal"),
      body:JSON.stringify(rows)
    }).then(ok);
  }
  function patch(table, q, body){
    return fetch(base()+"/"+table+"?"+q,{method:"PATCH",headers:head(),body:JSON.stringify(body||{})}).then(ok);
  }
  function bestScore(table, filterQs, body){
    return get(table, filterQs+"&order=score.desc&limit=1").then(function(rows){
      var cur=rows&&rows[0];
      if(!cur || (body.score||0)>(cur.score||0)) return upsert(table,[body]);
      return null;
    });
  }
  function rpc(fn, body){
    var h={"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=representation"};
    var tok=SUPABASE_ANON_KEY;
    if(typeof Auth!=="undefined" && Auth.session){
      var s=Auth.session(); if(s&&s.access_token) tok=s.access_token;
    }
    h["Authorization"]="Bearer "+tok;
    return fetch(base()+"/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(body||{})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, status:r.status, data:j}; }); })
      .then(function(j){
        if(!j.ok) throw new Error((j.data&&(j.data.message||j.data.msg))||"rpc error "+j.status);
        return j.data;
      });
  }
  return {on:on, base:base, enc:enc, get:get, patch:patch, upsert:upsert, bestScore:bestScore, rpc:rpc};
})();