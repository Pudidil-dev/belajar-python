'use strict';
// ============================================================================
// PARTICLE VISUALIZATIONS (educational - not what the eye would see)
// Positron / electron = fuzzy probability clouds (never hard little balls),
// gamma photon = gold wave packet, optical scintillation photon = tiny
// blue-white spark, neutrino = faint grey dashed streak, nuclei = shaded
// nucleon clusters (protons red, neutrons orange).
// ============================================================================
function cloud(x, y, r, c0, c1, c2, c3, ph, lv) {
  lv = lv === undefined ? 1 : lv; ph = ph || 0;
  disc(x, y, r * 1.6, c0, 0.22 * lv);
  disc(x, y, r * 1.1, c1, 0.42 * lv);
  disc(x, y, r * 0.7 * (1 + 0.08 * Math.sin(ph * 7)), c2, 0.75 * lv);
  disc(x, y, Math.max(0.8, r * 0.32), c3, lv);
}
// charge marks on close-ups: + for the positron (antimatter), - for the electron
function chargeMark(x, y, r, plus, c) { const a = Math.max(1, Math.round(r * 0.26)); x = Math.round(x); y = Math.round(y); rect(x - a, y, x + a + 1, y + 1, c); if (plus) rect(x, y - a, x + 1, y + a + 1, c); }
const positronAt = (x, y, r, ph, lv) => { cloud(x, y, r, P.PO0, P.PO1, P.PO2, P.PO3, ph, lv); if (r >= 5 && (lv === undefined || lv > 0.6)) chargeMark(x, y, r, true, P.PO0); };
const electronAt = (x, y, r, ph, lv) => { cloud(x, y, r, P.EL0, P.EL1, P.EL2, P.EL3, ph, lv); if (r >= 5 && (lv === undefined || lv > 0.6)) chargeMark(x, y, r, false, P.EL0); };
// trail behind a moving particle along recent path points [[x,y],...] (newest last)
function trail(pts, c, cDim) {
  for (let i = 1; i < pts.length; i++) line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i > pts.length * 0.5 ? c : cDim, i > pts.length * 0.5 ? 1 : 0.55);
}
// gamma photon: gold wave packet travelling along (dx, dy); len/amp/wl in px
function gamma(x, y, dx, dy, opt) {
  opt = opt || {};
  const len = opt.len || 16, amp = opt.amp === undefined ? 2.2 : opt.amp, wl = opt.wl || 5, ph = opt.ph || 0;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const nx = -dy, ny = dx;
  const c = opt.c || P.GA2, ch = opt.ch || P.GA3, lv = opt.lv === undefined ? 1 : opt.lv;
  if (opt.glow !== false) disc(x - dx * len * 0.3, y - dy * len * 0.3, len * 0.38, P.GA1, 0.16 * lv);
  let px = null, py = null;
  for (let s = 0; s <= len; s += 1) {
    const env = Math.sin(Math.PI * s / len), w = amp * env * Math.sin((s / wl) * TAU - ph);
    const qx = x - dx * s + nx * w, qy = y - dy * s + ny * w;
    if (px !== null) line(px, py, qx, qy, s < len * 0.35 ? ch : c, lv);
    px = qx; py = qy;
  }
  pset(x, y, ch);
}
// scattered / absorbed gamma drawn dimmer and dashed so it never reads like the main pair
function gammaDim(x0, y0, x1, y1, ph) { dashLine(x0, y0, x1, y1, P.GA1, 3, 3, ph || 0); }
function optPhoton(x, y, dx, dy, lv) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  line(x - dx * 7, y - dy * 7, x - dx * 3, y - dy * 3, P.SL0, lv === undefined ? 0.8 : lv); line(x - dx * 3, y - dy * 3, x, y, P.SL1);
  rect(x - 1, y - 1, x + 1, y + 1, P.SL2);
}
function neutrino(x, y, dx, dy) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  for (let s = 0; s < 18; s += 4) line(x - dx * s, y - dy * s, x - dx * (s + 2), y - dy * (s + 2), P.NT, 0.7);
  pset(x, y, P.SC3);
}
// controlled annihilation flash: small white core, gold ring, short rays - no blast wave
function annihilationFlash(x, y, k, s) {
  s = s || 1; if (k <= 0 || k >= 1) return;
  const a = 1 - k;
  disc(x, y, (3 + 8 * eout(k)) * s, P.GA1, 0.22 * a);
  ring(x, y, (4 + 22 * eout(k)) * s, 1, P.GA3, a);
  if (k < 0.45) { disc(x, y, (5 * (1 - k / 0.45) + 1) * s, P.SC3); disc(x, y, 2 * s, P.C6); }
  for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + 0.3, r0 = (5 + 14 * k) * s, r1 = r0 + 5 * a * s; line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, P.GA3, a); }
}
// ---------------------------------------------------------------- nuclei
// F-18: 9 protons + 9 neutrons; after beta-plus decay O-18: 8 protons + 10 neutrons.
const NUC = [];
(function nucInit() {
  // 18 nucleon centres in a compact cluster (2 shells), unit radius
  const pts = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; pts.push([Math.cos(a) * 0.42, (i % 2 ? 0.25 : -0.25), Math.sin(a) * 0.42]); }
  pts.push([0, 0, 0]);
  for (let i = 0; i < 12; i++) { const y = 1 - (i + 0.5) / 12 * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; pts.push([Math.cos(a) * r * 0.86, y * 0.86, Math.sin(a) * r * 0.86]); }
  const isP = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0];       // 9 protons
  pts.forEach((p, i) => NUC.push({ x: p[0], y: p[1], z: p[2], p: isP[i] }));
})();
const DECAY_IDX = 12;          // the proton (on the front shell) that becomes a neutron
// draw a nucleus; R = cluster radius (px); rot = slow rotation; conv = 0..1 proton->neutron of DECAY_IDX
function drawNucleus(cx, cy, R, rot, conv, glowK) {
  const c = Math.cos(rot), s = Math.sin(rot), list = [];
  for (let i = 0; i < NUC.length; i++) { const n = NUC[i]; const x = n.x * c + n.z * s, z = -n.x * s + n.z * c; list.push([x, n.y, z, i]); }
  list.sort((a, b) => a[2] - b[2]);
  if (glowK > 0) glow(cx, cy, R * 2.2, P.PR0, P.NE1, glowK * 0.6);
  const rn = R * 0.36;
  for (const [x, y, z, i] of list) {
    const px = cx + x * R, py = cy + y * R, r = rn * (0.86 + 0.14 * (z + 1) / 2);
    let prot = NUC[i].p;
    if (i === DECAY_IDX && conv > 0.5) prot = 0;
    const m = maskDisc(px, py, r);
    if (prot) shade(m, P.PR2, P.PR3, P.PR1, P.PR0); else shade(m, P.NE2, P.NE3, P.NE1, P.NE0);
    if (i === DECAY_IDX && conv > 0 && conv < 1) { const k = Math.sin(conv * Math.PI); ring(px, py, r + 2 + 4 * k, 1, P.C6, k); }
  }
}
function nucleonScreen(cx, cy, R, rot, i) { const n = NUC[i], c = Math.cos(rot), s = Math.sin(rot); return [cx + (n.x * c + n.z * s) * R, cy + n.y * R]; }
