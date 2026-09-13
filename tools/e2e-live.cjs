/* Op-Art Fan - E2E de salas 1v1 + admin contra el proyecto real (plano de datos).
   Uso: node tools/e2e-live.cjs
   Prueba los nucleos _x_live_join/_x_live_submit/_x_admin_* via Management API:
   crea 2 perfiles, una sala, une invitado, valida huellas, resuelve con
   recompensas y empate (desempate por tiempo), y el panel admin (stats,
   otorgar monedas, aviso global). Limpia los datos al final.
   Los wrappers publicos solo anaden auth.uid(), validado por separado. */
const fs = require("fs");
const PAT = fs.readFileSync("C:\\Users\\1903c\\AppData\\Local\\Temp\\opencode\\sbpat.txt","utf8").split(/\r?\n/)[0].trim();
const REF = "yrrgyunksjnzinhcedqv";

const api = "https://api.supabase.com/v1/projects/" + REF + "/database/query";
async function q(sql){
  const r = await fetch(api,{method:"POST",headers:{Authorization:"Bearer "+PAT,"Content-Type":"application/json"},body:JSON.stringify({query:sql})});
  const t = await r.text();
  if(!r.ok){
    const m = (JSON.parse(t).message||t).slice(0,200);
    const e = new Error(m); e.raw=t; throw e;
  }
  try{ return JSON.parse(t); }catch(e){ return t; }
}
const assert=(c,m)=>{ if(!c){ console.error("FAIL: "+m); process.exitCode=1; throw new Error(m); } console.log("  ok - "+m); };

