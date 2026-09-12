/* Op-Art Fan - modulo: js/ui/shop.js */

"use strict";

/* ---------- Tienda ---------- */
function renderShop(){ renderConsum(); paintSkinTab(); renderRotativa(); }
function renderShopCoins(){ if($("shopCoins")) $("shopCoins").textContent=num(coins); refreshMenuCoins(); }
function toggleEquip(id){
  if((inventory[id]||0)>0){
    if(equipped.indexOf(id)===-1) equipped.push(id); else equipped = equipped.filter(function(x){return x!==id;});
    saveAll(); renderConsum();
  }
}
function buyItem(id){
  var it=itemInfo(id); if(!it) return;
  Ec.buy("inv", id, it.price).then(function(res){
    if(!res.ok){ toast(res.msg||"No se pudo comprar","\u{1FA99}","err"); if(coins<it.price) sfxMiss(); return; }
    sndPlay("buy"); unlock("comprar");
    toast("Compraste "+it.name+" x1","\u{1F6D2}",null,1800);
    renderShopCoins(); renderConsum();
  });
}
function buySkin(sk){
  if(ownedSkins.indexOf(sk.id)>-1) return;
  Ec.buy("skin", sk.id, sk.price).then(function(res){
    if(!res.ok){ toast(res.msg||"No se pudo comprar","\u{1FA99}","err"); sfxMiss(); return; }
    sndPlay("buy"); unlock("skin");
    toast("Skin "+sk.name+" comprada","\u{1F3A8}");
    renderShopCoins(); paintSkinTab();
  });
}
function renderConsum(){
  var list=$("consumList"); list.innerHTML="";
  ITEMS.forEach(function(it){
    var n=inventory[it.id]||0;
    var eqi=equipped.indexOf(it.id)>-1;
    var line=document.createElement("div");
    line.className="cell-card";
    line.innerHTML='<div class="item-ico">'+it.icon+'</div>'+
      '<div class="meta"><div class="nm">'+it.name+(n>0?'<span class="stack">x'+n+'</span>':'')+'</div>'+
      '<div class="sd">'+esc(it.desc)+(eqi?'<b style="color:var(--cyan);"> \u00B7 Equipado</b>':'')+'</div></div>'+
      '<span class="item-price">🪙 '+num(it.price)+'</span>';
    var col=document.createElement("div"); col.style.display="flex"; col.style.gap="6px";
    var bBuy=document.createElement("button"); bBuy.className="btn small cyan"; bBuy.textContent="Comprar"; bBuy.onclick=function(){ ensureAudio(); sfxClick(); buyItem(it.id); };
    var bEq=document.createElement("button"); bEq.className="btn small "+(eqi?"gold":"ghost"); bEq.textContent=eqi?"Equipado":"Equipar"; bEq.disabled=n===0; bEq.onclick=function(){ ensureAudio(); sfxClick(); toggleEquip(it.id); };
    col.appendChild(bEq); col.appendChild(bBuy);
    line.appendChild(col);
    list.appendChild(line);
  });
}
function paintSkinTab(){
  var list=$("skinList"); list.innerHTML="";
  SKINS.forEach(function(sk){
    var owned = ownedSkins.indexOf(sk.id)>-1;
    var sel = activeSkin===sk.id;
    var card=document.createElement("div");
    card.className="cell-card";
    card.innerHTML='<div class="item-ico" style="background:linear-gradient(135deg,#222, #333); color:#fff;">'+sk.icon+'</div>'+
      '<div class="meta"><div class="nm">'+sk.name+(sel?' <span class="tag new">ACTIVA</span>':'')+'</div><div class="sd">'+esc(sk.desc)+'</div></div>'+
      '<span class="item-price">'+ (sk.price>0 ? '🪙 '+num(sk.price) : "GRATIS") +'</span>';
    var b=document.createElement("button");
    if(!owned){ b.className="btn small cyan"; b.textContent="Comprar"; b.onclick=function(){ ensureAudio(); sfxClick(); buySkin(sk); }; }
    else { b.className="btn small "+(sel?"gold":"ghost"); b.textContent=sel?"Equipada":"Usar"; b.onclick=function(){ ensureAudio(); sfxClick(); activeSkin=sk.id; saveAll(); paintSkinTab(); toast("Skin "+sk.name+" activada","\u{1F3A8}"); }; }
    card.appendChild(b);
    list.appendChild(card);
  });
}

