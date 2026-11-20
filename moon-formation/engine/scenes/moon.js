// HOW THE MOON FORMED — nine scenes over one continuous world.
// World: Earth's centre at the origin, sim units (proto-Earth radius RE ≈ 0.93), Theia falls in from the top.
// Every scene draws from global time T, and the camera is one function camAt(T), so the cuts on the bar lines are
// invisible. Three clocks map film time onto simulation time: the point-mass approach (scene 2), the SPH impact
// (scenes 3–4) and the N-body accretion (scenes 4–7), each with smoothly varying rates (slow motion, time-lapse).
(() => {
const { W, H, P } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const BEAT = 60 / 128, BAR = 4 * BEAT, Q16 = BEAT / 4;
const T1 = 3.75, T2 = 9.375, T3 = 15, T4 = 18.75, T5 = 24.375, T6 = 30, T7 = 33.75, T8 = 39.375, TE = 45;
const ss = (a, b, x) => SPH.sstep(a, b, x), zl = VIEW.zl, toS = VIEW.toS;
const sine = MO.sineInOut;
const RT0 = 0.49;                                                  // relaxed Theia radius (sim units)

// ---------- clocks ----------
function clock(knots, v0) {                                        // rate piecewise-linear in film time, integrated
  const dt = 1 / 480, Ta = knots[0][0], Tb = knots[knots.length - 1][0], tab = [];
  const rate = T => { if (T <= Ta) return knots[0][1]; for (let i = 1; i < knots.length; i++) if (T <= knots[i][0]) { const [a, ra] = knots[i - 1], [b, rb] = knots[i]; return ra + (rb - ra) * (T - a) / (b - a); } return knots[knots.length - 1][1]; };
  let acc = v0; for (let T = Ta; T <= Tb + dt; T += dt) { tab.push(acc); acc += rate(T + dt / 2) * dt; }
  const f = T => { if (T <= Ta) return v0 + (T - Ta) * knots[0][1]; const x = (T - Ta) / dt, i = Math.floor(x); if (i >= tab.length - 1) return tab[tab.length - 1] + (T - Ta - (tab.length - 1) * dt) * knots[knots.length - 1][1]; return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
  f.inv = v => { let lo = Ta - 5, hi = Tb + 5; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (f(m) < v) lo = m; else hi = m; } return (lo + hi) / 2; };
  return f;
}
let CK = null;
function clocks() {
  if (CK) return CK;
  const im = SIMD.imp, tc = im.tcontact, tauC = tc - im.tstart, tau0 = -15;
  const raw = clock([[T1, 1], [T2 - 1.1, 1], [T2 - 0.35, 0.55], [T2, 0.55]], 0), rEnd = raw(T2);
  const tau = T => tau0 + (tauC - tau0) * raw(T) / rEnd;
  const simA = clock([[T2, 0.42], [T2 + 1.6, 0.42], [T2 + 2.6, 1.15], [T3, 1.15], [T3 + 0.7, 0.4]], tc);
  const simB = clock([[18.0, 0.5], [T4, 1.0], [21.0, 2.0], [T5, 2.6], [26.0, 6], [T6, 9], [31.0, 18], [T7, 40]], 0.4);
  // merge / fallback events in film time, quantized to 16th notes, at most one of each kind per 16th
  const ev = [], seen = new Set();
  for (const e of SIMD.events) {
    if (e.t > simB(T7 + 0.1)) break;
    const Tf = simB.inv(e.t); if (Tf < 18.0) continue;
    const Tq = Math.round(Tf / Q16) * Q16, key = e.type + ':' + Math.round(Tq / Q16);
    const big = e.type === 2 && e.m > 0.002;
    if (seen.has(key) && !big) continue; seen.add(key);
    ev.push({ ...e, T: Tq, Tphys: Tf });
  }
  CK = { tau, simA, simB, tc, tauC, ev };
  return CK;
}

// ---------- positions ----------
let cacheT = null, cacheTheia = null;
function theiaPos(T) {                                             // Theia's centre relative to Earth during the approach
  if (cacheT === T) return cacheTheia;
  const k = clocks(), tau = k.tau(Math.min(T, T2)), ts = tau + SIMD.imp.tstart;
  let p;
  if (ts < 0) p = SIMD.approachAt(tau);
  else { SIMD.impactAt(ts); p = SIMD.theiaCM(); }
  cacheT = T; cacheTheia = p; return p;
}
let armC = null;
function armCentroid() {                                           // centre of the ejected material at the end of the SPH run
  if (armC) return armC;
  SIMD.impactAt(6.0); let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < SIMD.impN; i++) { const r = Math.hypot(SIMD.impX[i], SIMD.impY[i]); if (r > 1.4 * SIMD.RE && r < 9) { sx += SIMD.impX[i]; sy += SIMD.impY[i]; n++; } }
  armC = n ? [sx / n, sy / n] : [0, 0]; return armC;
}
let diveTgt = null;
function diveTarget() {                                            // densest bit of the arm at t≈6 (where the clump forms)
  if (diveTgt) return diveTgt;
  SIMD.impactAt(6.0); let best = null, bc = -1;
  for (let i = 0; i < SIMD.impN; i += 3) {
    const xi = SIMD.impX[i], yi = SIMD.impY[i]; if (Math.hypot(xi, yi) < 2.2 * SIMD.RE) continue;
    let c = 0; for (let j = 0; j < SIMD.impN; j += 2) { const dx = SIMD.impX[j] - xi, dy = SIMD.impY[j] - yi; if (dx * dx + dy * dy < 0.04) c++; }
    if (c > bc) { bc = c; best = [xi, yi, SIMD.impVX[i], SIMD.impVY[i]]; }
  }
  diveTgt = best || [2, 2, 0, 1]; return diveTgt;
}
// the Moon after the N-body run: frozen at the end of scene 7, then the analytic orbit of scene 9
let moonEnd = null;
function moonAtEnd() {
  if (moonEnd) return moonEnd;
  const k = clocks(); SIMD.accreteAt(k.simB(T7)); const b = SIMD.biggest();
  moonEnd = { x: b.x, y: b.y, r: b.r, th: Math.atan2(b.y, b.x), d: Math.hypot(b.x, b.y) }; return moonEnd;
}
const MOON_FINAL_R = 0.273 * 0.9285, PHI7 = -Math.PI / 2 - 0.25, PHI_F = -70 * Math.PI / 180, FINAL_D = 4.6, D_START = 3.2;
const TL0 = T8 + 0.9, TL1 = 43.9;                                   // the time-lapse window of scene 9
function moonOrbit(T) {                                            // scenes 8–9 (Earth-centred, unrotated world): angle, distance, radius
  const m = moonAtEnd();
  let thF = PHI_F; while (thF < m.th + 3 * Math.PI) thF += TAU;    // 1.5–2.5 more turns; ends where the final roll is a whole turn
  const u = clamp((T - TL0) / (TL1 - TL0)), e = 1 - Math.pow(1 - u, 2.4);
  // the N-body Moon is on an eccentric orbit; while the camera is locked on it (scene 8, Earth off-screen) it settles to
  // a near-Roche starting orbit, so that the time-lapse can show the real direction of change: outward
  const d0 = lerp(m.d, D_START, ss(T7 + 0.3, T8 - 0.3, T));
  const th = m.th + (thF - m.th) * e, d = d0 + (FINAL_D - d0) * (1 - Math.pow(1 - u, 1.7));
  const r = lerp(m.r, MOON_FINAL_R, ss(T7, TL0 + 1.5, T));
  return { th, d, r, x: Math.cos(th) * d, y: Math.sin(th) * d };
}
function moonNow(T) {                                              // proto-Moon position for scenes 5–7 (largest N-body fragment)
  const k = clocks(); SIMD.accreteAt(k.simB(T)); return SIMD.biggest();
}
const unwrap = (a, ref) => { while (a - ref > Math.PI) a -= TAU; while (a - ref < -Math.PI) a += TAU; return a; };

// ---------- the camera ----------
let C2c = null;
const PULSE = [[T2 + 1.4, T3], [T4, T5], [T6, T7]];
function kickPulse(T) {                                            // a 1.8% zoom bump on every kick of the drops
  for (const [a, b] of PULSE) if (T >= a && T < b) { const ph = ((T - T2) / BEAT) % 1 * BEAT; return 1 + 0.018 * Math.exp(-ph / 0.085); }
  return 1;
}
function camAt(T) { const c = camAt0(T); if (!c.pulsed) { c.z *= kickPulse(T); c.pulsed = true; } return c; }
function camAt0(T) {
  const RE = SIMD.RE;
  if (T < T1) {                                                    // S1: from the magma horizon out to the whole planet
    const e = sine(clamp((T - 0.35) / (T1 - 0.35)));
    return { x: lerp(0.1, 0, e), y: lerp(-RE + 65 / 660, -0.08, e), z: zl(660, 128, e) };
  }
  if (T < T2) {                                                    // S2: out into space, then ride Theia's fall
    const th = theiaPos(T), d = Math.hypot(th[0], th[1]);
    const a = MO.k75(clamp((T - T1) / 1.5)), A = { x: lerp(0, 0.4, a), y: lerp(-0.08, -3.6, a), z: zl(128, 22, a) };
    const zF = clamp(0.6 * H / (d + RE + RT0), 22, 100), F = { x: th[0] * 0.58, y: th[1] * 0.58, z: zF };
    const b = ss(T1 + 1.4, T1 + 2.4, T);
    return { x: lerp(A.x, F.x, b), y: lerp(A.y, F.y, b), z: zl(A.z, F.z, b) };
  }
  if (T < 18.0) {                                                  // S3 + dive: hold on the impact with shake, pull out, dive in
    if (!C2c) C2c = camAt0(T2 - 1e-6);
    const C2 = C2c, arm = armCentroid(), ac = { x: arm[0] * 0.45, y: arm[1] * 0.45 };
    const p = sine(clamp((T - 12.0) / 3.0));
    let cam = { x: lerp(C2.x, ac.x, p), y: lerp(C2.y, ac.y, p), z: zl(C2.z * 0.92, 26, p) };
    if (T >= T3) { const tg = diveTarget(), u = clamp((T - T3) / 0.6); cam = { x: lerp(cam.x, tg[0], MO.cubicOut(u)), y: lerp(cam.y, tg[1], MO.cubicOut(u)), z: zl(cam.z, 1400, MO.cubicIn(u)) }; }
    const amp = T >= T2 ? 5 * Math.exp(-(T - T2) * 3.2) + 1.6 * Math.exp(-Math.max(0, T - T2 - 1.4) * 5) * (T > T2 + 1.4 ? 1 : 0) : 0;
    if (amp > 0.4) { const f = Math.floor(T * 30); cam.sx = Math.round((h(f, 3) - 0.5) * 2 * amp); cam.sy = Math.round((h(f, 4) - 0.5) * 2 * amp); }
    return cam;
  }
  if (T < T5) {                                                    // dive out of the plume, then the debris disk (inertial)
    const b = moonNow(T), fr = clamp((T - 18.0) / 0.75);
    const D = { x: lerp(0.15, 0.3, clamp((T - T4) / (T5 - T4))), y: lerp(-0.9, -1.5, clamp((T - T4) / (T5 - T4))), z: lerp(24, 19.5, sine(clamp((T - T4) / (T5 - T4)))) };
    if (fr >= 1) return D;
    const e = MO.cubicOut(fr); return { x: lerp(b.x, D.x, e), y: lerp(b.y, D.y, e), z: zl(1400, D.z, e) };
  }
  // S6–S7: co-rotate with the proto-Moon so it holds still above Earth while time speeds up
  const b = moonNow(Math.min(T, T7)), th = Math.atan2(b.y, b.x);
  const b5 = moonNow(T5), th5 = Math.atan2(b5.y, b5.x);
  const thU = unwrapTrack(T, th);
  const phiS = lerp(th5, -Math.PI / 2 - 0.25, ss(T5, T5 + 2.6, T)), k = ss(T5, T5 + 1.2, T);
  let r = k * (thU - phiS);
  if (T < T6) {
    const z = zl(19.5, 52, sine(clamp((T - T5) / (T6 - T5)))), f = lerp(0.18, 0.76, ss(T5, T6, T));
    const D5 = camAt0(T5 - 1e-6);
    return { x: lerp(D5.x, b.x * f, ss(T5, T5 + 1.5, T)), y: lerp(D5.y, b.y * f, ss(T5, T5 + 1.5, T)), z, r };
  }
  if (T < T7) {
    const e = sine(clamp((T - T6 - 0.2) / (T7 - T6 - 0.4))), f = lerp(0.76, 1, ss(T6, T6 + 2.2, T));
    return { x: b.x * f, y: b.y * f, z: zl(52, 270, e), r };
  }
  const m = moonOrbit(T);
  if (T < T8) return { x: m.x, y: m.y, z: zl(270, 320, sine((T - T7) / (T8 - T7))), r: m.th - PHI7 + camRollEnd() - (moonAtEnd().th - PHI7) };
  // S9: still co-rotating with the Moon, so it stays put while the sunlight sweeps round (the time-lapse) and it drifts out
  const phi = lerp(PHI7, PHI_F, ss(T8, TL0 + 1.6, T)), r9 = m.th - phi + (camRollEnd() - (moonAtEnd().th - PHI7));
  const e1 = sine(clamp((T - T8) / 1.4)), e2 = sine(clamp((T - T8 - 1.4) / (TL1 - T8 - 1.4)));
  const al = lerp(1, 0.55, e1) + (0.5006 - 0.55) * e2, be = -0.1725 * e2;   // final: Earth at (90, 400), the Moon near (203, 89)
  const ux = Math.cos(m.th), uy = Math.sin(m.th);
  return { x: ux * al * m.d - uy * be, y: uy * al * m.d + ux * be, z: zl(zl(320, 100, e1), 72, e2), r: r9 };
}
// continuous (unwrapped) angle of the proto-Moon, sampled forward from T5
let thTrack = null;
function unwrapTrack(T, th) {
  if (!thTrack) {
    const b5 = moonNow(T5); thTrack = []; let prev = Math.atan2(b5.y, b5.x);
    for (let t = T5; t <= T7 + 0.05; t += 1 / 60) { const b = moonNow(t), a = unwrap(Math.atan2(b.y, b.x), prev); thTrack.push(a); prev = a; }
  }
  const i = clamp(Math.round((Math.min(T, T7) - T5) * 60), 0, thTrack.length - 1); return unwrap(th, thTrack[i]);
}
let rollEnd = null;
function camRollEnd() {                                           // roll at the end of scene 7 (unwrapped track)
  if (rollEnd != null) return rollEnd;
  const b = moonNow(T7), th = unwrapTrack(T7, Math.atan2(b.y, b.x));
  rollEnd = th - PHI7; return rollEnd;
}

// ---------- shared drawing ----------
const MAG = SPH.R.magma;
const col = (rmp, lv) => { const c = rmp[Math.max(0, Math.min(rmp.length - 1, Math.round(lv)))]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
function earthBody(c, cam, T, tex, o = {}) {
  const [x, y] = toS(cam, 0, 0), R = SIMD.RE * cam.z * (o.scale || 1);
  SPH.draw(c, { cx: x, cy: y, R, spin: o.spin ?? T * 0.22, tilt: 0.38, roll: -(cam.r || 0), light: VIEW.sun(cam), tex, halo: o.halo, stretch: o.stretch, rim: o.rim ?? 0.6 });
  return [x, y, R];
}
function ring(c, x, y, r, key, a = 1) {                             // 1-px pixel ring
  if (r < 0.5 || a <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[key];
  const n = Math.max(8, Math.ceil(r * 6.3));
  for (let i = 0; i < n; i++) { if (a < 1 && h(i, Math.floor(r)) > a) continue; const an = i / n * TAU; c.fillRect(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), 1, 1); }
  c.restore();
}
function lbl(c, T, o) { PIX.label(c, { col: 'c3', lineCol: 'q4', ...o }, T); }

// ---------- S1 · the young Earth: magma ocean, crust rafts, lava fountains on the beat ----------
const FOUNT = []; for (let i = 0; i < 14; i++) FOUNT.push({ ang: -Math.PI / 2 + (h(i, 1) - 0.5) * 1.5, beat: i % 8, sub: (i * 3) % 4, h: 0.6 + h(i, 2) * 0.8, n: 7 + Math.floor(h(i, 3) * 6) });
function fountains(c, cam, T, spinOff = 0) {
  const RE = SIMD.RE, g = 0.11;
  for (const [fi, f] of FOUNT.entries()) {
    for (let k = -1; k < 12; k++) {
      const t0 = (k * 2 + (f.beat % 2)) * BEAT + f.sub * Q16 * 0.5, age = T - t0; if (age < 0 || age > 1.9) continue;
      const ang = f.ang + spinOff;
      for (let j = 0; j < f.n; j++) {
        const spr = (h(fi * 13 + j, k + 50) - 0.5) * 0.9, v = 0.07 + 0.085 * f.h * (0.6 + 0.4 * h(j, k + fi));
        const ox = Math.cos(ang) * RE, oy = Math.sin(ang) * RE, nx = Math.cos(ang + spr), ny = Math.sin(ang + spr);
        const up = v * age - 0.5 * g * age * age; if (up < -0.002) continue;
        const tx = -Math.sin(ang), ty = Math.cos(ang), side = (nx * tx + ny * ty) * v * age;
        const wx = ox + Math.cos(ang) * up + tx * side, wy = oy + Math.sin(ang) * up + ty * side;
        const [sx, sy] = toS(cam, wx, wy); if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const heat = 1 - age / 1.9, size = cam.z > 400 ? 2 : 1, vy = v - g * age;   // a short trail behind each blob
        const [qx, qy] = toS(cam, ox + Math.cos(ang) * (up - vy * 0.05) + tx * side * 0.96, oy + Math.sin(ang) * (up - vy * 0.05) + ty * side * 0.96);
        c.fillStyle = col(MAG, 3 + heat * 3); c.fillRect(Math.round(qx), Math.round(qy), 1, 1);
        c.fillStyle = col(MAG, 4 + heat * 3.5); c.fillRect(Math.round(sx), Math.round(sy), size, size);
      }
      if (age < 0.25 && cam.z > 250) { const [bx, by] = toS(cam, Math.cos(f.ang + spinOff) * RE, Math.sin(f.ang + spinOff) * RE); ring(c, bx, by, 2 + age * 24, 'y1', 1 - age / 0.25); }
    }
  }
}
SC.m01_early_earth = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T);
    VIEW.sky(c, cam, T, { dust: 0.45 }); 
    const [x, y, R] = earthBody(c, cam, T, SPH.tex.moltenEarth(T, { cover: 0.55 }), { spin: 0.25 + T * 0.05, halo: { ramp: MAG, lv: 4.6, w: Math.max(3, 24 - T * 4), a: 0.55 } });
    fountains(c, cam, T);
    const la = toS(cam, -0.35, -SIMD.RE * 0.94);
    lbl(c, T, { ax: Math.max(20, Math.min(250, la[0])), ay: Math.max(30, la[1]), tx: 16, ty: 46, text: 'EARLY EARTH', t0: 0.9, t1: 3.35, col: 'y1', lineCol: 'o1' });
  },
  cues: [[0, 'cosmos', 0.9, 0, 9.4], [0, 'magma_bed', 0.75, 0, 9.4], ...[0, 1, 2, 3, 4, 5, 6, 7].map(b => [b * BEAT, 'lava_pop', 0.5, ((b * 5) % 7 - 3) / 4, b]),
    [0.9, 'type', 0.3], [0.9, 'pull_out', 0.55, 0, 2.85]],
};

