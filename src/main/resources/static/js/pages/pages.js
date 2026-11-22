/* =====================================================================
 * Page renderers. Each page is fn(container, params) and may return a
 * cleanup function that the router calls when navigating away.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const { esc, fmt, html, $, $$ } = TM;

  /** Display order of the 10 games. */
  const ORDER = ['racing', 'speed', 'words', 'falling', 'zombie', 'bubble', 'paragraph', 'code', 'numbers', 'survival'];
  const CATEGORY = { racing: 'race', speed: 'skill', words: 'arcade', falling: 'arcade', zombie: 'arcade', bubble: 'arcade', paragraph: 'skill', code: 'skill', numbers: 'skill', survival: 'arcade' };
  const games = () => ORDER.map(TM.getGame).filter(Boolean);

  function gameCard(g, i) {
    const pg = TM.Store.profile().perGame[g.id];
    const href = g.id === 'racing' ? '#/racing' : `#/game/${g.id}`;
    return `
      <a class="game-card ${g.featured ? 'featured' : ''}" href="${href}" style="--accent: var(--${g.color}); --i:${i}" data-cat="${CATEGORY[g.id]}">
        <div class="gc-glow"></div>
        <div class="gc-icon">${g.icon}</div>
        <div class="gc-num">#${i + 1}</div>
        <h3>${esc(g.name)}</h3>
        <p>${esc(g.tagline)}</p>
        <div class="gc-foot">
          <span>${pg ? `🏆 Best ${fmt.int(pg.bestScore)}` : 'Not played yet'}</span>
          <span class="gc-play">Play ▶</span>
        </div>
      </a>`;
  }

  // ==================================================================
  // HOME
  // ==================================================================
  function home(root) {
    const p = TM.Store.profile();
    const daily = TM.Daily.list();
    const doneCount = daily.filter((d) => d.done).length;
    root.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <span class="pill">🏁 10 games · 200 racing levels · certificate at level 50</span>
          <h1>Improve Your <span class="grad">Typing Speed.</span><br>Challenge Your <span class="grad2">Skills.</span><br>Become a <span class="grad3">Typing Master!</span></h1>
          <p class="lead">Race AI cars, blast zombies, pop bubbles and type real code. Track your WPM, accuracy and net speed in real time - and climb the global leaderboard.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#/racing">▶ Start Playing</a>
            <a class="btn btn-outline btn-lg" href="#/games">🎮 Explore Games</a>
          </div>
          <div class="hero-road"><div class="mini-car c1">🏎️</div><div class="mini-car c2">🚓</div></div>
        </div>
      </section>

      <section class="stat-strip">
        <div class="strip-tile"><span class="si">🎮</span><b>10</b><span>Total games available</span></div>
        <div class="strip-tile"><span class="si">📅</span><b>${doneCount}/3</b><span>Daily challenges done</span></div>
        <div class="strip-tile"><span class="si">⚡</span><b data-best-wpm>${fmt.num(p.bestWpm, 1)}</b><span>Your best typing speed (WPM)</span></div>
        <div class="strip-tile"><span class="si">🎯</span><b data-best-acc>${fmt.num(p.bestAccuracy, 1)}%</b><span>Your highest accuracy</span></div>
      </section>
      <div class="global-stats muted small" hidden></div>

      <section class="section">
        <div class="section-head"><h2>📅 Daily Typing Challenges</h2><span class="muted">New challenges every day at midnight</span></div>
        <div class="daily-grid">
          ${daily.map((d) => {
            const g = TM.getGame(d.game);
            return `<div class="daily-card ${d.done ? 'done' : ''}" style="--accent: var(--${g.color})">
              <span class="dc-icon">${g.icon}</span>
              <div><b>${esc(d.text)}</b><small>${esc(g.name)}</small></div>
              ${d.done ? '<span class="dc-done">✔ Done</span>' : `<a class="btn btn-sm btn-primary" href="${d.game === 'racing' ? '#/racing' : '#/game/' + d.game}">Play</a>`}
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>🕹️ Choose Your Game</h2><a href="#/games" class="link">View all →</a></div>
        <div class="game-grid">${games().map(gameCard).join('')}</div>
      </section>

      <section class="section features">
        <div class="feature"><span>📊</span><h3>Real-time statistics</h3><p>Gross WPM × Accuracy = Net WPM, updated live as you type every game.</p></div>
        <div class="feature"><span>🔓</span><h3>200 levels + certificate</h3><p>Beat the AI car to unlock 8 chapters of tougher races. Win level 50 to earn your official TypeMaster Arena certificate.</p></div>
        <div class="feature"><span>🌍</span><h3>Global leaderboard</h3><p>Play as a guest, then log in to save your scores and progress online.</p></div>
      </section>`;

    // ---- server stats (if the backend is reachable)
    TM.Api.globalStats().then((g) => {
      const el = $('.global-stats', root);
      if (!el) return;
      el.hidden = false;
      el.innerHTML = `🌐 Community: <b>${fmt.int(g.registeredPlayers)}</b> players · <b>${fmt.int(g.gamesPlayed)}</b> games saved · site record <b>${fmt.num(g.bestWpm, 1)}</b> WPM`;
    }).catch(() => {});
    if (TM.Api.isLoggedIn()) {
      TM.Api.myStats().then((s) => {
        const a = $('[data-best-wpm]', root), b = $('[data-best-acc]', root);
        if (a) a.textContent = fmt.num(Math.max(s.bestWpm, p.bestWpm), 1);
        if (b) b.textContent = fmt.num(Math.max(s.bestAccuracy, p.bestAccuracy), 1) + '%';
      }).catch(() => {});
    }
  }

  // ==================================================================
  // ALL GAMES
  // ==================================================================
  function allGames(root) {
    root.innerHTML = `
      <section class="page-head">
        <h1>🎮 All Games</h1>
        <p class="lead">10 typing games - pick one and start playing instantly.</p>
        <div class="chips filter">
          <button class="chip active" data-f="all">All games</button>
          <button class="chip" data-f="race">Racing</button>
          <button class="chip" data-f="arcade">Arcade</button>
          <button class="chip" data-f="skill">Skill builders</button>
        </div>
      </section>
      <div class="game-grid">${games().map(gameCard).join('')}</div>`;
    $('.filter', root).addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.filter .chip', root).forEach((c) => c.classList.toggle('active', c === b));
      $$('.game-card', root).forEach((c) => { c.hidden = b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f; });
    });
  }

  // ==================================================================
  // RACING LEVEL SELECT
  // ==================================================================
  function racing(root, params) {
    const chapters = TM.RACING_CHAPTERS;
    root.innerHTML = `
      <section class="page-head race-head">
        <div>
          <h1>🏎️ AI Car Racing Challenge</h1>
          <p class="lead">${TM.RACING_TOTAL} levels in ${chapters.length} chapters. Type to drive, beat the AI to unlock the next level, and win level ${TM.CERT_LEVEL} to earn your official certificate.</p>
        </div>
        <div class="race-summary panel-card">
          <div><b data-rs="done">0</b><span>levels completed</span></div>
          <div><b data-rs="stars">0</b><span>stars earned</span></div>
          <div class="rs-bar"><div class="bar"><i data-rs="bar"></i></div><small data-rs="pct">0%</small></div>
        </div>
      </section>
      <div class="cert-card panel-card"></div>
      <div class="sync-note muted small"></div>
      <div class="chapter-tabs"></div>
      <div class="chapter-head"></div>
      <div class="level-grid"></div>`;

    let map = TM.Racing.local();
    let selected = null; // chapter index chosen by the user

    const currentLevel = () => TM.Racing.levels.find((l) => TM.Racing.isUnlocked(map, l.level) && !(map[l.level] && map[l.level].completed));

    const drawCertificate = () => {
      const box = $('.cert-card', root);
      const doneCount = TM.Racing.levels.filter((l) => l.level <= TM.CERT_LEVEL && map[l.level] && map[l.level].completed).length;
      if (TM.Certificate.earned(map)) {
        TM.Certificate.record();
        box.className = 'cert-card panel-card earned';
        box.innerHTML = `<span class="cc-icon">🎓</span>
          <div class="cc-text"><b>Certificate earned!</b><span>You won level ${TM.CERT_LEVEL}. Download your official TypeMaster Arena certificate.</span></div>
          <button class="btn btn-primary" data-cert>View &amp; Download</button>`;
        $('[data-cert]', box).addEventListener('click', () => TM.Certificate.open());
      } else {
        const pct = Math.round((doneCount / TM.CERT_LEVEL) * 100);
        box.className = 'cert-card panel-card';
        box.innerHTML = `<span class="cc-icon">🎓</span>
          <div class="cc-text"><b>Earn your TypeMaster Arena certificate</b>
            <span>Win level ${TM.CERT_LEVEL} to unlock a personalised, printable certificate. Progress: ${doneCount}/${TM.CERT_LEVEL} levels.</span>
            <div class="bar"><i style="width:${pct}%"></i></div></div>
          <span class="cc-lock">🔒 Level ${TM.CERT_LEVEL}</span>`;
      }
    };

    const draw = () => {
      const levels = TM.Racing.levels;
      const done = levels.filter((l) => map[l.level] && map[l.level].completed).length;
      const stars = levels.reduce((s, l) => s + ((map[l.level] && map[l.level].stars) || 0), 0);
      $('[data-rs="done"]', root).textContent = `${done}/${levels.length}`;
      $('[data-rs="stars"]', root).textContent = `${stars}/${levels.length * 3}`;
      const pct = Math.round((done / levels.length) * 100);
      $('[data-rs="bar"]', root).style.width = pct + '%';
      $('[data-rs="pct"]', root).textContent = pct + '% complete';
      drawCertificate();

      const current = currentLevel();
      if (selected == null) selected = Number.isFinite(Number(params.chapter)) && params.chapter !== undefined
        ? TM.clamp(Number(params.chapter) - 1, 0, chapters.length - 1)
        : TM.chapterOf(current ? current.level : 1);

      // chapter tabs with per-chapter progress
      $('.chapter-tabs', root).innerHTML = chapters.map((ch) => {
        const inCh = levels.filter((l) => l.level >= ch.from && l.level <= ch.to);
        const d = inCh.filter((l) => map[l.level] && map[l.level].completed).length;
        const open = TM.Racing.isUnlocked(map, ch.from);
        return `<button class="chapter-tab ${ch.index === selected ? 'active' : ''} ${open ? '' : 'locked'}" data-ch="${ch.index}">
          <span class="ct-num">${open ? 'Chapter ' + (ch.index + 1) : '🔒 Chapter ' + (ch.index + 1)}</span>
          <b>${esc(ch.name)}</b>
          <small>Levels ${ch.from}-${ch.to} · ${d}/25</small>
          <i class="ct-bar" style="width:${(d / 25) * 100}%"></i>
        </button>`;
      }).join('');

      const ch = chapters[selected];
      $('.chapter-head', root).innerHTML = `<h2>Chapter ${ch.index + 1}: ${esc(ch.name)}</h2>
        <span class="muted">Levels ${ch.from}-${ch.to}${ch.from <= TM.CERT_LEVEL && TM.CERT_LEVEL <= ch.to ? ` · 🎓 Certificate at level ${TM.CERT_LEVEL}` : ''}</span>`;

      $('.level-grid', root).innerHTML = levels.filter((l) => l.level >= ch.from && l.level <= ch.to).map((l) => {
        const p = map[l.level] || {};
        const unlocked = TM.Racing.isUnlocked(map, l.level);
        const isCert = l.level === TM.CERT_LEVEL;
        const isFinal = l.level % 25 === 0;
        const cls = [unlocked ? 'unlocked' : 'locked', p.completed ? 'completed' : '', current && current.level === l.level ? 'current' : '',
          isCert ? 'cert-level' : '', isFinal ? 'final-level' : ''].join(' ');
        const inner = `
          <div class="lv-top"><span class="lv-num">${l.level}</span>${isCert ? '<span class="lv-badge">🎓</span>' : isFinal ? '<span class="lv-badge">🏆</span>' : ''}${unlocked ? '' : '<span class="lv-lock">🔒</span>'}</div>
          <h3>${esc(l.name)}</h3>
          <div class="lv-meta"><span>🤖 ${l.aiSpeed} m/s</span><span>🏁 ${l.distance} m</span></div>
          <div class="stars">${[1, 2, 3].map((i) => `<i class="${i <= (p.stars || 0) ? 'on' : ''}">★</i>`).join('')}</div>
          <div class="lv-best">${p.completed ? `Best ${fmt.int(p.bestScore)} · ${fmt.num(p.bestWpm, 0)} WPM`
            : unlocked ? (current && current.level === l.level ? 'Next race ▶' : 'Unlocked')
              : isCert ? 'Certificate level' : 'Win level ' + (l.level - 1)}</div>`;
        return unlocked
          ? `<a class="level-tile ${cls} theme-${l.theme.toLowerCase()}" href="#/game/racing?level=${l.level}" title="${esc(l.challenge)}">${inner}</a>`
          : `<div class="level-tile ${cls}" title="Locked - win level ${l.level - 1} to unlock">${inner}</div>`;
      }).join('');
    };

    $('.chapter-tabs', root).addEventListener('click', (e) => {
      const b = e.target.closest('.chapter-tab'); if (!b) return;
      selected = Number(b.dataset.ch);
      draw();
    });

    draw();
    const note = $('.sync-note', root);
    note.textContent = TM.Api.isLoggedIn() ? 'Syncing progress with your account...' : 'Playing as guest - progress is saved in this browser. Log in to save it to your account.';
    TM.Racing.loadLevels().then(() => TM.Racing.progress()).then((m) => {
      if (!root.isConnected) return;
      map = m;
      draw();
      if (TM.Api.isLoggedIn()) note.textContent = '✔ Progress synced with your account.';
    });
  }

  // ==================================================================
  // TYPING PRACTICE
  // ==================================================================
  const PRACTICE_INFO = {
    beginner: ['🌱', 'Home-row drills (A S D F - J K L ;) to build correct finger placement.'],
    intermediate: ['📘', 'Common English words mixing all letter keys.'],
    advanced: ['🚀', 'Long words, capitals, punctuation and numbers.'],
    paragraph: ['📝', 'Real English paragraphs for continuous typing.'],
    words: ['🎲', 'Random word lists - great for warming up.'],
    sentences: ['💬', 'Natural sentences with capitals and punctuation.'],
    custom: ['✏️', 'Paste or write your own text to practise.']
  };
  function practice(root) {
    root.innerHTML = `
      <section class="page-head">
        <h1>⌨️ Typing Practice</h1>
        <p class="lead">Structured lessons with a live on-screen keyboard that highlights the next key to press.</p>
      </section>
      <div class="practice-grid">
        ${Object.keys(TM.PRACTICE_MODES).map((k) => `
          <a class="practice-card" href="#/game/practice?mode=${k}">
            <span class="pc-icon">${PRACTICE_INFO[k][0]}</span>
            <h3>${esc(TM.PRACTICE_MODES[k].label)} Practice</h3>
            <p>${esc(PRACTICE_INFO[k][1])}</p>
            <span class="gc-play">Start ▶</span>
          </a>`).join('')}
      </div>
      <section class="section panel-card">
        <h2>Finger guide</h2>
        <p class="muted">Each colour is one finger. Rest your fingers on the home row and return to it after each key.</p>
        <div class="kb-demo"></div>
        <div class="finger-legend">
          <span class="f-lp">Pinky</span><span class="f-lr">Ring</span><span class="f-lm">Middle</span><span class="f-li">Index</span><span class="f-th">Thumbs</span>
        </div>
      </section>`;
    const kb = new TM.VirtualKeyboard($('.kb-demo', root));
    let i = 0; const demo = 'asdf jkl;';
    const t = setInterval(() => { kb.highlight(demo[i % demo.length]); i++; }, 700);
    return () => clearInterval(t);
  }

  // ==================================================================
  // LEADERBOARD
  // ==================================================================
  const LB_TABS = [
    ['wpm', '⚡ Highest WPM'], ['accuracy', '🎯 Best Accuracy'], ['racing', '🏎️ Racing Score'],
    ['levels', '🔓 Levels Completed'], ['score', '🏆 Total Score']
  ];
  function leaderboard(root) {
    root.innerHTML = `
      <section class="page-head">
        <h1>🏆 Leaderboard</h1>
        <p class="lead">Top 10 players worldwide. ${TM.Api.isLoggedIn() ? '' : '<a href="#" data-login class="link">Log in</a> to put your scores on the board.'}</p>
        <div class="chips lb-tabs">${LB_TABS.map(([k, l], i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
      </section>
      <div class="panel-card lb-wrap"><div class="lb-body"><div class="loader"></div></div></div>
      <section class="section panel-card my-bests"></section>`;
    const login = $('[data-login]', root);
    if (login) login.addEventListener('click', (e) => { e.preventDefault(); TM.Auth.open({}); });

    const p = TM.Store.profile();
    const racingMap = TM.Racing.local();
    const lvDone = Object.values(racingMap).filter((x) => x.completed).length;
    $('.my-bests', root).innerHTML = `<h2>Your personal bests (this device)</h2>
      <div class="res-grid">
        <div class="res-tile"><b>${fmt.num(p.bestWpm, 1)}</b><span>Highest WPM</span></div>
        <div class="res-tile"><b>${fmt.num(p.bestAccuracy, 1)}%</b><span>Best accuracy</span></div>
        <div class="res-tile"><b>${fmt.int((p.perGame.racing || {}).bestScore || 0)}</b><span>Racing score</span></div>
        <div class="res-tile"><b>${lvDone}</b><span>Levels completed</span></div>
      </div>`;

    const load = (sort) => {
      const body = $('.lb-body', root);
      body.innerHTML = '<div class="loader"></div>';
      TM.Api.leaderboard(sort, 10).then((rows) => {
        if (!rows.length) { body.innerHTML = '<p class="empty">No scores yet - be the first! Log in and finish any game.</p>'; return; }
        const me = TM.Api.user();
        body.innerHTML = `<table class="table lb-table">
          <thead><tr><th>#</th><th>Player</th><th>Highest WPM</th><th>Best Accuracy</th><th>Racing Score</th><th>Levels</th><th class="hide-sm">Total Score</th></tr></thead>
          <tbody>${rows.map((r) => `<tr class="${me && me.username === r.username ? 'me' : ''} rank-${r.rank}">
            <td><span class="rank">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span></td>
            <td class="player">${esc(r.username)}</td>
            <td class="${sort === 'wpm' ? 'hl' : ''}">${fmt.num(r.bestWpm, 1)}</td>
            <td class="${sort === 'accuracy' ? 'hl' : ''}">${fmt.num(r.bestAccuracy, 1)}%</td>
            <td class="${sort === 'racing' ? 'hl' : ''}">${fmt.int(r.highestRacingScore)}</td>
            <td class="${sort === 'levels' ? 'hl' : ''}">${r.levelsCompleted}</td>
            <td class="hide-sm ${sort === 'score' ? 'hl' : ''}">${fmt.int(r.totalScore)}</td></tr>`).join('')}</tbody></table>`;
      }).catch((e) => {
        body.innerHTML = `<p class="empty">⚠ ${esc(e.message)}.<br><small>The online leaderboard needs the Spring Boot server and MySQL. Your personal bests are shown below.</small></p>`;
      });
    };
    $('.lb-tabs', root).addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.lb-tabs .chip', root).forEach((c) => c.classList.toggle('active', c === b));
      load(b.dataset.sort);
    });
    load('wpm');
  }

  // ==================================================================
  // MY PROGRESS - statistics dashboard
  // ==================================================================
  function progress(root) {
    const user = TM.Api.user();
    root.innerHTML = `
      <section class="page-head progress-head">
        <div><h1>📊 My Progress</h1>
          <p class="lead">${user ? `Signed in as <b>${esc(user.username)}</b> - statistics from your account.` : 'Guest mode - statistics saved in this browser.'}</p></div>
        <div class="ph-actions">
          ${user ? '' : '<button class="btn btn-primary" data-login>🔒 Log in to sync</button>'}
          <button class="btn btn-ghost btn-sm" data-reset>Reset local data</button>
        </div>
      </section>
      <section class="panel-card formula-hero">
        <h2>Typing Speed × Accuracy = Net Speed</h2>
        <div class="formula huge"></div>
        <p class="muted small">Net WPM = Gross WPM × Accuracy % / 100 · Gross WPM = (typed characters / 5) / minutes</p>
      </section>
      <section class="dash-grid"></section>
      <section class="two-col">
        <div class="panel-card"><h2>WPM history</h2><canvas class="wpm-chart" height="220"></canvas><div class="chart-legend"><span class="lg-gross">Gross WPM</span><span class="lg-net">Net WPM</span></div></div>
        <div class="panel-card"><h2>Best per game</h2><div class="per-game"></div></div>
      </section>
      <section class="panel-card section"><h2>Recent games</h2><div class="history"></div></section>`;

    const loginBtn = $('[data-login]', root);
    if (loginBtn) loginBtn.addEventListener('click', () => TM.Auth.open({}));
    $('[data-reset]', root).addEventListener('click', () => {
      if (!confirm('Delete all statistics, history and racing progress saved in this browser?')) return;
      TM.Store.resetLocal();
      TM.toast('Local data cleared', 'info');
      TM.App.render();
    });

    const local = TM.Store.profile();
    const localHistory = TM.Store.history();
    const render = (stats, history) => {
      const last = history[0];
      $('.formula-hero .formula', root).innerHTML = last ? `
        <div class="f-item"><b>${fmt.num(last.wpm, 1)}</b><span>WPM</span></div><div class="f-op">×</div>
        <div class="f-item"><b>${fmt.num(last.accuracy, 1)}%</b><span>Accuracy</span></div><div class="f-op">=</div>
        <div class="f-item f-net"><b>${fmt.num(last.netWpm, 1)}</b><span>Net WPM</span></div>
        <div class="f-caption">Last game: ${esc(gameName(last.gameId || last.gameType))}</div>`
        : `<div class="f-item"><b>20</b><span>WPM</span></div><div class="f-op">×</div><div class="f-item"><b>90%</b><span>Accuracy</span></div>
           <div class="f-op">=</div><div class="f-item f-net"><b>18</b><span>Net WPM</span></div><div class="f-caption">Example - play a game to see your numbers</div>`;
      const typed = stats.correctChars + stats.incorrectChars;
      $('.dash-grid', root).innerHTML = [
        ['⚡', 'Gross Typing Speed', fmt.num(stats.avgWpm, 1) + ' WPM', `best ${fmt.num(stats.bestWpm, 1)}`],
        ['🎯', 'Accuracy', fmt.num(typed ? (stats.correctChars / typed) * 100 : 0, 1) + '%', `best ${fmt.num(stats.bestAccuracy, 1)}%`],
        ['🚀', 'Net Typing Speed', fmt.num(stats.bestNetWpm, 1) + ' WPM', 'personal best'],
        ['✅', 'Correct Characters', fmt.int(stats.correctChars), 'all games', 'good'],
        ['❌', 'Incorrect Characters', fmt.int(stats.incorrectChars), 'all games', 'bad'],
        ['📝', 'Total Words Typed', fmt.int(stats.totalWords), `${stats.totalGames} games`],
        ['⏱', 'Total Time', fmt.time(stats.totalTime), 'time spent typing'],
        ['🏆', 'Best Score', fmt.int(stats.bestScore), `${stats.levels} racing levels done`, 'gold']
      ].map(([i, l, v, s, c]) => `<div class="dash-tile ${c || ''}"><span class="dt-icon">${i}</span><span class="dt-label">${l}</span><b>${v}</b><small>${s}</small></div>`).join('');

      $('.per-game', root).innerHTML = `<table class="table"><thead><tr><th>Game</th><th>Plays</th><th>Best score</th><th>Best WPM</th></tr></thead><tbody>
        ${games().map((g) => { const pg = local.perGame[g.id] || {}; const sb = stats.bestPerGame && stats.bestPerGame[g.id.toUpperCase()];
          return `<tr><td>${g.icon} ${esc(g.name)}</td><td>${pg.plays || 0}</td><td>${fmt.int(Math.max(pg.bestScore || 0, sb || 0))}</td><td>${fmt.num(pg.bestWpm || 0, 1)}</td></tr>`; }).join('')}
        </tbody></table>`;

      $('.history', root).innerHTML = history.length ? `<table class="table"><thead><tr><th>When</th><th>Game</th><th>Result</th><th>Score</th><th>WPM</th><th>Accuracy</th><th>Net WPM</th></tr></thead><tbody>
        ${history.slice(0, 20).map((h) => `<tr><td>${fmt.date(h.at || h.playedAt)}</td><td>${esc(gameName(h.gameId || h.gameType))}${h.level ? ' · L' + h.level : ''}</td>
          <td><span class="outcome ${String(h.outcome).toLowerCase()}">${esc(h.outcome)}</span></td><td>${fmt.int(h.score)}</td>
          <td>${fmt.num(h.wpm, 1)}</td><td>${fmt.num(h.accuracy, 1)}%</td><td>${fmt.num(h.netWpm, 1)}</td></tr>`).join('')}
        </tbody></table>` : '<p class="empty">No games yet. <a class="link" href="#/games">Play your first game →</a></p>';

      drawChart($('.wpm-chart', root), history.slice(0, 20).reverse());
    };

    const racingDone = Object.values(TM.Racing.local()).filter((x) => x.completed).length;
    const localStats = {
      avgWpm: local.totalGames ? local.wpmSum / local.totalGames : 0, bestWpm: local.bestWpm, bestAccuracy: local.bestAccuracy,
      bestNetWpm: local.bestNetWpm, correctChars: local.correctChars, incorrectChars: local.incorrectChars, totalWords: local.totalWords,
      totalGames: local.totalGames, totalTime: local.totalTime, bestScore: local.bestScore, levels: racingDone
    };
    render(localStats, localHistory);

    if (user) {
      Promise.all([TM.Api.myStats(), TM.Api.myHistory(0, 20)]).then(([s, h]) => {
        if (!root.isConnected) return;
        const hist = (h.content || []).map((x) => Object.assign({}, x, { gameId: x.gameType.toLowerCase() }));
        render({
          avgWpm: s.averageWpm, bestWpm: s.bestWpm, bestAccuracy: s.bestAccuracy, bestNetWpm: s.bestNetWpm,
          correctChars: s.correctChars, incorrectChars: s.incorrectChars, totalWords: s.totalWords, totalGames: s.totalGames,
          totalTime: s.totalTimeSeconds, bestScore: s.bestScore, levels: s.levelsCompleted, bestPerGame: s.bestPerGame
        }, hist.length ? hist : localHistory);
      }).catch((e) => TM.toast('Showing local statistics: ' + e.message, 'warn'));
    }
  }

  function gameName(id) {
    const g = id && TM.getGame(String(id).toLowerCase());
    return g ? g.name : String(id || '');
  }

  /** Small dependency-free line chart (gross + net WPM). */
  function drawChart(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 500, h = 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 10, t: 10, b: 24 };
    const max = Math.max(20, ...data.map((d) => d.wpm)) * 1.15;
    c.strokeStyle = 'rgba(148,163,184,0.15)'; c.fillStyle = '#94a3b8'; c.font = '11px Inter, sans-serif'; c.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (h - pad.t - pad.b) * (i / 4);
      c.beginPath(); c.moveTo(pad.l, y); c.lineTo(w - pad.r, y); c.stroke();
      c.fillText(Math.round(max * (1 - i / 4)), pad.l - 6, y + 4);
    }
    if (data.length < 1) {
      c.textAlign = 'center'; c.fillText('Play a few games to see your progress chart', w / 2, h / 2);
      return;
    }
    const x = (i) => pad.l + (data.length === 1 ? (w - pad.l - pad.r) / 2 : (w - pad.l - pad.r) * (i / (data.length - 1)));
    const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const line = (key, color, fill) => {
      c.beginPath();
      data.forEach((d, i) => (i ? c.lineTo(x(i), y(d[key])) : c.moveTo(x(i), y(d[key]))));
      c.strokeStyle = color; c.lineWidth = 2.5; c.stroke();
      if (fill) {
        c.lineTo(x(data.length - 1), h - pad.b); c.lineTo(x(0), h - pad.b); c.closePath();
        const g = c.createLinearGradient(0, pad.t, 0, h - pad.b);
        g.addColorStop(0, fill); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fill();
      }
      c.fillStyle = color;
      data.forEach((d, i) => { c.beginPath(); c.arc(x(i), y(d[key]), 3, 0, Math.PI * 2); c.fill(); });
    };
    line('wpm', '#2563eb', 'rgba(37,99,235,0.18)');
    line('netWpm', '#16a34a');
    c.fillStyle = '#94a3b8'; c.textAlign = 'center';
    c.fillText('Last ' + data.length + ' games', w / 2, h - 6);
  }

  // ==================================================================
  // AUTH MODAL
  // ==================================================================
  TM.Auth = {
    open(opts = {}) {
      const m = TM.modal(`
        <div class="auth">
          <div class="auth-logo">⌨️ TypeMaster Arena</div>
          ${opts.reason ? `<p class="muted">${esc(opts.reason)}</p>` : ''}
          ${opts.loginOnly ? '' : '<div class="chips auth-tabs"><button class="chip active" data-tab="login">Log in</button><button class="chip" data-tab="register">Create account</button></div>'}
          <form class="auth-form" data-form="login" novalidate>
            <label>Username or email<input name="login" required autocomplete="username"></label>
            <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
            <div class="form-error"></div>
            <button class="btn btn-primary btn-block" type="submit">Log in</button>
          </form>
          ${opts.loginOnly ? '' : `<form class="auth-form" data-form="register" hidden novalidate>
            <label>Username<input name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" autocomplete="username"></label>
            <label>Email<input name="email" type="email" required autocomplete="email"></label>
            <label>Password <small>(min. 6 characters)</small><input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
            <div class="form-error"></div>
            <button class="btn btn-primary btn-block" type="submit">Create account</button>
          </form>
          <p class="muted small">Your guest progress on this device is merged into your account automatically.</p>`}
        </div>`, { className: 'modal-auth' });
      const el = m.el;
      const tabs = $('.auth-tabs', el);
      if (tabs) tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return;
        $$('.auth-tabs .chip', el).forEach((c) => c.classList.toggle('active', c === b));
        $$('.auth-form', el).forEach((f) => { f.hidden = f.dataset.form !== b.dataset.tab; });
        const first = $(`[data-form="${b.dataset.tab}"] input`, el); first && first.focus();
      });
      setTimeout(() => { const i = $('[data-form="login"] input', el); i && i.focus(); }, 60);

      $$('.auth-form', el).forEach((form) => form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('.form-error', form);
        const btn = $('button[type="submit"]', form);
        err.textContent = '';
        const d = Object.fromEntries(new FormData(form).entries());
        if (form.dataset.form === 'register') {
          if (!/^[A-Za-z0-9_]{3,30}$/.test(d.username || '')) { err.textContent = 'Username: 3-30 letters, digits or underscore.'; return; }
          if (!/^\S+@\S+\.\S+$/.test(d.email || '')) { err.textContent = 'Please enter a valid email address.'; return; }
          if ((d.password || '').length < 6) { err.textContent = 'Password must have at least 6 characters.'; return; }
        } else if (!d.login || !d.password) { err.textContent = 'Please fill in both fields.'; return; }
        btn.disabled = true;
        try {
          const u = form.dataset.form === 'login' ? await TM.Api.login(d.login, d.password) : await TM.Api.register(d.username, d.email, d.password);
          m.close();
          TM.toast(`Welcome, ${u.username}!`, 'success');
          TM.Racing.progress().catch(() => {}); // merge guest racing progress
          opts.onSuccess && opts.onSuccess(u);
          if (!opts.onSuccess) TM.App.render();
        } catch (ex) {
          err.textContent = ex.message;
        } finally {
          btn.disabled = false;
        }
      }));
    }
  };

  TM.Pages = { home, games: allGames, racing, practice, leaderboard, progress, ORDER };
})(window.TM);
