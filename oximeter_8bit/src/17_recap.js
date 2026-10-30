'use strict';
// ============================================================================
// RECAP ICONS: the chain in eight small tiles, each redrawn from its scene
// (LEDs, finger, blood, hemoglobin, photodiode, signal, processor, number).
// ============================================================================
function tile(x, y, s, k, col) {
  if (k <= 0) return;
  const h = s * k;
  const m = maskRR(x - h, y - h, x + h, y + h, 8);
  shade(m, P.N2, P.N3, P.N1, col || P.N5, {});
}
function iconLED(x, y, s, t) {
  rect(x - s * 0.6, y + s * 0.3, x + s * 0.6, y + s * 0.42, P.G3);
  const on = ledSlot(t, 4.3);
  for (const [dx, c0, c1, c2, me] of [[-0.3, P.LR1, P.LR3, P.LR5, 'red'], [0.3, P.IR1, P.IR3, P.IR5, 'ir']]) {
    const cx = x + dx * s, cy = y - s * 0.05, lit = on === me;
    rect(cx - s * 0.18, cy, cx + s * 0.18, y + s * 0.3, P.G2);
    disc(cx, cy, s * 0.2, lit ? c1 : c0); disc(cx - s * 0.06, cy - s * 0.07, s * 0.06, lit ? c2 : c1);
    if (lit) glow(cx, cy, s * 0.5, c0, c1, 0.6);
  }
}
function iconFinger(x, y, s, t) {
  // fingertip up with the clip's two jaws and the red glow between them
  const fw = s * 0.26;
  rect(x - fw, y - s * 0.3, x + fw, y + s * 0.7, P.SK3); disc(x, y - s * 0.3, fw, P.SK3);
  rect(x + fw - 2, y - s * 0.3, x + fw, y + s * 0.7, P.SK2);
  glow(x, y - s * 0.05, s * 0.32, P.LR2, P.LR4, 0.7);
  rect(x - fw - s * 0.2, y - s * 0.55, x - fw - 1, y + s * 0.25, P.G1); rect(x + fw + 1, y - s * 0.55, x + fw + s * 0.36, y + s * 0.25, P.GW);
  rect(x + fw + s * 0.1, y - s * 0.42, x + fw + s * 0.3, y - s * 0.05, P.DS1); rect(x + fw + s * 0.13, y - s * 0.38, x + fw + s * 0.27, y - s * 0.3, P.DY1);
  rect(x - fw - s * 0.2, y - s * 0.62, x + fw + s * 0.36, y - s * 0.5, P.G2);
}
function iconBlood(x, y, s, t) { rbc3(x - s * 0.22, y + s * 0.1, s * 0.34, 0.2, 1, 0.9, 0); rbc3(x + s * 0.24, y - s * 0.16, s * 0.3, 1, 0.3, 0.5, 0.2); }
function iconHb(x, y, s, t) { hbSprite(x, y, s * 0.62, t * 0.5, 4, t, { glow: 0.3 }); }
function iconPD(x, y, s, t) {
  rect(x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5, P.CH2); rect(x - s * 0.4, y - s * 0.4, x + s * 0.4, y + s * 0.4, P.PD1);
  rect(x - s * 0.32, y - s * 0.34, x + s * 0.32, y + s * 0.26, P.PD3);
  for (let k = 0; k < 4; k++) rect(x - s * 0.24 + k * s * 0.16, y - s * 0.34, x - s * 0.24 + k * s * 0.16 + 1, y + s * 0.26, P.PD5);
  rect(x + s * 0.18, y + s * 0.3, x + s * 0.32, y + s * 0.38, P.AU2);
}
function iconWave(x, y, s, t) {
  rect(x - s * 0.55, y - s * 0.42, x + s * 0.55, y + s * 0.42, P.DS1); frame(x - s * 0.55, y - s * 0.42, x + s * 0.55, y + s * 0.42, P.N4);
  let px_ = null, py_ = null;
  for (let i = 0; i <= 30; i++) { const u = i / 30, tt = t - (1 - u) * 2, xx = x - s * 0.5 + u * s, yy = y + s * 0.25 - pleth(tt) * s * 0.5; if (px_ !== null) lineW(px_, py_, xx, yy, 2, P.SG2); px_ = xx; py_ = yy; }
}
function iconCPU(x, y, s, t) {
  for (let i = 0; i < 4; i++) { const u = -0.3 + i * 0.2; rect(x - s * 0.5, y + u * s, x - s * 0.38, y + u * s + 2, P.G2); rect(x + s * 0.38, y + u * s, x + s * 0.5, y + u * s + 2, P.G2); rect(x + u * s, y - s * 0.5, x + u * s + 2, y - s * 0.38, P.G2); rect(x + u * s, y + s * 0.38, x + u * s + 2, y + s * 0.5, P.G2); }
  rect(x - s * 0.38, y - s * 0.38, x + s * 0.38, y + s * 0.38, P.CH1); frame(x - s * 0.38, y - s * 0.38, x + s * 0.38, y + s * 0.38, P.CH3);
  let px_ = null, py_ = null;
  for (let i = 0; i <= 12; i++) { const u = i / 12, xx = x - s * 0.26 + u * s * 0.52, yy = y - s * 0.22 + u * s * 0.44; if (px_ !== null) line(px_, py_, xx, yy, P.DT3); px_ = xx; py_ = yy; }
  disc(x - s * 0.18, y - s * 0.14, 3, P.DY1);
}
function iconSpO2(x, y, s, t) {
  rect(x - s * 0.5, y - s * 0.42, x + s * 0.5, y + s * 0.42, P.DS1); frame(x - s * 0.5, y - s * 0.42, x + s * 0.5, y + s * 0.42, P.G4);
  const c = { x: v => x - s * 0.36 + v * s * 0.072, y: v => y - s * 0.24 + v * s * 0.072, z: 1 };
  seg7(c, 0, 0, 0.62, '9', P.DY1, null); seg7(c, 5.4, 0, 0.62, '8', P.DY1, null);
  text(FS, '%', x + s * 0.28, y + s * 0.06, { sc: 1, c: P.DY1, ol: null });
}
const RECAP_ICONS = [iconLED, iconFinger, iconBlood, iconHb, iconPD, iconWave, iconCPU, iconSpO2];
const RECAP_L = ['LEDs', 'FINGER', 'BLOOD', 'HEMOGLOBIN', 'PHOTODIODE', 'SIGNAL', 'ALGORITHM', 'SpO₂'];
