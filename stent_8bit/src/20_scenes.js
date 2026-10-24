'use strict';
// ============================================================================
// MASTER TIMELINE — HOW CORONARY STENTS WORK (24 scenes, 55 s, 60 fps)
// renderFrame(t) is a pure function of t (flow, devices, dose of drug, all).
// ============================================================================
const BEAT = 60 / 128;
function engineInit() { flowInit(); }
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return lerp(a[1], b[1], (b[2] || K75)(seg(t, a[0], b[0]))); }
  return keys[keys.length - 1][1];
}
const LBL_Y = 40;
const VH = 3.2 / 208;            // heart units per vessel unit (LAD width = vessel outer width)
function chip(s, t0, t, col, icon, row) {
  if (t < t0) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)), tw = textW(FM, s, 2), y = 404 - (row || 0) * 18;
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, P.K0); frame(x - 2, y - 3, x + tw + (icon ? 17 : 3), y + 13, col);
  if (icon === 'clock') { ring(x + 6, y + 5, 5, 1, P.INK); const a = t * 9; line(x + 6, y + 5, x + 6 + Math.cos(a) * 4, y + 5 + Math.sin(a) * 4, P.INK); }
  text(FM, s, x + (icon ? 14 : 1), y, { sc: 2, c: P.INK, ol: null });
}
// ---------------------------------------------------------------- vessel state through the film
function gAt(t) { return t < 1.5 ? 0 : t < 3 ? 0.42 * smooth(seg(t, 1.5, 3)) : t < 4.5 ? lerp(0.42, 0.9, smooth(seg(t, 3, 4.5))) : lerp(0.9, 1, smooth(seg(t, 4.5, 5.6))); }
function vstate(t) {
  const st = { g: gAt(t), rb: 0, by: 0, rs: VS.RC, stent: 0, ax: 0, gc: false, gcTip: -330, wire: null };
  if (t >= 16 && t < 35) {
    st.gc = true;
    st.wire = t < 18 ? track([[16.15, -330], [17.95, -80, eio]], t) : track([[18.1, -80], [18.9, 40, K50], [19.4, 230, eout]], t);
    if (t >= 34.25) st.wire = track([[34.25, 230], [34.95, -700, ein]], t);
  }
  if (t >= 20 && t < 34.4) {
    st.stent = 1; st.rb = 7;
    st.by = t < 22.85 ? track([[20.0, -470], [21.7, -150, eout], [22.0, -150], [22.85, 0, K75]], t) : 0;
    if (t >= 24.3) {
      // pressurised fluid: stepped rise with micro-holds, peak at 26.25 (music drop), held, then deflation
      st.rb = t < 26.25 ? lerp(7, 60, smooth(seg(t, 24.3, 26.25)) * (0.92 + 0.08 * Math.cos(seg(t, 24.3, 26.25) * 18))) : t < 31.1 ? lerp(60, 67, smooth(seg(t, 26.25, 29.0))) : lerp(67, 6, smooth(seg(t, 31.1, 32.4)));
      st.rs = Math.max(VS.RC, t < 31.1 ? st.rb - 0.5 : 66);
      st.ax = clamp((Math.max(st.rb, st.rs) - 12) / 30, 0, 1);
    }
    if (t >= 31.1) { st.stent = 2; st.rs = 66; st.ax = 1; }
    if (t >= 33.1) { st.by = track([[33.1, 0], [34.3, -760, ein]], t); }
  }
  if (t >= 34.4) { st.stent = 2; st.rs = 66; st.ax = 1; }
  return st;
}
// ---------------------------------------------------------------- S01-S04 inside the artery
function flowMeter(lv, t0, t) {
  const k = K75(clamp((t - t0) / 0.25, 0, 1)); if (k <= 0) return;
  const x = 230, y = 150, h = 120;
  rect(x - 2, y - 22, x + 20, y + h + 2, P.K0); frame(x - 2, y - 22, x + 20, y + h + 2, P.N5);
  // blood drop icon
  disc(x + 9, y - 9, 5, P.RB2); poly([x + 9, y - 21, x + 4.5, y - 10, x + 13.5, y - 10], P.RB2); pset(x + 7, y - 11, P.RB4);
  const fh = Math.round((h - 4) * clamp(lv, 0, 1) * k);
  rect(x + 2, y + h - 2 - fh, x + 16, y + h - 2, P.RB1); rect(x + 2, y + h - 2 - fh, x + 7, y + h - 2, P.RB2);
  if (fh > 0) rect(x + 2, y + h - 2 - fh, x + 16, y + h - 1 - fh, P.RB4);
  for (let i = 1; i < 4; i++) rect(x + 16, Math.round(y + h - 2 - (h - 4) * i / 4), x + 18, Math.round(y + h - 1 - (h - 4) * i / 4), P.N6);
}
function s01(t) {
  const cam = new Cam(0, track([[0, -270], [1.5, 0, eout]], t), 1.0);
  drawVessel(cam, t, vstate(t));
  callout({ text: 'HEALTHY ARTERY', x: 18, y: LBL_Y, ax: CX - 40, ay: CY + 10, t0: 0.12 }, t);
}
function s02(t) {
  const cam = new Cam(track([[1.5, 0], [2.4, -22]], t), 0, track([[1.5, 1.0], [3.0, 1.18, eio]], t));
  drawVessel(cam, t, vstate(t), { formation: seg(t, 1.5, 3.0) });
  callout({ text: 'PLAQUE BUILDS UP', x: 18, y: LBL_Y, ax: cam.x(-VS.R0 + 10), ay: cam.y(-30), t0: 1.62, micro: 'YEARS LATER' }, t);
}
function widthBar(cam, st, t, t0) {
  const k = clamp((t - t0) / 0.2, 0, 1); if (k <= 0) return;
  const pr = profile(0, st, {}); const y = cam.y(0);
  const a = cam.x(pr.xl) + 2, b = cam.x(pr.xr) - 2, a0 = cam.x(-VS.R0) + 2, b0 = cam.x(VS.R0) - 2;
  dashLine(a0, y - 0, b0, y, P.N6, 2, 3, 0); rect(a0, y - 4, a0 + 1, y + 5, P.N6); rect(b0 - 1, y - 4, b0, y + 5, P.N6);
  rect(a, y - 1, b, y + 1, P.INK); rect(a, y - 6, a + 2, y + 7, P.INK); rect(b - 2, y - 6, b, y + 7, P.INK);
}
function s03(t) {
  const cam = new Cam(track([[3.0, -22], [3.6, 0]], t), 0, track([[3.0, 1.18], [3.7, 0.92, K75]], t));
  const st = vstate(t);
  drawVessel(cam, t, st);
  widthBar(cam, st, t, 3.3);
  callout({ text: 'ARTERY NARROWS', x: 18, y: LBL_Y, ax: CX + 8, ay: cam.y(-20), t0: 3.08 }, t);
}
function s04(t) {
  const cam = new Cam(0, track([[4.5, 0], [6.0, 40, eio]], t), track([[4.5, 0.92], [6.0, 1.2, eio]], t));
  drawVessel(cam, t, vstate(t));
  flowMeter(lerp(1, 0.55, smooth(seg(t, 4.6, 5.6))), 4.55, t);
  callout({ text: 'REDUCED BLOOD SUPPLY', x: 18, y: LBL_Y, ax: CX + 10, ay: cam.y(130), t0: 4.6 }, t);
}
// ---------------------------------------------------------------- scale chain: vessel <-> heart <-> lab
function chainScene(sH, t, o) {
  const M = sH * VH;
  const zL = sH / LAB.HL;
  const lesLab = [LAB.heartC[0] + L_H[0] * LAB.HL, LAB.heartC[1] + L_H[1] * LAB.HL];
  const drawV = () => drawVessel(new Cam(0, 0, M), t, o.vstate);
  const drawHt = () => { clear(P.BG); drawHeart({ ox: CX - L_H[0] * sH, oy: CY - L_H[1] * sH, s: sH }, t, o.heart); };
  const lc = o.labCenter || lesLab;
  const drawL = () => drawLab(new Cam(lc[0], lc[1], zL), t, o.lab || {});
  const mix = (A, B, k) => { if (k <= 0) A(); else if (k >= 1) B(); else { withBuffer(TMPBUF, A); B(); dissolve(TMPBUF, buf, k, buf); } };
  if (sH > 3.4) mix(drawV, drawHt, smooth(seg(-Math.log(sH), -Math.log(5.6), -Math.log(3.4))));
  else if (sH > 0.9) drawHt();
  else mix(drawHt, drawL, smooth(seg(-Math.log(sH), -Math.log(0.9), -Math.log(0.52))));
}
function s05(t) {
  const sH = Math.exp(lerp(Math.log(1.2 / VH), Math.log(0.37), K75(seg(t, 6.0, 7.75))));
  const lesLab = [LAB.heartC[0] + L_H[0] * LAB.HL, LAB.heartC[1] + L_H[1] * LAB.HL];
  const f = smooth(seg(t, 7.2, 7.9));
  chainScene(sH, t, { vstate: vstate(t), heart: { lesion: 'narrow', perf: 0.35, hl: seg(t, 6.6, 6.9) }, lab: { lesion: 'narrow', perf: 0.35, hl: 1 }, labCenter: [lerp(lesLab[0], 0, f), lerp(lesLab[1], -30, f)] });
  let ax = CX, ay = CY;
  if (sH < 0.9) { const cam = new Cam(lerp(lesLab[0], 0, f), lerp(lesLab[1], -30, f), sH / LAB.HL); ax = cam.x(lesLab[0]); ay = cam.y(lesLab[1]); }
  callout({ text: 'CORONARY ARTERY', x: 18, y: LBL_Y, ax, ay: ay - 8, t0: 6.7 }, t);
}
// ---------------------------------------------------------------- S06 cath lab, S07 wrist, S08 route
function labCam(t) {
  const zL = track([[8.0, 1.6], [8.7, 0.72, K75], [9.25, 0.74], [10.0, 3.4, ein]], t);
  const cx = track([[8.0, 0], [8.7, -40, K75], [9.25, -40], [10.0, LAB.wrist[0], ein]], t), cy = track([[8.0, -30], [8.7, 20, K75], [9.25, 20], [10.0, LAB.wrist[1] - 8, ein]], t);
  return new Cam(cx, cy, zL);
}
function s06(t) {
  const cam = labCam(t);
  drawLab(cam, t, { lesion: 'narrow', perf: 0.35 });
  if (t > 8.1) { const k = seg(t, 8.1, 8.3); rect(cam.x(86) - 1, cam.y(-232) - 1, cam.x(186) + 1, cam.y(-152) + 1, P.TL3, 0.25 * k * (1 - seg(t, 9.2, 9.4))); }
  callout({ text: 'CARDIAC CATHETERIZATION', x: 18, y: LBL_Y, ax: cam.x(60), ay: cam.y(-80), t0: 8.25 }, t);
}
function s07(t) {
  const cam = new Cam(0, -20, track([[10.0, 1.15], [12.0, 1.25, eio]], t));
  drawWrist(cam, t, { anaes: seg(t, 10.12, 10.55), sheath: K75(seg(t, 10.65, 11.55)), click: t > 11.55 ? seg(t, 11.55, 11.85) : 0 });
  const [ex, ey] = [cam.x(40), cam.y(-84)];
  callout({ text: 'RADIAL ACCESS', x: 18, y: LBL_Y, ax: ex, ay: ey, t0: 10.2 }, t);
}
function s08(t) {
  const prog = smooth(seg(t, 12.15, 13.85));
  const [tx, ty] = ROUTE.at(ROUTE.L * prog);
  const z = track([[12.0, 1.0], [12.4, 1.55, K75], [13.6, 1.55], [14.0, 2.4, ein]], t);
  const cam = new Cam(lerp(-70, tx, 0.8), lerp(-20, ty, 0.85), z);
  drawMap(cam, t, prog);
  callout({ text: 'GUIDING CATHETER', x: 18, y: LBL_Y, ax: cam.x(tx), ay: cam.y(ty) - 4, t0: 12.2 }, t);
}
// ---------------------------------------------------------------- S09 angiography
function s09(t) {
  const zm = track([[14.0, 1.0], [15.15, 1.0], [16.0, 3.4, ein]], t);
  const fx = ANG.sten[0] * smooth(seg(t, 15.15, 16)), fy = ANG.sten[1] * smooth(seg(t, 15.15, 16));
  drawAngio(t, { fill: lerp(0, 330, smooth(seg(t, 14.25, 15.05))), zoom: zm, fx, fy, mark: t > 14.95 && t < 15.6 });
  callout({ text: 'X-RAY GUIDANCE', x: 18, y: LBL_Y - 10, ax: 120 + (ANG.sten[0] - fx) * zm + 14, ay: 150 + (ANG.sten[1] - fy) * zm, t0: 14.3 }, t);
}
// ---------------------------------------------------------------- S10-S19 the procedure in the vessel
function s10(t) {
  const st = vstate(t);
  const cam = new Cam(0, track([[16.0, 0], [16.6, -110, K75], [17.95, -40, eio]], t), track([[16.0, 0.92], [16.6, 1.1, K75]], t));
  drawVessel(cam, t, st);
  callout({ text: 'GUIDEWIRE', x: 18, y: LBL_Y, ax: cam.x(profile(st.wire, st, {}).nc) + 2, ay: cam.y(st.wire) + 4, t0: 16.3 }, t);
}
function s11(t) {
  const st = vstate(t);
  const cam = new Cam(0, track([[18.0, -40], [19.3, 120, K75], [19.9, 40, K75]], t), track([[18.0, 1.1], [19.3, 1.1], [19.9, 0.9, K75]], t));
  st.wireGlow = seg(t, 18.4, 19.2) * (1 - seg(t, 19.4, 19.6));
  drawVessel(cam, t, st);
  if (t > 19.4) {
    const k = seg(t, 19.4, 19.75), pr = profile(st.wire, st, {}), x = cam.x((pr.xl + pr.xr) / 2), y = cam.y(st.wire);
    ring(x, y, 6 + 16 * backOut(k), 1, P.G2, 1 - 0.7 * k); if (k > 0.3) tick(x + 10, y - 16, P.G2, 2);
  }
  callout({ text: 'LESION CROSSED', x: 18, y: LBL_Y, ax: cam.x(profile(0, st, {}).nc), ay: cam.y(0), t0: 18.25 }, t);
}
function s12(t) {
  const st = vstate(t);
  const close = 1 - smooth(seg(t, 21.55, 22.0));
  const cam = new Cam(lerp(0, profile(st.by, st, {}).ax, close), lerp(0, st.by, close), lerp(0.95, 1.75, close));
  drawVessel(cam, t, st);
  callout({ text: 'STENT DELIVERY', x: 18, y: LBL_Y, ax: cam.x(profile(st.by, st, {}).ax + 10), ay: cam.y(st.by - 20), t0: 20.15 }, t);
}
function lockBrackets(cam, t, t0) {
  const k = backOut(clamp((t - t0) / 0.3, 0, 1), 2); if (k <= 0) return;
  const hy = VS.NR * VS.PITCH / 2 + 4, w = 46;
  const y0 = cam.y(-hy), y1 = cam.y(hy), x0 = cam.x(-w), x1 = cam.x(w), L = 14 * k;
  const c = P.INK;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { rect(x, y, x + sx * L, y + sy * 2, c); rect(x, y, x + sx * 2, y + sy * L, c); }
  for (const y of [y0, y1]) dashLine(x0 - 30, y, x0 - 6, y, P.ST3, 2, 2, t * 20);
}
function s13(t) {
  const st = vstate(t);
  const cam = new Cam(0, 0, track([[22.0, 0.95], [24.0, 1.0, eio]], t));
  drawVessel(cam, t, st);
  lockBrackets(cam, t, 22.85);
  callout({ text: 'STENT POSITIONED', x: 18, y: LBL_Y, ax: cam.x(-48), ay: cam.y(-VS.NR * VS.PITCH / 2 - 4), t0: 22.4 }, t);
}
function gauge(p, t0, t) {
  const k = K75(clamp((t - t0) / 0.25, 0, 1)); if (k <= 0) return;
  const cx = 232, cy = 368, r = 20 * k;
  disc(cx, cy, r + 3, P.K0); ring(cx, cy, r + 2, 1, P.N5); disc(cx, cy, r, P.N2);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.75 + i / 8 * Math.PI * 1.5; line(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75, cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, i > 6 ? P.RB3 : P.C4); }
  const a = Math.PI * 0.75 + clamp(p, 0, 1) * Math.PI * 1.5;
  lineW(cx, cy, cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, 2, P.BA2); disc(cx, cy, 2.5, P.C5);
  // syringe-style inflation device body
  rect(cx - 6, cy + r + 4, cx + 6, cy + r + 9, P.BA1);
}
function s14(t) {
  const st = vstate(t);
  const cam = new Cam(0, 0, 1.0);
  drawVessel(cam, t, st);
  gauge(smooth(seg(t, 24.3, 26.25)) * 0.9, 24.25, t);
  if (t > 26.25 && t < 26.7) { const k = seg(t, 26.25, 26.7); ring(cam.x(0), cam.y(0), 70 + 40 * k, 2, P.BA3, 1 - k); }
  callout({ text: 'BALLOON INFLATION', x: 18, y: LBL_Y, ax: cam.x(-st.rb * 0.5), ay: cam.y(-40), t0: 24.2 }, t);
}
function s15(t) {
  const r = lerp(24, 67, smooth(seg(t, 27.05, 28.55)));
  drawStrutCloseup(t, r, { bend: seg(t, 27.1, 27.5) * (1 - seg(t, 28.4, 28.8)) });
  callout({ text: 'STENT EXPANSION', x: 18, y: LBL_Y, ax: 135 + 0, ay: 240 - stentAmp(r) * 3.6, t0: 27.15 }, t);
}
function s16(t) {
  const st = vstate(t);
  const cam = new Cam(0, 0, track([[29.0, 1.25], [31.0, 1.05, eio]], t));
  drawVessel(cam, t, st);
  // outward contact force: stent pressing plaque into the wall (plaque stays, compressed)
  const k = seg(t, 29.2, 29.5) * (1 - seg(t, 30.6, 30.9));
  if (k > 0) for (const sgn of [-1, 1]) for (const y of [-40, 0, 40]) {
    const pr = profile(y, st, {}), x = cam.x(sgn < 0 ? pr.xl : pr.xr) - sgn * 8, yy = cam.y(y);
    const ph = (t * 3) % 1, d = 6 * ph;
    poly([x + sgn * d, yy - 4, x + sgn * (d + 6), yy, x + sgn * d, yy + 4], P.INK, k);
  }
  callout({ text: 'ARTERY WIDENS', x: 18, y: LBL_Y, ax: cam.x(profile(-30, st, {}).xl - 10), ay: cam.y(-30), t0: 29.15 }, t);
}
function s17(t) {
  const st = vstate(t);
  const cam = new Cam(0, 0, 1.05);
  drawVessel(cam, t, st);
  callout({ text: 'BALLOON DEFLATES', x: 18, y: LBL_Y, ax: cam.x(st.rb * 0.4), ay: cam.y(-20), t0: 31.15 }, t);
}
function s18(t) {
  const st = vstate(t);
  const cam = new Cam(0, 0, track([[33.0, 1.05], [35.0, 0.95, eio]], t));
  drawVessel(cam, t, st);
  if (t > 34.5) { const k = seg(t, 34.5, 34.8); ring(cam.x(0), cam.y(0), 40 + 50 * k, 1, P.G2, 1 - k); }
  callout({ text: 'STENT STAYS IN PLACE', x: 18, y: LBL_Y, ax: cam.x(-62), ay: cam.y(-60), t0: 33.2 }, t);
}
function s19(t) {
  const st = vstate(t); st.gc = false; st.wire = null;
  const cam = new Cam(0, track([[35.0, -300], [38.0, 260, eio]], t), 1.0);
  drawVessel(cam, t, st);
  flowMeter(lerp(0.55, 1, smooth(seg(t, 35.3, 36.4))), 35.2, t);
  callout({ text: 'IMPROVED BLOOD FLOW', x: 18, y: LBL_Y, ax: CX - 30, ay: CY + 30, t0: 35.2 }, t);
}
// ---------------------------------------------------------------- S20 before / after
function s20(t) {
  const before = { g: 1, rb: 0, by: 0, rs: 0, stent: 0, ax: 0, phi: flowPhi(5) + (t - 38) * 0.55 };
  const after = { g: 1, rb: 0, by: 0, rs: 66, stent: 2, ax: 1, phi: flowPhi(36) + (t - 38) };
  withBuffer(TMPBUF, () => drawVessel(new Cam(113, 0, 0.6), t, before));
  drawVessel(new Cam(-113, 0, 0.6), t, after);
  for (let y = 0; y < H; y++) for (let x = 0; x < 135; x++) buf[y * W + x] = TMPBUF[y * W + x];
  rect(134, 0, 136, H, P.K0); rect(134.5, 0, 135.5, H, P.INK);
  const k = seg(t, 38.05, 38.3);
  rect(0, 0, W, H, P.C6, k > 0 && k < 1 ? 0.15 * (1 - k) : 0);
  const s = 'BEFORE / AFTER', tw = textW(FL, s, 2);
  callout({ text: s, x: CX - tw / 2 + 1, y: LBL_Y, ax: null, t0: 38.1 }, t);
}
// ---------------------------------------------------------------- S21 post-stent angiography
function s21(t) {
  drawAngio(t, { post: true, fill: lerp(0, 330, smooth(seg(t, 40.1, 40.9))), zoom: track([[40.0, 2.4], [42.0, 2.0, eio]], t), fx: ANG.sten[0], fy: ANG.sten[1] - 10 });
  if (t > 40.8) { const k = seg(t, 40.8, 41.1); tick(205, 300, P.G2, 2); ring(213, 305, 8 + 8 * k, 1, P.G2, 1 - k); }
  callout({ text: 'FLOW ASSESSMENT', x: 18, y: LBL_Y - 10, ax: 120 + 14, ay: 150 + 10 * 2.2, t0: 40.15 }, t);
}
// ---------------------------------------------------------------- S22 drug-eluting stent
function s22(t) {
  const zin = seg(t, 42.0, 42.7);
  if (zin < 1) {
    const st = { g: 1, rb: 0, by: 0, rs: 66, stent: 2, ax: 1 };
    const z = Math.exp(lerp(Math.log(1.2), Math.log(5), K75(zin)));
    const draw1 = () => drawVessel(new Cam(lerp(0, -60, K75(zin)), 0, z), t, st);
    if (zin < 0.6) draw1(); else { withBuffer(TMPBUF, draw1); drawDES(t, 0); dissolve(TMPBUF, buf, smooth(seg(zin, 0.6, 1)), buf); }
  } else drawDES(t, smooth(seg(t, 42.8, 45.6)));
  callout({ text: 'DRUG-ELUTING STENT', x: 18, y: LBL_Y, ax: 150, ay: 222, t0: 42.35, micro: 'Helps limit tissue regrowth' }, t);
}
// ---------------------------------------------------------------- S23 coronary circulation
function s23(t) {
  const sH = Math.exp(lerp(Math.log(2.2 / VH), Math.log(1.45), K75(seg(t, 46.0, 47.6))));
  const perf = lerp(0.35, 1, smooth(seg(t, 47.4, 49.2)));
  const st = { g: 1, rb: 0, by: 0, rs: 66, stent: 2, ax: 1 };
  if (sH > 3.4) chainScene(sH, t, { vstate: st, heart: { lesion: 'open', perf, flow: 1 } });
  else { clear(P.BG); const cy = lerp(CY - L_H[1] * sH, 250 - HEART_C[1] * sH, smooth(seg(t, 47.0, 48.0))), cx = lerp(CX - L_H[0] * sH, 135 - HEART_C[0] * sH, smooth(seg(t, 47.0, 48.0))); drawHeart({ ox: cx, oy: cy, s: sH }, t, { lesion: 'open', perf, flow: 1, hl: seg(t, 47.8, 48.1) * (1 - seg(t, 49.5, 49.8)) }); }
  const ax = 135 + (L_H[0] - HEART_C[0]) * 1.45, ay = 250 + (L_H[1] - HEART_C[1]) * 1.45;
  callout({ text: 'BLOOD FLOW IMPROVED', x: 18, y: LBL_Y, ax, ay: ay - 10, t0: 47.75 }, t);
}
// ---------------------------------------------------------------- S24 recap + title + loop
const RECAP = [['PLAQUE', 51.0], ['NARROWED ARTERY', 51.45], ['GUIDEWIRE', 51.9], ['BALLOON', 52.35], ['EXPANDED STENT', 52.8], ['IMPROVED FLOW', 53.25]];
function recapState(i, t) {
  const st = { g: 1, rb: 0, by: 0, rs: VS.RC, stent: 0, ax: 0, gc: false, wire: null };
  const u = clamp((t - RECAP[i][1]) / 0.45, 0, 1);
  if (i === 0) st.g = lerp(0.2, 0.55, u);
  if (i === 2) { st.gc = true; st.wire = lerp(-120, 200, eout(u)); }
  if (i === 3) { st.gc = true; st.wire = 220; st.stent = 1; st.rb = lerp(20, 60, u); st.rs = st.rb - 0.5; st.ax = clamp((st.rb - 12) / 30, 0, 1); }
  if (i >= 4) { st.stent = 2; st.rs = 66; st.ax = 1; }
  st.phi = flowPhi(i < 4 ? 10 : 40) + (t - 51) * (i === 5 ? 1.4 : i < 3 ? 0.55 : 0.2);
  return st;
}
function s24(t) {
  if (t < 53.7) {
    let i = 0; while (i + 1 < RECAP.length && t >= RECAP[i + 1][1]) i++;
    const cam = new Cam(0, 0, 0.92 + 0.06 * seg(t, RECAP[i][1], RECAP[i][1] + 0.45));
    drawVessel(cam, t, recapState(i, t));
    const k = seg(t, RECAP[i][1], RECAP[i][1] + 0.1); if (k < 1 && i > 0) rect(0, 0, W, H, P.C6, 0.25 * (1 - k));
    tag(RECAP[i][0], CX, LBL_Y, RECAP[i][1] + 0.02, t, { align: 'center', c: P.INK, plate: P.N5 });
    for (let j = 0; j < 6; j++) { const x = 105 + j * 12; rect(x, 396, x + 7, 400, j <= i ? P.BA2 : P.N4); }
    return;
  }
  const st = { g: 1, rb: 0, by: 0, rs: 66, stent: 2, ax: 1 };
  const end = seg(t, 54.62, 54.98);
  const draw1 = () => {
    drawVessel(new Cam(0, track([[53.7, -60], [55.0, 200, eio]], t), 1.0), t, st);
    if (t > 53.75) {
      darken(0.35 * seg(t, 53.7, 53.9), 0, 70, W, 170);
      text(FT, 'HOW CORONARY', CX, 92, { sc: 2, bold: true, align: 'center', shadow: P.AW0, sd: 2, n: (t - 53.78) * 45 });
      text(FT, 'STENTS WORK', CX, 120, { sc: 2, bold: true, align: 'center', shadow: P.AW0, sd: 2, n: (t - 54.02) * 45 });
    }
  };
  if (end <= 0) draw1();
  else { withBuffer(TMPBUF, draw1); s01(0); dissolve(TMPBUF, buf, smooth(end), buf); }
}
// ---------------------------------------------------------------- scene table
const SCENES = [
  [0, 1.5, s01], [1.5, 3, s02], [3, 4.5, s03], [4.5, 6, s04], [6, 8, s05], [8, 10, s06], [10, 12, s07, 0.22], [12, 14, s08, 0.22],
  [14, 16, s09, 0.2], [16, 18, s10, 0.25], [18, 20, s11], [20, 22, s12], [22, 24, s13], [24, 27, s14], [27, 29, s15, 0.2],
  [29, 31, s16, 0.2], [31, 33, s17], [33, 35, s18], [35, 38, s19, 0.2], [38, 40, s20, 0.15], [40, 42, s21, 0.2], [42, 46, s22],
  [46, 51, s23, 0.25], [51, 55, s24, 0.15],
];
function sceneIndex(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][1]) return i; return SCENES.length - 1; }
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  const i = sceneIndex(t), S = SCENES[i];
  S[2](t);
  const d = S[3];
  if (d && i > 0 && t < S[0] + d) { withBuffer(TRANSBUF, () => SCENES[i - 1][2](t)); dissolve(TRANSBUF, buf, smooth((t - S[0]) / d), buf); }
  if ((t >= 1.55 && t < 4.6) || (t >= 42.75 && t < 45.9)) chip('TIME-LAPSE', t < 10 ? 1.55 : 42.75, t, P.PQ2, 'clock');
}
