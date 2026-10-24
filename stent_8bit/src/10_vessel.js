'use strict';
// ============================================================================
// VESSEL world: longitudinal cutaway of a coronary artery, vertical in frame.
// Proximal (ostium side) at the top, distal at the bottom; blood flows DOWN.
// x = lateral (0 = vessel axis), y = along the vessel. Lesion centred at y=0.
// Plaque grows inside the wall (intima), never floats in the lumen.
// ============================================================================
for (const [k, v] of Object.entries({
  AW0: '#3A1220', AW1: '#7A2A3C', AW2: '#B04A5C', AW3: '#D9737F', AW4: '#F6B0B4', AW5: '#FFD8D6',
  BL0: '#2C0712', BL1: '#4A0C1C', BL2: '#651428',
  RB0: '#4A0A16', RB1: '#8E1428', RB2: '#C81E3A', RB3: '#F0505E', RB4: '#FF9696',
  PQ0: '#5A3A08', PQ1: '#A8701A', PQ2: '#E0A832', PQ3: '#F6D468',
  FC1: '#CDBB92', FC2: '#F2E6C6',
  GW0: '#59626E', GW1: '#AEB8C4', GW2: '#F2F6FA',
  CA0: '#1E2638', CA1: '#3E4C68', CA2: '#6A7C9C', CA3: '#9EB0CC',
  BA0: '#0C4250', BA1: '#2290AE', BA2: '#5CD6EE', BA3: '#C2F6FF',
  ST0: '#353D49', ST1: '#6F7A8A', ST2: '#B4BFCC', ST3: '#EEF3F8',
  MC0: '#3E3A5A', MC1: '#8A86B0', MC2: '#C4C0E0',
  DR0: '#1C5A46', DR1: '#3FB98A', DR2: '#7FF0C0', DR3: '#D4FFEE',
  HM0: '#3A0C16', HM1: '#6A1A28', HM2: '#9A2E3C', HM3: '#C4505A', HM4: '#E07A7E',
  PA1: '#4E5C9C', PA2: '#7484C4', FAT: '#C9A26A',
  XR0: '#141416', XR1: '#2E2E33', XR2: '#4E4E55', XR3: '#76767E', XR4: '#A0A0A8', XR5: '#CACACF', XR6: '#E6E6EA',
  TL0: '#173F3C', TL1: '#2F7F7A', TL2: '#4FB0A8', TL3: '#8FDCD2',
})) P[k] = hexc(v);

const VS = { R0: 70, MED: 18, ADV: 13, Lp: 52, PLmax: 74, PRk: 0.42, RS: 67, NR: 6, K: 8, PITCH: 28, SLEN: 27.1, RC: 9, YT: -720, YB: 720 };
const lesionB = y => { const u = y / VS.Lp, u2 = u * u; return 1 / (1 + u2 * u2 * u2); };
// stent zig-zag amplitude from radius: strut length is conserved (struts rotate, they do not stretch)
function stentAmp(r) { const h = Math.PI * r / VS.K; return Math.sqrt(Math.max(4, VS.SLEN * VS.SLEN - h * h)) / 2; }

