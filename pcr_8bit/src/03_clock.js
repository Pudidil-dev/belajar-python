'use strict';
// ============================================================================
// THE CLOCK: 120 BPM in 4/4 (beat 0.5 s, bar 2 s); 65 bars = 130.000 s.
// The brief's scene starts already sit on beats of this grid, so they are kept
// exactly. Also here: the amplification model that drives every curve on
// screen, and the example thermal program (typical probe one-step RT-qPCR).
// ============================================================================
const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, E8 = BEAT / 2, S16 = BEAT / 4, NBARS = 65;
const lin = x => x;
const bt = n => n * BEAT;                 // time of beat n (0-based)
const barT = b => (b - 1) * BAR;          // start of bar b (1-based)
const SC_T = [0, 4, 8, 13, 19, 24, 29, 34, 39, 44, 51, 56, 61, 67, 73, 81, 88, 93, 98, 103, 108, 113, 117, 121, 125, 130];
const SCENE_NAMES = ['THE INVISIBLE DETECTOR', 'CLINICAL SAMPLE', 'INSIDE THE VIRUS', 'VIRAL LYSIS', 'RNA PURIFICATION',
  'REACTION MIXTURE', 'INSIDE THE PCR MACHINE', 'PELTIER TEMPERATURE CONTROL', 'THE TEMPERATURE PROGRAM', 'REVERSE TRANSCRIPTION',
  'PREPARING THE DNA TEMPLATE', 'DNA DENATURATION', 'PRIMERS RECOGNIZE THE TARGET', 'FLUORESCENT PROBE BINDING', 'DNA POLYMERASE IN ACTION',
  'PROBE CLEAVAGE', 'FLUORESCENCE PHYSICS', 'INSIDE THE OPTICAL SYSTEM', 'PHOTODIODE TO ELECTRICITY', 'AMPLIFICATION REPEATS',
  'FLUORESCENCE INCREASES', 'DIGITAL FLUORESCENCE DATA', 'THE AMPLIFICATION CURVE', 'RESULT VALIDATION', 'COMPLETE SCIENTIFIC RECAP'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const T = i => SC_T[i];                   // scene start (0-based index)

// ---------------------------------------------------------------- amplification model
// Fluorescence (RFU) per cycle: a flat baseline, an exponential phase and a plateau
// (logistic). The threshold sits above the baseline noise inside the exponential
// phase; the cycle where the curve crosses it is the Cq.
const AMP = { base: 120, fmax: 3400, k: 1.45, thr: 330, cycles: 40 };
AMP.c50 = 26.4 + AMP.k * Math.log(AMP.fmax / AMP.thr - 1);     // places the crossing at Cq 26.4
const CQ = AMP.c50 - AMP.k * Math.log(AMP.fmax / AMP.thr - 1);
function ampF(c) { return AMP.base + AMP.fmax / (1 + Math.exp(-(c - AMP.c50) / AMP.k)); }
function ampRead(c) { return ampF(c) + (hash(Math.round(c) * 7 + 3) - 0.5) * 16; }   // one reading per cycle, with read noise
// the positive control (a known target) and the internal process control (another channel)
function ampPos(c) { return AMP.base + 3100 / (1 + Math.exp(-(c - 27.6) / 1.4)); }
function ampIC(c) { return AMP.base * 0.9 + 2300 / (1 + Math.exp(-(c - 31.2) / 1.5)); }

// ---------------------------------------------------------------- example thermal program
// NEB Luna one-step probe protocol type: RT 55 °C, initial denaturation 95 °C,
// then 40-45 cycles of 95 °C / 60 °C with a fluorescence read at 60 °C.
const PROG = { rt: 55, den: 95, ann: 60 };
// hook: the curve on the monitor runs from cycle 20 to cycle ~30 in 0.8 s and crosses the threshold on beat 1
const hookCycle = t => 20 + 12.8 * t;
