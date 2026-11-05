// Bagian Event website (pengguna 5 Nov): event Menara Event yang sedang berjalan, tanggalnya, hadiah peringkat, toko event
// (assets/event/events.json — dibangun dari kode game, tools/events-from-unity.py) dan peringkat 1–100 dari /api/event (Supabase,
// bot ikut). Tanpa API (uji lokal / env belum disetel) kalender & hadiah tetap tampil, papan menampilkan pesan.
(function () {
  'use strict';
  const root = document.getElementById('event');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const VER = (document.currentScript && new URL(document.currentScript.src, location.href).searchParams.get('v')) || '';
  const q = VER ? '?v=' + VER : '';
  const DAY = 86400000, SHOW = 10;
  const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const clock = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function pick(cal, id, now) {
    const list = cal.events;
    let i = id ? list.findIndex(e => e.id === id) : -1;
    if (i < 0) i = list.findIndex(e => now >= Date.parse(e.starts) && now < Date.parse(e.ends));
    if (i < 0) i = list.findIndex(e => now < Date.parse(e.starts)); // belum ada yang berjalan: tampilkan yang berikutnya
    return i < 0 ? null : { ev: list[i], next: list[i + 1] || null };
  }

  function text(t, ev) {
    return t.replace('{name}', ev.name).replace('{element}', ev.element).replace('{edition}', ev.name + ' Edition ' + new Date(ev.starts).getUTCFullYear());
  }

  function fill(cal, ev, next, now) {
    const s = Date.parse(ev.starts), e = Date.parse(ev.ends), running = now >= s && now < e;
    $('ev-status').textContent = running ? 'Now running' : 'Coming up';
    $('ev-name').textContent = ev.name;
    $('ev-title').textContent = ev.name + '.';
    const left = running ? plural(Math.max(1, Math.ceil((e - now) / DAY)), 'day') + ' left'
                         : 'starts in ' + plural(Math.max(1, Math.ceil((s - now) / DAY)), 'day');
    $('ev-dates').textContent = day.format(s) + ' – ' + day.format(e) + ' · ' + left;
    $('ev-boss').textContent = ev.boss;
    $('ev-coin').textContent = ev.coin;
    $('ev-egg').textContent = 'Legendary ' + ev.element + ' dragon';
    $('ev-next').textContent = next ? 'Next up: ' + next.name + ', from ' + day.format(Date.parse(next.starts)) + '.' : '';

    $('ev-ranks').tBodies[0].innerHTML = cal.rankRewards.map(r =>
      `<tr><td>${r.from === r.to ? '#' + r.from : '#' + r.from + '–' + r.to.toLocaleString('en')}</td><td>${esc(r.label)}</td></tr>`).join('');
    $('ev-shop').tBodies[0].innerHTML = cal.shop.map(i =>
      `<tr><td>${esc(text(i.name, ev))}<small>${esc(text(i.note, ev))}${i.limit > 1 ? ' · up to ' + i.limit : ''}</small></td>`
      + `<td>${i.price.toLocaleString('en')} ${esc(ev.coin)}</td></tr>`).join('');
  }

  function board(live, all) {
    const list = $('ev-board'), more = $('ev-more'), meta = $('ev-meta');
    if (!live) { meta.textContent = 'Live leaderboard opens soon'; list.innerHTML = '<li class="board-empty">Rankings appear here once players start climbing.</li>'; return; }
    const top = live.top || [];
    meta.textContent = plural(live.total || top.length, 'player').replace(/^(\d+)/, n => (+n).toLocaleString('en'))
      + (live.updated ? ' · updated ' + clock.format(new Date(live.updated)) : '');
    if (!top.length) { list.innerHTML = '<li class="board-empty">No one has cleared a level yet. Be the first.</li>'; more.hidden = true; return; }
    const rows = all ? top : top.slice(0, SHOW);
    list.style.setProperty('--rows', Math.ceil(rows.length / 2));
    list.innerHTML = rows.map(r => `<li${r.rank <= 3 ? ' class="podium"' : ''}><span class="rk">${r.rank}</span>`
      + `<span class="nm">${esc(r.name)}</span><span class="lv">Lv ${r.level}</span></li>`).join('');
    more.hidden = all || top.length <= SHOW;
    more.textContent = 'Show all ' + top.length;
  }

  const now = Date.now();
  Promise.all([
    fetch('/assets/event/events.json' + q).then(r => r.json()),
    fetch('/api/event').then(r => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([cal, live]) => {
    const p = pick(cal, live && live.event && live.event.id, now);
    if (!p) { $('ev-status').textContent = 'Between events'; return; }
    fill(cal, p.ev, p.next, now);
    const valid = live && (!live.event || live.event.id === p.ev.id) ? live : null;
    board(valid, false);
    $('ev-more').addEventListener('click', () => board(valid, true));
  }).catch(() => { $('ev-meta').textContent = 'Event info unavailable right now'; });
})();
