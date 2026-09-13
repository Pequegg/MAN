/* Op-Art Fan - modulo: js/levels/levels.js */

"use strict";

/* ---------- Datos: niveles ---------- */
var LEVELS = [
 {id:1, name:"Tinta y Caligrafía", c:["#f4f0e2","#191714","#efe8d2","#3a352c"], bg:"#e7dfc8", target:"#c0392b", goal:120, time:25, interval:1.65, simul:1, wind:0, osc:0.5, trap:0.08, gold:0.12, pt:"ink", bd:"calli", dec:"ink", bhv:"swing"},
 {id:2, name:"Porcelana Azul", c:["#eef4f9","#9fbcd8","#4f7fb0","#24486e","#dce8f2"], bg:"#0d1d30", target:"#7fd4ff", goal:175, time:28, interval:1.45, simul:1, wind:0.05, osc:0.6, trap:0.08, gold:0.11, pt:"dot", bd:"waves", dec:"waves", bhv:"swing"},
 {id:3, name:"Ciruelo en Flor", c:["#f7e3ec","#e88fb0","#c94d78","#7b1f45","#fdf3f7"], bg:"#16090e", target:"#ffc2d6", goal:260, time:30, interval:1.32, simul:1, wind:0.08, osc:0.65, trap:0.08, gold:0.1, pt:"petal", bd:"trees", dec:"petals", bhv:"swing"},
 {id:4, name:"Peces Koi", c:["#f68b3f","#e04b2f","#fff3d6","#2eb0a8","#0f7b74"], bg:"#05201f", target:"#ffcf5e", goal:380, time:32, interval:1.2, simul:1, wind:0.1, osc:0.7, trap:0.09, gold:0.1, pt:"wave", bd:"pond", dec:"koi", bhv:"swing"},
 {id:5, name:"Fiesta de Año Nuevo", c:["#e6390f","#f2a611","#ffd93d","#ffe9b0","#b00d1e"], bg:"#200404", target:"#ffe9b0", goal:560, time:34, interval:1.12, simul:2, wind:0.12, osc:0.75, trap:0.09, gold:0.1, pt:"firew", bd:"lanterns", dec:"sparks", bhv:"pairs"},
 {id:6, name:"Jade Imperial", c:["#daf6e5","#7fdea8","#1f9d63","#0e5c3a","#f2fff7"], bg:"#03180d", target:"#baffdc", goal:820, time:36, interval:1.06, simul:2, wind:0.15, osc:0.8, trap:0.09, gold:0.12, pt:"spark", bd:"clouds", dec:"smoke", bhv:"swing"},
 {id:7, name:"El Dragón Dorado", c:["#4a2c00","#8a5a00","#d9a441","#ffd643","#fff0b8","#2a1600"], bg:"#140a00", target:"#ffe27a", goal:1200, time:38, interval:1.0, simul:2, wind:0.18, osc:0.85, trap:0.1, gold:0.09, pt:"smoke", bd:"dragon", dec:"mist", bhv:"swing"},
 {id:8, name:"Fénix del Atardecer", c:["#a33a12","#e0481b","#ff7b2e","#ffb54a","#ffd98c"], bg:"#1c0500", target:"#ffd98c", goal:1750, time:40, interval:0.96, simul:2, wind:0.2, osc:0.9, trap:0.1, gold:0.09, pt:"firew", bd:"phoenix", dec:"firew", bhv:"swing"},
 {id:9, name:"Gran Muralla", c:["#cbd0d6","#a7abb4","#7c8089","#4e5258","#26282c"], bg:"#0c0f12", target:"#c0392b", goal:2500, time:42, interval:0.92, simul:3, wind:0.22, osc:0.95, trap:0.11, gold:0.08, pt:"spark", bd:"wall", dec:"mist", bhv:"swing"},
 {id:10, name:"Ejército de Terracota", c:["#7a4a2b","#9a6a44","#b78a5e","#d3a87e","#4a2c18"], bg:"#1a0e06", target:"#ffcf8a", goal:3600, time:44, interval:0.88, simul:3, wind:0.25, osc:1.0, trap:0.11, gold:0.08, pt:"smoke", bd:"terracotta", dec:"smoke", bhv:"swing"},
 {id:11, name:"Seda Bordada", c:["#6d3fa1","#9a62c9","#c98fe8","#ffe3f1","#372052"], bg:"#0e061a", target:"#ffe3f1", goal:5200, time:46, interval:0.84, simul:3, wind:0.28, osc:1.05, trap:0.11, gold:0.08, pt:"silk", bd:"silk", dec:"mist", bhv:"swing"},
 {id:12, name:"Templo Dorado", c:["#3d2a08","#6b4e12","#a57a1e","#ddb347","#ffe9a3","#1d1305"], bg:"#120b02", target:"#fff0c0", goal:7500, time:48, interval:0.8, simul:3, wind:0.32, osc:1.1, trap:0.12, gold:0.08, pt:"coin", bd:"temple", dec:"lantern", bhv:"swing"},
 {id:13, name:"Festival de Linternas", c:["#d92339","#f25c22","#ffc83d","#7a130e","#ffe9c2"], bg:"#170305", target:"#ffd76a", goal:10800, time:52, interval:0.77, simul:4, wind:0.35, osc:1.15, trap:0.12, gold:0.08, pt:"glow", bd:"lanterns", dec:"lantern", bhv:"swing"},
 {id:14, name:"Guilin entre Neblina", c:["#8fb0a4","#5c8176","#3f5f56","#243f38","#122a24"], bg:"#050f0c", target:"#c9f2dd", goal:15600, time:56, interval:0.74, simul:4, wind:0.4, osc:1.25, trap:0.12, gold:0.08, pt:"wave", bd:"mountain", dec:"mist", bhv:"fog"},
 {id:15, name:"Río Amarillo", c:["#b3541f","#d9823a","#efae5a","#f7d9a0","#6e3212"], bg:"#170a04", target:"#fff3cd", goal:21800, time:60, interval:0.71, simul:4, wind:0.45, osc:1.35, trap:0.12, gold:0.08, pt:"wave", bd:"waves", dec:"waves", bhv:"swing"},
 {id:16, name:"Ópera de Pekín", c:["#b0281f","#f0ede4","#1a1a1a","#d8a94a","#5c1212"], bg:"#120505", target:"#f0ede4", goal:24000, time:60, interval:0.68, simul:5, wind:0.5, osc:1.5, trap:0.5, gold:0, pt:"spark", bd:"opera", dec:"mist", bhv:"swing"},
 {id:17, name:"El Dragón del Zodiaco", boss:true, ghost:"\u{1F409}", c:["#3a2510","#6b4a1e","#d9a441","#ffe27a","#fff6d8","#1c0f05"], bg:"#0d0703", target:"#ffe27a", goal:12, time:35, osc:1.1, esp:1.5, pt:"firew", bd:"dragon", dec:"firew", bhv:"tremor"},
 {id:18, name:"Nian, el Monstruo", boss:true, boss2:true, ghost:"\u{1F525}", c:["#5c0f12","#8f1a20","#c23a2a","#f06843","#ffd9a6","#1a0306"], bg:"#120307", target:"#ffd9a6", goal:16, time:30, osc:1.3, esp:1.0, pt:"smoke", bd:"temple", dec:"lantern", bhv:"fog"}
];
function levelDef(id){ if(typeof id==="string") return dailyDef[id] || null; return LEVELS.find(function(l){return l.id===id;}); }

