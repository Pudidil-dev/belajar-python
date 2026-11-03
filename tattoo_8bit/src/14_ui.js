'use strict';
// ============================================================================
// IN-PICTURE INSTRUMENTS: the time-jump pill, the treatment timeline of the
// payoff, the phagocytosis step bar, the four quick steps of the next session,
// the lymph-node inset, the "ink in view" meter and the closing recap icons.
// All drawn in screen space inside the short-video safe area.
// ============================================================================
// a tiny dragon glyph (an S-shaped body with a head dot) for the insets and the recap
function miniDragon(x, y, r, c) {
  let q = null; for (let k = 0; k <= 16; k++) { const u = k / 16, px = x + r * 0.9 * Math.sin(u * TAU * 0.95), py = y - r + 2 * r * u; if (q) lineW(q[0], q[1], px, py, 1.4, c); q = [px, py]; }
  disc(x, y - r - 1, 1.8, c);
}
// a small clock that spins while time jumps
function clockIcon(x, y, r, spin) {
  disc(x, y, r + 1, P.K0); disc(x, y, r, P.INK); disc(x, y, r - 1.5, P.N2);
  const a = spin * TAU * 3, b = spin * TAU * 0.25;
  lineW(x, y, x + Math.cos(a - Math.PI / 2) * (r - 3), y + Math.sin(a - Math.PI / 2) * (r - 3), 1.6, P.YEL);
  lineW(x, y, x + Math.cos(b - Math.PI / 2) * (r - 5), y + Math.sin(b - Math.PI / 2) * (r - 5), 1.8, P.INK);
}
// a time-jump label: a pill with a clock (top centre unless y is given)
function timePill(s, t0, t1, t, y, spinD) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.18, 0, 1)) * (t1 - t < 0.18 ? (t1 - t) / 0.18 : 1); if (k <= 0) return;
  const tw = textW(FS, s, 2), w = tw + 44, x0 = Math.round(CX - w / 2), yy = y === undefined ? 92 : y;
  withDither(k, () => {
    const m = maskRR(x0, yy, x0 + w, yy + 26, 12); mFill(m, P.K0); mOutline(m, P.YEL);
    clockIcon(x0 + 16, yy + 13, 8, clamp((t - t0) / (spinD || 0.6), 0, 1));
    text(FS, s, x0 + 30, yy + 7, { sc: 2, c: P.INK, ol: null });
  });
}
// ---------------------------------------------------------------- the treatment timeline (payoff)
const TL = { x0: 30, x1: 330, y: 446 };
function timelineBar(t, a) {
  if (!UI_ON || a <= 0) return;
  const L = EV.labels, n = L.length, xs = L.map((_, i) => lerp(TL.x0, TL.x1, i / (n - 1)));
  // the playhead walks to each label as it appears (and runs back on the rewind)
  let ph = 0; for (let i = 1; i < n; i++) ph = lerp(ph, i, smooth(seg(t, L[i][0] - 0.15, L[i][0] + 0.1)));
  if (t >= EV.rewind) ph = lerp(n - 1, 0, smooth(seg(t, EV.rewind, EV.rewind + 0.38)));
  const hx = lerp(TL.x0, TL.x1, ph / (n - 1));
  withDither(a, () => {
    tintRect(TL.x0 - 16, TL.y - 12, TL.x1 + 16, TL.y + 12, P.K0, 0.75);
    lineW(TL.x0, TL.y, TL.x1, TL.y, 3, P.N4); lineW(TL.x0, TL.y, hx, TL.y, 3, P.YEL);
    xs.forEach((x, i) => { const on = ph >= i - 0.02; disc(x, TL.y, 5, P.K0); disc(x, TL.y, 4, on ? P.YEL : P.N5); if (L[i][1] !== 'WEEKS LATER') disc(x, TL.y, 1.6, P.K0); });
    disc(hx, TL.y, 6.5, P.INK); disc(hx, TL.y, 4, P.YEL);
  });
  // the current label, big, above the bar
  if (t < EV.rewind) { let cur = 0; for (let i = 0; i < n; i++) if (t >= L[i][0]) cur = i; const nx = cur + 1 < n ? L[cur + 1][0] : 45.0; timePill(L[cur][1], L[cur][0], nx - 0.02, t, TL.y - 50, 0.5); }
  else if (a > 0.05) timePill('BACK TO THE START', EV.rewind, DUR - 0.08, t, TL.y - 50, 0.4);
}
// ---------------------------------------------------------------- phagocytosis: three steps
const STEPS3 = [[EV.wrap, 'MEMBRANE EXTENDS'], [EV.close, 'PIGMENT ENCLOSED'], [EV.vesicle, 'INTERNAL VESICLE FORMED']];
function stepBar(t) {
  if (!UI_ON || t < EV.wrap || t > 26.0) return;
  const out = t > 25.75 ? (26.0 - t) / 0.25 : 1;
  STEPS3.forEach(([ts, s], i) => {
    const k = K75(clamp((t - ts) / 0.2, 0, 1)) * out; if (k <= 0) return;
    const y = 384 + i * 34, tw = textW(FS, s, 2), cur = i === STEPS3.length - 1 || t < STEPS3[i + 1][0];
    withDither(k, () => {
      const m = maskRR(20, y, 40 + tw + 16, y + 24, 6); mFill(m, P.K0); mOutline(m, cur ? P.YEL : P.N5);
      disc(32, y + 12, 5, cur ? P.YEL : P.N5); text(FS, String(i + 1), 30, y + 9, { sc: 1, c: P.K0, ol: null });
      text(FS, s, 44, y + 6, { sc: 2, c: cur ? P.INK : P.SUB, ol: null });
    });
  });
}
// ---------------------------------------------------------------- the four quick steps of the next session
const STEPS4 = ['REMAINING|PIGMENT', 'ENERGY|ABSORPTION', 'SMALLER|FRAGMENTS', 'IMMUNE|CLEARANCE'];
function miniPanel(i, x0, y0, w, h, age) {
  const m = maskRR(x0, y0, x0 + w, y0 + h, 8); mFill(m, P.DM3); mOutline(m, P.YEL);
  const cx = x0 + w / 2, cy = y0 + h / 2 - 2, a = clamp(age, 0, 2);
  for (let k = 0; k < 3; k++) { const yy = y0 + 10 + k * 14; line(x0 + 6, yy, x0 + w - 6, yy + 3 * Math.sin(k), P.DM2); }
  const blob = (x, y, r, n, seed, spread) => { for (let k = 0; k < n; k++) { const an = hash(seed + k) * TAU, d = spread * Math.sqrt(hash(seed + k + 50)); disc(x + Math.cos(an) * d, y + Math.sin(an) * d, r, P.PG0); } };
  if (i === 0) { blob(cx - 12, cy, 3, 9, 11, 8); blob(cx + 14, cy + 4, 2.5, 6, 31, 6); }
  if (i === 1) { blob(cx + 6, cy + 4, 3, 10, 41, 9); const u = clamp(a / 0.35, 0, 1); for (let k = 0; k < 14; k++) { const s = k / 13, x = lerp(x0 + 6, cx + 2, u) - 26 * (1 - s) * 0.5, y = lerp(y0 + 6, cy + 2, u) - 18 * (1 - s) * 0.5 + 3 * Math.sin(s * 14 - age * 30); disc(x, y, 1.2, s > 0.7 ? P.LZ3 : P.LZ2); } if (u >= 1) ring(cx + 6, cy + 4, 13, 1.5, P.HT3); }
  if (i === 2) { const u = eout(clamp(a / 0.5, 0, 1)); for (let k = 0; k < 6; k++) { const an = k * 1.05 + 0.3; blob(cx + Math.cos(an) * 16 * u, cy + Math.sin(an) * 12 * u, 2.4, 3, 61 + k * 7, 3); } }
  if (i === 3) { const u = smooth(clamp(a / 0.5, 0, 1)); const mm = maskEll(cx - 6 + 4 * u, cy, 20, 15, 0); shade(mm, P.MC3, P.MC4, P.MC2, P.MC0, {}); disc(cx - 14 + 4 * u, cy - 3, 5, P.NU2); blob(cx + 6, cy + 2, 2.2, 6, 81, 5 * (1 - 0.4 * u)); }
}
function stepPanels(t) {
  if (!UI_ON || t < EV.steps4[0] - 0.1 || t > 40.1) return;
  const out = t > 39.8 ? (40.1 - t) / 0.3 : 1, w = 122, h = 64, xs = [24, 196], ys = [292, 392];
  EV.steps4.forEach((ts, i) => {
    const k = K75(clamp((t - ts) / 0.18, 0, 1)) * out; if (k <= 0) return;
    const x0 = xs[i % 2], y0 = ys[i >> 1];
    withDither(k, () => {
      tintRect(x0 - 6, y0 - 6, x0 + w + 6, y0 + h + 32, P.K0, 0.72);
      miniPanel(i, x0, y0, w, h, t - ts);
      disc(x0 + 10, y0 + 10, 7, P.YEL); text(FS, String(i + 1), x0 + 10, y0 + 7, { sc: 1, c: P.K0, ol: null, align: 'center' });
      const [l1, l2] = STEPS4[i].split('|');
      text(FS, l1, x0 + w / 2, y0 + h + 4, { sc: 2, c: P.INK, ol: null, align: 'center' }); text(FS, l2, x0 + w / 2, y0 + h + 17, { sc: 2, c: P.INK, ol: null, align: 'center' });
      if (i % 2 === 0) { lineW(x0 + w + 6, y0 + h / 2, x0 + w + 40, y0 + h / 2, 2, P.YEL); arrowHead(x0 + w + 44, y0 + h / 2, 0, 5, P.YEL); }
    });
  });
}
// ---------------------------------------------------------------- the lymph-node inset
function lymphInset(t) {
  if (!UI_ON || t < EV.node || t > 31.2) return;
  const k = K75(clamp((t - EV.node) / 0.2, 0, 1)) * (t > 30.95 ? (31.2 - t) / 0.25 : 1); if (k <= 0) return;
  withDither(k, () => {
    const x0 = 170, y0 = 92, x1 = 300, y1 = 300, m = maskRR(x0, y0, x1, y1, 10); mFill(m, P.K0); mOutline(m, P.LY2);
    // the whole arm: hand at the bottom, forearm with the tattoo, elbow, upper arm up to the armpit
    const arm = maskPoly([214, 290, 236, 290, 246, 236, 254, 196, 266, 160, 270, 106, 246, 106, 240, 158, 226, 196, 216, 238]); shade(arm, P.SK3, P.SK4, P.SK2, P.SK1, {});
    const sx = 231, sy = 244; miniDragon(sx, sy, 7, P.IK1);
    // the lymphatic path drawn up the arm to the node at the elbow, then on toward the armpit
    const pts = [sx, sy - 8, 236, 222, 242, 202, 248, 186, 254, 160, 258, 124], u = clamp((t - EV.node) / 0.5, 0, 1), nseg = pts.length / 2 - 1;
    for (let i = 0; i < nseg; i++) { const v = clamp(u * nseg - i, 0, 1); if (v <= 0) break; lineW(pts[2 * i], pts[2 * i + 1], lerp(pts[2 * i], pts[2 * i + 2], v), lerp(pts[2 * i + 1], pts[2 * i + 3], v), 2.4, P.LY2); }
    const nm = maskEll(248, 186, 9, 6, 0.9); shade(nm, P.LY1, P.LY2, P.LY0, P.LY0, {});
    if (u > 0.55) for (let i = 0; i < 5; i++) disc(245 + (i % 3) * 3, 184 + (i >> 1) * 2.5, 1.1, P.PG0);
    text(FS, 'LYMPH', x0 + 8, 166, { sc: 2, c: P.LY3, ol: null }); text(FS, 'NODE', x0 + 8, 180, { sc: 2, c: P.LY3, ol: null }); line(x0 + 50, 186, 238, 186, P.LY3);
  });
}
// ---------------------------------------------------------------- "ink in view" meter (the clearance time-lapse)
function inkMeter(t) {
  if (!UI_ON || t < 31.1 || t > 33.2) return;
  const k = K75(clamp((t - 31.1) / 0.2, 0, 1)) * (t > 32.95 ? (33.2 - t) / 0.25 : 1);
  const left = BULK.reduce((a, b) => a + bulkLeft(b, t), 0) / BULK.length;
  withDither(k, () => {
    const x0 = 20, y0 = 446, w = 170; tintRect(x0 - 6, y0 - 26, x0 + w + 8, y0 + 18, P.K0, 0.8);
    text(FS, 'INK IN THIS AREA', x0, y0 - 18, { sc: 2, c: P.SUB, ol: null });
    rect(x0, y0 - 4, x0 + w, y0 + 10, P.N2); rect(x0, y0 - 4, x0 + w * left, y0 + 10, P.PG2); frame(x0, y0 - 4, x0 + w, y0 + 10, P.N5);
  });
}
// ---------------------------------------------------------------- the closing recap: four icons
const RECAP = ['LASER', 'FRAGMENTS', 'MACROPHAGE', 'FADING'];
function recapIcon(i, cx, cy, k) {
  const m = maskRR(cx - 34, cy - 30, cx + 34, cy + 30, 10); mFill(m, i === 3 ? P.SK3 : P.DM3); mOutline(m, P.YEL);
  if (i === 0) { lineW(cx + 18, cy - 24, cx + 2, cy - 2, 6, P.HP3); lineW(cx + 18, cy - 24, cx + 2, cy - 2, 3, P.HP4); for (let s = 0; s < 6; s++) disc(lerp(cx + 2, cx - 10, s / 5), lerp(cy - 2, cy + 16, s / 5), 1.2, P.LZ2); disc(cx - 12, cy + 18, 4, P.PG0); }
  if (i === 1) for (let s = 0; s < 7; s++) { const a = s * 0.9, d = 6 + 10 * hash(s + 40); disc(cx + Math.cos(a) * d * (0.5 + 0.5 * k), cy + Math.sin(a) * d * (0.5 + 0.5 * k), 2.4, P.PG0); }
  if (i === 2) { const mm = maskEll(cx, cy, 22, 17, 0.2); shade(mm, P.MC3, P.MC4, P.MC2, P.MC0, {}); disc(cx - 8, cy - 3, 6, P.NU2); disc(cx + 8, cy + 3, 6, P.MC4); ring(cx + 8, cy + 3, 6, 1, P.VS); for (let s = 0; s < 4; s++) disc(cx + 6 + (s % 2) * 4, cy + 1 + (s >> 1) * 4, 1.2, P.PG0); }
  if (i === 3) for (let s = 0; s < 3; s++) miniDragon(cx - 20 + s * 20, cy + 2, 12, mixc(P.IK1, P.SK3, s / 2.4));
}
function recapPanel(t) {
  if (!UI_ON || t < EV.recap[0] - 0.05 || t > 46.6) return;
  const out = t > 46.35 ? (46.6 - t) / 0.25 : 1, pos = [[96, 132], [264, 132], [96, 248], [264, 248]];
  tintRect(20, 92, 340, 300, P.K0, 0.62 * out * K75(clamp((t - EV.recap[0] + 0.05) / 0.15, 0, 1)));
  EV.recap.forEach((tr, i) => {
    const k = K75(clamp((t - tr) / 0.18, 0, 1)) * out; if (k <= 0) return;
    const [cx, cy] = pos[i];
    withDither(k, () => {
      recapIcon(i, cx, cy, clamp((t - tr) / 0.5, 0, 1));
      text(FS, RECAP[i], cx, cy + 36, { sc: 2, c: P.INK, ol: null, align: 'center' });
      if (i === 0 || i === 2) { lineW(cx + 40, cy, cx + 124, cy, 2, P.YEL); arrowHead(cx + 128, cy, 0, 5, P.YEL); }
      if (i === 1) { lineW(cx - 20, cy + 52, cx - 140, cy + 80, 2, P.YEL); arrowHead(cx - 144, cy + 81, Math.atan2(28, -120), 5, P.YEL); }
    });
  });
}
