// Vercel Cron harian (vercel.json → crons, 00:10 UTC): pekerjaan harian di api/_daily.js (level event bot + rekam harian admin).
// Env Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Vercel mengirim "Authorization: Bearer <CRON_SECRET>").
const { configured } = require('./_supabase');
const { runDaily } = require('./_daily');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });
  if (!configured()) return res.status(503).json({ error: 'supabase not configured' });
  try {
    return res.status(200).json(await runDaily('cron'));
  } catch (e) {
    console.error('[bot-event-daily]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
};