/* ---------- Tienda rotativa (cambia cada 24 h, semilla de daily.js) ---------- */
function catOf(id){
  if(itemInfo(id)) return "inv";
  for(var i=0;i<SKINS.length;i++) if(SKINS[i].id===id) return "skin";
  for(var j=0;j<FANSKINS.length;j++) if(FANSKINS[j].id===id) return "fanskin";
  for(var k=0;k<FRAMES.length;k++) if(FRAMES[k].id===id) return "frame";
  for(var m=0;m<TITLES.length;m++) if(TITLES[m].id===id) return "title";
  for(var n=0;n<MASCOTS.length;n++) if(MASCOTS[n].id===id) return "mascot";
  return "inv";
}
function rotOwned(cat, id){
  if(cat==="inv") return false;
  if(cat==="skin") return ownedSkins.indexOf(id)>-1;
  if(cat==="wear") return (arena.wardrobe.owned||[]).indexOf(id)>-1;
  return ownedCosmetics.indexOf(id)>-1;
}
function rotUse(cat, id){
  if(cat==="skin"){ activeSkin=id; }
  else if(cat==="fanskin"){ activateCos("fanskin", id); }
  else if(cat==="frame"){ activateCos("frame", id); }
  else if(cat==="title"){ activateCos("title", id); }
  else if(cat==="mascot"){ activateCos("mascot", id); }
  saveAll(); renderRotativa(); refreshMenu();
}
function activateCos(slot, id){
  if(slot==="fanskin") activeFanSkin=id;
  else if(slot==="frame") activeFrame=id;
  else if(slot==="title") activeTitle=id;
  else if(slot==="mascot") activeMascot=id;
}
function renderRotativa(){
  var list=$("rotList"); if(!list) return;
  var day=dayNum();
  list.innerHTML='<div class="center sub" style="font-size:12px; color:var(--dim); padding:6px 0 2px;">Ofertas del día · cambian cada 24 h</div>';
  ROT.pick(day).forEach(function(it){
    var owned=rotOwned(it.cat, it.id);
    var card=document.createElement("div");
    card.className="cell-card";
    card.innerHTML='<div class="item-ico">'+it.icon+'</div>'+
      '<div class="meta"><div class="nm">'+it.name+'</div><div class="sd">'+esc(it.desc)+'</div></div>'+
      '<span class="item-price">'+ (owned?"\u2714 Tuyo":"🪙 "+num(it.price)) +'</span>';
    var b=document.createElement("button");
    if(owned){ b.className="btn small gold"; b.textContent="Usar"; b.onclick=function(){ ensureAudio(); sfxClick(); rotUse(it.cat, it.id); }; }
    else { b.className="btn small cyan"; b.textContent="Comprar"; b.onclick=function(){ ensureAudio(); sfxClick(); buyRot(it); }; }
    card.appendChild(b);
    list.appendChild(card);
  });
  if($("rotCount")) $("rotCount").textContent=num(coins);
}
function buyRot(it){
  Ec.buy(it.cat, it.id, it.price).then(function(res){
    if(!res.ok){ toast(res.msg||"No se pudo comprar","\u{1FA99}","err"); sfxMiss(); return; }
    sndPlay("buy"); unlock("comprar");
    toast(it.name+" comprado","\u{1F6D2}",null,1800);
    renderShopCoins(); renderConsum(); paintSkinTab(); renderRotativa();
  });
}
function switchShopTab(which){
  $("tabConsum").classList.toggle("on", which==="consum");
  $("tabSkins").classList.toggle("on", which==="skins");
  $("tabRot").classList.toggle("on", which==="rot");
  $("consumList").classList.toggle("hidden", which!=="consum");
  $("skinList").classList.toggle("hidden", which!=="skins");
  $("rotList").classList.toggle("hidden", which!=="rot");
}
$("tabConsum").addEventListener("click", function(){ sfxClick(); switchShopTab("consum"); });
$("tabSkins").addEventListener("click", function(){ sfxClick(); switchShopTab("skins"); });
$("tabRot").addEventListener("click", function(){ sfxClick(); switchShopTab("rot"); });