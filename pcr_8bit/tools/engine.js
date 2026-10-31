'use strict';
// Loads the browser engine sources into a Node VM context (no DOM needed),
// so stills, contact sheets and the MP4 export use exactly the player code.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const SRC = path.join(__dirname, '..', 'src');
function engineFiles(withAudio) {
  return fs.readdirSync(SRC).filter(f => (withAudio ? /^[0-3]\d_.*\.js$/ : /^[0-2]\d_.*\.js$/).test(f)).sort();
}
// all engine files wrapped in one closure (fast locals; same wrapper as index.html)
function engineSource(extraExports, withAudio) {
  let code = '(function(Math, Float32Array, Uint32Array, Uint8Array){\n';
  for (const f of engineFiles(withAudio)) code += fs.readFileSync(path.join(SRC, f), 'utf8') + '\n';
  code += '\nreturn { renderFrame, getBuf: () => buf, W, H, FPS, DUR, NF, init: engineInit' + (withAudio ? ', renderAudio, musicEvents, sfxEvents, SR' : '') + (extraExports || '') + ' };\n})(Math, Float32Array, Uint32Array, Uint8Array)';
  return code;
}
function load(o) {
  o = o || {};
  const ctx = { console, Math, Date, Float32Array, Uint32Array, Uint8Array, Int32Array, Int16Array, Array, Object, Infinity, NaN, isFinite };
  vm.createContext(ctx);
  const E = vm.runInContext(engineSource('', o.audio), ctx, { filename: 'engine.js' });
  if (E.init) E.init();
  return E;
}
// RGBA (Uint32 little-endian ABGR) -> RGB bytes
function toRGB(u32, w, h) {
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { const v = u32[i]; out[3 * i] = v & 255; out[3 * i + 1] = (v >>> 8) & 255; out[3 * i + 2] = (v >>> 16) & 255; }
  return out;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
function scaleRGB(rgb, w, h, k) {
  const out = Buffer.alloc(w * k * h * k * 3);
  for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) {
    const s = ((Math.floor(y / k) * w) + Math.floor(x / k)) * 3, d = (y * w * k + x) * 3;
    out[d] = rgb[s]; out[d + 1] = rgb[s + 1]; out[d + 2] = rgb[s + 2];
  }
  return out;
}
module.exports = { load, toRGB, png, scaleRGB, engineFiles, engineSource, SRC };
