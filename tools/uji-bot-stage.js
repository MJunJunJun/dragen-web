// Uji stage 3v3 bot (api/_botstage.js, skema v29) tanpa jaringan:
//   node tools/uji-bot-stage.js [berkas-balasan-stage_board.json]
// Tanpa berkas: 1000 bot buatan. Dengan berkas (balasan stage_board v28 berisi "bots"): data bot asli.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { botStage, planStageRows, KINDS, MAX_DAY } = require('../api/_botstage');

const DAY = 86400000;
let bots;
if (process.argv[2]) {
  const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  bots = r.bots.map((b, i) => ({ player_id: 'b' + i, player_name: b.name, bot_kind: b.bot_kind, bot_seed: b.bot_seed,
    bot_since: new Date(b.bot_since * 1000).toISOString(), bot_quit: b.bot_quit < 0 ? null : b.bot_quit }));
} else {
  const kinds = Object.keys(KINDS);
  bots = Array.from({ length: 1000 }, (_, i) => ({ player_id: 'b' + i, bot_kind: kinds[i % kinds.length], bot_seed: 1000 + i * 7919,
    bot_since: new Date(Date.parse('2026-06-20T00:00:00Z') + (i % 140) * DAY).toISOString(), bot_quit: kinds[i % kinds.length] === 'quit' ? 20 + (i % 30) : null }));
}
const now = new Date('2026-11-14T00:30:00Z');
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('PASS ' + name); };

ok('deterministik: cron dua kali = hasil sama', () => assert.deepEqual(planStageRows(bots, now), planStageRows(bots, now)));

ok('tidak pernah turun, naik ≤ ' + MAX_DAY + ' per hari, ≤ batas jenis', () => {
  for (const b of bots.slice(0, 300)) {
    let prev = 0;
    const cap = KINDS[b.bot_kind] ? KINDS[b.bot_kind].cap[1] : KINDS.steady.cap[1];
    for (let d = 0; d <= 200; d++) {
      const s = botStage(b, new Date(Date.parse(b.bot_since) + d * DAY + 60000));
      assert.ok(s >= prev, `${b.player_id} turun di hari ${d}`);
      assert.ok(s - prev <= MAX_DAY, `${b.player_id} naik ${s - prev} di hari ${d}`);
      assert.ok(s <= cap, `${b.player_id} melampaui batas ${cap}`);
      prev = s;
    }
  }
});

ok('makin tinggi makin lambat: 30 hari pertama naik lebih banyak dari 30 hari ke-4', () => {
  let early = 0, late = 0;
  for (const b of bots.slice(0, 300)) {
    const t0 = Date.parse(b.bot_since);
    const at = d => botStage({ ...b, bot_quit: null }, new Date(t0 + d * DAY + 60000));
    early += at(30) - at(0); late += at(120) - at(90);
  }
  assert.ok(early > late * 2, `awal ${early} vs akhir ${late}`);
});

const st = bots.map(b => botStage(b, now)).sort((a, b) => b - a);
const q = p => st[Math.floor(p * (st.length - 1))];
console.log(`sebaran stage ${now.toISOString().slice(0, 10)}: #1 ${st[0]}, #10 ${st[9]}, #50 ${st[49]}, median ${q(.5)}, berstage ${st.filter(x => x > 0).length}/${st.length}`);
for (const k of Object.keys(KINDS)) {
  const v = bots.filter(b => b.bot_kind === k).map(b => botStage(b, now));
  if (v.length) console.log(`  ${k.padEnd(9)} n=${String(v.length).padStart(3)} maks ${Math.max(...v)} rata ${Math.round(v.reduce((a, c) => a + c, 0) / v.length)}`);
}
console.log(`\n${pass} PASS`);
