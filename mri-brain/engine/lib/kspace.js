// KSP — k-space for real: the 2D Fourier transform of an axial slice of the film's head (128 × 128, 1.56 mm pixels).
// What the scanner records, line by line (one phase-encoding line per repetition), is this frequency-domain grid; the
// inverse FFT turns it back into the image. Partial reconstructions (only the k-space inside a radius) show the image
// as a sum of waves: low frequencies give the blurry shape, high frequencies the edges.
(() => {
const KSP = window.KSP = {};
const N = KSP.N = 128, FOV = 200;
// in-place radix-2 complex FFT of length n (re, im Float64Array), inverse if inv
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, inv) {
  const r = new Float64Array(N), i_ = new Float64Array(N);
  for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { r[x] = re[y * N + x]; i_[x] = im[y * N + x]; } fft(r, i_, inv); for (let x = 0; x < N; x++) { re[y * N + x] = r[x]; im[y * N + x] = i_[x]; } }
  for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; i_[y] = im[y * N + x]; } fft(r, i_, inv); for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = i_[y]; } }
}
// k-space of the axial slice at z (centred: index (N/2, N/2) is k = 0)
const CACHE = new Map();
KSP.slice = z => {
  if (CACHE.has(z)) return CACHE.get(z);
  const img = VOL.axial(z, N, N, FOV, FOV), re = new Float64Array(N * N), im = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) re[i] = Math.max(0, img[i]);
  fft2(re, im, false);
  const kr = new Float64Array(N * N), ki = new Float64Array(N * N);              // shift so k = 0 sits in the centre
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const s = ((y + N / 2) % N) * N + ((x + N / 2) % N); kr[y * N + x] = re[s]; ki[y * N + x] = im[s]; }
  let mx = 0; const lg = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { lg[i] = Math.log(1 + Math.hypot(kr[i], ki[i])); if (lg[i] > mx) mx = lg[i]; }
  for (let i = 0; i < N * N; i++) lg[i] /= mx;
  const o = { z, img, kr, ki, lg }; CACHE.set(z, o); return o;
};
// image from the k-space inside radius R (in k-space pixels; R ≥ 91 = all) and rows < rows; magnitude, 0..1
KSP.recon = (K, R = 1e9, rows = N) => {
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  for (let y = 0; y < Math.min(rows, N); y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - N / 2, y - N / 2), wgt = Math.min(1, Math.max(0, R - r + 1)); if (wgt <= 0) continue;
    const d = ((y + N / 2) % N) * N + ((x + N / 2) % N); re[d] = K.kr[y * N + x] * wgt; im[d] = K.ki[y * N + x] * wgt;
  }
  fft2(re, im, true);
  const out = new Float32Array(N * N); for (let i = 0; i < N * N; i++) out[i] = Math.min(1, Math.hypot(re[i], im[i]));
  return out;
};
// canvases
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
KSP.grayCanvas = (arr, gain = 1, gamma = 1, rows = N) => {
  const c = cv(N, N), x = c.getContext('2d'), d = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const yy = Math.floor(i / N); const g = yy < rows ? Math.round(255 * Math.min(1, Math.pow(Math.max(0, arr[i]) * gain, gamma))) : 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = g; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0); return c;
};
// a single wave (the basis image of one k-space point), for the "sum of waves" panel
KSP.wave = (kx, ky, n = 40) => {
  const c = cv(n, n), x = c.getContext('2d'), d = x.createImageData(n, n);
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) { const v = 0.5 + 0.5 * Math.cos(2 * Math.PI * (kx * xx + ky * yy) / n), i = (yy * n + xx) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.round(255 * v); d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return c;
};
})();
