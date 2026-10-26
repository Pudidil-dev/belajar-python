'use strict';
// ============================================================================
// SCENE COMPOSITOR: which world is on screen, and the lens portals that join
// them (the next world opens inside a growing circle exactly where the
// camera dives; on the way out it closes back onto the same spot).
// ============================================================================
const LENS_R = 300;
function lensComposite(drawInner, cx, cy, r) {
  if (r <= 0.5) return;
  if (r >= LENS_R) { drawInner(); return; }
  withBuffer(FEEDBUF, drawInner);
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, h = r * r - dy * dy; if (h < 0) continue;
    const s = Math.sqrt(h), a = Math.max(0, Math.ceil(cx - s - 0.5)), b = Math.min(W - 1, Math.floor(cx + s - 0.5));
    for (let x = a; x <= b; x++) buf[y * W + x] = FEEDBUF[y * W + x];
  }
  ring(cx, cy, r + 1, 2, P.C4); ring(cx, cy, r + 3, 1, P.SUB, 0.5);
}
const lensIn = (t, a, b) => LENS_R * ein(seg(t, a, b));
const lensOut = (t, a, b) => LENS_R * ein(1 - seg(t, a, b));
// ---------------------------------------------------------------- s14: the same reaction at low and high glucose
const SPLIT_N = [{ glu: 3, med: 3, cur: 0.22, lvl: 0.27 }, { glu: 11, med: 10, cur: 1, lvl: 0.82 }];
function splitPanel(side, t) {
  const S = SPLIT_N[side], x0 = side ? 137 : 0, x1 = side ? W : 133, cxs = (x0 + x1) / 2;
  const cam = new Cam(30, 0, 1.7, cxs, 236);
  withBuffer(TMPBUF, () => {
    solutionBG(cam, t + side * 7);
    goldWall(cam, t, S.cur);
    drawEnzymeR(cam, 60, -78, t, { grip: 0.5 + 0.5 * Math.sin(t * 4 + side), ph: 1 });
    drawEnzymeR(cam, 66, 40, t, { grip: 0.5 + 0.5 * Math.sin(t * 4 + 2 + side), ph: 2 });
    for (let i = 0; i < S.glu; i++) { const a = hash(i + 40 + side * 50), x = 24 + 46 * hash(i + 41 + side * 50) + 6 * Math.sin(t * 1.4 + i), y = -120 + 200 * a + 8 * Math.cos(t * 1.2 + i); glucoseR(cam, x, y, 4.4, t * 0.7 + i, {}); }
    for (let i = 0; i < S.med; i++) {
      const per = 1.1 + 0.6 * hash(i + 90 + side * 30), ph = ((t / per) + hash(i + 91 + side * 30)) % 1, y = -130 + 260 * ((i + 0.5) / S.med) + 5 * Math.sin(t + i);
      const go = ph < 0.55, x = go ? lerp(48, 5, smooth(ph / 0.55)) : lerp(5, 48, smooth((ph - 0.55) / 0.45));
      if (!go && ph < 0.62) electronR(cam, lerp(4, -4, (ph - 0.55) / 0.07), y, 1.7, 1);
      mediatorR(cam, x, y, 4.2, t * 0.8 + i, go ? 1 : 0, { e: go ? 1 : 0, t: t + i });
    }
  });
  for (let y = 0; y < H; y++) { const r = y * W; for (let x = x0; x < x1; x++) buf[r + x] = TMPBUF[r + x]; }
  // current gauge at the bottom of the panel
  const gx0 = Math.round(cxs - 34), gx1 = Math.round(cxs + 34), gy1 = 418, gy0 = 330;
  rect(gx0 - 3, gy0 - 3, gx1 + 3, gy1 + 3, P.K0); frame(gx0 - 3, gy0 - 3, gx1 + 3, gy1 + 3, P.LC2);
  const lv = S.lvl * K75(clamp((t - (SC_T[13] + 0.6)) / 1.2, 0, 1)) * (1 + 0.04 * Math.sin(t * 9 + side));
  const top = Math.round(lerp(gy1, gy0 + 4, clamp(lv, 0, 1)));
  rect(gx0 + 4, top, gx1 - 4, gy1 - 2, P.SG1); rect(gx0 + 4, top, gx1 - 4, top + 2, P.SG2); rect(gx0 + 4, top, gx0 + 8, gy1 - 2, P.SG2);
  for (let k = 1; k < 6; k++) { const yy = Math.round(lerp(gy1, gy0 + 4, k / 6)); rect(gx1 - 8, yy, gx1 - 4, yy + 1, P.LC2); }
}
function drawSplit(t) {
  rect(0, 0, W, H, P.BG);
  splitPanel(0, t); splitPanel(1, t);
  rect(133, 0, 137, H, P.K0); rect(134, 0, 136, H, P.N3);
}
// ---------------------------------------------------------------- s22: eight cuts on the beat retrace the chain
const RECAP = [
  ['M', 1.45, [-0.1, -3.2, 15]], ['M', 5.0, [DOCK.x, DOCK.y + 2.6, 13]], ['S', 12.7, [-34, 930, 2.5]], ['R', 20.62, [80, -4, 3.0]],
  ['R', 24.25, [52, 0, 3.4]], ['R', 33.7, [16, 4, 2.4]], ['M', 45.9, [DOCK.x + 8.6, MTOP + 7.6, 13.6]], ['M', 57.4, [DOCK.x, MTOP + 21.2, 7.7]],
];
const RECAP_W = ['DROP', 'STRIP', 'GLUCOSE', 'ENZYME', 'MEDIATOR', 'ELECTRODE', 'CURRENT', 'NUMBER'];
function recapIndex(t) { return clamp(Math.floor((t - T_RECAP) / BEAT), 0, 7); }
function drawRecap(t) {
  const i = recapIndex(t), tau = t - (T_RECAP + i * BEAT), [w, t0, c] = RECAP[i];
  const kick = 1 + 0.07 * (1 - eout(clamp(tau / 0.2, 0, 1))), drift = 1 + (i % 2 ? -0.03 : 0.04) * tau / BEAT;
  const cam = new Cam(c[0], c[1], c[2] * kick * drift, CX, CY), tw = t0 + tau;
  if (w === 'M') drawWorldM(cam, tw); else if (w === 'S') drawWorldS(cam, tw); else drawWorldR(cam, tw);
  return { cam, w, tw };
}
// ---------------------------------------------------------------- s24: enough blood vs. too little
function drawQuality(t) {
  const cam = new Cam(0.4 * Math.sin((t - 65) * 0.7), 10 + 0.6 * Math.sin((t - 65) * 0.9), 9.2 + 1.4 * smooth(seg(t, 65, 68.02)), CX, CY);
  bgM(cam, t);
  const L = -7, R = 7;
  const ok = smooth(seg(t, 65.25, 66.75)), short = 0.56 * (1 - Math.pow(1 - seg(t, 65.25, 66.6), 2));
  drawStrip(cam, L, 0, t, { fill: ok });
  drawStrip(cam, R, 0, t, { fill: short });
  // the drops on the tips: a full bead is drawn in; a tiny smear runs out
  const r1 = lerp(1.25, 0.55, smooth(seg(t, 65.2, 66.8))), r2 = lerp(0.5, 0.0, smooth(seg(t, 65.2, 66.2)));
  for (const [x, r] of [[L, r1], [R, r2]]) if (r > 0.05) { const m = maskEll(cam.x(x), cam.y(-r * 0.75), r * cam.z * 1.05, r * cam.z * 0.85, 0); shade(m, P.BL2, P.BL3, P.BL1, null, { k: 2 }); ellipse(cam.x(x + r * 0.35), cam.y(-r * 1.1), Math.max(1, r * cam.z * 0.25), Math.max(1, r * cam.z * 0.15), P.BL4); }
  // fill-detect bands: green when reached
  const fdY0 = stripWinY(EBANDS[2][0]), fdY1 = stripWinY(EBANDS[2][1]);
  if (ok > 0.92) rect(cam.x(L - STRIP.cw - 0.15), cam.y(fdY0), cam.x(L + STRIP.cw + 0.15), cam.y(fdY1), P.SG2, 0.7);
  // verdicts
  if (t > T_RES - 0.05) {
    const k = backOut(clamp((t - T_RES) / 0.3, 0, 1), 1.6);
    const bx = cam.x(L), by = cam.y(STRIP.w1 + 3.2), s = Math.round(14 * k);
    if (s > 1) { disc(bx, by, s + 2, P.SH); disc(bx, by, s, P.SG1); tick(bx - 8, by - 6, P.INK, 2); }
    const rx = cam.x(R), ry = by;
    if (s > 1) { disc(rx, ry, s + 2, P.SH); disc(rx, ry, s, P.GO); rect(rx - 2, ry - 9, rx + 2, ry + 3, P.SH); rect(rx - 2, ry + 5, rx + 2, ry + 9, P.SH); }
  }
  return cam;
}
// ---------------------------------------------------------------- frame assembly
const VIEW = { cam: null, w: 'M' };
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  let cam = null, w = 'M';
  if (t < T_DIVE0 + 0.45) { cam = camM(t); drawWorldM(cam, t); }
  else if (t < T_DIVE1 - 0.12) {                       // s04: dive into the inlet, the section opens in the lens
    cam = camM(t); drawWorldM(cam, t);
    const cs = camS(t), r = lensIn(t, T_DIVE0 + 0.45, T_DIVE1 - 0.12);
    lensComposite(() => drawWorldS(cs, t), cam.x(DOCK.x), cam.y(DOCK.y + 0.15), r);
    if (r >= LENS_R) { cam = cs; w = 'S'; }
  }
  else if (t < T_SR0 + 0.2) { cam = camS(t); w = 'S'; drawWorldS(cam, t); }
  else if (t < T_SR1 - 0.1) {                          // s08: into the reagent, the molecules open in the lens
    cam = camS(t); w = 'S'; drawWorldS(cam, t, { hero: true });
    const cr = camR(t), r = lensIn(t, T_SR0 + 0.2, T_SR1 - 0.1);
    lensComposite(() => drawWorldR(cr, t), cam.x(HERO_ENZ_S[0]), cam.y(HERO_ENZ_S[1]), r);
    if (r >= LENS_R) { cam = cr; w = 'R'; }
  }
  else if (t < SC_T[13]) { cam = camR(t); w = 'R'; drawWorldR(cam, t); }
  else if (t < SC_T[14]) { drawSplit(t); w = 'X'; }
  else if (t < 38.9) {                                 // s15: out of the molecules, back into the strip
    cam = camS(t); w = 'S'; drawWorldS(cam, t, { hero: false });
    const cr = camR(t), r = lensOut(t, T_OUT0, 38.9);
    lensComposite(() => drawWorldR(cr, t), cam.x(HERO_ENZ_S[0]), cam.y(HERO_ENZ_S[1]), r);
  }
  else if (t < T_OUT2) {                               // ... and out of the strip, back to the meter
    cam = camM(t); drawWorldM(cam, t, { sig: t - 38.9 });
    const cs = camS(t), r = lensOut(t, 38.9, T_OUT2);
    lensComposite(() => drawWorldS(cs, t, { hero: false }), cam.x(DOCK.x), cam.y(DOCK.y + stripWinY(0.55)), r);
  }
  else if (t < T_RECAP) { cam = camM(t); drawWorldM(cam, t, { sig: t < 41.6 ? t - 38.9 : -1 }); }
  else if (t < SC_T[22]) { const r = drawRecap(t); cam = r.cam; w = 'C' + r.w; }
  else if (t < SC_T[23]) { cam = camS(t); w = 'S'; drawWorldS(cam, t, { hero: false }); }
  else if (t < SC_T[24]) { cam = drawQuality(t); w = 'Q'; }
  else { cam = camM(t); drawWorldM(cam, t); }
  VIEW.cam = cam; VIEW.w = w;
  overlays(t, cam, w);
}
function engineInit() { routePaths(); }
