// S05 FAST ELECTRONS PRODUCE X-RAYS (24–32 s): 120 kV switches on; blue field arrows point from + to −, and the negative
// electrons race the other way across the vacuum, faster and faster (≤ 120 keV, ≈ 0.59 c on arrival). The camera follows
// one into the tungsten anode: gray atoms (electron clouds round red-and-gray nuclei). It swings past a nucleus — the
// electric pull bends its path, it slows, and the energy it loses leaves as one golden X-ray photon (bremsstrahlung,
// "braking radiation"; no collision, no fission, the nucleus is unchanged). Closer passes give more energetic photons, so
// the energies spread over a continuum up to 120 keV (with tungsten's K lines at 59 and 67 keV). Pulling back: the focal
// spot glows on the spinning disc — over 99% of the energy becomes heat, carried round the track.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU, AX = TUBE.AX;
const E0 = 120;
// ---------- phase A: acceleration in the tube (local t 0–2.1) ----------
const GAP = 13.4, TF = 1.15, ACC = 2 * GAP / (TF * TF), X0 = -14;
const ELS = [];
for (let k = 0; k < 7; k++) ELS.push({ tr: 0.45 + k * 0.0625, y0: [0.4, -1.8, 2.2, -0.9, 1.4, -2.4, 0.9][k], lead: k === 0, x0: X0 });
for (let k = 0; k < 40; k++) ELS.push({ tr: 0.55 + k * 0.035 + h(k, 3) * 0.02, y0: (h(k, 4) - 0.5) * 6.5, lead: false, x0: X0 + h(k, 5) * 1.0 });
const hover = (e, k, t) => [e.x0 + 0.6 + (K.vn3(k, 0.3, t * 1.5, 51) - 0.5) * 2.2, e.y0 * 0.7 + (K.vn3(k, 2.3, t * 1.5, 53) - 0.5) * 2.4];
const elState = (e, k, t) => {
  if (t < e.tr) return { x: hover(e, k, t)[0], y: hover(e, k, t)[1], s: 0 };
  const [hx, hy] = hover(e, k, e.tr), dt = t - e.tr, s = 0.5 * ACC * dt * dt, yf = e.y0 * 0.16, sMax = GAP - (hx - (X0 + 0.6));
  if (s >= sMax) return { hit: true, tHit: e.tr + Math.sqrt(2 * sMax / ACC), x: TUBE.faceX(yf), y: yf };
  return { x: hx + s, y: lerp(hy, yf, Math.min(1, s / sMax)), s };
};
const lead = t => { const st = elState(ELS[0], 0, t); return st.hit ? null : st; };
const camA = t => {
  const S4 = { x: -16.5, y: 0, z: 8.5 };
  if (t < 0.45) return S4;
  if (t < 1.55) { const p = MO.sineInOut((t - 0.45) / 1.1); return { x: lerp(-16.5, -3.0, p), y: 0, z: K.zl(8.5, 12, p) }; }
  const q = clamp((t - 1.55) / 0.55), e = MO.expoIn(q);
  return { x: lerp(-3.0, -0.25, MO.sineInOut(q)), y: lerp(0, 0.05, q), z: K.zl(12, 420, e) };
};
function drawTubeA(c, t, S) {
  const cam = camA(t);
  K.cam(c, cam);
  TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: clamp((t - 1.6) / 0.4) * 0.8 });
  c.setTransform(1, 0, 0, 1, 0, 0);
  const on = clamp((t - 0.25) / 0.2);
  if (on > 0) {                                                          // the field points from + to −; electrons go the other way
    const [xa] = K.S(cam, -14.6, 0), [xb] = K.S(cam, -0.8, 0), ys = [-6.2, -3.7, -1.25, 1.25, 3.7, 6.2].map(y => K.S(cam, 0, y)[1]);
    FX.field(c, xa, xb, ys, -1, S.t, 'b2', on);
    const [mx, my] = K.S(cam, -24, -14), [px_, py] = K.S(cam, 3.2, -6);
    if (mx > 10 && mx < W - 10) PIX.text(c, '−', mx, my, 'c3', { sc: 2, align: 'center' });
    if (px_ > 10 && px_ < W - 10) PIX.text(c, '+', px_, py, 'o1', { sc: 2, align: 'center' });
  }
  ELS.forEach((e, k) => {
    const st = elState(e, k, t);
    if (st.hit) { const age = t - st.tHit; if (e.lead && age < 0.3) { const [sx, sy] = K.S(cam, st.x, st.y); FX.flash(c, sx, sy, 6 * (1 - age / 0.3), 'w', 1 - age / 0.3); } return; }
    const [sx, sy] = K.S(cam, st.x, st.y);
    if (st.s > 0) { const tr = []; for (let j = 0; j < 9; j++) { const q = elState(e, k, Math.max(e.tr, t - j * 0.02)); if (!q.hit) tr.push(K.S(cam, q.x, q.y)); } FX.trail(c, tr, 1); }
    FX.e(c, sx, sy, e.lead ? 3 : 2, 1, e.lead);
  });
}
// ---------- phase B: in the tungsten (local t 2.0–6.4) ----------
const T0 = 24;                                          // film time of the scene start
const V = 25, CPH = 52, EMIT = 3.35;                    // electron speed (px/s, slowed), photon speed, local time of the featured emission
let FEAT = null, PASSES = [];
// bullet time round the featured emission (film clock → pass clock)
const BT = (() => { const n = 400, a = T0 + EMIT - 0.3, b = T0 + EMIT + 1.4, tab = new Float64Array(n + 1); let acc = a;
  const rate = T => 1 - 0.75 * MO.smooth(clamp((T - (T0 + EMIT - 0.01)) / 0.12)) * (1 - MO.smooth(clamp((T - (T0 + EMIT + 0.6)) / 0.6)));
  tab[0] = a; for (let i = 1; i <= n; i++) { const T = a + (b - a) * (i - 0.5) / n; acc += rate(T) * (b - a) / n; tab[i] = acc; }
  return T => T <= a ? T : T >= b ? tab[n] + (T - b) : (() => { const f = (T - a) / (b - a) * n, i = Math.floor(f); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); })(); })();
