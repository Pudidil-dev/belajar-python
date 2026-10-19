// S06 BREMSSTRAHLUNG (22–29 s, first drop at 22): one fast electron swings past a tungsten nucleus. The nucleus's
// electric pull (+ attracts −) bends its path; changing velocity, it loses kinetic energy, and exactly that energy
// leaves as an X-ray photon (a violet wave packet). No collision, no nuclear reaction: the nucleus is unchanged.
// Then the view pulls back over many passes: the closer the pass, the sharper the turn and the more energetic the photon
// (shorter wave). Every energy up to the electron's full 80 keV occurs, so the spectrum fills in as a continuum.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const T0 = 22, V = 25, CPH = 52;                        // scene start (film s), electron speed (px/s), photon speed (2×)
let PASSES = [];
const camAt = t => {
  const A = TW.A;
  if (t < 3.3) { const p = MO.sineInOut(clamp(t / 3.3)); return { x: A.x + lerp(0, 3, p), y: A.y + lerp(0, 2, p), z: K.zl(5.5, 6.1, p) }; }
  if (t < 4.4) { const p = MO.sineInOut((t - 3.3) / 1.1); return { x: lerp(A.x + 3, A.x + 14, p), y: lerp(A.y + 2, A.y + 4, p), z: K.zl(6.1, 1.75, p) }; }
  const p = MO.sineInOut(clamp((t - 4.4) / 2.6));
  return { x: lerp(A.x + 14, A.x + 30, p), y: lerp(A.y + 4, A.y - 6, p), z: K.zl(1.75, 1.95, p) };
};
window.S06 = { camAt };
// bullet time for the featured pass: around the emission (23.0 s) its clock runs at 0.25× so the photon can be seen
const BT = (() => { const n = 400, a = 22.75, b = 24.4, tab = new Float64Array(n + 1); let acc = a;
  const rate = T => 1 - 0.75 * MO.smooth(clamp((T - 22.99) / 0.12)) * (1 - MO.smooth(clamp((T - 23.6) / 0.6)));
  tab[0] = a; for (let i = 1; i <= n; i++) { const T = a + (b - a) * (i - 0.5) / n; acc += rate(T) * (b - a) / n; tab[i] = acc; }
  return T => T <= a ? T : T >= b ? tab[n] + (T - b) : (() => { const f = (T - a) / (b - a) * n, i = Math.floor(f); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); })(); })();
