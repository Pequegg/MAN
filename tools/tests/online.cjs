// test-online: provee la capa de red (SupRemote), el login Google (PKCE/GoTrue)
// y la sincronizacion de perfil (Db) con un fetch simulado. Corre sin navegador.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const ROOT = 'C:/Users/1903c/OneDrive/Documentos/Default Project/Op-Art-Fan/';

let fail = 0;
const ok = (n, g) => { console.log((g ? 'OK   ' : 'FAIL ') + n); if (!g) fail++; };

// ---- entorno minimo (localStorage + ls) ----
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
global.ls = (k, v) => { if (v === undefined) { const raw = global.localStorage.getItem(k); return raw == null ? null : JSON.parse(raw); } global.localStorage.setItem(k, JSON.stringify(v)); };

global.window = global;
global.crypto = webcrypto;

// estado de juego minimo que usa Db
global.profile = { name: 'Invitado', avatar: '\u{1F60E}' };
global.coins = 50;
global.inventory = {};
global.equipped = [];
global.completed = [];
global.pb = {};
global.achievements = [];
global.totalEarned = 0;
global.ownedSkins = [];
global.activeSkin = 'clasico';
global.ownedCosmetics = [];
global.activeFanSkin = 'fan-clasico';
global.activeFrame = 'fr-none';
global.activeTitle = 'ti-novato';
global.activeMascot = '';
global.settings = {};
global.introDone = true;
global.arena = { groups: [], groupData: {}, activeGroup: null, wardrobe: { owned: [], hat: '', fan: '', cape: '', bg: '' }, days: {}, daysDone: [], retosWon: {} };
global.saveArena = () => {};
global.saveAll = () => {};
global.pushGroupRemote = () => {};
global.sfxGold = () => {};
global.toast = () => {};
global.dayNum = () => 20260101;
global.mulberry32 = a => { return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
function uidLocal() { let u = global.ls('uid'); if (!u) { u = 'u' + Date.now().toString(36); global.ls('uid', u); } return u; }

// ---- fetch falso ----
const network = { gets: [], posts: [] };
function jsonResp(obj, status) { return { ok: status < 400, status: status || 200, json: () => Promise.resolve(obj) }; }
global.fetch = (url, opts) => {
  opts = opts || {};
  const u = String(url);
  if (opts.method === 'POST') {
    network.posts.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
    if (/\/token\?grant_type=pkce/.test(u)) {
      return Promise.resolve(jsonResp({ access_token: 'tok-123', refresh_token: 'ref-1', expires_in: 3600, user: { id: 'u-google-1', email: 'gus@test.dev', user_metadata: { full_name: 'Gustavo' } } }, 200));
    }
    if (/\/rest\/v1\/users/.test(u)) return Promise.resolve(jsonResp([], 200));
    if (/\/rest\/v1\/rpc\/redeem_item/.test(u)) return Promise.resolve(jsonResp({ coins: 999, ownedCosmetics: ['fan-lotus'], inventory: { time5: 1 } }, 200));
    return Promise.resolve(jsonResp([], 200));
  }
  network.gets.push(u);
  if (/\/rest\/v1\/users/.test(u)) return Promise.resolve(jsonResp([{ uid: 'u-google-1', profile: { name: 'Cloud', coins: 999, _saved: Date.now() + 100000 } }], 200));
  if (/\/rest\/v1\/daily/.test(u)) return Promise.resolve(jsonResp([{ uid: 'x1', name: 'A', score: 10 }], 200));
  return Promise.resolve(jsonResp([], 200));
};

function gload(file) { vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file }); }
gload('js/config/supabase.js');
global.SUPABASE_ANON_KEY = ''; // el repo puede llevar una llave real; forzamos off para este test
gload('js/core/remote.js');
gload('js/core/db.js');
gload('js/core/auth.js');
gload('js/levels/levels.js');
gload('js/levels/cosmetics.js');
gload('js/core/economy.js');
global.SUPABASE_ANON_KEY = '';

