// CAP — the film's text: a small scene caption (the brief's wording) with one context line underneath, top left, inside
// the vertical-video safe area; event notes that type on where and when something happens; part labels with leader lines.
// All text is the bitmap font, typed on at ~40 characters/s and erased at ~70 characters/s.
(() => {
const { W, H, P } = PIX;
const CAP = window.CAP = {};
const X0 = 12, Y0 = 44, LH = 11;
const typed = (s, t, t0, t1) => {                       // characters visible at t (types on from t0, erases before t1)
  const n = [...s].length;
  if (t < t0) return 0;
  const on = Math.floor((t - t0) * 40);
  if (t1 == null) return Math.min(n, on);
  const off = n - Math.floor((t - (t1 - n / 70)) * 70);
  return Math.max(0, Math.min(n, on, t < t1 - n / 70 ? n : off));
};
CAP.typed = typed;
// scene caption: o = {title, ctx: string | [lines], t0, t1, acc (accent colour)}
CAP.scene = (c, t, o) => {
  const t0 = o.t0 ?? 0.15, t1 = o.t1;
  const nT = typed(o.title, t, t0, t1);
  if (nT > 0) {
    const a = U.clamp((t - t0) / 0.12) * (t1 != null ? U.clamp((t1 - t) / 0.12) : 1);
    if (a > 0) { PIX.rect(c, X0, Y0, 2, 7, o.acc || 'c2'); }
    PIX.rect(c, X0 + 3, Y0 - 2, PIX.textWidth([...o.title].slice(0, nT).join('')) + 5, 11, 'k');
    PIX.text(c, o.title, X0 + 5, Y0, 'w', { n: nT });
  }
  const lines = o.ctx == null ? [] : Array.isArray(o.ctx) ? o.ctx : [o.ctx];
  let tc = t0 + [...o.title].length / 40 + 0.15;
  lines.forEach((s, i) => {
    const n = typed(s, t, tc, t1);
    if (n > 0) { PIX.rect(c, X0 + 3, Y0 + LH + i * LH, PIX.textWidth([...s].slice(0, n).join('')) + 5, 11, 'k'); PIX.text(c, s, X0 + 5, Y0 + LH + 2 + i * LH, 'g9', { n }); }
    tc += [...s].length / 40 + 0.05;
  });
};
// event note: o = {text, x, y, t0, t1, col, align, ax, ay (leader anchor, screen px), box}
CAP.note = (c, t, o) => {
  if (t < o.t0 || (o.t1 != null && t > o.t1 + 1)) return;
  if (o.box) {
    const n = Math.min(Math.max(0, Math.floor((t - o.t0 - 0.12) * (o.rate || 40))), [...o.text].length, [...o.text].length - (t > (o.t1 ?? 1e9) ? Math.floor((t - o.t1) * 70) : 0));
    if (n > 0) {
      const w = PIX.textWidth([...o.text].slice(0, n).join(''));
      const x = o.align === 'center' ? o.x - PIX.textWidth(o.text) / 2 : o.align === 'right' ? o.x - PIX.textWidth(o.text) : o.x;
      PIX.rect(c, Math.round(x) - 2, Math.round(o.y) - 2, w + 5, 11, 'k');
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
CAP.X0 = X0; CAP.Y0 = Y0; CAP.LH = LH;
})();
