'use strict';
// ============================================================================
// THE AXIAL CTA SLICE (scene 18): a grey source-image crop through the right
// SFA at the level of L1, drawn as a pixel image. Grey levels follow CT
// conventions: calcium brightest, then the contrast-filled lumen, muscle and
// non-calcified plaque mid grey, fat dark, air black. The lumen is small and
// eccentric but open; the plaque sits in the wall; calcium is a bright arc.
// ============================================================================
const AXG = { air: '#000000', fat: '#303030', skin: '#5A5A5A', mus: '#767676', mus2: '#6C6C6C', fas: '#545454', cort: '#EEEEEE', marrow: '#8E8E8E',
  wall: '#828282', plq: '#686868', cal: '#FFFFFF', lum: '#CFCFCF', vein: '#8C8C8C' };
const AXC = {}; for (const k in AXG) AXC[k] = hexc(AXG[k]);
// crop of 32 mm around the SFA (mm coordinates centred on the artery); px = size / 46 per mm
function axialSample(x, y) {
  // femur cortex at the lower-left corner, muscle around, a fascia line, the femoral vein beside the artery
  const fem = Math.hypot(x + 19, y - 16); if (fem < 9.5) return fem > 6.5 ? AXC.cort : AXC.marrow;
  const vein = Math.hypot(x - 9, y - 6); if (vein < 5.5) return AXC.vein;
  const r = Math.hypot(x, y);
  if (r < 6.2) {                                                       // the artery: wall, eccentric plaque, calcium arc, open lumen
    const lx = x + 1.4, ly = y + 1.6, lr = Math.hypot(lx, ly);
    if (lr < 1.9) return AXC.lum;
    const a = Math.atan2(y, x);
    if (r > 4.6 && a > 0.2 && a < 1.9) return AXC.cal;
    return r > 5.4 ? AXC.wall : AXC.plq;
  }
  if (Math.abs(y - 0.35 * x - 9) < 0.6 && x < 4) return AXC.fas;
  if (x > 14 && y < -8) return AXC.fat;
  return hash2(Math.floor(x * 1.3), Math.floor(y * 1.3)) < 0.15 ? AXC.mus2 : AXC.mus;
}
function drawAxial(x0, y0, size, k) {
  if (k <= 0) return;
  const s = Math.round(size * (k < 1 ? Math.max(0.15, Math.floor(k * 4) / 4) : 1)), xa = Math.round(x0 + (size - s) / 2), ya = Math.round(y0 + (size - s) / 2);
  rect(xa - 3, ya - 3, xa + s + 3, ya + s + 3, P.SH); rect(xa - 2, ya - 2, xa + s + 2, ya + s + 2, P.N4); rect(xa - 1, ya - 1, xa + s + 1, ya + s + 1, P.K0);
  if (k < 1) return;
  const mm = 32 / s;
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) pset(xa + i, ya + j, axialSample((i + 0.5) * mm - 16, (j + 0.5) * mm - 16));
}
