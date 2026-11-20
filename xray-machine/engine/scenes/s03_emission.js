// S03 THERMIONIC EMISSION (8–13 s): the camera lands on the tungsten filament coil in its focusing cup; a current
// heats it from dull red to yellow-white; then it rushes into the wire's surface: tungsten atoms, conduction electrons
// jiggling in the hot metal, and the most energetic ones escaping into the vacuum to gather in a cloud.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const COILC = { x: -21.4, y: 0 }, HOT = { x: -20.62, y: 0.35 };
const heatAt = t => lerp(0.35, 1, MO.smooth(clamp((t - 0.3) / 1.8)));
const camA = t => {
  if (t < 2.2) { const p = MO.cubicOut(clamp(t / 1.2)); return { x: lerp(COILC.x, -21.2, p), y: lerp(COILC.y, 0.1, p), z: K.zl(7.5, 26, p) }; }
  const q = clamp((t - 2.2) / 0.75), e = MO.expoIn(q);
  return { x: lerp(-21.2, HOT.x, MO.sineInOut(q)), y: lerp(0.1, HOT.y, MO.sineInOut(q)), z: K.zl(26, 1400, e) };
};
// ---------- lattice view (world px; surface at x = 0, metal x < 0) ----------
const SP = 32, ATOMS = [];
for (let i = 0; i < 9; i++) for (let j = -9; j <= 9; j++) ATOMS.push({ x: -16 - i * SP, y: j * SP + (i % 2) * SP / 2, i, j });
const camB = t => {
  const q = clamp((t - 2.55) / 0.7);
  const z = K.zl(2.8, 1.0, MO.cubicOut(q)) * (1 + 0.08 * MO.sineInOut(clamp((t - 3.25) / 1.75)));
  return { x: lerp(-30, 12, MO.sineInOut(clamp((t - 2.55) / 2.45))), y: 0, z };
};
// conduction electrons: smooth wandering inside the metal; escapers break out on 16th notes
const NE = 26, ESC = [3.0, 3.25, 3.375, 3.625, 3.75, 4.0, 4.125, 4.375, 4.5, 4.75];
const EL = [];
for (let k = 0; k < NE; k++) EL.push({ bx: -16 - h(k, 1) * 200, by: (h(k, 2) - 0.5) * 420, esc: k < ESC.length ? ESC[k] : null });
EL.forEach((e, k) => { if (e.esc != null) { e.bx = -7 - h(k, 3) * 5; e.by = (h(k, 4) - 0.5) * 230; } });
// electrons that left earlier: the space-charge cloud hovering in front of the surface
const CLOUD = []; for (let k = 0; k < 16; k++) CLOUD.push({ x: 22 + h(k, 31) * 80, y: (h(k, 32) - 0.5) * 300 });
window.S03_CLOUD = CLOUD;
const cloudPos = (e, k, t) => [e.x + (K.vn3(k * 2.3, 1.5, t * 0.9, 41) - 0.5) * 26, e.y + (K.vn3(k * 2.3, 4.5, t * 0.9, 43) - 0.5) * 30];
const wander = (e, k, t, amp) => [e.bx + (K.vn3(k * 3.1, 0.5, t * 2.2, 11) - 0.5) * 2 * amp + Math.sin(t * 23 + k) * 1.2, e.by + (K.vn3(k * 3.1, 7.5, t * 2.2, 13) - 0.5) * 2 * amp + Math.cos(t * 19 + k * 2) * 1.2];
const elPos = (e, k, t) => {
  const amp = e.esc != null ? 6 : 20;
  if (e.esc == null || t < e.esc) return { p: wander(e, k, t, amp), out: false };
  const [x0, y0] = wander(e, k, e.esc, amp), dt = t - e.esc, tau = 0.45, v0 = 120 + h(k, 5) * 50;
  const x = x0 + v0 * tau * (1 - Math.exp(-dt / tau)) + 9 * dt, y = y0 + (h(k, 6) - 0.5) * 50 * (1 - Math.exp(-dt / 0.8)) - y0 * 0.25 * (1 - Math.exp(-dt / 0.9));
  return { p: [x, y], out: true, dt };
};
function drawLattice(c, t, cam) {
  ATOMS.forEach(a => { a.sx = null; });
  K.cam(c, cam);
  // hot metal: dark red base with an orange glow under the atoms
  PIX.rect(c, -600, -700, 600, 1400, 'r0');
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [sx0] = K.S(cam, 0, 0);
  K.dith(c, 0, 0, Math.max(0, sx0), H, 'r1', 0.12, 0);
  const img = K.pbegin(c);
  const vib = 1.4;
  for (const a of ATOMS) {
    const ox = (K.vn3(a.i * 1.7, a.j * 1.3, t * 3.2, 21) - 0.5) * 2 * vib, oy = (K.vn3(a.i * 1.7, a.j * 1.3, t * 3.2, 23) - 0.5) * 2 * vib;
    const [sx, sy] = K.S(cam, a.x + ox, a.y + oy);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    FX.cloud(img, sx, sy, 10 * cam.z, t, { gain: 0.8, seed: a.i * 7 + a.j });
    a.sx = sx; a.sy = sy;
  }
  K.pend(c, img);
  for (const a of ATOMS) if (a.sx != null) FX.nuc(c, a.sx, a.sy, 2 * cam.z, a.i + a.j);
  // the surface: a dashed line
  for (let y = 0; y < H; y += 4) if ((y >> 2) % 2 === 0) PIX.rect(c, Math.round(sx0), y, 1, 2, 'd6');
  // electrons: the hovering cloud, then the ones still in the metal and the escapers
  CLOUD.forEach((e, k) => { const [x, y] = cloudPos(e, k, t), [sx, sy] = K.S(cam, x, y); FX.e(c, sx, sy, 2, 0.85); });
  EL.forEach((e, k) => {
    const st = elPos(e, k, t), [sx, sy] = K.S(cam, st.p[0], st.p[1]);
    if (st.out && st.dt < 0.25) FX.flash(c, K.S(cam, ...wander(e, k, e.esc, 6))[0], K.S(cam, ...wander(e, k, e.esc, 6))[1], 5 * (1 - st.dt / 0.25), 'c3', 1 - st.dt / 0.25);
    if (st.out) { const tr = []; for (let j = 0; j < 6; j++) { const q = elPos(e, k, Math.max(e.esc, t - j * 0.03)); tr.push(K.S(cam, q.p[0], q.p[1])); } FX.trail(c, tr, 0.9); }
    FX.e(c, sx, sy, st.out ? 3 : 2, 1, st.out && st.dt < 0.4);
  });
}
window.S03 = { drawLattice: (c, t, cam) => drawLattice(c, t, cam), camB };
SC['s03_emission'] = {
  draw(c, t, S) {
    const g = heatAt(t);
    const drawA = cc => {
      const cam = camA(t);
      K.cam(cc, cam);
      TUBE.draw(cc, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: g, hv: 0 });
      // current: electrons drifting along the coil wire (front half of each turn)
      if (cam.z > 10 && cam.z < 300) {
        cc.setTransform(1, 0, 0, 1, 0, 0);
        const n = TUBE.COIL.length;
        for (let k = 0; k < 18; k++) {
          const idx = Math.floor(K.wrap(t * 0.11 + k / 18, 1) * (n - 1)), p = TUBE.COIL[idx];
          if (p[2] < 0) continue;
          const [sx, sy] = K.S(cam, p[0], p[1]); FX.e(cc, sx, sy, 1, 0.9);
        }
      }
    };
    const fade = clamp((t - 2.55) / 0.3);
    if (fade <= 0) drawA(c);
    else if (fade >= 1) drawLattice(c, t, camB(t));
    else dissolve(c, drawA, cc => drawLattice(cc, t, camB(t)), fade);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // labels in the coil view
    if (t < 2.4) {
      const cam = camA(t), L = (x, y) => K.S(cam, x, y);
      { const [ax, ay] = L(-20.8, -3.5); CAP.note(c, t, { ax, ay, x: 196, y: 128, text: 'TUNGSTEN FILAMENT', t0: 0.35, t1: 2.05, align: 'center' }); }
      { const [ax, ay] = L(-27, 4.7); CAP.note(c, t, { ax, ay, x: 30, y: 352, text: 'CURRENT', t0: 0.7, t1: 2.05, col: 'c3' }); }
      CAP.note(c, t, { x: 196, y: 352, text: 'over 2,000 °C', t0: 1.45, t1: 2.05, align: 'center', col: 'y3' });
    }
    // labels in the lattice view
    if (t > 2.8) {
      const cam = camB(t), [sx0] = K.S(cam, 0, 0);
      CAP.note(c, t, { x: Math.round(sx0) + 4, y: 96, text: 'SURFACE', t0: 2.9, t1: 4.6, col: 'd8' });
      CAP.note(c, t, { x: 14, y: 360, text: 'hot metal: electrons jiggle', t0: 2.95, t1: 4.55, col: 'w', box: true });
      CAP.note(c, t, { x: 256, y: 150, text: 'the most energetic', t0: 3.4, t1: 4.6, align: 'right', col: 'c3', box: true });
      CAP.note(c, t, { x: 256, y: 161, text: 'break free', t0: 3.85, t1: 4.6, align: 'right', col: 'c3', box: true });
      CAP.note(c, t, { x: 256, y: 380, text: 'a cloud of electrons', t0: 4.25, t1: 4.85, align: 'right', col: 'w', box: true });
    }
    CAP.scene(c, t, { title: 'THERMIONIC EMISSION', ctx: 'Heat sets electrons free from the metal.', t0: 0.12, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'heat_hum', 0.9, 0, 2.6], [0.12, 'type', 0.5], [0.35, 'blip', 0.45, 0.4], [0.7, 'blip', 0.45, -0.5], [1.45, 'sizzle', 0.6, 0.3, 1.0],
      [2.2, 'zoom_rush', 0.9, 0.2, 0.75], [2.55, 'lattice_in', 0.7, 0, 2.4]];
    ESC.forEach((tt, i) => q.push([tt, 'e_release', 0.7, 0.2 + 0.05 * i, i]));
    return q;
  },
};
})();
