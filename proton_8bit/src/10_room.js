'use strict';
// ============================================================================
// ROOM world: the treatment room seen end-on from the foot of the couch.
// Isocentre at world (0,0) = the tumour centre after alignment. The gantry
// drum turns about the isocentre (angle phi, clockwise from the top); the
// nozzle on it points at the isocentre. The patient lies under a blanket on the
// couch; the cutaway shows the cross-section at the tumour's level.
// Distances are compressed (schematic, not to scale).
// ============================================================================
const ROOMBUF = SPARE[2].subarray(0, 360 * 640);   // keeps the revealed section while the blanket is drawn
const RM = { drumR: 250, boreR: 180, wallX: 318, floorY: 206, ceilY: -600, snout: 76 };
// pseudo-perspective toward the camera: depth d (0 = the isocentre plane, + toward us); the eye sits above the couch
const PV = { DC: 2600, YC: -420, ND: 1000 };
const pk = d => PV.DC / (PV.DC - d);
function proj(x, y, d) { const k = pk(d); return [x * k, (y - PV.YC) * k + PV.YC]; }
function cproj(cam, x, y, d) { const k = pk(d); return [cam.x(x * k), cam.y((y - PV.YC) * k + PV.YC)]; }
// diagonal hatch inside a screen rectangle (concrete)
function hatch(x0, y0, x1, y1, c, sp) { const a = Math.max(0, Math.round(x0)), b = Math.min(W, Math.round(x1)), p = Math.max(0, Math.round(y0)), q = Math.min(H, Math.round(y1)); for (let y = p; y < q; y++) for (let x = a; x < b; x++) if ((x + y) % sp === 0) buf[y * W + x] = c; }
function polar(phi, r) { return [r * Math.sin(phi), -r * Math.cos(phi)]; }
// gantry frame (u radial outward from the isocentre, v tangential) -> flat world points
function gpts(phi, uv) { const s = Math.sin(phi), c = Math.cos(phi), o = []; for (let i = 0; i < uv.length; i += 2) { const u = uv[i], v = uv[i + 1]; o.push(u * s + v * c, -u * c + v * s); } return o; }
// the gantry angle: 0 (nozzle on top) in the hook and the ending; parked at -80° before it turns in sequence E
const PARK = -80 * Math.PI / 180;
function gantryAngle(t) {
  if (t < 20) return 0;
  if (t < EV.rotate) return PARK;
  return lerp(PARK, 0, K50(seg(t, EV.rotate, EV.locked)));
}
// the patient's position on the couch: slightly off before the image-guided correction of sequence E
function bodyOffset(t) {
  const base = [0, 2];
  if (t < 20 || t >= EV.shift + 0.4) return base;
  const k = t < EV.shift ? 0 : smooth(seg(t, EV.shift, EV.shift + 0.4));
  return [base[0] - 4 * (1 - k), base[1] + 2.5 * (1 - k)];
}
// ---------------------------------------------------------------- the body cross-section (body-local units, y toward the back)
const BODY = { A: 74, B: 44, p: 2.6, back: 40 };
const TS_ = { OUT: 0, SKIN: 1, FAT: 2, MUS: 3, LIVER: 4, KID: 5, BOWEL: 6, VES: 7, BONE: 8, MARROW: 9, CORD: 10, TUMOR: 11, INT: 12, CANAL: 13 };
const bodyRatio = (x, y) => Math.pow(Math.pow(Math.abs(x) / BODY.A, BODY.p) + Math.pow(Math.abs(y) / BODY.B, BODY.p), 1 / BODY.p);
const inEll = (x, y, cx, cy, rx, ry, rot) => { let dx = x - cx, dy = y - cy; if (rot) { const c = Math.cos(rot), s = Math.sin(rot), u = dx * c + dy * s; dy = -dx * s + dy * c; dx = u; } return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1; };
const TUMOR_C = [0, -2], TUMOR_R = 9;
function tumorRad(a) { return TUMOR_R * (1 + 0.12 * Math.sin(3 * a + 0.5) + 0.07 * Math.sin(5 * a + 2.0)); }
function inTumor(x, y) { const dx = x - TUMOR_C[0], dy = y - TUMOR_C[1]; return Math.hypot(dx, dy) <= tumorRad(Math.atan2(dy, dx)); }
const BOWEL = [[2, -22, 6], [-6, -31, 5], [12, -32, 5.5], [24, -24, 6.5], [36, -14, 6], [44, 2, 5.5], [-2, -10, 4.5], [20, -9, 5], [32, -30, 4.5]];
function bodyCodeL(x, y) {
  if (y > BODY.back) return TS_.OUT;
  const R = bodyRatio(x, y); if (R > 1) return TS_.OUT;
  if (R > 0.972 || y > BODY.back - 1.4) return TS_.SKIN;
  if (R > 0.905 || y > BODY.back - 4.5) return TS_.FAT;
  // the spine: vertebral body, canal and cord, posterior arch, transverse processes
  if (inEll(x, y, 0, 20, 10, 9)) return inEll(x, y, 0, 20, 8.4, 7.4) ? TS_.MARROW : TS_.BONE;
  if (inEll(x, y, 0, 32.5, 3.0, 2.6)) return TS_.CORD;
  if (inEll(x, y, 0, 32.5, 4.6, 4.2)) return TS_.CANAL;
  if ((Math.abs(x) >= 3.6 && Math.abs(x) <= 7.5 && y >= 27 && y <= 31) || (Math.hypot(x, y - 32.5) <= 7.2 && y >= 33.5) || (Math.abs(x) <= 1.8 && y >= 36 && y <= 38.5) || (Math.abs(x) >= 7 && Math.abs(x) <= 17 && y >= 28.5 && y <= 31)) return TS_.BONE;
  if (R > 0.86 && y < 26) return TS_.MUS;                                         // the abdominal wall
  if (inEll(x, y, 13.5, 32.5, 9.5, 6.5) || inEll(x, y, -13.5, 32.5, 9.5, 6.5)) return TS_.MUS;   // paraspinal muscles
  if (inEll(x, y, 15, 21, 6.5, 8.5, 0.3) || inEll(x, y, -15, 21, 6.5, 8.5, -0.3)) return TS_.MUS; // psoas
  if (inTumor(x, y)) return TS_.TUMOR;
  if (Math.hypot(x - 11, y - 10) <= 5 || inEll(x, y, -12, 10, 6, 4.5)) return TS_.VES;          // aorta, inferior vena cava
  if (inEll(x, y, 31, 19, 8, 11, 0.35) || inEll(x, y, -31, 19, 8, 11, -0.35)) return TS_.KID;
  if (inEll(x, y, -38, -6, 31, 30) && x < -5 && !(y > 8 && x > -24)) return TS_.LIVER;
  for (const [bx, by, br] of BOWEL) if (Math.hypot(x - bx, y - by) <= br) return TS_.BOWEL;
  return TS_.INT;
}
const CMAP = { x0: -76, y0: -46, res: 0.5, w: 304, h: 176, d: null };
function bodyInit() {
  if (CMAP.d) return;
  CMAP.d = new Uint8Array(CMAP.w * CMAP.h);
  for (let j = 0; j < CMAP.h; j++) for (let i = 0; i < CMAP.w; i++) CMAP.d[j * CMAP.w + i] = bodyCodeL(CMAP.x0 + (i + 0.5) * CMAP.res, CMAP.y0 + (j + 0.5) * CMAP.res);
}
function codeAt(lx, ly) { const i = Math.floor((lx - CMAP.x0) / CMAP.res), j = Math.floor((ly - CMAP.y0) / CMAP.res); return i < 0 || j < 0 || i >= CMAP.w || j >= CMAP.h ? 0 : CMAP.d[j * CMAP.w + i]; }
const COLB = [0, P.TI1, P.FA1, P.TI2, P.OR1, P.OR2, P.TI4, P.OR0, P.BO2, P.BO1, P.CD, P.TU2, P.TI3, P.N3];
const COLE = [0, P.TI0, P.FA0, P.TI1, P.OR0, P.OR0, P.TI2, P.OR0, P.BO0, P.BO0, P.BO1, P.TU0, P.TI2, P.N2];
const COLH = [0, P.TI2, P.FA1, P.TI3, P.OR2, P.OR3, P.TI5, P.OR1, P.BO2, P.BO2, P.CD, P.TU3, P.TI4, P.N4];
// the cross-section in screen space; opt.reveal (0..1 top-to-bottom wipe), opt.dose(lx, ly) -> 0..1 (orange-yellow overlay)
function drawSection(cam, off, opt) {
  opt = opt || {};
  const x0 = Math.max(0, Math.floor(cam.x(off[0] - BODY.A - 1))), x1 = Math.min(W - 1, Math.ceil(cam.x(off[0] + BODY.A + 1)));
  const y0 = Math.max(0, Math.floor(cam.y(off[1] - BODY.B - 1))), y1 = Math.min(H - 1, Math.ceil(cam.y(off[1] + BODY.back + 1)));
  const rvY = opt.reveal === undefined ? Infinity : lerp(-BODY.B - 2, BODY.back + 2, opt.reveal);
  const inv = 1 / cam.z, e = Math.max(0.5, 1.0 * inv);
  for (let y = y0; y <= y1; y++) {
    const ly = (y + 0.5 - cam.ay) * inv + cam.cy - off[1]; if (ly > rvY) continue;
    for (let x = x0; x <= x1; x++) {
      const lx = (x + 0.5 - cam.ax) * inv + cam.cx - off[0];
      const c = codeAt(lx, ly); if (!c) continue;
      let col;
      if (codeAt(lx + e, ly) !== c || codeAt(lx - e, ly) !== c || codeAt(lx, ly + e) !== c || codeAt(lx, ly - e) !== c) col = COLE[c];
      else if (codeAt(lx - 2 * e, ly - 2 * e) !== c) col = COLH[c];
      else col = COLB[c];
      if (c === TS_.TUMOR && hash2(Math.floor(lx * 0.7), Math.floor(ly * 0.7)) < 0.12) col = P.TU1;
      if (opt.dose) { const d = opt.dose(lx, ly); if (d > 0.02) col = mixc(col, d > 0.75 ? P.DE3 : P.DE2, Math.min(0.75, d * 0.8)); }
      buf[y * W + x] = col;
    }
    if (isFinite(rvY) && opt.reveal < 1) { const sy = cam.y(off[1] + rvY); if (Math.abs(y - sy) < 0.6) for (let x = x0; x <= x1; x++) { const lx = (x + 0.5 - cam.ax) * inv + cam.cx - off[0]; if (codeAt(lx, ly)) buf[y * W + x] = P.PC4; } }
  }
}
// ---------------------------------------------------------------- the room
function roomBG(cam) {
  clear(P.CO2);
  const z = cam.z, L = -RM.wallX, R = RM.wallX, T = RM.ceilY, B = RM.floorY, N = PV.ND;
  const Q = (x, y, d) => cproj(cam, x, y, d);
  const quad = (a, b, c, d, col) => poly([...a, ...b, ...c, ...d], col);
  // the room box: floor, ceiling, side walls (toward us), back wall around the gantry
  quad(Q(L, B, 0), Q(R, B, 0), Q(R, B, N), Q(L, B, N), P.N3);
  quad(Q(L, T, 0), Q(R, T, 0), Q(R, T, N), Q(L, T, N), P.N1);
  quad(Q(L, T, 0), Q(L, B, 0), Q(L, B, N), Q(L, T, N), P.N2);
  quad(Q(R, T, 0), Q(R, B, 0), Q(R, B, N), Q(R, T, N), P.N2);
  const bw0 = Q(L, T, 0), bw1 = Q(R, B, 0); rect(bw0[0], bw0[1], bw1[0], bw1[1], P.N2);
  // floor seams converging to the eye, and across
  for (let i = -6; i <= 6; i++) { const a = Q(i * 52, B, 0), b = Q(i * 52, B, N); line(a[0], a[1], b[0], b[1], P.N2); }
  for (const d of [140, 320, 540, 800]) { const a = Q(L, B, d), b = Q(R, B, d); line(a[0], a[1], b[0], b[1], P.N2); }
  { const a = Q(L, B, 0), b = Q(R, B, 0); line(a[0], a[1], b[0], b[1], P.N5); }
  // ceiling light panels
  for (const d of [120, 420]) for (const lx of [-150, 150]) { const a = Q(lx - 50, T, d), b = Q(lx + 50, T, d), c = Q(lx + 50, T, d + 140), e = Q(lx - 50, T, d + 140); quad(a, b, c, e, P.M5); }
  // back wall panel seams; the room's edges
  for (let i = -5; i <= 5; i++) { const x = cam.x(i * 58); line(x, bw0[1], x, bw1[1], P.N1); }
  for (const [x, y] of [[L, T], [R, T], [L, B], [R, B]]) { const a = Q(x, y, 0), b = Q(x, y, N); line(a[0], a[1], b[0], b[1], P.N4); }
  // the shielding: thick concrete cut at the near plane (seen when the camera pulls back)
  const n0 = Q(L, T, N), n1 = Q(R, B, N), th = 210 * pk(N) * z;
  hatch(0, 0, W, n0[1], P.CO1, 7); hatch(0, n1[1], W, H, P.CO1, 7); hatch(0, n0[1], n0[0], n1[1], P.CO1, 7); hatch(n1[0], n0[1], W, n1[1], P.CO1, 7);
  frame(n0[0] - 1, n0[1] - 1, n1[0] + 1, n1[1] + 1, P.CO4);
  frame(n0[0] - th, n0[1] - th, n1[0] + th, n1[1] + th, P.CO3);
  rect(0, 0, W, n0[1] - th, P.FL1, 1); rect(0, n1[1] + th, W, H, P.FL1); rect(0, 0, n0[0] - th, H, P.FL1); rect(n1[0] + th, 0, W, H, P.FL1);
}
// the rotating drum (front face), the bore, the status lights
function drawDrum(cam, phi, lights) {
  const cx = cam.x(0), cy = cam.y(0), z = cam.z;
  // the cosmetic wall around the opening
  ring(cx, cy, (RM.drumR + 6) * z, Math.max(2, 10 * z), P.M2);
  ring(cx, cy, (RM.drumR + 11) * z, Math.max(1, 1.2 * z), P.M4);
  const m = maskDisc(cx, cy, RM.drumR * z); shade(m, P.M3, P.M4, P.M2, P.M1, { k: Math.max(1, Math.round(2 * z)) });
  // panel seams and bolts that turn with the gantry
  for (let i = 0; i < 12; i++) { const a = phi + i / 12 * TAU, [ax, ay] = polar(a, RM.boreR + 6), [bx, by] = polar(a, RM.drumR - 6); line(cam.x(ax), cam.y(ay), cam.x(bx), cam.y(by), P.M2); }
  for (let i = 0; i < 36; i++) { const a = phi + (i + 0.5) / 36 * TAU, [bx, by] = polar(a, RM.drumR - 12); disc(cam.x(bx), cam.y(by), Math.max(0.7, 1.4 * z), P.M5); }
  ring(cx, cy, (RM.drumR - 22) * z, Math.max(1, 1.2 * z), P.M2);
  // the bore: the inside of the drum seen in depth
  const b = maskDisc(cx, cy, RM.boreR * z); mFill(b, P.M1);
  ring(cx, cy, RM.boreR * z, Math.max(1, 3 * z), P.M5); ring(cx, cy, (RM.boreR - 3) * z, Math.max(1, z), P.M2);
  for (const [r, c] of [[150, P.M2], [128, P.M0], [112, P.M2]]) ring(cx, cy, r * z, Math.max(1, z), c);
  for (let i = 0; i < 8; i++) { const a = phi + i / 8 * TAU, [ax, ay] = polar(a, 112), [bx, by] = polar(a, RM.boreR - 4); line(cam.x(ax), cam.y(ay), cam.x(bx), cam.y(by), P.M0); }
  // status lights on the bore rim: they come on one by one in the hook
  for (let i = 0; i < 24; i++) {
    const a = phi + i / 24 * TAU, [lx, ly] = polar(a, RM.boreR + 2.5), on = lights > (((i + 6) % 24) / 24);
    rect(cam.x(lx) - 1, cam.y(ly) - 1, cam.x(lx) + 1, cam.y(ly) + 1, on ? P.PC3 : P.M2);
    if (on && z > 0.9) glow(cam.x(lx), cam.y(ly), 4 * z, P.PC2, null, 0.6);
  }
}
// the nozzle (treatment head) on the drum, pointing at the isocentre; armed: its status strip glows
function drawNozzle(cam, phi, armed) {
  const z = cam.z, S = uv => cam.pts(gpts(phi, uv));
  shade(maskPoly(S([RM.boreR + 4, -34, RM.boreR + 4, 34, 150, 30, 150, -30])), P.M5, P.M6, P.M3, P.M1, { k: Math.max(1, Math.round(z)) });
  shade(maskPoly(S([150, -30, 150, 30, 112, 22, 112, -22])), P.M6, P.M7, P.M4, P.M2, { k: Math.max(1, Math.round(1.5 * z)) });
  shade(maskPoly(S([112, -16, 112, 16, RM.snout + 2, 13, RM.snout + 2, -13])), P.M4, P.M5, P.M2, P.M1, { k: Math.max(1, Math.round(z)) });
  poly(S([RM.snout + 4, -9, RM.snout + 4, 9, RM.snout, 9, RM.snout, -9]), P.M1);
  poly(S([RM.snout + 2, -4, RM.snout + 2, 4, RM.snout, 4, RM.snout, -4]), armed > 0.5 ? P.PC2 : P.M0);
  // the status strip
  const st = S([146, -20, 146, 20, 143, 20, 143, -20]); poly(st, armed > 0 ? mixc(P.M2, P.PC3, armed) : P.M2);
  if (armed > 0.2 && z > 0.8) { const [gx, gy] = gpts(phi, [144.5, 0]); glow(cam.x(gx), cam.y(gy), 10 * z, P.PC2, null, 0.5 * armed); }
  // seam lines
  const a = gpts(phi, [130, -27]), b = gpts(phi, [130, 27]); line(cam.x(a[0]), cam.y(a[1]), cam.x(b[0]), cam.y(b[1]), P.M4);
}
// X-ray imaging on the gantry: two tubes and two flat-panel detectors (dep: 0 stowed .. 1 deployed)
const XR = { tubeA: 135, tubeB: -135 };
function xrayGeom(phi, dep) {
  const ta = phi + XR.tubeA * Math.PI / 180, tb = phi + XR.tubeB * Math.PI / 180;
  const rt = lerp(RM.boreR - 6, 150, dep), rp = lerp(RM.boreR - 4, 128, dep);
  return { ta, tb, pa: ta + Math.PI, pb: tb + Math.PI, rt, rp };
}
function drawImaging(cam, phi, dep) {
  const g = xrayGeom(phi, dep), S = (a, uv) => cam.pts(gpts(a, uv));
  for (const a of [g.ta, g.tb]) {
    if (dep > 0.02) poly(S(a, [RM.boreR, -5, RM.boreR, 5, g.rt + 10, 5, g.rt + 10, -5]), P.M2);
    shade(maskPoly(S(a, [g.rt + 22, -15, g.rt + 22, 15, g.rt, 11, g.rt, -11])), P.M4, P.M5, P.M2, P.M1);
    poly(S(a, [g.rt + 2, -5, g.rt + 2, 5, g.rt, 5, g.rt, -5]), P.M1);
  }
  for (const a of [g.pa, g.pb]) {
    if (dep > 0.02) poly(S(a, [RM.boreR, -4, RM.boreR, 4, g.rp + 6, 4, g.rp + 6, -4]), P.M2);
    shade(maskPoly(S(a, [g.rp + 7, -34, g.rp + 7, 34, g.rp, 34, g.rp, -34])), P.M2, P.M3, P.M1, P.M0);
    poly(S(a, [g.rp + 1.5, -30, g.rp + 1.5, 30, g.rp, 30, g.rp, -30]), P.N4);
  }
}
// an X-ray exposure: a faint cone from the tube through the isocentre to its panel
function xrayCone(cam, phi, which, k) {
  if (k <= 0) return;
  const g = xrayGeom(phi, 1), a = which ? g.tb : g.ta, [sx, sy] = polar(a, g.rt), pa = a + Math.PI;
  const p1 = gpts(pa, [g.rp, -30]), p2 = gpts(pa, [g.rp, 30]);
  withDither(0.28 * k, () => poly([cam.x(sx), cam.y(sy), cam.x(p1[0]), cam.y(p1[1]), cam.x(p2[0]), cam.y(p2[1])], P.M6));
  withDither(0.6 * k, () => { line(cam.x(sx), cam.y(sy), cam.x(p1[0]), cam.y(p1[1]), P.M6); line(cam.x(sx), cam.y(sy), cam.x(p2[0]), cam.y(p2[1]), P.M6); });
}
// the couch: the tabletop runs from inside the bore toward us; its pedestal stands near the foot end
const COUCH = { w: 84, top: 40, bot: 49, d0: -60, d1: 620, ped: 430 };
function drawCouch(cam, off) {
  const z = cam.z, Q = (x, y, d) => cproj(cam, off[0] + x, off[1] + y, d), C = COUCH;
  // pedestal (column and base plate) under the near part of the table
  const p0 = Q(-26, C.bot, C.ped), p1 = Q(26, 0, C.ped), fl = cproj(cam, 0, RM.floorY, C.ped);
  shade(maskRR(p0[0], p0[1], p1[0], fl[1], 3 * z), P.M5, P.M6, P.M3, P.M1, { k: Math.max(1, Math.round(z)) });
  const b0 = cproj(cam, off[0] - 60, RM.floorY - 4, C.ped), b1 = cproj(cam, off[0] + 60, RM.floorY + 8, C.ped);
  shade(maskRR(b0[0], b0[1], b1[0], b1[1], 3 * z), P.M3, P.M4, P.M2, P.M1);
  for (const yy of [110, 160]) { const a = Q(-24, yy, C.ped), b = Q(24, yy, C.ped); line(a[0], a[1], b[0], b[1], P.M3); }
  // the tabletop: top surface and the front edge
  const a = Q(-C.w, C.top, C.d0), b = Q(C.w, C.top, C.d0), c = Q(C.w, C.top, C.d1), d = Q(-C.w, C.top, C.d1);
  poly([...a, ...b, ...c, ...d], P.CF1);
  for (const xx of [-C.w + 6, C.w - 6]) { const u = Q(xx, C.top, C.d0), v = Q(xx, C.top, C.d1); line(u[0], u[1], v[0], v[1], P.CF2); }
  const f0 = Q(-C.w, C.top, C.d1), f1 = Q(C.w, C.bot, C.d1);
  shade(maskRR(f0[0], f0[1], f1[0], f1[1], 2 * z), P.CF1, P.CF2, P.CF0, P.CF0);
}
// the patient under the blanket, from the cut plane (d = 0) to the feet (d = 560): torso, hips, legs, feet tenting the blanket
const BK_KEYS = [[0, 77, 86], [110, 75, 82], [190, 71, 66], [250, 64, 50], [360, 55, 40], [400, 53, 42], [440, 50, 34], [520, 46, 28], [560, 46, 28]];
function bkProf(d) {
  let i = 0; while (i + 1 < BK_KEYS.length - 1 && d > BK_KEYS[i + 1][0]) i++;
  const a = BK_KEYS[i], b = BK_KEYS[i + 1], u = smooth(clamp((d - a[0]) / (b[0] - a[0]), 0, 1));
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}
function bkTop(x, d) {
  const [A, Hh] = bkProf(d), u = Math.abs(x) / A;
  let h = 0;
  if (u < 1) {
    const legs = smooth(clamp((d - 200) / 80, 0, 1));
    const torso = Math.pow(1 - Math.pow(u, 2.6), 1 / 2.6), leg = Math.pow(1 - u * u, 0.55) * (1 - 0.14 * Math.exp(-Math.pow(u / 0.2, 2)));
    h = Hh * lerp(torso, leg, legs);
  }
  const f = smooth(clamp((d - 505) / 40, 0, 1));
  if (f > 0) { const q = (Math.abs(x) - 18) / 15; if (Math.abs(q) < 1) h = Math.max(h, f * 58 * Math.pow(Math.cos(q * Math.PI / 2), 1.6)); }
  return h;
}
function drawBlanketSlices(cam, off) {
  const X0 = off[0], Y0 = off[1] + COUCH.top, NB = 14;
  const topAt = (x, d, A) => Math.abs(x) <= A ? Y0 - bkTop(x, d) : Y0 + 10 * Math.min(1, (Math.abs(x) - A) / 7);
  for (let d = 0; d <= 560; d += 5) {
    const A = bkProf(d)[0] + (d > 505 ? 4 : 0), last = d >= 560, W0 = A + 7;
    for (let k = 0; k < NB; k++) {
      const x0 = lerp(-W0, W0, k / NB), x1 = lerp(-W0, W0, (k + 1) / NB), pts = [];
      for (let i = 0; i <= 3; i++) { const x = lerp(x0, x1, i / 3), q = cproj(cam, X0 + x, topAt(x, d, A), d); pts.push(q[0], q[1]); }
      const e1 = cproj(cam, X0 + x1, Y0 + 10, d), e0 = cproj(cam, X0 + x0, Y0 + 10, d); pts.push(e1[0], e1[1], e0[0], e0[1]);
      // tone by the surface slope: facing up-left is lit, up-right is in shade, the steep drape darker
      const sl = (topAt(x1, d, A) - topAt(x0, d, A)) / (x1 - x0);
      let col = sl < -0.32 ? P.BK3 : sl < 0.22 ? P.BK2 : sl < 1.2 ? P.BK1 : P.BK0;
      if (last) col = col === P.BK3 ? P.BK2 : col === P.BK2 ? P.BK1 : P.BK0;
      poly(pts, col);
    }
  }
  const q = []; for (let i = 0; i <= 28; i++) { const x = lerp(-1, 1, i / 28) * 53; const pp = cproj(cam, X0 + x, topAt(x, 560, 50), 560); q.push(pp[0], pp[1]); }
  polyline(q, P.BK0);
}
function drawBlanket(cam, off, lv) {
  if (lv <= 0) return;
  if (lv >= 1) drawBlanketSlices(cam, off); else withDither(lv, () => drawBlanketSlices(cam, off));
}
// ---------------------------------------------------------------- the whole room
// st: { lights, armed, reveal, blanket, dose, imaging, cones:[a,b] }
function roomWorld(cam, t, st) {
  st = st || {};
  bodyInit();
  const phi = st.phi === undefined ? gantryAngle(t) : st.phi, off = st.off || bodyOffset(t);
  roomBG(cam);
  drawDrum(cam, phi, st.lights === undefined ? 1 : st.lights);
  drawImaging(cam, phi, st.imaging || 0);
  drawCouch(cam, off);
  const rv = st.reveal || 0;
  if (rv > 0) drawSection(cam, off, { reveal: rv, dose: st.dose });
  if (st.cones) { xrayCone(cam, phi, 0, st.cones[0]); xrayCone(cam, phi, 1, st.cones[1]); }
  // the near body: solid under its blanket, see-through once the section is revealed
  drawBlanket(cam, off, lerp(1, 0.12, smooth(clamp(rv * 1.4, 0, 1))));
  drawNozzle(cam, phi, st.armed === undefined ? 1 : st.armed);
  return { phi, off };
}
