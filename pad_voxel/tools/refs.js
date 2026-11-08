'use strict';
// Reference images for docs/ (drawn by the film's own engine, so they match it exactly):
//   docs/patient_reference.png   the one patient: front, right side, holding the calf, supine on the CT table
//   docs/anatomy_reference.png   normal arterial anatomy, pelvis to feet, and the below-knee branching
//   docs/lesion_map.png          this patient's fixed lesion map + where each lesion appears
//   docs/storyboard.png          one frame per scene (21), labeled version
//   docs/final_still_labeled.png and docs/final_still_clean.png   the last frame at 1080x1920
//   node tools/refs.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { engineFiles, SRC, toRGB, png, scaleRGB } = require('./engine');
const DOCS = path.join(__dirname, '..', 'docs'); fs.mkdirSync(DOCS, { recursive: true });
let code = '(function(Math, Float32Array, Uint32Array, Uint8Array){\n';
for (const f of engineFiles(false)) code += fs.readFileSync(path.join(SRC, f), 'utf8') + '\n';
code += fs.readFileSync(path.join(__dirname, 'refs_draw.js'), 'utf8');
code += `
function storyFrame(t, i) {             // a frame with its scene tag drawn in big letters along the bottom
  renderFrame(t);
  const s = 'S' + String(i + 1).padStart(2, '0') + '  ' + SCENE_NAMES[i], tw = textW(FC, s, 3);
  rect(0, H - 64, W, H, P.BOX); rect(0, H - 64, W, H - 61, i === 20 ? P.WARN : P.ACC);
  text(FC, s, Math.max(10, (W - tw) / 2), H - 46, { sc: 3, c: P.INK, ol: null });
}
return { renderFrame, renderPair, setUI: v => { UI_ON = !!v; }, getBuf: () => buf, W, H, DUR, refPatient, refAnatomy, refLesions, refLegend, storyFrame, init: engineInit };
})(Math, Float32Array, Uint32Array, Uint8Array)`;
const ctx = { console, Math, Date, Float32Array, Uint32Array, Uint8Array, Int32Array, Int16Array, Array, Object, Infinity, NaN, isFinite };
vm.createContext(ctx);
const E = vm.runInContext(code, ctx, { filename: 'refs.js' }); E.init();
const grab = (k) => { const rgb = toRGB(E.getBuf(), E.W, E.H); return k > 1 ? scaleRGB(rgb, E.W, E.H, k) : rgb; };
const half = rgb => { const w = E.W / 2, h = E.H / 2, o = Buffer.alloc(w * h * 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) s += rgb[((2 * y + j) * E.W + 2 * x + i) * 3 + c]; o[(y * w + x) * 3 + c] = Math.round(s / 4); } return o; };
function sheet(panels, w, h, cols, gap, file) {
  const rows = Math.ceil(panels.length / cols), SW = cols * w + (cols - 1) * gap, SH = rows * h + (rows - 1) * gap, out = Buffer.alloc(SW * SH * 3, 24);
  panels.forEach((rgb, k) => { const ox = (k % cols) * (w + gap), oy = Math.floor(k / cols) * (h + gap); for (let y = 0; y < h; y++) rgb.copy(out, ((oy + y) * SW + ox) * 3, y * w * 3, (y + 1) * w * 3); });
  fs.writeFileSync(path.join(DOCS, file), png(out, SW, SH)); console.log(`wrote docs/${file} (${SW}x${SH})`);
}
const P1 = ['front', 'side', 'hold', 'supine'].map(v => { E.refPatient(v); return grab(1); });
sheet(P1, E.W, E.H, 4, 8, 'patient_reference.png');
const A = ['whole', 'knee'].map(v => { E.refAnatomy(v); return grab(2); });
sheet(A, E.W * 2, E.H * 2, 2, 16, 'anatomy_reference.png');
E.refLesions(); const l1 = grab(2); E.refLegend(); const l2 = grab(2);
sheet([l1, l2], E.W * 2, E.H * 2, 2, 16, 'lesion_map.png');
const T = [1.6, 5.4, 7.4, 10.6, 14.0, 16.8, 20.0, 23.2, 25.8, 29.2, 32.4, 35.0, 37.8, 40.4, 43.6, 46.2, 49.8, 53.0, 56.2, 59.0, 62.6];
const S = T.map((t, i) => { E.storyFrame(t, i); return half(toRGB(E.getBuf(), E.W, E.H)); });
sheet(S, E.W / 2, E.H / 2, 7, 8, 'storyboard.png');
const last = 62.95, clean = E.renderPair(last);
fs.writeFileSync(path.join(DOCS, 'final_still_labeled.png'), png(scaleRGB(toRGB(E.getBuf(), E.W, E.H), E.W, E.H, 2), E.W * 2, E.H * 2));
fs.writeFileSync(path.join(DOCS, 'final_still_clean.png'), png(scaleRGB(toRGB(clean, E.W, E.H), E.W, E.H, 2), E.W * 2, E.H * 2));
console.log('wrote docs/final_still_labeled.png, docs/final_still_clean.png (1080x1920)');