// ---------- S2 · Theia ----------
function theiaBody(c, cam, T, th, stretchK) {
  const [x, y] = toS(cam, th[0], th[1]), R = RT0 * cam.z;
  const toE = Math.atan2(-th[1], -th[0]) - (cam.r || 0);
  SPH.draw(c, { cx: x, cy: y, R, spin: T * 0.4 + 1.3, tilt: 0.2, roll: -(cam.r || 0), light: VIEW.sun(cam), tex: SPH.tex.theia(T), stretch: stretchK > 1.001 ? { ang: toE, k: stretchK } : null, rim: 0.7 });
  return [x, y, R];
}
SC.m02_theia = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), th = theiaPos(T), d = Math.hypot(th[0], th[1]);
    VIEW.sky(c, cam, T, { dust: 0.5 }); 
    const close = clamp((4.5 - d) / 3);
    // Theia's past path: faint dots, so the curve of the fall reads
    const k = clocks(), tauNow = k.tau(T);
    for (let q = 1; q < 40; q++) {
      const tq = tauNow - q * 0.35; if (tq < -15) break;
      const p = tq + SIMD.imp.tstart < 0 ? SIMD.approachAt(tq) : null; if (!p) continue;
      const [px, py] = toS(cam, p[0], p[1]); if (px < 0 || py < 0 || px >= W || py >= H) continue;
      if (q % 2 === 0) { c.fillStyle = P[q < 12 ? 'q3' : 'q2']; c.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
    const toT = Math.atan2(th[1], th[0]) - (cam.r || 0);
    earthBody(c, cam, T, SPH.tex.moltenEarth(T, { cover: 0.55 }), { spin: 0.25 + T * 0.05, halo: { ramp: MAG, lv: 4.6, w: Math.max(3, 0.12 * SIMD.RE * cam.z), a: 0.5 }, stretch: close > 0 ? { ang: toT, k: 1 + 0.045 * close * close } : null });
    if (cam.z > 200) fountains(c, cam, T);
    const [tx, ty, tr] = theiaBody(c, cam, T, th, 1 + 0.1 * close * close);
    // the last instant before contact: the gap glows
    const pre = ss(T2 - 0.25, T2, T);
    if (pre > 0) { const [gx, gy] = toS(cam, th[0] * 0.66, th[1] * 0.66); PIX.glow(c, gx, gy, 10 + 40 * pre, 'y1', 0.9 * pre); }
    lbl(c, T, { ax: tx + tr * 0.5, ay: ty + tr * 0.5, tx: Math.min(200, tx + tr + 14), ty: Math.max(24, ty + tr + 18), text: 'THEIA', t0: 5.3, t1: 8.6, col: 'q5', lineCol: 'q4' });
  },
  cues: [[0, 'reveal', 0.5], [1.4, 'theia_ping', 0.5, 0.4], [1.55, 'type', 0.3], [1.25, 'tension', 0.8, 0, 4.4], [5.4, 'reverse', 0.7, 0, 0.225]],
};

