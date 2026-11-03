'use strict';
// ============================================================================
// CT DATA — computed from the same anatomy the film draws, so every image is
// consistent with the 3D world: a CT value at any point (air, scalp, skull,
// brain, ventricles, arteries; with or without contrast), axial slices, an
// oblique MPR plane through the aneurysm, a real sinogram (projections at many
// angles) with filtered back-projection, and voxel meshes of the volume.
// Values are display intensities (a brain/vessel window), not calibrated HU.
// ============================================================================
const VENT = [[9, 18, -4], [-9, 18, -4]];
// class: 0 air, 1 scalp/soft tissue, 2 bone, 3 brain, 4 CSF (ventricles), 5 vessel lumen
function ctClass(x, y, z) {
  const hx = (x - HEAD.c[0]) / HEAD.r[0], hy = (y - HEAD.c[1]) / HEAD.r[1], hz = (z - HEAD.c[2]) / HEAD.r[2];
  let inHead = hx * hx + hy * hy + hz * hz <= 1;
  if (!inHead && y < -40 && y > -190 && Math.hypot(x, z + 14) < 54) inHead = true;
  if (!inHead) return [0, 0];
  const v = vesselInside(x, y, z);
  const sx = x / 74, sy = (y - 6) / 68, sz = (z + 2) / 92, sr = Math.sqrt(sx * sx + sy * sy + sz * sz);
  if (v > 0.5 && sr < 1.0) return [5, v];
  if (sr > 1.0) return v > 0.5 ? [5, v] : [1, 0];
  if (sr > 0.915) return [2, 0];
  if (y < -48) return v > 0.5 ? [5, v] : [1, 0];                       // below the brain: skull base soft tissue
  for (const c of VENT) { const dx = (x - c[0]) / 5, dy = (y - c[1]) / 9, dz = (z - c[2]) / 24; if (dx * dx + dy * dy + dz * dz < 1) return [4, 0]; }
  return [3, sr];
}
// display intensity 0..1 (contrast c: 0 none .. 1 arterial phase)
function ctValue(x, y, z, c) {
  const [k, q] = ctClass(x, y, z);
  if (k === 0) return 0;
  if (k === 1) return 0.42;
  if (k === 2) return 1.0;
  if (k === 4) return 0.3;
  if (k === 5) return lerp(0.55, 0.9, c);
  // brain: white matter a little darker in the core, cortex a little brighter, faint sulci near the surface
  let v = q < 0.6 ? 0.47 : 0.51;
  if (q > 0.8 && Math.sin(x * 0.45 + Math.sin(z * 0.3) * 2) * Math.sin(y * 0.4 + z * 0.12) > 0.55) v = 0.38;
  return v;
}
const GREY = [P.G0, P.G1, P.G2, P.G3, P.G4, P.G5, P.G6, P.G7, P.G8];
function greyOf(v, x, y) { const f = clamp(v, 0, 1) * 8 + (bayA(x, y) - 0.5) * 0.6; return GREY[clamp(Math.round(f), 0, 8)]; }
// an axial slice (plane y = level) over x in [-96, 96], z in [-112, 112]; mode 'ct' grey or 'color' anatomy; air transparent
const SL = { x0: -96, x1: 96, z0: -112, z1: 112 };
function sliceTex(level, w, h, mode, c) {
  return makeTex(w, h, (i, j) => {
    const x = lerp(SL.x0, SL.x1, (i + 0.5) / w), z = lerp(SL.z1, SL.z0, (j + 0.5) / h);
    if (mode === 'ct') { const v = ctValue(x, level, z, c); return v <= 0 ? 0 : greyOf(v, i, j); }
    const [k] = ctClass(x, level, z);
    if (k === 3) { const q = ctClass(x, level, z)[1]; return q < 0.6 ? P.BR3 : (vn3(x * 0.12, level * 0.12, z * 0.12) > 0.25 ? P.BR1 : P.BR2); }
    return [0, P.SK2, P.BO2, 0, P.ST2, c > 0.5 ? P.IO3 : P.AR2][k];
  });
}
// the oblique MPR plane through the centre of the aneurysm (the radiologist's reformat); its orientation is set by the
// scene file so that it faces the camera at the moment of the correlation. Row 0 of the texture is the +e2 edge.
const MPR = { c: AN_C.slice(), e1: [1, 0, 0], e2: [0, 1, 0], n: [0, 0, 1], half: 11 };
function mprTex(n, c) {
  return makeTex(n, n, (i, j) => {
    const u = ((i + 0.5) / n * 2 - 1) * MPR.half, v = (1 - (j + 0.5) / n * 2) * MPR.half, p = add3(MPR.c, add3(mul3(MPR.e1, u), mul3(MPR.e2, v)));
    let w = ctValue(p[0], p[1], p[2], c);
    if (ctClass(p[0], p[1], p[2])[0] === 3) {
      // the aneurysm sits in the Sylvian cistern: dark CSF around the vessels, grey brain (cortex / white matter) beyond
      w = brainSDF(p[0], p[1], p[2]) > -0.6 ? 0.27 : 0.46 + 0.05 * vn3(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3);
    }
    return greyOf(Math.max(0.12, w), i, j);
  });
}
// ---------------------------------------------------------------- the sinogram and filtered back-projection (one axial level, the MCA level)
const FBP = { n: 80, half: 112, na: 72, nb: 112, level: -6 };
function fbpInit() {
  if (FBP.ph) return;
  const n = FBP.n, ph = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = ((i + 0.5) / n * 2 - 1) * FBP.half, z = (1 - (j + 0.5) / n * 2) * FBP.half; ph[j * n + i] = ctValue(x, FBP.level, z, 1); }
  // projections: sum along rays at each angle (pixel splatting into detector bins)
  const na = FBP.na, nb = FBP.nb, sino = new Float32Array(na * nb), smax = FBP.half * Math.SQRT2;
  for (let a = 0; a < na; a++) {
    const th = a / na * Math.PI, c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = ph[j * n + i]; if (!v) continue; const x = ((i + 0.5) / n * 2 - 1) * FBP.half, z = (1 - (j + 0.5) / n * 2) * FBP.half, sb = (x * c + z * s + smax) / (2 * smax) * nb - 0.5, b = Math.floor(sb), f = sb - b; if (b >= 0 && b + 1 < nb) { sino[a * nb + b] += v * (1 - f); sino[a * nb + b + 1] += v * f; } }
  }
  // ramp-filtered projections (Ram-Lak)
  const filt = new Float32Array(na * nb), K = 24, ker = new Float32Array(2 * K + 1);
  for (let k = -K; k <= K; k++) ker[k + K] = -2 / (Math.PI * Math.PI * (4 * k * k - 1));
  for (let a = 0; a < na; a++) for (let b = 0; b < nb; b++) { let acc = 0; for (let k = -K; k <= K; k++) { const q = b - k; if (q >= 0 && q < nb) acc += sino[a * nb + q] * ker[k + K]; } filt[a * nb + b] = acc; }
  let mx = 0; for (const v of sino) mx = Math.max(mx, v);
  // the order in which angles are added (spread out, so a partial image is evenly covered)
  const order = []; for (let k = 0; k < na; k++) order.push(k); order.sort((p, q) => rev7(p) - rev7(q));
  Object.assign(FBP, { ph, sino, filt, smax, mx, order });
  FBP.fmax = 1; const full = fbpRaw(na, true); let fm = 1e-9; for (const v of full) fm = Math.max(fm, v); FBP.fmax = fm;
}
function rev7(v) { let r = 0; for (let i = 0; i < 7; i++) { r = (r << 1) | (v & 1); v >>= 1; } return r; }
// the back-projected image after k angles (filtered or plain), as a texture
function fbpRaw(k, filtered) {
  const n = FBP.n, na = FBP.na, nb = FBP.nb, img = new Float32Array(n * n), src = filtered ? FBP.filt : FBP.sino, smax = FBP.smax, kk = Math.max(0, Math.min(na, Math.round(k)));
  for (let q = 0; q < kk; q++) {
    const a = FBP.order[q], th = a / na * Math.PI, c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < n; j++) { const z = (1 - (j + 0.5) / n * 2) * FBP.half; for (let i = 0; i < n; i++) { const x = ((i + 0.5) / n * 2 - 1) * FBP.half, sb = (x * c + z * s + smax) / (2 * smax) * nb - 0.5, b = Math.floor(sb), f = sb - b; if (b < 0 || b + 1 >= nb) continue; img[j * n + i] += src[a * nb + b] * (1 - f) + src[a * nb + b + 1] * f; } }
  }
  return img;
}
// the back-projected image after k angles (filtered or plain), as a texture
function fbpTex(k, filtered) {
  fbpInit();
  const n = FBP.n, img = fbpRaw(k, filtered);
  let mx = 1e-9; for (const v of img) mx = Math.max(mx, v);
  const norm = filtered ? 1 / FBP.fmax : 1 / mx;
  return makeTex(n, n, (i, j) => { const v = img[j * n + i] * norm; return v <= 0.05 ? P.G0 : greyOf(filtered ? Math.min(1, v * 1.05) : v * 0.95, i, j); });
}
// the sinogram as an abstract data pattern (angles down, detector across), in the scanner's cyan
function sinoTex(rows) {
  fbpInit();
  const na = FBP.na, nb = FBP.nb, C = [0, P.CY0, P.CY1, P.CY2, P.CY3, P.CY4];
  return makeTex(nb, na, (i, j) => { if (rows !== undefined && j >= rows) return 0; const v = FBP.sino[j * nb + i] / FBP.mx; if (v < 0.03) return P.MD1; return C[clamp(Math.round(v * 5 + (bayA(i, j) - 0.5) * 0.7), 1, 5)]; });
}
// transmitted intensity at the detector for gantry angle phi (0 = tube at +z): fraction of photons that get through, per element
function detProfile(phi) {
  fbpInit();
  const na = FBP.na, nb = FBP.nb; let th = ((phi % Math.PI) + Math.PI) % Math.PI, a = Math.round(th / Math.PI * na) % na;
  const out = new Float32Array(DET_N);
  for (let k = 0; k < DET_N; k++) { const u = (k + 0.5) / DET_N, b = Math.floor(lerp(nb * 0.12, nb * 0.88, phi % TAU < Math.PI ? u : 1 - u)); out[k] = Math.exp(-FBP.sino[a * nb + clamp(b, 0, nb - 1)] * 0.075); }
  return out;
}
// ---------------------------------------------------------------- voxel meshes (only the faces between different classes)
function voxelMesh(cell, x0, x1, y0, y1, z0, z1, classOf, want) {
  const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell), nz = Math.ceil((z1 - z0) / cell), C = new Uint8Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) C[idx(i, j, k)] = classOf(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell, z0 + (k + 0.5) * cell);
  const mb = new MB(), h = cell / 2, at = (i, j, k) => i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : C[idx(i, j, k)];
  const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = C[idx(i, j, k)]; if (!c || !want(c)) continue;
    const cx = x0 + (i + 0.5) * cell, cy = y0 + (j + 0.5) * cell, cz = z0 + (k + 0.5) * cell;
    for (const [fx, fy, fz] of F) {
      if (at(i + fx, j + fy, k + fz) === c) continue;
      const n = [fx, fy, fz], t1 = fx ? [0, 1, 0] : [1, 0, 0], t2 = cross3(n, t1), ctr = [cx + fx * h, cy + fy * h, cz + fz * h];
      const q = [add3(ctr, add3(mul3(t1, -h), mul3(t2, -h))), add3(ctr, add3(mul3(t1, h), mul3(t2, -h))), add3(ctr, add3(mul3(t1, h), mul3(t2, h))), add3(ctr, add3(mul3(t1, -h), mul3(t2, h)))];
      const id = q.map(p => mb.v(p[0], p[1], p[2], fx, fy, fz, c));
      mb.tri(id[0], id[1], id[2]); mb.tri(id[0], id[2], id[3]);
    }
  }
  return mb.build();
}
function ctInit() {
  if (A.ct) return;
  fbpInit();
  A.ct = true;
  A.slices = [-40, -6, 18, 38, 58].map(l => ({ level: l, tex: sliceTex(l, 96, 112, 'ct', 1) }));
  A.sliceDense = []; for (let l = -60; l <= 72; l += 6) A.sliceDense.push({ level: l, tex: sliceTex(l, 48, 56, 'ct', 1) });
  A.colorSlice = sliceTex(-6, 288, 336, 'color', 1);
  A.mpr = mprTex(128, 1);
  A.voxTissue = voxelMesh(7, -84, 84, -76, 84, -100, 100, (x, y, z) => { const k = ctClass(x, y, z)[0]; return k === 5 ? 3 : k; }, c => c === 3);
  A.voxBone = voxelMesh(7, -84, 84, -76, 84, -100, 100, (x, y, z) => ctClass(x, y, z)[0] === 2 ? 2 : 0, c => c === 2);
  A.voxVess = voxelMesh(2.6, -70, 70, -132, 72, -84, 44, (x, y, z) => vesselInside(x, y, z) > 0.5 ? 5 : 0, c => c === 5);
}
