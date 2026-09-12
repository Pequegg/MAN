/* Op-Art Fan - modulo: js/ui/shop.js */

"use strict";

/* ---------- Tienda ---------- */
function renderShop(){ renderConsum(); paintSkinTab(); }
function toggleEquip(id){
  if((inventory[id]||0)>0){
    if(equipped.indexOf(id)===-1) equipped.push(id); else equipped = equipped.filter(function(x){return x!==id;});
    saveAll(); renderConsum();
  }
}
function buyItem(id){
  var it=itemInfo(id); if(!it) return;
  if(coins<it.price){ toast("No tienes suficientes monedas","\u{1FA99}","err"); sfxMiss(); return; }
  coins-=it.price; inventory[id]=(inventory[id]||0)+1; saveAll(); sfxGold(); sndPlay("buy"); unlock("comprar"); refreshMenuCoins(); renderConsum();
  toast("Compraste "+it.name+" x1","\u{1F6D2}",null,1800);
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
    var sw = skinById(activeSkin);
    var card=document.createElement("div");
    card.className="cell-card";
    card.innerHTML='<div class="item-ico" style="background:linear-gradient(135deg,#222, #333); color:#fff;">'+sk.icon+'</div>'+
      '<div class="meta"><div class="nm">'+sk.name+(sel?' <span class="tag new">ACTIVA</span>':'')+'</div><div class="sd">'+esc(sk.desc)+'</div></div>'+
      '<span class="item-price">'+ (sk.price>0 ? '🪙 '+num(sk.price) : "GRATIS") +'</span>';
    var b=document.createElement("button");
    if(!owned){ b.className="btn small cyan"; b.textContent="Comprar"; b.onclick=function(){ ensureAudio(); sfxClick(); if(coins<sk.price){toast("No tienes suficientes monedas","\u{1FA99}","err"); sfxMiss(); return;} coins-=sk.price; ownedSkins.push(sk.id); saveAll(); refreshMenuCoins(); unlock("skin"); sndPlay("buy"); toast("Skin "+sk.name+" comprada","\u{1F3A8}"); paintSkinTab(); }; }
    else { b.className="btn small "+(sel?"gold":"ghost"); b.textContent=sel?"Equipada":"Usar"; b.onclick=function(){ ensureAudio(); sfxClick(); activeSkin=sk.id; saveAll(); paintSkinTab(); toast("Skin "+sk.name+" activada","\u{1F3A8}"); }; }
    card.appendChild(b);
    list.appendChild(card);
  });
}
function switchShopTab(which){
  $("tabConsum").classList.toggle("on", which==="consum");
  $("tabSkins").classList.toggle("on", which==="skins");
  $("consumList").classList.toggle("hidden", which!=="consum");
  $("skinList").classList.toggle("hidden", which!=="skins");
}
$("tabConsum").addEventListener("click", function(){ sfxClick(); switchShopTab("consum"); });
$("tabSkins").addEventListener("click", function(){ sfxClick(); switchShopTab("skins"); });