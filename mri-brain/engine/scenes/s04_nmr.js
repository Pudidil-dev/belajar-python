// S04 NUCLEAR MAGNETIC RESONANCE (14–20 s): the proton is one of many. Their moments point every which way (thermal
// motion); in B0 each sits on one of the two cones of the spin-½ picture — parallel (lower energy) or antiparallel —
// with a random phase, and all of them precess about B0 at one rate, the Larmor frequency. The transverse parts cancel;
// what survives is a tiny excess along B0 (≈ 5 per million at 1.5 T, exaggerated on screen): the net magnetization M.
// ω = γB0: twice the field, twice the frequency.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const COLS = 5, ROWS = 6, GX = k => 39 + 48 * k, GY = j => 92 + 42 * j, FK = 2, FJ = 3;    // focus node (135, 218)
const N = COLS * ROWS, POP = SPIN.pop(N, 11, 0.16), FI = FJ * COLS + FK;
const MOM0 = (() => { const a = window.S03.MOM; return [Math.cos(a), 0, -Math.sin(a)]; })();   // the S03 proton's moment (screen up = +z)
const T_AL = 2.0, W_L = TAU * 2;                                              // alignment starts; precession: one turn per beat
const zoomAt = t => Math.exp(lerp(Math.log(26 / 5), 0, io(clamp(t / 1.2))));
const elAt = t => lerp(0, 0.42, io(clamp((t - 0.2) / 1.2)));
const phase = t => W_L * Math.max(0, t - T_AL);
const align = (i, t) => sm(clamp((t - T_AL - 0.012 * i) / 0.4));
const vecAt = (i, t) => {
  const m = POP[i];
  let v = SPIN.thermal(m, t);
  if (i === FI) v = SPIN.mix(MOM0, v, sm(clamp((t - 0.6) / 0.9)));
  const u = align(i, t); if (u > 0) v = SPIN.mix(v, SPIN.cone(m, phase(t)), u);
  return v;
};
window.S04 = { vecAt, phase, POP, GX, GY, COLS, ROWS, elAt, T_AL, W_L };
const Mfrac = t => sm(clamp((t - T_AL - 0.15) / 0.8));
SC['s04_nmr'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const z = zoomAt(t), el = elAt(t), fx = lerp(135, GX(FK), io(clamp(t / 1.2))), fy = lerp(232, GY(FJ), io(clamp(t / 1.2)));
    // B0: clean arrows at both sides, slid in
    const b = sm(clamp((t - 1.15) / 0.5));
    if (b > 0) for (const x of [11, 259]) {
      const y1 = lerp(330, 70, b);
      MICRO.arrow(c, x, 318, x, y1, 'c2', 'c4', 7, 3);
    }
    if (b > 0.6) PIX.text(c, 'B₀', 259, 52, 'c3', { align: 'center' });
    // the population
    for (let j = 0; j < ROWS; j++) for (let k = 0; k < COLS; k++) {
      const i = j * COLS + k, x = fx + (GX(k) - GX(FK)) * z, y = fy + (GY(j) - GY(FJ)) * z;
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const v = vecAt(i, t), al = align(i, t), up = POP[i].up && al > 0.5, R = 5 * z, L = 26 * z;
      const o = { az: 0, el, col: al < 0.5 ? 'c2' : up ? 'c3' : 'c2', hi: up ? 'c5' : 'c4', colB: 'c1', thick: 2 };
      // the cone each moment now precesses on: the circle its tip traces
      if (al > 0.3 && z < 1.5) {
        const zc = (POP[i].up ? 1 : -1) * Math.cos(SPIN.CONE), rc = Math.sin(SPIN.CONE), n = 28;
        c.save(); c.globalAlpha = (al - 0.3) / 0.7 * 0.9;
        for (let q = 0; q < n; q += 2) { const [dx, dy] = SPIN.proj([rc * Math.cos(q / n * TAU), rc * Math.sin(q / n * TAU), zc], 0, el); PIX.rect(c, Math.round(x + dx * L), Math.round(y + dy * L), 1, 1, POP[i].up ? 'c1' : 'n4'); }
        c.restore();
      }
      const [, , d] = SPIN.proj(v, 0, el);
      if (d < 0) SPIN.arrow(c, x, y, v, L, o);
      if (R > 3.6) MICRO.proton(c, x, y, R); else { PIX.circ(c, x, y, 2.6, 'y2'); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 1, 1, 'y4'); }
      if (d >= 0) SPIN.arrow(c, x, y, v, L, o);
      // a click of light as each one settles on its cone
      const u = align(i, t); if (u > 0.85 && u < 0.99) PIX.rect(c, Math.round(x) - 2, Math.round(y) - 2, 5, 5, 'y4');
    }
    // net magnetization: the frame and M growing along B0
    const pa = sm(clamp((t - 1.9) / 0.4));
    if (pa > 0) {
      const cx = 64, cy = 408;
      SPIN.frame(c, cx, cy, 38, { el: 0.42, a: pa, zlabel: 'B₀' });
      const M = Mfrac(t);
      if (M > 0.02) { SPIN.arrow(c, cx, cy, [0, 0, 1], 48 * M, { el: 0.42, col: 'w', hi: 'w', thick: 3, head: 8 }); }
      CAP.note(c, t, { x: 12, y: 448, text: 'NET MAGNETIZATION M', t0: 2.5, col: 'w', box: true });
      CAP.note(c, t, { x: 12, y: 340, text: 'EXCESS ≈ 5 PER MILLION', t0: 3.0, col: 'g9', box: true, rate: 60 });
      CAP.note(c, t, { x: 12, y: 328, text: 'NOT ALL ALIGN:', t0: 2.85, col: 'g9', box: true, rate: 60 });
    }
    // ω = γB0, and what it means: twice the field, twice the frequency
    if (t > 3.4) {
      const fa = sm(clamp((t - 3.4) / 0.3));
      c.save(); c.globalAlpha = fa;
      const bx = 138, by = 352;
      PIX.rect(c, bx, by, 120, 22, 'k'); PIX.rect(c, bx, by, 120, 1, 'c2'); PIX.rect(c, bx, by + 21, 120, 1, 'c2');
      PIX.text(c, 'ω = γB₀', bx + 60, by + 4, 'w', { sc: 2, align: 'center' });
      c.restore();
      [[1.5, '64 MHz', 170], [3, '128 MHz', 236]].forEach(([B, f, gx], i) => {
        const ga = sm(clamp((t - 3.8 - 0.25 * i) / 0.3)); if (ga <= 0) return;
        const gy = 414, v = SPIN.sph(SPIN.CONE, -W_L * (B / 1.5) * (t - 3.8));
        c.save(); c.globalAlpha = ga;
        SPIN.frame(c, gx, gy, 17, { el: 0.42, zlabel: '' });
        SPIN.arrow(c, gx, gy, v, 22, { el: 0.42, col: 'c3', hi: 'c5', thick: 2 });
        MICRO.arrow(c, gx - 27, gy + 10, gx - 27, gy + 8 - 11 * B, 'c2', 'c4', 4, 2);
        PIX.text(c, `${B} T`, gx, gy + 14, 'g9', { align: 'center' }); PIX.text(c, f, gx, gy + 25, 'c4', { align: 'center' });
        c.restore();
      });
    }
    CAP.scene(c, t, { title: 'NUCLEAR MAGNETIC RESONANCE', t0: 0.15, acc: 'c3' });
  },
  cues: () => {
    const q = [[0, 'zoom_out', 0.8, 0, 1.2], [0.4, 'thermal', 0.5, 0, 1.6], [1.15, 'field_in', 0.9, 0], [T_AL, 'resonant_pulse', 1.0, 0], [T_AL, 'align_clicks', 0.8, 0, 0.9],
      [2.5, 'type', 0.35], [3.0, 'type', 0.3], [3.4, 'formula', 0.8, 0.2], [3.8, 'gauge', 0.5, 0.3], [4.05, 'gauge2', 0.5, 0.5]];
    for (let b = 0; b < 8; b++) q.push([T_AL + 0.5 + b * 0.5, 'precess', 0.45, Math.sin(b) * 0.4]);
    return q;
  },
};
})();
