/* Op-Art Fan - modulo: js/core/game.js */

"use strict";

/* ---------- Iniciar partida ---------- */
function startGame(id){
  ensureAudio();
  var eq=equipped.slice();
  session.activeNow=[];
  eq.forEach(function(eid){
    if(inventory[eid]>0){ inventory[eid]--; session.activeNow.push(eid); if(inventory[eid]===0){ equipped=equipped.filter(function(x){return x!==eid;}); } }
  });
  saveAll(); renderBadges();
  if(id==="daily" && !dailyDef["daily"]) generateDaily();
  var lv=levelDef(id) || dailyDef["daily"];
  var addT=0; if(hasActive("time5"))addT+=5; if(hasActive("time10"))addT+=10;
  GS={
    mode:"fan", id:id, lv:lv, score:0, combo:0, bestCombo:0, fails:0, trapsHit:0, hits:0, catches:0, golds:0, missed:0,
    goal:lv.goal, time:lv.time+addT, timeMax:lv.time+addT, oscAmp:0.14+0.12*0, oscPhase:Math.random()*6, oscW:1.2,
    wind:[], parts:[], targets:[], spirit:null, fx:[], decT:Math.random()*100, fogT:0,
    spawnAcc:lv.boss?999:1.2, ghost:null, windInt:0, diffT:0,
    usedRevive:false, forgiven:false, pbShown:false, pbStart:pb[id]||0, detNext:null
  };
  if(lv.boss){ spawnSpirit(true); }
  show("game"); setCvSize(); prerender();
  $("hudLevel").textContent = lv.name;
  $("hudGoal").textContent = "/ "+num(lv.goal);
  running=true; lastT=performance.now(); raf=requestAnimationFrame(loop);
  // musica de la familia del nivel + precarga de mas fondos en segundo plano
  try{ if(window.MUSIC && MUSIC.play) MUSIC.play(famOf(lv)); }catch(e){}
  try{ if(window.AssetBank && AssetBank.demand){
    var nxt=[id+1,id+2].filter(function(i){return i<=18;});
    AssetBank.demand([id].concat(nxt));
  } }catch(e){}
}
function spawnSpirit(reset){
  GS.spirit={ring:ri(2,5), seg:ri(0,RINGS[ri(2,5)]-1), move:null, escT: reset?(GS.lv.boss2?0.7:1.1):GS.lv.esp, was:null};
}
function loop(t){
  if(!running) return;
  var dt=Math.min(0.05,(t-lastT)/1000); lastT=t;
  update(dt);
  if(running){ render(); raf=requestAnimationFrame(loop); }
}

