// S01 WHERE DOES IT GO? (0–3 s): the sagittal pelvic cutaway as a voxel diorama — bladder with urine, bladder neck,
// prostate, the S-curved urethra, the penis in clinical section — and a Foley catheter already partly inside the urethra.
// The film opens with a fast pull-back out of a catheter segment (the loop wipe from S20), then a cyan outline rings the
// tip and the tip starts forward along the urethra.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CAM0 = { x: 6, y: -26, s: 2.3, cx: W / 2, cy: 352, rot: 0 };
window.S01 = { CAM0, R0: 62 };
const camAt = t => { const pb = MO.expoOut(clamp(t / 0.55)); const z = K.zl(16, CAM0.s, pb), a = FOLEY.route(30); return { ...CAM0, s: z, x: lerp(a[0], CAM0.x, pb), y: lerp(a[1], CAM0.y, pb) }; };
const tipAt = t => window.S01.R0 + 14 * MO.k75(clamp((t - 1.3) / 1.7));
window.drawCutaway = (c, cam, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  PELVIS.draw(c, cam, { t: o.t || 0, shell: o.shell ?? 0.5 });
  return FOLEY.drawCut(c, cam, { rTip: o.rTip, inflated: o.inflated, lift: PELVIS.lift(cam, 4.5), ring: o.ring || 0, t: o.t || 0, drain: o.drain || 0, chan: o.chan || 0, balOutline: o.balOutline || 0, drainMax: o.drainMax });
};
SC['s01_where'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    window.drawCutaway(c, cam, { rTip: tipAt(t), t: S.t, ring: MO.cubicOut(clamp((t - 0.55) / 0.5)) });
    CAP.ctx(c, t, { text: 'Where does this tube\nactually go?', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'open_pull', 1.0, 0, 0.55], [0.3, 'type', 0.4], [0.55, 'curious', 0.8, -0.2, 0], [1.05, 'curious', 0.7, 0.2, 1], [1.3, 'glide', 0.5, 0, 1.7]],
};
})();
