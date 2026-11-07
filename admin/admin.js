// Halaman admin DraGen (dragen.arjuntech.id/admin) — tanpa build. Semua data lewat /api/admin (sesi di cookie HttpOnly).
// Teks dari server selalu dimasukkan sebagai teks (h() → textContent), tidak pernah sebagai HTML.
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v; // CSSOM: tidak diblokir CSP style-src
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (['checked', 'disabled', 'selected', 'hidden', 'required'].includes(k)) el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // ---------- API ----------
  class ApiError extends Error {}
  async function api(a, opts = {}) {
    const qs = opts.params ? '&' + new URLSearchParams(opts.params) : '';
    const r = await fetch('/api/admin?a=' + encodeURIComponent(a) + qs, {
      method: opts.body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: { 'X-DraGen-Admin': '1', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch (e) { /* bukan JSON */ }
    if (r.status === 401 && a !== 'login') { showLogin('Sesi berakhir, silakan masuk lagi.'); throw new ApiError('Sesi berakhir.'); }
    if (!r.ok) throw new ApiError((data && data.error) || 'Galat ' + r.status);
    return data;
  }

  // ---------- format ----------
  const nf = new Intl.NumberFormat('id-ID');
  const n = x => nf.format(Number(x || 0));
  const dtf = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const df = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
  const toDate = t => new Date(typeof t === 'number' ? t * 1000 : t);
  const when = t => (t ? dtf.format(toDate(t)) : '—');
  function span(s) {
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' mnt';
    if (s < 86400) return Math.floor(s / 3600) + ' jam';
    return Math.floor(s / 86400) + ' hari';
  }
  function ago(t) {
    if (!t) return '—';
    const s = (Date.now() - toDate(t).getTime()) / 1000;
    if (s < 0) return 'dalam ' + span(-s);
    const w = span(s);
    return w === 'baru saja' ? w : w + ' lalu';
  }
  const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '—');
  const isoOf = v => (v ? new Date(v).toISOString() : null);
  const localInput = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

  // ---------- potongan UI ----------
  function toast(msg, bad) {
    const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: bad ? 'alert' : 'status' }, msg);
    $('#toasts').append(t);
    setTimeout(() => t.remove(), bad ? 7000 : 4000);
  }
  function btn(label, fn, cls = '') {
    return h('button', { type: 'button', class: 'btn sm ' + cls, onclick: async e => {
      e.stopPropagation();
      const b = e.currentTarget; b.disabled = true;
      try { await fn(); } catch (err) { if (!(err instanceof ApiError && /Sesi berakhir/.test(err.message))) toast(err.message || String(err), true); }
      finally { b.disabled = false; }
    } }, label);
  }
  function badge(text, cls) { return h('span', { class: 'badge ' + (cls || '') }, text); }
  function table(cols, rows, { onRow, empty = 'Tidak ada data.' } = {}) {
    if (!rows || !rows.length) return h('div', { class: 'tbl-wrap' }, h('div', { class: 'empty' }, empty));
    return h('div', { class: 'tbl-wrap' }, h('table', null,
      h('thead', null, h('tr', null, cols.map(c => h('th', { class: c.num ? 'num' : null }, c.label)))),
      h('tbody', null, rows.map(r => h('tr', { class: onRow ? 'click' : null, onclick: onRow ? () => onRow(r) : null },
        cols.map(c => h('td', { class: [c.num ? 'num' : '', c.cls || ''].join(' ').trim() || null }, c.get(r))))))));
  }
  function tile(label, value, cls) { return h('div', { class: 'tile ' + (cls || '') }, h('span', null, label), h('b', null, value)); }
  function card(title, ...kids) { return h('section', { class: 'card stack' }, title ? h('h2', null, title) : null, ...kids); }
  function errBox(e) { return card('Gagal memuat', h('p', { class: 'msg' }, e.message || String(e)), btn('Coba lagi', route)); }
  const playerLink = (id, name) => h('a', { href: '#pemain/' + id, onclick: e => e.stopPropagation() }, name || '?');

  function dialog({ title, body = [], ok = 'OK', danger = false, cancel = 'Batal' }) {
    const dlg = $('#dlg'), form = $('#dlg-form');
    form.replaceChildren(h('h2', null, title), h('div', { class: 'body' }, body), h('div', { class: 'row end' },
      cancel ? h('button', { type: 'button', class: 'btn ghost', onclick: () => dlg.close('cancel') }, cancel) : null,
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), value: 'ok' }, ok)));
    dlg.returnValue = '';
    return new Promise(res => { dlg.onclose = () => res(dlg.returnValue === 'ok'); dlg.showModal(); });
  }

  // ---------- data item hadiah (sama dengan game: Ranch.AddRarityEgg, DailyLogin, Economy.TreeTypes) ----------
  const RARITY = ['Biasa', 'Langka', 'Epik', 'Legendaris', 'Mitos'];
  const SEEDS = [['BerryBush', 'Spiky Cherry'], ['PurpleMelon', 'Purplemon'], ['SourCone', 'Sour Cone'], ['BlueHazel', 'Blue Hazel'],
    ['Dragonscale', 'Dragonscale'], ['DragolandicBerry', 'Dragolandic Berry'], ['AppleTree', 'Spring Cherry'], ['StarFruit', 'Star Fruit'],
    ['Sweetroot', 'Sweetroot'], ['DragonCactus', 'Squarey Berry'], ['RoyalFig', 'Royal Fig'], ['PearTree', 'Candied Pear'],
    ['MoonCherry', 'Moon Cherry'], ['SunFig', 'Sun Fig'], ['ElderPear', 'Elder Pear'], ['AstralCherry', 'Astral Cherry'],
    ['AstralFig', 'Astral Fig'], ['AstralPear', 'Astral Pear']];
  const KEYS = [...SEEDS.map(([id, nm]) => ['Seed:' + id, 'Bibit ' + nm]), ['GoldCoupon:1', 'Kupon Gold 1 jam'], ['GoldCoupon:2', 'Kupon Gold 2 jam'],
    ['GoldCoupon:3', 'Kupon Gold 3 jam'], ['Shard:Mythic', 'Mythic Shard'], ['Shard:Legendary', 'Legendary Shard']];
  const TYPES = [['gold', 'Gold'], ['berry', 'Berry'], ['egg', 'Telur (kelangkaan)'], ['event_egg', 'Telur eksklusif event'],
    ['event_coin', 'Koin event'], ['item', 'Item tas'], ['avatar', 'Item avatar']];
  const KINDS = { gift: 'Hadiah', notice: 'Pengumuman', compensation: 'Kompensasi', welcome: 'Otomatis: pemain baru', comeback: 'Otomatis: kembali main', code: 'Kode' };
  const REASONS = { spam: 'Spam', rude: 'Kasar', cheating: 'Curang', name: 'Nama tidak pantas', other: 'Lainnya' };
  const BOTKINDS = { eager: 'Rajin', fighter: 'Petarung', steady: 'Stabil', collector: 'Kolektor', farmer: 'Petani', casual: 'Santai', quit: 'Berhenti main' };

  let EVENTS = [];
  async function loadEvents() {
    if (EVENTS.length) return;
    try { EVENTS = (await fetch('/assets/event/events.json').then(r => r.json())).events || []; } catch (e) { EVENTS = []; }
  }
  const evName = id => (EVENTS.find(e => e.id === id) || {}).name || id;
  const evCoin = id => (EVENTS.find(e => e.id === id) || {}).coin || 'koin event';
  const evNow = () => { const t = Date.now(); const e = EVENTS.find(x => t >= Date.parse(x.starts) && t < Date.parse(x.ends)) || EVENTS[0]; return e ? e.id : ''; };
  function itemLabel(it) {
    switch (it.type) {
      case 'gold': return n(it.amount) + ' Gold';
      case 'berry': return n(it.amount) + ' Berry';
      case 'egg': return it.count + '× Telur ' + (RARITY[it.rarity] || '?');
      case 'event_egg': return it.count + '× Telur Legendaris ' + evName(it.event);
      case 'event_coin': return n(it.amount) + ' ' + evCoin(it.event);
      case 'item': return n(it.amount) + '× ' + ((KEYS.find(k => k[0] === it.key) || [])[1] || it.key);
      case 'avatar': return 'Avatar ' + it.key;
      default: return JSON.stringify(it);
    }
  }
  const itemsText = items => (items && items.length ? items.map(itemLabel).join(' · ') : '—');

  function itemEditor(initial) {
    const list = h('div', { class: 'items' });
    const num = (k, label, v, max) => h('label', null, label, h('input', { type: 'number', min: 1, max, step: 1, value: v, 'data-k': k, required: true }));
    const evSel = v => h('label', null, 'Event', h('select', { 'data-k': 'event' }, EVENTS.map(e => h('option', { value: e.id, selected: e.id === v }, e.name))));
    function fields(t, it) {
      switch (t) {
        case 'gold': case 'berry': return [num('amount', 'Jumlah', it.amount || (t === 'gold' ? 1000 : 100), 100000000)];
        case 'egg': return [h('label', null, 'Kelangkaan', h('select', { 'data-k': 'rarity' }, RARITY.map((r, i) => h('option', { value: i, selected: i === (it.rarity ?? 2) }, r)))),
          num('count', 'Jumlah telur', it.count || 1, 50)];
        case 'event_egg': return [evSel(it.event || evNow()), num('count', 'Jumlah telur', it.count || 1, 50)];
        case 'event_coin': return [evSel(it.event || evNow()), num('amount', 'Jumlah koin', it.amount || 50, 1000000)];
        case 'item': return [h('label', null, 'Item', h('select', { 'data-k': 'key' }, KEYS.map(([k, l]) => h('option', { value: k, selected: k === it.key }, l)))),
          num('amount', 'Jumlah', it.amount || 1, 100000)];
        case 'avatar': return [h('label', null, 'Kunci item avatar', h('input', { 'data-k': 'key', value: it.key || '', placeholder: 'head:3', pattern: '[a-z]{2,10}:[0-9]{1,3}', required: true }))];
        default: return [];
      }
    }
    function add(it) {
      const box = h('div', { class: 'fields' });
      const type = h('select', { 'aria-label': 'Jenis item' }, TYPES.map(([v, l]) => h('option', { value: v, selected: v === it.type }, l)));
      const row = h('div', { class: 'item-row' }, type, box, h('button', { type: 'button', class: 'btn ghost sm', 'aria-label': 'Hapus item', onclick: () => row.remove() }, '✕'));
      const draw = x => box.replaceChildren(...fields(type.value, x));
      type.addEventListener('change', () => draw({}));
      row._get = () => {
        const o = { type: type.value };
        for (const el of box.querySelectorAll('[data-k]')) {
          const k = el.getAttribute('data-k');
          o[k] = ['amount', 'count', 'rarity'].includes(k) ? Math.floor(Number(el.value)) : el.value.trim();
        }
        return o;
      };
      draw(it);
      list.append(row);
    }
    const wrap = h('div', { class: 'stack' }, list, h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn sm', onclick: () => { if (list.children.length < 12) add({ type: 'gold' }); else toast('Maksimal 12 item per surat.', true); } }, '+ Tambah item'),
      h('span', { class: 'muted' }, 'Maks 12 item. Bisa dicampur: gold, berry, telur, koin event, bibit, kupon, avatar.')));
    wrap.get = () => [...list.children].map(r => r._get());
    wrap.set = items => { list.replaceChildren(); (items || []).forEach(i => add({ ...i })); };
    wrap.set(initial || []);
    return wrap;
  }

  // pemilih pemain (cari nama / kode teman / id)
  function playerPicker(picked) {
    const chips = h('div', { class: 'chips' });
    const sug = h('div', { class: 'suggest', hidden: true });
    const input = h('input', { type: 'search', placeholder: 'Cari nama, kode teman, atau ID pemain…', 'aria-label': 'Cari pemain' });
    const draw = () => chips.replaceChildren(...(picked.size ? [...picked.values()].map(p => h('span', { class: 'chip' }, p.name,
      h('button', { type: 'button', 'aria-label': 'Hapus ' + p.name, onclick: () => { picked.delete(p.id); draw(); } }, '✕')))
      : [h('span', { class: 'muted' }, 'Belum ada pemain dipilih.')]));
    let timer = 0;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { sug.hidden = true; return; }
      timer = setTimeout(async () => {
        try {
          const rows = await api('players', { params: { q, limit: 20 } });
          sug.replaceChildren(...(rows.length ? rows.map(r => h('button', { type: 'button', onclick: () => { picked.set(r.id, { id: r.id, name: r.name }); draw(); sug.hidden = true; input.value = ''; } },
            h('span', null, r.name), h('span', { class: 'muted mono' }, (r.version || '') + ' · ' + ago(r.seen)))) : [h('div', { class: 'empty' }, 'Tidak ketemu.')]));
          sug.hidden = false;
        } catch (e) { toast(e.message, true); }
      }, 250);
    });
    draw();
    return h('div', { class: 'stack' }, input, sug, chips);
  }

  // grafik batang sederhana (SVG)
  function barChart(rows, series) {
    const NS = 'http://www.w3.org/2000/svg';
    const W = 600, H = 170, pad = 22, max = Math.max(1, ...rows.flatMap(r => series.map(s => r[s.k] || 0)));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
    const bw = (W - pad) / rows.length, inner = (bw * 0.8) / series.length;
    const el = (tag, a) => { const x = document.createElementNS(NS, tag); for (const k in a) x.setAttribute(k, a[k]); return x; };
    rows.forEach((r, i) => series.forEach((s, j) => {
      const v = r[s.k] || 0, bh = ((H - pad - 8) * v) / max;
      const rect = el('rect', { x: pad + i * bw + bw * 0.1 + j * inner, y: H - pad - bh, width: Math.max(1, inner - 1), height: bh, rx: 1.5, fill: s.color });
      rect.append(el('title', {})); rect.lastChild.textContent = `${df.format(new Date(r.day))}: ${s.label} ${v}`;
      svg.append(rect);
    }));
    [0, Math.floor(rows.length / 2), rows.length - 1].forEach(i => { if (!rows[i]) return; const t = el('text', { x: pad + i * bw, y: H - 6 }); t.textContent = df.format(new Date(rows[i].day)); svg.append(t); });
    const t = el('text', { x: 0, y: 12 }); t.textContent = String(max); svg.append(t);
    return h('div', null, svg, h('div', { class: 'legend' }, series.map(s => h('span', null, h('i', { style: 'background:' + s.color }), s.label))));
  }

  // ---------- state ----------
  const state = { players: { q: '', bots: false, sort: 'seen' }, allReports: false, prefill: null, logAction: '' };

  // ---------- RINGKASAN ----------
  async function ringkasan() {
    const s = await api('stats');
    const cron = s.last_cron;
    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Ringkasan'), btn('Muat ulang', route)),
      h('div', { class: 'tiles' },
        tile('Pemain asli', n(s.players)), tile('Aktif 24 jam', n(s.active_1d), 'ok'), tile('Aktif 7 hari', n(s.active_7d)), tile('Aktif 30 hari', n(s.active_30d)),
        tile('Baru 24 jam', n(s.new_1d)), tile('Baru 7 hari', n(s.new_7d)), tile('Laporan terbuka', n(s.reports_open), s.reports_open ? 'warn' : ''),
        tile('Chat 6 jam', n(s.chat_6h)), tile('Surat belum diklaim', n(s.mail_unclaimed)), tile('Diklaim 7 hari', n(s.mail_claimed_7d)),
        tile('Kode aktif', n(s.codes_active)), tile('Dibisukan', n(s.muted)), tile('Di-ban', n(s.banned), s.banned ? 'warn' : ''), tile('Bot', n(s.bots))),
      h('div', { class: 'grid cols-2' },
        card('30 hari terakhir', barChart(s.new_by_day || [], [{ k: 'new', label: 'Pemain baru', color: '#5eead4' }, { k: 'seen', label: 'Terakhir aktif di hari itu', color: '#f5b942' }])),
        card('Status',
          h('dl', { class: 'kv' },
            h('dt', null, 'Supabase'), h('dd', null, badge('aktif', 'ok'), ' jam server ', when(s.db_time)),
            h('dt', null, 'Cron harian'), h('dd', null, cron ? [when(cron.at), ' (', ago(cron.at), ')'] : badge('belum pernah', 'warn')),
            cron && cron.detail ? [h('dt', null, 'Hasil cron'), h('dd', null, cron.detail.event
              ? `${cron.detail.event}: ${n(cron.detail.playing)} bot main, level tertinggi ${cron.detail.topLevel}` : (cron.detail.note || '—'))] : null,
            h('dt', null, 'CRON_SECRET'), h('dd', null, s.cron_secret ? badge('terpasang', 'ok') : badge('belum', 'bad'))),
          h('p', { class: 'muted' }, 'Cron jalan tiap hari ±07:10–08:10 WIB: level event bot, rekam harian, dan aktivitas database supaya Supabase Free tidak di-pause.'))),
      h('div', { class: 'grid cols-3', style: 'margin-top:14px' },
        card('Versi game (aktif 30 hari)', table([{ label: 'Versi', get: r => r.name }, { label: 'Pemain', num: true, get: r => n(r.n) }], s.versions)),
        card('Platform (aktif 30 hari)', table([{ label: 'Platform', get: r => r.name }, { label: 'Pemain', num: true, get: r => n(r.n) }], s.platforms)),
        card('Rekam harian', table([{ label: 'Tanggal', get: r => df.format(new Date(r.day)) }, { label: 'Pemain', num: true, get: r => n(r.players) },
          { label: 'Aktif 1h', num: true, get: r => n(r.active_1d) }, { label: 'Baru', num: true, get: r => n(r.new_players) },
          { label: 'Ikut event', num: true, get: r => n(r.event_players) }], (s.history || []).slice().reverse().slice(0, 14), { empty: 'Muncul sesudah cron pertama.' }))));
  }

  // ---------- PEMAIN ----------
  async function pemain(id) {
    if (id) return playerDetail(id);
    const st = state.players;
    const results = h('div', null, h('p', { class: 'loading' }, 'Memuat…'));
    const q = h('input', { type: 'search', value: st.q, placeholder: 'Nama, kode teman, atau ID', 'aria-label': 'Cari pemain' });
    const bots = h('input', { type: 'checkbox', checked: st.bots });
    const sort = h('select', { 'aria-label': 'Urutkan' }, [['seen', 'Terakhir aktif'], ['joined', 'Terbaru bergabung'], ['gold', 'Gold terbanyak'], ['berry', 'Berry terbanyak']]
      .map(([v, l]) => h('option', { value: v, selected: v === st.sort }, l)));
    async function search() {
      Object.assign(st, { q: q.value.trim(), bots: bots.checked, sort: sort.value });
      try {
        const rows = await api('players', { params: { q: st.q, bots: st.bots ? '1' : '0', sort: st.sort, limit: 200 } });
        results.replaceChildren(table([
          { label: 'Nama', get: r => [r.name, ' ', r.bot ? badge('bot', 'bot') : null, r.banned ? badge('ban', 'bad') : null, r.muted ? badge('bisu', 'warn') : null] },
          { label: 'Gold', num: true, get: r => n(r.gold) }, { label: 'Berry', num: true, get: r => n(r.berry) },
          { label: 'Altar', num: true, get: r => r.altar }, { label: 'Naga', num: true, get: r => r.dragons },
          { label: 'Versi', get: r => r.version || '—' }, { label: 'Bergabung', get: r => when(r.joined) }, { label: 'Terakhir aktif', get: r => ago(r.seen) },
        ], rows, { onRow: r => { location.hash = '#pemain/' + r.id; }, empty: 'Tidak ada pemain yang cocok.' }), h('p', { class: 'muted' }, rows.length + ' pemain ditampilkan (maks 200).'));
      } catch (e) { results.replaceChildren(h('p', { class: 'msg' }, e.message)); }
    }
    const form = h('form', { class: 'row', onsubmit: e => { e.preventDefault(); search(); } },
      q, h('label', { class: 'check' }, bots, 'Tampilkan bot'), sort, h('button', { class: 'btn primary' }, 'Cari'));
    search();
    return h('div', null, h('div', { class: 'head' }, h('h1', null, 'Pemain')), card(null, form, results));
  }

  async function playerDetail(id) {
    await loadEvents();
    const d = await api('player', { params: { id } });
    const p = d.player, au = d.auth || {};
    const now = Date.now();
    const muted = p.chat_banned_until && Date.parse(p.chat_banned_until) > now, banned = p.banned_until && Date.parse(p.banned_until) > now;
    const reload = () => route();

    async function rename() {
      const inp = h('input', { value: p.player_name, maxlength: 16 });
      if (!(await dialog({ title: 'Ganti nama', ok: 'Simpan', body: [h('label', null, 'Nama baru (kosongkan untuk nama acak Player######)', inp),
        h('p', { class: 'muted' }, 'Game mengambil nama baru saat pemain membuka kotak hadiah.')] }))) return;
      const r = await api('rename', { body: { id, name: inp.value } });
      toast('Nama diganti jadi ' + r.name); reload();
    }
    async function mute() {
      const sel = h('select', null, [[1, '1 jam'], [24, '24 jam'], [72, '3 hari'], [168, '7 hari'], [720, '30 hari'], [0, 'Lepas bisu']].map(([v, l]) => h('option', { value: v, selected: v === 24 }, l)));
      const why = h('input', { maxlength: 200, placeholder: 'mis. spam di chat global' });
      if (!(await dialog({ title: 'Bisu chat ' + p.player_name, ok: 'Simpan', body: [h('label', null, 'Lama', sel), h('label', null, 'Alasan (catatan admin)', why)] }))) return;
      await api('mute', { body: { id, hours: Number(sel.value), reason: why.value } });
      toast(Number(sel.value) ? 'Pemain dibisukan.' : 'Bisu dilepas.'); reload();
    }
    async function ban() {
      const sel = h('select', null, [[1, '1 hari'], [7, '7 hari'], [30, '30 hari'], ['perm', 'Permanen'], [0, 'Lepas ban']].map(([v, l]) => h('option', { value: v, selected: v === 7 }, l)));
      const why = h('input', { maxlength: 200, placeholder: 'mis. curang gold' });
      if (!(await dialog({ title: 'Ban ' + p.player_name, ok: 'Simpan', danger: true, body: [h('label', null, 'Lama', sel), h('label', null, 'Alasan (catatan admin)', why),
        h('p', { class: 'muted' }, 'Ban memblokir login pemain di server (token lama habis paling lama 1 jam) dan menyembunyikannya dari papan event. Save di Quest tidak dihapus.')] }))) return;
      await api('ban', { body: { id, days: sel.value === 'perm' ? 'perm' : Number(sel.value), reason: why.value } });
      toast(sel.value === '0' ? 'Ban dilepas.' : 'Pemain di-ban.'); reload();
    }
    async function del() {
      const inp = h('input', { placeholder: p.player_name, autocomplete: 'off' });
      const why = h('input', { maxlength: 200, placeholder: 'mis. permintaan pemain lewat Discord' });
      if (!(await dialog({ title: 'Hapus akun ' + p.player_name, ok: 'Hapus permanen', danger: true, body: [
        h('p', null, 'Semua data server pemain ini dihapus (sama seperti Reset progress di game): nama, teman, chat, posting, peringkat event, surat. Naga titipan pemain lain dikembalikan. Tidak bisa dibatalkan.'),
        h('label', null, 'Ketik nama pemain untuk konfirmasi', inp), h('label', null, 'Alasan', why)] }))) return;
      await api('delete', { body: { id, confirm: inp.value, reason: why.value } });
      toast('Akun dihapus.'); location.hash = '#pemain';
    }
    function gift() { state.prefill = { players: [{ id, name: p.player_name }] }; location.hash = '#hadiah'; }

    return h('div', null,
      h('p', null, h('a', { href: '#pemain' }, '← Semua pemain')),
      h('div', { class: 'head' }, h('h1', null, p.player_name, ' ', p.is_bot ? badge('bot', 'bot') : badge('pemain asli', 'real'),
        muted ? [' ', badge('bisu s.d. ' + when(p.chat_banned_until), 'warn')] : null, banned ? [' ', badge('ban s.d. ' + when(p.banned_until), 'bad')] : null),
      p.is_bot ? null : h('div', { class: 'row' }, btn('Kirim hadiah', gift, 'primary'), btn('Ganti nama', rename), btn(muted ? 'Ubah bisu' : 'Bisu chat', mute),
        btn(banned ? 'Ubah ban' : 'Ban', ban, 'danger'), btn('Hapus akun', del, 'danger'))),
      h('div', { class: 'grid cols-2' },
        card('Profil', h('dl', { class: 'kv' },
          h('dt', null, 'ID'), h('dd', { class: 'mono' }, p.player_id),
          h('dt', null, 'Kode teman'), h('dd', { class: 'mono' }, p.friend_code || '—'),
          h('dt', null, 'Akun Auth'), h('dd', { class: 'mono' }, au.email || '—'),
          h('dt', null, 'ID Meta'), h('dd', { class: 'mono' }, d.meta ? d.meta.meta_id : '—'),
          h('dt', null, 'Bergabung'), h('dd', null, when(p.profile_created_at || p.first_sync_at)),
          h('dt', null, 'Sinkron terakhir'), h('dd', null, when(p.last_sync_at), ' (', ago(p.last_sync_at), ')'),
          h('dt', null, 'Login terakhir'), h('dd', null, when(au.last_sign_in)),
          h('dt', null, 'Versi / platform'), h('dd', null, (p.game_version || '—') + ' / ' + (p.platform || '—')),
          h('dt', null, 'Kotak hadiah dibuka'), h('dd', null, when(p.mail_seen_at)),
          h('dt', null, 'Teman'), h('dd', null, n(d.friends)),
          h('dt', null, 'Laporan dibuat'), h('dd', null, n(d.reports_made)))),
        card('Kekayaan & progres', h('dl', { class: 'kv' },
          h('dt', null, 'Gold'), h('dd', null, n(p.gold)), h('dt', null, 'Berry'), h('dd', null, n(p.berry)),
          h('dt', null, 'Altar'), h('dd', null, p.altar_level), h('dt', null, 'Naga'), h('dd', null, n(p.dragon_count)),
          h('dt', null, 'Telur'), h('dd', null, n(p.egg_count) + ' (+' + n(p.bag_egg_count) + ' di tas)'), h('dt', null, 'Dex'), h('dd', null, n(p.dex_found)),
          h('dt', null, 'Rekor PvP'), h('dd', null, `1v1 ${p.best_1v1} · 3v3 ${p.best_3v3} · 5v5 ${p.best_5v5}`)),
          h('h3', null, 'Riwayat gold harian'),
          table([{ label: 'Tanggal', get: r => df.format(new Date(r.day)) }, { label: 'Gold', num: true, get: r => n(r.gold) }, { label: 'Berry', num: true, get: r => n(r.berry) }],
            (d.gold_history || []).slice().reverse().slice(0, 14), { empty: 'Belum ada rekam harian.' }))),
      h('div', { class: 'grid cols-2', style: 'margin-top:14px' },
        card('Laporan terhadap pemain ini', table([{ label: 'Waktu', get: r => when(r.at) }, { label: 'Dari', get: r => r.by }, { label: 'Alasan', get: r => REASONS[r.reason] || r.reason },
          { label: 'Konteks', cls: 'cut', get: r => r.context || '—' }, { label: 'Status', get: r => (r.handled ? badge('selesai', 'ok') : badge('terbuka', 'warn')) }], d.reports_against, { empty: 'Tidak ada laporan.' })),
        card('Menara Event', table([{ label: 'Event', get: r => evName(r.event) }, { label: 'Level', num: true, get: r => r.level }, { label: 'Hadiah', get: r => (r.claimed ? 'diklaim' : '—') }], d.events, { empty: 'Belum ikut event.' })),
        card('Surat (20 terakhir)', table([{ label: 'Dibuat', get: r => when(r.created) }, { label: 'Jenis', get: r => KINDS[r.kind] || r.kind }, { label: 'Judul', get: r => r.title },
          { label: 'Isi', cls: 'cut', get: r => itemsText(r.items) }, { label: 'Status', get: r => (r.claimed ? badge('diklaim ' + ago(r.claimed), 'ok') : badge('belum', '')) }], d.mail, { empty: 'Belum ada surat.' })),
        card('Buku besar (20 terakhir)', table([{ label: 'Waktu', get: r => when(r.at) }, { label: 'Jenis', get: r => r.kind }, { label: 'Isi', get: r => r.name || (r.amount != null ? n(r.amount) : '—') },
          { label: 'Dari/ke', get: r => r.who || r.via || '—' }, { label: 'Diterapkan', get: r => (r.applied ? ago(r.applied) : badge('belum', 'warn')) }], d.ledger, { empty: 'Kosong.' })),
        card('Log admin untuk pemain ini', table([{ label: 'Waktu', get: r => when(r.at) }, { label: 'Admin', get: r => r.admin }, { label: 'Aksi', get: r => r.action },
          { label: 'Detail', cls: 'cut mono', get: r => JSON.stringify(r.detail) }], d.log, { empty: 'Belum ada.' }))));
  }

  // ---------- MODERASI ----------
  async function quickMute(id, name) {
    if (!(await dialog({ title: 'Bisu chat ' + name + ' 24 jam?', ok: 'Bisukan' }))) return;
    await api('mute', { body: { id, hours: 24, reason: 'dari halaman moderasi' } });
    toast(name + ' dibisukan 24 jam.'); route();
  }
  async function moderasi() {
    const [reports, chat] = await Promise.all([api('reports', { params: { all: state.allReports ? '1' : '0' } }), api('chat')]);
    const toggle = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.allReports, onchange: e => { state.allReports = e.target.checked; route(); } }), 'Tampilkan yang sudah selesai');
    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Moderasi'), btn('Muat ulang', route)),
      h('div', { class: 'stack' },
        card('Laporan pemain', toggle, table([
          { label: 'Waktu', get: r => when(r.at) }, { label: 'Pelapor', get: r => playerLink(r.reporter, r.reporter_name) },
          { label: 'Dilaporkan', get: r => [playerLink(r.reported, r.reported_name), ' ', r.against > 1 ? badge(r.against + ' laporan', 'warn') : null] },
          { label: 'Alasan', get: r => REASONS[r.reason] || r.reason }, { label: 'Konteks', cls: 'cut', get: r => r.context || '—' },
          { label: 'Aksi', get: r => h('div', { class: 'row' },
            r.handled ? btn('Buka lagi', async () => { await api('report', { body: { id: r.id, handled: false } }); route(); })
              : btn('Selesai', async () => { await api('report', { body: { id: r.id, handled: true } }); toast('Laporan ditandai selesai.'); route(); }, 'primary'),
            btn('Bisu 24 jam', () => quickMute(r.reported, r.reported_name))) },
        ], reports, { empty: state.allReports ? 'Belum ada laporan.' : 'Tidak ada laporan terbuka. 🎉' })),
        card('Chat global (6 jam terakhir)', table([
          { label: 'Waktu', get: r => ago(r.at) }, { label: 'Pemain', get: r => [playerLink(r.from, r.name), ' ', r.bot ? badge('bot', 'bot') : null, r.muted ? badge('bisu', 'warn') : null] },
          { label: 'Pesan', cls: 'cut', get: r => r.body },
          { label: 'Aksi', get: r => h('div', { class: 'row' },
            btn('Hapus', async () => { if (!(await dialog({ title: 'Hapus pesan ini?', body: [h('p', { class: 'preview' }, r.body)], ok: 'Hapus', danger: true }))) return;
              await api('chat-delete', { body: { id: r.id } }); toast('Pesan dihapus.'); route(); }, 'danger'),
            r.bot ? null : btn('Bisu 24 jam', () => quickMute(r.from, r.name))) },
        ], chat, { empty: 'Belum ada pesan dalam 6 jam terakhir.' }))));
  }

  // ---------- EVENT ----------
  async function runCron() {
    if (!(await dialog({ title: 'Jalankan cron harian sekarang?', ok: 'Jalankan', body: [h('p', null, 'Level event bot dihitung ulang untuk hari ini (hasil sama jika sudah jalan hari ini), lalu rekam harian diperbarui.')] }))) return;
    const r = await api('cron', { body: {} });
    toast(r.event ? `Cron selesai: ${n(r.playing)} bot main di ${r.event}, level tertinggi ${r.topLevel}.` : 'Cron selesai: tidak ada event berjalan.');
    route();
  }
  async function eventView(id) {
    await loadEvents();
    const d = await api('event', { params: id ? { id } : {} });
    const ev = d.event || {};
    const sel = h('select', { 'aria-label': 'Pilih event', onchange: e => { location.hash = '#event/' + e.target.value; } },
      (d.events || []).map(e => h('option', { value: e.id, selected: e.id === ev.id }, evName(e.id) + ' · ' + df.format(new Date(e.starts)))));
    const running = ev.starts && Date.now() >= Date.parse(ev.starts) && Date.now() < Date.parse(ev.ends);
    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Menara Event'), h('div', { class: 'row' }, sel, btn('Jalankan cron bot sekarang', runCron, 'primary'))),
      h('div', { class: 'tiles' }, tile('Event', evName(ev.id)), tile('Status', running ? 'Berjalan' : Date.now() < Date.parse(ev.starts) ? 'Akan datang' : 'Selesai'),
        tile('Peserta', n(d.total)), tile('Pemain asli', n(d.real), 'ok'), tile('Bot', n((d.total || 0) - (d.real || 0))),
        tile('Periode', ev.starts ? df.format(new Date(ev.starts)) + ' – ' + df.format(new Date(ev.ends)) : '—')),
      h('div', { class: 'grid cols-2' },
        card('Peringkat 1–100 (plus semua pemain asli)', h('p', { class: 'muted' }, 'Pemain yang di-ban tidak dihitung. Website publik tidak menampilkan tanda bot.'),
          table([{ label: '#', num: true, get: r => r.rank }, { label: 'Nama', get: r => (r.bot ? r.name : playerLink(r.id, r.name)) },
            { label: 'Jenis', get: r => (r.bot ? badge('bot', 'bot') : badge('asli', 'real')) }, { label: 'Level', num: true, get: r => r.level },
            { label: 'Sampai', get: r => when(r.at) }, { label: 'Hadiah', get: r => (r.claimed ? 'diklaim' : '—') }], d.top, { empty: 'Belum ada yang naik level.' })),
        card('Jadwal event', table([{ label: 'Event', get: r => h('a', { href: '#event/' + r.id }, evName(r.id)) }, { label: 'Mulai', get: r => df.format(new Date(r.starts)) },
          { label: 'Selesai', get: r => df.format(new Date(r.ends)) }, { label: 'Peserta', num: true, get: r => n(r.players) }, { label: 'Asli', num: true, get: r => n(r.real) }], d.events))));
  }

  // ---------- HADIAH ----------
  const MODES = [['players', 'Pemain tertentu'], ['everyone', 'Semua pemain asli (saat ini)'], ['active', 'Aktif dalam N hari terakhir'], ['new', 'Pemain baru (N hari)'],
    ['since', 'Aktif sejak waktu tertentu (kompensasi)'], ['version', 'Versi game tertentu'], ['event', 'Peringkat Menara Event'],
    ['broadcast', 'Siaran: semua yang membuka game selama periode (termasuk pemain baru)']];
  function campaignStatus(c) {
    const now = Date.now();
    if (c.revoked_at) return badge('ditarik', 'bad');
    if (Date.parse(c.starts_at) > now) return badge('terjadwal', 'warn');
    if (c.ends_at && Date.parse(c.ends_at) <= now) return badge('berakhir', '');
    return badge('aktif', 'ok');
  }
  function audienceText(c) {
    if (c.audience === 'auto') return (c.kind === 'welcome' ? 'Pemain baru ≤ ' : 'Tidak buka kotak ≥ ') + c.rule_days + ' hari';
    if (c.audience === 'all') return 'Siaran';
    const t = c.target || {};
    switch (t.mode) {
      case 'players': return (t.ids || []).length + ' pemain dipilih';
      case 'everyone': return 'Semua pemain asli';
      case 'active': return 'Aktif ' + t.days + ' hari';
      case 'new': return 'Baru ' + t.days + ' hari';
      case 'since': return 'Aktif sejak ' + when(t.since);
      case 'version': return 'Versi ' + t.version;
      case 'event': return evName(t.event) + ' #' + t.from + '–' + t.to;
      default: return '—';
    }
  }

  async function hadiah() {
    await loadEvents();
    const [templates, camps] = await Promise.all([api('templates'), api('mail-campaigns')]);
    const picked = new Map();
    if (state.prefill) state.prefill.players.forEach(p => picked.set(p.id, p));
    state.prefill = null;

    const kind = h('select', { 'aria-label': 'Jenis surat' }, Object.entries(KINDS).filter(([k]) => k !== 'code').map(([v, l]) => h('option', { value: v }, l)));
    const tpl = h('select', { 'aria-label': 'Paket' }, h('option', { value: '' }, '— pilih paket siap pakai —'), templates.map(t => h('option', { value: t.id }, t.name)));
    const title = h('input', { maxlength: 80, required: true, placeholder: 'mis. Hadiah Lebaran dari DraGen Team' });
    const body = h('textarea', { maxlength: 1000, placeholder: 'Pesan untuk pemain (bahasa Inggris, seperti game).' });
    const items = itemEditor([{ type: 'gold', amount: 1000 }]);
    const itemsBox = h('div', { class: 'stack' }, h('h3', null, 'Isi hadiah'), items);

    const mode = h('select', { 'aria-label': 'Penerima' }, MODES.map(([v, l]) => h('option', { value: v, selected: v === 'players' }, l)));
    const days = h('input', { type: 'number', min: 1, max: 365, value: 7 });
    const since = h('input', { type: 'datetime-local', value: localInput(Date.now() - 6 * 3600e3) });
    const version = h('input', { placeholder: 'mis. 0.22' });
    const evSel = h('select', null, EVENTS.map(e => h('option', { value: e.id, selected: e.id === evNow() }, e.name)));
    const rFrom = h('input', { type: 'number', min: 1, value: 1 }), rTo = h('input', { type: 'number', min: 1, value: 100 });
    const picker = playerPicker(picked);
    const targetFields = h('div', { class: 'stack' });
    const drawTarget = () => {
      const m = mode.value;
      targetFields.replaceChildren(...(
        m === 'players' ? [picker]
          : m === 'active' || m === 'new' ? [h('label', null, 'Jumlah hari', days)]
            : m === 'since' ? [h('label', null, 'Aktif sejak', since)]
              : m === 'version' ? [h('label', null, 'Versi game (persis seperti di Ringkasan)', version)]
                : m === 'event' ? [h('div', { class: 'two' }, h('label', null, 'Event', evSel), h('label', null, 'Dari peringkat', rFrom), h('label', null, 'Sampai peringkat', rTo)),
                  h('p', { class: 'muted' }, 'Peringkat papan (bot ikut dihitung); hanya pemain asli di rentang itu yang menerima.')]
                  : m === 'broadcast' ? [h('p', { class: 'muted' }, 'Surat dibuat saat tiap pemain membuka kotak hadiah selama periode Mulai–Berakhir, jadi pemain baru ikut dapat. Isi "Berakhir" supaya ada batasnya.')]
                    : []));
    };
    mode.addEventListener('change', drawTarget);
    const ruleDays = h('input', { type: 'number', min: 1, max: 365, value: 3 });
    const ruleLabel = h('span', null);
    const autoBox = h('div', { class: 'stack' }, h('label', null, ruleLabel, ruleDays));
    const targetBox = h('div', { class: 'stack' }, h('h3', null, 'Penerima'), mode, targetFields);

    const starts = h('input', { type: 'datetime-local' }), ends = h('input', { type: 'datetime-local' });
    const claimDays = h('input', { type: 'number', min: 1, max: 365, placeholder: 'tanpa batas' });
    const preview = h('div', { class: 'preview', hidden: true });

    function syncKind() {
      const k = kind.value, auto = k === 'welcome' || k === 'comeback';
      itemsBox.hidden = k === 'notice';
      targetBox.hidden = auto; autoBox.hidden = !auto;
      ruleLabel.textContent = k === 'welcome' ? 'Diberikan ke pemain yang bergabung ≤ N hari (sekali per pemain)' : 'Diberikan ke pemain yang tidak membuka kotak hadiah ≥ N hari';
      if (auto && !ruleDays.dataset.touched) ruleDays.value = k === 'welcome' ? 3 : 14;
      if (auto && !claimDays.value) claimDays.value = 14;
      preview.hidden = true;
    }
    ruleDays.addEventListener('input', () => { ruleDays.dataset.touched = '1'; });
    kind.addEventListener('change', syncKind);
    tpl.addEventListener('change', () => {
      const t = templates.find(x => String(x.id) === tpl.value);
      if (!t) return;
      kind.value = t.kind; title.value = t.title; body.value = t.body; items.set(t.items); syncKind();
    });

    function target() {
      const m = mode.value;
      switch (m) {
        case 'players': return { mode: m, ids: [...picked.keys()] };
        case 'active': case 'new': return { mode: m, days: Number(days.value) };
        case 'since': return { mode: m, since: isoOf(since.value) };
        case 'version': return { mode: m, version: version.value.trim() };
        case 'event': return { mode: m, event: evSel.value, from: Number(rFrom.value), to: Number(rTo.value) };
        default: return { mode: m };
      }
    }
    function payload() {
      const k = kind.value, auto = k === 'welcome' || k === 'comeback';
      return { kind: k, title: title.value.trim(), body: body.value, items: k === 'notice' ? [] : items.get(),
        audience: auto ? 'auto' : mode.value === 'broadcast' ? 'all' : 'list', target: auto || mode.value === 'broadcast' ? {} : target(),
        starts_at: isoOf(starts.value), ends_at: isoOf(ends.value), claim_days: claimDays.value ? Number(claimDays.value) : null,
        rule_days: auto ? Number(ruleDays.value) : null };
    }
    async function doPreview() {
      const p = payload();
      if (p.audience !== 'list') { preview.hidden = false; preview.replaceChildren(p.audience === 'all' ? 'Siaran: jumlah penerima tergantung siapa yang membuka game selama periode.' : 'Otomatis: diberikan per pemain saat syaratnya terpenuhi.'); return null; }
      const r = await api('mail-preview', { body: { target: p.target } });
      preview.hidden = false;
      preview.replaceChildren(h('b', null, n(r.count) + ' pemain akan menerima.'), h('div', { class: 'muted' }, r.sample.length ? 'Contoh: ' + r.sample.join(', ') : ''));
      return r.count;
    }
    async function send() {
      const p = payload();
      if (!p.title) throw new Error('Judul wajib diisi.');
      if (p.kind !== 'notice' && !p.items.length) throw new Error('Tambahkan minimal satu item.');
      if (!formEl.reportValidity()) return;
      const count = await doPreview();
      const lines = [
        h('dl', { class: 'kv' }, h('dt', null, 'Jenis'), h('dd', null, KINDS[p.kind]), h('dt', null, 'Judul'), h('dd', null, p.title),
          h('dt', null, 'Isi'), h('dd', null, itemsText(p.items)),
          h('dt', null, 'Penerima'), h('dd', null, p.audience === 'list' ? n(count) + ' pemain' : p.audience === 'all' ? 'Siaran' : 'Otomatis (' + p.rule_days + ' hari)'),
          h('dt', null, 'Mulai'), h('dd', null, p.starts_at ? when(p.starts_at) : 'sekarang'),
          h('dt', null, 'Berakhir'), h('dd', null, p.ends_at ? when(p.ends_at) : 'tanpa batas'),
          h('dt', null, 'Batas klaim'), h('dd', null, p.claim_days ? p.claim_days + ' hari per surat' : '—'))];
      if (p.audience === 'list' && !count) throw new Error('Tidak ada penerima yang cocok.');
      if (!(await dialog({ title: 'Kirim surat dari DraGen Team?', ok: 'Kirim', body: lines }))) return;
      const r = await api('mail-send', { body: p });
      toast(p.audience === 'list' ? `Terkirim ke ${n(r.recipients)} pemain.` : 'Surat otomatis/siaran aktif.');
      route();
    }
    async function saveTpl() {
      const name = h('input', { maxlength: 60, required: true, value: (templates.find(x => String(x.id) === tpl.value) || {}).name || title.value.slice(0, 60) });
      if (!(await dialog({ title: 'Simpan sebagai paket', ok: 'Simpan', body: [h('label', null, 'Nama paket (nama sama = diperbarui)', name)] }))) return;
      const p = payload();
      await api('template-save', { body: { name: name.value, kind: p.kind, title: p.title, body: p.body, items: p.items } });
      toast('Paket disimpan.'); route();
    }
    async function delTpl() {
      const t = templates.find(x => String(x.id) === tpl.value);
      if (!t) throw new Error('Pilih paket dulu.');
      if (!(await dialog({ title: 'Hapus paket "' + t.name + '"?', ok: 'Hapus', danger: true }))) return;
      await api('template-delete', { body: { id: t.id } }); toast('Paket dihapus.'); route();
    }

    const formEl = h('form', { class: 'form', onsubmit: e => e.preventDefault() },
      h('div', { class: 'two' }, h('label', null, 'Jenis', kind), h('label', null, 'Paket', tpl)),
      h('div', { class: 'row' }, btn('Simpan sebagai paket', saveTpl), btn('Hapus paket', delTpl, 'ghost')),
      h('label', null, 'Judul surat', title), h('label', null, 'Pesan', body),
      itemsBox, targetBox, autoBox,
      h('h3', null, 'Waktu'),
      h('div', { class: 'two' }, h('label', null, 'Mulai (kosong = sekarang)', starts), h('label', null, 'Berakhir / batas klaim (kosong = tanpa batas)', ends),
        h('label', null, 'Batas klaim tiap surat (hari)', claimDays)),
      preview,
      h('div', { class: 'row' }, btn('Pratinjau penerima', doPreview), btn('Kirim', send, 'primary')),
      h('p', { class: 'muted' }, 'Pengirim selalu "DraGen Team". Bot tidak pernah menerima. Pemain yang di-ban dilewati.'));
    drawTarget(); syncKind();

    const list = table([
      { label: '#', num: true, get: c => c.id }, { label: 'Judul', get: c => [c.title, h('div', { class: 'muted' }, KINDS[c.kind] || c.kind)] },
      { label: 'Isi', cls: 'cut', get: c => itemsText(c.items) }, { label: 'Penerima', get: c => audienceText(c) },
      { label: 'Periode', get: c => [when(c.starts_at), h('div', { class: 'muted' }, c.ends_at ? 's.d. ' + when(c.ends_at) : 'tanpa batas')] },
      { label: 'Diklaim', num: true, get: c => `${n(c.claimed)} / ${n(c.recipients)} (${pct(c.claimed, c.recipients)})` },
      { label: 'Status', get: c => campaignStatus(c) },
      { label: '', get: c => (c.revoked_at ? null : btn('Tarik', async () => {
        if (!(await dialog({ title: 'Tarik "' + c.title + '"?', ok: 'Tarik kembali', danger: true, body: [h('p', null, 'Surat yang belum diklaim dihapus dari kotak pemain dan kampanye berhenti. Yang sudah diklaim tetap.')] }))) return;
        const r = await api('mail-revoke', { body: { id: c.id } }); toast(`Ditarik: ${n(r.removed)} surat belum diklaim dihapus.`); route();
      }, 'danger')) },
    ], camps, { empty: 'Belum ada kiriman.' });

    return h('div', null, h('div', { class: 'head' }, h('h1', null, 'Kotak Hadiah')),
      h('div', { class: 'stack' }, card('Kirim surat', formEl), card('Riwayat kiriman & hadiah otomatis', list)));
  }

  // ---------- KODE ----------
  function randomCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return 'DRAGEN' + [...b].map(x => abc[x % abc.length]).join('').slice(0, 6);
  }
  async function kode() {
    await loadEvents();
    const codes = await api('codes');
    const code = h('input', { maxlength: 24, required: true, placeholder: 'mis. DRAGEN2026', style: 'text-transform:uppercase' });
    const title = h('input', { maxlength: 80, required: true, placeholder: 'mis. Discord launch gift' });
    const body = h('textarea', { maxlength: 1000, placeholder: 'Pesan di surat yang diterima pemain.' });
    const items = itemEditor([{ type: 'egg', rarity: 2, count: 1 }]);
    const maxUses = h('input', { type: 'number', min: 1, placeholder: 'tanpa batas' });
    const starts = h('input', { type: 'datetime-local' }), ends = h('input', { type: 'datetime-local' });
    const form = h('form', { class: 'form', onsubmit: e => e.preventDefault() },
      h('div', { class: 'two' }, h('label', null, 'Kode (4–24 huruf/angka)', h('div', { class: 'row' }, code, btn('Acak', async () => { code.value = randomCode(); }))),
        h('label', null, 'Judul surat', title)),
      h('label', null, 'Pesan', body), h('h3', null, 'Isi hadiah'), items,
      h('div', { class: 'two' }, h('label', null, 'Maks pemakaian total', maxUses), h('label', null, 'Mulai (kosong = sekarang)', starts), h('label', null, 'Berakhir (kosong = tanpa batas)', ends)),
      h('div', { class: 'row' }, btn('Buat kode', async () => {
        if (!form.reportValidity()) return;
        const p = { code: code.value, title: title.value, body: body.value, items: items.get(), max_uses: maxUses.value ? Number(maxUses.value) : null,
          starts_at: isoOf(starts.value), ends_at: isoOf(ends.value) };
        const r = await api('code-create', { body: p }); toast('Kode ' + r.code + ' dibuat.'); route();
      }, 'primary')),
      h('p', { class: 'muted' }, 'Pemain memasukkan kode di game (tidak peka huruf besar/kecil, spasi & tanda hubung diabaikan). Satu pemain sekali per kode; maks 10 kode salah per jam.'));
    const status = c => (c.revoked_at ? badge('dicabut', 'bad') : Date.parse(c.starts_at) > Date.now() ? badge('belum mulai', 'warn')
      : c.ends_at && Date.parse(c.ends_at) <= Date.now() ? badge('berakhir', '') : c.max_uses && c.uses >= c.max_uses ? badge('habis', '') : badge('aktif', 'ok'));
    const list = table([
      { label: 'Kode', get: c => h('span', { class: 'mono' }, c.code) }, { label: 'Judul', get: c => c.title }, { label: 'Isi', cls: 'cut', get: c => itemsText(c.items) },
      { label: 'Dipakai', num: true, get: c => n(c.uses) + (c.max_uses ? ' / ' + n(c.max_uses) : '') }, { label: 'Diklaim', num: true, get: c => n(c.claimed) },
      { label: 'Periode', get: c => [when(c.starts_at), h('div', { class: 'muted' }, c.ends_at ? 's.d. ' + when(c.ends_at) : 'tanpa batas')] },
      { label: 'Status', get: c => status(c) },
      { label: '', get: c => h('div', { class: 'row' }, btn('Salin', async () => { await navigator.clipboard.writeText(c.code); toast('Kode disalin.'); }),
        c.revoked_at ? null : btn('Cabut', async () => {
          if (!(await dialog({ title: 'Cabut kode ' + c.code + '?', ok: 'Cabut', danger: true, body: [h('p', null, 'Kode tidak bisa dipakai lagi. Surat yang sudah didapat pemain tetap.')] }))) return;
          await api('code-revoke', { body: { code: c.code } }); toast('Kode dicabut.'); route();
        }, 'danger')) },
    ], codes, { empty: 'Belum ada kode.' });
    return h('div', null, h('div', { class: 'head' }, h('h1', null, 'Kode Hadiah')), h('div', { class: 'stack' }, card('Buat kode baru', form), card('Semua kode', list)));
  }

  // ---------- EKONOMI ----------
  async function ekonomi() {
    const e = await api('economy');
    const who = { label: 'Pemain', get: r => playerLink(r.id, r.name) };
    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Ekonomi'), btn('Muat ulang', route)),
      h('div', { class: 'tiles' }, tile('Total gold pemain asli', n(e.totals.gold)), tile('Total berry', n(e.totals.berry)),
        tile('Rata-rata gold', n(e.totals.players ? Math.round(e.totals.gold / e.totals.players) : 0)), tile('Posting tukar terbuka', n(e.posts.open)),
        tile('Tukar selesai 7 hari', n(e.posts.done_7d)), tile('Listing pasar aktif', n(e.market.active))),
      h('div', { class: 'grid cols-2' },
        card('Lonjakan gold sejak rekam harian terakhir', h('p', { class: 'muted' }, 'Kenaikan besar dalam sehari bisa tanda curang. Butuh cron harian berjalan minimal sekali.'),
          table([who, { label: 'Gold', num: true, get: r => n(r.gold) }, { label: 'Sebelumnya', num: true, get: r => n(r.prev) },
            { label: 'Naik', num: true, get: r => h('b', { style: r.gain > 1e6 ? 'color:var(--warn)' : null }, (r.gain >= 0 ? '+' : '') + n(r.gain)) }, { label: 'Altar', num: true, get: r => r.altar }],
          e.gains, { empty: 'Belum ada rekam harian.' })),
        card('Gold terbanyak', table([who, { label: 'Gold', num: true, get: r => n(r.gold) }, { label: 'Berry', num: true, get: r => n(r.berry) },
          { label: 'Altar', num: true, get: r => r.altar }, { label: 'Naga', num: true, get: r => r.dragons }, { label: 'Aktif', get: r => ago(r.seen) }], e.top_gold)),
        card('Berry terbanyak', table([who, { label: 'Berry', num: true, get: r => n(r.berry) }, { label: 'Gold', num: true, get: r => n(r.gold) },
          { label: 'Altar', num: true, get: r => r.altar }, { label: 'Aktif', get: r => ago(r.seen) }], e.top_berry)),
        card('Tawaran naga terbaru', table([{ label: 'Waktu', get: r => ago(r.at) }, { label: 'Dari', get: r => r.from }, { label: 'Ke', get: r => r.to },
          { label: 'Naga', get: r => r.dragon || '—' }, { label: 'Harga', num: true, get: r => n(r.price) }, { label: 'Status', get: r => r.status }], e.offers, { empty: 'Belum ada.' }))),
      card('Buku besar terbaru (pindah naga/gold/berry antar pemain)', table([{ label: 'Waktu', get: r => when(r.at) }, { label: 'Pemain', get: r => playerLink(r.player, r.name) },
        { label: 'Jenis', get: r => r.kind }, { label: 'Isi', get: r => r.dragon || (r.amount != null ? n(r.amount) : '—') }, { label: 'Lewat', get: r => [r.via || '', r.who ? ' · ' + r.who : ''] },
        { label: 'Diterapkan', get: r => (r.applied ? ago(r.applied) : badge('belum', 'warn')) }], e.ledger, { empty: 'Kosong.' })));
  }

  // ---------- BOT ----------
  async function bot() {
    const b = await api('bots');
    const quit = (b.kinds || []).reduce((s, k) => s + Number(k.quit || 0), 0);
    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Pemain bot'), btn('Jalankan cron bot sekarang', runCron, 'primary')),
      h('div', { class: 'tiles' }, tile('Total bot', n(b.total)), tile('Masih main', n(b.total - quit), 'ok'), tile('Sudah berhenti', n(quit)),
        tile('Ikut event sekarang', b.event ? n(b.event.playing) : '—'), tile('Level bot tertinggi', b.event ? n(b.event.top) : '—'),
        tile('Cron terakhir', b.last_cron ? ago(b.last_cron.at) : 'belum')),
      h('div', { class: 'grid cols-2' },
        card('Jenis bot', table([{ label: 'Jenis', get: r => (BOTKINDS[r.kind] || r.kind) + ' (' + r.kind + ')' }, { label: 'Jumlah', num: true, get: r => n(r.n) },
          { label: 'Sudah mulai', num: true, get: r => n(r.started) }, { label: 'Berhenti main', num: true, get: r => n(r.quit) }], b.kinds)),
        card('Cara kerja', h('p', null, 'Bot tampil sama untuk semua pemain (dihitung dari benih + jam server). Tiap pagi cron website menaikkan level Menara Event bot secara acak per jenis; bot ikut berebut hadiah peringkat.'),
          h('p', { class: 'muted' }, 'Bot tidak menerima surat hadiah, tidak bisa di-ban, dan tidak bisa dihapus dari sini. Lihat daftar bot di menu Pemain → "Tampilkan bot".'))));
  }

  // ---------- LOG ----------
  async function logView() {
    const rows = await api('log', { params: state.logAction ? { action: state.logAction, limit: 300 } : { limit: 300 } });
    const ACTIONS = ['', 'login', 'login_fail', 'mail_send', 'mail_revoke', 'code_create', 'code_revoke', 'template_save', 'template_delete', 'rename', 'mute', 'unmute',
      'ban', 'unban', 'delete_account', 'report_done', 'report_reopen', 'chat_delete', 'cron'];
    const sel = h('select', { 'aria-label': 'Saring aksi', onchange: e => { state.logAction = e.target.value; route(); } },
      ACTIONS.map(a => h('option', { value: a, selected: a === state.logAction }, a || 'Semua aksi')));
    const target = t => (t && /^[0-9a-f-]{36}$/.test(t) ? playerLink(t, t.slice(0, 8) + '…') : t || '—');
    return h('div', null, h('div', { class: 'head' }, h('h1', null, 'Log admin'), h('div', { class: 'row' }, sel, btn('Muat ulang', route))),
      card(null, table([{ label: 'Waktu', get: r => when(r.at) }, { label: 'Admin', get: r => r.admin }, { label: 'Aksi', get: r => badge(r.action, /fail|ban|delete|revoke/.test(r.action) ? 'warn' : '') },
        { label: 'Target', get: r => target(r.target) }, { label: 'Detail', cls: 'cut mono', get: r => JSON.stringify(r.detail) }], rows, { empty: 'Belum ada catatan.' })));
  }

  // ---------- BOT CHAT (v23) ----------
  async function botchat() {
    const d = await api('botchat');
    const cfg = d.config || {};
    const bands = Array.isArray(cfg.bands) && cfg.bands.length === 24 ? cfg.bands.slice() : Array(24).fill(5);

    // pengaturan
    const enabled = h('input', { type: 'checkbox', checked: !!cfg.enabled });
    const daily = h('input', { type: 'number', min: 0, max: 5000, value: cfg.daily_count ?? 300 });
    const quiet = h('input', { type: 'number', min: 0, max: 100000, value: cfg.quiet_real ?? 8 });
    const busy = h('input', { type: 'number', min: 0, max: 1, step: 0.05, value: cfg.busy_skip ?? 0.5 });
    const bandInputs = bands.map((v, i) => h('label', { style: 'display:flex;flex-direction:column;gap:2px;font-size:11px', class: 'muted' },
      h('span', null, String(i).padStart(2, '0') + 'h'), h('input', { type: 'number', min: 0, max: 100, value: v, style: 'width:100%' })));
    async function saveConfig() {
      await api('botchat-config', { body: {
        enabled: enabled.checked, daily_count: Number(daily.value), quiet_real: Number(quiet.value), busy_skip: Number(busy.value),
        bands: bandInputs.map(l => Number(l.querySelector('input').value)) } });
      toast('Pengaturan bot chat disimpan.'); route();
    }
    const configCard = card('Pengaturan',
      h('label', { class: 'check' }, enabled, 'Aktifkan bot chat (pesan bot muncul di chat global saat jadwal jatuh tempo)'),
      h('div', { class: 'two' }, h('label', null, 'Target pesan / hari', daily),
        h('label', null, 'Ambang "ramai" (pesan pemain asli / 30 mnt)', quiet), h('label', null, 'Bagian dilewati saat ramai (0–1)', busy)),
      h('h3', null, 'Kepadatan per jam UTC (ritme WIB = UTC+7)'),
      h('div', { style: 'display:grid;grid-template-columns:repeat(8,1fr);gap:6px' }, bandInputs),
      h('div', { class: 'row' }, btn('Simpan pengaturan', saveConfig, 'primary')));

    // kalimat
    const lq = h('input', { type: 'search', placeholder: 'Cari kalimat…' });
    const llang = h('select', null, [['', 'Semua bahasa'], ['en', 'English'], ['id', 'Indonesia']].map(([v, l]) => h('option', { value: v }, l)));
    const lcat = h('input', { placeholder: 'kategori (opsional)' });
    const lact = h('select', null, [['', 'Semua'], ['true', 'Aktif'], ['false', 'Nonaktif']].map(([v, l]) => h('option', { value: v }, l)));
    const linesBox = h('div', null, h('p', { class: 'loading' }, 'Memuat…'));
    async function loadLines() {
      const rows = await api('botchat-lines', { params: { q: lq.value.trim(), lang: llang.value, category: lcat.value.trim(), active: lact.value, limit: 500 } });
      linesBox.replaceChildren(table([
        { label: '#', num: true, get: r => r.id }, { label: 'Kalimat', cls: 'cut', get: r => r.body }, { label: 'Bhs', get: r => r.lang },
        { label: 'Kategori', get: r => r.category }, { label: 'Token', get: r => (r.needs && r.needs.length ? r.needs.join(', ') : '—') },
        { label: 'Status', get: r => (r.active ? badge('aktif', 'ok') : badge('nonaktif', '')) },
        { label: '', get: r => h('div', { class: 'row' }, btn('Ubah', () => editLine(r)),
          btn(r.active ? 'Nonaktifkan' : 'Aktifkan', async () => { await api('botchat-line-save', { body: { id: r.id, body: r.body, category: r.category, lang: r.lang, active: !r.active } }); loadLines(); })) },
      ], rows, { empty: 'Belum ada kalimat.' }), h('p', { class: 'muted' }, rows.length + ' kalimat (maks 500).'));
    }
    async function editLine(r) {
      const body = h('textarea', { maxlength: 200, value: r ? r.body : '' });
      const lang = h('select', null, [['en', 'English'], ['id', 'Indonesia']].map(([v, l]) => h('option', { value: v, selected: r && r.lang === v }, l)));
      const cat = h('input', { value: r ? r.category : 'ambient', maxlength: 40 });
      if (!(await dialog({ title: r ? 'Ubah kalimat' : 'Kalimat baru', ok: 'Simpan', body: [
        h('label', null, 'Kalimat (≤ 200 huruf, tanpa < >)', body),
        h('div', { class: 'two' }, h('label', null, 'Bahasa', lang), h('label', null, 'Kategori', cat)),
        h('p', { class: 'muted' }, 'Token (diisi game, hanya bot): {{best}} {{bestRarity}} {{bestLevel}} {{dragons}} {{stage}} {{event}}. Jangan kalimat yang hanya berisi token.')] }))) return;
      await api('botchat-line-save', { body: { id: r ? r.id : null, body: body.value, lang: lang.value, category: cat.value } });
      toast('Kalimat disimpan.'); loadLines();
    }
    async function importLines() {
      const ta = h('textarea', { rows: 10, placeholder: 'Satu kalimat per baris. Awali "id:" untuk Indonesia atau "en:" untuk Inggris (default en).' });
      const cat = h('input', { value: 'ambient', maxlength: 40 });
      if (!(await dialog({ title: 'Impor kalimat massal', ok: 'Impor', body: [h('label', null, 'Kalimat (satu per baris)', ta), h('label', null, 'Kategori untuk semua', cat)] }))) return;
      const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean).map(s => {
        let lang = 'en', body = s; const m = s.match(/^(en|id):\s*(.*)$/i); if (m) { lang = m[1].toLowerCase(); body = m[2].trim(); }
        return { body, lang, category: cat.value.trim() || 'ambient' };
      }).filter(x => x.body && x.body.length <= 200 && !/[<>]/.test(x.body));
      if (!lines.length) { toast('Tidak ada kalimat sah.', true); return; }
      const r = await api('botchat-lines-import', { body: { lines } });
      toast('Ditambah ' + r.added + ' kalimat.'); loadLines();
    }
    const linesForm = h('form', { class: 'row', onsubmit: e => { e.preventDefault(); loadLines(); } }, lq, llang, lcat, lact, h('button', { class: 'btn' }, 'Saring'));
    loadLines();
    const linesCard = card('Kalimat bot', h('div', { class: 'row' }, btn('+ Kalimat baru', () => editLine(null), 'primary'), btn('Impor massal', importLines)), linesForm, linesBox);

    // jadwal hari ini
    const schedBox = h('div', null, h('p', { class: 'loading' }, 'Memuat…'));
    async function loadSched() {
      const rows = await api('botchat-schedule', { params: { limit: 500 } });
      schedBox.replaceChildren(table([
        { label: 'Jam (UTC)', get: r => when(r.at) }, { label: 'Bot', get: r => r.bot }, { label: 'Kalimat', cls: 'cut', get: r => r.body },
        { label: 'Status', get: r => (r.sent ? badge('terkirim', 'ok') : r.released ? badge('dilewati', '') : badge('menunggu', 'warn')) },
        { label: '', get: r => btn('Hapus', async () => { await api('botchat-delete', { body: { scope: 'one', id: r.id } }); loadSched(); }, 'danger') },
      ], rows, { empty: 'Belum ada jadwal hari ini. Cron menyusun tiap 00:10 UTC saat fitur aktif.' }));
    }
    loadSched();
    const schedCard = card('Jadwal hari ini (UTC)',
      h('div', { class: 'row' }, btn('Muat ulang', loadSched), btn('Hapus semua yang menunggu', async () => {
        if (!(await dialog({ title: 'Hapus semua jadwal yang belum tayang?', ok: 'Hapus', danger: true }))) return;
        const r = await api('botchat-delete', { body: { scope: 'upcoming' } }); toast('Dihapus ' + r.deleted + ' jadwal.'); loadSched();
      }, 'danger')), schedBox);

    async function sendNow() {
      const body = h('textarea', { maxlength: 200, placeholder: 'Kosongkan untuk kalimat aktif acak.' });
      if (!(await dialog({ title: 'Kirim pesan bot uji sekarang', ok: 'Kirim', body: [h('label', null, 'Kalimat (opsional)', body),
        h('p', { class: 'muted' }, 'Satu pesan bot acak langsung muncul di chat global. Token tidak diisi di sini (hanya di game).')] }))) return;
      await api('botchat-send-now', { body: { body: body.value } });
      toast('Terkirim sebagai pesan bot.'); loadSched();
    }

    return h('div', null,
      h('div', { class: 'head' }, h('h1', null, 'Bot chat'), h('div', { class: 'row' }, btn('Kirim uji', sendNow), btn('Muat ulang', route))),
      h('div', { class: 'tiles' },
        tile('Status', cfg.enabled ? 'Aktif' : 'Nonaktif', cfg.enabled ? 'ok' : 'warn'), tile('Target / hari', n(cfg.daily_count)),
        tile('Kalimat aktif', n(d.lines.active) + ' / ' + n(d.lines.total)), tile('Terjadwal hari ini', n(d.today.scheduled)),
        tile('Terkirim hari ini', n(d.today.sent), 'ok'), tile('Menunggu', n(d.today.upcoming))),
      h('p', { class: 'muted' }, 'Bot hanya menulis suasana (sapaan, pamer, komentar event, reaksi) dan tak pernah membalas/menyebut pemain asli. Pesan muncul di chat global dengan jam aslinya saat pemain membuka chat.'),
      h('div', { class: 'grid cols-2' }, configCard,
        card('Terkirim terbaru', table([{ label: 'Jam', get: r => ago(r.at) }, { label: 'Bot', get: r => r.name }, { label: 'Pesan', cls: 'cut', get: r => r.body }], d.recent, { empty: 'Belum ada pesan bot.' }))),
      schedCard, linesCard);
  }

  // ---------- router & login ----------
  const VIEWS = { ringkasan, pemain, moderasi, event: eventView, hadiah, kode, ekonomi, bot, botchat, log: logView };
  let routeToken = 0;
  async function route() {
    const [name, arg] = (location.hash.slice(1) || 'ringkasan').split('/');
    const key = VIEWS[name] ? name : 'ringkasan';
    for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('on', a.getAttribute('href') === '#' + key);
    const view = $('#view');
    const token = ++routeToken;
    view.replaceChildren(h('p', { class: 'loading' }, 'Memuat…'));
    try {
      const node = await VIEWS[key](arg ? decodeURIComponent(arg) : undefined);
      if (token === routeToken) view.replaceChildren(node);
    } catch (e) {
      if (token === routeToken && !(e instanceof ApiError && /Sesi berakhir/.test(e.message))) view.replaceChildren(errBox(e));
    }
  }

  function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#login-msg').textContent = msg || '';
    $('#login-email').focus();
  }
  function start(email) {
    $('#who').textContent = email;
    $('#login').hidden = true; $('#app').hidden = false;
    $('#login-pass').value = '';
    route();
  }
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.submitter || $('#login-form button'); b.disabled = true;
    $('#login-msg').textContent = '';
    try {
      const r = await api('login', { body: { email: $('#login-email').value, password: $('#login-pass').value } });
      start(r.email);
    } catch (err) { $('#login-msg').textContent = err.message; }
    finally { b.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => { try { await api('logout', { body: {} }); } catch (e) { /* tetap keluar */ } showLogin('Anda sudah keluar.'); });
  window.addEventListener('hashchange', () => { if (!$('#app').hidden) route(); });

  api('me').then(d => start(d.email)).catch(e => showLogin(/Sesi berakhir|Silakan login/.test(e.message) ? '' : e.message));
})();
