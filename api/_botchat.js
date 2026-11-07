// Penjadwal chat bot global ("versi C", skema v23). Murni (tanpa jaringan) supaya bisa diuji: tools/uji-bot-chat.js.
// Cron harian menyusun jadwal 24 jam ke depan: tiap pesan jam acak (ritme WIB lewat bands), hanya bot yang SEDANG ONLINE menurut
// jadwal sesi BotKeeper yang bicara, bahasa mengikuti zona bot. Hasil ditulis ke bot_chat_schedule (bot_chat_plan_write); pesan
// dikeluarkan ke global_chat saat global_chat_list dipanggil (fungsi SQL bot_chat_release). Deterministik per tanggal → cron dua kali
// tidak menggandakan (idempoten lewat (day, slot)); cron terlewat dikejar (slot yang > 6 jam lewat dibuang saat rilis).
const { h } = require('./_bots'); // FNV-1a 0..1 untuk penjadwalan (sama seperti level event bot)

const DAY = 86400;
const DEFAULT_BANDS = [4, 4, 5, 5, 5, 5, 5, 4, 4, 5, 6, 7, 9, 10, 10, 9, 7, 5, 2, 1, 1, 1, 2, 3]; // bobot per jam UTC (ritme WIB)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- hash BotKeeper (splitmix64) — PORT PERSIS dari Assets/Naga/Scripts/Online/BotKeeper.cs pakai BigInt ----------
const M64 = (1n << 64n) - 1n;
function mix(z) {
  z = (z + 0x9E3779B97F4A7C15n) & M64;
  z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & M64;
  z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & M64;
  return (z ^ (z >> 31n)) & M64;
}
// Hash01(int seed, long a, long b=0, long c=0) di C#: (Mix((ulong)(uint)seed ^ Mix((ulong)a ^ Mix((ulong)b*31 + (ulong)c))) >> 11) * 2^-53
function hash01(seed, a, b = 0, c = 0) {
  const s = BigInt.asUintN(32, BigInt(seed));
  const A = BigInt.asUintN(64, BigInt(a));
  const B = BigInt.asUintN(64, BigInt(b));
  const C = BigInt.asUintN(64, BigInt(c));
  const hh = mix((s ^ mix((A ^ mix((B * 31n + C) & M64)) & M64)) & M64);
  return Number(hh >> 11n) * (1 / 9007199254740992); // 2^53
}

// ---------- profil & jadwal sesi (sama seperti BotKeeper.Sessions/Online) ----------
function profile(b) {
  const aw = b.bot_awake && b.bot_awake > 0 ? b.bot_awake : 14;
  return {
    id: b.player_id, seed: b.bot_seed | 0, kind: b.bot_kind || 'steady',
    since: b.bot_since ? Math.floor(Date.parse(b.bot_since) / 1000) : 0,
    wake: ((((b.bot_wake == null ? 12 : b.bot_wake) % 24) + 24) % 24), awake: clamp(aw, 6, 20),
    quit: b.bot_quit == null ? -1 : b.bot_quit,
  };
}
const sessionsPerDay = k => (k === 'casual' ? 2 : k === 'eager' ? 5 : k === 'fighter' ? 4 : 3);
const skipDay = k => (k === 'casual' ? .22 : k === 'eager' ? .03 : .1);
const quitAt = p => (p.quit >= 0 ? p.since + p.quit * DAY : Infinity);

// sesi hari UTC ke-d: [start, end] (detik). Bisa melewati tengah malam; jendela ≤ 20 jam jadi tidak bertumpuk hari berikutnya.
function sessions(p, d) {
  const out = [];
  if (hash01(p.seed, d, 77) < skipDay(p.kind)) return out;
  const win = d * DAY + p.wake * 3600, len = p.awake * 3600, qa = quitAt(p), k = sessionsPerDay(p.kind);
  for (let i = 0; i < k; i++) {
    const start = win + Math.floor(len * (i + .1 + .7 * hash01(p.seed, d, i)) / k);
    const end = start + Math.floor(60 * (12 + 28 * hash01(p.seed, d, i + 50)));
    if (start >= p.since && end <= qa) out.push([start, end]);
  }
  return out;
}