/* ---------- Lógica ---------- */
function update(dt){
  if(GS.mode && GS.mode!=="fan"){ updateArena(dt); return; }
  var g=GS, lv=g.lv;
  g.D = clamp(g.score/g.goal, 0, 1);
  var slow = hasActive("slowswing")?0.5:1;
  g.oscW = (1.1 + g.D*2.7) * slow * (lv.osc||1);
  g.oscPhase += dt*g.oscW;
  g.oscAmp = 0.13 + g.D*0.12 + (lv.wind||0)*0.05;
  osc = g.oscAmp*Math.sin(g.oscPhase);
  if(lv.bhv==="tremor"){ osc += (Math.random()-0.5)*g.oscAmp*1.1; }
  g.fogT += dt;
  g.decT += dt;
  updateDecor(dt);

  g.time -= dt;
  if(g.time<=0){
    if(hasActive("revive") && !g.usedRevive){ g.usedRevive=true; g.time+=5; g.timeMax+=5; flash("gold"); sfxGold(); toast("¡Revivir! +5 segundos","\u{1F4AB}"); }
    else { finishGame(false); return; }
  }

  if(!lv.boss){
    var inter = Math.max(0.38, lv.interval*(1-0.55*g.D));
    if(hasActive("detector") && !g.ghost && g.spawnAcc > inter*0.6 && g.targets.length < maxSimulNow()){
      var gc=pickCell(); g.ghost={ring:gc.ring, seg:gc.seg};
    }
    g.spawnAcc += dt;
    if(g.spawnAcc>=inter && g.targets.length < maxSimulNow()){
      var cell = g.ghost? {ring:g.ghost.ring, seg:g.ghost.seg} : pickCell();
      g.ghost=null;
      spawnTarget(cell.ring, cell.seg);
      g.spawnAcc=0;
    } else if(g.ghost && g.targets.length>=maxSimulNow()){
      g.ghost=null;
    }
    // viento
    g.windInt += dt * (0.35 + g.D*6.5) * (lv.wind||0);
    if(g.windInt>=1 && g.D>0.03){ g.windInt%=1; gust(); }
    if((lv.wind||0)>0 && g.D>0.05 && Math.random()<dt*g.D*8*(lv.wind||0)) gust();
  } else {
    // espíritu
    var s=g.spirit;
    if(s){
      if(s.move){
        s.move.t += dt/0.38;
        if(s.move.t>=1){ s.ring=s.move.to.r; s.seg=s.move.to.s; s.move=null; }
      } else {
        s.escT -= dt;
        if(s.escT<=0){ moveSpirit(); s.escT=g.lv.esp; }
      }
    }
  }

  // targets
  for(var i=g.targets.length-1;i>=0;i--){ var t=g.targets[i]; t.t+=dt; if(t.t>t.life){ g.targets.splice(i,1); g.missed++; } }
  // partículas
  for(var j=g.parts.length-1;j>=0;j--){ var p=g.parts[j]; p.t-=dt; if(p.t<=0){ g.parts.splice(j,1); continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.96; p.vy*=0.96; }
  // viento partículas
  for(var k=g.wind.length-1;k>=0;k--){ var wp=g.wind[k]; wp.r+=wp.sp*dt; if(wp.r> R*1 + 180){ g.wind.splice(k,1); } }

  // niveles de dificultad → toasts
  var lvls=[0.25,0.5,0.75,1];
  if(lvls[g.diffT]!==undefined && g.D>=lvls[g.diffT]){ g.diffT++; sfxClick(); toast("¡El viento se levanta! Nivel "+(g.diffT+1),"",""); }

  // récord personal durante el juego
  if(!g.pbShown && g.pbStart>0 && g.score>g.pbStart){
    g.pbShown=true; flash("gold"); sfxGold(); unlock("record");
    var pf=$("pbFloat"); pf.textContent="\u{2B50} ¡Nuevo récord personal!"; pf.classList.remove("up"); void pf.offsetWidth; pf.classList.add("up");
    toast("¡Vas batir tu récord!","\u{2B50}");
  }

  // victoria
  if(!lv.boss && g.score>=g.goal){ finishGame(true); }
  else if(lv.boss && g.catches>=g.goal){ finishGame(true); }

  // HUD
  $("hudScore").textContent = num(g.score);
  var fill=$("timeFill"); fill.style.width = clamp(g.time/g.timeMax*100,0,100)+"%";
  var cb=$("comboBadge");
  if(g.combo>1){ cb.textContent="x"+Math.min(g.combo,20); cb.style.display="block"; } else { cb.style.display="none"; }
}
var lastT=0;
function maxSimulNow(){ return Math.min(6, (GS.lv.simul||1) + Math.floor(GS.D*2.5)); }
function pickCell(){
  for(var tries=0; tries<40; tries++){
    var ring=ri(0,5); var n=RINGS[ring]; var seg=ri(0,n-1);
    var occ=GS.targets.some(function(t){ return t.ring===ring && t.seg===seg; });
    if(GS.ghost && GS.ghost.ring===ring && GS.ghost.seg===seg) occ=true;
    if(!occ) return {ring:ring, seg:seg};
  }
  return {ring:ri(4,5), seg:ri(0,RINGS[4]-1)};
}
function spawnTarget(ring, seg){
  var lv=GS.lv;
  var r=Math.random();
  var kind = r < lv.trap ? "trap" : (r < lv.trap + (lv.gold||0) ? "gold" : "n");
  var life = Math.max(0.7, 1.55 - GS.D*0.5);
  GS.targets.push({ring:ring, seg:seg, kind:kind, t:0, life:life, born:GS.score});
  if(lv.bhv==="pairs" && Math.random()<0.5 && GS.targets.length < Math.min(6, maxSimulNow())){
    var c=pickFree(ring, seg);
    if(c){ GS.targets.push({ring:c.ring, seg:c.seg, kind:(Math.random()<0.12?"gold":"n"), t:0, life:life, born:GS.score}); }
  }
}
function pickFree(avoidRing, avoidSeg){
  for(var tries=0;tries<40;tries++){
    var ring=ri(0,5), n=RINGS[ring], seg=ri(0,n-1);
    if(ring===avoidRing && seg===avoidSeg) continue;
    var occ=GS.targets.some(function(t){ return t.ring===ring && t.seg===seg; });
    if(!occ) return {ring:ring, seg:seg};
  }
  return null;
}
function gust(){
  var lv=GS.lv;
  var nR=2+ri(0,2);
  for(var i=0;i<nR;i++){
    var a=Math.PI + Math.random()*Math.PI;
    GS.wind.push({a:a, r:R*0.82+Math.random()*R*0.18, sp:150+rnd(0,120), len:26+rnd(0,30), c:lv.target, w:0.5+Math.random()*0.6});
  }
}
function moveSpirit(){
  var s=GS.spirit; if(!s) return;
  var nr = clamp(s.ring + [-1,0,0,1][ri(0,3)], 2, 5);
  var n=RINGS[nr];
  var ns=(s.seg + (Math.random()<0.5?-1:1)+n)%n;
  if(s.was && s.was.r===nr && s.was.s===ns){ ns=(ns+2)%n; }
  s.was={r:s.ring, s:s.seg};
  s.move={from:{r:s.ring,s:s.seg}, to:{r:nr,s:ns}, t:0};
}

/* ---------- Entrada ---------- */
function tapXY(ev){
  var rect=cv.getBoundingClientRect();
  var x=(ev.clientX-rect.left)*(cv.width/rect.width);
  var y=(ev.clientY-rect.top)*(cv.height/rect.height);
  return {x:x,y:y};
}
cv.addEventListener("pointerdown", function(ev){
  if(!running||!GS) return;
  ensureAudio();
  var p=tapXY(ev);
  if(GS.mode && GS.mode!=="fan"){ arenaPointerDown(p); return; }
  if(GS.lv.boss){ tapBoss(p.x,p.y); }
  else { tapNormal(p.x,p.y); }
});
function hitCell(x,y){
  var dx=x-cx, dy=y-cy;
  var r=Math.hypot(dx,dy);
  if(r>R+14 || r<rw*0.3) return null;
  var a=Math.atan2(dy,dx)-osc;
  while(a<0)a+=TAU; while(a>=TAU)a-=TAU;
  if(a<Math.PI || a>=TAU) return null;
  var ring=clamp(Math.floor(r/rw),0,5);
  var seg=Math.floor((a-Math.PI)/(Math.PI/RINGS[ring]));
  if(seg<0)seg=0; if(seg>=RINGS[ring])seg=RINGS[ring]-1;
  return {ring:ring, seg:seg, a:a, r:r};
}
function cellCenter(ring,seg){
  var cw=Math.PI/RINGS[ring];
  var rm=rw*ring+rw*0.5;
  var am=Math.PI+(seg+0.5)*cw+osc;
  return {x:cx+Math.cos(am)*rm, y:cy+Math.sin(am)*rm, am:am, rm:rm};
}
function tapNormal(x,y){
  var h=hitCell(x,y); if(!h) return;
  var wide=hasActive("widezone");
  var idx=-1;
  for(var i=0;i<GS.targets.length;i++){
    var t=GS.targets[i];
    if(t.ring===h.ring && t.seg===h.seg){ idx=i; break; }
  }
  if(idx<0 && wide){
    for(var k=0;k<GS.targets.length;k++){
      var tt=GS.targets[k];
      var cw=Math.PI/RINGS[tt.ring];
      var ctr=cellCenter(tt.ring,tt.seg);
      var da=Math.abs(h.a-(Math.PI+(tt.seg+0.5)*cw));
      if(da>Math.PI) da=TAU-da;
      if(da<=cw*0.9 && Math.abs(h.r-ctr.rm)<=rw*0.85){ idx=k; break; }
    }
  }
  if(idx>=0){ resolveHit(GS.targets[idx]); } 
  else { gsFail(); }
}
function resolveHit(t){
  var g=GS, lv=g.lv;
  var ctr=cellCenter(t.ring,t.seg);
  g.targets.splice(g.targets.indexOf(t),1);
  if(t.kind==="trap"){ g.trapsHit++; g.fails++; applyPenalty(8,200,"\u2620 ¡Trampa! -8s -200pts"); return; }
  g.combo++; g.bestCombo=Math.max(g.bestCombo,g.combo);
  var mult=Math.min(g.combo,20);
  var pts = t.kind==="gold" ? 120*mult : 10*mult;
  if(hasActive("pointx2")) pts*=2;
  g.score=Math.floor(g.score+pts);
  if(t.kind==="gold"){ g.golds++; sfxGold(); flash("gold"); } else { sfxHit(g.combo); }
  vibrate(50); bump();
  burst(ctr.x,ctr.y, t.kind==="gold"?lv.target:lv.target, 12+(g.combo>10?6:0));
  if(g.combo===20) unlock("combo20");
  if(g.hits+g.catches>=25) unlock("veloz");
  g.hits++;
  g.detNext=null;
}
function gsFail(){
  var g=GS;
  if(hasActive("missforgive") && !g.forgiven){ g.forgiven=true; sfxClick(); toast("Perdón de falla usado","\u{1F497}",null,1500); return; }
  g.fails++;
  g.combo = hasActive("comboshield") ? Math.max(1,Math.ceil(g.combo/2)) : 1;
  g.score=Math.max(0,g.score-50);
  g.time-=2;
  flash("red"); sfxMiss(); vibrate(80);
  toast("Fallo: -50pts -2s","\u274C","err",1400);
}
function applyPenalty(ts, ps, msg){
  var g=GS;
  g.time=Math.max(0, g.time-ts);
  g.score=Math.max(0,g.score-ps);
  g.combo = hasActive("comboshield") ? Math.max(1,Math.ceil(g.combo/2)) : 1;
  flash("red"); sfxTrap(); vibrate([120,60,120]);
  toast(msg,"\u2620","err",1800);
}
function tapBoss(x,y){
  var h=hitCell(x,y); if(!h) return;
  var s=GS.spirit; if(!s) return;
  var cw=Math.PI/RINGS[s.ring];
  var wide=hasActive("widezone");
  var ok = h.ring===s.ring && h.seg===s.seg;
  if(!ok && wide){
    var ctr=cellCenter(s.ring,s.seg);
    var da=Math.abs(h.a-(Math.PI+(s.seg+0.5)*cw)); if(da>Math.PI)da=TAU-da;
    if(da<=cw*0.95 && Math.abs(h.r-ctr.rm)<=rw*0.9) ok=true;
  }
  if(!ok){ gsFail(); return; }
  // atrapado
  var g=GS;
  var ctr=cellCenter(s.ring,s.seg);
  g.combo++; g.bestCombo=Math.max(g.bestCombo,g.combo);
  var mult=Math.min(g.combo,20);
  var pts=25*mult; if(hasActive("pointx2"))pts*=2;
  g.score=Math.floor(g.score+pts);
  g.catches++;
  sfxGold(); vibrate([40,40,80]); bump();
  burst(ctr.x,ctr.y, g.lv.target, 20);
  spawnSpirit(true);
}
function burst(x,y,col,n){
  var skin=skinById(activeSkin);
  var col2 = hasActive("goldpart") ? "#ffd83d" : (hasActive("rainpart") ? ["#ff4d4d","#ffd83d","#3dff6e","#2ee6ff","#c86bff"][ri(0,4)] : col);
  var ptype = (GS.lv.pt || skin.part) || "spark";
  for(var i=0;i<n;i++){
    var a=Math.random()*TAU, sp=rnd(60,260);
    GS.parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:rnd(0.35,0.8),col:col2,type:ptype,rot:Math.random()*TAU});
  }
}