/* ---------- Datos: tienda ---------- */
var ITEMS = [
 {id:"time5",   icon:"\u23F1", name:"+5 Segundos",     price:60,  desc:"+5s al tiempo inicial del nivel"},
 {id:"time10",  icon:"\u23F3", name:"+10 Segundos",    price:110, desc:"+10s al tiempo inicial del nivel"},
 {id:"coinx2",  icon:"\u{1F4B0}", name:"Monedas x2",   price:160, desc:"Duplica las monedas ganadas en la partida"},
 {id:"slowswing",icon:"\u{1F422}", name:"Oscilación Lenta", price:130, desc:"El abanico oscila 50% más lento"},
 {id:"goldpart", icon:"\u2728", name:"Partículas Doradas", price:90, desc:"Partículas doradas al acertar"},
 {id:"rainpart", icon:"\u{1F308}", name:"Partículas Arcoíris", price:90, desc:"Partículas multicolor al acertar"},
 {id:"comboshield", icon:"\u{1F6E1}", name:"Escudo de Combo", price:320, desc:"Un fallo reduce tu combo a la mitad, no a 1"},
 {id:"widezone", icon:"\u{1F3AF}", name:"Zona Amplia",  price:200, desc:"Área de toque más grande (más perdón)"},
 {id:"missforgive", icon:"\u{1F497}", name:"Perdón de Falla", price:150, desc:"Tu primer fallo del nivel no penaliza"},
 {id:"revive",  icon:"\u{1F4AB}", name:"Revivir",       price:260, desc:"Si se te acaba el tiempo, sigues 5s más (1/partida)"},
 {id:"detector",icon:"\u{1F441}", name:"Detector",      price:190, desc:"Ves dónde aparecerá el siguiente objetivo"},
 {id:"pointx2", icon:"\u26A1", name:"Duplicador de Puntos", price:900, desc:"Duplica TODOS los puntos de la partida"}
];
var SKINS = [
 {id:"clasico", name:"Clásico", price:0, icon:"\u{1F3A9}", pat:"none", part:"spark", desc:"El abanico original"},
 {id:"puntitos", name:"Puntitos", price:200, icon:"\u{1F4CF}", pat:"dots", part:"dot", desc:"Patrón de puntos + partículas circulares"},
 {id:"diagonal", name:"Diagonales", price:250, icon:"\u{1F9F0}", pat:"slash", part:"slash", desc:"Rayas diagonales + partículas en ángulo"},
 {id:"cruz", name:"Cruces", price:300, icon:"\u2716", pat:"cross", part:"cross", desc:"Crucecitas + partículas en cruz"},
 {id:"estrellas", name:"Estrellas", price:400, icon:"\u2B50", pat:"star", part:"star", desc:"Estrellitas + partículas estrella"},
 {id:"nebulosa", name:"Nebulosa", price:500, icon:"\u{1F30C}", pat:"glow", part:"glow", desc:"Resplandor difuso + partículas brillantes"}
];
function skinById(id){ return SKINS.find(function(s){return s.id===id;}) || SKINS[0]; }

