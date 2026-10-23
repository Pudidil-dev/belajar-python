// ACT 4 — into the fab: cleanroom, deposition, resist, the EUV scanner (S14–S17)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// FOUP: front-opening pod holding a stack of wafers
function foup(c, x, y, s = 1) {
  PIX.flat(c, PIX.rectPath(x - 15 * s, y - 13 * s, 30 * s, 26 * s, 3 * s), 'g5', 'g3', 'w', [2 * s, 2 * s], [1, 1]);
  PIX.rect(c, x - 11 * s, y - 9 * s, 22 * s, 18 * s, 'g4');
  for (let k2 = 0; k2 < 6; k2++) PIX.rect(c, x - 10 * s, y - 8 * s + k2 * 3 * s, 20 * s, Math.max(1, s), 'c2');
  PIX.rect(c, x - 6 * s, y - 16 * s, 12 * s, 3 * s, 'g3');
}
// tool front: white panels, a display, a signal tower, a load port
function tool(c, x, y, w, hh, t, seed, o = {}) {
  K.panel(c, x, y, w, hh, o.base || 'g5', o.sh || 'g3', 'w', { seams: 3 });
  PIX.rect(c, x + 6, y + 10, w * 0.45, 16, 'n1'); for (let b = 0; b < 4; b++) PIX.rect(c, x + 8, y + 13 + b * 3, Math.round(4 + (w * 0.45 - 12) * (0.5 + 0.5 * Math.sin(t * 2 + b + seed))), 1, b % 2 ? 'c1' : 'c2');
  const tx = x + w - 8; PIX.rect(c, tx, y - 18, 3, 18, 'g3');
  for (const [i, col] of [[0, 'r2'], [1, 'y0'], [2, 'c1']]) { const on = (i === 2) || (i === 1 && Math.sin(t * 3 + seed) > 0.6); PIX.rect(c, tx - 1, y - 26 + i * 4, 5, 3, on ? col : 'g2'); }
  if (o.port) { PIX.rect(c, x + 4, y + hh - 34, w - 8, 4, 'g3'); }
}
// ================= S14 · the cleanroom: a FOUP rides the overhead rail =================
const vehX = t => lerp(-60, 366, K.sm(t, 0, 4.1));                // stops over the load port of the tool at x 328–404
const DROP = 268;
function cleanroom(c, k, t) {
  PIX.rect(c, 0, 0, W, H, 'g5'); PIX.rect(c, 0, 0, W, 70, 'g4');
  PIX.layer(c, k, 0.55, c => {                                   // far bays; the litho bay glows yellow
    PIX.rect(c, 250, 90, 900, 330, 'y1'); PIX.rect(c, 250, 90, 900, 6, 'y0'); PIX.glow(c, 330, 160, 160, 'y0', 0.35);
    for (let x = -500; x < 1300; x += 64) tool(c, x, 190, 50, 150, t, x, x > 250 ? { base: 'y1', sh: 's3' } : {});
    for (const [wx, ph] of [[60, 0], [610, 2]]) {                 // bunny-suit figures, from behind
      const bob = Math.round(Math.sin(t * 1.5 + ph)); PIX.flat(c, PIX.rectPath(wx, 300 + bob, 10, 24, 4), 'w', 'g4', null, [2, 2]); PIX.flat(c, PIX.rectPath(wx + 1, 290 + bob, 8, 10, 4), 'w', 'g4', null, [1, 1]);
    }
  });
  PIX.cam(c, k);
  for (let x = -600; x < 1300; x += 40) { PIX.rect(c, x, 0, 38, 34, 'g5'); for (let v = 0; v < 6; v++) PIX.rect(c, x + 4 + v * 6, 8, 3, 18, 'g4'); PIX.rect(c, x, 34, 40, 2, 'g3'); }   // ceiling filter units
  for (let n = 0; n < 60; n++) { const x = -600 + h(n, 1) * 1900, y = 40 + K.wrap(h(n, 2) * 380 + t * 70, 380); PIX.rect(c, Math.round(x), Math.round(y), 1, 5, 'w', 0.5); }   // laminar air falling
  PIX.rect(c, -600, 58, 1900, 4, 'g3'); for (let x = -600; x < 1300; x += 90) PIX.rect(c, x, 36, 2, 22, 'g3');                // OHT rail
  for (let x = -500; x < 1300; x += 92) tool(c, x, 230, 76, 190, t, x * 3, { port: true, ...(x > 380 ? { base: 'y1', sh: 's3' } : {}) });
  for (let x = -500; x < 1300; x += 92) if (x !== 328 && h(x, 3) > 0.4) foup(c, x + 38, 230 + 190 - 34 - 11, 0.8);
  PIX.rect(c, -600, 420, 1900, 70, 'g3'); for (let x = -600; x < 1300; x += 6) for (let y = 426; y < 480; y += 6) PIX.rect(c, x, y, 2, 2, 'g2');      // perforated raised floor
  // the hero FOUP on its vehicle, then the hoist lowers it onto the load port
  const vx = vehX(t), drop = DROP * MO.k75(clamp((t - 4.2) / 1.2));
  PIX.flat(c, PIX.rectPath(vx - 24, 48, 48, 18, 3), 'g4', 'g2', 'g5', [2, 2]); K.blink(c, vx - 2, 44, 'y0', t, 1.5, 0, 3);
  PIX.line(c, vx - 10, 66, vx - 10, 80 + drop, 'g2', 1); PIX.line(c, vx + 10, 66, vx + 10, 80 + drop, 'g2', 1);
  foup(c, vx, 100 + drop, 1.4);
}
SC.s14_cleanroom = {
  draw(c, lt) {
    const vx = vehX(lt), d = K.inout(lt, 4.1, 5.6);
    const k = { x: lerp(Math.max(vx, 40), 366, d), y: lerp(200, 262, d), z: 1 };
    cleanroom(c, k, lt);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const f = PIX.toScreen(k, vx + 6, 100 + DROP * MO.k75(clamp((lt - 4.2) / 1.2)));
    PIX.label(c, { tx: 12, ty: 120, text: 'CLEANROOM', t0: 0.5, t1: 2.6, col: 'n1', shadow: 'g4' }, lt);
    PIX.label(c, { ax: f[0] + 16, ay: f[1], tx: f[0] + 30, ty: f[1] + 26, text: 'FOUP: 25 WAFERS', t0: 1.4, t1: 3.6, col: 'n1', shadow: 'g4', lineCol: 'n2' }, lt);
    PIX.label(c, { tx: W - 10, ty: 150, text: 'LITHO BAY: YELLOW LIGHT', t0: 3.3, t1: 5.4, col: 'r1', shadow: 'y1', align: 'right' }, lt);
  },
  cues: [[-0.3, 'air', 0.55, 0, 6.4], [0, 'oht', 0.5, -0.3, 4.2], [0.5, 'type', 0.3], [1.4, 'type', 0.3], [3.3, 'type', 0.3], [4.2, 'hoist', 0.5, 0.2, 1.3], [5.4, 'clunk', 0.6, 0.2]],
};

