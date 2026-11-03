'use strict';
// ============================================================================
// SCENE COMPOSITOR: 28 micro-scenes in 7 continuous sequences (SC_T, 120 BPM).
// One patient with one tumour; one cyclotron-based facility; one proton
// followed from a hydrogen atom to the end of its range; one Bragg curve; one
// plan. Worlds join with soft zoom crossfades (room → plant → atoms → plant →
// room → nozzle → tissue → molecules → tissue → graph → plan → DNA → room).
// Passes: visual (worlds and crossfades, by time), hud (instruments in the
// picture), tags (leader labels on things), overlays (captions, chips, title).
// ============================================================================
function crossWorld(drawB, k) {
  if (k <= 0) return; if (k >= 1) { drawB(); return; }
  withBuffer(TMPBUF, drawB);
  mixInto(buf, TMPBUF, k);
}
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const xf = (t, a, b) => smooth(seg(t, a, b));
// ============================================================================ cameras
const ROOM_KEYS = [
  [0, 0, -40, 0.62], [0.12, 0, -40, 0.62, lin], [1.0, 0, -26, 1.55, K75], [2.0, 0, -22, 1.62, lin], [4.0, 0, -18, 1.74, lin], [4.8, 0, -90, 0.3, K50],
  [36.3, 0, -70, 0.98], [37.1, 0, -52, 0.66, K50], [39.0, 0, -46, 0.7, lin], [39.6, 0, -8, 1.24, K50], [42.0, 0, -4, 1.3, lin], [42.6, 0, -112, 3.7, K75],
  [70.0, 0, -2, 3.0], [70.3, 0, -4, 2.6, lin], [71.75, 0, -40, 0.62, K50], [72.0, 0, -40, 0.62, lin],
];
function roomCam(t) {
  if (t < 20) return camTrack(ROOM_KEYS.slice(0, 6), t);
  if (t < 60) return camTrack(ROOM_KEYS.slice(6, 12), t);
  return camTrack(ROOM_KEYS.slice(12), t);
}
const PLANT_KEYS = [
  [4.45, -330, 572, 1.0], [5.4, -205, 272, 0.4, K50], [6.0, -190, 262, 0.42, lin], [6.95, 0, 0, 14, K75],
  [12.0, 0, 2, 14], [13.2, 0, 0, 1.45, K50], [14.0, 0, 0, 1.5, lin], [15.2, 0, 2, 4.2, K50], [17.0, 0, 0, 4.5, lin], [20.0, 0, -2, 4.0, lin],
  [22.0, 0, 0, 1.45, K50], [23.0, 0, 0, 1.42, lin], [24.3, -82, 92, 1.9, K50], [25.0, -92, 150, 2.0, lin], [26.2, -96, 246, 3.4, K50], [28.0, -96, 250, 3.6, lin],
  [28.5, -60, 336, 2.5, K50], [30.0, -58, 340, 2.55, lin], [30.5, -26, 428, 3.0, K50], [32.8, -26, 486, 3.0, lin], [33.5, -36, 522, 2.6, K50], [35.6, -92, 562, 2.6, lin],
  [36.6, -300, 568, 1.1, K50],
];
const plantCam = t => camTrack(PLANT_KEYS, t);
const ATOM_KEYS = [[6.65, -120, 0, 0.55], [7.6, -180, 0, 2.3, K50], [8.0, -180, 0, 2.4, lin], [10.0, -180, 4, 2.6, lin], [10.4, -170, 2, 2.6, lin], [11.4, -10, 0, 2.0, K50], [12.0, 30, 0, 2.1, lin], [12.35, 30, 0, 1.3, lin]];
const atomCam = t => camTrack(ATOM_KEYS, t);
const NOZ_KEYS = [[42.35, 0, 40, 0.9], [43.0, 0, -30, 1.12, K50], [44.4, 0, 0, 1.15, lin], [45.1, 0, 196, 2.3, K75]];
const nozCam = t => camTrack(NOZ_KEYS, t);
const STAR_TR = TRACKS[TRACKS.STAR];
const TIS_KEYS = [[44.75, 0, -46, 2.5], [45.5, 0, 24, 2.3, K50], [48.0, 0, 150, 2.2, lin], [48.35, trackX(STAR_TR, 150), 150, 5, ein],
  [54.0, trackX(STAR_TR, STAR_TR.R), STAR_TR.R, 3.4], [55.2, 20, 240, 0.86, K50], [57.2, 20, 240, 0.86, lin]];
