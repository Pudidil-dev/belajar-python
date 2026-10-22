// SAMPLE — the specimen at every scale. The side-entry holder's tip with its 3 mm copper grid (seen from slightly
// above), the robotic gripper that loads it, the grid's mesh, one grid square spanned by lacey carbon with an
// ultrathin film, the film at the nanometre scale with the gold atoms (the same atoms as the micrograph), and the
// cutaway slab: gold atoms sitting on a 3 nm amorphous carbon film. Plus the powers-of-ten dive that links them and a
// scale bar that follows it. Atoms are drawn as soft clouds of density, never as hard balls.
(() => {
const { P, W, H } = PIX;
const SAMPLE = window.SAMPLE = {};
const h = U.hash, clamp = U.clamp;
const R = (c, x, y, w, hh, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, hh); };

// ---------- holder tip, grid and gripper (screen px; s = px per mm) ----------
// the tip end of the holder seen from slightly above: a flat blade with a round cup, grid in it, clamp ring on top
SAMPLE.tip = (c, cx, cy, s, o = {}) => {
  const sq = o.squash ?? 0.42, gridIn = o.grid ?? 1, clamp_ = o.clamp ?? 1, gy = o.gridY ?? 0;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // blade (extends to the right, toward the rod)
  const bw = 7 * s, bh = 2.4 * s * sq * 2.2;
  PIX.flat(c, PIX.rectPath(cx - 2.6 * s, cy - bh / 2, bw + (o.blade ?? 14) * s, bh, 2 * s * sq), 'g8', 'g5', 'gb', [0, 2], [0, 1]);
  // the cup
  const el = (rx, ry, col) => { c.fillStyle = P[col]; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, U.TAU); c.fill(); };
  el(1.9 * s, 1.9 * s * sq, 'g4'); el(1.62 * s, 1.62 * s * sq, 'g2');
  if (gridIn > 0) SAMPLE.grid(c, cx, cy - gy * s, 1.5 * s, sq, { a: 1 });
  if (clamp_ > 0) {
    const yy = cy - (1 - clamp_) * 3 * s;
    c.strokeStyle = P.g9; c.lineWidth = Math.max(1, 0.28 * s); c.beginPath(); c.ellipse(cx, yy, 1.62 * s, 1.62 * s * sq, 0, 0, U.TAU); c.stroke();
    c.strokeStyle = P.gb; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, yy - 0.5, 1.62 * s, 1.62 * s * sq, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  c.restore();
};
// the 3 mm grid: copper rim, square mesh (bars), carbon film in the openings. R = radius px, sq = vertical squash
SAMPLE.grid = (c, cx, cy, Rr, sq = 1, o = {}) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= o.a ?? 1;
  const clip = new Path2D(); clip.ellipse(cx, cy, Rr, Rr * sq, 0, 0, U.TAU);
  c.fillStyle = P.u1; c.fill(clip);
  c.save(); c.clip(clip);
  // mesh: 400 lines per inch → 63.5 µm pitch, bars 25 µm (radius 1.5 mm); the centre sits in the middle of an opening
  const pitch = Rr * 0.0635 / 1.5, bar = pitch * 0.4;
  if (pitch >= 2.2) {
    c.fillStyle = P.n2; const n = Math.ceil(Rr / pitch) + 1;
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const x = cx + (i - 0.5) * pitch + bar / 2, y = cy + ((j - 0.5) * pitch + bar / 2) * sq;
      if (x > cx + Rr || x + pitch < cx - Rr || y > cy + Rr * sq || y + pitch * sq < cy - Rr * sq) continue;
      c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(x + pitch - bar) - Math.round(x)), Math.max(1, Math.round(y + (pitch - bar) * sq) - Math.round(y)));
    }
  } else { c.fillStyle = P.u0; c.globalAlpha *= 0.55; c.fill(clip); c.globalAlpha /= 0.55; }
  c.restore();
  c.strokeStyle = P.u2; c.lineWidth = Math.max(1, Rr * 0.08); c.beginPath(); c.ellipse(cx, cy, Rr * 0.96, Rr * sq * 0.96, 0, 0, U.TAU); c.stroke();
  c.strokeStyle = P.u3; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, cy, Rr * 0.96, Rr * sq * 0.96, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
  c.restore();
};
// a two-finger gripper on a vertical arm (screen px, s = px per mm); open = 0 holding .. 1 open
SAMPLE.gripper = (c, x, y, s, open = 0) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  PIX.flat(c, PIX.rectPath(x - 0.9 * s, y - 60 * s, 1.8 * s, 56 * s), 'g6', 'g4', 'g8', [2, 0], [1, 0]);   // arm
  PIX.flat(c, PIX.rectPath(x - 3.2 * s, y - 5.2 * s, 6.4 * s, 2.4 * s, 0.6 * s), 'g5', 'g3', 'g7', [1, 1], [1, 1]);
  R(c, Math.round(x - 3 * s), Math.round(y - 4.6 * s), Math.round(6 * s), 1, 'c2');                       // status strip
  for (const sgn of [-1, 1]) {
    const fx = x + sgn * (1.6 + 0.9 * open) * s;
    PIX.flat(c, PIX.polyPath([[fx - 0.5 * s, y - 2.8 * s], [fx + 0.5 * s, y - 2.8 * s], [fx + 0.25 * s, y], [fx - 0.25 * s, y]]), 'g7', 'g5', 'g9', [1, 0], [0, 0]);
  }
  c.restore();
};