// ---------- S3 · the giant impact (SPH) ----------
function impactFrame(c, cam, T, tsim) {
  SIMD.impactAt(tsim);
  const sph = [];
  const [ex, ey] = toS(cam, 0, 0);
  sph.push({ x: ex, y: ey, r: SIMD.RE * cam.z * 0.985, tex: SPH.tex.moltenEarth(T, { cover: 0.55 }), spin: 0.25 + T * 0.05, tilt: 0.38, roll: -(cam.r || 0) });
  if (tsim < 1.25) { const tc = SIMD.theiaCM(), [tx, ty] = toS(cam, tc[0], tc[1]); sph.push({ x: tx, y: ty, r: RT0 * cam.z * Math.max(0.3, 1 - (tsim - 0.95) * 1.2), tex: tsim < 1.05 ? SPH.tex.theia(T) : null, spin: T * 0.4 + 1.3, tilt: 0.2, roll: -(cam.r || 0) }); }
  META.fluid(c, cam, { n: SIMD.impN, X: SIMD.impX, Y: SIMD.impY, VX: SIMD.impVX, VY: SIMD.impVY, U: SIMD.impU, mat: SIMD.impMat, heat0: SIMD.impHeat0, tone: SIMD.impTone,
    h: SIMD.imp.h, sp: SIMD.imp.sp, light: VIEW.sun(cam), spheres: sph, cool: 0, streak: cam.z * 0.012 });
}
let contactPt = null;
function contact() {
  if (contactPt) return contactPt;
  const th = theiaPos(T2 - 1e-4), d = Math.hypot(th[0], th[1]), f = SIMD.RE / (SIMD.RE + RT0);
  contactPt = [th[0] * f, th[1] * f, d]; return contactPt;
}
SC.m03_impact = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), k = clocks(), tsim = k.simA(T);
    VIEW.sky(c, cam, T, { dust: 0.5 }); 
    impactFrame(c, cam, T, tsim);
    const cp = contact(), [cx, cy] = toS(cam, cp[0], cp[1]), a = T - T2;
    // shock ring through space + flash
    if (a < 1.3) { ring(c, cx, cy, a * 260, a < 0.5 ? 'y1' : 'o1', 1 - a / 1.3); ring(c, cx, cy, a * 180, 'o0', 0.6 * (1 - a / 1.3)); }
    if (a < 0.45) { PIX.glow(c, cx, cy, 60 + a * 200, 'y1', 0.9 * (1 - a / 0.45)); c.save(); c.globalAlpha = Math.pow(Math.max(0, 1 - a / 0.3), 1.6); c.fillStyle = P.w; c.fillRect(0, 0, W, H); c.restore(); }
    lbl(c, T, { ax: cx, ay: cy, tx: clamp(cx - 110, 10, 150), ty: clamp(cy - 70, 20, 400), text: 'GIANT IMPACT', t0: T2 + 0.3, t1: T2 + 2.9, col: 'y1', lineCol: 'o1' });
  },
  cues: [[0, 'impact', 1.0], [0, 'shock', 0.8], [0.05, 'molten_roar', 0.75, 0, 5.4], [0.3, 'type', 0.3], ...[0.94, 1.41, 1.875, 2.34, 2.81, 3.28].map((b, i) => [b, 'splat', 0.45 - i * 0.04, ((i % 3) - 1) * 0.5, i]), [2.6, 'pull_out', 0.5, 0, 3.0], [5.3, 'dive', 0.7, 0, 0.6]],
};

