'use strict';
// ============================================================================
// IMPEDANCE COUNTING (world px, origin at the aperture centre).
// Two chambers of conductive electrolyte joined by one small aperture in a
// plate; a silver electrode in each chamber; a constant current flows between
// them, carried by ions (cations one way, anions the other — no free electrons
// in the liquid). Every current line must squeeze through the aperture, so the
// aperture sets the resistance. Sheath flow lines the diluted cells up on the
// axis. While a cell (an insulator) is inside the aperture it pushes
// electrolyte aside, the current lines bend round it, the resistance rises and
// so does the voltage across the electrodes: one pulse per cell, its height
// proportional to the cell's volume. The trace below is computed from the
// cell's position, so the pulse can never start before the cell enters.
// ============================================================================
const IMP = { hw: 15, ah: 24, cy0: -150, cy1: 150, ex: 165, nozzle: -70, scope: [-160, -318, 160, -214], hist: [-160, 186, 160, 300], s: 2.2 };
// a particle trajectory: list of [t, x] keys (linear between), kind, phase
function trajX(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i + 1 < keys.length; i++) { const [ta, xa] = keys[i], [tb, xb] = keys[i + 1]; if (t <= tb) return lerp(xa, xb, smooth(seg(t, ta, tb)) * 0.5 + seg(t, ta, tb) * 0.5); } return keys[keys.length - 1][1]; }
function particleR(k) { return k === 'rbc' ? 10 : 3.4; }                // red cell 7.5 µm : platelet 2.5 µm; aperture 48 px wide
// voltage at time t from a set of particles: sum of volume x sensing response
function impSignal(parts, t) { let v = 0; for (const p of parts) { if (t < p.keys[0][0] - 0.05 || t > p.keys[p.keys.length - 1][0] + 0.05) continue; const x = trajX(p.keys, t), r = p.r || particleR(p.k); v += (p.vol || VOL[p.k]) * senseK(x, IMP.hw, r * 0.9); } return v; }
// current-line shape: line k of n spreads over the chamber far away and squeezes into the aperture
function lineY(k, n, x, cells) {
  const far = (IMP.cy1 - 22) * k / n, near = (IMP.ah - 4) * k / n;
  const d = Math.max(0, Math.abs(x) - IMP.hw), s = smooth(clamp(d / 150, 0, 1));
  let y = lerp(near, far, s);
  // bend round any cell near this point (the cell is an insulator)
  for (const c of cells) {
    const dx = x - c.x, rr = c.r + 3; if (Math.abs(dx) > rr * 1.6) continue;
    const dy = y - c.y, push = (rr - Math.abs(dy)) * Math.exp(-(dx * dx) / (rr * rr));
    if (push > 0) y += (dy >= 0 ? 1 : -1) * push * (Math.abs(x) < IMP.hw + 4 ? 0.6 : 1);
  }
  return clamp(y, -IMP.ah + 2 - (Math.abs(x) < IMP.hw ? 0 : 999), IMP.ah - 2 + (Math.abs(x) < IMP.hw ? 0 : 999));
}
// ion i: cations (even i) drift toward the - electrode (right), anions toward the + electrode (left)
function ionPos(i, t, cells) { const cat = i % 2 === 0, k = (i % 15) - 7, u = ((hash(i + 900) + t * 0.05 * (cat ? 1 : -1)) % 1 + 1) % 1, x = lerp(-IMP.ex + 10, IMP.ex - 10, u); return [x, lineY(k, 7, x, cells) + (hash(i + 901) - 0.5) * 8]; }
// o: { parts: [{k, keys}], t, current (0..1), ions, sheath, trace (bool), counts {rbc, plt}, hist (array of [k, v] events), histK, label }
function impWorld(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  // chamber: electrolyte (soft cyan), walls, aperture plate
  rect(X(-178), Y(IMP.cy0), X(178), Y(IMP.cy1), P.EC0); rect(X(-178), Y(IMP.cy0), X(178), Y(IMP.cy1), P.EC1, 0.35);
  rect(X(-182), Y(IMP.cy0 - 10), X(182), Y(IMP.cy0), P.M5); rect(X(-182), Y(IMP.cy1), X(182), Y(IMP.cy1 + 10), P.M5);
  rect(X(-IMP.hw), Y(IMP.cy0), X(IMP.hw), Y(-IMP.ah), P.M4); rect(X(-IMP.hw), Y(IMP.ah), X(IMP.hw), Y(IMP.cy1), P.M4);
  rect(X(-IMP.hw), Y(IMP.cy0), X(-IMP.hw + 3), Y(-IMP.ah), P.M3); rect(X(-IMP.hw), Y(IMP.ah), X(-IMP.hw + 3), Y(IMP.cy1), P.M3);
  rect(X(-IMP.hw), Y(-IMP.ah - 3), X(IMP.hw), Y(-IMP.ah), P.M2); rect(X(-IMP.hw), Y(IMP.ah), X(IMP.hw), Y(IMP.ah + 3), P.M2);
  // electrodes (silver plates) and their wires up to the electronics
  for (const s of [-1, 1]) {
    const ex = s * IMP.ex;
    rect(X(ex - 4), Y(-96), X(ex + 4), Y(96), P.AL1); rect(X(ex - 4), Y(-96), X(ex - 1), Y(96), P.AL3);
    lineW(X(ex), Y(-96), X(ex), Y(IMP.cy0 - 30), 2 * z, P.AL2); lineW(X(ex), Y(IMP.cy0 - 30), X(s * 40), Y(IMP.cy0 - 30), 2 * z, P.AL2);
  }
  // the electronics box between the wires: constant current source + amplifier
  rect(X(-40), Y(IMP.cy0 - 46), X(40), Y(IMP.cy0 - 14), P.CH1); frame(X(-40), Y(IMP.cy0 - 46), X(40), Y(IMP.cy0 - 14), P.CH3);
  if (z > 0.7) text(FS, 'CURRENT SOURCE', X(0), Y(IMP.cy0 - 40), { sc: Math.max(1, Math.round(z * 0.8)), c: P.SUB, ol: null, align: 'center' });
  if (z > 0.7) text(FS, '+', X(-IMP.ex - 16), Y(-8), { sc: Math.max(1, Math.round(z * 1.6)), c: P.EC3, ol: null }), text(FS, '-', X(IMP.ex + 10), Y(-8), { sc: Math.max(1, Math.round(z * 1.6)), c: P.EC3, ol: null });
  // particles now
  const parts = (o.parts || []).filter(p => t >= p.keys[0][0] && t <= p.keys[p.keys.length - 1][0]), cells = parts.map(p => ({ x: trajX(p.keys, t), y: p.y || 0, r: p.r || particleR(p.k), k: p.k, rot: p.rot || 0 }));
  // current lines (thin cyan) with moving dashes
  const cur = o.current === undefined ? 1 : o.current;
  if (cur > 0) {
    const n = 7;
    for (let k = -n; k <= n; k++) {
      let px_ = null, py_ = null;
      for (let x = -IMP.ex + 4; x <= IMP.ex - 4; x += 4) {
        const y = lineY(k, n, x, cells), sx = X(x), sy = Y(y);
        if (px_ !== null && ((Math.floor((x - t * 60) / 12) % 2) === 0)) line(px_, py_, sx, sy, Math.abs(x) < IMP.hw + 20 ? P.EC3 : P.EC2, cur);
        px_ = sx; py_ = sy;
      }
    }
  }
  // ions drifting along the current lines: cations (+) toward the right, anions (-) toward the left
  if (o.ions) for (let i = 0; i < 30; i++) {
    const cat = i % 2 === 0, [x, y] = ionPos(i, t, cells);
    disc(X(x), Y(y), 2.6 * z, cat ? P.EC3 : P.EC1); if (z > 1.1) text(FS, cat ? '+' : '-', X(x) - 1.5 * z, Y(y) - 2.5 * z, { sc: 1, c: cat ? P.EC0 : P.EC3, ol: null });
  }
  // sheath flow: streamlines converging on the aperture; the sample nozzle on the axis
  const shv = o.sheath === true ? 1 : (o.sheath || 0);
  if (shv > 0) for (let k = -3; k <= 3; k++) { if (k === 0) continue; let px_ = null, py_ = null; for (let x = IMP.nozzle - 90; x <= -IMP.hw; x += 4) { const s = smooth(clamp((-IMP.hw - x) / 110, 0, 1)), y = k * lerp(6, 34, s), sx = X(x), sy = Y(y); if (px_ !== null && (Math.floor((x - t * 90) / 10) % 2 === 0)) line(px_, py_, sx, sy, P.EC3, 0.6 * shv); px_ = sx; py_ = sy; } }
  rect(X(IMP.nozzle - 120), Y(-6), X(IMP.nozzle), Y(6), P.TB1); rect(X(IMP.nozzle - 120), Y(-3), X(IMP.nozzle), Y(3), P.AM1);
  // the particles
  for (const c of cells) {
    if (c.x < -200 || c.x > 200) continue;
    if (c.k === 'rbc') rbc(X(c.x), Y(c.y), c.r * z, 0.45, Math.PI / 2 + c.rot);
    else platelet(X(c.x), Y(c.y), c.r * z, c.rot + t);
  }
  // the sensing zone outline
  if (o.zone > 0) { dashLine(X(-IMP.hw), Y(-IMP.ah), X(IMP.hw), Y(-IMP.ah), P.YEL, 3, 2, 0); dashLine(X(-IMP.hw), Y(IMP.ah), X(IMP.hw), Y(IMP.ah), P.YEL, 3, 2, 0); }
  return { cells };
}
// the scope: voltage vs time, newest at the right; win seconds shown
function scope(x0, y0, x1, y1, parts, t, o) {
  o = o || {};
  rect(x0, y0, x1, y1, P.DS0); frame(x0, y0, x1, y1, P.M5);
  for (let i = 1; i < 6; i++) rect(lerp(x0, x1, i / 6), y0 + 1, lerp(x0, x1, i / 6) + 1, y1 - 1, P.DG);
  for (let j = 1; j < 3; j++) rect(x0 + 1, lerp(y0, y1, j / 3), x1 - 1, lerp(y0, y1, j / 3) + 1, P.DG);
  const win = o.win || 3, base = y1 - 10, amp = (y1 - y0 - 20) / (o.max || 1.05);
  let px_ = null, py_ = null;
  for (let x = x0 + 2; x <= x1 - 2; x += 1) {
    const tt = t - (x1 - 2 - x) / (x1 - x0 - 4) * win;
    const v = impSignal(parts, tt) + (hash(Math.floor(tt * 400)) - 0.5) * 0.012, y = base - v * amp;
    if (px_ !== null) lineW(px_, py_, x, y, 2, P.SG2);
    px_ = x; py_ = y;
  }
  disc(x1 - 3, py_, 2.5, P.SG3);
  if (o.label) text(FS, 'VOLTAGE', x0 + 4, y0 + 3, { sc: 1, c: P.SUB, ol: null });
}
// counter LCD
function counter(x, y, label, n, col, sc) { sc = sc || 2; const s = label + ' ' + String(n).padStart(4, '0'); const w = textW(FS, s, sc); rect(x - 4, y - 4, x + w + 4, y + 7 * sc, P.DS0); frame(x - 4, y - 4, x + w + 4, y + 7 * sc, P.M5); text(FS, s, x, y, { sc, c: col, ol: null }); }
// size histogram: events [[k, volume]], n shown
function sizeHist(x0, y0, x1, y1, n, t, o) {
  o = o || {};
  rect(x0, y0, x1, y1, P.DS1); frame(x0, y0, x1, y1, P.M5);
  const bins = new Array(40).fill(0), vmax = 160;
  for (let i = 0; i < n; i++) { const e = sizeSample(i), b = Math.floor(clamp(e.v / vmax, 0, 0.999) * 40); bins[b] += 1; }
  const mx = Math.max(6, ...bins), bw = (x1 - x0 - 8) / 40;
  for (let b = 0; b < 40; b++) { const h = bins[b] / mx * (y1 - y0 - 22), bx = x0 + 4 + b * bw, isP = b * vmax / 40 < 30; rect(bx, y1 - 14 - h, bx + bw - 1, y1 - 14, isP ? P.PL2 : P.RB2); }
  rect(x0 + 4, y1 - 14, x1 - 4, y1 - 13, P.SUB);
  text(FS, 'PULSE HEIGHT  ~  CELL VOLUME', (x0 + x1) / 2, y1 - 10, { sc: 1, c: P.SUB, ol: null, align: 'center' });
  if (n > 30 && o.labels) { text(FS, 'PLT', x0 + 4 + 2.5 * bw, y0 + 6, { sc: 2, c: P.PL3, ol: P.SH, align: 'center' }); text(FS, 'RBC', x0 + 4 + 22.5 * bw, y0 + 6, { sc: 2, c: P.RB3, ol: P.SH, align: 'center' }); }
}
