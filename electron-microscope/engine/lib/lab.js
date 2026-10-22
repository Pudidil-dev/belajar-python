// LAB — the room the micrograph comes from: the operator's workstation (the micrograph on its monitor with the scale
// bar, scan settings, the live detector signal and a line profile), and behind it the microscope standing on its
// vibration-isolation platform, with electronics racks, pumps and cables. World units are centimetres, floor at y = 0,
// up is −y. The microscope's beam axis is x = LAB.AX; the cutaway in column.js uses the same coordinates.
(() => {
const { P, W, H } = PIX;
const LAB = window.LAB = {};
const AX = LAB.AX = 35;                                                   // beam axis
const h = U.hash, clamp = U.clamp;
// monitor: screen 56 × 33.9 cm showing an 860 × 520 texture; the micrograph sits at (12, 32) at 1:1 (270 × 480)
const MON = LAB.MON = { cx: -62, cy: -112, w: 56, h: 33.9, tw: 860, th: 520, ix: 12, iy: 32 };
MON.k = MON.w / MON.tw;                                                    // cm per texture pixel
MON.x0 = MON.cx - MON.w / 2; MON.y0 = MON.cy - MON.h / 2;
// world position of a micrograph pixel (image px → cm) and the camera that shows the micrograph 1:1, filling the frame
LAB.imgW = (px, py) => [MON.x0 + (MON.ix + px) * MON.k, MON.y0 + (MON.iy + py) * MON.k];
LAB.cam11 = () => { const [x, y] = LAB.imgW(HA.IW / 2, HA.IH / 2); return { x, y, z: 1 / MON.k }; };

// ---------- the monitor's screen (an offscreen texture, redrawn per frame) ----------
const cv = (w, h_) => { const c = document.createElement('canvas'); c.width = w; c.height = h_; return c; };
const TEX = cv(MON.tw, MON.th), tx = TEX.getContext('2d');
const MIPS = [TEX]; for (let k = 1; k < 6; k++) MIPS.push(cv(Math.ceil(MON.tw / 2 ** k), Math.ceil(MON.th / 2 ** k)));
const R = (c, x, y, w, h_, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, h_); };
const box = (c, x, y, w, h_, title) => {
  R(c, x, y, w, h_, 'g1'); R(c, x, y, w, 1, 'g3'); R(c, x, y, 1, h_, 'g3'); R(c, x, y + h_ - 1, w, 1, 'k'); R(c, x + w - 1, y, 1, h_, 'k');
  R(c, x + 1, y + 1, w - 2, 11, 'g2'); PIX.text(c, title, x + 5, y + 3, 'g8', { shadow: null });
};
const HOOK_LINE = () => { const a = HA.AU[HA.HOOK], [px, py] = HA.px(a.x, a.y); return [px - 22, py, px + 22, py]; };
LAB.hookLine = HOOK_LINE;
// o: {t, rows, cols (partial scan), live (detector trace scrolls), beam (status)}
LAB.screen = (t, o = {}) => {
  const c = tx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  R(c, 0, 0, MON.tw, MON.th, 'g0');
  // title bar
  R(c, 0, 0, MON.tw, 22, 'g2'); R(c, 0, 22, MON.tw, 1, 'k');
  PIX.text(c, 'STEM IMAGING', 8, 8, 'w', { shadow: null }); PIX.text(c, 'HAADF', 96, 8, 'c3', { shadow: null });
  PIX.text(c, '200 kV', 140, 8, 'g8', { shadow: null }); PIX.text(c, 'ACQUIRE', 760, 8, 'g8', { shadow: null });
  R(c, 742, 8, 7, 7, (o.beam ?? 1) ? 'e2' : 'g4');
  // the micrograph (partial while it is being scanned) with its 1 nm scale bar
  R(c, MON.ix - 1, MON.iy - 1, HA.IW + 2, HA.IH + 2, 'g3'); R(c, MON.ix, MON.iy, HA.IW, HA.IH, 'k');
  c.save(); c.translate(MON.ix, MON.iy); HA.draw(c, 0, 0, HA.IW, HA.IH, { rows: o.rows, cols: o.cols }); c.restore();
  if ((o.rows ?? HA.IH) < HA.IH - 1) { const y = MON.iy + Math.floor(o.rows) + 1; R(c, MON.ix, y, HA.IW, 1, 'c0'); }
  const sb = 1 / HA.NM;                                                   // 1 nm = 40 px
  R(c, MON.ix + 26, MON.iy + HA.IH - 16, sb, 3, 'w'); PIX.text(c, '1 nm', MON.ix + 26 + sb / 2, MON.iy + HA.IH - 27, 'w', { align: 'center' });   // clear of the atom at the corner
  // scan settings
  const X = 296;
  box(c, X, 32, 270, 116, 'SCAN SETTINGS');
  [['MODE', 'HAADF-STEM'], ['VOLTAGE', '200 kV'], ['PROBE CURRENT', '30 pA'], ['FRAME', '270 x 480 px'], ['PIXEL SIZE', '0.025 nm'],
    ['DWELL TIME', '2 µs'], ['DETECTOR', '70-200 mrad'], ['CORRECTOR', 'ON']].forEach(([a, b], i) => {
    PIX.text(c, a, X + 8, 50 + i * 12, 'g6', { shadow: null }); PIX.text(c, b, X + 262, 50 + i * 12, i === 7 ? 'e2' : 'ga', { shadow: null, align: 'right' });
  });
  // live detector signal: the intensity along the line being scanned
  box(c, X, 156, 270, 110, 'DETECTOR SIGNAL');
  R(c, X + 8, 172, 254, 86, 'k');
  for (let gx = 0; gx <= 254; gx += 32) R(c, X + 8 + gx, 172, 1, 86, 'g1');
  const row = Math.floor(K.wrap(t * 61, HA.IH)), base = 254;
  let py = null;
  for (let i = 0; i < 254; i++) {
    const v = HA.D[row * HA.IW + Math.floor(i * HA.IW / 254)], yy = 172 + 84 - Math.round(v * 80);
    if (py != null) { const a = Math.min(py, yy), b = Math.max(py, yy); R(c, X + 8 + i, a, 1, b - a + 1, 'e2'); }
    py = yy;
  }
  PIX.text(c, 'LINE ' + String(row).padStart(3, '0'), X + 210, 160, 'g6', { shadow: null });
  // line profile across the hook atom (the same measurement the opening draws big)
  box(c, X, 274, 270, 150, 'LINE PROFILE');
  R(c, X + 8, 290, 254, 112, 'k');
  const [l0, l1, l2, l3] = HOOK_LINE(), n = 44, pr = HA.profile(l0, l1, l2, l3, n), fit = HA.fit(l0, l1, l2, l3, n, HA.AU[HA.HOOK]);
  for (let i = 0; i < n; i++) {
    const x = X + 12 + Math.round(i * 246 / (n - 1));
    const yf = 398 - Math.round(fit[i] * 100); R(c, x, yf, 6, 1, 'r2');
    const yp = 398 - Math.round(pr[i] * 100); R(c, x, yp, 2, 2, 'w');
  }
  PIX.text(c, 'INTENSITY', X + 10, 293, 'g6', { shadow: null }); PIX.text(c, 'POSITION (nm)', X + 258, 407, 'g6', { shadow: null, align: 'right' });
  // status
  box(c, X, 432, 270, 80, 'COLUMN');
  [['GUN VACUUM', '2E-9 Pa'], ['COLUMN', '1E-5 Pa'], ['EMISSION', '8 µA'], ['STAGE', 'X 0.12  Y -0.04 mm']].forEach(([a, b], i) => {
    PIX.text(c, a, X + 8, 450 + i * 13, 'g6', { shadow: null }); PIX.text(c, b, X + 262, 450 + i * 13, 'ga', { shadow: null, align: 'right' });
  });
  // a second column of panels: the histogram and the frame list
  const X2 = 576;
  box(c, X2, 32, 276, 116, 'HISTOGRAM');
  const hist = new Array(64).fill(0); for (let i = 0; i < HA.D.length; i += 7) hist[Math.min(63, Math.floor(HA.D[i] * 64))]++;
  const hm = Math.max(...hist);
  for (let i = 0; i < 64; i++) { const hh = Math.round(Math.sqrt(hist[i] / hm) * 84); R(c, X2 + 10 + i * 4, 140 - hh, 3, hh, i > 40 ? 'w' : 'g6'); }
  box(c, X2, 156, 276, 356, 'FRAMES');
  for (let k = 0; k < 4; k++) {
    const yy = 174 + k * 84; R(c, X2 + 10, yy, 42, 74, 'k');
    c.save(); c.translate(X2 + 10, yy); HA.draw(c, 0, 0, 42, 74); c.restore();
    PIX.text(c, 'FRAME ' + String(41 + k).padStart(3, '0'), X2 + 62, yy + 6, k === 3 ? 'w' : 'g7', { shadow: null });
    PIX.text(c, '270 x 480  2 µs', X2 + 62, yy + 20, 'g5', { shadow: null });
    if (k === 3) R(c, X2 + 8, yy - 2, 2, 78, 'c2');
  }
  // mips
  for (let k = 1; k < MIPS.length; k++) { const m = MIPS[k].getContext('2d'); m.imageSmoothingEnabled = true; m.clearRect(0, 0, MIPS[k].width, MIPS[k].height); m.drawImage(MIPS[k - 1], 0, 0, MIPS[k].width, MIPS[k].height); }
  return TEX;
};
// draw the screen texture into the monitor rectangle under the current world transform
LAB.drawScreen = c => {
  const m = c.getTransform(), s = Math.hypot(m.a, m.b) * MON.k;           // screen px per texture px
  let L = 0; if (s < 1) L = Math.min(MIPS.length - 1, Math.max(0, Math.floor(Math.log2(1 / s))));
  c.save(); c.imageSmoothingEnabled = s < 1; c.drawImage(MIPS[L], 0, 0, MIPS[L].width, MIPS[L].height, MON.x0, MON.y0, MON.w, MON.h); c.restore();
};

// ---------- flat-shaded primitives in world units ----------
const rr = (x, y, w, h_, r = 0) => PIX.rectPath(x, y, w, h_, r);
const F = (c, path, base, sh, hi, sv = 0.8) => PIX.flat(c, path, base, sh, hi, [sv, sv * 0.25], [sv * 0.5, sv * 0.2]);
LAB.F = F; LAB.rr = rr;
const fillR = (c, x, y, w, h_, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, h_); };
LAB.fillR = fillR;

