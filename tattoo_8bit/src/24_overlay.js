'use strict';
// ============================================================================
// TEXT LAYER, small but readable on a phone: one caption at a time in a
// solid dark box with a yellow accent bar (top left, big letters), leader-line
// tags in solid boxes next to the thing they name (two sizes), one honesty
// chip at a time (bottom left), and the closing title. Everything stays inside
// the short-video safe area (x 14..292, y 36..506); nothing sits under the
// right-hand buttons or the bottom description. Captions and chips leave after
// about 3 s.
// ============================================================================
const SAFE = { l: 14, r: 292, t: 36, b: 506 };
const CAP_X = 22, CAP_Y = 46;
function caption(s, t0, t1, t) {
  if (!UI_ON || t < t0 || t > t1) return;
  const lines = wrapBal(FC, s, SAFE.r - CAP_X - 8, 2), cps = 56;
  const out = t1 - t < 0.16 ? (t1 - t) / 0.16 : 1, inn = clamp((t - t0) / 0.14, 0, 1), k = Math.min(inn, out);
  // the box: grows with the text, solid enough for any picture behind it
  const wMax = Math.max(...lines.map(l => textW(FC, l, 2))), h = lines.length * 21 + 8;
  tintRect(CAP_X - 8, CAP_Y - 6, CAP_X - 8 + (wMax + 16) * K75(k), CAP_Y - 6 + h, P.K0, 0.82);
  rect(CAP_X - 8, CAP_Y - 6, CAP_X - 5, CAP_Y - 6 + h * K75(k), P.YEL);
  let left = Math.min((t - t0 - 0.06) * cps, s.length * out + 0.01);
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const n = Math.min(ln.length, left);
    text(FC, ln, CAP_X, CAP_Y + i * 21, { sc: 2, n, c: P.INK, ol: P.SH });
    left -= ln.length + 1;
  });
}
// a leader-line tag: anchor (ax, ay) on the object, label box at (lx, ly) (top-left of the text); sc 2 or 3
function tag(s, ax, ay, lx, ly, t0, t1, t, col, sc) {
  if (!UI_ON || t < t0 || t > t1 || ax === null || !isFinite(ax) || !isFinite(ay)) return;
  col = col === undefined ? P.INK : col; sc = sc || 2;
  const age = t - t0, out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, gk = K75(clamp(age / 0.18, 0, 1)) * out;
  const th = 6 * sc, tw = textW(FS, s, sc), x0 = Math.round(clamp(lx, SAFE.l + 3, SAFE.r - tw - 3)), y0 = Math.round(clamp(ly, SAFE.t + 50, SAFE.b - th - 4));
  ax = Math.round(ax); ay = Math.round(ay);
  const ux = ax < x0 ? x0 - 4 : ax > x0 + tw ? x0 + tw + 3 : ax, uy = ay < y0 ? y0 - 4 : y0 + th + 2;
  const ex = lerp(ax, ux, gk), ey = lerp(ay, uy, gk);
  lineW(ax, ay, ex, ey, 2, P.SH); line(ax, ay, ex, ey, col);
  disc(ax + 0.5, ay + 0.5, 2.5, P.SH); disc(ax + 0.5, ay + 0.5, 1.6, col);
  if (gk < 1) return;
  const n = clamp((age - 0.16) * 56, 0, s.length) * out;
  if (n <= 0) return;
  const pw = textW(FS, s.slice(0, Math.ceil(n)), sc);
  rect(x0 - 4, y0 - 4, x0 + pw + 4, y0 + th + 2, P.K0); rect(x0 - 4, y0 + th + 2, x0 + pw + 4, y0 + th + 4, col);
  text(FS, s, x0, y0, { sc, c: P.INK, ol: null, n });
}
// a plain label (no leader), typed in; align 'center' supported
function label(s, x, y, t0, t1, t, col, align, f, sc) {
  if (!UI_ON || t < t0 || t > t1) return;
  f = f || FS; sc = sc || 2;
  const out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, n = clamp((t - t0) * 56, 0, s.length) * out;
  if (n <= 0) return;
  text(f, s, x, y, { sc, c: col === undefined ? P.INK : col, ol: P.SH, n, align });
}
function chip(s, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1), tw = textW(FS, s, 2), y = 486;
  const x = Math.round(lerp(-tw - 30, SAFE.l + 2, k));
  rect(x - 5, y - 5, x + tw + 5, y + 15, P.K0); frame(x - 5, y - 5, x + tw + 5, y + 15, col === undefined ? P.N6 : col);
  text(FS, s, x, y, { sc: 2, c: P.C4, ol: null });
}
// ---------------------------------------------------------------- the captions (the brief's context labels) and the honesty chips
const CAPS = [
  [3.25, 4.25, 'INSIDE THE SKIN'], [4.3, 6.0, 'INK IN THE DERMIS'], [6.05, 8.0, '1064 nm LASER'], [8.05, 11.0, 'ENERGY ABSORPTION'],
  [11.05, 13.0, 'RAPID EXPANSION'], [13.05, 16.0, 'PIGMENT FRAGMENTATION'], [16.05, 19.0, 'SMALLER INK PARTICLES'], [19.25, 22.4, 'MACROPHAGE'],
  [23.05, 26.0, 'PHAGOCYTOSIS'], [26.1, 28.0, 'PIGMENT UPTAKE'], [28.1, 31.0, 'LYMPHATIC TRANSPORT'], [31.1, 33.0, 'GRADUAL CLEARANCE'],
  [36.05, 38.0, 'NEXT SESSION'], [40.05, 42.4, 'THE TREATMENT COURSE'],
];
const CHIPS = [
  [6.25, 8.4, 'INVISIBLE IN REALITY'], [8.5, 11.5, 'SLOW MOTION · NANOSECONDS'], [16.25, 19.0, 'NOT TO SCALE'], [26.5, 28.4, 'OFTEN NOT DIGESTED'],
  [28.6, 31.0, 'SOME INK, NOT ALL'], [31.2, 33.0, 'OVER WEEKS'], [44.25, 47.2, 'RESULTS VARY'],
];
function titleCard(t) {
  const t0 = EV.title, t1 = EV.title + 0.95;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.12 ? (t1 - t) / 0.12 : 1;
  const lines = [[['HOW ', P.INK], ['LASERS', P.LZ3]], [['REMOVE TATTOOS', P.INK]]];
  let left = (t - t0) * 40;
  tintRect(0, 32, W, 112, P.K0, 0.62 * Math.min(1, (t - t0) / 0.12) * out);
  lines.forEach((segs, li) => {
    const y = 40 + li * 34, total = textW(FT, segs.map(s => s[0]).join(''), 3, true);
    let x = CX - total / 2;
    for (const [s, c] of segs) {
      if (left <= 0) break;
      const k = Math.min(s.length, left);
      if (out >= 1 || bay(0, y) < out) text(FT, s, x, y, { sc: 3, bold: true, c, ol: P.SH, n: k, shadow: P.SH, sd: 2 });
      x += textW(FT, s, 3, true) + 3; left -= s.length;
    }
  });
}
function overlays(t) {
  if (!UI_ON) return;
  for (const [a, b, s] of CAPS) caption(s, a, Math.min(b, a + 3.2), t);
  for (const [a, b, s] of CHIPS) chip(s, a, Math.min(b, a + 3.0), t);
  titleCard(t);
}
