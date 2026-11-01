'use strict';
// ============================================================================
// THE CLOCK: 118.15 BPM (32 bars of 4/4 = exactly 65.000 s), played half-time
// as a lo-fi groove. Micro-scene starts follow the brief; key physical events
// inside them are placed on beats. Also: the example values shown on screen
// (illustrative, not a patient's results), the impedance pulse model and the
// size-histogram model.
// ============================================================================
const NBARS = 32, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4;
const lin = x => x;
const bt = n => n * BEAT;                 // time of beat n (0-based)
const barT = b => (b - 1) * BAR;          // start of bar b (1-based)
// the 27 micro-scenes (start times) and the 7 continuous sequences
const SC_T = [0, 0.8, 1.8, 3, 5, 7.5, 9, 11, 13, 15, 18, 21, 23, 25, 27, 29, 32, 34, 36, 38, 41, 45, 48, 51, 54, 56, 60, 65];
const SEQ = { A: [0, 3], B: [3, 11], C: [11, 27], D: [27, 32], E: [32, 45], F: [45, 56], G: [56, 65] };
const SCENE_NAMES = ['BLOOD ENTERS THE MACHINE', 'MILLIONS OF CELLS', 'ONE CELL, ONE SIGNAL', 'FOLLOW THE BLOOD SAMPLE', 'INSIDE WHOLE BLOOD',
  'CONTROLLED DILUTION', 'THREE MEASUREMENT PATHWAYS', 'THE CONDUCTIVE LIQUID', 'THE MICROSCOPIC APERTURE', 'BEFORE THE CELL PASSES',
  'THE CELL CHANGES RESISTANCE', 'ONE ELECTRICAL PULSE', 'CELL SIZE CHANGES PULSE HEIGHT', 'COUNTING MANY CELLS', 'RELEASE THE HEMOGLOBIN',
  'LIGHT MEASURES HEMOGLOBIN', 'WHITE BLOOD CELL CHANNEL', 'REMOVE RBC INTERFERENCE', 'FLUORESCENT STAINING', 'HYDRODYNAMIC FOCUSING',
  'THE LASER HITS THE CELL', 'THREE OPTICAL MEASUREMENTS', 'PHOTONS BECOME ELECTRICAL SIGNALS', 'BUILDING THE SCATTERGRAM',
  'COMPLETING THE WBC DIFFERENTIAL', 'DIGITAL COMPLETE BLOOD COUNT', 'FINAL PAYOFF AND LOOP'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];                   // micro-scene start (0-based index)
// ---------------------------------------------------------------- example values (illustrative)
const EX = { rbc: '4.80', wbc: '7.20', plt: '250', hgb: '14.2', diff: [['NEUT', 58.0], ['LYMPH', 30.0], ['MONO', 7.0], ['EO', 4.0], ['BASO', 1.0]] };
// ---------------------------------------------------------------- impedance model
// sensing-zone response: 0 outside, rising as the particle enters, flat inside, falling as it leaves
// x: particle centre relative to the aperture centre (world units), hw: aperture half-length, r: particle radius
function senseK(x, hw, r) { const d = Math.abs(x); if (d >= hw + r) return 0; if (d <= hw - r) return 1; const u = (hw + r - d) / (2 * r); return u * u * (3 - 2 * u); }
// pulse height is proportional to particle volume (relative units: red cell 1.0, platelet ~0.12, drawn x1.6 for visibility)
const VOL = { rbc: 1.0, plt: 0.2 };
// size histogram model (volumes in fL): platelets ~ 2-20 fL, red cells ~ 60-120 fL
function sizeSample(i) { const isP = hash(i * 13 + 5) < 0.45; const g = (hash(i * 7 + 1) + hash(i * 7 + 2) + hash(i * 7 + 3) - 1.5) * 1.15; return isP ? { k: 'plt', v: Math.max(2, 9 + g * 4) } : { k: 'rbc', v: 90 + g * 13 }; }
