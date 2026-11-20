// NUC — the source and its physics. The sealed source capsule (S13, S16): a stainless-steel capsule, welded shut, with
// the cobalt-60 pellets inside; beta electrons stop in the capsule wall, gamma photons leave it. The nucleus (S14, S15):
// 60 nucleons (Co-60: 27 protons, 33 neutrons); beta-minus decay turns one neutron into a proton and emits an electron
// and an antineutrino, leaving Ni-60 in an excited state (no fission, no chain reaction); Ni-60* then drops to its
// ground state in two steps, emitting gamma photons of 1.17 and 1.33 MeV. The shielding (S17): rays go every way,
// the heavy shielding stops most of them, a few directions lead into the collimators.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const NUC = window.NUC = { NAME: 'NUC' };
// ---------- the capsule ----------
NUC.capsule = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).nuc = cam;
  const L = 130, R = 46, cut = o.cut ?? 1;
  PIX.rect(c, 0, 0, W, H, 'n0');
  // outer shell, end caps, weld seams
  D.tube(c, cam, [[-L, 0], [L, 0]], R * 2, ['g3', 'g4', 'g5', 'g6', 'g7', 'g8'], { bias: 0.04 });
  for (const s of [-1, 1]) { D.ell(c, cam, s * (L + 6), 0, 14, R, 0, ['g4', 'g5', 'g6', 'g7', 'g8'], { bias: 0.1 }); LIT.line(c, cam, [[s * (L - 14), -R + 4], [s * (L - 14), R - 4]], 'g2', {}); }
  if (cut > 0) {
    // the window: the upper half of the shell cut away, showing the inner capsule and the cobalt pellets
    const wx = (L - 26) * cut;
    D.rr(c, cam, -wx, -R + 6, wx, 4, 6, ['g1', 'g2', 'g3', 'g4'], { edge: false });
    D.rr(c, cam, -wx + 4, -R + 12, wx - 4, 4, 5, ['g4', 'g5', 'g6', 'g7'], { bias: -0.05 });
    const n = 6; for (let k = 0; k < n; k++) { const x0 = lerp(-wx + 12, wx - 12, k / n), x1 = lerp(-wx + 12, wx - 12, (k + 1) / n) - 3; if (x1 - x0 < 2) continue; D.rr(c, cam, x0, -R + 18, x1, 26, 4, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.06 }); }
    LIT.line(c, cam, [[-wx, -R + 6], [wx, -R + 6]], 'g8', {});
  }
  // beta electrons: short tracks inside, each ending in the wall (absorbed)
  if ((o.beta ?? 0) > 0) for (let k = 0; k < 6; k++) {
    const ph = ((T * 0.9 + hh(k, 2)) % 1), x0 = -80 + 160 * hh(k, 3), y0 = -14 + 20 * hh(k, 4), a = -0.6 + 1.2 * hh(k, 5) + (k % 2 ? Math.PI : 0), d = 24 * MO.cubicOut(clamp(ph * 1.4));
    const [sx, sy] = K.S(cam, x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 0.5), fade = ph < 0.75 ? 1 : 1 - (ph - 0.75) / 0.25;
    if (fade > 0.05) { MICRO.electron(c, sx, sy, Math.max(3, 4.5 * cam.z * 0.6), { a: fade }); if (ph > 0.6) D.flash(c, sx, sy, 4, (1 - ph) * 2); }
  }
  // gamma photons leave the capsule through its wall (to the right)
  if ((o.gamma ?? 0) > 0) for (let k = 0; k < 2; k++) { const y = k ? 18 : -18, ph = ((T * 0.7 + k * 0.5) % 1); D.photon(c, cam, [L - 40 + ph * 30, y], [L + 140 + ph * 30, y], { ph: T * 3 + k, a: o.gamma, lam: 14, amp: 4 }); }
};
// ---------- the nucleus ----------
// nucleon positions in a ball (deterministic), and which of them are protons (27 for Co-60; one neutron, `flip`, becomes
// a proton in the decay → 28 for Ni-60)
const NN = 60, PTS = [];
for (let i = 0; i < NN; i++) { const y = 1 - 2 * (i + 0.5) / NN, rr = Math.sqrt(1 - y * y), th = i * 2.39996, sh = Math.cbrt((i + 0.5) / NN) * 0.35 + 0.65; PTS.push([Math.cos(th) * rr * sh, y * sh, Math.sin(th) * rr * sh]); }
const ISP = PTS.map((_, i) => hh(i, 77) < 27 / 60); let np = ISP.filter(Boolean).length;
for (let i = 0; np !== 27 && i < NN; i++) { if (np > 27 && ISP[i]) { ISP[i] = false; np--; } else if (np < 27 && !ISP[i]) { ISP[i] = true; np++; } }
const FLIP = PTS.reduce((best, p, i) => !ISP[i] && p[2] > (best < 0 ? -9 : PTS[best][2]) ? i : best, -1);   // the front-most neutron
NUC.FLIP = FLIP;
// o: { flip (0..1: the neutron → proton change), excited (0..1 glow), rot }
NUC.nucleus = (c, sx, sy, r, o = {}) => {
  const rot = o.rot ?? 0, ca = Math.cos(rot), sa = Math.sin(rot), list = PTS.map((p, i) => { const x = p[0] * ca + p[2] * sa, zz = -p[0] * sa + p[2] * ca; return [x, p[1], zz, i]; }).sort((a, b) => a[2] - b[2]);
  if ((o.excited ?? 0) > 0) FX.glowL(c, sx, sy, r * 1.5, ['ga1', 'ga2', 'ga3', 'ga4'], 0.4 * o.excited, 1.5);
  for (const [x, y, zz, i] of list) {
    const isP = ISP[i] || (i === FLIP && (o.flip ?? 0) > 0.5), ramp = isP ? ['pr1', 'pr2', 'pr3', 'pr4', 'pr5'] : ['ne1', 'ne2', 'ne3', 'ne4', 'ne5'];
    LIT.sphere(c, sx + x * r, sy + y * r, r * 0.2 * (1 + 0.12 * zz), ramp, { amb: 0.3 + 0.1 * zz });
    if (i === FLIP && (o.flip ?? 0) > 0 && (o.flip ?? 0) < 1) D.flash(c, sx + x * r, sy + y * r, r * 0.3, Math.sin(Math.PI * o.flip));
  }
};
// ---------- the shielding (S17): the source at the centre-left, rays all round; most stop in the shielding ----------
NUC.shield = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).nuc = cam;
  PIX.rect(c, 0, 0, W, H, 'n0');
  const S = [-40, 0], R1 = 120;
  D.rr(c, cam, -200, -170, 170, 170, 20, ['sh1', 'sh2', 'sh3', 'sh4', 'sh5'], { bias: 0, tone: (x, y) => ((x * 3 + y * 5) % 11 === 0 ? 0.2 : 0) });
  D.circ(c, cam, S[0], S[1], 64, ['n0', 'n1', 'n2', 'n2'], { edge: false });
  D.rr(c, cam, 20, -26, 190, 26, 2, ['n0', 'n1', 'n1', 'n2'], { edge: false });                      // the opening toward the collimators
  D.rr(c, cam, 150, -40, 210, 40, 4, ['g4', 'g5', 'g6', 'g7'], { bias: 0.08 });                     // the collimator entrance
  for (let j = -1; j <= 1; j++) D.rr(c, cam, 150, j * 22 - 4, 210, j * 22 + 4, 1, ['k', 'n0', 'g1'], { edge: false });
  // the source
  D.circ(c, cam, S[0], S[1], 10, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.1 });
  const [sx, sy] = K.S(cam, S[0], S[1]); FX.glowL(c, sx, sy, 16 * cam.z, ['ga1', 'ga2', 'ga3', 'ga4'], 0.4, 1.6);
  // rays: 16 directions; those into the shielding stop at its wall (with a small absorption flash); the ones along the
  // opening carry on into the collimators
  const q = o.q ?? 1;
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU + 0.1, toCol = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.12, ca = Math.cos(a), sa = Math.sin(a);
    const end = toCol ? 260 : 64, d = Math.min(end, 14 + (end - 14) * clamp(q * 1.6 - (toCol ? 0.3 : 0))), ph = (T * 1.2 + hh(k, 3)) % 1;
    const [x0, y0] = K.S(cam, S[0] + ca * 14, S[1] + sa * 14), [x1, y1] = K.S(cam, S[0] + ca * d, S[1] + sa * d);
    D.arrow(c, x0, y0, x1, y1, toCol ? 'ga5' : 'ga3', toCol ? 2 : 1, 4);
    if (!toCol && d >= end - 1) D.flash(c, x1, y1, 4, 0.5 + 0.5 * Math.sin(ph * TAU));
  }
  for (const dy of [-18, 18]) { const [x0, y0] = K.S(cam, 30, dy * 0.4), [x1, y1] = K.S(cam, 40 + 220 * clamp(q * 1.6 - 0.3), dy); D.arrow(c, x0, y0, x1, y1, 'ga5', 2, 4); }
};
NUC.init = () => {};
})();
