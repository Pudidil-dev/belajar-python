// S10 3D BRAIN RECONSTRUCTION (58–65 s): the main payoff. The 18 reconstructed slices leave the viewer grid and stand
// in 3D at their real heights (7 mm apart): the image volume of the whole head. Segmentation keeps the brain: scalp and
// skull peel away, a cyan contour marks what stays. The voxels between the slices fill in from the bottom up — the
// same voxel brain the film opened with — and it turns, its anatomy named: both cerebral hemispheres, the folded
// cortex, the cerebellum, the brainstem. It ends on the opening's angle, pushed in close.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth;
const N = STACK.N, S9 = window.S09;
const T_FLY = k => 0.05 + 0.045 * k, D_FLY = 0.75;                            // bottom slice first
const T_SEG = k => 1.55 + 0.05 * (N - 1 - k), D_SEG = 0.4;                     // top slice first
const T_VOX0 = 2.85, T_VOX1 = 4.0;
const YAW0 = Math.PI + 0.5, YAW1 = 2 * Math.PI - Math.PI / 4;
const viewAt = t => {
  const r = io(clamp((t - 4.05) / 2.2)), p = io(clamp((t - 6.25) / 0.75));
  const s = 1.2 * Math.exp(Math.log(2.3 / 1.2) * MO.cubicInOut(p));
  return { cx: 135, cy: lerp(244, 226, r), s, yaw: lerp(YAW0, YAW1, r), pitch: lerp(0.5, 0.28, r) };
};
window.S10 = { viewAt };
const front = t => lerp(-70, 64, MO.sineInOut(clamp((t - T_VOX0) / (T_VOX1 - T_VOX0))));
const LABELS = [[4.2, 'LEFT HEMISPHERE', [38, -40, 42], 12, 74], [4.45, 'RIGHT HEMISPHERE', [-38, -40, 42], 150, 74],
  [4.9, 'CEREBRAL CORTEX', [-55, 10, 20], 150, 346], [5.35, 'CEREBELLUM', [-25, -60, -48], 12, 372], [5.65, 'BRAINSTEM', [0, -22, -70], 150, 404]];
SC['s10_brain3d'] = {
  init() { for (let k = 0; k < N; k++) { STACK.tex(k, 'brain'); STACK.tex(k, 'seg'); } },
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const o = viewAt(t), zf = front(t), voxOn = t > T_VOX0, done = t > T_VOX1;
    // the cards: flying from the grid, then segmented
    const below = [], above = [];
    for (let k = 0; k < N; k++) {
      const u = sm(clamp((t - T_FLY(k)) / D_FLY)), fin = STACK.brainPose(o, k), P = STACK.lerpPose(S9.gridPose(k), fin, u);
      const sg = clamp((t - T_SEG(k)) / D_SEG), gone = done ? 1 : voxOn ? sm(clamp((zf - STACK.zk(k)) / 9)) : 0;
      const list = STACK.zk(k) < zf && voxOn ? below : above;
      if (gone < 1) {
        if (sg > 0) list.push({ k, P, a: 1 - gone, mode: 'brain' });
        if (sg < 1) { const Ph = { ...P, s: P.s * (1 + 0.18 * sm(sg)) }; list.push({ k, P: Ph, a: (1 - sm(sg)) * (1 - gone), mode: 'head' }); }
        if (sg > 0.1 && sg < 1.6) list.push({ k, P, a: Math.max(0, 1 - Math.abs(sg - 0.6) * 1.6), mode: 'seg' });
      }
    }
    STACK.draw(c, below, { thick: 3 });
    if (voxOn) {
      const img = K.pbegin(c), Sv = VOL.S;
      VOL.render(img, { ...o, outline: done, clip: done ? null : { n: [0, 0, 1], d: zf }, cut: !done });
      K.pend(c, img);
    }
    STACK.draw(c, above, { thick: 3 });
    // completion
    if (t > T_VOX1 && t < T_VOX1 + 0.5) { const [bx, by] = VOL.proj(o, 0, -3, 0), u = (t - T_VOX1) / 0.5; FX.ring(c, bx, by, 70 + u * 160, u < 0.4 ? 'c5' : 'c3', 1 - u); FX.ring(c, bx, by, 50 + u * 110, 'm4', 1 - u); }
    // anatomy
    for (const [t0, s, P, lx, ly] of LABELS) {
      const [ax, ay] = VOL.proj(o, ...P);
      CAP.note(c, t, { x: lx, y: ly, text: s, t0, t1: 6.2, ax, ay, col: 'w', lineCol: 'm4', box: true, rate: 60 });
    }
    if (t > 1.55 && t < 2.9) CAP.note(c, t, { x: 135, y: 440, text: 'SEGMENTATION: KEEP THE BRAIN', t0: 1.6, t1: 2.75, align: 'center', col: 'c3', box: true, rate: 60 });
    if (t < 1.6) CAP.note(c, t, { x: 135, y: 440, text: '18 SLICES · 7 mm APART', t0: 0.5, t1: 1.45, align: 'center', col: 'w', box: true, rate: 60 });
    CAP.scene(c, t, { title: '3D BRAIN RECONSTRUCTION', t0: 0.15, acc: 'm4' });
  },
  cues: () => {
    const q = [[0, 'lift', 0.8, 0, 0.9]];
    for (let k = 0; k < N; k += 2) q.push([T_FLY(k) + D_FLY, 'stack_click', 0.6, (k / N - 0.5) * 0.8, k]);
    q.push([1.55, 'segment', 0.8, 0, 1.0], [T_VOX0, 'voxel_rise', 1.0, 0, T_VOX1 - T_VOX0], [T_VOX1, 'big_impact', 1.0, 0], [4.0, 'rotate', 0.6, 0, 2.3]);
    for (const [t0] of LABELS) q.push([t0, 'type', 0.35]);
    q.push([6.25, 'zoom_fast', 0.8, 0, 0.7]);
    return q;
  },
};
})();
