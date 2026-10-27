'use strict';
// ============================================================================
// INSIDE ONE PHOTOMULTIPLIER TUBE (panels 16, 17, 18), standing the way it
// sits in the head: the glass window at the bottom (facing the light guide),
// the violet photocathode on its inner face, the evacuated tube, a focusing
// electrode, a staggered chain of dynodes held at rising voltages by a
// divider, and the anode at the top; a cable carries the pulse to a scope.
// World units: 1 = 1 px at zoom 1, y down (screen convention).
// ============================================================================
const PMT = { hw: 112, win0: 572, win1: 600, pc: 560, top: -300, foc: 470 };
// dynode centres and which way their cups face (+1 = open to the right)
const DYN = [[56, 388, -1], [-56, 300, 1], [56, 212, -1], [-56, 124, 1], [56, 36, -1], [-56, -52, 1]];
const ANODE = { x: 20, y: -150, w: 70 };
const DYN_V = ['+100 V', '+200 V', '+300 V', '+400 V', '+500 V', '+600 V'];
const SCOPE = { x: 10, y: -560, w: 150, h: 104 };
// where electrons land on / leave dynode k (the inner face of its cup)
function dynFace(k) { const d = DYN[k]; return [d[0] - d[2] * 5, d[1]]; }
// ---------------------------------------------------------------- the tube
function pmtBody(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.K0);
  const X = cam.x.bind(cam), Y = cam.y.bind(cam), z = cam.z;
  // background: the neighbouring tubes and the board, dim (where we are)
  for (const sx of [-1, 1]) {
    const bx = sx * (PMT.hw * 2 + 60);
    rect(X(bx - PMT.hw), Y(PMT.top), X(bx + PMT.hw), Y(PMT.win1), P.N1);
    rect(X(bx - PMT.hw), Y(PMT.top), X(bx - PMT.hw + 18), Y(PMT.win1), P.N2);
    rect(X(bx + PMT.hw - 30), Y(PMT.top), X(bx + PMT.hw - 22), Y(PMT.win1), P.N2);
  }
  rect(0, Y(PMT.win1 + 8), W, Y(PMT.win1 + 70), P.LG0); rect(0, Y(PMT.win1 + 8), W, Y(PMT.win1 + 10), P.LG2);        // the light guide underneath
  for (let x = -600; x < 600; x += 46) rect(X(x), Y(PMT.win1 + 10), X(x + 2), Y(PMT.win1 + 70), P.LG1);
  // vacuum interior with faint specks
  const x0 = X(-PMT.hw), x1 = X(PMT.hw), y0 = Y(PMT.top), y1 = Y(PMT.pc);
  rect(x0, y0, x1, y1, P.K0);
  for (let i = 0; i < 90; i++) { const px = X(lerp(-PMT.hw + 6, PMT.hw - 6, hash(i + 3100))), py = Y(lerp(PMT.top + 10, PMT.pc - 6, hash(i + 3101))); if (Math.sin(t * 1.3 + i * 2.7) > 0.2) pset(px, py, i % 3 ? P.N4 : P.EL1); }
  // glass walls: dark glass, light inner edge, a reflection stripe
  for (const s of [-1, 1]) {
    const wx = X(s * PMT.hw), wo = X(s * (PMT.hw + 10));
    rect(Math.min(wx, wo), y0, Math.max(wx, wo), Y(PMT.win1), P.PM2);
    rect(s < 0 ? wx - 2 : wx, y0, s < 0 ? wx : wx + 2, Y(PMT.win1), P.LG3);
    rect(s < 0 ? wo : wo - 2, y0, s < 0 ? wo + 2 : wo, Y(PMT.win1), P.PM1);
    rect(Math.min(wx, wo) + 4 * z, y0, Math.min(wx, wo) + 6 * z, Y(PMT.win1), P.PM4, 0.5);
  }
  // the window (thick glass) and the photocathode on its inner face
  rect(X(-PMT.hw - 10), Y(PMT.win0), X(PMT.hw + 10), Y(PMT.win1), P.PM3);
  rect(X(-PMT.hw - 10), Y(PMT.win0), X(PMT.hw + 10), Y(PMT.win0) + Math.max(1, 2 * z), P.PM5);
  for (let i = 0; i < 9; i++) { const gx = X(-PMT.hw + 20 + i * 26); line(gx, Y(PMT.win1) - 2, gx + 6 * z, Y(PMT.win0) + 3, P.PM4); }
  const pcG = o.pcGlow || 0;
  rect(X(-PMT.hw), Y(PMT.pc), X(PMT.hw), Y(PMT.win0), P.PC1);
  rect(X(-PMT.hw), Y(PMT.pc) + Math.max(1, 3 * z), X(PMT.hw), Y(PMT.win0), P.PC2, 0.5);
  rect(X(-PMT.hw), Y(PMT.pc), X(PMT.hw), Y(PMT.pc) + Math.max(1, 1.5 * z), P.PC4);
  if (pcG > 0) { const gx = X(o.pcX || 0), gy = Y(PMT.pc + 5); glow(gx, gy, 34 * z * pcG, P.PC2, P.PC3, pcG); disc(gx, gy, 5 * z * pcG, P.C6); }
  // focusing electrode: two angled plates above the cathode
  for (const s of [-1, 1]) { const a = [X(s * PMT.hw * 0.92), Y(PMT.foc + 40)], b = [X(s * 34), Y(PMT.foc)]; lineW(a[0], a[1], b[0], b[1], Math.max(2, 7 * z), P.PM3); line(a[0], a[1] - 3 * z, b[0], b[1] - 3 * z, P.PM5); }
  // voltage divider column (right wall): the bias supply feeds every dynode
  const dvx = X(PMT.hw + 34);
  if (o.divider !== false) {
    rect(dvx - 1, Y(ANODE.y - 30), dvx + 1, Y(PMT.pc + 10), P.N5);
    DYN.forEach((d, k) => {
      const yy = Y(d[1]), ry = Y(d[1] + 44);
      for (let s = 0; s < 6; s++) line(dvx + (s % 2 ? 4 : -4) * z, lerp(yy, ry, s / 6) + 4 * z, dvx + (s % 2 ? -4 : 4) * z, lerp(yy, ry, (s + 1) / 6) + 4 * z, P.G3);
      line(X(PMT.hw + 10), yy, dvx, yy, P.N5); rect(dvx - 2, yy - 2, dvx + 2, yy + 2, P.SUB);
    });
  }
  // dynodes: thick silver cups with a purple sheen, the active face lit when hit
  DYN.forEach((d, k) => dynodeSprite(cam, d[0], d[1], d[2], o.dynHit ? o.dynHit[k] || 0 : 0));
  // anode: a grid plate near the top, then the pins
  const ax = X(ANODE.x), ay = Y(ANODE.y), aw = ANODE.w * z;
  rect(ax - aw, ay - 4 * z, ax + aw, ay + 4 * z, P.PM4); rect(ax - aw, ay - 4 * z, ax + aw, ay - 2 * z, P.PM5); rect(ax - aw, ay + 2 * z, ax + aw, ay + 4 * z, P.PM2);
  for (let i = -3; i <= 3; i++) rect(ax + i * aw / 3.5 - 1, ay - 4 * z, ax + i * aw / 3.5 + 1, ay + 4 * z, P.PM2);
  if (o.anodeGlow > 0) { glow(ax, ay, 60 * z * o.anodeGlow, P.EL1, P.EL2, o.anodeGlow); rect(ax - aw, ay - 4 * z, ax + aw, ay + 4 * z, P.EL3, o.anodeGlow); }
  // top cap with pins
  rect(X(-PMT.hw - 10), Y(PMT.top - 26), X(PMT.hw + 10), Y(PMT.top), P.PM2); rect(X(-PMT.hw - 10), Y(PMT.top - 26), X(PMT.hw + 10), Y(PMT.top - 22), P.PM4);
  for (let i = -4; i <= 4; i++) { const px = X(i * 22); rect(px - 1.5 * z, Y(PMT.top - 60), px + 1.5 * z, Y(PMT.top - 26), i === 1 ? P.GA3 : P.PM4); }
}
function dynodeShape(cx, cy, R, w, dir, z) {     // C-shaped cup, concave side facing dir (+1 = right)
  const out = [], inn = [], off = dir * R * 0.55;
  for (let i = 0; i <= 20; i++) { const a = (dir > 0 ? Math.PI - 1.15 : -1.15) + 2.3 * i / 20; out.push(cx + off + Math.cos(a) * R, cy + Math.sin(a) * R * 0.92); }
  for (let i = 20; i >= 0; i--) { const a = (dir > 0 ? Math.PI - 1.15 : -1.15) + 2.3 * i / 20; inn.push(cx + off + Math.cos(a) * (R - w), cy + Math.sin(a) * (R - w) * 0.92); }
  return out.concat(inn);
}
function dynodeSprite(cam, wx, wy, dir, hit) {
  const z = cam.z, cx = cam.x(wx), cy = cam.y(wy), R = 46 * z, w = 17 * z;
  if (cx < -R * 2 || cx > W + R * 2 || cy < -R * 2 || cy > H + R * 2) return;
  // mounting rod to the tube wall
  const wallX = cam.x(-dir * PMT.hw);
  lineW(wallX, cy, cx - dir * R * 0.2, cy, Math.max(1, 3 * z), P.PM1);
  // depth (the side of the cup), then the face
  const back = maskPoly(dynodeShape(cx + 5 * z * -dir, cy + 5 * z, R, w, dir, z)); mFill(back, P.PM1); mFill(back, P.DY1, 0.5); mOutline(back, P.PM0);
  const m = maskPoly(dynodeShape(cx, cy, R, w, dir, z)); if (m.empty()) return;
  mFill(m, P.PM3); mFill(m, P.DY2, 0.3);
  for (let s = 1; s <= Math.max(1, Math.round(3 * z)); s++) mRim(m, s < 2 ? P.PM5 : P.PM4, dir * s, 0);   // the lit concave surface
  mRim(m, P.PM5, 0, 1); mRim(m, P.DY1, -dir, 0); mRim(m, P.PM2, -dir * 2, 0, 0.6); mOutline(m, P.PM0);
  if (hit > 0) {
    const fx = cam.x(wx - dir * 5), fy = cy;
    glow(fx, fy, 30 * z * hit, P.EL1, P.EL2, hit);
    for (let s = 1; s <= 2; s++) mRim(m, P.EL3, dir * s, 0, hit);
  }
}
// a bundle of electron paths from point A to point B (quadratic arcs that bow toward the axis), n visible tracks
function electronBundle(cam, A, B, n, k, spread, seed, t) {
  if (k <= 0) return;
  const z = cam.z, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  const tracks = [];
  for (let i = 0; i < n; i++) {
    const ja = (hash(seed + i) - 0.5) * spread, jb = (hash(seed + i + 40) - 0.5) * spread * 1.8, jc = (hash(seed + i + 80) - 0.5) * spread;
    const ax = A[0], ay = A[1] + ja * 0.6, bx = B[0], by = B[1] + jb, cx = mx + jc, cy = my - 26 + jc * 0.4;
    const lag = hash(seed + i + 120) * 0.25, kk = clamp((k - lag) / (1 - lag * 0.8), 0, 1); if (kk <= 0) continue;
    const pts = []; const steps = 16;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps * kk, e = u * u * (1.6 - 0.6 * u);                 // accelerating toward the next dynode
      pts.push(cam.x((1 - e) * (1 - e) * ax + 2 * (1 - e) * e * cx + e * e * bx), cam.y((1 - e) * (1 - e) * ay + 2 * (1 - e) * e * cy + e * e * by));
    }
    tracks.push([pts, kk]);
  }
  for (const [pts] of tracks) for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], Math.max(2, 3.2 * z), P.EL1, 0.45);
  for (const [pts] of tracks) for (let i = 0; i + 3 < pts.length; i += 2) line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], i > pts.length - 10 ? P.EL3 : P.EL2);
  for (const [pts, kk] of tracks) if (kk < 1) { const n2 = pts.length; disc(pts[n2 - 2], pts[n2 - 1], Math.max(1.5, 2.6 * z), P.EL2); pset(pts[n2 - 2], pts[n2 - 1], P.C6); }
}
// the scope (s18): a small CRT with a green grid and the pulse; k draws the trace, amp scales it
function scopeSprite(cam, t, k, amp) {
  const z = cam.z, x0 = cam.x(SCOPE.x - SCOPE.w / 2), y0 = cam.y(SCOPE.y - SCOPE.h / 2), x1 = cam.x(SCOPE.x + SCOPE.w / 2), y1 = cam.y(SCOPE.y + SCOPE.h / 2);
  rect(x0 - 8 * z, y0 - 8 * z, x1 + 8 * z, y1 + 22 * z, P.G4); rect(x0 - 8 * z, y0 - 8 * z, x1 + 8 * z, y0 - 5 * z, P.G2);
  rect(x0 - 8 * z, y1 + 19 * z, x1 + 8 * z, y1 + 22 * z, P.G6);
  rect(x0, y0, x1, y1, P.SG0);
  for (let i = 1; i < 6; i++) { const gx = lerp(x0, x1, i / 6); for (let y = y0; y < y1; y += 3) pset(gx, y, P.SG1); }
  for (let j = 1; j < 4; j++) { const gy = lerp(y0, y1, j / 4); for (let x = x0; x < x1; x += 3) pset(x, gy, P.SG1); }
  for (let i = 0; i < 3; i++) disc(x0 + (14 + i * 12) * z, y1 + 11 * z, 3 * z, i === 0 ? P.SG2 : P.G3);
  // the trace: baseline, fast rise, exponential decay (NaI(Tl) light ~0.25 us), slight undershoot
  const base = lerp(y1, y0, 0.22), pts = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80; if (u > k) break;
    const tt = (u - 0.3) * 10;
    let v = tt < 0 ? 0 : tt < 0.25 ? tt / 0.25 : Math.exp(-(tt - 0.25) / 1.1) - 0.08 * Math.exp(-(tt - 3) * (tt - 3));
    v *= amp * (1 + 0.02 * Math.sin(i * 7 + t * 40));
    pts.push(lerp(x0 + 3, x1 - 3, u), base - v * (y1 - y0) * 0.66);
  }
  for (let i = 0; i + 3 < pts.length; i += 2) { lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 3, P.SG1); }
  for (let i = 0; i + 3 < pts.length; i += 2) line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], P.SG2);
  if (pts.length > 2) { const n = pts.length; glow(pts[n - 2], pts[n - 1], 6 * z, P.SG1, P.SG3, 0.8); }
}
// the cable from the anode pin up to the scope
function pmtCable(cam, k) {
  const pts = [cam.x(22), cam.y(PMT.top - 60), cam.x(30), cam.y(PMT.top - 140), cam.x(120), cam.y(-430), cam.x(SCOPE.x + SCOPE.w / 2 + 8), cam.y(SCOPE.y + 10)];
  const sp = spline(pts, 8, false);
  for (let i = 0; i + 3 < sp.length; i += 2) lineW(sp[i], sp[i + 1], sp[i + 2], sp[i + 3], Math.max(2, 5 * cam.z), P.G5);
  for (let i = 0; i + 3 < sp.length; i += 2) line(sp[i], sp[i + 1], sp[i + 2], sp[i + 3], P.G3);
  if (k > 0 && k < 1) { const n = sp.length / 2 - 1, i = Math.floor(k * n); const x = sp[2 * i], y = sp[2 * i + 1]; glow(x, y, 9 * cam.z + 4, P.SG1, P.SG2, 1); disc(x, y, 2 + 2 * cam.z, P.SG3); }
  return sp;
}
