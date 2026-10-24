'use strict';
// ============================================================================
// Screens: treatment-planning workstation (CT slice, contours, dose) and the
// treatment console (room camera, safety checks, beam-on key).
// ============================================================================
const MON = { x0: 12, y0: 104, x1: 258, y1: 322 };            // planning monitor bezel
const MSCR = [19, 111, 251, 302];                             // its screen area
function drawMonitor(x0, y0, x1, y1, scr, standW) {
  shade(maskRR(x0, y0, x1, y1, 5), P.C1, P.C2, P.C0, P.K0, { k: 2 });
  rect(scr[0] - 1, scr[1] - 1, scr[2] + 1, scr[3] + 1, P.K0);
  rect(scr[0], scr[1], scr[2], scr[3], P.CT0);
  if (standW) {
    const cx = (x0 + x1) / 2;
    shade(maskRR(cx - standW / 2, y1, cx + standW / 2, y1 + 20, 1), P.C1, P.C2, P.C0, P.K0);
    shade(maskRR(cx - standW * 1.6, y1 + 18, cx + standW * 1.6, y1 + 24, 2), P.C2, P.C3, P.C1, P.K0);
  }
}
// planning UI chrome inside the screen: toolbar icons + structure swatches
function planChrome(scr, t, activeTool) {
  rect(scr[0], scr[1], scr[2], scr[1] + 11, P.N2); rect(scr[0], scr[1] + 11, scr[2], scr[1] + 12, P.N4);
  for (let i = 0; i < 7; i++) {
    const x = scr[0] + 4 + i * 13, y = scr[1] + 2;
    rect(x, y, x + 9, y + 8, i === activeTool ? P.N6 : P.N3);
    const c = [P.R3, P.INK, P.D2, P.C4, P.C3, P.C3, P.C3][i];
    if (i === 0) { ring(x + 4.5, y + 4, 2.6, 1, c); }
    else if (i === 1) { for (let k = 0; k < 7; k += 2) rect(x + 1 + k, y + 4, x + 2 + k, y + 5, c); }
    else if (i === 2) { rect(x + 2, y + 2, x + 4, y + 6, P.D1); rect(x + 4, y + 2, x + 6, y + 6, P.D2); rect(x + 6, y + 2, x + 8, y + 6, P.D4); }
    else rect(x + 3, y + 3, x + 6, y + 5, c);
  }
  // slice indicator dots (bottom right)
  for (let i = 0; i < 9; i++) rect(scr[2] - 40 + i * 4, scr[3] - 6, scr[2] - 38 + i * 4, scr[3] - 4, i === 4 ? P.C4 : P.N4);
}
// back-view clinician silhouette lit by the monitor
function clinician(x, y, s) {
  const m = maskEll(x, y + 70 * s, 70 * s, 62 * s);
  shade(m, P.N2, P.N4, P.N1, P.K0, { k: 2 });
  const h = maskEll(x + 2 * s, y + 6 * s, 25 * s, 29 * s);
  shade(h, P.N2, P.N4, P.N1, P.K0, { k: 2 });
  rect(x - 12 * s, y + 30 * s, x + 14 * s, y + 42 * s, P.N2);
}
// ------------------------------------------------------------- console
const CON = { mL: [12, 132, 132, 236], mR: [140, 132, 260, 236] };
function drawConsole(t, st) {
  clear(P.BG);
  // back wall + window to the bunker (darker)
  rect(0, 0, W, 300, P.N1); for (let x = 0; x < W; x += 30) rect(x, 0, x + 1, 300, P.N2);
  // monitors
  for (const m of [CON.mL, CON.mR]) drawMonitor(m[0], m[1], m[2], m[3], [m[0] + 5, m[1] + 5, m[2] - 5, m[3] - 14], 18);
  // left screen: live room camera (downscaled room render)
  if (st.roomFeed) blitScaled(st.roomFeed, [CON.mL[0] + 5, CON.mL[1] + 5, CON.mL[2] - 5, CON.mL[3] - 14], [40, 120, 230, 380]);
  rect(CON.mL[0] + 8, CON.mL[1] + 8, CON.mL[0] + 12, CON.mL[1] + 12, Math.floor(t * 2) % 2 ? P.R3 : P.R1);
  // right screen: three checks (icons + lamps)
  const sx = CON.mR[0] + 9, sy = CON.mR[1] + 10;
  for (let i = 0; i < 3; i++) {
    const y = sy + i * 26, ok = st.checks > i;
    rect(sx, y, CON.mR[2] - 9, y + 21, P.N2); frame(sx, y, CON.mR[2] - 9, y + 21, ok ? P.G1 : P.N4);
    checkIcon(i, sx + 6, y + 3);
    const lx = CON.mR[2] - 22, ly = y + 10.5;
    if (ok) glow(lx, ly, 9, P.G0, P.G1, 1);
    disc(lx, ly, 5, ok ? P.G2 : P.A2); disc(lx - 1.5, ly - 1.5, 1.5, ok ? P.G3 : P.A0 === undefined ? P.C5 : P.C5);
    ring(lx, ly, 5.5, 1, P.SH);
    if (ok) tick(sx + 32, y + 6, P.G2, 2);
  }
  // desk
  rect(0, 300, W, 312, P.C2); rect(0, 300, W, 301, P.C4); rect(0, 312, W, H, P.N2); rect(0, 312, W, 314, P.C0);
  // control pad with key + beam-on button
  shade(maskRR(54, 318, 216, 372, 4), P.C1, P.C2, P.C0, P.K0, { k: 2 });
  for (let i = 0; i < 4; i++) shade(maskRR(64 + i * 18, 330, 78 + i * 18, 342, 2), P.C2, P.C3, P.C0, P.K0);
  // key switch
  disc(76, 358, 7, P.C0); disc(76, 358, 5.5, P.C3); rect(75, 352, 77, 364, st.key ? P.C6 : P.C1);
  // beam on button
  const bx = 176, by = 348, pr = st.press || 0, armed = st.armed || 0;
  if (armed > 0) glow(bx, by + pr * 2, 26, P.Y0, P.Y1, armed);
  disc(bx, by + 2, 15, P.K0); disc(bx, by + pr * 2, 14, P.Y1); disc(bx, by + pr * 2, 11.5, armed > 0.5 ? P.Y2 : P.A1);
  disc(bx - 3, by - 3 + pr * 2, 4, armed > 0.5 ? P.Y3 : P.A2);
  // tiny photon zigzag on the button (beam symbol)
  const zz = [-7, 0, -4, -3, -1, 3, 2, -3, 5, 3, 7, 0];
  for (let i = 0; i + 3 < zz.length; i += 2) line(bx + zz[i], by + zz[i + 1] + pr * 2, bx + zz[i + 2], by + zz[i + 3] + pr * 2, P.Y0);
  // therapist hand pressing the button
  if (st.hand !== undefined) {
    const hy = lerp(500, by + 6, st.hand);
    const m = maskPoly([bx - 10, hy + 6, bx - 4, hy - 4, bx + 4, hy - 6, bx + 8, hy + 2, bx + 14, hy + 30, bx + 20, H + 20, bx - 26, H + 20, bx - 16, hy + 30]);
    shade(m, P.SK1, P.SK2, P.SK0, P.SH);
    shade(maskRR(bx - 4, hy - 10, bx + 5, hy + 8, 4), P.SK2, P.SK3, P.SK1, P.SH);
  }
}
function checkIcon(i, x, y) {
  if (i === 0) { // door
    rect(x, y, x + 11, y + 15, P.C3); rect(x + 1, y + 1, x + 10, y + 15, P.C1); rect(x + 7, y + 7, x + 9, y + 9, P.C5);
  } else if (i === 1) { // patient
    disc(x + 5.5, y + 4, 3.2, P.C3); rect(x, y + 9, x + 11, y + 15, P.C3); rect(x + 1, y + 8, x + 10, y + 10, P.C3);
  } else { // plan sheet
    rect(x + 1, y, x + 11, y + 15, P.C4); for (let k = 0; k < 4; k++) rect(x + 3, y + 3 + k * 3, x + 9, y + 4 + k * 3, P.C1);
  }
}
// nearest-neighbour blit of a full-frame buffer region into a screen rect
function blitScaled(src, dst, region) {
  const [dx0, dy0, dx1, dy1] = dst, [sx0, sy0, sx1, sy1] = region;
  for (let y = dy0; y < dy1; y++) {
    const sy = Math.floor(lerp(sy0, sy1, (y - dy0 + 0.5) / (dy1 - dy0)));
    for (let x = dx0; x < dx1; x++) {
      const sx = Math.floor(lerp(sx0, sx1, (x - dx0 + 0.5) / (dx1 - dx0)));
      buf[y * W + x] = src[sy * W + sx];
    }
  }
}
