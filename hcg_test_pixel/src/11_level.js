'use strict';
// ============================================================================
// THE STRIP AS A SIDE-SCROLLING LEVEL (level units; u along the flow →, v down).
//   u < 0          sample pad (glass fibres)
//   0 .. 380       conjugate pad (fibres; dried gold conjugates sit on them)
//   u > 330        nitrocellulose membrane: a porous floor (top surface v ≈ 60)
//   540 .. 680     test zone: mint capture antibodies anchored on the floor
//   900 .. 1040    control zone: violet anti-mouse antibodies anchored on the floor
// Liquid fills the pores behind the wetting front (pale blue meniscus).
// ============================================================================
const LV = { MEM0: 330, FLOOR: 60, T0: 540, C0: 900, NZ: 11, DZ: 13, CONJ1: 380 };
// fibre strands (mid layer) — deterministic
const FIBRES = (() => {
  const r = mulberry(17), out = [];
  const mk = (pts, w, sh) => out.push({ pts: spline(pts, 8, false), w, sh });
  // the hero fibre: carries the conjugate the film follows (top surface near u = 140, v = 4)
  mk([-420, 112, -160, 70, 60, 40, 240, 28, 380, 30, 470, 50], 48, 0.5);
  for (let i = 0; i < 40; i++) {
    const cu = lerp(-1300, 300, r()), cv = lerp(-900, 900, r());
    const a = (r() - 0.5) * Math.PI * 0.95, L = 520 + r() * 700, w = 26 + r() * 34, pts = [];
    for (let k = -2; k <= 2; k++) { const s = k * L / 4; pts.push(cu + Math.cos(a) * s + (r() - 0.5) * 90, cv + Math.sin(a) * s + (r() - 0.5) * 90); }
    const sp = spline(pts, 8, false); let near = false;                        // keep the hero's neighbourhood readable
    for (let q = 0; q < sp.length; q += 2) if (sp[q] > -170 && sp[q] < 470 && sp[q + 1] > -190 && sp[q + 1] < 125) { near = true; break; }
    if (near || out.length > 30) continue;
    let far = false; for (let q = 0; q < sp.length; q += 2) if (sp[q] > LV.CONJ1 + 40 && sp[q + 1] > -200) { far = true; break; }
    if (far) continue;
    mk(pts, w, r());
  }
  return out;
})();
// far layer: big dark strands (parallax 0.55)
const FAR = (() => { const r = mulberry(29), out = []; for (let i = 0; i < 26; i++) { const cu = lerp(-1600, 2200, r()), cv = lerp(-900, 900, r()), a = (r() - 0.5) * 2.6, L = 600 + r() * 600, pts = []; for (let k = -2; k <= 2; k++) { const s = k * L / 4; pts.push(cu + Math.cos(a) * s + (r() - 0.5) * 120, cv + Math.sin(a) * s + (r() - 0.5) * 120); } out.push({ pts: spline(pts, 6, false), w: 60 + r() * 70 }); } return out; })();
// floor top (v) at u; the membrane starts with a slope at its left end
function floorV(u) { const b = LV.FLOOR + 1.4 * Math.sin(u / 9.3) + 1.1 * Math.sin(u / 4.1 + 1.7); return u < LV.MEM0 + 25 ? b + Math.pow((LV.MEM0 + 25 - u) / 25, 2) * 40 : b; }
const ZONE_T = [], ZONE_C = [];
for (let i = 0; i < LV.NZ; i++) {
  const uT = LV.T0 + i * LV.DZ + (hash(i * 7 + 1) - 0.5) * 3, uC = LV.C0 + i * LV.DZ + (hash(i * 7 + 2) - 0.5) * 3;
  ZONE_T.push({ u: uT, v: floorV(uT) + 0.6, a: (hash(i * 7 + 3) - 0.5) * 0.28 });
  ZONE_C.push({ u: uC, v: floorV(uC) + 0.6, a: (hash(i * 7 + 4) - 0.5) * 0.28 });
}
// the wetting front in the level: enters at 12 s, reaches the conjugate pad (u = 0) at 16 s
const LF = { t0: 12.0, u0: -560, v: 140 };
const frontU = (v, t) => (t < LF.t0 - 0.5 ? -1e9 : LF.u0 + LF.v * (t - LF.t0)) + 34 * Math.sin(v / 95 + 1.3) + 26 * (vnoise(v / 47, 3) - 0.5) * 2;

