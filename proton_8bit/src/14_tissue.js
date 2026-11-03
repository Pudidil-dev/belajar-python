'use strict';
// ============================================================================
// TISSUE world (units "tu", y = depth below the skin): skin, fat, muscle,
// organ tissue, the tumour. Protons come in from above on nearly straight
// paths (a little sideways scatter), lose energy to atomic electrons all along
// the way — more and more as they slow — and stop at about the same depth
// (their range, with a small spread). Each track leaves orange-yellow deposit
// marks; the dose of many protons builds the Bragg curve.
// MOLECULE world (units "mu"): one proton passing water molecules; its charge
// pulls electrons out of them (ionisation). Not to scale.
// ============================================================================
const TIS = { R: 400, tum0: 330, tum1: 440, depth: 480, half: 200 };
// layer colours: [y0, y1, base, membrane, nucleus, cell size]
const TLAYERS = [[-999, 0, P.N1, P.N1, P.N1, 0], [0, 6, P.TI5, P.TI4, P.TI3, 6], [6, 18, P.TI4, P.TI3, P.TI2, 9], [18, 50, P.FA1, P.FA0, P.FA0, 16],
  [50, 150, P.TI2, P.TI1, P.TI1, 0], [150, TIS.tum0, P.TI3, P.TI2, P.TI1, 13], [TIS.tum0, TIS.tum1, P.TU2, P.TU1, P.TU0, 11], [TIS.tum1, 999, P.TI3, P.TI2, P.TI1, 13]];
