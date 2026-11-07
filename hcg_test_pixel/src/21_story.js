'use strict';
// ============================================================================
// THE STORY IN THE LEVEL: the conjugate the film follows (the hero), its hCG,
// the other labels and the captures. Motion = net flow + small random motion
// (stepped at 15 Hz) + encounter + a little turning; no attraction at a
// distance. A bound complex is one rigid group of separate sprites.
// ============================================================================
const STEP = t => Math.floor(t * 15) / 15;                                    // stepped sprite time
const JIT = (t, id, a) => a * (vnoise(STEP(t) * 2.3 + id * 7.1, id) - 0.5) * 2;
const jx = (t, id, a) => JIT(t, id * 2 + 1, a), jy = (t, id, a) => JIT(t, id * 2 + 2, a);
// tip of arm j of antibody i on a conjugate (world units)
function conjTip(gx, gy, rot, i, j) { const a = rot + i * TAU / NAB, d = dirv(a); return abTip(abGeom(gx + d[0] * (RG - 0.6), gy + d[1] * (RG - 0.6), a), j); }
// hCG held at the tip of arm +1 of antibody 0 (its detection site touching the tip)
function hcgOn(gx, gy, rot) {
  const tip = conjTip(gx, gy, rot, 0, 1), e = dirv(rot + AB.SP);
  return { cx: tip[0] + e[0] * (HCG.OFF + HCG.RA), cy: tip[1] + e[1] * (HCG.OFF + HCG.RA), b: rot + AB.SP + Math.PI, tip };
}
// the pose of a complex captured by mint antibody z (arm -1 tip on hCG's capture site); rot = conjugate rotation
function capturedPose(z, rot) {
  const gm = abGeom(z.u, z.v, z.a), tm = abTip(gm, -1), b = rot + AB.SP + Math.PI, d = dirv(b);
  const cx = tm[0] + d[0] * (HCG.OFF + HCG.RB), cy = tm[1] + d[1] * (HCG.OFF + HCG.RB);   // bottom site = centre - d * (OFF+RB)
  const top = [cx + d[0] * (HCG.OFF + HCG.RA), cy + d[1] * (HCG.OFF + HCG.RA)], off = conjTip(0, 0, rot, 0, 1);
  return { gx: top[0] - off[0], gy: top[1] - off[1], rot, h: { cx, cy, b }, mtip: tm };
}
// hero fibre surface: centre and unit normal (pointing up) near u
function fibreAt(u) {
  const p = FIBRES[0].pts; let best = 0;
  for (let i = 0; i < p.length; i += 2) if (Math.abs(p[i] - u) < Math.abs(p[best] - u)) best = i;
  const i0 = Math.max(0, best - 2), i1 = Math.min(p.length - 2, best + 2);
  let dx = p[i1] - p[i0], dy = p[i1 + 1] - p[i0 + 1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  return { u: p[best], v: p[best + 1], nx: dy, ny: -dx };
}
const frontOff = v => 34 * Math.sin(v / 95 + 1.3) + 26 * (vnoise(v / 47, 3) - 0.5) * 2;
// dried conjugates on the hero fibre, placed so the front reaches each one on its release beat
const DRY = (() => {
  const out = [];
  EV.release.forEach((tr, i) => {
    const side = (i === 1 || i === 2) ? -1 : 1;                       // -1 = resting on top of the fibre (the hero is index 1)
    let u = 140 + (i - 1) * 36, v = 0;
    for (let it = 0; it < 6; it++) {
      const f = fibreAt(u), r = FIBRES[0].w / 2 + 11.5;
      v = f.v + (side < 0 ? f.ny * r : -f.ny * r);
      u = LF.u0 + LF.v * (tr - LF.t0) + frontOff(v);
    }
    const f = fibreAt(u), r = FIBRES[0].w / 2 + 11.5;
    out.push({ u, v: f.v + (side < 0 ? f.ny * r : -f.ny * r), tr, side, rot: i * 1.3 + 0.4, id: 10 + i });
  });
  return out;
})();
const HERO0 = DRY[1];
// other dried conjugates across the conjugate pad (seen tiny in the wide shot)
const DRY_FAR = (() => {
  const out = [];
  for (let k = 1; k < FIBRES.length; k++) {
    const p = FIBRES[k].pts;
    for (let i = 0; i < p.length; i += 14) {
      const u = p[i], v = p[i + 1]; if (u < 15 || u > LV.CONJ1 - 10) continue;
      const tr = LF.t0 + (u - LF.u0 - frontOff(v)) / LF.v;
      out.push({ u, v: v - FIBRES[k].w / 2 - 10, tr, rot: hash(i + k * 31) * TAU, id: 100 + out.length });
    }
  }
  return out;
})();
function freePose(c, t) {                       // a dried conjugate that floats off when the liquid arrives
  if (t < c.tr) return { gx: c.u, gy: c.v, rot: c.rot };
  const a = t - c.tr, lift = smooth(clamp(a / 0.9, 0, 1));
  return { gx: c.u + 9 * a + jx(t, c.id, 1.4) * lift, gy: c.v + (c.side === 1 ? 7 : -7) * lift + jy(t, c.id, 1.4) * lift, rot: c.rot + 0.1 * a };
}
// ---------------------------------------------------------------- the hero conjugate and its hCG
const ROT_B = -1.2;                             // antibody 0 points up-left toward the arriving hCG at the binding beat
const ROT_F = Math.PI - AB.SP;                  // in the sandwich, arm +1 of antibody 0 points straight down
const HERO_Z = 4;                               // the mint antibody that captures it
const H_FINAL = capturedPose(ZONE_T[HERO_Z], ROT_F);
function heroPose(t) {
  const rel = HERO0.tr;
  const rotDrift = tt => ROT_B + 0.1 * (tt - EV.bind1);
  if (t < rel) return { gx: HERO0.u, gy: HERO0.v, rot: rotDrift(rel) };
  const base = tt => ({ gx: HERO0.u + 7 * (tt - rel), gy: HERO0.v - 9 * smooth(clamp((tt - rel) / 1.0, 0, 1)) });
  if (t < EV.pull8 + 0.25) {
    const b = base(t), q = smooth(clamp((t - rel) / 0.8, 0, 1)) * (t > EV.bind1 ? 0.5 : 1);
    return { gx: b.gx + jx(t, 1, 1.3) * q, gy: b.gy + jy(t, 1, 1.3) * q, rot: rotDrift(t) };
  }
  // travel to the test zone (28.25 → 31.25), then the last approach to the capture beat
  const p0 = base(EV.pull8 + 0.25), r0 = rotDrift(EV.pull8 + 0.25);
  const A = { gx: H_FINAL.gx - 26, gy: H_FINAL.gy - 20 };
  if (t < EV.settle) {
    const f = eio(seg(t, EV.pull8 + 0.25, EV.settle)), g = K75(seg(t, EV.pull8 + 0.5, EV.settle));
    return { gx: lerp(p0.gx, A.gx, f) + jx(t, 1, 0.8), gy: lerp(p0.gy, A.gy, f) + jy(t, 1, 0.8), rot: lerp(r0, ROT_F, g) };
  }
  if (t < EV.bind2) {
    const f = smooth(seg(t, EV.settle, EV.bind2)), q = 1 - f;
    return { gx: lerp(A.gx, H_FINAL.gx, f) + jx(t, 1, 1.0) * q, gy: lerp(A.gy, H_FINAL.gy, f) + jy(t, 1, 1.0) * q, rot: ROT_F };
  }
  return { gx: H_FINAL.gx, gy: H_FINAL.gy, rot: ROT_F };
}
// hCG: free until the first binding beat, then rides on antibody 0
function hcgPose(t) {
  if (t >= EV.bind1) { const h = heroPose(t), q = hcgOn(h.gx, h.gy, h.rot); return { cx: q.cx, cy: q.cy, b: q.b, bound: true }; }
  const h = heroPose(t), on = hcgOn(h.gx, h.gy, h.rot), e = dirv(h.rot + AB.SP);
  // approach along the arm direction: far → near (contact at bind1); small random motion fading out
  const S = { cx: on.cx - 92, cy: on.cy - 30 }, near = { cx: on.cx + e[0] * 14, cy: on.cy + e[1] * 14 };
  let cx, cy;
  if (t < EV.turn[0]) { const f = smooth(seg(t, EV.hcgIn, EV.turn[0])); cx = lerp(S.cx, near.cx, f); cy = lerp(S.cy, near.cy, f); }
  else { const f = smooth(seg(t, EV.turn[0] + 0.25, EV.bind1)); cx = lerp(near.cx, on.cx, f); cy = lerp(near.cy, on.cy, f); }
  const q = 1 - seg(t, EV.turn[2], EV.bind1);
  // turning: a slow tumble, then three small steps that line the detection site up with the arm tip
  let b = on.b + 1.1 + 0.6 * Math.sin(STEP(t) * 1.7);
  if (t >= EV.turn[0]) b = on.b + 0.75; if (t >= EV.turn[1]) b = on.b + 0.4; if (t >= EV.turn[2]) b = on.b;
  return { cx: cx + jx(t, 2, 2.2) * q, cy: cy + jy(t, 2, 2.2) * q, b, bound: false };
}
// ---------------------------------------------------------------- other complexes captured in the test zone (side view)
const OTHER_CAP = [[1, 0], [7, 1], [9, 2], [2, 3]].map(([zi, k]) => {
  const rot = ROT_F + (hash(zi * 13) - 0.5) * 0.3, pose = capturedPose(ZONE_T[zi], rot);
  return Object.assign(pose, { tc: EV.captures[k], id: 40 + zi, zi });
});
function otherPose(c, t) {                      // arrives from the upper left with the flow, lands on its beat
  const f = smooth(seg(t, c.tc - 0.9, c.tc)), q = 1 - f;
  return { gx: c.gx - 70 * q + jx(t, c.id, 1.0) * q, gy: c.gy - 44 * q + jy(t, c.id, 1.0) * q, rot: c.rot - 0.6 * q };
}
// unbound conjugates (no hCG) drifting over the zone: they pass the test zone
const PASSERS = [[-70, -40, 0.4], [-160, -6, 1.9], [-250, -60, 3.1], [-30, -82, 4.4], [-330, -24, 2.2]].map(([du, v, r], i) => ({ du, v, r, id: 60 + i }));
// subdued non-target molecules near the hero
const JUNK = (() => { const r = mulberry(91), a = []; for (let i = 0; i < 26; i++) a.push({ u: lerp(40, 330, r()), v: lerp(-95, 40, r()), k: r() < 0.6 ? 0 : 1, a: r() * TAU, id: 200 + i }); return a; })();
// dim background conjugates (parallax layer) during the trip
const BACKC = (() => { const r = mulberry(33), a = []; for (let i = 0; i < 12; i++) a.push({ u: lerp(60, 760, r()), v: lerp(-130, 10, r()), rot: r() * TAU, sp: 18 + r() * 22, id: 300 + i }); return a; })();
function drawBackConj(cam, t) {
  const bc = new Cam(cam.cx * 0.7, cam.cy * 0.7, cam.z * 0.62, cam.ax, cam.ay);
  for (const c of BACKC) drawConj(bc, c.u + c.sp * (t - 24), c.v + jy(t, c.id, 1.5), c.rot + 0.2 * t, { dim: true });
}
// ---------------------------------------------------------------- the level camera (u, v, zoom)
const LVCAM = (() => {
  const H = HERO0, hb = hcgOn(...Object.values(heroPose(EV.bind1)).slice(0, 3)), F = H_FINAL;
  return [
    [EV.fibres, -230, 0, 0.2], [EV.reachConj, -200, 0, 0.205, lin],
    [EV.reachConj + 1.25, H.u + 8, H.v + 4, 1.7, K75],
    [EV.lock, H.u + 8, H.v + 4, 1.7], [EV.pull6, H.u + 14, H.v - 2, 1.7, lin],
    [EV.pull6 + 1.0, H.u - 4, H.v - 16, 1.35, K75], [EV.push7 - 0.25, H.u + 4, H.v - 20, 1.35, lin],
    [EV.push7 + 0.75, hb.cx + 4, hb.cy + 4, 2.6, K75], [EV.pull8, hb.cx + 10, hb.cy + 2, 2.6, lin],
    [EV.pull8 + 0.75, H.u + 70, H.v - 6, 1.05, K75], [EV.settle, F.gx + 16, F.gy + 20, 1.2, eio],
    [EV.push9 - 0.25, F.gx + 16, F.gy + 20, 1.2], [EV.push9 + 0.75, F.gx - 14, F.gy + 16, 2.4, K75],
    [EV.steps[0], F.gx - 14, F.gy + 16, 2.4],
    [EV.steps[0] + 0.12, F.gx + 8, F.gy + 18, 1.45, eout], [EV.steps[1], F.gx + 8, F.gy + 18, 1.45],
    [EV.steps[1] + 0.12, F.gx + 16, F.gy + 26, 0.82, eout], [EV.steps[2], F.gx + 16, F.gy + 26, 0.82],
    [EV.steps[2] + 0.12, LV.T0 + 72, F.gy + 44, 0.46, eout], [EV.flip, LV.T0 + 72, F.gy + 44, 0.46],
  ];
})();
const levelCam = t => camTrack(LVCAM, t);
// strip mini-map position (0..1) of a level u
function mapU(u) {
  const K = [[-900, 0.02], [0, 0.23], [380, 0.39], [610, 0.56], [970, 0.68], [1500, 0.84]];
  for (let i = 0; i + 1 < K.length; i++) if (u < K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], clamp((u - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1));
  return K[K.length - 1][1];
}
// ---------------------------------------------------------------- side-view frame of the level (scenes 4-10a)
function sLevel(t, cam) {
  cam = cam || levelCam(t);
  drawLevel(cam, t);
  // chain flash in the sandwich: membrane → capture Ab → hCG → detection Ab → gold
  const ch = EV.chain, on = (i) => t >= ch[i] && t < ch[i] + 0.2 && Math.floor((t - ch[i]) / 0.05) % 2 === 0;
  const hiT = on(1) ? HERO_Z : (t >= EV.bind2 && t < EV.bind2 + 0.1 ? HERO_Z : -1);
  drawZones(cam, { hiT });
  if (on(0)) { const z = ZONE_T[HERO_Z]; rect(cam.x(z.u - 6), cam.y(z.v) - 1, cam.x(z.u + 6), cam.y(z.v) + 1, P.LW); }
  if (t > 24 && t < 33) drawBackConj(cam, t);
  if (t < 30) for (const j of JUNK) drawJunk(cam, j.u + 11 * (t - 20) + jx(t, j.id, 1.6), j.v + jy(t, j.id, 1.6), j.k, j.a + 0.3 * STEP(t));
  if (t < 24) for (const c of DRY_FAR) { const p = freePose(c, t); drawConj(cam, p.gx, p.gy, p.rot); }
  for (let i = 0; i < DRY.length; i++) { if (i === 1) continue; const p = freePose(DRY[i], t); drawConj(cam, p.gx, p.gy, p.rot); }
  if (t >= EV.steps[0] - 1.2) {
    for (const c of PASSERS) drawConj(cam, LV.T0 + c.du + 46 * (t - EV.steps[0]) + jx(t, c.id, 1.2), c.v + jy(t, c.id, 1.2), c.r + 0.3 * t);
    for (const c of OTHER_CAP) { if (t < c.tc - 0.9) continue; const p = otherPose(c, t), h = hcgOn(p.gx, p.gy, p.rot); drawHCG(cam, h.cx, h.cy, h.b); drawConj(cam, p.gx, p.gy, p.rot); if (t >= c.tc) sparkle(cam.x(c.mtip[0]), cam.y(c.mtip[1]), t - c.tc, P.MI0); }
  }
  // the hero and its hCG
  const hp = heroPose(t), hc = hcgPose(t);
  if (t >= EV.hcgIn - 0.5) drawHCG(cam, hc.cx, hc.cy, hc.b, { sites: t > EV.hcgTag && t < EV.bind2 + 0.5, hi: on(2) });
  drawConj(cam, hp.gx, hp.gy, hp.rot, { hiAb: on(3) ? 0 : -1, hiGold: on(4) });
  // dried crust around conjugates that have not been reached yet (pale sugar matrix)
  for (const c of DRY) if (t < c.tr + 0.25 && cam.z > 1) {
    const x = cam.x(c.u), y = cam.y(c.v), r = (RG + 6) * cam.z, k = t < c.tr ? 1 : 1 - (t - c.tr) / 0.25;
    for (let a = 0; a < 24; a++) { if (hash2(a, c.id) > 0.55 * k + 0.1) continue; const aa = a / 24 * TAU; pset(x + Math.cos(aa) * r, y + Math.sin(aa) * r, P.AB0); }
  }
  // binding sparkles
  const b1 = hcgOn(...Object.values(heroPose(EV.bind1)).slice(0, 3));
  if (t >= EV.bind1 && t < EV.bind1 + 0.3) { const q = hcgOn(hp.gx, hp.gy, hp.rot); sparkle(cam.x(q.tip[0]), cam.y(q.tip[1]), t - EV.bind1, P.CY0); }
  if (t >= EV.bind2 && t < EV.bind2 + 0.3) sparkle(cam.x(H_FINAL.mtip[0]), cam.y(H_FINAL.mtip[1]), t - EV.bind2, P.MI0);
  // lock-on bracket on the hero conjugate
  if (t >= EV.lock && t < EV.pull6 + 1.5) bracket(cam.x(hp.gx), cam.y(hp.gy), (RG + 10) * cam.z, EV.lock, t);
  return { hp, hc, cam };
}
