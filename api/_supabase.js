// Akses Supabase dari server website (fungsi Vercel). Kunci rahasia (service_role / sb_secret_…) HANYA di env Vercel:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Tidak pernah di repo, browser, atau game. Berkas berawalan "_" bukan rute API.
const URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const configured = () => !!(URL && KEY);

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...headers };
  if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY; // kunci service_role lama (JWT); sb_secret_… cukup di apikey
  const r = await fetch(URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]} ${r.status}: ${String(typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 200)}`);
  return { data, headers: r.headers };
}

// event Menara Event yang sedang berjalan menurut tabel public.events (skema v14)
async function currentEvent(now = new Date()) {
  const t = encodeURIComponent(now.toISOString());
  const { data } = await sb(`/rest/v1/events?select=id,starts,ends&starts=lte.${t}&ends=gt.${t}&limit=1`);
  return (data && data[0]) || null;
}

module.exports = { configured, sb, currentEvent };
