// WORLD — the one locked layout of the film (the operating table at the top, the heart–lung machine below it), its tube
// routes, the blood flow along them, and the macro camera track. World units: at z = 1 one unit is one art pixel of the
// opening frame (270×480); y runs down. The heart is at the origin.
//   venous side   RA cannula → venous line down the viewer's left → the reservoir (below the patient: gravity drainage)
//   machine       reservoir → centrifugal pump → integrated heat exchanger / oxygenator / arterial filter (left to right)
//   arterial side oxygenator outlet → bubble detector → arterial line up the viewer's right → cannula in the distal
//                 ascending aorta, on the body side of the cross-clamp
//   accessories   a thin cardioplegia line beside the arterial line to the aortic root; gas (pale cyan) and water (blue)
//                 lines to the oxygenator; all subdued
// Every route is defined once here; every scene draws the same routes, so no tube changes its attachment point.
(() => {
const { W, H, P } = PIX;
const WORLD = window.WORLD = { NAME: 'WORLD' };
const clamp = U.clamp, lerp = U.lerp;
// ---------- smooth curves ----------
// Catmull-Rom through the points, resampled about every `step` units
const smooth = (pts, step = 2) => {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) {
    const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); return out;
};
WORLD.smooth = smooth;
const lens = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
const at = (pts, S, d) => {
  if (d <= 0) return [...pts[0], Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])];
  for (let i = 1; i < pts.length; i++) if (d <= S[i]) { const q = (d - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
  const n = pts.length - 1; return [...pts[n], Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0])];
};
WORLD.lens = lens; WORLD.at = at;
// ---------- layout ----------
const LY = WORLD.LY = {
  window: { x: 0, y: 4, rx: 74, ry: 98 },                   // the sternotomy window
  table: { x0: -140, x1: 140, y0: -200, y1: 520 },            // the draped table (head end at the top)
  screen: -168,                                               // the anaesthesia drape bar
  res: { x: -100, y: 728, w: 42, h: 92 },                     // hard-shell venous reservoir (top-left corner, size)
  pump: { x: -34, y: 872, r: 22, h: 20 },                     // centrifugal pump head: centre of its base ellipse, radius
  drive: { x: -68, y: 876, w: 68, h: 28 },                    // pump drive unit (the magnetic coupling sits in its top)
  oxy: { x: 42, y: 742, r: 21, h: 100 },                      // integrated assembly: centre-top of the cylinder
  det: { x: 66, y: 688 },                                     // clamp-on bubble detector on the arterial line
  base: { x: -150, y: 904, w: 286, h: 46, d: 34 },            // console base block
  mast: { x: -24, y: 600, w: 16, h: 304 },
  mon: { x: -112, y: 600, w: 84, h: 52 },                     // console monitor
  blend: { x: 92, y: 694, w: 30, h: 22 },                     // gas blender / flowmeter
  cpg: { x: 92, y: 752, w: 26, h: 30 },                       // cardioplegia module
  hcu: { x: 120, y: 868, w: 52, h: 76 },                      // heater–cooler unit (water)
  perf: { x: -196, y: 640 },                                  // the perfusionist (top of the head)
};
const O = LY.oxy;
// ---------- the routes (world polylines, smoothed). The order of points is the direction of flow. ----------
const R = WORLD.R = {};
R.venous = smooth([[-40, 6], [-52, 8], [-66, 18], [-80, 40], [-88, 76], [-92, 120], [-96, 220], [-98, 360], [-100, 480], [-104, 540], [-108, 600], [-100, 660], [-96, 700], [-90, 724]], 2);
R.resPump = smooth([[-80, 822], [-80, 832], [-72, 840], [-56, 842], [-42, 842], [-35, 846], [-34, 852]], 1.5);
R.pumpOxy = smooth([[-12, 874], [2, 874], [18, 870], [32, 862], [40, 854], [42, 846]], 1.5);
R.arterial = smooth([[42, 738], [44, 724], [56, 704], [66, 688], [74, 660], [84, 600], [94, 520], [100, 400], [102, 260], [100, 140], [94, 40], [86, -28], [70, -70], [44, -94], [14, -100], [-6, -90], [-14, -72], [-15, -64]], 2);
R.cardio = smooth([[104, 752], [104, 720], [96, 640], [104, 560], [112, 420], [114, 260], [112, 140], [106, 40], [98, -18], [72, -46], [40, -50], [14, -44], [-4, -40]], 2);
R.gas = smooth([[104, 716], [92, 726], [72, 732], [60, 742]], 1.5);
R.exhaust = smooth([[58, 840], [64, 852], [66, 866]], 1.5);
R.waterIn = smooth([[146, 868], [140, 820], [100, 806], [64, 806]], 1.5);
R.waterOut = smooth([[64, 768], [102, 766], [150, 790], [158, 868]], 1.5);
for (const k in R) R[k].S = lens(R[k]);
WORLD.width = { venous: 11, arterial: 9, resPump: 11, pumpOxy: 11, cardio: 3, gas: 3, exhaust: 3, waterIn: 4, waterOut: 4 };
// ---------- blood flow: steady (nonpulsatile) markers moving along the routes. Spacing 24 units at 48 units/s: the pattern
// repeats every 0.5 s, so it is identical at 0 s and at 68 s (the loop). ----------
WORLD.FLOW = { gap: 24, speed: 48 };
WORLD.phase = t => (t * WORLD.FLOW.speed) % WORLD.FLOW.gap;
// the blood ramps along the circuit: venous until the oxygenator, oxygenated after it
WORLD.blood = { venous: 'vb', resPump: 'vb', pumpOxy: 'vb', arterial: 'ab', cardio: 'ab' };
// ---------- the macro camera track: film time → {x, y, z}. Keys sit on the scene boundaries of the brief. ----------
WORLD.CAM0 = { x: 0, y: 2, z: 1 };                             // the opening composition (and the closing one)
let TR = null;
WORLD.track = T => {
  if (!TR) TR = K.camTrack([
    [0.0, 0, 2, 1], [2.0, 0, 2, 1.06],                         // S01: a very small forward move
    [3.6, -60, 40, 1.5], [4.0, -64, 44, 1.5],                  // S02: shift toward the venous tube, the heart still in frame
    [5.0, -92, 360, 0.9], [6.0, -88, 680, 1.15],               // S03: track down the venous line to the machine
    [7.6, -40, 780, 0.8], [9.0, -36, 780, 0.78],               // S04: pull back into the three-quarter overview
    [10.0, -50, 420, 0.42], [12.0, -56, 520, 0.42],            // S05: the body-to-circuit diagram (venous side)
    [13.3, -79, 764, 3.0], [15.0, -79, 780, 3.0],              // S06: into the reservoir
    [15.9, -36, 858, 3.6], [19.0, -36, 858, 3.6],              // S07: the pump (hold)
    [22.0, 40, 800, 2.6], [23.6, 42, 790, 3.4], [25.0, 42, 784, 14],   // S09: the oxygenator, then a push to one fibre
    [45.0, 42, 784, 14], [46.0, 46, 762, 3.2],                // S14 end: pull back from the fibre to the assembly outlet
    [46.9, 46, 760, 3.2], [47.9, 62, 700, 3.0], [49.0, 62, 700, 3.0],   // S15: filter, then the bubble detector
    [50.2, 96, 330, 0.9], [51.4, -6, -54, 2.4], [52.0, -8, -58, 2.5],   // S16: up the arterial line to the aorta
    [56.0, -112, 704, 1.25], [59.0, -110, 700, 1.3],          // S18: the perfusionist and the monitor
    [59.9, 0, 400, 0.4], [62.2, 0, 400, 0.4], [63.0, 40, 240, 0.5],    // S19: the whole circuit, then toward the return line
    [64.6, 90, 40, 0.75], [67.4, 0, 2, 1.0], [68.0, 0, 2, 1.0]]);       // S20: back up to the opening frame
  return TR(T);
};

