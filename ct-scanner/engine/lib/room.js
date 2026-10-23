// ROOM — the CT suite, ray-cast per pixel: the gantry (a white ring on a base, 70 cm bore), its rotating frame with
// the X-ray tube, filter/collimator, high-voltage generator, curved detector arc, data electronics and cooling, the
// patient table with the patient under a blanket, and next door the control room: desk, keyboard, the portrait
// workstation monitor (its screen shows a texture: the 3D skull) and the lead-glass window between the rooms.
// World frame (mm, right-handed): X = patient's right (seen from the feet: screen left), Y up, Z along the bore toward
// the back of the gantry (the patient's head goes in first, so +Z is superior). Isocentre at the origin; floor at
// Y = −1050. HEAD (x left, y anterior, z superior) → world (−x, y + HY, z + HZ + table travel).
// Flat-shaded with palette ramps and ordered dither, outlined where objects meet. The gantry cover and the patient can
// turn see-through (dithered), revealing the rotating frame; the frame turns about Z by `spin`.
(() => {
const { W, H, P } = PIX;
const ROOM = window.ROOM = { NAME: 'ROOM' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const hex = h => PIX.hex(P[h] || h);
const G = ROOM.G = {
  FLOOR: -1050, R_BORE: 350, R_OUT: 1000, ZF: -390, ZB: 390,                  // gantry cover
  HY: 0, HZ: -CT_Z(),                                                          // the head's slice level sits in the scan plane
  TOP: -128,                                                                   // table top (under the head)
  WALL_X: 2600, WIN: [-250, 620, -2500, -700],                                  // control-room wall at X = +2600, window (y0, y1, z0, z1)
  DESK: [3150, 3700, -1050, -330, -2350, -1050],                                // desk box (x0, x1, y0, y1, z0, z1)
  MON: { x: 3300, y: -330, z: -1700, w: 330, h: 560, t: 40 },                   // monitor: screen centre x, bottom y, z; size; thickness
};
function CT_Z() { return (window.CT && CT.Z) || 20; }
// ---------- camera ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
ROOM.vec = { sub, dot, cross, norm };
ROOM.camera = (pos, look, up = [0, 1, 0], f = 300, roll = 0) => {
  const fz = norm(sub(look, pos)); let fx = norm(cross(fz, up)), fy = cross(fx, fz);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); [fx, fy] = [fx.map((v, i) => v * c + fy[i] * s), fy.map((v, i) => -fx[i] * s + v * c)]; }
  return { o: pos, fx, fy, fz, f };
};
// camera from a target, distance, azimuth (0: looking +Z from the front, π/2: looking −X from the patient's right side... ),
// elevation and roll
ROOM.orbit = (T, dist, az, el, f = 300, roll = 0) => {
  const dir = [-Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)];        // forward
  const pos = [T[0] - dir[0] * dist, T[1] - dir[1] * dist, T[2] - dir[2] * dist];
  return ROOM.camera(pos, T, [0, 1, 0], f, roll);
};
ROOM.proj = (C, p) => { const r = sub(p, C.o), z = dot(r, C.fz); if (z <= 1) return null; return [W / 2 + C.f * dot(r, C.fx) / z, H / 2 - C.f * dot(r, C.fy) / z, z]; };
// ---------- ray tests (return [t, nx, ny, nz] or null) ----------
const EPS = 1e-3;
function box(o, d, b) {             // b = [x0, x1, y0, y1, z0, z1]
  let lo = -1e9, hi = 1e9, ax = -1, sg = 0;
  for (let i = 0; i < 3; i++) {
    const oi = o[i], di = d[i], b0 = b[i * 2], b1 = b[i * 2 + 1];
    if (Math.abs(di) < 1e-12) { if (oi < b0 || oi > b1) return null; continue; }
    let t0 = (b0 - oi) / di, t1 = (b1 - oi) / di, s = -1; if (t0 > t1) { const q = t0; t0 = t1; t1 = q; s = 1; }
    if (t0 > lo) { lo = t0; ax = i; sg = s; } if (t1 < hi) hi = t1;
    if (lo > hi) return null;
  }
  if (lo <= EPS || ax < 0) return null;
  return [lo, ax === 0 ? sg : 0, ax === 1 ? sg : 0, ax === 2 ? sg : 0, hi];
}
// interval of a ray inside the infinite cylinder (axis Z through (cx, cy), radius r): [t0, t1] or null
function cylZi(o, d, cx, cy, r) {
  const ox = o[0] - cx, oy = o[1] - cy, a = d[0] * d[0] + d[1] * d[1];
  if (a < 1e-12) return ox * ox + oy * oy < r * r ? [-1e9, 1e9] : null;
  const b = ox * d[0] + oy * d[1], c = ox * ox + oy * oy - r * r, D = b * b - a * c;
  if (D <= 0) return null; const s = Math.sqrt(D); return [(-b - s) / a, (-b + s) / a];
}
// solid cylinder along Z, capped at z0, z1
function cylZ(o, d, cx, cy, r, z0, z1) {
  const iv = cylZi(o, d, cx, cy, r); if (!iv) return null;
  let lo = iv[0], hi = iv[1], cap = 0;
  if (Math.abs(d[2]) < 1e-12) { if (o[2] < z0 || o[2] > z1) return null; }
  else { let a = (z0 - o[2]) / d[2], b = (z1 - o[2]) / d[2], s = -1; if (a > b) { const q = a; a = b; b = q; s = 1; } if (a > lo) { lo = a; cap = s; } if (b < hi) hi = b; }
  if (lo > hi || lo <= EPS) return null;
  if (cap) return [lo, 0, 0, cap, hi];
  const hx = o[0] + d[0] * lo - cx, hy = o[1] + d[1] * lo - cy, l = Math.hypot(hx, hy) || 1;
  return [lo, hx / l, hy / l, 0, hi];
}
// annular cylinder (r0 < r < r1) along Z between z0 and z1
function annZ(o, d, cx, cy, r0, r1, z0, z1) {
  const out = cylZ(o, d, cx, cy, r1, z0, z1); if (!out) return null;
  const inn = cylZi(o, d, cx, cy, r0);
  if (!inn) return out;
  const t = out[0];
  if (t > inn[0] && t < inn[1]) {                       // entry point inside the hole: the next surface is the hole's wall
    const t2 = inn[1]; if (t2 >= out[4]) return null;
    const hx = o[0] + d[0] * t2 - cx, hy = o[1] + d[1] * t2 - cy, l = Math.hypot(hx, hy) || 1;
    return [t2, -hx / l, -hy / l, 0, out[4]];
  }
  return out;
}
// box with a cylindrical hole along Z
function boxHole(o, d, b, cx, cy, r) {
  const h = box(o, d, b); if (!h) return null;
  const inn = cylZi(o, d, cx, cy, r);
  if (!inn) return h;
  if (h[0] > inn[0] && h[0] < inn[1]) {
    const t2 = inn[1]; if (t2 >= h[4]) return null;
    const hx = o[0] + d[0] * t2 - cx, hy = o[1] + d[1] * t2 - cy, l = Math.hypot(hx, hy) || 1;
    return [t2, -hx / l, -hy / l, 0, h[4]];
  }
  return h;
}
function ell(o, d, c, r) {
  const px = (o[0] - c[0]) / r[0], py = (o[1] - c[1]) / r[1], pz = (o[2] - c[2]) / r[2], qx = d[0] / r[0], qy = d[1] / r[1], qz = d[2] / r[2];
  const a = qx * qx + qy * qy + qz * qz, b = px * qx + py * qy + pz * qz, cc = px * px + py * py + pz * pz - 1, D = b * b - a * cc;
  if (D <= 0) return null; const t = (-b - Math.sqrt(D)) / a; if (t <= EPS) return null;
  const hx = o[0] + t * d[0] - c[0], hy = o[1] + t * d[1] - c[1], hz = o[2] + t * d[2] - c[2];
  const n = norm([hx / (r[0] * r[0]), hy / (r[1] * r[1]), hz / (r[2] * r[2])]);
  return [t, n[0], n[1], n[2]];
}
// ring sector round (cx, cy): r0 < r < r1, angle (atan2(x, −y) from straight down, radians) within ±half, z0 < z < z1
function sector(o, d, cx, cy, r0, r1, half, z0, z1) {
  const out = annZ(o, d, cx, cy, r0, r1, z0, z1); if (!out) return null;
  const tryT = t => { const x = o[0] + d[0] * t - cx, y = o[1] + d[1] * t - cy, z = o[2] + d[2] * t; const a = Math.atan2(x, -y); return Math.abs(a) <= half && z >= z0 - 0.5 && z <= z1 + 0.5; };
  if (tryT(out[0])) return out;
  // the entry may be outside the angular range: test the side planes of the sector
  let best = null;
  for (const s of [-1, 1]) {
    const a = s * half, nx = Math.cos(a), ny = Math.sin(a);                     // plane through the axis at angle a (normal across it)
    const dn = d[0] * nx + d[1] * ny; if (Math.abs(dn) < 1e-9) continue;
    const t = -((o[0] - cx) * nx + (o[1] - cy) * ny) / dn; if (t <= EPS || (best && t >= best[0])) continue;
    const x = o[0] + d[0] * t - cx, y = o[1] + d[1] * t - cy, z = o[2] + d[2] * t, r = Math.hypot(x, y);
    if (r < r0 || r > r1 || z < z0 || z > z1 || Math.abs(Math.atan2(x, -y) - a) > 0.01) continue;
    best = [t, -s * nx, -s * ny, 0];
  }
  return best;
}
// ---------- the rotating frame (local coordinates: tube at the top, angle 0) ----------
// [id, kind, params...]; the detector arc is a sector of radius SDD round the focal spot
const FS = 570;                                                                 // focal spot radius
const FRAME = [
  [20, 'ann', 0, 0, 640, 900, -70, 70],                                          // the rotating disc (drum)
  [21, 'cyl', 0, FS + 40, 92, -178, 178],                                         // X-ray tube housing (axis along Z)
  [22, 'box', -70, 70, FS - 122, FS - 52, -95, 95],                              // filter + bowtie + collimator assembly
  [23, 'box', 470, 760, 300, 620, -200, 200],                                     // high-voltage generator (on the frame, beside the tube)
  [24, 'sec', 0, FS, 1040, 1100, 26.5 * Math.PI / 180, -46, 46],                 // detector arc (curved round the focal spot)
  [25, 'box', -330, 330, -700, -560, -120, 120],                                  // data acquisition electronics (DAS) behind it
  [26, 'box', -760, -470, 280, 600, -180, 180],                                   // cooling unit (oil–air heat exchanger)
  [27, 'cyl', -260, FS + 120, 26, -180, 120],                                      // HV cable (anode side)
  [28, 'box', -520, -380, -560, -380, -90, 90],                                   // counterweight
];
ROOM.FRAME = FRAME;
const rotLocal = (o, d, phi) => { const c = Math.cos(-phi), s = Math.sin(-phi); return [[o[0] * c - o[1] * s, o[0] * s + o[1] * c, o[2]], [d[0] * c - d[1] * s, d[0] * s + d[1] * c, d[2]]]; };
// world X is the patient's right; the frame's local x is screen-right as seen from the feet, i.e. world −X. So local → world: X = −x.
function frameHit(o, d, phi, best) {
  // into local: mirror X, then rotate by −phi (clockwise spin as seen from the feet)
  const om = [-o[0], o[1], o[2]], dm = [-d[0], d[1], d[2]];
  const [ol, dl] = rotLocal(om, dm, -phi);
  for (const f of FRAME) {
    let h = null;
    if (f[1] === 'ann') h = annZ(ol, dl, f[2], f[3], f[4], f[5], f[6], f[7]);
    else if (f[1] === 'cyl') h = cylZ(ol, dl, f[2], f[3], f[4], f[5], f[6]);
    else if (f[1] === 'box') h = box(ol, dl, [f[2], f[3], f[4], f[5], f[6], f[7]]);
    else if (f[1] === 'sec') h = sector(ol, dl, f[2], f[3], f[4], f[5], f[6], f[7], f[8]);
    if (!h || h[0] >= best.t) continue;
    // normal back to world: rotate by +phi... (local was rotated by −(−phi)), then mirror X
    const c = Math.cos(-phi), s = Math.sin(-phi), nx = h[1] * c + h[2] * s, ny = -h[1] * s + h[2] * c;
    best.t = h[0]; best.id = f[0]; best.n = [-nx, ny, h[3]];
    best.loc = [ol[0] + dl[0] * h[0], ol[1] + dl[1] * h[0], ol[2] + dl[2] * h[0]];
  }
}
// ---------- the patient ----------
const bodyParts = tz => [
  [10, [0, -20, -560 + tz], [205, 115, 330]],                                    // torso under the blanket
  [10, [0, -55, -1300 + tz], [170, 75, 470]],                                    // legs
  [10, [0, -15, -1760 + tz], [140, 95, 55]],                                     // feet
  [10, [0, 10, -330 + tz], [215, 75, 95]],                                       // shoulders
];
// ---------- materials ----------
let MAT = null;
const mats = () => MAT || (MAT = {
  1: ['floor', ['k', 'n0', 'n1', 'n2', 'n3']], 2: ['wall', ['k', 'g0', 'g1', 'g2', 'g3']], 3: ['frame', ['g2', 'g3', 'g4', 'g5', 'g6', 'g7']],
  4: ['cover', ['g3', 'g5', 'g7', 'g8', 'g9', 'ga', 'gb', 'w']], 5: ['face', ['g4', 'g6', 'g8', 'g9', 'ga', 'gb', 'w']], 6: ['bore', ['g2', 'g4', 'g6', 'g7', 'g8', 'g9']],
  7: ['led', ['c1', 'c2', 'c3', 'c4']], 8: ['table', ['g2', 'g3', 'g4', 'g5', 'g6']], 9: ['base', ['g1', 'g2', 'g3', 'g4', 'g5']],
  10: ['blanket', ['h0', 'h1', 'h2', 'h3']], 11: ['skin', ['s0', 's1', 's2', 's3', 's4']], 12: ['desk', ['g0', 'g1', 'g2', 'g3', 'g4']],
  13: ['monitor', ['k', 'g0', 'g1', 'g2', 'g3']], 15: ['keys', ['g1', 'g2', 'g3', 'g4']], 16: ['panel', ['k', 'g1', 'g2', 'c1']],
  20: ['drum', ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']], 21: ['tube', ['g3', 'g5', 'g6', 'g7', 'g8', 'g9']], 22: ['coll', ['g2', 'g3', 'g4', 'g5', 'g6']],
  23: ['hv', ['u0', 'u1', 'u2', 'u3']], 24: ['det', ['e0', 'e1', 'e2', 'e3']], 25: ['das', ['c0', 'c1', 'c2']], 26: ['cool', ['g1', 'g2', 'g3', 'g4']],
  27: ['cable', ['u0', 'u1', 'u2']], 28: ['weight', ['g1', 'g2', 'g3']], 30: ['pillar', ['g2', 'g3', 'g4', 'g5', 'g6', 'g7']],
});
ROOM.mats = mats;
let RAMP = null;
const ramps = () => { if (RAMP) return RAMP; RAMP = {}; const M = mats(); for (const k in M) RAMP[k] = M[k][1].map(hex); return RAMP; };
const BAY = (x, y) => PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
// ---------- render ----------
// o = {t, cover (1 opaque … 0 gone), body (1 … 0), spin (frame angle, rad), tz (table travel: 0 = head at the isocentre,
//      negative = out toward the feet), screen ({w, h, data} texture for the monitor), room (draw walls/floor/desk),
//      led (0..1), x0, y0, x1, y1 (screen rect), hideIds (Set), light}
let IDB = null, VB = null, TB = null, NB = null;
ROOM.render = (img, C, o = {}) => {
  const R = ramps(), data = img.data, x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, x1 = o.x1 ?? W, y1 = o.y1 ?? H;
  if (!IDB) { IDB = new Int16Array(W * H); VB = new Float32Array(W * H); TB = new Float32Array(W * H); }
  const cover = o.cover ?? 1, bodyA = o.body ?? 1, phi = o.spin || 0, tz = o.tz ?? 0, showRoom = o.room !== false;
  const L = norm(o.light || [-0.35, 0.8, -0.45]), amb = 0.3;
  const parts = bodyParts(tz), hz = G.HZ + tz;
  const showFrame = cover < 1 || o.frame;
  const scr = o.screen, M = G.MON;
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
    const ux = px + 0.5 - W / 2, uy = H / 2 - py - 0.5;
    let d = [C.fz[0] * C.f + C.fx[0] * ux + C.fy[0] * uy, C.fz[1] * C.f + C.fx[1] * ux + C.fy[1] * uy, C.fz[2] * C.f + C.fx[2] * ux + C.fy[2] * uy];
    d = norm(d);
    const ob = C.o, bay = BAY(px, py);
    const skipCover = cover < 1 && bay > cover, skipBody = bodyA < 1 && bay > bodyA;
    const best = { t: 1e12, id: 0, n: null, v: 0.6, tex: null };
    const hit = (h, id) => { if (h && h[0] < best.t) { best.t = h[0]; best.id = id; best.n = [h[1], h[2], h[3]]; } };
    // gantry cover: a ring on a base, minus the bore
    if (!skipCover) {
      hit(annZ(ob, d, 0, 0, G.R_BORE, G.R_OUT, G.ZF, G.ZB), 4);
      hit(boxHole(ob, d, [-G.R_OUT + 40, G.R_OUT - 40, G.FLOOR, 0, G.ZF + 30, G.ZB - 30], 0, 0, G.R_BORE), 4);
      if (best.id === 4 && best.n[2] !== 0) {                                   // front/back faces: the face material + LED ring
        const hx = ob[0] + d[0] * best.t, hy = ob[1] + d[1] * best.t, r = Math.hypot(hx, hy);
        best.id = r < G.R_BORE + 70 ? (r < G.R_BORE + 14 && (o.led ?? 1) > 0 ? 7 : 5) : 4;
        if (r > 820 && hy > 0 && Math.abs(hx) < 260 && best.n[2] < 0) best.id = 5;
      }
      if (best.id === 4 && Math.abs(best.n[2]) < 0.5 && best.n[0] * 0 === 0) {
        const hx = ob[0] + d[0] * best.t, hy = ob[1] + d[1] * best.t;
        if (Math.hypot(hx, hy) < G.R_BORE + 5) best.id = 6;                    // the bore liner
      }
      // control panel on the front face (upper right as seen from the feet)
      hit(box(ob, d, [-560, -360, 360, 520, G.ZF - 14, G.ZF]), 16);
    }
    if (showFrame) frameHit(ob, d, phi, best);
    if (showFrame) hit(annZ(ob, d, 0, 0, 915, 975, -230, 230), 30);              // stationary frame and slip ring
    // table: the sliding top, the pedestal
    hit(box(ob, d, [-235, 235, G.TOP - 45, G.TOP, -2300 + tz, 520 + tz]), 8);
    hit(box(ob, d, [-180, 180, G.FLOOR, -560, -2150, -1000]), 9);
    hit(box(ob, d, [-150, 150, -560, G.TOP - 45, -2050, -1150]), 9);
    // the patient
    if (!skipBody) {
      for (const [id, c, r] of parts) hit(ell(ob, d, c, r), id);
      // the head and neck: sphere-traced through HEAD's skin
      const hb = box(ob, d, [-100, 100, -125, 140, hz - 230, hz + 120]);
      if (hb && hb[0] < best.t) {
        let t = hb[0], ok = false;
        for (let k = 0; k < 60 && t < Math.min(hb[4], best.t); k++) {
          const X = ob[0] + d[0] * t, Y = ob[1] + d[1] * t, Z = ob[2] + d[2] * t;
          const sd = HEAD.skinSD(-X, Y - G.HY, Z - hz);
          if (sd < 0.4) { ok = true; break; }
          t += Math.max(0.5, sd * 0.8);
        }
        if (ok && t < best.t) {
          const X = ob[0] + d[0] * t, Y = ob[1] + d[1] * t, Z = ob[2] + d[2] * t, e = 1.2, f = (a, b, c) => HEAD.skinSD(-a, b - G.HY, c - hz);
          const n = norm([f(X + e, Y, Z) - f(X - e, Y, Z), f(X, Y + e, Z) - f(X, Y - e, Z), f(X, Y, Z + e) - f(X, Y, Z - e)]);
          best.t = t; best.id = 11; best.n = n;
        }
      }
    }
    if (showRoom) {
      // control room: the wall with its window, desk, keyboard, monitor
      if (Math.abs(d[0]) > 1e-9) {
        const tw = (G.WALL_X - ob[0]) / d[0];
        if (tw > EPS && tw < best.t) {
          const Y = ob[1] + d[1] * tw, Z = ob[2] + d[2] * tw, [wy0, wy1, wz0, wz1] = G.WIN;
          const inWin = Y > wy0 && Y < wy1 && Z > wz0 && Z < wz1;
          if (!inWin) { best.t = tw; best.id = (Y > wy0 - 40 && Y < wy1 + 40 && Z > wz0 - 40 && Z < wz1 + 40) ? 3 : 2; best.n = [-Math.sign(d[0]) || -1, 0, 0]; }
        }
      }
      hit(box(ob, d, [G.WALL_X, G.WALL_X + 160, G.WIN[0] - 40, G.WIN[0], G.WIN[2], G.WIN[3]]), 3);     // window sill
      hit(box(ob, d, G.DESK), 12);
      hit(box(ob, d, [G.DESK[0] + 40, G.DESK[0] + 210, G.DESK[3], G.DESK[3] + 22, -1960, -1440]), 15);   // keyboard
      hit(box(ob, d, [M.x + 10, M.x + 70, M.y, M.y + 140, M.z - 30, M.z + 30]), 13);                     // stand
      hit(box(ob, d, [M.x + 0, M.x + 110, M.y - 10, M.y + 10, M.z - 110, M.z + 110]), 13);              // foot
      const mh = box(ob, d, [M.x - M.t, M.x, M.y + 120, M.y + 120 + M.h + 30, M.z - M.w / 2 - 15, M.z + M.w / 2 + 15]);
      if (mh && mh[0] < best.t) {
        best.t = mh[0]; best.id = 13; best.n = [mh[1], mh[2], mh[3]]; best.tex = null;
        if (mh[1] < 0) {                                                        // the screen faces −X (the operator)
          const Y = ob[1] + d[1] * mh[0], Z = ob[2] + d[2] * mh[0];
          const u = (Z - (M.z - M.w / 2)) / M.w, v = 1 - (Y - (M.y + 135)) / M.h;
          if (u >= 0 && u < 1 && v >= 0 && v < 1) { best.id = 14; best.tex = [u, v]; }
        }
      }
      // floor
      if (d[1] < -1e-9) { const tf = (G.FLOOR - ob[1]) / d[1]; if (tf > EPS && tf < best.t) { best.t = tf; best.id = 1; best.n = [0, 1, 0]; } }
      // back wall of the scan room and the far wall of the control room
      if (best.id === 0 && Math.abs(d[2]) > 1e-9) { const tb = (2300 - ob[2]) / d[2]; if (tb > EPS) { best.t = tb; best.id = 2; best.n = [0, 0, -1]; } }
      if (best.id === 0 && d[0] > 1e-9) { const tb = (4200 - ob[0]) / d[0]; if (tb > EPS) { best.t = tb; best.id = 2; best.n = [-1, 0, 0]; } }
      if (best.id === 0 && d[0] < -1e-9) { const tb = (-2800 - ob[0]) / d[0]; if (tb > EPS) { best.t = tb; best.id = 2; best.n = [1, 0, 0]; } }
    }
    const p = py * W + px;
    IDB[p] = best.id; TB[p] = best.t;
    if (!best.id) { VB[p] = -1; continue; }
    let v;
    if (best.id === 14) {
      // the monitor screen: a texture (nearest texel; the scene supplies a pre-filtered one when far away)
      if (scr) { const tx = Math.min(scr.w - 1, Math.floor(best.tex[0] * scr.w)), ty = Math.min(scr.h - 1, Math.floor(best.tex[1] * scr.h)), q = (ty * scr.w + tx) * 4;
        data[p * 4] = scr.data[q]; data[p * 4 + 1] = scr.data[q + 1]; data[p * 4 + 2] = scr.data[q + 2]; data[p * 4 + 3] = 255; }
      else { const c = hex('n1'); data[p * 4] = c[0]; data[p * 4 + 1] = c[1]; data[p * 4 + 2] = c[2]; data[p * 4 + 3] = 255; }
      VB[p] = -2; continue;
    }
    const n = best.n, lam = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    v = amb + 0.75 * lam;
    if (best.id === 1) {                                                         // floor tiles, darker far away
      const X = ob[0] + d[0] * best.t, Z = ob[2] + d[2] * best.t;
      v = 0.55 + 0.1 * (((Math.floor(X / 600) + Math.floor(Z / 600)) & 1) ? 1 : -1) - Math.min(0.35, Math.hypot(X, Z) / 9000);
    }
    if (best.id === 2) { const Y = ob[1] + d[1] * best.t; v = 0.45 + 0.1 * clamp((Y + 600) / 2000); }
    if (best.id === 7) v = 0.55 + 0.45 * (o.led ?? 1);
    VB[p] = v;
  }
  // compose with outlines
  const K0 = hex('k');
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
    const p = py * W + px, id = IDB[p]; if (!id || VB[p] === -2) continue;
    const r = R[id] || R[4], f = clamp(VB[p]) * (r.length - 1) + BAY(px, py) - 0.5;
    let col = r[clamp(Math.round(f), 0, r.length - 1)];
    // outline where two objects meet (the farther one's edge darkens), and depth breaks within an object
    if (px > x0 && py > y0) {
      const l = p - 1, u = p - W;
      const edge = (q) => IDB[q] !== id ? (TB[q] < TB[p] || !IDB[q]) : Math.abs(TB[q] - TB[p]) > 0.06 * TB[p];
      if (edge(l) || edge(u)) col = id === 7 ? col : [col[0] * 0.5, col[1] * 0.5, col[2] * 0.5];
    }
    const i4 = p * 4; data[i4] = col[0]; data[i4 + 1] = col[1]; data[i4 + 2] = col[2]; data[i4 + 3] = 255;
  }
  return { IDB, TB };
};
ROOM.init = async () => { ramps(); G.HZ = -CT.Z; };
})();
