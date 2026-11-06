'use strict';
// Sync QA (numbers, not a listening test): checks that the picture and the SFX share one clock.
//   node tools/sync_qa.js
// 1. Every event time in EV (03_clock.js) is an exact frame at 60 fps (so a drawn event lands on one frame).
// 2. Every SFX starts at an EV event time (or one frame after it, for a reaction that follows its event).
// 3. On the rendered SFX-only stem, the measured onset of each percussive cue sits within a few ms of its event.
const vm = require('vm');
const { engineSource } = require('./engine');
const ctx = { console, Math, Date, Float32Array, Uint32Array, Uint8Array, Int32Array, Int16Array, Array, Object, Infinity, NaN, isFinite };
vm.createContext(ctx);
const E = vm.runInContext(engineSource(', EV', true), ctx);
const FPS = E.FPS, SR = E.SR;
// 1. event times on the frame grid
const times = [];
const walk = v => { if (typeof v === 'number') times.push(v); else if (Array.isArray(v)) v.forEach(x => Array.isArray(x) ? walk(x[0]) : walk(x)); };
for (const [k, v] of Object.entries(E.EV)) walk(v);
const offGrid = times.filter(t => Math.abs(t * FPS - Math.round(t * FPS)) > 1e-6);
console.log(`event times: ${times.length}, off the 60 fps frame grid: ${offGrid.length}${offGrid.length ? ' ' + offGrid.join(', ') : ''}`);
const onEighth = times.filter(t => Math.abs(t * 4 - Math.round(t * 4)) < 1e-6).length;
console.log(`on the eighth-note grid (0.25 s): ${onEighth} of ${times.length}`);
// 2. every SFX start is an event time (or one frame after)
const sfx = E.sfxEvents(), set = new Set(times.map(t => Math.round(t * FPS)));
const loose = sfx.filter(e => { const f = e.t * FPS; return Math.abs(f - Math.round(f)) > 1e-6 || !(set.has(Math.round(f)) || set.has(Math.round(f) - 1)); });
console.log(`SFX cues: ${sfx.length}, starting off an event frame: ${loose.length}${loose.length ? ' ' + loose.map(e => e.k + '@' + e.t).join(', ') : ''}`);
// 3. measured onsets on the SFX stem for the percussive cues
const a = E.renderAudio({ bus: 's' }), n = a.L.length, env = new Float32Array(n);
for (let i = 0; i < n; i++) env[i] = Math.max(Math.abs(a.L[i]), Math.abs(a.R[i]));
const HITS = new Set(['lowpulse', 'click', 'dock', 'attack', 'bond', 'pop', 'snip', 'blocked', 'lock', 'ringopen', 'polymer', 'tear', 'heart', 'slice', 'splash', 'fit', 'swallow']);
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
