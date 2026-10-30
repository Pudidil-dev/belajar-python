'use strict';
// ============================================================================
// LIGHT IN THE FINGERTIP. Tissue scatters red and infrared light strongly, so
// photons random-walk from each LED; some are absorbed (more in blood and
// bone), some leave the finger, some reach the photodiode. Paths are built
// once with a seeded generator: deterministic, and the detected ones trace
// the familiar banana-shaped light path between source and detector.
// Absorption per step follows the physics qualitatively: red light is taken
// up more by deoxygenated blood (the vein), infrared a little more by
// oxygenated blood (the artery).
// ============================================================================
const PH = { step: 0.42, nShow: 64, nDens: 320, maxSteps: 120, v: 30 };
const PHOT = { red: [], ir: [] };
const DENS = { x0: -9.6, y0: -1.0, cs: 0.36, nx: 54, ny: 92, red: null, ir: null, max: { red: 1, ir: 1 } };
function mediumAt(x, y) {
  if (sdBone(x, y) < 0) return 'bone';
  if (x > -8 && x < -3) {
    if (distPath(ART, x, y)[0] < 0.8) return 'artery';
    if (distPath(VEIN, x, y)[0] < 0.72) return 'vein';
  }
  if (x > 4.6 && y > 2.6 && y < 15 && sdIndex(x, y) > -1.25) return 'nailbed';
  return 'tissue';
}
const ABS = { red: { tissue: 0.0015, bone: 0.005, artery: 0.012, vein: 0.05, nailbed: 0.005 }, ir: { tissue: 0.0015, bone: 0.0045, artery: 0.032, vein: 0.018, nailbed: 0.005 } };
function walkPhoton(r, kind) {
  const led = kind === 'red' ? LED_R : LED_IR;
  let y = led[1] + (r() - 0.5) * 0.5, x = 7.2, a = Math.PI + (r() - 0.5) * 1.0;
  const pts = [led[0] + 0.1, led[1], 8.4, lerp(led[1], y, 0.5), x, y]; let fate = 'escape', where = 'tissue';
  for (let k = 0; k < PH.maxSteps; k++) {
    a += gaussR(r) * 0.6;
    const tx = PD_C[0] - x, ty = PD_C[1] - y, tl = Math.hypot(tx, ty) || 1;
    let dx = Math.cos(a) + 0.2 * tx / tl, dy = Math.sin(a) + 0.2 * ty / tl; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl; a = Math.atan2(dy, dx);
    x += dx * PH.step; y += dy * PH.step; pts.push(x, y);
    if (sdIndex(x, y) > 0) {
      if (x < -6.5 && Math.abs(y - PD_C[1]) < PD_H + 0.3) { fate = 'detect'; pts.push(-9.5, clamp(y, PD_C[1] - PD_H + 0.2, PD_C[1] + PD_H - 0.2)); }
      break;
    }
    where = mediumAt(x, y);
    if (r() < ABS[kind][where]) { fate = 'absorb'; break; }
  }
  return { pts: Float32Array.from(pts), fate, where, n: pts.length >> 1 };
}
function buildPhotons() {
  for (const kind of ['red', 'ir']) {
    const r = mulberry(kind === 'red' ? 90211 : 44017);
    const show = [], dens = new Float32Array(DENS.nx * DENS.ny);
    for (let i = 0; i < PH.nDens; i++) {
      const p = walkPhoton(r, kind);
      if (show.length < PH.nShow) show.push(p);
      if (p.fate !== 'detect') continue;
      for (let k = 0; k < p.n; k++) {
        const gx = Math.floor((p.pts[2 * k] - DENS.x0) / DENS.cs), gy = Math.floor((p.pts[2 * k + 1] - DENS.y0) / DENS.cs);
        for (let j = -1; j <= 1; j++) for (let ii = -1; ii <= 1; ii++) { const X = gx + ii, Y = gy + j; if (X >= 0 && Y >= 0 && X < DENS.nx && Y < DENS.ny) dens[Y * DENS.nx + X] += ii === 0 && j === 0 ? 1 : 0.4; }
      }
    }
    let mx = 0; for (const v of dens) mx = Math.max(mx, v);
    PHOT[kind] = show; DENS[kind] = dens; DENS.max[kind] = mx || 1;
  }
}
function densAt(kind, x, y) {
  const g = DENS[kind]; if (!g) return 0;
  const fx = (x - DENS.x0) / DENS.cs - 0.5, fy = (y - DENS.y0) / DENS.cs - 0.5, ix = Math.floor(fx), iy = Math.floor(fy);
  if (ix < 0 || iy < 0 || ix + 1 >= DENS.nx || iy + 1 >= DENS.ny) return 0;
  const u = fx - ix, v = fy - iy, i = iy * DENS.nx + ix;
  return (g[i] * (1 - u) + g[i + 1] * u) * (1 - v) + (g[i + DENS.nx] * (1 - u) + g[i + DENS.nx + 1] * u) * v;
}
// the diffuse glow of light inside the finger (k = LED brightness)
function lightGlow(cam, kind, k) {
  if (k <= 0.02 || !DENS[kind]) return;
  const iz = 1 / cam.z, mx = Math.log(1 + DENS.max[kind]);
  const c1 = kind === 'red' ? P.LR2 : P.IR2, c2 = kind === 'red' ? P.LR3 : P.IR3, c3 = kind === 'red' ? P.LR4 : P.IR4;
  const x0 = Math.max(0, Math.floor(cam.x(DENS.x0))), x1 = Math.min(W, Math.ceil(cam.x(DENS.x0 + DENS.nx * DENS.cs)));
  const y0 = Math.max(0, Math.floor(cam.y(DENS.y0))), y1 = Math.min(H, Math.ceil(cam.y(DENS.y0 + DENS.ny * DENS.cs)));
  for (let sy = y0; sy < y1; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy;
    for (let sx = x0; sx < x1; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx;
      const dv = densAt(kind, wx, wy); if (dv <= 0.5) continue;
      const lv = Math.log(1 + dv) / mx * k, b = bay(sx, sy);
      if (b < lv * 0.14) buf[sy * W + sx] = c3; else if (b < lv * 0.36) buf[sy * W + sx] = c2; else if (b < lv * 0.5 && lv > 0.45) buf[sy * W + sx] = c1;
    }
  }
}
// one photon (dot + short trail) at distance s along a path; returns its state
function photonOnPath(cam, p, s, kind, alpha) {
  const L = (p.n - 1) * PH.step, cols = kind === 'red' ? [P.LR2, P.LR4, P.LR5] : [P.IR2, P.IR4, P.IR5];
  if (s < 0) return 'wait';
  const z = cam.z, r = Math.max(1.6, Math.min(3.6, 0.2 * z));
  if (s >= L) {
    const over = s - L, x = p.pts[2 * (p.n - 1)], y = p.pts[2 * (p.n - 1) + 1];
    if (p.fate === 'absorb' && over < 0.25 * PH.v) { const k = 1 - over / (0.25 * PH.v); disc(cam.x(x), cam.y(y), r * (1.2 + 2.2 * (1 - k)), cols[0], 0.6 * k * alpha); disc(cam.x(x), cam.y(y), r * 0.8 * k, cols[1]); }
    return p.fate;
  }
  const f = s / PH.step, i = Math.floor(f), u = f - i;
  const px = lerp(p.pts[2 * i], p.pts[2 * i + 2], u), py = lerp(p.pts[2 * i + 1], p.pts[2 * i + 3], u);
  for (let k = 1; k <= 3; k++) { const j = Math.max(0, i - k + 1); disc(cam.x(p.pts[2 * j]), cam.y(p.pts[2 * j + 1]), r * (1 - k * 0.22), cols[0], 0.7 * alpha); }
  disc(cam.x(px), cam.y(py), r * 1.6, cols[0], 0.5 * alpha); disc(cam.x(px), cam.y(py), r, cols[1]); disc(cam.x(px), cam.y(py), Math.max(1, r * 0.45), cols[2]);
  return 'fly';
}
// a burst of n photons emitted at tE (paths from index i0), drawn at time t; returns the photodiode hit level
function photonBurst(cam, kind, tE, t, i0, n, alpha) {
  const list = PHOT[kind]; let hit = 0;
  for (let k = 0; k < n; k++) {
    const p = list[(i0 + k) % list.length], s = (t - tE - k * 0.012) * PH.v;
    const st = photonOnPath(cam, p, s, kind, alpha === undefined ? 1 : alpha);
    if (st === 'detect') { const over = s - (p.n - 1) * PH.step; if (over < 0.3 * PH.v) hit = Math.max(hit, 1 - over / (0.3 * PH.v)); }
  }
  return hit;
}
// a bold beam flash straight across the finger (the hook): it shoots from the LED to the photodiode and fades
function beamFlash(cam, kind, tE, t) {
  const age = t - tE; if (age < 0 || age > 0.5) return;
  const led = kind === 'red' ? LED_R : LED_IR, u = clamp(age / 0.12, 0, 1), k = age < 0.12 ? 1 : 1 - (age - 0.12) / 0.38;
  const c = kind === 'red' ? [P.LR2, P.LR3, P.LR5] : [P.IR2, P.IR3, P.IR5];
  const x0 = led[0] - 0.2, y0 = led[1], x1 = lerp(x0, PD_C[0] + 0.3, u), y1 = lerp(y0, PD_C[1], u), w0 = 0.35, w1 = lerp(0.35, 2.6, u);
  const pts = [cam.x(x0), cam.y(y0 - w0), cam.x(x1), cam.y(y1 - w1), cam.x(x1), cam.y(y1 + w1), cam.x(x0), cam.y(y0 + w0)];
  poly(pts, c[0], 0.45 * k); 
  const pts2 = [cam.x(x0), cam.y(y0 - w0 * 0.5), cam.x(x1), cam.y(y1 - w1 * 0.4), cam.x(x1), cam.y(y1 + w1 * 0.4), cam.x(x0), cam.y(y0 + w0 * 0.5)];
  poly(pts2, c[1], 0.6 * k);
  lineW(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), Math.max(2, 0.22 * cam.z), c[2], k > 0.5 ? undefined : k * 2);
  if (u >= 1 && age < 0.3) glow(cam.x(PD_C[0] + 0.2), cam.y(PD_C[1]), 2.2 * cam.z, c[0], c[1], 1 - age / 0.3);
}
