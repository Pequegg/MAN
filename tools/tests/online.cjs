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
const network = { gets: [], posts: [], patches: [] };
let duelSubmitCalls = 0;
let liveSubmitCalls = 0;
const ROOM_ROW = { id: 'room1', host: 'other', guest: 'u-google-1', level_id: 5, status: 'ready', seed: 's1', h_score: 0, h_combo: 0, h_hits: 0, h_fails: 0, h_ms: 0, h_done: 0, g_score: 0, g_combo: 0, g_hits: 0, g_fails: 0, g_ms: 0, g_done: 0, winner: null, reward_h: 0, reward_g: 0, created: '2026-01-01', started: null, resolved: null };
function jsonResp(obj, status) { return { ok: status < 400, status: status || 200, json: () => Promise.resolve(obj) }; }
global.fetch = (url, opts) => {
  opts = opts || {};
  const u = String(url);
  if (opts.method === 'PATCH') {
    network.patches.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
    return Promise.resolve(jsonResp({}, 200));
  }
  if (opts.method === 'POST') {
    network.posts.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
    if (/\/token\?grant_type=pkce/.test(u)) {
      return Promise.resolve(jsonResp({ access_token: 'tok-123', refresh_token: 'ref-1', expires_in: 3600, user: { id: 'u-google-1', email: 'gus@test.dev', user_metadata: { full_name: 'Gustavo' } } }, 200));
    }
    if (/\/rest\/v1\/users/.test(u)) return Promise.resolve(jsonResp([], 200));
    if (/\/rest\/v1\/rpc\/redeem_item/.test(u)) return Promise.resolve(jsonResp({ coins: 999, ownedCosmetics: ['fan-lotus'], inventory: { time5: 1 } }, 200));
    if (/\/rest\/v1\/rpc\/my_friend_code/.test(u)) return Promise.resolve(jsonResp({ code: 'F1A2B3' }, 200));
    if (/\/rest\/v1\/rpc\/add_friend/.test(u)) return Promise.resolve(jsonResp({ ok: true, uid: 'u-friend-2', name: 'Bob' }, 200));
    if (/\/rest\/v1\/rpc\/submit_duel_play/.test(u)) {
      duelSubmitCalls++;
      if (duelSubmitCalls === 1) return Promise.resolve(jsonResp({ status: 'waiting', played_side: 'p1', score: 5200 }, 200));
      return Promise.resolve(jsonResp({ status: 'finished', won: true, reward: 20, bonus: 0, pts: 20, my: 5200, op: 4000, streak: 1 }, 200));
    }
    if (/\/rest\/v1\/rpc\/live_join/.test(u)) return Promise.resolve(jsonResp(Object.assign({}, ROOM_ROW, { status: 'ready' }), 200));
    if (/\/rest\/v1\/rpc\/live_submit/.test(u)) {
      liveSubmitCalls++;
      return Promise.resolve(jsonResp({ status: 'finished', won: true, reward: 15, pts: 15, my: 2500, op: 1800, winner: 'u-google-1' }, 200));
    }
    if (/\/rest\/v1\/rpc\/is_admin/.test(u)) return Promise.resolve(jsonResp({ admin: true }, 200));
    if (/\/rest\/v1\/rpc\/admin_stats/.test(u)) return Promise.resolve(jsonResp({ users: 3, duels: 5, rooms: 2 }, 200));
    if (/\/rest\/v1\/rpc\/admin_grant/.test(u)) return Promise.resolve(jsonResp({ ok: true, coins: 500 }, 200));
    if (/\/rest\/v1\/rpc\/admin_notice/.test(u)) return Promise.resolve(jsonResp({ ok: true }, 200));
    if (/\/rest\/v1\/rpc\/notice/.test(u)) return Promise.resolve(jsonResp({ text: 'Mantenimiento', active: 1, updated: '2026-01-01' }, 200));
    if (/\/rest\/v1\/duels/.test(u)) return Promise.resolve(jsonResp([], 200));
    if (/\/rest\/v1\/live_rooms/.test(u)) return Promise.resolve(jsonResp([Object.assign({}, ROOM_ROW, { status: 'playing', h_score: 1200, g_score: 800, g_done: 1 })], 200));
    return Promise.resolve(jsonResp([], 200));
  }
  network.gets.push(u);
  if (/\/rest\/v1\/users/.test(u)) return Promise.resolve(jsonResp([{ uid: 'u-google-1', profile: { name: 'Cloud', coins: 999, _saved: Date.now() + 100000 } }], 200));
  if (/\/rest\/v1\/daily/.test(u)) return Promise.resolve(jsonResp([{ uid: 'x1', name: 'A', score: 10 }], 200));
  if (/\/rest\/v1\/duels/.test(u)) return Promise.resolve(jsonResp([], 200));
  if (/\/rest\/v1\/live_rooms/.test(u)) return Promise.resolve(jsonResp([Object.assign({}, ROOM_ROW, { status: 'playing', h_score: 1500, g_score: 900, g_done: 0 })], 200));
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
global.session = { activeNow: [], duel: null };
gload('js/arena/duels.js');
global.SUPABASE_ANON_KEY = '';
gload('js/arena/realtime.js');
gload('js/arena/live.js');

// ---- WebSocket falso (servidor Phoenix v2) para probar Realtime ----
class FakeWS {
  constructor(url) {
    this.url = url; this.readyState = 0; FakeWS.instances.push(this); this.sent = [];
    setTimeout(() => { this.readyState = 1; if (this.onopen) this.onopen(); }, 0);
  }
  send(data) {
    const m = JSON.parse(data);
    this.sent.push(m);
    if (FakeWS.handle) FakeWS.handle(this, m);
  }
  close() { this.readyState = 3; if (this.onclose) this.onclose(); }
}
FakeWS.instances = [];
// responde phx_join/phx_leave/heartbeat como el server real
FakeWS.handle = (sock, m) => {
  const topic = m[2], event = m[3];
  if (event === 'phx_join') FakeWS.emit(sock, topic, 'phx_reply', { status: 'ok', response: {} });
  else if (event === 'heartbeat') FakeWS.emit(sock, 'phoenix', 'phx_reply', { status: 'ok', response: {} });
  else if (event === 'phx_leave') FakeWS.emit(sock, topic, 'phx_reply', { status: 'ok', response: {} });
};
FakeWS.emit = (sock, topic, event, payload) => { sock.onmessage({ data: JSON.stringify([topic, 'srv-1', topic, event, payload]) }); };
FakeWS.row = (sock, topic, row) => FakeWS.emit(sock, topic, 'postgres_changes', {
  ids: [], type: 'UPDATE', schema: 'public', table: 'live_rooms', commit_timestamp: '2026-01-01T00:00:00Z', errors: null,
  data: { columns: [], commit_timestamp: '', errors: null, ids: [], old_record: null, record: row, type: 'UPDATE' }
});

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

  // 9) Duelos (Fase 2)
  ok('Duel.authed() con llave+sesion', Duel.authed() === true && Duel.myUid() === 'u-google-1');
  const gSample = { score: 5200, bestCombo: 14, hits: 40, catches: 5, fails: 2, startedAt: 0 };
  const h = Duel.huella(gSample, 21000);
  ok('huella mapea score/combo/aciertos/fallos/ms',
    h.score === 5200 && h.combo === 14 && h.hits === 45 && h.fails === 2 && h.ms === 21000);
  // limita combo a [1,20] y nunca negativos
  const h2 = Duel.huella({ score: 100, bestCombo: 99, hits: 0, catches: 0, fails: 0, startedAt: 0 }, 300);
  ok('huella clampa combo<=20 y ms>=0', h2.combo === 20 && h2.ms === 300);
  // invariantes del server para el nivel 5 (plan_ms=34000):
  const plan5 = 34000;
  ok('huella nivel 5 dentro de los limites del server',
    h.hits <= (plan5 / 1000) * 2.5 + 8 &&
    h.ms >= h.hits * 400 && h.ms <= (plan5 + 12000) * 1.5 &&
    h.score <= h.hits * 4800 + 50 &&
    h.score >= h.hits * 10 - h.fails * 260 - 10000);
  // estado de un duelo segun lado jugado
  const dPending = { id: 'x', p1: 'u-google-1', p2: 'other', status: 'pending', scores: {}, done1: 0, done2: 0 };
  ok('duelo pendiente: puedo jugar', Duel.canPlay(dPending) === true && Duel.waitingOther(dPending) === false);
  const dWaiting = { id: 'x', p1: 'u-google-1', p2: 'other', status: 'p1_done', scores: { p1: 1200 }, done1: 123, done2: 0 };
  ok('duelo con mi lado hecho: en espera', Duel.canPlay(dWaiting) === false && Duel.waitingOther(dWaiting) === true);
  const dWin = { id: 'x', p1: 'u-google-1', p2: 'other', status: 'finished', winner: 'u-google-1', scores: { p1: 1200, p2: 900 }, done1: 1, done2: 2 };
  ok('duelo ganado reporta iWon y puntajes', Duel.iWon(dWin) === true && Duel.myScore(dWin) === 1200 && Duel.opScore(dWin) === 900);

  // 10) Flujo de red de duelos
  network.posts.length = 0;
  const code = await Duel.myCode();
  ok('my_friend_code llama al RPC del server', code === 'F1A2B3' && network.posts.some(p => /rpc\/my_friend_code/.test(p.url)));
  network.posts.length = 0;
  const fr = await Duel.addFriend('F1A2B3');
  ok('add_friend envia p_code', fr.ok && network.posts.some(p => /rpc\/add_friend/.test(p.url) && p.body.p_code === 'F1A2B3'));
  network.posts.length = 0;
  const did = await Duel.create({ uid: 'u-friend-2', name: 'Bob' }, 5);
  ok('crear duelo inserta con p1=p2=uids y level', network.posts.some(p => /\/rest\/v1\/duels/.test(p.url) &&
    p.body[0].p1 === 'u-google-1' && p.body[0].p2 === 'u-friend-2' && p.body[0].level_id === 5 && p.body[0].status === 'pending') && !!did);
  network.gets.length = 0;
  const dl = await Duel.list();
  ok('list() consulta mis duelos (p1 o p2)', Array.isArray(dl) && network.gets.some(u => u.includes('/rest/v1/duels?or=')));
  // submit: mi lado -> esperando
  session.duel = { id: 'd1' };
  let res = await Duel.submit({ score: 5200, combo: 14, hits: 45, fails: 2, ms: 21000 });
  ok('submit envia submit_duel_play con parametros mapeados', res.status === 'waiting' &&
    network.posts.some(p => /rpc\/submit_duel_play/.test(p.url) && p.body.p_duel === 'd1' && p.body.p_score === 5200 && p.body.p_hits === 45 && p.body.p_ms === 21000));
  // submitFromGame: construye huella y limpia session.duel; al resolverse recompensa
  network.posts.length = 0;
  session.duel = { id: 'd2' };
  res = await Duel.submitFromGame({ score: 5200, bestCombo: 14, hits: 40, catches: 5, fails: 2, startedAt: 0 });
  ok('submitFromGame resuelve con recompensa', res && res.status === 'finished' && res.won === true && res.reward === 20 && session.duel === null);

  // 11) Realtime (Phoenix v2 mock) + salas 1v1 (Fase 3)
  global.WebSocket = FakeWS;
  const rtState = { connected: false, msgs: [] };
  RT.status(c => { rtState.connected = c; });
  RT.boot();
  await new Promise(r => setTimeout(r, 10));
  ok('RT.boot conecta el socket y entra en realtime:public', rtState.connected && FakeWS.instances.length > 0 &&
    FakeWS.instances[0].sent.some(m => m[3] === 'phx_join' && m[2] === 'realtime:public'));
  ok('RT.connected() reporta sesion abierta', RT.connected() === true);

  // sub + broadcast -> aviso global
  RT.sub('realtime:public', m => rtState.msgs.push(m));
  const sock = FakeWS.instances[0];
  FakeWS.emit(sock, 'realtime:public', 'broadcast', { event: 'notice', payload: { text: 'Hola a todos' } });
  ok('broadcast de aviso llega al callback', rtState.msgs.some(m => m.event === 'notice' && m.payload && m.payload.text === 'Hola a todos'));

  // canal de una sala con postgres_changes -> fila reactiva
  let liveRow = null;
  RT.sub('realtime:public:live_rooms', msg => { if (msg && msg.id) liveRow = msg; });
  FakeWS.row(sock, 'realtime:public:live_rooms', { id: 'room1', status: 'playing', g_score: 500 });
  ok('postgres_changes entrega la fila completa', !!liveRow && liveRow.id === 'room1' && liveRow.g_score === 500);
  ok('el socket sigue abierto tras los ACKs del server', RT.connected() === true && sock.readyState === 1);

  // 12) Live: salas 1v1
  ok('Live.authed() con sesion', Live.authed() === true && Live.myUid() === 'u-google-1');
  await Live.attach('room1');
  await new Promise(r => setTimeout(r, 10));
  ok('attach() descarga la sala y monta el panel RT', !!Live.current() && Live.mySide() === 'guest' &&
    sock.sent.some(m => m[3] === 'phx_join' && m[2] === 'realtime:public:live_rooms' && JSON.stringify(m[4]).includes('id=eq.room1')));
  ok('mySide() = guest (no host)', Live.mySide() === 'guest');
  ok('opScore() lee el marcador del rival', Live.opScore() === 1500);

  // sendScore: primer envio inmediato (PATCH al lado propio), throttle el resto
  network.patches.length = 0;
  await Live.sendScore(2500);
  await new Promise(r => setTimeout(r, 10));
  ok('sendScore envia PATCH g_score', network.patches.length === 1 && /\/rest\/v1\/live_rooms\?/.test(network.patches[0].url) &&
    network.patches[0].body.g_score === 2500);
  await Live.sendScore(2600);
  await new Promise(r => setTimeout(r, 30));
  ok('sendScore throttled (no revuelve en 30ms)', network.patches.length === 1);

  // guards: solo el host empieza
  let started = null; try { started = await Live.start(); } catch (e) { started = e; }
  ok('start() rechaza a un invitado', started instanceof Error);

  // finishFromGame: RPC live_submit valida huella y resuelve
  network.posts.length = 0;
  const out = await Live.finishFromGame({ score: 2500, bestCombo: 9, hits: 30, catches: 3, fails: 1, startedAt: 0 });
  const sub = network.posts.find(p => /rpc\/live_submit/.test(p.url));
  ok('finishFromGame llama live_submit con la huella', !!sub && sub.body.p_room === 'room1' && sub.body.p_score === 2500 &&
    sub.body.p_hits === 33 && sub.body.p_combo === 9 && sub.body.p_ms >= 0);
  ok('finishFromGame resuelve evento con huella y cierra la sala', !!out && out.won === true && out.reward === 15 && !!Live.current() === false);
  ok('lastOutcome guarda el resultado', Live.lastOutcome() && Live.lastOutcome().won === true);
  const noRoom = await Live.sendScore(99);
  ok('sendScore sin sala no emite', noRoom === undefined && network.patches.length === 1);

  // 13) Admin (RPCs)
  let s2 = await SupRemote.rpc('admin_stats', {});
  ok('admin_stats devuelve el estado del server', s2 && s2.users === 3 && s2.duels === 5 && s2.rooms === 2);
  network.posts.length = 0;
  s2 = await SupRemote.rpc('admin_grant', { p_code: 'ABC1', p_amount: 500 });
  ok('admin_grant envia p_code y p_amount', s2 && s2.ok && s2.coins === 500 && network.posts.some(p => /rpc\/admin_grant/.test(p.url) && p.body.p_code === 'ABC1' && p.body.p_amount === 500));
  network.posts.length = 0;
  s2 = await SupRemote.rpc('admin_notice', { p_text: 'Mantenimiento' });
  ok('admin_notice publica el aviso', s2 && s2.ok && network.posts.some(p => /rpc\/admin_notice/.test(p.url) && p.body.p_text === 'Mantenimiento'));
  RT.unjoin('realtime:public');

  console.log(fail ? ('FALLOS: ' + fail) : 'ONLINE OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });