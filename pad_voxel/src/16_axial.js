'use strict';
// ============================================================================
// THE AXIAL CTA INSETS (scenes 18 and 19): grey source-image crops through the
// right SFA at the level of L1 and through the right popliteal artery at the
// block, drawn as pixel images. Grey levels follow CT
// conventions: calcium brightest, then the contrast-filled lumen, muscle and
// non-calcified plaque mid grey, fat dark, air black. The lumen is small and
// eccentric but open; the plaque sits in the wall; calcium is a bright arc.
// ============================================================================
const AXG = { air: '#000000', fat: '#303030', skin: '#5A5A5A', mus: '#767676', mus2: '#6C6C6C', fas: '#545454', cort: '#EEEEEE', marrow: '#8E8E8E',
  wall: '#828282', plq: '#686868', cal: '#FFFFFF', lum: '#CFCFCF', vein: '#8C8C8C', occ: '#5C5C5C', spongy: '#B2B2B2', spongy2: '#A0A0A0', fat2: '#3A3A3A' };
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
// the same kind of crop through the right popliteal artery at the block (scene 19), behind the knee: the femur's
// condyle in front (up), the popliteal vein behind the artery, the fat of the popliteal fossa round the vessels.
// The artery keeps its wall and its calcium but has no bright channel; the collaterals are small bright dots.
function axialSampleOcc(x, y) {
  const fem = Math.hypot(x + 21, y + 21); if (fem < 16) return fem > 13 ? AXC.cort : (hash2(Math.floor(x * 1.2), Math.floor(y * 1.2)) < 0.3 ? AXC.spongy2 : AXC.spongy);
  const vein = Math.hypot(x - 9.5, y - 5.5); if (vein < 5.6) return AXC.vein;
  const r = Math.hypot(x, y);
  if (r < 6.2) {
    const a = Math.atan2(y, x);
    if (r > 4.5 && ((a > -2.9 && a < -2.0) || (a > 0.3 && a < 1.0))) return AXC.cal;
    if (Math.hypot(x - 1.3, y + 1.5) < 1.0 || Math.hypot(x + 2.1, y - 1.7) < 0.8) return AXC.cal;
    return r > 5.3 ? AXC.wall : AXC.occ;
  }
  for (const [cx, cy, cr] of [[-10.5, 6.5, 1.6], [7.5, -9.5, 1.4], [-3.5, 11.8, 1.2]]) if (Math.hypot(x - cx, y - cy) < cr) return AXC.lum;
  if (Math.hypot(x - 2, y - 2) < 14.5) return hash2(Math.floor(x * 0.9), Math.floor(y * 0.9)) < 0.14 ? AXC.fat2 : AXC.fat;
  return hash2(Math.floor(x * 1.3), Math.floor(y * 1.3)) < 0.15 ? AXC.mus2 : AXC.mus;
}
function drawAxial(x0, y0, size, k, sample) {
  if (k <= 0) return;
  const s = Math.round(size * (k < 1 ? Math.max(0.15, Math.floor(k * 4) / 4) : 1)), xa = Math.round(x0 + (size - s) / 2), ya = Math.round(y0 + (size - s) / 2);
  rect(xa - 3, ya - 3, xa + s + 3, ya + s + 3, P.SH); rect(xa - 2, ya - 2, xa + s + 2, ya + s + 2, P.N4); rect(xa - 1, ya - 1, xa + s + 1, ya + s + 1, P.K0);
  if (k < 1) return;
  const mm = 32 / s;
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) pset(xa + i, ya + j, (sample || axialSample)((i + 0.5) * mm - 16, (j + 0.5) * mm - 16));
}
