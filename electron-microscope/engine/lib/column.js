// COL — the microscope cut open along its axis (same centimetre coordinates as LAB; beam axis x = LAB.AX).
// From the top: HV tank with its insulator stack → cold field-emission gun (tungsten tip, extraction anode, gun ion
// pump) → accelerator (ring electrodes between ceramic insulators) → gun valve → condenser lenses C1, C2 and the
// condenser aperture → probe aberration corrector (two multipole stages and a transfer doublet) → scan coils →
// objective lens with the specimen in its pole-piece gap (side-entry holder through the goniometer) → projector lens →
// HAADF annular detector (light guide to its photomultiplier) → bright-field detector → viewing screen → camera.
// Pumps: gun ion pump, column ion pump, the turbo pump on the airlock line. Everything is drawn as a cut section in
// flat colours: metal shells light gray, iron yokes darker with hatching, copper windings, cream ceramics, the beam cyan.
// Finer parts appear as the camera gets closer (z = screen px per cm).
(() => {
const { P, W, H } = PIX;
const COL = window.COL = {};
const X = LAB.AX;
const fillR = LAB.fillR, rr = LAB.rr, F = LAB.F;
const Y = COL.Y = {                                                       // key heights (cm, −up)
  tip: -258.5, anode: -255, accTop: -248, accBot: -223, valve: -220.5, c1: -211, c2: -198, cAp: -191,
  hx1: -184, tl: -170, hx2: -157, scan: -146, objU: -131, spec: -125, objL: -119, proj: -112, haadf: -101, bf: -90, screen: -83, cam: -70,
};
COL.SPEC = [X, Y.spec];
// ---------- helpers ----------
function hatch(c, x, y, w, h, col, step = 1.6) {                          // diagonal hatching inside a rect (world units)
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = P[col] || col;
  const m = c.getTransform(); c.lineWidth = 1 / Math.hypot(m.a, m.b);
  c.beginPath(); for (let k = -h; k < w; k += step) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); } c.stroke(); c.restore();
}
COL.hatch = hatch;
function wind(c, x, y, w, h, z, hot = 0) {                                 // copper winding block
  fillR(c, x, y, w, h, hot > 0.5 ? 'u2' : 'u1');
  if (z > 2.2) { c.save(); c.globalAlpha = 0.9; for (let k = 0.6; k < h; k += Math.max(0.7, 2.4 / z)) fillR(c, x, y + k, w, Math.max(0.25, 0.6 / z), hot > 0.5 ? 'u3' : 'u2'); c.restore(); }
  fillR(c, x, y, w, Math.max(0.3, 0.8 / z), 'u3');
}
function iron(c, x, y, w, h, z) { fillR(c, x, y, w, h, 'g5'); if (z > 1.5) hatch(c, x, y, w, h, 'g4', Math.max(1.2, 3.2 / z)); fillR(c, x, y, w, Math.max(0.3, 0.7 / z), 'g7'); }
function metal(c, x, y, w, h, z, col = 'g8') { fillR(c, x, y, w, h, col); fillR(c, x, y, w, Math.max(0.3, 0.7 / z), 'gb'); }
const sym = (fn) => { fn(1); fn(-1); };                                    // draw both sides of the axis
// a round magnetic lens (cross-section): iron yoke around copper windings, pole pieces reaching to the bore
// cy = centre height, R = outer half-width, hh = half-height, gap = pole gap, bore = bore radius
COL.lens = (c, cy, R, hh, z, o = {}) => {
  const bore = o.bore ?? 1.2, gap = o.gap ?? 2.2, hot = o.hot ?? 0;
  sym(s => {
    const xo = X + s * R, xi = X + s * bore;
    const L = (a, b) => [Math.min(a, b), Math.abs(b - a)];
    // yoke: outer wall, top and bottom plates
    let [x0, w] = L(xo, xo - s * 2.4); iron(c, x0, cy - hh, w, 2 * hh, z);
    [x0, w] = L(xo, xi + s * 3.2); iron(c, x0, cy - hh, w, 2.4, z); iron(c, x0, cy + hh - 2.4, w, 2.4, z);
    // pole pieces: tapered to the gap
    c.save(); c.fillStyle = P.g6;
    c.beginPath(); c.moveTo(xi + s * 3.2, cy - hh + 2.4); c.lineTo(xi + s * 3.2, cy - hh); c.lineTo(xi, cy - hh); c.lineTo(xi, cy - gap / 2); c.lineTo(xi + s * 2.6, cy - gap / 2 - 1.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(xi + s * 3.2, cy + hh - 2.4); c.lineTo(xi + s * 3.2, cy + hh); c.lineTo(xi, cy + hh); c.lineTo(xi, cy + gap / 2); c.lineTo(xi + s * 2.6, cy + gap / 2 + 1.2); c.closePath(); c.fill();
    c.fillStyle = P.g8; c.fillRect(Math.min(xi, xi + s * 0.6), cy - hh, 0.6, hh - gap / 2); c.fillRect(Math.min(xi, xi + s * 0.6), cy + gap / 2, 0.6, hh - gap / 2);
    c.restore();
    // windings
    [x0, w] = L(xo - s * 2.6, xi + s * 3.8); wind(c, x0, cy - hh + 2.8, w, 2 * hh - 5.6, z, hot);
  });
};
// a multipole stage of the corrector: n poles around the axis; in section, a stack of pole tips with their coils
COL.multipole = (c, cy, R, hh, z, on = 0, t = 0) => {
  sym(s => {
    const xo = X + s * R, x0 = Math.min(xo, xo - s * 2), w = 2; iron(c, x0, cy - hh, w, 2 * hh, z);
    for (let k = 0; k < 3; k++) {
      const yy = cy - hh + 1.4 + k * (2 * hh - 2.8) / 3, hk = (2 * hh - 2.8) / 3 - 0.8;
      const xa = X + s * 2.2, xb = xo - s * 2;
      fillR(c, Math.min(xa, xb), yy + hk * 0.3, Math.abs(xb - xa), hk * 0.4, 'g6');                // pole shaft
      const cx0 = U.lerp(xa, xb, 0.45), cw = Math.abs(xb - xa) * 0.4; wind(c, Math.min(cx0, cx0 + s * cw), yy, cw, hk, z, on * (0.5 + 0.5 * Math.sin(t * 6 + k)));
      fillR(c, Math.min(xa, xa + s * 0.9), yy + hk * 0.2, 0.9, hk * 0.6, (k + (s > 0 ? 1 : 0)) % 2 ? 'm2' : 'g8');       // pole tip (N/S)
    }
  });
};
// ---------- the whole column ----------
// o: {hot: {c1, c2, corr, obj, scan}, valve (0 closed .. 1 open), holder (0 out .. 1 in), spec (bool), screen, glow}
COL.draw = (c, cam, t, o = {}) => {
  const z = cam.z, hot = o.hot || {};
  c.save(); K.cam(c, cam);
  // outer shells, cut: section by section (walls 1.6 cm), interior dark
  const shell = (y0, y1, hw, col = 'gb', wall = 1.6) => {
    fillR(c, X - hw, y0, 2 * hw, y1 - y0, 'n0');
    sym(s => { const x = s > 0 ? X + hw - wall : X - hw; metal(c, x, y0, wall, y1 - y0, z, col === 'gb' ? 'g9' : col); });
    fillR(c, X - hw, y0, 2 * hw, Math.max(0.4, 0.9 / z), 'gb');
  };
  // HV tank: SF6-filled, the insulator stack and resistor chain feeding the gun
  shell(-300, -266, 32, 'gb', 2.2); fillR(c, X - 30, -297.8, 60, 31.8, 'n1');
  for (let k = 0; k < 9; k++) { const yy = -296 + k * 3.3; F(c, rr(X - 7 + (k % 2) * 0.5, yy, 14 - (k % 2), 2.6, 0.8), 'g9', 'g6', 'gb'); fillR(c, X - 6 + (k % 2) * 0.5, yy + 2.2, 12 - (k % 2), 0.4, 'y4'); }
  K.pipe(c, [[X + 12, -300], [X + 4, -296], [X + 2, -290]], 3, 'g2', 'g3', 'g1');
  if (z > 2) PIX.text && K.wtext(c, 'SF6', X + 16, -292, 'n4', { shadow: null });
  // gun chamber
  shell(-266, -248, 17); fillR(c, X - 15.4, -264.4, 30.8, 14.8, 'k');
  F(c, rr(X - 41, -264, 24, 14, 2), 'g4', 'g2', 'g6'); fillR(c, X - 17, -260, 2, 6, 'k');                 // gun ion pump + port
  for (let k = 0; k < 5; k++) fillR(c, X - 39 + k * 4.4, -262, 2, 10, 'g3');
  // tip assembly: ceramic base, hairpin, tip
  F(c, rr(X - 4, -265.8, 8, 3.4, 1), 'y4', 'g8', 'w');
  c.save(); c.strokeStyle = P.g9; c.lineWidth = Math.max(0.25, 0.9 / z);
  c.beginPath(); c.moveTo(X - 2.4, -262.4); c.lineTo(X - 0.4, -260.2); c.lineTo(X + 0.4, -260.2); c.lineTo(X + 2.4, -262.4); c.stroke(); c.restore();
  c.save(); c.fillStyle = P.g9; c.beginPath(); c.moveTo(X - 0.5, -260.3); c.lineTo(X + 0.5, -260.3); c.lineTo(X, Y.tip); c.closePath(); c.fill(); c.restore();
  if (o.glow) FX.glowW(c, X, Y.tip, 2.5 + o.glow * 2, ['c0', 'c1', 'c2', 'c3'], 0.7 * o.glow);
  // extraction anode and the first accelerating electrode
  sym(s => { metal(c, s > 0 ? X + 0.9 : X - 15.4, Y.anode - 0.8, 14.5, 1.6, z, 'g8'); metal(c, s > 0 ? X + 1.4 : X - 15.4, -251.2, 14, 1.4, z, 'g7'); });
  // accelerator: ring electrodes between ceramic insulators
  shell(-248, -222, 16, 'y4', 2.4);
  sym(s => { fillR(c, s > 0 ? X + 13.6 : X - 16, -248, 2.4, 26, 'y4'); for (let k = 0; k < 8; k++) fillR(c, s > 0 ? X + 13.6 : X - 16, -246.6 + k * 3.1, 2.4, 0.5, 'g9'); });
  for (let k = 0; k < 8; k++) {
    const yy = COL.accY(k);
    sym(s => { const x0 = s > 0 ? X + 1.8 + k * 0.05 : X - 13.6; metal(c, x0, yy - 0.5, 11.8 - k * 0.05, 1.0, z, 'g8'); });
    if (z > 3.5 && o.volts) K.wtext(c, COL.VOLT[k], X + 16.8, yy - 0.9, 'g6', { shadow: null });
  }
  // gun valve (a sliding gate; o.valve 1 = open)
  const vo = o.valve ?? 1;
  fillR(c, X - 20, -222, 40, 3, 'g4'); fillR(c, X - 18, -221.4, 36, 1.8, 'k');
  F(c, rr(X - 16 + vo * 18, -221.3, 16, 1.6), 'g8', 'g6', 'gb'); F(c, rr(X + 20, -224, 10, 6, 1), 'g5', 'g3', 'g7');
  // condenser section
  shell(-219, -190, 20);
  COL.lens(c, Y.c1, 18.2, 5.8, z, { hot: hot.c1 ?? 0.6, gap: 2.4 }); COL.lens(c, Y.c2, 18.2, 5.8, z, { hot: hot.c2 ?? 0.6, gap: 2.4 });
  sym(s => metal(c, s > 0 ? X + 0.35 : X - 9, Y.cAp - 0.25, 8.65, 0.5, z, 'g9'));                      // condenser aperture
  // corrector: two multipole stages and a transfer doublet
  shell(-190, -150, 24);
  COL.multipole(c, Y.hx1, 22, 4.6, z, hot.corr ?? 0, t); COL.multipole(c, Y.hx2, 22, 4.6, z, hot.corr ?? 0, t);
  COL.lens(c, Y.tl - 3.4, 16, 2.8, z, { hot: 0.3, gap: 1.6, bore: 1.0 }); COL.lens(c, Y.tl + 3.4, 16, 2.8, z, { hot: 0.3, gap: 1.6, bore: 1.0 });
  K.pipe(c, [[X + 24, -180], [X + 40, -176], [X + 52, -150], [X + 54, -60]], 2.4, 'g2', 'g3', 'g1');
  // objective section: scan coils, objective lens, specimen, goniometer, column ion pump
  shell(-150, -110, 22);
  sym(s => { const x0 = s > 0 ? X + 1.8 : X - 6.8; wind(c, x0, Y.scan - 3, 5, 2.4, z, hot.scan ?? 0); wind(c, x0, Y.scan + 0.6, 5, 2.4, z, hot.scan ?? 0); });
  COL.lens(c, Y.spec, 20.4, 7.4, z, { hot: hot.obj ?? 0.7, gap: 3.0, bore: 0.8 });
  F(c, rr(X - 46, -140, 24, 18, 2), 'g4', 'g2', 'g6'); for (let k = 0; k < 5; k++) fillR(c, X - 44 + k * 4.4, -138, 2, 14, 'g3'); fillR(c, X - 22, -133, 2, 6, 'k');
  // goniometer + airlock (cut) and the side-entry holder
  F(c, rr(X + 22, -138, 26, 26, 3), 'g8', 'g6', 'ga'); fillR(c, X + 22, -126.7, 26, 3.4, 'n0');
  fillR(c, X + 30, -136, 2, 22, 'g6'); if (o.airlock != null) fillR(c, X + 30, -136, 2, 22, o.airlock > 0.5 ? 'r2' : 'e2');
  COL.holder(c, z, o.holder ?? 1, o);
  // projector lens, detectors, screen, camera
  shell(-110, -78, 30, 'gb');
  COL.lens(c, Y.proj, 12, 2.6, z, { hot: 0.4, gap: 1.4, bore: 1.0 });
  // HAADF annulus (cut): scintillator ring with a hole; light guide to the photomultiplier in the side port
  sym(s => { const x0 = s > 0 ? X + 2.6 : X - 12.6; fillR(c, x0, Y.haadf - 0.6, 10, 1.2, 'c4'); fillR(c, x0, Y.haadf + 0.6, 10, 1.6, 'g7'); });
  F(c, rr(X - 42, -100, 12, 10, 2), 'g8', 'g6', 'ga'); fillR(c, X - 30, Y.haadf - 0.2, 17.4, 1.4, 'c1');
  if (z > 2.4) for (let k = 0; k < 4; k++) fillR(c, X - 40 + k * 2.6, -97, 1.4, 5, 'g6');
  fillR(c, X - 2.2, Y.bf - 0.6, 4.4, 1.2, 'c4'); fillR(c, X - 2.6, Y.bf + 0.6, 5.2, 1.6, 'g7'); fillR(c, X + 2.6, Y.bf, 12, 0.8, 'g6');   // BF detector on its arm
  fillR(c, X - 26, Y.screen, 52, 1.2, o.screen ? 'e2' : 'e1');                                                     // viewing screen
  shell(-78, -60, 20, 'g4'); fillR(c, X - 12, -74, 24, 6, 'g1'); fillR(c, X - 10, -73, 20, 1.2, 'c1');            // camera
  // base and isolation (exterior: these are not cut)
  F(c, rr(X - 45, -60, 90, 46, 2), 'g3', 'g2', 'g5');
  F(c, rr(X - 70, -14, 140, 10), 'g3', 'g2', 'g5'); fillR(c, X - 70, -4, 140, 4, 'g1'); fillR(c, X - 70, -14.5, 140, 1, 'y2');
  for (const ix of [-62, -40, 40, 62]) F(c, rr(X + ix - 5, -14, 10, 10, 1.5), 'g4', 'g2', 'g6');
  // turbo pump on the airlock line
  K.pipe(c, [[X + 58, -40], [X + 58, -96], [X + 46, -110]], 4, 'g5', 'g7', 'g3');
  F(c, rr(X + 50, -44, 16, 30, 3), 'g6', 'g4', 'g8');
  // the beam axis
  if (o.axis) { const a = o.axis; c.save(); c.globalAlpha = a; for (let yy = Y.tip + 2; yy < Y.cam; yy += Math.max(1.2, 4 / z)) fillR(c, X - Math.max(0.2, 0.5 / z), yy, Math.max(0.4, 1 / z), Math.max(0.5, 1.6 / z), 'c2'); c.restore(); }
  c.restore();
};
COL.accY = k => -246.2 + k * 3.1;
COL.VOLT = ['-200 kV', '-175 kV', '-150 kV', '-125 kV', '-100 kV', '-75 kV', '-50 kV', '-25 kV'];
// the side-entry holder: rod from the goniometer to the axis; k = 1 fully in (tip on the axis), 0 = 60 cm out
COL.TIPK = 0.085;                                                          // the tip is drawn 8.5× life size in the column
COL.holder = (c, z, k, o = {}) => {
  const dx = (1 - k) * 60, tipX = X + dx;
  F(c, rr(tipX + 4, Y.spec - 1.3, 52, 2.6, 1.2), 'g9', 'g6', 'gb');                                   // rod
  F(c, rr(tipX + 55, Y.spec - 4, 14, 8, 2), 'g1', 'k', 'g3'); fillR(c, tipX + 58, Y.spec - 2, 8, 1, 'g4');
  // the tip end, from slightly above (screen space, so it stays crisp at every zoom)
  const m = c.getTransform(), sx = m.a * tipX + m.e, sy = m.d * Y.spec + m.f;
  SAMPLE.tip(c, sx, sy, z * COL.TIPK * 10, { squash: o.squash ?? 0.42, grid: o.grid ?? 1, clamp: o.clamp ?? 1, gridY: o.gridY ?? 0, blade: 6 });
};
// interior spaces gas molecules can fill (s05): [x0, y0, x1, y1] in cm
COL.VOIDS = [[X - 15, -264, X + 15, -252], [X - 13, -247, X + 13, -224], [X - 1.2, -219, X + 1.2, -190], [X - 14, -197, X + 14, -199],
  [X - 1, -190, X + 1, -150], [X - 1.5, -150, X + 1.5, -133], [X - 18, -127, X + 18, -123], [X - 1, -117, X + 1, -110], [X - 26, -109, X + 26, -84], [X - 10, -82, X + 10, -79]];
})();
