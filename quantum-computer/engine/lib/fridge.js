// FRIDGE — the lab and the dilution refrigerator (the gold "chandelier"), side view.
// Room units = screen px at z = 1. The refrigerator is drawn in centimetres, hung at FX0, FY0 with FS px/cm:
// top flange (300 K) at y = 0, then the 50 K, 4 K, still (1 K), cold (100 mK) and mixing-chamber (15 mK) plates; the
// processor package hangs from a cold finger under the mixing chamber. Detail appears with zoom.
(() => {
const { P } = PIX;
const FR = window.FR = {};
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const FX0 = 135, FY0 = 74, FS = 2.0;
FR.FX0 = FX0; FR.FY0 = FY0; FR.FS = FS;
FR.toRoom = (x, y) => [FX0 + x * FS, FY0 + y * FS];
// plates: [y (cm), half width (cm), label, colour temperature 0 (warm) .. 1 (coldest)]
const PL = [[0, 31, '300 K', 0], [28, 28, '50 K', 0.2], [56, 25, '4 K', 0.45], [82, 22, '1 K', 0.65], [104, 19, '100 mK', 0.85], [124, 17, '15 mK', 1]];
FR.PLATES = PL;
FR.PKG = { y: 147, w: 9, h: 9 };                     // processor package (cm): centre x = 0, top at y
const F = (c, p, col, a) => PIX.fill(c, p, col, a);
const rr = (x, y, w, hh, r = 0) => PIX.rectPath(x, y, w, hh, r);
const ell = (c, x, y, rx, ry, col) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); c.fillStyle = P[col] || col; c.fill(); };
// one gold plate seen slightly from above: top face ellipse, rim, small gold blocks (attenuators) on top
function plate(c, y, hw, z, frost) {
  const t = 1.6, ry = hw * 0.17;
  F(c, rr(-hw, y, hw * 2, t + 0.01, 0), 'y1');                                // rim
  ell(c, 0, y + t, hw, ry, 'y1');
  ell(c, 0, y, hw, ry, 'y2');                                                 // top face
  ell(c, -hw * 0.18, y - ry * 0.18, hw * 0.78, ry * 0.62, 'y3');              // sheen
  if (z > 1.2) ell(c, -hw * 0.42, y - ry * 0.35, hw * 0.22, ry * 0.18, 'y4');
  if (frost > 0) { c.save(); c.globalAlpha = frost * 0.6; ell(c, 0, y, hw * 0.98, ry * 0.95, 'b3'); c.restore(); }
}
// cables: 10 coax lines from the top flange down to the package, each with attenuators where it crosses a plate
const CAB = []; for (let k = 0; k < 10; k++) CAB.push({ x: lerp(-13, 13, k / 9) + (h(k, 3) - 0.5) * 1.5, ph: h(k, 4) });
FR.CAB = CAB;
function cables(c, z, t, o) {
  for (const [k, cb] of CAB.entries()) {
    const pts = [];
    for (let y = -6; y <= FR.PKG.y + 1; y += 2) {
      const nar = clamp((y - 110) / 30), x = lerp(cb.x, cb.x * 0.18, MO.smooth(nar)) + Math.sin(y * 0.09 + cb.ph * 6) * 0.35;
      pts.push([x, y]);
    }
    c.save(); c.strokeStyle = P[k % 3 === 0 ? 'u1' : 'd8']; c.lineWidth = Math.max(0.35, 0.9 / z * 1.4); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    if (z > 2) { c.strokeStyle = P[k % 3 === 0 ? 'u2' : 'da']; c.lineWidth = Math.max(0.15, 0.4 / z); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x - 0.15, y) : c.moveTo(x - 0.15, y)); c.stroke(); }
    c.restore();
    // signals travelling down the lines (microwave control pulses), shown when o.signal > 0
    if (o.signal > 0 && k % 2 === 0) for (let q = 0; q < 2; q++) {
      const s = K.wrap(t * 0.55 + cb.ph + q * 0.5, 1), idx = Math.floor(s * (pts.length - 1)), [x, y] = pts[idx];
      PIX.circ(c, x, y, Math.max(0.5, 1.2 / Math.max(1, z * 0.5)), 'o1', o.signal);
    }
    // attenuators on the plates
    for (const [py, hw] of PL.slice(1)) {
      const nar = clamp((py - 110) / 30), x = lerp(cb.x, cb.x * 0.18, MO.smooth(nar));
      F(c, rr(x - 0.7, py - 3.2, 1.4, 3.2, 0.3), 'y2'); F(c, rr(x - 0.7, py - 3.2, 0.5, 3.2, 0.2), 'y3');
    }
  }
}
// draw in fridge cm (the caller sets the transform). o = {z (px/cm), t, frost[k] 0..1, glowMXC, signal, chipFn}
FR.draw = (c, o) => {
  const z = o.z || 1, t = o.t || 0;
  // pulse-tube cold head + gas lines above the top flange
  F(c, rr(-5, -26, 10, 22, 1.5), 'd5'); F(c, rr(-5, -26, 3, 22, 1), 'd7'); F(c, rr(-7, -8, 14, 4, 1), 'd4');
  K.pipe(c, [[4, -22], [12, -30], [26, -36], [60, -36]], 2.2, 'd5', 'd7', 'd3');
  // rods between the plates
  for (let i = 0; i < PL.length - 1; i++) {
    const [y0, w0] = PL[i], [y1, w1] = PL[i + 1];
    for (const f of [-0.86, -0.42, 0.42, 0.86]) { const x0 = w0 * f, x1 = w1 * f; c.save(); c.strokeStyle = P.y1; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x0, y0 + 1.5); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = P.y3; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x0 - 0.3, y0 + 1.5); c.lineTo(x1 - 0.3, y1); c.stroke(); c.restore(); }
  }
  // heat exchanger coil between the still and the mixing chamber, and the mixing chamber can
  if (z > 0.8) for (let k = 0; k < 9; k++) { const y = 86 + k * 2.2; c.save(); c.strokeStyle = P.d8; c.lineWidth = 0.5; c.beginPath(); c.ellipse(-8, y, 4, 0.9, 0, 0, TAU); c.stroke(); c.restore(); }
  F(c, rr(-6, 126, 12, 10, 1.5), 'y1'); F(c, rr(-6, 126, 12, 2, 1), 'y3');
  cables(c, z, t, o);
  // plates, top to bottom
  PL.forEach(([y, hw], i) => plate(c, y, hw, z, (o.frost && o.frost[i]) || 0));
  // cold finger and the processor package
  const Pk = FR.PKG;
  F(c, rr(-1.6, 128, 3.2, Pk.y - 128, 0.5), 'y2'); F(c, rr(-1.6, 128, 1, Pk.y - 128, 0.3), 'y3');
  F(c, rr(-Pk.w / 2 - 0.6, Pk.y - 0.6, Pk.w + 1.2, Pk.h + 1.2, 0.8), 'y1');
  F(c, rr(-Pk.w / 2, Pk.y, Pk.w, Pk.h, 0.6), 'y2');
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { F(c, rr(s * (Pk.w / 2 + 0.6) - (s < 0 ? 1.4 : 0), Pk.y + 1.4 + k * 2, 1.4, 1, 0.2), 'd8'); }   // SMA connectors
  // machined package lid-off: sheen band, recess around the chip, launch traces to the connectors, screws
  const cy = Pk.y + Pk.h / 2;
  if (z > 3) {
    c.save(); c.beginPath(); c.rect(-Pk.w / 2, Pk.y, Pk.w, Pk.h); c.clip();
    for (let k = 0; k < 7; k++) F(c, rr(-Pk.w / 2, Pk.y + k * 1.4 - 0.2, Pk.w, 0.18, 0), 'y1', 0.35);
    F(c, rr(-Pk.w / 2 - 1, Pk.y + Pk.h * 0.12, Pk.w + 2, Pk.h * 0.08, 0), 'y3', 0.55);
    c.restore();
    F(c, rr(-2.2, cy - 2.2, 4.4, 4.4, 0.2), 'y1'); F(c, rr(-2.05, cy - 2.05, 4.1, 4.1, 0.15), 'y0');
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
      const yy = Pk.y + 1.9 + k * 2; PIX.line(c, s * 2.05, cy + (yy - cy) * 0.45, s * (Pk.w / 2), yy, 'y4', Math.max(0.05, 1 / z)); PIX.line(c, s * 2.05, cy + (yy - cy) * 0.45, s * (Pk.w / 2), yy, 'y2', Math.max(0.03, 0.45 / z));
    }
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { PIX.circ(c, sx * (Pk.w / 2 - 0.9), cy + sy * (Pk.h / 2 - 0.9), 0.45, 'y1'); PIX.circ(c, sx * (Pk.w / 2 - 0.9), cy + sy * (Pk.h / 2 - 0.9), 0.3, 'd6'); PIX.line(c, sx * (Pk.w / 2 - 0.9) - 0.22, cy + sy * (Pk.h / 2 - 0.9), sx * (Pk.w / 2 - 0.9) + 0.22, cy + sy * (Pk.h / 2 - 0.9), 'd3', Math.max(0.04, 0.6 / z)); }
  }
  if (o.chipFn) { c.save(); c.translate(0, cy); o.chipFn(c, z); c.restore(); }
  else F(c, rr(-Pk.w / 2 + 1.2, Pk.y + 1.2, Pk.w - 2.4, Pk.h - 2.4, 0.4), 'y3');
  if (o.glowMXC > 0) FX.glowW(c, 0, Pk.y + Pk.h / 2, 7, ['b0', 'b1', 'b2'], o.glowMXC, 1.5);
};
// the processor in its package at chip scale (cam in room px). chOpts go to CH.draw; extra(c, zmm) draws more in chip mm
FR.chipView = (c, cam, t, chOpts = {}, extra = null) => {
  K.cam(c, cam);
  c.save(); c.translate(FX0, FY0); c.scale(FS, FS);
  FR.draw(c, { z: cam.z * FS, t, chipFn: (cc, zcm) => { cc.save(); cc.scale(0.1, 0.1); CH.draw(cc, Object.assign({}, chOpts, { z: zcm / 10 })); if (extra) extra(cc, zcm / 10); cc.restore(); } });
  c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
};
// the lab around it (room px)
FR.room = (c, o) => {
  const t = o.t || 0;
  F(c, rr(-300, -300, 870, 1080), 'n0');
  for (let x = -280; x < 560; x += 40) F(c, rr(x, 0, 1, 430), 'n1');
  F(c, rr(-300, 300, 870, 2), 'n1');
  F(c, rr(-300, -300, 870, 328), 'd1'); F(c, rr(-300, 26, 870, 3), 'd3');                 // ceiling
  F(c, rr(-300, 430, 870, 400), 'd1'); F(c, rr(-300, 430, 870, 2), 'd4');                 // floor
  // support frame
  for (const x of [52, 212]) { F(c, rr(x, 30, 8, 400), 'd4'); F(c, rr(x, 30, 2, 400), 'd6'); }
  F(c, rr(46, 40, 178, 12, 1), 'd4'); F(c, rr(46, 40, 178, 2, 1), 'd7');
  // electronics racks with blinking status lights, cables up to the refrigerator top
  for (const [rx, side] of [[-4, -1], [232, 1]]) {
    F(c, rr(rx, 150, 44, 280, 2), 'd2'); F(c, rr(rx + 2, 152, 40, 276, 1), 'd1');
    for (let k = 0; k < 9; k++) {
      F(c, rr(rx + 4, 160 + k * 29, 36, 22, 1), 'd3'); F(c, rr(rx + 4, 160 + k * 29, 36, 2, 1), 'd5');
      for (let q = 0; q < 4; q++) { const on = Math.sin(t * (2 + h(k, q) * 5) + h(q, k) * 9) > 0.1; F(c, rr(rx + 8 + q * 7, 172 + k * 29, 3, 2, 0), on ? (q === 3 ? 'o1' : 'e2') : 'd4'); }
    }
    K.pipe(c, [[rx + 22, 150], [rx + 22, 110], [lerp(rx + 22, 135, 0.6), 64], [135 + side * 20, 62]], 3, 'd5', 'd6', 'd3');
  }
};
})();
