// S14 THE DRAINAGE LINE (39–42 s): the camera tracks from the connector down the drainage tubing — one closed, continuous
// connection with gentle curves and no kinks — with urine markers running toward the bag.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const PATH = PELVIS.spline([[150, -120], [150, 40], [164, 200], [210, 330], [236, 470], [220, 620], [180, 760], [168, 900]], 3);
const camY = t => lerp(0, 330, MO.sineInOut(clamp(t / 2.9)));
SC['s14_line'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k'); K.dith(c, 0, 0, W, H, 'n1', 0.5);
    const oy = -camY(t);
    DEV.ports(c, { cx: 150, cy: 260 + oy, s: 5.2 }, { t: S.t, drain: 0, chan: 0, tubing: false });
    const L = BED.plen(PATH), sp = []; for (let d = 0; d <= L; d += 2) { const [x, y] = BED.along(PATH, d); sp.push([x, y + oy]); }
    const tub = sp.filter(([, y]) => y > 260 + 22 * 5.2 + oy - 2);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); tub.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = P.g6; c.lineWidth = 44; c.stroke(); c.strokeStyle = P.g8; c.lineWidth = 36; c.stroke(); c.strokeStyle = P.n1; c.lineWidth = 24; c.stroke(); c.strokeStyle = P.g9; c.lineWidth = 3; c.beginPath(); tub.forEach(([x, y], i) => i ? c.lineTo(x - 12, y) : c.moveTo(x - 12, y)); c.stroke(); c.restore();
    for (let k = 0; k < 16; k++) { const d = K.wrap(S.t * 150 + k * L / 16, L), [x, y] = BED.along(PATH, d); if (y + oy < 260 + 22 * 5.2 + oy) continue; PIX.rect(c, Math.round(x) - 2, Math.round(y + oy) - 3, 5, 6, 'f3'); PIX.rect(c, Math.round(x) - 1, Math.round(y + oy) - 2, 2, 2, 'f4'); }
    CAP.ctx(c, t, { text: 'Continuous drainage path', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.3, 'type', 0.4], [0, 'sweep_out', 0.7, 0, 2.9], [0.2, 'flow_bed', 0.5, 0.2, 2.8]],
};
})();
