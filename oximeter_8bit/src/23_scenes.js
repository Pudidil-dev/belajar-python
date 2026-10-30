'use strict';
// ============================================================================
// SCENE COMPOSITOR: 24 scenes on the music grid (SC_T), one continuous
// journey: the finger and its clip → the fingertip cut open → the LEDs →
// light in tissue → the pulsing artery → blood → hemoglobin → absorption →
// the photodiode → the junction → the signal → the processor → the number.
// Worlds join through lens portals (the next scale opens in a growing circle
// where the camera dives; a shrinking circle when we pull back out), X-ray
// dissolves and continuous pans.
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
function dissolveWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (bay(x, y) < k) buf[i] = TMPBUF[i]; }
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const T = i => SC_T[i];                                   // scene start (0-based index)
// ============================================================================ the clip's state over the film
function clipState(t) {
  let open = 0;
  if (t < 0.085) open = 1 - (t / 0.085) ** 2;
  else if (t < 0.3) open = -0.05 * Math.sin((t - 0.085) * 40) * Math.exp(-(t - 0.085) * 14);
  if (t > 61.72) open = backOut(seg(t, 61.72, 62.0), 0.8);   // springs open into frame one
  const on = t > 0.34 && t < 61.55, boot = t < 1.879 ? (t < 0.34 ? 0 : t < 0.94 ? 0.25 : 0.75) : 0;
  const bp = beatPhase(t), beat = t > 0.9 ? Math.max(0, 1 - bp / 0.28) : 0;
  let k98 = 1;
  if (t >= 1.879 && t < 2.3) k98 = 1 + 0.5 * (1 - backOut(seg(t, 1.879, 2.2), 1.6));
  if (t >= 50.727 && t < 51.15) k98 = 1 + 0.6 * (1 - backOut(seg(t, 50.727, 51.05), 1.6));
  const glow = !on ? 0 : 0.72 * (1 - 0.3 * pleth(t)) * (0.86 + 0.14 * Math.sin(t * 41));
  return { open, glow, disp: { on, boot, k98, beat, wave: t < 0.94 ? 0 : 1 } };
}
// ============================================================================ S01-S03: the hook
// the snap kicks the frame (3.5 % punch), then the camera settles upward toward the display
const CAM01_END = [-2, 53.5, 3.0];
function cam01(t) {
  const u = smooth(seg(t, 0.2, T(1)));
  return new Cam(lerp(-3, CAM01_END[0], u), lerp(58, CAM01_END[1], u), 3.0 * (1 + 0.035 * Math.max(0, 1 - t / 0.25)), CX, CY);
}
function s01(t) {
  macroScene(cam01(t), t, clipState(t));
}
function cam02(t) { return camTrack([[T(1), ...CAM01_END], [T(2), 11, 13, 4.4, K50]], t); }
function s02(t) {
  const cam = cam02(t);
  macroScene(cam, t, clipState(t));
  tag('SpO₂ = BLOOD OXYGEN LEVEL', cam.x(20), cam.y(-1.8), 20, 96, T(1) + 0.3, T(2) - 0.1, t, P.DY1);
}
function cam03(t) { return camTrack([[T(2), 11, 13, 4.4], [T(2) + 0.5, 0, 13.2, 11.5, K75], [T(3), -0.4, 13.0, 12.0, lin]], t); }
// red / infrared photon bursts: list of [emission time, kind]
function burstsDraw(cam, t, list, n) {
  let hit = 0;
  list.forEach(([tE, kind], i) => {
    const age = t - tE; if (age < -0.02 || age > 1.6) return;
    hit = Math.max(hit, photonBurst(cam, kind, tE, t, i * 7, n || 16));
  });
  return hit;
}
function lightState(t, list) {     // LED brightness and the light glow from the most recent bursts
  let ledR = 0, ledIR = 0, gR = 0, gI = 0;
  for (const [tE, kind] of list) { const a = t - tE; if (a < 0) continue; const led = a < 0.16 ? 1 - a / 0.16 : 0, g = a < 0.9 ? Math.exp(-a * 3.2) : 0; if (kind === 'red') { ledR = Math.max(ledR, led); gR = Math.max(gR, g); } else { ledIR = Math.max(ledIR, led); gI = Math.max(gI, g); } }
  return { ledR, ledIR, gR, gI };
}
const B03 = [[bt(9), 'red'], [bt(10), 'ir'], [bt(11), 'red'], [bt(11.5), 'ir']];
function cutWithLight(cam, t, list, o) {
  o = o || {};
  const ls = lightState(t, list);
  const st = Object.assign({ v: pleth(t), ledR: ls.ledR, ledIR: ls.ledIR, pdHit: 0 }, o);
  cutawayScene(cam, t, st);
  if (ls.gR > 0.02) lightGlow(cam, 'red', ls.gR * (o.glowK || 0.75));
  if (ls.gI > 0.02) lightGlow(cam, 'ir', ls.gI * (o.glowK || 0.75));
  const hit = burstsDraw(cam, t, list, o.n || 16);
  if (hit > 0.02) glow(cam.x(-9.55), cam.y(PD_C[1]), Math.min(1.1 * cam.z, 40) * (0.7 + 0.5 * hit), P.PD2, P.PD4, hit);
  drawLedPackage(cam, t, st);
  return hit;
}
function s03(t) {
  const cam = cam03(t), xr = ph(t, T(2) + 0.18, T(2) + 0.5);
  if (xr < 1) macroScene(cam, t, clipState(t));
  if (xr > 0) dissolveWorld(() => { cutWithLight(cam, t, B03, { glowK: 0.9 }); for (const [tE, kind] of B03.slice(0, 2)) beamFlash(cam, kind, tE, t); }, xr);
  tag('RED', cam.x(LED_R[0]), cam.y(LED_R[1]), 270, 150, bt(9) + 0.05, T(3) - 0.05, t, P.LR4);
  tag('INFRARED', cam.x(LED_IR[0]), cam.y(LED_IR[1]), 236, 420, bt(10) + 0.05, T(3) - 0.05, t, P.IR4);
}
// ============================================================================ S04: the LEDs
function cam04(t) { return camTrack([[T(3), -0.4, 13.0, 12.0], [T(3) + 0.52, 10.3, 12.8, 34, K75], [T(4), 10.25, 12.8, 37, lin]], t); }
function s04(t) {
  const cam = cam04(t);
  const slot = Math.floor((t - T(3)) / E8) % 3, k = ((t - T(3)) / E8) % 1;
  const on = 1 - k * 0.55;
  cutawayScene(cam, t, { v: pleth(t), ledR: slot === 0 ? on : 0, ledIR: slot === 1 ? on : 0, pdHit: 0 });
  // a short cone of light leaving the lit LED into the nail
  if (slot < 2) {
    const c = slot === 0 ? LED_R : LED_IR, col = slot === 0 ? P.LR3 : P.IR3, x0 = cam.x(9.55), y0 = cam.y(c[1]);
    for (let i = -3; i <= 3; i++) { const a = Math.PI + i * 0.12, L = (60 + 20 * Math.cos(i)) * on; line(x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, col, 0.7); }
  }
  tag('RED LED  660 nm', cam.x(10.34), cam.y(LED_R[1]), 196, 150, T(3) + 0.6, T(4) - 0.05, t, P.LR4);
  tag('INFRARED LED  940 nm', cam.x(10.34), cam.y(LED_IR[1]), 150, 452, T(3) + 0.85, T(4) - 0.05, t, P.IR4);
  // the time slots: red, infrared, dark — taking turns (slowed down)
  if (t > T(3) + 1.0) {
    const y = 404, a = ph(t, T(3) + 1.0, T(3) + 1.2);
    for (let i = 0; i < 3; i++) { const x = 30 + i * 52, c = [P.LR3, P.IR3, P.N4][i], lit = slot === i; rect(x, y, x + 46, y + 16 * a, lit ? c : P.N2); frame(x, y, x + 46, y + Math.max(2, 16 * a), c); }
    label('RED  IR  OFF', 34, 426, T(3) + 1.1, T(4), t, P.SUB);
    label('TAKING TURNS (SLOWED DOWN)', 30, 382, T(3) + 1.2, T(4), t, P.INK);
  }
}
// ============================================================================ S05: light through tissue
const B05 = [[bt(16), 'red'], [bt(17), 'ir'], [bt(18), 'red'], [bt(19), 'ir'], [bt(19.5), 'red']];
function cam05(t) { return camTrack([[T(4), 10.25, 12.8, 37], [T(4) + 0.55, 0, 13.4, 11.5, K75], [T(5), 0, 13.6, 11.8, lin]], t); }
function s05(t) {
  const cam = cam05(t);
  cutWithLight(cam, t, B05, { glowK: 0.9, n: 18 });
  tag('NAIL', cam.x(7.9), cam.y(7), 300, 120, T(4) + 0.6, T(5) - 0.05, t);
  tag('BONE', cam.x(1.6), cam.y(22), 250, 470, T(4) + 0.8, T(5) - 0.05, t);
  tag('SKIN & TISSUE', cam.x(-6.5), cam.y(4.5), 30, 104, T(4) + 1.0, T(5) - 0.05, t);
}
// ============================================================================ S06: the arterial pulse
function cam06(t) { return camTrack([[T(5), 0, 13.6, 11.8], [T(5) + 0.7, -5.4, 15.5, 21, K75], [T(6), -5.0, 14.6, 23, lin]], t); }
function s06(t) {
  const cam = cam06(t);
  cutawayScene(cam, t, { v: pleth(t) * 1.6, ledR: 0, ledIR: 0, pdHit: 0 });
  // the heartbeat: a pixel heart that pumps with each beat
  const hk = Math.max(0, 1 - beatPhase(t) / 0.3), hx = 304, hy = 132;
  heartIcon(hx, hy, 9 * (1 + 0.28 * hk), hk > 0.2 ? P.LR3 : P.LR2);
  label('HEARTBEAT', 254, 152, T(5) + 0.4, T(6), t, P.SUB);
  tag('ARTERY: PULSES', cam.x(-4.75 + 0.9), cam.y(30), 170, 360, T(5) + 0.8, T(6) - 0.05, t, P.AR4);
  tag('VEIN: STEADY', cam.x(-6.85 - 0.6), cam.y(36), 30, 440, T(5) + 1.3, T(6) - 0.05, t, P.VD4);
}
// ============================================================================ S07: into the blood, into a red cell
function cam07(t) { return camTrack([[T(6), -5.0, 14.6, 23], [T(6) + 0.45, -4.62, 14.6, 70, K75]], t); }
function s07(t) {
  const t0 = T(6), tA = t0 + 0.42, tB = t0 + 0.98, tC = t0 + 1.4;
  if (t < tA + 0.05) {
    const cam = cam07(t);
    cutawayScene(cam, t, { v: pleth(t) * 1.6, ledR: 0, ledIR: 0, pdHit: 0 });
    const ac = ART.at(distPath(ART, -4.62, 14.6)[1]);
    lensComposite(() => drawVessel(new Cam(0, 0, lerp(0.55, 1.0, ph(t, t0, tA)), CX, CY), t, { swell: pleth(t) }), cam.x(ac[0]), cam.y(ac[1]), lensIn(t, t0 + 0.05, tA));
    return;
  }
  if (t < tB) {
    const z = lerp(1.0, 1.9, ph(t, tA, tB, K75));
    drawVessel(new Cam(0, 0, z, CX, CY), t, { swell: pleth(t) });
    tag('RED BLOOD CELLS', 150, 300, 30, 120, tA + 0.08, tB, t, P.RB5);
    lensComposite(() => rbcInterior(new Cam(0, 0, lerp(0.55, 1.0, ph(t, tB - 0.38, tB)), CX, CY), t, {}), CX, CY, lensIn(t, tB - 0.4, tB));
    return;
  }
  const cam = new Cam(0, 0, lerp(1.0, 1.12, ph(t, tB, T(7))), CX, CY);
  rbcInterior(cam, t, {});
  // label the big hemoglobin nearest the upper middle, and a free O2 nearest the lower right
  let best = null, bd = 1e9;
  for (const h of HBF) { if (h.z < 0.85 || h.o2 < 4) continue; const hx = cam.x(h.x + 9 * Math.sin(t * 0.8 + h.ph)), hy = cam.y(h.y + 7 * Math.cos(t * 0.7 + h.ph)), d = Math.hypot(hx - 170, hy - 250); if (d < bd) { bd = d; best = [hx, hy]; } }
  if (best) tag('HEMOGLOBIN', best[0], best[1], 40, 120, tB + 0.05, T(7), t, P.OH4);
  let ob = null, od = 1e9;
  for (let i = 0; i < 14; i++) { const x = cam.x((hash(i + 3300) - 0.5) * 420 + 30 * Math.sin(t * 1.1 + i)), y = cam.y((hash(i + 3301) - 0.5) * 700 - 20 * Math.cos(t * 0.9 + i)), d = Math.hypot(x - 250, y - 380); if (d < od) { od = d; ob = [x, y]; } }
  if (ob) tag('O₂', ob[0], ob[1], ob[0] + 24, ob[1] + 40, tC, T(7), t, P.OX3);
}
// ============================================================================ S08-S09: oxy vs deoxy, absorption
function hbPairWorld(t, lift) {
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.35);
  for (let i = 0; i < 12; i++) { const x = (hash(i + 4400) * 400 - 20 + 6 * Math.sin(t * 0.7 + i)), y = hash(i + 4401) * 640; hbSprite(x, y, 16, i, 0, t, { col: 'oxy', glow: 0 }); rect(x - 16, y - 16, x + 16, y + 16, P.BG, 0.7); }
  rect(179, 90, 181, 560, P.N3);
  return lerp(300, 214, lift);
}
function nO2At(t) { const t0 = T(7) + 0.12; let n = 0; for (let i = 0; i < 4; i++) n += clamp((t - t0 - i * E8) / 0.16, 0, 1); return n; }
function s08pair(t, y) {
  hbSprite(90, y + 4 * Math.sin(t * 2.3), 72, 0.15 + 0.2 * Math.sin(t * 0.8), nO2At(t), t, { col: 'oxy' });
  hbSprite(270, y + 4 * Math.sin(t * 1.9 + 1.4), 72, -0.1 + 0.2 * Math.sin(t * 0.7 + 1), 0, t, { col: 'deoxy' });
  o2Mol(270 + 90 * Math.cos(t * 1.3), y - 110 + 20 * Math.sin(t * 1.7), 6, t, 0.3);
  label('OXYHEMOGLOBIN', 90, y + 100, T(7) + 0.35, T(8) - 0.05, t, P.OH4, 'center');
  label('DEOXYHEMOGLOBIN', 270, y + 100, T(7) + 0.6, T(8) - 0.05, t, P.DH5, 'center');
  label('4 × O₂ BOUND', 90, y + 122, T(7) + 0.9, T(8) - 0.05, t, P.OX3, 'center');
  label('NO O₂', 270, y + 122, T(7) + 1.1, T(8) - 0.05, t, P.SUB, 'center');
}
function s08(t) {
  const k = ph(t, T(7), T(7) + 0.3);
  if (k < 1) { rbcInterior(new Cam(0, 0, 1.12 + 0.3 * k, CX, CY), t, {}); dissolveWorld(() => { const y = hbPairWorld(t, 0); s08pair(t, y); }, k); return; }
  const y = hbPairWorld(t, 0); s08pair(t, y);
}
// absorption: photons rain down on each molecule; absorbed ones stop and flash
const ABS_DEMO = { red: [0.1, 1.0], ir: [0.45, 0.26] };    // fraction absorbed: [oxy, deoxy] (relative, from 660/940 nm extinction)
function rain(t, tS, kind, cx, yMol, frac, seed) {
  const cols = kind === 'red' ? [P.LR1, P.LR3, P.LR5] : [P.IR1, P.IR3, P.IR5];
  const n = 14, v = 520;
  for (let i = 0; i < n; i++) {
    const t0 = tS + i * 0.07 + 0.03 * hash(seed + i), age = t - t0; if (age < 0) continue;
    const x = cx + (hash(seed + i + 40) - 0.5) * 70, absorbed = hash(seed + i + 80) < frac;
    const yHit = yMol - 30 + hash(seed + i + 120) * 40, y = 70 + age * v;
    if (absorbed && y > yHit) { const a2 = (y - yHit) / v; if (a2 < 0.2) flash(x, yHit, 6, 1 - a2 / 0.2, [cols[0], cols[1], cols[2], P.C6]); continue; }
    if (y > yMol + 150) continue;
    const fade = y > yMol + 70 ? 1 - (y - yMol - 70) / 80 : 1;
    for (let k = 0; k < 4; k++) disc(x, y - k * 6, 3.4 - k * 0.6, cols[k === 0 ? 2 : 1], (k === 0 ? 1 : 0.6) * fade);
  }
}
function absBars(t, k, yB) {
  // two groups: red 660 nm and infrared 940 nm; each: oxy bar, deoxy bar (normalised within the group)
  const g = [['RED 660 nm', P.LR4, [319.6, 3226.56]], ['IR 940 nm', P.IR4, [1214, 693.44]]];
  g.forEach(([name, col, v], gi) => {
    const x0 = 40 + gi * 170, mx = Math.max(v[0], v[1]), kk = clamp(k * 2 - gi, 0, 1);
    text(FS, name, x0, yB - 112, { sc: 2, c: col, ol: null, n: kk * 12 });
    for (let j = 0; j < 2; j++) {
      const h = 90 * v[j] / mx * kk, bx = x0 + j * 54;
      rect(bx, yB - h, bx + 40, yB, j === 0 ? P.OH2 : P.DH2); rect(bx, yB - h, bx + 40, yB - h + 2, j === 0 ? P.OH4 : P.DH4);
      text(FS, j === 0 ? 'OXY' : 'DEOXY', bx + 20, yB + 6, { sc: 2, c: P.SUB, ol: null, align: 'center' });
    }
  });
  text(FS, 'HOW MUCH LIGHT IS ABSORBED', 40, yB - 132, { sc: 1, c: P.SUB, ol: null });
}
function s09(t) {
  const lift = ph(t, T(8), T(8) + 0.4), y = hbPairWorld(t, lift);
  const tR = T(8) + 0.2, tI = T(8) + 1.45;
  if (t > tR && t < tI + 0.1) { rain(t, tR, 'red', 90, y, ABS_DEMO.red[0], 10); rain(t, tR, 'red', 270, y, ABS_DEMO.red[1], 60); }
  if (t > tI) { rain(t, tI, 'ir', 90, y, ABS_DEMO.ir[0], 110); rain(t, tI, 'ir', 270, y, ABS_DEMO.ir[1], 160); }
  hbSprite(90, y, 58, 0.15 + 0.2 * Math.sin(t * 0.8), 4, t, { col: 'oxy' });
  hbSprite(270, y, 58, -0.1 + 0.2 * Math.sin(t * 0.7 + 1), 0, t, { col: 'deoxy' });
  label('OXY', 90, y - 86, T(8), T(9), t, P.OH4, 'center'); label('DEOXY', 270, y - 86, T(8), T(9), t, P.DH5, 'center');
  absBars(t, ph(t, T(8) + 0.5, T(9) - 0.6), 470);
  tag('DEOXY ABSORBS MORE RED', 270, y + 30, 120, y + 84, tR + 0.4, tI - 0.05, t, P.LR4);
  tag('OXY ABSORBS MORE INFRARED', 90, y + 30, 40, y + 84, tI + 0.4, T(9) - 0.05, t, P.IR4);
}
// ============================================================================ S10: pulsing blood changes the light that gets through
const B10 = []; for (let i = 0; i < 16; i++) B10.push([bt(44 + i * 0.5), i % 2 ? 'ir' : 'red']);
function cam10(t) { return camTrack([[T(9), -4.6, 14.5, 26], [T(9) + 0.8, -0.6, 13.6, 11.6, K75], [T(10), -0.8, 13.6, 11.9, lin]], t); }
function s10(t) {
  const cam = cam10(t);
  cutWithLight(cam, t, B10, { v: pleth(t) * 1.6, glowK: 0.55, n: 12 });
  // reverse lens: the molecules shrink back into the artery
  const r = lensOut(t, T(9), T(9) + 0.45);
  if (r > 0.5) { const ac = ART.at(distPath(ART, -4.62, 14.6)[1]); lensComposite(() => { const y = hbPairWorld(t, 1); hbSprite(90, y, 58, 0.15, 4, t, { col: 'oxy' }); hbSprite(270, y, 58, -0.1, 0, t, { col: 'deoxy' }); }, cam.x(ac[0]), cam.y(ac[1]), r); }
  // live trace of the light reaching the photodiode (more blood -> less light)
  const k = ph(t, T(9) + 0.7, T(9) + 1.1);
  if (k > 0) {
    const x0 = 22, x1 = 338, y0 = 96, y1 = 176, sx = u => lerp(x0 + 6, x1 - 8, u), sy = tt => y0 + 24 + 110 * M_IR * EXG * pleth(tt);
    rect(x0, y0, x1, y1, P.K0, 0.75 * k); frame(x0, y0, x1, y1, P.N4);
    text(FS, 'LIGHT REACHING THE PHOTODIODE', x0 + 6, y0 + 5, { sc: 1, c: P.SG3, ol: null });
    let px_ = null, py_ = null;
    const n = 80;
    for (let i = 0; i <= n; i++) { const u = i / n * k, tt = t - (k - u) * 2.8, xx = sx(u), yy = sy(tt); if (px_ !== null) lineW(px_, py_, xx, yy, 2, P.SG2); px_ = xx; py_ = yy; }
    disc(px_, py_, 3, P.SG3);
    const tb = t - beatPhase(t) + 0.17;
    if (t > tb) { const xx = sx(k - (t - tb) / 2.8); ring(xx, sy(tb), 6, 2, P.DY1); }
    tag('MORE BLOOD = LESS LIGHT', x1 - 140, y1 - 30, 150, y1 + 30, T(9) + 1.3, T(10) - 0.05, t, P.DY1);
  }
}
// ============================================================================ S11: the photodiode
function cam11(t) { return camTrack([[T(10), -0.8, 13.6, 11.9], [T(10) + 0.65, -9.6, 12.8, 30, K75]], t); }
const B11 = []; for (let i = 0; i < 8; i++) B11.push([bt(52 + i * 0.5), i % 2 ? 'ir' : 'red']);
function s11(t) {
  const tL = T(10) + 0.95, tL1 = tL + 0.42;
  if (t < tL1) {
    const cam = cam11(t);
    cutWithLight(cam, t, B11, { glowK: 0.5, n: 14 });
    tag('PHOTODIODE', cam.x(-9.7), cam.y(PD_C[1]), 40, 420, T(10) + 0.5, tL, t, P.PD4);
    lensComposite(() => photodiodeFace(new Cam(0, 0, lerp(0.5, 1.0, ph(t, tL, tL1)), CX, CY), t, { lit: 0 }), cam.x(-9.7), cam.y(PD_C[1]), lensIn(t, tL, tL1));
    return;
  }
  const cam = new Cam(0, 0, lerp(1.0, 1.1, ph(t, tL1, T(11))), CX, CY);
  const slot = Math.floor((t - T(10)) / E8) % 3, lit = Math.max(0, 1 - ((t - T(10)) % E8) / 0.12) * (slot < 2 ? 1 : 0);
  photodiodeFace(cam, t, { lit: lit * 0.5 });
  if (slot < 2) for (let i = 0; i < 9; i++) { const x = cam.x(-80 + 160 * hash(i + Math.floor(t / E8) * 13)), y = cam.y(-90 + 165 * hash(i + 50 + Math.floor(t / E8) * 7)); disc(x, y, 3.5, slot === 0 ? P.LR4 : P.IR4); disc(x, y, 1.5, P.C6); }
  tag('PHOTODIODE', cam.x(-60), cam.y(-60), 30, 110, tL1, T(11) - 0.05, t, P.PD4);
  tag('CATCHES THE LIGHT THAT GOT THROUGH', cam.x(40), cam.y(40), 20, 450, tL1 + 0.5, T(11) - 0.05, t, P.INK);
}
// ============================================================================ S12: light becomes current
const JC = new Cam(0, 0, 1, CX, CY);
const EV12 = []; for (let i = 0; i < 6; i++) EV12.push([bt(58 + i * 0.5) + 0.05, i % 2 ? 'ir' : 'red', -80 + ((i * 97) % 250)]);
function drawJ12(t) {
  junctionScene(JC, t, { current: Math.min(1, 0.25 + 0.15 * EV12.filter(e => t > e[0] + 0.32).length) });
  EV12.forEach(([tE, kind, ay], i) => photoEvent(JC, t, tE, ay, kind, i * 11 + 3));
  label('n', JC.x(-96), JC.y(JN.y0 + 10), T(11) + 0.3, T(12), t, P.NT2, null, FC);
  label('p', JC.x(88), JC.y(JN.y0 + 10), T(11) + 0.3, T(12), t, P.PT2, null, FC);
  label('LIGHT', 350, JC.y(JN.y1 - 30), T(11) + 0.5, T(12), t, P.LR4, 'right');
}
function s12(t) {
  const tL1 = T(11) + 0.45;
  if (t < tL1) {
    photodiodeFace(new Cam(0, 0, lerp(1.1, 1.8, ph(t, T(11), tL1)), CX, CY), t, { lit: 0 });
    lensComposite(() => drawJ12(t), CX, CY, lensIn(t, T(11), tL1));
    return;
  }
  drawJ12(t);
  tag('ELECTRON', JC.x(-60), JC.y(EV12[2][2]), 40, 470, bt(59) + 0.5, T(12) - 0.05, t, P.SG2);
  tag('CURRENT TO THE AMPLIFIER', JC.x(-10), JC.y(JN.y0 - 56), 60, 96, bt(60), T(12) - 0.05, t, P.SG3);
}
// ============================================================================ S13-S16, S18-S19: the signal (one vertical scope)
function sigWorld(cam, t, o) {
  o = o || {};
  sgBG(cam, t);
  sgRaw(cam, t, o.rawK === undefined ? 1 : o.rawK);
  sgSplit(cam, t, 1, o.sep === undefined ? 1 : o.sep);
  sgChannels(cam, t, 1);
  sgRatio(cam, t, o.ratio === undefined ? 1 : o.ratio);
  sgCalib(cam, t, o.calK === undefined ? 1 : o.calK, o.mk === undefined ? 1 : o.mk);
  sgPulseRate(cam, t, 1);
}
const SGY = { raw: 160, split: 700, chan: 1290, ratio: 1880, cal: 2440, pr: 2980 };
function s13(t) {
  const sl = t - T(12), z = 1 + 0.16 * Math.max(0, 1 - sl / 0.2);
  const cam = new Cam(0, SGY.raw, z, CX, CY);
  sigWorld(cam, t, { rawK: ph(t, T(12), T(12) + 0.45, eout), sep: 0, ratio: 0, calK: 0, mk: 0 });
  // most of the light is steady (DC); the pulse is a small dip (AC)
  if (t > T(12) + 0.6) {
    const a = ph(t, T(12) + 0.6, T(12) + 0.9), xa = cam.x(-140), ya0 = cam.y(260), ya1 = cam.y(lerp(260, 262 - 200 * (1 - M_IR * EXG * 0.3), a));
    lineW(xa, ya0, xa, ya1, 2, P.DT3); arrowHead(xa, ya1 - 2, -Math.PI / 2, 6, P.DT3);
    label('STEADY: SKIN, BONE, VEINS', cam.x(-128), cam.y(150), T(12) + 0.8, T(13) - 0.05, t, P.DT3);
  }
  const tb = t - beatPhase(t) + 0.17, xb = cam.x(lerp(-160, 160, 1 - (t - tb) / SG.win));
  tag('DIPS: ARTERIAL PULSE', xb, cam.y(rawY(tb, 260, 200)) + 4, 150, cam.y(205), T(12) + 1.2, T(13) - 0.05, t, P.SG2);
}
function s14(t) {
  const cam = camTrack([[T(13), 0, SGY.raw, 1], [T(13) + 0.45, 0, SGY.split, 1, K75]], t);
  const sep = ph(t, T(13) + 0.55, T(13) + 1.3);
  sigWorld(cam, t, { sep, ratio: 0, calK: 0, mk: 0 });
  const dcY = 560 + 70 - 10 * sep, acY = 560 + 70 + 150 * sep;
  tag('DC: STEADY PART', cam.x(100), cam.y(dcY), 160, cam.y(dcY) - 44, T(13) + 1.3, T(14) - 0.05, t, P.DT3);
  tag('AC: THE PULSE (ZOOMED IN)', cam.x(-60), cam.y(acY + 20), 30, cam.y(acY) + 90, T(13) + 1.5, T(14) - 0.05, t, P.SG2);
  label('ONLY ~2% OF THE LIGHT', 30, 112, T(13) + 1.9, T(14) - 0.05, t, P.DY1);
}
function s15(t) {
  const cam = camTrack([[T(14), 0, SGY.split, 1], [T(14) + 0.45, 0, SGY.chan, 1, K75]], t);
  sigWorld(cam, t, { ratio: 0, calK: 0, mk: 0 });
  label('RED SIGNAL', 30, cam.y(1120 + 150 - 120 * 0.15) - 34, T(14) + 0.5, T(15) - 0.05, t, P.LR4);
  label('INFRARED SIGNAL', 30, cam.y(1120 + 330 - 120 * 0.15) - 34, T(14) + 0.75, T(15) - 0.05, t, P.IR4);
  tag('ONE DETECTOR, TIMED FLASHES', cam.x(-100), cam.y(1120), 40, cam.y(1120) + 34, T(14) + 1.1, T(15) - 0.05, t, P.INK);
}
// lands on the bars, then creeps in toward the ratio while the AC bars pump with the pulse
const CAM16_END = [0, SGY.ratio + 24, 1.07];
function cam16(t) { return camTrack([[T(15), 0, SGY.chan, 1], [T(15) + 0.45, 0, SGY.ratio, 1, K75], [T(16), ...CAM16_END, smooth]], t); }
function s16(t) {
  const cam = cam16(t);
  const k = ph(t, T(15) + 0.4, T(15) + 1.0);
  sigWorld(cam, t, { ratio: k, calK: 0, mk: 0 });
  const y0 = cam.y(1680);
  // pinned to the bars (world space) so the creep carries them along
  label('AC ÷ DC', cam.x(-142), cam.y(2008), T(15) + 1.0, T(16) - 0.05, t, P.LR4); label('= 0.96%', cam.x(-142), cam.y(2008) + 16, T(15) + 1.05, T(16) - 0.05, t, P.LR4);
  label('AC ÷ DC', cam.x(74), cam.y(2008), T(15) + 1.2, T(16) - 0.05, t, P.IR4); label('= 2.0%', cam.x(74), cam.y(2008) + 16, T(15) + 1.25, T(16) - 0.05, t, P.IR4);
  if (t > T(15) + 1.6) {
    const a = ph(t, T(15) + 1.6, T(15) + 1.9, eout);
    text(FC, '0.96 ÷ 2.0', CX, y0 + 140 + 6 * (1 - a), { sc: 2, c: P.INK, ol: P.SH, align: 'center', n: (t - T(15) - 1.6) * 30 });
    if (t > T(15) + 2.1) text(FC, 'R ≈ 0.48', CX, y0 + 172, { sc: 3, c: P.DY1, ol: P.SH, align: 'center', n: (t - T(15) - 2.1) * 30 });
  }
}
// ============================================================================ S17: processing on the circuit board
function s17(t) {
  const t0 = T(16), tR = t0 + 0.45;
  const pcam = camTrack([[t0, 66, -78, 3.2], [t0 + 0.75, 0, 28, 1.0, K75], [T(17), -6, 36, 1.05, lin]], t);
  const flow = ph(t, t0 + 0.6, T(17) - 0.5, lin);
  pcbScene(pcam, t, { flow });
  const r = lensOut(t, t0, tR);
  if (r > 0.5) lensComposite(() => sigWorld(new Cam(CAM16_END[0], CAM16_END[1], lerp(CAM16_END[2], 0.5, ph(t, t0, tR)), CX, CY), t, { calK: 0, mk: 0 }), pcam.x(66), pcam.y(-78), r);
  const C = CHIPS_PCB;
  tag('AMPLIFIER', pcam.x(C.amp.x), pcam.y(C.amp.y), 150, pcam.y(C.amp.y) + 50, t0 + 0.9, T(17) - 0.05, t, P.SG3);
  tag('ANALOG → DIGITAL', pcam.x(C.adc.x), pcam.y(C.adc.y), 140, pcam.y(C.adc.y) + 60, t0 + 1.6, T(17) - 0.05, t, P.DT3);
  tag('ALGORITHM', pcam.x(C.mcu.x), pcam.y(C.mcu.y), 40, pcam.y(C.mcu.y) - 70, t0 + 2.3, T(17) - 0.05, t, P.DT4);
  tag('LED DRIVER', pcam.x(C.drv.x), pcam.y(C.drv.y), 30, pcam.y(C.drv.y) - 54, t0 + 2.8, T(17) - 0.05, t, P.IR4);
}
// ============================================================================ S18-S19: estimate, pulse rate
function s18(t) {
  const t0 = T(17), tL = t0 + 0.3, tL1 = t0 + 0.68;
  if (t < tL1) {
    const pcam = camTrack([[t0, -6, 36, 1.05], [tL1, 66, -78, 3.4, K75]], t);
    pcbScene(pcam, t, { flow: 1 });
    lensComposite(() => sigWorld(new Cam(0, SGY.cal, lerp(0.5, 1.0, ph(t, tL, tL1)), CX, CY), t, { calK: 0, mk: 0 }), pcam.x(66), pcam.y(-78), lensIn(t, tL, tL1));
    return;
  }
  const cam = new Cam(0, SGY.cal, lerp(1.0, 1.04, ph(t, tL1, T(18))), CX, CY);
  const calK = ph(t, tL1, tL1 + 0.6), mk = ph(t, tL1 + 0.7, tL1 + 1.6, lin);
  sigWorld(cam, t, { calK, mk });
  tag('CALIBRATION CURVE', cam.x(-130 + (0.9 - 0.3) / 1.2 * 280), cam.y(2240 + 340 - (110 - 25 * 0.9 - 70) / 30 * 300), 170, cam.y(2240) + 230, tL1 + 0.3, T(18) - 0.05, t, P.DT3);
  label('BUILT FROM VOLUNTEER STUDIES', 34, cam.y(2240) - 18, tL1 + 0.8, T(18) - 0.05, t, P.SUB);
  if (mk >= 1) { const a = ph(t, tL1 + 1.6, tL1 + 1.9, eout); text(FC, 'R 0.48 → 98%', CX + 30, cam.y(2240) + 80 + 8 * (1 - a), { sc: 2, c: P.DY1, ol: P.SH, align: 'center', n: (t - tL1 - 1.6) * 30 }); }
}
function s19(t) {
  const cam = camTrack([[T(18), 0, SGY.cal, 1.04], [T(18) + 0.45, 0, SGY.pr, 1, K75]], t);
  sigWorld(cam, t, {});
  const pk = 0.17, n1 = Math.floor((t - pk) / HB), tp1 = n1 * HB + pk, tp0 = tp1 - HB;
  const X = tp => cam.x(lerp(-160, 160, 1 - (t - tp) / SG.win)), yb = cam.y(2800 + 260);
  if (t > T(18) + 0.6 && t - tp0 < SG.win) {
    const x0 = X(tp0), x1 = X(tp1);
    line(x0, yb, x1, yb, P.DY1); line(x0, yb - 5, x0, yb + 5, P.DY1); line(x1, yb - 5, x1, yb + 5, P.DY1);
    text(FS, '0.94 s', (x0 + x1) / 2, yb + 8, { sc: 2, c: P.DY1, ol: null, align: 'center' });
  }
  if (t > T(18) + 1.0) text(FC, '60 ÷ 0.94 s ≈ 64 / min', CX, cam.y(2800) + 300, { sc: 2, c: P.INK, ol: P.SH, align: 'center', n: (t - T(18) - 1.0) * 30 });
  if (t > T(18) + 1.6) text(FC, 'PR 64', CX, cam.y(2800) + 18, { sc: 3, c: P.DC1, ol: P.SH, align: 'center', n: (t - T(18) - 1.6) * 20 });
}
// ============================================================================ S20: the result on the display
function cam20(t) { return camTrack([[T(19), 20, 10, 9.0], [T(19) + 0.75, 8, 20, 4.2, K75], [T(20), 6, 22, 4.0, lin]], t); }
function s20(t) {
  const cam = cam20(t);
  macroScene(cam, t, clipState(t));
  const r = lensOut(t, T(19), T(19) + 0.42);
  if (r > 0.5) lensComposite(() => sigWorld(new Cam(0, SGY.pr, lerp(1, 0.6, ph(t, T(19), T(19) + 0.42)), CX, CY), t, {}), cam.x(20.3), cam.y(12), r);
}
// ============================================================================ S21: recap
const RC_POS = [[92, 150], [268, 150], [268, 255], [92, 255], [92, 360], [268, 360], [268, 465], [92, 465]];
function s21(t) {
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const g = 24, off = (t * 12) % g;
  for (let y = -g + off; y < H; y += g) rect(0, y, W, y + 1, P.N2, 0.5);
  for (let k = 0; k < 8; k++) {
    const tk = bt(112 + k), a = pop(t, tk, 0.35); if (a <= 0) continue;
    const [x, y] = RC_POS[k];
    if (k > 0) { const [px_, py_] = RC_POS[k - 1], u = ph(t, tk - 0.12, tk); lineW(px_, py_, lerp(px_, x, u), lerp(py_, y, u), 3, P.DT2); if (u >= 1) arrowHead((px_ + x) / 2 + (x - px_) * 0.12, (py_ + y) / 2 + (y - py_) * 0.12, Math.atan2(y - py_, x - px_), 6, P.DT3); }
    tile(x, y, 44, a, t - tk < 0.25 ? P.DT3 : P.N5);
    if (a > 0.6) RECAP_ICONS[k](x, y, 60 * Math.min(1, a), t);
    if (a > 0.9) text(FS, RECAP_L[k], x, y + 50, { sc: 2, c: P.SUB, ol: P.SH, align: 'center' });
  }
}
// ============================================================================ S22: what it really measures
const B22 = []; for (let i = 0; i < 8; i++) B22.push([bt(120 + i * 0.5), i % 2 ? 'ir' : 'red']);
function cam22(t) { return camTrack([[T(21), -2.4, 13.4, 15], [T(22), -3.4, 13.6, 17, lin]], t); }
function s22(t) {
  const cam = cam22(t);
  cutWithLight(cam, t, B22, { v: pleth(t) * 1.6, glowK: 0.5, n: 12 });
  tag('% OF HEMOGLOBIN WITH O₂', cam.x(-4.7), cam.y(18), 120, 400, T(21) + 0.4, T(22) - 0.05, t, P.AR4);
  label('SATURATION, NOT OXYGEN PRESSURE', 30, 452, T(21) + 0.8, T(22) - 0.05, t, P.SUB);
}
// ============================================================================ S23: an estimate, not a count
function s23(t) {
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.4);
  const yA = 190, yB = 380, C0 = new Cam(0, 0, 1, 0, 0);
  sgPanel(C0, 24, yA - 80, 336, yA + 70, null, P.RED);
  for (let i = 0; i < 6; i++) o2Mol(70 + i * 40 + 6 * Math.sin(t * 2 + i), yA - 10 + 8 * Math.cos(t * 1.7 + i), 7, t + i, 0.25);
  text(FS, 'COUNTING O₂ MOLECULES', 40, yA + 30, { sc: 2, c: P.SUB, ol: null });
  if (t > T(22) + 0.45) crossMark(300, yA - 10, 18 * ph(t, T(22) + 0.45, T(22) + 0.6), P.RED);
  sgPanel(C0, 24, yB - 70, 336, yB + 80, null, P.SG2);
  let px_ = null, py_ = null;
  for (let i = 0; i <= 60; i++) { const u = i / 60, tt = t - (1 - u) * 2.4, xx = 40 + u * 170, yy = yB + 10 - 34 * pleth(tt); if (px_ !== null) lineW(px_, py_, xx, yy, 2, P.SG2); px_ = xx; py_ = yy; }
  text(FC, '≈98%', 290, yB - 22, { sc: 3, c: P.DY1, ol: P.SH, align: 'center' });
  text(FS, 'READING LIGHT → ESTIMATE', 40, yB + 50, { sc: 2, c: P.SUB, ol: null });
  if (t > T(22) + 0.8) checkMark(300, yB + 30, 10 * ph(t, T(22) + 0.8, T(22) + 0.95), P.SG2);
  const k = ph(t, T(22), T(22) + 0.3);
  if (k < 1) dissolveWorld(() => cutawayScene(cam22(T(22)), t, { v: pleth(t) }), 1 - k);
}
// ============================================================================ S24: back to the finger, title, the clip springs open
function cam24(t) { return camTrack([[T(23), 18, 12, 6.0], [T(23) + 1.05, -3, 58, 3.1, K75], [DUR, -3, 58, 3.105, lin]], t); }
function s24(t) {
  macroScene(cam24(t), t, clipState(t));
  const k = ph(t, T(23), T(23) + 0.25);
  if (k < 1) dissolveWorld(() => s23(T(23) - 0.001), 1 - k);
}
const SCN_FN = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  SCN_FN[sceneIndex(t)](t);
  overlays(t);
}
function engineInit() { bakeTissue(); bakeHand(); bakeClipCut(); buildPhotons(); }
