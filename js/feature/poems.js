/* Op-Art Fan - Poemas descubiertos (modulo lazy). Fragmentos de la poesia
   china de fondo; se desbloquean con un S-rank (combo >= x15) y se guardan en
   ls("poems"). La Biblioteca vive dentro de la pantalla Perfil. */
(function(){
  "use strict";

  var BOOK = [
    { h:"床前明月光，疑是地上霜", es:"La luna brilla junto a mi lecho; parece escarcha sobre el suelo." },
    { h:"欲穷千里目，更上一层楼", es:"Para ver mil li, sube un piso más." },
    { h:"会当凌绝顶，一览众山小", es:"Coronaré la cumbre y las montañas serán pequeñas." },
    { h:"大漠孤烟直，长河落日圆", es:"Humo recto en el desierto; el sol redondo sobre el río." },
    { h:"沉舟侧畔千帆过，病树前头万木春", es:"Mil velas pasan junto al barco hundido; mil árboles brotan del viejo tronco." },
    { h:"山重水复疑无路，柳暗花明又一村", es:"Tras las montañas y los ríos, un sendero: un pueblo entre sauces en flor." },
    { h:"海内存知己，天涯若比邻", es:"Si hay un amigo de verdad, los confines del mar son vecinos." },
    { h:"长风破浪会有时，直挂云帆济沧海", es:"Ya llegará el día de cruzar las olas a toda vela." },
    { h:"落霞与孤鹜齐飞，秋水共长天一色", es:"El crepúsculo vuela con la garza; el otoño se funde con el cielo." },
    { h:"桃李不言，下自成蹊", es:"El melocotón y el ciruelo no hablan, y aún así el camino se abre bajo ellos." }
  ];

  var MIN_COMBO = 15;

  function all(){
    var seen = ls("poems") || [];
    return BOOK.map(function(b, i){ return { data:b, got: seen.indexOf(i)>-1 }; });
  }

  /* Se llama desde el wrapper de showResult cuando hay S-rank. */
  function sRank(){
    var seen = ls("poems") || [];
    var unreads = [];
    BOOK.forEach(function(b, i){ if(seen.indexOf(i)===-1) unreads.push(i); });
    if(!unreads.length){ toast("\u201CEntre los \u00E1rboles que ya conoces, aún hay poes\u00EDa por dentro.\u201D","\u{1F4DC}",null,3400); return; }
    var i = unreads[Math.floor(Math.random()*unreads.length)];
    seen.push(i); ls("poems", seen);
    var b = BOOK[i];
    toast("\u{1F4DC} "+b.h, "Fragmento descubierto \u2014 "+b.es, "poem", 5200);
  }

  /* Lista para la pantalla Perfil. */
  function into(elBox, found){
    if(!elBox) return;
    var got = 0;
    var all_ = all();
    var html = "";
    all_.forEach(function(it){
      if(it.got){ got++; html += '<div class="poem-item"><div class="ph">'+esc(it.data.h)+'</div><div class="pe">'+esc(it.data.es)+'</div></div>'; }
    });
    if(got){
      elBox.innerHTML = '<div class="poem-head">\u{1F4DC} Poemas descubiertos ('+got+'/'+BOOK.length+')</div>'+html;
    } else {
      elBox.innerHTML = '<div class="poem-head">\u{1F4DC} Biblioteca de poemas</div><div class="pe">Consigue un combo de x'+MIN_COMBO+' en una partida para descubrir el primer fragmento.</div>';
    }
  }

  window.Poems = { sRank: sRank, all: all, into: into, BOOK_SIZE: BOOK.length, MIN_COMBO: MIN_COMBO };
})();