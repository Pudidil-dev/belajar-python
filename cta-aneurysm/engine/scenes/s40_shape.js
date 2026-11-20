// S40 CHARACTERIZE THE SHAPE (156–160 s): close on the same aneurysm in the vessel rendering — the dome, the neck on the
// bifurcation, the parent artery and the two branches next to it. Measurement guides draw on one at a time: across the
// dome, across the neck, then arrows along the branch vessels. No numbers: the film does not invent measurements.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const viewAt = t => { const a = VES.AN.cDraw; return { yaw: -0.2 + 0.05 * Math.sin(t * 0.7), pitch: 0.34, roll: 0, s: 7.2, cx: W / 2 + 24, cy: 330, ox: a[0] + 2.5, oy: a[1], oz: a[2] + 1.5 }; };
// a dimension line: thick, with a dark outline and end ticks, drawn on over p (0..1)
const tick = (c, x0, y0, x1, y1, col, p) => {
  if (p <= 0) return; const x = lerp(x0, x1, p), y = lerp(y0, y1, p), a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2, L = 6;
  const seg = (ax, ay, bx, by, cl) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) PIX.bline(c, ax + dx, ay + dy, bx + dx, by + dy, 'k'); PIX.bline(c, ax, ay, bx, by, cl); PIX.bline(c, ax + Math.cos(a) * 0.9, ay + Math.sin(a) * 0.9, bx + Math.cos(a) * 0.9, by + Math.sin(a) * 0.9, cl); };
  seg(x0, y0, x, y, col);
  seg(x0 - Math.cos(a) * L, y0 - Math.sin(a) * L, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, col);
  if (p >= 1) seg(x1 - Math.cos(a) * L, y1 - Math.sin(a) * L, x1 + Math.cos(a) * L, y1 + Math.sin(a) * L, col);
};
SC['s40_shape'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const v = viewAt(S.t);
    const img = c.getImageData(0, 0, W, H); VES.render(img, { ...v, mode: 'vr', fadeZ: [-60, -40] }); c.putImageData(img, 0, 0);
    const AN = VES.AN, RS = VES.RS, P_ = (x, y, z) => VES.proj(v, x, y, z);
    const d = AN.dir, c0 = AN.cDraw, perp = [d[1], -d[0], 0], pl = Math.hypot(...perp), pn = perp.map(q => q / pl);
    // dome: a guide across the dome, perpendicular to the neck's axis
    const rD = AN.rDome * RS, A1 = P_(c0[0] + pn[0] * rD, c0[1] + pn[1] * rD, c0[2]), A2 = P_(c0[0] - pn[0] * rD, c0[1] - pn[1] * rD, c0[2]);
    const so = VES.anScreen(v), ux = A2[0] - A1[0], uy = A2[1] - A1[1], ul = Math.hypot(ux, uy) || 1, ox = -uy / ul * (so.r * 0 + 10), oy = ux / ul * 10;
    const far = (A1[0] + A2[0]) / 2 + ox < so.x ? 1 : -1;
    tick(c, A1[0] - far * ox * 0 + (far > 0 ? -1 : 1) * 0, A1[1], A2[0], A2[1], 'a1', MO.cubicOut(clamp((t - 0.5) / 0.5)));
    // neck: across the neck at the bifurcation
    const nk = AN.bif.map((q, i) => q + d[i] * AN.neckLen * RS * 0.8), rN = AN.rNeck * RS * 1.05;
    const B1 = P_(nk[0] + pn[0] * rN, nk[1] + pn[1] * rN, nk[2]), B2 = P_(nk[0] - pn[0] * rN, nk[1] - pn[1] * rN, nk[2]);
    tick(c, B1[0], B1[1], B2[0], B2[1], 'c3', MO.cubicOut(clamp((t - 1.3) / 0.5)));
    // branches: arrows along the parent artery and the two trunks leaving the bifurcation
    const br = MO.cubicOut(clamp((t - 2.1) / 0.6));
    for (const [nm, dir] of [['m1R', -1], ['m2sR', 1], ['m2iR', 1]]) {
      const pts = VES.byName[nm].pts, a = dir > 0 ? pts[6] : pts[pts.length - 8], b = dir > 0 ? pts[Math.min(pts.length - 1, 30)] : pts[pts.length - 34];
      if (!a || !b) continue;
      const [ax, ay] = P_(...a), [bx, by] = P_(...b); if (br > 0) { const ex = lerp(ax, bx, br), ey = lerp(ay, by, br); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) K.arrow(c, ax + dx, ay - 12 + dy, ex + dx, ey - 12 + dy, 'k', 5); K.arrow(c, ax, ay - 12, ex, ey - 12, 'b4', 5); }
    }
    CAP.ctx(c, t, { text: 'ÖLÇÜ • BOYUN • ŞAXƏLƏR', t0: 0.3, t1: 3.6 });
  },
  cues: [[0.3, 'type', 0.4], [0.5, 'annot', 0.8, -0.3, 0], [1.3, 'annot', 0.8, -0.2, 1], [2.1, 'annot', 0.8, 0.2, 2]],
  xin: 0.3,
};
})();
