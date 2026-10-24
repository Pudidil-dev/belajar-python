'use strict';
// ============================================================================
// PET/CT SCANNER — real-world geometry (mm). Detector ring: 38 stationary
// modules; LYSO crystal face at R = 410 mm (82 cm ring), 20 mm deep crystals
// -> optical coupling -> SiPM array -> readout electronics -> cooling plate.
// Patient bore 78 cm (bore cover at R = 390 mm). Gantry covers outside.
// ============================================================================
const RING = { n: 38, rc: 410, rd: 430, rs: 436, re: 476, rh: 494, bore: 390, cov0: 506, cov1: 660, mw: 64 };
function modAngle(i) { return (i + 0.5) / RING.n * TAU - Math.PI / 2; }
function modIndex(a) { return ((Math.floor((a + Math.PI / 2) / TAU * RING.n) % RING.n) + RING.n) % RING.n; }
// screen polygon of a radial slab [r0, r1] x [-w/2, w/2] of module i
function modQuad(cam, i, r0, r1, w) {
  const a = modAngle(i), c = Math.cos(a), s = Math.sin(a), h = w / 2;
  const P2 = (r, q) => [cam.x(r * c - q * s), cam.y(r * s + q * c)];
  return [...P2(r0, -h), ...P2(r0, h), ...P2(r1, h * r1 / r0 * 0.985), ...P2(r1, -h * r1 / r0 * 0.985)];
}
// where a straight path from (x, y) along (dx, dy) meets the crystal face (mm)
function hitRing(x, y, dx, dy, R) {
  R = R || RING.rc; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  const b = x * dx + y * dy, c = x * x + y * y - R * R, tt = -b + Math.sqrt(Math.max(0, b * b - c));
  return [x + dx * tt, y + dy * tt, tt];
}
// opt: {hl: {index: level}, body: 'tissue'|'ct'|null, covers: true}
function drawRing(cam, t, opt) {
  opt = opt || {};
  clear(P.BG);
  const cx = cam.x(0), cy = cam.y(0), z = cam.z;
  if (opt.covers !== false) {
    const mc = maskDisc(cx, cy, RING.cov1 * z); shade(mc, P.SC2, P.SC3, P.SC1, P.SC0, { k: Math.max(1, Math.round(z * 10)) });
    disc(cx, cy, RING.cov0 * z + 2, P.SC1); ring(cx, cy, RING.cov0 * z + 4, 1.4, P.CR2);            // illuminated bore ring
    const r0 = RING.cov0 * z + 4, a0 = t * 0.6;
    for (let k = 0; k < 14; k++) { const a = a0 + k * 0.025; pset(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, P.CR3); pset(cx + Math.cos(a + Math.PI) * r0, cy + Math.sin(a + Math.PI) * r0, P.CR3); }
  }
  disc(cx, cy, RING.cov0 * z, P.N2);
  const hl = opt.hl || {};
  for (let i = 0; i < RING.n; i++) {
    const h = hl[i] || 0;
    poly(modQuad(cam, i, RING.re, RING.rh, RING.mw - 6), P.T2);                                     // cooling plate
    poly(modQuad(cam, i, RING.rs, RING.re, RING.mw - 10), P.PCB1);                                  // readout electronics
    if (z > 0.35) { const q = modQuad(cam, i, RING.rs + 12, RING.rs + 24, 18); poly(q, P.PA0); }   // ASIC
    poly(modQuad(cam, i, RING.rd, RING.rs, RING.mw - 2), P.PA1);                                    // SiPM array
    poly(modQuad(cam, i, RING.rc, RING.rd, RING.mw - 2), h > 0 ? (h > 0.5 ? P.CR3 : P.CR2) : P.CR1); // LYSO crystal block
    if (z > 0.3) { // crystal pixelation (reflector lines)
      const a = modAngle(i), c = Math.cos(a), s = Math.sin(a);
      for (let q = -24; q <= 24; q += 8) line(cam.x(RING.rc * c - q * s), cam.y(RING.rc * s + q * c), cam.x(RING.rd * c - q * s), cam.y(RING.rd * s + q * c), P.CR0);
    }
    if (h > 0) { const m = maskPoly(modQuad(cam, i, RING.rc - 3, RING.rh + 3, RING.mw + 4)); mOuter(m, h > 0.5 ? P.SG2 : P.SG1); }
  }
  if (opt.singles !== false) for (let sl = Math.floor(t * 18) - 3; sl <= Math.floor(t * 18); sl++) { // singles: most detections are lone photons (no partner)
    const age = t - sl / 18; if (age < 0 || age > 0.14) continue;
    const m = Math.floor(hash3(sl, 7, 91) * RING.n), k = 1 - age / 0.14; if (hl[m]) continue;
    if (z < 0.6) poly(modQuad(cam, m, RING.rc + 2, RING.rd - 2, RING.mw - 14), P.CR2, 0.25 + 0.5 * k);
    else { const q = (hash3(sl, 8, 92) - 0.5) * 44, a = modAngle(m), c = Math.cos(a), s2 = Math.sin(a), r = RING.rc + 6; disc(cam.x(r * c - q * s2), cam.y(r * s2 + q * c), 1 + 2 * k, P.SL2, k); }
  }
  disc(cx, cy, (RING.bore + 5) * z, P.SC1); disc(cx, cy, RING.bore * z, P.BG);                    // bore cover
  // patient cradle and pallet support inside the bore
  const tb = []; for (let k = 0; k <= 20; k++) { const x = lerp(-150, 150, k / 20); tb.push(cam.x(x), cam.y(134 + 0.0005 * x * x)); }
  tb.push(cam.x(118), cam.y(Math.sqrt(RING.bore * RING.bore - 118 * 118) - 4), cam.x(-118), cam.y(Math.sqrt(RING.bore * RING.bore - 118 * 118) - 4));
  poly(tb, P.PA1);
  // the live patient: heartbeat (~66 bpm) and quiet breathing (the reconstructed images later are time-averaged, so they do not move)
  HEART_S = 1 + 0.035 * Math.max(0, Math.sin(t * TAU * 1.1)) ** 3;
  const br = 1 + 0.012 * Math.sin(t * TAU / 4);
  if (opt.body) drawSlice(new Cam(cam.cx, cam.cy, cam.z * br, cam.ax, cam.ay), opt.body, { transparent: true, clip: [Math.floor(cx - RING.bore * z), Math.floor(cy - RING.bore * z), Math.ceil(cx + RING.bore * z), Math.ceil(cy + RING.bore * z)] });
  HEART_S = 1;
}
// a detected gamma lights its crystal: returns screen point on the crystal face
function ringPoint(cam, a, r) { return [cam.x(Math.cos(a) * (r || RING.rc)), cam.y(Math.sin(a) * (r || RING.rc))]; }
// ---------------------------------------------------------------- one detector module, cut open (bore side up)
// 5 LYSO crystals (4 x 4 x 20 mm, 5:1) wrapped in reflector, 1:1 coupled to SiPMs,
// readout board with an ASIC, cooling plate.
const MC = { x0: 20, w: 46, n: 5, y0: 104, y1: 326, sipm0: 328, sipm1: 348, pcb1: 384, cool1: 424 };
const crystalX0 = i => MC.x0 + i * MC.w + 2, crystalX1 = i => MC.x0 + (i + 1) * MC.w;
function drawModuleCut(t, opt) {
  opt = opt || {};
  clear(P.BG);
  rect(MC.x0 - 6, MC.y0 - 6, MC.x0 + MC.n * MC.w + 6, MC.cool1 + 4, P.T1);                    // housing
  rect(MC.x0 - 4, MC.y0 - 4, MC.x0 + MC.n * MC.w + 4, MC.y0 - 2, P.SC3);                        // reflector on the entrance face
  for (let i = 0; i < MC.n; i++) {
    const x0 = crystalX0(i), x1 = crystalX1(i), lit = opt.lit && opt.lit[i] || 0;
    rect(x0 - 2, MC.y0 - 2, x0, MC.y1, P.SC3); rect(x1, MC.y0 - 2, x1 + 2, MC.y1, P.SC3);         // reflector walls
    for (let y = MC.y0; y < MC.y1; y++) for (let x = x0; x < x1; x++) {
      const b = bay(x, y), sx = (x - x0) / (x1 - x0);
      let c = b < 0.55 ? P.CR1 : P.CR0;
      if (sx < 0.16 && b < 0.7) c = P.CR2;                                                         // translucent edge highlight
      if (Math.abs(sx - 0.62 - 0.05 * Math.sin(y * 0.05 + t * 2.2 + i)) < 0.03 && b < 0.4) c = P.CR2;   // internal reflections (shimmer)
      if (lit > 0 && b < lit * 0.5) c = P.CR3;
      buf[y * W + x] = c;
    }
    rect(x0, MC.y1, x1, MC.y1 + 2, P.CR3);                                                        // optical coupling
    // SiPM 1:1 under each crystal: package, active area, microcell texture
    rect(x0, MC.sipm0, x1, MC.sipm1, P.PA0); rect(x0 + 3, MC.sipm0 + 2, x1 - 3, MC.sipm1 - 4, P.PA2);
    for (let y = MC.sipm0 + 3; y < MC.sipm1 - 4; y += 2) for (let x = x0 + 4; x < x1 - 3; x += 2) pset(x, y, P.SL0);
    if (opt.sipm && opt.sipm[i] > 0) rect(x0 + 3, MC.sipm0 + 2, x1 - 3, MC.sipm1 - 4, P.SG2, opt.sipm[i] * 0.7);
  }
  // readout board: traces, ASIC, connector
  rect(MC.x0 - 4, MC.sipm1, MC.x0 + MC.n * MC.w + 4, MC.pcb1, P.PCB1);
  for (let k = 0; k < 9; k++) { const x = MC.x0 + 6 + k * 26; rect(x, MC.sipm1 + 3, x + 1, MC.sipm1 + 14, P.PCB2); rect(x, MC.sipm1 + 14, x + 10, MC.sipm1 + 15, P.PCB2); }
  const ax = 108, ay = MC.sipm1 + 16; rect(ax, ay, ax + 52, ay + 14, P.PA0); rect(ax + 2, ay + 2, ax + 50, ay + 3, P.PA2);
  for (let k = 0; k < 12; k++) { rect(ax + 3 + k * 4, ay - 2, ax + 5 + k * 4, ay, P.Y1); rect(ax + 3 + k * 4, ay + 14, ax + 5 + k * 4, ay + 16, P.Y1); }
  if (opt.asic > 0) rect(ax + 2, ay + 5, ax + 50, ay + 12, P.SG2, opt.asic);
  for (let k = 0; k < 6; k++) rect(40 + k * 34, MC.pcb1 - 8, 46 + k * 34, MC.pcb1 - 4, k % 2 ? P.T3 : P.PA2);
  // cooling plate with channel
  rect(MC.x0 - 6, MC.pcb1, MC.x0 + MC.n * MC.w + 6, MC.cool1, P.T2); rect(MC.x0 - 6, MC.pcb1, MC.x0 + MC.n * MC.w + 6, MC.pcb1 + 2, P.T4);
  for (let x = MC.x0; x < MC.x0 + MC.n * MC.w; x += 10) rect(x, MC.pcb1 + 8, x + 4, MC.cool1 - 6, P.T1);
  for (let x = MC.x0 - 4 + ((t * 40) % 14); x < MC.x0 + MC.n * MC.w; x += 14) rect(x, (MC.pcb1 + MC.cool1) / 2 - 1, x + 5, (MC.pcb1 + MC.cool1) / 2 + 1, P.CR1);   // coolant flow
  const led = Math.sin(t * 9) > 0.2; rect(226, MC.pcb1 - 10, 230, MC.pcb1 - 6, led ? P.SG2 : P.SG0); rect(234, MC.pcb1 - 10, 238, MC.pcb1 - 6, Math.sin(t * 5 + 1) > 0.6 ? P.Y2 : P.Y0);
}
// ---------------------------------------------------------------- SiPM close-up: microcells (Geiger-mode APDs) -> summed current pulse
const SP = { cols: 8, rows: 8, x0: 41, y0: 112, c: 24 };
function spCell(i, j) { return [SP.x0 + i * SP.c, SP.y0 + j * SP.c]; }
function drawSiPM(t, opt) {
  opt = opt || {};
  clear(P.BG);
  rect(SP.x0 - 8, SP.y0 - 8, SP.x0 + SP.cols * SP.c + 6, SP.y0 + SP.rows * SP.c + 6, P.PA0);
  for (let j = 0; j < SP.rows; j++) for (let i = 0; i < SP.cols; i++) {
    const [x, y] = spCell(i, j), f = opt.fire ? opt.fire(i, j) : 0, dk = hash3(i, j, Math.floor(t * 7)) > 0.985 ? 0.4 : 0;   // dark counts
    rect(x, y, x + SP.c - 4, y + SP.c - 4, P.PA2);
    rect(x + 2, y + 2, x + SP.c - 6, y + SP.c - 6, f > 0 ? (f > 0.6 ? P.SG3 : P.SG2) : dk > 0 ? P.SG1 : P.SL0);
    if (f > 0) { rect(x + 2, y + 2, x + SP.c - 6, y + SP.c - 6, P.SG1, 1 - f); if (f > 0.7) glow(x + SP.c / 2 - 2, y + SP.c / 2 - 2, 14, P.SG0, P.SG2, f - 0.7); }
    rect(x + SP.c - 6, y + 1, x + SP.c - 5, y + SP.c - 6, P.T3);                                  // quench resistor
    rect(x, y + SP.c - 4, x + SP.c - 4, y + SP.c - 3, P.T2);                                      // metal bus
  }
}
// oscilloscope inset: summed SiPM current (fast rise, slower decay), drawn up to time u (0..1)
function drawPulseScope(x0, y0, w, h, u, amp, c) {
  rect(x0, y0, x0 + w, y0 + h, P.K0); frame(x0, y0, x0 + w, y0 + h, P.N5);
  for (let k = 1; k < 4; k++) rect(x0 + k * w / 4, y0 + 1, x0 + k * w / 4 + 1, y0 + h - 1, P.N2);
  let px = null, py = null;
  for (let x = 0; x <= w * u; x++) {
    const s = x / w, v = s < 0.18 ? 0 : (1 - Math.exp(-(s - 0.18) / 0.02)) * Math.exp(-(s - 0.18) / 0.22);
    const y = y0 + h - 4 - v * (h - 10) * (amp === undefined ? 1 : amp);
    if (px !== null) line(px, py, x0 + x, y, c || P.SG2);
    px = x0 + x; py = y;
  }
}
// ---------------------------------------------------------------- PET/CT, side view (cm; floor y = 0 up negative). Head-first, arms raised.
// Gantry ~200 cm tall, ~110 cm deep, 78 cm bore centred 100 cm above the floor; CT ring in front, PET ring behind.
const SIDE = { gx0: 150, gx1: 262, top: -200, bc: -100, br: 39, pal: -86.5 };
function drawScannerSide(cam, t, opt) {
  opt = opt || {};
  const X = v => cam.x(v), Y = v => cam.y(v), S = v => cam.s(v);
  clear(P.BG);
  rect(0, Y(0), W, H, P.N2); rect(0, Y(0), W, Y(0) + 1, P.N4);
  for (let i = 0; i < 5; i++) rect(0, Y(0) + 4 + i * 6 + i * i, W, Y(0) + 5 + i * 6 + i * i, P.N3);
  const sl = opt.slide || 0;                                                                         // pallet travel into the bore (cm)
  // table base + lift column (fixed)
  shade(maskRR(X(20), Y(-10), X(120), Y(0), S(3)), P.SC1, P.SC2, P.SC0, P.SH);
  shade(maskRR(X(40), Y(-74), X(100), Y(-10), S(4)), P.SC2, P.SC3, P.SC1, P.SC0);
  shade(maskRR(X(4), Y(-82), X(150), Y(-74), S(2)), P.SC2, P.SC3, P.SC1, P.SC0);                    // table top (cradle)
  // gantry body: CT section (front) + PET section (rear), cut away around the bore
  const g = maskRR(X(SIDE.gx0), Y(SIDE.top), X(SIDE.gx1 + 40), Y(0), S(22));
  shade(g, P.SC2, P.SC3, P.SC1, P.SC0, { k: 2 });
  rect(X(SIDE.gx0 + 58), Y(SIDE.top + 6), X(SIDE.gx0 + 59), Y(-6), P.SC1);                           // CT | PET cover seam
  shade(maskRR(X(SIDE.gx0 - 4), Y(-148), X(SIDE.gx0 + 6), Y(-54), S(4)), P.SC3, P.C6, P.SC1, P.SC0); // front bore lip
  rect(X(SIDE.gx0 - 2), Y(-147), X(SIDE.gx0), Y(-55), P.CR2);                                         // illuminated ring (edge-on)
  shade(maskRR(X(SIDE.gx0 + 14), Y(-176), X(SIDE.gx0 + 36), Y(-160), S(2)), P.PA1, P.PA2, P.PA0, P.SH); // control panel
  rect(X(SIDE.gx0 + 16), Y(-174), X(SIDE.gx0 + 34), Y(-168), P.CR1); rect(X(SIDE.gx0 + 17), Y(-166), X(SIDE.gx0 + 20), Y(-163), P.SG2);
  // cutaway window: the bore tunnel with the CT ring (tube + detector arc) and the PET ring (stationary blocks)
  const c0 = X(SIDE.gx0 + 8), c1 = X(SIDE.gx1 - 6), b0 = Y(SIDE.bc - SIDE.br - 22), b1 = Y(SIDE.bc + SIDE.br + 22);
  rect(c0, b0, c1, b1, P.N1); frame(c0 - 1, b0 - 1, c1 + 1, b1 + 1, P.SC0);
  rect(c0, Y(SIDE.bc - SIDE.br), c1, Y(SIDE.bc + SIDE.br), P.BG);
  rect(c0, Y(SIDE.bc - SIDE.br) - 1, c1, Y(SIDE.bc - SIDE.br), P.SC1); rect(c0, Y(SIDE.bc + SIDE.br), c1, Y(SIDE.bc + SIDE.br) + 1, P.SC1);
  const ctx0 = X(SIDE.gx0 + 26), ctx1 = X(SIDE.gx0 + 44);
  rect(ctx0, b0 + 2, ctx1, Y(SIDE.bc - SIDE.br) - 3, P.T3); rect(ctx0 + 2, b0 + 4, ctx1 - 2, b0 + 7, P.Y1);                    // CT X-ray tube (top)
  rect(ctx0 - 2, Y(SIDE.bc + SIDE.br) + 3, ctx1 + 2, b1 - 2, P.T2);                                                          // CT detector arc (bottom)
  const px0 = X(SIDE.gx0 + 70), px1 = X(SIDE.gx0 + 96), hp = opt.pet || 0;
  for (const [y0, y1] of [[b0 + 2, Y(SIDE.bc - SIDE.br) - 3], [Y(SIDE.bc + SIDE.br) + 3, b1 - 2]]) {
    rect(px0, y0, px1, y1, P.PCB1); rect(px0, Math.min(y0, y1), px1, Math.min(y0, y1) + 3, hp > 0 ? P.CR3 : P.CR2);
    if (y0 > Y(SIDE.bc)) rect(px0, y1 - 3, px1, y1, hp > 0 ? P.CR3 : P.CR2);
  }
  if (UI_ON && opt.tags !== undefined) { tag('CT', (ctx0 + ctx1) / 2, b0 - 16, opt.tags, t, { align: 'center', c: P.INK, plate: P.C1 }); tag('PET', (px0 + px1) / 2, b0 - 16, opt.tags + 0.2, t, { align: 'center', c: P.CR3, plate: P.CR1 }); }
  // pallet + patient slide into the bore (patient lies at the bore centre)
  const ox = sl;
  const pal = maskRR(X(-6 + ox), Y(SIDE.pal), X(196 + ox), Y(SIDE.pal + 4), S(2)); shade(pal, P.PA1, P.PA2, P.PA0, P.SH);
  drawPatientSide(cam, ox, t);
  // cover the patient where it is inside the gantry walls but outside the cutaway
  const inside = X(SIDE.gx0 + 8);
  if (X(196 + ox) > X(SIDE.gx0)) {
    rect(X(SIDE.gx0), Y(SIDE.bc - SIDE.br - 22), c0, Y(SIDE.bc + SIDE.br + 22), P.SC2);
    shade(maskRR(X(SIDE.gx0 - 4), Y(-148), X(SIDE.gx0 + 6), Y(-54), S(4)), P.SC3, P.C6, P.SC1, P.SC0);
    rect(X(SIDE.gx0 - 2), Y(-147), X(SIDE.gx0), Y(-55), P.CR2);
    rect(inside, b0, inside + 1, b1, P.SC0);
  }
}
// supine patient, head towards the gantry (+x), arms raised above the head
function drawPatientSide(cam, ox, t) {
  const X = v => cam.x(v + ox), Y = v => cam.y(v), S = v => cam.s(v), base = SIDE.pal;
  // legs + feet (blanket), pelvis, torso (gown), head on a head-holder
  const legs = maskPoly([X(4), Y(base), X(4), Y(base - 12), X(30), Y(base - 15), X(62), Y(base - 18), X(84), Y(base - 20), X(84), Y(base)]);
  shade(legs, P.GW0, P.GW1, P.N2, P.SH);
  shade(maskEll(X(6), Y(base - 15), S(3), S(5)), P.SK2, P.SK3, P.SK1, P.SK0);                         // feet up
  const body = maskPoly(splineClosed([X(82), Y(base), X(81), Y(base - 19), X(100), Y(base - 21.5), X(120), Y(base - 23.5), X(136), Y(base - 26), X(150), Y(base - 24), X(160), Y(base - 17), X(162), Y(base)], 3));
  shade(body, P.GW1, P.GW2, P.GW0, P.SH);
  rect(X(160), Y(base - 13), X(166), Y(base - 4), P.SK1);                                             // neck
  shade(maskEll(X(174), Y(base - 11), S(10), S(10)), P.SK2, P.SK3, P.SK1, P.SK0);                    // head
  shade(maskPoly([X(176), Y(base - 20), X(179), Y(base - 23.5), X(181), Y(base - 19.5)]), P.SK2, P.SK3, P.SK1, P.SK0);   // nose (face up)
  ellipse(X(178), Y(base - 7), S(7), S(6), P.ST1);                                                   // hair (back of head)
  shade(maskRR(X(164), Y(base - 4), X(190), Y(base), S(2)), P.PA2, P.SC1, P.PA1, P.SH);              // head holder
  // raised arms along the head
  lineW(X(150), Y(base - 20), X(176), Y(base - 22), Math.max(1, S(6)), P.SK1); lineW(X(150), Y(base - 21), X(176), Y(base - 23), Math.max(1, S(4)), P.SK2);
  lineW(X(176), Y(base - 22), X(198), Y(base - 17), Math.max(1, S(5)), P.SK1); lineW(X(176), Y(base - 23), X(198), Y(base - 18), Math.max(1, S(3.5)), P.SK2);
  disc(X(200), Y(base - 17), S(3.4), P.SK2);
}
// ---------------------------------------------------------------- reconstruction workstation
function drawWorkstation(cam, t, opt) {
  opt = opt || {};
  const X = v => cam.x(v), Y = v => cam.y(v), S = v => Math.max(1, cam.s(v));
  clear(P.BG);
  rect(0, Y(330), W, H, P.N2); rect(0, Y(330), W, Y(332), P.N4);                                      // desk
  shade(maskRR(X(14), Y(120), X(256), Y(290), S(6)), P.PA1, P.PA2, P.PA0, P.SH);                       // monitor
  rect(X(122), Y(290), X(148), Y(318), P.PA1); shade(maskRR(X(96), Y(316), X(174), Y(324), S(3)), P.PA1, P.PA2, P.PA0, P.SH);
  shade(maskRR(X(40), Y(342), X(214), Y(360), S(3)), P.PA1, P.PA2, P.PA0, P.SH);                       // keyboard
  for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) rect(X(46 + k * 12), Y(345 + r * 5), X(54 + k * 12), Y(348 + r * 5), P.PA2);
  shade(maskEll(X(232), Y(352), S(9), S(6)), P.PA1, P.PA2, P.PA0, P.SH);                               // mouse
  const R = [Math.round(X(20)), Math.round(Y(126)), Math.round(X(250)), Math.round(Y(284))];
  rect(R[0], R[1], R[2], R[3], P.K0);
  if (opt.screen) opt.screen(R);
}
// sinogram of events (phi 0..pi along x, radial offset along y) inside rect R; n events shown
const RECON_SRC = [[-70, -26, 0.25, 6], [34, -24, 0.4, 16], [0, 66, 0.08, 10]];   // lesion, LV wall, marrow (+ background)
function eventAt(k) { // deterministic event: source position + angle
  const r = hash(k * 13 + 1); let src = null, acc = 0;
  for (const S of RECON_SRC) { acc += S[2]; if (r < acc) { src = S; break; } }
  const a = hash(k * 13 + 2) * Math.PI;
  let x, y;
  if (src) { const rr = src[3] * Math.sqrt(hash(k * 13 + 3)), aa = hash(k * 13 + 4) * TAU; x = src[0] + Math.cos(aa) * rr; y = src[1] + Math.sin(aa) * rr; }
  else { x = (hash(k * 13 + 5) - 0.5) * 300; y = (hash(k * 13 + 6) - 0.5) * 190; }
  return [x, y, a];
}
function drawSinogram(R, n, hot) {
  rect(R[0], R[1], R[2], R[3], P.K0); frame(R[0] - 1, R[1] - 1, R[2] + 1, R[3] + 1, P.N5);
  const w = R[2] - R[0], h = R[3] - R[1];
  for (let k = 0; k < n; k++) {
    const [x, y, a] = eventAt(k), s = x * Math.cos(a) + y * Math.sin(a);
    const px = R[0] + a / Math.PI * w, py = R[1] + h / 2 + s / 260 * h;
    if (hot && k >= n - hot) rect(px - 1, py - 1, px + 1, py + 1, P.HM9);                     // events arriving right now
    else pset(px, py, k % 7 === 0 ? P.HM7 : k % 3 ? P.HM5 : P.HM3);
  }
}
