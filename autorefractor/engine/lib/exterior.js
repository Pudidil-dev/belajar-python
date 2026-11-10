// EXT — the exterior view (S02, S20): one calm adult at one original, unbranded tabletop autorefractor, in millimetres,
// ray-cast with an orthographic camera and flat band shading (the film's 2.5D look: smooth forms, palette ramps, ordered
// dither at the band edges, one shadow ray).
// World: x = the patient's forward (toward the instrument), y = up, z = toward the patient's right (the camera's side).
// The origin is the apex of the right eye's cornea; the instrument's window axis is the line y = 0, z = 32.
// The patient is seen from behind and to the right (hair, ear, cheek, shoulder): no face, no expression. The chin rests
// on the chin cup, the forehead on the forehead band, the right eye on the window's axis.
// The instrument: an ivory measuring head with a barrel top and a graphite snout (teal ring round the dark window), an
// ivory column on a graphite stage and base, a joystick, the back of the operator's screen; the chinrest frame (two
// chrome posts, forehead band, chin cup). The measuring unit (head, snout, column, screen) can slide by o.unit = [dx, dy,
// dz] — the instrument lining itself up with the eye.
(() => {
const { W, H, P } = PIX;
const EXT = window.EXT = { NAME: 'EXT' };
const clamp = U.clamp, lerp = U.lerp;
const hex = k => PIX.hex(P[k] || k);
const R = {};                                                  // ramps (dark → light), filled at init
const RAMPS = { ivory: ['q2', 'q3', 'q4', 'q5', 'q6', 'w'], ivory2: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'], graph: ['g0', 'g1', 'g2', 'g3', 'g4', 'g5'], graph2: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'],
  chrome: ['g3', 'g5', 'g7', 'g9', 'gb', 'w'], table: ['k', 'n0', 'n1', 'n2', 'n3', 'n4'], skin: ['s0', 's1', 's2', 's2', 's3', 's4'], hair: ['h0', 'h0', 'h1', 'h2', 'h3', 'h3'],
  top: ['j0', 'j0', 'j1', 'j2', 'j3', 'j3'], teal: ['t0', 't1', 't1', 't2', 't3', 't4'], glass: ['k', 'k', 'n0', 'n1', 'n2', 'n4'], sclera: ['x0', 'x0', 'x1', 'x1', 'x2', 'w'],
  iris: ['i0', 'i0', 'i1', 'i1', 'i2', 'i2'], paper: ['pp0', 'pp0', 'pp1', 'pp1', 'pp2', 'w'] };
EXT.init = () => { for (const k in RAMPS) R[k] = RAMPS[k].map(hex); };
// ---------- the scene ----------
// primitives: ['box', x0, x1, y0, y1, z0, z1, mat, fn] · ['ell', cx, cy, cz, rx, ry, rz, mat, fn] · ['cyl', axis (0 x, 1 y), c1, c2, r, a0, a1, mat, fn]
// (a cylinder along x has centre (y, z) = (c1, c2); along y, centre (x, z)). fn(px, py, pz, nx, ny, nz) → material name, or null to
// let the ray through (the hair's edge, the barrel's cut).
EXT.scene = (o = {}) => {
  const [ux, uy, uz] = o.unit || [0, 0, 0], S = [];
  // the table
  S.push(['box', -330, 640, -285, -262, -270, 270, 'table']);
  // the patient
  S.push(['ell', -165, -450, 0, 175, 262, 265, 'top']);
  S.push(['ell', -114, -150, 0, 42, 96, 40, 'skin']);
  S.push(['ell', -98, 18, 0, 98, 112, 76, 'skin']);
  S.push(['ell', -62, -62, 0, 62, 62, 60, 'skin']);
  S.push(['ell', -106, 34, 0, 102, 108, 82, 'hair', (x, y) => 0.9 * y - x > 108 ? 'hair' : null]);
  S.push(['ell', -102, 2, 77, 15, 24, 7, 'skin']);
  S.push(['ell', 10, -28, 0, 20, 26, 15, 'skin']);
  S.push(['ell', -14, 0, 32, 12.5, 12.5, 12.5, 'sclera', (x, y, z, nx) => nx > 0.93 ? 'glass' : nx > 0.74 ? 'iris' : 'sclera']);
  S.push(['ell', -16, 15, 32, 17, 7, 17, 'skin']);                                   // brow / upper lid
  // the chinrest frame: two chrome posts beside the snout, a top bar, the forehead pad on two arms, the chin cup on an arm
  for (const z of [-112, 112]) S.push(['cyl', 1, 54, z, 7, -262, 156, 'chrome']);
  S.push(['box', 46, 62, 144, 158, -112, 112, 'chrome']);
  S.push(['box', -8, 12, 48, 80, -72, 72, 'ivory']);
  for (const z of [-112, 102]) S.push(['box', -8, 60, 58, 72, z, z + 10, 'ivory2']);
  S.push(['box', 46, 62, -144, -130, -112, 112, 'graph2']);
  S.push(['box', 8, 48, -142, -132, -13, 13, 'graph2']);
  S.push(['box', -66, 12, -134, -114, -46, 46, 'ivory']);
  // the instrument: base and stage (fixed), then the measuring unit (moves by ux, uy, uz)
  S.push(['box', 70, 440, -262, -216, -140, 172, 'graph']);
  S.push(['box', 108, 418, -216, -192, -98 + uz, 152 + uz, 'graph2']);
  S.push(['cyl', 1, 392, 118 + uz, 13, -192, -138, 'graph2']);
  S.push(['ell', 392, -124, 118 + uz, 21, 21, 21, 'graph2', (x, y) => y > -110 ? 'teal' : 'graph2']);
  const X0 = 78 + ux, X1 = 404 + ux, Y = uy, Z = 32 + uz;
  S.push(['box', 172 + ux, 366 + ux, -192, -62 + Y, Z - 84, Z + 84, 'ivory2', (x, y, z, nx, ny, nz) => nz > 0.5 && y > -122 + Y && y < -114 + Y && x > 214 + ux && x < 330 + ux ? 'glass' : 'ivory2']);
  S.push(['box', X0, X1, -62 + Y, -20 + Y, Z - 102, Z + 102, 'ivory', (x, y, z, nx, ny, nz) => nz > 0.5 && y < -50 + Y ? 'teal' : 'ivory']);
  S.push(['cyl', 0, -20 + Y, Z, 102, X0, X1, 'ivory', (x, y, z, nx, ny, nz) => {
    if (y < -20 + Y) return null;
    if (nx < -0.5) return Math.hypot(y - Y, z - Z) < 52 ? 'graph2' : 'ivory';       // the front face: a graphite plate round the snout
    if (nz > 0.2 && x > X1 - 96 && x < X1 - 20 && y < 36 + Y && Math.floor((y - Y + 20) / 9) % 2 === 0) return 'graph2';   // vents
    return 'ivory';
  }]);
  S.push(['cyl', 0, Y, Z, 37, 44 + ux, X0 + 1, 'graph2', (x, y, z, nx) => { if (nx > -0.5) return 'graph2'; const r = Math.hypot(y - Y, z - Z); return r < 23 ? 'glass' : r < 28.5 ? 'teal' : 'graph2'; }]);
  S.push(['box', X1 - 2, X1 + 26, -44 + Y, 104 + Y, Z - 98, Z + 98, 'graph']);
  return S;
};
// ---------- the camera: orthographic. cam = {yaw (rad: 0 = pure side view from the patient's right; positive = from
// behind), pitch (rad, looking down), s (px/mm), cx, cy (screen position of the target), tx, ty, tz (target, mm)} ----------
EXT.basis = cam => {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return { f: [sy * cp, -sp, -cy * cp], r: [cy, 0, sy], u: [sy * sp, cp, -cy * sp] };
};
EXT.proj = (cam, x, y, z) => {
  const { r, u } = EXT.basis(cam), dx = x - cam.tx, dy = y - cam.ty, dz = z - cam.tz;
  return [cam.cx + cam.s * (dx * r[0] + dy * r[1] + dz * r[2]), cam.cy - cam.s * (dx * u[0] + dy * u[1] + dz * u[2])];
};
// ---------- ray casting ----------
const hitBox = (o, d, b) => {                                  // returns t (or 0) and sets NRM
  let lo = -1e9, hi = 1e9, ax = -1, sg = 0;
  for (let i = 0; i < 3; i++) {
    const di = d[i], b0 = b[1 + i * 2], b1 = b[2 + i * 2];
    if (Math.abs(di) < 1e-9) { if (o[i] < b0 || o[i] > b1) return 0; continue; }
    let t0 = (b0 - o[i]) / di, t1 = (b1 - o[i]) / di, s = -1;
    if (t0 > t1) { const q = t0; t0 = t1; t1 = q; s = 1; }
    if (t0 > lo) { lo = t0; ax = i; sg = s; } if (t1 < hi) hi = t1;
    if (lo > hi) return 0;
  }
  if (lo <= 1e-3 || ax < 0) return 0;
  NRM[0] = ax === 0 ? sg : 0; NRM[1] = ax === 1 ? sg : 0; NRM[2] = ax === 2 ? sg : 0;
  return lo;
};
const NRM = [0, 0, 0];
const hitEll = (o, d, e, far) => {
  const px = (o[0] - e[1]) / e[4], py = (o[1] - e[2]) / e[5], pz = (o[2] - e[3]) / e[6], qx = d[0] / e[4], qy = d[1] / e[5], qz = d[2] / e[6];
  const a = qx * qx + qy * qy + qz * qz, b = px * qx + py * qy + pz * qz, c = px * px + py * py + pz * pz - 1, D = b * b - a * c;
  if (D <= 0) return 0;
  const t = (-b + (far ? 1 : -1) * Math.sqrt(D)) / a; if (t <= 1e-3) return 0;
  let nx = (px + t * qx) / e[4], ny = (py + t * qy) / e[5], nz = (pz + t * qz) / e[6]; const l = Math.hypot(nx, ny, nz) || 1;
  NRM[0] = nx / l; NRM[1] = ny / l; NRM[2] = nz / l;
  return t;
};
const hitCyl = (o, d, c, far) => {
  const ax = c[1], i1 = ax === 0 ? 1 : 0, i2 = 2, r = c[4];
  const ox = o[i1] - c[2], oz = o[i2] - c[3], dx = d[i1], dz = d[i2], a = dx * dx + dz * dz;
  let lo = -1e9, hi = 1e9, side = true;
  if (a < 1e-12) { if (ox * ox + oz * oz > r * r) return 0; }
  else { const b = ox * dx + oz * dz, cc = ox * ox + oz * oz - r * r, D = b * b - a * cc; if (D <= 0) return 0; const s = Math.sqrt(D); lo = (-b - s) / a; hi = (-b + s) / a; }
  const da = d[ax]; let cap = 0;
  if (Math.abs(da) < 1e-9) { if (o[ax] < c[5] || o[ax] > c[6]) return 0; }
  else { let t0 = (c[5] - o[ax]) / da, t1 = (c[6] - o[ax]) / da, s = -1; if (t0 > t1) { const q = t0; t0 = t1; t1 = q; s = 1; } if (t0 > lo) { lo = t0; cap = s; side = false; } if (t1 < hi) hi = t1; }
  if (lo > hi) return 0;
  const t = far ? hi : lo; if (t <= 1e-3) return 0;
  if (far) { const hx = ox + dx * t, hz = oz + dz * t; NRM[ax] = 0; NRM[i1] = hx / r; NRM[i2] = hz / r; return t; }
  if (!side) { NRM[0] = NRM[1] = NRM[2] = 0; NRM[ax] = cap; return t; }
  const hx = ox + dx * t, hz = oz + dz * t; NRM[ax] = 0; NRM[i1] = hx / r; NRM[i2] = hz / r;
  return t;
};
const cast = (S, o, d, shadow) => {                            // nearest hit: returns index (−1 none); sets HT, HN, HM
  let best = 1e9, bi = -1;
  for (let i = 0; i < S.length; i++) {
    const p = S[i], k = p[0];
    let t = k === 'box' ? hitBox(o, d, p) : k === 'ell' ? hitEll(o, d, p, false) : hitCyl(o, d, p, false);
    if (!t || t >= best) continue;
    let mat = p[7];
    if (p[8]) {
      const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
      mat = p[8](x, y, z, NRM[0], NRM[1], NRM[2]);
      if (mat == null) continue;                                   // let through (the hair's edge, the barrel's cut)
    }
    best = t; bi = i; HN[0] = NRM[0]; HN[1] = NRM[1]; HN[2] = NRM[2]; HM = mat;
    if (shadow) return i;
  }
  HT = best; return bi;
};
let HT = 0, HM = null; const HN = [0, 0, 0];
const LIGHT = (() => { const v = [-0.38, 0.8, 0.5], l = Math.hypot(...v); return v.map(q => q / l); })();
let DEP = null;
// o = {unit, a (0..1 dithered appearance), light (0..1 room light), box: [x0, y0, x1, y1]}
EXT.render = (c, cam, o = {}) => {
  const S = EXT.scene(o), { f, r, u } = EXT.basis(cam), A = o.a ?? 1, lit = o.light ?? 1;
  const [bx0, by0, bx1, by1] = o.box || [0, 0, W, H], w = bx1 - bx0, hgt = by1 - by0;
  const img = c.getImageData(bx0, by0, w, hgt), d = img.data;
  if (!DEP || DEP.length < w * hgt) DEP = new Float32Array(W * H);
  const O = [0, 0, 0], O2 = [0, 0, 0], D2 = LIGHT;
  for (let py = 0; py < hgt; py++) for (let px = 0; px < w; px++) {
    const p = py * w + px; DEP[p] = 1e9;
    const sx = bx0 + px, sy = by0 + py;
    if (A < 1 && K.BAY(sx, sy) > A) continue;
    const a = (sx + 0.5 - cam.cx) / cam.s, b = (cam.cy - sy - 0.5) / cam.s;
    O[0] = cam.tx + r[0] * a + u[0] * b - f[0] * 3000; O[1] = cam.ty + r[1] * a + u[1] * b - f[1] * 3000; O[2] = cam.tz + r[2] * a + u[2] * b - f[2] * 3000;
    const hi = cast(S, O, f, false); if (hi < 0) continue;
    const t = HT, nx = HN[0], ny = HN[1], nz = HN[2], mat = HM;
    DEP[p] = t;
    let lam = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    O2[0] = O[0] + f[0] * t + nx * 0.6; O2[1] = O[1] + f[1] * t + ny * 0.6; O2[2] = O[2] + f[2] * t + nz * 0.6;
    const sh = lam > 0 && cast(S, O2, D2, true) >= 0;
    let v = 0.2 + 0.8 * lam; if (sh) v = 0.2 + 0.22 * lam;
    v *= lit;
    const ramp = R[mat], n = ramp.length, k = clamp(Math.floor(v * (n - 1) + (K.BAY(sx, sy) - 0.5) * 0.7 + 0.5), 0, n - 1), col = ramp[k], i = p * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  // a darker line where a surface sits well behind its left or upper neighbour (keeps ivory apart from ivory)
  for (let py = 1; py < hgt; py++) for (let px = 1; px < w; px++) {
    const p = py * w + px, z = DEP[p]; if (z > 1e8) continue;
    if (z - DEP[p - 1] > 14 || z - DEP[p - w] > 14) { const i = p * 4; d[i] = d[i] * 0.55; d[i + 1] = d[i + 1] * 0.55; d[i + 2] = d[i + 2] * 0.6; }
  }
  c.putImageData(img, bx0, by0);
};
// ---------- the room behind: a dark navy clinic wall with a pool of light, a letter chart, the floor line ----------
EXT.room = (c, cam, light = 1) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  const [fx, fy] = EXT.proj(cam, 0, -285, -700);
  if (light > 0) { K.dith(c, 0, 0, W, Math.round(fy), 'n0', light); c.save(); c.globalAlpha = light; PIX.glow(c, cam.cx + 30 * cam.s, cam.cy - 90 * cam.s, 340 * cam.s, 'n3', 0.9); c.restore(); }
  // the letter chart on the wall (rows of tumbling-E blocks getting smaller), right of the caption band
  const k = cam.s / 0.78, px = cam.cx + 74 * k, py = cam.cy - 262 * k;
  const cw = 84 * k, chh = 104 * k;
  if (light <= 0) return;
  c.save(); c.globalAlpha = light;
  PIX.rect(c, Math.round(px), Math.round(py), Math.round(cw), Math.round(chh), 'n3'); PIX.rect(c, Math.round(px) + 1, Math.round(py) + 1, Math.round(cw) - 2, Math.round(chh) - 2, 'q4');
  let yy = py + 14 * k;
  for (let row = 0; row < 5; row++) {
    const sz = Math.max(1, Math.round((17 - row * 3.2) * k)), n = row + 1, gap = (cw - n * sz) / (n + 1);
    for (let i = 0; i < n; i++) { const x = Math.round(px + gap + i * (sz + gap)), y = Math.round(yy), dir = Math.floor(U.hash(row, i) * 4);
      PIX.rect(c, x, y, sz, sz, 'g3');
      if (sz >= 5) { const b = Math.max(1, Math.round(sz / 5)); for (const q of [1, 3]) { if (dir === 0) PIX.rect(c, x + b, y + q * b, sz - b, b, 'q4'); else if (dir === 1) PIX.rect(c, x, y + q * b, sz - b, b, 'q4'); else if (dir === 2) PIX.rect(c, x + q * b, y + b, b, sz - b, 'q4'); else PIX.rect(c, x + q * b, y, b, sz - b, 'q4'); } }
    }
    yy += sz + 5 * k;
  }
  c.restore();
  K.dith(c, 0, Math.round(fy), W, 1, 'n2', light);
};
})();
