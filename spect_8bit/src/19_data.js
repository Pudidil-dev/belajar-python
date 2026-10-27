'use strict';
// ============================================================================
// FROM PULSES TO A PICTURE (panel 18 + s19..s22). One 2-D "electronics" world:
// the PMT array seen from behind with a pulse bar on every tube, the Anger
// position logic (X-Y grid) and the energy sum; the energy spectrum with its
// window; the detector image matrix where accepted events add counts.
// World units = px at zoom 1.
// ============================================================================
const EW = {
  arr: [0, -118], pr: 25, pitch: 54,        // PMT array top view: centre, tube radius, spacing
  grid: [-34, 168], gs: 92,                 // X-Y grid centre, half size
  ebar: [118, 168],                         // energy sum bar (centre)
  spec: [404, 150], sw: 132, sh: 96,        // spectrum centre, half sizes
  mat: [404, 476], ms: 112,                 // image matrix centre, half size
};
// hex patch of 19 tubes (axial coords), and the flash position in that patch (array units)
const HEXP = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { const s = -q - r; if (Math.abs(s) <= 2) HEXP.push([EW.arr[0] + EW.pitch * (q + r / 2), EW.arr[1] + EW.pitch * r * 0.866]); }
const FLASH_A = [EW.arr[0] + 14, EW.arr[1] - 9];
// light seen by each tube (falls off with distance; the nearest gets most)
const HEX_L = HEXP.map(([x, y]) => { const d = Math.hypot(x - FLASH_A[0], y - FLASH_A[1]); return Math.exp(-d * d / (2 * 46 * 46)); });
const HEX_SUM = HEX_L.reduce((a, b) => a + b, 0);
// Anger centroid of the light (what the electronics estimate)
const ANGER = (function () { let sx = 0, sy = 0; HEXP.forEach(([x, y], i) => { sx += x * HEX_L[i]; sy += y * HEX_L[i]; }); return [sx / HEX_SUM, sy / HEX_SUM]; })();
// ---------------------------------------------------------------- PMT array from behind
function pmtTop(x, y, r, lit) {
  const m = maskDisc(x, y, r); organShade(m, x, y, r, r, [P.PM5, P.PM4, P.PM3, P.PM2, P.PM1, P.PM0], -0.6, -0.6);
  mOutline(m, P.PM0);
  ring(x, y, r * 0.72, 1, P.PM2); disc(x, y, r * 0.5, P.PM1); disc(x, y, r * 0.38, P.PM0);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; pset(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, P.PM4); }
  if (lit > 0) ring(x, y, r + 1.5, 2, P.LT2, Math.min(1, lit * 1.5));
}
// k: 0..1 flash; bars: 0..1 bar growth; o.dim
function drawPmtArray(cam, t, flashK, barsK, o) {
  o = o || {};
  const z = cam.z, cx = cam.x(EW.arr[0]), cy = cam.y(EW.arr[1]), R = (EW.pitch * 2.6) * z;
  // the crystal underneath (seen between the tubes) and the flash in it
  const hw = EW.pitch * 2.75 * z;
  rect(cx - hw, cy - hw * 0.92, cx + hw, cy + hw * 0.92, P.CR1); frame(cx - hw, cy - hw * 0.92, cx + hw, cy + hw * 0.92, P.CR3);
  for (let i = 1; i < 10; i++) { const gx = lerp(cx - hw, cx + hw, i / 10); for (let y = Math.round(cy - hw * 0.92); y < cy + hw * 0.92; y += 3) pset(gx, y, P.CR2); }
  if (flashK > 0) { const fx = cam.x(FLASH_A[0]), fy = cam.y(FLASH_A[1]); glow(fx, fy, 70 * z * flashK, P.LT1, P.LT2, flashK); disc(fx, fy, 6 * z * flashK, P.C6); }
  HEXP.forEach(([x, y], i) => pmtTop(cam.x(x), cam.y(y), EW.pr * z, flashK * HEX_L[i]));
  // light rays from the flash to the tubes (strength ~ light received)
  if (flashK > 0.05) HEXP.forEach(([x, y], i) => { if (HEX_L[i] < 0.12) return; dashLine(cam.x(FLASH_A[0]), cam.y(FLASH_A[1]), cam.x(x), cam.y(y), HEX_L[i] > 0.5 ? P.LT3 : P.LT2, 3, 3, -t * 40); });
  // pulse bars standing on the tubes
  if (barsK > 0) HEXP.forEach(([x, y], i) => {
    const lag = (1 - HEX_L[i]) * 0.35, k = clamp((barsK - lag) / 0.5, 0, 1); if (k <= 0) return;
    const h = Math.max(2, 74 * z * HEX_L[i] * eout(k)), bx = cam.x(x), by = cam.y(y) - 4 * z, bw = Math.max(3, 6 * z);
    rect(bx - bw / 2 - 1, by - h - 1, bx + bw / 2 + 1, by, P.SH);
    rect(bx - bw / 2, by - h, bx + bw / 2, by, P.SG1); rect(bx - bw / 2, by - h, bx - bw / 2 + 2, by, P.SG2); rect(bx - bw / 2, by - h, bx + bw / 2, by - h + 2, P.SG3);
  });
  void R; void o;
}
// ---------------------------------------------------------------- Anger logic: the X-Y grid, marker and energy sum
function drawXYGrid(cam, t, markK, sumK) {
  const z = cam.z, cx = cam.x(EW.grid[0]), cy = cam.y(EW.grid[1]), s = EW.gs * z;
  rect(cx - s - 6, cy - s - 6, cx + s + 6, cy + s + 6, P.K0); frame(cx - s - 6, cy - s - 6, cx + s + 6, cy + s + 6, P.SG1);
  for (let i = 0; i <= 8; i++) { const g = lerp(-s, s, i / 8); for (let q = -s; q <= s; q += 2) { pset(cx + g, cy + q, i % 4 ? P.N3 : P.N5); pset(cx + q, cy + g, i % 4 ? P.N3 : P.N5); } }
  // axes with arrowheads
  line(cx - s, cy + s, cx + s + 2, cy + s, P.SUB); arrowHead(cx + s + 4, cy + s, 0, 5, P.SUB);
  line(cx - s, cy + s, cx - s, cy - s - 2, P.SUB); arrowHead(cx - s, cy - s - 4, -Math.PI / 2, 5, P.SUB);
  // tube positions as faint rings (the same pattern as the array above)
  HEXP.forEach(([x, y]) => { const gx = cx + (x - EW.arr[0]) / (EW.pitch * 2.75) * s, gy = cy + (y - EW.arr[1]) / (EW.pitch * 2.75) * s; ring(gx, gy, 6 * z, 1, P.N5); });
  if (markK > 0) {
    const mx = cx + (ANGER[0] - EW.arr[0]) / (EW.pitch * 2.75) * s, my = cy + (ANGER[1] - EW.arr[1]) / (EW.pitch * 2.75) * s;
    const k = eout(clamp(markK, 0, 1)), dy = (1 - k) * -40 * z;
    dashLine(mx, cy + s, mx, my + dy, P.SG2, 3, 2, 0); dashLine(cx - s, my + dy, mx, my + dy, P.SG2, 3, 2, 0);
    rect(mx - 4, my + dy - 4, mx + 5, my + dy + 5, P.SH); rect(mx - 3, my + dy - 3, mx + 4, my + dy + 4, P.YEL); rect(mx - 1, my + dy - 1, mx + 2, my + dy + 2, P.C6);
    if (k >= 1) ring(mx + 0.5, my + 0.5, 9 + 3 * Math.sin(t * 8), 1, P.YEL);
  }
  // energy: the sum of all pulse heights
  const ex = cam.x(EW.ebar[0]), ey = cam.y(EW.ebar[1]) + s, eh = 2 * s, ew = 18 * z;
  rect(ex - ew / 2 - 3, ey - eh - 3, ex + ew / 2 + 3, ey + 3, P.K0); frame(ex - ew / 2 - 3, ey - eh - 3, ex + ew / 2 + 3, ey + 3, P.SG1);
  const fill = eh * 0.86 * eout(clamp(sumK, 0, 1));
  if (fill > 0) { rect(ex - ew / 2, ey - fill, ex + ew / 2, ey, P.SG1); rect(ex - ew / 2, ey - fill, ex - ew / 2 + 3, ey, P.SG2); rect(ex - ew / 2, ey - fill, ex + ew / 2, ey - fill + 2, P.SG3); }
  for (let i = 1; i < 6; i++) rect(ex + ew / 2 - 4, ey - eh * i / 6, ex + ew / 2, ey - eh * i / 6 + 1, P.SG0);
}
// ---------------------------------------------------------------- the energy spectrum with its window
const SPEC = { e0: 40, e1: 180, peak: 140, sig: 6.4, w0: 126, w1: 154 };
function specValue(e) {   // counts vs energy: photopeak + scatter shoulder + Compton continuum (shape only)
  const pk = Math.exp(-((e - SPEC.peak) ** 2) / (2 * SPEC.sig * SPEC.sig));
  const sc = 0.34 * Math.exp(-((e - 118) ** 2) / (2 * 15 * 15)), cont = 0.12 * clamp((e - 45) / 40, 0, 1) * clamp((152 - e) / 20, 0, 1);
  return pk + sc + cont;
}
function drawSpectrum(cam, t, k, o) {
  o = o || {};
  const z = cam.z, cx = cam.x(EW.spec[0]), cy = cam.y(EW.spec[1]), w = EW.sw * z, h = EW.sh * z;
  const X = e => cx - w + (e - SPEC.e0) / (SPEC.e1 - SPEC.e0) * 2 * w, Y = v => cy + h - v * h * 1.55;
  rect(cx - w - 8, cy - h - 10, cx + w + 8, cy + h + 26, P.K0); frame(cx - w - 8, cy - h - 10, cx + w + 8, cy + h + 26, P.N5);
  // the window band
  const wk = clamp(o.win === undefined ? 1 : o.win, 0, 1);
  if (wk > 0) { const a = X(SPEC.w0), b = X(SPEC.w1); rect(a, cy - h, b, cy + h, P.SG0, wk); line(a, cy - h, a, cy + h, P.SG2, wk); line(b, cy - h, b, cy + h, P.SG2, wk); rect(a, cy - h, b, cy - h + 2, P.SG2, wk); }
  // histogram columns (drawn up to k of the energy range)
  const n = 70;
  for (let i = 0; i < n; i++) {
    const e = lerp(SPEC.e0, SPEC.e1, (i + 0.5) / n); if ((i + 0.5) / n > k) break;
    const v = specValue(e), x0 = X(lerp(SPEC.e0, SPEC.e1, i / n)), x1 = X(lerp(SPEC.e0, SPEC.e1, (i + 1) / n)), y = Y(v);
    const inPk = Math.abs(e - SPEC.peak) < 2.6 * SPEC.sig;
    rect(x0, y, x1, cy + h, inPk ? P.OR2 : P.OR1); rect(x0, y, x1, y + 2, inPk ? P.GA3 : P.OR3);
    if (v > 0.6) rect(x0, y + 2, x1, y + 2 + (v - 0.6) * h * 0.5, P.OR3, 0.6);
  }
  // axis and ticks
  line(cx - w, cy + h, cx + w, cy + h, P.SUB);
  for (const e of [60, 100, 140]) { const x = X(e); line(x, cy + h, x, cy + h + 4, P.SUB); text(FS, String(e), x, cy + h + 7, { sc: 2, c: e === 140 ? P.YEL : P.SUB, align: 'center' }); }
  return { X, Y, x0: cx - w, x1: cx + w, y0: cy - h, y1: cy + h };
}
// an event dot dropping onto the spectrum at energy e; k 0..1 fall; verdict colour after landing
function specEvent(geo, e, k, ok, t) {
  const x = geo.X(e), yT = geo.y0 - 50, yB = geo.y1 - 6, y = lerp(yT, yB, ein(clamp(k, 0, 1)));
  const col = k >= 1 ? (ok ? P.SG2 : P.RJ2) : P.C6;
  glow(x, y, 10, ok || k < 1 ? P.SG1 : P.RJ1, col, 0.8); disc(x, y, 4, col); pset(x - 1, y - 1, P.C6);
  if (k >= 1) { if (ok) checkMark(x + 14, y - 16, 6, P.SG2); else crossMark(x + 12, y - 14, 5, P.RJ2); }
}
// ---------------------------------------------------------------- the detector image matrix
function matGeo(cam) { const z = cam.z, cx = cam.x(EW.mat[0]), cy = cam.y(EW.mat[1]), s = EW.ms * z; return { x0: cx - s, y0: cy - s, s: 2 * s / MD.n, cx, cy, half: s }; }
function drawMatrix(cam, t, N, o) {
  o = o || {};
  const g = matGeo(cam), n = MD.n;
  rect(g.x0 - 6, g.y0 - 6, g.x0 + g.half * 2 + 6, g.y0 + g.half * 2 + 6, P.K0); frame(g.x0 - 6, g.y0 - 6, g.x0 + g.half * 2 + 6, g.y0 + g.half * 2 + 6, P.PJ2);
  rect(g.x0 - 3, g.y0 - 3, g.x0 + g.half * 2 + 3, g.y0 + g.half * 2 + 3, P.PJ0);
  if (N > 0) {
    const img = countsAfter(N); let mx = 1; for (let i = 0; i < img.length; i++) if (img[i] > mx) mx = img[i];
    const vmax = N < 30 ? 1 : mx * 0.92;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = img[j * n + i]; if (c <= 0) continue;
      const q = clamp(c / vmax, 0, 1), x0 = Math.round(g.x0 + i * g.s), y0 = Math.round(g.y0 + j * g.s), x1 = Math.round(g.x0 + (i + 1) * g.s), y1 = Math.round(g.y0 + (j + 1) * g.s);
      const ramp = [P.PJ1, P.PJ2, P.PJ3, P.PJ4, P.C6], v = q * 4;
      rect(x0, y0, x1, y1, ramp[clamp(Math.floor(v), 0, 4)]);
      if (v % 1 > 0.5 && v < 4) rect(x0, y0, x1, y1, ramp[clamp(Math.floor(v) + 1, 0, 4)], (v % 1 - 0.5) * 2);
    }
    // the newest events flash
    const fresh = o.fresh || 0;
    for (let e = Math.max(0, Math.floor(N) - fresh); e < N; e++) { const p = eventPix(e), i = p % n, j = Math.floor(p / n); rect(g.x0 + i * g.s - 1, g.y0 + j * g.s - 1, g.x0 + (i + 1) * g.s + 1, g.y0 + (j + 1) * g.s + 1, P.C6); }
  }
  // grid lines (visible when zoomed in)
  if (g.s >= 5) for (let i = 0; i <= n; i++) {
    const gx = Math.round(g.x0 + i * g.s), gy = Math.round(g.y0 + i * g.s);
    for (let q = 0; q < g.half * 2; q += 2) { pset(gx, g.y0 + q, P.PJ1); pset(g.x0 + q, gy, P.PJ1); }
  }
  return g;
}
function pixCentre(g, p) { const n = MD.n, i = p % n, j = Math.floor(p / n); return [g.x0 + (i + 0.5) * g.s, g.y0 + (j + 0.5) * g.s]; }
// number of counted events at story time tau (s22 time-lapse): 1 -> ~42,000, accelerating
function countN(tau) { return tau <= 0 ? 1 : Math.min(42000, Math.floor(1 + 41999 * Math.pow(clamp(tau / 2.6, 0, 1), 2.4))); }
