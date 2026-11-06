'use strict';
// ============================================================================
// THE MOLECULAR STORY (part 2): the precursor pathway (20-32 s).
// Cytoplasm: UDP-MurNAc gets its stem from four Mur ligases (L-Ala, D-Glu,
// m-DAP, then D-Ala-D-Ala). Inner face: MraY moves phospho-MurNAc-pentapeptide
// onto the lipid carrier's phosphate (Lipid I) and UMP leaves; MurG adds GlcNAc
// from UDP-GlcNAc (Lipid II) and UDP leaves. MurJ flips the head to the outer
// face; the glycosyltransferase (GT) adds the disaccharide-pentapeptide to the
// growing strand and frees the carrier (two phosphates); a phosphatase removes
// one phosphate and the carrier flips back inside. Units 0.1 nm, y down.
// ============================================================================
const XS = { mraY: ST.mraY + 6, murG: ST.murG, murJ: ST.murJ, gt: ST.gt + 10, phos: ST.phos + 8 };
const PT = { // pathway timing between the shared events
  toG0: 23.45, toG1: 24.3, udpIn: 23.95, toJ0: 25.45, toJ1: 26.35, toT0: 27.4, toT1: 28.35, fly0: 28.7,
  toP0: 29.5, toP1: 30.3, back0: 30.6, back1: 31.4,
};
// ---------------------------------------------------------------- small pieces
function ringAt(cam, x, y, r, n, rot, ramp) { // a small ring (nucleotide base or ribose)
  const sx = cam.x(x), sy = cam.y(y), rr = r * cam.z; if (sx < -14 || sy < -14 || sx > W + 14 || sy > H + 14) return;
  if (rr < 3) { disc(sx, sy, Math.max(1, rr), ramp[1]); return; }
  shade(maskPoly(ngon(sx, sy, rr, n, rot)), ramp[1], ramp[2], ramp[0], ramp[3], { k: rr > 9 ? 2 : 1 });
}
const R_NU = () => [P.NU1, P.NU2, P.NU3, P.NU0], R_PH = () => [P.PH0, P.PH1, P.PH2, P.NU0], R_LP = () => [P.LP1, P.LP3, P.PE4, P.LP0];
const phosAt = (cam, p, s) => beadAt(cam, p[0], p[1], R_PH(), { s: s || 0.78 });
// ---------------------------------------------------------------- the head group in its local frame (inner-face orientation, origin = carrier phosphate)
// C carrier P, P2 second phosphate, M MurNAc, G GlcNAc, stem beads, and the UDP part of the free precursor
const HL = { C: [0, 0], P2: [0, 5], M: [0, 10.5], G: [5.8, 11.7], P1: [5, 2], RIB: [10, 0], URA: [15.5, 1] };
const stemL = k => [k % 2 ? 0.8 : -0.8, 17 + 5.2 * k];
// pose: M world position and rotation th of the head; local point -> world
function hp(pose, l) { const dx = l[0] - HL.M[0], dy = l[1] - HL.M[1], c = Math.cos(pose.th), s = Math.sin(pose.th); return [pose.M[0] + dx * c - dy * s, pose.M[1] + dx * s + dy * c]; }
// the free precursor's walk past the four Mur ligases (M positions) and its dock at MraY
const LIG = [[-714, 118], [-678, 118], [-642, 118], [-606, 118]];
const PRE_PATH = [[20.2, -760, 104], [20.45, -714, 111.5], [20.62, -714, 111.5], [20.8, -678, 106.3], [20.97, -678, 106.3],
  [21.15, -642, 101.1], [21.32, -642, 101.1], [21.5, -606, 95.9], [21.75, -606, 95.9], [EV.dock, XS.mraY, 37.5]];
