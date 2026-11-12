// MACRO — the bedside, in one locked front-view layout: the patient half-sitting on the ICU bed (head of the bed raised,
// the face left plain), the chest a transparent anatomical cutaway (ribs, both lungs, heart, diaphragm, trachea, bronchial
// tree); the endotracheal tube through the mouth into the trachea, its cuff sealing it; the Y-connector beside the head;
// the dual-limb circuit running down to the ventilator: the inspiratory limb from the heated humidifier, the expiratory
// limb into the expiratory port; the ventilator in three-quarter view with its screen (pressure, flow and volume waveforms
// and its own numbers), the humidifier on its bracket, the air and oxygen hoses to the wall outlets.
// World units: at z = 1 one unit is one art pixel; the chest centre is the origin. The lungs expand with BREATH.v.
(() => {
const { W, H, P } = PIX;
const MACRO = window.MACRO = { NAME: 'MACRO' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
const path = BREATH.path;
// a closed smooth shape through control points (Catmull-Rom) → Path2D and its bounds
const blob = pts => {
  const n = pts.length, p = new Path2D(), sm = [];
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t; sm.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  sm.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath();
  return { path: p, box: LIT.ptsBox(sm), pts: sm };
};
MACRO.blob = blob;
// ---------- layout ----------
const LY = MACRO.LY = {
  head: { x: 0, y: -134, rx: 22, ry: 26 }, mouth: [0, -113],
  trachea: { x0: -6, x1: 6, top: -97, carina: -45 }, ettTip: -60, cuff: [-76, -67],
  ypc: [36, -128],
  vent: { x: 84, y: 214, w: 92, h: 96, d: 22 }, screen: { x: 88, y: 146, w: 84, h: 58 },
  pInsp: [84, 292], pExp: [84, 232],
  humid: { x0: 22, x1: 50, y0: 296, y1: 326 },
  wall: { x: 230, o2: [236, 176], air: [236, 204] },
};
MACRO.CHEST = { x: 0, y: -18, z: 2.1 };                // the opening composition (S01, S39–S40): the chest fills the frame
MACRO.WIDE = { x: 40, y: 118, z: 0.6 };                // the whole set-up (S06 end, S37)
// ---------- routes, in the direction of inspiration ----------
const RT = MACRO.R = {};
RT.ett = path([[30, -125], [24, -124], [16, -121], [8, -116], [2, -112], [0, -106], [0, -96], [0, -80], [0, -60]], 1);   // Y → mouth → tube tip
RT.trachea = path([[0, -60], [0, -52], [0, -45]], 1);
RT.bronR = path([[0, -45], [-8, -38], [-16, -31], [-21, -26]], 1);            // right main bronchus (viewer's left)
RT.bronL = path([[0, -45], [8, -39], [16, -33], [23, -26]], 1);
RT.inspConn = path([[84, 292], [74, 294], [64, 298], [56, 302]], 1);          // ventilator outlet → humidifier inlet
RT.humid = path([[52, 304], [44, 310], [34, 310], [27, 304], [26, 298]], 1);  // over the water, inside the chamber
RT.insp = path([[27, 294], [26, 262], [32, 200], [42, 120], [52, 30], [56, -50], [54, -100], [47, -125], [42, -133]], 2);
RT.exp = path([[43, -122], [57, -112], [70, -70], [74, 20], [72, 120], [70, 190], [72, 222], [84, 232]], 2);
RT.hoseO2 = path([[236, 176], [214, 178], [196, 196], [184, 236], [177, 252]], 2);
RT.hoseAir = path([[236, 204], [218, 210], [204, 230], [190, 262], [178, 272]], 2);
MACRO.WIDTH = { insp: 7, exp: 7, inspConn: 6, ett: 5 };
// the full inspiratory route from the ventilator outlet to the carina, and the expiratory route from the carina back
MACRO.inspRoute = path([...RT.inspConn, ...RT.humid, ...RT.insp, [36, -128], ...RT.ett, ...RT.trachea].map(p => [p[0], p[1]]), 1);
MACRO.expRoute = path([...RT.trachea.slice().reverse(), ...RT.ett.slice().reverse(), [36, -128], ...RT.exp].map(p => [p[0], p[1]]), 1);
// ---------- the lungs expand with v: the bases move down (the diaphragm descends), the sides move out a little ----------
const EX = MACRO.ex = (x, y, v) => { const cx = x < 0 ? -6 : 6, s = 1 + 0.055 * v; return [cx + (x - cx) * s, y + clamp((y + 34) / 76) * 10 * v]; };
const LUNG_R = [[-20, -84], [-34, -78], [-48, -58], [-56, -28], [-60, 6], [-58, 34], [-44, 42], [-26, 40], [-12, 30], [-8, 4], [-9, -30], [-13, -62]];
const LUNG_L = [[20, -82], [36, -74], [50, -54], [58, -24], [61, 10], [57, 36], [42, 44], [30, 42], [24, 30], [16, 14], [16, -6], [11, -32], [14, -64]];
const HEART = [[4, 0], [18, -6], [32, 2], [40, 18], [36, 34], [20, 42], [4, 38], [-4, 24], [-6, 10]];
// the bronchial tree inside the lungs (generated once): segments [x0, y0, x1, y1, w]
const TREE = [];
const grow = (x, y, ang, len, w, depth, seed) => {
  const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len; TREE.push([x, y, x1, y1, w]);
  if (depth <= 0) return;
  for (const s of [-1, 1]) grow(x1, y1, ang + s * (0.42 + 0.22 * U.hash(seed, s + 3)), len * (0.72 + 0.1 * U.hash(seed, s + 7)), w * 0.7, depth - 1, seed * 3 + (s + 1));
};
grow(-21, -26, Math.PI * 0.62, 16, 3.6, 4, 7); grow(-21, -26, Math.PI * 1.08, 13, 3.0, 3, 11); grow(-21, -26, Math.PI * 1.38, 14, 3.0, 3, 13);
grow(23, -26, Math.PI * 0.4, 16, 3.6, 4, 17); grow(23, -26, Math.PI * 1.7, 15, 3.0, 3, 19); grow(23, -26, Math.PI * 0.05, 12, 2.6, 3, 23);
MACRO.TREE = TREE;
const TORSO = [[-14, -100], [-32, -94], [-62, -84], [-71, -60], [-66, -20], [-62, 30], [-60, 70], [60, 70], [62, 30], [66, -20], [71, -60], [62, -84], [32, -94], [14, -100]];
// ---------- drawing helpers ----------
const tube = (c, cam, pts, w, ramp, o = {}) => LIT.tube(c, cam, pts, w, typeof ramp === 'string' ? R(ramp) : ramp, o);
const line = (c, cam, pts, col, o) => LIT.line(c, cam, pts, col, o);
const rr = (c, cam, x0, y0, x1, y1, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fill(); }, LIT.wbox(cam, [x0, y0, x1, y1]), typeof ramp === 'string' ? R(ramp) : ramp, o);
MACRO.rr = rr;
// ---------- the bed and the patient ----------
MACRO.bed = (c, cam, T) => {
  rr(c, cam, -98, -184, 98, 214, 10, ['g3', 'g4', 'g5', 'g6', 'g7'], { bias: -0.05 });             // the raised mattress
  rr(c, cam, -104, -190, 104, -176, 4, R('g'), { bias: 0.1 });                                      // head rail
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.ellipse(0, -142, 52, 24, 0, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [-54, -168, 54, -116]), R('iv'), { bias: 0.08 });   // pillow
};
MACRO.patient = (c, cam, T, o = {}) => {
  const v = o.v ?? BREATH.v(T), z = cam.z;
  // arms at the sides, resting on the blanket
  for (const s of [-1, 1]) {
    tube(c, cam, [[s * 64, -80], [s * 74, -40], [s * 76, 10], [s * 72, 52]], 15, 'sk', { bias: -0.05 });
    tube(c, cam, [[s * 72, 52], [s * 60, 84], [s * 44, 100]], 12, 'sk', { bias: -0.02 });
  }
  // neck and head (the face left plain: no features)
  tube(c, cam, [[0, -112], [0, -94]], 26, 'sk', { bias: -0.04 });
  const Hd = LY.head;
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.ellipse(Hd.x, Hd.y, Hd.rx, Hd.ry, 0, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [Hd.x - Hd.rx, Hd.y - Hd.ry, Hd.x + Hd.rx, Hd.y + Hd.ry]), R('sk'), {});
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.ellipse(Hd.x, Hd.y - 9, Hd.rx + 1, Hd.ry - 8, 0, Math.PI, TAU); ctx.fill(); }, LIT.wbox(cam, [Hd.x - Hd.rx - 2, Hd.y - Hd.ry - 2, Hd.x + Hd.rx + 2, Hd.y]), ['g1', 'g2', 'g3', 'g4'], {});   // hair
  // the torso: skin seen as a translucent cutaway (outline + light fill), the anatomy inside
  const tor = blob(TORSO);
  LIT.path(c, cam, tor.path, tor.box, ['sk1', 'sk2', 'sk3', 'sk4'], { alpha: 0.55, bias: -0.1 });
  MACRO.chest(c, cam, T, v, o);
  line(c, cam, tor.pts.concat([tor.pts[0]]), 'sk4', { alpha: 0.9 });
  // the gown's neckline and the blanket over the abdomen and legs
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.moveTo(-104, 214); ctx.lineTo(-104, 62); ctx.quadraticCurveTo(-60, 46, 0, 54); ctx.quadraticCurveTo(60, 46, 104, 62); ctx.lineTo(104, 214); ctx.closePath(); ctx.fill(); }, LIT.wbox(cam, [-106, 44, 106, 214]), R('dr'), { bias: 0.08 });
  if (z > 0.5) for (const x of [-60, -20, 24, 66]) line(c, cam, [[x, 70], [x + 6, 210]], 'dr2');
  for (const s of [-1, 1]) tube(c, cam, [[s * 60, 84], [s * 44, 100]], 11, 'sk', { bias: -0.02 });   // hands on the blanket
};
// the chest anatomy (inside the cutaway), expanding with v
MACRO.chest = (c, cam, T, v, o = {}) => {
  const z = cam.z, E = p => EX(p[0], p[1], v);
  // heart behind the lungs' medial edges
  const hb = blob(HEART); LIT.path(c, cam, hb.path, hb.box, R('hr'), { bias: -0.05 });
  // the diaphragm: a dome under each lung, descending with v
  for (const s of [-1, 1]) line(c, cam, [[s * 8, 44], [s * 24, 47], [s * 44, 49], [s * 60, 42]].map(([x, y]) => [x, y + 10 * v]), 'hr2');
  // lungs: soft pink, translucent membrane edges
  for (const L of [LUNG_R, LUNG_L]) { const b = blob(L.map(E)); LIT.path(c, cam, b.path, b.box, R('al'), { alpha: 0.92, bias: -0.06 + 0.05 * v }); }
  // the bronchial tree (coral), drawn inside the lungs
  for (const [x0, y0, x1, y1, w] of TREE) { const a = E([x0, y0]), b = E([x1, y1]); if (w * z < 0.6) continue; tube(c, cam, [a, b], w, 'aw', { bias: 0.04 }); }
  tube(c, cam, [E([0, -45]), E([-8, -38]), E([-16, -31]), E([-21, -26])], 6, 'aw', { bias: 0.04 });
  tube(c, cam, [E([0, -45]), E([8, -39]), E([16, -33]), E([23, -26])], 6, 'aw', { bias: 0.04 });
  // the trachea with its cartilage rings
  const Tr = LY.trachea;
  rr(c, cam, Tr.x0, Tr.top, Tr.x1, Tr.carina + 2, 4, R('aw'), { bias: 0.08 });
  if (z > 1.4) for (let y = Tr.top + 3; y < Tr.carina - 1; y += 4) line(c, cam, [[Tr.x0 + 0.5, y], [Tr.x1 - 0.5, y]], 'aw5', { alpha: 0.8 });
  rr(c, cam, Tr.x0 + 2, Tr.top + 1, Tr.x1 - 2, Tr.carina, 2, ['n0', 'n1', 'n2', 'n3'], { edge: false });   // the lumen
  // ribs: faint bands over the lungs (the transparent cage) and the sternum
  if (z > 0.45) {
    for (let k = 0; k < 7; k++) for (const s of [-1, 1]) {
      const y = -74 + k * 15, pts = [[s * 5, y - 2], [s * 26, y - 6], [s * 50, y + 2], [s * 63, y + 16]];
      line(c, cam, pts.map(p => [p[0], p[1] + (k > 3 ? 2 * v : 0)]), 'iv3', { alpha: 0.45 });
    }
    line(c, cam, [[0, -88], [0, 6]], 'iv3', { alpha: 0.4 });
  }
  // the endotracheal tube inside the airway: shaft, cuff (sealing against the tracheal wall), bevelled tip
  const c0 = LY.cuff;
  rr(c, cam, -5.5, c0[0], 5.5, c0[1], 4, ['tw1', 'tw2', 'tw3', 'tw4'], { alpha: 0.85 });
  rr(c, cam, -3, LY.mouth[1] + 4, 3, LY.ettTip, 1, ['tw2', 'tw3', 'tw4', 'w'], {});
  rr(c, cam, -1.8, LY.mouth[1] + 4, 1.8, LY.ettTip - 1, 1, ['n0', 'n1', 'n2'], { edge: false });
  if (z > 1.2) line(c, cam, [[2.6, LY.mouth[1] + 6], [2.6, c0[0]]], 'tw1');                          // the pilot line of the cuff
};
// ---------- the circuit: corrugated, transparent limbs; the Y-connector ----------
MACRO.limb = (c, cam, pts, w, o = {}) => {
  const z = cam.z;
  tube(c, cam, pts, w, ['tw1', 'tw2', 'tw3', 'tw4'], { alpha: o.a ?? 1 });
  if (w * z >= 3) tube(c, cam, pts, w * 0.62, ['n0', 'n1', 'n2'], { edge: false, alpha: o.a ?? 1 });
  if (w * z >= 5) {                                                                                 // the corrugation ribs
    const L = BREATH.len(pts), step = Math.max(1.6, 4 / z);
    for (let d = 1; d < L; d += step) { const [x, y, a] = BREATH.at(pts, pts.S, d), nx = -Math.sin(a) * w * 0.5, ny = Math.cos(a) * w * 0.5; line(c, cam, [[x - nx, y - ny], [x + nx, y + ny]], 'tw3', { alpha: 0.55 }); }
  }
};
MACRO.ypiece = (c, cam) => {
  const [x, y] = LY.ypc;
  tube(c, cam, [[x - 8, y + 3], [x, y]], 6, ['tw2', 'tw3', 'tw4', 'w'], {});
  tube(c, cam, [[x, y], [x + 7, y - 6]], 6, ['tw2', 'tw3', 'tw4', 'w'], {});
  tube(c, cam, [[x, y], [x + 8, y + 6]], 6, ['tw2', 'tw3', 'tw4', 'w'], {});
  tube(c, cam, [[x - 10, y + 3], [x - 6, y + 2]], 6, R('g'), { bias: 0.1 });                        // the 15 mm connector
};
// ---------- the ventilator (three-quarter view), its humidifier, hoses and the wall outlets ----------
MACRO.vent = (c, cam, T, o = {}) => {
  const V = LY.vent, Sc = LY.screen, z = cam.z, Hu = LY.humid;
  // the wall rail with its two gas outlets and the hoses
  rr(c, cam, LY.wall.x - 4, 150, LY.wall.x + 14, 232, 3, R('g'), { bias: 0.05 });
  for (const [k, ramp] of [['o2', 'o2'], ['air', 'g']]) { const [ox, oy] = LY.wall[k]; LIT.sphere(c, ...K.S(cam, ox, oy), 5 * z, R(ramp), { bias: 0.1 }); }
  MACRO.limb(c, cam, RT.hoseO2, 4, {}); MACRO.limb(c, cam, RT.hoseAir, 4, {});
  // the stand: pole, base, wheels
  rr(c, cam, V.x + 38, V.y + V.h, V.x + 50, V.y + V.h + 96, 2, R('g'), { bias: 0.08 });
  LIT.block(c, cam, V.x - 4, V.y + V.h + 96, V.w + 8, 10, 14, R('g'), { front: 3, top: 6, side: 1 });
  for (const wx of [V.x + 6, V.x + V.w - 6]) LIT.sphere(c, ...K.S(cam, wx, V.y + V.h + 110), Math.max(2, 5 * z), R('g'), { bias: -0.2 });
  // the body: a light-grey block in three-quarter view
  LIT.block(c, cam, V.x, V.y, V.w, V.h, V.d, R('vt'), { front: 3, top: 5, side: 1 });
  if (z > 0.5) { line(c, cam, [[V.x + 6, V.y + 74], [V.x + V.w - 6, V.y + 74]], 'vt1'); for (let k = 0; k < 4; k++) line(c, cam, [[V.x + V.w - 30 + k * 6, V.y + 80], [V.x + V.w - 30 + k * 6, V.y + 90]], 'vt1'); }
  // knob and power light
  LIT.sphere(c, ...K.S(cam, V.x + V.w - 16, V.y + 52), Math.max(2, 6 * z), R('g'), { bias: 0.15 });
  { const [lx, ly] = K.S(cam, V.x + V.w - 10, V.y + 8), s = Math.max(1, Math.round(1.6 * z)); PIX.rect(c, Math.round(lx), Math.round(ly), s, s, 'mt4'); }
  // ports on the patient side (left): expiratory (upper), inspiratory (lower); each a steel ring
  for (const [px, py] of [LY.pExp, LY.pInsp]) { tube(c, cam, [[px - 6, py], [px + 1, py]], 9, R('g'), { bias: 0.12 }); }
  // the screen on its mount
  LIT.block(c, cam, Sc.x - 3, Sc.y - 3, Sc.w + 6, Sc.h + 6, 8, R('g'), { front: 3, top: 6, side: 1 });
  rr(c, cam, V.x + V.w / 2 - 6, Sc.y + Sc.h + 2, V.x + V.w / 2 + 6, V.y, 1, R('g'), {});
  const [ax, ay] = K.S(cam, Sc.x, Sc.y), [bx, by] = K.S(cam, Sc.x + Sc.w, Sc.y + Sc.h);
  if (bx - ax > 10) MONITOR.draw(c, Math.round(ax), Math.round(ay), Math.round(bx - ax), Math.round(by - ay), T, o.monitor || {});
  // the heated humidifier: a clear chamber with water on a heater base
  rr(c, cam, Hu.x0 - 4, Hu.y1, Hu.x1 + 4, Hu.y1 + 14, 3, R('g'), { bias: 0.06 });
  { const [hx, hy] = K.S(cam, Hu.x0, Hu.y1 + 3), [hx1] = K.S(cam, Hu.x1, 0); PIX.rect(c, Math.round(hx), Math.round(hy), Math.max(1, Math.round(hx1 - hx)), Math.max(1, Math.round(z)), (o.heat ?? 0.6) > 0.5 ? 'ht4' : 'ht2'); }
  rr(c, cam, Hu.x0, Hu.y0, Hu.x1, Hu.y1, 4, ['n1', 'n2', 'tw1', 'tw2'], { bias: -0.1 });
  rr(c, cam, Hu.x0 + 2, Hu.y0 + 16, Hu.x1 - 2, Hu.y1 - 2, 3, R('wa'), {});
  line(c, cam, [[Hu.x0, Hu.y0 + 2], [Hu.x0, Hu.y1 - 2]], 'tw4'); line(c, cam, [[Hu.x1, Hu.y0 + 2], [Hu.x1, Hu.y1 - 2]], 'tw2');
  rr(c, cam, Hu.x0 + 2, Hu.y0 - 4, Hu.x0 + 8, Hu.y0 + 1, 1, R('tw'), {}); rr(c, cam, Hu.x1 - 8, Hu.y0 - 4, Hu.x1 - 2, Hu.y0 + 1, 1, R('tw'), {});
};
// ---------- the whole bedside, back to front ----------
// o: { v, flowIn (0..1: inspiratory trails), flowOut (0..1: expiratory trails), hiInsp, hiExp, pulse: d (along inspRoute),
//      monitor: {…}, heat }
MACRO.scene = (c, cam, T, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  // a quiet room: a darker floor band under the bed and the ventilator
  const [, fy] = K.S(cam, 0, 420); if (fy < H) PIX.rect(c, 0, Math.round(fy), W, H, 'n0');
  MACRO.bed(c, cam, T);
  MACRO.patient(c, cam, T, o);
  MACRO.vent(c, cam, T, o);
  // the circuit
  MACRO.limb(c, cam, RT.inspConn, 6, {});
  MACRO.limb(c, cam, RT.exp, 7, {}); MACRO.limb(c, cam, RT.insp, 7, {});
  tube(c, cam, RT.ett.slice(0, 5), 5, ['tw2', 'tw3', 'tw4', 'w'], {});                                // the tube outside the mouth
  MACRO.ypiece(c, cam);
  // airflow: cyan trails toward the patient while the ventilator delivers, amber trails back during expiration
  const fi = o.flowIn ?? 0, fo = o.flowOut ?? 0;
  if (fi > 0) { for (const k of ['inspConn', 'humid', 'insp']) BREATH.stream(c, cam, RT[k], T, { n: Math.round(BREATH.len(RT[k]) / 7), speed: 90, len: 3, a: fi, seed: k.length, spread: 1.5 }); BREATH.stream(c, cam, RT.ett, T, { n: 14, speed: 70, len: 3, a: fi, seed: 5, spread: 0.6 }); }
  if (fo > 0) { BREATH.stream(c, cam, RT.exp, T, { n: Math.round(BREATH.len(RT.exp) / 8), speed: 70, len: 3, a: fo, seed: 9, spread: 1.5, ramp: ['am3', 'am4', 'am5'] }); BREATH.stream(c, cam, RT.ett, T, { n: 12, speed: 60, dir: -1, len: 3, a: fo, seed: 6, spread: 0.6, ramp: ['am3', 'am4', 'am5'] }); }
  if (o.hiInsp > 0) BREATH.pulse(c, cam, MACRO.inspRoute, o.hiInsp, { len: 60, w: 5 });
  if (o.hiExp > 0) BREATH.pulse(c, cam, MACRO.expRoute, o.hiExp, { len: 60, w: 5, ramp: ['am3', 'am4', 'am5', 'w'] });
  if (o.pulse != null) BREATH.pulse(c, cam, MACRO.inspRoute, o.pulse, { len: 34, w: 4 });
};
MACRO.init = () => {};
})();

