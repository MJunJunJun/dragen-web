// Membuat kumpulan kalimat chat bot (±1.300) untuk skema v23 → assets/botchat-lines.json.
//   node tools/bikin-kalimat-bot.js
// Aturan: suasana saja (sapaan, pamer, komentar event, pertanyaan santai, reaksi). TIDAK membalas/menyebut pemain asli, tidak menawar/
// tukar naga, tidak minta data pribadi, tidak @mention, tidak di luar game. ≤ 200 huruf, tanpa < >, dan TIDAK ada kalimat yang hanya
// berisi token (game mengisi {{best}} {{bestRarity}} {{bestLevel}} {{dragons}} {{stage}} {{event}}; {{event}} hanya saat event jalan).
// Kategori dijaga seimbang supaya chat tidak kebanyakan pamer.
const fs = require('node:fs');
const path = require('node:path');

const out = [];
const add = (body, category, lang) => out.push({ body: body.replace(/\s+/g, ' ').replace(/\s+([!?.,])/g, '$1').trim(), category, lang });
const addAll = (list, category, lang) => list.forEach(b => add(b, category, lang));
function combine(parts, category, lang) { // produk kartesian digabung spasi; bagian '' dilewati
  const walk = (i, acc) => { if (i === parts.length) { add(acc.join(' '), category, lang); return; } for (const p of parts[i]) walk(i + 1, p === '' ? acc : [...acc, p]); };
  walk(0, []);
}
const AMB_END_EN = ['', '', '', '!', ' lol', ' haha', ' ngl', ' fr'], AMB_END_ID = ['', '', '', '!', ' dong', ' sih', ' nih', ' banget', ' wkwk'];
const REACT_END_EN = ['', '', '!', ' lol'], REACT_END_ID = ['', '', '!', ' dong'];
const GREET_END = ['', '', '!'];
const BRAG_END_EN = ['', '', '!', ' lets go'], BRAG_END_ID = ['', '', '!', ' dong'];
const EV_END_EN = ['', '', '', 'honestly'], EV_END_ID = ['', '', '', 'euy'];

// ---------- REAKSI ----------
combine([['gg', 'gg wp', 'gg everyone', 'nice', 'nice one', 'nice play', 'well played', 'clean', 'so clean', 'respect', 'big respect', 'lol',
  'lmao', 'haha nice', 'oof', 'close one', 'phew', 'finally', 'yesss', 'woo', 'hype', 'that was wild', 'insane run', 'no way', 'sheesh',
  'that is fire', 'big W', 'huge W', 'too easy', 'ez clap', 'clutch', 'goated', 'love to see it', 'beautiful', 'smooth', 'crisp',
  'legendary', 'absolute cinema', 'gigachad energy', 'W gamer'], REACT_END_EN], 'reaction', 'en');
combine([['gg', 'gg dong', 'gg semua', 'mantap', 'mantul', 'mantap jiwa', 'keren', 'keren sih', 'keren parah', 'gila', 'gila sih', 'njir',
  'anjay', 'wkwk', 'santuy', 'gokil', 'gokil abis', 'parah', 'kece', 'top', 'top markotop', 'jozz', 'sadis', 'ngeri', 'ngeri sih', 'wih',
  'waw', 'asik', 'lanjutkan', 'semangat', 'gas', 'gasss', 'pro player', 'jago', 'jago sih', 'auto menang', 'aman', 'cakep', 'sip', 'nice euy'], REACT_END_ID], 'reaction', 'id');

// ---------- SAPAAN ----------
combine([['morning', 'good morning', 'afternoon', 'evening', 'gm', 'hey', 'hello', 'yo', 'sup', 'hi'], ['everyone', 'all', 'folks', 'friends', 'guys', 'dragon tamers', ''], GREET_END], 'greeting', 'en');
addAll(['anyone online?', 'who is playing right now?', 'back again lol', 'just logged in', 'finally online', 'long day, time to chill with dragons',
  'how is everyone doing?', 'hope you all had a good day', 'ready to breed some dragons', 'another day another dragon', 'stopping by to say hi',
  'good to be back', 'missed my dragons today', 'logging in for the daily', 'quick session before bed', 'early morning grind lets go',
  'whats good everyone', 'here for the dailies', 'just checking on my ranch', 'home from work, dragon time'], 'greeting', 'en');
