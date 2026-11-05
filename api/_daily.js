// Pekerjaan harian (Vercel Cron 00:10 UTC lewat /api/bot-event-daily, atau tombol "Jalankan sekarang" di /admin):
// 1. level Menara Event semua pemain bot dihitung (api/_bots.js) lalu dikirim ke Supabase lewat bot_event_tick (skema v21)
// 2. rekam harian admin_snapshot (skema v22): jumlah pemain, aktif, baru, peserta event, gold/berry pemain asli (lonjakan)
// 3. hasilnya dicatat di admin_log (action "cron") supaya halaman admin tahu kapan terakhir jalan
// Sekaligus aktivitas database harian, jadi project Supabase Free tidak di-pause karena sepi.
const { sb, rpc, currentEvent } = require('./_supabase');
const { planRows } = require('./_bots');

const PAGE = 1000, CHUNK = 500;

async function botTick(now) {
  const ev = await currentEvent(now);
  if (!ev) return { event: null, note: 'no event running' };
  const bots = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await sb(`/rest/v1/players?select=player_id,bot_seed,bot_kind,bot_since,bot_quit,bot_wake,bot_awake&is_bot=eq.true`
      + `&order=player_id.asc&limit=${PAGE}&offset=${from}`);
    bots.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  const rows = planRows(bots, ev, now);
  let pushed = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const data = await rpc('bot_event_tick', { p_event: ev.id, p_rows: rows.slice(i, i + CHUNK) });
    if (!data || !data.ok) throw new Error('bot_event_tick: ' + JSON.stringify(data));
    pushed += data.rows || 0;
  }
  const top = rows.reduce((m, r) => Math.max(m, r.level), 0);
  return { event: ev.id, bots: bots.length, playing: rows.length, pushed, topLevel: top };
}

async function runDaily(by = 'cron', now = new Date()) {
  const out = { ok: true, ...(await botTick(now)) };
  try { out.snapshot = await rpc('admin_snapshot'); } catch (e) { out.snapshot = { ok: false, error: String(e.message || e).slice(0, 160) }; }
  try {
    await sb('/rest/v1/admin_log', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: { admin: by, action: 'cron', target: out.event ? 'event:' + out.event : null, detail: out } });
  } catch (e) { out.logged = false; } // skema v22 belum ada: cron tetap jalan
  return out;
}

module.exports = { runDaily, botTick };