window.S06.clock = BT;
// photon state for a pass at film time T
const photon = (ps, T) => {
  const tr = ps.tr, te = ps.t0 + tr.tEmit;
  if (tr.tEmit == null || T < te) return null;
  const vx = tr.emitVx, vy = tr.emitVy, va = Math.atan2(vy, vx);
  const cr = (tr.emitX - ps.ax) * vy - (tr.emitY - ps.ay) * vx;          // which side of the nucleus it passed
  const ang = va + (cr > 0 ? -0.42 : 0.42), d = (T - te) * CPH;          // tilted to the outside of the bend
  return { x: tr.emitX + Math.cos(ang) * d, y: tr.emitY + Math.sin(ang) * d, ang, age: T - te, ex: tr.emitX, ey: tr.emitY };
};
const lamFor = (E, z) => FX.lamFor(E) * clamp(z / 3.2, 0.65, 1.35);
function drawPass(c, cam, ps, T, big) {
  const tr = ps.tr, ft = T - ps.t0;
  if (ft < -0.05) return;
  const stopped = ps.frac >= 0.99, te = tr.tEmit ?? 1e9;
  // electron + trail (the trail shows the bend)
  const ea = stopped && ft > te ? clamp(1 - (ft - te) / 0.35) : clamp((ft + 0.05) / 0.2);
  if (ea > 0) {
    const pts = []; for (let j = 0; j < 16; j++) { const tt = ft - j * 0.07; if (tt < 0) break; const p = PHYS.at(tr, stopped ? Math.min(tt, te) : tt); pts.push(K.S(cam, p[0], p[1])); }
    FX.trail(c, pts, ea);
    const p = PHYS.at(tr, stopped ? Math.min(ft, te) : ft), [sx, sy] = K.S(cam, p[0], p[1]);
    FX.e(c, sx, sy, big ? 3 : 2, ea, true);
  }
  // emission flash + photon
  const ph = photon(ps, T);
  if (ph) {
    if (ph.age < 0.25) { const [fx, fy] = K.S(cam, ph.ex, ph.ey); FX.flash(c, fx, fy, (big ? 10 : 5) * (1 - ph.age / 0.25), 'p3', 1 - ph.age / 0.25); if (big) FX.ring(c, fx, fy, 6 + ph.age * 160, 'p2', 1 - ph.age / 0.25); }
    const [sx, sy] = K.S(cam, ph.x, ph.y), lam = lamFor(ps.E, cam.z);
    FX.ph(c, sx, sy, ph.ang, lam, lam * (big ? 3.2 : 2.6), big ? 5 : 3, clamp(ph.age / 0.08));
  }
}
SC['s06_bremsstrahlung'] = {
  init() {
    // phase B passes: [t (local), atom i, j, impact parameter b (px), photon energy keV, labelled]
    const TAB = [[3.75, 2, -2, 11, 14, 1], [4.0, 4, 1, 5, 52, 1], [4.25, 1, 1, 8, 27, 1], [4.5, 3, 2, 2.6, 80, 1], [4.75, 4, -1, 9, 21, 0], [5.0, 2, 0, 6, 40, 0],
      [5.25, 3, -3, 12, 9, 0], [5.5, 5, 0, 4.5, 61, 0], [5.625, 1, -1, 7, 33, 0], [5.75, 4, 2, 10, 17, 0], [5.875, 2, 3, 5.5, 45, 0], [6.0, 5, -2, 8.5, 24, 0],
      [6.125, 3, -1, 6.5, 36, 0], [6.25, 1, 2, 9.5, 19, 0], [6.375, 4, 3, 4, 66, 0], [6.5, 2, -3, 7.5, 29, 0], [6.625, 5, 1, 11, 12, 0], [6.75, 3, 1, 5, 49, 0]];
    PASSES = TAB.map(([tl, i, j, b, E, lab], k) => {
      const a = TW.atom(i, j), side = h(k, 4) < 0.5 ? 1 : -1, ap = TW.approach(a, b, side, (h(k, 3) - 0.5) * 0.9, 14);
      const tr = TW.pass({ x: ap.x, y: ap.y, vx: ap.ux * V, vy: ap.uy * V, T: 6, k: 1300, frac: E / 80, near: a, only: [a] });
      return { tr, t0: T0 + tl - (tr.tEmit ?? 0), E, frac: E / 80, ax: a.x, ay: a.y, lab, tl };
    });
    const F = TW.FEAT;
    TW.FEAT_PASS = { tr: F.tr, t0: F.t0, E: F.Eg, frac: F.Eg / 80, ax: TW.A.x, ay: TW.A.y };
  },
  draw(c, t, S) {
    const cam = camAt(t), T = S.t, F = TW.FEAT_PASS, TF = BT(T);
    TW.draw(c, cam, T, { vib: 0.5, gain: cam.z < 3 ? 0.62 : 0.82 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the featured pass: force arrow while it bends
    const ft = TF - F.t0, p = PHYS.at(F.tr, ft), tE = F.tr.tEmit;
    const dA = Math.hypot(p[0] - TW.A.x, p[1] - TW.A.y);
    if (t < 3.4 && dA < 30 && ft > 0) {
      const [sx, sy] = K.S(cam, p[0], p[1]), [nx, ny] = K.S(cam, TW.A.x, TW.A.y), L = Math.min(34, 260 / Math.max(6, dA)), dl = Math.hypot(nx - sx, ny - sy);
      K.arrow(c, sx, sy, sx + (nx - sx) / dl * L, sy + (ny - sy) / dl * L, 'o2', 4);
    }
    drawPass(c, cam, F, TF, true);
    for (const ps of PASSES) drawPass(c, cam, ps, T, false);
    // labels
    if (t < 3.3) {
      const [nx, ny] = K.S(cam, TW.A.x, TW.A.y);
      CAP.note(c, t, { ax: nx + 8, ay: ny + 14, x: 196, y: 352, text: 'NUCLEUS (74+)', t0: 0.25, t1: 2.9, col: 'o2', align: 'center', box: true });
      const ph = photon(F, TF);
      if (ph && t < 3.25) { const [sx, sy] = K.S(cam, ph.x, ph.y); CAP.note(c, t, { ax: sx, ay: sy, x: 256, y: 296, text: 'X-RAY PHOTON', t0: 1.12, t1: 2.75, col: 'p3', align: 'right', box: true }); }
      CAP.note(c, t, { x: 256, y: 307 + 0, text: '(invisible; drawn violet)', t0: 1.45, t1: 2.75, col: 'd8', align: 'right', box: true });
      CAP.note(c, t, { x: 135, y: 410 - 26, text: 'nothing is split: no nuclear reaction', t0: 2.05, t1: 3.2, align: 'center', col: 'w', box: true });
      // meters
      const ma = clamp((t - 0.15) / 0.2) * (1 - clamp((t - 3.1) / 0.2)), em = clamp((ft - tE) / 0.18);
      FX.meter(c, 14, 318 - 22, 104, (80 - 31 * em) / 80, 'ELECTRON', `${Math.round(80 - 31 * em)} keV`, 'c2', ma);
      FX.meter(c, 14, 342 - 22, 104, 31 * em / 80, 'PHOTON', `${Math.round(31 * em)} keV`, 'p2', ma);
    }
    // phase B: photon energies, notes, the spectrum
    for (const ps of PASSES) if (ps.lab) {
      const ph = photon(ps, T);
      if (!ph || ph.age > 0.9) continue;
      const [sx, sy] = K.S(cam, ph.x, ph.y), s = ps.E >= 80 ? '80 keV: all of it' : `${ps.E} keV`;
      CAP.note(c, ph.age + 10, { x: Math.min(Math.round(sx) + 6, 256 - PIX.textWidth(s)), y: Math.max(104, Math.round(sy) - 12), text: s, t0: 10, t1: 10.7, col: 'p3', box: true });
    }
    CAP.note(c, t, { x: 14, y: 80, text: 'closer pass → sharper turn → more energy', t0: 3.9, t1: 6.3, col: 'w', box: true });
    CAP.note(c, t, { x: 14, y: 91, text: 'any energy, up to the full 80 keV', t0: 5.35, t1: 6.6, col: 'd9', box: true });
    if (t > 3.5) {
      const ev = []; for (const ps of PASSES) if (ps.tr.tEmit != null) ev.push([ps.E, ps.t0 + ps.tr.tEmit]);
      ev.push([31, F.t0 + F.tr.tEmit]);
      HUD.spec(c, 14, 300, { f: 0.95 * MO.smooth(clamp((t - 5.9) / 0.9)), events: ev, t: T, a: clamp((t - 3.5) / 0.25) });
    }
    // the chain of events, lit as they happen (top left)
    if (t < 3.6) {
      const te = F.t0 + tE - T0;
      CAP.steps(c, t, { x: 14, y: 80, t1: 3.45, items: [[0.2, 'FAST ELECTRON', 'c2'], [0.62, 'ELECTROMAGNETIC DEFLECTION', 'o2'], [te, 'ENERGY LOSS', 'y2'], [te + 0.06, 'X-RAY PHOTON', 'p2']] });
    }
    CAP.scene(c, t, { title: 'BREMSSTRAHLUNG', ctx: "German for 'braking radiation'.", t0: 0.1, t1: 6.9 });
  },
  cues: () => {
    const q = [[0, 'drop', 1], [0.1, 'type', 0.5], [0.2, 'whoosh_e', 0.9, -0.6, 1.0], [0.62, 'bend', 0.7, 0], [3.3, 'pull_back', 0.7, 0, 1.1]];
    const F = TW.FEAT_PASS;
    if (F) q.push([F.t0 + F.tr.tEmit - T0, 'photon', 1, 0.3, 31]);
    for (const ps of PASSES) if (ps.tr.tEmit != null) q.push([ps.t0 + ps.tr.tEmit - T0, 'photon', ps.lab ? 0.8 : 0.5, (ps.ax - TW.A.x) / 120, ps.E]);
    q.push([5.9, 'fill_rise', 0.6, -0.5, 0.9], [2.05, 'blip', 0.4, 0]);
    return q;
  },
};
})();
