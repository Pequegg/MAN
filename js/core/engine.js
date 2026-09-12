/* Op-Art Fan - modulo: js/core/engine.js */

"use strict";

/* ---------- MOTOR DEL JUEGO ---------- */
var RINGS=[8,12,16,20,24,30];
var cx=0, cy=0, R=0, rw=0, osc=0;
var cv=$("cv"), ctx=cv.getContext("2d");
var fanOff=null, bgOff=null, GS=null, raf=0, running=false;
var decQueues={};
var TAU=Math.PI*2;

function setCvSize(){
  var w=$("gameWrap").clientWidth, h=$("gameWrap").clientHeight;
  cv.width=Math.max(2,w); cv.height=Math.max(2,h);
  runLayout();
}
function runLayout(){
  var w=cv.width, h=cv.height;
  cx=w/2; cy=h-14; R=Math.min(w,h)*0.52; rw=R/6;
}
function onResize(){ if(running){ setCvSize(); if(!GS.mode || GS.mode==="fan") prerender(); } }
window.addEventListener("resize", onResize);

function hasActive(id){ return session.activeNow.indexOf(id)>-1; }
function renderBadges(){
  var b=$("badgesRow"); b.innerHTML="";
  session.activeNow.forEach(function(id){ var it=itemInfo(id); if(it) b.innerHTML+='<span class="badge">'+it.icon+" "+esc(it.name)+'</span>'; });
}

