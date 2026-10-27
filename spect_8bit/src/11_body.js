'use strict';
// ============================================================================
// THE BODY (panel 2): an X-ray style torso seen from the front (units: mm,
// origin at the heart, x to the viewer's right = the patient's left, y down),
// translucent navy with light-blue bones, a glossy anatomical heart with its
// great vessels, and a red vascular tree. At high zoom the heart wall turns
// into the muscle tissue of panels 2 (inset) and 6 with orange tracer.
// ============================================================================
// ---------------------------------------------------------------- torso silhouette
const TORSO = spline([-50, -340, 50, -340, 56, -276, 110, -246, 178, -236, 214, -206, 228, -150, 222, -60, 206, 40, 196, 140, 186, 240, 182, 330,
  -182, 330, -186, 240, -196, 140, -206, 40, -222, -60, -228, -150, -214, -206, -178, -236, -110, -246, -56, -276], 4, true);
function torsoMask(cam) { return maskPoly(cam.pts(TORSO)); }
// ribs: 10 pairs, light-blue bands curving from the sternum out and down around the sides
function ribPath(k, sgn) {
  const y0 = -200 + k * 36, out = 140 + 40 * Math.sin(Math.min(1, k / 4) * 1.57) - Math.max(0, k - 6) * 10;
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = sgn * (22 + out * (1 - (1 - u) * (1 - u))), y = y0 - 14 * Math.sin(u * 1.7) + u * u * u * (64 + k * 4);
    pts.push(x, y);
  }
  return pts;
}
function drawTorso(cam, t, o) {
  o = o || {};
  const z = cam.z;
  // body: translucent navy (dithered over the ground), glowing light-blue edge
  const m = torsoMask(cam);
  mFill(m, P.XR1); mFill(m, P.XR2, 0.35);
  mRim(m, P.XR4, 1, 0); mRim(m, P.XR4, -1, 0); mRim(m, P.XR3, 0, 1);
  mOutline(m, P.XR5);
  // lungs (faint) and the spine behind
  for (const sgn of [-1, 1]) {
    const lm = maskPoly(cam.pts([sgn * 30, -210, sgn * 120, -200, sgn * 182, -120, sgn * 192, 40, sgn * 176, 170, sgn * 60, 150, sgn * 34, 20, sgn * 28, -140]));
    mFill(lm, P.XR2, 0.55); mRim(lm, P.XR3, sgn, 0, 0.6);
  }
  for (let k = 0; k < 14; k++) { const y = -250 + k * 38; ellipse(cam.x(0), cam.y(y), Math.max(1, 13 * z), Math.max(1, 14 * z), P.XR2, 0.8); ellipse(cam.x(0), cam.y(y - 3), Math.max(1, 9 * z), Math.max(1, 6 * z), P.XR3, 0.6); }
  // neck: trachea rings
  for (let k = 0; k < 6; k++) { const y = -320 + k * 13; rect(cam.x(-16), cam.y(y), cam.x(16), cam.y(y + 6), P.XR3); rect(cam.x(-16), cam.y(y), cam.x(16), cam.y(y + 2), P.XR4); }
  // vascular tree (panel 2's red branching vessels) behind the bones
  if (o.vessels !== false) drawVesselTree(cam, t);
  // ribs, clavicles, sternum
  const ribW = Math.max(1.5, 13 * z);
  for (let k = 0; k < 10; k++) for (const sgn of [-1, 1]) tube(cam.pts(ribPath(k, sgn)), ribW, [P.XR2, P.XR3, P.XR4, P.XR5], 0.92);
  for (const sgn of [-1, 1]) tube(cam.pts(spline([sgn * 22, -222, sgn * 80, -240, sgn * 140, -236, sgn * 192, -248], 4)), Math.max(1.5, 13 * z), [P.XR3, P.XR4, P.XR5, P.XR6]);
  tube(cam.pts([0, -222, 0, 60]), Math.max(1.5, 26 * z), [P.XR2, P.XR3, P.XR4, P.XR5], 0.9);
}
// ---------------------------------------------------------------- vascular tree (deterministic branches)
const VTREE = [];
(function buildTree() {
  const grow = (x, y, a, len, w, depth, red) => {
    if (depth <= 0 || len < 10) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    VTREE.push([x, y, x2, y2, w, red]);
    const h = hash2(Math.round(x * 7), Math.round(y * 3));
    grow(x2, y2, a - 0.45 - 0.3 * h, len * 0.72, w * 0.7, depth - 1, red);
    grow(x2, y2, a + 0.4 + 0.3 * h, len * 0.68, w * 0.68, depth - 1, red);
  };
  for (const [x, y, a, red] of [[-40, -110, -2.6, 1], [60, -110, -0.5, 1], [-50, -60, 3.0, 1], [80, -60, 0.1, 1], [-60, 20, 2.7, 0], [90, 30, 0.35, 0], [-30, 80, 2.2, 1], [60, 90, 0.9, 1]])
    grow(x, y, a, 62, 9, 5, red);
})();
function drawVesselTree(cam, t) {
  const z = cam.z;
  for (const [x1, y1, x2, y2, w, red] of VTREE) {
    const ww = Math.max(1, w * z);
    lineW(cam.x(x1), cam.y(y1), cam.x(x2), cam.y(y2), ww, red ? P.HT2 : P.VN1);
    if (ww > 2) line(cam.x(x1), cam.y(y1) - ww * 0.25, cam.x(x2), cam.y(y2) - ww * 0.25, red ? P.HT4 : P.VN2);
  }
}
// ---------------------------------------------------------------- shaded tubes (vessels): round joins, lit side, shadow side
function tube(pts, w, cols, lv) {             // pts: flat screen coords; cols: [shadow, base, light, highlight]
  if (w < 1.5) { for (let i = 0; i + 3 < pts.length; i += 2) line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], cols[1], lv); return; }
  const layer = (k, off, col, joins) => {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const sgn = (nx * -0.6 + ny * -0.8) > 0 ? 1 : -1;          // toward the light (upper left)
      lineW(pts[i] + nx * off * sgn, pts[i + 1] + ny * off * sgn, pts[i + 2] + nx * off * sgn, pts[i + 3] + ny * off * sgn, w * k, col, lv);
    }
    if (joins) for (let i = 0; i < pts.length; i += 2) disc(pts[i], pts[i + 1], w * k / 2, col, lv);
  };
  layer(1, 0, cols[0], true); layer(0.78, w * 0.08, cols[1], true); layer(0.42, w * 0.2, cols[2], false);
  if (w > 5) layer(0.14, w * 0.3, cols[3], false);
}
const TUBE_RED = () => [P.HT1, P.HT2, P.HT3, P.HT5], TUBE_DARK = () => [P.HT0, P.HT1, P.HT2, P.HT3], TUBE_VEIN = () => [P.VN0, P.VN1, P.VN2, P.XR5];
// per-pixel "glossy organ" shading inside a mask: pseudo-sphere normal from an ellipse fit, dithered tones
function organShade(m, cx, cy, rx, ry, ramp, lx, ly) {
  lx = lx === undefined ? -0.5 : lx; ly = ly === undefined ? -0.62 : ly;
  const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H) continue;
    for (let i = 0; i < m.w; i++) {
      if (!m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue;
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, r2 = Math.min(0.98, nx * nx + ny * ny), nz = Math.sqrt(1 - r2);
      const l = nx * lx + ny * ly + nz * lz, ci = clamp((1.0 - l) * (ramp.length - 1) / 1.25, 0, ramp.length - 1);
      const i0 = Math.floor(ci), f = ci - i0;
      buf[y * W + x] = ramp[(f > bay(x, y) && i0 + 1 < ramp.length) ? i0 + 1 : i0];
    }
  }
}
// ---------------------------------------------------------------- the heart (anterior view; apex down to the viewer's right)
const HEART = {
  vent: [-58, -40, -72, -14, -72, 20, -58, 52, -30, 80, 4, 98, 34, 104, 52, 94, 70, 66, 84, 28, 82, -6, 70, -30, 44, -44, 8, -50, -28, -50],
  lad: [-6, -46, 0, -14, 8, 18, 18, 48, 30, 76, 40, 98],
  rca: [-52, -38, -68, -8, -66, 28, -48, 60, -18, 84],
  lcx: [24, -48, 54, -38, 74, -14, 84, 18],
};
function drawHeart(cam, hx, hy, sc, t, o) {
  o = o || {};
  const z = cam.z * sc, X = x => cam.x(hx + x * sc), Y = y => cam.y(hy + y * sc), beat = 1 + 0.03 * (o.beat || 0);
  const S = arr => { const out = []; for (let i = 0; i < arr.length; i += 2) out.push(X(arr[i] * beat), Y(arr[i + 1] * beat)); return out; };
  const SP = (arr, n, closed) => S(spline(arr, n || 5, closed));
  const RAMP_H = [P.HT6, P.HT5, P.HT4, P.HT3, P.HT2, P.HT1, P.HT0];
  // behind: descending aorta, left atrium, superior vena cava
  tube([X(54), Y(-122), X(66), Y(-76), X(70), Y(-40)], 24 * z, TUBE_DARK());
  const la = maskEll(X(54), Y(-52), 34 * z, 22 * z, 0); organShade(la, X(54), Y(-52), 34 * z, 22 * z, RAMP_H.slice(2));
  tube([X(-80), Y(-160), X(-78), Y(-100), X(-74), Y(-50)], 22 * z, TUBE_VEIN());
  // right atrium (with its appendage)
  const ra = maskEll(X(-74), Y(-28), 30 * z, 38 * z, 0.2); organShade(ra, X(-74), Y(-28), 30 * z, 38 * z, RAMP_H.slice(1));
  // the ventricles: smooth outline, glossy shading, a darker LV flank toward the apex
  const vpts = SP(HEART.vent, 6, true), vm = maskPoly(vpts);
  organShade(vm, X(-8), Y(24), 92 * z, 86 * z, RAMP_H);
  mRim(vm, P.HT0, -1, -1); mRim(vm, P.HT1, -2, -2);
  // interventricular groove shadow (where the LAD runs)
  const g = SP(HEART.lad, 4); for (let i = 0; i + 3 < g.length; i += 2) lineW(g[i] + 2 * z, g[i + 1] + 1 * z, g[i + 2] + 2 * z, g[i + 3] + 1 * z, 5 * z, P.HT1, 0.6);
  // glossy specks
  for (let k = 0; k < 14; k++) { const a = hash(k + 51), b = hash(k + 52); const px = X(-56 + a * 70), py = Y(-36 + b * 60); if (vm.get(Math.floor(px), Math.floor(py)) && b < 0.7) { pset(px, py, P.HT6); if (z > 1.6) { pset(px + 1, py, P.HT5); } } }
  // aorta arch, its three branches, the pulmonary trunk in front
  const ao = SP([4, -46, 0, -98, 16, -130, 44, -138, 62, -122], 5);
  for (const [bx, by] of [[14, -128], [30, -136], [46, -137]]) tube([X(bx), Y(by), X(bx + 2), Y(by - 26), X(bx - 2), Y(by - 44)], 9 * z, TUBE_RED());
  tube(ao, 26 * z, TUBE_RED());
  tube(SP([-28, -42, -22, -86, -42, -108, -64, -114], 4), 22 * z, TUBE_DARK());
  tube([X(-22), Y(-88), X(4), Y(-98), X(26), Y(-96)], 15 * z, TUBE_DARK());
  // coronary arteries (bright) and a cardiac vein (blue) on the surface, with small branches (clipped to the heart)
  const main = buf; TMP2.set(main);
  withBuffer(TMP2, () => drawCoronaries());
  for (let j = 0; j < vm.h; j++) { const y = vm.y0 + j; if (y < 0 || y >= H) continue; for (let i = 0; i < vm.w; i++) { if (!vm.d[j * vm.w + i]) continue; const x = vm.x0 + i; if (x < 0 || x >= W) continue; main[y * W + x] = TMP2[y * W + x]; } }
  function drawCoronaries() {
  const cor = (arr, w, cols) => tube(SP(arr, 4), Math.max(1, w * z), cols);
  cor(HEART.lad, 4.6, [P.HT1, P.HT4, P.HT5, P.HT6]); cor(HEART.rca, 4.4, [P.HT1, P.HT4, P.HT5, P.HT6]); cor(HEART.lcx, 4, [P.HT1, P.HT4, P.HT5, P.HT6]);
  for (let k = 0; k < 6; k++) cor([2 + k * 5, -14 + k * 18, 22 + k * 7, -6 + k * 19, 36 + k * 6, 4 + k * 18], 2.2, [P.HT1, P.HT3, P.HT4, P.HT5]);
  for (let k = 0; k < 4; k++) cor([-62 + k * 3, -4 + k * 18, -46 + k * 6, 4 + k * 20], 2.2, [P.HT1, P.HT3, P.HT4, P.HT5]);
  cor([-8, -34, -28, 4, -34, 46, -24, 76], 2.6, TUBE_VEIN());
  }
  // tracer glow in the myocardium (orange points: Tc-99m in perfused muscle)
  if (o.tracer > 0) {
    for (let k = 0; k < 30; k++) {
      const a = hash(k + 300), b = hash(k + 301), x = -54 + 128 * a, y = -30 + 120 * b;
      if (!vm.get(Math.floor(X(x)), Math.floor(Y(y)))) continue;
      const tw = 0.6 + 0.4 * Math.sin(t * 4 + k);
      tracerDot(X(x), Y(y), Math.max(1, (k === 0 ? 4.2 : 2.5) * z * o.tracer), tw, k === 0 && o.hero);
    }
  }
}
// a Tc-99m tracer marker: orange core, glow, sparkle
function tracerDot(x, y, r, tw, hero) {
  if (r < 1.2) { pset(x, y, P.OR4); return; }
  disc(x, y, r * 2.6, P.OR1, 0.25 * tw); disc(x, y, r * 1.7, P.OR2, 0.45 * tw);
  disc(x, y, r, P.OR3); disc(x - r * 0.3, y - r * 0.3, Math.max(1, r * 0.45), P.OR5);
  if (r > 2.5) for (let k = 0; k < 4; k++) { const a = k * 1.57 + tw; pset(x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1, P.OR4); }
  if (hero) ring(x, y, r * 2.4 + 1, 1, P.OR4, 0.8);
}
// ---------------------------------------------------------------- heart muscle tissue (panels 2 inset, 6, 9)
// fibres run along a direction; each fibre: rounded band, lit upper edge, shadowed lower edge, striations
// sine lookup (the texture loops below call sin hundreds of thousands of times per frame)
const SIN_N = 4096, SIN_T = new Float32Array(SIN_N);
for (let i = 0; i < SIN_N; i++) SIN_T[i] = Math.sin(i / SIN_N * TAU);
const fsin = x => SIN_T[((x * (SIN_N / TAU)) | 0) & (SIN_N - 1)];
function drawMuscle(cam, t, o) {
  o = o || {};
  const z = cam.z, ang = o.ang === undefined ? -0.35 : o.ang, ca = Math.cos(ang), sa = Math.sin(ang);
  const pitch = o.pitch || 46, wFib = pitch * 0.78, half = wFib / pitch / 2, ip = 1 / pitch;
  const iz = 1 / z, C = [P.MY0, P.MY1, P.MY2, P.MY3, P.MY4, P.MY5, P.MY6];
  for (let sy = 0; sy < H; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy, wx0 = (0.5 - cam.ax) * iz + cam.cx;
    let u = wx0 * ca + wy * sa, v = -wx0 * sa + wy * ca;
    const du = iz * ca, dv = -iz * sa, row = sy * W, by = (sy & 3) << 2;
    for (let sx = 0; sx < W; sx++, u += du, v += dv) {
      const k0 = Math.floor(v * ip);
      const wave = 6 * fsin(u * 0.012 + k0 * 1.7) + 3 * fsin(u * 0.031);
      const vv = v + wave, kf = vv * ip, k = Math.floor(kf), f = kf - k, d = f < 0.5 ? 0.5 - f : f - 0.5;
      let c;
      if (d > half) c = (BAYER[by | (sx & 3)] + 0.5) / 16 < 0.3 ? C[0] : C[1];
      else {
        const e = d / half;
        c = f < 0.5 ? (e > 0.82 ? C[6] : e > 0.55 ? C[5] : C[4]) : (e > 0.8 ? C[2] : e > 0.5 ? C[3] : C[4]);
        const st = u * 0.22 + k * 3.1, m = st - Math.floor(st / 3) * 3;
        if (m < 0.32 && e < 0.85) c = c === C[4] ? C[3] : C[4];                       // striations
        if (e < 0.6) { let h = (Math.floor(u / 9) * 73856093) ^ (k * 19349663) ^ 7; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); if (((h >>> 0) & 1023) > 952) c = C[6]; }   // nuclei glints
      }
      buf[row + sx] = c;
    }
  }
}
