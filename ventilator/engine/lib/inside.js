// INSIDE — the ventilator cut open: one flat cross-section of a representative ICU ventilator, in the same orientation as
// its casing in the bedside view (the inspiratory outlet at the lower left, the expiratory inlet at the lower right, the
// gas inlets on the right wall). Interior units: the casing is 480 × 640.
//   air  : wall hose → inlet → filter → pressure regulator → proportional valve (air) ┐
//   O2   : wall hose → inlet → filter → pressure regulator → proportional valve (O2)  ┴→ mixing chamber → O2 sensor →
//          inspiratory flow-control valve (proportional solenoid) → flow sensor → pressure tap → inspiratory outlet
//   expiration: expiratory inlet → expiratory flow sensor → expiratory valve (diaphragm on a seat, held by an actuator:
//          it sets PEEP) → exhaust
//   control: one circuit board — microprocessor, breath timer, analogue-to-digital converter, valve drivers — with copper
//          traces to every sensor and every valve. It is a programmed controller with feedback, nothing more.
(() => {
const { W, H, P } = PIX;
const INSIDE = window.INSIDE = { NAME: 'INSIDE' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
const path = BREATH.path;
const rr = (c, cam, x0, y0, x1, y1, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fill(); }, LIT.wbox(cam, [x0, y0, x1, y1]), typeof ramp === 'string' ? R(ramp) : ramp, o);
const line = (c, cam, pts, col, o) => LIT.line(c, cam, pts, col, o);
const tube = (c, cam, pts, w, ramp, o = {}) => LIT.tube(c, cam, pts, w, typeof ramp === 'string' ? R(ramp) : ramp, o);
INSIDE.rr = rr;
// ---------- layout ----------
const LY = INSIDE.LY = {
  air: { y: 70, filt: 446, reg: 404, valve: 340 }, o2: { y: 150, filt: 446, reg: 404, valve: 340 },
  mixer: [222, 110], o2s: [160, 110], psol: [100, 210], fsens: [100, 296], ptap: [100, 366], outlet: [100, 604],
  inlet: [380, 604], efs: [380, 522], ev: [380, 432], exhaust: [480, 432],
  board: { x0: 150, y0: 236, x1: 330, y1: 560 }, cpu: [240, 360], timer: [204, 288], adc: [288, 300], drv: [288, 470], mem: [198, 470], vol: [244, 520],
};
// gas paths (direction of flow)
const RT = INSIDE.R = {};
RT.air = path([[560, 70], [480, 70], [446, 70], [404, 70], [340, 70], [292, 70], [262, 96], [234, 108], [222, 110]], 1.5);
RT.o2 = path([[560, 150], [480, 150], [446, 150], [404, 150], [340, 150], [292, 150], [262, 124], [234, 112], [222, 110]], 1.5);
RT.blend = path([[222, 110], [190, 110], [160, 110], [118, 110], [104, 120], [100, 140], [100, 210], [100, 296], [100, 366], [100, 480], [100, 604], [100, 650]], 1.5);
RT.exp = path([[380, 650], [380, 604], [380, 522], [380, 450], [380, 432], [404, 432], [440, 432], [480, 432], [560, 432]], 1.5);
// copper traces (signals run along them)
RT.tO2 = path([[160, 124], [160, 196], [176, 228], [196, 252], [214, 300], [226, 342]], 1);
RT.tAirV = path([[340, 96], [318, 108], [312, 140], [312, 220], [300, 252], [262, 340]], 1);
RT.tO2V = path([[340, 176], [326, 192], [318, 226], [306, 256], [262, 346]], 1);
RT.tPsol = path([[226, 352], [196, 330], [168, 252], [150, 216], [138, 210]], 1);          // processor → inspiratory valve actuator
RT.tFlow = path([[134, 296], [150, 300], [176, 324], [222, 356]], 1);                      // flow sensor → processor
RT.tPres = path([[134, 366], [150, 368], [190, 366], [218, 362]], 1);                      // pressure sensor → processor
RT.tExpV = path([[258, 364], [296, 378], [328, 410], [354, 418], [362, 418]], 1);          // processor → expiratory valve actuator
RT.tExpF = path([[356, 522], [330, 516], [296, 480], [258, 378]], 1);                      // expiratory flow sensor → processor
RT.tTimer = path([[214, 296], [222, 320], [232, 342]], 1);                                 // timer → processor
RT.tVol = path([[240, 382], [242, 430], [244, 508]], 1);                                   // processor → volume indicator
RT.tDisp = path([[240, 338], [240, 290], [246, 250], [246, 236], [246, 0]], 1);            // processor → screen (up, out of the casing)
INSIDE.WIDTH = { air: 9, o2: 9, blend: 10, exp: 10 };
// ---------- components ----------
const filter = (c, cam, x, y) => { rr(c, cam, x - 9, y - 11, x + 9, y + 11, 2, R('g'), { bias: 0.1 }); for (let k = -6; k <= 6; k += 3) line(c, cam, [[x + k, y - 7], [x + k, y + 7]], 'g3'); };
// a pressure regulator: a round body with a diaphragm and a spring; open = how far the diaphragm lets gas past
const regulator = (c, cam, x, y, T, open = 0.6) => {
  rr(c, cam, x - 13, y - 16, x + 13, y + 12, 6, R('g'), { bias: 0.12 });
  line(c, cam, [[x - 10, y - 3 + 2 * open], [x + 10, y - 3 + 2 * open]], 'g8');
  const pts = []; for (let k = 0; k <= 8; k++) pts.push([x + (k % 2 ? 4 : -4), y - 14 + k * 1.3]); line(c, cam, pts, 'g6');
};
// a proportional solenoid valve: a body with an orifice in the line, a plunger lifted by a copper coil on the side marked
// by `side` (+1 below the line, −1 above). open: 0..1
INSIDE.valve = (c, cam, x, y, open, side = 1, o = {}) => {
  const z = cam.z, s = side;
  rr(c, cam, x - 14, y - 10, x + 14, y + 10, 3, R('g'), { bias: 0.15 });                                 // body
  rr(c, cam, x - 3, y - 6, x + 3, y + 6, 1, ['n0', 'n1', 'n2'], { edge: false });                       // the orifice (seat)
  const lift = 9 * clamp(open);
  rr(c, cam, x - 5, y + s * (4 - lift) - (s > 0 ? 0 : 6), x + 5, y + s * (4 - lift) + (s > 0 ? 6 : 0), 1, R('g'), { bias: 0.35 });   // poppet
  rr(c, cam, x - 3, y + s * 10, x + 3, y + s * 26, 1, R('g'), { bias: 0.25 });                          // plunger
  rr(c, cam, x - 11, y + s * 13, x + 11, y + s * 30, 2, R('hm'), { bias: -0.05 });                       // coil (copper)
  if (z > 1) for (let k = 0; k < 5; k++) { const yy = y + s * (15 + k * 3); line(c, cam, [[x - 10, yy], [x + 10, yy]], 'hm1'); }
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 15, y - 12, x + 15, y + s * 32], o.hi);
};
// the inspiratory flow-control valve: a larger proportional solenoid with its actuator to the right of the line
INSIDE.psol = (c, cam, T, open, o = {}) => {
  const [x, y] = LY.psol, z = cam.z, lift = 10 * clamp(open);
  rr(c, cam, x - 16, y - 18, x + 16, y + 18, 4, R('g'), { bias: 0.15 });
  rr(c, cam, x - 9, y - 4, x + 9, y + 4, 1, ['n0', 'n1', 'n2'], { edge: false });                       // the seat
  rr(c, cam, x - 8 + lift, y - 12, x + 2 + lift, y + 12, 2, R('g'), { bias: 0.4 });                      // the poppet slides right to open
  rr(c, cam, x + 16, y - 4, x + 34, y + 4, 1, R('g'), { bias: 0.25 });                                   // the actuator rod
  rr(c, cam, x + 22, y - 16, x + 46, y + 16, 3, R('hm'), { bias: -0.05 });                               // the voice coil / solenoid
  if (z > 0.9) for (let k = 0; k < 6; k++) line(c, cam, [[x + 25 + k * 3.6, y - 14], [x + 25 + k * 3.6, y + 14]], 'hm1');
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 18, y - 20, x + 48, y + 20], o.hi);
};
// the flow sensor: a fine screen across the line with a pressure tap on each side, read by a small differential sensor
INSIDE.flowSensor = (c, cam, T, o = {}) => {
  const [x, y] = LY.fsens;
  rr(c, cam, x - 9, y - 10, x + 9, y + 10, 2, R('g'), { bias: 0.08 });
  for (let k = -7; k <= 7; k += 2) line(c, cam, [[x + k, y - 1], [x + k + 1, y + 1]], 'g7');            // the mesh
  tube(c, cam, [[x + 9, y - 7], [x + 26, y - 7]], 2, R('g'), {}); tube(c, cam, [[x + 9, y + 7], [x + 26, y + 7]], 2, R('g'), {});
  rr(c, cam, x + 24, y - 11, x + 36, y + 11, 2, ['k', 'n1', 'g2', 'g3'], {});                            // the sensor chip
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 11, y - 12, x + 38, y + 12], o.hi);
};
INSIDE.presSensor = (c, cam, T, o = {}) => {
  const [x, y] = LY.ptap;
  tube(c, cam, [[x + 5, y], [x + 24, y]], 2, R('g'), {});
  rr(c, cam, x + 22, y - 9, x + 36, y + 9, 3, ['k', 'n1', 'g2', 'g3'], {});
  LIT.sphere(c, ...K.S(cam, x + 29, y), Math.max(1.5, 3 * cam.z), R('g'), { bias: 0.2 });              // the membrane
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 4, y - 11, x + 38, y + 11], o.hi);
};
INSIDE.o2Sensor = (c, cam, T, o = {}) => {
  const [x, y] = LY.o2s;
  rr(c, cam, x - 8, y + 6, x + 8, y + 26, 3, R('g'), { bias: 0.05 });                                    // the cell below the line
  rr(c, cam, x - 6, y + 4, x + 6, y + 8, 1, R('iv'), {});                                                // its membrane facing the gas
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 10, y - 8, x + 10, y + 28], o.hi);
};
// the expiratory valve: gas rises from below into a round chamber; a diaphragm lies on a seat; the actuator above presses
// it down. close = how hard it presses (1 during inspiration: closed; a small, steady value at end-expiration: PEEP)
INSIDE.expValve = (c, cam, T, close, o = {}) => {
  const [x, y] = LY.ev, z = cam.z, lift = 6 * (1 - clamp(close));
  rr(c, cam, x - 26, y - 22, x + 26, y + 18, 8, R('g'), { bias: 0.12 });                                // chamber housing
  rr(c, cam, x - 20, y - 14, x + 20, y + 12, 6, ['n0', 'n1', 'n2'], { edge: false });                    // inside
  rr(c, cam, x - 4, y - 4, x + 4, y + 18, 1, R('g'), { bias: 0.3 });                                     // the seat (the inlet tube's mouth)
  line(c, cam, [[x - 19, y - 6 - lift * 0.4], [x - 8, y - 5 - lift], [x + 8, y - 5 - lift], [x + 19, y - 6 - lift * 0.4]], 'iv5');   // diaphragm
  rr(c, cam, x - 3, y - 34, x + 3, y - 6 - lift, 1, R('g'), { bias: 0.3 });                             // the actuator's rod
  rr(c, cam, x - 14, y - 52, x + 14, y - 30, 3, R('hm'), { bias: -0.05 });                              // the actuator
  if (z > 0.9) for (let k = 0; k < 5; k++) line(c, cam, [[x - 12 + k * 6, y - 50], [x - 12 + k * 6, y - 32]], 'hm1');
  if (o.hi > 0) MACHINEMARK(c, cam, [x - 28, y - 54, x + 28, y + 20], o.hi);
};
// a highlight: four mint corner brackets (screen space)
const MACHINEMARK = INSIDE.mark = (c, cam, b, a = 1) => {
  if (a <= 0.02) return;
  const [ax, ay] = K.S(cam, b[0], b[1]), [bx, by] = K.S(cam, b[2], b[3]), g = Math.round(2 + 3 * (1 - a));
  const x0 = Math.round(ax) - g, y0 = Math.round(ay) - g, x1 = Math.round(bx) + g, y1 = Math.round(by) + g, L = Math.max(3, Math.min(8, Math.round((x1 - x0) * 0.25)));
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { PIX.rect(c, sx > 0 ? x : x - L + 1, y, L, 1, 'mt4'); PIX.rect(c, x, sy > 0 ? y : y - L + 1, 1, L, 'mt4'); }
};
// ---------- the board ----------
const chip = (c, cam, x, y, w, h, o = {}) => {
  rr(c, cam, x - w / 2, y - h / 2, x + w / 2, y + h / 2, 1, ['k', 'n0', 'g1', 'g2'], {});
  if (cam.z > 0.8) { const n = Math.max(2, Math.round(w / 5)); for (let k = 0; k < n; k++) { const px = x - w / 2 + 2 + k * (w - 4) / (n - 1); for (const s of [-1, 1]) line(c, cam, [[px, y + s * h / 2], [px, y + s * (h / 2 + 2)]], 'g6'); } }
};
INSIDE.board = (c, cam, T, o = {}) => {
  const B = LY.board, z = cam.z;
  rr(c, cam, B.x0, B.y0, B.x1, B.y1, 4, R('pc'), {});
  if (z > 0.7) for (let k = 0; k < 9; k++) line(c, cam, [[B.x0 + 8, B.y0 + 30 + k * 32], [B.x0 + 40, B.y0 + 30 + k * 32]], 'pc1');
  // traces first (copper), then chips on top
  for (const k of ['tO2', 'tAirV', 'tO2V', 'tPsol', 'tFlow', 'tPres', 'tExpV', 'tExpF', 'tTimer', 'tVol', 'tDisp']) line(c, cam, RT[k], (o.trace && o.trace[k]) ? 'hm5' : 'hm2');
  const [cx, cy] = LY.cpu; chip(c, cam, cx, cy, 44, 44);
  if (z > 1.4) { rr(c, cam, cx - 14, cy - 14, cx + 14, cy + 14, 1, ['n1', 'n2', 'g2', 'g3'], {}); }
  chip(c, cam, LY.adc[0], LY.adc[1], 22, 14); chip(c, cam, LY.drv[0], LY.drv[1], 24, 14); chip(c, cam, LY.mem[0], LY.mem[1], 22, 12);
  // the breath timer: a crystal and a counter, with its progress ring (a circle of small lights that fills, then fires)
  const [tx, ty] = LY.timer; rr(c, cam, tx - 6, ty - 4, tx + 6, ty + 4, 2, R('g'), { bias: 0.3 }); chip(c, cam, tx + 20, ty, 14, 10);
  if (o.timer != null) {
    const q = clamp(o.timer), n = 20, r = 13;
    for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k / n * TAU, [px, py] = K.S(cam, tx + Math.cos(a) * r, ty + Math.sin(a) * r), s = Math.max(1, Math.round(z * 1.4)); PIX.rect(c, Math.round(px - s / 2), Math.round(py - s / 2), s, s, k / n < q ? (q >= 1 ? 'w' : 'ys4') : 'pc2'); }
  }
  // the integrated-volume indicator: a bar of lights that fills as the measured flow adds up; a mark at the target volume
  const [vx, vy] = LY.vol, n = 12, q = clamp(o.vol ?? 0);
  for (let k = 0; k < n; k++) { const on = k / n < q - 1e-6; rr(c, cam, vx - 30 + k * 5, vy - 5, vx - 27 + k * 5, vy + 5, 0.5, on ? (q >= 1 ? ['w', 'w', 'w', 'w'] : ['cy2', 'cy3', 'cy4', 'cy5']) : ['k', 'n1', 'pc1', 'pc2'], { edge: false }); }
  line(c, cam, [[vx + 30.5, vy - 8], [vx + 30.5, vy + 8]], 'ys4');
  for (const [x, y] of [[B.x0 + 6, B.y0 + 6], [B.x1 - 6, B.y0 + 6], [B.x0 + 6, B.y1 - 6], [B.x1 - 6, B.y1 - 6]]) LIT.sphere(c, ...K.S(cam, x, y), Math.max(1, 2 * z), R('g'), { bias: 0.2 });
};
// ---------- the whole interior, back to front ----------
// o: { airV, o2V (0..1 openings), psol (0..1), expV (closing force 0..1), flowAir, flowO2, flowBlend, flowExp (0..1),
//      signals: [[routeKey, q]], timer, vol, hi: {key: a}, trace: {key: true}, casing (0..1: the opaque casing over it) }
INSIDE.scene = (c, cam, T, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  // the casing walls (a thick light-grey section line) and the dark interior
  rr(c, cam, -8, -8, 488, 648, 14, R('vt'), { bias: 0.02 });
  rr(c, cam, 6, 6, 474, 634, 8, ['n0', 'n1', 'n1', 'n2'], { edge: false });
  // the hoses outside the right wall
  tube(c, cam, [[480, 70], [560, 70]], 9, ['g3', 'g4', 'g5', 'g6'], {}); tube(c, cam, [[480, 150], [560, 150]], 9, ['g3', 'g4', 'g5', 'g6'], {});
  INSIDE.board(c, cam, T, o);
  // gas channels: steel walls, dark lumen
  for (const [k, w] of [['air', 9], ['o2', 9], ['blend', 10], ['exp', 10]]) { tube(c, cam, RT[k], w, R('g'), { bias: 0.05 }); tube(c, cam, RT[k], w * 0.55, ['k', 'n0', 'n1'], { edge: false }); }
  rr(c, cam, LY.mixer[0] - 12, LY.mixer[1] - 12, LY.mixer[0] + 12, LY.mixer[1] + 12, 6, R('g'), { bias: 0.1 }); rr(c, cam, LY.mixer[0] - 8, LY.mixer[1] - 8, LY.mixer[0] + 8, LY.mixer[1] + 8, 5, ['k', 'n0', 'n1'], { edge: false });
  // particles: air (21 % O2, the rest mostly N2), oxygen (pure), the blend (FiO2 40 %), expired gas (amber trails)
  const fa = o.flowAir ?? 0, fo = o.flowO2 ?? 0, fb = o.flowBlend ?? 0, fe = o.flowExp ?? 0;
  if (fa > 0) BREATH.stream(c, cam, RT.air, T, { n: 160, speed: 70 * fa, mix: 0.21, seed: 3, spread: 1.6, w: U.clamp(Math.round(cam.z * 1.2), 1, 3), a: Math.min(1, fa * 2) });
  if (fo > 0) BREATH.stream(c, cam, RT.o2, T, { n: 160, speed: 70 * fo, mix: 1.0, seed: 4, spread: 1.6, w: U.clamp(Math.round(cam.z * 1.2), 1, 3), a: Math.min(1, fo * 2) });
  if (fb > 0) BREATH.stream(c, cam, RT.blend, T, { n: 320, speed: 110 * fb, mix: 0.4, seed: 5, spread: 1.8, w: U.clamp(Math.round(cam.z * 1.2), 1, 3), a: Math.min(1, fb * 2) });
  if (fe > 0) BREATH.stream(c, cam, RT.exp, T, { n: 120, speed: 90 * fe, seed: 6, spread: 1.8, len: 3, w: U.clamp(Math.round(cam.z * 1.0), 1, 3), ramp: ['am3', 'am4', 'am5'], a: Math.min(1, fe * 2) });
  // components
  for (const g of ['air', 'o2']) { const L = LY[g]; filter(c, cam, L.filt, L.y); regulator(c, cam, L.reg, L.y, T, 0.6); INSIDE.valve(c, cam, L.valve, L.y, g === 'air' ? (o.airV ?? 0.5) : (o.o2V ?? 0.3), 1, { hi: o.hi && o.hi[g + 'V'] }); }
  INSIDE.o2Sensor(c, cam, T, { hi: o.hi && o.hi.o2s });
  INSIDE.psol(c, cam, T, o.psol ?? 0, { hi: o.hi && o.hi.psol });
  INSIDE.flowSensor(c, cam, T, { hi: o.hi && o.hi.fsens });
  INSIDE.presSensor(c, cam, T, { hi: o.hi && o.hi.ptap });
  INSIDE.expValve(c, cam, T, o.expV ?? 1, { hi: o.hi && o.hi.ev });
  { const [x, y] = LY.efs; rr(c, cam, x - 9, y - 9, x + 9, y + 9, 2, R('g'), { bias: 0.08 }); for (let k = -7; k <= 7; k += 2) line(c, cam, [[x - 1, y + k], [x + 1, y + k + 1]], 'g7'); rr(c, cam, x - 34, y - 8, x - 22, y + 8, 2, ['k', 'n1', 'g2', 'g3'], {}); tube(c, cam, [[x - 22, y], [x - 9, y]], 2, R('g'), {}); }
  // the two ports through the bottom wall and the exhaust through the right wall
  for (const [x, y] of [LY.outlet, LY.inlet]) rr(c, cam, x - 12, y - 8, x + 12, y + 30, 3, R('g'), { bias: 0.2 });
  rr(c, cam, 468, LY.ev[1] - 9, 496, LY.ev[1] + 9, 3, R('g'), { bias: 0.2 });
  // signals on the traces
  for (const [k, q, oo] of (o.signals || [])) BREATH.signal(c, cam, RT[k], q, oo || {});
  // the opaque casing front (fades away to reveal the cross-section)
  if (o.casing > 0) { rr(c, cam, -8, -8, 488, 648, 14, R('vt'), { alpha: o.casing, bias: 0.05 }); }
};
INSIDE.init = () => {};
})();
