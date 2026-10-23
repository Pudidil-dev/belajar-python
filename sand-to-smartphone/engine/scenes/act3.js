// ACT 3 — ingot to wafer (S12–S13)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// ================= S12 · grind + notch, then the diamond multi-wire saw =================
const IR = 42;                                                    // ingot radius (side view)
const wheelX = t => lerp(540, 70, K.sm(t, 0.1, 2.5));
const notchX = t => lerp(560, 60, K.sm(t, 1.9, 2.9));
function workshop(c, t) {
  PIX.vgrad(c, -700, -300, 1500, 1100, [[0, 'g1'], [0.45, 'g0'], [1, 'k']]);
  for (let x = -700; x < 800; x += 50) K.panel(c, x, -300, 4, 640, 'g2', 'g0', 'g2');
  for (let x = -700; x < 800; x += 120) { K.panel(c, x + 10, 40, 70, 260, 'g0', 'k', 'g1', { seams: 4 }); K.blink(c, x + 20, 60, x % 240 ? 'c1' : 'y0', t, 0.7, x * 0.01); }
  PIX.rect(c, -700, 330, 1500, 500, 'g0'); PIX.rect(c, -700, 330, 1500, 2, 'g2');
  for (let x = -700; x < 800; x += 12) PIX.rect(c, x, 336, 6, 4, 'y0');                       // floor safety stripe
  for (let x = -700; x < 800; x += 40) PIX.rect(c, x, 344, 1, 400, 'k', 0.6);
}
function grinder(c, t) {
  K.panel(c, -10, 290, 620, 60, 'g1', 'g0', 'g2', { rivets: true, seams: 2 });      // machine bed
  K.panel(c, -20, 150, 56, 140, 'g2', 'g1', 'g3', { rivets: true }); K.panel(c, 566, 160, 50, 130, 'g2', 'g1', 'g3', { rivets: true });
  const wx = wheelX(t), nx = notchX(t);
  // ingot: rough (as-grown ridges) ahead of the wheel, ground smooth behind it
  const body = PIX.rectPath(40, 200 - IR, 526, 2 * IR, 2);
  PIX.flat(c, body, 'g3', 'g1', 'g5', [0, 10], [0, 3]);
  c.save(); c.clip(body);
  for (let x = 40; x < wx; x += 9) PIX.rect(c, x, 200 - IR, 3, 2 * IR, 'g2', 0.5);                        // unground: ridged surface
  PIX.rect(c, 40, 200 - IR - 1, Math.max(0, wx - 40), 3, 'g2');
  for (let y = 0; y < 3; y++) { const ph = K.wrap(t * 1.4 + y / 3, 1); PIX.rect(c, wx, Math.round(200 - IR + ph * 2 * IR), 566 - wx, 1, 'g5', Math.sin(ph * Math.PI) * 0.7); }  // rotation streaks
  if (nx < 560) PIX.rect(c, nx, 200 - IR + 1, 560 - nx, 3, 'k');                                          // notch groove
  c.restore();
  // grinding wheel + coolant
  PIX.glow(c, wx, 200 - IR, 30, 'c2', 0.35);
  K.panel(c, wx - 8, -60, 16, 92, 'g2', 'g1', 'g3');
  PIX.flat(c, PIX.circPath(wx, 200 - IR - 50, 52), 'g2', 'g1', 'g4', [4, 4], [2, 2]);
  for (let s = 0; s < 6; s++) { const a = t * 18 + s * TAU / 6; PIX.line(c, wx, 200 - IR - 50, wx + Math.cos(a) * 44, 200 - IR - 50 + Math.sin(a) * 44, 'g1', 2); }
  PIX.circ(c, wx, 200 - IR - 50, 9, 'g3');
  K.sparks(c, t, { x: wx + 6, y: 200 - IR - 2, n: 30, rate: 50, life: 0.6, speed: 80, ang: -0.5, spread: 1.2, g: 140, seed: 21, cols: ['c3', 'c2', 'c1', 'c0'] });
  // notch wheel
  if (t > 1.8 && t < 3.1) { PIX.flat(c, PIX.circPath(nx, 200 - IR - 10, 10), 'g4', 'g2', 'g5', [2, 2]); PIX.line(c, nx, 200 - IR - 10, nx + Math.cos(t * 30) * 8, 200 - IR - 10 + Math.sin(t * 30) * 8, 'g1', 1.5); K.sparks(c, t, { x: nx, y: 200 - IR, n: 12, rate: 40, life: 0.4, speed: 50, ang: -2.6, spread: 1, g: 100, seed: 4, cols: ['c3', 'c2'] }); }
}
const SAWX = -300;                                                 // the wire saw lives left of the grinder
const ingotY = t => lerp(190, 280, K.sm(t, 3.4, 6.3));
const WIREY = 234;
function wireSaw(c, t) {
  const yc = ingotY(t);
  K.panel(c, SAWX - 190, 300, 380, 50, 'g1', 'g0', 'g2', { rivets: true });
  // beam + glue plate holding the ingot from above
  K.panel(c, SAWX - 140, yc - IR - 22, 280, 12, 'g2', 'g1', 'g3'); PIX.rect(c, SAWX - 130, yc - IR - 10, 260, 10, 's3');
  PIX.rect(c, SAWX - 10, -300, 20, yc - IR - 22 + 300, 'g2');
  // ingot with kerfs below the wire plane
  const body = PIX.rectPath(SAWX - 130, yc - IR, 260, 2 * IR, 1);
  PIX.flat(c, body, 'g3', 'g1', 'g5', [0, 10], [0, 3]);
  c.save(); c.clip(body);
  PIX.rect(c, SAWX - 130, yc - IR + 1, 260, 3, 'k');                  // notch
  const cutTop = WIREY;
  if (yc + IR > cutTop) for (let x = SAWX - 128; x < SAWX + 130; x += 4) PIX.rect(c, x, cutTop, 1, yc + IR - cutTop + 2, 'k');
  c.restore();
  // guide rollers (reciprocating) and the wire web
  const dir = Math.sin(t * Math.PI * 1.0) > 0 ? 1 : -1, spin = Math.cos(t * Math.PI * 1.0) / Math.PI * 30;
  for (const rx of [SAWX - 168, SAWX + 168]) {
    PIX.flat(c, PIX.circPath(rx, WIREY + 26, 28), 'g2', 'g1', 'g4', [3, 3]);
    for (let r = 8; r < 28; r += 5) { c.save(); c.strokeStyle = P.g1; c.lineWidth = 1; c.beginPath(); c.arc(rx, WIREY + 26, r, 0, TAU); c.stroke(); c.restore(); }
    PIX.line(c, rx, WIREY + 26, rx + Math.cos(spin) * 24, WIREY + 26 + Math.sin(spin) * 24, 'g4', 2);
  }
  for (let x = SAWX - 168; x <= SAWX + 168; x += 2) {                  // top span: bright, travelling dashes show the wire racing
    const on = K.wrap(Math.floor(x / 2) + Math.floor(t * 40) * dir, 4) < 2;
    PIX.rect(c, x, WIREY, 2, 1, on ? 'w' : 'g4'); PIX.rect(c, x, WIREY + 52, 2, 1, on ? 'g4' : 'g2');
  }
  if (yc + IR > WIREY - 2) K.sparks(c, t, { x: SAWX, y: WIREY, n: 26, rate: 40, life: 0.5, speed: 70, ang: dir > 0 ? -0.3 : -2.8, spread: 0.8, g: 120, seed: 9, cols: ['c3', 'c2', 'g4'] });
  for (let d = 0; d < 7; d++) { const q = K.wrap(t * 1.5 + d / 7, 1); PIX.rect(c, SAWX - 120 + d * 38, Math.round(WIREY - 40 + q * 36), 1, 2, 'c2', 1 - q); }   // coolant drips
}
function sawLens(c, R, t) {                                         // the ingot face with one wire cutting up through it
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n1');
  const cut = K.sm(t, 3.6, 6.4), r = R * 0.72, wy = r - cut * 2 * r;
  PIX.flat(c, PIX.circPath(0, 0, r), 'g3', 'g1', 'g5', [4, 4], [2, 2]);
  PIX.rect(c, -1, wy, 2, r - wy + 2, 'k');
  for (let x = -R; x < R; x += 2) PIX.rect(c, x, Math.round(wy), 2, 1, K.wrap(Math.floor(x / 2) + Math.floor(t * 40), 4) < 2 ? 'w' : 'g4');
  K.sparks(c, t, { x: 0, y: wy, n: 14, rate: 40, life: 0.4, speed: 40, ang: -1.57, spread: 2.6, g: 60, seed: 3, cols: ['w', 'c3', 'c2'] });
}
SC.s12_saw = {
  draw(c, lt) {
    // follow the wheel, then a quick pan left to the saw, push in on the web, then follow one wafer up
    const gx = lerp(440, 190, K.sm(lt, 0.1, 2.6)), pan = MO.cubicInOut(clamp((lt - 2.95) / 0.5));
    const push = K.inout(lt, 3.6, 5.4), up = K.inout(lt, 6.15, 7.2);
    let k = { x: lerp(gx, SAWX, pan), y: lerp(206, 236, pan), z: lerp(1.35, 1.15, pan) };
    k = { x: lerp(k.x, SAWX - 20, push), y: lerp(k.y, 244, push), z: CAM.zlerp(k.z, 1.6, push) };
    const wy = ingotY(lt) - 90 * up;
    k = { x: lerp(k.x, SAWX - 20, up), y: lerp(k.y, wy, up), z: CAM.zlerp(k.z, 2.4, up) };
    PIX.cam(c, k); workshop(c, lt); grinder(c, lt); wireSaw(c, lt);
    if (lt > 6.0) {                                               // one wafer rises out of the stack and turns toward us
      const q = clamp((lt - 6.0) / 1.0), wx = SAWX - 20, w = lerp(3, 46, MO.cubicIn(clamp((lt - 6.5) / 0.6)));
      PIX.flat(c, PIX.rectPath(wx - w / 2, wy - IR, w, 2 * IR, Math.min(w / 2, IR)), 'g4', 'g2', 'g5', [Math.max(1, w * 0.2), 0], [1, 0]);
    }
    const open = clamp((lt - 4.0) / 0.35) - clamp((lt - 6.0) / 0.3);
    if (open > 0) K.lens(c, SAWX + 40, WIREY - 10, SAWX + 22, 150, 40, open, (c, R) => sawLens(c, R, lt), 'c2');
    c.setTransform(1, 0, 0, 1, 0, 0);
    const wh = PIX.toScreen(k, wheelX(lt), 200 - IR - 50), no = PIX.toScreen(k, notchX(lt) + 30, 200 - IR + 2), kf = PIX.toScreen(k, SAWX - 80, ingotY(lt) + IR - 4);
    PIX.label(c, { ax: wh[0] - 30, ay: wh[1] - 30, tx: 12, ty: 40, text: 'CYLINDRICAL GRINDING', t0: 0.4, t1: 2.0, col: 'g5' }, lt);
    PIX.label(c, { ax: no[0], ay: no[1], tx: Math.max(12, no[0] - 20), ty: no[1] + 70, text: 'NOTCH', t0: 2.2, t1: 2.9, col: 'w' }, lt);
    PIX.label(c, { tx: 12, ty: 30, text: 'DIAMOND WIRE SAW', t0: 3.7, t1: 5.8, col: 'c3' }, lt);
    PIX.label(c, { ax: kf[0], ay: kf[1], tx: 12, ty: Math.min(440, kf[1] + 60), text: '~0.8 mm WAFERS', t0: 4.8, t1: 6.0, col: 'w' }, lt);
  },
  cues: [[-0.3, 'grind', 0.6, 0.2, 3.1], [0.4, 'type', 0.3], [2.2, 'type', 0.3], [2.95, 'whip', 0.6], ...Array.from({ length: 12 }, (_, i) => [3.5 + i * 0.25, 'saw', 0.4 + 0.05 * (i % 2), i % 2 ? 0.25 : -0.25]), [3.7, 'type', 0.3], [4.0, 'lens', 0.4], [4.8, 'type', 0.3], [6.4, 'riser', 0.5, 0, 0.8]],
};

