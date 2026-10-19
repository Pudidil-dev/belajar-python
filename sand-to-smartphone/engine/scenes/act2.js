// ACT 2 — purification and crystal growth (S07–S11)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// ================= S07 · hydrochlorination (fluidized bed) → fractional distillation =================
function chemPlant(c, t) {
  PIX.vgrad(c, -300, -300, 1000, 1100, [[0, 't0'], [0.5, 'n1'], [1, 'n0']]);
  for (let x = -300; x < 700; x += 44) K.panel(c, x, -300, 6, 1100, 'n2', 'n1', 'n3');            // back wall ribs
  K.motes(c, t, { n: 40, seed: 8, x: -100, y: -100, w: 700, h: 700, vy: -6, col: 't2', a: 0.35 });
  // --- fluidized-bed reactor (centre x 135) ---
  const shell = new Path2D(); shell.moveTo(75, 130); shell.quadraticCurveTo(135, 70, 195, 130); shell.lineTo(195, 400); shell.lineTo(150, 440); shell.lineTo(120, 440); shell.lineTo(75, 400); shell.closePath();
  PIX.flat(c, shell, 'g2', 'g1', 'g3', [4, 3], [2, 1]);
  const inner = new Path2D(); inner.moveTo(82, 134); inner.quadraticCurveTo(135, 82, 188, 134); inner.lineTo(188, 398); inner.lineTo(82, 398); inner.closePath();
  c.save(); c.clip(inner);
  PIX.vgrad(c, 82, 90, 106, 320, [[0, 'n1'], [1, 't0']]);
  const bedTop = 228 + 6 * Math.sin(t * 5);
  PIX.rect(c, 82, bedTop, 106, 180, 'g1', 0.6);
  for (let n = 0; n < 240; n++) {                                   // silicon particles tossed by the gas
    const bx = 84 + h(n, 1) * 102, by = bedTop + 4 + h(n, 2) * 166, st = K.step(t, 15);
    const jx = Math.sin(st * (6 + h(n, 3) * 5) + n) * 2, jy = Math.cos(st * (5 + h(n, 4) * 6) + n * 1.3) * 3;
    PIX.rect(c, Math.round(bx + jx), Math.round(by + jy), 2, 2, n % 4 ? 'g3' : 'g4');
  }
  K.bubbles(c, t, { x: 86, y: bedTop, w: 98, h: 170, n: 22, seed: 4, speed: 55, r: 3.2, col: 't2', hi: 'c3' });
  K.flow(c, [[135, bedTop], [128, 170], [135, 120]], t, { gap: 9, speed: 26, col: 'c2' });    // vapour leaving the bed
  K.flow(c, [[150, bedTop], [146, 160], [138, 112]], t + 0.3, { gap: 13, speed: 30, col: 'w' });
  c.restore();
  for (let x = 84; x < 188; x += 5) PIX.rect(c, x, 398, 3, 2, 'g4');                  // distributor plate
  for (let y = 250; y < 398; y += 12) { PIX.rect(c, 70, y, 5, 6, 'o0'); PIX.rect(c, 195, y, 5, 6, 'o0'); PIX.glow(c, 72, y + 3, 8, 'o1', 0.35); PIX.glow(c, 198, y + 3, 8, 'o1', 0.35); }
  K.pipe(c, [[-60, 452], [135, 452], [135, 440]], 10, 'g2', 'g4', 'g1');
  K.flow(c, [[-60, 452], [135, 452], [135, 442]], t, { gap: 10, speed: 40, col: 't2', size: 2 });
  K.pipe(c, [[135, 90], [135, 56], [392, 56], [392, 74]], 10, 'g2', 'g4', 'g1');
  K.flow(c, [[135, 92], [135, 56], [392, 56], [392, 74]], t, { gap: 9, speed: 46, col: 'c2', size: 2 });
  for (let l = 0; l < 3; l++) PIX.rect(c, 80 + l * 40, 420, 4, 30, 'g1');
  // --- distillation column (centre x 392) ---
  PIX.flat(c, PIX.rectPath(356, 70, 72, 380, 12), 'g3', 'g1', 'g4', [5, 3], [2, 1]);
  PIX.rect(c, 362, 80, 60, 360, 'n1');
  for (let k2 = 0; k2 < 11; k2++) {
    const y = 104 + k2 * 31, left = k2 % 2 === 0;
    PIX.rect(c, left ? 362 : 372, y, 50, 3, 'g4'); PIX.rect(c, left ? 410 : 362, y - 12, 2, 14, 'g3');
    for (let b = 0; b < 4; b++) PIX.circ(c, (left ? 368 : 378) + b * 11, y - 2 + Math.sin(t * 9 + b + k2) * 0.7, 1.4, 'c2', 0.8);
  }
  for (let n = 0; n < 30; n++) {                                    // vapour climbing, liquid raining back
    const up = K.wrap(t * 30 + h(n, 1) * 360, 360);
    PIX.rect(c, Math.round(368 + h(n, 2) * 48 + Math.sin(up / 20) * 4), Math.round(436 - up), 1, 2, 'c3', 0.8);
    const dn = K.wrap(t * 45 + h(n, 3) * 360, 360);
    PIX.rect(c, Math.round(372 + h(n, 4) * 40), Math.round(80 + dn), 1, 2, 'c1', 0.9);
  }
  PIX.glow(c, 392, 452, 40, 'o0', 0.6); PIX.rect(c, 368, 446, 48, 10, 'o0');            // reboiler
  K.pipe(c, [[392, 70], [392, 40], [460, 40]], 8, 'g2', 'g4', 'g1');                  // light ends (BCl₃, PH₃…) out the top
  K.pipe(c, [[392, 456], [392, 474], [300, 474]], 8, 'g2', 'g4', 'g1');                // heavy ends (Fe, Al chlorides) out the bottom
  K.pipe(c, [[428, 260], [520, 260]], 9, 'g2', 'g4', 'g1');                           // pure trichlorosilane side draw
  K.flow(c, [[428, 260], [520, 260]], t, { gap: 8, speed: 40, col: 'c3', size: 2 });
  const imp = [['B', 'm1'], ['P', 'y0'], ['Fe', 'r2'], ['Al', 'g5']];
  for (let n = 0; n < 12; n++) {
    const [el] = imp[n % 4], light = el === 'B' || el === 'P', q = K.wrap(t * 0.55 + n / 12, 1);
    const pts = light ? [[392, 70], [392, 40], [470, 40]] : [[392, 456], [392, 474], [290, 474]];
    const [x, y] = K.along(pts, q * K.polyLen(pts));
    K.atom(c, x, y, 2.6, el);
  }
}
function hclLens(c, R, lt) {
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n0'); PIX.glow(c, 0, 0, R, 't1', 0.4);
  const q = clamp((lt - 0.9) / 1.3), snap = lt >= 2.2, d = lt - 2.2;
  if (!snap) {
    K.ball(c, 0, 2, 11, 'g3', 'g2', 'g5');
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3, r0 = R * 0.92, r1 = 19; const rr = lerp(r0, r1, MO.cubicIn(q)); K.mol(c, Math.cos(a) * rr, 2 + Math.sin(a) * rr, 5.5, 'HCl', a + Math.PI); }
  } else {
    if (d < 0.25) PIX.glow(c, 0, 2, 34, 'w', 0.9 * (1 - d / 0.25));
    K.mol(c, -d * 8, 2 - d * 12, 6, 'SiHCl3', 0.3 * d);
    K.mol(c, 22 + d * 18, 20 + d * 6, 5.5, 'H2', d);
  }
}
SC.s07_chlorosilane = {
  draw(c, lt) {
    const p = K.inout(lt, 0.3, 3.0), g = MO.sineInOut(clamp((lt - 3.2) / 1.7));   // gentle glide over to the column
    let k = { x: lerp(135, 150, p), y: lerp(250, 238, p), z: CAM.zlerp(1, 1.15, p) };
    k = { x: lerp(k.x, 386, g), y: lerp(k.y, 236, g), z: CAM.zlerp(k.z, 1, g) };
    PIX.cam(c, k); chemPlant(c, lt);
    const open = clamp((lt - 0.5) / 0.35) - clamp((lt - 3.3) / 0.3);
    K.lens(c, 128, 300, 204, 186, 56, open, (c, R) => hclLens(c, R, lt), 'c2');
    c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: W / 2, ty: 30, text: 'Si + 3HCl → SiHCl₃ + H₂', t0: 0.9, t1: 3.3, col: 'c3', align: 'center' }, lt);
    const lb = PIX.toScreen(k, 82, 300);
    PIX.label(c, { ax: lb[0] + 6, ay: lb[1], tx: 8, ty: lb[1] + 70, text: '~300 °C', t0: 1.4, t1: 3.2, col: 'o1', lineCol: 'o0' }, lt);
    const col = PIX.toScreen(k, 356, 150), wa = PIX.toScreen(k, 330, 474);
    PIX.label(c, { ax: col[0], ay: col[1], tx: 12, ty: col[1] - 40, text: 'FRACTIONAL DISTILLATION', t0: 4.75, t1: 6.6, col: 'c3', lineCol: 'c2' }, lt);
    PIX.label(c, { ax: wa[0], ay: wa[1] - 4, tx: 12, ty: wa[1] - 44, text: 'B · P · Fe · Al OUT', t0: 5.1, t1: 6.6, col: 'm1', lineCol: 'm1' }, lt);
  },
  cues: [[-0.4, 'bubbling', 0.65, 0, 4.2], [0.5, 'lens', 0.5], [0.9, 'type', 0.3], [2.2, 'snap', 0.8, 0.3], [3.5, 'whoosh', 0.4, 0.4], [3.6, 'distill', 0.55, 0.2, 3.6], [4.75, 'type', 0.3], [5.1, 'type', 0.3]],
};

