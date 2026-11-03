'use strict';
// ============================================================================
// THE SKIN BLOCK (diagram space = screen pixels at rest): the textbook cut-away of
// the same skin, lifted out around the treated neck of the dragon. The top face
// shows the skin and the tattoo exactly as on the arm; the front face is the cut
// along the patch's near edge: wherever the tattoo's lines cross that edge, the
// ink sits in the dermis under them. Layers are drawn thicker than life
// (NOT TO SCALE).
// ============================================================================
const BLK = { ax0: 130, ax1: 250, ay0: 178, ay1: 240,                // the patch of arm it is cut from
  fx0: 50, fx1: 290, fy0: 262, fy1: 560, dx: 46, dy: -80 };           // front face and the oblique depth offset
const BLK_INK = (() => {                                              // ink under each line of the tattoo that crosses the cut
  const cuts = [], out = []; let run = -1;
  for (let x = BLK.ax0; x <= BLK.ax1; x += 0.25) { const on = dragonInk(x, BLK.ay1) > 0.5; if (on && run < 0) run = x; if ((!on || x >= BLK.ax1) && run >= 0) { cuts.push([(run + x) / 2, x - run]); run = -1; } }
  cuts.forEach(([cx, w], k) => { const u0 = (cx - BLK.ax0) / (BLK.ax1 - BLK.ax0), n = Math.round(10 + w * 4); for (let i = 0; i < n; i++) { const h = hash(i * 7 + k * 300 + 11); out.push({ u: u0 + (hash(i * 7 + k * 300 + 12) - 0.5) * (w + 3) / (BLK.ax1 - BLK.ax0), w: 0.2 + 0.24 * Math.pow(h, 0.8), r: 1.4 + 2.2 * hash(i * 7 + k * 300 + 13) }); } });
  return { cuts: cuts.map(c => (c[0] - BLK.ax0) / (BLK.ax1 - BLK.ax0)), dots: out };
})();
const BLK_FAT = Array.from({ length: 22 }, (_, i) => ({ u: (i % 6) / 5 + (hash(i + 70) - 0.5) * 0.08, w: 0.8 + Math.floor(i / 6) * 0.06 + hash(i + 71) * 0.03 }));
// the layer colour at a point of a face: u across (0..1), w down (0..1)
function blockLayer(u, w, side) {
  const dej = 0.085 + 0.014 * Math.sin(u * 48 + 0.7);
  let c;
  if (w < 0.018) c = P.SC1;
  else if (w < dej) c = (Math.sin(u * 160) * Math.sin(w * 300) > 0.55) ? P.EP1 : P.EP2;
  else if (w < 0.2) c = Math.sin((w * 260 + 3 * Math.sin(u * 40)) ) > 0.7 ? P.CL2 : P.DM4;
  else if (w < 0.78) c = Math.sin((w * 120 + 2.2 * Math.sin(u * 22 + w * 9)) * 1.6) > 0.55 ? P.CL1 : P.DM3;
  else c = P.FT1;
  if (w >= 0.78) for (const f of BLK_FAT) { const d = Math.hypot((u - f.u) * 2.4, (w - f.w) * 4.2); if (d < 0.07) { c = d > 0.058 ? P.FT0 : P.FT2; break; } }
  return side ? mixc(c, P.K0, 0.32) : c;
}
// o: { fade, t, cam (diagram camera) }
function blockView(cam, t, o) {
  o = o || {};
  const fade = o.fade === undefined ? inkFade(t) : o.fade, fl = frostList(t), B = BLK, fw = B.fx1 - B.fx0, fh = B.fy1 - B.fy0;
  for (let sy = 0; sy < H; sy++) {
    const dy_ = cam.wy(sy + 0.5), row = sy * W;
    for (let sx = 0; sx < W; sx++) {
      const dx_ = cam.wx(sx + 0.5);
      let c = null;
      // front face
      if (dx_ >= B.fx0 && dx_ < B.fx1 && dy_ >= B.fy0 && dy_ < B.fy1) c = blockLayer((dx_ - B.fx0) / fw, (dy_ - B.fy0) / fh, false);
      else {
        // top face: v from the front edge (0) to the back edge (1)
        const v = (dy_ - B.fy0) / B.dy;
        if (v >= 0 && v < 1) {
          const u = (dx_ - B.fx0 - v * B.dx) / fw;
          if (u >= 0 && u < 1) c = skinPixel(lerp(B.ax0, B.ax1, u), lerp(B.ay1, B.ay0, v), fl, fade, 0);
          else if (u >= 1) { // right side face
            const vs = (dx_ - B.fx1) / B.dx, ws = (dy_ - B.fy0 - vs * B.dy) / fh;
            if (vs >= 0 && vs < 1 && ws >= 0 && ws < 1) c = blockLayer(1 - vs * 0.2, ws, true);
          }
        } else if (dx_ >= B.fx1) {
          const vs = (dx_ - B.fx1) / B.dx, ws = (dy_ - B.fy0 - vs * B.dy) / fh;
          if (vs >= 0 && vs < 1 && ws >= 0 && ws < 1) c = blockLayer(1 - vs * 0.2, ws, true);
        }
      }
      buf[row + sx] = c === null ? P.BG : c;
    }
  }
  // the ink under the tattoo's lines, and the edges of the block
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  for (const d of BLK_INK.dots) { const x = X(B.fx0 + d.u * fw), y = Y(B.fy0 + d.w * fh); disc(x, y, Math.max(1, d.r * z * 0.8), P.PG0); if (z > 1.5) disc(x - d.r * z * 0.25, y - d.r * z * 0.25, Math.max(0.6, d.r * z * 0.25), P.PG2); }
  const ol = mixc(P.SK0, P.K0, 0.4);
  const fx0 = X(B.fx0), fx1 = X(B.fx1), fy0 = Y(B.fy0), fy1 = Y(B.fy1), ox = B.dx * z, oy = B.dy * z;
  lineW(fx0, fy0, fx1, fy0, 1.5, ol); lineW(fx1, fy0, fx1, fy1, 1.5, ol); lineW(fx0, fy0, fx0 + ox, fy0 + oy, 1.2, ol); lineW(fx1, fy0, fx1 + ox, fy0 + oy, 1.2, ol);
  lineW(fx0 + ox, fy0 + oy, fx1 + ox, fy0 + oy, 1.2, ol); lineW(fx1 + ox, fy0 + oy, fx1 + ox, fy1 + oy, 1.2, ol); lineW(fx1, fy1, fx1 + ox, fy1 + oy, 1.2, ol);
}
// where a front-face point (u, w) is in diagram space
const blkPt = (u, w) => [BLK.fx0 + u * (BLK.fx1 - BLK.fx0), BLK.fy0 + w * (BLK.fy1 - BLK.fy0)];