combine([['pagi', 'selamat pagi', 'siang', 'sore', 'malam', 'halo', 'hai', 'woi'], ['semua', 'semuanya', 'gaes', 'guys', 'teman-teman', 'para peternak naga', ''], GREET_END], 'greeting', 'id');
addAll(['ada yang online?', 'lagi pada main ya?', 'baru login nih', 'balik lagi main naga', 'gimana kabar semuanya?', 'semoga harinya lancar ya',
  'siap ternak naga hari ini', 'absen dulu ah', 'mampir sebentar', 'main bentar sebelum tidur', 'ngejar login harian dulu', 'kangen naga-naga ku',
  'hari baru, naga baru', 'nyantai dulu di pulau', 'grind pagi-pagi, gas', 'apa kabar gaes', 'ngecek kandang dulu', 'pulang kerja, waktunya naga',
  'login buat hadiah harian', 'halo yang lagi online'], 'greeting', 'id');

// ---------- PAMER (token) ----------
combine([['my {{best}}', 'my strongest dragon', 'my {{bestRarity}} {{best}}', '{{best}}'],
  ['just hit', 'finally reached', 'is now at', 'leveled up to', 'climbed to'], ['Lv {{bestLevel}}', 'level {{bestLevel}}'], BRAG_END_EN], 'brag', 'en');
addAll(['{{dragons}} dragons in my ranch now', 'just got my {{dragons}}th dragon', 'my collection hit {{dragons}} dragons', 'cleared stage {{stage}} today',
  'best stage so far is {{stage}}', 'pushed all the way to stage {{stage}}', 'finally pulled a {{bestRarity}} one', 'that {{bestRarity}} pull was so worth it',
  '{{best}} is carrying my whole team', 'my team around {{best}} is unreal', 'proud of my {{best}} ngl', 'ranch is up to {{dragons}} dragons and growing',
  'grinding paid off, stage {{stage}} done', 'my {{bestRarity}} dragon is a beast', 'slowly building my {{dragons}} dragon army'], 'brag', 'en');
combine([['naga {{best}} ku', 'naga terkuatku', 'si {{best}}', '{{best}} ku'], ['udah', 'akhirnya', 'sekarang', 'naik ke', 'tembus'], ['Lv {{bestLevel}}', 'level {{bestLevel}}'], BRAG_END_ID], 'brag', 'id');
addAll(['koleksi naga ku {{dragons}} ekor sekarang', 'baru dapet naga ke-{{dragons}}', 'kandangku udah {{dragons}} naga', 'stage terbaikku {{stage}} nih',
  'akhirnya tembus stage {{stage}}', 'dapet naga {{bestRarity}} tadi, hoki banget', 'naga {{bestRarity}} ku sangar banget', '{{best}} jadi andalan timku',
  'bangga sama {{best}} ku', 'naga ku makin banyak, udah {{dragons}}', 'grind ku kebayar, stage {{stage}} kelar', 'tim di sekitar {{best}} makin gila',
  'si {{best}} makin kuat di Lv {{bestLevel}}', 'pelan-pelan ngumpulin {{dragons}} naga'], 'brag', 'id');

// ---------- EVENT (butuh event; token {{event}}) ----------
combine([['grinding', 'pushing hard in', 'loving', 'enjoying', 'all in on'], ['{{event}}'], ['right now', 'today', 'all day', 'again', 'nonstop'], EV_END_EN], 'event', 'en');
addAll(['anyone else hyped for {{event}}?', 'the {{event}} rewards look amazing', 'almost done with {{event}}', '{{event}} grind never stops',
  '{{event}} is so much fun', 'how far are you all in {{event}}?', 'that {{event}} boss is tough', 'the {{event}} egg looks incredible',
  'climbing the {{event}} board slowly', 'one more push in {{event}} and im done', 'the {{event}} vibes are immaculate', 'saving up for the {{event}} shop'], 'event', 'en');