// ---------- S4 · inside the plume: droplets, fragments, vapour ----------
const DROPS = []; for (let i = 0; i < 60; i++) DROPS.push({ L: i < 34 ? 0 : i < 54 ? 1 : 2, x: h(i, 1), y: h(i, 2), s: h(i, 3), ph: h(i, 4) * TAU, born: i % 5 === 0 ? 15.6 + h(i, 5) * 2.2 : 0 });
const FRAGS = []; for (let i = 0; i < 9; i++) { const v = []; for (let k = 0; k < 7; k++) v.push(0.62 + 0.38 * h(i, 20 + k)); FRAGS.push({ L: i < 4 ? 0 : i < 7 ? 1 : 2, x: h(i, 11), y: h(i, 12), rot: h(i, 14) * TAU, spin: (h(i, 15) - 0.5) * 2.2, v, cr: [h(i, 40), h(i, 41), h(i, 42)] }); }
const MERGES = [16.40625, 16.875, 17.34375, 17.8125].map((Tm, i) => ({ Tm, x: [0.38, 0.62, 0.45, 0.58][i], y: [0.34, 0.5, 0.64, 0.28][i], r1: 9 + 4 * h(i, 33), r2: 6 + 4 * h(i, 34), ang: h(i, 35) * TAU }));
const SPARK = []; for (let i = 0; i < 40; i++) SPARK.push({ x: h(i, 61), y: h(i, 62), t: 15.7 + h(i, 63) * 2.3 });
let flowDir = null;
function micro(c, T, scale) {
  const dv = diveTarget(); if (!flowDir) { const L = Math.hypot(dv[2], dv[3]) || 1; flowDir = [dv[2] / L, dv[3] / L]; }
  const fx = flowDir[0], fy = flowDir[1], cx0 = W / 2, cy0 = H / 2, cool = clamp((T - 15.3) / 3.4);
  c.fillStyle = P.k; c.fillRect(0, 0, W, H);
  // rock vapour: glowing wisps stretched along the flow
  const img = c.getImageData(0, 0, W, H), d = img.data, drift = T * 1.9, sc = 1 / scale;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = (x - cx0) * sc, Y = (y - cy0) * sc, al = X * fx + Y * fy, ac = -X * fy + Y * fx;
    const n = SPH.fbm(al * 0.006 - drift, ac * 0.022, T * 0.25, 3), th = PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
    const v = (n - 0.44) * 3.2; if (v < th * 0.5) continue;
    const lv = 1 + v * 3.2 * (1 - cool * 0.45), cc = MAG[Math.max(1, Math.min(5, Math.floor(lv + th - 0.5)))], i = (y * W + x) * 4;
    d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2];
  }
  c.putImageData(img, 0, 0);
  // speed lines
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 26; i++) {
    const len = (18 + 50 * h(i, 71)) * scale, sp = 260 + 200 * h(i, 72), span = 600;
    const along = ((h(i, 73) * span + sp * T) % span) - span / 2, across = (h(i, 74) - 0.5) * 520;
    const x = cx0 + (fx * along - fy * across) * scale, y = cy0 + (fy * along + fx * across) * scale;
    c.fillStyle = P[i % 3 ? 'r1' : 'r2']; const st = Math.ceil(len);
    for (let k = 0; k < st; k += 1) c.fillRect(Math.round(x - fx * k), Math.round(y - fy * k), 1, 1);
  }
  c.restore();
  const LS = [0.4, 0.75, 1.0], SPD = [30, 60, 105];
  const place = (L, x0, y0) => {
    const span = 1.6, ox = ((x0 * W * span + fx * SPD[L] * T) % (W * span) + W * span) % (W * span) - W * 0.3;
    const oy = ((y0 * H * span + fy * SPD[L] * T) % (H * span) + H * span) % (H * span) - H * 0.3;
    return [cx0 + (ox - cx0) * scale, cy0 + (oy - cy0) * scale];
  };
  const LIT = [-0.62, -0.5, 0.6];
  for (let L = 0; L < 3; L++) {
    for (const f of FRAGS) {                                       // broken rock: dark faces, glowing cracks, a molten skin on one side
      if (f.L !== L) continue;
      const [x, y] = place(L, f.x, f.y), r = [5, 12, 24][L] * scale * (0.8 + 0.4 * f.v[0]), a = f.rot + f.spin * T;
      if (x < -r || y < -r || x > W + r || y > H + r) continue;
      const pts = f.v.map((k, i) => [x + Math.cos(a + i / 7 * TAU) * r * k, y + Math.sin(a + i / 7 * TAU) * r * k]), path = PIX.polyPath(pts);
      PIX.flat(c, path, 'q2', 'q0', 'q4', [r * 0.3, r * 0.3], [1, 1]);
      c.save(); c.clip(path);
      PIX.fill(c, PIX.polyPath([pts[4], pts[5], pts[6], [x + (pts[5][0] - x) * 0.45, y + (pts[5][1] - y) * 0.45]]), 'r2', 0.9);   // molten skin
      c.strokeStyle = col(MAG, 6.2 - cool * 2.4); c.lineWidth = 1;
      for (const [k, cr] of f.cr.entries()) { const i0 = k * 2 % 7, i1 = (k * 2 + 3) % 7; c.beginPath(); c.moveTo(pts[i0][0], pts[i0][1]); c.lineTo(x + (cr - 0.5) * r * 0.6, y + (0.5 - cr) * r * 0.4); c.lineTo(pts[i1][0], pts[i1][1]); c.stroke(); }
      c.restore();
    }
    for (const [i, dp] of DROPS.entries()) {                       // molten silicate droplets, cooling from white-hot to red
      if (dp.L !== L) continue;
      const grow = dp.born ? clamp((T - dp.born) / 0.7) : 1; if (grow <= 0) continue;
      const [x, y] = place(L, dp.x, dp.y), r = ([1.1, 4, 13][L] + [1.4, 4, 10][L] * dp.s) * scale * (0.3 + 0.7 * grow);
      if (x < -r * 3 || y < -r * 3 || x > W + r * 3 || y > H + r * 3) continue;
      const heat = clamp(1.05 - cool * (0.75 + 0.25 * (1 - dp.s)));
      if (r < 2.4) { c.fillStyle = col(MAG, 3.8 + heat * 3.6); const z2 = r > 1.4 ? 2 : 1; c.fillRect(Math.round(x), Math.round(y), z2, z2); continue; }
      PIX.glow(c, x, y, r * 2.6, heat > 0.6 ? 'y0' : 'o1', 0.3 * heat);
      SPH.draw(c, { cx: x, cy: y, R: r, spin: T * 1.2 + i, tilt: 0.4, light: LIT, tex: SPH.tex.magmaBall(T + i, { heat, scale: 1.5, flow: 0.7 }), stretch: { ang: Math.atan2(fy, fx), k: 1 + 0.08 * Math.sin(T * 8 + dp.ph) }, rim: 0.4 });
    }
    if (L === 1) for (const m of MERGES) {                          // two droplets meet and coalesce (volume kept), then the new drop rings
      const a = T - m.Tm; if (a < -1.0 || a > 1.6) continue;
      const [mx, my] = place(1, m.x, m.y), ux = Math.cos(m.ang), uy = Math.sin(m.ang), heat = clamp(1.05 - cool * 0.65), sR = scale * 1.25;
      if (a < 0) {
        const gap = (m.r1 + m.r2) * sR * (0.85 + 1.4 * ss(0, 1, -a));
        const tex = SPH.tex.magmaBall(T + 3, { heat, scale: 1.5, flow: 0.7 });
        SPH.draw(c, { cx: mx - ux * gap * m.r2 / (m.r1 + m.r2), cy: my - uy * gap * m.r2 / (m.r1 + m.r2), R: m.r1 * sR, spin: T, tilt: 0.3, light: LIT, tex, stretch: { ang: m.ang, k: 1 + 0.12 * ss(0.3, 0, -a) }, rim: 0.4 });
        SPH.draw(c, { cx: mx + ux * gap * m.r1 / (m.r1 + m.r2), cy: my + uy * gap * m.r1 / (m.r1 + m.r2), R: m.r2 * sR, spin: -T, tilt: 0.3, light: LIT, tex, stretch: { ang: m.ang, k: 1 + 0.12 * ss(0.3, 0, -a) }, rim: 0.4 });
      } else {
        const r = Math.cbrt(m.r1 ** 3 + m.r2 ** 3) * sR, wob = 1 + 0.3 * Math.exp(-a * 3.5) * Math.cos(a * 20);
        if (a < 0.25) { PIX.glow(c, mx, my, r * 3.2, 'y1', 0.85 * (1 - a / 0.25)); ring(c, mx, my, r + a * 90, 'y1', 1 - a / 0.25); }
        PIX.glow(c, mx, my, r * 2.4, 'y0', 0.3 * heat);
        SPH.draw(c, { cx: mx, cy: my, R: r, spin: T, tilt: 0.3, light: LIT, tex: SPH.tex.magmaBall(T + 7, { heat: Math.min(1, heat + 0.25 * Math.exp(-a * 2.5)), scale: 1.5, flow: 0.7 }), stretch: { ang: m.ang, k: wob }, rim: 0.4 });
      }
    }
  }
  for (const sp of SPARK) {                                        // vapour condensing: a spark, then a new tiny droplet
    const a = T - sp.t; if (a < 0 || a > 0.9) continue;
    const [x, y] = place(0, sp.x, sp.y);
    c.fillStyle = P[a < 0.12 ? 'w' : 'y1']; c.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (a < 0.12) { c.fillStyle = P.y0; c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); c.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
  }
}
SC.m04_ejecta = {
  draw(c, lt, S) {
    const T = S.t, k = clocks();
    const macroA = cc => { const cam = camAt(T); VIEW.sky(cc, cam, T, { dust: 0.5 }); impactFrame(cc, cam, T, k.simA(T)); };
    const macroB = cc => drawDebris(cc, camAt(T), T);
    if (T < 15.65) dissolve(c, macroA, cc => micro(cc, T, zl(3.2, 1, MO.cubicOut(clamp((T - 15.2) / 0.7)))), ss(15.28, 15.62, T));
    else if (T < 18.0) micro(c, T, 1 + 0.05 * Math.sin((T - 15.65) * 1.3));
    else dissolve(c, cc => micro(cc, T, zl(1, 0.12, MO.cubicIn(clamp((T - 18.0) / 0.6)))), macroB, ss(18.12, 18.5, T));
  },
  cues: [[0, 'dive_whoosh', 0.8, 0, 0.7], [0.55, 'vapour', 0.6, 0, 3.2], ...Array.from({ length: 22 }, (_, i) => [0.6 + i * Q16 * 2, 'droplet', 0.3 + 0.15 * h(i, 3), (h(i, 4) - 0.5) * 1.2, i]),
    ...[16.40625, 16.875, 17.34375, 17.8125].map((t, i) => [t - T3, 'merge_drop', 0.7, (i % 2 ? 0.3 : -0.3), i]), [3.0, 'pull_out', 0.65, 0, 0.75]],
};

