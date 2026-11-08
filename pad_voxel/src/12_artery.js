'use strict';
// ============================================================================
// THE ARTERY, CUT LENGTHWISE (scenes 4-11). Local units = one cube; the axis
// runs along x, the front half (z > 0) is cut away so we look into the lumen
// and see the wall's layers on the cut faces: endothelium (cobblestone cells),
// intima, internal elastic lamina, media (smooth-muscle bands), adventitia.
// Disease is a state, not a new object: g (0..1) grows a wall-based plaque
// (lipid core, fibrous cap, calcium) that narrows the channel eccentrically —
// it is always part of the wall and covered by endothelium; 'occ' fills the
// channel of a segment completely; 'col' widens collateral channels.
// Blood: red cells follow streamlines that squeeze through the narrowing
// (same flux, so they go faster at the throat), pulsing at 80 beats a minute.
// ============================================================================
const AR = { L: 500, RL: 22, RI: 23, RIEL: 24, RM: 30, RO: 35, XS: -95, WS: 34, XO: 105, WO: 40 };
const M_ENDO = mat('endo', ['#2A7D93', '#4FB3CB', '#7FD6EA', '#A8E9F6', '#D6F7FF'], { speck: 0.04 });
const M_ENDOB = mat('endoBorder', ['#226E84', '#3C97AE', '#66C4DA', '#8CD9EA', '#BCEEF8']);
const M_ENDOX = mat('endoSick', ['#6A3A20', '#A0603A', '#D9935E', '#E8B07E', '#F6D2AE'], { speck: 0.1 });
const M_INT = mat('intima', ['#3C7F8C', '#5FA6B2', '#8CCBD4', '#B0DDE4', '#D8F0F4']);
const M_IEL = mat('iel', ['#7AA9B4', '#B4D8E0', '#E2F4F8', '#F2FAFC', '#FFFFFF']);
const M_MED = mat('media', ['#0E4558', '#1D6C84', '#2E97B4', '#46C6E6', '#86DDF0'], { speck: 0.05 });
const M_MED2 = mat('media2', ['#0B3A4A', '#175E74', '#26839E', '#3AAFCE', '#72CFE6']);
const M_ADV = mat('adventitia', ['#0A2A36', '#124257', '#1C5D76', '#2A7896', '#4A98B4'], { speck: 0.12 });
const M_LIP = mat('lipidCore', ['#6A4A06', '#B07E10', '#E8B630', '#F6D262', '#FFEBA6'], { speck: 0.2 });
const M_CAP = mat('fibCap', ['#6E3A10', '#B0642A', '#E89A52', '#F4BC80', '#FFDDB8'], { speck: 0.1 });
const M_RBC = mat('rbc', ['#4A0E16', '#7A1A26', '#A8323E', '#C24A54', '#DA7078']);
const M_GLU = mat('glucose', ['#7A6A2A', '#B8A44A', '#E8D67A', '#F6EAA8', '#FFFADC'], { ol: 0 });
const M_LDL = mat('ldl', ['#7A5A06', '#C09010', '#F0C030', '#FFDA6A', '#FFF0B0']);
const M_WBC = mat('wbc', ['#6A7380', '#A3ACB8', '#D2D9E2', '#E6EBF1', '#F8FAFC'], { speck: 0.08 });
const M_NUC = mat('nucleus', ['#2E3644', '#4A5466', '#6A7690', '#8A96AE', '#B2BCD0']);
const M_FOAM = mat('foam', ['#7A5A20', '#C0943E', '#EAC874', '#F6DFA0', '#FFF2D0'], { speck: 0.3 });
// lumen narrowing profile at x for plaque growth g: returns [scale k (0..1), upward shift s of the channel centre]
function plaqueAt(x, g, xc, w) { const u = (x - (xc || 0)) / (w || 34), b = Math.exp(-u * u * 1.6); return [1 - 0.66 * g * b, 0.42 * AR.RL * g * b]; }
// y of the channel surface on the plaque side (−y) at x
function wallSurfY(x, g, xc, w) { const p = plaqueAt(x, g, xc, w); return p[1] - AR.RL * p[0]; }
function occAt(x, o) { if (!o) return 1; const a = Math.abs(x - (o.xc || 0)) / (o.w || 40); return a < 1 ? 0 : a < 1.35 ? (a - 1) / 0.35 : 1; }
// state → grids; st: {g, xc, w (plaque), occ: {xc, w}, sick (0..1 endothelial dysfunction), front: keep z ≤ zcut}
function buildArtery(st) {
  const L = AR.L, g = st.g || 0, sick = st.sick || 0;
  const G = new VoxGrid(-L / 2, -AR.RO - 1, -AR.RO - 1, L / 2, AR.RO + 1, 1, 1);
  G.paint(-L / 2, -AR.RO - 1, -AR.RO - 1, L / 2, AR.RO + 1, 1, (x, y, z) => {
    if (z > 0.5) return 0;
    const rho = Math.sqrt(y * y + z * z); if (rho > AR.RO) return 0;
    const pk = plaqueAt(x, g, st.xc, st.w), oc = occAt(x, st.occ);
    const k = pk[0] * oc, s = pk[1], rl = AR.RL * k, dl = Math.sqrt((y - s) * (y - s) + z * z);
    if (rho > AR.RM + 1) return M_ADV;
    if (rho > AR.RIEL) { const band = Math.floor((x + 200) / 4 + (rho > 27 ? 1 : 0)) & 1; return rho > AR.RM ? M_IEL : band ? M_MED : M_MED2; }
    if (rho > AR.RI) return M_IEL;
    // inside the internal elastic lamina: the intima, which the plaque thickens
    if (oc < 1 && k < 0.05) return hash3(Math.round(x / 3), Math.round(y / 3), Math.round(z / 3)) < 0.18 ? M_CAL : M_OCC;   // the occluded segment: no channel
    if (dl <= rl) return 0;                                                     // the open channel
    const depth = dl - rl;                                                       // distance from the channel surface
    if (depth <= 1.2) {                                                          // endothelial lining on the channel surface
      const cx = Math.floor((x + 200) / 7 + (Math.floor(Math.atan2(z, y - s) * 6) & 1) * 0.5), cy = Math.floor(Math.atan2(z, y - s) * 6);
      const border = ((x + 200) % 7) < 1 || (Math.atan2(z, y - s) * 6 - cy) < 0.18;
      if (sick > 0 && hash2(cx, cy) < sick * 0.3 && Math.abs(x - (st.xc || 0)) < 70) return M_ENDOX;
      return border ? M_ENDOB : M_ENDO;
    }
    if (k > 0.97 && oc >= 1) return M_INT;
    // plaque: fibrous cap near the channel, lipid core deeper, calcium where it is old
    const calc = st.cal || 0, hh = hash3(Math.round(x / 3), Math.round(y / 3), Math.round(z / 3));
    if (depth < 3.5) return M_CAP;
    if (calc > 0 && hh < calc * 0.35 && depth > 4) return M_CAL;
    return depth > 6 ? M_LIP : M_PLQ;
  });
  return G;
}
const ARTM = {};
function arteryMesh(st) {
  const key = JSON.stringify(st);
  if (!ARTM[key]) { const keys = Object.keys(ARTM); if (keys.length > 40) delete ARTM[keys[0]]; ARTM[key] = voxMesh(buildArtery(st)); }
  return ARTM[key];
}
// sprites
const SPR = {};
function sprites() {
  if (SPR.rbc) return SPR;
  const mk = (r, fn) => { const g = new VoxGrid(-r, -r, -r, r, r, r, 1); g.paint(-r, -r, -r, r, r, r, fn); return voxMesh(g); };
  SPR.rbc = mk(5, (x, y, z) => { const rr = Math.hypot(x, y); if (rr > 4.6) return 0; const th = rr < 2 ? 0.7 : 1.4; return Math.abs(z) < th ? M_RBC : 0; });
  SPR.glu = mk(3, (x, y, z) => { if (Math.abs(z) > 0.6) return 0; const a = Math.atan2(y, x), hx = Math.cos(Math.PI / 6) / Math.cos(((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6), r = Math.hypot(x, y); return r < 2.9 * hx && r > 1.4 * hx ? M_GLU : 0; });
  SPR.ldl = mk(2, (x, y, z) => x * x + y * y + z * z < 3.2 ? M_LDL : 0);
  SPR.wbc = mk(6, (x, y, z) => { const r = Math.hypot(x, y, z); if (r > 5.2) return 0; const n = Math.min(Math.hypot(x - 1.5, y, z) - 2.2, Math.hypot(x + 1.5, y + 1, z) - 2); return n < 0 && z < 1 ? M_NUC : M_WBC; });
  SPR.mac = mk(8, (x, y, z) => { const r = Math.hypot(x * 0.9, y * 1.1, z); if (r > 7) return 0; return (hash3(Math.round(x / 2), Math.round(y / 2), Math.round(z / 2)) < 0.2) ? M_NUC : M_WBC; });
  SPR.foam = mk(9, (x, y, z) => { const r = Math.hypot(x * 0.9, y * 1.15, z); if (r > 7.8) return 0; const d = hash3(Math.round(x / 2), Math.round(y / 2), Math.round(z / 2)); return d < 0.55 ? M_FOAM : d < 0.62 ? M_NUC : M_WBC; });
  return SPR;
}
// red cells: positions along streamlines through the channel profile (same flux → faster where narrower)
function cellField(st, n, seed) {
  const r = mulberry(seed || 7), cells = [];
  for (let i = 0; i < n; i++) cells.push({ eta: (r() * 2 - 1) * 0.78, zz: -r() * 0.85, ph: r(), rot: r() * TAU, tilt: (r() - 0.5) * 1.4 });
  // transit-time table along x
  const L = AR.L, N = 200, tau = new Float32Array(N + 1); let acc = 0;
  for (let i = 0; i <= N; i++) { const x = -L / 2 - 20 + (L + 40) * i / N, pk = plaqueAt(x, st.g || 0, st.xc, st.w), k = Math.max(0.08, pk[0] * occAt(x, st.occ)); tau[i] = acc; acc += k * k; }
  return { cells, tau, total: acc, N };
}
function xAtTau(F, u) { const tt = u * F.total; let lo = 0, hi = F.N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F.tau[m] <= tt) lo = m; else hi = m; } const f = (tt - F.tau[lo]) / Math.max(1e-6, F.tau[hi] - F.tau[lo]); return -AR.L / 2 - 20 + (AR.L + 40) * (lo + f) / F.N; }
// pulsatile flow clock: one surge per beat (80 / min)
function flowClock(t, rate) { const b = t / BEAT, i = Math.floor(b), f = b - i, surge = f < 0.4 ? (f - Math.sin(TAU * f / 0.4) * 0.4 / TAU) : 0.4; return (i * (0.4 + 0.6 * 0.55) + surge + Math.max(0, f - 0.4) * 0.55) * rate; }
// draw the cells; o: {xf, stopX (cells stop before this x), count}
function drawCells(cam, xf, st, F, t, o) {
  o = o || {};
  const S = sprites(), clk = flowClock(t, o.rate || 0.22);
  for (let i = 0; i < (o.count || F.cells.length); i++) {
    const c = F.cells[i];
    let u = (c.ph + clk) % 1, x = xAtTau(F, u);
    if (o.stopX !== undefined && x > o.stopX - 8) { x = o.stopX - 8 - (i % 5) * 6 - ((c.ph * 37) % 5); }   // the column halts before a block
    if (x < -AR.L / 2 + 4 || x > AR.L / 2 - 4) continue;
    const pk = plaqueAt(x, st.g || 0, st.xc, st.w), k = pk[0] * occAt(x, st.occ); if (k < 0.12) continue;
    const y = pk[1] + c.eta * AR.RL * k * 0.92, z = c.zz * AR.RL * k * 0.7;
    const m = mMul(xf, mMul(mT(x, y, z - 1), mMul(mRy(c.rot + t * 0.6), mRx(c.tilt))));
    drawVox(cam, S.rbc, m);
  }
}

