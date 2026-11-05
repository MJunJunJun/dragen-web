// Uji logika level Menara Event bot (api/_bots.js) + rute API dengan Supabase tiruan. Tanpa jaringan:
//   node tools/uji-bot-event.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { botLevel, planRows, KINDS } = require('../api/_bots');

const DAY = 86400000;
const ev = { id: 'harvest-2026', starts: '2026-11-03T00:00:00Z', ends: '2026-12-14T00:00:00Z' };
const kinds = Object.keys(KINDS);
const bots = Array.from({ length: 1000 }, (_, i) => ({
  player_id: 'b' + String(i).padStart(4, '0'), player_name: 'Bot' + i, bot_kind: kinds[i % kinds.length], bot_seed: 1000 + i * 7919,
  bot_since: new Date(Date.parse('2026-09-01T00:00:00Z') + (i % 60) * DAY).toISOString(),
  bot_quit: kinds[i % kinds.length] === 'quit' ? 50 + (i % 30) : null, bot_wake: (i * 5) % 24, bot_awake: 10 + (i % 8),
}));
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('PASS ' + name); };
const at = d => new Date(Date.parse(ev.starts) + d * DAY + 30 * 60000); // 00:30 UTC tiap hari (jadwal cron)

ok('deterministik: cron dua kali sehari = hasil sama', () => {
  assert.deepEqual(planRows(bots, ev, at(9)), planRows(bots, ev, at(9)));
});

ok('level tidak pernah turun & naik paling banyak 10 per hari', () => {
  for (const b of bots) {
    let prev = 0;
    for (let d = 1; d <= 41; d++) {
      const r = botLevel(b, ev, at(d)), lv = r ? r.level : 0;
      assert.ok(lv >= prev, `${b.player_id} turun di hari ${d}: ${prev} → ${lv}`);
      assert.ok(lv - prev <= 10, `${b.player_id} naik ${lv - prev} di hari ${d}`);
      assert.ok(lv <= 10 * d, `${b.player_id} melampaui 10 × hari (${lv} di hari ${d})`);
      prev = lv;
    }
  }
});

ok('jam capai di antara awal event dan sekarang', () => {
  const now = at(12);
  for (const r of planRows(bots, ev, now)) {
    const t = Date.parse(r.reached_at);
    assert.ok(t >= Date.parse(ev.starts) && t <= now.getTime(), r.player_id + ' ' + r.reached_at);
    const hour = new Date(t).getUTCHours();
    assert.ok(hour >= 2 && hour < 23, r.player_id + ' main jam ' + hour + ' UTC, di dalam jendela cron Hobby 00:10–01:10');
  }
});

ok('cron yang molor sampai 01:10 UTC tetap naik paling banyak 10', () => {
  const late = d => new Date(Date.parse(ev.starts) + d * DAY + 70 * 60000);
  for (const b of bots) {
    for (let d = 1; d <= 40; d++) {
      const a = botLevel(b, ev, at(d)), z = botLevel(b, ev, late(d + 1));
      assert.ok((z ? z.level : 0) - (a ? a.level : 0) <= 10, `${b.player_id} hari ${d}`);
    }
  }
});

ok('bot berhenti main tidak naik lagi sesudah hari berhentinya', () => {
  for (const b of bots.filter(x => x.bot_quit != null)) {
    const quitAt = Date.parse(b.bot_since) + b.bot_quit * DAY;
    const r = botLevel(b, ev, at(41));
    if (r) assert.ok(Date.parse(r.reached_at) <= quitAt, b.player_id);
  }
});

ok('peringkat 10 teratas berubah tiap hari', () => {
  const rank = d => planRows(bots, ev, at(d)).sort((a, b) => b.level - a.level || Date.parse(a.reached_at) - Date.parse(b.reached_at))
    .slice(0, 10).map(r => r.player_id).join(',');
  let changes = 0;
  for (let d = 2; d <= 30; d++) if (rank(d) !== rank(d - 1)) changes++;
  assert.ok(changes >= 20, 'hanya berubah ' + changes + ' dari 29 hari');
});

const sorted = d => planRows(bots, ev, at(d)).sort((a, b) => b.level - a.level || Date.parse(a.reached_at) - Date.parse(b.reached_at));
for (const d of [1, 7, 20, 40]) {
  const rows = sorted(d);
  console.log(`hari ${d}: ${rows.length} bot ikut · #1 Lv ${rows[0].level} · #10 Lv ${rows[9].level} · #100 Lv ${(rows[99] || {}).level}`);
}

