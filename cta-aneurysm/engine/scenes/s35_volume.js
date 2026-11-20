// S35 BUILD THE VOLUME (136–140 s): twelve thin axial slices (2 mm apart) stack into a volume, seen obliquely while the
// view turns a little; then the right middle cerebral artery is traced through the neighbouring slices: one amber dot per
// slice where its lumen crosses, joined into a continuous vessel. A stylized pixel diagram of the volume, not a render.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const SN = () => WS.SN;
// view: yaw (rotation of the slice plane), squash (elevation), slice spacing on screen
const viewAt = t => ({ yaw: lerp(-0.55, -0.2, MO.sineInOut(clamp(t / 4))), f: 0.46, k: 1.45, dz: 16, cx: W / 2, cy: 470 });
const toScr = (v, x, y, z) => { const c = Math.cos(v.yaw), s = Math.sin(v.yaw), X = (x - WS.SC[0]) * c - (y - WS.SC[1]) * s, Y = (x - WS.SC[0]) * s + (y - WS.SC[1]) * c; return [v.cx + X * v.k, v.cy - Y * v.k * v.f - (z + 11) / 2 * v.dz]; };
// the right M1 → bifurcation → aneurysm: centreline points with their z (true geometry)
let TRACE = null;
const trace = () => TRACE || (TRACE = WS.SZ.map(dz => { const segs = ['icaR', 'm1R', 'm2sR']; let best = null, bd = 1e9; for (const nm of segs) for (const p of VES.byName[nm].pts) { const d = Math.abs(p[2] - (CT.zAt(p[1]) + dz)); if (d < bd) { bd = d; best = p; } } const a = VES.AN.c; if (Math.abs(a[2] - (CT.zAt(a[1]) + dz)) < 2.2) return [a[0], a[1], dz, true]; return bd < 1.2 ? [best[0], best[1], dz, false] : null; }));
SC['s35_volume'] = {
  draw(c, t, S) {
    const v = viewAt(t), n = SN(), sp = WS.SSP, cs = Math.cos(v.yaw), sn = Math.sin(v.yaw), kk = v.k * 0.75;
    const shown = Math.min(12, Math.floor(clamp((t - 0.1) / 1.5) * 12.999));
    for (let i = 0; i < shown; i++) {
      const z = WS.SZ[i];              // offset of this tilted slice (mm)
      // grid (u, v) → head (x, y): x = SC.x + (u − n/2)·sp, y = SC.y − (v − n/2)·sp; then the oblique view
      const ox = v.cx - (n / 2) * (cs * kk - 0) , oy = 0;
      const a = cs * kk, b = -sn * kk * v.f, cc = sn * kk, d = cs * kk * v.f;
      const M = [a, b * -1 * -1, cc, d, 0, 0];
      // origin: screen of grid (0, 0)
      const [x00, y00] = toScr(v, WS.SC[0] - n / 2 * sp, WS.SC[1] + n / 2 * sp, z);
      const [x10, y10] = toScr(v, WS.SC[0] - n / 2 * sp + sp, WS.SC[1] + n / 2 * sp, z), [x01, y01] = toScr(v, WS.SC[0] - n / 2 * sp, WS.SC[1] + n / 2 * sp - sp, z);
      const lo = WS.L - WS.W / 2, img = WS.STACK[i], age = t - 0.1 - i * 0.125;
      CT.blit(c, n, n, { M: [x10 - x00, y10 - y00, x01 - x00, y01 - y00, x00, y00], val: q => { const h = img[q]; return h < -500 ? null : h > 700 ? 0.42 : (h - lo) / WS.W; }, alpha: clamp(age / 0.15) * (i === shown - 1 ? 1 : 0.92) });
    }
    // the trace through the slices
    const ta = clamp((t - 1.9) / 1.4), tr = trace(), pts = [];
    tr.forEach((p, i) => { if (!p || i / 11 > ta) return; const [sx, sy] = toScr(v, p[0], p[1], p[2]); pts.push([sx, sy, p[3]]); });
    for (let i = 1; i < pts.length; i++) PIX.bline(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 'a1');
    for (const [x, y, an] of pts) { PIX.rect(c, Math.round(x) - 2, Math.round(y) - 2, 5, 5, 'k'); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, an ? 'a2' : 'a1'); }
    CAP.ctx(c, t, { text: 'KƏSİKLƏR → HƏCM', t0: 0.35, t1: 3.6 });
  },
  cues: () => { const q = [[0.35, 'type', 0.4], [0, 'orbit', 0.5, 0, 4]]; for (let i = 0; i < 12; i++) q.push([0.1 + i * 0.125, 'stack_click', 0.5, (i - 6) / 8, i]); q.push([1.9, 'trace', 0.8, -0.3, 1.4]); return q; },
  xin: 0.3,
};
})();
