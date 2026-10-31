'use strict';
// Motion / palette QA: node tools/qa_motion.js [fps]
// Reports still windows (< 0.3 % pixels changing for >= 0.5 s), hard jumps (> 55 %),
// blue-purple frames (> 30 % of the area) and mean motion per second.
const path = require('path');
const { load } = require('./engine');
const fps = +(process.argv[2] || 30), E = load(), N = E.W * E.H;
let prev = null; const rows = [], t0 = Date.now();
for (let f = 0; f < E.DUR * fps; f++) {
  const t = f / fps; E.renderFrame(t); const b = E.getBuf(); let ch = 0, bp = 0;
  for (let i = 0; i < N; i++) {
    const v = b[i]; if (prev && v !== prev[i]) ch++;
    const r = v & 255, g = (v >>> 8) & 255, bl = (v >>> 16) & 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    if (mx > 0 && (mx - mn) / mx >= 0.3) { let h; const d = mx - mn || 1; if (mx === r) h = 60 * (((g - bl) / d) % 6); else if (mx === g) h = 60 * ((bl - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; if (h >= 225 && h <= 300) bp++; }
  }
  rows.push({ t, motion: prev ? ch / N : 1, bp: bp / N }); prev = Uint32Array.from(b);
}
let run = 0, start = 0; const statics = [];
rows.forEach(r => { if (r.motion < 0.003) { if (!run) start = r.t; run++; } else { if (run >= fps * 0.5) statics.push([start.toFixed(2), (run / fps).toFixed(2)]); run = 0; } });
if (run >= fps * 0.5) statics.push([start.toFixed(2), (run / fps).toFixed(2)]);
console.log('frames', rows.length, 'ms/frame', ((Date.now() - t0) / rows.length).toFixed(1));
console.log('still windows (start s, length s):', JSON.stringify(statics));
console.log('hard jumps (>55% pixels changed):', rows.filter(r => r.motion > 0.55 && r.t > 0).map(r => r.t.toFixed(2) + ':' + (r.motion * 100).toFixed(0) + '%').join(' '));
console.log('blue-purple frames (>30% area):', (rows.filter(r => r.bp > 0.3).length / rows.length * 100).toFixed(1) + '%');
const per = []; for (let s = 0; s < E.DUR; s++) { const w = rows.filter(r => r.t >= s && r.t < s + 1); per.push((w.reduce((a, r) => a + r.motion, 0) / w.length * 100).toFixed(1)); }
console.log('mean motion % per second:', per.join(' '));
