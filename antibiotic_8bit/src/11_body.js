'use strict';
// ============================================================================
// THE BODY WORLDS (sequence B, 4.3-12 s).
//  BODY (mm, y down, lips at 0,0, facing right): a simplified see-through
//   profile — oral cavity, tongue, pharynx, esophagus, stomach, gut coils, the
//   spine for reference; no face details. The capsule (amber cap, cream body)
//   is swallowed, slides down the esophagus (a peristaltic bulge carries it),
//   drops into the stomach fluid, softens, splits, frees amber drug molecules.
//  GUT (um): intestinal villi; tall lining cells with a brush border; a
//   capillary loop under them; the molecules cross the cells into it.
//  BLOOD (um): a small vessel; red cells and free drug molecules in plasma.
// ============================================================================
const BODY_SIL = spline([-95, -175, -50, -172, -15, -150, 2, -120, 6, -92, 12, -78, 27, -58, 24, -50, 10, -44, 10, -30, 15, -16, 10, -6, 5, 0, 10, 6, 15, 15, 9, 27, 9, 41, 4, 53,
  -20, 66, -42, 78, -48, 120, -50, 172, -30, 208, 0, 262, 14, 340, 17, 430, 12, 520, 16, 610, 12, 720, -260, 720, -252, 520, -240, 360, -228, 240, -192, 198, -152, 160, -142, 80,
  -150, 40, -182, -10, -192, -70, -176, -132, -140, -166], 4, true);
