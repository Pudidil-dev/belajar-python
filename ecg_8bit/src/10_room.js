'use strict';
// ============================================================================
// THE WARD (world px, z = 1 → 360 px wide). An original bedside ECG monitor on
// the wall (portrait layout: the Lead II sweep on top, the heart-rate numerics
// below), its cable, and the patient's chest (neck to waist, no face) with a
// simplified three-electrode monitoring set: RA (white clip), LA (black), LL
// (red). The heart sits behind the sternum, slightly to the patient's left.
// ============================================================================
const MON = { x0: 26, y0: 70, x1: 334, y1: 470, scr: [40, 86, 320, 412] };
const ELEC = { RA: [112, 652], LA: [250, 650], LL: [248, 882] };
const YOKE = [296, 596];
const HEART_AT = { x: 192, y: 772, s: 0.4 };          // heart-map origin and scale inside the torso
const WARD_DUST = Array.from({ length: 30 }, (_, i) => ({ x: hash(i * 3 + 21) * 360, y: hash(i * 3 + 22) * 1100, k: 0.3 + hash(i * 3 + 23) * 0.7, ph: hash(i + 700) * TAU }));
function wardBG(cam, t) {
  rect(0, 0, W, H, P.BG);
  const X = v => cam.x(v), Y = v => cam.y(v);
  for (let i = -2; i < 9; i++) { const x = X(i * 64 - 20); rect(x, 0, x + 1, H, P.N1); }
  rect(0, Y(520), W, Y(524), P.N2);                                                     // wall rail
  for (const d of WARD_DUST) { const x = ((d.x + 8 * wob(t, 2, d.ph) - cam.cx * 0.25 * d.k) % 360 + 360) % 360, y = ((d.y - (t / DUR) * 640 * (1 + Math.round(d.k * 2)) - cam.cy * 0.25 * d.k) % 640 + 640) % 640; pset(x, y, d.k > 0.7 ? P.N6 : P.N4); }
}
// ---------------------------------------------------------------- the monitor
function drawMonitor(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // wall arm
  rect(X(160), Y(30), X(200), Y(MON.y0 + 6), P.M5); rect(X(166), Y(30), X(172), Y(MON.y0 + 6), P.M4);
  const mb = maskRR(X(MON.x0), Y(MON.y0), X(MON.x1), Y(MON.y1), 14 * z); shade(mb, P.M1, P.MW, P.M3, P.M4, { k: Math.max(1, Math.round(z)) });
  const [s0, s1, s2, s3] = MON.scr;
  const ms_ = maskRR(X(s0 - 5), Y(s1 - 5), X(s2 + 5), Y(s3 + 5), 5 * z); shade(ms_, P.M6, P.M5, P.K0, P.K0, {});
  // the screen UI is drawn at the opening zoom and scaled with the camera, so its pixel text never jumps in size
  const ui = withCanvas(MON_W, MON_H, () => { rect(0, 0, MON_W, MON_H, P.SC0); monitorUI(0, 0, MON_W, MON_H, t, o); });
  const sx0 = X(s0), sy0 = Y(s1), sw = X(s2) - sx0, sh = Y(s3) - sy0;
  const ca = Math.max(0, Math.floor(sx0)), cb = Math.min(W, Math.ceil(sx0 + sw)), cc = Math.max(0, Math.floor(sy0)), cd = Math.min(H, Math.ceil(sy0 + sh));
  for (let y = cc; y < cd; y++) {
    const v = Math.floor((y + 0.5 - sy0) / sh * MON_H); if (v < 0 || v >= MON_H) continue;
    const row = v * MON_W, ro = y * W;
    for (let x = ca; x < cb; x++) { const u = Math.floor((x + 0.5 - sx0) / sw * MON_W); if (u >= 0 && u < MON_W) buf[ro + x] = ui[row + u]; }
  }
  // buttons, knob, power light
  for (let k = 0; k < 5; k++) { const bx = 52 + k * 38; const m = maskRR(X(bx), Y(424), X(bx + 28), Y(442), 4 * z); shade(m, P.M2, P.MW, P.M3, P.M4, {}); }
  disc(X(292), Y(436), 13 * z, P.M4); disc(X(292), Y(436), 10 * z, P.M2); rect(X(291), Y(426), X(293), Y(433), P.M5);
  disc(X(46), Y(456), 2.5 * z, P.EG2);
  // the cable leaving the bottom right
  rect(X(294), Y(MON.y1 - 4), X(306), Y(MON.y1 + 8), P.M4);
}
// the screen: Lead II sweep (3 s per screen, green), heart rate, a heart icon that pulses on each R peak
const SWEEP = 3.0, MON_Z = 1.12, MON_W = Math.round((MON.scr[2] - MON.scr[0]) * MON_Z), MON_H = Math.round((MON.scr[3] - MON.scr[1]) * MON_Z);
function monitorUI(x0, y0, x1, y1, t, o) {
  const w = x1 - x0, h = y1 - y0, sc = Math.max(1, Math.floor(w / 110));
  // header
  rect(x0, y0, x1, y0 + 9 * sc, P.SC1);
  text(FS, 'ECG', x0 + 4 * sc, y0 + 2 * sc, { sc, c: P.EG2, ol: null });
  text(FS, 'LEAD II', x0 + 24 * sc, y0 + 2 * sc, { sc, c: P.EG3, ol: null });
  text(FS, '25 mm/s', x1 - 4 * sc, y0 + 2 * sc, { sc, c: P.EG1, ol: null, align: 'right' });
  // trace area with a faint grid
  const ty0 = y0 + 12 * sc, ty1 = y0 + h * 0.5, tw = w - 8 * sc, tx0 = x0 + 4 * sc;
  for (let gx = 0; gx <= 10; gx++) rect(tx0 + gx * tw / 10, ty0, tx0 + gx * tw / 10 + 1, ty1, P.SC2);
  for (let gy = 0; gy <= 4; gy++) rect(tx0, lerp(ty0, ty1, gy / 4), tx0 + tw, lerp(ty0, ty1, gy / 4) + 1, P.SC2);
  const base = lerp(ty0, ty1, 0.7), amp = (ty1 - ty0) * 0.52;
  const head = ((t / SWEEP + 0.62) % 1) * tw;
  let px_ = null, py_ = null;
  for (let x = 0; x < tw; x++) {
    const ahead = (x - head + tw) % tw; if (ahead > 0 && ahead < 7 * sc) { px_ = null; continue; }   // the erase bar ahead of the pen
    const tw_ = t - ((head - x + tw) % tw) / tw * SWEEP, v = ecgLive(tw_), y = base - v * amp, sx = tx0 + x;
    if (px_ !== null) lineW(px_, py_, sx, y, Math.max(1.6, sc * 0.9), P.EG2);
    px_ = sx; py_ = y;
  }
  disc(tx0 + head, base - ecgLive(t) * amp, 1.6 * sc, P.EG4);
  // P, QRS and T marked on the most recent full beat (the ending)
  if (o.marks > 0) {
    const rp = o.markR;                                   // one fixed beat, so the marks never hop
    if (rp !== undefined && t - rp > 0.42 && t - rp < SWEEP * 0.98) {
      const xr = tx0 + head - (t - rp) / SWEEP * tw, xx = x => x < tx0 ? x + tw : x, yy = ms => base - ecgMV(ms) * amp;
      const mk = (s, dms, c, dx, dy, al) => { const x = xx(xr + dms / 1000 / SWEEP * tw); text(FC, s, x + dx * sc, yy(dms + R_MS) - dy * sc, { sc, c, ol: P.SH, align: al || 'center', n: o.marks * 4 }); };
      mk('P', -155, P.SA2, 0, 16); mk('QRS', 0, P.EG4, 5, -4, 'left'); mk('T', 195, P.KK1, 0, 16);
    }
  }
  // numerics
  const ny = ty1 + 6 * sc;
  rect(x0 + 3 * sc, ny, x1 - 3 * sc, y1 - 3 * sc, P.SC1);
  text(FS, 'HR', x0 + 8 * sc, ny + 5 * sc, { sc, c: P.EG2, ol: null });
  text(FS, 'bpm', x0 + 8 * sc, ny + 14 * sc, { sc, c: P.EG1, ol: null });
  text(FC, String(HR), x0 + 34 * sc, ny + 4 * sc, { sc: 4 * sc, c: P.EG2, ol: null });
  // heart icon: grows a little on each R peak (no flash)
  const lastR = rPeaks(t - 0.4, t + 1e-6).pop(), pk = lastR === undefined ? 0 : Math.exp(-(t - lastR) * 9), hs = sc * (3 + 1.2 * pk), hx = x1 - 22 * sc, hy = ny + 16 * sc;
  disc(hx - hs * 0.55, hy - hs * 0.2, hs * 0.62, P.EG2); disc(hx + hs * 0.55, hy - hs * 0.2, hs * 0.62, P.EG2); poly([hx - hs * 1.12, hy, hx + hs * 1.12, hy, hx, hy + hs * 1.2], P.EG2);
  text(FS, 'NORMAL SINUS RHYTHM', x0 + 8 * sc, y1 - 12 * sc, { sc, c: P.EG1, ol: null });
  // the ending's inset: the same heart beating in step with the trace, and what each wave means
  if (o.pip > 0) withDither(o.pip, () => {
    const px0 = x0 + 3 * sc, px1 = x1 - 3 * sc, py0 = ny, py1 = y1 - 3 * sc, ms = beatMs(t);
    rect(px0, py0, px1, py1, P.K0); frame(px0, py0, px1, py1, P.EG1);
    drawHeart(new Cam(0, 0, 1, 0, 0), ms, { at: { x: px0 + 50, y: py0 + (py1 - py0) * 0.6, s: 0.3 }, cond: 1 });
    text(FS, 'HR ' + HR, px1 - 6, py0 + 6, { sc, c: P.EG2, ol: null, align: 'right' });
    const act = ms >= -20 && ms < 125 ? 0 : ms >= 160 && ms < 260 ? 1 : ms >= 300 && ms < 500 ? 2 : -1;
    [['P', 'ATRIA', P.SA2], ['QRS', 'VENTRICLES', P.EG4], ['T', 'RECOVERY', P.KK1]].forEach(([a, b, c], i) => {
      const y = py0 + 40 + i * 30, on = act === i, lx = px0 + 104;
      if (on) rect(lx - 6, y - 5, px1 - 6, y + 17, P.SC1);
      text(FS, a, lx, y, { sc, c: on ? c : mixc(c, P.K0, 0.45), ol: null });
      text(FS, b, lx + 38, y, { sc, c: on ? P.INK : P.SUB, ol: null });
    });
  });
}
// ---------------------------------------------------------------- the patient's chest (no face), electrodes, wires
// a diagram-style chest: the neck fades into the dark above the collarbones; arms at the sides; gown and sheet below
const TORSO = [158, 560, 202, 560, 210, 604, 296, 622, 330, 664, 322, 770, 300, 900, 292, 1000, 68, 1000, 60, 900, 38, 770, 30, 664, 64, 622, 150, 604];
const ARM_L = [330, 664, 352, 700, 360, 800, 352, 930, 326, 932, 322, 800, 318, 712];
const ARM_R = [30, 664, 8, 700, 0, 800, 8, 930, 34, 932, 38, 800, 42, 712];
function torsoShape() { return TORSO; }
// o: { xray (0..1 skin see-through), heartMs, cond }
function drawTorso(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, xr = o.xray || 0;
  // the bed behind the patient
  rect(0, Y(640), W, H, P.BE1); rect(0, Y(640), W, Y(645), P.BE2);
  for (const A of [ARM_L, ARM_R]) { const m = maskPoly(cam.pts(A)); shade(m, P.SK2, P.SK3, P.SK1, P.SK0, { k: Math.max(1, Math.round(z)) }); }
  const skin = () => {
    const m = maskPoly(cam.pts(TORSO)); shade(m, P.SK2, P.SK3, P.SK1, P.SK0, { k: Math.max(1, Math.round(z)) });
    // collarbones, the notch between them, the chest muscles, a centre line and lower-rib hints
    for (const s_ of [-1, 1]) {
      let px_ = null, py_ = null; for (let i = 0; i <= 10; i++) { const u = i / 10, x = 180 + s_ * (14 + u * 104), y = 620 + 9 * Math.sin(u * 3) - u * 6; if (px_ !== null) lineW(px_, py_, X(x), Y(y), 1.8 * z, P.SK1); px_ = X(x); py_ = Y(y); }
      px_ = null; for (let i = 0; i <= 12; i++) { const u = i / 12, x = 180 + s_ * (8 + 104 * Math.sin(u * 1.5)), y = 700 + 64 * Math.sin(u * 2.4) * (1 - u * 0.3); if (px_ !== null) lineW(px_, py_, X(x), Y(y), 1.2 * z, mixc(P.SK2, P.SK1, 0.7)); px_ = X(x); py_ = Y(y); }
    }
    disc(X(180), Y(616), 5 * z, P.SK1); lineW(X(180), Y(640), X(180), Y(790), 1.2 * z, mixc(P.SK2, P.SK1, 0.6));
    for (let k = 0; k < 3; k++) { const y = 846 + k * 20; lineW(X(112 + k * 5), Y(y), X(158), Y(y + 24), 1.2 * z, mixc(P.SK2, P.SK1, 0.45)); lineW(X(248 - k * 5), Y(y), X(202), Y(y + 24), 1.2 * z, mixc(P.SK2, P.SK1, 0.45)); }
  };
  if (xr < 1) withDither(1 - xr * 0.82, skin);
  if (xr > 0) {
    // inside: ribs and sternum (pale), the heart behind them
    withDither(xr, () => {
      const m = maskPoly(cam.pts(TORSO)); mFill(m, P.HM0);
      if (o.heartMs !== undefined) drawHeart(cam, o.heartMs, { at: HEART_AT, cond: o.cond || 0 });
      for (let k = 0; k < 6; k++) for (const s_ of [-1, 1]) { let px_ = null, py_ = null; for (let i = 0; i <= 12; i++) { const u = i / 12, x = 180 + s_ * (14 + u * 128), y = 650 + k * 44 + 30 * Math.sin(u * 2.4) - 6; if (px_ !== null) lineW(px_, py_, X(x), Y(y), 4 * z, P.BN0); px_ = X(x); py_ = Y(y); } }
      rect(X(173), Y(628), X(187), Y(870), P.BN0);
    });
  }
  // the neck fades into the dark (no head, no face)
  for (let k = 0; k < 10; k++) tintRect(X(150), Y(552 + k * 5), X(210), Y(557 + k * 5), P.BG, 1 - k / 10);
  // gown at the waist and the sheet below
  const gw = maskPoly(cam.pts([40, 930, 320, 930, 330, 1010, 30, 1010])); shade(gw, P.FN2, P.FN3, P.FN1, P.K0, {});
  const sh = maskPoly(cam.pts([0, 996, 360, 990, 360, 1160, 0, 1160])); shade(sh, P.SH1, P.SH2, P.SH0, P.SH0, {});
  for (let k = 0; k < 4; k++) lineW(X(60 + k * 70), Y(1004), X(40 + k * 74), Y(1120), 1.4 * z, P.SH0);
  drawLeads(cam, t, o);
}
function drawElectrode(cam, x, y, clip, hi) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  disc(X(x), Y(y), 15 * z, P.AL1); disc(X(x), Y(y), 14 * z, P.EW); disc(X(x - 3), Y(y - 3), 9 * z, P.C6);
  disc(X(x), Y(y), 5 * z, P.AL1); disc(X(x), Y(y), 4 * z, P.AL3); disc(X(x - 1), Y(y - 1), 1.6 * z, P.AL4);
  const m = maskRR(X(x - 6), Y(y - 18), X(x + 6), Y(y - 6), 2 * z); shade(m, clip, mixc(clip, P.C6, 0.4), mixc(clip, P.K0, 0.4), P.K0, {});
  if (hi > 0) ring(X(x), Y(y), 20 * z, 1.5, P.YEL, hi);
}
function drawLeads(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const sag = (a, b, s) => { const out = []; for (let i = 0; i <= 14; i++) { const u = i / 14; out.push(lerp(a[0], b[0], u), lerp(a[1], b[1], u) + s * Math.sin(Math.PI * u)); } return out; };
  const wire = (pts, c, wd) => { for (let i = 0; i + 3 < pts.length; i += 2) lineW(X(pts[i]), Y(pts[i + 1]), X(pts[i + 2]), Y(pts[i + 3]), wd * z, c); };
  // trunk cable from the monitor to the yoke, then three lead wires
  const trunk = sag([300, 476], YOKE, 18); wire(trunk, P.CB0, 5.4); wire(trunk, P.CB1, 3.2);
  const leads = [[ELEC.RA, P.EW, -26], [ELEC.LA, P.CK, 16], [ELEC.LL, P.CR, 30]];
  for (const [e, c, s] of leads) { const p = sag(YOKE, [e[0], e[1] - 16], s); wire(p, P.CB0, 3.4); wire(p, mixc(P.CB1, c, 0.35), 2); }
  const m = maskRR(X(YOKE[0] - 9), Y(YOKE[1] - 8), X(YOKE[0] + 9), Y(YOKE[1] + 10), 3 * z); shade(m, P.CB1, P.CB2, P.CB0, P.K0, {});
  const hi = o.hiElec || {};
  drawElectrode(cam, ELEC.RA[0], ELEC.RA[1], P.EW, hi.RA || 0);
  drawElectrode(cam, ELEC.LA[0], ELEC.LA[1], P.CK, hi.LA || 0);
  drawElectrode(cam, ELEC.LL[0], ELEC.LL[1], P.CR, hi.LL || 0);
}
// the ward: monitor above, patient below
function wardScene(cam, t, o) { wardBG(cam, t); drawTorso(cam, t, o || {}); drawMonitor(cam, t, o || {}); }
