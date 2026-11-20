// S18 ARRIVE IN THE BRAIN (68–72 s): the bolus leaves the left heart by the aorta and climbs both carotid arteries; the
// camera tracks up to the head. A magnifier over the right carotid shows what "contrast in the blood" means: violet
// molecules mixing into the plasma between the red blood cells.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
const camAt = t => { const q = MO.sineInOut(clamp((t - 0.1) / 3.4)); return { x: lerp(-6, -4, q), y: lerp(-66, -196, q), z: lerp(1.12, 1.5, q) }; };
const R = BODY.R, L = k => BODY.len(R[k]);
const front = (t, a, b) => clamp((t - a) / (b - a));
const MAGC = []; for (let k = 0; k < 18; k++) MAGC.push({ x: h(k, 1), y: h(k, 2), v: 0.6 + 0.4 * h(k, 3) });
SC['s18_carotid'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    BODY.draw(c, { t: S.t, beat: window.beatAt(t + 0.0, 0.5) });
    for (const k of ['vein', 'right', 'pulmR', 'pulmL', 'pvR', 'pvL', 'left']) BODY.bolus(c, R[k], 0, L(k), k.startsWith('p') ? 4 : 5, S.t, 1);
    BODY.bolus(c, R.aorta, 0, L('aorta') * front(t, 0, 0.5), 8, S.t, 6);
    BODY.bolus(c, R.desc, 0, L('desc') * front(t, 0.5, 2.6), 7, S.t, 7);
    for (const k of ['carR', 'carL']) BODY.bolus(c, R[k], 0, L(k) * front(t, 0.5, 2.3), 4.5, S.t, 8);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the magnifier over the right carotid
    const m = MO.backOut(clamp((t - 2.0) / 0.4), 1.6);
    if (m > 0) {
      const [ax, ay] = K.S(cam, -23, -186), mx = 96, my = 430, r = 62 * m;
      PIX.bline(c, ax, ay, mx + r * 0.55, my - r * 0.7, 'g6');
      PIX.circ(c, mx, my, r + 3, 'g5'); PIX.circ(c, mx, my, r, 'd0');
      c.save(); c.beginPath(); c.arc(mx, my, r, 0, TAU); c.clip();
      for (let y = Math.round(my - r); y < my + r; y++) for (let x = Math.round(mx - r); x < mx + r; x++) if (K.BAY(x, y) < 0.35) PIX.rect(c, x, y, 1, 1, 'd1');
      for (const e of MAGC) { const x = mx - r + K.wrap(e.x * 2 * r + S.t * 40 * e.v, 2 * r + 20) - 10, y = my - r * 0.8 + e.y * r * 1.6; c.fillStyle = P.d3; c.beginPath(); c.ellipse(x, y, 9, 6, 0.3, 0, TAU); c.fill(); c.fillStyle = P.d2; c.beginPath(); c.ellipse(x + 1, y + 1, 4, 2.5, 0.3, 0, TAU); c.fill(); }
      for (let k = 0; k < 22; k++) { const x = mx - r + K.wrap(h(k, 4) * 2 * r + S.t * 52, 2 * r + 20) - 10, y = my - r * 0.85 + h(k, 5) * r * 1.7; FLOW.mol(c, x, y, k + S.t * 2, 1.3); }
      c.restore();
    }
    CAP.ctx(c, t, { text: 'BEYİN ARTERİYALARINA', t0: 0.4, t1: 3.6 });
  },
  cues: [[0.5, 'heartbeat', 0.7], [1.5, 'heartbeat', 0.7], [2.5, 'heartbeat', 0.6], [3.5, 'heartbeat', 0.6], [0.1, 'rise_flow', 0.7, 0, 3.4], [0.4, 'type', 0.4], [2.0, 'magnify', 0.8, -0.4]],
};
})();
