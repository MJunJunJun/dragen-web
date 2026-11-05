# dragen-web

Website DraGen: https://dragen.arjuntech.id

| Halaman | Berkas |
| --- | --- |
| Landing page | `index.html` |
| Privacy policy | `privacy/index.html` |
| Halaman 404 | `404.html` |
| Gaya bersama | `assets/site.css` |
| Logo & foto | `assets/logo.svg`, `assets/img/` |
| Hero 3D (pulau, naga, burung, awan) | `assets/hero/` |
| Ekspor pulau dari Unity | `tools/unity-ekspor-pulau.cs` |
| Bagian Event (event berjalan, hadiah, toko, peringkat 1–100) | `assets/event/` |
| Fungsi server Vercel (Supabase) | `api/` |

## Event & leaderboard

- `assets/event/events.json`: kalender event, hadiah peringkat & toko event, dibangun dari kode game:
  `python -I tools/events-from-unity.py "F:/zzzz testing claude/unity/Dragon Dragon"` (jalankan ulang tiap kalender/hadiah berubah).
- `api/event.js` → `/api/event`: event yang sedang berjalan + peringkat 1–100 dari Supabase (nama & level saja), cache CDN 5 menit.
- `api/bot-event-daily.js` → Vercel Cron harian 00:10 UTC (07:10 WIB, `vercel.json`; paket Hobby bisa molor sampai 01:10, jadi jam main
  bot dikunci 02:00–23:00 UTC): level Menara Event semua pemain bot naik acak per
  jenis bot (`api/_bots.js`) lalu dikirim ke Supabase (`bot_event_tick`). Sekaligus aktivitas harian supaya Supabase Free tidak di-pause.
- Uji tanpa jaringan: `node tools/uji-bot-event.js`.

Setup sekali (dilakukan pemilik project, kunci tidak pernah masuk repo):
1. Supabase → SQL Editor: jalankan `Supabase/schema-v21-bot-peringkat.sql` dari repo game (bot ikut papan & hadiah, fungsi `bot_event_tick`).
2. Vercel → proyek `dragen-web` → Settings → Environment Variables (Production):
   `SUPABASE_URL` (Project URL), `SUPABASE_SERVICE_ROLE_KEY` (secret key `sb_secret_…` atau service_role), `CRON_SECRET` (teks acak panjang).
3. Redeploy. Cek: `/api/event` mengembalikan JSON; Vercel → Cron Jobs → `bot-event-daily` bisa dijalankan manual ("Run").

## Hero 3D

Bagian atas landing page adalah scene Three.js r128 (dari cdnjs) yang dibangun dari game:

- `assets/hero/island.json` + tekstur KayKit: pulau utama, pulau menu, gerak-gerik pulau (air terjun, asap, kupu-kupu, kristal, cincin rune), jalur burung, model awan dan naga kandang. Diekspor dari scene Unity yang sedang Play dengan `tools/unity-ekspor-pulau.cs`.
- `assets/hero/naga.js`: perakit & animator naga dari `bengkel-naga.html` (sumber yang sama dengan `DragonBuilder` di game).
- `assets/hero/hero.js`: perilaku port dari game VR (`WorldDragon`, `DragonSky`, `IslandLife`, awan `RanchScenery`).

Gambar `assets/img/island.jpg` tetap jadi cadangan sampai kanvas siap atau bila WebGL tidak tersedia. Tambahkan `?hero-debug` di URL untuk membuka `window.__hero` di konsol.

HTML statis tanpa build. Hosting di Vercel (proyek `dragen-web`), terhubung ke repo ini: setiap push ke `main` otomatis online dalam beberapa detik. Domain `dragen.arjuntech.id` = CNAME di Cloudflare (DNS only) ke Vercel. Header keamanan diatur di `vercel.json`.

Uji lokal: `python -m http.server 4173` di folder ini, lalu buka http://localhost:4173.
