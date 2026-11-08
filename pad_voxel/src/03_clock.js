'use strict';
// ============================================================================
// THE CLOCK: 80 BPM in 4/4 (beat 0.75 s = 45 frames, bar 3 s); 21 bars =
// 63.000 s; each scene is exactly one bar. Picture events sit on beats or
// eighths (an eighth is 22.5 frames: drawn on the nearest frame, at most
// 8.3 ms away); the audio reads the same table.
// ============================================================================
const BPM = 80, BEAT = 60 / BPM, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4, NBARS = 21;
const SC_T = []; for (let i = 0; i <= 21; i++) SC_T.push(i * 3);
const SCENE_NAMES = ['WALKING', 'THE PATIENT STOPS', 'ENTER THE LEG', 'NORMAL REFERENCE', 'CHRONIC HIGH GLUCOSE', 'ENDOTHELIAL DYSFUNCTION',
  'PLAQUE FORMATION', 'CHRONIC PROGRESSION', 'STENOSIS', 'OCCLUSION', 'COLLATERAL BYPASS', 'WALKING INCREASES DEMAND', 'REST RELIEVES THE SYMPTOM',
  'CT ANGIOGRAPHY', 'CONTRAST CIRCULATION', 'PELVIS-TO-FOOT FILLING', 'CTA RECONSTRUCTION', 'STENOSIS ON CTA', 'OCCLUSION ON CTA',
  'NORMAL VERSUS DIABETIC PAD', 'FINAL DIAGNOSTIC IMAGE'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];                      // scene start, 0-based
const bt = (i, b) => SC_T[i] + b * BEAT;     // scene i, beat b (may be fractional: 0.5 = an eighth)
const EV = {};
// the event table (seconds; scene i starts at 3·i)
Object.assign(EV, {
  steps: [0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5], cap1: 0.75,
  slow: 3.75, hold: 4.5, pain: 4.875,
  reveal: 6.0, muscle: 6.75, artery: 7.5, dive: 8.25,
  cut4: 9.0, cap4: 9.375, pulses4: [9.0, 9.75, 10.5, 11.25],
  glu: [12.0, 12.75, 13.5, 14.25], cap5: 12.375,
  push6: 15.0, cap6: 15.375, sick: 15.75, wbc: [16.125, 16.875], ticks6: [15.375, 16.125, 16.5, 17.25, 17.625],
  pull7: 18.0, cap7: 18.375, ldl: [18.75, 19.125, 19.5], foam: 19.875, bulge: 20.25,
  grow8: 21.0, cap8: 21.375, calc: [22.125, 22.875],
  comp9: 24.0, cap9: 24.375, jet: 24.75,
  pan10: 27.0, block10: 28.125, cap10: 28.125,
  pull11: 30.0, cap11: 30.375, colGrow: 30.75, colFlow: 31.875,
  cut12: 33.0, cap12: 33.375, steps12: [33.0, 33.75, 34.5, 35.25],
  rest13: 36.0, cap13: 36.375, relax: 36.75,
  ct14: 39.0, cap14: 39.375, tableStop: 41.25, inject: 41.25,
  circ15: 42.0,
  fill16: 45.0,
  cta17: 48.0, cap17: 48.375,
  zoom18: 51.0, cap18: 51.375, inset18: 52.125,
  pan19: 54.0, cap19: 54.375, cutoff19: 54.75, col19: 55.5,
  comp20: 57.0, cap20: 57.375,
  hl21: [60.75, 61.5, 62.25], cap21: 60.375,
});
