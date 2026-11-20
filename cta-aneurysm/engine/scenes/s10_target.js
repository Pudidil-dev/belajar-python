// S10 THE TUNGSTEN TARGET (36–40 s): the tracked electron reaches the focal track of the spinning anode; the camera
// dives with it into the target surface (a fast log zoom) and the metal resolves into a schematic lattice of tungsten
// atoms: grey electron clouds round compact magenta nuclei. The camera locks. "Schematic • not to scale".
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camT = t => { const q = MO.expoIn(clamp((t - 0.2) / 1.25)); const a = window.S09.camAt(4); return { x: lerp(a.x, -0.15, MO.sineInOut(clamp((t - 0.2) / 1.0))), y: lerp(a.y, 0.05, clamp(t / 1)), z: K.zl(a.z, 520, q) }; };
const camL = (t, T) => {
  const A = TW.A, e = window.BREMS.elAt(T), z = K.zl(0.42, 3.4, MO.cubicOut(clamp((t - 1.45) / 2.2))), q = MO.smooth(clamp((t - 2.3) / 1.4)), L = window.BREMS.CAM();
  return { x: lerp(e[0] + 18, L.x, q), y: lerp(e[1], L.y, q), z };
};
window.S10 = { camL };
function drawTube(c, t, S) { const cam = camT(t); K.cam(c, cam); TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: 0.35 }); c.setTransform(1, 0, 0, 1, 0, 0);
  const [sx, sy] = K.S(cam, lerp(-1.2, -0.02, MO.smooth(clamp(t / 1.3))), 0.02); FX.e(c, sx, sy, 3, 1, true); FX.ring(c, sx, sy, 10, 'c4', 1); }
function drawLat(c, t, S) {
  const cam = camL(t, S.t);
  TW.draw(c, cam, S.t, { vib: 0.6, gain: 0.8 });
  c.setTransform(1, 0, 0, 1, 0, 0);
  // the tracked electron enters from the left and slows toward atom A's neighbourhood (its pass is S11–S12)
  const e = window.BREMS.elAt(S.t), [sx, sy] = K.S(cam, e[0], e[1]);
  FX.e(c, sx, sy, 3, 1, true); FX.ring(c, sx, sy, 10, 'c4', MO.smooth(clamp((t - 1.6) / 0.3)));
}
SC['s10_target'] = {
  draw(c, t, S) {
    const k = clamp((t - 1.35) / 0.25);
    if (k <= 0) drawTube(c, t, S); else if (k >= 1) drawLat(c, t, S); else dissolve(c, cc => drawTube(cc, t, S), cc => drawLat(cc, t, S), k);
    c.setTransform(1, 0, 0, 1, 0, 0);
    CAP.ctx(c, t, { text: 'VOLFRAM HƏDƏF', t0: 1.7, t1: 3.6 });
    CAP.note(c, t, { text: 'SXEM • MİQYAS GÖZLƏNİLMƏYİB', x: W / 2, y: 590, t0: 2.0, t1: 3.9, col: 'g8', align: 'center', sc: 1 });
  },
  cues: [[0.2, 'zoom_rush', 1.0, 0, 1.25], [1.45, 'lattice_in', 0.8, 0, 1.6], [1.7, 'type', 0.4], [2.0, 'tag', 0.4, 0]],
};
})();
