// EYE — the one anatomical eye of the film (asset D), in millimetres, and the rays traced through it.
// Eye coordinates: d = depth from the corneal apex into the eye, h = height. Diagram world: X = −d (the eye looks toward
// +X, where the instrument is), Y = −h (screen y runs down).
//   cornea      front radius 7.8, back radius 6.5, 0.55 thick, n = 1.376
//   aqueous     n = 1.336; anterior chamber 3.05 deep
//   iris        in front of the lens; pupil 4 mm (radius 2.0)
//   lens        front radius 10.2, back radius 6.0, 4.0 thick, equator radius 5.0; one index, tuned at load so that a
//               distant axial point focuses on the retina
//   vitreous    n = 1.336
//   retina      inner surface: a sphere of radius 10.7 centred at d = 13.3 (axial length 24.0), then choroid and sclera
// Rays are traced surface by surface with Snell's law (EYE.traceIn: from outside to the retina; EYE.traceOut: from a
// point on the retina back out through the pupil). The comparison eyes of S13 use the same optics with another length.
(() => {
const { W, H, P } = PIX;
const EYE = window.EYE = { NAME: 'EYE' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, DEG = Math.PI / 180;
const G = EYE.G = { nC: 1.376, nA: 1.336, nV: 1.336, nL: 1.42, CS: 13.3, RO: 12.0, RS: 11.25, RC: 11.0, RR: 10.7, pupil: 2.0, iris: 3.45, AL: 24.0, eq: 5.0 };
const surf = () => [
  { d: 0.0, R: 7.8, n1: 1.0, n2: G.nC }, { d: 0.55, R: 6.5, n1: G.nC, n2: G.nA },
  { d: 3.6, R: 10.2, n1: G.nA, n2: G.nL }, { d: 7.6, R: -6.0, n1: G.nL, n2: G.nV }];
// one refraction: ray (p, v) at surface s, going forward (n1 → n2) or backward (n2 → n1); returns {p, v} or null
const refract = (p, v, s, fwd) => {
  const cx = s.d + s.R, r = Math.abs(s.R), ox = p[0] - cx, oy = p[1], b = ox * v[0] + oy * v[1], c = ox * ox + oy * oy - r * r, D = b * b - c;
  if (D < 0) return null;
  const q = Math.sqrt(D), t1 = -b - q, t2 = -b + q;
  // the intersection on the apex side of the sphere
  const pick = t => [p[0] + v[0] * t, p[1] + v[1] * t];
  const a = pick(t1), bb = pick(t2), ta = Math.abs(a[0] - s.d) < Math.abs(bb[0] - s.d) ? t1 : t2;
  if (ta < 1e-6) return null;
  const hp = pick(ta); let nx = (hp[0] - cx) / r, ny = hp[1] / r;
  if (nx * v[0] + ny * v[1] > 0) { nx = -nx; ny = -ny; }
  const eta = fwd ? s.n1 / s.n2 : s.n2 / s.n1, ci = -(nx * v[0] + ny * v[1]), s2 = eta * eta * (1 - ci * ci);
  if (s2 > 1) return null;
  const k = eta * ci - Math.sqrt(1 - s2);
  return { p: hp, v: [eta * v[0] + k * nx, eta * v[1] + k * ny] };
};
const hitRetina = (p, v, AL = G.AL) => {                              // the far wall (retina inner surface) for an eye of length AL
  const cx = G.CS + (AL - G.AL), ox = p[0] - cx, oy = p[1], b = ox * v[0] + oy * v[1], c = ox * ox + oy * oy - G.RR * G.RR, D = b * b - c;
  if (D < 0) return null; const t = -b + Math.sqrt(D); return [p[0] + v[0] * t, p[1] + v[1] * t];
};
// from outside: start at depth d0 (negative = in front of the eye), height h0, slope angle a (rad). Returns the polyline
// [[d, h], …] (start, the four surfaces, the retina) or, if the iris stops it, the polyline up to the iris with .stopped.
EYE.traceIn = (h0, a = 0, d0 = -8, AL = G.AL, past = 0) => {
  let p = [d0, h0], v = [Math.cos(a), Math.sin(a)]; const pts = [p], S = surf();
  for (let i = 0; i < 4; i++) {
    if (i === 2) { const t = (G.iris - p[0]) / v[0], hh = p[1] + v[1] * t; if (Math.abs(hh) > G.pupil) { pts.push([G.iris, hh]); pts.stopped = true; return pts; } }
    const r = refract(p, v, S[i], true); if (!r) { pts.stopped = true; return pts; }
    p = r.p; v = r.v; pts.push(p);
  }
  const e = hitRetina(p, v, AL); if (e) pts.push(e);
  if (past) pts.cross = p[1] !== 0 && v[1] !== 0 ? p[0] - p[1] * v[0] / v[1] : null;       // where it crosses the axis
  pts.v = v; pts.last = p;
  return pts;
};
// from a point on the retina (default: the posterior pole) at angle a from the axis (rad; 0 = straight toward the cornea),
// out through the lens, the pupil and the cornea to depth dEnd (negative = outside). .stopped if the iris blocks it.
EYE.traceOut = (a = 0, dEnd = -8, from = null) => {
  let p = from || [G.AL, 0], v = [-Math.cos(a), Math.sin(a)]; const pts = [p], S = surf();
  for (let i = 3; i >= 0; i--) {
    const r = refract(p, v, S[i], false);
    if (!r) { pts.stopped = true; return pts; }
    if (i === 3 && Math.abs(r.p[1]) > G.eq - 0.2) { pts.stopped = true; return pts; }
    p = r.p; v = r.v; pts.push(p);
    if (i === 2) { const t = (G.iris - p[0]) / v[0], hh = p[1] + v[1] * t; if (Math.abs(hh) > G.pupil) { pts.push([G.iris, hh]); pts.stopped = true; return pts; } pts.hp = hh; }
  }
  const t = (dEnd - p[0]) / v[0]; pts.push([dEnd, p[1] + v[1] * t]); pts.v = v;
  return pts;
};
EYE.init = () => {
  // tune the lens index: a paraxial ray from infinity must cross the axis at the retina (d = AL)
  let lo = 1.38, hi = 1.5;
  for (let k = 0; k < 40; k++) { G.nL = (lo + hi) / 2; const r = EYE.traceIn(0.4, 0, -8, G.AL, 1); if (r.cross > G.AL) lo = G.nL; else hi = G.nL; }
  EYE.wall = [];
  console.log(`EYE: lens index ${G.nL.toFixed(4)} (focus at ${EYE.traceIn(0.4, 0, -8, G.AL, 1).cross.toFixed(2)} mm)`);
};
// ---------- anatomy ----------
const W2 = ([d, hh]) => [-d, -hh];                                   // eye (d, h) → world (X, Y)
EYE.W = W2;
const arc = (cx, cy, r, a0, a1, n = 40) => { const o = []; for (let k = 0; k <= n; k++) { const a = (a0 + (a1 - a0) * k / n) * DEG; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
const poly = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
const ring = (cx, r0, r1, a0, a1) => poly(arc(cx, 0, r1, a0, a1, 72).concat(arc(cx, 0, r0, a1, a0, 72)));
const mir = pts => pts.map(([x, y]) => [x, -y]);
// the face in profile round the eye (world X, Y), top to bottom, with the gap between the lids
const PROF_U = [[1.0, -130], [2.0, -74], [3.2, -46], [5.2, -27], [5.8, -19], [4.2, -14], [-0.5, -11], [-3.6, -9.3], [-2.6, -7.2], [-1.07, -5.6]];
const PROF_L = [[-1.07, 5.6], [-2.4, 7.2], [-3.2, 9.2], [-2.2, 12], [0.5, 17], [2.6, 26], [2.4, 40], [1.2, 74], [0.4, 130]];
const smooth = (pts, step = 0.5) => {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) { const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(pts[pts.length - 1].slice()); return out;
};
const PU = smooth(PROF_U), PL = smooth(PROF_L);
let SH = null;
// the lens outline for accommodation acc (0 = relaxed: the traced shape; 1 = focusing near: a rounder, thicker front)
const lensShape = acc => {
  const Rf = 10.2 - 2.8 * acc, xf = -3.6 + 0.3 * acc, eq = 5.0 - 0.15 * acc, af = Math.asin(eq / Rf) / DEG, ab = Math.asin(eq / 6.0) / DEG;
  return poly(arc(xf - Rf, 0, Rf, -af, af, 30).concat(arc(-1.6, 0, 6.0, 180 - ab, 180 + ab, 30)));
};
EYE.lensFront = acc => -3.6 + 0.3 * acc;
const shapes = () => {
  if (SH) return SH;
  const cs = -G.CS, S = {};
  S.head = poly(PU.concat(PL).concat([[-90, 130], [-90, -130]]));
  S.vit = PIX.circPath(cs, 0, G.RS);
  S.aq = (() => { const p = new Path2D(); p.arc(-7.05, 0, 6.5, -62 * DEG, 62 * DEG); p.closePath(); return p; })();
  S.sclera = ring(cs, G.RS, G.RO, 29.45, 330.55);
  S.chor = ring(cs, G.RC, G.RS, 52, 308);
  S.ret = ring(cs, G.RR, G.RC, 62, 298);
  S.cornea = poly(arc(-7.8, 0, 7.8, -49.1, 49.1).concat(arc(-7.05, 0, 6.5, 52, -52)));
  S.limbus = [poly([[-2.7, -5.9], [-2.85, -5.9], [-3.5, -5.53], [-3.05, -5.12]]), poly([[-2.7, 5.9], [-2.85, 5.9], [-3.5, 5.53], [-3.05, 5.12]])];
  const cil = arc(cs, 0, G.RS, 31, 55, 10).concat([[-5.9, 7.4], [-5.0, 6.1], [-4.3, 5.8]]);
  S.cil = [poly(cil), poly(mir(cil))];
  const iris = [[-3.12, 5.72], [-3.78, 5.66], [-3.86, 2.12], [-3.62, 1.96], [-3.36, 2.1]];
  S.iris = [poly(iris), poly(mir(iris))];
  S.irisBack = [poly([[-3.7, 5.6], [-3.92, 5.6], [-3.98, 2.16], [-3.78, 2.14]]), poly(mir([[-3.7, 5.6], [-3.92, 5.6], [-3.98, 2.16], [-3.78, 2.14]]))];
  S.lens = lensShape(0);
  S.nucleus = (() => { const p = new Path2D(); p.ellipse(-5.5, 0, 1.25, 3.3, 0, 0, TAU); return p; })();
  // rectus muscles hugging the globe behind its equator, running back out of frame
  const mus = [[-12, -12.3], [-19, -11.3], [-28, -8.6], [-60, -5], [-60, -8.4], [-28, -11.8], [-19, -14.2], [-12, -14]];
  S.mus = [poly(mus), poly(mir(mus))];
  return (SH = S);
};
EYE.PROF = { PU, PL };
// o = {head (1: the profile silhouette; 0: the eye alone), alpha, hi: part to highlight}
EYE.draw = (c, cam, o = {}) => {
  const S = shapes(), F = (path, col, a = 1) => PIX.fill(c, path, col, a);
  K.cam(c, cam);
  if (o.head !== 0) {
    F(S.head, 'd1');
    for (const m of S.mus) F(m, 'd2');
    // the skin: a band inside the profile line, lighter at its outer edge
    c.save(); c.clip(S.head); c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [w, col] of [[4.4, 's1'], [2.6, 's2'], [0.7, 's3']]) { c.strokeStyle = P[col]; c.lineWidth = w; for (const L of [PU, PL]) { c.beginPath(); L.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); } }
    c.restore();
  }
  F(S.vit, 'v0'); F(S.aq, 'v1');
  F(S.sclera, 'x2'); F(ring(-G.CS, G.RO - 0.28, G.RO, 200, 330.55), 'x1'); F(ring(-G.CS, G.RS, G.RS + 0.2, 29.45, 330.55), 'x1');
  F(S.chor, 'u1'); F(S.ret, 'r1'); F(ring(-G.CS, G.RR, G.RR + 0.12, 62, 298), 'r2');
  for (const p of S.cil) F(p, 'z1');
  c.save(); c.strokeStyle = P.g6; c.lineWidth = 0.12;
  for (const s of [-1, 1]) for (const [a, b] of [[[-4.5, 5.85], [-4.75, 4.97]], [[-5.2, 6.3], [-5.05, 4.98]], [[-4.9, 6.05], [-4.9, 5.0]]]) { c.beginPath(); c.moveTo(a[0], a[1] * s); c.lineTo(b[0], b[1] * s); c.stroke(); }
  c.restore();
  const acc = o.acc || 0, LS = acc > 0 ? lensShape(acc) : S.lens, Rf = 10.2 - 2.8 * acc, xf = -3.6 + 0.3 * acc;
  F(LS, 'l1'); c.save(); c.clip(LS); c.translate(0.35, 0.5); F(LS, 'l0'); c.translate(-0.35, -0.5); c.translate(-0.3, -0.35); F(LS, 'l1'); c.restore();
  F(S.nucleus, 'l2');
  c.save(); c.clip(LS); c.strokeStyle = P.l3; c.lineWidth = 0.22; c.beginPath(); c.arc(xf - Rf, 0, Rf - 0.2, -27 * DEG, -4 * DEG); c.stroke(); c.restore();
  for (const p of S.irisBack) F(p, 'i0');
  for (const p of S.iris) F(p, 'i1');
  c.save(); c.fillStyle = P.i2; for (const s of [-1, 1]) { c.fillRect(-3.3, s > 0 ? 2.7 : -5.2, 0.16, 2.5); } c.restore();
  for (const p of S.limbus) F(p, 'x1');
  F(S.cornea, 'o1'); c.save(); c.clip(S.cornea); c.strokeStyle = P.o3; c.lineWidth = 0.2; c.beginPath(); c.arc(-7.8, 0, 7.8 - 0.14, -44 * DEG, -6 * DEG); c.stroke(); c.strokeStyle = P.o0; c.lineWidth = 0.16; c.beginPath(); c.arc(-7.05, 0, 6.5 + 0.08, -50 * DEG, 50 * DEG); c.stroke(); c.restore();
  if (o.head !== 0) {
    // lashes at the lid margins
    c.save(); c.strokeStyle = P.h0; c.lineWidth = 0.22; c.lineCap = 'round';
    for (const s of [-1, 1]) for (const [dx, dy] of [[1.5, 0.5], [1.7, 1.0]]) { c.beginPath(); c.moveTo(-1.0, 5.55 * s); c.lineTo(-1.0 + dx, (5.55 - dy) * s + (s < 0 ? -0.2 : 0.2)); c.stroke(); }
    c.restore();
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// a simplified comparison eye (S13): outline, cornea, lens, retina; length AL. Drawn under the current camera.
EYE.simple = (c, cam, AL, o = {}) => {
  const S = shapes(), sh = -(AL - G.AL), F = (path, col, a = 1) => PIX.fill(c, path, col, a);
  K.cam(c, cam);
  // the globe: the standard front, a back shell shifted by the extra length, joined by straight walls
  const back = poly(arc(-G.CS + sh, 0, G.RO, 90, 270, 48).concat([[-G.CS, -G.RO], [-G.CS, G.RO]]));
  const front = poly(arc(-G.CS, 0, G.RO, -90, -29.45, 16).concat(arc(-G.CS, 0, G.RO, 29.45, 90, 16)).concat([[-G.CS, 0]]));
  c.save(); F(back, 'x2'); const wall = new Path2D(); wall.rect(-G.CS + sh - 0.1, -G.RO, -sh + 0.2, 2 * G.RO); F(wall, 'x2');
  F(ring(-G.CS, 0, G.RO, 29.45, 90), 'x2'); F(ring(-G.CS, 0, G.RO, 270, 330.55), 'x2'); c.restore();
  const inB = poly(arc(-G.CS + sh, 0, G.RS, 90, 270, 48).concat([[-G.CS, -G.RS], [-G.CS, G.RS]])); F(inB, 'v0');
  const inW = new Path2D(); inW.rect(-G.CS + sh - 0.1, -G.RS, -sh + 0.2, 2 * G.RS); F(inW, 'v0');
  F(ring(-G.CS, 0, G.RS, 29.45, 90), 'v0'); F(ring(-G.CS, 0, G.RS, 270, 330.55), 'v0'); F(S.aq, 'v1');
  F(ring(-G.CS + sh, G.RR, G.RC, 100, 260), 'r1');
  for (const p of S.cil) F(p, 'z1');
  F(S.lens, 'l1'); F(S.nucleus, 'l2');
  for (const p of S.iris) F(p, 'i1');
  for (const p of S.limbus) F(p, 'x1');
  F(S.cornea, 'o1');
  c.setTransform(1, 0, 0, 1, 0, 0);
};
})();
