/* =====================================================================
 * Typing engines.
 *
 *  TM.TextTyper     - passage typing with per-character green/red highlight
 *                     (Speed, Paragraph, Code, Practice).
 *  TM.bindWordInput - judges every keystroke typed into an <input>
 *                     (Racing, Words, Falling, Zombie, Bubble, Numbers, Survival).
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const isWhitespace = (c) => c === ' ' || c === '\n' || c === '\t';

  /**
   * Passage typer.
   * options: tracker (StatsTracker), code (bool: monospace + Enter newlines + auto-indent),
   *          onKey(char, correct), onComplete(), onProgress(pos, length), keyboard (VirtualKeyboard)
   */
  class TextTyper {
    constructor(container, text, options = {}) {
      this.opt = options;
      this.tracker = options.tracker;
      this.enabled = false;
      this.root = TM.html(`<div class="typer ${options.code ? 'typer-code' : ''}" tabindex="-1">
          <div class="typer-text"></div>
          <textarea class="typer-input" autocomplete="off" autocorrect="off" autocapitalize="off"
                    spellcheck="false" aria-label="Type here"></textarea>
          <div class="typer-hint">Click here and start typing</div>
        </div>`);
      container.appendChild(this.root);
      this.textEl = TM.$('.typer-text', this.root);
      this.input = TM.$('.typer-input', this.root);
      this._bind();
      this.setText(text);
    }

    setText(text) {
      this.text = text.replace(/\r/g, '').replace(/\t/g, '    ');
      this.pos = 0;
      this.state = new Array(this.text.length).fill(0); // 1 correct, -1 wrong, 0 pending
      this.auto = new Array(this.text.length).fill(false); // auto-skipped indentation
      this.textEl.innerHTML = '';
      this.spans = [];
      this._appendSpans(0);
      this._skipIndent();
      this._caret();
    }

    /** Adds more text at the end (used by timed Speed Typing). */
    append(more) {
      const start = this.text.length;
      this.text += more;
      this.state.push(...new Array(more.length).fill(0));
      this.auto.push(...new Array(more.length).fill(false));
      this._appendSpans(start);
    }

    _appendSpans(from) {
      const frag = document.createDocumentFragment();
      for (let i = from; i < this.text.length; i++) {
        const c = this.text[i];
        const s = document.createElement('span');
        s.className = 'ch';
        if (c === '\n') { s.textContent = '↵'; s.classList.add('nl'); }
        else if (c === ' ') { s.textContent = ' '; s.classList.add('sp'); }
        else s.textContent = c;
        frag.appendChild(s);
        if (c === '\n') frag.appendChild(document.createElement('br'));
        this.spans.push(s);
      }
      this.textEl.appendChild(frag);
    }

    _bind() {
      this.root.addEventListener('mousedown', (e) => { e.preventDefault(); this.focus(); });
      this.input.addEventListener('focus', () => this.root.classList.add('focused'));
      this.input.addEventListener('blur', () => this.root.classList.remove('focused'));
      this.input.addEventListener('paste', (e) => e.preventDefault());
      this.input.addEventListener('drop', (e) => e.preventDefault());

      this.input.addEventListener('keydown', (e) => {
        if (!this.enabled) return;
        if (e.key === 'Backspace') { e.preventDefault(); this._backspace(e.ctrlKey || e.altKey || e.metaKey); }
        else if (e.key === 'Enter') { e.preventDefault(); this._type('\n'); }
        else if (e.key === 'Tab') { e.preventDefault(); }
      });

      // Characters arrive through "input" so mobile keyboards work too.
      this.input.addEventListener('input', (e) => {
        const value = this.input.value;
        this.input.value = '';
        if (!this.enabled) return;
        if (e.inputType && e.inputType.startsWith('delete')) { this._backspace(false); return; }
        for (const ch of value) this._type(ch === '\r' ? '\n' : ch);
      });
    }

    focus() { this.input.focus({ preventScroll: true }); }

    _type(ch) {
      if (this.pos >= this.text.length) return;
      const expected = this.text[this.pos];
      // In normal text, Enter is treated like Space at a line break.
      if (!this.opt.code && ch === '\n') ch = ' ';
      if (!this.opt.code && expected === '\n' && ch === ' ') ch = '\n';
      const ok = ch === expected;
      this.state[this.pos] = ok ? 1 : -1;
      const span = this.spans[this.pos];
      span.classList.remove('correct', 'incorrect');
      span.classList.add(ok ? 'correct' : 'incorrect');
      if (ok) this.tracker && this.tracker.hit(); else this.tracker && this.tracker.miss();
      if (!ok) TM.Sound.play('wrong');
      this.opt.onKey && this.opt.onKey(ch, ok);
      this.opt.keyboard && this.opt.keyboard.press(ch, ok);

      // Word counting: a word counts when its trailing space/newline is reached and it has no errors.
      if (ok && isWhitespace(expected)) this._countWord(this.pos);
      this.pos++;
      if (ok && expected === '\n') this._skipIndent();
      if (this.pos >= this.text.length) {
        if (!isWhitespace(expected)) this._countWord(this.pos);
        this._caret();
        this.enabled = false;
        this.opt.onComplete && this.opt.onComplete();
        return;
      }
      this._caret();
      this.opt.onProgress && this.opt.onProgress(this.pos, this.text.length);
    }

    _countWord(endExclusive) {
      let i = endExclusive - 1;
      if (i >= 0 && isWhitespace(this.text[i])) i--;
      let any = false;
      while (i >= 0 && !isWhitespace(this.text[i])) {
        if (this.state[i] !== 1) return;
        any = true; i--;
      }
      if (any && this.tracker) this.tracker.word();
    }

    /** Code mode: after a newline jump over leading indentation automatically. */
    _skipIndent() {
      if (!this.opt.code) return;
      while (this.pos < this.text.length && (this.text[this.pos] === ' ') &&
        (this.pos === 0 || this.text[this.pos - 1] === '\n' || this.auto[this.pos - 1])) {
        this.auto[this.pos] = true;
        this.state[this.pos] = 1;
        this.spans[this.pos].classList.add('skipped');
        this.pos++;
      }
    }

    _backspace(wholeWord) {
      const step = () => {
        // jump back over auto-skipped indentation
        while (this.pos > 0 && this.auto[this.pos - 1]) {
          this.pos--;
        }
        if (this.pos === 0) return false;
        this.pos--;
        this.state[this.pos] = 0;
        this.spans[this.pos].classList.remove('correct', 'incorrect');
        return true;
      };
      if (wholeWord) {
        while (this.pos > 0 && isWhitespace(this.text[this.pos - 1]) && step()) { /* trailing spaces */ }
        while (this.pos > 0 && !isWhitespace(this.text[this.pos - 1]) && step()) { /* word */ }
      } else {
        step();
      }
      // restore auto-indent marker state if we landed right after a newline
      if (this.opt.code && this.pos > 0 && this.text[this.pos - 1] === '\n') this._skipIndent();
      this._caret();
    }

    _caret() {
      if (this.caretSpan) this.caretSpan.classList.remove('current');
      const s = this.spans[Math.min(this.pos, this.spans.length - 1)];
      if (!s) return;
      if (this.pos < this.spans.length) { s.classList.add('current'); this.caretSpan = s; }
      if (this.opt.keyboard) this.opt.keyboard.highlight(this.pos < this.text.length ? this.text[this.pos] : null);
      // keep the caret line visible (scroll the passage box)
      const box = this.textEl; // position:relative scroll container
      const top = s.offsetTop;
      const lineH = s.offsetHeight || 30;
      if (top > box.scrollTop + box.clientHeight - lineH * 2 || top < box.scrollTop) {
        box.scrollTop = Math.max(0, top - lineH);
      }
    }

    get remaining() { return this.text.length - this.pos; }
    get complete() { return this.pos >= this.text.length; }
    destroy() { this.enabled = false; this.root.remove(); }
  }

  /**
   * Judges keystrokes typed into a normal <input>.
   *
   * cfg.mode = 'reject' : a character is accepted only if cfg.validate(candidate) is true;
   *                      otherwise it is NOT inserted and counted as a mistake.
   * cfg.mode = 'free'   : every character is inserted; it is correct only if the whole
   *                      input is still a prefix of cfg.target().
   * cfg.onChange(value), cfg.onMiss(value), cfg.onSubmit(value) (Space/Enter in free mode
   * when cfg.submitKeys contains them), cfg.isEnabled() -> bool.
   * Returns a small controller {clear(), set(value)}.
   */
  function bindWordInput(input, tracker, cfg) {
    let prev = '';
    const enabled = () => (cfg.isEnabled ? cfg.isEnabled() : true);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.addEventListener('paste', (e) => e.preventDefault());
    input.addEventListener('drop', (e) => e.preventDefault());

    const submitKeys = cfg.submitKeys || [];
    input.addEventListener('keydown', (e) => {
      if (!enabled()) { if (e.key.length === 1) e.preventDefault(); return; }
      const k = e.key === ' ' ? ' ' : e.key;
      if (submitKeys.includes(k)) {
        e.preventDefault();
        if (input.value.length) cfg.onSubmit && cfg.onSubmit(input.value);
      }
    });

    input.addEventListener('input', () => {
      let v = input.value;
      if (!enabled()) { input.value = prev; return; }
      if (v.length <= prev.length || !v.startsWith(prev)) {
        // deletion or caret edit - never counted
        if (cfg.mode === 'reject' && v.length && !cfg.validate(v)) v = '';
        prev = v; input.value = v;
        cfg.onChange && cfg.onChange(v);
        return;
      }
      const added = v.slice(prev.length);
      let accepted = prev;
      let submit = false;
      for (const ch of added) {
        // mobile keyboards deliver Space through "input" instead of keydown
        if (submitKeys.includes(ch)) { submit = true; break; }
        const cand = accepted + ch;
        if (cfg.mode === 'reject') {
          if (cfg.validate(cand)) { accepted = cand; tracker.hit(); }
          else { tracker.miss(); TM.Sound.play('wrong'); cfg.onMiss && cfg.onMiss(cand); }
        } else {
          const t = cfg.target ? cfg.target() : '';
          accepted = cand;
          if (t.startsWith(cand)) tracker.hit();
          else { tracker.miss(); TM.Sound.play('wrong'); cfg.onMiss && cfg.onMiss(cand); }
        }
      }
      input.value = accepted;
      prev = accepted;
      cfg.onChange && cfg.onChange(accepted);
      if (submit && accepted.length) cfg.onSubmit && cfg.onSubmit(accepted);
    });

    return {
      clear() { prev = ''; input.value = ''; },
      set(v) { prev = v; input.value = v; },
      get value() { return input.value; }
    };
  }

  TM.TextTyper = TextTyper;
  TM.bindWordInput = bindWordInput;
})(window.TM);
