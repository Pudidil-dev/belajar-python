'use strict';
// ============================================================================
// MASTER TIMELINE — HOW PET SCANNERS USE ANTIMATTER (27 scenes, 60 s, 60 fps)
// renderFrame(t) is a pure function of t. Motion grammar (Kurzgesagt skill):
// log-interpolated scale travel, a 0.3 s pause + light-up before every dive,
// lens reveals into objects, fast pull-out reveals, a controlled light flash
// for annihilation; subjects settle and hold, environment layers keep moving.
// Music 128 BPM: 60 s = exactly 32 bars; key events land on beats.
// ============================================================================
const BEAT = 60 / 128, BARL = 4 * BEAT;
function engineInit() { bodyInit(); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerp(a[1], b[1], (b[2] || K75)(seg(t, a[0], b[0]))); }
  return keys[keys.length - 1][1];
}
const lin = x => x;
const LBL_Y = 40;
function cap(text, t0, t, micro, mt0) { if (UI_ON) callout({ text, x: 18, y: LBL_Y, t0, micro, mt0 }, t); }
function pulse(t, t0, d) { return t < t0 ? 0 : Math.max(0, 1 - (t - t0) / d); }
function mix(A, B, k) { if (k <= 0) A(); else if (k >= 1) B(); else { withBuffer(TMPBUF, A); B(); dissolve(TMPBUF, buf, k, buf); } }
function chip(s, t0, t, col, icon) {
  if (t < t0 || !UI_ON) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)), tw = textW(FM, s, 2), y = 404;
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
function energyBar(lv, t0, t) { // small HUD: kinetic energy of the positron
  if (!UI_ON || t < t0) return;
  const x = 206, y = 404, w = 44;
  rect(x - 3, y - 3, x + w + 3, y + 13, P.K0); frame(x - 3, y - 3, x + w + 3, y + 13, P.PO1);
  rect(x, y + 6, x + Math.round(w * clamp(lv, 0, 1)), y + 10, P.PO2); text(FM, 'ENERGY', x, y - 1, { c: P.PO3, ol: null, sc: 1 });
}
// ---------------------------------------------------------------- S01-S02 PET image -> tissue -> cell -> FDG
const HL_CELL = [0, 0];
function bodyCam(t) { return camTrack([[0.32, 0, 64, 3.25], [1.2, LESION[0], LESION[1], 60, ein]], t, 135, 250); }
function s01(t) {
  drawPETBody(bodyCam(t));
  if (t < 0.6) { const cam = bodyCam(t), k = pulse(t, 0.12, 0.45); if (k > 0) { ring(cam.x(LESION[0]), cam.y(LESION[1]), 6 + 10 * (1 - k), 1, P.SC3, k); } }
  cap('PET IMAGING', 0.08, t);
}
function tissueCam(t) { const s = cellSeed(HL_CELL[0], HL_CELL[1]); return camTrack([[1.2, s[0] - 6, s[1] - 3, 1.25], [1.42, s[0] - 3, s[1] - 1, 2.6, lin], [1.62, s[0], s[1], 4.6, eout]], t, 135, 250); }
function moleculeView(t, opt) { // inside the cell: cytoplasm with drifting FDG + one large FDG
  opt = opt || {};
  clear(P.TI1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.2 + 0.18 * vn2(x * 0.04 + t * 0.3, y * 0.04, 81)) buf[y * W + x] = P.TI2;
  for (let k = 0; k < 9; k++) { const x = (hash(k + 1) * 300 + t * 9 * (hash(k) - 0.5)) % 290 - 10, y = 70 + hash(k + 9) * 360; if (Math.hypot(x - 135, y - 240) > 70) tracerIcon(x, y, 3.2, t + k); }
  drawFDG(opt.cx || 135, opt.cy || 230, opt.s || 40, { fGlow: opt.fGlow || 0 });
}
function s02(t) {
  if (t < 1.45) { // push through the hot voxels: colour fill bridges the scale jump into tissue
    const k = smooth(seg(t, 1.22, 1.45));
    mix(() => { drawPETBody(camTrack([[1.2, LESION[0], LESION[1], 60], [1.45, LESION[0], LESION[1], 150, lin]], t, 135, 250)); }, () => drawTissue(tissueCam(t), t, {}), k);
  } else if (t < 1.66) {
    const cam = tissueCam(t), s = cellSeed(HL_CELL[0], HL_CELL[1]);
    drawTissue(cam, t, { hlCell: HL_CELL, hlK: seg(t, 1.44, 1.56) });            // pause + light up the cell before the dive
  } else {
    const cam = tissueCam(t), s = cellSeed(HL_CELL[0], HL_CELL[1]), r = 600 * ein(seg(t, 1.66, 1.92));
    drawTissue(cam, t, { hlCell: HL_CELL, hlK: 1 });
    lensReveal(() => moleculeView(t, { fGlow: seg(t, 1.9, 2.05) }), cam.x(s[0]), cam.y(s[1]), Math.max(cam.s(TS * 0.6), r));
  }
  cap('FLUORINE-18', 1.9, t);
}
// ---------------------------------------------------------------- S03 / S13 inside the F-18 nucleus: beta-plus decay
// p -> n + e+ + neutrino; F-18 (9p 9n) becomes O-18 (8p 10n)
function decayView(t, tD, opt) {
  opt = opt || {};
  clear(P.BG);
  const zk = opt.zk === undefined ? 1 : opt.zk;                                // 0 = whole atom, 1 = nucleus close-up
  const R = lerp(2.2, 34, zk), cx = CX, cy = 236, rot = t * 0.7;
  if (zk < 1) { // the F atom: electron probability cloud (2 shells) around a tiny nucleus
    const s = lerp(1, 8, zk), a = 1 - zk;
    disc(cx, cy, 120 * s, P.EL0, 0.22 * a); disc(cx, cy, 78 * s, P.EL1, 0.25 * a); disc(cx, cy, 26 * s, P.EL1, 0.35 * a); disc(cx, cy, 12 * s, P.EL2, 0.3 * a);
  }
  drawNucleus(cx, cy, R, rot, clamp((t - tD) / 0.12, 0, 1), pulse(t, tD - 0.25, 0.4) * 0 + (t > tD - 0.2 && t < tD + 0.3 ? 0.7 : 0));
  if (t >= tD) {
    const u = t - tD, ex = cx + 40 + 150 * u + 30 * u * u, ey = cy - 24 - 95 * u;           // positron leaves (up-right)
    const p0 = nucleonScreen(cx, cy, R, rot, DECAY_IDX);
    if (u < 0.08) annihilationFlash(p0[0], p0[1], u / 0.08 * 0.6, 0.6);
    const tr = []; for (let k = 8; k >= 0; k--) { const uu = Math.max(0, u - k * 0.02); tr.push([cx + 40 + 150 * uu + 30 * uu * uu, cy - 24 - 95 * uu]); }
    trail(tr, P.PO2, P.PO1); positronAt(ex, ey, 6, t);
    neutrino(cx - 30 - 420 * u, cy + 30 + 260 * u, -420, 260);                            // neutrino: barely interacts, leaves
    if (UI_ON) { tag(EPL, ex + 10, ey - 6, tD + 0.06, t, { c: P.PO3 }); if (u < 0.5) tag('NEUTRINO', cx - 30 - 420 * u - 10, cy + 40 + 260 * u, tD + 0.04, t, { c: P.NT }); }
  }
  if (opt.o18 && t > opt.o18 && UI_ON) tag('F-18 > O-18', cx, cy + R + 14, opt.o18, t, { align: 'center', c: P.NE3, plate: P.NE1 });
}
const T_EMIT1 = 7 * BEAT, T_DECAY2 = 46 * BEAT;    // 3.281 s, 21.563 s
function s03(t) {
  if (t < 2.75) { // lens reveal from the FDG molecule into its F atom
    const f = fdgF(135, 230, 40), r = 600 * ein(seg(t, 2.42, 2.75));
    moleculeView(t, { fGlow: 1 });
    lensReveal(() => decayView(t, T_EMIT1, { zk: 0 }), f[0], f[1] + 4, Math.max(8, r));
  } else decayView(t, T_EMIT1, { zk: K75(seg(t, 2.75, 3.1)) });
  cap('POSITRON EMISSION', 2.45, t);
}
// ---------------------------------------------------------------- S04 / S14 the positron slows down in tissue (atomic scale)
const PT_VERT = (() => { const out = [], L = PTRACK_P.L; for (let i = 1; i < PTRACK.length; i++) { const c = PTRACK_P.c[i] / L; out.push(1 - Math.cbrt(1 - Math.min(0.999, c))); } return out; })();
function positronWalk(t, t0, t1, opt) {
  opt = opt || {};
  const u = clamp((t - t0) / (t1 - t0), 0, 1), p = ptrackAt(u), lag = ptrackAt(clamp((t - 0.18 - t0) / (t1 - t0), 0, 1));
  const z = opt.z || 1.35, cam = opt.wide ? new Cam(PTRACK_P.at(PTRACK_P.L * 0.45)[0], PTRACK_P.at(PTRACK_P.L * 0.45)[1], opt.z || 0.75, 135, 250) : new Cam(lerp(lag[0], p[0], 0.5), lerp(lag[1], p[1], 0.5), z, 135, 250);
  clear(P.BG); waterField(cam, t, 0.9);
  const tr = []; for (let k = 40; k >= 0; k--) { const q = ptrackAt(clamp(u - k * 0.012, 0, 1)); tr.push([cam.x(q[0]), cam.y(q[1])]); }
  if (opt.wide) { const all = []; for (let k = 0; k <= 60; k++) { const q = ptrackAt(u * k / 60); all.push([cam.x(q[0]), cam.y(q[1])]); } trail(all, P.PO1, P.PO0); }
  trail(tr, P.PO2, P.PO1);
  PT_VERT.forEach((uv, i) => { // each change of direction = an electromagnetic interaction: an atomic electron is knocked out
    const a = (t - t0) - uv * (t1 - t0); if (a < 0 || a > 0.35) return;
    const v = PTRACK[i + 1], ang = hash(i * 9 + 4) * TAU, d = 4 + 40 * a, X = cam.x(v[0] + Math.cos(ang) * d), Y = cam.y(v[1] + Math.sin(ang) * d);
    electronAt(X, Y, 2.2, t, 1 - a / 0.35); if (a < 0.08) ring(cam.x(v[0]), cam.y(v[1]), 2 + 40 * a, 1, P.PO3, 1 - a / 0.08);
  });
  positronAt(cam.x(p[0]), cam.y(p[1]), lerp(6, 4, u), t, 1);
  energyBar(1 - eout(u) * 0.97, t0 + 0.1, t);
  return cam;
}
function s04(t) { positronWalk(t, 4.02, 5.45); cap('POSITRON SLOWS DOWN', 4.05, t, 'Range: typically under 1 mm', 4.6); }
// ---------------------------------------------------------------- S05 / S15 annihilation close-up
// e+ meets e-: brief bound dance (positronium), then two 511 keV photons back to back
function annihilation(t, tA, opt) {
  opt = opt || {};
  const big = opt.big ? 1.6 : (opt.scale || 1), dance = opt.dance || 0.35;
  clear(P.BG); waterField(new Cam(40, 20, 2.2, 135, 250), t, 0.5);
  const cx = CX, cy = 240;
  if (t < tA) {
    const u = clamp((t - (tA - dance)) / dance, 0, 1), ang = (opt.big ? 9 : 6) * u * u + t * 2, r = lerp(46, 6, eout(u)) * big;
    const pin = clamp((t - (tA - dance - 0.7)) / 0.7, 0, 1);
    const ex = cx + Math.cos(ang) * r * (u > 0 ? 1 : 0) + (1 - pin) * 0, ey = cy + Math.sin(ang) * r;
    const px = u > 0 ? cx - Math.cos(ang) * r : lerp(cx - 140, cx - r, eout(pin)), py = u > 0 ? cy - Math.sin(ang) * r : cy + 6;
    electronAt(u > 0 ? ex : cx + r, u > 0 ? ey : cy, 9 * big, t);
    positronAt(px, py, 9 * big, t);
    if (opt.big && u > 0.4) disc(cx, cy, 30 * u, P.GA0, 0.18 * u);
  } else {
    const a = t - tA, d = 26 + 330 * a, th = opt.th || 0;
    annihilationFlash(cx, cy, clamp(a / (opt.big ? 0.42 : 0.3), 0, 1), big);
    if (opt.big && a < 0.16) { const L = 0.5 * (1 - a / 0.16); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const g = L * gauss(Math.hypot(x - cx, y - cy) / 120); if (g > 0.02 && bay(x, y) < g) buf[y * W + x] = g > 0.3 ? P.GA3 : P.SC3; } }   // radial light bloom (no blast)
    const dx = Math.cos(th), dy = Math.sin(th);
    gamma(cx + dx * d, cy + dy * d, dx, dy, { len: 20 * big, amp: 2.6 * big, ph: a * 40 });
    gamma(cx - dx * d, cy - dy * d, -dx, -dy, { len: 20 * big, amp: 2.6 * big, ph: a * 40 });
    if (UI_ON && opt.tags) { tag('511 ' + KEV, cx + dx * Math.min(d, 90) - 20, cy + dy * Math.min(d, 90) - 24, tA + 0.12, t, { c: P.GA3, plate: P.GA1 }); tag('511 ' + KEV, cx - dx * Math.min(d, 90) - 20, cy - dy * Math.min(d, 90) + 12, tA + 0.12, t, { c: P.GA3, plate: P.GA1 }); }
  }
}
const T_ANN1 = 12 * BEAT, T_ANN2 = 56 * BEAT;     // 5.625 s (first payoff), 26.25 s (the antimatter climax)
function s05(t) { annihilation(t, T_ANN1, { tags: true, scale: 1.3 }); cap('ANNIHILATION', 5.52, t, '511 ' + KEV + ' EACH', 5.8); }
// ---------------------------------------------------------------- S06 pull-out to the detector ring
const E0 = [8, -12], TH0 = -0.12, T_DET1 = 18 * BEAT;   // event near the centre: both photons arrive together
function pairState(P0, th, t0, t1) { // photon positions travelling at the same (slowed) speed from P0
  const h1 = hitRing(P0[0], P0[1], Math.cos(th), Math.sin(th)), h2 = hitRing(P0[0], P0[1], -Math.cos(th), -Math.sin(th));
  const v = Math.max(h1[2], h2[2]) / (t1 - t0);
  return { h1, h2, v, d: tt => Math.max(0, tt - t0) * v };
}
function s06(t) {
  const z = Math.exp(lerp(Math.log(2.4), Math.log(0.255), 1 - Math.pow(1 - seg(t, 7.0, 7.9), 3)));      // fast pull-out, long tail
  const cam = new Cam(lerp(E0[0], 0, 1 - z / 2.4), lerp(E0[1], 0, 1 - z / 2.4), z, 135, 250);
  const ps = pairState(E0, TH0, 7.0, T_DET1);
  const det = t >= T_DET1;
  drawRing(cam, t, { body: 'tissue', hl: det ? { [modIndex(Math.atan2(ps.h1[1], ps.h1[0]))]: pulse(t, T_DET1, 0.5) + 0.3, [modIndex(Math.atan2(ps.h2[1], ps.h2[0]))]: pulse(t, T_DET1, 0.5) + 0.3 } : {} });
  const d = ps.d(t);
  for (const [h, s] of [[ps.h1, 1], [ps.h2, -1]]) {
    const dd = Math.min(d, h[2]), x = E0[0] + s * Math.cos(TH0) * dd, y = E0[1] + s * Math.sin(TH0) * dd;
    if (!det) gamma(cam.x(x), cam.y(y), s * Math.cos(TH0), s * Math.sin(TH0), { len: 14, amp: 2, ph: t * 40 });
    else { const k = pulse(t, T_DET1, 0.4); if (k > 0) glow(cam.x(h[0]), cam.y(h[1]), 9, P.GA0, P.GA3, k); }
  }
  if (t < 7.3) annihilationFlash(cam.x(E0[0]), cam.y(E0[1]), 0.6 + (t - 7) * 1.3, 0.8);
  cap('PET DETECTOR RING', 7.25, t);
}
// ---------------------------------------------------------------- S07-S10 the tracer: vial, injection, blood, uptake
const T_F18 = 22 * BEAT;   // 10.313 s
function s07(t) {
  if (t < 10.0) drawVial(t, { inset: seg(t, 9.55, 9.9) });
  else { drawVial(t, { inset: 1 }); lensReveal(() => moleculeView(t, { fGlow: seg(t, 10.2, T_F18) }), 135, 300, Math.max(42, 600 * ein(seg(t, 10.0, 10.26)))); }
  if (t > T_F18 && t < T_F18 + 0.5) { const f = fdgF(135, 230, 40); ring(f[0], f[1] + 4, 8 + 26 * (t - T_F18), 1, P.FO3, pulse(t, T_F18, 0.5)); }
  cap('F-18 FDG TRACER', 9.05, t, 'A glucose analog', 9.5);
}
const ARM_CAM = () => new Cam(146, 226, 1.55, 135, 250);
const VEIN_PT = [96, 240];
function s08(t) {
  const cam = ARM_CAM();
  drawArm(cam, t, { push: K75(seg(t, 11.25, 12.19)) });
  const r = 46 * backOut(seg(t, 12.2, 12.6), 1.2);
  if (r > 1) lensReveal(() => drawBlood(t, { tracer: Math.round(18 * seg(t, 12.2, 12.9)) }), cam.x(VEIN_PT[0]), cam.y(VEIN_PT[1]), r);
  cap('RADIOTRACER INJECTION', 11.05, t);
}
function s09(t) {
  if (t < 13.26) { const cam = ARM_CAM(); drawArm(cam, t, { push: 1 }); lensReveal(() => drawBlood(t, {}), cam.x(VEIN_PT[0]), cam.y(VEIN_PT[1]), Math.max(46, 600 * ein(seg(t, 13.0, 13.26)))); }
  else drawBlood(t, {});
  cap('THROUGH THE BLOODSTREAM', 13.1, t);
}
function s10(t) {
  drawUptake(t, { u: seg(t, 15.15, 16.95), tags: 15.7 });
  cap('TRACER UPTAKE', 15.05, t, 'Active cells trap more FDG', 15.45);
}
// ---------------------------------------------------------------- S11-S12 the PET/CT scanner, the detector array
function s11(t) {
  const sl = track([[17.25, -45], [18.65, 62, K75]], t);
  drawScannerSide(new Cam(track([[17.0, 120], [18.8, 150, K75]], t), -100, 1.0, 135, 250), t, { slide: sl, pet: t > 18.35 ? 1 : 0 });
  cap('PET SCANNING', 17.05, t, 'PET and CT share one gantry', 17.45);
}
const ZMOD = 4;
function s12(t) {
  const a = modAngle(ZMOD), tx = Math.cos(a) * 380, ty = Math.sin(a) * 380, k = K75(seg(t, 20.15, 20.9));
  const z = Math.exp(lerp(Math.log(0.255), Math.log(1.15), k));
  const cam = new Cam(lerp(0, tx, (1 / 0.255 - 1 / z) / (1 / 0.255 - 1 / 1.15)), lerp(0, ty, (1 / 0.255 - 1 / z) / (1 / 0.255 - 1 / 1.15)), z, 135, 250);
  const hl = {};
  for (let i = 0; i < RING.n; i++) hl[i] = Math.max(pulse(t, 19.15 + i * 0.022, 0.5), t > 20.0 && Math.abs(((i - ZMOD + 19 + RING.n) % RING.n) - 19) <= 1 ? 0.8 : 0);
  drawRing(cam, t, { body: 'tissue', hl });
  cap('DETECTOR ARRAY', 19.05, t, 'A stationary ring of crystals', 19.5);
}
// ---------------------------------------------------------------- S13-S16 decay, positron track, annihilation, the photon pair
function s13(t) {
  if (t < 21.45) {
    const f = fdgF(135, 230, 40), r = 600 * ein(seg(t, 21.2, 21.45));
    moleculeView(t, { fGlow: 1 });
    lensReveal(() => decayView(t, T_DECAY2, { zk: 0 }), f[0], f[1] + 4, Math.max(r, t > 21.2 ? 8 : 0));
  } else decayView(t, T_DECAY2, { zk: K75(seg(t, 21.45, 21.56)), o18: 21.95 });
  cap('BETA-PLUS DECAY', 21.05, t, 'F-18 > O-18 + ' + EPL + ' + ν', 22.05);
}
function s14(t) { positronWalk(t, 23.05, 24.9, { wide: true, z: 0.78 }); cap('POSITRON INTERACTIONS', 23.05, t, 'Each interaction costs energy', 23.6); }
function s15(t) { annihilation(t, T_ANN2, { big: true, dance: 0.65, th: -0.5 }); cap('MATTER + ANTIMATTER', 25.05, t, 'Mass becomes energy', 25.5); }
function s16(t) {
  clear(P.BG); waterField(new Cam(40, 20, 2.2, 135, 250), t, 0.35);
  const th = -0.5, dx = Math.cos(th), dy = Math.sin(th), d = 30 + 80 * (t - 27.0) + 40 * (t - 27) * (t - 27), cx = CX, cy = 240;
  dashLine(cx - dx * 200, cy - dy * 200, cx + dx * 200, cy + dy * 200, P.N5, 2, 4, 0);
  if (t > 27.4) { // ~180 degrees between the two directions
    const k = seg(t, 27.4, 27.8); for (let s = 0; s < 20 * k; s++) { const a = th + Math.PI * s / 20; pset(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, P.SUB); }
    if (UI_ON) tag('~180°', cx - 18, cy + 22, 27.75, t, { c: P.SUB });
  }
  for (const s of [1, -1]) gamma(cx + s * dx * d, cy + s * dy * d, s * dx, s * dy, { len: 30, amp: 4, wl: 7, ph: t * 40 });
  if (UI_ON) { tag('511 ' + KEV, cx + dx * d + 8, cy + dy * d - 22, 27.25, t, { c: P.GA3, plate: P.GA1 }); tag('511 ' + KEV, cx - dx * d - 60, cy - dy * d + 10, 27.35, t, { c: P.GA3, plate: P.GA1 }); }
  cap('TWO 511 ' + KEV + ' PHOTONS', 27.05, t, 'Nearly opposite directions', 27.5);
}
// ---------------------------------------------------------------- S17 gamma photons cross the body (some scatter or are absorbed)
const ZR = 0.33, RING_CAM = () => new Cam(0, 0, ZR, 135, 250);
const EV_A = { p: [-70, -26], th: -1.215, t0: 29.62 }, EV_B = { p: [34, -24], th: 2.55, t0: 29.12, sc: 52, th2: 1.6 }, EV_C = { p: [0, 66], th: 0.75, t0: 29.32, ab: 13 };
const T_REACH = 65 * BEAT;   // 30.469 s: the unscattered pair reaches opposite detectors
function photonPos(p, th, d) { return [p[0] + Math.cos(th) * d, p[1] + Math.sin(th) * d]; }
function s17(t) {
  const cam = RING_CAM(), hA1 = hitRing(EV_A.p[0], EV_A.p[1], Math.cos(EV_A.th), Math.sin(EV_A.th)), hA2 = hitRing(EV_A.p[0], EV_A.p[1], -Math.cos(EV_A.th), -Math.sin(EV_A.th));
  const v = Math.max(hA1[2], hA2[2]) / (T_REACH - EV_A.t0);
  const hl = {};
  const flash = (h, t1, lv) => { const i = modIndex(Math.atan2(h[1], h[0])); if (t >= t1) hl[i] = Math.max(hl[i] || 0, pulse(t, t1, 0.6) * lv + 0.2 * lv); };
  // B: one photon scatters (Compton) and changes direction; C: one photon is absorbed in bone
  const hB2 = hitRing(EV_B.p[0], EV_B.p[1], -Math.cos(EV_B.th), -Math.sin(EV_B.th)), sB = photonPos(EV_B.p, EV_B.th, EV_B.sc), hB1 = hitRing(sB[0], sB[1], Math.cos(EV_B.th2), Math.sin(EV_B.th2));
  const hC2 = hitRing(EV_C.p[0], EV_C.p[1], -Math.cos(EV_C.th), -Math.sin(EV_C.th));
  flash(hA1, T_REACH, 1); flash(hA2, T_REACH, 1); flash(hB2, EV_B.t0 + hB2[2] / v, 0.45); flash(hB1, EV_B.t0 + (EV_B.sc + hB1[2]) / v, 0.45); flash(hC2, EV_C.t0 + hC2[2] / v, 0.45);
  drawRing(cam, t, { body: 'tissue', hl });
  const G = (p, th, d, dim) => { const q = photonPos(p, th, d); if (dim) { gamma(cam.x(q[0]), cam.y(q[1]), Math.cos(th), Math.sin(th), { len: 9, amp: 1.4, c: P.GA1, ch: P.GA2, glow: false }); } else gamma(cam.x(q[0]), cam.y(q[1]), Math.cos(th), Math.sin(th), { len: 12, amp: 2, ph: t * 40 }); };
  // event A (unscattered pair)
  if (t > EV_A.t0) { const d = (t - EV_A.t0) * v; if (d < hA1[2]) G(EV_A.p, EV_A.th, d); if (d < hA2[2]) G(EV_A.p, EV_A.th + Math.PI, d); if (t - EV_A.t0 < 0.2) annihilationFlash(cam.x(EV_A.p[0]), cam.y(EV_A.p[1]), (t - EV_A.t0) / 0.2, 0.5); }
  // event B
  if (t > EV_B.t0) {
    const d = (t - EV_B.t0) * v; if (t - EV_B.t0 < 0.2) annihilationFlash(cam.x(EV_B.p[0]), cam.y(EV_B.p[1]), (t - EV_B.t0) / 0.2, 0.5);
    if (d < hB2[2]) G(EV_B.p, EV_B.th + Math.PI, d);
    if (d < EV_B.sc) G(EV_B.p, EV_B.th, d);
    else { const d2 = d - EV_B.sc; dashLine(cam.x(sB[0]), cam.y(sB[1]), cam.x(photonPos(sB, EV_B.th2, Math.min(d2, hB1[2]))[0]), cam.y(photonPos(sB, EV_B.th2, Math.min(d2, hB1[2]))[1]), P.GA1, 2, 2, 0); if (d2 < hB1[2]) G(sB, EV_B.th2, d2, true); if (d2 < 30) ring(cam.x(sB[0]), cam.y(sB[1]), 2 + d2 * 0.2, 1, P.GA3, 1 - d2 / 30); if (UI_ON) tag('SCATTERED', cam.x(sB[0]) - 64, cam.y(sB[1]) - 6, EV_B.t0 + EV_B.sc / v + 0.05, t, { c: P.GA2, plate: P.GA0 }); }
  }
  // event C
  if (t > EV_C.t0) {
    const d = (t - EV_C.t0) * v; if (t - EV_C.t0 < 0.2) annihilationFlash(cam.x(EV_C.p[0]), cam.y(EV_C.p[1]), (t - EV_C.t0) / 0.2, 0.5);
    if (d < hC2[2]) G(EV_C.p, EV_C.th + Math.PI, d);
    if (d < EV_C.ab) G(EV_C.p, EV_C.th, d); else { const q = photonPos(EV_C.p, EV_C.th, EV_C.ab), k = pulse(t, EV_C.t0 + EV_C.ab / v, 0.4); if (k > 0) disc(cam.x(q[0]), cam.y(q[1]), 2 + 3 * k, P.GA1, k); if (UI_ON) tag('ABSORBED', cam.x(q[0]) + 8, cam.y(q[1]) + 6, EV_C.t0 + EV_C.ab / v + 0.05, t, { c: P.GA2, plate: P.GA0 }); }
  }
  cap('GAMMA RAYS TRAVEL', 29.05, t, 'Some scatter or are absorbed', 29.5);
}
// ---------------------------------------------------------------- S18-S20 crystal -> light -> SiPM -> electric signal
const T_XTAL = 68 * BEAT, T_SCINT = 72 * BEAT, T_SIPM = 76 * BEAT;   // 31.875, 33.75, 35.625 s
const XC = (crystalX0(2) + crystalX1(2)) / 2, XDEPTH = 196;
const ETRACK = (() => { const pts = [[XC, XDEPTH]]; let x = XC, y = XDEPTH, a = 0.6; for (let i = 0; i < 9; i++) { a += (hash(i * 5 + 71) - 0.5) * 2.2; const st = 9 - i * 0.6; x = clamp(x + Math.cos(a) * st, crystalX0(2) + 4, crystalX1(2) - 4); y += Math.sin(a) * st; pts.push([x, y]); } return pts; })();
function excitation(t, k) { // luminescent centres excited along the photoelectron's track
  for (let i = 0; i < ETRACK.length; i++) { const [x, y] = ETRACK[i], a = k * (0.6 + 0.4 * Math.sin(t * 9 + i)); if (a > 0) { disc(x, y, 2.5, P.CR2, a * 0.7); pset(x, y, P.SL2); } }
}
function s18(t) {
  if (t < 31.4) { // push into the detector module hit by the upper photon
    const hA1 = hitRing(EV_A.p[0], EV_A.p[1], Math.cos(EV_A.th), Math.sin(EV_A.th)), z = Math.exp(lerp(Math.log(ZR), Math.log(5), ein(seg(t, 31.0, 31.4))));
    const g = (1 / ZR - 1 / z) / (1 / ZR - 1 / 5);
    mix(() => drawRing(new Cam(hA1[0] * g, hA1[1] * g, z, 135, 250), t, { body: 'tissue', hl: { [modIndex(Math.atan2(hA1[1], hA1[0]))]: 0.8 } }), () => drawModuleCut(t, {}), smooth(seg(t, 31.22, 31.4)));
  } else drawModuleCut(t, { lit: [0, 0, t > T_XTAL ? 0.25 * pulse(t, T_XTAL, 0.6) : 0, 0, 0] });
  if (t > 31.3 && t < T_XTAL) { const y = lerp(40, XDEPTH, (t - 31.3) / (T_XTAL - 31.3)); gamma(XC, y, 0, 1, { len: 18, amp: 3, ph: t * 40 }); }
  if (t >= T_XTAL) {
    const a = t - T_XTAL; if (a < 0.25) annihilationFlash(XC, XDEPTH, a / 0.25 * 0.8 + 0.2, 0.5);   // photoelectric absorption: the photon is gone
    const n = Math.min(ETRACK.length - 1, Math.floor(a / 0.035)), f = clamp(a / 0.035 - n, 0, 1);
    for (let i = 0; i < n; i++) line(ETRACK[i][0], ETRACK[i][1], ETRACK[i + 1][0], ETRACK[i + 1][1], P.EL2);
    if (n < ETRACK.length - 1) { const p = [lerp(ETRACK[n][0], ETRACK[n + 1][0], f), lerp(ETRACK[n][1], ETRACK[n + 1][1], f)]; electronAt(p[0], p[1], 3, t); }
    for (let i = 0; i <= n; i++) { const [x, y] = ETRACK[i]; disc(x, y, 2, P.CR3, 0.8); }
    if (UI_ON) tag('ELECTRON', XC + 26, XDEPTH - 30, T_XTAL + 0.15, t, { c: P.EL3, plate: P.EL1 });
  }
  cap('SCINTILLATION CRYSTAL', 31.05, t, 'Dense LYSO crystal', 31.5);
}
// optical photons bouncing between the reflective walls until they reach the SiPM
const OPH = []; for (let i = 0; i < 40; i++) OPH.push({ s: i % ETRACK.length, a: hash(i * 3 + 1) * TAU, v: 210 + 80 * hash(i * 3 + 2), dt: hash(i * 3 + 3) * 0.12 });
function bounce(x, a, b) { const L = b - a, u = ((x - a) % (2 * L) + 2 * L) % (2 * L); return a + (u < L ? u : 2 * L - u); }
function ophPos(o, t) { // returns [x, y, arrived]
  const u = t - T_SCINT - o.dt; if (u < 0) return null;
  const [x0, y0] = ETRACK[o.s], vx = Math.cos(o.a) * o.v, vy = Math.sin(o.a) * o.v;
  let y = y0 + vy * u; if (y < MC.y0 + 2) y = 2 * (MC.y0 + 2) - y;                                   // reflector on the entrance face
  const x = bounce(x0 + vx * u, crystalX0(2) + 1, crystalX1(2) - 1);
  return [x, Math.min(y, MC.y1), y >= MC.y1];
}
function s19(t) {
  let arrived = 0;
  const pts = OPH.map(o => { const p = ophPos(o, t); if (p && p[2]) arrived++; return p; });
  drawModuleCut(t, { lit: [0, 0, t < T_SCINT ? 0.15 : 0.35 * pulse(t, T_SCINT, 0.8), 0, 0], sipm: [0, 0, arrived / OPH.length, 0, 0] });
  excitation(t, t < T_SCINT ? 0.5 + 0.5 * seg(t, 33.0, T_SCINT) : pulse(t, T_SCINT, 0.5));
  for (let i = 0; i < OPH.length; i++) { const p = pts[i]; if (!p || p[2]) continue; const o = OPH[i]; optPhoton(p[0], p[1], Math.cos(o.a), Math.sin(o.a)); }
  if (t > T_SCINT && t < T_SCINT + 0.2) glow(XC, XDEPTH, 18, P.SL0, P.SL2, pulse(t, T_SCINT, 0.2));
  cap('ENERGY > LIGHT', 33.05, t, 'Excited crystal emits light', 33.5);
}
const FIRED = []; for (let k = 0; k < 24; k++) FIRED.push([Math.floor(hash(k * 7 + 1) * SP.cols), Math.floor(hash(k * 7 + 2) * SP.rows), T_SIPM + 0.32 * hash(k * 7 + 3)]);
function s20(t) {
  const fire = (i, j) => { let f = 0; for (const [a, b, tf] of FIRED) if (a === i && b === j && t >= tf) f = Math.max(f, pulse(t, tf, 0.55)); return f; };
  drawSiPM(t, { fire });
  for (const [i, j, tf] of FIRED) { const u = (tf - t) / 0.45; if (u > 0 && u < 1) { const [x, y] = spCell(i, j); optPhoton(x + 11 + u * 20, y + 11 - u * 120, -0.16, 1); } }
  const nf = FIRED.filter(f => t >= f[2]).length;
  drawPulseScope(20, 344, 140, 58, seg(t, T_SIPM, 36.2), nf / FIRED.length, P.SG2);
  // amplifier -> time (TDC) and energy (ADC) digitizers
  const ka = seg(t, 36.05, 36.15), kt = seg(t, 36.25, 36.35), ke = seg(t, 36.35, 36.45);
  line(160, 373, 172, 373, ka > 0 ? P.SG2 : P.N5); poly([172, 362, 172, 384, 190, 373], ka > 0 ? P.SG1 : P.N4);
  for (const [y, s, k] of [[346, 'TIME', kt], [378, 'ENERGY', ke]]) { line(190, 373, 202, y + 8, k > 0 ? P.SG2 : P.N5); rect(202, y, 254, y + 17, P.K0); frame(202, y, 254, y + 17, k > 0 ? P.SG2 : P.N5); if (UI_ON) text(FM, s, 206, y + 4, { c: k > 0 ? P.SG3 : P.SUB, ol: null, n: k * 12 }); }
  cap('LIGHT > ELECTRIC SIGNAL', 35.05, t, 'Each cell fires an avalanche', 35.5);
}
// ---------------------------------------------------------------- S21-S24 coincidence, line of response, many events, time of flight
const hA1 = () => hitRing(EV_A.p[0], EV_A.p[1], Math.cos(EV_A.th), Math.sin(EV_A.th)), hA2 = () => hitRing(EV_A.p[0], EV_A.p[1], -Math.cos(EV_A.th), -Math.sin(EV_A.th));
const T_C1 = 80 * BEAT, T_C2 = 80.5 * BEAT, T_CC = 81 * BEAT, T_LOR = 84 * BEAT;   // 37.5, 37.734, 37.969, 39.375
function timingPanel(t, marks, ok) { // processing electronics: detection times on a shared clock
  const x0 = 28, x1 = 242, y = 92;
  rect(x0 - 4, y - 8, x1 + 4, y + 26, P.K0); frame(x0 - 4, y - 8, x1 + 4, y + 26, P.N5);
  rect(x0, y + 10, x1, y + 11, P.N6);
  for (let k = 0; k <= 10; k++) rect(x0 + k * (x1 - x0) / 10, y + 8, x0 + k * (x1 - x0) / 10 + 1, y + 13, P.N5);
  marks.forEach(([tm, x], i) => { if (t >= tm) { const k = pulse(t, tm, 0.3); rect(x - 1, y - 2, x + 2, y + 10, k > 0 ? P.SG3 : P.SG2); } });
  if (ok > 0) { const a = marks[0][1] - 10, b = marks[1][1] + 10; rect(a, y - 5, b, y - 4, P.SG2); rect(a, y - 5, a + 1, y + 2, P.SG2); rect(b - 1, y - 5, b, y + 2, P.SG2); if (UI_ON) text(FM, 'COINCIDENCE', (a + b) / 2, y + 14, { c: P.SG3, align: 'center', n: ok * 14 }); }
}
function s21(t) {
  const cam = RING_CAM(), h1 = hA1(), h2 = hA2(), m1 = modIndex(Math.atan2(h1[1], h1[0])), m2 = modIndex(Math.atan2(h2[1], h2[0]));
  const hl = {}; if (t >= T_C1) hl[m1] = 0.6 + 0.4 * pulse(t, T_C1, 0.4); if (t >= T_C2) hl[m2] = 0.6 + 0.4 * pulse(t, T_C2, 0.4); if (t >= T_CC) { hl[m1] = 1; hl[m2] = 1; }
  drawRing(cam, t, { body: 'tissue', hl });
  for (const [h, tm] of [[h1, T_C1], [h2, T_C2]]) if (t >= tm && t < tm + 0.35) { const k = (t - tm) / 0.35, x = lerp(cam.x(h[0]), 135, k), y = lerp(cam.y(h[1]), 120, k); disc(x, y, 3, P.SG2); glow(x, y, 6, P.SG0, P.SG2, 1 - k); }
  timingPanel(t, [[T_C1, 118], [T_C2, 146]], seg(t, T_CC, T_CC + 0.3));
  cap('COINCIDENCE DETECTION', 37.05, t, 'Paired within nanoseconds', 37.6);
}
function s22(t) {
  const cam = RING_CAM(), h1 = hA1(), h2 = hA2(), m1 = modIndex(Math.atan2(h1[1], h1[0])), m2 = modIndex(Math.atan2(h2[1], h2[0]));
  drawRing(cam, t, { body: 'tissue', hl: { [m1]: 0.8, [m2]: 0.8 } });
  const k = K75(seg(t, T_LOR, T_LOR + 0.3)), x1 = cam.x(h1[0]), y1 = cam.y(h1[1]), x2 = cam.x(h2[0]), y2 = cam.y(h2[1]);
  if (k > 0) {
    lineW(x1, y1, lerp(x1, x2, k), lerp(y1, y2, k), 3, P.GA0, 0.6); line(x1, y1, lerp(x1, x2, k), lerp(y1, y2, k), P.GA3);
    if (t > T_LOR + 0.4) for (let s = 0.08; s < 0.95; s += 0.07) { const a = pulse(((t - T_LOR - 0.4) * 1.6 + s) % 1, 0, 0.5) * 0.9; disc(lerp(x1, x2, s), lerp(y1, y2, s), 2, P.GA2, a); }   // equally possible origins
  }
  cap('LINE OF RESPONSE', 39.05, t, 'The event lies somewhere on it', 39.75);
}
const T_EV0 = 88 * BEAT, EVN = 23;   // 41.25 s, events on 16ths
function lorOf(k) { const [x, y] = eventAt(k), th = hash(k * 13 + 9) * Math.PI; return [x, y, th, hitRing(x, y, Math.cos(th), Math.sin(th)), hitRing(x, y, -Math.cos(th), -Math.sin(th))]; }
function s23(t) {
  const cam = RING_CAM(), n = clamp(Math.floor((t - T_EV0) / (BEAT / 4)) + 1, 0, EVN), hl = {};
  for (let k = Math.max(0, n - 2); k < n; k++) { const L = lorOf(k), tk = T_EV0 + k * BEAT / 4; for (const h of [L[3], L[4]]) { const m = modIndex(Math.atan2(h[1], h[0])); hl[m] = Math.max(hl[m] || 0, pulse(t, tk, 0.35)); } }
  drawRing(cam, t, { body: 'tissue', hl });
  const extra = Math.floor(70 * seg(t, 42.0, 43.9));                                                   // plus many more, time-compressed
  for (let k = 0; k < n + extra; k++) {
    const L = lorOf(k), tk = T_EV0 + k * BEAT / 4, fresh = k < n ? pulse(t, tk, 0.3) : 0;
    line(cam.x(L[3][0]), cam.y(L[3][1]), cam.x(L[4][0]), cam.y(L[4][1]), fresh > 0 ? P.GA3 : P.GA1, fresh > 0 ? 1 : (k < n ? 0.4 : 0.14));
  }
  if (UI_ON && t > 41.4) { const N = Math.round(12 + 4800 * Math.pow(seg(t, 41.4, 43.95), 2)), s = 'EVENTS ' + (N >= 1000 ? Math.floor(N / 1000) + ',' + String(N % 1000).padStart(3, '0') : N), tw = textW(FM, s, 2); rect(248 - tw, 93, 256, 111, P.K0); frame(248 - tw, 93, 256, 111, P.N5); text(FM, s, 252 - tw, 97, { c: P.INK, ol: null }); }
  cap('MANY DETECTED EVENTS', 41.05, t, 'Lines pile up where tracer is', 41.5);
}
const TOF = { p: [-112, 34], th: -0.06, t0: 44.05 };
function s24(t) {
  const cam = RING_CAM(), c = Math.cos(TOF.th), s = Math.sin(TOF.th), h1 = hitRing(TOF.p[0], TOF.p[1], c, s), h2 = hitRing(TOF.p[0], TOF.p[1], -c, -s);
  const v = (h1[2] - h2[2]) / 0.36, ta = TOF.t0 + h2[2] / v, tb = TOF.t0 + h1[2] / v;            // the nearer detector fires first
  const m1 = modIndex(Math.atan2(h1[1], h1[0])), m2 = modIndex(Math.atan2(h2[1], h2[0])), hl = {};
  if (t >= ta) hl[m2] = 0.5 + 0.5 * pulse(t, ta, 0.4); if (t >= tb) hl[m1] = 0.5 + 0.5 * pulse(t, tb, 0.4);
  drawRing(cam, t, { body: 'tissue', hl });
  const d = (t - TOF.t0) * v;
  if (t > TOF.t0 && t - TOF.t0 < 0.2) annihilationFlash(cam.x(TOF.p[0]), cam.y(TOF.p[1]), (t - TOF.t0) / 0.2, 0.5);
  if (t > TOF.t0) { if (d < h1[2]) gamma(cam.x(TOF.p[0] + c * d), cam.y(TOF.p[1] + s * d), c, s, { len: 12, amp: 2, ph: t * 40 }); if (d < h2[2]) gamma(cam.x(TOF.p[0] - c * d), cam.y(TOF.p[1] - s * d), -c, -s, { len: 12, amp: 2, ph: t * 40 }); }
  if (t > tb + 0.05) { // the arrival-time difference narrows the origin to a probability region on the line
    const k = seg(t, 45.0, 45.4), x1 = cam.x(h1[0]), y1 = cam.y(h1[1]), x2 = cam.x(h2[0]), y2 = cam.y(h2[1]);
    line(x1, y1, x2, y2, P.GA1, 0.6);
    for (let q = -1; q <= 1; q += 0.02) { const w = gauss(q * 2.2), px = cam.x(TOF.p[0] + c * q * 70), py = cam.y(TOF.p[1] + s * q * 70); if (w * k > 0.05) disc(px, py, 1 + 3.5 * w, P.GA2, 0.8 * w * k); }
    if (UI_ON) tag('LIKELY ORIGIN', cam.x(TOF.p[0]) - 40, cam.y(TOF.p[1]) + 12, 45.3, t, { c: P.GA3, plate: P.GA1 });
  }
  if (UI_ON) { if (t >= ta) tag('FIRST', cam.x(h2[0]) + 6, cam.y(h2[1]) - 26, ta, t, { c: P.SG3, plate: P.SG0 }); if (t >= tb) tag('SECOND', cam.x(h1[0]) - 60, cam.y(h1[1]) - 26, tb, t, { c: P.SG3, plate: P.SG0 }); }
  cap('TIME-OF-FLIGHT PET', 44.05, t, 'On TOF-capable scanners', 44.5);
}
// ---------------------------------------------------------------- S25 image reconstruction
const T_REVEAL = 108 * BEAT;   // 50.625 s
function clipLine(x0, y0, x1, y1, R, c, lv) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0, p = [-dx, dx, -dy, dy], q = [x0 - R[0], R[2] - 1 - x0, y0 - R[1], R[3] - 1 - y0];
  for (let i = 0; i < 4; i++) { if (p[i] === 0) { if (q[i] < 0) return; } else { const r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return; if (r > t0) t0 = r; } else { if (r < t0) return; if (r < t1) t1 = r; } } }
  line(x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy, c, lv);
}
const RC_SIN = [20, 80, 250, 196], RC_IMG = [20, 208, 250, 420];
function reconApp(t) {
  clear(P.BG);
  drawSinogram(RC_SIN, Math.floor(2600 * seg(t, 47.9, 49.3)));
  if (UI_ON) tag('SINOGRAM', RC_SIN[0] + 4, RC_SIN[1] - 14, 48.05, t, { c: P.SUB });
  rect(RC_IMG[0], RC_IMG[1], RC_IMG[2], RC_IMG[3], P.K0); frame(RC_IMG[0] - 1, RC_IMG[1] - 1, RC_IMG[2] + 1, RC_IMG[3] + 1, P.N5);
  const cam = new Cam(0, 4, 0.6, (RC_IMG[0] + RC_IMG[2]) / 2, (RC_IMG[1] + RC_IMG[3]) / 2);
  const nb = Math.floor(170 * seg(t, 48.6, 49.4));
  for (let k = 0; k < nb; k++) { const L = lorOf(k + 400); clipLine(cam.x(L[3][0]), cam.y(L[3][1]), cam.x(L[4][0]), cam.y(L[4][1]), RC_IMG, k % 9 === 0 ? P.HM5 : P.HM2, 0.28); }   // simple backprojection: streaks
  const it = clamp(Math.floor((t - 49.4) / 0.25) + 1, 0, 4);
  if (it > 0) { // iterative updates sharpen the estimate towards the activity map
    withBuffer(TMPBUF, () => drawSlice(cam, 'pet', { clip: RC_IMG }));
    const k = it / 4 * smooth(clamp((t - 49.4 - (it - 1) * 0.25) / 0.2, 0, 1)) + (it - 1) / 4 * (1 - smooth(clamp((t - 49.4 - (it - 1) * 0.25) / 0.2, 0, 1)));
    for (let y = RC_IMG[1]; y < RC_IMG[3]; y++) for (let x = RC_IMG[0]; x < RC_IMG[2]; x++) if (bay(x, y) < k) buf[y * W + x] = TMPBUF[y * W + x];
    if (UI_ON) tag('ITERATION ' + it, RC_IMG[0] + 4, RC_IMG[1] + 4, 49.4 + (it - 1) * 0.25, t, { c: P.SG3, plate: P.SG0 });
  } else if (nb > 0 && UI_ON) tag('BACKPROJECTION', RC_IMG[0] + 4, RC_IMG[1] + 4, 48.65, t, { c: P.SUB });
}
function s25(t) {
  if (t < 48.0) {
    const z = Math.exp(Math.log(2.3) * ein(seg(t, 47.55, 48.0)));
    const cam = new Cam(lerp(135, 135, 0), lerp(240, 205, seg(t, 47.55, 48.0)), z, 135, 240);
    drawWorkstation(cam, t, { screen: R => { const w = R[2] - R[0]; drawSinogram([R[0] + 6, R[1] + 6, R[2] - 6, R[1] + Math.round((R[3] - R[1]) * 0.42)], Math.floor(900 * seg(t, 47.1, 48.0))); } });
    if (t > 47.85) { const k = seg(t, 47.85, 48.0); withBuffer(TMPBUF, () => reconApp(t)); dissolve(buf, TMPBUF, k, buf); }
  } else if (t < T_REVEAL) reconApp(t);
  else { // the reconstructed whole-body image: a map of tracer activity, not a photograph
    drawPETBody(new Cam(0, 64, 3.25, 135, 250));
    const k = pulse(t, T_REVEAL, 0.35); if (k > 0) rect(0, 0, W, H, P.HM9, 0.3 * k);
  }
  cap('PET IMAGE RECONSTRUCTION', 47.05, t, 'Built from many detected events', 47.5);
}
// ---------------------------------------------------------------- S26 PET + CT fusion
const T_FUSE = 112 * BEAT;   // 52.5 s
function s26(t) {
  clear(P.BG);
  const kin = backOut(seg(t, 51.0, 51.4), 1.1), sl = K75(seg(t, 51.65, T_FUSE)), gr = K75(seg(t, T_FUSE, 53.25));
  const cy = 252, hw = Math.round(64 * Math.max(0.05, kin)), hh = Math.round(60 * Math.max(0.05, kin));
  if (t < T_FUSE) {
    const xl = Math.round(lerp(70, 135, sl)), xr = Math.round(lerp(200, 135, sl));
    drawSlice(new Cam(0, 4, 0.34, xl, cy), 'ct', { clip: [xl - hw, cy - hh, xl + hw, cy + hh] });
    frame(xl - hw - 1, cy - hh - 1, xl + hw + 1, cy + hh + 1, P.CT4);
    withBuffer(TMPBUF, () => { clear(P.BG); drawSlice(new Cam(0, 4, 0.34, xr, cy), 'pet', { clip: [xr - hw, cy - hh, xr + hw, cy + hh] }); });
    for (let y = cy - hh; y < cy + hh; y++) for (let x = xr - hw; x < xr + hw; x++) { if (x < 0 || x >= W) continue; const inL = x >= xl - hw && x < xl + hw; if (!inL || bay(x, y) < 0.55) buf[y * W + x] = TMPBUF[y * W + x]; }
    frame(xr - hw - 1, cy - hh - 1, xr + hw + 1, cy + hh + 1, P.HM6);
    if (UI_ON) { tag('CT: ANATOMY', xl, cy - hh - 16, 51.3, t, { align: 'center', c: P.CT6 }); tag('PET: TRACER', xr, cy + hh + 6, 51.4, t, { align: 'center', c: P.HM6 }); }
  } else {
    const z = lerp(0.34, 0.64, gr), hw2 = Math.round(lerp(64, 124, gr)), hh2 = Math.round(lerp(60, 116, gr));
    drawSlice(new Cam(0, 4, z, 135, cy), 'fused', { alpha: 1, clip: [135 - hw2, cy - hh2, 135 + hw2, cy + hh2] });
    frame(134 - hw2, cy - hh2 - 1, 136 + hw2, cy + hh2 + 1, P.SC1);
    const k = pulse(t, T_FUSE, 0.3); if (k > 0) frame(133 - hw2, cy - hh2 - 2, 137 + hw2, cy + hh2 + 2, P.C6);
    if (t > 53.3 && UI_ON) { const c2 = new Cam(0, 4, z, 135, cy), hx = c2.x(34), hy = c2.y(-24); callout({ text: 'NORMAL HEART UPTAKE', x: 30, y: cy + hh2 + 12, ax: hx, ay: hy + 10, t0: 53.4, plate: true, c: P.HM6 }, t); }
    if (UI_ON) microText('Bright does not always mean cancer', 135, 116, 53.9, t, { align: 'center', c: P.SC3, mw: 236 });
  }
  cap('PET + CT', 51.05, t, 'Anatomy + tracer activity', 52.6);
}
// ---------------------------------------------------------------- S27 recap on the beat, title, seamless loop
const RECAP = [['RADIOTRACER', 118 * BEAT, s07, 10.45], ['POSITRON', 119 * BEAT, s03, 3.62], ['ANNIHILATION', 120 * BEAT, s15, 26.3], ['TWO GAMMA PHOTONS', 121 * BEAT, s16, 27.9],
  ['SCINTILLATION CRYSTALS', 122 * BEAT, s19, 34.0], ['ELECTRICAL SIGNALS', 123 * BEAT, s20, 35.95], ['COINCIDENCE DETECTION', 124 * BEAT, s21, 37.99]];
