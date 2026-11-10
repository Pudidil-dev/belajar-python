'use strict';
// ============================================================================
// THE PATIENT (one middle-aged man; body mm), drawn like the CTA film: every
// body part is a smooth mesh (marching tetrahedra over signed-distance
// shapes) shaded with dithered palette ramps and soft rim light. The rig:
// rigid parts on a small skeleton, a gait with heel strikes on the beat,
// stance-foot locking, the calf-holding pose with two-bone IK. Model space:
// forward +x, up +y, the patient's RIGHT side +z (the camera sits on his
// right: the symptomatic right leg is always the near leg). He is framed from
// the neck down; the face is never shown. Grey-blue T-shirt, dark knee-length
// shorts, white socks, grey trainers.
// ============================================================================
const RP = {
  skin: [P.SK0, P.SK1, P.SK2, P.SK3, P.SK4],
  shirt: ['#1A2633', '#2B4052', '#41607A', '#5F829E', '#8EAEC6'].map(hexc),
  shorts: ['#0A0E12', '#151C24', '#222C37', '#33404D', '#485666'].map(hexc),
  sock: ['#6E747C', '#A9AFB6', '#D4D9DE', '#F0F3F5'].map(hexc),
  shoe: ['#1A1E24', '#2D333B', '#465059', '#66717D', '#8A95A1'].map(hexc),
  sole: ['#8E949A', '#BEC3C8', '#E2E5E8', '#F6F7F8'].map(hexc),
  hair: ['#120E14', '#21191F', '#33262A', '#4A3733'].map(hexc),
  pain: [P.PA0, P.PA1, P.PA2, P.PA3, P.PA4],
  // small details that make the clothes read: the folded hems of the sleeves and shorts, the ribbed sock tops, the laces
  shirtHem: ['#131C27', '#213243', '#334E66', '#4B6C88', '#7495AF'].map(hexc),
  shortsHem: ['#11171D', '#1F2933', '#303D4B', '#465666', '#607386'].map(hexc),
  sockRib: ['#5C626A', '#8A9098', '#AEB4BA', '#CACFD4'].map(hexc),
  lace: ['#8E949A', '#BEC3C8', '#E2E5E8', '#F6F7F8'].map(hexc),
};
const PVS = 6;                                    // meshing grid (mm)
// ---------------------------------------------------------------- parts (local frames: joint at origin)
const PART = {};
const keep = (f, y0, above) => (x, y, z) => Math.max(f(x, y, z), above ? y0 - y : y - y0);   // the part above (or below) y0
const iso = (f, b, attr, h) => isoMesh(f, b[0], b[1], b[2], b[3], b[4], b[5], h || PVS, attr);
const SD = {
  pelvis: (x, y, z) => {                                            // waist to crotch, padded hips, the seat behind
    const core = sdB(x, y, z, -4, 44, 0, 94, 96, 146, 60), hips = Math.min(sdE(x, y, z, -8, -6, 90, 90, 98, 84), sdE(x, y, z, -8, -6, -90, 90, 98, 84));
    return smin(smin(core, hips, 46), sdE(x, y, z, -46, 14, 0, 88, 104, 148), 44);
  },
  torso: (x, y, z) => { const belly = sdE(x, y, z, 8, 120, 0, 118, 150, 160), chest = sdE(x, y, z, 14, 300, 0, 112, 150, 182), sh = sdB(x, y, z, 0, 390, 0, 86, 50, 196, 46); return smin(smin(belly, chest, 40), sh, 50); },
  head: (x, y, z) => Math.min(sdC(x, y, z, -4, 0, 0, 0, 90, 0, 54, 50), sdE(x, y, z, 6, 170, 0, 98, 118, 86)),
  uarm: (x, y, z) => sdC(x, y, z, 0, 0, 0, 0, -300, 0, 52, 40),
  farm: (x, y, z) => sdC(x, y, z, 0, 0, 0, 0, -252, 0, 38, 27),
  // the right hand, relaxed (wrist at the origin, fingers toward −y, the palm facing −z, the thumb on the +x side):
  // a palm, four fingers of two segments each curling toward the palm, and the thumb. The left hand is its mirror.
  hand: (x, y, z) => {
    let f = 1e9;
    for (const [fx, L] of [[33, 68], [14, 76], [-5, 70], [-24, 54]]) {
      const l1 = L * 0.55, l2 = L * 0.45, c1 = 0.3, c2 = 0.95, my = -88 - l1 * Math.cos(c1), mz = -l1 * Math.sin(c1);
      f = Math.min(f, sdC(x, y, z, fx, -84, 0, fx, my, mz, 9, 8.4), sdC(x, y, z, fx, my, mz, fx, my - l2 * Math.cos(c2), mz - l2 * Math.sin(c2), 8.4, 7.4));
    }
    const palm = sdB(x, y, z, 5, -48, 0, 38, 44, 12.5, 11);
    const thumb = Math.min(sdC(x, y, z, 36, -26, -3, 56, -58, -12, 11.5, 10), sdC(x, y, z, 56, -58, -12, 59, -88, -22, 10, 8.6));
    return smin(smin(palm, f, 5), thumb, 7);
  },
  thigh: (x, y, z) => sdC(x, y, z, 6, 0, 0, 0, -440, 0, 90, 58),
  shin: (x, y, z) => smin(sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), sdE(x, y, z, -30, -130, 0, 50, 120, 48), 30),
  foot: (x, y, z) => smin(sdE(x, y, z, -20, -40, 0, 60, 44, 48), sdE(x, y, z, 110, -52, 0, 104, 32, 50), 30),
};
// the calf (back of the shin) as a 0..1 attribute: where the working, painful muscle glows
const calfAttr = (x, y, z) => clamp(-sdE(x, y, z, -44, -140, 0, 70, 118, 70) / 30, 0, 1);
const hairAttr = (x, y, z) => (y > 185 || (x < -30 && y > 120)) && sdE(x, y, z, 6, 170, 0, 98, 118, 86) < 4 ? 1 : 0;
function buildParts() {
  if (PART.pelvis) return;
  PART.pelvis = iso(SD.pelvis, [-150, -120, -190, 125, 175, 190], null, 10);       // big smooth parts on a coarser grid
  PART.torso = iso(SD.torso, [-140, -20, -215, 150, 470, 215], null, 11);
  PART.head = iso(SD.head, [-120, -20, -100, 130, 290, 100], hairAttr, 9);
  const band = (f, y0, y1, grow) => (x, y, z) => Math.max(f(x, y, z) - grow, y0 - y, y - y1);   // a slightly raised band between two heights
  PART.sleeve = iso(keep(SD.uarm, -146, true), [-60, -320, -60, 60, 50, 60], null, 8);
  PART.sleeveHem = iso(band(SD.uarm, -161, -146, 2.5), [-64, -170, -64, 64, -138, 64], null, 7);
  PART.uarmSkin = iso(keep(SD.uarm, -160, false), [-60, -320, -60, 60, 50, 60]);
  PART.farm = iso(SD.farm, [-50, -300, -50, 50, 40, 50], null, 7);
  PART.handR = iso(SD.hand, [-46, -182, -58, 76, 12, 26], null, 5);
  PART.handL = iso((x, y, z) => SD.hand(x, y, -z), [-46, -182, -26, 76, 12, 58], null, 5);
  PART.thighShorts = iso(keep(SD.thigh, -284, true), [-100, -460, -100, 110, 60, 100], null, 9);
  PART.shortsHem = iso(band(SD.thigh, -301, -284, 3), [-100, -312, -100, 112, -276, 100], null, 8);
  PART.thighSkin = iso(keep(SD.thigh, -300, false), [-100, -460, -100, 110, 60, 100], null, 7);
  PART.shinSkin = iso(keep(SD.shin, -330, true), [-110, -440, -80, 80, 40, 80], calfAttr);
  PART.sockRib = iso(band(SD.shin, -352, -329, 2.5), [-70, -360, -60, 70, -322, 60], null, 7);
  PART.sock = iso(keep(SD.shin, -350, false), [-110, -440, -80, 80, 40, 80]);
  PART.shoe = iso(keep(SD.foot, -70, true), [-90, -90, -60, 220, 30, 60], null, 7);
  PART.lace = iso((x, y, z) => Math.max(SD.foot(x, y, z) - 2.5, sdB(x, y, z, 62, -20, 0, 40, 40, 21, 6)), [10, -70, -34, 116, 16, 34], null, 7);
  PART.sole = iso(keep(SD.foot, -70, false), [-90, -90, -60, 220, 30, 60]);
}
// which meshes make each rig part, and their materials
// [mesh, material, outline group (when it shares its neighbour's outline)]
const PART_MESH = { pelvis: [['pelvis', 'shorts']], torso: [['torso', 'shirt']], head: [['head', 'skin']],
  uarm: [['sleeve', 'shirt'], ['sleeveHem', 'shirtHem', 'shirt'], ['uarmSkin', 'skin']], farm: [['farm', 'skin']], handR: [['handR', 'skin']], handL: [['handL', 'skin']],
  thigh: [['thighShorts', 'shorts'], ['shortsHem', 'shortsHem', 'shorts'], ['thighSkin', 'skin']], shin: [['shinSkin', 'skin'], ['sockRib', 'sockRib', 'sock'], ['sock', 'sock']],
  foot: [['shoe', 'shoe'], ['lace', 'lace', 'shoe'], ['sole', 'sole']] };