// en un segundo, montamos pruebas
(async () => {
  // 1) modo local (sin llave)
  ok('SupRemote off con llave vacia', !SupRemote.on());
  global.SUPABASE_ANON_KEY = 'anKey-fake';
  ok('SupRemote on con llave puesta', SupRemote.on());

  // 2) get() arma consultas PostgREST
  const rows = await SupRemote.get('daily', 'date=eq.2026-01-01&order=score.desc&limit=25');
  ok('get() devuelve filas del mock', Array.isArray(rows) && rows[0].uid === 'x1');
  ok('get() consulta la tabla correcta', network.gets.some(u => u.includes('/rest/v1/daily?date=eq.2026-01-01')));

  // 3) bestScore solo sube puntajes mejores
  network.posts.length = 0;
  await SupRemote.bestScore('daily', 'date=eq.2026-01-01&uid=eq.x1', { date: '2026-01-01', uid: 'x1', score: 5 });
  ok('bestScore no sobreescribe puntaje menor', network.posts.length === 0);
  await SupRemote.bestScore('daily', 'date=eq.2026-01-01&uid=eq.x1', { date: '2026-01-01', uid: 'x1', score: 15 });
  ok('bestScore sube puntaje mayor', network.posts.length === 1);

  // 4) login Google: PKCE + intercambio de codigo
  global.location = { href: 'https://op-art-fan.test/?code=abc123', origin: 'https://op-art-fan.test', pathname: '/' };
  global.history = { replaceState: () => {} };
  global.ls('sb-pkce-verifier', 'V'.repeat(50));
  await new Promise(res => Auth.boot(res));
  ok('sesion creada tras el flujo Google', Auth.isAuthed());
  ok('uid = id de la cuenta Google', Auth.uid() === 'u-google-1');
  ok('nombre tomado de Google', Auth.userName() === 'Gustavo');

  // 5) Db.pull aplica el perfil de la nube (los mas reciente gana)
  ok('perfil de la nube aplicado', profile.name === 'Cloud' && coins === 999);

  // 6) Db.push sube el perfil local
  network.posts.length = 0;
  profile.name = 'CloudEditado';
  Db.push();
  await new Promise(r => setTimeout(r, 30));
  const pu = network.posts.find(p => /\/rest\/v1\/users/.test(p.url) && p.body && p.body[0] && p.body[0].uid === 'u-google-1');
  ok('Db.push sincroniza users/{uid}', !!pu && pu.body[0].profile.name === 'CloudEditado' && pu.body[0].profile._saved > 0);

  // 7) remap de invitado -> cuenta
  global.ls('uid', 'u-local-old');
  global.arena = { groups: ['G1'], groupData: { G1: { members: { 'u-local-old': { name: 'Leo', avatar: 'X', wear: {} } }, pts: { S5: { 'u-local-old': 12 } } } }, activeGroup: 'G1', wardrobe: {}, days: {}, daysDone: [], retosWon: {} };
  Db.remapUid('u-local-old');
  const gd = arena.groupData.G1;
  ok('miembro migrado a la cuenta', !!gd.members['u-google-1'] && !gd.members['u-local-old']);
  ok('puntos migrados a la cuenta', gd.pts.S5['u-google-1'] === 12);

  // 8) Economia (Fase 1)
  //    a) tienda rotativa determinista por dia
  const r1 = ROT.pick(dayNum());
  const r2 = ROT.pick(dayNum());
  ok('rotativa: 7 ofertas estables el mismo dia', r1.length === 7 && JSON.stringify(r1) === JSON.stringify(r2));
  const cats = r1.map(x => x.cat);
  ok('rotativa: una pieza por categoria (consumibles permiten mas)', new Set(cats.filter(c => c !== 'inv')).size === cats.filter(c => c !== 'inv').length);
  ok('rotativa: cambia con el dia', JSON.stringify(ROT.pick(20260102)) !== JSON.stringify(r1));
  //    b) compra local como invitado (modo offline)
  global.SUPABASE_ANON_KEY = ''; // invalida la llave -> camino local
  global.coins = 200;
  const resLocal = await Ec.buy('inv', 'time5', 60);
  ok('compra local descuenta y suma inventario', resLocal.ok && coins === 140 && inventory.time5 === 1);
  const resInsuf = await Ec.buy('inv', 'time5', 999999);
  ok('compra local rechaza sin monedas', !resInsuf.ok && coins === 140 && inventory.time5 === 1);
  //    c) compra con sesion: pasa por RPC y aplica el perfil del servidor
  global.SUPABASE_ANON_KEY = 'anKey-fake';
  network.posts.length = 0;
  const resRpc = await Ec.buy('fanskin', 'fan-lotus', 300);
  const post = network.posts.find(p => /\/rest\/v1\/rpc\/redeem_item/.test(p.url));
  ok('compra con sesion llama al RPC redeem_item', !!post && post.body.p_item === 'fan-lotus' && post.body.p_cat === 'fanskin' && post.body.p_price === 300);
  ok('perfil del servidor aplicado (monedas + inventario)', resRpc.ok && coins === 999 && ownedCosmetics.indexOf('fan-lotus') > -1 && inventory.time5 === 1);
  //    d) el catalogo de cosmeticas cumple el minimo de contenido de la spec
  ok('contenido Fase 1: 8 abanicos, 6 marcos, 5 titulos, 4 mascotas',
    FANSKINS.length === 9 && FRAMES.length === 7 && TITLES.length === 5 && MASCOTS.length === 4);

  console.log(fail ? ('FALLOS: ' + fail) : 'ONLINE OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });