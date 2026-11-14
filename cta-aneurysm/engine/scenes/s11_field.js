// S11 DEFLECTED BY THE NUCLEAR FIELD (40–44 s), and the shared pass for S10–S13. Locked atomic schematic round tungsten
// atom A. A first electron passes it at a distance: the screened pull of the nucleus bends its path a little and it
// swings on, deflected, without touching the nucleus. The tracked electron comes in on a closer line; its path starts to
// curve hard toward the nucleus (the emission at the bend is S12).
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const TE = 44.4, V = 14;                                   // film time of the featured closest approach; electron speed (world px/s, slowed)
let B = null;
const build = () => {
  if (B) return B;
  const A = TW.A;
  // the featured (tracked) electron: a close pass, 1/3 of its energy leaves as the photon at periapsis
  const ap = TW.approach(A, 6.2, -1, 0.0, 16);
  const ux = ap.ux, uy = ap.uy, px = ap.x + ux * 75, py = ap.y + uy * 75;   // straight-line closest point
  const x0 = px - ux * V * 7.0, y0 = py - uy * V * 7.0;
  const tr = TW.pass({ x: x0, y: y0, vx: ux * V, vy: uy * V, T: 11, k: 1300, frac: 1 / 3, near: A, only: [A] });
  const feat = { tr, t0: TE - tr.tEmit };
  // the distant pass (S11): no photon, a gentle bend
  const ap2 = TW.approach(A, 19, 1, -0.55, 14);
  const tr2 = TW.pass({ x: ap2.x - ap2.ux * 40, y: ap2.y - ap2.uy * 40, vx: ap2.ux * 30, vy: ap2.uy * 30, T: 7, k: 1300, near: A, only: [A] });
  const [tp] = TW.periT(tr2, A.x, A.y);
  const dist = { tr: tr2, t0: 41.9 - tp };
  // bullet time round the emission: film clock → pass clock (slower 44.2–45.3)
  const a = TE - 0.25, b = TE + 1.1, n = 400, tab = new Float64Array(n + 1); let acc = a;
  const rate = T => 1 - 0.72 * MO.smooth(clamp((T - (TE - 0.22)) / 0.18)) * (1 - MO.smooth(clamp((T - (TE + 0.35)) / 0.7)));
  tab[0] = a; for (let i = 1; i <= n; i++) { const T = a + (b - a) * (i - 0.5) / n; acc += rate(T) * (b - a) / n; tab[i] = acc; }
  const BT = T => T <= a ? T : T >= b ? tab[n] + (T - b) : (() => { const f = (T - a) / (b - a) * n, i = Math.floor(f); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); })();
  B = { A, feat, dist, BT };
  return B;
};
// the featured electron's position at film time T (before 37.4 it waits at its start)
const elAt = T => { const b = build(), ft = Math.max(0, b.BT(T) - b.feat.t0); return PHYS.at(b.feat.tr, ft); };
const CAM = () => ({ x: TW.A.x - 26, y: TW.A.y + 4, z: 3.4 });
window.BREMS = { build, elAt, CAM, TE, V };
window.BREMS.drawPass = (c, cam, T, o = {}) => {
  const b = build(), ft = b.BT(T) - b.feat.t0, tr = b.feat.tr;
  // trail (long, so both outgoing paths stay visible in S12)
  const pts = []; for (let j = 0; j < (o.long ? 60 : 18); j++) { const tt = ft - j * 0.06; if (tt < 0) break; const p = PHYS.at(tr, tt); pts.push(K.S(cam, p[0], p[1])); }
  FX.trail(c, pts, 1);
  const p = PHYS.at(tr, Math.max(0, ft)), [sx, sy] = K.S(cam, p[0], p[1]);
  FX.e(c, sx, sy, 3, 1, true); FX.ring(c, sx, sy, 10, 'c4', o.ring ?? 1);
  // the pull of the nucleus while it bends: a blue arrow toward the nucleus
  const A = b.A, dA = Math.hypot(p[0] - A.x, p[1] - A.y);
  if (dA < 34 && !o.noPull) { const [nx, ny] = K.S(cam, A.x, A.y), L = Math.min(30, 300 / Math.max(6, dA)), dl = Math.hypot(nx - sx, ny - sy) || 1; K.arrow(c, sx, sy, sx + (nx - sx) / dl * L, sy + (ny - sy) / dl * L, 'b3', 4); }
  return { sx, sy, ft };
};
SC['s11_field'] = {
  init() { build(); },
  draw(c, t, S) {
    const cam = CAM(), b = build();
    TW.draw(c, cam, S.t, { vib: 0.5, gain: 0.8 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // faint field rings round nucleus A (the screened pull reaches only a little way)
    const [ax, ay] = K.S(cam, b.A.x, b.A.y), fa = MO.smooth(clamp((t - 0.2) / 0.5));
    for (let k = 1; k <= 3; k++) FX.ring(c, ax, ay, k * 13 * cam.z * 0.55 + 2 * Math.sin(S.t * 3 + k), k === 1 ? 'b2' : 'b1', fa * (0.9 - k * 0.2));
    // the distant pass
    const dt = S.t - b.dist.t0;
    if (dt > 0 && dt < 7) {
      const pts = []; for (let j = 0; j < 22; j++) { const tt = dt - j * 0.06; if (tt < 0) break; const p = PHYS.at(b.dist.tr, tt); pts.push(K.S(cam, p[0], p[1])); }
      FX.trail(c, pts, 0.9); const p = PHYS.at(b.dist.tr, dt), [sx, sy] = K.S(cam, p[0], p[1]); FX.e(c, sx, sy, 2, 1, true);
    }
    window.BREMS.drawPass(c, cam, S.t);
    CAP.ctx(c, t, { text: 'NÜVƏ SAHƏSİNDƏ ƏYİLİR', t0: 0.4, t1: 3.6 });
    CAP.note(c, t, { text: 'SXEM • MİQYAS GÖZLƏNİLMƏYİB', x: W / 2, y: 590, t0: 0, t1: 3.6, col: 'g8', align: 'center', sc: 1 });
  },
  cues: [[0.2, 'field_on', 0.6, 0, 0.6], [0.4, 'type', 0.4], [1.9, 'bend', 0.7, -0.3], [3.3, 'bend_low', 0.6, 0.1]],
};
})();
