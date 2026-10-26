'use strict';
// ============================================================================
// Extra glyphs, noise, splines and small shared helpers.
// Colour code (fixed for the whole film, Kurzgesagt rule: one dark ground +
// a few saturated accents, shading with a darker tint of the same hue, no
// black outlines): phage cyan / pale white, viral DNA magenta, viral mRNA
// pink, bacterium green / teal, bacterial DNA yellow, ribosomes purple, tail
// parts white / silver, fiber parts orange, lysis orange / red.
// ============================================================================
function addGlyph(f, ch, def) {
  const rows = def.split('/');
  f.g[ch] = { w: rows[0].length, bits: rows.map(r => { let v = 0; for (let i = 0; i < r.length; i++) if (r[i] === '#') v |= 1 << i; return v; }) };
}
addGlyph(FT, 'P', '####./#...#/#...#/#...#/####./#..../#..../#..../#....');
addGlyph(FT, 'U', '#...#/#...#/#...#/#...#/#...#/#...#/#...#/#...#/.###.');
addGlyph(FT, 'G', '.###./#...#/#..../#..../#.###/#...#/#...#/#...#/.###.');
addGlyph(FT, 'F', '#####/#..../#..../#..../####./#..../#..../#..../#....');
addGlyph(FL, 'm', '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#');      // lowercase m (mRNA)
addGlyph(FM, 'm', '...../##.#./#.#.#/#.#.#/#.#.#');
addGlyph(FL, '~', '..../..../.#.#/#.#./..../..../....');
addGlyph(FM, '~', '..../.#.#/#.#./..../....');
addGlyph(FM, '=', '.../###/.../###/...');
addGlyph(FL, 'x', '..../..../#..#/.##./.##./#..#/....');          // multiplication sign
addGlyph(FM, 'x', '.../#.#/.#./#.#/...');
// 2-D value noise in [0,1)
function vn2(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash3(i, j, s), b = hash3(i + 1, j, s), c = hash3(i, j + 1, s), d = hash3(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Catmull-Rom spline through control points -> dense flat polyline (open or closed)
function spline(pts, n, closed) {
  const m = pts.length / 2, out = [];
  const P_ = i => closed ? ((i % m) + m) % m : clamp(i, 0, m - 1);
  const segs = closed ? m : m - 1;
  for (let i = 0; i < segs; i++) {
    const a = P_(i - 1), b = P_(i), c = P_(i + 1), d = P_(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      for (let q = 0; q < 2; q++) {
        const p0 = pts[2 * a + q], p1 = pts[2 * b + q], p2 = pts[2 * c + q], p3 = pts[2 * d + q];
        out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
    }
  }
  if (!closed) out.push(pts[2 * (m - 1)], pts[2 * (m - 1) + 1]);
  return out;
}
// periodic wobble: every environmental motion repeats exactly every 72 s (seamless loop)
const LOOPW = k => TAU * k / DUR;
function wob(t, k, ph) { return Math.sin(LOOPW(k) * t + ph); }
// UI switch (renders a scene without its captions)
let UI_ON = true;
// Kurzgesagt pop: ~90% at 0.25 s, ~108% overshoot, settles by 0.5 s
const pop = (t, t0, d) => t < t0 ? 0 : backOut(clamp((t - t0) / (d || 0.5), 0, 1), 1.1);
function pulse(t, t0, d) { return t < t0 ? 0 : Math.max(0, 1 - (t - t0) / d); }
// 2-bone IK: knee position for a limb from (bx,by) to (tx,ty) with segment lengths L1, L2; side = +1/-1 bends the knee
function ik(bx, by, tx, ty, L1, L2, side) {
  let dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1e-6;
  const dm = Math.min(d, L1 + L2 - 1e-3), dn = Math.max(dm, Math.abs(L1 - L2) + 1e-3);
  const a = (L1 * L1 - L2 * L2 + dn * dn) / (2 * dn), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const ux = dx / d, uy = dy / d;
  return [bx + ux * a - uy * h * side, by + uy * a + ux * h * side];
}
