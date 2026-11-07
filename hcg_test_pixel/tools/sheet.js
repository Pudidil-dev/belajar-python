'use strict';
// Sprite and palette sheet + keyframe board (documentation images, drawn by the film's own code).
//   node tools/sheet.js            → docs/sprite_sheet.png, docs/keyframes.png
const fs = require('fs'), path = require('path'), vm = require('vm');
const { engineSource, toRGB, png, scaleRGB, load } = require('./engine');
const DOCS = path.join(__dirname, '..', 'docs'); fs.mkdirSync(DOCS, { recursive: true });
const ctx = { console, Math, Date, Float32Array, Uint32Array, Uint8Array, Int32Array, Int16Array, Array, Object, Infinity, NaN, isFinite };
vm.createContext(ctx);
const X = ', drawDevice, drawHCG, drawAb, drawGold, drawConj, drawParticleInset, Cam, text, textW, FS, FC, P, PAL_HEX, rect, frame, clear, withCanvas, RAMP, OPEN_STATE, wetInit, mFill, maskRR';
const E = vm.runInContext(engineSource(X, false), ctx);
E.init && E.init(); E.wetInit();
const SW = 360, SH = 300;
const out = E.withCanvas(SW, SH, () => {
  const { P } = E;
  E.clear(P.BG);
  E.text(E.FC, 'Palette', 8, 6, { sc: 1, c: P.INK, ol: null });
  const sw = [['navy', 'BG'], ['ivory', 'IV1'], ['teal', 'TE1'], ['membrane', 'GR1'], ['liquid', 'LB2'], ['hCG', 'MG1'], ['detect. Ab', 'CY1'],
    ['test Ab', 'MI1'], ['control Ab', 'VI1'], ['gold', 'RU1'], ['amber edge', 'AM1'], ['line', 'RL2']];
  sw.forEach(([name, key], i) => {
    const x = 8 + (i % 4) * 88, y = 20 + Math.floor(i / 4) * 20;
    E.rect(x, y, x + 12, y + 12, P[key]); E.frame(x - 1, y - 1, x + 13, y + 13, P.N4);
    E.text(E.FS, name, x + 17, y + 1, { sc: 1, c: P.INK, ol: null }); E.text(E.FS, E.PAL_HEX[key].toLowerCase(), x + 17, y + 8, { sc: 1, c: P.SUB, ol: null });
  });
  E.text(E.FC, 'Sprites (drawn in code)', 8, 88, { sc: 1, c: P.INK, ol: null });
  const lab = (s, x, y) => E.text(E.FS, s, Math.round(x - E.textW(E.FS, s, 1) / 2), y, { sc: 1, c: P.SUB, ol: null });
  E.drawDevice(new E.Cam(0, 0, 0.5, 34, 190), E.OPEN_STATE); lab('cassette', 34, 258);
  E.drawHCG(new E.Cam(0, 0, 4, 84, 170), 0, 0, 0, { sites: true }); lab('hCG', 84, 258);
  E.drawAb(new E.Cam(0, 0, 4, 128, 196), 0, 0, 0, E.RAMP.cy); lab('detect. Ab', 128, 258);
  E.drawAb(new E.Cam(0, 0, 4, 172, 196), 0, 0, 0, E.RAMP.mi); lab('test Ab', 172, 258);
  E.drawAb(new E.Cam(0, 0, 4, 216, 196), 0, 0, 0, E.RAMP.vi); lab('control Ab', 216, 258);
  E.drawGold(new E.Cam(0, 0, 3.2, 262, 170), 0, 0); lab('gold label', 262, 258);
  E.drawConj(new E.Cam(0, 0, 2.0, 318, 170), 0, 0, 0.2); lab('conjugate', 318, 258);
  E.text(E.FS, 'schematic symbols, not protein structures', 8, 282, { sc: 1, c: P.SUB, ol: null });
});
const rgb = toRGB(out, SW, SH);
fs.writeFileSync(path.join(DOCS, 'sprite_sheet.png'), png(scaleRGB(rgb, SW, SH, 3), SW * 3, SH * 3));
// keyframe board: one frame per scene (native 180x320, shown 2x)
const F = load(), times = [2.2, 6.4, 9.6, 14.5, 18.8, 22.6, 26.8, 30.6, 34.9, 39.2, 42.8, 46.9, 50.9, 55.0, 58.6, 63.4, 66.5, 71.0];
const cols = 6, k = 2, w = F.W * k, h = F.H * k, gap = 6, BW = cols * w + (cols - 1) * gap, BH = 3 * h + 2 * gap;
const board = Buffer.alloc(BW * BH * 3, 24);
times.forEach((t, i) => {
  F.renderFrame(t); const fr = scaleRGB(toRGB(F.getBuf(), F.W, F.H), F.W, F.H, k);
  const ox = (i % cols) * (w + gap), oy = Math.floor(i / cols) * (h + gap);
  for (let y = 0; y < h; y++) fr.copy(board, ((oy + y) * BW + ox) * 3, y * w * 3, (y + 1) * w * 3);
});
fs.writeFileSync(path.join(DOCS, 'keyframes.png'), png(board, BW, BH));
console.log('wrote docs/sprite_sheet.png and docs/keyframes.png');