(async ()=>{
  const U1="lh-"+Date.now(), U2="lg-"+Date.now();
  const R1="r1-"+Date.now(), R2="r2-"+Date.now(), R3="r3-"+Date.now();
  const NOW=Date.now();

  // 0) perfiles + admin
  await q(`insert into public.users(uid,profile,updated_at) values('${U1}','{"name":"Host Test","coins":200,"avatar":"🧧"}',now()) on conflict (uid) do nothing;`);
  await q(`insert into public.users(uid,profile,updated_at) values('${U2}','{"name":"Guest Test","coins":200,"avatar":"🏮"}',now()) on conflict (uid) do nothing;`);
  await q(`insert into public.admins(uid,at) values('${U1}',${Math.floor(NOW/1000)}) on conflict (uid) do nothing;`);
  console.log("perfiles "+U1+" (admin) / "+U2);

  // 1) el que NO es admin no ve stats
  let r=await q(`select public._x_admin_stats('${U2}') AS j;`);
  assert(r[0].j.error&&r[0].j.error.indexOf("no eres admin")>-1, "no-admin bloqueado en stats");

  // 2) crear sala (host) nivel 5
  await q(`insert into public.live_rooms(id,host,level_id,status,seed,created)
      values('${R1}','${U1}',5,'open','E2ESEED',${NOW});`);
  // 3) unirse como invitado
  r=await q(`select public._x_live_join('${U2}','${R1}') AS r;`);
  assert(r[0].r.status==="ready"&&r[0].r.guest===U2, "invitado se une -> ready");
  r=await q(`select public._x_live_join('${U1}','${R1}') AS r;`);
  assert(r[0].r.host===U1&&r[0].r.guest===U2, "host recupera su sala");
  // 4) doble join idempotente (devuelve la sala sin error)
  r=await q(`select public._x_live_join('${U2}','${R1}') AS r;`);
  assert(r[0].r.guest===U2&&r[0].r.status==="ready", "rejoin devuelve la sala sin error");

  // 5) huella invalida rechazada
  r=await q(`select public._x_live_submit('${U1}','${R1}',999999,20,2,0,900) AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("huella")>-1, "huella imposible rechazada ("+r[0].r.error+")");

  // 6) host gana: host 2400 / guest 1800
  r=await q(`select public._x_live_submit('${U1}','${R1}',2400,12,60,3,30000) AS r;`);
  assert(r[0].r.waiting===true, "host lado1 -> waiting");
  r=await q(`select public._x_live_submit('${U2}','${R1}',1800,9,50,5,31000) AS r;`);
  assert(r[0].r.status==="finished"&&r[0].r.won===false, "guest lado2 -> finished (pierde)");
  assert(r[0].r.reward===5&&r[0].r.my===1800&&r[0].r.op===2400, "guest derrota +5, my/op ok");
  let row=await q(`select status,winner,reward_h,reward_g,h_score,g_score,h_done,g_done from public.live_rooms where id='${R1}';`);
  let v=row[0];
  assert(v.status==="finished"&&v.winner===U1, "winner=host");
  assert(v.reward_h===15&&v.reward_g===5, "recompensas 15/5");
  assert(v.h_score===2400&&v.g_score===1800&&v.h_done===1&&v.g_done===1, "scores y done registrados");

  // 7) kos
  let u=await q(`select uid,profile from public.users where uid in ('${U1}','${U2}') order by uid;`);
  const coinsH=u.find(x=>x.uid===U1).profile.coins, coinsG=u.find(x=>x.uid===U2).profile.coins;
  assert(coinsH===215&&coinsG===205, "host 200+15 / guest 200+5");

  // 8) empate -> gana el mas rapido (guest, ms menor)
  await q(`insert into public.live_rooms(id,host,guest,level_id,status,created)
      values('${R2}','${U1}','${U2}',5,'ready',${NOW});`);
  await q(`select public._x_live_submit('${U1}','${R2}',1500,8,40,2,25000);`);
  r=await q(`select public._x_live_submit('${U2}','${R2}',1500,8,40,2,22000) AS r;`);
  assert(r[0].r.status==="finished"&&r[0].r.won===true, "empate: gana el mas rapido (guest)");
  row=await q(`select winner from public.live_rooms where id='${R2}';`);
  assert(row[0].winner===U2, "winner=guest por desempate de tiempo");

  // 9) sala donde gana el guest por puntos
  await q(`insert into public.live_rooms(id,host,guest,level_id,status,created)
      values('${R3}','${U1}','${U2}',5,'ready',${NOW});`);
  await q(`select public._x_live_submit('${U1}','${R3}',1400,8,40,4,26000);`);
  r=await q(`select public._x_live_submit('${U2}','${R3}',2900,13,55,2,28000) AS r;`);
  assert(r[0].r.status==="finished"&&r[0].r.won===true&&r[0].r.reward===15, "guest gana los 15");

  // 10) recompensa ya resuelta no acepta mas
  r=await q(`select public._x_live_submit('${U1}','${R1}',9999,10,50,0,30000) AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("ya resuelta")>-1, "partida resuelta rechaza nuevos envios");

  // 11) admin: stats completas
  r=await q(`select public._x_admin_stats('${U1}') AS j;`);
  const st=r[0].j;
  assert(!st.error&&st.users>=2&&st.rooms>=3&&st.roomsOpen>=0, "stats admin (users/rooms)");
  assert(Array.isArray(st.topScores), "topScores array");

  // 12) admin: otorgar monedas por codigo
  let c2=await q(`select public.friend_code('${U2}') AS c;`);
  r=await q(`select public._x_admin_grant('${U1}','${c2[0].c}',100) AS r;`);
  assert(r[0].r.ok===true&&r[0].r.coins===335, "grant +100 al guest ("+r[0].r.coins+")");
  r=await q(`select public._x_admin_grant('${U1}','ZZZ999',100) AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("no encontrado")>-1, "grant a codigo inexistente rechazado");

  // 13) admin: aviso global + lectura publica
  r=await q(`select public._x_admin_notice('${U1}','Fase 3 en produccion: salas en vivo') AS r;`);
  assert(r[0].r.ok===true, "aviso guardado");
  r=await q(`select public.notice() AS j;`);
  assert(r[0].j.text.indexOf("Fase 3")>-1, "aviso leido por cualquiera");
  await q(`select public._x_admin_notice('${U1}','');`);
  r=await q(`select public.notice() AS j;`);
  assert(r[0].j.text==='', "aviso borrado");

  // ------- limpieza -------
  await q(`delete from public.live_rooms where id in ('${R1}','${R2}','${R3}');`);
  await q(`delete from public.notices where id='main';`);
  await q(`delete from public.admins where uid='${U1}';`);
  await q(`delete from public.users where uid in ('${U1}','${U2}');`);
  console.log("limpieza ok");

  console.log("\nE2E LIVE+ADMIN: TODAS LAS VALIDACIONES OK");
})().catch(e=>{ console.error("ERROR: "+(e&&e.message||e)); process.exit(1); });