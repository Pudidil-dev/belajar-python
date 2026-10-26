'use strict';
// ============================================================================
// T4 BACTERIOPHAGE — pixel model with level of detail.
// Prolate icosahedral head (26 x 34 u; 1 u ~ 3 nm) on a collar with two
// whiskers; a contractile sheath of stacked rings around a rigid tail tube;
// a hexagonal baseplate (dome -> flat star on attachment); six long tail
// fibers (two segments, knee joint, receptor-binding tip); six short tail
// fibers. Local frame: origin = middle of the baseplate's bottom face, +y
// down, the head points to -y; angle a rotates clockwise on screen.
// Light from the top left; edges are a darker tint of the same hue.
// ============================================================================
const PHG = { hw: 13, hh: 34, colH: 4, colW: 12, shL: 30, shLc: 14, shW: 10, shWc: 15, tubeW: 4, f1: 22, f2: 22, NR: 12 };
// long tail fibre roots on the baseplate rim: [x, y, side, layer 0 back / 1 side / 2 front]
const FIB_ROOT = [[-5, -5, -1, 0], [5, -5, 1, 0], [-11, -3, -1, 1], [11, -3, 1, 1], [-8, -4, -1, 2], [8, -4, 1, 2]];
// extended pose (proximal angle from straight down, outward +; knee bend) and folded pose (along the sheath)
const FIB_EXT = [[0.62, -1.15], [0.62, -1.15], [1.28, -1.75], [1.28, -1.75], [0.96, -1.62], [0.96, -1.62]];
const FIB_FOLD = [[3.0, -2.93], [3.0, -2.93], [2.95, -2.86], [2.95, -2.86], [3.0, -2.95], [3.0, -2.95]];
const BP_FREE = [-11, -3.5, -7.5, -6.5, 7.5, -6.5, 11, -3.5, 7, 0, -7, 0];
const BP_FLAT = [-15, -2.5, -9, -4.5, 9, -4.5, 15, -2.5, 11, 0, -11, 0];
// fibre pose from angles: returns local [kx, ky, tx, ty]
function fibAng(i, al, be, bp) {
  const R = fibRoot(i, bp), sd = R[2];
  const kx = R[0] + sd * Math.sin(al) * PHG.f1, ky = R[1] + Math.cos(al) * PHG.f1;
  const a2 = al + be;
  return [kx, ky, kx + sd * Math.sin(a2) * PHG.f2, ky + Math.cos(a2) * PHG.f2];
}
function fibRoot(i, bp) {
  const r = FIB_ROOT[i];
  const sx = lerp(1, 1.3, bp || 0), sy = lerp(1, 0.7, bp || 0);
  return [r[0] * sx, r[1] * sy, r[2], r[3]];
}
// blend between folded (0) and extended (1) with a small per-fibre wiggle
function fibPose(i, ext, t, bp, wig) {
  const e = FIB_EXT[i], f = FIB_FOLD[i], w = (wig === undefined ? 1 : wig);
  const al = lerp(f[0], e[0], ext) + w * 0.07 * wob(t, 29 + i * 3, i * 1.7), be = lerp(f[1], e[1], ext) + w * 0.09 * wob(t, 37 + i * 2, i * 2.3);
  return fibAng(i, al, be, bp);
}
// ---------------------------------------------------------------- the model
// st: { x, y, a, s (sheath contraction 0..1, or wave), wave, bp, stf, dna (0..1 in the head), ghost (empty, dim head),
//       fibL: [[kx,ky,tx,ty] x6 local] | fibW: [[kx,ky,tx,ty] x6 world], tube (extra protrusion), dnaFlow (0..1 DNA in the tail), glint }
function sheathRings(st) {
  const hs = [], ws = []; let L = 0;
  for (let k = 0; k < PHG.NR; k++) {
    let ck = st.s || 0;
    if (st.wave !== undefined) ck = clamp((st.wave * (PHG.NR + 3) - k) / 3, 0, 1);
    const h = lerp(PHG.shL / PHG.NR, PHG.shLc / PHG.NR, ck), w = lerp(PHG.shW, PHG.shWc, ck);
    hs.push(h); ws.push(w); L += h;
  }
  return { hs, ws, L };
}
function phageGeom(st) {
  const bpH = lerp(6.5, 4.5, st.bp || 0), R = sheathRings(st);
  const shTop = -bpH - R.L, colTop = shTop - PHG.colH, prot = PHG.shL - R.L + (st.tube || 0);
  return { bpH, R, shTop, colTop, headB: colTop, headT: colTop - PHG.hh, prot };
}
function drawPhage(cam, st, t) {
  const c = Math.cos(st.a || 0), s = Math.sin(st.a || 0), z = cam.z;
  const X = (lx, ly) => cam.x(st.x + lx * c - ly * s), Y = (lx, ly) => cam.y(st.y + lx * s + ly * c);
  const tp = arr => { const o = new Array(arr.length); for (let i = 0; i < arr.length; i += 2) { o[i] = X(arr[i], arr[i + 1]); o[i + 1] = Y(arr[i], arr[i + 1]); } return o; };
  const g = phageGeom(st), hp = PHG.hh * z;
  const PT = st.parts || null, pHead = !PT || PT.head !== 0, pSh = PT && PT.sh !== undefined ? PT.sh : 1, pTube = PT && PT.tube !== undefined ? PT.tube : 1;
  const pBp = PT && PT.bpw !== undefined ? PT.bpw : 6, pFib = PT && PT.fib !== undefined ? PT.fib : 6, pCol = !PT || PT.collar !== 0;
  // culling
  const cxs = X(0, g.headT / 2), cys = Y(0, g.headT / 2), rad = (Math.abs(g.headT) + 50) * z;
  if (cxs < -rad || cxs > W + rad || cys < -rad || cys > H + rad) return;
  const ghost = st.ghost || 0, dim = ghost > 0.5;
  const C = dim ? { a: P.PH1, b: P.PH2, c: P.PH2, d: P.PH3, e: P.PH0, f: P.PH3 } : { a: P.PH2, b: P.PH3, c: P.PH4, d: P.PH5, e: P.PH1, f: P.PH4 };
  // fibres in local coords
  let fib = st.fibL;
  if (!fib && st.fibW) fib = st.fibW.map(q => { const ax = q[0] - st.x, ay = q[1] - st.y, bx = q[2] - st.x, by = q[3] - st.y; return [ax * c + ay * s, -ax * s + ay * c, bx * c + by * s, -bx * s + by * c]; });
  if (!fib) fib = FIB_ROOT.map((_, i) => fibPose(i, 1, t, st.bp));
  const fw1 = Math.max(1, 1.5 * z), fw2 = Math.max(1, 1.15 * z);
  const drawFib = (i, back) => {
    const R = fibRoot(i, st.bp), q = fib[i];
    const rx = X(R[0], R[1]), ry = Y(R[0], R[1]), kx = X(q[0], q[1]), ky = Y(q[0], q[1]), tx = X(q[2], q[3]), ty = Y(q[2], q[3]);
    const c1 = back ? P.PH1 : P.PH3, c2 = back ? P.PH1 : P.PH4, ce = back ? P.PH0 : P.PH2;
    if (hp < 9) { line(rx, ry, kx, ky, back ? P.PH1 : P.PH2); line(kx, ky, tx, ty, back ? P.PH1 : P.PH3); return; }
    if (fw1 > 1.6) { lineW(rx, ry, kx, ky, fw1 + 1, ce); lineW(kx, ky, tx, ty, fw2 + 1, ce); }
    lineW(rx, ry, kx, ky, fw1, c1); lineW(kx, ky, tx, ty, fw2, c2);
    if (fw1 > 1.6) disc(kx, ky, fw1 * 0.62, back ? P.PH1 : P.PH2);
    if (!back) { const tr = Math.max(1, 1.2 * z); disc(tx, ty, tr, P.PB2); if (tr > 1.5) pset(tx - tr * 0.3, ty - tr * 0.3, P.PH5); }
  };
  const FIB_ORDER = [4, 5, 2, 3, 0, 1];
  const fibOn = i => FIB_ORDER.indexOf(i) < pFib;
  for (let i = 0; i < 6; i++) if (FIB_ROOT[i][3] === 0 && fibOn(i)) drawFib(i, true);
  // the inner tail tube while the sheath is still being stacked around it
  if (pSh < 1 && pTube > 0) {
    const tw = PHG.tubeW / 2, yT = -g.bpH - (PHG.shL + PHG.colH) * pTube;
    poly(tp([-tw, -g.bpH + 0.5, tw, -g.bpH + 0.5, tw, yT, -tw, yT]), P.SV2);
    if (hp >= 9) { line(X(-tw, -g.bpH), Y(-tw, -g.bpH), X(-tw, yT), Y(-tw, yT), P.SV3); line(X(tw, -g.bpH), Y(tw, -g.bpH), X(tw, yT), Y(tw, yT), P.SV1); for (let k = 1; k < 12 * pTube; k++) { const yy = -g.bpH - k * (PHG.shL + PHG.colH) / 12; line(X(-tw, yy), Y(-tw, yy), X(tw, yy), Y(tw, yy), P.SV1); } }
  }
  // tail tube protruding below the baseplate (and DNA running through it)
  if (g.prot > 0.3) {
    const tw = PHG.tubeW / 2;
    const pts = tp([-tw, -1, tw, -1, tw * 0.8, g.prot, 0, g.prot + 1.2, -tw * 0.8, g.prot]);
    poly(pts, P.SV2); if (hp >= 9) { line(pts[0], pts[1], pts[8], pts[9], P.SV3); line(pts[2], pts[3], pts[4], pts[5], P.SV1); }
  }
  // sheath rings
  const sw = g.R;
  let y0 = -g.bpH;
  if (hp < 9) {
    const w = sw.ws[sw.ws.length - 1] / 2; if (pSh > 0) poly(tp([-w, y0, w, y0, w, lerp(y0, g.shTop, pSh), -w, lerp(y0, g.shTop, pSh)]), dim ? P.PH1 : P.PH2);
  } else {
    for (let k = 0; k < PHG.NR * pSh - 1e-6; k++) {
      const h = sw.hs[k], w = sw.ws[k] / 2, y1 = y0 - h;
      const band = tp([-w, y0, w, y0, w, y1, -w, y1]);
      const odd = k % 2, hot = st.charge > 0 && st.charge < 1 && k < st.charge * (PHG.NR + 1) && k > st.charge * (PHG.NR + 1) - 4;
      poly(band, hot ? P.PH5 : odd ? C.a : (dim ? P.PH2 : P.PH3));
      if (hp >= 18) {
        poly(tp([-w, y0, -w * 0.45, y0, -w * 0.45, y1, -w, y1]), odd ? C.b : C.c);       // lit left strip
        poly(tp([w * 0.55, y0, w, y0, w, y1, w * 0.55, y1]), C.e);                     // shadow right strip
        if (h * z >= 2.2) { const a0 = X(-w, y1), b0 = Y(-w, y1), a1 = X(w, y1), b1 = Y(w, y1); line(a0, b0, a1, b1, C.e); }
      }
      y0 = y1;
    }
  }
  // DNA travelling through the tail (seen through the sheath)
  if (st.dnaFlow > 0) {
    const yA = g.colTop, yB = g.prot + 0.5, n = Math.max(2, Math.round((yB - yA) * z / 2));
    for (let i = 0; i <= n; i++) {
      const u = i / n, yy = lerp(yA, yB, u), ph = (u * 7 - t * 5.5) % 1;
      const xx = X(0, yy), yys = Y(0, yy);
      pset(xx, yys, ph < 0.35 || ph > 0.85 ? P.VD3 : P.VD2);
      if (z > 2.2) { pset(xx + 1, yys, P.VD1); pset(xx - 1, yys, P.VD2); }
    }
  }
  // baseplate
  const bpL = []; for (let i = 0; i < BP_FREE.length; i++) bpL.push(lerp(BP_FREE[i], BP_FLAT[i], st.bp || 0));
  const bpP = tp(bpL);
  if (pBp < 6) {   // wedges ring up around the hub: draw the plate in six vertical slices
    const order = [2, 3, 1, 4, 0, 5], xs = [-15, -10, -5, 0, 5, 10, 15];
    for (let q = 0; q < Math.floor(pBp); q++) { const k = order[q], xa = xs[k] * 0.74, xb = xs[k + 1] * 0.74; poly(tp([xa, -6.2, xb, -6.2, xb * 0.95, 0, xa * 0.95, 0]), k % 2 ? C.a : C.b); line(X(xa, -6.2), Y(xa, -6.2), X(xb, -6.2), Y(xb, -6.2), C.c); }
  } else poly(bpP, C.a);
  if (hp >= 9 && pBp >= 6) {
    line(bpP[0], bpP[1], bpP[2], bpP[3], C.c); line(bpP[2], bpP[3], bpP[4], bpP[5], C.b);
    line(bpP[8], bpP[9], bpP[10], bpP[11], C.e); line(bpP[6], bpP[7], bpP[8], bpP[9], C.e);
    if (hp >= 22) for (const px of [-5, 0, 5]) disc(X(px * (1 + (st.bp || 0) * 0.3), -0.8), Y(px * (1 + (st.bp || 0) * 0.3), -0.8), Math.max(1, 0.8 * z), P.PB2);
  }
  // short tail fibres (clamped onto the surface after the baseplate change)
  if (st.stf > 0) {
    for (const sd of [-1, 1]) for (const k of [0, 1]) {
      const rx0 = sd * (6 + k * 3), ry0 = -0.5, ex = sd * (9 + k * 6) * st.stf, ey = (2.5 + k * 1.5) * st.stf;
      const a0 = X(rx0, ry0), b0 = Y(rx0, ry0), a1 = X(rx0 + ex * 0.6, ry0 + ey), b1 = Y(rx0 + ex * 0.6, ry0 + ey);
      lineW(a0, b0, a1, b1, Math.max(1, 1.1 * z), k ? P.PH2 : P.PH3); disc(a1, b1, Math.max(0.8, 0.8 * z), P.PB1);
    }
  }
  // collar + whiskers
  const cw = PHG.colW / 2;
  if (pCol) poly(tp([-cw, g.shTop, cw, g.shTop, cw * 0.8, g.colTop, -cw * 0.8, g.colTop]), C.a);
  if (hp >= 18 && pCol) {
    line(X(-cw, g.shTop - 0.5), Y(-cw, g.shTop - 0.5), X(-cw * 0.8, g.colTop), Y(-cw * 0.8, g.colTop), C.c);
    if (z >= 1.2) for (const sd of [-1, 1]) {
      const yy = g.shTop - 1.5, k = (st.whisk === undefined ? 1 : st.whisk);
      const p0 = [sd * cw, yy], p1 = [sd * (cw + 6 * k), yy + 3 * k], p2 = [sd * (cw + 10 * k), yy + 8 * k];
      line(X(p0[0], p0[1]), Y(p0[0], p0[1]), X(p1[0], p1[1]), Y(p1[0], p1[1]), C.b);
      line(X(p1[0], p1[1]), Y(p1[0], p1[1]), X(p2[0], p2[1]), Y(p2[0], p2[1]), C.b);
    }
  }
  // head
  if (pHead) drawHead(cam, st, X, Y, tp, g.headB, hp, C, t);
  // front fibres
  for (let i = 0; i < 6; i++) if (FIB_ROOT[i][3] > 0 && fibOn(i)) drawFib(i, false);
}
// head facets (local coordinates relative to the bottom vertex at y = hb)
const HEADV = { T: [0, -34], UL: [-13, -26], LL: [-13, -8], B: [0, 0], LR: [13, -8], UR: [13, -26], F1: [-1.5, -24], F2: [1.5, -9.5] };
function drawHead(cam, st, X, Y, tp, hb, hp, C, t) {
  const V = k => [HEADV[k][0], HEADV[k][1] + hb];
  const tri = (a, b, c, col) => { const A = V(a), B_ = V(b), C_ = V(c); poly(tp([A[0], A[1], B_[0], B_[1], C_[0], C_[1]]), col); };
  const outline = tp([].concat(V('T'), V('UR'), V('LR'), V('B'), V('LL'), V('UL')));
  const ghost = (st.ghost || 0) > 0.5;
  if (hp < 9) {
    poly(outline, ghost ? P.PH1 : P.PH3);
    const m = tp([].concat(V('T'), V('B'), V('LL'), V('UL'))); poly(m, ghost ? P.PH2 : P.PH4);
    if ((st.dna || 0) > 0.5 && !ghost) pset(X(0, hb - 17), Y(0, hb - 17), P.VD2);
    return;
  }
  // facets: lit on the left, shadowed on the right
  const L1 = ghost ? P.PH2 : P.PH4, L2 = ghost ? P.PH2 : P.PH3, M = ghost ? P.PH1 : P.PH3, D1 = ghost ? P.PH1 : P.PH2, D2 = ghost ? P.PH0 : P.PH1;
  tri('T', 'UL', 'F1', L1); tri('T', 'F1', 'UR', M);
  tri('UL', 'LL', 'F2', L2); tri('UL', 'F2', 'F1', L1);
  tri('F1', 'F2', 'LR', D1); tri('F1', 'LR', 'UR', M);
  tri('LL', 'B', 'F2', M); tri('F2', 'B', 'LR', D2);
  // the packed genome, seen through the shell
  const dna = ghost ? 0 : (st.dna || 0);
  if (dna > 0.02 && hp >= 14 && hp < 44) {      // small heads: a clean inner fill instead of strands
    const k = 0.62, fillY = lerp(hb, hb - 34, dna);
    const inner = [0, -34 + 6, 13 * k, -26 + 2, 13 * k, -8 - 2, 0, -6, -13 * k, -8 - 2, -13 * k, -26 + 2].map((v, i) => i % 2 ? Math.max(v + hb, fillY) : v);
    const ip = tp(inner); poly(ip, P.VD1); const ip2 = tp([inner[0], inner[1], inner[2] * 0.6, inner[3], inner[4] * 0.6, inner[5], inner[6], inner[7]]); poly(ip2, P.VD2);
  }
  if (dna > 0.02 && hp >= 44) {
    const m = maskPoly(outline), c = Math.cos(st.a || 0), s = Math.sin(st.a || 0);
    const hcY = hb - 17, top = hb - 34, per = clamp(7 / cam.z, 1.15, 2.6), zq = cam.z / 36;
    for (let j = 0; j < m.h; j++) {
      const sy = m.y0 + j; if (sy < 0 || sy >= H) continue;
      for (let i = 0; i < m.w; i++) {
        if (!m.d[j * m.w + i]) continue; const sx = m.x0 + i; if (sx < 0 || sx >= W) continue;
        const wx = cam.wx(sx + 0.5) - st.x, wy = cam.wy(sy + 0.5) - st.y, lx = wx * c + wy * s, ly = -wx * s + wy * c;
        if (ly < lerp(hb, top, dna)) continue;                                                      // fill level (packaging)
        const r = Math.hypot(lx / 11.5, (ly - hcY) / 15.5);
        if (r > 0.86) continue;                                                                     // keep a clean shell rim
        const th = 2.6 * vn2(lx * zq + 3, ly * zq + 5, 77) + 0.25 * wob(t, 18, 1);          // fingerprint-like packed strands (fixed on-screen scale)
        const v = (((lx * Math.cos(th) + ly * Math.sin(th)) / per) % 1 + 1) % 1, lit = lx < 0;
        if (v < 0.12) { buf[sy * W + sx] = lit ? P.VD3 : P.VD2; continue; }
        if (v < 0.32) { if (bay(sx, sy) < 0.85) buf[sy * W + sx] = P.VD1; continue; }
        if (v < 0.42 && bay(sx, sy) < 0.3) buf[sy * W + sx] = P.VD0;
      }
    }
  }
  // facet edges + outline (same-hue dark), lit edges bright
  const E = (a, b, col) => { const A = V(a), B_ = V(b); line(X(A[0], A[1]), Y(A[0], A[1]), X(B_[0], B_[1]), Y(B_[0], B_[1]), col); };
  if (hp >= 20) {
    E('T', 'F1', ghost ? P.PH2 : P.PH5); E('UL', 'F1', ghost ? P.PH2 : P.PH4); E('F1', 'F2', ghost ? P.PH1 : P.PH2); E('UL', 'F2', ghost ? P.PH2 : P.PH4); E('F2', 'LL', ghost ? P.PH2 : P.PH3); E('F2', 'LR', ghost ? P.PH0 : P.PH1); E('F1', 'LR', ghost ? P.PH0 : P.PH2); E('B', 'F2', ghost ? P.PH1 : P.PH2);
  }
  for (let i = 0; i < 12; i += 2) { const j = (i + 2) % 12; const lit = i >= 8 || i === 0; line(outline[i], outline[i + 1], outline[j], outline[j + 1], lit ? (ghost ? P.PH2 : P.PH4) : (ghost ? P.PH0 : P.PH1)); }
  if (hp >= 26 && !ghost) {   // specular glint on the top-left facet (+ an optional travelling glint)
    const g0 = V('T'), g1 = V('UL'), gx = lerp(g0[0], g1[0], 0.35) + 2, gy = lerp(g0[1], g1[1], 0.35) + 2;
    rect(X(gx, gy), Y(gx, gy), X(gx, gy) + Math.max(2, Math.round(hp / 26)), Y(gx, gy) + Math.max(2, Math.round(hp / 26)), P.PH5);
  }
  if (st.glint > 0 && st.glint < 1 && hp >= 14) { // a highlight sweeping down the head
    const yy = lerp(hb - 36, hb + 2, st.glint);
    for (let xx = -14; xx <= 14; xx += 0.5) { const sx = X(xx, yy + xx * 0.35), sy = Y(xx, yy + xx * 0.35); if (Math.abs(xx) < 13 - Math.max(0, Math.abs(yy + xx * 0.35 - (hb - 17)) - 9) * 1.6) pset(sx, sy, P.PH5); }
  }
}
