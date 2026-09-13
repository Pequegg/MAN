/* Op-Art Fan - modulo: js/levels/cosmetics.js */

"use strict";

/* ---------- Cosmética (spec v2 Fase 1) ----------
   Fan skins (paletas), marcos de avatar, títulos y mascotas.
   La propiedad se registra en `ownedCosmetics`; las compras pasan
   por el RPC `redeem_item` (Server-side) cuando hay sesión Google,
   o en local si se juega como invitado. */

var _rarIco = {comun:"\u{1F7E2}", raro:"\u{1F7E1}", epico:"\u{1F535}", leyenda:"\u{1F451}"};
function frIco(x){ return _rarIco[x]||"\u{1F7E2}"; }

/* Abanicos: paleta que reemplaza a la del nivel (puro cosmético). */
var FANSKINS = [
 {id:"fan-clasico", name:"Abanico Clásico", price:0,   rar:"comun", icon:"\u{1F3A9}", desc:"La paleta original del juego", pal:null},
 {id:"fan-lotus",   name:"Loto Plateado",   price:300, rar:"comun", icon:"\u{1F33B}", desc:"Porcelana blanca y plata", pal:["#f5f3ea","#d8d4c4","#a8a294","#6f6a5e","#3c3931","#e8e4d4","#bab4a2"]},
 {id:"fan-peonia",  name:"Peonía Roja",     price:420, rar:"comun", icon:"\u{1F339}", desc:"Rojo lacado y oro", pal:["#c23a2a","#e0684b","#f2b06a","#7a1d12","#ffd9a6","#5c0f12","#f06843"]},
 {id:"fan-jade",    name:"Ondas de Jade",   price:520, rar:"comun", icon:"\u{1F7E2}", desc:"Verde imperial y aguamarina", pal:["#baffdc","#7fdea8","#1f9d63","#0e5c3a","#daf6e5","#25c478","#033019"]},
 {id:"fan-dusk",    name:"Crepúsculo Púrpura", price:700, rar:"raro", icon:"\u{1F319}", desc:"Violeta profundo al atardecer", pal:["#c98fe8","#9a62c9","#6d3fa1","#372052","#ffe3f1","#a675d6","#241236"]},
 {id:"fan-dragon",  name:"Dragón Dorado",   price:1400, rar:"raro", icon:"\u{1F409}", desc:"Tono imperial de oro y cobre", pal:["#ffe27a","#d9a441","#8a5a00","#4a2c00","#fff0b8","#ffd643","#2a1600"]},
 {id:"fan-ciruelo", name:"Flor de Ciruelo", price:1600, rar:"raro", icon:"\u{1F338}", desc:"Rosa carmín y nieve", pal:["#ffc2d6","#e88fb0","#c94d78","#7b1f45","#fdf3f7","#f7e3ec","#4a1030"]},
 {id:"fan-grulla",  name:"Grulla Celeste",  price:2200, rar:"epico", icon:"\u{1F436}", desc:"Cielo azul y ala blanca", pal:["#bcd9f4","#7fb5e0","#4f7fb0","#24486e","#eef4f9","#9fc9e8","#142f4d"]},
 {id:"fan-laca",    name:"Laca Imperial",   price:8000, rar:"leyenda", icon:"\u{1F488}", desc:"Laca negra, sangre y oro: el abanico del emperador", pal:["#1a0306","#5c0f12","#c23a2a","#ffd643","#8f1a20","#f06843","#2b0a08"]}
];
function fanSkinById(id){ return FANSKINS.find(function(s){return s.id===id;})||FANSKINS[0]; }

/* Marcos de avatar (bordes animados en CSS) */
var FRAMES = [
 {id:"fr-none",  name:"Sin marco",     price:0,   rar:"comun",  cls:"",        desc:"Nada especial"},
 {id:"fr-rojo",  name:"Marco Rojo",    price:250, rar:"comun",  cls:"frm-rojo",  desc:"Almendra roja lacada"},
 {id:"fr-jade",  name:"Marco Jade",    price:350, rar:"comun",  cls:"frm-jade",  desc:"Jade imperial pulido"},
 {id:"fr-oro",   name:"Marco Oro",     price:500, rar:"comun",  cls:"frm-oro",   desc:"Oro del festival"},
 {id:"fr-neon",  name:"Marco Neón",    price:900, rar:"raro",   cls:"frm-neon",  desc:"Brillo cian animado"},
 {id:"fr-iris",  name:"Marco Arcoíris", price:1600, rar:"epico", cls:"frm-iris", desc:"Seda multicolor que fluye"},
 {id:"fr-legend",name:"Marco Legendario", price:4500, rar:"leyenda", cls:"frm-legend", desc:"Aura dorada con destellos"}
];
function frameById(id){ return FRAMES.find(function(f){return f.id===id;})||FRAMES[0]; }

