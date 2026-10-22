// S16 · 1:48–1:55 — FINAL ATOMIC REVEAL. From the finished micrograph (the opening's framing) the camera punches in on
// the same gold atom; the cursor ring locks on: ONE GOLD ATOM. Then a fast pull-back through the monitor to the whole
// microscope, cut open, where the path lights up part by part — electron source → lenses → the atom → scattering →
// detector → image — under the title. Then a rush back into the monitor that lands exactly on the first frame of the
// film, so the video loops.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_IN = 0.0, D_IN = 0.55, T_OUT = 2.35, T_LAB = 3.55, T_CHAIN = 3.6, T_TITLE = 4.0, T_BACK = 5.75;
const ZIN = 6;
const atom = () => HA.AU[HA.HOOK];
const atomW = () => { const a = atom(), [px, py] = HA.px(a.x, a.y); return LAB.imgW(px, py); };
const LABCAM = { x: X - 18, y: -176, z: 1.32 };
const camAt = lt => {
  const C = LAB.cam11(), [ax, ay] = atomW(), s0 = CAM.toScreen(C, ax, ay), zin = C.z * ZIN;
  if (lt < T_OUT) {
    const p = MO.cubicInOut(U.clamp((lt - T_IN) / D_IN)), z = CAM.zlerp(C.z, zin * (1 + 0.04 * U.clamp((lt - D_IN) / (T_OUT - D_IN))), p);
    return CAM.anchor(ax, ay, z, U.lerp(s0[0], W / 2, p), U.lerp(s0[1], 210, p));
  }
  if (lt < T_LAB) {                                                            // fast pull-back: atom → monitor → room
    const p = U.clamp((lt - T_OUT) / (T_LAB - T_OUT)), e = MO.quintInOut(p), z = CAM.zlerp(zin * 1.04, LABCAM.z, e);
    const ca = CAM.anchor(ax, ay, z, W / 2, 210), k = MO.smooth(U.clamp((p - 0.25) / 0.75));
    return { x: U.lerp(ca.x, LABCAM.x, k), y: U.lerp(ca.y, LABCAM.y, k), z };
  }
  if (lt < T_BACK) return { x: LABCAM.x, y: LABCAM.y, z: LABCAM.z * (1 + 0.03 * (lt - T_LAB) / (T_BACK - T_LAB)) };
  // rush back in: lands on the opening frame exactly at the end
  const p = U.clamp((lt - T_BACK) / (7 - T_BACK)), e = MO.quintInOut(p), a = { x: LABCAM.x, y: LABCAM.y, z: LABCAM.z * 1.03 };
  return { x: U.lerp(a.x, C.x, MO.smooth(U.clamp(p * 1.25))), y: U.lerp(a.y, C.y, MO.smooth(U.clamp(p * 1.25))), z: CAM.zlerp(a.z, C.z, e) };
};
// the chain of the whole process, lighting up along the cut-open column
const CHAIN = [['ELECTRON SOURCE', [X, Y.tip], 'c3'], ['ELECTRON LENSES', [X, Y.c2], 'm4'], ['ATOM', [X, Y.spec], 'y3'], ['SCATTERING', [X + 8, Y.spec + 8], 'y4'], ['DETECTOR', [X - 8, Y.haadf], 'c4'], ['IMAGE', [LAB.MON.cx, LAB.MON.cy], 'w']];
SC.s16_final = {
  camAt,
  draw(c, lt) {
    const T = 108 + lt, cam = camAt(lt);
    const cut = U.clamp((lt - T_LAB + 0.25) / 0.5) * (1 - U.clamp((lt - T_BACK - 0.15) / 0.4));       // the column opens, then closes
    LAB.screen(T, {}); LAB.back(c, cam, T);
    if (cut < 1) LAB.scope(c, cam, T);
    if (cut > 0) { const k = cut; window.dissolve(c, () => {}, cc => { LAB.back(cc, cam, T); COL.draw(cc, cam, T, { airlock: 1, glow: 0.8, axis: 0.9 }); }, MO.smooth(k)); }
    LAB.front(c, cam, T);
    // the beam path, lit from the source down to the detector, then on to the screen
    if (cut > 0.5) {
      const kP = U.clamp((lt - T_CHAIN) / 0.9), y1 = U.lerp(Y.tip, Y.haadf, kP);
      const [sx, s0] = K.S(cam, X, Y.tip), [, s1] = K.S(cam, X, y1);
      PIX.bline(c, sx, s0, sx, s1, 'c3'); FX.e(c, sx, s1, 2, 1, true);
    }
    // the cursor on the atom, and the label
    const [ax, ay] = atomW(), [sx, sy] = K.S(cam, ax, ay), pxs = cam.z * LAB.MON.k;
    const kC = U.clamp((lt - D_IN + 0.1) / 0.18) * (1 - U.clamp((lt - T_OUT - 0.5) / 0.3));
    if (kC > 0) SC.cursor(c, sx, sy, Math.max(5, 2.8 * pxs), kC, T, 'y3');
    if (lt > D_IN && lt < D_IN + 0.35) FX.ring(c, sx, sy, 2.8 * pxs + (lt - D_IN) * 60, 'y4', 1 - (lt - D_IN) / 0.35);
    CAP.note(c, lt, { text: 'ONE GOLD ATOM', x: Math.min(W - 82, sx + 3.2 * pxs + 6), y: Math.max(56, sy - 3.2 * pxs - 10), ax: sx + 2.8 * pxs * 0.72, ay: sy - 2.8 * pxs * 0.72, t0: D_IN + 0.05, t1: T_OUT - 0.1, col: 'y4', lineCol: 'y2', box: true });
    // the chain
    if (lt > T_CHAIN && lt < T_BACK + 0.2) {
      CHAIN.forEach(([name, [wx, wy], col], i) => {
        const t0 = T_CHAIN + i * 0.2, k = U.clamp((lt - t0) / 0.15) * (1 - U.clamp((lt - T_BACK) / 0.2)); if (k <= 0) return;
        const [px, py] = K.S(cam, wx, wy), tx = i === 5 ? px - 4 : W - 16;
        PIX.rect(c, Math.round(px) - 2, Math.round(py) - 2, 5, 5, col, k);
        CAP.note(c, lt, { text: name, x: tx, y: i === 5 ? py - 34 : py - 4, ax: px + 3, ay: py, t0, t1: T_BACK - 0.05, col, lineCol: 'g6', box: true, align: i === 5 ? 'left' : 'right', rate: 70 });
      });
    }
    // title
    if (lt > T_TITLE && lt < T_BACK + 0.25) {
      const k = U.clamp((lt - T_TITLE) / 0.2) * (1 - U.clamp((lt - T_BACK) / 0.25)), s = 'HOW ELECTRON MICROSCOPES', s2 = 'SEE ATOMS';
      c.save(); c.globalAlpha = k;
      PIX.rect(c, W / 2 - 74, 40, 148, 30, 'k'); PIX.rect(c, W / 2 - 74, 40, 148, 1, 'c2'); PIX.rect(c, W / 2 - 74, 69, 148, 1, 'c2');
      PIX.text(c, s, W / 2, 45, 'w', { align: 'center', n: Math.floor((lt - T_TITLE) * 50) });
      PIX.text(c, s2, W / 2, 57, 'y3', { align: 'center', n: Math.max(0, Math.floor((lt - T_TITLE - 0.35) * 40)) });
      c.restore();
    }
  },
  cues: [[0.0, 'zoom_punch', 1, 0, D_IN], [D_IN, 'lock_click'], [D_IN + 0.05, 'crystal', 1, 0.2], [T_OUT, 'whoosh_rise', 1, 0, T_LAB - T_OUT], [T_LAB - 0.05, 'bass_drop'],
    [T_LAB - 0.2, 'cut_sweep', 0.6, 0, 0.6], ...CHAIN.map((_, i) => [T_CHAIN + i * 0.2, 'chain_step', 1, (i / 5 - 0.5) * 0.6, i]), [T_TITLE, 'final_hit'], [T_BACK, 'rewind', 1, 0, 7 - T_BACK]],
};
})();
