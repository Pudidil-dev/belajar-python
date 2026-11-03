'use strict';
// ============================================================================
// THE FOREARM (arm world: screen pixels of the opening close-up, camera (180, 320, 1);
// 40 px ≈ 1 cm). One forearm on a dark treatment pad, one black dragon tattoo
// (09_dragon.js), a Q-switched Nd:YAG handpiece in a gloved hand on an articulated
// arm, and the laser console (seen when the camera pulls back).
// The tattoo's ink fades in patches (per-pixel noise) as treatment goes on; the
// frosting appears where each pulse lands and is gone by the next time jump.
// ============================================================================
// the arm runs top (elbow) to bottom (wrist), a little narrower toward the wrist
const armL = y => 22 + 0.03 * y, armR = y => 338 - 0.03 * y;
// pulse spots along the dragon's body: the hook treats its neck; later sessions treat the rest of the body
const SPOT_R = 13;
const bodyPt = u => { const p = drgAt(u); return [p.x, p.y]; };
const SPOTS_HOOK = [0.06, 0.11, 0.16, 0.21].map(bodyPt);
const SPOTS_S2 = [0.4, 0.46, 0.7, 0.76].map(bodyPt);
const SPOTS_S3 = [0.3, 0.35, 0.55, 0.6, 0.86, 0.92].map(bodyPt);
const HOOK_C = [SPOTS_HOOK.reduce((a, p) => a + p[0], 0) / 4, SPOTS_HOOK.reduce((a, p) => a + p[1], 0) / 4];
// every frosted spot: [x, y, time of its pulse, time its frosting starts to fade]
const FROST = [
  ...SPOTS_HOOK.map((p, i) => [p[0], p[1], EV.hook[i], EV.weeks1]),
  ...SPOTS_S2.map((p, i) => [p[0], p[1], EV.pulses2[i], 39.75]),
  ...SPOTS_S3.map((p, i) => [p[0], p[1], EV.pulses3[i], [40.75, 40.75, 42.25, 42.25, 43.5, 43.5][i]]),
];
// the handpiece's aim over time: the spot it is above, and how far it is pulled away (0 = in place)
const AIM_KEYS = [
  [0.0, SPOTS_HOOK[0], 0], [0.25, SPOTS_HOOK[0], 0], [0.5, SPOTS_HOOK[1], 0], [0.75, SPOTS_HOOK[2], 0], [1.0, SPOTS_HOOK[3], 0], [1.6, SPOTS_HOOK[3], 0], [2.1, SPOTS_HOOK[3], 1],
  [36.1, SPOTS_S2[0], 1], [36.75, SPOTS_S2[0], 0], [37.0, SPOTS_S2[1], 0], [37.25, SPOTS_S2[2], 0], [37.5, SPOTS_S2[3], 0], [38.0, SPOTS_S2[3], 0], [39.6, SPOTS_S2[3], 1],
  [40.0, SPOTS_S3[0], 1], [40.25, SPOTS_S3[0], 0], [40.5, SPOTS_S3[1], 0], [40.75, SPOTS_S3[1], 1],
  [41.5, SPOTS_S3[2], 1], [41.75, SPOTS_S3[2], 0], [42.0, SPOTS_S3[3], 0], [42.25, SPOTS_S3[3], 1],
  [42.75, SPOTS_S3[4], 1], [43.0, SPOTS_S3[4], 0], [43.25, SPOTS_S3[5], 0], [43.5, SPOTS_S3[5], 1],
  [47.5, SPOTS_HOOK[0], 1], [DUR, SPOTS_HOOK[0], 0],
];
function aimAt(t) {
  let i = 0; while (i + 1 < AIM_KEYS.length && t >= AIM_KEYS[i + 1][0]) i++;
  const a = AIM_KEYS[i], b = AIM_KEYS[Math.min(i + 1, AIM_KEYS.length - 1)];
  if (a === b) return { x: a[1][0], y: a[1][1], away: a[2] };
  // hop between spots quickly (a third of the gap) and hold still for the pulse
  const span = b[0] - a[0], u = K75(clamp((t - a[0]) / Math.min(span, Math.max(0.12, span * 0.6)), 0, 1));
  return { x: lerp(a[1][0], b[1][0], u), y: lerp(a[1][1], b[1][1], u), away: lerp(a[2], b[2], u) };
}
// ---------------------------------------------------------------- skin and ink, as a colour for any arm-world point
const HAIRS = Array.from({ length: 70 }, (_, i) => ({ x: 30 + hash(i + 500) * 300, y: -300 + hash(i + 501) * 1300, a: 1.32 + 0.25 * (hash(i + 502) - 0.5), l: 7 + 7 * hash(i + 503) }));
const FRECKLES = Array.from({ length: 14 }, (_, i) => ({ x: 50 + hash(i + 560) * 260, y: -200 + hash(i + 561) * 1100, r: 0.8 + 1.1 * hash(i + 562) }));
function skinTone(wx, wy) {
  const xl = armL(wy), xr = armR(wy), u = (wx - xl) / (xr - xl), n = 2 * u - 1;
  const b = Math.sqrt(Math.max(0, 1 - n * n)) * 0.78 - n * 0.22 + 0.08 * (vn2(wx / 26, wy / 26, 3) - 0.5);
  let c = b < 0.2 ? mixc(P.SK1, P.SK2, b / 0.2) : b < 0.55 ? mixc(P.SK2, P.SK3, (b - 0.2) / 0.35) : mixc(P.SK3, P.SK4, clamp((b - 0.55) / 0.35, 0, 1));
  const edge = Math.min(wx - xl, xr - wx); if (edge < 2) c = mixc(P.SK0, c, clamp(edge / 2, 0, 1));
  return c;
}
// the base picture (skin tone, the pad) is cached once in arm-world pixels; ink, frost and redness are added live
const ATX = { x0: -200, y0: -700, w: 760, h: 2000 };
let ARMTEX = null;
function padColor(wx, wy, xl, xr) {
  const fold = Math.sin((wx * 0.6 + wy) / 38 + 2 * Math.sin(wy / 90)), padIn = wx > -90 && wx < 450;
  let c = padIn ? (fold > 0.82 ? P.PD3 : fold > 0.35 ? P.PD2 : P.PD1) : P.BG;
  const sh = Math.min(Math.abs(wx - xl), Math.abs(wx - xr)); if (padIn && sh < 14) c = mixc(P.PD0, c, sh / 14);
  return c;
}
function buildArmTex() {
  ARMTEX = new Uint32Array(ATX.w * ATX.h);
  for (let j = 0; j < ATX.h; j++) {
    const wy = ATX.y0 + j + 0.5, xl = armL(wy), xr = armR(wy);
    for (let i = 0; i < ATX.w; i++) { const wx = ATX.x0 + i + 0.5; ARMTEX[j * ATX.w + i] = wx < xl - 0.5 || wx > xr + 0.5 ? padColor(wx, wy, xl, xr) : skinTone(wx, wy); }
  }
}
function baseAt(wx, wy) {
  if (!ARMTEX) buildArmTex();
  const i = Math.floor(wx - ATX.x0), j = Math.floor(wy - ATX.y0);
  return i < 0 || j < 0 || i >= ATX.w || j >= ATX.h ? P.BG : ARMTEX[j * ATX.w + i];
}
// ink alpha of the tattoo at (wx, wy) for a given fade (0 = as tattooed, 1 = gone): patchy, like real fading
function inkAlpha(wx, wy, fade) {
  const edge = dragonInk(wx, wy); if (edge <= 0.01) return 0;
  if (fade <= 0) return edge * (0.92 + 0.08 * vn2(wx / 2.2, wy / 2.2, 17));
  const nv = 0.7 * vn2(wx / 9, wy / 9, 7) + 0.3 * vn2(wx / 3.5, wy / 3.5, 9);
  return edge * clamp(1 - fade * (1 + 0.9 * nv), 0, 1);
}
// the frosted spots that show at time t: [x, y, strength]
const frostList = t => FROST.filter(([, , t0, tf]) => t >= t0 && t <= tf + 0.5).map(([x, y, t0, tf]) => [x, y, smooth(seg(t, t0, t0 + 0.1)) * (1 - smooth(seg(t, tf, tf + 0.5)))]);
function frostAt(wx, wy, fl) {
  let a = 0;
  for (const [x, y, g] of fl) {
    const dx = wx - x, dy = wy - y; if (dx * dx + dy * dy > (SPOT_R + 2) ** 2) continue;
    const d = Math.sqrt(dx * dx + dy * dy), r = SPOT_R * (1 + 0.18 * (vn2(wx / 3, wy / 3, 11) - 0.5));
    a = Math.max(a, g * clamp(r + 0.5 - d, 0, 1));
  }
  return a;
}
// one arm-world point as a colour (used by the arm view and by the top face of the skin block)
function skinPixel(wx, wy, fl, fade, erythema) {
  let c = baseAt(wx, wy);
  if (erythema > 0) { const d = Math.hypot(wx - HOOK_C[0], wy - HOOK_C[1]); if (d < 60) c = mixc(c, P.ER, erythema * 0.32 * smooth(1 - d / 60)); }
  const ia = inkAlpha(wx, wy, fade);
  if (ia > 0) c = mixc(c, mixc(P.IK1, P.IK2, fade * 0.6), ia * 0.95);
  const fr = fl.length ? frostAt(wx, wy, fl) : 0;
  if (fr > 0) { const s = vn2(wx / 1.7, wy / 1.7, 13); c = mixc(c, s > 0.62 ? P.FR0 : s > 0.3 ? P.FR1 : P.FR2, fr * (ia > 0.2 ? 0.92 : 0.45)); }
  return c;
}
const erythemaAt = t => (smooth(seg(t, 1.1, 1.8)) * (1 - smooth(seg(t, EV.weeks1, EV.weeks1 + 0.5)))) + 0.7 * smooth(seg(t, 37.2, 37.9)) * (1 - smooth(seg(t, 39.6, 40.1)));
// ---------------------------------------------------------------- the pad, the arm, the hairs
function armWorld(cam, t, o) {
  o = o || {};
  const fade = o.fade === undefined ? inkFade(t) : o.fade, ery = erythemaAt(t), fl = frostList(t);
  if (!ARMTEX) buildArmTex();
  const ex0 = DRG.x0 - 40, ex1 = DRG.x0 + DRG.w + 40, ey0 = DRG.y0 - 40, ey1 = DRG.y0 + DRG.h + 40;
  for (let sy = 0; sy < H; sy++) {
    const wy = cam.wy(sy + 0.5), xl = armL(wy), xr = armR(wy), row = sy * W, j = Math.floor(wy - ATX.y0), inY = j >= 0 && j < ATX.h, nearY = wy > ey0 && wy < ey1;
    for (let sx = 0; sx < W; sx++) {
      const wx = cam.wx(sx + 0.5), i = Math.floor(wx - ATX.x0);
      const c = inY && i >= 0 && i < ATX.w ? ARMTEX[j * ATX.w + i] : P.BG;
      buf[row + sx] = nearY && wx > ex0 && wx < ex1 && wx > xl && wx < xr ? skinPixel(wx, wy, fl, fade, ery) : c;
    }
  }
  if (cam.z > 0.7) {
    const hc = mixc(P.SK3, P.HR, 0.42);
    for (const h of HAIRS) { const x0 = cam.x(h.x), y0 = cam.y(h.y); if (x0 < -20 || x0 > W + 20 || y0 < -20 || y0 > H + 20 || h.x < armL(h.y) + 6 || h.x > armR(h.y) - 6) continue; const x1 = cam.x(h.x + Math.cos(h.a) * h.l * 0.3), y1 = cam.y(h.y + Math.sin(h.a) * h.l); line(x0, y0, x1, y1, hc); }
    for (const f of FRECKLES) disc(cam.x(f.x), cam.y(f.y), Math.max(0.6, f.r * cam.z), mixc(P.SK2, P.SK1, 0.6));
  }
}
// ---------------------------------------------------------------- the laser: handpiece, glove, articulated arm, console
const HP_DIR = [0.56, -0.83];                     // from the tip back along the body (up and to the right)
function capsule(cam, ax, ay, bx, by, r, cBase, cHi, cLo, cOl) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, pts = [], k = 8;
  for (let i = 0; i <= k; i++) { const th = -Math.PI / 2 + i * Math.PI / k, c = Math.cos(th), s = Math.sin(th); pts.push(cam.x(bx + r * (c * ux + s * nx)), cam.y(by + r * (c * uy + s * ny))); }
  for (let i = 0; i <= k; i++) { const th = Math.PI / 2 + i * Math.PI / k, c = Math.cos(th), s = Math.sin(th); pts.push(cam.x(ax + r * (c * ux + s * nx)), cam.y(ay + r * (c * uy + s * ny))); }
  shade(maskPoly(pts), cBase, cHi, cLo, cOl, { k: Math.max(1, Math.round(cam.z)) });
}
function drawHandpiece(cam, t, o) {
  o = o || {};
  const aim = aimAt(t), away = o.away === undefined ? aim.away : o.away;
  if (away >= 0.999) return;
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // pulled away = slid back along its own axis and lifted out of frame
  const off = 260 * K75(away), sx = aim.x + HP_DIR[0] * off, sy = aim.y + HP_DIR[1] * off;
  const tipX = sx + 5, tipY = sy - 8, at = s => [tipX + HP_DIR[0] * s, tipY + HP_DIR[1] * s];
  // its soft shadow on the skin
  withDither(0.28 * (1 - away), () => { const m = maskEll(X(sx - 12 + HP_DIR[0] * 60), Y(sy + 12 + HP_DIR[1] * 60), 16 * z, 60 * z, Math.atan2(HP_DIR[1], HP_DIR[0]) + Math.PI / 2); mFill(m, P.SK0); });
  // the aiming dot and the spacer prong that rests on the skin
  if (away < 0.3) { disc(X(aim.x), Y(aim.y), 1.8 * z, P.AIM); }
  const nX = -HP_DIR[1], nY = HP_DIR[0], hp = (s_, n_) => [tipX + HP_DIR[0] * s_ + nX * n_, tipY + HP_DIR[1] * s_ + nY * n_];
  const cap = (s0, n0, s1, n1, r, a, b_, c, d) => { const [ax, ay] = hp(s0, n0), [bx, by] = hp(s1, n1); capsule(cam, ax, ay, bx, by, r, a, b_, c, d); };
  { const [p0x, p0y] = hp(10, -10); lineW(X(p0x), Y(p0y), X(sx - 11), Y(sy + 5), 2 * z, P.HP2); }
  // articulated arm going off toward the console
  { const [e0x, e0y] = hp(232, 0), e1x = e0x + 120, e1y = e0y - 104, e2x = e1x + 40, e2y = e1y - 200;
    capsule(cam, e0x, e0y, e1x, e1y, 8, P.HP2, P.HP3, P.HP1, P.HP0); disc(X(e1x), Y(e1y), 12 * z, P.HP1); disc(X(e1x), Y(e1y), 8 * z, P.HP2);
    capsule(cam, e1x, e1y, e2x, e2y, 8, P.HP2, P.HP3, P.HP1, P.HP0); }
  if (o.console) drawConsole(cam, t);
  // the clinician's gloved hand (cuff and back of the hand), the fingers under the body
  cap(196, 40, 330, 72, 34, P.GV2, P.GV3, P.GV1, P.GV0);
  { const [hx, hy] = hp(150, 30), m = maskEll(X(hx), Y(hy), 56 * z, 42 * z, Math.atan2(HP_DIR[1], HP_DIR[0])); shade(m, P.GV2, P.GV3, P.GV1, P.GV0, { k: Math.max(1, Math.round(z)) }); }
  cap(128, 32, 92, 22, 9.5, P.GV1, P.GV2, P.GV0, P.GV0);
  cap(138, 40, 108, 34, 9, P.GV1, P.GV2, P.GV0, P.GV0);
  // the handpiece: nozzle, grip ring, white body, a steady status light
  cap(28, 0, 232, 0, 15, P.HP4, P.HP4, P.HP3, P.HP1);
  cap(62, 0, 74, 0, 15.5, P.HP1, P.HP2, P.HP0, P.HP0);
  cap(0, 0, 28, 0, 9, P.HP1, P.HP2, P.HP0, P.HP0);
  { const [lx, ly] = hp(206, -6); disc(X(lx), Y(ly), 2.4 * z, P.DT2); }
  const [n0x, n0y] = hp(0, 0);
  // index finger along the top of the body, thumb on the other side
  cap(136, 14, 80, 7, 9.5, P.GV2, P.GV4, P.GV1, P.GV0);
  cap(150, -16, 100, -13, 10, P.GV2, P.GV4, P.GV1, P.GV0);
  // the pulse: a faint violet-red cone for three frames and a soft glow on the spot (1064 nm is invisible: educational colour)
  if (o.pulses) for (const tp of o.pulses) {
    const age = t - tp; if (age < 0 || age > 0.16) continue;
    const k = age < 0.05 ? 1 : 1 - (age - 0.05) / 0.11;
    if (age < 0.05) withDither(0.38, () => poly([X(n0x) - 2 * z, Y(n0y), X(n0x) + 2 * z, Y(n0y), X(aim.x) + 8 * z, Y(aim.y), X(aim.x) - 8 * z, Y(aim.y)], P.LZ2));
    glow(X(aim.x), Y(aim.y), 13 * z, P.LZ3, P.LZ4, 0.5 * k);
  }
}
// the laser console (seen when the camera pulls back): a white cabinet with its screen
const CONSOLE = { x0: 352, y0: -268, x1: 486, y1: -96 };
function drawConsole(cam, t) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, { x0, y0, x1, y1 } = CONSOLE;
  if (X(x0) > W || Y(y1) < 0) return;
  const m = maskRR(X(x0), Y(y0), X(x1), Y(y1), 10 * z); shade(m, P.CN3, P.CN3, P.CN1, P.CN0, { k: Math.max(1, Math.round(z)) });
  const s0 = [x0 + 12, y0 + 14, x1 - 12, y0 + 92]; rect(X(s0[0]), Y(s0[1]), X(s0[2]), Y(s0[3]), P.SCR0); frame(X(s0[0]), Y(s0[1]), X(s0[2]), Y(s0[3]), P.CN0);
  const sc = Math.max(1, Math.round(z * 2.6));
  text(FS, 'Nd:YAG', X(s0[0] + 6), Y(s0[1] + 6), { sc: Math.max(1, sc - 1), c: P.DT2, ol: null });
  text(FS, '1064 nm', X(s0[0] + 6), Y(s0[1] + 24), { sc, c: P.DT3, ol: null });
  text(FS, 'Q-SWITCHED', X(s0[0] + 6), Y(s0[1] + 54), { sc: Math.max(1, sc - 1), c: P.DT2, ol: null });
  for (let k = 0; k < 3; k++) { const bx = x0 + 16 + k * 36; const mb = maskRR(X(bx), Y(y0 + 104), X(bx + 26), Y(y0 + 120), 4 * z); shade(mb, P.CN2, P.CN3, P.CN1, P.CN0, {}); }
  disc(X(x1 - 26), Y(y0 + 146), 11 * z, P.CN1); disc(X(x1 - 26), Y(y0 + 146), 8 * z, P.CN2);
}
