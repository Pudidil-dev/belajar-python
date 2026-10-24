'use strict';
// ============================================================================
// MICRO worlds on one nested zoom chain (schematic scales, NOT to scale):
//   body (1) > tissue (1/23) > cell (1/136) > nucleus (1/590) > DNA (1/1967)
// plus the tungsten lattice (bremsstrahlung) and the water field (Compton,
// secondary electrons, radiolysis, DNA damage).
// ============================================================================
P.RC1 = hexc('#D8566A'); P.HCL = hexc('#5A6C9C');
const U_T = 1 / 23.08, U_C = 1 / 135.7, U_N = 1 / 590, U_D = 1 / 1967;
const NUC_OFF = [6 * U_C, -4 * U_C];          // nucleus centre in body units

// ---------------------------------------------------------------- tissue
const TS = 34;   // cell spacing (tissue units)
function tSeed(i, j) {
  if (i === 0 && j === 0) return [0, 0];
  return [i * TS + (hash2(i * 3 + 1, j * 7 + 2) - 0.5) * 16, j * TS + (hash2(i * 5 + 3, j * 11 + 5) - 0.5) * 16];
}
function tIsTumor(sx, sy, R) { return Math.hypot(sx, sy) < tumorRad(Math.atan2(sy, sx), R); }
// view: {ox, oy, s}; opt.R tumour radius in tissue units, opt.dead: fn(i,j)->0..1 (shrink), opt.hl target glow
function drawTissue(view, opt) {
  opt = opt || {};
  const R = opt.R || 150, s = view.s;
  const memW = Math.max(1.2, 2.2 * s) / s;
  const lx0 = (0 - view.ox) / s, lx1 = (W - view.ox) / s, ly0 = (0 - view.oy) / s, ly1 = (H - view.oy) / s;
  const i0 = Math.round(lx0 / TS) - 2, i1 = Math.round(lx1 / TS) + 2, j0 = Math.round(ly0 / TS) - 2, j1 = Math.round(ly1 / TS) + 2;
  const nw = i1 - i0 + 1, nh = j1 - j0 + 1;
  const SX = new Float32Array(nw * nh), SY = new Float32Array(nw * nh), TU = new Uint8Array(nw * nh), SH = new Float32Array(nw * nh);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = (j - j0) * nw + (i - i0), [sx, sy] = tSeed(i, j);
    let tumor = tIsTumor(sx, sy, R), shrink = opt.dead ? opt.dead(i, j, tumor) : 0;
    if (shrink > 1) { tumor = false; shrink = 2 - shrink; }   // healthy tissue grows back
    SX[k] = sx; SY[k] = sy; TU[k] = tumor ? 1 : 0; SH[k] = shrink;
  }
  for (let y = 0; y < H; y++) {
    const ly = (y + 0.5 - view.oy) / s;
    for (let x = 0; x < W; x++) {
      const lx = (x + 0.5 - view.ox) / s;
      const gi = Math.round(lx / TS), gj = Math.round(ly / TS);
      let d1 = 1e9, d2 = 1e9, bk = 0, bi = 0, bj = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const jj = gj + dj - j0; if (jj < 0 || jj >= nh) continue;
        for (let di = -1; di <= 1; di++) {
          const ii = gi + di - i0; if (ii < 0 || ii >= nw) continue;
          const k = jj * nw + ii, dx = lx - SX[k], dy = ly - SY[k], d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; bk = k; bi = gi + di; bj = gj + dj; } else if (d < d2) d2 = d;
        }
      }
      d1 = Math.sqrt(d1); d2 = Math.sqrt(d2);
      const tumor = TU[bk] === 1, shrink = SH[bk], bsx = SX[bk], bsy = SY[bk];
      let col;
      const edge = (d2 - d1) * 0.5;
      const cellR = 15 * (1 - shrink);
      if (shrink > 0 && d1 > cellR) col = P.N1;
      else if (edge < memW) col = tumor ? P.R1 : P.HC0;
      else {
        const dx = lx - bsx, dy = ly - bsy;
        const nr = 9.5 * (1 - shrink * 0.5);
        const ndx = dx / 1.1 - 1.5, ndy = dy + 1, nd = Math.sqrt(ndx * ndx + ndy * ndy);
        if (nd < nr) col = nd > nr - memW * 0.8 ? P.L0 : (dx + dy < -2 ? P.L2 : P.L1);
        else col = tumor ? (dx + dy < 0 ? P.RC1 : P.R2) : (dx + dy < 0 ? P.HC2 : P.HC1);
        if (shrink > 0 && d1 > cellR - memW) col = tumor ? P.R1 : P.HC0;
      }
      if (opt.hl && bi === 0 && bj === 0 && edge < memW * 2.2) col = P.R4;
      buf[y * W + x] = col;
    }
  }
}
// ---------------------------------------------------------------- cell
function drawCell(view, opt) {
  opt = opt || {};
  const s = view.s, X = l => view.ox + l * s, Y = l => view.oy + l * s;
  clear(P.R1);
  // neighbours peeking in (flat facets)
  for (const [cx, cy, r] of [[-190, -150, 95], [200, -120, 100], [-200, 170, 105], [190, 190, 95], [0, -260, 90], [10, 270, 92]]) {
    const m = maskDisc(X(cx), Y(cy), r * s); shade(m, P.R2, P.RC1, P.R1, P.R0, { k: 2 });
  }
  const m = maskFn(X(-108), Y(-108), X(108), Y(108), (x, y) => { const lx = (x - view.ox) / s, ly = (y - view.oy) / s, a = Math.atan2(ly, lx); return Math.hypot(lx, ly) < 100 * (1 + 0.03 * Math.sin(5 * a + 1)); });
  shade(m, P.R2, P.RC1, P.R1, P.R0, { k: Math.max(1, Math.round(3 * s)) });
  // cytoplasm texture: mitochondria, ER, granules
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + 0.4, r = 72 + 10 * hash(i), cx = Math.cos(a) * r, cy = Math.sin(a) * r;
    const mm = maskEll(X(cx), Y(cy), 11 * s, 5 * s, a + 1.2); shade(mm, P.R1, P.R2, P.R0, P.R0);
    if (s > 0.6) line(X(cx - 6 * Math.cos(a + 1.2)), Y(cy - 6 * Math.sin(a + 1.2)), X(cx + 6 * Math.cos(a + 1.2)), Y(cy + 6 * Math.sin(a + 1.2)), P.RC1);
  }
  for (let i = 0; i < 40; i++) { const a = hash(i * 3) * TAU, r = 55 + 38 * hash(i * 7); pset(X(Math.cos(a) * r), Y(Math.sin(a) * r), P.R1); }
  // nucleus with envelope, pores, nucleolus, chromatin
  const nx = 6, ny = -4, nr = 46;
  const nm = maskDisc(X(nx), Y(ny), nr * s); shade(nm, P.L1, P.L2, P.L0, P.L0, { k: Math.max(1, Math.round(2 * s)) });
  ring(X(nx), Y(ny), nr * s - 0.5, Math.max(1, 2 * s), P.L0);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; pset(X(nx + Math.cos(a) * nr), Y(ny + Math.sin(a) * nr), P.L2); }
  disc(X(nx + 14), Y(ny + 10), 9 * s, P.L0);
  for (let i = 0; i < 9; i++) {
    const pts = []; let a = hash(i * 9) * TAU, r = 14 + 24 * hash(i * 5 + 1);
    for (let k = 0; k < 8; k++) { pts.push(X(nx + Math.cos(a) * r), Y(ny + Math.sin(a) * r)); a += 0.35; r += (hash(i * 31 + k) - 0.5) * 8; }
    polyline(pts, P.I1);
  }
  if (opt.hl) glow(X(nx), Y(ny), nr * s * 1.2, P.L1, P.L2, opt.hl);
}
// ---------------------------------------------------------------- nucleus
function drawNucleus(view, opt) {
  const s = view.s, X = l => view.ox + l * s, Y = l => view.oy + l * s;
  clear(P.L1);
  for (let y = 0; y < H; y += 1) for (let x = (y & 1); x < W; x += 2) if (bay(x, y) < 0.25) buf[y * W + x] = P.L0;
  // chromatin fibres winding through
  for (let i = 0; i < 16; i++) {
    let x = (hash(i * 3) - 0.5) * 600, y = (hash(i * 7 + 1) - 0.5) * 900, a = hash(i * 11) * TAU;
    const pts = [];
    for (let k = 0; k < 40; k++) { pts.push(X(x), Y(y)); a += (vnoise(k * 0.3, i) - 0.5) * 1.2; x += Math.cos(a) * 14; y += Math.sin(a) * 14; }
    for (let k = 0; k + 3 < pts.length; k += 2) { lineW(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], Math.max(1, 10 * s), P.L0); }
    for (let k = 0; k + 3 < pts.length; k += 2) { lineW(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], Math.max(1, 7 * s), P.I1); }
    for (let k = 0; k + 3 < pts.length; k += 4) disc(pts[k], pts[k + 1], Math.max(1, 5 * s), P.I2);
  }
  // the target fibre through the centre (horizontal)
  lineW(X(-400), Y(0), X(400), Y(0), Math.max(1, 13 * s), P.L0);
  lineW(X(-400), Y(0), X(400), Y(0), Math.max(1, 10 * s), P.I1);
  for (let x = -400; x < 400; x += 9) { disc(X(x), Y(Math.sin(x * 0.09) * 2), Math.max(1, 5.5 * s), P.I2); pset(X(x) - 1, Y(Math.sin(x * 0.09) * 2) - 1, P.I3); }
  // nuclear envelope arc near the edge
  ring(X(0), Y(0), 200 * s, Math.max(1, 6 * s), P.L0);
}
// ---------------------------------------------------------------- DNA
// helix along x through (0,0) local; opt.breaks: [{x, strand(0|1), k}], opt.split {x, dx, dy, rot}
const DNA_R = 18, DNA_K = TAU / 72, DNA_STEP = 7;
function strandY(x, sIdx, ph) { return DNA_R * Math.sin(DNA_K * x + ph + (sIdx ? 2.4 : 0)); }
function strandZ(x, sIdx, ph) { return Math.cos(DNA_K * x + ph + (sIdx ? 2.4 : 0)); }
function drawDNA(view, opt) {
  opt = opt || {};
  const s = view.s, ph = opt.ph || 0;
  const brk = opt.breaks || [];
  const split = opt.split;
  // transform for the split-off right half
  const tf = (x, y) => {
    if (split && x > split.x) { const c = Math.cos(split.rot || 0), sn = Math.sin(split.rot || 0), dx = x - split.x, dy = y; return [view.ox + (split.x + dx * c - dy * sn + split.dx) * s, view.oy + (dx * sn + dy * c + split.dy) * s]; }
    return [view.ox + x * s, view.oy + y * s];
  };
  const x0 = (0 - view.ox) / s - 40, x1 = (W - view.ox) / s + 40 + (split ? Math.abs(split.dx) : 0);
  const gap = (x, si) => { for (const b of brk) if (b.strand === si && Math.abs(x - b.x) < 3.2 * (b.k === undefined ? 1 : b.k)) return true; return false; };
  // back strand pieces first, then base pairs, then front pieces
  for (const pass of [0, 1, 2]) {
    if (pass === 1) {
      for (let x = Math.floor(x0 / DNA_STEP) * DNA_STEP; x < x1; x += DNA_STEP) {
        const ya = strandY(x, 0, ph), yb = strandY(x, 1, ph);
        const n = Math.round(x / DNA_STEP);
        if (split && Math.abs(x - split.x) < DNA_STEP * 0.6 && (split.dx !== 0 || split.dy !== 0)) continue;
        const [ax, ay] = tf(x, ya), [bx, by] = tf(x, yb), [mx, my] = tf(x, (ya + yb) / 2);
        const c1 = (n & 1) ? P.L2 : P.L1, c2 = (n & 1) ? P.L1 : P.L2;
        const w = Math.max(1, 2.4 * s);
        lineW(ax, ay, mx, my, w, c1); lineW(mx, my, bx, by, w, c2);
      }
      continue;
    }
    for (const si of [0, 1]) {
      let prev = null;
      for (let x = x0; x < x1; x += Math.max(0.5, 1.2 / s)) {
        const z = strandZ(x, si, ph);
        const front = z >= 0;
        if ((pass === 0) === front) { prev = null; continue; }
        if (gap(x, si)) { prev = null; continue; }
        if (split && Math.abs(x - split.x) < 0.8) { prev = null; continue; }
        const [px, py] = tf(x, strandY(x, si, ph));
        if (prev) {
          const w = Math.max(1.5, 5 * s);
          lineW(prev[0], prev[1], px, py, w + 2, front ? P.I0 : P.K0);
          lineW(prev[0], prev[1], px, py, w, front ? P.I2 : P.I1);
          if (front) lineW(prev[0], prev[1] - w * 0.25, px, py - w * 0.25, Math.max(1, w * 0.35), P.I3);
        }
        prev = [px, py];
      }
    }
  }
  // phosphate beads on front strands
  for (const si of [0, 1]) for (let x = Math.floor(x0 / DNA_STEP) * DNA_STEP + 3; x < x1; x += DNA_STEP) {
    if (strandZ(x, si, ph) < 0.2 || gap(x, si)) continue;
    const [px, py] = tf(x, strandY(x, si, ph)); disc(px, py, Math.max(1, 2.6 * s), P.I3); pset(px, py, P.I2);
  }
  // jagged broken ends
  for (const b of brk) {
    for (const e of [-1, 1]) {
      const x = b.x + e * 3.4 * (b.k === undefined ? 1 : b.k);
      const [px, py] = tf(x, strandY(x, b.strand, ph));
      disc(px, py, Math.max(1.5, 3 * s), P.I1); pset(px + e, py - 1, P.I3);
    }
  }
}
// ---------------------------------------------------------------- tungsten lattice
const W_ATOMS = (function () {
  const a = []; for (let j = -3; j <= 3; j++) for (let i = -2; i <= 2; i++) a.push([i * 112 + (j & 1 ? 56 : 0), j * 96]); return a;
})();
function drawLattice(view, t, opt) {
  opt = opt || {};
  const s = view.s, X = l => view.ox + l * s, Y = l => view.oy + l * s;
  clear(P.BG);
  if (opt.heat) rect(0, 0, W, H, P.HF1, 0.18 * opt.heat);
  for (const [ax, ay] of W_ATOMS) {
    const x = X(ax), y = Y(ay);
    if (x < -60 * s || x > W + 60 * s || y < -60 * s || y > H + 60 * s) continue;
    ring(x, y, 44 * s, 1, P.N3, 0.6); ring(x, y, 30 * s, 1, P.N4, 0.7);
    for (let k = 0; k < 3; k++) { const a = t * (0.9 + k * 0.3) + k * 2.1 + ax * 0.01; disc(x + Math.cos(a) * (k ? 44 : 30) * s, y + Math.sin(a) * (k ? 44 : 30) * s, Math.max(0.8, 1.8 * s), P.S0); }
    glow(x, y, 22 * s, P.T1, null, 0.5);
    shade(maskDisc(x, y, 13 * s), P.T3, P.T5, P.T1, P.T0, { k: Math.max(1, Math.round(2 * s)) });
    const pl = Math.max(2, Math.round(4.4 * s));
    rect(x - pl, y - 0.5 * Math.max(1, s), x + pl + 1, y + 0.5 * Math.max(1, s) + 1, P.C6);
    rect(x - 0.5 * Math.max(1, s), y - pl, x + 0.5 * Math.max(1, s) + 1, y + pl + 1, P.C6);
  }
}
// precomputed electron flights past a nucleus (attractive Coulomb-like force)
// returns {pts:[[x,y,t]...], emitT, emitPt, dirOut}
function flight(nx, ny, b, v0, loss, k, y0) {
  let x = nx + b, y = y0 === undefined ? ny - 260 : y0, vx = 0, vy = v0, tt = 0;
  const pts = []; let emitted = false, emitT = 0, emitPt = null, rmin = 1e9;
  const dt = 1 / 600;
  for (let i = 0; i < 4000 && y < ny + 420 && Math.abs(x - nx) < 400; i++) {
    const dx = nx - x, dy = ny - y, r = Math.max(6, Math.hypot(dx, dy));
    const a = k / (r * r);
    vx += a * dx / r * dt; vy += a * dy / r * dt;
    x += vx * dt; y += vy * dt; tt += dt;
    if (r < rmin) rmin = r; else if (!emitted && r > rmin + 0.5) {
      emitted = true; emitT = tt; emitPt = [x, y];
      const f = Math.sqrt(1 - loss); vx *= f; vy *= f;
    }
    if (i % 3 === 0) pts.push([x, y, tt]);
  }
  return { pts, emitT, emitPt };
}
function flightAt(F, tt) {
  const p = F.pts; if (tt <= p[0][2]) return p[0];
  let lo = 0, hi = p.length - 1; if (tt >= p[hi][2]) return p[hi];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][2] <= tt) lo = m; else hi = m; }
  const f = (tt - p[lo][2]) / (p[hi][2] - p[lo][2]);
  return [lerp(p[lo][0], p[hi][0], f), lerp(p[lo][1], p[hi][1], f), tt];
}
// ---------------------------------------------------------------- water field
const WAT = (function () {
  const a = []; let id = 0;
  for (let j = -9; j <= 9; j++) for (let i = -6; i <= 6; i++) {
    a.push({ id: id++, x: i * 38 + (hash2(i, j) - 0.5) * 18 + (j & 1 ? 19 : 0), y: j * 36 + (hash2(j, i + 40) - 0.5) * 14, a: hash2(i + 7, j + 3) * TAU });
  }
  return a;
})();
function waterPos(m, t) { return [m.x + Math.sin(t * 1.3 + m.id * 1.7) * 1.6, m.y + Math.cos(t * 1.1 + m.id * 2.3) * 1.6, m.a + Math.sin(t * 0.9 + m.id) * 0.25]; }
// draw one water-like molecule; kind: 'w' water, 'ion' H2O+, 'oh' radical, 'h3o' hydronium
function molecule(x, y, ang, s, kind, opt) {
  opt = opt || {};
  const nH = kind === 'oh' ? 1 : kind === 'h3o' ? 3 : 2;
  const ox = kind === 'oh', oc = ox ? [P.O2, P.O3, P.O1, P.O0] : [P.W2, P.W3, P.W1, P.W0];
  const hc = ox ? [P.O3, P.I3, P.O1, P.O0] : [P.W3, P.I3, P.W1, P.W0];
  const hs = [];
  if (nH === 1) hs.push(ang); else if (nH === 2) hs.push(ang - 0.92, ang + 0.92); else hs.push(ang - 1.1, ang + 1.1, ang + Math.PI);
  const back = [], front = [];
  for (const a of hs) (Math.sin(a) < 0 ? back : front).push(a);
  const dH = 8.5 * s, rH = Math.max(1.5, 3.6 * s), rO = Math.max(2, 6.2 * s);
  if (opt.glow) glow(x, y, 16 * s, ox ? P.O1 : P.W1, ox ? P.O2 : P.W2, opt.glow);
  for (const a of back) shade(maskDisc(x + Math.cos(a) * dH, y + Math.sin(a) * dH, rH), hc[0], hc[1], hc[2], hc[3]);
  shade(maskDisc(x, y, rO), oc[0], oc[1], oc[2], oc[3], { k: Math.max(1, Math.round(s)) });
  for (const a of front) shade(maskDisc(x + Math.cos(a) * dH, y + Math.sin(a) * dH, rH), hc[0], hc[1], hc[2], hc[3]);
  if (kind === 'oh') { // unpaired electron dot
    const a = ang + Math.PI; const px = x + Math.cos(a) * (rO + 2.5 * s), py = y + Math.sin(a) * (rO + 2.5 * s);
    rect(px - 1, py - 1, px + 1, py + 1, P.SH); rect(px - 0.5, py - 0.5, px + 1.5, py + 1.5, P.INK);
  }
  if (kind === 'ion' || kind === 'h3o') { // + charge mark
    const px = x + rO + 3, py = y - rO - 3;
    rect(px - 3, py - 1, px + 4, py + 2, P.SH); rect(px - 1, py - 3, px + 2, py + 4, P.SH);
    rect(px - 2, py, px + 3, py + 1, P.INK); rect(px, py - 2, px + 1, py + 3, P.INK);
  }
}
function drawWaterField(view, t, opt) {
  opt = opt || {};
  const s = view.s;
  clear(P.BG);
  for (const m of WAT) {
    if (opt.skip && opt.skip.has(m.id)) continue;
    const [mx, my, ma] = waterPos(m, t);
    const x = view.ox + mx * s, y = view.oy + my * s;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const st = opt.state ? opt.state(m.id) : null;
    molecule(x, y, ma, s * (st && st.big ? st.big : 1), st && st.kind ? st.kind : 'w', { glow: st && st.glow });
  }
}
