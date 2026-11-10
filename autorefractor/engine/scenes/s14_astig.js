// S14 ASTIGMATISM IN ONE SIMPLE MODEL (39–42 s): a single lens whose power is not the same in every direction. Light
// passing through its vertical meridian (white fan) comes to a focus sooner than light through its horizontal meridian
// (mint fan): instead of one focal point there are two short focal lines, one behind the other. The model turns a
// little so the two fans read as lying in two planes at right angles. A separate model, not the patient's eye.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const CX = 192, CY = 318, KS = 1.0, YR = 104, R0 = 62, XL = 84, F1 = 150, F2 = 236, XIN = 176, XEND = -196;
const proj = (x, y, z, yaw, pitch) => { const cy = Math.cos(yaw), sy = Math.sin(yaw), xr = x * cy + z * sy, zr = -x * sy + z * cy, cp = Math.cos(pitch), sp = Math.sin(pitch); return [CX + xr * KS, CY - (y * cp - zr * sp) * KS, zr * cp + y * sp]; };
const hv = x => R0 * (1 - (XL - x) / F1), hh = x => R0 * (1 - (XL - x) / F2);     // signed half-heights of the two fans after the lens
const FRONT = K.pchip([0.35, 1.25, 1.5, 1.75], [XIN, XL - F1, XL - F2, XEND]);        // the two foci are reached on the grid: 1.25 s and 1.5 s
SC['s14_astig'] = {
  xin: 0.4,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t, CX, CY);
    const yaw = lerp(0.95, 0.6, MO.sineInOut(clamp(t / 2.9))), pitch = 0.5, Pj = (x, y, z) => proj(x, y, z, yaw, pitch);
    const front = FRONT(t);                                                           // how far the light has come (it travels toward −x)
    const poly = (pts, col) => { const p = new Path2D(); pts.forEach((q, i) => { const [x, y] = Pj(...q); i ? p.lineTo(Math.round(x), Math.round(y)) : p.moveTo(Math.round(x), Math.round(y)); }); p.closePath(); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = K.pat(c, col, col[0] === 'e' ? 1 : 0); c.fill(p); c.restore(); };
    const line = (a, b, col, dash = 0) => { const [ax, ay] = Pj(...a), [bx, by] = Pj(...b); PIX.bline(c, ax, ay, bx, by, col, dash); PIX.bline(c, ax, ay + 1, bx, by + 1, col, dash); };
    line([XIN + 14, 0, 0], [XEND - 10, 0, 0], 'n4', 1);                                 // the axis
    // a ruler under the model, parallel to the axis: where along it each fan comes to its focus
    line([XL, -YR, 0], [XEND, -YR, 0], 'n4'); for (let x = XL; x >= XEND; x -= 40) line([x, -YR, 0], [x, -YR - 5, 0], 'n4');
    // one fan: plane 'v' (x–y) or 'h' (x–z); drawn from x0 down to x1 (both ≤ XL), as fill and two edges
    const fan = (pl, x0, x1, fill, edge) => {
      if (x1 >= x0) return; const f = pl === 'v' ? hv : hh, P3 = (x, s) => pl === 'v' ? [x, s * f(x), 0] : [x, 0, s * f(x)], xf = XL - (pl === 'v' ? F1 : F2);
      const parts = x0 > xf && x1 < xf ? [[x0, xf], [xf, x1]] : [[x0, x1]];
      for (const [a, b] of parts) { poly([P3(a, 1), P3(b, 1), P3(b, -1), P3(a, -1)], fill); line(P3(a, 1), P3(b, 1), edge); line(P3(a, -1), P3(b, -1), edge); }
    };
    const inc = (pl, fill, edge) => { const x1 = Math.max(XL, front); if (x1 >= XIN) return; const P3 = (x, s) => pl === 'v' ? [x, s * R0, 0] : [x, 0, s * R0]; poly([P3(XIN, 1), P3(x1, 1), P3(x1, -1), P3(XIN, -1)], fill); line(P3(XIN, 1), P3(x1, 1), edge); line(P3(XIN, -1), P3(x1, -1), edge); };
    // back-to-front for a camera on the +z side: the far half of the horizontal fan, the vertical fan, the lens, the near half
    const fx = Math.min(XL, front);
    inc('h', 'e2', 'e3'); inc('v', 'g6', 'gb');
    // the lens: a disc in the y–z plane with a little thickness, and its two meridians marked
    const disc = (x, r, col) => { const p = new Path2D(); for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, [sx, sy] = Pj(x, Math.cos(a) * r, Math.sin(a) * r); k ? p.lineTo(sx, sy) : p.moveTo(sx, sy); } p.closePath(); PIX.fill(c, p, col); return p; };
    disc(XL - 7, R0 + 5, 'b0'); const d = disc(XL, R0 + 5, 'b1');
    c.save(); c.clip(d); const [hx, hy] = Pj(XL, R0 * 0.45, -R0 * 0.3); c.fillStyle = P.b2; c.beginPath(); c.ellipse(hx, hy, 9, 26, 0.2, 0, TAU); c.fill(); c.restore();
    line([XL, R0 + 5, 0], [XL, -R0 - 5, 0], 'w'); line([XL, 0, R0 + 5], [XL, 0, -R0 - 5], 'e3');
    fan('h', XL, fx, 'e2', 'e3'); fan('v', XL, fx, 'g6', 'gb');
    // the two focal lines, once the light has reached them
    const x1 = XL - F1, x2 = XL - F2, w1 = Math.abs(hh(x1)), v2 = Math.abs(hv(x2));
    const bar = (a, b, col, k) => { const [ax, ay] = Pj(...a), [bx, by] = Pj(...b); for (let q = -1; q <= 1; q++) PIX.bline(c, ax, ay + q, bx, by + q, col); const [mx, my] = [(ax + bx) / 2, (ay + by) / 2]; if (k < 1) FX.ring(c, mx, my, 6 + 26 * k, col, 1 - k); };
    const drop = (x, col, k) => { const q = MO.cubicOut(clamp(k)); line([x, 0, 0], [x, -YR * q, 0], col, 1); if (q >= 1) { const [mx, my] = Pj(x, -YR, 0); PIX.rect(c, Math.round(mx) - 3, Math.round(my) - 3, 7, 7, col); } };
    if (front <= x1) drop(x1, 'gb', (x1 - front) / 50); if (front <= x2) drop(x2, 'e3', (x2 - front) / 30);
    if (t > 2.0) { const q = MO.cubicOut(clamp((t - 2.0) / 0.3)); line([x1, -YR, 0], [lerp(x1, x2, q), -YR, 0], 'w'); }
    if (front <= x1) { const k = clamp((x1 - front) / 60); FX.glowL(c, ...Pj(x1, 0, 0).slice(0, 2), 16, ['g3', 'g5', 'g8'], 0.7, 1.5); bar([x1, 0, -w1], [x1, 0, w1], 'w', k); }
    if (front <= x2) { const k = clamp((x2 - front) / 40); FX.glowL(c, ...Pj(x2, 0, 0).slice(0, 2), 16, ['e0', 'e1', 'e2'], 0.7, 1.5); bar([x2, -v2, 0], [x2, v2, 0], 'e3', k); }
    CAP.ctx(c, t, { text: 'Astigmatism', t0: 0.3, t1: 2.7, acc: 'e2' });
  },
  cues: [[0.3, 'type', 0.4], [0.35, 'rays_in', 0.6, 0.4, 1.4], [0.2, 'orbit', 0.4, 0, 2.6], [1.25, 'focus_a', 0.9, -0.2], [1.5, 'focus_b', 0.9, -0.5], [2.0, 'span', 0.6, -0.3, 0.3]],
};
})();
