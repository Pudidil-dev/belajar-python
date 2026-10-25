'use strict';
// ============================================================================
// MASTER TIMELINE — HOW PET SCANNERS WORK, director's cut (19 connected
// scenes, 70 s, 60 fps). One tracer molecule, one annihilation and the SAME
// two gamma photons are followed through the whole machine:
// the result first (hook) -> the scanner -> the earlier injection -> blood ->
// uptake -> the F-18 nucleus -> beta-plus decay -> positron -> annihilation
// -> detection -> crystal -> SiPM -> measurement -> coincidence -> line of
// response -> many events -> reconstruction -> PET/CT -> recap -> frame one.
// renderFrame(t) is a pure function of t. 128 BPM: bar n starts at
// (n - 1) * 1.875 s and the key mechanisms land on bar downbeats.
// ============================================================================
const BEAT = 60 / 128, BARL = 4 * BEAT, TRIP = BEAT * 2 / 3;
const barT = n => (n - 1) * BARL;
const T_TRAP = barT(8), T_DECAY = barT(12), T_ANN = barT(15), T_DET = barT(17), T_XTAL = barT(18), T_SCINT = barT(19), T_SIPM = barT(20), T_SPLIT = barT(21);
const T_CC = barT(24), T_LOR = barT(25), T_MANY = 105 * BEAT, T_FINAL = barT(32), T_FUSE = barT(34), T_REC0 = 65.0, T_TITLE = barT(37), T_HOME0 = 69.4, T_HOME1 = 69.88;
function engineInit() { bodyInit(); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerp(a[1], b[1], (b[2] || K75)(seg(t, a[0], b[0]))); }
  return keys[keys.length - 1][1];
}
const lin = x => x;
const LBL_Y = 40;
let CAP_UY = 0;
function cap(text, t0, t, micro, mt0) { if (!UI_ON) return; const spec = { text, x: 18, y: LBL_Y, t0, micro, mt0 }; CAP_UY = calloutLayout(spec).uy; callout(spec, t); }
function cap2(l1, l2, t0, t) { // two-line caption in the label font (the hook)
  if (!UI_ON) return;
  const age = t - t0; if (age < 0) return;
  const cps = 44, n1 = clamp(age * cps, 0, l1.length), n2 = clamp(age * cps - l1.length - 2, 0, l2.length), x = 18, y = LBL_Y;
  const w1 = textW(FL, l1.slice(0, Math.ceil(n1)), 2), w2 = n2 > 0 ? textW(FL, l2.slice(0, Math.ceil(n2)), 2) : 0;
  if (n1 > 0) rect(x - 3, y - 3, x + Math.max(w1, w2) + 3, y + (n2 > 0 ? 35 : 17), P.BG);
  if (n1 > 0) text(FL, l1, x, y, { sc: 2, n: n1 });
  if (n2 > 0) text(FL, l2, x, y + 18, { sc: 2, n: n2 });
  const bw = Math.max(textW(FL, l1, 2), textW(FL, l2, 2)), gk = K75(clamp(age / 0.25, 0, 1));
  rect(x - 2, y + 37, Math.round(lerp(x - 2, x + bw + 1, gk)), y + 38, P.SUB);
  CAP_UY = y + 37;
}
function pulse(t, t0, d) { return t < t0 ? 0 : Math.max(0, 1 - (t - t0) / d); }
function mix(A, B, k) { if (k <= 0) A(); else if (k >= 1) B(); else { withBuffer(TMPBUF, A); B(); dissolve(TMPBUF, buf, k, buf); } }
function chip(s, t0, t, col, icon, uy) { // small disclaimer chip right under the caption block
  if (t < t0 || !UI_ON) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)), tw = textW(FM, s, 2), y = Math.max(80, (uy || 73) + 7);
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, P.K0); frame(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, col);
  if (icon === 'clock') { ring(x + 6, y + 5, 5, 1, P.INK); const a = t * 9; line(x + 6, y + 5, x + 6 + Math.cos(a) * 4, y + 5 + Math.sin(a) * 4, P.INK); }
  if (icon === 'wave') { const zz = [0, 0, 2, -3, 4, 3, 6, -3, 8, 3, 10, 0]; for (let i = 0; i + 3 < zz.length; i += 2) line(x + 1 + zz[i], y + 5 + zz[i + 1], x + 1 + zz[i + 2], y + 5 + zz[i + 3], P.GA2); }
  text(FM, s, x + (icon ? 14 : 1), y, { sc: 2, c: P.INK, ol: null });
}
// lens reveal: the next world appears inside a growing circle with a cyan rim (drawn via FEEDBUF)
function lensReveal(drawInner, cx, cy, r) {
  if (r <= 0) return;
  withBuffer(FEEDBUF, drawInner);
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) { const dy = y + 0.5 - cy, h = r * r - dy * dy; if (h < 0) continue; const s = Math.sqrt(h), a = Math.max(0, Math.ceil(cx - s - 0.5)), b = Math.min(W - 1, Math.floor(cx + s - 0.5)); for (let x = a; x <= b; x++) buf[y * W + x] = FEEDBUF[y * W + x]; }
  if (r < 600) { ring(cx, cy, r + 1, 2, P.CR2); ring(cx, cy, r + 3.5, 1, P.CR3, 0.5); }
}
function energyBar(lv, t0, t) { // small HUD: kinetic energy of the positron (top right, clear of the side buttons)
  if (!UI_ON || t < t0) return;
  const x = 202, y = 82, w = 44;
  rect(x - 3, y - 3, x + w + 3, y + 13, P.K0); frame(x - 3, y - 3, x + w + 3, y + 13, P.PO1);
  rect(x, y + 6, x + Math.round(w * clamp(lv, 0, 1)), y + 10, P.PO2); text(FM, 'ENERGY', x, y - 1, { c: P.PO3, ol: null, sc: 1 });
}
// ---------------------------------------------------------------- the representative event (followed from start to finish)
// It happens in normal heart muscle (septum), on the perpendicular of its photon line through the ring centre, so both
// photons have the same path to the crystals and arrive together. The line runs from lower left (module A) to upper
// right (module B), so both struck modules stay clear of the on-screen buttons of short-video apps.
const RZ = 0.29, RCAM = () => new Cam(0, 0, RZ, 135, 250);
const TH_E = -0.5, E_REP = [-14.4, -26.3];
let REP_ = null;
function rep() {
  if (REP_) return REP_;
  const c = Math.cos(TH_E), s = Math.sin(TH_E), hB = hitRing(E_REP[0], E_REP[1], c, s), hA = hitRing(E_REP[0], E_REP[1], -c, -s);
  let s0 = 1, s1 = 0;   // where the line of response runs through the body (fractions from A to B)
  for (let k = 0; k <= 400; k++) { const f = k / 400, x = lerp(hA[0], hB[0], f), y = lerp(hA[1], hB[1], f); if (pointInPoly(AX.body, x, y)) { s0 = Math.min(s0, f); s1 = Math.max(s1, f); } }
  return (REP_ = { hA, hB, mA: modIndex(Math.atan2(hA[1], hA[0])), mB: modIndex(Math.atan2(hB[1], hB[0])), L: Math.max(hA[2], hB[2]), s0, s1 });
}
const modName = m => String(m + 1).padStart(2, '0');
// two photons from P0 (mm) at distance d along +-th, stopping at the crystal face, with short fading wakes
function photonPair(cam, P0, th, d, t, opt) {
  opt = opt || {};
  const c = Math.cos(th), s = Math.sin(th);
  for (const sg of [1, -1]) {
    const dd = Math.min(d, opt.L || 1e9), ux = sg * c, uy = sg * s, x = P0[0] + ux * dd, y = P0[1] + uy * dd, tl = Math.min(dd, (opt.wake || 58) / cam.z);
    for (let k = 0; k < 4; k++) { const a0 = dd - tl * (k + 1) / 4, a1 = dd - tl * k / 4; line(cam.x(P0[0] + ux * a0), cam.y(P0[1] + uy * a0), cam.x(P0[0] + ux * a1), cam.y(P0[1] + uy * a1), k < 2 ? P.GA2 : P.GA1, 0.8 - k * 0.18); }
    gamma(cam.x(x), cam.y(y), ux, uy, { len: opt.len || 16, amp: opt.amp || 2.3, ph: t * 40 });
  }
}
// cyan line of response, growing from both detectors until the two halves meet
function drawLOR(cam, h1, h2, k, lv) {
  if (k <= 0 || lv <= 0) return; lv = lv === undefined ? 1 : lv;
  const x1 = cam.x(h1[0]), y1 = cam.y(h1[1]), x2 = cam.x(h2[0]), y2 = cam.y(h2[1]), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const ax = lerp(x1, mx, k), ay = lerp(y1, my, k), bx = lerp(x2, mx, k), by = lerp(y2, my, k);
  lineW(x1, y1, ax, ay, 3, P.CR1, 0.55 * lv); lineW(x2, y2, bx, by, 3, P.CR1, 0.55 * lv);
  line(x1, y1, ax, ay, P.CR3, lv); line(x2, y2, bx, by, P.CR3, lv);
}
function runPulse(x1, y1, x2, y2, s, hw, lv) { // bright segment centred at fraction s of the line
  const a = clamp(s - hw, 0, 1), b = clamp(s + hw, 0, 1); if (b <= a) return;
  lineW(lerp(x1, x2, a), lerp(y1, y2, a), lerp(x1, x2, b), lerp(y1, y2, b), 3, P.CR3, 0.7 * lv); line(lerp(x1, x2, a), lerp(y1, y2, a), lerp(x1, x2, b), lerp(y1, y2, b), P.C6, lv);
}
function lorOf(k) { const [x, y] = eventAt(k), th = hash(k * 13 + 9) * Math.PI; return [x, y, th, hitRing(x, y, Math.cos(th), Math.sin(th)), hitRing(x, y, -Math.cos(th), -Math.sin(th))]; }
// ---------------------------------------------------------------- S01 hook: the result first (and the loop target)
// tau = story time of the hook (0 = frame one). The annihilation happens just before frame one.
const TAU_A = -0.06;
function hookView(tau, t) {
  const R = rep(), cam = RCAM(), v = R.L / (0.6 - TAU_A), hl = {};
  if (tau >= 0.6) { const k = pulse(tau, 0.6, 0.6); hl[R.mA] = hl[R.mB] = 0.4 + 0.6 * k; }
  const nM = tau < 2.0 ? 0 : Math.floor(72 * Math.pow(seg(tau, 2.0, 2.5), 1.35)), fade = 1 - seg(tau, 2.5, 2.85);
  for (let k = Math.max(0, nM - 3); k < nM && fade > 0.5; k++) { const L = lorOf(k); for (const h of [L[3], L[4]]) { const m = modIndex(Math.atan2(h[1], h[0])); hl[m] = Math.max(hl[m] || 0, 0.7); } }
  const rev = seg(tau, 2.5, 2.78);   // the reconstructed activity image is written over the slice
  if (rev <= 0) drawRing(cam, t, { body: 'tissue', hl });
  else if (rev >= 1) drawRing(cam, t, { body: 'pet', hl });
  else {
    withBuffer(TMPBUF, () => drawRing(cam, t, { body: 'pet', hl })); drawRing(cam, t, { body: 'tissue', hl });
    const r = RING.bore * RZ, yb = Math.round(lerp(250 - r, 250 + r, eout(rev)));
    buf.set(TMPBUF.subarray(0, Math.max(0, yb) * W), 0);
    const hw = Math.sqrt(Math.max(0, r * r - (yb - 250) ** 2)); rect(135 - hw, yb, 135 + hw, yb + 2, P.C6); rect(135 - hw, yb + 2, 135 + hw, yb + 3, P.HM6);
  }
  const ex = cam.x(E_REP[0]), ey = cam.y(E_REP[1]);
  if (tau >= TAU_A && tau < TAU_A + 0.32) annihilationFlash(ex, ey, (tau - TAU_A) / 0.32, 0.75);
  if (tau >= TAU_A && tau < 0.6) photonPair(cam, E_REP, TH_E, (tau - TAU_A) * v, t, { L: R.L });
  if (tau >= 0.6 && tau < 1.0) { const k = pulse(tau, 0.6, 0.4); for (const h of [R.hA, R.hB]) glow(cam.x(h[0]), cam.y(h[1]), 10, P.GA0, P.GA3, k); }
  if (tau >= 1.2) drawLOR(cam, R.hA, R.hB, K75(seg(tau, 1.2, 1.42)), fade);
  if (tau >= 1.42 && tau < 2.1) { const s = 0.5 - 0.5 * Math.cos((tau - 1.42) * TAU * 1.1); runPulse(cam.x(R.hA[0]), cam.y(R.hA[1]), cam.x(R.hB[0]), cam.y(R.hB[1]), s, 0.05, 1 - seg(tau, 1.95, 2.1)); }
  for (let k = 0; k < nM && fade > 0; k++) { const L = lorOf(k), fresh = k >= nM - 3; line(cam.x(L[3][0]), cam.y(L[3][1]), cam.x(L[4][0]), cam.y(L[4][1]), fresh ? P.CR3 : P.CR2, (fresh ? 0.9 : 0.32) * fade); }
}
function s01(t) { hookView(t, t); cap2('ANTIMATTER >', 'MEDICAL IMAGE', 0.05, t); }
// ---------------------------------------------------------------- S02 the scanner: cross-section labels, turn to the side, the IV
function frontView(t) {
  const z = Math.exp(lerp(Math.log(RZ), Math.log(0.2), K75(seg(t, 3.0, 3.5)))), cam = new Cam(0, 0, z, 135, 250), R = rep(), hl = {};
  for (let i = 0; i < RING.n; i++) { const d = (i - R.mB + RING.n) % RING.n; hl[i] = pulse(t, 3.72 + d * 0.014, 0.42) * 0.9; }   // activation sweep: the ring surrounds the patient
  if (t > 4.3) hl[R.mB] = Math.max(hl[R.mB] || 0, 0.85);
  mix(() => drawRing(cam, t, { body: 'pet', hl }), () => drawRing(cam, t, { body: 'tissue', hl }), smooth(seg(t, 3.0, 3.35)));
  if (!UI_ON) return;
  tag('PATIENT', 135, cam.y(118) + 6, 3.5, t, { align: 'center', c: P.INK, plate: P.TI3 });
  const ra = -2.3; callout({ text: 'DETECTOR RING', x: 18, y: 84, ax: cam.x(Math.cos(ra) * (RING.rc + 12)), ay: cam.y(Math.sin(ra) * (RING.rc + 12)), t0: 3.9, plate: true, c: P.CR3 }, t);
  callout({ text: 'DETECTOR MODULE', x: 232, y: 118, align: 'right', ax: cam.x(R.hB[0] * 1.04), ay: cam.y(R.hB[1] * 1.04), t0: 4.3, plate: true, c: P.SG3 }, t);
}
const SIDE_CAM = t => camTrack([[5.2, 233, -100, 2.0], [5.97, 283, -105.9, 5.4, ein]], t, 135, 250);   // ... then towards the IV cannula
function sideView(t) { drawScannerSide(SIDE_CAM(t), t, { slide: 93, ringHL: r => pulse(t, 5.02 + r * 0.07, 0.4), iv: seg(t, 5.3, 5.5) }); }
function s02(t) {
  const fl = K75(seg(t, 4.72, 5.2));   // a quick turn of the scanner: the ring seen end-on becomes the cylinder seen from the side
  if (fl <= 0) frontView(t);
  else if (fl >= 1) sideView(t);
  else { clear(P.BG); withBuffer(TMPBUF, () => sideView(t)); withBuffer(FEEDBUF, () => { UI_ON = false; try { frontView(t); } finally { UI_ON = true; } }); squashBlit(TMPBUF, 135, Math.sin(fl * Math.PI / 2)); squashBlit(FEEDBUF, 135, Math.cos(fl * Math.PI / 2)); }
  cap('PET DETECTOR RING', 3.05, t);
}
// ---------------------------------------------------------------- S03 the earlier injection -> the vein -> one molecule
const VEIN_PT = [96, 240];
const armCam = t => camTrack([[6.0, 138, 241, 2.0], [6.45, 150, 205, 1.2], [6.7, 150, 205, 1.2], [7.3, 122, 228, 1.6, eio]], t, 135, 250);
const MOLB = { x0: 232, ts: 7.95, y: 275 };   // the followed molecule in the blood (its lane is 25 px below the axis)
MOLB.v = 120 * (1 - (25 / 140) ** 2) + 25; MOLB.t0 = MOLB.ts + (MOLB.x0 - 135) / MOLB.v - 0.15;
function bloodOx(t) { const u = (t - MOLB.t0) / 0.3; return u <= 0 ? 0 : u < 1 ? MOLB.v * 0.3 * u * u / 2 : MOLB.v * 0.3 * (u - 0.5); }   // the camera starts riding along
function molX(t) { return MOLB.x0 - MOLB.v * (t - MOLB.ts) + bloodOx(t); }
function drawProtagonist(x, y, t, opt) { // the one tracer molecule we follow
  opt = opt || {};
  const r = 7 + Math.sin(t * 6) * 0.8;
  ring(x, y, r + 2.5, 1, P.TR2, 0.35); ring(x, y, r, 1, P.TR3, 0.9);
  tracerIcon(x, y, opt.s || 3.4, t * 0.8);
  if (opt.phos) rect(x + 4, y - 6, x + 7, y - 3, P.Y2);
}
function bloodView(t, opt) { opt = opt || {}; drawBlood(t, Object.assign({ dir: -1, ox: bloodOx(t) }, opt)); }
function s03(t) {
  const cam = armCam(t);
  drawArm(cam, t, { push: K75(seg(t, 6.5, 7.35)), flow: seg(t, 6.55, 7.6) });
  if (UI_ON && t < 7.3) { const u = 33, a = -1.08, X = cam.x(192 + u * Math.cos(a)), Y = cam.y(176 + u * Math.sin(a)); tag('F-18 FDG', X - 12, Y - 4, 6.3, t, { align: 'right', c: P.TR3, plate: P.TR1 }); }
  if (t > 7.25) {
    const r = t < 7.6 ? 46 * backOut(seg(t, 7.25, 7.6), 1.2) : Math.max(46, 600 * ein(seg(t, 7.6, 7.88)));
    lensReveal(() => { bloodView(t); if (t > MOLB.ts) drawProtagonist(molX(t), MOLB.y, t); }, cam.x(VEIN_PT[0]), cam.y(VEIN_PT[1]), r);
  }
  if (UI_ON && t > MOLB.ts + 0.05) tag('F-18 FDG', molX(t) + 12, MOLB.y - 22, MOLB.ts + 0.1, t, { c: P.TR3, plate: P.TR1 });
  cap('F-18 FDG TRACER', 6.05, t, 'Glucose-like, carries F-18', 6.5);
}
// ---------------------------------------------------------------- S04 riding with the same molecule through the circulation
function s04(t) {
  const nar = K75(seg(t, 11.15, 12.0));                           // the vessel narrows to a capillary; the view slides down to the tissue
  bloodView(t, { top: 110, bot: Math.round(lerp(390, 142, nar)), rs: lerp(1, 0.75, nar), cells: Math.round(lerp(40, 9, nar)), tracer: Math.round(lerp(14, 5, nar)) });
  const mx = lerp(135, 175, nar), my = lerp(MOLB.y, 126, nar);
  drawProtagonist(mx, my, t);
  if (UI_ON && t < 11.4) tag('F-18 FDG', mx + 12, my - 22, 9.0, t, { c: P.TR3, plate: P.TR1 });
  miniMap(200, 86, 42, 96, seg(t, 9.15, 11.7), t);
  cap('TRACER CIRCULATION', 9.05, t, 'Carried by the blood', 9.5);
}
// ---------------------------------------------------------------- S05 uptake: GLUT, hexokinase, trapped
function s05(t) {
  drawUptake2(t, { u: seg(t, 13.6, 14.9), glutOpen: Math.sin(Math.PI * seg(t, 12.62, 13.02)), tags: 13.65 });
  const [mx, my] = up2Mol(t), ph = t >= T_TRAP;
  if (ph && t < T_TRAP + 0.25) glow(mx, my, 12, P.Y0, P.Y2, pulse(t, T_TRAP, 0.25));
  drawProtagonist(mx, my, t, { phos: ph });
  if (t > 14.7) glow(mx, my, 14, P.TR0, P.TR3, 0.5 * seg(t, 14.7, 15.0));                          // light-up before the dive
  if (UI_ON) {
    if (t < 13.3) tag('GLUT', 166, 152, 12.5, t, { c: P.CR3, plate: P.CR0 });
    if (ph) tag('TRAPPED', mx + 12, my - 20, T_TRAP + 0.06, t, { c: P.Y3, plate: P.Y1 });
  }
  cap('TRACER UPTAKE', 12.05, t, 'Normal cells take it up', 13.7);
}
// ---------------------------------------------------------------- S06 into the same molecule, its F-18 atom, the nucleus
function fdgPos(t) { return [135 + 2 * Math.sin(t * 1.7), 230 + 3 * Math.sin(t * 2.4)]; }   // the big FDG jiggles (thermal motion)
function moleculeView(t, opt) { // inside the cell: cytoplasm with drifting FDG + one large FDG
  opt = opt || {};
  clear(P.TI1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.2 + 0.18 * vn2(x * 0.04 + t * 0.55, y * 0.04 - t * 0.25, 81)) buf[y * W + x] = P.TI2;
  const [fx, fy] = fdgPos(t);
  for (let k = 0; k < 11; k++) { const x = ((hash(k + 1) * 300 + t * 34 * (hash(k) - 0.5)) % 290 + 290) % 290 - 10, y = 70 + hash(k + 9) * 360 + 6 * Math.sin(t * 1.3 + k); if (Math.hypot(x - fx, y - fy) > 70) tracerIcon(x, y, 3.2, t * 0.9 + k); }
  drawFDG(fx, fy, opt.s || 40, { fGlow: opt.fGlow || 0, phos: opt.phos });
}
// the F-18 nucleus; tD = moment of the beta-plus decay. opt: zk (0 atom .. 1 nucleus), build [t0, t1], pan [dx, dy], legend, o18
function decayView(t, tD, opt) {
  opt = opt || {};
  clear(P.BG);
  const zk = opt.zk === undefined ? 1 : opt.zk, pan = opt.pan || [0, 0], R = lerp(2.2, 34, zk), cx = CX + pan[0], cy = 236 + pan[1];
  const bk = opt.build && t < tD ? seg(t, opt.build[0], opt.build[1]) : 0, jit = bk > 0 ? (hash3(Math.floor(t * 30), 3, 9) - 0.5) * 1.6 * bk * bk : 0, rot = t * (0.7 + 1.4 * bk * bk);
  if (zk < 1) { const s = lerp(1, 8, zk), a = 1 - zk; disc(cx, cy, 120 * s, P.EL0, 0.22 * a); disc(cx, cy, 78 * s, P.EL1, 0.25 * a); disc(cx, cy, 26 * s, P.EL1, 0.35 * a); disc(cx, cy, 12 * s, P.EL2, 0.3 * a); }
  drawNucleus(cx + jit, cy, R, rot, clamp((t - tD) / 0.12, 0, 1), t > tD - 0.2 && t < tD + 0.3 ? 0.7 : 0.4 * bk);
  if (bk > 0) { const p = nucleonScreen(cx + jit, cy, R, rot, DECAY_IDX), w = Math.sin(t * TAU * (3 + 9 * bk)); ring(p[0], p[1], R * 0.42 + 2 + 1.5 * w, 1, P.C6, 0.35 + 0.6 * bk); }   // the proton about to convert
  if (opt.legend !== undefined && t >= opt.legend && UI_ON) { const y = cy + R + 16; disc(cx - 66, y + 4, 4, P.PR2); tag('PROTON', cx - 58, y, opt.legend, t, { c: P.PR3 }); disc(cx + 8, y + 4, 4, P.NE2); tag('NEUTRON', cx + 16, y, opt.legend + 0.1, t, { c: P.NE3 }); }
  if (t >= tD) {
    const u = t - tD, ex = cx + 30 + 70 * u + 12 * u * u, ey = cy - 20 - 45 * u, p0 = nucleonScreen(cx, cy, R, rot, DECAY_IDX);
    if (u < 0.08) annihilationFlash(p0[0], p0[1], u / 0.08 * 0.6, 0.6);
    const tr = []; for (let k = 8; k >= 0; k--) { const uu = Math.max(0, u - k * 0.03); tr.push([cx + 30 + 70 * uu + 12 * uu * uu, cy - 20 - 45 * uu]); }
    trail(tr, P.PO2, P.PO1); positronAt(ex, ey, 7, t);
    const nx = cx + 24 + 300 * u, ny = cy + 26 + 230 * u; neutrino(nx, ny, 300, 230);                 // barely interacts: it leaves
    if (UI_ON) { if (ex < 228 && ey > 46) tag('POSITRON ' + EPL, ex + 12, ey - 6, tD + 0.06, t, { c: P.PO3, plate: P.PO1 }); if (u < 0.45) tag('NEUTRINO', nx + 8, ny + 4, tD + 0.05, t, { c: P.NT }); }
  }
  if (opt.o18 && t > opt.o18 && UI_ON) tag('O-18', cx, cy + R + 12, opt.o18, t, { align: 'center', c: P.NE3, plate: P.NE1 });
}
function s06(t) {
  if (t < 15.42) {
    drawUptake2(t, { u: 1, tags: 13.65 });
    const m = up2Mol(t); drawProtagonist(m[0], m[1], t, { phos: true });
    if (t > 15.05) lensReveal(() => moleculeView(t, { phos: true }), m[0], m[1], Math.max(4, 600 * ein(seg(t, 15.05, 15.42))));
  } else if (t < 16.25) {
    moleculeView(t, { phos: true, fGlow: seg(t, 15.55, 15.85) });
    if (UI_ON) { const f = fdgF(...fdgPos(t), 40); tag('FLUORINE-18', f[0] + 16, f[1] + 12, 15.7, t, { c: P.FO3, plate: P.FO1 }); }
  } else if (t < 16.62) {
    const f = fdgF(...fdgPos(t), 40); moleculeView(t, { phos: true, fGlow: 1 });
    lensReveal(() => decayView(t, T_DECAY, { zk: 0 }), f[0], f[1] + 4, Math.max(8, 600 * ein(seg(t, 16.25, 16.62))));
  } else decayView(t, T_DECAY, { zk: K75(seg(t, 16.62, 17.1)), legend: 17.2 });
  cap('FLUORINE-18', 15.05, t, '9 protons + 9 neutrons', 17.2);
}
// ---------------------------------------------------------------- S07 beta-plus decay (build-up, conversion, emission)
function s07(t) {
  const u = Math.max(0, t - T_DECAY), ex0 = CX + 30 + 70 * u + 12 * u * u, ey0 = 236 - 20 - 45 * u, pk = K75(seg(t, 21.4, 22.0));
  decayView(t, T_DECAY, { zk: 1 - 0.6 * pk, build: [18.0, T_DECAY], legend: t < 18.6 ? 17.2 : undefined, o18: t < 21.45 ? 21.05 : 0, pan: [pk * (135 - ex0), pk * (250 - ey0)] });
  if (UI_ON) { // the sequence, written as it happens
    const x = 18, y = 300, lines = [['F-18', 18.25, P.FO3], ['> BETA-PLUS DECAY', T_DECAY + 0.08, P.INK], ['> O-18 + ' + EPL + ' + ν', T_DECAY + 0.45, P.NE3]];
    let w = 0; for (const [s, t0] of lines) if (t > t0) w = Math.max(w, textW(FM, s, 2));
    if (w > 0) rect(x - 4, y - 4, x + w + 4, y + (t > lines[2][1] ? 42 : t > lines[1][1] ? 27 : 12), P.K0, 0.85);
    lines.forEach(([s, t0, c], i) => { if (t > t0) text(FM, s, x, y + i * 15, { c, ol: null, n: (t - t0) * 50 }); });
  }
  cap('POSITRON EMISSION', 18.05, t, 'Proton becomes neutron', 18.6);
}
// ---------------------------------------------------------------- S08 the same positron slows down in tissue (atomic scale)
const PT_VERT = (() => { const out = [], L = PTRACK_P.L; for (let i = 1; i < PTRACK.length; i++) { const c = PTRACK_P.c[i] / L; out.push(1 - Math.cbrt(1 - Math.min(0.999, c))); } return out; })();
function positronWalk(t, t0, t1, opt) {
  opt = opt || {};
  const u = clamp((t - t0) / (t1 - t0), 0, 1), p = ptrackAt(u), lag = ptrackAt(clamp((t - 0.18 - t0) / (t1 - t0), 0, 1));
  const z = opt.z || 1.35, cam = new Cam(lerp(lag[0], p[0], 0.5), lerp(lag[1], p[1], 0.5), z, 135, 250);
  clear(P.BG); waterField(cam, t, 0.9);
  const tr = []; for (let k = 40; k >= 0; k--) { const q = ptrackAt(clamp(u - k * 0.012, 0, 1)); tr.push([cam.x(q[0]), cam.y(q[1])]); }
  trail(tr, P.PO2, P.PO1);
  PT_VERT.forEach((uv, i) => { // each change of direction = an electromagnetic interaction: an atomic electron is knocked out
    const a = (t - t0) - uv * (t1 - t0); if (a < 0 || a > 0.35) return;
    const v = PTRACK[i + 1], ang = hash(i * 9 + 4) * TAU, d = 4 + 40 * a, X = cam.x(v[0] + Math.cos(ang) * d), Y = cam.y(v[1] + Math.sin(ang) * d);
    electronAt(X, Y, 2.2, t, 1 - a / 0.35); if (a < 0.08) ring(cam.x(v[0]), cam.y(v[1]), 2 + 40 * a, 1, P.PO3, 1 - a / 0.08);
  });
  positronAt(cam.x(p[0]), cam.y(p[1]), lerp(7, 5, u), t, 1);
  energyBar(1 - eout(u) * 0.97, t0 + 0.1, t);
  return cam;
}
function s08(t) {
  const cam = positronWalk(t, 22.0, 24.7);
  if (t < 22.9) { const k = 1 - seg(t, 22.0, 22.9), X = cam.x(PTRACK[0][0]), Y = cam.y(PTRACK[0][1]); disc(X, Y, 9, P.NE1, 0.35 * k); disc(X, Y, 3, P.NE2, k); if (UI_ON && k > 0.3) tag('O-18', X - 34, Y + 8, 22.0, t, { c: P.NE3 }); }
  if (t > 24.2) { const e = PTRACK[PTRACK.length - 1], k = seg(t, 24.2, 25.0); electronAt(cam.x(e[0]) + lerp(80, 34, k), cam.y(e[1]) + lerp(-46, -14, k), 6, t, k); }   // the electron it is about to meet
  cap('POSITRON SLOWS DOWN', 22.05, t, 'Mean range under 1 mm', 22.6);
}
// ---------------------------------------------------------------- S09 annihilation (the drop), the camera starts pulling back
function annihilation(t, tA, opt) {
  opt = opt || {};
  const big = opt.big ? 1.6 : (opt.scale || 1), dance = opt.dance || 0.35, zf = opt.pull ? opt.pull(t) : 1;
  clear(P.BG); waterField(new Cam(40, 20, 2.2 * zf, 135, 250), t, 0.5);
  const cx = CX, cy = opt.cy || 240;
  if (t < tA) {
    const u = clamp((t - (tA - dance)) / dance, 0, 1), ang = (opt.big ? 9 : 6) * u * u + t * 2, r = lerp(46, 6, eout(u)) * big;
    const pin = clamp((t - (tA - dance - 0.7)) / 0.7, 0, 1);
    const ex = cx + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
    const px = u > 0 ? cx - Math.cos(ang) * r : lerp(cx - 140, cx - r, eout(pin)), py = u > 0 ? cy - Math.sin(ang) * r : cy + 6;
    electronAt(u > 0 ? ex : cx + r, u > 0 ? ey : cy, 9 * big, t);
    positronAt(px, py, 9 * big, t);
    if (UI_ON && opt.tags && u < 0.6) { tag('POSITRON', px - 30, py + 18, tA - dance - 0.6, t, { c: P.PO3 }); tag('ELECTRON', (u > 0 ? ex : cx + r) - 30, (u > 0 ? ey : cy) - 30, tA - dance - 0.5, t, { c: P.EL3 }); }
    if (opt.big && u > 0.4) disc(cx, cy, 30 * u, P.GA0, 0.18 * u);
  } else {
    const a = t - tA, th = opt.th || 0, d = opt.pull ? (24 + 120 * a) * zf : 26 + 330 * a;
    annihilationFlash(cx, cy, clamp(a / (opt.big ? 0.42 : 0.3), 0, 1), big * Math.max(0.45, zf));
    const bl = opt.bloom !== undefined ? opt.bloom : (opt.big ? 0.55 : 0), bd = opt.big ? 0.18 : 0.14, R = opt.big ? 110 : 62;
    if (bl > 0 && a < bd) { // controlled radial light bloom: energy released, no blast wave
      const L = bl * (1 - a / bd), y0 = Math.max(0, Math.floor(cy - 2.4 * R)), y1 = Math.min(H, Math.ceil(cy + 2.4 * R));
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const g = L * gauss(Math.hypot(x - cx, y - cy) / R); if (g > 0.03 && bay(x, y) < g) buf[y * W + x] = g > 0.3 ? P.C6 : g > 0.14 ? P.GA3 : P.GA2; }
    }
    const dx = Math.cos(th), dy = Math.sin(th), p1 = [cx + dx * d, cy + dy * d], p2 = [cx - dx * d, cy - dy * d];
    gamma(p1[0], p1[1], dx, dy, { len: 20 * big, amp: 2.6 * big, ph: a * 40 });
    gamma(p2[0], p2[1], -dx, -dy, { len: 20 * big, amp: 2.6 * big, ph: a * 40 });
    if (UI_ON && opt.tags) { // the two equal energies travel with their photons
      if (p1[1] > 92 && p1[0] < 250) tag('511 ' + KEV, p1[0] + 12, p1[1] - 6, tA + 0.12, t, { c: P.GA3, plate: P.GA1 });
      if (p2[1] < 352 && p2[0] > 20) tag('511 ' + KEV, p2[0] - 12, p2[1] - 6, tA + 0.12, t, { c: P.GA3, plate: P.GA1, align: 'right' });
    }
  }
}
const ZF9 = t => Math.exp(Math.log(0.3) * ein(seg(t, 26.9, 28.0)));
function s09(t) { annihilation(t, T_ANN, { big: true, dance: 0.8, th: TH_E, cy: 250, bloom: 0.5, pull: ZF9, tags: true }); cap('ANNIHILATION', 25.05, t, '511 ' + KEV + ' + 511 ' + KEV, 25.6); }
// ---------------------------------------------------------------- S10 the same two photons reach opposite detectors
const D0_10 = (24 + 120 * (28.0 - T_ANN)) * 0.3 / 2.4;   // where S09 left them (mm)
function diveCamB(t) { // creep towards module B (the photon we follow next), then dive into it
  const h = rep().hB, f = 0.06 * smooth(seg(t, 30.45, 31.0)) + 0.94 * ein(seg(t, 31.0, 31.45)), z = Math.exp(lerp(Math.log(RZ), Math.log(5), f)), g = (1 / RZ - 1 / z) / (1 / RZ - 1 / 5);
  return new Cam(h[0] * g, h[1] * g, z, 135, 250);
}
function s10cam(t) {
  if (t > 30.45) return diveCamB(t);
  const z = Math.exp(lerp(Math.log(2.4), Math.log(RZ), 1 - Math.pow(1 - seg(t, 28.0, 29.7), 4))), g = (1 / 2.4 - 1 / z) / (1 / 2.4 - 1 / RZ);
  return new Cam(lerp(E_REP[0], 0, g), lerp(E_REP[1], 0, g), z, 135, 250);
}
function s10(t) {
  const R = rep(), cam = s10cam(t), v = (R.L - D0_10) / (T_DET - 28.0), d = D0_10 + (t - 28.0) * v, hl = {};
  if (t >= T_DET) { const k = pulse(t, T_DET, 0.6); hl[R.mA] = hl[R.mB] = 0.5 + 0.5 * k; }
  drawRing(cam, t, { body: 'tissue', hl });
  if (t < 28.7) { const k = 1 - seg(t, 28.0, 28.7); ring(cam.x(E_REP[0]), cam.y(E_REP[1]), 3 + 4 * (1 - k), 1, P.GA2, k); }   // where the annihilation happened
  if (t < T_DET) photonPair(cam, E_REP, TH_E, d, t, { L: R.L });
  else { const k = pulse(t, T_DET, 0.45); for (const h of [R.hA, R.hB]) glow(cam.x(h[0]), cam.y(h[1]), 10, P.GA0, P.GA3, k); }
  if (UI_ON && t < 30.45) {
    tag('BODY', cam.x(0), cam.y(122) + 4, 28.85, t, { align: 'center', c: P.TI4 });
    tag('DETECTOR RING', cam.x(-300), cam.y(302) + 8, 29.35, t, { c: P.CR3, plate: P.CR0 });
    if (t < T_DET) { const q = [E_REP[0] + Math.cos(TH_E) * Math.min(d, R.L), E_REP[1] + Math.sin(TH_E) * Math.min(d, R.L)]; tag('GAMMA', cam.x(q[0]) - 12, cam.y(q[1]) + 8, 28.6, t, { c: P.GA3, align: 'right' }); }
  }
  cap('GAMMA DETECTION', 28.05, t, 'Both reach the ring', 28.5);
}
// ---------------------------------------------------------------- S11 inside the crystal: gamma -> energy deposition -> excitation -> light
const XC = (crystalX0(2) + crystalX1(2)) / 2, XDEPTH = 196;
const ETRACK = (() => { const pts = [[XC, XDEPTH]]; let x = XC, y = XDEPTH, a = 0.6; for (let i = 0; i < 9; i++) { a += (hash(i * 5 + 71) - 0.5) * 2.2; const st = 9 - i * 0.6; x = clamp(x + Math.cos(a) * st, crystalX0(2) + 4, crystalX1(2) - 4); y += Math.sin(a) * st; pts.push([x, y]); } return pts; })();
const ETC = [ETRACK.reduce((s, p) => s + p[0], 0) / ETRACK.length, ETRACK.reduce((s, p) => s + p[1], 0) / ETRACK.length];
function excitation(t, k) { for (let i = 0; i < ETRACK.length; i++) { const [x, y] = ETRACK[i], a = k * (0.6 + 0.4 * Math.sin(t * 9 + i)); if (a > 0) { disc(x, y, 2.5, P.CR2, a * 0.7); pset(x, y, P.SL2); } } }
const OPH = []; for (let i = 0; i < 56; i++) OPH.push({ s: i % ETRACK.length, a: hash(i * 3 + 1) * TAU, v: 210 + 80 * hash(i * 3 + 2), dt: hash(i * 3 + 3) * 0.12 });
function bounce(x, a, b) { const L = b - a, u = ((x - a) % (2 * L) + 2 * L) % (2 * L); return a + (u < L ? u : 2 * L - u); }
function ophPos(o, t) { // optical photon bouncing between the reflector walls: [x, y, arrived at the SiPM]
  const u = t - T_SCINT - o.dt; if (u < 0) return null;
  const [x0, y0] = ETRACK[o.s], vx = Math.cos(o.a) * o.v, vy = Math.sin(o.a) * o.v;
  let y = y0 + vy * u; if (y < MC.y0 + 2) y = 2 * (MC.y0 + 2) - y;
  const x = bounce(x0 + vx * u, crystalX0(2) + 1, crystalX1(2) - 1);
  return [x, Math.min(y, MC.y1), y >= MC.y1];
}
function crystalScene(t) { // module cutaway with the whole sequence (shared by S11 and the start of S12)
  const R = rep();
  let arrived = 0; const pts = OPH.map(o => { const p = ophPos(o, t); if (p && p[2]) arrived++; return p; });
  if (t < 31.45) mix(() => drawRing(diveCamB(t), t, { body: 'tissue', hl: { [R.mB]: 0.8 } }), () => drawModuleCut(t, {}), smooth(seg(t, 31.25, 31.45)));
  else drawModuleCut(t, { lit: [0, 0, (t > T_XTAL ? 0.25 * pulse(t, T_XTAL, 0.6) : 0) + (t > T_SCINT ? 0.35 * pulse(t, T_SCINT, 0.8) : 0), 0, 0], sipm: [0, 0, arrived / OPH.length, 0, 0] });
  if (t > 31.32 && t < T_XTAL) { const y = lerp(40, XDEPTH, (t - 31.32) / (T_XTAL - 31.32)); gamma(XC, y, 0, 1, { len: 18, amp: 3, ph: t * 40 }); }
  if (t >= T_XTAL) {
    const a = t - T_XTAL; if (a < 0.25) annihilationFlash(XC, XDEPTH, a / 0.25 * 0.8 + 0.2, 0.5);            // photoelectric absorption: the gamma photon is gone
    const n = Math.min(ETRACK.length - 1, Math.floor(a / 0.04)), f = clamp(a / 0.04 - n, 0, 1);
    for (let i = 0; i < n; i++) line(ETRACK[i][0], ETRACK[i][1], ETRACK[i + 1][0], ETRACK[i + 1][1], P.EL2);
    if (n < ETRACK.length - 1) { const p = [lerp(ETRACK[n][0], ETRACK[n + 1][0], f), lerp(ETRACK[n][1], ETRACK[n + 1][1], f)]; electronAt(p[0], p[1], 3, t); }
    for (let i = 0; i <= n; i++) { const [x, y] = ETRACK[i]; disc(x, y, 2, P.CR3, 0.8); }
    if (t > 32.6 && t < T_SCINT + 0.25) {
      glow(ETC[0], ETC[1], 26, P.CR1, P.CR3, (0.22 + 0.12 * Math.sin(t * 7)) * seg(t, 32.6, 32.8)); excitation(t, t < T_SCINT ? 0.45 + 0.3 * seg(t, 33.2, T_SCINT) : pulse(t, T_SCINT, 0.25));
      if (t < T_SCINT) for (let q = 0; q < 10; q++) { const sl = Math.floor(t * 20) + q, e = ETRACK[Math.floor(hash3(sl, q, 3) * ETRACK.length)]; pset(e[0] + (hash3(sl, q, 4) - 0.5) * 12, e[1] + (hash3(sl, q, 5) - 0.5) * 12, hash3(sl, q, 6) > 0.5 ? P.SL2 : P.CR3); }
    }
    if (UI_ON && t < 32.6) tag('ELECTRON', XC - 24, XDEPTH - 30, T_XTAL + 0.1, t, { c: P.EL3, plate: P.EL1, align: 'right' });
    if (t > 32.55 && t < 35.0) energyLevels(164, 122, 86, 76, t, 32.75, 33.62);
  }
  for (let i = 0; i < OPH.length; i++) {
    const p = pts[i], o = OPH[i], u = t - T_SCINT - o.dt;
    if (u >= 0 && u < 0.07) { const [x0, y0] = ETRACK[o.s]; ring(x0, y0, 1 + 40 * u, 1, P.SL1, 1 - u / 0.07); }
    if (!p || p[2]) continue; optPhoton(p[0], p[1], Math.cos(o.a), Math.sin(o.a));
  }
  if (t > T_SCINT && t < T_SCINT + 0.2) glow(XC, XDEPTH, 18, P.SL0, P.SL2, pulse(t, T_SCINT, 0.2));
  if (UI_ON && t > 31.6 && t < T_XTAL) tag('LYSO CRYSTAL', XC + 26, 118, 31.6, t, { c: P.CR3, plate: P.CR0 });
}
const STEPS = [['1 GAMMA PHOTON', 31.45], ['2 ENERGY DEPOSITION', 32.0], ['3 ELECTRONIC EXCITATION', 32.6], ['4 SCINTILLATION LIGHT', T_SCINT]];
function s11(t) {
  crystalScene(t);
  let st = -1; while (st + 1 < STEPS.length && t >= STEPS[st + 1][1]) st++;
  if (st < 0) cap('GAMMA > LIGHT', 31.05, t); else cap('GAMMA > LIGHT', 31.05, t, STEPS[st][0], STEPS[st][1]);
  if (UI_ON && t > 31.3) for (let i = 0; i < 4; i++) { const x = 150 + i * 10; rect(x, 45, x + 6, 51, i <= st ? P.SL1 : P.N4); }   // step dots
}
// ---------------------------------------------------------------- S12 light -> SiPM -> electrical pulse -> front end; the matching pulse
const FIRED = []; for (let k = 0; k < 24; k++) FIRED.push([Math.floor(hash(k * 7 + 1) * SP.cols), Math.floor(hash(k * 7 + 2) * SP.rows), T_SIPM + 0.32 * hash(k * 7 + 3)]);
function sipmScene(t) {
  const fire = (i, j) => { let f = 0; for (const [a, b, tf] of FIRED) if (a === i && b === j && t >= tf) f = Math.max(f, pulse(t, tf, 0.55)); return f; };
  drawSiPM(t, { fire });
  for (const [i, j, tf] of FIRED) {
    const [x, y] = spCell(i, j), cx = x + SP.c / 2 - 2, cy = y + SP.c / 2 - 2, u = (tf - t) / 0.45;
    if (u > 0 && u < 1) optPhoton(cx + u * 18, cy - u * 110, -0.16, 1);                                     // the scintillation light arrives
    const a = t - tf; if (a >= 0 && a < 0.3) {                                                                // absorbed: charge carriers, then the avalanche
      const k = 1 - a / 0.3; pset(cx - 2, cy - 2 - a * 22, P.PR3); pset(cx + 2, cy + 2 + a * 22, P.EL3);
      if (a > 0.04) for (let q = 0; q < 6; q++) { const an = q / 6 * TAU + i, rr = 2 + (a - 0.04) * 40; if (bay(q, i) < k) pset(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, P.EL2); }
    }
  }
  const nf = FIRED.filter(f => t >= f[2]).length;
  drawPulseScope(18, 314, 120, 46, seg(t, T_SIPM, 36.2), nf / FIRED.length, P.SG2);
  const kf = seg(t, 36.2, 36.6), fx = lerp(138, 176, kf);                                                    // the pulse travels to the front-end electronics
  line(138, 337, 176, 337, kf > 0 ? P.SG1 : P.N5); if (kf > 0 && kf < 1) { disc(fx, 337, 2.5, P.SG3); glow(fx, 337, 6, P.SG0, P.SG2, 0.6); }
  const on = t > 36.6; rect(176, 316, 240, 358, P.K0); frame(176, 316, 240, 358, on ? P.SG2 : P.N5);
  for (let k = 0; k < 6; k++) { rect(180 + k * 10, 312, 183 + k * 10, 316, P.Y1); rect(180 + k * 10, 358, 183 + k * 10, 362, P.Y1); }
  if (UI_ON) { text(FM, 'FRONT', 208, 326, { c: on ? P.SG3 : P.SUB, ol: null, align: 'center' }); text(FM, 'END', 208, 340, { c: on ? P.SG3 : P.SUB, ol: null, align: 'center' }); }
}
function splitView(t) { // the opposite module recorded the matching photon at (almost) the same moment
  clear(P.BG);
  [[0, 'MODULE A (LEFT)', 96, T_SPLIT + 0.06], [1, 'MODULE B (RIGHT)', 228, T_SPLIT]].forEach(([i, lab, y0, td]) => {
    rect(14, y0, 256, y0 + 120, P.N1); frame(14, y0, 256, y0 + 120, i ? P.SG1 : P.SG2);
    if (UI_ON) text(FM, lab, 22, y0 + 6, { c: P.INK, ol: null });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = 24 + c * 15, y = y0 + 34 + r * 15, f = t >= td && hash3(r, c, i + 7) > 0.45 ? pulse(t, td + 0.1 * hash3(c, r, i), 0.5) : 0, dk = hash3(r * 4 + c, i, Math.floor(t * 8)) > 0.93; rect(x, y, x + 12, y + 12, P.V2); rect(x + 2, y + 2, x + 10, y + 10, f > 0 ? P.SG2 : dk ? P.SG1 : P.V1); }
    drawPulseScope(98, y0 + 26, 146, 74, seg(t, td, td + 0.55), 0.92, P.SG2);
    if (t > td + 0.55) { const u = ((t - td - 0.55) * 1.6) % 1, xs = u, v = xs < 0.18 ? 0 : (1 - Math.exp(-(xs - 0.18) / 0.02)) * Math.exp(-(xs - 0.18) / 0.22); disc(98 + xs * 146, y0 + 26 + 74 - 4 - v * 64 * 0.92, 2, P.SG3); }
    const kr = seg(t, 38.3, 38.9); if (kr > 0) { const x = lerp(244, 290, kr); disc(x, y0 + 60, 3, P.SG3); line(244, y0 + 60, x, y0 + 60, P.SG1); }   // to the readout
  });
  if (UI_ON && t > T_SPLIT + 0.35) tag('MATCHING PULSE', 244, 200, T_SPLIT + 0.35, t, { align: 'right', c: P.SG3, plate: P.SG0 });
}
function s12(t) {
  if (t < 35.62) { crystalScene(t); lensReveal(() => sipmScene(t), XC, MC.sipm0 + 10, t < 35.3 ? 0 : Math.max(10, 600 * ein(seg(t, 35.3, 35.62)))); }
  else if (t < T_SPLIT - 0.12) sipmScene(t);
  else mix(() => sipmScene(t), () => splitView(t), smooth(seg(t, T_SPLIT - 0.12, T_SPLIT + 0.04)));
  cap('LIGHT > ELECTRIC SIGNAL', 35.05, t, 'Light frees charges', 35.5);
}
// ---------------------------------------------------------------- S13 what each detection measures: position, time, energy
function miniRing(x, y, r, t, mA, mB) {
  for (let i = 0; i < RING.n; i++) { const a = modAngle(i), lit = i === mA || i === mB; rect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, x + Math.cos(a) * r + 2, y + Math.sin(a) * r + 2, lit ? P.SG2 : P.CR1); }
  ellipse(x, y, r * 0.45, r * 0.3, P.TI2);
  if (UI_ON) { const pa = modAngle(mA), pb = modAngle(mB); tag('A', x + Math.cos(pa) * (r + 10) - 4, y + Math.sin(pa) * (r + 10) - 5, 39.6, t, { c: P.SG3 }); tag('B', x + Math.cos(pb) * (r + 10) - 4, y + Math.sin(pb) * (r + 10) - 5, 40.0, t, { c: P.SG3 }); }
}
function s13(t) {
  clear(P.BG);
  const R = rep();
  dataCard(18, 92, 234, 'LEFT EVENT', [['POSITION A', 'MODULE ' + modName(R.mA)], ['TIME T1', '12.084 NS'], ['ENERGY E1', '506 ' + KEV]], t, 39.35, P.SG2);
  dataCard(18, 176, 234, 'RIGHT EVENT', [['POSITION B', 'MODULE ' + modName(R.mB)], ['TIME T2', '12.271 NS'], ['ENERGY E2', '517 ' + KEV]], t, 39.75, P.SG2);
  if (t < 39.5) { const k = seg(t, 39.0, 39.45); disc(lerp(-6, 30, k), 120, 3, P.SG3); disc(lerp(-6, 30, k), 204, 3, P.SG3); }   // the two pulses arrive
  miniRing(135, 300, 34, t, R.mA, R.mB);
  for (const m of [R.mA, R.mB]) { const a = modAngle(m), k = 0.35 + 0.35 * Math.sin(t * 8); glow(135 + Math.cos(a) * 34, 300 + Math.sin(a) * 34, 7, P.SG0, P.SG2, k); }
  if (t > 40.45 && t < 41.05) for (const y0 of [92, 176]) { const yy = Math.round(y0 + 2 + ((t - 40.45) * 1.7 % 1) * 60); rect(19, yy, 251, yy + 2, P.SG1, 0.5); }   // the record is read into the electronics
  if (t > 40.95) { // each detection becomes a digital event record
    for (const [y, sd, d] of [[97, 1, 0], [181, 2, 0.12]]) { const k = K75(seg(t, 40.95 + d, 41.45 + d)), x = lerp(150, 290, K75(seg(t, 41.5 + d, 41.95))); if (k > 0) packet(x, y + 2, sd, P.SG2); }
    if (UI_ON) tag('DIGITAL EVENT DATA', 18, 250, 41.05, t, { c: P.SG3, plate: P.SG0 });
  }
  cap('EVENT MEASUREMENT', 39.05, t, 'Where, when, what energy', 39.4);
}
// ---------------------------------------------------------------- S14 the coincidence processor: time window + energy window
function s14(t) {
  clear(P.BG);
  const bx0 = 26, by0 = 150, bx1 = 244, by1 = 290;
  rect(bx0, by0, bx1, by1, P.K0); frame(bx0, by0, bx1, by1, t > T_CC + 0.3 ? P.SG2 : P.N5);
  for (let k = 0; k < 8; k++) { rect(bx0 + 14 + k * 26, by0 - 4, bx0 + 18 + k * 26, by0, P.Y1); rect(bx0 + 14 + k * 26, by1, bx0 + 18 + k * 26, by1 + 4, P.Y1); }
  text(FM, 'COINCIDENCE PROCESSOR', 135, by0 + 8, { c: P.SUB, ol: null, align: 'center' });
  const ka = K75(seg(t, 42.0, 42.4)), kb = K75(seg(t, 42.15, 42.55));
  if (ka < 1) packet(lerp(-40, 60, ka), 126, 1, P.SG2); if (kb < 1) packet(lerp(310, 174, kb), 126, 2, P.SG2);
  // timestamps on one clock; the window is a few nanoseconds wide
  const y1 = 196, x0 = 80, x1 = 234, T1 = 150, T2 = 156;
  text(FM, 'TIME', 34, y1 - 4, { c: P.SUB, ol: null }); rect(x0, y1, x1, y1 + 1, P.N5);
  if (t > 42.45) { rect(T1 - 1, y1 - 7, T1 + 1, y1 + 7, P.SG3); text(FM, 'T1', T1 - 6, y1 + 9, { c: P.SG3, ol: null, sc: 1 }); }
  if (t > 42.6) { rect(T2 - 1, y1 - 7, T2 + 1, y1 + 7, P.SG3); text(FM, 'T2', T2 + 2, y1 + 9, { c: P.SG3, ol: null, sc: 1 }); }
  const kw = K75(seg(t, 42.7, 42.95)); if (kw > 0) { const a = Math.round(lerp(T1, 86, kw)), b = Math.round(lerp(T1, 214, kw)); rect(a, y1 - 11, b, y1 - 10, P.SG2); rect(a, y1 - 11, a + 1, y1 - 4, P.SG2); rect(b - 1, y1 - 11, b, y1 - 4, P.SG2); }
  if (t > 42.8) text(FM, 'WINDOW 4 NS', 150, y1 - 24, { c: P.SG3, ol: null, align: 'center', sc: 1, n: (t - 42.8) * 60 });
  if (t > 42.95) { text(FM, 'GAP 0.19 NS', 80, y1 + 16, { c: P.INK, ol: null, n: (t - 42.95) * 60 }); okMark(220, y1 + 16, true, 1); }
  // both energies near 511 keV (inside the energy window)
  const y2 = 254, e2x = kev => Math.round(x0 + (kev - 300) / 400 * (x1 - x0));
  text(FM, 'ENERGY', 34, y2 - 4, { c: P.SUB, ol: null }); rect(x0, y2, x1, y2 + 1, P.N5);
  if (t > T_CC - 0.1) rect(e2x(435), y2 - 6, e2x(585), y2 + 6, P.SG0);
  if (t > T_CC) { for (const e of [506, 517]) rect(e2x(e) - 1, y2 - 7, e2x(e) + 1, y2 + 7, P.SG3); text(FM, '435-585 ' + KEV, 80, y2 + 12, { c: P.INK, ol: null, n: (t - T_CC) * 60 }); }
  if (t > T_CC + 0.15) okMark(220, y2 + 12, true, 1);
  if (t > 43.45) { const s = 'COINCIDENCE ACCEPTED', w = textW(FM, s, 2), k = pop(t, 43.45); rect(135 - w / 2 - 5, 302, 135 - w / 2 - 5 + (w + 10) * Math.min(1, k), 320, P.SG1); if (k > 0.8) text(FM, s, 135, 306, { c: P.SG3, ol: null, align: 'center' }); }
  if (t > 43.9) text(FM, 'MAY STILL BE SCATTER', 135, 328, { c: P.C3, ol: null, align: 'center', n: (t - 43.9) * 50 });   // a candidate pair, not a guarantee
  if (t > 43.45 && t < 44.3) { const k = 0.5 + 0.5 * Math.sin((t - 43.45) * 16); frame(bx0 - 2, by0 - 2, bx1 + 2, by1 + 2, k > 0.5 ? P.SG3 : P.SG1); }
  if (t > 44.25) { const k = K75(seg(t, 44.25, 44.95)), x = lerp(135, 135, k), y = lerp(222, 40, k); packet(x - 24, y, 9, P.SG3, 16); if (UI_ON) tag('A + B', x - 12, y + 10, 44.3, t, { c: P.SG3 }); }   // one coincidence record -> a line of response
  cap('COINCIDENCE DETECTION', 42.05, t, 'Checks time and energy', 42.5);
}
// ---------------------------------------------------------------- S15 the line of response (the origin is somewhere along it)
function s15(t) {
  const R = rep(), cam = RCAM();
  drawRing(cam, t, { body: 'tissue', hl: { [R.mA]: 0.85, [R.mB]: 0.85 } });
  const x1 = cam.x(R.hA[0]), y1 = cam.y(R.hA[1]), x2 = cam.x(R.hB[0]), y2 = cam.y(R.hB[1]);
  drawLOR(cam, R.hA, R.hB, K75(seg(t, T_LOR, T_LOR + 0.35)), 1);
  if (t > T_LOR + 0.35) { lineW(x1, y1, x2, y2, 5, P.CR1, 0.25 + 0.2 * Math.sin((t - T_LOR) * TAU / BEAT)); line(x1, y1, x2, y2, P.CR3); for (let q = 0; q < 9; q++) { const f = lerp(R.s0, R.s1, (q + 0.5) / 9), a = Math.max(0, Math.cos(TAU * ((t - T_LOR) * 0.8 - q / 9))) ** 4; if (a > 0.1) disc(lerp(x1, x2, f), lerp(y1, y2, f), 1 + 1.5 * a, P.C6, a); } }
  if (t > 45.5) { // a moving range highlight: one coincidence cannot tell where on the line the annihilation was
    const ph = 0.5 - 0.5 * Math.cos((t - 45.5) * 2.6), sc = lerp(R.s0 + 0.03, R.s1 - 0.03, ph), hw = 0.05, k = seg(t, 45.5, 45.8);
    const ax = lerp(x1, x2, sc - hw), ay = lerp(y1, y2, sc - hw), bx = lerp(x1, x2, sc + hw), by = lerp(y1, y2, sc + hw);
    lineW(ax, ay, bx, by, 5, P.CR2, 0.6 * k); lineW(ax, ay, bx, by, 2, P.C6, k);
    if (UI_ON) tag('?', lerp(x1, x2, sc) - 2, lerp(y1, y2, sc) - 22, 45.6, t, { c: P.INK, plate: P.CR1 });
  }
  if (UI_ON) { tag('A', x1 - 16, y1 - 6, T_LOR - 1, t, { c: P.SG3, plate: P.SG0 }); tag('B', x2 + 8, y2 - 18, T_LOR - 1, t, { c: P.SG3, plate: P.SG0 }); }
  cap('LINE OF RESPONSE', 45.05, t, 'Somewhere along this line', 45.6);
}
// ---------------------------------------------------------------- S16 many events: accepted pairs add lines, rejected ones are dropped
const DENS = new Float32Array(47 * 82);
function s16(t) {
  const z = Math.exp(lerp(Math.log(RZ), Math.log(0.265), K75(seg(t, 49.0, 49.7)))), cam = new Cam(0, 0, z, 135, 250);
  const n = clamp(Math.floor((t - T_MANY) / (BEAT / 4)) + 1, 0, 26), extra = Math.floor(96 * Math.pow(seg(t, 51.4, 53.1), 1.3)), N = n + extra, out = 1 - seg(t, 53.15, 53.6);
  const hl = {}, rj = {};
  for (let k = Math.max(0, n - 2); k < n; k++) { const tk = T_MANY + k * BEAT / 4, L = lorOf(k), bad = k % 4 === 3; for (const h of [L[3], L[4]]) { const m = modIndex(Math.atan2(h[1], h[0])), D = bad ? rj : hl; D[m] = Math.max(D[m] || 0, pulse(t, tk, 0.35)); } }
  drawRing(cam, t, { body: 'tissue', hl, rej: rj });
  for (let k = 0; k < N; k++) {
    const L = lorOf(k), bad = k % 4 === 3, tk = k < n ? T_MANY + k * BEAT / 4 : 0, X1 = cam.x(L[3][0]), Y1 = cam.y(L[3][1]), X2 = cam.x(L[4][0]), Y2 = cam.y(L[4][1]);
    if (bad) { if (k < n) { const a = pulse(t, tk, 0.4); if (a > 0) line(X1, Y1, X2, Y2, P.C2, 0.75 * a); } continue; }   // failed selection: shown dim grey, then dropped
    const fresh = k < n ? pulse(t, tk, 0.3) : 0;
    line(X1, Y1, X2, Y2, fresh > 0 ? P.CR3 : P.CR2, (fresh > 0 ? 1 : k < n ? 0.42 : 0.16) * out);
  }
  if (t > 51.6 && out > 0) { // where many lines cross, the tracer is concentrated
    const k = smooth(seg(t, 51.6, 53.0)) * out, C = 6, GW = Math.ceil(W / C) + 1;
    DENS.fill(0);
    for (let q = 0; q < N; q++) { if (q % 4 === 3) continue; const L = lorOf(q), xa = cam.x(L[3][0]), ya = cam.y(L[3][1]), xb = cam.x(L[4][0]), yb = cam.y(L[4][1]), len = Math.hypot(xb - xa, yb - ya); let last = -1; for (let s = 0; s <= len; s += 2) { const x = xa + (xb - xa) * s / len, y = ya + (yb - ya) * s / len; if (x < 0 || y < 0 || x >= W || y >= H) continue; const ci = Math.floor(y / C) * GW + Math.floor(x / C); if (ci !== last) { DENS[ci] += 1; last = ci; } } }
    const Rb = RING.bore * z;
    for (let y = Math.floor(250 - Rb); y < 250 + Rb; y++) for (let x = Math.floor(135 - Rb); x < 135 + Rb; x++) {
      if ((x - 135) ** 2 + (y - 250) ** 2 > Rb * Rb) continue;
      const fx = x / C - 0.5, fy = y / C - 0.5, i = Math.max(0, Math.floor(fx)), j = Math.max(0, Math.floor(fy)), u = clamp(fx - i, 0, 1), v = clamp(fy - j, 0, 1);
      const d = (DENS[j * GW + i] * (1 - u) + DENS[j * GW + i + 1] * u) * (1 - v) + (DENS[(j + 1) * GW + i] * (1 - u) + DENS[(j + 1) * GW + i + 1] * u) * v, lv = k * clamp((d - 4.5) / 15, 0, 1);
      if (lv > 0 && bay(x, y) < lv) buf[y * W + x] = lv > 0.62 ? P.C6 : P.CR3;
    }
  }
  if (UI_ON) {
    if (t < T_MANY + 1.0) { const L = lorOf(0); tag('ACCEPTED', (cam.x(L[3][0]) + cam.x(L[4][0])) / 2, (cam.y(L[3][1]) + cam.y(L[4][1])) / 2 - 18, T_MANY + 0.05, t, { align: 'center', c: P.SG3, plate: P.SG0 }); }
    if (t > T_MANY + 3 * BEAT / 4 && t < T_MANY + 3 * BEAT / 4 + 0.9) { const L = lorOf(3); tag('REJECTED', (cam.x(L[3][0]) + cam.x(L[4][0])) / 2, (cam.y(L[3][1]) + cam.y(L[4][1])) / 2 + 8, T_MANY + 3 * BEAT / 4, t, { align: 'center', c: P.C4, plate: P.C1 }); }
    if (t > 49.4) { const Nv = Math.max(1, Math.round(4e7 * Math.pow(seg(t, 49.4, 53.3), 3))), s = 'EVENTS ' + Nv.toLocaleString('en-US'), tw = textW(FM, s, 2); rect(242 - tw, 100, 250, 118, P.K0); frame(242 - tw, 100, 250, 118, P.N5); text(FM, s, 246 - tw, 104, { c: P.INK, ol: null }); }
  }
  if (t > 53.15) for (let q = 0; q < 40; q++) { const u = (t - 53.15) * 1.6 - hash(q + 300) * 0.6; if (u < 0 || u > 1) continue; const sx = 135 + (hash(q + 301) - 0.5) * 120, sy = 250 + (hash(q + 302) - 0.5) * 80, ex = 300, ey = 150; disc(lerp(sx, ex, ein(u)), lerp(sy, ey, ein(u)), 1.5, P.CR3); }   // the data heads to the computer
  cap('MILLIONS OF EVENTS', 49.05, t, 'Each pair adds one line', 49.5);
}
// ---------------------------------------------------------------- S17 reconstruction: events -> geometry -> corrections -> iterations -> activity map
const PIPE = [['MEASURED EVENTS', 54.0], ['DETECTOR GEOMETRY', 54.9], ['CORRECTIONS', 55.6], ['IMAGE RECONSTRUCTION', 56.25], ['ACTIVITY MAP', T_FINAL]];
const RP = [20, 176, 250, 360], RCAM_IMG = () => new Cam(0, 4, 0.6, 135, 268);
function s17(t) {
  clear(P.BG);
  let cur = 0; while (cur + 1 < PIPE.length && t >= PIPE[cur + 1][1]) cur++;
  if (UI_ON) PIPE.forEach(([s, t0], i) => { const y = 104 + i * 14, st = t < t0 ? 0 : i < cur ? 2 : 1; if (st === 2) tick(20, y + 1, P.SG2, 1); else rect(21, y + 2, 25, y + 6, st ? (Math.sin(t * 14) > 0 ? P.INK : P.SL1) : P.N4); text(FM, s, 32, y, { c: st === 0 ? P.N5 : st === 1 ? P.INK : P.SG3, ol: null }); });
  rect(RP[0], RP[1], RP[2], RP[3], P.K0); frame(RP[0] - 1, RP[1] - 1, RP[2] + 1, RP[3] + 1, P.N5);
  const cam = RCAM_IMG(), inner = [RP[0] + 1, RP[1] + 1, RP[2] - 1, RP[3] - 1];
  if (cur === 0) { // the coincidence data arrives (one point per accepted line of response)
    const n = Math.floor(2400 * seg(t, 54.05, 54.9)); drawSinogram([RP[0] + 4, RP[1] + 4, RP[2] - 4, RP[3] - 4], n, n < 2400 ? 36 : 0);
    for (let q = 0; q < 30; q++) { const u = (t - 54.0) * 1.8 - hash(q + 400) * 0.7; if (u < 0 || u > 1) continue; disc(lerp(300, RP[0] + 20 + hash(q + 401) * 190, eout(u)), lerp(130, RP[1] + 20 + hash(q + 402) * 150, eout(u)), 1.5, P.CR3); }
    if (UI_ON) tag('SINOGRAM', RP[0] + 4, RP[1] + 4, 54.2, t, { c: P.SUB });
  } else if (cur === 1) { // each measurement is a line between two known detector positions
    const cx = 135, cy = 268, r = 82;
    for (let i = 0; i < RING.n; i++) { const a = modAngle(i); rect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, cx + Math.cos(a) * r + 2, cy + Math.sin(a) * r + 2, P.CR1); }
    const m = Math.floor(14 * seg(t, 54.95, 55.5));
    const c2 = new Cam(0, 0, r / RING.rc, cx, cy), tk = m / 14 * 0.55 + 54.95;
    for (let k = 0; k < m; k++) { const L = lorOf(k + 500); if (k === m - 1) drawLOR(c2, L[3], L[4], clamp((t - (54.95 + k * 0.55 / 14)) / 0.06, 0, 1), 1); else line(c2.x(L[3][0]), c2.y(L[3][1]), c2.x(L[4][0]), c2.y(L[4][1]), P.CR2, 0.5); const m1 = modIndex(Math.atan2(L[3][1], L[3][0])), m2 = modIndex(Math.atan2(L[4][1], L[4][0])); if (k === m - 1) for (const mm of [m1, m2]) { const a = modAngle(mm); disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, P.SG2); } }
  } else if (cur === 2) { // corrections: attenuation (from the CT), scatter, randoms
    drawSlice(cam, 'ct', { clip: inner }); darken(0.45, inner[0], inner[1], inner[2], inner[3]);
    if (UI_ON) [['ATTENUATION', 55.7], ['SCATTER', 55.85], ['RANDOMS', 56.0]].forEach(([s, t0], i) => { if (t > t0) { tag(s, RP[0] + 8, RP[1] + 8 + i * 18, t0, t, { c: P.INK, plate: P.N5 }); tick(RP[0] + 14 + textW(FM, s, 2), RP[1] + 9 + i * 18, P.SG2, 1); } });
  } else if (cur === 3) { // iterative reconstruction: guess -> predict the data -> compare -> update, again and again
    const f = (t - 56.25) / BEAT, it = clamp(Math.floor(f), 0, 3), mx = smooth(clamp((f - it) / 0.6, 0, 1));
    drawEstimate(cam, inner, it, mx);
    if (UI_ON) { tag('ITERATION ' + (it + 1), RP[0] + 6, RP[1] + 6, 56.25 + it * BEAT, t, { c: P.SG3, plate: P.SG0 }); const ax = RP[2] - 16, ay = RP[1] + 14, a0 = t * 6; for (let q = 0; q < 10; q++) { const a = a0 + q * 0.5; pset(ax + Math.cos(a) * 7, ay + Math.sin(a) * 7, q > 7 ? P.SG3 : P.SG1); } }
  } else { // the converged estimate: a map of tracer activity (not a photograph)
    const kr = eout(seg(t, T_FINAL, T_FINAL + 0.3)), yb = Math.round(lerp(inner[1], inner[3], kr));
    drawEstimate(cam, inner, 4, 0); withBuffer(TMPBUF, () => drawSlice(cam, 'pet', { clip: inner }));
    for (let y = inner[1]; y < Math.min(yb, inner[3]); y++) buf.set(TMPBUF.subarray(y * W + inner[0], y * W + inner[2]), y * W + inner[0]);
    if (kr < 1) { rect(inner[0], yb, inner[2], yb + 2, P.C6); rect(inner[0], yb + 2, inner[2], yb + 3, P.HM6); }
    if (UI_ON) tag('PET ACTIVITY MAP', RP[0] + 6, RP[1] + 6, T_FINAL + 0.3, t, { c: P.HM6, plate: P.HM1 });
    const kl = K75(seg(t, 58.43, 58.85)); if (kl > 0) { // colour key: tracer activity low -> high
      const lx0 = 70, lx1 = 200, ly = 344, w = Math.round((lx1 - lx0) * kl);
      for (let x = 0; x < w; x++) rect(lx0 + x, ly, lx0 + x + 1, ly + 6, heatCol(x / (lx1 - lx0), lx0 + x, ly));
      if (kl >= 1) { const sx = lx0 + ((t - 58.85) * 0.9 % 1) * (lx1 - lx0); rect(sx, ly - 1, sx + 2, ly + 7, P.C6); }
      if (UI_ON) { text(FM, 'LOW', lx0 - 6, ly, { c: P.SUB, ol: null, align: 'right', sc: 1 }); text(FM, 'HIGH', lx1 + 6, ly, { c: P.SUB, ol: null, sc: 1 }); }
    }
  }
  cap('PET IMAGE RECONSTRUCTION', 54.05, t, 'An estimate, not a photo', 54.5);
}
// ---------------------------------------------------------------- S18 PET + CT (separately acquired; fused)
function crosshair(x, y) { // image-reading cursor (gap in the middle keeps the uptake visible)
  x = Math.round(x); y = Math.round(y);
  for (const [a, b, c, d] of [[x - 10, y, x - 4, y], [x + 4, y, x + 10, y], [x, y - 10, x, y - 4], [x, y + 4, x, y + 10]]) { rect(Math.min(a, c) - 1, Math.min(b, d) - 1, Math.max(a, c) + 2, Math.max(b, d) + 2, P.SH); rect(Math.min(a, c), Math.min(b, d), Math.max(a, c) + 1, Math.max(b, d) + 1, P.INK); }
}
function s18(t) {
  clear(P.BG);
  const cy = 232, k1 = K75(seg(t, 60.0, 60.8)), kin = K75(seg(t, 60.8, 61.3)), sl = K75(seg(t, 61.35, T_FUSE)), gr = K75(seg(t, T_FUSE, 62.6));
  if (t < T_FUSE) {
    // PET first (from the reconstruction panel to the right slot), then the CT arrives from the left
    const pz = lerp(0.6, 0.34, k1), pxc = Math.round(lerp(lerp(135, 200, k1), 135, sl)), pyc = Math.round(lerp(268, cy, k1)), phw = Math.round(lerp(114, 64, k1)), phh = Math.round(lerp(91, 60, k1));
    const xl = Math.round(lerp(lerp(-80, 70, kin), 135, sl)), hw = 64, hh = 60;
    if (kin > 0) { drawSlice(new Cam(0, 4, 0.34, xl, cy), 'ct', { clip: [xl - hw, cy - hh, xl + hw, cy + hh] }); frame(xl - hw - 1, cy - hh - 1, xl + hw + 1, cy + hh + 1, P.CT4); }
    withBuffer(TMPBUF, () => { clear(P.BG); drawSlice(new Cam(0, 4, pz, pxc, pyc), 'pet', { clip: [pxc - phw, pyc - phh, pxc + phw, pyc + phh] }); });
    for (let y = Math.max(0, pyc - phh); y < Math.min(H, pyc + phh); y++) for (let x = Math.max(0, pxc - phw); x < Math.min(W, pxc + phw); x++) { const inL = kin > 0 && x >= xl - hw && x < xl + hw && y >= cy - hh && y < cy + hh; if (!inL || bay(x, y) < 0.55) buf[y * W + x] = TMPBUF[y * W + x]; }
    frame(pxc - phw - 1, pyc - phh - 1, pxc + phw + 1, pyc + phh + 1, P.HM6);
    if (UI_ON) { tag('PET: TRACER', pxc, pyc + phh + 6, 60.3, t, { align: 'center', c: P.HM6 }); if (kin > 0) tag('CT: ANATOMY', xl, cy - hh - 16, 61.0, t, { align: 'center', c: P.CT6 }); }
  } else {
    const push = smooth(seg(t, 62.6, 65.2)), z = lerp(0.34, 0.56, gr) * (1 + 0.08 * push), hw2 = Math.round(lerp(64, 106, gr)), hh2 = Math.round(lerp(60, 98, gr)), c2 = new Cam(0, 4 - 10 * push, z, 135, cy);
    drawSlice(c2, 'fused', { alpha: t > 62.6 ? 0.78 + 0.22 * Math.cos(TAU * (t - 62.6) / (2 * BEAT)) : 1, clip: [135 - hw2, cy - hh2, 135 + hw2, cy + hh2] });
    frame(134 - hw2, cy - hh2 - 1, 136 + hw2, cy + hh2 + 1, P.SC1);
    const k = pulse(t, T_FUSE, 0.3); if (k > 0) frame(133 - hw2, cy - hh2 - 2, 137 + hw2, cy + hh2 + 2, P.C6);
    const hx = c2.x(34), hy = c2.y(-24), lx = c2.x(AX_LESION[0]), ly = c2.y(AX_LESION[1]);
    if (t > 62.45) { // reading cursor: the normal heart uptake, then a focus in the lung
      const g1 = K75(seg(t, 62.45, 62.7)), g2 = K75(seg(t, 63.5, 63.77)), hov = seg(t, 62.7, 62.95);
      const px = lerp(lerp(135 + hw2 - 16, hx, g1), lx, g2) + hov * 1.6 * Math.sin(t * 3.1), py = lerp(lerp(cy + hh2 - 16, hy, g1), ly, g2) + hov * 1.6 * Math.cos(t * 2.3);
      if (g2 > 0.9) { const r = 10 + 1.5 * Math.sin(t * 9); for (let a = 0; a < TAU; a += TAU / 18) psetD(lx + Math.cos(a + t * 2) * r, ly + Math.sin(a + t * 2) * r, P.HM9, 1); }
      crosshair(px, py);
      if (UI_ON && g2 >= 1) tag('?', lx + 14, ly - 20, 63.8, t, { c: P.INK, plate: P.HM7 });
    }
    if (t > 62.7 && UI_ON) callout({ text: 'NORMAL HEART UPTAKE', x: 30, y: cy + hh2 + 10, ax: hx, ay: hy + 10, t0: 62.75, plate: true, c: P.HM6 }, t);
    if (UI_ON) microText('Bright does not always mean cancer', 135, 96, 63.25, t, { align: 'center', c: P.SC3, mw: 234 });
  }
  cap('PET + CT', 60.05, t, 'Anatomy + tracer activity', 61.95);
}
// ---------------------------------------------------------------- S19 recap on quarter-note triplets, the title, the zoom back to frame one
const RECAP = [['F-18 DECAY', s07, 20.72], ['POSITRON', s08, 23.4], ['ANNIHILATION', s09, 26.3], ['TWO GAMMA PHOTONS', s10, 29.3], ['SCINTILLATION CRYSTAL', s11, 32.3], ['OPTICAL LIGHT', s11, 34.05], ['ELECTRICAL SIGNAL', s12, 36.1], ['COINCIDENCE', s14, 43.6]];
function titleView(t) { // the final activity map in the scanner's own geometry, zooming back out to the ring of frame one
  const zt = 0.6 * (1 + 0.04 * smooth(seg(t, T_TITLE, T_HOME0))), e = K75(seg(t, T_HOME0, T_HOME1)), z = Math.exp(lerp(Math.log(zt), Math.log(RZ), e)), cam = new Cam(0, 0, z, 135, lerp(262, 250, e));   // slow push-in while the title holds
  mix(() => drawRing(cam, t, { body: 'pet' }), () => drawRing(cam, t, { body: 'tissue' }), smooth(seg(t, 69.55, 69.85)));
}
function s19(t) {
  if (t < T_TITLE) {
    const i = clamp(Math.floor((t - T_REC0) / TRIP + 1e-6), 0, RECAP.length - 1), Rc = RECAP[i], t0 = T_REC0 + i * TRIP;
    UI_ON = false; try { Rc[1](Rc[2] + (t - t0) * 0.5); } finally { UI_ON = true; }
    const k = seg(t, t0, t0 + 0.08); if (k < 1) rect(0, 0, W, H, P.C6, 0.3 * (1 - k));
    tag(Rc[0], CX, LBL_Y + 2, t0 - 1, t, { align: 'center', c: P.INK, plate: P.N5 });
    for (let j = 0; j < RECAP.length; j++) { const x = 87 + j * 12; rect(x, 62, x + 7, 65, j <= i ? P.GA2 : P.N4); }
    return;
  }
  if (t >= T_HOME1) { hookView(t - DUR, t); return; }        // the annihilation of frame one is about to happen again
  const titled = () => {
    titleView(t);
    rect(0, 0, W, H, P.C6, 0.25 * pulse(t, T_TITLE, 0.12));
    text(FT, 'HOW PET', CX, 46, { sc: 2, bold: true, align: 'center', shadow: P.HM1, sd: 2, n: (t - T_TITLE - 0.02) * 45 });
    text(FT, 'SCANNERS WORK', CX, 70, { sc: 2, bold: true, align: 'center', shadow: P.HM1, sd: 2, n: (t - T_TITLE - 0.16) * 45 });
    if (t > T_TITLE + 0.3) text(FL, 'HOW MEDICAL SCANNERS USE ANTIMATTER', CX, 97, { sc: 1, c: P.HM6, align: 'center', n: (t - T_TITLE - 0.3) * 90 });
    if (t > T_TITLE + 0.75) { const u = ((t - T_TITLE - 0.75) * 1.25) % 1, sx = lerp(40, 240, u); for (let y = 44; y < 92; y++) for (let x = Math.max(0, Math.round(sx - 6 + (y - 44) * 0.3)); x < Math.min(W, sx + 6 + (y - 44) * 0.3); x++) if (buf[y * W + x] === P.INK) buf[y * W + x] = P.HM9; }   // light sweep across the letters
    if (UI_ON && t > T_TITLE + 0.5) tag('PET IMAGE', CX, 352, T_TITLE + 0.5, t, { align: 'center', c: P.HM6, plate: P.HM1 });
  };
  const f = smooth(seg(t, T_HOME0, T_HOME0 + 0.14));
  if (f <= 0) titled(); else { withBuffer(TMPBUF, titled); titleView(t); if (f < 1) dissolve(TMPBUF, buf, f, buf); }
}
// ---------------------------------------------------------------- scene table
const SCENES = [
  [0, 3, s01], [3, 6, s02], [6, 9, s03, 0.12], [9, 12, s04], [12, 15, s05, 0.3], [15, 18, s06], [18, 22, s07, 0.2], [22, 25, s08, 0.25], [25, 28, s09, 0.22],
  [28, 31, s10, 0.18], [31, 35, s11], [35, 39, s12], [39, 42, s13, 0.2], [42, 45, s14, 0.2], [45, 49, s15, 0.25], [49, 54, s16], [54, 60, s17, 0.25], [60, 65, s18], [65, 70, s19, 0.12],
];
function sceneIndex(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][1]) return i; return SCENES.length - 1; }
const CHIPS = [[0.25, 1.95, 'VISUALIZATION', 'GA1', 'wave'], [2.0, 2.95, 'TIME-COMPRESSED', 'GA1', 'clock'], [6.05, 7.9, 'ABOUT 1 HOUR EARLIER', 'TR1', 'clock'],
  [9.05, 12.0, 'TIME-LAPSE', 'TR1', 'clock'], [13.6, 15.0, 'TIME-LAPSE', 'TR1', 'clock'], [16.6, 22.0, 'NOT TO SCALE', 'N5', null], [22.0, 31.0, 'VISUALIZATION', 'GA1', 'wave'],
  [31.45, 37.4, 'VISUALIZATION', 'GA1', 'wave'], [49.25, 54.0, 'TIME-COMPRESSED', 'GA1', 'clock'], [54.05, 58.0, 'SIMPLIFIED', 'N5', null]];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const i = sceneIndex(t), S = SCENES[i];
  CAP_UY = 0; HEART_S = 1;
  S[2](t);
  const uy = CAP_UY;
  const d = S[3];
  if (d && i > 0 && t < S[0] + d) { withBuffer(TRANSBUF, () => SCENES[i - 1][2](t)); dissolve(TRANSBUF, buf, smooth((t - S[0]) / d), buf); }
  for (const [a, b, s, c, icon] of CHIPS) if (t >= a && t < b) { chip(s, a, t, P[c], icon, uy); break; }
}
