'use strict';
// ============================================================================
// TIME: the 120 BPM grid, the scene table, and the EVENT TABLE.
// The event table is the single list of physical events that both the picture
// and the sound read: a crack is drawn on the frame its crack sound starts, a
// pulse frosts the skin on the frame its snap is heard. Every event time sits
// on the eighth-note grid (0.25 s = 15 frames), so it is frame-exact at 60 fps.
// ============================================================================
const NBARS = 24, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4;
const lin = x => x; const bt = n => n * BEAT; const barT = b => (b - 1) * BAR;
const SC_T = [0, 1, 2, 3, 4, 6, 8, 11, 13, 16, 19, 21, 23, 26, 28, 31, 33, 36, 40, 45, 48];
const SEQ = { A: [0, 4], B: [4, 19], C: [19, 33], D: [33, 40], E: [40, 48] };
const SCENE_NAMES = ['LASER ON THE TATTOO', 'THE TATTOO REACTS', 'THE TATTOO BEGINS TO FADE', 'ZOOM INSIDE THE SKIN', 'WHERE TATTOO INK LIVES',
  'LASER PHOTONS ENTER', 'THE PIGMENT ABSORBS ENERGY', 'RAPID EXPANSION', 'PIGMENT FRAGMENTATION', 'LARGE VS SMALL PARTICLES', 'REVEAL THE MACROPHAGE',
  'MACROPHAGE APPROACHES THE INK', 'PHAGOCYTOSIS', 'INSIDE THE MACROPHAGE', 'LYMPHATIC CLEARANCE', 'LESS PIGMENT REMAINS', 'BACK TO THE SKIN SURFACE',
  'THE NEXT LASER SESSION', 'MULTIPLE TREATMENT TIMELINES', 'THE FINAL REVEAL'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];
const range = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(Math.round(x * 1000) / 1000); return o; };
const EV = {
  // A — the hook: four pulses along the dragon's neck (4 Hz, a real Q-switched repetition rate)
  hook: [0.25, 0.5, 0.75, 1.0],
  weeks1: 2.0,                                   // WEEKS LATER: the frosting is gone, the dragon a little lighter
  tilt: 3.0,                                     // the skin lifts into a cut-away block
  dive: 3.5,                                     // and the camera dives into its front face
  ambient: 4.25,                                 // arrival in the dermis
  // B — how the laser breaks the ink
  agg: 5.0,                                      // one large aggregate is singled out
  micro: 6.0,                                    // the next pulse, seen inside the skin: photons enter
  scatter: [6.5, 7.0, 7.5],                      // a few photons scatter in the tissue
  hits: range(8.0, 10.75, 0.25),                 // twelve photons absorbed by the aggregate
  expand: 11.0,                                  // thermoelastic expansion: the pressure wave
  bubbles: [11.25, 11.5, 11.75, 12.0, 12.25],    // gas bubbles form around it (the frosting, at the scale of the ink)
  cracks: [13.0, 13.25, 13.5, 13.75],            // four cracks run through the aggregate
  split: 14.0,                                   // it breaks into fragments (the downbeat of bar 8)
  compare: 16.0, disperse: 16.25, merge: 18.0,   // before / after (the fragments drift apart), merged back into the tissue
  // C — immune cells remove pigment
  macro: 19.0,                                   // the macrophage comes into view
  reach: [21.0, 21.5, 22.0, 22.5],               // it stretches toward the fragments
  wrap: 23.0, close: 24.0, vesicle: 25.0,        // the membrane extends, closes (downbeat of bar 13), the vesicle forms
  inside: 26.0, lyso: [26.75, 27.25, 27.75],     // inside the cell: three lysosomes merge with the vesicle
  lymph: 28.0, enter: [28.5, 29.0, 29.5], cellIn: 29.75, node: 30.25,
  clear: range(31.25, 32.75, 0.25),              // weeks pass: the ink clusters thin out (seven steps)
  // D — fading over time
  surface: 33.0, out: 33.25, weeks2: 34.5,      // the camera rises back out through the skin
  session: 36.0, pulses2: [36.75, 37.0, 37.25, 37.5],
  steps4: [38.0, 38.5, 39.0, 39.5],              // REMAINING PIGMENT → ENERGY ABSORPTION → SMALLER FRAGMENTS → IMMUNE CLEARANCE
  // E — the payoff time-lapse and the loop
  labels: [[40.0, 'SESSION 1'], [40.75, 'WEEKS LATER'], [41.5, 'SESSION 2'], [42.25, 'WEEKS LATER'], [43.0, 'ADDITIONAL SESSIONS'], [44.0, 'FINAL RESULT']],
  stages: [40.0, 40.75, 42.25, 43.5, 44.0],      // the five states of the tattoo (five ascending ticks)
  stageFade: [0, 0.2, 0.5, 0.8, 1.0],            // how far the tattoo has faded at each
  pulses3: [40.25, 40.5, 41.75, 42.0, 43.0, 43.25],
  done: 45.0, recap: [45.25, 45.5, 45.75, 46.0], title: 46.5, rewind: 47.5,
};
// the tattoo's fade (0 = as tattooed, 1 = no longer visible) at the surface, over the whole film
function inkFade(t) {
  if (t < EV.weeks1) return 0;
  if (t < 33.0) return 0.15 * smooth(seg(t, EV.weeks1, EV.weeks1 + 0.5));
  if (t < 40.0) return lerp(0.15, 0.38, smooth(seg(t, EV.weeks2, EV.weeks2 + 0.5)));
  if (t < EV.rewind) { let f = 0; for (let i = 1; i < EV.stages.length; i++) f = lerp(f, EV.stageFade[i], smooth(seg(t, EV.stages[i], EV.stages[i] + 0.5))); return f; }
  return lerp(1, 0, smooth(seg(t, EV.rewind, DUR - 0.05)));
}
