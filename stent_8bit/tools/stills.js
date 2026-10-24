'use strict';
// node tools/stills.js out.png t1 t2 ... [--scale 2] [--cols 4]
// Renders frames at the given times into one contact sheet PNG.
const fs = require('fs');
const { load, toRGB, png, scaleRGB } = require('./engine');
const args = process.argv.slice(2);
const out = args.shift();
let scale = 1, cols = 6;
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scale') scale = +args[++i];
  else if (args[i] === '--cols') cols = +args[++i];
  else times.push(+args[i]);
}
const E = load();
const w = E.W * scale, h = E.H * scale, gap = 4;
const rows = Math.ceil(times.length / cols);
const SW = cols * w + (cols - 1) * gap, SH = rows * h + (rows - 1) * gap;
const sheet = Buffer.alloc(SW * SH * 3, 40);
const t0 = Date.now();
times.forEach((t, k) => {
  E.renderFrame(t);
  let rgb = toRGB(E.getBuf(), E.W, E.H);
  if (scale > 1) rgb = scaleRGB(rgb, E.W, E.H, scale);
  const ox = (k % cols) * (w + gap), oy = Math.floor(k / cols) * (h + gap);
  for (let y = 0; y < h; y++) rgb.copy(sheet, ((oy + y) * SW + ox) * 3, y * w * 3, (y + 1) * w * 3);
});
fs.writeFileSync(out, png(sheet, SW, SH));
console.log(`wrote ${out} (${times.length} frames, ${((Date.now() - t0) / times.length).toFixed(1)} ms/frame)`);
