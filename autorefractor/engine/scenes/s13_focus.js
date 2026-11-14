// S13 WHERE DOES THE LIGHT FOCUS? (36–39 s): what the pattern is about. Two simplified comparison eyes in their own panels
// (separate models, not the patient's eye). Parallel light from a distant point enters each. In the first it comes to a
// focus on the retina. The second eye is longer, and the same optics bring the light to a focus in front of the retina,
// so it has spread again by the time it lands: a nearsighted (myopic) eye.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const Z = 5.3, XA = 204;                                       // px per mm; screen x of both corneal apexes
const PAN = [{ y0: 148, y1: 318, AL: 24.0 }, { y0: 334, y1: 504, AL: 26.6 }];
const HS = [-1.7, -0.85, 0, 0.85, 1.7];
let RAYS = null;
const rays = () => RAYS || (RAYS = PAN.map(p => HS.map(hh => EYE.traceIn(hh, 0, -17, p.AL).map(EYE.W))));
SC['s13_focus'] = {
  xin: 0.4,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t, 180, 326, 330);
    const RY = rays();
    PAN.forEach((p, pi) => {
      const a = MO.smooth(clamp((t - 0.1 - pi * 0.15) / 0.3)), dl = pi * 0.25; if (a <= 0) return;
      const yc = (p.y0 + p.y1) / 2, cam = { x: (180 - XA) / Z, y: (320 - yc) / Z, z: Z };
      if (a < 1) { K.dith(c, 24, p.y0, 312, p.y1 - p.y0, 'n1', a); return; }
      PIX.rect(c, 24, p.y0, 312, p.y1 - p.y0, 'n1'); PIX.rect(c, 24, p.y0, 312, 1, 'n3'); PIX.rect(c, 24, p.y1 - 1, 312, 1, 'n2'); PIX.rect(c, 24, p.y0, 2, p.y1 - p.y0, pi ? 'bc1' : 'e2');
      window.inset(c, 26, p.y0 + 1, 310, p.y1 - p.y0 - 2, cc => {
        EYE.simple(cc, cam, p.AL);
        // the light: five parallel guides running in from the right
        const q = clamp((t - 0.5 - dl) / 1.0), L = OPT.len(RY[pi][2]);
        OPT.rays(cc, cam, RY[pi], OPT.uAtD(RY[pi][2], q * L), { col: ['g7', 'ga', 'w'], t: S.t, head: q < 1 });
        if (q >= 1) {
          const k = clamp((t - 1.5 - dl) / 0.3);
          // the focus: where the guides cross the axis
          const fd = EYE.traceIn(0.85, 0, -17, p.AL, 1).cross, [fx, fy] = K.S(cam, -fd, 0);
          FX.glowL(cc, fx, fy, 12 * k, pi ? ['bc0', 'bc1', 'bc2'] : ['e0', 'e1', 'e2', 'e3'], 0.9, 1.4); PIX.rect(cc, Math.round(fx) - 2, Math.round(fy) - 2, 5, 5, pi ? 'bc3' : 'e4');
          if (pi && k >= 1) { const [rx] = K.S(cam, -p.AL, 0); PIX.rect(cc, Math.round(fx), Math.round(fy) + 14, Math.round(rx - fx) + 1, 1, 'bc2'); PIX.rect(cc, Math.round(fx), Math.round(fy) + 11, 1, 7, 'bc2'); PIX.rect(cc, Math.round(rx), Math.round(fy) + 11, 1, 7, 'bc2'); }
        }
      });
    });
    for (const [pi, text, col, t0] of [[0, 'On retina', 'e3', 1.6], [1, 'In front', 'bc3', 1.85]]) {
      const yc = (PAN[pi].y0 + PAN[pi].y1) / 2;
      if (!window.NOTEXT && t >= t0) PIX.rect(c, 176, yc + 55, 6, 6, pi ? 'bc2' : 'e2');
      CAP.note(c, t, { text, x: 188, y: yc + 52, t0, t1: 2.65, col });
    }
    CAP.ctx(c, t, { text: 'Where does light focus?', t0: 0.3, t1: 2.7, acc: 'e2' });
  },
  cues: [[0.125, 'panel', 0.5, -0.3], [0.25, 'panel', 0.5, 0.3], [0.3, 'type', 0.4], [0.5, 'rays_in', 0.6, 0.4, 1.0], [1.5, 'focus_on', 0.9, -0.3], [1.75, 'focus_front', 0.9, -0.1]],
};
})();
