// S03 (7–14 s) — into the probe: a pause on it, then a log dive through the housing into the curved row of crystal
// elements; a dissolve to the micro world. An electric pulse runs down the wires of five elements; they snap thicker
// and ring for 2–3 cycles, damped by the backing; that vibration pushes one short pressure pulse out through the
// matching layer and the lens. The camera pulls back as the pulse leaves through the gel into the skin.
(() => {
const S = SC.s03_crystals = {}, M = PROBE.M;
const DIVE = { x: ROOM.PRB.ax, y: ROOM.PRB.ay + US.RP - 0.26, z: 300 }, ZEND = 667, FIRE = 9.5;
S.FIRE = FIRE;
S.zg = lt => K.zl(ROOM.PROBEV.z, ZEND, MO.sineInOut(U.clamp((lt - 0.3) / 1.7)));
S.roomCam = z => { const z0 = ROOM.PROBEV.z, s = U.clamp((1 / z - 1 / z0) / (1 / DIVE.z - 1 / z0)); return { x: U.lerp(ROOM.PROBEV.x, DIVE.x, s), y: U.lerp(ROOM.PROBEV.y, DIVE.y, s), z }; };
S.microCam = lt => {
  if (lt < 5) return { x: M.CX, y: U.lerp(248, 268, MO.smooth(U.clamp((lt - 1.4) / 0.6))), z: S.zg(lt) / ZEND };
  const e = MO.k75(U.clamp((lt - 5) / 1.6));
  return { x: M.CX, y: U.lerp(268, 560, e), z: K.zl(1, 0.42, e) };
};
S.state = t => ({
  fires: [{ t0: FIRE, e0: -2, e1: 2 }],
  waves: [{ y0: M.GND, t0: FIRE, dir: 1, amp: 1, x0: M.ex(-2) - 18, x1: M.ex(2) + 18, col: 'tx' }],
  gel: 1,
});
// the inset scope: the drive voltage and the crystal's thickness against time (cause, then effect)
S.scope = (c, t, st, a) => {
  if (a <= 0) return;
  const x0 = 158, y0 = 84, w = 104, h = 58;
  c.save(); c.globalAlpha *= a;
  PIX.rect(c, x0 - 2, y0 - 2, w + 4, h + 4, 'g4'); PIX.rect(c, x0 - 1, y0 - 1, w + 2, h + 2, 'k');
  PIX.text(c, 'VOLTAGE', x0 + 2, y0 + 1, 'c3', { shadow: null });
  PIX.text(c, 'THICKNESS', x0 + 2, y0 + 30, 'g9', { shadow: null });
  PIX.rect(c, x0 + 2, y0 + 24, w - 4, 1, 'g2'); PIX.rect(c, x0 + 2, y0 + 47, w - 4, 1, 'g2');
  let prev = null;
  for (let k = 0; k < w - 4; k++) {
    const tt = t - 1.1 + 1.1 * k / (w - 5), v = Math.abs(tt - FIRE) < 0.035 ? 1 : 0, th = PROBE.thickness(st, 0, tt) / 9;
    if (v) PIX.rect(c, x0 + 2 + k, y0 + 12, 1, 12, 'c3');
    const y = Math.round(y0 + 47 - 7 * th);
    if (prev != null) PIX.rect(c, x0 + 2 + k, Math.min(prev, y), 1, Math.abs(prev - y) + 1, 'w');
    prev = y;
  }
  c.restore();
};
const boxSteps = S.boxSteps = (c, lt, items, x, y, t1) => {
  items.forEach(([ti, s], i) => { if (lt >= ti && lt < t1 + PIX.FADE) { const n = Math.min([...s].length, Math.floor((lt - ti) * PIX.RATE)); c.save(); c.globalAlpha *= lt <= t1 ? 1 : 1 - (lt - t1) / PIX.FADE; PIX.rect(c, x - 2, y + i * 12 - 2, PIX.textWidth([...s].slice(0, n).join('')) + 13, 11, 'k'); c.restore(); } });
  CAP.steps(c, lt, { x, y, items, t1, gap: 12 });
};
S.STEPS = [[2.5, 'ELECTRIC PULSE', 'c3'], [2.62, 'CRYSTAL DEFORMS', 'w'], [2.9, 'VIBRATION = SOUND WAVE', 'y4']];
S.draw = (c, lt, info) => {
  const t = info ? info.t : 7 + lt, zg = S.zg(lt);
  const room = cc => {
    const cam = lt < 0.3 ? ROOM.PROBEV : S.roomCam(zg);
    ROOM.draw(cc, cam, t, { cut: 1 });
    PROBE.drawCut(cc, cam, U.clamp((cam.z - 9) / 10));
    if (lt < 0.6) SC.s02_reveal.labels(cc, cam, lt + 4);
  };
  const micro = cc => PROBE.drawMicro(cc, S.microCam(lt), t, S.state(t));
  const dz = U.clamp((Math.log(zg) - Math.log(200)) / (Math.log(400) - Math.log(200)));
  if (dz <= 0) room(c); else if (dz >= 1) micro(c); else window.dissolve(c, room, micro, dz);
  if (lt < 1.3) return;
  const st = S.state(t), cam = S.microCam(lt);
  CAP.scene(c, lt, { title: 'PIEZOELECTRIC CRYSTALS', ctx: 'ELECTRICITY IN, VIBRATION OUT', t0: 1.55, t1: 6.6 });
  S.scope(c, t, st, U.clamp((lt - 2.0) / 0.2) * (1 - U.clamp((lt - 5.0) / 0.25)));
  // the pulse on the wire
  const wx = K.S(cam, M.ex(-2), 0)[0];
  CAP.note(c, lt, { ax: wx, ay: 150, x: 12, y: 128, text: 'ELECTRICAL PULSE', t0: 2.15, t1: 4.9, col: 'c4', lineCol: 'c2', box: true });
  boxSteps(c, lt, S.STEPS, 14, 392, 4.9);
  PIX.label(c, { tx: 262, ty: 468, text: 'SLOW MOTION, NOT TO SCALE', t0: 2.3, t1: 6.6, col: 'g6', align: 'right' }, lt);
  // the pulse leaving: short, 2–3 cycles
  const yp = M.GND + M.V * (t - FIRE) + M.LAM * 0.6, sp = K.S(cam, M.ex(2) + 18, yp);
  const ny = Math.min(sp[1] + 22, 436);
  CAP.note(c, lt, { ax: sp[0], ay: sp[1], x: 150, y: ny, text: 'SHORT PULSE:', t0: 5.25, t1: 6.6, col: 'y4', lineCol: 'y2', box: true });
  CAP.note(c, lt, { x: 150, y: ny + 11, text: '2-3 CYCLES', t0: 5.38, t1: 6.6, col: 'y4', box: true });
};
S.cues = [[0.3, 'whoosh', 0.8], [1.55, 'tone', 0.6], [2.25, 'trigger', 0.9], [2.5, 'crystal', 1], [2.75, 'crystal', 0.6], [3.0, 'crystal', 0.35], [2.5, 'buzz', 0.7], [5.0, 'sweep', 0.7]];
})();