const T_TITLE = 125 * BEAT;   // 58.594 s
function s27(t) {
  if (t < RECAP[0][1]) { withBuffer(TMPBUF, () => s26(54.99)); UI_ON = false; try { RECAP[0][2](RECAP[0][3]); } finally { UI_ON = true; } dissolve(TMPBUF, buf, smooth(seg(t, 55.0, RECAP[0][1])), buf); return; }
  if (t < T_TITLE) {
    let i = 0; while (i + 1 < RECAP.length && t >= RECAP[i + 1][1]) i++;
    const R = RECAP[i];
    UI_ON = false; try { R[2](R[3] + (t - R[1]) * 0.4); } finally { UI_ON = true; }
    const k = seg(t, R[1], R[1] + 0.1); if (k < 1) rect(0, 0, W, H, P.C6, 0.3 * (1 - k));
    tag(R[0], CX, LBL_Y + 2, R[1] + 0.02, t, { align: 'center', c: P.INK, plate: P.N5 });
    for (let j = 0; j <= RECAP.length; j++) { const x = 87 + j * 12; rect(x, 398, x + 7, 402, j <= i ? P.GA2 : P.N4); }
    return;
  }
  const clean = () => drawPETBody(new Cam(0, 64, 3.25, 135, 250));       // == frame 0
  const titled = () => {
    clean();
    const k = seg(t, T_TITLE, T_TITLE + 0.2); rect(0, 0, W, H, P.C6, 0.25 * pulse(t, T_TITLE, 0.12)); darken(0.5 * k, 0, 336, W, 430);
    text(FT, 'HOW PET', CX, 346, { sc: 2, bold: true, align: 'center', shadow: P.HM1, sd: 2, n: (t - T_TITLE - 0.02) * 45 });
    text(FT, 'SCANNERS WORK', CX, 372, { sc: 2, bold: true, align: 'center', shadow: P.HM1, sd: 2, n: (t - T_TITLE - 0.18) * 45 });
    if (t > T_TITLE + 0.35) text(FM, 'HOW ANTIMATTER CREATES MEDICAL IMAGES', CX, 402, { c: P.HM5, align: 'center', n: (t - T_TITLE - 0.35) * 70, sc: 1 });
  };
  const e = smooth(seg(t, 59.5, 59.88));
  if (e <= 0) titled(); else if (e >= 1) clean(); else { withBuffer(TMPBUF, titled); clean(); dissolve(TMPBUF, buf, e, buf); }
}
// ---------------------------------------------------------------- scene table
const SCENES = [
  [0, 1.2, s01], [1.2, 2.4, s02], [2.4, 4.0, s03], [4.0, 5.5, s04, 0.18], [5.5, 7.0, s05, 0.15], [7.0, 9.0, s06, 0.18],
  [9.0, 11.0, s07, 0.25], [11.0, 13.0, s08, 0.22], [13.0, 15.0, s09], [15.0, 17.0, s10, 0.22], [17.0, 19.0, s11, 0.25], [19.0, 21.0, s12, 0.25],
  [21.0, 23.0, s13, 0.22], [23.0, 25.0, s14, 0.18], [25.0, 27.0, s15, 0.18], [27.0, 29.0, s16], [29.0, 31.0, s17, 0.22], [31.0, 33.0, s18],
  [33.0, 35.0, s19], [35.0, 37.0, s20, 0.2], [37.0, 39.0, s21, 0.22], [39.0, 41.0, s22], [41.0, 44.0, s23, 0.15], [44.0, 47.0, s24, 0.2],
  [47.0, 51.0, s25, 0.22], [51.0, 55.0, s26, 0.2], [55.0, 60.0, s27],
];
function sceneIndex(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][1]) return i; return SCENES.length - 1; }
const CHIPS = [[2.75, 4.0, 'NOT TO SCALE', 'N5', null], [21.45, 23.0, 'NOT TO SCALE', 'N5', null], [15.05, 17.0, 'TIME-LAPSE', 'TR1', 'clock'], [41.05, 44.0, 'TIME-COMPRESSED', 'GA1', 'clock'],
  [4.02, 9.0, 'VISUALIZATION', 'GA1', 'wave'], [23.02, 35.0, 'VISUALIZATION', 'GA1', 'wave'], [37.02, 41.05, 'VISUALIZATION', 'GA1', 'wave'], [44.02, 47.0, 'VISUALIZATION', 'GA1', 'wave']];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const i = sceneIndex(t), S = SCENES[i];
  S[2](t);
  const d = S[3];
  if (d && i > 0 && t < S[0] + d) { withBuffer(TRANSBUF, () => SCENES[i - 1][2](t)); dissolve(TRANSBUF, buf, smooth((t - S[0]) / d), buf); }
  for (const [a, b, s, c, icon] of CHIPS) if (t >= a && t < b) { chip(s, a, t, P[c], icon); break; }
}