// ---------- the dive (powers of ten) ----------
// fov = width of the frame in metres; everything is centred on the beam axis (the grid centre). Levels crossfade.
let LX = 0;                                                                 // offset so the beam axis lands on thin film
const lacey = (x, y) => K.fbm((x + LX) * 0.55, y * 0.55, 21, 3);           // x, y in µm → 0..1
for (let k = 0; k < 40; k++) { LX = k * 3.7; const v = lacey(63.5 / 2 * 0.7, 63.5 / 2 * 0.7); if (Math.abs(v - 0.5) > 0.16 && v < 0.5) break; }
// tip level (FOV 6 cm … 4 mm): the holder tip, turning from the 3/4 view to straight down as the camera closes in
function lvTip(c, fov, t, o) {
  const s = W / (fov * 1e3), L = Math.log10(fov), sq = U.lerp(0.42, 1, MO.smooth(clamp((-1.35 - L) / 0.95)));
  R(c, 0, 0, W, H, 'n0');
  SAMPLE.tip(c, W / 2, H / 2, s, { squash: sq, blade: 40 });
}
SAMPLE.tipSquash = fov => U.lerp(0.42, 1, MO.smooth(clamp((-1.35 - Math.log10(fov)) / 0.95)));
// grid level (FOV 4 mm … 0.15 mm), drawn top-down
function lvGrid(c, fov) {
  const s = W / (fov * 1e3);                                                // px per mm
  R(c, 0, 0, W, H, 'k');
  SAMPLE.grid(c, W / 2, H / 2, 1.5 * s, 1, {});
  // the film over the openings gets visible as a slightly lighter tint once the squares are big
  const pitch = 0.0635 * s;
  if (pitch > 12) {
    const k = clamp((pitch - 12) / 30);
    c.save(); c.globalAlpha = 0.35 * k; c.fillStyle = P.g4;
    const ox = W / 2 - pitch * 0.5, oy = H / 2 - pitch * 0.5;
    for (let i = -6; i <= 6; i++) for (let j = -9; j <= 9; j++) { const x = ox + i * pitch + pitch * 0.2, y = oy + j * pitch + pitch * 0.2; if (x > W || y > H || x + pitch < 0 || y + pitch < 0) continue; c.fillRect(Math.round(x), Math.round(y), Math.round(pitch * 0.6), Math.round(pitch * 0.6)); }
    c.restore();
  }
}
// lacey carbon in one grid square (FOV 200 µm … 0.6 µm): strands of carbon around holes, an ultrathin film over all
function lvFilm(c, fov, t) {
  const um = fov * 1e6, s = W / um;                                         // px per µm
  const img = c.createImageData(W, H), d = img.data;
  const pitch = 63.5, bar = 25;
  const col = (k, i) => { const p = PIX.hex(P[k]); d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ux = (x - W / 2) / s + pitch / 2, uy = (y - H / 2) / s + pitch / 2, i = (y * W + x) * 4;   // µm, square centred
    const mx = K.wrap(ux, pitch), my = K.wrap(uy, pitch);
    if (mx < bar / 2 || my < bar / 2 || mx > pitch - bar / 2 || my > pitch - bar / 2) { col(((x + y) & 3) ? 'u1' : 'u2', i); continue; }
    const v = lacey(ux * 0.7, uy * 0.7), strand = Math.abs(v - 0.5) < 0.035 + 0.02 * K.vn(ux * 0.3, uy * 0.3, 4);
    const fine = K.vn(ux * 40, uy * 40, 9);                                 // the thin film's mottle, 25 nm grain
    const thr = K.BAY(x, y), edge = Math.abs(v - 0.5) < 0.06;
    col(strand ? (0.75 > thr * 0.9 ? 'g5' : 'g4') : edge ? 'g4' : (fine * 0.9 > thr ? 'g3' : 'g2'), i);
  }
  c.putImageData(img, 0, 0);
}
// nanometre film top view: amorphous carbon network + the gold atoms (FOV ≤ 60 nm)
let NET = null;
function net() {                                                            // a random carbon network around the origin, nm
  if (NET) return NET;
  const r = U.rng(6), pts = [], bonds = [], cell = 0.16, N = 34;          // 34 × 34 cells of 0.16 nm ≈ 5.4 nm square, tiled
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (r() < 0.82) pts.push([(i + 0.15 + r() * 0.7) * cell, (j + 0.15 + r() * 0.7) * cell]);
  const L = N * cell;
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
    let dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1]; if (Math.abs(dx) > L / 2) dx -= Math.sign(dx) * L; if (Math.abs(dy) > L / 2) dy -= Math.sign(dy) * L;
    const dd = Math.hypot(dx, dy); if (dd < 0.2 && dd > 0.09) bonds.push([a, b, dx, dy]);
  }
  NET = { pts, bonds, L }; return NET;
}
SAMPLE.net = net;
// the gold atoms around the beam axis come from the micrograph (centred on the hook atom) and repeat beyond it
const auNm = () => { const a0 = HA.AU[HA.HOOK]; return HA.AU.map(p => [p.x - a0.x, p.y - a0.y]); };
SAMPLE.auNm = auNm;
// soft atom: a cloud of density (dithered), radius r px
SAMPLE.cloud = (c, sx, sy, r, ramp = ['y0', 'y1', 'y2', 'y3', 'y4'], a = 1) => FX.glowL(c, sx, sy, r, ramp, a, 1.25);
function lvNano(c, fov, t, o = {}) {
  const nm = fov * 1e9, s = W / nm;                                         // px per nm
  R(c, 0, 0, W, H, 'g1');
  // coarse mottle (thickness) fading out, the bonded network fading in as it resolves
  const kNet = clamp((s - 6) / 10);
  if (kNet < 1) {
    const img = c.getImageData(0, 0, W, H), d = img.data, a = 1 - kNet;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ux = (x - W / 2) / s, uy = (y - H / 2) / s, v = K.fbm(ux * 0.35, uy * 0.35, 3, 3) * 0.6 + K.vn(ux * 3, uy * 3, 8) * 0.4;
      if (v * a > K.BAY(x, y) * 0.9 + 0.2) { const i = (y * W + x) * 4, p = PIX.hex(P[v > 0.62 ? 'g4' : 'g3']); d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; }
    }
    c.putImageData(img, 0, 0);
  }
  if (kNet > 0) {
    const N = net(), L = N.L;
    const nx = Math.ceil(nm / L / 2) + 1, ny = Math.ceil(nm * H / W / L / 2) + 1;
    c.save(); c.globalAlpha = kNet;
    for (let ty = -ny; ty <= ny; ty++) for (let tx_ = -nx; tx_ <= nx; tx_++) {
      const ox = W / 2 + (tx_ * L - L / 2) * s, oy = H / 2 + (ty * L - L / 2) * s;
      if (ox > W + 4 || oy > H + 4 || ox + L * s < -4 || oy + L * s < -4) continue;
      for (const [a, , dx, dy] of N.bonds) { const p = N.pts[a]; PIX.bline(c, ox + p[0] * s, oy + p[1] * s, ox + (p[0] + dx) * s, oy + (p[1] + dy) * s, 'g3'); }
      if (s > 8) { c.save(); c.globalAlpha = kNet * clamp((s - 8) / 5); for (const p of N.pts) R(c, Math.round(ox + p[0] * s) - 1, Math.round(oy + p[1] * s) - 1, 2, 2, 'g5'); c.restore(); }   // fade in, no pop
    }
    c.restore();
  }
  // gold atoms: the micrograph's own atoms in the central tile, random single atoms in every other tile. They fade in
  // only once single atoms can be told apart (≥ 7 px per nm, a ~40 nm field): drawn at larger fields as 1-px dots at
  // the real density they flooded the whole frame for a frame (~10⁵ dots), which no microscope would show at that scale
  const kAu = clamp((s - 7) / 13), au = auNm(), rr_ = Math.max(1.2, 0.17 * s);
  if (kAu > 0) {
    const span = HA.IW * HA.NM, spanY = HA.IH * HA.NM, a0 = HA.AU[HA.HOOK];
    const nx = Math.ceil(nm / span / 2) + 1, ny = Math.ceil(nm * H / W / spanY / 2) + 1;
    c.save(); c.globalAlpha = kAu;
    const dot = (x, y) => {
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
      if (rr_ < 2.5) { R(c, Math.round(x), Math.round(y), 1, 1, 'y3'); if (rr_ > 1.6) R(c, Math.round(x) + 1, Math.round(y), 1, 1, 'y2'); }
      else SAMPLE.cloud(c, x, y, rr_, undefined, kAu);
    };
    for (let ty = -ny; ty <= ny; ty++) for (let tx_ = -nx; tx_ <= nx; tx_++) {
      if (tx_ === 0 && ty === 0) { for (const [ax, ay] of au) dot(W / 2 + ax * s, H / 2 + ay * s); continue; }
      for (let k = 0; k < 44; k++) {
        const ax = tx_ * span - a0.x + h(k, tx_ * 131 + ty * 17) * span, ay = ty * spanY - a0.y + h(k + 99, tx_ * 71 + ty * 37) * spanY;
        dot(W / 2 + ax * s, H / 2 + ay * s);
      }
    }
    c.restore();
  }
}
// draw the dive at fov (metres)
SAMPLE.dive = (c, fov, t, o = {}) => {
  const L = Math.log10(fov);
  const lv = [
    [-1.0, -2.45, lvTip], [-2.25, -4.05, lvGrid], [-3.75, -6.45, lvFilm], [-6.2, -9.5, lvNano],
  ];
  // pick the active level(s): a dithered crossfade over the overlap
  const live = lv.filter(([a, b]) => L <= a && L >= b);
  if (!live.length) { (L > -1 ? lvTip : lvNano)(c, fov, t, o); return; }
  if (live.length === 1) { live[0][2](c, fov, t, o); return; }
  const [A, B] = live, p = clamp((B[0] - L) / (B[0] - A[1]));             // over the overlap: B starts at B[0], A ends at A[1]
  window.dissolve(c, cc => A[2](cc, fov, t, o), cc => B[2](cc, fov, t, o), MO.smooth(p));
};
// scale bar for a frame fov metres wide
SAMPLE.scaleBar = (c, fov, a = 1, y = 446) => {
  if (a <= 0) return;
  const pxPerM = W / fov, units = [[1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm']];
  let best = null;
  for (const [u, name] of units) for (const m of [1, 2, 5, 10, 20, 50, 100, 200, 500]) { const Lp = m * u * pxPerM; if (Lp >= 28 && Lp <= 70 && !best) best = [Lp, `${m} ${name}`]; }
  if (!best) return;
  const [Lp, s] = best, x0 = Math.round(W / 2 - Lp / 2);
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x0 - 3, y - 12, Math.round(Lp) + 6, 18, 'k');
  PIX.rect(c, x0, y, Math.round(Lp), 1, 'g8'); PIX.rect(c, x0, y - 3, 1, 4, 'g8'); PIX.rect(c, x0 + Math.round(Lp) - 1, y - 3, 1, 4, 'g8');
  PIX.text(c, s, W / 2, y - 10, 'g9', { align: 'center' });
  c.restore();
};

// ---------- the cutaway slab: gold atoms on a 3 nm amorphous carbon film (screen px; s = px per nm) ----------
// A block of film seen from the front and slightly above: top face (parallelogram) with the gold atoms on it, the cut
// front face showing the carbon network through its thickness.
SAMPLE.slab = (c, cx, cy, s, t, o = {}) => {
  const wN = o.w ?? 7, dN = o.d ?? 4, th = 3, sk = 0.42;                    // width, depth (nm), thickness, depth squash
  const x0 = cx - wN * s / 2, y0 = cy - th * s / 2;                        // front face top-left
  const dx = dN * s * 0.55, dy = -dN * s * sk;                              // depth vector (up-right)
  const top = (u, v) => [x0 + u * s + v / dN * dx, y0 + v / dN * dy];       // u along width, v into depth (nm)
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = P.g3; c.fill(PIX.polyPath([[x0, y0], [x0 + wN * s, y0], [x0 + wN * s + dx, y0 + dy], [x0 + dx, y0 + dy]]));
  c.fillStyle = P.g2; c.fillRect(Math.round(x0), Math.round(y0), Math.round(wN * s), Math.round(th * s));
  c.fillStyle = P.g1; c.fill(PIX.polyPath([[x0 + wN * s, y0], [x0 + wN * s + dx, y0 + dy], [x0 + wN * s + dx, y0 + dy + th * s], [x0 + wN * s, y0 + th * s]]));
  // the amorphous network: jittered sites ~0.17 nm apart, bonded to near neighbours
  const r = U.rng(66), net2 = (nu, nv, map, cb, ca) => {
    const g = []; for (let j = 0; j <= nv; j++) { g.push([]); for (let i = 0; i <= nu; i++) g[j].push(map(i + (r() - 0.5) * 0.7, j + (r() - 0.5) * 0.7)); }
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = g[j][i];
      if (i < nu && r() < 0.78) PIX.bline(c, p[0], p[1], g[j][i + 1][0], g[j][i + 1][1], cb);
      if (j < nv && r() < 0.62) PIX.bline(c, p[0], p[1], g[j + 1][i][0], g[j + 1][i][1], cb);
    }
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = g[j][i]; c.fillStyle = P[ca]; c.fillRect(Math.round(p[0]), Math.round(p[1]), s > 22 ? 2 : 1, 1); }
  };
  const st = 0.17, nu = Math.round(wN / st);
  c.save(); c.beginPath(); c.rect(x0, y0, wN * s, th * s); c.clip();
  net2(nu, Math.round(th / st), (i, j) => [x0 + i * st * s, y0 + j * st * s], 'g3', 'g5'); c.restore();
  c.save(); c.clip(PIX.polyPath([[x0, y0], [x0 + wN * s, y0], [x0 + wN * s + dx, y0 + dy], [x0 + dx, y0 + dy]]));
  net2(nu, Math.round(dN / st), (i, j) => top(i * st, j * st), 'g4', 'g6'); c.restore();
  PIX.bline(c, x0, y0, x0 + wN * s, y0, 'g7'); PIX.bline(c, x0 + wN * s, y0, x0 + wN * s + dx, y0 + dy, 'g5'); PIX.bline(c, x0, y0, x0 + dx, y0 + dy, 'g6');
  PIX.bline(c, x0 + dx, y0 + dy, x0 + wN * s + dx, y0 + dy, 'g5'); PIX.bline(c, x0 + wN * s, y0, x0 + wN * s, y0 + th * s, 'g4');
  c.restore();
  // gold atoms resting on the top face, back to front
  const pos = (o.atoms || [[0.18, 0.55], [0.42, 0.25], [0.66, 0.7], [0.82, 0.35], [0.3, 0.85], [0.55, 0.45]]).map(([u, v]) => top(u * wN, v * dN));
  pos.sort((a, b) => a[1] - b[1]);
  for (const [px, py] of pos) {
    SAMPLE.cloud(c, px, py - 0.16 * s, 0.34 * s, ['y0', 'y1', 'y2', 'y3'], 0.9);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.y4; c.fillRect(Math.round(px) - 1, Math.round(py - 0.16 * s) - 1, 2, 2); c.restore();
  }
  return { x0, y0, x1: x0 + wN * s, y1: y0 + th * s, dx, dy, top, atoms: pos };
};
})();
