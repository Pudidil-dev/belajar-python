'use strict';
// ============================================================================
// HUMAN BODY — anatomically proportioned models.
// (1) Coronal silhouette (cm, origin = vertex, +y towards the feet, viewer's
//     left = patient's right) with a whole-body PET maximum-intensity image:
//     physiological uptake (brain, myocardium, liver, kidneys, bladder, marrow,
//     bowel), a hot lung nodule and a mildly inflamed axillary node.
// (2) Axial chest slice (mm, radiology convention: viewer's left = patient's
//     right, anterior up, patient supine on the pallet) in tissue, CT and PET.
// ============================================================================
const HEAD_R = [0, 0, 5.4, 0.8, 7.7, 3.9, 8.3, 8.6, 8.9, 10.6, 8.7, 13.4, 7.6, 14.6, 6.7, 17.4, 4.7, 20.5, 2.3, 22.1, 0, 22.6];
const TORSO_R = [0, 21, 5.4, 21.4, 5.9, 25.4, 7.6, 27.6, 13, 29.3, 18.4, 30.8, 20.2, 33.2, 17.9, 36.2, 16.4, 38.6, 16.0, 44, 15.0, 52, 13.6, 60, 14.1, 68,
  16.3, 76, 17.3, 84, 16.6, 94, 15.4, 106, 13.9, 118, 12.7, 128, 8.6, 129.6, 4.4, 128.2, 2.7, 112, 1.7, 100, 0.7, 94.2, 0, 93.4];
const ARM_R = [17, 29.8, 21.4, 31.4, 23.2, 35.8, 23.7, 44, 23.5, 52, 23.9, 58, 24.6, 66, 24.6, 74, 23.9, 80.6, 24.5, 86, 23.9, 92, 21.9, 95.6, 20.1, 93.2,
  19.6, 87, 20.2, 80.6, 20.0, 72, 19.8, 64, 19.4, 58, 19.0, 50, 18.4, 42, 17.4, 37.6, 16.4, 33];
