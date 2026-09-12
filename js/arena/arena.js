/* Op-Art Fan - modulo: js/arena/arena.js */

"use strict";

/* ============================================================
   ARENA — reto diario, grupos, temporadas, armario y mini-juegos
   (capa adicional: no toca la Historia ni el ranking existentes)
   ============================================================ */
var ARENA_TIME = 60;
var ARENA_ATTEMPTS = 3;
var SEASON_DAYS = 14;
var ARENA_EPOCH = new Date(2026,0,5).getTime(); // lunes de referencia
var ARENA_MODES = [
 {id:"calligraphy", icon:"\u{1F58B}\uFE0F", name:"Pincelada Veloz", hint:"Traza la caligrafía al tacto"},
 {id:"lanterns",    icon:"\u{1F3EE}",        name:"Farolillos",      hint:"Toca faroles dorados y esquiva los rojos"},
 {id:"coin",        icon:"\u{1FA99}",        name:"Moneda de la Suerte", hint:"Detén la rueda en la zona dorada"},
 {id:"drum",        icon:"\u{1F941}",        name:"Ritmo del Tambor", hint:"Toca siguiendo el compás visual"}
];
function modeById(id){ return ARENA_MODES.find(function(m){return m.id===id;})||ARENA_MODES[0]; }

var arena = ls("arena") || {groups:[], groupData:{}, activeGroup:null, days:{},
                            wardrobe:{owned:[], hat:"", fan:"", cape:"", bg:""}, retosWon:{}, daysDone:[],
                            lastMode:"lanterns", lastScore:0, lastWon:false, isNewBest:false, pendingPts:0};
function saveArena(){ ls("arena", arena); }

