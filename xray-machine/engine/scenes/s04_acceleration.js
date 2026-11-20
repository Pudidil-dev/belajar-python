// S04 HIGH-VOLTAGE ACCELERATION (13–18 s): pull back out of the metal to the gap between the cathode cup and the anode.
// The high voltage switches on: field arrows point from + to −, and the negative electrons fly the other way, toward the
// anode, faster and faster (uniform field: energy grows with distance, 80 keV at arrival ≈ half the speed of light).
// The camera follows the leading group across the gap, then dives at the spot where they hit the tungsten.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const X0 = -14, GAP = 13.4, A = 2 * GAP / (2.875 * 2.875);   // cloud x (mm), gap (mm), acceleration: 2.875 s across (hits land on 16ths)
const E_MAX = 80;
// electrons: lead group + stream; before release they hover in the space-charge cloud in front of the cup
const ELS = [];
for (let k = 0; k < 7; k++) ELS.push({ tr: 1.25 + k * 0.125, y0: [0.4, -1.8, 2.2, -0.9, 1.4, -2.4, 0.9][k], lead: true, x0: X0 });
for (let k = 0; k < 56; k++) ELS.push({ tr: 1.45 + k * 0.055 + h(k, 3) * 0.03, y0: (h(k, 4) - 0.5) * 7, lead: false, x0: X0 + h(k, 5) * 1.0 });
const flight = () => Math.sqrt(2 * GAP / A);
const hover = (e, k, t) => [e.x0 + 0.6 + (K.vn3(k, 0.3, t * 1.5, 51) - 0.5) * 2.2, e.y0 * 0.7 + (K.vn3(k, 2.3, t * 1.5, 53) - 0.5) * 2.4];
const state = (e, k, t) => {
  if (t < e.tr) {                                      // hovering in the cloud
    const born = e.tr - 1.6;
    if (t < born) return null;
    const [x, y] = hover(e, k, t);
    return { x, y, s: 0, a: clamp((t - born) / 0.3) };
  }
  const [hx, hy] = hover(e, k, e.tr), dt = t - e.tr, s = 0.5 * A * dt * dt, yf = e.y0 * 0.16;
  const g = hx - (X0 + 0.6), sMax = GAP - g;           // starts where it hovered, lands on the face
  if (s >= sMax) return { hit: true, tHit: e.tr + Math.sqrt(2 * sMax / A), x: TUBE.faceX(yf), y: yf };
  const y = lerp(hy, yf, Math.min(1, s / sMax)), x = hx + s;
  return { x, y, s, a: 1 };
};
const lead = t => { const st = state(ELS[0], 0, t); return st && !st.hit ? st : null; };
const camAt = t => {
  if (t < 0.75) { const p = MO.cubicOut(t / 0.75); return { x: lerp(-20.62, -16, p), y: lerp(0.35, 0, p), z: K.zl(160, 18, p) }; }
  if (t < 1.25) return { x: -16, y: 0, z: 18 };
  if (t < 4.2) { const p = MO.sineInOut(clamp((t - 1.25) / 2.95)); return { x: lerp(-16, -2.6, p), y: 0, z: K.zl(18, 21, p) }; }
  if (t <= 5) { const q = clamp((t - 4.2) / 0.8), e = MO.expoIn(q); return { x: lerp(-2.6, -0.25, MO.sineInOut(q)), y: lerp(0, 0.05, q), z: K.zl(21, 260, e) }; }
  return { x: -0.25, y: 0.05, z: 260 * Math.pow(12, (t - 5) / 0.45) };   // S05 keeps diving for a moment
};
window.S04_CAM_END = camAt(5);
function drawTubeAt(cc, t, S) {
  const cam = camAt(t);
  K.cam(cc, cam);
  const heat = clamp((t - 3.95) / 0.5) * 0.9;
  TUBE.draw(cc, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat });
  cc.setTransform(1, 0, 0, 1, 0, 0);
  const on = clamp((t - 0.9) / 0.25);
  // field arrows: E points from the + anode to the − cathode (left); electrons move against them
  if (on > 0) {
    const [xa] = K.S(cam, -14.6, 0), [xb] = K.S(cam, -0.8, 0), ys = [-6.2, -3.7, -1.25, 1.25, 3.7, 6.2].map(y => K.S(cam, 0, y)[1]);
    FX.field(cc, xa, xb, ys, -1, S.t, 'd5', on);
    const [mx, my] = K.S(cam, -24, -14), [px_, py] = K.S(cam, 3.2, -6);
    if (mx > 10 && mx < PIX.W - 10) PIX.text(cc, '−', mx, my, 'c2', { sc: 2, align: 'center' });
    if (px_ > 10 && px_ < PIX.W - 10) PIX.text(cc, '+', px_, py, 'o1', { sc: 2, align: 'center' });
  }
  // electrons
  ELS.forEach((e, k) => {
    const st = state(e, k, t);
    if (!st) return;
    if (st.hit) {
      const age = t - st.tHit;
      if (e.lead && age < 0.3) { const [sx, sy] = K.S(cam, st.x, st.y); FX.flash(cc, sx, sy, 6 * (1 - age / 0.3), 'y3', 1 - age / 0.3); }
      return;
    }
    const [sx, sy] = K.S(cam, st.x, st.y);
    if (st.s > 0) {
      const tr = []; for (let j = 0; j < 9; j++) { const q = state(e, k, Math.max(e.tr, t - j * 0.028)); if (q && !q.hit) tr.push(K.S(cam, q.x, q.y)); }
      FX.trail(cc, tr, 1);
    }
    FX.e(cc, sx, sy, e.lead ? 3 : 2, st.a, e.lead);
  });
}
window.S04 = { drawTubeAt, camAt };
SC['s04_acceleration'] = {
  draw(c, t, S) {
    const drawTube = cc => drawTubeAt(cc, t, S);
    const fade = 1 - clamp((t - 0.18) / 0.32);
    if (fade <= 0) drawTube(c);
    else dissolve(c, cc => { const c3 = S03.camB(5), z = K.zl(c3.z, 0.25, MO.cubicIn(clamp(t / 0.5))); S03.drawLattice(cc, 5 + t, { x: c3.x, y: c3.y, z }); }, drawTube, 1 - fade);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // meters for the leading electron
    const ld = lead(t), E = ld ? E_MAX * clamp(ld.s / GAP) : t > 2 ? E_MAX : 0, ma = clamp((t - 1.1) / 0.25) * (1 - clamp((t - 4.55) / 0.25));
    FX.meter(c, 14, 318, 118, E / E_MAX, 'ENERGY', `${Math.round(E)} keV`, 'c2', ma);
    const b = PHYS.beta(E);
    FX.meter(c, 14, 342, 118, b, 'SPEED', `${b.toFixed(2)} c`, 'c3', ma);
    // labels and notes
    const cam = camAt(t);
    if (t > 1.0 && t < 3.9) {
      const [ax, ay] = K.S(cam, -9, -6.2);
      CAP.note(c, t, { ax, ay, x: Math.max(14, Math.min(ax - 40, 256 - PIX.textWidth('ELECTRIC FIELD'))), y: Math.round(ay) - 26, text: 'ELECTRIC FIELD', t0: 1.05, t1: 3.3, col: 'd8' });
    }
    CAP.note(c, t, { x: 256, y: 120, text: 'vacuum: no air in the way', t0: 2.0, t1: 3.5, align: 'right', box: true });
    CAP.note(c, t, { x: 14, y: 366, text: 'half the speed of light', t0: 3.65, t1: 4.55, col: 'c3', box: true });
    CAP.scene(c, t, { title: 'HIGH-VOLTAGE ACCELERATION', ctx: 'Negative electrons rush to the + anode.', t0: 0.12, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'pull_back', 0.8, 0, 0.75], [0.12, 'type', 0.5], [0.9, 'hv_on', 1], [1.25, 'accel_rise', 1, 0, 3.0], [1.05, 'blip', 0.4, -0.2],
      [2.0, 'blip', 0.4, 0.5], [3.65, 'blip', 0.5, 0], [4.2, 'zoom_rush', 0.9, 0, 0.8]];
    for (let k = 0; k < 7; k++) q.push([1.25 + k * 0.125, 'chirp', 0.55, -0.3 + k * 0.1, k]);
    for (let k = 0; k < 6; k++) q.push([1.25 + flight() + k * 0.125, 'hit_tick', 0.6, 0.3, k]);
    return q;
  },
};
})();
