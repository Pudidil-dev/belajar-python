// S15 INTO A RED BLOOD CELL (49–53 s): the followed oxygen molecule drifts through the plasma to a red blood cell (a
// biconcave disc). The camera zooms in as the molecule passes through the cell's membrane (it diffuses through; nothing is
// punched open); the membrane turns see-through and the interior appears, packed with hemoglobin. The molecule heads for one.
// Labels: O2, red blood cell, hemoglobin.
(() => {
const clamp = U.clamp, lerp = U.lerp, hh = U.hash, R = n => window.RAMP[n];
const C = { x: 150, y: 10, rx: 82, ry: 56, rot: -0.18 }, TGT = [116, 14];
const inside = (x, y) => { const ca = Math.cos(-C.rot), sa = Math.sin(-C.rot), dx = x - C.x, dy = y - C.y, u = dx * ca - dy * sa, v = dx * sa + dy * ca; return (u / C.rx) ** 2 + (v / C.ry) ** 2; };
const HBS = []; for (let k = 0; HBS.length < 34 && k < 400; k++) { const x = C.x + (hh(k, 1) - 0.5) * 2 * C.rx, y = C.y + (hh(k, 2) - 0.5) * 2 * C.ry; if (inside(x, y) < 0.8 && Math.hypot(x - TGT[0], y - TGT[1]) > 9) HBS.push([x, y, hh(k, 3)]); }
HBS.push([TGT[0], TGT[1], 0.5]);
window.S12 = { C, TGT };
const molAt = t => { const [jx, jy] = MICRO.jit(77, t, 2); if (t < 1.8) return [lerp(-20, 64, MO.sineInOut(clamp(t / 1.8))) + jx * 6, lerp(18, 8, t / 1.8) + jy * 8]; if (t < 2.4) return [lerp(64, 74, (t - 1.8) / 0.6) + jx * 2, 8 + jy * 2]; return [lerp(74, TGT[0] - 6, MO.sineInOut(clamp((t - 2.4) / 1.5))) + jx * 2, lerp(8, TGT[1] - 6, clamp((t - 2.4) / 1.5)) + jy * 2]; };
SC['s15_rbc'] = {
  xin: 0.3,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp((t - 0.8) / 3.0)), cam = { x: lerp(40, TGT[0] - 4, q), y: lerp(10, TGT[1] - 2, q), z: K.zl(1.1, 3.0, q) };
    MICRO.plasma(c, cam, S.t);
    MICRO.rbc(c, cam, -120, -150, 60, 40, 0.5, { bias: -0.12 }); MICRO.rbc(c, cam, -60, 190, 66, 44, -0.3, { bias: -0.12 });
    // the hemoglobin inside the cell (drawn first: it shows as the membrane turns clear)
    const reveal = MO.smooth(clamp((t - 1.6) / 1.2));
    if (reveal > 0) for (const [x, y, r] of HBS) { const [px, py] = K.S(cam, x, y); if (px < -30 || px > 300 || py < -30 || py > 510) continue; MICRO.hb(c, cam, x, y, 5.4, { a: reveal, dim: !(x === TGT[0] && y === TGT[1]) }); }
    // the cell: a solid biconcave disc that turns see-through from inside out; its membrane stays as a rim
    MICRO.rbc(c, cam, C.x, C.y, C.rx, C.ry, C.rot, { a: 1 - 0.82 * reveal });
    LIT.shape(c, ctx => { const [sx, sy] = K.S(cam, C.x, C.y); ctx.lineWidth = Math.max(2, 2.2 * cam.z); ctx.beginPath(); ctx.ellipse(sx, sy, C.rx * cam.z, C.ry * cam.z, C.rot, 0, U.TAU); ctx.stroke(); },
      [0, 0, 270, 480], R('rc'), { amb: 0.3, alpha: 0.4 + 0.6 * reveal, bias: 0.04 });
    const [mx, my] = molAt(t), [px, py] = K.S(cam, mx, my);
    MICRO.o2(c, px, py, 3.6 * Math.min(cam.z, 1.6), -0.5, { ramp: ['ox1', 'ox2', 'ox3', 'ox4', 'ox5'] });
    MICRO.tag(c, px, py, 8 * Math.min(cam.z, 1.6), S.t, 'ox5');
    const [ex, ey] = K.S(cam, C.x - C.rx * 0.7, C.y - C.ry * 0.7), [hx, hy] = K.S(cam, TGT[0], TGT[1] + 8);
    CAP.part(c, t, { text: 'O₂', ax: px, ay: py - 8, x: px - 20, y: py - 40, t0: 0.4, t1: 1.7, col: 'ox5', lineCol: 'ox3' });
    CAP.part(c, t, { text: 'RED BLOOD CELL', ax: ex, ay: ey, x: Math.max(6, ex - 30), y: Math.max(92, ey - 46), t0: 0.7, t1: 2.2, col: 'rc5', lineCol: 'rc4' });
    CAP.part(c, t, { text: 'HEMOGLOBIN', ax: hx, ay: hy + 10, x: hx + 26, y: Math.min(440, hy + 60), t0: 2.6, t1: 3.85, col: 'hb5', lineCol: 'hb4' });
    CAP.scene(c, t, { title: 'INTO A RED BLOOD CELL', ctx: 'Through its membrane.', t0: 0.3, t1: 3.92, acc: 'rc5' });
  },
  cues: [[0.2, 'drift', 0.5, 0.2, 1.6], [0.4, 'label', 0.3, -0.2], [0.7, 'label', 0.3, -0.3], [1.9, 'membrane_pass', 0.8, 0.1], [2.0, 'quiet_space', 0.7, 0, 2.0], [2.6, 'label', 0.3, 0.2]],
};
})();
