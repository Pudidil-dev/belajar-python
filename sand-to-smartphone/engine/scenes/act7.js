// ACT 7 — test, dice, package, solder (S25–S28)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// shared: the die grid of the finished wafer
const DIE = 13, WRAD = 112;
const DIES = []; for (let j = -9; j <= 9; j++) { const row = []; for (let i = -9; i <= 9; i++) if (Math.hypot(Math.abs(i) * DIE + DIE / 2, Math.abs(j) * DIE + DIE / 2) < WRAD - 3) row.push([i, j]); DIES.push(...(j % 2 ? row.reverse() : row)); }
const isGood = (i, j) => h(i + 40, j + 40) > 0.11;
const GOOD = [2, -1];                                               // the die we follow from here on

// ================= S25 · wafer probe test =================
const STEP = 0.125;
function prober(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g1'], [1, 'g0']]);
  // side view (top): probe card needles touch the pads of the die under test, once per step
  K.panel(c, 10, 40, 250, 30, 't1', 't0', 't2', { rivets: true }); for (let x = 20; x < 250; x += 9) PIX.rect(c, x, 52, 5, 2, 'y0');
  const ph = (t / STEP) % 1, down = t < 0.3 ? 0 : Math.max(0, Math.sin(ph * Math.PI)), gap = 12 * (1 - down);
  const n = Math.floor(t / STEP), cur = DIES[Math.min(DIES.length - 1, Math.max(0, n))], pass = cur && isGood(cur[0], cur[1]);
  PIX.rect(c, 30, 150, 210, 18, 'g3'); PIX.rect(c, 30, 150, 210, 2, 'g5');                         // die (side) on the chuck
  for (let p = 0; p < 10; p++) { const x = 42 + p * 20; PIX.rect(c, x - 3, 147, 7, 3, 'y0'); }
  PIX.rect(c, 20, 168, 230, 14, 'g2');
  for (let p = 0; p < 10; p++) {                                    // cantilever needles
    const x = 42 + p * 20, ty = 146 - gap;
    PIX.line(c, x + 10, 70, x + 10, 110, 'g4', 2); PIX.line(c, x + 10, 110, x, ty, 'g5', 1);
    if (down > 0.85) { PIX.glow(c, x, ty, 6, pass ? 'c1' : 'r2', 0.8); K.flow(c, [[x, ty], [x + 10, 110], [x + 10, 70]], t, { gap: 8, speed: 120, col: pass ? 'c3' : 'o1' }); }
  }
  // result lamp
  if (down > 0.85 && cur) { PIX.circ(c, 245, 100, 7, pass ? 'c1' : 'r2'); PIX.glow(c, 245, 100, 16, pass ? 'c1' : 'r2', 0.7); } else PIX.circ(c, 245, 100, 7, 'g2');
  // wafer map (bottom): dies turn pass/fail in serpentine order
  K.panel(c, 4, 196, 262, 270, 'g1', 'g0', 'g2', { rivets: true });
  K.wafer(c, 135, 330, WRAD, { bg: 'g1', dies: 1, iri: 0, die: DIE, mark: (i, j) => { const idx = DIES.findIndex(([a, b]) => a === i && b === j); if (idx < 0) return null; const tested = idx < n || t > 4.0; return tested ? (isGood(i, j) ? 'c1' : 'r2') : null; } });
  for (const [i, j] of DIES) if (!isGood(i, j) && (DIES.findIndex(([a, b]) => a === i && b === j) < n || t > 4.0)) { const x = 135 + i * DIE, y = 330 + j * DIE; PIX.line(c, x - 3, y - 3, x + 3, y + 3, 'w', 1); PIX.line(c, x + 3, y - 3, x - 3, y + 3, 'w', 1); }
  if (cur && t < 4.0) { const [i, j] = cur; PIX.rect(c, 135 + i * DIE - DIE / 2, 330 + j * DIE - DIE / 2, DIE + 1, DIE + 1, 'w', 0.8); }
}
SC.s25_probe = {
  draw(c, lt) {
    const push = K.inout(lt, 3.9, 5.2);
    const k = { x: lerp(135, 135 + GOOD[0] * DIE, push), y: lerp(250, 330 + GOOD[1] * DIE, push), z: CAM.zlerp(1, 2.6, push) };
    PIX.cam(c, k); prober(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 14, text: 'WAFER PROBE TEST', t0: 0.3, t1: 2.4, col: 'w' }, lt);
    PIX.label(c, { tx: W / 2, ty: 186, text: 'PASS / FAIL', t0: 1.6, t1: 3.9, col: 'c3', align: 'center' }, lt);
    if (lt > 4.2) { const g = PIX.toScreen(k, 135 + GOOD[0] * DIE, 330 + GOOD[1] * DIE); PIX.label(c, { ax: g[0], ay: g[1] - 14, tx: g[0] - 40, ty: g[1] - 80, text: 'GOOD DIE', t0: 4.2, t1: 5.2, col: 'c3', lineCol: 'c2' }, lt); }
  },
  cues: [[0, 'prober', 0.4, 0, 5.0], ...Array.from({ length: 30 }, (_, i) => [0.3 + i * STEP, 'probe', 0.35, (i % 2) * 0.4 - 0.2, i]), [0.3, 'type', 0.3], [1.6, 'type', 0.3], [4.2, 'type', 0.3]],
};

