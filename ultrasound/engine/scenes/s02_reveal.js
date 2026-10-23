// S02 (3–7 s) — out of the image: the camera pulls back through the screen to the machine, then follows the cable
// down to the probe pressed on the belly in a bead of gel; under the skin, the fan it images lights up.
(() => {
const S = SC.s02_reveal = {};
S.cam = lt => {
  if (lt < 2) return K.zoomPath(SC.s01_hook.TGT, ROOM.MACHINE, MO.k75(U.clamp(lt / 2)));
  return K.camLerp(ROOM.MACHINE, ROOM.PROBEV, MO.sineInOut(U.clamp((lt - 2) / 1.0)));
};
S.cutA = lt => U.clamp((lt - 3) / 0.35);
// labels, drawn in screen space (also by S03 while its first frames still hold this shot)
S.labels = (c, cam, lt) => {
  const h = K.S(cam, ROOM.PRB.ax - 1.55, ROOM.PRB.ay - 10), g = K.S(cam, ROOM.PRB.ax - 3.0, ROOM.skinY(-3.0) - 0.4);
  CAP.note(c, lt, { ax: h[0], ay: h[1], x: 14, y: h[1] - 40, text: 'TRANSDUCER', t0: 2.3, t1: 4.3, col: 'w', lineCol: 'c2', box: true });
  CAP.note(c, lt, { x: 14, y: h[1] - 29, text: 'SENDS SOUND,', t0: 2.45, t1: 4.3, col: 'g9', box: true });
  CAP.note(c, lt, { x: 14, y: h[1] - 18, text: 'HEARS ECHOES', t0: 2.6, t1: 4.3, col: 'g9', box: true });
  CAP.note(c, lt, { ax: g[0], ay: g[1], x: 14, y: g[1] + 20, text: 'GEL', t0: 2.9, t1: 4.3, col: 'l2', lineCol: 'l1', box: true });
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 3 + lt, cam = S.cam(lt);
  const sq = lt > 2.65 ? MO.settle(lt - 2.65, 0.12, 3, 6) : 0;
  ROOM.draw(c, cam, t, { cut: S.cutA(lt), gel: 1 + sq, sig: lt > 3.05 && lt < 3.55 ? (lt - 3.05) / 0.5 : null });
  S.labels(c, cam, lt);
};
S.cues = [[0.1, 'hum', 0.8], [2.65, 'gel', 1], [3.0, 'tone', 0.9], [3.05, 'chirp', 0.5]];
})();
