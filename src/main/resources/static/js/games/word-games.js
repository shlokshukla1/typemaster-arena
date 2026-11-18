/* =====================================================================
 * Word-based arcade games:
 *   GAME 3 - Word Typing Challenge
 *   GAME 4 - Falling Words
 *   GAME 5 - Zombie Typing Attack
 *   GAME 6 - Bubble Typing
 *   GAME 9 - Number Typing Challenge
 *   GAME 10 - Survival Typing Challenge
 * All keystrokes are judged by TM.bindWordInput (see core/typer.js).
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const W = TM.Words;
  const hearts = (n, max) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, max - n));

  /** Big animated text in the middle of the stage ("Level 3", "Wave 2"). */
  function banner(shell, text, cls = '') {
    const b = TM.html(`<div class="stage-banner ${cls}">${TM.esc(text)}</div>`);
    shell.stage.appendChild(b);
    setTimeout(() => b.remove(), 1600);
  }

  /** Pool for a 1-based difficulty level used by several games. */
  function poolFor(level) {
    if (level <= 2) return 'EASY';
    if (level <= 4) return Math.random() < 0.6 ? 'MEDIUM' : 'EASY';
    if (level <= 6) return Math.random() < 0.6 ? 'MEDIUM' : 'HARD';
    return Math.random() < 0.7 ? 'HARD' : 'EXPERT';
  }

  /** Renders a word with the typed prefix highlighted. */
  const markPrefix = (word, typed) => (typed && word.startsWith(typed)
    ? `<span class="typed">${TM.esc(typed)}</span>${TM.esc(word.slice(typed.length))}`
    : TM.esc(word));

  // ==================================================================
  // GAME 3: Word Typing Challenge
  // ==================================================================
  TM.registerGame({
    id: 'words',
    name: 'Word Typing Challenge',
    icon: '🔤',
    color: 'pink',
    tagline: 'One word at a time. Faster every level.',
    description: 'Type each English word before its timer runs out. Words get longer and timers shorter as you level up.',
    instructions: [
      'Type the word in the big card. It is accepted automatically when it is correct.',
      'Each word has a timer bar. If it empties, you lose a heart.',
      'Pressing <kbd>Space</kbd> or <kbd>Enter</kbd> on a wrong word skips it and costs a heart.',
      'Every 8 correct words you level up: longer words, less time, more points. Build combos for bonus points.',
      'You have 3 hearts.'
    ],
    create(shell) {
      shell.stage.classList.add('arena');
      shell.stage.innerHTML = `
        <div class="wc">
          <div class="wc-level">Level <b>1</b></div>
          <div class="wc-card"><div class="wc-word"></div><div class="wc-timer"><i></i></div></div>
          <div class="wc-next"></div>
          <div class="wc-combo"></div>
        </div>`;
      const $ = (s) => TM.$(s, shell.stage);
      const input = shell.createInput('Type the word...');
      const S = { level: 1, lives: 3, score: 0, combo: 0, correctInLevel: 0, word: '', next: [], timeLeft: 0, timeMax: 0, started: false };

      const timeFor = (w) => Math.max(2.2, 7.5 - S.level * 0.55) + w.length * 0.18;
      const newWord = () => {
        while (S.next.length < 3) S.next.push(W.word(poolFor(S.level), S.next[S.next.length - 1]));
        S.word = S.next.shift();
        S.next.push(W.word(poolFor(S.level), S.next[S.next.length - 1]));
        S.timeMax = S.timeLeft = timeFor(S.word);
        ctl.clear();
        render('');
      };
      const render = (typed) => {
        $('.wc-word').innerHTML = markPrefix(S.word, typed);
        $('.wc-word').classList.toggle('wrong', !!typed && !S.word.startsWith(typed));
        $('.wc-next').innerHTML = 'Next: ' + S.next.slice(0, 2).map((w) => `<span>${TM.esc(w)}</span>`).join(' ');
        $('.wc-level b').textContent = S.level;
        $('.wc-combo').textContent = S.combo > 1 ? `🔥 Combo x${S.combo}` : '';
        hud();
      };
      const hud = () => shell.setHud([
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Level', value: S.level },
        { label: 'Lives', value: hearts(S.lives, 3) },
        { label: 'Combo', value: 'x' + S.combo }
      ]);
      const loseLife = (why) => {
        S.lives--; S.combo = 0;
        shell.flash('bad'); TM.Sound.play('hurt');
        shell.floatText(shell.stage.clientWidth / 2 - 40, 60, why, 'bad');
        if (S.lives <= 0) {
          shell.finish({ outcome: 'COMPLETED', score: S.score, title: 'Game Over', subtitle: `You reached level ${S.level}.` });
          return;
        }
        newWord();
      };
      const correct = () => {
        const pts = Math.round(S.word.length * 10 * S.level * Math.min(3, 1 + S.combo * 0.1));
        S.score += pts; S.combo++; S.correctInLevel++;
        shell.tracker.word(); TM.Sound.play('correct'); shell.flash('good');
        shell.floatText(shell.stage.clientWidth / 2, 80, '+' + pts, 'good');
        if (S.correctInLevel >= 8) {
          S.level++; S.correctInLevel = 0;
          TM.Sound.play('levelup'); banner(shell, `Level ${S.level}!`);
          S.next = [];
        }
        newWord();
      };

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'free',
        submitKeys: [' ', 'Enter'],
        isEnabled: () => shell.state === 'playing',
        target: () => S.word,
        onChange: (v) => { if (v === S.word) correct(); else render(v); },
        onSubmit: (v) => { if (v === S.word) correct(); else loseLife('Wrong word!'); }
      });

      shell.loop((dt) => {
        if (!S.started) return;
        S.timeLeft -= dt;
        const bar = $('.wc-timer i');
        const pct = TM.clamp(S.timeLeft / S.timeMax, 0, 1);
        bar.style.width = pct * 100 + '%';
        bar.classList.toggle('low', pct < 0.3);
        if (S.timeLeft <= 0) loseLife("Time's up!");
      });

      return {
        start() { newWord(); shell.countdown(3).then(() => { S.started = true; }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });

  // ==================================================================
  // GAME 4: Falling Words
  // ==================================================================
  TM.registerGame({
    id: 'falling',
    name: 'Falling Words',
    icon: '🌧️',
    color: 'blue',
    tagline: 'Catch every word before it hits the ground.',
    description: 'Words rain from the sky. Type them before they reach the bottom. The more you score, the faster they fall.',
    instructions: [
      'Type any falling word - matching words light up as you type.',
      'A word disappears as soon as it is typed completely. Wrong keys are rejected.',
      'Words that hit the ground cost a life. You have 5 lives.',
      'Every 10 words the level goes up: words fall faster and appear more often.'
    ],
    create(shell) {
      shell.stage.classList.add('arena', 'sky-arena');
      shell.stage.innerHTML = '<div class="fw-ground"></div>';
      const input = shell.createInput('Type a falling word...');
      const S = { level: 1, lives: 5, score: 0, caught: 0, spawnT: 0.5, items: [], started: false };
      const speed = () => 28 + S.level * 9;
      const spawnEvery = () => Math.max(0.7, 2.4 - S.level * 0.17);

      const spawn = () => {
        const text = W.word(poolFor(S.level));
        const el = TM.html(`<div class="fw-word">${TM.esc(text)}</div>`);
        shell.stage.appendChild(el);
        const maxX = Math.max(10, shell.stage.clientWidth - el.offsetWidth - 10);
        const item = { text, el, x: 10 + Math.random() * (maxX - 10), y: -30, v: speed() * (0.85 + Math.random() * 0.3) };
        S.items.push(item);
        place(item);
      };
      const place = (it) => { it.el.style.transform = `translate(${it.x}px, ${it.y}px)`; };
      const highlight = (typed) => {
        S.items.forEach((it) => {
          it.el.innerHTML = markPrefix(it.text, typed);
          it.el.classList.toggle('target', !!typed && it.text.startsWith(typed));
        });
      };
      const remove = (it) => { S.items = S.items.filter((x) => x !== it); };
      const hud = () => shell.setHud([
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Level', value: S.level },
        { label: 'Lives', value: hearts(S.lives, 5) },
        { label: 'Caught', value: S.caught }
      ]);
      hud();

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'reject',
        isEnabled: () => shell.state === 'playing',
        validate: (cand) => S.items.some((it) => it.text.startsWith(cand)),
        onChange: (v) => {
          const hits = S.items.filter((it) => it.text === v);
          if (hits.length) {
            const it = hits.sort((a, b) => b.y - a.y)[0]; // lowest one first
            remove(it);
            const pts = it.text.length * 10 * S.level;
            S.score += pts; S.caught++;
            shell.tracker.word(); TM.Sound.play('pop');
            it.el.classList.add('caught');
            shell.floatText(it.x, it.y, '+' + pts, 'good');
            setTimeout(() => it.el.remove(), 350);
            ctl.clear();
            if (S.caught % 10 === 0) { S.level++; TM.Sound.play('levelup'); banner(shell, `Level ${S.level}`); }
            highlight('');
            hud();
            return;
          }
          highlight(v);
        }
      });

      shell.loop((dt) => {
        if (!S.started) return;
        S.spawnT -= dt;
        S.sinceSpawn += dt;
        if (S.spawnT <= 0) { spawn(); S.spawnT = spawnEvery(); highlight(ctl.value); }
        const floor = shell.stage.clientHeight - 34;
        for (const it of S.items.slice()) {
          it.y += it.v * dt;
          place(it);
          if (it.y > floor) {
            remove(it);
            it.el.classList.add('crashed');
            setTimeout(() => it.el.remove(), 400);
            S.lives--; shell.flash('bad'); TM.Sound.play('hurt');
            if (ctl.value && !S.items.some((x) => x.text.startsWith(ctl.value))) { ctl.clear(); highlight(''); }
            hud();
            if (S.lives <= 0) {
              shell.finish({ outcome: 'COMPLETED', score: S.score, title: 'Game Over', subtitle: `You caught ${S.caught} words and reached level ${S.level}.` });
              return;
            }
          }
        }
      });

      return {
        start() { shell.countdown(3).then(() => { S.started = true; }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });

  // ==================================================================
  // GAME 5: Zombie Typing Attack
  // ==================================================================
  const ZOMBIE_DIFF = {
    easy: { speed: 22, spawn: 3.0, pools: ['EASY'], label: 'Easy' },
    normal: { speed: 32, spawn: 2.4, pools: ['EASY', 'MEDIUM'], label: 'Normal' },
    hard: { speed: 44, spawn: 1.9, pools: ['MEDIUM', 'HARD'], label: 'Hard' },
    nightmare: { speed: 58, spawn: 1.5, pools: ['HARD', 'EXPERT', 'CAPITALS'], label: 'Nightmare' }
  };
  TM.registerGame({
    id: 'zombie',
    name: 'Zombie Typing Attack',
    icon: '🧟',
    color: 'green',
    tagline: 'Type fast or become lunch.',
    description: 'Hordes of zombies shamble towards you. Type the word above a zombie to blast it. Survive wave after wave - with a boss every 5th wave.',
    instructions: [
      'Each zombie carries a word. Type it to shoot that zombie.',
      'Matching zombies are highlighted while you type; wrong keys are rejected.',
      'A zombie that reaches you costs a heart. You have 3 hearts.',
      'Clear a wave to start the next, bigger one. Every 5th wave brings a <b>boss</b> with a two-word phrase.',
      'Turn the sound on for the full horror experience.'
    ],
    options: [{ key: 'difficulty', label: 'Difficulty', default: 'normal', choices: Object.keys(ZOMBIE_DIFF).map((k) => ({ value: k, label: ZOMBIE_DIFF[k].label })) }],
    create(shell) {
      const D = ZOMBIE_DIFF[shell.options.difficulty];
      shell.stage.classList.add('arena', 'graveyard');
      shell.stage.innerHTML = `
        <div class="zb-moon"></div>
        <div class="zb-tombs">${'<span>🪦</span>'.repeat(6)}</div>
        <div class="zb-hero"><span class="hero">🧑‍🚀</span><span class="gun">🔫</span></div>
        <div class="zb-ground"></div>`;
      const heroX = 70;
      const input = shell.createInput('Type a zombie\'s word to shoot...');
      const S = { wave: 0, toSpawn: 0, spawnT: 1, lives: 3, score: 0, kills: 0, zs: [], started: false };

      const nextWave = () => {
        S.wave++;
        S.toSpawn = 4 + S.wave * 2;
        S.spawnT = 1.5;
        S.boss = S.wave % 5 === 0;
        banner(shell, S.boss ? `Wave ${S.wave} ☠ BOSS` : `Wave ${S.wave}`, S.boss ? 'danger' : '');
        TM.Sound.play('groan');
        hud();
      };
      const spawn = (boss) => {
        const pool = W.pick(D.pools);
        const text = boss ? `${W.word('MEDIUM')} ${W.word('MEDIUM')}` : W.word(pool);
        const el = TM.html(`<div class="zombie ${boss ? 'boss' : ''}"><div class="zw">${TM.esc(text)}</div><div class="zbody">🧟</div></div>`);
        shell.stage.appendChild(el);
        const h = shell.stage.clientHeight;
        const z = {
          text, el, boss,
          x: shell.stage.clientWidth + 10,
          y: h * 0.42 + Math.random() * (h * 0.38),
          v: D.speed * (boss ? 0.6 : 0.8 + Math.random() * 0.4) * (1 + S.wave * 0.04)
        };
        S.zs.push(z);
        place(z);
        if (Math.random() < 0.3) TM.Sound.play('groan');
      };
      const place = (z) => { z.el.style.transform = `translate(${z.x}px, ${z.y - z.el.offsetHeight}px)`; z.el.style.zIndex = Math.round(z.y); };
      const highlight = (typed) => S.zs.forEach((z) => {
        TM.$('.zw', z.el).innerHTML = markPrefix(z.text, typed);
        z.el.classList.toggle('target', !!typed && z.text.startsWith(typed));
      });
      const hud = () => shell.setHud([
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Wave', value: S.wave },
        { label: 'Hearts', value: hearts(S.lives, 3) },
        { label: 'Kills', value: S.kills },
        { label: 'Mode', value: D.label }
      ]);
      const shoot = (z) => {
        const bullet = TM.html('<div class="bullet"></div>');
        const hy = shell.stage.clientHeight * 0.62;
        bullet.style.transform = `translate(${heroX + 30}px, ${hy}px)`;
        shell.stage.appendChild(bullet);
        requestAnimationFrame(() => { bullet.style.transform = `translate(${z.x + 20}px, ${z.y - 40}px)`; });
        setTimeout(() => bullet.remove(), 180);
        TM.Sound.play('shoot');
        setTimeout(() => TM.Sound.play('explode'), 120);
        z.el.classList.add('dead');
        const boom = TM.html(`<div class="boom" style="left:${z.x}px;top:${z.y - 70}px">💥</div>`);
        shell.stage.appendChild(boom);
        setTimeout(() => { boom.remove(); z.el.remove(); }, 500);
      };

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'reject',
        isEnabled: () => shell.state === 'playing',
        validate: (cand) => S.zs.some((z) => z.text.startsWith(cand)),
        onChange: (v) => {
          const hits = S.zs.filter((z) => z.text === v);
          if (hits.length) {
            const z = hits.sort((a, b) => a.x - b.x)[0]; // closest zombie first
            S.zs = S.zs.filter((x) => x !== z);
            const pts = z.text.replace(/ /g, '').length * 10 * (z.boss ? 5 : 1) + S.wave * 5;
            S.score += pts; S.kills++;
            shell.tracker.word(z.boss ? 2 : 1);
            shoot(z);
            shell.floatText(z.x, z.y - 90, '+' + pts, 'good');
            ctl.clear(); highlight(''); hud();
            return;
          }
          highlight(v);
        }
      });

      shell.loop((dt) => {
        if (!S.started) return;
        if (S.toSpawn > 0) {
          S.spawnT -= dt;
          if (S.spawnT <= 0) {
            const boss = S.boss && S.toSpawn === 1;
            spawn(boss); S.toSpawn--;
            S.spawnT = D.spawn * (0.7 + Math.random() * 0.6) / (1 + S.wave * 0.05);
            highlight(ctl.value);
          }
        } else if (S.zs.length === 0) {
          S.score += S.wave * 100;
          shell.floatText(shell.stage.clientWidth / 2 - 60, 60, `Wave bonus +${S.wave * 100}`, 'gold');
          nextWave();
        }
        for (const z of S.zs.slice()) {
          z.x -= z.v * dt;
          place(z);
          if (z.x < heroX + 20) {
            S.zs = S.zs.filter((x) => x !== z);
            z.el.classList.add('bite');
            setTimeout(() => z.el.remove(), 300);
            S.lives--; shell.flash('bad'); TM.Sound.play('hurt');
            TM.$('.zb-hero', shell.stage).classList.add('hit');
            setTimeout(() => { const h = TM.$('.zb-hero', shell.stage); h && h.classList.remove('hit'); }, 400);
            if (ctl.value && !S.zs.some((x) => x.text.startsWith(ctl.value))) { ctl.clear(); highlight(''); }
            hud();
            if (S.lives <= 0) {
              shell.finish({ outcome: 'LOSS', score: S.score, title: 'The zombies got you!', subtitle: `You survived until wave ${S.wave} with ${S.kills} kills.` });
              return;
            }
          }
        }
      });

      return {
        start() { hud(); shell.countdown(3).then(() => { S.started = true; nextWave(); }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });

  // ==================================================================
  // GAME 6: Bubble Typing
  // ==================================================================
  TM.registerGame({
    id: 'bubble',
    name: 'Bubble Typing',
    icon: '🫧',
    color: 'purple',
    tagline: 'Pop colourful bubbles against the clock.',
    description: 'Bubbles float up carrying words. Type a word to pop its bubble. Golden bubbles add bonus time!',
    instructions: [
      'Type the word inside any bubble to pop it. Matching bubbles glow while you type.',
      'Consecutive pops build a combo multiplier. A bubble escaping at the top resets the combo.',
      '<b class="gold">Golden bubbles</b> give +5 seconds (up to +30 s per game).',
      'Score as many points as possible before the time runs out.'
    ],
    options: [{ key: 'time', label: 'Time challenge', default: 60, choices: [{ value: 60, label: '60 s' }, { value: 90, label: '90 s' }, { value: 120, label: '120 s' }] }],
    create(shell) {
      shell.stage.classList.add('arena', 'ocean');
      const input = shell.createInput('Type a bubble word...');
      const S = { time: shell.options.time, score: 0, combo: 0, popped: 0, items: [], spawnT: 0.3, sinceSpawn: 1, bonus: 0, t: 0, started: false };
      const level = () => 1 + Math.floor(S.popped / 12);

      const spawn = () => {
        const golden = Math.random() < 0.1;
        const text = W.word(poolFor(level()));
        const size = Math.max(70, 26 + text.length * 11);
        const hue = Math.floor(Math.random() * 360);
        const el = TM.html(`<div class="bubble ${golden ? 'golden' : ''}" style="width:${size}px;height:${size}px;--h:${hue}"><span>${TM.esc(text)}</span></div>`);
        shell.stage.appendChild(el);
        const w = shell.stage.clientWidth;
        const it = { text, el, golden, size, x0: Math.random() * Math.max(10, w - size), y: shell.stage.clientHeight + 10, v: 35 + Math.random() * 25 + level() * 4, ph: Math.random() * 6 };
        S.items.push(it);
      };
      const highlight = (typed) => S.items.forEach((it) => {
        TM.$('span', it.el).innerHTML = markPrefix(it.text, typed);
        it.el.classList.toggle('target', !!typed && it.text.startsWith(typed));
      });
      const hud = () => shell.setHud([
        { label: 'Time', value: TM.fmt.time(Math.ceil(S.time)), cls: S.time < 10 ? 'danger' : '' },
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Combo', value: 'x' + Math.min(3, 1 + S.combo * 0.1).toFixed(1) },
        { label: 'Popped', value: S.popped }
      ]);
      hud();

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'reject',
        isEnabled: () => shell.state === 'playing',
        validate: (cand) => S.items.some((it) => it.text.startsWith(cand)),
        onMiss: () => { S.combo = 0; },
        onChange: (v) => {
          const it = S.items.find((b) => b.text === v);
          if (it) {
            S.items = S.items.filter((b) => b !== it);
            const pts = Math.round(it.text.length * 10 * Math.min(3, 1 + S.combo * 0.1));
            S.score += pts; S.combo++; S.popped++;
            // golden bubbles add time, but at most 30 s of bonus per game so the round always ends
            if (it.golden && S.bonus < 30) { S.bonus += 5; S.time += 5; shell.floatText(it.cx, it.y - 20, '+5s', 'gold'); }
            shell.tracker.word(); TM.Sound.play('pop');
            it.el.classList.add('popped');
            shell.floatText(it.cx, it.y, '+' + pts, 'good');
            setTimeout(() => it.el.remove(), 300);
            ctl.clear(); highlight(''); hud();
            return;
          }
          highlight(v);
        }
      });

      shell.loop((dt) => {
        if (!S.started) return;
        S.t += dt;
        S.time -= dt;
        S.spawnT -= dt;
        // regular spawn timer, plus a quicker refill (never faster than 0.4 s) when the screen is nearly empty
        if (S.spawnT <= 0 || (S.items.length < 2 && S.sinceSpawn > 0.4)) { spawn(); S.sinceSpawn = 0; S.spawnT = Math.max(0.7, 1.6 - level() * 0.1); highlight(ctl.value); }
        for (const it of S.items.slice()) {
          it.y -= it.v * dt;
          const x = it.x0 + Math.sin(S.t * 1.5 + it.ph) * 18;
          it.cx = x;
          it.el.style.transform = `translate(${x}px, ${it.y}px)`;
          if (it.y < -it.size) {
            S.items = S.items.filter((b) => b !== it);
            it.el.remove(); S.combo = 0;
            if (ctl.value && !S.items.some((b) => b.text.startsWith(ctl.value))) { ctl.clear(); highlight(''); }
          }
        }
        hud();
        if (S.time <= 0) {
          S.time = 0; hud();
          shell.finish({ outcome: 'COMPLETED', score: S.score, title: "Time's up!", subtitle: `You popped ${S.popped} bubbles.` });
        }
      });

      return {
        start() { shell.countdown(3).then(() => { S.started = true; }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });

  // ==================================================================
  // GAME 9: Number Typing Challenge
  // ==================================================================
  const rnd = TM.randInt;
  const digits = (n) => Array.from({ length: n }, (_, i) => (i === 0 ? rnd(1, 9) : rnd(0, 9))).join('');

  /** Generates a number challenge; harder types unlock as the round count grows. */
  function numberChallenge(round) {
    const types = ['int', 'int', 'group', 'decimal'];
    if (round >= 3) types.push('arith', 'math');
    if (round >= 6) types.push('geo', 'square', 'phone');
    if (round >= 9) types.push('fib', 'math2', 'long');
    const t = TM.Words.pick(types);
    switch (t) {
      case 'int': { const v = digits(rnd(3, 5 + Math.min(3, Math.floor(round / 4)))); return { prompt: v, answer: v, kind: 'Type the number' }; }
      case 'group': { const v = `${digits(3)} ${digits(3)} ${digits(3)}`; return { prompt: v, answer: v, kind: 'Type the number groups' }; }
      case 'decimal': { const v = `${rnd(0, 99)}.${digits(rnd(2, 4))}`; return { prompt: v, answer: v, kind: 'Type the decimal' }; }
      case 'phone': { const v = `(${digits(3)}) ${digits(3)}-${digits(4)}`; return { prompt: v, answer: v, kind: 'Type the phone number' }; }
      case 'long': { const v = digits(rnd(9, 12)); return { prompt: v, answer: v, kind: 'Type the long number' }; }
      case 'arith': {
        const a = rnd(1, 30), d = rnd(2, 12), seq = [0, 1, 2, 3].map((i) => a + i * d);
        return { prompt: seq.join(', ') + ', ?', answer: String(a + 4 * d), kind: 'Next number in the sequence', seq: true };
      }
      case 'geo': {
        const a = rnd(1, 5), r = rnd(2, 3), seq = [0, 1, 2, 3].map((i) => a * Math.pow(r, i));
        return { prompt: seq.join(', ') + ', ?', answer: String(a * Math.pow(r, 4)), kind: 'Next number in the sequence', seq: true };
      }
      case 'square': {
        const s = rnd(1, 8), seq = [0, 1, 2, 3].map((i) => (s + i) * (s + i));
        return { prompt: seq.join(', ') + ', ?', answer: String((s + 4) * (s + 4)), kind: 'Next square number', seq: true };
      }
      case 'fib': {
        let a = rnd(1, 5), b = a + rnd(0, 4); const seq = [a, b];
        for (let i = 0; i < 4; i++) { const c = seq[seq.length - 1] + seq[seq.length - 2]; seq.push(c); }
        const ans = seq.pop();
        return { prompt: seq.join(', ') + ', ?', answer: String(ans), kind: 'Each number is the sum of the previous two', seq: true };
      }
      case 'math': { const a = rnd(2, 50), b = rnd(2, 50); return { prompt: `${a} + ${b} = ?`, answer: String(a + b), kind: 'Solve it', seq: true }; }
      case 'math2': { const a = rnd(2, 12), b = rnd(2, 12); return { prompt: `${a} × ${b} = ?`, answer: String(a * b), kind: 'Solve it', seq: true }; }
    }
    return { prompt: '123', answer: '123', kind: 'Type the number' };
  }

  TM.registerGame({
    id: 'numbers',
    name: 'Number Typing Challenge',
    icon: '🔢',
    color: 'yellow',
    tagline: 'Digits, decimals and number sequences.',
    description: 'Master the number row. Type random numbers exactly and solve mathematical sequences against the countdown.',
    instructions: [
      'Type the number shown exactly - including spaces, dots, dashes and brackets.',
      'For <b>sequences and sums</b>, type the missing number (the <b>?</b>).',
      'Answers are accepted automatically when correct. Press <kbd>Enter</kbd> to skip (-5 points).',
      'Streaks multiply your points. Sequences are worth double. Harder challenges unlock as you go.'
    ],
    options: [{ key: 'time', label: 'Countdown', default: 60, choices: [{ value: 30, label: '30 s' }, { value: 60, label: '60 s' }, { value: 90, label: '90 s' }] }],
    create(shell) {
      shell.stage.classList.add('arena');
      shell.stage.innerHTML = `<div class="nc"><div class="nc-kind"></div><div class="nc-prompt"></div><div class="nc-typed"></div><div class="nc-streak"></div></div>`;
      const $ = (s) => TM.$(s, shell.stage);
      const input = shell.createInput('Type the number...');
      input.setAttribute('inputmode', 'decimal');
      const S = { time: shell.options.time, round: 0, score: 0, streak: 0, solved: 0, ch: null, started: false };

      const next = () => {
        S.ch = numberChallenge(S.round++);
        $('.nc-kind').textContent = S.ch.kind;
        $('.nc-prompt').textContent = S.ch.prompt;
        $('.nc-prompt').classList.toggle('seq', !!S.ch.seq);
        ctl.clear(); showTyped('');
      };
      const showTyped = (v) => {
        const el = $('.nc-typed');
        el.innerHTML = v ? (S.ch.answer.startsWith(v) ? `<span class="good">${TM.esc(v)}</span>` : `<span class="bad">${TM.esc(v)}</span>`) : '&nbsp;';
        $('.nc-streak').textContent = S.streak > 1 ? `🔥 Streak ${S.streak}` : '';
      };
      const hud = () => shell.setHud([
        { label: 'Time', value: TM.fmt.time(Math.ceil(S.time)), cls: S.time < 10 ? 'danger' : '' },
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Solved', value: S.solved },
        { label: 'Streak', value: S.streak }
      ]);
      hud();

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'free',
        submitKeys: ['Enter'],
        isEnabled: () => shell.state === 'playing',
        target: () => S.ch.answer,
        onMiss: () => { S.streak = 0; },
        onChange: (v) => {
          if (v === S.ch.answer) {
            const pts = Math.round(S.ch.answer.length * 10 * (S.ch.seq ? 2 : 1) * Math.min(3, 1 + S.streak * 0.1));
            S.score += pts; S.streak++; S.solved++;
            shell.tracker.word(); TM.Sound.play('correct'); shell.flash('good');
            shell.floatText(shell.stage.clientWidth / 2, 40, '+' + pts, 'good');
            next(); hud();
            return;
          }
          showTyped(v);
        },
        onSubmit: () => {
          S.score = Math.max(0, S.score - 5); S.streak = 0;
          shell.floatText(shell.stage.clientWidth / 2, 40, `Skipped: ${S.ch.answer}`, 'bad');
          TM.Sound.play('wrong'); next(); hud();
        }
      });

      shell.loop((dt) => {
        if (!S.started) return;
        S.time -= dt;
        hud();
        if (S.time <= 0) { S.time = 0; hud(); shell.finish({ outcome: 'COMPLETED', score: S.score, title: "Time's up!", subtitle: `You solved ${S.solved} number challenges.` }); }
      });

      return {
        start() { next(); shell.countdown(3).then(() => { S.started = true; }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });

  // ==================================================================
  // GAME 10: Survival Typing Challenge
  // ==================================================================
  TM.registerGame({
    id: 'survival',
    name: 'Survival Typing Challenge',
    icon: '🔥',
    color: 'red',
    tagline: 'Keep your energy up. Do not slip.',
    description: 'Words keep coming. Your energy drains every second and only correct words refill it. Too many mistakes and you are out.',
    instructions: [
      'Type the current word. Each correct word refills your <b>energy bar</b>.',
      'Energy drains constantly - faster every level. Reach 0 and the game ends.',
      'Wrong keys are rejected and count as a <b>strike</b>. 10 strikes and the game ends.',
      'Every 10 words the level rises: harder words and faster drain. Clearing a level removes 2 strikes.'
    ],
    create(shell) {
      shell.stage.classList.add('arena', 'lava');
      shell.stage.innerHTML = `
        <div class="sv">
          <div class="sv-energy"><span>Energy</span><div class="bar"><i></i></div></div>
          <div class="sv-strikes"></div>
          <div class="sv-word"></div>
          <div class="sv-queue"></div>
          <div class="sv-level">Level 1</div>
        </div>`;
      const $ = (s) => TM.$(s, shell.stage);
      const input = shell.createInput('Type to survive...');
      const MAX_STRIKES = 10, MAX_ENERGY = 10;
      const S = { level: 1, energy: MAX_ENERGY, strikes: 0, words: 0, inLevel: 0, score: 0, queue: [], started: false, t: 0 };
      const refill = () => { while (S.queue.length < 6) S.queue.push(W.word(poolFor(S.level), S.queue[S.queue.length - 1])); };
      refill();

      const render = (typed) => {
        $('.sv-word').innerHTML = markPrefix(S.queue[0], typed);
        $('.sv-queue').innerHTML = S.queue.slice(1, 5).map((w) => `<span>${TM.esc(w)}</span>`).join('');
        $('.sv-strikes').innerHTML = Array.from({ length: MAX_STRIKES }, (_, i) => `<i class="${i < S.strikes ? 'on' : ''}">✖</i>`).join('');
        $('.sv-level').textContent = 'Level ' + S.level;
      };
      const hud = () => shell.setHud([
        { label: 'Score', value: TM.fmt.int(S.score) },
        { label: 'Level', value: S.level },
        { label: 'Words', value: S.words },
        { label: 'Strikes', value: `${S.strikes}/${MAX_STRIKES}`, cls: S.strikes >= 7 ? 'danger' : '' }
      ]);
      const end = (why) => shell.finish({ outcome: 'COMPLETED', score: S.score, title: 'You did not survive', subtitle: `${why} You survived ${S.words} words for ${TM.fmt.time(S.t)} and reached level ${S.level}.` });

      const ctl = TM.bindWordInput(input, shell.tracker, {
        mode: 'reject',
        isEnabled: () => shell.state === 'playing' && S.started,
        validate: (cand) => S.queue[0].startsWith(cand),
        onMiss: () => {
          S.strikes++; shell.flash('bad'); render(ctl.value); hud();
          if (S.strikes >= MAX_STRIKES) end('Too many mistakes!');
        },
        onChange: (v) => {
          if (v === S.queue[0]) {
            const w = S.queue.shift();
            S.words++; S.inLevel++;
            S.energy = Math.min(MAX_ENERGY, S.energy + 1.2 + w.length * 0.3);
            S.score += w.length * 10 * S.level;
            shell.tracker.word(); TM.Sound.play('correct');
            if (S.inLevel >= 10) {
              S.level++; S.inLevel = 0; S.strikes = Math.max(0, S.strikes - 2);
              S.queue = S.queue.slice(0, 1);
              TM.Sound.play('levelup'); banner(shell, `Level ${S.level}`);
            }
            refill(); ctl.clear(); render(''); hud();
            return;
          }
          render(v);
        }
      });
      render(''); hud();

      shell.loop((dt) => {
        if (!S.started) return;
        S.t += dt;
        S.energy -= dt * (0.7 + S.level * 0.18);
        S.score += dt * 5;
        const pct = TM.clamp(S.energy / MAX_ENERGY, 0, 1);
        const bar = $('.sv-energy i');
        bar.style.width = pct * 100 + '%';
        bar.className = pct < 0.25 ? 'low' : pct < 0.5 ? 'mid' : '';
        if (S.energy <= 0) end('Out of energy!');
      });
      shell.every(500, hud);

      return {
        start() { shell.countdown(3).then(() => { S.started = true; }); },
        pause() {}, resume() {}, destroy() {}
      };
    }
  });
})(window.TM);
