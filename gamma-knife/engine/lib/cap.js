// CAP — the small context labels, drawn like the client's storyboard: one to three short centred lines in a dark box
// with a thin light border, a leader line from the box to a dot on the thing it names. The bitmap font at scale 1.
// A label's leader grows first (0.15 s), then its text types on (110 characters/s), it holds, and it leaves with a short
// dithered fade. Small and secondary: no titles, no subtitles. index.html?notext=1 (window.NOTEXT) renders the clean
// version (only the machine's own interface text stays).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp;
const CAP = window.CAP = {};
const LOG = window.__textLog = window.__textLog || {};          // scene → [{text, t0, t1, kind}] for the caption audit
const log = o => { const k = window.__scene || '?'; (LOG[k] = LOG[k] || []); if (!LOG[k].some(e => e.text === o.text && e.t0 === o.t0)) LOG[k].push(o); };
const RATE = 110, FADE = 0.22, LH = 10;
CAP.RATE = RATE; CAP.FADE = FADE;
const tw = s => PIX.textWidth(s);
// the box of a label: [w, h] in px
CAP.size = lines => [Math.max(...lines.map(tw)) + 8, lines.length * LH + 5];
// o: { lines, ax, ay (anchor; null = no leader), x, y (box centre x, box top y), t0, t1, col, border, instant, dot }
CAP.box = (c, t, o) => {
  if (window.NOTEXT) return;
  const lines = o.lines, text = lines.join(' ');
  log({ text, t0: +(+o.t0).toFixed(3), t1: o.t1 == null ? null : +(+o.t1).toFixed(3), kind: 'label' });
  if (t < o.t0 || (o.t1 != null && t > o.t1 + FADE)) return;
  const [bw, bh] = CAP.size(lines), bx = Math.round(o.x - bw / 2), by = Math.round(o.y);
  const lead = o.instant ? 1 : MO.cubicOut(clamp((t - o.t0) / 0.15)), on = o.instant ? 1e9 : Math.floor((t - o.t0 - 0.1) * RATE);
  const fa = o.t1 == null || t <= o.t1 ? 1 : clamp(1 - (t - o.t1) / FADE);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= fa;
  if (o.ax != null) {
    // the leader starts at the side of the box nearest its anchor
    let ex, ey;
    if (o.ay > by + bh + 1) { ex = clamp(Math.round(o.ax), bx + 3, bx + bw - 4); ey = by + bh; }
    else if (o.ay < by - 1) { ex = clamp(Math.round(o.ax), bx + 3, bx + bw - 4); ey = by - 1; }
    else if (o.ax < bx) { ex = bx - 1; ey = clamp(Math.round(o.ay), by + 2, by + bh - 3); }
    else { ex = bx + bw; ey = clamp(Math.round(o.ay), by + 2, by + bh - 3); }
    const ax = Math.round(o.ax), ay = Math.round(o.ay);
    PIX.bline(c, ex, ey, Math.round(U.lerp(ex, ax, lead)), Math.round(U.lerp(ey, ay, lead)), o.lineCol || 'g8');
    if (lead >= 1 && o.dot !== false) { c.fillStyle = P.k; c.fillRect(ax - 2, ay - 2, 5, 5); c.fillStyle = P[o.lineCol || 'g8']; c.fillRect(ax - 1, ay - 1, 3, 3); }
  }
  if (lead > 0.6) {
    c.fillStyle = P.n0; c.fillRect(bx, by, bw, bh);
    c.fillStyle = P[o.border || 'cy4']; c.fillRect(bx, by, bw, 1); c.fillRect(bx, by + bh - 1, bw, 1); c.fillRect(bx, by, 1, bh); c.fillRect(bx + bw - 1, by, 1, bh);
    c.fillStyle = P.n0; for (const [x, y] of [[bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1]]) c.fillRect(x, y, 1, 1);   // rounded corners
    let left = on;
    lines.forEach((s, i) => { const n = Math.max(0, Math.min([...s].length, left)); left -= [...s].length; if (n > 0) PIX.text(c, s, Math.round(o.x), by + 3 + i * LH, i === 0 ? (o.col || 'w') : (o.col2 || 'g8'), { n, align: 'center', shadow: null }); });
  }
  c.restore();
};
// the dose legend (as on the storyboard): "Dose", a vertical bar from high (red) to low (blue)
CAP.legend = (c, t, o) => {
  if (window.NOTEXT && !o.native) return;
  if (t < o.t0 || (o.t1 != null && t > o.t1 + FADE)) return;
  const a = clamp((t - o.t0) / 0.15) * (o.t1 == null || t <= o.t1 ? 1 : clamp(1 - (t - o.t1) / FADE)), x = o.x, y = o.y, w = 50, h = 74;
  if (!window.NOTEXT) log({ text: 'Dose High Low', t0: o.t0, t1: o.t1, kind: 'legend' });
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= a;
  c.fillStyle = P.n0; c.fillRect(x, y, w, h); c.fillStyle = P.g8; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
  PIX.text(c, o.title || 'Dose', x + w / 2, y + 4, 'w', { align: 'center', shadow: null });
  const bx = x + 6, by = y + 16, bh = h - 22;
  for (let k = 0; k < bh; k++) { const i = Math.round((1 - k / (bh - 1)) * 7); c.fillStyle = P['d' + i]; c.fillRect(bx, by + k, 7, 1); }
  PIX.text(c, 'High', bx + 11, by + 1, 'w', { shadow: null }); PIX.text(c, 'Low', bx + 11, by + bh - 8, 'w', { shadow: null });
  c.restore();
};
})();
