// S13 · 1:23–1:31 — WHY GOLD ATOMS APPEAR BRIGHT. The same probe, the same stream of electrons (identical impact
// parameters), two targets: a carbon atom (Z = 6) and a gold atom (Z = 79). Carbon's small, well-screened charge
// barely deflects anything; gold's large nuclear charge throws many electrons to high angles. The high-angle hits are
// counted, and the counts become image pixels: dark for carbon, bright for gold. HAADF signal grows roughly as Z^1.7
// (about 80× more for gold than for a single carbon atom) — though thickness and imaging conditions matter too, so
// brightness alone is not an element label.
(() => {
const { W, H } = PIX;
const PAN = [{ Z: 6, y: 92, name: 'CARBON', col: 'g8' }, { Z: 79, y: 258, name: 'GOLD', col: 'y3' }];
const AX = 82, PH = 156, SC_ = 0.42, HIT = 0.33;                              // atom x, panel height, path scale, high-angle threshold (rad)
const T0 = 0.5, T_PIX = 4.3, T_SUM = 5.5;
let EV = [];
function panel(c, lt, P_, i) {
  const ay = P_.y + 62, T = 83 + lt;
  PIX.rect(c, 6, P_.y, W - 12, PH, 'n0'); PIX.rect(c, 6, P_.y, W - 12, 1, 'n2');
  c.save(); c.beginPath(); c.rect(6, P_.y + 1, 158, PH - 2); c.clip();
  ATOM.draw(c, AX, ay, P_.Z > 20 ? 34 : 15, P_.Z, { pot: 0.6, t: T });
  // HAADF annulus (schematic): two short bars low in the panel, outside the low-angle cone
  for (const sg of [-1, 1]) PIX.rect(c, AX + sg * 40 - (sg < 0 ? 26 : 0), P_.y + PH - 12, 26, 3, 'c4');
  let hits = 0;
  for (const e of EV) {
    const tr = e.tr[i], d = (lt - e.t) * 230; if (d <= 0) continue;
    const big = Math.abs(tr.ang) > HIT;
    const draw = (pts, col) => { let pv = null; for (const p of pts) { const q = [AX + p[0] * SC_, ay + p[1] * SC_]; if (pv) PIX.bline(c, pv[0], pv[1], q[0], q[1], col); pv = q; } };
    if (d > tr.L) { if (big) hits++; draw(tr.pts, big ? (P_.Z > 20 ? 'y1' : 'g4') : 'c0'); continue; }
    const tail = []; for (let k = 0; k < 6; k++) { const [x, y] = K.along(tr.pts, Math.max(0, d - k * 12)); tail.push([AX + x * SC_, ay + y * SC_]); }
    FX.trail(c, tail, 1); FX.e(c, tail[0][0], tail[0][1], 1, 1);
  }
  c.restore();
  // counter
  const bx = 172, by = P_.y + 14;
  PIX.text(c, P_.name, bx, by, P_.col); PIX.text(c, `Z = ${P_.Z}`, bx, by + 12, 'w');
  PIX.text(c, 'HIGH-ANGLE', bx, by + 32, 'g7', { shadow: null }); PIX.text(c, 'HITS', bx, by + 41, 'g7', { shadow: null });
  PIX.text(c, String(hits), bx + 82, by + 34, P_.Z > 20 ? 'y4' : 'g9', { sc: 2, align: 'right' });
  PIX.rect(c, bx, by + 56, 84, 5, 'g2'); PIX.rect(c, bx, by + 56, Math.round(84 * Math.min(1, hits / 24)), 5, P_.Z > 20 ? 'y3' : 'g6');
  // the pixel this makes
  const kP = U.clamp((lt - T_PIX - i * 0.2) / 0.3);
  if (kP > 0) {
    const v = P_.Z > 20 ? 1 : 0.18, col = v > 0.9 ? 'w' : 'g3', s = Math.round(26 * MO.backOut(kP, 2));
    PIX.rect(c, bx + 42 - s / 2 - 2, by + 92 - s / 2 - 2, s + 4, s + 4, 'g5'); PIX.rect(c, bx + 42 - s / 2, by + 92 - s / 2, s, s, col);
    if (kP > 0.8) PIX.text(c, 'PIXEL', bx + 42, by + 110, 'g7', { align: 'center', shadow: null });
  }
  return hits;
}
SC.s13_zcontrast = {
  xin: 0.4,
  init() {
    // one stream of electrons, sent at both atoms
    const r = U.rng(613), list = []; let t = T0;
    for (let i = 0; i < 46; i++) {
      const u = Math.max(1e-9, r()), v = r(); let b = Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v) * 20;
      if (i % 4 === 1) b = (r() < 0.5 ? -1 : 1) * (7.6 + r() * 4);
      if (Math.abs(b) < 7.6) b = Math.sign(b || 1) * (7.6 + Math.abs(b));
      list.push({ t, b }); t += 0.06 + r() * 0.05;
    }
    EV = list.map(e => ({ ...e, tr: PAN.map(P_ => { const p = ATOM.path(e.b, P_.Z, ATOM.KAPPA, { y0: -150, y1: 220 }); let L = 0; for (let k = 1; k < p.pts.length; k++) L += Math.hypot(p.pts[k][0] - p.pts[k - 1][0], p.pts[k][1] - p.pts[k - 1][1]); return { pts: p.pts, ang: p.ang, L: L * SC_ }; }) }));
    for (const e of EV) for (const tr of e.tr) { tr.pts = tr.pts; tr.L = tr.L / SC_; }
  },
  draw(c, lt) {
    const z = 1 + 0.05 * MO.smooth(U.clamp((lt - T_SUM) / 2.4));               // the slow push of the second shot
    const body = cc => {
      PIX.rect(cc, 0, 0, W, H, 'k');
      PAN.forEach((P_, i) => panel(cc, lt, P_, i));
    };
    if (z > 1.001) { ZX.setTransform(1, 0, 0, 1, 0, 0); body(ZX); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(ZC, W / 2 - W / 2 * z, 240 - 240 * z, W * z, H * z); c.restore(); }
    else body(c);
    CAP.note(c, lt, { text: 'HEAVIER ATOMS SCATTER MORE STRONGLY', x: W / 2, y: 426, t0: T_SUM, col: 'y4', box: true, align: 'center', rate: 60 });
    CAP.note(c, lt, { text: 'HAADF SIGNAL ~ Z^1.7: GOLD ~80x CARBON', x: W / 2, y: 440, t0: T_SUM + 0.6, col: 'g9', box: true, align: 'center', rate: 70 });
    CAP.note(c, lt, { text: 'THICKNESS AND SETTINGS MATTER TOO', x: W / 2, y: 454, t0: T_SUM + 1.3, col: 'g6', box: true, align: 'center', rate: 70 });
    CAP.scene(c, lt, { title: 'WHY GOLD ATOMS APPEAR BRIGHT', ctx: ['SAME PROBE, TWO ATOMS'], t0: 0.25, acc: 'y3' });
  },
  cues: () => {
    const out = [[0.25, 'title_hit', 0.7]];
    EV.forEach(e => { if (Math.abs(e.tr[1].ang) > HIT) out.push([e.t + 0.5, 'gold_ping', 0.8, 0.3]); else if (Math.abs(e.tr[0].ang) > HIT) out.push([e.t + 0.5, 'carbon_tick', 0.8, -0.3]); });
    out.push([T_PIX, 'pixel_dark', 1, -0.3], [T_PIX + 0.2, 'pixel_bright', 1, 0.3], [T_SUM, 'confirm', 0.9]);
    return out;
  },
};
const ZC = document.createElement('canvas'); ZC.width = W; ZC.height = H; const ZX = ZC.getContext('2d', { willReadFrequently: true });
})();
