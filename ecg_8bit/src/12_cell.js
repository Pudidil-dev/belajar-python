'use strict';
// ============================================================================
// ONE CELL'S MEMBRANE (world px; the membrane lies along y = 0, outside above,
// inside below). Three ion channels sit in the lipid bilayer; ions start in
// their real compartments (Na⁺ and Ca²⁺ mostly outside, K⁺ mostly inside) and
// only cross through an open channel, down their gradients. The charge signs
// along the membrane flip as the inside becomes positive, and the voltage graph
// follows the same model.
//  • SA-node pacemaker cell: a slow Na⁺ leak through the "funny" (HCN) channel
//    raises the voltage by itself; Ca²⁺ channels make the upstroke (no fast Na⁺
//    upstroke here); K⁺ channels bring it back down; then it starts again.
//  • Ventricular muscle cell: fast Na⁺ channels make the sharp upstroke, Ca²⁺
//    channels hold the plateau, K⁺ channels repolarize it.
// Also: a row of atrial muscle cells joined by gap junctions.
// ============================================================================
const MEM = { hw: 22, chX: [-80, 0, 80] };
const CELL_KIND = {
  pace: { ions: ['NA', 'CA', 'KK'], names: ['Na⁺', 'Ca²⁺', 'K⁺'], rest: -60, peak: 12,
    gate: [[5.0, 6.5], [6.4, 7.0], [6.9, 7.75]], flux: [[4.975, 0.25, 6, 0.55], [6.4, 0.05, 6, 0.26], [6.775, 0.125, 6, 0.45]] },
  vent: { ions: ['NA', 'CA', 'KK'], names: ['Na⁺', 'Ca²⁺', 'K⁺'], rest: -85, peak: 25,
    gate: [[20.17, 20.47], [20.35, 24.3], [24.25, 25.3]], flux: [[20.17, 0.022, 10, 0.16], [20.29, 0.25, 6, 0.42], [24.275, 0.125, 8, 0.45]] },
};
function vmPacemaker(t) {
  if (t < 5.0) return -60;
  if (t < 6.5) return lerp(-60, -40, Math.pow((t - 5) / 1.5, 1.3));
  if (t < 6.67) return lerp(-40, 12, smooth((t - 6.5) / 0.17));
  if (t < 6.95) return lerp(12, 5, (t - 6.67) / 0.28);
  if (t < 7.75) return lerp(5, -60, smooth((t - 6.95) / 0.8));
  return lerp(-60, -56, clamp((t - 7.75) / 0.3, 0, 1));
}
function vmVentricle(t) {
  if (t < 20.25) return -85;
  if (t < 20.37) return lerp(-85, 25, smooth((t - 20.25) / 0.12));
  if (t < 20.6) return lerp(25, 4, smooth((t - 20.37) / 0.23));
  if (t < 24.3) return lerp(4, -2, (t - 20.6) / 3.7);
  if (t < 25.3) return lerp(-2, -85, smooth((t - 24.3) / 1.0));
  return -85;
}
// ions: rest positions in their compartments, and which ones will cross
function makeIons(kind) {
  const K = CELL_KIND[kind], out = [];
  const add = (type, n, inside, seed) => { for (let i = 0; i < n; i++) out.push({ type, x0: (hash(seed + i * 3) - 0.5) * 340, y0: (inside ? 1 : -1) * (48 + hash(seed + i * 3 + 1) * 230), ph: hash(seed + i * 3 + 2) * TAU, flux: null }); };
  add('NA', 22, false, 100); add('CA', 10, false, 200); add('KK', 20, true, 300); add('NA', 4, true, 400); add('KK', 3, false, 500);
  // assign crossers: the outside ions nearest each channel cross inward (K⁺ the inside ones outward)
  K.flux.forEach(([t0, dt, n, dur], c) => {
    const type = K.ions[c], inward = type !== 'KK', cx = MEM.chX[c];
    const cand = out.filter(o => o.type === type && !o.flux && (inward ? o.y0 < 0 : o.y0 > 0)).sort((a, b) => Math.abs(a.x0 - cx) + Math.abs(a.y0) * 0.5 - (Math.abs(b.x0 - cx) + Math.abs(b.y0) * 0.5));
    cand.slice(0, n).forEach((o, i) => { o.flux = { t0: t0 + i * dt, dur, cx, x1: cx + (hash(c * 50 + i) - 0.5) * 120, y1: (inward ? 1 : -1) * (70 + hash(c * 50 + i + 7) * 140) }; });
  });
  return out;
}
const IONS = { pace: makeIons('pace'), vent: makeIons('vent') };
function ionPosAt(o, t) {
  const bx = 9 * Math.sin(t * 0.9 + o.ph), by = 7 * Math.cos(t * 1.1 + o.ph * 1.3);
  const f = o.flux; if (!f || t < f.t0) return [o.x0 + bx, o.y0 + by, 0];
  const u = clamp((t - f.t0) / f.dur, 0, 1), sgn = Math.sign(f.y1);
  // rest → mouth of the channel → through the pore → into the other compartment
  const pts = [[o.x0, o.y0], [f.cx, -sgn * 40], [f.cx, sgn * 40], [f.x1, f.y1]], seg_ = [0.4, 0.25, 0.35];
  let acc = 0; for (let i = 0; i < 3; i++) { if (u <= acc + seg_[i] || i === 2) { const v = smooth(clamp((u - acc) / seg_[i], 0, 1)); const [ax, ay] = pts[i], [bx_, by_] = pts[i + 1]; const w = u >= 1 ? 1 : 0; return [lerp(ax, bx_, v) + bx * w, lerp(ay, by_, v) + by * w, u < 1 ? 1 : 0]; } acc += seg_[i]; }
  return [f.x1 + bx, f.y1 + by, 0];
}
function ionDisc(x, y, type, z, moving) {
  const r = (type === 'CA' ? 7 : 6) * z, c0 = P[type + '0'], c1 = P[type + '1'];
  if (moving) glow(x, y, r * 2.2, c1, null, 0.3);
  disc(x, y, r + 1, c0); disc(x, y, r, c1); disc(x - r * 0.35, y - r * 0.35, r * 0.3, mixc(c1, P.C6, 0.6));
  // a pixel plus sign (two for Ca2+)
  const pl = (cx, cy) => { const a = Math.max(1, Math.round(r * 0.32)); rect(cx - a, cy - 0.5, cx + a + 1, cy + 1.5, c0); rect(cx - 0.5, cy - a, cx + 1.5, cy + a + 1, c0); };
  if (type === 'CA') { pl(x - r * 0.35, y + r * 0.1); pl(x + r * 0.4, y + r * 0.1); } else pl(x, y + r * 0.1);
}
// the membrane world; kind 'pace' | 'vent'
function membraneWorld(cam, t, kind, o) {
  o = o || {};
  const K = CELL_KIND[kind], X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // outside (dark teal fluid) and inside (dark maroon cytoplasm)
  rect(0, 0, W, Y(-MEM.hw), P.EX0); rect(0, Y(MEM.hw), W, H, P.CT0);
  for (let i = 0; i < 26; i++) { const x = X((hash(i + 900) - 0.5) * 380 + 10 * wob(t, 1, i)), y = Y(-60 - hash(i + 901) * 260); disc(x, y, 1.2 * z, P.EX1); }
  for (let i = 0; i < 26; i++) { const x = X((hash(i + 950) - 0.5) * 380 + 10 * wob(t, 1, i + 3)), y = Y(60 + hash(i + 951) * 260); disc(x, y, 1.2 * z, P.CT1); }
  text(FS, 'OUTSIDE THE CELL', 16, Y(-MEM.hw - 34) - 10, { sc: 2, c: P.LBL, ol: P.SH });
  text(FS, 'INSIDE THE CELL', 16, Y(MEM.hw + 18) + 6, { sc: 2, c: P.HM5, ol: P.SH });
  // the lipid bilayer
  rect(0, Y(-MEM.hw + 3), W, Y(MEM.hw - 3), P.MB1);
  for (let x = -200; x <= 200; x += 7) {
    if (MEM.chX.some(cx => Math.abs(x - cx) < 22)) continue;
    for (const s of [-1, 1]) { disc(X(x), Y(s * (MEM.hw - 3)), 3.2 * z, P.MB3); disc(X(x - 0.8), Y(s * (MEM.hw - 3) - 0.8), 1.5 * z, P.MB4); lineW(X(x - 1.5), Y(s * (MEM.hw - 6)), X(x - 1.5), Y(s * 3), 1, P.MB2); lineW(X(x + 1.5), Y(s * (MEM.hw - 6)), X(x + 1.5), Y(s * 3), 1, P.MB2); }
  }
  // channels: two subunits that part when the gate opens (tinted by their ion)
  const vm = kind === 'pace' ? vmPacemaker(t) : vmVentricle(t);
  MEM.chX.forEach((cx, c) => {
    const [g0, g1] = K.gate[c], open = smooth(clamp((t - g0) / 0.12, 0, 1)) * (1 - smooth(clamp((t - g1) / 0.15, 0, 1)));
    const ion = K.ions[c], tint = P[ion + '0'], hi = P[ion + '1'], gap = 4 + open * 12;
    for (const s of [-1, 1]) {
      const x0 = cx + s * (gap / 2 + 9), m = maskRR(X(x0 - 9), Y(-34), X(x0 + 9), Y(34), 7 * z);
      shade(m, mixc(P.MB2, tint, 0.8), mixc(P.MB3, hi, 0.7), mixc(P.MB0, tint, 0.5), P.MB0, { k: Math.max(1, Math.round(z)) });
    }
    if (open > 0.05) { rect(X(cx - gap / 2 + 1), Y(-30), X(cx + gap / 2 - 1), Y(30), mixc(P.EX0, hi, 0.12 * open)); }
    // the gate (a lid on the inside mouth) swings aside as the channel opens
    const ga = open * 1.2, gx = cx + (gap / 2 + 6), gy = 34;
    lineW(X(cx - gap / 2 - 2), Y(gy), X(lerp(cx + gap / 2 + 2, gx + 4, open)), Y(lerp(gy, gy + 12, Math.sin(ga) * 0.9)), 3 * z, mixc(P.MB3, hi, 0.5));
  });
  // charge signs: + outside / − inside at rest; they flip near the open channels as the inside turns positive
  const f = clamp((vm - K.rest) / (K.peak - K.rest), 0, 1), N = 20;
  for (let i = 0; i < N; i++) {
    const x = -190 + i * 20, order = Math.min(...MEM.chX.map(cx => Math.abs(x - cx))) / 200, flipped = f > 0.15 + order * 0.8;
    const outC = flipped ? '-' : '+', inC = flipped ? '+' : '-';
    text(FC, outC, X(x), Y(-MEM.hw - 16), { sc: Math.max(1, Math.round(z)), c: outC === '+' ? P.FP4 : P.FN4, ol: null, align: 'center' });
    text(FC, inC, X(x), Y(MEM.hw + 5), { sc: Math.max(1, Math.round(z)), c: inC === '+' ? P.FP4 : P.FN4, ol: null, align: 'center' });
  }
  // ions
  for (const io of IONS[kind]) { const [x, y, mv] = ionPosAt(io, t); const sx = X(x), sy = Y(y); if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue; ionDisc(sx, sy, io.type, z, mv); }
  return vm;
}
// voltage graph (screen space): the trace from tA to t on [tA, tB]; mV range [lo, hi]
function vmGraph(x0, y0, x1, y1, t, tA, tB, fn, lo, hi, o) {
  o = o || {};
  rect(x0, y0, x1, y1, P.SC0); frame(x0, y0, x1, y1, P.M5);
  const gx0 = x0 + 6, gx1 = x1 - 6, gy0 = y0 + 22, gy1 = y1 - 8, Ym = v => lerp(gy1, gy0, (v - lo) / (hi - lo));
  text(FS, 'MEMBRANE VOLTAGE', x0 + 6, y0 + 5, { sc: 2, c: P.EG2, ol: null });
  dashLine(gx0, Ym(0), gx1, Ym(0), P.SC3, 3, 3, 0); text(FS, '0 mV', gx1 - 2, Ym(0) - 14, { sc: 2, c: P.EG1, ol: null, align: 'right' });
  if (o.thr !== undefined) { dashLine(gx0, Ym(o.thr), gx1, Ym(o.thr), P.SA1, 2, 3, 0); text(FS, 'THRESHOLD', gx0 + 2, Ym(o.thr) + 4, { sc: 2, c: P.SA2, ol: null }); }
  let px_ = null, py_ = null; const tn = clamp(t, tA, tB);
  for (let x = gx0; x <= gx1; x++) { const tt = lerp(tA, tB, (x - gx0) / (gx1 - gx0)); if (tt > tn) break; const y = Ym(fn(tt)); if (px_ !== null) lineW(px_, py_, x, y, 2, P.EG2); px_ = x; py_ = y; }
  if (px_ !== null) disc(px_, py_, 2.5, P.EG4);
}
// ---------------------------------------------------------------- atrial muscle cells joined by gap junctions
const GJ = { xs: [-275, -165, -55, 55, 165, 275], rows: [-144, -72, 0, 72, 144], hw: 52, hh: 31 };
// a sheet of atrial muscle cells joined end to end; the activation enters from the left and each cell
// fires a moment after current reaches it through the gap junctions
const gjAct = (cx, ry) => 8.0 + (cx + 275) / 110 * 0.5;                      // one cell per eighth note (the SFX cascade)
function gapJunctionWorld(cam, t) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.EX0);
  for (let i = 0; i < 30; i++) disc(X((hash(i + 1300) - 0.5) * 600 + 10 * wob(t, 1, i)), Y((hash(i + 1301) - 0.5) * 700), 1.2 * z, P.EX1);
  GJ.rows.forEach((ry, ri) => {
    const xs = GJ.xs.map(x => x + (ri % 2) * 55);
    xs.forEach(cx => {
      if (X(cx + GJ.hw) < -4 || X(cx - GJ.hw) > W + 4) return;
      const act = smooth(clamp((t - gjAct(cx, ry)) / 0.18, 0, 1));
      const m = maskRR(X(cx - GJ.hw + 2), Y(ry - GJ.hh), X(cx + GJ.hw - 2), Y(ry + GJ.hh), 10 * z);
      shade(m, mixc(P.CT2, P.HM3, act * 0.75), mixc(P.MB3, P.HM5, act * 0.6), P.MB0, P.MB0, { k: Math.max(1, Math.round(z * 1.5)) });
      for (let k = -4; k <= 4; k++) rect(X(cx + k * 10), Y(ry - GJ.hh + 6), X(cx + k * 10 + 1.2), Y(ry + GJ.hh - 6), mixc(P.CT1, P.HM2, act * 0.6));   // striations
      ellipse(X(cx), Y(ry), 12 * z, 8 * z, mixc(P.MB1, P.HM1, act * 0.5));                                                        // nucleus
      for (let k = 0; k < 5; k++) { const sx = cx - 36 + k * 18; text(FC, act > 0.5 ? '+' : '-', X(sx), Y(ry - GJ.hh + 7), { sc: Math.max(1, Math.round(z)), c: act > 0.5 ? P.FP4 : P.FN4, ol: null, align: 'center' }); }
      if (act > 0 && act < 1) glow(X(cx), Y(ry), 60 * z, P.HM3, null, 0.35 * (1 - act));
    });
    // intercalated discs with gap-junction channels; ion current passes to the next cell just before it fires
    for (let j = 0; j + 1 < xs.length; j++) {
      const dx = (xs[j] + xs[j + 1]) / 2; if (X(dx) < -10 || X(dx) > W + 10) continue;
      for (let y = -GJ.hh + 4; y < GJ.hh - 4; y += 4) rect(X(dx - 1 + ((y / 4) % 2 ? 1 : -1)), Y(ry + y), X(dx + 1 + ((y / 4) % 2 ? 1 : -1)), Y(ry + y + 4), P.MB4);
      for (const gy of [-14, 0, 14]) { rect(X(dx - 4), Y(ry + gy - 3), X(dx + 4), Y(ry + gy + 3), P.CY1); rect(X(dx - 4), Y(ry + gy - 1), X(dx + 4), Y(ry + gy + 1), P.CY0); }
      const ta = gjAct(xs[j], ry) + 0.05, tb = gjAct(xs[j + 1], ry) + 0.05;
      if (t > ta && t < tb) for (let q = 0; q < 6; q++) { const u = ((t - ta) / (tb - ta) * 2 + q / 6) % 1, gy = [-14, 0, 14][q % 3]; disc(X(dx - 14 + u * 28), Y(ry + gy), 2.2 * z, q % 2 ? P.NA1 : P.KK1); }
    }
  });
}