function spawnDec(dec){
  var g=GS, w=cv.width, h=cv.height;
  if(dec==="petals"){
    g.fx.push({dec:"petals", x:Math.random()*w*1.1, y:-12, vx:-6-Math.random()*14, vy:14+Math.random()*22, rot:0, spin:(Math.random()<0.5?-1:1)*(1.5+Math.random()*3), r:3.5, t:0, life:99, alpha:0.85, col:"#ff9ec4"});
  } else if(dec==="ink"){
    g.fx.push({dec:"ink", x:30+Math.random()*(w-60), y:h-4, vy:12+Math.random()*16, vx:0, phase:Math.random()*6, r:6+Math.random()*10, grow:20, t:0, life:99, alpha:0.18, col:"#3a352c"});
  } else if(dec==="smoke"){
    g.fx.push({dec:"smoke", x:24+Math.random()*w*0.55, y:h-4, vy:14+Math.random()*18, vx:0, phase:Math.random()*6, r:10+Math.random()*14, grow:26, t:0, life:99, alpha:0.11, col:"#efe9d8"});
  } else if(dec==="koi"){
    var dir = Math.random()<0.5?-1:1;
    g.fx.push({dec:"koi", x: dir<0? w+40 : -40, y:h*0.12+Math.random()*h*0.5, vx: dir*(34+Math.random()*26), vc:1, phase:Math.random()*6, r:8, t:0, life:99, alpha:0.5, col:"#ff8a3d"});
  } else if(dec==="sparks"){
    g.fx.push({dec:"sparks", x:8+Math.random()*(w-16), y:h*0.72, vy:8+Math.random()*18, vx:(Math.random()-0.5)*22, phase:Math.random()*6, r:2.4, t:0, life:0.7+Math.random()*0.7, alpha:0.9, col: Math.random()<0.5?"#ffd643":"#ff8a3d"});
  } else if(dec==="lantern"){
    var lx= Math.random()<0.5? w+30 : -30;
    g.fx.push({dec:"lantern", x:lx, y:h*(0.18+Math.random()*0.5), vx:(lx>0?-1:1)*(16+Math.random()*14), vy:(Math.random()-0.5)*8, phase:Math.random()*6, r:8+Math.random()*5, t:0, life:99, alpha:0.75, col:"#ff5f3a"});
  } else if(dec==="waves"){
    g.fx.push({dec:"waves", x:-40, y:h*0.2+Math.random()*h*0.35, vx:60+Math.random()*80, phase:Math.random()*6, r:6+Math.random()*5, t:0, life:99, alpha:0.22, col:"#bfe6d8"});
  } else if(dec==="firew"){
    g.fx.push({dec:"firew", x:30+Math.random()*w*0.7, y:16+Math.random()*h*0.3, r:4, grow:110, phase:Math.random()*6, t:0, life:0.5, alpha:0.8, col:g.lv.target});
  }
}
function updateDecor(dt){
  var g=GS, lv=g.lv;
  var dec=lv.dec||"none";
  if(dec==="none") return;
  var w=cv.width, h=cv.height;
  var cap = (dec==="petals"||dec==="sparks") ? 45 : 24;
  if(dec==="mist"){
    var mk=Math.floor(g.decT*1.4);
    if(mk!==g._decMist && g.fx.length<4){
      g._decMist=mk;
      g.fx.push({dec:"mist", x:(Math.random()<0.5?-60:w+60), y:h*(0.15+Math.random()*0.5), vx:(Math.random()<0.5?1:-1)*(8+Math.random()*10), r:h*(0.05+Math.random()*0.09), t:0, life:999, alpha:0.07, col:"#eef3ff"});
    }
  } else {
    var acc = (dec==="ink"||dec==="smoke")?0.9:(dec==="waves"||dec==="koi")?0.7:1;
    g.decAcc=(g.decAcc||0)+dt*acc;
    if(dec==="firew") g.decAcc=(g.decAcc||0)+dt*2.2;
    var need = g.fx.length<cap ? Math.ceil(g.decAcc) : 0;
    if(need>0){ g.decAcc%=1; spawnDec(dec); }
  }
  for(var i=g.fx.length-1;i>=0;i--){
    var f=g.fx[i];
    f.t+=dt;
    if(f.dec==="petals"){ f.x+=f.vx*dt; f.y+=f.vy*dt; f.rot+=f.spin*dt; if(f.y>h+20) g.fx.splice(i,1); }
    else if(f.dec==="ink"||f.dec==="smoke"){ f.y-=f.vy*dt; f.x+=Math.sin(f.t*1.5+f.phase)*10*dt; f.r+=f.grow*dt; if(f.y<-30||f.r>R*0.7) g.fx.splice(i,1); }
    else if(f.dec==="koi"){ f.x+=f.vx*dt*f.vc; f.phase+=dt*6; if(f.x<-60||f.x>w+60) g.fx.splice(i,1); }
    else if(f.dec==="sparks"){ f.y-=f.vy*dt; f.vy*=0.985; if(f.t>f.life) g.fx.splice(i,1); }
    else if(f.dec==="lantern"){ f.x+=f.vx*dt; f.y+=f.vy*dt+f.phase*0.0; f.phase+=dt*3; if(f.y<-40||f.x<-40||f.x>w+40) g.fx.splice(i,1); }
    else if(f.dec==="waves"){ f.x+=f.vx*dt; f.phase+=dt*5; if(f.x>w*1.6) g.fx.splice(i,1); }
    else if(f.dec==="mist"){ f.x+=f.vx*dt; if(f.vx>0 && f.x>w+100) f.x=-w-100; if(f.vx<0 && f.x<-w-100) f.x=w+100; }
    else if(f.dec==="firew"){ f.r+=f.grow*dt; if(f.r>R*0.55) g.fx.splice(i,1); }
  }
}
function drawDecor(){
  var g=GS; if(!g) return;
  var x0,yy0;
  g.fx.forEach(function(f){
    var a0=f.alpha||1;
    if(f.dec==="petals"){
      ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.rot);
      ctx.globalAlpha=Math.min(1,a0); ctx.fillStyle=f.col;
      ctx.beginPath(); ctx.ellipse(0,0,f.r,f.r*0.5,0,0,TAU); ctx.fill();
      ctx.restore();
    } else if(f.dec==="ink"||f.dec==="smoke"){
      var a=Math.sin(Math.min(1,f.t*0.5))*a0;
      ctx.fillStyle=f.dec==="ink"?"rgba(40,36,30,"+a+")":"rgba(232,238,230,"+a+")";
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill();
    } else if(f.dec==="koi"){
      var wig=Math.sin(f.phase)*4;
      ctx.strokeStyle="rgba(255,138,61,.5)"; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(f.x-10,f.y+wig*0.3);
      ctx.quadraticCurveTo(f.x, f.y-wig, f.x+12, f.y-wig*1.2);
      ctx.stroke();
      ctx.fillStyle="rgba(255,190,120,.6)"; ctx.fillRect(f.x+12,f.y-2,5,1);
    } else if(f.dec==="sparks"){
      ctx.globalAlpha=a0*Math.max(0,Math.min(1,1-f.t));
      ctx.fillStyle=f.col; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill();
    } else if(f.dec==="lantern"){
      var pul=0.7+0.3*Math.sin(f.phase);
      var lg=ctx.createRadialGradient(f.x,f.y,1,f.x,f.y,f.r*2.4);
      lg.addColorStop(0,"rgba(255,140,70,"+(0.55*pul)+")"); lg.addColorStop(1,"rgba(255,140,70,0)");
      ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*2.4,0,TAU); ctx.fill();
      ctx.fillStyle="rgba(255,200,120,.9)";
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill();
      ctx.fillStyle="rgba(255,235,190,.9)"; ctx.fillRect(f.x-f.r*0.5,f.y-f.r*0.35,f.r,2);
    } else if(f.dec==="waves"){
      ctx.strokeStyle="rgba(190,230,214,.26)"; ctx.lineWidth=2;
      ctx.beginPath();
      for(var wx=0;wx<40;wx++){
        var xx=f.x+wx*14;
        var yy=f.y+Math.sin(xx*0.03+f.phase)*7;
        if(wx===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
      }
      ctx.stroke();
    } else if(f.dec==="mist"){
      var mg=ctx.createRadialGradient(f.x,f.y,1,f.x,f.y,f.r*2);
      mg.addColorStop(0,"rgba(238,243,255,"+a0+")"); mg.addColorStop(1,"rgba(238,243,255,0)");
      ctx.fillStyle=mg; ctx.beginPath(); ctx.ellipse(f.x,f.y,f.r*2,f.r*0.6,0,0,TAU); ctx.fill();
    } else if(f.dec==="firew"){
      var tt=Math.max(0.0001,f.t/f.life);
      var al=Math.sin(Math.min(1,tt)*Math.PI)*a0;
      ctx.strokeStyle=f.col; ctx.globalAlpha=al*0.8; ctx.lineWidth=1.6;
      for(var fi2=0;fi2<14;fi2++){
        var aa=fi2/14*TAU+f.phase;
        ctx.beginPath(); ctx.moveTo(f.x,f.y);
        ctx.lineTo(f.x+Math.cos(aa)*f.r*(0.25+0.75*tt), f.y+Math.sin(aa)*f.r*(0.25+0.75*tt));
        ctx.stroke();
      }
      if(al>0.5){ ctx.fillStyle=f.col; ctx.globalAlpha=al; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*0.2*(1-tt),0,TAU); ctx.fill(); }
    }
  });
  ctx.globalAlpha=1;
}
function drawFog(){
  var g=GS; if(!g) return;
  var lv=g.lv;
  if(lv.bhv==="fog"){
    var h=cv.height;
    var fg=ctx.createLinearGradient(0,h*0.2,0,h);
    var a=0.10*(0.7+0.3*Math.sin(g.fogT*1.3));
    fg.addColorStop(0,"rgba(240,248,244,0)");
    fg.addColorStop(0.5,"rgba(240,248,244,"+a+")");
    fg.addColorStop(1,"rgba(240,248,244,0)");
    ctx.fillStyle=fg; ctx.fillRect(0,h*0.2,cv.width,h*0.8);
  }
}