// ---------- the room ----------
function room(c, z, t) {
  fillR(c, -400, -360, 800, 360, 'n0');                                    // back wall
  for (let i = -6; i <= 6; i++) {                                          // acoustic panels
    const x = i * 46 - 20; fillR(c, x, -330, 40, 150, 'n1'); fillR(c, x, -330, 40, 1.2, 'n2');
    if (z > 2.2) for (let yy = -324; yy < -184; yy += 6) for (let xx = x + 4; xx < x + 38; xx += 6) fillR(c, xx, yy, 1, 1, 'n2');
  }
  fillR(c, -400, -175, 800, 4, 'n1');                                      // rail
  fillR(c, -400, -362, 800, 22, 'k');                                      // ceiling
  for (let i = -3; i <= 3; i++) { fillR(c, i * 90 - 25, -341, 50, 2.5, 'g5'); if (z > 1.6) fillR(c, i * 90 - 22, -339, 44, 1, 'gb'); }
  fillR(c, -400, 0, 800, 60, 'n1'); fillR(c, -400, 0, 800, 1.5, 'n3');       // floor
  for (let i = -10; i <= 10; i++) fillR(c, i * 40, 0, 1, 60, 'n2');
}
// electronics racks with blinking LEDs
function rack(c, x, w, h_, t, seed, z) {
  F(c, rr(x, -h_, w, h_, 1), 'g2', 'g1', 'g3');
  for (let k = 0; k < Math.floor(h_ / 18); k++) {
    const y = -h_ + 6 + k * 18; fillR(c, x + 3, y, w - 6, 14, 'g1'); fillR(c, x + 3, y, w - 6, 0.8, 'g3');
    for (let j = 0; j < 4; j++) {
      const on = h(k * 7 + j, seed + Math.floor(t * (1.5 + h(k, j + seed) * 3))) > 0.45;
      fillR(c, x + 6 + j * 4, y + 4, 2, 2, on ? ['e2', 'c3', 'y3', 'e2'][j] : 'g3');
    }
    if (z > 1.8) fillR(c, x + w - 18, y + 4, 12, 6, 'k');
  }
}
// ---------- the workstation ----------
function desk(c, z, t, o) {
  fillR(c, -140, -76, 140, 3, 'g4'); fillR(c, -140, -73, 140, 1, 'g2');
  F(c, rr(-136, -73, 6, 73), 'g3', 'g2', 'g4'); F(c, rr(-12, -73, 6, 73), 'g3', 'g2', 'g4');
  F(c, rr(-128, -73, 34, 40), 'g2', 'g1', 'g3'); for (let k = 0; k < 3; k++) fillR(c, -114, -66 + k * 13, 8, 1, 'g5');
  // keyboard and the two control panels (knobs and a trackball)
  F(c, rr(-84, -79, 40, 3, 0.6), 'g3', 'g1', 'g5');
  for (const px of [-118, -30]) {
    F(c, rr(px, -82, 22, 6, 1), 'g2', 'g1', 'g4');
    for (let k = 0; k < 3; k++) { fillR(c, px + 3 + k * 6, -84, 3, 2, 'g6'); fillR(c, px + 3 + k * 6, -84, 1, 1, 'g8'); }
  }
  F(c, rr(-56, -80, 6, 4, 1), 'g3', 'g1', 'g5');                          // mouse
  F(c, rr(-128, -81, 10, 5, 1), 'u1', 'u0', 'u2'); fillR(c, -127, -80, 8, 1, 'u3');   // a grid box
  // the second monitor: column status
  F(c, rr(-131, -128, 26, 2.5), 'g2', 'g1', 'g4'); F(c, rr(-119.5, -102, 3, 26), 'g2', 'g1', 'g3');
  F(c, rr(-134, -132, 32, 26, 1), 'g1', 'k', 'g3'); fillR(c, -132.5, -130.5, 29, 23, 'k');
  for (let k = 0; k < 6; k++) { const v = 0.5 + 0.4 * Math.sin(t * 2 + k * 1.3); fillR(c, -131, -127 + k * 3.4, 22 * v, 1.6, ['c2', 'c2', 'm3', 'm3', 'y3', 'e2'][k]); }
  // the main monitor
  F(c, rr(MON.cx - 3, MON.y0 + MON.h, 6, 18), 'g3', 'g2', 'g4'); F(c, rr(MON.cx - 14, -79, 28, 3, 1), 'g3', 'g2', 'g5');
  F(c, rr(MON.x0 - 1.6, MON.y0 - 1.6, MON.w + 3.2, MON.h + 3.6, 1.2), 'g1', 'k', 'g3');
  LAB.drawScreen(c);
  fillR(c, MON.cx - 1, MON.y0 + MON.h + 0.8, 2, 0.6, 'e2');
}
// ---------- the microscope, outside ----------
// shells of the column from the top (y0..y1, half-width), used here and by the cutaway
LAB.SEC = [
  ['tank', -300, -266, 32], ['gun', -266, -248, 17], ['acc', -248, -222, 16], ['valve', -222, -219, 20], ['cond', -219, -190, 20],
  ['corr', -190, -150, 24], ['obj', -150, -110, 22], ['det', -110, -78, 30], ['cam', -78, -60, 20], ['base', -60, -14, 45], ['iso', -14, 0, 70],
];
function microscope(c, z, t, o) {
  const X = AX;
  // HV cable from the tank to the ceiling
  K.pipe(c, [[X + 12, -300], [X + 14, -318], [X + 30, -330], [X + 52, -345]], 5, 'g2', 'g3', 'g1');
  // isolation platform and its pneumatic isolators
  F(c, rr(X - 70, -14, 140, 10), 'g3', 'g2', 'g5'); fillR(c, X - 70, -4, 140, 4, 'g1');
  for (const ix of [-62, -40, 40, 62]) F(c, rr(X + ix - 5, -14, 10, 10, 1.5), 'g4', 'g2', 'g6');
  fillR(c, X - 70, -14.5, 140, 1, 'y2');
  // base frame
  F(c, rr(X - 45, -60, 90, 46, 2), 'g3', 'g2', 'g5', 4); fillR(c, X - 40, -52, 80, 1, 'g2'); fillR(c, X - 40, -30, 80, 1, 'g2');
  for (const s of [-1, 1]) F(c, rr(X + s * 38 - 4, -60, 8, 46), 'g2', 'g1', 'g4');
  // turbo pump and its line up to the airlock
  K.pipe(c, [[X + 58, -40], [X + 58, -96], [X + 46, -110]], 4, 'g5', 'g7', 'g3');
  F(c, rr(X + 50, -44, 16, 30, 3), 'g6', 'g4', 'g8'); fillR(c, X + 52, -40, 12, 2, 'g4');
  const sp = t * 9; for (let k = 0; k < 3; k++) fillR(c, X + 53 + K.wrap(sp + k * 3.5, 10), -34, 1, 6, 'g3');
  // camera, detector/viewing chamber
  F(c, rr(X - 20, -78, 40, 18, 2), 'g2', 'g1', 'g4'); fillR(c, X - 14, -72, 10, 4, 'k'); fillR(c, X - 13, -71, 3, 1, 'c2');
  F(c, rr(X - 30, -110, 60, 32, 4), 'ga', 'g7', 'gb', 4);
  F(c, rr(X - 42, -100, 12, 10, 2), 'g8', 'g6', 'ga'); fillR(c, X - 44, -97, 3, 4, 'g4');      // HAADF detector port
  c.save(); c.fillStyle = P.g7; c.beginPath(); c.arc(X, -94, 7, 0, U.TAU); c.fill(); c.fillStyle = P.k; c.beginPath(); c.arc(X, -94, 5.6, 0, U.TAU); c.fill();   // viewing window
  c.fillStyle = P.e0; c.beginPath(); c.arc(X + 0.6, -93.4, 4.4, 0, U.TAU); c.fill(); c.fillStyle = P.e1; c.fillRect(X - 2.6, -94.4, 4, 1); c.restore();
  F(c, rr(X - 33, -82, 66, 4, 1), 'g8', 'g6', 'ga');
  // objective / specimen section with the goniometer, airlock and holder
  F(c, rr(X - 22, -150, 44, 40, 2), 'gb', 'g8', 'w', 4); fillR(c, X - 22, -132, 44, 2, 'g8');
  F(c, rr(X - 46, -140, 24, 18, 2), 'g4', 'g2', 'g6');                      // column ion pump
  for (let k = 0; k < 5; k++) fillR(c, X - 44 + k * 4.4, -138, 2, 14, 'g3');
  F(c, rr(X + 22, -138, 26, 26, 3), 'g8', 'g6', 'ga');                      // goniometer
  c.save(); c.fillStyle = P.g6; c.beginPath(); c.arc(X + 35, -125, 9, 0, U.TAU); c.fill(); c.fillStyle = P.g9; c.beginPath(); c.arc(X + 34, -126, 6.5, 0, U.TAU); c.fill(); c.restore();
  if (!o.noHolder) {
    F(c, rr(X + 41, -126.5, 48, 3, 1.4), 'g9', 'g6', 'gb');                 // holder rod
    F(c, rr(X + 88, -129, 14, 8, 2), 'g1', 'k', 'g3'); fillR(c, X + 91, -127, 8, 1, 'g4');
  }
  // corrector: wider, banded, with its cable bundles
  F(c, rr(X - 24, -190, 48, 40, 3), 'gb', 'g8', 'w', 4);
  for (let k = 0; k < 4; k++) { fillR(c, X - 24, -183 + k * 9, 48, 1.4, 'g8'); for (let j = 0; j < 5; j++) fillR(c, X - 20 + j * 9, -186 + k * 9, 4, 2, 'g6'); }
  fillR(c, X - 24, -171, 48, 2, 'c1'); fillR(c, X - 24, -171, 48, 0.8, 'c3');
  K.pipe(c, [[X + 24, -180], [X + 40, -176], [X + 52, -150], [X + 54, -60]], 2.4, 'g2', 'g3', 'g1');
  K.pipe(c, [[X + 24, -164], [X + 34, -160], [X + 44, -140]], 2, 'g2', 'g3', 'g1');
  // condenser section, gun valve, accelerator, gun with its ion pump, HV tank
  F(c, rr(X - 20, -219, 40, 29, 2), 'gb', 'g8', 'w', 4); fillR(c, X - 20, -205, 40, 1.4, 'g8');
  F(c, rr(X - 20, -222, 40, 3, 1), 'g7', 'g5', 'g9'); F(c, rr(X + 20, -224, 10, 6, 1), 'g5', 'g3', 'g7');
  F(c, rr(X - 16, -248, 32, 26, 2), 'g9', 'g7', 'gb', 4);
  for (let k = 0; k < 6; k++) fillR(c, X - 16, -245 + k * 4, 32, 1.2, 'g7');
  F(c, rr(X - 17, -266, 34, 18, 3), 'gb', 'g8', 'w', 4);
  F(c, rr(X - 41, -264, 24, 14, 2), 'g4', 'g2', 'g6'); for (let k = 0; k < 5; k++) fillR(c, X - 39 + k * 4.4, -262, 2, 10, 'g3');
  fillR(c, X - 17, -252, 34, 1.6, 'c2');
  F(c, rr(X - 32, -300, 64, 34, 8), 'gb', 'g8', 'w', 4); fillR(c, X - 30, -280, 60, 2, 'g8');
  fillR(c, X - 10, -292, 20, 6, 'g8'); if (z > 1.6) PIX.text && K.wtext(c, '200 kV', X - 8.5, -291.3, 'g4', { shadow: null });
  // status light
  const on = (o.beam ?? 1) && (Math.floor(t * 2) % 2 === 0 || !o.blink);
  fillR(c, X + 12, -262, 3, 3, on ? 'e2' : 'g4');
}
// ---------- whole lab, in three depth layers (the cutaway scenes swap the middle one) ----------
LAB.back = (c, cam, t) => {
  c.save(); K.cam(c, cam); const z = cam.z;
  room(c, z, t);
  // cable tray under the ceiling, the HV cable rising into it, a warning sign
  fillR(c, -400, -334, 800, 3, 'g2'); fillR(c, -400, -331, 800, 1, 'g1');
  F(c, rr(AX - 70, -244, 12, 11, 0.8), 'y2', 'y1', 'y3');
  c.save(); c.fillStyle = P.k; c.beginPath(); c.moveTo(AX - 64, -242.6); c.lineTo(AX - 60.3, -235.6); c.lineTo(AX - 67.7, -235.6); c.closePath(); c.fill(); c.restore();
  fillR(c, AX - 64.4, -240.6, 0.8, 2.6, 'y2'); fillR(c, AX - 64.4, -237.3, 0.8, 0.8, 'y2');
  rack(c, AX + 66, 44, 206, t, 3, z); rack(c, AX + 114, 44, 206, t, 7, z); rack(c, -236, 44, 190, t, 11, z);
  F(c, rr(-182, -62, 30, 62, 2), 'g2', 'g1', 'g4');                       // chiller and its hoses along the floor
  K.pipe(c, [[-152, -10], [AX - 46, -10], [AX - 46, -18]], 2, 'g3', 'g5', 'g2');
  fillR(c, AX - 60, -2, 120, 2, 'k');                                      // floor shadow
  c.restore();
};
LAB.scope = (c, cam, t, o = {}) => { c.save(); K.cam(c, cam); microscope(c, cam.z, t, o); c.restore(); };
LAB.front = (c, cam, t, o = {}) => { c.save(); K.cam(c, cam); desk(c, cam.z, t, o); c.restore(); };
// o: {beam, noHolder, screen: screen options}
LAB.draw = (c, cam, t, o = {}) => {
  LAB.screen(t, o.screen || {});
  LAB.back(c, cam, t); LAB.scope(c, cam, t, o); LAB.front(c, cam, t, o);
};
})();
