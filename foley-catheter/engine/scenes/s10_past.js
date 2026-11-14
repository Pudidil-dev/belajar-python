// S10 PAST THE BALLOON (27–30 s): a see-through longitudinal section of the shaft across the balloon region: the drainage
// lumen runs straight through; the expanded balloon surrounds the outside of the shaft and stays still. Urine runs down the
// open channel past it. The camera tracks down with the flow.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const vAt = t => { const q = MO.sineInOut(clamp(t / 2.9)); return { cx: W / 2, y0: lerp(120, -70, q), s: 8.6 }; };
SC['s10_past'] = {
  draw(c, t, S) {
    window.drawUrineBg(c, S.t, 0.6);
    DEV.long(c, vAt(t), { t: S.t, flow: 1, uMax: 90, drain: MO.smooth(clamp((t - 0.8) / 0.5)) * 0.8 });
    CAP.ctx(c, t, { text: 'An open channel\nthrough the shaft', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.3, 'type', 0.4], [0, 'track', 0.5, 0, 2.9], [0.2, 'flow_bed', 0.5, 0, 2.8], [0.8, 'id_click', 0.5, -0.3, 0]],
  xin: 0.3,
};
})();