combine([['lagi grinding', 'ngejar', 'suka banget', 'nikmatin', 'fokus di'], ['{{event}}'], ['nih', 'hari ini', 'seharian', 'lagi', 'terus'], EV_END_ID], 'event', 'id');
addAll(['ada yang hype {{event}} juga?', 'rewards {{event}} mantap banget', 'dikit lagi kelar {{event}}', '{{event}} seru parah',
  'udah sampai mana di {{event}}?', 'bos {{event}} nya susah euy', 'telur {{event}} nya keren banget', 'lagi nanjak di papan {{event}}',
  'sekali push lagi di {{event}} kelar', 'nabung buat toko {{event}}', 'suasana {{event}} enak banget'], 'event', 'id');

// ---------- PERTANYAAN ----------
addAll(['what is everyone breeding today?', 'any tips for 3v3?', 'how do you get berries fast?', 'best element for PvP?', 'good farming layout anyone?',
  'which dragon should I evolve next?', 'best way to earn gold?', 'how many dragons do you all have?', 'favorite dragon so far?', 'any hidden tips i should know?',
  'whats the meta team right now?', 'how do you beat 5v5?', 'worth saving gold or spend it?', 'best habitat setup?', 'how often do you all log in?',
  'what element are you maining?', 'any good starter advice?', 'how do you get mythic eggs?', 'whats your daily routine here?', 'any fast way to level dragons?'], 'question', 'en');
addAll(['lagi ternak naga apa nih?', 'ada tips buat 3v3?', 'cara cepet dapet berry gimana?', 'elemen apa yang kuat buat PvP?', 'ada tips layout kebun?',
  'naga apa yang bagus dievolusi?', 'cara cepet dapet gold gimana?', 'kalian punya berapa naga?', 'naga favorit kalian apa?', 'ada tips tersembunyi ga?',
  'tim meta sekarang apa ya?', 'gimana cara ngalahin 5v5?', 'mending nabung gold atau pake?', 'setup habitat yang bagus gimana?', 'kalian sering login ga?',
  'lagi main elemen apa?', 'tips buat pemula dong', 'cara dapet telur mythic gimana?', 'rutinitas harian kalian apa?', 'cara cepet naikin level naga?'], 'question', 'id');

// ---------- SUASANA ----------
combine([['this game is', 'honestly this game is', 'ngl this game is'], ['so addicting', 'way too fun', 'super relaxing', 'really chill', 'so good'], AMB_END_EN], 'ambient', 'en');
addAll(['my island is finally looking good', 'breeding dragons is so relaxing', 'could play this all day', 'the music here is so chill', 'just vibing on my island',
  'love watching the dragons fly around', 'my ranch is getting crowded', 'need more habitat space already', 'the sunsets on my island hit different',
  'collecting gold feels so satisfying', 'my dragons are my whole personality now', 'time flies when youre raising dragons', 'this island is my happy place',
  'feeding dragons is weirdly calming', 'cant stop expanding my ranch', 'the little dragon animations are adorable', 'rainy day, perfect for dragon raising',
  'just reorganized my whole ranch', 'the baby dragons are too cute', 'might restart my island layout again'], 'ambient', 'en');
combine([['game ini', 'jujur game ini', 'serius game ini'], ['bikin nagih', 'seru banget', 'nyantai banget', 'adem banget', 'bagus banget'], AMB_END_ID], 'ambient', 'id');
addAll(['pulauku udah mulai rapi', 'ternak naga tuh nyantai banget', 'betah main ini seharian', 'musiknya adem banget', 'lagi santai di pulau',
  'suka liat naga-naga terbang', 'kandangku mulai penuh', 'butuh lahan habitat lagi', 'sunset di pulauku beda rasanya', 'ngumpulin gold tuh puas banget',
  'hidupku naga semua sekarang', 'ga kerasa waktu kalau ngurus naga', 'pulau ini tempat paling tenang', 'ngasih makan naga nenangin pikiran',
  'ga bisa berhenti ngembangin kandang', 'animasi naganya gemes banget', 'hujan-hujan enak ternak naga', 'baru rapihin layout kandang',
  'naga bayinya gemes banget', 'pengen rombak layout pulau lagi'], 'ambient', 'id');

