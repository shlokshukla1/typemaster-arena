/* =====================================================================
 * Play with Friend (#/friend, #/friend?code=ABC123)
 *  - create a room -> share the 6-character code or the link
 *  - the friend joins -> both screens count down 5 s and start together
 *  - same words for both, live positions of both cars, engine sound,
 *    account names on the cars, first across the line wins, rematch
 * Server: /api/friend/rooms (FriendRaceController).
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const { esc, $ } = TM;
  const API = '/api/friend/rooms';
  const NAME_KEY = 'friendName';
  const SESSION_KEY = 'friendRoom';
  const DIFFS = [
    { id: 'EASY', label: '🟢 Easy', info: '120 m · easy words' },
    { id: 'MEDIUM', label: '🟠 Medium', info: '180 m · longer words · mistakes push back' },
    { id: 'HARD', label: '🔴 Hard', info: '250 m · hard words · bigger push back' }
  ];

  // ---------------------------------------------------------------- helpers
  /** Small seeded random generator so both players get exactly the same words. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function wordList(seed, pool, n) {
    const list = TM.Words.POOLS[pool] || TM.Words.POOLS.EASY;
    const r = rng(seed);
    const out = [];
    while (out.length < n) {
      const w = list[Math.floor(r() * list.length)];
      if (w !== out[out.length - 1]) out.push(w);
    }
    return out;
  }
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };
  const shareLink = (code) => `${location.origin}${location.pathname}#/friend?code=${code}`;
  const myName = () => {
    const u = TM.Api.user();
    return u && u.username ? u.username : (TM.Store.get(NAME_KEY, '') || '');
  };
  const short = (n) => (n.length > 14 ? n.slice(0, 13) + '…' : n);

  // ================================================================== page
  function friend(root, params) {
    let alive = true;
    let session = null;           // {code, playerId}
    let state = null;             // last room state from the server
    let offset = 0, bestRtt = Infinity; // server clock - local clock
    let pollTimer = 0, polling = false;
    let race = null;              // current race screen (per round)
    let view = '';

    const serverNow = () => Date.now() + offset;

    async function call(path, body) {
      const t0 = Date.now();
      const r = await TM.Api.post(API + path, body);
      const t1 = Date.now();
      if (r && r.serverNow) {
        const rtt = t1 - t0;
        // keep the sample with the smallest round trip (most accurate), drift slowly otherwise
        if (rtt <= bestRtt + 30) { bestRtt = Math.min(bestRtt, rtt); offset = r.serverNow - (t0 + t1) / 2; }
      }
      return r;
    }

    // ------------------------------------------------------------ lobby
    function showLobby(errorMsg) {
      view = 'lobby';
      const loggedIn = !!(TM.Api.user() && TM.Api.user().username);
      const code = (params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      root.innerHTML = `
        <section class="page-head friend-head">
          <h1>👥 Play with Friend</h1>
          <p class="lead">Create a race, send the code or link to your friend, and as soon as they join you both start together after a 5 second countdown. Same words, live cars - fastest typist wins!</p>
        </section>
        <div class="friend-grid">
          <div class="panel-card friend-card">
            <h2>🏁 Create a race</h2>
            <label class="friend-label">Your name on the car
              <input class="friend-name" maxlength="20" value="${esc(myName())}" ${loggedIn ? 'readonly title="Your account name"' : 'placeholder="Enter your name"'}>
            </label>
            <div class="friend-label">Difficulty</div>
            <div class="chips friend-diff">${DIFFS.map((d, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-diff="${d.id}">${d.label}</button>`).join('')}</div>
            <p class="muted small friend-diff-info">${DIFFS[0].info}</p>
            <button class="btn btn-primary btn-lg btn-block" data-create>🚗 Create Race &amp; Get Code</button>
          </div>
          <div class="panel-card friend-card">
            <h2>🔑 Join a friend</h2>
            <label class="friend-label">Your name on the car
              <input class="friend-name2" maxlength="20" value="${esc(myName())}" ${loggedIn ? 'readonly' : 'placeholder="Enter your name"'}>
            </label>
            <label class="friend-label">Race code
              <input class="friend-code" maxlength="6" placeholder="ABC123" value="${esc(code)}" autocomplete="off" autocapitalize="characters" spellcheck="false">
            </label>
            <button class="btn btn-success btn-lg btn-block" data-join>▶ Join Race</button>
          </div>
        </div>
        <div class="form-error friend-error">${errorMsg ? esc(errorMsg) : ''}</div>`;

      let diff = 'EASY';
      root.querySelector('.friend-diff').addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return;
        diff = b.dataset.diff;
        root.querySelectorAll('.friend-diff .chip').forEach((c) => c.classList.toggle('active', c === b));
        $('.friend-diff-info', root).textContent = DIFFS.find((d) => d.id === diff).info;
      });
      const codeIn = $('.friend-code', root);
      codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
      if (code) { codeIn.closest('.friend-card').classList.add('highlight'); setTimeout(() => (loggedIn || myName() ? $('[data-join]', root) : $('.friend-name2', root)).focus(), 50); }

      const err = (m) => { $('.friend-error', root).textContent = m || ''; };
      const readName = (sel) => {
        const n = $(sel, root).value.trim();
        if (!n) { err('Please enter your name - it is shown on your car.'); $(sel, root).focus(); return null; }
        if (!loggedIn) TM.Store.set(NAME_KEY, n);
        return n;
      };

      $('[data-create]', root).addEventListener('click', async (e) => {
        const name = readName('.friend-name'); if (!name) return;
        e.target.disabled = true; err('');
        try {
          const r = await call('', { name, difficulty: diff });
          begin(r);
        } catch (ex) { err(ex.message); e.target.disabled = false; }
      });
      async function join() {
        const name = readName('.friend-name2'); if (!name) return;
        const c = codeIn.value.trim();
        if (c.length !== 6) { err('The race code has 6 letters/numbers.'); codeIn.focus(); return; }
        const btn = $('[data-join]', root); btn.disabled = true; err('');
        try {
          const r = await call(`/${c}/join`, { name });
          begin(r);
        } catch (ex) { err(ex.message); btn.disabled = false; }
      }
      $('[data-join]', root).addEventListener('click', join);
    }

    function begin(r) {
      session = { code: r.code, playerId: r.playerId };
      store.set(SESSION_KEY, session);
      if (location.hash !== `#/friend?code=${r.code}`) history.replaceState(null, '', `#/friend?code=${r.code}`);
      apply(r);
      schedule(0);
    }

    // ------------------------------------------------------------ polling
    function schedule(ms) {
      clearTimeout(pollTimer);
      if (alive) pollTimer = setTimeout(poll, ms);
    }
    async function poll() {
      if (!alive || !session || polling) return;
      polling = true;
      try {
        const body = { playerId: session.playerId };
        if (race) Object.assign(body, race.progress());
        apply(await call(`/${session.code}/state`, body));
      } catch (ex) {
        if (ex.status === 404 || ex.status === 403) {
          store.del(SESSION_KEY); session = null; stopRace();
          showLobby(ex.status === 404 ? 'This race has expired. Create a new one.' : ex.message);
          polling = false; return;
        }
        // network hiccup: keep trying
      }
      polling = false;
      const st = state ? state.status : 'WAITING';
      schedule(st === 'RACING' ? 150 : st === 'COUNTDOWN' ? 250 : 1000);
    }

    function apply(s) {
      if (!alive || !s) return;
      const prev = state;
      state = s;
      if (s.status === 'WAITING') {
        if (view !== 'share') showShare();
        return;
      }
      if (!race || race.round !== s.round) {
        if (prev && prev.status === 'WAITING') TM.Sound.play('levelup'); // friend joined
        stopRace();
        race = createRace(s);
      }
      race.update(s);
    }

    // ------------------------------------------------------------ share screen
    function showShare() {
      view = 'share';
      const code = state.code;
      const link = shareLink(code);
      const diff = DIFFS.find((d) => d.id === state.difficulty) || DIFFS[0];
      const msg = `Race me on TypeMaster Arena! 🏎️ Join with code ${code} or open: ${link}`;
      root.innerHTML = `
        <section class="page-head friend-head center-text">
          <h1>👥 Race created!</h1>
          <p class="lead">Send this code or link to your friend. The race starts for both of you 5 seconds after they join.</p>
        </section>
        <div class="panel-card friend-share">
          <div class="muted small">RACE CODE</div>
          <div class="room-code" aria-label="Race code">${code.split('').map((ch) => `<span>${esc(ch)}</span>`).join('')}</div>
          <div class="share-link"><input readonly value="${esc(link)}" aria-label="Share link"><button class="btn btn-primary" data-copy>📋 Copy link</button></div>
          <div class="share-row">
            <a class="btn btn-success" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">💬 Share on WhatsApp</a>
            <button class="btn btn-ghost" data-copycode>🔑 Copy code</button>
            ${navigator.share ? '<button class="btn btn-ghost" data-share>📤 Share…</button>' : ''}
          </div>
          <div class="waiting"><div class="loader"></div><b>Waiting for your friend to join…</b>
            <span class="muted small">${esc(diff.label)} · ${state.distance} m · You: ${esc(short(state.players[0].name))}</span></div>
          <button class="btn btn-ghost btn-sm" data-cancel>✖ Cancel race</button>
        </div>`;
      const copy = async (text, okMsg) => {
        try { await navigator.clipboard.writeText(text); TM.toast(okMsg, 'success'); }
        catch (e) { const i = $('.share-link input', root); i.select(); document.execCommand('copy'); TM.toast(okMsg, 'success'); }
      };
      $('[data-copy]', root).addEventListener('click', () => copy(link, 'Link copied - send it to your friend!'));
      $('[data-copycode]', root).addEventListener('click', () => copy(code, 'Code copied!'));
      const sh = $('[data-share]', root);
      if (sh) sh.addEventListener('click', () => navigator.share({ title: 'TypeMaster Arena race', text: msg, url: link }).catch(() => {}));
      $('[data-cancel]', root).addEventListener('click', () => { leave(); location.hash = '#/friend'; });
    }

    // ------------------------------------------------------------ race screen
    function createRace(s) {
      view = 'race';
      const RA = TM.RaceArt;
      const theme = RA.THEMES[s.theme] || RA.THEMES.DAY;
      const night = s.theme === 'NIGHT' || s.theme === 'NEON';
      const meIdx = s.players.findIndex((p) => p.you);
      const me = s.players[meIdx], opp = s.players[1 - meIdx];
      const meName = short(me.name), oppName = short(opp.name);
      const words = wordList(s.seed, s.pool, 600);
      const D = s.distance;

      root.innerHTML = `
        <section class="friend-race-head">
          <h1>👥 ${esc(meName)} <span class="muted">vs</span> ${esc(oppName)}</h1>
          <div class="muted small">Code ${esc(s.code)} · Round ${s.round} · ${D} m</div>
        </section>
        <div class="race theme-${s.theme.toLowerCase()} friend-race">
          <div class="race-bars">
            <div class="race-bar you"><span class="rb-name">🚗 ${esc(meName)}</span><div class="bar"><i></i></div><b class="rb-dist">0 m</b></div>
            <div class="race-bar ai"><span class="rb-name">🏎️ ${esc(oppName)}</span><div class="bar"><i></i></div><b class="rb-dist">0 m</b></div>
          </div>
          <div class="race-canvas-wrap"><canvas class="race-canvas"></canvas><div class="race-banner"></div><div class="friend-count"></div></div>
          <div class="race-words"></div>
          <div class="word-input-wrap"><input class="word-input" type="text" placeholder="Get ready…" aria-label="Type here" disabled></div>
          <div class="race-dash">
            <div class="speedo"><span>Your speed</span><b class="sp-val">0.0</b><small>m/s · <i class="sp-kmh">0</i> km/h</small><div class="sp-bar"><i></i></div></div>
            <div class="streak"><span>Streak</span><b class="st-val">0</b><small class="st-mult">x1.00 bonus</small></div>
            <div class="gap"><span>Gap to ${esc(oppName)}</span><b class="gap-val">0.0 m</b><small class="gap-lbl">level</small></div>
            <div class="aispeed"><span>Live WPM</span><b class="wpm-val">0</b><small class="acc-val">100% accuracy</small></div>
          </div>
          <div class="friend-result" hidden></div>
        </div>`;

      const q = (sel) => $(sel, root);
      const canvas = q('.race-canvas'), ctx = canvas.getContext('2d');
      const input = q('.word-input'), wordsEl = q('.race-words'), banner = q('.race-banner'), countEl = q('.friend-count');
      const youBar = q('.race-bar.you i'), oppBar = q('.race-bar.ai i');
      const youDist = q('.race-bar.you .rb-dist'), oppDist = q('.race-bar.ai .rb-dist');
      const spVal = q('.sp-val'), spKmh = q('.sp-kmh'), spBar = q('.sp-bar i');
      const stVal = q('.st-val'), stMult = q('.st-mult'), gapVal = q('.gap-val'), gapLbl = q('.gap-lbl');
      const wpmVal = q('.wpm-val'), accVal = q('.acc-val'), resultEl = q('.friend-result');

      const tracker = new TM.StatsTracker();
      const R = {
        round: s.round, player: 0, shown: 0, opp: 0, oppShown: 0, oppTarget: 0, streak: 0, clean: true,
        speed: 0, oppSpeed: 0, samples: [], oppSamples: [], wheel: 0, oppWheel: 0, time: 0, particles: [],
        started: false, done: false, over: false, lastCount: null, engine: null, raf: 0, last: 0, shake: 0
      };
      let wi = 0, typedLen = 0;
      const mult = () => 1 + Math.min(R.streak, 10) * 0.02;

      const renderWords = (typed = '') => {
        const cur = words[wi];
        wordsEl.innerHTML = words.slice(wi, wi + 10).map((w, i) => (i === 0
          ? `<span class="w current"><span class="typed">${esc(cur.slice(0, typed.length))}</span>${esc(cur.slice(typed.length))}</span>`
          : `<span class="w">${esc(w)}</span>`)).join(' ');
      };
      renderWords();

      const ctl = TM.bindWordInput(input, tracker, {
        mode: 'reject',
        isEnabled: () => R.started && !R.done && !R.over,
        validate: (cand) => words[wi].startsWith(cand),
        onMiss: () => {
          R.streak = 0; R.clean = false; R.shake = 0.25;
          R.player = Math.max(0, R.player - s.penalty);
          input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
        },
        onChange: (v) => {
          if (v.length > typedLen) R.player = Math.min(D, R.player + (v.length - typedLen) * mult());
          typedLen = v.length;
          if (v === words[wi]) {
            tracker.word();
            if (R.clean) { R.streak++; if (R.streak === 5 || R.streak === 10) TM.Sound.play('boost'); }
            R.clean = true;
            wi = (wi + 1) % words.length;
            ctl.clear(); typedLen = 0;
            renderWords('');
          } else renderWords(v);
          if (R.player >= D && !R.done) {
            R.done = true; input.disabled = true; tracker.stop();
            banner.className = 'race-banner show intro'; banner.textContent = '🏁 Finished! Checking result…';
            schedule(0); // tell the server right away
          }
        }
      });

      // ---- sizing
      let W = 0, H = 0, PPM = 14, scale = 1.2;
      const resize = () => {
        const r = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        W = Math.max(280, r.width);
        H = Math.round(TM.clamp(window.innerHeight * 0.32, W < 600 ? 170 : 190, W < 600 ? 230 : 300));
        canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        PPM = W < 600 ? 9 : 14;
        scale = (W < 600 ? 0.85 : 1.25) * Math.min(1, H / 300 + 0.15);
        draw(0);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement);

      function label(c, x, y, text, color) {
        c.font = 'bold 11px Inter, sans-serif'; c.textAlign = 'center';
        const w = c.measureText(text).width + 12;
        c.fillStyle = 'rgba(15,23,42,0.8)'; RA.roundRect(c, x - w / 2, y - 10, w, 16, 8); c.fill();
        c.strokeStyle = color; c.lineWidth = 1.5; RA.roundRect(c, x - w / 2, y - 10, w, 16, 8); c.stroke();
        c.fillStyle = color; c.fillText(text, x, y + 2);
      }
      function arrow(c, x, y, dir, text) {
        c.font = 'bold 12px Inter, sans-serif'; c.textAlign = dir > 0 ? 'right' : 'left';
        c.fillStyle = '#fb923c';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * 12, y - 8); c.lineTo(x - dir * 12, y + 8); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.fillText(text, x - dir * 16, y + 4);
      }

      function draw(dt) {
        if (!W) return;
        const c = ctx;
        const camX = R.shown * PPM - W * 0.28 + (R.shake > 0 ? (Math.random() - 0.5) * 6 : 0);
        const { roadTop, roadBot } = RA.drawScene(c, W, H, theme, s.theme, camX, R.time, PPM, D);
        const laneOpp = roadTop + (roadBot - roadTop) * 0.42;
        const laneYou = roadTop + (roadBot - roadTop) * 0.92;
        const carLen = 71 * scale;
        const oppX = R.oppShown * PPM - camX - carLen;
        const youX = R.shown * PPM - camX - carLen;

        if (R.speed > 0.3 && !R.over && Math.random() < 0.6) {
          R.particles.push({ x: R.shown * PPM - carLen, y: laneYou - 9 * scale, life: 0.6, vx: -20 - Math.random() * 20, vy: -8 - Math.random() * 8 });
        }
        R.particles = R.particles.filter((p) => (p.life -= dt) > 0);
        R.particles.forEach((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          c.fillStyle = `rgba(203,213,225,${p.life * 0.5})`;
          c.beginPath(); c.arc(p.x - camX, p.y, 3 + (0.6 - p.life) * 8, 0, Math.PI * 2); c.fill();
        });

        RA.drawCar(c, oppX, laneOpp, scale * 0.9, '#ea580c', '#fde047', R.oppWheel, night);
        label(c, oppX + carLen * 0.45, laneOpp - 34 * scale, oppName, '#fb923c');
        RA.drawCar(c, youX, laneYou, scale, '#0891b2', '#a3e635', R.wheel, night);
        label(c, youX + carLen * 0.5, laneYou - 38 * scale, meName, '#22d3ee');

        if (R.speed > 4 && !R.over) {
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5;
          for (let i = 0; i < 5; i++) {
            const y = laneYou - 30 * scale + RA.hash(i + Math.floor(R.time * 8)) * 26 * scale;
            const x = youX - 20 - RA.hash(i * 7 + Math.floor(R.time * 8)) * 80;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.stroke();
          }
        }
        const gap = R.oppShown - R.shown;
        if (oppX > W - 20) arrow(c, W - 8, laneOpp - 10, 1, `${oppName} +${gap.toFixed(0)}m`);
        else if (oppX + carLen < 0) arrow(c, 8, laneOpp - 10, -1, `${oppName} ${gap.toFixed(0)}m`);
      }

      const speedOf = (samples, t, v) => {
        samples.push([t, v]);
        while (samples.length > 2 && t - samples[0][0] > 2) samples.shift();
        const span = t - samples[0][0];
        return span > 0.3 ? Math.max(0, (v - samples[0][1]) / span) : 0;
      };

      function frame(ts) {
        if (!alive) return;
        const dt = Math.min(0.05, R.last ? (ts - R.last) / 1000 : 0);
        R.last = ts;
        countdown();
        if (R.started && !R.over) R.time += dt;
        R.shown += (R.player - R.shown) * Math.min(1, dt * 8);
        // the friend's position arrives a few times per second - glide towards it
        R.oppShown += (R.oppTarget - R.oppShown) * Math.min(1, dt * 6);
        R.speed = speedOf(R.samples, R.time, R.player);
        R.oppSpeed = speedOf(R.oppSamples, R.time, R.oppShown);
        R.wheel += (R.speed + 0.2) * dt * 2.2;
        R.oppWheel += (R.oppSpeed + 0.2) * dt * 2.2;
        R.shake = Math.max(0, R.shake - dt);
        if (R.engine) R.engine.set(R.speed / 6);
        dash();
        draw(dt);
        R.raf = requestAnimationFrame(frame);
      }

      function countdown() {
        if (R.started) return;
        const left = s.startAt - serverNow();
        if (left <= 0) {
          R.started = true;
          countEl.innerHTML = '<div class="countdown"><span class="go">GO!</span></div>';
          setTimeout(() => { if (alive) countEl.innerHTML = ''; }, 700);
          TM.Sound.play('go');
          input.disabled = false; input.placeholder = 'Type the highlighted word...';
          input.focus({ preventScroll: true });
          tracker.start();
          R.engine = TM.Sound.engine(); R.engine.set(0);
          return;
        }
        const n = Math.ceil(left / 1000);
        if (n !== R.lastCount) {
          R.lastCount = n;
          countEl.innerHTML = `<div class="countdown"><span>${n}</span><small>${esc(oppName)} is here - get ready!</small></div>`;
          TM.Sound.play('countdown');
        }
      }

      let dashN = 0;
      function dash() {
        if (dashN++ % 4) return;
        youBar.style.width = TM.clamp(R.player / D, 0, 1) * 100 + '%';
        oppBar.style.width = TM.clamp(R.oppShown / D, 0, 1) * 100 + '%';
        youDist.textContent = `${Math.min(R.player, D).toFixed(1)} / ${D} m`;
        oppDist.textContent = `${Math.min(R.oppShown, D).toFixed(1)} / ${D} m`;
        spVal.textContent = R.speed.toFixed(1);
        spKmh.textContent = (R.speed * 3.6).toFixed(0);
        spBar.style.width = TM.clamp(R.speed / 8, 0, 1) * 100 + '%';
        spBar.classList.toggle('faster', R.speed >= R.oppSpeed && R.speed > 0);
        stVal.textContent = R.streak; stMult.textContent = `x${mult().toFixed(2)} bonus`;
        const gap = R.player - R.oppShown;
        gapVal.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(1) + ' m';
        gapVal.className = 'gap-val ' + (gap > 0.5 ? 'ahead' : gap < -0.5 ? 'behind' : '');
        gapLbl.textContent = gap > 0.5 ? 'you lead' : gap < -0.5 ? 'behind' : 'level';
        const snap = tracker.snapshot();
        wpmVal.textContent = Math.round(snap.netWpm);
        accVal.textContent = `${tracker.typed === 0 ? 100 : snap.accuracy}% accuracy`;
      }

      function showResult(st) {
        if (R.over) return;
        R.over = true; R.done = true;
        input.disabled = true; tracker.stop();
        if (R.engine) { R.engine.stop(); R.engine = null; }
        const meP = st.players.find((p) => p.you), oppP = st.players.find((p) => !p.you);
        const won = meP && meP.winner;
        const left = oppP && !oppP.online && !oppP.finished;
        banner.className = 'race-banner show ' + (won ? 'win' : 'loss');
        banner.textContent = won ? (left ? '🏆 You win! (friend left)' : '🏆 YOU WIN!') : `🏁 ${short(oppP.name)} WINS`;
        TM.Sound.play(won ? 'win' : 'lose');
        if (won) confetti(q('.friend-race'));
        const snap = tracker.snapshot();
        const row = (p, extra) => `<tr class="${p.winner ? 'win' : ''}"><td>${p.winner ? '🏆 ' : ''}${esc(short(p.name))}${extra}</td>
            <td>${p.finished && p.timeMs != null ? (p.timeMs / 1000).toFixed(1) + ' s' : Math.min(p.distance, D).toFixed(0) + ' m'}</td>
            <td>${p.wpm.toFixed(0)}</td><td>${p.accuracy.toFixed(1)}%</td></tr>`;
        const mine = Object.assign({}, meP, { wpm: snap.wpm || meP.wpm, accuracy: tracker.typed ? snap.accuracy : meP.accuracy });
        resultEl.hidden = false;
        resultEl.innerHTML = `
          <div class="panel-card friend-result-card">
            <h2>${won ? '🏆 You won the race!' : `😅 ${esc(short(oppP.name))} won this time`}</h2>
            <table class="friend-table"><thead><tr><th>Player</th><th>Time</th><th>WPM</th><th>Accuracy</th></tr></thead>
              <tbody>${row(mine, ' <span class="muted">(you)</span>')}${row(oppP, '')}</tbody></table>
            <div class="friend-rematch-msg muted small"></div>
            <div class="share-row">
              <button class="btn btn-primary" data-rematch>🔁 Rematch</button>
              <a class="btn btn-ghost" href="#/friend" data-new>➕ New race</a>
              <a class="btn btn-ghost" href="#/home" data-home>🏠 Home</a>
            </div>
          </div>`;
        $('[data-rematch]', resultEl).addEventListener('click', async (e) => {
          e.target.disabled = true; e.target.textContent = '⏳ Waiting for friend…';
          try { apply(await call(`/${session.code}/rematch`, { playerId: session.playerId })); }
          catch (ex) { TM.toast(ex.message, 'warn'); e.target.disabled = false; e.target.textContent = '🔁 Rematch'; }
        });
        [$('[data-new]', resultEl), $('[data-home]', resultEl)].forEach((a) => a.addEventListener('click', () => leave()));
        updateRematch(st);
      }

      function updateRematch(st) {
        const msg = $('.friend-rematch-msg', resultEl); if (!msg) return;
        const oppP = st.players.find((p) => !p.you), meP = st.players.find((p) => p.you);
        if (oppP && !oppP.online) msg.textContent = `${short(oppP.name)} left the race.`;
        else if (oppP && oppP.rematch && !meP.rematch) msg.textContent = `🔥 ${short(oppP.name)} wants a rematch! Press Rematch to start.`;
        else if (meP && meP.rematch) msg.textContent = `Waiting for ${short(oppP.name)} to press Rematch…`;
        else msg.textContent = '';
        const btn = $('[data-rematch]', resultEl);
        if (btn) btn.disabled = !!(meP && meP.rematch) || !(oppP && oppP.online);
      }

      R.raf = requestAnimationFrame(frame);

      return {
        round: s.round,
        progress() {
          const snap = tracker.snapshot();
          return { distance: Math.round(R.player * 10) / 10, wpm: snap.wpm, accuracy: tracker.typed ? snap.accuracy : 100 };
        },
        update(st) {
          const oppP = st.players.find((p) => !p.you);
          if (oppP) R.oppTarget = Math.max(R.oppTarget, oppP.distance);
          if (st.status === 'FINISHED') {
            if (oppP && oppP.finished) R.oppTarget = D;
            if (!R.over) showResult(st); else updateRematch(st);
          }
        },
        destroy() {
          cancelAnimationFrame(R.raf); ro.disconnect();
          if (R.engine) { R.engine.stop(); R.engine = null; }
        }
      };
    }

    function stopRace() { if (race) { race.destroy(); race = null; } }

    function confetti(box) {
      const wrap = TM.html('<div class="confetti"></div>');
      box.appendChild(wrap);
      const colors = ['#22d3ee', '#a3e635', '#f472b6', '#fbbf24', '#818cf8'];
      for (let i = 0; i < 80; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = Math.random() * 0.6 + 's';
        p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
        wrap.appendChild(p);
      }
      setTimeout(() => wrap.remove(), 4000);
    }

    function leave() {
      if (!session) return;
      const s = session; session = null;
      store.del(SESSION_KEY);
      try {
        fetch(API + `/${s.code}/leave`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: s.playerId }) });
      } catch (e) { /* ignore */ }
    }

    // ------------------------------------------------------------ start
    const saved = store.get(SESSION_KEY);
    const code = (params.code || '').toUpperCase();
    if (saved && saved.code === code) {
      // page refresh: continue in the same race
      session = saved;
      root.innerHTML = '<div class="loader"></div>';
      poll();
    } else {
      if (saved) store.del(SESSION_KEY);
      showLobby();
    }

    return () => {
      alive = false;
      clearTimeout(pollTimer);
      stopRace();
      // navigating away from the page (not a refresh) leaves the race
      if (!location.hash.startsWith('#/friend?code=' + (session ? session.code : '~'))) leave();
    };
  }

  TM.Pages = TM.Pages || {};
  TM.Pages.friend = friend;
})(window.TM);
