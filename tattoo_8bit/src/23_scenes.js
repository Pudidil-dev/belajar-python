'use strict';
// ============================================================================
// SCENE COMPOSITOR: 20 micro-scenes in 5 continuous sequences (SC_T, 120 BPM).
// One forearm, one black star, one handpiece; one ink aggregate followed from
// the dermis through absorption, expansion and fragmentation; some of its
// fragments followed into one macrophage, some ink into one lymphatic vessel;
// back out to the same forearm, the next session, and the whole treatment
// course until the star is no longer visible; the course rewinds to frame one.
// Scales join with calm zoom crossfades (arm → skin block → dermis and back).
// Passes: visual (worlds and crossfades, by time), hud (time labels, timeline,
// step bars, insets, recap), tags (leader labels), overlays (captions, chips,
// title).
// ============================================================================
function crossWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  mixInto(buf, TMPBUF, k);
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const xf = (t, a, b) => smooth(seg(t, a, b));
const LEFTBUF = SPARE[2].subarray(0, 360 * 640);
const ALL_PULSES = [...EV.hook, ...EV.pulses2, ...EV.pulses3];
// ============================================================================ cameras
// the forearm: still for the hook, a push toward the cut-away, the pull-back for the next session
function armCam(t) {
  if (t < 3.0) return new Cam(180, 320, 1);
  if (t < 20) return camTrack([[3.0, 180, 320, 1], [3.6, 180, 268, 1.5, K50]], t);
  if (t < 36.0) return camTrack([[34.0, 180, 268, 1.5], [34.8, 180, 320, 1.0, K50], [36.0, 180, 324, 1.035, lin]], t);
  if (t < 40.5) return camTrack([[36.0, 180, 324, 1.035], [36.75, 214, 236, 0.62, K50], [39.6, 220, 242, 0.66, lin], [40.0, 180, 320, 1, K50]], t);
  return new Cam(180, 320, 1);
}
// the skin block: settles, holds while its layers are named, then the camera dives into the ink (and the reverse)
const BP = blkPt(BLK_INK.cuts[0], 0.33);
const blockCam = t => t < 20
  ? camTrack([[3.25, 180, 334, 1.12], [3.5, 180, 320, 1.0, K50], [3.75, 180, 320, 1.0, lin], [4.3, BP[0], BP[1], 3.4, ein]], t)
  : camTrack([[33.3, BP[0], BP[1], 3.4], [33.95, 180, 320, 1.0, K50], [34.4, 180, 334, 1.12, lin]], t);
