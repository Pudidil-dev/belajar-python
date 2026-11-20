// SPHERE — per-pixel planet renderer for pixel art.
// A body is a lit, spinning sphere whose surface colour comes from a texture function of the point in the body's own
// frame (so it rotates and evolves smoothly). Colour is picked from hand-made palette ramps: the texture gives a ramp and
// a level, lighting shifts the level down in flat Kurzgesagt-style bands, and the fractional level is ordered-dithered
// between neighbouring ramp colours. Emissive surfaces (lava) ignore the light. The disc edge is the pixel-centre test,
// so silhouettes stay crisp at every zoom. Also: 3D value noise, fBm, cellular noise, and the 5° land map of Earth.
(() => {
const { W, H, P, BAYER } = PIX;
const RGB = k => PIX.hex(P[k]);

// ---------- noise ----------
function h3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = h3(ix, iy, iz), b = h3(ix + 1, iy, iz), c = h3(ix, iy + 1, iz), d = h3(ix + 1, iy + 1, iz);
  const e = h3(ix, iy, iz + 1), f = h3(ix + 1, iy, iz + 1), g = h3(ix, iy + 1, iz + 1), hh = h3(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (hh - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
  return y1 + (y2 - y1) * fz;
}
function fbm(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1, z * f + i * 5.7); n += a; f *= 2.07; a *= 0.5; }
  return s / n;
}
// cellular: returns f1, f2 (nearest and second-nearest feature distance) and the nearest cell's id in [0,1)
const CELL = { f1: 0, f2: 0, id: 0, cx: 0, cy: 0, cz: 0 };
function cellular(x, y, z, jit = 0.85) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let f1 = 9, f2 = 9, id = 0, bx = 0, by = 0, bz = 0;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, cz = iz + k;
    const px = cx + 0.5 + (h3(cx, cy, cz) - 0.5) * jit, py = cy + 0.5 + (h3(cx + 31, cy, cz) - 0.5) * jit, pz = cz + 0.5 + (h3(cx, cy + 57, cz) - 0.5) * jit;
    const dx = px - x, dy = py - y, dz = pz - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < f1) { f2 = f1; f1 = d; id = h3(cx, cy, cz + 99); bx = cx; by = cy; bz = cz; } else if (d < f2) f2 = d;
  }
  CELL.f1 = f1; CELL.f2 = f2; CELL.id = id; CELL.cx = bx; CELL.cy = by; CELL.cz = bz;
  return CELL;
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- ramps (dark → bright) ----------
const ramp = keys => keys.map(RGB);
const R = {
  magma: ramp(['k', 'r0', 'r1', 'r2', 'o0', 'o1', 'y0', 'y1', 'w']),
  rock: ramp(['k', 'q0', 'q1', 'q2', 'q3', 'q4', 'q5']),
  theia: ramp(['k', 'q0', 's0', 'q2', 's1', 'q3', 's2', 'q4']),
  moon: ramp(['k', 'g0', 'q1', 'g1', 'q2', 'g2', 'q3', 'g3', 'q4', 'g4', 'q5', 'g5']),
  ocean: ramp(['k', 'n0', 'e0', 'e1', 'e2', 'e3']),
  land: ramp(['k', 'q0', 'v0', 'v1', 'v2']),
  desert: ramp(['k', 'q0', 's0', 's1', 's2', 's3']),
  cloud: ramp(['q1', 'q2', 'q3', 'q4', 'q5', 'w']),
  ice: ramp(['q1', 'g2', 'g3', 'g4', 'g5', 'w']),
  steam: ramp(['q0', 'q1', 'q2', 'q3', 'q4']),
};

