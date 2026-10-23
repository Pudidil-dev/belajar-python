// Quick previews of the head model under node (no browser): axial / sagittal / coronal HU slices and depth-shaded bone
// views from the front, the side and above. Writes one PNG sheet.  node tools/head_preview.mjs out.png
import fs from 'fs'; import zlib from 'zlib'; import path from 'path'; import url from 'url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
globalThis.window = globalThis;
eval(fs.readFileSync(path.join(here, '../engine/lib/head.js'), 'utf8'));
const H = globalThis.HEAD;
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const S = 1.0;                                     // mm per pixel
const tiles = [];
const win = (hu, L, W) => Math.max(0, Math.min(255, Math.round((hu - (L - W / 2)) / W * 255)));
function slice(fn, w, h, L = 40, W = 120) { const im = Buffer.alloc(w * h * 3); for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const v = fn(c, r); const g = Array.isArray(v) ? v : [win(v, L, W), win(v, L, W), win(v, L, W)]; im.set(g, (r * w + c) * 3); } return { w, h, im }; }
const args = process.argv.slice(3);
const mode = args[0] || 'all';
const zs = [60, 40, 18, 0, -12, -25, -38, -50, -62, -75, -85, -95, -110, -125];
if (mode === 'all' || mode === 'axial') for (const z of zs) {
  tiles.push(slice((c, r) => H.hu(-(c - 90) * S, -(r - 110) * S, z), 180, 230, 40, 100));
  tiles.push(slice((c, r) => H.hu(-(c - 90) * S, -(r - 110) * S, z), 180, 230, 500, 2000));
}
if (mode === 'all' || mode === 'sag') {
  tiles.push(slice((c, r) => H.hu(0.5, (c - 115) * S, (100 - r) * S), 240, 320, 40, 100));
  tiles.push(slice((c, r) => H.hu(33, (c - 115) * S, (100 - r) * S), 240, 320, 40, 100));
  tiles.push(slice((c, r) => H.hu(-(c - 90) * S, 70, (100 - r) * S), 180, 320, 40, 100));
  tiles.push(slice((c, r) => H.hu(-(c - 90) * S, 0, (100 - r) * S), 180, 320, 40, 100));
}
// depth-shaded bone views: march along a direction until bone; shade by depth and a finite-difference normal
function view(dir, w, h, map) {
  return slice((c, r) => {
    const [ox, oy, oz, dx, dy, dz] = map(c, r);
    let t = 0, hit = -1;
    for (; t < 260; t += 0.8) if (H.skullSD(ox + dx * t, oy + dy * t, oz + dz * t) < 0) { hit = t; break; }
    if (hit < 0) return [20, 24, 40];
    const x = ox + dx * hit, y = oy + dy * hit, z = oz + dz * hit, e = 0.8;
    const gx = H.skullSD(x + e, y, z) - H.skullSD(x - e, y, z), gy = H.skullSD(x, y + e, z) - H.skullSD(x, y - e, z), gz = H.skullSD(x, y, z + e) - H.skullSD(x, y, z - e);
    const L = Math.hypot(gx, gy, gz) || 1, lam = Math.max(0, (-gx * 0.4 + gy * -dy * 0.7 + gz * 0.6 + gy * 0.1) / L);
    const v = Math.round(60 + 190 * Math.max(0, Math.min(1, 0.25 + 0.75 * lam - hit / 900)));
    return [v, Math.round(v * 0.95), Math.round(v * 0.85)];
  }, w, h);
}
if (mode === 'all' || mode === 'bone') {
  tiles.push(view('front', 180, 290, (c, r) => [-(c - 90), 160, 100 - r, 0, -1, 0]));
  tiles.push(view('left', 240, 290, (c, r) => [170, (c - 120) * -1 + 0, 100 - r, -1, 0, 0]));
  const a = 0.55;   // front-left oblique
  tiles.push(view('obl', 220, 290, (c, r) => { const u = c - 110, ca = Math.cos(a), sa = Math.sin(a); return [-u * ca + 170 * sa, 170 * ca + u * sa, 100 - r, -sa, -ca, 0]; }));
  tiles.push(view('top', 180, 240, (c, r) => [-(c - 90), 120 - r, 160, 0, 0, -1]));
}
// sheet
const cols = Math.min(6, tiles.length), pad = 4;
const tw = Math.max(...tiles.map(t => t.w)), th = Math.max(...tiles.map(t => t.h)), rows = Math.ceil(tiles.length / cols);
const W = cols * (tw + pad), Hh = rows * (th + pad), out = Buffer.alloc(W * Hh * 3, 50);
tiles.forEach((t, k) => { const x0 = (k % cols) * (tw + pad), y0 = Math.floor(k / cols) * (th + pad);
  for (let r = 0; r < t.h; r++) t.im.copy(out, ((y0 + r) * W + x0) * 3, r * t.w * 3, (r + 1) * t.w * 3); });
fs.writeFileSync(process.argv[2], png(W, Hh, out)); console.log('->', process.argv[2], W, Hh);
