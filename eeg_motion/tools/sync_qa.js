'use strict';
// Sync QA: picture and sound share one clock and one beat grid.   node tools/sync_qa.js
// 1. every event time in the timeline is on the sixteenth-note grid of the score (so every SFX lands on the beat);
// 2. every SFX starts exactly on an event time;
// 3. on the rendered SFX-only stem the measured onset of each percussive cue sits within a few ms of its event,
//    and the picture shows each event on the frame nearest to it (at 60 fps, at most half a frame = 8.3 ms away).
const A = require('../audio/audio.js'), fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'engine', 'film', 'timeline.js'), 'utf8'), ctx);
const { EV, S16 } = ctx.TL, SR = A.SR;
const times = []; const walk = v => { if (typeof v === 'number') times.push(v); else if (Array.isArray(v)) v.forEach(walk); };
for (const v of Object.values(EV)) walk(v);
const off = times.filter(t => Math.abs(t / S16 - Math.round(t / S16)) > 1e-9);
console.log(`event times: ${times.length}, off the sixteenth-note grid: ${off.length}`);
const fr = times.map(t => Math.abs(t * 60 - Math.round(t * 60)) / 60 * 1000), mf = Math.max(...fr);
console.log(`picture: each event is drawn on the nearest frame, at most ${mf.toFixed(2)} ms from the beat (half a frame = 8.33 ms)`);
const sfx = A.sfxEvents(), set = new Set(times.map(t => Math.round(t / S16)));
const loose = sfx.filter(e => !set.has(Math.round(e.t / S16)) || Math.abs(e.t / S16 - Math.round(e.t / S16)) > 1e-9);
console.log(`SFX cues: ${sfx.length}, not starting on an event: ${loose.length}`);
const a = A.renderAudio({ bus: 's' }), n = a.L.length, env = new Float32Array(n);
for (let i = 0; i < n; i++) env[i] = Math.max(Math.abs(a.L[i]), Math.abs(a.R[i]));
const HITS = new Set(['hook', 'tick', 'layer', 'burst', 'release', 'bind', 'ion', 'sync', 'thud', 'measure', 'blip', 'twin', 'enter', 'sample', 'digital', 'record', 'alpha', 'ui', 'dipole', 'arrive', 'pass', 'block']);
const starts = sfx.map(e => e.t).sort((x, y) => x - y), errs = [];
for (const e of sfx) {
  if (!HITS.has(e.k) || starts.some(s => s < e.t - 1e-9 && e.t - s < 0.04)) continue;
  const i0 = Math.round(e.t * SR), pre = Math.round(0.02 * SR), post = Math.round(0.08 * SR);
  let peak = 0; for (let i = i0; i < i0 + post; i++) peak = Math.max(peak, env[i % n]);
  let base = 0; for (let i = i0 - pre; i < i0 - Math.round(0.002 * SR); i++) base = Math.max(base, env[(i + n) % n]);
  const thr = base + 0.25 * (peak - base); let on = -1; for (let i = i0 - pre; i < i0 + post; i++) if (env[(i + n) % n] > thr) { on = i; break; }
  if (on >= 0 && peak > base * 1.5) errs.push({ k: e.k, t: e.t, ms: (on - i0) / SR * 1000 });
}
const abs = errs.map(x => Math.abs(x.ms)).sort((x, y) => x - y), worst = errs.reduce((w, x) => Math.abs(x.ms) > Math.abs(w.ms) ? x : w, errs[0]);
console.log(`measured onsets: ${errs.length} percussive cues, median ${abs[Math.floor(abs.length / 2)].toFixed(2)} ms, max ${abs[abs.length - 1].toFixed(2)} ms (${worst.k} at ${worst.t.toFixed(3)} s)`);