const BODYP = {};
function bodyInit() {
  BODYP.head = splineClosed(mirrorClosed(HEAD_R, 0), 4);
  BODYP.torso = splineClosed(mirrorClosed(TORSO_R, 0), 3);
  BODYP.armR = splineClosed(ARM_R, 3);
  BODYP.armL = BODYP.armR.map((v, i) => i % 2 ? v : -v);
  sliceInit();
}
// whole-body PET uptake (relative activity, 0..1) at body point (x, y) in cm
const LESION = [-8.5, 44.2];
function petAct(x, y) {
  let a = 0.12;
  const E = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  const eb = E(0, 9.2, 7.1, 6.8); if (eb < 1) a = Math.max(a, 0.66 + 0.2 * clamp((Math.sqrt(eb) - 0.55) / 0.4, 0, 1));   // brain (cortex brighter)
  if (E(0, 15.6, 4.2, 2.2) < 1) a = Math.max(a, 0.58);                                               // cerebellum
  for (const sx of [-3.6, 3.6]) if (E(sx, 19.6, 1.6, 1.2) < 1) a = Math.max(a, 0.34);               // salivary / tonsils
  { const d = Math.hypot(x - 4.6, (y - 47.2) * 1.15), ang = Math.atan2(y - 47.2, x - 4.6); if (Math.abs(d - 3.5) < 1.1 && !(ang < -0.6 && ang > -2.2)) a = Math.max(a, 0.62); } // LV myocardium
  if (E(1.2, 44, 4.5, 6) < 1) a = Math.max(a, 0.21);                                                   // cardiac blood pool
  if (E(-6.6, 57, 9.6, 6.2) < 1) a = Math.max(a, 0.31);                                                 // liver
  if (E(11.4, 56.2, 3.0, 4.6) < 1) a = Math.max(a, 0.27);                                               // spleen
  for (const [kx, ky] of [[-7.0, 66.2], [7.2, 63.6]]) { const e = E(kx, ky, 2.8, 5.2); if (e < 1) a = Math.max(a, e < 0.3 ? 0.8 : 0.42); }  // kidneys
  const eu = E(0, 89, 4.9, 3.7); if (eu < 1) a = Math.max(a, 1.0 - 0.1 * eu);                           // bladder (excreted tracer)
  if (Math.abs(x) < 1.3 && y > 27 && y < 82) a = Math.max(a, 0.21);                                     // vertebral marrow
  for (const sx of [-1, 1]) { const ux = lerp(sx * 6.8, sx * 2.6, clamp((y - 68) / 18, 0, 1)); if (y > 70 && y < 86 && Math.abs(x - ux) < 0.4) a = Math.max(a, 0.3); }  // ureters
  if (y > 68 && y < 84 && Math.abs(x) < 9) { const b = vn2(x * 0.45, y * 0.45, 77); if (b > 0.62) a = Math.max(a, 0.22 + (b - 0.62) * 0.6); }   // bowel
  for (const sx of [-1, 1]) { const e = E(sx * 10, 80, 5.2, 3.6); if (e < 1 && e > 0.45 && y < 81) a = Math.max(a, 0.16); }  // iliac crest marrow
  const el = Math.hypot(x - LESION[0], y - LESION[1]); if (el < 1.5) a = Math.max(a, 0.97 - 0.25 * (el / 1.5) ** 2); // hot lung nodule
  if (Math.hypot(x - 13.4, y - 37.2) < 0.95) a = Math.max(a, 0.5);                                       // inflamed axillary node
  return a;
}
const BODYCACHE = [];
// draw the PET MIP inside the body silhouette. vox = voxel size in cm (PET resolution ~0.4 cm)
function drawPETBody(cam, opt) {
  opt = opt || {};
  const key = [cam.cx, cam.cy, cam.z, cam.ax, cam.ay, opt.mono ? 1 : 0].join('|');
  for (const c of BODYCACHE) if (c.key === key) { buf.set(c.img); return; }
  clear(opt.bg === undefined ? P.BG : opt.bg);
  const ms = [maskPoly(cam.pts(BODYP.head)), maskPoly(cam.pts(BODYP.torso)), maskPoly(cam.pts(BODYP.armR)), maskPoly(cam.pts(BODYP.armL))];
  const inb = new Uint8Array(W * H);
  for (const m of ms) for (let j = 0; j < m.h; j++) { const y = m.y0 + j; if (y < 0 || y >= H) continue; for (let i = 0; i < m.w; i++) { const x = m.x0 + i; if (x >= 0 && x < W && m.d[j * m.w + i]) inb[y * W + x] = 1; } }
  const vox = 0.4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inb[y * W + x]) continue;
    const wx = cam.wx(x + 0.5), wy = cam.wy(y + 0.5), qx = (Math.floor(wx / vox) + 0.5) * vox, qy = (Math.floor(wy / vox) + 0.5) * vox;
    const n = (hash2(Math.floor(wx / vox), Math.floor(wy / vox)) - 0.5) * 0.03;       // statistical noise of a real reconstruction
    const a = petAct(qx, qy) + n;
    buf[y * W + x] = opt.mono ? (a > 0.5 ? P.CT6 : a > 0.3 ? P.CT5 : a > 0.18 ? P.CT4 : P.CT3) : heatCol(a, x, y);
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!inb[i] && (inb[i - 1] || inb[i + 1] || inb[i - W] || inb[i + W])) buf[i] = opt.mono ? P.CT2 : P.HM2; }
  BODYCACHE.push({ key, img: buf.slice() }); if (BODYCACHE.length > 4) BODYCACHE.shift();
}
// ---------------------------------------------------------------- axial chest slice (mm)
const AX = {};
const AX_BODY_R = [0, -104, 40, -108, 80, -104, 118, -92, 148, -68, 164, -36, 170, 0, 166, 40, 154, 72, 132, 94, 96, 108, 50, 114, 0, 116];
const AX_LUNG_R = [-18, -72, -56, -82, -96, -72, -122, -44, -129, -6, -125, 34, -108, 64, -80, 78, -48, 76, -27, 60, -22, 30, -28, 0, -24, -36];
const AX_LUNG_L = [40, -76, 80, -82, 112, -64, 126, -34, 130, 0, 124, 36, 106, 66, 78, 78, 50, 74, 38, 54, 46, 30, 64, 8, 60, -22, 44, -50];
const AX_LESION = [-70, -26, 9];
function sliceInit() {
  AX.body = splineClosed(mirrorClosed(AX_BODY_R, 0), 4);
  AX.wall = AX.body.map(v => v * 0.9);
  AX.lungR = splineClosed(AX_LUNG_R, 3); AX.lungL = splineClosed(AX_LUNG_L, 3);
  AX.ribs = [];
  for (const sg of [-1, 1]) for (let i = 0; i < 7; i++) {
    const f = (i + 0.6) / 7.2, ph = lerp(0.42, 2.72, f), x = sg * 150 * Math.sin(ph), y = -98 * Math.cos(ph) - 4;
    AX.ribs.push([x, y, Math.atan2(98 * Math.sin(ph), sg * 150 * Math.cos(ph))]);
  }
}
// tissue code at a world point given polygon flags
function axTissue(x, y, inBody, deep, inLung) {
  if (!inBody) return (y > 118 && y < 131 + 0.0004 * x * x && Math.abs(x) < 196) ? 10 : 0;
  if ((x - AX_LESION[0]) ** 2 + (y - AX_LESION[1]) ** 2 < AX_LESION[2] ** 2) return 8;
  const vb = Math.hypot(x, (y - 66) * 1.05);
  if (vb < 17) return vb > 14.5 ? 6 : 9;                                         // vertebral body: cortex + marrow
  if (Math.hypot(x, y - 90) < 8.5) return 11;                                    // spinal canal
  { const d = Math.hypot(x, y - 90); if (d < 15 && d > 8.5 && y > 84) return 6; } // lamina
  if (Math.abs(x) < 4 && y > 100 && y < 112) return 6;                           // spinous process
  if (Math.abs(Math.abs(x) - 24) < 6 && Math.abs(y - 80) < 4) return 6;          // transverse processes
  if (Math.abs(x) < 12 && Math.abs(y + 94) < 6) return 6;                         // sternum
  for (const [rx, ry, ra] of AX.ribs) { const c = Math.cos(ra), s = Math.sin(ra), u = (x - rx) * c + (y - ry) * s, v = -(x - rx) * s + (y - ry) * c; if ((u / 4.5) ** 2 + (v / 8) ** 2 < 1) return 6; }
  for (const sg of [-1, 1]) { const u = (x - sg * 104) * Math.cos(sg * 0.55) + (y - 92) * Math.sin(sg * 0.55), v = -(x - sg * 104) * Math.sin(sg * 0.55) + (y - 92) * Math.cos(sg * 0.55); if ((u / 30) ** 2 + (v / 5) ** 2 < 1) return 6; }  // scapulae
  if (Math.hypot(x - 26, y - 46) < 12.5) return Math.hypot(x - 26, y - 46) > 10.5 ? 2 : 5;   // descending aorta
  if (Math.hypot(x - 6, y - 36) < 6.5) return 7;                                  // oesophagus
  { // heart: long axis from posterior-right to anterior-left (apex towards the viewer's upper right)
    const c = Math.cos(-0.45), s = Math.sin(-0.45), u = (x - 16) * c + (y + 22) * s, v = -(x - 16) * s + (y + 22) * c, e = (u / 54) ** 2 + (v / 40) ** 2;
    if (e < 1) {
      const lv = ((x - 34) / 17) ** 2 + ((y + 24) / 13) ** 2, rv = ((x + 6) / 20) ** 2 + ((y + 44) / 9) ** 2, la = ((x - 8) / 16) ** 2 + ((y - 4) / 10) ** 2;
      if (lv < 1 || rv < 1 || la < 1) return 5;
      return e > 0.86 ? 12 : 4;                                                   // epicardial fat rim / myocardium
    }
  }
  if (inLung) return 3;
  return deep ? 2 : 1;                                                            // muscle + soft tissue / subcutaneous fat
}
function axAct(code, x, y) { // relative FDG uptake
  const lz = Math.hypot(x - AX_LESION[0], y - AX_LESION[1]);
  let a = [0, 0.06, 0.12, 0.03, 0.62, 0.22, 0.05, 0.14, 0.95, 0.2, 0.08, 0.04, 0.08][code] || 0;
  if (code === 4 && Math.hypot(x - 34, y + 24) > 27) a = 0.24;                   // the left-ventricular wall takes up most
  if (lz < 16) a = Math.max(a, 0.95 * gauss(lz / 9));
  return a;
}
const AXCACHE = [];
// mode: 'tissue' | 'ct' | 'pet' | 'fused'; opt.alpha = PET overlay strength for fused
function drawSlice(cam, mode, opt) {
  opt = opt || {};
  const cl = opt.clip || [0, 0, W, H];
  const key = [cam.cx, cam.cy, cam.z, cam.ax, cam.ay, mode, opt.alpha || 0, cl.join(','), opt.transparent ? 1 : 0].join('|');
  if (!opt.transparent) for (const c of AXCACHE) if (c.key === key) { for (let y = cl[1]; y < cl[3]; y++) buf.set(c.img.subarray(y * W + cl[0], y * W + cl[2]), y * W + cl[0]); return; }
  const mb = maskPoly(cam.pts(AX.body)), mw = maskPoly(cam.pts(AX.wall)), ml = maskPoly(cam.pts(AX.lungR)), ml2 = maskPoly(cam.pts(AX.lungL));
  const pal = {
    tissue: [opt.bg === undefined ? P.BG : opt.bg, P.TI1, P.TI2, P.LU1, P.TI3, P.RB1, P.BO2, P.TI2, P.TI4, P.BO0, P.PA1, P.TI0, P.FA1],
    ct: [P.K0, P.CT2, P.CT3, P.CT1, P.CT4, P.CT4, P.CT6, P.CT3, P.CT4, P.CT5, P.CT2, P.CT3, P.CT2],
  };
  for (let y = Math.max(0, cl[1]); y < Math.min(H, cl[3]); y++) for (let x = Math.max(0, cl[0]); x < Math.min(W, cl[2]); x++) {
    const wx = cam.wx(x + 0.5), wy = cam.wy(y + 0.5);
    const inB = mb.get(x, y), code = axTissue(wx, wy, inB, mw.get(x, y), ml.get(x, y) || ml2.get(x, y));
    if (opt.transparent && code === 0) continue;
    let c;
    if (mode === 'tissue') { c = pal.tissue[code]; if (code === 3 && hash2(Math.floor(wx / 6), Math.floor(wy / 6)) > 0.86) c = P.TI1; if (code === 1 && bay(x, y) < 0.3) c = P.TI2; }
    else if (mode === 'ct') { c = pal.ct[code]; if (code === 3 && hash2(Math.floor(wx / 5), Math.floor(wy / 5)) > 0.88) c = P.CT3; if (code === 0) c = P.K0; }
    else {
      const a = code === 0 || code === 10 ? 0 : axAct(code, wx, wy) + (hash2(Math.floor(wx / 4), Math.floor(wy / 4)) - 0.5) * 0.04;
      if (mode === 'pet') c = code === 0 ? P.K0 : heatCol(a, x, y);
      else { c = pal.ct[code]; if (code === 0) c = P.K0; if (a > 0.26 && bay(x, y) < (opt.alpha || 1) * clamp((a - 0.26) * 2.4, 0, 0.92)) c = heatCol(a, x, y); }
    }
    buf[y * W + x] = c;
  }
  if (mode === 'tissue') mOuter(mb, P.TI4);
  if (opt.transparent) return;
  const img = new Uint32Array(W * H); for (let y = cl[1]; y < cl[3]; y++) img.set(buf.subarray(y * W + cl[0], y * W + cl[2]), y * W + cl[0]);
  AXCACHE.push({ key, img }); if (AXCACHE.length > 6) AXCACHE.shift();
}
