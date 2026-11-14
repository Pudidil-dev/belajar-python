// S11 TWO CHANNELS (30–33 s): a locked technical close-up of the catheter's cross-section: the large drainage lumen lights
// amber, the small balloon lumen in the wall lights cyan, and the partition between them stays solid. Two-way: no third
// (irrigation) channel.
(() => {
const { W, H } = PIX;
const clamp = U.clamp;
SC['s11_channels'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k'); K.dith(c, 0, 0, W, H, 'n1', 0.5);
    const z = U.lerp(46, 52, MO.cubicOut(clamp(t / 0.6)));
    DEV.cross(c, W / 2, 352, z, { t: S.t, drain: MO.smooth(clamp((t - 0.5) / 0.4)), chan: MO.smooth(clamp((t - 1.2) / 0.4)) });
    CAP.ctx(c, t, { text: 'One catheter.\nTwo channels.', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.3, 'type', 0.4], [0.5, 'id_click', 0.8, -0.3, 0], [1.2, 'id_click', 0.8, 0.3, 1]],
  xin: 0.3,
};
})();
