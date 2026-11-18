/* =====================================================================
 * Passage-based games, all built on TM.TextTyper:
 *   GAME 2 - Speed Typing Challenge (timed 30/60/120 s)
 *   GAME 7 - Paragraph Typing Practice (beginner/intermediate/advanced)
 *   GAME 8 - Code Typing Challenge (Java, JavaScript, HTML, CSS, Python)
 *   Typing Practice section (with on-screen keyboard)
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const W = TM.Words;

  /**
   * Shared setup: creates the typer, wires pause/resume and the countdown.
   * cfg: {text, code, keyboard, onComplete, onProgress}
   */
  function passageGame(shell, cfg) {
    let keyboard = null;
    if (cfg.keyboard) keyboard = new TM.VirtualKeyboard(shell.belowStage);
    const typer = new TM.TextTyper(shell.stage, cfg.text, {
      tracker: shell.tracker,
      code: cfg.code,
      keyboard,
      onComplete: () => cfg.onComplete && cfg.onComplete(typer),
      onProgress: (pos, len) => cfg.onProgress && cfg.onProgress(typer, pos, len)
    });
    shell.useInput(typer.input);
    return {
      typer,
      api: {
        start() {
          shell.countdown(3).then(() => { typer.enabled = true; typer.focus(); });
        },
        pause() { typer.enabled = false; },
        resume() { typer.enabled = true; typer.focus(); },
        destroy() { typer.destroy(); keyboard && keyboard.destroy(); }
      }
    };
  }

  const progressPct = (t) => Math.round((t.pos / t.text.length) * 100) + '%';

  // ------------------------------------------------------------------
  // GAME 2: Speed Typing Challenge
  // ------------------------------------------------------------------
  TM.registerGame({
    id: 'speed',
    name: 'Speed Typing Challenge',
    icon: '⚡',
    color: 'yellow',
    tagline: 'Race the clock. Every second counts.',
    description: 'Type random sentences as fast and accurately as you can before the timer runs out.',
    instructions: [
      'Choose 30, 60 or 120 seconds.',
      'Type the text exactly as shown. Correct characters turn <b class="good">green</b>, mistakes turn <b class="bad">red</b>.',
      'Use <kbd>Backspace</kbd> to fix mistakes - but every wrong keystroke still lowers your accuracy.',
      'Your WPM, accuracy and net speed update live. More text appears as you type.'
    ],
    options: [{ key: 'duration', label: 'Time limit', default: 60, choices: [{ value: 30, label: '30 seconds' }, { value: 60, label: '60 seconds' }, { value: 120, label: '120 seconds' }] }],
    create(shell) {
      const duration = shell.options.duration;
      const g = passageGame(shell, {
        text: W.sentences(8),
        onProgress: (t) => { if (t.remaining < 150) t.append(' ' + W.sentences(4)); }
      });
      const finish = () => {
        const s = shell.tracker.snapshot();
        shell.finish({
          outcome: 'COMPLETED',
          score: s.netWpm * 10 + s.wordsTyped * 2,
          title: "Time's up!",
          subtitle: `${duration}-second challenge finished at ${s.netWpm.toFixed(1)} net WPM.`
        });
      };
      shell.every(100, () => {
        const left = duration - shell.tracker.seconds;
        shell.setHud([
          { label: 'Time left', value: TM.fmt.time(Math.ceil(Math.max(0, left))), cls: left < 10 ? 'danger' : '' },
          { label: 'Live WPM', value: shell.tracker.grossWpm.toFixed(0) },
          { label: 'Accuracy', value: shell.tracker.accuracy.toFixed(0) + '%' }
        ]);
        if (left <= 0) finish();
      });
      shell.setHud([{ label: 'Time left', value: TM.fmt.time(duration) }]);
      return g.api;
    }
  });

  // ------------------------------------------------------------------
  // GAME 7: Paragraph Typing Practice
  // ------------------------------------------------------------------
  const LEVEL_MULT = { beginner: 1, intermediate: 1.5, advanced: 2 };
  TM.registerGame({
    id: 'paragraph',
    name: 'Paragraph Typing Practice',
    icon: '📄',
    color: 'blue',
    tagline: 'Full paragraphs. Real-world typing.',
    description: 'Type complete paragraphs at beginner, intermediate or advanced level with live character highlighting.',
    instructions: [
      'Pick a difficulty and type the whole paragraph.',
      'Correct characters are <b class="good">green</b>, incorrect ones <b class="bad">red</b>. Fix them with <kbd>Backspace</kbd>.',
      'The timer starts after the countdown and stops when the last character is typed.',
      'Score = net WPM and accuracy, multiplied by the difficulty level.'
    ],
    options: [{ key: 'level', label: 'Difficulty', default: 'beginner', choices: [{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }] }],
    create(shell) {
      const level = shell.options.level;
      const g = passageGame(shell, {
        text: W.pick(W.PARAGRAPHS[level]),
        onComplete: () => {
          const s = shell.tracker.snapshot();
          shell.finish({ outcome: 'COMPLETED', score: (s.netWpm * 10 + s.accuracy * 2) * LEVEL_MULT[level], title: 'Paragraph complete!', subtitle: `${level[0].toUpperCase() + level.slice(1)} paragraph typed.` });
        }
      });
      shell.every(200, () => shell.setHud([
        { label: 'Level', value: level },
        { label: 'Progress', value: progressPct(g.typer) },
        { label: 'Time', value: TM.fmt.time(shell.tracker.seconds) }
      ]));
      shell.setHud([{ label: 'Level', value: level }, { label: 'Progress', value: '0%' }]);
      return g.api;
    }
  });

  // ------------------------------------------------------------------
  // GAME 8: Code Typing Challenge
  // ------------------------------------------------------------------
  const LANG_LABEL = { java: 'Java', javascript: 'JavaScript', html: 'HTML', css: 'CSS', python: 'Python' };
  TM.registerGame({
    id: 'code',
    name: 'Code Typing Challenge',
    icon: '💻',
    color: 'green',
    tagline: 'Brackets, semicolons and all.',
    description: 'Type real programming snippets in Java, JavaScript, HTML, CSS and Python. Built for developers.',
    instructions: [
      'Choose a language and type the snippet exactly - symbols and capitals included.',
      'Press <kbd>Enter</kbd> at the end of each line. Indentation is filled in automatically.',
      'Wrong characters are shown in <b class="bad">red</b>; fix them with <kbd>Backspace</kbd>.',
      'Programmers are measured on accuracy: aim for 95%+.'
    ],
    options: [{ key: 'lang', label: 'Language', default: 'java', choices: Object.keys(LANG_LABEL).map((k) => ({ value: k, label: LANG_LABEL[k] })) }],
    create(shell) {
      const lang = shell.options.lang;
      const g = passageGame(shell, {
        text: W.pick(W.CODE[lang]),
        code: true,
        onComplete: () => {
          const s = shell.tracker.snapshot();
          shell.finish({ outcome: 'COMPLETED', score: s.netWpm * 12 + s.accuracy * 3, title: 'Code compiled!', subtitle: `${LANG_LABEL[lang]} snippet typed with ${s.accuracy.toFixed(1)}% accuracy.` });
        }
      });
      shell.every(200, () => shell.setHud([
        { label: 'Language', value: LANG_LABEL[lang] },
        { label: 'Progress', value: progressPct(g.typer) },
        { label: 'Time', value: TM.fmt.time(shell.tracker.seconds) }
      ]));
      shell.setHud([{ label: 'Language', value: LANG_LABEL[lang] }, { label: 'Progress', value: '0%' }]);
      return g.api;
    }
  });

  // ------------------------------------------------------------------
  // Typing Practice section (not one of the 10 games)
  // ------------------------------------------------------------------
  const HOME_ROW = ['as', 'ad', 'all', 'add', 'ask', 'dad', 'fad', 'gas', 'had', 'has', 'lad', 'lag', 'sad', 'salad', 'flask',
    'glass', 'shall', 'half', 'hall', 'jag', 'flag', 'dash', 'lash', 'gash', 'sash', 'fall', 'alas', 'lads', 'asks', 'jjj', 'fff', 'asdf', 'jkl;'];

  const PRACTICE_MODES = {
    beginner: { label: 'Beginner', text: () => Array.from({ length: 30 }, () => W.pick(HOME_ROW)).join(' ') },
    intermediate: { label: 'Intermediate', text: () => W.words(15, 'EASY').concat(W.words(10, 'MEDIUM')).sort(() => Math.random() - 0.5).join(' ') },
    advanced: { label: 'Advanced', text: () => W.words(8, 'HARD').concat(W.words(5, 'CAPITALS'), W.words(5, 'PUNCTUATION'), W.words(3, 'NUMBERS')).sort(() => Math.random() - 0.5).join(' ') },
    paragraph: { label: 'English Paragraph', text: () => W.pick(W.PARAGRAPHS.intermediate.concat(W.PARAGRAPHS.beginner)) },
    words: { label: 'Random Words', text: () => W.words(30, Math.random() < 0.5 ? 'EASY' : 'MEDIUM').join(' ') },
    sentences: { label: 'Sentences', text: () => W.sentences(4) },
    custom: { label: 'Custom Text', text: () => (TM.Store.get('customText', '') || '').trim().replace(/\s+/g, ' ') || 'Type your own text in the box before starting. This is a sample custom text.' }
  };

  TM.registerGame({
    id: 'practice',
    name: 'Typing Practice',
    icon: '⌨️',
    color: 'purple',
    hidden: true,
    keyboard: true,
    backHref: '#/practice',
    tagline: 'Learn proper finger placement with the live keyboard.',
    description: 'Structured practice from home-row drills to advanced text. The on-screen keyboard highlights the next key to press.',
    instructions: [
      'Keep your fingers on the home row: <kbd>A S D F</kbd> and <kbd>J K L ;</kbd> (feel the bumps on F and J).',
      'The glowing key on the keyboard below is the next key to press. Key colours show which finger to use.',
      'When a capital or symbol is needed, Shift on the opposite hand lights up too.',
      'Focus on accuracy first - speed follows.'
    ],
    options: [{ key: 'mode', label: 'Practice mode', default: 'beginner', choices: Object.keys(PRACTICE_MODES).map((k) => ({ value: k, label: PRACTICE_MODES[k].label })) }],
    intro() {
      return `<div class="custom-text-box"><label for="customText">Custom text <small>(used by "Custom Text" mode)</small></label>
        <textarea id="customText" maxlength="2000" rows="3" placeholder="Paste or write any text you want to practise...">${TM.esc(TM.Store.get('customText', ''))}</textarea></div>`;
    },
    create(shell) {
      const mode = shell.options.mode;
      const g = passageGame(shell, {
        text: PRACTICE_MODES[mode].text(),
        keyboard: true,
        onComplete: () => {
          const s = shell.tracker.snapshot();
          shell.finish({ outcome: 'COMPLETED', score: s.netWpm * 5 + s.accuracy, title: 'Practice complete!', subtitle: `${PRACTICE_MODES[mode].label} practice finished.` });
        }
      });
      shell.every(200, () => shell.setHud([
        { label: 'Mode', value: PRACTICE_MODES[mode].label },
        { label: 'Progress', value: progressPct(g.typer) },
        { label: 'Time', value: TM.fmt.time(shell.tracker.seconds) }
      ]));
      shell.setHud([{ label: 'Mode', value: PRACTICE_MODES[mode].label }]);
      return g.api;
    }
  });

  // The custom-text box lives in the instructions overlay; persist it as the user types.
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'customText') TM.Store.set('customText', e.target.value.slice(0, 2000));
  });

  TM.PRACTICE_MODES = PRACTICE_MODES;
})(window.TM);
