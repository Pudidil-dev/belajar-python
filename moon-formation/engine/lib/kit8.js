// K — shared drawing kit for the scenes. Everything is a pure function of time (seeded hashes, no Math.random),
// so any frame can be rendered on its own and twice gives the same pixels.
(() => {
const { P, W, H } = PIX;
const K = window.K = {};
window.SC = window.SC || {};                       // scene registry (scene files load before film.js)
const h = U.hash, TAU = U.TAU, clamp = U.clamp, lerp = U.lerp;
K.h = h;
K.col = c => P[c] || c;
K.wrap = (v, m) => ((v % m) + m) % m;
K.step = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;           // 8-bit "on twos/threes" stepping
K.pop = (t, t0, d = 0.35) => t < t0 ? 0 : MO.backOut(clamp((t - t0) / d), 2.2);   // Kurzgesagt pop-in scale
K.inout = (t, a, b) => MO.k75(clamp((t - a) / (b - a)));
K.sm = (t, a, b) => MO.smooth(clamp((t - a) / (b - a)));

// shaded sphere: shadow crescent bottom-right, base, pixel highlight top-left
K.ball = (c, x, y, r, base, sh, hi, a = 1) => {
  if (r <= 0) return;
  const p = PIX.circPath(x, y, r);
  c.save(); c.globalAlpha *= a; c.clip(p);
  c.fillStyle = K.col(sh || base); c.fill(p);
  c.fillStyle = K.col(base); c.beginPath(); c.arc(x - r * 0.22, y - r * 0.22, r * 0.9, 0, TAU); c.fill();
  if (hi) { c.fillStyle = K.col(hi); c.beginPath(); c.arc(x - r * 0.42, y - r * 0.42, Math.max(0.7, r * 0.26), 0, TAU); c.fill(); }
  c.restore();
};
// atom presets
K.ATOM = {
  Si: ['g3', 'g2', 'g5', 'c2'], O: ['o0', 'r2', 'y1', 'o1'], C: ['g1', 'g0', 'g3', 'g2'], H: ['g5', 'g3', 'w', 'g5'],
  Cl: ['t2', 't1', 'c3', 't2'], Sn: ['g4', 'g2', 'w', 'g4'], B: ['m1', 'm0', 'p4', 'm1'], P: ['y0', 'o0', 'y1', 'y0'],
  Fe: ['r2', 'r1', 'o1', 'r2'], Al: ['g4', 'g2', 'g5', 'g4'], Cu: ['u1', 'u0', 'u2', 'u1'], Ge: ['p3', 'p2', 'p4', 'p3'],
  Hf: ['c1', 'c0', 'c3', 'c1'], Mo: ['b2', 'b1', 'c3', 'b2'], liq: ['o1', 'o0', 'y1', 'y0'],
};
K.atom = (c, x, y, r, el, a = 1, glowA = 0) => {
  const [b, s, hi, g] = K.ATOM[el] || K.ATOM.Si;
  if (glowA > 0) PIX.glow(c, x, y, r * 2.4, g, glowA);
  K.ball(c, x, y, r, b, s, hi, a);
};
K.bond = (c, x0, y0, x1, y1, col = 'g4', w = 1, a = 1) => PIX.line(c, x0, y0, x1, y1, col, w, a);

// ---------- particles ----------
// drifting motes: o = {n, seed, x, y, w, h, vx, vy, col, size, a, tw}
K.motes = (c, t, o) => {
  const n = o.n || 30, sd = o.seed || 1;
  for (let k = 0; k < n; k++) {
    const x = o.x + K.wrap(h(k, sd) * o.w + (o.vx || 0) * t * (0.6 + 0.8 * h(k, sd + 1)), o.w);
    const y = o.y + K.wrap(h(k, sd + 2) * o.h + (o.vy || 0) * t * (0.6 + 0.8 * h(k, sd + 3)), o.h);
    const tw = o.tw ? 0.5 + 0.5 * Math.sin(t * (2 + 3 * h(k, sd + 4)) + 6 * h(k, sd + 5)) : 1;
    const s = (o.size || 1) * (h(k, sd + 6) < 0.25 ? 2 : 1);
    c.save(); c.globalAlpha *= (o.a ?? 1) * tw; c.fillStyle = K.col(Array.isArray(o.col) ? o.col[k % o.col.length] : o.col || 'w');
    c.fillRect(Math.round(x), Math.round(y), s, s); c.restore();
  }
};
// sparks spraying from a point: o = {x, y, n, seed, rate, life, speed, ang, spread, g, cols, size}
K.sparks = (c, t, o) => {
  const n = o.n || 24, life = o.life || 0.8, per = n / (o.rate || 30), sd = o.seed || 3;
  const cols = o.cols || ['w', 'y1', 'y0', 'o1', 'o0', 'r2'];
  for (let k = 0; k < n; k++) {
    const age = K.wrap(t - k / (o.rate || 30) - h(k, sd) * 0.05, per);
    if (age > life * (0.5 + 0.5 * h(k, sd + 1))) continue;
    const an = (o.ang ?? -Math.PI / 2) + (h(k, sd + 2) - 0.5) * (o.spread ?? 1.4), sp = (o.speed || 60) * (0.5 + h(k, sd + 3));
    const x = o.x + Math.cos(an) * sp * age, y = o.y + Math.sin(an) * sp * age + 0.5 * (o.g ?? 120) * age * age;
    const ci = Math.min(cols.length - 1, Math.floor(age / life * cols.length));
    c.fillStyle = K.col(cols[ci]); const s = o.size || 1;
    c.fillRect(Math.round(x), Math.round(y), s, s);
    if (o.trail) { c.globalAlpha = 0.5; c.fillRect(Math.round(x - Math.cos(an) * 2), Math.round(y - Math.sin(an) * 2 - (o.g ?? 120) * age * 0.02), s, s); c.globalAlpha = 1; }
  }
};
// smoke / steam puffs rising and growing: o = {x, y, n, seed, rise, life, r0, r1, col, a, drift}
K.smoke = (c, t, o) => {
  const n = o.n || 8, life = o.life || 3, sd = o.seed || 5;
  for (let k = 0; k < n; k++) {
    const age = K.wrap(t + h(k, sd) * life, life), q = age / life;
    const x = o.x + (h(k, sd + 1) - 0.5) * (o.spread || 10) + (o.drift || 0) * age, y = o.y - (o.rise || 30) * age;
    const r = lerp(o.r0 || 3, o.r1 || 12, q), a = (o.a ?? 0.6) * Math.sin(Math.PI * Math.min(1, q * 1.3));
    PIX.circ(c, x, y, r, o.col || 'g3', a);
  }
};
// bubbles rising inside a box: o = {x, y, w, h, n, seed, speed, r, col, hi}
K.bubbles = (c, t, o) => {
  for (let k = 0; k < (o.n || 20); k++) {
    const sd = o.seed || 9, sp = (o.speed || 30) * (0.6 + 0.8 * h(k, sd));
    const yy = o.y + o.h - K.wrap(h(k, sd + 1) * o.h + sp * t, o.h);
    const xx = o.x + h(k, sd + 2) * o.w + Math.sin(t * 6 + k) * 1.2;
    const r = (o.r || 2) * (0.6 + 0.8 * h(k, sd + 3));
    PIX.circ(c, xx, yy, r, o.col || 'c2', 0.9);
    if (o.hi) PIX.rect(c, Math.round(xx - r * 0.5), Math.round(yy - r * 0.5), 1, 1, o.hi);
  }
};
// blinking indicator light
K.blink = (c, x, y, col, t, rate = 1, ph = 0, s = 1) => {
  const on = Math.sin((t * rate + ph) * TAU) > -0.2;
  PIX.rect(c, x, y, s, s, on ? col : 'g1');
  if (on) PIX.glow(c, x + s / 2, y + s / 2, 4 * s, col, 0.35);
};

// ---------- machinery ----------
// panel with Kurzgesagt facet, seams, rivets
K.panel = (c, x, y, w, h_, base = 'g2', sh = 'g1', hi = 'g3', o = {}) => {
  PIX.flat(c, PIX.rectPath(x, y, w, h_, o.r || 0), base, sh, hi, o.sv || [2, 2], o.hv || [1, 1]);
  if (o.seams) for (let k = 1; k < o.seams; k++) PIX.rect(c, x + 2, y + Math.round(h_ * k / o.seams), w - 4, 1, sh);
  if (o.rivets) for (const [rx, ry] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h_ - 3], [x + w - 3, y + h_ - 3]]) PIX.rect(c, rx, ry, 1, 1, hi);
};
// pipe along a polyline with highlight & shadow edges
K.pipe = (c, pts, w, base = 'g2', hi = 'g4', sh = 'g1') => {
  const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
  c.save(); c.lineJoin = 'round'; c.lineCap = 'butt';
  c.strokeStyle = K.col(sh); c.lineWidth = w; path(); c.stroke();
  c.strokeStyle = K.col(base); c.lineWidth = w * 0.7; c.translate(-w * 0.1, -w * 0.1); path(); c.stroke();
  c.strokeStyle = K.col(hi); c.lineWidth = Math.max(1, w * 0.18); c.translate(-w * 0.15, -w * 0.15); path(); c.stroke();
  c.restore();
};
// dots flowing along a polyline (gas, current, liquid)
K.polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
K.along = (pts, d) => {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l) { const q = l ? d / l : 0; return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; }
    d -= l;
  }
  return pts[pts.length - 1];
};
K.flow = (c, pts, t, o = {}) => {
  const L = K.polyLen(pts), gap = o.gap || 8, sp = o.speed || 30, s = o.size || 1;
  for (let d = K.wrap(t * sp, gap); d < L; d += gap) {
    const [x, y] = K.along(pts, d);
    if (o.r) PIX.circ(c, x, y, o.r, o.col || 'c2', o.a ?? 1);
    else PIX.rect(c, Math.round(x - s / 2), Math.round(y - s / 2), s, s, o.col || 'c2', o.a ?? 1);
  }
};
// rotating gear
K.gear = (c, x, y, r, teeth, ang, base = 'g3', sh = 'g1') => {
  const pts = [];
  for (let k = 0; k < teeth * 2; k++) { const a = ang + k * Math.PI / teeth, rr = k % 2 ? r * 0.78 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr], [x + Math.cos(a + Math.PI / teeth * 0.8) * rr, y + Math.sin(a + Math.PI / teeth * 0.8) * rr]); }
  PIX.flat(c, PIX.polyPath(pts), base, sh, null, [1, 1]);
  PIX.circ(c, x, y, r * 0.3, sh);
};
// simple arrow
K.arrow = (c, x0, y0, x1, y1, col = 'w', head = 3) => {
  PIX.bline(c, x0, y0, x1, y1, col);
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (const s of [-1, 1]) PIX.bline(c, x1, y1, x1 - Math.cos(a + s * 0.6) * head, y1 - Math.sin(a + s * 0.6) * head, col);
};
// heat shimmer: horizontal wobbling strokes
K.shimmer = (c, t, x, y, w, h_, col = 'y1', a = 0.25) => {
  for (let k = 0; k < 10; k++) {
    const yy = y + h(k, 31) * h_ - K.wrap(t * 20, h_) + h_ * 0, ww = 4 + h(k, 32) * 10;
    const xx = x + h(k, 33) * w + Math.sin(t * 5 + k) * 2;
    PIX.rect(c, Math.round(xx), Math.round(y + K.wrap(yy - y, h_)), Math.round(ww), 1, col, a);
  }
};

