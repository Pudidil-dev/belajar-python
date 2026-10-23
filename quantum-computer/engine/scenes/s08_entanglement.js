// S08 QUANTUM ENTANGLEMENT (84–99 s): the second drop. Two neighbouring transmons, A and B, joined by a coupler, both
// in |0⟩. A pulse puts A into (|0⟩ + |1⟩)/√2, so the pair is (|00⟩ + |10⟩)/√2. Then two synchronised pulses drive an
// entangling gate through the coupler — a CNOT, flip B if A is 1 — and the |10⟩ amplitude moves into |11⟩:
// (|00⟩ + |11⟩)/√2. The four joint amplitudes are computed (QM.apply1, QM.cnot) and each qubit's own Bloch vector is its
// partial trace (QM.reduced): both shrink to the centre — alone, neither has a definite state; together they always
// match. Nothing travels between them afterwards: they share one state; no signal is sent.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut;
const S5 = window.S05, S6 = window.S06, S7 = window.S07, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const IA = 12, IB = 13, QA = CH.Q[IA], QB = CH.Q[IB], MID = [(QA.x + QB.x) / 2, QA.y];
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const anchor = (A, sx, sy, zmm) => { const z = zmm / MM; return { x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z }; };
const TPA = 0.6, TA0 = 2.0, TA1 = 3.6, TPC = 3.6, TC0 = 5.0, TC1 = 8.0, TO = 11.0;
const camAt = t => {
  if (t < 1.0) { const u = io(t / 1.0); return anchor(room(QA.x, QA.y), lerp(S6.QX, 135 - (MID[0] - QA.x) * 60, u), lerp(S6.QY, 124, u), K.zl(S6.ZQ, 60, u)); }
  const push = K.zl(60, 68, io(clamp((t - 3.6) / 4.4))), k = t > TC1 && t < TC1 + 0.4 ? Math.sin(Math.PI * (t - TC1) / 0.4) * (1 - (t - TC1) / 0.4) : 0;
  const v = io(clamp((t - TO) / 4)); return anchor(room(...MID), 135, lerp(124, 132, v), K.zl(push, 30, v) * (1 + 0.15 * k));
};
const sA = t => io(clamp((t - TA0) / (TA1 - TA0))), sC = t => io(clamp((t - TC0) / (TC1 - TC0)));
const psiAt = t => QM.cnot(QM.apply1(QM.gateU('H', sA(t)), QM.ket00(), 0), sC(t));
window.S08 = { camAt, psiAt, IA, IB, MID };
const dA = CH.drivePath(QA), dB = CH.drivePath(QB), LA = K.polyLen(dA), LB = K.polyLen(dB);
const beat = t => t > TC1 ? Math.pow(1 - K.wrap(t - TC1, 0.5) / 0.5, 3) : 0;      // sync pulse on every beat once entangled
// ---------- overlay: two wires, two reduced Bloch spheres, four joint amplitudes ----------
const WA = 212, WB = 234, XH = 96, XC = 160;
const SA = { cx: 72, cy: 292, R: 32 }, SB = { cx: 198, cy: 292, R: 32 };
const BX = [68, 108, 148, 188], BY = 410, BH = 40, LAB = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
function overlay(c, t) {
  const psi = psiAt(t), gA = t < TA0 - 0.3 ? 0 : t < TA1 ? 0.5 : 1, gC = t < TC0 - 0.3 ? 0 : t < TC1 ? 0.5 : 1;
  BL.wire(c, { x: 34, y: WA, w: 206, label: '|0⟩', gates: [[XH, 'H', gA], [XC, '•', gC]] });
  BL.wire(c, { x: 34, y: WB, w: 206, label: '|0⟩', gates: [[XC, '⊕', gC]] });
  BL.link(c, XC, WA, WB - 5, gC > 0 && gC < 1 ? 'p3' : 'd8');
  PIX.text(c, 'A', 12, WA - 3, 'w'); PIX.text(c, 'B', 12, WB - 3, 'w');
  // each qubit on its own: the partial trace of the pair's state
  const az = 0.45 + 0.12 * t;
  for (const [o, q, lab] of [[SA, 0, 'A'], [SB, 1, 'B']]) {
    BL.sphere(c, { cx: o.cx, cy: o.cy, R: o.R, az, el: 0.5, vec: QM.reduced(psi, q) });
    PIX.text(c, lab, o.cx + (q ? o.R + 6 : -o.R - 11), o.cy - 3, 'w');
  }
  if (t > TC1 - 0.2) { const n = CAP.typed('ON ITS OWN: NO DEFINITE STATE', t, TC1); if (n > 0) { const s = 'ON ITS OWN: NO DEFINITE STATE'; PIX.rect(c, 135 - PIX.textWidth(s) / 2 - 2, 337, PIX.textWidth(s) + 5, 11, 'k'); PIX.text(c, s, 135, 339, 'd8', { align: 'center', n }); } }
  // the pair's four amplitudes; |00⟩ and |11⟩ pulse together once entangled
  const b = beat(t);
  for (let k = 0; k < 4; k++) {
    if (b > 0.05 && (k === 0 || k === 3)) FX.glowL(c, BX[k] + 7, BY - BH * QM.abs(psi[k]), 12 * b + 4, ['p1', 'p2', 'p3'], 0.85 * b, 1.4);
    BL.amp(c, BX[k], BY, BH, psi[k], LAB[k], { bw: 14, prob: true, probCol: QM.abs2(psi[k]) > 0.01 ? 'p3' : 'd6' });
  }
  if (t > TC1) { const a = MO.cubicOut(clamp((t - TC1 - 0.2) / 0.3)), y = BY + 25, x0 = BX[0] + 7, x1 = BX[3] + 7; if (a > 0) { PIX.rect(c, x0, y, 1, 3, 'p2'); PIX.rect(c, x1, y, 1, 3, 'p2'); PIX.rect(c, x0, y + 3, Math.round((x1 - x0) * a), 1, 'p2'); } }
  // the state written out
  const F = (s, t0, t1) => { const n = CAP.typed(s, t, t0, t1); if (n > 0) { const w = PIX.textWidth(s); PIX.rect(c, 135 - w / 2 - 2, 438, w + 5, 11, 'k'); PIX.text(c, s, 135, 440, 'w', { align: 'center', n }); } };
  F('|00⟩', 0.9, TA0 + 0.3); F('(|00⟩+|10⟩)/√2', TA1 + 0.1, TC0 + 0.6); F('(|00⟩+|11⟩)/√2', TC1 + 0.1);
}
// the pair's look on the chip: dimmed surroundings and floor (strength f), state glows and the one-system outline (g)
function decor(c, t, cam, f, g) {
  const zmm = cam.z * MM, [ax, ay] = K.S(cam, ...room(QA.x, QA.y)), [bx, by] = K.S(cam, ...room(QB.x, QB.y)), [mx, my] = K.S(cam, ...room(...MID));
  const u = io(clamp(t / 1.0));                                      // S07's spotlight on A hands over to one around the pair
  FX.spot(c, lerp(ax, mx, u), lerp(ay, my, u), lerp(64, 70 * zmm / 60 + 20, u), lerp(150, 120 * zmm / 60 + 60, u), 0.62 * f);
  { const u = io(clamp(t / 1.0)); FX.fadeBelow(c, lerp(196, 176, u), lerp(236, 206, u), lerp(0.75, 0.8, u) * f); }
  const gA = K.sm(t, TA0, TA1) * (t < TC1 ? 1 : 0.6 + 0.4 * beat(t)) * g, gB = K.sm(t, TC0, TC1) * (0.6 + 0.4 * beat(t)) * g;
  if (gA > 0) FX.glowL(c, ax, ay, 22, ['p0', 'p1', 'p2'], 0.6 * gA, 1.4);
  if (gB > 0) FX.glowL(c, bx, by, 22, ['p0', 'p1', 'p2'], 0.6 * gB, 1.4);
  if (t > TC1 && g > 0) {                                            // one system: a single outline around both, pulsing in time
    const r = Math.max(14, CH.ARM * zmm + 8), a = clamp((t - TC1) / 0.4) * g, col = beat(t) > 0.4 ? 'p3' : 'p2';
    const x0 = Math.round(ax - r), x1 = Math.round(bx + r), y0 = Math.round(ay - r), y1 = Math.round(ay + r), n = Math.round(2 * (x1 - x0 + y1 - y0) * a);
    let k = 0; const dot = (x, y) => { if (k++ < n && k % 3 !== 0) PIX.rect(c, x, y, 1, 1, col); };
    for (let x = x0; x <= x1; x++) dot(x, y0); for (let y = y0; y <= y1; y++) dot(x1, y); for (let x = x1; x >= x0; x--) dot(x, y1); for (let y = y1; y >= y0; y--) dot(x0, y);
  }
  if (g > 0.5) { PIX.text(c, 'A', ax - 3, ay - CH.ARM * zmm - 13, 'w'); PIX.text(c, 'B', bx - 3, by - CH.ARM * zmm - 13, 'w'); }
}
window.S08.decor = decor;
window.S08.overlay = c => { overlay(c, 15); CAP.note(c, 15, { x: 135, y: 458, text: 'ONE SHARED STATE · NO SIGNAL SENT', t0: 11.9, align: 'center', col: 'w', box: true }); };
SC['s08_entanglement'] = {
  draw(c, t, S) {
    const cam = camAt(t), zmm = cam.z * MM;
    const pp = { sig: 0.16, amp: 0.035, lam: 0.06, z: zmm, t };
    FR.chipView(c, cam, S.t, { hl: new Set([IA, IB]), drive: new Set([IA, IB]) }, cc => {
      if (t > TPA && t < TA0 + 0.9) CH.pulse(cc, dA, (t < TA0 ? lerp(LA - 1.45, LA, (t - TPA) / (TA0 - TPA)) : LA + 0.56 * (t - TA0)) / LA, pp);
      if (t > TPC && t < TC0 + 0.9) for (const [d, L] of [[dA, LA], [dB, LB]]) CH.pulse(cc, d, (t < TC0 ? lerp(L - 1.45, L, (t - TPC) / (TC0 - TPC)) : L + 0.56 * (t - TC0)) / L, pp);
    });
    const [ax, ay] = K.S(cam, ...room(QA.x, QA.y)), [bx, by] = K.S(cam, ...room(QB.x, QB.y)), [mx, my] = K.S(cam, ...room(...MID));
    // pulses landing; the coupler during the entangling gate
    const land = (t0, x, y) => { if (t > t0 - 0.35 && t < t0 + 0.5) FX.glowL(c, x, y, 14, ['o0', 'o1', 'o2'], 0.9 * (t < t0 ? K.lin(t, t0 - 0.35, t0) : 1 - (t - t0) / 0.5), 1.3); };
    decor(c, t, cam, 1, 1);
    if (t < 0.6) FX.glowL(c, ax, ay, 30, ['p0', 'p1', 'p2'], 0.6 * (1 - t / 0.6), 1.4);       // S07's state glow on A fades: a new run starts from 00
    if (t > TC1 && t < TC1 + 0.7) for (const [x, y] of [[ax, ay], [bx, by]]) FX.ring(c, x, y, 10 + (t - TC1) * 200, 'p3', 1 - (t - TC1) / 0.7);
    land(TA0, ax - CH.ARM * zmm, ay); land(TC0, ax - CH.ARM * zmm, ay); land(TC0, bx + CH.ARM * zmm, by);
    if (t > TC0 && t < TC1 + 0.4) { const a = Math.sin(Math.PI * clamp((t - TC0) / (TC1 - TC0 + 0.4))), w = 0.6 + 0.4 * Math.sin(t * 18); FX.glowL(c, mx, my, 16, ['b1', 'b2', 'p2', 'p3'], a * w, 1.2); }
    // S07's overlay leaves to the left as this one comes in from the right
    if (t < 0.45) window.shifted(c, S7.overlay, -300 * MO.cubicIn(t / 0.45));
    if (t > 0.3) { if (t < 0.8) window.shifted(c, cc => overlay(cc, t), 300 * (1 - MO.cubicOut((t - 0.3) / 0.5))); else overlay(c, t); }
    CAP.note(c, t, { x: 135, y: 458, text: 'TWO PULSES · ONE ENTANGLING GATE', t0: TC0 + 0.1, t1: TC1 - 0.2, align: 'center', col: 'o2', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'TOGETHER: ALWAYS 00 OR 11', t0: TC1 + 0.9, t1: 11.6, align: 'center', col: 'p3', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'ONE SHARED STATE · NO SIGNAL SENT', t0: 11.9, align: 'center', col: 'w', box: true });
    CAP.scene(c, t, { title: 'QUANTUM ENTANGLEMENT', t0: 0.15, acc: 'p2' });
  },
  cues: () => {
    const q = [[0, 'whoosh', 0.7, 0], [0.15, 'type', 0.4], [TPA, 'riser', 0.5, -0.4, TA0 - TPA], [TA0, 'mw_pulse', 0.9, -0.4], [TA0, 'rot', 0.7, -0.3, TA1 - TA0], [TA1 + 0.1, 'type', 0.3],
      [TPC, 'riser', 0.6, 0, TC0 - TPC], [TC0, 'mw_pulse', 0.9, -0.5], [TC0, 'mw_pulse', 0.9, 0.5], [TC0, 'entangle', 1.0, 0, TC1 - TC0], [TC1, 'lock', 1.0, 0], [TC1 + 0.1, 'type', 0.3]];
    for (let b = TC1 + 0.5; b < 15; b += 0.5) q.push([b, 'sync', 0.45, 0]);
    q.push([TC1 + 0.9, 'type', 0.3], [11.9, 'type', 0.3], [TO, 'pull', 0.5, 0, 4]);
    return q;
  },
};
})();
