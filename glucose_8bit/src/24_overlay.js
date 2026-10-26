'use strict';
// ============================================================================
// TEXT LAYER: one typed caption at a time (top left, outlined, no plate),
// small leader-line tags next to the thing they name, disclaimer chips, the
// recap breadcrumb and the closing title. Text stays inside the short-video
// safe area (x 18..240, y 37..362).
// ============================================================================
const CAP_X = 18, CAP_Y = 40;
function caption(s, t0, t1, t) {
  if (!UI_ON || t < t0 || t > t1) return;
  const lines = wrapBal(FL, s, SAFE.r - CAP_X - 14, 2), cps = 46, total = s.length;
  let n = (t - t0) * cps;
  const out = t1 - t < 0.16 ? (t1 - t) / 0.16 : 1;
  n = Math.min(n, total * out + 0.01);
  if (n < 0.6) return;
  let left = n;
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const k = Math.min(ln.length, left);
    text(FL, ln, CAP_X, CAP_Y + i * 18, { sc: 2, n: k, c: P.INK, ol: P.SH, shadow: P.SH, sd: 2 });
    left -= ln.length + 1;
  });
}
function wtag(s, ax, ay, lx, ly, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1 || ax === null) return;
  ax = Math.round(ax); ay = Math.round(ay);
  const age = t - t0, out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, gk = K75(clamp(age / 0.18, 0, 1)) * out;
  const tw = textW(FM, s, 2), x0 = Math.round(clamp(lx, SAFE.l, 240 - tw)), y0 = Math.round(clamp(ly, 86, 350));
  const ux = ax < x0 ? x0 - 3 : ax > x0 + tw ? x0 + tw + 2 : ax, uy = y0 + 13;
  const ex = lerp(ax, ux, gk), ey = lerp(ay, uy, gk);
  line(ax, ay, ex, ey, P.SH); line(ax + 1, ay, ex + 1, ey, P.SH); line(ax, ay, ex, ey, col || P.INK);
  rect(ax - 1, ay - 1, ax + 2, ay + 2, col || P.INK);
  if (gk < 1) return;
  const n = clamp((age - 0.16) * 50, 0, s.length) * out;
  if (n <= 0) return;
  const pw = textW(FM, s.slice(0, Math.ceil(n)), 2);
  rect(x0 - 3, y0 - 3, x0 + pw + 3, y0 + 12, P.K0); rect(x0 - 3, y0 + 12, x0 + pw + 3, y0 + 13, col || P.INK);
  text(FM, s, x0, y0, { sc: 2, c: P.INK, ol: null, n });
}
function chip(s, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1), tw = textW(FM, s, 2), y = 352;
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 3, y - 3, x + tw + 3, y + 13, P.K0); frame(x - 3, y - 3, x + tw + 3, y + 13, col);
  text(FM, s, x, y, { sc: 2, c: P.SUB, ol: null });
}
// ---------------------------------------------------------------- captions (the brief's labels, in order)
const CAPS = [
  [0.95, 2.02, 'ONE TINY DROP OF BLOOD'], [4.06, 5.95, 'HOW DOES THIS BECOME A NUMBER?'], [6.3, 7.85, 'INSIDE THE TEST STRIP'],
  [8.0, 10.84, 'CAPILLARY ACTION'], [11.02, 13.86, 'GLUCOSE IS DISSOLVED IN THE SAMPLE'],
  [17.06, 19.9, 'GLUCOSE MEETS THE ENZYME'], [20.07, 22.9, 'ENZYME REACTION'], [23.1, 25.93, 'ELECTRONS ARE TRANSFERRED'],
  [26.1, 28.95, 'MEDIATOR CARRIES THE SIGNAL'], [29.13, 31.97, 'WORKING ELECTRODE'], [32.15, 34.98, 'CHEMICAL REACTION → ELECTRICAL CURRENT'],
  [35.17, 38.0, 'MORE GLUCOSE = STRONGER SIGNAL'], [38.18, 41.02, 'SIGNAL ENTERS THE METER'], [41.2, 44.04, 'METER READS THE SIGNAL'],
  [44.22, 46.82, 'MEASURING THE RESPONSE'], [47.0, 49.84, 'SIGNAL BECOMES DATA'], [50.02, 52.86, 'GLUCOSE IS CALCULATED'],
  [53.04, 54.95, 'BLOOD GLUCOSE READING'], [55.95, 57.97, '104 mg/dL'], [58.15, 61.9, 'FROM CHEMISTRY TO ELECTRICITY'],
  [62.1, 64.93, 'IT MEASURES A CHEMICAL SIGNAL'], [65.12, 67.95, 'SAMPLE QUALITY MATTERS'], [68.13, 70.97, 'ONE DROP. ONE REACTION. ONE NUMBER.'],
];
const TITLE_L = [['HOW GLUCOSE', 'INK'], ['METERS READ', 'INK'], ['YOUR BLOOD', 'BL4']];
function titleCard(t) {
  const t0 = 72.62, t1 = 76.85;
  if (!UI_ON || t < t0 || t > t1) return;
  const out = t > t1 - 0.3 ? (t1 - t) / 0.3 : 1;
  let left = (t - t0) * 30 * out;
  TITLE_L.forEach(([s, c], i) => {
    if (left <= 0) return;
    const y = 40 + i * 26;
    text(FT, s, CX, y, { sc: 2, bold: true, align: 'center', c: P[c], ol: P.SH, n: left, shadow: P.SH, sd: 2 });
    left -= s.length + 2;
  });
  const gk = K75(clamp((t - t0 - 0.5) / 0.4, 0, 1)) * out, uw = 118;
  if (gk > 0) rect(Math.round(CX - uw * gk / 2), 40 + 3 * 26 + 2, Math.round(CX + uw * gk / 2), 40 + 3 * 26 + 4, P.BL3);
}
// ---------------------------------------------------------------- anchors
const pick = (arr, f) => arr.reduce((b, q) => f(q) < f(b) ? q : b);
const TAG_RBC = RBC_S.filter(c => c.L > 1600 - 1010 && c.L < 1600 - 900 && Math.abs(c.x) < 40)[0] || RBC_S[0];
const TAG_ENZ = pick(ENZ_S, m => Math.abs(m.y1 - 965) + Math.abs(m.x1 + 66) * 2);
const TAG_MED = pick(MED_S, m => Math.abs(m.y1 - 1062) + Math.abs(m.x1 + 52) * 2);
const TAG_RBC23 = RBC_S.filter(c => c.L > 1600 - 900 && c.L < 1600 - 800 && c.x > -10 && c.x < 50)[0] || RBC_S[1];
function overlays(t, cam, w) {
  if (!UI_ON) return;
  for (const [a, b, s] of CAPS) caption(s, a, b, t);
  titleCard(t);
  // human scale
  if (w === 'M' && t > 2.4 && t < 3.95) { const g = meterG(t); wtag('TEST STRIP', cam.x(g.x + STRIP.hw), cam.y(g.y - 14), 164, 150, 2.75, 3.88, t, P.ST2); }
  // inside the strip
  if (w === 'S' && t > 11 && t < 14) {
    const q = rbcPosS(TAG_RBC, t); if (q) wtag('RED BLOOD CELL', cam.x(q[0]), cam.y(q[1]), 110, 300, 11.5, 13.86, t, P.RC3);
    const h = heroGluS(t); wtag('GLUCOSE', cam.x(h[0]), cam.y(h[1]), 160, 140, 12.05, 13.86, t, P.GL2);
  }
  if (w === 'S' && t > 14.8 && t < 17.0) {
    const e = enzPosS(TAG_ENZ, t); wtag('ENZYME', cam.x(e[0]), cam.y(e[1]), 150, 130, 15.12, 16.9, t, P.EZ3);
    const m = medStateS(TAG_MED, t); wtag('MEDIATOR', cam.x(m[0]), cam.y(m[1]), 150, 250, 15.58, 16.9, t, P.MD2);
    wtag('ELECTRODE', cam.x(CH.x0 - 7), cam.y(1105), 120, 330, 16.05, 16.9, t, P.AU3);
  }
  chip('NOT TO SCALE', 8.1, 10.84, t, P.N5);
  // the molecules
  if (w === 'R') {
    if (t > 21.4 && t < 22.95) wtag('2 ELECTRONS', cam.x(ENZ0[0] + FAD[0]), cam.y(ENZ0[1] + FAD[1]), 150, 300, 21.5, 22.9, t, P.EL2);
    if (t > 23.3 && t < 25.95) { const m = heroMed(0, t); wtag('MEDIATOR', cam.x(m[0]), cam.y(m[1]), 40, 120, 23.4, 25.93, t, P.MD2); }
    if (t > 33.6 && t < 35.0) { wtag('CURRENT', cam.x(-14), cam.y(30), 120, 300, 33.75, 34.98, t, P.EL2); }
  }
  chip('SIMPLIFIED', 20.1, 22.9, t, P.N5);
  // low vs high
  if (w === 'X') {
    const k = clamp((t - SC_T[13] - 0.25) * 40, 0, 99);
    for (const [s, x, c] of [['LOW', 66, P.GL3], ['HIGH', 203, P.GL2]]) { const tw = textW(FL, s, 2); const xx = Math.round(x - tw / 2); rect(xx - 4, 92, xx + tw + 4, 112, P.K0); text(FL, s, xx, 96, { sc: 2, c, ol: null, n: k }); }
    for (const x of [66, 203]) text(FM, 'CURRENT', x, 312, { sc: 2, c: P.SUB, align: 'center', ol: P.SH, n: k });
  }
  // inside the meter
  if (w === 'M' && t > 42 && t < 53) {
    const g = meterG(t), X = u => cam.x(g.x + u), Y = v => cam.y(g.y + v);
    wtag('AMPLIFIER', X(PCB.afe[0]), Y(PCB.afe[1] + PCB.afe[3]), 150, 340, T_AFE, 44.05, t, P.SG2);
    wtag('CONVERTER', X(PCB.adc[0]), Y(PCB.adc[1] + PCB.adc[3]), 40, 340, T_ADC0 + 0.1, 49.85, t, P.SG2);
    wtag('PROCESSOR', X(PCB.mcu[0] + 3), Y(PCB.mcu[1] + PCB.mcu[3]), 140, 340, 50.25, 52.86, t, P.SG2);
  }
  // recap breadcrumb
  if (w && w[0] === 'C') {
    const i = recapIndex(t), s = RECAP_W[i], tw = textW(FL, s, 2), x = 18, y = 336;
    const cols = [P.BL3, P.ST2, P.GL2, P.EZ3, P.MG2, P.AU3, P.SG2, P.LC3];
    rect(x - 4, y - 4, x + tw + 4, y + 18, P.K0); rect(x - 4, y + 18, x + tw + 4, y + 20, cols[i]);
    text(FL, s, x, y, { sc: 2, c: P.INK, ol: null, n: clamp((t - (T_RECAP + i * BEAT)) * 60, 0, 99) });
    for (let k = 0; k < 8; k++) rect(x + k * 10, y + 26, x + k * 10 + 6, y + 30, k <= i ? cols[k] : P.N4);
  }
  // inside the strip again: cells pass, only electrons count
  if (w === 'S' && t > 62 && t < 65) {
    const q = rbcPosS(TAG_RBC23, t); if (q) wtag('NOT MEASURED', cam.x(q[0]), cam.y(q[1]), 130, 120, 62.6, 64.93, t, P.RC3);
    wtag('ELECTRONS COUNTED', cam.x(CH.x0 - 6), cam.y(cam.wy(300)), 70, 300, 63.1, 64.93, t, P.EL2);
  }
  if (w === 'Q' && t > T_RES) {
    const k = clamp((t - T_RES - 0.15) * 40, 0, 99);
    const ly = Math.round(cam.y(STRIP.w1 + 3.2)) + 22;
    text(FM, 'ENOUGH', cam.x(-7), ly, { sc: 2, c: P.SG2, align: 'center', ol: P.SH, n: k });
    text(FM, 'TOO LITTLE', Math.min(cam.x(7), 196), ly, { sc: 2, c: P.GO, align: 'center', ol: P.SH, n: k });
  }
}
