'use strict';
// ============================================================================
// SCENE COMPOSITOR: 27 micro-scenes in 7 continuous sequences (SC_T, 118 BPM).
// One sample from start to finish: the purple-top tube is pierced → the result
// screen (hook) → one red cell through one aperture (hook preview) → back to the
// needle → the tubing → whole blood → dilution → three aliquots → impedance
// (electrolyte, aperture, one red cell and its pulse, a platelet, many cells,
// the size histogram) → hemoglobin (SLS lysis, photometer) → white cells (lysis,
// dye, hydrodynamic focusing, laser, scatter + fluorescence, photodiodes, WDF +
// WNR scattergrams) → processor → report → recap → the tube again (loop).
// Hard cuts only at 0.8 s, 27 s and 32 s; everything else is camera moves and
// zoom crossfades: the outgoing camera keeps pushing in (or pulling out) while
// the next scale settles in under a smooth blend — no portals, no flashes.
// ============================================================================
// draw world B over the current frame at weight k (a smooth RGB crossfade)
function crossWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  mixInto(buf, TMPBUF, k);
}
const xf = (t, a, b) => smooth(seg(t, a, b));
const zin = (t, a, b, from) => lerp(from === undefined ? 0.72 : from, 1, eout(seg(t, a, b)));      // incoming world settles from wide to its framing
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
// index of the element of arr whose position f(el) is nearest (x, y) — picked once, so a tag never jumps
function nearestIdx(arr, f, x, y) { let bi = 0, bd = Infinity; arr.forEach((e, i) => { const p = f(e, i); if (!p) return; const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; }
const once = fn => { let v; return () => v === undefined ? (v = fn()) : v; };

// ============================================================================ A: HOOK (0–3)
const HOOK = [243, 320, 1.8];            // frame 0 = the loop's last frame
const DISP = [104, 292];                 // the analyzer display
const T_RBC = bt(2), T_WBC = bt(2.5), T_PLT = bt(3);
const hookCam = k => new Cam(HOOK[0], HOOK[1], HOOK[2] * (k || 1));
function s01(t) {
  const cam = hookCam(1 + 0.03 * ph(t, 0, 0.8, lin));
  const pierce = eout(seg(t, 0.1, 0.42)), draw = ph(t, 0.42, 0.8);
  labScene(cam, t, { pierce, draw, busy: 1, screen: (a, b, c, d) => resultUI(a, b, c, d, t, { k: 0, busy: seg(t, 0.1, 0.8) }) });
}
// after the cut the display eases in a little (no slam, no shake)
function dispCam(t) { return new Cam(DISP[0], DISP[1], lerp(2.2, 2.45, K50(seg(t, 0.8, 1.5))) * (1 + 0.03 * ph(t, 1.5, 1.8, lin))); }
function dispUI(t) { const k = t >= T_PLT ? 3 : t >= T_WBC ? 2 : t >= T_RBC ? 1 : 0; return (a, b, c, d) => resultUI(a, b, c, d, t, { k, t1: T_RBC, t2: T_WBC, t3: T_PLT, sc: 3 }); }
function s02(t) { labScene(dispCam(t), t, { pierce: 1, draw: 1, busy: 1, screen: dispUI(t) }); }
// the hook preview: one red cell through the aperture; pulse plateau 2.48–2.60 (peak on beat 5), counted at 2.80
const HOOK_RBC = { k: 'rbc', keys: [[1.8, -110], [2.30, -24], [2.48, -6], [2.60, 6], [2.80, 24], [3.4, 100]], rot: 0.2 };
const T_HOOKCOUNT = 2.80;
const hookImpCam = t => new Cam(-4, 4, 2.0 * zin(t, 1.95, 2.5) * (1 + 0.06 * ph(t, 2.3, 3.0, lin)) * (1 - 0.22 * xf(t, 3.0, 3.4)), 165, 334);
function W_hookImp(t) { impWorld(hookImpCam(t), t, { parts: [HOOK_RBC], current: 1, ions: true, sheath: 1, zone: 1 }); }
function numCentre(cam) { const sc = 3, big = 6; return [cam.x(30) + 6 * sc + textW(FC, EX.rbc, big) / 2, cam.y(232) + 22 * sc + 4.5 * big]; }
const SCOPE = [20, 92, 290, 166];
function hookHUD(t, a) {
  if (a <= 0) return;
  withDither(a, () => {
    scope(SCOPE[0], SCOPE[1], SCOPE[2], SCOPE[3], [HOOK_RBC], t, { win: 1.0, max: 1.25, label: true });
    counter(24, 462, 'RBC', t >= T_HOOKCOUNT ? 1 : 0, P.RB3, 2, hlt(t, T_HOOKCOUNT));
  });
}
// a counter's frame lights up for a moment when it changes (instead of a burst)
const hlt = (t, tc) => t >= tc && t < tc + 0.45 ? 1 - (t - tc) / 0.45 : 0;
function s03(t) {
  // push toward the RBC number while the aperture world settles in underneath it
  const c0 = dispCam(1.8), f = ph(t, 1.8, 2.35, K50);
  const [nx, ny] = numCentre(c0), nwx = c0.wx(nx), nwy = c0.wy(ny);
  const cam = new Cam(lerp(c0.cx, nwx, f), lerp(c0.cy, nwy, f), c0.z * (1 + 0.16 * f));
  const k = xf(t, 1.95, 2.3);
  if (k < 1) labScene(cam, t, { pierce: 1, draw: 1, busy: 1, screen: dispUI(t) });
  crossWorld(() => W_hookImp(t), k);
  hookHUD(t, ph(t, 2.2, 2.4) * (1 - ph(t, 2.85, 3.0)));
}

// ============================================================================ B: THE SAMPLE (3–11)
const xrayCam4 = t => camTrack([[3.0, 250, 335, 2.9], [3.45, 250, 318, 2.3, eout], [4.35, 214, 240, 2.3, K50], [4.95, 186, 230, 2.3, K50], [5.45, 194, 213, 3.6, ein]], t);
const S4blood = t => 0.62 * ph(t, 3.35, 5.0, lin), S4piston = t => 0.55 * ph(t, 3.35, 5.0, lin);
function W_xray4(t) {
  const cam = xrayCam4(t);
  analyzerXray(cam, t, lerp(0.4, 1, ph(t, 3.0, 3.6)), { pierce: 1, draw: 1, blood: S4blood(t), piston: S4piston(t), screen: (a, b, c, d) => resultUI(a, b, c, d, t, { k: 0, busy: 0.55 }) });
  return cam;
}
function slugHead(t) { const L1 = FLU_P.tube.L, L2 = FLU_P.tube2.L, bp = S4blood(t) * (L1 + L2); return bp <= L1 ? FLU_P.tube.at(bp) : FLU_P.tube2.at(bp - L1); }
function s04(t) {
  const cam = W_xray4(t);
  if (t < 3.4) crossWorld(() => W_hookImp(t), 1 - xf(t, 3.0, 3.4));
  tag('SAMPLING NEEDLE', cam.x(ANZ.tubeX + 1.5), cam.y(needleTip(1) - 24), 190, 300, 3.4, 4.3, t, P.AL3);
  tag('SYRINGE PUMP', cam.x(FLU.pump[2] + 24), cam.y((FLU.pump[1] + FLU.pump[3]) / 2), 40, 330, 4.4, 4.98, t, P.AL3);
}
// inside the tubing: whole blood (camera rides with the flow)
const TF = { z: 1.45, v: 56 };
const tfCam = t => new Cam(TF.v * (t - 5.0), 0, TF.z * zin(t, 4.95, 5.6), 165, 330);
const tfWx = t => TF.v * (t - 5.0) - 8 + 5 * (t - 5.0);
function W_tube(t) { const cam = tfCam(t); tubeFlow(cam, t, { v: 60, wx: tfWx(t) }); return cam; }
function s05(t) {
  if (t < 5.4) { W_xray4(t); crossWorld(() => W_tube(t), xf(t, 5.0, 5.4)); }
  else W_tube(t);
  const cam = tfCam(t), wx = tfWx(t);
  tag('RED CELL  ~7.5 µm', cam.x(wx - 70), cam.y(-60 - R_RBC), 22, 168, 5.45, 7.4, t, P.RB3);
  tag('WHITE CELL  ~12 µm', cam.x(wx + 6), cam.y(-10 - R_WBC), 112, 236, 5.75, 7.4, t, P.WB3);
  tag('PLATELET  ~2.5 µm', cam.x(wx + 70), cam.y(48 + R_PLT), 112, 440, 6.05, 7.4, t, P.PL3);
}
// the mixing chamber: diluent in, cells spread apart
function W_mix(t) { const cam = new Cam(0, 0, 1.3 * (1 - 0.3 * xf(t, 9.0, 9.45)), 165, 320); mixWorld(cam, t, { dil: ph(t, 7.75, 8.9) }); return cam; }
function s06(t) {
  if (t < 7.9) { W_tube(t); crossWorld(() => W_mix(t), xf(t, 7.5, 7.9)); } else W_mix(t);
}
// three aliquots leave the chamber (pull back), then dive into the RBC/PLT detector
const intCam7 = t => camTrack([[9.0, 140, 318, 3.4], [9.1, 140, 318, 3.4], [10.35, 258, 360, 1.2, K75], [10.6, 258, 360, 1.2], [11.05, 231, 402, 2.4, ein]], t);
function W_int7(t) {
  const cam = intCam7(t);
  analyzerXray(cam, t, 1, { pierce: 1, draw: 1, blood: 0, piston: 0.55, mixFill: 1, dil: 1, alq: [ph(t, 9.45, 10.2, lin), ph(t, 9.55, 10.3, lin), ph(t, 9.65, 10.4, lin)], hi: t > 10.35 ? 'A' : null });
  return cam;
}
const detC = d => [(d[0] + d[2]) / 2, (d[1] + d[3]) / 2];
function s07(t) {
  const cam = W_int7(t);
  if (t < 9.45) crossWorld(() => W_mix(t), 1 - xf(t, 9.0, 9.45));
  const [ax_, ay_] = detC(FLU.detA), [bx_, by_] = detC(FLU.detB), [cx_, cy_] = detC(FLU.detC);
  tag('RBC / PLT', cam.x(FLU.detA[2]), cam.y(ay_), 180, 382, 9.75, 10.72, t, P.EC2);
  tag('HGB', cam.x(bx_), cam.y(FLU.detB[1]), 212, 252, 9.85, 10.72, t, P.LG2);
  tag('WBC', cam.x(cx_), cam.y(FLU.detC[3]), 100, 462, 9.95, 10.72, t, P.LZ2);
  if (t > 10.65) crossWorld(() => W_imp(t), xf(t, 10.65, 11.0));
}

// ============================================================================ C: IMPEDANCE (11–27)
// slowed-down red cell: approach, enter (beats 37–39), inside (39–41), exit (41–43, counted on beat 43)
const RBC1 = { k: 'rbc', keys: [[15.0, -80], [bt(37), -24], [bt(39), -6], [bt(41), 6], [bt(43), 24], [23.2, 120]], rot: 0.15 };
const T_RBC1 = bt(43), T_PLTC = 23.5, T_RBC2 = 24.52;
// a platelet (peak on beat 46), then a red cell (peak on beat 48) at closer-to-real speed
const PLT1 = { k: 'plt', keys: [[22.7, -100], [23.22, -18], [bt(46) - 0.06, -12], [bt(46) + 0.06, 12], [23.50, 18], [24.0, 100]], rot: 0.4, y: 2 };
const RBC2 = { k: 'rbc', keys: [[23.5, -120], [24.24, -24], [bt(48) - 0.05, -6], [bt(48) + 0.05, 6], [T_RBC2, 24], [25.2, 120]], rot: -0.2 };
// then a stream of cells with a spread of volumes (time-lapse)
const STREAM = (() => {
  const a = [];
  for (let i = 0; i < 24; i++) {
    const e = sizeSample(i + 200), tc = 25.1 + i * 0.085 + hash(i + 7000) * 0.02;
    const r = e.k === 'rbc' ? 10 * Math.cbrt(e.v / 90) : 3.4 * Math.cbrt(e.v / 9), vol = e.k === 'rbc' ? e.v / 90 : 0.2 * e.v / 9;
    a.push({ k: e.k, r, vol, y: (hash(i + 7100) - 0.5) * 4, rot: hash(i + 7200) * 3, keys: [[tc - 0.3, -150], [tc, 0], [tc + 0.3, 150]] });
  }
  return a;
})();
const IMP_PARTS = [RBC1, PLT1, RBC2].concat(STREAM);
function impCam(t) {
  if (t < 25.0) return camTrack([[10.65, 0, -8, 0.68], [11.25, 0, -8, 0.92, eout], [11.9, 0, -8, 0.95, lin], [13.15, 0, 0, 1.8, K50]], t, 165, 330);
  const f = K75(seg(t, 25.0, 26.4));
  return new Cam(0, lerp(0, 40, f), Math.exp(lerp(Math.log(1.8), Math.log(0.95), f)), 165, 330);
}
function W_imp(t) {
  const cam = impCam(t);
  impWorld(cam, t, { parts: IMP_PARTS, current: 1, ions: true, sheath: ph(t, 12.9, 13.4), zone: t > 13.45 ? 1 : 0 });
  return cam;
}
const impWin = t => lerp(3.0, 1.5, ph(t, 25.0, 25.5));
const RBC_N = t => (t >= T_RBC1 ? 1 : 0) + (t >= T_RBC2 ? 1 : 0) + Math.floor(9610 * ph(t, 25.1, 26.95, x => x * x));
const PLT_N = t => (t >= T_PLTC ? 1 : 0) + Math.floor(502 * ph(t, 25.1, 26.95, x => x * x));
// x on the scope of an event at time te (for tags that point at a pulse)
const scopeX = (t, te) => SCOPE[2] - 2 - (t - te) / impWin(t) * (SCOPE[2] - SCOPE[0] - 4);
const scopeY = v => SCOPE[3] - 10 - v * (SCOPE[3] - SCOPE[1] - 20) / 1.25;
const IONI = once(() => { const c = impCam(12.0); let bi = 0, bd = Infinity; for (let i = 0; i < 30; i += 2) { const [x, y] = ionPos(i, 12.0, []); const d = Math.abs(c.x(x) - 150) + Math.abs(c.y(y) - 300) * 0.6; if (d < bd) { bd = d; bi = i; } } return bi; });
function impScene(t) {
  const cam = W_imp(t);
  // HUD: the voltage trace (scope), the counters, later the size histogram
  const hud = ph(t, 14.9, 15.25);
  if (hud > 0) withDither(hud, () => {
    scope(SCOPE[0], SCOPE[1], SCOPE[2], SCOPE[3], IMP_PARTS, t, { win: impWin(t), max: 1.25, label: true });
    counter(24, 462, 'RBC', RBC_N(t), P.RB3, 2, Math.max(hlt(t, T_RBC1), hlt(t, T_RBC2)));
    if (t >= 23.0) counter(152, 462, 'PLT', PLT_N(t), P.PL3, 2, hlt(t, T_PLTC));
  });
  const hh = ph(t, 25.35, 25.6);
  if (hh > 0) withDither(hh, () => sizeHist(20, 372, 290, 446, Math.floor(700 * ph(t, 25.5, 26.9, lin)), t, { labels: true }));
  // tags
  tag('ELECTRODE  +', cam.x(-IMP.ex), cam.y(40), 24, 404, 11.1, 12.15, t, P.AL3);
  tag('ELECTRODE  -', cam.x(IMP.ex), cam.y(40), 160, 444, 11.25, 12.15, t, P.AL3);
  { const [x, y] = ionPos(IONI(), t, []); tag('IONS CARRY THE CURRENT', cam.x(x), cam.y(y), 60, 220, 11.55, 12.75, t, P.EC3); }
  tag('APERTURE', cam.x(0), cam.y(-IMP.ah - 3), 196, 214, 13.35, 14.95, t, P.YEL);
  tag('SHEATH FLOW', cam.x(-64), cam.y(26), 24, 420, 13.8, 14.95, t, P.EC3);
  tag('RED CELL', cam.x(trajX(RBC1.keys, t)), cam.y(-R_RBC), 40, 250, 15.35, 17.3, t, P.RB3);
  tag('NO CELL INSIDE → FLAT', 200, SCOPE[3] - 11, 90, 186, 16.3, 18.6, t, P.SG2);
  if (t > 19.8 && t < 21.0) tag('VOLTAGE RISES', scopeX(t, Math.min(t, bt(40))), scopeY(1) - 1, 150, 186, 19.85, 20.95, t, P.SG2);
  tag('COUNT +1', 98, 462, 120, 420, 21.9, 22.95, t, P.RB3);
  tag('PLATELET: SMALL PULSE', scopeX(t, bt(46)), scopeY(0.2), 24, 186, 23.5, 24.4, t, P.PL3);
  tag('RED CELL: BIG PULSE', scopeX(t, bt(48)), scopeY(1), 110, 186, 24.5, 25.4, t, P.RB3);
}

// ============================================================================ D: HEMOGLOBIN (27–32)
const hgbCam = t => new Cam(0, 0, 1.0 * (1 + 0.1 * ph(t, 27.0, 29.3, lin)) * (1 - 0.28 * xf(t, 29.0, 29.4)), 165, 320);
const hgbK = t => ph(t, 27.3, 28.8, lin);
function W_hgb(t) { const cam = hgbCam(t); hgbLysis(cam, t, hgbK(t)); return cam; }
const SLSI = once(() => nearestIdx(HG_SLS, s => [s.x, s.y], -70, 70));
function s15(t) {
  const cam = W_hgb(t), z = cam.z;
  const s_ = HG_SLS[SLSI()];
  tag('SLS DETERGENT', cam.x(s_.x + 10 * Math.sin(t * 0.8 + s_.ph)), cam.y(s_.y + 8 * Math.cos(t * 0.7 + s_.ph)), 24, 440, 27.3, 28.3, t, P.LY2);
  const c = HG_RBC[4], out = smooth(clamp((hgbK(t) - 0.35) / 0.35, 0, 1)), a = c.ph + 0.3, d = (6 + out * 40) * z;
  tag('HEMOGLOBIN', cam.x(c.x) + Math.cos(a) * d, cam.y(c.y) + Math.sin(a) * d, 170, 250, 27.95, 28.95, t, P.HB3);
}
const photCam = t => camTrack([[29.0, -46, -14, 2.4], [29.5, -64, -14, 1.9, eout], [31.3, 72, -14, 1.9, K50]], t, 165, 340);
function W_phot(t) { const cam = photCam(t); photometer(cam, t, { on: 1, absorb: 1, reading: 0 }); return cam; }
const T_HGB = bt(61);
function hgbReadout(t) {
  const a = ph(t, T_HGB - 0.1, T_HGB + 0.1); if (a <= 0) return;
  withDither(a, () => {
    rect(24, 100, 252, 138, P.DS0); frame(24, 100, 252, 138, P.HB2);
    text(FS, 'HGB', 34, 108, { sc: 2, c: P.HB3, ol: null });
    text(FC, EX.hgb + ' g/dL', 74, 105, { sc: 2, c: P.INK, ol: null, n: (t - T_HGB) * 30 });
  });
}
function s16(t) {
  const cam = W_phot(t);
  if (t < 29.4) crossWorld(() => W_hgb(t), 1 - xf(t, 29.0, 29.4));
  tag('LED', cam.x(-120), cam.y(-13), 40, 196, 29.4, 30.4, t, P.LG2);
  tag('SLS-HB ABSORBS LIGHT', cam.x(-8), cam.y(-40), 40, 170, 29.75, 30.95, t, P.HB3);
  tag('PHOTOSENSOR', cam.x(128), cam.y(-13), 150, 186, 30.55, 31.95, t, P.PD4);
  hgbReadout(t);
}

// ============================================================================ E: WHITE CELLS (32–45)
const wfx = t => lerp(-40, 70, K50(seg(t, 31.7, 34.4)));
const wbcCam = t => new Cam(wfx(t) + 4 * (1 - xf(t, 35.8, 36.3)), 0, 1.45 * (1 + 0.9 * ein(seg(t, 35.8, 36.3))), 165, 330);
function W_wbc(t) { const cam = wbcCam(t); wbcChamber(cam, t, { lyse: ph(t, 34.3, 35.7, lin), follow: wfx(t), ring: ph(t, 32.2, 32.5) * (1 - ph(t, 35.8, 36.0)), dye: 0 }); return cam; }
function s17(t) {
  const cam = W_wbc(t);
  tag('WHITE CELL', cam.x(wfx(t)), cam.y(-R_WBC * 1.55), 40, 186, 32.3, 33.95, t, P.WB3);
}
const BURSTI = once(() => nearestIdx(WBC_S.cells, c => c.k === 'rbc' ? cellPos(c, WBC_S, 34.6, 12) : null, 70 + 64, -80));
function s18(t) {
  const cam = W_wbc(t);
  const c = WBC_S.cells[BURSTI()], [x, y] = cellPos(c, WBC_S, t, 12);
  tag('RED CELLS BURST', cam.x(x), cam.y(y), 150, 170, 34.75, 35.9, t, P.RB3);
  tag('WHITE CELL STAYS', cam.x(wfx(t)), cam.y(R_WBC * 1.5), 60, 450, 35.05, 35.95, t, P.WB3);
}
const stainCam = t => new Cam(8 * ph(t, 36.2, 38.0, lin), 0, 1.0 * zin(t, 35.95, 36.6, 0.6) * (1 + 0.16 * ph(t, 36.2, 38.0, lin)) * (1 - 0.3 * xf(t, 38.0, 38.4)), 165, 320);
const stainK = t => ph(t, 36.3, 37.9, lin);
function W_stain(t) { const cam = stainCam(t); stainCut(cam, t, stainK(t)); return cam; }
function s19(t) {
  if (t < 36.35) { W_wbc(t); crossWorld(() => W_stain(t), xf(t, 35.95, 36.35)); } else W_stain(t);
  const cam = stainCam(t), k = stainK(t);
  const [dx, dy] = dyePos(4, k, t); tag('DYE', cam.x(dx), cam.y(dy), 200, 470, 36.4, 37.3, t, P.DY1);
  tag('DNA', cam.x(STAIN_LOBES[1][0]), cam.y(STAIN_LOBES[1][1] - 24), 120, 150, 36.9, 37.95, t, P.NU3);
  const [rx, ry] = rnaPos(3); tag('RNA', cam.x(rx), cam.y(ry), 40, 470, 37.15, 37.95, t, P.NU2);
}
// the flow cell: one path for the followed white cell (slow-motion in the beam from 42.66 to 48.4)
const T_CROSS = bt(84);
function cellYF(t) {
  if (t <= T_CROSS) return 52 * (T_CROSS - t);
  if (t <= 48.4) return -6 * eout(seg(t, T_CROSS, 45.5)) - 2 * seg(t, 45.5, 48.4);
  return -8 - 340 * ein(seg(t, 48.4, 49.4));
}
const flowCam = t => camTrack([[38.0, 0, 236, 3.0], [38.25, 0, 236, 3.0], [39.8, -12, 30, 0.92, K75], [45.0, -12, 32, 0.95, lin], [48.0, -14, 34, 0.96, lin], [49.6, -66, 100, 1.25, K50]], t, 165, 320);
const T_P1 = 48.62, T_P2 = 49.75, T_P3 = 50.45;
const EXTRA = t => [{ y: 150 * (T_P2 - t), kind: 'lymph', ph: 1.3, s: 0.72 }, { y: 150 * (T_P3 - t), kind: 'mono', ph: 2.1, s: 0.85 }];
function W_flow(t) {
  const cam = flowCam(t), cy = cellYF(t), held = t > T_CROSS && t < 48.4;
  const lit = held ? 1 : Math.max(0, 1 - Math.abs(cy) / 14);
  flowCell(cam, t, { focus: lerp(0.15, 1, ph(t, 38.4, 40.2)), cellY: cy, laser: 1, show: { fs: 1, ss: 1, fl: 1 }, detect: lit, fluor: lit, light: lit, paths: t > 45.0, extra: t > 48.4 ? EXTRA(t) : null });
  return cam;
}
const FL_EV = { FSC: [[T_P1, 0.75], [T_P2, 0.45], [T_P3, 0.6]], SSC: [[T_P1, 0.8], [T_P2, 0.25], [T_P3, 0.4]], SFL: [[T_P1, 0.45], [T_P2, 0.62], [T_P3, 0.85]] };
const PH_ = [[16, 92, 100, 146, 'FSC', 'SO2'], [104, 92, 188, 146, 'SSC', 'DT3'], [192, 92, 276, 146, 'SFL', 'EM2']];
function flowScene(t) {
  let cam;
  if (t < 38.4) { cam = W_flow(t); crossWorld(() => W_stain(t), 1 - xf(t, 38.0, 38.4)); }
  else cam = W_flow(t);
  const cy = cellYF(t);
  // HUD: one electrical pulse per cell on each detector
  const hud = ph(t, 48.2, 48.45);
  if (hud > 0) withDither(hud, () => PH_.forEach(([x0, y0, x1, y1, nm_, col]) => pulseHUD(x0, y0, x1, y1, t, FL_EV[nm_], P[col], nm_)));
  // tags
  tag('SHEATH FLUID', cam.x(-36), cam.y(196), 24, 380, 38.9, 40.4, t, P.EC3);
  tag('SAMPLE CORE', cam.x(1), cam.y(110), 200, 330, 39.4, 40.8, t, P.AM3);
  tag('RED LASER', cam.x(-100), cam.y(0), 24, 230, 40.1, 41.45, t, P.LZ3);
  tag('GREEN FLUORESCENCE', cam.x(-12), cam.y(cy - 12), 24, 196, 43.2, 44.95, t, P.EM2);
  tag('SCATTERED LIGHT', cam.x(52), cam.y(-5), 160, 238, 43.7, 44.95, t, P.SO2);
  tag('FORWARD SCATTER → SIZE', cam.x(44), cam.y(-5), 120, 222, 45.3, 47.95, t, P.SO2);
  tag('SIDE SCATTER → GRANULES', cam.x(-86), cam.y(112), 112, 372, 45.8, 47.95, t, P.DT3);
  tag('FLUORESCENCE → DNA+RNA', cam.x(-133), cam.y(133), 24, 452, 46.3, 47.95, t, P.EM2);
  tag('PHOTODIODES', cam.x(-86), cam.y(OPTX.ssPD[1] - 14), 140, 300, 48.55, 49.7, t, P.PD4);
  if (t > 49.85) { const [x0, y0, x1, y1] = PH_[2], px = x1 - 2 - (t - T_P2) / 1.2 * (x1 - x0); tag('ONE PULSE PER CELL', px, y1 - 5 - 0.62 * (y1 - y0 - 16), 96, 170, 49.85, 50.95, t, P.SG2); }
}

// ============================================================================ F: DATA (51–56)
function dataBG(t) {
  rect(0, 0, W, H, P.BG);
  for (let i = 0; i < 46; i++) { const x = hash(i + 8000) * 360 + 6 * Math.sin(t * 0.7 + i), y = ((hash(i + 8001) * 640 - t * 12 * (1 + hash(i + 8002))) % 640 + 640) % 640; rect(x, y, x + 2, y + 2, i % 3 ? P.DT0 : P.DT1); }
}
const wdfRect = t => { const f = ph(t, 51.0, 54.0, lin); return [lerp(26, 18, f), lerp(104, 98, f), lerp(286, 292, f), lerp(440, 450, f)]; };
const WDF_N = t => Math.floor(900 * ph(t, 51.9, 53.3, x => x * x));
function W_wdf(t) {
  dataBG(t);
  const [x0, y0, x1, y1] = wdfRect(t), g = scattergram(x0, y0, x1, y1, 'WDF', WDF_N(t), t, { colored: t > 53.0, labels: ph(t, 53.15, 53.5, lin), asc: 2 });
  // the first cell: one dot placed by its side-scatter and fluorescence pulse heights
  const a = ph(t, 51.3, 51.45) * (1 - ph(t, 52.2, 52.5));
  if (a > 0) withDither(a, () => { const px = g.px(0.6), py = g.py(0.31); dashLine(px, g.py(0) + 2, px, py, P.DT3, 3, 2, 0); dashLine(x0 + 14, py, px, py, P.EM2, 3, 2, 0); disc(px, py, 2.5, P.INK); ring(px, py, 7, 1.2, P.YEL); });
  return g;
}
function s24(t) {
  if (t < 51.4) { flowScene(t); crossWorld(() => W_wdf(t), xf(t, 51.0, 51.4)); } else W_wdf(t);
}
function diffBars(t) {
  const k = ph(t, 54.95, 55.75); if (k <= 0) return;
  const cols = [P.GNE, P.GLY, P.GMO, P.GEO, P.GBA];
  label('WDF + WNR = 5-PART DIFF', 24, 306, 54.9, 56.0, t, P.INK);
  EX.diff.forEach(([nm_, pct], i) => {
    const y = 330 + i * 18, kk = clamp(k * 1.6 - i * 0.15, 0, 1); if (kk <= 0) return;
    text(FS, nm_, 24, y, { sc: 2, c: cols[i], ol: null });
    rect(84, y + 1, 84 + Math.max(2, 150 * pct / 60 * kk), y + 9, cols[i]);
    text(FS, (pct * kk).toFixed(1) + '%', 290, y, { sc: 2, c: P.INK, ol: null, align: 'right' });
  });
}
function s25(t) {
  dataBG(t);
  const f = ph(t, 54.0, 54.5, K75), R0 = wdfRect(54.0), R1 = [16, 112, 150, 290];
  scattergram(lerp(R0[0], R1[0], f), lerp(R0[1], R1[1], f), lerp(R0[2], R1[2], f), lerp(R0[3], R1[3], f), 'WDF', 900, t, { colored: true, labels: 1, lsc: f > 0.5 ? 1 : 2, asc: f > 0.5 ? 1 : 2 });
  const g = ph(t, 54.15, 54.6, K75), ox = (1 - g) * 220;
  if (g > 0) {
    const gw = scattergram(158 + ox, 112, 292 + ox, 290, 'WNR', Math.floor(600 * ph(t, 54.5, 55.2, lin)), t, { colored: t > 55.0, labels: ph(t, 55.1, 55.4, lin), lsc: 1 });
    // the basophils: the group this channel adds, ringed
    const rk = ph(t, 55.15, 55.45); if (rk > 0) withDither(rk, () => ring(gw.px(0.52), gw.py(0.72), 10, 1.5, P.GBA));
  }
  // acquisition sweep while the WNR events arrive
  const sw = seg(t, 54.45, 55.25); if (sw > 0 && sw < 1) { const x = lerp(172, 288, sw); rect(x, 116, x + 2, 274, P.DT3, 0.8); rect(x - 10, 116, x, 274, P.DT1, 0.25); }
  diffBars(t);
}

// ============================================================================ G: RESULTS AND LOOP (56–65)
const procCam = t => camTrack([[56.0, 0, 10, 1.6], [56.25, 0, 10, 1.6], [56.95, 0, -40, 0.92, K75], [58.3, 0, -36, 0.96, lin]], t, 160, 310);
function W_proc(t) { const cam = procCam(t); dataMerge(cam, t, ph(t, 56.3, 57.7, lin)); return cam; }
const repCam = t => new Cam(105 + 3 * ph(t, 57.95, 60, lin), 292, 2.3 * zin(t, 57.9, 58.5, 0.85));
const REP0 = bt(114.5), REPD = BEAT / 2;
const repO = t => ({ rows: clamp((t - REP0) / REPD, 0, 5), checks: ph(t, 59.35, 59.8, lin), qc: ph(t, 59.55, 59.95, lin) });
function W_report(t) { labScene(repCam(t), t, { pierce: 1, draw: 1, busy: 0, screen: (a, b, c, d) => reportUI(a, b, c, d, t, Object.assign({ sc: 2 }, repO(t))) }); }
function s26(t) {
  if (t < 56.4) { s25(t); crossWorld(() => W_proc(t), xf(t, 56.0, 56.4)); }
  else if (t < 57.95) W_proc(t);
  else { W_report(t); if (t < 58.35) crossWorld(() => W_proc(t), 1 - xf(t, 57.95, 58.35)); }
}
const endCam = t => camTrack([[60.0, 108, 292, 2.3], [60.9, 182, 342, 0.98, K75], [62.9, 182, 342, 0.98], [64.6, HOOK[0], HOOK[1], HOOK[2], K75]], t);
const T_TILE = i => bt(120 + i);
function s27(t) {
  const cam = endCam(t), pierce = 1 - ph(t, 63.1, 63.8), draw = 1 - ph(t, 63.1, 63.4);
  const scr = t < 63.0 ? (a, b, c, d) => reportUI(a, b, c, d, t, { rows: 5, checks: 1, qc: 1 }) : (a, b, c, d) => resultUI(a, b, c, d, t, { k: 0 });
  labScene(cam, t, { pierce, draw, busy: 0, screen: scr });
  const a = ph(t, 60.7, 61.0) * (1 - ph(t, 62.8, 63.1));
  if (a > 0) {
    tintAll(P.K0, 0.5 * a);
    RECAP.forEach((f, i) => {
      const k = ph(t, T_TILE(i), T_TILE(i) + 0.2) * (1 - ph(t, 62.8 + i * 0.05, 63.05 + i * 0.05)); if (k <= 0) return;
      withDither(k, () => f(84 + (i % 2) * 138, 214 + Math.floor(i / 2) * 106 + (1 - k) * 12, t));
    });
  }
}

// ============================================================================ dispatcher
const SCN_FN = [s01, s02, s03, s04, s05, s06, s07, impScene, impScene, impScene, impScene, impScene, impScene, impScene,
  s15, s16, s17, s18, s19, flowScene, flowScene, flowScene, flowScene, s24, s25, s26, s27];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  SCN_FN[sceneIndex(t)](t);
  overlays(t);
}
function engineInit() { }
