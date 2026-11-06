// ============================================================================
// SIGNALS — an illustrative 8-channel scalp EEG (microvolts) for the monitor and
// the signal chain. Each channel = posterior alpha (about 9.6–10.4 Hz, strongest at
// O1/O2, scaled by the eyes-closed envelope) + its own mixed background (delta,
// theta, beta and a 1/f-like spread), so channels are alike in some regions and
// different in others. Every component completes a whole number of cycles in
// 55 s, so the scrolling trace is one continuous signal across the loop point.
// It is an educational waveform, not patient data.
// ============================================================================
(() => {
  const { DUR, per, alphaEnv } = TL;
  const TAU = Math.PI * 2;
  // channels on the monitor, top to bottom (left hemisphere first): name, alpha weight, beta weight, colour group
  const CHS = [
    { id: 'F3', alpha: 0.12, beta: 1.25, post: 0 }, { id: 'C3', alpha: 0.28, beta: 1.0, post: 0 }, { id: 'P3', alpha: 0.66, beta: 0.7, post: 1 }, { id: 'O1', alpha: 1.0, beta: 0.55, post: 1 },
    { id: 'F4', alpha: 0.12, beta: 1.2, post: 0 }, { id: 'C4', alpha: 0.27, beta: 0.95, post: 0 }, { id: 'P4', alpha: 0.64, beta: 0.7, post: 1 }, { id: 'O2', alpha: 0.95, beta: 0.55, post: 1 },
  ];
  const rnd = U.rng(5150);
  const ALPHA_N = [528, 539, 550, 561, 572];                 // cycles per 55 s: 9.6, 9.8, 10.0, 10.2, 10.4 Hz
  const ALPHA_A = [0.55, 0.85, 1.0, 0.8, 0.5];
  const aPh = ALPHA_N.map(() => rnd() * TAU);
  // background components: integer cycles in 55 s from 1.3 Hz to 28 Hz, amplitude falling with frequency
  const BG_N = [72, 101, 137, 176, 214, 262, 305, 357, 420, 486, 640, 742, 851, 963, 1080, 1210, 1380, 1540];
  const comp = CHS.map((ch, ci) => {
    const r = U.rng(900 + ci * 37);
    const al = ALPHA_N.map((n, k) => aPh[k] + (ch.post ? 0.25 : 1.4) * (r() - 0.5) + (ci >= 4 ? 0.35 : 0));   // posterior channels stay near-coherent
    const bg = BG_N.map(n => { const f = n / DUR, beta = f > 13 ? ch.beta : 1; return { w: TAU * n / DUR, ph: r() * TAU, a: beta * (7.5 / Math.pow(f, 0.62)) * (0.6 + 0.8 * r()) }; });
    return { al, bg };
  });
  const ALPHA_UV = 42;                                         // peak posterior alpha amplitude (µV), eyes closed
  // value of channel ci at film time t (µV)
  function eeg(ci, t) {
    const u = per(t), ch = CHS[ci], c = comp[ci];
    let a = 0; for (let k = 0; k < 5; k++) a += ALPHA_A[k] * Math.sin(TAU * ALPHA_N[k] * u / DUR + c.al[k]);
    let b = 0; for (const g of c.bg) b += g.a * Math.sin(g.w * u + g.ph);
    const E = alphaEnv(u), open = 1 - E;
    return ALPHA_UV * 0.26 * E * ch.alpha * a + b * (0.72 + 0.35 * open * (ch.beta > 0.9 ? 1 : 0.6));
  }
  // the clean posterior alpha alone (for the alpha close-up and the field pulses)
  function alphaOnly(t) { const u = per(t); let a = 0; for (let k = 0; k < 5; k++) a += ALPHA_A[k] * Math.sin(TAU * ALPHA_N[k] * u / DUR + comp[3].al[k]); return a * 0.26; }
  // mains hum (50 Hz) and slow electrode drift for the signal chain (also whole cycles in 55 s)
  const hum = t => Math.sin(TAU * 2750 * per(t) / DUR);
  const drift = t => 0.7 * Math.sin(TAU * 17 * per(t) / DUR + 0.6) + 0.3 * Math.sin(TAU * 29 * per(t) / DUR + 2.1);
  window.SIG = { CHS, eeg, alphaOnly, hum, drift, ALPHA_UV };
})();
