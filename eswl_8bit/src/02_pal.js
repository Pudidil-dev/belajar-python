'use strict';
// ============================================================================
// ESWL palette (extends P) + extra title glyphs.
// Kidney tissue deep red/pink, stone yellow-brown, urine amber, coupling water
// cyan, compression blue, rarefaction purple, shock front white-blue, stress
// orange, microcracks bright amber, cavitation pale cyan, EM field violet (V*),
// electrical parts metallic grey (C*/T*), background deep navy (BG/N*).
// ============================================================================
for (const [k, v] of Object.entries({
  KD0: '#2A0B16', KD1: '#561429', KD2: '#8C2240', KD3: '#C24563', KD4: '#E8879A',
  MD0: '#3B0F22', MD1: '#6A1C38', MD2: '#93304F',
  UR0: '#1C1307', UR1: '#3A280D', UR2: '#6E4C16', UR3: '#B07A26', UR4: '#EDBE68',
  ST0: '#2B1C0B', ST1: '#5A3D17', ST2: '#8A6226', ST3: '#B98B39', ST4: '#DDB65E', ST5: '#FFE6A3',
  WC0: '#062C38', WC1: '#0D5C6E', WC2: '#1C9DB3', WC3: '#5ADCEE', WC4: '#C4F7FF',
  CB0: '#0A2766', CB1: '#1C55D0', CB2: '#4A8BFF', CB3: '#A9C9FF',
  RF0: '#251048', RF1: '#55289A', RF2: '#985BFF', RF3: '#D3B8FF',
  SW0: '#4E6CA6', SW1: '#A3C2FF', SW2: '#E9F2FF',
  MS0: '#4E1F06', MS1: '#A84C0E', MS2: '#FF8A2A', MS3: '#FFC890',
  MC0: '#6B3A00', MC1: '#FFAE1A', MC2: '#FFE27E',
  CV0: '#2F6E7A', CV1: '#9BE6F0', CV2: '#E4FCFF',
  FA0: '#3A3014', FA1: '#6E5E2C', FA2: '#A8924E',
  MR0: '#3A1318', MR1: '#6E262D', MR2: '#9C3F47',
  GL0: '#0F4A4A', GL1: '#3FA7A0', GL2: '#9FE3DA',
  GW0: '#1A3550', GW1: '#2E5A80', GW2: '#4F86AE',
})) P[k] = hexc(v);

function addGlyph(f, ch, def) {
  const rows = def.split('/');
  f.g[ch] = { w: rows[0].length, bits: rows.map(r => { let v = 0; for (let i = 0; i < r.length; i++) if (r[i] === '#') v |= 1 << i; return v; }) };
}
addGlyph(FT, 'P', '####./#...#/#...#/#...#/####./#..../#..../#..../#....');
addGlyph(FT, 'U', '#...#/#...#/#...#/#...#/#...#/#...#/#...#/#...#/.###.');
addGlyph(FT, 'G', '.###./#...#/#..../#..../#.###/#...#/#...#/#...#/.###.');
addGlyph(FT, 'F', '#####/#..../#..../#..../####./#..../#..../#..../#....');

// 2-D value noise in [0,1)
function vn2(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash3(i, j, s), b = hash3(i + 1, j, s), c = hash3(i, j + 1, s), d = hash3(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function gauss(x) { return Math.exp(-x * x); }
// UI switch: recap montage renders earlier scenes without their captions
let UI_ON = true;