// ---------- drawing the tubes ----------
// One tube: blood inside clear PVC. The blood is shaded as a cylinder in its ramp (LIT), a pale streak runs along the lit
// side (the clear wall catching the light), and flow markers (a lighter step of the same ramp) move steadily along the
// centre line — never pulsing. o: { d0, d1 (the drawn stretch, in units along the route), a (dithered coverage),
// hi (0..1 highlight: a soft glow along the tube), glass: [d0, d1, k] (a see-through stretch: the wall becomes an outline
// and red cells slide inside, S02), marker: d (one persistent brighter marker at distance d), ramp (override) }
WORLD.tube = (c, cam, key, t, o = {}) => {
  const pts0 = R[key], S0 = pts0.S, w = WORLD.width[key], z = cam.z;
  const d0 = o.d0 ?? 0, d1 = o.d1 ?? S0[S0.length - 1];
  const pts = []; for (let i = 0; i < pts0.length; i++) if (S0[i] >= d0 - 2 && S0[i] <= d1 + 2) pts.push(pts0[i]);
  if (pts.length < 2) return;
  const ramp = window.RAMP[o.ramp || WORLD.blood[key] || 'tw'], n = ramp.length;
  if (o.hi > 0) { const [sx, sy] = K.S(cam, ...at(pts0, S0, (d0 + d1) / 2)); }
  const accessory = key === 'cardio' || key === 'gas' || key === 'exhaust' || key.startsWith('water');
  if (accessory) {
    // thin lines: a clear wall outline round a coloured core, no shading needed at this size
    const col = key === 'gas' || key === 'exhaust' ? ['ox2', 'ox4'] : key.startsWith('water') ? ['wa2', 'wa4'] : ['hr2', 'tw2'];
    const lw = Math.max(1, w * z);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
    const pth = () => { c.beginPath(); pts.forEach(([x, y], i) => { const [sx, sy] = K.S(cam, x, y); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }); };
    c.globalAlpha = o.a ?? 1;
    c.strokeStyle = P[col[0]]; c.lineWidth = lw; pth(); c.stroke();
    if (lw >= 3) { c.strokeStyle = P[col[1]]; c.lineWidth = Math.max(1, lw - 2); pth(); c.stroke(); }
    c.restore();
    if (key !== 'cardio' && lw >= 2) {                         // gas and water: a few slow markers so their direction reads
      const sp = 0.5, gap = 24, ph = (t * WORLD.FLOW.speed * sp) % gap;           // 24 units/s, a 1-s pattern: identical at 0 and 68 s
      for (let d = d0 + ph; d < d1; d += gap) { const [x, y] = at(pts0, S0, d), [sx, sy] = K.S(cam, x, y); PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, col[1]); }
    }
    return;
  }
  // the blood column, shaded as a cylinder; the tube wall is the pale rim round it
  const r = LIT.tube(c, cam, pts, w, ramp, { amb: 0.22, dif: 0.85, alpha: o.a ?? 1 });
  const lw = w * z;
  if (lw >= 4) {
    // the clear wall: a pale 1-px streak along the lit side
    const off = w * 0.28;
    const streak = [];
    for (let i = 0; i < pts.length; i += 2) { const j = Math.min(pts.length - 1, i + 1), a = Math.atan2(pts[j][1] - pts[Math.max(0, j - 1)][1], pts[j][0] - pts[Math.max(0, j - 1)][0]); let nx = -Math.sin(a), ny = Math.cos(a); if (nx * LIT.L[0] + ny * LIT.L[1] < 0) { nx = -nx; ny = -ny; } streak.push([pts[i][0] + nx * off, pts[i][1] + ny * off]); }
    LIT.line(c, cam, streak, 'tw4', { alpha: (o.a ?? 1) * 0.9 });
  }
  // flow markers: short dashes of a lighter step, moving at one steady speed
  const ph = WORLD.phase(t), gap = WORLD.FLOW.gap, dl = gap * 0.32, mc = ramp[Math.min(n - 1, 3)];
  for (let d = Math.ceil((d0 - ph) / gap) * gap + ph; d < d1; d += gap) {
    if (d < d0) continue;
    if (o.glass && d > o.glass[0] && d < o.glass[1] && (o.glass[2] ?? 0) > 0.5) continue;
    const seg = []; for (let q = 0; q <= 4; q++) { const dd = Math.min(d1, d + dl * q / 4); seg.push(at(pts0, S0, dd)); }
    if (lw >= 3) LIT.line(c, cam, seg, mc, { alpha: o.a ?? 1 }); else { const [sx, sy] = K.S(cam, seg[0][0], seg[0][1]); PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, mc); }
  }
  if (o.marker != null && o.marker >= d0 && o.marker <= d1) {        // the persistent marker the camera follows (S03, S05)
    const [x, y, ang] = at(pts0, S0, o.marker), [sx, sy] = K.S(cam, x, y), rr = Math.max(2, w * z * 0.42);
    FX.glowL(c, sx, sy, rr * 3, [ramp[2], ramp[3], ramp[4], ramp[5]], 0.75, 1.4);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    for (const s of [-1, 1]) PIX.bline(c, sx + ux * rr, sy + uy * rr, sx - ux * rr * 0.4 + uy * s * rr * 0.9, sy - uy * rr * 0.4 - ux * s * rr * 0.9, ramp[5]);
  }
};
// the blood route of the whole circuit, in flow order (for a marker that travels the full loop)
WORLD.ORDER = ['venous', 'resPump', 'pumpOxy', 'arterial'];