// ---------------------------------------------------------------- collateral channels around the occluded segment
// pre-existing small channels (col 0) that widen with time (col 1); cut in half like the artery
function collatPaths() {
  const a = AR.XO - 78, b = AR.XO + 78;
  const P1 = [], P2 = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(a, b, u), bow = Math.sin(Math.PI * u); P1.push([x, AR.RO - 6 + bow * 34 + Math.sin(u * 9) * 3, -4]); P2.push([x + 6, -(AR.RO - 6) - bow * 24 - Math.sin(u * 7 + 1) * 3, -4]); }
  return [P1, P2];
}
function collatMesh(col) {
  const key = 'col' + Math.round(col * 8);
  return cached(key, () => {
    const c = Math.round(col * 8) / 8, G = new VoxGrid(AR.XO - 100, -AR.RO - 40, -12, AR.XO + 100, AR.RO + 50, 1, 1);
    collatPaths().forEach((pts, k) => {
      const r = (k ? 2.6 : 3.2) + c * (k ? 3.0 : 4.2);
      G.tube(pts.map(p => [p[0], p[1], p[2], r]), (s_, x, y, z, d, rr) => (z > 0.5 ? 0 : d > rr - 1.6 ? M_ART : 0));
    });
    return voxMesh(G);
  });
}
// ---------------------------------------------------------------- flow modes
function drawSprite(cam, xf, spr, x, y, z, r1, r2) { drawVox(cam, spr, mMul(xf, mMul(mT(x, y, z), mMul(mRy(r1 || 0), mRx(r2 || 0))))); }
// stagnant column above a block: no net flow, a small to-and-fro with each beat
function drawStagnant(cam, xf, st, t, n, o) {
  o = o || {};
  const S = sprites(), r = mulberry(31), xmax = AR.XO - AR.WO - 8;
  for (let i = 0; i < n; i++) {
    const x0 = lerp(-AR.L / 2 + 6, xmax, r()), eta = (r() * 2 - 1) * 0.75, zz = -r() * 0.8, rot = r() * TAU, tl = (r() - 0.5) * 1.4;
    const k = plaqueAt(x0, st.g || 0, st.xc, st.w)[0], sh = plaqueAt(x0, st.g || 0, st.xc, st.w)[1];
    const wob = 2.5 * Math.sin(TAU * (t / BEAT) + x0 * 0.05) * (o.drift === undefined ? 1 : o.drift), drift = (o.creep || 0) * ((t * 6 + i * 13) % 60);
    let x = Math.min(xmax, x0 + wob + drift);
    drawSprite(cam, xf, S.rbc, x, sh + eta * AR.RL * k * 0.9, zz * AR.RL * k * 0.7 - 1, rot + t * 0.3, tl);
  }
}
// cells through the collaterals and on, slowly, below the block
function drawCollatFlow(cam, xf, t, k) {
  if (k <= 0) return;
  const S = sprites(), paths = collatPaths();
  paths.forEach((pts, pi) => {
    const n = Math.round(9 * k), L = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const u = ((t * 0.32 + i / n + pi * 0.37) % 1), f = u * L, j = Math.floor(f), h = f - j, a = pts[j], b = pts[Math.min(L, j + 1)];
      drawSprite(cam, xf, S.rbc, lerp(a[0], b[0], h), lerp(a[1], b[1], h), -4, t + i, 0.6);
    }
  });
  // the refilled artery below the block: fewer, slower cells
  const r = mulberry(53);
  for (let i = 0; i < Math.round(10 * k); i++) {
    const x = AR.XO + AR.WO + 6 + ((t * 18 * k + r() * 200) % (AR.L / 2 - AR.XO - AR.WO - 10));
    drawSprite(cam, xf, S.rbc, x, (r() * 2 - 1) * AR.RL * 0.7, -r() * AR.RL * 0.6 - 1, r() * TAU + t, (r() - 0.5));
  }
}
