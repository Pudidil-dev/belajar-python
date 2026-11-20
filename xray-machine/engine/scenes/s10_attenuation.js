// S10 X-RAY ATTENUATION (42–47 s): the beam reaches the hand, shown as a cross-section through the metacarpals (the
// palm lies on the detector). Each photon's fate follows its real path: soft tissue, cortical bone and marrow each
// have their own attenuation, so a photon passes straight through, is absorbed (photoelectric effect: it vanishes and
// frees an electron) or is scattered (Compton: it bounces off in a new direction with less energy).
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const Y_START = -75, V = 95, DET = 29.5;               // photon start (mm), speed (mm/s), detector surface (mm)
const camAt = t => {
  if (t < 0.7) { const p = MO.cubicOut(t / 0.7); return { x: -3, y: lerp(-34, 12, p), z: K.zl(2.4, 2.9, p) }; }
  const p = MO.sineInOut(clamp((t - 0.7) / 4.3)); return { x: -3, y: 12, z: K.zl(2.9, 3.05, p) };
};
window.S10 = { camAt, Y_START, V, DET };
// photons with their fates
const PH = [];
const fateFor = (x, k, force) => {
  const segs = HAND.secSegments(x);
  if (force === 'pass') return { kind: 'pass' };
  for (let si = 0; si < segs.length; si++) {
    const [a, b, kd] = segs[si], P = 1 - Math.exp(-HAND.MU[kd] * (b - a));
    const r = h(k * 13 + si, 41);
    const want = force ? (force === 'abs' ? kd !== 'soft' : kd === 'soft') : r < P;
    if (want) {
      const y = force ? (a + b) / 2 : a + (b - a) * h(k * 13 + si, 42);
      const pa = kd === 'soft' ? 0.18 : kd === 'cortex' ? 0.6 : 0.35;
      const abs = force ? force === 'abs' : h(k, 43) < pa;
      return { kind: abs ? 'abs' : 'sca', y, tissue: kd, ang: Math.PI / 2 + (h(k, 44) < 0.5 ? -1 : 1) * (0.6 + h(k, 45) * 1.6), eAng: h(k, 46) * U.TAU };
    }
  }
  return { kind: 'pass' };
};
for (let k = 0; k < 270; k++) { const x = -48 + h(k, 1) * 92, ts = -0.7 + k * 0.04 + h(k, 2) * 0.03; PH.push({ x, ts, E: 30 + h(k, 3) * 30, f: fateFor(x, k) }); }
// three scripted photons that get labelled
const SHOW = [{ x: -21, tEv: 1.35, force: 'pass', label: 'PASSES THROUGH' }, { x: -2.2, tEv: 1.95, force: 'abs', label: 'ABSORBED' }, { x: 5.5, tEv: 2.55, force: 'sca', label: 'SCATTERED' }];
SHOW.forEach((s, i) => {
  const f = fateFor(s.x, 900 + i, s.force), yEv = f.kind === 'pass' ? DET : f.y;
  if (f.kind === 'sca') f.ang = Math.PI / 2 - 1.1;
  PH.push({ x: s.x, ts: s.tEv - (yEv - Y_START) / V, E: 45, f, show: s });
});
window.S10.PH = PH;
// state of a photon at local time t → {x, y, ang, lamK, alive, ev}
const stateAt = (p, t) => {
  const age = t - p.ts; if (age < 0) return null;
  const y = Y_START + age * V, f = p.f;
  if (f.kind === 'pass') return y > DET ? { done: true, tHit: p.ts + (DET - Y_START) / V } : { x: p.x, y, ang: Math.PI / 2, lamK: 1 };
  const tEv = p.ts + (f.y - Y_START) / V;
  if (t < tEv) return { x: p.x, y, ang: Math.PI / 2, lamK: 1 };
  if (f.kind === 'abs') return { gone: true, tEv };
  const d = (t - tEv) * V;
  return { x: p.x + Math.cos(f.ang) * d, y: f.y + Math.sin(f.ang) * d, ang: f.ang, lamK: 1.35, tEv };
};
function drawDetector(c, cam, t, hits) {
  const [x0, y0] = K.S(cam, -60, DET), [x1, y1] = K.S(cam, 60, DET + 12);
  PIX.rect(c, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), 'd3');
  PIX.rect(c, Math.round(x0), Math.round(y0), Math.round(x1 - x0), 2, 'd6');
  PIX.rect(c, Math.round(x0), Math.round(y0) + 3, Math.round(x1 - x0), 3, 'g0');
  for (const [hx, age] of hits) { const [sx, sy] = K.S(cam, hx, DET); FX.flash(c, sx, sy + 3, 3 * (1 - age / 0.25), 'g3', 1 - age / 0.25); }
}
window.S10.drawWorld = (c, t, S, cam, o = {}) => {
  K.cam(c, cam);
  HAND.drawSection(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const hits = [];
  for (const p of PH) {
    if (o.only && !o.only(p)) continue;
    const st = stateAt(p, t); if (!st) continue;
    if (st.done) { const age = t - st.tHit; if (age < 0.25) hits.push([p.x, age]); continue; }
    if (st.gone) {
      const age = t - st.tEv;
      if (age < 0.35) {
        const [sx, sy] = K.S(cam, p.x, p.f.y); FX.flash(c, sx, sy, 4 * (1 - age / 0.35), 'p3', 1 - age / 0.35);
        const d = age * 22, [ex, ey] = K.S(cam, p.x + Math.cos(p.f.eAng) * d, p.f.y + Math.sin(p.f.eAng) * d); FX.e(c, ex, ey, 1, 1 - age / 0.35);   // photoelectron
      }
      continue;
    }
    if (st.tEv != null && t - st.tEv < 0.3) {                    // Compton recoil electron
      const age = t - st.tEv, d = age * 16, an = st.ang + Math.PI * 0.55, [ex, ey] = K.S(cam, p.x + Math.cos(an) * d, p.f.y + Math.sin(an) * d);
      FX.e(c, ex, ey, 1, 1 - age / 0.3);
      if (age < 0.2) { const [sx, sy] = K.S(cam, p.x, p.f.y); FX.flash(c, sx, sy, 3, 'p3', 1 - age / 0.2); }
    }
    const [sx, sy] = K.S(cam, st.x, st.y); if (sy > H + 10 || sx < -10 || sx > W + 10) continue;
    const lam = FX.lamFor(p.E) * st.lamK; FX.ph(c, sx, sy, st.ang, lam, lam * 2.4, 2.5, 1);
  }
  drawDetector(c, cam, t, hits);
};
SC['s10_attenuation'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    S10.drawWorld(c, t, S, cam);
    const L = (x, y) => K.S(cam, x, y), SEC = HAND.SEC;
    // anatomy labels
    { const [ax, ay] = L(32, SEC.top(32)); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) - 30, text: 'SKIN', t0: 0.75, t1: 3.0, align: 'right', col: 't3', box: true }); }
    { const [ax, ay] = L(-24, 16); CAP.note(c, t, { ax, ay, x: 14, y: Math.round(ay) - 52, text: 'SOFT TISSUE', t0: 0.95, t1: 3.0, col: 't3', box: true }); }
    { const [ax, ay] = L(-2, 7.5); CAP.note(c, t, { ax, ay, x: 108, y: Math.round(ay) - 50, text: 'BONE', t0: 1.15, t1: 3.0, col: 'b2', box: true }); }
    { const [ax, ay] = L(-15.5, 20.5); CAP.note(c, t, { ax, ay, x: 14, y: Math.round(ay) + 46, text: 'TENDON', t0: 1.35, t1: 3.0, col: 'b1', box: true }); }
    { const [ax, ay] = L(30, DET + 6); CAP.note(c, t, { ax, ay, x: 256, y: Math.round(ay) + 10, text: 'DETECTOR', t0: 1.0, t1: 3.2, align: 'right', col: 'd9', box: true }); }
    // labelled events
    SHOW.forEach((s, i) => {
      const p = PH.find(q => q.show === s), yEv = p.f.kind === 'pass' ? DET : p.f.y, [ax, ay] = L(p.x, yEv);
      CAP.note(c, t, { ax, ay, x: [60, 135, 210][i], y: [342, 356, 342][i], text: s.label, t0: s.tEv, t1: s.tEv + 1.5, col: i === 0 ? 'g3' : 'p3', align: 'center', box: true });
    });
    // where the slice is: a thumbnail of the hand with the cut line
    const ia = clamp((t - 0.3) / 0.3) * (1 - clamp((t - 3.4) / 0.25));
    if (ia > 0) {
      const x = 214, y = 84, w = 42, hh = 54, v = (0.7 - HAND.box.y0) / (HAND.box.y1 - HAND.box.y0);
      PIX.rect(c, x - 2, y - 2, w + 4, hh + 4, 'd3'); HAND.draw(c, x, y, w, hh, {});
      for (let k = 0; k < w; k += 3) PIX.rect(c, x + k, Math.round(y + hh * v), 2, 1, 'c2');
      PIX.text(c, 'SLICE', x - 32, Math.round(y + hh * v) - 3, 'c3', { shadow: 'k' });
    }
    CAP.scene(c, t, { title: 'X-RAY ATTENUATION', ctx: 'Some pass. Some are absorbed or scattered.', t0: 0.1, t1: 4.92 });
  },
  cues: () => {
    const q = [[0, 'arrive', 0.7, 0, 0.7], [0.1, 'type', 0.5], [0.75, 'blip', 0.35, 0.5], [0.95, 'blip', 0.35, -0.5], [1.15, 'blip', 0.35, 0], [1.35, 'blip', 0.35, -0.5], [0.4, 'particles', 0.6, 0, 4.4]];
    SHOW.forEach((s, i) => q.push([s.tEv, ['pass_tone', 'absorb', 'scatter'][i], 0.9, [-0.4, 0, 0.4][i]]));
    let n = 0;
    for (const p of PH) if (!p.show && p.f.kind !== 'pass') { const tEv = p.ts + (p.f.y - Y_START) / V, tq = Math.round(tEv * 8) / 8; if (tq > 0.5 && tq < 4.8 && !q.some(x => x[0] === tq && x[1] === 'interact')) { q.push([tq, 'interact', 0.3, p.x / 50, p.f.kind === 'abs' ? 1 : 0]); n++; } }
    return q;
  },
};
})();
