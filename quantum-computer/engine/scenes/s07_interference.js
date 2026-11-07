// S07 QUANTUM INTERFERENCE (70–84 s): H → Z → H. The Z gate turns the vector half way round the equator: the |1⟩
// amplitude keeps its size but its phase flips, (|0⟩ − |1⟩)/√2 — the same 50/50 odds, opposite phase. The camera orbits
// to watch the second H, driven by a second microwave pulse. Why it lands on |1⟩: H feeds each input amplitude into
// both outputs; into |0⟩ arrive +1/2 and −1/2, which cancel; into |1⟩ arrive +1/2 and +1/2, which add. Undo the phase
// flip and the same paths add up the other way, back to |0⟩: the phase, not chance, decides the outcome.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, TAU = U.TAU;
const S5 = window.S05, S6 = window.S06;
const PLUS = QM.gate('H', QM.ket0(), 1), MINUS = QM.gate('Z', PLUS, 1);
const TZ0 = 0.4, TZ1 = 2.6, TO0 = 3.6, TO1 = 4.6, TP0 = 3.4, TH0 = 5.0, TH1 = 8.0, TC0 = 10.2, TC1 = 11.0, TB0 = 12.2, TB1 = 12.8;
const sZ = t => io(clamp((t - TZ0) / (TZ1 - TZ0))), sH = t => io(clamp((t - TH0) / (TH1 - TH0)));
const psiAt = t => t < TH0 ? QM.gate('Z', PLUS, sZ(t)) : QM.gate('H', MINUS, sH(t));
const AZ_H = 3.62;
const azAt = t => t < TO0 ? S6.AZ_Z : t < TO1 ? lerp(S6.AZ_Z, AZ_H, io((t - TO0) / (TO1 - TO0))) : AZ_H + 0.04 * (t - TO1);
const SP = S6.sphAt(15);
// the |1⟩ input's phase in the diagram: π (after Z); briefly 0 (what H → H would see), then π again
const inPhase = t => Math.PI * (1 - io(clamp((t - TC0) / (TC1 - TC0))) + io(clamp((t - TB0) / (TB1 - TB0))));
window.S07 = { psiAt, azAt, SP };
// S07's overlay as it ends (wire, sphere at |1⟩, columns) — S08 slides it out
window.S07.overlay = c => {
  QV.wire(c, 30, 0, [[96, 'H', 1], [140, 'Z', 1], [184, 'H', 1]]);
  QV.sphere(c, { psi: psiAt(14), az: azAt(14), cx: SP.cx, cy: SP.cy, R: SP.R });
  QV.bars(c, psiAt(14), { prob: true }); QV.formula(c, '|1⟩', 30, 0);
  PIX.text(c, 'IF MEASURED', (QV.BARS.x0 + QV.BARS.x1 + QV.BARS.bw) / 2, 438, 'd8', { align: 'center' });
  CAP.note(c, 14, { x: 135, y: 458, text: 'THE PHASE DECIDES THE RESULT', t0: 12.9, align: 'center', col: 'w', box: true });
};

