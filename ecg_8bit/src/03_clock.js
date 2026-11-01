'use strict';
// ============================================================================
// THE CLOCK: 120 BPM, 24 bars of 4/4 = exactly 48.000 s. The heart on screen
// beats at 72 BPM (one beat every 5/3 of a music beat). Micro-scene starts
// follow the brief; key physical events are placed on beats. Also the ECG
// model (Lead II, normal sinus rhythm, illustrative), the real-time beat
// lattice for the monitor, and the slowed single beat's time map.
// ============================================================================
const NBARS = 24, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4;
const lin = x => x;
const bt = n => n * BEAT;                 // time of beat n (0-based)
const barT = b => (b - 1) * BAR;          // start of bar b (1-based)
const SC_T = [0, 1, 2, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29, 32, 35, 38, 40, 43, 48];
const SEQ = { A: [0, 3], B: [3, 12], C: [12, 26], D: [26, 35], E: [35, 43], F: [43, 48] };
const SCENE_NAMES = ['THE HEART MONITOR', 'FOLLOW THE ELECTRODE', 'ENTER THE HEART', 'THE SINOATRIAL NODE', 'PACEMAKER ION CURRENTS',
  'ELECTRICAL ACTIVATION SPREADS', 'THE P WAVE', 'AV NODE DELAY', 'HIS BUNDLE AND BUNDLE BRANCHES', 'PURKINJE FIBERS',
  'VENTRICULAR DEPOLARIZATION', 'THE QRS COMPLEX', 'VENTRICULAR REPOLARIZATION', 'ELECTRICAL FIELDS IN THE BODY', 'ECG ELECTRODES',
  'DIFFERENTIAL VOLTAGE', 'SIGNAL AMPLIFICATION', 'NOISE FILTERING', 'ANALOG TO DIGITAL', 'THE HEART BECOMES A WAVEFORM'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];
// ---------------------------------------------------------------- the ECG (Lead II, normal sinus rhythm; mV against ms after the P onset)
// [centre ms, amplitude mV, width before, width after]: P, Q, R, S, T (the T wave rises slowly and falls faster)
const ECG_W = [[45, 0.15, 20, 20], [168, -0.08, 6, 6], [200, 1.15, 8, 8], [224, -0.28, 7, 9], [395, 0.30, 52, 34]];
function ecgMV(ms) { let v = 0; for (const [c, a, w1, w2] of ECG_W) { const d = ms - c, w = d < 0 ? w1 : w2; if (Math.abs(d) < 5 * w) v += a * Math.exp(-(d * d) / (2 * w * w)); } return v; }
const HR = 72, RR = 60 / HR, R_MS = 200;
// real-time R peaks at n·RR from frame 0 (0, 0.83, 1.67, 2.5 s: the third lands on beat 5, and at 3 s the heart is in
// diastole, ready for the slowed beat); near the end the same lattice shifted by 48 s, so the last beep is the loop point
const R0 = 0;
const rBase = t => t < DUR / 2 ? R0 : R0 + DUR;
// the beat that contains time t (P onset ≤ t): returns ms since that P onset
function beatMs(t) { const p0 = rBase(t) - R_MS / 1000, n = Math.floor((t - p0) / RR); return (t - (p0 + n * RR)) * 1000; }
const ecgLive = t => ecgMV(beatMs(t));
// R-peak times inside [a, b) (for beeps and labels)
function rPeaks(a, b) { const out = []; for (const base of [R0, R0 + DUR]) { const n0 = Math.ceil((a - base) / RR), n1 = Math.floor((b - base) / RR); for (let n = n0; n <= n1; n++) { const tr = base + n * RR; if (tr >= a && tr < b && (base === R0 ? tr < DUR / 2 : tr >= DUR / 2)) out.push(tr); } } return out; }
// ---------------------------------------------------------------- the slowed beat (3–26 s): story time → ms after the P onset
// SA node fires · atria (P) · AV delay · His · bundle branches + Purkinje · ventricles (QRS, R on the drop at 22 s) · ST · T
const PHYS = [[3.0, -60], [6.5, -12], [10.0, 0], [12.0, 90], [15.0, 145], [17.0, 152], [19.0, 162], [22.0, 200], [24.0, 250], [24.4, 320], [26.0, 480], [27.0, 560]];
function physMs(t) { if (t <= PHYS[0][0]) return PHYS[0][1]; for (let i = 0; i + 1 < PHYS.length; i++) { const [ta, ma] = PHYS[i], [tb, mb] = PHYS[i + 1]; if (t <= tb) return lerp(ma, mb, (t - ta) / (tb - ta)); } return PHYS[PHYS.length - 1][1]; }
// conduction milestones (ms) used by the heart map and the labels
const MS = { SA: -12, ATRIA_END: 90, AV_IN: 52, AV_OUT: 145, HIS: 150, BB: 156, PURK: 162, V_END: 232, T_START: 320, T_END: 480 };