const OL = { skin: P.SK0, shirt: hexc('#0E1620'), shorts: hexc('#04070A'), sock: hexc('#4A5058'), shoe: hexc('#0C0F12'), sole: hexc('#5A6066') };
// ---------------------------------------------------------------- the walk: footfalls → rolling feet → leg IK
// Planned from where the feet land, like a real walk. Each heel strike has a time and a place; a foot that carries
// weight stays put on the floor while it rolls (heel → flat → toes); the swinging foot travels on a smooth arc to its
// next landing; the hips glide along a smooth path, rise over the standing leg and sink when both feet are down, sway
// toward the standing foot and turn with the leading leg; knees and hips follow by IK. Nothing slides or floats, and
// nothing stops and starts between steps.
// For the score: right heel strikes at 0.0, 1.5, 3.0, 4.5 s; left at 0.75, 2.25, 3.75 s → one step per beat
const STEPS = [0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5];
const AMP_K = [[0, 1], [1.6, 1], [2.25, 0.86], [3.0, 0.7], [3.75, 0.5], [4.5, 0.3], [4.85, 0]];
function gaitAmp(t) { for (let i = 0; i + 1 < AMP_K.length; i++) if (t < AMP_K[i + 1][0]) return lerp(AMP_K[i][1], AMP_K[i + 1][1], smooth(seg(t, AMP_K[i][0], AMP_K[i + 1][0]))); return 0; }
const D2R = Math.PI / 180;
const FOOT_H = 84, PIV_HEEL = [-30, -84, 0], PIV_TOE = [150, -84, 0], HS_PITCH = 13 * D2R, TO_PITCH = -34 * D2R, TOE_OUT = 6 * D2R, LEG_A = 440, LEG_B = 420;
const footRot = (side, pitch) => mMul(mRy(side === 'R' ? -TOE_OUT : TOE_OUT), mRz(pitch));
const dirApply = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[4] * v[0] + M[5] * v[1] + M[6] * v[2], M[8] * v[0] + M[9] * v[1] + M[10] * v[2]];
const herm = (p0, m0, p1, m1, s) => { const s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1; };
// a monotone cubic through [t, v] keys (Fritsch–Carlson): smooth, no overshoot, no stops between keys; flat outside
function monoCubic(keys) {
  const n = keys.length, d = [], m = [];
  for (let i = 0; i + 1 < n; i++) d.push((keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]));
  for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  for (let i = 0; i + 1 < n; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], r = a * a + b * b;
    if (r > 9) { const k = 3 / Math.sqrt(r); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (keys[i + 1][0] < t) i++;
    const h = keys[i + 1][0] - keys[i][0]; return herm(keys[i][1], m[i] * h, keys[i + 1][1], m[i + 1] * h, (t - keys[i][0]) / h);
  };
}
// a walk: falls [{side: 'R' | 'L', t: heel strike, x: the ankle's x with the foot flat}], the hips' x through keys [t, x]
function gaitPlan(falls, hipKeys, o) {
  o = Object.assign({ stand: 940, sway: 15, yaw: 4.5, list: 2.2, ds: 0.24, vRef: 680 }, o || {});
  const F = falls.map(f => Object.assign({ z: f.side === 'R' ? 92 : -92 }, f)).sort((a, b) => a.t - b.t);
  F.forEach((f, i) => {
    f.next = F.slice(i + 1).find(g => g.side === f.side) || null;
    const oth = F.slice(i + 1).find(g => g.side !== f.side) || null; f.oth = oth;
    if (f.next && oth) { f.to = oth.t + o.ds * (oth.t - f.t); f.flat = f.t + 0.13 * (f.to - f.t); f.ho = f.t + 0.6 * (f.to - f.t); }
    else { f.to = null; f.flat = f.t + 0.16; f.ho = null; }
  });
  const hipX = monoCubic(hipKeys), rot = footRot;
  // the foot on the floor: it turns about the heel after the strike, lies flat, then turns about the ball of the foot
  const planted = (f, t) => {
    let pitch = 0, piv = null;
    if (t < f.flat) { pitch = HS_PITCH * (1 - smooth(seg(t, f.t, f.flat))); piv = PIV_HEEL; }
    else if (f.ho !== null && t > f.ho) { const u = seg(t, f.ho, f.to); pitch = TO_PITCH * u * u; piv = PIV_TOE; }
    const M = rot(f.side, pitch), flatA = [f.x, FOOT_H, f.z], W = piv ? add3(flatA, dirApply(rot(f.side, 0), piv)) : null;
    return { A: piv ? sub3(W, dirApply(M, piv)) : flatA, M, pitch, piv, W, side: f.side, sign: piv === PIV_TOE ? -1 : 1 };
  };
  // the swinging foot: a Hermite arc from the toe-off (leaving with the roll's speed) to the next heel strike
  const swing = (f, t) => {
    const g = f.next, D = g.t - f.to, s = clamp((t - f.to) / D, 0, 1);
    const a0 = planted(f, f.to), ab = planted(f, f.to - 1e-3), v0 = mul3(sub3(a0.A, ab.A), D / 1e-3), a1 = planted(g, g.t);
    const v1 = [0.35 * (a1.A[0] - a0.A[0]), -50, 0];
    const A = [herm(a0.A[0], v0[0], a1.A[0], v1[0], s), herm(a0.A[1], v0[1], a1.A[1], v1[1], s) + 30 * Math.pow(Math.sin(Math.PI * s), 2), lerp(a0.A[2], a1.A[2], smooth(s))];
    const pitch = herm(TO_PITCH, TO_PITCH / (f.to - f.ho) * D, HS_PITCH, 0, s);
    return { A, M: rot(f.side, pitch), pitch };
  };
  const bySide = { R: F.filter(f => f.side === 'R'), L: F.filter(f => f.side === 'L') };
  // the foot at time t, and how much it bears weight (c: 1 on the floor; in swing it lets go and takes over gradually)
  const footAt = (side, t) => {
    let f = null; for (const g of bySide[side]) if (g.t <= t) f = g;
    if (!f) return Object.assign(planted(bySide[side][0], bySide[side][0].t), { c: 1 });
    // swinging: it bears nothing, but as it nears its landing the hips already settle to where that leg will reach
    if (f.to !== null && t >= f.to && f.next) { const s = (t - f.to) / (f.next.t - f.to); return Object.assign(swing(f, t), { c: 0, land: planted(f.next, f.next.t).A, cl: smooth(clamp((s - 0.55) / 0.45, 0, 1)) }); }
    // on the floor; once the other foot is down (double support) this one hands its weight over until its toes leave
    // (meanwhile the toe roll adapts so the toes stay on the floor while the knee starts to bend)
    return Object.assign(planted(f, t), { c: f.to !== null && f.oth && t > f.oth.t ? 1 - smooth(seg(t, f.oth.t, f.to)) : 1 });
  };
  // the hips ride as high as the weight-bearing legs reach (an inverted pendulum: highest over the standing foot,
  // lower when both feet are down), a soft minimum over the feet so the height never jumps
  const LR = 857, hipH = (t, x, R, L) => {
    const terms = [o.stand];
    for (const F_ of [R, L]) {
      const P_ = F_.land || F_.A, k = F_.land ? F_.cl : F_.c, dx = x - P_[0];
      terms.push(P_[1] + Math.sqrt(Math.max(0, LR * LR - dx * dx)) + (1 - k) * 300);
    }
    const m = Math.min(...terms); let sum = 0; for (const v of terms) sum += Math.exp(-(v - m) / 6); return m - 6 * Math.log(sum);
  };
  // single support (one foot down): w 0..1 bump, side +1 the right foot is down, −1 the left (for the sway and the dip)
  const ev = []; F.forEach(f => { ev.push({ t: f.t, k: 'hs', f }); if (f.to !== null) ev.push({ t: f.to, k: 'to', f }); }); ev.sort((a, b) => a.t - b.t);
  const support = t => {
    let e = null, nx = null; for (const x of ev) { if (x.t <= t) e = x; else { nx = x; break; } }
    if (!e || e.k !== 'to' || !nx) return { w: 0, side: 0 };
    return { w: (1 - Math.cos(TAU * clamp((t - e.t) / (nx.t - e.t), 0, 1))) / 2, side: e.f.side === 'R' ? -1 : 1 };
  };
  const speed = t => (hipX(t + 0.02) - hipX(t - 0.02)) / 0.04;
  // the reach limit has sharp corners at every heel strike and toe-off; the hips follow a path below it whose vertical
  // acceleration stays within about 0.6 g: a morphological opening with parabolas (an infimal convolution rounds the
  // dips, a supremal one with a slightly sharper parabola then rounds the crests), so the path is smooth and never
  // out of the legs' reach
  const T0 = F[0].t, T1 = F[F.length - 1].t + 3, YN = Math.round((T1 - T0) * 240) + 1, yc = new Float32Array(YN), ye = new Float32Array(YN), yy = new Float32Array(YN), ACE = 4000, ACD = 6000, WN = 96;
  for (let i = 0; i < YN; i++) { const t = T0 + i / 240; yc[i] = hipH(t, hipX(t), footAt('R', t), footAt('L', t)); }
  for (let i = 0; i < YN; i++) { let m = 1e9; for (let j = Math.max(0, i - WN); j <= Math.min(YN - 1, i + WN); j++) { const d = (i - j) / 240, v = yc[j] + 0.5 * ACE * d * d; if (v < m) m = v; } ye[i] = m; }
  for (let i = 0; i < YN; i++) { let m = -1e9; for (let j = Math.max(0, i - WN); j <= Math.min(YN - 1, i + WN); j++) { const d = (i - j) / 240, v = ye[j] - 0.5 * ACD * d * d; if (v > m) m = v; } yy[i] = m; }
  const yAt = t => { const f = clamp((t - T0) * 240, 0, YN - 1), i = Math.floor(f), j = Math.min(YN - 1, i + 1); return lerp(yy[i], yy[j], f - i); };
  const sample = t => {
    const a = clamp(speed(t) / o.vRef, 0, 1), sp = support(t), R = footAt('R', t), L = footAt('L', t), Rl = footAt('R', t - 0.08), Ll = footAt('L', t - 0.08);
    const d = clamp((R.A[0] - L.A[0]) / 600, -1, 1), dLag = clamp((Rl.A[0] - Ll.A[0]) / 600, -1, 1);
    const y = yAt(t);
    return { p: [hipX(t), y, 0], a, d, dLag, sway: o.sway * a * sp.w * sp.side, yaw: o.yaw * a * d, list: -o.list * a * sp.w * sp.side, feet: { R, L } };
  };
  return { sample, at: t => [hipX(t), yAt(t)], falls: F };
}
// scenes 1-2: an unhurried walk whose steps shorten as the calf starts to hurt, then a last short step and a stop
const WALK = gaitPlan([
  { side: 'R', t: -1.5, x: -1080 }, { side: 'L', t: -0.75, x: -540 }, { side: 'R', t: 0, x: 0 }, { side: 'L', t: 0.75, x: 540 }, { side: 'R', t: 1.5, x: 1080 },
  { side: 'L', t: 2.25, x: 1590 }, { side: 'R', t: 3.0, x: 2060 }, { side: 'L', t: 3.75, x: 2460 }, { side: 'R', t: 4.5, x: 2780 },
  { side: 'L', t: 5.0, x: 2660 },                                       // the last, short step: the left foot comes up just behind the right
], [[-1.5, -1296], [-0.75, -756], [0, -216], [0.75, 324], [1.5, 864], [2.25, 1386], [3.0, 1872], [3.75, 2300], [4.5, 2652], [5.25, 2700], [5.6, 2705], [99, 2705]]);
// scene 12: walking again at an even pace (right heel strikes on 33.0 and 34.5 s, left on 33.75 and 35.25 s)
const WALK12 = (() => { const f = [], k = []; for (let i = -2; i <= 6; i++) { const t = 33 + 0.75 * i, x = 520 * i; f.push({ side: i % 2 === 0 ? 'R' : 'L', t, x }); k.push([t, x - 208]); } return gaitPlan(f, k); })();
// ---------------------------------------------------------------- posing
// breathing: a slow sine with a quicker in-breath; heavier and faster when he is in pain or out of breath
const breathe = (t, per) => { const u = ((t / per) % 1 + 1) % 1; return u < 0.42 ? Math.sin(Math.PI * u / 0.84) : Math.cos(Math.PI * (u - 0.42) / 1.16); };
// an orthonormal frame at O with local −y toward Tg and local x toward `side` (the bones are modelled along −y)
function frameTo(O, Tg, side) { const yA = norm3(sub3(O, Tg)), zA = norm3(cross3(side, yA)), xA = cross3(yA, zA); return [xA[0], yA[0], zA[0], O[0], xA[1], yA[1], zA[1], O[1], xA[2], yA[2], zA[2], O[2]]; }
// pose → world matrices of every part. P0: root (hip midpoint) world position; facing: rotation about y.
// q: {g (a walk sample: the hips and both feet; the legs then follow by IK), t (seconds: breathing and idle motion),
// hold (0..1: the right hand to the calf; or holdLeg / holdTorso / holdArm separately, so the knees, the back and the
// arms move one after the other), effort (0..1: heavy breathing), bend (torso forward, deg)}.
// Without g (reference poses) the legs stand straight under the hips.
function patientPose(P0, facing, q) {
  const out = [], g = q.g || null, hold = q.hold || 0;
  const hLeg = q.holdLeg !== undefined ? q.holdLeg : hold, hTor = q.holdTorso !== undefined ? q.holdTorso : hold, hArm = q.holdArm !== undefined ? q.holdArm : hold;
  const tt = q.t || 0, eff = q.effort || 0, walk = g ? g.a : 0, br = breathe(tt, lerp(3.6, 1.9, eff)) * lerp(1, 2.2, eff) * (1 - 0.6 * walk);
  // the hips: from the walk (sway, turn, dip) or standing; standing still the weight drifts slowly from foot to foot;
  // holding the calf they sink and move back while both feet stay where they are (the knees bend by IK)
  const idle = (1 - walk) * (1 - hLeg), drift = idle * 7 * Math.sin(TAU * tt / 5.3);
  let pel;
  if (g) pel = mMul(mT(g.p[0] - 55 * hLeg, g.p[1] - 70 * hLeg, g.p[2] + g.sway + drift), mMul(mRy(g.yaw * D2R), mRx(g.list * D2R)));
  else pel = mMul(q.rootM || mMul(mT(P0[0], P0[1], P0[2]), mRy(facing)), mT(0, -hLeg * 40, drift));
  out.push(['pelvis', pel]);
  const fwd = norm3(sub3(mApply(pel, [1, 0, 0]), mApply(pel, [0, 0, 0])));
  const legIK = (side, zs) => {
    const H = mApply(pel, [0, 0, zs]);
    let A, M;
    if (g) {
      const ft = g.feet[side]; A = ft.A; M = ft.M;
      // out of reach while rolling over the heel or the toes: roll a little further, the pivot stays on the floor
      if (ft.piv && Math.hypot(A[0] - H[0], A[1] - H[1], A[2] - H[2]) > LEG_A + LEG_B - 2) {
        const at = pt => sub3(ft.W, dirApply(footRot(side, pt), ft.piv)), lim = ft.sign * 70 * D2R;
        let lo = ft.pitch, hi = lim;
        for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2, Am = at(m); if (Math.hypot(Am[0] - H[0], Am[1] - H[1], Am[2] - H[2]) > LEG_A + LEG_B - 2) lo = m; else hi = m; }
        A = at(hi); M = footRot(side, hi);
      }
    }
    else {
      const R0 = q.rootM || mMul(mT(P0[0], P0[1], P0[2]), mRy(facing)), rot0 = [R0[0], R0[1], R0[2], 0, R0[4], R0[5], R0[6], 0, R0[8], R0[9], R0[10], 0];
      A = mApply(R0, [side === 'R' ? 40 * hLeg : -30 * hLeg, -(LEG_A + LEG_B) + 2, zs]);
      M = mMul(rot0, mMul(mRy((side === 'R' ? -1 : 1) * (q.armsUp ? 3 : 1) * TOE_OUT), mRz(q.armsUp ? -24 * D2R : 0)));   // lying: the feet fall outward, relaxed
    }
    const dv = sub3(A, H), d = clamp(Math.hypot(dv[0], dv[1], dv[2]), 120, LEG_A + LEG_B - 0.5), u = norm3(dv);
    const pole = add3(fwd, [0, 0, zs > 0 ? 0.08 : -0.08]), pl = norm3(sub3(pole, mul3(u, dot3(pole, u))));
    const x = (LEG_A * LEG_A - LEG_B * LEG_B + d * d) / (2 * d), h = Math.sqrt(Math.max(0, LEG_A * LEG_A - x * x));
    const K = add3(add3(H, mul3(u, x)), mul3(pl, h)), Ac = add3(H, mul3(u, d));
    const th = frameTo(H, K, fwd), sh = frameTo(K, Ac, fwd), ft = mMul(mT(Ac[0], Ac[1], Ac[2]), M);
    out.push(['thigh', th], ['shin', sh], ['foot', ft]);
    return { th, sh, ft };
  };
  const right = legIK('R', 92), left = legIK('L', -92);
  // the torso: a slight forward lean when walking, the shoulders turning against the hips, breathing;
  // when holding, bent as deep as the right hand needs to reach the calf (solved continuously)
  const dS = g ? g.d : 0, dL = g ? g.dLag : 0, list = g ? g.list : 0;
  let bendDeg = (q.bend || 0) + walk * (3 + 1.2 * Math.abs(dS)) - 0.9 * br;
  const calfBack = mApply(right.sh, [-58, -110, 4]);
  if (hTor > 0) {
    const shoulderAt = deg => mApply(mMul(pel, mMul(mT(-6, 140, 0), mRz(-deg * D2R))), [0, 372, 214]);
    let lo = 20, hi = 96;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2, s = shoulderAt(m); if (Math.hypot(calfBack[0] - s[0], calfBack[1] - s[1], calfBack[2] - s[2]) > 600) lo = m; else hi = m; }
    bendDeg = lerp(bendDeg, (lo + hi) / 2 - 1.6 * br, hTor);
  }
  const twist = -8 * walk * dS, roll = -list * 0.9;
  const tor = mMul(pel, mMul(mT(-6, 140, 0), mMul(mRy((twist - (g ? g.yaw : 0) * 0.2) * D2R), mMul(mRx(roll * D2R), mRz(-bendDeg * D2R)))));
  out.push(['torso', tor]);
  out.push(['head', mMul(tor, mMul(mT(4, 440, 0), mMul(mRy(-twist * 0.6 * D2R), mRz(Math.min(30, bendDeg * 0.25) * D2R))))]);
  // arms: they swing against the legs a moment late, the elbows bending more as each arm comes forward
  const rise = 3 * br;
  const fkArm = (zs, side) => {
    const sw = -side * (1 + 18 * walk) * dL, fwdness = clamp(-side * dL, 0, 1);
    const el = (12 + 6 * walk + 14 * walk * fwdness + 3 * (1 - walk) * Math.sin(TAU * tt / 4.1 + zs)) * D2R, ab = (7 + 2 * walk) * D2R;
    const ua = mMul(tor, mMul(mT(0, 372 + rise, zs), mMul(mRx(zs > 0 ? -ab : ab), mRz(sw * D2R))));
    const fa = mMul(ua, mMul(mT(0, -300, 0), mRz(el)));
    return { ua, fa };
  };
  let armR = fkArm(214, 1), armL = fkArm(-214, -1);
  if (q.armsUp) {                                                    // on the CT table: both arms raised above the head, elbows bent
    const up = (zs, side) => { const ua = mMul(tor, mMul(mT(0, 372 + rise, zs), mMul(mRx((zs > 0 ? -1 : 1) * 16 * D2R), mRz(168 * D2R)))); return { ua, fa: mMul(ua, mMul(mT(0, -300, 0), mMul(mRx((zs > 0 ? 1 : -1) * 34 * D2R), mRz(28 * D2R)))) }; };
    armR = up(214, 1); armL = up(-214, -1);
  }
  if (hArm > 0) {
    // two-bone IK; the hand travels on an arc (out to the side, then in), not a straight line, and rubs the calf a little
    const ikArm = (fk, target, pole, outw) => {
      const A = mApply(fk.ua, [0, 0, 0]), hand0 = mApply(fk.fa, [8, -320, 0]), e = hArm;
      const T = add3(lerp3(hand0, target, e), mul3(outw, 150 * Math.sin(Math.PI * e)));
      const a = 300, b = 345, dv = sub3(T, A), d = clamp(Math.hypot(dv[0], dv[1], dv[2]), 40, a + b - 1), u = norm3(dv);
      const pl = norm3(sub3(pole, mul3(u, dot3(pole, u))));
      const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
      const E = add3(add3(A, mul3(u, x)), mul3(pl, h)), Tc = add3(A, mul3(u, d));
      const F = norm3(sub3(mApply(tor, [1, 0, 0]), mApply(tor, [0, 0, 0])));
      return { ua: frameTo(A, E, F), fa: frameTo(E, Tc, F) };
    };
    const rub = smooth(clamp((hArm - 0.85) / 0.15, 0, 1)) * 14 * Math.sin(TAU * tt * 1.15);
    const thighFront = mApply(left.th, [74, -380, 0]), calfT = mApply(right.sh, [-58, -110 + rub, 4]);
    const back = norm3(sub3(mApply(tor, [-1, 0, 0]), mApply(tor, [0, 0, 0]))), latR = norm3(sub3(mApply(pel, [0, 0, 1]), mApply(pel, [0, 0, 0])));
    const ir = ikArm(armR, calfT, add3(back, [0, 0, 0.6]), add3(mul3(latR, 0.8), mul3(back, 0.4)));
    const il = ikArm(armL, thighFront, add3(back, [0, 0, -0.4]), add3(mul3(latR, -0.6), mul3(back, 0.2)));
    armR = ir; armL = il;
  }
  out.push(['uarm', armR.ua], ['farm', armR.fa], ['uarm', armL.ua], ['farm', armL.fa]);
  // the hands: palms toward the thighs when the arms hang; turned to lie on the calf and on the thigh when he holds them
  const pron = -Math.PI / 2 * smooth(hArm), wrist = mMul(mT(0, -250, 0), mRy(pron));
  out.push(['handR', mMul(armR.fa, wrist)], ['handL', mMul(armL.fa, wrist)]);
  return { parts: out, right, left };
}
// kept for the scenes: with a walk sample the IK already keeps both feet planted
const plantedPose = (root, q) => patientPose(root, 0, q);
// draw the patient; o: {socks (shoes off), pain (0..1: the calf glows orange), alpha (screen door), glassLeg (0..1: the right thigh and shin turn see-through),
// skipParts (names), skipXf (part matrices, e.g. pose.right.sh), fog}
function drawPatient(cam, pose, o) {
  o = o || {};
  buildParts();
  const ids = {}; for (const k in OL) ids[k] = newId(OL[k]);
  const glassXf = o.glassLeg > 0 ? [pose.right.th, pose.right.sh] : [];
  for (const [name, xf] of pose.parts) {
    if (o.skipParts && o.skipParts.includes(name)) continue;
    if (o.skipXf && o.skipXf.includes(xf)) continue;
    for (const [mesh, mt0, grp] of PART_MESH[name]) {
      if (o.socks && mesh === 'lace') continue;                          // shoes off on the CT table
      const mt = o.socks && name === 'foot' ? 'sock' : mt0;
      const m = { ramp: RP[mt], id: ids[o.socks && name === 'foot' ? 'sock' : (grp || mt)], amb: 0.32, dif: 0.68, rim: 0.26, fog: o.fog };
      if (mt === 'skin') Object.assign(m, { spec: 0.12, cap: 0.86 });
      if (mesh === 'head') m.mix = { ramp: RP.hair, f: a => a };
      if (mesh === 'shinSkin' && o.pain > 0 && xf === pose.right.sh) m.mix = { ramp: RP.pain, f: a => a * o.pain };
      if (o.alpha !== undefined && o.alpha < 1) { m.alpha = o.alpha; m.ao = 3; }
      if (glassXf.includes(xf)) {                                    // glassK fades the glass out (the camera dives through it)
        const g = o.glassLeg, k = o.glassK === undefined ? 1 : o.glassK; if (k <= 0) continue;
        Object.assign(m, { id: 0, glass: [lerp(1, 0.1, g) * k, lerp(1, 0.88, g) * k, 1.7] });
      }
      drawMesh(cam, PART[mesh], m, xf);
    }
  }
}
// contact shadows under the feet (flat dark ellipses on the floor, drawn before the patient)
function footShadows(cam, pose) {
  for (const s of [pose.right, pose.left]) {
    const p = mApply(s.ft, [60, -80, 0]), h = Math.max(0, p[1]);
    const c = project(cam, [p[0], 1, p[2]]); if (!c) continue;
    const k = 1 - clamp(h / 120, 0, 0.8), rx = 160 * c[2] * cam.F * k;
    for (let y = Math.floor(c[1] - rx * 0.3); y <= c[1] + rx * 0.3; y++) for (let x = Math.floor(c[0] - rx); x <= c[0] + rx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const dx = (x + 0.5 - c[0]) / rx, dy = (y + 0.5 - c[1]) / (rx * 0.3), q = dx * dx + dy * dy; if (q > 1) continue;
      buf[y * W + x] = mixc(buf[y * W + x], P.K0, 0.55 * k * (1 - q));
    }
  }
}
// the floor: a large plane of dark tiles (they show the walking speed), procedural so the edges stay crisp at any distance
const FLOOR_Q = [-2500, 7500, -1500, 1500];
const FLOOR = () => cached('floor', () => { const [x0, x1, z0, z1] = FLOOR_Q; return quadMesh([x0, 0, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0]); });
const FLOOR_C = [hexc('#0E1A28'), hexc('#122133')];
function drawFloor(cam, fog) {
  const [x0, x1, z0, z1] = FLOOR_Q;
  drawMesh(cam, FLOOR(), { ramp: [0], back: [0], unlit: true, id: 0, fog, pixFn: (u, v) => { const x = x0 + u * (x1 - x0), z = z0 + v * (z1 - z0); return FLOOR_C[(Math.floor(x / 320) + Math.floor(z / 320)) & 1]; } });
}
