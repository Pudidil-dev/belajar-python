// S03 · 0:09–0:16 — THE REAL MACHINE. The camera flies at the microscope; a cutting plane sweeps down the column and
// the covers give way to the cut section. Then a smooth vertical track down the beam axis: each part lights up as it
// passes (gun, accelerator, condenser lenses, aberration corrector, scan coils, specimen, detectors; on the side the
// pumps and the control electronics), ending at the specimen stage.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_CUT0 = 0.55, T_CUT1 = 2.45;                                        // the cutting plane sweeps the column
const KEYS = () => [
  { t: 0, ...S02.cam(9) }, { t: 2.7, x: X - 4, y: -238, z: 2.75, ease: MO.cubicInOut },
  { t: 6.4, x: X - 2, y: -134, z: 3.1, ease: MO.sineInOut }, { t: 7, x: X - 2, y: -132, z: 3.25, ease: MO.sineInOut },
];
const camAt = lt => CAM.at(KEYS(), lt);
const cutY = lt => U.lerp(-306, 2, MO.sineInOut(U.clamp((lt - T_CUT0) / (T_CUT1 - T_CUT0))));
// parts: [label, t, anchor (cm), box [x0, y0, x1, y1] (cm), side]
const PARTS = [
  ['VACUUM PUMPS', 1.0, [X - 40, -131], [X - 46, -140, X - 22, -122], 'L'],
  ['ELECTRON GUN', 2.75, [X, Y.tip], [X - 17, -266, X + 17, -248], 'R'],
  ['ACCELERATOR', 3.25, [X - 14, -236], [X - 16, -248, X + 16, -222], 'L'],
  ['CONDENSER LENSES', 3.8, [X + 18, -205], [X - 20, -219, X + 20, -190], 'R'],
  ['ABERRATION CORRECTOR', 4.35, [X - 22, -170], [X - 24, -190, X + 24, -150], 'L'],
  ['SCAN COILS', 4.9, [X + 6, Y.scan], [X - 7, Y.scan - 3.2, X + 7, Y.scan + 3.2], 'R'],
  ['SPECIMEN STAGE', 5.4, [X + 1, Y.spec], [X - 3, Y.spec - 2, X + 3, Y.spec + 2], 'R'],
  ['DETECTORS', 5.9, [X - 12, Y.haadf], [X - 26, Y.haadf - 2, X + 26, Y.bf + 2], 'L'],
];
function outline(c, cam, b, k, col = 'c3') {
  if (k <= 0) return;
  const [x0, y0] = K.S(cam, b[0], b[1]), [x1, y1] = K.S(cam, b[2], b[3]), p = 2;
  const pts = [[x0 - p, y0 - p], [x1 + p, y0 - p], [x1 + p, y1 + p], [x0 - p, y1 + p]];
  c.save(); c.globalAlpha = k; for (let i = 0; i < 4; i++) PIX.bline(c, ...pts[i], ...pts[(i + 1) % 4], col, i % 2 ? 0 : 0); c.restore();
  for (const [x, y] of pts) PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, col, k);
}
SC.s03_column = {
  camAt,
  draw(c, lt) {
    const T = 9 + lt, cam = camAt(lt);
    LAB.screen(T, {});
    LAB.back(c, cam, T);
    // exterior below the cut, cutaway above it, a cyan seam on the cut line
    const cy = cutY(lt), [, sy] = K.S(cam, 0, cy);
    if (cy < 2) { c.save(); c.beginPath(); c.rect(0, sy, W, H); c.clip(); LAB.scope(c, cam, T); c.restore(); }
    if (cy > -306) {
      c.save(); c.beginPath(); c.rect(0, 0, W, Math.max(0, sy)); c.clip();
      COL.draw(c, cam, T, { holder: 0, grid: 0, clamp: 0, axis: U.clamp((lt - 2.6) / 0.6), hot: { c1: 0.6, c2: 0.6, corr: 0.2, obj: 0.6, scan: 0.3 } });
      c.restore();
    }
    if (cy > -306 && cy < 2) {
      const [xa] = K.S(cam, X - 75, 0), [xb] = K.S(cam, X + 75, 0);
      PIX.bline(c, xa, sy, xb, sy, 'c3'); PIX.bline(c, xa, sy + 1, xb, sy + 1, 'c1');
      FX.glowL(c, (xa + xb) / 2, sy, 40, ['c0', 'c1', 'c2'], 0.5);
    }
    LAB.front(c, cam, T);
    // the electron pathway draws itself down the axis as the camera tracks
    const kP = U.clamp((lt - 2.6) / 3.6);
    if (kP > 0) {
      const y1 = U.lerp(Y.tip, Y.cam, kP), [sx, sy0] = K.S(cam, X, Y.tip), [, sy1] = K.S(cam, X, y1);
      PIX.bline(c, sx, sy0, sx, sy1, 'c3'); FX.e(c, sx, sy1, 2, 1);
    }
    // highlights and labels
    for (const [name, t0, [ax, ay], box, side] of PARTS) {
      const k = U.clamp((lt - t0) / 0.12) * (1 - U.clamp((lt - t0 - 0.55) / 0.25));
      outline(c, cam, box, k * (Math.floor((lt - t0) * 16) % 2 || lt - t0 > 0.25 ? 1 : 0.4));
      const [sx, sy] = K.S(cam, ax, ay);
      const tw = PIX.textWidth(name), tx = side === 'R' ? Math.min(W - 6 - tw, sx + 36) : Math.min(W - 6, Math.max(6 + tw, sx - 36));
      CAP.note(c, lt, { text: name, x: tx, y: Math.max(76, sy - 16), ax: sx, ay: sy, t0, t1: name === 'SPECIMEN STAGE' || name === 'DETECTORS' ? 6.9 : t0 + 1.55, col: 'w', lineCol: 'c2', align: side === 'R' ? 'left' : 'right', box: true });
    }
    S02.racksNote(c, cam, lt, -1.45, 0.7);                                       // carried over from S02, still in view
    CAP.scene(c, lt, { title: 'INSIDE THE MICROSCOPE', ctx: 'THE ELECTRON PATH, TOP TO BOTTOM', t0: 1.0, t1: 6.8, acc: 'c2' });
  },
  cues: [[0.0, 'approach', 1, 0, 2.6], [0.55, 'cut_sweep', 1, 0, 1.9], [1.0, 'blip', 0.7, -0.4], [1.0, 'title_hit', 0.7],
    [2.75, 'part', 1, 0.3, 0], [3.25, 'part', 1, -0.3, 1], [3.8, 'part', 1, 0.3, 2], [4.35, 'part', 1, -0.3, 3], [4.9, 'part', 1, 0.3, 4], [5.4, 'part', 1, 0.3, 5], [5.9, 'part', 1, -0.3, 6],
    [2.6, 'machine_hum', 0.8, 0, 4.2], [2.7, 'path_trace', 1, 0, 3.6]],
};
})();