/* ---------- Render ---------- */
function render(){
  if(GS.mode && GS.mode!=="fan"){ renderArenaScene(); return; }
  ctx.drawImage(bgOff,0,0);
  // abanico rotado
  ctx.save();
  ctx.translate(cx,cy); ctx.rotate(osc);
  ctx.drawImage(fanOff,-cx,-cy);
  ctx.restore();
  drawDecor();
  // ghost del detector
  if(GS.ghost && hasActive("detector")){
    var cw=Math.PI/RINGS[GS.ghost.ring];
    var r0=rw*GS.ghost.ring, r1=rw*(GS.ghost.ring+1);
    var a0=Math.PI+GS.ghost.seg*cw+osc, a1=a0+cw;
    ctx.fillStyle="rgba(255,255,255,.10)";
    wedgePath(ctx,r0,r1,a0,a1); ctx.fill();
  }
  if(!GS.lv.boss){
    GS.targets.forEach(drawTarget);
  } else {
    drawSpirit();
  }
  // viento (se gira con abanico visualmente)
  GS.wind.forEach(function(w){
    ctx.strokeStyle=w.c; ctx.globalAlpha=w.w*0.5; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(w.a+osc*0.5)*w.r, cy+Math.sin(w.a+osc*0.5)*w.r);
    ctx.lineTo(cx+Math.cos(w.a+osc*0.5)*(w.r+w.len), cy+Math.sin(w.a+osc*0.5)*(w.r+w.len));
    ctx.stroke();
    ctx.globalAlpha=1;
  });
  // partículas
  GS.parts.forEach(drawPart);
  drawFog();
}
function mixCol(hex, f){
  var c=hex.replace("#","");
  if(c.length===3) c=c.replace(/(.)/g,"$1$1");
  var n=parseInt(c,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  var t=f>0?255:0; var m=Math.min(1,Math.abs(f));
  r=Math.round(r+(t-r)*m); g=Math.round(g+(t-g)*m); b=Math.round(b+(t-b)*m);
  return "rgb("+r+","+g+","+b+")";
}
function drawTarget(t){
  var cw=Math.PI/RINGS[t.ring];
  var r0=rw*t.ring, r1=rw*(t.ring+1);
  var a0=Math.PI+t.seg*cw+osc, a1=a0+cw;
  var col = t.kind==="trap" ? "#ff4757" : (t.kind==="gold" ? "#ffd83d" : GS.lv.target);
  var puls=0.55+0.45*Math.sin(t.t*14);
  // cuña "elevada" en 2.5D
  var lift=rw*0.12;
  var hb0=Math.max(rw*0.32, r0-lift), hb1=r1+lift*0.85;
  var rm=(hb0+hb1)/2, am=(a0+a1)/2;
  var xm=cx+Math.cos(am)*rm, ym=cy+Math.sin(am)*rm;
  // sombra proyectada
  ctx.save();
  ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=14*puls+8; ctx.shadowOffsetY=9;
  ctx.fillStyle="rgba(0,0,0,.16)";
  wedgePath(ctx,hb0,hb1,a0,a1); ctx.fill();
  ctx.restore();
  // cuerpo con gradiente vertical
  var gr=ctx.createLinearGradient(0, ym-rw, 0, ym+rw);
  gr.addColorStop(0, mixCol(col,0.5));
  gr.addColorStop(0.5, col);
  gr.addColorStop(1, mixCol(col,-0.38));
  ctx.fillStyle=gr; ctx.globalAlpha=0.96;
  wedgePath(ctx,hb0,hb1,a0,a1); ctx.fill();
  // bisel del botón: borde superior claro, inferior oscuro
  var wd=hb1-hb0;
  ctx.fillStyle="rgba(255,255,255,.34)";
  wedgePath(ctx,hb0, hb0+wd*0.22, a0,a1); ctx.fill();
  ctx.fillStyle="rgba(0,0,0,.3)";
  wedgePath(ctx, hb1-wd*0.18, hb1, a0,a1); ctx.fill();
  // resplandor pulsante
  ctx.shadowColor=col; ctx.shadowBlur=22*puls;
  ctx.globalAlpha=0.9; ctx.lineWidth=Math.max(2,puls*3.4); ctx.strokeStyle=col;
  wedgePath(ctx,hb0,hb1,a0,a1); ctx.stroke();
  ctx.shadowBlur=0; ctx.globalAlpha=1;
  var sz=Math.min(rw,cw*rm)*0.22;
  ctx.lineWidth=Math.max(2,sz*0.3);
  if(t.kind==="trap"){
    ctx.strokeStyle=col; ctx.globalAlpha=0.95;
    ctx.beginPath(); ctx.moveTo(xm-sz,ym-sz); ctx.lineTo(xm+sz,ym+sz); ctx.moveTo(xm+sz,ym-sz); ctx.lineTo(xm-sz,ym+sz); ctx.stroke();
    ctx.strokeStyle="#fff"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(xm,ym,sz*0.5,0,TAU); ctx.stroke();
  } else if(t.kind==="gold"){
    ctx.fillStyle=col; ctx.globalAlpha=0.95;
    starPath(ctx,xm,ym,sz*1.3,sz*0.55); ctx.fill();
  } else if(settings.colorblind){
    ctx.strokeStyle="#fff"; ctx.globalAlpha=0.95; ctx.lineWidth=Math.max(2,sz*0.22);
    ctx.beginPath(); ctx.arc(xm,ym,sz*0.85,0,TAU); ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function drawSpirit(){
  var s=GS.spirit; if(!s) return;
  var ring=s.ring, seg=s.seg;
  if(s.move){
    var m=s.move, e=m.t;
    ring=m.from.r + (m.to.r-m.from.r)*e;
    // interpolación de segmento corta
    var ns=segDiff(m.from.s, m.to.s, RINGS[m.to.r]);
    seg=wrapSeg(m.from.s + ns*e, RINGS[m.to.r]);
    ring=Math.round(ring);
  }
  var cw=Math.PI/RINGS[ring];
  var rm=rw*ring+rw*0.5;
  var am=Math.PI+(seg+0.5)*cw+osc;
  var x=cx+Math.cos(am)*rm, y=cy+Math.sin(am)*rm;
  var size=rw*0.85;
  var col=GS.lv.target;
  var pul=0.8+0.2*Math.sin(GS.oscPhase*2);
  var isNian=!!GS.lv.boss2;
  var dark=isNian?"#4a0a08":"#4a2a08";
  // sombra proyectada
  ctx.save();
  ctx.shadowColor="rgba(0,0,0,.55)"; ctx.shadowBlur=18; ctx.shadowOffsetY=9;
  ctx.fillStyle="rgba(0,0,0,.2)";
  roundRect(x-size*0.55,y-size*0.4+6,size*1.1,size*0.9,size*0.2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor=col; ctx.shadowBlur=32*pul;
  var gr=ctx.createRadialGradient(x-size*0.1,y-size*0.25,size*0.1,x,y,size*0.8);
  gr.addColorStop(0,mixCol(col,0.35)); gr.addColorStop(1,dark);
  ctx.fillStyle=gr;
  roundRect(x-size/2,y-size/2,size,size,size*0.24); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.lineWidth=2;
  roundRect(x-size/2,y-size/2,size,size,size*0.24); ctx.stroke();
  // cuernos
  if(isNian){
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(x-size*0.32,y-size*0.42); ctx.lineTo(x-size*0.52,y-size*0.7); ctx.lineTo(x-size*0.18,y-size*0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+size*0.32,y-size*0.42); ctx.lineTo(x+size*0.52,y-size*0.7); ctx.lineTo(x+size*0.18,y-size*0.5); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle=col; ctx.lineWidth=Math.max(2,size*0.055); ctx.lineCap="round";
    for(var i=0;i<3;i++){
      ctx.beginPath(); ctx.moveTo(x-size*0.24, y-size*0.36);
      ctx.quadraticCurveTo(x-size*0.32-i*size*0.035, y-size*0.6, x-size*0.13-i*size*0.035, y-size*0.68); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+size*0.24, y-size*0.36);
      ctx.quadraticCurveTo(x+size*0.32+i*size*0.035, y-size*0.6, x+size*0.13+i*size*0.035, y-size*0.68); ctx.stroke();
    }
  }
  // ojos
  var ex=size*0.26, ey=size*0.12, er=size*0.1;
  ctx.fillStyle="#fff";
  ctx.beginPath(); ctx.arc(x-ex,y-ey,er,0,TAU); ctx.arc(x+ex,y-ey,er,0,TAU); ctx.fill();
  ctx.fillStyle="#1a0b05";
  ctx.beginPath();
  ctx.arc(x-ex,y-ey,er*0.5,0,TAU); ctx.arc(x+ex,y-ey,er*0.5,0,TAU);
  ctx.fill();
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.arc(x-ex-er*0.2,y-ey-er*0.2,er*0.18,0,TAU); ctx.arc(x+ex-er*0.2,y-ey-er*0.2,er*0.18,0,TAU);
  ctx.fill();
  // cejas fieras
  ctx.strokeStyle=isNian?"#2a0d04":col; ctx.lineWidth=Math.max(2,size*0.05); ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(x-ex-er,y-ey-er); ctx.lineTo(x-ex+er,y-ey+er);
  ctx.moveTo(x+ex+er,y-ey-er); ctx.lineTo(x+ex-er,y-ey+er); ctx.stroke();
  // boca
  if(isNian){
    ctx.fillStyle="#3a0d08";
    ctx.beginPath(); ctx.ellipse(x,y+size*0.2,size*0.2,size*0.15,0,0,TAU); ctx.fill();
    ctx.fillStyle="#fff";
    ctx.beginPath(); ctx.moveTo(x-size*0.14,y+size*0.14); ctx.lineTo(x-size*0.05,y+size*0.27); ctx.lineTo(x,y+size*0.15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+size*0.14,y+size*0.14); ctx.lineTo(x+size*0.05,y+size*0.27); ctx.lineTo(x,y+size*0.15); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle=col; ctx.lineWidth=Math.max(2,size*0.05); ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(x,y+size*0.12,size*0.16,0.2*Math.PI,0.8*Math.PI); ctx.stroke();
    ctx.lineWidth=Math.max(1.5,size*0.03);
    ctx.beginPath(); ctx.moveTo(x-size*0.18,y+size*0.05); ctx.quadraticCurveTo(x-size*0.42,y+size*0.04,x-size*0.48,y-size*0.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+size*0.18,y+size*0.05); ctx.quadraticCurveTo(x+size*0.42,y+size*0.04,x+size*0.48,y-size*0.04); ctx.stroke();
  }
  ctx.restore();
}
function segDiff(a,b,n){ var d=(b-a+n)%n; if(d>n/2)d-=n; return d; }
function wrapSeg(s,n){ s=s%n; if(s<0)s+=n; return s; }
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawPart(p){
  var col=p.col;
  var al=Math.max(0,p.t/0.8);
  if(p.type==="dot"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.9; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,TAU); ctx.fill(); }
  else if(p.type==="slash"){ ctx.strokeStyle=col; ctx.globalAlpha=al*0.9; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(p.x-4,p.y-4); ctx.lineTo(p.x+4,p.y+4); ctx.stroke(); }
  else if(p.type==="cross"){ ctx.strokeStyle=col; ctx.globalAlpha=al*0.9; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(p.x-4,p.y); ctx.lineTo(p.x+4,p.y); ctx.moveTo(p.x,p.y-4); ctx.lineTo(p.x,p.y+4); ctx.stroke(); }
  else if(p.type==="star"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.9; starPath(ctx,p.x,p.y,6,2.6); ctx.fill(); }
  else if(p.type==="glow"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.35; ctx.beginPath(); ctx.arc(p.x,p.y,9,0,TAU); ctx.fill(); }
  else if(p.type==="petal"){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot||0); ctx.fillStyle=col; ctx.globalAlpha=al*0.95; ctx.beginPath(); ctx.ellipse(0,0,4.5,2.2,0,0,TAU); ctx.fill(); ctx.restore(); }
  else if(p.type==="coin"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.95; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,TAU); ctx.fill(); ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(p.x-1.6,p.y-1.6,3.2,3.2); }
  else if(p.type==="leaf"){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot||0); ctx.fillStyle=col; ctx.globalAlpha=al*0.95; ctx.beginPath(); ctx.moveTo(0,-6); ctx.quadraticCurveTo(4,0,0,6); ctx.quadraticCurveTo(-4,0,0,-6); ctx.fill(); ctx.restore(); }
  else if(p.type==="smoke"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.28; ctx.beginPath(); ctx.arc(p.x,p.y,4.5+p.vx*0.01,0,TAU); ctx.fill(); }
  else if(p.type==="firew"){ ctx.strokeStyle=col; ctx.globalAlpha=al; ctx.lineWidth=2; var aa=(p.rot||0)+p.t*5; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(aa)*-p.vx*0.02, p.y+Math.sin(aa)*-p.vy*0.02); ctx.stroke(); }
  else if(p.type==="wave"){ ctx.strokeStyle=col; ctx.globalAlpha=al*0.9; ctx.lineWidth=2; ctx.beginPath(); var ph=p.rot||0; for(var wi=-3;wi<=3;wi++){ var yy=Math.sin(wi*1.1+ph)*3; if(wi===-3)ctx.moveTo(p.x+wi*3,p.y+yy); else ctx.lineTo(p.x+wi*3,p.y+yy); } ctx.stroke(); }
  else if(p.type==="silk"){ ctx.strokeStyle=col; ctx.globalAlpha=al*0.95; ctx.lineWidth=2.4; var ph2=p.rot||0; ctx.beginPath(); ctx.moveTo(p.x-5,p.y); ctx.quadraticCurveTo(p.x, p.y-6+Math.sin(ph2)*3, p.x+5, p.y); ctx.stroke(); }
  else if(p.type==="ink"){ ctx.fillStyle=col; ctx.globalAlpha=al*0.4; ctx.beginPath(); ctx.arc(p.x,p.y,3.5+p.vx*0.008,0,TAU); ctx.fill(); }
  else if(p.type==="flake"){ ctx.strokeStyle=col; ctx.globalAlpha=al*0.9; ctx.lineWidth=1.6; var r=p.rot||0; ctx.beginPath(); for(var fi=0;fi<6;fi++){ var aa=r+fi*Math.PI/3; ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(aa)*5,p.y+Math.sin(aa)*5); } ctx.stroke(); }
  else { ctx.strokeStyle=col; ctx.globalAlpha=al*0.9; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.05,p.y-p.vy*0.05); ctx.stroke(); }
  ctx.globalAlpha=1;
}

