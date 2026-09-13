/* Op-Art Fan - E2E de duelos contra el proyecto real (plano de datos).
   Uso: node tools/e2e-duel.cjs
   Prueba el nucleo _x_duel_submit / _x_add_friend via Management API:
   crea 2 perfiles, un duelo, huellas (buenas/malas), la resolucion con
   recompensas y racha, amigos por codigo, y limpia los datos al final.
   Los wrappers publicos submit_duel_play/add_friend solo anaden
   auth.uid() (autenticacion real validada por separado). */
const fs = require("fs");
const path = require("path");
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
const esc = s => String(s).replace(/'/g,"''");
const assert=(c,m)=>{ if(!c){ console.error("FAIL: "+m); process.exitCode=1; throw new Error(m); } console.log("  ok - "+m); };

(async ()=>{
  const U1="u1-"+Date.now(), U2="u2-"+Date.now();

  // 1) perfiles
  await q(`insert into public.users(uid,profile,updated_at) values('${U1}','{"name":"Alice Test","coins":100,"avatar":"🧧"}',now()) on conflict (uid) do nothing;`);
  await q(`insert into public.users(uid,profile,updated_at) values('${U2}','{"name":"Bob Test","coins":100,"avatar":"🏮"}',now()) on conflict (uid) do nothing;`);
  console.log("perfiles "+U1+" / "+U2);

  // 2) duelo nivel 5
  const D="d"+Date.now()+"-e2e";
  await q(`insert into public.duels(id,p1,p2,level_id,seed,status,scores,created) values('${D}','${U1}','${U2}',5,'E2ETST','pending','{}',${Date.now()});`);
  console.log("duelo creado "+D);

  // 3) alice juega -> waiting
  let r=await q(`select public._x_duel_submit('${U1}','${D}',2400,12,60,3,30000) AS r;`);
  let v=r[0].r;
  assert(v.status==="waiting"&&v.score===2400, "alice lado1 -> waiting");

  // 4) alice repite -> ya jugo
  r=await q(`select public._x_duel_submit('${U1}','${D}',9999,20,60,0,30000) AS r;`);
  v=r[0].r;
  assert(v.error&&v.error.indexOf("ya jugaste")>-1, "reintento del mismo lado rechazado");

  // 5) anti-trampas: huella imposible rechazada
  r=await q(`select public._x_duel_submit('${U2}','${D}',999999999,20,2,0,900) AS r;`);
  v=r[0].r;
  assert(v.error&&v.error.indexOf("huella")>-1, "huella imposible rechazada ("+v.error+")");
  r=await q(`select public._x_duel_submit('${U2}','${D}',100,3,700,0,300000) AS r;`);
  v=r[0].r;
  assert(v.error&&v.error.indexOf("huella")>-1, "aciertos/duracion imposibles rechazados ("+v.error+")");

  // 6) bob juega -> finished (pierde 1800<2400)
  r=await q(`select public._x_duel_submit('${U2}','${D}',1800,9,50,5,31000) AS r;`);
  v=r[0].r;
  assert(v.status==="finished", "bob lado2 -> finished");
  assert(v.won===false&&v.reward===5&&v.pts===5, "bob pierde (+5 monedas, +5 pts)");
  assert(v.my===1800&&v.op===2400, "puntajes correctos my/op");

  // 7) estado del duelo
  let d=await q(`select id,p1,p2,status,winner,scores,reward1,reward2,done1,done2 from public.duels where id='${D}';`);
  let row=d[0];
  assert(row.status==="finished"&&row.winner===U1, "winner = alice (p1)");
  assert(row.scores.p1===2400&&row.scores.p2===1800, "scores 2400/1800");
  assert(row.reward1===20&&row.reward2===5, "recompensas 20/5");
  assert(row.done1>0&&row.done2>0, "ambos lados con timestamp");

  // 8) perfiles: alice +20 / bob +5, racha alice=1
  let u=await q(`select uid, profile from public.users where uid in ('${U1}','${U2}') order by uid;`);
  const pa=u.find(x=>x.uid===U1).profile, pb=u.find(x=>x.uid===U2).profile;
  assert(pa.coins===120&&pb.coins===105, "monedas alice=120 bob=105");
  assert(pa.duelStreak===1&&pa.duelPts===20, "racha alice=1 pts=20");
  assert(pb.duelStreak===0&&pb.duelPts===5, "bob sin racha pts=5");

  // 9) racha x3: alice gana 2 mas -> 3ª victoria = bonus 10
  const D2="d"+Date.now()+"-e2e-2", D3="d"+Date.now()+"-e2e-3";
  await q(`insert into public.duels(id,p1,p2,level_id,seed,status,scores,created) values('${D2}','${U1}','${U2}',5,'E2ETST','pending','{}',${Date.now()});`);
  await q(`insert into public.duels(id,p1,p2,level_id,seed,status,scores,created) values('${D3}','${U1}','${U2}',5,'E2ETST','pending','{}',${Date.now()});`);
  await q(`select public._x_duel_submit('${U1}','${D2}',2100,10,50,2,20000);`);
  r=await q(`select public._x_duel_submit('${U2}','${D2}',900,6,45,6,28000) AS r;`);
  assert(r[0].r.status==="finished"&&r[0].r.won===false, "duelo2 resuelto, alice gana (streak 2)");
  await q(`select public._x_duel_submit('${U1}','${D3}',3300,14,55,1,26000);`);
  r=await q(`select public._x_duel_submit('${U2}','${D3}',700,5,40,7,32000) AS r;`);
  v=r[0].r;
  assert(v.status==="finished"&&v.won===false, "duelo3 resuelto (alice gana, racha 3)");
  // alice gano como p1: la recompensa va a ULTP_UID (p1), el que resuelve es bob => bob pierde 5
  u=await q(`select profile from public.users where uid='${U1}';`);
const pa3=u[0].profile;
  assert(pa3.coins===170, "alice: 100+20+20+30=170 (bonus racha) -> "+pa3.coins);
  assert(pa3.duelStreak===3, "racha alice=3");
  // bonus verificado: 2ª victoria 20, 3ª victoria 30 (20+10)
  u=await q(`select reward1 from public.duels where id='${D3}';`);
  assert(u[0].reward1===30, "reward1 de la 3ª victoria = 30 (incluye bonus)");
  u=await q(`select reward1 from public.duels where id='${D2}';`);
  assert(u[0].reward1===20, "reward1 de la 2ª victoria = 20");

  // 10) amigos por codigo
  const c1=await q(`select public.friend_code('${U1}') AS c;`);
  const c2=await q(`select public.friend_code('${U2}') AS c;`);
  assert(/^F[0-9A-F]{5}$/.test(c1[0].c)&&c1[0].c!==c2[0].c, "codigos distintos y en formato (alice="+c1[0].c+")");
  r=await q(`select public._x_add_friend('${U1}','${c2[0].c}') AS r;`);
  assert(r[0].r.ok===true, "alice agrega a bob");
  const fr=await q(`select uid,fid,name,avatar from public.friends where uid='${U1}' or fid='${U1}' order by uid,fid;`);
  assert(fr.some(f=>f.uid===U1&&f.fid===U2)&&fr.some(f=>f.uid===U2&&f.fid===U1), "amistad en ambos sentidos");
  r=await q(`select public._x_add_friend('${U1}','${c2[0].c}') AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("ya son amigos")>-1, "duplicado rechazado");
  r=await q(`select public._x_add_friend('${U1}','ZZZ999') AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("no encontrado")>-1, "codigo inexistente rechazado");
  r=await q(`select public._x_add_friend('${U2}','${c2[0].c}') AS r;`);
  assert(r[0].r.error&&r[0].r.error.indexOf("propio")>-1, "no puedes agregarte a ti mismo");

  // ------- limpieza -------
  await q(`delete from public.duels where id in ('${D}','${D2}','${D3}');`);
  await q(`delete from public.friends where uid in ('${U1}','${U2}') or fid in ('${U1}','${U2}');`);
  await q(`delete from public.users where uid in ('${U1}','${U2}');`);
  console.log("limpieza ok");

  console.log("\nE2E DUELOS: TODAS LAS VALIDACIONES OK");
})().catch(e=>{ console.error("ERROR: "+(e&&e.message||e)); process.exit(1); });
