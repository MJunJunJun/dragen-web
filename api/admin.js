// /api/admin?a=<aksi> — semua data & aksi halaman dragen.arjuntech.id/admin (pengguna 5 Nov: halaman admin + kirim hadiah,
// "gasss implementasikan semuanya"). Satu fungsi Vercel untuk semua aksi.
//
// Keamanan:
// - Login = akun Supabase Auth (email + password, dibuat pemilik di dashboard Supabase) DAN emailnya ada di env ADMIN_EMAILS
//   (dipisah koma). Email lain ditolak sebelum Supabase dipanggil. Gagal login dicatat (admin_log "login_fail") dan dibatasi:
//   5 kali per email / 30 kali total per 15 menit.
// - Token sesi hanya di cookie HttpOnly + Secure + SameSite=Strict (__Host-), tidak bisa dibaca JavaScript halaman.
//   Tiap permintaan wajib header "X-DraGen-Admin: 1" (formulir situs lain tidak bisa mengirimnya) dan Origin yang sama untuk POST.
// - Kunci service_role tetap di server (api/_supabase.js). Semua aksi tercatat di admin_log dengan email admin.
const { configured, sb, rpc } = require('./_supabase');
const { runDaily } = require('./_daily');

const AT = '__Host-dg_admin_at', RT = '__Host-dg_admin_rt';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FAIL_WINDOW = 15 * 60e3, FAIL_PER_EMAIL = 5, FAIL_TOTAL = 30;

const admins = () => (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

class Bad extends Error { constructor(msg, code = 400) { super(msg); this.code = code; } }
const need = (cond, msg) => { if (!cond) throw new Bad(msg); };
const uuid = v => { need(UUID.test(String(v || '')), 'id pemain tidak sah'); return String(v).toLowerCase(); };
const int = (v, lo, hi, def) => { const n = v === undefined || v === null || v === '' ? def : Math.floor(Number(v)); need(Number.isFinite(n) && n >= lo && n <= hi, `angka harus ${lo}–${hi}`); return n; };
const text = (v, max) => String(v === undefined || v === null ? '' : v).slice(0, max);
const iso = v => { if (v === undefined || v === null || v === '') return null; const t = Date.parse(v); need(Number.isFinite(t), 'tanggal tidak sah'); return new Date(t).toISOString(); };

// ---------- cookie & sesi ----------
function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const cookie = (name, value, age) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function setSession(res, s) {
  res.setHeader('Set-Cookie', [cookie(AT, s.access_token, Math.max(60, (s.expires_in || 3600) - 30)), cookie(RT, s.refresh_token, 7 * 86400)]);
}
const clearSession = res => res.setHeader('Set-Cookie', [cookie(AT, '', 0), cookie(RT, '', 0)]);

async function log(admin, action, target, detail = {}) {
  try { await sb('/rest/v1/admin_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { admin, action, target, detail } }); }
  catch (e) { console.error('[admin] log', e.message); }
}

async function countFails(email) {
  const since = encodeURIComponent(new Date(Date.now() - FAIL_WINDOW).toISOString());
  const count = async extra => {
    const { headers } = await sb(`/rest/v1/admin_log?select=id&action=eq.login_fail&at=gt.${since}${extra}&limit=1`, { headers: { Prefer: 'count=exact' } });
    return parseInt(String(headers.get('content-range') || '').split('/')[1], 10) || 0;
  };
  return { email: await count('&target=eq.' + encodeURIComponent(email)), total: await count('') };
}

async function login(req, res, b) {
  const email = text(b.email, 200).trim().toLowerCase(), password = text(b.password, 200);
  need(email && password, 'isi email dan password');
  const fails = await countFails(email);
  if (fails.email >= FAIL_PER_EMAIL || fails.total >= FAIL_TOTAL) throw new Bad('Terlalu banyak percobaan. Coba lagi 15 menit lagi.', 429);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (!admins().includes(email)) { await log(email, 'login_fail', email, { ip, why: 'not admin' }); throw new Bad('Email atau password salah.', 401); }
  const r = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, raw: true });
  const who = r.data && r.data.user && String(r.data.user.email || '').toLowerCase();
  if (r.status !== 200 || !r.data.access_token || who !== email) {
    await log(email, 'login_fail', email, { ip, why: 'auth ' + r.status });
    throw new Bad('Email atau password salah.', 401);
  }
  setSession(res, r.data);
  await log(email, 'login', email, { ip });
  return { ok: true, email };
}

// email admin dari cookie sesi (token kedaluwarsa diperbarui pakai refresh token), atau null
async function session(req, res) {
  const c = readCookies(req);
  const allowed = email => (email && admins().includes(String(email).toLowerCase()) ? String(email).toLowerCase() : null);
  if (c[AT]) {
    const r = await sb('/auth/v1/user', { headers: { Authorization: 'Bearer ' + c[AT] }, raw: true });
    if (r.status === 200 && r.data) return allowed(r.data.email);
  }
  if (c[RT]) {
    const r = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: c[RT] }, raw: true });
    if (r.status === 200 && r.data && r.data.access_token) {
      const email = allowed(r.data.user && r.data.user.email);
      if (email) { setSession(res, r.data); return email; }
    }
  }
  return null;
}

