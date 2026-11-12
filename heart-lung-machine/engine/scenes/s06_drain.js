// S06 STEP 1 · VENOUS DRAINAGE (18–21 s): from the chest window the camera follows the venous line down to the reservoir.
// Blood leaves the right atrium through the venous cannula and runs down by gravity: the reservoir sits well below the
// heart, so this side needs no pump. Two dashed levels (the heart, the reservoir's blood level) and an arrow between them
// mark the height difference. A bright drop rides the line and the camera follows it.
(() => {
const { W } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const LY = SIDE.LY, RA = SIDE.H2S(-40, 6);
SC['s06_drain'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), Lv = SIDE.len('venous'), q = MO.sineInOut(clamp((t - 0.25) / 2.45)), d = q * Lv;
    SIDE.scene(c, cam, T, { tubes: { venous: { marker: t > 0.25 && t < 2.75 ? d : null } } });
    // the height difference: a dashed level at the heart, one at the reservoir's blood level, an arrow down between them
    const k = MO.smooth(clamp((t - 0.9) / 0.4)) * (1 - MO.smooth(clamp((t - 2.8) / 0.2)));
    if (k > 0) {
      const [, yh] = K.S(cam, 0, RA[1]), [, yr] = K.S(cam, 0, LY.res.level), x0 = 4, x1 = W - 4;
      c.save(); c.globalAlpha = k;
      for (let x = x0; x < x1; x += 6) { PIX.rect(c, x, Math.round(yh), 3, 1, 'mt3'); PIX.rect(c, x, Math.round(yr), 3, 1, 'mt3'); }
      const ye = lerp(yh + 3, yr - 2, MO.smooth(clamp((t - 1.1) / 0.6)));
      PIX.rect(c, 16, Math.round(yh) + 3, 1, Math.max(0, Math.round(ye - yh - 3)), 'mt4');
      if (ye > yr - 3) { PIX.bline(c, 16, yr - 2, 12, yr - 7, 'mt4'); PIX.bline(c, 16, yr - 2, 20, yr - 7, 'mt4'); }
      c.restore();
      CAP.part(c, t, { text: 'HEART LEVEL', ax: null, x: W - 6, y: Math.round(yh) - 12, t0: 1.0, t1: 2.75, col: 'mt4', align: 'right' });
      CAP.part(c, t, { text: 'RESERVOIR LEVEL', ax: null, x: W - 6, y: Math.round(yr) + 4, t0: 1.25, t1: 2.75, col: 'mt4', align: 'right' });
      CAP.part(c, t, { text: 'GRAVITY', ax: null, x: 22, y: Math.round((yh + yr) / 2) - 4, t0: 1.5, t1: 2.75, col: 'w' });
    }
    SIDE.label(c, cam, t, { text: 'RIGHT ATRIUM', at: RA, dx: 22, dy: 18, t0: 0.2, t1: 1.3, col: 'hr5' });
    SIDE.label(c, cam, t, { text: 'VENOUS CANNULA', at: [-58, -93], dx: -10, dy: -24, align: 'right', t0: 0.45, t1: 1.4, col: 'vb5' });
    CAP.scene(c, t, { title: '1 · VENOUS DRAINAGE', ctx: 'Gravity pulls it down.', t0: 0.1, t1: 2.92, acc: 'vb5' });
  },
  cues: [[0.25, 'drain_flow', 0.7, -0.5, 2.4], [0.2, 'label', 0.4, 0.2], [0.45, 'label', 0.4, -0.3], [0.9, 'level', 0.4, -0.6], [1.5, 'label', 0.3, -0.6]],
};
})();
