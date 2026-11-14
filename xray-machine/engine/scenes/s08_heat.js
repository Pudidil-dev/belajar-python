// S08 X-RAYS + HEAT (34–38 s): a fast pull-back out of the atom. The lattice heats up — most electrons simply jostle
// atoms (heat), only a few make X-rays — until the metal becomes the glowing focal spot on the anode disc, seen at an
// angle so its spin shows: the spot heats a short arc of the tungsten track, which carries the heat round the ring and
// cools. Over 99% of the beam's energy ends up as heat. The view then turns back to the side cutaway (S09).
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU, AX = -40;
const PHI0 = 1.0;
const phiAt = t => PHI0 * (1 - MO.sineInOut(clamp((t - 2.55) / 1.3)));
const camL = t => { const S7 = window.S07.camAt(5), q = MO.cubicIn(clamp(t / 0.7)); return { x: lerp(S7.x, S7.x + 40, q), y: lerp(S7.y, S7.y + 10, q), z: K.zl(S7.z, 0.62, q) }; };
const camD = t => {
  if (t < 2.55) { const p = MO.expoOut(clamp((t - 0.45) / 1.6)); return { x: lerp(0, -8, p), y: lerp(2, -30, p), z: K.zl(34, 2.45, p) }; }
  const p = MO.sineInOut(clamp((t - 2.55) / 1.45)); return { x: lerp(-8, 0, p), y: lerp(-30, 22, p), z: K.zl(2.45, 3.0, p) };
};
window.S08 = { camD };
// sparks in the hot lattice: most are heat (orange), a few are photons (violet)
const SPARK = []; for (let k = 0; k < 70; k++) SPARK.push({ t: 0.05 + k * 0.0156, a: Math.floor(h(k, 1) * 300), ph: h(k, 2) < 0.08, ang: h(k, 3) * TAU });
function drawLattice(c, t, S) {
  const cam = camL(t), heat = MO.smooth(clamp(t / 0.6));
  const SHB = [[0.2, 0.04, 1.25], [0.39, 0.06, 1.0], [0.6, 0.08, 0.8], [0.83, 0.11, 0.42]];
  const vis = TW.draw(c, cam, S.t, { vib: 0.4 + 2.4 * heat, heat: 0.85 * heat, gain: 0.7, shells: a => a === TW.B ? SHB : undefined, nucScale: a => a === TW.B ? 0.45 : 1 });
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (const sp of SPARK) {
    const age = t - sp.t; if (age < 0 || age > 0.35 || !vis.length) continue;
    const [a, sx, sy] = vis[sp.a % vis.length];
    if (sp.ph) FX.ph(c, sx + Math.cos(sp.ang) * age * 260, sy + Math.sin(sp.ang) * age * 260, sp.ang, 4, 10, 3, 1);
    else FX.flash(c, sx, sy, 4 * (1 - age / 0.35), age < 0.1 ? 'y3' : 'o1', 1 - age / 0.35);
  }
}
// the anode disc at view angle phi (0 = edge-on side view), in tube millimetres
function drawDisc(c, t, phi, S) {
  const sp = Math.sin(phi), xc = 0, w = S.t * 2.2;                          // spin (visual rate); focal spot at (0, 0)
  const E = (r, th) => [xc + r * Math.cos(th) * sp, AX + r * Math.sin(th)];
  const ell = (r, col) => { c.beginPath(); c.ellipse(xc, AX, Math.max(0.01, r * sp), r, 0, 0, TAU); c.fillStyle = PIX.P[col]; c.fill(); };
  ell(51, 'd4'); ell(50, 'd6');
  // tungsten track, coloured by temperature: hottest at the focal spot, a trail carried round by the spin, cooling
  const N = 96;
  for (let k = 0; k < N; k++) {
    const th0 = k / N * TAU, th1 = (k + 1) / N * TAU, mid = (th0 + th1) / 2;
    const d = K.wrap(mid - Math.PI / 2, TAU), T = Math.exp(-d / 1.25) + 0.12;
    const col = T > 0.9 ? 'y3' : T > 0.68 ? 'y2' : T > 0.5 ? 'o1' : T > 0.36 ? 'o0' : T > 0.25 ? 'r2' : T > 0.18 ? 'r1' : 'y1';
    const p = [E(35, th0), E(45, th0), E(45, th1), E(35, th1)];
    c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = PIX.P[col]; c.fill();
  }
  // spinning marks on the molybdenum body
  for (let k = 0; k < 10; k++) { const th = k / 10 * TAU + w; const [x0, y0] = E(14, th), [x1, y1] = E(31, th); PIX.line(c, x0, y0, x1, y1, 'd5', 0.8 / Math.max(0.3, sp)); }
  ell(9, 'd4'); ell(5, 'd3');
  FX.glowW(c, xc, 0, 9, ['r2', 'o0', 'o1', 'y2', 'y3'], 1.1, 1.4);
}
function drawDiscView(c, t, S) {
  const cam = camD(t), phi = phiAt(t), cp = Math.cos(phi);
  K.cam(c, cam); c.scale(cp, 1);
  TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: phi < 0.08 ? 0.9 : 0, noDisc: phi >= 0.08, coll: true });
  K.cam(c, cam);
  if (phi >= 0.08) drawDisc(c, t, phi, S);
  // electron beam from the cathode cup to the focal spot
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [x0, y0] = K.S(cam, -15 * cp, 0), [x1, y1] = K.S(cam, 0, 0);
  for (let k = 0; k < 14; k++) { const q = K.wrap(S.t * 2.6 + k / 14, 1); FX.e(c, lerp(x0, x1, q * q), lerp(y0, y1, q * q) + Math.sin(k * 7) * 1.5, 1, 1); }
  // X-ray photons leaving the focal spot (a few), downward toward the window
  for (let k = 0; k < 10; k++) {
    const t0 = 1.2 + k * 0.25, age = t - t0; if (age < 0 || age > 1.6) continue;
    const ang = Math.PI / 2 + (h(k, 11) - 0.5) * 1.3, d = age * 46;
    const [sx, sy] = K.S(cam, Math.cos(ang) * d, Math.sin(ang) * d);
    FX.ph(c, sx, sy, ang, 4.5, 11, 3, clamp(age / 0.08) * clamp((1.6 - age) / 0.2));
  }
}
SC['s08_heat'] = {
  draw(c, t, S) {
    const fade = clamp((t - 0.45) / 0.25);
    if (fade <= 0) drawLattice(c, t, S);
    else if (fade >= 1) drawDiscView(c, t, S);
    else dissolve(c, cc => drawLattice(cc, t, S), cc => drawDiscView(cc, t, S), fade);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // where the energy goes
    const ba = clamp((t - 1.25) / 0.25) * (1 - clamp((t - 3.7) / 0.2));
    if (ba > 0) {
      const x = 14, y = 82, w = 242, f = MO.cubicOut(clamp((t - 1.25) / 0.6));
      c.save(); c.globalAlpha = ba;
      PIX.rect(c, x - 2, y - 2, w + 4, 24, 'k');
      PIX.rect(c, x, y + 10, Math.round((w - 3) * f), 6, 'o0'); PIX.rect(c, x, y + 10, Math.round((w - 3) * f), 1, 'o1');
      PIX.rect(c, x + w - 3, y + 10, 3, 6, 'p2');
      PIX.text(c, 'HEAT  >99%', x, y, 'o1', { shadow: null, n: Math.floor((t - 1.25) * 40) });
      PIX.text(c, 'X-RAYS  <1%', x + w, y, 'p3', { shadow: null, align: 'right', n: Math.floor((t - 1.45) * 40) });
      c.restore();
    }
    if (t > 1.2) {
      const cam = camD(t), [ax, ay] = K.S(cam, 18 * Math.sin(phiAt(t)), AX - 20);
      if (phiAt(t) > 0.5) CAP.note(c, t, { ax, ay, x: 256, y: 128, text: 'ROTATING ANODE', t0: 1.35, t1: 2.45, align: 'right', col: 'd9', box: true });
    }
    CAP.note(c, t, { x: 14, y: 344, text: 'it spins ~3,000–10,000 times a minute', t0: 1.7, t1: 3.1, col: 'w', box: true });
    CAP.note(c, t, { x: 14, y: 355, text: 'to spread the heat round a ring', t0: 2.2, t1: 3.2, col: 'o2', box: true });
    CAP.scene(c, t, { title: 'X-RAYS + HEAT', ctx: 'Over 99% of the energy becomes heat.', t0: 0.1, t1: 3.92 });
  },
  cues: () => {
    const q = [[0, 'pull_back', 0.9, 0, 1.0], [0.1, 'type', 0.5], [0.15, 'thermal_rumble', 1, 0, 3.8], [0.9, 'anode_spin', 0.8, 0.2, 3.1], [1.25, 'bar_fill', 0.6, 0],
      [1.7, 'blip', 0.4, -0.4], [2.2, 'blip', 0.4, -0.4], [2.55, 'turn', 0.6, 0, 1.3]];
    for (let k = 0; k < 8; k++) q.push([0.125 * k, 'heat_tick', 0.35, (k % 2) - 0.5, k]);
    for (let k = 0; k < 10; k++) q.push([1.2 + k * 0.25, 'energy_pulse', 0.45, 0.2, k]);
    return q;
  },
};
})();
