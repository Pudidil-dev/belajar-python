// PIX — the 8-bit pixel pipeline (shared with the earlier films in this repo; the palette is this film's).
// Every frame is drawn on a 270×480 canvas, quantized to one fixed palette with 4×4 ordered (Bayer) dithering,
// then upscaled 4× with nearest-neighbour by ffmpeg → 1080×1920. Scenes draw with the normal Canvas API under a
// camera transform (so zooms are re-rasterized, never bitmap-scaled); the quantizer removes anti-aliasing and turns
// gradients and glows into dithered bands. Text is a hand-made bitmap font drawn pixel by pixel.
(() => {
const W = 270, H = 480;
U.setStage(W, H);

// ---------- palette: deep navy backgrounds (hue 216–222°, below the 225° band the skill's gate counts as
// blue/purple); a neutral gray ramp for the ultrasound image and the machine; cyan for electrical signals; white and
// pale yellow for the transmitted sound pulse, amber for echoes; skin, fat, muscle, uterus/fetus pinks, amniotic fluid
// teal and coupling-gel light cyan for the body; scrub green for the room. ----------
const P = window.P = {
  k: '#05080f', n0: '#0a1222', n1: '#0f1a30', n2: '#16243f', n3: '#203352', n4: '#2d4568',             // navy
  g0: '#0e1014', g1: '#181b20', g2: '#24282e', g3: '#32363d', g4: '#43484f', g5: '#575c63', g6: '#6e737a',
  g7: '#878b91', g8: '#a1a5aa', g9: '#bbbec2', ga: '#d4d6d9', gb: '#eaebed', w: '#ffffff',             // gray / image / hardware
  c0: '#062633', c1: '#0b5f78', c2: '#1aa6c9', c3: '#3fdcff', c4: '#a6f2ff', c5: '#e0fcff',             // electrical signal
  y0: '#3a2606', y1: '#86580e', y2: '#d89a22', y3: '#ffcc3d', y4: '#fff0a8',                           // echoes (amber)
  s0: '#3a1f17', s1: '#7a4433', s2: '#c27a5c', s3: '#e8a882', s4: '#f6d2b8',                           // skin
  f0: '#4a3a12', f1: '#b89a46', f2: '#f0d890',                                                         // fat
  r0: '#3a0c0e', r1: '#8a2026', r2: '#d8484a', r3: '#ff8a7a',                                          // muscle, placenta
  p0: '#3e1424', p1: '#8e3450', p2: '#e07a90', p3: '#ffc2cc',                                          // uterus, fetus
  t0: '#031a20', t1: '#0a3640', t2: '#145c6c', t3: '#2a8a9a',                                          // amniotic fluid
  l0: '#0e3c4c', l1: '#3c8ca2', l2: '#a4e0ee',                                                         // coupling gel
  e0: '#082e16', e1: '#127a36', e2: '#30d066', e3: '#a4ffbe',                                          // monitor UI green
  h0: '#0f2e2a', h1: '#1f5a50', h2: '#3f8e7e', h3: '#8ed0c0',                                          // scrubs, sheet
  b2: '#2f86ff',                                                                                     // electric blue accent
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL = Object.values(P).map(hex);
const rgba = (h, a = 1) => { const [r, g, b] = hex(P[h] || h); return `rgba(${r},${g},${b},${a})`; };

// ---------- quantizer: 32³ lookup of nearest palette colour (red-mean distance) ----------
const LUT = new Uint8Array(32768), DIST = new Float32Array(32768);
for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
  const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
  let best = 0, bd = 1e9;
  for (let i = 0; i < PAL.length; i++) {
    const [pr, pg, pb] = PAL[i], rm = (R + pr) / 2, dr = R - pr, dg = G - pg, db = B - pb;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  const k = r << 10 | g << 5 | b; LUT[k] = best; DIST[k] = Math.sqrt(bd);
}
// a flat fill in an exact palette colour always snaps to that colour (its bin centre can sit > keep away from it)
PAL.forEach(([r, g, b], i) => { const k = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3); LUT[k] = i; DIST[k] = 0; });
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const cl = v => v < 0 ? 0 : v > 255 ? 255 : v;
// Colours already within `keep` of a palette entry snap without dither (flat fills stay clean);
// everything in between (gradients, glows, anti-aliased edges, alpha) is ordered-dithered.
function quantize(ctx, amp = 30, keep = 9) {
  const im = ctx.getImageData(0, 0, W, H), d = im.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let k = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    if (DIST[k] > keep) {
      const o = BAYER[(y & 3) << 2 | (x & 3)] * amp;
      k = (cl(r + o) >> 3) << 10 | (cl(g + o) >> 3) << 5 | (cl(b + o) >> 3);
    }
    const p = PAL[LUT[k]]; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

// ---------- bitmap font: caps 7 rows, lowercase x-height 5, descenders to row 8 ----------
const G = {};
const def = (ch, rows, top = 0) => { G[ch] = { rows: rows.split('/'), top }; };
// capitals
def('A', '.###./#...#/#...#/#####/#...#/#...#/#...#'); def('B', '####./#...#/#...#/####./#...#/#...#/####.');
def('C', '.###./#...#/#..../#..../#..../#...#/.###.'); def('D', '####./#...#/#...#/#...#/#...#/#...#/####.');
def('E', '#####/#..../#..../####./#..../#..../#####'); def('F', '#####/#..../#..../####./#..../#..../#....');
def('G', '.###./#...#/#..../#.###/#...#/#...#/.####'); def('H', '#...#/#...#/#...#/#####/#...#/#...#/#...#');
def('I', '###/.#./.#./.#./.#./.#./###'); def('J', '..##/...#/...#/...#/#..#/#..#/.##.');
def('K', '#...#/#..#./#.#../##.../#.#../#..#./#...#'); def('L', '#.../#.../#.../#.../#.../#.../####');
def('M', '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#'); def('N', '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#');
def('O', '.###./#...#/#...#/#...#/#...#/#...#/.###.'); def('P', '####./#...#/#...#/####./#..../#..../#....');
def('Q', '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#'); def('R', '####./#...#/#...#/####./#.#../#..#./#...#');
def('S', '.####/#..../#..../.###./....#/....#/####.'); def('T', '#####/..#../..#../..#../..#../..#../..#..');
def('U', '#...#/#...#/#...#/#...#/#...#/#...#/.###.'); def('V', '#...#/#...#/#...#/#...#/#...#/.#.#./..#..');
def('W', '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.'); def('X', '#...#/#...#/.#.#./..#../.#.#./#...#/#...#');
def('Y', '#...#/#...#/.#.#./..#../..#../..#../..#..'); def('Z', '#####/....#/...#./..#../.#.../#..../#####');
// digits
def('0', '.###./#...#/#..##/#.#.#/##..#/#...#/.###.'); def('1', '..#../.##../..#../..#../..#../..#../.###.');
def('2', '.###./#...#/....#/...#./..#../.#.../#####'); def('3', '####./....#/....#/.###./....#/....#/####.');
def('4', '...#./..##./.#.#./#..#./#####/...#./...#.'); def('5', '#####/#..../####./....#/....#/#...#/.###.');
def('6', '.###./#..../#..../####./#...#/#...#/.###.'); def('7', '#####/....#/...#./..#../.#.../.#.../.#...');
def('8', '.###./#...#/#...#/.###./#...#/#...#/.###.'); def('9', '.###./#...#/#...#/.####/....#/....#/.###.');
// lowercase (top = first row index)
def('a', '.###./....#/.####/#...#/.####', 2); def('b', '#..../#..../####./#...#/#...#/#...#/####.');
def('c', '.###/#.../#.../#.../.###', 2); def('d', '....#/....#/.####/#...#/#...#/#...#/.####');
def('e', '.###./#...#/#####/#..../.###.', 2); def('f', '..##/.#../####/.#../.#../.#../.#..');
def('g', '.####/#...#/#...#/#...#/.####/....#/.###.', 2); def('h', '#..../#..../####./#...#/#...#/#...#/#...#');
def('i', '#/./#/#/#/#/#'); def('j', '..#/.../..#/..#/..#/..#/..#/#.#/.#.');
def('k', '#.../#.../#..#/#.#./##../#.#./#..#'); def('l', '#./#./#./#./#./#./.#');
def('m', '##.#./#.#.#/#.#.#/#.#.#/#.#.#', 2); def('n', '####./#...#/#...#/#...#/#...#', 2);
def('o', '.###./#...#/#...#/#...#/.###.', 2); def('p', '####./#...#/#...#/#...#/####./#..../#....', 2);
def('q', '.####/#...#/#...#/#...#/.####/....#/....#', 2); def('r', '#.##/##../#.../#.../#...', 2);
def('s', '.###/#.../.##./...#/###.', 2); def('t', '.#../.#../####/.#../.#../.#../..##');
def('u', '#...#/#...#/#...#/#...#/.####', 2); def('v', '#...#/#...#/#...#/.#.#./..#..', 2);
def('w', '#...#/#...#/#.#.#/#.#.#/.#.#.', 2); def('x', '#...#/.#.#./..#../.#.#./#...#', 2);
def('y', '#...#/#...#/#...#/#...#/.####/....#/.###.', 2); def('z', '#####/...#./..#../.#.../#####', 2);
// punctuation & symbols
def('.', '#', 6); def(',', '.#/#.', 6); def(':', '#/./././#', 2); def(';', '.#/../../.#/#.', 2);
def('!', '#/#/#/#/#/./#'); def('?', '.###./#...#/....#/...#./..#../...../..#..');
def('-', '###', 3); def('+', '..#../..#../#####/..#../..#..', 1); def('=', '####/..../####', 2);
def('/', '....#/...#./..#../.#.../#....', 1); def('(', '.#/#./#./#./#./#./.#'); def(')', '#./.#/.#/.#/.#/.#/#.');
def('[', '##/#./#./#./#./#./##'); def(']', '##/.#/.#/.#/.#/.#/##');
def('<', '...#/..#./.#../..#./...#', 1); def('>', '#.../.#../..#./.#../#...', 1);
def('%', '##.../##..#/...#./..#../.#.../#..##/...##'); def('°', '.#./#.#/.#.'); def("'", '#/#');
def('µ', '#..#/#..#/#..#/#..#/###./#.../#...', 2); def('×', '#.#/.#./#.#', 3);
def('→', '...#../....#./######/....#./...#..', 1); def('←', '..#.../.#..../######/.#..../..#...', 1);
def('↑', '..#../.###./#.#.#/..#../..#../..#../..#..'); def('↓', '..#../..#../..#../..#../#.#.#/.###./..#..');
def('~', '.##.#/#..#.', 3); def('^', '.#./#.#', 0); def('·', '#', 3); def('λ', '##.../..#../..#../.#.#./.#.#./#...#/#...#');
def('≈', '.##.#/#..#./...../.##.#/#..#.', 1); def('<', '...#/..#./.#../..#./...#', 1); def('_', '#####', 7);
def('α', '.##.#/#..#./#..#./#..#./.##.#', 2); def('β', '.##./#..#/###./#..#/#..#/###./#...');
def('γ', '#...#/.#.#./.#.#./..#../.#.#./.#.#./..#..', 2); def('Δ', '..#../..#../.#.#./.#.#./#...#/#...#/#####');
def('"', '#.#/#.#'); def('&', '.##../#..#./.##../.##.#/#..#./#..#./.##.#'); def('#', '.#.#./#####/.#.#./#####/.#.#.', 1);
def('±', '..#../..#../#####/..#../..#../...../#####'); def('|', '#/#/#/#/#/#/#'); def('–', '####', 3);
def('⟩', '#../.#./.#./..#/.#./.#./#..'); def('⟨', '..#/.#./.#./#../.#./.#./..#'); G['∣'] = G['|'];
def('√', '...##/...#./...#./#..#./.#.#./.#.#./..#..'); def('ψ', '#.#.#/#.#.#/#.#.#/.###./..#../..#../..#..');
def('φ', '..#../.###./#.#.#/#.#.#/.###./..#../..#..'); def('θ', '.###./#...#/#...#/#####/#...#/#...#/.###.');
def('π', '#####/.#.#./.#.#./.#.#./.#..#', 2); def('Φ', '..#../.###./#.#.#/#.#.#/#.#.#/.###./..#..');
def('ω', '#.....#/#..#..#/#..#..#/#..#..#/.##.##.', 2); def('∝', '.#.##/#.#../#.#../.#.##', 2); def('⊕', '.###./#.#.#/#####/#.#.#/.###.', 1);
// mini digits for sub/superscripts (3×5)
const MINI = { 0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '###/..#/###/#../###', 3: '###/..#/###/..#/###',
  4: '#.#/#.#/###/..#/..#', 5: '###/#../###/..#/###', 6: '###/#../###/#.#/###', 7: '###/..#/..#/..#/..#',
  8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/###', '+': '.#./###/.#.', '-': '###' };
'₀₁₂₃₄₅₆₇₈₉'.split('').forEach((ch, i) => def(ch, MINI[i], 4));
def('⁺', MINI['+'], 0); def('⁻', MINI['-'], 1);
'⁰¹²³⁴⁵⁶⁷⁸⁹'.split('').forEach((ch, i) => def(ch, MINI[i], -1));
G['−'] = G['-'];                                                    // the minus sign draws like a hyphen
const gw = ch => ch === ' ' ? 3 : G[ch] ? Math.max(...G[ch].rows.map(r => r.length)) : 4;
const textWidth = (s, sc = 1) => { let w = 0; for (const ch of s) w += (gw(ch) + 1) * sc; return Math.max(0, w - sc); };
// Draw text with its cap-top at (x, y), in screen pixels. opt: {sc, shadow (palette key or null), align, n (chars shown)}
function text(c, s, x, y, col = 'w', opt = {}) {
  const sc = opt.sc || 1, n = opt.n ?? s.length;
  let X = Math.round(opt.align === 'center' ? x - textWidth(s, sc) / 2 : opt.align === 'right' ? x - textWidth(s, sc) : x);
  const Y = Math.round(y);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const chars = [...s].slice(0, n);
  const pass = (dx, dy, fill) => {
    c.fillStyle = P[fill] || fill; let xx = X;
    for (const ch of chars) {
      const g = G[ch];
      if (g) g.rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') c.fillRect(xx + rx * sc + dx, Y + (g.top + ry) * sc + dy, sc, sc); });
      xx += (gw(ch) + 1) * sc;
    }
  };
  if (opt.shadow !== null) pass(sc, sc, opt.shadow || 'k');
  pass(0, 0, col);
  c.restore();
}

// ---------- crisp screen-space primitives ----------
const px = (c, x, y, col) => { c.fillStyle = P[col] || col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
let badLine = false;
function bline(c, x0, y0, x1, y1, col, dash = 0) {               // Bresenham, screen pixels
  if (!(Number.isFinite(x0) && Number.isFinite(y0) && Number.isFinite(x1) && Number.isFinite(y1))) { if (!badLine) { badLine = true; console.error('bline: non-finite coordinates ' + [x0, y0, x1, y1].join(',') + ' ' + new Error().stack.split('\n').slice(2, 5).join(' | ')); } return; }
  if (Math.abs(x1 - x0) + Math.abs(y1 - y0) > 20000) { if (!badLine) { badLine = true; console.log('bline: huge line ' + [x0, y0, x1, y1].map(v => v.toFixed(0)).join(',') + ' ' + new Error().stack.split('\n').slice(2, 6).join(' | ')); } return; }
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col] || col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0;
  for (;;) {
    if (!dash || (n >> dash) % 2 === 0) c.fillRect(x0, y0, 1, 1);
    n++; if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
  }
  c.restore();
}

// ---------- camera: integer-snapped translation so static shots sit on the pixel grid ----------
function cam(c, k) {
  const z = k.z ?? 1, x = k.x ?? W / 2, y = k.y ?? H / 2;
  if (k.r) { c.setTransform(1, 0, 0, 1, W / 2, H / 2); c.rotate(k.r); c.scale(z, z); c.translate(-x, -y); return; }
  c.setTransform(z, 0, 0, z, Math.round(W / 2 - z * x), Math.round(H / 2 - z * y));
}
// parallax layer: d<1 far, d>1 near (position ∝ d, scale ∝ z^d — deep pushes barely move the far layers)
function layer(c, k, d, fn) {
  const z = Math.pow(k.z ?? 1, d), x = U.lerp(W / 2, k.x ?? W / 2, d), y = U.lerp(H / 2, k.y ?? H / 2, d);
  c.save(); cam(c, { x, y, z, r: k.r ? k.r * d : 0 }); fn(c, z); c.restore();
}
const toScreen = (k, x, y) => [W / 2 + (x - (k.x ?? W / 2)) * (k.z ?? 1), H / 2 + (y - (k.y ?? H / 2)) * (k.z ?? 1)];

// ---------- flat-shaded shapes (Kurzgesagt two-tone facet: shadow band bottom-right, thin highlight top-left) ----------
function flat(c, path, base, shadow, hi, sv = [2, 2], hv = [1, 1]) {
  c.save(); c.clip(path);
  c.fillStyle = P[hi] || hi || P[base] || base; c.fill(path);
  if (hi) { c.save(); c.translate(hv[0], hv[1]); c.fillStyle = P[base] || base; c.fill(path); c.restore(); }
  else { c.fillStyle = P[base] || base; c.fill(path); }
  if (shadow) {
    const m = new Path2D(); m.rect(-1e4, -1e4, 2e4, 2e4);
    const inner = new Path2D(); inner.addPath(path, new DOMMatrix([1, 0, 0, 1, -sv[0], -sv[1]]));
    m.addPath(inner); c.fillStyle = P[shadow] || shadow; c.fill(m, 'evenodd');
  }
  c.restore();
}
const rectPath = (x, y, w, h, r = 0) => { const p = new Path2D(); if (r > 0 && p.roundRect) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h); return p; };
const circPath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.01, r), 0, U.TAU); return p; };
const polyPath = pts => U.poly(pts, true);
const fill = (c, path, col, a = 1) => { c.save(); c.globalAlpha *= a; c.fillStyle = P[col] || col; c.fill(path); c.restore(); };
const rect = (c, x, y, w, h, col, a = 1) => { c.save(); c.globalAlpha *= a; c.fillStyle = P[col] || col; c.fillRect(x, y, w, h); c.restore(); };
const circ = (c, x, y, r, col, a = 1) => fill(c, circPath(x, y, r), col, a);
const line = (c, x0, y0, x1, y1, col, w = 1, a = 1) => { c.save(); c.globalAlpha *= a; c.strokeStyle = P[col] || col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.restore(); };
// radial glow (dithers into bands after quantization)
function glow(c, x, y, r, col, a = 0.8, core = 0) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, r * core, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(0.45, rgba(col, a * 0.45)); g.addColorStop(1, rgba(col, 0));
  c.save(); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, U.TAU); c.fill(); c.restore();
}
// vertical gradient band (background skies, heat) — becomes dithered bands
function vgrad(c, x, y, w, h, stops) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([o, col, a = 1]) => g.addColorStop(o, rgba(col, a)));
  c.save(); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
}

