// S08 (47–50 s) — the whole monitor with the live image, the title above it and the process chain below it (the chain
// began at 46 s, one step per 8th note). Both clear at 49.3 s and the camera pushes back in to the opening shot, so
// the last frame runs straight into the first.
(() => {
const S = SC.s08_final = {};
const CHAIN = [['ELECTRIC PULSE', 'c3'], ['PIEZOELECTRIC CRYSTALS', 'g9'], ['SOUND WAVES', 'y4'], ['ECHOES', 'y3'], ['SIGNALS', 'c4'], ['IMAGE', 'w']];
const T_OUT = 3.3;                                                     // chain time (s after 46.0) when it clears
const icon = (c, i, x, y) => {
  const R = (a, b, w, h, col) => PIX.rect(c, x + a, y + b, w, h, col);
  if (i === 0) { R(0, 5, 9, 1, 'c1'); R(4, 0, 1, 6, 'c3'); R(3, 2, 3, 1, 'c4'); }
  else if (i === 1) { R(1, 1, 7, 7, 'g7'); R(1, 1, 7, 6, 'g9'); R(1, 0, 7, 1, 'c3'); R(1, 8, 7, 1, 'g6'); }
  else if (i === 2) { R(0, 1, 9, 1, 'w'); R(0, 4, 9, 1, 'y4'); R(0, 7, 9, 1, 'y3'); R(4, 8, 1, 1, 'w'); }
  else if (i === 3) { R(0, 7, 9, 1, 'y2'); R(0, 4, 9, 1, 'y3'); R(3, 1, 3, 1, 'y4'); R(4, 0, 1, 1, 'y4'); R(2, 2, 1, 1, 'y4'); R(6, 2, 1, 1, 'y4'); }
  else if (i === 4) { for (let k = 0; k < 9; k++) R(k, 4 + Math.round(3 * Math.sin(k * 1.4)) - 1, 1, 2, 'c3'); }
  else { for (let r = 0; r < 8; r++) R(4 - Math.floor(r / 2), 1 + r, 1 + 2 * Math.floor(r / 2), 1, r % 3 ? 'g7' : 'w'); }
};
// the chain panel; ct = seconds since 46.0
S.chain = (c, ct) => {
  const fa = ct < T_OUT ? 1 : U.clamp(1 - (ct - T_OUT) / PIX.FADE);
  if (fa <= 0) return;
  c.save(); c.globalAlpha *= fa;
  const pop = MO.backOut(U.clamp(ct / 0.2), 2.2), h = Math.round(80 * Math.min(1, pop)), y1 = 378;
  PIX.rect(c, 12, y1 - h, 226, h, 'g3'); PIX.rect(c, 13, y1 - h + 1, 224, h - 2, 'k');
  CHAIN.forEach(([s, col], i) => {
    const ti = i * 0.25; if (ct < ti + 0.02) return;
    const y = y1 - 74 + i * 12, lit = ct < ti + 0.25 || i === CHAIN.length - 1;
    icon(c, i, 19, y - 1);
    PIX.text(c, (i ? '→ ' : '') + s, 33, y, lit ? 'w' : col);
  });
  c.restore();
};
S.cam = lt => lt < 2.35 ? ROOM.FINAL : K.zoomPath(ROOM.FINAL, ROOM.HOOK, MO.cubicInOut(U.clamp((lt - 2.35) / 0.65)));
S.draw = (c, lt, info) => {
  const t = info ? info.t : 47 + lt, cam = S.cam(lt);
  ROOM.drawWall(c, cam);
  ROOM.drawMachine(c, cam, t, {});
  S.chain(c, lt + 1.0);
  PIX.label(c, { tx: 135, ty: 12, text: 'HOW ULTRASOUND', t0: 0.0, t1: 2.3, col: 'w', align: 'center', sc: 2, rate: 120 }, lt);
  PIX.label(c, { tx: 135, ty: 32, text: 'MACHINES WORK', t0: 0.1, t1: 2.3, col: 'c4', align: 'center', sc: 2, rate: 120 }, lt);
};
S.cues = () => [[0, 'finish', 1.0], [2.35, 'whoosh', 0.8], [2.0, 'scan', 0.4]];
})();
