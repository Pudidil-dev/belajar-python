'use strict';
// ============================================================================
// CHEMISTRY CLOSE-UPS (screen-sized worlds, world px).
// 1. The polymerase active site, simplified: the primer's last sugar with its
//    free 3'-OH, the incoming dNTP's alpha phosphate, two Mg2+ ions holding the
//    phosphates and the 3'-oxygen in place. The 3'-O attacks the alpha
//    phosphorus, a phosphodiester bond forms, pyrophosphate (beta + gamma) leaves.
// 2. Fluorescence: an energy-level (Jablonski-style) diagram. A blue photon lifts
//    an electron from the ground state to an upper vibrational level of the
//    excited state; it relaxes (heat) to the bottom of that state, then drops back
//    and emits a green photon of lower energy / longer wavelength.
// Atom colours: O red, P orange, C grey, H white, N blue, Mg2+ silver.
// ============================================================================
function atom(x, y, r, el, z, lv) {
  const C = { O: [P.OX0, P.OX1, P.OX2], P: [P.PH0, P.PH1, P.PH2], C: [P.M6, P.M4, P.M2], H: [P.M3, P.MW, P.C6], N: [P.CD0, P.CD1, P.CD3], Mg: [P.MG0, P.MG1, P.MG2] }[el];
  disc(x, y, (r + 1) * z, C[0], lv); disc(x, y, r * z, C[1], lv); disc(x - r * 0.35 * z, y - r * 0.35 * z, r * 0.4 * z, C[2], lv);
  if (z * r > 6 && el !== 'C' && el !== 'H') text(FS, el === 'Mg' ? 'Mg' : el, x, y - 2 * Math.max(1, Math.round(z * 0.7)), { sc: Math.max(1, Math.round(z * 0.7)), c: P.SH, ol: null, align: 'center' });
}
function bond(x0, y0, x1, y1, z, col, lv) { lineW(x0, y0, x1, y1, 3 * z, P.SH, lv); lineW(x0, y0, x1, y1, 1.8 * z, col || P.C4, lv); }
// k: 0 approach / 0.25 aligned / 0.5 attack / 0.7 bond formed / 1 PPi gone
function activeSite(cam, t, k) {
  const z = cam.z, X = v => cam.x(v), Y = v => cam.y(v);
  rect(0, 0, W, H, P.PO0); rect(0, 0, W, H, P.PO1, 0.35);
  // faint protein texture
  for (let i = 0; i < 40; i++) { const x = cam.x((hash(i + 2100) - 0.5) * 420), y = cam.y((hash(i + 2101) - 0.5) * 700); disc(x, y, (14 + hash(i + 2102) * 18) * z, P.PO1, 0.4); }
  // the template strand (bottom) and the primer strand (left) as backbone hints
  bond(X(-200), Y(150), X(200), Y(150), z * 1.6, P.TM2); for (let i = -3; i <= 3; i++) { lineW(X(i * 56), Y(150), X(i * 56), Y(108), 4 * z, P.TM3); }
  // primer terminal nucleotide: sugar ring (C) with the 3'-O and its H
  const sx = -70, sy = 20;
  const ring5 = [[sx - 26, sy - 6], [sx - 12, sy - 26], [sx + 10, sy - 22], [sx + 14, sy + 2], [sx - 8, sy + 12]];
  for (let i = 0; i < 5; i++) bond(X(ring5[i][0]), Y(ring5[i][1]), X(ring5[(i + 1) % 5][0]), Y(ring5[(i + 1) % 5][1]), z, P.C4);
  ring5.forEach(([x, y], i) => atom(X(x), Y(y), i === 0 ? 7 : 6, i === 0 ? 'O' : 'C', z));
  bond(X(sx - 26), Y(sy - 6), X(-150), Y(-40), z, P.NS2);                                // backbone to the rest of the primer
  bond(X(sx - 8), Y(sy + 12), X(sx - 12), Y(80), z, P.C4); lineW(X(sx - 12), Y(80), X(sx - 12), Y(108), 5 * z, P.NS2);   // base down to its partner
  // 3'-oxygen (on C3'), its hydrogen leaves first
  const o3 = [sx + 30, sy + 6], att = smooth(clamp((k - 0.3) / 0.25, 0, 1));
  const ox = lerp(o3[0], 8, att * 0.55), oy = lerp(o3[1], 4, att * 0.55);
  bond(X(sx + 14), Y(sy + 2), X(ox), Y(oy), z, P.C4);
  const hk = smooth(clamp((k - 0.15) / 0.2, 0, 1));
  atom(X(ox + 10 + hk * 30), Y(oy - 12 - hk * 40), 4, 'H', z, 1 - hk * 0.8);
  atom(X(ox), Y(oy), 8, 'O', z);
  // incoming dNTP: alpha, beta, gamma phosphates (P with O's), its sugar to the right
  const pa = [44, 0], pb = [96, -22], pg = [146, -8];
  const leave = smooth(clamp((k - 0.68) / 0.3, 0, 1)), lx = leave * 140, ly = -leave * 120;
  // dNTP sugar + base (stays: it is now part of the strand)
  bond(X(pa[0]), Y(pa[1]), X(60), Y(52), z, P.C4); atom(X(60), Y(52), 9, 'C', z); lineW(X(60), Y(62), X(60), Y(108), 5 * z, k > 0.7 ? P.NS2 : P.DN2);
  // alpha-P with its non-bridging oxygens
  bond(X(pa[0]), Y(pa[1]), X(pa[0] - 6), Y(pa[1] - 26), z); atom(X(pa[0] - 6), Y(pa[1] - 26), 6, 'O', z);
  bond(X(pa[0]), Y(pa[1]), X(pa[0] + 10), Y(pa[1] + 24), z); atom(X(pa[0] + 10), Y(pa[1] + 24), 6, 'O', z);
  // the alpha-beta bridge breaks as the new bond forms
  const brk = smooth(clamp((k - 0.55) / 0.15, 0, 1));
  if (brk < 1) bond(X(pa[0]), Y(pa[1]), X(lerp(70, 70 + lx, brk)), Y(lerp(-12, -12 + ly, brk)), z, P.C4, 1 - brk);
  // pyrophosphate (beta + gamma) and one Mg leave together
  const PB = [pb[0] + lx, pb[1] + ly], PG = [pg[0] + lx, pg[1] + ly];
  bond(X(70 + lx), Y(-12 + ly), X(PB[0]), Y(PB[1]), z); atom(X(70 + lx), Y(-12 + ly), 6, 'O', z);
  bond(X(PB[0]), Y(PB[1]), X(PG[0]), Y(PG[1]), z);
  for (const [px, py, s] of [[PB[0], PB[1], 1], [PG[0], PG[1], -1]]) { bond(X(px), Y(py), X(px + 4), Y(py - 26), z); atom(X(px + 4), Y(py - 26), 6, 'O', z); bond(X(px), Y(py), X(px - 6), Y(py + 24), z); atom(X(px - 6), Y(py + 24), 6, 'O', z); }
  atom(X(PG[0] + 26), Y(PG[1] + 4), 6, 'O', z); bond(X(PG[0]), Y(PG[1]), X(PG[0] + 26), Y(PG[1] + 4), z);
  atom(X(PB[0]), Y(PB[1]), 9, 'P', z); atom(X(PG[0]), Y(PG[1]), 9, 'P', z);
  // the new phosphodiester bond: 3'-O to alpha-P
  const nb = smooth(clamp((k - 0.5) / 0.15, 0, 1));
  if (nb > 0) { bond(X(ox), Y(oy), X(lerp(ox, pa[0], nb)), Y(lerp(oy, pa[1], nb)), z * 1.3, P.YEL); if (nb > 0.95 && k < 0.85) flash(X((ox + pa[0]) / 2), Y((oy + pa[1]) / 2), 8 * z, 1 - (k - 0.65) / 0.2, [P.PH0, P.PH1, P.PH2, P.C6]); }
  atom(X(pa[0]), Y(pa[1]), 10, 'P', z);
  // attack arrow (before the bond)
  if (k > 0.3 && k < 0.55) { const a = clamp((k - 0.3) / 0.1, 0, 1); for (let j = 0; j < 8; j++) { const u = j / 8; if (u > a) break; const x = lerp(o3[0] + 8, pa[0] - 12, u), y = lerp(o3[1], pa[1], u) - Math.sin(u * Math.PI) * 26; disc(X(x), Y(y), 1.4 * z, P.YEL); } arrowHead(X(pa[0] - 14), Y(pa[1] - 6), 0.4, 5 * z, P.YEL); }
  // two Mg2+ ions: metal A near the 3'-O and alpha-P, metal B with the beta/gamma phosphates (it leaves with PPi)
  const mA = [18, 34], mB = [86 + lx * 0.9, 22 + ly * 0.9];
  for (const [mx, my, w] of [[mA[0], mA[1], 0], [mB[0], mB[1], 1]]) {
    const targets = w === 0 ? [[ox, oy], [pa[0], pa[1]]] : [[PB[0], PB[1]], [PG[0], PG[1]]];
    for (const [tx, tyy] of targets) dashLine(X(mx), Y(my), X(tx), Y(tyy), P.MG1, 2, 2, 0);
    mgIon(X(mx), Y(my), z * 2.2, 0.25);
  }
  return { o3: [X(ox), Y(oy)], pa: [X(pa[0]), Y(pa[1])], ppi: [X(PB[0] + 25), Y(PB[1])], mA: [X(mA[0]), Y(mA[1])], mB: [X(mB[0]), Y(mB[1])] };
}
// ---------------------------------------------------------------- fluorescence physics
// big fluorophore (the reporter) at (x, y), lit 0..1
function bigFluor(x, y, z, lit) {
  if (lit > 0) glow(x, y, 46 * z, P.EM1, P.EM2, lit * 0.8);
  const hexa = (cx, cy, r) => { const pts = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return pts; };
  for (const [dx, dy] of [[-21, 0], [0, -12], [21, 0]]) {
    const c = [x + dx * z, y + dy * z];
    poly(hexa(c[0], c[1], 13 * z), P.RP0); poly(hexa(c[0], c[1], 10.5 * z), lit > 0.3 ? P.RP3 : P.RP2); poly(hexa(c[0], c[1], 5 * z), P.RP1);
  }
  // linker back to the DNA fragment it came from
  lineW(x - 34 * z, y + 4 * z, x - 54 * z, y + 18 * z, 3 * z, P.PB1);
}
// photon wave packet from (x0,y0) toward (x1,y1); lam: wavelength px; u: travel 0..1; col
function photonWave(x0, y0, x1, y1, lam, amp, u, col, len) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const head = u * L, tail = Math.max(0, head - (len || 60));
  let px_ = null, py_ = null;
  for (let s = tail; s <= head; s += 1.5) {
    const env = Math.sin(clamp((s - tail) / Math.max(1, head - tail), 0, 1) * Math.PI), w = Math.sin(s / lam * TAU) * amp * env;
    const x = x0 + ux * s - uy * w, y = y0 + uy * s + ux * w;
    if (px_ !== null) lineW(px_, py_, x, y, 2.2, col);
    px_ = x; py_ = y;
  }
  return [x0 + ux * head, y0 + uy * head];
}
// energy diagram in screen px; stage 0..1: 0 ground, 0.25 absorbed (up), 0.55 relaxed, 0.8 emitted (down)
function jablonski(x0, y0, w, h, stage, t) {
  const S0 = y0 + h, S1 = y0 + h * 0.22, vib = 9;
  rect(x0 - 8, y0 - 26, x0 + w + 8, y0 + h + 34, P.DS1); frame(x0 - 8, y0 - 26, x0 + w + 8, y0 + h + 34, P.N5);
  text(FS, 'ENERGY', x0 - 2, y0 - 20, { sc: 1, c: P.SUB, ol: null });
  lineW(x0 - 2, y0 + h + 6, x0 - 2, y0 - 10, 1.5, P.SUB); arrowHead(x0 - 2, y0 - 12, -Math.PI / 2, 4, P.SUB);
  // levels
  for (let i = 0; i < 4; i++) { rect(x0 + 10, S1 - i * vib, x0 + w - 6, S1 - i * vib + (i ? 1 : 2), i ? P.N6 : P.INK); rect(x0 + 10, S0 - i * vib, x0 + w - 6, S0 - i * vib + (i ? 1 : 2), i ? P.N6 : P.INK); }
  text(FS, 'EXCITED STATE', x0 + w - 6, S1 + 6, { sc: 1, c: P.INK, ol: null, align: 'right' });
  text(FS, 'GROUND STATE', x0 + w - 6, S0 + 6, { sc: 1, c: P.INK, ol: null, align: 'right' });
  // electron path
  const ex = x0 + 34;
  let ey = S0, col = P.EL1;
  if (stage >= 0.12) {
    const up = smooth(clamp((stage - 0.12) / 0.12, 0, 1));
    lineW(ex, S0, ex, lerp(S0, S1 - 3 * vib, up), 3, P.XB2); if (up >= 1) arrowHead(ex, S1 - 3 * vib, -Math.PI / 2, 5, P.XB2);
    ey = lerp(S0, S1 - 3 * vib, up);
  }
  if (stage >= 0.3) {
    const r = smooth(clamp((stage - 0.3) / 0.22, 0, 1));
    for (let j = 0; j < 3; j++) { const yy = S1 - (3 - j) * vib, xx = ex + 14 + j * 12; if (r * 3 > j) { line(xx - 6, yy, xx, yy + vib, P.HT3); line(xx, yy + vib, xx + 4, yy + vib - 3, P.HT3); } }
    ey = lerp(S1 - 3 * vib, S1, r); if (r > 0.2) text(FS, 'HEAT', ex + 52, S1 - 2 * vib - 2, { sc: 1, c: P.HT3, ol: null });
  }
  const ex2 = ex + 64;
  if (stage >= 0.6) {
    const d = smooth(clamp((stage - 0.6) / 0.14, 0, 1));
    lineW(ex2, S1, ex2, lerp(S1, S0, d), 3, P.EM2); if (d >= 1) arrowHead(ex2, S0 - 2, Math.PI / 2, 5, P.EM2);
    ey = lerp(S1, S0, d);
  }
  const bx = stage >= 0.6 ? ex2 : stage >= 0.3 ? lerp(ex, ex2, smooth(clamp((stage - 0.3) / 0.22, 0, 1))) : ex;
  disc(bx, ey, 4, P.EL0); disc(bx, ey, 3, col); disc(bx - 1, ey - 1, 1, P.EL2);
  return { S0, S1, ex, ex2 };
}