// ---------- S5–S7 · debris → accretion → the young Moon (N-body) ----------
const TRAIL_N = 9, trailX = [], trailY = [], trailA = [];
function drawDebris(c, cam, T, o = {}) {
  const k = clocks(), tB = k.simB(T), RE = SIMD.RE;
  VIEW.sky(c, cam, T, { dust: 0.55 });
  // orbital trails: where each fragment was over the last ~0.4 s of film time
  for (let q = 0; q < TRAIL_N; q++) {
    SIMD.accreteAt(k.simB(T - (TRAIL_N - q) * 0.055));
    if (!trailX[q] || trailX[q].length !== SIMD.accN) { trailX[q] = new Float32Array(SIMD.accN); trailY[q] = new Float32Array(SIMD.accN); trailA[q] = new Uint8Array(SIMD.accN); }
    trailX[q].set(SIMD.accX); trailY[q].set(SIMD.accY); trailA[q].set(SIMD.accA);
  }
  SIMD.accreteAt(tB); const n = SIMD.accN;
  const img = c.getImageData(0, 0, W, H), dd = img.data, TC = ['r0', 'r0', 'r1', 'r1', 'r1', 'r2', 'r2', 'o0', 'o0'].map(key => PIX.hex(P[key]));
  for (let i = 0; i < n; i++) {
    if (!SIMD.accA[i]) continue;
    let [px, py] = toS(cam, SIMD.accX[i], SIMD.accY[i]);
    for (let q = TRAIL_N - 1; q >= 0; q--) {
      if (!trailA[q][i]) break;
      const [qx, qy] = toS(cam, trailX[q][i], trailY[q][i]), steps = Math.min(40, Math.ceil(Math.hypot(px - qx, py - qy)));
      for (let s2 = 1; s2 <= steps; s2++) {
        const x = Math.round(px + (qx - px) * s2 / steps), y = Math.round(py + (qy - py) * s2 / steps); if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = (y * W + x) * 4, cc = TC[q]; if (dd[j] + dd[j + 1] > cc[0] + cc[1]) continue; dd[j] = cc[0]; dd[j + 1] = cc[1]; dd[j + 2] = cc[2];
      }
      px = qx; py = qy;
    }
  }
  c.putImageData(img, 0, 0);
  const big = SIMD.biggest();
  // Earth: the post-impact magma ocean, puffed up, spinning fast, wrapped in rock vapour
  earthBody(c, cam, T, SPH.tex.magmaBall(T, { heat: 1, scale: 3.2, flow: 0.25 }), { scale: 1.04, spin: T * 1.1, halo: { ramp: MAG, lv: 4.0, w: Math.max(3, RE * cam.z * 0.38), a: 0.45 }, rim: 0 });
  // gravity well of the growing Moon: faint rings pulsing on the beat (scene 6)
  if (big && o.pulse) {
    const [bx, by] = toS(cam, big.x, big.y), ph = ((T - T5) / BEAT) % 1, R0 = big.r * cam.z;
    for (let q = 0; q < 3; q++) { const rr = R0 * (1.6 + q * 0.9 + ph * 0.9); ring(c, bx, by, rr, 'o0', 0.35 * (1 - (q + ph) / 3) * o.pulse); }
  }
  META.frags(c, cam, { n, X: SIMD.accX, Y: SIMD.accY, S: SIMD.accS, A: SIMD.accA, tone: SIMD.accTone, t: T, light: VIEW.sun(cam), sphereMin: 2.6,
    heatAt: i => clamp(0.6 + 0.4 * Math.min(1, SIMD.accS[i] / 0.06) - 0.2 * ss(18, 34, T)), skip: o.skipBig && big ? big.i : -1 });
  // flashes for merges and fallbacks (quantized to 16ths, the same times as their sounds)
  for (const e of k.ev) {
    const a = T - e.T; if (a < 0 || a > 0.4) continue;
    const [x, y] = toS(cam, e.x, e.y);
    if (e.type === 1) { const f = 1 - a / 0.3; if (f > 0) { PIX.glow(c, x, y, 5 + 8 * f, 'y1', 0.7 * f); ring(c, x, y, 1 + a * 14, 'o1', f); } }
    else { const s = 2 + Math.cbrt(e.m / 0.0001) * 2.2, f = 1 - a / 0.4; PIX.glow(c, x, y, s * 2.5, 'y1', 0.75 * f); ring(c, x, y, s * 0.6 + a * 30, 'y1', f); }
  }
  return big;
}
let dlf = null;
function debrisLabelFrag() {                                       // a fragment that stays in orbit and in view for the whole label
  if (dlf != null) return dlf;
  const k = clocks(), a = T4 + 0.6, b = T5 - 0.6, keep = [];
  SIMD.accreteAt(k.simB(b)); const aliveB = SIMD.accA.slice();
  SIMD.accreteAt(k.simB(a)); const cam = camAt(a);
  let best = -1, bd = 1e9;
  for (let i = 0; i < SIMD.accN; i++) { if (!SIMD.accA[i] || !aliveB[i] || SIMD.accS[i] > 0.08) continue; const [x, y] = toS(cam, SIMD.accX[i], SIMD.accY[i]); const dd = Math.hypot(x - 175, y - 250); if (x > 20 && x < 250 && y > 80 && y < 420 && dd < bd) { bd = dd; best = i; } }
  dlf = best; return dlf;
}
SC.m05_debris = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), big = drawDebris(c, cam, T);
    const fi = debrisLabelFrag();                                     // the label rides on one real fragment of the swarm
    if (fi >= 0 && SIMD.accA[fi]) {
      const [ax, ay] = toS(cam, SIMD.accX[fi], SIMD.accY[fi]);
      lbl(c, T, { ax, ay, tx: clamp(ax - 40, 10, 170), ty: clamp(ay - 56, 20, 420), text: 'ORBITAL DEBRIS', t0: T4 + 0.6, t1: T5 - 0.6, col: 'y1', lineCol: 'o1' });
    }
  },
  cues: () => [[0, 'orbit_hum', 0.6, 0, 5.6], [0.6, 'type', 0.3], ...evCues(T4, T5)],
};
SC.m06_accretion = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), big = drawDebris(c, cam, T, { pulse: ss(T5, T5 + 1, T) });
    if (big) { const [bx, by] = toS(cam, big.x, big.y); lbl(c, T, { ax: bx, ay: by + big.r * cam.z + 3, tx: W / 2, ty: 26, align: 'center', text: 'GRAVITATIONAL ACCRETION', t0: T5 + 0.6, t1: T6 - 0.6, col: 'y1', lineCol: 'o1' }); }
  },
  cues: () => [[0, 'orbit_hum', 0.5, 0, 5.6], [0.6, 'type', 0.3], ...Array.from({ length: 12 }, (_, i) => [i * BEAT, 'grav_pulse', 0.45 + 0.04 * i, 0, i]), ...evCues(T5, T6)],
};
SC.m07_moon = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), big = drawDebris(c, cam, T, { skipBig: true, pulse: 1 - ss(T6, T6 + 1.5, T) });
    if (!big) return;
    const [bx, by] = toS(cam, big.x, big.y), R = big.r * cam.z;
    SPH.draw(c, { cx: bx, cy: by, R, spin: T * 0.3, tilt: 0.3, roll: -(cam.r || 0), light: VIEW.sun(cam), tex: SPH.tex.moon(T, { heat: 1, crust: 0, craters: 0, mare: 0 }), halo: { ramp: MAG, lv: 3.6, w: Math.max(2, R * 0.22), a: 0.5 }, rim: 0 });
    lbl(c, T, { ax: bx + R * 0.7, ay: by - R * 0.7, tx: Math.min(186, bx + R + 10), ty: Math.max(20, by - R - 26), text: 'THE MOON', t0: T6 + 0.6, t1: T7 - 0.35, col: 'y1', lineCol: 'o1' });
  },
  cues: () => [[0, 'moon_hit', 1.0], [0.6, 'type', 0.3], [0, 'moon_glow', 0.6, 0, 3.75], ...evCues(T6, T7)],
};
function evCues(a, b) {
  const k = clocks(), out = [];
  for (const e of k.ev) if (e.T >= a && e.T < b) out.push(e.type === 1 ? [e.T - a, 'fall_sizzle', 0.25, clamp(e.x / 4, -0.8, 0.8)] : [e.T - a, 'merge_click', Math.min(0.9, 0.35 + Math.cbrt(e.m / 0.0002) * 0.12), clamp(e.x / 4, -0.8, 0.8), Math.min(11, Math.floor(Math.cbrt(e.m / 0.00004)))]);
  return out;
}

