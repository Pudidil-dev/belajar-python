'use strict';
// ============================================================================
// INSIDE THE METER: the signal path lights up stage by stage
// (strip contacts -> amplifier -> converter -> processor -> display), and a
// small scope card floats over each chip: the current trace, the samples,
// the calibration curve that turns the signal into 104 mg/dL.
// ============================================================================
function pcbState(t) {
  const st = { live: [0, 0, 0, 0], hot: [0, 0, 0], pulse: [] };
  if (t > 41.7) { st.live[0] = 1; st.pulse.push([0, t, 3]); }
  if (t > T_AFE) st.hot[0] = Math.min(1, 0.5 + 0.5 * pulse(t, T_AFE, 0.5) + 0.3 * pulse(t, T_SPIKE, 0.6));
  if (t > SC_T[17] + 0.1) { st.live[1] = 1; st.pulse.push([1, t, 4]); }
  if (t > T_ADC0) st.hot[1] = Math.min(1, 0.55 + 0.45 * Math.abs(Math.sin((t - T_ADC0) * Math.PI / E8)) * (t < 48.6 ? 1 : 0));
  if (t > T_BITS) { st.live[2] = 1; st.bits = [2, t]; }
  if (t > SC_T[18] + 0.3) st.hot[2] = Math.min(1, 0.5 + 0.5 * pulse(t, T_CAL, 0.5) + 0.5 * pulse(t, T_104, 0.6));
  if (t > T_104 - 0.2 && t < T_CLOSE1) { st.live[3] = 1; st.bits3 = [3, t]; }
  return st;
}
// bits travelling along a route (digital stage): little squares, bright = 1, dim = 0
function drawBits(cam, g, k, t, n) {
  const RP = routePaths(), p = RP[k], z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v);
  for (let q = 0; q < n; q++) {
    const s = ((t * 9 + q * p.L / n) % p.L + p.L) % p.L, a = p.at(s), one = hash(q + 77 + k * 13) > 0.45, r = Math.max(1.5, 0.45 * z);
    rect(X(a[0]) - r, Y(a[1]) - r, X(a[0]) + r, Y(a[1]) + r, one ? P.SG2 : P.SG0);
    if (one) rect(X(a[0]) - r, Y(a[1]) - r, X(a[0]) + r * 0.2, Y(a[1]) - r * 0.2, P.SG3);
  }
}
// ---------------------------------------------------------------- scope cards (fixed pixel size, anchored above a chip)
const CARD = { w: 204, h: 136 };
function cardFrame(x, y, w, h, k, col) {
  const hh = Math.round(h * k);
  if (hh < 3) return false;
  const y0 = Math.round(y + (h - hh) / 2);
  rect(x + 3, y0 + 3, x + w + 3, y0 + hh + 3, P.SH, 0.5);
  rect(x, y0, x + w, y0 + hh, P.LC0); frame(x, y0, x + w, y0 + hh, col || P.LC2);
  rect(x, y0, x + w, y0 + 1, P.LC2);
  return k >= 1;
}
// amperometric response: a sharp rise when the voltage is applied, then a decay (Cottrell-like)
function iCurve(u) { if (u < 0.02) return u / 0.02 * 0.9; return 0.18 + 0.72 / Math.sqrt(1 + (u - 0.02) * 22); }
const WIN = [0.62, 0.78];                       // where the meter reads the response (fraction of the trace)
function plotXY(x, y, w, h) { return [u => x + 14 + u * (w - 26), v => y + h - 20 - v * (h - 44)]; }
function cardCurrent(cx, cy, t, k) {           // s17: the current trace is drawn, the reading window lights
  const x = Math.round(cx - CARD.w / 2), y = Math.round(cy - CARD.h), w = CARD.w, h = CARD.h;
  if (!cardFrame(x, y, w, h, k)) return;
  const [PX, PY] = plotXY(x, y, w, h);
  line(PX(0), PY(0), PX(1), PY(0), P.LC2); line(PX(0), PY(0), PX(0), PY(1.05), P.LC2);
  for (let i = 1; i < 5; i++) line(PX(i / 5), PY(0), PX(i / 5), PY(0) + 2, P.LC2);
  text(FM, 'CURRENT', x + 8, y + 6, { sc: 2, c: P.SUB, ol: null });
  text(FM, 'TIME', x + w - 46, y + h - 14, { sc: 2, c: P.SUB, ol: null });
  // reading window band
  const wk = clamp((t - T_WIN) / 0.3, 0, 1);
  if (wk > 0) { rect(PX(WIN[0]), PY(1.02), PX(WIN[1]), PY(0), P.SG0, 0.35 + 0.4 * wk); rect(PX(WIN[0]), PY(1.02), PX(WIN[0]) + 1, PY(0), P.SG1); rect(PX(WIN[1]), PY(1.02), PX(WIN[1]) + 1, PY(0), P.SG1); }
  // the trace, drawn from the spike on
  const ue = clamp((t - T_SPIKE + 0.05) / 1.75, 0, 1);
  let pv = null;
  for (let i = 0; i <= 120; i++) { const u = i / 120; if (u > ue) break; const p = [PX(u), PY(iCurve(u))]; if (pv) { line(pv[0], pv[1], p[0], p[1], P.SG2); line(pv[0], pv[1] + 1, p[0], p[1] + 1, P.SG1); } pv = p; }
  if (pv && ue < 1) { disc(pv[0], pv[1], 2.5, P.SG3); }
  if (wk > 0) { const um = (WIN[0] + WIN[1]) / 2, mx = PX(um), my = PY(iCurve(um)); disc(mx, my, 3 + 2 * pulse(t, T_WIN, 0.4), P.SG3); text(FM, 'READ', mx - 18, PY(1.02) + 2, { sc: 2, c: P.SG3, ol: null }); }
}
function cardSamples(cx, cy, t, k) {           // s18: the trace is chopped into numbers
  const x = Math.round(cx - CARD.w / 2), y = Math.round(cy - CARD.h), w = CARD.w, h = CARD.h;
  if (!cardFrame(x, y, w, h, k)) return;
  const [PX, PY] = plotXY(x, y, w, h);
  line(PX(0), PY(0), PX(1), PY(0), P.LC2); line(PX(0), PY(0), PX(0), PY(1.05), P.LC2);
  text(FM, 'SAMPLES', x + 8, y + 6, { sc: 2, c: P.SUB, ol: null });
  let pv = null;
  for (let i = 0; i <= 120; i++) { const u = i / 120, p = [PX(u), PY(iCurve(u))]; if (pv) line(pv[0], pv[1], p[0], p[1], P.SG0); pv = p; }
  const N = 16, nOn = clamp(Math.floor((t - T_ADC0) / (BEAT / 4)) + 1, 0, N);
  for (let i = 0; i < nOn; i++) {
    const u = (i + 0.5) / N, v = iCurve(u), x0 = PX(i / N) + 1, x1 = PX((i + 1) / N) - 1, top = PY(v);
    const fresh = i === nOn - 1 && t < 48.6;
    rect(x0, top, x1, PY(0), fresh ? P.SG2 : P.SG1); rect(x0, top, x1, top + 1, P.SG3);
  }
  // the latest value as a binary word
  if (nOn > 0) {
    const v = Math.round(iCurve((nOn - 0.5) / N) * 255);
    for (let b = 0; b < 8; b++) { const on = (v >> (7 - b)) & 1, bx = x + w - 6 - (8 - b) * 9, by = y + 6; rect(bx, by, bx + 7, by + 9, on ? P.SG2 : P.SG0); }
  }
}
function cardCal(cx, cy, t, k) {               // s19: the calibration curve maps the signal to mg/dL
  const x = Math.round(cx - CARD.w / 2), y = Math.round(cy - CARD.h), w = CARD.w, h = CARD.h;
  if (!cardFrame(x, y, w, h, k)) return;
  const [PX, PY] = plotXY(x + 10, y, w - 10, h);
  line(PX(0), PY(0), PX(1), PY(0), P.LC2); line(PX(0), PY(0), PX(0), PY(1.05), P.LC2);
  text(FM, 'mg/dL', x + 8, y + 6, { sc: 2, c: P.SUB, ol: null });
  text(FM, 'SIGNAL', x + w - 62, y + h - 14, { sc: 2, c: P.SUB, ol: null });
  const cal = u => 0.06 + 0.86 * u + 0.05 * Math.sin(u * 3);
  let pv = null;
  for (let i = 0; i <= 100; i++) { const u = i / 100, p = [PX(u), PY(cal(u))]; if (pv) { line(pv[0], pv[1], p[0], p[1], P.LC3); } pv = p; }
  const um = 0.38, kx = clamp((t - (T_CAL - 0.75)) / 0.75, 0, 1), ky = clamp((t - (T_104 - 0.7)) / 0.7, 0, 1);
  const mx = PX(um), my = PY(cal(um));
  // measured signal arrives on the x axis, climbs to the curve, then reads across to the glucose axis
  if (t > SC_T[18] + 0.4) {
    disc(mx, PY(0), 3, P.SG2);
    if (kx > 0) { const yy = lerp(PY(0), my, K75(kx)); dashLine(mx, PY(0), mx, yy, P.SG1, 3, 2, t * 20); disc(mx, yy, 3, P.SG3); }
    if (ky > 0) { const xx = lerp(mx, PX(0), K75(ky)); dashLine(mx, my, xx, my, P.LC3, 3, 2, t * 20); disc(xx, my, 3, P.LC4); }
    if (t > T_104) { const s = 1 + 0.6 * (1 - eout(clamp((t - T_104) / 0.2, 0, 1))); text(FL, '104', PX(0) + 6, my - 16, { sc: 2 * s > 2.5 ? 3 : 2, c: P.LC4, ol: P.SH }); }
  }
}
// cards over the chips, in screen space (they ride along with the board)
function drawCards(cam, g, t) {
  const X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v);
  const ka = clamp((t - (SC_T[16] + 0.15)) / 0.25, 0, 1) * (1 - clamp((t - (SC_T[17] + 0.75)) / 0.22, 0, 1));
  if (ka > 0) cardCurrent(X(PCB.afe[0]) - 6, Y(PCB.afe[1] - PCB.afe[3]) - 22, t, ka);
  const kb = clamp((t - (SC_T[17] + 0.05)) / 0.25, 0, 1) * (1 - clamp((t - (SC_T[18] + 0.05)) / 0.22, 0, 1));
  if (kb > 0) cardSamples(X(PCB.adc[0]) + 4, Y(PCB.adc[1] - PCB.adc[3]) - 22, t, kb);
  const kc = clamp((t - (SC_T[18] + 0.35)) / 0.25, 0, 1) * (1 - clamp((t - (SC_T[19] + 0.35)) / 0.25, 0, 1));
  if (kc > 0) cardCal(X(PCB.mcu[0]), Y(PCB.mcu[1] - PCB.mcu[3]) - 24, t, kc);
}
