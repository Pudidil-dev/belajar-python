// S06 SUPERPOSITION (55–70 s): the drop. The calibrated pulse reaches the qubit, which starts in |0⟩, and performs a
// Hadamard gate: the Bloch vector turns half a revolution about the H axis, (x + z)/√2, from the north pole to the
// equator. The state is computed: H^s|0⟩ for s = 0 → 1, ending at (|0⟩ + |1⟩)/√2 with both amplitudes 1/√2 and the same
// phase. A measurement would give 0 or 1 with 50 % each — but nothing is measured: the qubit is one coherent state
// with two amplitudes, not something flickering between 0 and 1.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut;
const S5 = window.S05, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2), QI = 12, Q = CH.Q[QI];
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const anchor = (A, sx, sy, zmm) => { const z = zmm / MM; return { x: A[0] - (sx - W / 2) / z, y: A[1] - (sy - H / 2) / z, z }; };
const TG = 3.2;                                                      // the H gate on screen (the real pulse lasts ~30 ns)
const sH = t => io(clamp(t / TG));
const psiAt = t => QM.gate('H', QM.ket0(), sH(t));
// view: the H turn is seen from the side (az ≈ 0, +x to the right, toward the columns); afterwards the camera orbits
// the steady state (from 10 s) to the side view S07's Z gate needs (az ≈ π − 0.35)
const AZ_Z = Math.PI - 0.35;
// while pushed in (5–9.6 s) the camera circles the steady state once, close up
const azAt = t => t < 4 ? -0.3 + 0.15 * t : t < 10 ? 0.3 + 0.03 * (t - 4) + U.TAU * io(clamp((t - 5.4) / 3.8)) : 0.48 + U.TAU + (AZ_Z - 0.48) * io(clamp((t - 10) / 5));
const push = t => io(clamp((t - 5.0) / 1.0)) - io(clamp((t - 8.6) / 1.0));                 // in at 5 s, back out at 8.6 s
const elAt = t => lerp(0.32, QV.EL, io(clamp(t / 1.2))) + 0.15 * push(t);
const QX = 190, QY = 128, ZQ = 90;                                   // the qubit's place at the top once the view settles
const punch = t => t > 0 && t < 0.4 ? Math.sin(Math.PI * t / 0.4) * (1 - t / 0.4) : 0;            // the drop: a quick push and back
const camAt = t => {
  const u = io(clamp((t - 0.4) / 2.0)), z = K.zl(S5.ZQ, ZQ, u) * (1 + 0.22 * punch(t)) * (1 + 0.15 * Math.sin(Math.PI * clamp((t - 3.5) / 11))) * (1 + 1.4 * push(t));
  return anchor(room(Q.x, Q.y), lerp(S5.QSX, QX, u), lerp(S5.QSY, QY, u), z);
};
const beatP = t => Math.pow(1 - K.wrap(t, 0.5) / 0.5, 3);                                  // a pulse on every beat
const sphAt = t => {
  const u = MO.cubicInOut(clamp(t / 1.0)), v = io(clamp((t - 5) / 5)), p = push(t);
  const cx = lerp(S5.SPH.cx, QV.SPH.cx, u), cy = lerp(S5.SPH.cy, QV.SPH.cy, u), R = lerp(S5.SPH.R, QV.SPH.R, u) + 5 * v;
  return { cx: lerp(cx, 135, p), cy: lerp(cy, 296, p), R: lerp(R, 118, p) };
};
window.S06 = { camAt, azAt, sphAt, QX, QY, ZQ, AZ_Z };
// the hardware strip at the top: chip, the pulse finishing its trip into the qubit, the qubit holding its state
function hardware(c, t, o = {}) {
  const cam = o.cam || camAt(t), zmm = cam.z * MM;
  K.cam(c, cam);
  c.save(); c.translate(C0[0], C0[1]); c.scale(MM, MM);
  CH.draw(c, { z: zmm, hl: new Set([QI]), drive: new Set([QI]) });
  if (o.pulse != null) CH.pulse(c, S5.drive, o.pulse / S5.DL, { sig: 0.16, amp: 0.035, lam: 0.06, z: zmm, t: o.tp ?? t });
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [qx, qy] = K.S(cam, ...room(Q.x, Q.y));
  FX.spot(c, qx, qy, 64, 150, o.spot ?? 0.62);
  FX.fadeBelow(c, 196, 236, 0.75 * (o.floor ?? 1));
  if (o.absorb > 0) FX.glowL(c, qx - CH.ARM * zmm, qy, 18, ['o0', 'o1', 'o2'], 0.9 * o.absorb, 1.3);
  if (o.glow > 0) FX.glowL(c, qx, qy, 30, ['p0', 'p1', 'p2'], 0.6 * o.glow * (0.8 + 0.2 * beatP(o.tb ?? t)), 1.4);
  return [qx, qy, zmm];
}
window.S06.hardware = hardware;
// what superposition is not: a classical bit flipping back and forth, crossed out
function flicker(c, t) {
  const a = clamp((t - 9.0) / 0.25) * (1 - clamp((t - 11.85) / 0.25)); if (a <= 0) return;
  const x0 = 12, y0 = 64, w = 92, hh = Math.round(86 * a);
  PIX.rect(c, x0, y0, w, hh, 'd3'); PIX.rect(c, x0 + 1, y0 + 1, w - 2, hh - 2, 'k');
  if (a < 1) return;
  PIX.text(c, 'FAST SWITCH', x0 + w / 2, y0 + 5, 'd8', { align: 'center', n: CAP.typed('FAST SWITCH', t, 9.2) });
  PIX.text(c, U.hash(Math.floor(t * 10), 3) < 0.5 ? '0' : '1', x0 + w / 2, y0 + 20, 'e2', { sc: 4, align: 'center', shadow: null });
  const p = MO.cubicOut(clamp((t - 9.7) / 0.25)), xa = x0 + 10, ya = y0 + hh - 22, xb = x0 + w - 10, yb = y0 + 16;
  if (p > 0) for (const d of [0, 1]) PIX.bline(c, xa, ya + d, lerp(xa, xb, p), lerp(ya, yb, p) + d, 'r2');
  if (p >= 1) PIX.text(c, 'NOT THIS', x0 + w / 2, y0 + hh - 13, 'r2', { align: 'center', n: CAP.typed('NOT THIS', t, 9.95) });
}
SC['s06_superposition'] = {
  draw(c, t, S) {
    const [qx, qy] = hardware(c, t, { pulse: S5.DL + 0.56 * t, absorb: 1 - clamp(t / 0.5), glow: K.sm(t, 0.2, 0.8), floor: K.sm(t, 0, 0.8) });
    for (const [t0, col] of [[0, 'o2'], [0.12, 'p3']]) { const dt = t - t0; if (dt > 0 && dt < 0.6) FX.ring(c, qx, qy, 12 + dt * 220, col, 1 - dt / 0.6); }
    if (t < 0.35) { const n = CAP.typed('QUBIT IN |0⟩', t + 10, 0, 10.3); if (n > 0) PIX.text(c, 'QUBIT IN |0⟩', S5.SPH.cx, S5.SPH.cy + S5.SPH.R + 30, 'd8', { align: 'center', n }); }
    // circuit: |0⟩ —[H]— (slides out to the left while the camera is pushed in on the sphere)
    const p = push(t), wire = cc => QV.wire(cc, t, 0.1, [[96, 'H', t < TG ? 0.5 : 1]]);
    if (p > 0) { if (p < 0.99) window.shifted(c, wire, -260 * p); } else wire(c);
    if (t > 0.4 && t < 4.6) { const n = CAP.typed('INIT', t, 0.45, 4.4); if (n) PIX.text(c, 'INIT', 12, 236, 'd7', { n }); }
    // Bloch sphere: the vector turns about the H axis, leaving its path
    const sp = sphAt(t), psi = psiAt(t), arc = [];
    const keep = t < TG + 1.2 ? 1 : 1 - clamp((t - TG - 1.2) / 0.8);
    if (keep > 0) { const s = sH(t), n = Math.round(48 * keep); for (let k = n; k >= 1; k--) arc.push(QM.bloch(QM.gate('H', QM.ket0(), s * (1 - (n - k) / 48)))); }
    const so = QV.sphere(c, { psi, az: azAt(t), el: elAt(t), cx: sp.cx, cy: sp.cy, R: sp.R, trail: arc.length > 1 ? arc : null, axis: [QV.AXES.H, K.lin(t, 0, 0.3) * (1 - K.lin(t, TG + 0.3, TG + 0.8))] });
    if (t > TG && t < TG + 0.45) { const [tx, ty] = BL.proj(so, QM.bloch(psi)); FX.ring(c, tx, ty, 3 + (t - TG) * 90, 'p3', 1 - (t - TG) / 0.45); }
    if (p > 0.05) QV.equator(c, so, p);
    if (p > 0.95) { const n = CAP.typed('EQUATOR: 50 / 50', t, 6.1, 8.55); if (n > 0) { const s = 'EQUATOR: 50 / 50', w = PIX.textWidth(s); PIX.rect(c, 135 - w / 2 - 2, so.cy + so.R + 6, w + 5, 11, 'k'); PIX.text(c, s, 135, so.cy + so.R + 8, 'p3', { align: 'center', n }); } }
    flicker(c, t);
    // amplitudes and what a measurement would give (they slide off to the right during the push)
    const xm = (QV.BARS.x0 + QV.BARS.x1 + QV.BARS.bw) / 2;
    const column = cc => {
      QV.bars(cc, psi, { prob: t > 4.4, a: K.lin(t, 0.5, 0.8) });
      QV.formula(cc, '|0⟩', t, 0.5, 2.9);
      QV.formula(cc, '(|0⟩+|1⟩)/√2', t, 3.3);
      if (t > 4.5) { const n = CAP.typed('IF MEASURED', t, 4.55); PIX.text(cc, 'IF MEASURED', xm, 438, 'd8', { align: 'center', n }); }
      if (t > 10.2) { const n = CAP.typed('SAME PHASE', t, 10.25); PIX.text(cc, 'SAME PHASE', xm, 300, 'd8', { align: 'center', n }); }
    };
    if (p > 0) { if (p < 0.99) window.shifted(c, column, 170 * p); } else column(c);
    CAP.note(c, t, { x: 135, y: 458, text: 'NOTHING IS MEASURED YET', t0: 5.6, t1: 8.7, align: 'center', col: 'p3', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'NOT FLICKERING BETWEEN 0 AND 1', t0: 9.0, t1: 12.1, align: 'center', col: 'd9', box: true });
    CAP.note(c, t, { x: 135, y: 458, text: 'ONE STATE · TWO AMPLITUDES', t0: 12.4, align: 'center', col: 'p3', box: true });
    CAP.scene(c, t, { title: 'SUPERPOSITION', t0: 0.15, acc: 'p2' });
  },
  cues: () => [[0, 'mw_pulse', 1.0, -0.3], [0, 'impact', 0.55, 0], [9.0, 'card', 0.5, -0.4], [9.7, 'error', 0.5, -0.4], [5.4, 'orbit', 0.5, 0, 3.8], [10.0, 'orbit', 0.5, 0, 5.0], [0, 'rot', 0.8, 0, TG], [0.15, 'type', 0.4], [TG, 'equator', 0.9, 0], [3.3, 'type', 0.35], [4.4, 'blip', 0.5, -0.2], [4.5, 'blip', 0.5, 0.2],
    [5.0, 'push', 0.7, 0, 1.0], [5.6, 'type', 0.3], [8.6, 'pull', 0.6, 0, 1.0], [10.25, 'shimmer', 0.5, 0.3], [9.0, 'type', 0.3], [12.4, 'type', 0.3]],
};
})();
