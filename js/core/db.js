/* Op-Art Fan - modulo: js/core/db.js */

"use strict";

/* ---------- Capa de datos offline-first (spec v2 Fase 0) ----------
   - Guarda SIEMPRE en local (el juego funciona 100% sin red).
   - Cuando hay sesión Google + Supabase configurado, sincroniza el
     perfil completo con la tabla `users` (último guardado gana).
   - Conflicto: se compara el timestamp del guardado (last-write-wins). */
var Db = (function(){
  var timer=null;

  function ready(){
    if(typeof SupRemote==="undefined" || !SupRemote.on()) return false;
    if(typeof Auth==="undefined" || !Auth.isAuthed || !Auth.isAuthed()) return false;
    return true;
  }

  function snapshot(){
    return { name:profile.name, avatar:profile.avatar, coins:coins,
      inventory:inventory, equipped:equipped, completed:completed, pb:pb,
      achievements:achievements, totalEarned:totalEarned,
      ownedSkins:ownedSkins, activeSkin:activeSkin, settings:settings,
      introDone:introDone, arena:arena, dailyBest:ls("dailyBest")||{} };
  }

  function C(v,d){ return (typeof v==="undefined"||v===null)?d:v; }

  function push(){
    if(!ready()) return;
    var s=snapshot(); s._saved=Date.now();
    try{ SupRemote.upsert("users",[{uid:Auth.uid(), profile:s}]).catch(function(){}); }catch(e){}
  }

  function queueSync(){
    if(!ready()) return;
    if(timer) clearTimeout(timer);
    timer=setTimeout(function(){ timer=null; push(); }, 2200);
  }

  function pull(){
    return new Promise(function(res){
      if(!ready()){ res(false); return; }
      if(ls("dbPulling")){ res(false); return; }
      ls("dbPulling", 1);
      var q="uid=eq."+SupRemote.enc(Auth.uid());
      try{
        SupRemote.get("users",q).then(function(rows){
          ls("dbPulling", 0);
          var r=rows&&rows[0];
          if(!r || !r.profile){ res(false); return; }
          var s=r.profile;
          var last=ls("lastSync")||0;
          if((s._saved||0) > last){
            applyRemote(s);
            ls("lastSync", s._saved||Date.now());
            res(true);
          } else {
            // nada remoto mas nuevo: marca para no repetir antes que local guarde
            ls("lastSync", Date.now());
            res(false);
          }
        }).catch(function(){ ls("dbPulling",0); res(false); });
      }catch(e){ ls("dbPulling",0); res(false); }
    });
  }

  function mergeGd(a,b){
    var out=a||{};
    Object.keys(b||{}).forEach(function(code){
      var src=b[code]; var dst=out[code]||{members:{},pts:{}};
      if(src.members){ Object.keys(src.members).forEach(function(u){ if(!dst.members[u]) dst.members[u]=src.members[u]; }); }
      if(src.pts){ Object.keys(src.pts).forEach(function(sk){
        if(!dst.pts[sk]) dst.pts[sk]={};
        Object.keys(src.pts[sk]).forEach(function(u){
          var v=src.pts[sk][u]||0;
          if((dst.pts[sk][u]||0) < v) dst.pts[sk][u]=v;
        });
      }); }
      out[code]=dst;
    });
    return out;
  }

  function applyRemote(p){
    if(!p) return;
    profile.name=C(p.name,profile.name);
    if(p.avatar) profile.avatar=p.avatar;
    coins=C(p.coins,coins);
    inventory=C(p.inventory,inventory);
    equipped=C(p.equipped,equipped);
    completed=C(p.completed,completed);
    pb=C(p.pb,pb);
    achievements=C(p.achievements,achievements);
    totalEarned=C(p.totalEarned,totalEarned);
    ownedSkins=C(p.ownedSkins,ownedSkins);
    activeSkin=C(p.activeSkin,activeSkin);
    if(p.settings) settings=C(p.settings,settings);
    introDone=C(p.introDone,introDone);
    if(p.dailyBest) ls("dailyBest",p.dailyBest);
    if(p.arena){
      var a=p.arena;
      if(a.groups && a.groups.length) arena.groups=a.groups.concat(arena.groups||[]).filter(function(x,i,arr){ return arr.indexOf(x)===i; });
      if(a.groupData) arena.groupData=mergeGd(arena.groupData, a.groupData);
      if(!arena.activeGroup && a.activeGroup) arena.activeGroup=a.activeGroup;
      if(a.wardrobe && a.wardrobe.owned) arena.wardrobe=a.wardrobe;
      if(a.days) Object.keys(a.days).forEach(function(k){ if(!arena.days[k]) arena.days[k]=a.days[k]; });
      if(a.daysDone) arena.daysDone=a.daysDone.concat(arena.daysDone||[]).filter(function(x,i,arr){ return arr.indexOf(x)===i; });
      if(a.retosWon) Object.keys(a.retosWon).forEach(function(m){ arena.retosWon[m]=(arena.retosWon[m]||0)+a.retosWon[m]; });
    }
    saveArena(); saveAll();
  }

  function remapUid(oldUid){
    if(!oldUid) return;
    if(typeof Auth==="undefined") return;
    var nu=Auth.uid(); if(!nu || oldUid===nu) return;
    // progreso de arena bajo la identidad vieja -> cuenta de Google
    Object.keys(arena.groupData||{}).forEach(function(code){
      var gd=arena.groupData[code];
      if(gd.members && gd.members[oldUid]){ gd.members[nu]=gd.members[oldUid]; delete gd.members[oldUid]; }
      if(gd.pts){ Object.keys(gd.pts).forEach(function(sk){
        if(gd.pts[sk] && gd.pts[sk][oldUid]!=null){
          gd.pts[sk][nu]=(gd.pts[sk][nu]||0)+gd.pts[sk][oldUid];
          delete gd.pts[sk][oldUid];
        }
      }); }
    });
    var sc=ls("localScores")||[];
    var moved=false;
    var ns=sc.map(function(e){ if(e&&e.uid===oldUid){ moved=true; var x={}; Object.keys(e).forEach(function(k){ x[k]=e[k]; }); x.uid=nu; return x; } return e; });
    if(moved) ls("localScores", ns);
    ls("uid", nu);
    saveArena();
    if(arena.groups) arena.groups.forEach(pushGroupRemote);
  }

  return {ready:ready, queueSync:queueSync, push:push, pull:pull, applyRemote:applyRemote, remapUid:remapUid};
})();