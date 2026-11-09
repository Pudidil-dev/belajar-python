// S15 RELATIVE HEIGHT (42–45 s): the bedside again, pulling back from the bag: a dashed line marks the bladder's height; the
// bag, on its hanger, is clearly lower and off the floor; the tubing falls steadily, with no loop below the bag inlet.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const C2 = window.BEDWIDE, q = MO.k75(clamp((t - 0.1) / 1.6)); return { ...C2, s: K.zl(1.2, C2.s, q), x: lerp(560, C2.x, q), y: lerp(-300, C2.y, q) }; };
SC['s15_height'] = {
  draw(c, t, S) {
    BED.draw(c, camAt(t), { t: S.t, level: MO.cubicOut(clamp((t - 1.5) / 0.7)), flow: 0.6 });
    CAP.ctx(c, t, { text: 'Bag below bladder level', t0: 0.4, t1: 2.75 });
  },
  cues: [[0, 'whoosh_out', 0.6, 0, 1.7], [0.4, 'type', 0.4], [1.5, 'level_line', 0.7, 0, 0.7]],
  xin: 0.3,
};
})();
