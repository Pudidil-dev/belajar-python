// CAP — the film's text: a small scene caption (the brief's wording) with one context line underneath, top left, inside
// the vertical-video safe area; event notes that type on where and when something happens; part labels with leader lines.
// All text is the bitmap font, typed on at PIX.RATE characters/s; it leaves with a short dithered fade (PIX.FADE).
(() => {
const { W, H, P } = PIX;
const CAP = window.CAP = {};
const X0 = 12, Y0 = 66, LH = 11;
const typed = (s, t, t0, t1) => {                       // characters visible at t (types on from t0; gone after t1 + fade)
  const n = [...s].length;
  if (t < t0 || (t1 != null && t > t1 + PIX.FADE)) return 0;
  return Math.min(n, Math.floor((t - t0) * PIX.RATE));
};
const fadeK = (t, t1) => t1 == null || t <= t1 ? 1 : U.clamp(1 - (t - t1) / PIX.FADE);
CAP.typed = typed;
// scene caption: o = {title, ctx: string | [lines], t0, t1, acc (accent colour)}
CAP.scene = (c, t, o) => {
  const t0 = o.t0 ?? 0.15, t1 = o.t1, fa = fadeK(t, t1);
  if (fa <= 0) return;
  c.save(); c.globalAlpha *= fa;
  // o.held: the title is already on screen (only the context line changes) — no retyping
  const nT = o.held ? [...o.title].length : typed(o.title, t, t0, t1);
  if (nT > 0) {
    PIX.rect(c, X0, Y0, 2, 7, o.acc || 'c2');
    PIX.rect(c, X0 + 3, Y0 - 2, PIX.textWidth([...o.title].slice(0, nT).join('')) + 5, 11, 'k');
    PIX.text(c, o.title, X0 + 5, Y0, 'w', { n: nT });
  }
  const lines = o.ctx == null ? [] : Array.isArray(o.ctx) ? o.ctx : [o.ctx];
  let tc = o.held ? t0 : t0 + [...o.title].length / PIX.RATE + 0.15;
  lines.forEach((s, i) => {
    const n = typed(s, t, tc, t1);
    if (n > 0) { PIX.rect(c, X0 + 3, Y0 + LH + i * LH, PIX.textWidth([...s].slice(0, n).join('')) + 5, 11, 'k'); PIX.text(c, s, X0 + 5, Y0 + LH + 2 + i * LH, 'g9', { n }); }
    tc += [...s].length / PIX.RATE + 0.05;
  });
  c.restore();
};
// event note: o = {text, x, y, t0, t1, col, align, ax, ay (leader anchor, screen px), box}
CAP.note = (c, t, o) => {
  if (t < o.t0 || (o.t1 != null && t > o.t1 + PIX.FADE)) return;
  if (o.box) {
    const n = Math.min(Math.max(0, Math.floor((t - o.t0 - 0.12) * (o.rate || PIX.RATE))), [...o.text].length);
    if (n > 0) {
      const w = PIX.textWidth([...o.text].slice(0, n).join(''));
      const x = o.align === 'center' ? o.x - PIX.textWidth(o.text) / 2 : o.align === 'right' ? o.x - PIX.textWidth(o.text) : o.x;
      c.save(); c.globalAlpha *= fadeK(t, o.t1); PIX.rect(c, Math.round(x) - 2, Math.round(o.y) - 2, w + 5, 11, 'k'); c.restore();
    }
  }
  PIX.label(c, { ax: o.ax, ay: o.ay, tx: o.x, ty: o.y, text: o.text, t0: o.t0, t1: o.t1 ?? 1e9, col: o.col || 'w', lineCol: o.lineCol || 'g6', align: o.align, rate: o.rate }, t);
};
// numbered step list (bremsstrahlung chain etc.): items light up at their times; o = {x, y, items: [[t, text, col]], dim}
CAP.steps = (c, t, o) => {
  o.items.forEach(([ti, s, col], i) => {
    const y = o.y + i * (o.gap || 13);
    if (t < ti - (o.pre ?? 0.3)) return;
    const lit = t >= ti, n = lit ? typed(s, t, ti, o.t1) : 0;
    if (!lit) { PIX.rect(c, o.x, y + 3, 3, 1, 'g4'); return; }
    PIX.rect(c, o.x, y + 1, 3, 5, col || 'w');
    if (o.arrow !== false && i > 0) PIX.text(c, '↓', o.x, y - 7, 'g5', { shadow: null });
    PIX.text(c, s, o.x + 6, y, i === o.items.findLastIndex(q => t >= q[0]) ? 'w' : 'g8', { n });
  });
};
// the brief's two-level caption: a short LEVEL 1 heading (accent colour) first; when the mechanism shows, it is replaced
// by the LEVEL 2 line(s) (white, up to two lines) in the same place — never both at once.
// o = {l1, l2: string | [lines], t0, tSwap (L1 → L2), t1 (fade out), acc}
CAP.cap = (c, t, o) => {
  const t0 = o.t0 ?? 0.12, t1 = o.t1, acc = o.acc || 'c3';
  const lines = o.l2 == null ? [] : Array.isArray(o.l2) ? o.l2 : [o.l2];
  const swap = o.l1 ? (o.tSwap ?? 1e9) : t0;
  const box = (s, n, y, col) => { const w = PIX.textWidth([...s].slice(0, n).join('')); PIX.rect(c, X0 + 3, y - 2, w + 5, 11, 'k'); PIX.text(c, s, X0 + 5, y, col, { n }); };
  if (o.l1 && t >= t0 && t < swap + PIX.FADE) {
    const fa = t <= swap ? 1 : U.clamp(1 - (t - swap) / PIX.FADE), n = typed(o.l1, t, t0, null);
    if (n > 0) { c.save(); c.globalAlpha *= fa; PIX.rect(c, X0, Y0, 2, 7, acc); box(o.l1, n, Y0, acc); c.restore(); }
  }
  if (t >= swap && lines.length) {
    const fa = fadeK(t, t1); if (fa <= 0) return;
    c.save(); c.globalAlpha *= fa;
    let tc = swap + (o.l1 ? PIX.FADE + 0.02 : 0);
    PIX.rect(c, X0, Y0, 2, 7 + LH * (lines.length - 1), 'w');
    lines.forEach((s, i) => { const n = typed(s, t, tc, t1); if (n > 0) box(s, n, Y0 + i * LH, 'w'); tc += [...s].length / PIX.RATE + 0.04; });
    c.restore();
  }
};
CAP.X0 = X0; CAP.Y0 = Y0; CAP.LH = LH;
})();