// ---------- silicon wafer, top view ----------
// o: {dies (0..1 pattern progress), iri (iridescence 0..1), notch, die (die size px), mark: fn(i,j)→colour|null}
K.wafer = (c, x, y, r, o = {}) => {
  const p = PIX.circPath(x, y, r);
  c.save(); c.clip(p);
  c.fillStyle = P.g3; c.fill(p);
  PIX.vgrad(c, x - r, y - r, 2 * r, 2 * r, [[0, 'g5'], [0.45, 'g4'], [1, 'g2']]);
  const die = o.die || Math.max(3, r / 7);
  if (o.dies) {
    const n = Math.ceil(r / die) + 1;
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const cx = x + i * die, cy = y + j * die;
      if (Math.hypot(Math.abs(cx - x) + die / 2, Math.abs(cy - y) + die / 2) > r - 1) continue;
      const k = (h(i + 50, j + 50) * 0.3 + (i + n) / (2 * n) * 0.7);
      if (k > o.dies) continue;
      const iri = o.iri ?? 1, band = K.wrap((i * 0.35 + j * 0.2) + (o.shift || 0), 3);
      const col = iri > 0.5 ? (band < 1 ? 'c1' : band < 2 ? 'p3' : 'y0') : 'g4';
      PIX.rect(c, Math.round(cx - die / 2) + 1, Math.round(cy - die / 2) + 1, Math.round(die) - 1, Math.round(die) - 1, col, 0.55 + 0.25 * iri);
      PIX.rect(c, Math.round(cx - die / 2) + 1, Math.round(cy - die / 2) + 1, Math.round(die) - 1, 1, 'g5', 0.5);
      const m = o.mark && o.mark(i, j);
      if (m) PIX.rect(c, Math.round(cx - die / 2) + 1, Math.round(cy - die / 2) + 1, Math.round(die) - 1, Math.round(die) - 1, m, 0.85);
    }
  }
  if (o.sheen !== undefined) {                              // mirror sweep highlight
    const sx = x - r * 1.6 + o.sheen * r * 3.2;
    c.save(); c.translate(sx, y); c.rotate(-0.6); PIX.rect(c, -4, -r * 2, 8, r * 4, 'w', 0.55); PIX.rect(c, 8, -r * 2, 3, r * 4, 'w', 0.35); c.restore();
  }
  c.restore();
  if (o.notch !== false) PIX.circ(c, x, y + r - 1, Math.max(1.5, r * 0.05), o.bg || 'k');   // notch
};

