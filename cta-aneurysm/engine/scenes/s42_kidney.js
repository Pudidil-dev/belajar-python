// S42 CONTRAST AND THE BODY (164–168 s): the body diagram again, now down to the pelvis. The contrast is carried by the
// blood to the kidneys, filtered out over time and collected in the bladder (a clock turns: this takes hours, not
// seconds, and differs between patients). Before the scan, contrast safety is assessed: a card with a kidney check.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const CAM = { x: 0, y: 14, z: 0.86 };
const R = BODY.R, L = k => BODY.len(R[k]);
SC['s42_kidney'] = {
  draw(c, t, S) {
    K.cam(c, CAM);
    const fill = MO.smooth(clamp((t - 0.6) / 2.8));
    BODY.draw(c, { t: S.t, beat: window.beatAt(t, 0.5) * 0.6, kidneys: true, bladder: fill });
    // a thinning violet trace still in the arteries, molecules travelling down to the kidneys, then the ureters
    BODY.bolus(c, R.desc, 0, L('desc'), 5, S.t, 3, 0.6);
    for (const k of ['renR', 'renL']) BODY.bolus(c, R[k], 0, L(k), 3, S.t, 4);
    for (const k of ['ureR', 'ureL']) BODY.bolus(c, R[k], 0, L(k) * clamp((t - 0.4) / 1.6), 2.5, S.t, 5);
    const bp = new Path2D(); bp.ellipse(14, 236, 30 * fill, (22 + 4 * fill) * fill, 0, 0, TAU); c.save(); c.clip(bp); PIX.rect(c, -40, 200, 110, 70, 'v1'); c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the clock (time passing) and the assessment card with a kidney check
    const ca = MO.smooth(clamp((t - 0.3) / 0.3)), cx = 300, cy = 140;
    c.save(); c.globalAlpha = ca; PIX.circ(c, cx, cy, 20, 'k'); FX.ring(c, cx, cy, 18, 'g7', 1); const an = t * 2.4; PIX.bline(c, cx, cy, cx + Math.sin(an) * 14, cy - Math.cos(an) * 14, 'w'); PIX.bline(c, cx, cy, cx + Math.sin(an / 12) * 9, cy - Math.cos(an / 12) * 9, 'g8'); c.restore();
    const ka = MO.backOut(clamp((t - 1.6) / 0.4), 1.5);
    if (ka > 0) {
      const x = 22, y = 470, w = 96 * ka, hh = 118 * ka;
      PIX.flat(c, PIX.rectPath(x, y, w, hh, 4), 'q5', 'q3', 'q6'); PIX.rect(c, x + w / 2 - 14 * ka, y - 6 * ka, 28 * ka, 10 * ka, 'g5');
      if (ka > 0.9) {
        const kp = new Path2D(); kp.ellipse(x + 30, y + 44, 12, 18, 0.25, 0, TAU); PIX.fill(c, kp, 'u1');
        for (let k = 0; k < 3; k++) PIX.rect(c, x + 50, y + 30 + k * 12, 34, 3, 'q3');
        const ck = MO.cubicOut(clamp((t - 2.3) / 0.35)); if (ck > 0) { const ax = x + 30, ay = y + 92; PIX.bline(c, ax - 12, ay - 2, ax - 12 + 8 * Math.min(1, ck * 2), ay + 6 * Math.min(1, ck * 2), 'e2'); if (ck > 0.5) PIX.bline(c, ax - 4, ay + 6, ax - 4 + 18 * (ck - 0.5) * 2, ay + 6 - 18 * (ck - 0.5) * 2, 'e2'); PIX.bline(c, ax - 12, ay - 1, ax - 4, ay + 7, 'e2'); }
      }
    }
    const [kx, ky] = K.S(CAM, 66, 104);
    CAP.part(c, t, { text: 'BÖYRƏKLƏR', ax: kx, ay: ky, x: 338, y: 470, t0: 1.0, t1: 3.6, col: 'u3', lineCol: 'g7', align: 'right' });
    CAP.ctx(c, t, { text: 'KONTRAST TƏHLÜKƏSİZLİYİ', t0: 0.35, t1: 3.6 });
  },
  cues: [[0, 'calm_pad', 0.5, 0, 4], [0.35, 'type', 0.4], [0.6, 'clear_flow', 0.7, 0, 2.8], [1.0, 'tag', 0.4, 0.4], [1.6, 'card_pop', 0.6, -0.5], [2.3, 'check', 0.9, -0.5]],
  xin: 0.35,
};
})();
