/* Op-Art Fan - modulo: js/arena/minigames.js */

"use strict";

/* ============================================================
   MINI-JUEGOS DE ARENA
   ============================================================ */
var CALLI = [
  [
   {x:.5,y:.08},{x:.5,y:.92},{x:.12,y:.32},{x:.88,y:.32},
   {x:.1,y:.62},{x:.88,y:.62},{x:.16,y:.8},{x:.84,y:.8},{x:.5,y:.68}
  ],
  [
   {x:.5,y:.08},{x:.5,y:.95},{x:.15,y:.2},{x:.85,y:.2},{x:.15,y:.42},{x:.85,y:.42},
   {x:.1,y:.62},{x:.9,y:.62},{x:.16,y:.8},{x:.84,y:.8}
  ],
  [
   {x:.3,y:.08},{x:.7,y:.08},{x:.52,y:.18},{x:.8,y:.3},{x:.22,y:.34},{x:.6,y:.44},
   {x:.32,y:.55},{x:.7,y:.6},{x:.4,y:.74},{x:.62,y:.86},{x:.74,y:.95}
  ],
  [
   {x:.5,y:.08},{x:.3,y:.2},{x:.7,y:.2},{x:.5,y:.34},{x:.25,y:.45},{x:.75,y:.45},
   {x:.5,y:.58},{x:.15,y:.7},{x:.85,y:.7},{x:.5,y:.84},{x:.5,y:.95}
  ]
];
function newCalli(){
  var w=cv.width||320, h=cv.height||480;
  var box={x0:w*0.15, x1:w*0.85, y0:h*0.16, y1:h*0.62};
  var set=CALLI[ri(0,CALLI.length-1)];
  var pts=set.map(function(p){ return {x:box.x0+(box.x1-box.x0)*p.x, y:box.y0+(box.y1-box.y0)*p.y}; });
  return {pts:pts, idx:0, ink:[]};
}
function calliMove(p){
  var c=GS.calli; if(!c) return;
  c.ink.push({x:p.x,y:p.y}); if(c.ink.length>60) c.ink.shift();
  var hitR=Math.max(22, Math.min(cv.width,cv.height)*0.045);
  if(c.idx<c.pts.length){
    var pt=c.pts[c.idx];
    var dx=p.x-pt.x, dy=p.y-pt.y;
    if(dx*dx+dy*dy <= hitR*hitR){
      c.idx++;
      GS.combo++; GS.bestCombo=Math.max(GS.bestCombo,GS.combo);
      var mult=Math.min(GS.combo,20);
      GS.score+=10*mult;
      sfxHit(GS.combo); vibrate(18); burst(pt.x,pt.y,"#8a5a00",4);
      if(c.idx>=c.pts.length){
        GS.score+=100*Math.min(GS.combo,20);
        sfxGold(); flash("gold"); vibrate([30,30,60]);
        var nc=newCalli(); c.pts=nc.pts; c.idx=0; c.ink=[];
      }
    }
  }
}
function updateLanterns(dt){
  var g=GS, l=g.lans, w=cv.width, h=cv.height;
  l.t+=dt;
  if(l.t>=l.sp && l.items.length<8){
    l.t=0;
    var isGold=Math.random()<0.62;
    l.items.push({x:20+Math.random()*(w-40), y:h+26, vy:-(120+Math.random()*90),
      r:16+rnd(0,10), gold:isGold, i:Math.random()*6});
  }
  for(var i=l.items.length-1;i>=0;i--){
    var it=l.items[i]; it.y+=it.vy*dt; it.i+=dt*3;
    if(it.y<-30){
      l.items.splice(i,1);
      if(it.gold){ g.combo=1; g.score=Math.max(0,g.score-60); toast("Se escapó un farol","\u{1F43F}","err",1200); }
    }
  }
}
function lanternsTap(p){
  var l=GS.lans; if(!l) return;
  for(var i=l.items.length-1;i>=0;i--){
    var it=l.items[i];
    var dx=p.x-it.x, dy=p.y-it.y;
    var rr=it.r+16;
    if(dx*dx+dy*dy<=rr*rr){
      l.items.splice(i,1);
      if(it.gold){
        GS.combo++; GS.bestCombo=Math.max(GS.bestCombo,GS.combo);
        var mult=Math.min(GS.combo,20);
        GS.score+=100*mult;
        sfxGold(); vibrate([30,30,60]); flash("gold"); burst(it.x,it.y,"#ffd643",14);
      } else {
        GS.time=Math.max(0,GS.time-3);
        GS.combo=1;
        applyPenalty(0,150,"¡Farol trampa! -150 pts"); // applyPenalty suma toast típica del modo fan
      }
      return;
    }
  }
  GS.combo=1; sfxMiss(); // tocar vacío: se corta la racha sin castigo de tiempo
}
function updateCoin(dt){
  var c=GS.coin;
  if(c.settle>0){
    c.v=0; c.settle-=dt;
    if(c.settle<=0){ c.v=4+rnd(0,2.6); c.zone=0; c.resTxt=""; }
  } else if(c.stop){
    c.v*=Math.pow(0.05,dt);
    if(c.v<0.04){ resolveCoin(); c.stop=null; }
  }
  c.rot+=c.v*dt;
}
function coinTap(){
  var c=GS.coin;
  if(c.settle>0) return;
  if(!c.stop){ c.stop=true; sfxClick(); }
}
function coinSector(){
  var c=GS.coin; var sw=TAU/12;
  var ang=(-Math.PI/2 - c.rot)%TAU; if(ang<0) ang+=TAU;
  return Math.min(11,Math.floor(ang/sw));
}
var COIN_VALS=[20,40,60,80,120,50,30,90,70,40,110,25];
function resolveCoin(){
  var c=GS.coin; var k=coinSector();
  var isGold=k===c.golden;
  if(isGold){
    GS.streak++; GS.combo+=1; GS.bestCombo=Math.max(GS.bestCombo,GS.combo);
    var gold=400+100*Math.min(GS.streak,5);
    GS.score+=gold;
    sfxGold(); flash("gold"); vibrate([40,40,80]);
    c.resTxt="\u{1F3AF} ¡ZONA DORADA! +"+gold;
  } else {
    GS.streak=0; GS.combo=Math.max(1,GS.combo);
    var val=COIN_VALS[k]; GS.score+=val;
    sfxHit(1);
    c.resTxt="Sector +"+val;
  }
  c.settle=1.1; c.zone=1;
}
function updateDrum(dt){
  var g=GS, d=g.drum;
  d.t+=dt;
  if(d.t>=d.beat){
    d.t=0;
    var n=Math.random()<0.3?2:1;
    var lanes=[0.2,0.4,0.6,0.8];
    var used={};
    for(var i=0;i<n;i++){
      var lx=lanes[ri(0,3)];
      if(used[lx]) continue; used[lx]=1;
      d.notes.push({x:cv.width*lx, y:-10, vy:(cv.height*0.66+10)/0.7, hit:false, r:18});
    }
  }
  var hitY=cv.height*0.66;
  for(var j=d.notes.length-1;j>=0;j--){
    var nt=d.notes[j]; nt.y+=nt.vy*dt;
    if(nt.y>hitY+50){ d.notes.splice(j,1); GS.combo=GS.combo>2?Math.ceil(GS.combo/2):1; }
  }
  if(d.flashT>0) d.flashT-=dt;
}
function drumTap(p){
  var d=GS.drum; if(!d) return;
  var lanes=[0.2,0.4,0.6,0.8];
  var lx=lanes[0], best=1e9;
  for(var i=0;i<4;i++){ var dx=Math.abs(p.x-cv.width*lanes[i]); if(dx<best){ best=dx; lx=lanes[i]; } }
  var hitY=cv.height*0.66;
  var idx=-1, dist=1e9;
  for(var j=0;j<d.notes.length;j++){
    var nt=d.notes[j];
    if(Math.abs(nt.x-cv.width*lx)>46) continue;
    var dd=Math.abs(nt.y-hitY);
    if(dd<dist && dd<46){ dist=dd; idx=j; }
  }
  if(idx<0){ GS.combo=1; sfxMiss(); return; }
  d.notes.splice(idx,1);
  if(dist<=15){ GS.combo++; GS.bestCombo=Math.max(GS.bestCombo,GS.combo);
    GS.score+=100*Math.min(GS.combo,20); d.flashT=0.25; flash("gold"); sfxGold(); vibrate(25);
  } else { GS.combo=Math.max(1,GS.combo); GS.score+=50*Math.min(Math.max(GS.combo,1),20); sfxHit(GS.combo); }
}
function updateArena(dt){
  var g=GS;
  g.time-=dt;
  if(g.time<=0){ finishArena(); return; }
  if(g.mode==="lanterns") updateLanterns(dt);
  else if(g.mode==="coin") updateCoin(dt);
  else if(g.mode==="drum") updateDrum(dt);
  for(var i=g.parts.length-1;i>=0;i--){ var p=g.parts[i]; p.t-=dt; if(p.t<=0){ g.parts.splice(i,1); continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.96; p.vy*=0.96; }
  $("hudScore").textContent=num(g.score);
  var fill=$("timeFill"); fill.style.width=clamp(g.time/g.timeMax*100,0,100)+"%";
  var cb=$("comboBadge");
  if(g.combo>=2){ cb.textContent="x"+Math.min(g.combo,20); cb.style.display="block"; } else { cb.style.display="none"; }
}

/* ---------- Render Arena ---------- */
function renderArenaScene(){
  var g=GS, w=cv.width, h=cv.height;
  if(g.mode==="calligraphy") renderCalli(w,h);
  else if(g.mode==="lanterns") renderLans(w,h);
  else if(g.mode==="coin") renderCoinWheel(w,h);
  else if(g.mode==="drum") renderDrum(w,h);
  GS.parts.forEach(drawPart);
  ctx.globalAlpha=1;
}
function drawPaper(){
  var g=ctx.createLinearGradient(0,0,0,cv.height);
  g.addColorStop(0,"#f6efe0"); g.addColorStop(0.6,"#e8dcc0"); g.addColorStop(1,"#d6c49b");
  ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
  var vg=ctx.createRadialGradient(cv.width/2,cv.height*0.3,20,cv.width/2,cv.height*0.4,cv.height*0.9);
  vg.addColorStop(0,"rgba(255,255,255,0)"); vg.addColorStop(1,"rgba(120,90,40,.18)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,cv.width,cv.height);
}
function renderCalli(w,h){
  drawPaper();
  var c=GS.calli; if(!c) return;
  var hitR=Math.max(22,Math.min(w,h)*0.045);
  // guía difusa del carácter
  ctx.save();
  ctx.strokeStyle="rgba(58,53,44,.18)"; ctx.lineWidth=Math.max(3,w*0.012); ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath();
  c.pts.forEach(function(p,i){ if(i===0)ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.stroke(); ctx.restore();
  // tinta del dedo
  if(c.ink.length>=2){
    ctx.strokeStyle="rgba(30,24,16,.85)"; ctx.lineWidth=Math.max(3,w*0.02); ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath();
    c.ink.forEach(function(p,i){ if(i===0)ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.stroke();
  }
  c.pts.forEach(function(pt,i){
    var done=i<c.idx;
    if(done){
      ctx.fillStyle="rgba(138,90,0,.45)";
    } else {
      var pul=0.6+0.4*Math.sin(performance.now()/1000*3+(i*0.7)+10);
      ctx.fillStyle="rgba(196,120,20,"+(0.85*pul).toFixed(2)+")";
      ctx.shadowColor="#b8860b"; ctx.shadowBlur=14*pul;
    }
    ctx.beginPath(); ctx.arc(pt.x,pt.y,done?hitR*0.5:hitR*0.62,0,TAU); ctx.fill();
    ctx.shadowBlur=0;
    if(!done && i===c.idx){
      ctx.strokeStyle="rgba(58,53,44,.85)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,hitR*0.9,0,TAU); ctx.stroke();
    }
  });
  // número de punto
  ctx.fillStyle="rgba(58,53,44,.75)"; ctx.font="600 13px 'ZCOOL XiaoWei',serif";
  ctx.fillText("Trazo: "+c.idx+"/"+c.pts.length+" \u00B7 toca en orden", w*0.16, h*0.10);
}
function renderLans(w,h){
  var bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"#1c0a07"); bg.addColorStop(1,"#3a1410");
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  var vg=ctx.createRadialGradient(w/2,h*0.4,10,w/2,h*0.5,w*0.8);
  vg.addColorStop(0,"rgba(255,214,67,.10)"); vg.addColorStop(1,"rgba(0,0,0,.0)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
  // cuerdas
  ctx.strokeStyle="rgba(217,164,65,.25)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,h*0.16); ctx.quadraticCurveTo(w/2,h*0.22,w,h*0.12); ctx.stroke();
  GS.lans.items.forEach(function(it){
    var pul=0.75+0.25*Math.sin(it.i);
    var col=it.gold?"#ffd643":"#ff4757";
    var gr=ctx.createRadialGradient(it.x,it.y,1,it.x,it.y,it.r*2.1);
    gr.addColorStop(0,"rgba(255,190,60,"+(0.55*pul)+")");
    gr.addColorStop(1,"rgba(255,190,60,0)");
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(it.x,it.y,it.r*2.1,0,TAU); ctx.fill();
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.ellipse(it.x,it.y,it.r,it.r*1.22,0,0,TAU); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(it.x-it.r*0.5,it.y-it.r*1.15,it.r,it.r*0.22);
    if(it.gold){
      ctx.fillStyle="#fff3c4"; ctx.fillRect(it.x-it.r*0.35,it.y-it.r*0.9,it.r*0.7,it.r*0.18);
      ctx.strokeStyle="rgba(255,255,255,.75)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(it.x,it.y,it.r*0.45,0,TAU); ctx.stroke();
    } else {
      ctx.strokeStyle="rgba(255,255,255,.8)"; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(it.x-it.r*0.4,it.y-it.r*0.4); ctx.lineTo(it.x+it.r*0.4,it.y+it.r*0.4);
      ctx.moveTo(it.x+it.r*0.4,it.y-it.r*0.4); ctx.lineTo(it.x-it.r*0.4,it.y+it.r*0.4);
      ctx.stroke();
    }
  });
  ctx.fillStyle="rgba(255,240,200,.8)"; ctx.font="700 13px 'ZCOOL XiaoWei',serif";
  ctx.fillText("Toca el dorado \u00B7 esquiva el rojo", w*0.09, h*0.09);
}
function renderCoinWheel(w,h){
  var bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"#180b04"); bg.addColorStop(1,"#2a1606");
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  var c=GS.coin;
  var cx2=cx, cy2=h*0.46, rw2=Math.min(w*0.36, h*0.26);
  var sw=TAU/12;
  ctx.save(); ctx.translate(cx2,cy2); ctx.rotate(c.rot);
  for(var i2=0;i2<12;i2++){
    var gold2=i2===c.golden;
    var a0=-Math.PI/2+i2*sw, a1=a0+sw;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,rw2,a0,a1); ctx.closePath();
    var gg2;
    if(gold2){ gg2=ctx.createRadialGradient(0,0,1,0,0,rw2); gg2.addColorStop(0,"#fff3c4"); gg2.addColorStop(1,"#d9a441"); }
    else if(i2===7){ gg2="#241a10"; }
    else { gg2=(i2%2? "#8f2412" : "#6e1a10"); }
    ctx.fillStyle=gg2; ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=2; ctx.stroke();
  }
  // dibujar moneda en sector dorado
  var ga=(-Math.PI/2+c.golden*sw+sw/2);
  ctx.fillStyle="#fff3c4"; ctx.font="700 "+Math.floor(rw2*0.22)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("\u{1FA99}", Math.cos(ga)*rw2*0.62, Math.sin(ga)*rw2*0.62);
  ctx.restore();
  // flecha fija
  ctx.fillStyle="#e0502a";
  ctx.beginPath(); ctx.moveTo(cx2-10,Math.max(8,cy2-rw2-16)); ctx.lineTo(cx2+10,Math.max(8,cy2-rw2-16)); ctx.lineTo(cx2,cy2-rw2+8); ctx.closePath(); ctx.fill();
  // buje
  var hg=ctx.createRadialGradient(cx2,cy2,1,cx2,cy2,rw2*0.3);
  hg.addColorStop(0,"#ffe9a8"); hg.addColorStop(0.5,"#e6b23a"); hg.addColorStop(1,"#7a4510");
  ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(cx2,cy2,rw2*0.26,0,TAU); ctx.fill();
  ctx.strokeStyle="rgba(255,245,200,.5)"; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle="#3c1f06"; ctx.beginPath(); ctx.arc(cx2,cy2,rw2*0.11,0,TAU); ctx.fill();
  if(c.resTxt){
    ctx.fillStyle=c.zone? "#ffd643" : "#f3e9d8"; ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.lineWidth=4;
    ctx.font="800 20px 'ZCOOL XiaoWei',serif"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.strokeText(c.resTxt, w/2, h*0.84); ctx.fillText(c.resTxt, w/2, h*0.84);
  }
  ctx.textAlign="start";
}
function renderDrum(w,h){
  var bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"#160805"); bg.addColorStop(1,"#3a1410");
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  var lanes=[0.2,0.4,0.6,0.8];
  var hitY=h*0.66;
  lanes.forEach(function(lx){
    ctx.strokeStyle="rgba(217,164,65,.16)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(w*lx,0); ctx.lineTo(w*lx,hitY+40); ctx.stroke();
  });
  ctx.fillStyle="rgba(255,214,67,.85)"; ctx.fillRect(0,hitY-2,w,4);
  ctx.fillStyle="rgba(255,214,67,.15)"; ctx.fillRect(w*0.08,hitY-30,w*0.84,60);
  GS.drum.notes.forEach(function(nt){
    ctx.strokeStyle="rgba(255,226,122,.7)"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(nt.x,nt.y,nt.r,0,TAU); ctx.stroke();
    ctx.fillStyle="rgba(255,190,80,.28)"; ctx.beginPath(); ctx.arc(nt.x,nt.y,nt.r-3,0,TAU); ctx.fill();
  });
  if(GS.drum.flashT>0){
    ctx.strokeStyle="rgba(255,214,67,"+(GS.drum.flashT*3).toFixed(2)+")"; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(w*0.5,hitY,40,0,TAU); ctx.stroke();
  }
  // tambor
  var ty=h*0.86, tr=Math.min(w*0.26, h*0.14);
  var dr=ctx.createRadialGradient(w/2,ty-tr*0.2,tr*0.1,w/2,ty,tr*1.2);
  dr.addColorStop(0,"#e8643d"); dr.addColorStop(0.7,"#8f2412"); dr.addColorStop(1,"#4a120a");
  ctx.fillStyle=dr; ctx.beginPath(); ctx.ellipse(w/2,ty,tr,tr*0.62,0,0,TAU); ctx.fill();
  ctx.strokeStyle="#d9a441"; ctx.lineWidth=4;
  ctx.beginPath(); ctx.ellipse(w/2,ty,tr,tr*0.62,0,0,TAU); ctx.stroke();
  ctx.fillStyle="#ffd643"; ctx.fillRect(w/2-tr*0.4,ty-tr*0.12,tr*0.8,4);
  ctx.fillStyle="rgba(255,240,200,.8)"; ctx.font="700 13px 'ZCOOL XiaoWei',serif";
  ctx.fillText("Toca cuando el disco cruce la l\u00EDnea dorada", w*0.08, h*0.5);
}