// ---------- the renderer ----------
const oc = document.createElement('canvas'); oc.width = W; oc.height = H;
const ox = oc.getContext('2d', { willReadFrequently: true });
const OUT = { ramp: R.rock, lv: 0, em: 0, a: 1 };          // texture output: ramp, level, emissive 0..1, alpha
// o: {cx, cy, R: screen px, spin, tilt, roll, light: [x, y, z] (screen frame, y down, z to viewer), tex(p, n, out),
//     stretch: {ang, k} (tidal elongation along ang by factor k), halo: {ramp, lv, w (px), a}, rim: level boost on the lit limb}
function draw(c, o) {
  const Rr = o.R; if (!(Rr > 0.4)) return;
  const st = o.stretch, sk = st ? st.k : 1, sa = st ? st.ang : 0, cs = Math.cos(sa), sn = Math.sin(sa);
  const halo = o.halo, hw = halo ? halo.w : 0, ext = Rr * Math.max(sk, 1) + hw + 2;
  const x0 = Math.max(0, Math.floor(o.cx - ext)), x1 = Math.min(W - 1, Math.ceil(o.cx + ext));
  const y0 = Math.max(0, Math.floor(o.cy - ext)), y1 = Math.min(H - 1, Math.ceil(o.cy + ext));
  if (x0 > x1 || y0 > y1) return;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, img = ox.createImageData(w, h), d = img.data;
  const L = o.light || [-0.7, -0.3, 0.65], ll = Math.hypot(L[0], L[1], L[2]), lx = L[0] / ll, ly = L[1] / ll, lz = L[2] / ll;
  const cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0), ct = Math.cos(o.tilt || 0), stt = Math.sin(o.tilt || 0);
  const csp = Math.cos(o.spin || 0), ssp = Math.sin(o.spin || 0);
  const p = [0, 0, 0], n = [0, 0, 0], rim = o.rim ?? 0.6, bands = o.bands || [0.42, 0.12, -0.08];
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    let dx = px + 0.5 - o.cx, dy = py + 0.5 - o.cy;
    if (st) { const a = (dx * cs + dy * sn) / sk, b = -dx * sn + dy * cs; dx = a * cs - b * sn; dy = a * sn + b * cs; }
    const u = dx / Rr, v = dy / Rr, rr = u * u + v * v, i = ((py - y0) * w + (px - x0)) * 4, th = BAYER[(py & 3) << 2 | (px & 3)] + 0.5;
    if (rr > 1) {                                                  // halo / atmosphere glow outside the disc
      if (!halo) continue;
      const dist = (Math.sqrt(rr) - 1) * Rr; if (dist > hw) continue;
      const f = 1 - dist / hw, a = halo.a * f * f;
      if (th > a) continue;
      const lvh = halo.lv * (0.6 + 0.4 * f), col = halo.ramp[Math.max(0, Math.min(halo.ramp.length - 1, Math.floor(lvh + th - 0.5)))];
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; continue;
    }
    const z = Math.sqrt(1 - rr);
    n[0] = u; n[1] = v; n[2] = z;
    // view → body: undo roll (about z), tilt (about x), spin (about y)
    const ux = u * cr + v * sr, uy = -u * sr + v * cr;
    const by = uy * ct - z * stt, bz1 = uy * stt + z * ct;
    p[0] = ux * csp + bz1 * ssp; p[1] = by; p[2] = -ux * ssp + bz1 * csp;
    OUT.a = 1; OUT.em = 0;
    o.tex(p, n, OUT);
    if (OUT.a <= 0 || (OUT.a < 1 && th > OUT.a)) continue;
    const lam = n[0] * lx + n[1] * ly + n[2] * lz;
    const drop = lam > bands[0] ? 0 : lam > bands[1] ? 0.85 : lam > bands[2] ? 1.7 : 2.6;
    let lv = OUT.lv - drop * (1 - OUT.em);
    if (rim && lam > 0.15 && z < 0.28) lv += rim * (1 - OUT.em) * (1 - z / 0.28);
    const rmp = OUT.ramp, idx = Math.max(0, Math.min(rmp.length - 1, Math.floor(lv + th - 0.5))), col = rmp[idx];
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  ox.putImageData(img, x0, y0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(oc, x0, y0, w, h, x0, y0, w, h); c.restore();
}

// ---------- textures ----------
// Each factory returns tex(p, n, out). p is the unit surface point in the body frame.

