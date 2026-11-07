'use strict';
// ============================================================================
// THE FILM: 18 scenes on one clock. Device shots use a device camera (cx, cy,
// zoom); the two 90° turns render into a square buffer and use the Mode-7
// blit. Molecular shots use the level camera (u along the flow, v down) or
// the top-view camera. Text is drawn last (25_text.js).
// ============================================================================
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const lin = x => x;
const RB = 368;                                    // square buffer that covers the screen at any roll angle
const SPARE_B = SPARE[2];                          // second square buffer (dissolves inside a rolled frame)

// the wetting front at device scale: soaks the well from 6.75 s, creeps up the sample pad
const devFront = t => t < EV.soak ? Infinity : 86 - 2.6 * (t - EV.soak);
const DEVCAM = [
  [0, 0, -18, 1.0], [EV.push1, 0, -18, 1.0], [EV.push1 + 1.5, 0, -32, 1.28, eio],
  [EV.toWell, 0, -32, 1.28], [EV.toWell + 1.0, 0, 58, 1.6, K75],
  [EV.pull3, 0, 58, 1.6], [EV.pull3 + 0.75, 0, -8, 1.02, K75],
  [EV.track3, 0, -8, 1.02], [EV.track3 + 1.25, 0, 70, 2.2, K75],
  [EV.dive, 0, 70, 2.2], [EV.dive + 1.25, 0, 71, 27, bezierEase(0.6, 0, 0.9, 1)],
];
const devCam = t => camTrack(DEVCAM, t);
// draw into the square buffer and blit it turned by ang (radians); straight frames draw directly
function rolled(ang, draw) {
  if (Math.abs(ang) < 1e-4) { draw(); return; }
  const src = withCanvas(RB, RB, draw);
  rotBlit(src, RB, RB, ang, 1, CX, CY);
}
const OPEN_STATE = { lineT: 1, lineC: 1 };       // the finished test of the first and last frame
const C_OPEN = [0, -18, 1.0];                    // the opening composition (device cx, cy, zoom)

// ---------------------------------------------------------------- 01-03: the cassette, the drop, the cutaway, the dive
function sDevice(t) {
  const fresh = t >= EV.cut2;
  const ang = t > EV.dive ? (Math.PI / 2) * eio(seg(t, EV.dive + 0.1, EV.dive + 1.0)) : 0;
  rolled(ang, () => {
    const cam = devCam(t);
    ground(cam);
    let o;
    if (!fresh) o = Object.assign({}, OPEN_STATE, { glintT: t >= EV.glintT && t < EV.glintT + 0.3 ? seg(t, EV.glintT, EV.glintT + 0.25) : -1, glintC: t >= EV.glintC && t < EV.glintC + 0.3 ? seg(t, EV.glintC, EV.glintC + 0.25) : -1 });
    else {
      o = { wellWet: ph(t, EV.dropHit, EV.dropHit + 0.75, eout), wetY: devFront(t) };
      if (t >= EV.peel) o.cutY = lerp(DEV.by1 + 2, DEV.by0 - 2, ph(t, EV.peel, EV.peel + 1.0, lin));
      o.zoneMarks = ph(t, EV.layers[2], EV.layers[2] + 0.5);
      if (t >= EV.dropper && t < EV.dropHit + 1.0) {
        const inK = ph(t, EV.dropper, EV.dropper + 0.6, eout), outK = ph(t, EV.dropHit + 0.25, EV.dropHit + 1.0, ein);
        const tipY = lerp(-160, 52, inK) - 200 * outK;
        let drop = null;
        if (t < EV.dropFall) drop = { y: tipY + 2 + 3 * ph(t, EV.dropper + 0.5, EV.dropFall), k: ph(t, EV.dropper + 0.5, EV.dropFall, eout) };
        else if (t < EV.dropHit) { const f = seg(t, EV.dropFall, EV.dropHit); drop = { y: lerp(tipY + 5, DEV.well.y, f * f), k: 1 }; }
        o.dropper = { y: tipY, drop };
      }
    }
    drawDevice(cam, o);
    if (fresh && t >= EV.dropHit && t < EV.dropHit + 0.3) {     // splash: a few stepped droplets
      const k = Math.floor((t - EV.dropHit) / 0.05);
      for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 4); pset(cam.x(Math.cos(a) * (3 + k * 2)), cam.y(DEV.well.y + Math.sin(a) * (2 + k * 1.5) - 2), P.LB1); }
    }
  });
}

