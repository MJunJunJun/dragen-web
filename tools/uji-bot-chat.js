// Uji penjadwal chat bot (api/_botchat.js) + rute cron (api/_daily.botChatPlan) dengan Supabase tiruan. Tanpa jaringan:
//   node tools/uji-bot-chat.js
const assert = require('node:assert/strict');
const { DEFAULT_BANDS, hash01, sessions, onlineAt, profile, planSchedule } = require('../api/_botchat');

const DAY = 86400;
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('PASS ' + name); };

// 1000 bot sintetis (seperti baris players is_bot): zona WIB (bangun 23–02 UTC) & lainnya, berbagai jenis, sebagian berhenti
const KINDS = ['casual', 'steady', 'eager', 'fighter', 'collector', 'farmer', 'quit'];
const WAKES = [23, 0, 1, 2, 5, 6, 11, 13]; // 4 pertama = WIB
const bots = Array.from({ length: 1000 }, (_, i) => ({
  player_id: 'b' + String(i).padStart(4, '0'), bot_seed: 1000 + i * 7919, bot_kind: KINDS[i % KINDS.length],
  bot_wake: WAKES[i % WAKES.length], bot_awake: 12 + (i % 8),
  bot_since: new Date(Date.parse('2026-09-01T00:00:00Z') + (i % 60) * DAY * 1000).toISOString(),
  bot_quit: KINDS[i % KINDS.length] === 'quit' ? 20 + (i % 40) : null,
}));
const byId = Object.fromEntries(bots.map(b => [b.player_id, b]));

const lines = [
  { id: 1, body: 'gg everyone!', lang: 'en', needs: [] },
  { id: 2, body: 'my {{best}} just hit Lv {{bestLevel}}', lang: 'en', needs: ['best', 'bestLevel'] },
  { id: 3, body: 'anyone grinding {{event}} right now?', lang: 'en', needs: ['event'] },
  { id: 4, body: 'halo semua, lagi ngapain?', lang: 'id', needs: [] },
  { id: 5, body: 'naga {{best}} ku udah {{dragons}} ekor nih', lang: 'id', needs: ['best', 'dragons'] },
  { id: 6, body: 'event {{event}} seru banget', lang: 'id', needs: ['event'] },
  { id: 7, body: 'nice!', lang: 'en', needs: [] },
];
const cfg = { enabled: true, daily_count: 300, bands: DEFAULT_BANDS };
const NOW = new Date('2026-11-10T00:05:00Z'); // seperti cron 00:10 UTC

// ---------- hash port ----------
ok('hash01 deterministik & di [0,1)', () => {
  for (let i = 0; i < 50; i++) {
    const a = hash01(1234 + i, i, 7, 3), b = hash01(1234 + i, i, 7, 3);
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 1, 'hash01 = ' + a);
  }
});

// ---------- jadwal online ----------
ok('bot kadang online kadang tidak dalam sehari', () => {
  const p = profile(bots[3]); // WIB eager
  let on = 0, off = 0;
  const d0 = Math.floor(NOW.getTime() / 1000 / DAY) * DAY;
  for (let t = d0; t < d0 + DAY; t += 1800) (onlineAt(p, t) ? on++ : off++);
  assert.ok(on > 0 && off > 0, `online ${on} / offline ${off}`);
});
ok('bot berhenti main tidak online sesudah hari berhentinya', () => {
  const b = bots.find(x => x.bot_quit != null);
  const p = profile(b);
  const quitSec = p.since + p.quit * DAY;
  assert.equal(onlineAt(p, quitSec + 10 * DAY), false);
});
ok('sesi deterministik', () => {
  const p = profile(bots[7]);
  assert.deepEqual(sessions(p, 20000), sessions(p, 20000));
});

