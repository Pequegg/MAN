/* Op-Art Fan - Paletas de menú desbloqueables (modulo lazy). Aplican CSS vars
   en runtime (injecta <style>), sin tocar el presupuesto core. Desbloqueo por
   hitos de progreso (no monedas): coleccionable sin riesgo economico/server. */
(function(){
  "use strict";

  var PALS = [
    { id:"laca",     name:"Laca Imperial",   icon:"\u{1F488}", need:null,                   note:"" },
    { id:"tinta",    name:"Noche de Tinta",  icon:"\u{1F58B}\uFE0F", need:"te500",         note:"Gana 500 monedas en total" },
    { id:"festival", name:"Festival",        icon:"\u{1F3EE}", need:"ach:combo20",         note:"Logro: Combo x20" },
    { id:"jade",     name:"Jardín de Jade",  icon:"\u{1F7E2}", need:"lv6",                 note:"Completa 6 niveles" },
    { id:"dorada",   name:"Palacio Dorado",  icon:"\u{1F3DB}\uFE0F", need:"lv12",          note:"Completa 12 niveles" },
    { id:"dragon",   name:"Manto del Dragón",icon:"\u{1F409}", need:"ach:leyenda",          note:"Logro: Leyenda" }
  ];

  /* Variables que sobreescribe cada paleta (resto heredan de :root). */
  var VARS = {
    laca:    null,
    tinta:   { "--bg0":"#0d0b18", "--bg1":"#16122e", "--panel":"rgba(60,50,120,.20)", "--panel2":"rgba(90,70,160,.14)", "--line":"rgba(180,170,255,.22)", "--gold":"#cbb26a", "--lacq":"#5846c9", "--pink":"#7a6bff" },
    festival:{ "--bg0":"#2a0a12", "--bg1":"#5c1220", "--panel":"rgba(160,40,50,.22)", "--panel2":"rgba(210,60,70,.14)", "--line":"rgba(255,190,180,.30)", "--gold":"#ffd643", "--lacq":"#e0454f", "--pink":"#ff7b8a" },
    jade:    { "--bg0":"#062018", "--bg1":"#0c3a2a", "--panel":"rgba(30,120,80,.20)", "--panel2":"rgba(50,150,105,.13)", "--line":"rgba(150,230,190,.28)", "--gold":"#d9f2b8", "--lacq":"#1f9d63", "--pink":"#7fe3b0" },
    dorada:  { "--bg0":"#200f02", "--bg1":"#4a2508", "--panel":"rgba(150,90,20,.22)", "--panel2":"rgba(200,130,30,.14)", "--line":"rgba(255,220,150,.30)", "--gold":"#ffe27a", "--lacq":"#d9a441", "--pink":"#e8b04a" },
    dragon:  { "--bg0":"#0b0503", "--bg1":"#2a0d06", "--panel":"rgba(120,40,20,.26)", "--panel2":"rgba(200,60,30,.15)", "--line":"rgba(255,150,110,.32)", "--gold":"#ff9b3d", "--lacq":"#c23a2a", "--pink":"#ff6b7d", "--cream":"#f7e6d8" }
  };

  function current(){ var p = ls("palette"); return PALS.some(function(x){ return x.id===p; }) ? p : "laca"; }

  function unlocked(p){
    if(!p.need) return true;
    if(p.need.indexOf("te")===0){
      var n = Number(p.need.slice(2)); return (typeof totalEarned!=="undefined") && totalEarned>=n;
    }
    if(p.need.indexOf("ach:")===0){
      var a = p.need.slice(4);
      return (typeof achievements!=="undefined") && achievements.indexOf(a)>-1;
    }
    if(p.need.indexOf("lv")===0){
      var m = Number(p.need.slice(2)); return (typeof completed!=="undefined") && completed.filter(function(c){ return c<18; }).length>=m;
    }
    return false;
  }

  var _stId = null;
  function apply(id, silent){
    if(!VARS[id]) id = "laca";
    var st = document.getElementById("paleStyle");
    var vars = VARS[id];
    if(!st){
      st = document.createElement("style");
      st.id = "paleStyle";
      document.head.appendChild(st);
    }
    if(vars){
      var txt = ":root{"+Object.keys(vars).map(function(k){ return k+":"+vars[k]+";"; }).join("")+"}";
      if(st.textContent!==txt) st.textContent = txt;
    } else {
      st.textContent = "";
    }
    try{ ls("palette", id); }catch(e){}
    _stId = id;
    if(!silent && typeof refreshMenu==="function"){ try{ refreshMenu(); }catch(e){} }
  }

  function chipFor(p){
    var u = unlocked(p);
    var on = current()===p.id;
    return '<button class="pal-chip '+(on?"on":"")+'" data-p="'+p.id+'" disabled="'+(u?"":"disabled")+'">'+
      '<span class="sw" style="background:'+(VARS[p.id]?VARS[p.id]["--bg1"]||"#2a2181":"#2a2181")+'"></span>'+
      '<span class="nm">'+esc(p.name)+'</span>'+
      (u?"":'<span class="lk">\u{1F512}</span>')+
      (on?'<span class="ck">\u2713</span>':'')+
      '</button>';
  }

  function into(box){
    if(!box) return;
    if(!document.getElementById("paleUi")){
      var st = document.createElement("style");
      st.id = "paleUi";
      st.textContent = ".pale-head{font-size:12px;font-weight:900;color:var(--gold);margin:2px 0 6px;}"+
        ".pale-row{display:flex;flex-wrap:wrap;gap:8px;}"+
        ".pal-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;color:var(--txt);cursor:pointer;}"+
        ".pal-chip .sw{width:14px;height:14px;border-radius:50%;border:1px solid rgba(255,255,255,.25);flex:none;}"+
        ".pal-chip.on{background:linear-gradient(135deg,rgba(255,214,67,.22),rgba(214,170,60,.08));border-color:rgba(255,214,67,.55);}"+
        ".pal-chip .lk{opacity:.7;}"+
        ".pal-chip .ck{color:var(--gold);}"+
        ".pal-chip[disabled]{opacity:.45;cursor:default;}"+
        ".pale-hints{font-size:10px;color:var(--dim);margin-top:6px;line-height:1.4;}";
      document.head.appendChild(st);
    }
    var html = '<div class="pale-head">\u{1F3A8} Tema del menú</div>';
    html += '<div class="pale-row">';
    PALS.forEach(function(p){ html += chipFor(p); });
    html += '</div>';
    var locked = PALS.filter(function(p){ return !unlocked(p); }).map(function(p){ return p.note; });
    html += '<div class="pale-hints">'+(locked.length?locked.join(" \u00B7 "):"Todos desbloqueados")+'</div>';
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".pal-chip"), function(c){
      if(c.getAttribute("disabled")==="disabled") return;
      c.addEventListener("click", function(){
        try{ ensureAudio(); sfxClick(); }catch(e){}
        apply(c.getAttribute("data-p"));
        into(box);
      });
    });
  }

  /* Al boot: restaura la paleta guardada sin flash visible. */
  (function(){ try{ apply(current(), true); }catch(e){} })();

  window.Pale = { apply: apply, unlocked: unlocked, into: into, current: current, list: PALS };
})();