const tisCam = t => t < 50 ? camTrack(TIS_KEYS.slice(0, 4), t) : camTrack(TIS_KEYS.slice(4), t);
function molCam(t) {
  const y = molStarY(t), z = t < 50 ? lerp(1.0, 2.4, K75(seg(t, 48.0, 48.6))) : t < 54 ? lerp(2.4, 2.2, seg(t, 50, 54)) : lerp(2.2, 1.0, K75(seg(t, 54.0, 54.4)));
  return new Cam(0, y + 28 / z * 2.2, z);
}
const DNA_KEYS = [[67.0, 0, -10, 0.8], [67.6, 0, -6, 2.1, K75], [70.0, 0, 0, 2.25, lin], [70.35, 0, 0, 3.2, ein]];
const dnaCam = t => camTrack(DNA_KEYS, t);
const GRAPH_VERT = { x: 278, y: 320 - 240 * 0.86, w: 56, h: 400 * 0.86 * 1.15 / 0.8 };
// ============================================================================ room state through the film
function roomState(t) {
  const lights = t < 0.25 ? 0 : t < 0.75 ? seg(t, 0.25, 0.75) : t < 71.0 ? 1 : 1 - seg(t, 71.0, 71.85);
  const armed = t < 0.75 ? 0 : t < 0.9 ? seg(t, 0.75, 0.9) : t < 71.0 ? 1 : 1 - seg(t, 71.0, 71.6);
  let reveal = 0;
  if (t < 20) reveal = ph(t, 1.0, 1.4) * (1 - ph(t, 4.4, 4.8));
  else if (t < 60) reveal = ph(t, 39.0, 39.4);
  else reveal = 1 - ph(t, 71.0, 71.6);
  const imaging = t > 20 && t < 60 ? ph(t, 38.95, 39.4) : 0;
  const cones = t > 39 && t < 41 ? [pulse(t, EV.xray[0], 0.3), pulse(t, EV.xray[1], 0.3)] : null;
  const dose = t > 60 ? doseTumor : null;
  return { lights, armed, reveal, imaging, cones, dose };
}
// the planned dose in the section (S28): high in the tumour, lower along the entrance channel
function doseTumor(lx, ly) {
  const k = 1;
  if (inTumor(lx, ly)) return 0.9 * k;
  if (Math.abs(lx - TUMOR_C[0]) < 9 && ly < TUMOR_C[1] && ly > -BODY.B) return 0.3 * k;
  return 0;
}
const roomScene = t => roomWorld(roomCam(t), t, roomState(t));
function plantOpt(t) {
  return { open: t < 12 ? ph(t, 6.25, 6.6) : 1, mag: t < 12 ? 0 : ph(t, EV.magOn, EV.magOn + 0.4), many: ph(t, 20.6, 21.2), essK: ph(t, EV.ess, EV.ess + 0.3), d3K: ph(t, EV.bend, EV.bend + 0.3) };
}
const plantScene = t => plantWorld(plantCam(t), t, plantOpt(t));
const atomScene = t => atomWorld(atomCam(t), t, {});
const nozScene = t => nozzleWorld(nozCam(t), t, { beamFrom: 42.5 });
const tisScene = t => tissueWorld(tisCam(t), t, { dose: t > 54 ? ph(t, 54.6, 55.6) : 0, curve: t > 54 ? ph(t, 54.9, 55.3) : 0, cx: GRAPH_VERT.x, cw: GRAPH_VERT.w, focus: t > 54 ? 1 : 0, noSnout: t > 50 });
const molScene = t => moleculeWorld(molCam(t), t, {});
const graphScene = t => graphWorld(t, { k: ph(t, 57.1, 57.7, lin), vert: GRAPH_VERT });
function planView(t) {
  const s = t < 63 ? lerp(1.62, 1.9, K50(seg(t, 60.0, 63.0))) : t < 67 ? 1.9 + 0.03 * Math.sin((t - 63) * 1.3) : lerp(1.9, 5.0, ein(seg(t, 67.0, 67.4)));
  const c = t < 67 ? [160, 196] : [lerp(160, 140, seg(t, 67, 67.4)), lerp(196, 150, seg(t, 67, 67.4))];
  return { cx: c[0], cy: c[1], s, rot: 0.35 * Math.sin((t - 60) * 0.55) };
}
const planScene = t => plan3dWorld(t, { view: planView(t), sel: t < 63 && t >= EV.layer ? 4 : -1, scan: t >= 63, frame: t < 67 ? 1 : 1 - seg(t, 67, 67.3) });
const dnaScene = t => dnaWorld(dnaCam(t), t, {});
// ============================================================================ pass 1: the worlds and the crossfades between them
function visual(t) {
  if (t < 4.45) roomScene(t);
  else if (t < 4.85) { roomScene(t); crossWorld(() => plantScene(t), xf(t, 4.45, 4.85)); }
  else if (t < 6.65) plantScene(t);
  else if (t < 7.0) { plantScene(t); crossWorld(() => atomScene(t), xf(t, 6.65, 7.0)); }
  else if (t < 12.0) atomScene(t);
  else if (t < 12.35) { atomScene(t); crossWorld(() => plantScene(t), xf(t, 12.0, 12.35)); }
  else if (t < 36.3) plantScene(t);
  else if (t < 36.75) { plantScene(t); crossWorld(() => roomScene(t), xf(t, 36.3, 36.75)); }
  else if (t < 42.35) roomScene(t);
  else if (t < 42.7) { roomScene(t); crossWorld(() => nozScene(t), xf(t, 42.35, 42.7)); }
  else if (t < 44.75) nozScene(t);
  else if (t < 45.1) { nozScene(t); crossWorld(() => tisScene(t), xf(t, 44.75, 45.1)); }
  else if (t < 48.0) tisScene(t);
  else if (t < 48.35) { tisScene(t); crossWorld(() => molScene(t), xf(t, 48.0, 48.35)); }
  else if (t < 54.0) molScene(t);
  else if (t < 54.4) { molScene(t); crossWorld(() => tisScene(t), xf(t, 54.0, 54.4)); }
  else if (t < 56.8) tisScene(t);
  else if (t < 57.1) { tisScene(t); crossWorld(() => graphScene(t), xf(t, 56.8, 57.1)); }
  else if (t < 59.8) graphScene(t);
  else if (t < 60.2) { graphScene(t); crossWorld(() => planScene(t), xf(t, 59.8, 60.2)); }
  else if (t < 67.0) planScene(t);
  else if (t < 67.4) { planScene(t); crossWorld(() => dnaScene(t), xf(t, 67.0, 67.4)); }
  else if (t < 70.0) dnaScene(t);
  else if (t < 70.35) { dnaScene(t); crossWorld(() => roomScene(t), xf(t, 70.0, 70.35)); }
  else roomScene(t);
}
// ============================================================================ the hook (S02–S03): target, beam axis, one proton, its Bragg curve
const HOOK = { snout: -RM.snout, skin: -BODY.B + 2, stop: 6 };
const HOOK_EV = (() => { const o = []; let acc = 0; for (let y = HOOK.skin + 0.5; y < HOOK.stop; y += 0.25) { acc += Math.pow(HOOK.stop - y + 1.2, -0.44) * 0.25; if (acc > 1.15) { acc -= 1.15; o.push(y); } } return o; })();
function hookProtonY(t) {
  if (t < EV.shot) return null;
  if (t < EV.skin) return lerp(HOOK.snout, HOOK.skin, seg(t, EV.shot, EV.skin));
  const L = HOOK.stop - HOOK.skin, u = seg(t, EV.skin, EV.stop3);
  return HOOK.stop - L * Math.pow(1 - u, 1 / 0.72);
}
function hookOverlay(t) {
  if (t < 1.0 || t > 4.5) return;
  const cam = roomCam(t), off = bodyOffset(t), out = 1 - ph(t, 4.15, 4.45);
  const tx = cam.x(0), ty = cam.y(0);
  // the beam axis from the nozzle to the tumour, with depth ticks
  const ak = ph(t, EV.align, EV.align + 0.25) * out;
  if (ak > 0) withDither(ak * 0.9, () => { dashLine(tx, cam.y(HOOK.snout), tx, cam.y(HOOK.stop + 4), P.PC4, 3, 3, t * 18); for (let y = HOOK.skin; y < HOOK.stop; y += 8) line(tx - 3, cam.y(y), tx + 3, cam.y(y), P.PC3); });
  // the target reticle locks on
  const rk = ph(t, EV.target - 0.25, EV.target) * out;
  if (rk > 0) withDither(rk, () => { const r = lerp(30, 13, K75(seg(t, EV.target - 0.25, EV.target))) * cam.z; ring(tx, ty, r, 1.2, P.YEL); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; line(tx + Math.cos(a) * (r + 2), ty + Math.sin(a) * (r + 2), tx + Math.cos(a) * (r + 7), ty + Math.sin(a) * (r + 7), P.YEL); } });
  // deposit marks along the track (denser toward the end), the proton itself, then the dose at the stop
  const py = hookProtonY(t);
  if (py !== null) {
    for (const y of HOOK_EV) { if (y > py) break; const ev = EV.ticks3.some(tt => Math.abs(hookProtonY(tt) - y) < 1.2); const sx = tx + (hash(Math.round(y * 7)) - 0.5) * 3 * cam.z, sy = cam.y(y); withDither(out, () => rect(sx - 1, sy - 1, sx + 1, sy + 1, y > HOOK.stop - 8 ? P.DE3 : P.DE2)); if (ev) withDither(out * 0.7, () => glow(sx, sy, 6, P.DE1, P.DE3, 1)); }
    if (t < EV.stop3 + 0.35) { const sy = cam.y(py); if (t < EV.stop3) streak(tx, sy - 16, tx, sy, P.PC0, P.PC2, 2); proton(tx, sy, Math.max(2, 2.2 * cam.z * 0.8), out); }
    const dk = ph(t, EV.stop3, EV.stop3 + 0.4) * out; if (dk > 0) glow(tx, cam.y(HOOK.stop - 2), 16 * cam.z * 0.8, P.DE1, P.DE3, 0.75 * dk);
  }
  // the dose along the track, drawn as a ribbon around the beam axis: thin at the entrance, widest at the peak, nothing beyond
  const ck = seg(t, EV.stop3, EV.stop3 + 0.5), ca = out * ph(t, EV.stop3, EV.stop3 + 0.12);
  if (ca > 0) {
    const D = y => y < HOOK.stop ? Math.pow(HOOK.stop - y + 1.2, -0.44) : Math.max(0, Math.pow(1.2, -0.44) * (1 - (y - HOOK.stop) / 2.2)), Dm = Math.pow(1.2, -0.44);
    const yEnd = lerp(HOOK.skin, HOOK.stop + 2.2, K75(ck)), L = [], R = [];
    for (let y = HOOK.skin; y <= yEnd; y += 0.5) { const w = (1.2 + D(y) / Dm * 15) * cam.z; L.push(tx - w, cam.y(y)); R.push(tx + w, cam.y(y)); }
    if (L.length > 2) {
      const poly_ = [...L]; for (let i = R.length - 2; i >= 0; i -= 2) poly_.push(R[i], R[i + 1]);
      withDither(0.55 * ca, () => poly(poly_, P.DE2));
      withDither(ca, () => { polyline(L, P.DE3); polyline(R, P.DE3); });
    }
  }
}
// ============================================================================ pass 2: instruments
function boxLabel(s, x, y, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.18, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1); if (k <= 0) return;
  const tw_ = textW(FS, s, 2), x0 = Math.round(x - tw_ / 2);
  withDither(k, () => { rect(x0 - 6, y - 5, x0 + tw_ + 6, y + 17, P.K0); rect(x0 - 6, y + 15, x0 + tw_ + 6, y + 17, col); text(FS, s, x0, y, { sc: 2, c: P.INK, ol: null }); });
}
function hud(t) {
  hookOverlay(t);
  // C — the energy staircase, the magnet's side view, the force and motion arrows on the proton
  energyStair(t, ph(t, 14.0, 14.3) * (1 - ph(t, 22.9, 23.25)));
  magnetSide(t, ph(t, 17.5, 17.8) * (1 - ph(t, 19.75, 20.0)));
  if (t >= EV.force && t < 20.0) {
    const cam = plantCam(t), p = cycProton(t);
    if (p && p.c) {
      const k = ph(t, EV.force, EV.force + 0.25) * (1 - ph(t, 19.75, 20.0)), sx = cam.x(p.p[0]), sy = cam.y(p.p[1]);
      const fx = p.c[0] - p.p[0], fy = p.c[1] - p.p[1], fl = Math.hypot(fx, fy) || 1, ux = fx / fl, uy = fy / fl;
      withDither(k, () => { arrow(sx, sy, sx + p.v[0] * 34, sy + p.v[1] * 34, 2, P.M6); arrow(sx, sy, sx + ux * 30, sy + uy * 30, 2, P.MG3); rightAngle(sx, sy, p.v[0], p.v[1], ux, uy, 7, P.INK); });
    }
  }
  // D — the focusing lanes; the force on the beam in the dipole
  quadLanes(t, ph(t, 30.3, 30.6) * (1 - ph(t, 32.85, 33.1)));
  if (t >= EV.bend && t < 35.4) {
    const cam = plantCam(t), k = ph(t, EV.bend, EV.bend + 0.3) * (1 - ph(t, 35.1, 35.4));
    for (const f of [0.3, 0.65]) { const s = lerp(BLM.d3.s, BLM.d3e.s, f), [x, y] = BL.path.at(s), tn = BL.path.tan(s), sx = cam.x(x), sy = cam.y(y); withDither(k, () => { arrow(sx, sy, sx + tn[0] * 26, sy + tn[1] * 26, 2, P.M6); arrow(sx, sy, sx - tn[1] * 24, sy + tn[0] * 24, 2, P.MG3); }); }
  }
  // E — the rotation path of the nozzle; the X-ray check
  if (t >= EV.rotate - 0.2 && t < EV.locked + 0.5) {
    const cam = roomCam(t), k = ph(t, EV.rotate - 0.2, EV.rotate) * (1 - ph(t, EV.locked + 0.2, EV.locked + 0.5)), r = 196;
    withDither(k * 0.8, () => { const q = []; for (let i = 0; i <= 30; i++) { const a = lerp(PARK, 0, i / 30), [x, y] = polar(a, r); q.push(cam.x(x), cam.y(y)); } for (let i = 0; i + 3 < q.length; i += 4) line(q[i], q[i + 1], q[i + 2], q[i + 3], P.YEL); const [ex, ey] = polar(0, r); arrowHead(cam.x(ex), cam.y(ey), 0, 5, P.YEL); });
  }
  xrayPanel(t, ph(t, 39.55, 39.85) * (1 - ph(t, 41.8, 42.05)));
  // F — the graph's labels
  if (t >= 57.4 && t < 60.0) {
    const k = ph(t, 57.55, 57.8) * (1 - ph(t, 59.8, 60.0));
    withDither(k, () => { text(FS, 'TISSUE DEPTH', G.x0 + G.w - textW(FS, 'TISSUE DEPTH', 2), G.y0 + 12, { sc: 2, c: P.SUB, ol: P.SH }); text(FS, 'RELATIVE DOSE', G.x0 - 4, G.y0 - G.h - 30, { sc: 2, c: P.SUB, ol: P.SH }); text(FS, 'TUMOR', G.x0 + G.w * (0.7 / 1.15), G.y0 - G.h - 10, { sc: 1, c: P.TU3, ol: null }); });
    boxLabel('LOWER ENERGY', 112, 104, EV.lower + 0.1, 59.95, t, P.DE3); boxLabel('→ SHALLOWER RANGE', 132, 128, EV.lower + 0.2, 59.95, t, P.DE3);
    boxLabel('HIGHER ENERGY', 196, 418, EV.higher + 0.1, 59.95, t, P.DE3); boxLabel('→ DEEPER RANGE', 196, 442, EV.higher + 0.2, 59.95, t, P.DE3);
  }
  // G — the plan's energy readout
  if (t >= 60.3 && t < 67.0) {
    const k = ph(t, 60.5, 60.8) * (1 - ph(t, 66.75, 67.0)), lv = t < EV.energySet ? 5 * ph(t, EV.layer, EV.energySet) : t < 63 ? 5 : 5 - (t >= EV.layer2) - (t >= EV.layer3) - (t >= EV.lapse) - (t >= EV.lapse + 0.25);
    const k_ = t < 63 ? 4 : layerOf(t), ly = p3(0, LAYERS[k_][0], 0, planView(t))[1];
    planEnergy(t, Math.round(lv), k, ly);
  }
  recapList(t);
}
// ============================================================================ pass 3: leader-line tags on the things themselves
function tags(t) {
  if (t < 1.0) return;
  if (t < 4.5) {
    const c = roomCam(t);
    tag('TUMOR', c.x(10), c.y(-6), 210, 300, 1.55, 2.2, t, P.TU3, 2);
    tag('NOZZLE', c.x(14), c.y(-120), 210, 112, 1.6, 2.4, t, P.M6, 2);
    tag('PROTON', c.x(3), c.y(hookProtonY(Math.max(t, EV.shot)) || 0), 200, 150, 2.3, 2.95, t, P.PC3, 2);
    tag('THE PEAK: IN THE TUMOR', c.x(-16), c.y(HOOK.stop - 3), 24, 420, 3.3, 4.2, t, P.DE3, 2);
    return;
  }
  if (t < 6.6) {
    const c = plantCam(t), S = (x, y) => [c.x(x), c.y(y)];
    let a = S(BLM.iso.x - 120, BLM.iso.y); tag('TREATMENT ROOM', a[0], a[1], 24, 436, 4.85, 5.6, t, P.BK2, 2);
    a = S(BLM.q1.x, BLM.q1.y); tag('BEAM LINE', a[0], a[1], 200, 330, 5.15, 6.1, t, P.PC3, 2);
    a = S(VAULT.x1 + 20, -60); tag('SHIELDING', a[0], a[1], 180, 120, 5.35, 6.2, t, P.CO4, 2);
    return;
  }
  if (t < 12.2) {
    const c = atomCam(t), S = (x, y) => [c.x(x), c.y(y)], A = atomPos(ATOMS[ATOMS.length - 1], t);
    let a = S(A[0], A[1]); tag('PROTON', a[0] + 3, a[1] - 3, 200, 150, 7.55, 8.3, t, P.PC3, 2);
    { const ang = 0.6 + 2.0 * t; a = S(A[0] + Math.cos(ang) * AT.orb, A[1] + Math.sin(ang) * AT.orb * 0.92); tag('ELECTRON', a[0], a[1], 40, 400, 7.65, 8.4, t, P.EL2, 2); }
    const fe = fastElectron(t); if (fe) { a = S(fe[0], fe[1]); tag('FAST ELECTRON', a[0], a[1], 30, 150, 8.5, 8.98, t, P.EL2, 2); }
    const fr = freedElectron(t); if (fr) { a = S(fr[0], fr[1]); tag('ELECTRON REMOVED', a[0], a[1], 120, 420, 9.05, 9.95, t, P.EL2, 2); }
    if (t > EV.bare && t < 10.4) { a = S(A[0], A[1]); tag('BARE PROTON (H+)', a[0], a[1] + 4, 40, 130, 9.3, 10.3, t, P.PC3, 2); }
    a = S(-60, -150); tag('ION SOURCE', a[0], a[1], 30, 130, 10.45, 11.4, t, P.N6, 2);
    a = S(AT.wall0, AT.slit + 6); tag('SLIT', a[0], a[1], 150, 420, 10.7, 11.5, t, P.M5, 2);
    a = S(160, -40); tag('VACUUM: ALMOST NO GAS', a[0], a[1], 60, 132, 11.25, 12.1, t, P.M5, 2);
    return;
  }
  if (t < 25.2) {
    const c = plantCam(t), S = (x, y) => [c.x(x), c.y(y)];
    let a = S(-108, -40); tag('MAGNET', a[0], a[1], 24, 130, 12.6, 13.5, t, P.M5, 2);
    a = S(40, -50); tag('ELECTRODE', a[0], a[1], 190, 120, 12.95, 13.8, t, P.M6, 2);
    a = S(SRC[0] - 3, SRC[1]); tag('ION SOURCE', a[0], a[1], 40, 450, 13.3, 13.98, t, P.M6, 2);
    a = S(0, 30); tag('GAP', a[0], a[1], 200, 130, 14.4, 15.4, t, P.INK, 2);
    a = S(0, -32); tag('ELECTRIC FIELD', a[0], a[1], 150, 112, 14.75, 16.0, t, P.PC3, 2);
    a = S(22, -34); tag('MAGNETIC FIELD', a[0], a[1], 170, 104, 17.3, 18.4, t, P.MG3, 2);
    { const p = cycProton(t); if (p && p.c && t >= EV.force && t < 19.6) { const sx = c.x(p.p[0]), sy = c.y(p.p[1]), fx = p.c[0] - p.p[0], fy = p.c[1] - p.p[1], fl = Math.hypot(fx, fy) || 1; tag('FORCE', sx + fx / fl * 30, sy + fy / fl * 30, 30, 250, 17.45, 18.6, t, P.MG3, 2); tag('MOTION', sx + p.v[0] * 34, sy + p.v[1] * 34, 210, 250, 17.55, 18.6, t, P.M6, 2); } }
    tag('NO ENERGY GAIN', 150, 420, 176, 360, EV.noGain, 19.7, t, P.PC3, 2);
    a = S(30, 52); tag('SPIRAL PATH', a[0], a[1], 200, 470, 20.6, 21.6, t, P.PC3, 2);
    a = S(-70, 38); tag('WIDER ORBIT, MORE ENERGY', a[0], a[1], 40, 120, 21.7, 22.9, t, P.PC3, 2);
    a = S(-88, -36); tag('DEFLECTOR', a[0], a[1], 150, 120, 23.4, 24.2, t, P.M6, 2);
    { const s = streamS(Math.max(0, t - EV.extract)), q = BL.path.at(Math.min(s, 120)); a = S(q[0], q[1]); tag('EXTRACTED BEAM', a[0], a[1], 150, 440, 24.15, 25.1, t, P.PC3, 2); }
    return;
  }
  if (t < 36.3) {
    const c = plantCam(t), S = (x, y) => [c.x(x), c.y(y)];
    let a = S(BLM.deg.x, BLM.deg.y - 40); tag('HIGHER ENERGY', a[0], a[1], 170, 130, 25.3, 27.9, t, P.PC3, 2);
    a = S(BLM.deg.x + 14, BLM.deg.y); tag('GRAPHITE DEGRADER', a[0], a[1], 120, 300, 25.6, 27.2, t, P.M5, 2);
    a = S(BLM.deg.x, BLM.deg.y + 30); tag('LOWER ENERGY', a[0], a[1], 170, 440, EV.slow, 27.95, t, P.PC3, 2);
    a = S(BLM.d1.x + 30, BLM.d1.y + 30); tag('SELECTOR MAGNET', a[0], a[1], 24, 120, 28.15, 29.0, t, P.MG3, 2);
    a = S(BLM.slit.x + 9, BLM.slit.y - 9); tag('SLIT', a[0], a[1], 200, 160, 28.8, 29.9, t, P.M5, 2);
    a = S(BLM.slit.x - 9, BLM.slit.y + 6); tag('REJECTED', a[0], a[1], 24, 440, 29.05, 29.95, t, P.DE3, 2);
    a = S(BLM.d2e.x, BLM.d2e.y); tag('SELECTED ENERGY', a[0], a[1], 150, 470, EV.pass, 30.1, t, P.PC3, 2);
    a = S(BLM.q1.x - 18, BLM.q1.y + 10); tag('QUADRUPOLE', a[0], a[1], 24, 150, 30.35, 31.2, t, P.M5, 2);
    if (t >= 32.0 && t < 33.0) boxLabel('BOTH PLANES FOCUSED', 156, 300, 32.0, 32.95, t, P.GRN);
    a = S(BLM.d3.x - 16, BLM.d3.y + 26); tag('DIPOLE MAGNET', a[0], a[1], 24, 150, 33.4, 34.4, t, P.MG3, 2);
    a = S(lerp(BLM.d3.x, BLM.d3e.x, 0.5), lerp(BLM.d3.y, BLM.d3e.y, 0.5) + 4); tag('FORCE', a[0], a[1], 200, 160, 33.7, 35.0, t, P.MG3, 2);
    a = S(BLM.d3e.x - 30, BLM.d3e.y); tag('THE BEAM TURNS', a[0], a[1], 40, 440, 34.7, 35.9, t, P.PC3, 2);
    return;
  }
  if (t < 42.6) {
    const c = roomCam(t), phi = gantryAngle(t);
    { const [x, y] = polar(phi + 0.5, 215); tag('GANTRY', c.x(x), c.y(y), 200, 110, 36.9, 37.9, t, P.M6, 2); }
    { const [x, y] = polar(0, 140); tag('PLANNED ANGLE', c.x(x), c.y(y), 180, 150, EV.locked, 39.0, t, P.YEL, 2); }
    const g = xrayGeom(phi, 1);
    { const [x, y] = polar(g.ta, g.rt + 10); tag('X-RAY SOURCE', c.x(x), c.y(y), 170, 110, 39.45, 40.3, t, P.M5, 2); }
    { const [x, y] = polar(g.pa, g.rp + 3); tag('DETECTOR', c.x(x), c.y(y), 30, 110, 39.6, 40.4, t, P.M5, 2); }
    return;
  }
  if (t < 45.1) {
    const c = nozCam(t);
    tag('SCANNING MAGNETS', c.x(-56), c.y(NZ.xm), 24, 140, 42.95, 44.0, t, P.MG3, 2);
    tag('BEAM MONITORS', c.x(-50), c.y(NZ.mon0 + 8), 24, 330, 43.4, 44.4, t, P.M5, 2);
    { const s = nozzleSpot(t), q = spotScreen(s.sp); tag('BEAM SPOT', c.x(q[0]), c.y(q[1]), 190, 450, 43.9, 44.7, t, P.DE3, 2); }
    return;
  }
  if (t < 48.2) {
    const c = tisCam(t);
    tag('SKIN', c.x(40), c.y(3), 200, 150, 45.3, 46.2, t, P.TI4, 2);
    { const tr = TRACKS[3], y = Math.max(10, trackDepth(tr, t) * 0.6); tag('NEARLY STRAIGHT PATHS', c.x(trackX(tr, y)), c.y(y), 24, 420, 46.0, 47.1, t, P.PC3, 2); }
    tag('LOW DOSE, NOT ZERO', c.x(-14), c.y(60), 24, 140, 46.9, 47.95, t, P.DE3, 2);
    return;
  }
  if (t < 54.4) {
    const c = molCam(t), py = c.y(molStarY(t));
    tag('PROTON (+)', c.x(0) + 8, py - 8, 200, 140, 48.45, 49.4, t, P.PC3, 2);
    { const e = MOL_EV[0]; tag('WATER MOLECULE', c.x(e.side * e.dx), c.y(e.y + 4), 24, 120, 48.55, 49.3, t, P.WO, 2); }
    { const e = MOL_EV[0], k = t - e.t; tag('ELECTRON PULLED AWAY', c.x(e.side * e.dx) + e.side * (14 + 120 * k) * c.z * 0.5, c.y(e.y + 4) + (20 * k - 30 * k * k) * c.z * 0.4, 30, 420, 49.05, 49.9, t, P.EL2, 2); }
    { const e = MOL_EV[1]; tag('ION', c.x(e.side * e.dx), c.y(e.y + 4), 220, 330, 49.8, 50.7, t, P.DE3, 2); }
    tag('SLOWER', c.x(0) + 6, py, 210, 150, 51.4, 52.4, t, P.PC3, 2);
    tag('MORE IONIZATION', c.x(0) - 6, py + 10, 30, 430, 52.4, 53.7, t, P.DE3, 2);
    return;
  }
  if (t < 57.0) {
    const c = tisCam(t);
    tag('STOPS HERE', c.x(trackX(STAR_TR, STAR_TR.R)), c.y(STAR_TR.R), 30, 300, 54.45, 55.3, t, P.PC3, 2);
    tag('LOW DOSE AT ENTRY', GRAPH_VERT.x + 6, c.y(60), 120, 150, 55.35, 56.6, t, P.DE3, 2);
    tag('BRAGG PEAK', GRAPH_VERT.x + GRAPH_VERT.w, c.y(400), 190, 330, EV.peak, 56.75, t, P.DE3, 2);
    tag('ALMOST NO DOSE BEYOND', GRAPH_VERT.x + 4, c.y(450), 60, 450, 55.8, 56.75, t, P.DE3, 2);
    return;
  }
  if (t >= 60.2 && t < 67.0) {
    const o = planView(t);
    { const q = p3(-30, LAYERS[2][0], 10, o); tag('TUMOR MODEL', q[0], q[1], 24, 140, 60.4, 61.2, t, P.TU3, 2); }
    { const q = p3(-14, LAYERS[4][0], 14, o); tag('ONE DEPTH LAYER', q[0], q[1], 24, 446, EV.layer, 62.6, t, P.PC4, 2); }
    tag('ENERGY SET', 280, 150, 150, 120, EV.energySet, 63.0, t, P.PC3, 2);
    { const r = plan3dSpot(t); if (r) tag('SPOT', r[0], r[1], 200, 446, 63.1, 63.9, t, P.DE3, 2); }
    if (t >= EV.layer2 && t < 65.0) boxLabel('NEXT LAYER: LOWER ENERGY', 160, 462, EV.layer2, 64.95, t, P.PC3);
    if (t >= EV.covered) boxLabel('THE DOSE COVERS THE TUMOR', 160, 462, EV.covered, 66.95, t, P.DE3);
    return;
  }
  if (t >= 67.4 && t < 70.0) {
    const c = dnaCam(t), phs = 0.25 * Math.sin(t * 0.6);
    tag('DNA', c.x(-90), c.y(strandY(-90, 0, phs)), 40, 140, 67.5, 68.3, t, P.DN2, 2);
    tag('SECONDARY ELECTRON', c.x(-60), c.y(40), 24, 440, 67.6, 68.3, t, P.EL2, 2);
    tag('STRAND BREAK', c.x(BREAKS[0].x), c.y(strandY(BREAKS[0].x, 0, phs)), 24, 118, EV.direct + 0.05, 68.9, t, P.DE3, 2);
    tag('·OH RADICAL', c.x(44), c.y(-46), 196, 196, EV.radical + 0.05, 68.95, t, P.RD2, 2);
    tag('BOTH STRANDS BROKEN', c.x(4), c.y(10), 30, 440, EV.lesion, 69.95, t, P.DE3, 2);
  }
}
// the current spot of the plan view in screen space (for its tag)
function plan3dSpot(t) {
  if (t < EV.spotsL1[0] || t >= EV.covered) return null;
  const k = layerOf(t), T = L_TIMES[k]; let j = 0; while (j + 1 < T.length && t >= T[j + 1]) j++;
  const [X, Z] = L_SPOTS[k][j]; return p3(X, LAYERS[k][0], Z, planView(t));
}
// ============================================================================ frame
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  visual(t);
  hud(t);
  tags(t);
  overlays(t);
}
function engineInit() { bodyInit(); tissueTexInit(); }
