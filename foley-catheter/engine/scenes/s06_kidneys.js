// S06 URINE REACHES THE BLADDER (15–18 s): a front-view overview of the urinary system (voxel): the kidneys keep making
// urine; it runs down the two ureters into the bladder (pale-yellow markers). The catheter sits in the bladder outlet with
// its balloon — it drains the bladder, not the kidneys. Then the view returns to the bladder section.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const q = MO.sineInOut(clamp(t / 2.0)); return { x: 0, y: lerp(150, 90, q), s: 1.62, cx: W / 2, cy: 330, rot: 0 }; };
const drawKid = (c, t, S) => {
  const cam = camAt(t);
  PIX.rect(c, 0, 0, W, H, 'k');
  BED.kidDraw(c, cam, { t: S.t });
  const lift = PELVIS.lift(cam, 5.2);
  // the catheter in the outlet (front view): shaft up the urethra, balloon in the bladder base, tip and eyes above it
  const pts = []; for (let y = -110; y <= 36; y += 0.6) { const [sx, sy] = PELVIS.S(cam, 0, y); pts.push([sx + lift[0], sy + lift[1], (y > 36 - 2.7 ? Math.sqrt(Math.max(0.1, 2.7 * 2.7 - (y - 33.3) ** 2)) : 2.7) * cam.s, 0]); }
  FOLEY.tubeSplat(c, pts);
  const [bx, by] = PELVIS.S(cam, 0, 11.5); FOLEY.balloon(c, bx + lift[0], by + lift[1], Math.PI / 2, 10.5 * cam.s, 11 * cam.s, { alpha: 0.55 });
  // urine markers down the ureters
  for (const sd of [-1, 1]) {
    const u = BED.URETER(sd), L = BED.plen(u);
    for (let k = 0; k < 9; k++) { const d = K.wrap(S.t * 46 + k * L / 9, L), [x, y] = BED.along(u, d), [sx, sy] = PELVIS.S(cam, x, y); PIX.rect(c, Math.round(sx + lift[0] * 0.6) - 1, Math.round(sy + lift[1] * 0.6) - 1, 3, 3, 'f4'); }
  }
};
SC['s06_kidneys'] = {
  draw(c, t, S) {
    const k = clamp((t - 2.25) / 0.4);
    const back = cc => window.drawCutaway(cc, window.S03.CAM, { rTip: FOLEY.R_FINAL, inflated: 1, t: S.t });
    if (k <= 0) drawKid(c, t, S); else if (k >= 1) back(c); else dissolve(c, cc => drawKid(cc, t, S), back, k);
    CAP.ctx(c, t, { text: 'Urine reaches the bladder', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'flow_bed', 0.6, 0, 3], [0.3, 'type', 0.4], [0.5, 'drip', 0.4, -0.4, 0], [1.0, 'drip', 0.4, 0.4, 1], [1.5, 'drip', 0.4, -0.3, 2], [2.25, 'return_soft', 0.6, 0]],
  xin: 0.3,
};
})();
