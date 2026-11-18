/* =====================================================================
 * Shared helpers: DOM, formatting, toasts, modals, localStorage store.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  // ---------------------------------------------------------------- DOM
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Escapes text for safe insertion into innerHTML. */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /** Creates an element from an HTML string (first element). */
  function html(str) {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content.firstElementChild;
  }

  const fmt = {
    num: (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '0'),
    int: (n) => Math.round(n || 0).toLocaleString(),
    time(sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      const m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + String(s).padStart(2, '0');
    },
    date(iso) {
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
  };

  // -------------------------------------------------------------- Toasts
  function toast(message, type = 'info', ms = 3200) {
    let box = $('#toasts');
    if (!box) { box = html('<div id="toasts" class="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = html(`<div class="toast toast-${type}">${esc(message)}</div>`);
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  }

  // -------------------------------------------------------------- Modal
  /**
   * Opens a modal dialog. Returns {el, close}. contentHtml is inserted as-is (caller escapes).
   * options.onClose is called once when the modal closes.
   */
  function modal(contentHtml, options = {}) {
    const wrap = html(`<div class="modal-backdrop"><div class="modal ${options.className || ''}" role="dialog" aria-modal="true">
        ${options.dismissible === false ? '' : '<button class="modal-close" aria-label="Close">&times;</button>'}
        <div class="modal-body"></div></div></div>`);
    $('.modal-body', wrap).innerHTML = contentHtml;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      wrap.classList.remove('open');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => wrap.remove(), 200);
      options.onClose && options.onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape' && options.dismissible !== false) { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    if (options.dismissible !== false) {
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
      $('.modal-close', wrap).addEventListener('click', close);
    }
    return { el: wrap, close };
  }

  // -------------------------------------------------------------- Store
  /** localStorage wrapper that never throws (private mode / blocked storage). */
  const PREFIX = 'tma.';
  const memory = {};
  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return key in memory ? memory[key] : fallback;
      }
    },
    set(key, value) {
      memory[key] = value;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
    remove(key) {
      delete memory[key];
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    },

    // ---------- local (guest + cache) statistics ----------
    profile() {
      return Store.get('profile', {
        totalGames: 0, totalWords: 0, correctChars: 0, incorrectChars: 0, totalTime: 0, wpmSum: 0,
        bestWpm: 0, bestNetWpm: 0, bestAccuracy: 0, bestScore: 0, perGame: {}
      });
    },
    history() { return Store.get('history', []); },

    /** Saves a finished game locally. Returns flags about new personal bests. */
    addResult(r) {
      const p = Store.profile();
      const pg = p.perGame[r.gameId] || { plays: 0, bestScore: 0, bestWpm: 0, bestAccuracy: 0 };
      const typed = r.correctChars + r.incorrectChars;
      const flags = {
        newBestWpm: r.wpm > 0 && r.wpm > p.bestWpm,
        newBestScore: r.score > 0 && r.score > pg.bestScore
      };
      p.totalGames++;
      p.totalWords += r.wordsTyped;
      p.correctChars += r.correctChars;
      p.incorrectChars += r.incorrectChars;
      p.totalTime += r.durationSeconds;
      p.wpmSum += r.wpm;
      p.bestWpm = Math.max(p.bestWpm, r.wpm);
      p.bestNetWpm = Math.max(p.bestNetWpm, r.netWpm);
      if (typed >= 30) p.bestAccuracy = Math.max(p.bestAccuracy, r.accuracy);
      p.bestScore = Math.max(p.bestScore, r.score);
      pg.plays++;
      pg.bestScore = Math.max(pg.bestScore, r.score);
      pg.bestWpm = Math.max(pg.bestWpm, r.wpm);
      if (typed >= 30) pg.bestAccuracy = Math.max(pg.bestAccuracy, r.accuracy);
      p.perGame[r.gameId] = pg;
      Store.set('profile', p);

      const h = Store.history();
      h.unshift(r);
      Store.set('history', h.slice(0, 200));
      return flags;
    },
    resetLocal() {
      ['profile', 'history', 'racing', 'daily'].forEach(Store.remove);
    }
  };

  // ------------------------------------------------------ Seeded random
  /** Deterministic PRNG (mulberry32) - used for daily challenges. */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));

  Object.assign(TM, { $, $$, esc, html, fmt, toast, modal, Store, seeded, todayKey, clamp, rand, randInt });
})(window.TM);
