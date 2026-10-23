// S14 MATH RECONSTRUCTS THE INSIDE OF THE BODY (96–106 s), the climax: filtered backprojection, computed from the sinogram
// of S13. One row is lifted out: its profile is filtered (the ramp filter sharpens its edges and adds small negative
// side lobes), then smeared back across the image grid along the direction it was measured from. With 2, 4, 8, 16 … views
// the streaks start to cancel and the skull's bright ring and the brain appear; with all 360 views the slice is sharp.
// It is a computed estimate of attenuation at every point, not a stacked photograph; FBP is one method (iterative
// reconstruction is another).
(() => {
const { W, H, P } = PIX;
const lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const IMG = { cx: 135, cy: 268, s: 0.93 };                           // the image grid: px per mm (220 mm field → ≈ 205 px)
const ROW = 40;                                                       // the lifted view (index into the sinogram)
const STEPS = [[3.0, 2], [3.5, 4], [4.0, 8], [4.5, 16], [5.0, 32], [5.6, 64], [6.3, 128], [7.0, 360]];
const nAt = t => { let n = 1; for (const [tt, k] of STEPS) if (t >= tt) n = k; return n; };
const pushAt = t => 1 + 0.07 * MO.sineInOut(clamp((t - 3.0) / 4.0)) + 0.1 * MO.cubicInOut(clamp((t - 7.0) / 0.28)) * (1 - MO.sineInOut(clamp((t - 8.4) / 1.4)));
function profile(c, x, y, w, h, arr, a, col, base = 0.5, scale = 1) {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  let prev = null; for (let j = 0; j < CT.ND; j += 2) { const v = arr[j] * scale, px = x + j / CT.ND * w, py = y + h * (1 - base) - v * h; if (prev) PIX.bline(c, prev[0], prev[1], px, py, col); prev = [px, py]; }
  PIX.rect(c, x, Math.round(y + h * (1 - base)), w, 1, 'g4'); c.restore();
}
SC['s14_fbp'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const z = IMG.s * pushAt(t), gx = IMG.cx, gy = IMG.cy;
    // the empty grid (field of view)
    const half = CT.FOV / 2 * z;
    PIX.rect(c, Math.round(gx - half) - 1, Math.round(gy - half) - 1, Math.round(2 * half) + 2, Math.round(2 * half) + 2, 'g2');
    PIX.rect(c, Math.round(gx - half), Math.round(gy - half), Math.round(2 * half), Math.round(2 * half), 'n0');
    // S13's sinogram slides up and away; the chosen row lights up and lifts out as the profile
    const sa = 1 - MO.smooth(clamp((t - 0.35) / 0.45));
    if (sa > 0) {
      const q = MO.cubicIn(clamp(t / 0.8)), SX = lerp(40, 30, q), SY = lerp(132, 70, q), SW = lerp(200, 210, q), SH = lerp(250, 60, q);
      CT.blit(c, CT.ND, CT.NA, { M: [SW / CT.ND, 0, 0, SH / CT.NA, SX, SY], val: i => Math.pow(Math.max(0, CT.SINO[i] / CT.PMAX), 0.85), ramp: CT.ramps().blue, alpha: sa });
      const ry = Math.round(SY + SH * (ROW + 0.5) / CT.NA); c.save(); c.globalAlpha = sa; PIX.rect(c, Math.round(SX) - 3, ry, Math.round(SW) + 6, 1, 'w'); c.restore();
    }
    // the lifted row: raw profile, then the filtered one
    const row = CT.SINO.subarray(ROW * CT.ND, (ROW + 1) * CT.ND), qrow = CT.Q.subarray(ROW * CT.ND, (ROW + 1) * CT.ND);
    let qmax = 0; for (const v of qrow) qmax = Math.max(qmax, Math.abs(v));
    const pa = MO.smooth(clamp((t - 0.45) / 0.3)) * (1 - MO.smooth(clamp((t - 2.9) / 0.3))), fq = MO.smooth(clamp((t - 0.95) / 0.4));
    const mix = new Float32Array(CT.ND); for (let j = 0; j < CT.ND; j++) mix[j] = lerp(row[j] / CT.PMAX * 0.9, qrow[j] / qmax * 0.55, fq);
    profile(c, 30, 104, 210, 44, mix, pa, fq > 0.5 ? 'b4' : 'b3', fq > 0.5 ? 0.45 : 0.05, 1);
    // backprojection of that one view: the smear sweeps in along the ray direction
    if (t >= 1.4 && t < 3.0) {
      const img = CT.smear(CT.ORDER.indexOf(ROW) >= 0 ? ROW : ROW, true), sweep = MO.cubicOut(clamp((t - 1.4) / 0.9));
      const beta = ROW / CT.NA * TAU, dirY = Math.cos(beta);
      G2.ct(c, { x: CT.OX * 0, y: 0, s: z, cx: gx, cy: gy }, img, { L: 20, W: 900, mask: (i) => { const r = Math.floor(i / CT.N) / CT.N; return (dirY >= 0 ? r : 1 - r) <= sweep; } });
    } else if (t >= 3.0) {
      const n = nAt(t), img = CT.partial(n), sharp = n >= 360;
      // the window narrows as the image converges (many-view sums carry big streak values early on)
      const Wd = sharp ? 110 : lerp(900, 160, clamp(Math.log2(n) / 7)), L = sharp ? 40 : 20;
      G2.ct(c, { x: 0, y: 0, s: z, cx: gx, cy: gy }, img, { L, W: Wd });
      if (t - STEPS.find(s => s[1] === n)[0] < 0.12) PIX.rect(c, Math.round(gx - half), Math.round(gy - half), Math.round(2 * half), Math.round(2 * half), 'b4', 0.12);
    }
    // counter
    if (t > 0.6) {
      const n = t < 3.0 ? 1 : nAt(t);
      PIX.rect(c, 150, 98, 98, 14, 'k'); PIX.text(c, `VIEWS: ${n}`, 245, 101, n >= 360 ? 'e2' : 'w', { align: 'right', shadow: null });
    }
    CAP.note(c, t, { x: 30, y: 158, text: 'FILTER', t0: 0.95, t1: 1.6, col: 'b4', box: true });
    CAP.note(c, t, { x: 30, y: 158, text: 'BACKPROJECT', t0: 1.65, t1: 2.9, col: 'b4', box: true });
    CAP.note(c, t, { x: 30, y: 158, text: 'ADD MORE DIRECTIONS', t0: 3.05, t1: 6.9, col: 'b4', box: true });
    CAP.note(c, t, { x: 20, y: 384, text: 'FILTERED BACKPROJECTION;', t0: 7.6, t1: 9.85, col: 'g8', box: true });
    CAP.note(c, t, { x: 20, y: 395, text: 'ITERATIVE METHODS ALSO EXIST', t0: 7.9, t1: 9.85, col: 'g8', box: true });
    CAP.cap(c, t, { l1: 'RECONSTRUCTION', l2: ['MATH RECONSTRUCTS', 'THE INSIDE OF THE BODY'], t0: 0.12, tSwap: 3.0, t1: 9.85, acc: 'b4' });
  },
  cues: () => {
    const q = [[0.3, 'lift_row', 0.6, 0], [0.9, 'filter_sweep', 0.8, 0, 0.5], [1.4, 'smear', 0.8, 0, 0.9], [3.0, 'build_rise', 0.8, 0, 4.0]];
    STEPS.forEach(([tt, n], k) => q.push([tt, n >= 360 ? 'recon_complete' : 'assemble_hit', n >= 360 ? 1 : 0.55 + 0.05 * k, (k % 2 ? 0.25 : -0.25), k]));
    q.push([7.0, 'punch', 0.9, 0]);
    return q;
  },
};
})();
