// S12 · 1:14–1:23 — ELECTRONS INTERACT WITH ATOMS. The probe parked on the gold atom; the camera dives in and turns to a
// side view: the nucleus (+79) inside its electron cloud, the screened electric potential around it, the probe's
// wavefronts converging from above. Everything holds for a beat while the first electron comes in — then it passes
// close to the nucleus and swings out to a large angle (it never touches it: the field bends it). More follow, one at a
// time. Their impact points are sampled honestly: the probe (σ ≈ 0.032 nm) is narrower than the atom (0.15 nm), seen in
// projection, and only passes within ~0.01 nm of the nucleus reach the HAADF range (≥ 70 mrad) — about 4 % (3 of 72).
// Those few are drawn as wide swings (angles exaggerated); all others as small deflections, dimmer when they pass in
// front of or behind the atom. An electron turns gold only after its close pass. Faint circles: the scattered wave.
(() => {
const { W, H } = PIX;
const CX = 135, CY = 214, RC = 80;                                            // nucleus on screen, cloud radius (≈0.15 nm)
const T_SIDE = 0.95, T_FIRST = 1.19, D_FIRST = 1.05, T_MANY = 2.6, T_FAN = 6.3, V = 340;
const N_E = 72, SIG = 17;                                                      // electrons in the stream; probe spread (px; RC = 0.15 nm)
let EV = [], KICKS = [];
// camera kicks: a hard one when the first electron swings wide, small ones on the next big swings (HUD stays still)
const kickAt = lt => {
  let a = 0, ph = 0;
  for (const k of KICKS) { const d = lt - k.t; if (d < 0 || d > 0.6) continue; const v = k.s * Math.exp(-d / 0.11); if (v > a) { a = v; ph = d; } }
  return { a, dx: 4 * a * Math.sin(ph * 88), dy: 3 * a * Math.cos(ph * 69) };
};
const camK = lt => lt < T_FAN ? 1 : 1 - 0.36 * MO.smooth(U.clamp((lt - T_FAN) / 1.2));   // zoom-out factor at the end
function sideView(c, lt, ox = 0, oy = 0) {                                    // (ox, oy): whole-pixel camera shake
  const z = camK(lt), S = (x, y) => [CX + ox + x * z, CY + oy + y * z], T = 74 + lt;
  PIX.rect(c, 0, 0, W, H, 'k');
  // incoming wavefronts: arcs converging on the atom from above; the scattered wave: faint expanding circles
  for (let i = 0; i < 4; i++) {
    const R = 200 - K.wrap(lt * 110 + i * 50, 200); if (R < RC * 0.4) continue;
    let pv = null; for (let q = -12; q <= 12; q++) { const a = q / 12 * 0.32, [x, y] = S(Math.sin(a) * R, -Math.cos(a) * R); if (pv) PIX.bline(c, pv[0], pv[1], x, y, R > 150 ? 'c0' : 'c1'); pv = [x, y]; }
  }
  if (lt > T_FIRST + D_FIRST * 0.6) for (let i = 0; i < 3; i++) {
    const R = K.wrap((lt - T_FIRST) * 90 + i * 70, 210); if (R < RC * 0.6) continue;
    const n = Math.round(R * 1.6); c.save(); c.globalAlpha = U.clamp(1 - R / 210); for (let q = 0; q < n; q++) { if (q % 5 > 1) continue; const a = q / n * U.TAU, [x, y] = S(Math.cos(a) * R, Math.sin(a) * R); PIX.rect(c, Math.round(x), Math.round(y), 1, 1, 'c1'); } c.restore();
  }
  // the field: its rings brighten for a moment as each close pass is bent (no spark on the nucleus — nothing touches it)
  let pulse = 0; for (const e of EV) if (e.ha) pulse = Math.max(pulse, Math.exp(-(((lt - e.tc) / 0.14) ** 2)));
  ATOM.draw(c, CX + ox, CY + oy, RC * z, 79, { pot: Math.min(1, U.clamp((lt - T_FIRST + 0.2) / 0.5) * 0.8 + 0.5 * pulse), potCol: pulse > 0.35 ? 'r3' : 'r2', t: T });
  // finished paths pile up (dim; gold only after the close pass); live electrons with trails
  let hi = 0, lo = 0;
  for (const e of EV) {
    const d = (lt - e.t) * V * (e.slow ? U.clamp((lt - e.t) / 0.9) * 0.55 + 0.45 : 1);
    if (d <= 0) continue;
    const L = e.L, turned = e.ha && d > e.closeD;
    if (d > L) {
      e.ha ? hi++ : lo++;
      let pv = null, acc = 0;
      for (let i = 0; i < e.pts.length; i += 2) { const p = e.pts[i], q = S(p[0], p[1]); if (pv) PIX.bline(c, pv[0], pv[1], q[0], q[1], e.ha && i > e.closeI ? 'y1' : 'c0'); pv = q; }
      continue;
    }
    const tail = []; for (let k = 0; k < 8; k++) { const [x, y] = K.along(e.pts, Math.max(0, d - k * 7)); tail.push(S(x, y)); }
    FX.trail(c, tail, 1, turned ? ['y3', 'y2', 'y1', 'y1', 'y0'] : e.depth > 0.75 ? ['c1', 'c1', 'c0', 'c0', 'c0'] : undefined);
    const [x, y] = tail[0]; FX.e(c, x, y, e.depth > 0.75 && !turned ? 1 : 2, 1, turned);
  }
  return { hi, lo, z };
}
SC.s12_scatter = {
  init() {
    // the first (slow) electron passes close and swings wide. Then a stream: each electron's impact point (bx, by) comes
    // from the probe's Gaussian profile, in 3D. Only passes within ~5 px (≈0.01 nm) of the nucleus would really reach
    // ≥ 70 mrad — about 4 % of them: here the first one plus two more, placed in the drawing plane so their swing shows.
    const r = U.rng(7979), list = [{ t: T_FIRST, bx: 8.2, by: 0, slow: true, ha: true }];
    const gauss = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v); };
    const FORCE = { 13: -8.4, 40: 7.9 };
    let t = T_MANY;
    for (let i = 0; i < N_E - 1; i++) {
      let bx, by;
      if (i in FORCE) { bx = FORCE[i]; by = 0; }
      else do { bx = gauss() * SIG; by = gauss() * SIG; } while (Math.hypot(bx, by) < 5.5);
      list.push({ t, bx, by, ha: i in FORCE }); t += 3.55 / (N_E - 1) * (0.7 + 0.6 * r());
    }
    EV = list.map(e => {
      // drawn in the plane of incidence: high-angle passes at their own distance, all others pushed to ≥ 16 px so their
      // (exaggerated) angles stay small; then projected onto the screen plane (x scaled by bx / r)
      const rr = Math.hypot(e.bx, e.by), bD = e.ha ? Math.abs(e.bx) : 16 + (rr - 5.5) * 0.9, fx = e.ha ? Math.sign(e.bx) : e.bx / rr;
      const p = ATOM.path(bD, 79, ATOM.KAPPA, { y0: -260, y1: 330 }), pts = p.pts.map(([x, y]) => [x * fx, y]);
      let L = 0, closeD = 0, closeI = 0, best = 1e9;
      for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const r_ = Math.hypot(p.pts[i][0], p.pts[i][1]); if (r_ < best) { best = r_; closeD = L; closeI = i; } }
      return { ...e, pts, L, closeD, closeI, depth: e.ha ? 0 : Math.abs(e.by) / rr, tc: e.slow ? 2.0 : e.t + closeD / V };
    });
    KICKS = EV.filter(e => e.ha).map((e, i) => ({ t: e.tc, s: i ? 0.45 : 1 }));
  },
  draw(c, lt) {
    if (lt < T_SIDE) {
      // dive into the parked probe: the top view grows around the hook atom, then the side view takes over
      const p = MO.cubicIn(U.clamp(lt / T_SIDE)), z = Math.pow(9, p);
      ZX.setTransform(1, 0, 0, 1, 0, 0); ZX.fillStyle = PIX.P.k; ZX.fillRect(0, 0, W, H); SC.s11_scan.draw(ZX, 7.999);
      const [hx, hy] = SC.s11_scan.hookScreen();
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      c.drawImage(ZC, U.lerp(0, CX - hx * z, 1), U.lerp(0, CY - hy * z, 1), W * z, H * z); c.restore();
      if (p > 0.45) window.dissolve(c, () => {}, cc => sideView(cc, lt), MO.smooth((p - 0.45) / 0.55));
    } else {
      // the shake redraws the view at a whole-pixel offset (shifting or scaling the finished bitmap would move the
      // cloud's dither against the quantizer's fixed Bayer grid and change its colour)
      const kk = kickAt(lt), st = sideView(c, lt, Math.round(kk.dx), Math.round(kk.dy)), z = st.z;
      // labels
      CAP.note(c, lt, { text: 'GOLD ATOM', x: 16, y: 96, t0: T_SIDE, t1: T_MANY + 0.6, col: 'y4', box: true });
      CAP.note(c, lt, { text: 'NUCLEUS +79', x: CX + 58, y: CY - 70, ax: CX + 3, ay: CY - 3, t0: T_SIDE + 0.15, t1: T_MANY + 0.6, col: 'r3', lineCol: 'r2', box: true });
      CAP.note(c, lt, { text: 'ELECTRON CLOUD', x: 14, y: CY + 98, ax: CX - RC * 0.7, ay: CY + RC * 0.45, t0: T_SIDE + 0.3, t1: T_MANY + 0.6, col: 'y3', lineCol: 'y2', box: true });
      CAP.note(c, lt, { text: 'ITS ELECTRIC FIELD', x: W - 8, align: 'right', y: CY + 104, ax: CX + 22, ay: CY + 20, t0: T_FIRST, t1: T_MANY + 0.6, col: 'r3', lineCol: 'r2', box: true });
      CAP.note(c, lt, { text: 'FAR PASS: SMALL ANGLE', x: 14, y: 404, t0: T_MANY + 0.7, t1: T_FAN + 0.1, col: 'c4', box: true });
      CAP.note(c, lt, { text: 'CLOSE PASS: LARGE ANGLE', x: 14, y: 418, t0: T_MANY + 1.3, t1: T_FAN + 0.1, col: 'y4', box: true });
      if (lt > T_MANY + 0.7) PIX.text(c, 'angles exaggerated', W - 6, 452, 'g8', { align: 'right', shadow: null });
      if (lt > T_FAN) {
        // the fan: low-angle core vs high-angle halo
        const k = U.clamp((lt - T_FAN - 0.4) / 0.4);
        const [ax, ay] = [CX, CY + 250 * z];
        PIX.bline(c, ax - 12, ay, ax + 12, ay, 'c3');
        CAP.note(c, lt, { text: 'MOST STAY NEAR THE AXIS', x: W / 2, y: 404, t0: T_FAN + 0.35, col: 'c4', box: true, align: 'center' });
        CAP.note(c, lt, { text: 'A FEW SCATTER TO HIGH ANGLES', x: W / 2, y: 418, t0: T_FAN + 0.65, col: 'y4', box: true, align: 'center' });
        if (k > 0) PIX.text(c, `HIGH-ANGLE: ${st.hi}  /  ${st.hi + st.lo} ELECTRONS`, W / 2, 436, 'g9', { align: 'center' });
      }
    }
    CAP.scene(c, lt, { title: 'ELECTRON SCATTERING', ctx: ['ELECTRONS FEEL THE ATOM\'S', 'ELECTRIC FIELD'], t0: T_SIDE + 0.1, acc: 'y3' });
  },
  cues: () => [[0.0, 'dive', 1, 0, T_SIDE], [T_SIDE, 'reveal', 0.8], [T_SIDE + 0.1, 'title_hit', 0.7], [T_SIDE + 0.15, 'blip', 0.6, 0.3], [T_SIDE + 0.3, 'blip', 0.6, -0.3],
    [T_FIRST - 0.1, 'approach_tone', 1, 0, 0.9], [2.0, 'scatter_big', 1.2, -0.3],
    ...EV.slice(1).filter((e, i) => e.ha || i % 3 === 0).map(e => [e.tc, e.ha ? 'scatter_big' : 'scatter_tick', e.ha ? 0.9 : 0.6, U.clamp(-Math.sign(e.bx) * (e.ha ? 0.7 : 0.3), -0.8, 0.8)]),
    [T_FAN, 'swoosh', 0.6]],
};
const ZC = document.createElement('canvas'); ZC.width = W; ZC.height = H; const ZX = ZC.getContext('2d', { willReadFrequently: true });
})();
