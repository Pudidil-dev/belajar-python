// S16 URINE COLLECTION (45–48 s): close on the bag's inlet and the urine already in it: a few drops fall from the inlet and
// join the liquid; the level rises just a little (schematic, not a bag filled in seconds). Restrained markings, no numbers.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
SC['s16_collect'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k'); K.dith(c, 0, 0, W, H, 'n1', 0.45);
    const z = lerp(1, 1.08, MO.sineInOut(clamp(t / 3))), X = x => W / 2 + (x - W / 2) * z, Y = y => 330 + (y - 330) * z;
    // the inlet tube and a small drip chamber at the top of the bag
    PIX.flat(c, PIX.rectPath(X(168), Y(-20), 24 * z, 190 * z, 6), 'g8', 'g6', 'g9');
    PIX.flat(c, PIX.rectPath(X(152), Y(160), 56 * z, 64 * z, 8), 'g6', 'g4', 'g8');
    PIX.rect(c, X(160), Y(170), 40 * z, 46 * z, 'n1');
    // the bag
    const bp = PIX.rectPath(X(48), Y(218), 264 * z, 380 * z, 26 * z);
    c.save(); c.globalAlpha = 0.4; PIX.fill(c, bp, 'n4'); c.restore();
    const lvl = lerp(0.46, 0.48, MO.smooth(clamp((t - 0.6) / 2.2)));
    c.save(); c.clip(bp); const yl = Y(218 + 380 * (1 - lvl)); PIX.rect(c, 0, yl, W, H, 'f2'); K.dith(c, 0, yl, W, H, 'f1', 0.3);
    for (let k = 0; k < 7; k++) { const x = X(80 + k * 30) + Math.sin(S.t * 2 + k) * 2; PIX.rect(c, Math.round(x), Math.round(yl), 10, 1, 'f4'); }
    c.restore();
    c.save(); c.strokeStyle = P.g8; c.lineWidth = 2; c.stroke(bp); c.restore();
    for (let k = 1; k < 7; k++) { const y = Y(218 + 380 * (1 - k / 7)); PIX.rect(c, Math.round(X(60)), Math.round(y), Math.round(26 * z), 1, 'g7'); }
    // drops: from the chamber down into the urine; each makes a small ring on arrival
    for (let k = 0; k < 4; k++) {
      const t0 = 0.35 + k * 0.62, age = t - t0; if (age < 0) continue;
      const yl = Y(218 + 380 * (1 - lvl)), y = lerp(Y(216), yl, Math.min(1, (age / 0.45) ** 2));
      if (age < 0.45) { PIX.rect(c, Math.round(X(180)) - 2, Math.round(y) - 3, 4, 6, 'f3'); PIX.rect(c, Math.round(X(180)) - 1, Math.round(y) - 2, 1, 2, 'f4'); }
      else if (age < 1.0) FX.ring(c, X(180), yl + 1, 4 + (age - 0.45) * 30, 'f4', 1 - (age - 0.45) / 0.55);
    }
    CAP.ctx(c, t, { text: 'Urine collects in the bag', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.3, 'type', 0.4], [0.8, 'drop', 0.5, 0.1, 0], [1.42, 'drop', 0.5, 0.1, 1], [2.04, 'drop', 0.5, 0.1, 2], [2.0, 'complete', 0.8, 0]],
  xin: 0.3,
};
})();