// ---------- the whole macro scene, back to front ----------
// o: { hand: {l: [dx, dy], r: [dx, dy]}, tubes: {key: {…WORLD.tube options}}, machine: {…}, people: true, heartO: {…} }
WORLD.scene = (c, cam, T, o = {}) => {
  HEART.field(c, cam, T);
  if (window.MACHINE) MACHINE.draw(c, cam, T, o.machine || {});
  HEART.draw(c, cam, T, o.heartO || {});
  const to = o.tubes || {};
  for (const k of ['waterIn', 'waterOut', 'gas', 'exhaust', 'resPump', 'pumpOxy', 'cardio', 'venous', 'arterial']) if (!(to[k] && to[k].hide)) WORLD.tube(c, cam, k, T, to[k] || {});
  if (window.MACHINE && MACHINE.front) MACHINE.front(c, cam, T, o.machine || {});
  if (o.people !== false) {
    PEOPLE.perfusionist(c, cam, o.perf || {});
    PEOPLE.surgeon(c, cam, -1, { hand: (o.hand && o.hand.l) || [0, 0] });
    PEOPLE.surgeon(c, cam, 1, { hand: (o.hand && o.hand.r) || [0, 0] });
  }
};

// the distance along a route at which it crosses world height y (first crossing from the start)
WORLD.dAtY = (key, y) => { const pts = R[key], S0 = pts.S; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1][1], b = pts[i][1]; if ((a - y) * (b - y) <= 0 && a !== b) return S0[i - 1] + (y - a) / (b - a) * (S0[i] - S0[i - 1]); } return null; };
// a highlight that runs along a chain of routes (S04, S19): a bright core segment with a soft glow, in the blood's own ramp
WORLD.comet = (c, cam, keys, d, len = 60, o = {}) => {
  let off = 0;
  for (const k of keys) {
    const pts = R[k], S0 = pts.S, L = S0[S0.length - 1], a = d - len - off, b = d - off;
    if (b > 0 && a < L) {
      const ramp = window.RAMP[o.ramp || WORLD.blood[k] || 'mt'], seg = [];
      for (let q = Math.max(0, a); q <= Math.min(L, b); q += 3) seg.push(at(pts, S0, q));
      if (seg.length > 1) {
        const w = WORLD.width[k] * cam.z;
        LIT.tube(c, cam, seg.map(p => [p[0], p[1]]), WORLD.width[k] * 1.25, [ramp[3], ramp[4], ramp[5], ramp[5]], { amb: 0.5, dif: 0.6, alpha: o.a ?? 1 });
        const hd = seg[seg.length - 1], [hx, hy] = K.S(cam, hd[0], hd[1]);
        if (b < L) FX.glowL(c, hx, hy, Math.max(6, w * 1.8), [ramp[2], ramp[3], ramp[4], ramp[5]], 0.8 * (o.a ?? 1), 1.4);
      }
    }
    off += L;
  }
};
WORLD.routeLen = keys => keys.reduce((s, k) => s + R[k].S[R[k].S.length - 1], 0);
WORLD.init = () => {};
})();