/* ---------- Datos: logros ---------- */
var ACH = [
 {id:"firstwin", icon:"\u{1F3C1}", name:"Primer Acierto", desc:"Completa tu primer nivel"},
 {id:"impecable", icon:"\u{1F48E}", name:"Sin Fallos", desc:"Completa un nivel sin cometer ni un fallo"},
 {id:"combo20", icon:"\u{1F525}", name:"Combo x20", desc:"Alcanza un combo de 20"},
 {id:"veloz", icon:"\u26A1", name:"Cazador Veloz", desc:"Atrapa 25 objetivos en un solo nivel"},
 {id:"jefe", icon:"\u{1F47B}", name:"Cazador de Espíritus", desc:"Vence al Espíritu del Abanico"},
 {id:"jefe2", icon:"\u{1F300}", name:"Eco Dominado", desc:"Vence al Jefe 2: Eco del Espíritu"},
 {id:"minero", icon:"\u{1F4A3}", name:"Campo Seguro", desc:"Completa Campo Minado sin tocar ninguna trampa"},
 {id:"completo", icon:"\u{1F451}", name:"Leyenda del Abanico", desc:"Completa todos los niveles del juego"},
 {id:"rico", icon:"\u{1FA99}", name:"Amas de Oro", desc:"Gana 5.000 monedas en total (histórico)"},
 {id:"comprar", icon:"\u{1F6D2}", name:"Primera Compra", desc:"Compra tu primer artículo"},
 {id:"skin", icon:"\u{1F3A8}", name:"Con Estilo", desc:"Compra tu primera skin"},
 {id:"diario", icon:"\u{1F5D3}", name:"Rutina Diaria", desc:"Juega el desafío diario"},
 {id:"record", icon:"\u2B50", name:"Plusmarquista", desc:"Bate tu récord personal en un nivel"},
 {id:"equipado", icon:"\u{1F392}", name:"Bien Equipado", desc:"Equipa 3 artículos a la vez"},
{id:"arena", icon:"\u{1F3EE}", name:"Primer Reto", desc:"Juega tu primer reto de Arena"},
   {id:"arenastar", icon:"\u2B50", name:"Estrella del Reto", desc:"Completa un reto de Arena"},
   {id:"arenaday", icon:"\u{1F5D3}", name:"Rutina de Arena", desc:"Juega retos en 3 días distintos"},
   {id:"armario", icon:"\u{1F5C2}", name:"Estilista", desc:"Compra tu primera pieza de armario"}
];
function achById(id){ return ACH.find(function(a){return a.id===id;})||{id:id,name:id,desc:""}; }