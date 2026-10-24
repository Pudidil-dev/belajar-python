'use strict';
// ============================================================================
// PET palette (extends P), extra glyphs, noise, splines.
// Tissue crimson/pink, tracer cyan with an orange F-18 marker, protons red,
// neutrons orange, positron magenta, electron electric blue, gamma gold,
// scintillation crystal translucent cyan, scintillation light blue-white,
// electrical signal neon green, detector parts metallic grey, PET heatmap
// blue -> green -> yellow -> red, background deep navy (flat, no gradients).
// Shading follows the Kurzgesagt rule: no black outlines - darker same hue.
// ============================================================================
for (const [k, v] of Object.entries({
  TI0: '#24060F', TI1: '#4A0E22', TI2: '#781A38', TI3: '#A83054', TI4: '#E0708F',
  TR0: '#07323D', TR1: '#0F6E80', TR2: '#2BD0E6', TR3: '#B3F5FF',
  FO0: '#5A2200', FO1: '#C2560E', FO2: '#FF8C1F', FO3: '#FFCB8A',
  PR0: '#4A0C0C', PR1: '#9E1E1E', PR2: '#E8432F', PR3: '#FF9A82',
  NE0: '#4A2A0C', NE1: '#9E5A1C', NE2: '#E0922E', NE3: '#FFD08A',
  PO0: '#40062F', PO1: '#9E137A', PO2: '#FF36C4', PO3: '#FFB6EA',
  EL0: '#072045', EL1: '#1456C4', EL2: '#3B8CFF', EL3: '#BBD8FF',
  GA0: '#443000', GA1: '#A87400', GA2: '#FFC21C', GA3: '#FFF1A6',
  CR0: '#0A3540', CR1: '#1A6878', CR2: '#46BCD0', CR3: '#B2EEF7',
  SL0: '#3A5A8A', SL1: '#9CC6FF', SL2: '#EAF4FF',
  SG0: '#073D18', SG1: '#13963C', SG2: '#38FF78', SG3: '#C6FFD6',
  HM0: '#0A2050', HM1: '#1446A8', HM2: '#1E86D8', HM3: '#1FC0C0', HM4: '#2ED062', HM5: '#B8E62A', HM6: '#FFD21E', HM7: '#FF7A1A', HM8: '#E42828', HM9: '#FFE9D6',
  NT: '#9AA0B8',
  SC0: '#5E6470', SC1: '#9EA6B2', SC2: '#D2D8E0', SC3: '#EEF1F5',
  PA0: '#14161C', PA1: '#262A34', PA2: '#3A404E',
  GL0: '#1E3C78', GL1: '#3664B8', GL2: '#6E98E6',
  RB0: '#4A0710', RB1: '#8E1424', RB2: '#C8283A', RB3: '#F0606E',
  PCB0: '#0E3A22', PCB1: '#1B5E36', PCB2: '#2E7E4E',
  GW0: '#1A3550', GW1: '#2E5A80', GW2: '#4F86AE',
  LU0: '#0E0A14', LU1: '#1C1524',
  FA0: '#3A3014', FA1: '#6E5E2C', FA2: '#A8924E',
})) P[k] = hexc(v);
const HEAT = ['HM0', 'HM1', 'HM2', 'HM3', 'HM4', 'HM5', 'HM6', 'HM7', 'HM8', 'HM9'].map(k => P[k]);
// heat colour for activity a in [0, 1] (dithered between levels)
function heatCol(a, x, y) { const v = clamp(a, 0, 1) * 9, i = Math.floor(v), f = v - i; return HEAT[Math.min(9, f > bay(x, y) ? i + 1 : i)]; }

function addGlyph(f, ch, def) {
  const rows = def.split('/');
  f.g[ch] = { w: rows[0].length, bits: rows.map(r => { let v = 0; for (let i = 0; i < r.length; i++) if (r[i] === '#') v |= 1 << i; return v; }) };
}
addGlyph(FT, 'P', '####./#...#/#...#/#...#/####./#..../#..../#..../#....');
addGlyph(FT, 'U', '#...#/#...#/#...#/#...#/#...#/#...#/#...#/#...#/.###.');
addGlyph(FT, 'G', '.###./#...#/#..../#..../#.###/#...#/#...#/#...#/.###.');
addGlyph(FT, 'F', '#####/#..../#..../#..../####./#..../#..../#..../#....');
addGlyph(FL, '\u0435', '..../..../.##./#..#/####/#.../.###');   // lowercase e only where wanted (keV, e+)
addGlyph(FM, '\u0435', '..../.##./####/#.../.###');
const KEV = 'k\u0435V', EPL = '\u0435+';
addGlyph(FL, 'ν', '#...#/#...#/#...#/#..#./#.#../##.../#....');
addGlyph(FM, 'ν', '#..#/#..#/#.#./##../#...');
addGlyph(FM, '=', '.../###/.../###/...');
addGlyph(FM, '°', '.#./#.#/.#./.../...');
addGlyph(FM, '~', '..../.#.#/#.#./..../....');
addGlyph(FL, '=', '..../..../####/..../####/..../....');

// 2-D value noise in [0,1)
function vn2(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash3(i, j, s), b = hash3(i + 1, j, s), c = hash3(i, j + 1, s), d = hash3(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function gauss(x) { return Math.exp(-x * x); }
// closed Catmull-Rom spline through control points -> dense flat polygon
function splineClosed(pts, n) {
  const m = pts.length / 2, out = [];
  for (let i = 0; i < m; i++) {
    const a = (i - 1 + m) % m, b = i, c = (i + 1) % m, d = (i + 2) % m;
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      for (let q = 0; q < 2; q++) {
        const p0 = pts[2 * a + q], p1 = pts[2 * b + q], p2 = pts[2 * c + q], p3 = pts[2 * d + q];
        out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
    }
  }
  return out;
}
// mirror a right-half outline (x >= cx, listed top -> bottom) into a closed symmetric polygon
function mirrorClosed(half, cx) {
  const out = half.slice();
  for (let i = half.length - 2; i >= 0; i -= 2) out.push(2 * cx - half[i], half[i + 1]);
  return out;
}
// UI switch: recap montage renders earlier scenes without their captions
let UI_ON = true;
// Kurzgesagt pop: 90% at 0.25 s, ~108% overshoot, settles by 0.5 s
const pop = (t, t0) => t < t0 ? 0 : backOut(clamp((t - t0) / 0.5, 0, 1), 1.1);
