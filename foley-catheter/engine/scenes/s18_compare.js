// S18 TWO DIFFERENT FUNCTIONS (51–54 s): two panels. Left: the retention balloon in the bladder, holding still. Right: urine
// moving down the drainage lumen. Independent jobs: the balloon does not pump anything.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp;
SC['s18_compare'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const L = [8, 130, 168, 420], R_ = [184, 130, 168, 420];
    inset(c, L[0], L[1], L[2], L[3], cc => { const cam = { x: 0, y: 8, s: 5.6, cx: L[0] + L[2] / 2 + 6, cy: L[1] + L[3] / 2 + 30, rot: 0 }; PIX.rect(cc, L[0], L[1], L[2], L[3], 'k'); PELVIS.draw(cc, cam, { t: S.t, shell: 0.5 }); FOLEY.drawCut(cc, cam, { rTip: FOLEY.R_FINAL, inflated: 1, lift: PELVIS.lift(cam, 4.5), t: S.t, balOutline: 1 }); });
    inset(c, R_[0], R_[1], R_[2], R_[3], cc => { PIX.rect(cc, R_[0], R_[1], R_[2], R_[3], 'f0'); K.dith(cc, R_[0], R_[1], R_[2], R_[3], 'f1', 0.35); DEV.long(cc, { cx: R_[0] + R_[2] / 2, y0: R_[1] - 120, s: 9 }, { t: S.t, flow: 1, uMax: 80, drain: 0.8 }); });
    for (const r of [L, R_]) { PIX.rect(c, r[0] - 1, r[1] - 1, r[2] + 2, 1, 'n4'); PIX.rect(c, r[0] - 1, r[1] + r[3], r[2] + 2, 1, 'n4'); PIX.rect(c, r[0] - 1, r[1], 1, r[3], 'n4'); PIX.rect(c, r[0] + r[2], r[1], 1, r[3], 'n4'); }
    CAP.part(c, t, { text: 'Retention', x: L[0] + L[2] / 2, y: 98, t0: 0.3, t1: 2.75, col: 'l4', align: 'center', dot: false });
    CAP.part(c, t, { text: 'Drainage', x: R_[0] + R_[2] / 2, y: 98, t0: 0.6, t1: 2.75, col: 'a2', align: 'center', dot: false });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.3, 'tag', 0.6, -0.5], [0.6, 'tag', 0.6, 0.5], [0.4, 'flow_bed', 0.4, 0.5, 2.5]],
  xin: 0.3,
};
})();