const TTEX = { x0: -200, y0: -40, w: 400, h: 540, d: null };
function tissueTexInit() {
  if (TTEX.d) return;
  const d = new Uint32Array(TTEX.w * TTEX.h);
  for (let j = 0; j < TTEX.h; j++) {
    const y = TTEX.y0 + j + 0.5;
    let L = TLAYERS[0]; for (const l of TLAYERS) if (y >= l[0] && y < l[1]) L = l;
    for (let i = 0; i < TTEX.w; i++) {
      const x = TTEX.x0 + i + 0.5; let col = L[2];
      if (L[5] > 0) {
        const cs = L[5], gi = Math.floor(x / cs), gj = Math.floor(y / cs); let d1 = 1e9, d2 = 1e9;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = gi + di, b = gj + dj, sx = (a + 0.2 + 0.6 * hash2(a * 7 + cs, b * 13)) * cs, sy = (b + 0.2 + 0.6 * hash2(a * 11, b * 5 + cs)) * cs, dd = Math.hypot(x - sx, y - sy); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; }
        if (d2 - d1 < 1.1) col = L[3]; else if (d1 < cs * 0.2) col = L[4];
      } else if (L[0] === 50) { const f = Math.sin((y + 3 * Math.sin(x * 0.05)) * 0.9); col = f > 0.75 ? P.TI1 : f < -0.6 ? P.TI3 : P.TI2; }
      // the tumour's edge is irregular
      if (y > TIS.tum0 - 8 && y < TIS.tum0 + 8 && Math.abs(y - (TIS.tum0 + 5 * Math.sin(x * 0.07) + 3 * Math.sin(x * 0.19))) < 1) col = P.TU1;
      d[j * TTEX.w + i] = col;
    }
  }
  TTEX.d = d;
}
function tissueBG(cam) {
  tissueTexInit();
  const inv = 1 / cam.z;
  for (let y = 0; y < H; y++) {
    const wy = Math.floor((y + 0.5 - cam.ay) * inv + cam.cy - TTEX.y0);
    const row = y * W;
    if (wy < 0 || wy >= TTEX.h) { buf.fill(wy < 0 ? P.N1 : P.TI3, row, row + W); continue; }
    const base = wy * TTEX.w;
    for (let x = 0; x < W; x++) { let wx = Math.floor((x + 0.5 - cam.ax) * inv + cam.cx - TTEX.x0); wx = ((wx % TTEX.w) + TTEX.w) % TTEX.w; buf[row + x] = TTEX.d[base + wx]; }
  }
}
// ---------------------------------------------------------------- proton tracks
// stopping power along a track ∝ (residual range)^-0.44 (Bragg–Kleeman); the time to slow down follows from v ∝ r^0.28
const TRACKS = (() => {
  const o = [], r = mulberry(5);
  const entries = [...EV.enter, ...tw(54, 6, 23), ...tw(55, 6, 17)];          // S20 one by one; S23 the time-lapse of many
  entries.forEach((t0, i) => {
    const R = TIS.R + gaussR(r) * 6, x0 = gaussR(r) * 9, side = gaussR(r) * 7, T = i < EV.enter.length ? 1.55 : 0.9;
    // deposit events: equal energy steps → closer together near the end
    const ev = []; let acc = 0, step = 0.62; for (let y = 2; y < R; y += 1) { acc += Math.pow(R - y + 2.5, -0.44); if (acc > step) { acc -= step; ev.push([y, r() < 0.5 ? -1 : 1, r()]); } }
    o.push({ t0, R, x0, side, T, ev, seed: i });
  });
  // the one we follow (it enters last in sequence F's first scene)
  o.STAR = EV.enter.length - 1;
  return o;
})();
const trackX = (tr, y) => tr.x0 + tr.side * Math.pow(y / tr.R, 1.5);
function trackDepth(tr, t) { if (t < tr.t0) return -1; const u = (t - tr.t0) / tr.T; if (u >= 1) return tr.R; return tr.R - tr.R * Math.pow(1 - u, 1 / 0.72); }
// the followed proton's depth: in the tissue view until 48.4 s, frozen while we watch it in the molecule view, at its end from 54 s
function starDepth(t) { const tr = TRACKS[TRACKS.STAR]; if (t >= EV.stop) return tr.R; if (t > 48.4) return lerp(trackDepth(tr, 48.4), tr.R, smooth(seg(t, 53.2, EV.stop))); return trackDepth(tr, t); }
// dose of all tracks that have entered by time t (relative, for the curve) — evaluated on a depth grid
function doseCurve(t, n) {
  const out = new Float32Array(n);
  for (const tr of TRACKS) { const yd = tr === TRACKS[TRACKS.STAR] ? starDepth(t) : trackDepth(tr, t); if (yd <= 0) continue; for (let k = 0; k < n; k++) { const y = k / (n - 1) * TIS.depth; if (y > yd || y > tr.R) break; out[k] += Math.pow(tr.R - y + 2.5, -0.44); } }
  return out;
}
function drawTracks(cam, t, opt) {
  const z = cam.z, focus = opt.focus || 0;
  for (let i = 0; i < TRACKS.length; i++) {
    const tr = TRACKS[i], yd = i === TRACKS.STAR ? starDepth(t) : trackDepth(tr, t); if (yd <= 0) continue;
    const isStar = i === TRACKS.STAR, dim = focus && !isStar ? 0.45 : 1;
    // deposit marks (orange-yellow) and freshly kicked electrons (yellow flecks)
    for (const [y, sd, rr] of tr.ev) {
      if (y > yd) break;
      const x = trackX(tr, y), sx = cam.x(x), sy = cam.y(y); if (sy < -4 || sy > H + 4 || sx < -4 || sx > W + 4) continue;
      const tHit = tr.t0 + tr.T * (1 - Math.pow(1 - y / tr.R, 0.72)), age = t - (isStar && t > 48.4 ? Math.min(tHit, 48.4) : tHit);
      if (z > 1.4) rect(sx, sy, sx + 1, sy + 1, y > tr.R - 25 ? P.DE3 : P.DE2); else pset(sx, sy, y > tr.R - 25 ? P.DE3 : P.DE2);
      if (age >= 0 && age < 0.35 && z > 1.2) { const k = age / 0.35, ex = sx + sd * (2 + 10 * k) * z * 0.6, ey = sy + (rr - 0.5) * 6 * k * z; pset(ex, ey, P.EL2); }
    }
    // the track (faint, explanatory) and the proton itself while it moves
    const q = []; for (let y = 0; y <= yd; y += 6) q.push(cam.x(trackX(tr, y)), cam.y(y)); q.push(cam.x(trackX(tr, yd)), cam.y(yd));
    withDither(0.45 * dim, () => polyline(q, P.PC1));
    if (yd < tr.R - 0.5 || (isStar && t < EV.stop + 0.6)) proton(cam.x(trackX(tr, yd)), cam.y(yd), Math.max(1.6, (isStar ? 2.4 : 2.0) * Math.min(z, 2.5)), dim);
  }
}
// the dose band (bright where the dose is high) and the Bragg curve along the depth axis (vertical)
function doseOverlay(cam, t, k) {
  if (k <= 0) return;
  const n = 120, D = doseCurve(t, n); let mx = 0; for (const v of D) mx = Math.max(mx, v); if (mx <= 0) return;
  const y0 = Math.max(0, Math.floor(cam.y(0))), y1 = Math.min(H - 1, Math.ceil(cam.y(TIS.depth)));
  for (let y = y0; y <= y1; y++) {
    const wy = cam.wy(y + 0.5), kk = clamp(wy / TIS.depth * (n - 1), 0, n - 1), d = D[Math.round(kk)] / mx; if (d < 0.05) continue;
    const sig = (14 + 12 * wy / TIS.depth) * cam.z, cx = cam.x(0);
    for (let x = Math.max(0, Math.floor(cx - 2.5 * sig)); x <= Math.min(W - 1, Math.ceil(cx + 2.5 * sig)); x++) { const g = Math.exp(-Math.pow((x - cx) / sig, 2)), a = Math.min(0.85, d * g * k * 0.95); if (a > 0.04) buf[y * W + x] = mixc(buf[y * W + x], a > 0.5 ? P.DE3 : P.DE2, a); }
  }
}
function braggSide(cam, t, k, x0, w) { // the curve on the right: depth down, dose to the right
  if (k <= 0) return null;
  const n = 120, D = doseCurve(t, n); let mx = 0, ky = 0; D.forEach((v, i) => { if (v > mx) { mx = v; ky = i; } }); if (mx <= 0) return null;
  const pts = []; for (let i = 0; i < n; i++) pts.push(x0 + D[i] / mx * w, cam.y(i / (n - 1) * TIS.depth));
  withDither(k, () => {
    tintRect(x0 - 6, cam.y(0) - 6, x0 + w + 10, cam.y(TIS.depth) + 6, P.K0, 0.6);
    line(x0, cam.y(0), x0, cam.y(TIS.depth), P.N6);
    const fill = []; fill.push(x0, cam.y(0)); for (let i = 0; i < pts.length; i++) fill.push(pts[i]); fill.push(x0, cam.y(TIS.depth)); poly(fill, P.DE0);
    for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 2, P.DE3);
  });
  return [pts[2 * ky], pts[2 * ky + 1]];
}
// the tissue view; opt: { dose, curve, focus }
function tissueWorld(cam, t, opt) {
  opt = opt || {};
  tissueBG(cam);
  // the nozzle's snout just above the skin (the beam comes from there)
  if (!opt.noSnout) { const sy = cam.y(-30); if (sy > -40) { shade(maskRR(cam.x(-30), sy - 60 * cam.z, cam.x(30), sy, 3 * cam.z), P.M3, P.M4, P.M2, P.M1); rect(cam.x(-8), sy - 2, cam.x(8), sy, P.M0); } }
  doseOverlay(cam, t, opt.dose || 0);
  drawTracks(cam, t, opt);
  return opt.curve ? braggSide(cam, t, opt.curve, opt.cx || 270, opt.cw || 64) : null;
}
// ---------------------------------------------------------------- MOLECULE world
const MOL = { sp: 34, R: 1500 };
const MOL_T0 = 48.0;
function molStarY(t) { const u = clamp((t - MOL_T0) / (EV.stop - MOL_T0), 0, 1); return MOL.R - MOL.R * Math.pow(1 - u, 1 / 0.72); }
// the ionisation events: which molecule (left or right of the track) and the times
const MOL_EV = (() => { const all = [...EV.ion21, ...EV.ion22]; return all.map((t, i) => ({ t, y: molStarY(t), side: i % 2 ? 1 : -1, dx: 16 + 9 * hash(i * 3), big: i < 3 })); })();
function molAt(i, j) { // jittered grid molecule
  const x = (i + 0.5) * MOL.sp + (hash2(i, j) - 0.5) * 18, y = (j + 0.5) * MOL.sp + (hash2(i + 77, j) - 0.5) * 18;
  return { x, y, a: hash2(i * 3, j * 7) * TAU };
}
function drawWater(sx, sy, a, z, ion) {
  const o = 6 * z, hd = 7.5 * z;
  for (const s of [-1, 1]) { const b = a + s * 0.91; disc(sx + Math.cos(b) * hd, sy + Math.sin(b) * hd, Math.max(1, 3.4 * z), P.WH); }
  const m = maskDisc(sx, sy, Math.max(1.2, o)); shade(m, ion ? P.DE2 : P.WO, ion ? P.DE3 : P.WH, ion ? P.DE1 : P.M4, ion ? P.DE0 : P.M3);
  if (ion && z > 0.8) { rect(sx - 2, sy - 0.5, sx + 3, sy + 1, P.K0); rect(sx - 0.5, sy - 2, sx + 1, sy + 3, P.K0); }
}
function moleculeWorld(cam, t, opt) {
  opt = opt || {};
  clear(P.BG);
  const z = cam.z, py = molStarY(t);
  // faint background texture of the tissue water
  for (let y = 0; y < H; y += 3) for (let x = (y / 3) & 1; x < W; x += 6) if (hash2(Math.floor(cam.wx(x) / 9), Math.floor(cam.wy(y) / 9)) < 0.06) pset(x, y, P.N3);
  const i0 = Math.floor(cam.wx(-20) / MOL.sp) - 1, i1 = Math.floor(cam.wx(W + 20) / MOL.sp) + 1, j0 = Math.floor(cam.wy(-20) / MOL.sp) - 1, j1 = Math.floor(cam.wy(H + 20) / MOL.sp) + 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const m = molAt(i, j); if (Math.abs(m.x) < 12) continue;                  // the proton's lane
    const jx = 1.5 * Math.sin(t * 3 + i * 1.7 + j), jy = 1.5 * Math.cos(t * 2.6 + j * 1.3 + i);
    drawWater(cam.x(m.x + jx), cam.y(m.y + jy), m.a + 0.3 * Math.sin(t + i + j), z, false);
  }
  // the ionised molecules: their electron is pulled out and flies away; the ion stays (with its deposit mark)
  for (const e of MOL_EV) {
    if (t < e.t - 0.6) continue;
    const mx = e.side * e.dx, my = e.y + 4, sx = cam.x(mx), sy = cam.y(my);
    if (sy < -40 || sy > H + 40) continue;
    const ion = t >= e.t;
    glow(sx, sy, (ion ? 12 : 0) * z, P.DE1, P.DE3, ion ? 0.5 : 0);
    drawWater(sx, sy, 1.2 + e.side, z, ion);
    if (!ion) { const a = t * 6 + e.t; electron(sx + Math.cos(a) * 9 * z, sy + Math.sin(a) * 9 * z, Math.max(1, 2.2 * z)); }
    else { const k = t - e.t; if (k < 1.2) { const ex = sx + e.side * (14 + 120 * k) * z * 0.5, ey = sy + (20 * k - 30 * k * k) * z * 0.4; streak(ex - e.side * 14 * z, ey, ex, ey, P.EL0, P.EL1, Math.max(1, z)); electron(ex, ey, Math.max(1, 2.2 * z)); } }
    // the pull: a thin line from the proton to the electron just before it leaves
    if (t >= e.t - 0.12 && t < e.t + 0.05) { const px = cam.x(0), pyy = cam.y(py); withDither(0.7, () => line(px, pyy, sx, sy, P.PC4)); }
  }
  // the proton: its positive charge (a faint halo), a short trail
  const px = cam.x(0), sy = cam.y(py);
  const v = t < EV.stop ? (molStarY(Math.min(EV.stop, t + 0.02)) - py) / 0.02 : 0;
  if (v > 1) streak(px, sy - Math.min(90, v * 0.12) * z, px, sy, P.PC0, P.PC1, Math.max(2, 3 * z));
  withDither(0.35, () => ring(px, sy, 18 * z, Math.max(1, z), P.PC2));
  proton(px, sy, Math.max(3, 7 * z));
  if (z > 0.9) { rect(px - 2.5 * z, sy - 0.5 * z, px + 2.5 * z, sy + 0.5 * z, P.PC0); rect(px - 0.5 * z, sy - 2.5 * z, px + 0.5 * z, sy + 2.5 * z, P.PC0); }
  // at rest: a calm ring spreads once
  if (t >= EV.stop && t < EV.stop + 0.9) { const k = (t - EV.stop) / 0.9; withDither(1 - k, () => ring(px, sy, (10 + 60 * K75(k)) * z, Math.max(1, 1.5 * z), P.DE3)); }
  return { x: px, y: sy };
}
