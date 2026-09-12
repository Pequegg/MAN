/* Op-Art Fan - modulo: js/core/auth.js */

"use strict";

/* ---------- Autenticación Supabase (GoTrue, sin SDK) ----------
   Flujo "Continuar con Google": PKCE + redirect. Al volver del
   navegador, el código se cambia por una sesión de token.
   Sin sesión, el juego funciona como invitado con perfil local. */
var Auth = (function(){
  var SK="sb-session", VK="sb-pkce-verifier";

  function apikey(){ return typeof SUPABASE_ANON_KEY!=="undefined" ? SUPABASE_ANON_KEY : ""; }
  function authBase(){ return SUPABASE_URL.replace(/\/$/,"")+"/auth/v1"; }

  function randomBytes(n){
    var a=new Uint8Array(n);
    if(window.crypto && crypto.getRandomValues){ crypto.getRandomValues(a); }
    else { for(var i=0;i<n;i++) a[i]=Math.floor(Math.random()*256); }
    return a;
  }
  function b64u(buf){ return btoa(String.fromCharCode.apply(null,new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }

  function saveSession(s){
    if(!s || !s.access_token) return null;
    var u=s.user||{};
    ls(SK, JSON.stringify({access_token:s.access_token, refresh_token:s.refresh_token||"",
      expires_at:(Date.now()/1000)+(s.expires_in||3600),
      user:{id:u.id, email:u.email||"", meta:(u.user_metadata||{})}}));
    return session();
  }
  function session(){ try{ var s=ls(SK); return s?JSON.parse(s):null; }catch(e){ return null; } }
  function isAuthed(){ var s=session(); return !!(s&&s.access_token&&dateOk(s)); }
  function dateOk(s){ return !s.expires_at || (s.expires_at*1000) > Date.now()+60000; }

  function uid(){ var s=session(); return (s&&s.user&&s.user.id)||null; }
  function userName(){ var s=session(); if(!s) return null; var m=s.user.meta||{}; return (m.full_name||m.name||s.user.email||"").toString().slice(0,16); }
  function email(){ var s=session(); return (s&&s.user&&s.user.email)||""; }

  function cleanUrl(){
    var u=new URL(location.href);
    if(u.searchParams.get("code")||u.searchParams.get("error")){
      u.searchParams.delete("code"); u.searchParams.delete("error");
      history.replaceState(null,"",u.pathname+u.search);
    }
  }

  function boot(cb){
    cb=cb||function(){};
    var chain=Promise.resolve();
    var mustPull=false;
    if(new URL(location.href).searchParams.get("code")){ mustPull=true; chain=oauthReturn(); }
    chain.then(function(){
      if(isAuthed() && mustPull) return Db.pull().catch(function(){});
      return null;
    }).then(function(){ cleanUrl(); try{ cb(); }catch(e){} });
  }

  function oauthReturn(){
    var u=new URL(location.href); var code=u.searchParams.get("code");
    if(!code) return Promise.resolve();
    var verifier=ls(VK); ls(VK,"");
    if(!verifier) return Promise.resolve();
    var oldUid=ls("uid")||null;
    return exchange(code, verifier).then(function(s){
      if(!s) return;
      Db.remapUid(oldUid);  // mueve el progreso de invitado a la cuenta
      try{ if(window.sfxGold) sfxGold(); }catch(e){}
    }).catch(function(){});
  }

  function exchange(code, verifier){
    return fetch(authBase()+"/token?grant_type=pkce", {
      method:"POST", headers:{"apikey":apikey(),"Content-Type":"application/json"},
      body:JSON.stringify({auth_code:code, code_verifier:verifier})
    }).then(function(r){ if(!r.ok) throw new Error("oauth "+r.status); return r.json(); })
      .then(function(j){ return saveSession(j); });
  }

  function challenge(){
    return new Promise(function(res, rej){
      if(!window.crypto || !crypto.subtle){ rej(new Error("no-crypto")); return; }
      var v=b64u(randomBytes(48));
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)).then(function(buf){
        res({v:v, c:b64u(buf)});
      }).catch(rej);
    });
  }

  function googleLogin(){
    if(typeof SupRemote==="undefined" || !SupRemote.on()){
      if(window.toast) toast("Primero pega tu SUPABASE_ANON_KEY en js/config/supabase.js","\u26A0","err");
      return;
    }
    var site=SUPABASE_SITE_URL||(location.origin+location.pathname);
    challenge().then(function(h){
      ls(VK, h.v);
      location.href=authBase()+"/authorize?provider=google&redirect_to="+encodeURIComponent(site)+"&code_challenge="+h.c+"&code_challenge_method=S256";
    }).catch(function(){ if(window.toast) toast("Tu navegador no soporta el login seguro (crypto.subtle)","\u26A0","err"); });
  }

  function signOut(){
    var s=session();
    if(s){
      try{ fetch(authBase()+"/logout",{method:"POST",
        headers:{"apikey":apikey(),"Authorization":"Bearer "+s.access_token}}).catch(function(){}); }catch(e){}
    }
    ls(SK, "");
    location.reload();
  }

  return {boot:boot, googleLogin:googleLogin, signOut:signOut, refresh:null,
    isAuthed:isAuthed, uid:uid, userName:userName, email:email, session:session};
})();