// ================= S26 · dicing on blue tape, then the known-good die is picked =================
function dicing(c, t) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g1'], [1, 'g0']]);
  PIX.flat(c, PIX.circPath(135, 250, 132), 'g3', 'g1', 'g4', [3, 3]); PIX.circ(c, 135, 250, 124, 'b1'); PIX.circ(c, 135, 250, 124, 'b2', 0.35);   // frame ring + blue tape
  const spread = 1 + 0.25 * K.sm(t, 2.6, 3.2);                       // tape expansion separates the dies
  const cuts = clamp((t - 0.2) / 2.3) * 2;                           // 0..1 horizontal streets, 1..2 vertical
  c.save(); c.clip(PIX.circPath(135, 250, WRAD));
  PIX.circ(c, 135, 250, WRAD, 'b1');
  DIES.forEach(([i, j]) => {
    const x = 135 + i * DIE * spread, y = 250 + j * DIE * spread, good = isGood(i, j), me = i === GOOD[0] && j === GOOD[1];
    if (me && t > 3.4) return;                                        // picked
    PIX.flat(c, PIX.rectPath(x - DIE / 2, y - DIE / 2, DIE - 1, DIE - 1, 0), 'g4', 'g2', 'g5', [1, 1]);
    PIX.rect(c, x - DIE / 2 + 2, y - DIE / 2 + 2, DIE - 5, DIE - 5, [ 'c1', 'p3', 'y0'][((i + j) % 3 + 3) % 3], 0.45);
    if (!good) PIX.circ(c, x, y, 2, 'r2');
  });
  c.restore();
  // kerfs already cut
  const hc = Math.min(1, cuts), vc = Math.max(0, cuts - 1);
  for (let j = -9; j <= 9; j++) { const y = 250 + (j + 0.5) * DIE * spread; if (j / 18 + 0.5 < hc && spread < 1.01) PIX.rect(c, 135 - WRAD, Math.round(y) - 1, 2 * WRAD, 1, 'n2'); }
  for (let i = -9; i <= 9; i++) { const x = 135 + (i + 0.5) * DIE * spread; if (i / 18 + 0.5 < vc && spread < 1.01) PIX.rect(c, Math.round(x) - 1, 250 - WRAD, 1, 2 * WRAD, 'n2'); }
  // the blade (seen from above as a bright edge) with coolant spray
  if (t > 0.2 && t < 2.5) {
    const k2 = cuts < 1 ? cuts : cuts - 1, street = Math.floor(k2 * 19) - 9, q = (k2 * 19) % 1;
    // the spinning blade seen edge-on from above: a long bright bar with its flange hub
    const blade = (x, y, vert) => { const L = 46, T = 4; PIX.glow(c, x, y, 24, 'c2', 0.6); if (vert) { PIX.rect(c, x - T / 2, y - L / 2, T, L, 'g5'); PIX.rect(c, x - 7, y - 10, 14, 20, 'g3'); PIX.rect(c, x - 7, y - 10, 14, 2, 'g4'); } else { PIX.rect(c, x - L / 2, y - T / 2, L, T, 'g5'); PIX.rect(c, x - 10, y - 7, 20, 14, 'g3'); PIX.rect(c, x - 10, y - 7, 20, 2, 'g4'); } };
    if (cuts < 1) { const y = 250 + (street + 0.5) * DIE, x = 135 - WRAD + q * 2 * WRAD; blade(x, y, false); K.sparks(c, t, { x: x + 22, y, n: 14, rate: 50, life: 0.3, speed: 60, ang: 0, spread: 1.0, g: 0, seed: 7, cols: ['c3', 'c2'] }); }
    else { const x = 135 + (street + 0.5) * DIE, y = 250 - WRAD + q * 2 * WRAD; blade(x, y, true); K.sparks(c, t, { x, y: y + 22, n: 14, rate: 50, life: 0.3, speed: 60, ang: Math.PI / 2, spread: 1.0, g: 0, seed: 8, cols: ['c3', 'c2'] }); }
  }
  // pick: ejector pin pushes up, the vacuum collet descends, lifts the die toward us
  if (t > 3.0) {
    const gx = 135 + GOOD[0] * DIE * spread, gy = 250 + GOOD[1] * DIE * spread, lift = MO.k75(clamp((t - 3.4) / 1.4));
    const col = clamp((t - 3.0) / 0.4);
    PIX.rect(c, gx - 4, lerp(-40, gy - 18, col) - lift * 60, 8, 16, 'g4'); PIX.rect(c, gx - 10, lerp(-60, gy - 30, col) - lift * 60, 20, 14, 'g3');
    if (t > 3.4) { const s = 1 + lift * 1.4; PIX.glow(c, gx, gy - lift * 60, 14 * s, 'c1', 0.4); PIX.flat(c, PIX.rectPath(gx - DIE * s / 2, gy - lift * 60 - DIE * s / 2, DIE * s, DIE * s, 1), 'g4', 'g2', 'g5', [2, 2]); PIX.rect(c, gx - DIE * s / 2 + 2, gy - lift * 60 - DIE * s / 2 + 2, DIE * s - 4, DIE * s - 4, 'c1', 0.45); }
  }
}
SC.s26_dicing = {
  draw(c, lt) {
    const pan = K.inout(lt, 0.2, 2.5), push = K.inout(lt, 3.0, 5.0);
    let k = { x: lerp(110, 160, pan), y: 250, z: 1.15 };
    k = { x: lerp(k.x, 135 + GOOD[0] * DIE * 1.25, push), y: lerp(250, 250 + GOOD[1] * DIE * 1.25 - 60, push), z: CAM.zlerp(1.15, 2.4, push) };
    PIX.cam(c, k); dicing(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 24, text: 'DICING SAW', t0: 0.3, t1: 2.4, col: 'w' }, lt);
    PIX.label(c, { tx: 12, ty: 36, text: 'DIES ON BLUE TAPE', t0: 0.7, t1: 2.4, col: 'b2' }, lt);
    PIX.label(c, { tx: W / 2, ty: 430, text: 'KNOWN-GOOD DIE', t0: 3.6, t1: 4.9, col: 'c3', align: 'center' }, lt);
  },
  cues: [[0.2, 'dicing', 0.55, -0.2, 2.3], ...Array.from({ length: 18 }, (_, i) => [0.25 + i * 0.125, 'slice', 0.3, (i % 2) * 0.4 - 0.2]), [0.3, 'type', 0.3], [2.6, 'stretch', 0.4], [3.0, 'pick', 0.6], [3.4, 'lift', 0.5, 0, 1.2], [3.6, 'type', 0.3]],
};

