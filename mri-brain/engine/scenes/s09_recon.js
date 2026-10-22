// S09 IMAGE RECONSTRUCTION (49–58 s): the numbers from the ADC land in k-space, one line per repetition of the pulse
// sequence (a real acquisition repeats it hundreds of times; this is compressed). The grid is the actual 2D Fourier
// transform of the slice encoded in S07. Then the inverse FFT: the image is rebuilt as a sum of waves, low spatial
// frequencies first (the blurry shape), high ones last (the edges) — computed for real every frame. Then the rest of
// the series, slice after slice, into a viewer grid of 18 axial slices.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const N = KSP.N, K0 = 11;                                                     // the slice of S07 (z = 13 mm)
const ORDER = [9, 13, 7, 15, 5, 17, 3, 1, 0, 2, 4, 6, 8, 10, 12, 14, 16];
const T_FILL0 = 0.6, T_FILL1 = 2.9, T_IF0 = 3.3, T_IF1 = 5.5, T_SER0 = 5.9, T_SER1 = 8.6;
const appear = j => T_SER0 + (T_SER1 - T_SER0) * Math.pow(j / ORDER.length, 0.8);
// the viewer grid: 3 columns × 6 rows, inferior to superior in reading order
const GS = 0.32;
const cell = k => [52 + 83 * (k % 3), 102 + 64 * Math.floor(k / 3)];
const gridPose = k => { const [x, y] = cell(k); return { M: STACK.MON_M, s: GS, x, y, d: k }; };
window.S09 = { gridPose, cell, GS };
let KS = null, KC = null;
const kspaces = () => {
  if (KS) return KS; KS = {}; KC = {};
  for (let k = 0; k < STACK.N; k++) { KS[k] = KSP.slice(STACK.zk(k)); KC[k] = KSP.grayCanvas(KS[k].lg, 1.0, 1.6); }
  return KS;
};
// the k-space panel, filled up to row L, with the current line lit
function kpanel(c, x, y, sc, L, t) {
  const KQ = kspaces()[K0];
  const cvK = KSP.grayCanvas(KQ.lg, 1.0, 1.6, L);
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(cvK, x, y, N * sc, N * sc); c.restore();
  PIX.rect(c, x - 1, y - 1, N * sc + 2, 1, 'c2'); PIX.rect(c, x - 1, y + N * sc, N * sc + 2, 1, 'c2'); PIX.rect(c, x - 1, y, 1, N * sc, 'c2'); PIX.rect(c, x + N * sc, y, 1, N * sc, 'c2');
  if (L > 0 && L < N) { const yy = Math.round(y + L * sc); PIX.rect(c, x, yy, N * sc, 1, 'c4'); for (let k = 0; k < 6; k++) PIX.rect(c, x - 10 - k * 6, yy - 1 + (k % 2), 3, 3, 'e2'); }
}
SC['s09_recon'] = {
  init() { kspaces(); for (let k = 0; k < STACK.N; k++) STACK.tex(k, 'head'); },
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const KQ = kspaces()[K0];
    // the data stream arriving from the ADC (top) and filling k-space
    if (t < T_FILL1 + 0.2) {
      for (let col = 0; col < 5; col++) for (let k = 0; k < 6; k++) {
        const yy = K.wrap(t * 140 + k * 22 + col * 9, 132) - 40, xx = 22 + col * 9;
        if (yy > 64 && yy < 76 + N) PIX.text(c, (k + col) % 2 ? '1' : '0', xx, yy, 'e2', { shadow: null });
      }
    }
    const L = Math.floor(N * clamp((t - T_FILL0) / (T_FILL1 - T_FILL0)));
    const shrink = sm(clamp((t - T_FILL1) / 0.4));
    const kx = lerp(71, 12, shrink), ky = lerp(84, 66, shrink), ksc = lerp(1, 0.5, shrink);
    if (t < T_SER0) {
      kpanel(c, kx, ky, ksc, L, t);
      if (shrink < 0.5) {
        PIX.text(c, `LINE ${String(Math.min(N, L)).padStart(3, '0')} / ${N}`, 135, 222, 'c3', { align: 'center' });
        CAP.note(c, t, { x: 135, y: 240, text: 'ONE LINE PER REPETITION', t0: 0.9, t1: 2.85, align: 'center', col: 'w', box: true, rate: 60 });
        CAP.note(c, t, { x: 135, y: 252, text: 'OF THE PULSE SEQUENCE', t0: 1.1, t1: 2.85, align: 'center', col: 'g9', box: true, rate: 60 });
        CAP.note(c, t, { x: 208, y: 70, text: 'k-SPACE', t0: 0.4, t1: 2.85, col: 'c3', box: true });
      } else CAP.note(c, t, { x: 12, y: 134, text: 'k-SPACE', t0: 3.0, t1: 5.7, col: 'c3', box: true });
    }
    // the inverse Fourier transform: the image as a sum of waves, low to high frequency
    if (t >= T_FILL1 + 0.2 && t < T_SER0 + 0.4) {
      const u = clamp((t - T_IF0) / (T_IF1 - T_IF0)), R = t < T_IF0 ? 0.6 : 1.2 * Math.pow(70 / 1.2, MO.sineInOut(u));
      const img = KSP.recon(KQ, R), cvI = KSP.grayCanvas(img, 1.1);
      const go = sm(clamp((t - T_SER0 + 0.3) / 0.6)), [gx, gy] = cell(K0);
      const sc = lerp(2, (GS * 1.25 * 158 / 128) * 0.98, go), ix = lerp(135, gx, go), iy = lerp(292, gy, go);
      const a = sm(clamp((t - T_FILL1 - 0.2) / 0.3));
      c.save(); c.globalAlpha = a; c.imageSmoothingEnabled = false; c.drawImage(cvI, ix - N * sc / 2, iy - N * sc / 2, N * sc, N * sc); c.restore();
      if (go < 0.2) {
        // the wave being added: a k-space point on the current radius
        const th = t * 2.4, kxw = Math.round(R * Math.cos(th) * 40 / N * 1.4), kyw = Math.round(R * Math.sin(th) * 40 / N * 1.4);
        const wv = KSP.wave(kxw, kyw, 52);
        c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a; c.drawImage(wv, 206, 66); c.restore();
        PIX.rect(c, 205, 65, 54, 1, 'c2'); PIX.rect(c, 205, 118, 54, 1, 'c2'); PIX.rect(c, 205, 65, 1, 54, 'c2'); PIX.rect(c, 258, 65, 1, 54, 'c2');
        PIX.text(c, '+', 194, 86, 'w', { sc: 2 });
        // k-space radius being used
        const [cx0, cy0] = [12 + 32, 66 + 32]; FX.ring(c, cx0, cy0, R * 0.5, 'c4', 0.9);
        CAP.note(c, t, { x: 135, y: 136, text: 'INVERSE FOURIER TRANSFORM', t0: 3.15, t1: 5.6, align: 'center', col: 'c3', box: true, rate: 60 });
        CAP.note(c, t, { x: 135, y: 432, text: 'IMAGE = SUM OF WAVES', t0: 3.6, t1: 5.6, align: 'center', col: 'w', box: true, rate: 60 });
        CAP.note(c, t, { x: 135, y: 444, text: 'BLURRY SHAPE → SHARP EDGES', t0: 4.4, t1: 5.6, align: 'center', col: 'g9', box: true, rate: 60 });
      }
    }
    // the series: one slice after another into the viewer grid
    if (t >= T_SER0 - 0.05) {
      const list = [{ k: K0, P: gridPose(K0), a: t >= T_SER0 ? 1 : 0, mode: 'head' }];
      ORDER.forEach((k, j) => {
        const ta = appear(j); if (t < ta) return;
        const u = (t - ta) / 0.16, [x, y] = cell(k);
        if (u < 0.6) {                                                         // its k-space filling first
          const rows = Math.floor(N * clamp(u / 0.55));
          c.save(); c.imageSmoothingEnabled = false; c.drawImage(KSP.grayCanvas(KS[k].lg, 1, 1.6, rows), x - 30, y - 30, 60, 60); c.restore();
        } else list.push({ k, P: gridPose(k), a: 1, mode: 'head' });
        if (u > 0.6 && u < 1.0) FX.ring(c, x, y, 10 + (u - 0.6) * 120, 'c3', 1 - (u - 0.6) / 0.4);
      });
      STACK.draw(c, list.filter(it => it.a > 0), { thick: 0 });
      const n = 1 + ORDER.filter((k, j) => t >= appear(j) + 0.1).length;
      PIX.rect(c, 168, 456, 96, 11, 'k'); PIX.text(c, `${n} / ${STACK.N} SLICES`, 262, 458, 'c3', { align: 'right' });
    }
    CAP.scene(c, t, { title: 'IMAGE RECONSTRUCTION', t0: 0.15, acc: 'c3' });
  },
  cues: () => {
    const q = [[0, 'data_in', 0.7, -0.3, 0.8], [T_FILL0, 'kfill', 0.8, 0, T_FILL1 - T_FILL0], [T_FILL1, 'shrink', 0.5, 0], [T_IF0, 'ifft', 0.9, 0, T_IF1 - T_IF0], [T_IF1, 'image_done', 0.9, 0],
      [T_SER0 - 0.3, 'pull_back', 0.5, 0, 0.5], [T_SER0, 'type', 0.3]];
    ORDER.forEach((k, j) => q.push([appear(j) + 0.1, 'slice_click', 0.7, ((k % 3) - 1) * 0.5, j]));
    return q;
  },
};
})();
