// CHIP — the superconducting processor, top view, in millimetres (origin at the chip centre).
// A 10 mm silicon die with an aluminium ground plane (dark blue). 25 cross-shaped transmon qubits (Xmons) sit on a
// 5×5 grid with couplers between neighbours. Each qubit has a quarter-wave readout resonator (meander) hanging off a
// feedline and its own microwave drive line from the edge; bond pads and wire bonds connect it to the package.
// Superconducting circuit metal is blue (the brief). Detail appears with zoom (o.z = px per mm).
(() => {
const { P } = PIX;
const CH = window.CH = {};
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const N = 5, PITCH = 1.3, ARM = 0.42, AW = 0.07, GAP = 0.03;
CH.N = N; CH.PITCH = PITCH; CH.ARM = ARM; CH.AW = AW; CH.GAP = GAP;
CH.JY = q => q.y + ARM + GAP * 0.45;                       // y of the junction's crossing point under qubit q
CH.Q = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) CH.Q.push({ i, j, x: (i - (N - 1) / 2) * PITCH, y: (j - (N - 1) / 2) * PITCH + 0.35 });
CH.q = (i, j) => CH.Q[j * N + i];
const F = (c, p, col, a) => PIX.fill(c, p, col, a);
const rr = (x, y, w, hh, r = 0) => PIX.rectPath(x, y, w, hh, r);
// cross shape (plus) centred at x, y
const cross = (x, y, a, w) => { const p = new Path2D(); p.rect(x - a, y - w / 2, 2 * a, w); p.rect(x - w / 2, y - a, w, 2 * a); return p; };
// readout resonator path for qubit q: up from the top arm, meandering to the feedline at the top or bottom edge
CH.resPath = q => {
  const top = q.j <= 2, sgn = top ? -1 : 1, x0 = q.x + 0.18, y0 = q.y + sgn * (ARM + 0.08), pts = [[x0, y0]];
  const yF = top ? -4.3 : 4.65, n = 5, span = Math.abs(yF - y0) - 0.15;
  for (let k = 0; k < n; k++) { const ya = y0 + sgn * span * (k / n), yb = y0 + sgn * span * ((k + 0.5) / n), dx = k % 2 ? -0.14 : 0.14; pts.push([x0 + dx, ya], [x0 + dx, yb], [x0 - dx, yb], [x0 - dx, y0 + sgn * span * ((k + 1) / n)]); }
  pts.push([x0, yF]);
  return pts;
};
// drive line for qubit q: from the left/right chip edge to just short of the qubit's side arm
CH.drivePath = q => {
  const left = q.i <= 2, xs = left ? -4.7 : 4.7, xe = q.x + (left ? -(ARM + 0.06) : ARM + 0.06), yq = q.y - 0.18;
  return [[xs, yq + (q.j - 2) * 0.05], [lerp(xs, xe, 0.4), yq + (q.j - 2) * 0.05], [lerp(xs, xe, 0.6), yq], [xe, yq]];
};
const poly = (c, pts, col, w) => { c.save(); c.strokeStyle = P[col] || col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore(); };
// o = {z (px/mm), t, hl: Set of highlighted qubit indices, dim (0..1 fade of the rest), state: q → colour key for a state glow}
CH.draw = (c, o = {}) => {
  const z = o.z || 20, px = 1 / z;                         // one screen pixel in mm
  // die, ground plane, bond pads
  F(c, rr(-5.2, -5.2, 10.4, 10.4, 0.1), 'd2');
  F(c, rr(-5, -5, 10, 10, 0.05), 'b0');
  if (z > 25) { c.save(); c.fillStyle = P.d1; for (let y = -4.9; y < 5; y += Math.max(0.12, 3 * px)) for (let x = -4.9; x < 5; x += Math.max(0.12, 3 * px)) if (h(Math.round(x * 50), Math.round(y * 50)) < 0.04) c.fillRect(x, y, px, px); c.restore(); }
  for (let k = 0; k < 12; k++) for (const s of [-1, 1]) { const u = lerp(-4.2, 4.2, k / 11); F(c, rr(u - 0.22, s * 4.9 - 0.22, 0.44, 0.44, 0.04), 'y2'); F(c, rr(s * 4.9 - 0.22, u - 0.22, 0.44, 0.44, 0.04), 'y2'); }
  // feedlines (top and bottom), resonators, drive lines
  const lw = Math.max(0.035, 1.2 * px);
  for (const y of [-4.3, 4.65]) { poly(c, [[-4.9, y], [4.9, y]], 'k', 0.16); poly(c, [[-4.9, y], [4.9, y]], 'b2', 0.07); }
  for (const q of CH.Q) {
    const rp = CH.resPath(q);
    if (z > 6) { poly(c, rp, 'k', Math.max(0.07, 2.4 * px)); poly(c, rp, 'b1', lw); }
    const dp = CH.drivePath(q);
    if (o.drive && o.drive.has(CH.Q.indexOf(q))) { poly(c, dp, 'k', Math.max(0.09, 5 * px)); poly(c, dp, 'b2', Math.max(0.04, 2.4 * px)); poly(c, dp, 'b3', Math.max(0.012, 0.9 * px)); }
    else if (z > 6) { poly(c, dp, 'k', Math.max(0.06, 2 * px)); poly(c, dp, 'b1', lw * 0.8); }
  }
  // couplers between neighbours
  for (const q of CH.Q) {
    if (q.i < N - 1) { const x = q.x + PITCH / 2; F(c, rr(x - 0.24, q.y - 0.05, 0.48, 0.1, 0.02), 'k'); F(c, rr(x - 0.2, q.y - 0.03, 0.4, 0.06, 0.02), 'b1'); }
    if (q.j < N - 1) { const y = q.y + PITCH / 2; F(c, rr(q.x - 0.05, y - 0.24, 0.1, 0.48, 0.02), 'k'); F(c, rr(q.x - 0.03, y - 0.2, 0.06, 0.4, 0.02), 'b1'); }
  }
  // qubits: a gap around each cross, the cross pads, the junction at the bottom arm
  for (const [k, q] of CH.Q.entries()) {
    const hl = o.hl && o.hl.has(k), dim = o.dim && !hl ? o.dim : 0;
    F(c, cross(q.x, q.y, ARM + GAP, AW + 2 * GAP), 'k');
    F(c, cross(q.x, q.y, ARM, AW), 'b2');
    // highlight along the arms: a fraction of the arm width when small, at most 2 screen px when zoomed in
    const hw = Math.min(AW * 0.4, 2 * px), ho = Math.min(AW * 0.18, AW / 2 - hw / 2 - px);
    if (z > 30) F(c, cross(q.x - ho, q.y - ho, ARM * 0.96, hw), 'b3');
    if (hl && z > 30) F(c, cross(q.x - ho, q.y - ho, ARM * 0.9, Math.min(AW * 0.12, px)), 'w');
    // the Josephson junction: two thin aluminium leads crossing in the gap below the bottom arm — one from the pad,
    // one from the ground plane; where they overlap (a fraction of a µm²) a 1.5 nm oxide separates them
    if (z > 60) {
      const ya = q.y + ARM, yg = ya + GAP, yc = CH.JY(q), w = Math.max(0.0006, px), xb = q.x + 0.008;
      F(c, rr(q.x - 0.003, ya - 0.001, 0.006, 0.004, 0), 'b2'); F(c, rr(xb - 0.003, yg - 0.003, 0.006, 0.004, 0), 'b2');   // tabs
      F(c, rr(q.x - w / 2, ya, w, yc - ya + w / 2), 'b2');
      F(c, rr(xb - w / 2, yc - w / 2, w, yg - yc + w / 2), 'b2'); F(c, rr(q.x - w / 2, yc - w / 2, xb - q.x + w / 2, w), 'b2');
      F(c, rr(q.x - w / 2, yc - w / 2, w, w), z > 3000 ? 'w' : 'b3');
    }
    if (o.state && o.state(k)) FX.glowW(c, q.x, q.y, ARM * 1.4, ['p0', 'p1', 'p2'], o.state(k), 1.4);
    if (dim > 0) { c.save(); c.globalAlpha = dim; F(c, rr(q.x - PITCH / 2, q.y - PITCH / 2, PITCH, PITCH, 0), 'k'); c.restore(); }
  }
  // wire bonds over the edge (only from far away)
  if (z < 40) for (let k = 0; k < 12; k++) for (const s of [-1, 1]) { const u = lerp(-4.2, 4.2, k / 11); PIX.line(c, u, s * 4.9, u, s * 5.8, 'd8', Math.max(0.05, 0.8 * px)); PIX.line(c, s * 4.9, u, s * 5.8, u, 'd8', Math.max(0.05, 0.8 * px)); }
};
// a microwave pulse travelling along a path (screen-independent, in mm): Gaussian envelope × carrier, drawn as
// orange dots offset across the line. p = 0..1 position of the envelope centre along the path.
CH.pulse = (c, pts, p, o = {}) => {
  const L = K.polyLen(pts), cx = p * L, sig = o.sig || 0.35, amp = o.amp || 0.09, lam = o.lam || 0.12, z = o.z || 30;
  c.save();
  for (let d = Math.max(0, cx - 3 * sig); d < Math.min(L, cx + 3 * sig); d += 0.6 / z) {
    const e = Math.exp(-0.5 * ((d - cx) / sig) ** 2), [x, y] = K.along(pts, d), [x2, y2] = K.along(pts, Math.min(L, d + 0.01));
    const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1, off = amp * e * Math.sin(TAU * d / lam - (o.t || 0) * 20);
    c.fillStyle = P[e > 0.6 ? 'o2' : 'o1']; c.fillRect(x + nx / nl * off - 0.6 / z, y + ny / nl * off - 0.6 / z, 1.3 / z, 1.3 / z);
  }
  c.restore();
};
})();
