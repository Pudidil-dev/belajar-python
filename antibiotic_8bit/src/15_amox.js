'use strict';
// ============================================================================
// THE MOLECULAR STORY (part 3): amoxicillin and the failing wall (40-52 s).
// Amoxicillin is drawn as its real 2D skeleton (penam core: the four-atom
// beta-lactam ring fused to the thiazolidine ring, its gem-dimethyl and
// carboxylate; the amide side chain with the alpha-amino group and the
// 4-hydroxyphenyl ring), atoms as amber beads by element. The molecules diffuse
// down through the mesh (meandering, never homing). In the PBP's cleft the
// serine attacks the beta-lactam carbonyl carbon (C7), the C7-N4 bond breaks
// (the ring opens) and C7 stays bonded to the serine: a long-lived acyl-enzyme.
// Then the remodeling hydrolases cut old cross-links in a patch of the wall.
// Molecule frame in 0.1 nm (1 unit = 1 Angstrom), y down.
// ============================================================================
const AMX_ATOMS = {
  S1: [0.5, 1.4, 'S'], C2: [-0.75, 2.3, 'C'], C3: [-2.0, 1.4, 'C'], N4: [-1.5, 0, 'N'], C5: [0, 0, 'C'], C6: [0, -1.5, 'C'], C7: [-1.5, -1.5, 'C'], O8: [-2.7, -2.4, 'O'],
  Ma: [-1.5, 3.4, 'C'], Mb: [0.1, 3.5, 'C'], C3a: [-3.4, 1.8, 'C'], O3b: [-4.0, 3.0, 'O'], O3c: [-4.2, 0.8, 'O'],
  N6a: [1.0, -2.7, 'N'], C6b: [2.4, -3.0, 'C'], O6c: [3.0, -2.0, 'O'], C6d: [3.1, -4.4, 'C'], N6e: [2.4, -5.6, 'N'],
  F1: [4.5, -4.6, 'C'], F2: [5.2, -5.81, 'C'], F3: [6.6, -5.81, 'C'], F4: [7.3, -4.6, 'C'], F5: [6.6, -3.39, 'C'], F6: [5.2, -3.39, 'C'], OH: [8.7, -4.6, 'O'],
};
const AMX_BONDS = [['N4', 'C5', 1, 1], ['C5', 'C6', 1, 1], ['C6', 'C7', 1, 1], ['C7', 'N4', 1, 1], ['C7', 'O8', 2],
  ['N4', 'C3', 1], ['C3', 'C2', 1], ['C2', 'S1', 1], ['S1', 'C5', 1], ['C2', 'Ma', 1], ['C2', 'Mb', 1], ['C3', 'C3a', 1], ['C3a', 'O3b', 2], ['C3a', 'O3c', 1],
  ['C6', 'N6a', 1], ['N6a', 'C6b', 1], ['C6b', 'O6c', 2], ['C6b', 'C6d', 1], ['C6d', 'N6e', 1], ['C6d', 'F1', 1],
  ['F1', 'F2', 1], ['F2', 'F3', 2], ['F3', 'F4', 1], ['F4', 'F5', 2], ['F5', 'F6', 1], ['F6', 'F1', 2], ['F4', 'OH', 1]];
