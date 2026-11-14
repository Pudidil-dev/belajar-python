// ACT 8 — the phone comes alive, and we end where we began (S29–S30)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// ================= S29 · assembly → power button → power-management IC → processor boots =================
const PH = { x: 50, y: 64, w: 170, h: 366, r: 24 };
const BOARD = { x: 62, y: 80, w: 146, h: 152 }, BATT = { x: 66, y: 248, w: 138, h: 170 };
const SOC = [135, 150], PMIC = [84, 206], BCONN = [92, 238], DCONN = [186, 92];
const BTN_Y = 150;
function phoneShell(c, t) {
  PIX.flat(c, PIX.rectPath(PH.x, PH.y, PH.w, PH.h, PH.r), 'g3', 'g1', 'g5', [4, 4], [2, 2]);
  PIX.fill(c, PIX.rectPath(PH.x + 6, PH.y + 6, PH.w - 12, PH.h - 12, PH.r - 6), 'k');
  for (let y = PH.y + 30; y < PH.y + PH.h - 30; y += 9) PIX.rect(c, PH.x + 8, y, 2, 3, 'g0');            // antenna lines / frame detail
  PIX.rect(c, PH.x - 3, 120, 3, 24, 'g3'); PIX.rect(c, PH.x - 3, 150, 3, 24, 'g3');                       // volume keys
}
function boardIn(c, t, s, glowPM, glowSoC) {
  const y = lerp(-220, 0, MO.k75(s));
  if (s <= 0) return;
  c.save(); c.translate(0, y);
  PIX.flat(c, PIX.rectPath(BOARD.x, BOARD.y, BOARD.w, BOARD.h, 8), 'n2', 'n1', 'n3', [3, 3], [1, 1]);
  for (let n = 0; n < 26; n++) PIX.rect(c, BOARD.x + 6 + h(n, 1) * 110, BOARD.y + 8 + h(n, 2) * 136, 14 + h(n, 3) * 40, 1, 't2', 0.55);
  for (let n = 0; n < 30; n++) PIX.rect(c, Math.round(BOARD.x + 4 + h(n, 4) * 134), Math.round(BOARD.y + 6 + h(n, 5) * 138), 3 + (n % 3) * 2, 2 + (n % 2) * 2, n % 5 ? 'g2' : 's1');
  K.panel(c, BOARD.x + 6, BOARD.y + 8, 40, 30, 'g3', 'g1', 'g4'); K.panel(c, 160, 170, 42, 48, 'g3', 'g1', 'g4');        // shield cans
  PIX.flat(c, PIX.rectPath(SOC[0] - 19, SOC[1] - 19, 38, 38, 3), 'g0', 'k', 'g2', [3, 3]);                                 // processor package
  if (glowSoC > 0) { PIX.glow(c, SOC[0], SOC[1], 40, 'c1', 0.8 * glowSoC); PIX.rect(c, SOC[0] - 15, SOC[1] - 15, 30, 30, 'c2', 0.35 * glowSoC); }
  PIX.flat(c, PIX.rectPath(PMIC[0] - 9, PMIC[1] - 9, 18, 18, 2), 'g1', 'k', 'g2', [2, 2]);
  if (glowPM > 0) PIX.glow(c, PMIC[0], PMIC[1], 22, 'y0', 0.8 * glowPM);
  PIX.rect(c, BCONN[0] - 10, BCONN[1] - 8, 20, 6, 'y0'); PIX.rect(c, DCONN[0] - 12, DCONN[1] - 4, 24, 6, 'y0');
  c.restore();
}
function batteryIn(c, k, s) {
  if (s <= 0) return;
  const y = lerp(260, 0, MO.k75(s));
  c.save(); c.translate(0, y);
  PIX.flat(c, PIX.rectPath(BATT.x, BATT.y, BATT.w, BATT.h, 8), 'g1', 'g0', 'g2', [4, 4], [1, 1]);
  PIX.rect(c, BATT.x + 10, BATT.y + 14, BATT.w - 20, 2, 'g2');
  c.restore();
  const [sx, sy] = PIX.toScreen(k, 135, BATT.y + 80 + y);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); PIX.text(c, 'Li-ion', sx, sy, 'g3', { align: 'center', shadow: null }); c.restore(); PIX.cam(c, k);
}
function flexCable(c, s) {
  if (s <= 0) return;
  const y = lerp(BATT.y + 10, BCONN[1] - 4, MO.k75(s));
  PIX.rect(c, BCONN[0] - 8, Math.min(y, BATT.y + 10), 16, Math.abs(BATT.y + 10 - y) + 4, 'u1'); PIX.rect(c, BCONN[0] - 8, y, 16, 3, 'u2');
}
function glass(c, s) {
  if (s <= 0) return;
  const sc = lerp(1.25, 1, MO.k75(s)), a = 0.5 * s;
  c.save(); c.translate(135, 247); c.scale(sc, sc); c.translate(-135, -247);
  PIX.fill(c, PIX.rectPath(PH.x + 5, PH.y + 5, PH.w - 10, PH.h - 10, PH.r - 5), 'k', a);
  c.save(); c.clip(PIX.rectPath(PH.x + 5, PH.y + 5, PH.w - 10, PH.h - 10, PH.r - 5)); c.translate(150, 150); c.rotate(-0.6); PIX.rect(c, -200, -20, 400, 10, 'w', 0.12 * s); PIX.rect(c, -200, -2, 400, 3, 'w', 0.1 * s); c.restore();
  c.save(); c.strokeStyle = P.g1; c.globalAlpha = s; c.lineWidth = 2; c.stroke(PIX.rectPath(PH.x + 5, PH.y + 5, PH.w - 10, PH.h - 10, PH.r - 5)); c.restore();
  PIX.circ(c, 135, PH.y + 16, 4, 'g0', s);
  c.restore();
}
function finger(c, t) {                                             // index finger from the right, presses the side button
  const enter = MO.k75(clamp((t - 5.0) / 0.6)), press = Math.max(0, Math.sin(clamp((t - 5.9) / 0.5) * Math.PI)) * 3;
  if (enter <= 0) return;
  const fx = lerp(330, PH.x + PH.w + 2, enter) - press, fy = BTN_Y + 14;
  PIX.flat(c, PIX.rectPath(fx, fy - 13, 140, 26, 13), 's3', 's1', 's4', [0, 5], [0, 2]);
  PIX.flat(c, PIX.rectPath(fx + 16, fy - 26, 120, 16, 8), 's2', 's1', 's3', [0, 4]);                     // the next finger, curled behind
  PIX.flat(c, PIX.rectPath(fx + 3, fy - 10, 15, 12, 5), 's4', 's3', 'w', [1, 2]);                         // nail
  for (const dx of [34, 66]) PIX.rect(c, fx + dx, fy - 8, 1, 14, 's1');
}
// power path: battery → connector → PMIC → processor (and later → display)
const P1 = [[135, 330], [BCONN[0], 300], [BCONN[0], BCONN[1]], [PMIC[0], PMIC[1] + 9]];
const P2 = [[PMIC[0] + 9, PMIC[1]], [112, 206], [SOC[0] - 19, SOC[1] + 12]];
const P3 = [[SOC[0] + 19, SOC[1] - 12], [DCONN[0], 120], [DCONN[0], DCONN[1]]];
// die floorplan for the boot sequence (screen space)
const D0 = [35, 120], DS = 200;
const BLOCKS = [
  ['ROM', 0.03, 0.73, 0.15, 0.15, 'g1', 'y1', 10.0], ['L0', 0.03, 0.36, 0.1, 0.1, 'n2', 'c2', 10.5], ['L1', 0.14, 0.36, 0.1, 0.1, 'n2', 'c2', 10.625], ['L2', 0.25, 0.36, 0.1, 0.1, 'n2', 'c2', 10.75],
  ['L3', 0.03, 0.47, 0.1, 0.1, 'n2', 'c2', 10.875], ['L4', 0.14, 0.47, 0.1, 0.1, 'n2', 'c2', 11.0], ['L5', 0.25, 0.47, 0.1, 0.1, 'n2', 'c2', 11.125],
  ['B0', 0.03, 0.05, 0.22, 0.28, 'n3', 'c1', 11.25], ['B1', 0.27, 0.05, 0.22, 0.28, 'n3', 'c1', 11.5], ['SRAM', 0.37, 0.36, 0.2, 0.32, 't0', 't2', 11.5],
  ['MEM', 0.2, 0.73, 0.35, 0.15, 'r1', 'o1', 11.75], ['GPU', 0.52, 0.05, 0.45, 0.4, 'p0', 'p3', 12.0], ['NPU', 0.6, 0.48, 0.37, 0.22, 'm0', 'm1', 12.25], ['DISP', 0.58, 0.73, 0.39, 0.15, 'b0', 'b2', 12.25],
];
function dieView(c, t, a) {
  c.save(); c.globalAlpha = a;
  PIX.rect(c, 0, 0, W, H, 'n0'); for (let x = 0; x < W; x += 12) PIX.rect(c, x, 0, 1, H, 'n1');
  PIX.flat(c, PIX.rectPath(D0[0] - 14, D0[1] - 14, DS + 28, DS + 28, 4), 't1', 't0', 't2', [4, 4]);             // package substrate
  PIX.flat(c, PIX.rectPath(D0[0], D0[1], DS, DS, 2), 'g2', 'g1', 'g4', [3, 3]);                                  // the die
  for (let p = 0; p < 24; p++) { const q = p / 24 * DS; PIX.rect(c, D0[0] + q + 2, D0[1] + 2, 3, 3, 'y0'); PIX.rect(c, D0[0] + q + 2, D0[1] + DS - 5, 3, 3, 'y0'); PIX.rect(c, D0[0] + 2, D0[1] + q + 2, 3, 3, 'y0'); PIX.rect(c, D0[0] + DS - 5, D0[1] + q + 2, 3, 3, 'y0'); }
  for (const [name, bx, by, bw, bh, off, on, t0] of BLOCKS) {
    const x = D0[0] + 8 + bx * (DS - 16), y = D0[1] + 8 + by * (DS - 16), w = bw * (DS - 16), hh = bh * (DS - 16), lit = t >= t0;
    PIX.flat(c, PIX.rectPath(x, y, w, hh, 1), lit ? on : off, lit ? off : 'k', lit ? 'w' : null, [2, 2], [1, 1]);
    if (lit) {
      PIX.glow(c, x + w / 2, y + hh / 2, Math.max(w, hh) * 0.7, on, 0.5 * clamp(1 - (t - t0) / 0.6) + 0.15);
      const st = K.step(t, 15);                                          // transistors switching inside: flickering activity
      for (let n = 0; n < (w * hh) / 40; n++) if (h(n + Math.floor(st * 15), name.length * 7) > 0.55) PIX.rect(c, Math.round(x + 2 + h(n, 1) * (w - 4)), Math.round(y + 2 + h(n, 2) * (hh - 4)), 1, 1, 'w');
    }
    if (name === 'SRAM') for (let gy = y + 3; gy < y + hh - 2; gy += 4) for (let gx = x + 3; gx < x + w - 2; gx += 4) PIX.rect(c, gx, gy, 2, 2, lit ? 'c3' : 't1');
  }
  if (t > 9.9) {                                                      // clock: a square wave marching along the bottom
    const yb = D0[1] + DS + 26; for (let x = 0; x < W; x++) { const hi = Math.floor((x + t * 160) / 8) % 2 === 0; PIX.rect(c, x, hi ? yb : yb + 8, 1, 1, 'c2'); if (Math.floor((x + t * 160) % 8) === 0) PIX.rect(c, x, yb, 1, 9, 'c2'); }
    PIX.text(c, 'CLOCK', 8, yb - 12, 'c2');
  }
  if (t > 11.75) K.flow(c, [[D0[0] + 0.37 * DS, D0[1] + 0.73 * DS], [D0[0] + 0.37 * DS, 20]], t, { gap: 10, speed: 160, col: 'o1', size: 2 });   // to memory (stacked on top)
  if (t > 12.25) for (const xo of [0.66, 0.74, 0.82, 0.9]) K.flow(c, [[D0[0] + xo * DS, D0[1] + 0.8 * DS], [D0[0] + xo * DS, -10]], t + xo, { gap: 9, speed: 220, col: 'c3', size: 2 });   // pixels to the display
  c.restore();
}
SC.s29_phone = {
  draw(c, lt) {
    const b = clamp((lt - 0.1) / 0.9), bt = clamp((lt - 1.0) / 0.9), fx = clamp((lt - 2.0) / 0.3), gl = clamp((lt - 2.8) / 0.8);
    const pm = clamp((lt - 6.5) / 0.3) * (1 - 0.4 * clamp((lt - 8) / 1)), soc = clamp((lt - 7.3) / 0.4);
    // camera: whole phone → fast push to the button → back out for the power path → push into the processor
    const p1 = MO.cubicInOut(clamp((lt - 5.7) / 0.28)), back = K.inout(lt, 6.4, 7.1), dive = K.inout(lt, 8.9, 9.9);
    let k = { x: 135, y: 247, z: 1.12 };
    k = { x: lerp(k.x, 206, p1), y: lerp(k.y, BTN_Y + 14, p1), z: CAM.zlerp(k.z, 2.3, p1) };
    k = { x: lerp(k.x, 135, back), y: lerp(k.y, 230, back), z: CAM.zlerp(k.z, 1.2, back) };
    k = { x: lerp(k.x, SOC[0], dive), y: lerp(k.y, SOC[1], dive), z: CAM.zlerp(k.z, 7, dive) };
    PIX.vgrad(c, 0, 0, W, H, [[0, 'n1'], [1, 'n0']]);
    PIX.cam(c, k);
    for (let x = -100; x < 400; x += 20) PIX.rect(c, x, -100, 1, 700, 'n2', 0.6);
    phoneShell(c, lt);
    boardIn(c, lt, b, pm, soc);
    batteryIn(c, k, bt);
    flexCable(c, fx);
    if (fx >= 1 && lt < 2.6) PIX.glow(c, BCONN[0], BCONN[1], 16, 'w', 0.8 * (1 - (lt - 2.3) / 0.3));
    // power flowing once the button is pressed
    if (lt > 6.1) K.flow(c, P1, lt, { gap: 9, speed: 150, col: 'c3', size: 2 });
    if (lt > 6.8) K.flow(c, P2, lt, { gap: 8, speed: 150, col: 'c3', size: 2 });
    if (lt > 7.6) K.flow(c, P3, lt, { gap: 8, speed: 170, col: 'c2', size: 2 });
    glass(c, gl);
    PIX.rect(c, PH.x + PH.w, BTN_Y - Math.max(0, Math.sin(clamp((lt - 5.9) / 0.5) * Math.PI)) * 0, 4, 28, lt > 5.9 && lt < 6.4 ? 'g4' : 'g3');   // side button
    finger(c, lt);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const da = clamp((k.z - 3) / 2.5); if (da > 0) dieView(c, lt, da);
    const S = (x, y) => PIX.toScreen(k, x, y);
    const L = [['MOTHERBOARD', 70, 100, 14, 30, 0.6, 2.0], ['BATTERY', 100, 330, 14, 450, 1.4, 2.9], ['CONNECTOR', BCONN[0], BCONN[1], 120, 452, 2.2, 3.4], ['DISPLAY', 200, 380, 184, 452, 3.2, 4.6]];
    for (const [txt, ax, ay, tx, ty, t0, t1] of L) { const [sx, sy] = S(ax, ay); PIX.label(c, { ax: sx, ay: sy, tx, ty, text: txt, t0, t1, col: 'g5', lineCol: 'g4' }, lt); }
    const [bx, by] = S(PH.x + PH.w + 2, BTN_Y + 14); PIX.label(c, { ax: bx, ay: by - 16, tx: 40, ty: 60, text: 'POWER BUTTON', t0: 5.5, t1: 6.5, col: 'w' }, lt);
    const pmi = S(PMIC[0], PMIC[1]); PIX.label(c, { ax: pmi[0], ay: pmi[1], tx: 12, ty: 40, text: 'POWER-MANAGEMENT IC', t0: 6.6, t1: 8.6, col: 'y0', lineCol: 'y0' }, lt);
    PIX.label(c, { tx: W / 2, ty: 452, text: 'BATTERY → POWER IC → PROCESSOR', t0: 7.0, t1: 8.8, col: 'c3', align: 'center' }, lt);
    const blk = name => { const B = BLOCKS.find(b2 => b2[0] === name); return [D0[0] + 8 + B[1] * (DS - 16) + B[3] * (DS - 16) / 2, D0[1] + 8 + B[2] * (DS - 16)]; };
    if (da > 0.9) {
      const r = blk('ROM'), m = blk('B0'), g = blk('DISP');
      PIX.label(c, { ax: r[0], ay: r[1] + 24, tx: 14, ty: 392, text: 'BOOT ROM', t0: 10.0, t1: 10.9, col: 'y1', lineCol: 'y0' }, lt);
      PIX.label(c, { ax: m[0], ay: m[1] + 4, tx: 14, ty: 70, text: 'BOOTLOADER', t0: 11.0, t1: 11.9, col: 'c3', lineCol: 'c2' }, lt);
      PIX.label(c, { ax: g[0], ay: g[1] + 4, tx: 150, ty: 392, text: 'OS STARTING', t0: 12.0, t1: 12.9, col: 'b2', lineCol: 'b2' }, lt);
    }
  },
  cues: [[0.1, 'servo', 0.5, 0, 0.9], [0.95, 'place_click', 0.8, -0.1], [0.6, 'type', 0.25], [1.0, 'slide', 0.5, 0.1, 0.8], [1.85, 'thunk', 0.6], [1.4, 'type', 0.25], [2.25, 'snap', 1.0, -0.2], [2.2, 'type', 0.25], [2.8, 'glass', 0.5, 0, 0.8], [3.55, 'place_click', 0.6], [3.2, 'type', 0.25],
    [5.0, 'whoosh', 0.4, 0.5], [5.5, 'type', 0.3], [5.7, 'punch', 0.6], [5.95, 'button', 1.0, 0.4], [6.1, 'power_rise', 0.9, 0, 3.6], [6.5, 'pulse', 0.6, -0.2], [6.6, 'type', 0.3], [7.0, 'type', 0.3], [7.3, 'pulse', 0.6, 0], [7.6, 'pulse', 0.5, 0.2],
    [8.9, 'dive', 0.6, 0, 1.0], [9.9, 'clock', 0.6, 0, 3.4], ...BLOCKS.map(([n, , , , , , , t0], i) => [t0, 'core_on', 0.55, ((i % 3) - 1) * 0.4, i]), [10.0, 'type', 0.3], [11.0, 'type', 0.3], [12.0, 'type', 0.3], [11.75, 'data', 0.5, 0, 1.0], [12.25, 'data', 0.6, 0.2, 0.8], [12.6, 'riser', 0.7, 0, 0.6]],
};