// ---------- the interference diagram: amplitudes as arrows (length = size, direction = phase) ----------
const CD = { x: 10, y: 58, w: 250, h: 172 }, Y0 = 102, Y1 = 166, XI = 50, XO = 156, LEN = 34, RX = 204;
const arrow = (c, x, y, z, col, hi) => {                              // phasor z (complex) from (x, y), LEN px per unit
  const dx = z[0] * LEN, dy = -z[1] * LEN, L = Math.hypot(dx, dy); if (L < 1.5) return [x, y];
  BL.arrow(c, x, y, x + dx, y + dy, col, hi, 5, 2); return [x + dx, y + dy];
};
function diagram(c, t) {
  const g = MO.cubicOut(clamp((t - 5.35) / 0.3)); if (g <= 0) return;
  const out = t > 12.9 ? MO.cubicIn(clamp((t - 12.9) / 0.35)) : 0, oy = Math.round(-250 * out) + Math.round(-(1 - g) * 250);
  PIX.rect(c, CD.x, CD.y + oy, CD.w, CD.h, 'd3'); PIX.rect(c, CD.x + 1, CD.y + 1 + oy, CD.w - 2, CD.h - 2, 'k');
  const T = (s, x, y, col, t0, o = {}) => { const n = CAP.typed(s, t, t0, o.t1); if (n > 0) PIX.text(c, s, x, y + oy, col, Object.assign({ n }, o)); };
  if (t < TC0 - 0.1 || t > TB1 + 0.3) T('THE SECOND H: AMPLITUDES COMBINE', CD.x + 6, CD.y + 6, 'd8', t > TB1 ? TB1 + 0.3 : 5.6);
  const ph = inPhase(t), a0 = [Math.SQRT1_2, 0], a1 = QM.sc(QM.cis(ph), Math.SQRT1_2);
  // contributions (H = [[1, 1], [1, −1]]/√2): into |0⟩: a0/√2, a1/√2; into |1⟩: a0/√2, −a1/√2
  const C = [[QM.sc(a0, Math.SQRT1_2), QM.sc(a1, Math.SQRT1_2)], [QM.sc(a0, Math.SQRT1_2), QM.sc(a1, -Math.SQRT1_2)]];
  // inputs
  for (const [k, y, a] of [[0, Y0, a0], [1, Y1, a1]]) {
    T(`|${k}⟩`, CD.x + 6, y - 3, 'w', 5.7);
    if (t > 5.8) { PIX.circ(c, XI, y + oy, 2, 'p1'); arrow(c, XI, y + oy, a, 'p2', 'p3'); }
  }
  T(t < TC0 || t > TB1 ? '−1/√2' : t < TC1 ? '' : '+1/√2', CD.x + 6, Y1 + 9, t > TC1 && t < TB0 ? 'y3' : 'd8', 5.9);
  T('+1/√2', CD.x + 6, Y0 + 9, 'd8', 5.9);
  // paths, drawn on
  const pd = clamp((t - 5.9) / 0.4);
  const P = [[XI + 14, Y0, XO - 16, Y0], [XI + 14, Y0, XO - 16, Y1], [XI + 14, Y1, XO - 16, Y0], [XI + 14, Y1, XO - 16, Y1]];
  if (pd > 0) for (const [x0, y0, x1, y1] of P) PIX.bline(c, x0, y0 + oy, lerp(x0, x1, pd), lerp(y0, y1, pd) + oy, 'd5', 1);
  if (pd >= 1) { PIX.text(c, '×(−1)', (XI + XO) / 2 + 14, Y1 + 5 + oy, 'o2', { shadow: null }); }
  // contributions travel along the paths (6.3 → 7.3), then stack head to tail at each output (7.3 → 7.8)
  const tr = io(clamp((t - 6.3) / 1.0)), st = io(clamp((t - 7.3) / 0.5));
  if (t > 6.3) for (const j of [0, 1]) {
    const yO = j ? Y1 : Y0;
    const pos = i => { const yIn = i ? Y1 : Y0; return [lerp(XI, XO, tr), lerp(yIn, yO, tr)]; };
    // the first contribution sits at the output; the second slides from the output to the first one's head
    const [x0, y0] = pos(0), [x1, y1] = pos(1), hx = XO + C[j][0][0] * LEN, hy = yO - C[j][0][1] * LEN;
    arrow(c, x0, y0 + oy, C[j][0], 'p2', 'p3');
    arrow(c, lerp(x1, hx, st), lerp(y1, hy + 4, st) + oy, C[j][1], 'p1', 'p2');          // a little lower, so both stay visible
    if (t > 7.8) {
      const s = QM.add(C[j][0], C[j][1]), m = QM.abs(s), a = clamp((t - 7.8) / 0.25);
      const rx = RX;
      if (m > 0.08) { PIX.rect(c, XO, yO + 8 + oy, Math.round(m * LEN * a), 2, 'p3'); FX.glowL(c, rx + 5, yO - 7 + oy, 10 * a, ['p1', 'p2', 'p3'], 0.8, 1.4); }
      const v = Math.round(m * m * 100), lab = m > 0.08 ? 'ADD' : 'CANCEL';
      PIX.text(c, `|${j}⟩`, rx, yO - 11 + oy, 'w', { shadow: null });
      PIX.text(c, `${v}%`, CD.x + CD.w - 6, yO - 11 + oy, m > 0.08 ? 'p3' : 'd6', { align: 'right' });
      if (t < TC0 || t > TB1 + 0.2 || (t > TC1 + 0.2 && t < TB0)) PIX.text(c, lab, rx, yO + 3 + oy, m > 0.08 ? 'p3' : 'r2', { n: Math.floor((t - (t > TB1 ? TB1 + 0.2 : t > TC1 ? TC1 + 0.2 : 7.8)) * 40) });
    }
  }
  // the sums, written out once the phases have settled
  const settled = t > 8.0 && (t < TC0 || t > TB1 + 0.2 || (t > TC1 + 0.2 && t < TB0)), noZ = t > TC1 && t < TB0 + 0.1;
  if (settled) {
    const [s0, s1] = noZ ? ['+1/2 + 1/2 = 1', '+1/2 − 1/2 = 0'] : ['+1/2 − 1/2 = 0', '+1/2 + 1/2 = 1'];
    const t0 = noZ ? TC1 + 0.25 : t > TB1 ? TB1 + 0.25 : 8.0;
    T(`TO |0⟩:  ${s0}`, CD.x + 6, CD.y + CD.h - 26, 'd9', t0);
    T(`TO |1⟩:  ${s1}`, CD.x + 6, CD.y + CD.h - 15, 'd9', t0 + 0.1);
  }
  if (t > TC0 - 0.1 && t < TB1 + 0.3) { const n = CAP.typed('WITHOUT THE Z', t, TC0, TB0 + 0.4); if (n > 0) { PIX.rect(c, CD.x + 4, CD.y + 4 + oy, 82, 11, 'y1'); PIX.text(c, 'WITHOUT THE Z', CD.x + 7, CD.y + 6 + oy, 'k', { n, shadow: null }); } }
}
SC['s07_interference'] = {
  draw(c, t, S) {
    // hardware: a second calibrated pulse comes down the line for the second H (the Z needs none: it shifts the phase)
    const pd = t < TP0 ? null : t < TH0 ? lerp(S5.DL - 1.45, S5.DL, (t - TP0) / (TH0 - TP0)) : S5.DL + 0.56 * (t - TH0);
    const absorb = t < TH0 ? K.lin(t, TH0 - 0.35, TH0) : 1 - clamp((t - TH0) / 0.5);
    S6.hardware(c, t, { cam: S6.camAt(15), pulse: pd != null && pd < S5.DL + 0.6 ? pd : null, absorb, glow: 1 });
    // circuit
    const gz = t < TZ0 ? 0 : t < TZ1 ? 0.5 : 1, gh = t < TH0 - 0.4 ? 0 : t < TH1 ? 0.5 : 1;
    const gates = [[96, 'H', 1]]; if (t > 0.1) gates.push([140, 'Z', gz]); if (t > 0.25) gates.push([184, 'H', gh]);
    QV.wire(c, t + 10, 0, gates);
    // sphere: Z turns the vector about z; the second H about the H axis; ghost of H → H while the diagram shows it
    const psi = psiAt(t), arc = [];
    if (t > TZ0 && t < TO0 + 0.4) { const s = sZ(t); for (let k = 40; k >= 1; k--) arc.push(QM.bloch(QM.gate('Z', PLUS, s * k / 40))); }
    if (t > TH0 && t < TH1 + 1.5) { const s = sH(t); for (let k = 48; k >= 1; k--) arc.push(QM.bloch(QM.gate('H', MINUS, s * k / 48))); }
    const axA = t < TO0 ? K.lin(t, TZ0 - 0.2, TZ0) * (1 - K.lin(t, TZ1 + 0.2, TZ1 + 0.6)) : K.lin(t, TH0 - 0.3, TH0) * (1 - K.lin(t, TH1 + 0.2, TH1 + 0.6));
    const so = QV.sphere(c, { psi, az: azAt(t), cx: SP.cx, cy: SP.cy, R: SP.R, trail: arc.length > 1 ? arc : null, axis: [t < TO0 ? QV.AXES.Z : QV.AXES.H, axA] });
    const ghost = clamp((t - TC1) / 0.3) * (1 - clamp((t - TB0) / 0.3));
    if (ghost > 0) {
      const [x0, y0] = BL.proj(so, [0, 0, 0]), [x1, y1] = BL.proj(so, [0, 0, 0.92]);
      PIX.bline(c, x0, y0, x1, y1, 'y3', 1); PIX.rect(c, Math.round(x1) - 1, Math.round(y1) - 1, 3, 3, 'y3');
      PIX.text(c, 'H → H', x1 + 6, y1 - 2, 'y3', { n: Math.floor((t - TC1) * 40) });
    }
    // amplitudes
    QV.bars(c, psi, { prob: true });
    QV.formula(c, '(|0⟩+|1⟩)/√2', t + 20, 0, 20.8);
    QV.formula(c, '(|0⟩−|1⟩)/√2', t, 2.7, 5.5);
    QV.formula(c, '|1⟩', t, 8.1);
    PIX.text(c, 'IF MEASURED', (QV.BARS.x0 + QV.BARS.x1 + QV.BARS.bw) / 2, 438, 'd8', { align: 'center' });
    const xm = (QV.BARS.x0 + QV.BARS.x1 + QV.BARS.bw) / 2;
    { const n = CAP.typed('SAME PHASE', t + 20, 0, 21.0); if (n > 0) PIX.text(c, 'SAME PHASE', xm, 300, 'd8', { align: 'center', n }); }
    { const n = CAP.typed('PHASE FLIPPED', t, 1.6, 5.3); if (n > 0) PIX.text(c, 'PHASE FLIPPED', xm, 300, 'o2', { align: 'center', n }); }
    diagram(c, t);
    CAP.note(c, t, { x: 135, y: 458, text: 'SAME ODDS · OPPOSITE PHASE', t0: 2.8, t1: 5.2, align: 'center', col: 'o2', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'H → Z → H  ENDS IN |1⟩', t0: 8.4, t1: 10.0, align: 'center', col: 'p3', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'THE PHASE DECIDES THE RESULT', t0: 12.9, align: 'center', col: 'w', box: true });
    CAP.scene(c, t, { title: 'QUANTUM INTERFERENCE', t0: 0.15, acc: 'p2' });
  },
  cues: () => [[0.15, 'type', 0.4], [0.1, 'gate_pop', 0.6, 0.1], [0.25, 'gate_pop', 0.6, 0.35], [TZ0, 'phase', 0.9, 0, TZ1 - TZ0], [2.7, 'type', 0.3], [TO0, 'orbit', 0.6, 0, TO1 - TO0],
    [TP0, 'riser', 0.6, -0.3, TH0 - TP0], [TH0, 'mw_pulse', 1.0, -0.3], [TH0, 'rot', 0.8, 0, TH1 - TH0], [5.35, 'card', 0.6, 0], [6.3, 'paths', 0.6, 0, 1.0], [7.8, 'cancel', 0.8, -0.3], [7.85, 'add', 0.9, 0.3],
    [TH1, 'land1', 0.9, 0], [8.4, 'type', 0.3], [TC0, 'phase', 0.7, 0, TC1 - TC0], [TC1 + 0.2, 'add', 0.6, -0.3], [TB0, 'phase', 0.7, 0, TB1 - TB0], [TB1 + 0.2, 'add', 0.6, 0.3], [12.9, 'swish', 0.5, 0], [12.9, 'type', 0.4]],
};
})();
