// S36 MULTIPLANAR REVIEW (140–144 s): the workstation's three panels — axial (tilted like the scan), coronal and sagittal
// sections through the same volume. The radiologist's synchronized crosshairs move in all three to the same point: the
// right middle cerebral artery's bifurcation. Static interface.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const PAN = { ax: [50, 112, 260, 260], co: [14, 392, 160, 160], sa: [186, 392, 160, 160] };
window.PAN36 = PAN;
const ZM = { ax: 2.0, co: 2.0, sa: 2.0 };
const target = () => VES.AN.c;
// the crosshair point (head mm): from a start point to the aneurysm, in three eased hops (one click each)
const START = [-10, 30, 4];
const pointAt = t => { const a = target(), q = MO.cubicInOut(clamp((t - 0.6) / 1.6)); return START.map((v, i) => lerp(v, a[i], q)); };
window.S36 = { PAN, ZM, pointAt };
window.drawMPR = (c, t, p, o = {}) => {
  const A = WS.P0;
  for (const k of ['ax', 'co', 'sa']) {
    const [x, y, w, hh] = PAN[k], img = k === 'ax' ? WS.AX : k === 'co' ? WS.CO : WS.SA;
    PIX.rect(c, x, y, w, hh, 'k');
    const [u, v] = WS.toImg(k, A[0], A[1], A[2]);
    const view = WS.image(c, img, WS.N, x, y, w, hh, { z: ZM[k], u0: u, v0: v });
    WS.frame(c, x, y, w, hh, k === 'ax' ? 'AX' : k === 'co' ? 'COR' : 'SAG', 1, o.hi === k);
    const [pu, pv] = WS.toImg(k, p[0], p[1], k === 'ax' ? A[2] + (p[1] - A[1]) * CT.TILT : p[2]);
    const [sx, sy] = view.map(pu, pv);
    if (o.cross !== false) WS.cross(c, sx, sy, x, y, w, hh, 'c3');
    if (o.ring) VES.ring(c, sx, sy, 3.2 * view.k + 4, o.ring, t);
  }
};
SC['s36_mpr'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    window.drawMPR(c, t, pointAt(t));
    CAP.ctx(c, t, { text: 'ÜÇ MÜSTƏVİ', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.3, 'type', 0.4], [0.6, 'click', 0.7, -0.3, 0], [1.4, 'click', 0.7, 0, 1], [2.2, 'click', 0.8, 0.3, 2], [0.6, 'slide', 0.5, 0, 1.6]],
  xin: 0.3,
};
})();
