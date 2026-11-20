// META — draws simulation particles as molten material.
// fluid(): SPH particles are splatted into a density field on the 270×480 grid and thresholded into crisp blobs
//   (the pixel-art silhouette of the deforming planets). Colour comes from shock heat along the magma ramp; cool
//   material shows its rock (Earth: dark crust with glowing seams, Theia: brown-grey). Shading uses sphere normals
//   inside the planet and field-gradient normals on the arm, so bulges and spray read as 3D. Hot material adds a
//   dithered vapour glow; isolated particles are droplets with short motion streaks.
// frags(): N-body fragments as glowing rocks (dots and streaks when small, lit magma spheres when large).
(() => {
const { W, H, BAYER } = PIX;
const N = W * H, Hs = new Float32Array(N), Dn = new Float32Array(N), Ht = new Float32Array(N), Th = new Float32Array(N), Tn = new Float32Array(N), Gl = new Float32Array(N);
const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const ox = oc.getContext('2d', { willReadFrequently: true });
const M = SPH.R.magma, RK = SPH.R.rock, TH = SPH.R.theia;
const PT = [0, 0, 0], NV = [0, 0, 0], TO = { ramp: null, lv: 0, em: 0, a: 1 };
const pick = (rmp, lv, th) => rmp[Math.max(0, Math.min(rmp.length - 1, Math.floor(lv + th - 0.5)))];

// o: { n, X, Y, VX, VY, U, mat, heat0, tone, h (sim kernel), light, spheres: [{x, y, r}] (screen-space centres for normals),
//      cool: 0..1 (how far the heat has radiated away), streak: px per unit speed }
function fluid(c, cam, o) {
  const z = cam.z, rpx = Math.max(1.7, 1.25 * o.h * z), r2 = rpx * rpx, sp = o.sp * z;
  const D0 = (Math.PI * r2 / 3) / (0.866 * Math.max(sp * sp, 0.25)), thr = 0.32 * D0;
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  const sx = new Float32Array(o.n), sy = new Float32Array(o.n);
  for (let i = 0; i < o.n; i++) { const [x, y] = VIEW.toS(cam, o.X[i], o.Y[i]); sx[i] = x; sy[i] = y; }
  // splat
  for (let i = 0; i < o.n; i++) {
    const x = sx[i], y = sy[i]; if (x < -12 || y < -12 || x > W + 12 || y > H + 12) continue;
    const heat = Math.min(1.4, o.heat0[i] * (1 - o.cool) + o.U[i] * 3.0), th = o.mat[i] >= 2 ? 1 : 0, gr = rpx * (heat > 0.8 ? 2.6 : 0);
    const R = Math.max(rpx, gr), xa = Math.max(0, Math.floor(x - R)), xb = Math.min(W - 1, Math.ceil(x + R)), ya = Math.max(0, Math.floor(y - R)), yb = Math.min(H - 1, Math.ceil(y + R));
    if (xa < bx0) bx0 = xa; if (ya < by0) by0 = ya; if (xb > bx1) bx1 = xb; if (yb > by1) by1 = yb;
    for (let py = ya; py <= yb; py++) for (let px = xa; px <= xb; px++) {
      const dx = px + 0.5 - x, dy = py + 0.5 - y, d2 = dx * dx + dy * dy, j = py * W + px;
      if (d2 < r2) { const w = (1 - d2 / r2) ** 2; Dn[j] += w; Ht[j] += w * heat; Hs[j] += w * o.U[i] * 1.5; Th[j] += w * th; Tn[j] += w * o.tone[i]; }
      if (gr && d2 < gr * gr) Gl[j] += (1 - d2 / (gr * gr)) * (heat - 0.75) * 0.5;
    }
  }
  if (bx0 > bx1) return;
  const iso = new Uint8Array(o.n);                                 // particles sitting outside every blob: spray droplets
  for (let i = 0; i < o.n; i++) { const x = sx[i], y = sy[i]; if (x >= 0 && y >= 0 && x < W && y < H && Dn[(y | 0) * W + (x | 0)] < thr * 1.05) iso[i] = 1; }
  const w = bx1 - bx0 + 1, h = by1 - by0 + 1, img = ox.createImageData(w, h), d = img.data;
  const L = o.light, lx = L[0], ly = L[1], lz = L[2], spheres = o.spheres || [];
  for (let py = by0; py <= by1; py++) for (let px = bx0; px <= bx1; px++) {
    const j = py * W + px, q = ((py - by0) * w + (px - bx0)) * 4, th = BAYER[(py & 3) << 2 | (px & 3)] + 0.5, dn = Dn[j];
    let col = null;
    if (dn > thr) {
      const heat = Ht[j] / dn, tf = Th[j] / dn, tone = Tn[j] / dn;
      // normal: sphere normal inside a body, else the density gradient
      let nx = 0, ny = 0, nz = 1, inBody = false, body = null;
      for (const s of spheres) { const ux = (px + 0.5 - s.x) / s.r, uy = (py + 0.5 - s.y) / s.r, rr = ux * ux + uy * uy; if (rr < (s.tex ? 1 : 0.92)) { nx = ux; ny = uy; nz = Math.sqrt(1 - rr); inBody = true; body = s; break; } }
      const shock = Hs[j] / dn;
      if (body && body.tex && shock < 0.16) {                           // undisturbed planet: its own surface texture, lit
        const cr = Math.cos(body.roll || 0), sr = Math.sin(body.roll || 0), ct = Math.cos(body.tilt || 0), st2 = Math.sin(body.tilt || 0), cp = Math.cos(body.spin || 0), spn = Math.sin(body.spin || 0);
        const ux = nx * cr + ny * sr, uy = -nx * sr + ny * cr, by = uy * ct - nz * st2, bz = uy * st2 + nz * ct;
        PT[0] = ux * cp + bz * spn; PT[1] = by; PT[2] = -ux * spn + bz * cp; NV[0] = nx; NV[1] = ny; NV[2] = nz;
        TO.em = 0; TO.a = 1; body.tex(PT, NV, TO);
        const lam = nx * lx + ny * ly + nz * lz, drop = lam > 0.42 ? 0 : lam > 0.12 ? 0.85 : lam > -0.08 ? 1.7 : 2.6;
        let lv = TO.lv - drop * (1 - TO.em); if (lam > 0.15 && nz < 0.28) lv += 0.6 * (1 - TO.em) * (1 - nz / 0.28);
        if (shock > 0.06) lv = Math.max(lv, 3 + (shock - 0.06) * 30);  // warming at the edge of the shocked zone
        col = pick(shock > 0.06 && lv > 3 ? M : TO.ramp, lv, th);
        d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; d[q + 3] = 255; Dn[j] = 0; Ht[j] = 0; Hs[j] = 0; Th[j] = 0; Tn[j] = 0; Gl[j] = 0; continue;
      }
      if (!inBody) {
        const gx = (px > 0 ? Dn[j - 1] : 0) - (px < W - 1 ? Dn[j + 1] : 0), gy = (py > 0 ? Dn[j - W] : 0) - (py < H - 1 ? Dn[j + W] : 0);
        const gl = Math.hypot(gx, gy), k = D0 * 0.9; nx = gx / (gl + k); ny = gy / (gl + k); nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      }
      const lam = nx * lx + ny * ly + nz * lz, drop = lam > 0.42 ? 0 : lam > 0.12 ? 0.85 : lam > -0.08 ? 1.7 : 2.6;
      const edge = dn < thr * 1.5 && lam > 0.2 ? 0.7 : 0;
      if (heat > 0.34 || (tone > 0.62 && heat > 0.22)) {              // molten, glowing: barely shaded
        const lv = 2.6 + heat * 3.6 + (tone - 0.5) * 0.8 - drop * 0.25 + edge * 0.5;
        col = pick(M, lv, th);
      } else {                                                         // cool rock: lit like a surface
        const lv = (tf > 0.5 ? 4.0 : 3.0) + (tone - 0.5) * 1.6 - drop + edge;
        col = pick(tf > 0.5 ? TH : RK, lv, th);
      }
    } else if (Gl[j] > 0.02) {                                         // rock vapour glow
      const a = Math.min(1, Gl[j] / Math.max(0.6, D0 * 0.25));
      if (a * 0.7 > th) col = pick(M, 2.4 + a * 3, th);
    }
    if (col) { d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; d[q + 3] = 255; }
    Dn[j] = 0; Ht[j] = 0; Hs[j] = 0; Th[j] = 0; Tn[j] = 0; Gl[j] = 0;
  }
  ox.putImageData(img, bx0, by0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(oc, bx0, by0, w, h, bx0, by0, w, h);
  // spray: particles outside the blobs (density below threshold at their own pixel) are droplets with motion streaks
  const sk = o.streak ?? 0;
  for (let i = 0; i < o.n; i++) {
    const x = sx[i], y = sy[i]; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (!iso[i]) continue;
    const heat = Math.min(1.4, o.heat0[i] * (1 - o.cool) + o.U[i] * 3.0), cl = pick(M, 3 + heat * 3.5, 0.5);
    c.fillStyle = `rgb(${cl[0]},${cl[1]},${cl[2]})`;
    if (sk) { const vx = o.VX[i] * sk, vy = o.VY[i] * sk, L = Math.hypot(vx, vy); if (L > 1) { const st = Math.ceil(L); for (let k = 1; k <= st; k++) c.fillRect(Math.round(x - vx * k / st), Math.round(y - vy * k / st), 1, 1); } }
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  c.restore();
}

// frags: { n, X, Y, S (sim radius), A (alive), tone, heatAt(i) → 0..1, light, t, sphereMin (px radius drawn as a sphere),
//          vel: optional [VX, VY] arrays for streaks, skip: index to leave out (drawn separately) }
function frags(c, cam, o) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const big = [];
  for (let i = 0; i < o.n; i++) {
    if (!o.A[i] || i === o.skip) continue;
    const [x, y] = VIEW.toS(cam, o.X[i], o.Y[i]); const r = o.S[i] * cam.z;
    if (x < -r - 4 || y < -r - 4 || x > W + r + 4 || y > H + r + 4) continue;
    const heat = o.heatAt ? o.heatAt(i) : 1;
    if (r >= (o.sphereMin ?? 3)) { big.push([i, x, y, r, heat]); continue; }
    const cl = pick(M, 2.8 + heat * 3.6 + o.tone[i] * 0.8, 0.5);
    c.fillStyle = `rgb(${cl[0]},${cl[1]},${cl[2]})`;
    if (o.vel) { const vx = o.vel[0][i] * (o.streak || 0), vy = o.vel[1][i] * (o.streak || 0), L = Math.hypot(vx, vy); if (L > 1) { const st = Math.min(14, Math.ceil(L)); const dim = pick(M, 2.2 + heat * 2.6, 0.5); c.fillStyle = `rgb(${dim[0]},${dim[1]},${dim[2]})`; for (let k = 1; k <= st; k++) c.fillRect(Math.round(x - vx * k / st), Math.round(y - vy * k / st), 1, 1); c.fillStyle = `rgb(${cl[0]},${cl[1]},${cl[2]})`; } }
    if (r < 1.2) { c.fillRect(Math.round(x), Math.round(y), 1, 1); if (heat > 0.75) { const dm = pick(M, 3.2 + heat * 2, 0.5); c.fillStyle = `rgb(${dm[0]},${dm[1]},${dm[2]})`; c.fillRect(Math.round(x) - 1, Math.round(y), 1, 1); c.fillRect(Math.round(x) + 1, Math.round(y), 1, 1); c.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); c.fillRect(Math.round(x), Math.round(y) + 1, 1, 1); } }
    else { c.beginPath(); c.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, r, 0, U.TAU); c.fill(); const hl = pick(M, 5.5 + heat * 2, 0.5); c.fillStyle = `rgb(${hl[0]},${hl[1]},${hl[2]})`; c.fillRect(Math.round(x - r * 0.4), Math.round(y - r * 0.4), 1, 1); }
  }
  c.restore();
  for (const [i, x, y, r, heat] of big) SPH.draw(c, { cx: x, cy: y, R: r, spin: o.t * 0.8 + i, tilt: 0.3, light: o.light, tex: SPH.tex.magmaBall(o.t + i, { heat, scale: 2.4, flow: 0.4 }), rim: 0.4 });
}
window.META = { fluid, frags };
})();
