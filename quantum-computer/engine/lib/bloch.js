// BL — quantum graphics in screen pixels: the Bloch sphere (3D wireframe, state vector, trail), amplitude columns with
// phase arrows, joint two-qubit bars, and quantum-circuit notation. Purple = quantum state, as in the brief.
(() => {
const { P, W, H } = PIX;
const BL = window.BL = {};
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// view: azimuth az (spin about z), elevation el (look from slightly above). Returns [sx, sy, depth] (depth < 0 = front)
BL.proj = (o, v) => {
  const [x, y, z] = v, ca = Math.cos(o.az || 0), sa = Math.sin(o.az || 0), ce = Math.cos(o.el ?? 0.32), se = Math.sin(o.el ?? 0.32);
  const x1 = x * ca + y * sa, y1 = -x * sa + y * ca;
  const d = y1 * ce - z * se, zz = y1 * se + z * ce;
  return [o.cx + o.R * x1, o.cy - o.R * zz, d];
};
const dot = (c, x, y, col) => { c.fillStyle = P[col] || col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
// great circle through unit vectors u, v; front and back halves in different colours
function circle(c, o, u, v, colF, colB, step = 1) {
  const n = Math.max(48, Math.round(o.R * 6.3));
  for (let k = 0; k < n; k += step) {
    const t = k / n * TAU, p = [u[0] * Math.cos(t) + v[0] * Math.sin(t), u[1] * Math.cos(t) + v[1] * Math.sin(t), u[2] * Math.cos(t) + v[2] * Math.sin(t)];
    const [sx, sy, d] = BL.proj(o, p);
    if (d > 0) { if (colB && k % 2 === 0) dot(c, sx, sy, colB); } else if (colF) dot(c, sx, sy, colF);
  }
}
function line3(c, o, a, b, col, dash = 0) {
  const [x0, y0] = BL.proj(o, a), [x1, y1] = BL.proj(o, b); PIX.bline(c, x0, y0, x1, y1, col, dash);
}
// thick arrow in screen space with a head
BL.arrow = (c, x0, y0, x1, y1, col = 'p2', hi = 'p3', head = 5, thick = 2) => {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const ex = x1 - Math.cos(a) * head * 0.6, ey = y1 - Math.sin(a) * head * 0.6;
  for (let k = 0; k < thick; k++) { const ox = Math.round(-Math.sin(a) * (k - (thick - 1) / 2)), oy = Math.round(Math.cos(a) * (k - (thick - 1) / 2)); PIX.bline(c, x0 + ox, y0 + oy, ex + ox, ey + oy, k === 0 ? hi : col); }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col] || col; c.beginPath();
  c.moveTo(x1, y1); c.lineTo(x1 - Math.cos(a - 0.5) * head, y1 - Math.sin(a - 0.5) * head); c.lineTo(x1 - Math.cos(a + 0.5) * head, y1 - Math.sin(a + 0.5) * head); c.closePath(); c.fill(); c.restore();
};
// o = {cx, cy, R, az, el, vec ([x,y,z], may be shorter than 1), trail: [[x,y,z]…], a, labels, glow, col}
BL.sphere = (c, o) => {
  const a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  // body: a dark disc that hides what is behind it, lit from the upper left by a dithered purple sheen
  PIX.circ(c, o.cx, o.cy, o.R, 'd0');
  c.restore();
  FX.glowL(c, o.cx - o.R * 0.38, o.cy - o.R * 0.42, o.R * 1.05, ['p0'], 0.62 * a, 0.7);
  c.save(); c.globalAlpha = a;
  c.fillStyle = P.d5; for (let k = 0; k < 360; k++) { const t = k / 360 * TAU; c.fillRect(Math.round(o.cx + Math.cos(t) * o.R), Math.round(o.cy + Math.sin(t) * o.R), 1, 1); }
  // wireframe: equator, two meridians (x–z and y–z planes)
  circle(c, o, [1, 0, 0], [0, 1, 0], 'd6', 'd3');
  circle(c, o, [1, 0, 0], [0, 0, 1], 'd5', 'd3', 2);
  circle(c, o, [0, 1, 0], [0, 0, 1], 'd5', 'd3', 2);
  // axes
  line3(c, o, [0, 0, -1.12], [0, 0, 1.12], 'd6', 1); line3(c, o, [-1.12, 0, 0], [1.12, 0, 0], 'd4', 1); line3(c, o, [0, -1.12, 0], [0, 1.12, 0], 'd4', 1);
  if (o.labels !== false) {
    const [nx, ny] = BL.proj(o, [0, 0, 1.2]), [sx, sy] = BL.proj(o, [0, 0, -1.2]);
    PIX.text(c, '|0⟩', nx, ny - 9, 'w', { align: 'center' }); PIX.text(c, '|1⟩', sx, sy + 2, 'w', { align: 'center' });
    if (o.axisLabels) { const [px, py] = BL.proj(o, [1.25, 0, 0]); PIX.text(c, 'x', px - 2, py - 3, 'd7', { shadow: null }); const [qx, qy] = BL.proj(o, [0, 1.25, 0]); PIX.text(c, 'y', qx - 2, qy - 3, 'd7', { shadow: null }); }
  }
  // trail of the tip
  if (o.trail) o.trail.forEach((v, i) => { const [x, y, d] = BL.proj(o, v); if (i % 2 === 0) dot(c, x, y, d > 0 ? 'p1' : i < o.trail.length * 0.4 ? 'p3' : 'p2'); });
  // state vector
  if (o.vec) {
    const L = Math.hypot(...o.vec), [x0, y0] = BL.proj(o, [0, 0, 0]), [x1, y1, d] = BL.proj(o, o.vec);
    if (L > 0.04) {
      BL.arrow(c, x0, y0, x1, y1, d > 0.3 ? 'p1' : 'p2', d > 0.3 ? 'p2' : 'p3', Math.max(4, o.R * 0.14 * Math.min(1, L * 1.3)), o.R > 40 ? 2 : 1);
      if (o.glow !== false && L > 0.5) { c.restore(); FX.glowL(c, x1, y1, o.R * 0.22, ['p0', 'p1', 'p2'], 0.9 * a, 1.6); c.save(); c.globalAlpha = a; }
      c.fillStyle = P.w; c.fillRect(Math.round(x1), Math.round(y1), 1, 1);
    } else { c.fillStyle = P.p2; c.fillRect(Math.round(x0) - 1, Math.round(y0) - 1, 3, 3); }
  }
  c.restore();
};
// one amplitude column: label, bar (|a|), phase arrow in a small dial, probability text
BL.amp = (c, x, y, h, amp, label, o = {}) => {
  const m = QM.abs(amp), ph = QM.arg(amp), bw = o.bw || 10, a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x, y - h, bw, h, 'd1'); PIX.rect(c, x, y, bw, 1, 'd5');
  const hh = Math.round(h * m);
  if (hh > 0) { PIX.rect(c, x, y - hh, bw, hh, o.col || 'p1'); PIX.rect(c, x, y - hh, bw, 1, 'p3'); PIX.rect(c, x, y - hh, 1, hh, 'p2'); }
  // phase dial above the bar: arrow length = |a|, direction = phase (0 = right, π = left)
  const dx = x + bw / 2, dy = y - h - 12, r = 7;
  c.fillStyle = P.d3; for (let k = 0; k < 40; k++) { const t = k / 40 * TAU; c.fillRect(Math.round(dx + Math.cos(t) * r), Math.round(dy + Math.sin(t) * r), 1, 1); }
  if (m > 0.02) BL.arrow(c, dx, dy, dx + Math.cos(-ph) * r * m, dy + Math.sin(-ph) * r * m, 'p2', 'p3', 3, 1);
  PIX.text(c, label, x + bw / 2, y + 4, 'w', { align: 'center' });
  if (o.prob) PIX.text(c, `${Math.round(m * m * 100)}%`, x + bw / 2, y + 14, o.probCol || 'd8', { align: 'center' });
  c.restore();
};
// quantum circuit: a wire with gate boxes; o = {x, y, w, label, gates: [[x, 'H', state]], a}; state: 0 idle, 0..1 active, 1 done
BL.wire = (c, o) => {
  const a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, o.x, o.y, o.w, 1, 'd5');
  if (o.label) PIX.text(c, o.label, o.x - 3, o.y - 3, 'd9', { align: 'right' });
  for (const g of o.gates || []) {
    const [gx, name, st] = g, s = 12, act = st > 0 && st < 1;
    if (name === '•') { PIX.circ(c, gx, o.y + 0.5, 2.6, act ? 'p3' : 'd8'); continue; }
    if (name === '⊕') { PIX.circ(c, gx, o.y + 0.5, 5, act ? 'p2' : 'd6'); PIX.circ(c, gx, o.y + 0.5, 4, 'k'); PIX.rect(c, gx - 4, o.y, 9, 1, act ? 'p3' : 'd8'); PIX.rect(c, gx, o.y - 4, 1, 9, act ? 'p3' : 'd8'); continue; }
    if (name === 'M') {                                                           // measurement meter
      PIX.rect(c, gx - 7, o.y - 6, 14, 12, act ? 'e1' : 'd3'); PIX.rect(c, gx - 6, o.y - 5, 12, 10, 'k');
      for (let k = 0; k <= 8; k++) { const t = Math.PI + k / 8 * Math.PI; c.fillStyle = P.d8; c.fillRect(Math.round(gx + Math.cos(t) * 4), Math.round(o.y + 3 + Math.sin(t) * 4), 1, 1); }
      PIX.bline(c, gx, o.y + 3, gx + 3, o.y - 2, act ? 'e2' : 'd8'); continue;
    }
    PIX.rect(c, gx - s / 2 - 1, o.y - s / 2 - 1, s + 2, s + 2, act ? 'p3' : st >= 1 ? 'p1' : 'd4');
    PIX.rect(c, gx - s / 2, o.y - s / 2, s, s, act ? 'p1' : 'k');
    PIX.text(c, name, gx + 0.5, o.y - 3, act ? 'w' : st >= 1 ? 'p3' : 'd9', { align: 'center', shadow: null });
  }
  c.restore();
};
// vertical link between two wires (CNOT)
BL.link = (c, x, y0, y1, col = 'd8') => PIX.rect(c, x, Math.min(y0, y1), 1, Math.abs(y1 - y0), col);
})();
