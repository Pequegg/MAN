/* Op-Art Fan - modulo: js/ui/armario.js */

"use strict";

/* ---------- Armario / Perfil (spec v2 Fase 1) ----------
   Equipa mascota, abanico (paleta), marco y título.
   Todo desbloqueo valida en servidor via RPC `redeem_item`
   cuando hay sesión Google; si no, se compra en local. */
var armTab = "mascot";
var ARM_CATS = [
 {k:"mascot",  lbl:"\u{1F43E} Mascotas", rows:MASCOTS},
 {k:"fanskin", lbl:"\u{1F3A9} Abanico",  rows:FANSKINS},
 {k:"frame",   lbl:"\u{1F3C6} Marco",    rows:FRAMES},
 {k:"title",   lbl:"\u{1F396} Título",   rows:TITLES}
];
function armRows(k){ var c=ARM_CATS.find(function(x){return x.k===k;}); return c?c.rows:[]; }
function armUsable(slot, id){
  if(id==="fan-clasico"||id==="fr-none"||id==="ti-novato") return true;
  if(slot==="title"){ var t=titleById(id); if(titleUnlocked(t)) return true; }
  return cosOwned(id);
}
function renderArmPreview(){
  var pv=$("armPv");
  var fr=frameById(activeFrame);
  pv.className="ava-stack"+(fr.cls?" "+fr.cls:"");
  var hat=arena.wardrobe.hat, cape=arena.wardrobe.cape;
  pv.innerHTML=(hat?'<span class="wa wa-hat">'+esc(hat)+'</span>':'')+(cape?'<span class="wa wa-cape">'+esc(cape)+'</span>':'')+
    '<span class="wbase">'+esc(profile.avatar)+'</span>';
  $("armName").textContent=profile.name;
  $("armTitle").textContent=titleById(activeTitle).name;
  var mc=$("armMascot"); mc.style.display=activeMascot?"inline-flex":"none";
  var m=mascotById(activeMascot);
  mc.textContent=m?m.icon:"";
  $("armFrame").textContent=fr.name;
  $("armCoins").textContent=num(coins);
}
function armCard(it, slot){
  var usable=armUsable(slot, it.id);
  var active=cosActive(it.id, slot);
  var d=document.createElement("div");
  d.className="wear-item"+(active?" on":"")+(!usable?" lock":"");
  var extra = slot==="title" && it.ach ? '<div class="wi-req">Logro: '+esc(achById(it.ach).name)+'</div>' : "";
  var price = it.price>0 ? "\u{1FA99} "+num(it.price) : "GRATIS";
  d.innerHTML='<div class="wi-ico">'+(it.icon||frIco(it.rar))+'</div>'+
    '<div class="wi-nm">'+esc(it.name)+'</div>'+
    (extra || '<div class="wi-pm">'+(active?"Equipado":(usable?"Usar":price))+'</div>')+
    (it.desc?('<div class="wi-req">'+esc(it.desc)+'</div>'):'');
  d.onclick=function(){ ensureAudio(); sfxClick();
    if(usable) equipSlot(slot, it.id);
    else claimCos(it.id, slot);
  };
  return d;
}
function renderArmGrid(){
  ARM_CATS.forEach(function(c){
    var g=$("armList"+c.k[0].toUpperCase()+c.k.slice(1));
    if(!g) return;
    g.innerHTML="";
    c.rows.forEach(function(it){ g.appendChild(armCard(it, c.k)); });
  });
}
function renderArmario(){
  renderArmPreview(); renderArmGrid();
  ARM_CATS.forEach(function(c){
    var t=$("armTab"+c.k[0].toUpperCase()+c.k.slice(1));
    if(t) t.classList.toggle("on", armTab===c.k);
  });
  var gs={mascot:"armListMascot", fanskin:"armListFanskin", frame:"armListFrame", title:"armListTitle"};
  Object.keys(gs).forEach(function(k){
    var g=$(gs[k]); if(g) g.classList.toggle("hidden", armTab!==k);
  });
}
ARM_CATS.forEach(function(c){ /* listeners */
  setTimeout(function(){ var t=$("armTab"+c.k[0].toUpperCase()+c.k.slice(1)); if(t) t.onclick=function(){ sfxClick(); armTab=c.k; renderArmario(); }; }, 0);
});
$("armBack").addEventListener("click", function(){ sfxClick(); goMenu(); });