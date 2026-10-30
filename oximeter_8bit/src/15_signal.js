'use strict';
// ============================================================================
// THE SIGNAL (px world units): one long vertical "scope" inside the processor,
// panels stacked downward in the order the device works:
//   y    0  raw photodiode signal (high steady level, small dips per pulse)
//   y  560  the same trace split into DC (baseline) and AC (the pulse)
//   y 1120  red and infrared channels, sorted by the LED time slots
//   y 1680  ratio of ratios: (AC/DC) red / (AC/DC) infrared = R
//   y 2240  calibration curve: R -> SpO2
//   y 2800  pulse rate from the gaps between peaks
// Every curve comes from the pulse model in 03_clock.js. Pulses are drawn
// exaggerated (EXG) and the screen says so; the numbers are the real ones.
// ============================================================================
const EXG = 8;                                        // pulse drawn 8x deeper than real
const SG = { x0: -160, x1: 160, win: 2.8 };          // screen x span, seconds shown across
function sgBG(cam, t) {
  rect(0, 0, W, H, P.K0); rect(0, 0, W, H, P.BG, 0.55);
  // fine scope grid (world-anchored, so it moves with the camera)
  const g = 20 * cam.z, ox = ((cam.x(0) % g) + g) % g, oy = ((cam.y(0) % g) + g) % g;
  for (let x = ox; x < W; x += g) rect(x, 0, x + 1, H, P.N2, 0.5);
  for (let y = oy; y < H; y += g) rect(0, y, W, y + 1, P.N2, 0.5);
  for (let x = ox; x < W; x += g * 5) rect(x, 0, x + 1, H, P.N3, 0.7);
  for (let y = oy; y < H; y += g * 5) rect(0, y, W, y + 1, P.N3, 0.7);
}
// a panel frame with a small heading (world coords)
function sgPanel(cam, x0, y0, x1, y1, title, col) {
  const X0 = cam.x(x0), Y0 = cam.y(y0), X1 = cam.x(x1), Y1 = cam.y(y1);
  rect(X0, Y0, X1, Y1, P.DS1, 0.55);
  frame(X0, Y0, X1, Y1, P.N4); frame(X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, P.K0);
  for (const [cx, cy] of [[X0, Y0], [X1 - 1, Y0], [X0, Y1 - 1], [X1 - 1, Y1 - 1]]) rect(cx - 1, cy - 1, cx + 2, cy + 2, col || P.DT2);
  if (title) text(FS, title, X0 + 6, Y0 + 6, { sc: 2, c: col || P.DT3, ol: null });
}
// draw a time trace f(tt) (value in world y) across [x0, x1] for times [t - win, t]; returns the head point
function sgTrace(cam, x0, x1, t, win, f, col, w, glowCol) {
  const n = Math.max(40, Math.round((x1 - x0) * cam.z / 2)), pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, tt = t - (1 - u) * win; pts.push(cam.x(lerp(x0, x1, u)), cam.y(f(tt))); }
  if (glowCol !== undefined) for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], (w || 2) + 4, glowCol, 0.35);
  for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], w || 2, col);
  const hx = pts[pts.length - 2], hy = pts[pts.length - 1];
  disc(hx, hy, 3.5, col); disc(hx, hy, 1.8, P.C6);
  return [hx, hy];
}
// the raw signal (light reaching the photodiode, infrared slot), world y for value
const rawY = (tt, y0, amp) => y0 - amp * (1 - M_IR * EXG * pleth(tt));
// ---------------------------------------------------------------- panel content
function sgRaw(cam, t, k, o) {          // y 0: the raw trace
  o = o || {};
  const top = 40, bot = 300, base = 260, amp = 200;
  sgPanel(cam, -170, top - 40, 170, bot + 10, 'PHOTODIODE SIGNAL', P.SG2);
  // axis: zero light at the bottom
  line(cam.x(-160), cam.y(base), cam.x(160), cam.y(base), P.N5);
  text(FS, '0', cam.x(-166), cam.y(base - 4), { sc: 1, c: P.SUB, ol: null });
  const head = sgTrace(cam, -160, 160 * k, t, SG.win * k, tt => rawY(tt, base, amp), P.SG2, 3, P.SG1);
  return head;
}
function sgSplit(cam, t, k, sepK) {     // y 560: DC and AC
  const y0 = 560, amp = 200, dip = tt => amp * M_IR * EXG * pleth(tt);
  sgPanel(cam, -170, y0 - 30, 170, y0 + 330, null);
  const dcY = y0 + 70 - 10 * sepK, acY = y0 + 70 + 150 * sepK, gain = 1 + 2.2 * sepK;
  // DC: the steady level (tissue, bone, veins and the non-pulsing blood); AC: the pulse, zoomed in
  lineW(cam.x(-160), cam.y(dcY), cam.x(160), cam.y(dcY), 3, P.DT2);
  sgTrace(cam, -160, 160, t, SG.win, tt => acY + gain * dip(tt) - sepK * gain * amp * M_IR * EXG * 0.3, P.SG2, 3, P.SG1);
  return [dcY, acY];
}
// channels: red and infrared (o.slots = show the LED time-slot strip)
function sgChannels(cam, t, k) {
  const y0 = 1120;
  sgPanel(cam, -170, y0 - 30, 170, y0 + 390, null);
  // the LED timing strip: red, infrared, dark, repeating (slowed down)
  const sy = y0 - 6, cell = 16, off = (t * 60) % (cell * 3);
  for (let i = -1; i < 23; i++) {
    const x = -160 + i * cell - off; if (x < -164 || x > 150) continue;
    const kind = ((i % 3) + 3) % 3, c = kind === 0 ? P.LR3 : kind === 1 ? P.IR3 : P.N3;
    rect(cam.x(x), cam.y(sy), cam.x(x + cell - 2), cam.y(sy + 10), c);
  }
  text(FS, 'RED  IR  DARK', cam.x(-160), cam.y(sy + 16), { sc: 1, c: P.SUB, ol: null });
  // red channel (top) and infrared channel (bottom): own baselines, different pulse depths
  const rY = y0 + 150, iY = y0 + 330, amp = 190;
  sgTrace(cam, -160, 160, t, SG.win, tt => rY - amp * (1 - M_RED * EXG * pleth(tt)) + amp * 0.85, P.LR3, 3, P.LR1);
  sgTrace(cam, -160, 160, t, SG.win, tt => iY - amp * (1 - M_IR * EXG * pleth(tt)) + amp * 0.85, P.IR3, 3, P.IR1);
  return [rY, iY];
}
// ratio-of-ratios bars (k: build-up 0..1)
function sgRatio(cam, t, k) {
  const y0 = 1680, X = v => cam.x(v), Y = v => cam.y(v);
  sgPanel(cam, -170, y0 - 30, 170, y0 + 400, null);
  const col = (x, label, acPct, cA, cB, kk) => {
    // DC bar (tall) and AC bar (short, real proportion drawn x EXG)
    const dcH = 220, acH = dcH * acPct / 100 * EXG;
    const bx = x - 22, by = y0 + 300;
    rect(X(bx), Y(by - dcH * kk), X(bx + 20), Y(by), cB); rect(X(bx), Y(by - dcH * kk), X(bx + 20), Y(by - dcH * kk) + 2, P.C6);
    // AC bar: the outline is the pulse's full swing; the fill rises and falls with each heartbeat
    const live = kk >= 1 ? 0.3 + 0.7 * pleth(t) : 1, top = by - acH * kk;
    rect(X(bx + 26), Y(top), X(bx + 46), Y(by), cB); frame(X(bx + 26), Y(top), X(bx + 46), Y(by), cA);
    rect(X(bx + 26), Y(by - acH * kk * live), X(bx + 46), Y(by), cA); rect(X(bx + 26), Y(by - acH * kk * live), X(bx + 46), Y(by - acH * kk * live) + 2, P.C6);
    text(FS, 'DC', X(bx + 3), Y(by + 6), { sc: 1, c: P.SUB, ol: null }); text(FS, 'AC', X(bx + 30), Y(by + 6), { sc: 1, c: P.SUB, ol: null });
    text(FS, label, X(x), Y(y0 + 4), { sc: 2, c: cA, ol: null, align: 'center' });
  };
  col(-118, 'RED', M_RED * 100, P.LR3, P.LR1, k);
  col(118, 'INFRARED', M_IR * 100, P.IR3, P.IR1, k);
}
// calibration curve: R on x, SpO2 on y (the common empirical line, simplified)
function sgCalib(cam, t, k, mk) {
  const y0 = 2240, X = v => cam.x(v), Y = v => cam.y(v);
  sgPanel(cam, -170, y0 - 30, 170, y0 + 400, null);
  const gx0 = -104, gx1 = 150, gy0 = y0 + 40, gy1 = y0 + 340;
  const rx = r => gx0 + (r - 0.3) / (1.5 - 0.3) * (gx1 - gx0), sy = s => gy1 - (s - 70) / (100 - 70) * (gy1 - gy0);
  line(X(gx0), Y(gy1), X(gx1), Y(gy1), P.N5); line(X(gx0), Y(gy0), X(gx0), Y(gy1), P.N5);
  for (const r of [0.5, 1.0, 1.5]) { line(X(rx(r)), Y(gy1), X(rx(r)), Y(gy1 + 5), P.N5); text(FS, r.toFixed(1), X(rx(r)), Y(gy1 + 9), { sc: 2, c: P.SUB, ol: null, align: 'center' }); }
  for (const s of [70, 80, 90, 100]) { line(X(gx0 - 5), Y(sy(s)), X(gx0), Y(sy(s)), P.N5); text(FS, String(s), X(gx0 - 9), Y(sy(s) - 5), { sc: 2, c: P.SUB, ol: null, align: 'right' }); }
  text(FS, 'R', X(gx1 - 6), Y(gy1 + 20), { sc: 2, c: P.DT3, ol: null });
  text(FS, 'SpO₂ %', X(gx0 - 6), Y(gy0 - 22), { sc: 2, c: P.DY1, ol: null });
  // the curve, drawn in
  let px_ = null, py_ = null;
  for (let r = 0.3; r <= 0.3 + 1.2 * k + 1e-6; r += 0.02) {
    const s = clamp(110 - 25 * r, 70, 100), x = X(rx(r)), y = Y(sy(s));
    if (px_ !== null) lineW(px_, py_, x, y, 3, P.DT3);
    px_ = x; py_ = y;
  }
  // the measured R slides onto the curve and reads off SpO2
  if (mk > 0) {
    const r = R_RATIO, s = 110 - 25 * r, x = X(rx(r)), y = Y(sy(s)), yb = Y(gy1);
    const u = clamp(mk * 2, 0, 1), v = clamp(mk * 2 - 1, 0, 1);
    dashLine(x, yb, x, lerp(yb, y, u), P.DT4, 4, 3, 0);
    if (v > 0) dashLine(x, y, lerp(x, X(gx0), v), y, P.DY1, 4, 3, 0);
    disc(x, lerp(yb, y, u), 5, P.DT4); disc(x, lerp(yb, y, u), 2.5, P.C6);
    if (v >= 1) { disc(X(gx0), y, 5, P.DY1); }
  }
}
// pulse rate: peaks marked, the gap between them in seconds
function sgPulseRate(cam, t, k) {
  const y0 = 2800;
  sgPanel(cam, -170, y0 - 30, 170, y0 + 330, null);
  const base = y0 + 220, amp = 150;
  const f = tt => base - amp * pleth(tt);           // the device's pleth view: blood volume up
  sgTrace(cam, -160, 160, t, SG.win, f, P.SG2, 3, P.SG1);
  // mark the peaks inside the window
  const pk = 0.17;                                   // peak phase after each beat
  for (let n = Math.floor((t - SG.win) / HB) - 1; n <= Math.floor(t / HB); n++) {
    const tp = n * HB + pk; if (tp < t - SG.win || tp > t) continue;
    const x = cam.x(lerp(-160, 160, 1 - (t - tp) / SG.win)), y = cam.y(f(tp));
    ring(x, y, 7, 2, P.DY1);
    line(x, y + 9, x, cam.y(base + 26), P.N5);
  }
}