// ================= S27 · flip-chip packaging, underfill, memory on top (PoP), solder balls =================
function packaging(c, t, k) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'n1'], [1, 'n0']]);
  for (let x = -300; x < 600; x += 30) PIX.rect(c, x, -300, 1, 1100, 'n2', 0.6);
  // bond head: carries the flipped die down onto the substrate, then lifts away
  const hd = t < 1.9 ? lerp(150, 278, MO.k75(clamp((t - 1.0) / 0.7))) - 16 : lerp(262, 40, MO.k75(clamp((t - 1.9) / 0.6)));
  if (t > 0.9 && t < 2.6) { K.panel(c, 110, -300, 50, hd - 10 + 300, 'g2', 'g1', 'g3', { seams: 8 }); PIX.flat(c, PIX.rectPath(96, hd - 12, 78, 12, 2), 'g3', 'g1', 'g4', [2, 2]); PIX.glow(c, 135, hd - 2, 30, 'o0', 0.3 * clamp((t - 1.6) / 0.3)); }
  const flip = clamp((t - 0.2) / 0.8), place = MO.k75(clamp((t - 1.0) / 0.7)), reflow = K.sm(t, 1.8, 2.3), under = K.sm(t, 2.3, 3.0), mem = MO.k75(clamp((t - 3.1) / 0.8)), mold = K.sm(t, 4.0, 4.6), balls = K.sm(t, 4.4, 5.0);
  // package substrate: laminate with copper routing layers and top pads
  PIX.flat(c, PIX.rectPath(20, 300, 230, 34, 2), 't1', 't0', 't2', [3, 3]);
  for (let l = 0; l < 3; l++) for (let x = 26; x < 244; x += 14) PIX.rect(c, x + (l % 2) * 6, 306 + l * 9, 8, 2, 'u1');
  for (let x = 70; x < 200; x += 10) PIX.rect(c, x, 298, 6, 2, 'y0');
  for (const x of [28, 40, 228, 240]) PIX.rect(c, x, 296, 6, 4, 'y0');
  // die: flips over (bumps from up to down), then drops onto the pads
  const sy = Math.cos(flip * Math.PI), dy = lerp(150, 278, place), dieH = 16;
  c.save(); c.translate(135, dy); c.scale(1, Math.abs(sy) < 0.08 ? 0.08 : Math.abs(sy));
  PIX.flat(c, PIX.rectPath(-64, -dieH / 2, 128, dieH, 1), 'g3', 'g1', 'g5', [3, 3]);
  PIX.rect(c, -60, (sy > 0 ? -1 : 1) * dieH / 2 - 1, 120, 2, 'c1', 0.6);
  c.restore();
  for (let x = 72; x < 200; x += 10) {                               // micro-bumps (copper pillars + solder)
    const by = sy > 0 ? dy - dieH / 2 * sy - 3 : dy + dieH / 2 * -sy + 1;
    if (flip > 0.45 && flip < 0.55) continue;
    const slump = reflow * 1.5;
    PIX.rect(c, x, Math.round(by), 5, Math.max(1, 3 - slump), reflow > 0 && reflow < 1 ? 'y1' : 'g5');
  }
  if (reflow > 0 && reflow < 1) PIX.glow(c, 135, 290, 90, 'o0', 0.5 * Math.sin(reflow * Math.PI));
  if (under > 0) PIX.rect(c, 135 - 66 * under, 286, 132 * under, 12, 'g4', 0.8);      // underfill wicks in by capillary action
  // memory package stacked on top (package-on-package)
  if (mem > 0) {
    const my = lerp(60, 240, mem);
    PIX.flat(c, PIX.rectPath(22, my - 22, 226, 24, 3), 'g0', 'k', 'g2', [3, 3]);
    const [lx, ly] = PIX.toScreen(k, 135, my - 14); PIX.text(c, 'LPDDR MEMORY', lx, ly, 'g3', { align: 'center', shadow: null });
    PIX.flat(c, PIX.rectPath(24, my + 2, 222, 8, 1), 't1', 't0', 't2', [0, 2]);
    for (const x of [30, 46, 224, 240]) PIX.circ(c, x, my + 14, 5, 'g5');
  }
  if (mold > 0) PIX.rect(c, 60, 300 - 34 * mold, 150, 34 * mold - 4 > 0 ? 34 * mold - 4 : 0, 'k', 0.85);
  for (let x = 30; x < 245; x += 14) { const r = 5 * balls; if (r > 0.5) { PIX.circ(c, x, 341, r, 'g4'); PIX.rect(c, Math.round(x - r * 0.4), Math.round(339 - r * 0.4), 1, 1, 'w'); } }   // BGA balls underneath
}
SC.s27_package = {
  draw(c, lt) {
    const push = K.inout(lt, 0, 3.0), out = K.inout(lt, 4.8, 6.2);
    let k = { x: 135, y: lerp(240, 270, push), z: CAM.zlerp(1.3, 1.6, push) };
    k = { x: 135, y: lerp(k.y, 280, out), z: CAM.zlerp(k.z, 1.0, out) };
    PIX.cam(c, k); packaging(c, lt, k); c.setTransform(1, 0, 0, 1, 0, 0);
    const S = (x, y) => PIX.toScreen(k, x, y);
    const L = [['FLIP-CHIP', 190, 150 + 128 * MO.k75(clamp((lt - 1.0) / 0.7)), 168, 60, 0.3, 1.9, 'g5', 'g4'], ['SUBSTRATE', 40, 320, 14, 430, 1.3, 2.9, 't2', 't2'], ['UNDERFILL', 120, 292, 120, 430, 2.3, 3.4, 'g5', 'g4'],
      ['MEMORY (PoP)', 210, 220, 160, 90, 3.3, 4.7, 'g5', 'g4'], ['SOLDER BALLS', 58, 342, 14, 440, 4.5, 5.9, 'g5', 'g4']];
    for (const [txt, ax, ay, tx, ty, t0, t1, col, lc] of L) { const [sx, sy] = S(ax, ay); PIX.label(c, { ax: sx, ay: sy, tx, ty, text: txt, t0, t1, col, lineCol: lc }, lt); }
  },
  cues: [[0.2, 'flip', 0.6], [0.3, 'type', 0.3], [1.0, 'place_click', 0.8, 0, 0.7], [1.3, 'type', 0.25], [1.8, 'reflow', 0.5, 0, 0.6], [2.3, 'underfill', 0.4, 0, 0.7], [2.3, 'type', 0.25], [3.1, 'servo', 0.4], [3.85, 'place_click', 0.8, 0, 0.6], [3.3, 'type', 0.3], [4.0, 'mold', 0.4, 0, 0.6], [4.4, 'balls', 0.5], [4.5, 'type', 0.3], [4.8, 'whoosh_out', 0.4, 0, 1.0]],
};

