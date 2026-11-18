/* =====================================================================
 * Admin panel (#/admin) - only for accounts with role ADMIN.
 *  - users: total, new today / 7 days, active players today
 *  - traffic: online now, visitors & page views today, daily chart
 *  - games: plays per day, most played games, certificates issued
 *  - user list with progress (search, sort, paging) + per-user detail
 * Refreshes automatically every 30 seconds.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const { esc, fmt, $, $$ } = TM;
  const C_VIEWS = '#2a78d6';   // categorical slot 1 (validated palette)
  const C_VISITORS = '#eb6834'; // categorical slot 2
  const GAME_NAMES = () => Object.fromEntries(TM.Games.map((g) => [g.id.toUpperCase(), `${g.icon} ${g.name}`]));
  const ago = (iso) => {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  };
  const shortDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  function admin(root) {
    if (!TM.Api.isAdmin()) {
      root.innerHTML = `<section class="page-head center"><h1>🛡 Admin Panel</h1>
        <p class="lead">This area is only for administrators. Please log in with an admin account.</p>
        <button class="btn btn-primary" data-login>Log in as admin</button></section>`;
      $('[data-login]', root).addEventListener('click', () => TM.Auth.open({ reason: 'Log in with your admin account.', onSuccess: () => TM.App.render() }));
      return;
    }

    root.innerHTML = `
      <section class="page-head admin-head">
        <div><h1>🛡 Admin Panel</h1><p class="lead">Users, traffic and player progress at a glance.</p></div>
        <div class="admin-actions"><span class="muted small" data-updated></span>
          <button class="btn btn-ghost btn-sm" data-refresh>↻ Refresh</button></div>
      </section>

      <section class="kpi-groups">
        <div class="kpi-group"><h3>👥 Users</h3><div class="kpi-grid" data-kpi="users"></div></div>
        <div class="kpi-group"><h3>📈 Traffic</h3><div class="kpi-grid" data-kpi="traffic"></div></div>
        <div class="kpi-group"><h3>🎮 Games</h3><div class="kpi-grid" data-kpi="games"></div></div>
      </section>

      <section class="panel-card admin-card">
        <div class="card-head"><h2>Traffic</h2>
          <div class="chips range-chips"><button class="chip" data-days="7">7 days</button><button class="chip active" data-days="14">14 days</button><button class="chip" data-days="30">30 days</button></div></div>
        <div class="chart-legend admin-legend"><span><i style="background:${C_VIEWS}"></i>Page views</span><span><i style="background:${C_VISITORS}"></i>Unique visitors</span></div>
        <div class="chart" data-chart="traffic"></div>
        <h3 class="chart-title">Games played per day</h3>
        <div class="chart" data-chart="games"></div>
        <details class="table-view"><summary>Show as table</summary><div data-table="traffic"></div></details>
      </section>

      <section class="two-col">
        <div class="panel-card admin-card"><h2>Most played games</h2><div data-games></div></div>
        <div class="panel-card admin-card"><h2>Top players by racing progress</h2><div data-top></div></div>
      </section>

      <section class="panel-card admin-card">
        <div class="card-head"><h2>All users &amp; progress</h2>
          <div class="user-tools">
            <input type="search" class="admin-search" placeholder="Search username or email..." aria-label="Search users">
            <select class="admin-sort" aria-label="Sort users">
              <option value="newest">Newest first</option><option value="levels">Most levels</option>
              <option value="wpm">Best WPM</option><option value="games">Most games</option>
            </select>
          </div></div>
        <div data-users><div class="loader"></div></div>
        <div class="pager" data-pager></div>
      </section>`;

    let days = 14, q = '', sort = 'newest', page = 0;

    // ------------------------------------------------------------ KPIs
    const kpi = (icon, label, value, note, cls = '') =>
      `<div class="kpi ${cls}"><span class="kpi-label">${icon} ${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`;

    async function loadOverview() {
      const o = await TM.Api.admin.overview();
      $('[data-kpi="users"]', root).innerHTML =
        kpi('👤', 'Total users', fmt.int(o.totalUsers), 'registered accounts') +
        kpi('✨', 'New today', fmt.int(o.newUsersToday), `${fmt.int(o.newUsersLast7Days)} in last 7 days`) +
        kpi('🏃', 'Active players today', fmt.int(o.activePlayersToday), 'logged-in users who played');
      $('[data-kpi="traffic"]', root).innerHTML =
        kpi('<i class="live-dot"></i>', 'Online now', fmt.int(o.onlineNow), 'active in last 2 min', 'live') +
        kpi('🧑‍🤝‍🧑', 'Visitors today', fmt.int(o.visitorsToday), `${fmt.int(o.totalVisitors)} all time`) +
        kpi('📄', 'Page views today', fmt.int(o.pageViewsToday), `${fmt.int(o.totalPageViews)} all time`);
      $('[data-kpi="games"]', root).innerHTML =
        kpi('🎮', 'Games today', fmt.int(o.gamesToday), `${fmt.int(o.totalGames)} all time (incl. guests)`) +
        kpi('🎓', 'Certificates issued', fmt.int(o.certificatesIssued), `won level ${TM.CERT_LEVEL}`) +
        kpi('💾', 'Scores saved', fmt.int(o.savedScores), 'by logged-in users');
      $('[data-updated]', root).textContent = 'Updated ' + new Date(o.generatedAt).toLocaleTimeString();
    }

    // ------------------------------------------------------------ traffic charts
    async function loadTraffic() {
      const data = await TM.Api.admin.traffic(days);
      lineChart($('[data-chart="traffic"]', root), data, [
        { key: 'pageViews', label: 'Page views', color: C_VIEWS },
        { key: 'uniqueVisitors', label: 'Unique visitors', color: C_VISITORS }
      ]);
      barChart($('[data-chart="games"]', root), data, { key: 'gamesPlayed', label: 'Games played', color: C_VIEWS });
      $('[data-table="traffic"]', root).innerHTML = `<table class="table"><thead><tr><th>Date</th><th>Page views</th><th>Unique visitors</th><th>Games played</th><th>New users</th></tr></thead>
        <tbody>${data.slice().reverse().map((d) => `<tr><td>${shortDate(d.day)}</td><td>${fmt.int(d.pageViews)}</td><td>${fmt.int(d.uniqueVisitors)}</td><td>${fmt.int(d.gamesPlayed)}</td><td>${fmt.int(d.newUsers)}</td></tr>`).join('')}</tbody></table>`;
    }

    async function loadGames() {
      const games = await TM.Api.admin.games();
      const names = GAME_NAMES();
      const max = Math.max(1, ...games.map((g) => g.plays));
      $('[data-games]', root).innerHTML = games.filter((g) => names[g.gameType]).map((g) => `
        <div class="hbar"><span class="hbar-label">${esc(names[g.gameType])}</span>
          <div class="hbar-track"><i style="width:${(g.plays / max) * 100}%"></i></div>
          <b>${fmt.int(g.plays)}</b><small>${fmt.int(g.playsLast7Days)} this week</small></div>`).join('')
        || '<p class="empty">No games played yet.</p>';
    }

    async function loadTop() {
      const top = await TM.Api.admin.users('', 'levels', 0, 5);
      $('[data-top]', root).innerHTML = top.content.length ? top.content.map((u, i) => `
        <div class="top-row" data-user="${u.id}"><span class="rank">${i + 1}</span>
          <div class="tr-name"><b>${esc(u.username)}</b>${u.certificate ? ' <span class="cert-badge" title="Certificate earned">🎓</span>' : ''}<small>${fmt.num(u.bestWpm, 0)} WPM · ${u.stars} ★</small></div>
          <div class="tr-progress"><div class="bar"><i style="width:${(u.levelsCompleted / TM.RACING_TOTAL) * 100}%"></i></div><small>${u.levelsCompleted}/${TM.RACING_TOTAL} levels</small></div></div>`).join('')
        : '<p class="empty">No users yet.</p>';
    }

    // ------------------------------------------------------------ users table
    async function loadUsers() {
      const box = $('[data-users]', root);
      const res = await TM.Api.admin.users(q, sort, page, 15);
      if (!res.content.length) { box.innerHTML = `<p class="empty">${q ? 'No users match your search.' : 'No registered users yet.'}</p>`; $('[data-pager]', root).innerHTML = ''; return; }
      box.innerHTML = `<div class="table-wrap"><table class="table users-table">
        <thead><tr><th>User</th><th>Joined</th><th>Last active</th><th>Games</th><th>Best WPM</th><th>Accuracy</th><th>Racing progress</th><th>Stars</th><th>Certificate</th></tr></thead>
        <tbody>${res.content.map((u) => `<tr data-user="${u.id}" tabindex="0">
          <td><b>${esc(u.username)}</b>${u.role === 'ADMIN' ? ' <span class="role-badge">admin</span>' : ''}<br><small class="muted">${esc(u.email)}</small></td>
          <td>${fmt.date(u.joinedAt)}</td>
          <td>${ago(u.lastPlayedAt || u.lastLoginAt)}</td>
          <td>${fmt.int(u.gamesPlayed)}</td>
          <td>${fmt.num(u.bestWpm, 1)}</td>
          <td>${fmt.num(u.bestAccuracy, 1)}%</td>
          <td class="prog-cell"><div class="bar"><i style="width:${(u.levelsCompleted / TM.RACING_TOTAL) * 100}%"></i></div>
            <small>${u.levelsCompleted}/${TM.RACING_TOTAL} done · at level ${u.highestLevel}</small></td>
          <td>${u.stars} ★</td>
          <td>${u.certificate ? '<span class="cert-yes">🎓 Earned</span>' : `<span class="muted">${Math.min(u.levelsCompleted, TM.CERT_LEVEL)}/${TM.CERT_LEVEL}</span>`}</td>
        </tr>`).join('')}</tbody></table></div>`;
      $('[data-pager]', root).innerHTML = `<span class="muted small">${fmt.int(res.totalElements)} users · page ${res.page + 1} of ${Math.max(1, res.totalPages)}</span>
        <button class="btn btn-ghost btn-sm" data-pg="-1" ${res.page <= 0 ? 'disabled' : ''}>‹ Prev</button>
        <button class="btn btn-ghost btn-sm" data-pg="1" ${res.page + 1 >= res.totalPages ? 'disabled' : ''}>Next ›</button>`;
    }

    // ------------------------------------------------------------ events
    root.addEventListener('click', (e) => {
      const r = e.target.closest('[data-user]');
      if (r) { userDetail(Number(r.dataset.user)); return; }
      const pg = e.target.closest('[data-pg]');
      if (pg && !pg.disabled) { page += Number(pg.dataset.pg); loadUsers().catch(fail); return; }
      const d = e.target.closest('[data-days]');
      if (d) {
        days = Number(d.dataset.days);
        $$('.range-chips .chip', root).forEach((c) => c.classList.toggle('active', c === d));
        loadTraffic().catch(fail);
      }
    });
    root.addEventListener('keydown', (e) => {
      const r = e.target.closest && e.target.closest('tr[data-user]');
      if (r && e.key === 'Enter') userDetail(Number(r.dataset.user));
    });
    let t;
    $('.admin-search', root).addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { q = e.target.value; page = 0; loadUsers().catch(fail); }, 300);
    });
    $('.admin-sort', root).addEventListener('change', (e) => { sort = e.target.value; page = 0; loadUsers().catch(fail); });
    $('[data-refresh]', root).addEventListener('click', () => refreshAll());

    function fail(err) {
      if (err.status === 403 || err.status === 401) {
        TM.toast('Admin access required', 'error');
        TM.App.render();
      } else {
        TM.toast('Admin data could not be loaded: ' + err.message, 'error');
      }
    }
    function refreshAll() {
      return Promise.all([loadOverview(), loadTraffic(), loadGames(), loadTop(), loadUsers()]).catch(fail);
    }
    refreshAll();
    const timer = setInterval(() => { if (!document.hidden) Promise.all([loadOverview(), loadTraffic(), loadGames()]).catch(() => {}); }, 30000);
    const onResize = () => loadTraffic().catch(() => {});
    window.addEventListener('resize', onResize);
    return () => { clearInterval(timer); window.removeEventListener('resize', onResize); };
  }

  // ==================================================================
  // User detail modal
  // ==================================================================
  async function userDetail(id) {
    let d;
    try { d = await TM.Api.admin.user(id); } catch (e) { TM.toast(e.message, 'error'); return; }
    const u = d.user, s = d.stats, names = GAME_NAMES();
    const typed = s.correctChars + s.incorrectChars;
    TM.modal(`
      <div class="user-detail">
        <div class="ud-head"><div class="ud-avatar">${esc(u.username.slice(0, 1).toUpperCase())}</div>
          <div><h2>${esc(u.username)} ${u.role === 'ADMIN' ? '<span class="role-badge">admin</span>' : ''}</h2>
            <p class="muted">${esc(u.email)} · joined ${fmt.date(u.joinedAt)} · last login ${ago(u.lastLoginAt)}</p></div></div>
        <div class="res-grid ud-grid">
          <div class="res-tile"><b>${fmt.int(s.totalGames)}</b><span>Games played</span></div>
          <div class="res-tile"><b>${fmt.num(s.bestWpm, 1)}</b><span>Best WPM</span></div>
          <div class="res-tile"><b>${fmt.num(s.averageWpm, 1)}</b><span>Average WPM</span></div>
          <div class="res-tile"><b>${fmt.num(typed ? s.lifetimeAccuracy : 0, 1)}%</b><span>Accuracy</span></div>
          <div class="res-tile"><b>${fmt.int(s.totalWords)}</b><span>Words typed</span></div>
          <div class="res-tile"><b>${fmt.time(s.totalTimeSeconds)}</b><span>Time typing</span></div>
          <div class="res-tile"><b>${fmt.int(u.totalScore)}</b><span>Total score</span></div>
          <div class="res-tile"><b>${u.certificate ? '🎓 Yes' : 'Not yet'}</b><span>Certificate</span></div>
        </div>
        <h3>Racing progress</h3>
        <div class="ud-racing"><div class="bar"><i style="width:${(u.levelsCompleted / TM.RACING_TOTAL) * 100}%"></i></div>
          <span><b>${u.levelsCompleted}</b>/${TM.RACING_TOTAL} levels completed · currently at level <b>${u.highestLevel}</b> · ${u.stars} ★</span></div>
        <h3>Best score per game</h3>
        <div class="ud-games">${Object.keys(s.bestPerGame).length ? Object.entries(s.bestPerGame).map(([k, v]) =>
          `<span>${esc(names[k] || k)} <b>${fmt.int(v)}</b></span>`).join('') : '<span class="muted">No saved games yet.</span>'}</div>
        <h3>Recent games</h3>
        ${d.recentGames.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>When</th><th>Game</th><th>Result</th><th>Score</th><th>WPM</th><th>Accuracy</th></tr></thead><tbody>
          ${d.recentGames.map((h) => `<tr><td>${fmt.date(h.playedAt)}</td><td>${esc(names[h.gameType] || h.gameType)}${h.level ? ' · L' + h.level : ''}</td>
            <td><span class="outcome ${h.outcome.toLowerCase()}">${esc(h.outcome)}</span></td><td>${fmt.int(h.score)}</td><td>${fmt.num(h.wpm, 1)}</td><td>${fmt.num(h.accuracy, 1)}%</td></tr>`).join('')}
          </tbody></table></div>` : '<p class="muted">No saved games yet.</p>'}
      </div>`, { className: 'modal-user' });
  }

  // ==================================================================
  // SVG charts with hover tooltips (no external libraries)
  // ==================================================================
  const PAD = { l: 44, r: 14, t: 12, b: 28 };

  function niceMax(v) {
    if (v <= 20) return Math.max(4, Math.ceil(v / 4) * 4); // 4 even integer steps
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / p * 2) / 2 * p;
  }

  function frame(el, data, maxVal, height) {
    const w = Math.max(280, el.clientWidth || 600), h = height;
    const iw = w - PAD.l - PAD.r, ih = h - PAD.t - PAD.b;
    const max = niceMax(maxVal);
    const step = data.length > 1 ? iw / (data.length - 1) : 0;
    const x = (i) => PAD.l + (data.length > 1 ? i * step : iw / 2);
    const y = (v) => PAD.t + ih - (v / max) * ih;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
    const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 70)));
    const grid = ticks.map((t) => `<line x1="${PAD.l}" x2="${w - PAD.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>
      <text x="${PAD.l - 8}" y="${y(t) + 4}" class="axis" text-anchor="end">${fmt.int(t)}</text>`).join('');
    const xl = data.map((d, i) => (i % every === 0 || i === data.length - 1)
      ? `<text x="${x(i)}" y="${h - 8}" class="axis" text-anchor="middle">${shortDate(d.day)}</text>` : '').join('');
    return { w, h, iw, ih, x, y, step, grid, xl };
  }

  function tooltipFor(el) {
    let tip = $('.chart-tip', el);
    if (!tip) { tip = TM.html('<div class="chart-tip" hidden></div>'); el.appendChild(tip); }
    return tip;
  }
  function placeTip(el, tip, px, py, htmlStr) {
    tip.innerHTML = htmlStr; tip.hidden = false;
    const left = Math.min(Math.max(px + 12, 4), el.clientWidth - tip.offsetWidth - 4);
    tip.style.left = left + 'px'; tip.style.top = Math.max(0, py - tip.offsetHeight - 8) + 'px';
  }

  /** Multi-series line chart (one shared y-axis) with crosshair tooltip. */
  function lineChart(el, data, series) {
    const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key])));
    const f = frame(el, data, max, 240);
    const lines = series.map((s) => {
      const pts = data.map((d, i) => `${f.x(i)},${f.y(d[s.key])}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    el.innerHTML = `<svg width="${f.w}" height="${f.h}" role="img" aria-label="Page views and unique visitors per day">${f.grid}${f.xl}
      <line class="crosshair" y1="${PAD.t}" y2="${PAD.t + f.ih}" hidden/>${lines}<g class="dots"></g>
      <rect x="${PAD.l}" y="${PAD.t}" width="${f.iw}" height="${f.ih}" fill="transparent" class="hit"/></svg>`;
    const svg = $('svg', el), hit = $('.hit', svg), cross = $('.crosshair', svg), dots = $('.dots', svg), tip = tooltipFor(el);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const i = TM.clamp(Math.round((e.clientX - r.left - PAD.l) / (f.step || 1)), 0, data.length - 1);
      const d = data[i], cx = f.x(i);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.removeAttribute('hidden');
      dots.innerHTML = series.map((s) => `<circle cx="${cx}" cy="${f.y(d[s.key])}" r="5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('');
      placeTip(el, tip, cx, Math.min(...series.map((s) => f.y(d[s.key]))),
        `<b>${shortDate(d.day)}</b>${series.map((s) => `<div><i style="background:${s.color}"></i>${s.label}<span>${fmt.int(d[s.key])}</span></div>`).join('')}`);
    });
    hit.addEventListener('mouseleave', () => { cross.setAttribute('hidden', ''); dots.innerHTML = ''; tip.hidden = true; });
  }

  /** Single-series bar chart with per-bar tooltip. */
  function barChart(el, data, s) {
    const max = Math.max(1, ...data.map((d) => d[s.key]));
    const f = frame(el, data, max, 170);
    const slot = f.iw / data.length, bw = Math.max(3, Math.min(28, slot - 4));
    const xc = (i) => PAD.l + slot * i + slot / 2;
    const bars = data.map((d, i) => {
      const v = d[s.key], top = f.y(v), hgt = PAD.t + f.ih - top;
      const r = Math.min(4, bw / 2, hgt);
      return `<g class="bar-g" data-i="${i}"><rect x="${xc(i) - slot / 2}" y="${PAD.t}" width="${slot}" height="${f.ih}" fill="transparent"/>
        ${v > 0 ? `<path d="M${xc(i) - bw / 2},${PAD.t + f.ih} V${top + r} Q${xc(i) - bw / 2},${top} ${xc(i) - bw / 2 + r},${top} H${xc(i) + bw / 2 - r} Q${xc(i) + bw / 2},${top} ${xc(i) + bw / 2},${top + r} V${PAD.t + f.ih} Z" fill="${s.color}"/>` : ''}</g>`;
    }).join('');
    const xl = data.map((d, i) => {
      const every = Math.ceil(data.length / Math.max(2, Math.floor(f.iw / 70)));
      return (i % every === 0 || i === data.length - 1) ? `<text x="${xc(i)}" y="${f.h - 8}" class="axis" text-anchor="middle">${shortDate(d.day)}</text>` : '';
    }).join('');
    el.innerHTML = `<svg width="${f.w}" height="${f.h}" role="img" aria-label="${s.label} per day">${f.grid}${xl}${bars}</svg>`;
    const tip = tooltipFor(el);
    $$('.bar-g', el).forEach((g) => {
      g.addEventListener('mouseenter', () => {
        const i = Number(g.dataset.i), d = data[i];
        g.classList.add('hover');
        placeTip(el, tip, xc(i), f.y(d[s.key]), `<b>${shortDate(d.day)}</b><div><i style="background:${s.color}"></i>${s.label}<span>${fmt.int(d[s.key])}</span></div>
          <div class="muted-row">New users<span>${fmt.int(d.newUsers)}</span></div>`);
      });
      g.addEventListener('mouseleave', () => { g.classList.remove('hover'); tip.hidden = true; });
    });
  }

  TM.Pages = TM.Pages || {};
  TM.Pages.admin = admin;
})(window.TM);
