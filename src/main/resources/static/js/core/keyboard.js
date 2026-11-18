/* =====================================================================
 * On-screen keyboard that highlights the next key to press
 * (and Shift when needed), colour-coded by finger.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  // [base, shifted, finger] ; finger: lp lr lm li ri rm rr rp th
  const ROWS = [
    [['`', '~', 'lp'], ['1', '!', 'lp'], ['2', '@', 'lr'], ['3', '#', 'lm'], ['4', '$', 'li'], ['5', '%', 'li'], ['6', '^', 'ri'],
      ['7', '&', 'ri'], ['8', '*', 'rm'], ['9', '(', 'rr'], ['0', ')', 'rp'], ['-', '_', 'rp'], ['=', '+', 'rp'], ['Backspace', null, 'rp', 'w2']],
    [['Tab', null, 'lp', 'w15'], ['q', 'Q', 'lp'], ['w', 'W', 'lr'], ['e', 'E', 'lm'], ['r', 'R', 'li'], ['t', 'T', 'li'], ['y', 'Y', 'ri'],
      ['u', 'U', 'ri'], ['i', 'I', 'rm'], ['o', 'O', 'rr'], ['p', 'P', 'rp'], ['[', '{', 'rp'], [']', '}', 'rp'], ['\\', '|', 'rp', 'w15']],
    [['Caps', null, 'lp', 'w18'], ['a', 'A', 'lp'], ['s', 'S', 'lr'], ['d', 'D', 'lm'], ['f', 'F', 'li', 'bump'], ['g', 'G', 'li'], ['h', 'H', 'ri'],
      ['j', 'J', 'ri', 'bump'], ['k', 'K', 'rm'], ['l', 'L', 'rr'], [';', ':', 'rp'], ["'", '"', 'rp'], ['Enter', null, 'rp', 'w22']],
    [['ShiftL', null, 'lp', 'w25'], ['z', 'Z', 'lp'], ['x', 'X', 'lr'], ['c', 'C', 'lm'], ['v', 'V', 'li'], ['b', 'B', 'li'], ['n', 'N', 'ri'],
      ['m', 'M', 'ri'], [',', '<', 'rm'], ['.', '>', 'rr'], ['/', '?', 'rp'], ['ShiftR', null, 'rp', 'w25']],
    [['Space', null, 'th', 'space']]
  ];

  const LABEL = { Backspace: '⌫', Tab: 'Tab', Caps: 'Caps', Enter: 'Enter', ShiftL: 'Shift', ShiftR: 'Shift', Space: '' };
  const LEFT_FINGERS = ['lp', 'lr', 'lm', 'li'];

  class VirtualKeyboard {
    constructor(container) {
      this.el = TM.html('<div class="vkeyboard" aria-hidden="true"></div>');
      this.map = {}; // char -> {key, shift}
      ROWS.forEach((row) => {
        const r = document.createElement('div');
        r.className = 'vk-row';
        row.forEach(([base, shifted, finger, extra]) => {
          const k = document.createElement('div');
          k.className = `vk-key f-${finger} ${extra || ''}`;
          k.dataset.finger = finger;
          if (LABEL[base] !== undefined) k.textContent = LABEL[base];
          else k.innerHTML = shifted && shifted.toLowerCase() !== base
            ? `<small>${TM.esc(shifted)}</small><span>${TM.esc(base)}</span>`
            : `<span>${TM.esc(base.toUpperCase())}</span>`;
          r.appendChild(k);
          if (base === 'Space') this.map[' '] = { key: k };
          else if (base === 'Enter') this.map['\n'] = { key: k };
          else if (base === 'ShiftL') this.shiftL = k;
          else if (base === 'ShiftR') this.shiftR = k;
          else if (base.length === 1) {
            this.map[base] = { key: k };
            if (shifted) this.map[shifted] = { key: k, shift: true };
          }
        });
        this.el.appendChild(r);
      });
      container.appendChild(this.el);
      this.active = [];
    }

    /** Highlights the key(s) needed to type ch (null clears). */
    highlight(ch) {
      this.active.forEach((k) => k.classList.remove('next'));
      this.active = [];
      if (ch == null) return;
      const m = this.map[ch];
      if (!m) return;
      m.key.classList.add('next');
      this.active.push(m.key);
      if (m.shift) {
        // use the Shift of the opposite hand
        const sh = LEFT_FINGERS.includes(m.key.dataset.finger) ? this.shiftR : this.shiftL;
        sh.classList.add('next');
        this.active.push(sh);
      }
    }

    /** Brief press animation for a typed char. */
    press(ch, correct) {
      const m = this.map[ch];
      if (!m) return;
      const cls = correct ? 'hit' : 'miss';
      m.key.classList.remove('hit', 'miss');
      void m.key.offsetWidth; // restart animation
      m.key.classList.add(cls);
      setTimeout(() => m.key.classList.remove(cls), 180);
    }

    destroy() { this.el.remove(); }
  }

  TM.VirtualKeyboard = VirtualKeyboard;
})(window.TM);
