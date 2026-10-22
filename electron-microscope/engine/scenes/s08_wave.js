// S08 · 0:45–0:52 — WHY ELECTRONS CAN RESOLVE ATOMS. The electron leaving the accelerator shows its other face: a
// matter wave. Two panels, same two gold atoms 0.29 nm apart: a visible-light wave (λ ≈ 500 nm) is far too coarse to
// tell them apart, so its image is one blur; the 200 keV electron's wave (λ = h/p ≈ 0.0025 nm) is finer than the
// atoms and its image shows both. More momentum, shorter wave: the electron's wave visibly tightens as p rises and its
// image sharpens. Drawn not to scale (light is drawn far too short, the electron ~9× too long; the real ratio is
// ~200,000×), and each panel says so. Then back to the beam, heading for the lenses — whose flaws also limit detail.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_PANEL = 1.05, T_LIGHT = 1.35, T_ELEC = 2.5, T_P0 = 3.0, T_P1 = 4.3, T_SUM = 4.5, T_FLAW = 5.0, T_BACK = 6.3;
const pK = lt => MO.smooth(U.clamp((lt - T_P0) / (T_P1 - T_P0)));            // momentum ramp
const kVAt = lt => 4 * Math.pow(50, pK(lt));                                   // 4 kV → 200 kV
const lamNm = V => 1.2264 / Math.sqrt(V * 1000 * (1 + 0.97848e-6 * V * 1000));   // relativistic de Broglie wavelength, nm
const lamE = lt => 3.2 * lamNm(kVAt(lt)) / lamNm(200);                          // drawn electron wavelength, px (to scale within the panel)
// a panel: wave over two atoms on the left, the image it makes on the right
function panel(c, y0, lt, o) {
  const h = 150, ax = 92, ay = y0 + 78, d = 40;
  PIX.rect(c, 8, y0, W - 16, h, 'n0'); PIX.rect(c, 8, y0, W - 16, 1, 'n2'); PIX.rect(c, 8, y0 + h - 1, W - 16, 1, 'n2');
  // the two atoms
  for (const s of [-1, 1]) { SAMPLE.cloud(c, ax + s * d / 2, ay, 11, ['y0', 'y1', 'y2', 'y3'], 1); PIX.rect(c, ax + s * d / 2 - 1, ay - 1, 2, 2, 'y4'); }
  // the wave: travels left → right across the atoms
  const k = o.k, lam = o.lam, A = o.amp, col = o.col, glow = o.glow;
  if (k > 0) {
    const x0 = 14, x1 = U.lerp(x0, 172, MO.cubicOut(k));
    let pv = null;
    for (let x = x0; x <= x1; x++) {
      const y = ay + A * Math.sin(U.TAU * (x - lt * o.speed) / lam);
      if (pv) PIX.bline(c, pv[0], pv[1], x, y, col); pv = [x, y];
    }
    if (o.fill) for (let x = x0; x <= x1; x += 1) { const y = ay + A * Math.sin(U.TAU * (x - lt * o.speed) / lam); PIX.bline(c, x, ay, x, y, glow); }
  }
  // the image it makes (right): a small dark frame where the two atoms either merge into a blur or stay apart
  const ix = 190, iy = y0 + 40, iw = 66, ih = 76, kI = U.clamp(o.img);
  PIX.rect(c, ix - 1, iy - 1, iw + 2, ih + 2, 'g3'); PIX.rect(c, ix, iy, iw, ih, 'k');
  if (kI > 0) {
    const img = c.getImageData(ix, iy, iw, ih), dd = img.data, sig = U.lerp(3.2, o.blur, 1) ;
    for (let yy = 0; yy < ih; yy++) for (let xx = 0; xx < iw; xx++) {
      let v = 0;
      for (const s of [-1, 1]) { const dx = xx - iw / 2 - s * 10, dy = yy - ih / 2; v += Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig)); }
      v = Math.min(1, v * (o.blur > 6 ? 0.8 : 1)) * kI;
      const g = v + (K.BAY(xx, yy) - 0.5) * 0.18, cc = g > 0.85 ? 'w' : g > 0.62 ? 'gb' : g > 0.42 ? 'g8' : g > 0.24 ? 'g5' : g > 0.1 ? 'g3' : null;
      if (cc) { const p = PIX.hex(PIX.P[cc]), i = (yy * iw + xx) * 4; dd[i] = p[0]; dd[i + 1] = p[1]; dd[i + 2] = p[2]; }
    }
    c.putImageData(img, ix, iy);
  }
  PIX.text(c, 'IMAGE', ix + iw / 2, iy - 10, 'g7', { align: 'center', shadow: null });
  PIX.text(c, 'NOT TO SCALE', W - 12, y0 + 5, 'g8', { align: 'right', shadow: null });
  return { ax, ay, ix, iy, iw, ih };
}
SC.s08_wave = {
  draw(c, lt) {
    const T = 45 + lt;
    if (lt < T_PANEL + 0.25) {
      // the electron leaving the accelerator, its wave packet appearing around it; the camera closes in
      const c7 = SC.s07_accel.camAt(7), yE = -219 + lt * 4, p = MO.cubicIn(U.clamp(lt / T_PANEL));
      const cam = { x: U.lerp(c7.x, X, p), y: U.lerp(c7.y, yE, p), z: CAM.zlerp(c7.z, 40, p) };
      LAB.back(c, cam, T); COL.draw(c, cam, T, { airlock: 1, glow: 0.6, hot: { c1: 0.6, c2: 0.6, obj: 0.3 } });
      const [ex, ey] = K.S(cam, X, yE), kW = U.clamp(lt / 0.5), L = 30 + 60 * p;
      let pv = null;
      for (let q = -L; q <= L; q++) { const env = Math.exp(-((q / (L * 0.5)) ** 2)), xx = ex + 14 * env * Math.sin(q * 0.9 - lt * 20) * kW, yy = ey + q; if (pv) PIX.bline(c, pv[0], pv[1], xx, yy, 'c3'); pv = [xx, yy]; }
      FX.e(c, ex, ey, 3, 1, true);
      if (lt > T_PANEL) window.dissolve(c, () => {}, cc => SC.s08_wave.panels(cc, lt), MO.smooth((lt - T_PANEL) / 0.25));
    } else if (lt < T_BACK) this.panels(c, lt);
    else {
      // back to the beam: the condenser lens ahead
      const p = MO.cubicOut(U.clamp((lt - T_BACK) / 0.7)), e = SC.s08_wave.camEnd(), cam = { x: X, y: U.lerp(-216, e.y, p), z: CAM.zlerp(30, e.z, p) };
      const col = cc => { LAB.back(cc, cam, T); COL.draw(cc, cam, T, { airlock: 1, glow: 0.6, hot: { c1: 0.6, c2: 0.6, obj: 0.3 } });
        const [sx, s0] = K.S(cam, X, -228), [, s1] = K.S(cam, X, -204);
        for (let i = 0; i < 16; i++) { const u = K.wrap(lt * 0.9 + i / 16, 1); FX.e(cc, sx, U.lerp(s0, s1, u), 1, 1); } };
      const k = U.clamp((lt - T_BACK) / 0.25);
      if (k < 1) window.dissolve(c, cc => this.panels(cc, T_BACK), col, MO.smooth(k)); else col(c);
    }
    // the brief's line, from the wave packet into the panels (between the caption and the top panel)
    CAP.note(c, lt, { text: 'ELECTRONS HAVE WAVELENGTHS', x: W / 2, y: 84, t0: 0.1, t1: 2.25, col: 'c4', box: true, align: 'center' });
    CAP.scene(c, lt, { title: 'WHY ELECTRONS?', ctx: ['THEY HAVE MUCH SHORTER WAVELENGTHS', 'THAN VISIBLE LIGHT'], t0: T_PANEL + 0.2, t1: 6.9, acc: 'c2' });
    // the summary and the caveat share the bottom (two lines) and stay through the move back to the column
    CAP.note(c, lt, { text: 'SHORTER WAVELENGTH, FINER DETAIL', x: W / 2, y: 428, t0: T_SUM, col: 'c4', box: true, align: 'center' });
    CAP.note(c, lt, { text: 'BUT LENS FLAWS ALSO LIMIT DETAIL', x: W / 2, y: 442, t0: T_FLAW, col: 'u3', box: true, align: 'center' });
  },
  camEnd: () => ({ x: LAB.AX, y: -204, z: 7.5 }),
  panels(c, lt) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const kL = U.clamp((lt - T_LIGHT) / 0.7), kE = U.clamp((lt - T_ELEC) / 0.5);
    // light: one wave is ~1,700× the atom gap; even drawn far too short it spans the panel, so both atoms sit on one crest
    const a = panel(c, 96, lt, { k: kL, lam: 380, amp: 34, col: 'l2', glow: 'l0', fill: true, speed: 160, img: U.clamp((lt - T_LIGHT - 0.5) / 0.5), blur: 15 });
    PIX.text(c, 'VISIBLE LIGHT', 16, 100, 'l2'); PIX.text(c, 'λ ≈ 500 nm', 16, 112, 'g8'); PIX.text(c, 'ATOMS 0.29 nm APART', 16, 232, 'g8', { shadow: null });
    CAP.note(c, lt, { text: 'ONE BLUR', x: a.ix + a.iw / 2, y: a.iy + a.ih + 8, t0: T_LIGHT + 0.9, col: 'w', box: true, align: 'center' });
    const lam = lamE(lt);
    const b = panel(c, 262, lt, { k: kE, lam, amp: 9, col: 'c3', glow: 'c0', fill: false, speed: 55, img: U.clamp((lt - T_ELEC - 0.3) / 0.4), blur: U.lerp(9, 3.2, pK(lt)) });
    const kv = kVAt(lt), lnm = lamNm(kv);
    PIX.text(c, `ELECTRON  ${Math.round(kv)} keV`, 16, 266, 'c3'); PIX.text(c, `λ ≈ ${lnm < 0.0026 ? '0.0025' : lnm.toFixed(4)} nm`, 16, 278, 'g8');
    if (lt > T_P1) PIX.text(c, '200,000x SHORTER THAN LIGHT', 16, 290, 'c4', { n: Math.floor((lt - T_P1) * PIX.RATE) });
    CAP.note(c, lt, { text: 'TWO ATOMS', x: b.ix + b.iw / 2, y: b.iy + b.ih + 8, t0: T_P1 - 0.1, col: 'w', box: true, align: 'center' });
    // λ = h / p, and a momentum meter that squeezes the wave
    if (lt > T_P0 - 0.3) {
      const k = U.clamp((lt - T_P0 + 0.3) / 0.3);
      PIX.rect(c, 20, 386, 160, 30, 'k', k);
      PIX.text(c, 'λ = h / p', 26, 392, 'w', { sc: 1 });
      FX.meter(c, 88, 388, 86, U.lerp(0.25, 1, pK(lt)), 'MOMENTUM p', '', 'c3', k);
    }
  },
  cues: [[0.1, 'wave_on', 1, 0, 0.9], [T_PANEL, 'swoosh', 0.8], [T_PANEL + 0.2, 'title_hit', 0.7], [T_LIGHT, 'light_wave', 1, -0.2, 1.4], [T_LIGHT + 0.9, 'blur_thud', 1, 0.3],
    [T_ELEC, 'e_wave', 1, -0.2, 1.8], [T_P0, 'p_sweep', 1, 0, T_P1 - T_P0], [T_P1, 'crystal', 1, 0.3], [T_SUM, 'confirm', 0.9], [T_FLAW, 'blip', 0.7], [T_BACK, 'whoosh_back', 0.8, 0, 0.7]],
};
})();
