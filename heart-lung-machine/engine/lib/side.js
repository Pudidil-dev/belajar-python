// SIDE — the heart–lung machine seen from the side: one locked schematic elevation used by every machine scene, the way a
// dialysis set-up is usually explained (the patient, the machine beside them, the lines between them and the direction
// of flow along every line).
//   top     the patient lies on the table, head on the left behind the anaesthesia screen (no face), teal drapes; a round
//           cutaway window in the chest shows the arrested heart (the opening's heart model, drawn small) and its cannulas
//   below   the console stands on the floor, in flow order from left to right: venous reservoir → centrifugal pump on its
//           drive (on the cart) → oxygenator with its heat exchanger (bottom) and arterial filter (top) → the arterial line
//           up past the bubble detector to the aorta. Around them: the suction roller pump (cart, left), the cardioplegia
//           roller pump with its bag (mast), the gas blender (O2 + air), the heater–cooler (floor, right), the monitor.
// It is a schematic, not to scale: the machine is drawn large and well below the table so that the gravity drop and every
// part read in a vertical frame. World units: at z = 1 one unit is one art pixel; the overview {0, 8, 1} shows it all.
// Every route is defined once here, in the direction of flow; every scene draws the same routes.
(() => {
const { W, H, P } = PIX;
const SIDE = window.SIDE = { NAME: 'SIDE' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
const smooth = (pts, s = 1) => WORLD.smooth(pts, s);
// ---------- layout ----------
const LY = SIDE.LY = {
  floor: 200,
  table: { x0: -128, x1: 128, top: -70, th: 7 },
  win: { x: -36, y: -94, r: 20 },                    // the chest window (centre, radius)
  hz: 0.2, hc: [0, -13],                             // heart model → window: scale; the heart point drawn at the window centre
  cart: { x0: -104, x1: 100, y0: 146, y1: 190 },
  mast: { x0: -3, x1: 3, y0: -20, y1: 146 },
  mon: { x0: -40, x1: 0, y0: -48, y1: -20 },
  res: { x0: -76, x1: -48, y0: 0, y1: 64, level: 30 },
  pump: { x: -14, y: 124, r: 15, h: 16 },            // pump head: centre of the cone's base, radius, height
  drive: { x0: -34, x1: 6, y0: 124, y1: 146 },
  oxy: { x0: 40, x1: 64, y0: 2, y1: 96, filt: [4, 14], fib: [16, 70], hx: [72, 94] },
  det: { x: 52, y: -16 },
  blend: { x0: 66, x1: 90, y0: -22, y1: 4 },
  cpg: { x0: 12, x1: 34, y0: -10, y1: 14, head: [23, 2], hr: 7 },
  bag: { x0: 7, x1: 19, y0: -44, y1: -22 },
  suc: { x0: -102, x1: -72, y0: 118, y1: 146, head: [-87, 132], hr: 10 },
  hcu: { x0: 106, x1: 134, y0: 126, y1: 196 },
};
SIDE.CAMV = { x: 0, y: 8, z: 1 };                    // the overview
// heart model coordinates (HEART, the opening's anterior view) → side world, inside the window
const H2S = SIDE.H2S = (x, y) => [LY.win.x + (x - LY.hc[0]) * LY.hz, LY.win.y + (y - LY.hc[1]) * LY.hz];
// ---------- routes (side world, in the direction of flow) ----------
const RT = SIDE.R = {};
RT.venous = smooth([H2S(-40, 6), [-50, -92], [-57, -93], [-63, -90], [-67, -82], [-67.5, -56], [-66, -30], [-62, -13], [-58, -7], [-58, -2]]);
RT.resPump = smooth([[-62, 64], [-62, 72], [-61, 82], [-55, 90], [-40, 93], [-24, 94], [-16, 97], [-14, 101]]);
RT.pumpOxy = smooth([[-1, 121], [8, 121], [22, 120], [36, 116], [47, 109], [52, 102]]);
RT.arterial = smooth([[52, -3], [52, -24], [52, -44], [49, -68], [42, -90], [28, -110], [6, -123], [-16, -125], [-30, -119], [-37, -111], H2S(-15, -64)]);
RT.cardio = smooth([[27.3, -10], [27, -24], [25, -44], [22, -70], [12, -92], [-2, -102], [-14, -106], [-22, -107], [-30, -102], H2S(-6, -30)]);
RT.suction = smooth([H2S(-50, 48), H2S(-56, 10), H2S(-58, -40), [-50, -108], [-55, -116], [-64, -122], [-78, -124], [-90, -118], [-96, -104], [-97, -70], [-97, 40], [-96, 100], [-94, 112], [-93.2, 118]]);
RT.suctionRet = smooth([[-80.8, 118], [-80.5, 110], [-82, 100], [-83, 80], [-83, 20], [-83, 4], [-80, -6], [-73, -9], [-70, -4]]);
RT.o2 = smooth([[150, -14], [120, -14], [90, -14]]);
RT.air = smooth([[150, -6], [120, -6], [90, -6]]);
RT.gas = smooth([[72, 4], [72, 10], [68, 15], [64, 16]]);
RT.exhaust = smooth([[64, 66], [69, 66], [73, 69], [75, 74]]);
RT.waterIn = smooth([[126, 126], [124, 112], [118, 100], [104, 88], [86, 80], [64, 78]]);
RT.waterOut = smooth([[64, 90], [78, 93], [96, 102], [106, 112], [112, 126]]);
RT.bag = smooth([[13, -22], [14, -17], [18.7, -12], [18.7, -10]]);
for (const k in RT) RT[k].S = WORLD.lens(RT[k]);
SIDE.width = { venous: 7, resPump: 7, pumpOxy: 7, arterial: 5, cardio: 2, suction: 3, suctionRet: 3, o2: 2, air: 2, gas: 2, exhaust: 2, waterIn: 3, waterOut: 3, bag: 2 };
// what each line carries: a blood ramp, or a colour pair for the accessory lines [wall, core]
SIDE.blood = { venous: 'vb', resPump: 'vb', pumpOxy: 'vb', arterial: 'ab', suction: 'vb', suctionRet: 'vb' };
SIDE.thin = { cardio: ['hr2', 'hr4'], o2: ['ox2', 'ox4'], air: ['g4', 'g7'], gas: ['ox2', 'ox4'], exhaust: ['ox1', 'ox3'], waterIn: ['wa2', 'wa4'], waterOut: ['wa2', 'wa3'], bag: ['tw2', 'tw4'] };
const at = WORLD.at;
SIDE.len = k => RT[k].S[RT[k].S.length - 1];
SIDE.at = (k, d) => at(RT[k], RT[k].S, d);
// flow: steady markers, 15 units apart at 30 units/s (a 0.5-s pattern); accessory lines at half speed
SIDE.FLOW = { gap: 15, speed: 30 };
// ---------- the background: floor, table, patient, anaesthesia screen ----------
const blob = pts => HEART.blob(pts);
const BODY = blob([[-92, -112], [-80, -119], [-60, -121], [-24, -121], [-6, -117], [10, -113], [30, -109], [52, -102], [76, -103], [96, -97], [110, -99], [118, -108], [124, -104], [128, -84], [128, -52], [-92, -52]]);
SIDE.room = (c, cam, T, o = {}) => {
  const S = (x, y) => K.S(cam, x, y), z = cam.z, Tb = LY.table;
  PIX.rect(c, 0, 0, W, H, 'k');
  // the floor: one quiet line and a slightly lighter band (a sense of ground, no texture)
  const [, fy] = S(0, LY.floor); if (fy < H) { PIX.rect(c, 0, Math.round(fy), W, H, 'n0'); PIX.rect(c, 0, Math.round(fy), W, Math.max(1, Math.round(z)), 'g2'); }
  // the table: pedestal and base behind the console, the top slab
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(-12, Tb.top + Tb.th, 24, LY.floor - Tb.top - Tb.th - 4); ctx.fillRect(-46, LY.floor - 7, 92, 7); }, LIT.wbox(cam, [-48, Tb.top, 48, LY.floor]), ['n1', 'n2', 'g1', 'g2'], { edge: true });
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(Tb.x0, Tb.top, Tb.x1 - Tb.x0, Tb.th); }, LIT.wbox(cam, [Tb.x0, Tb.top, Tb.x1, Tb.top + Tb.th]), R('g'), { bias: 0.05 });
  // the patient under the drapes (one teal form hanging over the table edge), a few soft folds
  LIT.path(c, cam, BODY.path, BODY.box, R('dr'), { bias: 0.02 });
  if (z > 0.7) for (const [x, y0] of [[-74, -110], [-2, -106], [40, -98], [84, -92], [116, -92]]) LIT.line(c, cam, [[x, y0], [x + 2, -56]], 'dr1');
  // the anaesthesia screen: a pole, a bar, and a drape hanging in front of the head end (the face is never shown)
  LIT.tube(c, cam, [[-90, -52], [-90, -150]], 3, R('g'), {});
  LIT.tube(c, cam, [[-132, -150], [-90, -150]], 3, R('g'), {});
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.moveTo(-136, -148); ctx.lineTo(-92, -148); ctx.lineTo(-92, -64); ctx.quadraticCurveTo(-112, -58, -136, -64); ctx.closePath(); ctx.fill(); }, LIT.wbox(cam, [-138, -150, -90, -56]), R('dr'), { bias: 0.1 });
  if (z > 0.7) for (const x of [-126, -114, -102]) LIT.line(c, cam, [[x, -146], [x + 1, -66]], 'dr2');
};
// ---------- the chest window: the arrested heart inside, cut out of the chest ----------
const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d', { willReadFrequently: true });
SIDE.heartCam = cam => { const z = cam.z * LY.hz, [sx, sy] = K.S(cam, LY.win.x, LY.win.y); return { x: LY.hc[0] - (sx - W / 2) / z, y: LY.hc[1] - (sy - H / 2) / z, z }; };
// o: { inner(oc, hcam, cam) — extra drawing inside the window (heart coordinates through hcam) }
SIDE.window = (c, cam, T, o = {}) => {
  const [cx, cy] = K.S(cam, LY.win.x, LY.win.y), r = LY.win.r * cam.z;
  const x0 = Math.max(0, Math.floor(cx - r - 3)), y0 = Math.max(0, Math.floor(cy - r - 3)), x1 = Math.min(W, Math.ceil(cx + r + 3)), y1 = Math.min(H, Math.ceil(cy + r + 3));
  if (x1 <= x0 || y1 <= y0) return;
  const hcam = SIDE.heartCam(cam);
  oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = 1; oc.fillStyle = P.vb0; oc.fillRect(x0, y0, x1 - x0, y1 - y0);
  const prev = LIT.CLIP; LIT.CLIP = [x0, y0, x1, y1];
  try {
    PIX.rect(oc, x0, y0, x1 - x0, y1 - y0, 'hr0');                                   // the pericardial well
    HEART.draw(oc, hcam, T, o.heartO || {});
    if (o.inner) o.inner(oc, hcam, cam);
  } finally { LIT.CLIP = prev; oc.setTransform(1, 0, 0, 1, 0, 0); }
  // copy the disc, then the cut edge: a 2-px ring of skin and tissue
  const src = oc.getImageData(x0, y0, x1 - x0, y1 - y0).data, dst = c.getImageData(x0, y0, x1 - x0, y1 - y0), dd = dst.data;
  const ring = [LIT.rgb('sk4'), LIT.rgb('sk2'), LIT.rgb('hr1')], rw = Math.max(2, Math.round(cam.z * 1.2));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > r + rw) continue;
    const i = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
    if (d <= r) { dd[i] = src[i]; dd[i + 1] = src[i + 1]; dd[i + 2] = src[i + 2]; }
    else { const col = ring[Math.min(2, Math.floor((d - r) / rw * 3))]; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; }
    dd[i + 3] = 255;
  }
  c.putImageData(dst, x0, y0);
};
// ---------- the lines ----------
// o: { d0, d1, a, ramp, hi (0..1: a lighter, highlighted line), marker: d (one bright marker the camera follows), still }
SIDE.tube = (c, cam, key, T, o = {}) => {
  const pts0 = RT[key], S0 = pts0.S, w = SIDE.width[key], z = cam.z, L = S0[S0.length - 1];
  const d0 = o.d0 ?? 0, d1 = o.d1 ?? L;
  const pts = []; for (let i = 0; i < pts0.length; i++) if (S0[i] >= d0 - 1 && S0[i] <= d1 + 1) pts.push(pts0[i]);
  if (pts.length < 2) return;
  const a = o.a ?? 1, lw = Math.max(1, w * z);
  if (SIDE.thin[key]) {
    const col = SIDE.thin[key], hi = o.hi > 0.5;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = a;
    const pth = () => { c.beginPath(); pts.forEach(([x, y], i) => { const [sx, sy] = K.S(cam, x, y); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }); };
    c.strokeStyle = P[hi ? 'w' : col[0]]; c.lineWidth = hi ? lw + 2 : lw; pth(); c.stroke();
    if (lw >= 3 || hi) { c.strokeStyle = P[col[1]]; c.lineWidth = Math.max(1, hi ? lw : lw - 2); pth(); c.stroke(); }
    c.restore();
    if (!o.still && lw >= 1.5) {                                // slow markers so the direction reads
      const gap = SIDE.FLOW.gap, ph = (T * SIDE.FLOW.speed * 0.5) % gap, mk = hi ? 'w' : col[1] === 'w' ? col[0] : (lw >= 3 ? 'w' : col[1]);
      for (let d = d0 + ph; d < d1; d += gap) { const [x, y] = at(pts0, S0, d), [sx, sy] = K.S(cam, x, y), s = Math.max(1, Math.round(lw * 0.6)); PIX.rect(c, Math.round(sx - s / 2), Math.round(sy - s / 2), s, s, mk); }
    }
    return;
  }
  const ramp = R(o.ramp || SIDE.blood[key] || 'vb'), n = ramp.length;
  LIT.tube(c, cam, pts, w, ramp, { alpha: a, bias: o.hi ? 0.18 * o.hi : 0 });
  // flow markers: short dashes one step lighter, one steady speed, never pulsing
  if (!o.still) {
    const gap = SIDE.FLOW.gap, ph = (T * SIDE.FLOW.speed) % gap, dl = gap * 0.36, mc = ramp[Math.min(n - 1, o.hi ? 5 : 4)];
    for (let d = Math.ceil((d0 - ph) / gap) * gap + ph; d < d1; d += gap) {
      if (d < d0) continue;
      const seg = []; for (let q = 0; q <= 3; q++) seg.push(at(pts0, S0, Math.min(d1, d + dl * q / 3)));
      if (lw >= 3) LIT.line(c, cam, seg.map(p => [p[0], p[1]]), mc, { alpha: a }); else { const [sx, sy] = K.S(cam, seg[0][0], seg[0][1]); PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, mc); }
    }
  }
  if (o.marker != null && o.marker >= d0 && o.marker <= d1) SIDE.drop(c, cam, ...at(pts0, S0, o.marker), ramp);
};
// the bright drop the camera follows (S05, S06, S19): a disc in the blood's lightest step with a white rim and a chevron
SIDE.drop = (c, cam, x, y, ang, ramp, a = 1) => {
  const [sx, sy] = K.S(cam, x, y), r = Math.max(3, 2.4 * cam.z);
  c.save(); c.globalAlpha = a;
  LIT.sphere(c, sx, sy, r + 1.5, ['w', 'w', 'w', 'w'], {}); LIT.sphere(c, sx, sy, r, ramp ? [ramp[2], ramp[3], ramp[4], ramp[5]] : ['ab2', 'ab3', 'ab4', 'ab5'], {});
  const ux = Math.cos(ang), uy = Math.sin(ang), L = r * 1.6;
  for (const s of [-1, 1]) PIX.bline(c, sx + ux * (r + 2 + L), sy + uy * (r + 2 + L), sx + ux * (r + 3) - uy * s * r, sy + uy * (r + 3) + ux * s * r, 'w');
  c.restore();
};
// a highlight that runs along a chain of routes: the stretch [d − len, d] redrawn bright, with the drop at its head
SIDE.comet = (c, cam, keys, d, len = 60, o = {}) => {
  let off = 0;
  for (const k of keys) {
    const pts = RT[k], S0 = pts.S, L = S0[S0.length - 1], a = d - len - off, b = d - off;
    if (b > 0 && a < L) {
      const seg = []; for (let q = Math.max(0, a); q <= Math.min(L, b); q += 1.5) seg.push(at(pts, S0, q));
      const ramp = R(o.ramp || SIDE.blood[k] || 'mt');
      if (seg.length > 1) LIT.tube(c, cam, seg.map(p => [p[0], p[1]]), (SIDE.width[k] || 3) + 1.5, [ramp[3], ramp[4], ramp[5], 'w'], { alpha: o.a ?? 1 });
      if (b < L && o.head !== false) SIDE.drop(c, cam, ...at(pts, S0, b), ramp, o.a ?? 1);
    }
    off += L;
  }
};
SIDE.routeLen = keys => keys.reduce((s, k) => s + SIDE.len(k), 0);
// a point along a chain of routes (d from the start of the first)
SIDE.chainAt = (keys, d) => { for (const k of keys) { const L = SIDE.len(k); if (d <= L) return SIDE.at(k, Math.max(0, d)); d -= L; } const k = keys[keys.length - 1]; return SIDE.at(k, SIDE.len(k)); };
// a part label anchored to a world point: o = {text, at: [x, y], dx, dy (text offset from the anchor, screen px), t0, t1,
// col, align}. The text is kept inside the frame.
SIDE.label = (c, cam, t, o) => {
  const [ax, ay] = K.S(cam, o.at[0], o.at[1]), tw = PIX.textWidth(o.text);
  let x = ax + (o.dx ?? 12), y = ay + (o.dy ?? -4);
  const left = o.align === 'right' ? x - tw : o.align === 'center' ? x - tw / 2 : x;
  const shift = left < 4 ? 4 - left : left + tw > W - 4 ? W - 4 - (left + tw) : 0;
  CAP.part(c, t, { text: o.text, ax, ay, x: x + shift, y: U.clamp(y, 76, H - 14), t0: o.t0, t1: o.t1, col: o.col || 'w', lineCol: o.lineCol || 'g6', align: o.align, dot: o.dot });
};
// ---------- the whole side view, back to front ----------
// o: { tubes: {key: {…SIDE.tube options, hide}}, machine: {…MACHINE options}, heartO, inner, dimRoom }
SIDE.ORDER_BACK = ['waterIn', 'waterOut', 'o2', 'air', 'gas', 'exhaust', 'bag', 'cardio', 'suctionRet', 'suction', 'resPump', 'pumpOxy', 'venous', 'arterial'];
SIDE.scene = (c, cam, T, o = {}) => {
  SIDE.room(c, cam, T, o);
  SIDE.window(c, cam, T, { heartO: o.heartO, inner: o.inner });
  MACHINE.draw(c, cam, T, o.machine || {});
  const to = o.tubes || {};
  for (const k of SIDE.ORDER_BACK) if (!(to[k] && to[k].hide)) SIDE.tube(c, cam, k, T, to[k] || {});
  MACHINE.front(c, cam, T, o.machine || {});
};
// ---------- the camera through the side-view scenes (film time). Keys are [scene, local time, x, y, z]: they follow the
// scene starts in film.js, so changing a duration keeps every move attached to its scene. ----------
const KEYS = [
  ['s04_machine', 0.25, -48, -66, 1.7], ['s04_machine', 2.0, 0, 8, 1.0], ['s04_machine', 4.0, 0, 8, 1.0],
  ['s06_drain', 0.0, -46, -86, 2.4], ['s06_drain', 0.5, -50, -84, 2.3], ['s06_drain', 2.6, -62, -8, 2.2], ['s06_drain', 3.0, -62, -4, 2.2],
  ['s07_reservoir', 0.8, -62, 30, 3.3], ['s07_reservoir', 3.0, -62, 34, 3.3],
  ['s08_pump', 0.9, -14, 110, 4.4], ['s08_pump', 5.0, -14, 112, 4.4],
  ['s09_heater', 0.9, 100, 112, 2.5], ['s09_heater', 3.0, 102, 114, 2.5],
  ['s11_gas', 0.0, 78, -8, 4.2], ['s11_gas', 1.5, 76, -6, 4.2], ['s11_gas', 3.0, 62, 24, 3.2],
  ['s12_oxygenator', 1.4, 52, 44, 3.4], ['s12_oxygenator', 3.0, 52, 44, 14],
  ['s17_co2', 3.0, 52, 44, 14], ['s18_filter', 0.0, 52, 10, 3.2], ['s18_filter', 0.9, 52, 9, 3.2], ['s18_filter', 1.9, 52, -14, 3.4], ['s18_filter', 3.0, 52, -15, 3.4],
  ['s19_return', 1.2, 36, -84, 2.0], ['s19_return', 2.2, -36, -96, 4.0], ['s19_return', 3.0, -36, -97, 4.2],
  ['s21_cardioplegia', 0.0, 22, -8, 3.6], ['s21_cardioplegia', 0.6, 22, -8, 3.6], ['s21_cardioplegia', 1.6, 4, -64, 2.4], ['s21_cardioplegia', 2.5, -34, -96, 4.2], ['s21_cardioplegia', 3.9, -34, -97, 4.4],
  ['s22_suction', 0.0, -34, -97, 4.4], ['s22_suction', 1.25, -62, 10, 1.5], ['s22_suction', 3.9, -62, 13, 1.5],
  ['s23_perfusionist', 0.0, -26, -24, 2.6], ['s23_perfusionist', 2.9, -25, -25, 2.7],
  ['s24_system', 0.0, -25, -25, 2.7], ['s24_system', 0.9, 0, 8, 1.0], ['s24_system', 3.9, 0, 8, 1.0],
  ['s25_loop', 0.0, 0, 8, 1.0], ['s25_loop', 1.7, -36, -98, 3.0]];
let TR = null;
SIDE.track = T => {
  if (!TR) TR = K.camTrack(KEYS.map(([id, lt, x, y, z]) => [window.T0[id] + lt, x, y, z]));
  return TR(T);
};
SIDE.init = () => {
  const ts = KEYS.map(([id, lt]) => window.T0[id] + lt);
  for (let i = 1; i < ts.length; i++) if (!(ts[i] > ts[i - 1])) throw new Error('SIDE.track keys not increasing at ' + KEYS[i].join(' '));
};
})();
