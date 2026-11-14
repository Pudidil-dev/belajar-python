// S09 ENTER THE CATHETER (24–27 s): the catheter wall cut open lengthwise beside the eyes: urine (pale-yellow markers) flows
// in through both side eyes into the large drainage lumen and on down toward the outlet. The balloon lumen in the wall
// starts below the eyes; nothing enters the balloon chamber. The camera pushes in through the opening.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const vAt = t => { const q = MO.k75(clamp((t - 0.4) / 2.3)); return { cx: lerp(W / 2, W / 2 + 26, q), y0: lerp(84, -40, q), s: lerp(15, 24, q) }; };
SC['s09_enter'] = {
  draw(c, t, S) {
    window.drawUrineBg(c, S.t);
    const v = vAt(t);
    DEV.long(c, v, { t: S.t, flow: MO.smooth(clamp((t - 0.5) / 0.5)), eyeFlow: 1, uMax: 40 });
    CAP.ctx(c, t, { text: 'Urine enters here', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'section_open', 0.6, 0], [0.3, 'type', 0.4], [0.4, 'push_soft', 0.6, 0, 2.3], [0.6, 'flow_in', 0.6, -0.3, 2.2]],
  xin: 0.3,
};
})();
