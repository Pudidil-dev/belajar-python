// HUD — the small X-ray spectrum readout (scenes 6–9): photon energy (0–80 keV) across, intensity up.
// Bremsstrahlung fills a continuous ramp (Kramers: intensity ∝ 80 keV − E); characteristic K lines of tungsten stand
// out as sharp spikes at 59 and 67 keV; the aluminium filter strips the low-energy end. Single photons drop in as blocks.
(() => {
const HUD = window.HUD = {};
const clamp = U.clamp;
const E0 = 80, BW = 2;                                  // keV range, keV per bin
const NB = E0 / BW;
HUD.W = 112; HUD.H = 64;
const T_AL = (E, f) => f <= 0 ? 1 : Math.exp(-Math.pow(17 / Math.max(1, E), 3) * f);   // Al filter transmission (∝ E⁻³)
// st = {f: continuum fill 0..1, events: [[keV, tAdded]], t, kpk: 0..1, filt: 0..1, a: alpha}
HUD.spec = (c, x, y, st) => {
  const a = st.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x - 1, y - 1, HUD.W + 2, HUD.H + 2, 'd3'); PIX.rect(c, x, y, HUD.W, HUD.H, 'k');
  PIX.text(c, 'X-RAY ENERGIES', x + 4, y + 3, 'd8', { shadow: null });
  const bx = x + 6, by = y + 50, pw = 100, ph = 26, bw = pw / NB;
  // continuum
  for (let b = 0; b < NB; b++) {
    const E = (b + 0.5) * BW, I = (E0 - E) / E0, T = T_AL(E, st.filt || 0);
    const hh = Math.round(ph * (st.f || 0) * I * T);
    if (hh > 0) { PIX.rect(c, Math.round(bx + b * bw), by - hh, Math.ceil(bw), hh, 'p1'); PIX.rect(c, Math.round(bx + b * bw), by - hh, Math.ceil(bw), 1, 'p2'); }
  }
  // single photons as blocks stacked in their bins
  const stack = new Array(NB).fill(0);
  for (const [E, ta] of st.events || []) {
    if (st.t < ta) continue;
    const b = Math.min(NB - 1, Math.floor(E / BW)), age = st.t - ta, drop = age < 0.18 ? (1 - age / 0.18) * 14 : 0;
    const base = Math.round(ph * (st.f || 0) * ((E0 - (b + 0.5) * BW) / E0) * T_AL(E, st.filt || 0));
    const yy = by - base - (stack[b] + 1) * 3 - drop;
    PIX.rect(c, Math.round(bx + b * bw) - 1, Math.round(yy), Math.ceil(bw) + 1, 3, age < 0.35 ? 'p3' : 'p2');
    stack[b]++;
  }
  // characteristic lines (fixed energies)
  if ((st.kpk || 0) > 0) {
    for (const [E, k, lab] of [[59, 1, 'Kα'], [67, 0.55, 'Kβ']]) {
      const b = Math.floor(E / BW), base = Math.round(ph * (st.f || 0) * ((E0 - (b + 0.5) * BW) / E0) * T_AL(E, st.filt || 0)), hh = Math.round(ph * 0.72 * k * st.kpk);
      PIX.rect(c, Math.round(bx + b * bw), by - base - hh, Math.ceil(bw), hh, 'p3');
      if (st.kpk > 0.6) PIX.text(c, lab, Math.round(bx + b * bw) + (lab === 'Kα' ? -11 : 4), by - base - hh - 2, 'p3', { shadow: null });
    }
  }
  PIX.rect(c, bx, by, pw, 1, 'd5');
  PIX.text(c, '0', bx, by + 3, 'd7', { shadow: null }); PIX.text(c, '80 keV', bx + pw, by + 3, 'd7', { shadow: null, align: 'right' });
  c.restore();
};
})();
