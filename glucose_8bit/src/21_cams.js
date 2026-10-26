'use strict';
// ============================================================================
// CAMERAS: one log-zoom keyframe track per world. Holds while a mechanism
// plays; slow pushes and glides between details; pull-outs answer pushes.
// Two accents only: the dive into the strip and the slam on the number.
// ============================================================================
const DIVE = bezierEase(0.55, 0, 0.9, 0.5);         // accelerating push (ends inside the lens)
const SURF = bezierEase(0.15, 0.55, 0.35, 1);        // decelerating arrival after a lens
const PULL = bezierEase(0.1, 0.5, 0.4, 1);           // fast-start pull-out
const SNAP = bezierEase(0.2, 0.9, 0.3, 1);           // the slam
const CAMK_M = [
  [0, -1.2, -6.2, 11.5], [T_STRIP0, -0.9, -5.9, 11.8, lin],                       // s01 hold (a breath of drift)
  [3.62, 0.4, 25, 4.6, K75], [SC_T[2], 0.4, 25, 4.6, lin],                        // s02 pull back: the meter rises in
  [T_DIVE0, 0.4, 7.4, 8.4, eio],                                                  // s03 slow push to the tip
  [T_DIVE1, DOCK.x, DOCK.y + 0.15, 160, DIVE],                                    // s04 the dive into the inlet
  [38.9, DOCK.x, DOCK.y + stripWinY(0.55), 60],                                   // s15: back out of the strip window
  [T_OUT2, DOCK.x, DOCK.y + 7, 14, PULL], [40.75, DOCK.x, MTOP - 9, 6.0, K75], [SC_T[15], DOCK.x, MTOP - 7.5, 6.0, lin],
  [43.4, DOCK.x + 6.5, MTOP + 6.5, 13.0, eio], [SC_T[16], DOCK.x + 7, MTOP + 7.2, 13.4, lin],   // s16 push into the opened meter
  [SC_T[17], DOCK.x + 8.6, MTOP + 7.6, 13.6, lin],                                // s17 hold on the amplifier
  [49.2, DOCK.x - 9.2, MTOP + 14.4, 13.6, eio], [SC_T[18], DOCK.x - 9.6, MTOP + 14.6, 13.6, lin],  // s18 glide to the converter
  [52.2, DOCK.x + 0.4, MTOP + 26, 12.0, eio], [SC_T[19], DOCK.x + 0.4, MTOP + 26.4, 12.0, lin],   // s19 glide to the processor
  [54.6, DOCK.x, MTOP + 31, 4.3, K75], [T_SNAP, DOCK.x, MTOP + 31, 4.3, lin],     // s20 pull out: the whole meter
  [T_SNAP + 0.2, DOCK.x, MTOP + 21.4, 7.2, SNAP], [T_RECAP, DOCK.x, MTOP + 21.2, 7.7, lin],     // s21 the slam onto the number
  [SC_T[24], DOCK.x, MTOP + 52, 4.5], [70.2, DOCK.x - 1, MTOP + 50, 3.55, K75], [SC_T[25], DOCK.x - 1, MTOP + 49, 3.5, lin],   // s25 pull back on the hand
  [72.25, 0.0, 22, 4.7, eio], [T_AWAY0, 0.0, 21, 4.8, lin],                       // s26 glide up to the fingertip
  [77.45, -1.279, -6.279, 11.42, K75], [DUR, -1.2, -6.2, 11.5, lin],               // ... and settle on frame one (same drift as frame one)
];
function camM(t) {
  const cam = camTrack(CAMK_M, t, CX, CY);
  let sx = 0, sy = 0;
  const kc = t - T_CLICK; if (kc > 0 && kc < 0.16) { const a = 1.2 * (1 - kc / 0.16); sx += a * Math.sin(kc * 150); sy += a * Math.cos(kc * 170); }
  const sn = t - T_NUM; if (sn > 0 && sn < 0.22) { const a = 2.2 * (1 - sn / 0.22); sx += a * Math.sin(sn * 140); sy += a * Math.cos(sn * 165); }
  cam.ax += Math.round(sx); cam.ay += Math.round(sy);
  return cam;
}
// the strip section: arrives inside the lens, follows the blood front, pushes into the reagent, dives into the enzyme
const CAMK_S = [
  [T_DIVE0, 0, 300, 0.05], [T_DIVE1, 0, 130, 1.05, DIVE], [SC_T[4], 0, 175, 0.9, SURF],
  [SC_T[5], 0, 1395, 0.85], [SC_T[6], -40, 955, 2.3, K75], [SC_T[7], -62, 1000, 2.6, eio],
  [T_SR1, HERO_ENZ_S[0], HERO_ENZ_S[1], 12, DIVE],
  [T_OUT0, HERO_ENZ_S[0], HERO_ENZ_S[1], 5.0], [38.9, -20, 820, 0.62, PULL], [T_OUT2, 0, 800, 0.08, DIVE],
  [SC_T[22], -58, 690, 2.0], [SC_T[23], -58, 1080, 2.0, lin],
];
function camS(t) {
  if (t > SC_T[4] - 0.2 && t < SC_T[5] + 0.6) {     // s05: glide down with the front
    const a = camTrack(CAMK_S, t, CX, CY), f = clamp(frontY(t) - 120, 175, 1395);
    const k = smooth(seg(t, SC_T[4] - 0.2, SC_T[4] + 0.5)) * (1 - smooth(seg(t, SC_T[5], SC_T[5] + 0.6)));
    if (t < SC_T[5]) a.cy = lerp(a.cy, f, k), a.z = lerp(a.z, 0.85, k);
    return a;
  }
  return camTrack(CAMK_S, t, CX, CY);
}
const CAMK_R = [
  [T_SR0, 64, -14, 0.55], [T_SR1, 100, -36, 2.25, DIVE], [SC_T[8], 87, -8, 2.8, SURF],
  [SC_T[9], 82, -4, 2.9, lin], [SC_T[10], 57, 0, 3.2, eio], [SC_T[11], 45, -6, 3.2, eio],
  [31.6, 32, -8, 1.5, K75], [SC_T[13], 30, 6, 1.55, lin],
  [T_OUT0, 30, 6, 1.55], [38.9, 40, 0, 0.45, PULL],
];
function camR(t) {
  const cam = camTrack(CAMK_R, t, CX, CY);
  const sn = t - T_SURGE; if (sn > 0 && sn < 0.3) { const a = 1.6 * (1 - sn / 0.3); cam.ax += Math.round(a * Math.sin(sn * 120)); cam.ay += Math.round(a * Math.cos(sn * 140)); }
  return cam;
}
