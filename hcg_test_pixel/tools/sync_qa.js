'use strict';
// Sync QA (numbers, not a listening test): checks that the picture and the SFX share one clock.
//   node tools/sync_qa.js
// 1. Every event time in EV (03_clock.js) sits on the score's grid (eighths = whole frames; the few sixteenths
//    are drawn on the nearest frame, at most half a frame away).
// 2. Every SFX starts exactly on an EV event time.
// 3. On the rendered SFX-only stem, the measured onset of each percussive cue sits within a few ms of its event.
const vm = require('vm');
const { engineSource } = require('./engine');
const ctx = { console, Math, Date, Float32Array, Uint32Array, Uint8Array, Int32Array, Int16Array, Array, Object, Infinity, NaN, isFinite };
vm.createContext(ctx);
const E = vm.runInContext(engineSource(', EV', true), ctx);
const FPS = E.FPS, SR = E.SR;
// 1. event times on the musical grid, and how far the picture's nearest frame is from each
const times = [];
const walk = v => { if (typeof v === 'number') times.push(v); else if (Array.isArray(v)) v.forEach(x => Array.isArray(x) ? walk(x[0]) : walk(x)); };
for (const [k, v] of Object.entries(E.EV)) walk(v);
const on8 = times.filter(t => Math.abs(t * 4 - Math.round(t * 4)) < 1e-6).length, on16 = times.filter(t => Math.abs(t * 8 - Math.round(t * 8)) < 1e-6).length;
const fr = times.map(t => Math.abs(t * FPS - Math.round(t * FPS)) / FPS * 1000);
console.log(`event times: ${times.length}; on the eighth-note grid (0.25 s = 15 frames, frame-exact): ${on8}; on the sixteenth-note grid: ${on16}`);
console.log(`picture: each event is drawn on its frame or the nearest one, at most ${Math.max(...fr).toFixed(2)} ms from the beat (half a frame = 8.33 ms)`);
// 2. every SFX starts exactly on an event time
const sfx = E.sfxEvents(), tset = times.map(t => Math.round(t * 1e6));
const loose = sfx.filter(e => !tset.includes(Math.round(e.t * 1e6)));
console.log(`SFX cues: ${sfx.length}, not starting on an event time: ${loose.length}${loose.length ? ' ' + loose.map(e => e.k + '@' + e.t).join(', ') : ''}`);
// 3. measured onsets on the SFX stem for the percussive cues
const a = E.renderAudio({ bus: 's' }), n = a.L.length, env = new Float32Array(n);
for (let i = 0; i < n; i++) env[i] = Math.max(Math.abs(a.L[i]), Math.abs(a.R[i]));
const HITS = new Set(['plink', 'cut', 'drop', 'layer', 'tick', 'lock', 'bind', 'capture', 'cap', 'link', 'control', 'confirm', 'land', 'step', 'nudge', 'drip', 'caution']);
const starts = sfx.map(e => e.t).sort((x, y) => x - y);
const errs = [];
for (const e of sfx) {
  if (!HITS.has(e.k)) continue;
  if (starts.some(s => s < e.t - 1e-9 && e.t - s < 0.04)) continue;           // another cue just before it would mask the onset
  const i0 = Math.round(e.t * SR), pre = Math.round(0.02 * SR), post = Math.round(0.08 * SR);
  let peak = 0; for (let i = i0; i < i0 + post; i++) peak = Math.max(peak, env[i % n]);
  let base = 0; for (let i = i0 - pre; i < i0 - Math.round(0.002 * SR); i++) base = Math.max(base, env[(i + n) % n]);
  const thr = base + 0.25 * (peak - base);
  let on = -1; for (let i = i0 - pre; i < i0 + post; i++) if (env[(i + n) % n] > thr) { on = i; break; }
  if (on >= 0 && peak > base * 1.5) errs.push({ k: e.k, t: e.t, ms: (on - i0) / SR * 1000 });
}
const abs = errs.map(x => Math.abs(x.ms)).sort((x, y) => x - y), worst = errs.reduce((w, x) => Math.abs(x.ms) > Math.abs(w.ms) ? x : w, errs[0]);
console.log(`measured onsets: ${errs.length} percussive cues, median ${abs[Math.floor(abs.length / 2)].toFixed(2)} ms, max ${abs[abs.length - 1].toFixed(2)} ms (${worst.k} at ${worst.t} s); one frame = ${(1000 / FPS).toFixed(2)} ms`);
