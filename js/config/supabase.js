/* Op-Art Fan - modulo: js/config/supabase.js */

"use strict";

/* ---------- Supabase (encendido del modo online) ----------
   Tu proyecto: https://supabase.com/dashboard/project/yrrgyunksjnzinhcedqv
   1) Crea el esquema: Dashboard -> SQL Editor -> pega y ejecuta supabase/arena.sql
   2) Copia tu llave publica: Dashboard -> Settings -> API -> "anon public"
      y pegala abajo. La llave anon es publica por diseno; los datos
      estan protegidos por las politicas RLS que crea el SQL. */
var SUPABASE_URL = "https://yrrgyunksjnzinhcedqv.supabase.co";
var SUPABASE_ANON_KEY = "";

/* URL donde queda publicado el juego (para el login de Google y el
   ranking). Si no la cambias, se usa la URL actual del navegador. */
var SUPABASE_SITE_URL = "https://pequegg.github.io/MAN/";