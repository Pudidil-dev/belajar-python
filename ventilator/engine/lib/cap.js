// CAP — the small explanatory labels (added in the revision, at the client's request; the brief had asked for no text):
// the name of a part, molecule or tissue in white capitals, one short line under it saying what it does (grey), on a thin
// leader line to the thing it names. The bitmap font at scale 1, a black plate behind each line so it reads on any
// picture. Labels type on (110 characters/s, after a 0.12 s lead-in while the leader grows), hold, and leave with a short
// dithered fade. index.html?notext=1 (window.NOTEXT) renders the clean version: every call returns before drawing.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp;
const CAP = window.CAP = {};
const LOG = window.__textLog = window.__textLog || {};   // scene → [{text, t0, t1, kind}] for the caption audit
const log = o => { const k = window.__scene || '?'; (LOG[k] = LOG[k] || []); if (!LOG[k].some(e => e.text === o.text && e.t0 === o.t0)) LOG[k].push(o); };
const RATE = 110, FADE = PIX.FADE, LH = 11;                // typed fast: a label is read, not watched
// o: { name, note, ax, ay (anchor, screen px; null = no leader), x, y (the block's text top-left; with align 'right' x is
//      its right edge, 'center' its centre), align, t0, t1, col, instant (no typing, no leader growth: a label carried
//      over a cut) }
CAP.tag = (c, t, o) => {
  if (window.NOTEXT) return;
  log({ text: o.name + (o.note ? ' — ' + o.note : ''), t0: +o.t0.toFixed(3), t1: o.t1 == null ? null : +o.t1.toFixed(3), kind: 'label' });
  if (t < o.t0 || (o.t1 != null && t > o.t1 + FADE)) return;
  const L1 = [...o.name], L2 = o.note ? [...o.note] : [], lead = o.instant ? -10 : 0.12;
  const n1 = clamp(Math.floor((t - o.t0 - lead) * RATE), 0, L1.length), n2 = clamp(Math.floor((t - o.t0 - lead - L1.length / RATE - 0.06) * RATE), 0, L2.length);
  const w1 = PIX.textWidth(o.name), w2 = o.note ? PIX.textWidth(o.note) : 0, bw = Math.max(w1, w2), bh = o.note ? 2 * LH - 1 : LH - 1;
  const bx = Math.round(o.align === 'right' ? o.x - bw : o.align === 'center' ? o.x - bw / 2 : o.x), by = Math.round(o.y);
  const lx = (w, al) => al === 'right' ? bx + bw - w : al === 'center' ? Math.round(bx + (bw - w) / 2) : bx;
  const fa = o.t1 == null || t <= o.t1 ? 1 : clamp(1 - (t - o.t1) / FADE);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= fa;
  if (o.ax != null) {
    // the leader stops at the edge of the block nearest its anchor (it never runs through the words)
    const grow = o.instant ? 1 : MO.cubicOut(clamp((t - o.t0) / 0.22));
    let ex, ey;
    if (o.ax < bx - 3) { ex = bx - 4; ey = by + 3; } else if (o.ax > bx + bw + 3) { ex = bx + bw + 4; ey = by + 3; }
    else { ex = clamp(Math.round(o.ax), bx, bx + bw); ey = o.ay < by ? by - 4 : by + bh + 2; }
    PIX.bline(c, Math.round(o.ax), Math.round(o.ay), Math.round(U.lerp(o.ax, ex, grow)), Math.round(U.lerp(o.ay, ey, grow)), o.lineCol || 'g7');
    c.fillStyle = P.k; c.fillRect(Math.round(o.ax) - 2, Math.round(o.ay) - 2, 4, 4); c.fillStyle = P[o.lineCol || 'g7']; c.fillRect(Math.round(o.ax) - 1, Math.round(o.ay) - 1, 2, 2);
  }
  if (n1 > 0) { const s = L1.slice(0, n1).join(''), x = lx(w1, o.align); c.fillStyle = P.k; c.fillRect(x - 2, by - 2, PIX.textWidth(s) + 5, LH); PIX.text(c, o.name, x, by, o.col || 'w', { n: n1, shadow: null }); }
  if (n2 > 0) { const s = L2.slice(0, n2).join(''), x = lx(w2, o.align); c.fillStyle = P.k; c.fillRect(x - 2, by + LH - 2, PIX.textWidth(s) + 5, LH); PIX.text(c, o.note, x, by + LH, o.noteCol || 'g7', { n: n2, shadow: null }); }
  c.restore();
};
CAP.size = o => [Math.max(PIX.textWidth(o.name), o.note ? PIX.textWidth(o.note) : 0), o.note ? 2 * LH - 1 : LH - 1];
})();
