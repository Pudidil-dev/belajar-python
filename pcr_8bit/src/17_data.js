'use strict';
// ============================================================================
// DATA AND AMPLIFICATION (world / screen px).
// The analog photodiode level → ADC samples → one digital reading per cycle →
// a point on the fluorescence-vs-cycle plot; the full amplification curve with
// baseline, exponential phase, threshold, Cq and plateau; the result panel with
// positive, negative and internal controls; the idealised doubling time-lapse;
// a crowd of templates whose cut probes add up to the signal; the recap icons.
// ============================================================================
// ---------------------------------------------------------------- the ADC pipeline (vertical, camera pans down)
// o: { cyc (cycle reached), adc (0..1) }
function dataScene(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, cyc = o.cyc || 20;
  rect(0, 0, W, H, P.BG);
  // the photodiode at the top, green light arriving
  rect(X(-30), Y(-330), X(30), Y(-300), P.PD1); rect(X(-24), Y(-326), X(24), Y(-304), P.PD3);
  for (let k = 0; k < 5; k++) { const u = (t * 1.5 + k / 5) % 1; disc(X(-20 + k * 10), Y(lerp(-260, -300, u)), 2.4 * z, P.EM2, 1 - u); }
  text(FS, 'PHOTODIODE', X(40), Y(-322), { sc: 2, c: P.PD4, ol: P.SH });
  // analog panel: the photodiode voltage over time (one step up per read, with noise)
  const ax0 = -160, ax1 = 160, ay0 = -250, ay1 = -120;
  rect(X(ax0), Y(ay0), X(ax1), Y(ay1), P.DS1); frame(X(ax0), Y(ay0), X(ax1), Y(ay1), P.N5);
  text(FS, 'ANALOG', X(ax0 + 6), Y(ay0 + 6), { sc: 2, c: P.SG2, ol: null });
  let px_ = null, py_ = null;
  for (let s = 0; s <= 320; s += 2) {
    const c = cyc - 8 + s / 40, f = ampF(Math.max(1, c)), y = ay1 - 12 - (f - 100) / 1300 * (ay1 - ay0 - 30) + (hash(Math.floor(s + t * 60)) - 0.5) * 4;
    const x = X(ax0 + s);
    if (px_ !== null) line(px_, py_, x, Y(y), P.SG2);
    px_ = x; py_ = Y(y);
  }
  // the ADC: samples the level at each read and outputs numbers
  const cx0 = -60, cx1 = 60, cy0 = -60, cy1 = 10;
  lineW(X(0), Y(ay1), X(0), Y(cy0), 2.4 * z, P.SG1);
  rect(X(cx0), Y(cy0), X(cx1), Y(cy1), P.CH1); frame(X(cx0), Y(cy0), X(cx1), Y(cy1), o.adc > 0 ? P.DT3 : P.CH3);
  for (let p = 0; p < 6; p++) { rect(X(cx0 - 6), Y(cy0 + 8 + p * 9), X(cx0), Y(cy0 + 11 + p * 9), P.AL2); rect(X(cx1), Y(cy0 + 8 + p * 9), X(cx1 + 6), Y(cy0 + 11 + p * 9), P.AL2); }
  text(FS, 'ADC', X(0), Y(cy0 + 14), { sc: 3, c: P.DT3, ol: null, align: 'center' });
  // staircase inside: quantised steps
  for (let k = 0; k < 8; k++) rect(X(cx0 + 10 + k * 12), Y(cy1 - 8 - k * 2.6), X(cx0 + 22 + k * 12), Y(cy1 - 6 - k * 2.6), P.DT2);
  // digital readings: one per cycle
  const ry0 = 50;
  lineW(X(0), Y(cy1), X(0), Y(ry0 - 4), 2.4 * z, P.DT2);
  rect(X(-120), Y(ry0), X(120), Y(ry0 + 92), P.DS1); frame(X(-120), Y(ry0), X(120), Y(ry0 + 92), P.N5);
  text(FS, 'DIGITAL', X(-114), Y(ry0 + 6), { sc: 2, c: P.DT3, ol: null });
  for (let k = 0; k < 4; k++) {
    const c = Math.floor(cyc) - 3 + k; if (c < 1) continue;
    const v = Math.round(ampRead(c));
    text(FS, 'CYCLE ' + String(c).padStart(2, '0'), X(-104), Y(ry0 + 24 + k * 16), { sc: 2, c: P.SUB, ol: null });
    text(FS, String(v).padStart(4, '0'), X(104), Y(ry0 + 24 + k * 16), { sc: 2, c: k === 3 ? P.DT4 : P.DT2, ol: null, align: 'right' });
  }
  // the plot below: the reading lands as a point
  lineW(X(0), Y(ry0 + 92), X(0), Y(ry0 + 120), 2.4 * z, P.DT2);
  const pr = plotUI(X(-160), Y(ry0 + 124), X(160), Y(ry0 + 330), { cyc, thr: false, live: true, sc: Math.max(1, Math.round(z)) });
  return pr;
}
// ---------------------------------------------------------------- the amplification curve, full screen
// o: { cyc, notes (0..1 annotations), cq (0..1 marker) }
function curveScene(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  const X = v => cam.x(v), Y = v => cam.y(v);
  const pr = plotUI(X(-164), Y(-200), X(164), Y(170), { cyc: o.cyc, thrLabel: true, live: true, sc: 2 });
  text(FS, 'PCR CYCLE', (pr.gx0 + pr.gx1) / 2, pr.gy1 + 20, { sc: 2, c: P.SUB, ol: P.SH, align: 'center' });
  text(FS, 'FLUORESCENCE', pr.gx0 + 4, pr.gy0 - 18, { sc: 2, c: P.SUB, ol: P.SH });
  const n = o.notes || 0;
  if (n > 0) {
    // baseline bracket (cycles 1-20), exponential (23-30), plateau (34-40)
    const yb = pr.fy(AMP.base) - 12;
    if (o.cyc > 18) { lineW(pr.cx(1), yb, pr.cx(20), yb, 1.5, P.SUB); rect(pr.cx(1), yb, pr.cx(1) + 1, yb + 6, P.SUB); rect(pr.cx(20), yb, pr.cx(20) + 1, yb + 6, P.SUB); text(FS, 'BASELINE', pr.cx(10.5), yb - 16, { sc: 2, c: P.SUB, ol: P.SH, align: 'center', n: n * 30 }); }
    if (o.cyc > 29) text(FS, 'EXPONENTIAL', pr.cx(27.5) - 8, pr.fy(1800), { sc: 2, c: P.RP3, ol: P.SH, align: 'right', n: n * 30 });
    if (o.cyc > 37) text(FS, 'PLATEAU', pr.cx(37), pr.fy(3600) - 18, { sc: 2, c: P.RP3, ol: P.SH, align: 'center', n: n * 30 });
  }
  if (o.cyc > 0 && o.cyc < 40) { const x = pr.cx(o.cyc); dashLine(x, pr.gy0, x, pr.gy1, P.DG2, 2, 3, -t * 30); }
  if (o.cq > 0 && o.cyc >= CQ) {
    const x = pr.cx(CQ), y = pr.fy(ampF(CQ));
    dashLine(x, y, x, pr.gy1, P.YEL, 3, 2, 0);
    ring(x, y, 6, 1.5, P.YEL); disc(x, y, 2.5, P.C6);
    text(FS, 'Cq ' + CQ.toFixed(1), x + 6, pr.gy1 - 16, { sc: 2, c: P.YEL, ol: P.SH, n: o.cq * 20 });
  }
  return pr;
}
// ---------------------------------------------------------------- result panel
// o: { rows (0..4 revealed), banner (0..1), cyc }
function resultScene(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.BG);
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, sc = Math.max(1, Math.round(2 * z));
  const x0 = X(-166), x1 = X(166), y0 = Y(-250), y1 = Y(250);
  rect(x0, y0, x1, y1, P.DS0); frame(x0, y0, x1, y1, P.M5);
  rect(x0, y0, x1, y0 + 16 * z, P.DS2); text(FS, 'RESULTS', x0 + 6 * z, y0 + 4 * z, { sc, c: P.INK, ol: null });
  const rows = [
    ['TARGET', 'Cq ' + CQ.toFixed(1), 'cyc', P.RP2],
    ['POSITIVE CONTROL', 'AMPLIFIED', 'pos', P.CD3],
    ['NEGATIVE CONTROL', 'NO Cq', 'neg', P.SUB],
    ['INTERNAL CONTROL', 'AMPLIFIED', 'ic', P.HT3],
  ];
  const rh = 92 * z;
  rows.forEach(([name, val, key, col], i) => {
    const k = clamp((o.rows || 0) - i, 0, 1); if (k <= 0) return;
    const ry = y0 + 22 * z + i * rh;
    rect(x0 + 4 * z, ry, x1 - 4 * z, ry + rh - 6 * z, P.DS1);
    if (k < 1) { const sx = lerp(x0, x1, k); rect(sx - 6, ry, sx, ry + rh - 6 * z, P.DG2); }
    if (k >= 1) { const sw = ((t * 0.9 + i * 0.37) % 1.6) / 1.6, sx = lerp(x0 + 8 * z, x0 + 196 * z, sw); rect(sx, ry + 18 * z, sx + 1, ry + rh - 10 * z, P.DG2); }
    text(FS, name, x0 + 10 * z, ry + 6 * z, { sc, c: col, ol: null, n: k * 30 });
    const opt = { cyc: key === 'cyc' ? 40 : -1, thr: true, sc: Math.max(1, Math.round(z)) };
    if (key === 'pos') opt.pos = 40; if (key === 'neg') opt.neg = 40; if (key === 'ic') opt.ic = 40;
    plotUI(x0 + 8 * z, ry + 18 * z, x0 + 196 * z, ry + rh - 10 * z, opt);
    text(FS, val, x1 - 12 * z, ry + 34 * z, { sc, c: P.INK, ol: null, align: 'right', n: k * 30 });
    if (k >= 1 && key !== 'cyc') checkMark(x1 - 30 * z, ry + 58 * z, 6 * z, P.RP2);
  });
  if (o.banner > 0) {
    const s = backOut(clamp(o.banner * 1.4, 0, 1), 1.5), bw = (textW(FS, 'TARGET RNA DETECTED', 2) + 30) * s, by = y1 - 54 * z;
    rect(CX - bw / 2, by, CX + bw / 2, by + 24, P.RP1); rect(CX - bw / 2, by + 24, CX + bw / 2, by + 27, P.RP0);
    if (s > 0.9) { checkMark(CX - bw / 2 + 12, by + 12, 5, P.C6); text(FS, 'TARGET RNA DETECTED', CX + 8, by + 6, { sc: 2, c: P.C6, ol: null, align: 'center' }); }
    if (o.banner > 0.5) text(FS, 'CONTROLS VALID', CX, by + 34, { sc: 2, c: P.RP3, ol: P.SH, align: 'center', n: (o.banner - 0.5) * 60 });
  }
}
// ---------------------------------------------------------------- duplex icon (two strands) for crowds and doubling
function duplexIcon(x, y, len, z, kNew, sep) {
  const L = len * z, s = (sep || 0) * z;
  lineW(x - L / 2, y + 3 * z + s, x + L / 2, y + 3 * z + s, Math.max(2, 2.4 * z), P.TM2);
  lineW(x - L / 2, y - 3 * z - s, x - L / 2 + L * (kNew === undefined ? 1 : kNew), y - 3 * z - s, Math.max(2, 2.4 * z), P.NS2);
  if (!s) for (let k = 0; k < len / 4; k++) { const xx = x - L / 2 + (k + 0.5) * 4 * z; if ((xx - (x - L / 2)) / L <= (kNew === undefined ? 1 : kNew)) line(xx, y - 2 * z, xx, y + 2 * z, P.C4); }
}
// the doubling grid: n copies (1, 2, 4, 8, 16) arranged in a grid around (cx, cy)
function doublingGrid(cx, cy, n, pop_, z) {
  const cols = n <= 2 ? n : n <= 4 ? 2 : 4, rows = Math.ceil(n / cols), gw = 74 * z, gh = 26 * z;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = cx + (c - (cols - 1) / 2) * gw, y = cy + (r - (rows - 1) / 2) * gh;
    const k = i >= n / 2 ? pop_ : 1;          // the new half pops in
    if (k <= 0) continue;
    duplexIcon(x, y, 54 * k, z);
  }
}
// ---------------------------------------------------------------- many templates, many probes (signal grows)
const CROWD = Array.from({ length: 18 }, (_, i) => ({ x: -140 + (i % 3) * 140 + (hash(i + 2600) - 0.5) * 40, y: -250 + Math.floor(i / 3) * 92 + (hash(i + 2601) - 0.5) * 30, ph: hash(i + 2602) * TAU, tc: hash(i + 2603) }));
// k 0..1: how far the cleavage has spread through the crowd
function crowdScene(cam, t, k, o) {
  o = o || {};
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  // blue excitation wash from above
  rect(0, 0, W, H, P.XB0, 0.18 + 0.1 * Math.sin(t * 5));
  let lit = 0;
  CROWD.forEach((c, i) => {
    const x = cam.x(c.x + 5 * Math.sin(t * 0.8 + c.ph)), y = cam.y(c.y + 4 * Math.cos(t * 0.7 + c.ph));
    const cut = c.tc < k, kk = clamp((k - c.tc) * 6, 0, 1);
    duplexIcon(x, y, 80, z * 0.9, cut ? 0.4 + 0.6 * kk : 0.4);
    if (!cut) { probeIcon(x + 20 * z, y - 6 * z, 0, z * 0.6, 0); }
    else {
      // the freed reporter drifts off and glows; the quencher fragment drifts the other way
      reporter(x + 10 * z - kk * 10 * z, y - 14 * z - kk * 16 * z, z * 0.8, 0.6 + 0.4 * Math.sin(t * 8 + i));
      quencher(x + 34 * z + kk * 12 * z, y - 10 * z - kk * 6 * z, z * 0.6);
      lit++;
    }
    if (Math.abs(c.tc - k) < 0.06) enzymeIcon(x + (k - c.tc) * 300 * z, y, z * 0.9, 'pol', 0);
  });
  // detector level meter
  if (o.meter !== false) {
    const mx = 268, my0 = 124, my1 = 470, lv = lit / CROWD.length;
    rect(mx - 10, my0, mx + 10, my1, P.DS1); frame(mx - 10, my0, mx + 10, my1, P.N5);
    rect(mx - 7, lerp(my1, my0, lv), mx + 7, my1 - 3, P.RP2); rect(mx - 7, lerp(my1, my0, lv), mx + 7, lerp(my1, my0, lv) + 2, P.RP3);
    text(FS, 'SIGNAL', mx, my1 + 6, { sc: 1, c: P.RP2, ol: null, align: 'center' });
  }
  return lit / CROWD.length;
}
// ---------------------------------------------------------------- recap icons (one chain)
function rcRNA(x, y, s, t) { strandIcon(x - s * 0.45, y, 12, 0, s / 38, 'rna', t * 3); }
function rcRT(x, y, s) { enzymeIcon(x, y, s / 34, 'rt', 0); }
function rcCDNA(x, y, s, t) { strandIcon(x - s * 0.45, y + 4, 12, 0, s / 38, 'cdna', t * 3); strandIcon(x - s * 0.45, y - 6, 12, 0, s / 38, 'rna', t * 3 + 1); }
function rcPOL(x, y, s) { enzymeIcon(x, y, s / 34, 'pol', 0); }
function rcPROBE(x, y, s, t) { probeIcon(x - 6, y + 4, 0, s / 40, 0); line(x + 2, y - 10, x + 8, y + 2, P.YEL); line(x + 8, y - 10, x + 2, y + 2, P.YEL); }
function rcFLUOR(x, y, s, t) { reporter(x, y, s / 22, 0.8 + 0.2 * Math.sin(t * 8)); }
function rcPD(x, y, s) { rect(x - s * 0.4, y - s * 0.3, x + s * 0.4, y + s * 0.3, P.PD1); rect(x - s * 0.32, y - s * 0.22, x + s * 0.32, y + s * 0.22, P.PD3); for (let k = 0; k < 4; k++) rect(x - s * 0.26 + k * s * 0.16, y - s * 0.22, x - s * 0.26 + k * s * 0.16 + 1, y + s * 0.22, P.PD5); }
function rcRES(x, y, s) {
  rect(x - s * 0.5, y - s * 0.4, x + s * 0.5, y + s * 0.4, P.DS1); frame(x - s * 0.5, y - s * 0.4, x + s * 0.5, y + s * 0.4, P.N5);
  let px_ = null, py_ = null; for (let c = 0; c <= 40; c += 2) { const xx = x - s * 0.42 + c / 40 * s * 0.84, yy = y + s * 0.3 - (ampF(c) - 100) / 3500 * s * 0.6; if (px_ !== null) line(px_, py_, xx, yy, P.RP2); px_ = xx; py_ = yy; }
  checkMark(x + s * 0.2, y - s * 0.12, 4, P.C6);
}
const RECAP_ICONS = [rcRNA, rcRT, rcCDNA, rcPOL, rcPROBE, rcFLUOR, rcPD, rcRES];
const RECAP_L = ['VIRAL RNA', 'REVERSE TRANSCRIPTASE', 'cDNA', 'DNA POLYMERASE', 'PROBE CLEAVAGE', 'FLUORESCENCE', 'PHOTODIODE', 'DIGITAL RESULT'];
