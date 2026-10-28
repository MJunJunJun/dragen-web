# dragen-web

Website DraGen: https://dragen.arjuntech.id

| Halaman | Berkas |
| --- | --- |
| Landing page | `index.html` |
| Privacy policy | `privacy/index.html` |
| Halaman 404 | `404.html` |
| Gaya bersama | `assets/site.css` |
| Logo & foto | `assets/logo.svg`, `assets/img/` |

HTML statis tanpa build. Hosting di Vercel (proyek `dragen-web`), terhubung ke repo ini: setiap push ke `main` otomatis online dalam beberapa detik. Domain `dragen.arjuntech.id` = CNAME di Cloudflare (DNS only) ke Vercel. Header keamanan diatur di `vercel.json`.

Uji lokal: `python -m http.server 4173` di folder ini, lalu buka http://localhost:4173.
