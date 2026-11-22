/* =====================================================================
 * GAME 1 - AI Car Racing Challenge (main game)
 *
 * The player's car moves 1 m for every correctly typed character
 * (plus a small streak bonus for consecutive error-free words).
 * Wrong keystrokes are rejected, break the streak and - from level 3 -
 * push the car back by the level's mistake penalty.
 * The AI car moves at the level's constant speed (level 1 = 1 m/s, ...).
 * Winning a level unlocks the next one (localStorage + MySQL if logged in).
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  // ------------------------------------------------------------------
  // Level / progress data API (also used by the level-select page)
  // ------------------------------------------------------------------
  const Racing = {
    levels: TM.RACING_LEVELS,

    async loadLevels() {
      try {
        const list = await TM.Api.racingLevels();
        if (Array.isArray(list) && list.length) Racing.levels = list;
      } catch (e) { /* offline: keep built-in table */ }
      return Racing.levels;
    },

    getLevel(n) { return Racing.levels.find((l) => l.level === n); },

    /** Local progress map: {levelNumber: {unlocked, completed, stars, bestScore, bestWpm, bestAccuracy, bestTime, attempts}} */
    local() {
      const p = TM.Store.get('racing', null) || {};
      if (!p[1]) p[1] = blank(true);
      return p;
    },

    isUnlocked(map, n) { return n === 1 || !!(map[n] && map[n].unlocked); },

    highestUnlocked(map) {
      let h = 1;
      for (const l of Racing.levels) if (Racing.isUnlocked(map, l.level)) h = Math.max(h, l.level);
      return h;
    },

    /** Progress map - from the server when logged in (merged with local), else local. */
    async progress() {
      const local = Racing.local();
      if (!TM.Api.isLoggedIn()) return local;
      try {
        let server = await TM.Api.racingProgress();
        const serverDone = new Set(server.filter((p) => p.completed).map((p) => p.level));
        const missing = Object.keys(local).map(Number).filter((n) => local[n].completed && !serverDone.has(n));
        if (missing.length) server = await TM.Api.syncRacing(Racing.syncPayload(local));
        const merged = Object.assign({}, local);
        server.forEach((p) => {
          const l = merged[p.level] || blank(false);
          merged[p.level] = {
            unlocked: l.unlocked || p.unlocked,
            completed: l.completed || p.completed,
            stars: Math.max(l.stars, p.stars),
            bestScore: Math.max(l.bestScore, p.bestScore),
            bestWpm: Math.max(l.bestWpm, p.bestWpm),
            bestAccuracy: Math.max(l.bestAccuracy, p.bestAccuracy),
            bestTime: minTime(l.bestTime, p.bestTime),
            attempts: Math.max(l.attempts, p.attempts)
          };
        });
        TM.Store.set('racing', merged);
        return merged;
      } catch (e) {
        return local;
      }
    },

    syncPayload(map) {
      return Object.keys(map).map(Number).filter((n) => map[n].completed).map((n) => ({
        level: n, won: true, stars: map[n].stars || 1, score: map[n].bestScore || 0,
        wpm: Math.min(400, map[n].bestWpm || 0), accuracy: map[n].bestAccuracy || 0, timeSeconds: map[n].bestTime || 0
      }));
    },

    /** Records a race locally (and on the server when logged in). */
    record(r) {
      const map = Racing.local();
      const p = map[r.level] || blank(r.level === 1);
      p.attempts++;
      if (r.won) {
        p.completed = true;
        p.stars = Math.max(p.stars, r.stars);
        p.bestScore = Math.max(p.bestScore, r.score);
        p.bestWpm = Math.max(p.bestWpm, r.wpm);
        p.bestAccuracy = Math.max(p.bestAccuracy, r.accuracy);
        p.bestTime = minTime(p.bestTime, r.timeSeconds);
        if (Racing.getLevel(r.level + 1)) {
          map[r.level + 1] = map[r.level + 1] || blank(false);
          map[r.level + 1].unlocked = true;
        }
      }
      map[r.level] = p;
      TM.Store.set('racing', map);
      if (TM.Api.isLoggedIn()) {
        TM.Api.saveRace(r).catch((e) => TM.toast('Race progress saved locally only: ' + e.message, 'warn'));
      }
      return map;
    }
  };

  function blank(unlocked) {
    return { unlocked, completed: false, stars: 0, bestScore: 0, bestWpm: 0, bestAccuracy: 0, bestTime: null, attempts: 0 };
  }
  function minTime(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return Math.min(a, b);
  }

  TM.Racing = Racing;

  // ------------------------------------------------------------------
  // Track themes
  // ------------------------------------------------------------------
  const THEMES = {
    DAY: { sky: ['#1d4ed8', '#60a5fa', '#bfdbfe'], far: '#475569', mid: 'tree', ground: '#15803d', ground2: '#166534', road: '#334155', line: '#f8fafc', sun: '#fde047' },
    SUNSET: { sky: ['#4c1d95', '#db2777', '#fb923c'], far: '#3b0764', mid: 'palm', ground: '#7c2d12', ground2: '#5b1d0b', road: '#292524', line: '#fde68a', sun: '#fdba74' },
    NIGHT: { sky: ['#020617', '#0f172a', '#1e1b4b'], far: '#111827', mid: 'city', ground: '#0b1220', ground2: '#070d18', road: '#1f2937', line: '#fef08a', moon: true, stars: true, lamps: true },
    DESERT: { sky: ['#c2410c', '#f59e0b', '#fde68a'], far: '#b45309', mid: 'cactus', ground: '#d97706', ground2: '#b45309', road: '#44403c', line: '#fef3c7', sun: '#fff7ed' },
    SNOW: { sky: ['#475569', '#94a3b8', '#e2e8f0'], far: '#64748b', mid: 'pine', ground: '#e2e8f0', ground2: '#cbd5e1', road: '#334155', line: '#f8fafc', snow: true },
    NEON: { sky: ['#0b0221', '#3b0764', '#9d174d'], far: '#581c87', mid: 'pylon', ground: '#0b0221', ground2: '#12052e', road: '#140a2e', line: '#22d3ee', sun: 'neon', stars: true, grid: true }
  };

  // deterministic hash for scenery variation
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ------------------------------------------------------------------
  // Car drawing (side view, facing right). (x, y) = rear bottom.
  // ------------------------------------------------------------------
  function drawCar(c, x, y, s, color, accent, wheelRot, night) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(35, 1, 38, 5, 0, 0, Math.PI * 2); c.fill();
    // headlight beam
    if (night) {
      const g = c.createLinearGradient(68, -10, 160, -10);
      g.addColorStop(0, 'rgba(254,240,138,0.55)'); g.addColorStop(1, 'rgba(254,240,138,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(66, -12); c.lineTo(170, -26); c.lineTo(170, 4); c.closePath(); c.fill();
    }
    // spoiler
    c.fillStyle = '#0f172a';
    c.fillRect(2, -23, 3, 8);
    c.fillStyle = accent;
    c.fillRect(-2, -25, 14, 3);
    // body
    const body = c.createLinearGradient(0, -28, 0, -5);
    body.addColorStop(0, lighten(color)); body.addColorStop(1, color);
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(0, -6); c.lineTo(0, -15); c.lineTo(8, -17); c.lineTo(20, -18);
    c.quadraticCurveTo(24, -27, 31, -28); c.lineTo(42, -28);
    c.quadraticCurveTo(48, -27, 53, -19); c.lineTo(66, -15);
    c.quadraticCurveTo(71, -13, 71, -8); c.lineTo(70, -6); c.closePath();
    c.fill();
    // window
    c.fillStyle = 'rgba(15,23,42,0.85)';
    c.beginPath(); c.moveTo(24, -19); c.quadraticCurveTo(27, -25, 32, -26); c.lineTo(41, -26);
    c.quadraticCurveTo(46, -25, 50, -19); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.moveTo(33, -25); c.lineTo(38, -25); c.lineTo(34, -20); c.lineTo(29, -20); c.closePath(); c.fill();
    // stripe
    c.fillStyle = accent;
    c.fillRect(4, -13, 62, 2.5);
    // number circle
    c.fillStyle = '#f8fafc';
    c.beginPath(); c.arc(36, -11.5, 4.2, 0, Math.PI * 2); c.fill();
    // lights
    c.fillStyle = '#fef08a'; c.fillRect(66, -13, 4, 3);
    c.fillStyle = '#ef4444'; c.fillRect(0, -14, 2.5, 4);
    // wheels
    [16, 56].forEach((wx) => {
      c.fillStyle = '#0b0f19';
      c.beginPath(); c.arc(wx, -6, 7.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#94a3b8';
      c.beginPath(); c.arc(wx, -6, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#334155'; c.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        const a = wheelRot + (k * Math.PI) / 3;
        c.beginPath(); c.moveTo(wx - Math.cos(a) * 4, -6 - Math.sin(a) * 4); c.lineTo(wx + Math.cos(a) * 4, -6 + Math.sin(a) * 4); c.stroke();
      }
    });
    c.restore();
  }

  function lighten(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 70), g = Math.min(255, ((n >> 8) & 255) + 70), b = Math.min(255, (n & 255) + 70);
    return `rgb(${r},${g},${b})`;
  }

  // ------------------------------------------------------------------
  // Game definition
  // ------------------------------------------------------------------
  TM.registerGame({
    id: 'racing',
    name: 'AI Car Racing Challenge',
    icon: '🏎️',
    color: 'cyan',
    featured: true,
    layout: 'wide',
    backHref: '#/racing',
    tagline: 'Type to accelerate. Beat the AI to unlock the next level.',
    description: 'Race your car against an AI opponent. Every correct character pushes your car forward - win to unlock 200 levels and earn a certificate at level 50.',
    instructions: [
      'Type the <b>highlighted word</b> in the input box. Your car moves <b>1 m for every correct character</b>.',
      'Wrong keys are rejected and break your streak. From level 3 they also <b>push you back</b>.',
      'Type several words in a row without mistakes to build a <b>streak bonus</b> (up to +20% distance).',
      'The AI drives at a constant speed. Cross the finish line first to win and unlock the next level.',
      'Earn up to 3 stars: win (1), accuracy 90%+ (2), accuracy 96%+ and a 15% lead (3).'
    ],

    intro(shell) {
      const map = Racing.local();
      const n = shell.levelNumber();
      const lvl = Racing.getLevel(n);
      const p = map[n] || {};
      const locked = !Racing.isUnlocked(map, n);
      return `
        <div class="level-intro ${locked ? 'locked' : ''}">
          <div class="li-num">LEVEL<b>${n}</b><small>of ${TM.RACING_TOTAL}</small></div>
          <div class="li-info">
            <h3>${TM.esc(lvl.name)} ${locked ? '🔒' : ''}</h3>
            <div class="li-chapter">Chapter ${TM.chapterOf(n) + 1}: ${TM.esc(TM.RACING_CHAPTERS[TM.chapterOf(n)].name)}</div>
            <p>${TM.esc(lvl.challenge)}</p>
            <div class="li-chips">
              <span>🤖 AI ${lvl.aiSpeed} m/s</span><span>🏁 ${lvl.distance} m</span>
              <span>📝 ${TM.esc(lvl.wordPool.toLowerCase())} words</span>
              <span>⚠ ${lvl.mistakePenalty} m penalty</span><span>⚡ ~${TM.requiredWpm(lvl)} WPM to win</span>
            </div>
            ${p.completed ? `<div class="stars">${[1, 2, 3].map((i) => `<i class="${i <= p.stars ? 'on' : ''}">★</i>`).join('')}</div>` : ''}
            ${n === TM.CERT_LEVEL ? '<p class="cert-note">🎓 Certificate race: win this level to earn your TypeMaster Arena certificate!</p>' : ''}
            ${locked ? '<p class="warn">This level is locked. Win the previous level first.</p>' : ''}
          </div>
        </div>`;
    },

    create(shell) {
      const n = shell.levelNumber();
      const lvl = Racing.getLevel(n);
      const theme = THEMES[lvl.theme] || THEMES.DAY;
      const night = lvl.theme === 'NIGHT' || lvl.theme === 'NEON';
      // the player's car carries the account name (guests see "YOU")
      const me = TM.Api.user();
      const carName = me && me.username
        ? (me.username.length > 14 ? me.username.slice(0, 13) + '…' : me.username)
        : 'YOU';
      let engine = null; // car engine + silencer sound, started when the race begins

      shell.stage.innerHTML = `
        <div class="race theme-${lvl.theme.toLowerCase()}">
          <div class="race-bars">
            <div class="race-bar you"><span class="rb-name">🚗 ${me && me.username ? TM.esc(carName) : 'You'}</span><div class="bar"><i></i></div><b class="rb-dist">0 m</b></div>
            <div class="race-bar ai"><span class="rb-name">🤖 AI</span><div class="bar"><i></i></div><b class="rb-dist">0 m</b></div>
          </div>
          <div class="race-canvas-wrap"><canvas class="race-canvas"></canvas><div class="race-banner"></div></div>
          <div class="race-words"></div>
          <div class="race-input-slot"></div>
          <div class="race-dash">
            <div class="speedo"><span>Your speed</span><b class="sp-val">0.0</b><small>m/s · <i class="sp-kmh">0</i> km/h</small>
              <div class="sp-bar"><i></i></div></div>
            <div class="streak"><span>Streak</span><b class="st-val">0</b><small class="st-mult">x1.00 bonus</small></div>
            <div class="gap"><span>Gap to AI</span><b class="gap-val">0.0 m</b><small class="gap-lbl">level</small></div>
            <div class="aispeed"><span>AI speed</span><b>${lvl.aiSpeed.toFixed(1)}</b><small>m/s · ${(lvl.aiSpeed * 3.6).toFixed(1)} km/h</small></div>
          </div>
        </div>`;
      const $ = (s) => TM.$(s, shell.stage);
      const canvas = $('.race-canvas');
      const ctx = canvas.getContext('2d');
      const wordsEl = $('.race-words');
      const banner = $('.race-banner');
      const youBar = $('.race-bar.you i'), aiBar = $('.race-bar.ai i');
      const youDist = $('.race-bar.you .rb-dist'), aiDistEl = $('.race-bar.ai .rb-dist');
      const spVal = $('.sp-val'), spKmh = $('.sp-kmh'), spBar = $('.sp-bar i');
      const stVal = $('.st-val'), stMult = $('.st-mult'), gapVal = $('.gap-val'), gapLbl = $('.gap-lbl');

      const input = shell.createInput('Type the highlighted word...');
      // keep the typing box directly under the words so nothing needs scrolling while racing
      $('.race-input-slot').appendChild(input.parentElement);

      // ---- state
      const S = {
        player: 0, playerShown: 0, ai: 0, time: 0, ended: false, endT: 0, won: false,
        streak: 0, wordClean: true, shake: 0, samples: [], speed: 0, wheel: 0, aiWheel: 0,
        particles: [], flakes: []
      };
      let queue = [];
      const refill = () => { while (queue.length < 14) queue.push(TM.Words.word(lvl.wordPool, queue[queue.length - 1])); };
      refill();
      let typedLen = 0;

      const mult = () => 1 + Math.min(S.streak, 10) * 0.02;

      const renderWords = (typed = '') => {
        const cur = queue[0];
        wordsEl.innerHTML = queue.slice(0, 10).map((w, i) => i === 0
          ? `<span class="w current"><span class="typed">${TM.esc(cur.slice(0, typed.length))}</span>${TM.esc(cur.slice(typed.length))}</span>`
          : `<span class="w">${TM.esc(w)}</span>`).join(' ');
      };
      renderWords();

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'reject',
        isEnabled: () => shell.state === 'playing' && !S.ended,
        validate: (cand) => queue[0].startsWith(cand),
        onMiss: () => {
          S.streak = 0; S.wordClean = false; S.shake = 0.25;
          S.player = Math.max(0, S.player - lvl.mistakePenalty);
          input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
        },
        onChange: (v) => {
          if (v.length > typedLen) S.player += (v.length - typedLen) * mult();
          typedLen = v.length;
          if (v === queue[0]) {
            shell.tracker.word();
            if (S.wordClean) {
              S.streak++;
              if (S.streak === 5 || S.streak === 10) TM.Sound.play('boost');
            }
            S.wordClean = true;
            queue.shift(); refill();
            ctl.clear(); typedLen = 0;
            renderWords('');
            checkFinish();
            return;
          }
          renderWords(v);
        }
      });
      shell.useInput(input);

      // ---- canvas sizing
      let W = 0, H = 0, PPM = 14, scale = 1.2;
      const resize = () => {
        const r = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        W = Math.max(280, r.width);
        // track height follows the screen height so track + words + input fit without scrolling
        H = Math.round(TM.clamp(window.innerHeight * 0.32, W < 600 ? 170 : 190, W < 600 ? 230 : 300));
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        PPM = W < 600 ? 9 : 14;
        scale = (W < 600 ? 0.85 : 1.25) * Math.min(1, H / 300 + 0.15);
        draw();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement);

      for (let i = 0; i < 70; i++) S.flakes.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.2, v: 0.04 + Math.random() * 0.08 });

      function checkFinish() {
        if (S.ended) return;
        if (S.player >= lvl.distance || S.ai >= lvl.distance) {
          S.ended = true;
          S.won = S.player >= lvl.distance && S.player >= S.ai;
          shell.tracker.stop();
          input.disabled = true;
          banner.className = 'race-banner show ' + (S.won ? 'win' : 'loss');
          banner.innerHTML = S.won ? '🏆 VICTORY!' : '🤖 AI WINS';
          if (S.won) confetti(shell.stage);
        }
      }

      function endRace() {
        if (engine) { engine.stop(); engine = null; }
        const snap = shell.tracker.snapshot();
        const margin = Math.max(0, lvl.distance - S.ai);
        const stars = S.won ? 1 + (snap.accuracy >= 90 ? 1 : 0) + (snap.accuracy >= 96 && margin / lvl.distance >= 0.15 ? 1 : 0) : 0;
        const score = S.won
          ? 1000 + n * 100 + margin * 20 + snap.netWpm * 10 + snap.accuracy * 5
          : S.player * 5 + snap.netWpm * 5;
        Racing.record({ level: n, won: S.won, stars, score: Math.round(score), wpm: Math.min(400, snap.wpm), accuracy: snap.accuracy, timeSeconds: TM.round1(S.time) });
        const next = Racing.getLevel(n + 1);
        const actions = [];
        const certificate = S.won && n === TM.CERT_LEVEL;
        if (certificate) {
          TM.Certificate.record();
          actions.push({ label: '🎓 Get Your Certificate', cls: 'btn-primary', onClick: () => TM.Certificate.open() });
        }
        if (S.won && next) actions.push({ label: `Next Level ${n + 1} ▶`, cls: 'btn-success', href: `#/game/racing?level=${n + 1}` });
        actions.push({ label: '🏁 Level Select', cls: 'btn-ghost', href: '#/racing' });
        shell.finish({
          outcome: S.won ? 'WIN' : 'LOSS',
          score, level: n, stars,
          title: S.won ? `Level ${n} Complete!` : 'The AI won this time',
          subtitle: S.won
            ? (certificate ? `Congratulations! You have earned the official TypeMaster Arena certificate. Level ${n + 1} is unlocked too.`
              : next ? `You beat the AI by ${margin.toFixed(1)} m. Level ${n + 1} is now unlocked!` : 'You beat the final level. You are a TypeMaster Grand Master!')
            : `You covered ${S.player.toFixed(1)} of ${lvl.distance} m. Need about ${TM.requiredWpm(lvl)} WPM - try again!`,
          againLabel: S.won ? '↻ Race Again' : '↻ Retry Race',
          actions
        });
      }

      // ---- per-frame update
      shell.loop((dt) => {
        if (!S.ended) {
          S.time += dt;
          S.ai = Math.min(lvl.distance + 5, S.ai + lvl.aiSpeed * dt);
          checkFinish();
        } else {
          // coast after the finish line, then show results
          S.player += 6 * dt; S.ai += lvl.aiSpeed * dt;
          S.endT += dt;
          if (S.endT > 1.6) { endRace(); return; }
        }
        S.playerShown += (S.player - S.playerShown) * Math.min(1, dt * 8);
        // speed from the last 2 seconds
        S.samples.push([S.time, S.player]);
        while (S.samples.length > 2 && S.time - S.samples[0][0] > 2) S.samples.shift();
        const span = S.time - S.samples[0][0];
        S.speed = span > 0.3 ? Math.max(0, (S.player - S.samples[0][1]) / span) : 0;
        S.wheel += (S.speed + 0.2) * dt * 2.2;
        S.aiWheel += lvl.aiSpeed * dt * 2.2;
        S.shake = Math.max(0, S.shake - dt);
        // engine gets louder and higher the faster the car goes (full revs ~ 6 m/s or 1.6x AI speed)
        if (engine) engine.set(S.speed / Math.max(6, lvl.aiSpeed * 1.6));
        updateDash();
        draw(dt);
      });

      let dashAcc = 1;
      function updateDash() {
        dashAcc++;
        const pPct = TM.clamp(S.player / lvl.distance, 0, 1) * 100;
        const aPct = TM.clamp(S.ai / lvl.distance, 0, 1) * 100;
        youBar.style.width = pPct + '%';
        aiBar.style.width = aPct + '%';
        if (dashAcc % 4) return; // text updates ~15 fps
        youDist.textContent = `${Math.min(S.player, lvl.distance).toFixed(1)} / ${lvl.distance} m`;
        aiDistEl.textContent = `${Math.min(S.ai, lvl.distance).toFixed(1)} / ${lvl.distance} m`;
        spVal.textContent = S.speed.toFixed(1);
        spKmh.textContent = (S.speed * 3.6).toFixed(0);
        spBar.style.width = TM.clamp(S.speed / (lvl.aiSpeed * 2), 0, 1) * 100 + '%';
        spBar.classList.toggle('faster', S.speed >= lvl.aiSpeed);
        stVal.textContent = S.streak;
        stMult.textContent = `x${mult().toFixed(2)} bonus`;
        const gap = S.player - S.ai;
        gapVal.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(1) + ' m';
        gapVal.className = 'gap-val ' + (gap >= 0 ? 'ahead' : 'behind');
        gapLbl.textContent = gap >= 0 ? 'you lead' : 'AI leads';
        shell.setHud([
          { label: 'Level', value: `${n} · ${lvl.name}` },
          { label: 'Time', value: TM.fmt.time(S.time) },
          { label: 'Remaining', value: Math.max(0, lvl.distance - S.player).toFixed(0) + ' m' }
        ]);
      }

      // ---- rendering
      function draw(dt = 0) {
        if (!W) return;
        const c = ctx;
        const camX = S.playerShown * PPM - W * 0.28 + (S.shake > 0 ? (Math.random() - 0.5) * 6 : 0);
        const { roadTop, roadBot } = drawScene(c, W, H, theme, lvl.theme, camX, S.time, PPM, lvl.distance);

        // cars
        const laneAi = roadTop + (roadBot - roadTop) * 0.42;
        const laneYou = roadTop + (roadBot - roadTop) * 0.92;
        const carLen = 71 * scale;
        const aiX = S.ai * PPM - camX - carLen;   // the car's nose is at its distance
        const youX = S.playerShown * PPM - camX - carLen;

        // exhaust particles
        if (S.speed > 0.3 && !S.ended && Math.random() < 0.6) {
          S.particles.push({ x: S.playerShown * PPM - carLen, y: laneYou - 9 * scale, life: 0.6, vx: -20 - Math.random() * 20, vy: -8 - Math.random() * 8 });
        }
        S.particles = S.particles.filter((p) => (p.life -= dt) > 0);
        S.particles.forEach((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          c.fillStyle = `rgba(203,213,225,${p.life * 0.5})`;
          c.beginPath(); c.arc(p.x - camX, p.y, 3 + (0.6 - p.life) * 8, 0, Math.PI * 2); c.fill();
        });

        drawCar(c, aiX, laneAi, scale * 0.9, '#be123c', '#fbbf24', S.aiWheel, night);
        label(c, aiX + carLen * 0.45, laneAi - 34 * scale, 'AI', '#f43f5e');
        drawCar(c, youX, laneYou, scale, '#0891b2', '#a3e635', S.wheel, night);
        label(c, youX + carLen * 0.5, laneYou - 38 * scale, carName, '#22d3ee');

        // speed lines when fast
        if (S.speed > lvl.aiSpeed && !S.ended) {
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5;
          for (let i = 0; i < 5; i++) {
            const y = laneYou - 30 * scale + hash(i + Math.floor(S.time * 8)) * 26 * scale;
            const x = youX - 20 - hash(i * 7 + Math.floor(S.time * 8)) * 80;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.stroke();
          }
        }

        // off-screen indicator for the AI
        if (aiX > W - 20) arrow(c, W - 8, laneAi - 10, 1, `AI +${(S.ai - S.playerShown).toFixed(0)}m`);
        else if (aiX + carLen < 0) arrow(c, 8, laneAi - 10, -1, `AI ${(S.ai - S.playerShown).toFixed(0)}m`);

        // snow
        if (theme.snow) {
          c.fillStyle = 'rgba(255,255,255,0.9)';
          S.flakes.forEach((f) => {
            f.y += f.v * dt; f.x -= (0.02 + S.speed * 0.004) * dt;
            if (f.y > 1) f.y = 0; if (f.x < 0) f.x = 1;
            c.beginPath(); c.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); c.fill();
          });
        }
        if (lvl.theme === 'DESERT') { c.fillStyle = 'rgba(253,230,138,0.08)'; c.fillRect(0, 0, W, H); }
      }

      function label(c, x, y, text, color) {
        c.font = 'bold 11px Inter, sans-serif'; c.textAlign = 'center';
        const w = c.measureText(text).width + 12;
        c.fillStyle = 'rgba(15,23,42,0.8)'; roundRect(c, x - w / 2, y - 10, w, 16, 8); c.fill();
        c.strokeStyle = color; c.lineWidth = 1.5; roundRect(c, x - w / 2, y - 10, w, 16, 8); c.stroke();
        c.fillStyle = color; c.fillText(text, x, y + 2);
      }
      function arrow(c, x, y, dir, text) {
        c.font = 'bold 12px Inter, sans-serif'; c.textAlign = dir > 0 ? 'right' : 'left';
        c.fillStyle = '#f43f5e';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * 12, y - 8); c.lineTo(x - dir * 12, y + 8); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.fillText(text, x - dir * 16, y + 4);
      }
      draw();

      // ---- confetti / helpers
      function confetti(root) {
        const box = TM.html('<div class="confetti"></div>');
        const colors = ['#22d3ee', '#a3e635', '#f472b6', '#fbbf24', '#818cf8'];
        for (let i = 0; i < 80; i++) {
          const p = document.createElement('i');
          p.style.left = Math.random() * 100 + '%';
          p.style.background = colors[i % colors.length];
          p.style.animationDelay = Math.random() * 0.6 + 's';
          p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
          p.style.transform = `rotate(${Math.random() * 360}deg)`;
          box.appendChild(p);
        }
        root.appendChild(box);
        setTimeout(() => box.remove(), 4000);
      }

      return {
        start() {
          banner.innerHTML = `Level ${n}: ${TM.esc(lvl.name)}`;
          banner.className = 'race-banner show intro';
          shell.countdown(3).then(() => {
            banner.className = 'race-banner';
            if (!engine && !S.ended && !S.destroyed) { engine = TM.Sound.engine(); engine.set(0); }
          });
        },
        pause() { engine && engine.pause(); },
        resume() { engine && engine.resume(); },
        destroy() { S.destroyed = true; ro.disconnect(); if (engine) { engine.stop(); engine = null; } }
      };
    }
  });

  // ------------------------------------------------------------------
  // Track scenery (sky, hills, road, distance markers, finish line). Shared with the friend race.
  // ------------------------------------------------------------------
  function drawScene(c, W, H, theme, themeName, camX, time, PPM, distance) {
    const horizon = H * 0.42;
    const roadTop = H * 0.55, roadBot = H * 0.95;

    // sky
    const g = c.createLinearGradient(0, 0, 0, horizon);
    theme.sky.forEach((col, i) => g.addColorStop(i / (theme.sky.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, W, horizon + 2);

    if (theme.stars) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 60; i++) {
        const x = ((hash(i) * W * 1.5 - camX * 0.02) % W + W) % W;
        c.fillRect(x, hash(i + 99) * horizon * 0.9, hash(i + 7) > 0.8 ? 2 : 1, hash(i + 7) > 0.8 ? 2 : 1);
      }
    }
    if (theme.moon) {
      c.fillStyle = '#f1f5f9'; c.beginPath(); c.arc(W * 0.82, horizon * 0.3, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = theme.sky[0]; c.beginPath(); c.arc(W * 0.82 + 8, horizon * 0.3 - 5, 16, 0, Math.PI * 2); c.fill();
    }
    if (theme.sun === 'neon') {
      const sx = W * 0.7, sy = horizon, r = Math.min(90, H * 0.3);
      const sg = c.createLinearGradient(0, sy - r, 0, sy);
      sg.addColorStop(0, '#fde047'); sg.addColorStop(1, '#ec4899');
      c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, r, Math.PI, 0); c.fill();
      c.fillStyle = theme.sky[1];
      for (let i = 0; i < 6; i++) c.fillRect(sx - r, sy - r * 0.5 + i * r * 0.1, r * 2, 2 + i * 0.8);
    } else if (theme.sun) {
      c.fillStyle = theme.sun; c.shadowColor = theme.sun; c.shadowBlur = 30;
      c.beginPath(); c.arc(W * 0.8, horizon * 0.35, 22, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }
    if (themeName === 'DAY') {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = -1; i < 6; i++) {
        const off = camX * 0.05 + time * 6;
        const k = Math.floor(off / 260) + i;
        const x = k * 260 - off, y = 20 + hash(k) * horizon * 0.4;
        cloud(c, x, y, 0.7 + hash(k + 3) * 0.6);
      }
    }

    // far mountains / dunes
    c.fillStyle = theme.far;
    const farOff = camX * 0.1;
    c.beginPath(); c.moveTo(0, horizon);
    for (let x = 0; x <= W + 10; x += 10) {
      const wx = x + farOff, k = Math.floor(wx / 120), fr = (wx % 120) / 120;
      const t = fr * fr * (3 - 2 * fr); // smoothstep between peaks
      const h1 = hash(k) * 0.7 + 0.25, h2 = hash(k + 1) * 0.7 + 0.25;
      c.lineTo(x, horizon - (h1 + (h2 - h1) * t) * H * 0.22);
    }
    c.lineTo(W + 10, horizon); c.closePath(); c.fill();
    if (themeName === 'SNOW') { // snow caps
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, horizon - 4, W, 4);
    }

    // ground
    c.fillStyle = theme.ground; c.fillRect(0, horizon, W, H - horizon);
    c.fillStyle = theme.ground2; c.fillRect(0, horizon, W, roadTop - horizon - 8);
    if (theme.grid) {
      c.strokeStyle = 'rgba(34,211,238,0.35)'; c.lineWidth = 1;
      for (let y = horizon; y < H; y += 10 + (y - horizon) * 0.2) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      const go = camX % 60;
      for (let x = -go; x < W; x += 60) { c.beginPath(); c.moveTo(x, roadTop - 8); c.lineTo(W / 2 + (x - W / 2) * 0.2, horizon); c.stroke(); }
    }

    // mid scenery (parallax 0.45)
    const midOff = camX * 0.45, spacing = 90;
    for (let k = Math.floor(midOff / spacing) - 1; k < Math.floor((midOff + W) / spacing) + 2; k++) {
      if (hash(k * 3) < 0.25) continue;
      const x = k * spacing - midOff + hash(k) * 40;
      scenery(c, theme.mid, x, roadTop - 10, 0.7 + hash(k + 5) * 0.5, k);
    }

    // road
    c.fillStyle = theme.road; c.fillRect(0, roadTop, W, roadBot - roadTop);
    // curbs
    const curbW = 24, cOff = camX % (curbW * 2);
    for (let x = -cOff - curbW * 2; x < W + curbW; x += curbW) {
      const idx = Math.round((x + camX) / curbW);
      c.fillStyle = idx % 2 ? '#ef4444' : '#f8fafc';
      c.fillRect(x, roadTop - 5, curbW, 5);
      c.fillRect(x, roadBot, curbW, 5);
    }
    // lane divider
    const midY = (roadTop + roadBot) / 2;
    c.fillStyle = theme.line;
    const dash = 40, dOff = camX % (dash * 2);
    for (let x = -dOff; x < W; x += dash * 2) c.fillRect(x, midY - 1.5, dash, 3);
    if (theme.grid) { c.fillStyle = '#ec4899'; c.fillRect(0, roadTop, W, 2); c.fillRect(0, roadBot - 2, W, 2); }

    // distance markers every 10 m
    c.font = 'bold 10px Inter, sans-serif'; c.textAlign = 'center';
    const firstM = Math.max(0, Math.floor(camX / PPM / 10) * 10);
    for (let m = firstM; m <= distance; m += 10) {
      const x = m * PPM - camX;
      if (x < -30 || x > W + 30) continue;
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x - 1, roadTop, 2, roadBot - roadTop);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText(m + 'm', x, roadTop - 9);
    }
    // start line
    const sx = -camX;
    if (sx > -20 && sx < W) { c.fillStyle = '#f8fafc'; c.fillRect(sx - 3, roadTop, 6, roadBot - roadTop); }
    // finish line + banner
    const fx = distance * PPM - camX;
    if (fx > -60 && fx < W + 60) {
      const sq = 7;
      for (let row = 0; row * sq < roadBot - roadTop; row++) {
        for (let col = 0; col < 3; col++) {
          c.fillStyle = (row + col) % 2 ? '#0f172a' : '#f8fafc';
          c.fillRect(fx + col * sq - sq, roadTop + row * sq, sq, Math.min(sq, roadBot - roadTop - row * sq));
        }
      }
      c.fillStyle = '#64748b'; c.fillRect(fx - 12, horizon - 30, 4, roadTop - horizon + 30); c.fillRect(fx + 16, horizon - 30, 4, roadTop - horizon + 30);
      c.fillStyle = '#e11d48'; c.fillRect(fx - 14, horizon - 44, 36, 16);
      c.fillStyle = '#fff'; c.font = 'bold 9px Inter, sans-serif'; c.fillText('FINISH', fx + 4, horizon - 33);
    }

    // street lamps
    if (theme.lamps) {
      const lOff = camX % 220;
      for (let x = -lOff; x < W + 40; x += 220) {
        c.fillStyle = '#334155'; c.fillRect(x, roadTop - 70, 3, 65);
        c.fillRect(x, roadTop - 70, 16, 3);
        const lg = c.createRadialGradient(x + 15, roadTop - 66, 2, x + 15, roadTop - 66, 60);
        lg.addColorStop(0, 'rgba(253,224,71,0.5)'); lg.addColorStop(1, 'rgba(253,224,71,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(x + 15, roadTop - 66, 60, 0, Math.PI * 2); c.fill();
      }
    }
    return { horizon, roadTop, roadBot };
  }

  // scenery sprites ----------------------------------------------------
  function scenery(c, type, x, y, s, k) {
    c.save(); c.translate(x, y); c.scale(s, s);
    switch (type) {
      case 'tree':
        c.fillStyle = '#78350f'; c.fillRect(-3, -22, 6, 22);
        c.fillStyle = hash(k) > 0.5 ? '#16a34a' : '#22c55e';
        c.beginPath(); c.arc(0, -32, 16, 0, Math.PI * 2); c.arc(-10, -24, 11, 0, Math.PI * 2); c.arc(10, -24, 11, 0, Math.PI * 2); c.fill();
        break;
      case 'pine':
        c.fillStyle = '#3f2a14'; c.fillRect(-2.5, -12, 5, 12);
        c.fillStyle = '#14532d';
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-16 + i * 3, -10 - i * 12); c.lineTo(0, -34 - i * 12); c.lineTo(16 - i * 3, -10 - i * 12); c.fill(); }
        c.fillStyle = '#f8fafc'; c.beginPath(); c.moveTo(-5, -56); c.lineTo(0, -70); c.lineTo(5, -56); c.fill();
        break;
      case 'palm':
        c.strokeStyle = '#1e1b4b'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -30, 2, -60); c.stroke();
        c.fillStyle = '#1e1b4b';
        for (let i = 0; i < 5; i++) { c.save(); c.translate(2, -60); c.rotate(-2.6 + i * 0.9); c.beginPath(); c.ellipse(16, 0, 18, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
        break;
      case 'cactus':
        c.fillStyle = '#3f6212';
        c.fillRect(-5, -44, 10, 44); c.fillRect(-17, -30, 6, 16); c.fillRect(-17, -18, 14, 6); c.fillRect(11, -36, 6, 18); c.fillRect(3, -22, 14, 6);
        break;
      case 'city': {
        const w = 34 + hash(k) * 30, h = 50 + hash(k + 1) * 90;
        c.fillStyle = '#111827'; c.fillRect(-w / 2, -h, w, h);
        c.fillStyle = 'rgba(253,224,71,0.75)';
        for (let yy = -h + 8; yy < -8; yy += 12) for (let xx = -w / 2 + 5; xx < w / 2 - 5; xx += 9) if (hash(xx * 13 + yy * 7 + k) > 0.45) c.fillRect(xx, yy, 4, 5);
        break;
      }
      case 'pylon':
        c.strokeStyle = hash(k) > 0.5 ? '#22d3ee' : '#f472b6'; c.lineWidth = 3; c.shadowColor = c.strokeStyle; c.shadowBlur = 12;
        c.beginPath(); c.moveTo(-14, 0); c.lineTo(0, -70); c.lineTo(14, 0); c.moveTo(-9, -25); c.lineTo(9, -25); c.stroke();
        c.shadowBlur = 0;
        break;
    }
    c.restore();
  }

  function cloud(c, x, y, s) {
    c.beginPath();
    c.arc(x, y, 14 * s, 0, Math.PI * 2); c.arc(x + 16 * s, y - 6 * s, 16 * s, 0, Math.PI * 2); c.arc(x + 34 * s, y, 13 * s, 0, Math.PI * 2);
    c.fill();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // drawing helpers reused by the friend race (js/games/friend-race.js)
  TM.RaceArt = { THEMES, hash, drawCar, drawScene, roundRect };
})(window.TM);
