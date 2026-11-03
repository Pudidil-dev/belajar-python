'use strict';
// ============================================================================
// MACROPHAGES (micro-world units, µm). Pale white-blue cells with a deep purple,
// bean-shaped nucleus and small vesicles. Resident macrophages already hold ink.
// The hero macrophage M crawls in (its leading edge bulging), reaches toward the
// fragments, wraps two membrane arms around three of them, the arms meet and
// close (24.0 s), and the enclosed vesicle (phagosome) is carried inward; inside
// the cell, lysosomes merge with it and the ink stays recognisable. A second,
// ink-laden macrophage M2 squeezes into the lymphatic vessel and is carried away.
// ============================================================================
// a cell outline as screen points: base radius R (µm) with a slow living wobble and optional bulges
function cellPts(cam, cx, cy, R, t, seed, bulges, sxk, syk) {
  const pts = [], n = 56; sxk = sxk || 1; syk = syk || 1;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU; let r = R * (1 + 0.055 * Math.sin(3 * a + 0.9 * t + seed) + 0.04 * Math.sin(5 * a - 1.3 * t + seed * 2) + 0.03 * Math.sin(2 * a + 0.5 * t + seed * 3));
    if (bulges) for (const b of bulges) { const d = Math.atan2(Math.sin(a - b.a), Math.cos(a - b.a)); r += b.h * Math.exp(-(d * d) / (2 * b.w * b.w)); }
    pts.push(cam.x(cx + Math.cos(a) * r * sxk), cam.y(cy + Math.sin(a) * r * syk));
  }
  return pts;
}
function cellBody(cam, pts) { const m = maskPoly(pts); shade(m, P.MC3, P.MC4, P.MC2, P.MC0, { k: Math.max(1, Math.round(cam.z * 0.45)) }); return m; }
function nucleus(cam, cx, cy, a, s) {
  const z = cam.z, X = v => cam.x(v), Y = v => cam.y(v), ca = Math.cos(a), sa = Math.sin(a);
  const m = maskEll(X(cx), Y(cy), 2.6 * s * z, 1.8 * s * z, a); shade(m, P.NU2, P.NU3, P.NU1, P.NU0, { k: Math.max(1, Math.round(z * 0.3)) });
  // the bean's notch
  disc(X(cx - sa * 1.6 * s), Y(cy + ca * 1.6 * s), 0.9 * s * z, P.MC3);
  if (z > 4) for (let k = 0; k < 5; k++) disc(X(cx + Math.cos(k * 2.3) * 1.2 * s), Y(cy + Math.sin(k * 1.7) * 0.8 * s), Math.max(0.8, 0.18 * s * z), P.NU1);
}
function vesicles(cam, cx, cy, R, seed, n) {
  const z = cam.z; if (z < 2) return;
  for (let k = 0; k < n; k++) { const a = hash(seed + k) * TAU, d = R * (0.35 + 0.45 * hash(seed + k + 9)), r = 0.35 + 0.3 * hash(seed + k + 17); disc(cam.x(cx + Math.cos(a) * d), cam.y(cy + Math.sin(a) * d), r * z, P.MC1); disc(cam.x(cx + Math.cos(a) * d), cam.y(cy + Math.sin(a) * d), Math.max(0.6, (r - 0.12) * z), P.MC2); }
}
function inkGranules(cam, cx, cy, R, seed, n) {
  for (let k = 0; k < n; k++) { const a = hash(seed + k + 30) * TAU, d = R * (0.2 + 0.55 * hash(seed + k + 31)), r = 0.55 + 0.5 * hash(seed + k + 32); inkDot(cam.x(cx + Math.cos(a) * d), cam.y(cy + Math.sin(a) * d), r * cam.z, cam.z); }
}
// resident macrophages that already hold ink (some gain more as the weeks pass)
function drawResident(cam, t) {
  const z = cam.z;
  RES.forEach((c, i) => {
    const x = cam.x(c.x), y = cam.y(c.y); if (x < -14 * z - 10 || x > W + 14 * z + 10 || y < -14 * z - 10 || y > H + 14 * z + 10) return;
    cellBody(cam, cellPts(cam, c.x, c.y, c.r, t, c.seed));
    nucleus(cam, c.x + 1.5, c.y - 1.2, 0.6 + i, c.r / 9);
    const extra = EV.clear.filter(tc => t >= tc && hash(i * 31 + tc * 4) < 0.5).length;
    inkGranules(cam, c.x - 1, c.y + 1.5, c.r, c.seed, c.ink + extra);
  });
}
// ---------------------------------------------------------------- the hero macrophage M and the ink-laden M2
const M_R = 10;
const cupP = t => smooth(seg(t, EV.wrap, EV.close));                     // 0..1: the arms sweep around the fragments
function drawMacrophages(cam, t, o) {
  const z = cam.z;
  // ---- M
  const [mx, my] = macPos(t), tp = [AGG.x + TP[0], AGG.y + TP[1]], aT = Math.atan2(tp[1] - my, tp[0] - mx);
  const vis = cam.x(mx) > -20 * z - 10 && cam.x(mx) < W + 20 * z + 10 && cam.y(my) > -20 * z - 10 && cam.y(my) < H + 20 * z + 10;
  if (vis) {
    const bul = [];
    // crawling: the leading edge bulges in the direction of travel
    const [px, py] = macPos(t - 0.2), mv = Math.hypot(mx - px, my - py);
    if (mv > 0.05) bul.push({ a: Math.atan2(my - py, mx - px), h: Math.min(3.2, mv * 3.5), w: 0.5 });
    // reaching: four small pseudopods stretch toward the fragments, one per event
    EV.reach.forEach((tr, k) => { const g = Math.sin(Math.PI * clamp((t - tr) / 0.9, 0, 1)); if (g > 0) bul.push({ a: aT + (k % 2 ? 0.35 : -0.35) * (1 - k / 4), h: 2.4 * g + k * 0.3, w: 0.16 }); });
    // after closure the cell bulges over the new vesicle, then smooths as it is carried in
    if (t >= EV.close) { const pp = phagoPos(t), d = Math.hypot(pp[0] - mx, pp[1] - my), reach = d + 2.7 - M_R; if (reach > 0) bul.push({ a: Math.atan2(pp[1] - my, pp[0] - mx), h: reach, w: 0.32 }); }
    else if (t >= EV.wrap) bul.push({ a: aT, h: 1.2 * cupP(t), w: 0.45 });
    // the two membrane arms of the phagocytic cup (outline first, then the body, then the arm fill)
    const armOn = t >= EV.wrap - 0.05 && t < EV.close + 0.02, p = cupP(t), rc = 2.25, back = aT + Math.PI;
    const armArc = sgn => { const pts = [], a0 = back + sgn * 0.85, a1 = back + sgn * (0.85 + (Math.PI - 0.85) * Math.max(0.02, p)); for (let k = 0; k <= 16; k++) { const a = lerp(a0, a1, k / 16); pts.push([cam.x(tp[0] + Math.cos(a) * rc), cam.y(tp[1] + Math.sin(a) * rc)]); } return pts; };
    const strokeArc = (pts, w, c) => { for (let k = 1; k < pts.length; k++) lineW(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], w, c); };
    if (armOn) for (const s of [-1, 1]) { const a = armArc(s); strokeArc(a, 1.5 * z + 2, P.MC0); disc(a[a.length - 1][0], a[a.length - 1][1], 0.75 * z + 1, P.MC0); }
    cellBody(cam, cellPts(cam, mx, my, M_R, t, 1.7, bul));
    if (armOn) for (const s of [-1, 1]) { const a = armArc(s); strokeArc(a, 1.5 * z, P.MC3); disc(a[a.length - 1][0], a[a.length - 1][1], 0.75 * z, P.MC3); strokeArc(a.slice(0, -1), Math.max(1, 0.35 * z), P.MC4); }
    nucleus(cam, mx - Math.cos(aT) * 3.6, my - Math.sin(aT) * 3.6, aT + 1.2, 1.25);
    vesicles(cam, mx, my, M_R, 51, 9);
    // the vesicle (phagosome) around the enclosed ink
    if (t >= EV.close) {
      const pp = phagoPos(t), g = smooth(seg(t, EV.close, EV.close + 0.12)), lk = lysoK(t);
      disc(cam.x(pp[0]), cam.y(pp[1]), 2.25 * z, mixc(P.MC4, P.LS2, 0.45 * lk));
      if (g > 0) ring(cam.x(pp[0]), cam.y(pp[1]), 2.25 * z, Math.max(1, 0.22 * z), mixc(P.VS, P.LS1, lk));
      drawLysosomes(cam, t, pp);
    }
  }
  // ---- M2: an ink-laden macrophage near the lymphatic vessel; it squeezes in and is carried away
  if (t >= 26.5 && t < 33.5) {
    const [x2, y2, sxk, syk] = m2Pos(t);
    if (cam.x(x2) > -20 * z && cam.x(x2) < W + 20 * z) {
      cellBody(cam, cellPts(cam, x2, y2, 7.5, t, 4.1, null, sxk, syk));
      nucleus(cam, x2 + 1.2, y2 - 0.6, 2.2, 0.85 * Math.min(sxk, syk) + 0.15);
      inkGranules(cam, x2 - 0.8, y2 + 0.8, 6.5 * Math.min(sxk, syk), 222, 9);
    }
  }
}
function m2Pos(t) {
  const a = [34, 425], b = [27, LYV.y - LYV.r - 1], c = [24, LYV.y];
  if (t < EV.lymph + 1.2) return [a[0], a[1] + 1.5 * Math.sin(t * 1.3), 1, 1];
  if (t < EV.cellIn) { const u = smooth(seg(t, EV.lymph + 1.2, EV.cellIn)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), 1 + 0.25 * u, 1 - 0.4 * u]; }
  if (t < EV.cellIn + 0.4) { const u = smooth(seg(t, EV.cellIn, EV.cellIn + 0.4)); return [lerp(b[0], c[0], u), lerp(b[1], c[1], u), 1.25 - 0.15 * u, 0.6 + 0.25 * u]; }
  return [c[0] + 15 * (t - EV.cellIn - 0.4), c[1], 1.1, 0.85];
}
// ---------------------------------------------------------------- inside the cell: lysosomes merging with the vesicle
const LYSO = EV.lyso.map((tl, k) => ({ t: tl, a: 2.2 + k * 1.9, d: 6.5 }));
const lysoK = t => LYSO.reduce((a, l) => a + smooth(seg(t, l.t, l.t + 0.15)), 0) / LYSO.length;
function drawLysosomes(cam, t, pp) {
  const z = cam.z; if (z < 3) return;
  for (const l of LYSO) {
    const start = l.t - 0.75; if (t < start - 0.5 || t > l.t + 0.15) continue;
    const u = smooth(seg(t, start, l.t)), d = lerp(l.d, 2.25, u), x = cam.x(pp[0] + Math.cos(l.a) * d), y = cam.y(pp[1] + Math.sin(l.a) * d);
    const r = 0.55 * (t > l.t ? 1 - seg(t, l.t, l.t + 0.15) : 1) * z;
    if (r > 0.5) { disc(x, y, r + 1, P.LS0); disc(x, y, r, P.LS1); disc(x - r * 0.3, y - r * 0.3, Math.max(0.5, r * 0.3), P.LS2); }
  }
}
