// S08 (47–50 s) — back on the monitor, framed exactly as the opening; the live image keeps refreshing. The process
// flashes as a chain, one step per 8th note, the title types on; both clear before the end, so the last frame runs
// straight into the first.
(() => {
const S = SC.s08_final = {};
const CHAIN = [['ELECTRIC PULSE', 'c3'], ['PIEZOELECTRIC CRYSTALS', 'g9'], ['SOUND WAVES', 'y4'], ['ECHOES', 'y3'], ['SIGNALS', 'c4'], ['IMAGE', 'w']];
const T_ITEM = i => 0.05 + i * 0.25, T_OUT = 2.45;
const icon = (c, i, x, y) => {
  const R = (a, b, w, h, col) => PIX.rect(c, x + a, y + b, w, h, col);
  if (i === 0) { R(0, 5, 9, 1, 'c1'); R(4, 0, 1, 6, 'c3'); R(3, 2, 3, 1, 'c4'); }
  else if (i === 1) { R(1, 1, 7, 7, 'g7'); R(1, 1, 7, 6, 'g9'); R(1, 0, 7, 1, 'c3'); R(1, 8, 7, 1, 'g6'); }
  else if (i === 2) { R(0, 1, 9, 1, 'w'); R(0, 4, 9, 1, 'y4'); R(0, 7, 9, 1, 'y3'); }
  else if (i === 3) { R(0, 7, 9, 1, 'y2'); R(0, 4, 9, 1, 'y3'); R(3, 1, 3, 1, 'y4'); R(4, 0, 1, 1, 'y4'); R(2, 2, 1, 1, 'y4'); R(6, 2, 1, 1, 'y4'); }
  else if (i === 4) { for (let k = 0; k < 9; k++) R(k, 4 + Math.round(3 * Math.sin(k * 1.4)) - 1, 1, 2, 'c3'); }
  else { for (let r = 0; r < 8; r++) R(4 - Math.floor(r / 2), 1 + r, 1 + 2 * Math.floor(r / 2), 1, r % 3 ? 'g7' : 'w'); }
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 47 + lt, cam = ROOM.HOOK;
  ROOM.drawWall(c, cam);
  ROOM.drawMachine(c, cam, t, {});
  // the chain
  const fa = lt < T_OUT ? 1 : U.clamp(1 - (lt - T_OUT) / PIX.FADE);
  if (fa > 0) {
    c.save(); c.globalAlpha *= fa;
    const pop = MO.backOut(U.clamp(lt / 0.2), 2.2), h = Math.round(98 * Math.min(1, pop));
    PIX.rect(c, 8, 470 - h, 254, h, 'g3'); PIX.rect(c, 9, 471 - h, 252, h - 2, 'k');
    CHAIN.forEach(([s, col], i) => {
      const ti = T_ITEM(i); if (lt < ti) return;
      const y = 377 + i * 15, n = Math.floor((lt - ti) * 90), lit = lt < ti + 0.25 || i === CHAIN.length - 1;
      icon(c, i, 16, y - 1);
      PIX.text(c, (i ? '→ ' : '') + s, 30, y, lit ? 'w' : col, { n: Math.min(n, (i ? 2 : 0) + s.length) });
    });
    c.restore();
  }
  // the title
  PIX.label(c, { tx: 135, ty: 10, text: 'HOW ULTRASOUND', t0: 0.5, t1: T_OUT, col: 'w', align: 'center', sc: 2 }, lt);
  PIX.label(c, { tx: 135, ty: 30, text: 'MACHINES WORK', t0: 0.62, t1: T_OUT, col: 'c4', align: 'center', sc: 2 }, lt);
};
S.cues = () => [...CHAIN.map((_, i) => [T_ITEM(i), 'pop', 0.55 + 0.07 * i, (i % 2 ? 0.25 : -0.25), i]), [0.5, 'finish', 0.9], [2.0, 'scan', 0.5], [2.5, 'scan', 0.6]];
})();
