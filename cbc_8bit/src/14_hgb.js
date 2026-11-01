'use strict';
// ============================================================================
// HEMOGLOBIN (separate aliquot; world px). An SLS (sodium lauryl sulfate)
// reagent lyses the red cells: detergent molecules open the membranes, the
// hemoglobin inside is released, and SLS binds it as a stable coloured
// SLS–hemoglobin complex. In the photometer an LED shines through the cuvette;
// the complex absorbs part of the light; the photosensor measures what is
// transmitted; absorbance → concentration through the assay's calibration.
// No cells are counted here.
// ============================================================================
const HG_RBC = Array.from({ length: 9 }, (_, i) => ({ x: -130 + (i % 3) * 130 + (hash(i + 5000) - 0.5) * 40, y: -170 + Math.floor(i / 3) * 170 + (hash(i + 5001) - 0.5) * 40, ph: hash(i + 5002) * TAU }));
const HG_SLS = Array.from({ length: 60 }, (_, i) => ({ x: (hash(i + 5100) - 0.5) * 380, y: (hash(i + 5101) - 0.5) * 620, a: hash(i + 5102) * TAU, ph: hash(i + 5103) * TAU }));
function slsMol(x, y, a, z) { const ca = Math.cos(a), sa = Math.sin(a); lineW(x, y, x + ca * 8 * z, y + sa * 8 * z, 1.4 * z, P.LY1); disc(x, y, 2.4 * z, P.LY0); disc(x, y, 1.8 * z, P.LY2); }
function hbMol(x, y, z, bound, rot) {
  for (let k = 0; k < 4; k++) { const a = rot + k * TAU / 4, px = x + Math.cos(a) * 2.6 * z, py = y + Math.sin(a) * 2.6 * z; disc(px, py, 2.6 * z, bound ? P.HB0 : P.RB0); disc(px, py, 2 * z, bound ? P.HB1 : P.RB1); disc(px - 0.6 * z, py - 0.6 * z, 0.8 * z, bound ? P.HB3 : P.RB3); }
  if (bound) for (let k = 0; k < 3; k++) { const a = rot + k * TAU / 3 + 0.5; slsMol(x + Math.cos(a) * 7 * z, y + Math.sin(a) * 7 * z, a, z * 0.7); }
}
// k: 0 intact .. 0.4 membranes open .. 0.7 hemoglobin out .. 1 complexes formed
function hgbLysis(cam, t, k) {
  const z = cam.z;
  rect(0, 0, W, H, P.EC0); rect(0, 0, W, H, P.HB0, 0.25 * smooth(clamp((k - 0.5) * 2, 0, 1)));
  // detergent molecules drifting in, sticking to membranes
  for (const s of HG_SLS) { const x = s.x + 10 * Math.sin(t * 0.8 + s.ph), y = s.y + 8 * Math.cos(t * 0.7 + s.ph); slsMol(cam.x(x), cam.y(y), s.a + t * 0.5, z); }
  HG_RBC.forEach((c, i) => {
    const x = cam.x(c.x), y = cam.y(c.y), r = 34 * z, open = smooth(clamp((k - 0.15) / 0.3, 0, 1)), out = smooth(clamp((k - 0.35) / 0.35, 0, 1)), bnd = smooth(clamp((k - 0.65) / 0.3, 0, 1));
    if (open < 1) rbc(x, y, r, 0.15, c.ph, {});
    else rbc(x, y, r * (1 + 0.15 * out), 0.15, c.ph, { ghost: true, lv: 0.6 * (1 - out) });
    // hemoglobin released: molecules spread out from the cell
    if (open > 0.5) for (let m = 0; m < 9; m++) {
      const a = c.ph + m * TAU / 9 + 0.3, d = (6 + m % 3 * 8 + out * 40) * z;
      hbMol(x + Math.cos(a) * d, y + Math.sin(a) * d, z * 1.05, bnd > (m / 9), t * 0.6 + m);
    }
  });
}
// the photometer: LED (left) → cuvette → photosensor (right); o: { on, absorb (0..1 concentration shown), reading (0..1) }
function photometer(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  // bench block
  rect(X(-170), Y(40), X(170), Y(70), P.M5); rect(X(-170), Y(40), X(170), Y(43), P.M4);
  // LED in its holder
  rect(X(-160), Y(-30), X(-120), Y(40), P.M4); disc(X(-120), Y(0), 14 * z, P.LG0); disc(X(-120), Y(0), 11 * z, o.on ? P.LG2 : P.LG1); rect(X(-134), Y(-11), X(-120), Y(11), o.on ? P.LG2 : P.LG1);
  if (o.on) glow(X(-118), Y(0), 26 * z, P.LG1, P.LG2, 0.3);
  // cuvette (transparent) with the SLS-hemoglobin solution
  rect(X(-48), Y(-70), X(48), Y(40), P.TB1); rect(X(-44), Y(-66), X(44), Y(36), P.TB2);
  rect(X(-44), Y(-40), X(44), Y(36), P.HB1); rect(X(-44), Y(-40), X(44), Y(36), P.HB2, 0.35); rect(X(-44), Y(-40), X(44), Y(-37), P.HB3);
  for (let i = 0; i < 18; i++) hbMol(X(-38 + (i % 6) * 15), Y(-28 + Math.floor(i / 6) * 22 + 3 * Math.sin(t * 2 + i)), z * 0.8, true, t + i);
  // photosensor (metallic blue)
  rect(X(120), Y(-30), X(160), Y(40), P.M4); rect(X(122), Y(-14), X(134), Y(14), P.PD1); rect(X(124), Y(-11), X(132), Y(11), o.reading > 0 ? P.PD4 : P.PD3);
  // light: photons cross; some are absorbed in the cuvette, fewer arrive
  if (o.on) for (let i = 0; i < 26; i++) {
    const u = ((t * 0.9 + i / 26) % 1), x = lerp(-110, 122, u), y = ((i * 7) % 11 - 5) * 2.2;
    const absorbed = hash(i * 31 + Math.floor(t * 0.9 + i / 26) * 7) < (o.absorb || 0) * 0.55, xa = -30 + hash(i + 77) * 60;
    if (absorbed && x > xa) { if (x < xa + 6) disc(X(xa), Y(y), 1.6 * z * (1 - (x - xa) / 6), P.LG1); continue; }
    disc(X(x), Y(y), 2.2 * z, P.LG2); disc(X(x), Y(y), 1.1 * z, P.LG3);
  }
  // readout
  if (o.reading > 0) {
    const rx = X(-150), ry = Y(110), sc = Math.max(1, Math.round(z * 1.4));
    rect(rx - 6, ry - 6, rx + 230 * Math.min(1, z), ry + 26 * sc, P.DS0); frame(rx - 6, ry - 6, rx + 230 * Math.min(1, z), ry + 26 * sc, P.M5);
    text(FS, 'HGB', rx, ry, { sc, c: P.HB3, ol: null, n: o.reading * 4 });
    text(FC, EX.hgb + ' g/dL', rx + 30 * sc, ry - 2, { sc, c: P.INK, ol: null, n: o.reading * 12 });
  }
}