// ---------- SANTUY (English chill / gamer slang; pengguna 7 Nov: "buat kalimat santuy versi inggris") ----------
addAll(["just vibing with my dragons tbh", "lowkey addicted to this game ngl", "no thoughts, just dragons", "could chill here all day fr",
  "this is my comfort game not gonna lie", "me and my dragons living our best life", "zero stress, just dragon vibes",
  "chillin on my island like always", "procrastinating by raising dragons again lol", "my island, my rules",
  "soft life: just me and the dragons", "nothing beats chilling on the island after a long day", "the dragon sounds are so relaxing ngl",
  "just here for the good vibes and dragons", "honestly this is peak relaxation", "dragon farming is lowkey my therapy",
  "slow day, just vibing and breeding", "forever chilling in dragon land", "touch grass? nah, feeding dragons lol",
  "rainy day energy, perfect for some dragon time", "brain off, dragons on", "living that cozy dragon rancher life",
  "my ranch is pure chaos but i love it", "in my little dragon bubble rn", "cozy gaming session, do not disturb lol"], 'ambient', 'en');
addAll(["yo yo gamers", "wassup everyone", "hey hey, back again", "guess who's back lol", "logging in for my daily dragon fix",
  "sup, just here to chill", "morning, barely awake but here for the dragons lol", "back on the grind, kinda",
  "hello hello, how we doing", "just popping in to vibe", "aight i'm here, let's chill", "evening dragon session, let's go"], 'greeting', 'en');
addAll(["lmaooo", "bruh moment", "sheeesh", "that's lowkey fire", "no cap, clean", "big mood", "based", "ez dub", "goes hard ngl",
  "iconic behavior", "not bad not bad", "ok that's actually sick", "vibes are immaculate rn", "W, respect", "haha that's gold",
  "oof rip lol", "lowkey impressive", "ayy nice one", "that's the spirit lol", "certified good moment", "ok ok i see you",
  "that's so clean it hurts", "peak gameplay honestly", "love that for you"], 'reaction', 'en');
addAll(["anyone else just vibing rn?", "what's everyone up to today?", "y'all still hooked on this too? lol", "how's everyone's island looking?",
  "who else can't stop playing lol", "what's your comfort dragon?", "anyone just chilling like me?", "what are we all grinding today?"], 'question', 'en');
addAll(["my {{best}} is lowkey cracked ngl", "not gonna lie, {{best}} is carrying lol", "{{dragons}} dragons and still going strong lol",
  "my {{best}} hits different at Lv {{bestLevel}} ngl"], 'brag', 'en');

// ---------- bersihkan: token-saja, panjang, karakter, token tak dikenal, duplikat ----------
const TOKENS = ['best', 'bestRarity', 'bestLevel', 'dragons', 'stage', 'event'];
const tokenOnly = b => b.replace(/\{\{\w+\}\}/g, '').replace(/[\s!.,?]/g, '').length === 0;
const seen = new Set();
const clean = out.filter(x => {
  const b = x.body;
  if (!b || b.length > 200 || /[<>]/.test(b) || tokenOnly(b)) return false;
  if ([...b.matchAll(/\{\{(\w+)\}\}/g)].some(m => !TOKENS.includes(m[1]))) return false;
  const key = x.lang + '|' + b.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const file = path.join(__dirname, '..', 'assets', 'botchat-lines.json');
fs.writeFileSync(file, JSON.stringify(clean, null, 0));
const by = k => clean.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {});
console.log(`${clean.length} kalimat → ${path.relative(path.join(__dirname, '..'), file)}`);
console.log('per bahasa:', JSON.stringify(by('lang')));
console.log('per kategori:', JSON.stringify(by('category')));
console.log('pakai token:', clean.filter(x => /\{\{/.test(x.body)).length);
console.log('contoh:\n  ' + clean.filter((_, i) => i % 160 === 0).map(x => `[${x.lang}/${x.category}] ${x.body}`).join('\n  '));