// ================= S15 · deposition: robot loads the wafer; ALD grows a film one layer per cycle =================
const effX = t => lerp(48, 205, MO.k75(clamp((t - 0.2) / 1.4)));
function depTool(c, t) {
  PIX.vgrad(c, -200, -200, 700, 900, [[0, 'n1'], [1, 'n0']]);
  K.panel(c, 0, 210, 132, 190, 'g2', 'g1', 'g3', { rivets: true }); PIX.rect(c, 6, 216, 120, 178, 'n2');       // transfer chamber
  K.panel(c, 140, 170, 128, 230, 'g2', 'g1', 'g3', { rivets: true }); PIX.rect(c, 146, 176, 116, 218, 'n1');    // process chamber
  const valve = clamp((t - 0.1) / 0.25) - clamp((t - 1.75) / 0.25);
  PIX.rect(c, 132, 290, 8, 60, 'g1'); PIX.rect(c, 132, 290 + 50 * valve, 8, 10, 'g3');
  // gas box: precursor A (cyan), precursor B (orange), purge — valves blink in the ALD rhythm
  K.panel(c, 150, 64, 110, 66, 'g2', 'g1', 'g3', { rivets: true });
  for (const [i, col, ph] of [[0, 'c1', 0], [1, 'o1', 0.5], [2, 'g4', 0.25]]) {
    const x = 172 + i * 32, on = K.wrap(t - 2.5 - ph, 1) < 0.4 && t > 2.4 && t < 4.4;
    K.pipe(c, [[x, 130], [x, 170], [x, 226]], 6, 'g3', 'g5', 'g1'); PIX.rect(c, x - 6, 92, 12, 12, col); PIX.rect(c, x - 6, 92, 12, 2, 'w', 0.5);
    PIX.rect(c, x - 2, 110, 4, 6, on ? col : 'g1'); if (on) PIX.glow(c, x, 113, 10, col, 0.6);
  }
  // turbo pump under the chamber
  K.panel(c, 182, 404, 46, 56, 'g2', 'g1', 'g3'); for (let b = 0; b < 6; b++) { const a = t * 40 + b * TAU / 6; PIX.line(c, 205, 432, 205 + Math.cos(a) * 17, 432 + Math.sin(a) * 5, 'g4', 2); }
  // showerhead + gas
  PIX.rect(c, 150, 226, 108, 8, 'g3'); for (let x = 154; x < 256; x += 6) PIX.rect(c, x, 234, 2, 1, 'k');
  const pulse = Math.max(K.sm(t, 2.45, 2.55) * (1 - K.sm(t, 2.85, 2.95)), K.sm(t, 3.45, 3.55) * (1 - K.sm(t, 3.85, 3.95)));
  for (let n = 0; n < 30; n++) { const q = K.wrap(t * 1.6 + h(n, 1), 1); PIX.rect(c, Math.round(154 + h(n, 2) * 100), Math.round(236 + q * 96), 1, 2, t > 3.3 && t < 4 ? 'o1' : 'c2', 0.3 + 0.6 * pulse); }
  // heated pedestal + lift pins
  PIX.flat(c, PIX.rectPath(160, 340, 90, 50, 3), 'g3', 'g1', 'g4', [3, 3]); PIX.rect(c, 162, 340, 86, 2, 'o0'); PIX.glow(c, 205, 345, 50, 'o0', 0.35);
  const pins = clamp((t - 1.0) / 0.3) - clamp((t - 1.65) / 0.3); for (const px of [180, 205, 230]) PIX.rect(c, px, 332 - 8 * pins, 1, 8 + 8 * pins, 'g4');
  // SCARA-style robot arm reaching through the slit valve
  const ex = effX(t), base = [48, 360], L1 = 62, L2 = 62;
  const reach = Math.max(10, Math.min(L1 + L2 - 1, ex - 30 - base[0])), a2 = Math.acos(clamp((reach * reach - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1)), a1 = Math.atan2(0, reach) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
  const j = [base[0] + Math.cos(a1) * L1, base[1] - 20 + Math.sin(a1) * L1 * 0.25];
  PIX.flat(c, PIX.rectPath(base[0] - 14, base[1] - 10, 28, 30, 4), 'g3', 'g1', 'g4', [2, 2]);
  PIX.line(c, base[0], base[1] - 16, j[0], j[1], 'g4', 7); PIX.line(c, j[0], j[1], ex - 30, 320, 'g4', 5);
  PIX.circ(c, j[0], j[1], 4, 'g3'); PIX.rect(c, ex - 32, 318, 40, 3, 'g3');
  const onPed = t > 1.45, wy = onPed ? 336 - 8 * Math.max(0, (clamp((t - 1.0) / 0.3) - clamp((t - 1.65) / 0.3))) : 314;
  PIX.flat(c, PIX.rectPath((onPed ? 205 : ex - 12) - 40, Math.min(wy, 336), 80, 4, 1), 'g4', 'g2', 'g5', [0, 1], [0, 1]);
}
function aldView(c, t, a) {
  c.save(); c.globalAlpha = a;
  PIX.vgrad(c, 0, 0, W, H, [[0, 'n1'], [1, 'n0']]);
  const sy = 330, cyc = [[2.5, 3.0], [3.5, 4.0]];
  PIX.rect(c, 0, 18, W, 12, 'g3'); PIX.rect(c, 0, 18, W, 2, 'g4'); for (let x = 4; x < W; x += 12) PIX.rect(c, x, 30, 4, 2, 'k');   // showerhead overhead
  for (const [a0, b0] of cyc) for (const [st, col] of [[a0, 'c1'], [b0, 'o1']]) { const q = clamp((t - st + 0.1) / 0.5); if (q > 0 && q < 1) for (let x = 6; x < W; x += 12) PIX.rect(c, x, 32, 2, Math.round(30 * q), col, 0.6 * (1 - q)); }
  for (let x = 0; x < W; x += 12) for (let r = 0; r < 6; r++) K.ball(c, x + (r % 2) * 6 + 6, sy + 16 + r * 11, 4.4, 'g3', 'g2', 'g4');   // silicon substrate
  let layers = 0; for (const [a0] of cyc) if (t > a0 + 0.75) layers++;
  layers += Math.floor(clamp((t - 4.4) / 0.6) * 6);
  for (let l = 0; l < layers; l++) for (let x = 0; x < W; x += 10) K.ball(c, x + (l % 2) * 5 + 5, sy + 4 - l * 9, 3.8, l % 2 ? 't2' : 'c1', 't1', 'c3');
  const top = sy + 4 - layers * 9;
  for (const [i, [a0, b0]] of cyc.entries()) {
    const pa = clamp((t - a0) / 0.4), pb = clamp((t - b0) / 0.4);
    if (t < a0 - 0.1 || t > b0 + 0.75) continue;
    const ly = sy + 4 - i * 9 - 9;
    for (let x = 6; x < W; x += 10) {
      const stuck = pa >= 1, fall = lerp(-30 - h(x, i) * 120, ly, MO.cubicIn(pa));
      if (pb < 1) { K.ball(c, x, stuck ? ly : fall, 3.6, 'c1', 'c0', 'c3'); PIX.circ(c, x - 3, (stuck ? ly : fall) - 3, 1.6, 'g4'); PIX.circ(c, x + 3, (stuck ? ly : fall) - 3, 1.6, 'g4'); }
      if (t > b0 - 0.1 && pb < 1) { const fb = lerp(-20 - h(x, 9) * 100, ly - 8, MO.cubicIn(pb)); K.ball(c, x + 2, fb, 3, 'o1', 'o0', 'y1'); }
      if (pb >= 1) { const q = clamp((t - b0 - 0.4) / 0.4); PIX.circ(c, x + 4, ly - 6 - q * 60, 1.6, 'w', 1 - q); }
    }
  }
  PIX.rect(c, 0, Math.round(top) - 6, W, 1, 'c3', 0.3);
  c.restore();
  return top;
}
SC.s15_deposition = {
  draw(c, lt) {
    const p = K.inout(lt, 1.8, 2.6);
    const k = { x: lerp(135, 205, p), y: lerp(262, 338, p), z: CAM.zlerp(1.0, 8, p) };
    PIX.cam(c, k); depTool(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    const a = clamp((k.z - 4) / 3);
    let top = 330; if (a > 0) top = aldView(c, lt, a);
    PIX.label(c, { tx: W / 2, ty: 40, text: 'ATOMIC LAYER DEPOSITION', t0: 2.5, t1: 4.5, col: 'c3', align: 'center' }, lt);
    PIX.label(c, { tx: W / 2, ty: 54, text: '1 LAYER PER CYCLE', t0: 3.4, t1: 4.5, col: 'g4', align: 'center' }, lt);
    PIX.label(c, { ax: 200, ay: top - 4, tx: 170, ty: top - 70, text: 'THIN FILM', t0: 4.4, t1: 5.2, col: 'c3', lineCol: 'c2' }, lt);
  },
  cues: [[0.1, 'valve', 0.5, 0.2], [0.2, 'servo', 0.6, 0.1, 1.4], [1.0, 'pins', 0.4, 0.2], [1.8, 'dive', 0.5, 0, 0.8], [2.5, 'gas_pulse', 0.7, -0.2], [3.0, 'gas_pulse', 0.5, 0.2, 1], [3.5, 'gas_pulse', 0.7, -0.2], [4.0, 'gas_pulse', 0.5, 0.2, 1], [2.5, 'type', 0.3], [3.4, 'type', 0.25], [3.25, 'layer', 0.6, 0, 0], [4.25, 'layer', 0.6, 0, 1], ...[4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((b, i) => [b, 'layer', 0.35, 0, 2 + i])],
};

// ================= S16 · spin-coating photoresist (top view) =================
const WC = [135, 228], WR = 92;
function coater(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g1'], [1, 'g0']]);
  K.panel(c, -60, 60, 390, 360, 'g2', 'g1', 'g3', { rivets: true });
  PIX.flat(c, PIX.circPath(WC[0], WC[1], 124), 'g1', 'k', 'g2', [3, 3]); PIX.circ(c, WC[0], WC[1], 114, 'k');       // catch cup
  const spin = K.sm(t, 1.0, 2.0), ang = t * 1 + 26 * Math.max(0, t - 1.5) + 13 * K.sm(t, 1.0, 1.5);
  K.wafer(c, WC[0], WC[1], WR, { bg: 'k', notch: false });
  c.save(); c.translate(WC[0], WC[1]); c.rotate(ang); PIX.circ(c, 0, WR - 1, 4, 'k'); c.restore();   // notch spins with the wafer
  // resist: puddle → spreading fingers → uniform film (with thin-film interference rings)
  const R = lt => lt < 1.0 ? 24 * K.sm(lt, 0.3, 1.0) : lerp(24, WR + 4, MO.cubicOut(clamp((lt - 1.1) / 1.0)));
  const r = R(t), fing = t < 1.1 ? 0 : 0.16 * (1 - clamp((t - 1.8) / 0.4));
  if (r > 0) {
    const pts = []; for (let k2 = 0; k2 < 72; k2++) { const a = k2 * TAU / 72; pts.push([WC[0] + Math.cos(a) * r * (1 + fing * Math.sin(6 * a + ang)), WC[1] + Math.sin(a) * r * (1 + fing * Math.sin(6 * a + ang))]); }
    c.save(); c.clip(PIX.circPath(WC[0], WC[1], WR)); PIX.fill(c, PIX.polyPath(pts), 'o1', 0.82);
    if (t > 2.0) for (const [rr, col] of [[WR - 6, 'p3'], [WR - 10, 'c2'], [WR - 14, 'y1']]) { c.save(); c.strokeStyle = P[col]; c.globalAlpha = 0.6; c.lineWidth = 1; c.beginPath(); c.arc(WC[0], WC[1], rr, 0, TAU); c.stroke(); c.restore(); }
    PIX.line(c, WC[0], WC[1], WC[0] + Math.cos(ang) * WR, WC[1] + Math.sin(ang) * WR, 'y1', 1, 0.5 * spin);
    c.restore();
  }
  for (let n = 0; n < 40; n++) {                                     // excess flung off the edge, tangentially
    if (t < 1.4 || t > 3.2) break;
    const age = K.wrap(t * 2 + h(n, 1), 1), a = h(n, 2) * TAU + ang * 0.2, d = WR + age * 40;
    PIX.rect(c, Math.round(WC[0] + Math.cos(a) * d - Math.sin(a) * age * 30), Math.round(WC[1] + Math.sin(a) * d + Math.cos(a) * age * 30), 2, 2, 'o1', 1 - age);
  }
  // dispense nozzle arm (retracts after the puddle)
  const arm = MO.k75(clamp((t - 1.0) / 0.5));
  c.save(); c.translate(lerp(WC[0], 300, arm), lerp(WC[1], 60, arm));
  PIX.flat(c, PIX.rectPath(-5, -6, 10, 10, 2), 'g4', 'g2', 'g5', [2, 2]); K.panel(c, 2, -6, 180, 8, 'g3', 'g1', 'g4');
  if (t > 0.3 && t < 1.0) PIX.rect(c, -1, 4, 3, 6, 'o1');
  c.restore();
}
function resistLens(c, R) {
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n0');                           // cross-section: resist on the deposited film on silicon, each band named inside
  PIX.rect(c, -R, 8, 2 * R, R, 'g3'); for (let x = -R; x < R; x += 8) PIX.circ(c, x + 4, 30, 2.5, 'g2');
  PIX.rect(c, -R, -4, 2 * R, 12, 't2'); PIX.rect(c, -R, -16, 2 * R, 12, 'o1'); PIX.rect(c, -R, -16, 2 * R, 1, 'y1');
  const o = { align: 'center', shadow: null };
  K.wtext(c, 'RESIST', 0, -13, 'r1', o); K.wtext(c, 'FILM', 0, -1, 't0', o); K.wtext(c, 'Si', 0, 14, 'g1', o);
}
SC.s16_spincoat = {
  draw(c, lt) {
    const pout = K.inout(lt, 4.2, 5.4);
    const k = { x: 135, y: 236, z: CAM.zlerp(1, 0.62, pout) };
    PIX.cam(c, k); coater(c, lt);
    const open = clamp((lt - 2.7) / 0.35) - clamp((lt - 4.3) / 0.3);
    if (open > 0) K.lens(c, WC[0] + 70, WC[1] + 50, 196, 390, 44, open, (c, R) => resistLens(c, R), 'o1');
    c.setTransform(1, 0, 0, 1, 0, 0);
    const rpm = Math.round(3000 * K.sm(lt, 1.0, 2.0) / 50) * 50;
    PIX.label(c, { ax: 140, ay: 222, tx: 14, ty: 64, text: 'PHOTORESIST', t0: 0.35, t1: 2.2, col: 'o1', lineCol: 'o1' }, lt);
    if (lt > 1.0 && lt < 4.4) PIX.text(c, `SPIN ${rpm} rpm`, W - 12, 64, 'w', { align: 'right' });
    PIX.label(c, { tx: 14, ty: 360, text: 'LIGHT-SENSITIVE FILM', t0: 3.0, t1: 4.4, col: 'y1' }, lt);
  },
  cues: [[0.3, 'dispense', 0.6, 0, 0.7], [0.35, 'type', 0.3], [1.0, 'spinup', 0.7, 0, 2.6], [1.5, 'fling', 0.4, 0.3, 1.6], [2.7, 'lens', 0.4], [3.0, 'type', 0.3], [4.2, 'whoosh_out', 0.4, 0, 1.0]],
};

// ================= S17 · the EUV scanner: panels slide away =================
// light path (world): plasma → collector → intermediate focus → illuminator mirrors → mask (top) → 6 projection mirrors → wafer
const PATH = [[232, 300], [262, 300], [176, 300], [150, 212], [100, 180], [135, 92], [176, 150], [96, 196], [178, 244], [100, 290], [170, 330], [118, 362], [135, 404]];
function euvMachine(c, t, open) {
  PIX.vgrad(c, -400, -300, 1100, 1100, [[0, 'y1'], [0.6, 's3'], [1, 's2']]);           // yellow litho bay
  PIX.rect(c, -400, 420, 1100, 200, 's1'); for (let x = -400; x < 700; x += 6) PIX.rect(c, x, 424, 2, 2, 's0');
  // subfab: CO₂ drive laser below the floor
  K.panel(c, 120, 438, 170, 40, 'g2', 'g1', 'g3', { rivets: true }); PIX.rect(c, 132, 448, 120, 6, 'r2');
  // interior (vacuum) revealed as the panels slide
  PIX.rect(c, 4, 64, 262, 356, 'n0'); PIX.glow(c, 232, 300, 70, 'p2', 0.35);
  K.panel(c, 196, 258, 72, 84, 'g1', 'g0', 'g2'); PIX.circ(c, 232, 300, 34, 'n1');                                   // source vessel
  c.save(); c.strokeStyle = P.p3; c.lineWidth = 5; c.beginPath(); c.arc(262, 300, 30, Math.PI * 0.62, Math.PI * 1.38); c.stroke(); c.strokeStyle = P.c2; c.lineWidth = 1; c.beginPath(); c.arc(262, 300, 27, Math.PI * 0.62, Math.PI * 1.38); c.stroke(); c.restore();   // collector
  PIX.rect(c, 228, 262, 8, 10, 'g3'); for (let d = 0; d < 5; d++) PIX.rect(c, 231, 274 + K.wrap(d * 6 + t * 120, 26), 2, 2, 'g5');                 // droplets
  PIX.line(c, 276, 450, 276, 300, 'r2', 2); PIX.line(c, 276, 300, 236, 300, 'r2', 2);                                                           // drive laser path
  const fl = Math.pow(Math.max(0, Math.sin(t * Math.PI * 8)), 8); PIX.glow(c, 232, 300, 16 + 10 * fl, 'p4', 0.9); PIX.circ(c, 232, 300, 2 + fl * 2, 'w');
  K.panel(c, 70, 66, 130, 18, 'g2', 'g1', 'g3'); PIX.rect(c, 90 + 20 * Math.sin(t * 6), 82, 50, 4, 'p1'); for (let x = 0; x < 50; x += 4) PIX.rect(c, 90 + 20 * Math.sin(t * 6) + x, 82, 2, 4, 'g5');  // reticle stage + mask
  K.panel(c, 72, 150, 126, 228, 'g1', 'g0', 'g2'); PIX.rect(c, 78, 156, 114, 216, 'n1');                                                         // projection optics box
  for (const [x, y] of PATH.slice(3, 12)) { if (y === 92) continue; c.save(); c.translate(x, y); PIX.rect(c, -9, -2, 18, 4, 'p3'); PIX.rect(c, -9, -2, 18, 1, 'c3'); c.restore(); }
  const sx = 135 + 30 * Math.sin(t * 6);                                                                                                         // wafer stage, scanning
  K.panel(c, 40, 404, 190, 14, 'g3', 'g1', 'g4'); PIX.flat(c, PIX.rectPath(sx - 40, 398, 80, 6, 1), 'g2', 'g1', 'g3', [0, 2]); PIX.rect(c, sx - 34, 396, 68, 2, 'g5'); PIX.rect(c, sx - 34, 395, 68, 1, 'o1');
  // the EUV beam: violet path with a glow and travelling pulses
  c.save(); c.lineJoin = 'round';
  for (const [w, col, a] of [[7, 'p1', 0.5], [3, 'p3', 0.95], [1, 'p4', 1]]) { c.strokeStyle = P[col]; c.globalAlpha = a; c.lineWidth = w; c.beginPath(); PATH.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  c.restore();
  K.flow(c, PATH, t, { gap: 22, speed: 160, col: 'w', size: 2 });
  // exterior panels sliding away (open 0..1)
  if (open < 1) {
    const sl = MO.k75(open);
    for (let p = 0; p < 4; p++) {
      const x = 4 + p * 66 + (p < 2 ? -1 : 1) * sl * 300, y = 64; K.panel(c, x, y, 64, 356, 'g5', 'g4', 'w', { seams: 6 });
      for (let v = 0; v < 5; v++) PIX.rect(c, x + 10, y + 250 + v * 6, 44, 2, 'g4');                                   // vents
      PIX.rect(c, x + 4, y + 16, 56, 3, p % 2 ? 'c1' : 'p3');                                                          // status strip
      if (p === 1) { PIX.rect(c, x + 14, y + 60, 36, 22, 'n1'); for (let b = 0; b < 4; b++) PIX.rect(c, x + 17, y + 63 + b * 5, Math.round(10 + 18 * (0.5 + 0.5 * Math.sin(t * 3 + b))), 2, 'c2'); }
    }
    PIX.rect(c, -40 - sl * 300, 300, 44, 60, 'g4'); foup(c, -18 - sl * 300, 290, 1);
  }
}
SC.s17_euv = {
  draw(c, lt) {
    const out = MO.cubicOut(clamp((lt + 0.3) / 1.3)), push = K.inout(lt, 4.4, 6.1);
    let k = { x: lerp(40, 135, out), y: lerp(330, 250, out), z: CAM.zlerp(2.2, 0.92, out) };
    k = { x: lerp(k.x, 232, push), y: lerp(k.y, 300, push), z: CAM.zlerp(k.z, 3.4, push) };
    PIX.cam(c, k); euvMachine(c, lt, clamp((lt - 1.2) / 1.2)); c.setTransform(1, 0, 0, 1, 0, 0);
    const S = (x, y) => PIX.toScreen(k, x, y);
    PIX.label(c, { tx: 12, ty: 28, text: 'EUV SCANNER', t0: 0.3, t1: 2.4, col: 'n1', shadow: 'y1' }, lt);
    const L = [['LIGHT SOURCE', 232, 262, 170, 230, 2.5], ['MASK', 135, 82, 30, 40, 2.9], ['MIRRORS', 96, 196, 14, 150, 3.3], ['WAFER', 135, 400, 14, 450, 3.7]];
    for (const [txt, ax, ay, tx, ty, t0] of L) { const [sx, sy] = S(ax, ay); PIX.label(c, { ax: sx, ay: sy, tx, ty, text: txt, t0, t1: 4.4, col: 'p4', lineCol: 'p3' }, lt); }
  },
  cues: [[-0.3, 'whoosh_out', 0.4], [0.3, 'type', 0.3], [0.2, 'machine', 0.5, 0, 5.8], [1.2, 'panels', 0.7, 0, 1.2], ...[2.5, 2.9, 3.3, 3.7].map(b => [b, 'type', 0.3]), [4.4, 'riser', 0.5, 0, 1.6]],
};
})();