// ================= S30 · the screen lights up; back on the dune at sunrise =================
const PB = { x: 60, y: 100, w: 150, h: 300, r: 20 }, SCR = { x: 67, y: 107, w: 136, h: 286 };
const mound = x => 376 + 6 * Math.sin(x / 23) + (x - 135) * 0.03;
function screenUI(c, k, lt) {                                       // drawn in screen space, positioned from world
  const S = (x, y) => PIX.toScreen(k, x, y), z = k.z;
  // status bar
  const [tlx, tly] = S(SCR.x + 6, SCR.y + 6), [trx] = S(SCR.x + SCR.w - 6, 0);
  if (z > 0.8) { PIX.text(c, '07:00', tlx, tly, 'g5', { shadow: null }); PIX.rect(c, Math.round(trx - 12), Math.round(tly), 11, 6, 'g5'); PIX.rect(c, Math.round(trx - 11), Math.round(tly + 1), 9, 4, 'c1'); }
  // logo: a quartz grain that becomes a chip
  const lg = clamp((lt - 0.9) / 0.4) * (1 - clamp((lt - 1.9) / 0.3));
  if (lg > 0) {
    const [cx, cy] = S(135, 205), morph = clamp((lt - 1.3) / 0.4), s = 22 * z / 1.69 * lg;
    if (morph < 1) { c.save(); c.globalAlpha = 1 - morph; quartzGrain(c, cx, cy, s, 0.4); c.restore(); }
    if (morph > 0) { c.save(); c.globalAlpha = morph; PIX.flat(c, PIX.rectPath(cx - s, cy - s, 2 * s, 2 * s, 3), 'g1', 'k', 'g3', [3, 3]); PIX.rect(c, cx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2, 'c1'); for (let p = -2; p <= 2; p++) { PIX.rect(c, cx + p * s * 0.35 - 1, cy - s - 4, 2, 4, 'y0'); PIX.rect(c, cx + p * s * 0.35 - 1, cy + s, 2, 4, 'y0'); PIX.rect(c, cx - s - 4, cy + p * s * 0.35 - 1, 4, 2, 'y0'); PIX.rect(c, cx + s, cy + p * s * 0.35 - 1, 4, 2, 'y0'); } c.restore(); }
  }
  // title: font scale steps down with the pull-out so it always fits the screen
  if (lt >= 2.0) {
    const scrW = SCR.w * z, sc = Math.max(1, Math.min(4, Math.floor((scrW - 4) / PIX.textWidth('SMARTPHONE')))), lh = 10 * sc;
    const [tx, ty] = S(135, 150);
    ['FROM SAND', 'TO', 'SMARTPHONE'].forEach((line, i) => {
      const pop = K.pop(lt, 2.0 + i * 0.25, 0.3); if (pop <= 0) return;
      PIX.text(c, line, tx, ty + i * lh - (1 - Math.min(1, pop)) * 6, i === 1 ? 'c2' : 'w', { sc, align: 'center', shadow: 'n0' });
    });
  }
  // the message, typed onto the screen
  const msg = [['Billions of', 4.4], ['transistors.', 4.8], ['One tiny chip.', 6.0], ['Made from silicon.', 8.6]];
  const [mx, my] = S(135, 268);
  msg.forEach(([line, t0], i) => { const n = Math.floor((lt - t0) * 26); if (n > 0) PIX.text(c, line, mx, my + i * 12 + (i >= 2 ? 6 : 0) + (i >= 3 ? 6 : 0), i === 3 ? 'c3' : 'g5', { n, align: 'center', shadow: 'n0' }); });
  if (lt > 9.4 && Math.floor(lt * 2) % 2 === 0) PIX.rect(c, Math.round(mx + PIX.textWidth('Made from silicon.') / 2 + 3), Math.round(my + 3 * 12 + 12), 4, 7, 'c3');   // blinking cursor
}
SC.s30_finale = {
  draw(c, lt) {
    const out = K.inout(lt, 3.0, 7.2);
    const k = { x: 135, y: lerp(250, 244, out), z: CAM.zlerp(1.69, 0.98, out) };
    DUNES(c, k, lt + 20);
    PIX.cam(c, k);
    // the phone standing in the sand, back-lit by the sunrise, screen glowing onto the sand
    PIX.glow(c, 135, 250, 200, 'y0', 0.25);
    PIX.flat(c, PIX.rectPath(PB.x, PB.y, PB.w, PB.h, PB.r), 'g2', 'g1', 'g4', [4, 4], [2, 2]);
    PIX.rect(c, PB.x + PB.w, 160, 3, 26, 'g3'); PIX.rect(c, PB.x - 3, 150, 3, 20, 'g3');
    const scr = PIX.rectPath(SCR.x, SCR.y, SCR.w, SCR.h, 14);
    PIX.fill(c, scr, 'k');
    const on = clamp((lt + 0.3) / 0.9);                               // pixels ripple on from the centre
    c.save(); c.clip(scr);
    if (on >= 1) {                                                    // fully lit: the same three bands as solid fills (no cell seams crawling during the pull-out)
      PIX.rect(c, SCR.x, SCR.y, SCR.w, 96, 'n1'); PIX.rect(c, SCR.x, 203, SCR.w, 100, 'n2'); PIX.rect(c, SCR.x, 303, SCR.w, SCR.y + SCR.h - 303, 'n3');
      for (let n = 0; n < 16; n++) { const y = SCR.y + 40 + h(n, 1) * 220; PIX.rect(c, SCR.x + 4 + h(n, 2) * 60, y, 30 + h(n, 3) * 60, 1, 'c0', 0.5); }   // faint circuit traces wallpaper
    } else if (on > 0) {
      for (let y = SCR.y; y < SCR.y + SCR.h; y += 4) for (let x = SCR.x; x < SCR.x + SCR.w; x += 4) {
        const d = Math.hypot(x - 135, y - 250) / 170; if (d > on * 1.15) continue;
        const fresh = on * 1.15 - d < 0.12;
        PIX.rect(c, x, y, 4, 4, fresh ? 'c3' : (y < 200 ? 'n1' : y < 300 ? 'n2' : 'n3'));
      }
    }
    c.restore();
    PIX.circ(c, 135, SCR.y + 9, 3, 'k');
    if (on > 0) PIX.glow(c, 135, 380, 140, 'c1', 0.3 * on);
    // sand piled in front of the phone's base
    const pts = [[20, 520]]; for (let x = 20; x <= 250; x += 4) pts.push([x, mound(x)]); pts.push([250, 520]);
    PIX.flat(c, PIX.polyPath(pts), 's2', 's1', 's3', [0, 6], [0, 2]);
    for (let n = 0; n < 30; n++) PIX.rect(c, Math.round(24 + h(n, 4) * 220), Math.round(mound(24 + h(n, 4) * 220) + 3 + h(n, 5) * 12), 1, 1, 's4');
    // a grain rolls down against the phone and glints
    const rq = MO.cubicOut(clamp((lt - 8.0) / 1.2)), gx = lerp(-30, 52, rq), gy = (gx < 20 ? SLOPE(gx) : mound(gx)) - 6 - Math.abs(Math.sin(rq * Math.PI * 3)) * 5 * (1 - rq);
    if (lt > 7.9) quartzGrain(c, gx, gy, 6, gx / 6, Math.max(0, Math.sin(clamp((lt - 9.35) / 0.7) * Math.PI)));
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (on > 0.6) screenUI(c, k, lt);
  },
  cues: [[0, 'startup', 1.0], [0.0, 'pixels', 0.6, 0, 0.9], [0.9, 'chime', 0.7], [2.0, 'title_hit', 1.0], [2.25, 'blip', 0.4, 0, 1], [2.5, 'blip', 0.4, 0, 2], [3.0, 'wind', 0.4, 0, 9.0], [4.4, 'type', 0.35], [4.8, 'type', 0.35], [6.0, 'type', 0.35], ...[8.15, 8.5, 8.85, 9.1].map((b, i) => [b, 'grain', 0.55 - i * 0.08, -0.3]), [8.6, 'type', 0.35], [9.4, 'glint', 0.9, -0.2]],
};
})();
