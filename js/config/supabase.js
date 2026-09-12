/* Op-Art Fan - modulo: js/config/supabase.js */

"use strict";

/* ---------- Supabase (encendido del modo online) ----------
   Proyecto conectado: https://supabase.com/dashboard/project/yrrgyunksjnzinhcedqv
   El esquema (supabase/arena.sql) ya esta aplicado y la llave anon publica
   ya esta puesta aqui. La llave anon es publica por diseno; los datos
   estan protegidos por las politicas RLS que crea el SQL. */
var SUPABASE_URL = "https://yrrgyunksjnzinhcedqv.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycmd5dW5rc2puemluaGNlZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDk5MjIsImV4cCI6MjEwNDgyNTkyMn0.KNm4j-q11c4XwdlbybpkeicJkFKnWcaUFUTQ-NOujGg";

/* URL donde queda publicado el juego (para el login de Google y el
   ranking). Si no la cambias, se usa la URL actual del navegador. */
var SUPABASE_SITE_URL = "https://pequegg.github.io/MAN/";