// young Earth before the impact: a magma ocean with drifting black crust rafts and glowing cracks
function moltenEarth(t, opt = {}) {
  const cover = opt.cover ?? 0.5, drift = t * 0.05;
  return (p, n, out) => {
    const wx = p[0] * 2.2 + drift, wy = p[1] * 2.2, wz = p[2] * 2.2 - drift * 0.6;
    const q = fbm(wx, wy, wz, 4);
    const C = cellular(p[0] * 5.2 + q * 0.9 + drift, p[1] * 5.2 + q * 0.6, p[2] * 5.2 - drift * 0.5, 0.9);
    const edge = C.f2 - C.f1, crust = q + (C.id - 0.5) * 0.25 > 1 - cover;
    const fl = 0.5 + 0.5 * Math.sin(t * 5 + C.id * 40 + q * 9);
    if (crust && edge > 0.09) {                                     // solid raft: dark basalt, lit by the sun
      out.ramp = R.rock; out.lv = 1.6 + fbm(p[0] * 14, p[1] * 14, p[2] * 14, 2) * 2.2; out.em = 0;
    } else if (crust) {                                              // crack between rafts: bright, flickering
      out.ramp = R.magma; out.lv = 5.2 + 1.6 * (1 - edge / 0.09) + fl * 0.8; out.em = 1;
    } else {                                                         // open lava: turbulent, with dark cooling-skin filaments
      const w1 = fbm(p[0] * 6 + q * 1.4 + drift * 3, p[1] * 6 - q, p[2] * 6 + drift * 2, 3), w2 = fbm(p[0] * 19, p[1] * 19 + drift * 4, p[2] * 19, 2);
      let lv = 4.0 + 1.7 * w1 + 0.9 * (w2 - 0.5) + 1.1 * (1 - Math.min(1, edge / 0.12)) + (fl - 0.5) * 0.4;
      if (Math.abs(w1 - 0.5) < 0.018 || Math.abs(w2 - 0.52) < 0.012) lv -= 1.4;
      out.ramp = R.magma; out.lv = lv; out.em = 0.85;
    }
  };
}
// Theia: a cooler, cratered protoplanet with a few glowing fissures
function theia(t) {
  return (p, n, out) => {
    const b = fbm(p[0] * 3 + 4, p[1] * 3, p[2] * 3, 4);
    out.ramp = R.theia; out.lv = 3.2 + (b - 0.5) * 3.2; out.em = 0;
    const C = cellular(p[0] * 4.5 + 7, p[1] * 4.5, p[2] * 4.5, 0.8), rc = 0.18 + C.id * 0.22;
    if (C.f1 < rc) out.lv -= 1.2 * (1 - C.f1 / rc) + 0.4;                  // crater floor
    else if (C.f1 < rc + 0.07) out.lv += 1.0;                              // raised rim
    const F = cellular(p[0] * 2.6 - 3, p[1] * 2.6, p[2] * 2.6, 0.9);
    if (F.f2 - F.f1 < 0.028 && F.id > 0.55) { out.ramp = R.magma; out.lv = 3.4 + 0.6 * Math.sin(t * 3 + F.id * 20); out.em = 0.9; }
  };
}
// post-impact Earth / young Moon: a global magma ocean, churning cells; `crust` adds cooling black flecks
function magmaBall(t, opt = {}) {
  const sc = opt.scale ?? 3.4, heat = opt.heat ?? 1, crust = opt.crust ?? 0;
  return (p, n, out) => {
    const s = t * (opt.flow ?? 0.12);
    const q = fbm(p[0] * 2 + s, p[1] * 2, p[2] * 2 - s, 3);
    const C = cellular(p[0] * sc + q * 0.8 + s, p[1] * sc + q * 0.5, p[2] * sc - s, 0.95);
    out.ramp = R.magma; out.em = 1;
    out.lv = 3.3 + heat * 2.4 + 1.5 * (1 - Math.min(1, C.f1 * 1.5)) - Math.max(0, 0.12 - (C.f2 - C.f1)) * 9 + (q - 0.5) * 1.2;
    if (crust > 0 && C.f2 - C.f1 > 0.1 && fbm(p[0] * 9, p[1] * 9 + s, p[2] * 9, 2) < crust * 0.75) { out.ramp = R.rock; out.lv = 1.3 + q * 1.4; out.em = 0; }
  };
}
// the Moon from magma ocean to the cratered grey face
// heat: magma glow 0..1, crust: anorthosite raft coverage 0..1, craters 0..1, mare: dark basalt plains 0..1
function moon(t, s) {
  return (p, n, out) => {
    const C = cellular(p[0] * 4.2 + 2, p[1] * 4.2, p[2] * 4.2 + 5, 0.9), raft = C.id < s.crust * 1.08 - 0.04;
    const edge = C.f2 - C.f1, q = fbm(p[0] * 3, p[1] * 3, p[2] * 3, 4);
    if (!raft || (edge < 0.05 * (1 - s.crust) + 0.012 && s.heat > 0.05)) {   // open magma or a glowing seam between rafts
      out.ramp = R.magma; out.em = 1;
      const hc = cellular(p[0] * 6 + t * 0.2, p[1] * 6, p[2] * 6 - t * 0.2, 0.95);
      out.lv = raft ? 2.5 + 3 * s.heat : 2.2 + s.heat * 3.6 + 1.2 * (1 - Math.min(1, hc.f1 * 1.5)) * s.heat;
      return;
    }
    out.ramp = R.moon; out.em = 0;
    out.lv = 8.6 + (q - 0.5) * 2.2;                                          // bright anorthosite highlands
    if (s.mare > 0) {                                                        // dark basalt fills the big low basins
      const b = fbm(p[0] * 1.35 + 9, p[1] * 1.35, p[2] * 1.35 + 1, 3) + Math.max(0, p[2] - 0.15) * 0.35;
      if (b > 1.02 - s.mare * 0.5) out.lv = 4.6 + (q - 0.5) * 1.2;
    }
    if (s.craters > 0) for (const [f, k] of [[7, 0.0], [13, 0.35], [24, 0.6]]) {
      const K = cellular(p[0] * f + 11, p[1] * f, p[2] * f - 3, 0.85);
      if (K.id > s.craters * (1 - k) + 0.02) continue;
      const rc = 0.16 + 0.2 * h3(K.cx, K.cy, K.cz);
      if (K.f1 < rc) { out.lv -= 1.6 * (1 - K.f1 / rc) + 0.5; break; }
      if (K.f1 < rc + 0.06) { out.lv += 1.4; break; }
    }
    if (s.heat > 0) out.lv -= 0;                                             // (rafts are already solid)
  };
}