/* Títulos debajo del nick. Algunos se regalan con logros. */
var TITLES = [
 {id:"ti-novato",  name:"Novato del Abanico",  price:0,   ach:null,       desc:"Todos empiezan aquí"},
 {id:"ti-cazador", name:"Cazador de Faroles",  price:350, ach:null,       desc:"Maestro del festival de linternas"},
 {id:"ti-mozaico", name:"Maestro Calígrafo",   price:850, ach:"completo", desc:"La tinta fluye en tus venas"},
 {id:"ti-guardian",name:"Guardián del Nian",   price:2000, ach:"completo",desc:"Venciste al monstruo del Año Nuevo"},
 {id:"ti-leyenda", name:"Leyenda del Abanico", price:3200, ach:"leyenda", desc:"Solo unos pocos lo merecen"}
];
function titleById(id){ return TITLES.find(function(t){return t.id===id;})||TITLES[0]; }
function titleFreeByAch(t){ return t.ach ? (typeof achievements!=="undefined" && achievements.indexOf(t.ach)>-1) : (t.price===0); }
function titleUnlocked(t){ return cosOwned(t.id) || titleFreeByAch(t); }

/* Mascotas: compañeros del menú (cosmético puro, sin P2W),
   reaccionan al tocarlos con un bocadillo. */
var MASCOTS = [
 {id:"mas-dragon", name:"Dragón Bebé",     price:500,  icon:"\u{1F409}", frases:["\u201CBuen tiro!\u201D","\u201CCuenta conmigo\u201D","\u201COtro nivel más\u201D"]},
 {id:"mas-zorro",  name:"Zorro de Nueve Colas", price:900, icon:"\u{1F98A}", frases:["\u201CIdeas de zorro\u201D","\u201CLa cola al viento\u201D","\u201C¡Casi, casi!\u201D"]},
 {id:"mas-panda",  name:"Panda Calígrafo", price:1400, icon:"\u{1F43C}", frases:["\u201CRespira y acierta\u201D","\u201CLa paciencia es tinta\u201D","\u201CBambú para todos\u201D"]},
 {id:"mas-grulla", name:"Grulla de Papel", price:2000, icon:"\u{1F9E0}", frases:["\u201CVuela alto\u201D","\u201CMil abanicos, un destino\u201D","\u201CHasta luego, pescador\u201D"]}
];
function mascotById(id){ return MASCOTS.find(function(m){return m.id===id;})||null; }
function mascotPhrase(id){
  var m=mascotById(id); if(!m) return "";
  return m.frases[Math.floor(Math.random()*m.frases.length)];
}

function cosOwned(id){ return ownedCosmetics.indexOf(id)>-1; }

/* ---------- Tienda rotativa (ofrece 7 piezas, semilla de daily.js) ---------- */
var ROT = {
  pool: function(){
    var p=[];
    SKINS.forEach(function(s){ if(s.price>0) p.push({id:s.id, cat:"skin", price:s.price, icon:s.icon, name:s.name, desc:s.desc}); });
    FANSKINS.forEach(function(s){ if(s.price>0) p.push({id:s.id, cat:"fanskin", price:s.price, icon:s.icon, name:s.name, desc:s.desc}); });
    FRAMES.forEach(function(s){ if(s.price>0) p.push({id:s.id, cat:"frame", price:s.price, icon:frIco(s.rar), name:s.name, desc:s.desc}); });
    TITLES.forEach(function(s){ if(s.price>0 && !s.ach) p.push({id:s.id, cat:"title", price:s.price, icon:"\u{1F396}", name:s.name, desc:s.desc}); });
    MASCOTS.forEach(function(s){ p.push({id:s.id, cat:"mascot", price:s.price, icon:s.icon, name:s.name, desc:"Compañero del menú"}); });
    ITEMS.forEach(function(s){ p.push({id:s.id, cat:"inv", price:s.price, icon:s.icon, name:s.name, desc:s.desc}); });
    return p;
  },
  pick: function(day){
    var r=mulberry32(day+7777), p=ROT.pool(), out=[], cats={}, tries=0;
    while(out.length<7 && p.length && tries<80){
      tries++;
      var it=p.splice(Math.floor(r()*p.length),1)[0];
      if(cats[it.cat] && it.cat!=="inv") continue;
      cats[it.cat]=1; out.push(it);
    }
    return out;
  }
};
function cosActive(id, slot){
  var a={"fanskin":activeFanSkin,"frame":activeFrame,"title":activeTitle,"mascot":activeMascot}[slot];
  return a===id;
}
function claimCos(id, slot){
  var it = slot==="fanskin" ? fanSkinById(id)
        : slot==="frame"   ? frameById(id)
        : slot==="title"   ? titleById(id)
        : mascotById(id);
  if(!it) return;
  if(cosOwned(id) || titleUnlocked(it) || it.price===0){ equipSlot(slot, id); return; }
  Ec.buy(slot, id, it.price).then(function(ok, profv){
    if(ok) equipSlot(slot, id);
    else if(profv && profv.msg) toast(profv.msg,"\u{1FA99}","err");
  });
}
function equipSlot(slot, id){
  if(slot==="fanskin") activeFanSkin=id;
  else if(slot==="frame") activeFrame=id;
  else if(slot==="title") activeTitle=id;
  else if(slot==="mascot") activeMascot=id;
  saveAll();
  sfxGold();
  if(typeof renderArmario==="function") renderArmario();
  refreshMenu();
  toast("Equipado","\u2714",null,1200);
}