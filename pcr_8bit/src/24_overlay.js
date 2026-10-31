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
  [1.62, 3.92, 'HOW PCR DETECTS VIRUSES'], [4.6, 7.9, 'RESPIRATORY SAMPLE'], [8.3, 12.9, 'VIRAL RNA'], [13.2, 18.9, 'RNA RELEASE'],
  [19.2, 23.9, 'RNA PURIFICATION'], [24.2, 28.9, 'ONE-STEP RT-qPCR'], [29.2, 33.9, 'THERMAL CYCLER'], [34.5, 38.9, 'TEMPERATURE CONTROL'],
  [39.2, 43.9, 'PROGRAMMED THERMAL CYCLES'], [44.7, 50.9, 'RNA → cDNA'], [51.2, 55.9, 'DNA TEMPLATE FOR PCR'], [56.2, 60.9, 'DNA DENATURATION'],
  [61.2, 66.9, 'PRIMER RECOGNITION'], [67.2, 72.9, 'REPORTER + QUENCHER'], [73.2, 80.9, 'DNA POLYMERIZATION'], [81.2, 87.9, 'PROBE CLEAVAGE'],
  [88.6, 92.9, 'FLUORESCENCE'], [93.2, 97.9, 'OPTICAL DETECTION'], [98.7, 102.9, 'LIGHT → ELECTRICITY'], [103.2, 107.9, 'REPEATED PCR CYCLES'],
  [108.2, 112.9, 'MORE TARGET → MORE SIGNAL'], [113.2, 116.9, 'FLUORESCENCE DATA'], [117.2, 120.9, 'AMPLIFICATION CURVE'],
  [121.2, 123.9, 'RESULT VALIDATION'], [124.0, 124.95, 'TARGET RNA DETECTED'],
];
// one chip at a time (honesty notes: preview, scale, time-lapse, illustrative, idealised)
const CHIPS = [
  [1.7, 3.9, 'PREVIEW OF A FINISHED RUN'], [8.3, 12.9, 'EDUCATIONAL MODEL'], [13.3, 18.9, 'SIMPLIFIED'], [19.3, 23.9, 'ONE COMMON METHOD'],
  [24.3, 27.6, 'NOT TO SCALE'], [39.3, 43.9, 'EXAMPLE PROGRAM, ABOUT 1 H'], [44.8, 49.9, 'ILLUSTRATIVE SEQUENCE'], [50.0, 60.9, 'TIME-LAPSE'],
  [61.3, 72.9, 'ILLUSTRATIVE SEQUENCE'], [77.3, 79.0, 'SIMPLIFIED CHEMISTRY'], [81.3, 87.9, 'NOT TO SCALE'], [103.3, 107.9, 'IDEALIZED DOUBLING'],
  [108.3, 112.9, 'TIME-LAPSE'], [117.3, 120.9, 'MEASURED READINGS'], [121.3, 124.95, 'RNA DETECTED ≠ LIVE VIRUS'],
];
function titleCard(t) {
  const t0 = 128.6, t1 = 129.9;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.12 ? (t1 - t) / 0.12 : 1;
  const lines = [[['HOW ', P.INK], ['PCR MACHINES', P.YEL]], [['DETECT VIRUSES', P.INK]]];
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
