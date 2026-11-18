/* =====================================================================
 * REST API client + authentication state.
 * Guests play fully offline (localStorage). Logged-in users also sync
 * scores, statistics and racing progress to the Spring Boot backend.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  // Served by Spring Boot -> same origin. Opened as a file or from VS Code Live Server
  // (ports 5500-5599) -> talk to Spring Boot on localhost:8080. window.TM_API_BASE overrides both.
  const port = Number(location.port);
  const BASE = window.TM_API_BASE != null ? window.TM_API_BASE
    : (location.protocol === 'file:' || (port >= 5500 && port < 5600)) ? 'http://localhost:8080' : '';

  const authListeners = [];
  let session = TM.Store.get('session', null); // {token, user}

  class ApiError extends Error {
    constructor(status, message, body) { super(message); this.status = status; this.body = body; }
  }

  async function request(method, path, body) {
    const headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (session && session.token) headers['Authorization'] = 'Bearer ' + session.token;
    let res;
    try {
      res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw new ApiError(0, 'Server unreachable - playing in offline mode');
    }
    if (res.status === 204) return null;
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
    if (!res.ok) {
      if (res.status === 401 && session) setSession(null); // token expired / invalid
      throw new ApiError(res.status, (data && data.message) || ('Request failed (' + res.status + ')'), data);
    }
    return data;
  }

  function setSession(s) {
    session = s;
    if (s) TM.Store.set('session', s); else TM.Store.remove('session');
    authListeners.forEach((fn) => fn(s ? s.user : null));
  }

  TM.Api = {
    ApiError,
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b === undefined ? {} : b),

    // ---------------- auth ----------------
    user: () => (session ? session.user : null),
    isLoggedIn: () => !!(session && session.token),
    onAuthChange(fn) { authListeners.push(fn); },
    async register(username, email, password) {
      const r = await request('POST', '/api/auth/register', { username, email, password });
      setSession(r);
      return r.user;
    },
    async login(login, password) {
      const r = await request('POST', '/api/auth/login', { login, password });
      setSession(r);
      return r.user;
    },
    async logout() {
      try { await request('POST', '/api/auth/logout', {}); } catch (e) { /* ignore */ }
      setSession(null);
    },
    /** Validates a stored token on page load. */
    async refreshSession() {
      if (!session) return null;
      try {
        const u = await request('GET', '/api/auth/me');
        session.user = u; TM.Store.set('session', session);
        authListeners.forEach((fn) => fn(u));
        return u;
      } catch (e) {
        return e.status === 0 ? session.user : null; // keep offline session
      }
    },

    // ---------------- game data ----------------
    submitScore: (r) => request('POST', '/api/scores', {
      gameType: r.gameId, score: Math.round(r.score), wpm: Math.min(400, r.wpm), accuracy: r.accuracy, netWpm: Math.min(400, r.netWpm),
      correctChars: r.correctChars, incorrectChars: r.incorrectChars, wordsTyped: r.wordsTyped,
      durationSeconds: r.durationSeconds, outcome: r.outcome, level: r.level || null
    }),
    myStats: () => request('GET', '/api/stats/me'),
    myHistory: (page = 0, size = 20) => request('GET', `/api/history/me?page=${page}&size=${size}`),
    globalStats: () => request('GET', '/api/stats/global'),
    leaderboard: (sort = 'wpm', limit = 10) => request('GET', `/api/leaderboard?sort=${encodeURIComponent(sort)}&limit=${limit}`),
    racingLevels: () => request('GET', '/api/racing/levels'),
    racingProgress: () => request('GET', '/api/racing/progress'),
    saveRace: (r) => request('POST', '/api/racing/progress', r),
    syncRacing: (list) => request('POST', '/api/racing/progress/sync', list),

    // ---------------- anonymous traffic tracking (never blocks the UI) ----------------
    visitorId,
    trackVisit: (page) => request('POST', '/api/track/visit', { visitorId: visitorId(), page }).catch(() => {}),
    trackPing: () => request('POST', '/api/track/ping', { visitorId: visitorId() }).catch(() => {}),
    trackGame: (gameType) => request('POST', '/api/track/game', { visitorId: visitorId(), gameType }).catch(() => {}),

    // ---------------- admin panel ----------------
    isAdmin: () => !!(session && session.user && session.user.role === 'ADMIN'),
    admin: {
      overview: () => request('GET', '/api/admin/overview'),
      traffic: (days = 14) => request('GET', `/api/admin/traffic?days=${days}`),
      games: () => request('GET', '/api/admin/games'),
      users: (q = '', sort = 'newest', page = 0, size = 20) =>
        request('GET', `/api/admin/users?q=${encodeURIComponent(q)}&sort=${sort}&page=${page}&size=${size}`),
      user: (id) => request('GET', `/api/admin/users/${id}`)
    }
  };

  /** Random anonymous id for this browser (no personal data). */
  function visitorId() {
    let id = TM.Store.get('vid', null);
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      TM.Store.set('vid', id);
    }
    return id;
  }
})(window.TM);
