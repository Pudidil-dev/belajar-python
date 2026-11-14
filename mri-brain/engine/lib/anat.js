// ANAT — the film's one patient: a procedural brain and head in millimetres. Everything in the film that shows anatomy
// comes from here: the 3D voxel brain, every MRI slice, the k-space data (the Fourier transform of a slice).
// Frame: x = patient's left (+) / right (−), y = anterior (+), z = superior (+); origin at the centre of the cerebrum.
//
// The brain is built from signed-distance shapes (two hemispheres with a flat medial surface and a 2 mm longitudinal
// fissure, temporal lobes, a flattened orbital surface, cerebellum, brainstem, corpus callosum), then folded: sulci are
// radial slots cut into the hemisphere hull along the zero set of band-limited 3D noise (the labyrinth of gyri), plus the
// named sulci drawn explicitly (Sylvian fissure, central sulcus, superior temporal, cingulate, parieto-occipital,
// calcarine). The cerebellum gets transverse folia. A distance transform turns the outer 2.5 mm into cortex (gray matter);
// ventricles and deep gray nuclei are carved in afterwards. Head layers (CSF, skull, scalp, face) are analytic.
// Pure functions + typed arrays, so it also runs under node for quick previews (tools/anat_preview.mjs).
(() => {
const A = globalThis.ANAT = {};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
A.sstep = sstep;

// ---------- seeded 3D gradient noise (improved Perlin), roughly −0.9..0.9 ----------
const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; let s = 20251020;
  for (let i = 255; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const GX = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0], GY = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1], GZ = [0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1];
const fd = t => t * t * t * (t * (t * 6 - 15) + 10);
const gr = (h, x, y, z) => { h %= 12; return GX[h] * x + GY[h] * y + GZ[h] * z; };
A.noise = (x, y, z) => {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), xi = X & 255, yi = Y & 255, zi = Z & 255;
  x -= X; y -= Y; z -= Z; const u = fd(x), v = fd(y), w = fd(z);
  const a = perm[xi] + yi, aa = perm[a] + zi, ab = perm[a + 1] + zi, b = perm[xi + 1] + yi, ba = perm[b] + zi, bb = perm[b + 1] + zi;
  return lerp(lerp(lerp(gr(perm[aa], x, y, z), gr(perm[ba], x - 1, y, z), u), lerp(gr(perm[ab], x, y - 1, z), gr(perm[bb], x - 1, y - 1, z), u), v),
    lerp(lerp(gr(perm[aa + 1], x, y, z - 1), gr(perm[ba + 1], x - 1, y, z - 1), u), lerp(gr(perm[ab + 1], x, y - 1, z - 1), gr(perm[bb + 1], x - 1, y - 1, z - 1), u), v), w);
};

