// Vercel Cron harian (vercel.json → crons): level Menara Event semua pemain bot dihitung (api/_bots.js) lalu dikirim ke Supabase
// lewat bot_event_tick (skema v21). Sekaligus aktivitas database harian, jadi project Supabase Free tidak di-pause karena sepi.
// Env Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Vercel mengirim "Authorization: Bearer <CRON_SECRET>").
const { configured, sb, currentEvent } = require('./_supabase');
const { planRows } = require('./_bots');

const PAGE = 1000, CHUNK = 500;

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });
  if (!configured()) return res.status(503).json({ error: 'supabase not configured' });
  try {
    const now = new Date();
    const ev = await currentEvent(now);
    if (!ev) return res.status(200).json({ ok: true, event: null, note: 'no event running' });

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
      const { data } = await sb('/rest/v1/rpc/bot_event_tick', { method: 'POST', body: { p_event: ev.id, p_rows: rows.slice(i, i + CHUNK) } });
      if (!data || !data.ok) throw new Error('bot_event_tick: ' + JSON.stringify(data));
      pushed += data.rows || 0;
    }
    const top = rows.reduce((m, r) => Math.max(m, r.level), 0);
    return res.status(200).json({ ok: true, event: ev.id, bots: bots.length, playing: rows.length, pushed, topLevel: top });
  } catch (e) {
    console.error('[bot-event-daily]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
};
