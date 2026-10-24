'use strict';
// ============================================================================
// MASTER TIMELINE — HOW SHOCK WAVE MACHINES BREAK KIDNEY STONES
// 24 scenes, 55 s, 60 fps; renderFrame(t) is a pure function of t.
// The treatment head is below the patient, so every wave travels UP the screen.
// Microsecond physics is shown slowed down (SLOW MOTION chip); the treatment
// montage is explicitly TIME-COMPRESSED; the music's 126 BPM is not the shock
// rate (real treatments: about 1 shock per second, i.e. one every 2 beats).
// ============================================================================
const BEAT = 60 / 126;
function engineInit() { stoneInit(); bodyInit(); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerp(a[1], b[1], (b[2] || K75)(seg(t, a[0], b[0]))); }
  return keys[keys.length - 1][1];
}
const LBL_Y = 40;
const lin = x => x;
function cap(text, t0, t, micro, mt0) { if (UI_ON) callout({ text, x: 18, y: LBL_Y, t0, micro, mt0 }, t); }
function pulse(t, t0, d) { return t < t0 ? 0 : Math.max(0, 1 - (t - t0) / d); }
function mix(A, B, k) { if (k <= 0) A(); else if (k >= 1) B(); else { withBuffer(TMPBUF, A); B(); dissolve(TMPBUF, buf, k, buf); } }
function chip(s, t0, t, col, icon) {
  if (t < t0 || !UI_ON) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)), tw = textW(FM, s, 2), y = 404;
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, P.K0); frame(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, col);
  if (icon === 'clock') { ring(x + 6, y + 5, 5, 1, P.INK); const a = t * 9; line(x + 6, y + 5, x + 6 + Math.cos(a) * 4, y + 5 + Math.sin(a) * 4, P.INK); }
  if (icon === 'slow') { ring(x + 6, y + 5, 5, 1, P.INK); const a = t * 1.2; line(x + 6, y + 5, x + 6 + Math.cos(a) * 4, y + 5 + Math.sin(a) * 4, P.INK); }
  text(FM, s, x + (icon ? 14 : 1), y, { sc: 2, c: P.INK, ol: null });
}
function arrowV(x, y, dir, len, c) { // dir -1 = up, +1 = down; tip at (x, y)
  rect(x - 1, Math.min(y, y - dir * len), x + 1, Math.max(y, y - dir * len), c);
  poly([x - 3.5, y - dir * 4, x + 3.5, y - dir * 4, x, y + dir * 0.5], c);
}
// digital push-in on a rendered buffer (identity at s = 1, (cx, cy) -> screen centre at s = smax)
function zoomBlit(src, cx, cy, s, smax) {
  const f = (s - 1) / ((smax || s) - 1 || 1), ax = lerp(cx, CX, f), ay = lerp(cy, CY, f);
  for (let y = 0; y < H; y++) { const sy = clamp(Math.floor(cy + (y + 0.5 - ay) / s), 0, H - 1); for (let x = 0; x < W; x++) buf[y * W + x] = src[sy * W + clamp(Math.floor(cx + (x + 0.5 - ax) / s), 0, W - 1)]; }
}
// ---------------------------------------------------------------- a shock reaching the stone (stone units: surface y = +0.866 / -0.834)
// outer front converges on the stone; inside, the wave runs ~2.6x faster, then reflects at the far face as tension
function stoneArc(cam, tT, t, vout, span, a) {
  const R = (0.866 + (tT - t) * vout) * cam.z * SU;
  if (R > 0.8 && R < 560) arcFront(cam.x(0), cam.y(0), R, -span, span, { a: a === undefined ? 1 : a });
}
function innerBands(tT, t, vin) {
  const o = { bands: [], sq: 0, fl: 0 }, dt = t - tT;
  if (dt < 0) return o;
  const yb = 0.866 - dt * vin;
  if (yb > -0.834) o.bands.push({ y0: yb + 0.012, y1: yb + 0.1, c: P.CB2, lv: 0.6 }, { y0: yb + 0.1, y1: yb + 0.3, c: P.RF1, lv: 0.22 }, { y0: yb, y1: yb + 0.012, c: P.SW2, lv: 1 });
  else { const yr = -0.834 + (dt - 1.7 / vin) * vin, a = Math.max(0, 1 - (yr + 0.834) / 1.4); if (a > 0) o.bands.push({ y0: yr - 0.1, y1: yr, c: P.RF2, lv: 0.55 * a }, { y0: yr - 0.012, y1: yr, c: P.RF3, lv: a }); }
  o.sq = 0.045 * gauss((dt - 0.85 / vin) / 0.07);
  o.fl = Math.max(0, 1 - dt / 0.12) * 0.6;
  return o;
}
// ---------------------------------------------------------------- S01-S03 hook, microcrack dive, reverse zoom
const HOOK = { tT: 0.291, vout: 3.53, vin: 9.18 };     // internal wave reaches the far face on beat 1 (0.476 s)
function hookD(t) { return 0.035 * smooth(seg(t, 0.49, 0.72)); }
function hookCam(t) { return camTrack([[0.62, 0, 0, 17], [1.95, -0.1, -2.0, 120, K75], [2.6, -0.07, -2.0, 160, lin]], t, 135, 250); }
function s01(t) {
  const cam = hookCam(t);
  drawKidneyWorld(cam);
  stoneArc(cam, HOOK.tT, t, HOOK.vout, 0.75);
  const ib = innerBands(HOOK.tT, t, HOOK.vin);
  drawStone(cam, { D: hookD(t), bands: ib.bands, squash: ib.sq, flash: ib.fl });
  cap('KIDNEY STONE', 0.12, t);
}
function cryCam(cam) { return new Cam((cam.cx + 0.1) / GU, (cam.cy + 2.0) / GU, cam.z * GU, cam.ax, cam.ay); }
function cryTip(t) {
  if (t < 1.429) return -1.5;
  const n = Math.min(9, Math.floor((t - 1.429) / 0.119)), f = clamp((t - 1.429 - n * 0.119) / 0.05, 0, 1);
  return -1.5 + 0.5 * (n + (n < 9 ? eout(f) : 1));
}
function s02(t) {
  const cam = hookCam(t);
  mix(() => { drawKidneyWorld(cam); drawStone(cam, { D: hookD(t) }); }, () => drawCrystal(cryCam(cam), { tip: cryTip(t) }), smooth(seg(Math.log(cam.z), Math.log(55), Math.log(95))));
  cap('MICROCRACK FORMATION', 1.25, t);
}
function s03Cam(t) { return camTrack([[2.6, -0.07, -2.0, 160], [3.95, -30, -42, 0.62, K75]], t, 135, 250); }
function s03(t) {
  const cam = s03Cam(t), lz = Math.log(cam.z);
  const A = () => drawCrystal(cryCam(cam), { tip: cryTip(2.6), glow: false });
  const B = () => { drawKidneyWorld(cam); drawStone(cam, { D: 0.035 }); };
  const C = () => drawTorso(cam, t, { D: 0.035, head: seg(t, 3.65, 3.95) });
  if (cam.z > 55) mix(B, A, smooth(seg(lz, Math.log(55), Math.log(95))));
  else if (cam.z > 1.3) B();
  else mix(C, B, smooth(seg(lz, Math.log(0.85), Math.log(1.3))));
  cap('INSIDE THE KIDNEY', 2.65, t);
}
// ---------------------------------------------------------------- S04 treatment suite (side view)
function s04(t) {
  const cam = camTrack([[4.0, 120.25, 211, 2.4], [4.85, 135, 236, 1.0, K75], [5.36, 135, 236, 1.0], [5.6, 178, 150, 1.5, ein]], t);
  const h = t0 => t < t0 ? 0 : Math.max(0.3, 1 - (t - t0) / 0.3);
  drawSuite(cam, t, { hl: { head: h(4.762), mon: h(5.0), con: h(5.238), tab: h(5.476) } });
  cap('SHOCK WAVE LITHOTRIPSY', 4.05, t, 'No incision', 4.62);
}
// ---------------------------------------------------------------- S05-S08 localisation, targeting, coupling, charging
function s05(t) {
  const k = K75(seg(t, 5.85, 6.55));
  drawUS(t, { mx: lerp(92, US.sx, k), my: lerp(196, US.sy, k), lock: seg(t, 6.5, 6.667), flash: pulse(t, 6.667, 0.3) });
  cap('STONE LOCALIZATION', 5.65, t, 'Imaging, not treatment', 6.05);
}
function s06(t) {
  const m = K75(seg(t, 7.85, 8.5));
  drawTarget(t, { ox: lerp(30, 0, m), oy: lerp(24, 0, m), move: t > 7.85 && t < 8.5 ? 1 : 0, lock: seg(t, 8.45, 8.571), flash: pulse(t, 8.571, 0.35), geo: seg(t, 7.42, 7.7) });
  cap('ACOUSTIC TARGETING', 7.45, t, 'Focus aligned to stone', 8.62);
}
function s07(t) {
  drawCoupling(t, { bubble: 1 - smooth(seg(t, 10.2, 10.42)), pop: pulse(t, 10.42, 0.25) });
  // test pulse 1 meets the air pocket: reflected (inverted, tensile) and leaves a gap beyond it
  const y1 = 440 - (t - 9.5) * 432;
  if (y1 >= CP.mem) { if (y1 < 470) planeFront(y1, 0, W, {}); }
  else if (y1 > 20) { planeFront(y1, 0, 161, {}); planeFront(y1, 179, W, {}); rect(161, y1 + 1, 179, CP.gel, P.K0, 0.3); }
  if (t > 10.0 && t < 10.5) { const yr = CP.mem + (t - 10.0) * 432, a = 1 - (t - 10.0) / 0.5; rect(161, yr - 1, 179, yr + 1, P.RF3, a + 0.2); rect(161, yr - 8, 179, yr - 1, P.RF1, 0.5 * a); }
  // pulse 2 (air pocket gone): passes uniformly
  const y2 = 440 - (t - 10.476) * 432;
  if (t > 10.476 && y2 > 20) planeFront(y2, 0, W, {});
  cap('ACOUSTIC COUPLING', 9.35, t, 'Air gaps reflect sound', 9.8);
}
function s08(t) {
  const u = Math.max(0, t - 11.25), q = (1 - Math.exp(-u / 0.5)) / (1 - Math.exp(-1.85 / 0.5));
  drawCircuit(t, { charge: clamp(q, 0, 1), chgI: t > 11.25 ? Math.exp(-u / 0.5) : 0 });
  cap('ELECTRICAL ENERGY', 11.05, t, 'Capacitor stores energy', 11.6);
}
// ---------------------------------------------------------------- S09-S11 electromagnetic source -> pressure pulse
// t0 = start of the coil current; the membrane jumps 0.55 s later (slow motion)
function coilState(t, t0) {
  const u = clamp((t - t0) / 1.2, 0, 1), on = t > t0 && t < t0 + 1.2;
  const cur = on ? Math.sin(Math.PI * u) : 0;
  const eddy = on && u < 0.55 ? Math.cos(Math.PI * u) * Math.min(1, u * 8) : 0;   // induced current ~ rate of change of the field
  const tj = t0 + 0.55;
  const disp = t < tj - 0.12 ? 0 : t < tj ? 6 * eout((t - tj + 0.12) / 0.12) : 6 * Math.exp(-(t - tj) / 0.22);
  const fronts = t > tj - 0.06 ? [{ y: EM.mem - 4 - (t - tj + 0.06) * 190, a: 1 }] : [];
  return { cur, field: cur, eddy, force: clamp(cur * eddy * 2.2, 0, 1), disp, fronts };
}
const TD = 13.333, C1 = 13.736, C2 = 15.164;
function s09(t) {
  const circ = () => drawCircuit(t, { charge: t < TD ? 1 : Math.exp(-(t - TD) / 0.12), sw: seg(t, TD - 0.06, TD), spark: t > TD && t < TD + 0.15 ? 1 - (t - TD) / 0.15 : 0, disI: t > TD ? Math.exp(-(t - TD) / 0.3) : 0, coilGlow: t > TD ? Math.exp(-(t - TD) / 0.4) : 0 });
  const coil = () => drawCoil(t, coilState(t, C1));
  if (t < 13.45) circ();
  else if (t < 13.9) {
    const s = Math.exp(Math.log(3.2) * K75(seg(t, 13.45, 13.85)));
    withBuffer(TMPBUF, circ); zoomBlit(TMPBUF, 222, 215, s, 3.2);
    const k = smooth(seg(t, 13.68, 13.9));
    if (k > 0) { withBuffer(TRANSBUF, coil); dissolve(buf, TRANSBUF, k, buf); }
  } else coil();
  cap('ELECTROMAGNETIC PULSE', 13.25, t, 'Induced current repels membrane', 13.95);
}
function s10(t) {
  const st = coilState(t, C2);
  st.fronts = st.fronts.concat(coilState(t, C1).fronts);
  st.oy = 130 * K75(seg(t, 16.25, 17.3));
  st.hlCoil = pulse(t, 15.45, 0.7); st.hlMem = pulse(t, 15.714, 0.5);
  drawCoil(t, st);
  cap('PRESSURE WAVE GENERATED', 15.45, t);
  if (UI_ON) {
    microText('ELECTRICAL PULSE', 18, 62, 15.5, t, { c: P.Y3 });
    microText('> DIAPHRAGM MOTION', 18, 76, 15.74, t, { c: P.C5 });
    microText('> PRESSURE WAVE', 18, 90, 16.2, t, { c: P.CB3 });
  }
}
function s11(t) {
  drawParticles(t, { front: 440 - (t - 17.6) * 175 });
  cap('ACOUSTIC PRESSURE PULSE', 17.55, t, 'Water oscillates in place', 18.0);
}
// ---------------------------------------------------------------- S12-S15 focusing, shock formation, tissue path, focal zone
function s12(t) {
  const u = t - 19.62, tB = (LZ.mem - LZ.yb) / 145 + 0.05, ph = Math.asin((LZ.xb - LZ.fx) / LZ.R0);
  drawLens(t, { rays: smooth(seg(t, 19.55, 19.95)), focus: smooth(seg(t, 21.2, 21.43)) * (t < 21.9 ? 1 : 0.75) });
  for (let i = 5; i >= 1; i--) { // isochrones: earlier positions of the same front -> converging contours
    const uu = u - i * 0.14; if (uu < tB) continue;
    const R = LZ.R0 - (uu - tB) * 145; if (R > 3) thinArc(LZ.fx, LZ.fy, R, -ph, ph, P.SW0, 0.75 - i * 0.1);
  }
  if (t < 21.44) lensFront(u, {});
  const k = seg(t, 21.3, 21.43);
  if (k > 0) brackets(LZ.fx, LZ.fy, Math.round(lerp(28, 12, eout(k))), k >= 1 ? P.WC4 : P.WC2);
  if (t > 21.43) ring(LZ.fx, LZ.fy, 8 + 30 * (t - 21.43), 1, P.SW2, pulse(t, 21.43, 0.4));
  cap('ACOUSTIC FOCUSING', 19.55, t, 'Lens refracts the wave', 20.0);
}
function s13(t) {
  drawWave(t, { draw: smooth(seg(t, 22.03, 22.4)), k: smooth(seg(t, 22.35, 22.857)), flash: pulse(t, 22.857, 0.3), signs: seg(t, 23.05, 23.3) });
  cap('SHOCK WAVE', 22.05, t, 'Compression > Rarefaction', 23.0);
}
const TISSUE_PTS = [];
function s14(t) {
  drawLayers(t, {});
  const v = 158, R = 300 - (t - 24.05) * v, span = 0.62;
  for (const yi of [LY.mem, LY.skin, LY.fat, LY.mus, LY.cap]) { // weak reflections at each interface
    const ti = 24.05 + (300 - (yi - LY.fy)) / v; if (t < ti || t > ti + 0.45) continue;
    const a = 0.5 * (1 - (t - ti) / 0.45); let px = null, py = null;
    for (let p = -span; p <= span; p += 0.02) { const x = LY.fx + R * Math.sin(p), y = 2 * yi - (LY.fy + R * Math.cos(p)); if (y > yi && px !== null && py > yi) line(px, py, x, y, P.SW1, a); px = x; py = y; }
  }
  if (!TISSUE_PTS.length) for (let i = 0; i < 260; i++) TISSUE_PTS.push([10 + hash(i * 3 + 1) * 250, 175 + hash(i * 3 + 2) * 180]);
  for (const [x, y] of TISSUE_PTS) { // tissue is stressed too as the front passes
    const d = Math.hypot(x - LY.fx, y - LY.fy) - R, ang = Math.atan2(x - LY.fx, y - LY.fy);
    if (Math.abs(ang) > span || d < 0 || d > 9 || y > LY.mem) continue;
    rect(x, y, x + 2, y + 1, d < 4 ? P.MS2 : P.MS1, 0.9);
  }
  if (R > 0) arcFront(LY.fx, LY.fy, R, -span, span, {});
  if (t > 25.6) { const a = seg(t, 25.6, 25.95); ellipse(LY.fx, LY.fy, 5, 16, P.SW1, 0.45 * a); }
  cap('THROUGH SOFT TISSUE', 24.05, t, 'Tissue is also exposed', 24.6);
}
const IMP15 = 28.095;
function s15(t) {
  const shake = t > IMP15 && t < IMP15 + 0.3 ? Math.sin((t - IMP15) * 90) * 2.2 * (1 - (t - IMP15) / 0.3) : 0;
  const z = track([[26.0, 4.3], [28.4, 5.4, eio]], t), cam = new Cam(track([[26.0, 10], [28.4, 6, eio]], t), -2, z, 135 + shake, 236);
  drawKidneyWorld(cam);
  const fx = cam.x(0), fy = cam.y(0);
  ellipse(fx, fy, 3.6 * z + 2, 14 * z + 3, P.SW0, 0.25); ellipse(fx, fy, 3.2 * z, 13 * z, P.SW1, 0.3); ellipse(fx, fy, 1.4 * z, 6 * z, P.SW2, 0.35 + 0.4 * seg(t, 27.4, 28.0));
  const tT = 27.905, vin = 10.7;
  stoneArc(cam, tT, t, 4.1, 0.62, 0.75 + 0.25 * seg(t, 26.5, 27.9));
  const ib = innerBands(tT, t, vin);
  drawStone(cam, { D: 0.035 * smooth(seg(t, IMP15, IMP15 + 0.25)), bands: ib.bands, squash: ib.sq, flash: Math.max(ib.fl, pulse(t, IMP15, 0.15)) });
  if (t > IMP15) ring(fx, fy, 30 + (t - IMP15) * 220, 1, P.SW1, pulse(t, IMP15, 0.35) * 0.8);
  cap('FOCUSED SHOCK WAVE', 26.05, t, 'Small focal zone', 26.55);
}
// ---------------------------------------------------------------- S16-S20 inside the stone
function arrowH(x, y, dir, len, c) { // tip at (x, y); dir +1 = right
  rect(Math.min(x, x - dir * len), y - 1, Math.max(x, x - dir * len), y + 1, c);
  poly([x - dir * 4, y - 3.5, x - dir * 4, y + 3.5, x + dir * 0.5, y], c);
}
function s16(t) {
  const cam = new Cam(0, 3.2, 48, 135, 240), hits = [29.048, 30.0], ys = 294;
  urineBG();
  for (const th of hits) {
    const yf = ys + (th - t) * 260;
    if (yf > 150 && yf < 500) planeFront(yf, 0, W, {});
    if (t > th && t < th + 0.6) { const yr = ys + (t - th) * 260, a = 1 - (t - th) / 0.6; rect(0, yr - 7, W, yr - 1, P.CB1, 0.35 * a); rect(0, yr - 1, W, yr, P.SW1, 0.7 * a); }
  }
  const bands = []; let fl = 0;
  for (const th of hits) { const ib = innerBands(th, t, 2.82); bands.push(...ib.bands); fl = Math.max(fl, ib.fl); }
  drawStone(cam, { D: 0.035, bands, flash: fl * 0.4 });
  for (const th of hits) { // compression: material squeezed along the travel direction
    const dt = t - th; if (dt < 0.03 || dt > 0.45) continue;
    const y = cam.y((0.866 - dt * 2.82) * SU);
    for (const x of [70, 135, 200]) { arrowV(x, y - 3, 1, 9, P.MS2); arrowV(x, y + 22, -1, 9, P.MS2); }
  }
  cap('COMPRESSION STRESS', 28.55, t, 'Part of the energy enters', 29.2);
}
function s17(t) {
  const cam = new Cam(1.0, 0.9, 80, 135, 250);
  urineBG();
  const bands = []; let g = 0;
  for (const tp of [31.43, 32.38]) {
    const ib = innerBands(tp, t, 2.82); bands.push(...ib.bands);
    if (t > tp) g = Math.max(g, gauss(((0.866 - (t - tp) * 2.82) - 0.15) / 0.28));
  }
  drawStone(cam, { D: 0.035, bands, flawGlow: g, flawGrow: 0.5 * smooth(seg(t, 31.6, 31.95)) + 0.5 * smooth(seg(t, 32.55, 32.9)) });
  cap('INTERNAL STRESS', 31.05, t, 'Stress builds at flaws', 31.5);
}
function s18(t) {
  const cam = new Cam(0, -3.0, 48, 135, 240);
  urineBG();
  const ib = innerBands(33.333 - 1.7 / 2.82, t, 2.82);
  drawStone(cam, { D: 0.035 + 0.265 * smooth(seg(t, 33.5, 34.7)), cls: 'spall', bands: ib.bands, open: 0.6 });
  const a = seg(t, 33.45, 33.6) * (1 - seg(t, 34.5, 34.8));
  if (a > 0) { // reflected tension pulls the layer near the far face apart
    const y = cam.y(-0.40 * SU), c = a > 0.5 ? P.MS2 : P.MS1;
    for (const x of [60, 135, 210]) { arrowV(x, y - 24, -1, 12, c); arrowV(x, y + 24, 1, 12, c); }
  }
  cap('TENSILE FRACTURE', 33.05, t, 'Spallation', 33.6);
}
function s19(t) {
  const wave = -120 + (t - 35.1) * 420;
  drawShear(t, { amp: seg(t, 35.05, 35.3) * (1 - 0.6 * seg(t, 36.8, 37.2)), wave, tip: (t - 35.71) * 270 });
  for (const x of [52, 214]) { // opposite sliding on either side of the weak interface
    const e = gauss(((228 + x * 0.35) - wave) / 70); if (e < 0.15) continue;
    const c = e > 0.5 ? P.MS2 : P.MS1; arrowH(x + 12, 216, 1, 16, c); arrowH(x - 12, 240, -1, 16, c);
  }
  cap('SHEAR STRESS', 35.05, t, 'Layers deform differently', 35.5);
}
let BUBS = null;
function surfScreenY(cam, x) { // proximal stone surface below screen x
  const xl = cam.wx(x + 0.5) / SU; let lo = 0, hi = 1.2;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (stoneU(xl, m) <= 1) lo = m; else hi = m; }
  return cam.y(lo * SU);
}
const CAV_CAM = () => new Cam(0, 5.5, 40, 135, 240);
function bubbles() {
  if (BUBS) return BUBS;
  const cam = CAV_CAM();
  // [x, standoff, max radius, kind, stagger]: jets near the wall, spherical collapse further away
  const spec = [[63, 15, 11, 'jet', 0.0], [161, 12, 9, 'jet', 0.1], [205, 24, 13, 'weak', 0.22], [104, 56, 10, 'sphere', 0.3], [226, 80, 8, 'sphere', 0.42], [40, 92, 6, 'sphere', 0.5], [118, 10, 6, 'jet', 0.6]];
  BUBS = spec.map(([x, d, r, kind, s]) => { const sy = surfScreenY(cam, x); return { x, y: sy + d, rmax: r, kind, sx: x, sy, t0: 37.66 + d / 600 + 0.05 * s, tc: 38.62 + s * 1.15 }; });
  return BUBS;
}
function s20(t) {
  const cam = CAV_CAM(), B = bubbles();
  urineBG();
  const ys = surfScreenY(cam, 135), yf = ys + (37.619 - t) * 600;
  if (yf > ys - 80 && yf < 520) planeFront(yf, 0, W, { rw: 44 });     // front + long tensile tail
  drawStone(cam, { D: 0.30 + 0.12 * smooth(seg(t, 39.25, 39.95)), cls: 'prox', open: 0.4 });
  for (const b of B) drawBubble(b, t);
  for (const b of B) if (b.kind !== 'sphere' && t > b.tc + 0.22) { disc(b.x, b.sy - 0.5, b.kind === 'jet' ? 2.6 : 1.4, P.ST0); pset(b.x - 1, b.sy - 2, P.ST1); }
  cap('CAVITATION', 37.25, t, 'Bubbles grow, then collapse', 37.8);
}
// ---------------------------------------------------------------- S21-S22 repeated pulses (time-compressed) -> fragmentation
const IMPS = []; for (let k = 0; k < 12; k++) IMPS.push(40.238 + 0.238 * k);
function s21prog(t) { let s = 0; for (const ti of IMPS) s += smooth(seg(t, ti, ti + 0.1)); return s / IMPS.length; }
function s21(t) {
  const cam = new Cam(0, 0, 16, 135, 250), fx = cam.x(0), fy = cam.y(0);
  drawKidneyWorld(cam);
  const bands = []; let sq = 0, fl = 0;
  for (const ti of IMPS) {           // one pulse at a time (never simultaneous)
    const tT = ti - 0.11;
    stoneArc(cam, tT, t, 6, 0.7, 0.9);
    if (t > tT && t < ti + 0.25) { const ib = innerBands(tT, t, 15.6); bands.push(...ib.bands); sq = Math.max(sq, ib.sq * 0.6); }
    fl = Math.max(fl, pulse(t, ti, 0.08));
  }
  const pr = s21prog(t);
  drawStone(cam, { D: 0.06 + 0.9 * pr, pits: 0.1 + 0.8 * pr, bands, squash: sq, flash: fl * 0.5 });
  for (let k = 0; k < IMPS.length; k++) { // brief cavitation at the front face after each pulse
    const a = t - IMPS[k]; if (a < 0.03 || a > 0.2) continue;
    for (let i = 0; i < 6; i++) { const px = fx + (hash(k * 31 + i) - 0.5) * 120, py = fy + 72 + hash(k * 17 + i) * 12 - Math.abs(px - fx) * 0.22; disc(px, py, 0.8 + 2 * Math.sin((a - 0.03) / 0.17 * Math.PI) * hash(i + k * 7), P.CV1); }
  }
  if (UI_ON && t > 40.3) {
    const n = Math.max(1, Math.round(2400 * Math.pow(pr, 1.5))), s = 'PULSE ' + (n >= 1000 ? Math.floor(n / 1000) + ',' + String(n % 1000).padStart(3, '0') : String(n));
    const tw = textW(FM, s, 2); rect(248 - tw, 93, 256, 111, P.K0); frame(248 - tw, 93, 256, 111, P.N5); text(FM, s, 252 - tw, 97, { c: P.INK, ol: null });
  }
  cap('REPEATED SHOCK WAVES', 40.05, t, 'Many pulses over treatment', 40.5);
}
const FINAL = 43.333, SPLIT = 43.81;
function s22(t) {
  const z = track([[43.0, 16], [SPLIT, 16.4], [45.6, 12.5, eio]], t);
  const shake = t > FINAL && t < SPLIT ? (hash(Math.floor(t * 60)) - 0.5) * 1.6 : 0;
  const cam = new Cam(0, 0.4, z, 135 + shake, 250);
  drawKidneyWorld(cam);
  stoneArc(cam, FINAL - 0.11, t, 6, 0.7, 1);
  const ib = innerBands(FINAL - 0.11, t, 15.6);
  const sep = t < SPLIT ? 0 : eout(seg(t, SPLIT, 44.75)) + 0.05 * smooth(seg(t, 44.75, 46.0));
  drawStone(cam, { D: 0.96 + 0.04 * smooth(seg(t, 43.2, FINAL)), sep, pits: 0.95, bands: sep > 0 ? null : ib.bands, flash: pulse(t, FINAL, 0.1) * 0.6, open: 1 + 0.7 * seg(t, FINAL, SPLIT) });
  if (t > 44.29 && t < 44.75) for (let f = 0; f < NS; f += 2) { // achievement glints on the new fragments
    const F = FRAG[f], p = stonePt(cam, {}, F.cx + F.ox * sep, F.cy + F.oy * sep + F.sink * sep * sep), a = Math.sin(clamp((t - 44.29 - f * 0.02) / 0.3, 0, 1) * Math.PI);
    if (a > 0) { rect(p[0] - 3 * a, p[1], p[0] + 3 * a + 1, p[1] + 1, P.MC2); rect(p[0], p[1] - 3 * a, p[0] + 1, p[1] + 3 * a + 1, P.MC2); }
  }
  cap('STONE FRAGMENTATION', 43.05, t, 'Still inside the kidney', 44.35);
}
// ---------------------------------------------------------------- S23 fragments pass with urine (time-lapse)
const ROUTE_P = new Path(ROUTE), RESID_P = new Path([2, 4, 4, 8, 10, 17, 12.2, 28.5]);
const FRAGS = []; for (let j = 0; j < 8; j++) FRAGS.push({ x: Math.cos(j * 2.4) * (1.5 + 2.5 * hash(j + 3)), y: Math.sin(j * 2.4) * (1.2 + 2 * hash(j + 9)), d: 46.7 + j * 0.33, s: 2 + 1.2 * hash(j + 21) });
function fragDot(x, y, s, j) {
  const r = Math.max(1.5, s); const pts = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + j; pts.push(x + Math.cos(a) * r * (0.75 + 0.4 * hash(j * 5 + i)), y + Math.sin(a) * r * (0.75 + 0.4 * hash(j * 5 + i + 50))); }
  const m = maskPoly(pts); shade(m, P.ST3, P.ST5, P.ST1, P.ST0, { outer: true });
}
function s23(t) {
  const cam = camTrack([[46.0, 2, 3, 3.4], [47.1, -16, 120, 1.0, K75], [50.0, -16, 124, 0.97, lin]], t);
  drawKidneyWorld(cam, { spine: true });
  const L = ROUTE_P.L;
  for (let s = ((t * 70) % 16 + 16) % 16 + 8; s < L - 4; s += 16) { // urine flowing down the ureter
    const a = ROUTE_P.at(s), b = ROUTE_P.at(s + 4); line(cam.x(a[0]), cam.y(a[1]), cam.x(b[0]), cam.y(b[1]), P.UR4, 0.8);
  }
  const rp = RESID_P.at(RESID_P.L * smooth(seg(t, 46.3, 46.95))); // a larger piece settles in a lower calyx
  fragDot(cam.x(rp[0]), cam.y(rp[1]), Math.max(2.2, cam.s(2.4)), 99);
  if (t > 48.55) ring(cam.x(rp[0]), cam.y(rp[1]), 7 + 1.5 * Math.sin((t - 48.55) * 8), 1, P.MC1, 0.9);
  FRAGS.forEach((f, j) => {
    let x, y;
    if (t < f.d) { x = f.x + Math.sin(t * 3 + j) * 0.3; y = f.y; }
    else { const u = clamp((t - f.d) / 1.35, 0, 1); if (u >= 1) return; const p = ROUTE_P.at(L * (u < 0.7 ? u / 0.7 * 0.62 : 0.62 + (u - 0.7) / 0.3 * 0.38)); x = p[0]; y = p[1]; }
    fragDot(cam.x(x), cam.y(y), Math.max(1.5, cam.s(f.s * 0.5)), j);
  });
  cap('FRAGMENTS PASS IN URINE', 46.05, t, t < 48.5 ? 'Days to weeks later' : 'Some fragments may remain', t < 48.5 ? 46.5 : 48.55);
}
// ---------------------------------------------------------------- S24 recap match cuts, title, seamless loop
const RECAP = [['COIL', 50.0, s09, 14.15], ['PRESSURE WAVE', 50.476, s10, 16.45], ['LENS', 50.952, s12, 20.95], ['STONE', 51.429, s15, 27.96], ['INTERNAL STRESS', 51.905, s17, 31.55], ['MICROCRACKS', 52.381, s21, 42.2], ['FRAGMENTATION', 52.857, s22, 44.6]];
const TITLE_T = 53.333;
function s24(t) {
  if (t < TITLE_T) {
    let i = 0; while (i + 1 < RECAP.length && t >= RECAP[i + 1][1]) i++;
    const R = RECAP[i];
    UI_ON = false; try { R[2](R[3] + (t - R[1]) * 0.5); } finally { UI_ON = true; }
    const k = seg(t, R[1], R[1] + 0.1); if (k < 1) rect(0, 0, W, H, P.C6, 0.3 * (1 - k));
    tag(R[0], CX, LBL_Y + 2, R[1] + 0.02, t, { align: 'center', c: P.INK, plate: P.N5 });
    for (let j = 0; j < RECAP.length; j++) { const x = 93 + j * 12; rect(x, 396, x + 7, 400, j <= i ? P.MC1 : P.N4); }
    return;
  }
  const loop = () => s01(t - DUR);          // the opening shot, first wave approaching -> frame 0
  const titled = () => {
    loop();
    darken(0.45 * seg(t, TITLE_T, TITLE_T + 0.2), 0, 62, W, 156);
    text(FT, 'HOW SHOCK WAVE', CX, 76, { sc: 2, bold: true, align: 'center', shadow: P.CB0, sd: 2, n: (t - 53.38) * 45 });
    text(FT, 'MACHINES WORK', CX, 104, { sc: 2, bold: true, align: 'center', shadow: P.CB0, sd: 2, n: (t - 53.62) * 45 });
    if (t > 53.86) text(FM, 'KIDNEY STONE LITHOTRIPSY', CX, 136, { c: P.WC3, align: 'center', n: (t - 53.86) * 60 });
  };
  const e = smooth(seg(t, 54.5, 54.88));
  if (e <= 0) titled(); else if (e >= 1) loop(); else { withBuffer(TMPBUF, titled); loop(); dissolve(TMPBUF, buf, e, buf); }
}
// ---------------------------------------------------------------- scene table
const SCENES = [
  [0, 1.2, s01], [1.2, 2.6, s02], [2.6, 4.0, s03], [4.0, 5.6, s04, 0.2], [5.6, 7.4, s05, 0.18], [7.4, 9.3, s06, 0.2], [9.3, 11.0, s07, 0.2],
  [11.0, 13.2, s08, 0.22], [13.2, 15.4, s09], [15.4, 17.5, s10], [17.5, 19.5, s11, 0.2], [19.5, 22.0, s12, 0.2], [22.0, 24.0, s13, 0.2],
  [24.0, 26.0, s14, 0.2], [26.0, 28.5, s15, 0.2], [28.5, 31.0, s16, 0.16], [31.0, 33.0, s17, 0.16], [33.0, 35.0, s18, 0.16], [35.0, 37.2, s19, 0.16],
  [37.2, 40.0, s20, 0.16], [40.0, 43.0, s21, 0.2], [43.0, 46.0, s22], [46.0, 50.0, s23, 0.25], [50.0, 55.0, s24],
];
function sceneIndex(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][1]) return i; return SCENES.length - 1; }
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const i = sceneIndex(t), S = SCENES[i];
  S[2](t);
  const d = S[3];
  if (d && i > 0 && t < S[0] + d) { withBuffer(TRANSBUF, () => SCENES[i - 1][2](t)); dissolve(TRANSBUF, buf, smooth((t - S[0]) / d), buf); }
  if (t >= 13.25 && t < 40.0) chip('SLOW MOTION', 13.25, t, P.SW0, 'slow');
  else if (t >= 40.05 && t < 43.0) chip('TIME-COMPRESSED', 40.05, t, P.MC1, 'clock');
  else if (t >= 46.1 && t < 50.0) chip('TIME-LAPSE', 46.1, t, P.UR3, 'clock');
}
