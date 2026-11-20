// SCAN — the scanner, ray-cast per pixel: a 1.5 T superconducting MRI in a cutaway. Scanner frame in metres: X along
// the bore (the patient's head at the isocentre X ≈ 0, the feet toward +X and the table), Y away from the usual camera,
// Z up. The machine is two coaxial shells: the inner one (r 0.30–0.44 m) holds the bore liner, the RF body coil and the
// three gradient coils; the outer one (r 0.44–1.03 m) is the cryostat — vacuum vessel, thermal shield, helium vessel at
// 4 K with six main superconducting coils and two shielding coils — inside the white cover. A cutting plane Y = cut
// removes everything in front of it, so sliding it from −1.05 to 0 opens the machine like a technical illustration.
// The patient lies on the table with the head in a head coil; the head is the film's sagittal MRI slice (in the plane
// Y = 0) under a translucent skin. Flat-shaded with palette ramps and ordered dither, outlined where objects meet.
(() => {
const { W, H, P } = PIX;
const SCAN = window.SCAN = {};
const clamp = U.clamp, lerp = U.lerp;
const hex = h => PIX.hex(P[h] || h);
const RAMP = {}; let RD = false;
const ramps = () => {
  if (RD) return; RD = true;
  const R = (k, names) => RAMP[k] = names.map(hex);
  R('cover', ['g4', 'g6', 'g8', 'g9', 'ga', 'gb', 'w']); R('steel', ['g2', 'g4', 'g6', 'g7', 'g8', 'g9']); R('vac', ['k', 'n0', 'n1']);
  R('he', ['n2', 'n3', 'n4', 'g5', 'c1']); R('coil', ['u0', 'u1', 'u2', 'u3']); R('grad', ['g1', 'g2', 'g3', 'g4']); R('gwire', ['u0', 'u1', 'u2']);
  R('rf', ['u0', 'u1', 'u2', 'u3']); R('rfon', ['v1', 'v2', 'v3', 'v4']); R('liner', ['g5', 'g7', 'g9', 'ga', 'gb']); R('dark', ['k', 'g0', 'g1', 'g2']);
  R('table', ['g3', 'g5', 'g7', 'g8', 'g9']); R('blanket', ['g4', 'g6', 'g8', 'g9', 'ga']); R('skin', ['s0', 's1', 's2', 's3']);
  R('floor', ['n0', 'n1', 'n2', 'n3']); R('wall', ['k', 'n0', 'n1', 'n2']); R('cage', ['g5', 'g7', 'g9', 'ga', 'gb']);
  R('gray', ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w']); R('pad', ['g2', 'g3', 'g4', 'g5']);
  R('glowc', ['c1', 'c2', 'c3', 'c4']); R('glowv', ['v1', 'v2', 'v3', 'v4']); R('glowg', ['u1', 'u2', 'u3', 'y4']);
};
// ---------- geometry ----------
const GEO = SCAN.GEO = { L: 0.86, R_BORE: 0.30, R_MID: 0.44, R_OUT: 1.03, FLOOR: -1.03, HEAD: [0.0, 0, -0.035] };
// the main coils (X centre, half width, r0, r1) and shielding coils
const COILS = SCAN.COILS = [[-0.60, 0.075, 0.545, 0.615], [-0.36, 0.055, 0.545, 0.595], [-0.12, 0.05, 0.545, 0.585], [0.12, 0.05, 0.545, 0.585], [0.36, 0.055, 0.545, 0.595], [0.60, 0.075, 0.545, 0.615],
  [-0.45, 0.07, 0.76, 0.81], [0.45, 0.07, 0.76, 0.81]];
// cut-face materials: returns [ramp, value 0..1, id] for a point (X, r) on the cutting plane
function cutInner(X, r, o) {
  const ax = Math.abs(X);
  if (r < 0.312) return ['liner', 0.85, 1];
  if (r < 0.338) { if (ax < 0.33) { const ring = ax > 0.30; return [o.rf > 0 ? 'rfon' : 'rf', 0.55 + 0.3 * (o.rf || 0) + (ring ? 0.15 : 0), 2]; } return ['dark', 0.4, 3]; }
  if (ax < 0.64) {                                                             // gradient coils: three winding layers in epoxy
    const band = r < 0.37 ? 0 : r < 0.40 ? 1 : r < 0.43 ? 2 : -1;
    if (band >= 0) { const ph = (X * (90 + 25 * band) + band * 0.3) % 1, rr = ((r - 0.34) * 330) % 1; if ((ph + 1) % 1 < 0.5 && rr > 0.2 && rr < 0.85) return [o.grad > 0 ? 'glowg' : 'gwire', 0.5 + 0.5 * (o.grad || 0), 4]; }
    return ['grad', 0.45, 4];
  }
  return ['dark', 0.35, 3];
}
function cutOuter(X, r, o) {
  const ax = Math.abs(X);
  if (r > 0.955 || ax > 0.80) return ['cover', 0.7, 5];
  if (r < 0.456 || r > 0.94 || ax > 0.785) return ['steel', 0.55, 6];          // vacuum vessel
  // thermal shield (thin) inside the vacuum
  if (Math.abs(r - 0.475) < 0.004 || Math.abs(r - 0.915) < 0.004 || (Math.abs(ax - 0.765) < 0.004 && r > 0.475 && r < 0.915)) return ['steel', 0.75, 7];
  const inHe = r > 0.50 && r < 0.88 && ax < 0.74;
  if (!inHe) return ['vac', 0.3, 8];
  if (r < 0.508 || r > 0.872 || ax > 0.732) return ['steel', 0.65, 9];         // helium vessel wall
  for (const [xc, hw, r0, r1] of COILS) if (Math.abs(X - xc) < hw && r > r0 && r < r1) {
    const wx = ((X - xc + hw) * 260) % 1, wr = ((r - r0) * 260) % 1;
    return ['coil', wx < 0.18 || wr < 0.18 ? 0.35 : 0.7 + 0.25 * (o.coil || 0), 10];
  }
  return ['he', 0.42, 11];
}
// ---------- camera ----------
// cam = {pos, look, up, f (px focal length)}; returns the basis used by trace() and proj()
SCAN.camera = (pos, look, up, f) => {
  const fz = norm(sub(look, pos)), fx = norm(cross(fz, up)), fy = cross(fx, fz);
  return { o: pos, fx, fy, fz, f };
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
SCAN.vec = { sub, dot, cross, norm };
SCAN.proj = (C, p) => { const r = sub(p, C.o), z = dot(r, C.fz); if (z <= 1e-4) return null; return [W / 2 + C.f * dot(r, C.fx) / z, H / 2 - C.f * dot(r, C.fy) / z, z]; };
// ---------- ray tests ----------
// first entry of the ray into the shell {r0 ≤ r ≤ r1, |X| ≤ L, Y ≥ cut}; returns [t, surface] or null
// surface: 0 outer cylinder, 1 inner cylinder, 2 end cap, 3 cut face
function shell(ox, oy, oz, dx, dy, dz, a, b, r0, r1, L, cut) {
  // outer cylinder interval
  const c1 = oy * oy + oz * oz - r1 * r1, D1 = b * b - 4 * a * c1; if (D1 <= 0 || a < 1e-12) return null;
  const s1 = Math.sqrt(D1); let lo = (-b - s1) / (2 * a), hi = (-b + s1) / (2 * a), surf = 0;
  // X slab
  if (Math.abs(dx) < 1e-9) { if (Math.abs(ox) > L) return null; }
  else { let t0 = (-L - ox) / dx, t1 = (L - ox) / dx; if (t0 > t1) [t0, t1] = [t1, t0]; if (t0 > lo) { lo = t0; surf = 2; } if (t1 < hi) hi = t1; }
  // cutting half-space Y ≥ cut
  if (Math.abs(dy) < 1e-9) { if (oy < cut) return null; }
  else { const tc = (cut - oy) / dy; if (dy > 0) { if (tc > lo) { lo = tc; surf = 3; } } else if (tc < hi) hi = tc; }
  if (lo >= hi) return null;
  // the inner cylinder splits [lo, hi]
  const c0 = oy * oy + oz * oz - r0 * r0, D0 = b * b - 4 * a * c0;
  if (D0 > 0) {
    const s0 = Math.sqrt(D0), a1 = (-b - s0) / (2 * a), a2 = (-b + s0) / (2 * a);
    // allowed: t ≤ a1 or t ≥ a2
    if (lo > a1 && lo < a2) { lo = a2; surf = 1; if (lo >= hi) return null; }
  }
  if (hi <= 1e-4) return null;
  if (lo < 1e-4) return null;                                                  // camera inside: skip
  return [lo, surf];
}
function ellip(ox, oy, oz, dx, dy, dz, cx, cy, cz, rx, ry, rz) {
  const px = (ox - cx) / rx, py = (oy - cy) / ry, pz = (oz - cz) / rz, qx = dx / rx, qy = dy / ry, qz = dz / rz;
  const a = qx * qx + qy * qy + qz * qz, b = 2 * (px * qx + py * qy + pz * qz), c = px * px + py * py + pz * pz - 1, D = b * b - 4 * a * c;
  if (D <= 0) return null; const t = (-b - Math.sqrt(D)) / (2 * a); if (t <= 1e-4) return null;
  const hx = ox + t * dx, hy = oy + t * dy, hz = oz + t * dz;
  return [t, norm([(hx - cx) / (rx * rx), (hy - cy) / (ry * ry), (hz - cz) / (rz * rz)])];
}
function box(ox, oy, oz, dx, dy, dz, b) {
  let lo = -1e9, hi = 1e9, ax = -1, sg = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) { if (o[i] < b[i * 2] || o[i] > b[i * 2 + 1]) return null; continue; }
    let t0 = (b[i * 2] - o[i]) / d[i], t1 = (b[i * 2 + 1] - o[i]) / d[i], s = -1; if (t0 > t1) { [t0, t1] = [t1, t0]; s = 1; }
    if (t0 > lo) { lo = t0; ax = i; sg = s; } if (t1 < hi) hi = t1;
  }
  if (lo >= hi || lo <= 1e-4) return null;
  const n = [0, 0, 0]; n[ax] = sg; return [lo, n];
}
// ---------- the head: sagittal texture in the plane Y = 0, mapped from the film's brain frame ----------
// brain (x, y, z) mm → scanner: X = HX − z/1000 (top of the head toward −X), Z = HZ + y/1000 (face up), Y = x/1000
let HEADTEX = null;
const HT = { fu: 270, fv: 300, cy: -6, cz: -55, vs: 1.25 };                    // y ∈ [−141, 129], z ∈ [−205, 95]
SCAN.headTex = () => {
  if (HEADTEX) return HEADTEX;
  const w = Math.round(HT.fu / HT.vs), h = Math.round(HT.fv / HT.vs), im = VOL.sagittal(2.5, w, h, HT.fu, HT.fv, HT.cy, HT.cz);
  // distance (texels) from the skin surface inward, for the translucent rim
  const D = new Float32Array(w * h); for (let i = 0; i < w * h; i++) D[i] = im[i] < 0 ? 0 : 99;
  for (let pass = 0; pass < 2; pass++) for (let r0 = 0; r0 < h; r0++) { const r = pass ? h - 1 - r0 : r0;
    for (let c0 = 0; c0 < w; c0++) { const c = pass ? w - 1 - c0 : c0, i = r * w + c; if (!D[i]) continue; const s = pass ? 1 : -1;
      let m = D[i]; const rr = r + s, cc = c + s;
      if (rr >= 0 && rr < h) m = Math.min(m, D[rr * w + c] + 1); if (cc >= 0 && cc < w) m = Math.min(m, D[r * w + cc] + 1);
      if (rr >= 0 && rr < h && cc >= 0 && cc < w) m = Math.min(m, D[rr * w + cc] + 1.414); D[i] = m; } }
  HEADTEX = { w, h, im, D }; return HEADTEX;
};
SCAN.headToScanner = (x, y, z) => [GEO.HEAD[0] - z / 1000, x / 1000, GEO.HEAD[2] + y / 1000];
let LASTD = 0;
function headSample(X, Z) {                                                    // T1 at a point of the plane (−1 outside the head)
  const T = SCAN.headTex(), zb = (GEO.HEAD[0] - X) * 1000, yb = (Z - GEO.HEAD[2]) * 1000;
  const c = Math.floor((yb - HT.cy + HT.fu / 2) / HT.vs), r = Math.floor((HT.cz + HT.fv / 2 - zb) / HT.vs);
  if (c < 0 || r < 0 || c >= T.w || r >= T.h) return -1;
  LASTD = T.D[r * T.w + c];
  return T.im[r * T.w + c];
}
SCAN.headSample = headSample;
// ---------- render ----------
// o = {cut: Y of the cutting plane (−1.05 = closed … 0 = half open), t, rf (0..1 RF coil glow), grad (0..1), coil (0..1),
//      head: 0..1 visibility of the head slice, skin: 0..1 translucent skin, body: show patient, room: show floor/wall,
//      x0, y0, x1, y1: screen rectangle to trace (default whole frame), light}
let IDB = null, VB = null, RB = null, SD = null;
SCAN.render = (img, C, o = {}) => {
  ramps();
  const data = img.data, cut = o.cut ?? -1.05, L = GEO.L;
  if (!IDB) { IDB = new Int16Array(W * H); VB = new Float32Array(W * H); RB = new Array(W * H); SD = new Float32Array(W * H); }
  const Lw = norm(o.light || [-0.45, -0.6, 0.65]), amb = 0.22;
  const sx0 = o.x0 ?? 0, sy0 = o.y0 ?? 0, sx1 = o.x1 ?? W, sy1 = o.y1 ?? H;
  const HZ = GEO.HEAD[2], headOn = (o.head ?? 1) > 0;
  for (let py = sy0; py < sy1; py++) for (let px = sx0; px < sx1; px++) {
    const ux = px + 0.5 - W / 2, uy = H / 2 - py - 0.5;
    let dx = C.fz[0] * C.f + C.fx[0] * ux + C.fy[0] * uy, dy = C.fz[1] * C.f + C.fx[1] * ux + C.fy[1] * uy, dz = C.fz[2] * C.f + C.fx[2] * ux + C.fy[2] * uy;
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    const ox = C.o[0], oy = C.o[1], oz = C.o[2];
    let bt = 1e9, id = 0, ramp = null, v = 0, n = null, hit = null;
    const a = dy * dy + dz * dz, b = 2 * (oy * dy + oz * dz);
    // gantry: outer shell, inner shell
    for (const [r0, r1, which] of [[GEO.R_MID, GEO.R_OUT, 1], [GEO.R_BORE, GEO.R_MID, 0]]) {
      const s = shell(ox, oy, oz, dx, dy, dz, a, b, r0, r1, L, cut); if (!s || s[0] >= bt) continue;
      bt = s[0]; const hx = ox + bt * dx, hy = oy + bt * dy, hz = oz + bt * dz, r = Math.hypot(hy, hz);
      if (s[1] === 3) { const m = which ? cutOuter(hx, r, o) : cutInner(hx, r, o); ramp = m[0]; v = m[1]; id = 20 + m[2]; n = [0, -1, 0]; }
      else if (s[1] === 0) { ramp = 'cover'; v = 0.75; id = 2; n = [0, hy / r, hz / r]; }
      else if (s[1] === 1) { ramp = 'liner'; v = 0.8; id = 3; n = [0, -hy / r, -hz / r]; }
      else { ramp = which ? 'cover' : 'liner'; v = 0.8; id = 4; n = [Math.sign(hx), 0, 0]; }
      hit = [hx, hy, hz];
    }
    // table (inside and outside the bore), its pedestal
    if (o.body !== false) {
      for (const [bb, rp, vv, ii] of [[[-0.62, 2.45, -0.25, 0.25, -0.235, -0.185], 'table', 0.7, 30], [[1.15, 2.25, -0.22, 0.22, -1.03, -0.235], 'table', 0.45, 31],
        [[-0.20, 0.10, -0.12, 0.12, -0.185, -0.155], 'pad', 0.6, 32]]) {
        const h_ = box(ox, oy, oz, dx, dy, dz, bb); if (h_ && h_[0] < bt) { bt = h_[0]; ramp = rp; v = vv; id = ii; n = h_[1]; hit = null; }
      }
      // the patient under a blanket: torso, legs, feet
      for (const [cx, cy, cz, rx, ry, rz, ii] of [[0.47, 0, -0.085, 0.34, 0.2, 0.105, 33], [1.25, 0, -0.125, 0.56, 0.155, 0.07, 33], [1.78, 0, -0.07, 0.05, 0.13, 0.09, 33]]) {
        const e = ellip(ox, oy, oz, dx, dy, dz, cx, cy, cz, rx, ry, rz); if (e && e[0] < bt) { bt = e[0]; ramp = 'blanket'; v = 0.75; id = ii; n = e[1]; hit = null; }
      }
      // head coil: a cage of eight rods around the head, cut like the machine
      {
        const Rc = 0.145, cyc = 0, czc = HZ, py0 = oy - cyc, pz0 = oz - czc, cc = py0 * py0 + pz0 * pz0 - Rc * Rc, bb = 2 * (py0 * dy + pz0 * dz), D = bb * bb - 4 * a * cc;
        if (D > 0 && a > 1e-12) {
          const sD = Math.sqrt(D);
          for (const tt of [(-bb - sD) / (2 * a), (-bb + sD) / (2 * a)]) {
            if (tt <= 1e-4 || tt >= bt) continue;
            const hx = ox + tt * dx, hy = oy + tt * dy, hz = oz + tt * dz; if (hx < -0.17 || hx > 0.11 || hy < cut) continue;
            const ph = Math.atan2(hz - czc, hy - cyc), rod = Math.abs(((ph / (2 * Math.PI) * 8 + 8.5) % 1) - 0.5) < 0.09, ring = hx < -0.155 || hx > 0.095;
            if (!rod && !ring) continue;
            bt = tt; ramp = 'cage'; v = 0.8; id = 35; n = [0, (hy - cyc) / Rc, (hz - czc) / Rc]; hit = null; break;
          }
        }
      }
    }
    // the head: the sagittal slice in Y = 0, seen through a translucent skin
    let headV = -1, headD = 0;
    if (headOn && Math.abs(dy) > 1e-6) {
      const th = (0 - oy) / dy;
      if (th > 1e-4 && th < bt) {
        const X = ox + th * dx, Z = oz + th * dz, hv = headSample(X, Z);
        const rv = o.reveal == null ? true : Math.hypot((Z - GEO.HEAD[2]) * 1000 + 3, (GEO.HEAD[0] - X) * 1000 + 10) < o.reveal;
        if (hv >= 0 && rv) { bt = th; headV = hv; headD = LASTD; id = 40; ramp = 'gray'; v = hv; n = null; hit = null; }
      }
    }
    // room
    if (id === 0 && o.room !== false) {
      if (dz < -1e-6) { const tf = (GEO.FLOOR - oz) / dz; if (tf > 0 && tf < bt) { bt = tf; ramp = 'floor'; const fx_ = ox + tf * dx, fy_ = oy + tf * dy; v = 0.5 + 0.12 * (((Math.floor(fx_ * 2) + Math.floor(fy_ * 2)) & 1) ? 1 : -1) - Math.min(0.3, Math.hypot(fx_, fy_) * 0.05); id = 50; n = [0, 0, 1]; } }
      if (id === 0 && dy > 1e-6) { const tw = (2.6 - oy) / dy; if (tw > 0) { const wz = oz + tw * dz; ramp = 'wall'; v = 0.35 + 0.12 * Math.max(0, wz) - (Math.abs(((ox + tw * dx) * 1.2) % 1) < 0.03 ? 0.2 : 0); id = 51; n = [0, -1, 0]; } }
    }
    const p = py * W + px;
    IDB[p] = id; RB[p] = ramp;
    if (!ramp) { VB[p] = -1; continue; }
    if (n) { const lam = Math.max(0, dot(n, Lw)); VB[p] = clamp(amb + 0.85 * lam) * 0.55 + v * 0.55 - 0.1; }
    else VB[p] = v;
    if (headV >= 0) VB[p] = headV;
    if (o.skin > 0 && id === 40) { RB[p] = 'headskin'; SD[p] = headD; }
  }
  // compose: ramps + dither, outlines where ids change, translucent skin over the head
  const skinA = o.skin || 0, sk = RAMP.skin, envA = o.env ?? 1, K0 = hex('k');
  for (let py = sy0; py < sy1; py++) for (let px = sx0; px < sx1; px++) {
    const p = py * W + px, rp = RB[p]; if (!rp) continue;
    const bay = V_BAY(px, py), i4 = p * 4;
    if (envA < 1 && IDB[p] !== 40 && bay >= envA) { data[i4] = K0[0]; data[i4 + 1] = K0[1]; data[i4 + 2] = K0[2]; data[i4 + 3] = 255; continue; }
    let col;
    if (rp === 'headskin') {
      const g = RAMP.gray, f = clamp(VB[p]) * (g.length - 1) + bay - 0.5; col = g[clamp(Math.round(f), 0, g.length - 1)];
      // translucent skin: dense at the silhouette (seen edge-on), thinning to a faint veil over the slice
      const d = SD[p], cov = skinA * (d < 1.5 ? 1 : 0.55 * Math.exp(-(d - 1.5) / 3.5) + 0.05);
      if (bay < cov) col = d < 1.5 ? sk[3] : d < 4 ? sk[2] : sk[1];
    } else {
      const r = RAMP[rp], f = clamp(VB[p]) * (r.length - 1) + bay - 0.5; col = r[clamp(Math.round(f), 0, r.length - 1)];
    }
    // outline: a neighbour belonging to another object (darken this pixel if it is the farther one is not known; keep it simple)
    const id = IDB[p];
    if (px > sx0 && py > sy0 && ((IDB[p - 1] !== id && IDB[p - 1] < id && id < 50) || (IDB[p - W] !== id && IDB[p - W] < id && id < 50)) && id !== 40 && !(id >= 20 && id < 30 && IDB[p - 1] >= 20 && IDB[p - 1] < 30 && IDB[p - W] >= 20 && IDB[p - W] < 30)) col = [col[0] * 0.55, col[1] * 0.55, col[2] * 0.55];
    data[i4] = col[0]; data[i4 + 1] = col[1]; data[i4 + 2] = col[2]; data[i4 + 3] = 255;
  }
  return { IDB };
};
const V_BAY = (x, y) => PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
})();
