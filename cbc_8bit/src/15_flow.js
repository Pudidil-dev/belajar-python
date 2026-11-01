'use strict';
// ============================================================================
// WHITE CELLS: FLUORESCENCE FLOW CYTOMETRY (world px).
// A separate aliquot gets a lysis reagent: red cells break up and disperse;
// white cells survive with small pores in their membranes. A fluorescent dye
// enters through the pores and binds nucleic acids (DNA, and RNA in the
// cytoplasm); it stays dim until laser light excites it. In the flow cell,
// sheath fluid squeezes the sample into a thin core so the cells cross a red
// semiconductor laser one at a time. At the crossing, light scatters forward
// (to a forward-scatter photodiode behind a beam stop) and to the side (90°,
// drawn here on the diagonal toward the viewer); a dichroic mirror sends the
// side-scattered laser light to the side-scatter detector and lets the green
// fluorescence through a filter to the fluorescence detector. Each detector
// outputs one electrical pulse per cell.
// ============================================================================
// ---------------------------------------------------------------- the WBC reagent chamber
const WBC_S = makeSuspension(41, 70, [['rbc', 0.82], ['plt', 0.12], ['wbc', 0.06]], -260, 260, -330, 330);
// o: { lyse (0..1), follow (x of the followed white cell), pores, dye }
function wbcChamber(cam, t, o) {
  o = o || {};
  const z = cam.z, ly = o.lyse || 0;
  rect(0, 0, W, H, P.EC0); rect(0, 0, W, H, P.WB0, 0.12 * ly);
  // red cells: intact, then ghosts that fade and break into fragments
  for (const c of WBC_S.cells) {
    const [x, y] = cellPos(c, WBC_S, t, 12), sx = cam.x(x), sy = cam.y(y); if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    if (c.k === 'rbc') {
      const k = clamp(ly * 1.4 - hash(c.x | 0) * 0.4, 0, 1);
      if (k < 0.3) rbc(sx, sy, R_RBC * z, 0.3 + 0.4 * Math.sin(t + c.ph), c.ph);
      else if (k < 0.9) rbc(sx, sy, R_RBC * z * (1 + 0.2 * k), 0.2, c.ph, { ghost: true, lv: 0.7 * (1 - k) });
      else for (let f = 0; f < 3; f++) disc(sx + Math.cos(c.ph + f * 2) * (6 + 10 * k) * z, sy + Math.sin(c.ph + f * 2) * (6 + 10 * k) * z, 1.4 * z, P.RB1, 0.6 * (1.4 - k));
    } else if (c.k === 'plt') platelet(sx, sy, R_PLT * z, c.ph + t, { lv: 1 - 0.5 * ly });
    else if (o.follow === undefined || Math.hypot(x - o.follow, y) > 80) wbc(sx, sy, R_WBC * z, c.wt, c.ph + t * 0.2, { pores: ly > 0.5 ? 1 : 0, dye: o.dye || 0 });
  }
  // the followed white cell
  if (o.follow !== undefined) {
    const fx = cam.x(o.follow), fy = cam.y(0);
    wbc(fx, fy, R_WBC * z * 1.05, 'neut', t * 0.25, { pores: ly > 0.5 ? smooth(clamp((ly - 0.5) * 2, 0, 1)) : 0, dye: o.dye || 0 });
    if (o.ring > 0) ring(fx, fy, R_WBC * z * 1.5, 1.5, P.YEL, o.ring);
  }
}
// ---------------------------------------------------------------- the stained cell, cut open
const STAIN_R = 120, STAIN_LOBES = [[-42, 6, 34], [4, -30, 36], [46, 12, 33]];
function rnaPos(i) { const a = hash(i + 6100) * TAU, d = STAIN_R * (0.55 + 0.35 * hash(i + 6101)); return [Math.cos(a) * d, Math.sin(a) * d]; }
// dye molecule i at dye progress k: outside the pores until it moves in, then on its DNA / RNA target
function dyePos(i, k, t) {
  const R = STAIN_R, a0 = (i % 14) * TAU / 14 + 0.1, sx0 = Math.cos(a0) * (R + 40), sy0 = Math.sin(a0) * (R + 40);
  const u = smooth(clamp(k * 1.6 - (i / 46) * 0.6, 0, 1));
  if (u <= 0) return [sx0 + 10 * Math.sin(t + i), sy0 + 10 * Math.cos(t + i), false];
  const tgt = i % 3 === 0 ? [Math.cos(hash(i + 6200) * TAU) * R * 0.7, Math.sin(hash(i + 6200) * TAU) * R * 0.7] : (() => { const l = STAIN_LOBES[i % 3], a = hash(i + 6201) * TAU, d = Math.sqrt(hash(i + 6202)) * l[2] * 0.8; return [l[0] + Math.cos(a) * d, l[1] + Math.sin(a) * d]; })();
  return [lerp(sx0, tgt[0], u), lerp(sy0, tgt[1], u), true];
}
// k: dye progress 0..1; DNA strands in the lobes, RNA dots in the cytoplasm
function stainCut(cam, t, k) {
  const z = cam.z, X = v => cam.x(v), Y = v => cam.y(v);
  rect(0, 0, W, H, P.EC0);
  const R = STAIN_R;
  // membrane ring with pores, cytoplasm (cut face), granules
  disc(X(0), Y(0), (R + 6) * z, P.WB0); disc(X(0), Y(0), (R + 3) * z, P.WB1); disc(X(0), Y(0), R * z, P.WB2);
  for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + 0.1; disc(X(Math.cos(a) * (R + 2)), Y(Math.sin(a) * (R + 2)), 3.6 * z, P.EC0); }
  for (let i = 0; i < 40; i++) { const a = hash(i + 6000) * TAU, d = Math.sqrt(hash(i + 6001)) * R * 0.9; disc(X(Math.cos(a) * d), Y(Math.sin(a) * d), 2 * z, P.WB1); }
  // RNA in the cytoplasm: short wiggly strands
  for (let i = 0; i < 10; i++) { const [x, y] = rnaPos(i); let px_ = null, py_ = null; for (let j = 0; j <= 6; j++) { const xx = X(x + j * 3 - 9), yy = Y(y + Math.sin(j * 1.4 + i) * 3); if (px_ !== null) line(px_, py_, xx, yy, P.NU2); px_ = xx; py_ = yy; } }
  // the segmented nucleus with DNA strands inside
  const lobes = STAIN_LOBES;
  for (let i = 0; i + 1 < lobes.length; i++) lineW(X(lobes[i][0]), Y(lobes[i][1]), X(lobes[i + 1][0]), Y(lobes[i + 1][1]), 12 * z, P.NU1);
  for (const [x, y, r] of lobes) { disc(X(x), Y(y), (r + 2) * z, P.NU0); disc(X(x), Y(y), r * z, P.NU1); }
  for (const [x, y, r] of lobes) for (let s = 0; s < 4; s++) { let px_ = null, py_ = null; for (let j = 0; j <= 10; j++) { const u = j / 10, xx = X(x - r * 0.7 + u * r * 1.4), yy = Y(y - r * 0.5 + s * r * 0.33 + Math.sin(u * 9 + s) * 4); if (px_ !== null) line(px_, py_, xx, yy, P.NU3); px_ = xx; py_ = yy; } }
  // dye molecules: drift in through the pores, then sit on DNA / RNA (dim: not excited)
  for (let i = 0; i < 46; i++) {
    const [x, y, bound] = dyePos(i, k, t);
    if (!bound) { disc(X(x), Y(y), 2.6 * z, P.DY1); continue; }
    disc(X(x), Y(y), 2.8 * z, P.DY0); disc(X(x), Y(y), 2.0 * z, P.DY1);
  }
}
// ---------------------------------------------------------------- the flow cell, the laser and the optics
// laser from the left; forward scatter to the right past a beam stop; side light (90°, drawn on the diagonal toward
// the viewer) through a lens to a dichroic mirror: laser-colour side scatter reflects down to the SSC photodiode,
// green fluorescence passes on through a filter to the SFL photodiode
const OPTX = { laser: [-150, 0], stop: [62, 0], fsLens: [82, 0], fsPD: [116, 0], sLens: [-48, 48], dich: [-86, 86], ssPD: [-86, 140], flt: [-120, 120], flPD: [-146, 146] };
const DICH_D = [-0.383, 0.924];      // mirror direction: reflects light travelling along (-1, 1)/√2 into (0, 1)
// o: { focus (0..1), cellY (laser at y = 0), cellKind, laser (0..1), show {fs, ss, fl}, detect, fluor, light, paths, extra: [{y, kind}] }
function flowCell(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.BG);
  // quartz flow cell and the conical inlet below
  rect(X(-34), Y(-330), X(34), Y(150), P.TB0); rect(X(-30), Y(-330), X(30), Y(150), P.TB1);
  poly(cam.pts([-30, 150, 30, 150, 80, 320, -80, 320]), P.TB1);
  rect(X(-9), Y(-330), X(9), Y(150), P.EC1); poly(cam.pts([-9, 150, 9, 150, 74, 320, -74, 320]), P.EC1);   // sheath fluid
  // sheath streamlines converging, and the sample core narrowing (hydrodynamic focusing)
  const fk = o.focus === undefined ? 1 : o.focus;
  for (const s_ of [-1, 1]) for (let j = 1; j <= 3; j++) { let px_ = null, py_ = null; for (let y = 320; y >= -330; y -= 6) { const w_ = y > 150 ? lerp(9, 74, (y - 150) / 170) : 9, x = s_ * w_ * j / 4, sx = X(x), sy = Y(y); if (px_ !== null && Math.floor((y + t * 120) / 14) % 2 === 0) line(px_, py_, sx, sy, P.EC3, 0.7); px_ = sx; py_ = sy; } }
  rect(X(-10), Y(262), X(10), Y(330), P.TB0); rect(X(-6), Y(250), X(6), Y(330), P.AM1);                  // sample nozzle
  const coreW = lerp(14, 2.4, fk);
  for (let y = 250; y >= -330; y -= 2) { const w_ = y > 150 ? lerp(coreW, 6, (y - 150) / 100) : coreW; rect(X(-w_ / 2), Y(y), X(w_ / 2), Y(y + 2), P.AM2, 0.8); }
  // laser diode and beam (bright red), beam stop, forward lens and photodiode
  const lz = o.laser === undefined ? 1 : o.laser, lx = OPTX.laser[0];
  rect(X(lx - 26), Y(-14), X(lx), Y(14), P.M4); rect(X(lx - 22), Y(-10), X(lx - 4), Y(10), P.M3); disc(X(lx), Y(0), 5 * z, P.LZ1);
  if (lz > 0) { rect(X(lx), Y(-2.2), X(OPTX.stop[0]), Y(2.2), P.LZ1, lz); rect(X(lx), Y(-1), X(OPTX.stop[0]), Y(1), P.LZ2, lz); glow(X(0), Y(0), 10 * z, P.LZ1, P.LZ2, 0.3 * lz); }
  rect(X(OPTX.stop[0] - 3), Y(-7), X(OPTX.stop[0] + 3), Y(7), P.M6);                                                                  // beam stop
  ellipse(X(OPTX.fsLens[0]), Y(0), 5 * z, 22 * z, P.TB3); ellipse(X(OPTX.fsLens[0]), Y(0), 3 * z, 18 * z, P.TB2);
  const pdBox = (x, y, lit, col) => { rect(X(x - 12), Y(y - 14), X(x + 12), Y(y + 14), P.M5); rect(X(x - 8), Y(y - 9), X(x + 8), Y(y + 9), P.PD1); rect(X(x - 6), Y(y - 7), X(x + 6), Y(y + 7), lit > 0 ? P.PD4 : P.PD3); if (lit > 0) glow(X(x), Y(y), 16 * z, col, P.PD5, 0.5 * lit); };
  const det = o.detect || 0, sh = o.show || {};
  pdBox(OPTX.fsPD[0], 0, sh.fs ? det : 0, P.SO1);
  // side collection: lens (on the diagonal), dichroic mirror (tilted), filter, two photodiodes
  ellipse(X(OPTX.sLens[0]), Y(OPTX.sLens[1]), 5 * z, 20 * z, P.TB3, undefined, Math.PI / 4); ellipse(X(OPTX.sLens[0]), Y(OPTX.sLens[1]), 3 * z, 16 * z, P.TB2, undefined, Math.PI / 4);
  const [dx_, dy_] = OPTX.dich; lineW(X(dx_ - DICH_D[0] * 14), Y(dy_ - DICH_D[1] * 14), X(dx_ + DICH_D[0] * 14), Y(dy_ + DICH_D[1] * 14), 3 * z, P.DT2);
  const [fx_, fy_] = OPTX.flt; poly(cam.pts([fx_ - 9, fy_ - 5, fx_ - 5, fy_ - 9, fx_ + 9, fy_ + 5, fx_ + 5, fy_ + 9]), P.EM1);
  pdBox(OPTX.ssPD[0], OPTX.ssPD[1], sh.ss ? det : 0, P.DT2);
  pdBox(OPTX.flPD[0], OPTX.flPD[1], sh.fl ? det : 0, P.EM2);
  // other white cells in the core (one at a time through the beam)
  if (o.extra) for (const e of o.extra) { if (e.y < -340 || e.y > 260) continue; const lit = Math.max(0, 1 - Math.abs(e.y) / 14) * lz; wbc(X(0), Y(e.y), R_WBC * (e.s || 0.8) * z, e.kind, t * 0.3 + e.ph, { pores: 1, dye: 1, glow: lit }); if (lit > 0) { flash(X(0), Y(e.y), 6 * z, lit, [P.LZ1, P.SO1, P.EM2, P.C6]); for (const a of [-0.1, 0.1]) dashLine(X(0), Y(0), X(OPTX.fsLens[0] - 6), Y(Math.tan(a) * (OPTX.fsLens[0] - 6)), P.SO2, 4, 2, -t * 60); dashLine(X(2), Y(2), X(OPTX.sLens[0]), Y(OPTX.sLens[1]), P.EM2, 3, 3, -t * 60); } }
  // the followed white cell in the core
  const cy = o.cellY === undefined ? 200 : o.cellY, inBeam = Math.max(0, 1 - Math.abs(cy) / 14) * lz;
  if (cy > -340 && cy < 330) wbc(X(0), Y(cy), R_WBC * 0.9 * z, o.cellKind || 'neut', t * 0.3, { pores: 1, dye: 1, glow: o.fluor !== undefined ? o.fluor : inBeam });
  // light leaving the cell while it is in the beam
  const L = o.light === undefined ? inBeam : o.light;
  if (L > 0) {
    for (const a of [-0.12, -0.06, 0.06, 0.12]) { const ex = OPTX.fsLens[0] - 5, ey = Math.tan(a) * ex; dashLine(X(0), Y(0), X(ex), Y(ey), P.SO2, 4, 2, -t * 60); }
    for (const d of [-7, 7]) dashLine(X(4), Y(4), X(OPTX.sLens[0] + d * 0.7), Y(OPTX.sLens[1] - d * 0.7), P.DT3, 3, 3, -t * 60);
    for (const d of [-3, 3]) dashLine(X(2), Y(2), X(OPTX.sLens[0] + d), Y(OPTX.sLens[1] - d), P.EM2, 3, 3, -t * 60 + 2);
    if (o.paths) {
      dashLine(X(OPTX.sLens[0]), Y(OPTX.sLens[1]), X(dx_ + 2), Y(dy_ - 2), P.DT3, 3, 3, -t * 60);
      dashLine(X(OPTX.sLens[0] - 2), Y(OPTX.sLens[1]), X(dx_), Y(dy_), P.EM2, 3, 3, -t * 60 + 2);
      dashLine(X(dx_), Y(dy_), X(OPTX.ssPD[0]), Y(OPTX.ssPD[1] - 14), P.DT3, 3, 3, -t * 60);
      dashLine(X(dx_), Y(dy_), X(fx_), Y(fy_), P.EM2, 3, 3, -t * 60);
      dashLine(X(fx_), Y(fy_), X(OPTX.flPD[0] + 8), Y(OPTX.flPD[1] - 8), P.EM2, 3, 3, -t * 60);
      dashLine(X(OPTX.fsLens[0]), Y(0), X(OPTX.fsPD[0] - 12), Y(0), P.SO2, 3, 3, -t * 60);
    }
  }
  return { cell: [X(0), Y(cy)] };
}
// an electrical pulse trace for one optical channel: events [[tc, amp], ...] (one pulse per cell), 1.2 s window
function pulseHUD(x0, y0, x1, y1, t, events, col, label) {
  rect(x0, y0, x1, y1, P.DS0); frame(x0, y0, x1, y1, P.M5);
  let px_ = null, py_ = null;
  for (let x = x0 + 2; x <= x1 - 2; x++) {
    const tt = t - (x1 - 2 - x) / (x1 - x0) * 1.2;
    let v = 0; for (const [tc, amp] of events) if (tt > tc - 0.3 && tt < tc + 0.3) v += amp * Math.exp(-((tt - tc) ** 2) / 0.004);
    const y = y1 - 5 - v * (y1 - y0 - 16);
    if (px_ !== null) lineW(px_, py_, x, y, 2, P.SG2); px_ = x; py_ = y;
  }
  text(FS, label, x0 + 4, y0 + 3, { sc: 2, c: col, ol: null });
}
