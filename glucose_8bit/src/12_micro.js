'use strict';
// ============================================================================
// WORLD R: the molecules on the working electrode (units ~ nm, not to scale).
// Same orientation as the strip: the gold electrode is the LEFT wall (x < 0),
// the rehydrated reagent and the plasma fill the right. One glucose finds
// the enzyme (FAD-type glucose dehydrogenase), gives up two electrons and
// leaves as gluconolactone; two mediator molecules each take one electron
// (cyan -> green), carry it to the gold and hand it over: the current.
// ============================================================================
const ENZ0 = [70, 0];
// enzyme body: lumps relative to its centre; [x, y, r, gripDx, gripDy]
const ENZ_LUMPS = [[0, 0, 22, 0, 0], [-12, -14, 14, 0, 0], [-14, 12, 13, 0, 0], [-22, 0, 10, 0, 0], [12, -17, 12, 3, 7], [9, 17, 11.5, 4, -6.5], [2, -24, 8, 1, 2], [-4, 23, 8, 0, 0]];
const POCKET = [19, -1, 9.5];                    // the cleft that opens to the right (where glucose arrives)
const FAD = [8, -1];                             // the cofactor inside the pocket
function enzymeSD(x, y, grip) {                  // < 0 inside (enzyme-local coords)
  let d = 1e9;
  for (const [lx, ly, r, gx, gy] of ENZ_LUMPS) d = Math.min(d, Math.hypot(x - lx - gx * grip, y - ly - gy * grip) - r);
  const pr = POCKET[2] * (1 - 0.45 * grip);
  return Math.max(d, -(Math.hypot(x - POCKET[0], y - POCKET[1]) - pr));
}
function drawEnzymeR(cam, ex, ey, t, st) {
  st = st || {};
  const z = cam.z, grip = st.grip || 0, wob_ = 0.6 * Math.sin(t * 1.3 + (st.ph || 0));
  const cx = cam.x(ex), cy = cam.y(ey + wob_), R = 34 * z;
  if (!onScreen(cx - R, cy - R, cx + R, cy + R, 4)) return;
  const dark = st.far ? 1 : 0;
  const B = dark ? P.EZ1 : P.EZ2, Hc = dark ? P.EZ2 : P.EZ3, Lc = dark ? P.EZ0 : P.EZ1;
  const m = maskFn(cx - R, cy - R, cx + R, cy + R, (px, py) => enzymeSD((px - cx) / z, (py - cy) / z, grip) < 0);
  shade(m, B, Hc, Lc, null, { k: Math.max(1, Math.round(1.6 * z)), kh: Math.max(1, Math.round(0.9 * z)) });
  // surface bumps (amino-acid texture) and two helix ribbons
  if (z > 1.2) {
    for (let i = 0; i < 16; i++) { const a = hash(i + 501) * TAU, rr = 6 + 14 * hash(i + 502), lx = Math.cos(a) * rr - 4, ly = Math.sin(a) * rr; if (enzymeSD(lx, ly, grip) > -2.5) continue; disc(cx + lx * z, cy + ly * z, Math.max(1, 1.3 * z), dark ? P.EZ0 : P.EZ1); pset(cx + lx * z - 1, cy + ly * z - 1, Hc); }
    for (const [hx, hy, a] of [[-10, -6, 0.5], [-8, 10, -0.4]]) for (let k = -3; k <= 3; k++) { const px = hx + k * 2.2 * Math.cos(a), py = hy + k * 2.2 * Math.sin(a); ellipse(cx + px * z, cy + py * z, Math.max(1, 1.2 * z), Math.max(1, 2.4 * z), (k & 1) ? Lc : Hc, 1, a); }
  }
  if (st.far) return;
  // the cleft (shadowed) and the FAD cofactor in it
  const pr = POCKET[2] * (1 - 0.45 * grip);
  ellipse(cx + (POCKET[0] - 4) * z, cy + POCKET[1] * z, Math.max(1, (pr * 0.55) * z), Math.max(1, pr * 0.8 * z), P.EZ0, 0.6);
  const fx = cx + FAD[0] * z, fy = cy + FAD[1] * z, fs = 2.3 * z, lit = st.fad || 0;
  for (let k = -1; k <= 1; k++) { const hp = hexPts(fx, fy + k * fs * 1.6, fs, Math.PI / 6); poly(hp, lit > 0 ? P.EL1 : P.TP1); poly(hexPts(fx, fy + k * fs * 1.6, fs * 0.6, Math.PI / 6), lit > 0 ? P.EL2 : P.TP2); }
  if (lit > 0) { glow(fx, fy, 9 * z, P.EL1, P.EL2, 0.5 * lit); disc(fx, fy - fs * 1.6, Math.max(1, 1.2 * z), P.EL3); if (lit > 1.5) disc(fx, fy + fs * 1.6, Math.max(1, 1.2 * z), P.EL3); }
}
// glucose (yellow ring with OH groups) and the product gluconolactone (orange, with a C=O)
function glucoseR(cam, x, y, s, a, opt) {
  opt = opt || {};
  const z = cam.z, cx = cam.x(x), cy = cam.y(y), S = s * z, prod = opt.prod || 0;
  if (!onScreen(cx - S * 2, cy - S * 2, cx + S * 2, cy + S * 2)) return;
  const c1 = prod > 0.5 ? P.GL1 : P.GL1, c2 = prod > 0.5 ? P.GO : P.GL2, c3 = prod > 0.5 ? P.GL2 : P.GL3;
  for (let i = 0; i < 6; i++) {                 // OH stubs on alternating corners
    if (i % 2) continue;
    const an = a + i * TAU / 6, x0 = cx + Math.cos(an) * S, y0 = cy + Math.sin(an) * S, x1 = cx + Math.cos(an) * S * 1.7, y1 = cy + Math.sin(an) * S * 1.7;
    lineW(x0, y0, x1, y1, Math.max(1, 0.32 * S), c1); disc(x1, y1, Math.max(1, 0.28 * S), c2);
  }
  if (prod > 0.5) {                              // the C=O of the lactone
    const an = a + TAU / 6, x0 = cx + Math.cos(an) * S, y0 = cy + Math.sin(an) * S, nx = -Math.sin(an) * S * 0.18, ny = Math.cos(an) * S * 0.18;
    for (const sgn of [-1, 1]) lineW(x0 + nx * sgn, y0 + ny * sgn, cx + Math.cos(an) * S * 1.75 + nx * sgn, cy + Math.sin(an) * S * 1.75 + ny * sgn, Math.max(1, 0.18 * S), P.GO);
    disc(cx + Math.cos(an) * S * 1.9, cy + Math.sin(an) * S * 1.9, Math.max(1, 0.36 * S), P.BL4);
  }
  poly(hexPts(cx, cy, S + Math.max(1, 0.12 * S), a), c1);
  poly(hexPts(cx, cy, S, a), c2);
  poly(hexPts(cx, cy, S * 0.42, a), opt.inner === undefined ? P.WN2 : opt.inner);
  poly(hexPts(cx - S * 0.18, cy - S * 0.42, S * 0.3, a), c3, 0.8);
  if (opt.ring > 0) ring(cx, cy, S * 2.1 + 2 * Math.sin(opt.t * 6), 1, P.GL3, 0.8 * opt.ring);
}
// mediator: an octahedral complex (ferricyanide-like). green = carrying an electron
function mediatorR(cam, x, y, s, a, green, opt) {
  opt = opt || {};
  const z = cam.z, cx = cam.x(x), cy = cam.y(y), S = s * z * (opt.sc || 1);
  if (!onScreen(cx - S * 2, cy - S * 2, cx + S * 2, cy + S * 2)) return;
  const g = green > 0.5, c0 = g ? P.MG0 : P.MD0, c1 = g ? P.MG1 : P.MD1, c2 = g ? P.MG2 : P.MD2, c3 = g ? P.MG3 : P.MD3;
  const arms = [];
  for (let i = 0; i < 6; i++) { const an = a + i * TAU / 6 + (i % 2 ? 0.12 : 0), L = S * (i % 3 === 1 ? 1.05 : 1.3); arms.push([cx + Math.cos(an) * L, cy + Math.sin(an) * L * 0.92]); }
  arms.sort((p, q) => p[1] - q[1]);
  for (const [ax, ay] of arms) { lineW(cx, cy, ax, ay, Math.max(1, 0.3 * S), c1); disc(ax, ay, Math.max(1, 0.34 * S), c0); disc(ax, ay, Math.max(1, 0.27 * S), c2); pset(ax - 1, ay - 1, c3); }
  disc(cx, cy, S * 0.58, c1); disc(cx, cy, S * 0.5, c2); disc(cx - S * 0.17, cy - S * 0.17, Math.max(1, S * 0.2), c3);
  if (opt.e > 0) { const ea = opt.t * 7, ex = cx + Math.cos(ea) * S * 0.8, ey = cy + Math.sin(ea) * S * 0.5; disc(ex, ey, Math.max(1.5, 0.26 * S), P.EL2); pset(ex, ey, P.EL3); }
  if (opt.flash > 0) { ring(cx, cy, S * (1.4 + 1.2 * (1 - opt.flash)), Math.max(1, S * 0.15), c3, opt.flash); }
}
function electronR(cam, x, y, s, k) {
  const z = cam.z, cx = cam.x(x), cy = cam.y(y), R = Math.max(1.5, s * z);
  disc(cx, cy, R * 2.4, P.EL1, 0.3 * (k === undefined ? 1 : k)); disc(cx, cy, R * 1.5, P.EL1, 0.6); disc(cx, cy, R, P.EL2); disc(cx - R * 0.3, cy - R * 0.3, Math.max(1, R * 0.45), P.EL3);
}
// ---------------------------------------------------------------- the gold electrode (lattice), electrons streaming down it
const AUX = 7.6, AUY = 8.8;
function goldWall(cam, t, cur) {
  const z = cam.z, sx1 = cam.x(0);
  if (sx1 <= 0) return;
  rect(0, 0, Math.min(W, sx1), H, P.AU0);
  const r = 3.9 * z, i0 = Math.floor((cam.wy(0) - 10) / AUY), i1 = Math.ceil((cam.wy(H) + 10) / AUY);
  for (let c = 0; c < 60; c++) {
    const x = -AUX * (c + 0.5); const sx = cam.x(x); if (sx < -r) break;
    for (let i = i0; i <= i1; i++) {
      const y = i * AUY + (c % 2) * AUY / 2, sy = cam.y(y);
      if (r < 1.6) { pset(sx, sy, c === 0 ? P.AU3 : P.AU2); continue; }
      disc(sx, sy, r, c === 0 ? P.AU2 : P.AU1); disc(sx - r * 0.12, sy - r * 0.12, r * 0.78, c === 0 ? P.AU3 : P.AU2); disc(sx - r * 0.38, sy - r * 0.38, Math.max(1, r * 0.28), c === 0 ? P.AU4 : P.AU3);
    }
  }
  // the surface: a bright edge
  rect(sx1 - Math.max(1, 0.5 * z), 0, sx1 + 1, H, P.AU3, 0.5);
  // electrons running down between the surface atoms (the current)
  if (cur > 0) {
    const n = Math.round(10 + 80 * cur), sp = 60 + 140 * cur, y0 = cam.wy(-30), spanW = (H + 60) / z;
    for (let k = 0; k < n; k++) {
      const col = k % 4, x = -AUX * (col + 0.5) + AUX * 0.5 * ((col % 2) ? 0.5 : -0.5) + 1.0 * Math.sin(k * 1.7);
      const y = y0 + (((hash(k + 701) * spanW + t * sp * (0.8 + 0.4 * hash(k + 702)) - y0) % spanW) + spanW) % spanW;
      const sx = cam.x(x), sy = cam.y(y), R = Math.max(1.5, 1.6 * z);
      if (sy > H + 10) continue;
      for (let q = 1; q <= 3; q++) disc(sx, sy - R * 1.3 * q, R * (1 - q * 0.22), P.EL1, 0.55);
      disc(sx, sy, R * 1.9, P.EL1, 0.35 * cur); disc(sx, sy, R, P.EL2); pset(sx, sy, P.EL3); pset(sx - 1, sy, P.EL3);
    }
  }
}
// ---------------------------------------------------------------- the solution: wine ground with drifting water specks
function solutionBG(cam, t) {
  rect(0, 0, W, H, P.WN1);
  const z = cam.z;
  // big soft plasma swirls (parallax 0.35) and drifting water specks (parallax 0.7)
  for (let i = 0; i < 9; i++) {
    const x = ((hash(i + 811) * 420 + 26 * wob(t, 1, i) - cam.cx * z * 0.35) % 420 + 420) % 420 - 75, y = ((hash(i + 812) * 640 + 30 * wob(t, 1, i + 3) - cam.cy * z * 0.35) % 640 + 640) % 640 - 80;
    const r = 34 + 40 * hash(i + 813);
    disc(x, y, r, P.WN2, 0.5); disc(x + r * 0.15, y - r * 0.1, r * 0.6, P.WN2, 0.4);
  }
  for (let i = 0; i < 90; i++) {
    const x = ((hash(i + 801) * 400 + 20 * wob(t, 3, i) - cam.cx * z * 0.7) % 300 + 300) % 300 - 15, y = ((hash(i + 802) * 520 - t * 6 - cam.cy * z * 0.7) % 520 + 520) % 520 - 20;
    const c = hash(i + 803) > 0.55 ? P.WN3 : P.PL1;
    if (hash(i + 804) > 0.8) { const a = t * 0.8 + i; const s = 2 + Math.round(hash(i + 805) * 2); pset(x, y, c); pset(x + Math.cos(a) * s, y + Math.sin(a) * s, c); pset(x + Math.cos(a + 1.9) * s, y + Math.sin(a + 1.9) * s, c); }
    else { pset(x, y, c); pset(x + 1, y, c); }
  }
}
// ---------------------------------------------------------------- the hero sequence
function heroGluR(t) {                          // [x, y, angle, prod, show]
  const pk = [ENZ0[0] + POCKET[0] - 7.5, ENZ0[1] + POCKET[1]];
  if (t < T_DOCKG) {
    const u = seg(t, 16.4, T_DOCKG), k = 1 - Math.pow(1 - u, 2.2);
    const x = lerp(150, pk[0] + 10, k) + 7 * Math.sin(t * 2.3) * (1 - k), y = lerp(-95, pk[1] - 2, k) + 6 * Math.cos(t * 1.9) * (1 - k);
    return [x, y, t * 0.9, 0, 1];
  }
  if (t < T_REL) { const k = K75(seg(t, T_DOCKG, T_DOCKG + 0.45)); return [lerp(pk[0] + 10, pk[0], k) + 0.4 * Math.sin(t * 30) * seg(t, T_GRIP, T_GRIP + 0.2) * (1 - seg(t, T_GRIP + 0.2, T_GRIP + 0.5)), lerp(pk[1] - 2, pk[1], k), T_DOCKG * 0.9 + k * 0.3, seg(t, T_E2 + 0.05, T_E2 + 0.25), 1]; }
  const u = t - T_REL, f = (1 - Math.exp(-1.8 * u)) / 1.8;
  return [pk[0] + 70 * f + 6 * Math.sin(u * 2), pk[1] - 52 * f - 8 * Math.sin(u * 1.3), T_DOCKG * 0.9 + 0.3 + u * 1.4, 1, u < 4 ? 1 : 0];
}
function gripK(t) { return t < T_GRIP ? 0 : t < T_REL ? backOut(seg(t, T_GRIP, T_GRIP + 0.28), 1.6) : 1 - K75(seg(t, T_REL, T_REL + 0.35)); }
function fadK(t) { return (t > T_E1 + 0.1 ? 1 : 0) + (t > T_E2 + 0.1 ? 1 : 0) - (t > T_H1 ? 1 : 0) - (t > T_H2 ? 1 : 0); }
// the two hero mediators: dock on the enzyme's left (electrode) side, take one electron each, carry it to the gold
const MDOCK = [[ENZ0[0] - 29, ENZ0[1] - 13], [ENZ0[0] - 27, ENZ0[1] + 15]];
const MWALL = [[6.2, -34], [6.2, 22]];
function heroMed(i, t) {                         // [x, y, angle, green, carrying, flash]
  const td = i ? T_MD2 : T_MD1, th = i ? T_H2 : T_H1, tw = i ? T_WALL + BEAT : T_WALL;
  const start = i ? [ENZ0[0] - 74, ENZ0[1] + 92] : [ENZ0[0] - 80, ENZ0[1] - 96];
  let x, y;
  if (t < td) { const k = K75(seg(t, td - 1.6, td)); x = lerp(start[0], MDOCK[i][0], k) + 4 * Math.sin(t * 2.1 + i) * (1 - k); y = lerp(start[1], MDOCK[i][1], k) + 3 * Math.cos(t * 1.7 + i) * (1 - k); }
  else if (t < 26.15 + 0.3 * i) { x = MDOCK[i][0] + 0.4 * Math.sin(t * 3 + i); y = MDOCK[i][1]; }
  else if (t < tw) {
    const u = seg(t, 26.15 + 0.3 * i, tw), k = smooth(u);
    const mid = [lerp(MDOCK[i][0], MWALL[i][0], 0.55) + 8, lerp(MDOCK[i][1], MWALL[i][1], 0.55) + (i ? 14 : -14)];
    const a = 1 - k; x = a * a * MDOCK[i][0] + 2 * a * k * mid[0] + k * k * MWALL[i][0] + 2.5 * Math.sin(t * 2.6 + i) * Math.sin(k * Math.PI); y = a * a * MDOCK[i][1] + 2 * a * k * mid[1] + k * k * MWALL[i][1] + 2 * Math.cos(t * 2.2 + i) * Math.sin(k * Math.PI);
  } else { const u = t - tw, f = (1 - Math.exp(-1.4 * u)) / 1.4; x = MWALL[i][0] + 46 * f + 3 * Math.sin(t * 2 + i); y = MWALL[i][1] + (i ? 30 : -30) * f; }
  const green = t >= th && t < tw ? 1 : 0;
  const flash = Math.max(pulse(t, th, 0.3), pulse(t, tw, 0.3));
  return [x, y, t * 0.7 + i * 2, green, green, flash];
}
// workers: other mediators shuttling between enzymes and the gold once everything runs (they make the surge)
const WORKERS = [];
for (let i = 0; i < 22; i++) WORKERS.push({ y: -200 + 420 * ((i + 0.5) / 22) + (hash(i + 901) - 0.5) * 14, per: 1.4 + 1.2 * hash(i + 902), ph: hash(i + 903), xf: 40 + 70 * hash(i + 904), t0: T_SURGE - 1.2 + 1.6 * hash(i + 905) });
function workerState(w, t) {
  if (t < w.t0) return null;
  const ph = ((t - w.t0) / w.per + w.ph) % 1;
  let x, green;
  if (ph < 0.55) { x = lerp(w.xf, 6.2, smooth(ph / 0.55)); green = 1; } else { x = lerp(6.2, w.xf, smooth((ph - 0.55) / 0.45)); green = 0; }
  const arrive = ph < 0.55 ? 0 : clamp(1 - (ph - 0.55) / 0.12, 0, 1);
  return [x, w.y + 6 * Math.sin(t * 1.3 + w.ph * 9), t * 0.8 + w.ph * 6, green, arrive];
}
const FAR_ENZ = [[150, -130, 0.4], [160, 120, 1.2], [96, 185, 2.0], [118, -230, 2.7], [30, -150, 3.3], [40, 160, 4.1]];
const FREE_GLU = [];
for (let i = 0; i < 16; i++) FREE_GLU.push({ x: 20 + 190 * hash(i + 951), y: -260 + 520 * hash(i + 952), ph: hash(i + 953) * TAU });
// ---------------------------------------------------------------- draw
function drawWorldR(cam, t, o) {
  o = o || {};
  solutionBG(cam, t);
  const cur = o.cur !== undefined ? o.cur : smooth(seg(t, T_WALL - 0.1, T_SURGE + 0.8)) * 0.35 + 0.65 * smooth(seg(t, T_SURGE, T_SURGE + 0.9));
  // background enzymes (darker), free glucose
  for (const [x, y, ph] of FAR_ENZ) drawEnzymeR(cam, x, y, t, { far: true, ph, grip: 0.5 + 0.5 * Math.sin(t * 1.1 + ph) });
  for (const g of FREE_GLU) { const x = g.x + 8 * Math.sin(t * 0.7 + g.ph), y = g.y + 10 * Math.cos(t * 0.6 + g.ph); if (Math.hypot(x - ENZ0[0], y - ENZ0[1]) < 40) continue; glucoseR(cam, x, y, 4.6, t * 0.5 + g.ph, {}); }
  // the gold
  goldWall(cam, t, t > T_WALL - 0.2 ? cur : 0);
  // worker mediators + their hand-overs at the gold
  if (t > T_SURGE - 1.3) for (const w of WORKERS) {
    const s = workerState(w, t); if (!s) continue;
    if (s[4] > 0) electronR(cam, lerp(4, -3, 1 - s[4]), s[1], 1.6, s[4]);
    mediatorR(cam, s[0], s[1], 4.6, s[2], s[3], { e: s[3], t: t + w.ph * 3 });
  }
  // the hero enzyme
  const grip = gripK(t), fad = fadK(t);
  drawEnzymeR(cam, ENZ0[0], ENZ0[1], t, { grip, fad });
  // the hero glucose / product
  const g = heroGluR(t);
  if (g[4] && t > 16 && t < T_REL + 4) {
    glucoseR(cam, g[0], g[1], 6.2, g[2], { prod: g[3], ring: t < T_GRIP ? 1 : 0, t });
    // electrons leaving the glucose for the FAD
    for (const te of [T_E1, T_E2]) if (t > te - 0.02 && t < te + 0.14) { const k = seg(t, te, te + 0.12); electronR(cam, lerp(g[0], ENZ0[0] + FAD[0], k), lerp(g[1], ENZ0[1] + FAD[1] + (te === T_E1 ? -3 : 3), k) - 6 * Math.sin(k * Math.PI), 2.1); }
  }
  // hero mediators
  for (let i = 0; i < 2; i++) {
    const m = heroMed(i, t), th = i ? T_H2 : T_H1, tw = i ? T_WALL + BEAT : T_WALL;
    if (t < (i ? T_MD2 : T_MD1) - 1.7) continue;
    if (t > th - 0.02 && t < th + 0.14) { const k = seg(t, th, th + 0.12); electronR(cam, lerp(ENZ0[0] + FAD[0], m[0], k), lerp(ENZ0[1] + FAD[1], m[1], k) - 5 * Math.sin(k * Math.PI), 2.1); }
    if (t > tw - 0.02 && t < tw + 0.2) { const k = seg(t, tw, tw + 0.18); electronR(cam, lerp(m[0], -4, k), m[1] + 4 * k, 2.1); }
    mediatorR(cam, m[0], m[1], 5.4, m[2], m[3], { e: m[4], t, flash: m[5], sc: 1 + 0.25 * m[5] });
  }
}