// ================= S08 · Siemens reactor: silicon grows on hot rods =================
const rodR = t => lerp(3, 7.5, K.sm(t, 0, 3.6)) + 2 * K.sm(t, 3.6, 7);
function siemens(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'n1'], [0.6, 't0'], [1, 'n0']]);
  for (let x = -300; x < 600; x += 44) K.panel(c, x, -300, 6, 1100, 'n2', 'n1', 'n3');
  K.pipe(c, [[-120, 260], [-20, 260]], 9, 'g2', 'g4', 'g1'); K.flow(c, [[-120, 260], [-20, 260]], t, { gap: 8, speed: 40, col: 'c3', size: 2 });
  // base plate, electrodes, power cables
  PIX.flat(c, PIX.rectPath(20, 400, 230, 16, 3), 'g3', 'g1', 'g4', [3, 3]);
  for (const ex of [90, 120, 150, 180]) { PIX.rect(c, ex - 4, 416, 8, 22, 'u1'); K.pipe(c, [[ex, 438], [ex, 470], [ex + (ex < 135 ? -80 : 80), 470]], 4, 'u1', 'u2', 'u0'); }
  K.flow(c, [[10, 470], [90, 470], [90, 438]], t, { gap: 9, speed: 60, col: 'y1', size: 1 }); K.flow(c, [[260, 470], [180, 470], [180, 438]], t, { gap: 9, speed: 60, col: 'y1', size: 1 });
  // bell jar (cut away): outer steel, cooled silver inner wall
  const jar = new Path2D(); jar.moveTo(36, 400); jar.lineTo(36, 160); jar.quadraticCurveTo(36, 70, 135, 70); jar.quadraticCurveTo(234, 70, 234, 160); jar.lineTo(234, 400);
  c.save(); c.lineWidth = 9; c.strokeStyle = P.g2; c.stroke(jar); c.lineWidth = 3; c.strokeStyle = P.g4; c.stroke(jar); c.restore();
  const inner = new Path2D(); inner.moveTo(41, 400); inner.lineTo(41, 162); inner.quadraticCurveTo(41, 76, 135, 76); inner.quadraticCurveTo(229, 76, 229, 162); inner.lineTo(229, 400); inner.closePath();
  c.save(); c.clip(inner); PIX.vgrad(c, 40, 70, 190, 330, [[0, 'n2'], [1, 'n1']]);
  const r = rodR(t);
  for (const [x0, x1] of [[90, 120], [150, 180]]) {                  // two inverted-U rods, glowing ~1100 °C
    for (const x of [x0, x1]) PIX.glow(c, x, 280, 50 + r * 3, 'o0', 0.45);
    const u = new Path2D(); u.moveTo(x0, 400); u.lineTo(x0, 150); u.quadraticCurveTo((x0 + x1) / 2, 128, x1, 150); u.lineTo(x1, 400);
    c.save(); c.lineCap = 'butt'; c.strokeStyle = P.o0; c.lineWidth = 2 * r + 2; c.stroke(u); c.strokeStyle = P.y0; c.lineWidth = 2 * r; c.stroke(u); c.strokeStyle = P.y1; c.lineWidth = Math.max(1, r * 0.7); c.translate(-r * 0.4, 0); c.stroke(u); c.restore();
  }
  for (let n = 0; n < 36; n++) {                                     // trichlorosilane + H₂ rising from the nozzles; HCl leaving
    const nz = n % 2 ? 105 : 165, age = K.wrap(t * 0.7 + h(n, 1), 1), x = nz + Math.sin(age * 8 + n) * (8 + 16 * age), y = 398 - age * 250;
    PIX.rect(c, Math.round(x), Math.round(y), 2, 2, n % 3 ? 'c2' : 'w', 1 - age * 0.6);
  }
  c.restore();
  for (const nz of [105, 165]) PIX.rect(c, nz - 3, 394, 6, 6, 'g4');
  K.pipe(c, [[214, 416], [214, 452], [330, 452]], 7, 'g2', 'g4', 'g1'); K.flow(c, [[214, 420], [214, 452], [330, 452]], t, { gap: 9, speed: 40, col: 't2', size: 2 });
  PIX.rect(c, 196, 98, 18, 26, 'c2', 0.5); PIX.rect(c, 197, 99, 16, 3, 'w', 0.6);     // view port
}
// atomic deposition view on a rod surface (screen space)
function deposition(c, t, a) {
  c.save(); c.globalAlpha = a;
  PIX.vgrad(c, 0, 0, W, H, [[0, 'r1'], [1, 'r0']]); PIX.glow(c, 40, 240, 220, 'o0', 0.5);
  const front = 92 + 30 * K.sm(t, 3.8, 6.8), sp = 11;
  for (let gi = 0; gi < 4; gi++) {                                   // polycrystal: grains with their own tilt
    const y0 = gi * 120, ang = [0.0, 0.35, -0.25, 0.15][gi];
    for (let i = -2; i < 14; i++) for (let j = 0; j < 12; j++) {
      const lx = i * sp, ly = j * sp, x = 10 + lx * Math.cos(ang) - ly * Math.sin(ang), y = y0 + 6 + lx * Math.sin(ang) + ly * Math.cos(ang);
      if (y < y0 || y > y0 + 118 || x > front + 6 * Math.sin(y / 17)) continue;
      K.ball(c, x, y, 4.2, 'g4', 'g2', 'g5');
    }
    PIX.rect(c, 0, y0 + 118, front, 2, 'r1', 0.8);
  }
  for (let n = 0; n < 9; n++) {                                      // molecules arriving, Si landing, HCl leaving
    const per = 1.0, ph = K.wrap(t + n * per / 9 * 2.7, per), y = 40 + h(n, 2) * 400, landX = front + 6 * Math.sin(y / 17) + 4;
    if (ph < 0.55) { const q = ph / 0.55; K.mol(c, lerp(W + 20, landX + 8, MO.cubicIn(q)), y, 3.4, 'SiHCl3', n); }
    else { const q = (ph - 0.55) / 0.45; if (q < 0.2) PIX.glow(c, landX, y, 16, 'w', 0.9 * (1 - q / 0.2)); K.ball(c, landX, y, 4.2, 'c2', 'c0', 'w'); K.mol(c, landX + 14 + q * 90, y - 10 - q * 40, 3.2, 'HCl', 1 + q * 3); }
  }
  c.restore();
}
SC.s08_siemens = {
  draw(c, lt) {
    const r = rodR(lt), sx = 120 + r, sy = 250;
    const pz = MO.cubicInOut(clamp((lt - 3.5) / 0.3));
    let k = { x: lerp(135, sx, pz), y: lerp(240, sy, pz), z: CAM.zlerp(1, 7, pz) * (1 + 0.04 * Math.max(0, lt - 3.8)) };
    PIX.cam(c, k); siemens(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    const da = clamp((lt - 3.62) / 0.25); if (da > 0) deposition(c, lt, da);
    const rod = PIX.toScreen(k, 150 - r, 200);
    PIX.label(c, { ax: rod[0], ay: rod[1], tx: 14, ty: 26, text: 'SIEMENS REACTOR', t0: 0.6, t1: 3.3, col: 'g5' }, lt);
    PIX.label(c, { ax: PIX.toScreen(k, 180 + r, 300)[0], ay: PIX.toScreen(k, 180 + r, 300)[1], tx: 196, ty: 330, text: '~1100 °C', t0: 1.2, t1: 3.3, col: 'y1', lineCol: 'o1' }, lt);
    const steps = ['99%', '99.99%', '99.9999%', '99.9999999%'], si = Math.floor((lt - 4.5) / 0.5);
    if (si >= 0) {
      const s = steps[Math.min(3, si)], pop = K.pop(lt, 4.5 + Math.min(3, si) * 0.5, 0.25);
      PIX.text(c, s, W / 2, 34 - (pop - 1) * 6, si >= 3 ? 'c3' : 'w', { sc: 2, align: 'center' });
      PIX.label(c, { tx: W / 2, ty: 58, text: 'ELECTRONIC-GRADE POLYSILICON', t0: 5.9, t1: 6.6, col: 'c2', align: 'center' }, lt);
    }
  },
  cues: [[-0.4, 'gas_hiss', 0.5, 0, 4.0], [0, 'hum', 0.3, 0, 7.4], [0.6, 'type', 0.3], [1.2, 'type', 0.3], [3.5, 'punch', 0.8], ...[3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6.0, 6.3].map((b, i) => [b, 'tick', 0.45, 0.3, i]), ...[4.5, 5.0, 5.5, 6.0].map((b, i) => [b, 'blip', 0.6, 0, i])],
};

// ================= CZ puller world (S09–S11) =================
const CR = { x0: 66, x1: 204, top: 320, bot: 404 };
const chunks = []; for (let n = 0; n < 34; n++) chunks.push([72 + h(n, 1) * 126, 400 - h(n, 2) * 62 - (n % 3) * 4, 5 + h(n, 3) * 5, h(n, 4) * 6]);
const HEAT = [[0.1, 'g2'], [0.4, 'r2'], [0.67, 'o0'], [0.9, 'y0']];   // graphite heater colour by heat level
function puller(c, t, s) {
  // s: {fall (0..1 chunks dropping in), melt (0..1), heat (0..1), level (melt y), rot, boron (0..1 drop), seedTip (y|null), crystal: {L, tail, lift, hot}}
  PIX.vgrad(c, -400, -900, 1100, 1700, [[0, 'k'], [0.55, 'g0'], [1, 'k']]);
  for (let x = -400; x < 700; x += 40) K.panel(c, x, -900, 5, 1700, 'g0', 'k', 'g1');
  PIX.glow(c, 135, 360, 260, 'r1', 0.35);
  // pull chamber + neck
  for (const x of [100, 162]) K.panel(c, x, -800, 8, 1000, 'g2', 'g1', 'g3', { seams: 20 });
  // main chamber walls, dome, insulation
  const dome = new Path2D(); dome.moveTo(10, 470); dome.lineTo(10, 250); dome.quadraticCurveTo(10, 196, 100, 192); dome.lineTo(100, 182); dome.lineTo(108, 182); dome.lineTo(108, 200); dome.quadraticCurveTo(24, 204, 24, 256); dome.lineTo(24, 470); dome.closePath();
  PIX.flat(c, dome, 'g2', 'g1', 'g3', [2, 2]);
  c.save(); c.translate(270, 0); c.scale(-1, 1); PIX.flat(c, dome, 'g2', 'g1', 'g3', [2, 2]); c.restore();
  for (let y = 262; y < 466; y += 14) { PIX.rect(c, 12, y, 10, 3, 'c0', 0.7); PIX.rect(c, 248, y, 10, 3, 'c0', 0.7); }   // cooling channels
  PIX.rect(c, 26, 250, 14, 210, 'n1'); PIX.rect(c, 230, 250, 14, 210, 'n1');
  for (let y = 252; y < 458; y += 6) { PIX.rect(c, 28 + (y % 12 ? 0 : 4), y, 6, 1, 'n2'); PIX.rect(c, 232 + (y % 12 ? 4 : 0), y, 6, 1, 'n2'); }
  PIX.rect(c, 4, 470, 262, 12, 'g1');
  // heaters
  let hi = 0; while (hi < HEAT.length - 2 && s.heat >= HEAT[hi + 1][0]) hi++;                 // heaters warm through the ramp, blended (dithered) between steps
  const [h0, hc0] = HEAT[hi], [h1, hc1] = HEAT[hi + 1], hf = clamp((s.heat - h0) / (h1 - h0));
  for (const x of [44, 218]) { if (s.heat > 0) PIX.glow(c, x + 4, 360, 40 + 30 * s.heat, 'o0', 0.55 * s.heat); for (let y = 300; y < 420; y += 10) { PIX.rect(c, x, y, 8, 7, hc0); PIX.rect(c, x, y, 8, 7, hc1, hf); } }
  // argon flowing down the neck and over the melt
  for (let n = 0; n < 14; n++) { const q = K.wrap(t * 0.9 + n / 14, 1), x = n % 2 ? 116 : 152, y = -140 + q * 440; if (y < 300) PIX.rect(c, x + Math.round(Math.sin(q * 9) * 2), Math.round(y), 1, 4, 'c2', 0.45); }
  // susceptor + quartz crucible (rotating marks)
  const cup = (inset) => { const p = new Path2D(); p.moveTo(CR.x0 - inset, CR.top); p.lineTo(CR.x0 - inset, CR.bot - 20); p.quadraticCurveTo(CR.x0 - inset, CR.bot + inset, CR.x0 + 24, CR.bot + inset); p.lineTo(CR.x1 - 24, CR.bot + inset); p.quadraticCurveTo(CR.x1 + inset, CR.bot + inset, CR.x1 + inset, CR.bot - 20); p.lineTo(CR.x1 + inset, CR.top); p.closePath(); return p; };
  PIX.flat(c, cup(10), 'g1', 'g0', 'g2', [3, 3]); PIX.fill(c, cup(4), 's4');
  for (let m = 0; m < 8; m++) { const ph = K.wrap(m / 8 + s.rot, 1); if (ph < 0.5) PIX.rect(c, Math.round(lerp(CR.x0 - 8, CR.x1 + 6, ph * 2)), 342, 2, 50, 'g0', Math.sin(ph * TAU) * 0.8); }
  c.save(); c.clip(cup(0));
  PIX.rect(c, CR.x0, CR.top - 5, CR.x1 - CR.x0, 100, 'n1');
  if (s.melt > 0) {
    PIX.glow(c, 135, s.level + 30, 110, 'y0', 0.5 * Math.min(1, s.melt * 2));
    PIX.rect(c, CR.x0, s.level, CR.x1 - CR.x0, 120, 'o1');
    for (let x = CR.x0; x < CR.x1; x += 2) PIX.rect(c, x, Math.round(s.level + Math.sin(x / 9 + t * 3) * 0.6), 2, 1, 'y1');
    PIX.rect(c, CR.x0 + 18, s.level + 5, 40, 2, 'w', 0.5 * s.melt);           // mirror-like sheen
  }
  c.restore();
  for (const [x, y0, r, a0] of chunks) {                             // polysilicon chunks: drop in, glow, slump, dissolve
    const fallY = y0 - (1 - MO.cubicIn(clamp(s.fall * 1.6 - (h(x, y0) * 0.6)))) * 300;
    const m = clamp(s.melt * 1.25 - (400 - y0) / 140);
    if (m >= 1) continue;
    const rr = r * (1 - m), yy = fallY + m * 18, glowIn = clamp((m - 0.04) / 0.22);
    if (glowIn < 1) K.lump(c, x, yy, rr, a0, 'silicon');
    if (glowIn > 0) { c.save(); c.globalAlpha *= glowIn; K.lump(c, x, yy, rr, a0, 'hot'); c.restore(); }
  }
  if (s.boron > 0) { const by = lerp(150, 380, MO.cubicIn(clamp(s.boron))); if (s.melt < 0.5) PIX.flat(c, PIX.rectPath(128, by, 7, 7, 1), 'm1', 'm0', 'p4', [2, 2]); }
  // crystal / seed
  if (s.seedTip != null) {
    const tip = s.seedTip, cr = s.crystal || { L: 0, tail: 0, lift: 0, hot: 0 };
    const top = tip - cr.L - (cr.lift || 0), bottom = tip - (cr.lift || 0);
    PIX.rect(c, 133, -800, 4, top - 18 + 800, 'g3'); PIX.rect(c, 133, -800, 1, top - 18 + 800, 'g5');   // pull shaft / cable
    PIX.flat(c, PIX.rectPath(126, top - 20, 18, 12, 2), 'g2', 'g1', 'g4', [2, 2]);                       // chuck
    PIX.flat(c, PIX.rectPath(131, top - 10, 8, 12, 1), 'g4', 'g2', 'g5', [2, 1]);                         // seed
    if (cr.L > 0) {
      const prof = sY => { const sN = sY; if (sN < 26) return 3; if (sN < 70) return lerp(3, 60, MO.sineInOut((sN - 26) / 44)); const tl = cr.L - sN; return cr.tail > 0 && tl < 46 * cr.tail ? Math.max(2, 60 * (tl / (46 * cr.tail))) : 60; };
      const L = [], R = []; for (let sY = 0; sY <= cr.L; sY += 2) { const r = prof(sY); L.push([135 - r, top + 2 + sY]); R.push([135 + r, top + 2 + sY]); }
      const body = PIX.polyPath([...L, ...R.reverse()]);
      PIX.flat(c, body, 'g3', 'g1', 'g5', [9, 0], [3, 0]);
      c.save(); c.clip(body);
      for (let sY = 80; sY < cr.L; sY += 7) PIX.rect(c, 70, top + sY, 130, 1, 'g2', 0.5);                     // growth striations
      for (const f of [0.18, 0.5, 0.82]) { const ph = K.wrap(f + s.rot * 1.3, 1); PIX.rect(c, Math.round(75 + ph * 120), top, 1, cr.L + 4, 'g5', Math.sin(ph * Math.PI) * 0.7); }  // rotating ridges
      if (cr.hot > 0) PIX.vgrad(c, 60, bottom - 120, 150, 124, [[0, 'o1', 0], [0.7, 'o1', 0.55 * cr.hot], [1, 'y1', 0.9 * cr.hot]]);
      c.restore();
    }
    if (!cr.lift && s.melt > 0.8) { const r = cr.L > 70 ? 60 : cr.L > 26 ? lerp(3, 60, (cr.L - 26) / 44) : 4; PIX.glow(c, 135, bottom, r + 14, 'y1', 0.7); PIX.rect(c, 135 - r - 3, bottom - 1, 2 * r + 6, 2, 'y1'); }
  }
}
// liquid → crystal interface at atomic scale (screen space); rows lock on the beat
function interfaceView(c, t, a, rows) {
  c.save(); c.globalAlpha = a;
  PIX.vgrad(c, 0, 0, W, H, [[0, 'n1'], [0.45, 'n2'], [0.55, 'r1'], [1, 'r0']]);
  const sp = 15, yI = 210 + rows * 0 , shift = (rows % 1) * sp;
  const frontRow = Math.floor(rows);
  PIX.glow(c, W / 2, 260, 200, 'o0', 0.35);
  for (let j = -9; j < 12; j++) for (let i = -1; i < 20; i++) {          // crystal rows (diamond-cubic [110] dumbbells)
    const y = 230 - (frontRow - j) * sp - shift; if (j > frontRow) continue; if (y < -10) continue;
    const x = i * sp + (j % 2 ? sp / 2 : 0) + 4;
    K.ball(c, x, y, 4.2, 'g5', 'g3', 'w'); K.ball(c, x + 5, y + 4, 3.4, 'c2', 'c0', 'w');
    PIX.line(c, x, y, x + 5, y + 4, 'c3', 1);
  }
  const lock = rows - frontRow;                                        // atoms of the next row flying into place
  for (let i = -1; i < 20; i++) {
    const tx = i * sp + ((frontRow + 1) % 2 ? sp / 2 : 0) + 4, ty = 230 + sp - shift;
    const fx = tx + Math.sin(i * 3.7 + t * 7) * 7, fy = ty + 22 + Math.cos(i * 2.3 + t * 6) * 6, q = MO.cubicInOut(clamp(lock * 1.3 - (i % 3) * 0.1));
    K.ball(c, lerp(fx, tx, q), lerp(fy, ty, q), 4.2, q > 0.95 ? 'g5' : 'o1', q > 0.95 ? 'g3' : 'o0', q > 0.95 ? 'w' : 'y1');
    if (q > 0.9 && q < 1) PIX.glow(c, tx, ty, 10, 'w', 0.6);
  }
  for (let n = 0; n < 70; n++) {                                       // the melt: disordered, jittering
    const st = K.step(t, 12), x = h(n, 1) * W + Math.sin(st * 5 + n) * 4, y = 280 + h(n, 2) * 210 + Math.cos(st * 4 + n * 2) * 4;
    K.ball(c, x, y, 4.2, 'o1', 'o0', 'y1');
  }
  PIX.rect(c, 0, Math.round(236 + sp - shift), W, 1, 'y1', 0.5);
  c.restore();
}
SC.s09_melt = {
  draw(c, lt) {
    const e = K.inout(lt, 1.6, 4.4);
    const k = { x: 135, y: lerp(352, 300, e), z: CAM.zlerp(1.7, 1, e) };
    const melt = K.sm(lt, 1.6, 4.6);
    PIX.cam(c, k);
    puller(c, lt, { fall: clamp((lt + 0.6) / 1.4), melt, heat: K.sm(lt, 0.8, 3.0), level: lerp(404, 345, melt), rot: lt * 0.12, boron: clamp((lt - 1.0) / 0.45), seedTip: null });
    c.setTransform(1, 0, 0, 1, 0, 0);
    const b = PIX.toScreen(k, 132, 380), m = PIX.toScreen(k, 170, 352), hh = PIX.toScreen(k, 48, 330);
    PIX.label(c, { ax: b[0], ay: b[1] - 8, tx: 14, ty: Math.max(20, b[1] - 120), text: '+ BORON (p-TYPE DOPANT)', t0: 1.1, t1: 2.8, col: 'm1', lineCol: 'm1' }, lt);
    PIX.label(c, { ax: hh[0], ay: hh[1], tx: 14, ty: hh[1] + 128, text: 'GRAPHITE HEATERS', t0: 2.6, t1: 3.9, col: 'o1', lineCol: 'o0' }, lt);
    PIX.label(c, { ax: m[0], ay: m[1], tx: Math.min(m[0], 170), ty: m[1] - 70, text: 'MELT 1414 °C', t0: 3.6, t1: 5.6, col: 'y1', lineCol: 'y0' }, lt);
  },
  cues: [...[0, 0.15, 0.3, 0.45, 0.6].map((b, i) => [b - 0.4, 'clink', 0.5, (i - 2) * 0.2]), [1.1, 'drop', 0.5], [1.1, 'type', 0.3], [1.0, 'heat_rise', 0.6, 0, 3.6], [2.6, 'type', 0.25], [3.0, 'melt', 0.6, 0, 2.6], [3.6, 'type', 0.3]],
};
const seedTipAt = lt => lerp(222, 345, MO.cubicInOut(clamp((lt - 0.1) / 1.1)));
SC.s10_seed = {
  draw(c, lt) {
    const pin = K.inout(lt, 1.3, 2.6), pout = K.inout(lt, 4.9, 5.7);
    const z = lt < 4.9 ? CAM.zlerp(1, 12, pin) : CAM.zlerp(12, 1.6, pout);
    const k = { x: 135, y: lerp(300, 345, lt < 4.9 ? pin : 1 - pout * 0) , z };
    PIX.cam(c, k);
    puller(c, lt + 6, { fall: 1, melt: 1, heat: 1, level: 345, rot: (lt + 6) * 0.12, boron: 1, seedTip: seedTipAt(lt), crystal: { L: 0, hot: 0 } });
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (lt > 1.15 && lt < 1.6) PIX.glow(c, ...PIX.toScreen(k, 135, 345), 30, 'w', 0.8 * (1 - (lt - 1.15) / 0.45));
    const ia = clamp((z - 5) / 3); if (ia > 0) interfaceView(c, lt, ia, Math.max(0, (lt - 2.5) * 2));
    const sd = PIX.toScreen(k, 139, seedTipAt(lt) - 6);
    PIX.label(c, { ax: sd[0] + 2, ay: sd[1], tx: sd[0] + 26, ty: sd[1] - 50, text: 'SEED CRYSTAL', t0: 0.3, t1: 1.5, col: 'g5' }, lt);
    PIX.label(c, { tx: 12, ty: 60, text: 'SINGLE CRYSTAL', t0: 2.9, t1: 4.8, col: 'c3' }, lt);
    PIX.label(c, { tx: 12, ty: 420, text: 'LIQUID SILICON', t0: 3.2, t1: 4.8, col: 'y1' }, lt);
    PIX.label(c, { tx: W - 10, ty: 110, text: 'ATOMS COPY THE SEED', t0: 3.6, t1: 4.8, col: 'w', align: 'right' }, lt);
  },
  cues: [[0.0, 'winch', 0.35, 0, 1.2], [0.3, 'type', 0.3], [1.2, 'touch', 0.9], [1.4, 'dive', 0.6, 0, 1.2], ...[2.5, 3.0, 3.5, 4.0, 4.5].map((b, i) => [b, 'crystal', 0.7, (i % 2) * 0.3 - 0.15, 72 + [0, 4, 7, 12, 16][i]]), [2.9, 'type', 0.3], [3.2, 'type', 0.3], [3.6, 'type', 0.3], [4.9, 'whoosh_out', 0.5, 0, 0.8]],
};
SC.s11_pull = {
  draw(c, lt) {
    const L = 8 + 300 * K.sm(lt, 0.15, 4.1), tail = K.sm(lt, 3.6, 4.5), lift = 300 * MO.k75(clamp((lt - 4.7) / 1.8));
    const level = lerp(345, 382, K.sm(lt, 0.15, 4.4));
    const a = K.inout(lt, 0, 2.0), b = K.inout(lt, 2.0, 4.1), u = K.inout(lt, 4.7, 6.6);
    let k = { x: 135, y: lerp(345, 250, a), z: CAM.zlerp(1.6, 0.8, a) };
    k.y = lerp(k.y, 170, b); k = { x: 135, y: lerp(k.y, -90, u), z: k.z };
    PIX.cam(c, k);
    puller(c, lt + 12, { fall: 1, melt: 1, heat: 1, level, rot: (lt + 12) * 0.12, boron: 1, seedTip: level, crystal: { L, tail, lift, hot: 1 - K.sm(lt, 4.8, 6.6) } });
    c.setTransform(1, 0, 0, 1, 0, 0);
    const side = PIX.toScreen(k, 78, level - L * 0.5 - lift);
    PIX.label(c, { ax: side[0] - 2, ay: side[1], tx: 8, ty: 28, text: '300 mm SINGLE CRYSTAL', t0: 1.8, t1: 4.0, col: 'c3', lineCol: 'c2' }, lt);
    PIX.label(c, { tx: 8, ty: 40, text: 'PULLED ~1 mm/min', t0: 2.3, t1: 4.0, col: 'g4' }, lt);
    const ing = PIX.toScreen(k, 75, level - L * 0.4 - lift);
    PIX.label(c, { ax: ing[0], ay: ing[1], tx: 12, ty: ing[1] + 60, text: 'INGOT', t0: 5.1, t1: 6.6, col: 'w' }, lt);
  },
  cues: [[0, 'grow', 0.55, 0, 4.4], ...[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5].map((b, i) => [b, 'crystal', 0.35, (i % 2) * 0.4 - 0.2, 76 + [0, 3, 7, 10, 12, 15, 19][i]]), [1.8, 'type', 0.3], [2.3, 'type', 0.25], [4.7, 'winch', 0.55, 0, 2.0], [5.1, 'type', 0.3]],
};
})();
