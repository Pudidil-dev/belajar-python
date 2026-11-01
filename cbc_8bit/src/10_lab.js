'use strict';
// ============================================================================
// THE LAB AND THE ANALYZER (world px, z = 1 shows the whole bench).
// An original benchtop hematology analyzer (XN-type architecture, own design):
// a touchscreen on the left, a closed-tube sampler bay on the right with a
// piercing needle on a vertical carriage, and an EDTA tube with a lavender
// (purple) cap standing in the holder. The display shows the result screen
// (hook) and the full report (end); values are illustrative.
// ============================================================================
const ANZ = { x0: 14, x1: 346, y0: 196, y1: 500, scr: [30, 232, 178, 352], bay: [192, 246, 306, 496], tubeX: 249, capY: 326, tubeTop: 342, tubeBot: 454, bloodY: 362, railY0: 250, needleL: 58 };
const LAB_DUST = Array.from({ length: 34 }, (_, i) => ({ x: hash(i * 3 + 11) * 360, y: hash(i * 3 + 12) * 640, k: 0.3 + hash(i * 3 + 13) * 0.7, ph: hash(i + 900) * TAU }));
function labBG(cam, t) {
  rect(0, 0, W, H, P.BG);
  const X = v => cam.x(v), Y = v => cam.y(v);
  for (let i = -2; i < 8; i++) { const x = X(i * 70); rect(x, 0, x + 1, Y(500), P.N1); }
  for (const [sx, sy, sw] of [[-40, 150, 130], [260, 130, 150]]) {
    rect(X(sx), Y(sy), X(sx + sw), Y(sy + 4), P.BE2);
    for (let k = 0; k < 4; k++) { const bx = sx + 10 + k * 28, h = 16 + 10 * hash(k + sx); rect(X(bx), Y(sy - h), X(bx + 14), Y(sy), P.N3); rect(X(bx + 2), Y(sy - h + 3), X(bx + 4), Y(sy - 3), P.N4); }
  }
  for (const d of LAB_DUST) { const x = ((d.x + 9 * wob(t, 2, d.ph) - cam.cx * 0.3 * d.k) % 360 + 360) % 360, y = ((d.y - (t / DUR) * 640 * (1 + Math.round(d.k * 2)) - cam.cy * 0.3 * d.k) % 640 + 640) % 640; pset(x, y, d.k > 0.7 ? P.N6 : P.N5); }
  rect(0, Y(500), W, Y(506), P.BE4); rect(0, Y(506), W, Y(512), P.BE3); rect(0, Y(512), W, H, P.BE1);
}
// ---------------------------------------------------------------- the tube (EDTA, lavender cap) and the needle
// pierce: 0 needle up .. 1 needle tip in the blood; draw: 0..1 blood drawn up the needle
function needleTip(pierce) { return ANZ.capY - 22 + pierce * 64; }
function drawTube(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, x = ANZ.tubeX, hw = 11;
  // body (clear), blood, meniscus, rounded bottom
  rect(X(x - hw), Y(ANZ.tubeTop), X(x + hw), Y(ANZ.tubeBot - hw), P.TB2);
  disc(X(x), Y(ANZ.tubeBot - hw), hw * z, P.TB2);
  rect(X(x - hw + 1.5), Y(ANZ.bloodY), X(x + hw - 1.5), Y(ANZ.tubeBot - hw), P.BL2); disc(X(x), Y(ANZ.tubeBot - hw), (hw - 1.5) * z, P.BL2);
  rect(X(x - hw + 1.5), Y(ANZ.bloodY), X(x + hw - 1.5), Y(ANZ.bloodY + 2), P.BL3); rect(X(x + 3), Y(ANZ.bloodY + 4), X(x + hw - 2.5), Y(ANZ.tubeBot - 14), P.BL1);
  rect(X(x - hw + 2.5), Y(ANZ.tubeTop + 4), X(x - hw + 4), Y(ANZ.tubeBot - 14), P.TB3);                // highlight
  // label with barcode (leaves a window on the blood)
  rect(X(x - hw), Y(ANZ.tubeTop + 30), X(x + 1), Y(ANZ.tubeTop + 92), P.MW);
  for (let k = 0; k < 7; k++) rect(X(x - hw + 2 + k * 1.5), Y(ANZ.tubeTop + 62), X(x - hw + 2.6 + k * 1.5 + (k % 3 === 0 ? 0.6 : 0)), Y(ANZ.tubeTop + 86), P.M6);
  rect(X(x - hw), Y(ANZ.tubeTop + 30), X(x + 1), Y(ANZ.tubeTop + 34), P.CP1);
  // lavender cap (rubber stopper)
  const m = maskRR(X(x - hw - 2), Y(ANZ.capY), X(x + hw + 2), Y(ANZ.tubeTop + 4), 3 * z); shade(m, P.CP1, P.CP2, P.CP0, P.CP0, { k: Math.max(1, Math.round(z)) });
  for (let k = 0; k < 6; k++) rect(X(x - hw + k * 4), Y(ANZ.capY + 2), X(x - hw + k * 4 + 1.2), Y(ANZ.tubeTop + 2), P.CP0);
  disc(X(x), Y(ANZ.capY + 2), 3 * z, P.CP0);
}
function drawNeedle(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, x = ANZ.tubeX, pierce = o.pierce || 0, draw = o.draw || 0;
  const tip = needleTip(pierce), top = tip - ANZ.needleL;
  // vertical rail and the carriage block
  rect(X(x + 16), Y(ANZ.railY0), X(x + 20), Y(ANZ.capY - 4), P.M4); rect(X(x + 17), Y(ANZ.railY0), X(x + 18), Y(ANZ.capY - 4), P.M3);
  const bm = maskRR(X(x - 9), Y(top - 16), X(x + 22), Y(top + 2), 2 * z); shade(bm, P.M3, P.M2, P.M5, P.M6, {});
  rect(X(x - 6), Y(top - 12), X(x + 6), Y(top - 8), P.AC2);
  // the needle (steel), with the blood drawn up its bore
  rect(X(x - 1.4), Y(top), X(x + 1.4), Y(tip), P.AL2); rect(X(x - 1.4), Y(top), X(x - 0.6), Y(tip), P.AL4);
  poly(cam.pts([x - 1.4, tip - 3, x + 1.4, tip - 3, x, tip + 1.5]), P.AL3);
  if (draw > 0) { const by = lerp(tip, tip - ANZ.needleL + 4, draw); rect(X(x - 0.5), Y(by), X(x + 0.5), Y(tip - 2), P.BL3); }
  // the tubing leaving the carriage
  lineW(X(x + 4), Y(top - 14), X(x + 30), Y(top - 40), 2.4 * z, P.TB1);
}
// ---------------------------------------------------------------- the analyzer
function drawAnalyzer(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // body
  const mb = maskRR(X(ANZ.x0), Y(ANZ.y0), X(ANZ.x1), Y(ANZ.y1), 10 * z); shade(mb, P.M1, P.MW, P.M2, P.M4, { k: Math.max(1, Math.round(z)) });
  rect(X(ANZ.x0 + 6), Y(ANZ.y0 + 6), X(ANZ.x1 - 6), Y(ANZ.y0 + 22), P.MW);
  rect(X(ANZ.x0 + 6), Y(ANZ.y0 + 24), X(ANZ.x1 - 6), Y(ANZ.y0 + 27), P.AC1);
  for (let k = 0; k < 10; k++) rect(X(ANZ.x0 + 20 + k * 9), Y(ANZ.y1 - 30), X(ANZ.x0 + 24 + k * 9), Y(ANZ.y1 - 12), P.M2);
  // touchscreen
  const [s0, s1, s2, s3] = ANZ.scr;
  const ms = maskRR(X(s0 - 4), Y(s1 - 4), X(s2 + 4), Y(s3 + 4), 4 * z); shade(ms, P.M6, P.M5, P.K0, P.K0, {});
  rect(X(s0), Y(s1), X(s2), Y(s3), P.DS0);
  if (o.screen) o.screen(X(s0), Y(s1), X(s2), Y(s3));
  // sampler bay
  const [b0, b1, b2, b3] = ANZ.bay;
  const mbay = maskRR(X(b0), Y(b1), X(b2), Y(b3), 6 * z); shade(mbay, P.M5, P.M4, P.M6, P.M6, {});
  rect(X(b0 + 8), Y(b1 + 8), X(b2 - 8), Y(b3 - 8), P.M6);
  // tube holder ring and status light
  drawTube(cam, t, o);
  rect(X(ANZ.tubeX - 16), Y(ANZ.tubeBot - 26), X(ANZ.tubeX + 16), Y(ANZ.tubeBot - 12), P.M4); rect(X(ANZ.tubeX - 16), Y(ANZ.tubeBot - 26), X(ANZ.tubeX + 16), Y(ANZ.tubeBot - 24), P.M3);
  const on = o.busy ? (Math.floor(t * 4) % 2 ? P.SG2 : P.SG1) : P.SG1;
  disc(X(b2 - 16), Y(b3 - 20), 3 * z, on); ring(X(b2 - 16), Y(b3 - 20), 5 * z, 1.2, P.M3);
  drawNeedle(cam, t, o);
}
function labScene(cam, t, o) { labBG(cam, t); drawAnalyzer(cam, t, o || {}); }
// ---------------------------------------------------------------- display UIs (drawn into the screen rect)
function uiFrame(x0, y0, x1, y1, title, sc) {
  rect(x0, y0, x1, y1, P.DS1); rect(x0, y0, x1, y0 + 9 * sc, P.DS2);
  text(FS, title, x0 + 4 * sc, y0 + 2 * sc, { sc, c: P.SUB, ol: null });
}
// the hook's result screen: k = 0..3 how many values have landed; t1 = time the RBC number lands; busy = 0..1 progress bar
// layout in sc units (sc = screen width / 110): everything left-aligned inside ~100 sc so it stays clear of the
// right-hand app buttons when the display fills the frame
function resultUI(x0, y0, x1, y1, t, o) {
  const w = x1 - x0, sc = o.sc || Math.max(1, Math.floor(w / 110));
  uiFrame(x0, y0, x1, y1, 'RESULT  ·  SAMPLE 042', sc);
  const k = o.k || 0, L = x0 + 6 * sc;
  if (k > 0) {
    const s = 1 + 0.3 * (1 - backOut(clamp((t - o.t1) / 0.25, 0, 1), 1.6)), big = Math.max(2, Math.round(sc * 2 * s));
    text(FS, 'RED BLOOD CELLS', L, y0 + 14 * sc, { sc, c: P.RB3, ol: null });
    text(FC, EX.rbc, L, y0 + 22 * sc - (big - 2 * sc) * 4, { sc: big, c: P.INK, ol: null });
    text(FS, 'MILLION / µL', L, y0 + 43 * sc, { sc, c: P.SUB, ol: null });
    if (t - o.t1 < 0.3) flash(L + textW(FC, EX.rbc, big) + 6 * sc, y0 + 30 * sc, 4 * sc, 1 - (t - o.t1) / 0.3, [P.RB1, P.RB2, P.RB3, P.C6]);
  }
  if (k > 1) { text(FS, 'WBC', L, y0 + 55 * sc, { sc, c: P.WB3, ol: null }); text(FS, '7,200 / µL', L + 22 * sc, y0 + 55 * sc, { sc, c: P.INK, ol: null }); }
  if (k > 2) { text(FS, 'PLT', L, y0 + 64 * sc, { sc, c: P.PL3, ol: null }); text(FS, '250,000 / µL', L + 22 * sc, y0 + 64 * sc, { sc, c: P.INK, ol: null }); }
  if (o.busy > 0) { const bw = 96 * sc * clamp(o.busy, 0, 1); rect(L, y1 - 8 * sc, L + bw, y1 - 6 * sc, P.SG2); text(FS, 'ASPIRATING', L, y1 - 16 * sc, { sc, c: P.SG2, ol: null }); }
}
// the full report: rows revealed 0..n (fractions type in), checks, differential bars, QC line; content within ~130 sc
function reportUI(x0, y0, x1, y1, t, o) {
  const w = x1 - x0, h = y1 - y0, sc = o.sc || Math.max(1, Math.floor(Math.min(w, h) / 130)), L = x0 + 6 * sc;
  uiFrame(x0, y0, x1, y1, 'COMPLETE BLOOD COUNT  ·  EXAMPLE', sc);
  const rows = [['RBC', EX.rbc, '×10⁶/µL', P.RB3], ['WBC', EX.wbc, '×10³/µL', P.WB3], ['PLT', EX.plt, '×10³/µL', P.PL3], ['HGB', EX.hgb, 'g/dL', P.HB3]];
  const n = o.rows || 0;
  rows.forEach(([nm_, v, u, col], i) => {
    const k = clamp(n - i, 0, 1); if (k <= 0) return;
    const y = y0 + 13 * sc + i * 14 * sc;
    text(FS, nm_, L, y + 2 * sc, { sc, c: col, ol: null, n: k * 6 });
    text(FC, v, x0 + 30 * sc, y, { sc, c: P.INK, ol: null, n: k * 6 });
    text(FC, u, x0 + 30 * sc + textW(FC, v, sc) + 4 * sc, y, { sc, c: P.SUB, ol: null, n: k * 9 });
    if (o.checks > i * 0.2 && k >= 1) checkMark(x0 + 120 * sc, y + 4 * sc, 3 * sc, P.SG2);
  });
  const dk = clamp(n - 4, 0, 1);
  if (dk > 0) {
    const yb = y0 + 71 * sc, cols = [P.GNE, P.GLY, P.GMO, P.GEO, P.GBA];
    EX.diff.forEach(([nm_, pct], i) => {
      const y = yb + i * 8 * sc;
      text(FS, nm_, L, y, { sc, c: cols[i], ol: null, n: dk * 8 });
      rect(x0 + 34 * sc, y + sc, x0 + 34 * sc + Math.max(sc, 66 * sc * pct / 60 * dk), y + 5 * sc, cols[i]);
      text(FS, pct.toFixed(1) + '%', x0 + 128 * sc, y, { sc, c: P.INK, ol: null, align: 'right', n: dk * 8 });
    });
  }
  if (o.qc > 0) { const y = y0 + 114 * sc; checkMark(L + 3 * sc, y + 3 * sc, 3 * sc, P.SG2); text(FS, 'QC PASSED  ·  NO FLAGS', L + 10 * sc, y, { sc, c: P.SG2, ol: null, n: o.qc * 24 }); }
}