// MONITOR — the ventilator's own screen: pressure (yellow), flow (green) and volume (cyan) against time for one breath per
// sweep, the classic sweeping cursor, and the machine's numbers when the screen is large enough. sweep: s in [0, 1] (how
// far the cursor has drawn this breath); full: the whole breath drawn; timer: 0..1 (the breath timer ring, top right).
(() => {
const MONITOR = window.MONITOR = { NAME: 'MONITOR' };
const clamp = U.clamp;
MONITOR.draw = (c, X, Y, w, h, T, o = {}) => {
  const S = BREATH.SET, s0 = o.sweep ?? ((T * 0.24) % 1), num = w >= 120, gw = num ? Math.round(w * 0.68) : w;
  PIX.rect(c, X, Y, w, h, 'k'); PIX.rect(c, X, Y, w, 1, 'g3');
  const rows = [['P', 'ys', v => v.P / 30, 0], ['F', 'mt', v => v.F / 64, 0.5], ['V', 'cy', v => v.V / 520, 0]];
  const rh = (h - 2) / 3;
  rows.forEach(([lab, ramp, f, mid], k) => {
    const y0 = Y + 1 + k * rh, base = y0 + rh - 2 - (mid ? (rh - 4) * 0.5 : 0), amp = (rh - 4) * (mid ? 0.5 : 1);
    if (k) PIX.rect(c, X + 1, Math.round(y0), gw - 2, 1, 'n1');
    if (mid) for (let x = X + 2; x < X + gw - 2; x += 3) PIX.rect(c, x, Math.round(base), 1, 1, 'n2');
    if (k === 0) { const yp = Math.round(base - (S.PEEP / 30) * amp); for (let x = X + 2; x < X + gw - 2; x += 4) PIX.rect(c, x, yp, 2, 1, 'n3'); }
    for (let x = X + 2; x < X + gw - 2; x++) {
      const s = (x - X - 2) / (gw - 4), ahead = s > s0 && !o.full;
      if (ahead && s < s0 + 0.06) continue;                                 // the gap in front of the cursor
      const v = f(BREATH.wave(s)), yy = Math.round(base - v * amp);
      const col = ahead ? ramp + '2' : ramp + '4';
      if (w >= 60) { const y1 = Math.round(base); for (let yy2 = Math.min(yy, y1) + 1; yy2 < Math.max(yy, y1); yy2++) PIX.rect(c, x, yy2, 1, 1, ahead ? 'n1' : ramp + '1'); }
      PIX.rect(c, x, yy, 1, Math.max(1, Math.round(h / 80)), col);
    }
    if (w >= 80) PIX.text(c, lab, X + 3, Math.round(y0) + 2, ramp + '3', { shadow: null });
  });
  if (!o.full) { const cx = X + 2 + Math.round(s0 * (gw - 4)); PIX.rect(c, cx, Y + 1, 1, h - 2, 'g6'); }
  if (num) {
    const x = X + gw + 3, items = [['PPEAK', String(S.Ppeak), 'ys4'], ['PEEP', String(S.PEEP), 'ys4'], ['VT', String(S.VT), 'cy4'], ['FIO₂', String(S.FiO2), 'w'], ['RR', String(S.RR), 'mt4']];
    const lh = Math.min(11, Math.floor((h - 4) / items.length / 2) * 2 + 0), step = (h - 4) / items.length;
    items.forEach(([l, val, col], i) => { const yy = Math.round(Y + 3 + i * step); PIX.text(c, l, x, yy, 'g6', { shadow: null }); if (step >= 16) PIX.text(c, val, x, yy + 8, col, { shadow: null }); else PIX.text(c, val, X + w - 3, yy, col, { align: 'right', shadow: null }); });
    PIX.rect(c, X + gw, Y + 1, 1, h - 2, 'n2');
  }
  if (o.timer != null && w >= 60) {                                          // the breath timer ring (native UI)
    const cx = X + gw - 9, cy = Y + 8, r = 5, n = 24, q = clamp(o.timer);
    for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k / n * U.TAU, on = k / n < q; PIX.rect(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1, on ? 'ys4' : 'g3'); }
  }
};
MONITOR.init = () => {};
})();
