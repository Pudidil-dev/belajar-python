// S11 HOW QUANTUM COMPUTERS WORK (116–120 s): the whole chain at once. The camera pulls out from the qubits — processor,
// package, the cooling stages of the refrigerator — back to the lab where the film began, while the steps light up:
// microwave control → quantum gates → interference → measurement → classical result. A quantum computer is useful for
// certain problems, not faster at everything.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut;
const S1 = window.S01, S10 = window.S10, MM = FR.FS / 10, C0 = FR.toRoom(0, FR.PKG.y + FR.PKG.h / 2);
const room = (x, y) => [C0[0] + x * MM, C0[1] + y * MM];
const camAt = t => {
  if (t < 0.45) { const u = MO.cubicIn(t / 0.45), z = K.zl(S10.camAt(7).z, S1.Z_END, u), A = room(...S10.CC); return { x: A[0], y: lerp(A[1], C0[1], u), z }; }
  return S1.camAt(7 * (1 - MO.cubicInOut(clamp((t - 0.45) / 2.6))));
};
const chipFn = (c, zcm) => { c.save(); c.scale(0.1, 0.1); CH.draw(c, { z: zcm / 10 }); c.restore(); };
const STEPS = [['MICROWAVE CONTROL', 'o2'], ['QUANTUM GATES', 'p3'], ['INTERFERENCE', 'p3'], ['MEASUREMENT', 'e2'], ['CLASSICAL RESULT', 'e2']];
SC['s11_final'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    FR.room(c, { t: S.t });
    c.save(); c.translate(FR.FX0, FR.FY0); c.scale(FR.FS, FR.FS);
    FR.draw(c, { z: cam.z * FR.FS, t: S.t, chipFn, signal: 0.9 });
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // S10's code patch shrinking away with the processor, its floor lifting
    if (t < 0.45) { const k = 1 - t / 0.45; FX.fadeBelow(c, 372, 400, 0.7 * (1 - io(t / 0.45))); S10.markers(c, cam, k); S10.outline(c, cam, k); }
    CAP.note(c, 7 + t, { x: 135, y: 64, text: 'ONE LOGICAL QUBIT', t0: 6.05, t1: 7.0, align: 'center', col: 'p3', box: true });
    CAP.note(c, 7 + t, { x: 135, y: 392, text: 'LOGICAL ERRORS: RARER, NOT ZERO', t0: 6.2, t1: 7.05, align: 'center', col: 'w', box: true });
    CAP.scene(c, 7 + t, { title: 'QUANTUM ERROR CORRECTION', t0: 0.15, t1: 7.3, acc: 'r2' });
    // the chain, step by step
    STEPS.forEach(([s, col], i) => {
      const t0 = 0.45 + i * 0.42, y = 344 + i * 19; if (t < t0) return;
      const n = CAP.typed(s, t, t0), w = PIX.textWidth(s), wn = PIX.textWidth([...s].slice(0, n).join(''));
      PIX.rect(c, Math.round(135 - w / 2) - 3, y - 2, wn + 6, 11, 'k'); PIX.text(c, s, 135, y, col, { align: 'center', n });
      if (i > 0) { PIX.rect(c, 132, y - 10, 7, 8, 'k'); PIX.text(c, '↓', 133, y - 10, 'd8', { shadow: null }); }
    });
    { const s = 'USEFUL FOR CERTAIN PROBLEMS, NOT ALL', n = CAP.typed(s, t, 2.75); if (n > 0) { const w = PIX.textWidth(s), wn = PIX.textWidth([...s].slice(0, n).join('')); PIX.rect(c, Math.round(135 - w / 2) - 3, 448, wn + 6, 11, 'k'); PIX.text(c, s, 135, 450, 'd9', { align: 'center', n }); } }
    // the title
    for (const [s, y, t0] of [['HOW QUANTUM', 22, 2.35], ['COMPUTERS WORK', 42, 2.6]]) {
      const n = CAP.typed(s, t, t0); if (n <= 0) continue;
      const tw = PIX.textWidth(s, 2), tn = PIX.textWidth([...s].slice(0, n).join(''), 2); PIX.rect(c, Math.round(W / 2 - tw / 2) - 4, y - 4, tn + 9, 22, 'k');
      PIX.text(c, s, W / 2, y, 'w', { sc: 2, align: 'center', n });
    }
    if (t > 3.0 && t < 3.25) FX.ring(c, W / 2, 41, 30 + (t - 3.0) * 400, 'd6');
  },
  cues: () => {
    const q = [[0, 'pull', 1.0, 0, 3.0]];
    STEPS.forEach((s, i) => q.push([0.45 + i * 0.42, 'step', 0.7, (i - 2) * 0.2, i]));
    q.push([2.35, 'type', 0.5], [2.75, 'type', 0.3], [3.0, 'impact', 1.0, 0], [3.5, 'final', 0.9, 0]);
    return q;
  },
};
})();
