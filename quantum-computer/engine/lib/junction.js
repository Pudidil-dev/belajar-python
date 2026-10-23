// JN — the Josephson junction's physics, used by S04 and S05.
// (1) A Cooper-pair wave packet meeting the AlOx barrier: the 1D time-dependent Schrödinger equation, solved once at
//     start-up with the split-step Fourier method (ħ = m = 1, lengths in screen px). The barrier is 25 % higher than
//     the packet's mean energy, so classically nothing could cross; the amplitude decays inside the barrier and about
//     a fifth of the probability comes out the other side. Everything drawn — stripes, brightness, the two percentages —
//     is read from this solution.
// (2) The junction's energy U(φ) = −EJ cos φ against an ordinary (linear) inductor's parabola, and the energy levels
//     of a transmon in that cosine well (unequally spaced: E01 ≈ 5.0 GHz, E12 ≈ 4.7 GHz).
(() => {
const JN = window.JN = {};
const N = 1024, HALF = 512;
const D = 15, K0 = 2 * Math.PI / 40, SIG = 50, Y0 = -235, V = 80, FPS = 60, DUR = 5.6, SUB = 4;
const YA = -262, YB = 252, NS = YB - YA + 1;                 // stored range of y (px from the barrier centre)
Object.assign(JN, { D, K0, SIG, Y0, V, DUR, YA, YB });
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let q = re[i]; re[i] = re[j]; re[j] = q; q = im[i]; im[i] = im[j]; im[j] = q; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), hl = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < hl; j++) {
        const a = i + j, b = a + hl, vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
JN.frames = null;
JN.init = () => {
  if (JN.frames) return;
  const re = new Float64Array(N), im = new Float64Array(N), E = K0 * K0 / 2, V0 = 1.25 * E;
  const TU = V / K0, dt = TU / (FPS * SUB);                      // time units per film second; time step
  const pr = new Float64Array(N), pi = new Float64Array(N), kr = new Float64Array(N), ki = new Float64Array(N), ab = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const y = i - HALF, v = Math.abs(y) <= D / 2 ? V0 : 0;
    pr[i] = Math.cos(-v * dt / 2); pi[i] = Math.sin(-v * dt / 2);
    const k = 2 * Math.PI * (i < N / 2 ? i : i - N) / N; kr[i] = Math.cos(-k * k / 2 * dt); ki[i] = Math.sin(-k * k / 2 * dt);
    const e = Math.min(i, N - 1 - i); ab[i] = e < 90 ? Math.pow(Math.sin(Math.PI / 2 * e / 90), 0.25) : 1;   // soak up what leaves
  }
  let n2 = 0;
  for (let i = 0; i < N; i++) { const y = i - HALF, env = Math.exp(-((y - Y0) ** 2) / (4 * SIG * SIG)); re[i] = env * Math.cos(K0 * y); im[i] = env * Math.sin(K0 * y); n2 += env * env; }
  const nn = 1 / Math.sqrt(n2); for (let i = 0; i < N; i++) { re[i] *= nn; im[i] *= nn; }
  const mul = (a, b, cr, ci) => { for (let i = 0; i < N; i++) { const x = a[i] * cr[i] - b[i] * ci[i]; b[i] = a[i] * ci[i] + b[i] * cr[i]; a[i] = x; } };
  const F = Math.ceil(DUR * FPS) + 1, frames = [];
  JN.peak = 1 / (SIG * Math.sqrt(2 * Math.PI));
  for (let f = 0; f < F; f++) {
    const fr = new Float32Array(NS), fi = new Float32Array(NS);
    let R = 0, T = 0;
    for (let s = 0; s < NS; s++) { const i = HALF + YA + s; fr[s] = re[i]; fi[s] = im[i]; }
    for (let i = 0; i < N; i++) { const p = re[i] * re[i] + im[i] * im[i], y = i - HALF; if (y < -D / 2) R += p; else if (y > D / 2) T += p; }
    frames.push({ re: fr, im: fi, R, T });
    for (let k = 0; k < SUB; k++) { mul(re, im, pr, pi); fft(re, im, false); mul(re, im, kr, ki); fft(re, im, true); mul(re, im, pr, pi); for (let i = 0; i < N; i++) { re[i] *= ab[i]; im[i] *= ab[i]; } }
  }
  JN.frames = frames;
};
// state at simulation time s (film seconds since launch): {re, im, R, T}, linearly blended between stored frames
JN.at = s => {
  const F = JN.frames, x = Math.max(0, Math.min(F.length - 1.001, s * FPS)), i = Math.floor(x), u = x - i, a = F[i], b = F[i + 1];
  if (u < 1e-6) return a;
  const re = new Float32Array(NS), im = new Float32Array(NS);
  for (let k = 0; k < NS; k++) { re[k] = a.re[k] + (b.re[k] - a.re[k]) * u; im[k] = a.im[k] + (b.im[k] - a.im[k]) * u; }
  return { re, im, R: a.R + (b.R - a.R) * u, T: a.T + (b.T - a.T) * u };
};
JN.sample = (st, y) => { const s = Math.round(y) - YA; if (s < 0 || s >= NS) return [0, 0]; return [st.re[s], st.im[s]]; };
// ---------- energy: U(φ) in units of EJ, and transmon levels (fraction of the well depth 2 EJ above its bottom) ----------
JN.U = phi => -Math.cos(phi);
JN.Ul = phi => -1 + phi * phi / 2;
// transmon levels for EJ/EC = 30 (E12/E01 ≈ 0.93, so 5.0 → 4.7 GHz): E_n ≈ −EJ + √(8 EJ EC)(n + ½) − EC/12 (6n² + 6n + 3), in units of EJ
const EC = 1 / 30, WP = Math.sqrt(8 * EC);
JN.level = n => -1 + WP * (n + 0.5) - EC / 12 * (6 * n * n + 6 * n + 3);
JN.GHZ = n => 5.0 * (JN.level(n + 1) - JN.level(n)) / (JN.level(1) - JN.level(0));   // spacing scaled so E01 = 5.0 GHz
})();
