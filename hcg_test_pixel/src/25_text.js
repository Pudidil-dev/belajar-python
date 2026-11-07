'use strict';
// ============================================================================
// THE TEXT TRACK: one dominant caption at a time, annotations beside their
// objects, the honesty chip and the strip mini-map during magnification.
// ============================================================================
const Q = 'How does urine create two lines?';
function flowArrow(t, t0, t1) {                     // the signpost while the view turns: flow now runs left → right
  if (!UI_ON || t < t0 || t >= t1) return;
  const k = Math.min(1, Math.floor((t - t0) / 0.05 + 1) / 3) * (t1 - t < 0.15 ? Math.ceil((t1 - t) / 0.05) / 3 : 1);
  if (k <= 0) return;
  const x0 = 58, y0 = 66, L = Math.round(52 * k);
  rect(x0 - 2, y0 - 5, x0 + L + 9, y0 + 6, P.BOX); frame(x0 - 2, y0 - 5, x0 + L + 9, y0 + 6, P.LB3);
  rect(x0 + 1, y0 - 1, x0 + L, y0 + 2, P.LB1);
  for (let i = 0; i < 4; i++) { rect(x0 + L + i, y0 - 3 + i, x0 + L + i + 1, y0 + 4 - i, P.LB1); }
  if (k >= 1) text(FS, 'flow', x0 + 16, y0 + 9, { sc: 1, c: P.LB1, ol: P.SH });
}
function overlays(t) {
  if (!UI_ON) return;
  // ---- 01-03 device
  caption(Q, -1, EV.qOut + 0.25, t, { instant: true });
  caption('Follow the sample', EV.cap2, EV.cap2 + 3.4, t);
  caption('Inside the test', EV.cap3, EV.cap3 + 2.6, t);
  if (t >= EV.layers[0] && t < EV.track3 + 1.25) {
    const cam = devCam(t);
    const L = [['sample pad', 92], ['conjugate pad', 50], ['membrane', -12], ['absorbent pad', -84]];
    L.forEach(([s, yy], i) => tag(s, cam.x(DEV.sx0) - 1, cam.y(yy), cam.x(DEV.bx0) - textW(FS, s, 1) + 8, cam.y(yy) - 3, EV.layers[i], EV.layers[i] + 1.75, t, P.INK));
  }
  flowArrow(t, EV.fibres, EV.fibres + 1.25);
  // ---- 04-10 the strip as a level
  caption('Capillary flow', EV.cap4, EV.cap4 + 3.0, t);
  caption('Gold-labeled antibodies', EV.cap5, EV.cap5 + 2.35, t);
  caption('Target hormone: hCG', EV.cap6, EV.cap6 + 3.0, t);
  caption('hCG binds', EV.cap7, EV.cap7 + 1.65, t);
  caption('Test zone', EV.cap8, EV.cap8 + 1.9, t);
  caption('Captured', EV.cap9, EV.cap9 + 2.65, t);
  caption('Many labels accumulate', EV.cap10, EV.cap10 + 3.65, t);
  if (t >= EV.hcgTag && t < EV.push7) {
    const cam = levelCam(t), h = hcgPose(t);
    tag('hCG', cam.x(h.cx), cam.y(h.cy) - 4, cam.x(h.cx) - 6, cam.y(h.cy) - 24, EV.hcgTag, EV.push7, t, P.MG0);
  }
  if (t >= EV.tags9[0] && t < EV.steps[0]) {
    const cam = levelCam(t), hp = heroPose(t), h = hcgOn(hp.gx, hp.gy, hp.rot), z = ZONE_T[HERO_Z], gc = conjGeoms(hp.gx, hp.gy, hp.rot)[0];
    const items = [['gold label', hp.gx - RG * 0.7, hp.gy - RG * 0.7, P.RU0], ['detection antibody', (gc.bx + gc.hx) / 2, (gc.by + gc.hy) / 2, P.CY1],
      ['hCG', h.cx, h.cy, P.MG0], ['capture antibody', (z.u + abGeom(z.u, z.v, z.a).hx) / 2, z.v - 2, P.MI1]];
    items.forEach(([s, wx, wy, col], i) => tag(s, cam.x(wx), cam.y(wy), 8, 76 + i * 30, EV.tags9[i], EV.steps[0], t, col));
  }
  if (t >= EV.flip + 0.6 && t < EV.lock11) tag('seen from above', 120, 60, 92, 56, EV.flip + 0.6, EV.lock11, t, P.SUB);
  // ---- 11-13 why gold is red
  caption('Why does gold look red?', EV.cap11, EV.cap11 + 2.9, t);
  caption('Electrons respond together', EV.cap12, EV.cap12 + 3.6, t);
  if (t >= EV.light + 0.4 && t < EV.osc) tag('white light', INS.x0 + 18, PCY - 7, INS.x0 + 8, INS.y0 + 10, EV.light + 0.4, EV.osc, t, P.LW);
  if (t >= EV.plasmon && t < EV.insetClose) tag('Plasmon resonance', PCX + PR - 6, PCY - PR + 10, INS.x0 + 64, INS.y0 + 8, EV.plasmon, EV.insetClose, t, P.CY0);
  if (t >= EV.absorbTag && t < EV.insetClose) tag('absorbs green', PCX - PR, PCY + 2, INS.x0 + 8, INS.y1 - 16, EV.absorbTag, EV.insetClose, t, P.LG0);
  if (t >= EV.absorbTag + 0.5 && t < EV.insetClose) tag('red goes on', INS.x1 - 12, PCY + 8, INS.x1 - 58, INS.y1 - 16, EV.absorbTag + 0.5, EV.insetClose, t, P.LR0);
  caption('Nanoparticles → visible line', EV.cap13, EV.cap13 + 3.4, t);
  // ---- 14-15 the control line
  caption('Control captures the label', EV.cap14, EV.cap14 + 2.9, t);
  if (t >= EV.noHcgTag && t < LENS.c) {
    const cam = new Cam(CTRL.gx + 4, CTRL.gy + 10, 2.4);
    tag('no hCG needed', cam.x(CTRL.tip[0]), cam.y(CTRL.tip[1]), 10, 196, EV.noHcgTag, LENS.c, t, P.VI0);
  }
  if (t >= EV.tagT && t < EV.split) {
    const c = WIN_CAM();
    tag('hCG detected', c.x(DEV.sx0), c.y(DEV.yT), 8, c.y(DEV.yT) + 8, EV.tagT, EV.split, t, P.RL0);
    tag('Procedural control', c.x(DEV.sx0), c.y(DEV.yC), 8, c.y(DEV.yC) - 16, EV.tagC, EV.split, t, P.RL0);
  }
  // ---- 16-17 results
  caption('hCG not detected', EV.cap16, EV.cap16 + 2.45, t, { cx: 118 });
  if (t >= EV.cap16 && t < EV.invalidIn) {
    text(FS, 'T + C', SPLIT.xl - 9, 66, { sc: 1, c: P.SUB, ol: P.SH }); text(FS, 'C only', SPLIT.xr - 11, 66, { sc: 1, c: P.SUB, ol: P.SH });
  }
  caption('No control = invalid', EV.cap17, EV.cap17 + 2.9, t);
  if (t >= EV.warn + 0.25 && t < EV.ret) { const c = INV_CAM(0); tag('C missing', c.x(DEV.sx0) - 3, c.y(DEV.yC), 10, c.y(DEV.yC) - 30, EV.warn + 0.25, EV.ret, t, P.AM0); }
  // ---- 18 the question returns (it stays on screen through the loop point)
  caption(Q, EV.cap18, DUR + EV.qOut + 0.25, t);
  // ---- the honesty chip and the strip mini-map: shown when the view magnifies or travels, then they get out of the way
  chip('Schematic • not to scale', EV.flowArrow, EV.reachConj, t);
  chip('Schematic • not to scale', EV.inset + 0.75, EV.osc, t);
  chip('Slowed schematic', EV.osc, EV.insetClose + 0.25, t);
  chip('Schematic • not to scale', LENS.a + 0.25, LENS.c, t);
  miniMap(t, mapU(levelCam(t).cx), EV.flowArrow, EV.reachConj, null);
  miniMap(t, mapU(levelCam(t).cx), EV.pull8, EV.push9, null);
  miniMap(t, mapU(610), EV.inset + 0.75, EV.osc, 'T');
  miniMap(t, mapU(970), LENS.a + 0.25, LENS.c, 'C');
}
