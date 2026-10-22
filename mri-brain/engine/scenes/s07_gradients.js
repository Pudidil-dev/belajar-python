// S07 SPATIAL ENCODING (35–42 s): the gradient coils (the knocking of an MRI) add small, controlled slopes to B0, so the
// field — and with it the Larmor frequency — depends on position. 1: with a slope along the head's axis, an RF burst of
// one narrow frequency band excites only one slice (stepping through slices = stepping the frequency). 2: a short slope
// front-to-back leaves each row of the slice with a different phase. 3: during the read-out a slope left-to-right makes
// each column precess at its own frequency. Position is never seen directly: it is written into phase and frequency,
// and the computer decodes it later.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const S2 = window.S02;
const BEATS = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const knock = t => { let m = 0; for (const b of [0, 0.25, 0.5, 0.75, 1.0]) { const d = t - b; if (d >= 0 && d < 0.12) m = Math.max(m, 1 - d / 0.12); } return m; };
const scanCam = t => S2.rig([0.0, 0, 0.12], Math.exp(lerp(Math.log(2.4), Math.log(0.55), io(clamp((t - 0.55) / 0.55)))), lerp(0.25, 0.05, io(clamp((t - 0.55) / 0.55))), lerp(0.16, 0.04, io(clamp((t - 0.55) / 0.55))), 0);
// the brain view: a 3/4 view from behind, then tipping over to look down onto the selected slice
const Z_SL = [6, 27, 13];                                                    // slices excited on the beat (mm); the last one is kept
const zSel = t => t < 2.5 ? Z_SL[0] : t < 3.0 ? Z_SL[1] : Z_SL[2];
const viewAt = t => {
  const u = io(clamp((t - 3.3) / 0.7));
  return { cx: 135, cy: lerp(250, 238, u), s: lerp(0.95, 1.42, u), yaw: lerp(Math.PI - 0.75, Math.PI, u), pitch: lerp(0.32, 1.52, u) };
};
// the spin grid over the slice (brain x, y in mm) — only where there is tissue
let GRID = null;
const grid = () => {
  if (GRID) return GRID; GRID = [];
  for (let y = -66; y <= 66; y += 22) for (let x = -55; x <= 55; x += 22) {
    const G = VOL.G, i = Math.round((x - G.x0) / G.vs), j = Math.round((y - G.y0) / G.vs), k = Math.round((Z_SL[2] - G.z0) / G.vs);
    if (G.lab[(k * G.ny + j) * G.nx + i]) GRID.push([x, y]);
  }
  return GRID;
};
const PH_K = 0.045, FR_K = 0.05;                                               // phase per mm, frequency (rad/s) per mm
SC['s07_gradients'] = {
  init() { grid(); },
  draw(c, t, S) {
    // A) the gradient coils knocking in the machine; field arrows in the bore get longer toward the head
    if (t < 1.25) {
      const drawScan = cc => {
        const img = K.pbegin(cc), C = scanCam(t); SCAN.render(img, C, { cut: 0, t: S.t, head: 1, skin: 1, env: 1, grad: 0.35 + 0.65 * knock(t) }); K.pend(cc, img);
        for (let k = 0; k < 7; k++) { const X = 0.62 - k * 0.2, L = 0.06 + 0.035 * k, p0 = SCAN.proj(C, [X + L / 2, 0, 0.16]), p1 = SCAN.proj(C, [X - L / 2, 0, 0.16]); if (p0 && p1) MICRO.arrow(cc, p0[0], p0[1], p1[0], p1[1], 'c2', 'c4', 4, 2); }
        const p = SCAN.proj(C, [-0.45, 0, 0.39]); if (p) CAP.note(cc, t, { x: 14, y: Math.max(64, p[1] - 30), text: 'GRADIENT COILS', t0: 0.15, t1: 0.95, ax: p[0], ay: p[1], col: 'u3', lineCol: 'u2', box: true });
      };
      const drawBrain = cc => brainView(cc, t, S);
      if (t < 0.95) drawScan(c); else window.dissolve(c, drawScan, drawBrain, sm((t - 0.95) / 0.3));
    } else brainView(c, t, S);
    CAP.scene(c, t, { title: 'SPATIAL ENCODING', t0: 0.15, acc: 'u3' });
  },
  cues: () => {
    const q = [[0, 'grad_knock', 1.0, -0.2, 1.0], [0.95, 'whoosh_in', 0.6, 0, 0.5], [1.5, 'grid_on', 0.6, 0]];
    for (const [i, tt] of [[0, 2.0], [1, 2.5], [2, 3.0]]) q.push([tt, 'slice_sel', 0.9, (i - 1) * 0.4, i]);
    q.push([3.3, 'tilt', 0.6, 0, 0.7], [4.2, 'grad_knock', 0.8, -0.4, 0.5], [4.25, 'phase_twist', 0.8, 0, 0.5], [5.3, 'grad_knock', 0.8, 0.4, 1.3], [5.3, 'freq_spread', 0.8, 0.3, 1.3], [6.55, 'resolve', 0.8, 0]);
    for (let b = 0; b < 6; b++) q.push([4.0 + b * 0.5, 'beep', 0.35, (b % 2 - 0.5) * 0.6, b]);
    return q;
  },
};
function brainView(c, t, S) {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const o = viewAt(t), zs = zSel(t), top = t > 3.3;
  const flash = t >= 2.0 && t < 3.3 ? Math.max(0, 1 - ((t - 2.0) % 0.5) / 0.35) : 0;
  const v4 = PIX.hex(PIX.P.v4), v3 = PIX.hex(PIX.P.v3), Sv = VOL.S;
  const img = K.pbegin(c);
  const res = VOL.render(img, { ...o, outline: true, clip: top ? { n: [0, 0, 1], d: Z_SL[2] } : null, cut: top, cutGain: lerp(1, 0.5, sm(clamp((t - 3.8) / 0.4))),
    over: !top && t >= 2.0 ? (m => { const d = Math.abs(Sv.z[m] - zs); return d < 1.4 ? (flash > 0.3 ? v4 : v3) : null; }) : null });
  K.pend(c, img);
  // the 3D grid of field arrows (all along B0 = up; length = B0 + slope × height), hidden where the brain is in front
  const ga = (1 - sm(clamp((t - 3.3) / 0.4))) * sm(clamp((t - 1.3) / 0.4));
  if (ga > 0) {
    c.save(); c.globalAlpha = ga;
    for (let gx = -60; gx <= 60; gx += 30) for (let gy = -80; gy <= 70; gy += 30) for (let gz = -50; gz <= 60; gz += 22) {
      const [sx, sy, d] = VOL.proj(o, gx, gy, gz), p = Math.round(sy) * W + Math.round(sx);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      if (res.ID[p] !== -1 && res.ZB[p] > d) continue;
      const L = 7 + (gz + 50) * 0.075, [ex, ey] = VOL.proj(o, gx, gy, gz + L / o.s * 1.0);
      const hot = !top && t >= 2.0 && Math.abs(gz - zs) < 11;
      MICRO.arrow(c, sx, sy, sx + (ex - sx), sy + (ey - sy), hot ? 'v3' : 'c2', hot ? 'v4' : 'c4', 3, 1);
    }
    c.restore();
    // the slope, spelled out
    MICRO.arrow(c, 250, 330, 250, 130, 'c1', 'c3', 6, 2); PIX.text(c, 'B', 250, 116, 'c3', { align: 'center' });
    for (let k = 0; k < 5; k++) PIX.rect(c, 244, 320 - k * 44, 4 + k * 2, 2, 'c2');
  }
  // the excited slice: a plane through the head, frequency label
  if (!top && t >= 2.0) {
    const corners = [[-72, -90], [72, -90], [72, 84], [-72, 84]].map(([x, y]) => VOL.proj(o, x, y, zs));
    c.save(); c.globalAlpha = 0.55 + 0.45 * flash;
    for (let i = 0; i < 4; i++) { const p = corners[i], q = corners[(i + 1) % 4]; PIX.bline(c, p[0], p[1], q[0], q[1], 'v3'); }
    c.restore();
    const f = (63.86 + zs * 0.001).toFixed(3);
    CAP.note(c, t, { x: 14, y: 360, text: '1 · SLICE SELECTION', t0: 2.0, t1: 3.25, col: 'v3', box: true });
    CAP.note(c, t, { x: 14, y: 372, text: 'ONE NARROW RF BAND = ONE SLICE', t0: 2.15, t1: 3.25, col: 'w', box: true, rate: 60 });
  }
  // top view: the slice and its spins
  if (top) {
    const G = grid(), ga2 = sm(clamp((t - 3.9) / 0.3));
    const tw = sm(clamp((t - 4.2) / 0.5)), fr = Math.max(0, t - 5.3);
    if (ga2 > 0) {
      c.save(); c.globalAlpha = ga2;
      for (const [x, y] of G) {
        const [sx, sy] = VOL.proj(o, x, y, Z_SL[2]);
        const a = -Math.PI / 2 + PH_K * TAU / 6 * y * tw + FR_K * x * fr * 4, L = 15;
        MICRO.arrow(c, sx - Math.cos(a) * L * 0.4 + 1, sy - Math.sin(a) * L * 0.4 + 1, sx + Math.cos(a) * L * 0.6 + 1, sy + Math.sin(a) * L * 0.6 + 1, 'k', 'k', 6, 2);
        MICRO.arrow(c, sx - Math.cos(a) * L * 0.4, sy - Math.sin(a) * L * 0.4, sx + Math.cos(a) * L * 0.6, sy + Math.sin(a) * L * 0.6, 'c3', 'c5', 6, 2);
        PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 2, 2, 'y3');
      }
      c.restore();
    }
    // the gradients as bars along the slice's edges
    if (t > 4.15) { const a = sm(clamp((t - 4.15) / 0.2)); c.save(); c.globalAlpha = a; for (let k = 0; k < 18; k++) PIX.rect(c, 10, 330 - k * 12, 4 + Math.round(k * 0.5), 10, k > 12 ? 'c3' : k > 6 ? 'c2' : 'c1'); PIX.text(c, 'Gy', 12, 106, 'c3'); c.restore(); }
    if (t > 5.25) { const a = sm(clamp((t - 5.25) / 0.2)); c.save(); c.globalAlpha = a; for (let k = 0; k < 18; k++) PIX.rect(c, 30 + k * 12, 400 - Math.round(k * 0.5), 10, 4 + Math.round(k * 0.5), k > 12 ? 'c3' : k > 6 ? 'c2' : 'c1'); PIX.text(c, 'Gx', 248, 388, 'c3'); c.restore(); }
    CAP.note(c, t, { x: 135, y: 420, text: '2 · PHASE ENCODING', t0: 4.2, t1: 5.15, align: 'center', col: 'c3', box: true });
    CAP.note(c, t, { x: 135, y: 432, text: 'EACH ROW: ITS OWN PHASE', t0: 4.35, t1: 5.15, align: 'center', col: 'w', box: true, rate: 60 });
    CAP.note(c, t, { x: 135, y: 420, text: '3 · FREQUENCY ENCODING', t0: 5.3, t1: 6.4, align: 'center', col: 'c3', box: true });
    CAP.note(c, t, { x: 135, y: 432, text: 'EACH COLUMN: ITS OWN FREQUENCY', t0: 5.45, t1: 6.4, align: 'center', col: 'w', box: true, rate: 60 });
    CAP.note(c, t, { x: 135, y: 426, text: 'POSITION → PHASE + FREQUENCY', t0: 6.5, align: 'center', col: 'c4', box: true, rate: 70 });
  }
}
})();