// ---------- industrial materials ----------
// brick courses (refractory lining) clipped to a rect
K.bricks = (c, x, y, w, h_, bw = 10, bh = 5, base = 'r1', mortar = 'r0', hi = 'r2') => {
  c.save(); c.beginPath(); c.rect(x, y, w, h_); c.clip();
  PIX.rect(c, x, y, w, h_, mortar);
  for (let r = 0, yy = y; yy < y + h_; r++, yy += bh) for (let xx = x - (r % 2) * bw / 2; xx < x + w; xx += bw) {
    PIX.rect(c, Math.round(xx) + 1, Math.round(yy) + 1, bw - 1, bh - 1, base); PIX.rect(c, Math.round(xx) + 1, Math.round(yy) + 1, bw - 1, 1, hi);
  }
  c.restore();
};
// electric arc: jagged bolt that re-rolls 15×/s, with glow
K.arc = (c, x0, y0, x1, y1, t, seed = 1, o = {}) => {
  const st = Math.floor(t * (o.fps || 15)), n = o.seg || 7, j = o.jit ?? 6;
  const pts = [[x0, y0]];
  for (let k = 1; k < n; k++) { const q = k / n; pts.push([lerp(x0, x1, q) + (h(st, seed * 31 + k) - 0.5) * 2 * j, lerp(y0, y1, q) + (h(st, seed * 17 + k) - 0.5) * j * 0.6]); }
  pts.push([x1, y1]);
  PIX.glow(c, (x0 + x1) / 2, (y0 + y1) / 2, o.glow || 22, o.glowCol || 'c2', o.ga ?? 0.55);
  c.save(); c.lineJoin = 'round';
  for (const [w, col] of [[o.w || 3, o.c1 || 'c2'], [1, o.c0 || 'w']]) { c.strokeStyle = K.col(col); c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  c.restore();
};
// flame tongues along a line
K.flames = (c, x, y, w, t, o = {}) => {
  const n = o.n || 8, sd = o.seed || 4;
  for (let k = 0; k < n; k++) {
    const fx = x + (k + 0.5) * w / n + Math.sin(t * 7 + k) * 1.5, ph = K.step(t, 12) * (3 + h(k, sd) * 2) + k;
    const fh = (o.h || 12) * (0.6 + 0.4 * Math.sin(ph) + 0.25 * h(k, sd + 1)), fw = (o.fw || 4) * (0.7 + 0.5 * h(k, sd + 2));
    const tongue = PIX.polyPath([[fx - fw, y], [fx - fw * 0.4, y - fh * 0.6], [fx + Math.sin(ph) * 2, y - fh], [fx + fw * 0.5, y - fh * 0.5], [fx + fw, y]]);
    PIX.fill(c, tongue, o.outer || 'o0', 0.9);
    PIX.fill(c, PIX.polyPath([[fx - fw * 0.5, y], [fx, y - fh * 0.55], [fx + fw * 0.5, y]]), o.inner || 'y1', 0.95);
  }
};
// molten stream along a polyline: hot core, glowing edge, travelling bright dashes
K.stream = (c, pts, w, t, o = {}) => {
  const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
  pts.forEach(([x, y], i) => i % 2 === 0 && PIX.glow(c, x, y, w * 2.6, o.glow || 'o1', 0.35));
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = K.col(o.edge || 'o0'); c.lineWidth = w; path(); c.stroke();
  c.strokeStyle = K.col(o.core || 'y1'); c.lineWidth = Math.max(1, w * 0.5); path(); c.stroke();
  c.restore();
  K.flow(c, pts, t, { gap: o.gap || 7, speed: o.speed || 90, col: 'w', size: Math.max(1, Math.round(w * 0.35)) });
};
// lumps: quartz (pale faceted), carbon (coke, dark porous), wood chip, silicon (grey metallic)
K.lump = (c, x, y, r, ang, kind = 'quartz') => {
  const sd = Math.floor(Math.abs(x * 7 + y * 13 + r * 31)) % 997, pts = [];
  const nv = kind === 'wood' ? 4 : 6;
  for (let k = 0; k < nv; k++) { const a = ang + k * TAU / nv, rr = r * (kind === 'wood' ? (k % 2 ? 0.45 : 1.15) : 0.75 + 0.3 * h(sd, k)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  const p = PIX.polyPath(pts);
  const tone = { quartz: ['s4', 's2', 'w'], carbon: ['g1', 'k', 'g2'], wood: ['s1', 's0', 's2'], silicon: ['g3', 'g1', 'g5'], hot: ['o1', 'r2', 'y1'] }[kind];
  PIX.flat(c, p, tone[0], tone[1], tone[2], [Math.max(1, r * 0.35), Math.max(1, r * 0.35)], [Math.max(0.6, r * 0.15), Math.max(0.6, r * 0.15)]);
  if (kind === 'carbon' && r > 3) { PIX.rect(c, Math.round(x - r * 0.3), Math.round(y), 1, 1, 'k'); PIX.rect(c, Math.round(x + r * 0.2), Math.round(y - r * 0.3), 1, 1, 'k'); }
};

// ---------- magnifier lens (Kurzgesagt inset): pointer from a source point, ring, clipped content drawn by fn(c, r) around (0,0) ----------
K.lens = (c, sx, sy, x, y, r, open, fn, ring = 'c2', bg = 'n0') => {
  if (open <= 0) return;
  const R = r * MO.backOut(clamp(open), 1.6);
  PIX.line(c, sx, sy, x + (sx - x) * (R / Math.hypot(sx - x, sy - y)), y + (sy - y) * (R / Math.hypot(sx - x, sy - y)), ring, 1);
  PIX.circ(c, sx, sy, 2.5, ring);
  c.save(); const p = PIX.circPath(x, y, R); c.clip(p); PIX.fill(c, p, bg);
  c.translate(x, y); fn(c, R); c.restore();
  c.save(); c.strokeStyle = K.col(ring); c.lineWidth = 2; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke(); c.restore();
  PIX.circ(c, x - R * 0.62, y - R * 0.62, Math.max(1, R * 0.06), 'w', 0.7);
};
// pixel text at a point given in the current drawing coordinates (e.g. inside a lens); PIX.text itself takes screen pixels
K.wtext = (c, s, x, y, col, opt) => { const m = c.getTransform(); PIX.text(c, s, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, col, opt); };
// small molecules (s = atom radius)
K.mol = (c, x, y, s, kind, ang = 0, a = 1) => {
  const at = (dx, dy, el, k = 1) => { const ca = Math.cos(ang), sa = Math.sin(ang); return [x + dx * ca - dy * sa, y + dx * sa + dy * ca, el, k]; };
  let parts = [];
  if (kind === 'HCl') parts = [at(-s * 0.7, 0, 'Cl', 1.1), at(s * 0.9, 0, 'H', 0.7)];
  else if (kind === 'H2') parts = [at(-s * 0.55, 0, 'H', 0.75), at(s * 0.55, 0, 'H', 0.75)];
  else if (kind === 'SiHCl3') parts = [at(0, 0, 'Si', 1.2), at(-s * 1.4, s * 0.8, 'Cl', 1), at(s * 1.4, s * 0.8, 'Cl', 1), at(0, -s * 1.5, 'Cl', 1), at(s * 0.9, -s * 0.9, 'H', 0.65)];
  else if (kind === 'CO') parts = [at(-s * 0.6, 0, 'C', 1), at(s * 0.6, 0, 'O', 1)];
  else if (kind === 'Si') parts = [at(0, 0, 'Si', 1.2)];
  for (const [px, py] of parts.slice(1)) PIX.line(c, parts[0][0], parts[0][1], px, py, 'g4', Math.max(1, s * 0.35), a);
  for (const [px, py, el, k] of parts) K.atom(c, px, py, s * k, el, a);
};

// ---------- small helpers for backgrounds ----------
K.bg = (c, top, bot, mid) => PIX.vgrad(c, 0, 0, W, H, mid ? [[0, top], [0.5, mid], [1, bot]] : [[0, top], [1, bot]]);
K.grid = (c, x, y, w, h_, s, col, a = 0.3) => { c.save(); c.globalAlpha *= a; c.fillStyle = K.col(col); for (let gx = x; gx <= x + w; gx += s) c.fillRect(Math.round(gx), y, 1, h_); for (let gy = y; gy <= y + h_; gy += s) c.fillRect(x, Math.round(gy), w, 1); c.restore(); };
})();
