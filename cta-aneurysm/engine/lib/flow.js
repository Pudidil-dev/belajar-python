// FLOW — the flat side cutaway of the parent artery at the aneurysm (S02, S19): the right M1 comes in from the right,
// splits at the bifurcation into the superior trunk (up) and the inferior trunk (down-left), and the saccular aneurysm
// bulges from the bifurcation toward the left — the same arrangement as the 3D network at the end of S01. A 2D signed
// distance field gives the lumen (plasma), the wall layers (intima, media, adventitia; the dome's wall is thinner and has
// no media) and the brain tissue around it. Blood cells ride fixed streamlines (deterministic in time): most go straight
// on into a branch, a few swirl through the sac and leave again. FLOW.contrast(t) adds the iodine: violet molecules on
// the same streamlines and a violet tint of the plasma behind the bolus front, the sac filling through its neck.
(() => {
const { W, H, P } = PIX;
const FLOW = window.FLOW = { NAME: 'FLOW' };
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
// geometry (screen px): centrelines with radii
const B = [196, 336];                                                // the bifurcation
const PAR = [[430, 380, 31], [350, 372, 31], [280, 356, 30.5], [228, 344, 30], B.concat(29)];
const SUP = [B.concat(27), [166, 270, 25], [134, 198, 24], [104, 120, 23], [80, 30, 22], [66, -40, 22]];
const INF = [B.concat(27), [168, 404, 25], [140, 478, 24], [114, 560, 23], [96, 650, 22], [90, 720, 22]];
const DOME = { x: 104, y: 336, r: 46 }, NECK = { x0: 170, y0: 336, x1: 140, y1: 336, r: 23 };
FLOW.B = B; FLOW.DOME = DOME;
const capD = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2);
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) - lerp(a[2], b[2], t);
};
const chainD = (x, y, pts) => { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, capD(x, y, pts[i - 1], pts[i])); return d; };
const smin = (a, b, k) => { const hh = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - hh * hh * k * 0.25; };
FLOW.sd = (x, y) => {
  let d = smin(chainD(x, y, PAR), chainD(x, y, SUP), 14);
  d = smin(d, chainD(x, y, INF), 14);
  const sac = smin(Math.hypot(x - DOME.x, y - DOME.y) - DOME.r, capD(x, y, [NECK.x0, NECK.y0, NECK.r], [NECK.x1, NECK.y1, NECK.r * 1.05]), 10);
  return { d: smin(d, sac, 8), sac: sac < d + 2 ? 1 : 0, dome: Math.hypot(x - DOME.x, y - DOME.y) / DOME.r };
};
// ---------- static layer: tissue, wall layers, plasma — built once ----------
let BASE = null, LUM = null, SACM = null;
const rgb = k => PIX.hex(P[k]);
FLOW.init = () => {
  BASE = new Uint8ClampedArray(W * H * 4); LUM = new Float32Array(W * H); SACM = new Uint8Array(W * H);
  const cTis = [rgb('n0'), rgb('n1'), rgb('n2')], cAdv = rgb('p1'), cMed = rgb('p2'), cInt = rgb('p3'), cPl = [rgb('d0'), rgb('d1')], cRim = rgb('k');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = FLOW.sd(x + 0.5, y + 0.5), p = y * W + x, i = p * 4, b = K.BAY(x, y);
    LUM[p] = q.d; SACM[p] = q.sac;
    // the wall is ~11 px round the artery and thins to ~5 px (no media) over the dome
    const thin = q.sac ? clamp((q.dome - 0.55) / 0.35) : 0, wInt = 2, wMed = lerp(6, 0, thin), wAdv = lerp(4, 4, thin);
    let col;
    if (q.d < 0) col = cPl[(-q.d / 26 + b * 0.5) > 0.6 ? 1 : 0];
    else if (q.d < wInt) col = cInt;
    else if (q.d < wInt + wMed) col = cMed;
    else if (q.d < wInt + wMed + wAdv) col = cAdv;
    else if (q.d < wInt + wMed + wAdv + 1) col = cRim;
    else { const n = K.fbm(x * 0.02, y * 0.02, 7, 3), far = clamp((q.d - 12) / 60); col = cTis[n + b * 0.22 > 0.86 - 0.1 * far ? 2 : n * 0.6 + b * 0.5 > 0.62 ? 1 : 0]; }
    BASE[i] = col[0]; BASE[i + 1] = col[1]; BASE[i + 2] = col[2]; BASE[i + 3] = 255;
  }
  buildPaths();
};
// ---------- streamlines ----------
// parametrize a centreline polyline; a cell rides it at a lateral offset (fraction of the radius)
const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const at = (pts, d) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) { const q = clamp(d / l); return [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2] ?? 0, b[2] ?? 0, q), (b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
    d -= l;
  }
};
const PATHS = [];
function buildPaths() {
  PATHS.length = 0;
  const branchPts = (br, off) => PAR.slice(0, -1).concat(br).map(p => p.slice());
  for (let k = 0; k < 64; k++) {
    const off = (h(k, 1) - 0.5) * 1.5, sup = h(k, 2) < 0.5, visit = k % 9 === 4;
    let pts;
    if (!visit) {
      const base = branchPts(sup ? SUP : INF);
      pts = []; const L = polyLen(base);
      for (let d = 0; d <= L; d += 4) { const [x, y, r, tx, ty] = at(base, d); pts.push([x - ty * off * r * 0.9 * 0.62, y + tx * off * r * 0.9 * 0.62]); }
    } else {
      // a sac visitor: along the parent artery, through the neck, one loop round the dome, back out into a branch
      pts = [];
      const base = PAR.slice(0, -1);
      const L = polyLen(base);
      for (let d = 0; d <= L; d += 4) { const [x, y, r, tx, ty] = at(base, d); pts.push([x - ty * off * r * 0.5, y + tx * off * r * 0.5]); }
      const rr = DOME.r * (0.45 + 0.3 * h(k, 3));
      for (let a = 0; a <= 1; a += 0.02) {
        const an = -0.15 * TAU + a * TAU * 1.0;
        pts.push([lerp(B[0] - 10, DOME.x + Math.cos(an + Math.PI) * rr, MO.smooth(clamp(a * 4))), lerp(B[1] + 6, DOME.y + Math.sin(an + Math.PI) * rr, MO.smooth(clamp(a * 4)))]);
      }
      const out = sup ? SUP : INF;
      for (let d = 0; d <= polyLen(out); d += 4) { const [x, y] = at(out, d); pts.push([x, y]); }
    }
    // resample to equal arc length (4 px)
    const L = polyLen(pts.map(p => p.concat(0)));
    PATHS.push({ pts, L, ph: h(k, 4), v: 150 + 60 * h(k, 5) * (visit ? 0.7 : 1), visit, kind: h(k, 6) });
  }
}
const atPath = (P_, d) => { const pts = P_.pts; let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + l >= d) { const q = (d - acc) / l; return [lerp(a[0], b[0], q), lerp(a[1], b[1], q), (b[0] - a[0]) / l, (b[1] - a[1]) / l]; } acc += l; } return null; };
// ---------- sprites ----------
// a red blood cell seen at an angle: biconcave disc (rim lighter, centre darker), width w, tilt from the travel direction
const rbc = (c, x, y, ang, w, tilt) => {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(ang);
  const a = w, b = Math.max(1.5, w * (0.35 + 0.65 * Math.abs(Math.cos(tilt))));
  c.fillStyle = P.d1; c.beginPath(); c.ellipse(0.6, 0.6, a, b, 0, 0, TAU); c.fill();
  c.fillStyle = P.d3; c.beginPath(); c.ellipse(0, 0, a, b, 0, 0, TAU); c.fill();
  c.fillStyle = P.d2; c.beginPath(); c.ellipse(0.3, 0.3, a * 0.5, b * 0.45, 0, 0, TAU); c.fill();
  c.fillStyle = P.d4; c.fillRect(-Math.round(a * 0.6), -Math.round(b * 0.7), Math.max(1, Math.round(a * 0.5)), 1);
  c.restore();
};
// an iodinated contrast molecule: violet ring body with three white iodine nodes (shape carries the identity, not only colour)
FLOW.mol = (c, x, y, ang, s = 1) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const X = Math.round(x), Y = Math.round(y), r = Math.max(2, Math.round(3 * s));
  c.fillStyle = P.v0; c.beginPath(); c.arc(X + 0.5, Y + 0.5, r + 1.2, 0, TAU); c.fill();
  c.fillStyle = P.v2; c.beginPath(); c.arc(X + 0.5, Y + 0.5, r, 0, TAU); c.fill();
  c.fillStyle = P.v1; c.fillRect(X, Y, 1, 1);
  for (let k = 0; k < 3; k++) { const an = ang + k * TAU / 3; c.fillStyle = P.w; c.fillRect(Math.round(X + Math.cos(an) * (r + 1.5 * s)), Math.round(Y + Math.sin(an) * (r + 1.5 * s)), Math.max(1, Math.round(s * 1.4)), Math.max(1, Math.round(s * 1.4))); }
  c.restore();
};
// ---------- draw ----------
// o = {t, contrast: fn(t, path, d) → 0..1 per molecule (null = none), tint: 0..1 plasma tint behind the front, front(x, y) → 0..1,
//      outline: 0..1 (amber? no: a pale lumen outline at the end of S19), cells: 0..1}
FLOW.draw = (c, o) => {
  const t = o.t, img = c.getImageData(0, 0, W, H), d = img.data;
  d.set(BASE);
  // plasma tint where the contrast has arrived (dithered violet over the dark plasma)
  if (o.front) {
    const v1 = rgb('v0'), v2 = rgb('v1');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (LUM[p] >= 0) continue;
      const f = o.front(x, y, SACM[p]); if (f <= 0) continue;
      const b = K.BAY(x, y); if (f < b) continue;
      const col = (-LUM[p] / 26 + b * 0.5) > 0.6 ? v2 : v1, i = p * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
  }
  if (o.outline > 0) {
    const oc = rgb('v3');
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x; if (LUM[p] >= 0 || LUM[p] < -1.6) continue;
      if (K.BAY(x, y) > o.outline) continue;
      const i = p * 4; d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2];
    }
  }
  c.putImageData(img, 0, 0);
  // the flow: blood cells (and, with contrast, molecules between them)
  c.save(); c.beginPath(); for (let y = 0; y < H; y += 1) {} c.restore();
  const n = Math.round(PATHS.length * (o.cells ?? 1));
  for (let k = 0; k < n; k++) {
    const P_ = PATHS[k], dd = K.wrap(t * P_.v + P_.ph * P_.L, P_.L), q = atPath(P_, dd);
    if (!q) continue;
    const [x, y, tx, ty] = q;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    rbc(c, x, y, Math.atan2(ty, tx), 5 + 2 * P_.kind, t * (1.5 + P_.kind * 2) + k);
  }
  if (o.contrast) {
    for (let k = 0; k < PATHS.length; k++) {
      for (let j = 0; j < 2; j++) {
        const P_ = PATHS[k], ph = K.wrap(P_.ph + 0.37 + j * 0.5, 1), dd = K.wrap(t * P_.v + ph * P_.L, P_.L), q = atPath(P_, dd);
        if (!q) continue;
        const [x, y] = q, a = o.contrast(t, x, y, P_, dd);
        if (a <= 0 || h(k * 7 + j, 77) > a) continue;
        FLOW.mol(c, x, y, t * 3 + k, 1);
      }
    }
  }
};
FLOW.lumenAt = (x, y) => LUM ? LUM[Math.round(y) * W + Math.round(x)] : 1;
})();
