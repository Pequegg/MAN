/* Op-Art Fan - modulo: js/core/economy.js */

"use strict";

/* ---------- Economía (spec v2 Fase 1) ----------
   Compras con transacción:
   - Con sesión Google: RPC `redeem_item` en Postgres (bloqueo de fila,
     descuento atómico, auditado en `purchases`). Nunca negativo.
   - Como invitado: compra local; se sincroniza al vincular la cuenta.
   NUNCA se descuenta dos veces: si el servidor responde, se aplica su
   perfil; si falla, no se toca el monedero local. */
var Ec = (function(){
  function can(){
    return typeof SupRemote!=="undefined" && SupRemote.on() &&
           typeof Db!=="undefined" && Db.ready();
  }
  function localClaim(cat, id, price){
    if(cat==="inv"){
      if(coins<price) return {ok:false, msg:"No tienes suficientes monedas"};
      coins-=price; inventory[id]=(inventory[id]||0)+1;
    } else if(cat==="skin"){
      if(ownedSkins.indexOf(id)>-1) return {ok:false, msg:"Ya tienes esto"};
      if(coins<price) return {ok:false, msg:"No tienes suficientes monedas"};
      coins-=price; ownedSkins.push(id);
    } else if(cat==="wear"){
      if((arena.wardrobe.owned||[]).indexOf(id)>-1) return {ok:false, msg:"Ya tienes esto"};
      if(coins<price) return {ok:false, msg:"No tienes suficientes monedas"};
      coins-=price; arena.wardrobe.owned.push(id); saveArena();
    } else {
      if(ownedCosmetics.indexOf(id)>-1) return {ok:false, msg:"Ya tienes esto"};
      if(coins<price) return {ok:false, msg:"No tienes suficientes monedas"};
      coins-=price; ownedCosmetics.push(id);
    }
    saveAll();
    sfxGold();
    return {ok:true};
  }
  function buy(cat, id, price){
    if(can()){
      return SupRemote.rpc("redeem_item",{p_item:id, p_cat:cat, p_price:price})
        .then(function(prof){
          Db.applyRemote(prof);            // perfil del servidor: monedas + inventario reales
          return {ok:true, prof:prof};
        })
        .catch(function(e){
          return {ok:false, msg:(e&&e.message)||"Error de red"};
        });
    }
    return Promise.resolve(localClaim(cat, id, price));
  }
  /* Todas las compras locales/invitado pasan por aquí también */
  return {buy:buy, can:can};
})();