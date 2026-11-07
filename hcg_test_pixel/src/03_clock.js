'use strict';
// ============================================================================
// THE CLOCK: 120 BPM in 4/4 (beat 0.5 s, bar 2 s); 36 bars = 72.000 s.
// Each of the 18 scenes is exactly 2 bars. Every event below sits on the
// eighth-note grid (0.25 s = 15 frames at 60 fps), so a sound and the picture
// change it belongs to land on the same frame. The audio reads this table.
// ============================================================================
const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4, NBARS = 36;
const SC_T = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72];
const SCENE_NAMES = ['THE TWO-LINE MYSTERY', 'A FRESH TEST', 'REVEAL THE STRIP', 'CAPILLARY FLOW', 'RELEASE THE LABELS',
  'MEET THE TARGET', 'FIRST BINDING EVENT', 'APPROACH THE TEST ZONE', 'THE MOLECULAR SANDWICH', 'MANY CAPTURES',
  'WHY GOLD LOOKS RED', 'ELECTRON-SCALE REVEAL', 'THE LINE BECOMES VISIBLE', 'THE CONTROL MECHANISM', 'TWO ZONES, TWO JOBS',
  'WITHOUT DETECTABLE hCG', 'THE CONTROL MATTERS', 'LOOP RETURN'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];
const rng8 = (a, b, step) => { const o = []; for (let t = a; t <= b + 1e-9; t += step) o.push(Math.round(t * 1000) / 1000); return o; };

// capture clicks in the test zone (scene 10): eighths, then sixteenths as the labels pile up
const CAPTURES = [...rng8(36.25, 37.75, 0.5), ...rng8(38.0, 38.75, 0.25), ...rng8(39.0, 39.75, 0.125)];
const EV = {
  // 01 the two-line mystery
  push1: 0.5, glintT: 2.5, glintC: 3.0, qOut: 3.5,
  // 02 a fresh test
  cut2: 4.0, cap2: 4.25, toWell: 4.75, dropper: 5.25, dropFall: 6.0, dropHit: 6.5, soak: 6.75,
  // 03 reveal the strip
  pull3: 7.75, peel: 8.5, layers: [8.75, 9.0, 9.25, 9.5], cap3: 8.5, track3: 9.75, dive: 11.25,
  // 04 capillary flow
  fibres: 12.0, flowArrow: 12.25, cap4: 12.75, pores: [13.0, 13.5, 14.0, 14.5, 15.0, 15.5],
  // 05 release the labels
  reachConj: 16.0, release: [17.0, 17.25, 17.5, 17.75], cap5: 17.5, lock: 18.5,
  // 06 meet the target
  pull6: 20.0, hcgIn: 20.5, cap6: 20.75, hcgTag: 21.5,
  // 07 first binding event
  push7: 24.0, turn: [25.0, 25.25, 25.5], bind1: 26.0, cap7: 26.25,
  // 08 approach the test zone
  pull8: 28.0, zoneIn: 29.5, cap8: 30.0, rise: 30.5, settle: 31.25,
  // 09 the molecular sandwich
  push9: 32.0, bind2: 33.0, cap9: 33.25, chain: [33.5, 33.75, 34.0, 34.25, 34.5], tags9: [34.75, 35.0, 35.25, 35.5],
  // 10 many captures
  steps: [36.0, 36.5, 37.0], cap10: 36.25, captures: CAPTURES, flip: 38.0,
  // 11 why gold looks red
  lock11: 40.25, inset: 40.5, cap11: 41.0, light: 41.5,
  // 12 electron-scale reveal
  osc: 44.0, cap12: 44.25, plasmon: 45.0, strands: 46.0, absorbTag: 46.5,
  // 13 the line becomes visible
  insetClose: 48.0, cap13: 48.5, zoomOut: 48.75, lineSeen: 51.0,
  // 14 the control mechanism
  lens14: 52.0, spareIn: 52.5, cap14: 53.0, bindC: 54.0, noHcgTag: 54.5,
  // 15 two zones, two jobs
  lensClose: 56.0, tagT: 57.0, tagC: 57.5,
  // 16 without detectable hCG
  split: 60.0, negDots: 61.0, cap16: 61.5, negC: 63.0,
  // 17 the control matters
  invalidIn: 64.0, cap17: 65.0, warn: 65.25,
  // 18 loop return
  ret: 68.0, rest: 69.5, cap18: 70.0,
};