// ---------- signed-distance helpers (mm; negative inside) ----------
const sdE = (x, y, z, rx, ry, rz) => {                       // ellipsoid at the origin (Quilez's bound)
  const k0 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  if (k0 < 1e-6) return -Math.min(rx, ry, rz);
  const k1 = Math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
  return k0 * (k0 - 1) / k1;
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const rot = (y, z, a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
// distance from (y, z) to a polyline in the sagittal projection
const segD = (py, pz, pts) => {
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const [ay, az] = pts[i - 1], [by, bz] = pts[i], dy = by - ay, dz = bz - az;
    const t = clamp(((py - ay) * dy + (pz - az) * dz) / (dy * dy + dz * dz));
    const d = Math.hypot(py - ay - t * dy, pz - az - t * dz); if (d < best) best = d;
  }
  return best;
};
A.sdE = sdE; A.smin = smin; A.smax = smax; A.segD = segD;

// ---------- the hemisphere hull (one side; ax = |x|), no folds ----------
A.hemi = (ax, y, z) => {
  const front = Math.max(0, y) / 80, back = Math.max(0, -y - 30) / 55;
  const tx = 1 + 0.12 * front + 0.10 * back, tz = 1 + 0.10 * back;            // narrower frontal lobe, tapered occipital pole
  let d = sdE((ax - 24) * tx, y + 3, (z - 12) * tz, 44, 82, 46);
  const [ty, tz2] = rot(y - 4, z + 20, 0.22);                                  // temporal lobe, pole forward and down
  d = smin(d, sdE(ax - 43, ty, tz2, 25, 42, 20), 10);
  // orbital surface of the frontal lobe (medial to the temporal pole) is flattened
  const zc = lerp(-18 + 5 * sstep(4, 22, ax) - 3 * sstep(60, 80, y) - 30 * (1 - sstep(22, 42, y)), -70, sstep(28, 42, ax));
  d = smax(d, zc - z, 5);
  return smax(d, 1 - ax, 2);                                                   // flat medial surface, 2 mm fissure
};
// the hull of the whole cerebrum, both hemispheres together (no fissure): the shape the skull follows
A.cerebrumHull = (x, y, z) => {
  const ax = Math.abs(x), front = Math.max(0, y) / 80, back = Math.max(0, -y - 30) / 55;
  const tx = 1 + 0.12 * front + 0.10 * back, tz = 1 + 0.10 * back;
  let d = sdE(Math.max(0, ax - 24) * tx, y + 3, (z - 12) * tz, 44, 82, 46);
  const [ty, tz2] = rot(y - 4, z + 20, 0.22);
  d = smin(d, sdE(ax - 43, ty, tz2, 25, 42, 20), 10);
  const zc = lerp(-18 + 5 * sstep(4, 22, ax) - 3 * sstep(60, 80, y) - 30 * (1 - sstep(22, 42, y)), -70, sstep(28, 42, ax));
  return smax(d, zc - z, 5);
};

// ---------- named sulci, in the sagittal (y, z) projection ----------
const SYLVIAN = [[30, -15], [12, -6], [-10, 5], [-26, 13], [-34, 24]];
const CENTRAL = [[-9, 60], [-6, 48], [-2, 38], [3, 30], [8, 22], [12, 15]];
const STS = [[24, -31], [4, -22], [-16, -12], [-32, -3], [-40, 8]];
const CINGULATE = [[34, 2], [36, 22], [22, 34], [0, 38], [-22, 37], [-36, 32]];
const PARIETO_OCC = [[-58, 46], [-52, 26], [-46, 6]];
const CALCARINE = [[-88, 2], [-66, -2], [-46, 4]];
A.SULCI = { SYLVIAN, CENTRAL, STS, CINGULATE, PARIETO_OCC, CALCARINE };
const C_HEMI = [24, -3, 8];                                                    // centre the folds radiate from
const D_FOLD = 10;                                                               // depth of an ordinary sulcus (mm)
// fold depth below the hull at a point inside the hemisphere (dh = hull distance there, < 0 inside)
A.folds = (ax, y, z, dh) => {
  // lift the point back out to the hull surface along the radial direction: the slots are radial, the pattern is in mm
  let ux = ax - C_HEMI[0], uy = y - C_HEMI[1], uz = z - C_HEMI[2];
  const L = Math.hypot(ux, uy, uz) || 1; ux /= L; uy /= L; uz /= L;
  const sx = ax - ux * dh, sy = y - uy * dh, sz = z - uz * dh;
  // gyri run front-to-back in the frontal and temporal lobes, up-and-down around the central sulcus
  const fr = sstep(5, 30, sy), tl = sstep(-14, -30, sz) * sstep(26, 40, sx), cen = (1 - sstep(8, 26, Math.abs(sy - 2 - (50 - sz) * 0.3))) * sstep(10, 25, sz);
  const ky = 1 / (1 + 0.9 * Math.max(fr, tl)), kz = 1 / (1 + 0.8 * cen);
  let g = 0;
  if (dh > -D_FOLD - 1) {
  const f = 1 / 15.5, wx = 5 * A.noise(sx * 0.035 + 9, sy * 0.035, sz * 0.035), wy = 5 * A.noise(sx * 0.035, sy * 0.035 + 9, sz * 0.035);
  const nf = (X, Y, Z) => A.noise((X + wx) * f + 3.1, (Y + wy) * f * ky - 1.7, Z * f * kz + 0.5) + 0.12 * A.noise(X * f * 2.6 - 7, Y * f * 2.6, Z * f * 2.6 + 11);
  const n = nf(sx, sy, sz), e = 0.6;
  const gn = Math.hypot(nf(sx + e, sy, sz) - n, nf(sx, sy + e, sz) - n, nf(sx, sy, sz + e) - n) / e;
  // distance (mm, along the surface) to the nearest sulcus line, then a rounded gyral shoulder and a narrow slot
  const s = Math.abs(n) / Math.max(gn, 0.015), W0 = 0.7, RG = 3.6;
  g = s < W0 ? D_FOLD : s < W0 + RG ? (u => RG - Math.sqrt(Math.max(0, RG * RG - u * u)))(RG - (s - W0)) : 0;
  }
  // named sulci (lateral ones only on the lateral surface, medial ones only near the midline)
  const lat = sstep(18, 34, sx), med = 1 - sstep(4, 14, sx);
  const wob = 2.8 * A.noise(sy * 0.07, sz * 0.07, sx * 0.05 + 2.0);
  g = Math.max(g, 22 * lat * (1 - sstep(1.0, 3.4, segD(sy, sz + wob, SYLVIAN))));
  g = Math.max(g, 15 * (1 - sstep(1.0, 3.0, segD(sy + wob, sz, CENTRAL))) * sstep(14, 22, sz));
  g = Math.max(g, 11 * lat * (1 - sstep(1.0, 2.8, segD(sy, sz + wob, STS))));
  g = Math.max(g, 12 * med * (1 - sstep(1.0, 2.8, segD(sy, sz + wob, CINGULATE))));
  g = Math.max(g, 14 * med * (1 - sstep(1.0, 2.8, segD(sy + wob, sz, PARIETO_OCC))));
  g = Math.max(g, 13 * med * (1 - sstep(1.0, 2.8, segD(sy, sz + wob, CALCARINE))));
  return g;
};

// ---------- cerebellum, brainstem, midline ----------
A.cerebellum = (x, y, z) => {
  const ax = Math.abs(x);
  // two lobes with a posterior notch between them (the vermis is shorter), tucked under the occipital lobes
  return smin(sdE(ax - 21, y + 54, z + 44, 30, 26, 20.5), sdE(x, y + 47, z + 42, 10, 22, 19), 5);
};
const F_CB = [-38, -40];                                                        // the folia fan out around this (y, z)
A.folia = (x, y, z, dh) => {
  const th = Math.atan2(z - F_CB[1], y - F_CB[0]), u = th / 0.135, k = Math.round(u), fr = Math.abs(u - k);
  const deep = ((k % 5) + 5) % 5 === 0;
  return (deep ? 12 : 5.5) * (1 - sstep(0.1, 0.28, fr)) * (dh > -14 ? 1 : 0);
};
A.brainstem = (x, y, z) => {
  // capsule from the midbrain down to the medulla, plus the pons bulging forward
  const ay = -12, az = -4, by = -27, bz = -82, dy = by - ay, dz = bz - az;
  const t = clamp(((y - ay) * dy + (z - az) * dz) / (dy * dy + dz * dz));
  const r = lerp(12, 8, sstep(0.45, 1, t));
  let d = Math.hypot(x, y - ay - t * dy, z - az - t * dz) - r;
  d = smin(d, sdE(x, y + 6, z + 33, 16, 13, 12), 6);
  return d;
};
// corpus callosum: an arch over the ventricles, thickest at the splenium
const CC = [[24, 4], [30, 12], [22, 21], [6, 25], [-12, 25], [-26, 21], [-35, 13], [-34, 6]];
A.callosum = (x, y, z) => {
  if (Math.abs(x) > 20) return 99;
  const th = lerp(3.2, 5.0, sstep(-10, -32, y)) + 1.2 * sstep(18, 28, y);
  return segD(y, z, CC) - th;
};
// lateral (both sides), third and fourth ventricles
// a tube along a polyline of [ax, y, z, radius in-plane, half-height]
const tube = (ax, y, z, P) => {
  let best = 1e9;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((ax - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy));
    const r = lerp(a[3], b[3], t), hz = lerp(a[4], b[4], t), zc = lerp(a[2], b[2], t);
    const dd = Math.hypot(ax - a[0] - t * dx, y - a[1] - t * dy);
    const d = (Math.hypot(dd / r, (z - zc) / hz) - 1) * Math.min(r, hz);
    if (d < best) best = d;
  }
  return best;
};
const LATV = [[10, 31, 9, 2.6, 6], [6.5, 20, 11, 4.2, 8], [4.6, 6, 15, 3.6, 6.5], [5.6, -8, 16, 3.8, 5.5], [10, -22, 12, 5.8, 8], [15, -32, 8, 5, 7], [19, -44, 5, 2.6, 3.4]];
const TEMPH = [[15, -32, 6, 3, 4], [24, -22, -6, 2.6, 3.2], [28, -8, -14, 2.4, 2.8]];
A.ventricle = (x, y, z) => {
  const ax = Math.abs(x);
  let d = smin(tube(ax, y, z, LATV), tube(ax, y, z, TEMPH), 3);
  d = Math.min(d, sdE(x, y + 6, z + 1, 1.4, 11, 8));                         // third ventricle
  return Math.min(d, sdE(x, y + 31, z + 35, 5.5, 3.6, 6.5));                   // fourth ventricle
};
A.deepGray = (x, y, z) => {
  const ax = Math.abs(x);
  let d = sdE(ax - 10.5, y + 12, z - 3, 9.5, 15, 9);                          // thalamus
  d = Math.min(d, sdE(ax - 12.5, y - 13, z - 9, 5.5, 10, 8));                 // caudate head
  d = Math.min(d, sdE(ax - 23, y - 3, z + 1, 6, 15, 11));                     // putamen + globus pallidus
  return d;
};

