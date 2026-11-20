// S13 · 1:23–1:31 — WHY GOLD ATOMS APPEAR BRIGHT. The same probe, the same stream of 150 electrons (identical impact
// points, sampled as in S12), two targets: a carbon atom (Z = 6) and a gold atom (Z = 79). Carbon's small, well-screened
// charge barely deflects anything; gold's large nuclear charge throws the few closest passes (~4 %) out to high angle,
// onto the annular detector's bars — only a landing on a bar counts. The counts become image pixels: dark for carbon,
// bright for gold. HAADF signal grows roughly as Z^1.7 (about 80× more for gold than for one carbon atom: 6 hits vs an
// expected 0.08) — though thickness and imaging conditions matter too, so brightness alone is not an element label.
(() => {
const { W, H } = PIX;
const PAN = [{ Z: 6, y: 92, name: 'CARBON', col: 'g8' }, { Z: 79, y: 258, name: 'GOLD', col: 'y3' }];
const AX = 82, PH = 156, SC_ = 0.42;                                          // atom x, panel height, path scale
const BAR_IN = 40, BAR_OUT = 74, BAR_Y = PH - 12 - 62;                        // detector bars: |x| from the axis (px), depth below the atom
const N_E = 150, SIG = 17, NHIT = 6;                                          // electrons, probe spread (path px), gold's expected hits
const T0 = 0.5, T_STREAM = 3.9, T_PIX = 3.6, T_SUM = 4.6;
let EV = [];
function panel(c, lt, P_, i) {
  const ay = P_.y + 62, T = 83 + lt;
  PIX.rect(c, 6, P_.y, W - 12, PH, 'n0'); PIX.rect(c, 6, P_.y, W - 12, 1, 'n2');
  c.save(); c.beginPath(); c.rect(6, P_.y + 1, 158, PH - 2); c.clip();
  ATOM.draw(c, AX, ay, P_.Z > 20 ? 34 : 15, P_.Z, { pot: 0.6, t: T });
  // HAADF annulus (schematic): two bars low in the panel, outside the low-angle cone; a hit counts only if it lands on one
  for (const sg of [-1, 1]) PIX.rect(c, AX + sg * BAR_IN - (sg < 0 ? BAR_OUT - BAR_IN : 0), P_.y + PH - 12, BAR_OUT - BAR_IN, 3, 'c4');
  let hits = 0;
  for (const e of EV) {
    const tr = e.tr[i], d = (lt - e.t) * 230; if (d <= 0) continue;
    if (d > tr.L) {                                                             // finished: incoming cyan; a hit turns gold after its close pass
      if (tr.hit) hits++;
      let pv = null; for (let k = 0; k < tr.pts.length; k += 3) { const p = tr.pts[k], q = [AX + p[0] * SC_, ay + p[1] * SC_]; if (pv) PIX.bline(c, pv[0], pv[1], q[0], q[1], tr.hit && k > tr.closeI ? 'y1' : 'c0'); pv = q; }
      continue;
    }
    const turned = tr.hit && d > tr.closeD;
    const tail = []; for (let k = 0; k < 6; k++) { const [x, y] = K.along(tr.pts, Math.max(0, d - k * 12)); tail.push([AX + x * SC_, ay + y * SC_]); }
    FX.trail(c, tail, 1, turned ? ['y3', 'y2', 'y1', 'y1', 'y0'] : undefined); FX.e(c, tail[0][0], tail[0][1], 1, 1, turned);
  }
  c.restore();
  // counter
  const bx = 172, by = P_.y + 14;
  PIX.text(c, P_.name, bx, by, P_.col); PIX.text(c, `Z = ${P_.Z}`, bx, by + 12, 'w');
  PIX.text(c, 'HIGH-ANGLE', bx, by + 32, 'g7', { shadow: null }); PIX.text(c, 'HITS', bx, by + 41, 'g7', { shadow: null });
  PIX.text(c, String(hits), bx + 82, by + 34, P_.Z > 20 ? 'y4' : 'g9', { sc: 2, align: 'right' });
  PIX.rect(c, bx, by + 56, 84, 5, 'g2'); PIX.rect(c, bx, by + 56, Math.round(84 * Math.min(1, hits / NHIT)), 5, P_.Z > 20 ? 'y3' : 'g6');
  PIX.text(c, `OUT OF ${N_E}`, bx, by + 65, 'g8', { shadow: null });
  // the pixel this makes
  const kP = U.clamp((lt - T_PIX - i * 0.2) / 0.3);
  if (kP > 0) {
    // brightness follows the count: the pixel keeps brightening while hits still arrive
    const f = P_.Z > 20 ? hits / NHIT : 0, col = P_.Z > 20 ? (f >= 0.95 ? 'w' : f >= 0.75 ? 'g9' : f >= 0.5 ? 'g7' : 'g5') : 'g3', s = Math.round(26 * MO.backOut(kP, 2));
    PIX.rect(c, bx + 42 - s / 2 - 2, by + 92 - s / 2 - 2, s + 4, s + 4, 'g5'); PIX.rect(c, bx + 42 - s / 2, by + 92 - s / 2, s, s, col);
    if (kP > 0.8) PIX.text(c, 'PIXEL', bx + 42, by + 110, 'g7', { align: 'center', shadow: null });
  }
  return hits;
}
SC.s13_zcontrast = {
  xin: 0.4,
  init() {
    // one stream of electrons, sent at both atoms: impact points from the probe's profile (as in S12); NHIT of them pass
    // within ~0.01 nm of the nucleus (~4 %), placed in the drawing plane so their swing shows; all others ≥ 5.5 px away
    const r = U.rng(613), list = []; let t = T0;
    const gauss = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v); };
    const FORCE = new Set([12, 31, 55, 80, 101, 122]);
    for (let i = 0; i < N_E; i++) {
      let bx, by;
      if (FORCE.has(i)) { bx = (i % 2 ? -1 : 1) * (8.6 + r() * 1.3); by = 0; }       // 30–42°: onto the bars
      else do { bx = gauss() * SIG; by = gauss() * SIG; } while (Math.hypot(bx, by) < 5.5);
      list.push({ t, bx, by }); t += (T_STREAM - T0) / N_E * (0.7 + 0.6 * r());
    }
    EV = list.map(e => ({ ...e, tr: PAN.map(P_ => {
      const rr = Math.hypot(e.bx, e.by), close = e.by === 0, bD = close ? Math.abs(e.bx) : 16 + (rr - 5.5) * 0.9, fx = close ? Math.sign(e.bx) : e.bx / rr;
      const p = ATOM.path(bD, P_.Z, ATOM.KAPPA, { y0: -150, y1: 220 }), pts = p.pts.map(([x, y]) => [x * fx, y]);
      let L = 0, closeD = 0, closeI = 0, best = 1e9, xBar = null;
      for (let k = 1; k < pts.length; k++) {
        L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        const r_ = Math.hypot(p.pts[k][0], p.pts[k][1]); if (r_ < best) { best = r_; closeD = L; closeI = k; }
        if (xBar == null && pts[k][1] * SC_ >= BAR_Y) xBar = Math.abs(pts[k][0]) * SC_;
      }
      const hit = xBar != null && xBar >= BAR_IN && xBar <= BAR_OUT;              // landed on the annular detector
      return { pts, L, closeD, closeI, hit };
    }) }));
  },
  draw(c, lt) {
    // the camera holds: this shot is read side by side (a bitmap push here smeared the pixel font)
    PIX.rect(c, 0, 0, W, H, 'k');
    PAN.forEach((P_, i) => panel(c, lt, P_, i));
    const dk = lt - T_PIX - 0.2;                                                  // the bright pixel lands: a shock ring
    if (dk >= 0 && dk < 0.35) FX.ring(c, 214, 364, 18 + dk * 110, 'y4', 1 - dk / 0.35);
    CAP.note(c, lt, { text: 'HEAVIER ATOMS SCATTER MORE STRONGLY', x: W / 2, y: 426, t0: T_SUM, col: 'y4', box: true, align: 'center', rate: 60 });
    CAP.note(c, lt, { text: 'HAADF SIGNAL ~ Z^1.7: GOLD ~80x CARBON', x: W / 2, y: 440, t0: T_SUM + 0.4, col: 'g9', box: true, align: 'center' });
    CAP.note(c, lt, { text: 'THICKNESS AND SETTINGS MATTER TOO', x: W / 2, y: 454, t0: T_SUM + 0.9, col: 'g8', box: true, align: 'center' });
    CAP.scene(c, lt, { title: 'WHY GOLD ATOMS APPEAR BRIGHT', ctx: ['SAME PROBE, TWO ATOMS'], t0: 0.25, acc: 'y3' });
  },
  cues: () => {
    const out = [[0.25, 'title_hit', 0.7]];
    // a click when a high-angle electron has landed on the detector, i.e. when the counter ticks up
    EV.forEach(e => { if (e.tr[1].hit) out.push([e.t + e.tr[1].L / 230, 'gold_ping', 0.8, 0.3]); if (e.tr[0].hit) out.push([e.t + e.tr[0].L / 230, 'carbon_tick', 0.8, -0.3]); });
    out.push([T_PIX, 'pixel_dark', 1, -0.3], [T_PIX + 0.2, 'pixel_bright', 1, 0.3], [T_SUM, 'confirm', 0.9]);
    return out;
  },
};
})();