// ---------------------------------------------------------------- profile
// st: g plaque growth, rb balloon radius, by device centre y, rs stent radius,
//     stent 0 none / 1 on balloon / 2 left in the wall, ax axis centering 0..1
function devAt(y, st) {
  let r = 0;
  if (st.rb > 0 && Math.abs(y - st.by) < 98) { const f = clamp((98 - Math.abs(y - st.by)) / 16, 0, 1); r = Math.max(r, lerp(Math.min(st.rb, 4), st.rb, smooth(f))); }
  if (st.stent && Math.abs(y - (st.stent === 2 ? 0 : st.by)) < VS.NR * VS.PITCH / 2 + 2) r = Math.max(r, st.rs);
  return r;
}
const PRF = { xl: 0, xr: 0, ml: 0, mr: 0, PL: 0, PR: 0, ax: 0, dev: 0, nc: 0 };
function profile(y, st, o) {
  o = o || PRF;
  const g = st.g || 0, b = lesionB(y);
  const PL = VS.PLmax * g * b, PR = PL * VS.PRk;
  const xlN = -VS.R0 + PL, xrN = VS.R0 - PR, nc = (xlN + xrN) / 2;
  const dev = devAt(y, st);
  const ax = lerp(nc, 0, st.ax || 0);
  let xl = xlN, xr = xrN;
  if (dev > 0) { xl = Math.min(xlN, ax - dev); xr = Math.max(xrN, ax + dev); }
  const pl = xlN - xl, pr = xr - xrN;
  const thL = Math.max(0.4 * PL, PL - pl), thR = Math.max(0.4 * PR, PR - pr);
  o.ml = xl - thL; o.mr = xr + thR; o.xl = xl; o.xr = xr; o.PL = PL; o.PR = PR; o.ax = ax; o.dev = dev; o.nc = nc;
  o.thL = thL; o.thR = thR;
  return o;
}
// ---------------------------------------------------------------- flow
// Q(t) is integrated once into FLOWPHI so particle positions are a pure function of t
let FLOWPHI = null;
function flowQ(t) {
  if (t < 1.5) return 1;
  if (t < 6.0) return 1 - 0.45 * smooth(seg(t, 1.5, 5.0));
  if (t < 24.3) return 0.55;
  if (t < 31.2) return lerp(0.55, 0.03, smooth(seg(t, 24.3, 25.4)));
  if (t < 35.0) return lerp(0.03, 1, smooth(seg(t, 31.2, 32.6)));
  return 1;
}
function flowInit() {
  const n = Math.ceil(DUR * 120) + 2; FLOWPHI = new Float32Array(n); let a = 0;
  for (let i = 0; i < n; i++) { FLOWPHI[i] = a; a += flowQ(i / 120) / 120; }
}
function flowPhi(t) { const f = clamp(t, 0, DUR) * 120, i = Math.floor(f); return lerp(FLOWPHI[i], FLOWPHI[Math.min(i + 1, FLOWPHI.length - 1)], f - i); }
// RBC particles
const RBCS = (function () { const a = []; for (let i = 0; i < 175; i++) a.push({ p: hash(i * 3 + 1), u: (hash(i * 7 + 2) * 2 - 1) * 0.86, ang: hash(i * 11) * TAU, tb: hash(i * 13) * TAU, sz: 0.85 + 0.3 * hash(i * 17) }); return a; })();
const _F = new Float32Array(800);
function rbcLayout(st, phi, cb) {
  // cumulative effective lumen width from the top (flow coordinate)
  const n = 720, dy = (VS.YB - VS.YT) / n; let F = 0; _F[0] = 0;
  const pr = {};
  for (let i = 1; i <= n; i++) {
    const y = VS.YT + (i - 0.5) * dy; profile(y, st, pr);
    let w = pr.xr - pr.xl;
    if (st.rb > 14 && Math.abs(y - st.by) < 98) w *= 1 - clamp((st.rb - 14) / 44, 0, 1);    // inflated balloon blocks the lumen
    F += Math.max(0.5, w) * dy; _F[i] = F;
  }
  const Ft = F, speed = 0.115 * (VS.YB - VS.YT) * VS.R0 * 2 / Ft;
  for (const c of RBCS) {
    const k = 1 - 0.35 * c.u * c.u;
    const f = ((c.p + k * phi * speed * 0.9) % 1 + 1) % 1, target = f * Ft;
    let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (_F[m] < target) lo = m; else hi = m; }
    const y = VS.YT + (lo + (target - _F[lo]) / Math.max(1e-6, _F[hi] - _F[lo])) * dy;
    profile(y, st, pr);
    const m = 7.5, w = pr.xr - pr.xl;
    if (w < 2 * m + 2) continue;
    const x = pr.xl + m + (c.u + 1) / 2 * (w - 2 * m);
    cb(c, x, y);
  }
}
function drawRBC(x, y, s, ang, tb, sz) {
  const rx = 6.4 * s * sz, ry = Math.max(1.4, rx * (0.32 + 0.68 * Math.abs(Math.cos(tb))));
  if (x < -rx || x > W + rx || y < -rx || y > H + rx) return;
  const m = maskEll(x, y, rx, ry, ang);
  shade(m, P.RB2, P.RB3, P.RB1, P.RB0, { k: s > 1.6 ? 2 : 1 });
  if (ry > 3) ellipse(x + 0.6, y + 0.6, rx * 0.42, ry * 0.42, P.RB1, undefined, ang);
}
// ---------------------------------------------------------------- render
// opt: clip [x0,x1] screen columns; plaqueFx (formation 0..1); flowOff
function drawVessel(cam, t, st, opt) {
  opt = opt || {};
  const c0 = opt.clip ? opt.clip[0] : 0, c1 = opt.clip ? opt.clip[1] : W;
  const z = cam.z, phi = st.phi === undefined ? flowPhi(t) : st.phi;
  // background tissue with soft parallax
  for (let y = 0; y < H; y++) { buf.fill(P.BG, y * W + c0, y * W + c1); }
  for (let i = 0; i < 9; i++) {
    const wx = (hash(i * 5) - 0.5) * 700, wy = (hash(i * 9) - 0.5) * 1600;
    const sx = CX + (wx - cam.cx * 0.45) * z * 0.6, sy = CY + (wy - cam.cy * 0.45) * z * 0.6;
    const r = (40 + 50 * hash(i * 3)) * z * 0.6;
    if (sx + r < c0 || sx - r > c1) continue;
    disc(sx, sy, r, i % 2 ? P.N1 : P.N2, 0.7);
  }
  const pr = {};
  const yOff = phi * 160;   // lumen streak texture moves with the flow
  for (let sy = 0; sy < H; sy++) {
    const wy = cam.wy(sy + 0.5);
    profile(wy, st, pr);
    const X = v => cam.x(v);
    const oL = pr.ml - VS.MED - VS.ADV, oR = pr.mr + VS.MED + VS.ADV;
    const bounds = [X(oL), X(pr.ml - VS.MED), X(pr.ml - 2.5), X(pr.ml), X(pr.xl), X(pr.xr), X(pr.mr), X(pr.mr + 2.5), X(pr.mr + VS.MED), X(oR)];
    const capW = 3.2 * z, wyq = Math.floor(wy);
    for (let sx = c0; sx < c1; sx++) {
      const x = sx + 0.5;
      let col;
      if (x < bounds[0] || x >= bounds[9]) continue;
      const wx = cam.wx(x);
      if (x < bounds[1] || x >= bounds[8]) {           // adventitia
        col = ((Math.floor(wx / 7) * 7 + wyq * 3) % 11 === 0) ? P.AW0 : P.AW1;
        if (x < bounds[0] + 1 || x >= bounds[9] - 1) col = P.AW0;
      } else if (x < bounds[2] || x >= bounds[7]) {    // media: circumferential smooth muscle in section
        const q = (wyq + 400) % 7, r = Math.floor((wx + 400) / 5) % 3;
        col = (q === 0 || (q === 3 && r === 1)) ? P.AW1 : (q === 1 && r === 0 ? P.AW3 : P.AW2);
      } else if (x < bounds[3] || x >= bounds[6]) {    // intima / internal elastic lamina
        col = P.AW3;
      } else if (x < bounds[4] || x >= bounds[5]) {    // plaque inside the wall (left or right)
        const left = x < bounds[4];
        const dLum = left ? bounds[4] - x : x - bounds[5];
        if (dLum < 1) col = P.AW4;                     // endothelium
        else if (dLum < capW) col = dLum < capW * 0.5 ? P.FC2 : P.FC1;   // fibrous cap
        else {
          const h = hash2(Math.floor(wx / 3), Math.floor(wy / 3));
          col = h < 0.08 ? P.PQ3 : h < 0.2 ? P.PQ1 : P.PQ2;
          const dIn = left ? x - bounds[3] : bounds[6] - x;
          if (dIn < 1.5 * z) col = P.PQ1;
          if (((Math.floor(wx) + Math.floor(wy) * 2) % 13 === 0) && h > 0.5) col = P.PQ3; // cholesterol crystal glints
        }
      } else {                                         // lumen with plasma streaks
        const e = Math.min(x - bounds[4], bounds[5] - x);
        col = P.BL1;
        const sq = (wy - yOff + 997 * (Math.floor(wx / 9) % 7)) % 23;
        if (sq > 0 && sq < 2.2 * Math.min(1, z)) col = P.BL2;
        if (e < 1) col = P.AW4;
        else if (e < 5 * z && bay(sx, sy) < 0.5) col = P.BL0;
      }
      buf[sy * W + sx] = col;
    }
  }
  // foam cells / macrophages inside the plaque
  if ((st.g || 0) > 0.15) for (let i = 0; i < 9; i++) {
    const yr = (hash(i * 31) - 0.5) * 1.4 * VS.Lp, f = 0.3 + 0.45 * hash(i * 37), right = i >= 6;
    profile(yr, st, pr);
    const th = right ? pr.mr - pr.xr : pr.xl - pr.ml;
    if (th < 14) continue;
    const wx = right ? pr.xr + f * th : pr.ml + f * th;
    const sx = cam.x(wx), sy2 = cam.y(yr);
    if (sx < c0 - 10 || sx > c1 + 10) continue;
    const r = Math.min(th * 0.28, 7) * z;
    shade(maskEll(sx, sy2, r * 1.2, r, hash(i) * 3), P.MC1, P.MC2, P.MC0, P.MC0);
    for (let k = 0; k < 4; k++) { const a = k * 1.7 + i; pset(sx + Math.cos(a) * r * 0.5, sy2 + Math.sin(a) * r * 0.45, P.PQ3); }
  }
  if (opt.formation > 0) drawFormation(cam, st, opt.formation, t);
  // stent back struts, then blood cells, then devices, then front struts
  if (st.stent) drawStent(cam, st, -1, t);
  rbcLayout(st, phi, (c, x, y) => {
    const sx = cam.x(x); if (sx < c0 - 8 || sx > c1 + 8) return;
    drawRBC(sx, cam.y(y), z, c.ang + t * 0.8 * (c.u + 0.2), c.tb + t * 2.4, c.sz);
  });
  drawDevices(cam, st, t);
  if (st.stent) drawStent(cam, st, 1, t);
}
// LDL + monocytes entering the wall during plaque formation (time-lapse)
function drawFormation(cam, st, k, t) {
  const pr = {};
  for (let i = 0; i < 16; i++) {
    const y = (hash(i * 17 + 5) - 0.5) * 1.6 * VS.Lp; profile(y, st, pr);
    const ph = clamp(k * 1.6 - i * 0.04, 0, 1); if (ph <= 0 || ph >= 1) continue;
    const xa = pr.xl + 16, xb = pr.ml + 0.5 * (pr.xl - pr.ml);
    const x = lerp(xa, xb, smooth(ph)), sx = cam.x(x), sy = cam.y(y);
    if (i % 4 === 0) { shade(maskDisc(sx, sy, 4.5 * cam.z), P.MC1, P.MC2, P.MC0, P.MC0); pset(sx, sy, P.MC0); }
    else { rect(sx - 1, sy - 1, sx + 2, sy + 2, P.PQ1); pset(sx, sy, P.PQ3); }
  }
}
// ---------------------------------------------------------------- devices
function wirePath(st, y0, y1) { // guidewire follows the lumen centre line
  const pts = [], pr = {};
  for (let y = y0; y <= y1; y += 4) { profile(y, st, pr); pts.push((pr.xl + pr.xr) / 2 + Math.sin(y * 0.03) * 2.5, y); }
  return pts;
}
function tube(cam, pts, r, c0, c1, c2, c3) {
  const q = cam.pts(pts);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 2 * r * cam.z + 2), c0);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 2 * r * cam.z), c1);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i] - r * cam.z * 0.35, q[i + 1], q[i + 2] - r * cam.z * 0.35, q[i + 3], Math.max(1, r * cam.z * 0.6), c2);
  if (c3 !== undefined) for (let i = 0; i + 3 < q.length; i += 2) line(q[i] - r * cam.z * 0.5, q[i + 1], q[i + 2] - r * cam.z * 0.5, q[i + 3], c3);
}
function drawDevices(cam, st, t) {
  const z = cam.z;
  // guiding catheter at the ostium (top)
  if (st.gc) tube(cam, [st.gcX || 0, -1200, st.gcX || 0, st.gcTip], 10, P.CA0, P.CA1, P.CA2, P.CA3);
  // guidewire
  if (st.wire !== undefined && st.wire !== null) {
    const y0 = st.wireFrom === undefined ? (st.gc ? st.gcTip : -1200) : st.wireFrom;
    if (st.wire > y0) {
      const pts = wirePath(st, y0, st.wire);
      const q = cam.pts(pts);
      for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 1.6 * z), P.GW0);
      for (let i = 0; i + 3 < q.length; i += 2) line(q[i], q[i + 1], q[i + 2], q[i + 3], P.GW1);
      if (z > 1.4) for (let i = 0; i + 3 < q.length; i += 2) line(q[i] - 1, q[i + 1], q[i + 2] - 1, q[i + 3], P.GW2);
      // soft J-tip
      const n = q.length; const tx = q[n - 2], ty = q[n - 1];
      for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI * 0.8; pset(tx + Math.sin(a) * 6 * z, ty + (1 - Math.cos(a)) * 3 * z + k * 0.6 * z, P.GW2); }
      if (st.wireGlow) glow(tx, ty, 10, P.GW0, P.GW1, st.wireGlow);
    }
  }
  // balloon catheter shaft (from the top down to the balloon)
  if (st.rb > 0) {
    const top = st.by - 98;
    const pts = wirePath(st, -1200, top).map((v, i) => i % 2 === 0 ? v : v);
    tube(cam, pts, 3.4, P.CA0, P.CA1, P.CA2);
    drawBalloon(cam, st, t);
  }
}
function drawBalloon(cam, st, t) {
  const z = cam.z, pr = {};
  const y0 = st.by - 98, y1 = st.by + 98;
  const sy0 = Math.max(0, Math.floor(cam.y(y0))), sy1 = Math.min(H, Math.ceil(cam.y(y1)));
  const infl = clamp((st.rb - 10) / 50, 0, 1);
  for (let sy = sy0; sy < sy1; sy++) {
    const wy = cam.wy(sy + 0.5); profile(wy, st, pr);
    const f = clamp((98 - Math.abs(wy - st.by)) / 16, 0, 1);
    const hb = lerp(Math.min(st.rb, 4), st.rb, smooth(f));
    const xa = cam.x(pr.ax), a = Math.round(xa - hb * z), b = Math.round(xa + hb * z);
    for (let sx = Math.max(0, a); sx < Math.min(W, b); sx++) {
      const u = (sx + 0.5 - xa) / (hb * z);              // -1..1 across the balloon
      if (u < -0.62 && u > -0.8) buf[sy * W + sx] = P.BA2;
      else if (u > 0.55) { if (bay(sx, sy) < 0.55) buf[sy * W + sx] = P.BA0; }
      else if (bay(sx, sy) < 0.32 + 0.18 * infl) buf[sy * W + sx] = P.BA1;
      if (infl < 0.25 && ((sy + Math.round(u * 6)) % 7 === 0)) buf[sy * W + sx] = P.BA0;     // wrapped folds
    }
    if (a >= 0 && a < W) buf[sy * W + a] = P.BA3; if (b - 1 >= 0 && b - 1 < W) buf[sy * W + b - 1] = P.BA3;
  }
  // inner shaft + radiopaque marker bands at the stent ends
  const pts = [], pts2 = [];
  for (let y = y0; y <= y1; y += 4) { profile(y, st, pr); pts.push(pr.ax, y); }
  const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 2.4 * z), P.CA2);
  for (const e of [-1, 1]) { const y = st.by + e * VS.NR * VS.PITCH / 2; profile(y, st, pr); rect(cam.x(pr.ax) - 3 * z, cam.y(y) - 1.5 * z, cam.x(pr.ax) + 3 * z, cam.y(y) + 1.5 * z, P.ST3); }
}
// ---------------------------------------------------------------- stent (cylindrical lattice)
// side: -1 back half, +1 front half
function drawStent(cam, st, side, t) {
  const z = cam.z, cyS = st.stent === 2 ? 0 : st.by, pr = {};
  const K = VS.K, nseg = 5;
  for (let k = 0; k < VS.NR; k++) {
    const yk = cyS + (k - (VS.NR - 1) / 2) * VS.PITCH;
    profile(yk, st, pr);
    const r = st.stent === 2 ? Math.min(st.rs, Math.max(-pr.xl, pr.xr) - 0.5) : st.rs;
    const a = stentAmp(r), xa = pr.ax;
    for (let i = 0; i < 2 * K; i++) {
      const th0 = i * Math.PI / K, th1 = (i + 1) * Math.PI / K;
      const z0 = ((i + k) % 2 ? -a : a), z1 = -z0;     // neighbouring rings are out of phase (peak-to-valley links)
      let px = null, py = null;
      for (let s = 0; s <= nseg; s++) {
        const th = lerp(th0, th1, s / nseg), zz = lerp(z0, z1, s / nseg);
        const d = Math.cos(th);
        const sx = cam.x(xa + r * Math.sin(th)), sy = cam.y(yk + zz);
        if (px !== null && (d >= 0 ? 1 : -1) === side) {
          const lit = d > 0.55;
          if (side > 0) { lineW(px, py, sx, sy, Math.max(1, 1.7 * z), P.ST0); line(px, py, sx, sy, lit ? P.ST3 : P.ST2); }
          else line(px, py, sx, sy, P.ST1);
        }
        px = sx; py = sy;
      }
      // links between rings at every second crown
      if (k < VS.NR - 1 && (i + k) % 2 === 0 && i % 4 < 2) {
        const d = Math.cos(th0); if ((d >= 0 ? 1 : -1) !== side) continue;
        const sx = cam.x(xa + r * Math.sin(th0));
        line(sx, cam.y(yk + a), sx, cam.y(yk + VS.PITCH - a), side > 0 ? P.ST2 : P.ST1);
      }
    }
  }
}
