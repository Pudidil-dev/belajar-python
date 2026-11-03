'use strict';
// ============================================================================
// TIME: the 100 BPM grid (25 bars of 4/4 = 60.000 s), the scene table, and the
// EVENT TABLE that the picture and the SFX both read. A sixteenth note is
// 0.15 s = 9 frames, so every event lands exactly on a frame at 60 fps.
// ============================================================================
const NBARS = 25, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4;
const lin = x => x; const barT = b => (b - 1) * BAR;
const SC_T = [0, 1.5, 3, 4.5, 6, 8, 10, 12.5, 15, 17, 20, 22, 24, 26, 28, 31, 34, 37, 39.5, 42, 46, 50, 54, 57, 60];
const SEQ = { A: [0, 6], B: [6, 20], C: [20, 31], D: [31, 42], E: [42, 54], F: [54, 60] };
const SCENE_NAMES = ['THE ANEURYSM', 'THE VASCULAR NETWORK', 'THE BRAIN', 'THE PATIENT', 'THE IV INJECTION', 'INSIDE THE VEIN', 'RIGHT HEART',
  'PULMONARY CIRCULATION', 'LEFT HEART AND AORTA', 'CONTRAST REACHES THE BRAIN', 'RETURN TO THE CT SCANNER', 'X-RAYS CROSS THE HEAD',
  'IODINE INCREASES ATTENUATION', 'DETECTOR MEASUREMENTS', 'MANY ANGLES, ONE DATASET', 'FROM RAW MEASUREMENTS TO AN IMAGE', 'CT SLICES',
  'THE VOLUME', 'VASCULAR RENDERING', 'EXPLORE THE ARTERIES', 'THE ANEURYSM REVEAL', 'DIAGNOSTIC CORRELATION', 'FROM DIGITAL IMAGE TO THE SAME ARTERY',
  'MATCH THE FIRST FRAME'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const range = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(Math.round(x * 1000) / 1000); return o; };
// photons in the attenuation close-up: emitted every sixteenth in two lanes (tissue, iodinated artery); hits 0.45 s later
const PHOTONS = (() => { const o = []; let k = 0; for (let t = 24.3; t <= 25.66; t += 0.15, k++) { const lane = k % 2, tt = Math.round(t * 100) / 100; o.push({ t: tt, lane, hit: Math.round((tt + 0.45) * 100) / 100, absorbed: lane === 1 && k % 6 !== 1 }); } return o; })();
const EV = {
  // A — the hidden aneurysm (the pulse at 0.0 is also where the loop lands)
  pulse0: 0.0, pull: 1.5, brainRev: 3.0, room: 4.5, swing: 5.4,
  // B — intravenous contrast (time-compressed circulation; heartbeats every two beats)
  injector: 6.0, plunger: 6.3, fluid: 6.6, enterVein: 8.1, cells: range(8.4, 9.9, 0.3),
  beat1: 10.8, beat2: 12.0, lungs: 12.6, pvein: 13.8, beat3: 15.6, aortaFlow: 15.75, arterialUp: 17.1, fillMCA: 18.6, confirm: 19.2,
  // C — X-ray attenuation
  motor: 20.4, beamOn: 22.2, photonHits: PHOTONS.filter(p => !p.absorbed).map(p => p.hit), absorbed: PHOTONS.filter(p => p.absorbed).map(p => Math.round((p.t + 0.3) * 100) / 100),
  detPulses: range(26.1, 27.9, 0.3), helix: 28.2,
  // D — digital reconstruction
  recon: [31.2, 31.8, 32.4, 33.0, 33.6], sharpen: 33.0, slices: [34.2, 34.8, 35.4, 36.0, 36.6], volume: 37.2, vascular: 39.6,
  // E — identifying the aneurysm
  workstation: 42.0, discover: 47.4, mpr: 50.4, confirm2: 52.2,
  // F — back to the first frame
  resolve: 54.0, prePulse: 59.4,
};