// ---------------------------------------------------------------- 10b-13: the band from above, the inset, the pull-back
const SIDE_END = () => levelCam(EV.flip - 1e-3);
const FLOOR_Y = () => { const c = SIDE_END(); return Math.round(c.y(floorV(c.cx))); };
function topView() { const c = SIDE_END(), yf = FLOOR_Y(); return { cu: c.cx, cw: (CY - yf) / c.z - 40, z: c.z, yf }; }
// screen position of a top-view point when the view is turned (u → right, w → down)
function topToScreen(tv, u, w) { return [90 + (u - tv.cu) * tv.z, 160 + (w - tv.cw) * tv.z]; }
function drawTopTurned(t, tv, o) { rolled(Math.PI / 2, () => drawTop(topCam(tv.cu, tv.cw, tv.z), t, o)); }
function sFlip(t) {
  const yf = FLOOR_Y(), tv = topView(), m = EV.flip + 0.25, e = EV.flip + 0.5;
  if (t < m) sLevel(t, SIDE_END()); else drawTopTurned(t, tv, { movers: true, hero: TOP_HERO });
  TMPBUF.set(buf);
  const k = t < m ? 1 - eio(seg(t, EV.flip, m)) : eio(seg(t, m, e));
  const yc = t < m ? yf : Math.round(topToScreen(tv, 0, 0)[1]);
  clear(P.BG);
  if (k < 0.03) { rect(0, yc, W, yc + 1, P.GW1); return; }
  for (let y = 0; y < H; y++) {
    const sy = Math.round(yc + (y - yc) / k);
    if (sy < 0 || sy >= H) continue;
    buf.set(TMPBUF.subarray(sy * W, sy * W + W), y * W);
  }
}
function insetK(t) { return t < EV.insetClose ? seg(t, EV.inset, EV.inset + 0.75) : 1 - seg(t, EV.insetClose, EV.insetClose + 0.5); }
function sTop(t) {
  const tv = topView(), hs = topToScreen(tv, TOP_HERO[0], TOP_HERO[1]);
  drawTopTurned(t, tv, { movers: true, hero: TOP_HERO, heroHi: t >= EV.lock11 && t < EV.inset + 0.5 });
  if (t >= EV.lock11 && t < EV.inset + 0.5) bracket(hs[0], hs[1], 8, EV.lock11, t);
  const k = insetK(t);
  if (t >= EV.inset && k > 0) {
    darken(0.875 * Math.min(1, k * 2));
    if (insetPanel(k, hs[0], hs[1])) drawInsetContent(t);
  }
}
// pull back from the top view to the device (both drawn in device orientation, then turned upright)
const ZO = { t0: EV.zoomOut, t1: EV.zoomOut + 2.5 };
function zoomState(t) {
  const tv = topView(), f = K75(seg(t, ZO.t0, ZO.t1));
  const z0 = tv.z * TOPK, z1 = 1.3, zd = Math.exp(lerp(Math.log(z0), Math.log(z1), f));
  const c0x = tv.cw / TOPK, c0y = uToDev(tv.cu), g = clamp((1 / z0 - 1 / zd) / (1 / z0 - 1 / z1), 0, 1);
  return { zd, cx: lerp(c0x, 0, g), cy: lerp(c0y, -28, g), ang: (Math.PI / 2) * (1 - eio(seg(t, ZO.t0 + 0.4, ZO.t1 - 0.3))) };
}
const RUN_STATE = t => ({ lineT: 1, lineC: clamp(seg(t, 46, 56) * 1.25, 0, 1), wetY: -999, frontLine: false });
function sZoom(t) {
  const s = zoomState(t);
  rolled(s.ang, () => {
    const drawT = () => drawTop(topCam(devToU(s.cy), s.cx * TOPK, s.zd / TOPK), t, { hero: TOP_HERO });
    const drawD = () => { const cam = new Cam(s.cx, s.cy, s.zd); ground(cam); drawDevice(cam, RUN_STATE(t)); };
    if (s.zd >= 9) drawT();
    else if (s.zd < 4.5) drawD();
    else {
      const n = W * H; drawT(); SPARE_B.set(buf.subarray(0, n)); drawD();
      const k = 1 - (s.zd - 4.5) / 4.5;                        // device share of the dither
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (bay(x, y) >= k) buf[i] = SPARE_B[i]; }
    }
  });
}
// ---------------------------------------------------------------- 14-15: a lens into the control zone and back
const WIN_CAM = () => new Cam(0, -28, 1.3);
const LENS = { a: EV.lens14, b: EV.lens14 + 0.75, c: EV.lensClose, d: EV.lensClose + 0.75 };
// the control capture: search for a clean contact (a violet arm tip on the side of a cyan antibody; no hCG anywhere)
const CTRL = (() => {
  const z = ZONE_C[4], segsOf = g => [[g.bx, g.by, g.hx, g.hy], [g.hx, g.hy, g.lx, g.ly], [g.hx, g.hy, g.rx, g.ry]];
  const sd = (s, q) => { let m = Infinity; for (let k = 0; k <= 6; k++) { const px = lerp(s[0], s[2], k / 6), py = lerp(s[1], s[3], k / 6); m = Math.min(m, Math.sqrt(segD2(px, py, q[0], q[1], q[2], q[3]))); } return m; };
  let best = null;
  for (let av = -0.4; av <= 0.41; av += 0.1) for (const jv of [-1, 1]) {
    const gv = abGeom(z.u, z.v, z.a + av), tip = abTip(gv, jv), ev = [tip[0] - gv.hx, tip[1] - gv.hy], el = Math.hypot(ev[0], ev[1]);
    const vs = segsOf(gv), others = [ZONE_C[3], ZONE_C[5]].map(q => segsOf(abGeom(q.u, q.v, q.a)));
    for (let rot = 0; rot < TAU; rot += 0.03) {
      const g0 = conjGeoms(0, 0, rot)[0], cands = [];
      for (const [sx, sy, ex, ey, f] of [[g0.bx, g0.by, g0.hx, g0.hy, 0.6], [g0.hx, g0.hy, g0.lx, g0.ly, 0.35], [g0.hx, g0.hy, g0.rx, g0.ry, 0.35]]) {
        const dx = ex - sx, dy = ey - sy, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
        for (const sg of [-1, 1]) cands.push([sx + dx * f + sg * nx * (AB.TH / 2 + 0.2), sy + dy * f + sg * ny * (AB.TH / 2 + 0.2), sg * nx, sg * ny]);
      }
      for (const c of cands) {
        const head = -(ev[0] * c[2] + ev[1] * c[3]) / el; if (head < 0.75) continue;          // the tip meets the surface head-on
        const gx = tip[0] - c[0], gy = tip[1] - c[1], gs = conjGeoms(gx, gy, rot);
        let cl = Infinity, ok = gy + RG < z.v - 6;
        for (const g of gs) for (const p of [[g.bx, g.by], [g.hx, g.hy], [g.lx, g.ly], [g.rx, g.ry]]) if (p[1] > floorV(p[0]) - 3) ok = false;
        if (!ok) continue;
        gs.forEach((g, i) => segsOf(g).forEach(s => {
          vs.forEach((v, vi) => { if (i === 0 && vi === (jv < 0 ? 1 : 2)) return; cl = Math.min(cl, sd(s, v)); });
          if (i !== 0) cl = Math.min(cl, sd(s, vs[jv < 0 ? 1 : 2]));
          others.forEach(o => o.forEach(v => { cl = Math.min(cl, sd(s, v)); }));
        }));
        for (const v of vs) cl = Math.min(cl, Math.sqrt(segD2(gx, gy, v[0], v[1], v[2], v[3])) - RG);
        const score = cl + head * 0.5;
        if (!best || score > best.score) best = { score, gx, gy, rot, av, jv, tip, clear: cl };
      }
    }
  }
  return best;
})();
function ctrlPose(t) {
  const f = smooth(seg(t, EV.spareIn, EV.bindC)), q = 1 - f;
  return { gx: CTRL.gx - 64 * q + jx(t, 5, 1.0) * q, gy: CTRL.gy - 40 * q + jy(t, 5, 1.0) * q, rot: CTRL.rot - 0.5 * q };
}
function sCtrlLevel(t, z) {
  const cam = new Cam(CTRL.gx + 4, CTRL.gy + 10, z);
  drawLevel(cam, 40);
  const zc = ZONE_C[4], a0 = zc.a;
  zc.a = a0 + CTRL.av * smooth(seg(t, EV.bindC - 0.5, EV.bindC)); drawZones(cam, { hiC: t >= EV.bindC && t < EV.bindC + 0.1 ? 4 : -1 }); zc.a = a0;
  for (const c of PASSERS.slice(0, 3)) drawConj(cam, LV.C0 + c.du + 40 * (t - 52), c.v - 10 + jy(t, c.id, 1.2), c.r + 0.3 * t, { dim: true });
  const p = ctrlPose(t);
  drawConj(cam, p.gx, p.gy, p.rot);
  if (t >= EV.bindC) sparkle(cam.x(CTRL.tip[0]), cam.y(CTRL.tip[1]), t - EV.bindC, P.VI0);
  return cam;
}
function lensR(t) { return t < LENS.c ? 230 * ein(seg(t, LENS.a, LENS.b)) : 230 * ein(1 - seg(t, LENS.c, LENS.d)); }
const LENS_C = () => { const c = WIN_CAM(); return [c.x(0), c.y(DEV.yC)]; };
function sLens(t) {
  const r = lensR(t), [lx, ly] = LENS_C();
  { const c = WIN_CAM(); ground(c); drawDevice(c, t < LENS.c ? RUN_STATE(t) : OPEN_STATE); }
  if (r <= 0.5) return;
  TMPBUF.set(buf);
  const zin = t < LENS.c ? lerp(1.4, 2.4, eout(seg(t, LENS.a, LENS.b))) : 2.4;
  sCtrlLevel(t, zin); TMP2.set(buf);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly), i = y * W + x;
    buf[i] = d < r ? TMP2[i] : TMPBUF[i];
    if (d >= r - 2 && d < r) buf[i] = P.VI1; else if (d >= r && d < r + 1) buf[i] = P.K0;
  }
}
function sWindow(t) { const c = WIN_CAM(); ground(c); drawDevice(c, t < EV.lens14 ? RUN_STATE(t) : OPEN_STATE); }

