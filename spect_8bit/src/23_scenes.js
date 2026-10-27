'use strict';
// ============================================================================
// SCENE COMPOSITOR: 27 scenes on the music grid (SC_T), one continuous journey
// that follows one tracer, one photon, one flash, one electron, one pulse and
// one count, then many counts, many angles and one image. Worlds join through
// lens portals (the next scale opens inside a growing circle where the camera
// dives), vertical scrolls (the photon rises out of the body into the head)
// and short dithered dissolves.
// ============================================================================
const LENS_R = 420;
function lensComposite(drawInner, cx, cy, r) {
  if (r <= 0.5) return;
  if (r >= LENS_R) { drawInner(); return; }
  withBuffer(FEEDBUF, drawInner);
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, h = r * r - dy * dy; if (h < 0) continue;
    const s = Math.sqrt(h), a = Math.max(0, Math.ceil(cx - s - 0.5)), b = Math.min(W - 1, Math.floor(cx + s - 0.5));
    for (let x = a; x <= b; x++) buf[y * W + x] = FEEDBUF[y * W + x];
  }
  ring(cx, cy, r + 1, 2, P.C4); ring(cx, cy, r + 3, 1, P.SUB, 0.5);
}
const lensIn = (t, a, b) => LENS_R * ein(seg(t, a, b));
const lensOut = (t, a, b) => LENS_R * ein(1 - seg(t, a, b));
// draw another world into TMPBUF and keep only the rows from yLine down (the lower world)
function lowerWorld(drawLower, yLine) {
  yLine = Math.max(0, Math.min(H, Math.round(yLine))); if (yLine >= H) return;
  withBuffer(TMPBUF, drawLower);
  buf.set(TMPBUF.subarray(yLine * W), yLine * W);
}
// dithered dissolve to another world (k 0..1)
function dissolveWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (bay(x, y) < k) buf[i] = TMPBUF[i]; }
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
// ============================================================================ S01-S02: the hook
const HERO_B = [70, 80];                                  // the tracer we follow, in the body world (LV lateral wall)
const T_EMIT = 1.10, PH_DIR = [Math.cos(-1.38), Math.sin(-1.38)], PH_V = 470;
function photonBody(t) { const d = Math.max(0, t - T_EMIT) * PH_V; return [HERO_B[0] + PH_DIR[0] * d, HERO_B[1] + PH_DIR[1] * d, d]; }
function bodyWorld(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  drawTorso(cam, t);
  drawHeart(cam, 20, 40, 1, t, { tracer: 1, beat: Math.max(0, Math.sin(t * TAU * 1.1)) });
  const hx = cam.x(HERO_B[0]), hy = cam.y(HERO_B[1]);
  if (t < T_EMIT + 0.4) tracerDot(hx, hy, Math.max(2, 4.5 * cam.z), 0.85 + 0.15 * Math.sin(t * 9), true);
  const fl = pulse(t, T_EMIT, 0.4);
  if (fl > 0) { flash(hx, hy, (8 + 12 * fl) * Math.min(2.4, cam.z), fl, [P.GA1, P.GA2, P.GA3, P.GA4]); }
  if (o.photon !== false && t >= T_EMIT) { const [px, py, d] = photonBody(t); gammaWave(cam.x(px), cam.y(py), Math.atan2(PH_DIR[1], PH_DIR[0]), Math.min(150, d * cam.z), t, {}); }
}
function bodyCamHook(t) {
  if (t < 1.0) return new Cam(HERO_B[0] - 30, HERO_B[1] - 30, lerp(0.55, 1.5, ph(t, 0.55, 1.0, eout)), CX, CY);
  if (t < 1.18) return new Cam(lerp(HERO_B[0] - 30, HERO_B[0], ph(t, 1.0, 1.18)), lerp(HERO_B[1] - 30, HERO_B[1], ph(t, 1.0, 1.18)), lerp(1.5, 2.2, ph(t, 1.0, 1.18)), CX, CY);
  const [px, py] = photonBody(t), k = ph(t, 1.18, 1.5);
  // keep the photon at screen (180, 330): the camera rises with it
  const z = lerp(2.2, 1.6, ph(t, 1.18, 1.75));
  return new Cam(lerp(HERO_B[0], px, k), lerp(HERO_B[1], py - 10 / z, k), z, CX, CY);
}
// the head world during the hook: the photon rises through channel 5, flashes in the crystal
const HK = { x: 179, y0: 700, yFace: DH.face, yTop: DH.col0, yHit: 450, tFace: 2.15, tTop: 2.72, tHit: 2.833 };
function hookPhotonY(t) {
  if (t < HK.tFace) return lerp(HK.y0 + 60, HK.yFace, seg(t, 1.66, HK.tFace));
  if (t < HK.tTop) return lerp(HK.yFace, HK.yTop, seg(t, HK.tFace, HK.tTop));
  return lerp(HK.yTop, HK.yHit, seg(t, HK.tTop, HK.tHit));
}
function headCamHook(t) {
  const py = hookPhotonY(t);
  if (t < HK.tHit) return new Cam(HK.x, py - 6, 1.7, CX, CY);
  return camTrack([[HK.tHit, HK.x, HK.yHit - 6, 1.7], [3.3, 180, 392, 1.0]], t);
}
const HOOK_L = PMX.map(x => Math.exp(-((x - HK.x) ** 2) / (2 * 55 * 55)));
function hookHead(cam, t) {
  const env = ph(t, 2.86, 3.02) * (1 - 0.6 * ph(t, 3.3, 3.95));
  drawHead2(cam, t, { light: HOOK_L.map(v => v * env), flash: t > HK.tHit ? [HK.x, HK.yHit, pulse(t, HK.tHit, 0.9)] : null, rays: t > 2.86 && t < 3.6, lit: t > HK.tFace && t < HK.tHit ? CHAN.map((_, k) => k === 5 ? 1 : 0) : null });
  if (t < HK.tHit) gammaH(cam, HK.x, hookPhotonY(t), -Math.PI / 2, 90, t);
  // stylised cascade inside the brightest tube, then the pulse leaving the board
  const e = ph(t, 3.0, 3.26);
  if (e > 0 && t < 3.5) { const x = cam.x(180), y0 = cam.y(DH.pmBot - 8), y1 = cam.y(DH.pmTop + 6); for (let k = 0; k < 9; k++) { const tx = x + (k - 4) * 3 * cam.z, yy = lerp(y0, y1, e); line(x, y0, tx, yy, k % 2 ? P.EL2 : P.EL3); } glow(x, lerp(y0, y1, e), 10, P.EL1, P.EL2, 0.8); }
  if (t > 3.26 && t < 3.6) { const k = seg(t, 3.26, 3.5); pulseGlyph(lerp(cam.x(180), 300, k), lerp(cam.y(DH.brd0 - 8), 128, k), 1); }
}
// a small green electrical pulse glyph
function pulseGlyph(x, y, s) {
  const pts = [x - 14 * s, y, x - 6 * s, y, x - 3 * s, y - 12 * s, x, y + 5 * s, x + 3 * s, y - 2 * s, x + 14 * s, y];
  for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 3, P.SG1);
  polyline(pts, P.SG2); glow(x - 3 * s, y - 12 * s, 6, P.SG1, P.SG3, 0.7);
}
// the projection preview (top right) with counts arriving
function hookPreview(t) {
  const k = pop(t, 3.36, 0.4); if (k <= 0) return;
  const s = Math.round(84 * k), x0 = 296 - s / 2, y0 = 128 - s / 2;
  rect(x0 - 4, y0 - 4, x0 + s + 4, y0 + s + 4, P.K0); frame(x0 - 4, y0 - 4, x0 + s + 4, y0 + s + 4, P.PJ3);
  const N = t < 3.42 ? 1 : Math.floor(1 + 3500 * Math.pow(seg(t, 3.42, 4.0), 2));
  const img = countsAfter(N); let mx = 1; for (let i = 0; i < img.length; i++) mx = Math.max(mx, img[i]);
  drawValueImage(img, MD.n, x0, y0, s, s, RAMP_PJ(), N < 30 ? 1 : mx * 0.9, { nearest: true, dith: 0 });
  if (N < 6) { const p = MODEL.evPix, i = p % MD.n, j = Math.floor(p / MD.n), cs = s / MD.n; rect(x0 + i * cs - 1, y0 + j * cs - 1, x0 + (i + 1) * cs + 1, y0 + (j + 1) * cs + 1, P.C6); }
}
function s01(t) {
  const camA = camTrack([[0, 180, 272, 1], [0.40, 180, 272, 1.02], [0.98, CHEST2[0], CHEST2[1], 3.4]], t);
  if (t < 1.0) {
    drawScanner(camA, t, { heartGlow: ph(t, 0.25, 0.6) });
    if (t > 0.55) lensComposite(() => bodyWorld(bodyCamHook(t), t), camA.x(CHEST2[0]), camA.y(CHEST2[1]), lensIn(t, 0.55, 0.96));
    return;
  }
  if (t < 1.66) { const cam = bodyCamHook(t); bodyWorld(cam, t); if (t > 1.16) tag('Tc-99m TRACER', cam.x(HERO_B[0]), cam.y(HERO_B[1]), 40, 420, 1.16, 1.62, t, P.OR3); return; }
  hookSplit(t);
}
// the photon rises out of the chest into the detector head (shared by the end of s01 and the start of s02)
function hookSplit(t) {
  const camH = headCamHook(t);
  hookHead(camH, t);
  const yF = camH.y(DH.face);
  if (yF < H) {
    // the body world below the head's face, moving down with the same rise; the photon is drawn by the head world
    const sy = camH.y(hookPhotonY(t)), [px, py] = photonBody(Math.min(t, 1.66)), z = 1.6;
    const camB = new Cam(px, py + (CY - sy) / z - (hookPhotonY(Math.min(t, 1.66)) - hookPhotonY(t)) * 0 , z, CX, CY);
    camB.cy = py - (sy - CY) / z;
    lowerWorld(() => { bodyWorld(camB, t, { photon: false }); rect(0, 0, W, 3, P.K0); }, yF + 1);
    rect(0, yF, W, yF + 2, P.PB1);
    if (sy > yF) gammaWave(camH.x(HK.x), sy, -Math.PI / 2, 90 * camH.z, t, {});
  }
}
function s02(t) {
  if (t < 2.16) { hookSplit(t); return; }
  const cam = headCamHook(t); hookHead(cam, t);
  hookPreview(t);
  if (t > 2.2 && t < 2.8) tag('LEAD COLLIMATOR', cam.x(SEPT[6]), cam.y(530), 196, 450, 2.2, 2.78, t, P.PB5);
  if (t > 2.85) tag('NaI(Tl) CRYSTAL', cam.x(250), cam.y(446), 196, 470, 2.88, 3.9, t, P.CR4);
  if (t > 3.0) tag('PMTs', cam.x(240), cam.y(350), 250, 300, 3.05, 3.9, t, P.PM5);
  if (t > 3.4) label('1 EVENT', 290, 70, 3.42, 3.62, t, P.PJ4, 'center');
  if (t > 3.62) label('MANY EVENTS', 278, 70, 3.62, 3.96, t, P.PJ4, 'center');
}
// ============================================================================ S03: the tracer
function tracerCam(t) { return camTrack([[4.014, -66, -140, 2.25], [5.35, -40, -30, 0.95]], t); }
function heroArmPos(t) {
  // the hero molecule: in the syringe barrel, pushed into the cannula, then up the vein
  const tip = [IV.pos[0] + 36, IV.pos[1] - 2];
  if (t < 5.0) { const k = ph(t, 4.55, 5.0); const ca = Math.cos(-0.62), sa = Math.sin(-0.62); return [tip[0] + ca * lerp(70, 6, k), tip[1] + sa * lerp(70, 6, k)]; }
  const u = IV.u + (t - 5.0) * 0.26, c = armAt(Math.min(1, u)); return [c[0], c[1] - c[2] * 0.15 + 4 * Math.sin(u * 7)];
}
function tracerWorld(cam, t) {
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.5);
  drawVial(cam, -70, -176, 1, t, { glow: 1 });
  drawArm(cam, t, { flow: t > 5.0 ? IV.u + (t - 5.0) * 0.26 : 0 });
  drawSyringe(cam, IV.pos[0] + 36, IV.pos[1] - 2, -0.62, ph(t, 4.55, 5.3), t);
  const [hx, hy] = heroArmPos(t); tracerDot(cam.x(hx), cam.y(hy), Math.max(2, 3.6 * cam.z), 0.9, true);
}
function s03(t) {
  const cam = tracerCam(t);
  if (t < 4.18) { const k = seg(t, 4.014, 4.18); s02(4.0); dissolveWorld(() => tracerWorld(cam, t), k); return; }
  tracerWorld(cam, t);
  const [hx, hy] = heroArmPos(t);
  if (t > 4.75) tag('ONE MOLECULE', cam.x(hx), cam.y(hy), 150, 330, 4.75, 5.6, t, P.OR3);
  if (t > 5.52) { const camV = vesselCam(t); lensComposite(() => vesselWorld(camV, t), cam.x(hx), cam.y(hy), lensIn(t, 5.55, 5.96)); }
}
// ============================================================================ S04: blood
function heroVessel(t) { return [(t - 5.6) * 210, -12 + 16 * Math.sin(t * 1.7)]; }
function vesselCam(t) { const [hx, hy] = heroVessel(t); return new Cam(hx + 30, hy * 0.5, lerp(1.35, 1.0, ph(t, 5.6, 6.4)), CX, CY); }
function vesselWorld(cam, t) { drawVessel(cam, t, { flow: t * 95, hero: heroVessel(t) }); }
function s04(t) {
  const cam = vesselCam(t);
  if (t < 5.96) { s03(t); return; }
  vesselWorld(cam, t);
  const [hx, hy] = heroVessel(t);
  if (t < 7.2) tag('RED BLOOD CELLS', 90, 470, 30, 500 - 30, 6.3, 7.15, t, P.RB4);
  tag('TRACER', cam.x(hx), cam.y(hy), 200, 200, 6.1, 7.6, t, P.OR3);
  if (t > 7.4) { label('TO THE HEART', 278, 312, 7.45, 7.98, t, P.SUB, 'center'); const k = (t * 3) % 1; arrowHead(330 + 8 * k, 330, 0, 8, P.SUB); }
  if (t > 7.85) dissolveWorld(() => myoWorld(myoCam(t), t), seg(t, 7.85, 8.08));
}
// ============================================================================ S05: uptake
const MYO_IN = 8.55, MYO_OUT = 9.1, MITO = [-44, -112];
function heroMyo(t) {
  if (t < MYO_IN) { const x = lerp(-260, 0, seg(t, 7.85, MYO_IN)); return [x, capY(x)]; }
  if (t < MYO_OUT) { const k = ph(t, MYO_IN, MYO_OUT); return [lerp(0, MITO[0], k), lerp(capY(0), MITO[1], k)]; }
  return [MITO[0] + 3 * Math.sin(t * 3), MITO[1] + 2 * Math.cos(t * 2.6)];
}
function myoCam(t) { return camTrack([[7.85, -150, -40, 0.95], [MYO_IN, -60, -40, 1.0], [10.6, -30, -60, 1.3]], t); }
function myoWorld(cam, t) {
  drawMyocardium(cam, t, { acc: ph(t, 9.0, 11.0), hero: heroMyo(t) });
}
function s05(t) {
  if (t < 8.08) { s04(t); return; }
  const cam = myoCam(t); myoWorld(cam, t);
  const [hx, hy] = heroMyo(t);
  tag('CAPILLARY', cam.x(40), cam.y(capY(40)) + 18, 196, 430, 8.15, 9.0, t, P.MY7);
  tag('HEART MUSCLE CELL', cam.x(-140), cam.y(-210), 30, 120, 9.05, 10.0, t, P.MY6);
  // magnifier on a mitochondrion
  const r = 66 * pop(t, 9.45, 0.5);
  if (r > 2) {
    const mx = 262, my = 214;
    dashLine(cam.x(hx), cam.y(hy), mx - r * 0.7, my + r * 0.7, P.LBL, 3, 3, -t * 20);
    mitoInset(mx, my, r, t, ph(t, 9.6, 10.9));
    tag('MITOCHONDRIA', mx - r * 0.5, my + r * 0.75, 150, 318, 9.9, 11.0, t, P.OR3);
  }
}
// ============================================================================ S06: dive into one Tc-99m nucleus
const NUC_C = [180, 236], NUC_BR = 22;
function s06(t) {
  if (t < 11.42) {
    const cam0 = myoCam(t), z = lerp(1.3, 6, ph(t, 11.1, 11.42, ein)), [hx, hy] = heroMyo(t);
    const cam = new Cam(lerp(cam0.cx, hx, ph(t, 11.1, 11.3)), lerp(cam0.cy, hy, ph(t, 11.1, 11.3)), z, CX, CY);
    myoWorld(cam, t);
    if (t > 11.2) lensComposite(() => moleculeWorld(t), cam.x(hx), cam.y(hy), lensIn(t, 11.2, 11.42));
    return;
  }
  moleculeWorld(t);
  if (t > 12.36) {
    const k = pop(t, 12.45, 0.4);
    label('43 PROTONS', NUC_C[0] - 80, NUC_C[1] + 104, 12.4, 12.98, t, P.PR3, 'center');
    label('56 NEUTRONS', NUC_C[0] + 80, NUC_C[1] + 104, 12.5, 12.98, t, P.NE3, 'center');
    label('= 99 NUCLEONS', NUC_C[0], NUC_C[1] + 122, 12.62, 12.98, t, P.INK, 'center');
    void k;
  }
}
// the molecule -> atom -> nucleus zoom (all centred on NUC_C)
function moleculeWorld(t) {
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const [cx, cy] = NUC_C;
  const sMol = lerp(14, 70, ph(t, 11.2, 11.62, eout)) * Math.exp(Math.max(0, t - 11.62) * 5.5);
  // the Tc atom at the centre hands over to the atom view: its ball stops growing and fades as the shells appear
  if (sMol < 900) drawSestamibi(cx, cy, sMol, 0.6 + t * 0.4, t, 46 * (1 - ph(t, 11.7, 11.95)));
  const kA = ph(t, 11.6, 11.85), RA = lerp(50, 150, ph(t, 11.6, 11.95)) * Math.exp(Math.max(0, t - 11.95) * 5);
  if (kA > 0 && RA < 1400) drawAtomShells(cx, cy, RA, t, kA * (1 - ph(t, 12.2, 12.4)));
  const br = lerp(1.5, NUC_BR, ph(t, 11.9, 12.36, eout));
  if (t > 11.88) drawNucleus(cx, cy, br, t * 0.25, t, { ex: 0.9 });
  if (t > 12.5) levelDiagram(124 - 260 * (1 - ph(t, 12.5, 12.85, eout)), 404, 96, 0, t, {});
}
// ============================================================================ S07: gamma emission
const T_DROP0 = 13.7, T_GAMMA = 14.17;
function photonNuc(t) { return NUC_C[1] - 104 - Math.max(0, t - T_GAMMA) * 96; }
function s07(t) {
  const lift = ph(t, 15.45, 16.06, ein) * 150;            // the view starts to rise with the photon
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const cy = NUC_C[1] + lift;
  drawNucleus(NUC_C[0], cy, NUC_BR, t * 0.25, t, { ex: t < T_GAMMA ? 0.9 : Math.max(0, 0.9 - (t - T_GAMMA) * 3) });
  const k = ph(t, T_DROP0, T_GAMMA, ein);
  levelDiagram(124, 404 + lift, 96, k + (t >= T_GAMMA ? 1 : 0), t, {});
  const fl = pulse(t, T_GAMMA, 0.5);
  if (fl > 0) { ring(NUC_C[0], cy, 90 + 60 * (1 - fl), 2, P.GA3, fl); flash(NUC_C[0], cy - 80, 14 * fl + 4, fl, [P.GA1, P.GA2, P.GA3, P.GA4]); }
  if (t >= T_GAMMA) { const py = photonNuc(t) + lift; gammaWave(NUC_C[0], py, -Math.PI / 2, Math.min(130, (t - T_GAMMA) * 260), t, { amp: 9, wl: 26, w: 6, hs: 11 }); }
  if (t > 14.45) { const s = 'Tc-99m → Tc-99 + γ'; text(FC, s, CX, 352 + lift, { sc: 2, c: P.INK, ol: P.SH, shadow: P.SH, sd: 2, align: 'center', n: (t - 14.45) * 30 }); }
  if (t > 14.9) label('STILL TECHNETIUM', CX, 376 + lift, 14.9, 15.95, t, P.SUB, 'center');
}
// ============================================================================ S08: through atoms into tissue
function atomField(cx, cy, z, t, k) {
  if (k <= 0 || z < 0.06) return;
  const S = 120, i0 = Math.floor(cx - CX / z) / S - 2, i1 = (cx + CX / z) / S + 2, j0 = (cy - CY / z) / S - 2, j1 = (cy + CY / z) / S + 2;
  for (let i = Math.floor(i0); i <= i1; i++) for (let j = Math.floor(j0); j <= j1; j++) {
    const wx = i * S + (hash2(i, j) - 0.5) * 70, wy = j * S + (hash2(i + 9, j) - 0.5) * 70;
    const x = CX + (wx - cx) * z, y = CY + (wy - cy) * z, r = 34 * z;
    if (x < -r || x > W + r || y < -r || y > H + r) continue;
    ring(x, y, r, 1, P.N5, 0.6 * k); ring(x, y, r * 0.55, 1, P.N4, 0.6 * k); disc(x, y, Math.max(1, 3 * z), P.N6, k);
    if (r > 6) { const a = t * 2 + i * 1.7 + j; disc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(1, 1.5 * z), P.EL1, k); }
  }
}
function s08(t) {
  const tau = t - SC_T[7], rise = tau * 330;              // the world drifts down as the camera rides with the photon
  const za = lerp(1.0, 0.1, ph(t, 16.06, 16.95, eout));
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const kT = seg(t, 16.75, 17.2);
  if (kT < 1) atomField(0, -rise / za * 0.4, za, t, 1 - kT);
  if (kT > 0) { const zm = lerp(4.2, 1.1, ph(t, 16.75, 17.94, eout)); dissolveWorld(() => { drawMuscle(new Cam(0, -rise * 0.9, zm, CX, CY), t, { ang: -1.2, pitch: 54 }); rect(0, 0, W, H, P.K0, 0.35); }, kT); }
  gammaWave(CX, 300, -Math.PI / 2, 130, t, { amp: 8, wl: 24, w: 5, hs: 10 });
  if (t > 17.25) tag('HEART TISSUE', 70, 470, 24, 430, 17.3, 17.9, t, P.MY6);
}
// ============================================================================ S09: three possible fates in tissue
const LANE = [-116, 0, 116];
function laneWorld(cam, t) {
  drawMuscle(cam, t, { ang: -1.2, pitch: 54 });
  rect(0, 0, W, H, P.K0, 0.45);
  for (const x of [-58, 58]) { const sx = Math.round(cam.x(x)); for (let y = 92; y < H; y += 2) pset(sx, y, P.C4); }
}
function s09(t) {
  const cam = new Cam(lerp(5, -5, ph(t, 17.94, 20.07)), -laneRise(t), 1, CX, CY), Y = v => cam.y(v - 320);   // Y(): screen y the event had before the climb
  laneWorld(cam, t);
  // ours (middle): straight on, highlighted
  const oy = ourY9(t);
  gammaWave(cam.x(0), oy, -Math.PI / 2, 130, t, { amp: 8, wl: 24, w: 5, hs: 10 });
  ring(cam.x(0), oy, 16 + 2 * Math.sin(t * 8), 1, P.SG2, 0.8);
  // absorbed (left lane): photoelectric absorption in tissue
  const ax = cam.x(LANE[0]), aHit = 18.75, ay = t < aHit ? lerp(700, 330, seg(t, 18.1, aHit)) : 330;
  disc(ax, Y(318), 9, P.N5, 0.6); ring(ax, Y(318), 15, 1, P.N6, 0.6);
  if (t > 18.1 && t < aHit) gammaWave(ax, Y(ay), -Math.PI / 2, 110, t, { amp: 7, wl: 22, w: 4 });
  const fa = pulse(t, aHit, 0.45); if (fa > 0) flash(ax, Y(322), 12 * fa + 3, fa, [P.OR1, P.OR2, P.OR3, P.OR5]);
  if (t > aHit) { crossMark(ax, Y(270), 7, P.RJ2); if (t < aHit + 0.6) electron(ax + (t - aHit) * 60, Y(322 - (t - aHit) * 30), 3, null, 1 - seg(t, aHit + 0.3, aHit + 0.6)); }
  // scattered (right lane): Compton scattering off an electron: new direction, less energy (longer wave)
  const bx = cam.x(LANE[2]), bHit = 18.95, by = t < bHit ? lerp(720, 380, seg(t, 18.3, bHit)) : 380;
  if (t < bHit) { electron(bx, Y(372), 3.5, null, 0.8); if (t > 18.3) gammaWave(bx, Y(by), -Math.PI / 2, 110, t, { amp: 7, wl: 22, w: 4 }); }
  else {
    const d = (t - bHit) * 170, a = -Math.PI / 2 + 0.75;
    gammaWave(bx + Math.cos(a) * d, Y(376 + Math.sin(a) * d), a, Math.min(120, d), t, { amp: 7, wl: 30, w: 4, col: [P.OR1, P.OR2, P.OR3, P.GA3] });
    electron(bx - (t - bHit) * 50, Y(372 + (t - bHit) * 70), 3.5, [3, -4, 3], 1 - seg(t, bHit + 0.6, bHit + 1.0));
    const f = pulse(t, bHit, 0.3); if (f > 0) flash(bx, Y(374), 8 * f + 2, f, [P.GA1, P.GA2, P.GA3, P.GA4]);
  }
  label('ABSORBED', cam.x(LANE[0]), 100, 18.05, 20.02, t, P.RJ2, 'center');
  label('REACHES', cam.x(LANE[1]), 100, 18.0, 20.02, t, P.SG2, 'center'); label('DETECTOR', cam.x(LANE[1]), 114, 18.0, 20.02, t, P.SG2, 'center');
  label('SCATTERED', cam.x(LANE[2]), 100, 18.1, 20.02, t, P.OR3, 'center');
  if (t > bHit + 0.1) tag('NEW DIRECTION', cam.x(LANE[2]) + 30, Y(330), 214, 236, bHit + 0.15, 20.0, t, P.OR3);
}
// ============================================================================ S09->S10: rise out of the tissue into the head
const RISE0 = 19.55;
const laneRise = t => Math.max(0, t - RISE0) * 150;            // the camera climbs with our photon
const ourY9 = t => t < RISE0 ? 300 - (t - 17.944) * 87 : 160;  // our photon's screen y in the lane world
function photonHead10(t) { return t < 20.6 ? 700 - (t - 20.069) * 150 : 620.4 - (t - 20.6) * 6; }
function headCam10(t) {
  if (t < 20.6) return new Cam(179, photonHead10(t) + (CY - 160), 1.0, CX, CY);
  return camTrack([[20.6, 179, photonHead10(20.6) + CY - 160, 1.0], [21.1, 180, 410, 1.0], [21.55, 180, 410, 1.0], [21.85, 272, 520, 2.2, K50], [22.903, 179, 520, 2.2, K50]], t);
}
// the patient's tissue under the head (continuity with the lanes), darkened
function tissueBelow(cam, t) {
  const yF = cam.y(DH.face); if (yF >= H) return;
  lowerWorld(() => { const c9 = new Cam(-5, -laneRise(t), 1, CX, CY); laneWorld(c9, t); rect(0, 0, W, H, P.K0, 0.3); }, yF + 1);
  rect(0, yF, W, yF + 2, P.PB1);
}
function s10(t) {
  const cam = headCam10(t);
  drawHead2(cam, t, {});
  const yF = cam.y(DH.face);
  if (yF < H) {
    lowerWorld(() => { const c9 = new Cam(-5, -laneRise(t), 1, CX, CY); laneWorld(c9, t); }, yF + 1);
    rect(0, yF, W, yF + 2, P.PB1);
  }
  gammaH(cam, 179, photonHead10(t), -Math.PI / 2, 80, t);
  // the parts, and the order from the patient side
  if (t > 21.0 && t < 21.62) {
    tag('NaI(Tl) CRYSTAL', cam.x(300), cam.y(446), 196, 404, 21.02, 21.6, t, P.CR4);
    tag('LIGHT GUIDE', cam.x(60), cam.y(415), 30, 380, 21.06, 21.6, t, P.LG3);
    tag('PMTs', cam.x(240), cam.y(350), 240, 120, 21.1, 21.6, t, P.PM5);
    tag('LEAD', cam.x(SEPT[2]), cam.y(520), 30, 434, 21.04, 21.6, t, P.PB5);
    const ay = cam.y(DH.face) + 10; label('PATIENT SIDE', 180, ay + 10, 21.05, 21.6, t, P.SUB, 'center'); arrowHead(180, ay + 2, -Math.PI / 2, 7, P.SUB);
  }
  if (t > 21.9) tag('PARALLEL CHANNELS', cam.x(CHAN[Math.round(clamp(cam.wx(CX) / 26 - 1.4, 0, 10))]), cam.y(500), 120, 140, 21.95, 22.85, t, P.PB5);
}
// ============================================================================ S11: only selected directions pass
const S11P = { b: { x: 80, y: 660, dx: 0.45, dy: -0.89, t0: 22.93, hit: 120 }, c: { x: 250, y: 650, dx: -0.38, dy: -0.92, t0: 22.93, hit: 82.6 }, v: 260 };
function photonA(t) {          // our photon: up channel 5 into the crystal
  if (t < 23.4) return lerp(photonHead10(22.903), DH.face, seg(t, 22.903, 23.4));
  if (t < 24.6) return lerp(DH.face, DH.col0, seg(t, 23.4, 24.6));
  return lerp(DH.col0, 447, ph(t, 24.6, 25.6, eout));
}
function blockedPhoton(cam, p, t) {
  const s = Math.min(p.hit, (t - p.t0) * S11P.v); if (s <= 0) return;
  const x = p.x + p.dx * s, y = p.y + p.dy * s, tHit = p.t0 + p.hit / S11P.v;
  if (t < tHit) gammaH(cam, x, y, Math.atan2(p.dy, p.dx), Math.min(70, s), t);
  else {
    const f = pulse(t, tHit, 0.35); if (f > 0) flash(cam.x(x), cam.y(y), 10 * f + 3, f, [P.OR1, P.OR2, P.OR3, P.OR5]);
    crossMark(cam.x(x) + (p.dx > 0 ? -16 : 16), cam.y(y) + 14, 5, P.RJ2);
  }
  return [x, y, tHit];
}
function s11(t) {
  const cam = new Cam(179, 520, 2.2, CX, CY);
  drawHead2(cam, t, { lit: t > 23.4 && t < 24.7 ? CHAN.map((_, k) => k === 5 ? 1 : 0) : null });
  tissueBelow(cam, t);
  // the range of accepted directions for channel 5 (finite width)
  const ka = ph(t, 23.5, 23.9) * (1 - ph(t, 24.7, 25.0));
  if (ka > 0) { const xl = CHAN[5] - 7, xr = CHAN[5] + 7, ext = 1.0; for (const [a, b] of [[xl, xr], [xr, xl]]) dashLine(cam.x(a), cam.y(DH.col0), cam.x(b + (b - a) * ext), cam.y(DH.face + (DH.face - DH.col0) * ext), P.SG2, 3, 3, -t * 20); }
  const pb = blockedPhoton(cam, S11P.b, t), pc = blockedPhoton(cam, S11P.c, t);
  gammaH(cam, 179, photonA(t), -Math.PI / 2, 80, t);
  if (pb && t > pb[2]) tag('BLOCKED', cam.x(pb[0]) - 6, cam.y(pb[1]), 26, 470, pb[2] + 0.05, 24.98, t, P.RJ2);
  if (pc && t > pc[2]) tag('BLOCKED', cam.x(pc[0]), cam.y(pc[1]) + 4, 214, 470, pc[2] + 0.05, 24.98, t, P.RJ2);
  if (t > 23.9) { tag('PASSES', cam.x(179) + 8, cam.y(photonA(t)) + 10, 196, 120, 23.95, 24.98, t, P.SG2); }
  if (t > 24.2) label('LEAD ABSORBS, DOES NOT FOCUS', 180, 92, 24.2, 24.98, t, P.SUB, 'center');
}
// ============================================================================ S12-S14: inside the crystal
const T_PE = 26.444;
function latCam12(t) { return new Cam(0, 40, lerp(1.0, 1.45, ph(t, 25.6, 28.1)), CX, CY); }
const sEndOf = u => TRACK.L * (1 - Math.pow(1 - clamp(u, 0, 1), 1.7));
function exFor(u, fade) { const se = sEndOf(u); return (i, j) => { for (const e of EXC) if (e.i === i && e.j === j) return e.s <= se ? clamp((se - e.s) / 14, 0, 1) * fade : 0; return 0; }; }
function uTrack(t) { return t < T_PE ? 0 : t < 28.097 ? 0.12 * seg(t, T_PE, 28.097) : 0.12 + 0.88 * seg(t, 28.097, 29.7); }
function latticeScene(cam, t, o) {
  o = o || {};
  const u = uTrack(t), fade = 1 - ph(t, 30.25, 30.8);
  drawLattice(cam, t, { ex: exFor(u, fade), tl: o.tl, dim: t > T_PE ? 0.32 * ph(t, T_PE, T_PE + 0.4) : 0 });
  if (t < T_PE && t > 25.55) { const y = lerp(330, 0, seg(t, 25.6, T_PE)); gammaWave(cam.x(0), cam.y(y), -Math.PI / 2, 120 * Math.min(1.4, cam.z), t, { amp: 7, wl: 22, w: 5 }); }
  photoelectricFlash(cam, pulse(t, T_PE, 0.45));
  if (t >= T_PE) {
    drawTrack(cam, u, t, 1 - ph(t, 30.0, 30.6));
    if (u < 1 || t < 29.9) { const q = trackPos(u), r = lerp(7, 4.5, u) * Math.min(1.4, cam.z); if (t < 29.95) electron(cam.x(q[0]), cam.y(q[1]), r, null, 1 - ph(t, 29.7, 29.95)); }
    // ionisation sparks as the electron passes
    const se = sEndOf(u); for (const s of SPARK) { const age = (se - s.s) / 30; if (age > 0 && age < 1) { pset(cam.x(s.x), cam.y(s.y), P.C6); if (age < 0.5) { pset(cam.x(s.x) + 1, cam.y(s.y), P.LT3); pset(cam.x(s.x), cam.y(s.y) + 1, P.LT3); } } }
  }
}
function s12(t) {
  if (t < 25.98) {
    const cam = camTrack([[25.028, 179, 520, 2.2], [25.95, 179, 452, 6.4]], t);
    drawHead2(cam, t, {}); tissueBelow(cam, t);
    gammaH(cam, 179, photonA(t), -Math.PI / 2, 80, t);
    tag('NaI(Tl) CRYSTAL', cam.x(250), cam.y(440), 196, 140, 25.08, 25.55, t, P.CR4);
    if (t > 25.55) lensComposite(() => latticeScene(latCam12(t), t), cam.x(179), cam.y(photonA(t)), lensIn(t, 25.55, 25.98));
    return;
  }
  const cam = latCam12(t); latticeScene(cam, t);
  if (t < T_PE) { tag('140 keV GAMMA', cam.x(0) + 6, cam.y(lerp(330, 0, seg(t, 25.6, T_PE))) + 30, 196, 420, 25.98, T_PE, t, P.YEL); tag('I⁻ ION', cam.x(0) - 18, cam.y(0), 40, 250, 26.05, T_PE, t, P.CR4); }
  else {
    tag('PHOTOELECTRIC EFFECT', cam.x(0), cam.y(0) + 18, 60, 420, T_PE + 0.05, 27.9, t, P.YEL);
    const q = trackPos(uTrack(t)); tag('ELECTRON ~107 keV', cam.x(q[0]) + 8, cam.y(q[1]), 150, 150, 27.1, 28.05, t, P.EL2);
  }
}
function latCam13(t) { const q = trackPos(uTrack(t)), c0 = latCam12(28.097); const k = ph(t, 28.097, 28.6); return new Cam(lerp(c0.cx, q[0] - 20, k), lerp(c0.cy, q[1] + 10, k), lerp(c0.z, 1.3, k), CX, CY); }
function s13(t) {
  const cam = latCam13(t); latticeScene(cam, t);
  const e = EXC.filter(x => x.s < sEndOf(uTrack(t)) - 20)[2];
  if (e) tag('EXCITED ATOMS', cam.x(e.i * LAT.S), cam.y(e.j * LAT.S), 40, 430, 28.8, 29.93, t, P.OR3);
}
const TRK_C = (function () { let x = 0, y = 0, n = 0; for (let s = 0; s <= TRACK.L; s += 4) { const q = TRACK.at(s); x += q[0]; y += q[1]; n++; } return [x / n, y / n]; })();
const TL_LIT = TL_SITES.filter(([i, j]) => { for (let s = 0; s <= TRACK.L; s += 6) { const q = TRACK.at(s); if (Math.hypot(i * LAT.S - q[0], j * LAT.S - q[1]) < 75) return true; } return false; });
const T_SCINT = 30.222;
function tlGlow(t) { return (i, j) => { const k = TL_LIT.findIndex(s => s[0] === i && s[1] === j); if (k < 0) return 0; return pulse(t, T_SCINT + 0.05 * k, 0.9); }; }
function latCam14(t) { const c = latCam13(29.986); return new Cam(lerp(c.cx, TRK_C[0], ph(t, 29.986, 30.2)), lerp(c.cy, TRK_C[1] - 10, ph(t, 29.986, 30.2)), lerp(c.z, 1.1, ph(t, 29.986, 31.0)), CX, CY); }
function scintScene(cam, t) {
  latticeScene(cam, t, { tl: tlGlow(t) });
  TL_LIT.forEach(([i, j], k) => lightBurst(cam.x(i * LAT.S), cam.y(j * LAT.S), seg(t, T_SCINT + 0.05 * k, T_SCINT + 0.05 * k + 0.9), 9, 40 + k * 13, 70 * cam.z));
  lightBurst(cam.x(TRK_C[0]), cam.y(TRK_C[1]), seg(t, T_SCINT, 31.5), 28, 7, 270 * cam.z, {});
  if (t > 31.3) for (let k = 0; k < 7; k++) { const d = (t - 31.3) * 260 + k * 18, x = cam.x(TRK_C[0]) + (k - 3) * 22, y = cam.y(TRK_C[1]) - d; if (y > -10) { line(x, y, x, y + 12, P.LT2); arrowHead(x, y - 2, -Math.PI / 2, 4, P.LT3); } }
}
function s14(t) {
  const cam = latCam14(t); scintScene(cam, t);
  label('ENERGY → VISIBLE LIGHT', 180, 96, 30.45, 32.06, t, P.LT2, 'center');
  tag('~415 nm LIGHT', cam.x(TRK_C[0]) + 90, cam.y(TRK_C[1]) + 70, 200, 430, 30.7, 32.0, t, P.LT3);
  if (TL_LIT[0]) tag('Tl⁺ CENTRE', cam.x(TL_LIT[0][0] * LAT.S), cam.y(TL_LIT[0][1] * LAT.S), 30, 160, 30.3, 31.1, t, P.CR4);
}
// ============================================================================ S15: the light reaches several tubes
function s15(t) {
  const cam = camTrack([[32.111, 179, 446, 6.4], [32.95, 180, 382, 1.15]], t);
  const env = ph(t, 32.35, 32.65) * (1 - 0.25 * ph(t, 33.4, 34.0));
  drawHead2(cam, t, { flash: [179, 446, 0.35 + 0.65 * pulse(t, 32.3, 1.2)], rays: t > 32.35, light: HOOK_L.map(v => v * env) });
  if (t < 32.46) lensComposite(() => scintScene(latCam14(t), t), cam.x(179), cam.y(446), lensOut(t, 32.111, 32.46));
  tag('LIGHT GUIDE', cam.x(60), cam.y(415), 26, 470, 32.9, 33.95, t, P.LG3);
  tag('PMTs', cam.x(120), cam.y(330), 30, 140, 33.05, 33.95, t, P.PM5);
  if (t > 33.2) label('BRIGHTEST NEAR THE FLASH', 180, 96, 33.2, 33.95, t, P.LT2, 'center');
}
// ============================================================================ S16: inside one PMT
const LP = [[-74, 34.72], [-20, 34.95], [32, 35.17], [78, 35.4]];   // light photons: x, arrival time at the photocathode
const PE_X = -20, T_PEL = 34.95;
function peY(t) { return 556 - Math.pow(Math.max(0, t - T_PEL), 1.35) * 70; }
function pmtCam16(t) { return camTrack([[34.2, 0, 520, 1.0], [35.889, -14, 490, 1.45]], t); }
function pmtScene16(cam, t) {
  let pcG = 0, pcX = PE_X;
  for (const [x, ta] of LP) { const g = pulse(t, ta, 0.3) * (x === PE_X ? 1 : 0.45); if (g > pcG) { pcG = g; pcX = x; } }
  pmtBody(cam, t, { pcGlow: pcG, pcX });
  for (const [x, ta] of LP) {
    if (t > ta || t < ta - 0.42) continue;
    const y = lerp(720, PMT.pc + 4, seg(t, ta - 0.42, ta));
    gammaWave(cam.x(x), cam.y(y), -Math.PI / 2, 60 * cam.z, t, { amp: 4 * cam.z, wl: 10 * cam.z, w: 3, hs: 6, glowR: 8, col: LIGHT_COLS() });
  }
  if (t > T_PEL) { const y = peY(t); electron(cam.x(PE_X), cam.y(y), 4.5 * cam.z, [0, 3 * cam.z, 3], 1); }
}
function s16(t) {
  if (t < 34.55) {
    const cam = camTrack([[34.0, 180, 382, 1.15], [34.45, 180, 402, 4.2]], t);
    drawHead2(cam, t, { light: HOOK_L.map(v => v * 0.75), flash: [179, 446, 0.35], rays: true });
    if (t > 34.2) lensComposite(() => pmtScene16(pmtCam16(t), t), cam.x(180), cam.y(402), lensIn(t, 34.2, 34.55));
    return;
  }
  const cam = pmtCam16(t); pmtScene16(cam, t);
  tag('LIGHT PHOTON', cam.x(LP[1][0]) + 6, cam.y(640), 40, 470, 34.56, T_PEL, t, P.LT2);
  tag('PHOTOCATHODE', cam.x(70), cam.y(PMT.pc + 4), 186, 470, 34.6, 35.85, t, P.PC3);
  if (t > T_PEL) tag('PHOTOELECTRON', cam.x(PE_X) + 8, cam.y(peY(t)), 150, 260, T_PEL + 0.08, 35.85, t, P.EL2);
  label('VACUUM', cam.x(-70), cam.y(420), 35.3, 35.85, t, P.SUB, 'center');
}
// ============================================================================ S17-S18: dynodes, anode, pulse
const DH_T = [36.361, 36.833, 37.306, 37.778, 38.25, 38.722], T_ANODE = 39.194;
const DYN_N = [1, 4, 9, 16, 24, 32];
function pmtCam17(t) { return camTrack([[35.889, -14, 490, 1.45], [36.361, 0, 400, 1.25, K50], [36.833, 0, 320, 1.25, K50], [37.306, 0, 240, 1.25, K50], [37.778, 0, 160, 1.25, K50], [38.25, 0, 80, 1.25, K50], [38.722, 0, 0, 1.25, K50], [38.958, 0, -40, 1.25, K50]], t); }
function cascade(cam, t) {
  // the photoelectron to D1 (single, accelerating along a curve)
  if (t < DH_T[0] + 0.15) {
    const A = [PE_X, peY(35.889)], B = dynFace(0), k = clamp((t - 35.889) / (DH_T[0] - 35.889), 0, 1), e = k * k;
    const x = lerp(A[0], B[0], e) + Math.sin(e * Math.PI) * -18, y = lerp(A[1], B[1], e);
    if (t <= DH_T[0]) electron(cam.x(x), cam.y(y), 4 * cam.z, null, 1);
    electronBundle(cam, A, B, 1, Math.min(1, k), 2, 1, t);
  }
  for (let s = 1; s < DYN.length; s++) {
    const t0 = DH_T[s - 1], t1 = DH_T[s]; if (t < t0 || t > t1 + 0.35) continue;
    electronBundle(cam, dynFace(s - 1), dynFace(s), DYN_N[s], seg(t, t0, t1), 6 + s * 3, 10 + s * 7, t);
  }
  if (t > DH_T[5]) electronBundle(cam, dynFace(5), [ANODE.x, ANODE.y + 6], 40, seg(t, DH_T[5], T_ANODE), 34, 60, t);
}
function s17(t) {
  const cam = pmtCam17(t);
  pmtBody(cam, t, { dynHit: DH_T.map(h => pulse(t, h, 0.45)) });
  cascade(cam, t);
  tag('DYNODE', cam.x(DYN[0][0]) + 18, cam.y(DYN[0][1]) - 20, 214, 250, DH_T[0] + 0.05, 37.3, t, P.PM5);
  label('+100 V', cam.x(DYN[0][0] + 6), cam.y(DYN[0][1] + 50), DH_T[0], 38.9, t, P.SUB, 'center');
  label('+200 V', cam.x(DYN[1][0] + 4), cam.y(DYN[1][1] - 60), DH_T[1], 38.9, t, P.SUB, 'center');
  // the running count
  const n = DH_T.filter(h => t >= h).length, seq = ['1', '4', '16', '64', '256', '1,024', '4,096'];
  if (UI_ON) { let s = seq[0]; for (let k = 1; k <= n; k++) s += '→' + seq[k]; text(FS, s, CAP_X, 86, { sc: 2, c: P.EL3, ol: P.SH }); }
  if (t > 37.4) tag('MORE ELECTRONS EACH HIT', cam.x(DYN[2][0]) - 6, cam.y(DYN[2][1]) + 10, 40, 440, 37.4, 38.9, t, P.EL2);
}
function pmtCam18(t) { return camTrack([[38.958, 0, -40, 1.25], [39.3, 0, -120, 1.1], [39.95, 40, -330, 0.62], [41.083, 34, -350, 0.58, lin]], t); }
function s18(t) {
  const cam = pmtCam18(t);
  pmtBody(cam, t, { anodeGlow: pulse(t, T_ANODE, 0.7), dynHit: DH_T.map(h => pulse(t, h, 0.45)) });
  cascade(cam, t);
  pmtCable(cam, seg(t, 39.25, 39.66));
  scopeSprite(cam, t, seg(t, 39.667, 40.15), 1);
  tag('ANODE', cam.x(ANODE.x + ANODE.w), cam.y(ANODE.y), 230, 300, T_ANODE, 39.95, t, P.PM5);
  if (UI_ON && t > T_ANODE) text(FS, '~1 MILLION ELECTRONS', CAP_X, 86, { sc: 2, c: P.EL3, ol: P.SH, n: (t - T_ANODE) * 50 });
  tag('ELECTRICAL PULSE', cam.x(SCOPE.x - SCOPE.w / 2), cam.y(SCOPE.y + 20), 30, 260, 40.0, 41.03, t, P.SG2);
  if (t > 40.3) label('FROM ONE TUBE', cam.x(SCOPE.x), cam.y(SCOPE.y + SCOPE.h / 2 + 30), 40.3, 41.03, t, P.SUB, 'center');
}
// ============================================================================ S19-S22: electronics, energy, counts
const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function elecWorld(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  for (let x = -600; x < 1400; x += 40) { const sx = Math.round(cam.x(x)); if (sx >= 0 && sx < W) for (let y = 0; y < H; y += 3) pset(sx, y, P.N2); }
  for (let y = -600; y < 1200; y += 40) { const sy = Math.round(cam.y(y)); if (sy >= 0 && sy < H) for (let x = 0; x < W; x += 3) pset(x, sy, P.N2); }
  drawPmtArray(cam, t, o.flashK || 0, o.barsK || 0);
  drawXYGrid(cam, t, o.markK || 0, o.sumK || 0);
  const geo = drawSpectrum(cam, t, o.specK || 0, { win: o.win || 0 });
  if (o.hatch > 0) { const a = geo.X(SPEC.w0), b = geo.X(131); for (let x = Math.ceil(a); x < b; x += 3) line(x, geo.y1, x + 6, geo.Y(specValue(SPEC.w0 + 2)) , P.RJ2, o.hatch); }
  const g = drawMatrix(cam, t, o.N || 0, { fresh: o.fresh || 0 });
  return { geo, g };
}
function eventPixWorld() { const n = MD.n, i = MODEL.evPix % n, j = Math.floor(MODEL.evPix / n), cs = 2 * EW.ms / n; return [EW.mat[0] - EW.ms + (i + 0.5) * cs, EW.mat[1] - EW.ms + (j + 0.5) * cs]; }
function s19(t) {
  const cam = new Cam(0, 40 + 4 * Math.sin(t * 0.8), 1, CX, CY);
  const o = { flashK: t < 41.25 ? 0 : 0.55 + 0.45 * pulse(t, 41.25, 0.6), barsK: seg(t, 41.45, 42.25), markK: seg(t, 42.5, 42.972), sumK: seg(t, 43.0, 43.444) };
  if (t < 41.3) { s18(41.08); dissolveWorld(() => elecWorld(cam, t, o), seg(t, 41.083, 41.3)); return; }
  elecWorld(cam, t, o);
  tag('PMTs SEEN FROM BEHIND', cam.x(EW.arr[0] - 70), cam.y(EW.arr[1] - 110), 60, 96, 41.3, 42.4, t, P.PM5);
  tag('PULSE HEIGHTS', cam.x(HEXP[9][0]), cam.y(HEXP[9][1]) - 40, 186, 96, 41.9, 42.5, t, P.SG2);
  const gx = cam.x(EW.grid[0]), gy = cam.y(EW.grid[1]), s = EW.gs;
  label('X', gx + s + 10, gy + s - 4, 42.4, 43.9, t, P.SUB); label('Y', gx - s - 2, gy - s - 18, 42.4, 43.9, t, P.SUB);
  const mx = gx + (ANGER[0] - EW.arr[0]) / (EW.pitch * 2.75) * s, my = gy + (ANGER[1] - EW.arr[1]) / (EW.pitch * 2.75) * s;
  tag('POSITION (X, Y)', mx + 4, my, 40, 470, 42.98, 43.9, t, P.YEL);
  tag('ENERGY', cam.x(EW.ebar[0]), cam.y(EW.ebar[1]) - s * 0.9, 210, 120, 43.25, 43.9, t, P.SG2);
}
const T_ACC = 44.861, T_REJ = 45.333;
function s20(t) {
  const cam = camTrack([[43.917, 0, 40, 1], [44.5, 404, 156, 1.05], [46.042, 398, 166, 1.08, lin]], t);
  const o = { flashK: 0.4, barsK: 1, markK: 1, sumK: 1, specK: seg(t, 43.95, 44.45), win: seg(t, 44.3, 44.6), hatch: ph(t, 44.95, 45.15) };
  const { geo } = elecWorld(cam, t, o);
  // our event: from the energy bar to the spectrum, then it drops at 140 keV
  if (t < 44.6) { const k = ph(t, 44.25, 44.6), ex = cam.x(EW.ebar[0]), ey = cam.y(EW.ebar[1] - EW.gs * 0.72), tx = geo.X(139), ty = geo.y0 - 50; if (k > 0) { const x = lerp(ex, tx, k), y = lerp(ey, ty, k) - Math.sin(k * Math.PI) * 40; glow(x, y, 9, P.SG1, P.SG2, 0.8); disc(x, y, 4, P.C6); } }
  else specEvent(geo, 139, seg(t, 44.6, T_ACC), true, t);
  if (t > 44.95) specEvent(geo, 112, seg(t, 44.95, T_REJ), false, t);
  tag('ENERGY WINDOW', geo.X(147), geo.y0 + 6, 196, geo.y0 - 40, 44.55, 45.95, t, P.SG2);
  if (t > T_ACC) tag('ACCEPTED', geo.X(139) + 10, geo.y1 - 8, 200, geo.y1 + 34, T_ACC + 0.05, 45.95, t, P.SG2);
  if (t > T_REJ) tag('SCATTERED: REJECTED', geo.X(112), geo.y1 - 8, 30, geo.y1 + 52, T_REJ + 0.03, 46.03, t, P.RJ2);
  if (t > 45.0) tag('NOT PERFECT', geo.X(129), geo.Y(0.3), 30, geo.y0 - 40, 45.0, 46.03, t, P.RJ2);
}
function s21(t) {
  const [px, py] = eventPixWorld();
  const cam = camTrack([[46.042, 398, 166, 1.08], [46.5, 404, 420, 1.05], [47.931, px, py, 2.6, K50]], t);
  const { geo } = elecWorld(cam, t, { flashK: 0.3, barsK: 1, markK: 1, sumK: 1, specK: 1, win: 1, hatch: 1, N: t > 46.5 ? 1 : 0 });
  if (t < 46.5) { const k = ph(t, 46.06, 46.5), ax = geo.X(139), ay = geo.y1 - 6, bx = cam.x(px), by = cam.y(py), x = lerp(ax, bx, k) + Math.sin(k * Math.PI) * 30, y = lerp(ay, by, k); glow(x, y, 9, P.SG1, P.SG2, 0.8); disc(x, y, 4, P.C6); }
  else { const k = pop(t, 46.5, 0.35); if (k > 0) { label('+1', cam.x(px) + 6 * cam.z, cam.y(py) - 8 - 10 * k, 46.5, 47.9, t, P.PJ4, 'center', FC, 2); ring(cam.x(px), cam.y(py), 6 + 10 * (1 - pulse(t, 46.5, 0.5)), 1, P.PJ4, pulse(t, 46.5, 0.6)); } }
  tag('DETECTOR IMAGE', cam.x(EW.mat[0] - EW.ms), cam.y(EW.mat[1] - EW.ms), 30, 96, 46.1, 46.95, t, P.PJ3);
  if (t > 46.95) label('ONE COUNT, NOT A 3D POINT', 180, 96, 46.95, 47.9, t, P.SUB, 'center');
}
const T_CNT = 48.05;
function camS22(t) { const [px, py] = eventPixWorld(); return camTrack([[47.931, px, py, 2.6], [49.4, 404, 476, 1.3], [51.0, 404, 472, 1.25]], t); }
function s22(t) {
  const cam = camS22(t), N = countN(t - T_CNT);
  elecWorld(cam, t, { flashK: 0.3, barsK: 1, markK: 1, sumK: 1, specK: 1, win: 1, hatch: 1, N, fresh: clamp(Math.floor(N / 40), 1, 36) });
  if (UI_ON) text(FS, 'COUNTS: ' + fmtN(N), CAP_X, 86, { sc: 2, c: P.PJ4, ol: P.SH, n: (t - 48.0) * 50 });
  if (t > 49.6) label('NOISY → CLEARER', 180, 112, 49.6, 50.95, t, P.SUB, 'center');
}
// ============================================================================ S23: the heads rotate, new angles, new projections
const RAIL = [[86, 104], [180, 104], [274, 104]], RAIL_V = [12, 18, 24];
function rot23(t) { return Math.PI / 4 * (K75(seg(t, 51.75, 52.45)) + K75(seg(t, 52.85, 53.55))); }
function heads23(t) { const p = rot23(t); return [-Math.PI / 4 + p, Math.PI / 4 + p]; }
function railTile(v, x, y, s, k) { if (k <= 0) return; const ss = s * k; projTile(v, x, y, ss, {}); }
function rotArrows(cx, cy, r, a0, a1, t, k) {
  if (k <= 0) return;
  for (const [b0, b1] of [[a0, a1]]) {
    const n = 18, pts = []; for (let i = 0; i <= n; i++) { const a = lerp(b0, b1, i / n * k); pts.push(cx + Math.sin(a) * r, cy - Math.cos(a) * r); }
    for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 4, P.OR2);
    polyline(pts, P.OR4);
    const L = pts.length; arrowHead(pts[L - 2], pts[L - 1], Math.atan2(pts[L - 1] - pts[L - 3], pts[L - 2] - pts[L - 4]), 7, P.OR3);
  }
}
function s23(t) {
  const cam = new Cam(180, lerp(272, 290, ph(t, 51.0, 54.0)), lerp(1.0, 0.94, ph(t, 51.0, 54.0)), CX, CY);
  const scan = () => { drawScanner(cam, t, { heads: heads23(t), monitor: false }); };
  if (t < 51.35) { s22(51.0); dissolveWorld(scan, seg(t, 51.0, 51.35)); } else scan();
  // the projection we built flies to the rail; then each new angle adds one
  const c22 = camS22(51.0), mg = { x: c22.x(EW.mat[0]), y: c22.y(EW.mat[1]), s: 2 * EW.ms * c22.z };
  { const k = ph(t, 51.0, 51.6); const x = lerp(mg.x, RAIL[0][0], k), y = lerp(mg.y, RAIL[0][1], k), s = lerp(mg.s, 56, k); projTile(RAIL_V[0], x, y, s, { col: P.PJ3 }); }
  for (const [i, tp] of [[1, 52.5], [2, 53.6]]) {
    const k = ph(t, tp, tp + 0.35); if (k <= 0) continue;
    const [hx, hy] = headPos(heads23(t)[1]), x = lerp(cam.x(hx), RAIL[i][0], k), y = lerp(cam.y(hy), RAIL[i][1], k);
    projTile(RAIL_V[i], x, y, lerp(18, 56, k), { col: P.PJ3 });
    if (k < 1) { const f = 1 - k; flash(cam.x(hx), cam.y(hy), 10 * f + 2, f, [P.PJ1, P.PJ2, P.PJ3, P.PJ4]); }
  }
  ['45°', '90°', '135°'].forEach((s, i) => label(s, RAIL[i][0] + 34, RAIL[i][1] - 6, i === 0 ? 51.6 : i === 1 ? 52.85 : 53.95, 54.02, t, P.PJ4, 'left'));
  const ka = ph(t, 51.65, 51.9) * (1 - ph(t, 53.7, 54.0));
  rotArrows(cam.x(180), cam.y(250), 170 * cam.z, heads23(t)[1] + 0.25, heads23(t)[1] + 0.85, t, ka);
  tag('HEADS ROTATE, PATIENT STAYS', cam.x(180), cam.y(296), 40, 96, 51.8, 53.2, t, P.OR3);
}
// ============================================================================ S24: many angles around one heart -> the computer
const SEMI_V = [0, 3, 6, 9, 12, 15, 18, 21, 24];
function semiPos(v, c, r) { const d = thDir(VIEW_TH[v]); return [c[0] + d[0] * r, c[1] + d[1] * r]; }
function camS24(t) { return camTrack([[54.069, 180, 300, 1.0], [56.3, 180, 300, 1.0], [57.0, 180, 452, 1.0, K50], [58.083, 180, 470, 1.0]], t); }
const MON = { x: 180, y: 640, w: 108, h: 192 };
function monitorP(cam, t, content) {
  const z = cam.z, x0 = cam.x(MON.x - MON.w / 2), y0 = cam.y(MON.y - MON.h / 2), x1 = cam.x(MON.x + MON.w / 2), y1 = cam.y(MON.y + MON.h / 2), b = 7 * z;
  rect(cam.x(MON.x - 8), y1 + b, cam.x(MON.x + 8), y1 + b + 26 * z, P.G5); rect(cam.x(MON.x - 34), y1 + b + 26 * z, cam.x(MON.x + 34), y1 + b + 31 * z, P.G4);
  rect(x0 - b, y0 - b, x1 + b, y1 + b, P.G4); rect(x0 - b, y0 - b, x1 + b, y0 - b + Math.max(1, 2 * z), P.G2); rect(x0 - b, y1 + b - Math.max(1, 2 * z), x1 + b, y1 + b, P.G5);
  rect(x0, y0, x1, y1, P.K0);
  if (content) content(x0, y0, x1 - x0, y1 - y0);
  disc(x1 + b * 0.5, y1 + b * 0.5, Math.max(1, 1.2 * z), Math.sin(t * 4) > 0 ? P.SG2 : P.SG1);
}
function s24(t) {
  const cam = camS24(t), C0 = [cam.x(180), cam.y(250)], R = 132 * cam.z;
  const base = () => { rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4); };
  if (t < 54.5) { s23(54.06); dissolveWorld(base, seg(t, 54.069, 54.5)); } else base();
  // the simplified heart model and the views around it
  const kh = pop(t, 54.35, 0.45); if (kh > 0) heartIcon(C0[0], C0[1], 40 * kh * cam.z, t);
  monitorP(cam, t, (x, y, w, h) => { const n = SEMI_V.filter((v, i) => t > 56.75 + i * 0.09 + 0.3).length; for (let i = 0; i < n; i++) rect(x + 8 + i * 3, y + 10 + i * 4, x + w - 30 + i * 3, y + 40 + i * 4, i === n - 1 ? P.PJ3 : P.PJ1); if (n > 0) label(n + ' VIEWS', x + w / 2, y + h - 22, 56.8, 58.1, t, P.PJ4, 'center'); });
  SEMI_V.forEach((v, i) => {
    const [x, y] = semiPos(v, C0, R);
    const rail = RAIL_V.indexOf(v);
    let k = rail >= 0 ? 1 : pop(t, 54.6 + i * 0.118, 0.35);
    let px = x, py = y, s = 46 * cam.z;
    if (rail >= 0) { const f = ph(t, 54.2, 54.75); px = lerp(RAIL[rail][0], x, f); py = lerp(RAIL[rail][1], y, f); s = lerp(62, 46 * cam.z, f); }
    // streaming into the computer
    const ts = 56.75 + i * 0.09, fk = ph(t, ts, ts + 0.32, ein);
    if (fk > 0) { px = lerp(px, cam.x(MON.x), fk); py = lerp(py, cam.y(MON.y - 40), fk); s *= 1 - 0.85 * fk; }
    if (fk >= 1) return;
    if (k > 0) {
      if (fk <= 0 && t > 54.7) dashLine(lerp(C0[0], x, 0.38), lerp(C0[1], y, 0.38), lerp(C0[0], x, 0.78), lerp(C0[1], y, 0.78), P.PJ2, 3, 3, -t * 30);
      projTile(v, px, py, s * k, { col: P.PJ3 });
    }
  });
  tag('SAME HEART, MANY VIEWS', C0[0] + 20, C0[1] + 30, 70, 470 - (cam.cy - 300), 55.5, 56.3, t, P.PJ4);
  tag('RECONSTRUCTION COMPUTER', cam.x(MON.x + MON.w / 2), cam.y(MON.y - 60), 40, 120, 57.2, 58.03, t, P.SUB);
}
// ============================================================================ S25: estimate -> project -> compare -> update -> repeat
// each step: [time, active node, estimate index (-1 = initial uniform), iteration shown]
const RSTEP = [
  [58.55, 0, -1, 0], [58.85, 1, -1, 0], [59.15, 2, -1, 0], [59.45, 3, 0, 1],
  [59.75, 0, 0, 1], [59.9, 1, 0, 1], [60.05, 2, 0, 1], [60.2, 3, 1, 2],
  [60.35, 0, 1, 2], [60.47, 1, 1, 2], [60.59, 2, 1, 2], [60.71, 3, 2, 3],
  [60.85, 0, 2, 3], [60.95, 1, 2, 3], [61.05, 2, 2, 3], [61.15, 3, 3, 5],
  [61.3, 0, 3, 5], [61.38, 1, 3, 5], [61.46, 2, 3, 5], [61.54, 3, 4, 8],
  [61.66, 0, 4, 8], [61.72, 1, 4, 8], [61.78, 2, 4, 8], [61.84, 3, 5, 14],
];
let VOX0 = null;
function uniformVox() {          // the first guess: the same activity everywhere in the region
  if (VOX0) return VOX0; const out = [], R = 6.4, st = MD.vox / 2;
  for (let z = -R; z <= R; z += st) for (let y = -R; y <= R; y += st) for (let x = -R; x <= R; x += st) {
    const h = x * LVA[0] + y * LVA[1] + z * LVA[2], r2 = x * x + y * y + z * z - h * h;
    if (h < -3.4 || (h / 6.2) * (h / 6.2) + r2 / (4.5 * 4.5) > 1) continue;
    out.push(x, y, z, 0.5);
  }
  VOX0 = new Float32Array(out); return VOX0;
}
function reconState(t) {
  let i = -1; for (let k = 0; k < RSTEP.length; k++) if (t >= RSTEP[k][0]) i = k;
  if (i < 0) return { node: 0, est: -1, iter: 0, tStep: 58.4, prevEst: -1 };
  const [ts, node, est, iter] = RSTEP[i], prev = i > 0 ? RSTEP[i - 1][2] : -1;
  return { node, est, iter, tStep: ts, prevEst: node === 3 ? prev : est, k: i + 1 < RSTEP.length ? seg(t, ts, RSTEP[i + 1][0]) : 1 };
}
const volList = e => e < 0 ? uniformVox() : VOXC[e];
function reconContent(x0, y0, w, h, t) {
  // drawn in a w x h window (full frame when w = W); layout in frame units
  const s = w / W, X = v => x0 + v * s, Y = v => y0 + v * s;
  rect(x0, y0, x0 + w, y0 + h, P.K0);
  for (let gx = 0; gx < W; gx += 24) for (let gy = 0; gy < H; gy += 3) pset(X(gx), Y(gy), P.N2);
  const st = reconState(t);
  const sweep = st.node === 3 && st.k < 1 ? [Y(110 + 210 * K50(st.k)), volList(st.prevEst)] : null;
  const vo = { cut: 0, thr: st.est < 0 ? 0 : 0.42 }; if (sweep) vo.sweep = sweep;
  drawVoxels(volList(st.est), X(180), Y(206), 24 * s, 0.3 + (t - 58.08) * 0.45, vo);
  if (s > 0.7) { text(FS, 'ESTIMATED ACTIVITY (CUT OPEN)', X(180), Y(96), { sc: 2, c: P.SUB, ol: P.SH, align: 'center' }); text(FS, 'SIMPLIFIED', X(180), Y(66), { sc: 2, c: P.N6, ol: P.SH, align: 'center' }); }
  if (sweep) { const yy = sweep[0]; rect(x0, yy, x0 + w, yy + Math.max(1, s), P.PJ3); }
  if (s < 0.7) return;
  loopDiagram(X(180), Y(398), 112 * s, 40 * s, st.node, st.k || 0, st.iter, t);
  // compare: the measured view vs. the view the current estimate predicts
  const ts = 70 * s, my = Y(500);
  projTile(VIEW_LAO, X(86), my, ts, { col: P.PJ3, hl: st.node === 2 });
  const ep = st.est < 0 ? MODEL.estProj0 : MODEL.estProj[st.est];
  rect(X(274) - ts / 2 - 3, my - ts / 2 - 3, X(274) + ts / 2 + 3, my + ts / 2 + 3, P.K0); frame(X(274) - ts / 2 - 3, my - ts / 2 - 3, X(274) + ts / 2 + 3, my + ts / 2 + 3, st.node === 1 || st.node === 2 ? P.PJ4 : P.PJ2);
  drawValueImage(ep, MD.n, X(274) - ts / 2, my - ts / 2, ts, ts, RAMP_PJ(), PMAX * 0.95, {});
  text(FC, st.iter >= 8 ? '≈' : '≠', X(180), my - 9, { sc: 2, c: st.iter >= 8 ? P.SG2 : P.RJ2, align: 'center', ol: P.SH });
  text(FS, 'MEASURED', X(86), my + ts / 2 + 6, { sc: 2, c: P.PJ4, align: 'center', ol: P.SH });
  text(FS, 'ESTIMATED', X(274), my + ts / 2 + 6, { sc: 2, c: P.PJ4, align: 'center', ol: P.SH });
}
function s25(t) {
  if (t < 58.5) {
    const cam = camTrack([[58.083, 180, 470, 1.0], [58.5, MON.x, MON.y, H / MON.h]], t);
    rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
    monitorP(cam, t, (x, y, w, h) => reconContent(x, y, w, h, t));
    return;
  }
  reconContent(0, 0, W, H, t);
}
// ============================================================================ S26: the medical image
const T_SLAM = 62.333;
function s26(t) {
  if (t < T_SLAM) { const k = ph(t, 62.097, T_SLAM, ein); reconContent(0, 0, W, H, 62.09); rect(0, 0, W, H, P.K0, 0.4 + 0.6 * k); return; }
  const sh = pulse(t, T_SLAM, 0.35) * 3, ox = Math.round(Math.sin(t * 90) * sh), oy = Math.round(Math.cos(t * 77) * sh);
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  slicePanel('SA', 0.6, 180 + ox, 178 + oy, 150, 150, seg(t, T_SLAM, T_SLAM + 0.3));
  [-1.6, -0.4, 0.8, 2.0].forEach((h, i) => slicePanel('SA', h, 54 + i * 84 + ox, 312 + oy, 70, 70, seg(t, 62.81 + i * 0.118, 62.81 + i * 0.118 + 0.25)));
  slicePanel('VLA', 0, 96 + ox, 424 + oy, 140, 100, seg(t, 63.75, 64.0));
  slicePanel('HLA', 0, 264 + ox, 424 + oy, 140, 100, seg(t, 64.222, 64.47));
  if (pulse(t, T_SLAM, 0.12) > 0) rect(0, 0, W, H, P.C6, pulse(t, T_SLAM, 0.12) * 0.6);
  label('SHORT AXIS', 180, 260, T_SLAM + 0.2, 64.9, t, P.LBL, 'center');
  label('BASE → APEX', 180, 354, 63.3, 64.9, t, P.SUB, 'center');
  label('VERT. LONG AXIS', 96, 480, 64.0, 64.9, t, P.LBL, 'center');
  label('HORIZ. LONG AXIS', 264, 480, 64.45, 64.9, t, P.LBL, 'center');
  if (t > 62.9) { colourBar(70, 84, 220, seg(t, 62.9, 63.15)); label('LOW', 70, 68, 63.0, 64.92, t, P.SUB); label('HIGH TRACER UPTAKE', 290, 68, 63.0, 64.92, t, P.SUB, 'right'); }
}
// ============================================================================ S27: recap -> one event -> the scanner again
const RECAP_L = ['NUCLEUS', 'GAMMA', 'COLLIMATOR', 'CRYSTAL', 'LIGHT', 'ELECTRON', 'DYNODES', 'PULSE', 'POSITION', 'PROJECTION', 'ANGLES', 'IMAGE'];
const RECAP_X = [64, 172, 280], RECAP_Y = [128, 222, 316, 410], T_REC = 64.98, D_REC = 0.118;
function recapPos(k) { const r = Math.floor(k / 3), c = k % 3; return [RECAP_X[r % 2 ? 2 - c : c], RECAP_Y[r]]; }
function recapIcon(k, x, y, on, t) {
  const lv = on ? 1 : 0.35;
  if (!on) { rect(x - 30, y - 26, x + 30, y + 26, P.N2); }
  switch (k) {
    case 0: drawNucleus(x, y, 5.2, t * 0.4, t, { ex: on ? 0.6 : 0, jig: 0.02 }); break;
    case 1: gammaWave(x + 24, y, 0, 46, t, { amp: 5, wl: 14, w: 4, hs: 7, glowR: 8 }); break;
    case 2: for (let i = 0; i < 4; i++) { rect(x - 22 + i * 12, y - 22, x - 14 + i * 12, y + 22, P.PB2); rect(x - 22 + i * 12, y - 22, x - 20 + i * 12, y + 22, P.PB4); } break;
    case 3: { rect(x - 20, y - 20, x + 20, y + 20, P.CR3); rect(x - 20, y - 20, x + 20, y - 18, P.CR5); rect(x + 14, y - 20, x + 20, y + 20, P.CR2); for (let q = 0; q < 8; q++) rect(x - 16 + hash(q + 70) * 26, y - 16 + hash(q + 71) * 26, x - 13 + hash(q + 70) * 26, y - 13 + hash(q + 71) * 26, P.CR4); flash(x, y, 6, on ? 1 : 0.3); break; }
    case 4: lightBurst(x, y, on ? 0.75 : 0.5, 12, 3, 30, { fade: false }); break;
    case 5: { rect(x - 24, y + 10, x + 24, y + 16, P.PC1); rect(x - 24, y + 10, x + 24, y + 11, P.PC4); electron(x, y - 8, 4, [0, 3, 3], 1); break; }
    case 6: { for (const [dx, dy] of [[-14, 10], [0, -6], [14, 10]]) { ring(x + dx, y + dy, 9, 3, P.PM3); } for (let i = 0; i < 5; i++) line(x - 14, y + 8, x + 14 - i * 2, y + 6 - i * 3, P.EL2); break; }
    case 7: pulseGlyph(x, y + 6, 1.5); break;
    case 8: { frame(x - 20, y - 20, x + 20, y + 20, P.SG1); line(x - 20, y + 4, x + 20, y + 4, P.N5); line(x + 6, y - 20, x + 6, y + 20, P.N5); rect(x + 4, y + 2, x + 9, y + 7, P.YEL); break; }
    case 9: projTile(VIEW_LAO, x, y, 40, {}); break;
    case 10: for (let i = 0; i < 3; i++) projTile(SEMI_V[2 + i * 2], x - 18 + i * 18, y - 6 + Math.abs(i - 1) * 8, 18, {}); break;
    case 11: { const k2 = 1; drawValueImage(sliceImg('SA', 0.6), 48, x - 22, y - 22, 44, 44, RAMP_RM(), 0.74, {}); void k2; break; }
  }
  if (!on) rect(x - 30, y - 26, x + 30, y + 26, P.BG, 0.55);
  if (UI_ON) text(FS, RECAP_L[k], x, y + 30, { sc: 2, c: on ? P.INK : P.N5, ol: P.SH, align: 'center' });
  void lv;
}
function s27(t) {
  if (t < 66.85) {
    const base = () => { rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4); };
    if (t < 65.12) { s26(64.92); dissolveWorld(base, seg(t, 64.931, 65.12)); } else base();
    const lit = Math.floor((t - T_REC) / D_REC);
    // connectors (snake) and the travelling spark
    for (let k = 0; k < 11; k++) { const a = recapPos(k), b = recapPos(k + 1), on = k < lit; dashLine(a[0], a[1], b[0], b[1], on ? P.LBL : P.N3, 3, 3, on ? -t * 40 : 0); }
    for (let k = 0; k < 12; k++) {
      if (k === 11 && t > 66.4) continue;
      const [x, y] = recapPos(k); recapIcon(k, x, y, k <= lit, t);
    }
    if (lit >= 0 && lit < 11) { const a = recapPos(lit), b = recapPos(lit + 1), f = ((t - T_REC) / D_REC) % 1; glow(lerp(a[0], b[0], f), lerp(a[1], b[1], f), 8, P.LT1, P.LT3, 1); }
    if (UI_ON && t > 65.0) text(FC, 'QUICK RECAP', CAP_X, 44, { sc: 2, c: P.YEL, ol: P.SH, shadow: P.SH, sd: 2, n: (t - 65.0) * 40 });
    // the image collapses into one highlighted detection event
    if (t > 66.4) {
      const k = ph(t, 66.4, 66.85, ein), [x0, y0] = recapPos(11), x = lerp(x0, CX, k), y = lerp(y0, CY, k), s = lerp(44, 6, k);
      if (k < 0.8) drawValueImage(sliceImg('SA', 0.6), 48, x - s / 2, y - s / 2, s, s, RAMP_RM(), 0.74, {});
      glow(x, y, 6 + 20 * k, P.OR1, P.GA3, 0.4 + 0.6 * k); disc(x, y, 2 + 2 * k, P.GA4);
    }
    return;
  }
  // pull back to the scanner: the last frame equals the first
  const cam = camTrack([[66.85, CHEST2[0], CHEST2[1] + 14, 3.6], [67.95, 180, 272, 1.0]], t);
  drawScanner(cam, t, { heartGlow: 1 - ph(t, 66.9, 67.75) });
  const f = 1 - ph(t, 66.85, 67.2); if (f > 0) { glow(cam.x(CHEST2[0]), cam.y(CHEST2[1]), 30 * f + 6, P.OR1, P.GA3, f); }
}
// ============================================================================ frame assembly
const SCN_FN = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26, s27];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  SCN_FN[sceneIndex(t)](t);
  overlays(t);
}
function engineInit() { buildModel(); buildVoxels(); countsAfter(42000); countsAfter(0); }
