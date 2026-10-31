'use strict';
// ============================================================================
// OPTICS AND DETECTION (world px).
// 1. The optical head above one sealed well (CFX96-type: filtered LEDs and
//    filtered photodiodes on a shuttle in the lid). The blue LED's light goes
//    through an excitation filter (other colours stopped) and a lens, down
//    through the heated lid's opening into the well. Freed reporters fluoresce
//    green in all directions; light going up passes a lens and an emission
//    filter that passes green and stops scattered blue, then reaches the
//    photodiode. Excitation and emission travel different paths.
// 2. The silicon photodiode in section (light from the right): an absorbed
//    photon makes an electron (electric blue, -) and a hole (white ring, +);
//    the junction's field pulls them apart and a photocurrent flows (neon green)
//    to an amplifier and an analog-to-digital converter.
// ============================================================================
const OPT = { wy: 120, wTop: 60, wBot: 200, wR: 34, lidY0: 28, lidY1: 50, led: [-112, -196], exF: [-86, -152], exL: [-62, -110], pd: [0, -206], emF: [0, -150], emL: [0, -96] };
function opticsWell(cam, t, glowK) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // block with the conical cavity
  rect(X(-150), Y(OPT.wTop + 18), X(150), Y(OPT.wBot + 30), P.AL1); rect(X(-150), Y(OPT.wTop + 18), X(150), Y(OPT.wTop + 22), P.AL3);
  const out = [-OPT.wR - 4, OPT.wTop, OPT.wR + 4, OPT.wTop, 12, OPT.wBot + 4, -12, OPT.wBot + 4];
  poly(cam.pts(out), P.AL0);
  const tube = [-OPT.wR, OPT.wTop, OPT.wR, OPT.wTop, 9, OPT.wBot, -9, OPT.wBot];
  poly(cam.pts(tube), P.TB2);
  const liq = [-OPT.wR + 6, OPT.wTop + 34, OPT.wR - 6, OPT.wTop + 34, 6, OPT.wBot - 6, -6, OPT.wBot - 6];
  poly(cam.pts(liq), P.LQ3);
  if (glowK > 0) { poly(cam.pts(liq), P.EM1, 0.5 * glowK); glow(X(0), Y(OPT.wy + 24), 30 * z, P.EM1, P.EM2, 0.6 * glowK); }
  // reporters glinting in the liquid
  for (let i = 0; i < 14; i++) {
    const u = hash(i + 2400), v = hash(i + 2401), y = lerp(OPT.wTop + 40, OPT.wBot - 14, v), half = lerp(OPT.wR - 8, 6, (y - OPT.wTop) / (OPT.wBot - OPT.wTop));
    const x = (u - 0.5) * 2 * half, on = glowK > 0 && Math.sin(t * 9 + i * 2.3) > 0.2;
    disc(X(x), Y(y), (on ? 2.4 : 1.6) * z, on ? P.EM3 : P.RP1);
  }
  // seal film and heated lid with its opening
  rect(X(-OPT.wR - 10), Y(OPT.wTop - 3), X(OPT.wR + 10), Y(OPT.wTop), P.TB3);
  rect(X(-150), Y(OPT.lidY0), X(-20), Y(OPT.lidY1), P.HT1); rect(X(20), Y(OPT.lidY0), X(150), Y(OPT.lidY1), P.HT1);
  for (let x = -146; x < 146; x += 8) if (Math.abs(x) > 24) rect(X(x), Y(OPT.lidY0 + 4), X(x + 4), Y(OPT.lidY0 + 7), P.HT3);
}
function opticsHead(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // housing
  rect(X(-160), Y(-262), X(160), Y(8), P.M6); rect(X(-160), Y(-262), X(160), Y(-256), P.M5);
  // excitation channel (angled): bore from the LED toward the well
  const bx = OPT.led[0], by = OPT.led[1];
  lineW(X(bx), Y(by), X(0), Y(OPT.wTop), 30 * z, P.K0);
  // emission channel (vertical)
  rect(X(-16), Y(OPT.pd[1]), X(16), Y(8), P.K0);
  // LED (dome) on its board
  rect(X(bx - 26), Y(by - 34), X(bx + 26), Y(by - 24), P.CB2);
  const on = o.led || 0;
  disc(X(bx), Y(by - 14), 12 * z, P.XB0); disc(X(bx), Y(by - 14), 10 * z, on > 0.3 ? P.XB2 : P.XB1);
  rect(X(bx - 12), Y(by - 14), X(bx + 12), Y(by - 4), on > 0.3 ? P.XB2 : P.XB1); disc(X(bx - 4), Y(by - 18), 3 * z, P.XB3);
  if (on > 0) glow(X(bx), Y(by - 10), 28 * z, P.XB1, P.XB2, 0.5 * on);
  // excitation filter (blue glass, tilted with the channel) and lens
  const ang = Math.atan2(OPT.wTop - by, 0 - bx), ca = Math.cos(ang), sa = Math.sin(ang);
  const slab = (cx, cy, wdt, thk, c1, c2) => { const nx = -sa, ny = ca; poly([X(cx + nx * wdt - ca * thk), Y(cy + ny * wdt - sa * thk), X(cx + nx * wdt + ca * thk), Y(cy + ny * wdt + sa * thk), X(cx - nx * wdt + ca * thk), Y(cy - ny * wdt + sa * thk), X(cx - nx * wdt - ca * thk), Y(cy - ny * wdt - sa * thk)], c1); line(X(cx + nx * wdt - ca * thk), Y(cy + ny * wdt - sa * thk), X(cx - nx * wdt - ca * thk), Y(cy - ny * wdt - sa * thk), c2); };
  slab(OPT.exF[0], OPT.exF[1], 18, 3, P.XB1, P.XB3);
  ellipse(X(OPT.exL[0]), Y(OPT.exL[1]), 18 * z, 5 * z, P.TB3, undefined, ang + Math.PI / 2);
  // emission lens, filter (green glass) and the photodiode on its board
  ellipse(X(0), Y(OPT.emL[1]), 18 * z, 5 * z, P.TB3);
  rect(X(-20), Y(OPT.emF[1] - 3), X(20), Y(OPT.emF[1] + 3), P.EM1); rect(X(-20), Y(OPT.emF[1] - 3), X(20), Y(OPT.emF[1] - 2), P.EM3);
  rect(X(-36), Y(OPT.pd[1] - 24), X(36), Y(OPT.pd[1] - 12), P.CB2);
  const lit = o.pdLit || 0;
  rect(X(-18), Y(OPT.pd[1] - 12), X(18), Y(OPT.pd[1] + 4), P.PD1); rect(X(-14), Y(OPT.pd[1] - 9), X(14), Y(OPT.pd[1] + 2), lit > 0.3 ? P.PD4 : P.PD3);
  for (let k = 0; k < 4; k++) rect(X(-12 + k * 8), Y(OPT.pd[1] - 9), X(-11 + k * 8), Y(OPT.pd[1] + 2), P.PD5);
  if (lit > 0) glow(X(0), Y(OPT.pd[1] - 3), 20 * z, P.EM1, P.EM2, 0.5 * lit);
}
// light traffic: o.ex (excitation photons on), o.em (emission on), o.block (show the blocked colours)
function opticsLight(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const bx = OPT.led[0], by = OPT.led[1] - 10;
  if (o.ex > 0) for (let i = 0; i < 9; i++) {
    const u = ((t * 1.1 + i / 9) % 1);
    const stray = i % 4 === 3 && o.block;                       // a cyan-green LED photon: stopped by the excitation filter
    const fu = 0.32;                                             // filter position along the path
    if (stray && u > fu) { if (u < fu + 0.08) flash(X(lerp(bx, 0, fu)), Y(lerp(by, OPT.wy, fu)), 4 * z, 1 - (u - fu) / 0.08, [P.DT1, P.DT2, P.DT3, P.C6]); continue; }
    const x = lerp(bx, 0, u), y = lerp(by, OPT.wy, u);
    disc(X(x), Y(y), 3 * z, stray ? P.DT2 : P.XB2, o.ex); disc(X(x), Y(y), 1.6 * z, stray ? P.DT3 : P.XB3, o.ex);
  }
  if (o.em > 0) for (let i = 0; i < 8; i++) {
    const u = ((t * 1.0 + i / 8 + 0.05) % 1), x = (hash(i + 2500) - 0.5) * 16;
    const blue = i % 3 === 2 && o.block;                        // scattered excitation light coming back up
    const y = lerp(OPT.wy, OPT.pd[1], u);
    if (blue && y < OPT.emF[1] + 4) { if (y > OPT.emF[1] - 20) flash(X(x), Y(OPT.emF[1] + 6), 4 * z, 0.8, [P.XB0, P.XB1, P.XB2, P.C6]); continue; }
    disc(X(x), Y(y), 3 * z, blue ? P.XB2 : P.EM2, o.em); disc(X(x), Y(y), 1.6 * z, blue ? P.XB3 : P.EM3, o.em);
  }
}
function opticsScene(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  opticsWell(cam, t, o.glow || 0);
  opticsHead(cam, t, o);
  opticsLight(cam, t, o);
}
// ---------------------------------------------------------------- the photodiode junction (light from the right)
const JN = { back: [-150, -128], n: [-128, -50], dep: [-50, 74], p: [74, 112], arc: [112, 120], y0: -120, y1: 190 };
function junctionScene(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.35);
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const band = (a, c, c2, lv) => { rect(X(a[0]), Y(JN.y0), X(a[1]), Y(JN.y1), c); if (c2 !== undefined) rect(X(a[0]), Y(JN.y0), X(a[1]), Y(JN.y1), c2, lv); };
  band(JN.back, P.AL1); rect(X(JN.back[0]), Y(JN.y0), X(JN.back[0] + 4), Y(JN.y1), P.AL3);
  band(JN.n, P.NT1, P.NT0, 0.35);
  band(JN.dep, P.SI1, P.SI0, 0.3);
  band(JN.p, P.PT1, P.PT0, 0.35);
  band(JN.arc, P.PD3, P.PD4, 0.4);
  for (let j = 0; j < 9; j++) {
    const y = JN.y0 + 22 + j * 32;
    text(FS, '+', X(-40), Y(y), { sc: Math.max(1, Math.round(z * 2)), c: P.NT2, ol: null });
    text(FS, '-', X(58), Y(y + 20), { sc: Math.max(1, Math.round(z * 2)), c: P.PT2, ol: null });
  }
  for (let j = 0; j < 4; j++) {
    const y = JN.y0 + 46 + j * 74, ph = ((t * 40) % 24);
    for (let x = -26 + ph; x < 48; x += 24) { line(X(x), Y(y), X(x + 12), Y(y), P.SI2); arrowHead(X(x + 14), Y(y), 0, Math.max(3, 3 * z), P.SI2); }
  }
  for (let i = 0; i < 26; i++) {
    const n = i < 13, x = n ? -120 + hash(i + 50) * 64 : 80 + hash(i + 50) * 26, y = JN.y0 + 10 + hash(i + 51) * (JN.y1 - JN.y0 - 20);
    const jx = 3 * Math.sin(t * 7 + i), jy = 3 * Math.cos(t * 6 + i * 2);
    if (n) { disc(X(x + jx), Y(y + jy), 3.2 * z, P.EL0); disc(X(x + jx), Y(y + jy), 2.2 * z, P.EL1); }
    else ring(X(x + jx), Y(y + jy), 2.6 * z, Math.max(1, 1.1 * z), P.C4);
  }
  // contacts and the circuit above: photocurrent (neon green) to the amplifier and the ADC
  rect(X(-150), Y(JN.y0 - 14), X(-128), Y(JN.y0), P.AU1); rect(X(112), Y(JN.y0 - 14), X(126), Y(JN.y0), P.AU1);
  const cy = JN.y0 - 56, k = o.current || 0;
  const wire = new Path([-139, JN.y0 - 14, -139, cy, 119, cy, 119, JN.y0 - 14]);
  const wp = wire.sub(0, wire.L, 3).map((v, i) => i % 2 ? Y(v) : X(v));
  for (let i = 0; i + 3 < wp.length; i += 2) lineW(wp[i], wp[i + 1], wp[i + 2], wp[i + 3], Math.max(2, 2.4 * z), k > 0.05 ? P.SG1 : P.M4);
  // amplifier (transimpedance) in the loop, its output up to the ADC and the digital side
  const ax = X(-10), ay = Y(cy), as = 16 * z;
  poly([ax - as, ay - as, ax + as, ay, ax - as, ay + as], P.CH2); poly([ax - as + 3, ay - as + 5, ax + as - 6, ay, ax - as + 3, ay + as - 5], P.CH3);
  if (k > 0.05) for (let q = 0; q < 10; q++) { const s_ = ((t * 230 + q * wire.L / 10) % wire.L), [px_, py_] = wire.at(s_); disc(X(px_), Y(py_), 3.4 * z * k, P.SG2); disc(X(px_), Y(py_), 1.7 * z * k, P.SG3); }
  // up the output line: ADC chip and the bits that leave it
  const oy0 = cy, oy1 = cy - 120;
  lineW(X(6), Y(oy0), X(6), Y(oy1 + 30), 2.4 * z, k > 0.05 ? P.SG1 : P.M4);
  rect(X(-34), Y(oy1 - 30), X(46), Y(oy1 + 30), P.CH1); frame(X(-34), Y(oy1 - 30), X(46), Y(oy1 + 30), o.adc > 0 ? P.DT3 : P.CH3);
  for (let p = 0; p < 6; p++) { rect(X(-40), Y(oy1 - 24 + p * 9), X(-34), Y(oy1 - 21 + p * 9), P.AL2); rect(X(46), Y(oy1 - 24 + p * 9), X(52), Y(oy1 - 21 + p * 9), P.AL2); }
  text(FS, 'ADC', X(6), Y(oy1 - 6), { sc: Math.max(1, Math.round(2 * z)), c: o.adc > 0 ? P.DT3 : P.SUB, ol: null, align: 'center' });
  if (o.adc > 0) for (let q = 0; q < 8; q++) {
    const u = ((t * 1.6 + q / 8) % 1), y = lerp(oy1 - 30, oy1 - 200, u), b = hash(q + Math.floor(t * 6) * 13) > 0.5;
    text(FS, b ? '1' : '0', X(6 + (q % 3 - 1) * 14), Y(y), { sc: Math.max(1, Math.round(2 * z)), c: b ? P.DT4 : P.DT2, ol: null, align: 'center' });
  }
  return { cy, adcY: oy1 };
}
// one photo-event: a green photon enters from the right at tE, is absorbed, the pair separates
function photoEvent(cam, t, tE, ay, seed) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, ax = 8 + 30 * hash(seed);
  const tf = 0.32, u = (t - tE) / tf;
  if (u < 0) return 0;
  const cols = [P.EM1, P.EM2, P.EM3];
  if (u < 1) {
    const x = lerp(190, ax, u), wl = 22;
    for (let s = 0; s < 46; s += 2) { const w = Math.sin((s + t * 400) / wl * TAU) * 6 * Math.min(1, s / 14); lineW(X(x + s), Y(ay + w), X(x + s + 2), Y(ay + Math.sin((s + 2 + t * 400) / wl * TAU) * 6 * Math.min(1, (s + 2) / 14)), Math.max(2, 2.2 * z), cols[1]); }
    disc(X(x), Y(ay), 4 * z, cols[1]); disc(X(x), Y(ay), 2 * z, cols[2]);
    return 0;
  }
  const v = t - tE - tf;
  if (v < 0.12) flash(X(ax), Y(ay), 10 * z, 1 - v / 0.12, [cols[0], cols[1], cols[2], P.C6]);
  const ex = Math.max(-118, ax - v * 330), hx = Math.min(104, ax + v * 140);
  disc(X(ex), Y(ay), 5.4 * z, P.EL0); disc(X(ex), Y(ay), 4.2 * z, P.EL1); disc(X(ex) - 1.4 * z, Y(ay) - 1.4 * z, 1.4 * z, P.EL2);
  rect(X(ex) - 2 * z, Y(ay) - 0.5 * z, X(ex) + 2 * z, Y(ay) + 0.5 * z, P.EL0);
  ring(X(hx), Y(ay), 4.4 * z, Math.max(1, 1.4 * z), P.C6); rect(X(hx) - 2 * z, Y(ay) - 0.5 * z, X(hx) + 2 * z, Y(ay) + 0.5 * z, P.C6); rect(X(hx) - 0.5 * z, Y(ay) - 2 * z, X(hx) + 0.5 * z, Y(ay) + 2 * z, P.C6);
  return clamp(v / 0.3, 0, 1);
}
