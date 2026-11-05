// Data publik bagian Event website: event Menara Event yang sedang berjalan (tabel events) + peringkat 1–100 (event_scores ⨝ players,
// urutan sama dengan event_board: level tertinggi, seri = yang lebih dulu sampai). Hanya nama & level, tanpa id pemain.
// Disimpan CDN Vercel 5 menit, jadi Supabase tidak dipanggil tiap pengunjung.
const { configured, sb, currentEvent } = require('./_supabase');

module.exports = async (req, res) => {
  if (!configured()) return res.status(503).json({ error: 'not configured' });
  try {
    const ev = await currentEvent(new Date());
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    if (!ev) return res.status(200).json({ event: null, total: 0, top: [] });
    const { data, headers } = await sb(`/rest/v1/event_scores?select=level,reached_at,players(player_name)`
      + `&event_id=eq.${encodeURIComponent(ev.id)}&level=gt.0&order=level.desc,reached_at.asc,player_id.asc&limit=100`,
      { headers: { Prefer: 'count=exact' } });
    const range = headers.get('content-range') || '';
    const total = parseInt(range.split('/')[1], 10) || (data || []).length;
    const top = (data || []).map((r, i) => ({ rank: i + 1, name: (r.players && r.players.player_name) || 'Player', level: r.level }));
    return res.status(200).json({ event: { id: ev.id, starts: ev.starts, ends: ev.ends }, total, top, updated: new Date().toISOString() });
  } catch (e) {
    console.error('[event]', e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'leaderboard unavailable' });
  }
};
