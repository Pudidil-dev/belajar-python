// STACK — the axial image stack as flat cards in 3D: the slices that leave the monitor and assemble into the brain
// (S01), align into a volume (S10), and fold back into the screen (S11). Each card is a VOL grid layer (one texel per
// voxel, 1.25 mm) drawn with an affine transform: its pose is a rotation in view space, a scale (px/mm) and a screen
// position. Poses are interpolated with quaternion slerp, so a card turning from the monitor into the brain is a rigid
// turn. The monitor shows the slices in the neurological convention (viewed from above: anterior up, left on the left),
// which is the same side the 3D view sees them from, so the turn never needs a mirror.
(() => {
const STACK = window.STACK = {};
const clamp = U.clamp, lerp = U.lerp;
STACK.N = 18; STACK.zk = k => -64 + 7 * k;                     // slices every 7 mm from the medulla to the vertex
STACK.PIV = [0, -3];                                            // the cards turn about this (x, y) of their plane
// ---------- small 3×3 / quaternion helpers (row-major arrays of 9) ----------
const mul = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
const tr = A => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const toQ = m => {                                              // proper rotation → [w, x, y, z]
  const t = m[0] + m[4] + m[8];
  let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [0.25 * s, (m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s]; }
  else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; q = [(m[7] - m[5]) / s, 0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s]; }
  else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; q = [(m[2] - m[6]) / s, (m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s]; }
  else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; q = [(m[3] - m[1]) / s, (m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s]; }
  const n = Math.hypot(...q); return q.map(v => v / n);
};
const fromQ = ([w, x, y, z]) => [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
const slerp = (a, b, u) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(v => -v); d = -d; }
  if (d > 0.9995) { const q = a.map((v, i) => v + (b[i] - v) * u), n = Math.hypot(...q); return q.map(v => v / n); }
  const th = Math.acos(d), s0 = Math.sin((1 - u) * th) / Math.sin(th), s1 = Math.sin(u * th) / Math.sin(th);
  return a.map((v, i) => v * s0 + b[i] * s1);
};
STACK.mul = mul; STACK.slerp = slerp; STACK.toQ = toQ; STACK.fromQ = fromQ;
// brain → view matrix of a VOL view (rows: X right, Y up, D toward the viewer); det −1 (the brain frame is left-handed)
STACK.viewM = o => { const v = VOL.view(o), a = v(1, 0, 0), b = v(0, 1, 0), c = v(0, 0, 1); return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]]; };
// the monitor's matrix: x → screen left, y → screen up, z → toward the viewer (neurological convention, det −1)
STACK.MON_M = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
// a pose: {M (brain → view, 3×3), s (px/mm), x, y (screen px of the pivot), d (depth, for sorting)}
STACK.lerpPose = (A, B, u) => {
  // rotate A's frame toward B's: M(u) = slerp(I → B·A⁻¹)·A
  const Q = toQ(mul(B.M, tr(A.M))), q = slerp([1, 0, 0, 0], Q, u);
  return { M: mul(fromQ(q), A.M), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), d: lerp(A.d, B.d, u) };
};
// the pose of card k inside the brain under VOL view o (o.cx, o.cy, o.s, yaw, pitch, roll)
STACK.brainPose = (o, k) => {
  const [sx, sy, d] = VOL.proj(o, STACK.PIV[0], STACK.PIV[1], STACK.zk(k));
  return { M: STACK.viewM(o), s: o.s, x: sx, y: sy, d };
};
// the pose of a card lying on the monitor image (C0 px → screen under cam)
STACK.monitorPose = (cam = ROOM.C0) => {
  const I = ROOM.IMG, z = cam.z || 1, [sx, sy] = PIX.toScreen(cam, I.cx - STACK.PIV[0] * I.s, I.cy - STACK.PIV[1] * I.s);
  return { M: STACK.MON_M, s: I.s * z, x: sx, y: sy, d: -500 };
};
// ---------- textures ----------
const TEX = new Map();
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// mode 'brain': segmented brain (T1 gray), 'head': the whole head layer (scalp, skull, CSF, brain), 'pink': brain in 3D colours
STACK.tex = (k, mode = 'brain') => {
  const key = k + mode; if (TEX.has(key)) return TEX.get(key);
  const G = VOL.G, z = STACK.zk(k), kk = Math.round((z - G.z0) / G.vs);
  // brain cards cover the brain grid; head cards a wider field so scalp and skull are whole
  const head = mode === 'head', vs = G.vs, x0 = head ? -98 : G.x0, y0 = head ? -112 : G.y0, w = head ? 158 : G.nx, h = head ? 176 : G.ny;
  const img = cv(w, h), x = img.getContext('2d'), d = x.createImageData(w, h);
  const mask = cv(w, h), xm = mask.getContext('2d'), dm = xm.createImageData(w, h);
  const pink = VOL.ramp(['m1', 'm2', 'm3', 'm4']), q1 = PIX.hex(PIX.P.q1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = (j * w + i) * 4;
    let v = -1, lab = 0;
    if (head) v = VOL.t1At(x0 + i * vs, y0 + j * vs, z);
    else { const q = (kk * G.ny + j) * G.nx + i; lab = G.lab[q]; if (lab) v = VOL.T1v[q] / 255; }
    if (v < 0) continue;
    if (mode === 'seg') {                                                       // the segmentation contour: brain texels on the brain's edge
      const q = (kk * G.ny + j) * G.nx + i, edge = lab && (i === 0 || j === 0 || i === w - 1 || j === h - 1 || !G.lab[q - 1] || !G.lab[q + 1] || !G.lab[q - G.nx] || !G.lab[q + G.nx]);
      if (!edge) continue; const c3 = PIX.hex(PIX.P.c3); d.data[p] = c3[0]; d.data[p + 1] = c3[1]; d.data[p + 2] = c3[2]; d.data[p + 3] = 255; continue;
    }
    if (mode === 'pink' && lab) { const c = pink[Math.min(3, Math.floor(v * 4.2))]; d.data[p] = c[0]; d.data[p + 1] = c[1]; d.data[p + 2] = c[2]; }
    else { const g = Math.round(255 * clamp(v)); d.data[p] = d.data[p + 1] = d.data[p + 2] = g; }
    d.data[p + 3] = 255;
    dm.data[p] = q1[0]; dm.data[p + 1] = q1[1]; dm.data[p + 2] = q1[2]; dm.data[p + 3] = 255;
  }
  x.putImageData(d, 0, 0); xm.putImageData(dm, 0, 0);
  const t = { img, mask, w, h, x0, y0, vs }; TEX.set(key, t); return t;
};
// affine transform of card k's texels under pose P: texel (i, j) → screen
STACK.affine = (P, k, T) => {
  const G = VOL.G, M = P.M, s = P.s, vs = T ? T.vs : G.vs;
  // texel → brain (x, y) relative to the pivot → view (X, Y) → screen (x right, y down)
  const ax = M[0] * vs * s, ay = -M[3] * vs * s, bx = M[1] * vs * s, by = -M[4] * vs * s;
  const ox = (T ? T.x0 : G.x0) - STACK.PIV[0], oy = (T ? T.y0 : G.y0) - STACK.PIV[1];
  const e = P.x + (M[0] * ox + M[1] * oy) * s, f = P.y - (M[3] * ox + M[4] * oy) * s;
  return [ax, ay, bx, by, e, f];
};
// draw cards: list of {k, P, a (alpha 0..1), mode}; drawn far to near with a 1–2 px dark edge for thickness
STACK.draw = (c, list, o = {}) => {
  const L = [...list].sort((A, B) => A.P.d - B.P.d);
  c.save(); c.imageSmoothingEnabled = false;
  for (const it of L) {
    if ((it.a ?? 1) <= 0) continue;
    const T = STACK.tex(it.k, it.mode || 'brain'), [a, b, cc, d, e, f] = STACK.affine(it.P, it.k, T);
    // thickness: the card's normal projected to the screen, ~4 mm
    const th = (o.thick ?? 4) * it.P.s, nx = it.P.M[2] * th, ny = -it.P.M[5] * th;
    c.globalAlpha = it.a ?? 1;
    const steps = Math.max(1, Math.min(3, Math.round(Math.hypot(nx, ny))));
    for (let q = steps; q >= 1; q--) { c.setTransform(a, b, cc, d, e - nx * q / steps, f - ny * q / steps); c.drawImage(T.mask, 0, 0); }
    c.setTransform(a, b, cc, d, e, f); c.drawImage(T.img, 0, 0);
  }
  c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
};
})();
