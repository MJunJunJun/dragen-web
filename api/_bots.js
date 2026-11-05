// Level Menara Event pemain bot (pengguna 5 Nov: "peringkat leaderboard tiap hari berubah … progresnya dirandom … bot tetep ikut
// rebut hadiah"). Murni (tanpa jaringan) supaya bisa diuji: tools/uji-bot-event.js.
// Acaknya dari hash (bot, event, hari), jadi hasil satu hari selalu sama: cron yang terpanggil dua kali tidak menaikkan dua kali,
// cron yang terlewat dikejar keesokan harinya. Tiap hari tiap bot bisa libur, naik sedikit/banyak, dan jam mainnya beda → urutan
// peringkat berubah tiap hari. Naik paling banyak MAX_DAY (5) level sehari = batas pemain asli (6 Nov: maks 5 main sehari, 3 gratis +
// 2 beli, satu level per kemenangan). Batas server (bot_event_tick, skema v21): 10 × hari event, level tidak pernah turun.
const DAY = 86400000, HOUR = 3600000, MAX_DAY = 5;

// ikut: peluang ikut event ini · libur: peluang tidak main sehari · naik: level per hari main (maks MAX_DAY = batas harian pemain asli)
// · batas: level tertinggi yang sanggup dicapai timnya di event ini (makin dekat batas makin lambat)
// Bisa dikejar (pengguna 5 Nov: bot ikut rebut hadiah): bot terkuat ±3–4 level sehari dan berhenti di Lv 45–80, jadi pemain asli
// yang rajin (maks 5 sehari) bisa menyalip. Naikkan angka di sini untuk papan yang lebih sulit.
const KINDS = {
  eager:     { join: .85, skip: .08, gain: [3, 5], cap: [45, 80] },
  fighter:   { join: .85, skip: .1,  gain: [2, 5], cap: [40, 75] },
  steady:    { join: .7,  skip: .18, gain: [2, 4], cap: [25, 55] },
  collector: { join: .6,  skip: .22, gain: [1, 3], cap: [15, 40] },
  farmer:    { join: .5,  skip: .28, gain: [1, 3], cap: [10, 30] },
  casual:    { join: .45, skip: .38, gain: [1, 2], cap: [5, 20] },
  quit:      { join: .35, skip: .42, gain: [1, 2], cap: [3, 15] },
};

// 0..1 dari bagian-bagian kunci (FNV-1a 32 bit + pengaduk)
function h(...parts) {
  let x = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  x ^= x >>> 16; x = Math.imul(x, 2246822507); x ^= x >>> 13; x = Math.imul(x, 3266489909); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// level event bot saat `now`, atau null bila bot tidak ikut / belum naik level
function botLevel(bot, ev, now) {
  const k = KINDS[bot.bot_kind] || KINDS.steady, seed = bot.bot_seed | 0, id = ev.id;
  if (h(seed, id, 'join') >= k.join) return null;
  const start = Date.parse(ev.starts), end = Date.parse(ev.ends), t = now.getTime();
  const since = bot.bot_since ? Date.parse(bot.bot_since) : -Infinity;
  const quitAt = bot.bot_quit == null ? Infinity : since + bot.bot_quit * DAY;
  const cap = Math.round(k.cap[0] + h(seed, id, 'cap') * (k.cap[1] - k.cap[0]));
  const wake = (((bot.bot_wake ?? 12) % 24) + 24) % 24, awake = clamp(bot.bot_awake || 14, 6, 20);
  let level = 0, at = 0;
  for (let d = Math.floor(h(seed, id, 'first') * 5); ; d++) { // mulai ikut 0–4 hari sesudah event dibuka
    // jam main hari itu saat bot terjaga, dikunci di dalam hari UTC-nya (02:00–23:00): cron 00:10 UTC di paket Hobby bisa molor
    // sampai 01:10 (jendela 1 jam), jadi tiap jalan tetap menghitung tepat satu hari → naik paling banyak MAX_DAY per hari seperti pemain asli
    const play = start + d * DAY + (2 + (wake + h(seed, id, d, 'hour') * awake) % 21) * HOUR;
    if (play > t || play >= end || play > quitAt) break;
    if (play < since || level >= cap || h(seed, id, d, 'skip') < k.skip) continue;
    const gain = k.gain[0] + Math.floor(h(seed, id, d, 'gain') * (k.gain[1] - k.gain[0] + 1));
    level = Math.min(cap, level + clamp(Math.round(gain * Math.pow(1 - level / cap, .6)), 1, MAX_DAY));
    at = play;
  }
  return level > 0 ? { level, reached_at: new Date(at).toISOString() } : null;
}

// baris untuk bot_event_tick
function planRows(bots, ev, now) {
  const rows = [];
  for (const b of bots) {
    const r = botLevel(b, ev, now);
    if (r) rows.push({ player_id: b.player_id, level: r.level, reached_at: r.reached_at });
  }
  return rows;
}

module.exports = { KINDS, MAX_DAY, h, botLevel, planRows };