function seasonKey(){ return "S"+Math.floor((Date.now()-ARENA_EPOCH)/(SEASON_DAYS*86400000)); }
function dateKeyOf(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
var TIERS=[
 {m:200, ico:"\u{1F451}", nm:"Corona"},
 {m:120, ico:"\u{1F947}", nm:"Oro"},
 {m:60,  ico:"\u{1F948}", nm:"Plata"},
 {m:20,  ico:"\u{1F949}", nm:"Bronce"},
 {m:0,   ico:"\u2728",   nm:"Novato"}
];
function mySeasonPts(){
  var sk=seasonKey(); var pts=0;
  (arena.groups||[]).forEach(function(code){
    var gd=arena.groupData[code]||{}; var d=(gd.pts||{})[sk]||{};
    pts+=(d[uid()]||0);
  });
  return pts;
}
function seasonTier(){
  var p=mySeasonPts();
  for(var i=0;i<TIERS.length;i++){ if(p>=TIERS[i].m) return {ico:TIERS[i].ico, nm:TIERS[i].nm, pts:p, next: i>0?TIERS[i-1].m:null}; }
  return {ico:TIERS[TIERS.length-1].ico, nm:TIERS[TIERS.length-1].nm, pts:p, next:null};
}
function dayStreak(){
  var days=arena.daysDone||[]; if(!days.length) return 0;
  var set={}; days.forEach(function(d){ set[d]=1; });
  var s=0; var d=new Date();
  if(!set[todayKey()]) d=new Date(d.getTime()-86400000);
  for(var i=0;i<400;i++){ var k=dateKeyOf(d); if(!set[k]) break; s++; d=new Date(d.getTime()-86400000); }
  return s;
}
function seasonRange(){
  var d=SEASON_DAYS*86400000;
  var st=ARENA_EPOCH+Math.floor((Date.now()-ARENA_EPOCH)/d)*d;
  var en=st+d;
  return {start:st, end:en, days:Math.max(0,Math.ceil((en-Date.now())/86400000)), prog:Math.max(0,Math.min(SEASON_DAYS,Math.ceil((Date.now()-st)/86400000)))};
}
function nextMidnight(){ var d=new Date(); d.setHours(24,0,0,0); return d.getTime(); }
function dayNum(){ return Number(todayKey().replace(/-/g,"")); }
function fmtCD(ms){
  if(ms<0) ms=0;
  var s=Math.floor(ms/1000); var h=Math.floor(s/3600); s-=h*3600;
  var m=Math.floor(s/60); s-=m*60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

/* ---------- Grupos ---------- */
function genCode(){ var chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; var c=""; for(var i=0;i<5;i++){ c+=chars.charAt(ri(0,chars.length-1)); } return c; }
function myWear(){ return {hat:arena.wardrobe.hat, fan:arena.wardrobe.fan, cape:arena.wardrobe.cape, bg:arena.wardrobe.bg}; }
function ensureGroup(code){
  if(arena.groups.indexOf(code)===-1) arena.groups.push(code);
  if(!arena.groupData[code]) arena.groupData[code]={members:{}, pts:{}};
  var gd=arena.groupData[code]; if(!gd.pts) gd.pts={};
  var sk=seasonKey(); if(!gd.pts[sk]) gd.pts[sk]={};
  if(gd.pts[sk][uid()]==null) gd.pts[sk][uid()]=0;
  return gd;
}
function joinGroup(code, silent){
  var c=String(code||"").trim().toUpperCase();
  if(!/^[A-Z0-9]{5}$/.test(c)){ toast("El código son 5 letras o números","\u26A0","err"); return 0; }
  var gd=ensureGroup(c);
  gd.members[uid()]={name:profile.name, avatar:profile.avatar, wear:myWear(), joined:Date.now()};
  saveArena(); pushGroupRemote(c);
  if(arena.activeGroup===null) arena.activeGroup=c;
  if(!silent){ sfxGold(); toast("¡Unido al grupo "+c+"!","\u{1F465}"); }
  renderArenaGroups(); renderSeason(); renderWardrobe();
  return 1;
}
function createGroup(){
  var cand=genCode(), tries=0;
  while(arena.groups.indexOf(cand)>-1 && tries<50){ cand=genCode(); tries++; }
  var gd=ensureGroup(cand);
  gd.members[uid()]={name:profile.name, avatar:profile.avatar, wear:myWear(), joined:Date.now()};
  arena.activeGroup=cand;
  saveArena(); pushGroupRemote(cand);
  sfxGold(); toast("Grupo creado: "+cand+"\u00A0— comparte el código","\u{1F389}",null,2600);
  renderArenaGroups(); renderSeason(); renderWardrobe();
}
function pushGroupRemote(code){
  if(!FIREBASE_URL) return;
  var base=FIREBASE_URL.replace(/\/$/,""); var sk=seasonKey();
  var gd=arena.groupData[code]; if(!gd) return;
  try{
    fetch(base+"/arena/groups/"+code+"/members/"+uid()+".json",{method:"PUT",body:JSON.stringify(gd.members[uid()]||{name:profile.name,avatar:profile.avatar,wear:myWear()})}).catch(function(){});
    fetch(base+"/arena/groups/"+code+"/pts/"+sk+"/"+uid()+".json",{method:"PUT",body:JSON.stringify((gd.pts[sk]&&gd.pts[sk][uid()])||0)}).catch(function(){});
  }catch(e){}
}
function fetchGroupRemote(code){ return new Promise(function(resolve){
  if(!FIREBASE_URL){ resolve(null); return; }
  fetch(FIREBASE_URL.replace(/\/$/,"")+"/arena/groups/"+code+".json").then(function(r){return r.json();}).then(function(j){ resolve(j); }).catch(function(){ resolve(null); });
}); }

function renderArenaGroups(){
  $("arenaOffNote").style.display = FIREBASE_URL ? "none" : "block";
  $("arenaOffNote").innerHTML = "\u26A0 Modo sin conexi\u00F3n: los grupos se guardan solo en este dispositivo. Configura FIREBASE_URL (cerca del inicio del c\u00F3digo) para compartirlos entre amigos.";
  var list=$("arenaGroupList"); list.innerHTML="";
  if(!arena.groups.length){
    list.innerHTML='<div class="center sub" style="padding:14px; color:var(--dim); font-size:12px;">Aún no estás en ningún grupo. Crea uno o únete con el código de un amigo.</div>';
    arena.activeGroup=null; return;
  }
  if(arena.groups.indexOf(arena.activeGroup)===-1) arena.activeGroup=arena.groups[0];
  arena.groups.forEach(function(code){
    var gd=arena.groupData[code]||{members:{},pts:{}};
    var nm=Object.keys(gd.members||{}).length;
    var sk=seasonKey();
    var myPts=((gd.pts||{})[sk]||{})[uid()]||0;
    var act=arena.activeGroup===code;
    var d=document.createElement("div");
    d.className="grp-row"+(act?" me":"");
    d.innerHTML='<span class="rank-av">\u{1F465}</span><span class="rank-name"><b>'+code+'</b>'+(act?' <span class="tag rec">ACTIVO</span>':'')+'</span>'+
      '<span class="rank-name" style="color:var(--dim); font-size:11px; flex:none;">'+nm+' jug.</span>'+
      '<span class="rank-score">'+num(myPts)+' pts</span>';
    d.onclick=function(){ ensureAudio(); sfxClick(); arena.activeGroup=code; saveArena(); renderArenaGroups(); renderSeason(); };
    list.appendChild(d);
  });
}

/* ---------- Temporadas ---------- */
function buildStandings(code, cb){
  var sk=seasonKey(); var gd=arena.groupData[code]||{members:{},pts:{}};
  var map={};
  Object.keys(gd.members||{}).forEach(function(u){
    var m=gd.members[u];
    map[u]={uid:u, name:m.name, avatar:m.avatar, wear:m.wear, pts:((gd.pts||{})[sk]||{})[u]||0};
  });
  fetchGroupRemote(code).then(function(remote){
    if(remote){
      if(remote.members) Object.keys(remote.members).forEach(function(u){
        if(!map[u]){ var m=remote.members[u]; map[u]={uid:u, name:m.name, avatar:m.avatar, wear:m.wear, pts:0}; }
      });
      if(remote.pts && remote.pts[sk]) Object.keys(remote.pts[sk]).forEach(function(u){
        if(map[u]){ map[u].pts=Math.max(map[u].pts, remote.pts[sk][u]||0); }
        else { map[u]={uid:u, name:"?", avatar:"\u{1F47D}", pts:remote.pts[sk][u]||0}; }
      });
    }
    var arr=Object.keys(map).map(function(k){return map[k];}).filter(function(e){ return e && e.name; });
    arr.sort(function(a,b){ return (b.pts||0)-(a.pts||0); });
    cb(arr);
  });
}
function renderSeason(){
  var sr=seasonRange(); var sk=seasonKey();
  $("arenaSeasonChip").textContent="D\u00EDa "+sr.prog+"/"+SEASON_DAYS;
  var code=arena.activeGroup;
  var list=$("arenaSeasonList"); list.innerHTML="";
  if(!code){
    $("arenaSeasonSub").textContent="Temporada "+sk+" \u00B7 termina en "+sr.days+" d\u00EDas \u00B7 crea o únete a un grupo para clasificar";
    list.innerHTML='<div class="center sub" style="padding:14px; color:var(--dim); font-size:12px;">La clasificación se calcula por grupo.</div>';
    return;
  }
  $("arenaSeasonSub").textContent="Grupo "+code+" \u00B7 Temporada "+sk+" \u00B7 quedan "+sr.days+" d\u00EDas";
  list.innerHTML='<div class="center sub" style="padding:14px; color:var(--dim); font-size:12px;">Cargando\u2026</div>';
  buildStandings(code, function(arr){
    list.innerHTML="";
    if(!arr.length){ list.innerHTML='<div class="center sub" style="padding:14px; color:var(--dim); font-size:12px;">Todavía sin puntos.</div>'; return; }
    var me=uid();
    var best=arr[0];
    $("arenaSeasonSub").textContent="Grupo "+code+" \u00B7 Temporada "+sk+" \u00B7 quedan "+sr.days+" d\u00EDas \u00B7 L\u00EDder: "+(best.pts>0?"\u{1F451} ":"")+best.name;
    arr.slice(0,50).forEach(function(e,i){
      var isMe=e.uid===me;
      var med=i<3?(" med"+(i+1)):"";
      list.innerHTML+='<div class="rank-row'+(isMe?" me":"")+'"><span class="rank-num'+med+'">'+(i+1)+'</span>'+
        '<span class="ava-stack'+(e.wear&&e.wear.bg?" "+e.wear.bg:"")+'">'+(e.wear?avaWearHtml(e.wear):"")+'<span class="wbase">'+esc(e.avatar||"\u{1F47D}")+'</span></span>'+
        '<span class="rank-name">'+(i===0&&e.pts>0?'\u{1F451} ':'')+esc(e.name||"An\u00F3nimo")+(isMe?' <span class="tag rec">T\u00DA</span>':'')+'</span>'+
        '<span class="rank-score">'+num(e.pts)+' pts</span></div>';
    });
  });
}
function avaWearHtml(w){
  if(!w) return "";
  var s="";
  if(w.hat) s+='<span class="wa wa-hat">'+esc(w.hat)+'</span>';
  if(w.cape) s+='<span class="wa wa-cape">'+esc(w.cape)+'</span>';
  if(w.fan) s+='<span class="wa wa-fan">'+esc(w.fan)+'</span>';
  return s;
}

/* ---------- Armario ---------- */
var WEAR = [
 {id:"hat-cone",  name:"Sombrero c\u00F3nico", icon:"\u{1F365}",          slot:"hat",  price:120, req:["lanterns",3]},
 {id:"fan-hand",  name:"Abanico de mano",       icon:"\u{1FAAD}",          slot:"fan",  price:150, req:["calligraphy",3]},
 {id:"cape-silk", name:"Banda de seda",         icon:"\u{1F9E3}",          slot:"cape", price:180, req:["drum",3]},
 {id:"bg-red",    name:"Laca roja",             icon:"\u{1F534}",          slot:"bg",   price:80,  req:null},
 {id:"bg-jade",   name:"Jade",                  icon:"\u{1F7E2}",          slot:"bg",   price:90,  req:null},
 {id:"bg-gold",   name:"Oro",                   icon:"\u{1F7E1}",          slot:"bg",   price:110, req:null}
];
function wearItem(id){ return WEAR.find(function(w){return w.id===id;})||null; }
function wearOwned(id){ return arena.wardrobe.owned.indexOf(id)>-1; }
function wearUnlock(id){ var it=wearItem(id); if(!it||!it.req) return false; var m=it.req[0]; return (arena.retosWon[m]||0)>=it.req[1]; }
function wearUnlocked(id){ return wearOwned(id)||wearUnlock(id); }
function equipWear(id){
  if(!wearUnlocked(id)) return;
  var it=wearItem(id); if(!it) return;
  if(arena.wardrobe[it.slot]===id){ arena.wardrobe[it.slot]=""; toast("Accesorio quitado","\u{1F47B}"); }
  else { arena.wardrobe[it.slot]=id; sfxGold(); toast(it.name+" equipado","\u{1F464}"); }
  saveArena();
  if(arena.activeGroup && arena.groupData[arena.activeGroup] && arena.groupData[arena.activeGroup].members[uid()]){
    arena.groupData[arena.activeGroup].members[uid()].wear=myWear();
    arena.groupData[arena.activeGroup].members[uid()].avatar=profile.avatar;
    if(FIREBASE_URL){ try{ fetch(FIREBASE_URL.replace(/\/$/,"")+"/arena/groups/"+arena.activeGroup+"/members/"+uid()+".json",{method:"PUT",body:JSON.stringify(arena.groupData[arena.activeGroup].members[uid()])}).catch(function(){}); }catch(e){} }
  }
  renderWardrobe(); renderArenaGroups(); renderSeason();
}
function buyWear(id){
  var it=wearItem(id); if(!it) return;
  if(wearOwned(id)){ equipWear(id); return; }
  if(wearUnlock(id)){ arena.wardrobe.owned.push(id); saveArena(); sfxGold(); toast(it.name+" desbloqueado por retos!","\u2B50"); equipWear(id); return; }
  if(coins<it.price){ toast("Te faltan monedas","\u{1FA99}","err"); sfxMiss(); return; }
  coins-=it.price; arena.wardrobe.owned.push(id); saveAll(); saveArena(); sfxGold(); sndPlay("buy");
  toast(it.name+" comprado","\u{1F464}"); equipWear(id);
}
function renderWardrobe(){
  $("wardrobeName").textContent=profile.name+" \u00B7 "+profile.avatar;
  var pv=$("wardrobePv");
  pv.className="ava-stack"+(arena.wardrobe.bg?" "+arena.wardrobe.bg:"");
  pv.innerHTML=avaWearHtml(myWear())+'<span class="wbase" style="font-size:26px;">'+esc(profile.avatar)+'</span>';
  var bg=$("wardrobeBase"); bg.innerHTML="";
  AVATARS.forEach(function(a){
    var d=document.createElement("div"); d.className="avatar-box"+(a===profile.avatar?" on":""); d.textContent=a;
    d.onclick=function(){ ensureAudio(); sfxClick(); profile.avatar=a; saveAll();
      if(arena.activeGroup&&arena.groupData[arena.activeGroup]&&arena.groupData[arena.activeGroup].members[uid()]){
        arena.groupData[arena.activeGroup].members[uid()].avatar=a; saveArena(); pushGroupRemote(arena.activeGroup);
      }
      renderWardrobe(); renderSeason(); };
    bg.appendChild(d);
  });
  var acc=$("wardrobeAcc"); acc.innerHTML="";
  WEAR.forEach(function(it){
    var owned=wearOwned(it.id), un=wearUnlocked(it.id), on=arena.wardrobe[it.slot]===it.id;
    var d=document.createElement("div");
    d.className="wear-item"+(on?" on":"")+(!un?" lock":"");
    var pm = owned ? (on? "Equipado" : "Usar") : (un ? "Todo tuyo" : "\u{1FA99} "+num(it.price));
    var req="";
    if(!un && it.req){ var mo=modeById(it.req[0]); req="Reto "+mo.short+": "+(arena.retosWon[it.req[0]]||0)+"/"+it.req[1]; }
    d.innerHTML='<div class="wi-ico">'+it.icon+'</div><div class="wi-nm">'+it.name+'</div>'+
      (req?'<div class="wi-req">'+req+'</div>':'<div class="wi-pm">'+pm+'</div>');
    d.onclick=function(){ ensureAudio(); sfxClick(); if(!un){ buyWear(it.id); } else { equipWear(it.id); } };
    acc.appendChild(d);
  });
}

/* ---------- Reto diario + temporada (puntos) ---------- */
function dailyArena(){ var k=todayKey(); if(!arena.days[k]) arena.days[k]={left:ARENA_ATTEMPTS,best:0,played:0,mode:ARENA_MODES[dayNum()%4].id}; return arena.days[k]; }
function modeWin(m){ var t={calligraphy:400,lanterns:600,coin:800,drum:700}; return t[m]||600; }
function tierPoints(sc){ if(sc>=2500)return 18; if(sc>=1500)return 12; if(sc>=800)return 8; if(sc>=300)return 4; return 2; }
function addSeasonPoints(pts){
  arena.groups.forEach(function(code){
    var gd=ensureGroup(code); var sk=seasonKey();
    gd.pts[sk][uid()]=(gd.pts[sk][uid()]||0)+pts;
  });
  saveArena();
  arena.groups.forEach(pushGroupRemote);
}
function renderArena(){
  renderWardrobe(); renderArenaGroups(); renderSeason();
  $("arenaCoins").textContent=num(coins);
  var day=dailyArena();
  var mode=modeById(day.mode);
  $("arenaModeIco").textContent=mode.icon;
  $("arenaModeName").textContent="Reto de hoy \u00B7 "+mode.name;
  $("arenaModeHint").textContent=mode.hint;
  $("arenaModeMeta").textContent="1 minuto \u00B7 intentos hoy: "+day.left+(day.best>0?" \u00B7 mejor "+num(day.best):"");
  var ads=$("arenaAttempts"); ads.innerHTML="";
  for(var i=0;i<ARENA_ATTEMPTS;i++){ var sp=document.createElement("i"); if(i<day.left) sp.className="on"; ads.appendChild(sp); }
  var btn=$("arenaPlay");
  btn.disabled = day.left<=0;
  btn.textContent = day.left>0 ? (mode.short+"  Jugar el reto") : "Sin intentos";
  var next=$("arenaNext");
  if(day.left<=0){ next.innerHTML="\u23F0 Cuenta regresiva: <span class='countdown' id='arenaCD'>"+fmtCD(nextMidnight()-Date.now())+"</span>"; }
  else { next.innerHTML="Se reinicia a medianoche. Solo cuenta tu mejor puntaje de hoy."; }
}
var cdInt=null;
function armCountdown(){
  if(cdInt) return;
  cdInt=setInterval(function(){
    var s=$("screen-arena");
    if(!s || (!s.classList.contains("on") && !$("screen-aresult").classList.contains("on"))) return;
    var day=dailyArena();
    if(day.left<=0){
      var cd=$("arenaCD");
      if(cd) cd.textContent=fmtCD(nextMidnight()-Date.now());
      var lg=$("aresAgain");
      if(lg && lg.offsetParent) lg.textContent="\u23F0 Sin intentos. EL nuevo reto llega a las 00:00 ("+fmtCD(nextMidnight()-Date.now())+")";
    }
  },1000);
}
armCountdown();

/* ---------- Entrada Arena ---------- */
function arenaPointerDown(p){ GS.pressing=true; GS.px=p.x; GS.py=p.y;
  if(GS.mode==="lanterns") lanternsTap(p);
  else if(GS.mode==="coin") coinTap();
  else if(GS.mode==="drum") drumTap(p);
}
function arenaPointerMove(ev){
  if(!GS.pressing||!running) return;
  var rect=cv.getBoundingClientRect();
  var x,y;
  if(rect.width>0){ x=(ev.clientX-rect.left)*(cv.width/rect.width); y=(ev.clientY-rect.top)*(cv.height/rect.height); }
  else { x=ev.clientX; y=ev.clientY; }
  GS.px=x; GS.py=y;
  if(GS.mode==="calligraphy") calliMove({x:x,y:y});
}
function arenaPointerUp(){ if(GS) GS.pressing=false; }

/* ---------- Inicio / fin de reto ---------- */
function startArena(mode){
  ensureAudio();
  var day=dailyArena();
  if(day.left<=0){ toast("Sin intentos hoy; vuelve a medianoche","\u23F0","err"); return; }
  day.left--; day.mode=mode; saveArena();
  GS={ mode:mode, id:"arena", lv:{pt:"spark",target:"#ffd643"}, score:0, combo:0, bestCombo:0, fails:0,
       time:ARENA_TIME, timeMax:ARENA_TIME, parts:[], pressing:false, px:0, py:0, streak:0, flashT:0 };
  var m=modeById(mode);
  if(mode==="calligraphy") GS.calli=newCalli();
  else if(mode==="lanterns") GS.lans={items:[], t:0.3, sp:0.9, missedSt:0};
  else if(mode==="coin") GS.coin={rot:0, v:5+rnd(0,2.5), stop:null, settle:0, golden:ri(0,11), zone:0, resTxt:""};
  else if(mode==="drum") GS.drum={t:0, beat:0.38+rnd(0,0.22), notes:[], flashT:0};
  show("game"); setCvSize();
  $("hudLevel").textContent="RETO ARENA \u00B7 "+m.name;
  $("hudGoal").textContent="";
  cv.addEventListener("pointermove", arenaPointerMove, {passive:true});
  window.addEventListener("pointerup", arenaPointerUp);
  window.addEventListener("pointercancel", arenaPointerUp);
  running=true; lastT=performance.now(); raf=requestAnimationFrame(loop);
  try{ if(window.MUSIC && MUSIC.play) MUSIC.play("party"); }catch(e){}
}
function finishArena(){
  running=false; cancelAnimationFrame(raf); raf=0;
  GS.pressing=false;
  cv.removeEventListener("pointermove", arenaPointerMove);
  window.removeEventListener("pointerup", arenaPointerUp);
  window.removeEventListener("pointercancel", arenaPointerUp);
  try{ if(window.MUSIC && MUSIC.stop) MUSIC.stop(); }catch(e){}
  var g=GS, score=Math.floor(g.score);
  var k=todayKey(); var day=dailyArena();
  var isNewBest=score>day.best;
  if(isNewBest) day.best=score;
  day.played=(day.played||0)+1;
  var won=score>=modeWin(g.mode);
  if(won) arena.retosWon[g.mode]=(arena.retosWon[g.mode]||0)+1;
  if(arena.daysDone.indexOf(k)===-1) arena.daysDone.push(k);
  var pts=tierPoints(score);
  arena.lastMode=g.mode; arena.lastScore=score; arena.lastWon=won; arena.isNewBest=isNewBest; arena.pendingPts=pts;
  var cg=Math.max(5,Math.floor(score/60));
  coins+=cg; totalEarned+=cg;
  saveArena(); saveAll();
  unlock("arena");
  if(won) unlock("arenastar");
  if(arena.daysDone.length>=3) unlock("arenaday");
  addSeasonPoints(pts);
  if(FIREBASE_URL){
    try{
      fetch(FIREBASE_URL.replace(/\/$/,"")+"/arena/daily/"+k+"/"+uid()+".json",
        {method:"PUT",body:JSON.stringify({uid:uid(),name:profile.name,avatar:profile.avatar,score:score,ts:Date.now(),mode:g.mode})}).catch(function(){});
    }catch(e){}
  }
  refreshMenuCoins();
  showArenaResult();
}
function showArenaResult(){
  var mode=modeById(arena.lastMode);
  $("aresModeIco").textContent=mode.icon;
  $("aresHead").textContent = arena.lastWon ? "¡Reto completado!" : (arena.lastScore>0 ? "¡Buen intento!" : "Se acabó el tiempo");
  $("aresSub").textContent=mode.name;
  $("aresScore").textContent=num(arena.lastScore);
  var day=dailyArena();
  $("aresPts").textContent="+"+arena.pendingPts;
  $("aresBest").textContent = arena.isNewBest ? ("¡Nuevo récord! "+num(day.best)) : num(day.best);
  $("aresLeft").textContent = day.left;
  $("aresStreak").textContent = arena.lastWon ? "+\u{1F525}" : "-";
  var again=$("aresAgain"); var btn=$("aresRetry");
  if(day.left>0){ again.textContent="Tienes "+day.left+" "+(day.left===1?"intento más":"intentos más")+" de hoy.";
    btn.disabled=false; btn.textContent="\u21BB Reintentar ("+day.left+")"; }
  else { again.textContent="\u23F0 Sin intentos. EL nuevo reto llega a las 00:00 ("+fmtCD(nextMidnight()-Date.now())+")";
    btn.disabled=true; btn.textContent="\u21BB Reintentar"; }
  show("aresult");
  if(arena.lastWon && typeof celebrate==="function") celebrate(false);
}

/* ---------- Handlers UI Arena ---------- */
$("btnArena").addEventListener("click", function(){ sfxClick(); renderArena(); show("arena"); });
$("arenaBack").addEventListener("click", function(){ sfxClick(); goMenu(); });
$("arenaJoin").addEventListener("click", function(){ ensureAudio(); sfxClick(); var v=$("arenaJoinIn").value; if(v){ joinGroup(v,false); $("arenaJoinIn").value=""; } else { toast("Escribe el código del grupo","\u26A0","err"); } });
$("arenaJoinIn").addEventListener("keypress", function(e){ if(e.key==="Enter") $("arenaJoin").click(); });
$("arenaCreate").addEventListener("click", function(){ ensureAudio(); sfxClick(); createGroup(); });
$("arenaPlay").addEventListener("click", function(){ ensureAudio(); sfxClick(); startArena(dailyArena().mode); });
$("aresRetry").addEventListener("click", function(){ ensureAudio(); sfxClick(); startArena(arena.lastMode); });
$("aresMenu").addEventListener("click", function(){ ensureAudio(); sfxClick(); renderArena(); show("arena"); });