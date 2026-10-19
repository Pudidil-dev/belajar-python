// NANO — inside the aluminium wiring: the polycrystalline film (grains a few hundred nm across), the crystal lattice of
// aluminium ions, and the amorphous aluminium-oxide tunnel barrier of the Josephson junction.
// World units: nanometres. cam = {x, y, z: px per nm}; screen centre = (W/2, H/2).
(() => {
const { W, H } = PIX;
const NANO = window.NANO = {};
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const A = 0.405;                                   // Al lattice constant (nm); drawn as a square lattice
NANO.A = A;
NANO.S = (cam, x, y) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z];
// ---------- grains: Voronoi cells on a jittered grid, shaded per pixel so they stay crisp at every zoom ----------
const G = 180;
const seed = (i, j) => [(i + 0.2 + 0.6 * h(i * 7 + 3, j * 13 + 1)) * G, (j + 0.2 + 0.6 * h(i * 11 + 5, j * 3 + 7)) * G];
NANO.G = G; NANO.seed = seed;
// mask(sx, sy) → true where the film is visible (optional); a = 0..1 dithered coverage
NANO.grains = (c, cam, a = 1, mask = null) => {
  if (a <= 0) return;
  const img = K.pbegin(c), d = img.data, ramp = ['b0', 'b1', 'b2', 'b3'].map(K.rgb);
  // boundary width: 1.6 nm, at least a pixel, but never more than a tenth of a grain (small grains: sparse dark specks)
  const iz = 1 / cam.z, gp = G * cam.z, bw = gp < 4 ? 0 : Math.min(Math.max(1.6, 0.9 * iz), 0.06 * G), noise = 0.15 + 0.75 * clamp((gp - 4) / 10);
  let ci = null, cj = null, near = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a < 1 && a <= K.BAY(x, y)) continue;
    if (mask && !mask(x, y)) continue;
    const wx = cam.x + (x - W / 2) * iz, wy = cam.y + (y - H / 2) * iz;
    const gi = Math.floor(wx / G), gj = Math.floor(wy / G);
    if (gi !== ci || gj !== cj) { ci = gi; cj = gj; near = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) near.push([gi + di, gj + dj, ...seed(gi + di, gj + dj)]); }
    let d1 = 1e9, d2 = 1e9, k1 = null;
    for (const s of near) { const dd = Math.hypot(wx - s[2], wy - s[3]); if (dd < d1) { d2 = d1; d1 = dd; k1 = s; } else if (dd < d2) d2 = dd; }
    let col;
    if (d2 - d1 < bw) col = ramp[0];
    else {
      // each grain has its own brightness (crystal orientation) and a soft gradient toward its upper-left facet
      const base = 1.25 + 0.95 * h(k1[0] * 31 + 7, k1[1] * 17 + 3), gx = (wx - k1[2]) / G, gy = (wy - k1[3]) / G;
      const v = base - 0.55 * (gx + gy) + (K.BAY(x, y) - 0.5) * noise;
      col = ramp[Math.max(1, Math.min(3, Math.floor(v)))];
    }
    const i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  K.pend(c, img);
};
// ---------- ions ----------
// o = {amp (nm, thermal vibration), t, x0, x1 (world x range to fill), lat: (x, y) → lattice offset, col}
NANO.ion = (c, sx, sy, r, base = 'b1', hi = 'b2', a = 1) => {
  if (sx < -r - 2 || sy < -r - 2 || sx > W + r + 2 || sy > H + r + 2) return;
  if (r < 1.1) { PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, hi, a); return; }
  PIX.circ(c, sx, sy, r + 0.9, 'k', a); PIX.circ(c, sx, sy, r, base, a); PIX.circ(c, sx - r * 0.28, sy - r * 0.28, r * 0.5, hi, a);
  if (r > 3) PIX.rect(c, Math.round(sx - r * 0.4), Math.round(sy - r * 0.45), 1, 1, 'b3', a);
};
// face-centred cubic Al seen along a cube axis: the front layer of ions on a square grid (spacing A) and, half a cell
// deeper, a dimmer layer at the face centres. y ∈ [y0, y1] limits the crystal; amp (nm) = thermal jiggle.
NANO.lattice = (c, cam, o = {}) => {
  const t = o.t || 0, amp = o.amp ?? 0.01, y0 = o.y0 ?? -1e9, y1 = o.y1 ?? 1e9, oy = o.oy || 0;
  const iz = 1 / cam.z, wx0 = cam.x - (W / 2 + 8) * iz, wx1 = cam.x + (W / 2 + 8) * iz;
  const wy0 = Math.max(y0, cam.y - (H / 2 + 8) * iz), wy1 = Math.min(y1, cam.y + (H / 2 + 8) * iz);
  if (wy1 <= wy0) return;
  for (const back of [1, 0]) {
    const r = Math.max(0.6, (back ? 0.065 : 0.1) * cam.z), off = back ? A / 2 : 0;
    for (let j = Math.ceil((wy0 - oy - off) / A); j <= Math.floor((wy1 - oy - off) / A); j++) for (let i = Math.floor((wx0 - off) / A); i <= Math.ceil((wx1 - off) / A); i++) {
      const ph = h(i * 13 + 5 + back, j * 7 + 11) * TAU, w = 7 + 5 * h(i, j + back);
      const x = off + i * A + amp * Math.sin(w * t + ph), y = oy + off + j * A + amp * Math.cos(w * 1.13 * t + ph * 1.7);
      const [sx, sy] = NANO.S(cam, x, y);
      if (back) NANO.ion(c, sx, sy, r, o.bb || 'b0', o.bh || 'b1'); else NANO.ion(c, sx, sy, r, o.base || 'b1', o.hi || 'b2');
    }
  }
};
// amorphous AlOx between world y = by0 and by1: aluminium and oxygen ions at disordered positions
NANO.oxide = (c, cam, by0, by1, o = {}) => {
  const t = o.t || 0, iz = 1 / cam.z, wx0 = cam.x - (W / 2 + 8) * iz, wx1 = cam.x + (W / 2 + 8) * iz, r = Math.max(0.6, 0.085 * cam.z);
  const [, sy0] = NANO.S(cam, 0, by0), [, sy1] = NANO.S(cam, 0, by1);
  PIX.rect(c, 0, Math.round(sy0), W, Math.max(1, Math.round(sy1 - sy0)), 'd1');
  const n = Math.max(1, Math.round((by1 - by0) / (A * 0.55))), step = A * 0.55;
  for (let i = Math.floor(wx0 / step); i <= Math.ceil(wx1 / step); i++) for (let k = 0; k < n; k++) {
    const y = by0 + (k + 0.15 + 0.7 * h(k * 19 + 3, i * 23 + 1)) * (by1 - by0) / n, x = (i + 0.6 * h(k * 5 + 1, i * 29 + 7)) * step;
    const [sx, sy] = NANO.S(cam, x, y + 0.006 * Math.sin(9 * t + k + i));
    const oxy = h(k * 3 + 7, i * 11 + 2) < 0.6;
    NANO.ion(c, sx, sy, r * (oxy ? 0.85 : 1), oxy ? 'd4' : 'd5', oxy ? 'd6' : 'd7');
  }
};
})();
