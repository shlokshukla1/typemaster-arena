/* =====================================================================
 * Game registry + GameShell.
 *
 * Every game registers a definition:
 *   TM.registerGame({ id, name, icon, color, tagline, description,
 *     instructions: [..], options: [{key,label,choices:[{value,label}],default}],
 *     layout: 'side' | 'wide', keyboard: bool, intro(shell) -> html,
 *     create(shell) -> { start(), pause(), resume(), destroy() } })
 *
 * The shell provides the common UI (instructions, HUD, controls, live stats
 * panel, pause overlay, countdown, results modal) and the game loop.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const GAMES = [];
  TM.Games = GAMES;
  TM.registerGame = (def) => { GAMES.push(def); };
  TM.getGame = (id) => GAMES.find((g) => g.id === id);

  class GameShell {
    constructor(container, def, params = {}) {
      this.def = def;
      this.params = params;
      this.options = {};
      (def.options || []).forEach((o) => {
        const fromRoute = params[o.key];
        const valid = o.choices && o.choices.some((c) => String(c.value) === String(fromRoute));
        this.options[o.key] = valid ? o.choices.find((c) => String(c.value) === String(fromRoute)).value : o.default;
      });
      this.state = 'intro'; // intro | countdown | playing | paused | finished
      this._loops = [];
      this._timers = [];
      this._raf = 0;
      this._cleanup = [];
      this._render(container);
      this._bindGlobal();
      this.showInstructions();
    }

    // ------------------------------------------------------------ UI
    _render(container) {
      const d = this.def;
      this.root = TM.html(`
        <section class="game-page layout-${d.layout || 'side'}" style="--accent: var(--${d.color || 'cyan'})">
          <header class="game-header">
            <div class="gh-title">
              <span class="gh-icon">${d.icon}</span>
              <div><h1>${TM.esc(d.name)}</h1><p>${TM.esc(d.tagline || '')}</p></div>
            </div>
            <div class="gh-controls">
              <button class="btn btn-ghost btn-sm" data-act="help" title="How to play">❓ <span>Help</span></button>
              <button class="btn btn-ghost btn-sm" data-act="pause" title="Pause (Esc)" disabled>⏸ <span>Pause</span></button>
              <button class="btn btn-ghost btn-sm" data-act="restart" title="Restart" disabled>↻ <span>Restart</span></button>
              <button class="btn btn-ghost btn-sm" data-act="sound" title="Sound on/off"></button>
              <a class="btn btn-ghost btn-sm" href="${d.backHref || '#/games'}" title="Exit">✕ <span>Exit</span></a>
            </div>
          </header>
          <div class="hud"></div>
          <div class="game-layout">
            <div class="game-main">
              <div class="stage-wrap">
                <div class="stage"></div>
                <div class="overlay hidden"></div>
              </div>
              <div class="below-stage"></div>
            </div>
            <aside class="game-side"></aside>
          </div>
        </section>`);
      container.appendChild(this.root);
      this.stage = TM.$('.stage', this.root);
      this.overlay = TM.$('.overlay', this.root);
      this.belowStage = TM.$('.below-stage', this.root);
      this.hudEl = TM.$('.hud', this.root);
      this.panel = new TM.StatsPanel(TM.$('.game-side', this.root));
      this.btnPause = TM.$('[data-act="pause"]', this.root);
      this.btnRestart = TM.$('[data-act="restart"]', this.root);
      this.btnSound = TM.$('[data-act="sound"]', this.root);
      this._syncSoundBtn();

      this.root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled || this.state === 'countdown') return;
        TM.Sound.unlock();
        switch (b.dataset.act) {
          case 'help': this.state === 'playing' ? this.pause(true) : this.showInstructions(); break;
          case 'pause': this.state === 'paused' ? this.resume() : this.pause(); break;
          case 'restart': this.restart(); break;
          case 'sound': TM.Sound.toggle(); break;
        }
      });
      // clicking the stage focuses the game's input
      this.stage.addEventListener('mousedown', (e) => {
        if (this._input && e.target !== this._input) { e.preventDefault(); this._input.focus({ preventScroll: true }); }
      });
      this.panel.update(new TM.StatsTracker(), this.bestScore());
    }

    _syncSoundBtn() {
      const m = TM.Sound.isMuted();
      this.btnSound.innerHTML = (m ? '🔇' : '🔊') + ` <span>${m ? 'Muted' : 'Sound'}</span>`;
    }

    _bindGlobal() {
      const onKey = (e) => {
        if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) {
          if (this.state === 'playing') { e.preventDefault(); this.pause(); }
          else if (this.state === 'paused') { e.preventDefault(); this.resume(); }
        }
      };
      const onVis = () => { if (document.hidden && this.state === 'playing') this.pause(); };
      const onSound = () => this._syncSoundBtn();
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVis);
      TM.Sound.onChange(onSound);
      this._cleanup.push(() => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVis);
      });
    }

    /** HUD chips: shell.setHud([{label, value, cls}]) */
    setHud(items) {
      const key = JSON.stringify(items);
      if (key === this._hudKey) return;
      this._hudKey = key;
      this.hudEl.innerHTML = items.map((i) =>
        `<div class="hud-chip ${i.cls || ''}"><span>${TM.esc(i.label)}</span><b>${TM.esc(i.value)}</b></div>`).join('');
    }

    /** Racing level from the route (?level=N), defaulting to the highest unlocked level. */
    levelNumber() {
      const n = Number(this.params.level);
      if (TM.Racing && TM.Racing.getLevel(n)) return n;
      return TM.Racing ? TM.Racing.highestUnlocked(TM.Racing.local()) : 1;
    }

    bestScore() {
      const pg = TM.Store.profile().perGame[this.def.id];
      return pg ? pg.bestScore : 0;
    }

    _showOverlay(htmlStr) {
      this.overlay.innerHTML = htmlStr;
      this.overlay.classList.remove('hidden');
    }
    _hideOverlay() { this.overlay.classList.add('hidden'); this.overlay.innerHTML = ''; }

    // ------------------------------------------------- instructions
    showInstructions() {
      const d = this.def;
      if (this.state === 'playing') this.pause();
      const opts = (d.options || []).map((o) => `
        <div class="opt-group"><label>${TM.esc(o.label)}</label>
          <div class="chips" data-opt="${o.key}">
            ${o.choices.map((c) => `<button type="button" class="chip ${String(c.value) === String(this.options[o.key]) ? 'active' : ''}"
                data-value="${TM.esc(c.value)}">${TM.esc(c.label)}</button>`).join('')}
          </div></div>`).join('');
      const intro = d.intro ? d.intro(this) : '';
      const inGame = this.state === 'paused';
      this._showOverlay(`
        <div class="panel-card instructions">
          <div class="ins-head"><span class="ins-icon">${d.icon}</span><div><h2>${TM.esc(d.name)}</h2>
            <p>${TM.esc(d.description || '')}</p></div></div>
          ${intro}
          <h3>How to play</h3>
          <ul class="ins-list">${(d.instructions || []).map((i) => `<li>${i}</li>`).join('')}</ul>
          ${opts ? `<div class="ins-options">${opts}</div>` : ''}
          <div class="ins-actions">
            ${inGame ? '<button class="btn btn-ghost" data-ov="resume">Resume</button><button class="btn btn-primary" data-ov="start">Restart with these settings</button>'
              : `<button class="btn btn-primary btn-lg" data-ov="start" ${this.params.locked ? 'disabled' : ''}>▶ Start Game</button>`}
          </div>
          <p class="ins-tip">Tip: press <kbd>Esc</kbd> to pause at any time.</p>
        </div>`);
      TM.$$('.chips', this.overlay).forEach((group) => {
        group.addEventListener('click', (e) => {
          const b = e.target.closest('.chip'); if (!b) return;
          TM.$$('.chip', group).forEach((c) => c.classList.toggle('active', c === b));
          const o = d.options.find((x) => x.key === group.dataset.opt);
          const choice = o.choices.find((c) => String(c.value) === b.dataset.value);
          this.options[o.key] = choice.value;
        });
      });
      this.overlay.onclick = (e) => {
        const b = e.target.closest('[data-ov]'); if (!b || b.disabled) return;
        TM.Sound.unlock();
        if (b.dataset.ov === 'start') this.restart();
        else if (b.dataset.ov === 'resume') this.resume();
      };
      const startBtn = TM.$('[data-ov="start"]', this.overlay);
      if (startBtn && !inGame) setTimeout(() => startBtn.focus(), 50);
    }

    // ------------------------------------------------------ lifecycle
    _begin() {
      this.state = 'playing';
      this.tracker = new TM.StatsTracker();
      this.stage.innerHTML = '';
      this.belowStage.innerHTML = '';
      this.hudEl.innerHTML = ''; this._hudKey = '';
      this._input = null;
      this._loops = [];
      this._timers = [];
      this._hideOverlay();
      this.btnPause.disabled = false;
      this.btnRestart.disabled = false;
      this.instance = this.def.create(this);
      this._startRaf();
      this.instance.start();
      setTimeout(() => this.scrollToPlayArea(), 60);
    }

    /**
     * Scrolls just enough that the stage and the typing box are fully visible,
     * so players never have to scroll while typing.
     */
    scrollToPlayArea() {
      const nav = document.querySelector('.navbar');
      const navH = nav ? nav.offsetHeight + 8 : 70;
      const stageTop = this.stage.getBoundingClientRect().top;
      const bottom = Math.max(this.stage.getBoundingClientRect().bottom,
        this.belowStage.children.length ? this.belowStage.getBoundingClientRect().bottom : 0);
      const overflow = bottom - window.innerHeight + 12;
      if (overflow <= 0 && stageTop >= navH) return;
      const delta = Math.min(Math.max(overflow, 0), stageTop - navH);
      window.scrollTo({ top: Math.max(0, window.scrollY + (stageTop < navH ? stageTop - navH : delta)), behavior: 'smooth' });
    }

    restart() {
      this._teardownInstance();
      TM.$$('.modal-backdrop').forEach((m) => m.remove());
      this._begin();
    }

    pause(showHelp) {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.tracker && this.tracker.pause();
      this.instance && this.instance.pause && this.instance.pause();
      this.btnPause.innerHTML = '▶ <span>Resume</span>';
      if (showHelp) { this.showInstructions(); return; }
      this._showOverlay(`
        <div class="panel-card pause-card">
          <h2>⏸ Paused</h2>
          <p>Take a breath. Your progress is safe.</p>
          <div class="ins-actions">
            <button class="btn btn-primary btn-lg" data-ov="resume">▶ Resume</button>
            <button class="btn btn-ghost" data-ov="restart">↻ Restart</button>
            <button class="btn btn-ghost" data-ov="help">❓ Instructions</button>
            <a class="btn btn-ghost" href="${this.def.backHref || '#/games'}">✕ Quit</a>
          </div>
        </div>`);
      this.overlay.onclick = (e) => {
        const b = e.target.closest('[data-ov]'); if (!b) return;
        if (b.dataset.ov === 'resume') this.resume();
        else if (b.dataset.ov === 'restart') this.restart();
        else if (b.dataset.ov === 'help') this.showInstructions();
      };
    }

    resume() {
      if (this.state !== 'paused') return;
      this._hideOverlay();
      this.state = this._wasCountdown ? 'countdown' : 'playing';
      this.btnPause.innerHTML = '⏸ <span>Pause</span>';
      if (this.state === 'playing') {
        this.tracker && this.tracker.resume();
        this.instance && this.instance.resume && this.instance.resume();
      }
      this.focusInput();
    }

    get paused() { return this.state !== 'playing'; }

    // ------------------------------------------------------ game loop
    /** Registers fn(dt seconds, elapsed) called every frame while playing. */
    loop(fn) { this._loops.push(fn); }

    /** Calls fn every ms milliseconds of *playing* time (pause-aware). */
    every(ms, fn) { this._timers.push({ ms, fn, acc: 0 }); }

    _startRaf() {
      cancelAnimationFrame(this._raf);
      let last = performance.now();
      let panelAcc = 0;
      const frame = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        if (this.state === 'playing') {
          for (const fn of this._loops) fn(dt);
          for (const tm of this._timers) {
            tm.acc += dt * 1000;
            while (tm.acc >= tm.ms && this.state === 'playing') { tm.acc -= tm.ms; tm.fn(); }
          }
          panelAcc += dt;
          if (panelAcc > 0.15) { panelAcc = 0; this.panel.update(this.tracker, this.bestScore()); }
        }
        if (this.state !== 'finished') this._raf = requestAnimationFrame(frame);
      };
      this._raf = requestAnimationFrame(frame);
    }

    /** 3-2-1-GO countdown. Tracker starts when it resolves. */
    countdown(from = 3) {
      return new Promise((resolve) => {
        this.state = 'countdown';
        let n = from;
        const show = () => {
          this._showOverlay(`<div class="countdown"><span class="${n === 0 ? 'go' : ''}">${n === 0 ? 'GO!' : n}</span></div>`);
          TM.Sound.play(n === 0 ? 'go' : 'countdown');
        };
        show();
        const id = setInterval(() => {
          if (this.state === 'paused' || this._destroyed) return; // freeze while paused
          n--;
          if (n < 0) {
            clearInterval(id);
            this._hideOverlay();
            this.state = 'playing';
            this.tracker.start();
            this.focusInput();
            resolve();
            return;
          }
          show();
        }, 800);
        this._cleanup.push(() => clearInterval(id));
      });
    }

    /** Start immediately without countdown. */
    go() {
      this.state = 'playing';
      this.tracker.start();
      this.focusInput();
    }

    // ------------------------------------------------------- helpers
    /** Creates the standard bottom input for word games. */
    createInput(placeholder = 'Type here...') {
      const wrap = TM.html(`<div class="word-input-wrap"><input class="word-input" type="text" placeholder="${TM.esc(placeholder)}" aria-label="Type here"/></div>`);
      this.belowStage.appendChild(wrap);
      const input = TM.$('input', wrap);
      this._input = input;
      return input;
    }

    useInput(el) { this._input = el; }
    focusInput() { if (this._input) setTimeout(() => this._input && this._input.focus({ preventScroll: true }), 0); }

    /** Green/red flash of the stage border. */
    flash(type = 'bad') {
      this.stage.classList.remove('flash-good', 'flash-bad');
      void this.stage.offsetWidth;
      this.stage.classList.add('flash-' + type);
    }

    /** Floating "+120" text at stage coordinates. */
    floatText(x, y, text, cls = '') {
      const f = TM.html(`<div class="float-text ${cls}" style="left:${x}px;top:${y}px">${TM.esc(text)}</div>`);
      this.stage.appendChild(f);
      setTimeout(() => f.remove(), 900);
    }

    // ------------------------------------------------------- finish
    /**
     * Ends the game and shows the results.
     * r: {outcome: 'WIN'|'LOSS'|'COMPLETED', score, title, subtitle, level, extraHtml,
     *     actions: [{label, cls, href | onClick}] }
     */
    finish(r) {
      if (this.state === 'finished') return;
      this.state = 'finished';
      this.tracker.stop();
      cancelAnimationFrame(this._raf);
      this.btnPause.disabled = true;
      this.panel.update(this.tracker, Math.max(this.bestScore(), r.score || 0));
      if (this._input) this._input.blur();

      const snap = this.tracker.snapshot();
      const result = Object.assign({
        gameId: this.def.id,
        gameName: this.def.name,
        outcome: r.outcome || 'COMPLETED',
        score: Math.max(0, Math.round(r.score || 0)),
        level: r.level || null,
        at: new Date().toISOString()
      }, snap);
      const flags = TM.Store.addResult(result);
      TM.Api.trackGame(this.def.id); // anonymous count for the admin traffic stats
      const daily = TM.Daily.check(result);
      this.lastResult = result;
      this.panel.update(this.tracker, this.bestScore());

      const banner = r.outcome === 'WIN' ? ['win', '🏆', r.title || 'Victory!']
        : r.outcome === 'LOSS' ? ['loss', '💥', r.title || 'Game Over']
          : ['done', '✅', r.title || 'Completed!'];
      const actions = (r.actions || []).concat([
        { label: r.againLabel || '↻ Play Again', cls: r.outcome === 'WIN' && r.actions && r.actions.length ? 'btn-ghost' : 'btn-primary', act: 'again' },
        { label: 'All Games', cls: 'btn-ghost', href: '#/games' }
      ]);

      const body = `
        <div class="results results-${banner[0]}">
          <div class="res-banner"><span class="res-emoji">${banner[1]}</span><h2>${TM.esc(banner[2])}</h2>
            ${r.subtitle ? `<p>${TM.esc(r.subtitle)}</p>` : ''}</div>
          <div class="res-score"><span>Score</span><b>${TM.fmt.int(result.score)}</b>
            ${r.stars != null ? `<div class="stars big">${[1, 2, 3].map((i) => `<i class="${i <= r.stars ? 'on' : ''}">★</i>`).join('')}</div>` : ''}
          </div>
          <div class="badges">
            ${flags.newBestScore ? '<span class="badge gold">🌟 New best score</span>' : ''}
            ${flags.newBestWpm ? '<span class="badge cyan">⚡ New WPM record</span>' : ''}
            ${daily.map((c) => `<span class="badge green">📅 Daily challenge: ${TM.esc(c.text)}</span>`).join('')}
          </div>
          <div class="formula big">
            <div class="f-item"><b>${result.wpm.toFixed(1)}</b><span>WPM</span></div>
            <div class="f-op">&times;</div>
            <div class="f-item"><b>${result.accuracy.toFixed(1)}%</b><span>Accuracy</span></div>
            <div class="f-op">=</div>
            <div class="f-item f-net"><b>${result.netWpm.toFixed(1)}</b><span>Net WPM</span></div>
          </div>
          <div class="res-grid">
            ${resTile('Correct chars', result.correctChars, 'good')}
            ${resTile('Incorrect chars', result.incorrectChars, 'bad')}
            ${resTile('Words', result.wordsTyped)}
            ${resTile('Time', TM.fmt.time(result.durationSeconds))}
          </div>
          ${r.extraHtml || ''}
          <div class="save-status"></div>
          <div class="res-actions">
            ${actions.map((a, i) => a.href ? `<a class="btn ${a.cls}" href="${a.href}" data-ri="${i}">${a.label}</a>`
              : `<button class="btn ${a.cls}" data-ri="${i}">${a.label}</button>`).join('')}
          </div>
        </div>`;

      if (r.outcome === 'WIN') TM.Sound.play('win');
      else if (r.outcome === 'LOSS') TM.Sound.play('lose');
      else TM.Sound.play('levelup');

      const m = TM.modal(body, { className: 'modal-results' });
      this._resultsModal = m;
      m.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ri]'); if (!b) return;
        const a = actions[Number(b.dataset.ri)];
        if (a.href) { m.close(); return; }
        e.preventDefault();
        m.close();
        if (a.act === 'again') this.restart();
        else if (a.onClick) a.onClick();
      });
      this._saveOnline(result, TM.$('.save-status', m.el));
    }

    /** Submits the result to the server, or offers login for guests. */
    _saveOnline(result, statusEl) {
      const submit = () => {
        statusEl.innerHTML = '<span class="muted">Saving to online leaderboard...</span>';
        TM.Api.submitScore(result)
          .then(() => { statusEl.innerHTML = '<span class="ok">✔ Saved to your account &amp; online leaderboard</span>'; })
          .catch((err) => { statusEl.innerHTML = `<span class="warn">⚠ ${TM.esc(err.message)} (saved locally)</span>`; });
      };
      if (TM.Api.isLoggedIn()) { submit(); return; }
      statusEl.innerHTML = `<span class="muted">Saved on this device.</span>
        <button class="btn btn-sm btn-outline" data-save>🔒 Log in to save to the online leaderboard</button>`;
      TM.$('[data-save]', statusEl).addEventListener('click', () => {
        TM.Auth.open({ reason: 'Log in or create a free account to save this score online.', onSuccess: submit });
      });
    }

    // ------------------------------------------------------- teardown
    _teardownInstance() {
      if (this.instance) {
        try { this.instance.destroy && this.instance.destroy(); } catch (e) { console.error(e); }
        this.instance = null;
      }
      cancelAnimationFrame(this._raf);
      this._loops = [];
      this._timers = [];
      this._wasCountdown = false;
    }

    destroy() {
      this._destroyed = true;
      this._teardownInstance();
      this._cleanup.forEach((fn) => fn());
      if (this._resultsModal) this._resultsModal.close();
      this.root.remove();
    }
  }

  function resTile(label, value, cls = '') {
    return `<div class="res-tile ${cls}"><b>${TM.esc(value)}</b><span>${TM.esc(label)}</span></div>`;
  }

  TM.GameShell = GameShell;
})(window.TM);
