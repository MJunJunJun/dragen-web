// Stage 3v3 terbaik pemain bot (pengguna 13 Nov: "kalau bot tiap hari naik otomatis [dihitung di game] nanti ngga kerekam di server …
// buat kayak peringkat di event untuk cron-nya, jadi sistemnya sama, tapi sesuaikan karena semakin lama semakin sulit untuk naik").
// Sama seperti level event (api/_bots.js): murni & deterministik dari hash (bot, hari) → cron yang terpanggil dua kali tidak menaikkan
// dua kali, hari yang terlewat dikejar besok. Hasilnya ditulis ke players.best_3v3 lewat bot_stage_tick (skema v29), jadi papan
// peringkat stage, kartu profil bot di game, dan website membaca angka yang SAMA dari server.
// Tiap hari main bot naik `gain` stage × 30 / (stage + 30): cepat di awal, makin lama makin sulit (seperti stage 3v3 pemain asli
// yang makin berat), tidak melampaui batas jenisnya dan paling banyak MAX_DAY stage sehari.
const { h } = require('./_bots');

const DAY = 86400000, MAX_DAY = 8, SOFT = 30;

// gain: stage per hari main di awal (sebelum melambat) · skip: peluang tidak main sehari · cap: stage tertinggi jenis ini
const KINDS = {
  eager:     { gain: [2.4, 3.6], skip: .08, cap: [100, 120] },
  fighter:   { gain: [2.6, 3.8], skip: .1,  cap: [105, 125] },
  steady:    { gain: [1.7, 2.7], skip: .18, cap: [75, 95] },
  collector: { gain: [1.2, 2.0], skip: .22, cap: [55, 75] },
  farmer:    { gain: [0.9, 1.6], skip: .28, cap: [45, 60] },
  casual:    { gain: [0.7, 1.3], skip: .38, cap: [28, 40] },
  quit:      { gain: [0.9, 1.6], skip: .42, cap: [25, 35] },
};

// stage terbaik bot saat `now` (bilangan bulat ≥ 0)
function botStage(bot, now) {
  const k = KINDS[bot.bot_kind] || KINDS.steady, seed = bot.bot_seed | 0;
  const since = bot.bot_since ? Date.parse(bot.bot_since) : NaN;
  if (!Number.isFinite(since)) return 0;
  const t = now.getTime();
  const quitAt = bot.bot_quit == null || bot.bot_quit < 0 ? Infinity : since + bot.bot_quit * DAY;
  const cap = Math.round(k.cap[0] + h(seed, 'stage', 'cap') * (k.cap[1] - k.cap[0]));
  const base = k.gain[0] + h(seed, 'stage', 'pace') * (k.gain[1] - k.gain[0]);
  let stage = 0;
  // hari main ke-d sejak bot mulai (jam mainnya di tengah hari itu); hanya hari yang sudah lewat seluruhnya ikut dihitung
  for (let d = 0; ; d++) {
    const play = since + d * DAY + DAY / 2;
    if (play > t || play > quitAt || stage >= cap) break;
    if (h(seed, 'stage', d, 'skip') < k.skip) continue;
    const g = base * (.6 + .8 * h(seed, 'stage', d, 'gain')) * SOFT / (stage + SOFT);
    stage = Math.min(cap, stage + Math.min(MAX_DAY, g));
  }
  return Math.floor(stage);
}

// baris untuk bot_stage_tick (hanya bot yang sudah punya stage)
function planStageRows(bots, now) {
  const rows = [];
  for (const b of bots) {
    const s = botStage(b, now);
    if (s > 0) rows.push({ player_id: b.player_id, stage: s });
  }
  return rows;
}

module.exports = { KINDS, MAX_DAY, SOFT, botStage, planStageRows };