const ORAL = spline([5, -2, -18, -9, -52, -8, -72, 4, -72, 22, -44, 28, -12, 20, 5, 4], 4, true);
const TONGUE0 = [-4, 9, -24, 3, -52, 6, -68, 20, -62, 34, -32, 34, -10, 24];
const SPINE_X = -158;
const ESO_C = spline([-74, 8, -80, 40, -82, 90, -80, 160, -76, 240, -72, 320, -68, 400, -64, 446], 10, false);   // pharynx + esophagus centreline
const ESO = new Path(ESO_C);
const STOMACH = spline([-66, 448, -96, 452, -104, 486, -88, 530, -50, 556, 0, 560, 34, 546, 44, 524, 28, 516, -4, 528, -32, 518, -52, 486, -54, 458], 6, true);
const GUT_COILS = [spline([40, 540, 62, 562, 40, 590, -20, 596, -60, 616, -30, 640, 30, 636, 60, 660, 20, 690, -60, 690, -100, 668], 6, false)];
// ---------------------------------------------------------------- the capsule: where and in what state
const CAP_LEN = 21, CAP_R = 3.8;
const MATCH_A = cellPose(cellById('M'), EV.match).a;   // the capsule takes the rod's angle at the match cut
function capsuleState(t) {
  let x, y, a, soft = 0, split = 0;
  if (t < EV.lips) { const k = smooth(seg(t, EV.match, EV.lips)); x = lerp(52, 6, k); y = lerp(-3, 0, k); a = lerp(MATCH_A, 0, k); }
  else if (t < EV.swallow) { const k = smooth(seg(t, EV.lips, EV.swallow)); x = lerp(6, -66, k); y = lerp(0, 12, k) - 4 * Math.sin(k * Math.PI); a = lerp(0, 0.35, k); }
  else if (t < 6.05) { const s = lerp(0, ESO.L, Math.pow(seg(t, EV.swallow, 6.05), 1.15)); [x, y] = ESO.at(s); const tg = ESO.tan(s); a = Math.atan2(tg[1], tg[0]) + Math.PI; }
  else { const k = smooth(seg(t, 6.05, EV.splash)); x = lerp(-64, -40, k) + (t > EV.splash ? 2 * Math.sin((t - EV.splash) * 2.2) : 0); y = lerp(446, 502, k) + (t > EV.splash ? 6 * (1 - Math.exp(-(t - EV.splash) * 2)) + 1.5 * Math.sin((t - EV.splash) * 3) : 0); a = lerp(-1.6, -0.5, k) + (t > EV.splash ? 0.25 * Math.sin((t - EV.splash) * 1.6) : 0); }
  if (t >= EV.shell) soft = smooth(seg(t, EV.shell, EV.drugOut));
  if (t >= EV.drugOut) split = smooth(seg(t, EV.drugOut, EV.drugOut + 0.5));
  return { x, y, a, soft, split };
}
function drawCapsule(cam, st, t) {
  const c = Math.cos(st.a), s = Math.sin(st.a), P_ = (lx, ly) => [st.x + lx * c - ly * s, st.y + lx * s + ly * c];
  const half = (x0, x1, r, ramp, sd, off) => {
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) { const an = -Math.PI / 2 + i / n * Math.PI; pts.push(x1 + Math.cos(an) * r, Math.sin(an) * r); }
    for (let i = 0; i <= n; i++) { const an = Math.PI / 2 + i / n * Math.PI; pts.push(x0 + Math.cos(an) * r, Math.sin(an) * r); }
    const q = [];
    for (let i = 0; i < pts.length; i += 2) {
      let lx = pts[i] + off, ly = pts[i + 1];
      if (st.soft > 0) { const w = st.soft * 0.9 * Math.sin(i * 1.7 + t * 5 + sd); lx += w * 0.6; ly += w; }
      const p = P_(lx, ly); q.push(cam.x(p[0]), cam.y(p[1]));
    }
    shade(maskPoly(q), ramp[1], ramp[2], ramp[0], ramp[3], { k: Math.max(1, Math.round(cam.z * 0.5)) });
    const hl = P_(x0 + (x1 - x0) * 0.35 + off, -r * 0.45); if (cam.z > 1.5) ellipse(cam.x(hl[0]), cam.y(hl[1]), Math.max(1, (x1 - x0) * 0.22 * cam.z), Math.max(1, r * 0.18 * cam.z), ramp[2], undefined, st.a);
  };
  const gapX = st.split * 7;
  half(-CAP_LEN / 2, 0.5, CAP_R, st.soft > 0.5 ? [P.CR1, P.CR3, P.G8, P.CR0] : [P.CR1, P.CR2, P.CR3, P.CR0], 1, -gapX);
  half(-1.5, CAP_LEN / 2, CAP_R + 0.25, st.soft > 0.5 ? [P.AM2, P.AM4, P.AM5, P.AM1] : [P.AM2, P.AM3, P.AM4, P.AM1], 2, gapX);
}
// the drug released in the stomach: a cloud of amber molecules that spreads and drifts toward the outlet
function stomachDrug(i, t) {
  const t0 = EV.drugOut + 0.03 * i, s = t - t0; if (s < 0) return null;
  const cs = capsuleState(EV.drugOut), ang = hash2(i, 5) * TAU, sp = 6 + 14 * hash2(i, 6);
  const f = sp * (1 - Math.exp(-2.2 * s)), dr = 2.5 * Math.sqrt(s);
  let x = cs.x + Math.cos(ang) * f + dr * (vnoise(s, i) - 0.5) * 2, y = cs.y + Math.sin(ang) * f * 0.7 + dr * (vnoise(s, i + 9) - 0.5) * 2;
  const g = smooth(seg(t, 7.4, 8.1)); x += g * (36 + 10 * hash2(i, 7)); y += g * (22 + 6 * hash2(i, 8));   // carried toward the stomach outlet
  return [x, y];
}
// ---------------------------------------------------------------- the body world
function bodyBG(cam) { for (let y = 0; y < H; y++) buf.fill(mixc(P.N3, P.BG, Math.round(clamp(y / H, 0, 1) * 4) / 4), y * W, (y + 1) * W); }
function drawTube(cam, path, w, col, edge, bulge) { // a tube along a centreline with a local peristaltic bulge
  const q = path.p;
  for (let i = 0; i + 3 < q.length; i += 2) {
    const s = path.c[i >> 1], ww = w + (bulge ? bulge(s) : 0);
    lineW(cam.x(q[i]), cam.y(q[i + 1]), cam.x(q[i + 2]), cam.y(q[i + 3]), Math.max(2, (ww + 2) * cam.z), edge);
  }
  for (let i = 0; i + 3 < q.length; i += 2) {
    const s = path.c[i >> 1], ww = w + (bulge ? bulge(s) : 0);
    lineW(cam.x(q[i]), cam.y(q[i + 1]), cam.x(q[i + 2]), cam.y(q[i + 3]), Math.max(1, ww * cam.z), col);
  }
}
function drawBodyWorld(cam, t) {
  bodyBG(cam);
  // the see-through body: a dark warm glass with a bright rim
  const sil = maskPoly(cam.pts(BODY_SIL));
  shade(sil, mixc(P.SK0, P.N2, 0.55), P.SK3, mixc(P.SK0, P.N1, 0.3), P.SK2, { k: Math.max(1, Math.round(cam.z * 0.8)), kh: Math.max(1, Math.round(cam.z * 0.8)) });
  // the spine for reference (pale vertebrae behind the organs)
  for (let y = -40; y < 720; y += 22) { const xs = SPINE_X + (y > 200 ? (y - 200) * -0.06 : 0) + (y < 60 ? (60 - y) * -0.05 : 0); const m = maskRR(cam.x(xs - 10), cam.y(y), cam.x(xs + 10), cam.y(y + 17), 4 * cam.z); shade(m, P.CR1, P.CR2, P.CR0, P.NU0, { k: 1 }); }
  // the diaphragm: a thin dome
  const dia = []; for (let k = 0; k <= 16; k++) { const x = -240 + k * 16; dia.push(x, 420 - 26 * Math.sin(k / 16 * Math.PI)); }
  wpath(cam, dia, 2.5, P.MU1);
  // the gut coils below the stomach, then the stomach
  for (const g of GUT_COILS) { wpath(cam, g, 13, P.MU1); wpath(cam, g, 10, P.MU3); wpath(cam, g.map((v, i) => i % 2 ? v - 2.5 : v), 2.5, P.MU4); }
  const sto = maskPoly(cam.pts(STOMACH)); shade(sto, P.MU2, P.MU4, P.MU1, P.MU0, { k: Math.max(1, Math.round(cam.z * 0.9)) });
  // the stomach's inside when close: dark lumen, rugae, gastric fluid with a moving surface
  if (cam.z > 1.4) {
    const inner = maskFn(sto.x0, sto.y0, sto.x0 + sto.w, sto.y0 + sto.h, (px, py) => sto.get(Math.floor(px), Math.floor(py)) && sto.get(Math.floor(px - 4 * cam.z), Math.floor(py)) && sto.get(Math.floor(px + 4 * cam.z), Math.floor(py)) && sto.get(Math.floor(px), Math.floor(py - 4 * cam.z)) && sto.get(Math.floor(px), Math.floor(py + 4 * cam.z)));
    mFill(inner, P.MU0);
    const lvl = 500;
    mFill(inner, P.FL1, undefined, (x, y) => cam.wy(y + 0.5) > lvl + 1.5 * Math.sin(cam.wx(x) * 0.25 + t * 3));
    mFill(inner, P.FL2, undefined, (x, y) => { const wy = cam.wy(y + 0.5), s = lvl + 1.5 * Math.sin(cam.wx(x) * 0.25 + t * 3); return wy > s && wy < s + 1.2; });
    for (let k = 0; k < 9; k++) { const x0 = -92 + k * 15, pts = []; for (let j = 0; j <= 6; j++) pts.push(x0 + Math.sin(j + k) * 2, 470 + j * 12); const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) if (inner.get(Math.floor(q[i]), Math.floor(q[i + 1]))) line(q[i], q[i + 1], q[i + 2], q[i + 3], P.MU1); }
    for (let k = 0; k < 14; k++) { const bx = -80 + hash2(k, 3) * 110, by = 548 - ((t * (4 + hash2(k, 4) * 6) + hash2(k, 5) * 40) % 46); if (inner.get(Math.floor(cam.x(bx)), Math.floor(cam.y(by)))) ring(cam.x(bx), cam.y(by), Math.max(1.5, 0.9 * cam.z), 1, P.FL3); }
  }
  // oral cavity, tongue (lifts as it swallows), pharynx and esophagus (a peristaltic bulge follows the capsule)
  const om = maskPoly(cam.pts(ORAL)); shade(om, P.MU0, P.MU1, P.BL0, P.MU1, { k: 1 });
  const lift = Math.sin(seg(t, 4.95, 5.45) * Math.PI) * 7, tq = TONGUE0.map((v, i) => i % 2 ? v - lift * (TONGUE0[i - 1] < -30 ? 1 : 0.4) : v);
  shade(maskPoly(cam.pts(spline(tq, 4, true))), P.MU3, P.MU4, P.MU2, P.MU1, { k: Math.max(1, Math.round(cam.z * 0.6)) });
  const cs = capsuleState(t);
  let sCap = -999; if (t >= EV.swallow && t < 6.05) sCap = lerp(0, ESO.L, Math.pow(seg(t, EV.swallow, 6.05), 1.15));
  drawTube(cam, ESO, 7, P.MU2, P.MU1, s => 5.5 * Math.exp(-Math.pow((s - sCap) / 16, 2)));
  wpath(cam, ESO_C.map((v, i) => i % 2 ? v : v - 1.5), 1.6, P.MU3);
  // the capsule, then the drug it frees
  if (t < EV.drugOut + 1.2) drawCapsule(cam, cs, t);
  if (t >= EV.drugOut) for (let i = 0; i < 46; i++) { const p = stomachDrug(i, t); if (p) drugDot(cam, p[0], p[1]); }
  // the splash: rings on the fluid surface and a few droplets
  if (t >= EV.splash && t < EV.splash + 0.8) {
    const k = (t - EV.splash) / 0.8;
    ring(cam.x(-40), cam.y(500), (3 + 12 * eout(k)) * cam.z, Math.max(1, cam.z * 0.8 * (1 - k)), P.FL3);
    for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 6), sp = 9 + 5 * hash2(i, 2), s = k * 0.8; const x = -40 + Math.cos(a) * sp * s, y = 500 + Math.sin(a) * sp * s + 30 * s * s; disc(cam.x(x), cam.y(y), Math.max(1, 0.8 * cam.z), P.FL3); }
  }
}
// ---------------------------------------------------------------- the gut world (um): villi, lining cells, capillary loops
const VILLI = [-340, -170, 0, 170, 340, 510].map((x, i) => ({ x, tip: 120 + 40 * hash2(i, 3), r: 60 }));
function gutBG(cam) { for (let y = 0; y < H; y++) buf.fill(mixc(P.FL1, P.FL0, Math.round(clamp(y / H, 0, 1) * 4) / 4), y * W, (y + 1) * W); }
function drawVilli(cam, t) {
  const o = 1 / cam.z;
  for (let py = 0; py < H; py++) {
    const wy = cam.wy(py + 0.5);
    for (let px = 0; px < W; px++) {
      const wx = cam.wx(px + 0.5);
      let best = null, bd = 1e9;
      for (const v of VILLI) { const dx = wx - v.x; if (Math.abs(dx) > 80) continue; const qy = wy < v.tip ? wy - v.tip : 0, d = Math.sqrt(dx * dx + qy * qy) - v.r; if (d < bd) { bd = d; best = v; } }
      if (!best || bd > 0) continue;
      const d = bd, dx = wx - best.x, qy = wy < best.tip ? wy - best.tip : 0, l = Math.sqrt(dx * dx + qy * qy) || 1, lit = -(dx / l + qy / l) * 0.7071;
      let col;
      if (d > -o) col = P.MU1;
      else if (d > -3) col = P.MU5;                                   // the brush border
      else if (d > -30) {                                               // the lining cells
        const s = qy < 0 ? Math.atan2(dx, -qy) * best.r : (dx > 0 ? 1 : -1) * (best.r * Math.PI / 2 + (wy - best.tip));
        const fr = ((s / 12) % 1 + 1) % 1;
        if (fr < 0.09 * Math.max(1, o * 1.5)) col = P.MU1;
        else if (d < -20 && d > -26 && Math.abs(fr - 0.5) < 0.22) col = P.MU0;   // nuclei near the base
        else col = lit > 0.5 && d > -6 ? P.MU4 : P.MU3;
      }
      else if (d > -33) col = P.MU1;                                    // basement membrane
      else if (d > -45 && d < -36) col = d > -37 || d < -44 ? P.AR1 : P.AR3;   // the capillary loop under the lining
      else col = Math.abs(dx) < 7 && wy > best.tip - 20 ? P.CR1 : P.MU2;      // the core, the central lacteal
      buf[py * W + px] = col;
    }
  }
}
// drug molecules in the gut: they rain onto the villi, cross the lining cells at the tip and enter the capillary
function gutDrug(i, t) {
  const v = VILLI[2], ang = (hash2(i, 11) - 0.5) * 2.2, tc = EV.cross + (hash2(i, 12) - 0.5) * 0.9;
  const sx = v.x + Math.sin(ang) * (v.r + 6), sy = v.tip - Math.cos(ang) * (v.r + 6);         // just outside the brush border
  const ex = v.x + Math.sin(ang) * (v.r - 40), ey = v.tip - Math.cos(ang) * (v.r - 40);       // inside the capillary
  if (t < tc - 0.6) { const k = (tc - 0.6 - t); return [sx + 30 * Math.sin(i + k) * Math.min(1, k * 0.5) + 60 * hash2(i, 13) * k * 0.4 * Math.sign(Math.sin(ang)), sy - 120 * k - 12 * Math.cos(i * 1.3 + k)]; }
  const k = smooth(seg(t, tc - 0.6, tc + 0.3));
  const p = [lerp(sx, ex, k), lerp(sy, ey, k)];
  if (t > tc + 0.3) { const s = t - tc - 0.3; p[0] += Math.sign(Math.sin(ang) + 1e-3) * s * 18; p[1] += s * 14 + 4 * Math.sin(s * 3 + i); }   // carried along the capillary
  return p;
}
function drawGutWorld(cam, t) {
  gutBG(cam);
  drawVilli(cam, t);
  for (let i = 0; i < 40; i++) { const p = gutDrug(i, t); drugDot(cam, p[0], p[1]); }
}
// ---------------------------------------------------------------- the blood world (um): a small vessel, red cells and drug molecules in plasma
const VES_R = 32;
function drawRBC(cam, x, y, r, tilt, spin) {
  const rx = r * cam.z, ry = Math.max(1.2, r * Math.abs(Math.cos(tilt)) * cam.z), sx = cam.x(x), sy = cam.y(y);
  if (sx < -rx - 4 || sx > W + rx + 4 || sy < -rx - 4 || sy > H + rx + 4) return;
  const m = maskEll(sx, sy, rx, ry, spin); shade(m, P.AR3, P.AR4, P.AR2, P.AR1, { k: Math.max(1, Math.round(cam.z * 0.35)) });
  if (ry > 3) ellipse(sx + rx * 0.08, sy + ry * 0.08, rx * 0.45, ry * 0.45, P.AR2, undefined, spin);   // the central pallor (biconcave)
  if (ry > 3) ellipse(sx - rx * 0.4 * Math.cos(spin), sy - ry * 0.45, Math.max(1, rx * 0.2), Math.max(1, ry * 0.12), P.AR5, undefined, spin);
}
function drawBloodWorld(cam, t) {
  for (let y = 0; y < H; y++) { const wy = cam.wy(y + 0.5); buf.fill(Math.abs(wy) < VES_R ? P.BL1 : mixc(P.N3, P.BG, 0.4), y * W, (y + 1) * W); }
  // the vessel wall: endothelial cells with nuclei, top and bottom
  for (const s of [-1, 1]) {
    const y0 = s * VES_R, y1 = s * (VES_R + 5);
    rect(0, cam.y(Math.min(y0, y1)), W, cam.y(Math.max(y0, y1)), P.MU3);
    rect(0, cam.y(y0) - (s < 0 ? 1 : 0), W, cam.y(y0) + (s < 0 ? 0 : 1), P.MU4);
    for (let k = Math.floor(cam.wx(0) / 26) - 1; k <= Math.floor(cam.wx(W) / 26) + 1; k++) { const x = k * 26 + 8; ellipse(cam.x(x), cam.y(s * (VES_R + 2.5)), 6 * cam.z, 1.6 * cam.z, P.MU1); }
  }
  // red cells and platelets stream along (they move faster than the camera), the drug molecules free in the plasma between them
  const flow = 95;
  for (let i = 0; i < 64; i++) {
    const lane = (hash2(i, 21) - 0.5) * 2 * (VES_R - 6), x = ((hash2(i, 22) * 420 + (t - 10) * flow * (0.85 + 0.3 * (1 - Math.abs(lane) / VES_R))) % 420) - 120;
    drawRBC(cam, x, lane, 4.0, hash2(i, 23) * 3 + t * (0.6 + hash2(i, 24)), hash2(i, 25) * 3);
  }
  for (let i = 0; i < 12; i++) { const lane = (hash2(i, 31) - 0.5) * 50, x = ((hash2(i, 32) * 420 + (t - 10) * flow * 0.9) % 420) - 120; const sx = cam.x(x), sy = cam.y(lane); ball(sx, sy, Math.max(1, 1.1 * cam.z), P.CR2, P.CR3, P.CR1, P.CR0); }
  for (let i = 0; i < 34; i++) { const lane = (hash2(i, 41) - 0.5) * 2 * (VES_R - 3), x = ((hash2(i, 42) * 420 + (t - 10) * flow * 0.92) % 420) - 120 + 2 * Math.sin(t * 3 + i); drugDot(cam, x, lane + 1.5 * Math.sin(t * 2 + i * 2)); }
  // one red cell passes close to the eye (a nearer plane)
  if (t > EV.rbc - 0.6 && t < EV.rbc + 0.6) { const k = (t - EV.rbc) / 0.6, nc = new Cam(cam.cx, cam.cy, cam.z * 1.9); drawRBC(nc, cam.cx - k * 60, cam.cy + 10, 4.2, 0.35, 0.2); }
}
