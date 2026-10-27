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
  [0.12, 1.84, 'SPECT SCANNER'], [1.95, 3.96, 'GAMMA → LIGHT → SIGNAL'], [4.1, 5.85, 'Tc-99m SESTAMIBI'], [5.98, 7.98, 'BLOOD CIRCULATION'],
  [8.1, 11.05, 'MYOCARDIAL UPTAKE'], [11.62, 12.94, 'Tc-99m NUCLEUS'], [13.05, 16.0, 'GAMMA EMISSION'], [16.12, 17.9, 'GAMMA PHOTON'],
  [18.0, 20.02, 'ATTENUATION & SCATTER'], [20.6, 22.86, 'LEAD COLLIMATOR'], [22.96, 24.98, 'ONLY SELECTED DIRECTIONS'], [25.08, 28.05, 'GAMMA ENERGY ABSORBED'],
  [28.15, 29.94, 'ENERGY DEPOSITION'], [30.04, 32.06, 'SCINTILLATION'], [32.17, 33.95, 'PHOTOMULTIPLIER ARRAY'], [34.06, 35.84, 'LIGHT → ELECTRON'],
  [35.95, 38.91, 'ELECTRON MULTIPLICATION'], [39.02, 41.03, 'ELECTRICAL SIGNAL'], [41.14, 43.87, 'POSITION + ENERGY'], [43.98, 45.99, 'ENERGY FILTER'],
  [46.1, 47.88, 'ONE DETECTED EVENT'], [47.99, 50.95, '2D PROJECTION'], [51.06, 54.02, 'ROTATING GAMMA CAMERAS'], [54.13, 58.03, 'MULTIPLE ANGLES'],
  [58.14, 62.05, '3D RECONSTRUCTION'], [62.15, 64.88, 'MYOCARDIAL PERFUSION'],
];
// one chip at a time (rules 28-30: not to scale, time-lapse, simplified, illustrative colours, real scan longer)
const CHIPS = [
  [4.3, 5.85, 'INJECTED BEFORE THE SCAN'], [8.9, 11.05, 'TIME-LAPSE'], [11.7, 17.9, 'NOT TO SCALE'], [25.1, 31.9, 'COLOURS ARE ILLUSTRATIVE'],
  [35.95, 38.9, 'POWERED BY HIGH VOLTAGE'], [48.05, 50.95, 'TIME-LAPSE'], [51.1, 54.02, 'TIME-LAPSE · REAL SCAN ~15 MIN'],
];
function titleCard(t) {
  const t0 = 66.95, t1 = 67.9;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.12 ? (t1 - t) / 0.12 : 1;
  const rows = [['HOW', P.INK, 40], ['SPECT SCANNERS', P.YEL, 62], ['WORK', P.INK, 84]];
  let left = (t - t0) * 40;
  for (const [s, c, y] of rows) {
    if (left <= 0) break;
    const k = Math.min(s.length, left);
    if (out >= 1 || bay(0, y) < out) text(FT, s, CX, y, { sc: 2, bold: true, align: 'center', c, ol: P.SH, n: k, shadow: P.SH, sd: 2 });
    left -= s.length + 2;
  }
}
function overlays(t) {
  if (!UI_ON) return;
  for (const [a, b, s] of CAPS) caption(s, a, b, t);
  for (const [a, b, s] of CHIPS) chip(s, a, b, t);
  titleCard(t);
}
