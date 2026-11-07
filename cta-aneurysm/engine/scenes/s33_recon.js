// S33 RECONSTRUCTION (128–132 s): filtered backprojection, computed from S32's sinogram. One row is smeared back across the
// empty grid along the direction it was measured from; then more directions add up — 2, 4, 8 … 360 views — the streaks
// cancel and a cross-section of attenuation resolves: skull, brain, and the bright, contrast-filled arteries. An explanatory
// picture of the method, not a vendor's algorithm.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const GX = W / 2, GY = 360, S0 = 1.3;
const STEPS = [[0.9, 2], [1.2, 4], [1.5, 8], [1.8, 16], [2.1, 32], [2.4, 64], [2.7, 128], [3.0, 360]];
const nAt = t => { let n = 1; for (const [tt, k] of STEPS) if (t >= tt) n = k; return n; };
window.S33 = { GX, GY, S0 };
SC['s33_recon'] = {
  draw(c, t, S) {
    const half = CT.FOV / 2 * S0;
    PIX.rect(c, Math.round(GX - half) - 2, Math.round(GY - half) - 2, Math.round(2 * half) + 4, Math.round(2 * half) + 4, 'n2');
    PIX.rect(c, Math.round(GX - half), Math.round(GY - half), Math.round(2 * half), Math.round(2 * half), 'n0');
    if (t < 0.9) {
      const sw = MO.cubicOut(clamp((t - 0.15) / 0.6)), img = CT.smear(40, true), beta = 40 / CT.NA * TAU, dirY = Math.cos(beta);
      CT.drawSlice(c, img, GX, GY, S0, { L: 300, W: 2600, mask: i => { const r = Math.floor(i / CT.N) / CT.N; return (dirY >= 0 ? r : 1 - r) <= sw; } });
    } else {
      const n = nAt(t), img = CT.partial(n), sharp = n >= 360, Wd = sharp ? WS.W : lerp(1800, 800, clamp(Math.log2(n) / 7)), L = sharp ? WS.L : 60;
      CT.drawSlice(c, img, GX, GY, S0, { L, W: Wd });
      const st = STEPS.find(s => s[1] === n); if (st && t - st[0] < 0.08) K.dith(c, GX - half, GY - half, 2 * half, 2 * half, 'b4', 0.15);
    }
    // the view counter as a row of ticks (no digits): one lit tick per doubling
    const k = STEPS.filter(s => t >= s[0]).length;
    for (let i = 0; i < STEPS.length; i++) PIX.rect(c, GX - 64 + i * 16, GY + half + 14, 10, 4, i < k ? (i === STEPS.length - 1 && k === STEPS.length ? 'e2' : 'b3') : 'n3');
    CAP.ctx(c, t, { text: 'REKONSTRUKSİYA', t0: 0.35, t1: 3.6 });
  },
  cues: () => { const q = [[0.15, 'smear', 0.8, 0, 0.7], [0.35, 'type', 0.4]]; STEPS.forEach(([tt, n], k) => q.push([tt, n >= 360 ? 'recon_complete' : 'assemble_hit', n >= 360 ? 1 : 0.5 + 0.05 * k, k % 2 ? 0.25 : -0.25, k])); return q; },
};
})();
