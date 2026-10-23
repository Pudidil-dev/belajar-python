// S04 HEAT RELEASES ELECTRONS (17–24 s): the tube housing seen from the side (as the gantry camera left it) opens into a
// cross-section: cathode, glass vacuum envelope, rotating tungsten anode disc. The camera dives to the cathode: a
// tungsten filament coil in its focusing cup, heated by a current from dull red to white-hot. Then into the hot metal:
// tungsten atoms, conduction electrons jiggling, the most energetic breaking free into the vacuum (thermionic emission) —
// not created, released. Pull back to the cup: a cloud of electrons hovers in front of the filament, aimed at the anode.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const COIL = { x: -21.4, y: 0 }, HOT = { x: -20.62, y: 0.35 };
const cutAt = t => MO.cubicInOut(clamp((t - 0.25) / 0.9));
const heatAt = t => lerp(0.3, 1, MO.smooth(clamp((t - 2.3) / 1.4)));
// camera: settle on the whole insert, glide toward the cathode, dive into the coil, (lattice), pull back to the cup
const C0 = { x: 0, y: -40, z: 0.698 }, C1 = { x: -4, y: -36, z: 0.86 }, C2 = { x: -14, y: -14, z: 1.25 };
const camA = t => {
  if (t < 1.4) return K.camLerp(C0, C1, MO.smooth(clamp(t / 1.4)));
  if (t < 2.2) return K.camLerp(C1, C2, MO.sineInOut((t - 1.4) / 0.8));
  if (t < 3.7) { const q = MO.k75(clamp((t - 2.2) / 1.0)); return K.zoomPath(C2, { x: COIL.x + 0.2, y: COIL.y + 0.1, z: 22 }, q); }
  if (t < 4.0) { const q = MO.expoIn(clamp((t - 3.7) / 0.3)); return { x: lerp(COIL.x + 0.2, HOT.x, q), y: lerp(0.1, HOT.y, q), z: K.zl(22, 900, q) }; }
  // after the lattice: the pull-back to the cup (5.6–7.0)
  const q = MO.cubicOut(clamp((t - 5.55) / 1.3));
  return { x: lerp(-20.2, -16.5, q), y: lerp(0.2, 0, q), z: K.zl(60, 8.5, q) };
};
// ---------- the hot surface (world px; surface at x = 0, metal at x < 0) ----------
const SP = 34, ATOMS = [];
for (let i = 0; i < 9; i++) for (let j = -9; j <= 9; j++) ATOMS.push({ x: -17 - i * SP, y: j * SP + (i % 2) * SP / 2, i, j });
const camB = t => {
  const q = clamp((t - 3.95) / 0.6);
  const z = K.zl(2.8, 1.0, MO.cubicOut(q)) * (1 + 0.06 * MO.sineInOut(clamp((t - 4.55) / 1.0)));
  return { x: lerp(-36, 14, MO.sineInOut(clamp((t - 3.95) / 1.7))), y: 0, z };
};
const NE = 24, ESC = [4.5, 4.625, 4.75, 4.875, 5.0, 5.125, 5.25, 5.375, 5.5];
const EL = [];
for (let k = 0; k < NE; k++) EL.push({ bx: -16 - h(k, 1) * 200, by: (h(k, 2) - 0.5) * 420, esc: k < ESC.length ? ESC[k] : null });
EL.forEach((e, k) => { if (e.esc != null) { e.bx = -7 - h(k, 3) * 5; e.by = (h(k, 4) - 0.5) * 230; } });
const wander = (e, k, t, amp) => [e.bx + (K.vn3(k * 3.1, 0.5, t * 2.2, 11) - 0.5) * 2 * amp + Math.sin(t * 23 + k) * 1.2, e.by + (K.vn3(k * 3.1, 7.5, t * 2.2, 13) - 0.5) * 2 * amp + Math.cos(t * 19 + k * 2) * 1.2];
const elPos = (e, k, t) => {
  const amp = e.esc != null ? 6 : 20;
  if (e.esc == null || t < e.esc) return { p: wander(e, k, t, amp), out: false };
  const [x0, y0] = wander(e, k, e.esc, amp), dt = t - e.esc, tau = 0.45, v0 = 120 + h(k, 5) * 50;
  return { p: [x0 + v0 * tau * (1 - Math.exp(-dt / tau)) + 9 * dt, y0 + (h(k, 6) - 0.5) * 50 * (1 - Math.exp(-dt / 0.8)) - y0 * 0.25 * (1 - Math.exp(-dt / 0.9))], out: true, dt };
};
function drawLattice(c, t, cam) {
  K.cam(c, cam);
  PIX.rect(c, -600, -700, 600, 1400, 'r0');                                       // hot metal: dark red between the atoms
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [sx0] = K.S(cam, 0, 0);
  K.dith(c, 0, 0, Math.max(0, sx0), H, 'r1', 0.14, 0);
  const img = K.pbegin(c), vis = [];
  for (const a of ATOMS) {
    const ox = (K.vn3(a.i * 1.7, a.j * 1.3, t * 3.2, 21) - 0.5) * 2.8, oy = (K.vn3(a.i * 1.7, a.j * 1.3, t * 3.2, 23) - 0.5) * 2.8;
    const [sx, sy] = K.S(cam, a.x + ox, a.y + oy);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    FX.cloud(img, sx, sy, 10.5 * cam.z, t, { gain: 0.8, seed: a.i * 7 + a.j, ramp: 'w' });
    vis.push([sx, sy, a]);
  }
  K.pend(c, img);
  for (const [sx, sy, a] of vis) FX.nuc(c, sx, sy, 2 * cam.z, a.i + a.j);
  for (let y = 0; y < H; y += 4) if ((y >> 2) % 2 === 0) PIX.rect(c, Math.round(sx0), y, 1, 2, 'g6');
  EL.forEach((e, k) => {
    const st = elPos(e, k, t), [sx, sy] = K.S(cam, st.p[0], st.p[1]);
    if (st.out && st.dt < 0.25) { const [fx, fy] = K.S(cam, ...wander(e, k, e.esc, 6)); FX.flash(c, fx, fy, 5 * (1 - st.dt / 0.25), 'c4', 1 - st.dt / 0.25); }
    if (st.out) { const tr = []; for (let j = 0; j < 6; j++) { const q = elPos(e, k, Math.max(e.esc, t - j * 0.03)); tr.push(K.S(cam, q.p[0], q.p[1])); } FX.trail(c, tr, 0.9); }
    FX.e(c, sx, sy, st.out ? 3 : 2, 1, st.out && st.dt < 0.4);
  });
}
// the electron cloud in front of the filament (tube mm), drifting slightly toward the anode
const CLOUD = []; for (let k = 0; k < 22; k++) CLOUD.push({ x: -19.2 + h(k, 31) * 3.6, y: (h(k, 32) - 0.5) * 6.4, s: h(k, 33) });
window.S04 = { CLOUD, cloudAt: (k, t) => { const e = CLOUD[k]; return [e.x + (K.vn3(k * 2.3, 1.5, t * 0.9, 41) - 0.5) * 1.2, e.y + (K.vn3(k * 2.3, 4.5, t * 0.9, 43) - 0.5) * 1.1]; } };
function drawTube(c, t, S) {
  const cam = camA(t), g = heatAt(t);
  K.cam(c, cam);
  TUBE.draw(c, { z: cam.z, t: S.t, cut: cutAt(t), spin: 1.2, fil: g, hv: 0 });
  c.setTransform(1, 0, 0, 1, 0, 0);
  // current through the coil while it heats
  if (cam.z > 6 && cam.z < 200 && t < 4) {
    const n = TUBE.COIL.length;
    for (let k = 0; k < 16; k++) { const idx = Math.floor(K.wrap(t * 0.11 + k / 16, 1) * (n - 1)), p = TUBE.COIL[idx]; if (p[2] < 0) continue; const [sx, sy] = K.S(cam, p[0], p[1]); FX.e(c, sx, sy, 1, 0.9); }
  }
  // after the lattice: the released electrons hover in a cloud in front of the coil
  if (t > 5.5) {
    const a = clamp((t - 5.5) / 0.4);
    CLOUD.forEach((e, k) => { if (e.s > 0.25 + 0.75 * a) return; const [x, y] = window.S04.cloudAt(k, S.t), [sx, sy] = K.S(cam, x, y); FX.e(c, sx, sy, cam.z > 14 ? 2 : 1, 1); });
  }
}
SC['s04_cathode'] = {
  draw(c, t, S) {
    const lat = clamp((t - 3.95) / 0.25) * (1 - clamp((t - 5.55) / 0.3));
    if (lat <= 0) drawTube(c, t, S);
    else if (lat >= 1) drawLattice(c, t, camB(t));
    else dissolve(c, cc => drawTube(cc, t, S), cc => drawLattice(cc, t, camB(t)), lat);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const cam = camA(t), L = (x, y) => K.S(cam, x, y);
    // part labels, one at a time, while the whole insert is in view
    if (t < 2.3) {
      { const [ax, ay] = L(-30, -12); CAP.note(c, t, { ax, ay, x: 22, y: 330, text: 'CATHODE (−)', t0: 0.75, t1: 1.45, col: 'c3', box: true }); }
      { const [ax, ay] = L(4, -66); CAP.note(c, t, { ax, ay, x: 250, y: 126, text: 'ANODE (+)', t0: 1.5, t1: 2.2, col: 'o2', align: 'right', box: true }); }
    }
    if (t > 2.6 && t < 3.9) { const [ax, ay] = L(-20.8, -3.8); CAP.note(c, t, { ax, ay, x: 250, y: 330, text: 'TUNGSTEN FILAMENT', t0: 2.6, t1: 3.75, col: 'w', align: 'right', box: true }); }
    if (t > 4.2 && t < 5.6) CAP.note(c, t, { x: 135, y: 340, text: 'THERMIONIC EMISSION', t0: 4.45, t1: 5.5, col: 'c3', align: 'center', box: true });
    if (t > 5.9) { const [ax, ay] = L(-27, -9); CAP.note(c, t, { ax, ay, x: 22, y: 330, text: 'FOCUSING CUP', t0: 6.0, t1: 6.85, col: 'g9', box: true }); }
    CAP.cap(c, t, { l1: 'X-RAY TUBE', l2: 'HEAT RELEASES ELECTRONS', t0: 0.12, tSwap: 2.6, t1: 6.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0, 'open_cut', 0.8, 0, 0.9], [0.75, 'tag', 0.45, -0.4], [1.5, 'tag', 0.45, 0.4], [2.3, 'heat_hum', 0.9, 0, 1.6], [2.6, 'tag', 0.4, 0.4],
      [3.7, 'zoom_rush', 0.9, 0, 0.3], [4.0, 'lattice_in', 0.6, 0, 1.5], [5.55, 'pull_back', 0.7, 0, 1.3]];
    ESC.forEach((tt, i) => q.push([tt, 'e_release', 0.65, 0.2 + 0.04 * i, i]));
    return q;
  },
  xin: 0.2,
};
})();
