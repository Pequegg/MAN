/* Op-Art Fan - modulo: js/config/settings.js */

"use strict";

/* ---------- Configuración ----------
   Para activar el ranking online, crea una base en
   https://console.firebase.google.com -> Realtime Database
   (reglas en modo "test" por ahora) y pega aquí su URL:
   https://tuproyecto-default-rtdb.europe-west1.firebasedatabase.app/  */
var FIREBASE_URL = "";

var ARENA_TIME = 60;
var ARENA_ATTEMPTS = 3;
var SEASON_DAYS = 14;
var ARENA_EPOCH = new Date(2026,0,5).getTime(); // lunes de referencia
var ARENA_MODES = [
 {id:"calligraphy", icon:"\u{1F58B}\uFE0F", name:"Pincelada Veloz", hint:"Traza la caligrafía al tacto"},
 {id:"lanterns",    icon:"\u{1F3EE}",        name:"Farolillos",      hint:"Toca faroles dorados y esquiva los rojos"},
 {id:"coin",        icon:"\u{1FA99}",        name:"Moneda de la Suerte", hint:"Detén la rueda en la zona dorada"},
 {id:"drum",        icon:"\u{1F941}",        name:"Ritmo del Tambor", hint:"Toca siguiendo el compás visual"}
];