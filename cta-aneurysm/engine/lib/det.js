// DET — one element of the energy-integrating CT detector in cross-section (S27–S30), and a row of elements (S26).
// From the top: tungsten anti-scatter plates on either side; the scintillator crystal (a ceramic that turns the X-ray's
// energy into a flash of visible light) inside a white reflector; the silicon photodiode (light → electron–hole pairs,
// separated by the junction's field and collected as charge); the readout below. Screen px; one fixed layout.
(() => {
const { W, H, P } = PIX;
const DET = window.DET = { NAME: 'DET' };
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const L = DET.L = { cx: 180, x0: 104, x1: 256, sy0: 176, sy1: 386, dy0: 396, dy1: 476, dep0: 410, dep1: 462, ry0: 500, ry1: 566, sep0: 70 };
DET.cross = (c, o = {}) => {
  // anti-scatter plates (tungsten), taller than the element
  for (const x of [L.x0 - 12, L.x1 + 4]) { PIX.flat(c, PIX.rectPath(x, L.sep0, 8, L.sy1 - L.sep0, 1), 'g6', 'g4', 'g8'); }
  // reflector + scintillator crystal (green-tinted, a faint dithered grain)
  PIX.rect(c, L.x0 - 3, L.sy0 - 3, L.x1 - L.x0 + 6, L.sy1 - L.sy0 + 3, 'q6');
  PIX.rect(c, L.x0, L.sy0, L.x1 - L.x0, L.sy1 - L.sy0, 'e0');
  for (let y = L.sy0; y < L.sy1; y++) for (let x = L.x0; x < L.x1; x++) { const n = K.vn(x * 0.05, y * 0.05, 3); if (n > 0.62 && K.BAY(x, y) < (n - 0.62) * 1.6) PIX.rect(c, x, y, 1, 1, 'e1'); }
  PIX.rect(c, L.x0, L.sy0, 3, L.sy1 - L.sy0, 'e1'); PIX.rect(c, L.x0, L.sy0, L.x1 - L.x0, 2, 'e1');
  if (o.glow > 0) FX.glowL(c, o.gx, o.gy, o.gr || 60, ['e0', 'e1', 'e2', 'e3'], o.glow, 1.4);
  // the photodiode: p+ layer, depletion region (where light makes pairs), n+ layer; electrodes top and bottom
  PIX.rect(c, L.x0, L.dy0, L.x1 - L.x0, L.dy1 - L.dy0, 'g3');
  PIX.rect(c, L.x0, L.dy0, L.x1 - L.x0, 8, 'b1'); PIX.rect(c, L.x0, L.dy1 - 8, L.x1 - L.x0, 8, 'g2');
  for (let y = L.dep0; y < L.dep1; y++) for (let x = L.x0; x < L.x1; x++) if (K.BAY(x, y) < 0.22) PIX.rect(c, x, y, 1, 1, 'g4');
  PIX.rect(c, L.x0, L.dy0 - 2, L.x1 - L.x0, 2, 'u2'); PIX.rect(c, L.x0, L.dy1, L.x1 - L.x0, 2, 'u2');
  // the readout chip and the trace from the bottom electrode
  PIX.flat(c, PIX.rectPath(L.cx - 54, L.ry0, 108, L.ry1 - L.ry0, 3), 'g2', 'g1', 'g4');
  for (let k = 0; k < 9; k++) { PIX.rect(c, L.cx - 50 + k * 12, L.ry1, 4, 5, 'g5'); PIX.rect(c, L.cx - 50 + k * 12, L.ry0 - 5, 4, 5, 'g5'); }
  PIX.rect(c, L.cx - 1, L.dy1 + 2, 2, L.ry0 - L.dy1 - 7, o.sig ? 'b3' : 'u1');
};
// a row of n elements seen from the front (S26): septa, green scintillator faces, slate photodiodes, a fill bar each
DET.row = (c, x0, y0, n, w, hgt, fills, t) => {
  for (let k = 0; k < n; k++) {
    const x = x0 + k * w;
    PIX.rect(c, x, y0, 2, hgt, 'g6');
    PIX.rect(c, x + 2, y0, w - 2, hgt * 0.62, 'e1'); PIX.rect(c, x + 2, y0, w - 2, 2, 'e2');
    PIX.rect(c, x + 2, y0 + hgt * 0.62, w - 2, hgt * 0.38, 'g3'); PIX.rect(c, x + 2, y0 + hgt * 0.62, w - 2, 1, 'u2');
    const f = fills ? clamp(fills[k]) : 0, bh = Math.round((hgt * 0.62 - 6) * f);
    if (bh > 0) { PIX.rect(c, x + w / 2 - 3, y0 + hgt * 0.62 - 3 - bh, 5, bh, 'b3'); PIX.rect(c, x + w / 2 - 3, y0 + hgt * 0.62 - 3 - bh, 5, 1, 'b4'); }
  }
  PIX.rect(c, x0 + n * w, y0, 2, hgt, 'g6');
};
// a hole: an effective positive charge carrier, drawn as an open ring with a plus (not a cavity, not a particle of matter)
DET.hole = (c, x, y) => { FX.ring(c, x, y, 3, 'b4', 1); PIX.rect(c, Math.round(x) - 1, Math.round(y), 3, 1, 'b4'); PIX.rect(c, Math.round(x), Math.round(y) - 1, 1, 3, 'b4'); };
})();
