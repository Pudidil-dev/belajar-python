// AXI — the axial schematic of S15 and S31: the head's cross-section at the aneurysm's level (from HEAD's tissue classes,
// via G2.head), inside a stationary ivory gantry ring; the X-ray tube and the curved detector arc on a circle round it,
// turning together; the fan beam between them; the detector lit by the transmitted intensity of the real projection at
// that angle (CT.lineInt through the model). Drawn bigger than the true geometry so the head reads at phone size
// (a schematic: the source and detector distances are not to scale).
(() => {
const { W, H, P } = PIX;
const AXI = window.AXI = {};
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
AXI.O = { cx: W / 2, cy: 338, s: 0.98, Rs: 166, Rd: 150, fan: 0.62 };
AXI.cam = (o = AXI.O) => ({ x: 0, y: 0, s: o.s, cx: o.cx, cy: o.cy });
// screen position on the schematic circle at angle beta (0 = tube at the top, turning clockwise as seen from the feet)
AXI.at = (o, beta, R) => [o.cx + R * Math.sin(beta), o.cy - R * Math.cos(beta)];
const NCH = 64;
const profCache = new Map();
AXI.profile = beta => {
  const key = Math.round(beta * 180 / Math.PI * 2);
  if (profCache.has(key)) return profCache.get(key);
  const b = key / 2 * Math.PI / 180, p = new Float32Array(NCH);
  for (let j = 0; j < NCH; j++) p[j] = CT.lineInt(b, (j + 0.5 - NCH / 2) * (2 * CT.FAN / NCH), 1.4);
  if (profCache.size > 800) profCache.clear(); profCache.set(key, p); return p;
};
AXI.NCH = NCH;
AXI.ring = (c, o = AXI.O, a = 1) => {
  c.save(); c.globalAlpha *= a;
  const R0 = o.Rs + 14, R1 = o.Rs + 26;
  for (let y = Math.floor(o.cy - R1); y <= o.cy + R1; y++) for (let x = Math.floor(o.cx - R1); x <= o.cx + R1; x++) {
    const r = Math.hypot(x + 0.5 - o.cx, y + 0.5 - o.cy); if (r < R0 || r > R1 || x < 0 || x >= W || y < 0 || y >= H) continue;
    const top = (o.cy - y) / R1, col = r > R1 - 2 ? 'q2' : r < R0 + 2 ? 'q3' : top + K.BAY(x, y) * 0.5 > 0.4 ? 'q5' : 'q4';
    c.fillStyle = P[col]; c.fillRect(x, y, 1, 1);
  }
  c.restore();
};
// the rotating parts: tube (slate housing, ivory cap), fan (dithered yellow wedge + edges), detector arc (green elements
// lit by the transmission; dark where the head absorbed most)
AXI.parts = (c, beta, o = AXI.O, op = {}) => {
  const [sx, sy] = AXI.at(o, beta, o.Rs), p = op.lit !== false ? AXI.profile(beta) : null;
  const A = AXI.at(o, beta + Math.PI - o.fan / 2 * 1.0, o.Rd), B = AXI.at(o, beta + Math.PI + o.fan / 2 * 1.0, o.Rd);
  // fan: rays from the source to the arc (ordered dither), only if fan > 0
  const fa = op.fan ?? 1;
  if (fa > 0) {
    const img = c.getImageData(0, 0, W, H), d = img.data, cy_ = PIX.hex(P.y2);
    const x0 = Math.max(0, Math.floor(Math.min(sx, A[0], B[0]))), x1 = Math.min(W, Math.ceil(Math.max(sx, A[0], B[0]))), y0 = Math.max(0, Math.floor(Math.min(sy, A[1], B[1]))), y1 = Math.min(H, Math.ceil(Math.max(sy, A[1], B[1])));
    const sgn = (p_, q, r) => (q[0] - p_[0]) * (r[1] - p_[1]) - (q[1] - p_[1]) * (r[0] - p_[0]), S0 = [sx, sy], s0 = sgn(S0, A, B);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const Q = [x + 0.5, y + 0.5];
      if (Math.sign(sgn(S0, A, Q)) !== Math.sign(s0) || Math.sign(sgn(A, B, Q)) !== Math.sign(s0) || Math.sign(sgn(B, S0, Q)) !== Math.sign(s0)) continue;
      if (Math.hypot(Q[0] - o.cx, Q[1] - o.cy) > o.Rd + 1) continue;
      if (K.BAY(x, y) > 0.13 * fa) continue;
      const i = (y * W + x) * 4; d[i] = cy_[0]; d[i + 1] = cy_[1]; d[i + 2] = cy_[2];
    }
    c.putImageData(img, 0, 0);
    c.save(); c.globalAlpha = fa; PIX.bline(c, sx, sy, A[0], A[1], 'y3'); PIX.bline(c, sx, sy, B[0], B[1], 'y3'); c.restore();
  }
  // detector arc: NCH elements on the circle of radius Rd, opposite the tube
  for (let j = 0; j < NCH; j++) {
    const u = (j + 0.5) / NCH, an = beta + Math.PI + (u - 0.5) * o.fan, T = p ? Math.exp(-p[NCH - 1 - j]) : 1;
    const [x, y] = AXI.at(o, an, o.Rd + 5), [x2, y2] = AXI.at(o, an, o.Rd + 11);
    const col = op.lit === false ? 'e1' : T > 0.6 ? 'e3' : T > 0.25 ? 'e2' : T > 0.08 ? 'e1' : 'e0';
    PIX.bline(c, x, y, x2, y2, col);
    if (op.bars) { const L = 6 + 30 * T, [x3, y3] = AXI.at(o, an, o.Rd + 14 + L); PIX.bline(c, x2, y2, x3, y3, T > 0.5 ? 'b3' : 'b1'); }
  }
  // the tube: a slate housing with an ivory cap, the focal spot facing the centre
  c.save(); c.translate(Math.round(sx), Math.round(sy)); c.rotate(beta);
  PIX.flat(c, PIX.rectPath(-15, -16, 30, 20, 4), 'g4', 'g2', 'g6'); PIX.rect(c, -15, -16, 30, 4, 'q5'); PIX.rect(c, -4, 3, 8, 4, 'g3'); PIX.rect(c, -1, 6, 2, 2, 'y3');
  c.restore();
  return { sx, sy, A, B };
};
// the head: the illustrated cross-section (tissue classes) at the slice, with an optional colour for the artery lumen
AXI.head = (c, o = AXI.O, op = {}) => G2.head(c, AXI.cam(o), op);
})();
