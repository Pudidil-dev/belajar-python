// S08 DRAINAGE EYES (21–24 s): a macro of the tip in 3D: the rounded end is closed; two opposing side eyes open into the
// drainage lumen; the expanded balloon lies farther along the shaft. The catheter turns a little about its axis so first
// one eye and then the other faces us. Urine all round (pale-yellow haze with slow markers).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const yawAt = t => lerp(-0.95, 1.05, MO.sineInOut(clamp((t - 0.15) / 2.7)));
window.drawUrineBg = (c, t, a = 1) => {
  PIX.rect(c, 0, 0, W, H, 'f0');
  K.dith(c, 0, 0, W, H, 'f1', 0.42 * a);
  for (let k = 0; k < 40; k++) { const x = K.wrap(h(k, 1) * W + t * 6 * (h(k, 2) - 0.5), W), y = K.wrap(h(k, 3) * H - t * 14 * h(k, 4), H); PIX.rect(c, Math.round(x), Math.round(y), 2, 1, 'f2'); }
};
SC['s08_eyes'] = {
  draw(c, t, S) {
    window.drawUrineBg(c, S.t);
    DEV.macro(c, { cx: W / 2, cy: 118, s: 15, yaw: yawAt(t) });
    // the eyes are marked once each as they face us (amber)
    const ya = yawAt(t);
    for (const sg of [-1, 1]) { const facing = Math.cos(ya + sg * Math.PI / 2); if (facing > 0.75) FOLEY.ring(c, W / 2 + Math.sin(-(ya + sg * Math.PI / 2)) * 2.7 * 15 * 0.6, 118 + 9.25 * 15, 40, MO.smooth(clamp((facing - 0.75) / 0.2)), S.t, 'a2'); }
    CAP.ctx(c, t, { text: 'Drainage eyes', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.3, 'type', 0.4], [0.2, 'orbit', 0.5, 0, 2.7], [0.6, 'id_click', 0.6, -0.4, 0], [2.2, 'id_click', 0.6, 0.4, 1]],
};
})();
