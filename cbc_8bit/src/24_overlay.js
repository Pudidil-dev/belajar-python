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
  [2.2, 3.1, 'ONE CELL → ONE PULSE'], [3.2, 6.0, 'FOLLOW THE BLOOD'], [7.6, 9.1, 'CONTROLLED DILUTION'], [9.2, 10.9, 'THREE MEASUREMENTS'],
  [11.15, 13.0, 'CONDUCTIVE ELECTROLYTE'], [13.15, 15.0, 'APERTURE SENSOR'], [19.0, 21.0, 'CELL RAISES RESISTANCE'], [21.9, 23.0, 'ONE CELL = ONE PULSE'],
  [23.1, 25.0, 'SIZE → PULSE HEIGHT'], [25.15, 27.0, 'CELL COUNT + SIZE'], [27.1, 29.0, 'RELEASE THE HEMOGLOBIN'], [29.35, 32.0, 'MORE HEMOGLOBIN → LESS LIGHT'],
  [32.1, 34.0, 'WHITE CELL CHANNEL'], [34.15, 36.0, 'RED CELLS REMOVED'], [36.15, 38.0, 'FLUORESCENT DYE'], [38.4, 41.0, 'HYDRODYNAMIC FOCUSING'],
  [42.75, 45.0, 'LASER HITS THE CELL'], [45.1, 48.0, 'THREE OPTICAL SIGNALS'], [48.15, 51.0, 'LIGHT → ELECTRICAL PULSES'], [51.2, 54.0, 'EACH DOT = ONE CELL'],
  [54.2, 56.0, 'WNR ADDS BASOPHILS'], [56.2, 58.0, 'ALL DATA → ONE REPORT'],
];
const CHIPS = [
  [1.05, 2.95, 'RESULT PREVIEW'], [5.5, 8.5, 'RELATIVE SIZES TO SCALE'], [9.6, 12.6, 'SEPARATE ALIQUOTS'], [13.4, 15.1, 'APERTURE NOT TO SCALE'], [15.2, 18.2, 'SLOWED DOWN'],
  [25.3, 27.0, 'THOUSANDS OF CELLS / SECOND'], [27.2, 30.2, 'SEPARATE ALIQUOT'], [32.2, 35.2, 'ANOTHER ALIQUOT'], [36.4, 39.4, 'DIM UNTIL THE LASER HITS'],
  [42.8, 45.8, 'SLOWED DOWN'], [46.0, 49.0, 'SIMPLIFIED OPTICS'], [53.0, 56.0, 'COLOURS = SOFTWARE GROUPS'], [58.2, 61.2, 'EXAMPLE VALUES'],
];
function titleCard(t) {
  const t0 = 63.2, t1 = 64.9;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.12 ? (t1 - t) / 0.12 : 1;
  const lines = [[['HOW ', P.INK], ['BLOOD TEST', P.YEL]], [['MACHINES WORK', P.INK]]];
  let left = (t - t0) * 34;
  lines.forEach((segs, li) => {
    const y = 40 + li * 24, total = textW(FT, segs.map(s => s[0]).join(''), 2, true);
    let x = CX - total / 2;
    for (const [s, c] of segs) {
      if (left <= 0) break;
      const k = Math.min(s.length, left);
      if (out >= 1 || bay(0, y) < out) text(FT, s, x, y, { sc: 2, bold: true, c, ol: P.SH, n: k, shadow: P.SH, sd: 2 });
      x += textW(FT, s, 2, true) + 2; left -= s.length;
    }
  });
}
function overlays(t) {
  if (!UI_ON) return;
  for (const [a, b, s] of CAPS) caption(s, a, Math.min(b, a + 3.2), t);      // type in, hold ~3 s, erase (no fixed header)
  for (const [a, b, s] of CHIPS) chip(s, a, Math.min(b, a + 3.0), t);       // each note ~3 s, then gone (no lower-third frame)
  titleCard(t);
}
