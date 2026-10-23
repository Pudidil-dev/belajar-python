// HEAD — the film's one patient: a procedural adult head in millimetres. Everything in the film that shows anatomy
// comes from here: the bone-white 3D voxel skull, every axial CT section, the projections p = ∫μ dl, the sinogram, the
// filtered-backprojection reconstruction, and the illustrated cross-section the photons cross.
// Frame: x = patient's left (+), y = anterior (+), z = superior (+); origin near the centre of the braincase.
//
// The skull is a signed-distance model (negative inside bone): a braincase (vault + base + posterior-fossa lobes, minus
// the cranial cavity), the face (maxilla, nasal bones, zygomatic bones and arches), orbits, nasal cavity with septum and
// turbinates, sinuses, ear canals, the foramen magnum, a mandible (body, rami, condyles, coronoids), two rows of teeth and
// the upper cervical spine. The soft tissue (scalp, face, nose, lips, ears, neck), the brain (cortex, white matter,
// sulci, ventricles, deep nuclei, falx, cerebellum), the eyes and the airway are labelled around it.
// Each point gets a CT number (HU); the attenuation coefficient at the beam's effective energy (≈ 70 keV) follows from
// it: μ = μ_water (1 + HU/1000), μ_water = 0.193 /cm.
(() => {
const A = globalThis.HEAD = {};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
A.MU_W = 0.193;                                   // /cm at ≈ 70 keV
A.muOf = hu => Math.max(0, A.MU_W * (1 + hu / 1000));

// ---------- seeded 3D value-gradient noise (improved Perlin), roughly −0.9..0.9 ----------
const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; let s = 20261023;
  for (let i = 255; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const GX = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0], GY = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1], GZ = [0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1];
const fd = t => t * t * t * (t * (t * 6 - 15) + 10);
const gr = (h, x, y, z) => { h %= 12; return GX[h] * x + GY[h] * y + GZ[h] * z; };
const noise = A.noise = (x, y, z) => {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), xi = X & 255, yi = Y & 255, zi = Z & 255;
  x -= X; y -= Y; z -= Z; const u = fd(x), v = fd(y), w = fd(z);
  const a = perm[xi] + yi, aa = perm[a] + zi, ab = perm[a + 1] + zi, b = perm[xi + 1] + yi, ba = perm[b] + zi, bb = perm[b + 1] + zi;
  return lerp(lerp(lerp(gr(perm[aa], x, y, z), gr(perm[ba], x - 1, y, z), u), lerp(gr(perm[ab], x, y - 1, z), gr(perm[bb], x - 1, y - 1, z), u), v),
    lerp(lerp(gr(perm[aa + 1], x, y, z - 1), gr(perm[ba + 1], x - 1, y, z - 1), u), lerp(gr(perm[ab + 1], x, y - 1, z - 1), gr(perm[bb + 1], x - 1, y - 1, z - 1), u), v), w);
};

