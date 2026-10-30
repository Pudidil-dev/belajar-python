'use strict';
// ============================================================================
// STORY CLOCK. 33 bars = 62.000 s exactly (127.74 BPM: beat = 31/66 s).
// Scene starts sit on beats. The heart beats every two beats (63.9 per
// minute, shown as PR 64), so the artery, the light dips, the waveform peaks
// and the device beep all land on the music.
// ============================================================================
const BEAT = 31 / 66, E8 = BEAT / 2, BAR = 4 * BEAT, S16 = BEAT / 4;
const barT = n => (n - 1) * BAR, bt = n => n * BEAT;
const SC_B = [0, 4, 8, 12, 16, 20, 28, 32, 38, 44, 52, 58, 64, 70, 76, 82, 88, 96, 102, 107, 112, 120, 124, 128, 132];
const SC_T = SC_B.map(bt);
function lin(x) { return x; }
function sceneIndex(t) { for (let i = 1; i < SC_T.length; i++) if (t < SC_T[i]) return i - 1; return SC_T.length - 2; }
const SCENE_NAMES = ['FINGER CLIP', 'RESULT APPEARS', 'ZOOM INTO THE FINGER', 'RED AND INFRARED LEDS', 'LIGHT ENTERS TISSUE',
  'ARTERIAL PULSE', 'WHAT IS IN BLOOD', 'OXYHEMOGLOBIN VS DEOXYHEMOGLOBIN', 'DIFFERENT LIGHT ABSORPTION', 'PULSE CHANGES LIGHT TRANSMISSION',
  'PHOTODIODE REVEAL', 'LIGHT BECOMES ELECTRICITY', 'RAW SIGNAL', 'AC AND DC COMPONENTS', 'RED SIGNAL VS INFRARED SIGNAL',
  'RATIO OF RATIOS', 'INTERNAL PROCESSING', 'ESTIMATING SpO2', 'PULSE RATE BONUS', 'FINAL DISPLAY', 'RECAP',
  'WHAT IT REALLY MEASURES', 'LIMITATIONS', 'LOOP ENDING'];
// ---------------------------------------------------------------- the pulse model (one source for every pulse on screen)
const HB = 2 * BEAT;                              // heartbeat period, 0.939 s
const PR_BPM = Math.round(60 / HB);               // 64
// arterial blood volume after a heartbeat (phase in s): systolic upstroke, dicrotic notch, run-off
function plethShape(ph) {
  const g1 = Math.exp(-((ph - 0.17) ** 2) / (2 * 0.06 * 0.06)), g2 = 0.42 * Math.exp(-((ph - 0.42) ** 2) / (2 * 0.13 * 0.13));
  return (g1 + g2) / 1.066;
}
const beatPhase = t => ((t % HB) + HB) % HB;
function pleth(t) { const p = beatPhase(t); return plethShape(p) + plethShape(p + HB); }   // 0..1, periodic in the loop
// light modulation (real depths; the screen exaggerates them and says so)
const M_IR = 0.020, M_RED = 0.0096;               // AC/DC of each channel at SpO2 98 %
const R_RATIO = M_RED / M_IR;                     // 0.48
const SPO2 = Math.round(110 - 25 * R_RATIO);      // 98 (the common empirical line, simplified)
// transmitted light (relative): DC x (1 - m x volume)
const transIR = (t, ex) => 1 - M_IR * (ex || 1) * pleth(t);
const transRed = (t, ex) => 1 - M_RED * (ex || 1) * pleth(t);
// LED time slots: red, infrared, dark (ambient) — shown slowed down
function ledSlot(t, rate) { const k = Math.floor(t * (rate || 6)) % 3; return k === 0 ? 'red' : k === 1 ? 'ir' : 'off'; }
