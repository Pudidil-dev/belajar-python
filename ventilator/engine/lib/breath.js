// BREATH — the one breath the film follows, as functions of film time, and the deterministic particle streams that show gas
// moving along a path. Everything is a pure function of time (hashed offsets, no Math.random).
//
// The ventilator: volume assist-control, a time-triggered mandatory breath, constant (square) inspiratory flow, a target
// tidal volume, passive expiration to PEEP. Representative settings (the numbers on the machine's own screen):
//   VT 450 mL · flow 40 L/min · RR 14 /min · PEEP 5 cmH2O · FiO2 40 % · peak pressure about 22 cmH2O.
// The waveforms are those of such a breath: flow is a positive square wave during inspiration and a negative, decaying
// curve during expiration; volume rises linearly and falls exponentially; pressure steps up (resistance), rises linearly
// (elastance) to its peak, then falls to PEEP — never to zero.
//
// The lung state in the film (v = 0 at end-expiration with PEEP, 1 at end-inspiration):
//   0–3 s the hook breath (inspiration) · 3–4.5 s held · offscreen while the film is inside the machine · 30–34.6 s the
//   explained breath inflates · held while gas exchange is shown and until the target volume ends inspiration (41.5–43 s) ·
//   43–47 s passive expiration by elastic recoil · rest at PEEP until 60 s, where the next breath starts: the loop.
(() => {
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const BREATH = window.BREATH = { NAME: 'BREATH' };
const SET = BREATH.SET = { VT: 450, flow: 40, RR: 14, PEEP: 5, FiO2: 40, Ppeak: 22 };
// The hook (the first 8 s on screen, the film's first 3 s of its own time) shows the lungs breathing: two whole breaths at
// the set rate (RR 14: one every 4.29 s; inspiration a quarter of it). Each breath: the volume rises linearly while the
// ventilator delivers its constant flow, then falls exponentially as the lungs recoil passively. A third breath starts as
// the film enters the machine. r = seconds on screen from the film's start.
const HP = 60 / SET.RR, HTI = HP * 0.25, HTE = 0.55;
const hb = u => u < 0 ? 0 : u < HTI ? u / HTI : Math.exp(-(u - HTI) / HTE);
BREATH.HOOK = { P: HP, TI: HTI, TE: HTE, W: 0.375 };                     // W: the hook's own seconds per screen second
BREATH.hookV = r => Math.min(1, hb(r) + hb(r - HP) + hb(r - 2 * HP));
BREATH.hookPhase = r => { const k = Math.max(0, Math.floor(r / HP)), u = r - k * HP; return { k, u, insp: u < HTI }; };
BREATH.v = T => {
  T = ((T % 60) + 60) % 60;
  if (T < 3.0) return BREATH.hookV(T / 0.375);                                           // the hook: two breaths
  if (T < 8.0) return BREATH.hookV(8 + (T - 3) / 0.6);                                   // the third breath (S07), then offscreen
  if (T < 30) return 0;
  if (T < 34.6) return lerp(0, 1, clamp((T - 30) / 4.6));
  if (T < 43) return 1;
  if (T < 47.5) return Math.exp(-3.4 * (T - 43) / 1.0 * 0.62) * (1 - clamp((T - 46.5) / 1.0)) + 0;   // passive recoil: exponential
  return 0;                                                                               // at rest (PEEP) until the next breath: the loop point
};
// the waveforms over one breath, s in [0, 1): inspiration takes the first SI of the cycle (I:E about 1:3)
const SI = BREATH.SI = 0.25, TAUE = 0.1;
BREATH.wave = s => {
  s = ((s % 1) + 1) % 1;
  if (s < SI) { const q = s / SI; return { P: SET.PEEP + 6 + (SET.Ppeak - SET.PEEP - 6) * q, F: SET.flow, V: SET.VT * q }; }
  const e = Math.exp(-(s - SI) / TAUE);
  return { P: SET.PEEP + 11 * e, F: -58 * e, V: SET.VT * e };
};
// ---------- particle streams along a polyline ----------
// pts: [[x, y], …] (world units) with pts.S = cumulative lengths (WORLD-style). o: { n, speed (units/s), dir (+1 along the
// points, −1 against), seed, ramp (colour keys), len (trail length in units), w (screen px), mix: p (fraction of O2 in a
// gas: particles become O2 (cyan-blue) or N2 (grey) by hash), spread (± units across the path), a (0..1), from, to (the
// drawn stretch, units) }
const lens = pts => { const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return S; };
const at = (pts, S, d) => {
  if (d <= 0) return [pts[0][0], pts[0][1], Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])];
  for (let i = 1; i < pts.length; i++) if (d <= S[i]) { const q = (d - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
  const n = pts.length - 1; return [pts[n][0], pts[n][1], Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0])];
};
const smooth = (pts, step = 2) => {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) {
    const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); out.S = lens(out); return out;
};
BREATH.lens = lens; BREATH.at = at; BREATH.path = (pts, step = 2) => smooth(pts, step);
BREATH.len = pts => pts.S[pts.S.length - 1];
// the colour of one gas particle: O2 (cyan-blue) with probability p, else N2 (grey); trails (no mix) use the ramp given
const GAS = { o2: ['o24', 'o25', 'o24'], n2: ['g6', 'g7', 'g6'] };          // bright enough to read in a dark channel
// a round particle (the revision: dots instead of dashes; at 3 px a plus, from 4 px a small disc)
const dot = BREATH.dot = (c, x, y, w) => {
  if (w <= 2) { c.fillRect(x, y, w, w); return; }
  if (w === 3) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); return; }
  const r = w / 2; for (let dy = -Math.ceil(r); dy < Math.ceil(r); dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - (dy + 0.5) ** 2))); if (hw > 0) c.fillRect(x - hw, y + dy, 2 * hw, 1); }
};
BREATH.CALM = 0.78;                                // the revision: every stream moves a little slower (calmer)
BREATH.stream = (c, cam, pts, T, o = {}) => {
  const L = BREATH.len(pts), n = o.n ?? Math.max(4, Math.round(L / 6)), sp = o.speed ?? 60, dir = o.dir ?? 1, seed = o.seed ?? 1, a = o.a ?? 1;
  const from = o.from ?? 0, to = o.to ?? L, z = cam.z, len = o.len ?? 0, ramp = o.ramp || ['cy3', 'cy4', 'cy5'], w = o.w ?? U.clamp(Math.round(z * 0.9), 1, 2);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < n; k++) {
    const h1 = U.hash(k, seed), h2 = U.hash(k, seed + 7), h3 = U.hash(k, seed + 13);
    const v = sp * (0.8 + 0.4 * h2) * (o.calm ?? BREATH.CALM);
    let d = ((h1 * L + dir * T * v) % L + L) % L;
    if (d < from || d > to) continue;
    const [x, y, ang] = at(pts, pts.S, d), off = ((o.spread ?? 0) * (h3 - 0.5) * 2);
    const px = x - Math.sin(ang) * off, py = y + Math.cos(ang) * off;
    const [sx, sy] = K.S(cam, px, py);
    if (sx < -10 || sy < -10 || sx > 280 || sy > 490) continue;
    let col;
    if (o.mix != null) { const isO2 = U.hash(k, seed + 29) < o.mix; col = (isO2 ? GAS.o2 : GAS.n2)[k % 3]; }
    else col = ramp[k % ramp.length];
    if (o.dot) {                                                            // a round head with a thin trail behind it
      const X = Math.round(sx), Y = Math.round(sy);
      if (len > 0) { const tl = Math.min(o.maxTrail ?? 6, len * z), ux = Math.cos(ang) * dir, uy = Math.sin(ang) * dir, steps = Math.max(1, Math.round(tl)), tw = Math.max(1, w - 2); c.fillStyle = PIX.P[o.trail || col] || col; for (let s = Math.ceil(w / 2); s < steps + Math.ceil(w / 2); s++) c.fillRect(Math.round(sx - ux * s), Math.round(sy - uy * s), tw, tw); }
      if (o.edge) { c.fillStyle = PIX.P[o.edge]; dot(c, X, Y, w + 2); }
      c.fillStyle = PIX.P[col] || col; dot(c, X, Y, w);
      continue;
    }
    c.fillStyle = PIX.P[col] || col;
    if (len > 0) {                                                          // a short trail behind the head
      const tl = Math.min(o.maxTrail ?? 14, len * z), ux = Math.cos(ang) * dir, uy = Math.sin(ang) * dir, steps = Math.max(1, Math.round(tl));
      for (let s = 0; s < steps; s++) c.fillRect(Math.round(sx - ux * s), Math.round(sy - uy * s), w, w);
    } else c.fillRect(Math.round(sx), Math.round(sy), w, w);
  }
  c.restore();
};
// a bright pulse (the head of the inspiratory breath): a short solid streak with a white core, travelling d along pts
BREATH.pulse = (c, cam, pts, d, o = {}) => {
  const L = BREATH.len(pts), len = o.len ?? 26, ramp = o.ramp || ['cy2', 'cy3', 'cy4', 'cy5'];
  const seg = []; for (let q = Math.max(0, d - len); q <= Math.min(L, d); q += 1) seg.push(at(pts, pts.S, q));
  if (seg.length < 2) return;
  const w = (o.w ?? 4) * cam.z;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineCap = 'round'; c.globalAlpha = o.a ?? 1;
  for (const [k, lw] of [[0, 1], [1, 0.7], [2, 0.42], [3, 0.18]]) {
    c.strokeStyle = PIX.P[ramp[k]]; c.lineWidth = Math.max(1, w * lw); c.beginPath();
    seg.forEach(([x, y], i) => { const t = i / (seg.length - 1); if (t < k * 0.18) return; const [sx, sy] = K.S(cam, x, y); c.lineTo(sx, sy); }); c.stroke();
  }
  c.restore();
};
// a yellow electrical pulse travelling along a trace (screen-space look, world path)
BREATH.signal = (c, cam, pts, q, o = {}) => {
  if (q <= 0 || q >= 1) return;
  const L = BREATH.len(pts), d = q * L, len = (o.len ?? 18);
  const seg = []; for (let s = Math.max(0, d - len); s <= d; s += 0.7) seg.push(at(pts, pts.S, s));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = o.a ?? 1;
  const [hx, hy] = K.S(cam, ...at(pts, pts.S, d)), hs = U.clamp(Math.round((o.w ?? 2) * cam.z * 1.2), 3, 9);
  FX.glowL(c, hx, hy, Math.max(2, 2.2 * cam.z), ['ys1', 'ys2', 'ys3', 'ys4'], 0.28 * (o.a ?? 1), 1.6);
  seg.forEach(([x, y], i) => { const [sx, sy] = K.S(cam, x, y), t = i / Math.max(1, seg.length - 1), s = Math.max(1, Math.round((o.w ?? 2) * cam.z * (0.3 + 0.5 * t))); c.fillStyle = PIX.P[t > 0.6 ? 'ys4' : 'ys3']; c.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), s, s); });
  // the head: a bright square with a dark edge, readable on the green board and on the dark interior alike
  const X = Math.round(hx - hs / 2), Y = Math.round(hy - hs / 2), cs = Math.max(1, Math.round(hs / 3));
  c.fillStyle = PIX.P.k; c.fillRect(X - 1, Y - 1, hs + 2, hs + 2); c.fillStyle = PIX.P.ys5; c.fillRect(X, Y, hs, hs);
  c.fillStyle = PIX.P.w; c.fillRect(X + Math.floor((hs - cs) / 2), Y + Math.floor((hs - cs) / 2), cs, cs);
  c.restore();
};
BREATH.init = () => {};
})();
