'use strict';
// ============================================================================
// DATA (screen-sized panels). Each optically measured white cell becomes one
// dot on a scattergram (measured electronic events, not a photograph). On the
// WDF plot (side scatter across, side fluorescence up) the dots gather into
// lymphocytes, monocytes, neutrophils (+ basophils) and eosinophils; the WNR
// plot (fluorescence across, forward scatter up) separates basophils. The
// colours are software group labels, not cell colours. Then the three data
// streams (impedance, optical WBC, hemoglobin) merge in the processor.
// ============================================================================
// [name, share, centre x, centre y, spread x, spread y, colour, label x, label y] (axes 0..1)
const WDF_G = [['NEUT', 0.58, 0.58, 0.30, 0.07, 0.06, 'GNE', 0.50, 0.10], ['LYMPH', 0.30, 0.22, 0.48, 0.05, 0.06, 'GLY', 0.03, 0.66], ['MONO', 0.07, 0.34, 0.74, 0.05, 0.05, 'GMO', 0.44, 0.84], ['EO', 0.05, 0.84, 0.26, 0.05, 0.05, 'GEO', 0.80, 0.44]];
const WNR_G = [['WBC', 0.99, 0.46, 0.34, 0.08, 0.06, 'C4', 0.62, 0.16], ['BASO', 0.01, 0.52, 0.72, 0.04, 0.04, 'GBA', 0.30, 0.86]];
function gauss2(i, s) { const u1 = Math.max(1e-6, hash(i * 7 + s)), u2 = hash(i * 7 + s + 1); const r = Math.sqrt(-2 * Math.log(u1)); return [r * Math.cos(TAU * u2), r * Math.sin(TAU * u2)]; }
function groupOf(i, G) { const u = hash(i * 13 + 99); let acc = 0; for (let g = 0; g < G.length; g++) { acc += G[g][1]; if (u < acc) return g; } return 0; }
// panel with axes; n dots plotted (newest flash); labels 0..1
function scattergram(x0, y0, x1, y1, kind, n, t, o) {
  o = o || {};
  const G = kind === 'WDF' ? WDF_G : WNR_G, ax = kind === 'WDF' ? ['SIDE SCATTER (SSC)', 'SIDE FLUOR. (SFL)'] : ['SIDE FLUOR. (SFL)', 'FORWARD SCATTER'];
  rect(x0, y0, x1, y1, P.DS0); frame(x0, y0, x1, y1, P.M5);
  const gx0 = x0 + 14, gy1 = y1 - 8 - 6 * (o.asc || 1), gx1 = x1 - 6, gy0 = y0 + 10 + 6 * (o.asc || 1);
  rect(gx0, gy0, gx0 + 1, gy1 + 1, P.DG2); rect(gx0, gy1, gx1, gy1 + 1, P.DG2);
  const as = o.asc || 1;
  text(FS, ax[0], (gx0 + gx1) / 2, gy1 + 4, { sc: as, c: P.SUB, ol: null, align: 'center' });
  text(FS, ax[1], gx0 + 2, y0 + 4, { sc: as, c: P.SUB, ol: null });
  text(FS, kind, gx1 - 2, y0 + 4, { sc: as, c: P.INK, ol: null, align: 'right' });
  const px = u => lerp(gx0 + 2, gx1 - 2, u), py = v => lerp(gy1 - 2, gy0 + 2, v);
  for (let i = 0; i < n; i++) {
    const g = groupOf(i, G), [dx, dy] = gauss2(i, kind === 'WDF' ? 11 : 23), gr = G[g];
    const x = px(clamp(gr[2] + dx * gr[4], 0.02, 0.98)), y = py(clamp(gr[3] + dy * gr[5], 0.02, 0.98));
    const col = o.colored ? P[gr[6]] : P.C4;
    if (i >= n - 3 && o.flash) { disc(x, y, 3, P.C6); } else if (gr[1] < 0.02) rect(x - 1, y - 1, x + 1, y + 1, col); else pset(x, y, col), pset(x + 1, y, col);
  }
  const ls = o.lsc || 2;
  if (o.labels > 0) G.forEach(gr => { text(FS, gr[0], px(gr[7]), py(gr[8]), { sc: ls, c: P[gr[6]], ol: P.SH, n: o.labels * 8 }); });
  return { px, py };
}
// the processor with three incoming streams; k 0..1 merge progress
function dataMerge(cam, t, k) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  const src = [[-112, -226, 'RBC · PLT', 'IMPEDANCE', P.SG2], [0, -262, 'WBC · DIFF', 'LASER', P.EM2], [112, -226, 'HGB', 'LIGHT', P.LG2]];
  // the chip
  const cx = 0, cy = 10;
  for (let i = 0; i < 8; i++) { const u = -48 + i * 13.7; rect(X(cx + u), Y(cy - 58), X(cx + u + 5), Y(cy - 48), P.AL2); rect(X(cx + u), Y(cy + 48), X(cx + u + 5), Y(cy + 58), P.AL2); rect(X(cx - 58), Y(cy + u), X(cx - 48), Y(cy + u + 5), P.AL2); rect(X(cx + 48), Y(cy + u), X(cx + 58), Y(cy + u + 5), P.AL2); }
  rect(X(cx - 48), Y(cy - 48), X(cx + 48), Y(cy + 48), P.CH1); frame(X(cx - 48), Y(cy - 48), X(cx + 48), Y(cy + 48), k > 0.6 ? P.DT3 : P.CH3);
  text(FS, 'PROCESSOR', X(cx), Y(cy - 4), { sc: Math.max(1, Math.round(z * 1.5)), c: k > 0.6 ? P.DT3 : P.SUB, ol: null, align: 'center' });
  src.forEach(([sx, sy, nm_, how, col], i) => {
    rect(X(sx - 50), Y(sy - 20), X(sx + 50), Y(sy + 20), P.DS1); frame(X(sx - 50), Y(sy - 20), X(sx + 50), Y(sy + 20), col);
    text(FS, nm_, X(sx), Y(sy - 14), { sc: 2, c: col, ol: null, align: 'center' });
    text(FS, how, X(sx), Y(sy + 2), { sc: 2, c: P.SUB, ol: null, align: 'center' });
    const ex = cx + (i - 1) * 30, ey = cy - 58;
    lineW(X(sx), Y(sy + 20), X(ex), Y(ey), 2 * z, P.DG2);
    for (let q = 0; q < 6; q++) { const u = ((t * 1.1 + q / 6 + i * 0.13) % 1); if (u > k * 1.2) continue; const b = hash(q + i * 7) > 0.5; const x = lerp(sx, ex, u), y = lerp(sy + 20, ey, u); text(FS, b ? '1' : '0', X(x), Y(y) - 5, { sc: 2, c: b ? P.DT4 : col, ol: null, align: 'center' }); }
  });
  // out to the report
  lineW(X(cx), Y(cy + 58), X(cx), Y(cy + 120), 2 * z, P.DT2);
  for (let q = 0; q < 4; q++) { const u = ((t * 1.4 + q / 4) % 1); if (k < 0.7) break; rect(X(cx) - 3, Y(lerp(cy + 58, cy + 120, u)) - 3, X(cx) + 3, Y(lerp(cy + 58, cy + 120, u)) + 3, P.DT4); }
  // what the processor applies: calibration, the measured volume and dilution, flagging rules and quality control
  const notes = [['CALIBRATION', -1, 0], ['DILUTION', -1, 1], ['FLAG RULES', 1, 0], ['QC CHECKS', 1, 1]];
  notes.forEach(([s_, side, row], j) => { const a = clamp((k - 0.55 - j * 0.06) * 6, 0, 1); if (a <= 0) return; text(FS, s_, X(cx + side * 12) + (side < 0 ? -2 : 2), Y(cy + 70 + row * 16), { sc: 2, c: P.SUB, ol: null, align: side < 0 ? 'right' : 'left', n: a * 18 }); });
}
// ---------------------------------------------------------------- recap minis (animated, 132 x 96 tiles)
const TW_ = 132, TH_ = 96;
function miniTile(x, y, col) { rect(x - TW_ / 2, y - TH_ / 2, x + TW_ / 2, y + TH_ / 2, P.DS1); frame(x - TW_ / 2, y - TH_ / 2, x + TW_ / 2, y + TH_ / 2, col); }
function miniImp(x, y, t) {
  miniTile(x, y, P.EC2);
  rect(x - 60, y - 16, x + 60, y + 18, P.EC0); rect(x - 4, y - 16, x + 4, y - 6, P.M4); rect(x - 4, y + 8, x + 4, y + 18, P.M4);
  const u = (t * 0.8) % 1, cx = lerp(x - 56, x + 56, u); rbc(cx, y + 1, 5, 0.4, Math.PI / 2);
  let px_ = null, py_ = null; for (let i = 0; i <= 50; i++) { const uu = u - (50 - i) / 50 * 0.9, xx = lerp(x - 56, x + 56, uu), k = senseK(xx - x, 4, 5), X_ = x - 56 + i * 2.24, Y_ = y - 22 - k * 16; if (px_ !== null) line(px_, py_, X_, Y_, P.SG2); px_ = X_; py_ = Y_; }
  text(FS, 'RBC → PULSE', x, y + 28, { sc: 2, c: P.INK, ol: null, align: 'center' });
}
function miniLaser(x, y, t) {
  miniTile(x, y, P.LZ2);
  rect(x - 4, y - 44, x + 4, y + 22, P.EC1); rect(x - 58, y - 12, x - 4, y - 10, P.LZ2); rect(x + 4, y - 12, x + 24, y - 10, P.LZ2);
  const u = (t * 0.7) % 1, cy = lerp(y + 18, y - 40, u), inB = Math.max(0, 1 - Math.abs(cy - (y - 11)) / 8);
  wbc(x, cy, 7, 'neut', t, { dye: 1, glow: inB });
  if (inB > 0) { line(x + 6, y - 11, x + 50, y - 15, P.SO2); line(x + 6, y - 11, x + 50, y - 7, P.SO2); line(x - 4, y - 7, x - 30, y + 18, P.EM2); }
  text(FS, 'WBC → LASER', x, y + 28, { sc: 2, c: P.INK, ol: null, align: 'center' });
}
function miniHgb(x, y, t) {
  miniTile(x, y, P.LG2);
  disc(x - 50, y - 10, 6, P.LG2); rect(x - 20, y - 36, x + 20, y + 16, P.TB2); rect(x - 18, y - 24, x + 18, y + 14, P.HB1); rect(x + 42, y - 18, x + 50, y - 2, P.PD3);
  for (let i = 0; i < 8; i++) { const u = ((t + i / 8) % 1), xx = lerp(x - 44, x + 42, u); if (xx > x && i % 2) continue; disc(xx, y - 10 + (i % 3 - 1) * 4, 1.6, P.LG3); }
  text(FS, 'HGB → LIGHT', x, y + 28, { sc: 2, c: P.INK, ol: null, align: 'center' });
}
function miniReport(x, y, t) {
  miniTile(x, y, P.DT3);
  [['RBC', EX.rbc, P.RB3], ['WBC', EX.wbc, P.WB3], ['PLT', EX.plt, P.PL3], ['HGB', EX.hgb, P.HB3]].forEach(([n, v, c], i) => { text(FS, n, x - 52, y - 40 + i * 13, { sc: 2, c, ol: null }); text(FS, v, x - 14, y - 40 + i * 13, { sc: 2, c: P.INK, ol: null }); });
  checkMark(x + 46, y - 22, 6, P.SG2);
  text(FS, '→ REPORT', x, y + 28, { sc: 2, c: P.INK, ol: null, align: 'center' });
}
const RECAP = [miniImp, miniLaser, miniHgb, miniReport];