// ---------- labels ----------
const L = A.L = { OUT: 0, GM: 1, WM: 2, CBGM: 3, CBWM: 4, STEM: 5, DGM: 6, VENT: 7 };
// parts for the 3D colouring
A.PART = { LH: 1, RH: 2, CB: 3, BS: 4 };

// ---------- the voxel volume ----------
A.build = (vs = 1.25) => {
  const x0 = -72, y0 = -92, z0 = -86, nx = Math.ceil(144 / vs) + 1, ny = Math.ceil(180 / vs) + 1, nz = Math.ceil(152 / vs) + 1;
  const N = nx * ny * nz, idx = (i, j, k) => (k * ny + j) * nx + i;
  const brain = new Uint8Array(N), part = new Uint8Array(N), hdep = new Uint8Array(N);
  for (let k = 0; k < nz; k++) { const z = z0 + k * vs;
    for (let j = 0; j < ny; j++) { const y = y0 + j * vs;
      for (let i = 0; i < nx; i++) { const x = x0 + i * vs, ax = Math.abs(x), q = idx(i, j, k);
        // cerebrum
        const dh = A.hemi(ax, y, z);
        if (dh < 0) {
          const g = dh > -24 ? A.folds(ax, y, z, dh) : 0;
          if (dh + g < 0) { brain[q] = 1; part[q] = x >= 0 ? 1 : 2; hdep[q] = Math.min(255, Math.round(-dh * 8)); continue; }
        }
        // cerebellum
        const dc = A.cerebellum(x, y, z);
        if (dc < 0 && dc + A.folia(x, y, z, dc) < 0) { brain[q] = 2; part[q] = 3; hdep[q] = Math.min(255, Math.round(-dc * 8)); continue; }
        // brainstem, diencephalon and the midline bridges
        if (A.brainstem(x, y, z) < 0 || A.callosum(x, y, z) < 0 || (ax < 2 && A.deepGray(x, y, z) < 0) || (ax < 2 && A.ventricle(x, y, z) < 0.5 && z < 22 && z > -10)) {
          brain[q] = 3; part[q] = 4; hdep[q] = 0; continue;
        }
      } } }
  // distance (voxels) from outside the brain: two-pass chamfer over the 26-neighbourhood
  const dist = new Float32Array(N);
  for (let q = 0; q < N; q++) dist[q] = brain[q] ? 1e4 : 0;
  const w1 = 1, w2 = Math.SQRT2, w3 = Math.sqrt(3);
  const pass = (fw) => {
    const ks = fw ? [1, nz, 1] : [nz - 2, -1, -1];
    for (let k = ks[0]; k !== ks[1]; k += ks[2]) for (let jj = 1; jj < ny - 1; jj++) { const j = fw ? jj : ny - 1 - jj;
      for (let ii = 1; ii < nx - 1; ii++) { const i = fw ? ii : nx - 1 - ii, q = idx(i, j, k); if (!brain[q]) continue;
        let m = dist[q]; const s = fw ? -1 : 1;
        // neighbours already visited in this scan order: previous slice (9) + same slice previous row (3) + previous voxel (1)
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const v = dist[idx(i + di, j + dj, k + s)] + (di && dj ? w3 : di || dj ? w2 : w1); if (v < m) m = v; }
        for (let di = -1; di <= 1; di++) { const v = dist[idx(i + di, j + s, k)] + (di ? w2 : w1); if (v < m) m = v; }
        { const v = dist[idx(i + s, j, k)] + w1; if (v < m) m = v; }
        dist[q] = m; } }
  };
  pass(true); pass(false);
  // tissue labels
  const lab = new Uint8Array(N), gmT = 2.5 / vs, cbT = 1.9 / vs;
  for (let k = 0; k < nz; k++) { const z = z0 + k * vs;
    for (let j = 0; j < ny; j++) { const y = y0 + j * vs;
      for (let i = 0; i < nx; i++) { const q = idx(i, j, k); if (!brain[q]) continue; const x = x0 + i * vs;
        const b = brain[q], d = dist[q];
        let l;
        if (b === 1) l = d <= gmT ? L.GM : L.WM;
        else if (b === 2) l = d <= cbT ? L.CBGM : L.CBWM;
        else l = L.STEM;
        if (A.callosum(x, y, z) < 0) l = L.WM;
        if (A.deepGray(x, y, z) < 0) l = L.DGM;
        if (A.ventricle(x, y, z) < 0) l = L.VENT;
        lab[q] = l;
      } } }
  return { vs, x0, y0, z0, nx, ny, nz, N, idx, lab, part, hdep, dist };
};