function strandPoly(cam, pts, w) {
  const n = pts.length >> 1, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let dx = pts[2 * i1] - pts[2 * i0], dy = pts[2 * i1 + 1] - pts[2 * i0 + 1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const x = pts[2 * i], y = pts[2 * i + 1];
    L.push(cam.x(x - dy * w / 2), cam.y(y + dx * w / 2)); R.push(cam.x(x + dy * w / 2), cam.y(y - dx * w / 2));
  }
  const out = L.slice(); for (let i = R.length - 2; i >= 0; i -= 2) out.push(R[i], R[i + 1]);
  return out;
}
function bboxHit(cam, pts, m) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { const x = cam.x(pts[i]), y = cam.y(pts[i + 1]); a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return b >= -m && a <= W + m && d >= -m && c <= H + m;
}
// draw the level environment (no molecules). o: {front: true/false, streaks}
function drawLevel(cam, t, o) {
  o = o || {};
  clear(P.BG);
  // far layer (parallax): flat dark strands
  const fc = new Cam(cam.cx * 0.55, cam.cy * 0.55, cam.z * 0.55, cam.ax, cam.ay);
  for (const f of FAR) { if (!bboxHit(fc, f.pts, f.w * fc.z)) continue; poly(strandPoly(fc, f.pts, f.w), P.K0); }
  // fibres
  const z = cam.z, k = Math.max(1, Math.round(z * 1.6));
  for (const f of FIBRES) {
    if (!bboxHit(cam, f.pts, f.w * z)) continue;
    const m = maskPoly(strandPoly(cam, f.pts, f.w));
    if (m.empty()) continue;
    shade(m, f.sh < 0.5 ? P.GR1 : P.GR2, P.GR0, f.sh < 0.5 ? P.GR2 : P.GR3, P.GR4, { k });
    if (z > 0.9) {                                  // fibre surface texture: sparse flecks
      for (let j = 0; j < m.h; j += 1) for (let i = 0; i < m.w; i += 1) {
        if (!m.d[j * m.w + i]) continue; const x = m.x0 + i, y = m.y0 + j; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (hash3(Math.floor(cam.wx(x) * 0.7), Math.floor(cam.wy(y) * 0.7), 41) < 0.05) buf[y * W + x] = P.GR3;
      }
    }
  }
  // membrane floor (porous)
  const ps = z > 1.2 ? 0.16 : z > 0.5 ? 0.12 : 0.08;
  for (let x = 0; x < W; x++) {
    const u = cam.wx(x + 0.5); if (u < LV.MEM0) continue;
    const top = Math.round(cam.y(floorV(u)));
    for (let y = Math.max(0, top); y < H; y++) {
      const v = cam.wy(y + 0.5), dpt = y - top;
      const n = vn2(u * ps, v * ps, 51);
      let c = n > 0.66 ? P.GR3 : n > 0.6 ? P.GR2 : P.GR1;
      if (dpt < 1) c = P.GR0; else if (dpt < 2 && n < 0.6) c = P.GR0;
      if (n > 0.74 && dpt > 2) c = P.GR4;
      buf[y * W + x] = c;
    }
    if (top >= 1 && top < H) buf[(top - 1) * W + x] = P.GR4 === buf[(top - 1) * W + x] ? P.GR4 : buf[(top - 1) * W + x];
  }
  // wet pass: everything behind the front takes the wet colours, plus the meniscus
  if (o.front !== false) {
    for (let y = 0; y < H; y++) {
      const v = cam.wy(y + 0.5), fu = frontU(v, t), fx = cam.x(fu);
      const xe = Math.min(W, Math.floor(fx));
      for (let x = 0; x < xe; x++) { const i = y * W + x, c = WETMAP.get(buf[i]); if (c !== undefined) buf[i] = c; }
      if (xe >= 0 && xe < W) {
        const mz = Math.max(1, Math.round(z * 1.5));
        for (let q = 0; q < mz + 1 && xe - q >= 0; q++) buf[y * W + xe - q] = q === 0 ? P.LB0 : q < mz ? P.LB1 : P.LB2;
      }
    }
  } else {
    for (let i = 0; i < W * H; i++) { const c = WETMAP.get(buf[i]); if (c !== undefined) buf[i] = c; }
  }
  // flow streaks in the liquid (background only)
  if (o.streaks !== false) {
    const sp = 70, cell = 46;
    const u0 = cam.wx(0), u1 = cam.wx(W), v0 = cam.wy(0), v1 = cam.wy(H);
    for (let cv = Math.floor(v0 / cell); cv <= Math.floor(v1 / cell); cv++) {
      const off = hash2(cv, 9) * cell, du = (t * sp + off) % cell;
      for (let cu = Math.floor((u0 - du) / cell) - 1; cu <= Math.floor((u1 - du) / cell) + 1; cu++) {
        if (hash2(cu, cv) > 0.33) continue;
        const u = cu * cell + du + hash2(cu, cv + 77) * 20, v = cv * cell + hash2(cu + 3, cv) * cell;
        const x = Math.round(cam.x(u)), y = Math.round(cam.y(v)), L = Math.max(2, Math.round(z * 3));
        if (y < 0 || y >= H) continue;
        for (let q = 0; q < L; q++) { const xx = x + q; if (xx >= 0 && xx < W && buf[y * W + xx] === P.WB2) buf[y * W + xx] = q === L - 1 ? P.LB3 : P.LB4; }
      }
    }
  }
}
// anchored capture antibodies (both zones); hi: {T: index, C: index} to flash
function drawZones(cam, o) {
  o = o || {};
  const foot = (z) => { const x = cam.x(z.u), y = cam.y(z.v); if (cam.z > 1) rect(x - cam.z * 1.2, y - 1, x + cam.z * 1.2, y + 1, P.GW4); };
  ZONE_T.forEach((z, i) => { drawAb(cam, z.u, z.v, z.a, RAMP.mi, { hi: o.hiT === i }); foot(z); });
  ZONE_C.forEach((z, i) => { drawAb(cam, z.u, z.v, z.a, RAMP.vi, { hi: o.hiC === i }); foot(z); });
}
