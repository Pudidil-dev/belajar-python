// PIX — the 16-bit pixel pipeline (shared with the earlier films in this repo; the palette is this film's).
// Every frame is drawn on a 270×480 canvas, quantized to one fixed palette with 4×4 ordered (Bayer) dithering,
// then upscaled exactly 4× with nearest-neighbour by ffmpeg → 1080×1920 (one art pixel = 4×4 screen pixels). Scenes draw with the normal Canvas API under a
// camera transform (so zooms are re-rasterized, never bitmap-scaled); the quantizer removes anti-aliasing and turns
// gradients and glows into dithered bands. Text is a hand-made bitmap font drawn pixel by pixel.
(() => {
const W = 270, H = 480;
U.setStage(W, H);

// ---------- palette: hue-shifted ramps, built the codixel way (P.hueRamp): along each ramp the hue leans toward blue in the
// shadows and toward yellow in the lights, and saturation is highest in the middle. Ramp `name` with n steps gives the keys
// name0 (darkest) … name{n-1} (lightest); RAMP[name] lists them. The colour code is the brief's: dark navy background, a
// light grey / white ventilator, steel mechanics, inspiratory gas cyan trails, expiratory gas muted amber, O2 cyan-blue,
// CO2 small amber, electrical signals bright yellow, blood dark to brighter red (never blue), airway walls pink / coral,
// alveoli soft pink. The navy stays below the 225° hue band that the skill's gate counts as blue/purple.
const hslHex = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 60;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};
const hueRamp = (n, o = {}) => {
  const hue = o.hue ?? 110, shift = o.shift ?? 60, sat = o.sat ?? 0.55, drop = o.satDrop ?? 0.35, [l0, l1] = o.light ?? [0.12, 0.62];
  const toward = (h, target, amt) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
  return Array.from({ length: n }, (_, i) => { const t = n > 1 ? i / (n - 1) : 0.5, e = Math.abs(2 * t - 1); return hslHex(toward(hue, t < 0.5 ? 240 : 60, shift * e), sat * (1 - drop * e), l0 + (l1 - l0) * t); });
};
const P = window.P = { k: '#05080f', n0: '#0a1222', n1: '#0f1a30', n2: '#16243f', n3: '#203352', n4: '#2d4568', n5: '#3e5a82', w: '#ffffff' };
const RAMP = {};
const defRamp = (name, n, o) => { RAMP[name] = []; hueRamp(n, o).forEach((c, i) => { P[name + i] = c; RAMP[name].push(name + i); }); };
defRamp('g', 10, { hue: 212, shift: 22, sat: 0.07, satDrop: 0, light: [0.06, 0.9] });      // steel / graphite / greys
defRamp('vt', 6, { hue: 208, shift: 10, sat: 0.08, satDrop: 0, light: [0.42, 0.95] });     // ventilator body (light grey to white)
defRamp('cy', 6, { hue: 184, shift: 10, sat: 0.85, light: [0.22, 0.86] });                // inspiratory gas trails (cyan)
defRamp('am', 6, { hue: 36, shift: 14, sat: 0.6, light: [0.2, 0.74] });                   // expiratory gas trails (muted amber)
defRamp('o2', 6, { hue: 200, shift: 10, sat: 0.8, light: [0.22, 0.82] });                 // O2 molecules (cyan-blue)
defRamp('co', 6, { hue: 34, shift: 14, sat: 0.85, light: [0.2, 0.78] });                  // CO2 molecules (amber)
defRamp('ys', 6, { hue: 52, shift: 10, sat: 0.95, light: [0.25, 0.9] });                  // electrical signals (bright yellow)
defRamp('vb', 6, { hue: 350, shift: 16, sat: 0.6, light: [0.08, 0.42] });                 // blood, dark
defRamp('ab', 6, { hue: 358, shift: 18, sat: 0.74, light: [0.16, 0.62] });                // blood, brighter red
defRamp('rc', 7, { hue: 356, shift: 20, sat: 0.62, light: [0.15, 0.68] });                // red blood cells
defRamp('pl', 5, { hue: 14, shift: 18, sat: 0.34, light: [0.07, 0.32] });                 // plasma field
defRamp('aw', 7, { hue: 8, shift: 18, sat: 0.55, light: [0.16, 0.8] });                   // airway walls (pink / coral)
defRamp('al', 6, { hue: 352, shift: 14, sat: 0.45, light: [0.26, 0.88] });                // alveoli and lung tissue (soft pink)
defRamp('sk', 6, { hue: 22, shift: 22, sat: 0.34, light: [0.2, 0.76] });                  // skin
defRamp('hr', 7, { hue: 356, shift: 20, sat: 0.42, satDrop: 0.3, light: [0.12, 0.66] });   // heart (muted rose)
defRamp('iv', 6, { hue: 45, shift: 14, sat: 0.13, light: [0.32, 0.93] });                 // bone, membranes, plastic (ivory)
defRamp('tw', 5, { hue: 192, shift: 14, sat: 0.2, light: [0.38, 0.9] });                  // clear tubing and housings
defRamp('dr', 6, { hue: 182, shift: 16, sat: 0.24, light: [0.09, 0.52] });                // sheet and pillow (desaturated teal)
defRamp('wa', 6, { hue: 205, shift: 12, sat: 0.6, light: [0.16, 0.7] });                  // water
defRamp('ht', 6, { hue: 16, shift: 16, sat: 0.85, light: [0.2, 0.7] });                   // heat (heater plate)
defRamp('pc', 6, { hue: 150, shift: 14, sat: 0.42, light: [0.07, 0.4] });                 // circuit board
defRamp('hm', 6, { hue: 44, shift: 18, sat: 0.78, light: [0.2, 0.8] });                   // heme (gold), copper traces
defRamp('hb', 7, { hue: 6, shift: 16, sat: 0.36, light: [0.18, 0.8] });                   // hemoglobin (dusty coral)
defRamp('mt', 5, { hue: 150, shift: 14, sat: 0.55, light: [0.25, 0.85] });                // monitor flow trace (green)
window.RAMP = RAMP;
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
def('±', '..#../..#../#####/..#../..#../...../#####'); def('÷', '..#../...../#####/...../..#..', 1); def('|', '#/#/#/#/#/#/#'); def('–', '####', 3);
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

// Azerbaijani letters (the context labels are in Azerbaijani): accents sit above the cap line (rows −2…−1; Ğ's breve
// −3…−2), cedillas hang below it (rows 7–8). Capitals: Ə Ğ İ I Ö Ü Ş Ç; small: ə ğ ı i ö ü ş ç.
def('Ə', '.###./#...#/....#/#####/#...#/#...#/.###.'); def('ə', '.###./....#/#####/#...#/.###.', 2);
def('Ö', '.#.#./...../.###./#...#/#...#/#...#/#...#/#...#/.###.', -2); def('Ü', '.#.#./...../#...#/#...#/#...#/#...#/#...#/#...#/.###.', -2);
def('İ', '.#./.../###/.#./.#./.#./.#./.#./###', -2); def('Ğ', '#...#/.###./...../.###./#...#/#..../#.###/#...#/#...#/.####', -3);
def('Ş', '.####/#..../#..../.###./....#/....#/####./..#../.##..'); def('Ç', '.###./#...#/#..../#..../#..../#...#/.###./..#../.##..');
def('ö', '.#.#./...../.###./#...#/#...#/#...#/.###.'); def('ü', '.#.#./...../#...#/#...#/#...#/#...#/.####');
def('ı', '#/#/#/#/#', 2); def('ğ', '#...#/.###./.####/#...#/#...#/#...#/.####/....#/.###.');
def('ş', '.###/#.../.##./...#/###./.#../##..', 2); def('ç', '.###/#.../#.../#.../.###/.#../##..', 2);
def('—', '#####', 3); def('•', '.#./###/.#.', 2);
G['−'] = G['-'];                                                    // the minus sign draws like a hyphen
G['μ'] = G['µ'];                                                    // Greek mu (U+03BC) draws like the micro sign (U+00B5)
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

// codixel P.band: v (0..1) → one of n ramp steps; each step is a flat band, and only a thin strip (strip × band width,
// centred on each boundary) is mixed with the ordered dither
const BT = (x, y) => BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
const band = (v, n, x, y, strip = 1 / 3) => { const f = Math.max(0, Math.min(1, v)) * (n - 1), k = Math.floor(f), fr = f - k; return Math.min(n - 1, k + (BT(x, y) < Math.max(0, Math.min(1, (fr - 0.5) / strip + 0.5)) ? 1 : 0)); };
// palette-aware dimming: every pixel moves k steps down its own ramp (no screen-door dither; codixel: dither only at band
// edges). Pixels that are not palette colours are scaled down instead.
const DOWN = {};
const chains = Object.values(RAMP).concat([['k', 'n0', 'n1', 'n2', 'n3', 'n4', 'n5'], ['g7', 'g8', 'w']]);
for (const ch of chains) ch.forEach((key, i) => { const [r, g, b] = hex(P[key]), id = r << 16 | g << 8 | b; DOWN[id] = DOWN[id] || []; for (let k = 1; k <= 3; k++) DOWN[id][k] = hex(P[ch[Math.max(0, i - k)]]); });
function dim(c, k = 2, box = [0, 0, W, H], keep = null) {
  const [x0, y0, x1, y1] = box.map(Math.round), img = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, bw = x1 - x0;
  for (let y = y0, i = 0; y < y1; y++) for (let x = x0; x < x1; x++, i += 4) {
    if (keep && keep(x, y)) continue;
    const id = d[i] << 16 | d[i + 1] << 8 | d[i + 2], dn = DOWN[id];
    if (dn) { const q = dn[k]; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; } else { d[i] *= 0.6; d[i + 1] *= 0.6; d[i + 2] *= 0.62; }
  }
  c.putImageData(img, x0, y0);
}
window.PIX = { W, H, P, PAL, rgba, hex, quantize, band, BT, RAMP, hueRamp, dim, text, textWidth, px, bline, cam, layer, toScreen, flat, rectPath, circPath, polyPath, fill, rect, circ, line, glow, vgrad, label, BAYER, RATE, FADE };
window.CAP_RATE = RATE;
})();
