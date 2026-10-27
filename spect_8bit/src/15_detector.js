'use strict';
// ============================================================================
// INSIDE ONE DETECTOR HEAD (panels 3, 10, 11, 12, 15) as a flat 2-D cut-away,
// hanging over the patient the same way as in the scanner: the patient side
// is DOWN. From the bottom up: the lead collimator (septa with parallel
// channels), the NaI(Tl) crystal, the light guide, the photomultiplier tubes,
// the readout board and the housing. Scene px; layer thicknesses exaggerated.
// ============================================================================
const DH = { x0: 24, x1: 336, top: 238, brd0: 258, brd1: 272, pmTop: 300, pmBot: 404, lg0: 404, lg1: 426, cr0: 426, cr1: 468, col0: 468, col1: 566, face: 574 };
// septa (lead plates) and the channels between them
const SEPT = []; for (let k = 0; k < 12; k++) SEPT.push(30 + 26 * k + 6);           // plate centres (12 px wide)
const CHAN = []; for (let k = 0; k + 1 < SEPT.length; k++) CHAN.push((SEPT[k] + SEPT[k + 1]) / 2);
const PMX = [60, 120, 180, 240, 300];                                            // front-row tubes (radius 26)
const PMX_B = [90, 150, 210, 270];                                               // back-row tubes peeking between
// ---------------------------------------------------------------- pieces
function leadPlate(c, xc, y0, y1, k) {
  const z = c.z, x0 = c.x(xc - 6), x1 = c.x(xc + 6), Y0 = c.y(y0), Y1 = c.y(y1), w = x1 - x0;
  rect(x0, Y0, x1, Y1, P.PB2);
  rect(x0, Y0, x0 + Math.max(1, w * 0.18), Y1, P.PB4); rect(x0 + w * 0.18, Y0, x0 + w * 0.3, Y1, P.PB3);
  rect(x1 - Math.max(1, w * 0.16), Y0, x1, Y1, P.PB1);
  // machined speckle and a bevelled bottom end (the patient side)
  for (let q = 0; q < 9; q++) { const yy = lerp(Y0 + 2, Y1 - 6, hash(k * 31 + q)), xx = lerp(x0 + 2, x1 - 2, hash(k * 31 + q + 9)); pset(xx, yy, q % 2 ? P.PB4 : P.PB1); }
  rect(x0, Y1 - Math.max(2, 4 * z), x1, Y1, P.PB4); rect(x0, Y1 - Math.max(1, 1.2 * z), x1, Y1, P.PB5);
  rect(x0 - 1, Y0, x0, Y1, P.PB0); rect(x1, Y0, x1 + 1, Y1, P.PB0);
}
function collimator(c, t, o) {
  o = o || {};
  const z = c.z;
  // channels: dark holes with a lit far wall, faint cyan where they meet the crystal
  sRect(c, DH.x0, DH.col0, DH.x1, DH.col1, P.PB0);
  CHAN.forEach((xc, k) => {
    sRect(c, xc - 4, DH.col0 + 2, xc + 4, DH.col1, P.PB1);
    sRect(c, xc - 7, DH.col0, xc + 7, DH.col0 + 3, P.CR1);
    if (o.lit && o.lit[k] > 0) { sRect(c, xc - 7, DH.col0, xc + 7, DH.col1, P.GA1, 0.35 * o.lit[k]); }
  });
  SEPT.forEach((xc, k) => leadPlate(c, xc, DH.col0, DH.col1, k));
  // the patient-facing bottom face (seen from just below): plate ends and hole openings
  sRect(c, DH.x0, DH.col1, DH.x1, DH.face, P.PB3);
  CHAN.forEach(xc => { sRect(c, xc - 6, DH.col1 + 1, xc + 6, DH.face - 1, P.PB0); sRect(c, xc - 6, DH.col1 + 1, xc + 6, DH.col1 + 2, P.PB1); });
  sRect(c, DH.x0, DH.face - 1, DH.x1, DH.face, P.PB1);
  void z;
}
function crystalLayer(c, t, o) {
  o = o || {};
  const X0 = c.x(DH.x0), X1 = c.x(DH.x1), Y0 = c.y(DH.cr0), Y1 = c.y(DH.cr1), z = c.z;
  rect(X0, Y0, X1, Y1, P.CR3);
  rect(X0, Y0, X1, Y0 + Math.max(1, 2 * z), P.CR5); rect(X0, Y1 - Math.max(1, 3 * z), X1, Y1, P.CR2);
  for (let k = 1; k < 8; k++) { const x = c.x(DH.x0 + k * 39); rect(x, Y0, x + 1, Y1, P.CR2); rect(x + 1, Y0, x + 2, Y1, P.CR4, 0.5); }
  // pixel-crystal look: brighter cubes and white sparkles (panel 12)
  for (let q = 0; q < 70; q++) {
    const u = hash(q * 3 + 2000), v = hash(q * 3 + 2001), s = (2 + 4 * hash(q * 3 + 2002)) * z;
    const x = lerp(X0 + 2, X1 - 8, u), y = lerp(Y0 + 3, Y1 - 6, v), tw = Math.sin(t * (1.5 + hash(q + 77) * 2) + q * 1.7);
    rect(x, y, x + s, y + s, tw > 0.55 ? P.CR5 : P.CR4, tw > 0.55 ? 1 : 0.7);
  }
  for (let q = 0; q < 24; q++) { const x = lerp(X0, X1, hash(q + 2500)), y = lerp(Y0, Y1, hash(q + 2501)); if (Math.sin(t * 2.6 + q * 2.1) > 0.6) pset(x, y, P.C6); }
  if (o.flash) { const [fx, fy, k] = o.flash; flash(c.x(fx), c.y(fy), (10 + 8 * k) * z, k); }
}
function guideLayer(c, t, o) {
  o = o || {};
  const X0 = c.x(DH.x0), X1 = c.x(DH.x1), Y0 = c.y(DH.lg0), Y1 = c.y(DH.lg1), z = c.z;
  rect(X0, Y0, X1, Y1, P.LG2); rect(X0, Y0, X1, Y0 + Math.max(1, z), P.LG3); rect(X0, Y1 - Math.max(1, z), X1, Y1, P.LG1);
  for (let k = 1; k < 12; k++) { const x = c.x(DH.x0 + k * 26); rect(x, Y0 + 2, x + 1, Y1 - 2, P.LG1); }
  for (let k = 0; k < 12; k++) { const x = c.x(DH.x0 + 6 + k * 26); rect(x, Y0 + 3 * z, x + 3 * z, Y0 + 4 * z, P.LG3, 0.7); }
  void o; void t;
}
// a photomultiplier tube seen from the front: brushed-metal body, shoulder, socket and pins
const PMT_BANDS = () => [P.PM1, P.PM2, P.PM3, P.PM4, P.PM5, P.PM4, P.PM3, P.PM2, P.PM2, P.PM1, P.PM0, P.PM2];
function pmtFront(c, xc, lit, back) {
  const z = c.z, r = 26, X0 = c.x(xc - r), X1 = c.x(xc + r), Yb = c.y(DH.pmBot), Yt = c.y(DH.pmTop + 12);
  const bands = back ? [P.PM0, P.PM1, P.PM1, P.PM2, P.PM2, P.PM1, P.PM1, P.PM0] : PMT_BANDS(), n = bands.length;
  // body
  for (let x = Math.floor(X0); x < X1; x++) {
    const u = (x + 0.5 - X0) / (X1 - X0), q = u * (n - 1) + (bay(x, 0) - 0.5) * 0.6, col = bands[clamp(Math.round(q), 0, n - 1)];
    rect(x, Yt, x + 1, Yb, col);
  }
  // shoulder rising to the socket
  const sh = maskFn(c.x(xc - r), c.y(DH.pmTop - 2), c.x(xc + r), c.y(DH.pmTop + 13), (px, py) => { const u = (c.wx(px) - xc) / r, y = c.wy(py); return Math.abs(u) <= 1 && y >= DH.pmTop + 12 - 12 * Math.sqrt(Math.max(0, 1 - u * u * 0.7)) * 1.0 + 0 && y <= DH.pmTop + 13; });
  mFill(sh, back ? P.PM1 : P.PM3); mRim(sh, back ? P.PM2 : P.PM5, 1, 1); mOutline(sh, P.PM0);
  sRect(c, xc - 15, DH.brd1, xc + 15, DH.pmTop + 2, back ? P.PM0 : P.PM1); sRect(c, xc - 15, DH.brd1, xc - 11, DH.pmTop + 2, back ? P.PM1 : P.PM3);
  for (let k = -2; k <= 2; k++) sRect(c, xc + k * 5 - 0.6, DH.brd0 + 6, xc + k * 5 + 0.6, DH.brd1, P.PM4);
  // seam ring and the window flange at the bottom (on the light guide)
  sRect(c, xc - r, DH.pmTop + 30, xc + r, DH.pmTop + 31.5, back ? P.PM0 : P.PM1);
  sRect(c, xc - r - 2, DH.pmBot - 8, xc + r + 2, DH.pmBot, back ? P.PM1 : P.PM3); sRect(c, xc - r - 2, DH.pmBot - 8, xc + r + 2, DH.pmBot - 7, back ? P.PM2 : P.PM5);
  frame(X0 - 1, Yt, X1 + 1, Yb, P.PM0);
  if (lit > 0) {                                              // the window lights up where scintillation light enters
    sRect(c, xc - r, DH.pmBot - 5, xc + r, DH.pmBot, P.LT2, Math.min(1, lit * 1.4));
    sRect(c, xc - r * 0.8, DH.pmBot - 3, xc + r * 0.8, DH.pmBot, P.LT3, Math.min(1, lit * 1.2));
    glow(c.x(xc), c.y(DH.pmBot - 4), (16 + 18 * lit) * z, P.LT0, P.LT1, Math.min(1, lit * 1.3));
  }
}
function boardLayer(c, t) {
  sRect(c, DH.x0, DH.brd0, DH.x1, DH.brd1, P.N4); sRect(c, DH.x0, DH.brd0, DH.x1, DH.brd0 + 1.5, P.N6);
  for (let k = 0; k < 9; k++) { const x = DH.x0 + 14 + k * 34; sRect(c, x, DH.brd0 + 3, x + 16, DH.brd1 - 3, P.PM1); sRect(c, x, DH.brd0 + 3, x + 16, DH.brd0 + 4, P.PM3); }
  for (let k = 0; k < 9; k++) if (Math.sin(t * 5 + k * 1.3) > 0.2) sRect(c, DH.x0 + 32 + k * 34, DH.brd0 + 5, DH.x0 + 35 + k * 34, DH.brd0 + 8, P.SG2);
}
function housing(c, t) {
  // off-white shell around the sides and top; the cut edges show its thickness
  const sh = maskPoly(c.pts([DH.x0 - 16, DH.face + 2, DH.x0 - 16, DH.top - 2, DH.x1 + 16, DH.top - 2, DH.x1 + 16, DH.face + 2, DH.x1, DH.face + 2, DH.x1, DH.top + 14, DH.x0, DH.top + 14, DH.x0, DH.face + 2]));
  shade(sh, P.G1, P.GW, P.G3, P.G4, { k: Math.max(1, Math.round(c.z)) });
  // the dark interior behind the parts
  sRect(c, DH.x0, DH.top + 14, DH.x1, DH.brd0, P.N2);
  sRect(c, DH.x0, DH.brd1, DH.x1, DH.pmBot, P.N2);
  // lead shielding lining (dark band inside the shell)
  sRect(c, DH.x0, DH.top + 14, DH.x0 + 5, DH.face, P.PB1); sRect(c, DH.x1 - 5, DH.top + 14, DH.x1, DH.face, P.PB1);
  void t;
}
// the whole cut-away. o.light[i] for the 5 front tubes (0..1); o.flash [x, y, k]; o.lit (channels)
function drawHead2(c, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  // the patient side below the head: dark, with a faint body glow
  sRect(c, -400, DH.face, 800, DH.face + 600, P.K0);
  for (let i = 0; i < 6; i++) sRect(c, -400, DH.face + 30 + i * 24, 800, DH.face + 31 + i * 24, P.BG);
  housing(c, t);
  boardLayer(c, t);
  PMX_B.forEach(x => pmtFront(c, x, 0, true));
  PMX.forEach((x, i) => pmtFront(c, x, o.light ? o.light[i] || 0 : 0, false));
  guideLayer(c, t, o);
  crystalLayer(c, t, o);
  collimator(c, t, o);
  // light rays from a scintillation point up through the guide to the tubes (strength ~ light)
  if (o.rays && o.flash) {
    const [fx, fy] = o.flash;
    PMX.forEach((x, i) => {
      const L = o.light ? o.light[i] || 0 : 0; if (L < 0.08) return;
      const n = 2 + Math.round(L * 4);
      for (let k = 0; k < n; k++) { const tx = x + (k - (n - 1) / 2) * 7; dashLine(c.x(fx), c.y(fy), c.x(tx), c.y(DH.pmBot - 2), L > 0.5 ? P.LT3 : P.LT2, 4, 3, -t * 60 - k * 3); }
    });
  }
}
// a gamma photon in head coordinates: front at (x, y), travelling along angle ang (screen), visible length len (scene px)
function gammaH(c, x, y, ang, len, t, opt) { opt = opt || {}; gammaWave(c.x(x), c.y(y), ang, len * c.z, t, { amp: (opt.amp || 5) * Math.min(2, c.z), wl: (opt.wl || 16) * Math.min(2, c.z), w: Math.max(3, 3.5 * Math.min(2, c.z)), hs: 7 * Math.min(2, c.z), glowR: 12 * Math.min(2, c.z) }); }