const camB = t => {
  const A = TW.A;
  if (t < 2.5) { const z = K.zl(0.3, 1.0, MO.cubicOut(clamp((t - 2.0) / 0.5))); return { x: A.x - 160 / z * 0.4, y: A.y, z }; }
  if (t < 3.0) { const q = MO.cubicInOut(clamp((t - 2.5) / 0.5)); return { x: lerp(A.x - 64, A.x, q), y: A.y, z: K.zl(1.0, 5.2, q) }; }
  if (t < 4.85) return { x: A.x + 3 * MO.smooth(clamp((t - 3.0) / 1.85)), y: A.y + 2 * MO.smooth(clamp((t - 3.0) / 1.85)), z: K.zl(5.2, 5.8, clamp((t - 3.0) / 1.85)) };
  const p = MO.cubicInOut(clamp((t - 4.85) / 0.8)); return { x: lerp(A.x + 3, A.x + 26, p), y: lerp(A.y + 2, A.y - 4, p), z: K.zl(5.8, 1.7, p) };
};
const photon = (ps, T) => {
  const tr = ps.tr, te = ps.t0 + tr.tEmit;
  if (tr.tEmit == null || T < te) return null;
  const vx = tr.emitVx, vy = tr.emitVy, va = Math.atan2(vy, vx);
  const cr = (tr.emitX - ps.ax) * vy - (tr.emitY - ps.ay) * vx;
  const ang = va + (cr > 0 ? -0.42 : 0.42), d = (T - te) * CPH;
  return { x: tr.emitX + Math.cos(ang) * d, y: tr.emitY + Math.sin(ang) * d, ang, age: T - te, ex: tr.emitX, ey: tr.emitY };
};
const lamFor = (E, z) => FX.lamFor(E * 80 / E0) * clamp(z / 3.2, 0.65, 1.35);
function drawPass(c, cam, ps, T, big) {
  const tr = ps.tr, ft = T - ps.t0;
  if (ft < -0.05) return;
  const te = tr.tEmit ?? 1e9, ea = clamp((ft + 0.05) / 0.2);
  const pts = []; for (let j = 0; j < 16; j++) { const tt = ft - j * 0.07; if (tt < 0) break; const p = PHYS.at(tr, tt); pts.push(K.S(cam, p[0], p[1])); }
  FX.trail(c, pts, ea);
  const p = PHYS.at(tr, ft), [sx, sy] = K.S(cam, p[0], p[1]);
  FX.e(c, sx, sy, big ? 3 : 2, ea, true);
  const ph = photon(ps, T);
  if (ph) {
    if (ph.age < 0.25) { const [fx, fy] = K.S(cam, ph.ex, ph.ey); FX.flash(c, fx, fy, (big ? 9 : 5) * (1 - ph.age / 0.25), 'y4', 1 - ph.age / 0.25); if (big) FX.ring(c, fx, fy, 6 + ph.age * 160, 'y2', 1 - ph.age / 0.25); }
    const [qx, qy] = K.S(cam, ph.x, ph.y), lam = lamFor(ps.E, cam.z);
    FX.ph(c, qx, qy, ph.ang, lam, lam * (big ? 3.2 : 2.6), big ? 5 : 3, clamp(ph.age / 0.08));
  }
}
// the spectrum readout: energies 0–120 keV, Kramers continuum ∝ (120 − E) after the tube's own filtration, K lines
function spectrum(c, x, y, t, a, events, fill) {
  if (a <= 0) return;
  const w = 128, hgt = 60, NB = 40, BW = E0 / NB, bx = x + 6, by = y + 48, pw = 116, ph = 26, bw = pw / NB;
  const T_F = E => Math.exp(-Math.pow(18 / Math.max(1, E), 3));
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x - 1, y - 1, w + 2, hgt + 2, 'g3'); PIX.rect(c, x, y, w, hgt, 'k');
  PIX.text(c, 'X-RAY ENERGIES', x + 4, y + 3, 'g8', { shadow: null });
  for (let b = 0; b < NB; b++) {
    const E = (b + 0.5) * BW, I = (E0 - E) / E0 * T_F(E), hh = Math.round(ph * fill * I * 1.6);
    if (hh > 0) { PIX.rect(c, Math.round(bx + b * bw), by - hh, Math.ceil(bw), hh, 'y1'); PIX.rect(c, Math.round(bx + b * bw), by - hh, Math.ceil(bw), 1, 'y2'); }
  }
  if (fill > 0.5) for (const [E, k] of [[59, 1], [67, 0.55]]) { const b = Math.floor(E / BW), base = Math.round(ph * fill * (E0 - (b + 0.5) * BW) / E0 * T_F(E) * 1.6), hh = Math.round(9 * k * (fill - 0.5) * 2); PIX.rect(c, Math.round(bx + b * bw), by - base - hh, Math.ceil(bw), hh, 'y3'); }
  const stack = new Array(NB).fill(0);
  for (const [E, ta] of events) {
    if (t < ta) continue;
    const b = Math.min(NB - 1, Math.floor(E / BW)), age = t - ta, drop = age < 0.18 ? (1 - age / 0.18) * 12 : 0;
    const base = Math.round(ph * fill * (E0 - (b + 0.5) * BW) / E0 * T_F(E) * 1.6);
    PIX.rect(c, Math.round(bx + b * bw) - 1, Math.round(by - base - (stack[b] + 1) * 3 - drop), Math.ceil(bw) + 1, 3, age < 0.35 ? 'y4' : 'y3'); stack[b]++;
  }
  PIX.rect(c, bx, by, pw, 1, 'g5');
  PIX.text(c, '0', bx, by + 3, 'g6', { shadow: null }); PIX.text(c, '120 keV', bx + pw, by + 3, 'g6', { shadow: null, align: 'right' });
  c.restore();
}
function drawLatticeB(c, t, S) {
  const cam = camB(t), T = S.t, TFt = BT(T);
  TW.draw(c, cam, T, { vib: 0.5 + 1.6 * MO.smooth(clamp((t - 5.2) / 0.8)), gain: cam.z < 3 ? 0.62 : 0.82, heat: 0.6 * MO.smooth(clamp((t - 5.4) / 0.8)) });
  c.setTransform(1, 0, 0, 1, 0, 0);
  const ft = TFt - FEAT.t0, p = PHYS.at(FEAT.tr, ft), dA = Math.hypot(p[0] - TW.A.x, p[1] - TW.A.y);
  if (t > 2.9 && t < 4.6 && dA < 30 && ft > 0) {                         // the pull of the nucleus while it bends
    const [sx, sy] = K.S(cam, p[0], p[1]), [nx, ny] = K.S(cam, TW.A.x, TW.A.y), L = Math.min(30, 240 / Math.max(6, dA)), dl = Math.hypot(nx - sx, ny - sy);
    K.arrow(c, sx, sy, sx + (nx - sx) / dl * L, sy + (ny - sy) / dl * L, 'b3', 4);
  }
  drawPass(c, cam, FEAT, TFt, true);
  for (const ps of PASSES) drawPass(c, cam, ps, T, false);
}
// ---------- phase C: the disc and the heat (local t 6.4–8) ----------
const phiAt = t => 1.0 * (1 - MO.sineInOut(clamp((t - 7.2) / 0.8)));
const camD = t => { const p = MO.expoOut(clamp((t - 6.35) / 1.0)); return { x: lerp(0, -10, p), y: lerp(2, -22, p), z: K.zl(30, 2.1, p) }; };
function drawDisc(c, t, phi, S) {
  const sp = Math.sin(phi), xc = 0, w = S.t * 2.2;
  const E = (r, th) => [xc + r * Math.cos(th) * sp, AX + r * Math.sin(th)];
  const ell = (r, col) => { c.beginPath(); c.ellipse(xc, AX, Math.max(0.01, r * sp), r, 0, 0, TAU); c.fillStyle = P[col]; c.fill(); };
  ell(51, 'g4'); ell(50, 'g6');
  const N = 96;
  for (let k = 0; k < N; k++) {
    const th0 = k / N * TAU, th1 = (k + 1) / N * TAU, mid = (th0 + th1) / 2, d = K.wrap(mid - Math.PI / 2, TAU), T = Math.exp(-d / 1.25) + 0.12;
    const col = T > 0.9 ? 'y4' : T > 0.68 ? 'y3' : T > 0.5 ? 'o1' : T > 0.36 ? 'o0' : T > 0.25 ? 'r2' : T > 0.18 ? 'r1' : 'g8';
    const pq = [E(35, th0), E(45, th0), E(45, th1), E(35, th1)];
    c.beginPath(); pq.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = P[col]; c.fill();
  }
  for (let k = 0; k < 10; k++) { const th = k / 10 * TAU + w; const [x0, y0] = E(14, th), [x1, y1] = E(31, th); PIX.line(c, x0, y0, x1, y1, 'g5', 0.8 / Math.max(0.3, sp)); }
  ell(9, 'g4'); ell(5, 'g3');
  FX.glowW(c, xc, 0, 7, ['r2', 'o0', 'o1', 'y3', 'y4'], 1.0, 1.5);
}
function drawDiscView(c, t, S) {
  const cam = camD(t), phi = phiAt(t), cp = Math.cos(phi);
  K.cam(c, cam); c.scale(cp, 1);
  TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: phi < 0.08 ? 0.9 : 0, noDisc: phi >= 0.08, coll: true });
  K.cam(c, cam);
  if (phi >= 0.08) drawDisc(c, t, phi, S);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [x0, y0] = K.S(cam, -15 * cp, 0), [x1, y1] = K.S(cam, 0, 0);
  for (let k = 0; k < 14; k++) { const q = K.wrap(S.t * 2.6 + k / 14, 1); FX.e(c, lerp(x0, x1, q * q), lerp(y0, y1, q * q) + Math.sin(k * 7) * 1.5, 1, 1); }
  for (let k = 0; k < 10; k++) {
    const t0 = 6.6 + k * 0.14, age = t - t0; if (age < 0 || age > 1.4) continue;
    const ang = Math.PI / 2 + (h(k, 11) - 0.5) * 1.3, d = age * 46, [sx, sy] = K.S(cam, Math.cos(ang) * d, Math.sin(ang) * d);
    FX.ph(c, sx, sy, ang, 4.5, 11, 3, clamp(age / 0.08) * clamp((1.4 - age) / 0.2));
  }
}
SC['s05_anode'] = {
  init() {
    // the featured electron: its closest approach to atom A (and the photon) lands on the beat at EMIT
    const A = TW.A, ap = TW.approach(A, 6.5, -1, 0.36, 16);
    const tr = TW.pass({ x: ap.x, y: ap.y, vx: ap.ux * V, vy: ap.uy * V, T: 9, k: 1300, frac: 40 / E0, near: A, only: [A] });
    FEAT = { tr, t0: T0 + EMIT - tr.tEmit, E: 40, ax: A.x, ay: A.y };
    // other passes (local emission time, atom, impact parameter, photon keV): closer → more energetic
    const TAB = [[5.0, 2, -2, 11, 18], [5.125, 4, 1, 5, 78], [5.25, 1, 1, 8, 38], [5.375, 3, 2, 2.6, 120], [5.5, 4, -1, 9, 30], [5.625, 2, 0, 6, 60],
      [5.75, 3, -3, 12, 12], [5.875, 5, 0, 4.5, 92], [6.0, 1, -1, 7, 48], [6.125, 4, 2, 10, 24], [6.25, 2, 3, 5.5, 66], [6.375, 5, -2, 8.5, 34]];
    PASSES = TAB.map(([tl, i, j, b, E], k) => {
      const a = TW.atom(i, j), side = h(k, 4) < 0.5 ? 1 : -1, ap2 = TW.approach(a, b, side, (h(k, 3) - 0.5) * 0.9, 14);
      const tr2 = TW.pass({ x: ap2.x, y: ap2.y, vx: ap2.ux * V, vy: ap2.uy * V, T: 6, k: 1300, frac: E / E0, near: a, only: [a] });
      return { tr: tr2, t0: T0 + tl - (tr2.tEmit ?? 0), E, ax: a.x, ay: a.y };
    });
  },
  draw(c, t, S) {
    const toB = clamp((t - 2.0) / 0.22), toD = clamp((t - 6.35) / 0.25);
    if (toB <= 0) drawTubeA(c, t, S);
    else if (toB < 1) dissolve(c, cc => drawTubeA(cc, t, S), cc => drawLatticeB(cc, t, S), toB);
    else if (toD <= 0) drawLatticeB(c, t, S);
    else if (toD < 1) dissolve(c, cc => drawLatticeB(cc, t, S), cc => drawDiscView(cc, t, S), toD);
    else drawDiscView(c, t, S);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // phase A readouts
    const ld = lead(t), E = ld ? E0 * clamp(ld.s / GAP) : t > 1.2 ? E0 : 0, ma = clamp((t - 0.45) / 0.2) * (1 - clamp((t - 1.85) / 0.2));
    FX.meter(c, 14, 318, 118, E / E0, 'ENERGY', `${Math.round(E)} keV`, 'c3', ma);
    FX.meter(c, 14, 342, 118, PHYS.beta(E), 'SPEED', `${PHYS.beta(E).toFixed(2)} c`, 'c4', ma);
    CAP.note(c, t, { x: 248, y: 112, text: '120 kV', t0: 0.3, t1: 1.85, col: 'b3', align: 'right', box: true });
    // phase B: the chain, the energy split, the honesty note
    if (t > 2.4 && t < 5.0) {
      CAP.steps(c, t, { x: 14, y: 100, t1: 4.85, items: [[2.55, 'FAST ELECTRON', 'c3'], [3.0, 'DECELERATION', 'b3'], [EMIT, 'X-RAY PHOTON', 'y3']] });
      const ma2 = clamp((t - 2.6) / 0.2) * (1 - clamp((t - 4.75) / 0.2)), em = clamp((BT(S.t) - FEAT.t0 - FEAT.tr.tEmit) / 0.18);
      FX.meter(c, 14, 318, 104, (E0 - 40 * em) / E0, 'ELECTRON', `${Math.round(E0 - 40 * em)} keV`, 'c3', ma2);
      FX.meter(c, 14, 342, 104, 40 * em / E0, 'PHOTON', `${Math.round(40 * em)} keV`, 'y3', ma2);
      CAP.note(c, t, { x: 256, y: 372, text: 'NOT TO SCALE · SLOWED', t0: 2.7, t1: 4.8, col: 'g7', align: 'right', box: true });
    }
    if (t > 4.9 && t < 6.5) {
      const ev = []; for (const ps of PASSES) if (ps.tr.tEmit != null) ev.push([ps.E, ps.t0 + ps.tr.tEmit]); ev.push([40, FEAT.t0 + FEAT.tr.tEmit]);
      spectrum(c, 14, 300, S.t, clamp((t - 4.9) / 0.2) * (1 - clamp((t - 6.3) / 0.15)), ev, MO.smooth(clamp((t - 5.6) / 0.6)));
    }
    // phase C: where the energy goes
    const ba = clamp((t - 6.7) / 0.2) * (1 - clamp((t - 7.85) / 0.12));
    if (ba > 0) {
      const x = 14, y = 300, w = 242, f = MO.cubicOut(clamp((t - 6.7) / 0.45));
      c.save(); c.globalAlpha = ba;
      PIX.rect(c, x - 2, y - 2, w + 4, 24, 'k');
      PIX.rect(c, x, y + 10, Math.round((w - 3) * f), 6, 'o0'); PIX.rect(c, x, y + 10, Math.round((w - 3) * f), 1, 'o1');
      PIX.rect(c, x + w - 3, y + 10, 3, 6, 'y3');
      PIX.text(c, 'HEAT >99%', x, y, 'o2', { shadow: null, n: Math.floor((t - 6.7) * 50) });
      PIX.text(c, 'X-RAYS ~1%', x + w, y, 'y3', { shadow: null, align: 'right', n: Math.floor((t - 6.85) * 50) });
      c.restore();
    }
    CAP.cap(c, t, { l1: 'X-RAY GENERATION', l2: ['FAST ELECTRONS', 'PRODUCE X-RAYS'], t0: 0.12, tSwap: EMIT, t1: 7.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0.25, 'hv_on', 1, 0], [0.45, 'accel_rise', 1, 0, 1.2], [1.55, 'zoom_rush', 0.9, 0, 0.5], [2.0, 'lattice_in', 0.6, 0, 1.0], [2.55, 'whoosh_e', 0.8, -0.5, 0.8],
      [3.0, 'bend', 0.7, 0], [EMIT, 'photon_big', 1, 0.3, 40], [4.85, 'pull_back', 0.7, 0, 0.8], [5.6, 'fill_rise', 0.6, -0.4, 0.6], [6.35, 'heat_swell', 0.9, 0, 1.6], [6.7, 'bar_fill', 0.5, 0]];
    for (let k = 0; k < 7; k++) q.push([0.45 + k * 0.0625, 'chirp', 0.5, -0.3 + k * 0.1, k]);
    q.push([0.45 + TF, 'hit_tick', 0.8, 0.3]);
    for (const ps of PASSES) if (ps.tr.tEmit != null) q.push([ps.t0 + ps.tr.tEmit - T0, 'photon', 0.45, (ps.ax - TW.A.x) / 150, ps.E]);
    return q;
  },
};
})();
