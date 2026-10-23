// S09 X-RAYS BECOME ELECTRICAL SIGNALS (57–65 s): the camera dives into one element of the detector array, in cross-section.
// Tungsten anti-scatter plates stand between the elements; under them each element is a ceramic scintillator (gadolinium
// oxysulfide) with white reflective walls, a silicon photodiode beneath, then the readout electronics. An X-ray is
// absorbed in the scintillator → a flash of visible (green) light spreads, bounces off the walls → the photodiode turns the
// light into charge → the readout integrates all the charge collected during one view and turns the total into one
// number. Energy-integrating: it sums the energy of many photons, it does not count them one by one.
// Element world (px at z = 1): elements 44 px wide; scintillator y 0–64, photodiode y 64–82, readout below.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const EW = 44, NE = 9, Y_S = 0, Y_PD = 64, Y_PD1 = 82, Y_RO = 120;
const VIEW = [1.6, 5.0];                                            // integration window of the featured element (local s)
// X-ray arrivals into the featured element (index 0) and its neighbours
const XR = []; for (let k = 0; k < 9; k++) XR.push({ e: 0, t: 1.75 + k * 0.36 + h(k, 2) * 0.08, x: (h(k, 3) - 0.5) * (EW - 14), y: 12 + h(k, 4) * 44, E: 50 + 50 * h(k, 5) });
for (let k = 0; k < 26; k++) XR.push({ e: (k % 4 < 2 ? -1 : 1) * (1 + (k % 2) + Math.floor(h(k, 9) * 2)), t: 1.6 + h(k, 7) * 3.6, x: (h(k, 3) - 0.5) * (EW - 14), y: 12 + h(k, 4) * 44, E: 50 + 50 * h(k, 5) });
const VX = 260, VL = 140;                                           // X-ray and light speeds (px/s)
const tAbs = x => x.t + (x.y + 70) / VX;                           // starts 70 px above the scintillator
const lightAt = (x, t) => { const a = t - tAbs(x); return a < 0 ? null : a; };
const charge = t => { const tt = Math.min(t, VIEW[1]); let q = 0; for (const x of XR) { if (x.e !== 0) continue; const a = lightAt(x, tt); if (a == null) continue; q += x.E / 100 * clamp(a / 0.45); } return q; };
const camAt = t => {
  if (t < 1.3) { const q = MO.k75(clamp(t / 1.3)); return { x: 0, y: lerp(-40, 40, q), z: K.zl(0.55, 2.1, q) }; }
  if (t < 5.6) { const q = MO.sineInOut(clamp((t - 1.3) / 4.3)); return { x: 0, y: lerp(40, 92, q), z: K.zl(2.1, 1.95, q) }; }
  const q = MO.k75(clamp((t - 5.6) / 1.9)); return { x: 0, y: lerp(92, 40, q), z: K.zl(1.95, 0.28, q) };
};
function drawElements(c, t, cam) {
  K.cam(c, cam);
  PIX.rect(c, -2000, -400, 4000, 1400, 'k');
  for (let i = -NE * 6; i <= NE * 6; i++) {
    const x0 = i * EW - EW / 2, feat = i === 0;
    // scintillator with white reflective walls
    PIX.rect(c, x0 + 2, Y_S, EW - 4, Y_PD - Y_S, feat && t > 1.6 ? 'g7' : 'g6'); PIX.rect(c, x0 + 2, Y_S, EW - 4, 2, 'g8');
    PIX.rect(c, x0 + 2, Y_S, 2, Y_PD - Y_S, 'gb'); PIX.rect(c, x0 + EW - 4, Y_S, 2, Y_PD - Y_S, 'gb');
    // photodiode: silicon with its junction
    PIX.rect(c, x0 + 2, Y_PD, EW - 4, Y_PD1 - Y_PD, 'g2'); PIX.rect(c, x0 + 2, Y_PD + 6, EW - 4, 1, 'c1');
    // anti-scatter plate above, between elements (tungsten)
    PIX.rect(c, x0 - 1, -96, 2, 94, 'g8'); PIX.rect(c, x0 - 1, -96, 1, 94, 'g9');
  }
  // substrate and readout chip (under the featured element), its wire
  PIX.rect(c, -NE * 6 * EW, Y_PD1, NE * 12 * EW, 14, 'g1');
  PIX.rect(c, -46, Y_RO, 92, 40, 'g2'); PIX.rect(c, -46, Y_RO, 92, 2, 'g4');
  for (let k = 0; k < 8; k++) { PIX.rect(c, -40 + k * 11, Y_RO - 4, 4, 4, 'g5'); PIX.rect(c, -40 + k * 11, Y_RO + 40, 4, 4, 'g5'); }
  PIX.line(c, 0, Y_PD1 + 2, 0, Y_RO, 'u1', 1.4);
  K.wtext(c, 'READOUT', 0, Y_RO + 15, 'g6', { shadow: null, align: 'center' });
  c.setTransform(1, 0, 0, 1, 0, 0);
}
function drawEvents(c, t, cam) {
  const S = (x, y) => K.S(cam, x, y);
  for (const x of XR) {
    const ex = x.e * EW + x.x, ta = tAbs(x);
    if (t < ta) { if (t > x.t) { const [sx, sy] = S(ex, -70 + (t - x.t) * VX); FX.ph(c, sx, sy, Math.PI / 2, 4.5, 9, 2, 1); } continue; }
    const a = t - ta;
    if (a < 0.22) { const [sx, sy] = S(ex, x.y); FX.flash(c, sx, sy, 6 * (1 - a / 0.22), 'e3', 1 - a / 0.22); }
    // visible light: many green photons spreading, bouncing off the side walls, ending in the photodiode
    if (a < 0.5) for (let k = 0; k < 14; k++) {
      const an = k / 14 * TAU + h(k, x.t * 100 | 0) * 0.4, d = a * VL;
      let lx = x.x + Math.cos(an) * d, ly = x.y + Math.sin(an) * d;
      const half = EW / 2 - 4; if (lx > half) lx = 2 * half - lx; if (lx < -half) lx = -2 * half - lx;
      if (ly < 2) ly = 4 - ly; if (ly > Y_PD) continue;
      const [sx, sy] = S(x.e * EW + lx, ly); PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, k % 3 ? 'e2' : 'e3');
    }
    // charge in the photodiode
    if (a > 0.25 && a < 0.7 && x.e === 0) for (let k = 0; k < 4; k++) { const [sx, sy] = S(x.x + (k - 1.5) * 6, Y_PD + 9 + (a - 0.25) * 24 * (k % 2 ? 1 : 0.6)); FX.e(c, sx, sy, 1, 1); }
  }
  // the featured element's integrator: charge collected during the view, then converted to one number
  const q = charge(t), [rx, ry] = S(0, Y_RO);
  if (t > 1.5 && t < 6.0) {
    const bh = 60, fill = clamp(q / 6), x = Math.round(rx + 60), y = Math.round(ry - 10);
    PIX.rect(c, x - 1, y - bh - 1, 10, bh + 2, 'g4'); PIX.rect(c, x, y - bh, 8, bh, 'k');
    const shown = t > VIEW[1] + 0.35 ? 0 : fill;                       // after the view: read out, then reset
    PIX.rect(c, x, y - Math.round(bh * shown), 8, Math.round(bh * shown), 'c2'); PIX.rect(c, x, y - Math.round(bh * shown), 8, 1, 'c4');
    if (t > VIEW[1]) { const v = Math.round(q * 2140); PIX.rect(c, x - 30, y + 6, 52, 11, 'k'); PIX.text(c, String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','), x - 4, y + 8, 'c4', { align: 'center' }); }
  }
}
SC['s09_detector'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    drawElements(c, t, cam);
    drawEvents(c, t, cam);
    // pulses leaving every element in the wide view
    if (t > 5.8) for (let i = -40; i <= 40; i++) { const ph = K.wrap(S.t * 1.5 + h(i, 4), 1), [sx, sy] = K.S(cam, i * EW, Y_PD1 + 10 + ph * 300); if (sx > 0 && sx < W) FX.e(c, sx, sy, 1, 1); }
    // the chain, lit step by step
    if (t > 1.6 && t < 5.9) CAP.steps(c, t, { x: 14, y: 100, t1: 5.75, gap: 12, items: [[1.85, 'X-RAY', 'y3'], [2.05, 'SCINTILLATOR', 'g9'], [2.15, 'VISIBLE LIGHT', 'e2'], [2.35, 'PHOTODIODE', 'g7'], [2.6, 'ELECTRICAL SIGNAL', 'c3']] });
    const L = (x, y) => K.S(cam, x, y);
    if (t > 1.4 && t < 3.35) { const [ax, ay] = L(-EW, -50); CAP.note(c, t, { ax, ay, x: 250, y: 160, text: 'ANTI-SCATTER PLATES', t0: 1.45, t1: 3.05, col: 'g9', align: 'right', box: true }); }
    if (t > 3.6 && t < 6.25) CAP.note(c, t, { x: 20, y: 372, text: 'ENERGY-INTEGRATING:', t0: 3.65, t1: 5.95, col: 'c4', box: true });
    if (t > 3.6 && t < 6.25) CAP.note(c, t, { x: 20, y: 383, text: 'ONE TOTAL PER VIEW, NOT COUNTS', t0: 3.75, t1: 5.95, col: 'g9', box: true });
    CAP.cap(c, t, { l1: 'DETECTION', l2: ['X-RAYS BECOME', 'ELECTRICAL SIGNALS'], t0: 0.12, tSwap: 2.6, t1: 7.85, acc: 'e2' });
  },
  cues: () => {
    const q = [[0, 'dive', 0.8, 0, 1.3], [1.45, 'tag', 0.35, 0.4], [3.65, 'tag', 0.35, -0.4], [5.0, 'confirm', 0.8, 0], [5.6, 'pull_back', 0.7, 0, 1.9]];
    for (const x of XR) { const ta = Math.round(tAbs(x) * 16) / 16; if (x.e === 0) { q.push([ta, 'xray_hit', 0.6, 0], [ta + 0.0625, 'crystal_ping', 0.55, 0.1], [ta + 0.25, 'chirp_e', 0.4, -0.1]); } }
    return q;
  },
};
})();
