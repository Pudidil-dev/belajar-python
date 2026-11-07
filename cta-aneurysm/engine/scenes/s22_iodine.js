// S22 ATOMIC-SCALE VIEW (84–88 s): the selected iodine atom fills the frame: a compact magenta nucleus, five electron
// shells (2, 8, 18, 18, 7 electrons) over a soft electron-density haze. A yellow X-ray photon flies in from the left
// toward the inner (K) shell, whose ring lights up. "Schematic • not to scale". Camera locked.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const X = W / 2 + 10, Y = 336, R = 158;
const PT = 0.7, PX0 = -40, VPH = 64;                          // photon start time, start x, speed (px/s, slowed)
// the photon flies from the left to the K electron's position at 88.0 s (the absorption lands on S23's first frame)
const KAT = () => ATOM.eAt(X, Y, R, 0, 0, 88.0);
window.IOD = { X, Y, R, PT, PX0, VPH, KAT, photonAt: T => { const q = U.clamp((T - (84 + PT)) / (88 - 84 - PT)), [kx, ky] = KAT(); return [U.lerp(PX0, kx, q), U.lerp(ky - 40, ky, q)]; } };
SC['s22_iodine'] = {
  draw(c, t, S) {
    const zin = K.zl(0.55, 1, MO.cubicOut(clamp(t / 0.6)));
    ATOM.iodine(c, X, Y, R * zin, S.t, { kHi: t > 2.2 });
    const [px, py] = window.IOD.photonAt(S.t), [kx, ky] = window.IOD.KAT();
    if (t > PT) FX.ph(c, px, py, Math.atan2(40, kx - PX0), 9, 24, 6, clamp((t - PT) / 0.1));
    CAP.ctx(c, t, { text: 'YOD: ATOM NÖMRƏSİ 53', t0: 0.35, t1: 3.6 });
    CAP.note(c, t, { text: 'SXEM • MİQYAS GÖZLƏNİLMƏYİB', x: W / 2, y: 590, t0: 0.6, t1: 3.7, col: 'g8', align: 'center', sc: 1 });
  },
  cues: [[0, 'atom_bed', 0.6, 0, 4], [0.35, 'type', 0.4], [PT, 'photon_in', 0.7, -0.6, 3.3], [2.2, 'shell_glow', 0.6, 0]],
  xin: 0.3,
};
})();
