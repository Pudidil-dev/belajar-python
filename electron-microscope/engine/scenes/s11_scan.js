// S11 · 1:06–1:14 — SCANNING THE SAMPLE. Pull back from the probe to the scan coils: two pairs of deflection coils
// tilt the beam so it pivots and the focused probe lands at a new spot on the specimen — the optics steer the beam;
// nothing mechanical moves over the atoms. Then from above: the probe steps across gold atoms on carbon, left to right,
// line by line, point by point. Behind it every visited position turns into one measured pixel (its gray level is the
// detector's count there), the detector trace jumps whenever the probe sits on gold, and hundreds of electrons arrive
// at each point. Once, the beam knocks an atom to a new site — electron beams can alter what they image.
(() => {
const { W, H } = PIX;
const T_TOP = 3.15, T_SCAN = 3.5, T_DONE = 7.1;
let T_HOP = 6;
// ---------- side diagram: deflection coils, pivot, objective, specimen plane ----------
const DX = 135, YU = 118, YD = 178, YP = 232, YO = 290, YS = 372;
const defl = lt => { const u = K.wrap(lt * 0.9, 1); return u < 0.85 ? U.lerp(-1, 1, u / 0.85) : U.lerp(1, -1, (u - 0.85) / 0.15); };   // sweep + flyback
function sideView(c, lt) {
  PIX.rect(c, 0, 0, W, H, 'k'); for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  const d = defl(lt), x1 = DX + d * 16, xS = DX + d * 34;
  // coils (cut): upper pair and lower pair, glowing with the current that deflects
  for (const [yy, k] of [[YU, d], [YD, -d]]) for (const sg of [-1, 1]) {
    const on = U.clamp(k * sg * 1.2), x0 = DX + sg * 30 - (sg < 0 ? 26 : 0);
    PIX.rect(c, x0, yy - 9, 26, 18, 'g4'); PIX.rect(c, x0 + 2, yy - 7, 22, 14, on > 0.3 ? 'u2' : 'u1');
    for (let q = 0; q < 14; q += 2) PIX.rect(c, x0 + 2, yy - 7 + q, 22, 1, on > 0.3 ? 'u3' : 'u2');
  }
  OPT.lens(c, DX, YO, 0.62, { hot: 1 });
  for (let x = 20; x < W - 20; x += 6) PIX.rect(c, x, YS, 3, 1, 'g5');
  // the beam: down the axis, tilted by the upper coils, tilted back through the pivot, focused onto the specimen
  const path = [[DX, 40], [DX, YU], [x1, YD], [DX + (x1 - DX) * -0.15, YP], [xS, YO], [xS, YS]];
  for (const w of [-2, 2]) { let pv = null; for (const [x, y] of path) { const xx = x + w * (y < YO ? 1 : (YS - y) / (YS - YO)); if (pv) PIX.bline(c, pv[0], pv[1], xx, y, 'c1'); pv = [xx, y]; } }
  let pv = null; for (const p of path) { if (pv) PIX.bline(c, pv[0], pv[1], p[0], p[1], 'c3'); pv = p; }
  for (let q = 0; q < 5; q++) { const L = K.polyLen(path), [x, y] = K.along(path, K.wrap(lt * 300 + q * L / 5, L)); FX.e(c, x, y, 1, 1); }
  FX.glowL(c, xS, YS, 10, ['c1', 'c2', 'c3', 'c4'], 0.9); PIX.rect(c, Math.round(xS) - 1, YS - 1, 3, 3, 'w');
  return { xS };
}
// ---------- top view: the scan over the specimen ----------
const NX = 24, NY = 32, PX = 10;                                              // scan grid: 0.1 nm pixels, 10 screen px each
const S_NM = PX / 0.1, OX = (W - NX * PX) / 2, OY = 78;                        // px per nm; grid origin on screen
const A0 = () => HA.AU[HA.HOOK];
// grid → nm (the hook atom sits in the middle of the window)
const nmAt = (i, j) => [A0().x - NX * 0.05 + (i + 0.5) * 0.1, A0().y - NY * 0.05 + (j + 0.5) * 0.1];
// measured value per scan pixel: the micrograph averaged over the 4×4 image pixels it covers
let VAL = null, HOP = null;
function measure() {
  VAL = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const [xn, yn] = nmAt(i, j), px = xn / HA.NM, py = yn / HA.NM; let s = 0, n = 0;
    for (let dy = -2; dy < 2; dy++) for (let dx = -2; dx < 2; dx++) { const X = Math.round(px + dx), Y = Math.round(py + dy); if (X >= 0 && Y >= 0 && X < HA.IW && Y < HA.IH) { s += HA.D[Y * HA.IW + X]; n++; } }
    VAL[j * NX + i] = n ? s / n : 0;
  }
  // the atom that hops: a gold atom in the upper part of the window (scanned early enough for its note to be read)
  let best = null;
  HA.AU.forEach((a, k) => { if (k === HA.HOOK) return; const i = (a.x - (A0().x - NX * 0.05)) / 0.1, j = (a.y - (A0().y - NY * 0.05)) / 0.1; if (i > 3 && i < NX - 4 && j > 4 && j < NY - 4 && (!best || Math.abs(j - 6) < Math.abs(best.j - 6))) best = { k, i, j }; });
  HOP = best;
}
// scan progress: points visited — the first 8 points one per 16th note, then faster and faster until the frame is done
const visited = lt => {
  const t = lt - T_SCAN; if (t <= 0) return 0;
  if (t < 1) return 8 * t;
  const u = t - 1, D = T_DONE - T_SCAN - 1, a = 30, b = (NX * NY - 8 - a * D) / (D * D);
  return Math.min(NX * NY, 8 + a * u + b * u * u);
};
function topView(c, lt) {
  const T = 66 + lt, n = visited(lt), cur = Math.floor(n), ci = cur % NX, cj = Math.floor(cur / NX);
  PIX.rect(c, 0, 0, W, H, 'k');
  // the specimen: carbon network and gold atoms (nm → screen)
  const [x0n, y0n] = nmAt(0, 0), toS = (xn, yn) => [OX + (xn - x0n + 0.05) * S_NM, OY + (yn - y0n + 0.05) * S_NM];
  const N = SAMPLE.net(), L = N.L;
  c.save(); c.beginPath(); c.rect(OX, OY, NX * PX, NY * PX); c.clip();
  PIX.rect(c, OX, OY, NX * PX, NY * PX, 'g1');
  for (let ty = -1; ty <= 2; ty++) for (let tx = -1; tx <= 1; tx++) {
    const ox = OX + tx * L * S_NM, oy = OY + ty * L * S_NM;
    for (const [a, , dx, dy] of N.bonds) { const p = N.pts[a]; PIX.bline(c, ox + p[0] * S_NM, oy + p[1] * S_NM, ox + (p[0] + dx) * S_NM, oy + (p[1] + dy) * S_NM, 'g3'); }
    for (const p of N.pts) PIX.rect(c, Math.round(ox + p[0] * S_NM) - 1, Math.round(oy + p[1] * S_NM) - 1, 2, 2, 'g5');
  }
  const hopT = HOP ? U.clamp((lt - T_HOP) / 0.18) : 0;
  HA.AU.forEach((a, k) => {
    let [x, y] = toS(a.x, a.y);
    if (HOP && k === HOP.k) { x += MO.backOut(hopT, 2) * 0.23 * S_NM; y += MO.backOut(hopT, 2) * 0.25 * S_NM; }
    if (x < OX + 4 || y < OY + 4 || x > OX + NX * PX - 4 || y > OY + NY * PX - 4) return;
    SAMPLE.ball(c, x, y, 0.14 * S_NM);
  });
  // measured pixels behind the probe
  for (let p = 0; p < Math.min(cur, NX * NY); p++) {
    const i = p % NX, j = Math.floor(p / NX); let v = VAL[j * NX + i];
    if (HOP && p >= HOP_P) { /* scanned after the hop: the old site reads dark, the new one bright */
      const [hx, hy] = [HOP.i, HOP.j];
      if (Math.abs(i - hx) < 2.5 && Math.abs(j - hy) < 2.5) v = 0.18 + 0.05 * U.hash(i, j);
      if (Math.abs(i - hx - 2.3) < 2.5 && Math.abs(j - hy - 2.5) < 2.5) v = Math.max(v, 0.88 - 0.16 * Math.hypot(i - hx - 2.3, j - hy - 2.5));
    }
    const g = Math.min(1, v), col = g > 0.86 ? 'w' : g > 0.72 ? 'gb' : g > 0.6 ? 'ga' : g > 0.48 ? 'g9' : g > 0.38 ? 'g7' : g > 0.3 ? 'g5' : g > 0.22 ? 'g4' : g > 0.15 ? 'g3' : 'g2';
    PIX.rect(c, OX + i * PX, OY + j * PX, PX, PX, col);
  }
  c.restore();
  // grid lines on the scanned rows, the scan frame
  c.save(); c.globalAlpha = 0.35; for (let i = 0; i <= NX; i++) PIX.rect(c, OX + i * PX, OY, 1, Math.min(NY, cj + 1) * PX, 'k'); for (let j = 0; j <= Math.min(NY, cj + 1); j++) PIX.rect(c, OX, OY + j * PX, NX * PX, 1, 'k'); c.restore();
  PIX.rect(c, OX - 1, OY - 1, NX * PX + 2, 1, 'g6'); PIX.rect(c, OX - 1, OY + NY * PX, NX * PX + 2, 1, 'g6'); PIX.rect(c, OX - 1, OY - 1, 1, NY * PX + 2, 'g6'); PIX.rect(c, OX + NX * PX, OY - 1, 1, NY * PX + 2, 'g6');
  // the probe and the electrons arriving at it
  if (lt > T_SCAN - 0.3) {
    let sx = OX + (ci + 0.5) * PX, sy = OY + (cj + 0.5) * PX;
    if (cur >= NX * NY) { const k = MO.smooth(U.clamp((lt - T_DONE) / 0.5)), [hx, hy] = toS(A0().x, A0().y); sx = U.lerp(OX + (NX - 0.5) * PX, hx, k); sy = U.lerp(OY + (NY - 0.5) * PX, hy, k); }
    FX.glowL(c, sx, sy, 14, ['c1', 'c2', 'c3', 'c4'], 0.9); PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, 'w');
    for (let q = 0; q < 6; q++) { const a = U.hash(q, Math.floor(lt * 30)) * U.TAU, r = 8 + U.hash(q + 7, Math.floor(lt * 30)) * 10; FX.e(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 1, 0.8); }
    if (cur < NX * NY && cj > 0 && ci < 2) PIX.bline(c, OX + (NX - 0.5) * PX, OY + (cj - 0.5) * PX, sx, sy, 'c1', 1);   // flyback
  }
  if (HOP && lt > T_HOP && lt < T_HOP + 0.4) { const [hx, hy] = toS(HA.AU[HOP.k].x, HA.AU[HOP.k].y); FX.flash(c, hx + 12, hy + 12, 7, 'y4', 1 - (lt - T_HOP) / 0.4); }
  // detector trace (bottom): the last 48 points
  const gy = OY + NY * PX + 16, gh = 30;
  PIX.rect(c, OX, gy - 4, NX * PX, gh + 8, 'k'); PIX.rect(c, OX, gy - 4, NX * PX, 1, 'g3');
  let pv = null;
  for (let q = 0; q < 48; q++) {
    const p = cur - 47 + q; if (p < 0) continue;
    const v = VAL[Math.min(NX * NY - 1, p)], x = OX + q * (NX * PX - 1) / 47, y = gy + gh - v * gh;
    if (pv) PIX.bline(c, pv[0], pv[1], x, y, 'e2'); pv = [x, y];
  }
  PIX.text(c, 'DETECTOR SIGNAL', OX + 2, gy - 2, 'e3', { shadow: null });
  PIX.text(c, `X ${String(ci).padStart(2, '0')}  Y ${String(cj).padStart(2, '0')}`, OX + NX * PX - 2, gy - 2, 'c4', { shadow: null, align: 'right' });
}
let HOP_P = 1e9;
SC.s11_scan = {
  xin: 0.35,
  hookScreen() { const [x0n, y0n] = nmAt(0, 0); return [OX + (A0().x - x0n + 0.05) * S_NM, OY + (A0().y - y0n + 0.05) * S_NM]; },
  init() {
    measure();
    if (HOP) { HOP_P = Math.round(HOP.j) * NX + Math.round(HOP.i); let a = T_SCAN, b = T_DONE; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (visited(m) < HOP_P) a = m; else b = m; } T_HOP = (a + b) / 2; }
  },
  draw(c, lt) {
    if (lt < T_TOP) {
      const v = sideView(c, lt);
      CAP.note(c, lt, { text: 'SCAN COILS', x: 18, y: YU - 30, ax: DX - 30, ay: YU - 4, t0: 0.3, t1: T_TOP - 0.1, col: 'u3', lineCol: 'u2', box: true });
      CAP.note(c, lt, { text: 'THEY TILT THE BEAM', x: 18, y: YU - 18, t0: 0.7, t1: T_TOP - 0.1, col: 'g9', box: true });
      if (lt > T_TOP - 0.3) window.dissolve(c, () => {}, cc => topView(cc, lt), MO.smooth((lt - T_TOP + 0.3) / 0.3));
    } else topView(c, lt);
    // bottom rows (below the detector trace): the key line runs from the side view into the top view, where the probe
    // visibly moves over atoms that stay put; then the electron count, then the hop (t1 leaves it gone before s12's dive)
    CAP.note(c, lt, { text: 'THE PROBE MOVES - THE SAMPLE STAYS', x: W / 2, y: 462, t0: 1.1, t1: 3.85, col: 'c4', box: true, align: 'center' });
    CAP.note(c, lt, { text: 'HUNDREDS OF ELECTRONS PER POINT', x: W / 2, y: 450, t0: 3.85, t1: 6.6, col: 'g9', box: true, align: 'center' });
    CAP.note(c, lt, { text: 'THE BEAM CAN MOVE ATOMS', x: W / 2, y: 462, t0: Math.max(4.15, T_HOP + 0.05), t1: 7.7, col: 'y4', box: true, align: 'center' });
    if (lt > T_SCAN && lt < 5.1) CAP.note(c, lt, { text: 'POINT BY POINT', x: W - 14, y: 62, t0: T_SCAN + 0.05, t1: 4.8, col: 'c4', box: true, align: 'right' });
    if (lt > 4.8 && lt < 6.9) CAP.note(c, lt, { text: 'LINE BY LINE', x: W - 14, y: 62, t0: 5.1, t1: 6.6, col: 'c4', box: true, align: 'right' });
    CAP.scene(c, lt, { title: 'RASTER SCANNING', ctx: lt < T_TOP ? ['ELECTRON OPTICS STEER THE PROBE'] : ['SCANNED PIXEL BY PIXEL'], t0: lt < T_TOP ? 0.2 : T_TOP + 0.05, held: lt >= T_TOP, t1: lt < T_TOP ? null : 7.75, acc: 'c2' });
  },
  cues: () => {
    const out = [[0.2, 'title_hit', 0.7], [0.0, 'scan_sweep', 1, 0, T_TOP - 0.2], [0.3, 'blip', 0.6, -0.3], [1.1, 'blip', 0.5, 0.2], [T_TOP - 0.3, 'swoosh', 0.7]];
    for (let k = 0; k < 8; k++) out.push([T_SCAN + k / 8, 'scan_tick', 1, (k / 8 - 0.5) * 0.8, k]);
    out.push([T_SCAN + NX / 8, 'scan_roll', 1, 0, 7.9 - T_SCAN - NX / 8], [3.85, 'blip', 0.5, 0.2]);
    return out;
  },
};
})();
