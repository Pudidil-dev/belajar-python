// BRAIN — the faint brain silhouette behind the artery network: interior points of the cranial cavity on a 3.5 mm grid,
// projected with the vessels' view and splatted into a mask each frame; drawn as a dark rose fill with a 1-px rim and a
// slow dithered shading (top lighter), so it reads as "inside the head" without competing with the arteries.
(() => {
const { W, H } = PIX;
const BRAIN = window.BRAIN = { NAME: 'BRAIN' };
let PTS = null, MASK = null;
BRAIN.init = () => {
  const pts = [], st = 3.5;
  for (let z = -46; z <= 84; z += st) for (let y = -92; y <= 84; y += st) for (let x = -66; x <= 66; x += st) {
    if (HEAD.cavitySD(x, y, z) < -1.5) pts.push([x, y, z]);
  }
  PTS = pts; MASK = new Float32Array(W * H);
};
const hex = h => PIX.hex(PIX.P[h]);
BRAIN.backdrop = (c, v, o = {}) => {
  if (!PTS || (o.a ?? 1) <= 0) return;
  MASK.fill(-1e9);
  const view = VES.view(v), r = Math.max(1, 2.6 * v.s), r2 = r * r;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (const [x, y, z] of PTS) {
    const [X, Y, D] = view(x - (v.ox || 0), y - (v.oy || 0), z - (v.oz || 0)), sx = v.cx + v.s * X, sy = v.cy - v.s * Y;
    const a0 = Math.max(0, Math.floor(sx - r)), a1 = Math.min(W - 1, Math.ceil(sx + r)), b0 = Math.max(0, Math.floor(sy - r)), b1 = Math.min(H - 1, Math.ceil(sy + r));
    for (let yy = b0; yy <= b1; yy++) for (let xx = a0; xx <= a1; xx++) { const dx = xx - sx, dy = yy - sy; if (dx * dx + dy * dy <= r2) { const p = yy * W + xx; if (Y > MASK[p]) MASK[p] = Y; } }
    if (a0 < x0) x0 = a0; if (a1 > x1) x1 = a1; if (b0 < y0) y0 = b0; if (b1 > y1) y1 = b1;
  }
  const img = c.getImageData(0, 0, W, H), d = img.data, A = o.a ?? 1;
  const fillC = [hex('n1'), hex('n2')], rimC = hex('n3'), fisC = hex('k');
  // the interhemispheric fissure: the projected midline (x = 0) over the top of the brain, as a dark 1-px seam
  const fis = new Set();
  for (let k = 0; k <= 160; k++) {
    const an = Math.PI * k / 160, y = 72 * Math.cos(an) - 4, z = 16 + 66 * Math.sin(an);
    if (HEAD.cavitySD(0, y, z) > -1) continue;
    for (let dz = 0; dz < 1; dz++) { const [X, Y] = view(0 - (v.ox || 0), y - (v.oy || 0), z - 3 - (v.oz || 0)); fis.add(Math.round(v.cy - v.s * Y) * W + Math.round(v.cx + v.s * X)); }
  }
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const p = yy * W + xx; if (MASK[p] < -1e8) continue;
    const b = K.BAY(xx, yy); if (A < 1 && b > A) continue;
    const edge = MASK[p - 1] < -1e8 || MASK[p + 1] < -1e8 || MASK[p - W] < -1e8 || MASK[p + W] < -1e8;
    const lv = U.clamp((MASK[p] + 40) / 120);
    const col = edge ? rimC : fis.has(p) ? fisC : fillC[lv > b * 0.8 + 0.15 ? 1 : 0];
    const i = p * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
};
})();