// ---------- Kurzgesagt label: leader line grows, text types at ~40 chars/s, holds, erases ----------
// o: {ax, ay} anchor (screen px), {tx, ty} text cap-top position, t = local time, t0 start, t1 end,
//    col, lineCol, align ('left'|'right'|'center'), sc (font scale), dot (bool)
// Labels type on at RATE characters/s (after a 0.12 s lead-in for the leader line), hold, and leave with a short
// dithered fade at t1 (FADE s) — never by un-typing, which erased long lines before anyone could read them.
const RATE = 60, FADE = 0.25;
function label(c, o, t) {
  const t0 = o.t0 ?? 0, t1 = o.t1 ?? 1e9;
  if (t < t0 || t > t1 + FADE) return;
  const grow = MO.cubicOut(U.clamp((t - t0) / 0.22)), sc = o.sc || 1, len = [...o.text].length;
  const n = U.clamp(Math.floor((t - t0 - 0.12) * (o.rate || RATE)), 0, len), a = t <= t1 ? 1 : U.clamp(1 - (t - t1) / FADE);
  const lc = o.lineCol || 'g6';
  c.save(); c.globalAlpha *= a;
  if (o.ax != null) {
    // the leader stops at the edge of the text box nearest its anchor (it never runs through the words)
    const w = textWidth(o.text) * sc, x0 = o.align === 'right' ? o.tx - w : o.align === 'center' ? o.tx - w / 2 : o.tx, x1 = x0 + w;
    const yT = o.ty - 2, yB = o.ty + 8 * sc;
    let ex, ey;
    if (o.lx != null) { ex = o.lx; ey = o.ly ?? (o.ty + 3 * sc); }
    else if (o.ax < x0 - 2) { ex = x0 - 3; ey = o.ty + 3 * sc; }
    else if (o.ax > x1 + 2) { ex = x1 + 3; ey = o.ty + 3 * sc; }
    else { ex = U.clamp(o.ax, x0, x1); ey = o.ay < o.ty ? yT - 1 : yB + 1; }
    bline(c, o.ax, o.ay, U.lerp(o.ax, ex, grow), U.lerp(o.ay, ey, grow), lc);
    if (o.dot !== false) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[lc]; c.fillRect(Math.round(o.ax) - 1, Math.round(o.ay) - 1, 2, 2); c.restore(); }
  }
  if (n > 0) text(c, o.text, o.tx, o.ty, o.col || 'w', { n, align: o.align, sc, shadow: o.shadow });
  c.restore();
}

window.PIX = { W, H, P, PAL, rgba, hex, quantize, text, textWidth, px, bline, cam, layer, toScreen, flat, rectPath, circPath, polyPath, fill, rect, circ, line, glow, vgrad, label, BAYER, RATE, FADE };
window.CAP_RATE = RATE;
})();
