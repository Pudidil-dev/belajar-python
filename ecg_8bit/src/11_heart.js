'use strict';
// ============================================================================
// THE HEART (heart-map units: 1 unit = 1 px at z = 1, origin at the heart's
// centre; the patient's left is the viewer's right, so the apex points down to
// the right). A frontal four-chamber cut: right and left atria above the
// fibrous AV ring (which insulates them from the ventricles), right and left
// ventricles below with the septum between them, the superior vena cava and the
// aortic arch on top. The conduction system: the SA node (yellow) where the
// vena cava meets the right atrium, the AV node (orange) at the bottom of the
// atrial septum, the His bundle through the ring, the right and left bundle
// branches down the septum and the Purkinje network along the ventricle walls
// (cyan). Every muscle pixel has an activation time (ms after the P onset):
// the atria fill from the SA node outward, the ventricles from the Purkinje
// endings outward; ventricular recovery runs the other way round (last
// activated, first recovered), which keeps the T wave upright. Mechanical
// contraction follows activation.
// ============================================================================
const HG = { x0: -160, y0: -244, w: 320, h: 424 };
const R_OUT = 0, R_AMY = 1, R_VMY = 2, R_RA = 3, R_LA = 4, R_RV = 5, R_LV = 6, R_RING = 7, R_SVC = 8, R_AO = 9;
const HREG = new Uint8Array(HG.w * HG.h), HACT = new Float32Array(HG.w * HG.h).fill(1e9), HREP = new Float32Array(HG.w * HG.h).fill(1e9), HSHD = new Uint8Array(HG.w * HG.h);
const ringY = x => -30 - 22 * (x + 150) / 290;
function ellV(x, y, cx, cy, rx, ry, rot) { const c = Math.cos(rot || 0), s = Math.sin(rot || 0), dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return u * u + v * v; }
// conduction pathways (heart units) with their activation window (ms)
const SA_NODE = [-92, -134, 11, 6], AV_NODE = [-6, -49, 10, 6];
const PATHS = [
  { id: 'HIS', pts: [-4, -44, -1, -32, 2, -20], t0: 145, t1: 150 },
  { id: 'LBB', pts: [2, -20, 9, 0, 17, 28, 28, 58, 42, 90, 56, 114], t0: 150, t1: 156 },
  { id: 'RBB', pts: [2, -20, -3, 6, -1, 40, 8, 74, 24, 104], t0: 150, t1: 156 },
  { id: 'MB', pts: [8, 74, -24, 80, -62, 70], t0: 154, t1: 158 },
  { id: 'PLV', pts: [56, 114, 82, 92, 98, 60, 104, 24, 100, -6], t0: 156, t1: 162 },
  { id: 'PRV', pts: [24, 104, -20, 112, -62, 98, -92, 60, -100, 16, -98, -10], t0: 156, t1: 162 },
  { id: 'PS1', pts: [28, 58, 40, 50, 52, 30], t0: 155, t1: 159 }, { id: 'PS2', pts: [42, 90, 66, 80, 80, 66], t0: 156, t1: 160 },
  { id: 'PS3', pts: [-1, 40, -20, 30, -34, 14], t0: 154, t1: 158 }, { id: 'PS4', pts: [98, 60, 84, 48, 74, 30], t0: 159, t1: 162 },
  { id: 'PS5', pts: [-92, 60, -76, 50, -66, 30], t0: 159, t1: 162 }, { id: 'PS6', pts: [-62, 98, -50, 86, -40, 74], t0: 158, t1: 161 },
];
PATHS.forEach(p => { const P_ = new Path(p.pts); p.path = P_; });
// ---------------------------------------------------------------- build the map once
(function buildHeart() {
  const W_ = HG.w, idx = (gx, gy) => gy * W_ + gx;
  for (let gy = 0; gy < HG.h; gy++) for (let gx = 0; gx < W_; gx++) {
    const x = gx + HG.x0 + 0.5, y = gy + HG.y0 + 0.5, ry_ = ringY(x);
    const outer = ellV(x, y, -56, -86, 76, 66, 0) <= 1 || ellV(x, y, 50, -96, 66, 50, 0) <= 1 || ellV(x, y, 14, 50, 112, 120, -0.38) <= 1 || ellV(x, y, 56, 116, 50, 56, -0.5) <= 1;
    let r = R_OUT;
    if (outer) {
      const ra = ellV(x, y, -62, -86, 50, 44, 0) <= 1, la = ellV(x, y, 48, -96, 46, 34, 0) <= 1;
      const rv = ellV(x, y, -42, 46, 44, 70, -0.25) <= 1 || ellV(x, y, -68, ry_ + 2, 32, 16, 0) <= 1;
      const lv = ellV(x, y, 48, 50, 30, 76, -0.45) <= 1 || ellV(x, y, 52, ry_ + 2, 30, 14, 0) <= 1;
      const inTri = x > -100 && x < -36, inMit = x > 16 && x < 88;
      if (Math.abs(y - ry_) < 3.5 && !((inTri && (ra || rv)) || (inMit && (la || lv)))) r = R_RING;
      else if (y < ry_) r = ra || (inTri && rv) ? R_RA : la || (inMit && lv) ? R_LA : R_AMY;
      else r = rv ? R_RV : lv ? R_LV : R_VMY;
    } else {
      if (x > -112 && x < -80 && y < -120) r = R_SVC;
      const aoPath = [[26, -128], [26, -186], [42, -212], [80, -224], [114, -210], [122, -172]];
      for (let i = 0; i + 1 < aoPath.length; i++) { const [ax, ay] = aoPath[i], [bx, by] = aoPath[i + 1], L = Math.hypot(bx - ax, by - ay), u = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L), 0, 1), d = Math.hypot(x - ax - u * (bx - ax), y - ay - u * (by - ay)); if (d < 15) r = R_AO; }
    }
    HREG[idx(gx, gy)] = r;
  }
  // valve leaflets hanging into the ventricles
  const leaflet = (x0, x1) => { const y0 = ringY(x0); for (let i = 0; i <= 30; i++) { const u = i / 30, x = lerp(x0, x1, u), y = lerp(y0, y0 + 24, u); const gx = Math.floor(x - HG.x0), gy = Math.floor(y - HG.y0); for (const [ox, oy] of [[0, 0], [1, 0]]) { const k = idx(gx + ox, gy + oy); if (HREG[k] === R_RV || HREG[k] === R_LV) HREG[k] = R_RING; } } };
  leaflet(-98, -80); leaflet(-38, -56); leaflet(18, 36); leaflet(86, 66);
  // activation: shortest paths through muscle (8-neighbour Dijkstra with a binary heap)
  function flood(region, seeds, msPerUnit) {
    const dist = new Float64Array(W_ * HG.h).fill(1e9), heap = [];
    const push = (k, d) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    for (const [k, d] of seeds) if (d < dist[k]) { dist[k] = d; push(k, d); }
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.length) {
      const [d, k] = pop(); if (d > dist[k]) continue;
      const gx = k % W_, gy = (k / W_) | 0;
      for (const [ox, oy, c] of nb) { const nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= W_ || ny >= HG.h) continue; const kk = idx(nx, ny); if (HREG[kk] !== region) continue; const nd = d + c * msPerUnit; if (nd < dist[kk]) { dist[kk] = nd; push(kk, nd); } }
    }
    return dist;
  }
  const near = (x, y, region) => { let best = -1, bd = 1e9; for (let oy = -8; oy <= 8; oy++) for (let ox = -8; ox <= 8; ox++) { const gx = Math.floor(x - HG.x0) + ox, gy = Math.floor(y - HG.y0) + oy; if (gx < 0 || gy < 0 || gx >= W_ || gy >= HG.h) continue; const k = idx(gx, gy); if (HREG[k] === region && ox * ox + oy * oy < bd) { bd = ox * ox + oy * oy; best = k; } } return best; };
  // atria from the SA node
  const aSeeds = []; for (let oy = -6; oy <= 6; oy++) for (let ox = -11; ox <= 11; ox++) { const k = near(SA_NODE[0] + ox, SA_NODE[1] + oy, R_AMY); if (k >= 0) aSeeds.push([k, 0]); }
  const da = flood(R_AMY, aSeeds, 1);
  let amax = 0; for (let k = 0; k < da.length; k++) if (HREG[k] === R_AMY && da[k] < 1e8) amax = Math.max(amax, da[k]);
  for (let k = 0; k < da.length; k++) if (HREG[k] === R_AMY) { HACT[k] = da[k] < 1e8 ? 2 + da[k] / amax * 86 : 60; HREP[k] = 170 + HACT[k] * 0.5; }   // atria recover during the QRS (hidden in it on the ECG)
  // ventricles from the bundle branches and the Purkinje endings
  const vSeeds = [];
  for (const p of PATHS) { if (p.id === 'HIS') continue; for (let s = 0; s <= p.path.L; s += 3) { const [x, y] = p.path.at(s), k = near(x, y, R_VMY); if (k >= 0) vSeeds.push([k, lerp(p.t0, p.t1, s / p.path.L)]); } }
  const dv = flood(R_VMY, vSeeds, 0.62);
  let vmax = 0, vmin = 1e9; for (let k = 0; k < dv.length; k++) if (HREG[k] === R_VMY && dv[k] < 1e8) { vmax = Math.max(vmax, dv[k]); vmin = Math.min(vmin, dv[k]); }
  for (let k = 0; k < dv.length; k++) if (HREG[k] === R_VMY) {
    const a = dv[k] < 1e8 ? MS.PURK - 8 + (dv[k] - vmin) / (vmax - vmin) * (MS.V_END - MS.PURK + 8) : 200;
    HACT[k] = a; HREP[k] = 470 - (a - (MS.PURK - 8)) / (MS.V_END - MS.PURK + 8) * 140;
  }
  // 16-bit shading: outline on the outer edge, light rim facing up-left, shadow facing down-right; darker endocardium
  for (let gy = 0; gy < HG.h; gy++) for (let gx = 0; gx < W_; gx++) {
    const k = idx(gx, gy), r = HREG[k]; if (r === R_OUT) continue;
    let sx = 0, sy = 0, edge = false, inner = false;
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      const nx = gx + ox, ny = gy + oy, rr = nx < 0 || ny < 0 || nx >= W_ || ny >= HG.h ? R_OUT : HREG[idx(nx, ny)];
      if (rr === R_OUT) { sx += ox; sy += oy; if (Math.abs(ox) <= 1 && Math.abs(oy) <= 1) edge = true; }
      if ((r === R_AMY || r === R_VMY) && rr >= R_RA && rr <= R_LV && Math.abs(ox) <= 1 && Math.abs(oy) <= 1) inner = true;
      if (r >= R_RA && r <= R_LV && (rr === R_AMY || rr === R_VMY) && Math.abs(ox) <= 2 && Math.abs(oy) <= 2) inner = true;
    }
    HSHD[k] = edge ? 3 : sx + sy < -1 ? 1 : sx + sy > 1 ? 2 : inner ? 2 : 0;
  }
})();
// ---------------------------------------------------------------- drawing
const bump = (m, a, b, c) => m <= a || m >= c ? 0 : m < b ? smooth((m - a) / (b - a)) : smooth((c - m) / (c - b));
// o: { at: {x, y, s} (where the map sits in the world), cond (0..1 conduction overlay), alpha }
function drawHeart(cam, m, o) {
  o = o || {};
  const at = o.at || { x: 0, y: 0, s: 1 }, s = at.s, z = cam.z * s;
  const cA = bump(m, 60, 140, 240), cV = bump(m, 240, 360, 560);
  // screen bbox of the map
  const sx0 = Math.max(0, Math.floor(cam.x(at.x + HG.x0 * s))), sx1 = Math.min(W, Math.ceil(cam.x(at.x + (HG.x0 + HG.w) * s)));
  const sy0 = Math.max(0, Math.floor(cam.y(at.y + HG.y0 * s))), sy1 = Math.min(H, Math.ceil(cam.y(at.y + (HG.y0 + HG.h) * s)));
  const colM = [[P.HM2, P.HM3, P.HM1, P.HM0], [P.HM4, P.HM5, P.HM3, P.HM1]];
  for (let sy = sy0; sy < sy1; sy++) {
    const ly0 = (cam.wy(sy + 0.5) - at.y) / s;
    for (let sx = sx0; sx < sx1; sx++) {
      let lx = (cam.wx(sx + 0.5) - at.x) / s, ly = ly0;
      // contraction: sample a little farther out, so the chambers shrink toward their centres
      const w = smooth(clamp((ly - ringY(lx) + 30) / 60, 0, 1)), kk = 1 + 0.07 * (cA * (1 - w) + cV * w);
      if (kk > 1) { const cx_ = lerp(-20, 30, w), cy_ = lerp(-90, 60, w); lx = cx_ + (lx - cx_) * kk; ly = cy_ + (ly - cy_) * kk; }
      const gx = Math.floor(lx - HG.x0), gy = Math.floor(ly - HG.y0);
      if (gx < 0 || gy < 0 || gx >= HG.w || gy >= HG.h) continue;
      const k = gy * HG.w + gx, r = HREG[k]; if (r === R_OUT) continue;
      const sh = HSHD[k]; let c;
      if (r === R_AMY || r === R_VMY) {
        const a = HACT[k], rp = HREP[k];
        const on = m >= a && m < rp + 25, f = m < rp ? 1 : 1 - (m - rp) / 25;
        c = on ? mixc(colM[0][sh], colM[1][sh], f) : colM[0][sh];
        if (m >= a && m - a < (r === R_AMY ? 3.2 : 2.2) && sh !== 3) c = mixc(c, P.C6, 0.55);
      } else if (r >= R_RA && r <= R_LV) c = sh === 2 ? P.BD0 : sh === 3 ? P.HM0 : sh === 1 ? P.BD2 : P.BD1;
      else if (r === R_RING) c = sh === 3 ? P.HM0 : sh === 2 ? P.VL0 : P.VL1;
      else if (r === R_SVC) c = sh === 3 ? P.K0 : sh === 1 ? P.VE1 : P.VE0;
      else c = sh === 3 ? P.K0 : sh === 1 ? P.AO1 : P.AO0;
      buf[sy * W + sx] = c;
    }
  }
  if ((o.cond || 0) > 0) withDither(o.cond, () => drawConduction(cam, m, at));
}
function drawConduction(cam, m, at) {
  const s = at.s, X = v => cam.x(at.x + v * s), Y = v => cam.y(at.y + v * s), z = cam.z * s, lw = Math.max(1.2, 2.4 * z);
  // pathways: dim until reached, bright once activated, a lighter front where the activation is now
  for (const p of PATHS) {
    const pts = p.path.sub(0, p.path.L, 2), n = pts.length / 2;
    for (let i = 0; i + 1 < n; i++) {
      const u = i / (n - 1), ta = lerp(p.t0, p.t1, u), x0 = X(pts[2 * i]), y0 = Y(pts[2 * i + 1]), x1 = X(pts[2 * i + 2]), y1 = Y(pts[2 * i + 3]);
      const c = m < ta ? P.CY1 : m - ta < 2 ? P.CY3 : P.CY2;
      lineW(x0, y0, x1, y1, lw + 1.2, P.CY0); lineW(x0, y0, x1, y1, lw, c);
    }
  }
  // AV node: fills slowly (the delay), from the atrial side toward the His bundle
  { const [x, y, rx, ry] = AV_NODE, f = clamp((m - MS.AV_IN) / (MS.AV_OUT - MS.AV_IN), 0, 1);
    ellipse(X(x), Y(y), (rx + 1.5) * z, (ry + 1.5) * z, P.AV0); ellipse(X(x), Y(y), rx * z, ry * z, P.AV1);
    if (f > 0) { const xm = lerp(x - rx, x + rx, f); for (let yy = -ry; yy <= ry; yy++) { const half = rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)); const xa = x - half, xb = Math.min(x + half, xm); if (xb > xa) rect(X(xa), Y(y + yy), X(xb), Y(y + yy + 1), P.AV2); } }
    if (m >= MS.AV_IN && m < MS.AV_OUT + 15) glow(X(x), Y(y), 16 * z, P.AV1, P.AV2, 0.35);
    // the hold made visible: a ring of dots fills around the node while the signal waits
    if (z > 0.8 && m >= MS.AV_IN - 4 && m < MS.AV_OUT + 30) {
      const n = Math.round(f * 28), fade = m > MS.AV_OUT + 12 ? 1 - (m - MS.AV_OUT - 12) / 18 : 1;
      for (let i = 0; i < 28; i++) { const a = -Math.PI / 2 + i / 28 * TAU, px = X(x + (rx + 6) * Math.cos(a)), py = Y(y + (ry + 6) * Math.sin(a)); disc(px, py, Math.max(1, 1.1 * z), i < n ? (fade < 1 && bay(Math.floor(px), Math.floor(py)) > fade ? P.AV0 : P.AV3) : P.AV0); }
    } }
  // SA node: fires first
  { const [x, y, rx, ry] = SA_NODE, on = m >= MS.SA ? Math.max(0, 1 - (m - MS.SA) / 80) : 0.15 + 0.15 * Math.max(0, (m + 60) / 48);
    ellipse(X(x), Y(y), (rx + 1.5) * z, (ry + 1.5) * z, P.SA0); ellipse(X(x), Y(y), rx * z, ry * z, on > 0.4 ? P.SA2 : P.SA1);
    if (on > 0) glow(X(x), Y(y), 18 * z, P.SA1, P.SA3, 0.45 * on); }
}
