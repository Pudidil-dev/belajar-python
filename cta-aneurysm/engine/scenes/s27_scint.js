// S27 SCINTILLATOR ABSORPTION (104–108 s): one detector element in cross-section — anti-scatter plates, the scintillator in
// its reflector, the photodiode, the readout. The X-ray photon enters from above and stops inside the scintillator: a
// flash marks the energy it deposits. Camera locked.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const TS = 1.35, SX = 186, SY = 300;
window.SCINT = { TS, SX, SY };
SC['s27_scint'] = {
  draw(c, t, S) {
    const L = DET.L, age = t - TS;
    DET.cross(c, { glow: age > 0 ? Math.max(0, 0.9 - age * 0.5) : 0, gx: SX, gy: SY, gr: 70 });
    if (age < 0) { const y = lerp(-20, SY, clamp(t / TS)), x = lerp(176, SX, clamp(t / TS)); FX.ph(c, x, y, Math.atan2(SY + 20, SX - 176), 7, 18, 4, 1); }
    else { if (age < 0.5) { FX.flash(c, SX, SY, 14 * (1 - age / 0.5), 'e3', 1 - age / 0.5); FX.ring(c, SX, SY, 6 + age * 90, 'e2', 1 - age / 0.5); } PIX.rect(c, SX - 1, SY - 1, 3, 3, age < 1 ? 'w' : 'e3'); }
    CAP.part(c, t, { text: 'FOTODİOD', ax: L.x1 - 10, ay: L.dy0 + 20, x: 338, y: 590, t0: 1.9, t1: 3.6, col: 'b4', lineCol: 'g7', align: 'right' });
    CAP.ctx(c, t, { text: 'SSİNTİLYATOR', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.3, 'type', 0.4], [0, 'det_bed', 0.5, 0, 4], [TS, 'absorb_soft', 1.0, 0.1], [1.9, 'tag', 0.4, 0.5]],
  xin: 0.3,
};
})();
