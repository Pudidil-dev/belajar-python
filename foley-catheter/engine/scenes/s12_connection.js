// S12 THE BALLOON CONNECTION (33–36 s): the longitudinal section again, along the small lumen in the wall: a cyan outline
// runs up it to the inflation port under the balloon and into the balloon chamber. The fluid in the balloon stays still —
// nothing fills; no urine ever enters this channel.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const vAt = t => { const q = MO.sineInOut(clamp(t / 2.9)); return { cx: W / 2 - 30, y0: lerp(-180, -40, q), s: 12 }; };
SC['s12_connection'] = {
  draw(c, t, S) {
    window.drawUrineBg(c, S.t, 0.5);
    DEV.long(c, vAt(t), { t: S.t, flow: 0.6, uMax: 60, chan: MO.cubicInOut(clamp((t - 0.2) / 2.2)) });
    CAP.ctx(c, t, { text: 'Separate balloon channel', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.3, 'type', 0.4], [0.2, 'trace_cyan', 0.6, 0.3, 2.2], [2.4, 'id_click', 0.6, 0.3, 2]],
  xin: 0.3,
};
})();
