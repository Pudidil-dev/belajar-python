'use strict';
// ============================================================================
// BLOOD AND HEART MUSCLE (panels 5 and 6). A vessel interior with glossy
// biconcave red cells in three depth layers and orange Tc-99m tracer; then a
// capillary running through cardiac muscle fibres, the tracer crossing into a
// muscle cell, and a magnifier on a mitochondrion where sestamibi gathers.
// ============================================================================
// a red blood cell: a disc of radius R with unit normal (nx, ny, nz) seen from +z; k = depth tint (0 near .. 1 far)
function rbc3(x, y, R, nx, ny, nz, k) {
  if (R < 2) { pset(x, y, P.RB2); return; }
  const tilt = Math.abs(nz), ang = Math.atan2(ny, nx) + Math.PI / 2;
  const rx = R, ry = Math.max(R * 0.18, R * tilt);
  const far = k || 0, base = far > 0.6 ? P.RB1 : P.RB2, lit = far > 0.6 ? P.RB2 : P.RB3, hi = far > 0.6 ? P.RB3 : P.RB4, dark = far > 0.6 ? P.RB0 : P.RB1;
  const m = maskEll(x, y, rx, ry, ang);
  shade(m, base, lit, dark, null, { k: Math.max(1, Math.round(R / 9)), kh: Math.max(1, Math.round(R / 8)) });
  // rim highlight band (upper left) and the central pallor (concave dimple)
  if (tilt > 0.3 && R > 5) {
    ellipse(x + R * 0.05, y + R * 0.06, rx * 0.56, ry * 0.56, dark, 1, ang);
    ellipse(x + R * 0.1, y + R * 0.12, rx * 0.42, ry * 0.4, base, 1, ang);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let a = 3.6; a < 5.4; a += 0.12) { const px = x + (Math.cos(a) * rx * 0.8) * ca - (Math.sin(a) * ry * 0.8) * sa, py = y + (Math.cos(a) * rx * 0.8) * sa + (Math.sin(a) * ry * 0.8) * ca; pset(px, py, hi); if (R > 14) pset(px + 1, py, hi); }
    if (R > 10 && far < 0.6) { const px = x - rx * 0.45 * ca + ry * 0.2 * sa, py = y - rx * 0.45 * sa - ry * 0.2 * ca; disc(px, py, Math.max(1, R * 0.08), P.RB5); }
  } else if (R > 5) {                       // edge-on: pinched middle
    const ca = Math.cos(ang), sa = Math.sin(ang);
    line(x - rx * 0.8 * ca, y - rx * 0.8 * sa - 1, x + rx * 0.8 * ca, y + rx * 0.8 * sa - 1, hi);
  }
}
// ---------------------------------------------------------------- the vessel interior (flow to the right)
const RBCS = [];
for (let i = 0; i < 132; i++) RBCS.push({ x: hash(i + 1100) * 1400, y: (hash(i + 1101) - 0.5) * 320, layer: i < 30 ? 2 : i < 72 ? 1 : 0, R: 0, ph: hash(i + 1102) * TAU, sp: 0.8 + 0.4 * hash(i + 1103), tilt: hash(i + 1104) });
const TRACERS_V = [];
for (let i = 0; i < 9; i++) TRACERS_V.push({ x: hash(i + 1200) * 1400, y: (hash(i + 1201) - 0.5) * 240, ph: hash(i + 1202) * TAU });
function vesselWall(cam, yTop, sgn, t) {
  // layered pink-red wall with streaks (elastic fibres) and a bumpy lining
  const iz = 1 / cam.z, bumpC = new Float32Array(W), phC = new Float32Array(W);
  for (let sx = 0; sx < W; sx++) { const wx = cam.wx(sx + 0.5); bumpC[sx] = 7 * Math.sin(wx * 0.045 + sgn) + 4 * Math.sin(wx * 0.11 + 2); phC[sx] = wx * 0.02 + 3 * Math.sin(wx * 0.006); }
  void iz;
  for (let sy = 0; sy < H; sy++) {
    const wy = cam.wy(sy + 0.5), d = (wy - yTop) * sgn;           // depth into the wall (>0)
    if (d < -14) continue;
    for (let sx = 0; sx < W; sx++) {
      const dd = d + bumpC[sx];
      if (dd < 0) continue;
      const streak = fsin(phC[sx] + dd * 0.35) > 0.55;
      let c = dd < 6 ? P.MY6 : dd < 14 ? P.MY5 : dd < 40 ? (streak ? P.MY5 : P.MY4) : dd < 90 ? (streak ? P.MY4 : P.MY3) : (streak ? P.MY3 : P.MY2);
      if (dd < 6 && bay(sx, sy) < 0.4) c = P.MY7;
      buf[sy * W + sx] = c;
    }
  }
}
function drawVessel(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.RB0);
  // the lumen: plasma haze in depth bands (lighter toward the middle, where light reaches)
  rect(0, 0, W, H, P.MY1, 0.6);
  for (let y = 0; y < H; y++) { const wy = cam.wy(y), d = 1 - Math.abs(wy) / 190; if (d > 0.35) rect(0, y, W, y + 1, P.MY2, (d - 0.35) * 0.9); }
  const flow = o.flow === undefined ? t * 90 : o.flow;
  const span = 1400;
  for (const layer of [0, 1, 2]) {
    const par = [0.45, 0.72, 1][layer], R = [10, 17, 28][layer] * cam.z;
    for (const c of RBCS) {
      if (c.layer !== layer) continue;
      let x = ((c.x + flow * c.sp - cam.cx * par) % span + span) % span - span / 2 + cam.cx * 0;
      const sx = CX + (x) * cam.z, sy = cam.y(c.y * (0.6 + 0.4 * par)) + 6 * Math.sin(t * 1.3 + c.ph);
      if (sx < -40 || sx > W + 40) continue;
      const a = t * 0.9 * c.sp + c.ph, nz = 0.25 + 0.75 * Math.abs(Math.cos(a * 0.6 + c.tilt * 3));
      rbc3(sx, sy, R, Math.cos(a), Math.sin(a), nz, 1 - layer / 2);
    }
    if (layer === 1) for (const tr of TRACERS_V) { let x = ((tr.x + flow * 1.05 - cam.cx * 0.85) % span + span) % span - span / 2; const sx = CX + x * cam.z, sy = cam.y(tr.y) + 5 * Math.sin(t * 2 + tr.ph); if (sx > -20 && sx < W + 20) tracerDot(sx, sy, 3.2 * cam.z, 0.7 + 0.3 * Math.sin(t * 5 + tr.ph), false); }
  }
  vesselWall(cam, -190, -1, t); vesselWall(cam, 190, 1, t);
  // the hero tracer (tracked by the camera)
  if (o.hero) { const [hx, hy] = o.hero; tracerDot(cam.x(hx), cam.y(hy), 5 * cam.z, 0.8 + 0.2 * Math.sin(t * 6), true); }
}
// ---------------------------------------------------------------- capillary through heart muscle (panel 6) + uptake
const CAP = { a: -0.38, w: 34 };                     // capillary axis angle, half width (world units)
function capY(x) { return x * Math.tan(CAP.a) + 18 * Math.sin(x * 0.012); }
function drawMyocardium(cam, t, o) {
  o = o || {};
  drawMuscle(cam, t, { ang: -0.38, pitch: 62 });
  // the capillary: a pink tube with red cells in single file
  const iz = 1 / cam.z, cy0 = new Float32Array(W), cosA = Math.cos(CAP.a);
  for (let sx = 0; sx < W; sx++) cy0[sx] = capY(cam.wx(sx + 0.5));
  for (let sy = 0; sy < H; sy++) {
    const wy = cam.wy(sy + 0.5);
    for (let sx = 0; sx < W; sx++) {
      const ad = Math.abs((wy - cy0[sx]) * cosA);
      if (ad > CAP.w + 6) continue;
      let c = ad > CAP.w ? P.MY7 : ad > CAP.w - 6 ? P.MY6 : P.MY2;
      if (ad <= CAP.w - 6 && bay(sx, sy) < 0.25) c = P.MY3;
      buf[sy * W + sx] = c;
    }
  }
  void iz;
  const flow = t * 60;
  for (let k = 0; k < 14; k++) { const x = ((k * 140 + flow) % 1960 + 1960) % 1960 - 980, y = capY(x); if (Math.abs(cam.x(x) - CX) > W) continue; rbc3(cam.x(x), cam.y(y), 22 * cam.z, Math.cos(x * 0.02), Math.sin(x * 0.02), 0.25 + 0.6 * Math.abs(Math.sin(x * 0.013 + k)), 0); }
  // accumulated tracer in the muscle (time-lapse: lights up progressively), with faint links (panel 6)
  const acc = o.acc || 0;
  if (acc > 0) {
    const pts = [];
    for (let k = 0; k < 60; k++) { const x = (hash(k + 1300) - 0.5) * 900, y = (hash(k + 1301) - 0.5) * 900; if (Math.abs(y - capY(x)) < CAP.w + 30) continue; if (hash(k + 1302) > acc) continue; pts.push([x, y, k]); }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const [x1, y1] = pts[i], [x2, y2] = pts[j]; if (Math.hypot(x2 - x1, y2 - y1) < 130) dashLine(cam.x(x1), cam.y(y1), cam.x(x2), cam.y(y2), P.OR2, 2, 3, t * 10); }
    for (const [x, y, k] of pts) tracerDot(cam.x(x), cam.y(y), Math.max(1, 3.6 * cam.z), 0.6 + 0.4 * Math.sin(t * 4 + k), false);
  }
  if (o.hero) { const [hx, hy] = o.hero; tracerDot(cam.x(hx), cam.y(hy), 5 * cam.z, 0.8 + 0.2 * Math.sin(t * 6), true); }
}
// the magnifier inset: a mitochondrion (double membrane, cristae) with sestamibi gathering on it
function mitoInset(cx, cy, r, t, k) {
  if (r < 3) return;
  disc(cx, cy, r + 3, P.SH); disc(cx, cy, r + 2, P.LBL);
  const m = maskDisc(cx, cy, r);
  mFill(m, P.MY3); for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.d[j * m.w + i] && bay(m.x0 + i, m.y0 + j) < 0.3) pset(m.x0 + i, m.y0 + j, P.MY4);
  // the mitochondrion (bean shape) inside the inset
  const mx = cx, my = cy, rx = r * 0.68, ry = r * 0.4, rot = -0.3;
  const outer = maskEll(mx, my, rx, ry, rot), inner = maskEll(mx, my, rx * 0.86, ry * 0.76, rot);
  for (let j = 0; j < outer.h; j++) for (let i = 0; i < outer.w; i++) {
    if (!outer.d[j * outer.w + i]) continue; const x = outer.x0 + i, y = outer.y0 + j; if (!m.get(x, y)) continue;
    pset(x, y, inner.get(x, y) ? P.OR1 : P.MY6);
  }
  // cristae (folds of the inner membrane)
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let q = -3; q <= 3; q++) {
    const u = q * rx * 0.24, h = ry * (0.62 - 0.06 * Math.abs(q)), sg = q % 2 ? 1 : -1;
    const x0 = mx + u * ca - sg * h * sa, y0 = my + u * sa + sg * h * ca, x1 = mx + u * ca + sg * h * 0.1 * sa, y1 = my + u * sa - sg * h * 0.1 * ca;
    lineW(x0, y0, x1, y1, Math.max(1, r * 0.06), P.MY6);
  }
  // membrane potential (negative inside) and the gathering tracer
  for (let q = 0; q < 6; q++) { const a = q * TAU / 6 + 0.3, px = mx + Math.cos(a) * rx * 0.92 * ca - Math.sin(a) * ry * 0.92 * sa, py = my + Math.cos(a) * rx * 0.92 * sa + Math.sin(a) * ry * 0.92 * ca; text(FS, '-', px - 2, py - 3, { sc: 1, c: P.INK, ol: P.SH }); }
  for (let q = 0; q < 12; q++) {
    if (q / 12 > k) continue;
    const a = hash(q + 1400) * TAU, rr = 0.25 + 0.6 * hash(q + 1401), px = mx + Math.cos(a) * rx * rr, py = my + Math.sin(a) * ry * rr;
    tracerDot(px, py, Math.max(1.5, r * 0.06), 0.7 + 0.3 * Math.sin(t * 6 + q), false);
  }
}
