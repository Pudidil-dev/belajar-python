'use strict';
// ============================================================================
// THE FRONT END (board world px; the camera pans left → right along it).
// The LL wire goes to the instrumentation amplifier's + input and the RA wire
// to its − input (the LA electrode serves as the reference in this simplified
// three-electrode set). Interference that both electrodes share (most of the
// mains hum) cancels in the subtraction; the small difference — Lead II — is
// amplified about a thousand times. Baseline wander and muscle noise differ
// between the electrodes, so they survive the subtraction; filters reduce them
// (and can soften the waveform a little). The ADC then samples the voltage at
// regular instants and the processor rebuilds the trace from the numbers.
// ============================================================================
const BRD = { x0: -230, x1: 850, y0: -150, y1: 150, conn: -170, amp: 10, flt: 240, adc: 430, cpu: 700, disp: 820 };
// signals (mV at the electrodes; the shapes are illustrative, the hum is drawn slowed down)
const humV = t => 0.32 * Math.sin(TAU * 9 * t) + 0.12 * Math.sin(TAU * 0.45 * t + 2);                         // shared by both electrodes
const wanderV = t => 0.32 * Math.sin(TAU * 0.29 * t + 1) + 0.12 * Math.sin(TAU * 0.67 * t);                   // differs between electrodes
const emgV = t => 0.07 * (hash(Math.floor(t * 170)) * 2 - 1) + 0.04 * (hash(Math.floor(t * 93) + 7) * 2 - 1);
const vLL = t => 0.55 * ecgLive(t) + humV(t) + 0.5 * wanderV(t) + 0.5 * emgV(t);
const vRA = t => -0.45 * ecgLive(t) + humV(t) - 0.5 * wanderV(t) - 0.5 * emgV(t + 0.37);
const leadRaw = t => vLL(t) - vRA(t) + 0.1 * Math.sin(TAU * 9 * t);                                           // the hum mostly cancels
function leadFiltered(t) { let s = 0, n = 0; for (let k = -3; k <= 3; k++) { s += ecgLive(t + k * 0.004); n++; } return s / n; }
// a scrolling trace panel; o: { win, lo, hi, col, label, unit, dots (sample period), steps, pen }
function wavePanel(x0, y0, x1, y1, t, fn, o) {
  o = o || {};
  const win = o.win || 2.4, lo = o.lo === undefined ? -1 : o.lo, hi = o.hi === undefined ? 1.6 : o.hi, col = o.col || P.EG2;
  const gx0 = x0 + 4, gx1 = x1 - 4, gy0 = y0 + 18, gy1 = y1 - 5, Yv = v => lerp(gy1, gy0, (v - lo) / (hi - lo));
  if (!o.overlay) {                                       // overlay: draw only the marks over a panel already drawn
    rect(x0, y0, x1, y1, P.SC0); frame(x0, y0, x1, y1, o.frame || P.M5);
    for (let k = 1; k < 6; k++) rect(lerp(gx0, gx1, k / 6), gy0, lerp(gx0, gx1, k / 6) + 1, gy1, P.SC2);
    if (o.label) text(FS, o.label, x0 + 5, y0 + 4, { sc: 2, c: o.lcol || col, ol: null });
    if (o.unit) text(FS, o.unit, x1 - 5, y0 + 4, { sc: 2, c: P.SUB, ol: null, align: 'right' });
  }
  const tOf = x => t - (gx1 - x) / (gx1 - gx0) * win;
  if (o.dots) {
    // samples at regular instants: a dot per sample (and the held value between them if steps)
    const n0 = Math.ceil(tOf(gx0) / o.dots), n1 = Math.floor(t / o.dots); let prev = null;
    for (let n = n0; n <= n1; n++) {
      const ts = n * o.dots, x = gx1 - (t - ts) / win * (gx1 - gx0), y = clamp(Yv(fn(ts)), gy0, gy1);
      if (o.ticks) rect(x, gy1 - 3, x + 1, gy1, P.DT2);
      if (o.steps && prev) { rect(prev[0], prev[1], x, prev[1] + 2, col); rect(x - 1, Math.min(prev[1], y), x + 1, Math.max(prev[1], y) + 2, col); }
      disc(x, y, 1.8, o.dcol || P.DT4); prev = [x, y];
    }
  } else {
    let px_ = null, py_ = null;
    for (let x = gx0; x <= gx1; x++) { const y = clamp(Yv(fn(tOf(x))), gy0, gy1); if (px_ !== null) lineW(px_, py_, x, y, o.lw || 2, col); px_ = x; py_ = y; }
    if (o.pen !== false) disc(gx1, clamp(Yv(fn(t)), gy0, gy1), 2.4, P.EG4);
  }
  return { Yv, gx0, gx1, gy0, gy1, xOf: tt => gx1 - (t - tt) / win * (gx1 - gx0) };
}
// ---------------------------------------------------------------- the board
function chipBox(cam, cx, cy, w, h, label, sub) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  for (let i = 0; i < 6; i++) { const u = cx - w / 2 + 8 + i * (w - 16) / 5; rect(X(u - 2), Y(cy - h / 2 - 7), X(u + 2), Y(cy - h / 2), P.AL2); rect(X(u - 2), Y(cy + h / 2), X(u + 2), Y(cy + h / 2 + 7), P.AL2); }
  const m = maskRR(X(cx - w / 2), Y(cy - h / 2), X(cx + w / 2), Y(cy + h / 2), 4 * z); shade(m, P.CH1, P.CH2, P.CH0, P.K0, {});
  disc(X(cx - w / 2 + 7), Y(cy - h / 2 + 7), 2 * z, P.CH3);
  const sc = Math.max(1, Math.round(z * 1.6));
  text(FS, label, X(cx), Y(cy + h / 2 - 14), { sc, c: P.DT3, ol: null, align: 'center' });
  if (sub) text(FS, sub, X(cx), Y(cy + h / 2 + 12), { sc: Math.max(1, sc - 1), c: P.SUB, ol: null, align: 'center' });
}
// o: { hot: 'amp' | 'flt' | 'adc' | 'cpu' }
function boardWorld(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  const bm = maskRR(X(BRD.x0), Y(BRD.y0), X(BRD.x1), Y(BRD.y1), 10 * z); shade(bm, P.PB1, P.PB2, P.PB0, P.K0, {});
  for (let x = BRD.x0 + 20; x < BRD.x1; x += 40) for (let y = BRD.y0 + 20; y < BRD.y1; y += 40) disc(X(x), Y(y), 1.4 * z, P.PB3);
  // gold traces with a slow glint travelling along them (the signal path)
  const tr = (pts, w) => { for (let i = 0; i + 3 < pts.length; i += 2) { lineW(X(pts[i]), Y(pts[i + 1]), X(pts[i + 2]), Y(pts[i + 3]), (w + 1.5) * z, P.AU0); lineW(X(pts[i]), Y(pts[i + 1]), X(pts[i + 2]), Y(pts[i + 3]), w * z, P.AU1); } };
  const traces = [[BRD.conn + 20, -40, -70, -40, -70, -22, BRD.amp - 55, -22], [BRD.conn + 20, 40, -70, 40, -70, 22, BRD.amp - 55, 22], [BRD.conn + 20, 0, -90, 0, -90, 90, BRD.amp, 90, BRD.amp, 40],
    [BRD.amp + 55, 0, BRD.flt - 45, 0], [BRD.flt + 45, 0, BRD.adc - 45, 0], [BRD.cpu + 55, 0, BRD.disp, 0]];
  traces.forEach(p => tr(p, 3));
  for (let b = 0; b < 6; b++) tr([BRD.adc + 45, -25 + b * 10, BRD.cpu - 55, -25 + b * 10], 1.6);
  const flow = [[BRD.amp + 55, BRD.flt - 45], [BRD.flt + 45, BRD.adc - 45], [BRD.cpu + 55, BRD.disp]];
  for (const [a, b] of flow) { const u = (t * 0.9) % 1, x = lerp(a, b, u); glow(X(x), Y(0), 7 * z, P.AU2, P.AU2, 0.35); }
  // the input connector: RA, LA (reference), LL
  const cm = maskRR(X(BRD.conn - 22), Y(-62), X(BRD.conn + 22), Y(62), 4 * z); shade(cm, P.M5, P.M4, P.M6, P.K0, {});
  [['RA', -40, P.EW], ['LA', 0, P.CK], ['LL', 40, P.CR]].forEach(([n_, y, c]) => { disc(X(BRD.conn), Y(y), 7 * z, P.AL1); disc(X(BRD.conn), Y(y), 5 * z, c); text(FS, n_ === 'LA' ? 'REF' : n_, X(BRD.conn - 28), Y(y - 5), { sc: Math.max(1, Math.round(z * 1.5)), c: P.INK, ol: P.SH, align: 'right' }); });
  // wires arriving from the electrodes (from the top-left)
  [['RA', -40, P.EW], ['LA', 0, P.CK], ['LL', 40, P.CR]].forEach(([, y, c], i) => { const x0 = BRD.conn - 120, y0 = -260 + i * 12; lineW(X(x0), Y(y0), X(BRD.conn - 6), Y(y), 4 * z, P.CB0); lineW(X(x0), Y(y0), X(BRD.conn - 6), Y(y), 2.4 * z, mixc(P.CB1, c, 0.4)); });
  // the instrumentation amplifier: a chip with the amplifier symbol (+ from LL, − from RA)
  chipBox(cam, BRD.amp, 0, 110, 90, 'IN-AMP', '×1000');
  poly(cam.pts([BRD.amp - 32, -30, BRD.amp - 32, 30, BRD.amp + 34, 0]), o.hot === 'amp' ? P.DT1 : P.CH2);
  lineW(X(BRD.amp - 32), Y(-30), X(BRD.amp + 34), Y(0), 1.5 * z, P.DT3); lineW(X(BRD.amp - 32), Y(30), X(BRD.amp + 34), Y(0), 1.5 * z, P.DT3); lineW(X(BRD.amp - 32), Y(-30), X(BRD.amp - 32), Y(30), 1.5 * z, P.DT3);
  text(FC, '+', X(BRD.amp - 26), Y(-24), { sc: Math.max(1, Math.round(z)), c: P.FP4, ol: null }); text(FC, '-', X(BRD.amp - 26), Y(12), { sc: Math.max(1, Math.round(z)), c: P.FN4, ol: null });
  chipBox(cam, BRD.flt, 0, 90, 70, 'FILTER', '0.5–40 Hz');
  chipBox(cam, BRD.adc, 0, 90, 70, 'ADC', 'SAMPLES');
  chipBox(cam, BRD.cpu, 0, 110, 90, 'CPU', 'DIGITAL ECG');
  // display connector
  rect(X(BRD.disp), Y(-30), X(BRD.disp + 24), Y(30), P.M5); for (let k = 0; k < 6; k++) rect(X(BRD.disp + 4), Y(-24 + k * 9), X(BRD.disp + 20), Y(-20 + k * 9), P.AU1);
  if (o.hot) { const hx = { amp: BRD.amp, flt: BRD.flt, adc: BRD.adc, cpu: BRD.cpu }[o.hot], hw = o.hot === 'amp' || o.hot === 'cpu' ? 62 : 52; ring(X(hx), Y(0), hw * z, 1.6, P.YEL); }
}