// ---------- S8 · the magma ocean freezes: cutaway, crystals, crust, then craters and dark lava plains ----------
const XT = []; for (let i = 0; i < 90; i++) XT.push({ a: h(i, 1), r0: h(i, 2), t0: T7 + 0.4 + h(i, 3) * 3.0, light: i % 3 === 0 });
function moonState(T) {
  return { heat: 1 - ss(T7 + 0.1, T7 + 3.6, T), crust: ss(T7 + 0.5, T7 + 3.3, T), craters: Math.floor(ss(T7 + 3.0, T8 + 0.2, T) * 16) / 16, mare: ss(T7 + 3.9, T8 + 0.9, T) };
}
function cutaway(c, x, y, R, T) {
  const open = ss(T7 + 0.25, T7 + 0.7, T) * (1 - ss(T7 + 4.2, T7 + 4.7, T)); if (open <= 0) return;
  const a0 = -0.15, a1 = a0 + 1.45 * open, mo = 0.3 * (1 - ss(T7 + 0.6, T7 + 3.6, T)), cr = 0.09 * ss(T7 + 0.6, T7 + 3.5, T);
  const img = c.getImageData(0, 0, W, H), d = img.data, M = SPH.R.magma, RK = SPH.R.rock, MN = SPH.R.moon;
  const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(W - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(H - 1, Math.ceil(y + R));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = px + 0.5 - x, dy = py + 0.5 - y, rr = Math.hypot(dx, dy) / R; if (rr > 1) continue;
    let an = Math.atan2(dy, dx); if (an < a0 - 0.01 || an > a1) continue;
    const th = PIX.BAYER[(py & 3) << 2 | (px & 3)] + 0.5, i = (py * W + px) * 4, edge = (an - a0) * R * rr < 1.2 || (a1 - an) * R * rr < 1.2 || rr > 0.985;
    let cc;
    if (edge) cc = MN[10];
    else if (rr < 0.2) cc = M[Math.floor(2.5 + th)];                                // small iron core, still hot
    else if (rr < 1 - mo - cr) cc = (SPH.fbm(px * 0.15, py * 0.15, 3, 2) > 0.55 ? RK[3] : RK[2]);      // crystal pile (cumulates)
    else if (rr < 1 - cr) { const sw = SPH.fbm(px * 0.12 + T, py * 0.12, T * 0.5, 2); cc = M[Math.max(3, Math.min(7, Math.floor(4.2 + sw * 2.5 + th - 0.5)))]; }   // magma ocean
    else cc = MN[Math.floor(9 + th)];                                                // floating anorthosite crust
    d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2];
  }
  c.putImageData(img, 0, 0);
  // crystals in the magma ocean: dark (olivine, pyroxene) sink, light (plagioclase) rise into the crust
  for (const k of XT) {
    const age = T - k.t0; if (age < 0 || age > 1.6 || mo < 0.01) continue;
    const an = a0 + 0.12 + k.a * (a1 - a0 - 0.24); if (an > a1) continue;
    const top = 1 - cr, bot = 1 - cr - mo, start = bot + k.r0 * mo, rr = k.light ? lerp(start, top - 0.01, ss(0, 1.4, age)) : lerp(start, bot - 0.03, ss(0, 1.4, age));
    const px = x + Math.cos(an) * rr * R, py = y + Math.sin(an) * rr * R;
    c.fillStyle = P[k.light ? 'q5' : 'v0']; c.fillRect(Math.round(px), Math.round(py), k.light ? 2 : 1, k.light ? 1 : 2);
  }
}
SC.m08_cooling = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), m = moonOrbit(T);
    VIEW.sky(c, cam, T, { dust: 0.4 });
    const [x, y] = toS(cam, m.x, m.y), R = m.r * cam.z, st = moonState(T);
    const L0 = VIEW.sun(cam), dl = 2 * TAU * MO.cubicInOut(clamp((T - T7 - 0.2) / (T8 - T7 - 0.4))), cl = Math.cos(dl), sl = Math.sin(dl);
    const light = [L0[0] * cl - L0[1] * sl, L0[0] * sl + L0[1] * cl, L0[2]];
    SPH.draw(c, { cx: x, cy: y, R, spin: 0.8, tilt: 0.25, roll: -(cam.r || 0), light, tex: SPH.tex.moon(T, st), halo: st.heat > 0.05 ? { ramp: MAG, lv: 3.4, w: Math.max(2, R * 0.12 * st.heat), a: 0.45 * st.heat } : null, rim: st.heat > 0.5 ? 0 : 0.6 });
    cutaway(c, x, y, R, T);
    // fresh impacts on the new crust: flashes as craters appear (on the beat)
    for (let b = 0; b < 12; b++) {
      const tb = T7 + 3.0 + b * BEAT / 2, a = T - tb; if (a < 0 || a > 0.3) continue;
      const an = h(b, 7) * TAU, rr = 0.25 + 0.65 * h(b, 8), fx = x + Math.cos(an) * rr * R * 0.95, fy = y + Math.sin(an) * rr * R * 0.95;
      PIX.glow(c, fx, fy, 6 + 10 * (1 - a / 0.3), 'y1', 0.7 * (1 - a / 0.3)); ring(c, fx, fy, 1 + a * 20, 'q5', 1 - a / 0.3);
    }
  },
  cues: [[0, 'cool_hiss', 0.55, 0, 3.6], ...Array.from({ length: 14 }, (_, i) => [0.4 + i * Q16 * 2, 'crystal', 0.35 + 0.02 * i, (h(i, 9) - 0.5) * 1.2, i]),
    [1.2, 'crackle', 0.5, 0, 2.0], ...Array.from({ length: 12 }, (_, i) => [3.0 + i * BEAT / 2, 'crater_thud', 0.4, (h(i, 7) - 0.5), i]), [3.9, 'lava_flow', 0.4, 0, 1.7]],
};

