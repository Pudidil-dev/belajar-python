// S02 BLOOD IS STILL MOVING (2–4 s): the same heart, patient and tubing. The camera shifts toward the venous tube where it
// leaves the right atrium, the heart still in frame behind it. A short stretch of the tube opens as an educational cutaway:
// its wall becomes a clear outline and red cells slide steadily along inside it, with a moving flow arrow. Steady, never
// pulsing. The heart does not move. Labels name the red blood cells and the venous line.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const G0 = 24, G1 = 92;                                             // the see-through stretch of the venous line (units along it)
// the open stretch: the wall as two pale lines, plasma inside, red cells and a chevron gliding along at the flow speed
window.glassTube = (c, cam, key, T, d0, d1, k) => {
  if (k <= 0) return;
  const pts = WORLD.R[key], S0 = pts.S, w = WORLD.width[key], at = WORLD.at;
  const seg = []; for (let d = d0; d <= d1; d += 2) seg.push(at(pts, S0, d));
  const P2 = seg.map(p => [p[0], p[1]]), z = cam.z;
  LIT.tube(c, cam, P2, w * 0.96, ['vb2', 'vb3', 'vb3', 'vb4'], { amb: 0.5, dif: 0.4, edge: false, alpha: k });
  // red cells: discs in single, steady files, shaded as little 3D cushions
  const sp = WORLD.FLOW.speed, gap = 7;
  for (let lane = -1; lane <= 1; lane++) for (let d = d0 + ((T * sp + lane * 3.1) % gap); d < d1; d += gap) {
    const [x, y, a] = at(pts, S0, d), nx = -Math.sin(a), ny = Math.cos(a), off = lane * w * 0.26;
    const [sx, sy] = K.S(cam, x + nx * off, y + ny * off), r = Math.max(1.2, w * 0.17 * z);
    if (U.hash(Math.round(d * 7), lane) < 0.15) continue;
    LIT.sphere(c, sx, sy, r, ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { amb: 0.3, alpha: k });
    if (r > 2.2) PIX.rect(c, Math.round(sx) - 1, Math.round(sy), 2, 1, 'rc2');           // the dimple of the disc
  }
  // the clear wall: two pale lines along the edges
  for (const s_ of [-1, 1]) LIT.line(c, cam, seg.map(([x, y, a]) => [x - Math.sin(a) * w * 0.5 * s_, y + Math.cos(a) * w * 0.5 * s_]), s_ < 0 ? 'tw4' : 'tw2', { alpha: k });
  // a flow chevron gliding along the middle
  const dd = d0 + ((T * sp * 0.5) % (d1 - d0)), [cx, cy, ca] = at(pts, S0, dd), [hx, hy] = K.S(cam, cx, cy), L = w * 0.3 * z;
  for (const s_ of [-1, 1]) PIX.bline(c, hx + Math.cos(ca) * L * 0.6, hy + Math.sin(ca) * L * 0.6, hx - Math.cos(ca) * L * 0.4 - Math.sin(ca) * s_ * L * 0.7, hy - Math.sin(ca) * L * 0.4 + Math.cos(ca) * s_ * L * 0.7, 'w');
};
SC['s02_moving'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), k = MO.smooth(clamp((t - 0.35) / 0.4));
    WORLD.scene(c, cam, S.t, { tubes: { venous: { glass: [G0, G1, k] } } });
    window.glassTube(c, cam, 'venous', S.t, G0, G1, k);
    if (!window.NOTEXT) { const L = window.__textLog; window.__scene = '_s02'; CAP.scene(c, S.t, window.OPEN_CAP); window.__scene = S.id; delete L._s02; }
    // the open stretch names what is inside it
    const [x1, y1] = WORLD.at(WORLD.R.venous, WORLD.R.venous.S, 70), [ax, ay] = K.S(cam, x1, y1), [x2, y2] = WORLD.at(WORLD.R.venous, WORLD.R.venous.S, 40), [bx, by] = K.S(cam, x2, y2);
    CAP.part(c, t, { text: 'RED BLOOD CELLS', ax, ay, x: ax + 26, y: ay + 22, t0: 0.75, t1: 1.9, col: 'rc5', lineCol: 'rc3' });
    CAP.part(c, t, { text: 'VENOUS LINE', ax: bx, ay: by, x: bx + 34, y: by - 34, t0: 1.05, t1: 1.9, col: 'vb5', lineCol: 'g6' });
  },
  cues: [[0.35, 'glass_open', 0.5, -0.4], [0.3, 'question', 1.0, 0], [0.75, 'label', 0.4, -0.3], [1.05, 'label', 0.4, 0.2]],
};
})();
