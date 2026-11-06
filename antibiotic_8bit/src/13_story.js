'use strict';
// ============================================================================
// THE MOLECULAR STORY (part 1): the growth zone just outside the membrane.
// A new glycan strand (built by the glycosyltransferase) runs at y = MOL.newY;
// its stems that point up (toward the mature wall) are possible DONORS. The
// innermost mature strand (y = MOL.oldY) carries ACCEPTOR stems pointing down.
// Four PBPs sit between them; the hero PBP makes one normal cross-link and is
// later inhibited by one amoxicillin molecule. World units: 0.1 nm, y down.
// ============================================================================
const ST = { mur: -660, mraY: -470, murG: -350, murJ: -235, phos: -160, gt: -104, pbps: [-50, 30, 150, 230] };
const PBP_HERO = 1;
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
function walk(keys, t) { // smooth walk through [t, x, y] keys
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = smooth(seg(t, a[0], b[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } }
  const z = keys[keys.length - 1]; return [z[1], z[2]];
}
// ---------------------------------------------------------------- crisp effect marks (solid colours, no transparency)
// an expanding thin ring that thins out (0.4 s) — a reaction step
function pulseRing(cam, x, y, t, t0, col, r0) {
  const k = (t - t0) / 0.4; if (k < 0 || k >= 1) return;
  const r = ((r0 || 2.5) + 6 * eout(k)) * cam.z, w = Math.max(1, cam.z * 0.7 * (1 - k));
  ring(cam.x(x), cam.y(y), r, w, col);
}
// a four-point sparkle (0.22 s) — a bond forms or breaks
function sparkle(cam, x, y, t, t0, col) {
  const k = (t - t0) / 0.22; if (k < 0 || k >= 1) return;
  const sx = cam.x(x), sy = cam.y(y), L = (1.5 + 3.5 * eout(k)) * Math.max(1, cam.z * 0.8), g = L * 0.35;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) line(sx + dx * g, sy + dy * g, sx + dx * L, sy + dy * L, col);
  if (k < 0.5) disc(sx, sy, Math.max(1, cam.z * 0.6), col);
}
// a free small molecule drifting away from p0 after t0 (diffusion: steady drift plus a gentle wander)
function driftFrom(p0, t0, t, v, seed) {
  const d = Math.max(0, t - t0), e = Math.min(1, d * 2);
  return [p0[0] + v[0] * d + 2.2 * (vnoise(d * 1.3, seed) - 0.5) * e, p0[1] + v[1] * d + 2.2 * (vnoise(d * 1.3, seed + 7) - 0.5) * e];
}
// ---------------------------------------------------------------- the new strand (built by the GT, cross-linked by the PBPs)
// its stems turn by a quarter turn per MurNAc by absolute position: up (a possible donor) at x = 35 + 40 n
const newX0 = t => t < EV.polymer ? -80 : t < EV.newUnit ? -90 : -100;
const newQ4 = x => (((Math.round((x - 35) / 10)) % 4) + 4) % 4;
const NEW_X1 = 460;
// donor stems linked by the PBPs: [donor x, time the link forms]
const LINKS = [[35, EV.xlink], [-45, EV.xlinks[0]], [155, EV.xlinks[1]], [235, EV.xlinks[2]]];
const linkTime = x => { for (const [lx, lt] of LINKS) if (Math.abs(lx - x) < 1) return lt; return Infinity; };
// each donor's acceptor: the MurNAc of the innermost mature strand nearest to (donor x - 12), beside the donor
const ACC = LINKS.map(([lx]) => {
  let best = lx - 8, bd = Infinity;
  for (const s of MWALL.strands) if (s.li === 0) for (const q of s.stems) { const d = Math.abs(q.x - (lx - 12)); if (d < bd) { bd = d; best = q.x; } }
  return best;
});
const nearAcceptor = x => LINKS.some(([lx]) => x > lx - 26 && x < lx + 14);   // other inner stems around a link site are left out (a clear picture)
// each acceptor bends into the cleft (its m-DAP amine reaches the enzyme-held D-Ala4) just before its link forms
const accBend = (i, t) => { const lt = LINKS[i][1]; return smooth(seg(t, lt - 0.5, lt - 0.05)) * (i === 0 ? 1 : 0.8); };
const ACC_DX = [0, 3, 7.5, 5.5], ACC_DY = [0, 0.5, 1.5, 0.5];
function acceptorBead(i, k, t) { const b = accBend(i, t), p = stemBead(ACC[i], MOL.oldY, false, k); p[0] += b * ACC_DX[k]; p[1] += b * ACC_DY[k] + wallSag(ACC[i], MOL.oldY, t); return p; }
function acceptorAmine(i, t) { const b = accBend(i, t), d = acceptorBead(i, 2, t); return [d[0] + 3.4 - 1.2 * b, d[1] + 0.6 + 1.0 * b]; }
// ---------------------------------------------------------------- the PBPs: position (domain centre x) and state
const PBP_LT = [EV.xlinks[0], EV.xlink, EV.xlinks[1], EV.xlinks[2]];
function pbpX(i, t) {
  if (i === PBP_HERO) {
    if (t < EV.pbpSlide) return 60;
    if (t < EV.pbpBind) return lerp(60, 30, smooth(seg(t, EV.pbpSlide, EV.pbpBind)));
    if (t < EV.pbpFree) return 30;
    if (t < 46.0) return lerp(30, 46, smooth(seg(t, EV.pbpFree, EV.pbpFree + 0.7)));
    return lerp(46, 64, smooth(seg(t, 46.0, 46.6)));   // the blocked enzyme drifts beside the next donor (x = 75)
  }
  // the others glide in to their donor just before their link and drift off after it
  const lt = PBP_LT[i];
  return ST.pbps[i] + 10 * (1 - smooth(seg(t, lt - 1.0, lt - 0.35))) + 8 * smooth(seg(t, lt + 0.4, lt + 1.0));
}
const pbpCleft = (i, t) => [pbpX(i, t) + 5, -95];
const INHIB_T = [46.2, EV.covalent, 47.0, 47.4];
const pbpInhibited = (i, t) => t >= INHIB_T[i];
function drawPBP(cam, i, t) {
  const x = pbpX(i, t), inh = pbpInhibited(i, t), w = Math.sin(t * 2.1 + i * 1.7) * 0.6;
  const ramp = R_PBP(); if (inh) { ramp[2] = P.AM3; ramp[4] = P.AM4; }   // inhibited: purple with a restrained orange light rim
  const close = i === PBP_HERO ? smooth(seg(t, EV.dock2, EV.fit)) : inh ? 1 : 0;
  protein(cam, [[x + w, -86, 26, 18], [x - 20, -74, 13, 11], [x - 1, -40, 5.5, 22], [x - 1, -4, 5, 26], [x + 22 - 3 * close, -100 + 2 * close, 7, 6]], ramp, {});
  // the catalytic cleft: a recess on the domain's upper face (solid tones)
  const [cx, cy] = pbpCleft(i, t);
  ellipse(cam.x(cx), cam.y(cy), 8.5 * cam.z, 5.2 * cam.z, P.PB1);
  ellipse(cam.x(cx), cam.y(cy + 0.9), 7 * cam.z, 3.8 * cam.z, P.PB0);
}
// the active-site serine: C-beta on the cleft's right wall, O-gamma (the nucleophile, pale) at its tip
const serineRest = (i, t) => { const [cx, cy] = pbpCleft(i, t); return [cx + 5.5, cy + 1.6]; };
function drawSerine(cam, i, t, og) {
  const [cx, cy] = pbpCleft(i, t), cb = [cx + 8.5, cy + 3.4];
  bondAt(cam, cb, og, P.PB4, 0.55);
  beadAt(cam, cb[0], cb[1], [P.PB2, P.PB3, P.PB5, P.PB0], { s: 0.42 });
  beadAt(cam, og[0], og[1], [P.PB4, P.PB5, P.G8, P.PB1], { s: 0.4 });
}
// ---------------------------------------------------------------- donor stems
function donorBeads(x, o) {
  o = o || {};
  const b = []; for (let k = 0; k < 5; k++) b.push(stemBead(x, MOL.newY, true, k));
  if (o.bend) for (let k = 0; k < 5; k++) { const f = Math.pow(k / 4, 1.5); b[k] = [b[k][0] + o.bend[0] * f, b[k][1] + o.bend[1] * f]; }
  if (o.sway) for (const p of b) p[0] += o.sway * (p[1] - MOL.newY) / -26;
  return b;
}
function drawStemBeads(cam, beads, base) {
  let prev = base || [beads[0][0], MOL.newY - MOL.sug * 0.9];
  for (let k = 0; k < beads.length; k++) { bondAt(cam, prev, beads[k], P.PE1, 0.6); prev = beads[k]; }
  for (let k = 0; k < beads.length; k++) beadAt(cam, beads[k][0], beads[k][1], k >= 3 ? DALA() : AA());
}
// ---------------------------------------------------------------- the new strand with all its stems at time t
function drawNewStrand(cam, t) {
  const x0 = newX0(t), n = Math.round((NEW_X1 - x0) / 10);
  strandAt(cam, x0, MOL.newY, n);
  for (let k = 0; k < n; k++) {
    const xm = x0 + k * 10 + 5, q4 = newQ4(xm); if (cam.x(xm) < -40 || cam.x(xm) > W + 40) continue;
    if (q4 === 1) { beadAt(cam, xm, MOL.newY, AA(), { s: 0.7 }); continue; }
    if (q4 !== 0) continue;
    if (Math.abs(xm - 35) < 1 || Math.abs(xm - 75) < 1) continue;        // the hero's donors are drawn by the reactions
    const lt = linkTime(xm), dangle = t > EV.unlinked - 0.6 ? 1.6 : 0.5;
    if (t >= lt) {
      const ai = LINKS.findIndex(L => Math.abs(L[0] - xm) < 1), am = acceptorAmine(ai, t), b3 = stemBead(xm, MOL.newY, true, 3);
      drawStemBeads(cam, donorBeads(xm).slice(0, 4));
      bondAt(cam, b3, lerp2(b3, am, smooth(seg(t, lt, lt + 0.2))), P.PE3, 0.75);
    } else drawStemBeads(cam, donorBeads(xm, { sway: Math.sin(t * 1.7 + xm * 0.3) * dangle }));
    // the released terminal D-alanine of each link drifts away
    if (lt < Infinity && t >= lt - 0.15 && t < lt + 3) { const p = driftFrom(stemBead(xm, MOL.newY, true, 4), lt - 0.15, t, [6, -2.5], xm); beadAt(cam, p[0], p[1], DALA()); }
    if (lt < Infinity) { sparkle(cam, xm, -93, t, lt, P.G8); pulseRing(cam, xm - 3, -96, t, lt, P.PE4, 5); }
  }
}
// the acceptor stems of the innermost mature strand that face the donors (tetrapeptides; m-DAP3 carries a free amine)
function drawAcceptors(cam, t) {
  for (let i = 0; i < ACC.length; i++) {
    const ax = ACC[i]; if (cam.x(ax) < -40 || cam.x(ax) > W + 40) continue;
    let prev = [ax, MOL.oldY + MOL.sug * 0.9 + wallSag(ax, MOL.oldY, t)];
    for (let k = 0; k < 4; k++) { const p = acceptorBead(i, k, t); bondAt(cam, prev, p, P.PE1, 0.6); prev = p; }
    for (let k = 0; k < 4; k++) { const p = acceptorBead(i, k, t); beadAt(cam, p[0], p[1], k >= 3 ? DALA() : AA()); }
    if (cam.z > 2.2) { const d = acceptorBead(i, 2, t), am = acceptorAmine(i, t); bondAt(cam, d, am, P.PE2, 0.4); beadAt(cam, am[0], am[1], [P.PH0, P.PH1, P.PH2, P.NU0], { s: 0.32 }); }
  }
}
// ---------------------------------------------------------------- the hero reaction: transpeptidation (34-38 s)
function drawHeroReaction(cam, t) {
  const i = PBP_HERO, x = 35;
  // before the PBP binds, the donor sways a little; bound, it is held still in the cleft
  const beads = donorBeads(x, { sway: t < EV.pbpBind ? Math.sin(t * 1.9) * 1.2 * (1 - smooth(seg(t, EV.pbpBind - 0.5, EV.pbpBind))) : 0 });
  const b3 = beads[3], target = add2(b3, [2.4, 0.4]), linked = t >= EV.xlink;
  let og = serineRest(i, t);
  if (t >= EV.serAttack - 0.4 && t < EV.xlink) og = lerp2(og, target, smooth(seg(t, EV.serAttack - 0.4, EV.serAttack)));
  if (t >= EV.xlink && t < EV.xlink + 1.2) og = lerp2(target, serineRest(i, t), smooth(seg(t, EV.xlink, EV.pbpFree)));
  const dalaGone = t >= EV.dalaOut;
  drawStemBeads(cam, dalaGone ? beads.slice(0, 4) : beads);
  // the carbonyl oxygen of D-Ala4: the peptide bond the serine attacks
  if (cam.z > 2.5 && !linked) { const co = add2(b3, [1.8, 1.5]); bondAt(cam, b3, co, P.PE2, 0.35); beadAt(cam, co[0], co[1], [P.AM2, P.AM5, P.G8, P.PE1], { s: 0.3 }); }
  // the released terminal D-alanine drifts out of the cleft
  if (dalaGone && t < EV.dalaOut + 5) { const p = driftFrom(beads[4], EV.dalaOut, t, [6.5, -3.2], 3); beadAt(cam, p[0], p[1], DALA()); }
  if (t < 39.3) drawSerine(cam, i, t, og);
  // the acyl-enzyme (serine O bonded to D-Ala4), then the cross-link to the acceptor's m-DAP amine
  if (t >= EV.acyl - 0.2 && t < EV.xlink) bondAt(cam, og, b3, P.PB5, 0.55);
  if (linked) { const am = acceptorAmine(0, t); bondAt(cam, b3, lerp2(b3, am, smooth(seg(t, EV.xlink, EV.xlink + 0.25))), P.PE3, 0.8); }
  // crisp marks on each step
  pulseRing(cam, b3[0], b3[1], t, EV.serAttack, P.PB5);
  sparkle(cam, beads[4][0], beads[4][1], t, EV.dalaOut, P.G8);
  sparkle(cam, b3[0] + 1.5, b3[1] - 1, t, EV.xlink, P.G8);
  pulseRing(cam, b3[0] - 1.5, b3[1] - 4, t, EV.xlink, P.PE4, 3);
}
// the blocked attempt (46.5-48 s): the next donor (x = 75) leans toward the occupied cleft and cannot react
function drawBlockedDonor(cam, t) {
  const x = 75, k = t < EV.donorTry ? 0 : t < EV.blocked ? smooth(seg(t, EV.donorTry, EV.blocked)) : 1 - smooth(seg(t, EV.blocked + 0.15, EV.blocked + 0.9));
  const jolt = t > EV.blocked && t < EV.blocked + 0.25 ? Math.sin((t - EV.blocked) * 70) * 0.9 * (1 - (t - EV.blocked) / 0.25) : 0;
  const dangle = t > EV.unlinked - 0.6 ? Math.sin(t * 1.7 + 2) * 1.6 : 0;
  drawStemBeads(cam, donorBeads(x, { bend: [-4.5 * k + jolt, -1.2 * k], sway: dangle }));
  if (t >= EV.blocked && t < EV.blocked + 0.3) { const b = donorBeads(x, { bend: [-4.5, -1.2] })[4]; sparkle(cam, b[0] - 1, b[1] - 1, t, EV.blocked, P.AM4); }
}