function wedgePath(o, r0, r1, a0, a1){
  o.beginPath();
  o.arc(cx, cy, r1, a0, a1);
  o.arc(cx, cy, r0, a1, a0, true);
  o.closePath();
}
function starPath(o, x, y, s1, s2){
  o.beginPath();
  for(var i=0;i<10;i++){ var r=i%2?s2:s1; var aa=-Math.PI/2 + i*Math.PI/5; var px=x+Math.cos(aa)*r, py=y+Math.sin(aa)*r; if(i===0)o.moveTo(px,py); else o.lineTo(px,py); }
  o.closePath();
}
function drawSkinPattern(o, sk, ring, s, r0, r1, a0, a1, cols, col){
  var rm=(r0+r1)/2, am=(a0+a1)/2, wd=(r1-r0);
  var xm=cx+Math.cos(am)*rm, ym=cy+Math.sin(am)*rm;
  var dark="rgba(0,0,0,.30)", light="rgba(255,255,255,.20)";
  if(sk.pat==="dots"){
    o.fillStyle=dark;
    for(var i=0;i<3;i++){ var a=am+(a1-a0)*0.5*((i-1)*0.62); var rr=rm+(i-1)*wd*0.28; o.beginPath(); o.arc(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr, Math.max(1.6,wd*0.09),0,TAU); o.fill(); }
  } else if(sk.pat==="slash"){
    o.strokeStyle=dark; o.lineWidth=Math.max(1.5,wd*0.08);
    o.beginPath(); o.moveTo(cx+Math.cos(am-0.25)*(rm-wd*0.3), cy+Math.sin(am-0.25)*(rm-wd*0.3)); o.lineTo(cx+Math.cos(am+0.25)*(rm+wd*0.3), cy+Math.sin(am+0.25)*(rm+wd*0.3)); o.stroke();
  } else if(sk.pat==="cross"){
    o.strokeStyle=dark; o.lineWidth=Math.max(1.4,wd*0.07);
    o.beginPath(); o.moveTo(xm-wd*0.22,ym); o.lineTo(xm+wd*0.22,ym); o.moveTo(xm,ym-wd*0.22); o.lineTo(xm,ym+wd*0.22); o.stroke();
  } else if(sk.pat==="star"){
    o.fillStyle=light; starPath(o, xm, ym, wd*0.3, wd*0.14); o.fill();
  } else if(sk.pat==="glow"){
    var g=o.createRadialGradient(xm,ym,1,xm,ym,wd*0.75); g.addColorStop(0,"rgba(255,255,255,.22)"); g.addColorStop(1,"rgba(255,255,255,0)"); o.fillStyle=g;
    o.beginPath(); o.arc(xm,ym,wd*0.75,0,TAU); o.fill();
  }
}
function goldGrad(o, r0, r1){
  var gr=o.createRadialGradient(cx,cy,r0,cx,cy,r1);
  gr.addColorStop(0,"#7a4510"); gr.addColorStop(0.45,"#e6b23a"); gr.addColorStop(0.72,"#ffe9a8"); gr.addColorStop(1,"#9a6416");
  return gr;
}
function rimBands(o, r0, r1, a0, a1){
  var wd=r1-r0;
  o.fillStyle="rgba(0,0,0,.30)";
  wedgePath(o, r0, Math.min(r1, r0+wd*0.22), a0, a1); o.fill();
  o.fillStyle="rgba(255,255,255,.16)";
  wedgePath(o, Math.max(r0, r1-wd*0.16), r1, a0, a1); o.fill();
}
function prerenderBg(){
  var o=bgOff.getContext("2d");
  var lv=GS.lv;
  var w=cv.width, h=cv.height, W=w, H=h;
  o.fillStyle=lv.bg; o.fillRect(0,0,w,h);
  // fondo ilustrado (asset) si ya esta listo; el decor procedimental sigue
  // como fallback y como textura fuera del area del abanico no.
  var bgImg = window.AssetBank && AssetBank.bg ? AssetBank.bg(lv) : null;
  if (bgImg) { o.drawImage(bgImg, 0, 0, w, h); }
  var bd = bgImg ? "none" : (lv.bd || "none");
  // viñeta
  var vg=o.createRadialGradient(cx,H*0.3, rw*1.2, cx,H*0.55, R*1.8);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,.55)");
  o.fillStyle=vg; o.fillRect(0,0,w,h);
  // sombreado ambiente bajo el abanico
  var ag=o.createRadialGradient(cx,cy, R*0.55, cx,cy, R*1.25);
  ag.addColorStop(0,"rgba(0,0,0,.10)"); ag.addColorStop(0.7,"rgba(0,0,0,.34)"); ag.addColorStop(1,"rgba(0,0,0,0)");
  o.fillStyle=ag; o.beginPath(); o.arc(cx,cy,R*1.25,0,TAU); o.fill();
  function strokeGrad(){ o.strokeStyle="rgba(255,255,255,.10)"; o.lineCap="round"; }
  if(bd==="calli"){
    strokeGrad();
    o.lineWidth=Math.max(6,W*0.05);
    o.beginPath(); o.moveTo(-20,H*0.10); o.bezierCurveTo(W*0.3,H*0.06,W*0.45,H*0.30,W*0.95,H*0.12); o.stroke();
    o.strokeStyle="rgba(20,16,10,.15)"; o.lineWidth=Math.max(3,W*0.028);
    o.beginPath(); o.moveTo(W*0.1,H*0.40); o.bezierCurveTo(W*0.35,H*0.26,W*0.5,H*0.5,W*0.78,H*0.36); o.stroke();
    o.strokeStyle="rgba(20,16,10,.12)"; o.lineWidth=Math.max(2,W*0.02);
    o.beginPath(); o.moveTo(W*0.55,H*0.44); o.bezierCurveTo(W*0.72,H*0.32,W*0.8,H*0.48,W*1.02,H*0.30); o.stroke();
    o.fillStyle="rgba(192,57,43,.55)";
    o.fillRect(W*0.83, H*0.10, 8, 8);
  } else if(bd==="waves"){
    strokeGrad();
    for(var i=0;i<3;i++){
      var yy=H*0.12+i*H*0.14;
      o.lineWidth=Math.max(2,W*0.02)-i;
      o.beginPath();
      for(var x=0;x<=W;x+=18){
        var y=yy+Math.sin(x*0.02+i*2)*10;
        if(x===0)o.moveTo(x,y); else o.lineTo(x,y);
      }
      o.stroke();
    }
  } else if(bd==="pond"){
    o.strokeStyle="rgba(120,200,190,.12)"; o.lineWidth=2;
    for(var i=0;i<8;i++){
      var x=(i*173)%W, y=H*0.10+(i*37)%(H*0.3), rr=16+(i%3)*7;
      o.beginPath(); o.arc(x,y,rr,0,TAU); o.stroke();
      o.beginPath(); o.arc(x+rr*0.3,y+rr*0.2,rr*0.5,0,TAU); o.stroke();
    }
  } else if(bd==="lanterns"){
    var rows=Math.ceil(W/64);
    for(var i=0;i<rows;i++){
      var x=20+i*64+(i%3)*10;
      var y=12+((i*41)%30);
      o.strokeStyle="rgba(217,164,65,.4)"; o.lineWidth=1.4;
      o.beginPath(); o.moveTo(x,y); o.lineTo(x,y+12); o.stroke();
      var lg=o.createRadialGradient(x,y+24,1,x,y+24,12);
      lg.addColorStop(0,"rgba(255,150,60,.9)"); lg.addColorStop(1,"rgba(255,60,40,.25)");
      o.fillStyle=lg; o.beginPath(); o.arc(x,y+24,12,0,TAU); o.fill();
      o.fillStyle="rgba(255,220,160,.35)";
      o.fillRect(x-6,y+10,12,3); o.fillRect(x-6,y+33,12,3);
    }
  } else if(bd==="trees"){
    o.strokeStyle="rgba(210,150,150,.14)"; o.lineCap="round";
    o.lineWidth=Math.max(5,W*0.03);
    o.beginPath(); o.moveTo(-12,H*0.14); o.bezierCurveTo(W*0.2,H*0.02,W*0.42,H*0.20,W*0.6,H*0.06); o.stroke();
    o.strokeStyle="rgba(210,150,150,.10)"; o.lineWidth=Math.max(2,W*0.015);
    o.beginPath(); o.moveTo(W*0.3,H*0.10); o.quadraticCurveTo(W*0.44,H*0.06,W*0.5,H*0.14); o.stroke();
    for(var i=0;i<16;i++){
      var x=(i*97)%W, y=14+(i*53)%52;
      o.fillStyle="rgba(255,150,185,.45)"; o.beginPath(); o.arc(x,y,Math.max(2,W*0.011),0,TAU); o.fill();
    }
  } else if(bd==="clouds"){
    for(var i=0;i<7;i++){
      var x=(i*251)%W, y=H*0.05+(i*29)%(H*0.3);
      o.fillStyle="rgba(217,244,225,.10)";
      o.beginPath(); o.arc(x-18,y,10,0,TAU); o.arc(x,y,14,0,TAU); o.arc(x+20,y,9,0,TAU); o.fill();
    }
  } else if(bd==="dragon"){
    o.strokeStyle="rgba(255,226,122,.13)"; o.lineWidth=Math.max(4,W*0.028); o.lineCap="round";
    o.beginPath(); o.moveTo(-20,H*0.18);
    o.bezierCurveTo(W*0.2,H*0.02,W*0.28,H*0.30,W*0.45,H*0.12);
    o.bezierCurveTo(W*0.58,H*0.0,W*0.62,H*0.26,W*0.8,H*0.10);
    o.bezierCurveTo(W*0.92,H*0.0,W*0.98,H*0.16,W*1.04,H*0.10);
    o.stroke();
    o.fillStyle="rgba(255,226,122,.18)"; o.beginPath(); o.arc(W*0.9,H*0.06,Math.max(3,W*0.02),0,TAU); o.fill();
  } else if(bd==="phoenix"){
    o.strokeStyle="rgba(255,180,80,.12)"; o.lineCap="round";
    o.lineWidth=Math.max(4,W*0.025);
    o.beginPath(); o.moveTo(W*0.2,H*0.34);
    o.quadraticCurveTo(W*0.48,H*0.05,W*0.92,H*0.28); o.stroke();
    o.lineWidth=Math.max(2,W*0.01);
    o.beginPath(); o.moveTo(W*0.32,H*0.3); o.quadraticCurveTo(W*0.5,H*0.1,W*0.8,H*0.24); o.stroke();
    o.beginPath(); o.moveTo(W*0.42,H*0.26); o.quadraticCurveTo(W*0.55,H*0.14,W*0.72,H*0.2); o.stroke();
  } else if(bd==="wall"){
    o.fillStyle="rgba(190,196,205,.10)";
    var by=H*0.12, bh=H*0.05;
    o.fillRect(0,by-bh, W, bh);
    for(var i=0;i<Math.ceil(W/26);i++){
      o.fillRect(i*26, by-bh-8, 12, 8);
      o.fillRect(i*26+14, by, 12, 6);
    }
    o.fillRect(W*0.72, by-bh-10, W*0.1, 10);
  } else if(bd==="terracotta"){
    for(var row=0;row<2;row++){
      var by=H*0.06+row*H*0.13;
      var cols=Math.ceil(W/44);
      for(var i=0;i<cols;i++){
        if((i+row)%2) continue;
        var x=14+i*44;
        o.fillStyle="rgba(183,138,94,.14)";
        o.fillRect(x-6, by+14, 12, 14);
        o.beginPath(); o.arc(x,by+8,11,0,TAU); o.fill();
        o.strokeStyle="rgba(0,0,0,.15)"; o.lineWidth=1;
        o.beginPath(); o.moveTo(x-5,by+6); o.lineTo(x-1,by+10); o.stroke();
      }
    }
  } else if(bd==="silk"){
    o.strokeStyle="rgba(201,143,232,.13)"; o.lineWidth=Math.max(3,W*0.02); o.lineCap="round";
    o.beginPath(); o.moveTo(-20,H*0.16);
    o.bezierCurveTo(W*0.2,H*0.26,W*0.4,H*0.04,W*0.62,H*0.18);
    o.bezierCurveTo(W*0.8,H*0.28,W*0.9,H*0.1,W*1.05,H*0.2); o.stroke();
    o.strokeStyle="rgba(255,227,241,.10)"; o.lineWidth=Math.max(1.5,W*0.008);
    o.beginPath(); o.moveTo(W*0.15,H*0.3);
    o.bezierCurveTo(W*0.4,H*0.36,W*0.55,H*0.16,W*0.85,H*0.3); o.stroke();
  } else if(bd==="temple"){
    o.fillStyle="rgba(221,179,71,.12)";
    o.fillRect(W*0.12, H*0.18, W*0.3, H*0.06);
    o.fillRect(W*0.2, H*0.24, W*0.14, H*0.08);
    o.beginPath(); o.moveTo(W*0.08,H*0.18); o.lineTo(W*0.27,H*0.06); o.lineTo(W*0.46,H*0.18); o.closePath(); o.fill();
    o.beginPath(); o.moveTo(W*0.12,H*0.24); o.lineTo(W*0.27,H*0.13); o.lineTo(W*0.42,H*0.24); o.closePath(); o.fill();
    o.strokeStyle="rgba(255,240,192,.14)"; o.lineWidth=1.5;
    o.beginPath(); o.moveTo(W*0.07,H*0.18); o.lineTo(W*0.03,H*0.20);
    o.moveTo(W*0.46,H*0.18); o.lineTo(W*0.51,H*0.20); o.stroke();
  } else if(bd==="mountain"){
    o.fillStyle="rgba(90,120,100,.14)";
    o.beginPath(); o.moveTo(0,H*0.55);
    o.lineTo(W*0.05,H*0.32); o.lineTo(W*0.12,H*0.5); o.lineTo(W*0.2,H*0.34); o.lineTo(W*0.3,H*0.54);
    o.lineTo(W*0.4,H*0.3); o.lineTo(W*0.5,H*0.5); o.lineTo(W*0.6,H*0.36); o.lineTo(W*0.7,H*0.52);
    o.lineTo(W*0.8,H*0.4); o.lineTo(W*0.9,H*0.55); o.lineTo(W,H*0.5); o.lineTo(W,H*0.6); o.lineTo(0,H*0.6);
    o.closePath(); o.fill();
  } else if(bd==="opera"){
    o.strokeStyle="rgba(232,235,240,.10)"; o.lineWidth=2;
    o.beginPath(); o.ellipse(W*0.28,H*0.2,W*0.07,H*0.05,0,0,TAU); o.stroke();
    o.beginPath(); o.ellipse(W*0.72,H*0.2,W*0.07,H*0.05,0,0,TAU); o.stroke();
    o.fillStyle="rgba(176,40,31,.14)";
    o.fillRect(W*0.24,H*0.2,4,6); o.fillRect(W*0.7,H*0.2,4,6);
  }
  void strokeGrad;
}
function prerender(){
  runLayout();
  var w=cv.width, h=cv.height;
  fanOff=document.createElement("canvas"); fanOff.width=w; fanOff.height=h;
  bgOff=document.createElement("canvas"); bgOff.width=w; bgOff.height=h;
  prerenderBg();
  var o=fanOff.getContext("2d");
  var lv=GS.lv, cols=lv.c;
  var fs=(typeof activeFanSkin!=="undefined")?fanSkinById(activeFanSkin):null;
  if(fs && fs.pal) cols=fs.pal;   // fan-skin: paleta cosmética del abanico
  var skin=skinById(activeSkin);
  for(var ring=0; ring<6; ring++){
    var n=RINGS[ring], cw=Math.PI/n, r0=rw*ring, r1=rw*(ring+1);
    for(var s=0;s<n;s++){
      var a0=Math.PI+s*cw, a1=a0+cw;
      var col=daltCol(lv, cols[(ring+s)%cols.length]);
      o.fillStyle=col;
      wedgePath(o,r0,r1,a0,a1); o.fill();
      o.save(); wedgePath(o,r0,r1,a0,a1); o.clip(); drawSkinPattern(o,skin,ring,s,r0,r1,a0,a1,cols,col); rimBands(o,r0,r1,a0,a1); o.restore();
    }
    // separador de anillo
    o.strokeStyle="rgba(0,0,0,.26)"; o.lineWidth=rw*0.12;
    o.beginPath(); o.arc(cx,cy,r1,Math.PI,TAU); o.stroke();
    o.strokeStyle=goldGrad(o, rw*0.3, R); o.lineWidth=Math.max(1.3,rw*0.055);
    o.beginPath(); o.arc(cx,cy,r1,Math.PI,TAU); o.stroke();
    o.strokeStyle="rgba(255,255,255,.22)"; o.lineWidth=1;
    o.beginPath(); o.arc(cx,cy,r1,Math.PI,TAU); o.stroke();
    // radios
    for(var s2=0;s2<n;s2++){
      var a=Math.PI+s2*cw;
      o.strokeStyle="rgba(0,0,0,.22)"; o.lineWidth=Math.max(1.3,rw*0.07);
      o.beginPath(); o.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0); o.lineTo(cx+Math.cos(a)*r1, cy+Math.sin(a)*r1); o.stroke();
      o.strokeStyle="rgba(255,255,255,.16)"; o.lineWidth=1;
      o.beginPath(); o.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0); o.lineTo(cx+Math.cos(a)*r1, cy+Math.sin(a)*r1); o.stroke();
    }
  }
  // marco exterior de oro
  o.save();
  o.shadowColor="rgba(0,0,0,.55)"; o.shadowBlur=20; o.shadowOffsetY=7;
  o.strokeStyle="rgba(0,0,0,.35)"; o.lineWidth=rw*0.17;
  o.beginPath(); o.arc(cx,cy,R,Math.PI,TAU); o.stroke();
  o.restore();
  o.strokeStyle=goldGrad(o, rw, R); o.lineWidth=Math.max(3,rw*0.16);
  o.beginPath(); o.arc(cx,cy,R,Math.PI,TAU); o.stroke();
  o.strokeStyle="rgba(255,245,200,.5)"; o.lineWidth=Math.max(1.5,rw*0.045);
  o.beginPath(); o.arc(cx,cy,R-rw*0.05,Math.PI,TAU); o.stroke();
  // eje central
  var hr=rw*0.58;
  var hg=goldGrad(o, 1, hr);
  o.fillStyle=hg;
  o.beginPath(); o.arc(cx,cy,hr,Math.PI,TAU); o.fill();
  o.strokeStyle="rgba(255,245,200,.5)"; o.lineWidth=2;
  o.beginPath(); o.arc(cx,cy,hr*0.85,Math.PI,TAU); o.stroke();
  o.fillStyle="#3c1f06"; o.beginPath(); o.arc(cx,cy,hr*0.5,Math.PI,TAU); o.fill();
}
function daltCol(lv, col){
  if(!settings.colorblind) return col;
  // paleta accesible de alto contraste
  var idx=lv.c.indexOf(col); if(idx<0) return col;
  var pal=["#ffd600","#ff3dff","#00e5ff","#76ff03","#ff9100","#ff1744","#00e676"];
  return pal[idx%pal.length];
}