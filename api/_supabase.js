// Akses Supabase dari server website (fungsi Vercel). Kunci rahasia (service_role / sb_secret_…) HANYA di env Vercel:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Tidak pernah di repo, browser, atau game. Berkas berawalan "_" bukan rute API.
const URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const configured = () => !!(URL && KEY);

// raw: jangan lempar galat untuk status bukan 2xx (dipakai login admin untuk membaca status Auth)
async function sb(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...headers };
  // kunci service_role lama (JWT) juga dikirim di Authorization, kecuali panggilan membawa token pengguna (Auth /user, /logout)
  if (KEY.startsWith('eyJ') && !h.Authorization) h.Authorization = 'Bearer ' + KEY;
  const r = await fetch(URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (raw) return { status: r.status, data, headers: r.headers };
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]} ${r.status}: ${String(typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 200)}`);
  return { data, headers: r.headers };
}

// panggil fungsi SQL (PostgREST /rpc)
async function rpc(fn, args = {}) {
  const { data } = await sb('/rest/v1/rpc/' + fn, { method: 'POST', body: args });
  return data;
}

// event Menara Event yang sedang berjalan menurut tabel public.events (skema v14)
async function currentEvent(now = new Date()) {
  const t = encodeURIComponent(now.toISOString());
  const { data } = await sb(`/rest/v1/events?select=id,starts,ends&starts=lte.${t}&ends=gt.${t}&limit=1`);
  return (data && data[0]) || null;
}

module.exports = { configured, sb, rpc, currentEvent };
