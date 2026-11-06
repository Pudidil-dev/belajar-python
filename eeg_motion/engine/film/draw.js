// ============================================================================
// DRAW — the film's palette and its flat-vector kit (Kurzgesagt y1 grammar):
// rounded shapes with no outlines, two-tone faceting (a shadow band toward the
// lower right, a thin highlight edge toward the upper left), soft radial glow
// only on electrical signals, small text labels and captions.
// ============================================================================
(() => {
  const COL = window.COL = {
    bg: '#0D1B2A', bg2: '#10233A', bg3: '#15304A', bg4: '#1B3B57', deep: '#08131F', panel: '#0B1724',
    coral: '#F2877A', coralSh: '#D3685E', coralHi: '#FFB4A8', coralDk: '#A9473F', coralPale: '#F7C4B9', wm: '#F4D6CC', wmSh: '#E3BBAE',
    lav: '#B9AAE6', lavSh: '#988DC2', lavHi: '#DDD5F6', lavDk: '#7D75A2',
    cyan: '#4FE3F0', cyanHi: '#B5F6FB', cyanDk: '#1BA9B8',
    yel: '#FFC94A', yelHi: '#FFE49A', yelDk: '#D99A1E',
    silver: '#E8EEF2', silverSh: '#AEBAC6', silverDk: '#7B8896', white: '#F4F8FB',
    eblue: '#16324F', eblue2: '#1D4268', eblue3: '#25507C', teal: '#1F7A8C', teal2: '#2BA3A6', tealHi: '#5CD3C9',
    green: '#7BE0A0', greenDk: '#3FAE73',
    skin: '#E6B394', skinSh: '#C98F72', skinHi: '#F6D2B8', skinDk: '#A9705A', hair: '#3A2A28', hairHi: '#5E463F', hairDk: '#251A19',
    sweater: '#2D5566', sweaterSh: '#21434F', sweaterHi: '#3E7286', chair: '#1A2F45', chairSh: '#132436', chairHi: '#24405C',
    bone: '#EDE3D1', boneSh: '#CDBFA6', boneDk: '#A89A80', csf: '#7FCFD9', gel: '#7FD8E0',
    amber: '#FFA94D', amberHi: '#FFD29A', red: '#FF7A6B',
    ink: '#EAF2F7', sub: '#8FA3B3',
  };
  const TAU = Math.PI * 2;
  const D = window.D = {};
  D.TAU = TAU;
  D.hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  D.rgba = (h, a) => { const [r, g, b] = D.hex(h); return `rgba(${r},${g},${b},${a})`; };
  D.mix = (h1, h2, k) => { const a = D.hex(h1), b = D.hex(h2); const m = a.map((v, i) => Math.round(v + (b[i] - v) * k)); return '#' + m.map(v => v.toString(16).padStart(2, '0')).join(''); };
  D.circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.01, r), 0, TAU); return p; };
  D.ellipse = (x, y, rx, ry, a = 0) => { const p = new Path2D(); p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), a, 0, TAU); return p; };
  D.rr = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); return p; };
  // a smooth closed (or open) path through points with Catmull-Rom -> bezier
  D.smooth = (pts, closed = true, tension = 0.5) => {
    const p = new Path2D(), n = pts.length; if (n < 2) return p;
    const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    p.moveTo(pts[0][0], pts[0][1]);
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = tension / 3;
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  };
  // two-tone faceting (TOON.flat with offsets in world units): clip, fill shadow, shifted highlight, shifted base
  D.flat = (c, path, base, sh, hi, v = 8, w = 3) => {
    c.save(); c.clip(path);
    c.fillStyle = sh; c.fill(path);
    c.save(); c.translate(-v, -v); c.fillStyle = hi || base; c.fill(path); c.restore();
    c.save(); c.translate(-v + w, -v + w); c.fillStyle = base; c.fill(path); c.restore();
    c.restore();
  };
  D.fill = (c, path, col, a = 1) => { if (a <= 0) return; c.save(); if (a < 1) c.globalAlpha *= a; c.fillStyle = col; c.fill(path); c.restore(); };
  D.stroke = (c, path, col, w, a = 1, cap = 'round') => { if (a <= 0) return; c.save(); if (a < 1) c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.stroke(path); c.restore(); };
  D.line = (c, pts, col, w, a = 1) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); D.stroke(c, p, col, w, a); };
  // soft radial glow (electrical activity only; no bloom elsewhere)
  D.glow = (c, x, y, r, col, a = 1) => {
    if (a <= 0 || r <= 0) return;
    const [R, G, B] = D.hex(col), g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${R},${G},${B},${0.55 * a})`); g.addColorStop(0.35, `rgba(${R},${G},${B},${0.22 * a})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  // a bright dot with a glow (a signal pulse)
  D.spark = (c, x, y, r, col, a = 1) => { if (a <= 0) return; D.glow(c, x, y, r * 4, col, a); D.fill(c, D.circle(x, y, r), col, a); D.fill(c, D.circle(x - r * 0.25, y - r * 0.25, r * 0.45), '#FFFFFF', 0.8 * a); };
  // periodic drift (whole cycles in 55 s) for environment layers
  D.wob = (t, k, ph) => Math.sin(TAU * k * t / 55 + ph);
  // ---------- text: small context labels and short captions (screen space) ----------
  const FONT = (w, s) => `${w} ${s}px "Inter"`;
  // a context label: small dark capsule with a cyan dot, uppercase, letter-spaced; pops in, types, fades
  D.label = (c, text, x, y, t, t0, t1, o = {}) => {
    if (t < t0 || t > t1 + 0.35) return;
    const pin = MO.backOut(U.clamp((t - t0) / 0.42), 1.4), out = 1 - U.clamp((t - t1) / 0.35), a = Math.min(1, (t - t0) / 0.15) * out;
    const n = Math.min(text.length, Math.floor((t - t0 - 0.08) * 42 + 1));
    c.save(); c.font = FONT(700, o.size || 30); c.letterSpacing = '3px';
    const w = c.measureText(text).width + 3, h = (o.size || 30) * 1.75, pad = 26, dotR = 6;
    const bw = w + pad * 2 + dotR * 2 + 10, bx = (o.align === 'left' ? x : x - bw / 2), by = y - h / 2;
    c.globalAlpha = a; c.translate(bx + bw / 2, y); c.scale(pin, pin); c.translate(-(bx + bw / 2), -y);
    c.fillStyle = D.rgba(COL.deep, 0.82); c.beginPath(); c.roundRect(bx, by, bw, h, h / 2); c.fill();
    c.strokeStyle = D.rgba(COL.cyan, 0.55); c.lineWidth = 2; c.stroke();
    D.glow(c, bx + pad + dotR, y, 16, COL.cyan, 0.8); c.fillStyle = COL.cyan; c.beginPath(); c.arc(bx + pad + dotR, y, dotR, 0, TAU); c.fill();
    c.fillStyle = COL.ink; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillText(text.slice(0, Math.max(0, n)), bx + pad + dotR * 2 + 12, y + 1);
    c.restore();
  };
  // a caption: a short sentence-case note with a thin leader line to a point on the object (screen space)
  D.caption = (c, text, x, y, t, t0, t1, o = {}) => {
    if (t < t0 || t > t1 + 0.35) return;
    const out = 1 - U.clamp((t - t1) / 0.35), a = U.clamp((t - t0) / 0.2) * out, lp = MO.cubicOut(U.clamp((t - t0) / 0.3));
    const n = Math.min(text.length, Math.floor((t - t0 - 0.12) * 40 + 1));
    c.save(); c.globalAlpha = a; c.font = FONT(600, o.size || 30); c.letterSpacing = '0.5px';
    const w = c.measureText(text).width, align = o.align || 'left';
    if (o.ax != null) {   // leader: from the anchor point to the text
      const ex = align === 'left' ? x - 12 : align === 'right' ? x + 12 : x, ey = y + 2;
      const lx = U.lerp(o.ax, ex, lp), ly = U.lerp(o.ay, ey, lp);
      c.strokeStyle = D.rgba(COL.ink, 0.75); c.lineWidth = 2; c.beginPath(); c.moveTo(o.ax, o.ay); c.lineTo(lx, ly); c.stroke();
      c.fillStyle = COL.ink; c.beginPath(); c.arc(o.ax, o.ay, 4.5, 0, TAU); c.fill();
    }
    const lx0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    c.fillStyle = D.rgba(COL.deep, 0.6); c.beginPath(); c.roundRect(lx0 - 10, y - 25, w + 20, 48, 12); c.fill();
    c.fillStyle = COL.ink; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillText(text.slice(0, Math.max(0, n)), lx0, y + 1);
    c.restore();
  };
  // every on-screen string in the film (checked against the font at start-up)
  D.TEXTS = ['HOW EEG WORKS', 'NEURONS', 'SCALP ELECTRODES', 'AMPLIFIER', 'ALPHA RHYTHM', 'ion currents', 'fields add up', 'spreads to the scalp',
    'measures A − B', 'microvolts', 'shared noise cancels', 'sampled → digital', 'eyes open: alpha fades', 'voltage, not thoughts'];
})();
