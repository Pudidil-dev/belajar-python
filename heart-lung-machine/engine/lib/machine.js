// MACHINE — the heart–lung machine (one coherent reference layout, WORLD.LY): a graphite base, a steel mast with the
// monitor, the hard-shell venous reservoir, the centrifugal pump head on its drive, the integrated assembly (heat
// exchanger at the bottom, hollow-fibre oxygenator, arterial filter at the top), the clamp-on bubble detector on the
// arterial line, the gas blender, the cardioplegia module and the heater–cooler. Each component is a 2D pixel model lit like
// a 3D object (LIT). The same drawing serves the wide shots and the close-ups; o.cut = {res, pump, oxy} (0..1) turns a
// housing see-through to reveal its inside (S06, S07, S09, S15).
(() => {
const { W, H, P } = PIX;
const MACHINE = window.MACHINE = { NAME: 'MACHINE' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
const LY = WORLD.LY;
const sm = (p, s = 1) => WORLD.smooth(p, s);
const rr = (c, cam, x, y, w, h, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }, LIT.wbox(cam, [x, y, x + w, y + h]), R(ramp) || ramp, o);
const S_ = (cam, x, y) => K.S(cam, x, y);
// glass: the edges of a clear part catch the light: a pale outline and two vertical reflection streaks
const glass = (c, cam, x, y, w, h, a = 1) => {
  const L1 = [[x, y + 3], [x, y + h - 4]], L2 = [[x + w, y + 3], [x + w, y + h - 4]];
  LIT.line(c, cam, L1, 'tw4', { alpha: a }); LIT.line(c, cam, L2, 'tw1', { alpha: a });
  LIT.line(c, cam, [[x + 3, y], [x + w - 3, y]], 'tw3', { alpha: a }); LIT.line(c, cam, [[x + 3, y + h], [x + w - 3, y + h]], 'tw1', { alpha: a });
  if (cam.z > 1.2) { LIT.line(c, cam, [[x + w * 0.22, y + 6], [x + w * 0.22, y + h * 0.7]], 'tw4', { alpha: 0.6 * a }); LIT.line(c, cam, [[x + w * 0.3, y + 10], [x + w * 0.3, y + h * 0.4]], 'tw3', { alpha: 0.5 * a }); }
};
MACHINE.glass = glass;
// ---------- the reservoir: blood level, inlet down-tube, defoamer/filter, submerged outlet, level sensor ----------
MACHINE.LEVEL = 776;                                              // the working level (world y): constant all film
MACHINE.reservoir = (c, cam, T, o = {}) => {
  const { x, y, w, h } = LY.res, cut = o.cut ?? 0, lvl = MACHINE.LEVEL;
  rr(c, cam, x, y, w, h, 7, ['n1', 'n2', 'n3', 'tw0'], { amb: 0.2, dif: 0.5, cylX: true });    // the back wall, seen through
  // the defoamer / filter sock round the inlet (white mesh) in the upper part
  rr(c, cam, x + 8, y + 10, w - 16, 44, 6, R('iv'), { amb: 0.24, dif: 0.7, alpha: lerp(0.55, 0.75, cut), cylX: true });
  if (cam.z > 1.5) for (let k = 0; k < 5; k++) LIT.line(c, cam, [[x + 10, y + 16 + k * 8], [x + w - 10, y + 16 + k * 8]], 'iv1', { alpha: 0.7 });
  // the internal down-tube from the top inlet into the sock
  LIT.tube(c, cam, sm([[x + 10, y - 4], [x + 11, y + 8], [x + 13, y + 30]]), 7, R('vb'), { amb: 0.24 });
  // the blood pool: a flat, steady level, the outlet at the bottom always under it
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x + 2, lvl, w - 4, y + h - lvl - 2, [0, 0, 6, 6]); ctx.fill(); }, LIT.wbox(cam, [x, lvl, x + w, y + h]), R('vb'), { amb: 0.2, dif: 0.75, cylX: true });
  LIT.line(c, cam, [[x + 3, lvl], [x + w - 3, lvl]], 'vb4');
  if (cam.z > 2) { const ph = (T * 0.8) % 1; LIT.line(c, cam, [[x + 6 + ph * 10, lvl + 1], [x + 12 + ph * 10, lvl + 1]], 'vb3'); }
  // graduation ticks on the shell, the cap with the inlet port and the outlet port
  if (cam.z > 0.6) for (let k = 0; k < 7; k++) LIT.line(c, cam, [[x + 2, y + 18 + k * 10], [x + (k % 2 ? 6 : 9), y + 18 + k * 10]], 'tw3');
  glass(c, cam, x, y, w, h);
  rr(c, cam, x - 2, y - 6, w + 4, 9, 3, R('iv'), { amb: 0.26, Rw: 3 });
  LIT.tube(c, cam, [[x + 10, y - 9], [x + 10, y - 2]], 9, R('iv'), { amb: 0.3 });
  LIT.tube(c, cam, [[x + w / 2 - 1, y + h - 2], [x + w / 2 - 1, y + h + 5]], 10, R('iv'), { amb: 0.3 });
  // the level sensor: a pad on the outside wall at the minimum level, with a small indicator light
  const sy = y + h - 22; rr(c, cam, x + w - 2, sy - 6, 7, 12, 2, R('g'), { amb: 0.22, Rw: 2 });
  const [lx, ly] = S_(cam, x + w + 2, sy), on = o.led ?? 0;
  PIX.rect(c, Math.round(lx) - 1, Math.round(ly) - 1, Math.max(2, Math.round(2 * cam.z / 2)), Math.max(2, Math.round(2 * cam.z / 2)), on > 0.5 ? 'mt4' : 'mt2');
  if (on > 0) FX.glowL(c, lx, ly, 4 * cam.z * on, ['mt1', 'mt2', 'mt3'], 0.7 * on, 1.5);
  // the holder arm to the mast
  LIT.tube(c, cam, [[x + w + 6, y + 30], [LY.mast.x, y + 30]], 4, R('g'), { amb: 0.26 });
};
// ---------- the centrifugal pump: drive unit with the magnetic coupling, the cone-shaped head, smooth rotor ----------
// angle of the rotor: steady speed, a whole number of turns over the film (the loop)
MACHINE.rotor = T => (T / 68) * 340 * TAU;
MACHINE.pump = (c, cam, T, o = {}) => {
  const { x, y, r, h } = LY.pump, D = LY.drive, cut = o.cut ?? 0, z = cam.z;
  LIT.block(c, cam, D.x, D.y, D.w, D.h, 14, R('g'), { front: 3, top: 5, side: 1 });
  if (z > 1.2) { for (let k = 0; k < 4; k++) LIT.line(c, cam, [[D.x + 6, D.y + 8 + k * 4], [D.x + 18, D.y + 8 + k * 4]], 'g2'); const [kx, ky] = S_(cam, D.x + D.w - 10, D.y + 13); LIT.sphere(c, kx, ky, 3.2 * z, R('g'), { amb: 0.3 }); }
  // the magnetic coupling under the head (seen in the cutaway): a ring of magnets that turns with the rotor
  const ang = MACHINE.rotor(T);
  if (cut > 0.05) {
    rr(c, cam, x - r * 0.9, D.y + 2, r * 1.8, 10, 3, ['k', 'n0', 'n1', 'n2'], { amb: 0.1, dif: 0.4, alpha: cut, edge: false });
    for (let k = 0; k < 6; k++) { const a = ang + k * TAU / 6, mx = x + Math.cos(a) * r * 0.6, my = D.y + 7 + Math.sin(a) * 2.5; if (Math.sin(a) < -0.3) continue; const [sx, sy] = S_(cam, mx, my); LIT.sphere(c, sx, sy, 2.2 * z, R(k % 2 ? 'g' : 'gw'), { amb: 0.3, alpha: cut }); }
  }
  // the head: a cone of clear polycarbonate on the drive; blood inside, the smooth rotor in the middle
  const cone = new Path2D(); cone.moveTo(x - r, y); cone.quadraticCurveTo(x - r * 0.4, y - h * 0.55, x - 4, y - h); cone.lineTo(x + 4, y - h); cone.quadraticCurveTo(x + r * 0.4, y - h * 0.55, x + r, y); cone.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI); cone.closePath();
  LIT.path(c, cam, cone, [x - r, y - h, x + r, y + r * 0.3], R('vb'), { amb: 0.22, dif: 0.75, Rw: 9 });
  // the rotor: a smooth cone with low curved vanes (no blades); visible when the housing is clear
  const rot = new Path2D(); rot.moveTo(x - r * 0.72, y - 1); rot.quadraticCurveTo(x - r * 0.25, y - h * 0.45, x - 2, y - h * 0.82); rot.lineTo(x + 2, y - h * 0.82); rot.quadraticCurveTo(x + r * 0.25, y - h * 0.45, x + r * 0.72, y - 1); rot.ellipse(x, y - 1, r * 0.72, r * 0.2, 0, 0, Math.PI); rot.closePath();
  LIT.path(c, cam, rot, [x - r, y - h, x + r, y + r * 0.3], R('iv'), { amb: 0.22, dif: 0.8, Rw: 6, alpha: lerp(0.35, 1, cut) });
  if (z > 1.2) for (let k = 0; k < 6; k++) {                     // the vanes, turning: curved lines on the visible half
    const a = ang + k * TAU / 6; if (Math.sin(a) < 0) continue;
    const pts = []; for (let q = 0; q <= 6; q++) { const f = q / 6, aa = a + f * 0.9, rr2 = lerp(r * 0.12, r * 0.7, f); pts.push([x + Math.cos(aa) * rr2, y - h * 0.8 * (1 - f) - 1 + Math.sin(aa) * rr2 * 0.2]); }
    LIT.line(c, cam, pts, 'g4', { alpha: lerp(0.4, 1, cut) });
  }
  // ports: the inlet on top (centre), the outlet at the side (tangential)
  LIT.tube(c, cam, [[x, y - h - 7], [x, y - h + 1]], 9, R('tw'), { amb: 0.3 });
  LIT.tube(c, cam, [[x + r - 6, y + 2], [x + r + 3, y + 2]], 9, R('tw'), { amb: 0.3 });
  if (z > 1) { LIT.line(c, cam, [[x - r * 0.8, y - 3], [x - 5, y - h + 2]], 'tw4', { alpha: 0.8 }); LIT.line(c, cam, [[x - r, y], [x + r, y]], 'tw2'); }
};
// ---------- the integrated assembly: heat exchanger (bottom), oxygenator fibre bundle, arterial filter (top) ----------
MACHINE.oxy = (c, cam, T, o = {}) => {
  const { x, y, r, h } = LY.oxy, cut = o.cut ?? 0, z = cam.z, x0 = x - r, w = 2 * r;
  rr(c, cam, x0, y, w, h, 6, ['n1', 'n2', 'n3'], { amb: 0.2, dif: 0.5, cylX: true });         // the back of the housing
  // the fibre bundle: ivory fibres with blood between them — darker (venous) at the bottom, red (oxygenated) at the top
  const by0 = y + 14, by1 = y + h - 34;
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0 + 4, by0, w - 8, by1 - by0, 4); ctx.fill(); }, LIT.wbox(cam, [x0, by0, x0 + w, by1]), R('iv'), { amb: 0.22, dif: 0.7, cylX: true,
    tone: (sx, sy) => { const [wx, wy] = K.Sinv(cam, sx, sy), f = (wy - by0) / (by1 - by0); return -0.18 - 0.12 * f; } });
  // the blood among the fibres: a dithered red tint, oxygenated (top) to venous (bottom), as fine diagonal streaks
  if (z > 0.5) {
    const n = Math.max(6, Math.round((w - 8) / 3)), [ax, ay] = S_(cam, x0 + 4, by0), [bx, by] = S_(cam, x0 + w - 4, by1);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    for (let sy = Math.round(ay); sy < by; sy++) for (let sx = Math.round(ax); sx < bx; sx++) {
      const f = (sy - ay) / Math.max(1, by - ay), stripe = ((sx + sy * (z > 2 ? 1 : 0)) % Math.max(2, Math.round(z * 1.6))) === 0;
      if (!stripe) continue;
      c.fillStyle = P[f < 0.45 ? (f < 0.2 ? 'ab3' : 'ab2') : f < 0.8 ? 'vb3' : 'vb2']; c.fillRect(sx, sy, 1, 1);
    }
    c.restore();
  }
  // the heat exchanger at the bottom: water (blue) inside fine tubes, blood around them
  const hy0 = y + h - 32, hy1 = y + h - 6;
  rr(c, cam, x0 + 4, hy0, w - 8, hy1 - hy0, 3, R('vb'), { amb: 0.2, dif: 0.6, cylX: true });
  if (z > 0.8) for (let k = 0; k < 4; k++) LIT.line(c, cam, [[x0 + 7, hy0 + 4 + k * 6], [x0 + w - 7, hy0 + 4 + k * 6]], k % 2 ? 'wa3' : 'wa2');
  // the arterial filter at the top: a pleated screen the blood passes on its way out
  const fy0 = y + 3, fy1 = y + 13;
  rr(c, cam, x0 + 4, fy0, w - 8, fy1 - fy0, 2, R('ab'), { amb: 0.22, cylX: true });
  if (z > 0.8) for (let k = 0; k < Math.round((w - 8) / 3); k++) LIT.line(c, cam, [[x0 + 6 + k * 3, fy0 + 1], [x0 + 6 + k * 3 + 1.5, fy1 - 1]], k % 2 ? 'iv4' : 'iv2', { alpha: o.filterHi ? 1 : 0.8 });
  glass(c, cam, x0, y, w, h, 1 - 0.4 * cut);
  // end caps and ports
  rr(c, cam, x0 - 2, y - 5, w + 4, 8, 3, R('iv'), { amb: 0.26, Rw: 3 }); rr(c, cam, x0 - 2, y + h - 3, w + 4, 8, 3, R('iv'), { amb: 0.26, Rw: 3 });
  LIT.tube(c, cam, [[x, y - 10], [x, y - 3]], 10, R('iv'), { amb: 0.3 }); LIT.tube(c, cam, [[x, y + h + 2], [x, y + h + 9]], 10, R('iv'), { amb: 0.3 });
  LIT.tube(c, cam, [[x + r - 2, y + 1], [x + r + 4, y + 1]], 5, R('ox'), { amb: 0.3 }); LIT.tube(c, cam, [[x + r - 4, y + h - 1], [x + r + 2, y + h + 1]], 5, R('ox'), { amb: 0.3 });
  LIT.tube(c, cam, [[x + r - 2, y + 26], [x + r + 4, y + 26]], 6, R('wa'), { amb: 0.3 }); LIT.tube(c, cam, [[x + r - 2, y + 64], [x + r + 4, y + 64]], 6, R('wa'), { amb: 0.3 });
  LIT.tube(c, cam, [[x - r - 6, y + 40], [LY.mast.x + LY.mast.w, y + 40]], 4, R('g'), { amb: 0.26 });   // holder arm
};
// ---------- the clamp-on bubble detector (it senses, it does not remove anything) ----------
MACHINE.detector = (c, cam, T, o = {}) => {
  const { x, y } = LY.det;
  rr(c, cam, x - 9, y - 7, 18, 14, 3, R('g'), { amb: 0.24, Rw: 4 });
  const [lx, ly] = S_(cam, x + 5, y - 3), on = o.hi ?? 0;
  PIX.rect(c, Math.round(lx), Math.round(ly), Math.max(1, Math.round(cam.z * 1.5)), Math.max(1, Math.round(cam.z * 1.5)), on > 0.3 ? 'mt4' : 'mt2');
  if (on > 0) FX.glowL(c, lx, ly, 6 * cam.z * on, ['mt1', 'mt2', 'mt3'], 0.6 * on, 1.5);
  LIT.tube(c, cam, [[x - 9, y + 6], [x - 22, y + 30]], 2, R('g'), { amb: 0.2 });                   // its cable
};
// ---------- the monitor (picture content: steady traces; S18 shows it large) ----------
MACHINE.TRACES = [['FLOW', 'ab'], ['PRESSURE', 'co'], ['TEMP', 'wa'], ['OXYGEN', 'ox']];
MACHINE.screen = (c, x0, y0, w, h, T, o = {}) => {
  PIX.rect(c, x0, y0, w, h, 'n0'); PIX.rect(c, x0, y0, w, 1, 'n2');
  const rows = MACHINE.TRACES.length, rh = h / rows;
  MACHINE.TRACES.forEach(([lab, ramp], k) => {
    const yy = y0 + k * rh, mid = yy + rh * 0.6, R3 = ramp + '3', R4 = ramp + '4';
    if (o.labels && !window.NOTEXT) PIX.text(c, lab, x0 + 4, yy + 3, R4, { sc: o.sc || 1, shadow: null });
    // a steady trace: a flat line with a small, slow ripple (nonpulsatile flow, stable values)
    const xs = o.labels ? x0 + w * 0.48 : x0 + 3, xe = x0 + w - 4;
    for (let x = Math.round(xs); x < xe; x++) { const yv = mid + Math.sin((x - T * 18) * 0.21 + k) * 0.6 * (o.sc || 1) * 0.5; PIX.rect(c, x, Math.round(yv), 1, 1, R3); }
    if (k < rows - 1) PIX.rect(c, x0 + 2, Math.round(yy + rh) - 1, w - 4, 1, 'n1');
  });
};
MACHINE.monitor = (c, cam, T, o = {}) => {
  const M = LY.mon;
  LIT.block(c, cam, M.x - 3, M.y - 3, M.w + 6, M.h + 6, 6, R('g'), { front: 2, top: 4, side: 1 });
  const [ax, ay] = S_(cam, M.x, M.y), [bx, by] = S_(cam, M.x + M.w, M.y + M.h);
  if (bx - ax > 8) MACHINE.screen(c, Math.round(ax), Math.round(ay), Math.round(bx - ax), Math.round(by - ay), T, {});
  LIT.tube(c, cam, [[M.x + M.w, M.y + M.h / 2], [LY.mast.x, M.y + M.h / 2]], 5, R('g'), { amb: 0.26 });
};
// ---------- everything behind the tubes ----------
MACHINE.draw = (c, cam, T, o = {}) => {
  const B = LY.base, Ms = LY.mast, cut = o.cut || {};
  // floor shadow under the console
  const [fx, fy] = S_(cam, B.x + B.w / 2, B.y + B.h + 6); PIX.glow(c, fx, fy, 200 * cam.z, 'k', 0.6);
  LIT.block(c, cam, Ms.x, Ms.y, Ms.w, Ms.h, 10, R('g'), { front: 4, top: 6, side: 2 });
  MACHINE.monitor(c, cam, T, o);
  // the heater–cooler on the floor at the right, the gas blender and the cardioplegia module on the mast's right arm
  const HC = LY.hcu; LIT.block(c, cam, HC.x, HC.y, HC.w, HC.h, 20, R('iv'), { front: 3, top: 5, side: 1 });
  if (cam.z > 0.6) for (let k = 0; k < 6; k++) LIT.line(c, cam, [[HC.x + 8, HC.y + 14 + k * 6], [HC.x + HC.w - 8, HC.y + 14 + k * 6]], 'iv1');
  LIT.tube(c, cam, [[Ms.x + Ms.w, LY.blend.y + 8], [LY.cpg.x + 6, LY.blend.y + 8]], 4, R('g'), { amb: 0.26 });
  const Bl = LY.blend; LIT.block(c, cam, Bl.x, Bl.y, Bl.w, Bl.h, 6, R('iv'), { front: 3, top: 5, side: 1 });
  if (cam.z > 1) { LIT.tube(c, cam, [[Bl.x + 8, Bl.y + 4], [Bl.x + 8, Bl.y + Bl.h - 4]], 4, R('ox'), { amb: 0.3 }); const [kx, ky] = S_(cam, Bl.x + 20, Bl.y + 11); LIT.sphere(c, kx, ky, 3 * cam.z, R('g'), { amb: 0.3 }); }
  const Cp = LY.cpg; LIT.block(c, cam, Cp.x, Cp.y, Cp.w, Cp.h, 6, R('iv'), { front: 2, top: 4, side: 0 });
  MACHINE.reservoir(c, cam, T, { cut: cut.res, led: o.led });
  MACHINE.oxy(c, cam, T, { cut: cut.oxy, filterHi: o.filterHi });
  if (o.fibers > 0) MACHINE.bundle(c, cam, T, { a: o.fibers, sel: o.sel });
  // the base with its wheels, then the pump on top of it
  LIT.block(c, cam, B.x, B.y, B.w, B.h, B.d, R('g'), { front: 2, top: 4, side: 1 });
  if (cam.z > 0.5) for (let k = 0; k < 3; k++) LIT.line(c, cam, [[B.x + 12, B.y + 12 + k * 8], [B.x + 70, B.y + 12 + k * 8]], 'g1');
  for (const wx of [B.x + 16, B.x + B.w - 16]) { const [sx, sy] = S_(cam, wx, B.y + B.h + 4); LIT.sphere(c, sx, sy, 5 * cam.z, R('g'), { amb: 0.2 }); }
  MACHINE.pump(c, cam, T, { cut: cut.pump });
};
// things in front of the tubes: the detector clamped on the arterial line
MACHINE.front = (c, cam, T, o = {}) => { MACHINE.detector(c, cam, T, { hi: o.detHi }); };

