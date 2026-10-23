// PROBE — inside the transducer.
//  • drawCut: the probe head cut open in room space (world cm), used while the camera dives into it: housing shell,
//    backing block, the curved row of crystal elements, matching layer, acoustic lens.
//  • the micro world (units: 1 px at scale 1 ≈ 9 µm, 36 px per element pitch ≈ 0.32 mm): a few crystal elements with
//    their wires and electrodes, the matching layer, the lens, the gel (or an air gap) and the skin, with tissue below.
//    Sound is shown in slow motion (≈ 1,000,000× slower): a pulse of 2–3 cycles, wavelength LAM, speed V. Pressure is
//    drawn as bands (compression bright), and the crystals' thickness follows the same waveform: the same mechanism
//    sends (voltage → deformation → vibration → pressure) and receives (pressure → deformation → voltage).
(() => {
const { P, W, H } = PIX;
const PROBE = window.PROBE = {};
const clamp = U.clamp, lerp = U.lerp;

// ---------- room-space cutaway ----------
const RP = () => US.RP;
PROBE.CR = [US.RP - 0.285, US.RP - 0.235];                       // crystal annulus (radii from the probe's apex)
PROBE.drawCut = (c, cam, a = 1) => {
  if (a <= 0) return;
  const { ax, ay } = ROOM.PRB, z = cam.z, path = ROOM.probePath(ax, ay);
  const ring = (r0, r1, ang = 31 * Math.PI / 180, n = 40) => {
    const pts = [];
    for (let k = 0; k <= n; k++) { const q = -ang + 2 * ang * k / n; pts.push([ax + r1 * Math.sin(q), ay + r1 * Math.cos(q)]); }
    for (let k = n; k >= 0; k--) { const q = -ang + 2 * ang * k / n; pts.push([ax + r0 * Math.sin(q), ay + r0 * Math.cos(q)]); }
    return U.poly(pts);
  };
  const draw = cc => {
    PIX.cam(cc, cam);
    cc.save(); cc.clip(path);
    PIX.fill(cc, path, 'g2');                                                          // backing block
    for (let k = 0; k < 40; k++) { const u = U.hash(k, 3), v = U.hash(k, 4); PIX.fill(cc, PIX.rectPath(ax - 2.5 + 5 * u, ay - 6 + 9.5 * v, 0.06, 0.06), 'g3'); }
    // wires: a flat bundle from the cable down the handle, fanning out to the elements
    for (let k = -3; k <= 3; k++) { cc.beginPath(); cc.moveTo(ax + k * 0.12, ay - 16); cc.lineTo(ax + k * 0.12, ay - 5); cc.quadraticCurveTo(ax + k * 0.2, ay - 1.5, ax + k * 0.62, ay + RP() - 0.3); cc.strokeStyle = P.c1; cc.lineWidth = Math.max(0.03, 1 / z); cc.stroke(); }
    PIX.fill(cc, ring(PROBE.CR[0], PROBE.CR[1]), 'g9');                                // crystal elements
    PIX.fill(cc, ring(PROBE.CR[1], RP() - 0.2), 'g6');                                 // matching layer
    PIX.fill(cc, ring(RP() - 0.2, RP() + 0.05, 34 * Math.PI / 180), 'g3');             // lens
    // kerfs between the 128 elements, once they are wider than a few pixels
    const pitch = 0.0316 * z;
    if (pitch > 2.2) {
      const ang = 31 * Math.PI / 180, n = 128;
      cc.strokeStyle = P.g1; cc.lineWidth = Math.max(1 / z, 0.004);
      for (let e = 0; e <= n; e++) { const q = -ang + 2 * ang * e / n; cc.beginPath(); cc.moveTo(ax + PROBE.CR[0] * Math.sin(q), ay + PROBE.CR[0] * Math.cos(q)); cc.lineTo(ax + PROBE.CR[1] * Math.sin(q), ay + PROBE.CR[1] * Math.cos(q)); cc.stroke(); }
    }
    cc.restore();
    // housing shell (cut edge)
    cc.save(); cc.clip(path); cc.strokeStyle = P.ga; cc.lineWidth = 0.26; cc.stroke(path); cc.restore();
    cc.setTransform(1, 0, 0, 1, 0, 0);
  };
  if (a >= 1) draw(c); else window.shifted(c, cc => { draw(cc); const img = cc.getImageData(0, 0, W, H), d = img.data; for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (K.BAY(x, y) >= a) d[i + 3] = 0; cc.putImageData(img, 0, 0); }, 0, 0);
};

// ---------- the micro world ----------
const M = PROBE.M = {
  PITCH: 36, EW: 30, CX: 135,
  CR0: 228, CR1: 268,                    // crystal top / bottom (rest)
  GND: 270, MAT: 282, LENS: 326,         // ground electrode bottom, matching layer bottom, lens bottom (= the face)
  SKIN: 348, DERM: 372,                  // skin surface (gel or air above), dermis
  LAM: 40, V: 160,                       // drawn wavelength (px) and speed (px/s): f = 4 Hz on screen (an 8th note)
};
M.F = M.V / M.LAM;
M.ex = e => M.CX + e * M.PITCH;          // element centre x
// the waveform of one pulse: 2–3 cycles under a fast-rising, damped envelope (the backing block damps the ringing)
const env = tau => tau < 0 ? 0 : Math.exp(-tau / 0.24) * (1 - Math.exp(-tau / 0.025));
PROBE.wave = tau => tau < 0 || tau > 0.9 ? 0 : 1.25 * env(tau) * Math.sin(U.TAU * M.F * tau);
// the skin surface: rough at this scale (bumps of a few px); air pockets sit in the hollows when there is no gel
const skinTop = x => M.SKIN - 5 * Math.max(0, Math.sin(x * 0.11 + 0.6)) ** 3 - 1.5 * Math.sin(x * 0.37);
PROBE.skinTop = skinTop;

// st: {t, fires: [{t0, e0, e1}], waves: [{y0, t0, dir, amp, x0, x1, col}], gel (0..1 fill from the left: 1 = full gel),
//      recv: [{t0, amp}] (echo arrivals at the face), particles (bool), lit (wire colour on), backing (draw backing)}
// waves: dir +1 travels down from y0 starting at t0; dir −1 travels up from y0. amp scales the pressure; col: 'tx' | 'echo'
PROBE.thickness = (st, e, t) => {
  let d = 0;
  // drawn ~1,000,000× slower and hugely exaggerated: the real change in thickness is a few nanometres
  for (const f of st.fires || []) if (e >= f.e0 && e <= f.e1) d += 20 * PROBE.wave(t - f.t0);
  for (const r of st.recv || []) if (e >= (r.e0 ?? -99) && e <= (r.e1 ?? 99)) d -= 15 * r.amp * PROBE.wave(t - r.t0);
  return d;
};
// pressure at micro point y (beam centre) from all waves
PROBE.pressure = (st, y, t, kind = null) => {
  let p = 0;
  for (const w of st.waves || []) {
    if (kind && (w.col || 'tx') !== kind) continue;
    if (w.dir > 0 && y < w.y0) continue;
    if (w.dir < 0 && y > w.y0) continue;
    if (w.yEnd != null && (w.dir > 0 ? y > w.yEnd : y < w.yEnd)) continue;
    const tau = t - w.t0 - Math.abs(y - w.y0) / M.V;
    p += w.amp * PROBE.wave(tau);
  }
  return p;
};
// voltage packets on the wires: sending travels down (arrives at the crystal at f.t0), receiving travels up
const WIRE_T = 0.25, WIRE_TOP = -120;
PROBE.drawMicro = (c, cam, t, st = {}) => {
  const z = cam.z, S = (x, y) => K.S(cam, x, y);
  // backing block
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.g2; c.fillRect(0, 0, W, H); c.restore();
  PIX.cam(c, cam);
  const eIdx = []; for (let e = -12; e <= 12; e++) { const xs = S(M.ex(e), 0)[0]; if (xs > -M.PITCH * z && xs < W + M.PITCH * z) eIdx.push(e); }
  // wires (one per element) and their voltage packets
  for (const e of eIdx) {
    const x = M.ex(e);
    PIX.fill(c, PIX.rectPath(x - 1.5, -2000, 3, M.CR0 + 2000), 'g4');
    PIX.fill(c, PIX.rectPath(x - 0.5, -2000, 1, M.CR0 + 2000), 'g5');
  }
  // tissue, skin, gel / air, lens, matching layer, ground electrode
  PIX.fill(c, PIX.rectPath(-600, M.DERM, 1470, 6000), 's0');
  const sk = []; for (let x = -600; x <= 870; x += 2) sk.push([x, skinTop(x)]); sk.push([870, M.DERM + 6], [-600, M.DERM + 6]);
  ROOM.FL(c, z, U.poly(sk), 's2', 's1', 's3', 2, 1);
  const gel = st.gel ?? 1;
  PIX.fill(c, PIX.rectPath(-600, M.LENS, 1470, M.SKIN - M.LENS - 7), 'n0');             // the gap above the skin (air)
  if (gel > 0) {
    // one continuous layer from the probe face down to the skin; while it flows in, its front pushes the air out
    const xg = gel >= 1 ? 870 : lerp(-40, 310, gel), wob = gel < 1 ? 1 : 0, pts = [];
    for (let x = -600; x <= xg; x += 2) pts.push([x, M.LENS]);                                   // along the probe face
    for (let y = M.LENS; y <= M.SKIN + 2; y += 2) pts.push([xg + wob * (6 * Math.sin(y * 0.3 + t * 9) - 4 * (y - M.LENS) / 22), y]);   // the front
    for (let x = xg; x >= -600; x -= 2) pts.push([x, skinTop(x) + 0.5]);                         // back along the skin
    ROOM.FL(c, z, U.poly(pts), 'l1', 'l0', 'l2', 1.5, 1);
  }
  ROOM.FL(c, z, PIX.rectPath(-600, M.MAT, 1470, M.LENS - M.MAT), 'g3', 'g2', 'g4', 1.5, 1);   // lens
  PIX.fill(c, PIX.rectPath(-600, M.GND, 1470, M.MAT - M.GND), 'g6');                          // matching layer
  PIX.fill(c, PIX.rectPath(-600, M.GND, 1470, 1), 'g7');
  // crystals: each element's thickness follows its drive (send) or the echo pressure (receive)
  for (const e of eIdx) {
    const d = PROBE.thickness(st, e, t), x = M.ex(e) - M.EW / 2, y0 = M.CR0 - d / 2, y1 = M.CR1 + d / 2;
    ROOM.FL(c, z, PIX.rectPath(x, y0, M.EW, y1 - y0), 'g9', 'g7', 'gb', 2, 1);
    const live = PROBE.voltageOn(st, e, t);
    PIX.fill(c, PIX.rectPath(x, y0 - 2, M.EW, 2), live ? 'c3' : 'ga');                       // top electrode
    PIX.fill(c, PIX.rectPath(x, y1, M.EW, 2), live ? 'c2' : 'g8');                           // bottom (ground) electrode
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  // voltage packets on the wires
  // a voltage pulse is a bright packet on the wire with the wire lit behind it (the path it came along)
  for (const e of eIdx) for (const [y, col, dir] of PROBE.packets(st, e, t)) {
    const [sx, sy] = S(M.ex(e), y), L = Math.max(5, 26 * z), wd = Math.max(1, Math.round(3 * z)), X = Math.round(sx - wd / 2);
    const [, sTop] = S(0, dir > 0 ? WIRE_TOP : M.CR0 - 2), a = Math.round(Math.min(sTop, sy)), b = Math.round(Math.max(sTop, sy));
    c.fillStyle = P.c1; c.fillRect(X, a, wd, b - a);
    c.fillStyle = P.c2; c.fillRect(X - 1, Math.round(sy - L / 2), wd + 2, Math.round(L));
    c.fillStyle = P[col]; c.fillRect(X, Math.round(sy - L / 2 + 1), wd, Math.round(L - 2));
  }
  // tissue particles (pressure as their spacing) — only below the skin
  if (st.particles) PROBE.drawParticles(c, cam, t, st);
  // pressure bands
  PROBE.drawBands(c, cam, t, st);
};
// which elements carry a voltage right now (the drive pulse, or an echo's signal)
PROBE.voltageOn = (st, e, t) => {
  for (const f of st.fires || []) if (e >= f.e0 && e <= f.e1 && t >= f.t0 - 0.02 && t < f.t0 + 0.1) return true;
  for (const r of st.recv || []) if (e >= (r.e0 ?? -99) && e <= (r.e1 ?? 99) && t >= r.t0 && t < r.t0 + 0.3 && r.amp > 0.05) return true;
  return false;
};
PROBE.packets = (st, e, t) => {
  const out = [];
  for (const f of st.fires || []) if (e >= f.e0 && e <= f.e1) { const q = (t - (f.t0 - WIRE_T)) / WIRE_T; if (q >= 0 && q <= 1) out.push([lerp(WIRE_TOP, M.CR0 - 14, q), 'c5', 1]); }
  for (const r of st.recv || []) if (e >= (r.e0 ?? -99) && e <= (r.e1 ?? 99) && r.amp > 0.05) { const q = (t - r.t0 - 0.05) / 0.5; if (q >= 0 && q <= 1) out.push([lerp(M.CR0 - 14, WIRE_TOP - 200, q), r.amp > 0.4 ? 'c5' : 'c4', -1]); }
  return out;
};
// pressure as layered fronts: a thin line at each compression crest of each wave, across its beam, brightest for the
// first cycle and fading with the damped ringing (white-yellow for the pulse sent, amber for echoes)
PROBE.drawBands = (c, cam, t, st) => {
  if (!st.waves || !st.waves.length) return;
  const z = cam.z, th = Math.max(2, Math.round(2 * z));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (const w of st.waves) {
    const kind = w.col || 'tx';
    for (let n = 0; n < 4; n++) {
      const tau = (n + (w.amp < 0 ? 0.75 : 0.25)) / M.F;                           // crests (troughs if the wave is inverted)
      const a = Math.abs(w.amp) * 1.25 * env(tau); if (a < 0.1) continue;
      const y = w.y0 + w.dir * M.V * (t - w.t0 - tau);
      if (w.dir > 0 ? y < w.y0 : y > w.y0) continue;
      if (w.yEnd != null && (w.dir > 0 ? y > w.yEnd : y < w.yEnd)) continue;
      const [s0, sy] = K.S(cam, w.x0, y), s1 = K.S(cam, w.x1, y)[0], Y = Math.round(sy - th / 2);
      if (Y < -th || Y > H) continue;
      if (st.particles && y > M.DERM + 4) continue;                                // in tissue the particles themselves carry the wave
      const col = kind === 'tx' ? (a > 0.7 ? 'w' : a > 0.33 ? 'y4' : 'y3') : (a > 0.6 ? 'y4' : a > 0.28 ? 'y3' : 'y2');
      c.fillStyle = P[col];
      for (let sx = Math.max(0, Math.floor(s0)); sx < Math.min(W, Math.ceil(s1)); sx++) {
        const edge = Math.min(sx - s0, s1 - sx) / (12 * z);
        for (let k = 0; k < th; k++) if (U.clamp(edge) > K.BAY(sx, Y + k)) c.fillRect(sx, Y + k, 1, 1);
      }
    }
  }
  c.restore();
};
// tissue particles on a staggered grid below the skin; each is pushed along the beam by the passing pressure wave
PROBE.drawParticles = (c, cam, t, st) => {
  const z = cam.z, sp = 9;
  let bx0 = 1e9, bx1 = -1e9; for (const w of st.waves || []) { bx0 = Math.min(bx0, w.x0); bx1 = Math.max(bx1, w.x1); }
  const [, wy0] = K.Sinv(cam, 0, 0), [, wy1] = K.Sinv(cam, 0, H);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let j = Math.max(0, Math.floor((wy0 - M.DERM) / sp) - 1); M.DERM + j * sp < wy1 + sp; j++) {
    const y0 = M.DERM + 8 + j * sp;
    // displacement ∝ the pressure gradient's integral: use the pressure a quarter wave ahead (a phase shift) for a smooth look
    const p0 = PROBE.pressure(st, y0, t), u0 = 5.5 * PROBE.pressure(st, y0 + M.LAM / 4, t);
    for (let i = -40; i <= 70; i++) {
      const x0 = i * sp + (j % 2 ? sp / 2 : 0) + (U.hash(i, j) - 0.5) * 1.5;
      const wb = clamp(Math.min(x0 - bx0, bx1 - x0) / 14), p = p0 * wb, u = u0 * wb;   // only inside the beam
      const col = p > 0.5 ? 'w' : p > 0.22 ? 'y4' : p < -0.35 ? 's1' : 's2';
      const [sx, sy] = K.S(cam, x0, y0 + u);
      if (sx < -2 || sx > W + 2 || sy < -2 || sy > H + 2) continue;
      c.fillStyle = P[col]; c.fillRect(Math.round(sx - z), Math.round(sy - z), Math.max(2, Math.round(2 * z)), Math.max(2, Math.round(2 * z)));
    }
  }
  c.restore();
};
})();
