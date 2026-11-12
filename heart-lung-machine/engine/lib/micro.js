// MICRO — the microscopic sequence. Each view has its own world and camera {x, y, z} (K.S maps world → screen). The scales
// are schematic: a hollow fibre, its membrane, a red blood cell and a hemoglobin molecule differ in size by orders of
// magnitude, so every change of scale is a visible zoom (with a dissolve at the hand-over), never a cut that suggests
// equal sizes. Molecules use the film's educational colour code: O2 = two cyan spheres, CO2 = three amber spheres in a
// line (O=C=O), hemoglobin = lavender protein with four subunits, heme = gold ring with an iron atom in its centre.
// All motion is deterministic (hashed noise); every 3D look comes from LIT (one light, top left, banded ramps).
(() => {
const { W, H, P } = PIX;
const MICRO = window.MICRO = { NAME: 'MICRO' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const R = n => window.RAMP[n];
const S = (cam, x, y) => K.S(cam, x, y);
const jit = (k, t, f = 1.6) => [K.vn(k * 7.13, t * f, 3) - 0.5, K.vn(k * 3.71 + 40, t * f, 5) - 0.5];   // smooth jitter −0.5..0.5
MICRO.jit = jit;
// ---------- molecules ----------
MICRO.o2 = (c, sx, sy, r, ang, o = {}) => {
  const dx = Math.cos(ang) * r * 0.78, dy = Math.sin(ang) * r * 0.78, ramp = o.ramp || R('ox');
  const A = [sx - dx, sy - dy], B = [sx + dx, sy + dy], back = A[0] + A[1] > B[0] + B[1] ? A : B, front = back === A ? B : A;
  LIT.sphere(c, back[0], back[1], r, ramp, { amb: 0.28, alpha: o.a ?? 1, bias: -0.06 });
  LIT.sphere(c, front[0], front[1], r, ramp, { amb: 0.28, alpha: o.a ?? 1 });
};
MICRO.co2 = (c, sx, sy, r, ang, o = {}) => {
  const dx = Math.cos(ang) * r * 1.3, dy = Math.sin(ang) * r * 1.3, a = o.a ?? 1, ramp = R('co');
  const ends = [[sx - dx, sy - dy], [sx + dx, sy + dy]].sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
  LIT.sphere(c, ends[0][0], ends[0][1], r * 0.86, ramp, { amb: 0.3, alpha: a, bias: -0.04 });
  LIT.sphere(c, sx, sy, r, ['co0', 'co1', 'co2', 'co3'], { amb: 0.3, alpha: a });           // the carbon, darker
  LIT.sphere(c, ends[1][0], ends[1][1], r * 0.86, ramp, { amb: 0.3, alpha: a });
};
// a marker ring round the molecule the camera follows
MICRO.tag = (c, sx, sy, r, t, col = 'w') => { const k = 0.5 + 0.5 * Math.sin(t * 6); FX.ring(c, sx, sy, r + 2 + k, col, 0.9); };
// ---------- a red blood cell: a biconcave disc. The rim is a lit dome; the central dimple is lit as a hollow (its upper
// left in shade, its lower right catching the light). rot = tilt of the disc's long axis; ry/rx sets the viewing angle. ----------
MICRO.rbc = (c, cam, x, y, rx, ry, rot = 0, o = {}) => {
  const [sx, sy] = S(cam, x, y), z = cam.z, a = o.a ?? 1, ramp = o.ramp || R('rc'), bias = o.bias || 0;
  if (rx * z < 1.2) { PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, ramp[3]); return; }
  const box = [sx - rx * z - 2, sy - rx * z - 2, sx + rx * z + 2, sy + rx * z + 2];
  LIT.shape(c, ctx => { ctx.beginPath(); ctx.ellipse(sx, sy, rx * z, ry * z, rot, 0, TAU); ctx.fill(); }, box, ramp, { amb: 0.26, dif: 0.85, alpha: a, bias, R: Math.min(rx, ry) * z * 0.55 });
  if (rx * z < 3) return;
  const ix = rx * z * 0.48, iy = ry * z * 0.46, L = LIT.L;
  LIT.shape(c, ctx => { ctx.beginPath(); ctx.ellipse(sx + 0.6, sy + 0.6, ix, iy, rot, 0, TAU); ctx.fill(); }, box, ramp, { flat: 1, amb: 0.42, dif: 0, alpha: a, edge: false, bias,
    tone: (px, py) => -0.42 * (((px - sx) * L[0] + (py - sy) * L[1]) / Math.max(1, ix)) });
};
// ---------- hemoglobin: four subunits (two alpha, lighter; two beta, darker), each a cluster of round lobes with a heme in a
// surface pocket. s = the subunit offset (world units); shift = 0..1 the small shape change after oxygen binds. ----------
const SUB = [ // [dx, dy, kind, heme offset dx, dy, depth]
  [-0.6, -0.52, 'a', -0.42, -0.30, 0.2], [0.62, -0.46, 'b', 0.44, -0.34, -0.3], [-0.58, 0.58, 'b', -0.40, 0.36, -0.2], [0.6, 0.54, 'a', 0.40, 0.30, 0.3]];
const LOBES = [[0, 0, 0.42], [-0.26, -0.18, 0.3], [0.24, -0.22, 0.28], [0.26, 0.2, 0.3], [-0.22, 0.24, 0.28], [0.02, -0.34, 0.24]];
MICRO.HB_SUB = SUB;
MICRO.hbHeme = (k, cx, cy, s, shift = 0) => {                       // the world position of subunit k's heme
  const [dx, dy, , hx, hy] = SUB[k], rot = (k < 2 ? 1 : -1) * 0.07 * shift, ca = Math.cos(rot), sa = Math.sin(rot);
  const ox = dx * s + hx * s * 0.62, oy = dy * s + hy * s * 0.62; return [cx + ox * ca - oy * sa, cy + ox * sa + oy * ca];
};
MICRO.hb = (c, cam, cx, cy, s, o = {}) => {
  const z = cam.z, shift = o.shift || 0, a = o.a ?? 1, order = [1, 2, 0, 3];
  for (const k of order) {
    const [dx, dy, kind] = SUB[k], rot = (k < 2 ? 1 : -1) * 0.07 * shift, ca = Math.cos(rot), sa = Math.sin(rot);
    const ux = cx + (dx * s) * ca - (dy * s) * sa, uy = cy + (dx * s) * sa + (dy * s) * ca, bias = kind === 'a' ? 0.1 : -0.14;
    const lobes = LOBES.map(([lx, ly, lr], i) => [ux + lx * s * (1 + 0.05 * Math.sin(k * 3 + i)), uy + ly * s, lr * s]).sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
    for (const [lx, ly, lr] of lobes) { const [px, py] = S(cam, lx, ly); LIT.sphere(c, px, py, lr * z, R('hb'), { amb: 0.24, bias: bias + (o.dim ? -0.1 : 0), alpha: a }); }
    // the heme in its pocket: a small gold disc with the iron in the middle (detailed when large)
    const [hx, hy] = MICRO.hbHeme(k, cx, cy, s, shift), [px, py] = S(cam, hx, hy), hr = s * 0.17 * z;
    MICRO.heme(c, px, py, hr, { a, glint: o.glint ? o.glint[k] : 0, bound: o.bound ? o.bound[k] : 0, t: o.t || 0 });
  }
};
// the heme: a flat porphyrin ring (gold) seen at an angle, four pyrrole lumps round it, the iron atom in its centre.
// bound = 0..1: an O2 sitting end-on on the iron (bent). r = ring radius in screen px.
MICRO.heme = (c, sx, sy, r, o = {}) => {
  if (r < 1) return;
  const a = o.a ?? 1, ey = 0.62;
  if (r < 4) { LIT.sphere(c, sx, sy, Math.max(1, r), R('hm'), { amb: 0.4, alpha: a }); }
  else {
    LIT.shape(c, ctx => { ctx.lineWidth = r * 0.42; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * ey, 0, 0, TAU); ctx.stroke(); }, [sx - r * 1.4, sy - r * 1.4, sx + r * 1.4, sy + r * 1.4], R('hm'), { amb: 0.28, alpha: a, bias: 0.04 });
    for (let k = 0; k < 4; k++) { const an = k * TAU / 4 + TAU / 8, px = sx + Math.cos(an) * r, py = sy + Math.sin(an) * r * ey; LIT.sphere(c, px, py, r * 0.32, R('hm'), { amb: 0.3, alpha: a }); }
    LIT.sphere(c, sx, sy, Math.max(1.5, r * 0.34), ['g1', 'g2', 'g4', 'co2', 'g7'], { amb: 0.3, alpha: a });     // iron
  }
  if (o.glint > 0) FX.glowL(c, sx, sy, r * 2.6 * o.glint + 3, ['hm1', 'hm2', 'hm3', 'hm4'], 0.7 * o.glint, 1.4);
  if (o.bound > 0) {                                                 // O2 bound end-on to the iron, tilted (bent geometry)
    const rr = Math.max(1.5, r * 0.36), b = o.bound;
    MICRO.o2(c, sx + rr * 0.9, sy - rr * 1.9 * b - rr * 0.2, rr, -1.1, { a: Math.min(1, b * 1.5) * a });
  }
};
// ---------- backgrounds ----------
// plasma: a dark warm field with large soft out-of-focus cells drifting far behind (depth), never grainy
MICRO.plasma = (c, cam, T, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'pl1');
  for (let k = 0; k < 9; k++) {
    const x = ((hh(k, 1) * 420 + T * (6 + 6 * hh(k, 2)) * (o.dir || 1)) % 420 + 420) % 420 - 75, y = hh(k, 3) * 480, r = 26 + 30 * hh(k, 4);
    PIX.glow(c, x, y, r, k % 3 ? 'pl2' : 'pl3', 0.55);
  }
};
// gas: a cool dark field with faint pale-cyan streaks drifting (the sweep gas)
MICRO.gas = (c, x0, x1, T, o = {}) => {
  PIX.rect(c, x0, 0, x1 - x0, H, 'n1');
  for (let k = 0; k < 16; k++) {
    const y = ((hh(k, 9) * 520 - T * (30 + 20 * hh(k, 8))) % 520 + 520) % 520 - 20, x = x0 + hh(k, 7) * (x1 - x0), L = 10 + 18 * hh(k, 6);
    PIX.rect(c, Math.round(x), Math.round(y), 1, Math.round(L), k % 2 ? 'ox0' : 'n2');
  }
};
MICRO.init = () => {};
})();
