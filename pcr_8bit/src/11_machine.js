'use strict';
// ============================================================================
// THERMAL CONTROL (world px, close-ups).
// The Peltier module: n- and p-type semiconductor pellets in series between two
// ceramic plates, joined by copper tabs. Current makes the charge carriers in
// BOTH legs drift the same way (electrons in n, holes in p), carrying heat with
// them: heat is pumped up into the aluminium block (heating) or, with the
// current reversed, down into the heat sink where the fan blows it away
// (cooling). Heat is moved, never "made cold". A thermistor in the block feeds
// a controller that sets the current. Also: the example temperature program.
// ============================================================================
const PEL = { x0: -132, x1: 132, blkY0: -150, blkY1: -74, ceT: -74, ceTb: -62, pelY0: -62, pelY1: 8, ceB: 8, ceBb: 20, hsY0: 20, hsY1: 120, n: 6, pw: 28, pdx: 44 };
const pelX = i => PEL.x0 + 22 + i * PEL.pdx;
// o: { mode +1 heating / -1 cooling / 0 idle, k (carrier speed), temp (°C shown), set (setpoint), loop (0..1 feedback highlight) }
function peltierScene(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, mode = o.mode || 0, T = o.temp === undefined ? 60 : o.temp;
  rect(0, 0, W, H, P.BG);
  // aluminium block with well tips pressed into it; its colour follows the temperature
  const hot = clamp((T - 60) / 35, 0, 1), cold = clamp((70 - T) / 15, 0, 1) * (mode < 0 ? 1 : 0.4);
  rect(X(PEL.x0 - 10), Y(PEL.blkY0), X(PEL.x1 + 10), Y(PEL.blkY1), P.AL2);
  rect(X(PEL.x0 - 10), Y(PEL.blkY0), X(PEL.x1 + 10), Y(PEL.blkY0 + 3), P.AL3); rect(X(PEL.x0 - 10), Y(PEL.blkY1 - 3), X(PEL.x1 + 10), Y(PEL.blkY1), P.AL1);
  if (hot > 0) rect(X(PEL.x0 - 10), Y(PEL.blkY0), X(PEL.x1 + 10), Y(PEL.blkY1), P.HT2, 0.55 * hot);
  if (cold > 0) rect(X(PEL.x0 - 10), Y(PEL.blkY0), X(PEL.x1 + 10), Y(PEL.blkY1), P.CL2, 0.45 * cold);
  for (let k = 0; k < 5; k++) { const wx = -100 + k * 50; poly(cam.pts([wx - 14, PEL.blkY0 - 30, wx + 14, PEL.blkY0 - 30, wx + 6, PEL.blkY0 + 34, wx - 6, PEL.blkY0 + 34]), P.TB2); poly(cam.pts([wx - 10, PEL.blkY0 - 6, wx + 10, PEL.blkY0 - 6, wx + 4, PEL.blkY0 + 30, wx - 4, PEL.blkY0 + 30]), P.LQ3); }
  // thermistor in the block
  disc(X(PEL.x0 + 6), Y(PEL.blkY0 + 52), 5 * z, P.CH0); disc(X(PEL.x0 + 6), Y(PEL.blkY0 + 52), 2.5 * z, o.loop > 0 ? P.YEL : P.CH3);
  // ceramic plates
  rect(X(PEL.x0), Y(PEL.ceT), X(PEL.x1), Y(PEL.ceTb), P.CE2); rect(X(PEL.x0), Y(PEL.ceTb - 2), X(PEL.x1), Y(PEL.ceTb), P.CE1);
  rect(X(PEL.x0), Y(PEL.ceB), X(PEL.x1), Y(PEL.ceBb), P.CE1); rect(X(PEL.x0), Y(PEL.ceB), X(PEL.x1), Y(PEL.ceB + 2), P.CE2);
  // copper tabs: top joins (0,1)(2,3)(4,5); bottom joins (1,2)(3,4) and the two leads
  const tabT = (a, b) => rect(X(pelX(a) - PEL.pw / 2), Y(PEL.pelY0 - 2), X(pelX(b) + PEL.pw / 2), Y(PEL.pelY0 + 5), P.CU1);
  const tabB = (a, b) => rect(X(pelX(a) - PEL.pw / 2), Y(PEL.pelY1 - 5), X(pelX(b) + PEL.pw / 2), Y(PEL.pelY1 + 2), P.CU1);
  tabT(0, 1); tabT(2, 3); tabT(4, 5); tabB(1, 2); tabB(3, 4);
  rect(X(pelX(0) - PEL.pw / 2), Y(PEL.pelY1 - 5), X(pelX(0) + PEL.pw / 2), Y(PEL.pelY1 + 2), P.CU1); rect(X(pelX(5) - PEL.pw / 2), Y(PEL.pelY1 - 5), X(pelX(5) + PEL.pw / 2), Y(PEL.pelY1 + 2), P.CU1);
  // pellets
  for (let i = 0; i < PEL.n; i++) {
    const x = pelX(i), isN = i % 2 === 0;
    rect(X(x - PEL.pw / 2), Y(PEL.pelY0 + 5), X(x + PEL.pw / 2), Y(PEL.pelY1 - 5), isN ? P.PN1 : P.PN2);
    rect(X(x - PEL.pw / 2), Y(PEL.pelY0 + 5), X(x - PEL.pw / 2 + 3), Y(PEL.pelY1 - 5), isN ? P.PN2 : P.CE0);
    text(FS, isN ? 'n' : 'p', X(x), Y(PEL.pelY0 + 12), { sc: Math.max(1, Math.round(1.6 * z)), c: P.C4, ol: null, align: 'center' });
    // charge carriers: electrons (n) and holes (p) both drift with the heat: up when heating, down when cooling
    if (mode !== 0) for (let k = 0; k < 4; k++) {
      const u = ((t * 0.9 * (o.k || 1) + k / 4 + i * 0.13) % 1), yy = mode > 0 ? lerp(PEL.pelY1 - 10, PEL.pelY0 + 22, u) : lerp(PEL.pelY0 + 22, PEL.pelY1 - 10, u);
      const xx = x + (k % 2 ? -6 : 6);
      if (isN) { disc(X(xx), Y(yy), 3 * z, P.EL0); disc(X(xx), Y(yy), 2 * z, P.EL1); } else ring(X(xx), Y(yy), 2.6 * z, 1.2 * z, P.C6);
    }
  }
  // heat flow: bold chevrons marching up into the block (heating) or down into the heat sink (cooling)
  if (mode !== 0) for (let k = 0; k < 5; k++) {
    const x = pelX(k) + PEL.pdx / 2, ph = (t * 1.4 + k * 0.21) % 1;
    for (let j = 0; j < 3; j++) {
      const u = (ph + j / 3) % 1, y = mode > 0 ? lerp(PEL.ceBb + 10, PEL.blkY0 + 30, u) : lerp(PEL.blkY0 + 30, PEL.hsY0 + 60, u);
      const lv = Math.sin(u * Math.PI), d = mode > 0 ? -1 : 1, w = 7 * z;
      if (lv < 0.15) continue;
      for (let q = 0; q < 2; q++) { lineW(X(x) - w, Y(y) - d * w * 0.6 + q * d * 3 * z, X(x), Y(y) + q * d * 3 * z, 2.4 * z, q ? P.HT2 : P.HT4, lv); lineW(X(x) + w, Y(y) - d * w * 0.6 + q * d * 3 * z, X(x), Y(y) + q * d * 3 * z, 2.4 * z, q ? P.HT2 : P.HT4, lv); }
    }
  }
  // heat sink + airflow from the fan
  rect(X(PEL.x0 - 14), Y(PEL.hsY0), X(PEL.x1 + 14), Y(PEL.hsY0 + 10), P.AL1);
  for (let x = PEL.x0 - 12; x < PEL.x1 + 12; x += 12) rect(X(x), Y(PEL.hsY0 + 10), X(x + 6), Y(PEL.hsY1), P.AL0);
  const fanK = mode < 0 ? 1.6 : 0.6;
  for (let k = 0; k < 7; k++) { const u = (t * fanK + k / 7) % 1, y = PEL.hsY1 - 10 - k * 12; dashLine(X(lerp(PEL.x0 - 20, PEL.x1 + 40, u) - 20), Y(y), X(lerp(PEL.x0 - 20, PEL.x1 + 40, u)), Y(y), mode < 0 ? P.HT3 : P.CL3, 4, 3, 0); }
  // wires, current source, controller and the feedback loop
  const ly = PEL.pelY1 + 40;
  lineW(X(pelX(0)), Y(PEL.pelY1 + 2), X(pelX(0)), Y(ly + 120), 2.5 * z, P.CU1); lineW(X(pelX(5)), Y(PEL.pelY1 + 2), X(pelX(5)), Y(ly + 120), 2.5 * z, P.CU1);
  lineW(X(pelX(0)), Y(ly + 120), X(pelX(5)), Y(ly + 120), 2.5 * z, P.CU1);
  const cbx = 0, cby = ly + 120;
  rect(X(cbx - 52), Y(cby - 18), X(cbx + 52), Y(cby + 18), P.CB2); frame(X(cbx - 52), Y(cby - 18), X(cbx + 52), Y(cby + 18), o.loop > 0 ? P.YEL : P.CB4);
  text(FS, 'CONTROLLER', X(cbx), Y(cby - 12), { sc: Math.max(1, Math.round(z)), c: P.C6, ol: null, align: 'center' });
  text(FS, T.toFixed(1) + '°C', X(cbx), Y(cby + 1), { sc: Math.max(1, Math.round(z * 1.6)), c: T > 80 ? P.HT3 : T < 58 ? P.CL3 : P.INK, ol: null, align: 'center' });
  // current direction marks on the lead
  for (let k = 0; k < 5; k++) { const u = ((t * 0.8 * Math.sign(mode || 1)) + k / 5) % 1, uu = u < 0 ? u + 1 : u, x = lerp(pelX(0), pelX(5), uu); if (mode !== 0) arrowHead(X(x), Y(ly + 120), mode > 0 ? 0 : Math.PI, 3.5 * z, P.EL2); }
  // sensor wire to the controller
  dashLine(X(PEL.x0 + 6), Y(PEL.blkY0 + 52), X(PEL.x0 - 30), Y(PEL.blkY0 + 52), o.loop > 0 ? P.YEL : P.RED, 3, 2, -t * 20);
  dashLine(X(PEL.x0 - 30), Y(PEL.blkY0 + 52), X(PEL.x0 - 30), Y(cby), o.loop > 0 ? P.YEL : P.RED, 3, 2, -t * 20);
  dashLine(X(PEL.x0 - 30), Y(cby), X(cbx - 52), Y(cby), o.loop > 0 ? P.YEL : P.RED, 3, 2, -t * 20);
}
// ---------------------------------------------------------------- the temperature program (screen-sized graph, pans in x)
// time axis is compressed and not to scale; one unit = one "slot"
const PSEG = (() => {
  const s = [[0, 42], [8, 55], [56, 55], [62, 95], [80, 95]];      // start, RT hold, ramp, initial denaturation
  let x = 80;
  for (let c = 0; c < 6; c++) { s.push([x + 4, 60]); s.push([x + 22, 60]); s.push([x + 26, 95]); s.push([x + 32, 95]); x += 32; }
  return s;
})();
function progTempAt(x) { for (let i = 0; i + 1 < PSEG.length; i++) { const [x0, y0] = PSEG[i], [x1, y1] = PSEG[i + 1]; if (x <= x1) return lerp(y0, y1, clamp((x - x0) / (x1 - x0 || 1), 0, 1)); } return PSEG[PSEG.length - 1][1]; }
// o: { draw (x up to which the trace is drawn), labels }
function programScene(cam, t, o) {
  o = o || {};
  const z = cam.z, sx = v => cam.x(v * 3.2), ty = T_ => cam.y(-(T_ - 70) * 4.2);
  rect(0, 0, W, H, P.BG);
  // panel
  rect(0, ty(104), W, ty(36), P.DS1);
  for (const T_ of [40, 55, 60, 95]) { const y = ty(T_); dashLine(0, y, W, y, P.DG, 2, 4, 0); }
  for (const T_ of [55, 60, 95]) text(FS, T_ + '°C', 6, ty(T_) - 12, { sc: 2, c: T_ === 95 ? P.HT3 : T_ === 55 ? P.RT3 : P.CL3, ol: P.SH });
  // the trace, drawn up to o.draw
  const xmax = o.draw === undefined ? 400 : o.draw;
  let px_ = null, py_ = null;
  for (let x = 0; x <= xmax; x += 0.5) {
    const T_ = progTempAt(x), X_ = sx(x), Y_ = ty(T_);
    if (px_ !== null) { const col = T_ > 80 ? P.HT3 : T_ < 58 ? P.RT3 : P.CL3; lineW(px_, py_, X_, Y_, 3 * z, col); }
    px_ = X_; py_ = Y_;
  }
  // read marks at each 60 °C hold (the camera reads fluorescence there)
  for (let c = 0; c < 6; c++) {
    const xr = 80 + c * 32 + 18; if (xr > xmax) break;
    const X_ = sx(xr), Y_ = ty(60);
    disc(X_, Y_ + 14, 4, P.EM1); disc(X_, Y_ + 14, 2.5, P.EM2); text(FS, 'READ', X_, Y_ + 22, { sc: 1, c: P.EM2, ol: null, align: 'center' });
  }
  // playhead
  if (px_ !== null) { glow(px_, py_, 9, P.YEL, P.C6, 0.6); disc(px_, py_, 3.5, P.C6); }
  return { sx, ty };
}