const AMX_RC = [-0.75, -0.75];   // centre of the beta-lactam ring
const AMX_S = 2.0;               // drawn twice life size so it reads next to the schematic residue beads
const AMX_R = { C: 0.62, N: 0.62, O: 0.68, S: 0.86 };
const AMX_RAMP = { C: () => [P.AM1, P.AM3, P.AM4, P.AM0], N: () => [P.AM2, P.AM4, P.AM5, P.AM1], O: () => [P.AM3, P.AM5, P.G8, P.AM1], S: () => [P.AM0, P.AM2, P.AM3, P.AM0] };
// pose: ring centre (x, y), angle a, mirrored drawing; open: C7 shifted after the ring opens
function amxPt(pose, name, open) {
  const p = AMX_ATOMS[name]; let qx = p[0] - AMX_RC[0], qy = p[1] - AMX_RC[1];
  if (pose.mirror) qx = -qx;
  const c = Math.cos(pose.a), s = Math.sin(pose.a);
  let x = pose.x + (qx * c - qy * s) * AMX_S, y = pose.y + (qx * s + qy * c) * AMX_S;
  if (open && (name === 'C7' || name === 'O8')) { x += open[0]; y += open[1]; }
  return [x, y];
}
function drawAmox(cam, pose, st) {
  st = st || {};
  const sx = cam.x(pose.x), sy = cam.y(pose.y); if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;
  const open = st.open ? openShift(st.open) : null, pts = {};
  for (const k in AMX_ATOMS) pts[k] = amxPt(pose, k, open);
  const px = cam.z * AMX_S;
  // the beta-lactam ring face (the reactive four-membered ring stands out)
  if (!st.open || st.open < 0.5) poly(cam.pts([...pts.N4, ...pts.C5, ...pts.C6, ...pts.C7]), P.AM4);
  for (const [a, b, order, lact] of AMX_BONDS) {
    if (st.open && a === 'C7' && b === 'N4') continue;            // the broken amide bond of the opened ring
    const A = pts[a], B = pts[b], w = lact ? 0.42 : 0.3;
    if (px < 1.6) { line(cam.x(A[0]), cam.y(A[1]), cam.x(B[0]), cam.y(B[1]), lact ? P.AM4 : P.AM2); continue; }
    if (order === 2) {
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * 0.22, ny = dx / L * 0.22;
      bondAt(cam, [A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], P.AM1, 0.2); bondAt(cam, [A[0] - nx, A[1] - ny], [B[0] - nx, B[1] - ny], P.AM1, 0.2);
    } else bondAt(cam, A, B, lact ? P.AM5 : P.AM1, w);
  }
  if (px < 1.6) { for (const k of ['N4', 'C7', 'S1', 'F4']) pset(cam.x(pts[k][0]), cam.y(pts[k][1]), P.AM4); return; }
  for (const k in AMX_ATOMS) {
    const el = AMX_ATOMS[k][2], r = AMX_R[el] * px, p = pts[k], ramp = AMX_RAMP[el]();
    ball(cam.x(p[0]), cam.y(p[1]), Math.max(1, r), ramp[1], ramp[2], ramp[0], ramp[3]);
  }
}
// ---------------------------------------------------------------- the molecules: diffusion paths (meandering descent), docking
// docked pose relative to a cleft: ring centre left of the cleft centre, C7 toward the serine, the side chain out of the cleft
const DOCK_A = Math.PI / 4 + 0.31;
const dockPose = c => ({ x: c[0] - 2.0, y: c[1] - 0.6, a: DOCK_A, mirror: true });
const openShift = k => [1.1 * k, 0.35 * k];   // C7 (and its O) swing toward the serine once the C7-N4 bond breaks
// target PBP, time it is seated in the cleft, start time, start point, wander seed
const AMX_LIST = [
  { pbp: PBP_HERO, tDock: EV.dock2, t0: 39.6, p0: [64, -420], seed: 11 },
  { pbp: 0, tDock: 45.8, t0: 41.4, p0: [-8, -430], seed: 23 },
  { pbp: 2, tDock: 46.6, t0: 42.2, p0: [188, -430], seed: 37 },
  { pbp: 3, tDock: 47.0, t0: 42.6, p0: [304, -430], seed: 51 },
  { pbp: -1, t0: 39.8, p0: [-60, -400], seed: 63 }, { pbp: -1, t0: 40.2, p0: [120, -360], seed: 71 },
  { pbp: -1, t0: 41.0, p0: [230, -420], seed: 83 }, { pbp: -1, t0: 39.4, p0: [10, -330], seed: 97 },
];
function amxState(j, t) {
  const m = AMX_LIST[j]; if (t < m.t0) return null;
  const d = t - m.t0, wx = 16 * (vnoise(d * 0.8, m.seed) - 0.5) + 6 * (vnoise(d * 2.1, m.seed + 3) - 0.5), wy = 8 * (vnoise(d * 1.1, m.seed + 9) - 0.5);
  const tumble = 1.3 * Math.sin(d * 1.1 + m.seed) + 0.6 * Math.sin(d * 2.3 + m.seed * 0.7);
  if (m.pbp < 0) { // free molecules keep diffusing outside the wall
    return { pose: { x: m.p0[0] + wx * 2.2 + 3 * d, y: m.p0[1] + 9 * d + wy * 2, a: tumble + m.seed, mirror: m.seed % 2 === 1 } };
  }
  const cleft = pbpCleft(m.pbp, Math.max(t, m.tDock)), dp = dockPose(cleft);
  const f = smooth(seg(t, m.t0, m.tDock)), fy = 1 - Math.pow(1 - f, 1.6);
  const settle = smooth(seg(t, m.tDock - 0.7, m.tDock));
  const x = lerp(lerp(m.p0[0], dp.x, f) + wx * (1 - settle), dp.x, settle), y = lerp(lerp(m.p0[1], dp.y, fy) + wy * (1 - settle), dp.y, settle);
  const a = lerp(DOCK_A + tumble, DOCK_A, settle);
  const tA = m.pbp === PBP_HERO ? EV.ringOpen : INHIB_T[m.pbp] - 0.2;
  return { pose: { x, y, a, mirror: true }, docked: t >= m.tDock, open: smooth(seg(t, tA, tA + 0.25)), bonded: t >= (m.pbp === PBP_HERO ? EV.covalent : INHIB_T[m.pbp]) };
}
// the hero serine during the inhibition: rests, attacks C7 of the docked molecule, stays bonded
function heroSerineAmox(t) {
  const st = amxState(0, t), rest = serineRest(PBP_HERO, t);
  if (!st || t < EV.attack2 - 0.4) return { og: rest };
  const c7 = amxPt(st.pose, 'C7', st.open ? openShift(st.open) : null), target = [c7[0] + 2.3, c7[1] + 0.7];
  return { og: lerp2(rest, target, smooth(seg(t, EV.attack2 - 0.4, EV.attack2))), c7 };
}
function drawAmoxAll(cam, t) {
  if (t < 39.3) return;
  for (let j = AMX_LIST.length - 1; j >= 0; j--) {
    const st = amxState(j, t); if (!st) continue;
    drawAmox(cam, st.pose, st);
    const m = AMX_LIST[j];
    if (m.pbp >= 0 && m.pbp !== PBP_HERO && st.bonded) { // the other inhibited PBPs: serine bonded to the opened ring
      const c7 = amxPt(st.pose, 'C7', openShift(1)), og = [c7[0] + 2.3, c7[1] + 0.7];
      if (cam.z > 2.2) { drawSerine(cam, m.pbp, t, og); bondAt(cam, og, c7, P.AM4, 0.5); }
      sparkle(cam, c7[0], c7[1], t, INHIB_T[m.pbp], P.AM5);
    }
  }
  // the hero: serine attack, ring opening, the covalent bond (acyl-enzyme)
  const hs = heroSerineAmox(t);
  drawSerine(cam, PBP_HERO, t, hs.og);
  if (t >= EV.covalent && hs.c7) bondAt(cam, hs.og, hs.c7, P.AM4, 0.55);
  const st = amxState(0, t);
  if (st) {
    const c7 = amxPt(st.pose, 'C7', openShift(st.open)), n4 = amxPt(st.pose, 'N4');
    pulseRing(cam, c7[0], c7[1], t, EV.attack2, P.PB5);
    sparkle(cam, lerp(c7[0], n4[0], 0.5), lerp(c7[1], n4[1], 0.5), t, EV.ringOpen, P.AM5);
    sparkle(cam, c7[0] + 1, c7[1] + 0.3, t, EV.covalent, P.G8);
    pulseRing(cam, c7[0] + 1, c7[1] + 0.3, t, EV.covalent, P.AM4, 3);
  }
}
// ---------------------------------------------------------------- remodeling: two wall hydrolases cut old cross-links in a patch (50-52 s)
const CUTS = (() => {
  const out = [];
  for (const s of MWALL.strands) for (const q of s.stems) if (q.link && q.link.donor && q.cut < Infinity) {
    const o2 = q.link.other, s2 = q.link.s;
    out.push({ q, t: q.cut, a: stemBead(q.x, s.y, true, 3), b: stemBead(o2.x, s2.y, false, 2), li: s.li });
  }
  return out.sort((u, v) => u.t - v.t);
})();
const HYD_HOME = [[180, -150], [262, -196]];
function hydPos(h, t) {
  const mine = CUTS.filter((c, i) => i % 2 === h), keys = [[46, HYD_HOME[h][0] + 30, HYD_HOME[h][1] - 40]];
  let tt = 49.6;
  for (const c of mine) { const mx = (c.a[0] + c.b[0]) / 2 + 5, my = (c.a[1] + c.b[1]) / 2 - 3; keys.push([Math.max(tt, c.t - 0.22), mx, my], [c.t + 0.08, mx, my]); tt = c.t + 0.1; }
  const w = walk(keys, t);
  return [w[0] + Math.sin(t * 2.4 + h) * 0.8, w[1] + Math.cos(t * 2.1 + h) * 0.8];
}
function drawHydrolases(cam, t) {
  if (t < 46) return;
  for (let h = 0; h < 2; h++) { const [x, y] = hydPos(h, t); protein(cam, [[x, y, 12, 9], [x - 8, y + 5, 6.5, 5.5], [x + 9, y - 4, 6, 5]], R_HYD(), {}); }
  for (const c of CUTS) { const m = [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2 + wallSag(c.q.x, -118 - c.li * MOL.dy, t)]; sparkle(cam, m[0], m[1], t, c.t, P.DM3); pulseRing(cam, m[0], m[1], t, c.t, P.DM2, 2); }
}
// the cut patch comes apart: its layers spread (the inner one sinks toward the membrane, the outer ones lift)
function wallSag(x, y, t) {
  const k = smooth(seg(t, EV.gap - 0.4, EV.gap + 0.8)); if (k <= 0) return 0;
  const bx = Math.max(0, 1 - Math.abs(x - 228) / 95), b = bx * bx * (3 - 2 * bx), li = Math.round((MOL.oldY - y) / MOL.dy);
  return k * b * (li <= 0 ? 3 : li === 1 ? -10 : li === 2 ? -21 : -13);
}