// the micro world: one continuous track from the whole dermis to one aggregate, a macrophage, a vessel and back
const IN_C = (() => { const pp = phagoPos(26.8), m = macPos(26.8); return [lerp(pp[0], m[0], 0.3), lerp(pp[1], m[1], 0.3)]; })();
const MKEYS = [
  [3.95, 0, 330, 0.5], [4.25, 0, 330, 0.62, K50], [6.0, 0, 360, 1.5, K50],
  [6.6, 0, 210, 1.05, K50], [7.6, 0, 210, 1.05, lin],
  [8.3, 0, 380, 24, K75], [11.0, 0, 380, 26, lin], [11.4, 0, 380, 18, K50], [13.0, 0, 380, 18, lin],
  [13.8, 0, 380, 27, K50], [14.0, 0, 380, 27, lin], [16.0, -1, 382, 12.8, K50], [18.6, -1, 382, 12, lin],
  [19.0, -8, 387, 8, K50], [21.0, -16, 392, 5, K50], [22.5, -12, 390, 6, K50], [23.4, -9, 388, 12, K50], [26.0, -9, 388, 12.5, lin],
  [26.8, IN_C[0], IN_C[1], 20, K50], [28.0, IN_C[0], IN_C[1], 20.5, lin],
  [28.7, 10, 440, 4, K50], [30.6, 12, 440, 4.2, lin], [31.6, 0, 380, 0.9, K50], [33.0, 0, 380, 0.88, lin], [33.4, 0, 330, 0.62, K50],
];
const microCam = t => camTrack(MKEYS, t);
// ============================================================================ pass 1: the worlds and the crossfades between them
function armScene(t) {
  const cam = armCam(t);
  armWorld(cam, t, {});
  // the patch that will be lifted out as a block, outlined just before the dive (and after the way back)
  const cut = ph(t, 3.0, 3.2) * (1 - ph(t, 3.45, 3.6)) + ph(t, 34.0, 34.2) * (1 - ph(t, 34.6, 34.9));
  const dim = ph(t, 3.1, 3.45) * (t < 20 ? 1 : 0) + (t > 20 ? 1 - ph(t, 34.1, 34.6) : 0) * (t >= 34.0 && t < 34.9 ? 1 : 0);
  if (dim > 0) { const [x0, y0, x1, y1] = [cam.x(BLK.ax0), cam.y(BLK.ay0), cam.x(BLK.ax1), cam.y(BLK.ay1)]; tintRect(0, 0, W, y0, P.BG, 0.85 * dim); tintRect(0, y1, W, H, P.BG, 0.85 * dim); tintRect(0, y0, x0, y1, P.BG, 0.85 * dim); tintRect(x1, y0, W, y1, P.BG, 0.85 * dim); }
  if (cut > 0) { const [x0, y0, x1, y1] = [cam.x(BLK.ax0), cam.y(BLK.ay0), cam.x(BLK.ax1), cam.y(BLK.ay1)]; withDither(cut, () => { dashLine(x0, y0, x1, y0, P.INK, 4, 3, t * 30); dashLine(x1, y0, x1, y1, P.INK, 4, 3, t * 30); dashLine(x1, y1, x0, y1, P.INK, 4, 3, t * 30); dashLine(x0, y1, x0, y0, P.INK, 4, 3, t * 30); }); }
  if (aimAt(t).away < 0.999) drawHandpiece(cam, t, { pulses: ALL_PULSES, console: cam.z < 0.95 });
  else if (cam.z < 0.95) drawConsole(cam, t);
}
const blockScene = t => blockView(blockCam(t), t, {});
const microScene = t => microWorld(microCam(t), t, {});
// before / after, side by side; then the divider slides away into the real tissue
function splitScene(t) {
  const m = K75(seg(t, EV.merge, EV.merge + 0.6)), div = 180 * (1 - m);
  const draw = () => {
    const zs = 12.8 - 0.8 * smooth(seg(t, EV.compare, EV.merge + 0.6));
    microWorld(new Cam(AGG.x - 1, AGG.y + 2, zs, lerp(270, 180, m), 330), t, {});
    if (div > 0.5) {
      withBuffer(LEFTBUF, () => microWorld(new Cam(AGG.x, AGG.y, zs, 90 - (180 - div), 330), t, { pigT: 7.9, noFx: true, noFrag: true }));
      const d = Math.min(W, Math.floor(div)); for (let y = 0; y < H; y++) { const r = y * W; for (let x = 0; x < d; x++) buf[r + x] = LEFTBUF[r + x]; }
      rect(d - 1, 0, d + 1, H, P.INK);
    }
  };
  if (t < 16.3) { microScene(t); crossWorld(draw, xf(t, 16.0, 16.3)); } else draw();
}
function visual(t) {
  if (t < 3.25) armScene(t);
  else if (t < 3.6) { armScene(t); crossWorld(() => blockScene(t), xf(t, 3.25, 3.6)); }
  else if (t < 3.95) blockScene(t);
  else if (t < 4.3) { blockScene(t); crossWorld(() => microScene(t), xf(t, 3.95, 4.3)); }
  else if (t < 16.0) microScene(t);
  else if (t < 18.6) splitScene(t);
  else if (t < 33.3) microScene(t);
  else if (t < 33.6) { microScene(t); crossWorld(() => blockScene(t), xf(t, 33.3, 33.6)); }
  else if (t < 34.0) blockScene(t);
  else if (t < 34.4) { blockScene(t); crossWorld(() => armScene(t), xf(t, 34.0, 34.4)); }
  else armScene(t);
}
// ============================================================================ pass 2: instruments
function boxLabel(s, x, y, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.18, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1); if (k <= 0) return;
  const tw = textW(FS, s, 2), x0 = Math.round(x - tw / 2);
  withDither(k, () => { rect(x0 - 6, y - 5, x0 + tw + 6, y + 17, P.K0); rect(x0 - 6, y + 15, x0 + tw + 6, y + 17, col); text(FS, s, x0, y, { sc: 2, c: P.INK, ol: null }); });
}
function hud(t) {
  timePill('WEEKS LATER', EV.weeks1, 2.95, t);
  timePill('WEEKS LATER', EV.weeks2, 35.9, t);
  // the large aggregate singled out
  if (t >= EV.agg && t < 6.2) { const cam = microCam(t), k = ph(t, EV.agg, EV.agg + 0.25) * (1 - ph(t, 5.95, 6.2)); withDither(k, () => ring(cam.x(AGG.x), cam.y(AGG.y), Math.max(9, 7.5 * cam.z), 1.6, P.YEL)); }
  if (t >= 16.0 && t < 18.3) { boxLabel('BEFORE', 90, 96, 16.1, 18.2, t, P.SUB); boxLabel('AFTER', 270, 96, 16.15, 18.2, t, P.YEL); }
  stepBar(t); lymphInset(t); inkMeter(t); stepPanels(t);
  const ta = ph(t, 39.85, 40.1) * (1 - ph(t, 44.75, 45.0)) + ph(t, 47.38, 47.5) * (1 - ph(t, 47.78, 47.93));
  timelineBar(t, ta);
  recapPanel(t);
}
// ============================================================================ pass 3: leader-line tags on the things themselves
function tags(t) {
  if (t < 3.0) { tag('TEMPORARY FROSTING', STAR.cx, STAR.cy - STAR.R + 32, 22, 190, 1.25, 1.95, t, P.FR1, 2); return; }
  if (t < 4.3) {
    const c = blockCam(t), A_ = (u, w) => { const p = blkPt(u, w); return [c.x(p[0]), c.y(p[1])]; };
    let a = A_(0.1, 0.05); tag('EPIDERMIS', a[0], a[1], 24, 112, 3.5, 4.15, t, P.EP2, 2);
    a = A_(BLK_INK.cuts[0], 0.33); tag('TATTOO PIGMENT', a[0], a[1], 24, 140, 3.55, 4.15, t, P.PG3, 2);
    a = A_(0.8, 0.5); tag('DERMIS', a[0], a[1], 214, 140, 3.6, 4.15, t, P.DM3, 2);
    return;
  }
  if (t < 16.0) {
    const c = microCam(t), S = (x, y) => [c.x(x), c.y(y)];
    let a = S(-120, 46); tag('EPIDERMIS', a[0], a[1], 196, 96, 4.4, 5.0, t, P.EP2, 2);
    a = S(-150, 270); tag('DERMIS', a[0], a[1], 24, 240, 4.55, 5.3, t, P.DM3, 2);
    a = S(RES[6].x, RES[6].y); tag('INK INSIDE A MACROPHAGE', a[0], a[1], 24, 420, 4.9, 5.9, t, P.MC3, 2);
    a = S(AGG.x + 4, AGG.y - 3); tag('LARGE INK AGGREGATE', a[0], a[1], 120, 120, 5.1, 6.0, t, P.YEL, 2);
    { const p = PH6[SCAT_I[0]], x = p.x * (1 - Math.min(1, (p.sc - p.t0) * 0.25)), y = -30 + 240 * (p.sc - p.t0); a = S(x, y); tag('SCATTERED LIGHT', a[0], a[1], 190, 128, 6.55, 7.6, t, P.LZ3, 2); }
    a = S(AGG.x, AGG.y - 4); tag('TATTOO INK', a[0], a[1], 24, 300, 6.8, 7.8, t, P.PG3, 2);
    a = S(AGG.x + 2.6, AGG.y - 2.6); tag('INK PARTICLES', a[0], a[1], 190, 120, 8.5, 10.9, t, P.PG3, 2);
    a = S(AGG.x - 3.3, AGG.y + 1.5); tag('RAPID HEATING', a[0], a[1], 24, 440, 9.5, 10.9, t, P.HT3, 2);
    { const R = pressR(Math.max(t, EV.expand)), an = -0.75; a = S(AGG.x + Math.cos(an) * R, AGG.y + Math.sin(an) * R); tag('PRESSURE WAVE', a[0], a[1], 190, 110, 11.3, 12.9, t, P.PR, 2); }
    { const b = BUBBLES[1]; a = S(AGG.x + b.x, AGG.y + b.y); tag('GAS BUBBLES', a[0], a[1], 24, 440, 11.8, 12.9, t, P.BB1, 2); }
    { const cr = CRACKS[1]; a = S(AGG.x + cr.c[0] + cr.d[0] * 1.6, AGG.y + cr.c[1] + cr.d[1] * 1.6); tag('CRACKS', a[0], a[1], 24, 140, 13.3, 13.98, t, P.PR, 2); }
    { const f = FRAGS.find(q => !q.target && q.n >= 4) || FRAGS[0], [fx, fy] = fragXform(f, t); a = S(AGG.x + f.cx + fx, AGG.y + f.cy + fy); tag('FRAGMENTS', a[0], a[1], 200, 440, 14.3, 15.9, t, P.PG3, 2); }
    return;
  }
  if (t < 19.0) {
    const zs = 12.8 - 0.8 * smooth(seg(t, EV.compare, EV.merge + 0.6)), L = new Cam(AGG.x, AGG.y, zs, 90, 330), R = new Cam(AGG.x - 1, AGG.y + 2, zs, 270, 330);
    tag('ONE LARGE AGGREGATE', L.x(AGG.x), L.y(AGG.y + 3.4), 24, 440, 16.4, 18.0, t, P.SUB, 2);
    const f = FRAGS.find(q => !q.target && q.n >= 3) || FRAGS[1], [fx, fy] = fragXform(f, t);
    tag('SMALL FRAGMENTS', R.x(AGG.x + f.cx + fx), R.y(AGG.y + f.cy + fy), 150, 400, 16.6, 18.0, t, P.YEL, 2);
    return;
  }
  if (t < 33.0) {
    const c = microCam(t), S = (x, y) => [c.x(x), c.y(y)], [mx, my] = macPos(t), tp = [AGG.x + TP[0], AGG.y + TP[1]], aT = Math.atan2(tp[1] - my, tp[0] - mx);
    let a = S(mx - Math.cos(aT) * 3.6, my - Math.sin(aT) * 3.6); tag('NUCLEUS', a[0], a[1], 214, 120, 19.8, 20.95, t, P.NU3, 2);
    a = S(mx - M_R, my + 1); tag('MEMBRANE', a[0], a[1], 24, 440, 20.1, 20.95, t, P.MC3, 2);
    a = S(mx + Math.cos(aT) * (M_R + 1), my + Math.sin(aT) * (M_R + 1)); tag('REACHING FOR THE INK', a[0], a[1], 24, 440, 21.1, 22.9, t, P.MC4, 2);
    const pp = phagoPos(t); a = S(pp[0] + 1.6, pp[1] - 1.6); tag('VESICLE WITH INK', a[0], a[1], 150, 112, 26.3, 27.9, t, P.MC4, 2);
    { const l = LYSO[0], u = smooth(seg(t, l.t - 0.75, l.t)), d = lerp(l.d, 2.25, u); a = S(pp[0] + Math.cos(l.a) * d, pp[1] + Math.sin(l.a) * d); tag('LYSOSOME', a[0], a[1], 24, 440, 26.15, 26.7, t, P.LS2, 2); }
    a = S(-60, LYV.y); tag('LYMPHATIC VESSEL', a[0], a[1], 24, 420, 28.6, 30.1, t, P.LY3, 2);
    { const [x2, y2] = m2Pos(t); a = S(x2 + 4, y2 - 5); tag('INK-LADEN MACROPHAGE', a[0], a[1], 70, 120, 28.8, 29.9, t, P.MC3, 2); }
    return;
  }
  if (t >= 36.0 && t < 40.0) {
    const c = armCam(t), aim = aimAt(t);
    tag('LASER HANDPIECE', c.x(aim.x + 5 + HP_DIR[0] * 120), c.y(aim.y - 8 + HP_DIR[1] * 120), 24, 120, 36.7, 37.9, t, P.HP3, 2);
  }
}
// ============================================================================ frame
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  visual(t);
  hud(t);
  tags(t);
  overlays(t);
}
function engineInit() { }
