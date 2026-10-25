'use strict';
// ============================================================================
// ELECTRONICS + DATA — the luminescent-centre energy levels inside the
// scintillator, readout event cards (position / time / energy), the digital
// event packet, the coincidence-window and energy-window checks, the
// reconstruction pipeline and its iterative activity estimates, the
// circulation mini-map, and a horizontal "card turn" used to rotate the
// scanner from a front cross-section to a side view.
// ============================================================================
// scintillator: an electron is lifted from the ground state to an excited state, then falls back and emits light
function energyLevels(x0, y0, w, h, t, tUp, tDown) {
  rect(x0, y0, x0 + w, y0 + h, P.K0); frame(x0, y0, x0 + w, y0 + h, P.CR1);
  const yE = y0 + 20, yG = y0 + h - 20, lx0 = x0 + 5, lx1 = x0 + w - 5, ex = Math.round(lx0 + (lx1 - lx0) * 0.36);
  rect(lx0, yE, lx1, yE + 1, P.CR2); rect(lx0, yG, lx1, yG + 1, P.CR2);
  if (UI_ON) { text(FM, 'EXCITED', x0 + 5, y0 + 5, { c: P.CR3, ol: null }); text(FM, 'GROUND', x0 + 5, yG + 5, { c: P.CR3, ol: null }); }
  let ey = yG;
  if (t >= tUp && t < tDown) ey = lerp(yG, yE, eout(clamp((t - tUp) / 0.16, 0, 1)));
  else if (t >= tDown) ey = lerp(yE, yG, ein(clamp((t - tDown) / 0.12, 0, 1)));
  if (t >= tUp && t < tUp + 0.4) { const k = 1 - (t - tUp) / 0.4; line(ex - 7, yG - 2, ex - 7, yE + 2, P.EL2, k); pset(ex - 8, yE + 3, P.EL2); pset(ex - 6, yE + 3, P.EL2); }   // energy in
  disc(ex, ey - 2, 2.4, P.EL2); pset(ex, ey - 2, P.EL3);
  if (t >= tDown && t < tDown + 0.7) { const u = t - tDown, px = ex + 4 + u * 70, py = (yE + yG) / 2; for (let s = 0; s < 12; s++) { const xx = px - s; if (xx < lx1) pset(xx, py + Math.sin(xx * 0.9) * 2, s < 3 ? P.SL2 : P.SL1); } }   // light out
}
// readout card: label/value rows; digits roll until each value settles
function dataCard(x0, y0, w, title, rows, t, t0, col) {
  const age = t - t0; if (age < 0) return;
  const h = 20 + rows.length * 15, k = K75(clamp(age / 0.18, 0, 1)), hh = Math.max(2, Math.round(h * k));
  rect(x0, y0, x0 + w, y0 + hh, P.K0); frame(x0, y0, x0 + w, y0 + hh, col);
  if (k < 1 || !UI_ON) return;
  text(FM, title, x0 + 5, y0 + 5, { c: col, ol: null, n: (age - 0.15) * 50 });
  rows.forEach(([lab, val], i) => {
    const y = y0 + 20 + i * 15, ts = t0 + 0.24 + i * 0.16; if (t < ts) return;
    text(FM, lab, x0 + 5, y, { c: P.SUB, ol: null });
    const done = t > ts + 0.32, v = done ? val : val.replace(/[0-9]/g, (d, j) => String(Math.floor(hash3(j * 7 + i, Math.floor(t * 30), 41) * 10)));
    text(FM, v, x0 + w - 5, y, { c: done ? P.INK : P.SG2, ol: null, align: 'right' });
  });
}
// digital event record: a short row of bits
function packet(x, y, seed, col, n) {
  n = n || 12; x = Math.round(x); y = Math.round(y);
  rect(x - 2, y - 2, x + n * 3 + 1, y + 6, P.K0); frame(x - 2, y - 2, x + n * 3 + 1, y + 6, col);
  for (let i = 0; i < n; i++) rect(x + i * 3, y + (hash3(seed, i, 5) > 0.5 ? 0 : 2), x + i * 3 + 2, y + (hash3(seed, i, 5) > 0.5 ? 4 : 3), col);
}
// a check mark / cross for the acceptance tests
function okMark(x, y, ok, k) {
  if (k <= 0) return; x = Math.round(x); y = Math.round(y);
  if (ok) tick(x, y, P.SG2, 1);
  else { for (let i = 0; i < 6; i++) { pset(x + i, y + i, P.C3); pset(x + 5 - i, y + i, P.C3); } }
}
// ---------------------------------------------------------------- iterative reconstruction (activity estimate on 4 mm cells)
const RCN = { c: 4, x0: -200, y0: -140, gw: 100, gh: 70, a: null, lv: {} };
function pointInPoly(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
function rcnTruth() { // true tracer activity of the slice on the coarse grid (computed once)
  if (RCN.a) return RCN.a;
  const a = new Float32Array(RCN.gw * RCN.gh);
  for (let j = 0; j < RCN.gh; j++) for (let i = 0; i < RCN.gw; i++) {
    const x = RCN.x0 + (i + 0.5) * RCN.c, y = RCN.y0 + (j + 0.5) * RCN.c, inB = pointInPoly(AX.body, x, y);
    if (!inB) continue;
    const code = axTissue(x, y, true, pointInPoly(AX.wall, x, y), pointInPoly(AX.lungR, x, y) || pointInPoly(AX.lungL, x, y));
    a[j * RCN.gw + i] = code === 10 ? 0 : axAct(code, x, y);
  }
  return (RCN.a = a);
}
function boxBlur(src, gw, gh, r) {
  if (r <= 0) return src.slice();
  const tmp = new Float32Array(gw * gh), out = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const ii = i + d; if (ii >= 0 && ii < gw) { s += src[j * gw + ii]; n++; } } tmp[j * gw + i] = s / n; }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const jj = j + d; if (jj >= 0 && jj < gh) { s += tmp[jj * gw + i]; n++; } } out[j * gw + i] = s / n; }
  return out;
}
// activity estimate after "it" iterations: starts uniform and blurry, converges towards the true distribution
function rcnLevel(it) {
  if (RCN.lv[it]) return RCN.lv[it];
  const T = rcnTruth(), r = [0, 9, 5, 3, 1][Math.min(4, it)] || 0;
  let est = it >= 5 ? T.slice() : boxBlur(boxBlur(T, RCN.gw, RCN.gh, r), RCN.gw, RCN.gh, Math.max(0, r - 1));
  if (it === 0) { est = new Float32Array(RCN.gw * RCN.gh); for (let k = 0; k < est.length; k++) est[k] = T[k] > 0 ? 0.12 : 0.04; }
  let mx = 0; for (const v of est) mx = Math.max(mx, v); const gain = it >= 5 ? 1 : 0.95 / Math.max(0.2, mx) * lerp(0.75, 1, Math.min(4, it) / 4);
  for (let k = 0; k < est.length; k++) est[k] = Math.min(1, est[k] * gain);
  return (RCN.lv[it] = est);
}
// draw an estimate (bilinear on the grid) inside rect R through camera cam; mix: 0..1 towards level it+1
function drawEstimate(cam, R, it, mix) {
  const A = rcnLevel(it), B = mix > 0 ? rcnLevel(it + 1) : null, gw = RCN.gw, gh = RCN.gh;
  for (let y = R[1]; y < R[3]; y++) for (let x = R[0]; x < R[2]; x++) {
    const fx = (cam.wx(x + 0.5) - RCN.x0) / RCN.c - 0.5, fy = (cam.wy(y + 0.5) - RCN.y0) / RCN.c - 0.5;
    if (fx < 0 || fy < 0 || fx >= gw - 1 || fy >= gh - 1) { buf[y * W + x] = P.K0; continue; }
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, s = (G) => (G[j * gw + i] * (1 - u) + G[j * gw + i + 1] * u) * (1 - v) + (G[(j + 1) * gw + i] * (1 - u) + G[(j + 1) * gw + i + 1] * u) * v;
    const a = B ? lerp(s(A), s(B), mix) : s(A);
    buf[y * W + x] = a < 0.02 ? P.K0 : heatCol(a, x, y);
  }
}
// ---------------------------------------------------------------- circulation mini-map (coronal body, cm; time-lapse)
const CIRC = new Path([-21.5, 64, -21.2, 52, -19.5, 38, -12, 31.5, -3, 33.5, -1, 42, 1.5, 46, -5, 40.5, -9.5, 41, -4, 39.5, 3, 42.5, 5, 47, 3, 37.5, 1.5, 35, 5.5, 44, 7.2, 48.8]);
function miniMap(x0, y0, w, h, u, t) {
  rect(x0 - 3, y0 - 3, x0 + w + 3, y0 + h + 3, P.K0); frame(x0 - 3, y0 - 3, x0 + w + 3, y0 + h + 3, P.N5);
  const z = Math.min(w / 52, h / 133), cam = new Cam(0, 66, z, x0 + w / 2, y0 + h / 2);
  for (const k of ['head', 'torso', 'armR', 'armL']) poly(cam.pts(BODYP[k]), P.N3);
  disc(cam.x(4.6), cam.y(47.2), 2.2, P.RB2);                                                           // heart
  const L = CIRC.L * clamp(u, 0, 1); let prev = null;
  for (let s = 0; s <= L; s += 1.2) { const q = CIRC.at(s), X = cam.x(q[0]), Y = cam.y(q[1]); if (prev) line(prev[0], prev[1], X, Y, P.TR1); prev = [X, Y]; }
  const q = CIRC.at(L); disc(cam.x(q[0]), cam.y(q[1]), 1.6 + 0.6 * Math.sin(t * 12), P.TR3); pset(cam.x(q[0]), cam.y(q[1]), P.FO2);
}
// ---------------------------------------------------------------- horizontal card turn (nearest-neighbour squash about x = cx)
function squashBlit(src, cx, s) {
  if (s <= 0.01) return;
  for (let x = 0; x < W; x++) { const sx = Math.floor(cx + (x + 0.5 - cx) / s); if (sx < 0 || sx >= W) continue; for (let y = 0; y < H; y++) { const v = src[y * W + sx]; if (v !== P.BG) buf[y * W + x] = v; } }
}