async function logout(req, res) {
  const c = readCookies(req);
  if (c[AT]) await sb('/auth/v1/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + c[AT] }, raw: true }).catch(() => {});
  clearSession(res);
  return { ok: true };
}

// ---------- aksi ----------
const ok = r => { if (r && r.ok === false) throw new Bad(r.message || 'gagal'); return r; };

async function playerName(id) {
  const { data } = await sb(`/rest/v1/players?select=player_name,is_bot&player_id=eq.${id}`);
  need(data && data[0], 'pemain tidak ditemukan');
  return data[0];
}

function campaign(b) {
  const kind = text(b.kind || 'gift', 20);
  need(['gift', 'notice', 'compensation', 'welcome', 'comeback'].includes(kind), 'jenis surat tidak sah');
  const title = text(b.title, 80).trim();
  need(title, 'judul wajib diisi');
  const audience = ['welcome', 'comeback'].includes(kind) ? 'auto' : b.audience === 'all' ? 'all' : 'list';
  const target = audience === 'list' ? targetOf(b.target) : {};
  return {
    kind, title, body: text(b.body, 1000), items: Array.isArray(b.items) ? b.items.slice(0, 12) : [], audience, target,
    starts_at: iso(b.starts_at), ends_at: iso(b.ends_at),
    claim_days: b.claim_days ? int(b.claim_days, 1, 365) : null, rule_days: audience === 'auto' ? int(b.rule_days, 1, 365, kind === 'welcome' ? 3 : 14) : null,
  };
}

function targetOf(t) {
  t = t || {};
  const mode = String(t.mode || '');
  switch (mode) {
    case 'players': need(Array.isArray(t.ids) && t.ids.length > 0 && t.ids.length <= 500, 'pilih 1–500 pemain'); return { mode, ids: t.ids.map(uuid) };
    case 'everyone': return { mode };
    case 'active': case 'new': return { mode, days: int(t.days, 1, 365, 7) };
    case 'since': need(iso(t.since), 'isi waktu mulai'); return { mode, since: iso(t.since) };
    case 'version': need(t.version, 'isi versi game'); return { mode, version: text(t.version, 40) };
    case 'event': need(t.event, 'pilih event'); return { mode, event: text(t.event, 60), from: int(t.from, 1, 100000, 1), to: int(t.to, 1, 100000, 100) };
    default: throw new Bad('pilih penerima');
  }
}

const H = {
  me: { fn: async (q, b, me) => ({ email: me }) },
  stats: { fn: async () => ({ ...(await rpc('admin_stats')), cron_secret: !!process.env.CRON_SECRET }) },
  players: { fn: async q => rpc('admin_players', { p_q: text(q.q, 80), p_bots: q.bots === '1', p_sort: text(q.sort || 'seen', 10), p_limit: int(q.limit, 1, 200, 100) }) },
  player: { fn: async q => { const p = await rpc('admin_player', { p_id: uuid(q.id) }); need(p, 'pemain tidak ditemukan'); return p; } },
  rename: { post: true, fn: async (q, b, me) => ok(await rpc('admin_rename', { p_id: uuid(b.id), p_name: text(b.name, 40), p_admin: me })) },
  mute: {
    post: true,
    fn: async (q, b, me) => {
      const hours = int(b.hours, 0, 24 * 365, 24);
      const until = hours ? new Date(Date.now() + hours * 3600e3).toISOString() : null;
      return ok(await rpc('admin_mute', { p_id: uuid(b.id), p_until: until, p_admin: me, p_reason: text(b.reason, 200) }));
    },
  },
  ban: {
    post: true,
    fn: async (q, b, me) => {
      const id = uuid(b.id);
      const p = await playerName(id);
      need(!p.is_bot, 'bot tidak perlu di-ban');
      const days = b.days === 'perm' ? 36500 : int(b.days, 0, 36500, 0);
      // ban login di Supabase Auth dulu; cermin di players supaya hilang dari papan event
      await sb('/auth/v1/admin/users/' + id, { method: 'PUT', body: { ban_duration: days ? days * 24 + 'h' : 'none' } });
      const until = days ? new Date(Date.now() + days * 86400e3).toISOString() : null;
      return ok(await rpc('admin_ban', { p_id: id, p_until: until, p_admin: me, p_reason: text(b.reason, 200) }));
    },
  },
  delete: {
    post: true,
    fn: async (q, b, me) => {
      const id = uuid(b.id);
      const p = await playerName(id);
      need(String(b.confirm || '') === p.player_name, 'ketik nama pemain persis untuk konfirmasi');
      return ok(await rpc('admin_delete_account', { p_id: id, p_admin: me, p_reason: text(b.reason, 200) }));
    },
  },
  reports: { fn: async q => rpc('admin_reports', { p_open: q.all !== '1', p_limit: 300 }) },
  report: { post: true, fn: async (q, b, me) => ok(await rpc('admin_report_handle', { p_id: int(b.id, 1, Number.MAX_SAFE_INTEGER), p_handled: b.handled !== false, p_admin: me })) },
  chat: { fn: async () => rpc('admin_chat', { p_limit: 300 }) },
  'chat-delete': { post: true, fn: async (q, b, me) => ok(await rpc('admin_chat_delete', { p_id: int(b.id, 1, Number.MAX_SAFE_INTEGER), p_admin: me })) },
  event: { fn: async q => rpc('admin_event', { p_event: q.id ? text(q.id, 60) : null }) },
  cron: { post: true, fn: async (q, b, me) => runDaily(me) },
  economy: { fn: async () => rpc('admin_economy') },
  bots: { fn: async () => rpc('admin_bots') },
  // ---- chat bot (v23) ----
  botchat: { fn: async () => rpc('admin_botchat') },
  'botchat-config': {
    post: true,
    fn: async (q, b, me) => {
      const p = {};
      if (b.enabled !== undefined) p.enabled = !!b.enabled;
      if (b.daily_count !== undefined && b.daily_count !== '') p.daily_count = int(b.daily_count, 0, 5000);
      if (b.quiet_real !== undefined && b.quiet_real !== '') p.quiet_real = int(b.quiet_real, 0, 100000);
      if (b.busy_skip !== undefined && b.busy_skip !== '') { const n = Number(b.busy_skip); need(Number.isFinite(n) && n >= 0 && n <= 1, 'busy_skip harus 0–1'); p.busy_skip = n; }
      if (b.bands !== undefined) { need(Array.isArray(b.bands) && b.bands.length === 24, 'bands harus 24 angka'); p.bands = b.bands.map(x => { const n = Number(x); need(Number.isFinite(n) && n >= 0, 'bands angka ≥ 0'); return n; }); }
      return ok(await rpc('admin_botchat_config', { p, p_admin: me }));
    },
  },
  'botchat-lines': { fn: async q => rpc('admin_botchat_lines', { p_q: text(q.q, 80), p_lang: text(q.lang, 4), p_category: text(q.category, 40), p_active: text(q.active, 8), p_limit: int(q.limit, 1, 2000, 300) }) },
  'botchat-line-save': {
    post: true,
    fn: async (q, b, me) => ok(await rpc('admin_botchat_line_save', { p: { id: b.id || null, body: text(b.body, 200), category: text(b.category || 'ambient', 40), lang: text(b.lang || 'en', 4), active: b.active }, p_admin: me })),
  },
  'botchat-lines-import': { post: true, fn: async (q, b, me) => { need(Array.isArray(b.lines), 'lines harus array'); return ok(await rpc('admin_botchat_lines_import', { p: b.lines.slice(0, 5000), p_admin: me })); } },
  'botchat-schedule': { fn: async q => rpc('admin_botchat_schedule', { p_day: q.day ? text(q.day, 10) : null, p_limit: int(q.limit, 1, 2000, 500) }) },
  'botchat-delete': { post: true, fn: async (q, b, me) => ok(await rpc('admin_botchat_delete', { p: { scope: text(b.scope, 16), id: b.id || null }, p_admin: me })) },
  'botchat-send-now': { post: true, fn: async (q, b, me) => ok(await rpc('admin_botchat_send_now', { p: { bot_id: b.bot_id || null, body: text(b.body, 200) }, p_admin: me })) },
  'mail-preview': { post: true, fn: async (q, b) => rpc('admin_mail_preview', { p_target: targetOf(b.target) }) },
  'mail-send': { post: true, fn: async (q, b, me) => ok(await rpc('admin_mail_send', { p: campaign(b), p_admin: me })) },
  'mail-campaigns': { fn: async () => rpc('admin_mail_campaigns', { p_limit: 200 }) },
  'mail-revoke': { post: true, fn: async (q, b, me) => ok(await rpc('admin_mail_revoke', { p_id: int(b.id, 1, Number.MAX_SAFE_INTEGER), p_admin: me })) },
  templates: { fn: async () => rpc('admin_templates') },
  'template-save': {
    post: true,
    fn: async (q, b, me) => ok(await rpc('admin_template_save', { p: { name: text(b.name, 60), kind: text(b.kind || 'gift', 20), title: text(b.title, 80),
      body: text(b.body, 1000), items: Array.isArray(b.items) ? b.items.slice(0, 12) : [] }, p_admin: me })),
  },
  'template-delete': { post: true, fn: async (q, b, me) => ok(await rpc('admin_template_delete', { p_id: int(b.id, 1, Number.MAX_SAFE_INTEGER), p_admin: me })) },
  codes: { fn: async () => rpc('admin_codes', { p_limit: 300 }) },
  'code-create': {
    post: true,
    fn: async (q, b, me) => ok(await rpc('admin_code_create', { p: { code: text(b.code, 40), title: text(b.title, 80), body: text(b.body, 1000),
      items: Array.isArray(b.items) ? b.items.slice(0, 12) : [], max_uses: b.max_uses ? int(b.max_uses, 1, 10000000) : null,
      starts_at: iso(b.starts_at), ends_at: iso(b.ends_at) }, p_admin: me })),
  },
  'code-revoke': { post: true, fn: async (q, b, me) => ok(await rpc('admin_code_revoke', { p_code: text(b.code, 40).toUpperCase(), p_admin: me })) },
  log: {
    fn: async q => {
      let path = `/rest/v1/admin_log?select=*&order=at.desc&limit=${int(q.limit, 1, 500, 200)}`;
      if (q.action) path += '&action=eq.' + encodeURIComponent(text(q.action, 40));
      if (q.target) path += '&target=eq.' + encodeURIComponent(text(q.target, 80));
      return (await sb(path)).data;
    },
  },
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } }
  if (req.method !== 'POST' || typeof req.on !== 'function') return {};
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!configured() || !admins().length) return res.status(503).json({ error: 'Admin belum disetel (ADMIN_EMAILS / Supabase).' });
  if (req.headers['x-dragen-admin'] !== '1') return res.status(403).json({ error: 'forbidden' });
  if (req.method === 'POST' && req.headers.origin) {
    let host = '';
    try { host = new URL(req.headers.origin).host; } catch (e) { /* asal rusak */ }
    if (host !== req.headers.host) return res.status(403).json({ error: 'forbidden' });
  }
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const a = String(q.a || '');
  try {
    const b = await readBody(req);
    if (a === 'login') { if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' }); return res.status(200).json(await login(req, res, b)); }
    if (a === 'logout') return res.status(200).json(await logout(req, res));
    const me = await session(req, res);
    if (!me) { clearSession(res); return res.status(401).json({ error: 'Silakan login.' }); }
    const h = H[a];
    if (!h) return res.status(404).json({ error: 'aksi tidak dikenal' });
    if (h.post && req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    return res.status(200).json(await h.fn(q, b, me));
  } catch (e) {
    if (e instanceof Bad) return res.status(e.code).json({ error: e.message });
    console.error('[admin]', a, e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
};

module.exports.H = H; // untuk uji
