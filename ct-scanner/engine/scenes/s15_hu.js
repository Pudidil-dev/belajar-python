// S15 DIFFERENT ATTENUATION, DIFFERENT CT VALUES (106–112 s): the reconstructed slice gets its scale. Each pixel's
// attenuation is expressed as a CT number, HU = 1000 (μ − μ_water) / μ_water: air ≈ −1000, water 0, bone positive
// (≈ +1000). A window then decides which range of numbers the greys show: the brain window (W 80, L 40) separates grey
// and white matter but turns bone white; the bone window (W 2000, L 500) shows the skull's inner structure but flattens
// the brain. The data never change, only the display. The camera follows: in on the brain for the brain window, across to
// the skull's edge for the bone window (the spongy diploë between the two dense tables), back to the full slice for S16.
(() => {
const { W, H, P } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const IMG = { cx: 122, cy: 268, s: 0.93 * 1.0 };
const mixCam = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), s: Math.exp(lerp(Math.log(p.s), Math.log(q.s), u)), cx: lerp(p.cx, q.cx, u), cy: lerp(p.cy, q.cy, u) });
const camAt = t => {
  const base = { x: 0, y: 0, s: IMG.s, cx: IMG.cx, cy: IMG.cy };                // S14's last frame, S16's first
  const brain = { x: CT.OX, y: CT.OY, s: IMG.s * 1.5, cx: 118, cy: 262 }, bone = { x: 69, y: CT.OY, s: IMG.s * 2.3, cx: 118, cy: 262 };
  let v = mixCam(base, brain, MO.cubicInOut(clamp((t - 2.6) / 0.8)));
  v = mixCam(v, bone, MO.cubicInOut(clamp((t - 4.25) / 0.7)));
  return mixCam(v, base, MO.sineInOut(clamp((t - 5.35) / 0.62)));
};
// window animation: [t, W, L]
const WK = [[0, 110, 40], [1.9, 2000, 0], [2.6, 2000, 0], [3.3, 80, 40], [4.25, 80, 40], [4.95, 2000, 500], [6, 2000, 500]];
const winAt = t => { let i = 1; while (i < WK.length - 1 && t > WK[i][0]) i++; const a = WK[i - 1], b = WK[i], q = MO.cubicInOut(clamp((t - a[0]) / (b[0] - a[0]))); return [Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), q)), lerp(a[2], b[2], q)]; };
const BAR = { x: 228, y: 150, w: 10, h: 230 };                      // HU scale bar: −1000 (bottom) … +1000 (top)
const yOf = hu => BAR.y + BAR.h * (1 - (hu + 1000) / 2000);
SC['s15_hu'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const [Wd, L] = winAt(t);
    G2.ct(c, camAt(t), CT.full(), { L, W: Wd });
    // the scale bar: the greys the current window gives each CT number
    const ba = MO.smooth(clamp((t - 0.3) / 0.3));
    if (ba > 0) {
      c.save(); c.globalAlpha = ba; PIX.rect(c, BAR.x - 6, BAR.y - 4, BAR.w + 12, BAR.h + 8, 'k'); c.restore();   // the image may run under the scale when zoomed
      const R = CT.ramps().gray;
      for (let y = 0; y < BAR.h; y++) { const hu = 1000 - 2000 * y / BAR.h, v = clamp((hu - (L - Wd / 2)) / Wd); for (let x = 0; x < BAR.w; x++) { if (ba < 1 && K.BAY(BAR.x + x, BAR.y + y) > ba) continue; const k = Math.max(0, Math.min(R.length - 1, Math.round(v * (R.length - 1) + K.BAY(BAR.x + x, BAR.y + y) - 0.5))); c.fillStyle = `rgb(${R[k].join(',')})`; c.fillRect(BAR.x + x, BAR.y + y, 1, 1); } }
      c.save(); c.globalAlpha = ba; PIX.rect(c, BAR.x - 1, BAR.y - 1, BAR.w + 2, 1, 'g5'); PIX.rect(c, BAR.x - 1, BAR.y + BAR.h, BAR.w + 2, 1, 'g5');
      // the window's span on the bar
      const y0 = yOf(Math.min(1000, L + Wd / 2)), y1 = yOf(Math.max(-1000, L - Wd / 2));
      PIX.rect(c, BAR.x - 4, Math.round(y0), 2, Math.max(1, Math.round(y1 - y0)), 'c3');
      c.restore();
    }
    // marks on the bar
    const marks = [[-1000, 'AIR −1000', 'g8', 0.6], [0, 'WATER 0', 'c4', 0.95], [1000, 'BONE +1000', 'q6', 1.3]];
    marks.forEach(([hu, s, col, t0]) => { const y = Math.round(yOf(hu)); CAP.note(c, t, { ax: BAR.x - 1, ay: y, x: BAR.x - 6, y: y - (hu === -1000 ? 10 : hu === 1000 ? -2 : 4), text: s, t0, t1: 5.75, col, align: 'right', box: true }); });
    // which window
    CAP.note(c, t, { x: 20, y: 384, text: 'BRAIN WINDOW', t0: 3.15, t1: 4.3, col: 'p3', box: true });
    CAP.note(c, t, { x: 20, y: 384, text: 'BONE WINDOW', t0: 4.6, t1: 5.75, col: 'q6', box: true });
    CAP.note(c, t, { x: 20, y: 395, text: 'SAME DATA, DIFFERENT DISPLAY', t0: 3.5, t1: 5.75, col: 'g9', box: true });
    CAP.note(c, t, { x: 20, y: 140, text: 'HU = 1000 × (μ − μwater) / μwater', t0: 1.0, t1: 3.4, col: 'g9', box: true });
    CAP.cap(c, t, { l1: 'CT NUMBERS', l2: ['DIFFERENT ATTENUATION,', 'DIFFERENT CT VALUES'], t0: 0.12, tSwap: 1.1, t1: 5.75, acc: 'g9' });
  },
  cues: () => [[0.6, 'tone_low', 0.7, 0.4], [0.95, 'tone_mid', 0.7, 0.4], [1.3, 'tone_high', 0.7, 0.4], [1.5, 'gray_sweep', 0.6, 0, 0.6],
    [2.6, 'window_shift', 0.7, -0.2, 0.8], [2.65, 'push_in', 0.4, 0, 0.75], [4.25, 'window_shift', 0.7, 0.2, 0.7], [4.25, 'swing', 0.4, 0, 0.7], [5.35, 'pull_back', 0.45, 0, 0.62]],
};
})();