// ---------- Earth's land, 5° grid: [latitude band centre, [lon0, lon1] ranges] ----------
const LANDS = [
  [82.5, [[-70, -30], [50, 60], [95, 105]]],
  [77.5, [[-120, -75], [-70, -20], [10, 30], [55, 65], [95, 112], [135, 150]]],
  [72.5, [[-165, -142], [-125, -80], [-80, -65], [-55, -20], [20, 30], [65, 75], [80, 160]]],
  [67.5, [[-180, -141], [-141, -82], [-75, -62], [-55, -20], [-24, -14], [12, 180]]],
  [62.5, [[-180, -172], [-165, -95], [-78, -60], [-50, -42], [-24, -14], [5, 180]]],
  [57.5, [[-160, -95], [-77, -60], [-6, -2], [8, 18], [22, 140], [156, 163]]],
  [52.5, [[-132, -56], [-10, -6], [-5, 2], [4, 140], [142, 144], [156, 160]]],
  [47.5, [[-125, -53], [-4, 30], [40, 47], [53, 142]]],
  [42.5, [[-124, -70], [-66, -62], [-9, 13], [18, 28], [41, 47], [54, 130], [139, 146]]],
  [37.5, [[-123, -76], [-9, -1], [-2, 11], [14, 17], [20, 26], [26, 49], [54, 122], [126, 129], [130, 141]]],
  [32.5, [[-120, -80], [-10, 122], [130, 140]]],
  [27.5, [[-115, -110], [-110, -97], [-82, -80], [-15, 33], [37, 48], [56, 122]]],
  [22.5, [[-106, -97], [-85, -74], [-17, 37], [39, 60], [68, 110], [108, 122]]],
  [17.5, [[-105, -88], [-74, -68], [-17, 40], [42, 57], [73, 85], [94, 109], [119, 126]]],
  [12.5, [[-92, -83], [-75, -62], [-17, 51], [74, 80], [98, 109], [120, 126]]],
  [7.5, [[-77, -60], [-14, 48], [80, 82], [98, 103], [105, 107], [116, 126]]],
  [2.5, [[-80, -50], [-8, 42], [95, 106], [109, 119], [119, 125], [127, 129]]],
  [-2.5, [[-81, -35], [9, 41], [100, 106], [109, 118], [119, 124], [131, 151]]],
  [-7.5, [[-80, -35], [12, 40], [105, 115], [116, 125], [138, 150]]],
  [-12.5, [[-77, -38], [12, 41], [48, 50], [124, 127], [130, 137], [141, 144]]],
  [-17.5, [[-72, -39], [12, 37], [44, 50], [122, 136], [141, 146]]],
  [-22.5, [[-70, -41], [14, 35], [43, 48], [114, 153]]],
  [-27.5, [[-71, -48], [15, 32], [45, 47], [113, 153]]],
  [-32.5, [[-72, -53], [18, 30], [115, 123], [128, 140], [141, 152]]],
  [-37.5, [[-73, -57], [140, 150], [173, 178]]],
  [-42.5, [[-74, -63], [145, 148], [168, 178]]],
  [-47.5, [[-75, -66], [166, 170]]],
  [-52.5, [[-75, -65], [-61, -58]]],
  [-62.5, [[-65, -55]]],
  [-67.5, [[-70, -60], [0, 165]]],
  [-72.5, [[-140, -60], [-20, 165]]],
  [-77.5, [[-155, -65], [-30, 160]]],
  [-82.5, [[-180, 180]]],
  [-87.5, [[-180, 180]]],
];
const GW = 72, GH = 36, GRID = new Float32Array(GW * GH);
for (const [lat, rs] of LANDS) {
  const r = Math.round((87.5 - lat) / 5);
  for (const [a, b] of rs) for (let c = 0; c < GW; c++) { const lon = -177.5 + 5 * c; if (lon >= a - 2.5 && lon <= b + 2.5) GRID[r * GW + c] = 1; }
}
function landAt(lat, lon) {                                          // bilinear on the 5° grid, 0..1
  const fy = Math.max(0, Math.min(GH - 1.001, (87.5 - lat) / 5)), fx = ((lon + 177.5) / 5 % GW + GW) % GW;
  const y0 = Math.floor(fy), x0 = Math.floor(fx), ty = fy - y0, tx = fx - x0, x1 = (x0 + 1) % GW, y1 = Math.min(GH - 1, y0 + 1);
  const a = GRID[y0 * GW + x0], b = GRID[y0 * GW + x1], c = GRID[y1 * GW + x0], d = GRID[y1 * GW + x1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}
const DESERTS = [[15, 32, -15, 55], [18, 30, 40, 60], [-30, -20, 118, 142], [38, 46, 90, 115], [-28, -20, 15, 25], [30, 40, 55, 70]];
const isDesert = (lat, lon, n) => DESERTS.some(([a, b, c, d]) => {             // soft elliptical regions with a ragged edge
  const u = (lat - (a + b) / 2) / ((b - a) / 2), v = (lon - (c + d) / 2) / ((d - c) / 2);
  return u * u + v * v < 0.75 + (n - 0.5) * 1.2;
});

// Earth through time. s: 0 molten → 0.2 black crust with glowing cracks and steam → 0.45 thick clouds →
// 0.6 the first oceans fill the lowlands → 1 the modern face (real continents, ice caps, clouds)
function earth(t, s, spinT = 0) {
  return (p, n, out) => {
    const lat = Math.asin(Math.max(-1, Math.min(1, -p[1]))) * 180 / Math.PI, lon = Math.atan2(p[0], p[2]) * 180 / Math.PI;
    const q = fbm(p[0] * 2.6 + 3, p[1] * 2.6, p[2] * 2.6, 4), detail = fbm(p[0] * 9, p[1] * 9, p[2] * 9, 3);
    // clouds first: they sit above everything
    const cw = spinT * 0.15;
    const cl = fbm(p[0] * 3.2 + cw, p[1] * 7 + Math.sin(p[0] * 3) * 0.5, p[2] * 3.2 - cw, 4);
    const band = 0.5 + 0.5 * Math.cos(lat * Math.PI / 30);                  // storm belts
    const cover = s < 0.2 ? sstep(0.1, 0.2, s) * 0.3 : s < 0.45 ? 0.3 + sstep(0.2, 0.45, s) * 0.55 : s < 0.75 ? 0.85 - sstep(0.45, 0.75, s) * 0.45 : 0.4 - sstep(0.75, 1, s) * 0.2;
    if (cl + band * 0.06 > 0.5 + (0.5 - cover) * 0.45) {                  // fBm sits near 0.5 ± 0.12, so this maps cover to area
      const white = vnoise(p[0] * 5 + 3, p[1] * 5, p[2] * 5) < sstep(0.4, 0.62, s) * 1.2 - 0.1;   // steam → white cloud, region by region
      out.ramp = white ? R.cloud : R.steam; out.lv = white ? 4.3 + (cl - 0.5) * 2.4 + sstep(0.75, 1, s) * 0.7 : 2.6 + (cl - 0.5) * 2; out.em = 0; return;
    }
    if (s < 0.2) {                                                          // cooling magma → crust
      const hot = magmaBall(t, { heat: 1 - s * 4, crust: s * 5, scale: 3 });
      hot(p, n, out); return;
    }
    const elev = q + (detail - 0.5) * 0.25;
    const modern = sstep(0.72, 0.95, s);
    let land;
    if (modern > 0) { const ml = landAt(lat, lon) + (detail - 0.5) * 0.45; land = modern * (ml > 0.5 ? 1 : 0) + (1 - modern) * (elev > 0.56 ? 1 : 0); land = land > 0.5 + (h3(Math.floor(lat * 3), Math.floor(lon * 3), 7) - 0.5) * 0.6 * (1 - modern); }
    else land = true;
    const sea = s > 0.5 ? sstep(0.5, 0.72, s) : 0;                         // how far the oceans have filled the lowlands
    const wet = modern > 0 ? !land : elev < 0.15 + sea * 0.45;
    if (wet && sea > 0) { out.ramp = R.ocean; out.lv = 2.4 + sea * 1.4 + (detail - 0.5) * 0.6 + (elev > 0.5 ? 0.6 : 0); out.em = 0; return; }
    if (s < 0.6 && vnoise(p[0] * 4 - 2, p[1] * 4, p[2] * 4 + 1) > sstep(0.5, 0.62, s) * 1.2 - 0.1) {   // Hadean basalt with dying glow
      const F = cellular(p[0] * 6, p[1] * 6, p[2] * 6, 0.9);
      if (F.f2 - F.f1 < 0.035 * (1 - sstep(0.2, 0.55, s))) { out.ramp = R.magma; out.lv = 4.4 - s * 3; out.em = 1; return; }
      out.ramp = R.rock; out.lv = 1.8 + (elev - 0.5) * 2.2; out.em = 0; return;
    }
    if (Math.abs(lat) > 72 || (modern > 0.5 && ((lat > 60 && lon > -60 && lon < -20) || lat < -62))) { out.ramp = R.ice; out.lv = 4.2 + (detail - 0.5); out.em = 0; return; }
    if (modern > 0.5 && isDesert(lat, lon, detail)) { out.ramp = R.desert; out.lv = 4.0 + (detail - 0.5) * 1.4; out.em = 0; return; }
    if (s < 0.8) { out.ramp = R.rock; out.lv = 2.4 + (elev - 0.5) * 2; out.em = 0; return; }   // bare early continents
    out.ramp = R.land; out.lv = 3.0 + (detail - 0.5) * 1.6 - (Math.abs(lat) > 50 ? 0.5 : 0); out.em = 0;
  };
}

window.SPH = { draw, R, fbm, vnoise, cellular, h3, sstep, tex: { moltenEarth, theia, magmaBall, moon, earth }, landAt };
})();
