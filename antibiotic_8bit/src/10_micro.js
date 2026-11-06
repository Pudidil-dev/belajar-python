'use strict';
// ============================================================================
// THE MICRO WORLD (units of 25 nm, y down): tissue fluid between cells, with
// rod-shaped Gram-positive bacteria (100 x 32 units = 2.5 x 0.8 um). A cell is
// drawn per pixel from a capsule distance field, so every state is one drawing:
// the thick wall (cyan), the membrane (turquoise), the cytoplasm (green) with
// ribosomes and the nucleoid; a weakened wall patch (red-orange), the gap, the
// membrane bulging through it, the tear and the outflow; a band of new wall;
// the cutaway that lifts wall and membrane off in layers.
// Light comes from the upper left; edges get a same-hue dark outline.
// ============================================================================
const MW = { wt: 4.6, mt: 1.8 };   // a thick Gram-positive wall
// cells in the middle layer: X opens the film (and lyses again at its end, the loop cell), Y is the hero, M takes the match cut
const CELLS = [
  { id: 'X', x: 0, y: 0, a: -0.38, L: 34, R: 16, seed: 1 },
  { id: 'Y', x: -470, y: 300, a: 0.0, L: 32, R: 16, seed: 2 },
  { id: 'M', x: 168, y: 142, a: -0.3, L: 34, R: 16, seed: 3 },
  { id: 'n', x: -118, y: -96, a: 0.9, L: 30, R: 15, seed: 4 }, { id: 'n', x: 120, y: -150, a: -1.2, L: 36, R: 16, seed: 5 },
  { id: 'n', x: -150, y: 120, a: 0.25, L: 33, R: 16, seed: 6 }, { id: 'n', x: 40, y: 230, a: 1.35, L: 30, R: 15, seed: 7 },
  { id: 'n', x: 300, y: 10, a: 0.5, L: 34, R: 16, seed: 8 }, { id: 'n', x: -330, y: 170, a: -0.6, L: 32, R: 15, seed: 9 },
  { id: 'n', x: -260, y: 260, a: 1.1, L: 30, R: 15, seed: 10 }, { id: 'n', x: -640, y: 380, a: -0.4, L: 34, R: 16, seed: 11 },
  { id: 'n', x: -380, y: 470, a: 0.7, L: 32, R: 16, seed: 12 }, { id: 'n', x: -700, y: 200, a: 1.4, L: 31, R: 15, seed: 13 },
  { id: 'n', x: -560, y: 560, a: 0.15, L: 33, R: 16, seed: 14 }, { id: 'n', x: 280, y: 280, a: -0.9, L: 32, R: 15, seed: 15 },
  { id: 'n', x: -840, y: 330, a: 0.3, L: 34, R: 16, seed: 16 }, { id: 'n', x: -200, y: 420, a: -0.3, L: 30, R: 15, seed: 17 },
];
const cellById = id => CELLS.find(c => c.id === id);
// every cell drifts and turns a little, periodic over the 60 s loop
function cellPose(c, t) {
  return { x: c.x + 3 * wob(t, 1, c.seed) + 1.5 * wob(t, 3, c.seed * 2), y: c.y + 3 * wob(t, 1, c.seed + 1.3) + 1.5 * wob(t, 2, c.seed * 3), a: c.a + 0.05 * wob(t, 1, c.seed * 5) };
}
// ---------------------------------------------------------------- one cell, per pixel
// st: { L, weak 0..1, gap (half width), rb (bulge radius), tear 0..1, empty 0..1, band 0..1, lid 0..1, mem 0..1, far }
const RAMP_WALL = () => [P.PG1, P.PG3, P.PG4, P.PG0, P.PG2], RAMP_WALL_FAR = () => [P.PG1, P.PG2, P.PG3, P.PG0, P.PG1];
const RAMP_DMG = () => [P.DM1, P.DM3, P.DM4, P.DM0, P.DM2];
function drawCell(cam, c, pose, st) {
  st = st || {};
  const L = st.L || c.L, R = c.R, wt = MW.wt, mt = MW.mt, ca = Math.cos(pose.a), sa = Math.sin(pose.a);
  const rb = st.rb || 0, ext = L + R + rb + 8, o = 1 / cam.z;
  const X0 = Math.max(0, Math.floor(cam.x(pose.x - ext))), X1 = Math.min(W - 1, Math.ceil(cam.x(pose.x + ext)));
  const Y0 = Math.max(0, Math.floor(cam.y(pose.y - ext))), Y1 = Math.min(H - 1, Math.ceil(cam.y(pose.y + ext)));
  if (X0 > X1 || Y0 > Y1) return;
  const far = !!st.far, RW = far ? RAMP_WALL_FAR() : RAMP_WALL(), RD = RAMP_DMG();
  const bcy = -R + wt * 0.5, gap = st.gap || 0, weak = st.weak || 0, tear = st.tear || 0, lid = st.lid || 0, mem = st.mem || 0, band = st.band || 0;
  const emptyLv = st.empty ? Math.min(2, Math.floor(st.empty * 2.99)) : 0;
  const CY = far ? [P.CP1, P.CP2, P.CP3] : [[P.CP2, P.CP3, P.CP4], [P.CP1, P.CP2, P.CP3], [P.CP0, P.CP1, P.CP2]][emptyLv];
  const MB = far ? [P.MB1, P.MB2, P.MB3, P.MB0] : [P.MB2, P.MB3, P.MB4, P.MB0];
  for (let py = Y0; py <= Y1; py++) {
    const wy = cam.wy(py + 0.5) - pose.y;
    let row = py * W;
    for (let px = X0; px <= X1; px++) {
      const wx = cam.wx(px + 0.5) - pose.x;
      const lx = wx * ca + wy * sa, ly = -wx * sa + wy * ca;
      const ax = Math.abs(lx) - L, qx = ax > 0 ? ax : 0, dd = Math.sqrt(qx * qx + ly * ly), d = dd - R;
      let db = 1e9, ux = 0, uy = 0;
      if (rb > 0) { ux = lx; uy = ly - bcy; db = Math.sqrt(ux * ux + uy * uy) - rb; }
      if (d > 0 && db > 0) continue;
      // capsule normal (local)
      let nx = dd > 1e-6 ? (lx > 0 ? qx : -qx) / dd : 0, ny = dd > 1e-6 ? ly / dd : -1;
      // the weakened patch (top side, mid-cell) thins the wall
      const wk = weak > 0 && ly < 0 ? weak * Math.max(0, 1 - Math.abs(lx) / 11) : 0, wtE = wt * (1 - 0.5 * wk);
      const di = Math.min(d + wtE, db);
      let col;
      if (di <= 0) { // protoplast: membrane and cytoplasm
        const fromBulge = db < d + wtE;
        if (fromBulge) { const l = Math.sqrt(ux * ux + uy * uy) || 1; nx = ux / l; ny = uy / l; }
        const sx = nx * ca - ny * sa, sy = nx * sa + ny * ca, lit = -(sx + sy) * 0.7071;
        const inWin = (lid > 0 || mem > 0) && ly < 0 && Math.abs(lx) < 22 && !fromBulge;
        if (di > -mt && !(inWin && mem > 0)) {
          if (tear > 0 && fromBulge && uy < 0 && Math.abs(ux) < tear * rb * 0.75) continue;   // the opening at the bulge's apex
          col = di > -o ? MB[3] : lit > 0.4 ? MB[2] : lit < -0.4 ? MB[0] : MB[1];
        } else {
          const e = di + mt;  // depth below the membrane
          col = e > -2.5 * o && lit < -0.3 ? CY[0] : e > -2 * o && lit > 0.35 ? CY[2] : CY[1];
          if (band > 0 && !far && Math.abs(Math.abs(lx) - 4) < 0.6 * Math.max(1, o) && band > (Math.abs(lx) < 2 ? 0.2 : 0.6)) col = P.PG4;   // hoops of new wall
        }
      } else { // wall band
        if (gap > 0 && ly < 0) {
          const g = gap + 1.4 * (vnoise(ly * 1.3 + lx * 0.2 + c.seed * 5, 7) - 0.5) * 2;
          if (Math.abs(lx) < g) continue;
          if (Math.abs(lx) < g + 2.4) { col = d > -o ? RD[3] : RD[1]; buf[row + px] = col; continue; }   // frayed ends
        }
        if ((lid > 0) && ly < 0 && Math.abs(lx) < 22) continue;   // the lifted lid of the cutaway
        const sx = nx * ca - ny * sa, sy = nx * sa + ny * ca, lit = -(sx + sy) * 0.7071;
        const R_ = wk > 0.5 ? RD : RW;
        if (d > -o) col = R_[3];
        else if (d < -wtE + o) col = R_[4];
        else col = lit > 0.42 ? R_[2] : lit < -0.42 ? R_[0] : R_[1];
        if (wk > 0.22 && wk <= 0.5 && col === RW[1]) col = RW[4];
        if (band > 0 && !far && Math.abs(lx) < 6 * band && col === RW[1]) col = P.PG4;
      }
      buf[row + px] = col;
    }
  }
}
// ribosomes, the nucleoid (DNA loop) inside a cell; they leave through the tear
function cellInner(cam, c, pose, st, t) {
  st = st || {}; if (cam.z < 0.55 || st.far) return;
  const L = st.L || c.L, R = c.R, ca = Math.cos(pose.a), sa = Math.sin(pose.a);
  const P_ = (lx, ly) => [pose.x + lx * ca - ly * sa, pose.y + lx * sa + ly * ca];
  const gone = st.out || 0, nR = 22;
  for (let i = 0; i < nR; i++) {
    if (i < gone * nR) continue;
    const u = hash2(c.seed, i * 3) * 2 - 1, v = hash2(c.seed, i * 3 + 1) * 2 - 1;
    const lx = u * (L + R * 0.45) + 1.2 * wob(t, 20, i), ly = v * (R - MW.wt - 4) * (Math.abs(u) > L / (L + R * 0.45) ? 0.6 : 1) + 1.0 * wob(t, 16, i * 2 + 1.57);   // periodic jiggle (seamless loop)
    const p = P_(lx, ly), r = Math.max(1, 1.15 * cam.z);
    disc(cam.x(p[0]), cam.y(p[1]), r, P.CP4); if (r > 1.6) pset(cam.x(p[0]) - r * 0.4, cam.y(p[1]) - r * 0.4, P.CP5);
  }
  if (gone > 0.85) return;
  const pts = [];
  for (let k = 0; k <= 28; k++) {
    const th = k / 28 * TAU, rx = L * 0.55 + 2.5 * Math.sin(3 * th + c.seed + LOOPW(4) * t), ry = (R - MW.wt) * 0.42 + 1.6 * Math.sin(5 * th + c.seed);
    const p = P_(Math.cos(th) * rx * (1 - gone * 0.6), Math.sin(th) * ry - gone * 6);
    pts.push(cam.x(p[0]), cam.y(p[1]));
  }
  const w = cam.z > 2.6 ? 2 : 1;
  for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], w, P.CP5);
}
// where the bulge's apex is in the world (the tear point) and its outward direction
function apexOf(c, pose, rb) { const ca = Math.cos(pose.a), sa = Math.sin(pose.a), ly = -c.R + MW.wt * 0.5 - rb; return { p: [pose.x - ly * sa, pose.y + ly * ca], dir: [sa, -ca] }; }
// the outflow after a tear: ribosomes, protein specks, DNA threads (a plume that slows and spreads; no blast)
function drawOutflow(cam, c, pose, rbMax, tTear, t) {
  const dt = t - tTear; if (dt <= 0) return;
  const ap = apexOf(c, pose, rbMax), N = 46;
  for (let i = 0; i < N; i++) {
    const te = i / N * 2.2 + 0.05 * hash2(i, c.seed); if (dt < te) continue;
    const s = dt - te, sp = (34 + 50 * hash2(i, c.seed + 1)) * (i < 6 ? 0.7 : 1), k = 0.85;
    const ang = (hash2(i, c.seed + 2) - 0.5) * 1.5, ca = Math.cos(ang), sa = Math.sin(ang);
    const dx = ap.dir[0] * ca - ap.dir[1] * sa, dy = ap.dir[0] * sa + ap.dir[1] * ca;
    const ease = Math.min(1, s * 3);
    const f = sp * (1 - Math.exp(-k * s)) * ease;
    const wx = ap.p[0] + dx * f + 6 * (vnoise(s * 0.9, i * 7 + c.seed) - 0.5) * Math.min(1, s), wy = ap.p[1] + dy * f + 6 * (vnoise(s * 0.9, i * 7 + c.seed + 3) - 0.5) * Math.min(1, s) + 1.5 * s;
    const sx = cam.x(wx), sy = cam.y(wy); if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
    const type = i % 5;
    if (type === 4) { // a DNA thread
      const a2 = s * 1.3 + i, len = 5 * cam.z;
      lineW(sx - Math.cos(a2) * len, sy - Math.sin(a2) * len, sx + Math.cos(a2 + 0.6) * len, sy + Math.sin(a2 + 0.6) * len, cam.z > 2.5 ? 2 : 1, P.CP5);
    } else if (type === 3) ball(sx, sy, Math.max(1, 1.9 * cam.z), P.CP3, P.CP4, P.CP1, P.CP0);
    else { disc(sx, sy, Math.max(1, 1.15 * cam.z), P.CP4); if (cam.z > 1.6) pset(sx - 1, sy - 1, P.CP5); }
  }
}
// ---------------------------------------------------------------- the cutaway lid and membrane (exploded layers, S09)
function drawCutawayLayers(cam, c, pose, st) {
  if (!(st.lid > 0)) return;
  const ca = Math.cos(pose.a), sa = Math.sin(pose.a), P_ = (lx, ly) => [pose.x + lx * ca - ly * sa, pose.y + lx * sa + ly * ca];
  const quad = (x0, y0, x1, y1) => cam.pts([...P_(x0, y0), ...P_(x1, y0), ...P_(x1, y1), ...P_(x0, y1)]);
  // the membrane segment, lifted a little: bilayer band with two rows of heads
  if (st.mem > 0) {
    const ym = -c.R + MW.wt - 6 * st.mem;
    const m = maskPoly(quad(-22, ym, 22, ym + MW.mt + 0.6)); shade(m, P.MB3, P.MB4, P.MB2, P.MB0, { k: 1 });
    if (cam.z > 2.2) for (let x = -21; x <= 21; x += 2.2) { const a = P_(x, ym + 0.3), b = P_(x, ym + MW.mt + 0.3); pset(cam.x(a[0]), cam.y(a[1]), P.MB4); pset(cam.x(b[0]), cam.y(b[1]), P.MB4); }
  }
  // the wall lid, lifted higher: its layered peptidoglycan shows as stripes
  const yl = -c.R - 14 * st.lid, th = MW.wt;
  const m = maskPoly(quad(-22, yl, 22, yl + th)); shade(m, P.PG3, P.PG4, P.PG1, P.PG0, { k: 1 });
  if (cam.z > 2.4) for (let k = 1; k < 6; k++) { const yy = yl + th * k / 6, a = P_(-21.5, yy), b = P_(21.5, yy); line(cam.x(a[0]), cam.y(a[1]), cam.x(b[0]), cam.y(b[1]), k % 2 ? P.PG2 : P.PG5); }
}
// ---------------------------------------------------------------- the tissue around: fluid, collagen fibres (far plane), specks, distant cells
const FIBRES = (() => {
  const r = mulberry(77), out = [];
  for (let i = 0; i < 9; i++) {
    const y0 = -700 + i * 190 + r() * 80, pts = [];
    for (let k = 0; k <= 7; k++) pts.push(-1500 + k * 330 + r() * 60, y0 + (r() - 0.5) * 160 + k * (r() - 0.3) * 40);
    out.push({ pts: spline(pts, 8, false), w: 10 + r() * 9, seed: i });
  }
  return out;
})();
const HOST = (() => { // large host-tissue cells far behind (a very deep plane)
  const r = mulberry(91), out = [];
  for (let i = 0; i < 16; i++) { const cx = -1400 + (i % 4) * 520 + r() * 200, cy = -700 + Math.floor(i / 4) * 460 + r() * 160, pts = []; const R = 150 + r() * 90; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; pts.push(cx + Math.cos(a) * R * (0.75 + 0.35 * r()), cy + Math.sin(a) * R * (0.6 + 0.3 * r())); } out.push({ pts: spline(pts, 5, true), nx: cx + (r() - 0.5) * 60, ny: cy + (r() - 0.5) * 40, hue: i % 3 }); }
  return out;
})();
function microBG(cam, t) {
  // fluid ground: navy, slightly lighter toward the top
  for (let y = 0; y < H; y++) buf.fill(mixc(P.N2, P.BG, Math.round(clamp(y / H, 0, 1) * 4) / 4), y * W, (y + 1) * W);
  // the deepest plane: big host-tissue cells in dusky tones with a soft rim and a nucleus
  const hc = new Cam(cam.cx * 0.35, cam.cy * 0.35, cam.z * 0.5);
  for (const h of HOST) {
    const q = hc.pts(h.pts); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]); y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]); }
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) continue;
    const base = [hexc('#3E2A30'), hexc('#1E4046'), hexc('#2A3A32')][h.hue];   // rose-brown, teal, green-grey (never purple)
    shade(maskPoly(q), base, mixc(base, P.G6, 0.25), mixc(base, P.BG, 0.5), mixc(base, P.K0, 0.5), { k: 2 });
    ellipse(hc.x(h.nx), hc.y(h.ny), 36 * hc.z, 26 * hc.z, mixc(base, P.K0, 0.35));
  }
  // far plane (parallax): collagen fibre bundles in muted rose, distant cells
  const fc = new Cam(cam.cx * 0.55, cam.cy * 0.55, cam.z * 0.7);
  for (const f of FIBRES) {
    const q = fc.pts(f.pts), w = Math.max(2, f.w * fc.z);
    for (let i = 0; i + 3 < q.length; i += 2) { if (Math.max(q[i], q[i + 2]) < -w || Math.min(q[i], q[i + 2]) > W + w || Math.max(q[i + 1], q[i + 3]) < -w || Math.min(q[i + 1], q[i + 3]) > H + w) continue; lineW(q[i], q[i + 1] + 1, q[i + 2], q[i + 3] + 1, w + 2, P.CO0); }
    for (let i = 0; i + 3 < q.length; i += 2) { if (Math.max(q[i], q[i + 2]) < -w || Math.min(q[i], q[i + 2]) > W + w) continue; lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w, P.CO1); }
    for (let i = 0; i + 3 < q.length; i += 2) { if (Math.max(q[i], q[i + 2]) < -w || Math.min(q[i], q[i + 2]) > W + w) continue; lineW(q[i], q[i + 1] - w * 0.3, q[i + 2], q[i + 3] - w * 0.3, Math.max(1, w * 0.3), P.CO2); }
  }
  for (let i = 0; i < 10; i++) {
    const c = { x: -1100 + hash2(i, 41) * 1500, y: -500 + hash2(i, 43) * 1300, a: hash2(i, 47) * 3, L: 30, R: 14, seed: 60 + i };
    const pz = cellPose(c, t), sx = fc.x(pz.x), sy = fc.y(pz.y); if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
    drawCell(fc, c, pz, { far: true });
  }
  // specks drifting in the fluid (a nearer plane)
  const nc = new Cam(cam.cx * 0.85, cam.cy * 0.85, cam.z);
  for (let i = 0; i < 90; i++) {
    const x = ((hash2(i, 51) * 1800 - 1300 + 4 * wob(t, 1, i) - nc.cx) * nc.z + CX), y = ((hash2(i, 53) * 1600 - 600 + 4 * wob(t, 2, i * 2) - nc.cy) * nc.z + CY);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    rect(x, y, x + (i % 3 === 0 ? 2 : 1), y + (i % 3 === 0 ? 2 : 1), i % 4 === 0 ? P.N5 : P.N4);
  }
}
// ---------------------------------------------------------------- drug molecules in the tissue (amber dots; they wander, never home in)
function drugDot(cam, x, y) { const sx = cam.x(x), sy = cam.y(y); if (sx < -3 || sx > W + 3 || sy < -3 || sy > H + 3) return; const r = Math.max(1.2, 1.3 * cam.z); if (r < 1.8) { rect(sx - 1, sy - 1, sx + 1, sy + 1, P.AM3); return; } ball(sx, sy, r, P.AM3, P.AM4, P.AM2, P.AM1); }
function drawAmbientDrug(cam, t) { // around the loop cell X and along the glide (periodic: present in the opening too)
  for (let i = 0; i < 70; i++) {
    const x = -560 + hash2(i, 91) * 860 + 18 * wob(t, 1, i) + 9 * wob(t, 3, i * 1.7), y = -260 + hash2(i, 93) * 760 + 18 * wob(t, 2, i * 0.7) + 9 * wob(t, 4, i * 2.3);
    drugDot(cam, x, y);
  }
}
