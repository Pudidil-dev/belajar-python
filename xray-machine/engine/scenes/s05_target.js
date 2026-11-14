// S05 TUNGSTEN TARGET (18–22 s): the dive continues into the anode's tungsten surface until the metal resolves into
// atoms: orange nuclei inside golden electron clouds (probability clouds, not orbits). Electrons arrive in extreme slow
// motion, weave between the atoms, and atoms they pass close to light up (they are excited — the start of the heat).
// The slow motion deepens as the camera pushes toward atom A, where the bremsstrahlung close-up (S06) happens.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
let ELS = [];
// slow-motion clock: rate 1 until 3.0 s, then ramps down to 0.357 (S06 runs at that rate)
const RATE1 = 0.357;
const IS = u => u <= 1 ? u ** 6 - 3 * u ** 5 + 2.5 * u ** 4 : 0.5 + (u - 1);     // ∫ smoothstep
const tau = t => t < 3 ? t : 3 + (t - 3) - (1 - RATE1) * IS(t - 3);
const camAt = t => {
  if (t < 0.9) { const z = K.zl(0.22, 1.0, MO.cubicOut(t / 0.9)); return { x: -65 / z, y: 0, z }; }
  if (t < 3.0) { const p = MO.sineInOut((t - 0.9) / 2.1); return { x: lerp(-65, 95, p), y: lerp(0, 0, p), z: K.zl(1.0, 1.15, p) }; }
  const q = clamp((t - 3.0) / 1.0);
  return { x: lerp(95, TW.A.x, MO.sineInOut(q)), y: lerp(0, TW.A.y, MO.sineInOut(q)), z: K.zl(1.15, 5.5, MO.expoIn(q) * 0.85 + q * 0.15) };
};
window.S05 = { camAt };
const elAt = (e, T) => PHYS.at(e.tr, T - e.ts);
function drawLatticeView(c, t, S) {
  const cam = camAt(t), T = tau(t);
  const pos = ELS.map(e => elAt(e, T));
  TW.draw(c, cam, S.t, { vib: 0.6, excite: a => { let m = 0; for (const p of pos) { const d2 = (p[0] - a.x) ** 2 + (p[1] - a.y) ** 2; m = Math.max(m, Math.exp(-d2 / 160)); } return m; } });
  c.setTransform(1, 0, 0, 1, 0, 0);
  ELS.forEach((e, k) => {
    const tr = []; for (let j = 0; j < 10; j++) { const p = elAt(e, T - j * 0.06); tr.push(K.S(cam, p[0], p[1])); }
    FX.trail(c, tr, 1);
    const [sx, sy] = K.S(cam, pos[k][0], pos[k][1]); FX.e(c, sx, sy, cam.z > 2.5 ? 3 : 2, 1);
  });
  // the featured electron of S06 is already on its way toward atom A
  if (S.t > 21.0) {
    const F = TW.FEAT, ft = S.t - F.t0;
    const tr = []; for (let j = 0; j < 10; j++) { const p = PHYS.at(F.tr, Math.max(0, ft - j * 0.05)); tr.push(K.S(cam, p[0], p[1])); }
    FX.trail(c, tr, clamp((S.t - 21.0) / 0.3));
    const p = PHYS.at(F.tr, ft), [sx, sy] = K.S(cam, p[0], p[1]); FX.e(c, sx, sy, 3, clamp((S.t - 21.0) / 0.3), true);
  }
}
SC['s05_target'] = {
  init() {
    // featured electron for S06: launched so its closest approach to atom A lands on the beat at 23.0 s
    const A = TW.A, v = 25, ap = TW.approach(A, 6.5, -1, 0.36, 16);
    const tr = TW.pass({ x: ap.x, y: ap.y, vx: ap.ux * v, vy: ap.uy * v, T: 9, k: 1300, frac: 31 / 80, near: A, only: [A] });
    TW.FEAT = { tr, t0: 23.0 - tr.tEmit, E: 80, Eg: 31 };
    // electrons arriving in slow motion
    ELS = [-128, -74, -24, 22, 68, 116, 166, -172].map((y, k) => ({ ts: -1.4 + k * 0.34 + h(k, 1) * 0.2, tr: TW.pass({ x: -120, y, vx: 70, vy: (h(k, 2) - 0.5) * 12, T: 8, k: 1300 }) }));
  },
  draw(c, t, S) {
    const fade = clamp(t / 0.22);
    if (fade <= 0) S04.drawTubeAt(c, 5 + t, S);
    else if (fade >= 1) drawLatticeView(c, t, S);
    else dissolve(c, cc => S04.drawTubeAt(cc, 5 + t, S), cc => drawLatticeView(cc, t, S), fade);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const cam = camAt(t);
    if (t > 0.9 && t < 3.2) {
      const a1 = TW.atom(0, 2), a2 = TW.atom(0, -2);
      const [x1, y1] = K.S(cam, a1.x, a1.y), [x2, y2] = K.S(cam, a2.x, a2.y);
      CAP.note(c, t, { ax: x1, ay: y1, x: 14, y: Math.round(y1) + 34, text: 'NUCLEUS (74+)', t0: 1.15, t1: 2.75, col: 'o2', box: true });
      CAP.note(c, t, { ax: x2 - 12, ay: y2 - 8, x: 14, y: Math.round(y2) - 46, text: 'ELECTRON CLOUD', t0: 1.5, t1: 2.75, col: 'y3', box: true });
    }
    CAP.note(c, t, { x: 256, y: 96, text: 'slowed ~10¹⁸ times', t0: 1.0, t1: 3.6, align: 'right', col: 'c3', box: true });
    CAP.note(c, t, { x: 256, y: 107, text: 'atoms not to scale', t0: 1.9, t1: 3.4, align: 'right', col: 'd7', box: true });
    CAP.scene(c, t, { title: 'TUNGSTEN TARGET', ctx: 'Tungsten: 74 protons, melts at 3,422 °C.', t0: 0.12, t1: 3.92 });
  },
  cues: [[0, 'zoom_rush', 0.6, 0, 0.45], [0.12, 'type', 0.5], [0.3, 'slowmo_in', 0.9, 0, 3.7], [0.4, 'tension', 0.9, 0, 3.6],
    [1.0, 'blip', 0.4, 0.5], [1.15, 'blip', 0.4, -0.5], [1.5, 'blip', 0.4, -0.5], [1.9, 'blip', 0.3, -0.5],
    [0.75, 'enter', 0.5, -0.4], [1.25, 'enter', 0.5, -0.2], [1.75, 'enter', 0.5, 0.1], [2.25, 'enter', 0.55, 0.3], [2.75, 'enter', 0.6, 0.0], [3.0, 'push_in', 0.8, 0, 1.0]],
};
})();
