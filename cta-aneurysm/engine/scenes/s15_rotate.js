// S15 MEASURE FROM MANY ANGLES (56–60 s): an axial schematic: the head's cross-section at the level of the aneurysm (the
// arteries still plain blood: no contrast yet), the stationary gantry ring, the tube with its fan beam and the detector arc
// opposite. Source and detector turn together round the still head; the fan sweeps through it at every angle; the
// detector lights where X-rays got through. The patient and the housing do not move.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const betaAt = t => TAU * 0.95 * MO.sineInOut(clamp((t - 0.25) / 3.6));
window.S15 = { betaAt };
SC['s15_rotate'] = {
  draw(c, t, S) {
    const o = AXI.O, beta = betaAt(t);
    AXI.ring(c, o, 1);
    AXI.head(c, o, {});
    AXI.parts(c, beta, o, {});
    // angle trail round the ring where the tube has measured
    const n = Math.floor(beta / TAU * 60);
    for (let k = 0; k <= n; k++) { const [x, y] = AXI.at(o, k / 60 * TAU, o.Rs + 20); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 2, 2, 'y2'); }
    CAP.ctx(c, t, { text: 'ÇOX BUCAQDAN ÖLÇMƏ', t0: 0.4, t1: 3.6 });
  },
  cues: () => { const q = [[0.25, 'spin_motor', 0.8, 0, 3.6], [0.4, 'type', 0.4]]; for (let k = 0; k < 8; k++) q.push([0.5 + k * 0.5, 'gantry_tick', 0.5, Math.sin(k) * 0.4, k]); return q; },
  xin: 0.3,
};
})();
