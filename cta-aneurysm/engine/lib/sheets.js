// SHEETS — the production package's reference sheets, drawn by the same engine as the film (tools/render.py --sheets):
//   anatomy   the artery model (front and side), the aneurysm's neck and dome, the matching axial section
//   scanner   the axial schematic (ring, tube, fan, detector arc), the tube insert in cutaway, one detector element
//   palette   the colour code with its sprites: electron, nucleus, X-ray photon, scintillation light, signal, contrast
//             molecule, blood cell, amber annotation, the CT grey ramp, and the film's palette swatches
// Labels on the sheets are English (they are production documents; the film's own labels are Azerbaijani).
(() => {
const { W, H, P } = PIX;
const SHEETS = window.SHEETS = {};
const T = (c, s, x, y, col = 'g9', o = {}) => PIX.text(c, s, x, y, col, { shadow: null, ...o });
const lab = (c, s, ax, ay, x, y, col = 'w') => { PIX.bline(c, ax, ay, x + (x < ax ? PIX.textWidth(s) + 2 : -2), y + 3, 'g6'); PIX.rect(c, Math.round(ax) - 1, Math.round(ay) - 1, 2, 2, 'g7'); T(c, s, x, y, col); };
const title = (c, s, sub) => { PIX.rect(c, 0, 0, W, 30, 'n1'); T(c, s, 10, 8, 'w', { sc: 2 }); if (sub) T(c, sub, 10, 34, 'g7'); };
SHEETS.anatomy = c => {
  PIX.rect(c, 0, 0, W, H, 'k');
  title(c, 'ANATOMY', 'one patient model: arteries, aneurysm, sections');
  const v = { ...window.S01.V0, s: 2.35, cy: 196 };
  window.drawNetwork(c, 0, v, { pulse: false });
  const P_ = (x, y, z) => VES.proj(v, x, y, z), at = (nm, f) => { const p = VES.byName[nm].pts, q = P_(...p[Math.floor((p.length - 1) * f)].slice(0, 3)); return [q[0], q[1]]; };
  const a = VES.anScreen(v); VES.ring(c, a.x, a.y, a.r + 4, 1, 0);
  lab(c, 'ANEURYSM (R MCA BIF.)', a.x, a.y + a.r, 8, 292, 'a2');
  lab(c, 'R ICA', ...at('icaR', 0.62), 8, 330); lab(c, 'L ICA', ...at('icaL', 0.62), 300, 330);
  lab(c, 'M1', ...at('m1R', 0.5), 64, 96); lab(c, 'M2 SUP', ...at('m2sR', 0.6), 8, 60); lab(c, 'M2 INF', ...at('m2iR', 0.6), 8, 250);
  lab(c, 'A1/A2', ...at('a2L', 0.25), 290, 70); lab(c, 'BASILAR', ...at('ba', 0.5), 284, 300); lab(c, 'PCA', ...at('p2L', 0.4), 300, 240);
  // the sac in close-up (front view) and its parts
  const v2 = { ...v, s: 9.5, cx: 92, cy: 470, ox: VES.AN.cDraw[0] + 2, oy: VES.AN.cDraw[1], oz: VES.AN.cDraw[2] + 1 };
  // render the close-up into a copy of the frame and keep only the inset rectangle (putImageData ignores clipping)
  { PIX.rect(c, 6, 372, 172, 200, 'n0'); const base = c.getImageData(0, 0, W, H), img = c.getImageData(0, 0, W, H); VES.render(img, { ...v2, mode: 'blood' });
    for (let y = 372; y < 572; y++) for (let x = 6; x < 178; x++) { const i = (y * W + x) * 4; base.data[i] = img.data[i]; base.data[i + 1] = img.data[i + 1]; base.data[i + 2] = img.data[i + 2]; }
    c.putImageData(base, 0, 0); }
  WS.frame(c, 6, 372, 172, 200, 'SAC (DRAWN 1.3x)');
  const s2 = VES.anScreen(v2), nk = VES.proj(v2, ...VES.AN.bif.map((q, i) => q + VES.AN.dir[i] * VES.AN.neckLen * VES.RS));
  lab(c, 'DOME', s2.x, s2.y - s2.r, 120, 384, 'w'); lab(c, 'NECK', nk[0], nk[1], 120, 556, 'w');
  // the matching axial section through the sac (tilted like the scan)
  const x = 186, y = 372, w = 168; PIX.rect(c, x, y, w, 200, 'k');
  const A = WS.P0, [u, vv] = WS.toImg('ax', A[0], A[1], A[2]), view = WS.image(c, WS.AX, WS.N, x, y + 16, w, w, { z: 2.0, u0: u, v0: vv });
  WS.frame(c, x, y + 16, w, w, 'AX CTA'); const [sx, sy] = view.map(u, vv); VES.ring(c, sx, sy, 3.2 * view.k + 3, 1, 0);
  T(c, 'right side of patient = image left', 8, 596, 'g7'); T(c, 'arterial phase: lumen +330 HU (illustrative)', 8, 610, 'g7');
};
SHEETS.scanner = c => {
  PIX.rect(c, 0, 0, W, H, 'k');
  title(c, 'SCANNER + DETECTOR', 'axial schematic, tube insert, one detector element');
  const o = { ...AXI.O, cy: 170, s: 0.48, Rs: 92, Rd: 84 };
  AXI.ring(c, o, 1); AXI.head(c, o, { c8: PIX.hex(P.v2) }); AXI.parts(c, 0.5, o, {});
  T(c, 'TUBE', 258, 70, 'g9'); T(c, 'DETECTOR ARC', 20, 248, 'e3'); T(c, 'STATIONARY HOUSING', 230, 270, 'q5'); T(c, 'SOURCE+DETECTOR ROTATE', 8, 60, 'g8');
  // the tube insert
  inset(c, 0, 290, W, 150, cc => { PIX.rect(cc, 0, 290, W, 150, 'n0'); K.cam(cc, { x: -12, y: -36, z: 1.25 }); cc.translate(0, 0); TUBE.draw(cc, { z: 1.25, t: 0, cut: 1, spin: 0, fil: 0.6, hv: 1 }); cc.setTransform(1, 0, 0, 1, 0, 0); });
  PIX.rect(c, 0, 290, W, 1, 'n3'); PIX.rect(c, 0, 440, W, 1, 'n3');
  T(c, 'CATHODE (-)', 8, 296, 'c3'); T(c, 'ROTATING W ANODE (+)', 230, 296, 'o2'); T(c, 'VACUUM', 150, 426, 'g7');
  // one detector element, scaled
  c.save(); c.translate(W / 2, 452); c.scale(0.42, 0.42); c.translate(-W / 2, -60); DET.cross(c, {}); c.restore();
  T(c, 'ANTI-SCATTER PLATE', 8, 470, 'g8'); T(c, 'SCINTILLATOR', 8, 500, 'e3'); T(c, 'PHOTODIODE', 8, 540, 'b4'); T(c, 'READOUT', 8, 572, 'g8');
  T(c, 'energy-integrating: one total per view', 8, 604, 'g7'); T(c, 'geometry drawn bigger than true (schematic)', 8, 618, 'g7');
};
SHEETS.palette = c => {
  PIX.rect(c, 0, 0, W, H, 'k');
  title(c, 'PARTICLES + PALETTE', 'shape and motion carry identity, not only colour');
  // FX sprites draw in screen pixels (they reset the transform), so each row passes its own y
  const rows = [['ELECTRON', (cc, y) => FX.e(cc, 40, y, 3, 1, true)], ['NUCLEUS', (cc, y) => FX.nuc(cc, 40, y, 7, 53)], ['X-RAY PHOTON', (cc, y) => FX.ph(cc, 40, y, 0, 7, 18, 4, 1)],
    ['SCINTILLATION LIGHT', (cc, y) => FX.ph(cc, 40, y, 0, 5, 12, 3, 1, ['e0', 'e1', 'e2', 'e3'])], ['SIGNAL (PALE BLUE)', (cc, y) => { PIX.rect(cc, 26, y - 2, 30, 4, 'b3'); PIX.rect(cc, 26, y - 2, 30, 1, 'b4'); }],
    ['IODINATED CONTRAST', (cc, y) => FLOW.mol(cc, 40, y, 0.4, 1.6)], ['BLOOD CELL', (cc, y) => { cc.fillStyle = P.d3; cc.beginPath(); cc.ellipse(40, y, 9, 6, 0.3, 0, U.TAU); cc.fill(); cc.fillStyle = P.d2; cc.beginPath(); cc.ellipse(41, y + 1, 4, 2.5, 0.3, 0, U.TAU); cc.fill(); }],
    ['ANEURYSM ANNOTATION', (cc, y) => VES.ring(cc, 40, y, 10, 1, 0)], ['HOLE (+ CARRIER)', (cc, y) => DET.hole(cc, 40, y)]];
  rows.forEach(([n, f], i) => { const y = 64 + i * 30; f(c, y); T(c, n, 80, y - 3, 'w'); });
  // CT grey ramp
  const gy = 344; T(c, 'CT DISPLAY (GRAYSCALE)', 8, gy - 12, 'w');
  ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w'].forEach((k, i) => PIX.rect(c, 8 + i * 24, gy, 24, 12, k));
  // swatches
  const groups = [['NAVY', 'k n0 n1 n2 n3 n4 n5'], ['IVORY', 'q0 q1 q2 q3 q4 q5 q6'], ['CYAN e-', 'c0 c1 c2 c3 c4 c5'], ['YELLOW X', 'y0 y1 y2 y3 y4'], ['GREEN LIGHT', 'e0 e1 e2 e3'],
    ['PALE BLUE', 'b0 b1 b2 b3 b4'], ['VIOLET I', 'v0 v1 v2 v3'], ['BLOOD', 'd0 d1 d2 d3 d4 d5'], ['MAGENTA NUC', 'm0 m1 m2 m3'], ['AMBER', 'a0 a1 a2'], ['TISSUE', 'p0 p1 p2 p3'], ['HEAT', 'r0 r1 r2 r3 o0 o1 o2']];
  groups.forEach(([n, ks], i) => { const y = 376 + i * 20; T(c, n, 8, y + 2, 'g8'); ks.split(' ').forEach((k, j) => { PIX.rect(c, 108 + j * 34, y, 32, 14, k); }); });
};
})();
