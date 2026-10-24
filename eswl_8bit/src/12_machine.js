'use strict';
// ============================================================================
// MACHINE + ACOUSTICS — fronts, ultrasound localisation, focal geometry,
// coupling, capacitor circuit, electromagnetic coil + membrane, acoustic lens.
// Pressure coding everywhere: a sharp white-blue front, the compression band
// (blue) right behind it, then the longer, weaker rarefaction tail (purple).
// ============================================================================
// plane front travelling up (-y)
function planeFront(y, x0, x1, opt) {
  opt = opt || {};
  const a = opt.a === undefined ? 1 : opt.a, cw = opt.cw || 5, rw = opt.rw || 10;
  rect(x0, y + 1, x1, y + 1 + cw, P.CB2, 0.55 * a);
  rect(x0, y + 1, x1, y + 2, P.CB3, 0.8 * a);
  rect(x0, y + 2 + cw, x1, y + 2 + cw + rw, P.RF1, 0.42 * a);
  if (opt.glow) rect(x0, y - 3, x1, y - 1, P.SW0, 0.35 * a);
  rect(x0, y - 1, x1, y + 1, a > 0.45 ? P.SW2 : P.SW1);
}
// converging arc front: points (cx + R sin p, cy + R cos p), p in [p0, p1] (0 = straight below the focus)
function arcFront(cx, cy, R, p0, p1, opt) {
  opt = opt || {};
  if (R < 0.8) return;
  const a = opt.a === undefined ? 1 : opt.a, cw = opt.cw || 5, rw = opt.rw || 9, band = cw + rw + 2;
  const Ro = R + band, sx = [Math.sin(p0), Math.sin(p1)], minS = Math.min(0, sx[0], sx[1]), maxS = Math.max(0, sx[0], sx[1]);
  const x0 = Math.max(0, Math.floor(cx + Ro * minS - 2)), x1 = Math.min(W - 1, Math.ceil(cx + Ro * maxS + 2));
  const cmin = Math.min(Math.cos(p0), Math.cos(p1));
  const y0 = Math.max(0, Math.floor(cy + (R - 2) * Math.min(cmin, 1) - 2)), y1 = Math.min(H - 1, Math.ceil(cy + Ro + 2));
  const span = p1 - p0, taper = opt.taper === undefined ? 0.12 : opt.taper;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), d = r - R;
    if (d < -1.2 || d > band) continue;
    const ph = Math.atan2(dx, dy); if (ph < p0 || ph > p1) continue;
    const e = Math.min(ph - p0, p1 - ph) / (span * taper + 1e-6), lv = a * (e >= 1 ? 1 : e * e * (3 - 2 * e)), b = bay(x, y);
    if (d < 1.0) { if (b < 0.25 + 0.75 * lv) buf[y * W + x] = lv > 0.45 ? P.SW2 : P.SW1; }
    else if (d < 1.0 + cw) { if (b < 0.6 * lv) buf[y * W + x] = d < 2.4 ? P.CB3 : P.CB2; }
    else if (b < 0.4 * lv) buf[y * W + x] = P.RF1;
  }
}
function crossHair(x, y, r, c, k) {
  k = k === undefined ? 1 : k; const g = Math.round(3 + 4 * (1 - k));
  rect(x - r, y, x - g, y + 1, c); rect(x + g + 1, y, x + r + 1, y + 1, c); rect(x, y - r, x + 1, y - g, c); rect(x, y + g + 1, x + 1, y + r + 1, c);
}
function brackets(x, y, s, c) {
  const L = 4;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = x + sx * s, cy = y + sy * s; rect(Math.min(cx, cx - sx * L), cy, Math.max(cx, cx - sx * L) + 1, cy + 1, c); rect(cx, Math.min(cy, cy - sy * L), cx + 1, Math.max(cy, cy - sy * L) + 1, c); }
}
// ---------------------------------------------------------------- S05 ultrasound B-mode (imaging only, separate from therapy)
const US = { ax: 135, ay: 88, R: 318, ha: 0.6, kx: 135, ky: 262, sx: 147, sy: 250 };
function drawUS(t, opt) {
  opt = opt || {};
  clear(P.K0);
  frame(4, 22, W - 4, H - 50, P.C1); frame(5, 23, W - 5, H - 51, P.C0);
  const fi = Math.floor(t * 15), ca = Math.cos(-0.18), sa = Math.sin(-0.18);
  const stA = Math.atan2(US.sx - US.ax, US.sy - US.ay), stR = Math.hypot(US.sx - US.ax, US.sy - US.ay);
  for (let y = US.ay; y < US.ay + US.R; y++) for (let x = 8; x < W - 8; x++) {
    const dx = x + 0.5 - US.ax, dy = y + 0.5 - US.ay, r = Math.hypot(dx, dy), an = Math.atan2(dx, dy);
    if (r > US.R || Math.abs(an) > US.ha || r < 6) continue;
    // anatomy -> echo strength
    const kx = (x - US.kx) * ca + (y - US.ky) * sa, ky = -(x - US.kx) * sa + (y - US.ky) * ca;
    const ek = (kx / 82) ** 2 + (ky / 52) ** 2, es = (kx / 44) ** 2 + (ky / 22) ** 2;
    let e = 0.42;
    if (r < 34) e = 0.62;                                   // skin + fat near the probe
    if (ek < 1) e = ek > 0.82 ? 0.75 : es < 1 ? 0.7 : (Math.sin(Math.atan2(ky, kx) * 7) > 0.2 ? 0.2 : 0.3);   // capsule, sinus, pyramids
    const da = an - stA, dsr = r - stR;
    if (Math.abs(da) < 0.055 && dsr > 0) e = 0.04 + 0.04 * Math.exp(-dsr / 30);   // acoustic shadow behind the stone
    if (Math.abs(da) < 0.06 && dsr > -5 && dsr < 1) e = 1.0;                      // bright stone echo
    e *= 1 - 0.35 * (r / US.R);                                                     // depth attenuation
    const g = hash3(x >> 1, y, fi) * 0.75 + hash3(x, y >> 1, fi + 99) * 0.25;
    const v = e * (0.55 + g * 0.9);
    buf[y * W + x] = v > 0.95 ? P.CT6 : v > 0.7 ? P.CT5 : v > 0.5 ? P.CT4 : v > 0.34 ? P.CT3 : v > 0.2 ? P.CT2 : v > 0.1 ? P.CT1 : P.CT0;
  }
  // sector outline + depth marks
  for (const sg of [-1, 1]) line(US.ax, US.ay, US.ax + Math.sin(sg * US.ha) * US.R, US.ay + Math.cos(US.ha) * US.R, P.C1);
  for (let i = 1; i < 10; i++) { const r = i * 32; rect(US.ax + Math.sin(US.ha) * r + 4, US.ay + Math.cos(US.ha) * r, US.ax + Math.sin(US.ha) * r + 7, US.ay + Math.cos(US.ha) * r + 1, P.C2); }
  // targeting marker
  const k = opt.lock || 0, mx = opt.mx === undefined ? US.sx : opt.mx, my = opt.my === undefined ? US.sy : opt.my;
  crossHair(Math.round(mx), Math.round(my), 12, P.WC3, k);
  if (k > 0) { brackets(Math.round(mx), Math.round(my), Math.round(lerp(22, 9, eout(k))), k >= 1 ? P.WC4 : P.WC2); if (opt.flash > 0) ring(mx, my, 10 + 14 * (1 - opt.flash), 1, P.WC4, opt.flash); }
}
// ---------------------------------------------------------------- S06 focal geometry: the focus is fixed, the patient is moved
const FG = { fx: 135, fy: 196, ex0: 60, ex1: 210, ey: 352, rx: 6, ry: 21 };
function drawTarget(t, opt) {
  opt = opt || {};
  clear(P.BG);
  const ox = opt.ox || 0, oy = opt.oy || 0;
  // body slab (side cross-section), kidney + stone ride on the moving table
  const body = maskRR(14 + ox, 92 + oy, 256 + ox, 320 + oy, 18); shade(body, P.MR0, P.MR1, P.KD0, P.SH);
  rect(14 + ox, 312 + oy, 256 + ox, 320 + oy, P.SK1);
  const kid = maskEll(FG.fx + 4 + ox, FG.fy + 2 + oy, 40, 26, -0.25); shade(kid, P.KD2, P.KD3, P.KD1, P.SH);
  ellipse(FG.fx + ox, FG.fy + oy, 16, 11, P.UR1); ellipse(FG.fx + ox, FG.fy + oy, 13, 8, P.UR2, 0.4);
  const st = maskEll(FG.fx + ox, FG.fy + oy, 6, 5); shade(st, P.ST3, P.ST5, P.ST1, P.ST0);
  rect(26 + ox, 320 + oy, 244 + ox, 326 + oy, P.C3); rect(26 + ox, 320 + oy, 244 + ox, 321 + oy, P.C5); rect(92 + ox, 320 + oy, 178 + ox, 326 + oy, P.N1);
  // therapy head (fixed): housing, lens aperture, water cushion up to the skin
  const hd = maskRR(46, 352, 224, 450, 10); shade(hd, P.C2, P.C3, P.C1, P.SH, { k: 2 });
  poly([FG.ex0, FG.ey, FG.ex1, FG.ey, 196, 330 + oy * 0.5, 74, 330 + oy * 0.5], P.WC1);
  rect(FG.ex0, FG.ey - 3, FG.ex1, FG.ey, P.C4);
  // focal geometry (fixed to the machine)
  const a = opt.geo === undefined ? 1 : opt.geo;
  if (a > 0) {
    dashLine(FG.ex0, FG.ey, FG.fx, FG.fy, P.SW1, 3, 3, t * 30); dashLine(FG.ex1, FG.ey, FG.fx, FG.fy, P.SW1, 3, 3, t * 30);
    dashLine(FG.fx, FG.fy, FG.fx - (FG.ex0 - FG.fx) * -0.25, FG.fy - (FG.ey - FG.fy) * 0.25, P.SW0, 2, 3, 0);
    dashLine(FG.fx, FG.fy, FG.fx + (FG.ex1 - FG.fx) * -0.25, FG.fy - (FG.ey - FG.fy) * 0.25, P.SW0, 2, 3, 0);
    dashLine(FG.fx, FG.ey, FG.fx, 120, P.SW0, 2, 4, 0);
    ellipse(FG.fx, FG.fy, FG.rx + 2, FG.ry + 3, P.SW0, 0.35 * a); ellipse(FG.fx, FG.fy, FG.rx, FG.ry, P.SW1, 0.45 * a); ellipse(FG.fx, FG.fy, 2.5, 7, P.SW2, 0.7 * a);
  }
  const k = opt.lock || 0;
  crossHair(FG.fx, FG.fy, 14, P.WC3, k);
  if (k > 0) brackets(FG.fx, FG.fy, Math.round(lerp(24, 10, eout(k))), k >= 1 ? P.WC4 : P.WC2);
  if (opt.flash > 0) ring(FG.fx, FG.fy, 9 + 16 * (1 - opt.flash), 1, P.WC4, opt.flash);
  if (opt.move > 0) { // table travel arrows
    const c = P.N6, y = 336;
    for (const [x, d] of [[34, -1], [236, -1]]) { line(x, y, x + 8 * d, y - 6, c); line(x + 8 * d, y - 6, x + 8 * d + 3, y - 6, c); line(x + 8 * d, y - 6, x + 8 * d, y - 3, c); }
  }
}
// ---------------------------------------------------------------- S07 coupling: water cushion + gel; an air pocket reflects
const CP = { skin: 200, gel: 214, mem: 224, bx: 170, by: 219 };
function drawCoupling(t, opt) {
  opt = opt || {};
  clear(P.MR0);
  for (let y = 30; y < CP.skin; y++) for (let x = 0; x < W; x++) if (Math.sin(y * 0.55 + Math.sin(x * 0.05 + y * 0.02) * 2) > 0.82 && bay(x, y) < 0.6) buf[y * W + x] = P.MR1;
  rect(0, CP.skin, W, CP.gel, P.SK2); rect(0, CP.skin, W, CP.skin + 2, P.SK3); rect(0, CP.gel - 1, W, CP.gel, P.SK1);
  rect(0, CP.gel, W, CP.mem, P.GL1); rect(0, CP.gel, W, CP.mem, P.GL2, 0.25);
  rect(0, CP.mem, W, CP.mem + 2, P.WC3); rect(0, CP.mem, W, CP.mem + 1, P.WC4);
  rect(0, CP.mem + 2, W, H, P.WC1); for (let y = 300; y < H; y += 1) rect(0, y, W, y + 1, P.WC0, (y - 300) / 300);
  const br = opt.bubble === undefined ? 1 : opt.bubble;
  if (br > 0.02) { const m = maskEll(CP.bx, CP.by, 6 * br, 4 * br); shade(m, P.N2, P.CV2, P.K0, P.CV1); }
  if (opt.pop > 0) ring(CP.bx, CP.by, 3 + 9 * (1 - opt.pop), 1, P.CV2, opt.pop);
}
// thin arc outline (contours / isochrones)
function thinArc(cx, cy, R, p0, p1, c, lv) {
  if (R < 1) return;
  const n = Math.max(6, Math.ceil(R * (p1 - p0) / 2)); let px = cx + R * Math.sin(p0), py = cy + R * Math.cos(p0);
  for (let i = 1; i <= n; i++) { const p = p0 + (p1 - p0) * i / n, x = cx + R * Math.sin(p), y = cy + R * Math.cos(p); line(px, py, x, y, c, lv); px = x; py = y; }
}
// current dashes moving along a Path (electric current, yellow)
function dashes(path, phase, c, lv) {
  const per = 9; for (let s = ((phase % per) + per) % per; s < path.L; s += per) {
    const a = path.at(s), b = path.at(Math.min(path.L, s + 3.5));
    line(a[0], a[1], b[0], b[1], c, lv); pset(b[0], b[1], P.Y3);
  }
}
// ---------------------------------------------------------------- S08-S09 capacitor circuit inside the machine
const CK = { top: 158, bot: 270, xs: 62, xc: 135, xa: 166, xb: 190, xl: 222 };
const CK_CHG1 = new Path([62, 182, 62, 158, 135, 158, 135, 204]);
const CK_CHG2 = new Path([135, 224, 135, 270, 62, 270, 62, 246]);
const CK_DIS = new Path([135, 204, 135, 158, 222, 158, 222, 184, 210, 190, 234, 196, 210, 206, 234, 216, 210, 226, 234, 236, 222, 246, 222, 270, 135, 270, 135, 224]);
function drawCircuit(t, opt) {
  opt = opt || {};
  clear(P.BG);
  const hs = maskRR(18, 110, 252, 330, 10); shade(hs, P.N3, P.N4, P.N2, P.C2);
  for (let y = 116; y < 326; y += 6) rect(24, y, 246, y + 1, P.N2, 0.35);
  const wc = P.C3, lw = 2;
  // rails with the switch gap
  lineW(CK.xs, CK.top, CK.xa, CK.top, lw, wc); lineW(CK.xb, CK.top, CK.xl, CK.top, lw, wc); lineW(CK.xs, CK.bot, CK.xl, CK.bot, lw, wc);
  lineW(CK.xs, CK.top, CK.xs, 182, lw, wc); lineW(CK.xs, 246, CK.xs, CK.bot, lw, wc);
  lineW(CK.xc, CK.top, CK.xc, 204, lw, wc); lineW(CK.xc, 224, CK.xc, CK.bot, lw, wc);
  lineW(CK.xl, CK.top, CK.xl, 184, lw, wc); lineW(CK.xl, 246, CK.xl, CK.bot, lw, wc);
  // charger
  const ch = maskRR(38, 182, 86, 246, 4); shade(ch, P.C2, P.C3, P.C1, P.SH);
  text(FM, '+', 58, 188, { c: P.Y2 }); text(FM, '-', 58, 232, { c: P.Y2 });
  for (let i = 0; i < 3; i++) rect(46, 204 + i * 7, 78, 206 + i * 7, P.C1);
  // capacitor plates, charges, field between plates
  const q = clamp(opt.charge || 0, 0, 1);
  rect(110, 202, 160, 206, P.T4); rect(110, 202, 160, 203, P.T5); rect(110, 222, 160, 226, P.T4); rect(110, 222, 160, 223, P.T5);
  for (let x = 114; x < 158; x += 6) rect(x, 208, x + 1, 221, P.Y1, q * 0.9);
  const n = Math.round(q * 9);
  for (let i = 0; i < n; i++) { const x = 113 + i * 5.2; rect(x, 197, x + 3, 198, P.Y3); rect(x + 1, 196, x + 2, 199, P.Y3); rect(x, 229, x + 3, 230, P.Y2); }
  // switch (open blade -> closed)
  const sw = clamp(opt.sw || 0, 0, 1), ang = lerp(0.62, 0, eout(sw));
  disc(CK.xa, CK.top, 2.5, P.C4); disc(CK.xb, CK.top, 2.5, P.C4);
  lineW(CK.xa, CK.top, CK.xa + Math.cos(ang) * 24, CK.top - Math.sin(ang) * 24, 2, P.C5);
  if (opt.spark > 0) glow(CK.xb, CK.top, 6, P.SW0, P.SW2, opt.spark);
  // flat spiral coil
  const cg = opt.coilGlow || 0;
  for (let i = 0; i < 3; i++) frame(200 + i * 5, 184 + i * 6, 245 - i * 5, 247 - i * 6, cg > 0.3 && i === (Math.floor(t * 20) % 3) ? P.Y2 : P.T3);
  rect(220, 212, 225, 218, P.T4);
  if (cg > 0) glow(222, 215, 26, P.Y0, P.Y1, cg * 0.8);
  // currents: charging current decays as the capacitor fills; discharge is a short, strong pulse
  if (opt.chgI > 0.02) { dashes(CK_CHG1, t * 70 * opt.chgI, P.Y2, Math.min(1, opt.chgI * 1.6)); dashes(CK_CHG2, t * 70 * opt.chgI, P.Y2, Math.min(1, opt.chgI * 1.6)); }
  if (opt.disI > 0.02) dashes(CK_DIS, t * 260, P.Y2, Math.min(1, opt.disI * 1.4));
  // stored-energy meter
  frame(88, 292, 182, 302, P.N6); rect(90, 294, 90 + Math.round(90 * q), 300, P.Y2); rect(90, 294, 90 + Math.round(90 * q), 295, P.Y3);
}
// ---------------------------------------------------------------- S09-S11 electromagnetic source: coil, insulating foil, membrane, water
const EM = { mem: 330, x0: 28, x1: 242 };
function drawCoil(t, opt) {
  opt = opt || {};
  const oy = opt.oy || 0, M = EM.mem + oy, disp = opt.disp || 0, my = M - disp;
  clear(P.WC1);
  for (let y = 0; y < M; y++) if (y < 140 + oy) rect(0, y, W, y + 1, P.WC0, (140 + oy - y) / 260);
  // pressure bands launched by the membrane
  if (opt.fronts) for (const f of opt.fronts) if (f.y + oy < my - 2) planeFront(f.y + oy, EM.x0, EM.x1, { a: f.a, cw: f.cw || 6, rw: f.rw || 12 });
  // housing walls
  rect(16, M - 120, 28, H, P.C2); rect(242, M - 120, 254, H, P.C2); rect(27, M - 120, 28, H, P.C4); rect(242, M - 120, 243, H, P.C1);
  // membrane (thin conductive diaphragm)
  rect(EM.x0, my - 3, EM.x1, my, P.T4); rect(EM.x0, my - 3, EM.x1, my - 2, P.T5); rect(EM.x0, my - 1, EM.x1, my, P.T2);
  if (opt.hlMem > 0) { rect(EM.x0, my - 5, EM.x1, my - 3, P.SW1, opt.hlMem); }
  rect(EM.x0, M + 1, EM.x1, M + 3, P.N6);                                      // insulating foil
  // coil windings (cross-section of a flat spiral): current into the page on one side, out on the other
  const cur = opt.cur || 0, field = opt.field || 0;
  rect(22, M + 16, 248, M + 46, P.N3); rect(22, M + 16, 248, M + 17, P.N5);
  for (let i = 0; i < 12; i++) {
    const x = 36 + i * 17.3, y = M + 5;
    const m = maskRR(x, y, x + 11, y + 9, 1); shade(m, cur > 0.4 ? P.T4 : P.T3, P.T5, P.T1, P.SH);
    if (cur > 0.05) {
      const cx = Math.round(x + 5.5), cy = Math.round(y + 4.5), c = cur > 0.5 ? P.Y3 : P.Y2;
      if (x + 5 < CX) { line(cx - 2, cy - 2, cx + 2, cy + 2, c); line(cx - 2, cy + 2, cx + 2, cy - 2, c); }
      else { ring(cx + 0.5, cy + 0.5, 2.6, 1, c); pset(cx, cy, c); }
    }
  }
  if (opt.hlCoil > 0) rect(30, M + 3, 240, M + 16, P.Y1, 0.35 * opt.hlCoil);
  // changing magnetic field (violet): loops around each half of the coil, squeezed under the membrane
  if (field > 0.02) for (const cx of [86, 184]) for (let i = 1; i <= 4; i++) {
    const g = clamp(field * 1.3 - (i - 1) * 0.18, 0, 1); if (g <= 0) continue;
    const rx = (14 + 12 * i) * (0.5 + 0.5 * g), ry = (5 + 6 * i) * (0.5 + 0.5 * g), cy = M + 9, n = 90;
    let px = null, py = null;
    for (let j = 0; j <= n; j++) {
      const a = j / n * TAU; let x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (y < my + 1) y = my + 1 + (y - my - 1) * 0.12;                         // field is pushed against the membrane
      if (px !== null) line(px, py, x, y, i <= 2 ? P.V2 : P.V1, g * (i <= 2 ? 0.9 : 0.6));
      px = x; py = y;
    }
  }
  // induced (eddy) current in the membrane opposes the coil current -> repulsion
  const ed = opt.eddy || 0;
  if (ed > 0.05) for (let i = 0; i < 12; i += 2) {
    const x = Math.round(42 + i * 17.3), y = Math.round(my - 1.5), c = P.Y3;
    if (x < CX) { ring(x + 0.5, y + 0.5, 2.2, 1, c, ed); } else { pset(x - 1, y - 1, c); pset(x + 1, y + 1, c); pset(x - 1, y + 1, c); pset(x + 1, y - 1, c); }
  }
  const fz = opt.force || 0;
  if (fz > 0.05) for (const x of [56, 98, 172, 214]) { const L = Math.round(4 + 12 * fz); rect(x, my - 5 - L, x + 2, my - 5, P.INK); poly([x - 3, my - 5 - L, x + 5, my - 5 - L, x + 1, my - 10 - L], P.INK); }
}
// ---------------------------------------------------------------- S12 acoustic lens (sound is faster in the lens -> concave lens focuses)
const LZ = { fx: 135, fy: 150, R0: 236, yb: 392, mem: 412, xa: 40, xb: 230 };
function lensTop(x) { const dx = x - LZ.fx; return LZ.fy + Math.sqrt(Math.max(0, LZ.R0 * LZ.R0 - dx * dx)); }
function drawLens(t, opt) {
  opt = opt || {};
  clear(P.MR0);
  for (let y = 30; y < 296; y += 1) if (Math.sin(y * 0.5) > 0.9) rect(0, y, W, y + 1, P.MR1, 0.4);
  ellipse(LZ.fx + 6, LZ.fy + 4, 66, 42, P.KD1); ellipse(LZ.fx + 6, LZ.fy + 4, 62, 38, P.KD2, 0.5);
  ellipse(LZ.fx, LZ.fy, 18, 12, P.UR1); { const m = maskEll(LZ.fx, LZ.fy, 6, 5); shade(m, P.ST3, P.ST5, P.ST1, P.ST0); }
  rect(0, 294, W, 298, P.SK2); rect(0, 298, W, 300, P.GL1); rect(0, 300, W, 302, P.WC3);
  rect(0, 302, W, H, P.WC1);
  rect(16, 302, 30, H, P.C2); rect(240, 302, 254, H, P.C2); rect(29, 302, 30, H, P.C4);
  // lens (polymer): flat bottom, concave top = thicker at the edges
  for (let x = LZ.xa; x <= LZ.xb; x++) { const yt = Math.round(lensTop(x)); rect(x, yt, x + 1, LZ.yb, P.C3); pset(x, yt, P.C5); }
  rect(LZ.xa, LZ.yb, LZ.xb + 1, LZ.yb + 1, P.C1);
  rect(EM.x0, LZ.mem - 3, EM.x1, LZ.mem, P.T4); rect(EM.x0, LZ.mem - 3, EM.x1, LZ.mem - 2, P.T5);
  rect(22, LZ.mem + 2, 248, H, P.N3);
  // rays (refraction): straight below the lens, bent towards the focus above it
  const ra = opt.rays || 0;
  if (ra > 0) for (const x of [52, 93, 135, 177, 218]) { dashLine(x, LZ.mem - 4, x, LZ.yb, P.SW0, 2, 3, 0); const yt = lensTop(x); line(x, yt, lerp(x, LZ.fx, 0.97 * ra), lerp(yt, LZ.fy, 0.97 * ra), P.SW0, 0.6); }
  if (opt.focus > 0) { ellipse(LZ.fx, LZ.fy, 9, 24, P.SW0, 0.35 * opt.focus); ellipse(LZ.fx, LZ.fy, 6, 18, P.SW1, 0.5 * opt.focus); ellipse(LZ.fx, LZ.fy, 2.5, 8, P.SW2, 0.8 * opt.focus); }
}
// the lens front at time u (s after leaving the membrane); v = 145 px/s in water
function lensFront(u, opt) {
  const v = 145, tA = (LZ.mem - LZ.yb) / v, tB = tA + 0.05;
  if (u < 0) return;
  if (u < tA) { planeFront(LZ.mem - 3 - u * v, EM.x0, EM.x1, opt); return; }
  const ph = Math.asin((LZ.xb - LZ.fx) / LZ.R0);
  if (u < tB) { // inside the lens: the thick (fast) edges pull ahead
    const q = (u - tA) / (tB - tA); let px = null, py = null;
    for (let x = LZ.xa; x <= LZ.xb; x += 2) { const y = lerp(LZ.yb, lensTop(x), q); if (px !== null) lineW(px, py, x, y, 2, P.SW2); px = x; py = y; }
    return;
  }
  arcFront(LZ.fx, LZ.fy, LZ.R0 - (u - tB) * v, -ph, ph, opt);
}
