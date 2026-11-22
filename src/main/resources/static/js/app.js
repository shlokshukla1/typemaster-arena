/* =====================================================================
 * App bootstrap + hash router.
 *   #/home  #/games  #/racing  #/practice  #/leaderboard  #/progress
 *   #/game/<id>?option=value   (e.g. #/game/racing?level=3)
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const view = () => document.getElementById('app');
  let cleanup = null;
  let shell = null;

  function parseHash() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {};
    new URLSearchParams(query || '').forEach((v, k) => { params[k] = v; });
    return { page: parts[0] || 'home', id: parts[1], params };
  }

  function teardown() {
    if (shell) { shell.destroy(); shell = null; }
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    TM.$$('.modal-backdrop').forEach((m) => m.remove());
  }

  function render() {
    const { page, id, params } = parseHash();
    // Admin accounts stay inside the admin panel - every other page redirects back to #/admin.
    if (TM.Api.isAdmin() && page !== 'admin') { location.replace('#/admin'); return; }
    teardown();
    const root = view();
    root.innerHTML = '';
    root.className = 'page page-' + page;
    window.scrollTo(0, 0);
    setActiveNav(page === 'game' ? (id === 'racing' ? 'racing' : id === 'practice' ? 'practice' : 'games') : page);
    if (page !== 'admin') TM.Api.trackVisit(page === 'game' ? 'game/' + id : page);

    if (page === 'game') {
      const def = TM.getGame(id);
      if (!def) return notFound(root);
      if (id === 'racing') {
        const map = TM.Racing.local();
        const n = Number(params.level) || TM.Racing.highestUnlocked(map);
        params.level = n;
        if (!TM.Racing.isUnlocked(map, n)) {
          params.locked = true;
          TM.toast(`Level ${n} is locked. Win level ${n - 1} first.`, 'warn');
        }
      }
      shell = new TM.GameShell(root, def, params);
      document.title = def.name + ' | TypeMaster Arena';
      return;
    }
    const fn = TM.Pages[page];
    if (!fn) return notFound(root);
    cleanup = fn(root, params) || null;
    document.title = 'TypeMaster Arena - Typing Games, Racing & Speed Tests';
  }

  function notFound(root) {
    root.innerHTML = `<section class="page-head center"><h1>404</h1><p class="lead">This page does not exist.</p>
      <a class="btn btn-primary" href="#/home">Back home</a></section>`;
  }

  function setActiveNav(page) {
    TM.$$('.nav-links a').forEach((a) => a.classList.toggle('active', a.dataset.nav === page));
    document.body.classList.remove('nav-open');
  }

  // --------------------------------------------------------- nav bar
  function renderUser() {
    const box = document.getElementById('navUser');
    const u = TM.Api.user();
    const isAdmin = TM.Api.isAdmin();
    document.body.classList.toggle('admin-mode', isAdmin);
    box.innerHTML = u
      ? `<span class="user-chip" title="${TM.esc(u.email)}">${isAdmin ? '🛡' : '👤'} ${TM.esc(u.username)}</span><button class="btn btn-ghost btn-sm" id="logoutBtn">Log out</button>`
      : '<button class="btn btn-primary btn-sm" id="loginBtn">Log in</button>';
    // No "Admin" link in the menu - the admin panel is opened directly at #/admin (admin accounts only).
    const lb = document.getElementById('loginBtn');
    // On the admin page the login is for the admin only - no "Create account" option.
    if (lb) lb.addEventListener('click', () => TM.Auth.open(parseHash().page === 'admin'
      ? { reason: 'Log in with your admin account.', loginOnly: true }
      : {}));
    const lo = document.getElementById('logoutBtn');
    if (lo) lo.addEventListener('click', async () => {
      const wasAdmin = TM.Api.isAdmin();
      await TM.Api.logout();
      TM.toast(wasAdmin ? 'Logged out of the admin panel.' : 'Logged out. You can keep playing as a guest.');
      if (wasAdmin && location.hash !== '#/home') location.hash = '#/home'; else render();
    });
    // An admin who just logged in (from any page) is taken straight to the admin panel.
    if (isAdmin && parseHash().page !== 'admin') location.replace('#/admin');
  }

  function renderSound() {
    const b = document.getElementById('soundBtn');
    const m = TM.Sound.isMuted();
    b.textContent = m ? '🔇' : '🔊';
    b.title = m ? 'Sound off - click to unmute' : 'Sound on - click to mute';
    b.setAttribute('aria-pressed', String(!m));
  }

  function init() {
    document.getElementById('soundBtn').addEventListener('click', () => TM.Sound.toggle());
    document.getElementById('navToggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    TM.Sound.onChange(renderSound);
    TM.Api.onAuthChange(renderUser);
    renderSound();
    renderUser();
    window.addEventListener('hashchange', render);
    document.addEventListener('pointerdown', () => TM.Sound.unlock(), { once: true });
    render();
    // heartbeat for the admin "online now" counter (only while the tab is visible)
    setInterval(() => { if (!document.hidden) TM.Api.trackPing(); }, 60000);
    // validate a stored login token and load level definitions from the server
    TM.Api.refreshSession().then((u) => { if (!u && TM.Api.isLoggedIn() === false) renderUser(); });
    TM.Racing.loadLevels();
  }

  TM.App = { render };
  document.addEventListener('DOMContentLoaded', init);
})(window.TM);