// ---------- the fibre bundle seen up close (S09): hollow fibres (ivory membrane, a pale cyan gas core) packed in rows, blood
// (red cells) moving between them toward the outlet. sel: 0..1 one fibre picked out (the others dim). ----------
MACHINE.FIB = { y: 784, t: 1.5, gap: 2.6 };                    // the picked fibre's centre line, fibre thickness, row spacing
MACHINE.bundle = (c, cam, T, o = {}) => {
  const { x, y, r, h } = LY.oxy, x0 = x - r + 4, x1 = x + r - 4, by0 = y + 14, by1 = y + h - 34, F = MACHINE.FIB, z = cam.z, a = o.a ?? 1, sel = o.sel ?? 0;
  if (a <= 0) return;
  const [bx0, byt] = K.S(cam, x0, by0), [bx1, byb] = K.S(cam, x1, by1);
  const clip = (sx, sy) => sx >= bx0 && sx < bx1 && sy >= byt && sy < byb;
  // blood between the fibres
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(x0, by0, x1 - x0, by1 - by0); }, [bx0 - 1, byt - 1, bx1 + 1, byb + 1], ['vb1', 'vb2', 'vb2', 'vb3'], { flat: 1, amb: 0.5, dif: 0.3, edge: false, alpha: a });
  // a back layer of fibres wound at a slight angle (cross-wound mat), darker
  const rows = [];
  for (let yy = F.y - Math.ceil((F.y - by0) / F.gap) * F.gap; yy <= by1; yy += F.gap) rows.push(yy);
  for (const yy of rows) LIT.tube(c, cam, [[x0 - 6, yy + 1.3 - 3], [x1 + 6, yy + 1.3 + 3]], F.t * 0.9, ['g1', 'g2', 'iv0', 'iv1'], { amb: 0.24, dif: 0.6, clip, alpha: a });
  // red cells crossing the bundle between the fibres (blood flows from the bottom toward the top)
  if (z > 5) for (let k = 0; k < 40; k++) {
    const xx = x0 + ((k * 7.3) % (x1 - x0)), yy = by1 - ((T * 3 + k * 1.37) % (by1 - by0)), [sx, sy] = K.S(cam, xx, yy);
    if (!clip(sx, sy)) continue;
    LIT.sphere(c, sx, sy, Math.max(1.2, 0.36 * z), ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { amb: 0.3, alpha: a });
  }
  // the front layer: straight fibres, each a hollow tube (membrane wall, gas core)
  for (const yy of rows) {
    const isSel = Math.abs(yy - F.y) < 0.01, dim = isSel ? 0 : sel;
    const ramp = isSel && sel > 0 ? ['iv1', 'iv2', 'iv3', 'iv4', 'iv5', 'w'] : ['iv0', 'iv1', 'iv2', 'iv3', 'iv4', 'iv5'];
    LIT.tube(c, cam, [[x0 - 4, yy], [x1 + 4, yy]], F.t, ramp, { amb: 0.24, dif: 0.8, clip, alpha: a, bias: -0.25 * dim });
    if (z > 6) LIT.line(c, cam, [[x0, yy + 0.05], [x1, yy + 0.05]], isSel ? 'ox4' : 'ox2', { alpha: a * (1 - 0.6 * dim) });
  }
  if (sel > 0) K.dith(c, bx0, byt, bx1 - bx0, byb - byt, 'n0', 0.0);
};
MACHINE.init = () => {};
})();