// ---------------------------------------------------------------- 16-18: results and the return
const NEG_DOTS = (() => { const r = mulberry(77), a = []; for (let i = 0; i < 46; i++) a.push({ x: lerp(-5.2, 5.2, r()), t0: lerp(EV.negDots - 0.4, EV.negC - 0.6, r()), sp: 16 + r() * 8, cy: DEV.yC + (r() - 0.5) * 1.6 }); return a; })();
function negState(t) {
  const dots = []; let cap = 0;
  for (const d of NEG_DOTS) {
    if (t < d.t0) continue;
    const y = DEV.win.y1 + 1 - d.sp * (t - d.t0);
    if (y <= d.cy) { cap++; dots.push([d.x, d.cy, P.RU2]); } else if (y < DEV.win.y1) dots.push([d.x, y, P.RU1]);
  }
  return { lineT: 0, lineC: clamp(cap / 30, 0, 1), dots };
}
const SPLIT = { z: 0.85, xl: 46, xr: 134, cy: -26 };
function cassetteCam(sx, z, cy) { return new Cam(-(sx - 90) / z, cy, z); }
function sResults(t) {
  ground(null);
  if (t < EV.invalidIn + 0.5) {
    const f = K75(seg(t, EV.split, EV.split + 1.0));
    const z = lerp(1.3, SPLIT.z, f), sxl = lerp(90, SPLIT.xl, f), cy = lerp(-28, SPLIT.cy, f);
    const out = K75(seg(t, EV.invalidIn, EV.invalidIn + 0.5));
    drawDevice(cassetteCam(sxl - 140 * out, z, cy), OPEN_STATE);
    const sr = lerp(250, SPLIT.xr, K75(seg(t, EV.split + 0.25, EV.split + 1.0))) + 140 * out;
    if (t >= EV.split + 0.25) drawDevice(cassetteCam(sr, SPLIT.z, SPLIT.cy), negState(t));
  }
  if (t >= EV.invalidIn + 0.25) drawInvalid(t);
}
// a separate schematic result window with T but no C
const INV_CAM = dx => new Cam(-dx / 2.6 + 3, -24, 2.6);
const RET = { a: EV.ret, b: EV.rest };             // the invalid window is pushed out right as the cassette slides in from the left
function drawInvalid(t) {
  const inK = K75(seg(t, EV.invalidIn + 0.25, EV.invalidIn + 0.75)), outK = K75(seg(t, RET.a, RET.b));
  const dx = Math.round(200 * (1 - inK) + 200 * outK); if (dx > 200) return;
  const cam = INV_CAM(dx);
  const x0 = cam.x(-16), x1 = cam.x(20), y0 = cam.y(-70), y1 = cam.y(14);
  drawWindowPanel(cam, { lineT: 1, lineC: 0 }, x0, y0, x1, y1);
  if (t >= EV.warn) {
    const yy = cam.y(DEV.yC);
    dashLine(cam.x(DEV.sx0) - 2, yy - 3, cam.x(DEV.sx1) + 2, yy - 3, P.AM1, 2, 2, 0); dashLine(cam.x(DEV.sx0) - 2, yy + 3, cam.x(DEV.sx1) + 2, yy + 3, P.AM1, 2, 2, 0);
    const age = t - EV.warn, s = age < 0.05 ? 0.6 : age < 0.1 ? 1.25 : 1, cx = x1 + 16, cy = yy, hS = Math.round(9 * s);
    poly([cx, cy - hS - 1, cx + hS + 1, cy + hS * 0.8 + 1, cx - hS - 1, cy + hS * 0.8 + 1], P.K0);
    poly([cx, cy - hS, cx + hS, cy + hS * 0.8, cx - hS, cy + hS * 0.8], P.AM1);
    poly([cx, cy - hS + 3, cx + hS - 3, cy + hS * 0.8 - 1, cx - hS + 3, cy + hS * 0.8 - 1], P.AM0);
    if (s >= 1) { rect(cx, cy - 4, cx + 1, cy + 2, P.K0); rect(cx, cy + 3, cx + 1, cy + 4, P.K0); }
  }
}
// 18: the original cassette slides back into the opening composition and stops
function sReturn(t) {
  ground(null);
  drawInvalid(t);
  const f = K75(seg(t, RET.a, RET.b)), off = 200 * (1 - f);
  drawDevice(new Cam(C_OPEN[0] + off / C_OPEN[2], C_OPEN[1], C_OPEN[2]), OPEN_STATE);
}

// ---------------------------------------------------------------- scene table
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6); G_T = t;
  if (t < EV.fibres) sDevice(t);
  else if (t < EV.fibres + 0.5) {                  // the turned strip dissolves into the fibres (ordered dither)
    sDevice(t); TMPBUF.set(buf); sLevel(t); TMP2.set(buf);
    dissolve(TMPBUF, TMP2, seg(t, EV.fibres, EV.fibres + 0.5), buf);
  }
  else if (t < EV.flip) sLevel(t);
  else if (t < EV.flip + 0.5) sFlip(t);
  else if (t < ZO.t0) sTop(t);
  else if (t < ZO.t1) sZoom(t);
  else if (t < LENS.a) sWindow(t);
  else if (t < LENS.d) sLens(t);
  else if (t < EV.split) sWindow(t);
  else if (t < EV.ret) sResults(t);
  else sReturn(t);
  overlays(t);
}
function engineInit() { wetInit(); }
