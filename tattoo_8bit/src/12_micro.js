'use strict';
// ============================================================================
// THE MICRO WORLD (units: µm; x across, y down from the skin surface).
// One coordinate system for every microscopic shot, so the camera can travel
// continuously from the whole dermis (~0.6 px/µm) to one ink aggregate
// (~26 px/µm): stratum corneum, epidermis (keratinocytes, melanin in the basal
// layer), the wavy dermal–epidermal junction, papillary dermis with capillary
// loops, reticular dermis with collagen bundles, fibroblasts, a small blood
// vessel, a lymphatic vessel (soft green), resident macrophages that already
// hold ink, scattered ink clusters, and the hero aggregate A at (0, 380).
// The pulse is shown in slow motion (it lasts nanoseconds): photons → absorbed
// (particles jitter) → expansion and a pressure wave, gas bubbles → four cracks
// → fragments. Fragments are defined by the cracks themselves (which side of
// each crack a particle is on), so the break-up always matches the cracks drawn.
// ============================================================================
const MW = { sc: 12, pap: 250 };
const EP_LINE = mixc(P.EP2, P.EP0, 0.42);
const dejY = x => 92 + 15 * Math.sin(x / 34 + 0.6) + 6 * Math.sin(x / 13 + 1.7);
const AGG = { x: 0, y: 380 };
const LYV = { y: 452, r: 15, wall: 3.2 };
const BVS = { y: 300, r: 6 };
// ---------------------------------------------------------------- the tissue, per pixel
function tissue(x, y, z) {
  if (y < 0) return P.BG;
  if (y < MW.sc) return z > 1.6 && ((y | 0) % 3 === 0) ? P.SC0 : P.SC1;
  const d = dejY(x);
  if (y < d) {
    if (d - y < 7) return ((x * 0.7 + y) % 9 < 1.2 && z > 0.8) ? P.ML : P.EP1;                       // basal layer with melanin
    if (z < 0.8) return P.EP2;
    const row = Math.floor(y / 9), xx = x + row * 6 + 2 * Math.sin(y / 5), lw = 1.1 / z;
    if (y - row * 9 < lw || ((xx % 12) + 12) % 12 < lw) return EP_LINE;
    const cx = Math.floor(xx / 12) * 12 + 6, cy = row * 9 + 4.5; if ((xx - cx) ** 2 + ((y - cy) * 1.3) ** 2 < 4.2) return P.EP1;
    return P.EP2;
  }
  if (y < MW.pap) return z > 1.4 && Math.sin((y + 5 * Math.sin(x / 11)) * 0.9) > 0.88 ? P.CL2 : P.DM4;
  const v = Math.sin((y + 9 * Math.sin(x / 27) + 4 * Math.sin(x / 9 + y / 40)) * 0.39);
  if (v > 0.5) return z > 8 && Math.sin((y + 9 * Math.sin(x / 27)) * 3.1 + x * 0.05) > 0.7 ? P.CL2 : P.CL1;
  return v < -0.8 ? P.DM2 : P.DM3;
}
// ---------------------------------------------------------------- vessels, fibroblasts, resident cells, scattered ink
const PAPILLAE = (() => { const o = []; for (let x = -420; x <= 420; x += 68) o.push(x + 20); return o; })();
const FIBRO = (() => { const r = mulberry(77), o = []; for (let i = 0; i < 36; i++) o.push({ x: (r() - 0.5) * 760, y: 150 + r() * 560, a: (r() - 0.5) * 0.5, l: 20 + 9 * r() }); return o.filter(f => Math.hypot(f.x - AGG.x, f.y - AGG.y) > 40 && Math.abs(f.y - LYV.y) > 26); })();
const RBC = Array.from({ length: 30 }, (_, i) => ({ x0: -420 + i * 29 + 10 * hash(i + 90), dy: (hash(i + 91) - 0.5) * 4 }));
const RES = [[-128, 352], [96, 405], [-62, 470], [148, 520], [-205, 420], [210, 365], [40, 330]].map(([x, y], i) => ({ x, y, r: 7.5 + 1.5 * hash(i + 40), ink: 5 + Math.floor(hash(i + 41) * 4), seed: i * 13 + 5 }));
const BULK = (() => {
  const r = mulberry(4242), o = [];
  while (o.length < 150) {
    const x = (r() - 0.5) * 700, y = clamp(392 + gaussR(r) * 72, 240, 600);
    if (Math.hypot(x - AGG.x, y - AGG.y) < 44 || Math.hypot(x - (AGG.x - 30), y - (AGG.y + 18)) < 30 || Math.abs(y - LYV.y) < LYV.r + 8 || RES.some(c => Math.hypot(x - c.x, y - c.y) < c.r + 8)) continue;
    const n = 4 + Math.floor(r() * 7), dots = [];
    for (let k = 0; k < n; k++) dots.push({ dx: (r() - 0.5) * 8, dy: (r() - 0.5) * 7, r: 1.1 + r() * 1.6, sx: r() - 0.5, sy: r() - 0.5 });
    o.push({ x, y, dots, gone: r() < 0.5 ? EV.clear[Math.floor(r() * EV.clear.length)] : 99, toCell: r() < 0.35 });
  }
  return o;
})();
// how much of a scattered cluster is left after the weeks of clearance (1 = all)
const bulkLeft = (b, t) => 1 - smooth(seg(t, b.gone, b.gone + 0.25));
const fragK = t => smooth(seg(t, EV.split, EV.split + 1.0));                  // scattered clusters are fragmented by the same pulse
function drawVessels(cam, t) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // capillary loops in the papillae
  if (z < 4) for (const px of PAPILLAE) { const top = dejY(px) + 12; if (X(px) < -20 || X(px) > W + 20) continue; const pts = [px - 4, MW.pap, px - 5, top + 20, px - 3, top + 4, px, top, px + 3, top + 4, px + 5, top + 20, px + 4, MW.pap]; let q = null; for (let i = 0; i < pts.length; i += 2) { const a = X(pts[i]), b = Y(pts[i + 1]); if (q) lineW(q[0], q[1], a, b, Math.max(1, 2.6 * z), P.BL1); q = [a, b]; } }
  // a small blood vessel
  { const y0 = Y(BVS.y - BVS.r), y1 = Y(BVS.y + BVS.r); if (y1 > 0 && y0 < H) { rect(0, y0, W, y1, P.BL2); rect(0, y0, W, y0 + Math.max(1, 1.4 * z), P.BL1); rect(0, y1 - Math.max(1, 1.4 * z), W, y1, P.BL1);
    if (z > 1.5) for (const c of RBC) { const x = ((c.x0 + 26 * t + 420) % 840 + 840) % 840 - 420; ellipse(X(x), Y(BVS.y + c.dy), 3.4 * z, 2.2 * z, P.BL1); } } }
  // the lymphatic vessel: green walls of overlapping endothelial cells, pale lumen
  const ly0 = Y(LYV.y - LYV.r - LYV.wall), ly1 = Y(LYV.y + LYV.r + LYV.wall);
  if (ly1 > 0 && ly0 < H) {
    rect(0, ly0, W, ly1, P.LY1); rect(0, Y(LYV.y - LYV.r), W, Y(LYV.y + LYV.r), P.LY4);
    if (z > 1.2) for (let x = -440; x <= 440; x += 14) { const sx = X(x); if (sx < -30 || sx > W + 30) continue; line(sx, Y(LYV.y - LYV.r - LYV.wall), X(x + 9), Y(LYV.y - LYV.r), P.LY0); line(sx, Y(LYV.y + LYV.r), X(x + 9), Y(LYV.y + LYV.r + LYV.wall), P.LY0); }
    rect(0, ly0, W, ly0 + 1, P.LY0); rect(0, ly1 - 1, W, ly1, P.LY0);
  }
}
function drawFibro(cam) {
  const z = cam.z; if (z < 0.5) return;
  for (const f of FIBRO) { const x = cam.x(f.x), y = cam.y(f.y); if (x < -60 * z || x > W + 60 * z || y < -20 * z || y > H + 20 * z) continue; ellipse(x, y, f.l / 2 * z, 1.9 * z, P.FB1, undefined, f.a); ellipse(x, y, 3.6 * z, 1.2 * z, P.FB0, undefined, f.a); }
}
function inkDot(x, y, r, z) { disc(x, y, Math.max(0.7, r), P.PG0); if (r > 2.2) { disc(x - r * 0.3, y - r * 0.3, r * 0.32, P.PG2); } }
function drawBulk(cam, t, o) {
  const z = cam.z, fk = (o && o.noFrag) ? 0 : fragK(t);
  for (const b of BULK) {
    const left = bulkLeft(b, t); if (left <= 0) continue;
    const bx = cam.x(b.x), by = cam.y(b.y); if (bx < -20 * z - 10 || bx > W + 20 * z + 10 || by < -20 * z - 10 || by > H + 20 * z + 10) continue;
    const fade = left < 1 ? left : 1;
    for (const d of b.dots) {
      if (fade < 1 && hash(d.dx * 100 + d.dy) > fade) continue;
      if (fk <= 0) inkDot(bx + d.dx * z, by + d.dy * z, d.r * z, z);
      else for (let k = 0; k < 3; k++) { const a = k * 2.1 + d.sx * 3, s = fk * (1.2 + d.r * 0.6); inkDot(bx + (d.dx + Math.cos(a) * s) * z, by + (d.dy + Math.sin(a) * s) * z, d.r * (1 - 0.45 * fk) * z, z); }
    }
  }
}
// ---------------------------------------------------------------- the hero aggregate: particles, cracks, fragments
const AGP = (() => {
  const r = mulberry(1234), pts = []; let tries = 0;
  while (pts.length < 86 && tries < 9000) {
    tries++; const a = r() * TAU, d = 3.15 * Math.sqrt(r()), x = d * Math.cos(a) * 1.08, y = d * Math.sin(a) * 0.92, rad = 0.26 + 0.17 * r();
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) > (p.r + rad) * 0.84)) pts.push({ x, y, r: rad, rot: r() * TAU, nv: 5 + Math.floor(r() * 3), sh: [r(), r(), r(), r(), r(), r(), r()], jp: r() * TAU });
  }
  return pts;
})();
const CRACKS = EV.cracks.map((tc, k) => { const a = 0.45 + k * 0.8 + 0.18 * Math.sin(k * 7.1), c = [0.45 * Math.cos(k * 2.3), 0.35 * Math.sin(k * 1.7)]; return { t: tc, a, c, d: [Math.cos(a), Math.sin(a)], n: [-Math.sin(a), Math.cos(a)], ph: k * 1.9 }; });
const crackOff = (cr, s) => 0.22 * Math.sin(s * 2.9 + cr.ph) + 0.1 * Math.sin(s * 6.7 + 2 * cr.ph);
const crackSide = (cr, x, y) => { const px = x - cr.c[0], py = y - cr.c[1], s = px * cr.d[0] + py * cr.d[1], q = px * cr.n[0] + py * cr.n[1]; return q - crackOff(cr, s) > 0 ? 1 : -1; };
AGP.forEach(p => { p.side = CRACKS.map(cr => crackSide(cr, p.x, p.y)); p.frag = p.side.reduce((a, s, k) => a + (s > 0 ? 1 << k : 0), 0); });
// which photon (if any) each particle absorbs
const HIT_OF = AGP.map((p, i) => EV.hits.findIndex((h, k) => (k * 7) % AGP.length === i));
// the macrophage's path (relative to A) and the point where it will catch some fragments
const MAC_KEYS = [[EV.macro, -38, 23], [21.0, -29, 18.5], [22.5, -19, 13], [23.0, -17, 12], [48, -17, 12]];
const TP = [-7.4, 4.9];
const FRAGS = (() => {
  const ids = [...new Set(AGP.map(p => p.frag))], out = [];
  for (const id of ids) {
    const ps = AGP.filter(p => p.frag === id), cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length, L = Math.hypot(cx, cy);
    const dir = L > 0.35 ? [cx / L, cy / L] : [Math.cos(id * 2.4), Math.sin(id * 2.4)];
    out.push({ id, n: ps.length, cx, cy, dir, dist: 2.6 + 3.0 * hash(id + 300), rot: (hash(id + 301) - 0.5) * 1.3, target: false });
  }
  // the three fragments heading down-left are the ones the macrophage will take up
  const tdir = [-0.83, 0.55];
  out.filter(f => f.n >= 3).sort((a, b) => (b.dir[0] * tdir[0] + b.dir[1] * tdir[1]) - (a.dir[0] * tdir[0] + a.dir[1] * tdir[1])).slice(0, 3).forEach((f, k) => { f.target = true; f.tgt = [TP[0] + [-0.9, 0.9, 0.1][k], TP[1] + [0.5, 0.3, -0.9][k]]; });
  return out;
})();
const FRAG_BY_ID = {}; FRAGS.forEach(f => FRAG_BY_ID[f.id] = f);
// the macrophage centre (world) at time t
function macPos(t) { let i = 0; while (i + 1 < MAC_KEYS.length && t >= MAC_KEYS[i + 1][0]) i++; const a = MAC_KEYS[i], b = MAC_KEYS[Math.min(i + 1, MAC_KEYS.length - 1)]; const u = a === b ? 0 : smooth(clamp((t - a[0]) / (b[0] - a[0]), 0, 1)); return [AGG.x + lerp(a[1], b[1], u), AGG.y + lerp(a[2], b[2], u)]; }
// where the phagosome is (world) once the membrane has closed: it moves a little into the cell
function phagoPos(t) { const m = macPos(t), tp = [AGG.x + TP[0], AGG.y + TP[1]], k = 0.42 * smooth(seg(t, EV.close, EV.vesicle + 0.5)); return [lerp(tp[0], m[0], k), lerp(tp[1], m[1], k)]; }
// one fragment's transform at time t: offset (µm, relative to A) and rotation
function fragXform(f, t) {
  if (t < EV.split) return [0, 0, 0];
  const u = eout(clamp((t - EV.split) / 1.4, 0, 1)), drift = Math.max(0, Math.min(t, 28) - EV.split - 1.4) * 0.12;
  if (f.target) {
    const go = smooth(seg(t, EV.split, EV.split + 1.4)), base = [lerp(0, f.tgt[0] - f.cx, go), lerp(0, f.tgt[1] - f.cy, go)];
    if (t < EV.close) return [base[0], base[1], f.rot * u];
    // inside the vesicle: packed a little closer and carried with it
    const pp = phagoPos(t), tp = [AGG.x + TP[0], AGG.y + TP[1]], sq = 0.75;
    return [pp[0] - tp[0] + (f.tgt[0] - TP[0]) * sq + TP[0] - f.cx, pp[1] - tp[1] + (f.tgt[1] - TP[1]) * sq + TP[1] - f.cy, f.rot];
  }
  return [f.dir[0] * (f.dist * u + drift), f.dir[1] * (f.dist * u + drift), f.rot * u];
}
// the aggregate's absorbed energy (0..1): it rises with each photon and cools after the expansion
function aggEnergy(t) { let e = 0; for (const h of EV.hits) e += smooth(seg(t, h, h + 0.1)); e /= EV.hits.length; return e * (1 - 0.55 * smooth(seg(t, EV.expand + 0.2, EV.cracks[0]))) * (1 - smooth(seg(t, EV.split, EV.split + 2))); }
const aggScale = t => 1 + 0.1 * eout(seg(t, EV.expand, EV.expand + 0.08)) - 0.05 * smooth(seg(t, EV.expand + 0.08, EV.expand + 0.6));
// o: { pigT (time used for the pigment's own state), detail }
function drawAggregate(cam, t, o) {
  o = o || {};
  const pt = o.pigT === undefined ? t : o.pigT, z = cam.z, E = aggEnergy(pt), sc = aggScale(pt), X = v => cam.x(v), Y = v => cam.y(v);
  const ax = X(AGG.x), ay = Y(AGG.y); if (ax < -60 * z - 20 || ax > W + 60 * z + 20 || ay < -60 * z - 20 || ay > H + 60 * z + 20) return;
  if (E > 0.02 && pt < EV.split + 1) glow(ax, ay, 5.2 * z, P.HT2, null, 0.22 * E);
  const hitNow = EV.hits.map(h => pulse(pt, h, 0.18));
  AGP.forEach((p, i) => {
    const f = FRAG_BY_ID[p.frag], [fx, fy, fr] = fragXform(f, pt);
    if (f.target && pt >= EV.close && o.noInside) return;
    // before the split, each crack opens a small gap between the two sides
    let gx = 0, gy = 0;
    if (pt < EV.split + 0.01) CRACKS.forEach((cr, k) => { if (pt >= cr.t) { const g = 0.075 * smooth(seg(pt, cr.t, cr.t + 0.08)); gx += cr.n[0] * p.side[k] * g; gy += cr.n[1] * p.side[k] * g; } });
    const ca = Math.cos(fr), sa = Math.sin(fr), lx = (p.x - f.cx) * ca - (p.y - f.cy) * sa + f.cx, ly = (p.x - f.cx) * sa + (p.y - f.cy) * ca + f.cy;
    const jit = 0.085 * E, jx = jit * Math.sin(pt * 47 + p.jp), jy = jit * Math.cos(pt * 53 + p.jp * 1.7);
    const wx = AGG.x + (lx * sc + gx + fx + jx), wy = AGG.y + (ly * sc + gy + fy + jy), sx = X(wx), sy = Y(wy), rr = p.r * z;
    if (rr < 1.6) { disc(sx, sy, Math.max(0.8, rr * 1.15), P.PG0); return; }
    const pts = []; for (let k = 0; k < p.nv; k++) { const a = p.rot + fr + k * TAU / p.nv, q = p.r * (0.8 + 0.32 * p.sh[k]); pts.push(X(wx + Math.cos(a) * q), Y(wy + Math.sin(a) * q)); }
    const m = maskPoly(pts); mFill(m, P.PG1);
    const warm = Math.min(1, (HIT_OF[i] >= 0 ? hitNow[HIT_OF[i]] : 0) + E * 0.45);
    mRim(m, warm > 0.15 ? mixc(P.PG3, P.HT3, warm) : P.PG3, -1, -1); mOutline(m, P.PG0);
  });
  // a crack shows bright for a few frames as it runs through
  if (pt < EV.split + 0.1) for (const cr of CRACKS) {
    const age = pt - cr.t; if (age < 0 || age > 0.16) continue;
    const L = 3.6 * sc, u = Math.min(1, age / 0.05); let q = null;
    for (let s = -L; s <= -L + 2 * L * u + 1e-6; s += 0.12) { const off = crackOff(cr, s), wx = AGG.x + cr.c[0] + cr.d[0] * s + cr.n[0] * off, wy = AGG.y + cr.c[1] + cr.d[1] * s + cr.n[1] * off; const a = [X(wx), Y(wy)]; if (q) lineW(q[0], q[1], a[0], a[1], Math.max(1, 0.09 * z), age < 0.08 ? P.PR : P.DM5); q = a; }
  }
}
// gas bubbles around the aggregate (the frosting, at the scale of the ink)
const BUBBLES = EV.bubbles.flatMap((tb, e) => [0, 1].map(k => { const a = e * 2.3 + k * 3.1 + 0.4 * hash(e * 3 + k), d = 3.8 + 0.7 * hash(e * 3 + k + 50); return { t: tb, x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9, r: 0.22 + 0.26 * hash(e * 3 + k + 60) }; }));
function drawBubbles(cam, t) {
  const z = cam.z; if (t < EV.bubbles[0] || t > 19.5 || z < 2) return;
  for (const b of BUBBLES) {
    const g = smooth(seg(t, b.t, b.t + 0.16)) * (1 - smooth(seg(t, 17.0, 19.0))); if (g <= 0) continue;
    const out = 1 + 0.35 * smooth(seg(t, EV.split, EV.split + 1.5)), x = cam.x(AGG.x + b.x * out), y = cam.y(AGG.y + b.y * out), r = b.r * g * z;
    disc(x, y, r + 1, P.BB0); disc(x, y, r, P.BB1); disc(x - r * 0.35, y - r * 0.35, Math.max(0.6, r * 0.25), P.BB2);
  }
}
// the pressure wave from the expansion (and the tissue ripple it causes: see microWorld)
const pressR = t => 3.4 + 14 * Math.pow(seg(t, EV.expand, EV.expand + 1.4), 0.7);
const pressA = t => t < EV.expand ? 0 : 1 - seg(t, EV.expand, EV.expand + 1.4);
// photons (educational colour): S06 crossing the skin, S07 arriving at the aggregate
const SCAT_I = [2, 7, 12];
const PH6 = Array.from({ length: 16 }, (_, i) => ({ x: -66 + (i % 8) * 18 + 6 * hash(i + 700), t0: EV.micro + 0.06 * i, sc: SCAT_I.indexOf(i) >= 0 ? EV.scatter[SCAT_I.indexOf(i)] : 0, ang: (i % 2 ? 1 : -1) * (0.9 + 0.5 * hash(i + 701)) }));
// one photon as a short wave packet (length L, amplitude amp, in µm), head bright
function photonShape(cam, x, y, dx, dy, L, amp, a) {
  const n = 18; let q = null;
  for (let k = 0; k <= n; k++) { const s = -L + L * k / n, env = Math.sin(Math.PI * k / n), wv = amp * env * Math.sin(k / n * TAU * 2.5 - a * 14), px = x + dx * s - dy * wv, py = y + dy * s + dx * wv; const sp = [cam.x(px), cam.y(py)]; if (q) lineW(q[0], q[1], sp[0], sp[1], 1.6, k > n - 5 ? P.LZ3 : P.LZ2); q = sp; }
}
function drawPhotons(cam, t) {
  const z = cam.z;
  if (t >= EV.micro && t < 8.3) {
    // the faint beam column
    const k = smooth(seg(t, EV.micro, EV.micro + 0.15)) * (1 - smooth(seg(t, 7.9, 8.3)));
    tintRect(cam.x(-74), cam.y(-30), cam.x(74), cam.y(AGG.y + 6), P.LZ1, 0.13 * k);
    for (const p of PH6) {
      const age = t - p.t0; if (age < 0) continue;
      let x = p.x * (1 - Math.min(1, age * 0.25)), y = -30 + 240 * age, dx = 0, dy = 1;
      if (p.sc && t > p.sc) { const as = t - p.sc, ys = -30 + 240 * (p.sc - p.t0); dx = Math.sin(p.ang); dy = Math.cos(p.ang); x = p.x * (1 - Math.min(1, (p.sc - p.t0) * 0.25)) + dx * 240 * as; y = ys + dy * 240 * as; if (as > 0.45) continue; }
      if (y > AGG.y - 4) continue;
      photonShape(cam, x, y, dx, dy, 16, 2.4, t);
    }
  }
  if (t >= EV.hits[0] - 0.4 && t < EV.hits[EV.hits.length - 1] + 0.05) {
    // each absorbed photon flies in to one particle and is gone on its hit frame
    EV.hits.forEach((h, k) => {
      const age = t - (h - 0.36); if (age < 0 || t >= h) return;
      const p = AGP[(k * 7) % AGP.length], tx = AGG.x + p.x, ty = AGG.y + p.y, sx = tx + (k % 2 ? 1 : -1) * 3, sy = ty - 16, u = age / 0.36;
      const x = lerp(sx, tx, u), y = lerp(sy, ty, u), L = Math.hypot(tx - sx, ty - sy);
      photonShape(cam, x, y, (tx - sx) / L, (ty - sy) / L, 2.4, 0.4, t);
    });
  }
}
// ---------------------------------------------------------------- small fragments near the lymphatic vessel
// three slip in through gaps between the wall's overlapping cells (one per event) and are carried along; the rest stay
const LFR = [[-24, 424, 0], [4, 427, 1], [52, 422, 2], [-52, 430, -1], [80, 431, -1], [28, 418, -1]].map(([x, y, e], i) => ({ x, y, e, gx: [-16, 10, 46][e] || 0, seed: i * 17 + 3 }));
function lfrPos(f, t) {
  if (f.e < 0) return [f.x + 1.2 * Math.sin(t * 0.8 + f.seed), f.y + 0.8 * Math.cos(t + f.seed), 1];
  const te = EV.enter[f.e], gy = LYV.y - LYV.r - LYV.wall / 2;
  if (t < te - 0.5) return [f.x + 1.2 * Math.sin(t * 0.8 + f.seed), f.y, 1];
  if (t < te) { const u = smooth(seg(t, te - 0.5, te)); return [lerp(f.x, f.gx, u), lerp(f.y, gy, u), 1]; }
  if (t < te + 0.25) { const u = smooth(seg(t, te, te + 0.25)); return [f.gx, lerp(gy, LYV.y - 4 + f.e * 3, u), 1]; }
  return [f.gx + 15 * (t - te - 0.25), LYV.y - 4 + f.e * 3, 1];
}
function drawLymphFrags(cam, t) {
  const z = cam.z; if (t < 24 || t > 33.5) return;
  for (const f of LFR) {
    const [x, y] = lfrPos(f, t), sx = cam.x(x), sy = cam.y(y); if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + f.seed, d = 0.6 + 0.5 * hash(f.seed + k); inkDot(sx + Math.cos(a) * d * z, sy + Math.sin(a) * d * z, (0.32 + 0.2 * hash(f.seed + k + 5)) * z, z); }
  }
  // the flap of the wall swings open for each entry
  for (const f of LFR) {
    if (f.e < 0) continue; const te = EV.enter[f.e], g = Math.sin(Math.PI * clamp((t - te + 0.35) / 0.8, 0, 1)); if (g <= 0) continue;
    const x0 = cam.x(f.gx - 2.2 * g), x1 = cam.x(f.gx + 2.2 * g); rect(x0, cam.y(LYV.y - LYV.r - LYV.wall), x1, cam.y(LYV.y - LYV.r), P.LY3);
  }
}
// ---------------------------------------------------------------- the whole micro picture
// o: { pigT, noFx, noFrag }
function microWorld(cam, t, o) {
  o = o || {};
  const z = cam.z, pr = pressA(t), R = pressR(t);
  for (let sy = 0; sy < H; sy++) {
    const wy0 = cam.wy(sy + 0.5), row = sy * W;
    for (let sx = 0; sx < W; sx++) {
      let wx = cam.wx(sx + 0.5), wy = wy0;
      if (pr > 0 && !o.noFx) { const dx = wx - AGG.x, dy = wy - AGG.y, r = Math.hypot(dx, dy) || 1, dd = 0.9 * Math.exp(-(((r - R) / 1.6) ** 2)) * pr; wx -= dx / r * dd; wy -= dy / r * dd; }
      buf[row + sx] = tissue(wx, wy, z);
    }
  }
  drawVessels(cam, t);
  drawLymphFrags(cam, t);
  drawFibro(cam);
  drawResident(cam, t);
  drawBulk(cam, t, o);
  if (o.cells !== false) drawMacrophages(cam, t, o);
  drawAggregate(cam, t, o);
  if (!o.noFx) {
    drawBubbles(cam, t);
    if (pr > 0) { const rr = R * z; ring(cam.x(AGG.x), cam.y(AGG.y), rr, Math.max(1.2, 0.35 * z), mixc(P.DM4, P.PR, pr)); }
    drawPhotons(cam, t);
  }
}
