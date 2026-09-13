/* Op-Art Fan - Perfil y estadisticas (modulo lazy, fuera del presupuesto core).
   Renders en #screen-perfil inyectado por features.js. Lee ls("ft") (captura
   hecha por el wrapper de showResult). */
(function(){
  "use strict";

  var DPR = (window.devicePixelRatio||1);

  function el(id){ return document.getElementById(id); }

  /* ---------- estilos locales ---------- */
  if(!el("stxl")){
    var css = document.createElement("style");
    css.id = "stxl";
    css.textContent =
      ".st-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}"+
      ".st-card{background:linear-gradient(180deg,rgba(126,116,255,.14),rgba(44,33,112,.28));border:1px solid var(--line);border-radius:var(--r-md);padding:10px 6px;text-align:center;}"+
      ".st-card .st-num{font-size:17px;font-weight:900;line-height:1.1;}"+
      ".st-card .st-num.gold{color:var(--gold);}"+
      ".st-card .st-lbl{font-size:10px;color:var(--dim);font-weight:700;margin-top:2px;}"+
      ".week-cells{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:4px;}"+
      ".wc{background:var(--panel2);border:1px solid var(--line);border-radius:var(--r-sm);padding:6px 2px;text-align:center;}"+
      ".wc .d{font-size:10px;font-weight:800;color:var(--dim);}"+
      ".wc .p{font-size:14px;font-weight:900;color:var(--txt);}"+
      ".wc .s{font-size:9px;color:var(--gold);font-weight:700;}"+
      ".wc.on{background:linear-gradient(135deg,rgba(255,214,67,.2),rgba(214,170,60,.08));border-color:rgba(255,214,67,.5);}"+
      ".chart-box{background:var(--panel2);border:1px solid var(--line);border-radius:var(--r-md);padding:12px;margin-bottom:10px;text-align:center;}"+
      ".chart-t{font-size:12px;font-weight:900;color:var(--dim);margin-bottom:6px;text-align:left;}"+
      "#chartDonut{width:140px;height:140px;}"+
      "#chartWeek,#chartLine{width:100%;max-width:300px;height:96px;}"+
      ".poem-head{font-size:12px;font-weight:900;color:var(--gold);margin-bottom:6px;}"+
      ".poem-item{border-bottom:1px dashed var(--line);padding:6px 0;}"+
      ".poem-item:last-child{border-bottom:none;}"+
      ".poem-item .ph{font-family:'Ma Shan Zheng',cursive;font-size:15px;color:var(--txt);}"+
      ".poem-item .pe{font-size:11px;color:var(--dim);line-height:1.4;}";
    document.head.appendChild(css);
  }

  /* ---------- helpers canvas ---------- */
  function ctx(id){
    var c = el(id); if(!c) return null;
    var w = c.clientWidth || c.width, h = c.clientHeight || c.height;
    c.width = Math.round(w*DPR); c.height = Math.round(h*DPR);
    var x = c.getContext("2d");
    x.scale(DPR, DPR);
    return {x:x, w:w, h:h};
  }
  function round(text){ return text?Math.floor(text).toLocaleString("es-ES"):"0"; }

  function drawDonut(){
    var g = ctx("chartDonut"); if(!g) return;
    var s = ls("ft") || {}; var x = g.x, w = g.w, h = g.h;
    var wins = s.wins||0, lose = s.lose||0, tot = wins+lose;
    x.clearRect(0,0,w,h);
    if(!tot){
      x.fillStyle = "rgba(185,179,234,.45)";
      x.font = "600 10px system-ui"; x.textAlign="center";
      x.fillText("sin datos", w/2, h/2);
      return;
    }
    var r = Math.min(w,h)/2 - 4, cx = w/2, cy = h/2;
    var a0 = -Math.PI/2;
    function seg(a1, col){ x.beginPath(); x.moveTo(cx,cy); x.arc(cx,cy,r,a0,a1); x.closePath(); x.fillStyle = col; x.fill(); a0 = a1; }
    if(lose>0) seg(a0 + 2*Math.PI*(lose/tot), "rgba(255,107,125,.85)");
    if(wins>0) seg(a0 + 2*Math.PI*(wins/tot), "rgba(255,214,67,.95)");
    x.beginPath(); x.arc(cx,cy,r-10,0,2*Math.PI); x.fillStyle="#15102e"; x.fill();
    x.fillStyle = "#f4f2ff"; x.font = "800 13px system-ui"; x.textAlign="center"; x.textBaseline="middle";
    x.fillText(Math.round(100*wins/tot)+"%", cx, cy-5);
    x.fillStyle = "rgba(185,179,234,.8)"; x.font = "600 9px system-ui";
    x.fillText("victorias", cx, cy+9);
    x.textBaseline="alphabetic";
  }

  function weekKeys(){
    var out = [], m = new Date();
    var day = (m.getDay()+6)%7;
    m.setDate(m.getDate()-day); m.setHours(0,0,0,0);
    for(var i=0;i<7;i++){ var d = new Date(m.getTime()+i*86400000); out.push({k:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"), l:["L","M","X","J","V","S","D"][i], today:i===day}); }
    return out;
  }

  function drawWeek(){
    var g = ctx("chartWeek"); if(!g) return;
    var s = ls("ft")||{}, days = s.days||{}; var x = g.x, w = g.w, h = g.h;
    var wk = weekKeys(); var vals = wk.map(function(d){ return days[d.k]||0; });
    x.clearRect(0,0,w,h);
    var max = Math.max.apply(null, vals.concat([1]));
    var bw = 24, gap = (w - 7*bw)/8, bh = h - 22;
    for(var i=0;i<7;i++){
      var bx = gap + i*(bw+gap);
      var bht = vals[i]?Math.max(3,(bh*vals[i]/max)):3;
      var grad = x.createLinearGradient(0,0,0,bh);
      grad.addColorStop(0,"#ffe68a"); grad.addColorStop(1,"#d9a441");
      x.fillStyle = vals[i]?"url(#n)":"#3a3570"; if(vals[i]){ x.fillStyle = grad; }
      x.beginPath();
      x.roundRect ? x.roundRect(bx, bh-bht, bw, bht, 4) : x.rect(bx, bh-bht, bw, bht);
      x.fill();
      x.fillStyle = wk[i].today ? "#ffd643" : "rgba(185,179,234,.7)";
      x.font = "700 10px system-ui"; x.textAlign="center";
      x.fillText(wk[i].l, bx+bw/2, h-4);
      if(vals[i]){ x.fillStyle = "rgba(244,242,255,.85)"; x.font = "700 9px system-ui"; x.fillText(String(vals[i]), bx+bw/2, bh-bht-5); }
    }
  }

  function drawLine(){
    var g = ctx("chartLine"); if(!g) return;
    var s = ls("ft")||{}, bests = s.bests||{}; var x = g.x, w = g.w, h = g.h;
    var wk = weekKeys(); var vals = wk.map(function(d){ return bests[d.k]||0; });
    x.clearRect(0,0,w,h);
    var max = Math.max.apply(null, vals.concat([1]));
    var nz = vals.filter(function(v){ return v>0; });
    if(!nz.length){
      x.fillStyle = "rgba(185,179,234,.45)"; x.font = "600 10px system-ui"; x.textAlign="center";
      x.fillText("Juega para ver tu curva", w/2, h/2);
      return;
    }
    var pad = 10, top = 8, bot = 16, iw = w-pad*2, ih = h-top-bot;
    function px(i){ return pad + (nz.length===1? iw/2 : iw*i/(6)); }
    function py(v){ return top + ih - (ih*(v/max)); }
    x.strokeStyle = "#ffd643"; x.lineWidth = 2; x.lineJoin="round";
    x.beginPath();
    for(var i=0;i<7;i++){
      if(!vals[i]) continue;
      var X = px(i), Y = py(vals[i]);
      if(!x._s){ x.moveTo(X,Y); x._s=1; } else x.lineTo(X,Y);
    }
    x.stroke();
    for(var j=0;j<7;j++){
      if(!vals[j]) continue;
      x.fillStyle = "#ffd643"; x.beginPath(); x.arc(px(j), py(vals[j]), 3, 0, 2*Math.PI); x.fill();
    }
    for(var k=0;k<7;k++){
      x.fillStyle = wk[k].today ? "#ffd643" : "rgba(185,179,234,.7)";
      x.font = "700 10px system-ui"; x.textAlign="center";
      x.fillText(wk[k].l, px(k), h-3);
    }
    x.fillStyle = "rgba(244,242,255,.85)"; x.font = "700 9px system-ui"; x.textAlign="left";
    x.fillText(round(max), 4, 10);
  }

  /* ---------- render ---------- */
  function renderPerfil(){
    var s = ls("ft")||{};
    var acc = (s.cat+s.miss)>0 ? Math.round(100*s.cat/(s.cat+s.miss)) : 0;
    var m = s.secs?Math.floor(s.secs/60):0;
    var top = 0;
    try{ var p = (typeof pb!=="undefined")?pb:{}; for(var k in p){ if(p[k]>top) top=p[k]; } }catch(e){}
    var done = (typeof completed!=="undefined")?completed.length:0;

    var av = el("perfAvatar"), fr;
    try { fr = frameById(activeFrame||"fr-none"); }catch(e){}
    if(av){
      av.textContent = (profile&&profile.avatar)||"\u{1FA99}";
      av.className = "big-avatar"+(fr && fr.cls?" "+fr.cls:"");
    }
    var nm = el("perfName"); if(nm) nm.textContent = profile?profile.name:"-";
    var tt = el("perfTitle"); if(tt){ try{ tt.textContent = titleById(activeTitle||"ti-novato").name; }catch(e){} }
    if(el("perfTier")){ try{ var t = seasonTier(); el("perfTier").innerHTML = t.ico+" <b>"+esc(t.nm)+"</b> <span style='opacity:.7;font-weight:700;'>"+num(t.pts)+" pts</span>"; }catch(e){} }
    if(el("perfStreak")){ try{ var st = dayStreak(); if(st>0){ el("perfStreak").style.display="inline-flex"; el("perfStreak").innerHTML="\u{1F525} <b>"+st+"</b> "+(st===1?"d\u00EDa":"d\u00EDas"); } else el("perfStreak").style.display="none"; }catch(e){} }
    if(el("perfReg")){ el("perfReg").textContent = profile && profile.reg ? "Jugador desde "+new Date(profile.reg).toLocaleDateString("es-ES") : "Jugador desde hoy"; }
    if(el("perfStatus")){ el("perfStatus").textContent = profile && profile.status ? "\u201C"+profile.status+"\u201D" : ""; }
    if(el("perfNick")) el("perfNick").value = profile?profile.name:"";
    if(el("perfStatusI")) el("perfStatusI").value = profile && profile.status ? String(profile.status).replace(/^“|”$/g,"") : "";
    if(el("perfCoins")) el("perfCoins").textContent = num(typeof coins!=="undefined"?coins:0);
    if(el("stPlays")) el("stPlays").textContent = num(s.plays||0);
    if(el("stWins")) el("stWins").textContent = num(s.wins||0);
    if(el("stAcc")) el("stAcc").textContent = (s.plays)?acc+"%":"-";
    if(el("stBest")) el("stBest").textContent = "x"+(s.best||0);
    if(el("stEarned")) el("stEarned").textContent = num(typeof totalEarned!=="undefined"?totalEarned:0);
    if(el("stDone")) el("stDone").textContent = done+"/18";
    if(el("stTime")) el("stTime").textContent = (s.secs? (m? m+"m "+ (s.secs%60)+"s" : s.secs+"s") : "0m");
    if(el("stTop")) el("stTop").textContent = num(top);

    var wk = weekKeys(), days = s.days||{}, bests = s.bests||{}, wc = el("weekCells");
    if(wc){
      wc.innerHTML = "";
      wk.forEach(function(d){
        var c = document.createElement("div");
        c.className = "wc"+(d.today?" on":"");
        c.innerHTML = '<div class="d">'+d.l+'</div><div class="p">'+(days[d.k]||0)+'</div><div class="s">'+(bests[d.k]?num(bests[d.k]):"\u00B7")+'</div>';
        wc.appendChild(c);
      });
    }
    if(typeof window.Poems!=="undefined"){
      var pw = el("perfPoems");
      if(pw){ try{ Poems.into(pw, true); }catch(e){} }
    }
    drawDonut(); drawWeek(); drawLine();
  }

  /* ---------- acciones ---------- */
  function featBits(){
    if(window.Feat && typeof Feat.share==="function"){
      var txt = "";
      try{ txt = Feat.share(); }catch(e){}
      if(txt){
        if(navigator.share && navigator.canShare && navigator.canShare({text:txt})){ navigator.share({title:"Op-Art Fan - Perfil", text:txt}).then(function(){ toast("Resumen compartido","\u{1F4AC}"); }).catch(function(){}); }
        else if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ toast("Resumen copiado","\u{1F4CB}"); }).catch(function(){ fallbackShare(txt); }); }
        else fallbackShare(txt);
      }
    }
  }
  function fallbackShare(){} /* opcional: sin camino nativo, se queda en silencio */

  function perfBind(){
    if(window._perfBound) return;
    if(!el("perfBack")) return;
    window._perfBound = true;
    el("perfBack").addEventListener("click", function(){ try{ sfxClick(); }catch(e){} goMenu(); });
    el("perfSave").addEventListener("click", function(){
      try{ ensureAudio(); sfxClick(); }catch(e){}
      var n = el("perfNick") ? el("perfNick").value.trim() : "";
      if(!n){ toast("Escribe un nombre","\u270B","err"); if(el("perfNick")) el("perfNick").focus(); return; }
      var fin = n.slice(0,16);
      profile.name = fin;
      profile.status = el("perfStatusI") ? el("perfStatusI").value.trim().slice(0,40) : "";
      if(!profile.reg) profile.reg = Date.now();
      saveAll();
      try{ refreshMenu(); }catch(e){}
      if(typeof Auth!=="undefined" && Auth.isAuthed && Auth.isAuthed() && Auth.uid() && el("perfNick")){
        try{ SupRemote.rpc("set_nickname",{p_name:fin}).then(function(res){ if(res && res.error){ toast(String(res.error).replace("slv: ",""),"\u26A0","err",3200); } }).catch(function(){}); }catch(e){}
      }
      toast("Perfil guardado","\u2714",null,1400);
      try{ renderPerfil(); }catch(e){}
    });
    el("perfShare").addEventListener("click", function(){ try{ ensureAudio(); sfxClick(); }catch(e){} featBits(); });
  }

  window.renderPerfil = function(){
    perfBind();
    renderPerfil();
  };
})();