// S05 VENOUS DRAINAGE (9–12 s): a body-to-circuit diagram over the same layout. The patient's body is outlined over the
// drapes; the great veins bring blood back from the head and the lower body into the right atrium; from there it enters
// the drainage cannula and runs down the venous line into the reservoir, which sits below the patient: a dashed level line
// at the heart and an arrow down to the reservoir mark the height difference (gravity drainage). The rest of the circuit
// stays dim. One marker carries the eye from the atrium to the reservoir; the camera drifts with it.
(() => {
const clamp = U.clamp, lerp = U.lerp, R = n => window.RAMP[n];
const BODY = [[-34, -230], [-40, -200], [-66, -180], [-70, -60], [-62, 120], [-56, 260], [-48, 420], [-14, 450], [14, 450], [48, 420], [56, 260], [62, 120], [70, -60], [66, -180], [40, -200], [34, -230], [20, -262], [0, -270], [-20, -262]];
const SVCv = [[-30, -250], [-31, -160], [-31, -90], [-31, -40]], IVCv = [[-36, 300], [-38, 180], [-40, 90], [-38, 34]];
SC['s05_drain'] = {
  xin: 0.0,
  draw(c, t, S) {
    const cam = WORLD.track(S.t), k = MO.smooth(clamp(t / 0.6)) * (1 - MO.smooth(clamp((t - 2.5) / 0.5)));
    const Lv = WORLD.R.venous.S.at(-1), q = MO.sineInOut(clamp((t - 0.6) / 2.1)), d = q * Lv;
    WORLD.scene(c, cam, S.t, { tubes: { venous: { marker: t > 0.6 && t < 2.8 ? d : null }, arterial: { a: 1 - 0.6 * k }, cardio: { a: 1 - 0.7 * k } } });
    if (k > 0) {
      // dim everything that is not the venous side
      K.dith(c, 0, 0, 270, 480, 'n0', 0.0);
      // the body outline over the drapes, and the great veins with arrows toward the heart
      LIT.line(c, cam, WORLD.smooth(BODY.concat([BODY[0]]), 3), 'dr5', { alpha: k });
      for (const v of [SVCv, IVCv]) {
        const pts = WORLD.smooth(v, 2); LIT.tube(c, cam, pts, 8, R('vb'), { amb: 0.24, alpha: k });
        const S0 = WORLD.lens(pts), L = S0.at(-1);
        for (let dd = (S.t * 30) % 28; dd < L - 6; dd += 28) { const [x, y, a] = WORLD.at(pts, S0, dd), [sx, sy] = K.S(cam, x, y), r = 4; for (const s_ of [-1, 1]) PIX.bline(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r, sx - Math.cos(a) * r * 0.6 - Math.sin(a) * s_ * r, sy - Math.sin(a) * r * 0.6 + Math.cos(a) * s_ * r, 'vb5'); }
      }
      // the height difference: a dashed level at the heart, one at the reservoir, an arrow between them
      const yh = 6, yr = WORLD.LY.res.y + 40, xl = -150;
      const [ax, ay] = K.S(cam, xl, yh), [bx, by] = K.S(cam, xl, yr), [hx] = K.S(cam, -40, yh), [rx] = K.S(cam, WORLD.LY.res.x, yr);
      c.save(); c.globalAlpha = k;
      for (let x = Math.round(ax); x < hx; x += 4) PIX.rect(c, x, Math.round(ay), 2, 1, 'mt3');
      for (let x = Math.round(bx); x < rx; x += 4) PIX.rect(c, x, Math.round(by), 2, 1, 'mt3');
      c.restore();
      const kk = MO.smooth(clamp((t - 1.2) / 0.8)) * k;
      if (kk > 0) { const ye = lerp(ay + 3, by - 3, kk); PIX.bline(c, ax + 2, ay + 3, ax + 2, ye, 'mt3'); if (kk > 0.95) { PIX.bline(c, ax + 2, by - 2, ax - 1, by - 6, 'mt3'); PIX.bline(c, ax + 2, by - 2, ax + 5, by - 6, 'mt3'); } }
    }
    CAP.ctx(c, t, { text: 'Venous drainage', t0: 0.3, t1: 2.7, acc: 'vb5' });
  },
  cues: [[0.6, 'drain_flow', 0.7, -0.5, 2.2], [1.2, 'level', 0.4, -0.6]],
};
})();