// ---------- head: CSF space, skull, scalp (analytic) ----------
// the cranial cavity follows the brain hull 3–4 mm out; the vault is smoother than the brain
A.cavity = (x, y, z) => {
  let d = A.cerebrumHull(x, y, z);
  d = smin(d, A.cerebellum(x, y, z) - 1, 12);
  d = smin(d, A.brainstem(x, y, z) + 1, 8);
  return d - 3.5;
};
// ---------- face and neck (for the sagittal views and the lowest axial slices) ----------
A.faceSDF = (x, y, z) => {
  let d = sdE(x, y - 50, z + 70, 60, 52, 58);                                 // face, cheeks, jaw
  d = smin(d, sdE(x, y - 82, z + 112, 24, 16, 16), 12);                       // chin
  const [ny, nz] = rot(y - 103, z + 49, 0.93);                                 // nose along the nasal dorsum
  d = smin(d, sdE(x, ny, nz, 10, 21, 9), 7);
  d = smin(d, sdE(x, y - 97, z + 85, 20, 7, 11), 5);                           // lips
  d = smin(d, Math.max(Math.hypot(x / 50, (y + 18) / 54) * 50 - 50, z + 64), 18);   // neck
  return smin(d, sdE(Math.abs(x) - 77, y + 6, z + 22, 8, 16, 26), 4);         // ears
};
A.headSDF = (x, y, z) => smin(A.cavity(x, y, z) - 13.6, A.faceSDF(x, y, z), 10);
// T1 inside the face and neck; null if the point is not in a face structure (then the cranial layers decide)
A.faceT1 = (x, y, z) => {
  const ax = Math.abs(x);
  // air spaces
  if (sdE(x, y - 80, z + 48, 12, 22, 16) < 0) return ax < 3.2 ? 0.3 : 0.0;                     // nasal cavity, septum
  if (sdE(ax - 26, y - 70, z + 52, 12, 14, 14) < 0) return 0.0;                                // maxillary sinuses
  if (sdE(x, y - 38, z + 34, 11, 13, 10) < 0) return 0.0;                                     // sphenoid sinus
  if (sdE(x, y - 66, z + 91, 22, 24, 2.5) < 0) return 0.0;                                     // oral cavity
  const py = 14 - Math.max(0, -z - 70) * 0.15;
  if (z < -52 && Math.hypot(x / 12, (y - py) / 7) < 1) return 0.0;                            // pharynx
  // eyes in their orbital fat, optic nerves
  const ex = ax - 32, ey = y - 76, ez = z + 36, er = Math.hypot(ex, ey, ez);
  if (er < 12) { if (Math.hypot(ex, y - 86, ez) < 4) return 0.55; return er > 11 ? 0.3 : 0.12; }
  if (er < 18) return 0.82;
  // bone: hard palate, vertebral bodies (fatty marrow, dark cortex), spinal canal and cord
  if (z > -67 && z < -62 && y > 30 && y < 92 && ax < 22) return z > -65.5 && z < -63.5 ? 0.4 : 0.06;
  if (z < -74) {
    const top = -74 - 17 * Math.floor((-74 - z) / 17), rb = Math.hypot(x / 11, (y + 8) / 9);
    if (rb < 1) return z > top - 4 ? 0.34 : rb > 0.86 ? 0.12 : 0.6 + 0.04 * A.noise(x * 0.3, y * 0.3, z * 0.3);   // body, disc
    const rc = Math.hypot(x, y + 27); if (rc < 5) return 0.5; if (rc < 7.5) return 0.1;                // cord in its CSF
  }
  if (sdE(x, y - 64, z + 84, 24, 30, 15) < 0) return 0.43;                                      // tongue
  return null;
};
// T1-weighted intensity (0..1) outside the cranial cavity, dc = A.cavity() ≥ 0 mm; −1 = air
const T1 = { [L.OUT]: 0.11, [L.GM]: 0.47, [L.WM]: 0.74, [L.CBGM]: 0.46, [L.CBWM]: 0.70, [L.STEM]: 0.62, [L.DGM]: 0.55, [L.VENT]: 0.07 };
A.T1 = T1;
A.layerT1 = (dc, x, y, z) => {
  // skull: outer and inner tables dark, marrow (fatty diploë) brighter in between; then the galea, scalp fat, skin
  const fs = A.faceSDF(x, y, z);
  if (dc >= 7 && fs < 0) {                                                       // inside the face or neck
    const v = A.faceT1(x, y, z); if (v != null) return v;
    const hs = A.headSDF(x, y, z);
    return hs > -1.2 ? 0.42 : hs > -5.5 ? 0.8 + 0.05 * A.noise(x * 0.2, y * 0.2, z * 0.2) : 0.37 + 0.04 * A.noise(x * 0.15, y * 0.15, z * 0.15);
  }
  if (dc < 7) { const u = dc / 7; return u < 0.28 || u > 0.78 ? 0.04 : 0.36 + 0.12 * A.noise(x * 0.3, y * 0.3, z * 0.3); }
  if (dc < 8.2) return 0.18;
  if (dc < 12.5) return 0.82 + 0.06 * A.noise(x * 0.2, y * 0.2, z * 0.2);
  if (dc < 13.6) return 0.42;
  return -1;
};
})();
