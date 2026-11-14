// MACHINE — the parts of the heart–lung machine, drawn from the side in the flat pixel style (one base colour per part, a
// light edge on the top left, a shadow band on the bottom right; clear housings as pale edges). Every part sits where
// SIDE.LY puts it, and the same drawing serves the wide shots and the close-ups. o.cut = {pump, hcu} (0..1) opens a
// housing to show its inside; the reservoir and the oxygenator are clear, so their inside always shows.
//   reservoir   hard-shell venous reservoir: two inlets on the cap (venous, suction), a filter sock, a steady blood level,
//               the outlet at the bottom (always under the surface), a level sensor on the wall
//   pump        centrifugal pump head (a clear cone: inlet on top, outlet at the side) on its drive; inside the drive a
//               motor turns a magnet disc that turns the smooth rotor through the wall
//   oxygenator  one clear cylinder: heat exchanger (bottom), hollow-fibre bundle, arterial filter (top)
//   detector    a clamp-on bubble detector on the arterial line (it watches; it removes nothing)
//   blender     gas blender: oxygen and air in, two flowmeters with floats, the mixed sweep gas out to the oxygenator
//   roller      a roller pump head: rollers on a turning arm press a tube against a curved raceway and push what is in it
//               forward (the pump of a dialysis machine works the same way). Used for cardioplegia and suction.
//   hcu         heater–cooler: a separate box on the floor that warms or cools water and pumps it through the heat exchanger
(() => {
const { W, H, P } = PIX;
const MACHINE = window.MACHINE = { NAME: 'MACHINE' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
const LY = SIDE.LY;
const rr = (c, cam, x0, y0, x1, y1, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fill(); }, LIT.wbox(cam, [x0, y0, x1, y1]), typeof ramp === 'string' ? R(ramp) : ramp, o);
const line = (c, cam, pts, col, o) => LIT.line(c, cam, pts, col, o);
MACHINE.rr = rr;
// a clear housing: pale edges, a reflection streak when it is large enough
MACHINE.glassBox = (c, cam, x0, y0, x1, y1, a = 1) => {
  line(c, cam, [[x0, y0 + 2], [x0, y1 - 2]], 'tw4', { alpha: a }); line(c, cam, [[x1, y0 + 2], [x1, y1 - 2]], 'tw2', { alpha: a });
  line(c, cam, [[x0 + 2, y1], [x1 - 2, y1]], 'tw2', { alpha: a });
  if (cam.z > 1.6) line(c, cam, [[x0 + 2, y0 + 4], [x0 + 2, y0 + (y1 - y0) * 0.45]], 'tw3', { alpha: 0.7 * a });
};
// the boxes the scenes highlight and label (side world)
const O = LY.oxy;
MACHINE.BOX = {
  res: [LY.res.x0 - 2, LY.res.y0 - 8, LY.res.x1 + 4, LY.res.y1 + 4], pump: [LY.drive.x0, LY.pump.y - LY.pump.h - 8, LY.drive.x1, LY.drive.y1],
  oxy: [O.x0 - 1, O.y0 - 6, O.x1 + 4, O.y1 + 6], hx: [O.x0, O.hx[0], O.x1, O.hx[1]], fib: [O.x0, O.fib[0], O.x1, O.fib[1]], filt: [O.x0, O.filt[0], O.x1, O.filt[1]],
  det: [LY.det.x - 8, LY.det.y - 7, LY.det.x + 8, LY.det.y + 7], blend: [LY.blend.x0, LY.blend.y0, LY.blend.x1 + 3, LY.blend.y1 + 3],
  cpg: [LY.bag.x0, LY.bag.y0 - 3, LY.cpg.x1, LY.cpg.y1], suc: [LY.suc.x0, LY.suc.y0 - 2, LY.suc.x1, LY.suc.y1], hcu: [LY.hcu.x0, LY.hcu.y0 - 4, LY.hcu.x1, LY.hcu.y1],
  mon: [LY.mon.x0 - 2, LY.mon.y0 - 2, LY.mon.x1 + 2, LY.mon.y1 + 2], heart: [LY.win.x - LY.win.r, LY.win.y - LY.win.r, LY.win.x + LY.win.r, LY.win.y + LY.win.r],
};
// a highlight: four corner brackets round a part (screen pixels), in the highlight mint
MACHINE.mark = (c, cam, key, a = 1, col = 'mt4') => {
  if (a <= 0.02) return;
  const b = Array.isArray(key) ? key : MACHINE.BOX[key], [ax, ay] = K.S(cam, b[0], b[1]), [bx, by] = K.S(cam, b[2], b[3]);
  const g = Math.round(2 + 3 * (1 - a)), x0 = Math.round(ax) - g, y0 = Math.round(ay) - g, x1 = Math.round(bx) + g, y1 = Math.round(by) + g, L = Math.max(3, Math.min(8, Math.round((x1 - x0) * 0.25)));
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { PIX.rect(c, sx > 0 ? x : x - L + 1, y, L, 1, col); PIX.rect(c, x, sy > 0 ? y : y - L + 1, 1, L, col); }
};
// ---------- the reservoir ----------
MACHINE.LEVEL = LY.res.level;
MACHINE.reservoir = (c, cam, T, o = {}) => {
  const { x0, x1, y0, y1, level } = LY.res, z = cam.z;
  LIT.tube(c, cam, [[x1, 20], [LY.mast.x0, 20]], 3, R('g'), {});                                       // holder arm
  rr(c, cam, x0, y0, x1, y1, 4, ['n1', 'n2', 'n3', 'tw0', 'tw1'], { bias: -0.1 });                       // the back, seen through
  rr(c, cam, x0 + 4, y0 + 5, x1 - 4, level - 1, 3, R('iv'), { bias: -0.05 });                         // the filter sock (mesh)
  if (z > 1.5) for (let k = 0; k < 4; k++) line(c, cam, [[x0 + 6, y0 + 9 + k * 5], [x1 - 6, y0 + 9 + k * 5]], 'iv2');
  LIT.tube(c, cam, [[-58, y0 - 3], [-58, y0 + 18]], 4, R('vb'), {});                                    // venous down-tube
  LIT.tube(c, cam, [[-70, y0 - 3], [-70, y0 + 8]], 3, R('vb'), {});                                     // suction (cardiotomy) inlet
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0 + 2, level, x1 - x0 - 4, y1 - level - 2, [0, 0, 3, 3]); ctx.fill(); }, LIT.wbox(cam, [x0, level, x1, y1]), R('vb'), {});
  line(c, cam, [[x0 + 3, level], [x1 - 3, level]], 'vb4');                                              // the steady level
  if (z > 0.6) for (let k = 0; k < 6; k++) line(c, cam, [[x0 + 1, y0 + 10 + k * 9], [x0 + (k % 2 ? 3 : 5), y0 + 10 + k * 9]], 'tw3');
  MACHINE.glassBox(c, cam, x0, y0, x1, y1);
  rr(c, cam, x0 - 2, y0 - 4, x1 + 2, y0 + 2, 2, R('iv'), {});                                          // the cap and its ports
  LIT.tube(c, cam, [[-58, y0 - 8], [-58, y0 - 3]], 8, R('iv'), {}); LIT.tube(c, cam, [[-70, y0 - 8], [-70, y0 - 3]], 5, R('iv'), {});
  LIT.tube(c, cam, [[-62, y1 - 1], [-62, y1 + 4]], 8, R('iv'), {});                                     // outlet
  // the level sensor: a pad on the wall at the minimum safe level, with a small light (lit = level is fine)
  const sy = level + 18; rr(c, cam, x1 - 1, sy - 5, x1 + 4, sy + 5, 1, R('g'), {});
  const [lx, ly] = K.S(cam, x1 + 2, sy), on = o.led ?? 0, s = Math.max(1, Math.round(z * 0.9));
  PIX.rect(c, Math.round(lx - s / 2), Math.round(ly - s / 2), s, s, on > 0.5 ? 'mt4' : 'mt1');
};
// ---------- the centrifugal pump (side view) ----------
MACHINE.ROT = 0.6;                                     // rotor turns per second: a readable schematic speed, steady all film
MACHINE.rotor = T => T * MACHINE.ROT * TAU;
MACHINE.pump = (c, cam, T, o = {}) => {
  const { x, y, r, h } = LY.pump, D = LY.drive, z = cam.z, cut = o.cut ?? 0, ang = MACHINE.rotor(T);
  rr(c, cam, D.x0, D.y0, D.x1, D.y1, 2, R('g'), { bias: 0.06 });                                        // the drive
  if (z > 1.2) for (let k = 0; k < 3; k++) line(c, cam, [[D.x0 + 3, D.y0 + 9 + k * 4], [D.x0 + 9, D.y0 + 9 + k * 4]], 'g2');
  const [kx, ky] = K.S(cam, D.x1 - 6, D.y0 + 12); LIT.sphere(c, kx, ky, Math.max(1.5, 2.6 * z), R('g'), { bias: 0.15 });
  if (cut > 0.05) {
    // inside the drive: the motor and, at its top, the magnet disc (edge-on) that turns the rotor through the wall
    rr(c, cam, x - 8, D.y0 + 7, x + 8, D.y1 - 2, 1, ['n1', 'n2', 'g1', 'g2', 'g3'], { alpha: cut });
    rr(c, cam, x - r * 0.8, D.y0 + 1, x + r * 0.8, D.y0 + 5, 1, ['n1', 'n2', 'n3', 'g2'], { alpha: cut });
    for (let k = 0; k < 8; k++) {
      const a = ang + k * TAU / 8; if (Math.sin(a) < 0) continue;
      const [sx, sy] = K.S(cam, x + Math.cos(a) * r * 0.66, D.y0 + 3), s = Math.max(1, Math.round(1.6 * z * (0.55 + 0.45 * Math.sin(a))));
      PIX.rect(c, Math.round(sx - s / 2), Math.round(sy - z * 0.9), s, Math.max(1, Math.round(1.8 * z)), k % 2 ? 'hr4' : 'wa4');
    }
  }
  // the head: a clear cone full of blood; the cutaway thins the blood so the rotor shows
  const cone = new Path2D(); cone.moveTo(x - r, y); cone.quadraticCurveTo(x - r * 0.45, y - h * 0.6, x - 3, y - h); cone.lineTo(x + 3, y - h); cone.quadraticCurveTo(x + r * 0.45, y - h * 0.6, x + r, y); cone.closePath();
  LIT.path(c, cam, cone, [x - r, y - h, x + r, y], ['vb1', 'vb2', 'vb3', 'vb4', 'vb5'], { bias: -0.1 * cut });
  const rot = new Path2D(); rot.moveTo(x - r * 0.72, y - 1); rot.quadraticCurveTo(x - r * 0.3, y - h * 0.5, x - 2, y - h * 0.8); rot.lineTo(x + 2, y - h * 0.8); rot.quadraticCurveTo(x + r * 0.3, y - h * 0.5, x + r * 0.72, y - 1); rot.closePath();
  LIT.path(c, cam, rot, [x - r, y - h, x + r, y], R('iv'), { alpha: lerp(0.5, 1, cut) });
  if (z > 1.3) for (let k = 0; k < 6; k++) {                                                           // vanes sweeping round
    const a = ang + k * TAU / 6; if (Math.sin(a) < 0.08) continue;
    const pts = []; for (let q = 0; q <= 6; q++) { const f = q / 6, aa = a + f * 0.7, rad = lerp(1.5, r * 0.68, f); pts.push([x + Math.cos(aa) * rad, y - 1.5 - h * 0.78 * (1 - f)]); }
    line(c, cam, pts, 'g3', { alpha: lerp(0.5, 1, cut) });
  }
  rr(c, cam, x - r - 1, y - 2, x + r + 1, y + 1, 1, R('iv'), {});                                       // base ring
  LIT.tube(c, cam, [[x, y - h - 7], [x, y - h + 1]], 7, R('tw'), {});                                   // inlet (top, centre)
  LIT.tube(c, cam, [[x + r - 4, y - 3], [x + r + 2, y - 3]], 7, R('tw'), {});                           // outlet (side)
  line(c, cam, [[x - r * 0.85, y - 3], [x - 4, y - h + 2]], 'tw4', { alpha: 0.8 });
};
// ---------- the oxygenator assembly ----------
MACHINE.oxy = (c, cam, T, o = {}) => {
  const z = cam.z, xm = (O.x0 + O.x1) / 2;
  LIT.tube(c, cam, [[O.x0, 40], [LY.mast.x1, 40]], 3, R('g'), {});                                     // holder arm
  rr(c, cam, O.x0, O.y0, O.x1, O.y1, 4, ['n1', 'n2', 'n3', 'tw0', 'tw1'], { bias: -0.1 });
  const [b0, b1] = O.fib;
  rr(c, cam, O.x0 + 3, b0, O.x1 - 3, b1, 2, R('iv'), { bias: -0.15 });                                  // the fibre bundle
  if (z > 0.6) {                                                                                         // blood between the fibres:
    const rows = Math.max(4, Math.round((b1 - b0) / 3));                                               // venous below, red above
    for (let k = 0; k <= rows; k++) { const yy = b0 + 1 + k * (b1 - b0 - 2) / rows, f = (yy - b0) / (b1 - b0); line(c, cam, [[O.x0 + 4, yy], [O.x1 - 4, yy]], f < 0.3 ? 'ab4' : f < 0.55 ? 'ab3' : f < 0.8 ? 'vb4' : 'vb3'); }
  }
  const [h0, h1] = O.hx;
  rr(c, cam, O.x0 + 3, h0, O.x1 - 3, h1, 2, R('vb'), {});                                               // heat exchanger
  if (z > 0.8) for (let k = 0; k < 4; k++) line(c, cam, [[O.x0 + 5, h0 + 3 + k * 5], [O.x1 - 5, h0 + 3 + k * 5]], k % 2 ? 'wa4' : 'wa3');
  const [f0, f1] = O.filt, fh = o.filterHi ?? 0;
  rr(c, cam, O.x0 + 3, f0, O.x1 - 3, f1, 1, R('ab'), { bias: 0.2 * fh });                               // arterial filter
  if (z > 0.8) for (let k = 0; k < Math.round((O.x1 - O.x0 - 6) / 2.5); k++) line(c, cam, [[O.x0 + 4 + k * 2.5, f0 + 1], [O.x0 + 5 + k * 2.5, f1 - 1]], fh > 0.5 ? 'w' : (k % 2 ? 'iv3' : 'iv2'));
  MACHINE.glassBox(c, cam, O.x0, O.y0, O.x1, O.y1);
  rr(c, cam, O.x0 - 1, O.y0 - 3, O.x1 + 1, O.y0 + 2, 2, R('iv'), {}); rr(c, cam, O.x0 - 1, O.y1 - 2, O.x1 + 1, O.y1 + 3, 2, R('iv'), {});
  LIT.tube(c, cam, [[xm, O.y0 - 7], [xm, O.y0 - 2]], 8, R('iv'), {}); LIT.tube(c, cam, [[xm, O.y1 + 2], [xm, O.y1 + 7]], 8, R('iv'), {});
  for (const [py, ramp] of [[16, 'ox'], [66, 'ox'], [78, 'wa'], [90, 'wa']]) LIT.tube(c, cam, [[O.x1 - 1, py], [O.x1 + 3, py]], 4, R(ramp), {});
  if (o.fibers > 0) MACHINE.bundle(c, cam, T, { a: o.fibers, sel: o.sel });
};
// the fibre bundle up close (S12): hollow fibres in rows (ivory membrane, a cyan gas core), blood and red cells between
// them moving up toward the outlet; sel = one fibre picked out
MACHINE.FIB = { y: 44, t: 1.5, gap: 2.6 };
MACHINE.bundle = (c, cam, T, o = {}) => {
  const x0 = O.x0 + 3, x1 = O.x1 - 3, [by0, by1] = O.fib, F = MACHINE.FIB, z = cam.z, a = o.a ?? 1, sel = o.sel ?? 0;
  if (a <= 0) return;
  const [bx0, byt] = K.S(cam, x0, by0), [bx1, byb] = K.S(cam, x1, by1);
  const clip = (sx, sy) => sx >= bx0 && sx < bx1 && sy >= byt && sy < byb;
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(x0, by0, x1 - x0, by1 - by0); }, [bx0 - 1, byt - 1, bx1 + 1, byb + 1], ['vb1', 'vb2', 'vb2', 'vb3'], { edge: false, alpha: a });
  const rows = []; for (let yy = F.y - Math.ceil((F.y - by0) / F.gap) * F.gap; yy <= by1; yy += F.gap) rows.push(yy);
  for (const yy of rows) LIT.tube(c, cam, [[x0 - 6, yy + 1.3 - 2], [x1 + 6, yy + 1.3 + 2]], F.t * 0.9, ['g1', 'g2', 'iv0', 'iv1'], { clip, alpha: a });
  if (z > 5) for (let k = 0; k < 40; k++) {
    const xx = x0 + ((k * 7.3) % (x1 - x0)), yy = by1 - ((T * 3 + k * 1.37) % (by1 - by0)), [sx, sy] = K.S(cam, xx, yy);
    if (!clip(sx, sy)) continue;
    LIT.sphere(c, sx, sy, Math.max(1.2, 0.36 * z), ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { alpha: a });
  }
  for (const yy of rows) {
    const isSel = Math.abs(yy - F.y) < 0.01, dim = isSel ? 0 : sel;
    const ramp = isSel && sel > 0 ? ['iv1', 'iv2', 'iv3', 'iv4', 'iv5', 'w'] : ['iv0', 'iv1', 'iv2', 'iv3', 'iv4', 'iv5'];
    LIT.tube(c, cam, [[x0 - 4, yy], [x1 + 4, yy]], F.t, ramp, { clip, alpha: a, bias: -0.25 * dim });
    if (z > 6) LIT.line(c, cam, [[x0, yy + 0.05], [x1, yy + 0.05]], isSel ? 'ox4' : 'ox2', { alpha: a * (1 - 0.6 * dim) });
  }
};
// ---------- the clamp-on bubble detector ----------
MACHINE.detector = (c, cam, T, o = {}) => {
  const { x, y } = LY.det, on = o.hi ?? 0, z = cam.z;
  LIT.tube(c, cam, [[x - 6, y + 4], [x - 9, y + 9], [x - 9, y + 13]], 1.5, R('g'), {});                 // its cable
  rr(c, cam, x - 7, y - 6, x + 7, y + 6, 2, R('g'), { bias: 0.12 });
  line(c, cam, [[x - 6, y], [x + 6, y]], 'g2');
  const [lx, ly] = K.S(cam, x + 4, y - 3), s = Math.max(1, Math.round(z * 1.2));
  PIX.rect(c, Math.round(lx), Math.round(ly), s, s, on > 0.3 ? 'mt4' : 'mt1');
};
// ---------- the monitor and its picture (S23 shows it large) ----------
MACHINE.TRACES = [['FLOW', 'ab'], ['PRESSURE', 'co'], ['TEMP', 'wa'], ['OXYGEN', 'ox']];
MACHINE.screen = (c, x0, y0, w, h, T, o = {}) => {
  PIX.rect(c, x0, y0, w, h, 'k'); PIX.rect(c, x0, y0, w, 1, 'g3');
  const rows = MACHINE.TRACES.length, rh = h / rows;
  MACHINE.TRACES.forEach(([lab, ramp], k) => {
    const yy = y0 + k * rh, mid = yy + rh * 0.6, R3 = ramp + '3', R4 = ramp + '4';
    if (o.labels && !window.NOTEXT) PIX.text(c, lab, x0 + 4, yy + 3, R4, { sc: o.sc || 1, shadow: null });
    const xs = o.labels ? x0 + w * 0.48 : x0 + 3, xe = x0 + w - 4;                 // a steady trace: flat, a slow small ripple
    for (let x = Math.round(xs); x < xe; x++) { const yv = mid + Math.sin((x - T * 18) * 0.21 + k) * 0.6 * (o.sc || 1) * 0.5; PIX.rect(c, x, Math.round(yv), 1, 1, R3); }
    if (k < rows - 1) PIX.rect(c, x0 + 2, Math.round(yy + rh) - 1, w - 4, 1, 'n1');
  });
};
MACHINE.monitor = (c, cam, T, o = {}) => {
  const M = LY.mon;
  rr(c, cam, M.x0 - 2, M.y0 - 2, M.x1 + 2, M.y1 + 2, 2, R('g'), { bias: 0.12 });
  const [ax, ay] = K.S(cam, M.x0 + 1, M.y0 + 1), [bx, by] = K.S(cam, M.x1 - 1, M.y1 - 1);
  if (bx - ax > 8) MACHINE.screen(c, Math.round(ax), Math.round(ay), Math.round(bx - ax), Math.round(by - ay), T, {});
};
// ---------- the gas blender ----------
MACHINE.blender = (c, cam, T, o = {}) => {
  const B = LY.blend, z = cam.z;
  rr(c, cam, B.x0, B.y0, B.x1, B.y1, 2, R('iv'), {});
  for (const [fx, gas] of [[B.x0 + 5, 'o2'], [B.x0 + 11, 'air']]) {                                     // two flowmeters
    rr(c, cam, fx - 1.5, B.y0 + 3, fx + 1.5, B.y1 - 4, 1, ['n1', 'n2', 'tw1', 'tw2'], {});
    const fy = B.y0 + (gas === 'o2' ? 9 : 12) + Math.sin(T * 2.3 + fx) * 0.3, [sx, sy] = K.S(cam, fx, fy);   // the float holds steady
    LIT.sphere(c, sx, sy, Math.max(1, 1.3 * z), gas === 'o2' ? ['ox2', 'ox3', 'ox4', 'ox5'] : ['g4', 'g5', 'g7', 'g8'], {});
  }
  const [kx, ky] = K.S(cam, B.x1 - 6, B.y0 + 8); LIT.sphere(c, kx, ky, Math.max(1.5, 2.6 * z), R('g'), { bias: 0.1 });
  for (const py of [-14, -6]) LIT.tube(c, cam, [[B.x1 - 1, py], [B.x1 + 3, py]], 3, R('g'), {});        // inlets: O2, air
  LIT.tube(c, cam, [[72, B.y1 - 1], [72, B.y1 + 3]], 3, R('g'), {});                                     // outlet
  if (o.cut > 0.05) {                                                                                     // inside: the two gases meet
    const a = o.cut, [ix, iy] = K.S(cam, B.x0 + 16, B.y0 + 15);
    c.save(); c.globalAlpha = a; for (let k = 0; k < 6; k++) { const q = ((T * 1.4 + k / 6) % 1); const [sx, sy] = K.S(cam, lerp(B.x1 - 1, B.x0 + 16, q), lerp(k % 2 ? -14 : -6, B.y0 + 15, q)); PIX.rect(c, Math.round(sx), Math.round(sy), Math.max(1, Math.round(z * 0.8)), Math.max(1, Math.round(z * 0.8)), k % 2 ? 'ox4' : 'g7'); }
    c.restore();
  }
};
// ---------- a roller pump head (cardioplegia, suction): the raceway open at the top, the tube lying in it as a U ----------
// cx, cy = centre, r = raceway radius, top = the y where the tube legs leave the module; fluid = the ramp of what it moves
MACHINE.ROLL = 0.45;                                   // turns per second
MACHINE.roller = (c, cam, cx, cy, r, top, T, o = {}) => {
  const z = cam.z, ang = -T * (o.speed ?? MACHINE.ROLL) * TAU, fl = R(o.fluid || 'vb'), rt = r * 0.62;
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.lineWidth = r * 0.26; ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, -Math.PI * 0.22, Math.PI * 1.22); ctx.stroke(); }, LIT.wbox(cam, [cx - r, cy - r, cx + r, cy + r]), R('g'), { bias: 0.1 });
  const Upts = [[cx - rt, top], [cx - rt, cy]];
  for (let q = 1; q < 24; q++) { const th = Math.PI - q / 24 * Math.PI; Upts.push([cx + Math.cos(th) * rt, cy + Math.sin(th) * rt]); }
  Upts.push([cx + rt, cy], [cx + rt, top]);
  LIT.tube(c, cam, Upts, r * 0.24, fl, {});
  // what the rollers push: marks in the tube, carried round between the rollers (in at the left, out at the right)
  if (z * r > 14) for (let k = 0; k < 6; k++) {
    const th = ang + Math.PI * (k + 0.5) / 3; if (Math.sin(th) < 0.05) continue;
    const [sx, sy] = K.S(cam, cx + Math.cos(th) * rt, cy + Math.sin(th) * rt), s = Math.max(1, Math.round(z * r * 0.07));
    PIX.rect(c, Math.round(sx - s / 2), Math.round(sy - s / 2), s, s, fl[Math.min(fl.length - 1, 4)]);
  }
  for (const s of [0, Math.PI]) {                                                                         // the arm and two rollers
    const th = ang + s, rx = cx + Math.cos(th) * rt, ry = cy + Math.sin(th) * rt;
    LIT.tube(c, cam, [[cx, cy], [rx, ry]], r * 0.16, R('g'), { bias: 0.1 });
    const [sx, sy] = K.S(cam, rx, ry); LIT.sphere(c, sx, sy, Math.max(1.2, r * 0.21 * z), R('iv'), {});
    if (Math.sin(th) > 0.05 && z * r > 14) { const nx = Math.cos(th), ny = Math.sin(th); for (const e of [-1, 1]) { const [px, py] = K.S(cam, rx + nx * r * 0.13 * e, ry + ny * r * 0.13 * e); PIX.rect(c, Math.round(px), Math.round(py), 1, 1, 'k'); } }   // the pinch
  }
  const [hx, hy] = K.S(cam, cx, cy); LIT.sphere(c, hx, hy, Math.max(1, r * 0.14 * z), R('g'), { bias: 0.2 });
};
MACHINE.cardio = (c, cam, T, o = {}) => {
  const C = LY.cpg, B = LY.bag;
  LIT.tube(c, cam, [[LY.mast.x1, -47], [B.x0 + 6, -47], [B.x0 + 6, B.y0]], 1.5, R('g'), {});            // the hook arm
  rr(c, cam, B.x0, B.y0, B.x1, B.y1, 3, R('tw'), { bias: 0.1 });                                       // the bag of solution
  rr(c, cam, B.x0 + 1, B.y0 + 6, B.x1 - 1, B.y1 - 1, 2, ['hr2', 'hr3', 'hr4', 'hr5'], {});
  rr(c, cam, C.x0, C.y0, C.x1, C.y1, 2, R('iv'), {});
  MACHINE.roller(c, cam, C.head[0], C.head[1], C.hr, C.y0, T, { fluid: 'hr', speed: o.speed });
};
MACHINE.suction = (c, cam, T, o = {}) => {
  const S_ = LY.suc;
  rr(c, cam, S_.x0, S_.y0, S_.x1, S_.y1, 2, R('iv'), {});
  MACHINE.roller(c, cam, S_.head[0], S_.head[1], S_.hr, S_.y0, T, { fluid: 'vb' });
};
// ---------- the heater–cooler ----------
MACHINE.hcu = (c, cam, T, o = {}) => {
  const U_ = LY.hcu, z = cam.z, cut = o.cut ?? 0;
  rr(c, cam, U_.x0, U_.y0, U_.x1, U_.y1 - 4, 3, R('iv'), { bias: -0.12 });
  rr(c, cam, U_.x0 + 4, U_.y0 + 5, U_.x1 - 4, U_.y0 + 13, 1, ['k', 'n1', 'n2', 'n3'], {});            // status window (no numbers)
  for (const [k, col] of [[0, 'hr4'], [1, 'ox4']]) { const [sx, sy] = K.S(cam, U_.x0 + 7 + k * 8, U_.y0 + 9); PIX.rect(c, Math.round(sx), Math.round(sy) - Math.max(0, Math.round(z * 0.5)), Math.max(2, Math.round(4 * z)), Math.max(1, Math.round(z)), col); }
  if (z > 0.6) for (let k = 0; k < 4; k++) line(c, cam, [[U_.x0 + 5, U_.y1 - 26 + k * 4], [U_.x1 - 5, U_.y1 - 26 + k * 4]], 'iv1');
  for (const wx of [U_.x0 + 6, U_.x1 - 6]) { const [sx, sy] = K.S(cam, wx, LY.floor - 3); LIT.sphere(c, sx, sy, Math.max(1.5, 3 * z), R('g'), { bias: -0.2 }); }
  if (cut > 0.05) {
    // inside: a water tank, a heater (warm) and a cooling coil (cool) in it, and the water pump that sends it out
    const tx0 = U_.x0 + 3, tx1 = U_.x1 - 3, ty0 = U_.y0 + 18, ty1 = U_.y1 - 30;
    rr(c, cam, tx0, ty0, tx1, ty1, 2, ['wa0', 'wa1', 'wa2', 'wa3'], { alpha: cut });
    const wave = (yy, col, ph) => { const pts = []; for (let q = 0; q <= 10; q++) pts.push([tx0 + 3 + q * (tx1 - tx0 - 6) / 10, yy + (q % 2 ? -2 : 2)]); LIT.line(c, cam, pts, col, { alpha: cut }); };
    wave(ty0 + 8, 'hr4', 0); wave(ty0 + 16, 'ox4', 1);
    const [px, py] = K.S(cam, (tx0 + tx1) / 2, ty1 - 6); LIT.sphere(c, px, py, Math.max(2, 4 * z), R('g'), { alpha: cut });
    const a2 = MACHINE.rotor(T) * 1.5; for (const s of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) PIX.bline(c, px, py, px + Math.cos(a2 + s) * 3.5 * z, py + Math.sin(a2 + s) * 3.5 * z, 'g7');
    for (let k = 0; k < 7; k++) { const q = ((T * 0.6 + k / 7) % 1), [sx, sy] = K.S(cam, lerp(tx0 + 3, tx1 - 3, q), ty0 + 4 + (k % 3) * 7); PIX.rect(c, Math.round(sx), Math.round(sy), Math.max(1, Math.round(z * 0.7)), 1, 'wa4'); }
  }
  for (const px of [112, 126]) LIT.tube(c, cam, [[px, U_.y0 - 4], [px, U_.y0 + 1]], 4, R('wa'), {});
};
// ---------- the console: mast, cart and wheels ----------
MACHINE.cart = (c, cam, T) => {
  const C = LY.cart, z = cam.z;
  rr(c, cam, C.x0, C.y0, C.x1, C.y1, 3, R('g'), { bias: -0.04 });
  if (z > 0.6) { line(c, cam, [[C.x0 + 4, C.y0 + 12], [C.x1 - 4, C.y0 + 12]], 'g2'); for (let k = 0; k < 4; k++) line(c, cam, [[C.x0 + 44 + k * 5, C.y0 + 20], [C.x0 + 44 + k * 5, C.y1 - 6]], 'g2'); }
  for (const wx of [C.x0 + 12, C.x1 - 12]) { const [sx, sy] = K.S(cam, wx, LY.floor - 5); LIT.sphere(c, sx, sy, Math.max(2, 5 * z), R('g'), { bias: -0.2 }); }
};
// ---------- everything behind the lines, then the detector in front ----------
// o: { cut: {pump, hcu, blend}, led, detHi, filterHi, fibers, sel, mark: {key: a} }
MACHINE.draw = (c, cam, T, o = {}) => {
  const cut = o.cut || {};
  rr(c, cam, LY.mast.x0, LY.mast.y0, LY.mast.x1, LY.mast.y1, 1, R('g'), { bias: 0.08 });
  MACHINE.monitor(c, cam, T, o);
  MACHINE.cardio(c, cam, T, o);
  MACHINE.blender(c, cam, T, { cut: cut.blend });
  MACHINE.hcu(c, cam, T, { cut: cut.hcu });
  MACHINE.cart(c, cam, T);
  MACHINE.suction(c, cam, T, o);
  MACHINE.pump(c, cam, T, { cut: cut.pump });
  MACHINE.reservoir(c, cam, T, { led: o.led });
  MACHINE.oxy(c, cam, T, { filterHi: o.filterHi, fibers: o.fibers, sel: o.sel });
};
MACHINE.front = (c, cam, T, o = {}) => {
  MACHINE.detector(c, cam, T, { hi: o.detHi });
  if (o.mark) for (const k in o.mark) MACHINE.mark(c, cam, k, o.mark[k]);
};
MACHINE.init = () => {};
})();
