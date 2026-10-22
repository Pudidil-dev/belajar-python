// Quick look at the procedural brain without the browser: builds the volume under node, renders a few 3D views and
// MRI slices through PIX's palette quantizer, and writes one contact sheet (PNG via python3 + Pillow).
//   node tools/anat_preview.mjs build/anat.png [vs]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../engine/lib');
globalThis.window = globalThis;
for (const f of ['util.js', 'motion.js', 'pix.js', 'anat.js', 'vol.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const out = process.argv[2] || 'build/anat.png', vs = +(process.argv[3] || 1.25);
const t0 = Date.now();
VOL.init(vs);
console.log(`volume ${VOL.G.nx}×${VOL.G.ny}×${VOL.G.nz} @ ${vs} mm, ${VOL.S.n} surface voxels, built in ${Date.now() - t0} ms`);

const W = 270, H = 480;
const frame = () => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { d[i * 4] = 5; d[i * 4 + 1] = 8; d[i * 4 + 2] = 15; d[i * 4 + 3] = 255; } return { width: W, height: H, data: d }; };
const ctxOf = img => ({ getImageData: () => img, putImageData: () => {} });
const tiles = [];
const views = [['3/4 front-left', -0.75, 0.32], ['left', Math.PI / 2, 0.12], ['right', -Math.PI / 2, 0.12], ['top', 0, 1.45], ['back', Math.PI, 0.25], ['below', 0.4, -0.9]];
for (const [name, yaw, pitch] of views) {
  const img = frame(), t = Date.now();
  VOL.render(img, { cx: 135, cy: 240, s: 1.25, yaw, pitch });
  console.log(`${name}: ${Date.now() - t} ms`);
  PIX.quantize(ctxOf(img)); tiles.push([name, img]);
}
// cut through the left hemisphere at x = 2.5 seen from the left
{ const img = frame(); VOL.render(img, { cx: 135, cy: 240, s: 1.25, yaw: Math.PI / 2, pitch: 0.05, clip: { n: [1, 0, 0], d: 2.5 }, cut: true }); PIX.quantize(ctxOf(img)); tiles.push(['cut x=2.5', img]); }
// slices
const sliceTile = (name, im, w, h) => {
  const img = frame(), ox = Math.round((W - w) / 2), oy = Math.round((H - h) / 2);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const v = im[r * w + c]; if (v < 0) continue; const g = Math.round(255 * v), i = ((oy + r) * W + ox + c) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; }
  PIX.quantize(ctxOf(img)); tiles.push([name, img]);
};
for (const z of [38, 16, 2, -24, -44]) { const t = Date.now(); sliceTile(`axial z=${z}`, VOL.axial(z, 170, 200, 200, 235), 170, 200); if (z === 16) console.log(`axial slice: ${Date.now() - t} ms`); }
sliceTile('sagittal x=2.5', VOL.sagittal(2.5, 240, 240, 240, 240), 240, 240);
sliceTile('sagittal x=30', VOL.sagittal(30, 240, 240, 240, 240), 240, 240);
sliceTile('coronal y=-8', VOL.coronal(-8, 220, 220, 220, 220), 220, 220);

const raw = path.join(path.dirname(out), 'anat_tiles.raw');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(raw, Buffer.concat(tiles.map(([, img]) => Buffer.from(img.data.buffer))));
fs.writeFileSync(raw + '.json', JSON.stringify(tiles.map(([n]) => n)));
execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw
names = json.load(open(sys.argv[1] + '.json')); data = open(sys.argv[1], 'rb').read(); W, H = 270, 480
cols = 7; rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W * 2 + 6), rows * (H * 2 + 20)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
for k, n in enumerate(names):
    im = Image.frombytes('RGBA', (W, H), data[k * W * H * 4:(k + 1) * W * H * 4]).convert('RGB').resize((W * 2, H * 2), Image.NEAREST)
    x, y = (k % cols) * (W * 2 + 6), (k // cols) * (H * 2 + 20); sheet.paste(im, (x, y + 16)); d.text((x + 4, y + 2), n, fill=(255, 255, 255))
sheet.save(sys.argv[2]); print('sheet ->', sys.argv[2], sheet.size)
`, raw, out], { stdio: 'inherit' });
fs.unlinkSync(raw); fs.unlinkSync(raw + '.json');
