// S06 T1 RECOVERY / T2 DECAY (28–35 s): the RF stops. In 3D the tip of M spirals back toward B0: the transverse part
// dies away (T2) long before the longitudinal part has grown back (T1). Split into the two processes, each a short
// loop: left, Mz recovering; right, the spins of the transverse magnetization fanning out of phase so their sum
// shrinks. Then three tissues race: white matter recovers fastest, CSF slowest (T1); CSF keeps its transverse signal
// longest (T2). Sampled at the right moment, those differences are the contrast of T1- and T2-weighted images.
// Times are stretched for the screen (real T1 ≈ 0.6 / 1.0 / 4 s, T2 ≈ 80 / 100 / 2000 ms).
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const S5 = window.S05;
const T1 = { WM: 0.54, GM: 0.9, CSF: 3.6 }, T2 = { WM: 0.8, GM: 1.0, CSF: 20 };
const T1C = { WM: 'gb', GM: 'g7', CSF: 'g3' }, T2C = { WM: 'g5', GM: 'g7', CSF: 'gb' };
const CYC0 = 0.55, P = 3.0;                                                    // loops: 0.55–3.55, 3.55–6.55
const tau = t => (t - CYC0) % P, cyc = t => Math.floor((t - CYC0) / P);
// 3D relaxation at the start (continuing S05's precession)
const M3 = t => { const ph = -S5.prec(28 - 20 + t), mxy = Math.exp(-t / 0.9), mz = 1 - Math.exp(-t / 2.2); return [mxy * Math.cos(ph), mxy * Math.sin(ph), mz]; };
let IMG = null;
const images = () => {
  if (IMG) return IMG;
  const w = 108, h = 124, fu = 182, fv = 209;
  const t1 = ROOM.toCanvas(VOL.sliceWith(VOL.t1At, [0, 0, 15], [-1, 0, 0], [0, -1, 0], w, h, fu, fv), w, h);
  const t2 = ROOM.toCanvas(VOL.sliceWith(VOL.t2At, [0, 0, 15], [-1, 0, 0], [0, -1, 0], w, h, fu, fv), w, h);
  IMG = { t1, t2, w, h }; return IMG;
};
function plot(c, x0, y0, w, h, fn, tMax, tNow, col, o = {}) {
  // axes once by the caller; the curve drawn up to tNow
  let px = null, py = null;
  for (let k = 0; k <= w; k++) { const tt = k / w * tMax; if (tt > tNow) break; const y = y0 + h - fn(tt) * h; if (px != null) PIX.bline(c, px, py, x0 + k, y, col); px = x0 + k; py = y; }
  if (px != null && o.dot !== false) PIX.rect(c, Math.round(px) - 1, Math.round(py) - 1, 3, 3, col);
  return [px, py];
}
function axes(c, x0, y0, w, h, lab) {
  PIX.rect(c, x0, y0 + h, w + 3, 1, 'g6'); PIX.rect(c, x0, y0 - 3, 1, h + 4, 'g6');
  PIX.text(c, 't', x0 + w + 3, y0 + h - 4, 'g7', { shadow: null }); PIX.text(c, lab, x0 + 3, y0 - 5, 'g8', { shadow: null });
}
SC['s06_relax'] = {
  init() { images(); },
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const split = sm(clamp((t - 0.45) / 0.4));
    if (split < 1) {
      // the whole of M relaxing in 3D (fading out as the panels take over)
      c.save(); c.globalAlpha = 1 - split;
      const cx = 135, cy = 250, R = 92, el = 0.45;
      SPIN.frame(c, cx, cy, R, { el, zlabel: 'B₀' });
      for (let tt = 0; tt < t; tt += 1 / 120) { const v = M3(tt), [dx, dy] = SPIN.proj(v, 0, el); if ((tt * 120 | 0) % 2) continue; PIX.rect(c, Math.round(cx + dx * R), Math.round(cy + dy * R), 1, 1, 'c2'); }
      SPIN.arrow(c, cx, cy, M3(t), R, { el, col: 'w', hi: 'w', colB: 'g8', thick: 3, head: 9 });
      c.restore();
    }
    if (split > 0) {
      c.save(); c.globalAlpha = split;
      PIX.rect(c, 134, 66, 1, 230, 'g3');                                       // divider
      // ---- left: T1, Mz recovering ----
      const ta = tau(t), second = cyc(t) >= 1 && t >= CYC0;
      const bx = 30, by = 238, Hh = 112;
      MICRO.arrow(c, 14, 288, 14, 120, 'c1', 'c2', 5, 1); PIX.text(c, 'B₀', 14, 108, 'c2', { align: 'center' });
      if (!second) {
        const mz = t < CYC0 ? 0 : 1 - Math.exp(-ta / T1.GM);
        PIX.rect(c, bx - 6, by, 13, 1, 'g6');
        if (mz > 0.02) MICRO.arrow(c, bx, by, bx, by - mz * Hh, 'w', 'w', 7, 3);
        PIX.text(c, 'Mz', bx, by + 5, 'w', { align: 'center' });
        axes(c, 52, by - Hh, 74, Hh, '');
        if (t >= CYC0) plot(c, 52, by - Hh, 74, Hh, tt => 1 - Math.exp(-tt / T1.GM), P, ta, 'c3');
      } else {
        ['WM', 'GM', 'CSF'].forEach((k, i) => {
          const x = 20 + i * 16, mz = 1 - Math.exp(-ta / T1[k]);
          PIX.rect(c, x - 4, by, 9, 1, 'g6');
          if (mz > 0.02) MICRO.arrow(c, x, by, x, by - mz * Hh, T1C[k], T1C[k], 5, 2);
          PIX.text(c, k, x, by + 5 + (i === 1 ? 9 : 0), T1C[k] === 'g3' ? 'g6' : T1C[k], { align: 'center' });
        });
        axes(c, 70, by - Hh, 58, Hh, '');
        ['WM', 'GM', 'CSF'].forEach(k => plot(c, 70, by - Hh, 58, Hh, tt => 1 - Math.exp(-tt / T1[k]), P, ta, T1C[k] === 'g3' ? 'g5' : T1C[k]));
        // read-out moment: the curves are in order WM > GM > CSF
        const xr = 70 + Math.round(0.55 / P * 58); if (ta > 0.55) for (let yy = by - Hh; yy < by; yy += 3) PIX.rect(c, xr, yy, 1, 1, 'v3');
      }
      if (t > CYC0 && ta < 0.18) { FX.ring(c, bx, by, 6 + ta * 140, 'v3', 1 - ta / 0.18); }
      // ---- right: T2, the transverse spins fanning out ----
      const cx = 200, cy = 150, R = 46;
      for (let k = 0; k < 64; k++) { const a = k / 64 * TAU; if (k % 2) continue; PIX.rect(c, Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * 0.92), 1, 1, 'g5'); }
      PIX.text(c, 'TOP VIEW', cx, cy + R + 6, 'g6', { align: 'center', shadow: null });
      const base = -TAU * 0.5 * Math.max(0, t - CYC0) - Math.PI / 2;
      if (!second) {
        let sx = 0, sy = 0; const n = 12, ta2 = t < CYC0 ? 0 : ta;
        for (let k = 0; k < n; k++) {
          const d = (k - (n - 1) / 2) / ((n - 1) / 2), a = base + d * 1.6 * ta2 + 0.05 * d;
          sx += Math.cos(a) / n; sy += Math.sin(a) / n;
          MICRO.arrow(c, cx, cy, cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82 * 0.92, 'c1', 'c2', 4, 1);
        }
        const L = Math.hypot(sx, sy); if (L > 0.03) MICRO.arrow(c, cx, cy, cx + sx * R, cy + sy * R * 0.92, 'w', 'w', 7, 3);
        PIX.text(c, 'Mxy', cx + 30, cy - R - 8, 'w', { align: 'center' });
        axes(c, 146, 214, 112, 46, '');
        if (t >= CYC0) plot(c, 146, 214, 112, 46, tt => Math.exp(-tt / T2.GM), P, ta, 'c3');
      } else {
        ['WM', 'GM', 'CSF'].forEach((k, i) => { const m = Math.exp(-ta / T2[k]), a = base + i * 0.1; if (m > 0.03) MICRO.arrow(c, cx, cy, cx + Math.cos(a) * R * m, cy + Math.sin(a) * R * m * 0.92, T2C[k], T2C[k], 6, 2); });
        axes(c, 146, 214, 112, 46, '');
        ['WM', 'GM', 'CSF'].forEach(k => { const e = plot(c, 146, 214, 112, 46, tt => Math.exp(-tt / T2[k]), P, ta, T2C[k]); });
        const xr = 146 + Math.round(1.0 / P * 112); if (ta > 1.0) for (let yy = 214; yy < 260; yy += 3) PIX.rect(c, xr, yy, 1, 1, 'v3');
        PIX.text(c, 'CSF', 252, 206, 'gb', { align: 'right', shadow: null });
      }
      c.restore();
      // labels: the brief's two, as panel headers
      CAP.note(c, t, { x: 10, y: 58, text: 'T1 RECOVERY', t0: 0.5, col: 'w', box: true });
      CAP.note(c, t, { x: 142, y: 58, text: 'T2 DECAY', t0: 0.6, col: 'w', box: true });
      if (second) {
        // tissue contrast: the same slice, two weightings
        const im = images(), ia = sm(clamp((t - 4.1) / 0.4));
        if (ia > 0) {
          c.save(); c.globalAlpha = ia; c.imageSmoothingEnabled = false;
          c.drawImage(im.t1, 14, 318); c.drawImage(im.t2, 148, 318);
          c.restore();
          CAP.note(c, t, { x: 68, y: 446, text: 'T1-WEIGHTED', t0: 4.3, align: 'center', col: 'w', box: true });
          CAP.note(c, t, { x: 202, y: 446, text: 'T2-WEIGHTED', t0: 4.45, align: 'center', col: 'w', box: true });
          CAP.note(c, t, { x: 135, y: 300, text: 'TISSUES RELAX DIFFERENTLY → CONTRAST', t0: 4.7, align: 'center', col: 'c3', box: true, rate: 60 });
        }
      }
    }
  },
  cues: () => {
    const q = [[0, 'relax_spiral', 0.8, 0, 0.6], [0.45, 'split', 0.6, 0], [0.5, 'type', 0.3, -0.5], [0.6, 'type', 0.3, 0.5]];
    for (const c0 of [CYC0, CYC0 + P]) { q.push([c0, 'reset_pulse', 0.6, -0.3]); q.push([c0 + 0.05, 'recover', 0.6, -0.5, 2.4]); q.push([c0 + 0.05, 'dephase', 0.6, 0.5, 2.4]); }
    q.push([4.1, 'images', 0.8, 0], [4.7, 'type', 0.3]);
    return q;
  },
};
})();
