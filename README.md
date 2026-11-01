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

## Hero 3D

Bagian atas landing page adalah scene Three.js r128 (dari cdnjs) yang dibangun dari game:

- `assets/hero/island.json` + tekstur KayKit: pulau utama, pulau menu, gerak-gerik pulau (air terjun, asap, kupu-kupu, kristal, cincin rune), jalur burung, model awan dan naga kandang. Diekspor dari scene Unity yang sedang Play dengan `tools/unity-ekspor-pulau.cs`.
- `assets/hero/naga.js`: perakit & animator naga dari `bengkel-naga.html` (sumber yang sama dengan `DragonBuilder` di game).
- `assets/hero/hero.js`: perilaku port dari game VR (`WorldDragon`, `DragonSky`, `IslandLife`, awan `RanchScenery`).

Gambar `assets/img/island.jpg` tetap jadi cadangan sampai kanvas siap atau bila WebGL tidak tersedia. Tambahkan `?hero-debug` di URL untuk membuka `window.__hero` di konsol.

HTML statis tanpa build. Hosting di Vercel (proyek `dragen-web`), terhubung ke repo ini: setiap push ke `main` otomatis online dalam beberapa detik. Domain `dragen.arjuntech.id` = CNAME di Cloudflare (DNS only) ke Vercel. Header keamanan diatur di `vercel.json`.

Uji lokal: `python -m http.server 4173` di folder ini, lalu buka http://localhost:4173.
