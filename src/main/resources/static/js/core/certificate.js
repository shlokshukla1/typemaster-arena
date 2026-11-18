/* =====================================================================
 * TypeMaster Arena certificate - earned by winning racing level 50.
 * Drawn on a 2000x1414 canvas (A4 landscape ratio), downloadable as PNG
 * or printable / savable as PDF.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  const W = 2000, H = 1414;
  const NAVY = '#1e3a8a', BLUE = '#2563eb', GOLD = '#b8901f', GOLD_LIGHT = '#e6c45a', INK = '#0b1b3f', MUTED = '#5a6a8a';

  function makeId() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
    return `TMA-${ymd}-${rnd}`;
  }

  const Certificate = {
    get LEVEL() { return TM.CERT_LEVEL; },

    earned(map) {
      map = map || TM.Racing.local();
      return !!(map[TM.CERT_LEVEL] && map[TM.CERT_LEVEL].completed);
    },

    /** Issue record (id + date), created once the first time the certificate is earned. */
    record() {
      let c = TM.Store.get('certificate', null);
      if (!c) {
        c = { id: makeId(), date: new Date().toISOString() };
        TM.Store.set('certificate', c);
      }
      return c;
    },

    stats(map) {
      map = map || TM.Racing.local();
      const vals = Object.values(map);
      return {
        levels: vals.filter((p) => p.completed).length,
        stars: vals.reduce((s, p) => s + (p.stars || 0), 0),
        bestWpm: Math.max(0, ...vals.map((p) => p.bestWpm || 0)),
        bestAccuracy: Math.max(0, ...vals.map((p) => p.bestAccuracy || 0))
      };
    },

    defaultName() {
      const u = TM.Api.user();
      return TM.Store.get('certName', '') || (u ? u.username : '');
    },

    /** Opens the certificate viewer (name field, live preview, download / print). */
    async open() {
      if (!Certificate.earned()) {
        TM.toast(`Win level ${TM.CERT_LEVEL} to earn your certificate.`, 'warn');
        return;
      }
      const rec = Certificate.record();
      const m = TM.modal(`
        <div class="cert-viewer">
          <h2>🎓 Your TypeMaster Arena Certificate</h2>
          <p class="muted">Congratulations on winning level ${TM.CERT_LEVEL}! Enter the name to print on your certificate.</p>
          <div class="cert-toolbar">
            <label class="cert-name">Name on certificate
              <input maxlength="40" value="${TM.esc(Certificate.defaultName())}" placeholder="Your full name"></label>
            <button class="btn btn-primary" data-c="png">⬇ Download PNG</button>
            <button class="btn btn-outline" data-c="print">🖨 Print / Save as PDF</button>
          </div>
          <div class="cert-preview"><canvas width="${W}" height="${H}"></canvas></div>
          <p class="muted small">Certificate ID: <b>${TM.esc(rec.id)}</b></p>
        </div>`, { className: 'modal-cert' });
      const canvas = TM.$('canvas', m.el);
      const input = TM.$('.cert-name input', m.el);
      const data = () => {
        const name = input.value.trim() || 'TypeMaster Champion';
        return Object.assign({ name, id: rec.id, date: new Date(rec.date) }, Certificate.stats());
      };
      let t;
      const redraw = () => Certificate.draw(canvas, data());
      input.addEventListener('input', () => {
        TM.Store.set('certName', input.value.trim());
        clearTimeout(t); t = setTimeout(redraw, 120);
      });
      await redraw();
      TM.$('[data-c="png"]', m.el).addEventListener('click', async () => {
        await redraw();
        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `TypeMaster-Arena-Certificate-${data().name.replace(/[^A-Za-z0-9]+/g, '-')}.png`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }, 'image/png');
      });
      TM.$('[data-c="print"]', m.el).addEventListener('click', async () => {
        await redraw();
        const url = canvas.toDataURL('image/png');
        const w = window.open('', '_blank');
        if (!w) { TM.toast('Please allow pop-ups to print the certificate.', 'warn'); return; }
        w.document.write(`<!DOCTYPE html><html><head><title>TypeMaster Arena Certificate</title>
          <style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}img{width:100%;height:100%;object-fit:contain;display:block}</style>
          </head><body><img src="${url}" onload="setTimeout(function(){window.print()},200)"></body></html>`);
        w.document.close();
      });
    },

    /** Draws the certificate. data: {name, id, date, levels, stars, bestWpm, bestAccuracy} */
    async draw(canvas, d) {
      try {
        await Promise.all([
          document.fonts.load('120px "Great Vibes"'),
          document.fonts.load('700 110px "Playfair Display"'),
          document.fonts.load('600 30px Inter')
        ]);
      } catch (e) { /* fall back to system fonts */ }
      const logo = await loadImage('/images/logo.svg');
      const c = canvas.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);

      // background
      const bg = c.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#f7faff'); bg.addColorStop(1, '#eef4ff');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      // soft corner waves
      wave(c, 0, 0, 1); wave(c, W, H, -1);
      // faint guilloche rings as watermark
      c.save(); c.globalAlpha = 0.05; c.strokeStyle = BLUE; c.lineWidth = 2;
      for (let r = 120; r < 520; r += 26) { c.beginPath(); c.arc(W / 2, H / 2 + 40, r, 0, Math.PI * 2); c.stroke(); }
      c.restore();

      // borders
      c.strokeStyle = NAVY; c.lineWidth = 22; c.strokeRect(36, 36, W - 72, H - 72);
      c.strokeStyle = GOLD; c.lineWidth = 4; c.strokeRect(70, 70, W - 140, H - 140);
      c.strokeStyle = GOLD_LIGHT; c.lineWidth = 1.5; c.strokeRect(82, 82, W - 164, H - 164);
      [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]].forEach(([x, y]) => diamond(c, x, y, 22));

      // header
      if (logo) c.drawImage(logo, W / 2 - 55, 118, 110, 110);
      text(c, 'TYPEMASTER ARENA', W / 2, 282, '700 34px Inter', NAVY, 10);

      // title
      text(c, 'CERTIFICATE', W / 2, 420, '700 118px "Playfair Display", Georgia, serif', NAVY, 14);
      text(c, 'OF ACHIEVEMENT', W / 2, 484, '600 38px Inter', GOLD, 16);
      flourish(c, W / 2, 520);

      text(c, 'This certificate is proudly presented to', W / 2, 600, 'italic 34px Georgia, serif', MUTED);

      // name
      const name = d.name;
      let size = 150;
      c.font = `${size}px "Great Vibes", "Brush Script MT", cursive`;
      while (c.measureText(name).width > 1300 && size > 70) { size -= 6; c.font = `${size}px "Great Vibes", "Brush Script MT", cursive`; }
      text(c, name, W / 2, 745, c.font, INK);
      const lineGrad = c.createLinearGradient(560, 0, 1440, 0);
      lineGrad.addColorStop(0, 'rgba(184,144,31,0)'); lineGrad.addColorStop(0.5, GOLD); lineGrad.addColorStop(1, 'rgba(184,144,31,0)');
      c.fillStyle = lineGrad; c.fillRect(560, 778, 880, 3);

      // body
      text(c, `for successfully winning ${TM.CERT_LEVEL} levels of the AI Car Racing Challenge`, W / 2, 850, '400 34px Inter', INK);
      text(c, 'and demonstrating excellent typing speed, accuracy and consistency.', W / 2, 900, '400 34px Inter', INK);

      // title pill
      const pill = `CERTIFIED TYPEMASTER  ·  LEVEL ${TM.CERT_LEVEL}`;
      c.font = '700 28px Inter';
      const pw = measure(c, pill, 4) + 80;
      const pg = c.createLinearGradient(W / 2 - pw / 2, 0, W / 2 + pw / 2, 0);
      pg.addColorStop(0, '#3b82f6'); pg.addColorStop(1, NAVY);
      c.fillStyle = pg; roundRect(c, W / 2 - pw / 2, 940, pw, 62, 31); c.fill();
      text(c, pill, W / 2, 982, '700 28px Inter', '#ffffff', 4);

      // stats row
      const stats = [
        [`${d.levels} / ${TM.RACING_TOTAL}`, 'Levels Completed'],
        [`${Math.round(d.bestWpm)} WPM`, 'Best Racing Speed'],
        [`${d.bestAccuracy.toFixed(1)}%`, 'Best Accuracy'],
        [`${d.stars} ★`, 'Stars Earned']
      ];
      const bw = 300, gap = 30, total = stats.length * bw + (stats.length - 1) * gap;
      stats.forEach(([v, l], i) => {
        const x = W / 2 - total / 2 + i * (bw + gap);
        c.fillStyle = '#ffffff'; roundRect(c, x, 1040, bw, 112, 16); c.fill();
        c.strokeStyle = 'rgba(37,99,235,0.25)'; c.lineWidth = 2; roundRect(c, x, 1040, bw, 112, 16); c.stroke();
        text(c, v, x + bw / 2, 1094, '800 40px Inter', BLUE);
        text(c, l.toUpperCase(), x + bw / 2, 1134, '600 18px Inter', MUTED, 2);
      });

      // date (left)
      const dateStr = d.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      text(c, dateStr, 420, 1250, '600 34px Inter', INK);
      c.fillStyle = NAVY; c.fillRect(260, 1272, 320, 2);
      text(c, 'DATE OF ISSUE', 420, 1306, '600 20px Inter', MUTED, 3);

      // signature (right)
      text(c, 'TypeMaster Arena', 1580, 1252, '64px "Great Vibes", "Brush Script MT", cursive', NAVY);
      c.fillStyle = NAVY; c.fillRect(1420, 1272, 320, 2);
      text(c, 'ISSUED BY TYPEMASTER ARENA', 1580, 1306, '600 20px Inter', MUTED, 3);

      // seal (centre bottom)
      seal(c, W / 2, 1240);

      // id (top right, inside the border)
      text(c, `Certificate ID: ${d.id}`, W - 330, 130, '500 20px Inter', MUTED, 1);
    }
  };

  // ---------------------------------------------------------------- helpers
  function text(c, str, x, y, font, color, spacing = 0) {
    c.font = font;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    if ('letterSpacing' in c) {
      c.letterSpacing = spacing + 'px';
      // centre correction: trailing spacing is added after the last glyph
      c.fillText(str, x + spacing / 2, y);
      c.letterSpacing = '0px';
    } else {
      c.fillText(str, x, y);
    }
  }
  function measure(c, str, spacing) {
    return c.measureText(str).width + (('letterSpacing' in c) ? spacing * str.length : 0);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function diamond(c, x, y, s) {
    c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
    c.fillStyle = GOLD; c.fillRect(-s / 2, -s / 2, s, s);
    c.fillStyle = '#fff'; c.fillRect(-s / 4, -s / 4, s / 2, s / 2);
    c.restore();
  }
  function flourish(c, x, y) {
    c.strokeStyle = GOLD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x - 260, y); c.lineTo(x - 30, y); c.moveTo(x + 30, y); c.lineTo(x + 260, y); c.stroke();
    diamond(c, x, y, 14);
  }
  function wave(c, x, y, dir) {
    c.save(); c.translate(x, y); c.scale(dir, dir);
    const g = c.createLinearGradient(0, 0, 520, 380);
    g.addColorStop(0, 'rgba(37,99,235,0.22)'); g.addColorStop(1, 'rgba(37,99,235,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(560, 0); c.quadraticCurveTo(300, 120, 0, 420); c.closePath(); c.fill();
    c.fillStyle = 'rgba(30,58,138,0.12)';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(340, 0); c.quadraticCurveTo(170, 80, 0, 260); c.closePath(); c.fill();
    c.restore();
  }
  function seal(c, x, y) {
    c.save(); c.translate(x, y); c.scale(0.8, 0.8);
    // ribbons
    c.fillStyle = NAVY;
    c.beginPath(); c.moveTo(-50, 40); c.lineTo(-74, 122); c.lineTo(-50, 108); c.lineTo(-30, 126); c.lineTo(-10, 60); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(50, 40); c.lineTo(74, 122); c.lineTo(50, 108); c.lineTo(30, 126); c.lineTo(10, 60); c.closePath(); c.fill();
    // star-burst edge
    const spikes = 36, R = 100, r = 90;
    c.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i * Math.PI) / spikes, rad = i % 2 ? r : R;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath();
    const g = c.createRadialGradient(-20, -20, 10, 0, 0, R);
    g.addColorStop(0, '#f7dd85'); g.addColorStop(1, GOLD);
    c.fillStyle = g; c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 74, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 66, 0, Math.PI * 2); c.stroke();
    c.restore();
    text(c, 'CERTIFIED', x, y - 18, '800 14px Inter', '#ffffff', 2);
    text(c, String(TM.CERT_LEVEL), x, y + 16, '800 36px Inter', '#ffffff');
    text(c, 'LEVELS', x, y + 36, '700 12px Inter', '#ffffff', 2);
  }
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  TM.Certificate = Certificate;
})(window.TM);