/* ---------- Fin de partida ---------- */
function finishGame(won){
  running=false; cancelAnimationFrame(raf); raf=0;
  var g=GS, lv=g.lv, id=g.id;
  var score=Math.floor(g.score);
  var boss=!!lv.boss;
  var prevBest=pb[id]||0;
  var newRecord=score>prevBest;
  if(newRecord){ pb[id]=score; }
  var firstTime = won && (completed.indexOf(id)===-1);
  if(won && id!=="daily" && completed.indexOf(id)===-1){ completed.push(id); }
  var cg=Math.floor(score/40) + (firstTime?100:0);
  if(g.bestCombo>=15)cg+=50; if(g.bestCombo>=20)cg+=150;
  if(hasActive("coinx2")) cg=Math.floor(cg*2);
  if(id==="daily"){ cg=Math.max(30,Math.floor(score/200)); if(won)cg+=40; }
  coins+=cg; totalEarned+=cg;
  if(id!=="daily"){
    pushScore({uid:uid(), name:profile.name, avatar:profile.avatar, score:score, ts:Date.now()});
  } else {
    var db=ls("dailyBest")||{}; var k=todayKey();
    if(!db[k] || score>(db[k].score||0)){ db[k]={score:score, ts:Date.now()}; ls("dailyBest",db); }
    if(SupRemote.on()){
      try{
        SupRemote.bestScore("daily",
          "date=eq."+SupRemote.enc(k)+"&uid=eq."+SupRemote.enc(uid()),
          {date:k, uid:uid(), name:profile.name, avatar:profile.avatar, score:score, ts:Date.now()}).catch(function(){});
      }catch(e){}
    }
  }
  // logros
  if(won && id!=="daily") unlock("firstwin");
  if(won && !boss && id!=="daily" && g.fails===0 && g.trapsHit===0) unlock("impecable");
  if(g.bestCombo>=20) unlock("combo20");
  if(g.hits+g.catches>=25) unlock("veloz");
  if(won && id===17) unlock("jefe");
  if(won && id===18) unlock("jefe2");
  if(won && id===16 && g.trapsHit===0) unlock("minero");
  if(boss && won && !g.forgiven && false){} // reservado
  var allDone = LEVELS.filter(function(l){return l.id<18;}).every(function(l){ return completed.indexOf(l.id)>-1; });
  if(allDone) unlock("completo");
  if(newRecord) unlock("record");
  if(totalEarned>=5000) unlock("rico");
  saveAll();
  try{ if(window.MUSIC && MUSIC.stop) MUSIC.stop(); }catch(e){}
  try{ if(won && boss && window.sndPlay) sndPlay("boss"); }catch(e){}
  var nextId = (typeof id==="number" && id<18) ? id+1 : null;
  showResult({
    won:won, bossWon:won&&boss, goal:g.goal, score:score, bestCombo:g.bestCombo,
    fails:g.fails, coinsGained:cg, levelObj:lv, levelId:id, newRecord:newRecord,
    firstTime:firstTime, unlockedNext: !!(won && nextId && levelUnlocked(nextId)), nextId:nextId,
    isDaily:id==="daily", reviveUsed:g.usedRevive, catches:g.catches, name:lv.name
  });
  refreshMenuCoins();
}