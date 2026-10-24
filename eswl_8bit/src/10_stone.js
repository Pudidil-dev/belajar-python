'use strict';
// ============================================================================
// THE STONE — stone-local units (1 unit = 5 mm), +y = proximal face (towards
// the treatment head; the shock wave travels in -y, up the screen).
// Calcium-oxalate-like structure: concentric growth layers, radial
// striations, crystal grains (visible at high zoom), small pre-existing flaws.
// A fixed fracture network (jittered Voronoi cells) means cracks only ever grow
// along the boundaries on which the stone later splits: the fragments in the
// fragmentation scene are exactly the regions the earlier cracks outlined.
// ============================================================================
const SU = 5;                                    // mm per stone unit
const SAX = 1.12, SAY = 0.9;
function stoneRr(th) { return 1 + 0.06 * Math.cos(2 * th + 0.4) + 0.045 * Math.cos(3 * th + 1.9) + 0.025 * Math.cos(5 * th + 0.7) + 0.012 * Math.cos(9 * th + 2.3); }
function stoneU(x, y) { const a = x / SAX, b = y / SAY; return Math.hypot(a, b) / stoneRr(Math.atan2(b, a)); }
const SEEDS = [[-0.55, -0.64], [0.05, -0.70], [0.62, -0.60], [-0.90, -0.06], [-0.38, -0.13], [0.30, -0.16], [0.86, -0.04], [-0.64, 0.52], [-0.10, 0.50], [0.45, 0.50]];
const NS = SEEDS.length;
// pre-existing flaws [x, y, angle]; flaw 0 sits where the first microcrack starts
const FLAWS = [[-0.02, -0.40, 0.3], [0.45, 0.10, 1.9], [-0.60, 0.20, 0.9], [0.16, 0.30, 2.6], [0.70, -0.38, 0.2], [-0.45, -0.38, 1.3], [0.02, 0.10, 1.2]];
const SL = new Float32Array(NS * NS);
const EDGE = new Int16Array(NS * NS).fill(-1);
const EDGES = [], FRAG = [], PITS = [];
function crackW(x, y) { return 0.09 * (vn2(x * 7 + 3.1, y * 7 + 1.7, 11) - 0.5) + 0.036 * (vn2(x * 19, y * 19, 12) - 0.5); }
// nearest two seeds -> a < b and signed distance to their (jittered) boundary, > 0 inside a
const _nn = { a: 0, b: 1, sd: 0 };
function nearest2(x, y) {
  let i1 = 0, i2 = 1, e1 = Infinity, e2 = Infinity;
  for (let i = 0; i < NS; i++) {
    const dx = x - SEEDS[i][0], dy = y - SEEDS[i][1], e = dx * dx + dy * dy;
    if (e < e1) { e2 = e1; i2 = i1; e1 = e; i1 = i; } else if (e < e2) { e2 = e; i2 = i; }
  }
  const a = i1 < i2 ? i1 : i2, b = i1 < i2 ? i2 : i1, ea = a === i1 ? e1 : e2, eb = a === i1 ? e2 : e1;
  _nn.a = a; _nn.b = b; _nn.sd = (eb - ea) / (2 * SL[a * NS + b]) - crackW(x, y);
  return _nn;
}
function fragOf(x, y) { const n = nearest2(x, y); return n.sd > 0 ? n.a : n.b; }
function pitted(x, y, lv) {
  if (lv <= 0 || y < 0.3) return false;
  for (let i = 0; i < PITS.length; i++) { const p = PITS[i]; if (lv > p[3]) { const dx = x - p[0], dy = y - p[1]; if (dx * dx + dy * dy < p[2] * p[2]) return true; } }
  return false;
}
function stoneInit() {
  for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) SL[i * NS + j] = Math.hypot(SEEDS[i][0] - SEEDS[j][0], SEEDS[i][1] - SEEDS[j][1]) || 1;
  const pts = {}, fs = [];
  for (let i = 0; i < NS; i++) fs.push({ n: 0, sx: 0, sy: 0, x0: 9, y0: 9, x1: -9, y1: -9 });
  const st = 0.008;
  for (let y = -1.0; y <= 1.0; y += st) for (let x = -1.26; x <= 1.26; x += st) {
    if (stoneU(x, y) > 1) continue;
    const n = nearest2(x, y), f = n.sd > 0 ? n.a : n.b, F = fs[f];
    F.n++; F.sx += x; F.sy += y; F.x0 = Math.min(F.x0, x); F.x1 = Math.max(F.x1, x); F.y0 = Math.min(F.y0, y); F.y1 = Math.max(F.y1, y);
    if (Math.abs(n.sd) < 0.006) { const key = n.a * NS + n.b; (pts[key] = pts[key] || []).push(x, y); }
  }
  for (let i = 0; i < NS; i++) {
    const F = fs[i], cx = F.sx / Math.max(1, F.n), cy = F.sy / Math.max(1, F.n), l = Math.hypot(cx, cy + 0.05) || 1;
    // gentle separation: pieces drift apart a little, turn a little, settle (no explosion)
    FRAG.push({ cx, cy, x0: F.x0 - 0.02, y0: F.y0 - 0.02, x1: F.x1 + 0.02, y1: F.y1 + 0.02, n: F.n,
      ox: cx / l * (0.16 + 0.1 * hash(i * 7 + 1)), oy: (cy + 0.05) / l * (0.13 + 0.08 * hash(i * 7 + 2)), rot: (hash(i * 7 + 3) - 0.5) * 0.7, sink: 0.05 + 0.08 * hash(i * 7 + 4) });
  }
  for (const key of Object.keys(pts).map(Number)) {
    const p = pts[key]; if (p.length < 16) continue;
    const a = Math.floor(key / NS), b = key % NS;
    const ux = SEEDS[b][0] - SEEDS[a][0], uy = SEEDS[b][1] - SEEDS[a][1], ul = Math.hypot(ux, uy), dx = -uy / ul, dy = ux / ul;
    let mx = 0, my = 0; for (let i = 0; i < p.length; i += 2) { mx += p[i]; my += p[i + 1]; } mx /= p.length / 2; my /= p.length / 2;
    const horiz = Math.abs(dx) > 0.6;
    let cls, ix, iy;
    if (horiz && my < -0.2) { cls = 'spall'; ix = FLAWS[0][0]; iy = FLAWS[0][1]; }       // parallel to the distal face
    else if (!horiz && Math.abs(mx) < 0.5 && my > 0.1) { cls = 'prox'; ix = mx; iy = 1.0; } // from the eroded front face
    else if (!horiz && Math.abs(mx) < 0.5) { cls = 'axial'; ix = mx; iy = -0.45; }          // along the wave axis
    else { cls = 'other'; ix = 0; iy = -0.25; }
    let best = 1e9, sx = mx, sy = my;
    for (let i = 0; i < p.length; i += 2) { const e = (p[i] - ix) ** 2 + (p[i + 1] - iy) ** 2; if (e < best) { best = e; sx = p[i]; sy = p[i + 1]; } }
    let lmax = 0, pmin = 0, pmax = 0;
    for (let i = 0; i < p.length; i += 2) {
      lmax = Math.max(lmax, Math.hypot(p[i] - sx, p[i + 1] - sy));
      const q = (p[i] - sx) * dx + (p[i + 1] - sy) * dy; pmin = Math.min(pmin, q); pmax = Math.max(pmax, q);
    }
    EDGE[a * NS + b] = EDGES.length;
    EDGES.push({ a, b, cls, sx, sy, dx, dy, lmax: lmax + 0.02, pmin, pmax, mx, my, d0: 0.5, d1: 0.8 });
  }
  // damage windows (D = accumulated damage 0..1): the first microcrack starts at
  // flaw 0 and runs along the spall plane; axial cracks follow; cracks from the
  // cavitation-eroded front face next; the remaining boundaries close the network.
  const dist0 = e => Math.hypot(e.sx - FLAWS[0][0], e.sy - FLAWS[0][1]);
  EDGES.filter(e => e.cls === 'spall').sort((p, q) => dist0(p) - dist0(q)).forEach((e, i) => { e.d0 = i === 0 ? 0 : 0.08 + 0.07 * i; e.d1 = i === 0 ? 0.14 : e.d0 + 0.26; });
  EDGES.filter(e => e.cls === 'axial').forEach((e, i) => { e.d0 = 0.16 + 0.06 * i; e.d1 = e.d0 + 0.3; });
  EDGES.filter(e => e.cls === 'prox').forEach((e, i) => { e.d0 = 0.3 + 0.08 * i; e.d1 = e.d0 + 0.3; });
  EDGES.filter(e => e.cls === 'other').forEach((e, i) => { e.d0 = 0.42 + 0.27 * hash(i * 13 + 5); e.d1 = Math.min(0.97, e.d0 + 0.28); });
  // cavitation pits on the proximal face (most where bubbles cluster, near the axis)
  for (let i = 0; i < 16; i++) {
    const ph = Math.PI / 2 + (hash(i * 5 + 1) - 0.5) * 1.9, r = stoneRr(ph);
    const c = 1 - Math.abs(ph - Math.PI / 2) / 0.95;
    PITS.push([SAX * r * Math.cos(ph), SAY * r * Math.sin(ph), 0.022 + 0.035 * hash(i * 5 + 2) * (0.5 + c), clamp(0.05 + 0.85 * hash(i * 5 + 3) * (1.2 - c * 0.6), 0, 0.95)]);
  }
  crystalInit();
}
// ---------------------------------------------------------------- draw the stone
// cam: Cam in mm (stone centre at the origin). st: {D damage 0..1, sep separation 0..1,
// squash, flash, pits (erosion 0..1), flawGlow, flawGrow, bands: [{y0, y1, c, lv}] in
// stone units, open (crack opening), cls (show only one crack family)}
const SID = new Uint8Array(W * H);
let STRAMP = null;
// base tone of a stone point (growth layers, striations, nucleus, light, grains)
function stoneTone(x, y, u, k) {
  const th = Math.atan2(y / SAY, x / SAX);
  const lam = u * 7.2 + 0.45 * vn2(x * 2.4 + 9, y * 2.4, 5), band = Math.floor(lam), fl = lam - band;
  let v = u < 0.2 ? 2.0 : 2.75 + ((band & 1) ? 0.35 : -0.05);
  if (fl < 0.13 && u > 0.18) v -= 0.85;
  if (u > 0.3 && Math.sin(th * 28 + 2.5 * vn2(u * 3, th * 2, 7)) > 0.93) v -= 0.4;
  v += 1.05 * u * ((x / SAX) * -0.55 + (y / SAY) * -0.83);
  if (k > 240) { // crystal grains with two-tone facets
    const gk = 0.042, gx = x / gk, gy = y / gk, ix = Math.floor(gx), iy = Math.floor(gy);
    let e1 = 9, e2 = 9, cid = 0, fx = 0, fy = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j, dx = gx - cx - hash3(cx, cy, 21), dy = gy - cy - hash3(cx, cy, 22), e = dx * dx + dy * dy;
      if (e < e1) { e2 = e1; e1 = e; cid = cx * 7919 + cy; fx = dx; fy = dy; } else if (e < e2) e2 = e;
    }
    if (Math.sqrt(e2) - Math.sqrt(e1) < 1.1 / (gk * k)) v -= 0.9;
    else { const a = hash(cid) * TAU; v += (hash(cid + 77) - 0.5) * 0.7 + (fx * Math.cos(a) + fy * Math.sin(a) > 0 ? 0.25 : -0.2); }
  }
  return v;
}
function crackCol(e, dpx, s, D, k, open, bx, by) { // colour of a crack pixel, or 0
  const E = EDGES[e], pr = clamp((D - E.d0) / (E.d1 - E.d0), 0, 1);
  if (pr <= 0) return 0;
  const len = pr * E.lmax; if (s > len) return 0;
  const hw = 0.72 + 1.1 * clamp((D - E.d1) / 0.12, 0, 1) * open;
  if (dpx < hw) return (hw > 1.2 && dpx < hw - 0.75) ? P.ST0 : (pr < 1 && len - s < 3.5 / k ? P.MC2 : P.MC1);
  if (pr < 1 && dpx < hw + 2.5 && bay(bx, by) < 0.5) return P.MC0;
  return 0;
}
// static views reuse the per-pixel geometry (tone, crack distances) between frames
const SCACHE = [];
function stoneCache(cam, pits, x0, y0, x1, y1, k, ox, oy) {
  const key = cam.cx + '|' + cam.cy + '|' + cam.z + '|' + cam.ax + '|' + cam.ay + '|' + pits;
  for (const C of SCACHE) if (C.key === key) return C;
  const w = x1 - x0 + 1, n = w * (y1 - y0 + 1);
  const C = { key, id: new Uint8Array(n), v: new Float32Array(n), ly: new Float32Array(n), e: new Int16Array(n).fill(-1), dpx: new Float32Array(n), s: new Float32Array(n) };
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const i = (py - y0) * w + px - x0, x = (px + 0.5 - ox) / k, y = (py + 0.5 - oy) / k;
    if (Math.abs(x) > 1.3 || Math.abs(y) > 1.1) continue;
    const u = stoneU(x, y); if (u > 1 || pitted(x, y, pits)) continue;
    C.id[i] = 1; C.v[i] = stoneTone(x, y, u, k); C.ly[i] = y;
    const nn = nearest2(x, y), e = EDGE[nn.a * NS + nn.b];
    if (e >= 0) { C.e[i] = e; C.dpx[i] = Math.abs(nn.sd) * k; C.s[i] = Math.hypot(x - EDGES[e].sx, y - EDGES[e].sy); }
  }
  SCACHE.push(C); if (SCACHE.length > 4) SCACHE.shift();
  return C;
}
function drawStone(cam, st) {
  if (!STRAMP) STRAMP = [P.ST0, P.ST1, P.ST2, P.ST3, P.ST4, P.ST5];
  const k = cam.z * SU, ox = cam.x(0), oy = cam.y(0);
  const sq = st.squash || 0, sx = 1 + sq * 0.3, sy = 1 - sq;
  const sep = st.sep || 0, D = st.D || 0, pits = st.pits || 0, flash = st.flash || 0, open = st.open === undefined ? 1 : st.open;
  const bands = st.bands || null, cls = st.cls || null;
  const ext = (1.32 + sep * 0.5) * k + 3;
  const x0 = Math.max(1, Math.floor(ox - ext * 1.2)), x1 = Math.min(W - 2, Math.ceil(ox + ext * 1.2));
  const y0 = Math.max(1, Math.floor(oy - ext)), y1 = Math.min(H - 2, Math.ceil(oy + ext));
  if (x0 > x1 || y0 > y1) return;
  if (sq === 0 && sep === 0) { // cached path
    const C = stoneCache(cam, pits, x0, y0, x1, y1, k, ox, oy), w = x1 - x0 + 1;
    for (let py = y0; py <= y1; py++) {
      const row = py * W, b0 = (py - y0) * w - x0;
      for (let px = x0; px <= x1; px++) {
        const i = b0 + px, id = C.id[i]; SID[row + px] = id; if (!id) continue;
        let col = STRAMP[clamp(Math.floor(C.v[i] + flash * 1.6 + bay(px, py) - 0.5), 1, 5)];
        if (bands) { const y = C.ly[i]; for (let b = 0; b < bands.length; b++) { const B = bands[b]; if (y >= B.y0 && y <= B.y1 && bay(px, py) < B.lv) col = B.c; } }
        const e = C.e[i];
        if (D > 0 && e >= 0 && (!cls || EDGES[e].cls === cls)) { const c = crackCol(e, C.dpx[i], C.s[i], D, k, open, px, py); if (c) col = c; }
        buf[row + px] = col;
      }
    }
  } else { // moving / squashed / separated stone: evaluate directly
    const ft = [];
    if (sep > 0) for (let f = 0; f < NS; f++) { const F = FRAG[f], a = F.rot * sep; ft.push([Math.cos(a), Math.sin(a), F.ox * sep, F.oy * sep + F.sink * sep * sep]); }
    for (let py = y0; py <= y1; py++) {
      const row = py * W;
      for (let px = x0; px <= x1; px++) {
        const qx = (px + 0.5 - ox) / (k * sx), qy = (py + 0.5 - oy) / (k * sy);
        let x = qx, y = qy, id = 1, u = 2;
        if (sep > 0) {
          id = 0;
          for (let g = 0; g < NS; g++) {
            const T = ft[g], F = FRAG[g], rx = qx - F.cx - T[2], ry = qy - F.cy - T[3];
            const lx = rx * T[0] + ry * T[1] + F.cx, ly = -rx * T[1] + ry * T[0] + F.cy;
            if (lx < F.x0 || lx > F.x1 || ly < F.y0 || ly > F.y1) continue;
            const uu = stoneU(lx, ly);
            if (uu > 1 || pitted(lx, ly, pits) || fragOf(lx, ly) !== g) continue;
            id = g + 1; x = lx; y = ly; u = uu; break;
          }
        } else if (Math.abs(qx) > 1.3 || Math.abs(qy) > 1.1 || (u = stoneU(qx, qy)) > 1 || pitted(qx, qy, pits)) id = 0;
        SID[row + px] = id;
        if (!id) continue;
        let col = STRAMP[clamp(Math.floor(stoneTone(x, y, u, k) + flash * 1.6 + bay(px, py) - 0.5), 1, 5)];
        if (bands) for (let b = 0; b < bands.length; b++) { const B = bands[b]; if (y >= B.y0 && y <= B.y1 && bay(px, py) < B.lv) col = B.c; }
        if (sep === 0 && D > 0) {
          const nn = nearest2(x, y), e = EDGE[nn.a * NS + nn.b];
          if (e >= 0 && (!cls || EDGES[e].cls === cls)) { const c = crackCol(e, Math.abs(nn.sd) * k, Math.hypot(x - EDGES[e].sx, y - EDGES[e].sy), D, k, open, px, py); if (c) col = c; }
        }
        buf[row + px] = col;
      }
    }
  }
  // outline, top-left rim light, bottom-right shade, dark outer line (also between separated pieces)
  for (let py = y0; py <= y1; py++) {
    const row = py * W;
    for (let px = x0; px <= x1; px++) {
      const id = SID[row + px];
      const l = px > x0 ? SID[row + px - 1] : 0, r = px < x1 ? SID[row + px + 1] : 0, u = py > y0 ? SID[row - W + px] : 0, d = py < y1 ? SID[row + W + px] : 0;
      if (id) {
        if (l !== id || r !== id || u !== id || d !== id) buf[row + px] = P.ST0;
        else if (py > y0 + 1 && px > x0 + 1 && (SID[row - W + px - 1] !== id || (k > 150 && SID[row - 2 * W + px - 2] !== id))) buf[row + px] = flash > 0.3 ? P.SW2 : P.ST5;
        else if (py < y1 - 1 && px < x1 - 1 && SID[row + W + px + 1] !== id) buf[row + px] = P.ST1;
      } else if (l || r || u || d) buf[row + px] = P.SH;
    }
  }
  if (sep > 0) return;
  const g = st.flawGlow || 0; // pre-existing flaws (stress concentrates at them)
  for (let i = 0; i < FLAWS.length; i++) {
    const fx = FLAWS[i][0], fy = FLAWS[i][1], fa = FLAWS[i][2];
    if (pitted(fx, fy, pits)) continue;
    const X = ox + fx * k * sx, Y = oy + fy * k * sy;
    if (g > 0) glow(X, Y, (3 + 0.045 * k) * (0.6 + 0.4 * g), P.MS1, P.MS2, g);
    if (k < 160) { pset(X, Y, P.ST0); if (k > 60) pset(X + 1, Y, P.ST1); }
    else {
      const L = 0.03 * k * (1 + (st.flawGrow || 0)), w = Math.max(1, 0.008 * k), c = Math.cos(fa), s = Math.sin(fa);
      lineW(X - c * L, Y - s * L, X + c * L, Y + s * L, w, P.ST0);
      if (g > 0.3) { disc(X - c * L, Y - s * L, 1.2, P.MS3); disc(X + c * L, Y + s * L, 1.2, P.MS3); }
    }
  }
  if (D > 0) for (const E of EDGES) { // glowing tips of growing cracks (crack-tip stress concentration)
    if (cls && E.cls !== cls) continue;
    const pr = clamp((D - E.d0) / (E.d1 - E.d0), 0, 1); if (pr <= 0 || pr >= 1) continue;
    const len = pr * E.lmax;
    for (const sg of [1, -1]) {
      const lim = sg > 0 ? E.pmax : -E.pmin; if (lim < 0.01 || len >= lim) continue;
      const q = len * sg, tx = E.sx + E.dx * q, ty = E.sy + E.dy * q;
      if (stoneU(tx, ty) > 0.98) continue;
      glow(ox + tx * k * sx, oy + ty * k * sy, 2.5 + 0.018 * k, P.MS0, P.MC1, 0.75);
    }
  }
}
// screen position of a stone-local point
function stonePt(cam, st, x, y) { const k = cam.z * SU, sq = st.squash || 0; return [cam.x(st.cx || 0) + x * k * (1 + sq * 0.3), cam.y(st.cy || 0) + y * k * (1 - sq)]; }
// ---------------------------------------------------------------- micro view: crystal grains at the first microcrack
// grain units (1 = 0.21 mm = the stone's grain size); origin = flaw 0; the crack
// chain runs in +x along grain boundaries (seeds straddle every crack segment).
const GU = 0.21;
const CRY = { s: [], b: null, x0: -30, y0: -46, cs: 2, nx: 30, ny: 46, path: [], br: [] };
function crystalInit() {
  const R = i => hash(i * 9301 + 4929);
  const path = [];
  let x = -30, y = 0;
  for (let i = 0; x < 31; i++) { path.push(x, y); x += 0.9 + 0.45 * R(i); y = clamp(y * 0.55 + (R(i + 500) - 0.5) * 1.4, -1.1, 1.1); }
  const s = [];
  for (let i = 0; i + 3 < path.length; i += 2) {
    const ax = path[i], ay = path[i + 1], bx = path[i + 2], by = path[i + 3], mx = (ax + bx) / 2, my = (ay + by) / 2;
    const l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l, o = 0.48 + 0.14 * R(i + 900);
    s.push(mx + nx * o, my + ny * o, mx - nx * o, my - ny * o);
    if (R(i + 1300) > 0.72) CRY.br.push({ x: ax, y: ay, a: Math.atan2(ny, nx) * (R(i + 1400) > 0.5 ? 1 : -1) + (R(i + 1500) - 0.5) * 0.9, L: 0.9 + 0.9 * R(i + 1600) });
  }
  const np = s.length;
  for (let gy = -46; gy < 46; gy += 1.15) for (let gx = -30; gx < 30; gx += 1.15) {
    const hx = Math.round(gx * 10), hy = Math.round(gy * 10);
    const px = gx + (hash3(hx, hy, 31) - 0.5) * 0.9, py = gy + (hash3(hx, hy, 32) - 0.5) * 0.9;
    if (Math.abs(py) < 2.6) { let near = false; for (let j = 0; j < np; j += 2) if ((s[j] - px) ** 2 + (s[j + 1] - py) ** 2 < 0.8) { near = true; break; } if (near) continue; }
    s.push(px, py);
  }
  CRY.s = s; CRY.path = path; CRY.b = [];
  for (let i = 0; i < CRY.nx * CRY.ny; i++) CRY.b.push([]);
  for (let j = 0; j < s.length; j += 2) {
    const bx = Math.floor((s[j] - CRY.x0) / CRY.cs), by = Math.floor((s[j + 1] - CRY.y0) / CRY.cs);
    if (bx >= 0 && by >= 0 && bx < CRY.nx && by < CRY.ny) CRY.b[by * CRY.nx + bx].push(j);
  }
}
// cam in grain units; opt: {tip: crack tip x, glow}
function drawCrystal(cam, opt) {
  if (!STRAMP) STRAMP = [P.ST0, P.ST1, P.ST2, P.ST3, P.ST4, P.ST5];
  const z = cam.z, bw = 1.15 / z, S = CRY.s;
  for (let py = 0; py < H; py++) {
    const wy = cam.wy(py + 0.5), row = py * W, by = Math.floor((wy - CRY.y0) / CRY.cs);
    for (let px = 0; px < W; px++) {
      const wx = cam.wx(px + 0.5), bx = Math.floor((wx - CRY.x0) / CRY.cs);
      let e1 = 1e9, e2 = 1e9, id = -1;
      for (let j = by - 1; j <= by + 1; j++) {
        if (j < 0 || j >= CRY.ny) continue;
        for (let i = bx - 1; i <= bx + 1; i++) {
          if (i < 0 || i >= CRY.nx) continue;
          const L = CRY.b[j * CRY.nx + i];
          for (let q = 0; q < L.length; q++) { const s = L[q], dx = wx - S[s], dy = wy - S[s + 1], e = dx * dx + dy * dy; if (e < e1) { e2 = e1; e1 = e; id = s; } else if (e < e2) e2 = e; }
        }
      }
      if (id < 0) { buf[row + px] = P.ST1; continue; }
      let v;
      if (Math.sqrt(e2) - Math.sqrt(e1) < bw) v = 1.2;
      else {
        const a = hash(id * 3 + 1) * TAU, fx = wx - S[id], fy = wy - S[id + 1];
        v = 2.7 + (hash(id * 3 + 2) - 0.5) * 1.0 + (fx * Math.cos(a) + fy * Math.sin(a) > 0 ? 0.45 : -0.3) - 0.25 * (fx * 0.5 + fy * 0.8);
        const m = (wy - 0.32 * wx) / 7 + 0.15 * vn2(wx * 0.3, wy * 0.3, 41);   // organic matrix layer
        if (Math.abs(m - Math.round(m)) < 0.1) v -= 0.55;
      }
      buf[row + px] = STRAMP[clamp(Math.floor(v + bay(px, py) - 0.5), 1, 5)];
    }
  }
  const tip = opt.tip === undefined ? 99 : opt.tip, Pp = CRY.path, th = Math.max(1, 0.14 * z);
  for (const B of CRY.br) {
    if (B.x > tip) continue;
    const g = clamp((tip - B.x) / 1.2, 0, 1), ex = B.x + Math.cos(B.a) * B.L * g, ey = B.y + Math.sin(B.a) * B.L * g;
    lineW(cam.x(B.x), cam.y(B.y), cam.x(ex), cam.y(ey), Math.max(1, th * 0.45), P.MC1);
  }
  let tx = null, ty = null;
  for (let i = 0; i + 3 < Pp.length; i += 2) {
    const ax = Pp[i], ay = Pp[i + 1]; let bx = Pp[i + 2], by = Pp[i + 3];
    if (ax >= tip) break;
    if (bx > tip) { const f = (tip - ax) / (bx - ax); bx = ax + (bx - ax) * f; by = ay + (by - ay) * f; tx = bx; ty = by; }
    const X0 = cam.x(ax), Y0 = cam.y(ay), X1 = cam.x(bx), Y1 = cam.y(by);
    if (Math.max(X0, X1) < -8 || Math.min(X0, X1) > W + 8) continue;
    lineW(X0, Y0, X1, Y1, th + 3, P.MC0, 0.5);
    lineW(X0, Y0, X1, Y1, th, P.MC1);
    if (th >= 2.5) lineW(X0, Y0, X1, Y1, th * 0.4, P.ST0);
  }
  if (tx !== null && opt.glow !== false) { const X = cam.x(tx), Y = cam.y(ty); glow(X, Y, 2.4 * z, P.MS0, P.MS1, 0.9); disc(X, Y, Math.max(1.5, 0.2 * z), P.MC2); }
}
