/* Op-Art Fan - Talismanes "Nueve Sellos" (modulo lazy). Coleccionables
   derivados de datos ya existentes (sin economia). Nueve sellos, uno oculto:
   5 toques sobre tu nick lo desbloquea. Inyecta CSS + panrilla en Perfil. */
(function(){
  "use strict";

  if(!document.getElementById("talisStyle")){
    var s = document.createElement("style");
    s.id = "talisStyle";
    s.textContent =
      ".tal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;"+
      "margin-top:6px;}"+
      ".tal{position:relative;border:1px solid rgba(255,255,255,.18);border-radius:12px;"+
      "padding:8px 4px;text-align:center;background:rgba(255,255,255,.05);cursor:pointer;"+
      "transition:transform .15s;}"+
      ".tal.got{background:rgba(255,215,100,.12);border-color:#ffd764;}"+
      ".tal .ti{font-size:22px;line-height:1;}"+
      ".tal .tn{font-size:10px;margin-top:4px;color:var(--t2,#ffd764);}"+
      ".tal.miss{opacity:.45;}"+
      ".tal.ocu .tn{color:#999;font-style:italic;}"+
      ".tal:hover{transform:scale(1.08);}"+
      ".perf-sec.talis{margin-top:14px;}";
    document.head.appendChild(s);
  }

  function get(k, d){ try{ var v = localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } }
  function ls(k, v){ if(arguments.length>1){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } else { return get(k, null); } }
  function achHas(a){ return (typeof achievements!=="undefined" && achievements && achievements.indexOf(a)>-1); }
  function doneLv(n){ return (typeof completed!=="undefined" && completed && completed.indexOf(n)>-1); }

  var TALS = [
    {id:"t1", ico:"\u{1F3A8}", name:"Primer Motivo", desc:"Completa el nivel 1 · Tinta y Caligraf\u00EDa", got:function(){ return doneLv(1); }},
    {id:"t2", ico:"\u{1F3D5}", name:"Talla de la Muralla", desc:"Completa el nivel 9 · Gran Muralla", got:function(){ return doneLv(9); }},
    {id:"t3", ico:"\u{1F409}", name:"Escama del Drag\u00F3n", desc:"Vence al Drag\u00F3n del Zodiaco", got:function(){ return doneLv(17); }},
    {id:"t4", ico:"\u{1F525}", name:"Ceniza de Nian", desc:"Vence a Nian, el Monstruo", got:function(){ return doneLv(18); }},
    {id:"t5", ico:"\u{1F31F}", name:"Combo Estelar", desc:"Alcanza el logro Combo x20", got:function(){ return achHas("combo20"); }},
    {id:"t6", ico:"\u{1F4DC}", name:"Verso Guardado", desc:"Descubre un poema cl\u00E1sico", got:function(){ var p = ls("poems"); return !!(p && p.length); }},
    {id:"t7", ico:"\u{1F3A8}", name:"Aguas Te\u00F1idas", desc:"Activa una paleta de men\u00FA", got:function(){ var p = ls("palette"); return !!(p && p!=="laca" && p!=="default"); }},
    {id:"t8", ico:"\u{1F3AF}", name:"Flecha Aprendiza", desc:"Completa 10 partidas", got:function(){ var f = ls("ft"); return !!(f && f.plays>=10); }},
    {id:"t9", ico:"\u{1F5E1}", name:"El S\u00E9ptimo Sello", desc:"\u2B50 Secreto \u2014 toca tu nick 5 veces", hidden:true, got:function(){ return ls("talsecret")===1; }}
  ];

  function sec(ico, t){
    var d = document.createElement("div");
    d.className = "perf-sec talis";
    d.innerHTML = '<div class="ps-t">'+ico+' '+t+'</div><div class="tal-grid"></div>';
    return d;
  }

  function chip(t){
    var g = t.got();
    var c = document.createElement("div");
    c.className = "tal"+(g?" got":" miss")+(t.hidden?" ocu":"");
    c.title = t.desc;
    c.innerHTML = '<div class="ti">'+(t.hidden&&!g?"\u2753":t.ico)+'</div><div class="tn">'+(t.hidden&&!g?"\u002E\u002E\u002E":t.name)+'</div>';
    return c;
  }

  var bound = false;
  function bindEgg(){
    if(bound) return; bound = true;
    var n = document.getElementById("perfName");
    if(!n) return;
    var taps = 0;
    n.addEventListener("click", function(){
      taps++;
      if(taps>=5 && ls("talsecret")!==1){
        ls("talsecret", 1);
        try{ sfxClick(); }catch(e){}
        if(window.toast) toast("\u2B50 \u00A1Ah\u00ED estaba! Has desbloqueado \u201CEl S\u00E9ptimo Sello\u201D.", 3200);
        var box = document.getElementById("perfTalis");
        if(box && typeof box.refreshFn==="function") box.refreshFn();
      }
    });
  }

  function into(box){
    if(!box) return;
    box.innerHTML = "";
    var g = sec("\uD83D\uDC0D", "Talismanes");
    var gridEl = g.querySelector(".tal-grid");
    TALS.forEach(function(t){ gridEl.appendChild(chip(t)); });
    box.appendChild(g);
    box.style.display = "";
    box.refreshFn = function(){
      gridEl.innerHTML = "";
      TALS.forEach(function(t){ gridEl.appendChild(chip(t)); });
    };
    bindEgg();
  }

  function list(){ return TALS.map(function(t){ return { id:t.id, name:t.name, desc:t.desc, ico:t.ico, hidden:!!t.hidden, got:t.got() }; }); }

  window.Tal = { into: into, list: list };
})();