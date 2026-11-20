// LABELS — the storyboard's small context labels, scene by scene (1:1 with the client's panels): dark boxes with one to
// three short lines and a leader to a dot on the thing they name. Anchors: a world point in the world the scene drew
// (w: 'head' | 'tissue' | 'micro' | 'dna' | 'room' | 'close' | 'unit' | 'nuc' | 'ui'; at: [x, y] or (S, t) => [x, y]) or
// a screen point (scr). Boxes sit at fixed screen positions (x = box centre, y = box top) chosen per scene for the 9:16
// frame. Times are seconds inside the scene; t1 defaults to 0.3 s before the cut.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const L = {};
const beamPt = (i, r) => { const a = HEAD.BEAMS[i]; return [Math.cos(a) * r, Math.sin(a) * r]; };
const ringPt = (k, r, span = Math.PI * 1.25) => { const a = -Math.PI / 2 - span / 2 + (k + 0.5) / 8 * span; return [Math.cos(a) * r, Math.sin(a) * r]; };
const secPt = (k, r) => { const a = UNIT.SEC(k); return [Math.cos(a) * r, Math.sin(a) * r]; };
// A
L.s01_beams = [{ w: 'head', at: () => beamPt(36, 96), lines: ['Gamma Knife', '(192 beams)'], x: 278, y: 92, t0: 0.2, t1: 1.05 }];
L.s03_photon = [
  { w: 'micro', at: [-110, -26], lines: ['Gamma photon', '(γ)'], x: 84, y: 200, t0: 0.05, t1: 0.8 },
  { w: 'micro', at: [30, -12], lines: ['Electron', '(e⁻)'], x: 286, y: 214, t0: 0.12, t1: 0.8 },
];
L.s04_ionize = [
  { w: 'micro', at: (S, t) => [lerp(-170, 24, clamp(t / 0.4)), lerp(40, 14, clamp(t / 0.4)) + 10], lines: ['Energetic', 'electron', '(e⁻)'], x: 78, y: 430, t0: 0.03, t1: 0.75 },
  { w: 'micro', at: [40, -4], lines: ['Water', '(H₂O)'], x: 262, y: 196, t0: 0.1, t1: 0.8 },
];
L.s05_dsb = [{ w: 'dna', at: [8, -16], lines: ['Double-strand', 'break (DSB)'], x: 214, y: 188, t0: 0.42, t1: 1.05 }];
// B
L.s08_mask = [{ w: 'close', at: [24, -34], lines: ['Thermoplastic', 'head mask'], x: 266, y: 150, t0: 0.35, t1: 1.5 }];
L.s09_cbct = [{ w: 'close', at: [30, -110], lines: ['CBCT', '(Cone-Beam CT)'], x: 262, y: 112, t0: 0.2, t1: 1.75 }];
// C
L.s11_cutaway = [
  { w: 'unit', at: [-60, -160], lines: ['Cutaway', '(cross-section)'], x: 78, y: 84, t0: 0.45, t1: 1.8 },
  { w: 'unit', at: [102, -110], lines: ['Shielding', '(heavy metal)'], x: 290, y: 84, t0: 0.65, t1: 1.8 },
  { w: 'unit', at: [76, -74], lines: ['Co-60', 'sources'], x: 306, y: 196, t0: 0.85, t1: 1.8 },
  { w: 'unit', at: [134, 70], lines: ['Sector', 'mechanism', '(motorized)'], x: 300, y: 480, t0: 1.05, t1: 1.8 },
];
L.s12_sectors = [
  { w: 'unit', at: () => secPt(0, 150), lines: ['8 sectors ×', '24 sources'], x: 180, y: 70, t0: 0.3, t1: 2.2 },
  { w: 'unit', at: () => secPt(4, 104), lines: ['= 192 Co-60', 'sources'], x: 180, y: 534, t0: 1.55, t1: 2.2 },
];
L.s13_capsule = [
  { w: 'nuc', at: [0, -46], lines: ['Sealed source capsule', '(Co-60)'], x: 180, y: 160, t0: 0.25, t1: 1.45 },
  { w: 'nuc', at: [-40, -4], lines: ['Cobalt-60', '(Co-60)'], x: 96, y: 450, t0: 0.85, t1: 1.45 },
  { w: 'nuc', at: [118, 26], lines: ['Hermetic seal', '(stainless steel)'], x: 264, y: 420, t0: 1.0, t1: 1.45 },
];
L.s14_decay = [
  { scr: [92, 262], lines: ['Co-60', '(27p, 33n)'], x: 92, y: 190, t0: 0.1, t1: 1.95 },
  { scr: [192, 404], lines: ['β⁻', '(beta-minus)'], x: 276, y: 446, t0: 1.05, t1: 1.95 },
  { scr: [134, 410], lines: ['antineutrino'], x: 84, y: 470, t0: 1.15, t1: 1.95 },
  { scr: [272, 262], lines: ['Ni-60*', '(28p, 32n)', '(excited)'], x: 272, y: 176, t0: 1.25, t1: 1.95 },
];
L.s15_gamma = [
  { scr: [82, 281], lines: ['Ni-60*', '(excited)'], x: 82, y: 200, t0: 0.05, t1: 1.45 },
  { scr: [262, 258], lines: ['γ (gamma)', '1.17 MeV'], x: 276, y: 190, t0: 0.55, t1: 1.45 },
  { scr: [262, 382], lines: ['γ (gamma)', '1.33 MeV'], x: 276, y: 420, t0: 1.0, t1: 1.45 },
];
L.s16_source = [
  { w: 'nuc', at: [-30, -10], lines: ['Beta particles', '(absorbed', 'in the capsule)'], x: 96, y: 150, t0: 0.25, t1: 1.45 },
  { w: 'nuc', at: [200, -18], lines: ['Gamma rays', '(1.17 MeV', 'and 1.33 MeV)'], x: 276, y: 150, t0: 0.5, t1: 1.45 },
  { w: 'nuc', at: [0, 46], lines: ['Sealed Co-60 source'], x: 180, y: 452, t0: 0.75, t1: 1.45 },
];
L.s17_shield = [
  { w: 'nuc', at: [-40, -26], lines: ['Radiation', '(from source)'], x: 90, y: 116, t0: 0.2, t1: 1.7 },
  { w: 'nuc', at: [-130, 110], lines: ['Shielding', '(absorbs most', 'directions)'], x: 96, y: 504, t0: 0.55, t1: 1.7 },
  { w: 'nuc', at: [180, -26], lines: ['To', 'collimators', '(selected paths)'], x: 284, y: 140, t0: 0.9, t1: 1.7 },
];
// D
L.s18_focus = [
  { w: 'unit', at: [-104, -110], lines: ['Co-60 sources', '(192 total)'], x: 76, y: 100, t0: 0.2, t1: 1.7 },
  { w: 'unit', at: [-150, -50], lines: ['Motorized', 'sectors', '(8 total)'], x: 60, y: 300, t0: 0.4, t1: 1.7 },
  { w: 'unit', at: [-108, -24], lines: ['Collimator', 'block', '(4 mm)'], x: 60, y: 410, t0: 0.6, t1: 1.7 },
  { w: 'unit', at: [0, 0], lines: ['Focal point', '(target)'], x: 286, y: 470, t0: 0.85, t1: 1.7 },
];
L.s19_translate = [{ w: 'unit', at: (S, t) => [lerp(-50, 40, MO.sineInOut(clamp((t - 0.2) / 1.2))), -110], lines: ['Motorized sector', '(translating)'], x: 180, y: 96, t0: 0.15, t1: 1.45 }];
L.s20_collimate = [{ w: 'unit', at: [10, -110], lines: ['Collimator block', '(4 mm channels)'], x: 200, y: 100, t0: 0.2, t1: 1.45 }];
L.s21_sizes = [{ scr: [96, 196], lines: ['Sector', '(select collimator)'], x: 100, y: 112, t0: 0.15, t1: 1.45 }];
L.s22_onoff = [
  { scr: [89, 230], lines: ['Sector ON', '(aligned)'], x: 89, y: 112, t0: 0.15, t1: 1.45, col: 'gn4' },
  { scr: [271, 230], lines: ['Sector OFF', '(shielded)'], x: 271, y: 112, t0: 0.4, t1: 1.45, col: 'rd4' },
];
L.s23_plan8 = SHOT.PLAN8.map((mm, k) => { const a = UNIT.SEC(k), r = 190; return { w: 'unit', at: () => secPt(k, 150), lines: ['S' + (k + 1), mm + ' mm'], x: Math.round(clamp(180 + Math.cos(a) * 158, 30, 330)), y: Math.round(clamp(300 + Math.sin(a) * 186 - 12, 60, 540)), t0: 0.2 + k * 0.12, t1: 2.2 }; });
L.s24_channel = [
  { scr: [120, 300], lines: ['Tungsten', 'collimator', 'channel'], x: 86, y: 112, t0: 0.2, t1: 1.45 },
  { lines: ['W', '(Tungsten)'], x: 290, y: 198, t0: 0.6, t1: 1.45 },
];
// E
L.s25_beam = [
  { w: 'head', at: () => [Math.cos(Math.PI * 1.02) * 120, Math.sin(Math.PI * 1.02) * 120], lines: ['Gamma', 'beam'], x: 120, y: 190, t0: 0.4, t1: 1.45 },
  { w: 'head', at: [60, -112], lines: ['Patient', 'head', '(transparent)'], x: 290, y: 96, t0: 0.7, t1: 1.45 },
];
L.s27_isocenter = [{ w: 'tissue', at: [0, 0], lines: ['Isocenter', '(focal point)'], x: 100, y: 150, t0: 0.5, t1: 1.95 }];
L.s28_onevsmany = [
  { scr: [89, 300], lines: ['One beam', '(low dose)'], x: 89, y: 120, t0: 0.2, t1: 1.7 },
  { scr: [271, 300], lines: ['Many beams', '(high dose)'], x: 271, y: 120, t0: 0.5, t1: 1.7 },
];
L.s29_irregular = [
  { w: 'tissue', at: [40, -50], lines: ['Irregular', 'target', '(lesion)'], x: 280, y: 116, t0: 0.25, t1: 1.45 },
  { scr: [88, 432], lines: ['One spherical', 'shot', '(not enough)'], x: 88, y: 356, t0: 0.6, t1: 1.45 },
];
L.s30_shotsizes = [[-170, 9, '4 mm'], [-10, 18, '8 mm'], [160, 34, '16 mm']].map(([y, s, mm], i) => ({ w: 'tissue', at: [-s * 1.3, y], lines: [mm, 'shot'], x: 70, y: Math.round(320 + y - 12), t0: 0.25 + i * 0.3, t1: 1.45 }));
// F
L.s31_overlap = [{ w: 'tissue', at: [-34, 0], lines: ['Multiple', 'dose shots', '(overlapping)'], x: 86, y: 120, t0: 0.4, t1: 1.45 }];
L.s32_reset = [{ w: 'unit', at: () => secPt(0, 140), lines: ['Sectors', 'OFF', '(reset)'], x: 290, y: 76, t0: 0.3, t1: 1.2 }];
L.s33_couch = [{ w: 'room', at: (S, t) => [-110 + 14 * MO.sineInOut(clamp((t - 0.25) / 1.1)), 58], lines: ['Motorized', 'couch', '(precise move)'], x: 100, y: 470, t0: 0.2, t1: 1.45 }];
L.s34_nextshot = [{ w: 'unit', at: () => secPt(1, 120), lines: ['Next shot', 'configured', '(new sectors)'], x: 300, y: 70, t0: 0.35, t1: 1.2 }];
L.s35_conform = [{ w: 'tissue', at: [20, 4], lines: ['Accumulated', 'dose', '(final shape)'], x: 86, y: 120, t0: 0.3, t1: 1.7 }];
// G
L.s36_enter = [
  { w: 'micro', at: (S, t) => { const k = MO.cubicOut(clamp(t / 1.2)); return [lerp(-260, 140, k) - 40, lerp(-40, 10, k) - 6]; }, lines: ['Gamma', 'photon', '(γ)'], x: 80, y: 150, t0: 0.25, t1: 1.2 },
  { w: 'micro', at: [120, 150], lines: ['Brain', 'tissue', '(cells)'], x: 280, y: 520, t0: 0.4, t1: 1.2 },
];
L.s37_compton = [
  { w: 'micro', at: [-110, -10], lines: ['Gamma', 'photon', '(γ)'], x: 76, y: 196, t0: 0.1, t1: 1.95 },
  { w: 'micro', at: (S, t) => { const u = clamp((t - 0.65) / 0.9); return [10 + 90 * MO.cubicOut(u), 14 + 70 * MO.cubicOut(u)]; }, lines: ['Electron (e⁻)', '(gains energy)'], x: 250, y: 470, t0: 0.8, t1: 1.95 },
  { w: 'micro', at: [80, -54], lines: ['Scattered', 'photon', '(lower energy)'], x: 286, y: 150, t0: 1.0, t1: 1.95 },
];
L.s38_track = [
  { w: 'micro', at: (S, t) => [lerp(-150, 190, t / 1.75), -12], lines: ['Energetic', 'electron', '(e⁻)'], x: 84, y: 160, t0: 0.1, t1: 1.45 },
  { w: 'micro', at: [40, 30], lines: ['Multiple', 'ionizations', '(along the path)'], x: 260, y: 462, t0: 0.6, t1: 1.45 },
];
L.s39_radiolysis = [
  { scr: [98, 292], lines: ['Water', 'molecule', '(H₂O)'], x: 98, y: 190, t0: 0.1, t1: 1.45 },
  { scr: [222, 342], lines: ['Radiolysis', '(breakdown by radiation)'], x: 220, y: 440, t0: 0.85, t1: 1.45 },
];
L.s40_radicals = [
  { scr: [150, 240], lines: ['Reactive species', '(e.g., hydroxyl radical)'], x: 120, y: 120, t0: 0.15, t1: 1.45 },
  { w: 'dna', at: [90, 24], lines: ['Biomolecule', '(e.g., DNA)'], x: 270, y: 500, t0: 0.4, t1: 1.45 },
];
L.s41_dnahit = [
  { w: 'dna', at: [-60, -28], lines: ['Direct', 'effect', '(ionization)'], x: 80, y: 150, t0: 0.5, t1: 1.45 },
  { w: 'dna', at: [60, 28], lines: ['Indirect', 'effect', '(free radicals)'], x: 276, y: 470, t0: 1.0, t1: 1.45 },
];
L.s42_cell = [
  { w: 'micro', at: [-74, -8], lines: ['Severe', 'DNA damage'], x: 90, y: 130, t0: 0.2, t1: 1.95 },
  { w: 'micro', at: [110, 70], lines: ['Cannot divide', 'normally'], x: 262, y: 480, t0: 1.4, t1: 1.95 },
];
// H
L.s43_ir = [
  { w: 'close', at: [-96, -150], lines: ['Infrared camera', '(tracking)'], x: 250, y: 96, t0: 0.25, t1: 1.7 },
  { w: 'close', at: [17, -64], lines: ['Reflective', 'marker'], x: 270, y: 470, t0: 0.6, t1: 1.7 },
];
L.s44_motion = [
  { scr: [95, 110], lines: ['Reference', 'position'], x: 95, y: 64, t0: 0.15, t1: 1.7 },
  { scr: [265, 110], lines: ['Current', 'position', '(Δ > tolerance)'], x: 265, y: 54, t0: 0.4, t1: 1.7 },
];
L.s45_off = [{ w: 'unit', at: () => secPt(0, 132), lines: ['Sources move to', 'shielded OFF positions'], x: 180, y: 66, t0: 0.45, t1: 1.7 }];
// I
L.s46_system = [
  { w: 'head', at: () => ringPt(1, 207), lines: ['Sources', '(Co-60)'], x: 66, y: 96, t0: 0.3, t1: 2.2 },
  { w: 'head', at: () => ringPt(4, 178), lines: ['Collimators', '(beam shaping)'], x: 196, y: 52, t0: 0.55, t1: 2.2 },
  { w: 'head', at: [0, 0], lines: ['Target', '(lesion)'], x: 296, y: 400, t0: 0.8, t1: 2.2 },
];
L.s47_return = [{ w: 'head', at: () => beamPt(36, 96), lines: ['Gamma Knife', '(192 beams)'], x: 278, y: 92, t0: 0.6, t1: 1.7 }];
L.s49_loop = [{ w: 'head', at: () => beamPt(36, 96), lines: ['Gamma Knife', '(192 beams)'], x: 278, y: 92, t0: 0.4, t1: 1.4 }];
window.LABELS = { L };
LABELS.draw = (c, id, S, t) => {
  const list = L[id]; if (!list) return;
  for (const o of list) {
    let ax = null, ay = null;
    if (o.scr) [ax, ay] = o.scr;
    else if (o.w) { const cam = (window.__cams || {})[o.w]; if (!cam) continue; const p = typeof o.at === 'function' ? o.at(S, t) : o.at; if (!p) continue; [ax, ay] = K.S(cam, p[0], p[1]); if (!(ax >= 2 && ay >= 2 && ax <= W - 2 && ay <= H - 2)) continue; }
    CAP.box(c, t, { ...o, ax, ay, t1: o.t1 ?? S.dur - 0.3 });
  }
};
})();
