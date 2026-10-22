// S04 · 0:16–0:23 — PREPARING THE SAMPLE. The holder waits outside the goniometer; a robotic gripper lowers a 3 mm
// copper grid (with its carbon film) into the holder tip and a clamp ring clicks down on it. The holder slides into the
// microscope until the grid sits on the beam axis between the objective pole pieces. Then the camera dives straight
// down into it: grid → one mesh square → lacey carbon and the ultrathin film → the film's atoms, ending on a cutaway:
// gold atoms resting on a carbon film only about 3 nm thick, thin enough for 200 keV electrons to pass through.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_PLACE = 0.85, T_CLAMP = 1.25, T_SLIDE = 1.6, D_SLIDE = 1.0, T_DIVE = 2.6, T_NANO = 5.0, T_SLAB = 5.25;
const holderK = lt => MO.cubicInOut(U.clamp((lt - T_SLIDE) / D_SLIDE));
const tipX = lt => X + (1 - holderK(lt)) * 60;
// column-world camera before the dive
const camCol = lt => {
  const a = SC.s03_column.camAt(7), tx = tipX(lt);
  if (lt < 0.8) { const p = MO.cubicInOut(lt / 0.8); return { x: U.lerp(a.x, tx - 2, p), y: U.lerp(a.y, Y.spec - 3, p), z: CAM.zlerp(a.z, 15, p) }; }
  if (lt < T_SLIDE) return { x: tx - 2, y: Y.spec - 3 + (lt - 0.8) * 1.2, z: 15 };
  if (lt < T_DIVE) { const p = MO.sineInOut(U.clamp((lt - T_SLIDE) / D_SLIDE)); return { x: tx - 2 * (1 - p), y: Y.spec - 2 + p * 2, z: CAM.zlerp(15, 6.2, MO.smooth(U.clamp((lt - T_SLIDE) / 0.8))) }; }
  const p = U.clamp((lt - T_DIVE) / 0.55);                                 // push into the tip
  return { x: X, y: Y.spec, z: CAM.zlerp(6.2, 30, MO.cubicIn(p)) };
};
// dive field of view (m) after the column world hands over
const fovAt = lt => {
  const z0 = 30, f0 = W / (z0 * COL.TIPK * 10) * 1e-3, f1 = 9.6e-9;
  const p = U.clamp((lt - T_DIVE - 0.55) / (T_NANO - T_DIVE - 0.55));
  return Math.exp(Math.log(f0) + (Math.log(f1) - Math.log(f0)) * (0.55 * p + 0.45 * MO.smooth(p)));
};
// the gripper's path: comes down with the grid, lets go, goes back up
function gripper(c, cam, lt) {
  if (lt > 2.0) return;
  const [sx, sy] = K.S(cam, tipX(lt), Y.spec), s = cam.z * COL.TIPK * 10;
  const down = MO.cubicOut(U.clamp(lt / T_PLACE)), up = MO.cubicIn(U.clamp((lt - 1.45) / 0.5));
  const gy = (1 - down) * 26 + up * 40, open = U.clamp((lt - 1.05) / 0.15);
  if (lt < 1.05) SAMPLE.grid(c, sx, sy - gy * s, 1.5 * s, 0.42, {});
  SAMPLE.gripper(c, sx, sy - gy * s - 0.6 * s, s, open);
}
SC.s04_sample = {
  draw(c, lt) {
    const T = 16 + lt;
    if (lt < T_DIVE + 0.55) {
      const cam = camCol(lt);
      LAB.screen(T, {}); LAB.back(c, cam, T);
      COL.draw(c, cam, T, { holder: holderK(lt), grid: lt >= 1.05 ? 1 : 0, clamp: U.clamp((lt - T_CLAMP + 0.12) / 0.12), axis: 0, hot: { c1: 0.6, c2: 0.6, obj: 0.6 } });
      gripper(c, cam, lt);
      const [rx, ry] = K.S(cam, tipX(lt) + 30, Y.spec);
      CAP.note(c, lt, { text: 'SPECIMEN HOLDER', x: Math.min(W - 98, rx - 20), y: ry + 26, ax: rx, ay: ry + 2, t0: 0.35, t1: 2.3, col: 'w', lineCol: 'g6', box: true });
      const [gx, gy] = K.S(cam, tipX(lt), Y.spec);
      CAP.note(c, lt, { text: '3 mm GRID', x: gx - 70, y: gy - 46, ax: gx - 6, ay: gy - 3, t0: 0.9, t1: 1.9, col: 'u3', lineCol: 'u2', box: true });
      if (lt > T_DIVE) { const k = U.clamp((lt - T_DIVE - 0.35) / 0.2); if (k > 0) window.dissolve(c, () => {}, cc => SAMPLE.dive(cc, fovAt(lt), T), k); }
    } else if (lt < T_SLAB) {
      SAMPLE.dive(c, fovAt(lt), T);
      SAMPLE.scaleBar(c, fovAt(lt), 1);
    } else {
      const k = U.clamp((lt - T_SLAB) / 0.3), S = 29, CX = W / 2 - 12, CY = 268;
      const x0 = CX - 7 * S / 2, y0 = CY - 1.5 * S, ddx = 4 * S * 0.55, ddy = -4 * S * 0.42;
      const slab = cc => {
        PIX.rect(cc, 0, 0, W, H, 'n0');
        FX.glowL(cc, W / 2, 250, 190, ['n1', 'n2'], 0.7);
        const info = SAMPLE.slab(cc, CX, CY, S, T, {});
        // 200 keV electrons falling straight through the film; one is deflected by an atom on the way
        for (let i = 0; i < 8; i++) {
          const ph = K.wrap((lt - T_SLAB) * 0.75 + i * 0.37, 1), x = CX - 92 + i * 27 + (i % 2) * 5, y = U.lerp(120, 430, ph);
          const bend = i === 4 ? 0.5 : 0, dev = y > info.y1 ? (y - info.y1) * bend : 0;
          const tail = [[x + dev, y]]; for (let q = 1; q < 6; q++) { const yy = y - q * 7, dd = yy > info.y1 ? (yy - info.y1) * bend : 0; tail.push([x + dd, yy]); }
          FX.trail(cc, tail, 0.9); FX.e(cc, x + dev, y, 2, 1);
        }
      };
      if (k < 1) window.dissolve(c, cc => { SAMPLE.dive(cc, fovAt(T_SLAB - 0.01), T); }, slab, MO.smooth(k));
      else slab(c);
      const ax = x0 + 2.94 * S + 0.25 * ddx, ay = y0 + 0.25 * ddy - 0.16 * S;
      CAP.note(c, lt, { text: 'GOLD ATOMS', x: 168, y: 150, ax, ay: ay - 6, t0: T_SLAB + 0.35, col: 'y4', lineCol: 'y2', box: true });
      CAP.note(c, lt, { text: 'CARBON FILM ~3 nm', x: 112, y: 334, ax: x0 + 46, ay: y0 + 2.4 * S, t0: T_SLAB + 0.6, col: 'g9', lineCol: 'g6', box: true });
      if (lt > T_SLAB + 0.5) { const yA = Math.round(y0), yB = Math.round(y0 + 3 * S), xb = Math.round(x0) - 7; PIX.rect(c, xb, yA, 1, yB - yA, 'g8'); PIX.rect(c, xb, yA, 3, 1, 'g8'); PIX.rect(c, xb, yB - 1, 3, 1, 'g8'); PIX.text(c, '3 nm', xb - 1, yA - 11, 'g8'); }
    }
    CAP.scene(c, lt, { title: 'ULTRATHIN SAMPLE', ctx: 'ELECTRONS MUST PASS THROUGH IT', t0: 3.0, acc: 'u2' });
  },
  cues: [[0.0, 'glide', 1, 0.3, 0.8], [0.4, 'servo', 1, 0.2, 0.5], [1.0, 'place', 1, 0.2], [1.25, 'lock_click', 1, 0.2], [1.45, 'servo', 0.7, 0.2, 0.4],
    [T_SLIDE, 'slide', 1, 0.3, D_SLIDE], [T_SLIDE + D_SLIDE - 0.05, 'seat', 1, 0], [T_DIVE, 'dive', 1, 0, T_NANO - T_DIVE], [3.0, 'title_hit', 0.6],
    [T_SLAB, 'reveal', 1, 0], [T_SLAB + 0.35, 'blip', 0.8, 0.2], [T_SLAB + 0.6, 'blip', 0.8, -0.2], [T_SLAB + 0.3, 'pass_through', 1, 0, 1.4]],
};
})();
