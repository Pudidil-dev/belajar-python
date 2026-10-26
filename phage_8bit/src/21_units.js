'use strict';
// ============================================================================
// THE FACTORY CROWD: 64 phage "units" inside C0. Each one shows up as loose
// parts (empty head, tail, fibre rods) in the factory, gets its head filled
// with a genome copy, assembles into a complete phage, and is thrown out at
// the burst. Plus the genome copies (1 -> 2 -> 4 -> 8 -> 16 -> 32) and the
// hero assembly line (prohead on the membrane, packaging, tails, docking).
// ============================================================================
const NU = 64;
const HERO_HEAD = { portal: [-87, -100] };                 // C0-local: prohead portal on the left inner membrane
const PACK_V = [-60, -74];                                 // C0-local: head bottom vertex while packaging
const TAIL_A = [28, -50], TAIL_B = [64, -32], TAIL_B_A = 0.28;
const V_C = [4, -200];
let UNITS = [], COPIES = [];
function unitsInit() {
  const avoid = [[28, -70, 40], [64, -50, 34], [-60, -88, 36], [-80, -100, 30], [V_C[0], V_C[1], 20]];
  let tries = 0;
  while (UNITS.length < NU && tries++ < 5000) {
    const x = (hash(tries * 3 + 7001) - 0.5) * 150, y = (hash(tries * 3 + 7002) - 0.5) * 430;
    if (cellSD(C0, x, y) > -30) continue;
    if (avoid.some(([ax, ay, r]) => Math.hypot(x - ax, y - ay) < r)) continue;
    if (UNITS.some(u => Math.hypot(u.x - x, (u.y - y) * 0.8) < 21)) continue;
    UNITS.push({ x, y, a: (hash(tries + 7003) - 0.5) * 1.3 });
  }
  // the hero zone (upper middle: head assembly, packaging, tails, docking) stays clear until scene 19
  const inZone = u => u.x > -106 && u.x < 80 && u.y > -205 && u.y < 28;
  UNITS.forEach((u, k) => {
    u.k = k; u.h = hash(k * 13 + 7100); u.zone = inZone(u);
    u.part = !u.zone && k < 52 ? 40.2 + 3.6 * hash(k * 13 + 7101) : null;
    u.done = u.zone ? 56.15 + 2.9 * hash(k * 13 + 7102) : 53.7 + 5.2 * Math.pow(hash(k * 13 + 7102), 0.8);
    // exit: most stream out of the big tear (upper left), the rest are pushed out radially through smaller tears
    const wl = [-100, -105], toW = Math.atan2(wl[1] - u.y, wl[0] - u.x), rad = Math.atan2(u.y - 30, u.x), dW = Math.hypot(wl[0] - u.x, wl[1] - u.y);
    const viaW = hash(k + 7106) < 0.62;
    u.dir = viaW ? toW + (hash(k + 7103) - 0.5) * 1.1 : rad + (hash(k + 7103) - 0.5) * 0.9;
    u.v = viaW ? 140 + 420 * Math.pow(hash(k + 7104), 0.7) + 0.4 * dW : 60 + 240 * Math.pow(hash(k + 7104), 1.6);
    u.spin = (hash(k + 7105) - 0.5) * 7; u.viaW = viaW;
  });
  // genome copies
  COPIES = [];
  const born = j => j === 0 ? 0 : j < 2 ? T_COPY[0] : j < 4 ? T_COPY[1] : j < 8 ? T_COPY[2] : j < 16 ? T_COPY[3] : j < 24 ? barT(23) + BEAT : barT(24) + BEAT;
  for (let j = 0; j < 32; j++) {
    const g = j === 0 ? 0 : Math.floor(Math.log2(j)), parent = j === 0 ? -1 : j - (1 << g);
    const R_ = 8 + 11 * Math.sqrt(j), th = j * 2.39996 + 0.3;
    let hx = -4 + R_ * Math.cos(th) * 1.05, hy = -112 + R_ * Math.sin(th) * 0.9;           // below the injected genome, where the host chromosome used to be
    if (cellSD(C0, hx, hy) > -22) { hx *= 0.7; }
    if (j === 9) { hx = PACK_V[0] + 3; hy = PACK_V[1] + 24; }
    COPIES.push({ j, parent, born: born(j), x: hx, y: hy, a: hash(j + 7200) * TAU, coil: j % 4, eat: j === 9 ? T_PACK0 : 43.4 + 2.4 * hash(j + 7201) });
  }
}
function copyPos(j, t) {
  const C = COPIES[j];
  if (j === 0) return [C.x, C.y];
  const P_ = copyPos(C.parent, C.born), k = K75(seg(t, C.born, C.born + 0.55));
  return [lerp(P_[0], C.x, k), lerp(P_[1], C.y, k)];
}
function drawCopies(cam, t) {
  for (const C of COPIES) {
    if (C.j === 0 || t < C.born) continue;
    let sc = 1;
    if (t > C.eat) { sc = 1 - seg(t, C.eat, C.eat + (C.j === 9 ? T_PACK1 - T_PACK0 : 0.9)); if (sc <= 0.05) continue; }
    const p = copyPos(C.j, t), w = C0w(p[0], p[1]), age = t - C.born;
    const grow = age < 0.3 ? 0.4 + 0.6 * backOut(age / 0.3, 1.4) : 1;
    helixRod(cam, w[0], w[1], C.a + 0.25 * Math.sin(t * 0.7 + C.j), 26, C.j % 2 ? 1 : -1, t, grow * sc);
    if (age < 0.25) ring(cam.x(w[0]), cam.y(w[1]), (4 + 40 * age) * cam.z, 1, P.VD3, 1 - age * 4);
  }
}
// ---------------------------------------------------------------- unit drawing
function unitWorld(u) { return C0w(u.x, u.y); }
function burstPos(u, t) {     // after the burst: thrown out (staggered by distance to the tear), drag, then Brownian drift
  const w = unitWorld(u), delay = u.viaW ? 0.004 * Math.hypot(u.x + 100, u.y + 105) : 0.12 + 0.2 * u.h;
  const tau = Math.max(0, t - T_BURST - delay), f = (1 - Math.exp(-1.5 * tau)) / 1.5;
  const bx = 9 * Math.sin(t * 0.55 + u.k) * seg(t, T_BURST, T_BURST + 2), by = 9 * Math.cos(t * 0.47 + u.k * 1.7) * seg(t, T_BURST, T_BURST + 2);
  return [w[0] + Math.cos(u.dir) * u.v * f + bx, w[1] + Math.sin(u.dir) * u.v * f + by, u.a + u.spin * f];
}
// unit local frame: home point = middle of the phage; the phage origin (baseplate) sits 36 u "below" it
const U_OY = 36;
function phageAtMid(x, y, a) { return [x - Math.sin(a) * U_OY, y + Math.cos(a) * U_OY]; }
function drawUnit(cam, u, t) {
  const w = unitWorld(u), c = Math.cos(u.a), s = Math.sin(u.a);
  const R = (x, y) => [w[0] + x * c - y * s, w[1] + x * s + y * c];
  if (t >= u.done) {
    let x = w[0], y = w[1], a = u.a;
    if (t >= T_BURST) { const b = burstPos(u, t); x = b[0]; y = b[1]; a = b[2]; }
    const age = t - u.done, popK = age < 0.3 ? backOut(age / 0.3, 1.5) : 1;
    const o = phageAtMid(x, y, a);
    const st = { x: o[0], y: o[1], a, s: 0, bp: 0, dna: 1, stf: 0 };
    const ext = t >= T_BURST ? 0.32 + 0.12 * Math.sin(t * 2 + u.k) : 0.3 * popK;
    st.fibL = FIB_ROOT.map((_, i) => fibPose(i, ext, t + u.k, 0, 0.6));
    drawPhage(cam, st, t);
    if (age < 0.25 && cam.z > 0.5) ring(cam.x(x), cam.y(y), (6 + 30 * age) * cam.z, 1, P.PH4, 1 - age * 4);
    return;
  }
  if (u.part === null || t < u.part) return;
  const asm = smooth(seg(t, u.done - 0.35, u.done));           // parts converge just before assembling
  const pk = i => { const a = t - (u.part + i * 0.12); return a < 0 ? 0 : a < 0.3 ? backOut(a / 0.3, 1.5) : 1; };
  const fill = seg(t, 43.6 + 2.6 * u.h, 44.6 + 2.6 * u.h);
  if (pk(0) > 0.15) {         // empty head, filled by its genome copy before assembly
    const hb = R(lerp(-10, 0, asm), lerp(-12, U_OY - 40.5, asm));
    headAt(cam, hb[0], hb[1], u.a + (1 - pk(0)) * 0.6, t, fill);
  }
  if (pk(1) > 0.15) {         // tail without its head
    const tp = R(lerp(11, 0, asm), lerp(U_OY + 10, U_OY, asm));
    drawPhage(cam, { x: tp[0], y: tp[1], a: u.a, s: 0, bp: 0, dna: 0, parts: { head: 0, collar: 0, fib: 0 } }, t);
  }
  for (const [i, ox, oy, aa] of [[2, -17, 30, 0.5], [2, 16, 6, -0.7]]) {
    if (pk(i) <= 0) continue; const fp = R(lerp(ox, 0, asm), lerp(oy, U_OY - 4, asm)); partFiber(cam, fp[0], fp[1], u.a + aa, 1.6 * pk(i) * (1 - asm * 0.5));
  }
}