// ================= S13 · CMP polishing, then a rinse to a mirror =================
const PC = [135, 250], PR = 122;
function polisher(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g0'], [1, 'k']]);
  K.panel(c, -40, 90, 350, 330, 'g1', 'g0', 'g2', { rivets: true });
  K.panel(c, 290, 120, 180, 270, 'g1', 'g0', 'g2', { rivets: true });
  // platen + pad (rotating grooves, slurry riding around)
  PIX.flat(c, PIX.circPath(PC[0], PC[1], PR + 6), 'g3', 'g1', 'g4', [3, 3]);
  PIX.fill(c, PIX.circPath(PC[0], PC[1], PR), 's3');
  const a = t * 1.6;
  c.save(); c.clip(PIX.circPath(PC[0], PC[1], PR));
  for (let r = 8; r < PR; r += 9) { c.save(); c.strokeStyle = P.s2; c.lineWidth = 1; c.beginPath(); c.arc(PC[0], PC[1], r, 0, TAU); c.stroke(); c.restore(); }
  for (let s = 0; s < 16; s++) { const an = a + s * TAU / 16; PIX.line(c, PC[0], PC[1], PC[0] + Math.cos(an) * PR, PC[1] + Math.sin(an) * PR, 's2', 1); }
  for (let n = 0; n < 40; n++) { const an = a + h(n, 1) * TAU, r = 20 + h(n, 2) * (PR - 26); PIX.circ(c, PC[0] + Math.cos(an) * r, PC[1] + Math.sin(an) * r, 1.5 + h(n, 3) * 2.5, 'w', 0.85); }
  c.restore();
  // slurry arm dripping
  K.panel(c, 230, 46, 14, 120, 'g2', 'g1', 'g3'); c.save(); c.translate(237, 60); c.rotate(0.75); K.panel(c, -6, 0, 12, 150, 'g3', 'g1', 'g4'); c.restore();
  const nz = [237 - Math.sin(0.75) * 150, 60 + Math.cos(0.75) * 150];
  for (let d = 0; d < 4; d++) { const q = K.wrap(t * 2 + d / 4, 1); PIX.circ(c, nz[0], nz[1] + 4 + q * 16, 1.6, 'w', 1 - q * 0.5); }
  // conditioner disk sweeping
  const ca = -0.9 + 0.5 * Math.sin(t * 1.4), cx = 10 + Math.cos(ca) * 150, cy = 440 + Math.sin(ca) * 150;
  PIX.line(c, 10, 440, cx, cy, 'g2', 8); PIX.flat(c, PIX.circPath(cx, cy, 15), 'g4', 'g2', 'g5', [2, 2]); PIX.circ(c, cx, cy, 5, 'g2');
}
function carrier(c, t, away) {
  const hx = 166 + 8 * Math.sin(t * 1.3) + 260 * away, hy = 228 - 40 * away;
  PIX.glow(c, hx, hy, 60, 'k', 0.5);
  PIX.flat(c, PIX.circPath(hx, hy, 44), 'g3', 'g1', 'g5', [5, 5], [2, 2]);
  PIX.circ(c, hx, hy, 34, 'g2'); PIX.circ(c, hx, hy, 12, 'g4');
  for (let b = 0; b < 6; b++) { const an = t * 2.2 + b * TAU / 6; PIX.circ(c, hx + Math.cos(an) * 24, hy + Math.sin(an) * 24, 2.5, 'g4'); }
  return [hx, hy];
}
function roughLens(c, R, t) {                                       // cross-section: pad + abrasive + chemistry flatten the peaks
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n0');
  const pol = K.sm(t, 1.1, 3.0), base = 8;
  const surf = x => base - (1 - pol) * (6 * Math.abs(Math.sin(x * 0.21 + 1)) + 4 * Math.abs(Math.sin(x * 0.53))) - pol * 0.4 * Math.sin(x * 0.9);
  const pts = []; for (let x = -R; x <= R; x += 2) pts.push([x, surf(x)]); pts.push([R, R], [-R, R]);
  PIX.flat(c, PIX.polyPath(pts), 'g3', 'g1', 'g5', [0, 4], [0, 1]);
  for (let x = -R; x < R; x += 3) PIX.rect(c, x, Math.round(surf(x)) - 1, 2, 1, 'c2', 0.35 + 0.4 * pol);       // chemistry softens the top layer
  PIX.rect(c, -R, -R, 2 * R, R - 8, 's2'); for (let n = 0; n < 18; n++) PIX.circ(c, -R + h(n, 1) * 2 * R, -R + h(n, 2) * (R - 14), 2, 's1');   // pad with pores
  for (let n = 0; n < 9; n++) { const x = K.wrap(h(n, 3) * 2 * R + t * 40, 2 * R) - R; PIX.circ(c, x, Math.min(-1, surf(x) - 3), 2.2, 'w'); }      // abrasive particles rolling
  K.wtext(c, pol > 0.95 ? 'FLAT' : 'ROUGH', 0, R - 18, pol > 0.95 ? 'c3' : 'o1', { align: 'center' });
}
SC.s13_polish = {
  draw(c, lt) {
    const away = MO.k75(clamp((lt - 3.2) / 0.8)), wout = K.inout(lt, 3.4, 4.6), pin = K.inout(lt, 4.6, 5.8);
    let k = { x: lerp(135, 260, wout), y: 250, z: CAM.zlerp(1, 0.78, wout) };
    k = { x: lerp(k.x, 380, pin), y: 250, z: CAM.zlerp(k.z, 1.6, pin) };
    PIX.cam(c, k); polisher(c, lt);
    // cleaning station: spin-rinse; the wafer arrives at 3.6 and becomes a mirror
    const arrive = MO.k75(clamp((lt - 3.3) / 0.9)), wx = lerp(430, 380, arrive), wa = lt * 3;
    PIX.flat(c, PIX.circPath(380, 250, 62), 'g2', 'g1', 'g3', [3, 3]); PIX.circ(c, 380, 250, 56, 'n1');
    if (lt > 3.3) {
      K.wafer(c, wx, 250, 48, { sheen: clamp((lt - 4.9) / 0.9), bg: 'n1' });
      for (let r = 0; r < 3; r++) { const an = wa + r * TAU / 3; PIX.circ(c, wx + Math.cos(an) * 30, 250 + Math.sin(an) * 30, 1.5, 'g5', 0.8); }
      if (lt < 5.2) for (const [nx, ny, ang] of [[330, 196, 0.8], [432, 196, 2.3]]) { PIX.rect(c, nx - 4, ny - 8, 8, 8, 'g3'); for (let d = 0; d < 10; d++) { const q = K.wrap(lt * 3 + d / 10, 1); PIX.rect(c, Math.round(nx + Math.cos(ang) * q * 50), Math.round(ny + Math.sin(ang) * q * 50), 2, 2, 'c2', 1 - q * 0.6); } }
    }
    const [hx, hy] = carrier(c, lt, away);
    const open = clamp((lt - 0.7) / 0.35) - clamp((lt - 3.1) / 0.3);
    if (open > 0) K.lens(c, hx - 20, hy + 10, 76, 128, 54, open, (c, R) => roughLens(c, R, lt), 'c2');
    c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: W / 2, ty: 26, text: 'CHEMICAL-MECHANICAL POLISHING', t0: 0.6, t1: 3.2, col: 'w', align: 'center' }, lt);
    const wf = PIX.toScreen(k, 380, 250 + 40);
    PIX.label(c, { ax: wf[0], ay: wf[1], tx: W / 2, ty: Math.min(440, wf[1] + 60), text: 'MIRROR-SMOOTH: < 0.2 nm', t0: 4.9, t1: 5.9, col: 'c3', align: 'center', lineCol: 'c2' }, lt);
  },
  cues: [[-0.4, 'polish', 0.6, 0, 3.8], [0.6, 'type', 0.3], [0.7, 'lens', 0.4], [3.2, 'servo', 0.5, 0.3], [3.6, 'spray', 0.55, 0.2, 1.8], [4.9, 'type', 0.3], [5.2, 'glint', 0.6]],
};
})();
