// CAP — the film's text, in the style of the X-ray film: a small upper-case scene title with an accent bar, top left inside
// the vertical-video safe area, and one context line under it; part labels (machine parts, particles) on thin leader
// lines next to the thing they name; numbered step badges for the workflow. All of it is the bitmap font at scale 1:
// titles type on at 40 characters/s and erase at 70 characters/s before the scene ends; labels type on and leave with a
// short dithered fade. index.html?notext=1 (window.NOTEXT) renders the clean version: every call returns before drawing.
(() => {
const { W, H, P } = PIX;
const CAP = window.CAP = {};
const X0 = 12, Y0 = 44, LH = 11;
CAP.X0 = X0; CAP.Y0 = Y0; CAP.LH = LH;
const LOG = window.__textLog = window.__textLog || {};   // scene → [{text, t0, t1, kind}] for the caption audit and labels.srt
const log = o => { const k = window.__scene || '?'; (LOG[k] = LOG[k] || []); if (!LOG[k].some(e => e.text === o.text && e.t0 === o.t0)) LOG[k].push(o); };
// characters visible at t: types on from t0 at 40/s; if t1 is given, erases at 70/s so that it is gone at t1
const typed = (s, t, t0, t1) => {
  const n = [...s].length;
  if (t < t0) return 0;
  const on = Math.floor((t - t0) * 40);
  if (t1 == null) return Math.min(n, on);
  const off = n - Math.floor((t - (t1 - n / 70)) * 70);
  return Math.max(0, Math.min(n, on, t < t1 - n / 70 ? n : off));
};
CAP.typed = typed;
// the scene title: o = {title, ctx: string | [lines], t0, t1, acc (accent colour)}
CAP.scene = (c, t, o) => {
  if (window.NOTEXT || !o.title) return;
  const t0 = o.t0 ?? 0.15, t1 = o.t1;
  log({ text: o.title, t0, t1, kind: 'title' });
  const lines = o.ctx == null ? [] : Array.isArray(o.ctx) ? o.ctx : [o.ctx];
  let tc = t0 + [...o.title].length / 40 + 0.15;
  lines.forEach(s => { log({ text: s, t0: +tc.toFixed(3), t1, kind: 'ctx' }); tc += [...s].length / 40 + 0.05; });
  const nT = typed(o.title, t, t0, t1);
  if (nT > 0) {
    PIX.rect(c, X0, Y0 - 2, 2, 11, o.acc || 'mt3');
    PIX.rect(c, X0 + 3, Y0 - 2, PIX.textWidth([...o.title].slice(0, nT).join('')) + 5, 11, 'k');
    PIX.text(c, o.title, X0 + 5, Y0, 'w', { n: nT, shadow: null });
  }
  tc = t0 + [...o.title].length / 40 + 0.15;
  lines.forEach((s, i) => {
    const n = typed(s, t, tc, t1);
    if (n > 0) { PIX.rect(c, X0 + 3, Y0 + LH - 1 + i * LH, PIX.textWidth([...s].slice(0, n).join('')) + 5, 11, 'k'); PIX.text(c, s, X0 + 5, Y0 + LH + 1 + i * LH, 'g8', { n, shadow: null }); }
    tc += [...s].length / 40 + 0.05;
  });
};
// a part label on a leader line: o = {text, ax, ay (anchor, screen px; null = no leader), x, y (text top), t0, t1, col,
// lineCol, align, dot}. A black plate keeps it readable on any picture.
CAP.part = (c, t, o) => {
  if (window.NOTEXT) return;
  log({ text: o.text, t0: o.t0, t1: o.t1, kind: 'part' });
  if (t < o.t0 || (o.t1 != null && t > o.t1 + PIX.FADE)) return;
  const n = Math.min(Math.max(0, Math.floor((t - o.t0 - 0.12) * PIX.RATE)), [...o.text].length);
  if (n > 0) {
    const w = PIX.textWidth([...o.text].slice(0, n).join('')), tw = PIX.textWidth(o.text), x = o.align === 'center' ? o.x - tw / 2 : o.align === 'right' ? o.x - tw : o.x;
    const fa = o.t1 == null || t <= o.t1 ? 1 : U.clamp(1 - (t - o.t1) / PIX.FADE);
    c.save(); c.globalAlpha *= fa; PIX.rect(c, Math.round(x) - 2, Math.round(o.y) - 2, w + 5, 11, 'k'); c.restore();
  }
  PIX.label(c, { ax: o.ax, ay: o.ay, tx: o.x, ty: o.y, text: o.text, t0: o.t0, t1: o.t1 ?? 1e9, col: o.col || 'w', lineCol: o.lineCol || 'g6', align: o.align, dot: o.dot, sc: 1, shadow: null }, t);
};
CAP.note = (c, t, o) => CAP.part(c, t, { ...o, ax: o.ax ?? null });
// a numbered step badge (the workflow, S05): a mint square with the number, then the step name; o = {n, text, x, y, ax,
// ay, t0, t1, col}
CAP.badge = (c, t, o) => {
  if (window.NOTEXT) return;
  log({ text: o.n + ' ' + o.text, t0: o.t0, t1: o.t1, kind: 'step' });
  if (t < o.t0 || (o.t1 != null && t > o.t1 + PIX.FADE)) return;
  const fa = o.t1 == null || t <= o.t1 ? 1 : U.clamp(1 - (t - o.t1) / PIX.FADE);
  const s = String(o.n), tw = PIX.textWidth(o.text) + 13, bx = Math.round(o.align === 'right' ? o.x - tw : o.x), by = Math.round(o.y);
  c.save(); c.globalAlpha *= fa;
  if (o.ax != null) PIX.bline(c, o.ax, o.ay, o.align === 'right' ? bx + tw : bx, by + 4, o.lineCol || 'mt2');
  PIX.rect(c, bx - 1, by - 2, 11, 11, o.col || 'mt3'); PIX.text(c, s, bx + 5 - Math.round(PIX.textWidth(s) / 2), by, 'k', { shadow: null });
  const n = typed(o.text, t, o.t0 + 0.1, null);
  if (n > 0) { PIX.rect(c, bx + 10, by - 2, PIX.textWidth([...o.text].slice(0, n).join('')) + 4, 11, 'k'); PIX.text(c, o.text, bx + 12, by, 'w', { n, shadow: null }); }
  c.restore();
};
// a list of steps that light in turn (S24): o = {x, y, items: [[t, text, col]], t1, gap}
CAP.steps = (c, t, o) => {
  if (window.NOTEXT) return;
  o.items.forEach(([ti, s, col], i) => {
    log({ text: s, t0: ti, t1: o.t1, kind: 'step' });
    const y = o.y + i * (o.gap || 13);
    if (t < ti - (o.pre ?? 0.3) || (o.t1 != null && t > o.t1)) return;
    const lit = t >= ti, n = lit ? typed(s, t, ti, o.t1) : 0;
    if (!lit) { PIX.rect(c, o.x, y + 3, 3, 1, 'g4'); return; }
    if (n > 0) PIX.rect(c, o.x - 2, y - 2, PIX.textWidth([...s].slice(0, n).join('')) + 11, 11, 'k');
    PIX.rect(c, o.x, y + 1, 3, 5, col || 'w');
    const cur = i === o.items.reduce((m, q, j) => t >= q[0] ? j : m, -1);
    PIX.text(c, s, o.x + 6, y, cur ? 'w' : 'g7', { n, shadow: null });
  });
};
})();
