// S12 · 1:14–1:23 — ELECTRONS INTERACT WITH ATOMS. The probe parked on the gold atom; the camera dives in and turns to a
// side view: the nucleus (+79) inside its electron cloud, the screened electric potential around it, the probe's
// wavefronts converging from above. Everything holds for a beat while the first electron comes in — then it passes
// close to the nucleus and swings out to a large angle. More follow, one at a time: most pass far from the nucleus and
// go on almost straight; the few that come close are thrown wide. Their paths pile up into a fan: a bright core near
// the axis and a sparse halo at high angles. Faint circles: the scattered wave.
(() => {
const { W, H } = PIX;
const CX = 135, CY = 214, RC = 80;                                            // nucleus on screen, cloud radius (≈0.15 nm)
const T_SIDE = 0.95, T_FIRST = 1.19, D_FIRST = 1.05, T_MANY = 2.6, T_FAN = 6.6, V = 340;
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
  ATOM.draw(c, CX + ox, CY + oy, RC * z, 79, { pot: U.clamp((lt - T_FIRST + 0.2) / 0.5) * 0.8, t: T });
  // finished paths pile up (dim); live electrons with trails
  let hi = 0, lo = 0;
  for (const e of EV) {
    const d = (lt - e.t) * V * (e.slow ? U.clamp((lt - e.t) / 0.9) * 0.55 + 0.45 : 1);
    if (d <= 0) continue;
    const L = e.L, big = Math.abs(e.ang) > 0.5;
    if (d > L) { big ? hi++ : lo++; let pv = null; for (const p of e.pts) { const q = S(p[0], p[1]); if (pv) PIX.bline(c, pv[0], pv[1], q[0], q[1], big ? 'y1' : 'c0'); pv = q; } continue; }
    const tail = []; for (let k = 0; k < 8; k++) { const [x, y] = K.along(e.pts, Math.max(0, d - k * 7)); tail.push(S(x, y)); }
    FX.trail(c, tail, 1, big ? ['y3', 'y2', 'y1', 'y1', 'y0'] : undefined);
    const [x, y] = tail[0]; FX.e(c, x, y, 2, 1, big);
    // the moment of closest approach: a flash, brighter for a hard swing
    if (e.closeD != null && Math.abs(d - e.closeD) < 14) FX.flash(c, x, y, big ? 6 : 2, big ? 'y4' : 'c4', 1 - Math.abs(d - e.closeD) / 14);
  }
  return { hi, lo, z };
}
SC.s12_scatter = {
  init() {
    // the first (slow) electron passes close and swings wide; then a stream from the probe's intensity profile
    const r = U.rng(7979), list = [{ t: T_FIRST, b: 8.2, slow: true }];
    let t = T_MANY;
    for (let i = 0; i < 40; i++) {
      const u = Math.max(1e-9, r()), v = r(); let b = Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v) * 24;
      if (i % 9 === 4) b = (r() < 0.5 ? -1 : 1) * (7.6 + r() * 2.4);            // now and then one passes close to the nucleus
      if (Math.abs(b) < 7.6) b = Math.sign(b || 1) * (7.6 + Math.abs(b));        // (none closer: keeps the drawn angles under ~50°)
      list.push({ t, b }); t += 0.085 + r() * 0.07;
    }
    EV = list.map(e => {
      const p = ATOM.path(e.b, 79, ATOM.KAPPA, { y0: -260, y1: 330 });
      let L = 0, closeD = null, best = 1e9; const pts = p.pts;
      for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const r_ = Math.hypot(pts[i][0], pts[i][1]); if (r_ < best) { best = r_; closeD = L; } }
      return { ...e, pts, L, ang: p.ang, closeD: best < 30 ? closeD : null };
    });
    KICKS = [{ t: 2.0, s: 1 }];
    for (const e of EV.slice(1)) {
      if (Math.abs(e.ang) <= 0.5 || e.closeD == null) continue;
      const t = e.t + e.closeD / V; if (t < T_FAN && t - KICKS[KICKS.length - 1].t > 0.4) KICKS.push({ t, s: 0.3 });
    }
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
      CAP.note(c, lt, { text: 'FAR PASS: SMALL ANGLE', x: 14, y: 404, t0: T_MANY + 0.9, t1: T_FAN + 0.2, col: 'c4', box: true });
      CAP.note(c, lt, { text: 'CLOSE PASS: LARGE ANGLE', x: 14, y: 418, t0: T_MANY + 1.4, t1: T_FAN + 0.2, col: 'y4', box: true });
      if (lt > T_MANY + 0.9) PIX.text(c, 'angles exaggerated', W - 6, 452, 'g5', { align: 'right', shadow: null });
      if (lt > T_FAN) {
        // the fan: low-angle core vs high-angle halo
        const k = U.clamp((lt - T_FAN - 0.4) / 0.4);
        const [ax, ay] = [CX, CY + 250 * z];
        PIX.bline(c, ax - 12, ay, ax + 12, ay, 'c3');
        CAP.note(c, lt, { text: 'MOST STAY NEAR THE AXIS', x: W / 2, y: 404, t0: T_FAN + 0.5, col: 'c4', box: true, align: 'center' });
        CAP.note(c, lt, { text: 'A FEW SCATTER TO HIGH ANGLES', x: W / 2, y: 418, t0: T_FAN + 1.0, col: 'y4', box: true, align: 'center' });
        if (k > 0) PIX.text(c, `HIGH-ANGLE: ${st.hi}  /  ${st.hi + st.lo}`, W / 2, 436, 'g8', { align: 'center' });
      }
    }
    CAP.scene(c, lt, { title: 'ELECTRON SCATTERING', ctx: ['ELECTRONS FEEL THE ATOM\'S', 'ELECTRIC FIELD'], t0: T_SIDE + 0.1, acc: 'y3' });
  },
  cues: () => [[0.0, 'dive', 1, 0, T_SIDE], [T_SIDE, 'reveal', 0.8], [T_SIDE + 0.1, 'title_hit', 0.7], [T_SIDE + 0.15, 'blip', 0.6, 0.3], [T_SIDE + 0.3, 'blip', 0.6, -0.3],
    [T_FIRST - 0.1, 'approach_tone', 1, 0, 0.9], [2.0, 'scatter_big', 1.2, -0.3],
    ...EV.slice(1).map(e => [e.t + (e.closeD ?? 240) / V, Math.abs(e.ang) > 0.5 ? 'scatter_big' : 'scatter_tick', Math.abs(e.ang) > 0.5 ? 0.9 : 0.7, U.clamp(-e.ang, -0.8, 0.8)]),
    [T_FAN, 'swoosh', 0.6]],
};
const ZC = document.createElement('canvas'); ZC.width = W; ZC.height = H; const ZX = ZC.getContext('2d', { willReadFrequently: true });
})();
