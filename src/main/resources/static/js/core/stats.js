/* =====================================================================
 * Typing statistics: tracker, live dashboard panel and daily challenges.
 *
 *   Gross WPM = (all typed characters / 5) / minutes
 *   Accuracy  = correct characters / all typed characters x 100
 *   Net WPM   = Gross WPM x Accuracy / 100
 *
 * Every keystroke is judged exactly once when it is typed, so a wrong
 * character that is later corrected still counts as one mistake.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const now = () => performance.now();
  const round1 = (v) => Math.round(v * 10) / 10;

  class StatsTracker {
    constructor() { this.reset(); }

    reset() {
      this.correct = 0;
      this.incorrect = 0;
      this.words = 0;
      this._elapsed = 0;
      this._running = false;
      this._since = 0;
    }

    start() { if (!this._running) { this._running = true; this._since = now(); } }
    pause() { if (this._running) { this._elapsed += now() - this._since; this._running = false; } }
    resume() { this.start(); }
    stop() { this.pause(); }
    get running() { return this._running; }

    hit(n = 1) { this.correct += n; }
    miss(n = 1) { this.incorrect += n; }
    word(n = 1) { this.words += n; }

    get seconds() { return (this._elapsed + (this._running ? now() - this._since : 0)) / 1000; }
    get typed() { return this.correct + this.incorrect; }

    get grossWpm() {
      const s = this.seconds;
      if (s < 1 || this.typed === 0) return 0;
      return (this.typed / 5) / (s / 60);
    }
    get accuracy() { return this.typed === 0 ? 100 : (this.correct / this.typed) * 100; }
    get netWpm() { return this.grossWpm * this.accuracy / 100; }

    /** Values rounded for display / saving. */
    snapshot() {
      const gross = round1(this.grossWpm);
      const acc = this.typed === 0 ? 0 : round1(this.accuracy);
      return {
        wpm: gross,
        accuracy: acc,
        netWpm: round1(gross * acc / 100),
        correctChars: this.correct,
        incorrectChars: this.incorrect,
        wordsTyped: this.words,
        durationSeconds: round1(this.seconds)
      };
    }
  }

  // ------------------------------------------------------------------
  // Live statistics dashboard panel (used beside every game)
  // ------------------------------------------------------------------
  const GAUGE_MAX = 150;

  function gaugePath(fraction) {
    // Semicircle from 180deg to 0deg, radius 80, centre (100,100)
    const a = Math.PI * (1 - TM.clamp(fraction, 0, 1));
    const x = 100 + 80 * Math.cos(a), y = 100 - 80 * Math.sin(a);
    return `M20,100 A80,80 0 0,1 ${x.toFixed(2)},${y.toFixed(2)}`;
  }

  class StatsPanel {
    constructor(container) {
      this.el = TM.html(`
        <div class="stats-panel">
          <div class="gauge">
            <svg viewBox="0 0 200 115" aria-hidden="true">
              <defs><linearGradient id="gaugeGrad" x1="0" x2="1">
                <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.6" stop-color="#2563eb"/><stop offset="1" stop-color="#1e3a8a"/>
              </linearGradient></defs>
              <path d="M20,100 A80,80 0 0,1 180,100" class="gauge-bg"/>
              <path d="${gaugePath(0)}" class="gauge-fg"/>
            </svg>
            <div class="gauge-value"><b data-s="gauge">0</b><span>Net WPM</span></div>
          </div>
          <div class="formula" title="Net WPM = Gross WPM x Accuracy / 100">
            <div class="f-item"><b data-s="gross">0</b><span>WPM</span></div>
            <div class="f-op">&times;</div>
            <div class="f-item"><b data-s="acc">100%</b><span>Accuracy</span></div>
            <div class="f-op">=</div>
            <div class="f-item f-net"><b data-s="net">0</b><span>Net WPM</span></div>
          </div>
          <div class="stat-grid">
            ${tile('gross2', 'Gross Speed', 'WPM')}
            ${tile('acc2', 'Accuracy', '%')}
            ${tile('net2', 'Net Speed', 'WPM')}
            ${tile('correct', 'Correct Chars', '', 'good')}
            ${tile('incorrect', 'Incorrect Chars', '', 'bad')}
            ${tile('words', 'Words Typed', '')}
            ${tile('time', 'Total Time', '')}
            ${tile('best', 'Best Score', '', 'gold')}
          </div>
        </div>`);
      container.appendChild(this.el);
      this.fields = {};
      TM.$$('[data-s]', this.el).forEach((n) => { this.fields[n.dataset.s] = n; });
      this.gauge = TM.$('.gauge-fg', this.el);
      this.last = {};
    }

    set(key, value) {
      if (this.last[key] === value) return;
      this.last[key] = value;
      if (this.fields[key]) this.fields[key].textContent = value;
    }

    update(tracker, bestScore) {
      const gross = tracker.grossWpm, acc = tracker.accuracy, net = tracker.netWpm;
      this.set('gross', gross.toFixed(0));
      this.set('acc', acc.toFixed(0) + '%');
      this.set('net', net.toFixed(1));
      this.set('gauge', net.toFixed(0));
      this.set('gross2', gross.toFixed(1));
      this.set('acc2', acc.toFixed(1));
      this.set('net2', net.toFixed(1));
      this.set('correct', tracker.correct);
      this.set('incorrect', tracker.incorrect);
      this.set('words', tracker.words);
      this.set('time', TM.fmt.time(tracker.seconds));
      this.set('best', TM.fmt.int(bestScore || 0));
      const g = gaugePath(net / GAUGE_MAX);
      if (this.last.g !== g) { this.gauge.setAttribute('d', g); this.last.g = g; }
    }
  }

  function tile(key, label, unit, cls = '') {
    return `<div class="stat-tile ${cls}"><span class="st-label">${label}</span>
      <span class="st-value"><b data-s="${key}">0</b>${unit ? `<small>${unit}</small>` : ''}</span></div>`;
  }

  // ------------------------------------------------------------------
  // Daily challenges: 3 per day, deterministic from the date
  // ------------------------------------------------------------------
  const TEMPLATES = [
    { game: 'speed', metric: 'netWpm', min: 25, max: 45, text: (t) => `Reach ${t} Net WPM in Speed Typing` },
    { game: 'racing', metric: 'win', min: 1, max: 1, text: () => 'Win any AI Car Race' },
    { game: 'paragraph', metric: 'accuracy', min: 94, max: 98, text: (t) => `Finish a paragraph with ${t}%+ accuracy` },
    { game: 'falling', metric: 'words', min: 20, max: 40, text: (t) => `Catch ${t} falling words in one game` },
    { game: 'zombie', metric: 'words', min: 15, max: 35, text: (t) => `Destroy ${t} zombies in one game` },
    { game: 'bubble', metric: 'words', min: 20, max: 35, text: (t) => `Pop ${t} bubbles in one game` },
    { game: 'survival', metric: 'words', min: 25, max: 50, text: (t) => `Survive ${t} words in Survival` },
    { game: 'code', metric: 'accuracy', min: 90, max: 96, text: (t) => `Type a code snippet with ${t}%+ accuracy` },
    { game: 'numbers', metric: 'words', min: 10, max: 20, text: (t) => `Type ${t} number challenges correctly` },
    { game: 'words', metric: 'words', min: 20, max: 35, text: (t) => `Type ${t} words in Word Challenge` }
  ];

  const Daily = {
    list() {
      const key = TM.todayKey();
      const seed = Number(key.replace(/-/g, ''));
      const rnd = TM.seeded(seed);
      const pool = TEMPLATES.slice();
      const out = [];
      const state = TM.Store.get('daily', {});
      const done = state.date === key ? state.done || [] : [];
      for (let i = 0; i < 3; i++) {
        const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        const target = Math.round(t.min + rnd() * (t.max - t.min));
        out.push({ id: `${key}-${t.game}`, game: t.game, metric: t.metric, target, text: t.text(target), done: done.includes(`${key}-${t.game}`) });
      }
      return out;
    },
    /** Checks a finished game against today's challenges; returns newly completed ones. */
    check(result) {
      const key = TM.todayKey();
      const state = TM.Store.get('daily', {});
      if (state.date !== key) { state.date = key; state.done = []; }
      const completed = [];
      for (const c of Daily.list()) {
        if (c.done || c.game !== result.gameId) continue;
        const v = c.metric === 'win' ? (result.outcome === 'WIN' ? 1 : 0)
          : c.metric === 'words' ? result.wordsTyped
            : result[c.metric];
        // accuracy challenges need a meaningful amount of typing
        if (c.metric === 'accuracy' && result.correctChars + result.incorrectChars < 50) continue;
        if (v >= c.target) { state.done.push(c.id); completed.push(c); }
      }
      TM.Store.set('daily', state);
      return completed;
    }
  };

  TM.StatsTracker = StatsTracker;
  TM.StatsPanel = StatsPanel;
  TM.Daily = Daily;
  TM.round1 = round1;
})(window.TM);
