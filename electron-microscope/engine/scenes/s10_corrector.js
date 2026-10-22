// S10 · 0:59–1:06 — ABERRATION CORRECTION. The probe-forming lens as a diagram: parallel rays come down through the
// corrector, the objective lens focuses them onto the specimen plane — but a round lens bends the outer rays too
// strongly (spherical aberration), so they cross early and the probe is a blur; the wavefronts are dented at the edges.
// The corrector's multipoles (12 poles each, alternating) switch on and give the outer rays just enough outward kick:
// every ray now meets one point and the wavefronts become clean spheres. Extreme zoom into that point: the probe's
// cross-section, computed as a wave at 200 kV, narrows from ~0.14 nm (uncorrected, 10 mrad) to ~0.07 nm (corrected,
// 18 mrad) — smaller than a gold atom, and still limited by diffraction (the faint ring).
(() => {
const { W, H } = PIX;
const CX = 135, YC1 = 106, YC2 = 150, YC = 128, YL = 252, YS = 372, F = YS - YL, SL = 0.95;
const HS = [-17, -12.5, -8, -3.5, 3.5, 8, 12.5, 17];
const CSD = (1 / (F - 40) - 1 / F) / (17 * 17);
const T_RAYS = 0.45, T_ON = 1.95, D_ON = 1.0, T_ZOOM = 4.0, T_PROBE = 4.5;
const kOn = lt => MO.smooth(U.clamp((lt - T_ON) / D_ON));
const ZC = document.createElement('canvas'); ZC.width = W; ZC.height = H; const ZX = ZC.getContext('2d', { willReadFrequently: true });
function rays(c, lt, k) {
  const fan = OPT.fan(CX, HS, 40, YC1 - 22, YC2 + 22, YL, F, CSD, k, YS + 46);
  fan.forEach((pts, i) => {
    let pv = null; for (const p of pts) { if (pv) PIX.bline(c, pv[0], pv[1], p[0], p[1], Math.abs(HS[i]) > 12 ? 'c2' : 'c1'); pv = p; }
    // electrons riding each ray
    const L = K.polyLen(pts);
    for (let q = 0; q < 3; q++) { const d = K.wrap((lt - T_RAYS) * 170 + q * L / 3 + i * 9, L); if (lt < T_RAYS) continue; const [x, y] = K.along(pts, d); FX.e(c, x, y, 1, 1); }
  });
  return fan;
}
// wavefronts below the lens: arcs about the ideal focus, dented at the edges until corrected
function fronts(c, lt, k) {
  for (let i = 0; i < 4; i++) {
    const Rr = 96 - K.wrap(lt * 60 + i * 24, 96); if (Rr < 6) continue;
    const amax = Math.atan(17 / F) * 1.15; let pv = null;
    for (let q = -14; q <= 14; q++) {
      const a = q / 14 * amax, dent = (1 - k) * 260 * Math.pow(Math.abs(a), 2.2) * (Rr / 96), r = Rr - dent;
      const x = CX + Math.sin(a) * r, y = YS - Math.cos(a) * r;
      if (pv) PIX.bline(c, pv[0], pv[1], x, y, 'c4'); pv = [x, y];
    }
  }
}
function diagram(c, lt) {
  const k = kOn(lt), T = 59 + lt;
  PIX.rect(c, 0, 0, W, H, 'k'); for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  for (let y = 30; y < H; y += 4) PIX.rect(c, CX, y, 1, 2, 'n3');
  OPT.multipoleSide(c, CX, YC1, 0.95, k, T); OPT.multipoleSide(c, CX, YC2, 0.95, k, T);
  if (k > 0) for (const y of [YC1, YC2]) FX.glowL(c, CX, y, 70, ['m0', 'm1'], 0.35 * k);
  OPT.lens(c, CX, YL, SL * 0.82, { hot: 1, t: T });
  // specimen plane
  for (let x = 20; x < W - 20; x += 6) PIX.rect(c, x, YS, 3, 1, 'g5');
  PIX.text(c, 'SPECIMEN PLANE', 22, YS + 5, 'g6', { shadow: null });
  rays(c, lt, k); fronts(c, lt, k);
  // the probe at the specimen plane, small inset
  const ins = [206, YS - 2], r = 22;
  PIX.circ(c, ins[0], ins[1], r + 2, 'g3'); PIX.circ(c, ins[0], ins[1], r, 'k');
  OPT.heat(c, ins[0], ins[1], r / 0.32, OPT.BEFORE, OPT.AFTER, k, OPT.AFTER.peak, { gamma: 0.5 });
  PIX.bline(c, CX + 3, YS, ins[0] - r - 2, ins[1], 'g5', 1);
  PIX.text(c, k < 0.5 ? 'BLURRED' : 'SHARP', ins[0], ins[1] + r + 5, k < 0.5 ? 'u3' : 'y4', { align: 'center' });
  // end view of one multipole, at the side
  OPT.multipoleEnd(c, 228, 80, 17, k, T);
}
// the probe's cross-section, full frame (s px per nm)
function probeView(c, lt) {
  PIX.rect(c, 0, 0, W, H, 'k');
  const s = 440, cy = 214, mix = MO.smooth(U.clamp((lt - T_PROBE - 0.2) / 0.8));
  // the gold atom for scale: dashed circle 0.29 nm across
  const ra = 0.145 * s; for (let q = 0; q < 64; q++) { if (q % 4 === 3) continue; const a = q / 64 * U.TAU; PIX.rect(c, Math.round(CX + Math.cos(a) * ra), Math.round(cy + Math.sin(a) * ra), 1, 1, 'y2'); }
  OPT.heat(c, CX, cy, s, OPT.BEFORE, OPT.AFTER, mix, OPT.AFTER.peak, { gamma: 0.5 });
  // profile graph: before (dim) and after (bright), same scale
  const gx = 30, gy = 344, gw = 210, gh = 70;
  PIX.rect(c, gx - 4, gy - 6, gw + 8, gh + 22, 'k'); PIX.bline(c, gx, gy + gh, gx + gw, gy + gh, 'g6'); PIX.bline(c, gx, gy, gx, gy + gh, 'g6');
  const at = (P_, r) => { const f = Math.abs(r) / P_.rmax * (P_.n - 1), i = Math.floor(f); return i >= P_.n - 1 ? 0 : P_.I[i] * (1 - (f - i)) + P_.I[i + 1] * (f - i); };
  for (const [P_, col, a] of [[OPT.BEFORE, 'u1', 1], [OPT.AFTER, 'y3', mix]]) {
    if (a <= 0) continue; let pv = null;
    for (let i = 0; i <= gw; i++) { const r = (i / gw - 0.5) * 0.6, v = at(P_, r) / OPT.AFTER.peak, y = gy + gh - v * (gh - 4) * (P_ === OPT.AFTER ? a : 1); if (pv) PIX.bline(c, pv[0], pv[1], gx + i, y, col); pv = [gx + i, y]; }
  }
  PIX.text(c, '-0.3', gx - 4, gy + gh + 5, 'g6', { shadow: null }); PIX.text(c, '0', gx + gw / 2, gy + gh + 5, 'g6', { shadow: null, align: 'center' }); PIX.text(c, '0.3 nm', gx + gw + 4, gy + gh + 5, 'g6', { shadow: null, align: 'right' });
  PIX.text(c, 'BEFORE', gx + 4, gy + 2, 'u2', { shadow: null }); if (mix > 0.3) PIX.text(c, 'AFTER', gx + gw / 2 + 12, gy + 2, 'y3', { shadow: null });
  // FWHM bracket
  if (mix > 0.6) { const hw = OPT.AFTER.fwhm / 2 * s, y = cy + 44; PIX.bline(c, CX - hw, y, CX + hw, y, 'w'); PIX.rect(c, Math.round(CX - hw), y - 2, 1, 5, 'w'); PIX.rect(c, Math.round(CX + hw), y - 2, 1, 5, 'w'); }
  return { s, cy, mix, ra };
}
SC.s10_corrector = {
  xin: 0.4,
  draw(c, lt) {
    if (lt < T_ZOOM) diagram(c, lt);
    else if (lt < T_PROBE) {
      // extreme zoom into the focus point, then the probe's own cross-section
      const p = MO.cubicIn(U.clamp((lt - T_ZOOM) / (T_PROBE - T_ZOOM))), z = Math.pow(40, p);
      ZX.setTransform(1, 0, 0, 1, 0, 0); ZX.fillStyle = PIX.P.k; ZX.fillRect(0, 0, W, H); diagram(ZX, lt);
      const ty = U.lerp(YS, 240, MO.smooth(p));
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(ZC, CX - CX * z, ty - YS * z, W * z, H * z); c.restore();
      if (p > 0.55) window.dissolve(c, () => {}, cc => probeView(cc, lt), MO.smooth((p - 0.55) / 0.45));
    } else {
      const v = probeView(c, lt);
      CAP.note(c, lt, { text: 'GOLD ATOM ~0.3 nm', x: CX + 24, y: v.cy - v.ra - 26, ax: CX + v.ra * 0.62, ay: v.cy - v.ra * 0.78, t0: T_PROBE + 0.15, col: 'y3', lineCol: 'y2', box: true });
      CAP.note(c, lt, { text: 'PROBE SIZE: ~0.07 nm', x: CX, y: v.cy + 50, t0: T_PROBE + 0.55, col: 'w', box: true, align: 'center' });
      CAP.note(c, lt, { text: 'ILLUSTRATIVE BEST-CASE VALUE', x: CX, y: v.cy + 63, t0: T_PROBE + 0.75, col: 'g8', box: true, align: 'center' });
      CAP.note(c, lt, { text: 'DIFFRACTION LIMIT', x: 16, y: 306, ax: CX - 0.17 * v.s, ay: v.cy + 8, t0: T_PROBE + 1.0, col: 'g9', lineCol: 'g5', box: true });
    }
    // diagram labels
    if (lt < T_ZOOM) {
      CAP.note(c, lt, { text: 'OBJECTIVE LENS', x: 14, y: YL - 64, ax: CX - 60, ay: YL - 30, t0: 0.45, t1: T_ON - 0.2, col: 'g9', lineCol: 'g6', box: true });
      CAP.note(c, lt, { text: 'OUTER RAYS FOCUS TOO SOON', x: 14, y: YS - 70, ax: CX - 3, ay: YS - 40, t0: 0.7, t1: T_ON + 0.4, col: 'u3', lineCol: 'u2', box: true });
      CAP.note(c, lt, { text: 'MULTIPOLE CORRECTOR', x: 16, y: YC2 + 30, ax: CX - 58, ay: YC2 + 8, t0: T_ON - 0.2, t1: T_ZOOM - 0.1, col: 'm4', lineCol: 'm2', box: true });
      CAP.note(c, lt, { text: '12 POLES', x: 228, y: 104, t0: T_ON + 0.1, t1: T_ZOOM - 0.1, col: 'g8', box: true, align: 'center' });
      CAP.note(c, lt, { text: 'ALL RAYS MEET', x: 14, y: YS - 70, ax: CX - 2, ay: YS - 2, t0: T_ON + 0.7, t1: T_ZOOM - 0.1, col: 'y4', lineCol: 'y2', box: true });
    }
    CAP.scene(c, lt, { title: 'ABERRATION CORRECTION', ctx: lt < T_PROBE ? ['ROUND LENSES BEND OUTER RAYS TOO MUCH'] : ['ATOMIC-SCALE ELECTRON PROBE'], t0: lt < T_PROBE ? 0.35 : T_PROBE + 0.1, held: lt >= T_PROBE, acc: 'm3' });
  },
  cues: [[0.35, 'title_hit', 0.7], [T_RAYS, 'beam_focus', 0.8, 0, 1.4], [0.7, 'blip', 0.6, -0.3], [T_ON - 0.1, 'tune_clicks', 1, 0, D_ON], [T_ON + 0.1, 'field_hum', 0.8, 0, 1.2],
    [T_ON + D_ON - 0.1, 'focus_lock'], [T_ZOOM, 'zoom_punch', 1, 0, T_PROBE - T_ZOOM], [T_PROBE + 0.2, 'focus_sweep', 1, 0, 0.8], [T_PROBE + 0.55, 'crystal', 1, 0], [T_PROBE + 1.0, 'blip', 0.6, -0.3]],
};
})();