// apakah bot online pada detik t (sesi terakhir yang mulai ≤ t masih berjalan) — sama seperti BotKeeper.Online
function onlineAt(p, t) {
  const dNow = Math.floor(t / DAY), first = Math.max(Math.floor(p.since / DAY) - 1, dNow - 60);
  for (let d = dNow; d >= first; d--) {
    const list = sessions(p, d);
    for (let n = list.length - 1; n >= 0; n--) {
      const [s, e] = list[n];
      if (s > t) continue;
      return e > t;
    }
  }
  return false;
}

// selang online yang bersinggungan dengan hari [dayStart, dayStart+DAY) (sesi hari ini & kemarin yang melar)
function dayIntervals(p, dayStart) {
  const dNow = Math.floor(dayStart / DAY), res = [];
  for (const d of [dNow - 1, dNow]) for (const iv of sessions(p, d)) if (iv[1] > dayStart && iv[0] < dayStart + DAY) res.push(iv);
  return res;
}

// ---------- penjadwal: jadwal 24 jam untuk hari UTC `now` ----------
// bots: [{player_id, bot_seed, bot_kind, bot_since, bot_quit, bot_wake, bot_awake}]
// lines: [{id, body, lang, needs}] (aktif saja); cfg: {enabled, daily_count, bands}; eventRunning: bool
function planSchedule(bots, lines, cfg, eventRunning, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000);
  const dayStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
  const dateStr = new Date(dayStart * 1000).toISOString().slice(0, 10);
  const bands = Array.isArray(cfg.bands) && cfg.bands.length === 24 ? cfg.bands.map(Number) : DEFAULT_BANDS;
  const sum = bands.reduce((a, b) => a + b, 0) || 1;
  const total = Math.max(0, cfg.daily_count | 0);
  const usable = lines.filter(l => eventRunning || !(l.needs || []).includes('event')); // {{event}} hanya saat event jalan
  const en = usable.filter(l => l.lang === 'en'), idL = usable.filter(l => l.lang === 'id');

  const active = [];
  for (const b of bots) { const p = profile(b); const iv = dayIntervals(p, dayStart); if (iv.length) active.push({ b, p, iv }); }

  const rows = [];
  let slot = 0;
  for (let hr = 0; hr < 24; hr++) {
    const n = Math.round(total * bands[hr] / sum);
    for (let j = 0; j < n; j++) {
      slot++;
      const T = dayStart + hr * 3600 + Math.floor(h(dateStr, slot, 't') * 3600); // detik acak dalam jamnya
      if (T <= nowSec - 6 * 3600) continue;                                       // sudah lewat jendela rilis 6 jam → percuma
      const online = active.filter(x => x.iv.some(iv => T >= iv[0] && T < iv[1]));
      if (!online.length) continue;                                               // tidak ada bot online (jam sepi) → lewati
      const pick = online[Math.floor(h(dateStr, slot, 'bot') * online.length) % online.length];
      const isWIB = pick.p.wake === 23 || pick.p.wake <= 2;                        // zona WIB (bangun 23–02 UTC) → sebagian bahasa Indonesia
      const wantId = isWIB && idL.length > 0 && h(dateStr, slot, 'lang') < 0.4;
      const pool = wantId ? idL : (en.length ? en : idL);
      if (!pool.length) continue;
      const line = pool[Math.floor(h(dateStr, slot, 'line') * pool.length) % pool.length];
      rows.push({ bot_id: pick.b.player_id, line_id: line.id, body: line.body, scheduled_at: new Date(T * 1000).toISOString(), slot });
    }
  }
  return { day: dateStr, rows };
}

module.exports = { DEFAULT_BANDS, hash01, sessions, onlineAt, dayIntervals, profile, planSchedule };