// ================= S28 · the phone board: paste, pick-and-place, reflow =================
const PKG = [118, 196, 54];                                          // processor footprint on the board (x, y, size)
const PARTS = []; for (let n = 0; n < 34; n++) PARTS.push([18 + h(n, 1) * 220, 96 + h(n, 2) * 300, 4 + Math.floor(h(n, 3) * 3) * 4, 3 + Math.floor(h(n, 4) * 2) * 3, n]);
function board(c, t, k) {
  PIX.vgrad(c, -300, -300, 900, 1100, [[0, 'g1'], [1, 'g0']]);
  for (let x = -300; x < 600; x += 8) PIX.rect(c, x, 470, 4, 2, 'y0');
  // the motherboard: dense, dark solder mask with gold pads and copper traces
  PIX.flat(c, PIX.rectPath(10, 84, 250, 330, 10), 'n2', 'n1', 'n3', [4, 4], [1, 1]);
  for (let n = 0; n < 60; n++) { const y = 94 + h(n, 5) * 310, x0 = 16 + h(n, 6) * 160; PIX.rect(c, x0, y, 20 + h(n, 7) * 70, 1, 't2', 0.6); }
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) PIX.rect(c, PKG[0] + 4 + i * 6, PKG[1] + 4 + j * 6, 3, 3, 'y0');      // BGA footprint
  const paste = clamp((t - 0.2) / 0.9);
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((PKG[0] + 4 + i * 6 - 10) / 250 < paste) PIX.rect(c, PKG[0] + 4 + i * 6, PKG[1] + 4 + j * 6, 3, 3, 'g4');
  // other components land in quick succession
  for (const [x, y, w, hh, n] of PARTS) {
    if (Math.abs(x - PKG[0] - 27) < 40 && Math.abs(y - PKG[1] - 27) < 40) continue;
    const ap = 1.8 + n * 0.022; if (t < ap) { PIX.rect(c, x, y, w, 1, 'y0'); continue; }
    const s = K.pop(t, ap, 0.18); PIX.flat(c, PIX.rectPath(x, y + (1 - s) * -6, w, hh, 0), n % 4 ? 'g2' : 's1', 'g1', 'g4', [1, 1]);
  }
  K.panel(c, 30, 330, 70, 40, 'g3', 'g1', 'g4'); const [px_, py_] = PIX.toScreen(k, 65, 346); PIX.text(c, 'PMIC', px_, py_, 'g1', { align: 'center', shadow: null });   // shield cans
  K.panel(c, 190, 120, 54, 70, 'g3', 'g1', 'g4');
  // squeegee sweeping paste through the stencil
  if (t < 1.3) { const x = lerp(0, 270, paste); PIX.rect(c, x - 2, 80, 5, 340, 'g5'); PIX.rect(c, x - 2, 80, 5, 4, 'w'); }
  // pick-and-place nozzle brings the processor package, vision flash, click
  const pl = MO.k75(clamp((t - 1.2) / 0.6)), py = lerp(-80, PKG[1], pl);
  if (t > 1.0) {
    if (t < 2.4) { PIX.rect(c, PKG[0] + 22, py - 120, 10, 120, 'g4'); PIX.rect(c, PKG[0] + 18, py - 8, 18, 8, 'g3'); }
    PIX.flat(c, PIX.rectPath(PKG[0], py, PKG[2], PKG[2], 3), 'g0', 'k', 'g2', [3, 3]); PIX.rect(c, PKG[0] + 6, py + 6, PKG[2] - 12, 2, 'g1');
    if (t > 1.75 && t < 1.95) { const a = 1 - (t - 1.75) / 0.2; PIX.rect(c, PKG[0] - 8, PKG[1] + 26, PKG[2] + 16, 1, 'c2', a); PIX.rect(c, PKG[0] + 26, PKG[1] - 8, 1, PKG[2] + 16, 'c2', a); }
  }
  // reflow: a hot band sweeps across the board
  const rf = clamp((t - 2.7) / 1.8);
  if (rf > 0 && rf < 1) { const x = lerp(-80, 350, rf); PIX.glow(c, x, 250, 130, 'o0', 0.55); PIX.rect(c, x - 40, 84, 80, 330, 'o0', 0.25); }
}
function jointLens(c, R, t) {                                       // a solder ball melting into a joint
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'n0');
  const m = K.sm(t, 3.1, 3.9);
  PIX.rect(c, -R, -R, 2 * R, 18, 'g0'); PIX.rect(c, -10, -R + 18, 20, 3, 'y0');         // package + pad
  PIX.rect(c, -R, R - 18, 2 * R, 18, 'n2'); PIX.rect(c, -12, R - 21, 24, 3, 'y0');      // PCB + pad
  const top = -R + 21, bot = R - 21, cy = (top + bot) / 2, rx = lerp(11, 14, m), ry = lerp(11, (bot - top) / 2, m);
  c.save(); c.translate(0, cy); c.scale(rx / 11, ry / 11); K.ball(c, 0, 0, 11, m > 0.2 && m < 0.95 ? 'o1' : 'g4', m > 0.2 && m < 0.95 ? 'o0' : 'g2', 'w'); c.restore();
  if (m > 0.2 && m < 0.95) PIX.glow(c, 0, cy, 26, 'o0', 0.5);
  K.wtext(c, m > 0.95 ? 'JOINT' : m > 0.2 ? 'MELTING' : 'SOLDER BALL', 0, R - 12, 'w', { align: 'center' });
}
SC.s28_reflow = {
  draw(c, lt) {
    const push = K.inout(lt, 0.9, 2.0), out = K.inout(lt, 4.6, 6.2);
    let k = { x: lerp(135, PKG[0] + 27, push), y: lerp(250, PKG[1] + 27, push), z: CAM.zlerp(1, 1.8, push) };
    k = { x: lerp(k.x, 135, out), y: lerp(k.y, 250, out), z: CAM.zlerp(k.z, 0.85, out) };
    PIX.cam(c, k); board(c, lt, k);
    const open = clamp((lt - 2.9) / 0.35) - clamp((lt - 4.7) / 0.3);
    if (open > 0) K.lens(c, PKG[0] + 50, PKG[1] + 50, 178, 296, 40, open, (c, R) => jointLens(c, R, lt), 'o1');   // below the package, fully in frame at z 1.8
    c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 24, text: 'SOLDER PASTE', t0: 0.25, t1: 1.3, col: 'g4' }, lt);
    PIX.label(c, { tx: 12, ty: 24, text: 'PICK & PLACE', t0: 1.4, t1: 2.6, col: 'w' }, lt);
    PIX.label(c, { tx: 12, ty: 24, text: 'REFLOW ~245 °C', t0: 2.8, t1: 4.8, col: 'o1' }, lt);
  },
  cues: [[0.2, 'squeegee', 0.5, -0.3, 1.0], [0.25, 'type', 0.3], [1.2, 'servo', 0.4], [1.75, 'flash_cam', 0.4], [1.8, 'place_click', 0.9], ...Array.from({ length: 12 }, (_, i) => [1.95 + i * 0.0625, 'tiny_click', 0.25, (i % 2) * 0.6 - 0.3]), [1.4, 'type', 0.3], [2.7, 'reflow', 0.6, 0, 1.8], [2.8, 'type', 0.3], [2.9, 'lens', 0.4], [4.6, 'whoosh_out', 0.4, 0, 1.4]],
};
})();
