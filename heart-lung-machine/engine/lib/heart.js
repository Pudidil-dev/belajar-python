// HEART — the operative field: the draped table, the sternotomy window with its retractor, and the arrested heart in
// anterior view (the patient's right is the viewer's left). Nothing in the heart moves at any time: it is arrested on
// purpose for the operation. Built the codixel way, from round parts joined together, each lit from the one light of the
// film (LIT): right atrium, right ventricle (most of the front), left ventricle (the left border and the apex), pulmonary
// trunk, ascending aorta and arch, superior vena cava, both appendages, fat in the grooves with the coronary arteries.
// Cannulas: venous cannula in the right atrium; arterial cannula in the distal ascending aorta, ABOVE the cross-clamp (the
// body side); a thin cardioplegia cannula in the aortic root, below it (the heart side).
(() => {
const { W, H, P } = PIX;
const HEART = window.HEART = { NAME: 'HEART' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const R = n => window.RAMP[n];
// a closed smooth shape through control points (Catmull-Rom → Path2D) and its bounds
const blob = pts => {
  const n = pts.length, p = new Path2D(), sm = [];
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t; sm.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  sm.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath();
  return { path: p, box: LIT.ptsBox(sm), pts: sm };
};
const ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return { path: p, box: [cx - Math.max(rx, ry), cy - Math.max(rx, ry), cx + Math.max(rx, ry), cy + Math.max(rx, ry)] }; };
HEART.blob = blob; HEART.ell = ell;
// ---------- the parts (world units, anterior view) ----------
const PART = HEART.PART = {
  LV: blob([[22, -22], [36, -14], [46, 4], [48, 24], [44, 44], [36, 60], [28, 64], [24, 50], [30, 28], [30, 4]]),
  RV: blob([[-18, -22], [-4, -26], [12, -28], [24, -20], [32, -2], [36, 20], [34, 42], [28, 58], [12, 58], [-6, 50], [-16, 38], [-20, 16], [-22, -4]]),
  RA: blob([[-26, -26], [-38, -24], [-50, -12], [-56, 6], [-54, 26], [-44, 40], [-30, 42], [-20, 30], [-18, 8], [-20, -14]]),
  RAA: blob([[-20, -30], [-30, -34], [-38, -30], [-34, -22], [-24, -18], [-16, -20]]),
  LAA: blob([[30, -30], [40, -36], [46, -30], [42, -22], [32, -20]]),
};
const AORTA = [[-12, -18], [-14, -38], [-15, -56], [-12, -72], [0, -84], [16, -88], [30, -82], [38, -72]];
const PA = [[6, -18], [12, -34], [20, -50], [26, -62]];
const SVC = [[-31, -112], [-31, -80], [-31, -50], [-33, -30]];
const GROOVE_R = [[-19, -20], [-21, -2], [-20, 18], [-16, 34], [-8, 46]];          // right AV groove (fat + right coronary artery)
const GROOVE_L = [[22, -18], [28, 2], [32, 24], [32, 44], [30, 58]];               // anterior interventricular groove (fat + LAD)
const DIAG = [[30, 4], [40, 16], [44, 30]];                                         // a diagonal branch over the LV
const sm = (p, s = 1.5) => WORLD.smooth(p, s);
HEART.AORTA = AORTA;
HEART.CLAMP_Y = -46; HEART.CARDIO = [-6, -30];
// ---------- the field: drapes, window, retractor ----------
HEART.field = (c, cam, t = 0) => {
  const S = (x, y) => K.S(cam, x, y), Wn = WORLD.LY.window, T = WORLD.LY.table;
  // the floor and the pool of operating light
  PIX.rect(c, 0, 0, W, H, 'k');
  // the table under the drapes: an oblique slab (its far end under the anaesthesia screen), the drapes hanging over its foot
  LIT.block(c, cam, T.x0 - 6, T.y1 - 6, T.x1 - T.x0 + 12, 30, 18, R('dr'), { front: 1, top: 3, side: 0 });
  LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 18 / 1); ctx.fill(); }, LIT.wbox(cam, [T.x0, T.y0, T.x1, T.y1]), R('dr'), { R: 26 * cam.z, amb: 0.3, dif: 0.6, hmul: 0.5 });
  // drape folds: long soft creases (one ramp step), lit on one side
  for (const [x0, y0, x1, y1] of [[-120, -150, -112, 480], [118, -140, 124, 470], [-60, 140, -76, 500], [56, 150, 70, 500], [-12, 200, 4, 500]]) {
    LIT.line(c, cam, [[x0, y0], [x1, y1]], 'dr1'); LIT.line(c, cam, [[x0 + 2, y0], [x1 + 2, y1]], 'dr3');
  }
  // the anaesthesia screen across the head end
  LIT.tube(c, cam, [[T.x0 - 20, WORLD.LY.screen], [T.x1 + 20, WORLD.LY.screen]], 14, R('dr'), { amb: 0.24 });
  // the incision edges: skin round the window, then the open chest
  const win = ell(Wn.x, Wn.y, Wn.rx + 8, Wn.ry + 8);
  LIT.path(c, cam, win.path, win.box, R('sk'), { Rw: 8, amb: 0.2, dif: 0.8 });
  const well = ell(Wn.x, Wn.y, Wn.rx, Wn.ry);
  LIT.path(c, cam, well.path, well.box, ['vb0', 'vb1', 'vb2', 'vb3', 'hr1'], { Rw: 34, amb: 0.04, dif: 0.6, edge: false, tone: (x, y, d) => -0.3 * Math.max(0, 1 - d / (10 * cam.z)) });
  // the cut edge: a thin pale band of sternum along each retractor blade
  for (const sx of [-1, 1]) LIT.tube(c, cam, WORLD.smooth([[sx * (Wn.rx - 3), Wn.y - 66], [sx * (Wn.rx + 1), Wn.y], [sx * (Wn.rx - 3), Wn.y + 66]]), 6, R('iv'), { amb: 0.3 });
  // the retractor: two steel blades along the left and right edges, the rack bar across the foot end
  for (const sx of [-1, 1]) {
    LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(sx * (Wn.rx + 2) - 7, Wn.y - 70, 14, 140, 5); ctx.fill(); }, LIT.wbox(cam, [sx * (Wn.rx + 2) - 8, Wn.y - 72, sx * (Wn.rx + 2) + 8, Wn.y + 72]), R('g'), { Rw: 6, amb: 0.22 });
  }
  LIT.tube(c, cam, [[-Wn.rx - 6, Wn.y + 92], [Wn.rx + 40, Wn.y + 92]], 8, R('g'), { amb: 0.22 });
  for (let k = 0; k < 9; k++) { const x = -Wn.rx + 8 + k * 14; LIT.line(c, cam, [[x, Wn.y + 89], [x, Wn.y + 95]], 'g2'); }
  LIT.tube(c, cam, [[Wn.rx + 40, Wn.y + 92], [Wn.rx + 46, Wn.y + 120]], 7, R('g'), { amb: 0.22 });   // the crank
};
// ---------- the heart and its cannulas ----------
// o: { glow: 0..1 (a highlight round the arterial cannula, S16) }
HEART.draw = (c, cam, t = 0, o = {}) => {
  const z = cam.z, tube = (pts, w, ramp, oo = {}) => LIT.tube(c, cam, sm(pts), w, R(ramp) || ramp, oo);
  // superior vena cava (venous blood colour: the vein wall reads dark burgundy) and the left atrial appendage, behind
  tube(SVC, 13, 'vb', { amb: 0.24, bias: 0.06 });
  LIT.path(c, cam, PART.LAA.path, PART.LAA.box, R('hr'), { bias: -0.12 });
  LIT.path(c, cam, PART.LV.path, PART.LV.box, R('hr'), { bias: -0.04 });
  // the great arteries: ascending aorta and arch (pale adventitia), the pulmonary trunk in front of its root
  // the three branches of the arch toward the head and arms (the way to the body), then the arch itself
  for (const br of [[[0, -84], [-2, -100], [-4, -118]], [[14, -88], [15, -104], [16, -120]], [[26, -86], [30, -102], [34, -118]]]) tube(br, 7, 'sk', { amb: 0.26, bias: 0.02 });
  tube(AORTA, 17, 'sk', { amb: 0.26, bias: 0.08 });
  tube(PA, 18, 'hr', { amb: 0.3, bias: 0.16 });
  LIT.path(c, cam, PART.RV.path, PART.RV.box, R('hr'), { bias: 0.04 });
  LIT.path(c, cam, PART.RA.path, PART.RA.box, R('hr'), { bias: -0.08 });
  LIT.path(c, cam, PART.RAA.path, PART.RAA.box, R('hr'), { bias: -0.02 });
  // fat in the grooves with the coronary arteries in it (inner structure: one step of contrast, thin)
  if (z > 0.5) {
    tube(GROOVE_R, 7, 'ft', { amb: 0.26, dif: 0.7 }); tube(GROOVE_L, 7, 'ft', { amb: 0.26, dif: 0.7 });
    tube(GROOVE_R, 2.2, 'hr', { bias: 0.1, edge: false }); tube(GROOVE_L, 2.2, 'hr', { bias: 0.1, edge: false }); tube(DIAG, 1.8, 'hr', { bias: 0.04, edge: false });
  }
  // the aortic cross-clamp: steel jaws across the ascending aorta, the shaft out to the top left, finger rings on the drape
  const cy = HEART.CLAMP_Y;
  tube([[-24, cy + 1], [-2, cy - 1]], 4.5, 'g', { amb: 0.24 });
  tube([[-24, cy + 1], [-40, cy - 12], [-56, cy - 30], [-66, cy - 44]], 3.6, 'g', { amb: 0.24 });
  for (const [rx, ry] of [[-70, cy - 52], [-80, cy - 43]]) LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(rx, ry, 4.2, 0, TAU); ctx.stroke(); }, LIT.wbox(cam, [rx - 6, ry - 6, rx + 6, ry + 6]), R('g'), { amb: 0.3 });
  // purse-string sutures where the cannulas enter (dark, one step)
  for (const [x, y, r] of [[-40, 6, 5], [-15, -64, 5], [-6, -30, 2.6]]) { const [sx, sy] = K.S(cam, x, y), rr = r * z, n = Math.max(8, Math.round(rr * 4)); if (z > 0.6) for (let k = 0; k < n; k += 2) { const a = k / n * TAU; PIX.rect(c, Math.round(sx + Math.cos(a) * rr), Math.round(sy + Math.sin(a) * rr * 0.8), 1, 1, 'hr1'); } }   // dotted thread
};
HEART.init = () => {};
})();
