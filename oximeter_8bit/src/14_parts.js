'use strict';
// ============================================================================
// COMPONENTS (px world units). The photodiode face-on: a silicon die with a
// metallic-blue active area, thin metal fingers, a bond pad and a gold wire.
// The p-n junction in section, light arriving from the right (as in the
// finger): p+ layer, depletion region with its built-in field, n layer and
// the back contact. An absorbed photon makes an electron (green, -) and a
// hole (white ring, +); the field pulls them apart: the electron drifts to
// the n side, the hole to the p side, and a current flows round the circuit.
// ============================================================================
function photodiodeFace(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // package and leads
  for (const lx of [-70, 70]) { rect(X(lx - 9), Y(150), X(lx + 9), Y(330), P.G3); rect(X(lx - 9), Y(150), X(lx - 5), Y(330), P.G1); }
  const pk = maskRR(X(-150), Y(-160), X(150), Y(170), 18 * z);
  shade(pk, P.CH2, P.CH3, P.CH1, P.CH0, { k: Math.max(1, Math.round(3 * z)), kh: Math.max(1, Math.round(2 * z)) });
  rect(X(-126), Y(-136), X(126), Y(146), P.CH1);
  // the die
  const dm = maskRR(X(-110), Y(-118), X(110), Y(110), 4 * z);
  shade(dm, P.PD1, P.PD2, P.PD0, P.PD0, { k: Math.max(1, Math.round(2 * z)), kh: Math.max(1, Math.round(1.5 * z)) });
  // active area with anti-reflection sheen and metal fingers
  const lit = o.lit || 0;
  rect(X(-92), Y(-100), X(92), Y(84), lit > 0.3 ? P.PD4 : P.PD3);
  for (let y = -100; y < 84; y += 6) rect(X(-92), Y(y), X(92), Y(y + 3), lit > 0.3 ? P.PD5 : P.PD2, 0.25);
  for (let k = 0; k < 7; k++) { const x = -78 + k * 26; rect(X(x), Y(-100), X(x + 3), Y(84), P.PD5); }
  rect(X(-92), Y(-100), X(92), Y(-96), P.PD5); rect(X(-92), Y(80), X(92), Y(84), P.PD5);
  // sheen sweep
  const sw = ((t * 0.6) % 2) * 260 - 130;
  for (let i = 0; i < 3; i++) line(X(sw + i * 8 - 40), Y(-100), X(sw + i * 8 + 40), Y(84), P.PD5, 0.35);
  // bond pad and wire to the lead
  rect(X(60), Y(90), X(96), Y(106), P.AU1); rect(X(62), Y(92), X(94), Y(104), P.AU2);
  const wp = new Path(spline([78, 98, 92, 130, 76, 160, 70, 200], 6, false)); const pts = wp.sub(0, wp.L, 2).map((v, i) => i % 2 ? Y(v) : X(v));
  for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], Math.max(1, 1.6 * z), P.AU2);
  if (lit > 0) glow(X(0), Y(-8), 120 * z * (0.6 + 0.4 * lit), P.LR2, P.LR4, 0.35 * lit);
}
// ---------------------------------------------------------------- the junction in section (light from the right)
const JN = { back: [-150, -128], n: [-128, -50], dep: [-50, 74], p: [74, 112], arc: [112, 120], y0: -120, y1: 190 };
function junctionScene(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.35);
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const band = (a, c, c2, lv) => { rect(X(a[0]), Y(JN.y0), X(a[1]), Y(JN.y1), c); if (c2 !== undefined) rect(X(a[0]), Y(JN.y0), X(a[1]), Y(JN.y1), c2, lv); };
  band(JN.back, P.G3); rect(X(JN.back[0]), Y(JN.y0), X(JN.back[0] + 4), Y(JN.y1), P.G1);
  band(JN.n, P.NT1, P.NT0, 0.35);
  band(JN.dep, P.SI1, P.SI0, 0.3);
  band(JN.p, P.PT1, P.PT0, 0.35);
  band(JN.arc, P.PD3, P.PD4, 0.4);
  // fixed charges in the depletion region: + ions on the n side, - ions on the p side
  for (let j = 0; j < 9; j++) {
    const y = JN.y0 + 22 + j * 32;
    text(FS, '+', X(-40), Y(y), { sc: Math.max(1, Math.round(z * 2)), c: P.NT2, ol: null });
    text(FS, '-', X(58), Y(y + 20), { sc: Math.max(1, Math.round(z * 2)), c: P.PT2, ol: null });
  }
  // built-in field arrows (n -> p)
  for (let j = 0; j < 4; j++) {
    const y = JN.y0 + 46 + j * 74, ph = ((t * 40) % 24);
    for (let x = -26 + ph; x < 48; x += 24) { line(X(x), Y(y), X(x + 12), Y(y), P.SI2); arrowHead(X(x + 14), Y(y), 0, Math.max(3, 3 * z), P.SI2); }
  }
  // free carriers in n (electrons) and p (holes), jiggling
  for (let i = 0; i < 26; i++) {
    const n = i < 13, x = n ? -120 + hash(i + 50) * 64 : 80 + hash(i + 50) * 26, y = JN.y0 + 10 + hash(i + 51) * (JN.y1 - JN.y0 - 20);
    const jx = 3 * Math.sin(t * 7 + i), jy = 3 * Math.cos(t * 6 + i * 2);
    if (n) { disc(X(x + jx), Y(y + jy), 3.2 * z, P.SG1); disc(X(x + jx), Y(y + jy), 2.2 * z, P.SG2); }
    else ring(X(x + jx), Y(y + jy), 2.6 * z, Math.max(1, 1.1 * z), P.C4);
  }
  // contacts and the outside circuit (top): current flows round in green
  rect(X(-150), Y(JN.y0 - 14), X(-128), Y(JN.y0), P.AU1); rect(X(112), Y(JN.y0 - 14), X(126), Y(JN.y0), P.AU1);
  const cy = JN.y0 - 56, k = o.current || 0;
  const wire = new Path([-139, JN.y0 - 14, -139, cy, 119, cy, 119, JN.y0 - 14]);
  const wp = wire.sub(0, wire.L, 3).map((v, i) => i % 2 ? Y(v) : X(v));
  for (let i = 0; i + 3 < wp.length; i += 2) lineW(wp[i], wp[i + 1], wp[i + 2], wp[i + 3], Math.max(2, 2.4 * z), k > 0.05 ? P.SG1 : P.G4);
  // the amplifier the current feeds (schematic)
  const ax = X(-10), ay = Y(cy), as = 16 * z;
  poly([ax - as, ay - as, ax + as, ay, ax - as, ay + as], P.CH2); poly([ax - as + 3, ay - as + 5, ax + as - 6, ay, ax - as + 3, ay + as - 5], P.CH3);
  if (k > 0.05) for (let q = 0; q < 10; q++) {                       // electrons run out of the n side, round to the p side
    const s_ = ((t * 230 + q * wire.L / 10) % wire.L), [px_, py_] = wire.at(s_);
    disc(X(px_), Y(py_), 3.4 * z * k, P.SG2); disc(X(px_), Y(py_), 1.7 * z * k, P.SG3);
  }
}
// one photo-event: a photon enters from the right at tE, is absorbed at (ax, ay), the pair separates
function photoEvent(cam, t, tE, ay, kind, seed) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, ax = 8 + 30 * hash(seed);
  const tf = 0.32, u = (t - tE) / tf;
  if (u < 0) return 0;
  const cols = kind === 'red' ? [P.LR1, P.LR3, P.LR5] : [P.IR1, P.IR3, P.IR5];
  if (u < 1) {           // the photon (a short wave packet) flies in from the right
    const x = lerp(190, ax, u), wl = 16;
    for (let s = 0; s < 46; s += 2) { const w = Math.sin((s + t * 400) / wl * TAU) * 6 * Math.min(1, s / 14); lineW(X(x + s), Y(ay + w), X(x + s + 2), Y(ay + Math.sin((s + 2 + t * 400) / wl * TAU) * 6 * Math.min(1, (s + 2) / 14)), Math.max(2, 2.2 * z), cols[1]); }
    disc(X(x), Y(ay), 4 * z, cols[1]); disc(X(x), Y(ay), 2 * z, cols[2]);
    return 0;
  }
  const v = t - tE - tf;
  if (v < 0.12) flash(X(ax), Y(ay), 10 * z, 1 - v / 0.12, [cols[0], cols[1], cols[2], P.C6]);
  // electron drifts left to the n side, hole right to the p side
  const ex = Math.max(-118, ax - v * 330), hx = Math.min(104, ax + v * 140);
  disc(X(ex), Y(ay), 5.4 * z, P.SG1); disc(X(ex), Y(ay), 4.2 * z, P.SG2); disc(X(ex) - 1.4 * z, Y(ay) - 1.4 * z, 1.4 * z, P.SG3);
  rect(X(ex) - 2 * z, Y(ay) - 0.5 * z, X(ex) + 2 * z, Y(ay) + 0.5 * z, P.SG0);
  ring(X(hx), Y(ay), 4.4 * z, Math.max(1, 1.4 * z), P.C6); rect(X(hx) - 2 * z, Y(ay) - 0.5 * z, X(hx) + 2 * z, Y(ay) + 0.5 * z, P.C6); rect(X(hx) - 0.5 * z, Y(ay) - 2 * z, X(hx) + 0.5 * z, Y(ay) + 2 * z, P.C6);
  return clamp(v / 0.3, 0, 1);
}
