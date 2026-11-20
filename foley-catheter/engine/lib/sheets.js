// SHEETS — the production package's reference sheets, drawn by the film's own engine (tools/render.py --sheets):
//   anatomy   the sagittal section with its parts named and the catheter in its final position
//   device    the two-way Foley: the tip and its eyes in 3D, the longitudinal section, the cross-section, the outer end
(() => {
const { W, H, P } = PIX;
const SHEETS = window.SHEETS = {};
const T = (c, s, x, y, col = 'g9', o = {}) => PIX.text(c, s, x, y, col, { shadow: null, ...o });
const lab = (c, s, ax, ay, x, y, col = 'w') => { PIX.bline(c, ax, ay, x + (x < ax ? PIX.textWidth(s) + 2 : -2), y + 3, 'g6'); PIX.rect(c, Math.round(ax) - 1, Math.round(ay) - 1, 2, 2, 'g8'); T(c, s, x, y, col); };
const title = (c, s, sub) => { PIX.rect(c, 0, 0, W, 30, 'n1'); T(c, s, 10, 8, 'w', { sc: 2 }); if (sub) T(c, sub, 10, 34, 'g7'); };
SHEETS.anatomy = c => {
  const cam = { ...window.S01.CAM0, s: 2.05, cy: 360 };
  window.drawCutaway(c, cam, { rTip: FOLEY.R_FINAL, inflated: 1, t: 0 });
  title(c, 'ANATOMY', 'adult male pelvis, sagittal section (mm model)');
  const at = (x, y) => { const [sx, sy] = PELVIS.S(cam, x, y), l = PELVIS.lift(cam, 4); return [sx + l[0], sy + l[1]]; };
  lab(c, 'Bladder (urine)', ...at(14, 44), 240, 60, 'f3'); lab(c, 'Bladder neck', ...at(6, 2), 250, 140, 'z5'); lab(c, 'Prostate', ...at(-10, -16), 8, 300, 'x4');
  lab(c, 'Prostatic urethra', ...at(-2, -22), 8, 330); lab(c, 'Pelvic floor', ...at(-20, -39), 8, 356, 'z5'); lab(c, 'Bulbar urethra', ...at(12, -52), 8, 420);
  lab(c, 'Penile urethra', ...at(62, -90), 230, 470); lab(c, 'Pubic symphysis', ...at(36, -10), 250, 250, 'q5'); lab(c, 'Rectum', ...at(-44, 0), 8, 210, 'u3');
  lab(c, 'Balloon (in bladder)', ...at(10, 12), 240, 196, 'l4'); lab(c, 'Meatus', ...at(65, -124), 250, 600);
  T(c, 'the catheter follows the urethral lumen', 8, 612, 'g7'); T(c, 'into the bladder; balloon above the neck', 8, 624, 'g7');
};
SHEETS.device = c => {
  PIX.rect(c, 0, 0, W, H, 'k');
  title(c, 'TWO-WAY FOLEY', 'one design in every view (order from the tip)');
  // 3D tip
  window.drawUrineBg && null;
  inset(c, 6, 48, 168, 300, cc => { PIX.rect(cc, 6, 48, 168, 300, 'f0'); DEV.macro(cc, { cx: 90, cy: 62, s: 7.2, yaw: 0.9 }); });
  T(c, 'rounded closed tip', 10, 52, 'w'); T(c, 'side eye', 108, 132, 'a2'); T(c, 'balloon', 120, 230, 'l4');
  // longitudinal section
  inset(c, 186, 48, 168, 300, cc => { PIX.rect(cc, 186, 48, 168, 300, 'n0'); DEV.long(cc, { cx: 270, y0: 60, s: 6.6 }, { t: 0, flow: 0, uMax: 44, chan: 1, drain: 0.7 }); });
  T(c, 'eyes', 190, 120, 'a2'); T(c, 'drainage lumen', 190, 330, 'a2'); T(c, 'balloon lumen', 280, 330, 'c4'); T(c, 'port', 312, 220, 'c4');
  // cross-section
  DEV.cross(c, 90, 430, 18, { drain: 1, chan: 1, t: 0 });
  T(c, 'cross-section', 40, 372, 'w'); T(c, 'drainage', 26, 488, 'a2'); T(c, 'balloon', 120, 488, 'c4'); T(c, 'partition', 60, 502, 'q5');
  // outer end
  inset(c, 186, 360, 168, 270, cc => { PIX.rect(cc, 186, 360, 168, 270, 'n0'); cc.save(); cc.translate(186 - 60, 360 - 120); DEV.ports(cc, { cx: 150, cy: 260, s: 3.0 }, { t: 0, drain: 1, chan: 1 }); cc.restore(); });
  T(c, 'drainage connector', 190, 590, 'a2'); T(c, 'balloon valve', 270, 400, 'c4');
  T(c, 'amber / cyan are teaching overlays', 8, 600, 'g7'); T(c, 'not fluid colours', 8, 612, 'g7');
};
})();
