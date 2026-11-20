// QV — the single-qubit view shared by S06 and S07, everything computed from the state vector:
// the circuit wire with its gates, the Bloch sphere (the rotation axis of the gate in progress, the path of the tip),
// the two amplitude columns (height = |amplitude|, dial = its phase), the state written out, and what a measurement
// would give. Screen layout for the 270 × 480 portrait frame: hardware above y ≈ 232, this view below.
(() => {
const QV = window.QV = {};
const lerp = U.lerp, clamp = U.clamp;
QV.WIRE = { x: 34, y: 250, w: 220 };
QV.SPH = { cx: 112, cy: 362, R: 66 };
QV.BARS = { x0: 200, x1: 232, y: 392, h: 60, bw: 14 };
QV.EL = 0.62;                                                   // looking down on the equator, so turns about z read clearly
QV.AXES = { H: [Math.SQRT1_2, 0, Math.SQRT1_2], Z: [0, 0, 1], X: [1, 0, 0] };
// dashed rotation axis through the sphere (o = sphere options)
QV.axis = (c, o, n, a = 1, col = 'o2') => {
  if (a <= 0) return;
  const [x0, y0] = BL.proj(o, [-1.25 * n[0], -1.25 * n[1], -1.25 * n[2]]), [x1, y1] = BL.proj(o, [1.25 * n[0], 1.25 * n[1], 1.25 * n[2]]);
  c.save(); c.globalAlpha = a; PIX.bline(c, x0, y0, x1, y1, col, 1); PIX.rect(c, Math.round(x1) - 1, Math.round(y1) - 1, 3, 3, col); c.restore();
};
// the equator drawn bright: every state on it measures 50 / 50; front half solid, back half dotted
QV.equator = (c, so, a = 1) => {
  if (a <= 0) return;
  const n = Math.max(60, Math.round(so.R * 6.3));
  for (let k = 0; k < n; k++) {
    const th = k / n * U.TAU, [x, y, d] = BL.proj(so, [Math.cos(th), Math.sin(th), 0]);
    if (d > 0 && k % 2) continue;
    if (U.hash(k, 5) < a) PIX.rect(c, Math.round(x), Math.round(y), 1, 1, d > 0 ? 'p1' : 'p2');
  }
};
// o = {psi, az, R, cx, cy, trail: [vec], axis: [n, a], a, labels}
QV.sphere = (c, o) => {
  const so = { cx: o.cx ?? QV.SPH.cx, cy: o.cy ?? QV.SPH.cy, R: o.R ?? QV.SPH.R, az: o.az, el: o.el ?? QV.EL, vec: o.vec || QM.bloch(o.psi), trail: o.trail, a: o.a ?? 1, labels: o.labels };
  BL.sphere(c, so);
  if (o.axis) QV.axis(c, so, o.axis[0], o.axis[1]);
  return so;
};
// amplitude columns for |0⟩ and |1⟩; o = {prob: show percentages, a}
QV.bars = (c, psi, o = {}) => {
  const B = QV.BARS, a = o.a ?? 1;
  BL.amp(c, B.x0, B.y, B.h, psi[0], '|0⟩', { bw: B.bw, prob: o.prob, a, col: o.col0 });
  BL.amp(c, B.x1, B.y, B.h, psi[1], '|1⟩', { bw: B.bw, prob: o.prob, a, col: o.col1 });
};
// the state written under the columns
QV.formula = (c, s, t, t0, t1, y = 424, col = 'w') => {
  const n = CAP.typed(s, t, t0, t1); if (n <= 0) return;
  const x = (QV.BARS.x0 + QV.BARS.x1 + QV.BARS.bw) / 2, w = PIX.textWidth(s);
  PIX.rect(c, Math.round(x - w / 2) - 2, y - 2, w + 5, 11, 'k'); PIX.text(c, s, x, y, col, { align: 'center', n });
};
// circuit wire: input label, gates [[x, name, state]] (state 0 idle, 0..1 running, 1 done), drawn on from the left
QV.wire = (c, t, t0, gates, label = '|0⟩') => {
  const p = MO.cubicOut(clamp((t - t0) / 0.35)); if (p <= 0) return;
  const W_ = QV.WIRE;
  BL.wire(c, { x: W_.x, y: W_.y, w: Math.round(W_.w * p), label: p > 0.5 ? label : '', gates: gates.filter(g => g[0] < W_.x + W_.w * p) });
};
})();
