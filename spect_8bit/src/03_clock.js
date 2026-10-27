'use strict';
// ============================================================================
// STORY CLOCK. 36 bars = 68.000 s exactly (127.06 BPM: beat = 17/36 s), played
// as a half-time lo-fi groove. Scene starts sit on the 8th-note grid.
// ============================================================================
const BEAT = 17 / 36, E8 = BEAT / 2, BAR = 4 * BEAT, S16 = BEAT / 4;
const barT = n => (n - 1) * BAR, e8 = n => n * E8, bt = n => n * BEAT;
const SC_T = [0, 8, 17, 25, 34, 47, 55, 68, 76, 85, 97, 106, 119, 127, 136, 144, 152, 165, 174, 186, 195, 203, 216, 229, 246, 263, 275, 288].map(e8);
function lin(x) { return x; }
function sceneIndex(t) { for (let i = 1; i < SC_T.length; i++) if (t < SC_T[i]) return i - 1; return SC_T.length - 2; }
const SCENE_NAMES = ['THE INVISIBLE SOURCE', 'RADIATION BECOMES DATA', 'THE RADIOACTIVE TRACER', 'BLOOD CIRCULATION', 'MYOCARDIAL UPTAKE',
  'INSIDE TECHNETIUM-99m', 'NUCLEAR GAMMA EMISSION', 'PHOTON PROPAGATION', 'TISSUE ATTENUATION', 'LEAD COLLIMATOR STRUCTURE',
  'DIRECTIONAL FILTERING', 'GAMMA INTERACTION IN THE CRYSTAL', 'ENERGY DEPOSITION', 'SCINTILLATION LIGHT', 'LIGHT GUIDE AND PMT ARRAY',
  'PHOTOELECTRIC EFFECT', 'ELECTRON MULTIPLICATION', 'ELECTRICAL PULSE', 'EVENT POSITION AND ENERGY', 'ENERGY-WINDOW FILTER',
  'RECORDING ONE EVENT', 'BUILDING A 2D PROJECTION', 'DETECTOR ROTATION', 'MULTIPLE ANGULAR PROJECTIONS', 'TOMOGRAPHIC RECONSTRUCTION',
  'THE MEDICAL IMAGE', 'COMPLETE MECHANISM RECAP'];
// detector-head angles (rad from straight up toward the patient's left), 90 deg apart (cardiac L-mode)
function roomRot(t) {
  let a = -0.79 + 0.035 * Math.sin(TAU * t / DUR);                  // a slow sweep, periodic in the loop
  return [a, a + Math.PI / 2];
}
