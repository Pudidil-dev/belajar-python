'use strict';
// ============================================================================
// INSIDE THE CRYSTAL (panels 12, 13, 14): a rock-salt lattice of large iodide
// and small sodium ions with a few thallium activator sites. The gamma photon
// is absorbed by an iodide ion (photoelectric effect); the ejected electron
// zigzags through the lattice leaving excited sites behind; the energy reaches
// Tl+ centres, which relax by emitting many blue-white optical photons.
// World units: 1 = 1 px at zoom 1; the interaction point is the origin, y down.
// ============================================================================
const LAT = { S: 44 };
// site kind at lattice index (i, j): 'I' (iodide), 'Na', or 'Tl' (activator on a Na site)
const TL_SITES = [[1, -1], [3, -3], [5, -2], [2, -5], [6, -5], [-3, 2], [8, -1], [-5, -3], [4, 2]];
function siteKind(i, j) {
  if ((i + j) % 2 === 0) return 'I';
  for (const s of TL_SITES) if (s[0] === i && s[1] === j) return 'Tl';
  return 'Na';
}
// the photoelectron's track: multiple-scattering zigzag from the origin, slowing down
const TRACK = (function () {
  const pts = [0, 0]; let x = 0, y = 0, a = -0.95;
  const turns = [0.42, -0.5, 0.35, -0.28, 0.6, -0.45, 0.22, -0.7, 0.5, -0.35, 0.9, -0.8];
  turns.forEach((d, k) => { const L = 30 - k * 1.6; for (let s = 0; s < 6; s++) { a += d / 6; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; pts.push(x, y); } });
  return new Path(pts);
})();
// electron position along the track for progress u (0..1), slowing as it loses energy
function trackPos(u) { return TRACK.at(TRACK.L * (1 - Math.pow(1 - clamp(u, 0, 1), 1.7))); }
// lattice sites touched by the track (excitation markers), ordered by arrival
const EXC = (function () {
  const out = [];
  for (let s = 0; s < TRACK.L; s += 9) {
    const q = TRACK.at(s), i = Math.round(q[0] / LAT.S), j = Math.round(q[1] / LAT.S);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const ii = i + di, jj = j + dj, d = Math.hypot(ii * LAT.S - q[0], jj * LAT.S - q[1]);
      if (d < LAT.S * 0.62 && !out.some(e => e.i === ii && e.j === jj) && !(ii === 0 && jj === 0)) out.push({ i: ii, j: jj, s, k: hash2(ii * 13 + 5, jj * 7 + 3) });
    }
  }
  return out;
})();
// tiny ionisation sparks between sites (the electron knocks loose bound electrons)
const SPARK = (function () { const o = []; for (let s = 14; s < TRACK.L; s += 17) { const q = TRACK.at(s), n = TRACK.tan(s); const side = (o.length % 2 ? 1 : -1) * (6 + 6 * hash(o.length + 77)); o.push({ x: q[0] - n[1] * side, y: q[1] + n[0] * side, s }); } return o; })();
// ---------------------------------------------------------------- background: crystal mosaic
function latticeBG(cam, t) {
  rect(0, 0, W, H, P.CR0);
  const B = 6;
  for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) {
    const wx = cam.wx(x) / 26, wy = cam.wy(y) / 26, n = vn2(wx, wy, 31) * 0.7 + vn2(wx * 2.3, wy * 2.3, 32) * 0.3;
    if (n > 0.62) rect(x, y, x + B, y + B, P.N4);
    else if (n > 0.5) rect(x, y, x + B, y + B, P.N3);
    else if (n < 0.28) rect(x, y, x + B, y + B, P.K0, 0.5);
  }
  // a second, deeper plane of ions (rock-salt stacking), dim
  const S = LAT.S, z = cam.z;
  const i0 = Math.floor(cam.wx(-40) / S) - 1, i1 = Math.ceil(cam.wx(W + 40) / S), j0 = Math.floor(cam.wy(-40) / S) - 1, j1 = Math.ceil(cam.wy(H + 40) / S);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const x = cam.x(i * S + S / 2), y = cam.y(j * S + S / 2), big = (i + j) % 2 !== 0;
    const r = (big ? 13 : 7) * z; if (r < 1) continue;
    disc(x, y, r, P.CR1, 0.55); ring(x, y, r, 1, P.N5, 0.5);
  }
}
// one ion as a glassy bubble (panel 13/14 look)
function ionSprite(x, y, r, kind, lit) {
  if (r < 1.2) { pset(x, y, P.CR3); return; }
  const ramp = kind === 'Tl' ? [P.C6, P.LT3, P.CR4, P.CR3, P.CR2, P.CR1]
    : kind === 'I' ? [P.CR4, P.CR3, P.CR2, P.CR1, P.CR1, P.CR0] : [P.LT2, P.CR4, P.CR3, P.CR2, P.CR1, P.CR0];
  const m = maskDisc(x, y, r);
  organShade(m, x, y, r, r, ramp, -0.5, -0.6);
  mOutline(m, kind === 'I' ? P.CR3 : P.CR4);
  disc(x - r * 0.36, y - r * 0.38, Math.max(1, r * 0.26), kind === 'I' ? P.LT2 : P.C6);
  if (r > 9) rect(x + r * 0.25, y + r * 0.35, x + r * 0.25 + Math.max(1, r * 0.18), y + r * 0.35 + 1, P.CR4);
  if (kind === 'Tl') ring(x, y, r + 2.5, 1, P.LT2, 0.7);
  if (lit > 0) glow(x, y, r * (1.6 + lit), P.LT1, P.LT2, lit);
}
// o.ex(i, j) -> excitation 0..1 (orange markers); o.tl(i, j) -> Tl glow 0..1; o.hide(i, j) skip a site
function drawLattice(cam, t, o) {
  o = o || {};
  latticeBG(cam, t);
  const S = LAT.S, z = cam.z;
  const i0 = Math.floor(cam.wx(-40) / S) - 1, i1 = Math.ceil(cam.wx(W + 40) / S) + 1, j0 = Math.floor(cam.wy(-40) / S) - 1, j1 = Math.ceil(cam.wy(H + 40) / S) + 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (o.hide && o.hide(i, j)) continue;
    const kind = siteKind(i, j), jig = 1.1;
    const x = cam.x(i * S + jig * Math.sin(t * 2.1 + i * 1.3 + j * 0.7)), y = cam.y(j * S + jig * Math.cos(t * 2.4 + i * 0.9 + j * 1.7));
    const r = (kind === 'I' ? 17 : kind === 'Tl' ? 12 : 9) * z;
    if (x < -r - 4 || x > W + r + 4 || y < -r - 4 || y > H + r + 4) continue;
    ionSprite(x, y, r, kind, o.tl ? o.tl(i, j) : 0);
  }
  if (o.dim) rect(0, 0, W, H, P.K0, o.dim);
  if (o.ex) drawExcitations(cam, t, o.ex);
}
// excited sites along the electron track: orange square markers with a soft glow (drawn over the dimmed lattice)
function drawExcitations(cam, t, exFn) {
  const S = LAT.S, z = cam.z;
  for (const e of EXC) {
    const ex = exFn(e.i, e.j); if (ex <= 0.02) continue;
    const x = cam.x(e.i * S + 1.1 * Math.sin(t * 2.1 + e.i * 1.3 + e.j * 0.7)), y = cam.y(e.j * S + 1.1 * Math.cos(t * 2.4 + e.i * 0.9 + e.j * 1.7));
    const s = Math.max(2, Math.round(5.5 * z * (0.6 + 0.4 * ex)));
    glow(x, y, 18 * z * ex, P.OR1, P.OR2, ex * 0.9);
    rect(x - s - 1, y - s - 1, x + s + 1, y + s + 1, P.OR0);
    rect(x - s, y - s, x + s, y + s, ex > 0.55 ? P.OR3 : P.OR2); rect(x - s, y - s, x + s - 1, y - s + 1, P.OR5); rect(x - s, y - s, x - s + 1, y + s - 1, P.OR4);
  }
}
// the track drawn so far (white dotted wiggle behind the electron)
function drawTrack(cam, u, t, fade) {
  fade = fade === undefined ? 1 : fade;
  if (fade <= 0) return;
  const sEnd = TRACK.L * (1 - Math.pow(1 - clamp(u, 0, 1), 1.7)), z = cam.z;
  const pts = TRACK.sub(0, sEnd, 2).map((v, i) => i % 2 ? cam.y(v) : cam.x(v));
  for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], Math.max(2, 4 * z), P.LT0, 0.5 * fade);
  let k = 0;
  for (let i = 0; i + 3 < pts.length; i += 2, k++) {
    if ((k >> 1) % 2) continue;                     // dashed white core
    lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], Math.max(1, 1.6 * z), fade > 0.5 ? P.C6 : P.LT2);
  }
}
// the photoelectric absorption: photon arrives along -y to the origin, the iodide flashes, the electron leaves.
// k: 0 photon far .. 1 at the ion; f: flash 0..1
function photoelectricFlash(cam, f) {
  if (f <= 0) return;
  const x = cam.x(0), y = cam.y(0), z = cam.z;
  disc(x, y, 30 * z * f, P.GA2, 0.3 * f); disc(x, y, 18 * z * f, P.GA3, 0.6 * f); disc(x, y, 9 * z * (0.5 + f), P.GA4); disc(x, y, 4 * z, P.C6);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + 0.3, L = (i % 2 ? 26 : 40) * z * f; line(x + Math.cos(a) * 6 * z, y + Math.sin(a) * 6 * z, x + Math.cos(a) * L, y + Math.sin(a) * L, i % 2 ? P.GA3 : P.GA4); }
}
// scintillation: optical photons as arrowed rays from (x, y); k 0..1 expansion, n rays, seed
function lightBurst(x, y, k, n, seed, R, opt) {
  opt = opt || {};
  if (k <= 0) return;
  const core = Math.max(0, 1 - k * 1.1), cr = Math.min(R * 0.1, 16);
  if (core > 0) { disc(x, y, cr * 4 * (0.5 + core), P.LT0, 0.3 * core); disc(x, y, cr * 2.2 * (0.5 + core), P.LT1, 0.55 * core); disc(x, y, cr * (0.6 + 0.6 * core), P.LT3); disc(x, y, cr * 0.55, P.C6); }
  for (let i = 0; i < n; i++) {
    const a = (i + hash(seed + i) * 0.7) * TAU / n, sp = 0.65 + 0.5 * hash(seed + i + 50), d = R * k * sp, L = Math.min(d, R * (0.28 + 0.2 * hash(seed + i + 90)));
    const ca = Math.cos(a), sa = Math.sin(a), hx = x + ca * d, hy = y + sa * d;
    const fade = opt.fade === false ? 1 : clamp(1.6 - k, 0, 1);
    if (fade <= 0) continue;
    lineW(hx - ca * L, hy - sa * L, hx, hy, 3, P.LT1, 0.45);
    for (let s = 0; s < L; s += 2) pset(hx - ca * s, hy - sa * s, s < L * 0.35 ? P.C6 : s < L * 0.7 ? P.LT2 : P.LT1);
    line(hx - ca * L * 0.45, hy - sa * L * 0.45, hx, hy, P.LT3);
    arrowHead(hx + ca * 2, hy + sa * 2, a, 5, P.LT3);
  }
}