const preBeads = t => t < EV.aa[0] ? 0 : t < EV.aa[1] ? 1 : t < EV.aa[2] ? 2 : t < EV.aa[3] ? 3 : 5;
// where the carrier's phosphate (C) and the head are at time t
function carrierPose(t) {
  let x, y = 27, th = 0, M = null;
  if (t < PT.toG0) x = XS.mraY;
  else if (t < PT.toG1) x = lerp(XS.mraY, XS.murG, smooth(seg(t, PT.toG0, PT.toG1)));
  else if (t < PT.toJ0) x = XS.murG;
  else if (t < EV.flipIn) x = lerp(XS.murG, XS.murJ, smooth(seg(t, PT.toJ0, PT.toJ1)));
  else if (t < EV.flipOut) { // MurJ: the head passes through the cavity and turns over (rotation about the MurNAc)
    const f = smooth(seg(t, EV.flipIn, EV.flipOut)); x = XS.murJ; th = Math.PI * f;
    M = [x, 37.5 - 75 * f];
  }
  else if (t < PT.toT0) { x = XS.murJ; th = Math.PI; y = -27; }
  else if (t < PT.toP0) { x = lerp(XS.murJ, XS.gt, smooth(seg(t, PT.toT0, PT.toT1))); th = Math.PI; y = -27; }
  else if (t < PT.back0) { x = lerp(XS.gt, XS.phos, smooth(seg(t, PT.toP0, PT.toP1))); th = Math.PI; y = -27; }
  else { x = XS.phos; const f = smooth(seg(t, PT.back0, PT.back1)); y = lerp(-27, 27, f); th = Math.PI * (1 - f); }
  const wob = Math.sin(t * 2.3) * 0.5;
  if (!M) M = [x + wob - 10.5 * Math.sin(th), y + 10.5 * Math.cos(th)];   // M = C + R(th) (0, 10.5)
  const pose = { M, th };
  return { pose, C: hp(pose, HL.C) };
}
// ---------------------------------------------------------------- enzymes
function drawMurLigases(cam, t) {
  if (cam.x(-740) > W + 40 || cam.x(-580) < -40 || cam.y(100) > H + 40) return;
  LIG.forEach(([x, y], i) => {
    const ta = EV.aa[i], cl = Math.max(0, 1 - Math.abs(t - ta) / 0.22), w = Math.sin(t * 1.9 + i) * 0.5;
    protein(cam, [[x, y + 9 + w, 12, 8], [x - 8.5 + 2.2 * cl, y - 1, 6, 6.5], [x + 8.5 - 2.2 * cl, y - 1, 6, 6.5]], R_MUR(), {});
  });
}
function drawMraY(cam, t) {
  const x = ST.mraY; if (cam.x(x + 30) < -20 || cam.x(x - 30) > W + 20) return;
  protein(cam, [[x - 5, 0, 13, 27], [x + 5, 19, 9, 8], [x - 11, -23, 8, 6]], R_SLATE(), { wob: 0.4 });
}
function drawMurG(cam, t) {
  const x = ST.murG; if (cam.x(x + 40) < -20 || cam.x(x - 20) > W + 20) return;
  const cl = smooth(seg(t, EV.udpglc - 0.1, EV.udpglc + 0.1)) * (1 - smooth(seg(t, EV.udp, EV.udp + 0.3)));
  protein(cam, [[x + 17, 49, 15, 11], [x + 6, 33 + cl, 9, 7], [x + 28 - 2 * cl, 40, 7, 6]], R_SLATE(), {});
}
function murJTilt(t) { return 0.2 * (1 - 2 * smooth(seg(t, EV.flip - 0.25, EV.flip + 0.15))); }   // + inward-open, - outward-open
function drawMurJ(cam, t) {
  const x = ST.murJ; if (cam.x(x + 30) < -20 || cam.x(x - 30) > W + 20) return;
  const a = murJTilt(t);
  ellipse(cam.x(x), cam.y(0), 8 * cam.z, 25 * cam.z, P.MB0);                 // the central cavity
  protein(cam, [[x - 9.5, 0, 9, 27, a]], R_SLATE(), { wob: 0.3 });
  protein(cam, [[x + 9.5, 0, 9, 27, -a]], R_SLATE(), { wob: 0.3 });
}
function drawPhosphatase(cam, t) {
  const x = ST.phos; if (cam.x(x + 20) < -20 || cam.x(x - 20) > W + 20) return;
  const k = Math.max(0, 1 - Math.abs(t - EV.dephos) / 0.25);
  protein(cam, [[x, 0, 8, 26], [x - 1, -27 - k, 6.5, 5]], R_SLATE(), { wob: 0.3 });
}
function drawGT(cam, t) {
  const x = ST.gt; if (cam.x(x + 30) < -20 || cam.x(x - 30) > W + 20) return;
  const cl = smooth(seg(t, EV.gtBind - 0.1, EV.gtBind + 0.15)) * (1 - smooth(seg(t, EV.release, EV.release + 0.3))) + Math.max(0, 1 - Math.abs(t - EV.newUnit) / 0.3);
  protein(cam, [[x, -51, 15, 13], [x + 10 - 1.5 * cl, -37 + cl, 8, 7], [x - 2, -12, 4.5, 20]], R_SLATE(), {});
}
// ---------------------------------------------------------------- the lipid carrier (undecaprenyl phosphate): an olive chain in the membrane core
function drawCarrierChain(cam, C) {
  const Q = [C[0] - 3, C[1] * 0.3], T = [C[0] - 42, C[1] * 0.1];
  let prev = C;
  for (let i = 1; i <= 11; i++) {
    const u = i / 11, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    let p = [a * C[0] + b * Q[0] + c * T[0], a * C[1] + b * Q[1] + c * T[1]];
    p = [p[0], p[1] + (i % 2 ? 0.9 : -0.9)];
    bondAt(cam, prev, p, P.LP2, 0.6); prev = p;
    beadAt(cam, p[0], p[1], R_LP(), { s: 0.66 });
  }
}
// ---------------------------------------------------------------- the free precursor (S11) and its pieces
function drawPrecursorFree(cam, t) {
  const M = walk(PRE_PATH, t), pose = { M, th: 0 }, n = preBeads(t);
  const P2 = hp(pose, HL.P2), P1 = hp(pose, HL.P1), RB = hp(pose, HL.RIB), UR = hp(pose, HL.URA);
  bondAt(cam, UR, RB, P.NU1, 0.5); bondAt(cam, RB, P1, P.NU1, 0.5); bondAt(cam, P1, P2, P.PH0, 0.5); bondAt(cam, P2, M, P.PH0, 0.5);
  let prev = [M[0], M[1] + MOL.sug * 0.9];
  for (let k = 0; k < n; k++) { const b = hp(pose, stemL(k)); bondAt(cam, prev, b, P.PE1, 0.6); prev = b; }
  ringAt(cam, UR[0], UR[1], 2.7, 6, Math.PI / 6, R_NU()); ringAt(cam, RB[0], RB[1], 2.5, 5, -Math.PI / 2, R_NU());
  phosAt(cam, P1); phosAt(cam, P2);
  hexAt(cam, M[0], M[1], 'M');
  for (let k = 0; k < n; k++) { const b = hp(pose, stemL(k)); beadAt(cam, b[0], b[1], k >= 3 ? DALA() : AA()); }
  // the next residue flies in from the cytoplasm to the ligase's pocket (the dipeptide D-Ala-D-Ala last)
  for (let i = 0; i < 4; i++) {
    const ta = EV.aa[i]; if (t < ta - 0.32 || t >= ta) continue;
    const f = smooth(seg(t, ta - 0.32, ta)), side = i % 2 ? 1 : -1, tipM = [LIG[i][0], LIG[i][1] - (6.5 + 5.2 * i)];
    const dst = hp({ M: tipM, th: 0 }, stemL(i)), src = [LIG[i][0] + 22 * side, LIG[i][1] + 26];
    const p = lerp2(src, dst, f);
    beadAt(cam, p[0], p[1], i === 3 ? DALA() : AA());
    if (i === 3) { const q = [p[0] + 0.8, p[1] + 5.2]; bondAt(cam, p, q, P.PE1, 0.6); beadAt(cam, q[0], q[1], DALA()); }
  }
  for (let i = 0; i < 4; i++) { const b = hp(pose, stemL(i)); sparkle(cam, b[0] + 1.5, b[1], t, EV.aa[i], P.G8); }
}
// UMP (uracil, ribose, phosphate) drifting away after the transfer
function drawUMP(cam, t) {
  if (t < EV.transfer || t > EV.transfer + 3) return;
  const pose0 = { M: [XS.mraY, 37.5], th: 0 }, d = driftFrom([0, 0], EV.ump - 0.1, t, [9, 7], 21);
  const P1 = add2(hp(pose0, HL.P1), d), RB = add2(hp(pose0, HL.RIB), d), UR = add2(hp(pose0, HL.URA), d);
  bondAt(cam, UR, RB, P.NU1, 0.5); bondAt(cam, RB, P1, P.NU1, 0.5);
  ringAt(cam, UR[0], UR[1], 2.7, 6, Math.PI / 6 + d[0] * 0.02, R_NU()); ringAt(cam, RB[0], RB[1], 2.5, 5, -Math.PI / 2, R_NU()); phosAt(cam, P1);
}
// UDP-GlcNAc arriving at MurG, its GlcNAc moving onto the head, then UDP leaving
function udpGlcPos(t) {
  const dock = [[ST.murG + 12, 44], [ST.murG + 17, 47.5], [ST.murG + 21.5, 50], [ST.murG + 26.5, 51], [ST.murG + 32, 50]];   // G, Pa, Pb, ribose, uracil
  const inK = smooth(seg(t, PT.udpIn, EV.udpglc)), off = [(1 - inK) * 34, (1 - inK) * 30];
  let o = dock.map(p => add2(p, off));
  if (t >= EV.udp) { const d = driftFrom([0, 0], EV.udp, t, [10, 8], 33); o = o.map((p, i) => i === 0 ? p : add2(p, d)); }
  return o;
}
function drawUDPGlc(cam, t) {
  if (t < PT.udpIn || t > EV.udp + 3) return;
  const [G, Pa, Pb, RB, UR] = udpGlcPos(t), gOn = t < EV.sugar - 0.15;
  bondAt(cam, UR, RB, P.NU1, 0.5); bondAt(cam, RB, Pb, P.NU1, 0.5); bondAt(cam, Pb, Pa, P.PH0, 0.5);
  if (gOn) bondAt(cam, Pa, G, P.PH0, 0.5);
  ringAt(cam, UR[0], UR[1], 2.7, 6, Math.PI / 6, R_NU()); ringAt(cam, RB[0], RB[1], 2.5, 5, -Math.PI / 2, R_NU());
  phosAt(cam, Pb); phosAt(cam, Pa);
  if (gOn) hexAt(cam, G[0], G[1], 'G');
}
// ---------------------------------------------------------------- the carrier with its head group at time t (22.4-32 s)
function drawCarrier(cam, t, part) {
  const { pose, C } = carrierPose(t);
  if (part === 'chain') { drawCarrierChain(cam, C); return; }
  const hasPP = t >= EV.transfer && t < EV.dephos, hasUnit = t >= EV.transfer && t < PT.fly0, hasG = t >= EV.sugar && t < PT.fly0;
  // before the transfer the precursor is docked at MraY (with its UDP part), the carrier holds one phosphate
  if (t >= EV.dock && t < EV.transfer) {
    const dp = { M: [XS.mraY, 37.5], th: 0 }, P2 = hp(dp, HL.P2), P1 = hp(dp, HL.P1), RB = hp(dp, HL.RIB), UR = hp(dp, HL.URA), M = dp.M;
    bondAt(cam, UR, RB, P.NU1, 0.5); bondAt(cam, RB, P1, P.NU1, 0.5); bondAt(cam, P1, P2, P.PH0, 0.5); bondAt(cam, P2, M, P.PH0, 0.5);
    let prev = [M[0], M[1] + MOL.sug * 0.9]; for (let k = 0; k < 5; k++) { const b = hp(dp, stemL(k)); bondAt(cam, prev, b, P.PE1, 0.6); prev = b; }
    ringAt(cam, UR[0], UR[1], 2.7, 6, Math.PI / 6, R_NU()); ringAt(cam, RB[0], RB[1], 2.5, 5, -Math.PI / 2, R_NU());
    phosAt(cam, P1); phosAt(cam, P2); hexAt(cam, M[0], M[1], 'M');
    for (let k = 0; k < 5; k++) { const b = hp(dp, stemL(k)); beadAt(cam, b[0], b[1], k >= 3 ? DALA() : AA()); }
  }
  const P2 = hp(pose, HL.P2), M = hp(pose, HL.M), G = hp(pose, HL.G);
  if (hasPP) bondAt(cam, C, P2, P.PH0, 0.5);
  if (hasUnit) {
    bondAt(cam, P2, M, P.PH0, 0.5);
    let prev = hp(pose, [0, HL.M[1] + MOL.sug * 0.9]); for (let k = 0; k < 5; k++) { const b = hp(pose, stemL(k)); bondAt(cam, prev, b, P.PE1, 0.6); prev = b; }
    if (hasG) bondAt(cam, M, G, P.GT0, 0.7);
  }
  phosAt(cam, C);
  if (hasPP) phosAt(cam, P2);
  if (hasUnit) {
    hexAt(cam, M[0], M[1], 'M', { rot: pose.th });
    if (hasG) hexAt(cam, G[0], G[1], 'G', { rot: pose.th });
    for (let k = 0; k < 5; k++) { const b = hp(pose, stemL(k)); beadAt(cam, b[0], b[1], k >= 3 ? DALA() : AA()); }
  }
  // GlcNAc moving from UDP-GlcNAc onto the MurNAc (MurG)
  if (t >= EV.sugar - 0.15 && t < EV.sugar) { const src = udpGlcPos(t)[0], p = lerp2(src, G, smooth(seg(t, EV.sugar - 0.15, EV.sugar))); hexAt(cam, p[0], p[1], 'G'); }
  // the disaccharide-pentapeptide moving from the carrier onto the end of the growing strand (GT)
  if (t >= PT.fly0 && t < EV.polymer) {
    const f = smooth(seg(t, PT.fly0, EV.polymer)), m2 = [-85, MOL.newY], g2 = [-90, MOL.newY];
    const mm = lerp2(M, m2, f), gg = lerp2(G, g2, f);
    bondAt(cam, gg, mm, P.GT0, 0.7);
    let prev = [mm[0], mm[1] - MOL.sug * 0.9];
    for (let k = 0; k < 5; k++) { const b = lerp2(hp(pose, stemL(k)), stemBead(-85, MOL.newY, true, k), f); bondAt(cam, prev, b, P.PE1, 0.6); prev = b; }
    hexAt(cam, gg[0], gg[1], 'G'); hexAt(cam, mm[0], mm[1], 'M');
    for (let k = 0; k < 5; k++) { const b = lerp2(hp(pose, stemL(k)), stemBead(-85, MOL.newY, true, k), f); beadAt(cam, b[0], b[1], k >= 3 ? DALA() : AA()); }
  }
  // the phosphate the phosphatase removes, drifting off
  if (t >= EV.dephos && t < EV.dephos + 3) { const p = driftFrom(hp(carrierPose(EV.dephos).pose, HL.P2), EV.dephos, t, [5, -6], 41); phosAt(cam, p); }
  // crisp marks on each step
  sparkle(cam, C[0] + 2, C[1] + 2, t, EV.transfer, P.G8);
  sparkle(cam, M[0] + 3, M[1], t, EV.sugar, P.G8);
  sparkle(cam, -87, MOL.newY - 3, t, EV.polymer, P.G8);
  pulseRing(cam, -87, MOL.newY, t, EV.polymer, P.GC3, 4);
  sparkle(cam, C[0], C[1], t, EV.release, P.LP3);
  sparkle(cam, C[0] + 1, C[1] - 4, t, EV.dephos, P.PH2);
  sparkle(cam, -97, MOL.newY - 2, t, EV.newUnit, P.G8);
  pulseRing(cam, -97, MOL.newY, t, EV.newUnit, P.GC3, 4);
}
// the cytoplasmic part of the pathway (ligases, the free precursor, released nucleotides)
function drawPathway(cam, t) {
  drawMurLigases(cam, t);
  if (t < EV.dock) drawPrecursorFree(cam, t);
  drawUMP(cam, t); drawUDPGlc(cam, t);
}
