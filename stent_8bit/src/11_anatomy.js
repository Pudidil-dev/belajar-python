'use strict';
// ============================================================================
// Anatomy & lab worlds: beating heart with coronary arteries, top-down cath
// lab, radial-access wrist cutaway, catheter route map, X-ray angiography,
// stent strut close-up, drug-eluting coating close-up.
// ============================================================================
function spline(ctrl, per) { // closed Catmull-Rom
  const n = ctrl.length / 2, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = (i - 1 + n) % n, p1 = i, p2 = (i + 1) % n, p3 = (i + 2) % n;
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push(f(ctrl[2 * p0], ctrl[2 * p1], ctrl[2 * p2], ctrl[2 * p3]), f(ctrl[2 * p0 + 1], ctrl[2 * p1 + 1], ctrl[2 * p2 + 1], ctrl[2 * p3 + 1]));
    }
  }
  return out;
}
const HEART_OUT = spline([-30, -62, 10, -66, 46, -56, 70, -30, 82, 8, 78, 46, 62, 78, 46, 96, 24, 92, -6, 74, -38, 50, -62, 18, -72, -16, -62, -46], 8);
const CORO = { // heart-local polylines (proximal -> distal), width
  LAD: [[16, -50, 18, -30, 18.7, -18, 19, -6, 24, 20, 34, 50, 44, 78, 46, 92], 3.2],
  D1: [[19, -2, 40, 6, 58, 22, 66, 34], 2],
  D2: [[27, 30, 50, 42, 64, 58], 1.8],
  LCX: [[16, -50, 38, -50, 60, -38, 76, -12, 80, 12], 2.8],
  OM: [[66, -30, 74, -4, 72, 24], 1.8],
  RCA: [[-10, -58, -36, -50, -56, -30, -66, 0, -58, 34, -34, 62, -10, 78], 3],
  AM: [[-62, 14, -40, 30, -22, 40], 1.8],
  LM: [[4, -58, 16, -50], 3.4],
};
const L_H = [18.7, -18];       // lesion on the proximal-mid LAD (vertical there)
const HEART_C = [6, 14];
function beatAt(t) { // systolic squeeze at every half-bar (64 bpm, locked to the 128 BPM grid)
  const b = 2 * BEAT, ph = ((t % b) + b) % b / b;
  return ph < 0.12 ? smooth(ph / 0.12) : ph < 0.4 ? 1 - smooth((ph - 0.12) / 0.28) : 0;
}
function heartXf(view, beat) {
  const kx = 1 - 0.035 * beat, ky = 1 - 0.028 * beat;
  return (lx, ly) => [view.ox + (HEART_C[0] + (lx - HEART_C[0]) * kx) * view.s, view.oy + (HEART_C[1] + (ly - HEART_C[1]) * ky) * view.s];
}
// opt: beat, lesion 'narrow'|'open', perf 0..1, hl, flow 0..1 (dots), t
function drawHeart(view, t, opt) {
  opt = opt || {};
  const beat = opt.beat === undefined ? beatAt(t) : opt.beat, X = heartXf(view, beat), s = view.s;
  const tubeL = (pts, w, c0, c1, c2) => {
    const q = []; for (let i = 0; i < pts.length; i += 2) { const p = X(pts[i], pts[i + 1]); q.push(p[0], p[1]); }
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * s + 2), c0);
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * s), c1);
    if (c2 !== undefined && w * s > 2) for (let i = 0; i + 3 < q.length; i += 2) line(q[i] - w * s * 0.25, q[i + 1] - w * s * 0.2, q[i + 2] - w * s * 0.25, q[i + 3] - w * s * 0.2, c2);
    return q;
  };
  // great vessels behind the heart
  tubeL([30, -40, 26, -78, 16, -104, -2, -110, -22, -100, -30, -82], 16, P.PA1 === undefined ? P.N4 : P.HM0, P.PA1, P.PA2);
  tubeL([-6, -50, -10, -96, 0, -122, 26, -128, 50, -118, 58, -96], 20, P.AW0, P.AW2, P.AW3);
  // myocardium
  const pts = []; for (let i = 0; i < HEART_OUT.length; i += 2) { const p = X(HEART_OUT[i], HEART_OUT[i + 1]); pts.push(p[0], p[1]); }
  const m = maskPoly(pts);
  shade(m, P.HM2, P.HM3, P.HM1, P.HM0, { k: Math.max(1, Math.round(s * 2)) });
  // right ventricle facet (two-tone) + interventricular groove shading
  const rv = []; for (const [x, y] of [[-70, -14], [-60, 20], [-36, 50], [-4, 74], [22, 90], [24, 20], [18, -40], [-20, -56]]) { const p = X(x, y); rv.push(p[0], p[1]); }
  mFill(maskPoly(rv), P.HM1, 0.35);
  // downstream LV wall: reduced or restored supply (illustrative)
  if (opt.perf !== undefined) {
    const zone = []; for (const [x, y] of [[20, -12], [62, 10], [74, 40], [60, 76], [44, 92], [26, 70], [21, 20]]) { const p = X(x, y); zone.push(p[0], p[1]); }
    const zm = maskPoly(zone);
    if (opt.perf < 1) mFill(zm, P.HM0, 0.45 * (1 - opt.perf));
    if (opt.perf > 0.5) mFill(zm, P.HM4, 0.22 * (opt.perf - 0.5) * 2 * (0.6 + 0.4 * beat));
  }
  // coronary arteries on the surface
  const qs = {};
  for (const k of ['RCA', 'AM', 'LCX', 'OM', 'D2', 'D1', 'LAD', 'LM']) qs[k] = tubeL(CORO[k][0], CORO[k][1], P.AW0, P.AW2, P.AW3);
  const [lx, ly] = X(L_H[0], L_H[1]);
  if (opt.lesion === 'narrow') { rect(lx - 2 * s, ly - 4 * s, lx - 0.4 * s, ly + 4 * s, P.PQ2); rect(lx + 0.6 * s, ly - 3 * s, lx + 2 * s, ly + 3 * s, P.PQ2); }
  if (opt.lesion === 'open') { rect(lx - 1.8 * s, ly - 4.5 * s, lx + 1.8 * s, ly + 4.5 * s, P.ST2, 0.6); }
  if (opt.hl) { const r = (9 + 2 * Math.sin(t * 8)) * Math.max(1, s * 0.5); ring(lx, ly, r, 1, P.INK, opt.hl); ring(lx, ly, r + 3, 1, P.AW4, 0.5 * opt.hl); }
  // blood flow dots along the arteries
  if (opt.flow > 0) for (const k of ['LM', 'LAD', 'D1', 'D2', 'LCX', 'OM', 'RCA', 'AM']) {
    const q = qs[k]; const path = new Path(q); const n = Math.max(2, Math.floor(path.L / 9));
    for (let i = 0; i < n; i++) {
      let u = ((i / n) + t * 0.55 * (k === 'LAD' || k === 'D1' || k === 'D2' ? opt.flow : 1)) % 1;
      if (k === 'LAD' && opt.lesion === 'narrow' && u > 0.25 && hash(i * 7) > 0.45) continue;
      const [x, y] = path.at(u * path.L); rect(x - 0.5, y - 0.5, x + 1.5, y + 1.5, P.AW5);
    }
  }
}
// ---------------------------------------------------------------- cath lab (top-down)
const LAB = { heartC: [8, -40], HL: 0.2316, wrist: [-98, 126] };
const labHeartView = (cam) => ({ ox: cam.x(LAB.heartC[0]), oy: cam.y(LAB.heartC[1]), s: cam.z * LAB.HL });
function drawLab(cam, t, opt) {
  opt = opt || {};
  const z = cam.z, R = (x0, y0, x1, y1, r) => maskRR(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), r * z);
  clear(P.N1);
  const g = 40 * z; if (g > 6) { const ox = ((cam.x(0) % g) + g) % g, oy = ((cam.y(0) % g) + g) % g; for (let x = ox; x < W; x += g) rect(x, 0, x + 1, H, P.N2); for (let y = oy; y < H; y += g) rect(0, y, W, y + 1, P.N2); }
  // instrument table
  shade(R(-205, 100, -150, 200, 4), P.C3, P.C4, P.C2, P.C0);
  for (let i = 0; i < 4; i++) rect(cam.x(-198 + i * 12), cam.y(112), cam.x(-192 + i * 12), cam.y(170), i % 2 ? P.CA2 : P.ST2);
  // procedure table + arm board
  shade(R(-62, -175, 62, 340, 8), P.C1, P.C2, P.C0, P.K0, { k: 2 });
  shade(R(-122, 40, -60, 160, 6), P.C1, P.C2, P.C0, P.K0);
  // patient: gown, head, arms
  shade(R(-56, -98, 56, 210, 22), P.N5, P.N6, P.N4, P.N3, { k: 2 });
  shade(R(-40, 200, 40, 330, 14), P.N5, P.N6, P.N4, P.N3);
  shade(maskDisc(cam.x(0), cam.y(-128), 23 * z), P.SK2, P.SK3, P.SK1, P.SK0, { k: 2 });
  shade(maskEll(cam.x(0), cam.y(-140), 21 * z, 12 * z), P.N2, P.N3, P.N1, P.K0);
  const arm = (pts, w) => { const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w * z + 2, P.SK0); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w * z, P.SK2); };
  arm([-52, -82, -78, 0, -92, 70, -98, 126], 16); arm([52, -82, 62, 20, 66, 126], 16);
  shade(maskDisc(cam.x(-100), cam.y(142), 10 * z), P.SK2, P.SK3, P.SK1, P.SK0); shade(maskDisc(cam.x(67), cam.y(140), 10 * z), P.SK2, P.SK3, P.SK1, P.SK0);
  // sterile drape window at the wrist
  shade(R(-112, 96, -84, 138, 3), P.TL1, P.TL2, P.TL0, P.TL0);
  rect(cam.x(-102), cam.y(110), cam.x(-94), cam.y(126), P.SK2);
  if (opt.sheath) { const q = cam.pts([-98, 118, -92, 104]); lineW(q[0], q[1], q[2], q[3], Math.max(1, 3 * z), P.CA2); }
  // chest window with the beating heart
  if (opt.heart !== false) {
    const hc = cam.pts(LAB.heartC), r = 36 * z;
    const HB = SPARE[1]; HB.fill(P.HM0);  // draw the heart, keep it only inside the chest window
    withBuffer(HB, () => drawHeart(labHeartView(cam), t, { lesion: opt.lesion || 'narrow', perf: opt.perf, hl: opt.hl, flow: opt.flow }));
    const m = maskDisc(hc[0], hc[1], r);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { if (!m.d[j * m.w + i]) continue; const x = m.x0 + i, y = m.y0 + j; if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = HB[y * W + x]; }
    ring(hc[0], hc[1], r, Math.max(1, 1.5 * z), P.C4, 0.8);
  }
  // C-arm: flat-panel detector over the chest + the arc
  const ca = opt.carm === false ? 0 : 1;
  if (ca) {
    const arc = []; for (let i = 0; i <= 24; i++) { const a = -1.75 + i / 24 * 3.5; arc.push(70 + Math.cos(a) * 70, -40 + Math.sin(a) * 70); }
    const q = cam.pts(arc);
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], 18 * z + 2, P.C0);
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], 18 * z, P.C3);
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i] - 3 * z, q[i + 1], q[i + 2] - 3 * z, q[i + 3], 4 * z, P.C4);
    if (opt.detector !== false) { shade(R(-44, -84, 44, -64, 3), P.C2, P.C3, P.C1, P.C0); }
    shade(maskDisc(cam.x(140), cam.y(-40), 22 * z), P.C2, P.C3, P.C1, P.C0);
  }
  // monitor boom (top right)
  for (let i = 0; i < 4; i++) {
    const x0 = 86 + (i % 2) * 52, y0 = -232 + Math.floor(i / 2) * 40;
    shade(R(x0, y0, x0 + 48, y0 + 34, 2), P.C0, P.C1, P.K0, P.K0);
    rect(cam.x(x0 + 4), cam.y(y0 + 4), cam.x(x0 + 44), cam.y(y0 + 30), i === 0 ? P.XR3 : P.N3);
    if (i === 0) for (let k = 0; k < 5; k++) line(cam.x(x0 + 10 + k * 6), cam.y(y0 + 8), cam.x(x0 + 14 + k * 5), cam.y(y0 + 26), P.XR1);
  }
  // interventional cardiologist (top-down: cap, shoulders, arms to the wrist)
  const dx = -142, dy = 92;
  const armq = cam.pts([dx + 10, dy + 6, -112, 118, dx + 14, dy - 8, -110, 104]);
  lineW(armq[0], armq[1], armq[2], armq[3], 7 * z, P.TL1); lineW(armq[4], armq[5], armq[6], armq[7], 7 * z, P.TL1);
  shade(maskEll(cam.x(dx), cam.y(dy), 20 * z, 30 * z, 0.3), P.TL2, P.TL3, P.TL1, P.TL0, { k: 2 });
  shade(maskDisc(cam.x(dx - 2), cam.y(dy), 11 * z), P.TL1, P.TL2, P.TL0, P.TL0);
  shade(maskDisc(cam.x(-110), cam.y(116), 4 * z), P.C5, P.C6, P.C3, P.C1); shade(maskDisc(cam.x(-108), cam.y(102), 4 * z), P.C5, P.C6, P.C3, P.C1);
}
// ---------------------------------------------------------------- wrist cutaway (side view)
function drawWrist(cam, t, st) {
  const z = cam.z;
  clear(P.N1);
  const Y = v => cam.y(v);
  rect(0, Y(-90), W, Y(-80), P.SK3); rect(0, Y(-80), W, Y(-72), P.SK2);
  for (let y = Math.max(0, Math.floor(Y(-72))); y < Math.min(H, Y(-28)); y++) for (let x = 0; x < W; x++) buf[y * W + x] = bay(x, y) < 0.3 ? P.SK3 : P.SK2;
  rect(0, Y(-28), W, Y(140), P.MU1);
  for (let i = 0; i < 18; i++) { const yy = Y(30 + i * 7); line(0, yy, W, yy + 3, P.MU0, 0.5); }
  rect(0, Y(-92), W, Y(-90), P.SK0);
  // radial artery
  rect(0, Y(-22), W, Y(22), P.AW1); rect(0, Y(-21), W, Y(-17), P.AW3); rect(0, Y(17), W, Y(21), P.AW2);
  rect(0, Y(-16), W, Y(16), P.BL1);
  for (let i = 0; i < 26; i++) {
    const x = ((hash(i * 3) * 600 + t * 120) % 600) - 300, y = (hash(i * 7) - 0.5) * 22;
    drawRBC(cam.x(x), Y(y), z * 0.9, 0.2, i + t * 3, 1);
  }
  // local anaesthetic needle
  const an = st.anaes || 0;
  if (an > 0 && an < 1) {
    const k = Math.sin(an * Math.PI), tipx = 74 - 14 * k, tipy = -92 + 18 * k;
    lineW(cam.x(tipx + 50), Y(tipy - 40), cam.x(tipx), Y(tipy), 1.2, P.GW1);
    shade(maskRR(cam.x(tipx + 50), Y(tipy - 48), cam.x(tipx + 90), Y(tipy - 32), 2), P.C4, P.C5, P.C2, P.C0);
    for (let i = 0; i < 5; i++) disc(cam.x(tipx + (hash(i) - 0.5) * 16), Y(tipy + 4 + hash(i * 3) * 10), 1.4 * z * k, P.MC2, 0.8);
  }
  // introducer sheath: outside -> through the skin -> into the lumen, pointing toward the heart (left)
  const k = st.sheath || 0;
  if (k > 0) {
    const path = new Path([180, -150, 40, -84, -20, -8, -260, -4]);
    const tip = 60 + k * (path.L - 60);
    const q = cam.pts(path.sub(0, tip, 3));
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], 9 * z + 2, P.CA0);
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], 9 * z, P.CA1);
    for (let i = 0; i + 3 < q.length; i += 2) line(q[i], q[i + 1] - 2 * z, q[i + 2], q[i + 3] - 2 * z, P.CA3);
    const hb = cam.pts([180, -150]); shade(maskRR(hb[0] - 10 * z, hb[1] - 16 * z, hb[0] + 18 * z, hb[1] + 6 * z, 3 * z), P.CA2, P.CA3, P.CA1, P.CA0);
    lineW(hb[0] + 12 * z, hb[1] - 10 * z, hb[0] + 40 * z, hb[1] - 30 * z, 3 * z, P.CA2);
    if (st.click) { const [tx, ty] = path.at(tip); ring(cam.x(tx), cam.y(ty), 10 + 10 * st.click, 1, P.INK, 1 - st.click); }
  }
}
// ---------------------------------------------------------------- catheter route map
const ROUTE = new Path([-124, 150, -121, 60, -119, 20, -110, -60, -95, -110, -60, -132, -22, -122, -4, -130, 8, -122, 6, -100, 3, -84, 10, -80, 16, -72]);
const MAP_HEART = { ox: 4, oy: -50, s: 0.42 };
function drawMap(cam, t, prog) {
  const z = cam.z;
  clear(P.BG);
  const body = cam.pts([-95, -150, -40, -168, 40, -168, 95, -150, 104, -100, 80, 130, -80, 130, -104, -100]);
  poly(body, P.N2); polyline(body.concat(body.slice(0, 2)), P.N4);
  disc(cam.x(0), cam.y(-212), 36 * z, P.N2); ring(cam.x(0), cam.y(-212), 36 * z, 1, P.N4);
  for (const s of [-1, 1]) { const q = cam.pts([s * 98, -140, s * 122, 20, s * 128, 160]); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], 30 * z, P.N2); }
  // other arteries (anatomical context)
  const art = (pts, w) => { const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * z), P.AW1); };
  art([-4, -130, -10, -180], 3); art([8, -124, 12, -180], 3); art([30, -128, 60, -132, 95, -110, 112, 20, 124, 150], 3);
  art([40, -118, 46, -60, 46, 120], 5);
  drawHeart({ ox: cam.x(MAP_HEART.ox), oy: cam.y(MAP_HEART.oy), s: MAP_HEART.s * z }, t, { lesion: 'narrow' });
  const qa = cam.pts(ROUTE.p); for (let i = 0; i + 3 < qa.length; i += 2) lineW(qa[i], qa[i + 1], qa[i + 2], qa[i + 3], Math.max(1.5, 5 * z), P.AW2);
  for (let i = 0; i + 3 < qa.length; i += 2) line(qa[i] - 1, qa[i + 1], qa[i + 2] - 1, qa[i + 3], P.AW3);
  // guiding catheter inside the route
  const L = ROUTE.L * clamp(prog, 0, 1);
  if (L > 1) {
    const q = cam.pts(ROUTE.sub(0, L, 3));
    for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 2.4 * z), P.CA3);
    const [tx, ty] = ROUTE.at(L); glow(cam.x(tx), cam.y(ty), 9, P.CA1, P.CA3, 1); disc(cam.x(tx), cam.y(ty), 2, P.INK);
  }
}
// ---------------------------------------------------------------- X-ray angiography
const ANG = { // display-local tree (origin at the catheter tip), dist = path distance from the ostium
  segs: [
    { p: [0, 0, 6, 24], w: 5, d0: 0 },                                         // left main
    { p: [6, 24, 10, 60, 14, 96, 12, 120, 8, 170, 0, 230, -8, 290], w: 4, d0: 24, lad: true },
    { p: [12, 70, 40, 92, 62, 120], w: 2.6, d0: 70 },
    { p: [9, 150, 34, 176, 52, 210], w: 2.2, d0: 150 },
    { p: [6, 24, 40, 34, 70, 60, 86, 100, 92, 150], w: 3.6, d0: 24 },
    { p: [70, 60, 96, 84, 104, 118], w: 2.2, d0: 70 },
  ],
  sten: [12, 108], stenL: 16,
};
function drawAngio(t, opt) {
  opt = opt || {};
  const zc = opt.zoom || 1, fx = opt.fx === undefined ? 0 : opt.fx, fy = opt.fy === undefined ? 0 : opt.fy;
  clear(P.N1);
  shade(maskRR(10, 64, 260, 408, 8), P.C1, P.C2, P.C0, P.K0, { k: 2 });
  const sx0 = 18, sy0 = 72, sx1 = 252, sy1 = 392;
  const ox = 120 - fx * zc + (fx === 0 ? 0 : 0), oy = 130 - fy * zc;
  const X = x => 120 + (x - fx) * zc, Y = y => 150 + (y - fy) * zc;
  const nt = Math.floor(t * 15);
  for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
    const lx = (x - 120) / zc + fx, ly = (y - 150) / zc + fy;
    let v = 0.62;
    const dh = Math.hypot((lx - 30) / 120, (ly - 140) / 130); if (dh < 1) v -= 0.1 * (1 - dh);
    if (Math.abs(lx + 70) < 16) v -= 0.08;                                   // spine shadow
    if (((Math.floor(ly / 34) * 34 + 12 - ly + Math.abs(lx) * 0.18) % 34 + 34) % 34 < 2) v -= 0.05;   // ribs
    v += (hash2(Math.floor(x / 2) + nt * 131, Math.floor(y / 2)) - 0.5) * 0.09;
    const c = v > 0.7 ? P.XR6 : v > 0.62 ? P.XR5 : v > 0.54 ? P.XR4 : v > 0.46 ? P.XR3 : P.XR2;
    buf[y * W + x] = c;
  }
  // guiding catheter shadow
  lineW(X(-30), Y(-120), X(0), Y(0), Math.max(1, 3 * zc), P.XR2);
  // contrast-filled vessels (dark), filling from the ostium
  const front = opt.fill === undefined ? 1e9 : opt.fill;
  for (const s of ANG.segs) {
    const path = new Path(s.p); let acc = s.d0;
    const L = clamp(front - acc, 0, path.L); if (L <= 0) continue;
    const step = 2 / zc;
    for (let u = 0; u < L; u += step) {
      const [x, y] = path.at(u);
      let w = s.w;
      if (s.lad && !opt.post) { const d = Math.hypot(x - ANG.sten[0], y - ANG.sten[1]); if (d < ANG.stenL) w *= lerp(0.28, 1, smooth(d / ANG.stenL)); }
      disc(X(x), Y(y), Math.max(0.6, w * zc * 0.5), P.XR1);
    }
  }
  if (opt.post) { // faint stent mesh
    for (let k = -4; k <= 4; k++) { const y = ANG.sten[1] + k * 4; line(X(ANG.sten[0] - 3.4), Y(y), X(ANG.sten[0] + 3.4), Y(y + 3), P.XR2); }
  }
  if (opt.mark) { const sx = X(ANG.sten[0]), sy = Y(ANG.sten[1]), r = (12 + 4 * Math.sin(t * 9)) * Math.max(1, zc * 0.4); frame(sx - r, sy - r, sx + r, sy + r, P.INK); }
  // bezel UI: live indicator + frame counter dots
  rect(sx0, sy0, sx1, sy0 + 1, P.C0); disc(sx1 - 10, sy0 + 10, 3, Math.floor(t * 2) % 2 ? P.R3 : P.R1);
  for (let i = 0; i < 6; i++) rect(sx0 + 8 + i * 6, sy1 - 8, sx0 + 11 + i * 6, sy1 - 5, i <= nt % 6 ? P.C4 : P.C1);
}
// ---------------------------------------------------------------- stent strut close-up (unrolled lattice)
function drawStrutCloseup(t, r, opt) {
  opt = opt || {};
  clear(P.BA0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = 0.5 + 0.5 * Math.sin((x + y * 0.3) * 0.05 + t * 0.6); if (bay(x, y) < 0.25 + 0.3 * v) buf[y * W + x] = P.BA1; }
  const Zc = 3.6, h = Math.PI * r / VS.K, a = stentAmp(r), pitch = VS.PITCH;
  const cx = 135, cy = 240;
  for (let ring_ = -2; ring_ <= 2; ring_++) {
    const yk = ring_ * pitch;
    for (let i = -8; i <= 8; i++) {
      const x0 = i * h, x1 = (i + 1) * h, z0 = ((i + ring_) % 2 + 2) % 2 ? -a : a, z1 = -z0;
      const A = [cx + x0 * Zc, cy + (yk + z0) * Zc], B = [cx + x1 * Zc, cy + (yk + z1) * Zc];
      if (Math.max(A[0], B[0]) < -20 || Math.min(A[0], B[0]) > W + 20) continue;
      lineW(A[0], A[1], B[0], B[1], 8, P.ST0); lineW(A[0], A[1], B[0], B[1], 6, P.ST1); lineW(A[0], A[1] - 1.5, B[0], B[1] - 1.5, 2.4, P.ST2); line(A[0], A[1] - 2, B[0], B[1] - 2, P.ST3);
      // crown hinge: plastic deformation highlight while it bends
      shade(maskDisc(A[0], A[1], 4.4), P.ST2, P.ST3, P.ST1, P.ST0);
      if (opt.bend > 0) glow(A[0], A[1], 9, P.ST1, P.ST3, opt.bend * (0.6 + 0.4 * Math.sin(t * 20 + i)));
      if (((i + ring_) % 2 + 2) % 2 === 0 && ((i % 4) + 4) % 4 < 2 && ring_ < 2) {
        lineW(A[0], A[1], A[0], cy + (yk + pitch - a) * Zc, 6, P.ST0); lineW(A[0], A[1], A[0], cy + (yk + pitch - a) * Zc, 4, P.ST2); line(A[0] - 1, A[1], A[0] - 1, cy + (yk + pitch - a) * Zc, P.ST3);
      }
    }
  }
}
// ---------------------------------------------------------------- drug-eluting coating close-up
function drawDES(t, k) {
  clear(P.BL1);
  const wallX = 128;
  // vessel wall tissue (left) with smooth-muscle cells
  for (let y = 0; y < H; y++) for (let x = 0; x < wallX; x++) buf[y * W + x] = ((x + y * 2) % 23 === 0) ? P.AW1 : P.AW2;
  for (let i = 0; i < 22; i++) {
    const cx = 14 + hash(i * 3) * 100, cy = 20 + hash(i * 5) * 440;
    shade(maskEll(cx, cy, 13, 4.5, 0.15 + 0.2 * hash(i)), P.AW3, P.AW4, P.AW2, P.AW1); disc(cx, cy, 2, P.AW1);
  }
  // excess tissue regrowth toward the lumen is held back where drug arrives
  const grow = k;   // time-lapse progress
  for (let i = 0; i < 7; i++) {
    const cy = 120 + i * 44, near = Math.abs(cy - 250) < 90;
    const ext = near ? 6 + 6 * smooth(clamp(grow * 3, 0, 1)) * (1 - 0.7 * smooth(clamp(grow * 2 - 0.3, 0, 1))) : 6 + 26 * grow;
    shade(maskEll(wallX + ext * 0.5, cy, ext * 0.6 + 4, 7, 0), near ? P.AW3 : P.AW4, P.AW5, P.AW2, P.AW1);
  }
  rect(wallX - 1, 0, wallX + 1, H, P.AW4);
  // strut cross-section with its thin drug-containing coating
  const sx = wallX + 4, sy = 250, sw = 30, sh = 26;
  shade(maskRR(sx - 6, sy - sh / 2 - 6, sx + sw + 6, sy + sh / 2 + 6, 9), P.DR0, P.DR1, P.DR0, P.DR0);
  mFill(maskRR(sx - 4, sy - sh / 2 - 4, sx + sw + 4, sy + sh / 2 + 4, 8), P.DR1, 0.5);
  shade(maskRR(sx, sy - sh / 2, sx + sw, sy + sh / 2, 6), P.ST2, P.ST3, P.ST1, P.ST0, { k: 2 });
  // healing endothelial layer gradually covers the strut
  const cov = smooth(clamp(grow * 1.3, 0, 1));
  if (cov > 0) { for (let y = sy - 22 - 40 * cov; y < sy + 22 + 40 * cov; y += 1) { const x = sx + sw + 8; if (Math.abs(y - sy) < 22 + 40 * cov) rect(x, y, x + 3, y + 1, P.AW4); } }
  // drug molecules: released slowly from the coating, diffusing into the wall
  for (let i = 0; i < 46; i++) {
    const rel = clamp((grow - hash(i * 7) * 0.8) / 0.25, 0, 1);
    const a = hash(i * 13) * TAU, r0 = 18 + 4 * hash(i * 3);
    let x = sx + sw / 2 + Math.cos(a) * r0, y = sy + Math.sin(a) * (r0 - 2);
    if (rel > 0) { const d = rel * (60 + 80 * hash(i * 19)); x -= d * 0.9 + Math.sin(t * 3 + i) * 3; y += (hash(i * 23) - 0.5) * d * 1.4; }
    if (x > W || x < 0) continue;
    const c = rel > 0 ? P.DR2 : P.DR3;
    rect(x - 1, y - 1, x + 2, y + 2, P.DR0); rect(x - 0.5, y - 0.5, x + 1.5, y + 1.5, c);
  }
  // blood in the lumen (right)
  for (let i = 0; i < 9; i++) drawRBC(170 + hash(i * 3) * 90, ((hash(i * 7) * 520 + t * 90) % 520) - 20, 2.2, 1.4, i + t * 2, 1);
}
