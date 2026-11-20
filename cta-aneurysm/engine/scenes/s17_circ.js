// S17 FOLLOW THE CIRCULATION (64–68 s): the body diagram. The violet bolus climbs the right arm's veins to the superior
// vena cava and the right heart, is pumped through the pulmonary arteries into the lungs' vessels (never the air spaces),
// returns by the pulmonary veins to the left heart. Four soft heartbeats. Camera locked.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CAM = { x: -6, y: -66, z: 1.12 };
window.BODYCAM = CAM;
const beatAt = (t, T0 = 0.5) => { let v = 0; for (let k = 0; k < 4; k++) { const d = t - (T0 + k); if (d >= 0) v = Math.max(v, Math.exp(-d * 7)); } return v; };
window.beatAt = beatAt;
const R = BODY.R, L = k => BODY.len(R[k]);
const front = (t, a, b) => clamp((t - a) / (b - a));
SC['s17_circ'] = {
  draw(c, t, S) {
    K.cam(c, CAM);
    BODY.draw(c, { t: S.t, beat: beatAt(t) });
    const w = 4.5;
    BODY.bolus(c, R.vein, 0, L('vein') * front(t, -0.2, 1.3), 5, S.t, 1);
    BODY.bolus(c, R.right, 0, L('right') * front(t, 1.3, 1.7), 6, S.t, 2);
    for (const k of ['pulmR', 'pulmL']) BODY.bolus(c, R[k], 0, L(k) * front(t, 1.7, 2.4), 5, S.t, 3);
    for (const k of ['pvR', 'pvL']) BODY.bolus(c, R[k], 0, L(k) * front(t, 2.4, 2.95), 3.5, S.t, 4);
    BODY.bolus(c, R.left, 0, L('left') * front(t, 2.95, 3.5), 6, S.t, 5);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const [hx, hy] = K.S(CAM, 10, -30), [lx, ly] = K.S(CAM, 76, -100);
    CAP.part(c, t, { text: 'ÜRƏK', ax: hx, ay: hy, x: 300, y: 500, t0: 1.2, t1: 3.6, col: 'd4', lineCol: 'g7', align: 'right' });
    CAP.part(c, t, { text: 'AĞCİYƏRLƏR', ax: lx, ay: ly, x: 338, y: 132, t0: 1.9, t1: 3.6, col: 'p3', lineCol: 'g7', align: 'right' });
    CAP.ctx(c, t, { text: 'QAN DÖVRANI İLƏ', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.5, 'heartbeat', 0.8], [1.5, 'heartbeat', 0.8], [2.5, 'heartbeat', 0.8], [3.5, 'heartbeat', 0.8], [0, 'flow_bed', 0.5, -0.3, 4], [0.3, 'type', 0.4], [1.2, 'tag', 0.4, 0.4], [1.9, 'tag', 0.4, 0.5], [1.7, 'lung_whoosh', 0.6, 0, 0.8]],
  xin: 0.35,
};
})();
