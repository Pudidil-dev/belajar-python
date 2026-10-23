// S07 SOME PHOTONS PASS THROUGH. OTHERS ARE ABSORBED OR SCATTERED. (39–49 s): the fan enters the patient's head, drawn
// as a cross-section at the scan level (scalp, skull, brain, ventricles). Photons are simulated through HEAD's real
// attenuation: each one either passes straight through to the detector (A), or meets an atom on the way — in bone more
// often by photoelectric absorption (B: swallowed whole by an inner-shell electron, which is ejected), in soft tissue
// mostly by Compton scattering (C: it gives part of its energy to an outer electron and leaves in a new direction, with
// less energy). The camera zooms into one event of each kind (atoms not to scale), then pulls back to all three fates.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const VP = 320;                                                  // visual photon speed (mm/s), slowed
const S0 = () => CT.src(0);
// ---------- the photon set: each one's fate from the real attenuation along its path ----------
let PHS = [];
const pathMu = (o, d, t0, t1, step = 1.0) => { const out = []; for (let t = t0; t < t1; t += step) out.push([t, CT.muAt(o[0] + d[0] * t, o[1] + d[1] * t)]); return out; };
function simulate() {
  const S = S0(), out = [];
  for (let k = 0; k < 280; k++) {
    const te = -0.4 + k * 0.036 + h(k, 9) * 0.02, g = (h(k, 1) * 2 - 1) * 0.25, d = CT.rayDir(0, g), u = h(k, 2);
    // walk the ray through the head: interaction where the accumulated attenuation reaches −ln(1 − u)
    const need = -Math.log(1 - u * 0.999), prof = pathMu(S, d, 330, 830, 1.0);
    let acc = 0, at = null, mu = 0;
    for (const [t, m] of prof) { acc += m / 10; if (acc >= need) { at = t; mu = m; break; } }
    const ph = { te, g, d, E: 45 + 60 * h(k, 3) };
    if (at == null) { ph.kind = 'A'; }
    else {
      const bone = mu > 0.32, photo = h(k, 4) < (bone ? 0.3 : 0.05);
      ph.at = at; ph.kind = photo ? 'B' : 'C';
      if (!photo) { const sg = h(k, 5) < 0.5 ? -1 : 1, th = sg * (0.5 + 2.2 * h(k, 6)); const c = Math.cos(th), s = Math.sin(th); ph.d2 = [d[0] * c - d[1] * s, d[0] * s + d[1] * c]; }
    }
    out.push(ph);
  }
  return out;
}
const photonAt = (ph, t) => {
  const age = t - ph.te; if (age < 0) return null;
  const S = S0(), r = 280 + age * VP;
  if (ph.kind === 'A' || r < ph.at) return { x: S[0] + ph.d[0] * r, y: S[1] + ph.d[1] * r, dir: ph.d, phase: 0 };
  const q = (r - ph.at) / VP, px = S[0] + ph.d[0] * ph.at, py = S[1] + ph.d[1] * ph.at;
  if (ph.kind === 'B') return { x: px, y: py, phase: 1, after: q };
  return { x: px + ph.d2[0] * (r - ph.at) * 0.9, y: py + ph.d2[1] * (r - ph.at) * 0.9, dir: ph.d2, phase: 2, after: q, px, py };
};
// featured events: a photoelectric absorption in the skull and a Compton scattering in the brain (same physics, chosen paths)
let FB = null, FC = null;
const findPoint = (g, pred) => { const S = S0(), d = CT.rayDir(0, g); for (let t = 330; t < 830; t += 0.5) { const x = S[0] + d[0] * t, y = S[1] + d[1] * t; if (pred(CT.muAt(x, y), t)) return { x, y, t, g, d }; } return null; };
// ---------- camera ----------
const C_END6 = { x: 0, y: 26, s: 0.25 }, C_HEAD = () => ({ x: CT.OX, y: CT.OY + 4, s: 1.05 });
const camAt = t => {
  const CH = C_HEAD();
  if (t < 1.2) { const q = MO.k75(clamp((t - 0.1) / 1.1)); return { x: lerp(C_END6.x, CH.x, q), y: lerp(C_END6.y, CH.y, q), s: K.zl(C_END6.s, CH.s, q) }; }
  const dive = (P0, t0, t1) => {                                      // log-zoom into P0, hold (diagram), back out
    const qi = MO.cubicIn(clamp((t - t0) / 0.6)), qo = MO.cubicOut(clamp((t - t1) / 0.6));
    if (t < t1) return { x: lerp(CH.x, P0.x, MO.sineInOut(qi)), y: lerp(CH.y, P0.y, MO.sineInOut(qi)), s: K.zl(CH.s, 70, qi) };
    return { x: lerp(P0.x, CH.x, MO.sineInOut(qo)), y: lerp(P0.y, CH.y, MO.sineInOut(qo)), s: K.zl(70, CH.s, qo) };
  };
  if (t < 5.75) return t < 2.45 ? CH : dive(FB, 2.45, 5.15);
  return t < 9.4 ? dive(FC, 5.75, 8.65) : CH;
};
// how much of the atom diagram replaces the zoomed tissue
const diagB = t => clamp((t - 2.95) / 0.18) * (1 - clamp((t - 5.15) / 0.18));
const diagC = t => clamp((t - 6.25) / 0.18) * (1 - clamp((t - 8.65) / 0.18));
// ---------- the tissue view ----------
function drawTissue(c, t, S) {
  const cam = camAt(t), cm = { ...cam, cx: 135, cy: 240 };
  PIX.rect(c, 0, 0, W, H, 'k');
  G2.ring(c, cm, clamp(1.6 - cam.s));
  G2.table(c, cm, 1);
  G2.head(c, cm, { alpha: MO.smooth(clamp((t - 0.05) / 0.5)) });
  if (cam.s < 0.8) G2.frame(c, cm, 0, { alpha: 1 });
  G2.fan(c, cm, 0, clamp(1.3 - cam.s * 0.6) * 0.7);
  c.setTransform(1, 0, 0, 1, 0, 0);
  // photons
  const big = cam.s > 0.7;
  for (const ph of PHS) {
    const st = photonAt(ph, t); if (!st) continue;
    const [sx, sy] = G2.S(cm, st.x, st.y);
    if (st.phase === 1) {                                              // absorbed: a red event and a short photoelectron
      if (st.after < 0.35) { FX.flash(c, sx, sy, 5 * (1 - st.after / 0.35), 'r2', 1 - st.after / 0.35); FX.e(c, sx + st.after * 40, sy - st.after * 25, 1, 1 - st.after / 0.35); }
      continue;
    }
    if (st.phase === 2 && st.after < 0.3) { const [ex, ey] = G2.S(cm, st.px, st.py); FX.e(c, ex - st.after * 30, ey + st.after * 30, 1, 1 - st.after / 0.3); }
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    const ang = Math.atan2(-st.dir[1], st.dir[0]), ramp = st.phase === 2 ? ['v0', 'v1', 'v2', 'v3'] : undefined;
    if (big) FX.ph(c, sx, sy, ang, st.phase === 2 ? 6.5 : 4.5, 8, 2, 1, ramp);
    else PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, st.phase === 2 ? 'v2' : 'y3');
  }
  return cm;
}
// ---------- the atom diagrams (screen space; not to scale) ----------
function shells(c, cx, cy, radii, counts, t, rot, skip) {
  radii.forEach((r, i) => {
    FX.ring(c, cx, cy, r, 'g3', 1);
    for (let k = 0; k < counts[i]; k++) { if (skip && skip(i, k)) continue; const a = rot * (1.6 - i * 0.3) + k / counts[i] * TAU + i; FX.e(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, i === 0 ? 2 : 1, 1); }
  });
}
function drawPhoto(c, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; PIX.rect(c, 0, 0, W, H, 'k'); c.restore();
  const cx = 140, cy = 245, tE = 3.6, rot = t * 0.9, rK = 22;
  // bone mineral around it: faint neighbouring atoms
  for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + 0.3; FX.nuc(c, cx + Math.cos(an) * 128, cy + Math.sin(an) * 128, 5, k + 3, 0.6 * a); }
  FX.nuc(c, cx, cy, 11, 20, a);
  // K shell: one electron is the target; after the event it flies out (the photoelectron) and the shell keeps a vacancy
  const aK = rot * 1.6 + 0, kx = cx + Math.cos(aK) * rK, ky = cy + Math.sin(aK) * rK;
  shells(c, cx, cy, [rK, 46, 72, 96], [2, 8, 8, 2], t, rot, (i, k) => i === 0 && k === 0);
  const inbound = t < tE;
  if (inbound) {
    const q = clamp((t - 3.1) / (tE - 3.1)), x = lerp(-10, kx, q), y = lerp(70, ky, q), ang = Math.atan2(ky - 70, kx + 10);
    FX.ph(c, x, y, ang, 5, 14, 3, a); FX.e(c, kx, ky, 2, a);
  } else {
    const q = t - tE, ex = kx + q * 95, ey = ky - q * 55;
    if (q < 0.3) { FX.flash(c, kx, ky, 10 * (1 - q / 0.3), 'r2', a * (1 - q / 0.3)); FX.ring(c, kx, ky, 4 + q * 70, 'r3', a * (1 - q / 0.3)); }
    const tr = []; for (let j = 0; j < 8; j++) { const qq = Math.max(0, q - j * 0.04); tr.push([kx + qq * 95, ky - qq * 55]); }
    FX.trail(c, tr, a); FX.e(c, ex, ey, 3, a, true);
    // the vacancy on the K shell
    c.save(); c.globalAlpha = a; FX.ring(c, kx, ky, 2.5, 'r2', 1); c.restore();
  }
  c.save(); c.globalAlpha = a;
  CAP.note(c, t, { x: 20, y: 352, text: 'PHOTOELECTRIC ABSORPTION', t0: 3.05, t1: 5.0, col: 'r3', box: true });
  CAP.note(c, t, { x: 20, y: 363, text: 'electron ejected', t0: 3.65, t1: 5.05, col: 'g9', box: true });
  CAP.note(c, t, { x: 250, y: 132, text: 'CALCIUM IN BONE', t0: 3.0, t1: 5.0, col: 'q5', align: 'right', box: true });
  c.restore();
}
function drawCompton(c, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; PIX.rect(c, 0, 0, W, H, 'k'); c.restore();
  const cx = 125, cy = 258, tE = 6.9, rot = t * 0.8, rL = 64;
  FX.nuc(c, cx, cy, 8, 8, a);
  const aL = rot * 1.3 - 0.4, ox = cx + Math.cos(aL) * rL, oy = cy + Math.sin(aL) * rL;
  shells(c, cx, cy, [20, rL], [2, 6], t, rot, (i, k) => i === 1 && k === 0);
  if (t < tE) {
    const q = clamp((t - 6.4) / (tE - 6.4)), x = lerp(-10, ox, q), y = lerp(110, oy, q), ang = Math.atan2(oy - 110, ox + 10);
    FX.ph(c, x, y, ang, 5, 14, 3, a); FX.e(c, ox, oy, 2, a);
  } else {
    const q = t - tE;
    if (q < 0.25) FX.flash(c, ox, oy, 7 * (1 - q / 0.25), 'w', a * (1 - q / 0.25));
    // the electron recoils; the photon leaves in a new direction with a longer wavelength (less energy), drawn purple
    const ex = ox + q * 70, ey = oy + q * 85, tr = []; for (let j = 0; j < 8; j++) { const qq = Math.max(0, q - j * 0.04); tr.push([ox + qq * 70, oy + qq * 85]); }
    FX.trail(c, tr, a); FX.e(c, ex, ey, 3, a, true);
    const px = ox + q * 120, py = oy - q * 70; FX.ph(c, px, py, Math.atan2(-70, 120), 8, 16, 3, a, ['v0', 'v1', 'v2', 'v3']);
  }
  c.save(); c.globalAlpha = a;
  CAP.note(c, t, { x: 20, y: 352, text: 'COMPTON SCATTERING', t0: 6.35, t1: 8.45, col: 'v3', box: true });
  CAP.note(c, t, { x: 20, y: 363, text: 'less energy, new path', t0: 6.95, t1: 8.62, col: 'g9', box: true });
  CAP.note(c, t, { x: 250, y: 132, text: 'AN OUTER ELECTRON', t0: 6.3, t1: 8.45, col: 'c3', align: 'right', box: true });
  c.restore();
}
SC['s07_tissue'] = {
  init() {
    PHS = simulate();
    FB = findPoint(-0.052, mu => mu > 0.4);                             // the first bone met by this ray
    FC = findPoint(0.03, (mu, t) => t > 560 && mu > 0.15 && mu < 0.25);   // brain, past the skull
  },
  draw(c, t, S) {
    const b = diagB(t), cc = diagC(t);
    if (b >= 1) drawPhoto(c, t, 1);
    else if (cc >= 1) drawCompton(c, t, 1);
    else if (b > 0) dissolve(c, x => drawTissue(x, t, S), x => drawPhoto(x, t, 1), b);
    else if (cc > 0) dissolve(c, x => drawTissue(x, t, S), x => drawCompton(x, t, 1), cc);
    else drawTissue(c, t, S);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const cam = { ...camAt(t), cx: 135, cy: 240 };
    // labels on the overview
    if (t > 1.1 && t < 2.75) {
      const S0_ = S0(), d = CT.rayDir(0, -0.16), Pp = [S0_[0] + d[0] * 705, S0_[1] + d[1] * 705], [ax, ay] = G2.S(cam, ...Pp);
      CAP.note(c, t, { ax, ay, x: 240, y: Math.round(ay) + 18, text: 'TRANSMITTED', t0: 1.2, t1: 2.45, col: 'y3', align: 'right', box: true });
    }
    if (t > 1.2 && t < 2.75) { const [ax, ay] = G2.S(cam, FB.x, FB.y); CAP.note(c, t, { ax, ay, x: 20, y: 140, text: 'SKULL', t0: 1.3, t1: 2.45, col: 'q5', box: true }); }
    if (t > 5.1 && t < 6.5) { const [ax, ay] = G2.S(cam, FC.x, FC.y); CAP.note(c, t, { ax, ay, x: 20, y: 140, text: 'BRAIN', t0: 5.2, t1: 6.25, col: 'p3', box: true }); }
    if (t > 8.5) {
      CAP.note(c, t, { x: 20, y: 140, text: 'A  PASSES', t0: 8.6, t1: 9.85, col: 'y3', box: true });
      CAP.note(c, t, { x: 20, y: 151, text: 'B  ABSORBED', t0: 8.65, t1: 9.85, col: 'r3', box: true });
      CAP.note(c, t, { x: 20, y: 162, text: 'C  SCATTERED', t0: 8.7, t1: 9.85, col: 'v3', box: true });
    }
    CAP.cap(c, t, { l1: 'X-RAYS IN TISSUE', l2: ['SOME PHOTONS PASS THROUGH.', 'OTHERS ARE ABSORBED', 'OR SCATTERED.'], t0: 0.15, tSwap: 1.4, t1: 9.85, acc: 'y3' });
  },
  cues: () => {
    const q = [[0.1, 'push_in', 0.7, 0, 1.1], [1.2, 'tag', 0.4, 0.4], [2.45, 'zoom_rush', 0.8, -0.2, 0.6], [3.6, 'photoelectric', 1, -0.2], [5.15, 'pull_back', 0.6, 0, 0.6], [5.2, 'tag', 0.35, -0.4],
      [5.75, 'zoom_rush', 0.8, 0.2, 0.6], [6.9, 'compton', 1, 0.2], [8.65, 'pull_back', 0.6, 0, 0.6], [8.6, 'tag', 0.4, -0.4], [8.72, 'tag', 0.4, -0.4]];
    // soft pulses for transmitted photons, grouped on 8th notes
    const seen = new Set();
    for (const ph of PHS) { if (ph.kind !== 'A') continue; const tt = ph.te + 0.9; const k = Math.round(tt * 4); if (tt < 0.8 || tt > 9.8 || (tt > 3 && tt < 8.4) || seen.has(k)) continue; seen.add(k); q.push([k / 4, 'transmit_pulse', 0.3, ph.g * 3]); }
    return q;
  },
};
})();
