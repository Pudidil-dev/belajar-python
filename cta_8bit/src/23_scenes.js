'use strict';
// ============================================================================
// SCENE COMPOSITOR — 24 micro-scenes in 6 continuous sequences, one patient
// frame, one camera that travels through it. No text anywhere.
// A 0–6 the aneurysm → arteries → brain → patient → arm; B 6–20 the contrast
// from the arm vein through the heart and lungs to the brain; C 20–31 the
// scanner, X-ray attenuation, detector measurements, the helical acquisition;
// D 31–42 reconstruction → slices → voxel volume → vessels; E 42–54 the CTA
// display, the aneurysm, the matching CT plane; F 54–60 back to frame one.
// ============================================================================
function crossWorld(drawB, k) { if (k <= 0) return; if (k >= 1) { drawB(); return; } withBuffer(TMPBUF, drawB); mixInto(buf, TMPBUF, k); }
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const UPY = [0, 1, 0], UPZ = [0, 0, 1];
// ---------------------------------------------------------------- the loop orbit around the aneurysm (frame 0 = frame 3600)
const PSI0 = 0.55, EL0 = 0.3, D0 = 46, OMEGA = -0.11, TGT0 = lerp3(B_L, AN_C, 0.42);   // OMEGA < 0: clockwise seen from above
const orbitCam = (psi, el, d, tg, fov) => camLook(orbitEye(tg || TGT0, psi, el, d), tg || TGT0, UPY, fov || 38);
// the end of the film: arrive on the opening orbit with the same speed
const PSI_K = [[46, PSI0 + 2.6, -0.22], [50, PSI0 + 0.78, -0.26], [54, PSI0 + 0.5, -0.05], [57, PSI0 - 3 * OMEGA, OMEGA], [60, PSI0, OMEGA]];
const D_K = [[46, 78, -7], [50, 62, -2], [52.6, 59, -2], [54, 52, -4.5], [57, D0, 0], [60, D0, 0]];
const EL_K = [[46, 0.16, 0.01], [50, 0.27, 0.01], [54, 0.3, 0], [57, EL0, 0], [60, EL0, 0]];
// the MPR plane passes through the centre of the sac and faces the camera at 52.2 s (the confirmation)
(() => {
  const t = 52.2, eye = orbitEye(TGT0, hermite(PSI_K, t), hermite(EL_K, t), hermite(D_K, t));
  const n = norm3(sub3(eye, AN_C)), e1 = norm3(cross3([0, 1, 0], n)), e2 = cross3(n, e1);
  Object.assign(MPR, { c: AN_C.slice(), n, e1, e2, half: 11 });
})();
// ---------------------------------------------------------------- the scanner's motion: table position (scan plane) and rotor angle
function scanY(t) {
  if (t < 20) return 40;
  if (t < 28) return lerp(40, -6, smooth(seg(t, 20.4, 21.6)));
  return -6 + 76 * smooth(seg(t, 28.2, 30.8));
}
const PHI_T = (() => {
  const n = Math.ceil(DUR * 60) + 2, out = new Float32Array(n); let a = 0;
  // spin speed (rad/s, slow motion: a real rotor turns in about 0.3 s); 3.131 puts the tube on top exactly at beam-on (22.2 s) and at 25.0 s
  const w = t => t < 20.4 ? 0 : t < 24 ? 3.131 * smooth(seg(t, 20.4, 21.4)) : t < 26 ? lerp(3.131, 0.18, smooth(seg(t, 24.0, 24.3))) : t < 28 ? lerp(0.18, 2.2, smooth(seg(t, 26.0, 26.4))) : lerp(2.2, 4.2, smooth(seg(t, 28.0, 28.6)));
  for (let i = 0; i < n; i++) { out[i] = a; a += w(i / 60) / 60; }
  const off = 0.0 - out[25 * 60]; for (let i = 0; i < n; i++) out[i] += off;      // the tube sits above the patient (anterior) during the photon close-up
  return out;
})();
const gantryPhi = t => PHI_T[clamp(Math.round(t * 60), 0, PHI_T.length - 1)];
// ---------------------------------------------------------------- the camera for the whole film
const A_PSI = [[0, PSI0, OMEGA], [1.5, PSI0 + 1.5 * OMEGA, OMEGA], [3.0, PSI0 - 0.12, -0.08], [4.4, 0.92, 0.18]];
const A_LD = [[0, Math.log(D0), 0], [1.5, Math.log(D0), 0], [3.0, Math.log(185), 0.66], [4.4, Math.log(270), 0.12]];
const A_EL = [[0, EL0, 0], [1.5, EL0, 0], [3.0, 0.3, 0], [4.4, 0.28, 0]];
function openingCam(t) {
  const tg = t < 1.5 ? TGT0 : t < 3.0 ? lerp3(TGT0, [24, -6, -2], smooth(seg(t, 1.5, 3.0))) : lerp3([24, -6, -2], [0, 4, -6], smooth(seg(t, 3.0, 4.4)));
  return orbitCam(hermite(A_PSI, t), hermite(A_EL, t), Math.exp(hermite(A_LD, t)), tg, lerp(38, 40, smooth(seg(t, 1.5, 3.0))));
}
const KA = [
  { t: 4.4, tg: [0, 4, -6], eye: orbitEye([0, 4, -6], 0.92, 0.28, 270), up: UPY, fov: 40 },
  { t: 5.0, tg: [0, -40, -10], eye: [-60, -430, 210], up: UPZ, fov: 42, e: K50 },
  { t: 5.95, tg: [-230, -440, -60], eye: [-1100, -150, 640], up: UPZ, fov: 40, e: smooth },
  { t: 6.75, tg: [-400, -520, -70], eye: [-700, -640, 560], up: UPZ, fov: 40, e: smooth },
  { t: 7.8, tg: [-380, -505, -66], eye: [-560, -690, 150], up: UPZ, fov: 40, e: K50 },
  { t: 8.3, tg: veinAt(0.07).p, eye: add3(veinAt(0.03).p, [-22, -30, 62]), up: UPZ, fov: 50, e: K75 },
];
const veinFront = t => (t - 6.6) / 3.8;                                  // where the contrast front is along the arm vein (0 cannula .. 1 heart)
const veinU = t => lerp(0.035, veinFront(t) - 0.07, smooth(seg(t, 8.3, 9.4)));
function veinCam(t) { const u = veinU(t), q = veinAt(u), ah = veinAt(Math.min(1, u + 0.03)); return camLook(q.p, ah.p, UPZ, 64); }
const KB = [
  { t: 10.0, tg: [-22, -330, 14], eye: [-80, -270, 210], up: UPY, fov: 42 },
  { t: 11.1, tg: [-12, -326, 10], eye: [60, -170, 540], up: UPY, fov: 42, e: K50 },
  { t: 12.5, tg: [-20, -330, 14], eye: [10, -180, 540], up: UPY, fov: 42, e: lin },
  { t: 13.6, tg: [-74, -330, -2], eye: [-210, -200, 420], up: UPY, fov: 42, e: K50 },
  { t: 14.8, tg: [14, -330, -12], eye: [150, -190, 430], up: UPY, fov: 42, e: K50 },
  { t: 15.7, tg: [12, -312, 0], eye: orbitEye([12, -312, 0], 0.55, 0.32, 430), up: UPY, fov: 42, e: K50 },
  { t: 17.0, tg: [10, -268, 0], eye: orbitEye([10, -268, 0], 1.25, 0.3, 420), up: UPY, fov: 42, e: lin },
  { t: 17.9, tg: [22, -150, 4], eye: orbitEye([22, -150, 4], 1.0, 0.25, 250), up: UPY, fov: 42, e: K75 },
  { t: 18.7, tg: [32, -8, 2], eye: orbitEye([32, -8, 2], 0.85, 0.3, 150), up: UPY, fov: 40, e: K75 },
  { t: 20.0, tg: [0, 4, -6], eye: orbitEye([0, 4, -6], 0.92, 0.28, 270), up: UPY, fov: 40, e: K50 },
];
const roomEye = (t, p) => add3(p, [0, scanY(t) - GAN.y, 0]);            // a camera fixed in the room (moves with the gantry in the patient frame)
function KC(t) {
  return [
    { t: 20.0, tg: [0, 4, -6], eye: orbitEye([0, 4, -6], 0.92, 0.28, 270), up: UPY, fov: 40 },
    { t: 20.7, tg: [0, 0, -20], eye: [-30, -330, 230], up: UPZ, fov: 42, e: K50 },
    { t: 21.3, tg: roomEye(t, [0, GAN.y, 20]), eye: roomEye(t, [-240, GAN.y - 1650, 430]), up: UPZ, fov: 40, e: K50 },
    { t: 22.0, tg: roomEye(t, [0, GAN.y, 0]), eye: roomEye(t, [-60, GAN.y - 1500, 120]), up: UPZ, fov: 42, e: K50 },
    { t: 24.0, tg: roomEye(t, [0, GAN.y, 0]), eye: roomEye(t, [-20, GAN.y - 1420, 90]), up: UPZ, fov: 42, e: lin },
    { t: 25.0, tg: roomEye(t, [36, GAN.y, 2]), eye: roomEye(t, [38, GAN.y - 300, 6]), up: UPZ, fov: 40, e: K50 },
    { t: 26.0, tg: roomEye(t, [36, GAN.y, 0]), eye: roomEye(t, [39, GAN.y - 284, 4]), up: UPZ, fov: 40, e: lin },
    { t: 27.2, tg: roomEye(t, [0, GAN.y, 0]), eye: roomEye(t, [60, GAN.y - 1550, 160]), up: UPZ, fov: 42, e: K50 },
    { t: 28.0, tg: roomEye(t, [0, GAN.y, 0]), eye: roomEye(t, [80, GAN.y - 1550, 180]), up: UPZ, fov: 42, e: lin },
    { t: 28.8, tg: roomEye(t, [60, GAN.y, -20]), eye: roomEye(t, [-1150, GAN.y - 1450, 900]), up: UPZ, fov: 40, e: K50 },
    { t: 31.0, tg: roomEye(t, [60, GAN.y, -20]), eye: roomEye(t, [-1200, GAN.y - 1350, 950]), up: UPZ, fov: 40, e: lin },
  ];
}
const KD = [
  { t: 31.0, tg: [0, -6, 0], eye: [-520, -560, 420], up: UPZ, fov: 40 },
  { t: 31.6, tg: [0, -6, 0], eye: [0, -560, 40], up: UPZ, fov: 40, e: K50 },
  { t: 34.0, tg: [0, -6, 0], eye: [0, -350, 20], up: UPZ, fov: 40, e: lin },
  { t: 34.6, tg: [0, 24, 0], eye: [170, -560, 170], up: UPZ, fov: 40, e: K50 },
  { t: 37.0, tg: [0, 30, 0], eye: [340, -400, 230], up: UPZ, fov: 40, e: lin },
  { t: 38.4, tg: [0, 4, -6], eye: orbitEye([0, 4, -6], PSI0 + 2.0, 0.42, 470), up: UPY, fov: 40, e: K50 },
  { t: 39.5, tg: [0, 4, -6], eye: orbitEye([0, 4, -6], PSI0 + 2.45, 0.36, 450), up: UPY, fov: 40, e: lin },
  { t: 42.0, tg: [24, -60, 0], eye: orbitEye([24, -60, 0], PSI0 + 2.65, 0.2, 170), up: UPY, fov: 40, e: K50 },
];
const S20_D = [[42, 150, 0], [44.6, 106, -18], [46, 78, -7]], S20_PSI = [[42, PSI0 + 2.65, 0], [46, PSI0 + 2.6, -0.22]], S20_EL = [[42, 0.2, 0], [46, 0.16, 0.01]];
const ICA_PTS = VESS.find(v => v.name === 'ICA').pts;
function icaAt(u) { const n = ICA_PTS.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)); return lerp3(ICA_PTS[i], ICA_PTS[i + 1], f - i); }
function camAt(t) {
  if (t < 4.4) return openingCam(t);
  if (t < 8.3) return camPath(KA, t);
  if (t < 10.0) return veinCam(t);
  if (t < 20.0) return camPath(KB, t);
  if (t < 31.0) return camPath(KC(t), t);
  if (t < 42.0) return camPath(KD, t);
  if (t < 46.0) { // up along the internal carotid toward the MCA (the aneurysm hidden behind the branches at first); speed matched into 46 s
    const u = smooth(seg(t, 42.0, 46.0)), tg = icaAt(lerp(0.5, 1.0, u)), d = hermite(S20_D, t), psi = hermite(S20_PSI, t), el = hermite(S20_EL, t);
    const tgB = lerp3([24, -60, 0], tg, smooth(seg(t, 42.0, 42.8)));
    return orbitCam(psi, el, d, tgB, 40);
  }
  const psi = hermite(PSI_K, t), d = hermite(D_K, t), el = hermite(EL_K, t);
  const tg = t < 47.6 ? lerp3(T_L, TGT0, smooth(seg(t, 46.0, 47.6))) : TGT0;
  return orbitCam(psi, el, d, tg, t < 54 ? 40 : lerp(40, 38, smooth(seg(t, 54, 57))));
}
// ---------------------------------------------------------------- materials and drawing helpers
function M(ramp, ol, x) { return Object.assign({ ramp, id: newId(ol) }, x || {}); }
const FOG_A = [60, 260, P.BG];
// the arteries in their anatomical look (wall red, lumen blood; amber where contrast has arrived)
function drawArteries(cam, t, o) {
  o = o || {};
  const base = { ramp: RAMP.wall, id: newId(P.AR0), back: RAMP.lumen, mix: { ramp: RAMP.io, back: RAMP.ioIn, f: mixBrain }, mixFacing: true, fog: o.fog, amb: 0.26, dif: 0.6, rim: 0.32, spec: 0.55 };
  drawMesh(cam, A.art, base);
  drawMesh(cam, A.hero, base);     // the same mesh in every look: the sac stays closed (an unruptured aneurysm); one outline id for both
}
// the CTA display look (ivory, the same meshes): a warm emphasis only on the sac
function drawVR(cam, t, o) {
  o = o || {};
  const m = { ramp: RAMP.vr, id: newId(P.G1), amb: 0.24, dif: 0.62, rim: 0.4, spec: 0.5, fog: o.fog, clipFn: o.clipFn, back: o.clipFn ? [P.G1, P.G2, P.G3] : undefined };
  drawMesh(cam, A.art, m);
  drawMesh(cam, A.hero, Object.assign({}, m, { mix: { ramp: RAMP.an, f: a => a >= 100 ? (o.emph || 0) : 0 } }));
}
function headMat(o) {
  const m = { mix: { ramp: RAMP.hair, f: h => h }, ao: 6, fog: o.fog };
  if (o.glass !== undefined && o.glass < 1) Object.assign(m, { ramp: RAMP.skin, id: 0, glass: [o.glass, Math.max(o.glass, o.rim === undefined ? 0.9 : o.rim), 2.2] });
  else Object.assign(m, { ramp: RAMP.skin, id: newId(P.SK0), back: RAMP.md, clip: o.clip });
  return m;
}
function drawBrain(cam, a) { if (a > 0) drawMesh(cam, A.brain, { ramp: RAMP.brain, glass: [0.12 * a, 0.95 * a, 1.6], ao: 3, id: 0, amb: 0.36, dif: 0.62, rim: 0.3 }); }
// the room: floor, table, patient, gantry (with its rotor), injector; o.gantryCut opens the housing, o.patientCut cuts at the scan plane,
// o.headGlass (0..1) shows the head see-through (a rim, never a face surface close to the camera)
function drawRoom(cam, t, o) {
  o = o || {};
  const dy = scanY(t) - GAN.y, xfR = mT(0, dy, 0), phi = gantryPhi(t), xfRot = mMul(xfR, mRotAxis([0, 0, 0], [0, 1, 0], phi)), fog = o.fog || [700, 4200, P.N2];
  const gClip = o.gantryCut ? [0, -1, 0, scanY(t) - 26] : null, pClip = o.patientCut ? [0, -1, 0, scanY(t) - 0.5] : null;
  drawMesh(cam, A.floor, { ramp: [0], back: [0], tex: FLOOR_TEX, unlit: true, id: 0, fog }, xfR);
  const ba = o.bodyAlpha === undefined ? 1 : o.bodyAlpha;      // the body dissolves (pixel by pixel) when the camera looks at the scan plane
  if (ba >= 1) drawMesh(cam, A.table, M(RAMP.mw, P.MW0, { fog }));
  else {                                                        // the table: its head end stays under the head, the rest dissolves with the body
    const cy = scanY(t) - 0.5;
    drawMesh(cam, A.table, M(RAMP.mw, P.MW0, { fog, clip: [0, -1, 0, cy] }));
    if (ba > 0) drawMesh(cam, A.table, M(RAMP.mw, P.MW0, { fog, clip: [0, 1, 0, -cy], alpha: ba }));
  }
  if (ba > 0) { drawMesh(cam, A.body, M(RAMP.sheet, P.SH0, { fog, back: RAMP.md, alpha: ba })); drawMesh(cam, A.forearm, M(RAMP.skin, P.SK0, { fog, alpha: ba })); }
  drawMesh(cam, A.board, M(RAMP.md, P.MD0, { fog }));
  if (o.head !== false) drawMesh(cam, A.head, headMat({ fog, clip: pClip, glass: o.headGlass }));
  drawMesh(cam, A.gbase, M(RAMP.mw, P.MW0, { fog }), xfR);
  drawMesh(cam, A.housing, M(RAMP.mw, P.MW0, { back: RAMP.md, fog, clip: gClip, spec: 0.35, cap: 0.82 }), xfR);
  drawMesh(cam, A.trim, M([P.MW2, P.MW3, P.MW4, P.CY3], P.MW0, { fog, clip: gClip }), xfR);
  if (o.gantryCut || o.rotor) {
    drawMesh(cam, A.rotor, M(RAMP.md, P.MD0, { fog }), xfRot);
    drawMesh(cam, A.slip, M([P.CU1, P.CU2, P.CU3, P.AN3], P.CU0, { fog, spec: 0.6 }), xfRot);
    drawMesh(cam, A.tube, M(RAMP.mw, P.MD0, { fog, spec: 0.4 }), xfRot);
    drawMesh(cam, A.blades, M(RAMP.md, P.MD0, { fog }), xfRot);
    drawMesh(cam, A.det, M(RAMP.md, P.MD0, { fog }), xfRot);
    const prof = detProfile(phi);
    drawMesh(cam, A.detFaces, { ramp: [P.MD2], back: [P.MD2], mix: { ramp: [P.CY4], back: [P.CY4], f: a => o.detOn ? 0.12 + 0.88 * prof[Math.round(a)] : 0 }, id: 0, unlit: true }, xfRot);
  }
  drawMesh(cam, A.inj, M(RAMP.mw, P.MW0, { fog }));
  drawMesh(cam, A.syr, M(RAMP.io, P.IO0, { fog, alpha: 0.85 }));
  drawMesh(cam, A.tubing, { ramp: RAMP.mw, mix: { ramp: RAMP.io, f: u => u < seg(t, 6.3, 6.62) ? 1 : 0 }, id: newId(P.MW0), fog });
  if (t > 5 && t < 9) drawMesh(cam, A.cannula, M([P.MW1, P.MW2, P.MW3, P.CY2], P.MD1, {}));
  return { dy, phi };
}
// the fan beam: a faint cyan sheet from the focal spot to the detector arc (explanatory; X-rays are invisible)
const HEAD_SL = [79, 97];   // the head's outline in the scan plane (semi-axes x, z)
function drawFan(cam, t, k) {
  if (k <= 0) return;
  const phi = gantryPhi(t), y = scanY(t), rf = GAN.rRot - 40, f = [rf * Math.sin(phi), y, rf * Math.cos(phi)], rd = DET_R0 - 2, prof = detProfile(phi);
  const edge = i => { const a = phi + Math.PI + lerp(-DET_SPAN, DET_SPAN, i / DET_N); return [rd * Math.sin(a), y, rd * Math.cos(a)]; };
  // where a ray leaves the head (far intersection with the outline), or null if it misses
  const exitPt = d => {
    const ox = f[0] / HEAD_SL[0], oz = f[2] / HEAD_SL[1], dx = (d[0] - f[0]) / HEAD_SL[0], dz = (d[2] - f[2]) / HEAD_SL[1];
    const A_ = dx * dx + dz * dz, B_ = 2 * (ox * dx + oz * dz), C_ = ox * ox + oz * oz - 1, D_ = B_ * B_ - 4 * A_ * C_; if (D_ <= 0) return null;
    const s = (-B_ + Math.sqrt(D_)) / (2 * A_); return [lerp(f[0], d[0], s), y, lerp(f[2], d[2], s)];
  };
  const mb = new MB(), iF = mb.v(f[0], f[1], f[2], 0, 1, 0), arc = [];
  for (let i = 0; i <= DET_N; i++) { const e = edge(i); arc.push(mb.v(e[0], e[1], e[2], 0, 1, 0)); }
  for (let i = 0; i < DET_N; i++) mb.tri(iF, arc[i], arc[i + 1]);
  drawMesh(cam, mb.build(), { ramp: [P.CY2], back: [P.CY2], unlit: true, blend: 0.11 * k, noZ: true, id: 0 });
  for (let i = 0; i < DET_N; i++) {
    const d0 = edge(i), d1 = edge(i + 1), e0 = exitPt(d0) || lerp3(f, d0, 0.5), e1 = exitPt(d1) || lerp3(f, d1, 0.5), q = new MB();
    const v = [e0, e1, d1, d0].map(p => q.v(p[0], p[1], p[2], 0, 1, 0)); q.quad(v[0], v[1], v[2], v[3]);
    drawMesh(cam, q.build(), { ramp: [P.CY3], back: [P.CY3], unlit: true, blend: k * (0.04 + 0.3 * prof[i] * prof[i]), noZ: true, id: 0 });
  }
  for (const s of [0, DET_N]) line3(cam, f, edge(s), P.CY2, 1, { blend: 0.55 * k });
}
// the circulation overview (veins steel blue, arteries red, chambers that beat, lungs; contrast amber by arrival time)
function heartScale(t) { let k = 0; for (const b of [10.8, 12.0, 13.2, 14.4, 15.6, 16.8]) k = Math.max(k, Math.max(0, 1 - Math.abs(t - b - 0.08) / 0.22)); return 1 - 0.09 * k; }
function drawCirc(cam, t, o) {
  o = o || {};
  const fog = [250, 1100, P.BG], hs = heartScale(t), sc = c => mMul(mT(c[0], c[1], c[2]), mMul(mS(hs), mT(-c[0], -c[1], -c[2])));
  drawMesh(cam, A.veins, M(RAMP.vein, P.ST0, { mix: { ramp: RAMP.io, f: mixVein }, fog }));
  drawMesh(cam, A.pa, M(RAMP.vein, P.ST0, { mix: { ramp: RAMP.io, f: mixVein }, fog }));
  drawMesh(cam, A.pv, M(RAMP.art, P.AR0, { mix: { ramp: RAMP.io, f: mixArt }, fog }));
  drawMesh(cam, A.arts, M(RAMP.art, P.AR0, { mix: { ramp: RAMP.io, f: mixArt }, fog }));
  const hc = [8, -362, 18];
  drawMesh(cam, A.heartR, M(RAMP.vein, P.ST0, { mix: { ramp: RAMP.io, f: mixVein }, mixFacing: true, fog, alpha: 0.85, ao: 1, spec: 0.4 }), sc(hc));
  drawMesh(cam, A.heartL, M(RAMP.art, P.AR0, { mix: { ramp: RAMP.io, f: mixArt }, mixFacing: true, fog, alpha: 0.85, ao: 3, spec: 0.4 }), sc(hc));
  if (o.arteries) { drawArteries(cam, t, { fog: [200, 1200, P.BG] }); }
  r3dOutlines();
  drawMesh(cam, A.lungR, { ramp: RAMP.lung, glass: [0.06, 0.8, 1.8], ao: 5, id: 0, fog });
  drawMesh(cam, A.lungL, { ramp: RAMP.lung, glass: [0.06, 0.8, 1.8], ao: 6, id: 0, fog });
  if (o.brain) drawBrain(cam, o.brain);
}
// inside the arm vein: the wall from inside, red blood cells and the amber contrast cloud travelling with the flow
const CELLS = (() => { const r = mulberry(33), o = []; for (let i = 0; i < 120; i++) o.push({ u: r(), ang: r() * TAU, rad: 0.8 + r() * 4.0, rot: r() * TAU, sp: 0.9 + r() * 0.25 }); return o; })();
function drawVeinInside(cam, t) {
  const uc = veinU(t), uf = veinFront(t), behind = clamp((uf - uc) / 0.07, 0, 1);
  const fog = [6, 60, mixc(P.BL0, P.IO0, 0.35 * behind)];
  drawMesh(cam, A.veins, M(RAMP.vein, P.ST0, { back: [P.BL0, P.BL1, P.BL2, P.ST1], mix: { ramp: RAMP.vein, back: RAMP.veinWall, f: a => 0.5 + 0.5 * Math.cos(TAU * (a - 6.6) / 0.1) }, fog }));
  const flow = (t - 8.0) * 0.16;
  for (const c of CELLS) {
    const u = (c.u + flow * c.sp) % 1; if (u < uc - 0.01 || u > uc + 0.16) continue;
    const q = veinAt(u), n = norm3(cross3(q.tg, [0, 0, 1])), b = cross3(q.tg, n);
    const p = add3(q.p, add3(mul3(n, Math.cos(c.ang) * c.rad), mul3(b, Math.sin(c.ang) * c.rad)));
    const xf = mMul(mT(p[0], p[1], p[2]), mMul(mRotAxis([0, 0, 0], [Math.cos(c.rot), 0.3, Math.sin(c.rot)], t * 1.5 + c.rot), mS(0.62)));
    drawMesh(cam, A.rbc, { ramp: [P.BL1, P.BL2, P.AR2, P.AR3], id: newId(P.BL0), fog }, xf);
  }
  r3dOutlines();
  // the contrast: a soft amber cloud mixed into the plasma behind the front (densest at the front), clear blood ahead of it;
  // drawn as dithered, shaded puffs: it is not on the wall and it does not glow
  const r = mulberry(7);
  for (let i = 0; i < 190; i++) {
    const back = Math.pow(r(), 1.4) * 0.12, u = uf - back + 0.003 * Math.sin(t * 2 + i), a = r() * TAU, rr = Math.sqrt(r()) * 3.6, rad = 1.4 + r() * 1.6;
    if (u < uc + 0.004 || u > 1) continue;
    const q = veinAt(u), n = norm3(cross3(q.tg, [0, 0, 1])), b = cross3(q.tg, n);
    const p = add3(q.p, add3(mul3(n, Math.cos(a + t * 0.6) * rr), mul3(b, Math.sin(a + t * 0.6) * rr)));
    const d = camPt(cam, p)[2]; if (d < 4) continue;
    // soft overlapping blobs (screen size capped so the cloud never turns into big balls near the camera)
    sprite3(cam, p, Math.min(rad, 9 * d / cam.F), [P.IO1, P.IO2], { alpha: clamp(0.5 - back * 2.6, 0.18, 0.5), ao: i & 15, noZ: true });
  }
  // inside the cloud the plasma itself looks amber
  tintAll(P.IO1, 0.2 * behind);
}
// the axial cross-section at the scan plane (colour anatomy), seen inside the cut-open head
function drawSliceQuad(cam, t, tex, y, k, o) {
  if (k <= 0) return; o = o || {};
  const s = o.scale === undefined ? 1 : o.scale;
  const q = quadMesh([SL.x0 * s, y, SL.z1 * s], [(SL.x1 - SL.x0) * s, 0, 0], [0, 0, (SL.z0 - SL.z1) * s]);
  drawMesh(cam, q, { ramp: [0], back: [0], tex, unlit: true, id: 0, alpha: k < 1 ? k : undefined, ao: o.ao || 0 }, o.xf);
}
// ---------------------------------------------------------------- the digital space (reconstruction)
function digitalBG(cam, t) {
  skyBG(P.K0, P.N1);
  // a faint grid floor and walls, for depth
  for (let i = -6; i <= 6; i++) { line3(cam, [i * 60, -700, -170], [i * 60, 500, -170], P.N2, 1); line3(cam, [-360, i * 100 - 100, -170], [360, i * 100 - 100, -170], P.N2, 1); }
}
function dataBox(cam, k, col) {
  if (k <= 0) return;
  const x = 100, y0 = -70, y1 = 86, z = 120, c = [[-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z], [-x, y1, -z], [x, y1, -z], [x, y1, z], [-x, y1, z]];
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) line3(cam, c[a], c[b], col || P.CY1, 1, { blend: 0.85 * k, noZtest: true });
}
// ---------------------------------------------------------------- pass 1: the frame
// ---------------------------------------------------------------- the worlds: each draws a whole frame from a camera
function worldAnat(cam, t) {                                      // the arteries and the brain; the head appears as a see-through rim
  r3dBegin(); skyBG(P.K0, P.N2);
  drawArteries(cam, t, { fog: t < 1.5 ? [34, 120, P.N1] : [60, 600, P.N1] });
  r3dOutlines();
  drawBrain(cam, ph(t, 2.9, 3.7));
  if (t > 4.0) drawMesh(cam, A.head, headMat({ glass: 0.03, rim: 0.85 * ph(t, 4.0, 4.6) }));
}
function worldRoom(cam, t) {                                      // the room, the arm, the injection
  r3dBegin(); skyBG(P.K0, P.N2);
  // the head stays see-through (brain and arteries inside) until the gantry housing hides it from the camera
  const near = t < 5.6, hg = near ? lerp(0.03, 1, ph(t, 5.25, 5.6)) : undefined;
  if (near) drawArteries(cam, t, { fog: [60, 1600, P.N2] });
  drawRoom(cam, t, { rotor: false, headGlass: hg });
  r3dOutlines();
  if (near) drawBrain(cam, 1 - ph(t, 5.0, 5.5));
  // the arm vein seen under the skin of the forearm (steel blue; amber as the contrast comes in)
  if (t > 6.2) drawMesh(cam, A.veins, { ramp: [P.ST1, P.ST2, P.ST3], mix: { ramp: [P.IO1, P.IO2, P.IO3], f: mixVein }, id: 0, zBias: 20, blend: 0.72 * ph(t, 6.2, 6.6), amb: 0.5, dif: 0.35, rim: 0 });
}
function worldVein(cam, t) { r3dBegin(); skyBG(P.BL0, P.BL1); drawVeinInside(cam, t); r3dOutlines(); }
function worldCirc(cam, t) { r3dBegin(); skyBG(P.K0, P.N2); drawCirc(cam, t, t >= 17 ? { arteries: true, brain: ph(t, 18.9, 19.6) } : {}); }
function worldScanner(cam, t) {                                   // the scanner
  r3dBegin(); skyBG(P.K0, P.N2);
  const axial = t >= 21.6 && t < 28.6, bodyAlpha = 1 - ph(t, 21.1, 21.55) + ph(t, 28.5, 28.95);
  // the head is see-through while the camera is near it and while the cover is open (the arteries inside), solid in the axial cut
  const hg = t < 21.6 ? 0.03 : t < 28.4 ? undefined : lerp(1, 0.06, ph(t, 28.4, 28.9));
  drawRoom(cam, t, { gantryCut: t > 20.6, patientCut: axial, bodyAlpha, detOn: t > EV.beamOn - 0.1, headGlass: hg });
  if (t < 21.6 || t >= 28.6) drawArteries(cam, t, { fog: [100, 3000, P.N2] });
  r3dOutlines();
  if (t < 21.2) drawBrain(cam, 1 - ph(t, 20.4, 21.2));
  if (axial) drawSliceQuad(cam, t, A.colorSlice, scanY(t), ph(t, 21.6, 21.75) * (1 - ph(t, 28.2, 28.6)));
  drawFan(cam, t, ph(t, EV.beamOn, EV.beamOn + 0.3) * (t < 24 || t > 26.2 ? 1 : 0.25));
  if (t >= 24.0 && t < 26.4) photonLanes(cam, t);
  if (t >= 28.2) { helixTrail(cam, t); dataBox(cam, ph(t, 28.6, 29.2)); streamPatterns(cam, t); }
}
function worldDigital(cam, t) { r3dBegin(); digitalScene(cam, t); }
function worldCTA(cam, t) {                                       // the CTA display, the aneurysm, the matching plane
  r3dBegin(); skyBG(P.K0, P.N1);
  const open = mprOpen(t);
  drawVR(cam, t, { emph: ph(t, EV.discover, EV.discover + 0.7) * (1 - ph(t, 53.6, 54.6)) * 0.55, fog: [70, 420, P.K0], clipFn: open > 0 ? mprClip(open) : null });
  r3dOutlines();
  if (open > 0) mprPlane(cam, t, open);
}
function worldEnd(cam, t) { r3dBegin(); skyBG(P.K0, P.N2); drawArteries(cam, t, { fog: [34, 120, P.N1] }); r3dOutlines(); }
// ---------------------------------------------------------------- pass 1: the frame. Every change of world is a short dissolve (no hard cut)
function visual(t) {
  CUR_T = t;
  const one = (w, c) => { w(c, t); return c; };
  const mix = (wA, cA, wB, cB, k) => { wA(cA, t); if (k > 0) crossWorld(() => wB(cB, t), k); return k < 0.5 ? cA : cB; };
  if (t < 4.3) return one(worldAnat, camAt(t));
  if (t < 4.8) { const c = camAt(t); return mix(worldAnat, c, worldRoom, c, ph(t, 4.3, 4.8)); }
  if (t < 7.95) return one(worldRoom, camAt(t));
  if (t < 8.3) return mix(worldRoom, camPath(KA, t), worldVein, veinCam(t), ph(t, 7.95, 8.3));          // the arm dissolves into the inside of its vein
  if (t < 9.95) return one(worldVein, veinCam(t));
  if (t < 10.4) return mix(worldVein, veinCam(t), worldCirc, camPath(KB, t), ph(t, 9.95, 10.4));         // out of the vein into the chest
  if (t < 20.2) return one(worldCirc, camAt(t));
  if (t < 20.6) { const c = camAt(t); return mix(worldCirc, c, worldScanner, c, ph(t, 20.2, 20.6)); }  // the scanner appears around the head
  if (t < 30.8) return one(worldScanner, camAt(t));
  if (t < 31.2) return mix(worldScanner, camPath(KC(t), t), worldDigital, camPath(KD, t), ph(t, 30.8, 31.2));   // the data into the digital space
  if (t < 42.0) return one(worldDigital, camAt(t));
  const c = camAt(t), toAnat = ph(t, 54.6, 56.8);                // back to the anatomical look, on the same orbit
  if (toAnat <= 0) return one(worldCTA, c);
  if (toAnat >= 1) return one(worldEnd, c);
  return mix(worldCTA, c, worldEnd, c, toAnat);
}
// ---------------------------------------------------------------- C: photons in the attenuation close-up (two lanes; the iodinated one absorbs more)
function photonLanes(cam, t) {
  const y = scanY(t) - 1, zs = 104, ze = -92, xl = [27, AN_C[0]], k = ph(t, 24.0, 24.3) * (1 - ph(t, 26.1, 26.4));
  if (k <= 0) return;
  for (let L = 0; L < 2; L++) {
    line3(cam, [xl[L], y, zs + 20], [xl[L], y, ze], P.CY1, 1, { blend: 0.3 * k, noZtest: true });
    // the detector cell under each path: the more photons arrive, the brighter it gets
    const hits = PHOTONS.filter(p => p.lane === L && !p.absorbed && t >= p.hit).length, fresh = PHOTONS.some(p => p.lane === L && !p.absorbed && t >= p.hit && t < p.hit + 0.1);
    const c = [P.MD2, P.CY1, P.CY2, P.CY3, P.CY4][Math.min(4, hits)];
    const mb = new MB(); boxInto(mb, [xl[L], y, ze - 7], [12, 10, 10]); drawMesh(cam, mb.build(), { ramp: [P.MD1, c, fresh ? P.CY4 : c], id: newId(P.MD0), amb: 0.7, alpha: k });
  }
  for (const ph_ of PHOTONS) {
    const x = xl[ph_.lane], age = t - ph_.t; if (age < 0 || age > 0.5) continue;
    const z = lerp(zs, ze, age / 0.45); if (z < ze - 1) continue;
    if (ph_.absorbed && age > 0.3) {                 // stopped by the iodine in the artery: the photon is gone
      const zA = lerp(zs, ze, 0.3 / 0.45), u = (age - 0.3) / 0.14;
      if (u < 1) { const rr = 2 + 5 * u; for (let s = 0; s < 12; s++) { const a0 = s / 12 * TAU, a1 = (s + 1) / 12 * TAU; line3(cam, [x + rr * Math.cos(a0), y, zA + rr * Math.sin(a0)], [x + rr * Math.cos(a1), y, zA + rr * Math.sin(a1)], P.CY2, 1, { blend: 0.8 * (1 - u), noZtest: true }); } }
      continue;
    }
    line3(cam, [x, y, z + 14], [x, y, z], P.CY2, 1, { blend: 0.55, noZtest: true });
    sprite3(cam, [x, y, z], 2.2, [P.CY2, P.CY3, P.CY4], { noZtest: true });
  }
}
// ---------------------------------------------------------------- C: the helical path and the measurement patterns streaming into the data volume
function helixTrail(cam, t) {
  const k = ph(t, 28.2, 28.6) * (1 - ph(t, 30.7, 31.0)); if (k <= 0) return;
  let prev = null;
  for (let s = 28.2; s <= Math.min(t, 30.8); s += 1 / 30) { const phi = gantryPhi(s), y = scanY(s), r = GAN.rRot - 40, p = [r * Math.sin(phi), y, r * Math.cos(phi)]; if (prev) line3(cam, prev, p, P.CY2, 1, { blend: 0.7 * k }); prev = p; }
}
const SINO_STRIPS = 14;
function streamPatterns(cam, t) {
  const k = ph(t, 28.6, 29.0) * (1 - ph(t, 30.7, 31.0)); if (k <= 0) return;
  if (!A.sinoTex) A.sinoTex = sinoTex();
  for (let i = 0; i < SINO_STRIPS; i++) {
    const t0 = 28.7 + i * 0.15, u = clamp((t - t0) / 0.9, 0, 1); if (u <= 0 || u >= 1) continue;
    const phi = gantryPhi(t0), y = scanY(t0), from = [(GAN.rRot - 10) * Math.sin(phi + Math.PI), y, (GAN.rRot - 10) * Math.cos(phi + Math.PI)], to = [0, lerp(-60, 80, i / SINO_STRIPS), 0];
    const p = lerp3(from, to, smooth(u)), w = lerp(90, 40, u), h = 12;
    const q = quadMesh(add3(p, [-w / 2, 0, -h / 2]), [w, 0, 0], [0, 0, h]);
    drawMesh(cam, q, { ramp: [0], back: [0], tex: A.sinoTex, unlit: true, id: 0, alpha: (1 - u * 0.6) * k, ao: i & 7 });
  }
}
// ---------------------------------------------------------------- D: reconstruction → slices → voxel volume → vessels
function digitalScene(cam, t) {
  digitalBG(cam, t);
  const boxK = (1 - ph(t, 36.6, 37.4));
  dataBox(cam, boxK);
  if (t < 34.6) {
    // the image plane at the MCA level, back-projection building the image from the measured patterns
    const kOf = s => s < 31.25 ? 0 : Math.min(72, Math.round(Math.pow(2, lerp(0, Math.log2(72), seg(s, 31.25, 32.9)))));
    const k = kOf(t), sharpK = ph(t, EV.sharpen - 0.05, EV.sharpen + 0.25), pk = ph(t, 31.0, 31.4);
    const texS = A.slices[1].tex;
    if (sharpK < 1) drawSliceQuad(cam, t, fbpTex(k, false), -6, pk, { scale: 1.0 });
    if (sharpK > 0) drawSliceQuad(cam, t, A.fbpSharp || (A.fbpSharp = fbpTex(72, true)), -6.1, pk * sharpK, { scale: 1.0, ao: 5 });
    if (t > 33.6) drawSliceQuad(cam, t, texS, -5.5, ph(t, 33.6, 34.4));
    // the measurement patterns around the plane, each lighting up as it is back-projected
    if (!A.sinoTex) A.sinoTex = sinoTex();
    const used = t < 33 ? k : 72;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = 150, c = [r * Math.sin(a), -6, r * Math.cos(a)], tg = [Math.cos(a), 0, -Math.sin(a)], w = 70;
      const q = quadMesh(add3(c, add3(mul3(tg, -w / 2), [0, -6, 0])), mul3(tg, w), [0, 12, 0]);
      const on = used > i * 6;
      drawMesh(cam, q, { ramp: [0], back: [0], tex: A.sinoTex, unlit: true, id: 0, alpha: on ? 0.95 : 0.4, ao: i & 7 });
      if (on && used < 72 && used >= i * 6 && used < i * 6 + 6) line3(cam, c, [-c[0], -6, -c[2]], P.CY3, 1, { blend: 0.35, noZtest: true });
    }
    return;
  }
  // the stack of axial slices (exploded, then closing up), the dense stack, the voxels
  const ex = lerp(2.6, 1.0, ph(t, 36.9, 37.7)), dense = ph(t, 37.3, 37.9), vox = ph(t, 37.9, 38.6), tissueA = 1 - ph(t, 39.7, 40.5), boneA = 1 - ph(t, 40.2, 41.0), vessA = 1 - ph(t, 41.2, 41.8);
  if (vox < 1) {
    const sl = A.slices.map((s, i) => ({ s, y: -6 + (s.level + 6) * ex, show: ph(t, EV.slices[i] - 0.15, EV.slices[i] + 0.2) }));
    const k = 1 - vox;
    for (const q of sl) if (q.show > 0) drawSliceQuad(cam, t, q.s.tex, q.y, q.show * k * (1 - dense * 0.4), { ao: 1 });
    if (dense > 0) for (const s of A.sliceDense) drawSliceQuad(cam, t, s.tex, s.level, dense * k * 0.55, { ao: 3 });
  }
  if (vox > 0) {
    drawMesh(cam, A.voxVess, M(RAMP.vr, P.G2, { alpha: vox * vessA, ao: 2, amb: 0.4 }));
    const cn = norm3([cam.eye[0], 0, cam.eye[2]]);              // open the half of the volume that faces the camera
    if (vox * boneA > 0) drawMesh(cam, A.voxBone, M(RAMP.bone, P.BO0, { back: [P.BO0, P.BO1, P.BO2], clip: [cn[0], 0, cn[2], -4], alpha: vox * boneA, ao: 4, amb: 0.42 }));
    if (vox * tissueA > 0) drawMesh(cam, A.voxTissue, M(RAMP.brain, P.BR0, { back: [P.BR1, P.BR2], clip: [cn[0], 0, cn[2], 30], alpha: 0.85 * vox * tissueA, ao: 6, amb: 0.42 }));
  }
  if (t > 41.2) { drawMesh(cam, A.art, M(RAMP.vr, P.G1, { amb: 0.26, dif: 0.7, rim: 0.42, alpha: ph(t, 41.2, 41.8), ao: 1 })); }
  r3dOutlines();
}
// ---------------------------------------------------------------- E: the oblique CT plane through the aneurysm
const mprOpen = t => ph(t, EV.mpr, EV.mpr + 0.5) * (1 - ph(t, 53.0, 53.6));
// the 3D vessels inside a box in front of the plane (between it and the camera) are opened away, so the plane's section of
// the sac lines up with the 3D sac that continues behind it
function mprClip(open) {
  const c = MPR.c, n = MPR.n, e1 = MPR.e1, e2 = MPR.e2, h = MPR.half + 1.5, hv = MPR.half * open + 1.5;
  return (x, y, z) => { const dx = x - c[0], dy = y - c[1], dz = z - c[2], d = dx * n[0] + dy * n[1] + dz * n[2], u = dx * e1[0] + dy * e1[1] + dz * e1[2], v = dx * e2[0] + dy * e2[1] + dz * e2[2]; return Math.min(d, 9 - d, h - Math.abs(u), hv - Math.abs(v)); };
}
function mprPlane(cam, t, open) {
  // the plane unfolds from its middle line; texture row 0 is its +e2 edge
  const h = MPR.half, eu = mul3(MPR.e1, h * 2), ev = mul3(MPR.e2, -h * 2 * open), p0 = add3(sub3(MPR.c, mul3(MPR.e1, h)), mul3(MPR.e2, h * open));
  drawMesh(cam, quadMesh(p0, eu, ev), { ramp: [0], back: [0], tex: A.mpr, unlit: true, id: 0 });
  const c = [p0, add3(p0, eu), add3(add3(p0, eu), ev), add3(p0, ev)];
  for (let i = 0; i < 4; i++) line3(cam, c[i], c[(i + 1) % 4], P.CY2, 1, { blend: 0.8, noZtest: true });
}
// ---------------------------------------------------------------- frame
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6);
  assetsInit(); ctInit();
  visual(t);
}
function engineInit() { assetsInit(); ctInit(); }
