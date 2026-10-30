'use strict';
// ============================================================================
// TEXT LAYER: one typed caption at a time (top left, outlined), short leader-
// line tags next to the thing they name, one disclaimer chip at a time
// (bottom left), and the closing title. Everything stays inside the
// short-video safe area (x 14..292, y 36..506); nothing sits under the
// right-hand buttons or the bottom description.
// ============================================================================
const SAFE = { l: 14, r: 292, t: 36, b: 506 };
const CAP_X = 16, CAP_Y = 40;
function caption(s, t0, t1, t) {
  if (!UI_ON || t < t0 || t > t1) return;
  const lines = wrapBal(FC, s, SAFE.r - CAP_X - 4, 2), cps = 44;
  let n = (t - t0) * cps;
  const out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1;
  n = Math.min(n, s.length * out + 0.01);
  if (n < 0.6) return;
  let left = n;
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const k = Math.min(ln.length, left);
    text(FC, ln, CAP_X, CAP_Y + i * 20, { sc: 2, n: k, c: P.INK, ol: P.SH, shadow: P.SH, sd: 2 });
    left -= ln.length + 1;
  });
}
// a leader-line tag: anchor (ax, ay) on the object, label box at (lx, ly) (top-left of the text)
function tag(s, ax, ay, lx, ly, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1 || ax === null || !isFinite(ax) || !isFinite(ay)) return;
  col = col === undefined ? P.INK : col;
  const age = t - t0, out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, gk = K75(clamp(age / 0.18, 0, 1)) * out;
  const tw = textW(FS, s, 2), x0 = Math.round(clamp(lx, SAFE.l, SAFE.r - tw)), y0 = Math.round(clamp(ly, SAFE.t + 44, SAFE.b - 12));
  ax = Math.round(ax); ay = Math.round(ay);
  const ux = ax < x0 ? x0 - 3 : ax > x0 + tw ? x0 + tw + 2 : ax, uy = ay < y0 ? y0 - 3 : y0 + 12;
  const ex = lerp(ax, ux, gk), ey = lerp(ay, uy, gk);
  line(ax + 1, ay, ex + 1, ey, P.SH); line(ax, ay + 1, ex, ey + 1, P.SH); line(ax, ay, ex, ey, col);
  rect(ax - 1, ay - 1, ax + 2, ay + 2, col);
  if (gk < 1) return;
  const n = clamp((age - 0.16) * 52, 0, s.length) * out;
  if (n <= 0) return;
  const pw = textW(FS, s.slice(0, Math.ceil(n)), 2);
  rect(x0 - 3, y0 - 3, x0 + pw + 3, y0 + 12, P.K0); rect(x0 - 3, y0 + 12, x0 + pw + 3, y0 + 13, col);
  text(FS, s, x0, y0, { sc: 2, c: P.INK, ol: null, n });
}
// a plain label (no leader), typed in; align 'center' supported
function label(s, x, y, t0, t1, t, col, align, f, sc) {
  if (!UI_ON || t < t0 || t > t1) return;
  f = f || FS; sc = sc || 2;
  const out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, n = clamp((t - t0) * 50, 0, s.length) * out;
  if (n <= 0) return;
  text(f, s, x, y, { sc, c: col === undefined ? P.INK : col, ol: P.SH, n, align });
}
function chip(s, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1), tw = textW(FS, s, 2), y = 488;
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 4, y - 4, x + tw + 4, y + 13, P.K0); frame(x - 4, y - 4, x + tw + 4, y + 13, col === undefined ? P.N5 : col);
  text(FS, s, x, y, { sc: 2, c: P.SUB, ol: null });
}
// ---------------------------------------------------------------- the scene captions (the brief's labels)
const CAPS = [
  [0.12, 1.80, 'PULSE OXIMETER'], [1.98, 3.68, 'BLOOD OXYGEN?'], [4.30, 7.40, 'HOW DOES LIGHT BECOME OXYGEN DATA?'],
  [7.62, 9.30, 'LIGHT PASSES THROUGH TISSUE'], [9.50, 13.05, 'ARTERIAL PULSE CHANGES THE SIGNAL'], [13.25, 14.95, 'HEMOGLOBIN CARRIES OXYGEN'],
  [17.95, 20.57, 'THEY ABSORB LIGHT DIFFERENTLY'], [20.77, 24.32, 'PULSING BLOOD CHANGES TRANSMITTED LIGHT'], [24.52, 27.14, 'PHOTODIODE DETECTOR'],
  [27.34, 29.96, 'LIGHT BECOMES ELECTRICAL SIGNAL'], [30.16, 32.78, 'RAW OPTICAL SIGNAL'], [32.98, 35.60, 'PULSE SIGNAL IS ISOLATED'],
  [38.62, 41.23, 'RATIO OF RATIOS'], [41.43, 44.99, 'SIGNAL PROCESSING'], [45.19, 47.81, 'SpO₂ IS ESTIMATED'], [48.01, 50.16, 'PULSE RATE TOO'],
  [52.71, 56.26, 'LIGHT → SIGNAL → SpO₂'], [56.46, 58.14, 'IT READS CHANGING LIGHT ABSORPTION'], [58.34, 60.02, 'ESTIMATE, NOT DIRECT OXYGEN COUNT'],
];
// one chip at a time (honesty notes: colours, scale, exaggeration, simplification)
const CHIPS = [
  [4.35, 9.30, 'INFRARED SHOWN IN PINK'], [13.30, 20.57, 'NOT TO SCALE'], [21.0, 24.32, 'PULSE SIZE EXAGGERATED'],
  [30.30, 32.78, 'PULSE SIZE EXAGGERATED'], [38.70, 47.81, 'SIMPLIFIED'],
];
function titleCard(t) {
  const t0 = 60.5, t1 = 61.78;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.12 ? (t1 - t) / 0.12 : 1;
  const segs = [['HOW ', P.INK], ['PULSE OXIMETERS', P.YEL], [' WORK', P.INK]], y = 44;
  const total = textW(FT, segs.map(s => s[0]).join(''), 2, true);
  let x = CX - total / 2, left = (t - t0) * 34;
  for (const [s, c] of segs) {
    if (left <= 0) break;
    const k = Math.min(s.length, left);
    if (out >= 1 || bay(0, y) < out) text(FT, s, x, y, { sc: 2, bold: true, c, ol: P.SH, n: k, shadow: P.SH, sd: 2 });
    x += textW(FT, s, 2, true) + 2; left -= s.length;
  }
}
function overlays(t) {
  if (!UI_ON) return;
  for (const [a, b, s] of CAPS) caption(s, a, b, t);
  for (const [a, b, s] of CHIPS) chip(s, a, b, t);
  titleCard(t);
}
