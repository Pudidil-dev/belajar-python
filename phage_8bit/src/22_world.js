'use strict';
// ============================================================================
// THE WORLD AT TIME t: fluid, neighbour cells, the target cell with all its
// time-dependent contents, the hero phage, the burst and the release.
// ============================================================================
function engineInit() {
  virusInit();
  HOST0 = hostBuild(C0, 18, 12, 36, siteExcl);
  HOSTO = CELLS_O.map(c => hostBuild(c, 10, 6, 18));
  unitsInit();
  M1 = new Path(spline(M1_CP, 7, false));
}
// ---------------------------------------------------------------- transcription + translation (C0-local)
const POL1_S = 24;                                   // leading polymerase, already transcribing (offset from the site)
const M1_CP = [60, -173, 67, -165, 71, -152, 67, -139, 60, -128, 49, -121, 38, -118];   // its mRNA with the polysome
let M1 = null;
const RIBO_M1 = [{ s: 14, kind: 0 }, { s: 31, kind: 1 }, { s: 48, kind: 2 }];
function pol2S(t) { return VDNA.sT - 6 + 14 * smooth(seg(t, T_TX0, T_TX1 + 6)); }
function drawTranscription(cam, t) {
  const z = cam.z; if (z < 0.7) return;
  // leading polymerase with its long mRNA and three ribosomes
  const s1 = VDNA.sT + POL1_S + 0.8 * Math.sin(t * 0.5), q1 = VDNA.at(s1), w1 = C0w(q1[0], q1[1] - 0.5);
  mrnaStrand(cam, { at: s => { const p = M1.at(s); return C0w(p[0] + 0.7 * Math.sin(t * 1.3 + s * 0.2), p[1] + 0.5 * Math.cos(t * 1.1 + s * 0.17)); }, tan: s => M1.tan(s) }, 0, M1.L, P.MR2, P.MR1);
  polymerase(cam, w1[0], w1[1], 0.1, t);
  // the polymerase landing on the viral DNA, then copying it
  if (t > T_POL - 0.5) {
    const land = clamp((t - (T_POL - 0.5)) / 0.5, 0, 1), sP = pol2S(t), q = VDNA.at(sP);
    const w = C0w(q[0] - 2 * (1 - eout(land)) * 6, q[1] - 0.5 - 14 * (1 - eout(land)));
    if (t >= T_TX0 - 0.1) {   // its growing mRNA (5' end leaves first, curls up and away)
      const len = 2.2 * (sP - (VDNA.sT - 6)) + 2;
      const base = C0w(q[0] + 1.5, q[1] - 4);
      mrnaStrand(cam, { at: u => [base[0] - u * 0.25 + 1.6 * Math.sin(u * 0.3 + 1), base[1] - u * 0.85 + 0.8 * Math.cos(u * 0.25)], tan: u => [-0.28, -0.96] }, 0, len, P.MR2, P.MR1);
    }
    polymerase(cam, w[0], w[1], 0, t);
  }
}
function riboM1(k, t) { const R = RIBO_M1[k], s = R.s + 2.2 * Math.sin(t * 0.4 + k); const p = M1.at(s), tg = M1.tan(s); return [C0w(p[0], p[1]), Math.atan2(tg[1], tg[0])]; }
const PART_DRIFT = [[-15, -8], [-12, 6], [-8, 16]];
function drawTranslation(cam, t) {
  if (cam.z < 0.7) return;
  for (let k = 0; k < 3; k++) {
    const [w, ang] = riboM1(k, t), nx = -Math.sin(ang), ny = Math.cos(ang);       // the exit tunnel side (toward the frame centre)
    const tp = T_PART[k], t0 = tp - 1.5 - 0.25 * k;
    if (t > t0 && t < tp) {      // nascent chain grows out of the ribosome
      const n = Math.floor(2 + 10 * seg(t, t0, tp)), col = [P.PH3, P.SV2, P.OR2][k];
      for (let i = 0; i < n; i++) { const u = 5 + i * 1.5, bx = w[0] + nx * u + Math.sin(i * 1.3 + t * 3) * 1.2, by = w[1] + ny * u + Math.cos(i * 1.1 + t * 3) * 1.2; disc(cam.x(bx), cam.y(by), Math.max(1, 0.75 * cam.z), col); }
    }
    if (t >= tp && t < tp + 7) {  // folded part pops out and drifts off into the factory
      const age = t - tp, k2 = eout(clamp(age / 3, 0, 1)), d = PART_DRIFT[k];
      const px = w[0] + nx * 9 + d[0] * k2, py = w[1] + ny * 9 + d[1] * k2, sc = age < 0.3 ? backOut(age / 0.3, 1.6) : 1;
      PART_FN[k](cam, px, py, age * 0.6 + k, sc * (k === 2 ? 1.4 : 1.25));
      if (age < 0.2) ring(cam.x(px), cam.y(py), (3 + 25 * age) * cam.z * 0.5, 1, P.PH5, 1 - age * 5);
    }
  }
  for (let k = 0; k < 3; k++) { const [w, ang] = riboM1(k, t); ribosome(cam, w[0], w[1], ang, undefined); }
}
// ---------------------------------------------------------------- the takeover: viral enzymes cut the host chromosome
function drawEnzymes(cam, t) {
  if (t < T_TAKE - 0.1 || t > 29) return;
  for (const L of HOST0.loops) {
    const t0 = L.cut - 1.1 - 0.4 * hash(L.k + 40); if (t < t0 || t > L.cut + 0.4) continue;
    const k = smooth(seg(t, t0, L.cut)), src = VDNA.at(VDNA.L * (0.3 + 0.5 * hash(L.k + 41)));
    const lp = [L.pts[0], L.pts[1]], x = lerp(src[0], lp[0], k) + 6 * Math.sin(k * Math.PI) * (hash(L.k) - 0.5), y = lerp(src[1], lp[1], k) + 6 * Math.sin(k * Math.PI);
    const w = C0w(x, y), sx = cam.x(w[0]), sy = cam.y(w[1]), r = Math.max(2.2, 2.0 * cam.z);
    const pv = C0w(lerp(src[0], lp[0], Math.max(0, k - 0.08)), lerp(src[1], lp[1], Math.max(0, k - 0.08)));
    line(cam.x(pv[0]), cam.y(pv[1]), sx, sy, P.MR1);
    disc(sx, sy, r, P.MR1); disc(sx - r * 0.3, sy - r * 0.3, r * 0.6, P.MR2); pset(sx - r * 0.4, sy - r * 0.4, P.MR3);
  }
}
// ---------------------------------------------------------------- the hero assembly line (S15-S18)
function heroHeadState(t) {   // the prohead built on the membrane -> packaged -> docked on tail A
  const pv = HERO_HEAD.portal;
  let x = pv[0], y = pv[1], a = Math.PI / 2;           // portal on the membrane, head pointing into the cell
  const det = K75(seg(t, T_DETACH, T_MOTOR));
  x = lerp(x, PACK_V[0], det); y = lerp(y, PACK_V[1], det); a = lerp(a, 0.12, det);
  const dock = K75(seg(t, 53.3, T_DOCK));
  const topA = [TAIL_A[0], TAIL_A[1] - 40.5];
  x = lerp(x, topA[0], dock); y = lerp(y, topA[1], dock) - 10 * Math.sin(dock * Math.PI); a = lerp(a, 0, dock);
  return { x, y, a, fill: smooth(seg(t, T_PACK0, T_PACK1)) };
}
function drawHeroAssembly(cam, t) {
  if (t < 44 || t >= T_BURST) return;
  const z = cam.z;
  // tails A and B (S17)
  const tailState = (t0, wx, wy, a) => {
    const bpw = clamp(Math.floor((t - t0) / (BEAT / 4)) + 1, 0, 6), tube = seg(t, t0 + 0.55, t0 + 1.15), sh = seg(t, t0 + 1.25, t0 + 1.25 + 12 * BEAT / 8), cap = t > t0 + 2.15;
    return { x: wx, y: wy, a, s: 0, bp: 0, dna: 0, parts: { head: 0, collar: cap ? 1 : 0, sh, tube, bpw, fib: 0 } };
  };
  const done = t >= T_DOCK;
  for (const [t0, L, a] of [[T_WEDGE0, TAIL_A, 0], [T_WEDGE0 + 0.35, TAIL_B, TAIL_B_A]]) {
    if (t < t0 - 0.3) continue;
    const w = C0w(L[0], L[1]);
    if (t < t0) { for (let q = 0; q < 6; q++) { const k = seg(t, t0 - 0.3 + q * BEAT / 4 - 0.25, t0 + q * BEAT / 4); if (k <= 0 || k >= 1) continue; const an = q * 1.05 + 0.4; partHead(cam, w[0] + Math.cos(an) * 20 * (1 - k), w[1] + Math.sin(an) * 20 * (1 - k), an, 0.6); } }
    if (L === TAIL_A && done) continue;          // tail A now carries the hero head (drawn below as a whole phage)
    const st = tailState(t0, w[0], w[1], a);
    if (L === TAIL_B && t > 55.0) { st.parts.head = 1; st.parts.fib = clamp(Math.floor((t - 55.4) / (BEAT / 4)) + 1, 0, 6); st.dna = 1; }
    for (let q = 0; q < 6; q++) {               // wedges flying in
      const tq = t0 + q * BEAT / 4, k = seg(t, tq - 0.22, tq);
      if (k > 0 && k < 1) { const an = q * 1.05 + 0.4; partHead(cam, w[0] + Math.cos(an) * 18 * (1 - k), w[1] - 3 + Math.sin(an) * 18 * (1 - k), an, 0.55); }
    }
    if (t >= t0) drawPhage(cam, st, t);
    if (L === TAIL_B && t > 55.0 && t < 55.3) ring(cam.x(w[0]), cam.y(w[1] - 40), (8 + 40 * (t - 55)) * z, 1, P.PH5, 1 - (t - 55) / 0.3);
  }
  // the hero head: tiles -> shell -> packaging -> docking
  const H_ = heroHeadState(t), hw = C0w(H_.x, H_.y);
  if (t < T_DETACH) {
    prohead(cam, hw[0], hw[1], H_.a, t, 0, smooth(seg(t, T_TILE1, T_TILE1 + 0.25)), 1 - seg(t, T_TILE1 + 0.2, T_DETACH + 0.4), T_TILE0, T_TILE1 - T_TILE0);
  } else if (!done) {
    const scf = 1 - seg(t, T_DETACH, T_DETACH + 0.6);
    if (scf > 0) prohead(cam, hw[0], hw[1], H_.a, t, 1, 1, scf);
    headAt(cam, hw[0], hw[1], H_.a, t, H_.fill, { collar: t > T_PACK1 + 0.2 });
    if (t > T_MOTOR - 0.25 && t < T_PACK1 + 0.15) {
      const mk = seg(t, T_MOTOR - 0.25, T_MOTOR), mw = [hw[0] - Math.sin(H_.a) * -2 * 0, hw[1] + 3 + 10 * (1 - mk)];
      // the genome strand threading into the motor
      if (t > T_PACK0 - 0.1) {
        const cp = copyPos(9, t), cw = C0w(cp[0], cp[1]);
        const n = 14; let pv = null;
        for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(cw[0], mw[0], u) + 3 * Math.sin(u * 9 + t * 14), y = lerp(cw[1], mw[1], u); const sx = cam.x(x), sy = cam.y(y); if (pv) { lineW(pv[0], pv[1], sx, sy, Math.max(2, 0.8 * z), P.VD1); line(pv[0], pv[1], sx, sy, ((u * 6 - t * 9) % 1 + 1) % 1 < 0.4 ? P.VD3 : P.VD2); } pv = [sx, sy]; }
      }
      motor(cam, mw[0], mw[1], H_.a, t, t > T_PACK0 && t < T_PACK1);
    }
    if (t > T_PACK1 && t < T_PACK1 + 0.25) { const k = (t - T_PACK1) / 0.25; disc(cam.x(hw[0]), cam.y(hw[1] + 3), (2 + 6 * k) * z, P.LY4, 1 - k); }
  } else {                                     // the complete hero progeny on tail A
    const w = C0w(TAIL_A[0], TAIL_A[1]);
    const nf = clamp(Math.floor((t - T_FIB0) / (BEAT / 4)) + 1, 0, 6);
    const st = { x: w[0], y: w[1], a: 0, s: 0, bp: 0, dna: 1, parts: { fib: nf }, glint: seg(t, T_DONE + 0.1, T_DONE + 0.6) };
    st.fibL = FIB_ROOT.map((_, i) => fibPose(i, 1, t, 0, 0.5));
    drawPhage(cam, st, t);
    for (let q = 0; q < 6; q++) {               // fibres flying in (orange rods) and snapping on
      const tq = T_FIB0 + q * BEAT / 4, k = seg(t, tq - 0.25, tq);
      if (k > 0 && k < 1) { const an = -0.6 + q * 0.5; partFiber(cam, w[0] + 30 * Math.cos(an) * (1 - k) * (q % 2 ? 1 : -1), w[1] + 8 + 20 * (1 - k), an, 1.6); }
      if (t >= tq && t < tq + 0.15) disc(cam.x(w[0] + (q % 2 ? 9 : -9)), cam.y(w[1] - 3), 2.2 * z, P.PH5, 1 - (t - tq) / 0.15);
    }
    if (t < T_DOCK + 0.2) ring(cam.x(w[0]), cam.y(w[1] - 40.5), (4 + 50 * (t - T_DOCK)) * z, 1, P.PH5, 1 - (t - T_DOCK) / 0.2);
  }
}
// ---------------------------------------------------------------- lysis: holins, endolysin, cracks; then the burst
const W_S = -212;                                   // arc position of the weak point (upper left wall)
const CRACKS = [[W_S, 0, 0], [W_S + 13, 0.25, 1], [W_S - 15, 0.45, 2], [W_S + 30, 0.7, 3], [W_S - 34, 0.85, 4], [W_S + 52, 1.05, 5], [140, 0.6, 6], [300, 0.9, 7], [-40, 1.1, 8]];
function crackK(t) { return seg(t, T_CRACK, T_BURST); }
function setupCellState(t) {
  C0.swell = 0.055 * smooth(seg(t, 56.2, 62.6)) - 0.05 * eout(seg(t, T_BURST, T_BURST + 1.2));
  C0.hole = t >= T_PG ? { s: 0, r: 6.5 * K75(seg(t, T_PG, T_IM)) } : null;
  // cracks glowing across the envelope (lysis)
  if (t >= T_CRACK && t < T_BURST + 0.6) {
    const g = crackK(t), fade = 1 - seg(t, T_BURST, T_BURST + 0.6);
    C0.crackFn = (sv, d, iz) => {
      const pw = Math.max(1, iz || 1);
      let best = 0;
      for (const [s0, t0, i] of CRACKS) {
        const gi = clamp((g - t0 * 0.6) / 0.5, 0, 1); if (gi <= 0) continue;
        const reach = 15 * gi + 1;
        if (-d > reach) continue;
        const jag = 2.6 * Math.sin(d * 1.1 + i * 2) + 1.4 * Math.sin(d * 2.9 + i) + 5 * gi * Math.sin(i * 1.7), off = Math.abs(sv - s0 - jag);
        const tip = -d > reach - 2.5 ? 1 : 0;
        if (off < 0.7 * pw) best = Math.max(best, (tip ? 1 : 0.85) * fade);
        else if (off < 2.2 * pw) best = Math.max(best, 0.55 * fade * gi);
        else if (off < 4.5 * pw) best = Math.max(best, 0.2 * fade * gi);
      }
      return best;
    };
    const bk = smooth(seg(t, T_ENDO, T_BURST)) * (1 - seg(t, T_BURST, T_BURST + 0.25));
    C0.bulge = sv => { const Lp = cellPerim(C0); let dd = ((sv - W_S) % Lp + Lp) % Lp; if (dd > Lp / 2) dd -= Lp; return 9 * bk * Math.exp(-dd * dd / 1600) * (1 + 0.15 * Math.sin(t * 40) * bk); };
  } else { C0.crackFn = null; C0.bulge = null; }
  // the rupture: a big tear at the weak point, two smaller tears; the contents spill out
  if (t >= T_BURST) {
    const k1 = eout(seg(t, T_BURST, T_BURST + 0.7)), k2 = eout(seg(t, T_BURST + 0.1, T_BURST + 0.8)), k3 = eout(seg(t, T_BURST + 0.18, T_BURST + 0.9));
    const Lp = cellPerim(C0), wrapd = (a, b) => { let d = ((a - b) % Lp + Lp) % Lp; if (d > Lp / 2) d -= Lp; return Math.abs(d); };
    C0.gapFn = (sv, d) => wrapd(sv, W_S) < 70 * k1 + 0.6 * Math.sin(d * 2) || wrapd(sv, 150) < 34 * k2 || wrapd(sv, 520) < 40 * k3;
    const R = 650 * eout(seg(t, T_BURST, T_BURST + 1.1)), Wp = cellAt(C0, W_S, 6);
    const wl = cellToLocal(C0, Wp[0], Wp[1]);
    C0.open = 1; C0.openFn = (lx, ly) => Math.hypot(lx - wl[0], ly - wl[1]) < R - 40 * vn2(lx / 30, ly / 30, 5);
  } else { C0.gapFn = null; C0.open = 0; C0.openFn = null; }
}
function drawLysis(cam, t) {
  if (t < T_HOL || t >= T_BURST) return;
  const z = cam.z;
  // holin pores in the inner membrane and endolysin slipping out to the wall
  for (let i = 0; i < 9; i++) {
    const s = W_S - 60 + i * 15 + 4 * hash(i + 300), tp = T_HOL + i * 0.06; if (t < tp) continue;
    const p = cellAt(C0, s, 11), k = clamp((t - tp) / 0.2, 0, 1);
    disc(cam.x(p[0]), cam.y(p[1]), Math.max(1, 1.4 * z * k), P.CY0);
    const te = T_ENDO + i * 0.08; if (t < te) continue;
    const u = clamp((t - te) / 0.7, 0, 1), q = cellAt(C0, s + 2, lerp(16, 6.5, u));
    const r = Math.max(1, 1.1 * z); disc(cam.x(q[0]), cam.y(q[1]), r, P.OR2); pset(cam.x(q[0]) - r * 0.3, cam.y(q[1]) - r * 0.3, P.OR3);
  }
}
// burst debris: membrane scraps + contents (deterministic, drag-damped)
const DEBRIS = [];
for (let i = 0; i < 70; i++) DEBRIS.push({ s: W_S + (hash(i + 400) - 0.5) * 150, d: (hash(i + 401) - 0.2) * 14, v: 150 + 260 * hash(i + 402), ang: (hash(i + 403) - 0.5) * 1.4, kind: i < 22 ? 0 : i < 46 ? 1 : 2, sp: (hash(i + 404) - 0.5) * 10 });
function drawBurst(cam, t) {
  if (t < T_BURST || t > 67.5) return;
  const tau = t - T_BURST, z = cam.z, W0 = cellAt(C0, W_S, 0);
  const wx = cam.x(W0[0]), wy = cam.y(W0[1]);
  if (tau < 0.3) {                 // burst flash: hot core, short radial streaks, one shock ring (no fireball)
    const k = tau / 0.3, cr = (6 + 26 * eout(Math.min(1, k * 2))) * z;
    if (k < 0.5) { disc(wx, wy, cr * 1.6, P.LY2, 0.45 * (1 - 2 * k)); disc(wx, wy, cr, P.LY3, 1 - 2 * k); disc(wx, wy, cr * 0.55, P.LY4, 1 - 2 * k); }
    for (let i = 0; i < 14; i++) {
      const an = Math.PI + (i / 14 - 0.5) * 2.6 + 0.2 * Math.sin(i * 7.3), r0 = (10 + 160 * eout(k)) * z, r1 = r0 + (30 + 20 * hash(i + 77)) * z * (1 - k);
      line(wx + Math.cos(an) * r0, wy + Math.sin(an) * r0, wx + Math.cos(an) * r1, wy + Math.sin(an) * r1, i % 3 ? P.LY3 : P.LY4, 1 - k);
    }
  }
  if (tau < 0.6) { const k = tau / 0.6; ring(wx, wy, (10 + 480 * eout(k)) * z, Math.max(1, 2 * z * (1 - k)), P.LY3, 0.9 * (1 - k)); }
  for (const D of DEBRIS) {
    const base = cellAt(C0, D.s, D.d), dir = Math.atan2(base[3], base[2]) + D.ang, f = (1 - Math.exp(-1.6 * tau)) / 1.6;
    const x = base[0] + Math.cos(dir) * D.v * f, y = base[1] + Math.sin(dir) * D.v * f, fade = 1 - seg(t, T_BURST + 1.5, 67.4);
    if (fade <= 0) continue;
    const sx = cam.x(x), sy = cam.y(y);
    if (D.kind === 0) { const a = D.sp * f, L = 5 * z; lineW(sx - Math.cos(a) * L, sy - Math.sin(a) * L, sx + Math.cos(a) * L, sy + Math.sin(a) * L, Math.max(1, 1.6 * z), P.BT3, fade); }
    else if (D.kind === 1) disc(sx, sy, Math.max(1, 2.4 * z), P.RB2, fade);
    else disc(sx, sy, Math.max(1, 1.2 * z), D.s % 2 ? P.BD1 : P.CY4, fade);
  }
}
// ---------------------------------------------------------------- the progeny: the hero-assembled phage flies to a new cell
const ANCH = [A0[0] + LOOP_SHIFT[0], A0[1] + LOOP_SHIFT[1]];
function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; }
function progenyState(t) {    // baseplate-origin state of the hero progeny after the burst
  const start = C0w(TAIL_A[0], TAIL_A[1]), Wp = cellAt(C0, W_S, 0);
  const end = [ANCH[0], ANCH[1]];
  const u = seg(t, T_BURST, DUR), su = 1 - Math.pow(1 - u, 2.4);
  let p = bez(start, [Wp[0] + 10, Wp[1] - 10], [Wp[0] - 160, Wp[1] - 260], end, su);
  let a = 2.6 * (1 - Math.pow(1 - u, 2)) - 0.17 * u;
  // the last seconds: hand over to the opening's free drift (same function, shifted by one cell)
  const f = heroFree(t - DUR), k = smooth(seg(t, 69.8, 71.5));
  p = [lerp(p[0], f[0] + LOOP_SHIFT[0], k), lerp(p[1], f[1] + LOOP_SHIFT[1], k)]; a = lerp(a, f[2], k);
  const ext = clamp(1 - seg(t, 67.6, 69.0), 0, 1);
  const fibL = FIB_ROOT.map((_, i) => fibPose(i, ext * 0.9, t, 0, 1));
  return { x: p[0], y: p[1], a, s: 0, bp: 0, dna: 1, fibL };
}
// two other progeny land on neighbouring cells (the cycle begins again)
const LANDERS = [{ cell: 0, s: -95, t: T_LAND, from: 7 }, { cell: 1, s: 300, t: T_LAND + 0.46, from: 21 }];
function landerState(L, t) {
  const cell = CELLS_O[L.cell], u0 = UNITS[L.from], start = burstPos(u0, T_BURST + 0.9);
  const tgt = cellAt(cell, L.s, -32), nrm = cellAt(cell, L.s, 0);
  const k = K75(seg(t, T_BURST + 0.9, L.t)), mid = [lerp(start[0], tgt[0], 0.5) + 60, lerp(start[1], tgt[1], 0.5) - 40];
  const p = bez([start[0], start[1]], mid, [tgt[0] + nrm[2] * 40, tgt[1] + nrm[3] * 40], tgt, k);
  const aT = Math.atan2(nrm[2], -nrm[3]);                  // tail pointing into the cell
  const a = lerp(start[2], aT, smooth(seg(t, L.t - 1.2, L.t)));
  const st = { x: p[0], y: p[1], a, s: 0, bp: 0, dna: 1 };
  const land = seg(t, L.t - 0.1, L.t + 0.5);
  st.fibL = FIB_ROOT.map((_, i) => fibPose(i, 0.6 + 0.6 * land, t, 0, 0.5));
  return st;
}
// ---------------------------------------------------------------- draw everything
function drawWorld(cam, t) {
  setupCellState(t);
  drawFluid(cam, t);
  CELLS_O.forEach((c, k) => {
    if (!cellInterior(cam, c, t)) return;
    drawNucleoid(cam, c, HOSTO[k], t, { degrade: false }); drawRibosomes(cam, c, HOSTO[k], t);
    cellEnvelope(cam, c, t);
  });
  CELLS_O.forEach((c, k) => { if (cam.z < 1.3) flagella(cam, c, t, 3); });
  // the target cell
  if (cellInterior(cam, C0, t)) {
    if (t < T_BURST + 0.4) {
      crowding(cam, C0, t, t > T_BURST ? 1 - seg(t, T_BURST, T_BURST + 0.4) : undefined);
      drawNucleoid(cam, C0, HOST0, t);
      drawRibosomes(cam, C0, HOST0, t, { vir: (tt, k) => smooth(seg(tt, HOST0.poly[k].sw, HOST0.poly[k].sw + 1.2)) });
      if (t > T_INJ0 - 0.3 && t < 58) drawGenome(cam, t);
      if (t > 26 && t < 47) drawTranscription(cam, t);
      if (t > 30 && t < 44) drawTranslation(cam, t);
      drawEnzymes(cam, t);
      if (t > T_COPY[0] - 0.1) drawCopies(cam, t);
      for (const u of UNITS) if (t >= (u.part === null ? u.done : u.part) && t < T_BURST) drawUnit(cam, u, t);
      drawHeroAssembly(cam, t);
      drawLysis(cam, t);
    }
    cellEnvelope(cam, C0, t);
  }
  // the hero phage (attached, later an empty ghost thrown off by the burst)
  if (t < T_BURST + 6) {
    const st = heroState(Math.min(t, T_BURST - 0.01));
    if (t >= T_BURST) {         // the empty capsid is flung off
      const tau = t - T_BURST, f = (1 - Math.exp(-1.4 * tau)) / 1.4;
      st.y -= 120 * f; st.x += 40 * f; st.a += 1.2 * f; st.fibW = null; st.fibL = FIB_ROOT.map((_, i) => fibPose(i, 0.9, t, 1, 1));
    }
    drawPhage(cam, st, t);
  }
  if (t >= T_BURST) {
    for (const u of UNITS) { if (LANDERS.some(L => L.from === u.k) && t > T_BURST + 0.9) continue; drawUnit(cam, u, t); }
    for (const L of LANDERS) if (t > T_BURST + 0.9) drawPhage(cam, landerState(L, t), t);
    drawPhage(cam, progenyState(t), t);
    drawBurst(cam, t);
  }
}
// the injected genome: grows in through the tail, later fades as copies are packaged
function drawGenome(cam, t) {
  const L = VDNA.L * smooth(seg(t, T_INJ0, T_INJ1)), glow = t >= T_TAKE && t < T_TAKE + 0.6 ? 1 - (t - T_TAKE) / 0.6 : 0;
  const fade = 1 - seg(t, 52, 57.5);
  if (L <= 0.5 || fade <= 0) return;
  const bub = t > T_TX0 - 0.2 && t < T_TX1 + 6 ? { s: pol2S(t), w: 5, h: 2.4 } : null;
  if (fade < 1) { const main = buf; withBuffer(TMPBUF, () => { TMPBUF.set(main); dnaStrand(cam, VDNA, 0, L, t, { bubble: bub, spin: 0.6 }); }); for (let i = 0; i < W * H; i++) if (TMPBUF[i] !== buf[i] && bay(i % W, (i / W) | 0) < fade) buf[i] = TMPBUF[i]; }
  else dnaStrand(cam, VDNA, 0, L, t, { bubble: bub, spin: 0.6, wig: t > 20.5 && t < 28 });
  if (t < T_INJ1 + 0.2) { const q = VDNA.at(L), w = C0w(q[0], q[1]); disc(cam.x(w[0]), cam.y(w[1]), Math.max(1.5, 2.2 * cam.z), P.VD4, 0.9); }   // the leading end
  if (glow > 0) { const q = VDNA.at(VDNA.L * 0.4), w = C0w(q[0], q[1]); ring(cam.x(w[0]), cam.y(w[1]), (10 + 60 * (1 - glow)) * cam.z, 1, P.VD3, glow); }
}
