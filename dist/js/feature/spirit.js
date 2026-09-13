/* Op-Art Fan - Espiritu guardian (modulo lazy). Frases por familia de musica
   (calm/party/epic) y transiciones antes de los jefes finales (dragon, Nian). */
(function(){
  "use strict";

  var FAM_LINES = {
    calm: [
      "\u201CLa tinta espera tu pulso. No corras, respira.\u201D",
      "\u201CEl agua no lucha; fluye y vence.\u201D",
      "\u201CCada moto guarda un suspiro del maestro.\u201D",
      "\u201CLa calma no es quietud: es precisión.\u201D"
    ],
    party: [
      "\u201CQue el farol guíe tu mano en la fiesta.\u201D",
      "\u201CEl fuego sagrado premia al atrevido.\u201D",
      "\u201CJade, seda y música: baila con los motivos.\u201D",
      "\u201CEl viento trae el perfume de las linternas.\u201D"
    ],
    epic: [
      "\u201CLa montaña antigua contempla tu valor.\u201D",
      "\u201CUn abanico basta para cambiar el viento.\u201D"
    ]
  };

  var BOSS_LINES = {
    17: "\u201CEl Dragón despierta entre truenos. Muestra tu mejor giro. \u{1F409}\u201D",
    18: "\u201CNian baja de los montes a devorar el año viejo. Hoy, tú eres el abanico del destino. \u{1F7E1}\u201D"
  };

  var _mem = {};

  function pick(pool, key){
    if(!pool || !pool.length) return null;
    var idx = Math.floor(Math.random()*pool.length);
    if(_mem[key]===idx && pool.length>1){ idx=(idx+1)%pool.length; }
    _mem[key]=idx;
    return pool[idx];
  }

  /* Devuelve una frase para el inicio de un nivel, o null si no toca. */
  function atStart(id, lv, lastFam){
    if(!lv) return null;
    if(BOSS_LINES[id]) return pick([BOSS_LINES[id]], "boss") || BOSS_LINES[id];
    var fam;
    try{ fam = famOf(lv); }catch(e){ fam = "epic"; }
    if(fam === lastFam) return null;
    var pool = FAM_LINES[fam] || FAM_LINES.epic;
    return pick(pool, fam+":"+todayKey()+"-fam");
  }

  window.Spirit = { atStart: atStart, famOf: function(lv){ try{ return famOf(lv); }catch(e){ return "epic"; } } };
})();