// ---------- rute API dengan Supabase tiruan ----------
(async () => {
  process.env.SUPABASE_URL = 'https://tiruan.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_tiruan';
  process.env.CRON_SECRET = 'rahasia';
  const calls = [];
  let rpcTop = false; // false = skema v22 belum dijalankan (RPC 404 → kueri lama)
  const realFetch = global.fetch;
  global.fetch = async (url, opt = {}) => {
    calls.push({ url, opt });
    const u = new URL(url);
    const json = (data, headers = {}, status = 200) => ({ ok: status < 300, status, headers: new Map(Object.entries(headers)), text: async () => JSON.stringify(data) });
    if (u.pathname === '/rest/v1/events') return json([ev]);
    if (u.pathname === '/rest/v1/rpc/admin_snapshot') return json({ ok: true, day: '2026-11-13' });
    if (u.pathname === '/rest/v1/admin_log') return json(null, {}, 201);
    if (u.pathname === '/rest/v1/rpc/event_top_public') {
      if (!rpcTop) return json({ code: 'PGRST202', message: 'Could not find the function public.event_top_public' }, {}, 404);
      const top = sorted(10).slice(0, 100).map((r, i) => ({ rank: i + 1, name: 'Bot' + (+r.player_id.slice(1)), level: r.level }));
      return json({ total: 600, top });
    }
    if (u.pathname === '/rest/v1/players') {
      const from = +u.searchParams.get('offset'), lim = +u.searchParams.get('limit');
      return json(bots.slice(from, from + lim).map(({ player_name, ...b }) => b));
    }
    if (u.pathname === '/rest/v1/rpc/bot_event_tick') return json({ ok: true, rows: JSON.parse(opt.body).p_rows.length });
    if (u.pathname === '/rest/v1/event_scores') {
      const rows = sorted(10).slice(0, 100).map(r => ({ level: r.level, reached_at: r.reached_at, players: { player_name: 'Bot' + (+r.player_id.slice(1)) } }));
      return json(rows, { 'content-range': '0-99/' + planRows(bots, ev, at(10)).length });
    }
    throw new Error('tak terduga: ' + url);
  };
  const res = () => { const r = { code: 0, body: null, headers: {} }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; r.setHeader = (k, v) => { r.headers[k] = v; }; return r; };
  delete require.cache[require.resolve('../api/_supabase')];
  const daily = require('../api/bot-event-daily'), event = require('../api/event');

  let r = res(); await daily({ headers: {} }, r);
  assert.equal(r.code, 401); pass++; console.log('PASS cron menolak tanpa CRON_SECRET');

  calls.length = 0; r = res(); await daily({ headers: { authorization: 'Bearer rahasia' } }, r);
  assert.equal(r.code, 200, JSON.stringify(r.body));
  assert.equal(r.body.bots, 1000);
  assert.equal(calls.filter(c => c.url.includes('/rest/v1/players')).length, 2, 'halaman 1000 baris + halaman kosong');
  const ticks = calls.filter(c => c.url.endsWith('/rpc/bot_event_tick'));
  assert.ok(ticks.length >= 1 && ticks.every(c => JSON.parse(c.opt.body).p_rows.length <= 500), 'dikirim per ≤ 500 baris');
  assert.equal(r.body.pushed, r.body.playing);
  assert.ok(calls.every(c => c.opt.headers.apikey === 'sb_secret_tiruan' && !c.opt.headers.Authorization), 'kunci sb_secret hanya di apikey');
  assert.equal(r.body.snapshot.ok, true, 'rekam harian admin_snapshot ikut jalan');
  const logged = calls.find(c => c.url.endsWith('/rest/v1/admin_log'));
  assert.ok(logged && JSON.parse(logged.opt.body).action === 'cron', 'hasil cron dicatat di admin_log');
  pass++; console.log(`PASS cron mengirim level ${r.body.playing} bot (Lv tertinggi ${r.body.topLevel}) + rekam harian + log`);

  r = res(); await event({ headers: {} }, r);
  assert.equal(r.code, 200);
  assert.equal(r.body.top.length, 100);
  assert.deepEqual(Object.keys(r.body.top[0]).sort(), ['level', 'name', 'rank']);
  assert.ok(r.body.top.every((x, i) => i === 0 || r.body.top[i - 1].level >= x.level), 'urut level');
  assert.match(r.headers['Cache-Control'], /s-maxage=300/);
  pass++; console.log(`PASS /api/event (sebelum v22, kueri lama): ${r.body.event.id}, ${r.body.total} pemain, #1 ${r.body.top[0].name} Lv ${r.body.top[0].level}`);

  rpcTop = true; calls.length = 0;
  r = res(); await event({ headers: {} }, r);
  assert.equal(r.code, 200);
  assert.equal(r.body.total, 600);
  assert.ok(!calls.some(c => c.url.includes('/rest/v1/event_scores')), 'v22: lewat event_top_public (tanpa pemain di-ban)');
  assert.deepEqual(Object.keys(r.body.top[0]).sort(), ['level', 'name', 'rank']);
  pass++; console.log('PASS /api/event (sesudah v22): lewat event_top_public');

  global.fetch = realFetch;
  console.log(`\n${pass} uji lulus`);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
