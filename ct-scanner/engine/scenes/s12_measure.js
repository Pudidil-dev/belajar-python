// S12 DETECTORS MEASURE HOW MUCH X-RAY PASSES THROUGH (80–88 s): the gantry stops at one angle. The camera zooms onto one
// photon of the measured ray and rides with it through the head down to its detector element, which flashes (the
// scintillator) and sends a signal; then it pulls back. That ray runs from the focal spot through the head to one element;
// a ray at the edge of the fan passes beside the head. The edge channel reads the unattenuated intensity I₀ (the
// reference), the other the transmitted intensity I: two bars. The logarithm p = ln(I₀/I) turns that ratio into the total
// attenuation along the ray (∫μ dl). Every channel gets its own p, and together they make one projection — the data the
// scanner keeps. (An idealized model: real beams are polychromatic and the scanner applies corrections; the detector never
// measures density inside the body directly.)
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const NCH = 96, BETA = 0;
let PROF = null, GC = 0, PC = 0, GR = 0, LIT = 0;
const cam0 = { x: 0, y: 60, s: 0.42, cx: 135, cy: 240 };
// the ride: one photon of the measured ray, followed from above the head to its detector element
const R0 = 0.35, R1 = 1.55;                                           // the featured photon leaves / lands
const featQ = t => lerp(0.32, 1, clamp((t - R0) / (R1 - R0)));       // its place on the ray (0 focal spot … 1 detector)
const featP = t => { const S = CT.src(BETA), D = CT.det(BETA, GC), q = featQ(t); return [lerp(S[0], D[0], q), lerp(S[1], D[1], q)]; };
const camAt = t => {
  const zin = MO.smooth(clamp((t - 0.22) / 0.5)), back = MO.smooth(clamp((t - 1.7) / 0.7)), [px, py] = featP(t), s1 = 0.95;
  if (back <= 0) return { ...cam0, x: lerp(cam0.x, px, zin), y: lerp(cam0.y, py, zin), s: Math.exp(lerp(Math.log(0.40), Math.log(s1), zin)) };
  return { ...cam0, x: lerp(px, cam0.x, back), y: lerp(py, cam0.y, back), s: Math.exp(lerp(Math.log(s1), Math.log(0.42), back)) };
};
const rayPts = (g, cam) => { const S = CT.src(BETA), D = CT.det(BETA, g); return [G2.S(cam, ...S), G2.S(cam, ...D)]; };
SC['s12_measure'] = {
  init() {
    PROF = new Float32Array(NCH); for (let j = 0; j < NCH; j++) PROF[j] = CT.lineInt(BETA, (j + 0.5 - NCH / 2) * (2 * CT.FAN / NCH), 0.8);
    let best = 0; for (let j = 0; j < NCH; j++) if (PROF[j] > PROF[best]) best = j;
    GC = (best + 0.5 - NCH / 2) * (2 * CT.FAN / NCH); PC = PROF[best]; GR = -0.85 * CT.FAN;
    LIT = Math.floor((GC + CT.FAN) / (2 * CT.FAN) * 48);                // the detector element under the measured ray
  },
  draw(c, t, S) {
    const cam = camAt(t);
    PIX.rect(c, 0, 0, W, H, 'k');
    G2.ring(c, cam, 0.8); G2.table(c, cam, 1); G2.head(c, cam, {});
    G2.fan(c, cam, BETA, 0.5);
    const land = t - R1;
    G2.frame(c, cam, BETA, { lit: u => land > 0 && land < 0.7 && Math.round(u * 48) === LIT });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the two rays: photons along them (many enter; few leave the head on the measured one)
    const show = MO.smooth(clamp((t - 0.3) / 0.4)) * (1 - MO.smooth(clamp((t - 5.0) / 0.4)));
    for (const [g, isRef] of [[GC, false], [GR, true]]) {
      const [[sx, sy], [dx, dy]] = rayPts(g, cam);
      if (show > 0) { c.save(); c.globalAlpha = show; PIX.bline(c, sx, sy, dx, dy, isRef ? 'b1' : 'y1'); c.restore(); }
      for (let k = 0; k < 18; k++) {
        const q = K.wrap(S.t * 0.55 + k / 18, 1), x = lerp(sx, dx, q), y = lerp(sy, dy, q);
        // on the measured ray, only a fraction e^(−p) survive past the head (drawn by thinning after its middle)
        if (!isRef && q > 0.62 && h(k, 3) > Math.max(0.12, Math.exp(-PC))) continue;
        if (show > 0.5) FX.ph(c, x, y, Math.atan2(dy - sy, dx - sx), 4, 6, 1.5, 1);
      }
    }
    // the featured photon (one that makes it through), then the element's flash and its signal
    {
      const [[sx, sy], [dx, dy]] = rayPts(GC, cam), ang = Math.atan2(dy - sy, dx - sx);
      if (t >= R0 && land < 0) { const [fx, fy] = G2.S(cam, ...featP(t)); FX.ph(c, fx, fy, ang, 6, 17, 4, 1); PIX.rect(c, Math.round(fx) - 1, Math.round(fy) - 1, 2, 2, 'y4'); }
      if (land >= 0 && land < 0.35) FX.flash(c, dx, dy, 9 * (1 - land / 0.35), 'e2', 1 - land / 0.35);
      if (land >= 0.1 && land < 0.55) {
        const q = (land - 0.1) / 0.45, D = CT.det(BETA, GC), r = Math.hypot(D[0] - CT.src(BETA)[0], D[1] - CT.src(BETA)[1]);
        const ux = (D[0] - CT.src(BETA)[0]) / r, uy = (D[1] - CT.src(BETA)[1]) / r, [qx, qy] = G2.S(cam, D[0] + ux * 60 * q, D[1] + uy * 60 * q);
        FX.e(c, qx, qy, 2, 1 - q * 0.5, true);
      }
    }
    // bars: I₀ (reference) and I (measured), and the log
    const ba = MO.smooth(clamp((t - 2.0) / 0.3)) * (1 - MO.smooth(clamp((t - 5.2) / 0.3)));
    if (ba > 0) {
      c.save(); c.globalAlpha = ba;
      const bx = 172, by = 120, bw = 70;
      PIX.rect(c, bx - 4, by - 4, bw + 8, 74, 'k'); PIX.rect(c, bx - 4, by - 4, 1, 74, 'g4');
      PIX.text(c, 'I₀', bx, by, 'b3', { shadow: null }); PIX.rect(c, bx + 14, by + 1, Math.round(bw - 16), 5, 'b2');
      const fI = Math.exp(-PC), grow = MO.cubicOut(clamp((t - 2.3) / 0.5));
      PIX.text(c, 'I', bx + 2, by + 13, 'y3', { shadow: null }); PIX.rect(c, bx + 14, by + 14, Math.max(1, Math.round((bw - 16) * fI * grow + (1 - grow) * (bw - 16))), 5, 'y3');
      PIX.text(c, `I/I₀ = ${(fI * 100).toFixed(1)}%`, bx, by + 28, 'g9', { shadow: null, n: Math.floor((t - 2.8) * 50) });
      PIX.text(c, `p = ln(I₀/I)`, bx, by + 42, 'w', { shadow: null, n: Math.floor((t - 3.4) * 50) });
      PIX.text(c, `  = ${PC.toFixed(2)}`, bx, by + 53, 'w', { shadow: null, n: Math.floor((t - 3.8) * 50) });
      c.restore();
    }
    { const [[, ], [dx, dy]] = rayPts(GR, cam); CAP.note(c, t, { ax: dx, ay: dy, x: 20, y: 404 - 30, text: 'REFERENCE: I₀', t0: 1.95, t1: 3.6, col: 'b3', box: true }); }
    { const [[, ], [dx, dy]] = rayPts(GC, cam); CAP.note(c, t, { ax: dx, ay: dy, x: 248, y: 404 - 30, text: 'MEASURED: I', t0: 2.15, t1: 3.6, col: 'y3', align: 'right', box: true }); }
    CAP.note(c, t, { x: 135, y: 352, text: 'p = TOTAL ATTENUATION ALONG THE RAY', t0: 3.45, t1: 5.95, col: 'g9', align: 'center', box: true });
    // all channels: the projection profile, built as the rays sweep across the fan
    const pa = MO.smooth(clamp((t - 5.25) / 0.3));
    if (pa > 0) {
      const n = Math.min(NCH, Math.floor((t - 5.35) / 1.3 * NCH));
      // the swept rays
      for (let j = Math.max(0, n - 6); j < n; j++) { const g = (j + 0.5 - NCH / 2) * (2 * CT.FAN / NCH), [[sx, sy], [dx, dy]] = rayPts(g, cam); c.save(); c.globalAlpha = 0.5 * pa; PIX.bline(c, sx, sy, dx, dy, 'b2'); c.restore(); }
      // the profile under the detector arc
      const px0 = 30, pw = 210, py0 = 418, ph = 40;
      c.save(); c.globalAlpha = pa;
      PIX.rect(c, px0 - 3, py0 - ph - 6, pw + 6, ph + 12, 'k'); PIX.rect(c, px0, py0, pw, 1, 'g5');
      let prev = null;
      for (let j = 0; j < n; j++) { const x = px0 + (j + 0.5) / NCH * pw, y = py0 - PROF[j] / 4.8 * ph; if (prev) PIX.bline(c, prev[0], prev[1], x, y, 'b4'); prev = [x, y]; }
      PIX.text(c, 'PROJECTION (ONE ANGLE)', px0, py0 - ph - 4, 'b3', { shadow: null, n: Math.floor((t - 5.6) * 50) });
      c.restore();
    }
    CAP.note(c, t, { x: 20, y: 140, text: 'IDEALIZED: REAL SCANNERS', t0: 5.7, t1: 7.85, col: 'g7', box: true });
    CAP.note(c, t, { x: 20, y: 151, text: 'CORRECT A MIXED-ENERGY BEAM', t0: 5.8, t1: 7.85, col: 'g7', box: true });
    CAP.cap(c, t, { l1: 'MEASUREMENT', l2: ['DETECTORS MEASURE HOW MUCH', 'X-RAY PASSES THROUGH'], t0: 0.12, tSwap: 1.6, t1: 7.85, acc: 'b3' });
  },
  cues: () => [[0, 'dissolve_in', 0.5, 0], [0.22, 'zoom_rush', 0.6, 0, 0.5], [0.3, 'ray_on', 0.6, 0], [0.75, 'follow_down', 0.5, 0, 0.8],
    [R1, 'xray_hit', 0.7, 0], [R1 + 0.06, 'crystal_ping', 0.6, 0], [R1 + 0.15, 'signal_pulse', 0.7, 0.3], [1.7, 'pull_back', 0.6, 0, 0.7],
    [1.95, 'tag', 0.4, -0.4], [2.15, 'tag', 0.4, 0.4], [2.8, 'calc_click', 0.5, 0.3], [3.4, 'calc_click', 0.5, 0.3], [3.8, 'calc_confirm', 0.7, 0.3],
    [5.35, 'sweep_up', 0.7, 0, 1.3], [5.7, 'tag', 0.3, -0.4], [6.65, 'chime_small', 0.5, 0]],
  xin: 0.35,
};
})();
