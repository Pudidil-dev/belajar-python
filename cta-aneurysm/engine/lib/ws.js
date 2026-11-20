// WS — the radiologist's workstation (S34–S40, S43): images computed from the model in the arterial phase (HEAD.enh = 1)
// and the viewer's chrome. Multiplanar sections through the aneurysm (axial, coronal, sagittal, 1 mm), a thick-slab axial
// maximum-intensity projection over the circle of Willis, and the stack of thin axial slices for the volume of S35.
// Radiological conventions: axial and coronal show the patient's right on the image's left; the sagittal shows anterior
// on the left; superior and anterior up. A CTA window (W 700, L 160) shows enhanced lumen bright, brain grey, bone white.
(() => {
const { W, H, P } = PIX;
const WS = window.WS = { NAME: 'WS' };
const clamp = U.clamp, lerp = U.lerp;
WS.L = 160; WS.W = 700;
const N = WS.N = 180, FOV = 180;                         // MPR: 180 × 180 at 1 mm
WS.MIPN = 200;
WS.init = () => {
  const AN = VES.AN.c, t0 = performance.now();
  WS.P0 = AN.slice();
  const ax = new Float32Array(N * N), co = new Float32Array(N * N), sa = new Float32Array(N * N);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const u = (c + 0.5 - N / 2), v = (N / 2 - r - 0.5);
    ax[r * N + c] = HEAD.hu(AN[0] + u, AN[1] + v, AN[2] + v * CT.TILT);   // axial (tilted like the CT slice): u = x, v = y
    co[r * N + c] = HEAD.hu(AN[0] + u, AN[1], AN[2] + v);                 // coronal: u = x, v = z
    sa[r * N + c] = HEAD.hu(AN[0], AN[1] - u, AN[2] + v);                 // sagittal: u = −y (anterior on the left), v = z
  }
  WS.AX = ax; WS.CO = co; WS.SA = sa;
  // MIP: a 16 mm slab round the (tilted) slice through the circle of Willis, 200 × 200 at 1 mm centred at (−2, 4)
  const M = WS.MIPN, mip = new Float32Array(M * M), cx = -2, cy = 4;
  WS.MIPC = [cx, cy];
  for (let r = 0; r < M; r++) for (let c = 0; c < M; c++) {
    let mx = -1000; const x = cx + (c + 0.5 - M / 2), y = cy + (M / 2 - r - 0.5);
    const zc = CT.zAt(y); for (let dz = -6; dz <= 6; dz += 1) { const v = HEAD.hu(x, y, zc + dz); if (v > mx) mx = v; }
    mip[r * M + c] = mx;
  }
  WS.MIP = mip;
  // the stack for S35: 12 axial slices, z = −21 … 1 mm (2 mm apart), 120 × 120 at 1.4 mm centred at (−4, 6)
  const SN = WS.SN = 120, sp = 1.4, sl = [];
  WS.SZ = []; for (let k = 0; k < 12; k++) WS.SZ.push(-11 + 2 * k);          // offsets of the tilted slices from CT.zAt (mm)
  for (const dz of WS.SZ) { const a = new Float32Array(SN * SN); for (let r = 0; r < SN; r++) for (let c = 0; c < SN; c++) { const y = 6 + (SN / 2 - r - 0.5) * sp; a[r * SN + c] = HEAD.hu(-4 + (c + 0.5 - SN / 2) * sp, y, CT.zAt(y) + dz); } sl.push(a); }
  WS.STACK = sl; WS.SSP = sp; WS.SC = [-4, 6];
  console.log(`WS images ${Math.round(performance.now() - t0)} ms`);
};
// head point → pixel of an MPR image (0..N) for plane 'ax' | 'co' | 'sa'
WS.toImg = (plane, x, y, z) => {
  const A = WS.P0;
  if (plane === 'ax') return [x - A[0] + N / 2, N / 2 - (y - A[1])];
  if (plane === 'co') return [x - A[0] + N / 2, N / 2 - (z - A[2])];
  return [-(y - A[1]) + N / 2, N / 2 - (z - A[2])];
};
WS.mipToImg = (x, y) => [x - WS.MIPC[0] + WS.MIPN / 2, WS.MIPN / 2 - (y - WS.MIPC[1])];
// draw an n × n HU image into a screen rectangle, zoomed by z about image point (u0, v0) (defaults: centre)
WS.image = (c, img, n, x, y, w, h, o = {}) => {
  const z = o.z || 1, u0 = o.u0 ?? n / 2, v0 = o.v0 ?? n / 2, k = Math.min(w, h) / n * z;
  const L = o.L ?? WS.L, Wd = o.W ?? WS.W, lo = L - Wd / 2;
  const M = [k, 0, 0, k, x + w / 2 - u0 * k, y + h / 2 - v0 * k];
  CT.blit(c, n, n, { M, val: i => (img[i] - lo) / Wd, clip: [x, y, x + w, y + h], nearest: o.nearest ?? false, alpha: o.alpha });
  return { k, map: (u, v) => [M[4] + u * k, M[5] + v * k] };
};
// panel chrome: a navy frame, a corner tag, and the viewer's small orientation letters
WS.frame = (c, x, y, w, h, tag, a = 1, hi = false) => {
  c.save(); c.globalAlpha *= a;
  PIX.rect(c, x - 2, y - 2, w + 4, 1, hi ? 'c2' : 'n3'); PIX.rect(c, x - 2, y + h + 1, w + 4, 1, hi ? 'c2' : 'n3'); PIX.rect(c, x - 2, y - 2, 1, h + 4, hi ? 'c2' : 'n3'); PIX.rect(c, x + w + 1, y - 2, 1, h + 4, hi ? 'c2' : 'n3');
  if (tag) { PIX.rect(c, x, y, PIX.textWidth(tag) + 6, 11, 'n1'); PIX.text(c, tag, x + 3, y + 2, 'g8', { shadow: null }); }
  c.restore();
};
// a mouse cursor (arrow) at screen (x, y)
WS.cursor = (c, x, y, col = 'w') => {
  const X = Math.round(x), Y = Math.round(y), rows = ['#', '##', '#.#', '#..#', '#...#', '#....#', '#.....#', '#..####', '#.#', '##', '#'];
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r[i] === '#') PIX.rect(c, X + i, Y + j, 1, 1, 'k'); else PIX.rect(c, X + i, Y + j, 1, 1, col); } });
};
// crosshair lines through (x, y) inside a rectangle, with a gap at the centre
WS.cross = (c, x, y, x0, y0, w, h, col = 'c3') => {
  for (let X = x0; X < x0 + w; X += 2) if (Math.abs(X - x) > 6) PIX.rect(c, X, Math.round(y), 1, 1, col);
  for (let Y = y0; Y < y0 + h; Y += 2) if (Math.abs(Y - y) > 6) PIX.rect(c, Math.round(x), Y, 1, 1, col);
};
})();
