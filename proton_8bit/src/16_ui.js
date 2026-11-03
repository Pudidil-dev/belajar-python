'use strict';
// ============================================================================
// IN-PICTURE INSTRUMENTS (screen space, inside the short-video safe area):
// the energy staircase of the cyclotron (steps only at the gap), the magnet's
// side view, the two focusing lanes of the quadrupole doublet, the X-ray check
// of the patient's position, the plan's energy readout and the closing recap.
// ============================================================================
function boxTitle(s, x, y, c) { text(FS, s, x, y, { sc: 1, c: c || P.SUB, ol: null }); }
// energy vs time: a step at every gap crossing, flat inside the electrodes; the scale grows in the time-lapse
function energyStair(t, a) {
  if (a <= 0) return;
  const x0 = 24, y0 = 392, w = 138, h = 58, win = 2.5;
  const scale = Math.max(13, kTrail(t) * 1.12);
  withDither(a, () => {
    rect(x0 - 8, y0 - 20, x0 + w + 8, y0 + h + 6, P.K0); frame(x0 - 8, y0 - 20, x0 + w + 8, y0 + h + 6, P.N5);
    text(FS, 'ENERGY', x0 - 2, y0 - 15, { sc: 2, c: P.PC3, ol: null });
    line(x0, y0 + h, x0 + w, y0 + h, P.N5);
    let px = null, py = null; const fill = [x0, y0 + h];
    for (let i = 0; i <= 140; i++) { const tt = t - win + win * i / 140, e = kAt(tt) / scale, x = x0 + w * i / 140, y = y0 + h - e * h; fill.push(x, y); if (px !== null) { line(px, py, x, py, P.PC3); line(x, py, x, y, P.PC3); } px = x; py = y; }
    fill.push(x0 + w, y0 + h); poly(fill, P.PC0);
    for (let i = 0; i <= 140; i++) { const tt = t - win + win * i / 140, e = kAt(tt) / scale, x = x0 + w * i / 140, y = y0 + h - e * h; pset(x, y, P.PC3); }
    disc(x0 + w, y0 + h - kAt(t) / scale * h, 2.5, P.PC5);
  });
}
// the cyclotron magnet from the side: two poles, the field straight across the chamber
function magnetSide(t, a) {
  if (a <= 0) return;
  const x0 = 26, y0 = 100, w = 84, h = 84;
  withDither(a, () => {
    rect(x0 - 6, y0 - 18, x0 + w + 6, y0 + h + 6, P.K0); frame(x0 - 6, y0 - 18, x0 + w + 6, y0 + h + 6, P.N5);
    text(FS, 'SIDE VIEW', x0, y0 - 13, { sc: 1, c: P.SUB, ol: null });
    shade(maskRR(x0 + 4, y0, x0 + w - 4, y0 + 24, 2), P.M3, P.M4, P.M2, P.M1); shade(maskRR(x0 + 4, y0 + h - 24, x0 + w - 4, y0 + h, 2), P.M3, P.M4, P.M2, P.M1);
    text(FS, 'N', x0 + w / 2 - 2, y0 + 9, { sc: 1, c: P.INK, ol: null }); text(FS, 'S', x0 + w / 2 - 2, y0 + h - 15, { sc: 1, c: P.INK, ol: null });
    for (let x = x0 + 12; x < x0 + w - 8; x += 12) { line(x, y0 + 25, x, y0 + h - 25, P.MG2); arrowHead(x, y0 + h - 27, Math.PI / 2, 3, P.MG3); }
    rect(x0 + 2, y0 + h / 2 - 4, x0 + w - 2, y0 + h / 2 + 4, P.N2); frame(x0 + 2, y0 + h / 2 - 4, x0 + w - 2, y0 + h / 2 + 4, P.M4);
    const px = x0 + w / 2 + (w / 2 - 12) * Math.sin(t * Math.PI * 2); proton(px, y0 + h / 2, 2.2);
  });
}
// the doublet as two lanes: horizontal and vertical envelopes; Q1 focuses one plane and defocuses the other, Q2 the reverse
function quadLanes(t, a) {
  if (a <= 0) return;
  const x0 = 26, x1 = 286, s0 = BLM.q1.s - 40, s1 = BLM.q2.s + 80, X = s => lerp(x0, x1, (s - s0) / (s1 - s0));
  const lanes = [['HORIZONTAL', 360, envX, [1, -1]], ['VERTICAL', 438, envY, [-1, 1]]];
  withDither(a, () => {
    rect(16, 332, 296, 484, P.K0); frame(16, 332, 296, 484, P.N5);
    for (const [qs, nm] of [[BLM.q1.s, 'Q1'], [BLM.q2.s, 'Q2']]) { const x = X(qs + 11); rect(x - 5, 342, x + 6, 478, P.M2); text(FS, nm, x - 5, 336, { sc: 1, c: P.INK, ol: null }); }
    lanes.forEach(([nm, yc, env, fd], li) => {
      text(FS, nm, 22, yc - 22, { sc: 1, c: P.SUB, ol: null });
      line(x0, yc, x1, yc, P.N4);
      let pa = null; for (let s = s0; s <= s1; s += 3) { const x = X(s), e = env(s) * 2.4; if (pa) { line(pa[0], pa[1], x, yc - e, P.PC2); line(pa[0], pa[2], x, yc + e, P.PC2); } pa = [x, yc - e, yc + e]; }
      // focus (arrows in) / defocus (arrows out) marks at each magnet
      [BLM.q1.s, BLM.q2.s].forEach((qs, qi) => { const x = X(qs + 11), f = fd[qi] > 0, c = f ? P.GRN : P.RED; for (const sg of [-1, 1]) { const ya = yc + sg * 26, yb = yc + sg * (f ? 16 : 30); arrow(x + 12, f ? ya : yc + sg * 14, x + 12, f ? yb : ya, 1, c, 3); } });
      // protons moving along
      for (let j = 0; j < 12; j++) { const s = s0 + ((t * 70 + j * 21) % (s1 - s0)), off = RAY[j % 12] * env(s) * 2.4 * (li ? 0.9 : 1); proton(X(s), yc + off, 1.4, 1); }
    });
  });
}
// the X-ray check: today's image against the planned position, the couch correction, ALIGNED
function xrayPanel(t, a) {
  if (a <= 0) return;
  const x0 = 30, y0 = 398, w = 190, h = 82, cx = x0 + w / 2, cy = y0 + h / 2 + 4;
  const off = bodyOffset(t), dx = (off[0] - 0) * 3.2, dy = (off[1] - 2) * 3.2, S = 0.55;
  withDither(a, () => {
    rect(x0 - 6, y0 - 18, x0 + w + 6, y0 + h + 6, P.K0); frame(x0 - 6, y0 - 18, x0 + w + 6, y0 + h + 6, P.N5);
    text(FS, 'X-RAY CHECK', x0, y0 - 13, { sc: 1, c: P.SUB, ol: null });
    rect(x0, y0, x0 + w, y0 + h, P.XR0);
    // today's image (soft tissue, spine, pelvis rim), shifted by the set-up error
    ellipse(cx + dx, cy + dy, 84, 36, P.XR1);
    for (let i = -2; i <= 2; i++) { const vy = cy + dy + i * 13; shade(maskRR(cx + dx - 9, vy - 5, cx + dx + 9, vy + 5, 2), P.XR3, P.XR4, P.XR2, P.XR2); }
    for (const sg of [-1, 1]) for (let i = -1; i <= 1; i++) { const q = []; for (let k = 0; k <= 10; k++) { const u = k / 10; q.push(cx + dx + sg * (12 + 56 * u), cy + dy + i * 13 + 12 * u * u - 5); } polyline(q, P.XR2); }
    // the planned position (dashed cyan outline of the same bones)
    for (let i = -2; i <= 2; i++) { const vy = cy + i * 13; dashLine(cx - 10, vy - 6, cx + 10, vy - 6, P.PC3, 3, 2, 0); dashLine(cx - 10, vy + 6, cx + 10, vy + 6, P.PC3, 3, 2, 0); dashLine(cx - 10, vy - 6, cx - 10, vy + 6, P.PC3, 3, 2, 0); dashLine(cx + 10, vy - 6, cx + 10, vy + 6, P.PC3, 3, 2, 0); }
    text(FS, 'PLANNED', x0 + 6, y0 + 6, { sc: 1, c: P.PC3, ol: null }); text(FS, 'TODAY', x0 + 6, y0 + 16, { sc: 1, c: P.XR4, ol: null });
    if (t >= EV.aligned) { const k = K75(clamp((t - EV.aligned) / 0.2, 0, 1)); rect(x0 + w + 12, y0 + 24, x0 + w + 76, y0 + 50, P.K0); frame(x0 + w + 12, y0 + 24, x0 + w + 76, y0 + 50, P.GRN); checkMark(x0 + w + 22, y0 + 37, 4 * k + 0.5, P.GRN); text(FS, 'ALIGNED', x0 + w + 32, y0 + 33, { sc: 1, c: P.GRN, ol: null, n: 7 * k }); }
  });
}
// the plan's energy readout (deeper layer = higher energy) and a small depth-dose curve aimed at the layer
function planEnergy(t, lvl, a, layerY) {
  if (a <= 0) return;
  energyBar(278, 150, 110, lvl, a);
  withDither(a, () => { text(FS, 'ENERGY', 250, 130, { sc: 1, c: P.PC3, ol: null }); });
  if (layerY !== undefined) withDither(a * 0.9, () => {
    const top = p3(0, -10, 0)[1], R = (layerY - top), n = 50, D = braggCurve(0.8, n), q = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1) * 1.15; q.push(232 + D[i] * 26, top + u * R / 0.8); }
    for (let i = 0; i + 3 < q.length; i += 2) if (q[i + 1] < 452) line(q[i], q[i + 1], q[i + 2], q[i + 3], P.DE3);
    line(232, top, 232, Math.min(450, top + 1.15 * R / 0.8), P.N5);
  });
}
// the closing recap: the chain from proton to tumour dose
const RECAP = ['PROTON', 'ACCELERATOR', 'MAGNETS', 'BRAGG PEAK', 'TUMOR DOSE'];
function recapIcon(i, x, y) {
  if (i === 0) proton(x, y, 4);
  else if (i === 1) { let px = x, py = y; for (let k = 1; k < 40; k++) { const a = k * 0.45, r = k * 0.2; const qx = x + Math.cos(a) * r, qy = y - Math.sin(a) * r; line(px, py, qx, qy, P.PC3); px = qx; py = qy; } }
  else if (i === 2) { fieldIn(x - 4, y, 3.5, P.MG3); fieldIn(x + 5, y, 3.5, P.MG3); }
  else if (i === 3) { const D = braggCurve(0.8, 20); for (let k = 0; k + 1 < 20; k++) line(x - 9 + k, y + 6 - D[k] * 11, x - 8 + k, y + 6 - D[k + 1] * 11, P.DE3); }
  else { disc(x, y, 7, P.TU2); for (const [a, b] of [[-3, -2], [2, -3], [0, 2], [3, 2], [-3, 3]]) pset(x + a, y + b, P.DE3); }
}
function recapList(t) {
  if (!UI_ON || t < EV.recap[0] || t > 71.9) return;
  const out = t > 71.72 ? (71.9 - t) / 0.18 : 1;
  withDither(out, () => {
    RECAP.forEach((s, i) => {
      const k = pop(t, EV.recap[i], 0.3); if (k <= 0) return;
      const y = 132 + i * 40, x = 34;
      rect(x - 12, y - 14, x + 26 + textW(FS, s, 2), y + 14, P.K0); frame(x - 12, y - 14, x + 26 + textW(FS, s, 2), y + 14, i === 4 ? P.TU2 : P.N5);
      recapIcon(i, x, y);
      text(FS, s, x + 16, y - 5, { sc: 2, c: i === 4 ? P.TU3 : P.INK, ol: null, n: (t - EV.recap[i]) * 50 });
      if (i < 4 && t > EV.recap[i + 1] - 0.05) { line(x, y + 15, x, y + 25, P.N6); arrowHead(x, y + 26, Math.PI / 2, 3, P.N6); }
    });
  });
}
