'use strict';
// ============================================================================
// THE NANOPARTICLE INSET (screen space). A slowed, schematic model:
// a fixed positive ion background (muted amber, "+" lattice) and the
// conduction-electron density (translucent cyan) that the light's electric
// field pushes up and down as ONE cloud — it never orbits and never leaves the
// particle. White light is drawn as a wave; split into colour strands, the
// green strand drives the cloud (resonance) and ends at the particle, while
// red (and some blue) goes on: the eye gets light with the green taken out.
// ============================================================================
const INS = { x0: 14, y0: 62, x1: 166, y1: 214 }, PCX = 100, PCY = 138, PR = 34;
// panel frame; k = 0..1 opening (4 stepped sizes) from the point (fx, fy)
function insetPanel(k, fx, fy) {
  const st = Math.min(4, Math.floor(k * 4 + 1e-6));
  if (st <= 0) return false;
  const f = st / 4, x0 = Math.round(lerp(fx - 6, INS.x0, f)), y0 = Math.round(lerp(fy - 6, INS.y0, f));
  const x1 = Math.round(lerp(fx + 6, INS.x1, f)), y1 = Math.round(lerp(fy + 6, INS.y1, f));
  rect(x0 + 3, y0 + 3, x1 + 3, y1 + 3, P.SH);
  rect(x0, y0, x1, y1, P.N1);
  for (let y = y0 + 4; y < y1 - 2; y += 6) for (let x = x0 + 4; x < x1 - 2; x += 6) pset(x, y, P.N2);
  frame(x0 - 1, y0 - 1, x1 + 1, y1 + 1, P.K0); frame(x0, y0, x1, y1, P.TE1); frame(x0 + 1, y0 + 1, x1 - 1, y1 - 1, P.TE3);
  for (const [cx, cy] of [[x0, y0], [x1 - 2, y0], [x0, y1 - 2], [x1 - 2, y1 - 2]]) rect(cx, cy, cx + 2, cy + 2, P.TE0);
  return st >= 4;
}
// electric-field value of the light at the particle (drives the cloud): f Hz, phase velocity 64 px/s
const WAVE = { v: 64, white: 32, b: 26, g: 32, r: 40, A: 6 };
function waveY(x, t, lam, t0) { return Math.sin(TAU * ((x - INS.x0) / lam - (WAVE.v / lam) * (t - t0))); }
function drawWave(x0, x1, yc, t, lam, t0, col, col2, amp, dim) {
  let px = null, py = null;
  for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) {
    const y = Math.round(yc - amp * waveY(x, t, lam, t0));
    if (px !== null) { line(px, py, x, y, col); if (col2 !== undefined && !dim) line(px, py + 1, x, y + 1, col2); }
    px = x; py = y;
  }
}
// the cloud displacement (px, + = down): rings up as the light arrives, then follows the green strand
function cloudDy(t) {
  const A = 9 * smooth(seg(t, EV.light + 0.75, EV.osc)), x = PCX;
  return A * waveY(x - 20, t, WAVE.g, EV.light);        // a little behind the drive (lag), same frequency
}
function drawParticleInset(t, o) {
  o = o || {};
  const dy = Math.round(cloudDy(t));
  // body: ruby rim with the amber identity outline
  const body = maskDisc(PCX, PCY, PR);
  mFill(body, P.RU2);
  const core = maskDisc(PCX, PCY, PR - 3);
  mFill(core, P.PA2);
  // fixed positive ion lattice
  for (let y = PCY - PR + 6; y < PCY + PR - 4; y += 9) for (let x = PCX - PR + 6; x < PCX + PR - 4; x += 9) {
    if ((x - PCX) * (x - PCX) + (y - PCY) * (y - PCY) > (PR - 7) * (PR - 7)) continue;
    pset(x, y, P.PA0); pset(x - 1, y, P.PA0); pset(x + 1, y, P.PA0); pset(x, y - 1, P.PA0); pset(x, y + 1, P.PA0);
  }
  // the electron cloud: a translucent dither over the ions, denser where it is pushed against the surface
  const r2 = (PR - 3) * (PR - 3), rc2 = (PR - 8) * (PR - 8);
  for (let y = PCY - PR; y <= PCY + PR; y++) for (let x = PCX - PR; x <= PCX + PR; x++) {
    const ix = x - PCX, iy = y - PCY; if (ix * ix + iy * iy > r2) continue;
    const cy = iy - dy; if (ix * ix + cy * cy > rc2) continue;             // outside the displaced cloud: bare ions (+)
    const edge = (ix * ix + iy * iy) > (PR - 10) * (PR - 10) && Math.sign(iy) === Math.sign(dy) && Math.abs(dy) > 2;
    const dens = edge ? 0.8 : 0.38;
    if (bay(x, y) < dens) buf[y * W + x] = edge ? P.CY1 : P.CY2;
  }
  mRim(body, P.RU0, 1, 1); mOutline(body, P.RU3); mOuter(body, P.AM1);
  // charge separation marks
  if (Math.abs(dy) > 3) {
    const sy = Math.sign(dy), my = PCY + sy * (PR - 9), py = PCY - sy * (PR - 9);
    rect(PCX - 3, my, PCX + 4, my + 1, P.CY0); rect(PCX - 3, my + 1, PCX + 4, my + 2, P.SH);           // −
    rect(PCX - 3, py, PCX + 4, py + 1, P.AM0); rect(PCX, py - 3, PCX + 1, py + 4, P.AM0);              // +
  }
}
// the whole inset content at time t (panel already drawn)
function drawInsetContent(t) {
  const left = INS.x0 + 3, pl = PCX - PR - 2, pr = PCX + PR + 2, right = INS.x1 - 3;
  const front = left + WAVE.v * (t - EV.light);                    // leading edge of the arriving light
  const split = t >= EV.strands;
  if (t >= EV.light) {
    if (!split) drawWave(left, Math.min(front, pl), PCY, t, WAVE.white, EV.light, P.LW, P.SUB, WAVE.A);
    else {
      const st = Math.min(2, Math.floor((t - EV.strands) / 0.08));     // white → two → three strands, stepped
      const yb = PCY - 12 * st / 2, yr = PCY + 12 * st / 2;
      drawWave(left, pl, yb, t, WAVE.b, EV.light, P.LBL1, P.LBL0, 4);
      drawWave(left, pl, yr, t, WAVE.r, EV.light, P.LR1, P.LR0, 4);
      drawWave(left, pl, PCY, t, WAVE.g, EV.light, P.LG1, P.LG0, 4);
      // after the particle: the red strand goes on, blue weaker, the green strand has ended at the particle
      const out = pr + WAVE.v * (t - EV.strands - 0.2);
      if (out > pr) { drawWave(pr, Math.min(out, right), PCY + 6, t, WAVE.r, EV.light, P.LR1, P.LR0, 4); drawWave(pr, Math.min(out, right), PCY - 8, t, WAVE.b, EV.light, P.LBL1, P.LBL1, 2, true); }
    }
    // the field arrow at the particle: up or down with the wave
    if (front > pl - 4) {
      const e = waveY(pl - 6, t, WAVE.g, EV.light), ax = pl - 6, L = Math.round(6 * Math.abs(e)) + 2, sg = e > 0 ? -1 : 1;
      if (Math.abs(e) > 0.2) { rect(ax, Math.min(PCY, PCY + sg * L), ax + 1, Math.max(PCY, PCY + sg * L), P.AM0); pset(ax - 1, PCY + sg * (L - 2), P.AM0); pset(ax + 1, PCY + sg * (L - 2), P.AM0); }
    }
  }
  drawParticleInset(t);
}