// ---------- signed-distance helpers (mm, negative inside) ----------
const sdE = (x, y, z, rx, ry, rz) => {                          // ellipsoid at the origin (Quilez's bound)
  const k0 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  if (k0 < 1e-6) return -Math.min(rx, ry, rz);
  const k1 = Math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
  return k0 * (k0 - 1) / k1;
};
const sdSeg = (px, py, pz, ax, ay, az, bx, by, bz) => {          // distance to a segment
  const dx = bx - ax, dy = by - ay, dz = bz - az, t = clamp(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / (dx * dx + dy * dy + dz * dz));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy, pz - az - t * dz);
};
const sdBox = (x, y, z, bx, by, bz, r = 0) => {                  // rounded box at the origin (half sizes)
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
A.sd = { sdE, sdSeg, sdBox, smin, smax };

// ---------- the dental arches: parabolas in (x, y), tabulated by arc length from the midline ----------
const arch = (y0, k, xmax) => {
  const pts = [[0, y0, 0]];
  for (let i = 1; i <= 200; i++) { const x = xmax * i / 200, y = y0 - k * x * x, [px, py, ps] = pts[i - 1]; pts.push([x, y, ps + Math.hypot(x - px, y - py)]); }
  return pts;
};
const UPPER = arch(88, 0.046, 30), LOWER = arch(86, 0.050, 29);
// nearest point of an arch (mirrored for x < 0): returns [distance in (x, y), arc length s, signed normal offset (+ outside)]
const archNear = (P, x, y) => {
  const ax = Math.abs(x); let best = 1e9, bi = 0;
  for (let i = 0; i < P.length; i += 4) { const d = (P[i][0] - ax) ** 2 + (P[i][1] - y) ** 2; if (d < best) { best = d; bi = i; } }
  for (let i = Math.max(0, bi - 4); i <= Math.min(P.length - 1, bi + 4); i++) { const d = (P[i][0] - ax) ** 2 + (P[i][1] - y) ** 2; if (d < best) { best = d; bi = i; } }
  const p = P[bi], q = P[Math.min(P.length - 1, bi + 1)], o = P[Math.max(0, bi - 1)], tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
  const nx = ty / tl, ny = -tx / tl;                                   // outward normal (away from the mouth)
  const off = (ax - p[0]) * nx + (y - p[1]) * ny;
  return [Math.sqrt(best), p[2], off];
};
// teeth along each arch: [arc-length centre, width, depth (labio-lingual)] — incisors, lateral incisors, canine, two premolars, two molars
const TEETH_U = [[4.3, 8.4, 6.5], [11.8, 6.6, 6], [18.8, 7.6, 7.5], [25.9, 7, 8.5], [32.9, 6.8, 8.5], [41.6, 10.2, 10], [51.6, 9.4, 10]];
const TEETH_L = [[2.8, 5.4, 6], [8.6, 6, 6], [15.2, 7, 7.2], [22.4, 7.2, 7.8], [29.6, 7.2, 8], [38.6, 11, 10], [49.4, 10.4, 10]];
const toothSD = (x, y, z, P, T, z0, z1, gum) => {               // crowns between z0 (biting edge) and z1 (gum line)
  if (z < Math.min(z0, z1) - 3 || z > Math.max(z0, z1) + 3) return 9;
  const [d, s, off] = archNear(P, x, y);
  if (d > 9) return 9;
  let best = 9;
  for (const [sc, w, dp] of T) {
    const ds = s - sc; if (Math.abs(ds) > w) continue;
    const zc = (z0 + z1) / 2, hz = Math.abs(z1 - z0) / 2;
    // a crown: rounded box in (along the arch, across it, up); narrower toward the biting edge for the front teeth
    const taper = sc < 20 ? 1 - 0.35 * clamp((z - z1) / (z0 - z1)) : 1;
    const q = sdBox(ds, off + 1.2, z - zc, w / 2 * 0.94 * taper, dp / 2, hz, 1.4);
    if (q < best) best = q;
  }
  return best;
};

// ---------- the skull ----------
// cranial cavity (negative inside): vault interior above the fossa floors, middle fossae, posterior fossa
const cavitySD = (x, y, z) => {
  const ax = Math.abs(x);
  const front = clamp((y - 20) / 50), sx = 1 - 0.08 * front;            // the frontal region is a little narrower
  let d = sdE(x / sx, y + 4, z - 16, 63, 85, 66);
  d = smin(d, sdE(x, y - 30, z - 5, 55, 49, 43), 10);                   // frontal lobes: a broad, flatter forehead
  // fossa floors: anterior fossa (above the orbits) at z ≈ −6, middle at ≈ −22, posterior handled by its lobe
  const zf = lerp(-22, -6, ss(18, 34, y));
  d = smax(d, zf - z, 6);
  d = smin(d, sdE(ax - 36, y - 8, z + 24, 19, 30, 14), 8);             // middle cranial fossae (temporal lobes)
  d = smin(d, sdE(x, y + 50, z + 26, 45, 31, 22), 10);                 // posterior fossa (cerebellum)
  d = smin(d, sdE(x, y - 4, z + 14, 12, 14, 10), 6);                   // sella / central base
  return d;
};
A.cavitySD = cavitySD;
const ORB = [32, 80, -25.5];                                              // orbit rim centre (x mirrored)
const orbitSD = (x, y, z) => {                                         // a cone from the rim opening back to the apex
  const ax = Math.abs(x), R0 = ORB, AP = [13, 40, -29];
  const dx = AP[0] - R0[0], dy = AP[1] - R0[1], dz = AP[2] - R0[2], L2 = dx * dx + dy * dy + dz * dz, L = Math.sqrt(L2);
  const tr = ((ax - R0[0]) * dx + (y - R0[1]) * dy + (z - R0[2]) * dz) / L2, t = clamp(tr, -1, 1), tt = Math.max(0, t);
  const cx = R0[0] + dx * t, cz = R0[2] + dz * t;
  const sc = 1 - 0.72 * tt * tt - 0.1 * tt, rx = 19.5 * sc, rz = 16.8 * sc;
  const ex = ax - cx + 0.12 * (z - cz), ez = z - cz;
  const n = 3.2, qq = Math.pow(Math.pow(Math.abs(ex / rx), n) + Math.pow(Math.abs(ez / rz), n), 1 / n);
  return (qq - 1) * Math.min(rx, rz) + Math.max(0, tr - 1) * L;
};
A.orbitSD = orbitSD;
const nasalCavitySD = (x, y, z) => {                                   // the nasal cavity behind the aperture
  const ax = Math.abs(x), w = lerp(6.5, 13.5, ss(-30, -42, z)) + 2 * ss(70, 40, y) * ss(-30, -50, z);
  return sdBox(ax, y - 62, z + 41, w, 32, 24, 3);
};
const apertureSD = (x, y, z) => {                                       // the pear-shaped piriform aperture (front opening)
  const ax = Math.abs(x), w = lerp(10, 15, ss(-35, -56, z)) * (z > -60 ? 1 : 1 - (-60 - z) * 0.13);
  const zc = -50.5, hz = 16.5;
  return Math.max(ax - w, Math.abs(z - zc) - hz, 84 - y);
};
const faceFront = (x, z) => {                                           // y of the anterior surface of the midface
  const ax = Math.abs(x);
  // midline profile: glabella 90 (z 0) → nasion 86 (z −9) → nasal bones forward to 95 at z −34 → maxilla 91 → alveolar 92
  const mid = z > -9 ? lerp(86, 90, ss(-9, 2, z)) : z > -34 ? 86 : z > -60 ? lerp(86, 91, ss(-34, -60, z)) : 91 - (-60 - z) * 0.05;
  let y = mid - 0.0046 * ax * ax;
  if (ax < 9 && z <= -9 && z > -37) y += lerp(0, 7, ss(-9, -35, z)) * (1 - (ax / 9) ** 2);      // nasal bones project forward
  y -= 3.2 * Math.exp(-(((ax - 23) / 7) ** 2 + ((z + 55) / 8) ** 2));    // canine fossa
  if (z < -62) y = Math.min(y, 92 - 0.046 * ax * ax + 3);               // the alveolar process follows the dental arch
  return y;
};
// half-width of the midface outline (front view) at height z
const faceHalfW = z => z > -48 ? 52 : z > -66 ? lerp(52, 35, ss(-48, -66, z)) : 35;
// orbital rims: a raised elliptical ring round each socket (the supraorbital margin a little thicker)
const rimSD = (x, y, z) => {
  const ax = Math.abs(x), u = ax - ORB[0], v = z - ORB[2], a = 20.5, b = 17.6, n = 3.2;
  const q = Math.pow(Math.pow(Math.abs(u / a), n) + Math.pow(Math.abs(v / b), n), 1 / n), rad = (q - 1) * (a + b) / 2;
  const yr = ORB[1] - 0.32 * u + (v > 0 ? 1.2 : 0);                     // the rim plane tilts back laterally
  return Math.hypot(rad, (y - yr) * 1.3) - (v > 6 ? 3.6 : 2.6);
};
// upper alveolar process + palate, and the mandible: a curved bar with a vertical extent, plus rami and condyles
const upperJawSD = (x, y, z) => {
  if (z > -56 || z < -84) return 9;
  const [d, s, off] = archNear(UPPER, x, y), ax = Math.abs(x);
  const along2 = Math.max(0, d * d - off * off), dr = Math.sqrt(along2 + (off + 2.2) ** 2);   // distance to the ridge line
  const bar = Math.max(dr - 6.4, Math.abs(z + 70.5) - 9.5) + Math.max(0, s - 54) * 0.8;
  const inner = 88 - 0.046 * ax * ax - 5;                                // the palate fills the inside of the arch
  const palate = Math.max(Math.abs(z + 65.5) - 2.6, y - inner, 38 - y);
  return Math.min(bar, palate);
};
const MAND = (() => {                                                   // mandible body centreline: chin → molars → angle
  const pts = [];
  for (let i = 0; i <= 40; i++) { const x = 28 * i / 40; pts.push([x, 85 - 0.05 * x * x]); }   // along the lower arch (slightly inside the teeth)
  for (let i = 1; i <= 16; i++) { const q = i / 16; pts.push([lerp(28, 46, q), lerp(85 - 0.05 * 784, 8, q)]); }   // toward the angle
  let s = 0; const out = [[pts[0][0], pts[0][1], 0]];
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); out.push([pts[i][0], pts[i][1], s]); }
  return out;
})();
A.MAND = MAND;
const mandSD = (x, y, z) => {
  if (z > -40 || z < -134) return 9;
  const ax = Math.abs(x);
  let best = 1e9, bi = 0;
  for (let i = 0; i < MAND.length; i++) { const d = (MAND[i][0] - ax) ** 2 + (MAND[i][1] - y) ** 2; if (d < best) { best = d; bi = i; } }
  const p = MAND[bi], L = MAND[MAND.length - 1][2], u = p[2] / L;
  const zt = lerp(-97.5, -103, ss(0.6, 1, u)), zb = lerp(-128, -121, ss(0.45, 1, u)) + 3 * ss(0.92, 1, u);   // alveolar crest / lower border
  const th = lerp(6.6, 5.4, u), hh = (zt - zb) / 2, zc = (zt + zb) / 2;
  // cross-section: a rounded rectangle (superellipse) thicker at the base
  const dn = Math.sqrt(best) / (th * (1 + 0.25 * clamp((zc - z) / hh))), dz = (z - zc) / hh, n = 3.5;
  let d = (Math.pow(Math.pow(dn, n) + Math.pow(Math.abs(dz), n), 1 / n) - 1) * Math.min(th, hh);
  // ramus: a plate flaring out toward the angle, from the angle to the condyle and the coronoid process
  const xr = lerp(50, 45.5, clamp((z + 118) / 64)), dxr = Math.abs(ax - xr) - 2.7;
  const yb = lerp(10, 1.5, clamp((z + 118) / 66)), ya = z > -66 ? lerp(34.5, 31, clamp((z + 92) / 36)) : lerp(38, 33.5, clamp((z + 112) / 46));
  let rd = Math.max(yb - y, y - ya, z + 50, -120 - z);
  const notch = sdE(0, y - 17.5, z + 50, 1, 8.5, 12.5);
  rd = Math.max(rd, -notch);
  if (z > -56 && y > 9.5 && y < 24.5) rd = Math.max(rd, z + 63);
  d = smin(d, Math.max(dxr, rd) - 0.5, 4);
  d = smin(d, sdE(ax - 49, y - 3.5, z + 48.5, 10, 5.5, 5.5), 3);       // condyle
  return d;
};
// upper cervical spine: C1 ring, C2 with the dens, C3–C4 bodies and arches
const spineSD = (x, y, z) => {
  if (z > -56 || z < -104 || y > 14 || y < -62 || Math.abs(x) > 40) return 9;
  const ax = Math.abs(x);
  let d = 9;
  // atlas (C1): anterior arch, lateral masses, posterior arch
  if (z > -76) {
    const ring = Math.abs(Math.hypot(x / 1.35, (y + 20) / 1.1) - 19) - 4, h = Math.abs(z + 67) - 4.5;
    d = Math.max(ring, h);
    d = Math.min(d, sdE(ax - 22, y + 16, z + 66, 7, 9, 6));
  }
  d = Math.min(d, Math.max(Math.hypot(x, y + 8) - 5.5, Math.abs(z + 70) - 10));   // dens of C2
  for (let k = 0; k < 1; k++) {                                         // the body of C2 with its arch and spinous process
    const zc = -88 - k * 17, h = k === 0 ? 8 : 6.5;
    d = Math.min(d, sdBox(x, y + 9, z - zc, 10, 8.5, h, 2.5));
    const ring = Math.abs(Math.hypot(x / 1.3, (y + 30) / 1.05) - 13) - 3;
    d = Math.min(d, Math.max(ring, Math.abs(z - zc) - 4.5, y + 18));
    d = Math.min(d, sdSeg(x, y, z, 0, -40, zc, 0, -54, zc - 4) - 3.2);
  }
  return d;
};
// the bone model: negative inside bone. Returns the signed distance; A.boneKind tells teeth apart.
A.skullSD = (x, y, z) => {
  const ax = Math.abs(x);
  if (ax > 78 || y > 112 || y < -108 || z > 100 || z < -150) return 20;
  // --- braincase: the vault (above the fossa floors) and, under the floors, the cavity grown by the thickness of the
  // skull base: the base wraps the fossae (anterior, middle, posterior) instead of being a solid lump ---
  const front = clamp((y - 20) / 50), sx = 1 - 0.08 * front;
  let vault = sdE(x / sx, y + 4, z - 16, 70, 92, 73);
  vault = smin(vault, sdE(x, y - 30, z - 5, 62, 56, 50), 10);
  const cav = cavitySD(x, y, z);
  const zf = lerp(-22, -6, ss(18, 34, y));
  vault = smax(vault, zf - 9 - z, 6);
  let outer = smin(vault, cav - 8.5, 8);
  outer = smin(outer, sdE(x, y + 50, z + 27, 51, 37, 27), 10);           // occipital squama round the posterior fossa
  let brain = Math.max(outer, -cav);
  brain = Math.max(brain, -Math.max(Math.hypot(x, y + 26) - 16, z + 36)); // foramen magnum
  // --- face: the midface as a solid between the cranial base (y ≈ 34) and its anterior surface, with raised orbital
  // rims, zygomatic bones (cheekbones) with the lateral orbital rims, and the zygomatic arches ---
  let face = 9;
  if (y > 20 && z < 8 && z > -86 && ax < 64) {
    const yf = faceFront(x, z), hw = faceHalfW(z);
    const wl = hw - Math.max(0, 66 - y) * 0.5;                            // the sides recede behind the cheekbones
    const yb = z > -46 ? lerp(34, 58, ss(15, 26, ax)) : 40;                // sphenoid body in the middle, orbital walls laterally
    face = Math.max(y - yf, ax - wl, yb - y, z + 13, -64 - z);
    face = smin(face, rimSD(x, y, z), 3);
    face = smin(face, sdE(x, y - 85, z - 1, 15, 7, 8), 6);               // glabella
  }
  let bone = smin(brain, face, 6);
  // zygomatic arch: a slim vertical bar, lowest in the middle; zygomatic body: a broad cheek prominence
  const sa = clamp((y + 2) / 66), zc = -39.5 - 2.5 * Math.sin(sa * Math.PI), dxy = sdSeg(ax, y, 0, 52, 64, 0, 61, -2, 0);
  const arch = Math.max(dxy - 3.6, Math.abs(z - zc) - 5.4);
  const zyg = Math.min(smin(sdE(ax - 48, y - 68, z + 42, 12, 13, 14.5), sdSeg(ax, y, z, 49, 73, -38, 48, 75, -14) - 4.6, 5), arch);
  bone = smin(bone, zyg, 5);
  bone = Math.min(bone, upperJawSD(x, y, z));
  // pterygoid plates hanging from the base behind the maxilla
  bone = smin(bone, Math.max(sdBox(ax - 24, y - 33, z + 52, 6, 5, 20, 2), -sdBox(ax - 24, y - 31, z + 56, 3.5, 6, 16, 1)), 4);
  // mastoid processes
  bone = smin(bone, sdE(ax - 54, y + 11, z + 50, 6.5, 8, 11), 6);
  // --- holes ---
  bone = Math.max(bone, -orbitSD(x, y, z));
  const nc = nasalCavitySD(x, y, z);
  if (nc < 4) {
    let hole = Math.max(nc, y - (faceFront(x, z) - 3.6));
    // the septum (midline plate) and the turbinates stay
    const septum = Math.max(ax - 1.1, y - faceFront(x, z) + 9), turb = Math.min(sdE(ax - 11.5, y - 60, z + 54, 3.2, 21, 4.2), sdE(ax - 10, y - 64, z + 42, 2.6, 16, 3.4));
    hole = Math.max(hole, -Math.min(septum, turb));
    bone = Math.max(bone, -hole);
  }
  bone = Math.max(bone, -apertureSD(x, y, z));
  bone = Math.max(bone, -sdE(ax - 26, y - 61, z + 57, 12, 15, 9));      // maxillary sinuses
  bone = Math.max(bone, -sdE(x, y - 28, z + 26, 9, 9, 7));              // sphenoid sinus
  if (ax < 11 && ax > 2.5 && y > 46 && y < 82 && z < -12 && z > -40 && noise(x * 0.42, y * 0.42, z * 0.42) > -0.05)
    bone = Math.max(bone, 0.4);                                          // ethmoid air cells
  bone = Math.max(bone, -sdE(x, y - 75, z - 7, 9, 3.2, 6));             // frontal sinus
  bone = Math.max(bone, -Math.max(sdSeg(ax, y, z, 78, 0, -38, 50, 0, -38) - 4.2, -1));   // external ear canals
  // --- mandible, teeth, spine ---
  bone = Math.min(bone, mandSD(x, y, z));
  if (!A.noSpine) bone = Math.min(bone, spineSD(x, y, z));
  const tu = toothSD(x, y, z, UPPER, TEETH_U, -90.2, -79), tl = toothSD(x, y, z, LOWER, TEETH_L, -90.6, -100);
  A._tooth = Math.min(tu, tl) < 0;
  bone = Math.min(bone, tu, tl);
  return bone;
};
// ---------- the soft-tissue envelope (skin), negative inside ----------
A.skinSD = (x, y, z) => {
  const ax = Math.abs(x);
  if (ax > 92 || y > 132 || y < -116 || z > 108 || z < -210) return 20;
  const front = clamp((y - 20) / 50), sx = 1 - 0.08 * front;
  let d = sdE(x / sx, y + 4, z - 16, 76.5, 98.5, 79.5);                 // scalp over the vault
  d = smin(d, sdE(x, y - 30, z - 5, 68, 62, 56), 10);
  d = smin(d, sdE(x, y + 8, z + 34, 70, 70, 38), 14);
  d = smin(d, sdE(x, y + 50, z + 30, 60, 46, 36), 12);
  d = smin(d, sdE(x, y - 62, z + 62, 62, 46, 56), 18);                 // face and jaw
  d = smin(d, sdE(x, y - 90, z + 108, 30, 16, 22), 10);                // chin and lips
  d = smin(d, sdE(x, y - 70, z + 30, 58, 30, 30), 12);                 // cheeks and brow
  // neck
  if (z < -70) d = smin(d, sdE(x, y + 4, z + 160, 54, 60, 92), 20);
  // nose: dorsum and tip with the alae
  d = smin(d, sdSeg(x, y, z, 0, 96, -12, 0, 116, -50) - 6.5, 5);
  d = smin(d, sdE(x, y - 108, z + 55, 16, 10, 9), 5);
  // lips
  d = smin(d, sdE(x, y - 99, z + 84, 22, 8, 5), 4); d = smin(d, sdE(x, y - 98, z + 95, 21, 7.5, 5), 4);
  // ears
  d = Math.min(d, sdE(ax - 74, y + 6, z + 30, 6, 15, 26));
  return d;
};
// ---------- the brain and its spaces (inside the cavity) ----------
const ventSD = (x, y, z) => {
  const ax = Math.abs(x);
  let d = sdE(ax - 9, y - 2, z - 20, 4.2, 26, 6.5);                    // bodies of the lateral ventricles
  d = Math.min(d, sdE(ax - 10.5, y - 27, z - 12, 5.5, 9, 8.5));         // frontal horns
  d = Math.min(d, sdE(ax - 17, y + 30, z - 10, 5, 11, 6.5));            // atria / occipital horns
  d = Math.min(d, sdE(ax - 30, y - 4, z + 18, 3, 13, 3.5));             // temporal horns
  d = Math.min(d, sdE(x, y - 4, z + 2, 1.6, 13, 9));                    // third ventricle
  d = Math.min(d, sdE(x, y + 46, z + 32, 5, 3.5, 7));                   // fourth ventricle
  return d;
};
// HU at a point. Values: air −1000, fat −90, CSF 8, white matter 26, gray matter 38, muscle/skin 45, dura/falx 70,
// lens 110, cartilage 200, cancellous bone 550, cortical bone 1600, tooth enamel 2600.
A.hu = (x, y, z) => {
  const sk = A.skinSD(x, y, z);
  if (sk > 0) return -1000;
  const ax = Math.abs(x);
  const b = A.skullSD(x, y, z);
  if (b < 0) {
    if (A._tooth) return -b > 1.2 ? 2600 : 1900;
    // vault: diploë between the tables; thin bones of face and base are cortical
    const inVault = z > -4 && y < 70;
    return inVault && -b > 1.8 ? 520 + 140 * noise(x * 0.4, y * 0.4, z * 0.4) : 1600 - 300 * clamp((-b - 1.2) / 3) * (inVault ? 1 : 0.5);
  }
  // air spaces inside the head: sinuses, nasal cavity, airway, ear canals, mastoid air cells
  const air = A.airSD(x, y, z);
  if (air < 0) return -1000;
  const cav = cavitySD(x, y, z);
  if (cav < 0) return A.brainHU(x, y, z, -cav);
  // the orbits: eye, lens, optic nerve, muscles in fat
  const orb = orbitSD(x, y, z);
  if (orb < 0 && y > 40) {
    const ex = ax - 32.5, ey = y - 75, ez = z + 25, re = Math.hypot(ex, ey, ez);
    if (re < 12) return Math.hypot(ex / 4.6, (y - 85) / 2.2, ez / 4.6) < 1 ? 110 : re > 11 ? 50 : 10;
    if (sdSeg(ax, y, z, 30, 64, -25, 15, 40, -29) < 2.6) return 42;       // optic nerve
    if (orb > -2.6) return 48;                                            // muscles along the walls
    return -95;
  }
  // soft tissue: skin, subcutaneous fat, muscle
  if (sk > -1.4) return 52;
  if (sk > -4.2 && (z < -10 || y < -40)) return -85;
  if (sk > -3 && z >= -10) return -40;
  return 45 + 6 * noise(x * 0.2, y * 0.2, z * 0.2);
};
A.airSD = (x, y, z) => {
  const ax = Math.abs(x);
  let d = 9;
  const nc = nasalCavitySD(x, y, z);
  if (nc < 0) {
    const septum = ax - 1.1, turb = Math.min(sdE(ax - 11.5, y - 60, z + 54, 4.2, 22, 5.2), sdE(ax - 10, y - 64, z + 42, 3.4, 17, 4.2));
    d = Math.max(nc, -Math.min(septum, turb));
    if (d < 0) return d;
  }
  if (A.skullSD(x, y, z) < 0) return 1;
  d = Math.min(d, sdE(ax - 26, y - 61, z + 57, 11, 14, 8));            // maxillary sinuses (inside their walls)
  d = Math.min(d, sdE(x, y - 28, z + 26, 8, 8, 6));                    // sphenoid sinus
  d = Math.min(d, sdE(x, y - 75, z - 7, 8, 2.4, 5));                   // frontal sinus
  d = Math.min(d, sdSeg(ax, y, z, 79, 0, -38, 52, 0, -38) - 3.5);       // ear canals
  // ethmoid air cells between the orbits: a honeycomb
  if (ax < 13 && ax > 2 && y > 46 && y < 84 && z < -14 && z > -40) { const n = noise(x * 0.42, y * 0.42, z * 0.42); if (n > -0.05) d = Math.min(d, -0.5); }
  // mastoid air cells
  if (sdE(ax - 54, y + 10, z + 46, 9, 10, 12) < 0 && noise(x * 0.5, y * 0.5, z * 0.5) > 0.0) d = Math.min(d, -0.5);
  // nasopharynx → oropharynx airway
  d = Math.min(d, sdE(x, y - 27, z + 52, 11, 7, 10));
  if (z < -52) d = Math.min(d, Math.max(Math.hypot(x / 1.4, y - 20) - 6.5, z + 52));
  return d;
};
A.brainHU = (x, y, z, depth) => {
  const ax = Math.abs(x);
  if (depth < 1.6) return 8;                                            // CSF over the surface
  // interhemispheric fissure with the falx in it (above the corpus callosum)
  if (z > 4 && ax < 2.2 && !(z < 30 && Math.abs(y) < 32 && z > 4 && ax > 0)) return ax < 0.7 ? 70 : 8;
  if (z > 32 && ax < 2.2) return ax < 0.7 ? 70 : 8;
  const v = ventSD(x, y, z);
  if (v < 0) return 8;
  if (ax < 1.0 && z > 8 && z < 30 && Math.abs(y) < 26) return 30;      // septum pellucidum / corpus callosum
  // cerebellum and brainstem: below the tentorium
  const infra = z < -22 && y < -18;
  // sulci: CSF lines where a band-limited noise crosses zero, near the surface
  if (depth < 11) {
    const n = noise(x * 0.075 + 7, y * 0.075, z * 0.075) + 0.35 * noise(x * 0.15, y * 0.15 + 3, z * 0.15);
    if (Math.abs(n) < 0.045 + 0.04 * (1 - depth / 11)) return 10;
    if (infra) return 34;
    // cortex: gray matter along the surface and along the sulci
    if (depth < 4 || Math.abs(n) < 0.13) return 38;
  }
  if (infra) return 34;
  // deep gray nuclei: caudate heads, lentiform nuclei, thalami
  if (sdE(ax - 13, y - 20, z - 10, 5.5, 8, 7) < 0 || sdE(ax - 22, y - 6, z - 2, 6, 12, 8) < 0 || sdE(ax - 9, y + 6, z - 2, 8, 11, 7.5) < 0) return 36;
  return 26 + 1.5 * noise(x * 0.15, y * 0.15, z * 0.15);
};
A.mu = (x, y, z) => A.muOf(A.hu(x, y, z));
// a tissue class for the illustrated cross-section: 0 air, 1 skin/soft, 2 fat, 3 bone, 4 brain, 5 CSF, 6 eye, 7 tooth
A.cls = (x, y, z) => {
  const h = A.hu(x, y, z);
  if (h <= -500) return 0; if (h >= 1800) return 7; if (h >= 300) return 3; if (h < -30) return 2;
  if (cavitySD(x, y, z) < 0) return h < 18 ? 5 : 4;
  if (orbitSD(x, y, z) < 0 && h < 30 && h > 0) return 6;
  return 1;
};
// an axial HU image: w × h samples over the field (x0..x0+fw, y0 downward...) — radiological convention: the patient's
// right on the image's left (x flipped), anterior up.
A.axialHU = (z, w, h, fov, cx = 0, cy = 0, ss_ = 1) => {
  const out = new Float32Array(w * h), px = fov / w;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    let acc = 0;
    for (let sy = 0; sy < ss_; sy++) for (let sx = 0; sx < ss_; sx++) {
      const x = -(cx + (c + (sx + 0.5) / ss_ - w / 2) * px), y = cy - (r + (sy + 0.5) / ss_ - h / 2) * px;
      acc += A.hu(x, y, z);
    }
    out[r * w + c] = acc / (ss_ * ss_);
  }
  return out;
};
})();
