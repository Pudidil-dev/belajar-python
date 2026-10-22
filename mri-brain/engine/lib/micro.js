// MICRO — the microscopic world under one MRI voxel: a patch of cortex (pyramidal neurons, glia, a capillary with red
// blood cells) in micrometres, liquid water in nanometres (jostling, rotating H₂O, deterministic in time), one water
// molecule in detail and one hydrogen nucleus — a single proton with its magnetic moment drawn as a vector, never as a
// spinning ball. Cameras are {x, y (world units), s (px per unit), r (roll)}; the patch is centred on the point the
// film dives into, which is kept in the fluid between cells.
(() => {
const { W, H, P } = PIX;
const MICRO = window.MICRO = {};
const h = U.hash, TAU = U.TAU, clamp = U.clamp, lerp = U.lerp;
// world → screen for a camera, and the matching canvas transform
MICRO.S = (cam, x, y) => { const c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0), dx = (x - cam.x) * cam.s, dy = (y - cam.y) * cam.s; return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c]; };
MICRO.apply = (c, cam) => { const co = Math.cos(cam.r || 0) * cam.s, si = Math.sin(cam.r || 0) * cam.s; c.setTransform(co, si, -si, co, W / 2 - (co * cam.x - si * cam.y), H / 2 - (si * cam.x + co * cam.y)); };
// ---------- the tissue patch (µm): ~1.4 mm square ----------
let CELLS = null;
MICRO.init = () => {
  if (CELLS) return; CELLS = [];
  const RX = 1000, RY = 1600, step = 22;
  for (let gy = -RY; gy < RY; gy += step) for (let gx = -RX; gx < RX; gx += step) {
    const i = Math.round(gx / step), j = Math.round(gy / step);
    for (let k = 0; k < 3; k++) {
      const u = h(i * 7 + k, j * 13 + 5), type = u < 0.33 ? 'n' : u < 0.85 ? 'g' : null; if (!type) continue;
      const x = gx + h(i + 101, j * 3 + k) * step, y = gy + h(i * 5 + k, j + 77) * step;
      const r = type === 'n' ? 6 + 4 * h(i + k, j + 3) : 3 + 1.6 * h(i + 9, j + k);
      if (Math.hypot(x, y) < r + 9) continue;                                  // keep the dive point in the fluid
      CELLS.push({ type, x, y, r, a: (h(i + 3, j + k * 9) - 0.5) * 0.5, seed: i * 31 + j * 17 + k });
    }
  }
};
// capillary: a gentle curve crossing the patch below the dive point
const capY = x => 34 + 22 * Math.sin(x / 90) + 8 * Math.sin(x / 31);
function soma(c, cl, s) {                                                     // pyramidal neuron body (local units = µm)
  const r = cl.r, p = new Path2D();
  p.moveTo(0, -r * 1.45); p.quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.8, r * 0.75); p.quadraticCurveTo(0, r * 1.05, -r * 0.8, r * 0.75); p.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -r * 1.45);
  return p;
}
MICRO.tissue = (c, cam, t, o = {}) => {
  MICRO.init();
  const s = cam.s, x0 = cam.x - (W + H) / s, x1 = cam.x + (W + H) / s, y0 = cam.y - (W + H) / s, y1 = cam.y + (W + H) / s;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); PIX.rect(c, 0, 0, W, H, 'n1'); c.restore();
  c.save(); MICRO.apply(c, cam);
  // extracellular fluid texture: faint blobs
  // capillary with red blood cells flowing along it
  const cw = 4.2;
  c.lineCap = 'round';
  { const pts = []; for (let x = x0; x <= x1; x += Math.max(2, 6 / s)) pts.push([x, capY(x)]);
    const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
    c.strokeStyle = P.m1; c.lineWidth = cw * 2 + 2.4; path(); c.stroke();
    c.strokeStyle = P.n2; c.lineWidth = cw * 2; path(); c.stroke();
    for (let k = -40; k < 40; k++) {
      const xr = k * 9 + K.wrap(t * 26, 9), yr = capY(xr) + 1.4 * Math.sin(k * 1.7);
      if (xr < x0 || xr > x1) continue;
      c.save(); c.translate(xr, yr); c.rotate(Math.atan2(capY(xr + 1) - capY(xr), 1) + 0.4 * Math.sin(k));
      c.fillStyle = P.r1; c.beginPath(); c.ellipse(0, 0, 3.6, 1.6, 0, 0, TAU); c.fill();
      if (s * 3.6 > 4) { c.fillStyle = P.r2; c.beginPath(); c.ellipse(-0.5, -0.3, 2.2, 0.8, 0, 0, TAU); c.fill(); }
      c.restore();
    } }
  for (const cl of CELLS) {
    if (cl.x < x0 || cl.x > x1 || cl.y < y0 || cl.y > y1) continue;
    const rr = cl.r * s;
    if (rr < 1.2) { c.fillStyle = cl.type === 'n' ? P.m3 : P.q2; c.fillRect(cl.x - 0.7 / s, cl.y - 0.7 / s, 1.4 / s, 1.4 / s); continue; }
    c.save(); c.translate(cl.x, cl.y); c.rotate(cl.a);
    if (cl.type === 'n') {
      // dendrites: an apical one toward the cortical surface (up), basal ones, a thin axon down
      c.strokeStyle = P.m2; c.lineCap = 'round';
      const lw = Math.max(1 / s, cl.r * 0.28);
      c.lineWidth = lw; c.beginPath(); c.moveTo(0, -cl.r); c.lineTo(1.5 * Math.sin(cl.seed), -cl.r * 7); c.stroke();
      c.lineWidth = Math.max(1 / s, lw * 0.5);
      for (let b = 0; b < 4; b++) { const an = Math.PI * (0.15 + 0.7 * b / 3), L = cl.r * (2.2 + 1.5 * h(cl.seed, b)); c.beginPath(); c.moveTo(0, cl.r * 0.5); c.quadraticCurveTo(Math.cos(an) * L * 0.5, cl.r + Math.sin(an) * L * 0.3, Math.cos(an) * L, cl.r * 0.6 + Math.sin(an) * L); c.stroke(); }
      for (let b = 0; b < 3; b++) { const yy = -cl.r * (2.4 + 1.6 * b), sd = b % 2 ? 1 : -1; c.beginPath(); c.moveTo(0, yy); c.lineTo(sd * cl.r * (1.5 + h(cl.seed + 3, b)), yy - cl.r * 1.2); c.stroke(); }
      c.strokeStyle = P.q2; c.lineWidth = Math.max(1 / s, lw * 0.3); c.beginPath(); c.moveTo(0, cl.r); c.lineTo(-0.8, cl.r * 6); c.stroke();
      const sp = soma(c, cl, s);
      PIX.flat(c, sp, 'm3', 'm2', 'm4', [cl.r * 0.18, cl.r * 0.18], [-cl.r * 0.08, -cl.r * 0.08]);
      c.fillStyle = P.q1; c.beginPath(); c.ellipse(0, 0.1 * cl.r, cl.r * 0.42, cl.r * 0.38, 0, 0, TAU); c.fill();
      if (rr > 10) { c.fillStyle = P.q0; c.beginPath(); c.arc(cl.r * 0.1, 0, cl.r * 0.12, 0, TAU); c.fill(); }
    } else {
      c.strokeStyle = P.q2; c.lineWidth = Math.max(1 / s, cl.r * 0.18);
      for (let b = 0; b < 5; b++) { const an = b / 5 * TAU + cl.seed, L = cl.r * (2 + h(cl.seed, b + 9)); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * L, Math.sin(an) * L); c.stroke(); }
      PIX.flat(c, PIX.circPath(0, 0, cl.r), 'q2', 'q1', 'm2', [cl.r * 0.2, cl.r * 0.2], [-cl.r * 0.1, -cl.r * 0.1]);
      c.fillStyle = P.q1; c.beginPath(); c.arc(0.1 * cl.r, 0.1 * cl.r, cl.r * 0.5, 0, TAU); c.fill();
    }
    c.restore();
  }
  c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
};
// ---------- liquid water (nm) ----------
// one molecule: O at (x, y), H's at 104.5° with 0.096 nm bonds; space-filling, O red, H pale, nuclei gold when lit
MICRO.H2O = { bond: 0.096, ang: 104.5 * Math.PI / 180, rO: 0.152, rH: 0.11 };
MICRO.hPos = (x, y, a) => { const B = MICRO.H2O.bond, half = MICRO.H2O.ang / 2; return [[x + Math.cos(a - half) * B, y + Math.sin(a - half) * B], [x + Math.cos(a + half) * B, y + Math.sin(a + half) * B]]; };
MICRO.h2o = (c, x, y, a, o = {}) => {                                         // drawn under the current (nm) transform
  const { rO, rH } = MICRO.H2O, [h1, h2] = MICRO.hPos(x, y, a), s = o.s || 50;
  // the H's behind the O first if they point away? keep flat: H's under the O's edge
  for (const [hx, hy] of [h1, h2]) PIX.flat(c, PIX.circPath(hx, hy, rH), o.hcol || 'g9', 'g6', 'gb', [0.025, 0.025], [-0.012, -0.012]);
  PIX.flat(c, PIX.circPath(x, y, rO), 'n4', 'n2', 'g6', [0.035, 0.035], [-0.02, -0.02]);
  if (o.nuc > 0) for (const [hx, hy] of [h1, h2]) { c.fillStyle = P.y3; c.beginPath(); c.arc(hx, hy, Math.max(1.4 / s, 0.022) * (0.5 + 0.5 * o.nuc), 0, TAU); c.fill(); }
};
// the molecules in view: a jittered lattice (0.31 nm), each drifting and turning with time
MICRO.waterAt = (i, j, t) => {
  const sp = 0.31, k = i * 92821 + j * 68917;
  const x = i * sp + (h(i, j) - 0.5) * 0.14 + 0.03 * Math.sin(t * 2.1 + h(k, 3) * 9), y = j * sp + (h(j, i + 7) - 0.5) * 0.14 + 0.03 * Math.cos(t * 1.7 + h(k, 5) * 9);
  return [x, y, h(k, 1) * TAU + t * (h(k, 2) - 0.5) * 3];
};
MICRO.water = (c, cam, t, o = {}) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); PIX.rect(c, 0, 0, W, H, 'n0'); c.restore();
  c.save(); MICRO.apply(c, cam); c.globalAlpha = o.a ?? 1;
  const R = (W + H) / cam.s, sp = 0.31;
  const i0 = Math.floor((cam.x - R) / sp), i1 = Math.ceil((cam.x + R) / sp), j0 = Math.floor((cam.y - R) / sp), j1 = Math.ceil((cam.y + R) / sp);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (o.skip && i === o.skip[0] && j === o.skip[1]) continue;
    const [x, y, a] = MICRO.waterAt(i, j, t);
    if (cam.s * 0.31 < 2.2) { c.fillStyle = (i + j) % 3 ? P.n4 : P.g8; c.fillRect(x - 0.6 / cam.s, y - 0.6 / cam.s, 1.2 / cam.s, 1.2 / cam.s); continue; }
    MICRO.h2o(c, x, y, a, { s: cam.s, nuc: o.nuc || 0 });
  }
  c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
};
// ---------- the proton and its magnetic moment ----------
// (sx, sy) screen centre, R radius px, ang direction of the moment (screen radians, 0 = right, −π/2 = up), L arrow length
MICRO.proton = (c, sx, sy, R, o = {}) => {
  const a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a;
  FX.glowL(c, sx, sy, R * 2.4, ['y0', 'y1', 'y2'], 0.7 * a, 1.6);
  PIX.flat(c, PIX.circPath(sx, sy, R), 'y2', 'y1', 'y3', [R * 0.22, R * 0.22], [-R * 0.08, -R * 0.08]);
  c.fillStyle = P.y4; c.beginPath(); c.arc(sx - R * 0.38, sy - R * 0.38, Math.max(1, R * 0.16), 0, TAU); c.fill();
  c.restore();
};
// a moment vector (cyan arrow) with a faint dipole field around it
MICRO.moment = (c, sx, sy, ang, L, o = {}) => {
  const a = o.a ?? 1; if (a <= 0 || L < 1) return;
  const ex = Math.cos(ang), ey = Math.sin(ang), x0 = sx - ex * L * 0.42, y0 = sy - ey * L * 0.42, x1 = sx + ex * L * 0.58, y1 = sy + ey * L * 0.58;
  c.save(); c.globalAlpha = a;
  if (o.field > 0) {                                                          // dipole field lines, dotted
    for (const sc of [0.55, 0.9, 1.3]) for (const sd of [-1, 1]) {
      const n = 48; let px = null, py = null;
      for (let k = 0; k <= n; k++) {
        const th = (k / n) * Math.PI, rr = L * sc * Math.sin(th) ** 2;          // r = C sin²θ in the dipole's frame
        const lx = rr * Math.cos(th), ly = sd * rr * Math.sin(th), X = sx + lx * ex - ly * ey, Y = sy + lx * ey + ly * ex;
        if (px != null && k % 2 === 0) { c.globalAlpha = a * o.field * 0.8; PIX.bline(c, px, py, X, Y, 'c1'); }
        px = X; py = Y;
      }
    }
    c.globalAlpha = a;
  }
  BL_ARROW(c, x0, y0, x1, y1, o.col || 'c3', o.hi || 'c5', Math.max(4, L * 0.16), o.thick || 2);
  c.restore();
};
// thick arrow in screen space with a filled head
const BL_ARROW = MICRO.arrow = (c, x0, y0, x1, y1, col = 'c3', hi = 'c5', head = 5, thick = 2) => {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const ex = x1 - Math.cos(a) * head * 0.6, ey = y1 - Math.sin(a) * head * 0.6;
  for (let k = 0; k < thick; k++) { const ox = Math.round(-Math.sin(a) * (k - (thick - 1) / 2)), oy = Math.round(Math.cos(a) * (k - (thick - 1) / 2)); PIX.bline(c, x0 + ox, y0 + oy, ex + ox, ey + oy, k === 0 ? hi : col); }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col] || col; c.beginPath();
  c.moveTo(x1, y1); c.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head); c.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head); c.closePath(); c.fill(); c.restore();
};
// a scale bar with its value, bottom centre
MICRO.scaleBar = (c, pxPerM, a = 1) => {
  if (a <= 0) return;
  const units = [[1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']];
  // pick a round length near 50 px
  let best = null;
  for (const [u, name] of units) for (const m of [1, 2, 5, 10, 20, 50, 100, 200, 500]) { const L = m * u * pxPerM; if (L >= 28 && L <= 70 && !best) best = [L, `${m} ${name}`]; }
  if (!best) return;
  const [L, s] = best, x0 = Math.round(W / 2 - L / 2), y = 446;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x0 - 3, y - 12, Math.round(L) + 6, 18, 'k');
  PIX.rect(c, x0, y, Math.round(L), 1, 'g8'); PIX.rect(c, x0, y - 3, 1, 4, 'g8'); PIX.rect(c, x0 + Math.round(L) - 1, y - 3, 1, 4, 'g8');
  PIX.text(c, s, W / 2, y - 10, 'g9', { align: 'center' });
  c.restore();
};
})();