// ---------- S9 · billions of years: Earth cools, gets oceans; the Moon drifts outward ----------
const AFRICA = 20 * Math.PI / 180;
function earthSpin9(T) {                                           // the day lengthens: fast spin slowing down, ending on Africa
  const D = TE - T8, F = t => { const u = clamp((t - T8) / D); return (t - T8) * 0.22 + 5.5 * D * (1 - Math.pow(1 - u, 3)) / 3; };
  return AFRICA + F(T) - F(TE);
}
SC.m09_earth_moon = {
  draw(c, lt, S) {
    const T = S.t, cam = camAt(T), m = moonOrbit(T);
    VIEW.sky(c, cam, T, { dust: 0.35 * (1 - ss(T8, TE, T)) });
    const s = 0.24 + 0.76 * ss(T8 + 0.6, TL1, T);
    const halo = s < 0.6 ? { ramp: SPH.R.steam, lv: 3, w: 5, a: 0.5 * (1 - ss(0.5, 0.6, s)) } : { ramp: SPH.R.ocean, lv: 5, w: Math.max(2, SIMD.RE * cam.z * 0.08), a: 0.65 * ss(0.6, 0.72, s) };
    earthBody(c, cam, T, SPH.tex.earth(T, s, T), { spin: earthSpin9(T), halo, rim: 0.6 });
    const [x, y] = toS(cam, m.x, m.y), R = m.r * cam.z;
    SPH.draw(c, { cx: x, cy: y, R, spin: 0.8, tilt: 0.25, roll: -(cam.r || 0), light: VIEW.sun(cam), tex: SPH.tex.moon(T, { heat: 0, crust: 1, craters: 1, mare: 1 }), rim: 0.6 });
  },
  cues: [[0, 'pull_out', 0.6, 0, 1.4], [0.9, 'timelapse', 0.7, 0, 3.6], [2.4, 'ocean_shimmer', 0.55, -0.2, 1.6], [3.75, 'final_hit', 1.0], [3.75, 'final_tail', 0.8, 0, 1.85]],
};
window.MOONFILM = { camAt, clocks, theiaPos, moonOrbit };
})();