// ---------- penjadwal ----------
const plan = planSchedule(bots, lines, cfg, false, NOW);
const plan2 = planSchedule(bots, lines, cfg, false, NOW);
ok('penjadwal deterministik', () => assert.deepEqual(plan, plan2));
ok('day = tanggal UTC now', () => assert.equal(plan.day, '2026-11-10'));
ok('menghasilkan banyak pesan (sekitar daily_count; pembulatan per-jam boleh sedikit lebih)', () => {
  assert.ok(plan.rows.length > 150 && plan.rows.length <= 360, 'rows = ' + plan.rows.length);
});
ok('setiap pesan dikirim bot yang BENAR-BENAR online pada jam itu', () => {
  for (const r of plan.rows) {
    const p = profile(byId[r.bot_id]);
    const t = Math.floor(Date.parse(r.scheduled_at) / 1000);
    assert.ok(onlineAt(p, t), `${r.bot_id} tidak online di ${r.scheduled_at}`);
  }
});
ok('scheduled_at di dalam hari UTC-nya & tidak > 6 jam sebelum now', () => {
  const d0 = Date.parse('2026-11-10T00:00:00Z'), nowMs = NOW.getTime();
  for (const r of plan.rows) {
    const t = Date.parse(r.scheduled_at);
    assert.ok(t >= d0 && t < d0 + DAY * 1000, r.scheduled_at);
    assert.ok(t > nowMs - 6 * 3600 * 1000, 'terlalu lama lewat: ' + r.scheduled_at);
  }
});
ok('slot unik', () => {
  const s = new Set(plan.rows.map(r => r.slot));
  assert.equal(s.size, plan.rows.length);
});
ok('tanpa event: tidak ada kalimat {{event}}', () => {
  assert.ok(plan.rows.every(r => !r.body.includes('{{event}}')), 'ada {{event}} tanpa event');
});
ok('dengan event: kalimat {{event}} boleh muncul', () => {
  const withEv = planSchedule(bots, lines, cfg, true, NOW);
  assert.ok(withEv.rows.some(r => r.body.includes('{{event}}')), 'tidak ada {{event}} padahal event jalan');
});
ok('sebagian kalimat bahasa Indonesia (bot WIB)', () => {
  const idBodies = new Set(lines.filter(l => l.lang === 'id').map(l => l.body));
  assert.ok(plan.rows.some(r => idBodies.has(r.body)), 'tidak ada kalimat id sama sekali');
});
ok('body & line_id konsisten dengan daftar kalimat', () => {
  const byLine = Object.fromEntries(lines.map(l => [l.id, l.body]));
  for (const r of plan.rows) assert.equal(r.body, byLine[r.line_id], 'body != line ' + r.line_id);
});

// jam sibuk (19–23 WIB = 12–16 UTC) lebih ramai daripada jam sepi (01–06 WIB = 18–23 UTC)
ok('ritme WIB: jam ramai > jam sepi', () => {
  const hourOf = r => new Date(r.scheduled_at).getUTCHours();
  const busy = plan.rows.filter(r => hourOf(r) >= 12 && hourOf(r) <= 16).length;
  const quiet = plan.rows.filter(r => hourOf(r) >= 18 && hourOf(r) <= 23).length;
  assert.ok(busy > quiet, `ramai ${busy} vs sepi ${quiet}`);
});

// ---------- rute cron botChatPlan dengan Supabase tiruan ----------
(async () => {
  process.env.SUPABASE_URL = 'https://tiruan.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_tiruan';
  const calls = [];
  const realFetch = global.fetch;
  let enabled = true, event = false;
  global.fetch = async (url, opt = {}) => {
    calls.push({ url, opt });
    const u = new URL(url);
    const json = (data, status = 200) => ({ ok: status < 300, status, headers: new Map(), text: async () => JSON.stringify(data) });
    if (u.pathname === '/rest/v1/bot_chat_config') return json([{ id: 1, enabled, daily_count: 300, bands: DEFAULT_BANDS }]);
    if (u.pathname === '/rest/v1/bot_chat_lines') { const off = +u.searchParams.get('offset'); return json(off === 0 ? lines : []); }
    if (u.pathname === '/rest/v1/players') { const off = +u.searchParams.get('offset'); return json(off === 0 ? bots : []); }
    if (u.pathname === '/rest/v1/events') return json(event ? [{ id: 'harvest-2026', starts: '2026-11-03T00:00:00Z', ends: '2026-12-16T00:00:00Z' }] : []);
    if (u.pathname === '/rest/v1/rpc/bot_chat_plan_write') return json({ ok: true, written: JSON.parse(opt.body).p_rows.length });
    if (u.pathname === '/rest/v1/admin_log') return json(null, 201);
    throw new Error('tak terduga: ' + url);
  };
  delete require.cache[require.resolve('../api/_supabase')];
  delete require.cache[require.resolve('../api/_daily')];
  const { botChatPlan } = require('../api/_daily');

  let r = await botChatPlan(NOW);
  assert.equal(r.ok, true); assert.equal(r.enabled, true);
  assert.ok(r.planned > 150 && r.written === r.planned, JSON.stringify(r));
  const writes = calls.filter(c => c.url.endsWith('/rpc/bot_chat_plan_write'));
  assert.ok(writes.length >= 1 && writes.every(c => JSON.parse(c.opt.body).p_rows.length <= 500), 'ditulis per ≤ 500 baris');
  assert.ok(calls.every(c => c.opt.headers.apikey === 'sb_secret_tiruan'), 'kunci sb_secret di apikey');
  pass++; console.log(`PASS cron botChatPlan menjadwalkan ${r.planned} pesan (ditulis ${writes.length} batch)`);

  calls.length = 0; enabled = false;
  delete require.cache[require.resolve('../api/_supabase')]; delete require.cache[require.resolve('../api/_daily')];
  const off = require('../api/_daily');
  r = await off.botChatPlan(NOW);
  assert.equal(r.enabled, false);
  assert.ok(!calls.some(c => c.url.endsWith('/rpc/bot_chat_plan_write')), 'nonaktif: tidak menulis jadwal');
  pass++; console.log('PASS cron botChatPlan nonaktif: tidak menjadwalkan apa pun');

  global.fetch = realFetch;
  console.log(`\n${pass} uji lulus`);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
