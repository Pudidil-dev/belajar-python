'use strict';
// ============================================================================
// TIME: the 120 BPM grid, the scene table, and the EVENT TABLE.
// The event table is the single list of physical events that both the picture
// and the sound read: a gap crossing is drawn on the frame its RF kick is
// heard, a proton stops on the frame its impact starts. Event times sit on the
// eighth-note grid (0.25 s = 15 frames) or, in the fast clusters, on the
// twelfth-second grid (5 frames), so every one is frame-exact at 60 fps.
// ============================================================================
const NBARS = 36, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4;
const lin = x => x; const bt = n => n * BEAT; const barT = b => (b - 1) * BAR;
const SC_T = [0, 1, 2, 4, 6, 8, 10, 12, 14, 17, 20, 23, 25, 28, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 67, 70, 72];
const SEQ = { A: [0, 4], B: [4, 12], C: [12, 25], D: [25, 36], E: [36, 45], F: [45, 60], G: [60, 72] };
const SCENE_NAMES = ['THE GIANT MACHINE', 'REVEAL THE TUMOR', 'PROTONS STOP IN TISSUE', 'BEHIND THE TREATMENT ROOM', 'THE HYDROGEN SOURCE',
  'CREATE THE PROTONS', 'INJECTION INTO VACUUM', 'INSIDE THE CYCLOTRON', 'RF ELECTRIC ACCELERATION', 'MAGNETIC BENDING', 'REPEATED ACCELERATION',
  'BEAM EXTRACTION', 'THE ENERGY DEGRADER', 'THE ENERGY SELECTION SYSTEM', 'QUADRUPOLE FOCUSING', 'DIPOLE STEERING', 'THE ROTATING GANTRY',
  'POSITION VERIFICATION', 'THE TREATMENT NOZZLE', 'PROTONS ENTER TISSUE', 'PROTON–ATOM INTERACTIONS', 'THE PROTON SLOWS DOWN', 'THE BRAGG PEAK',
  'ENERGY CONTROLS DEPTH', 'SELECT A DEPTH LAYER', '3D PENCIL BEAM SCANNING', 'DNA DAMAGE', 'FINAL MACHINE REVEAL'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];
// a list of times from a to b in steps (rounded to the millisecond; steps of 1/12 s use tw())
const range = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(Math.round(x * 1000) / 1000); return o; };
const tw = (s, n0, n1) => { const o = []; for (let n = n0; n <= n1; n++) o.push(s + n / 12); return o; };   // twelfth-second steps (5 frames)
const EV = {
  // A — the hook: the gantry powers up, the body turns see-through, one proton stops in the tumour
  power: 0.25, armed: 0.75,
  reveal: 1.0, target: 1.5, align: 1.75,
  shot: 2.25, skin: 2.5, ticks3: [2.5, ...tw(2, 8, 11)], stop3: 3.0,                  // ticks speed up as the proton slows; it stops on beat 3
  // B — where the protons come from
  back: 4.0, plan: 4.5, cyclo: 5.25,                                                     // pull back through the shielding to the cyclotron
  dive: 6.0, gas: 7.0, atom: 7.5,                                                        // into the ion source: hydrogen gas, one atom
  fast: 8.5, ionize: 9.0, bare: 9.25,                                                    // a fast electron knocks the atom's electron away
  pull: 10.5, inject: [10.75, 11.0, 11.25, 11.5],                                        // the electric field draws protons into the vacuum chamber
  // C — the particle accelerator (RF kicks once per beat while the orbit is small, then faster in the time-lapse)
  cycView: 12.0, magOn: 12.5, rfOn: 13.0, inj: 13.5,
  gaps: [...range(14.0, 19.5, 0.5), 20.0, 20.5, ...range(21.0, 21.75, 0.25), ...tw(22, 0, 11)],
  force: 17.25, noGain: 18.5,
  deflect: 23.5, extract: 24.0,                                                          // the exit sweep lands on the downbeat of bar 13
  // D — controlling the beam
  degrader: 25.5, mat: range(25.5, 27.5, 0.25), slow: 26.5,
  ess: 28.0, fan: 28.5, slits: [29.0, 29.25, 29.5], pass: 29.75,
  quads: [30.5, 31.25, 32.0],
  bend: 33.5, bendOut: 35.0,
  // E — the treatment gantry
  toGantry: 36.0, rotate: 36.75, locked: 38.5,
  xray: [39.5, 40.0], compare: 40.25, shift: 40.75, aligned: 41.25,
  nozzle: 42.0, spots19: range(43.0, 44.75, 0.25),
  // F — the Bragg peak
  enter: range(45.25, 47.75, 0.25),
  ion21: [49.0, 49.75, 50.5],
  ion22: [51.25, 51.75, 52.25, 52.5, 52.75, 53.0, 53.25, 53.5, ...tw(53, 8, 10)],
  stop: 54.0, many: 54.5, curve: 55.0, peak: 55.5,
  graphRot: 57.0, lower: 58.0, higher: 59.0,
  // G — 3D tumour treatment
  model: 60.0, layer: 61.0, energySet: 61.75,
  spotsL1: tw(63, 0, 11), layer2: 64.0, spotsL2: tw(64, 3, 14), layer3: 65.25, spotsL3: tw(65, 6, 11), lapse: 66.0, covered: 66.5,
  dna: 67.0, electron: 67.75, direct: 68.0, radical: 68.25, attack: 68.75, indirect: 69.0, lesion: 69.25,
  final: 70.0, recap: [70.0, 70.25, 70.5, 70.75, 71.0], title: 71.0,
};
