// AIR — the worlds the gas travels through after it leaves the ventilator, from tube to blood:
//   tree     the bronchial tree, self-similar: each branch splits in two, shorter and narrower (a designated path through
//            the generations is what the camera follows, so a zoom through the branches is one continuous move)
//   acinus   a terminal bronchiole opening into alveolar ducts and sacs; capillaries over the alveolar walls; the alveoli
//            expand elastically with the breath (never ballooning)
//   barrier  the alveolar-capillary membrane in cross-section: alveolar gas · fluid lining · type I epithelial cell ·
//            interstitium · capillary endothelial cell · plasma with a red blood cell
//   humid    the heated humidifier: gas passes over warmed water and picks up water vapour (molecules, not fog)
//   tube     the corrugated inspiratory limb, transparent, with the flow streaming through
//   ypiece   the Y-connector: inspiratory and expiratory limbs joining at the patient port
(() => {
const { W, H, P } = PIX;
const AIR = window.AIR = { NAME: 'AIR' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const R = n => window.RAMP[n];
const rr = (c, cam, x0, y0, x1, y1, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fill(); }, LIT.wbox(cam, [x0, y0, x1, y1]), typeof ramp === 'string' ? R(ramp) : ramp, o);
const line = (c, cam, pts, col, o) => LIT.line(c, cam, pts, col, o);
const tube = (c, cam, pts, w, ramp, o = {}) => LIT.tube(c, cam, pts, w, typeof ramp === 'string' ? R(ramp) : ramp, o);
// ================= the bronchial tree =================
const T0 = { x: 0, y: 0, ang: Math.PI / 2, len: 120, w: 30 };
const SEQ = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1];                 // the path the camera takes (0 = left, 1 = right)
const kid = (b, s, g, id) => { const sp = 0.46 + 0.14 * hh(id, 3), a = b.ang + (s ? 1 : -1) * sp; const x0 = b.x + Math.cos(b.ang) * b.len, y0 = b.y + Math.sin(b.ang) * b.len; return { x: x0, y: y0, ang: a, len: b.len * (0.68 + 0.05 * hh(id, 5)), w: b.w * 0.74 }; };
AIR.chain = (() => { const out = [T0]; let b = T0, id = 1; for (let g = 0; g < SEQ.length; g++) { id = id * 2 + SEQ[g]; b = kid(b, SEQ[g], g, id); out.push(b); } return out; })();
AIR.chainId = g => { let id = 1; for (let k = 0; k < g; k++) id = id * 2 + SEQ[k]; return id; };
// a point at fraction f along designated branch g
AIR.chainAt = (g, f = 0.5) => { const b = AIR.chain[Math.min(AIR.chain.length - 1, g)]; return [b.x + Math.cos(b.ang) * b.len * f, b.y + Math.sin(b.ang) * b.len * f, b.ang]; };
// the camera that frames designated branch gf (fractional: generations blend in log space); k = how much of the frame
AIR.treeCam = (gf, k = 1, f = 0.55) => {
  const g0 = Math.floor(gf), q = gf - g0, a = AIR.chainAt(g0, f), b = AIR.chainAt(g0 + 1, f), la = AIR.chain[g0].len, lb = AIR.chain[Math.min(AIR.chain.length - 1, g0 + 1)].len;
  const z = Math.exp(lerp(Math.log(300 / la), Math.log(300 / lb), q)) * k;
  return { x: lerp(a[0], b[0], q), y: lerp(a[1], b[1], q), z };
};
const parenchyma = (c, cam, v) => {
  PIX.rect(c, 0, 0, W, H, 'al2');
  // alveoli far behind: small rings on a world-anchored grid, visible only when large enough
  const z = cam.z, s = 7, r = 2.6 * (1 + 0.1 * v);
  if (r * z < 1.4) return;
  const [x0, y0] = K.Sinv(cam, 0, 0), [x1, y1] = K.Sinv(cam, W, H);
  if ((x1 - x0) / s * (y1 - y0) / s > 6000) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.strokeStyle = P.al1; c.lineWidth = 1;
  for (let gy = Math.floor(y0 / s); gy <= y1 / s; gy++) for (let gx = Math.floor(x0 / s); gx <= x1 / s; gx++) {
    const jx = (hh(gx, gy) - 0.5) * 3, jy = (hh(gy, gx + 7) - 0.5) * 3, [sx, sy] = K.S(cam, gx * s + jx, gy * s + jy);
    c.beginPath(); c.arc(Math.round(sx), Math.round(sy), Math.max(1, r * z), 0, TAU); c.stroke();
  }
  c.restore();
};
// o: { v, flow: +1 (inspiration, cyan) / −1 (expiration, amber) / 0, a }
AIR.tree = (c, cam, T, o = {}) => {
  const v = o.v ?? 1, z = cam.z, flow = o.flow ?? 1, gmax = o.gmax ?? Math.floor(Math.log(300 / (120 * z)) / Math.log(0.705)) + 3;
  parenchyma(c, cam, v);
  const [vx0, vy0] = K.Sinv(cam, -20, -20), [vx1, vy1] = K.Sinv(cam, W + 20, H + 20);
  const segs = [];
  const near = (x, y, r) => !(x + r < vx0 || x - r > vx1 || y + r < vy0 || y - r > vy1);
  // draw the designated path, its side branches to a limited depth, and the subtree ahead of the camera
  const PATHID = new Set(AIR.chain.map((_, g) => AIR.chainId(g)));
  const visit = (b, g, id, rem) => {
    if (g > gmax || rem < 0) return;
    const lw = b.w * z; if (lw < 1.2) return;
    const x1 = b.x + Math.cos(b.ang) * b.len, y1 = b.y + Math.sin(b.ang) * b.len, m = b.w;
    if (!(Math.max(b.x, x1) + m < vx0 || Math.min(b.x, x1) - m > vx1 || Math.max(b.y, y1) + m < vy0 || Math.min(b.y, y1) - m > vy1)) segs.push([b, x1, y1, g, id]);
    if (!near(x1, y1, b.len * 3.4)) return;
    for (const s of [0, 1]) { const cid = id * 2 + s; visit(kid(b, s, g, cid), g + 1, cid, PATHID.has(cid) ? 9 : (PATHID.has(id) ? 2 : rem - 1)); }
  };
  visit(T0, 0, 1, 9);
  segs.sort((p, q) => p[3] - q[3]);
  for (const [b, x1, y1] of segs) tube(c, cam, [[b.x, b.y], [x1, y1]], b.w, 'aw', { bias: 0.05 });
  for (const [b, x1, y1] of segs) { if (b.w * z < 3) continue; tube(c, cam, [[b.x, b.y], [x1, y1]], b.w * 0.58, ['n1', 'n2', 'n3'], { edge: false }); }
  // gas in the lumen: short trails moving down the tree (inspiration) or up (expiration)
  if (flow !== 0) for (const [b, x1, y1, g, id] of segs) {
    if (b.w * z < 4) continue;
    const pts = BREATH.path([[b.x, b.y], [x1, y1]], 4);
    BREATH.stream(c, cam, pts, T, { n: Math.max(3, Math.round(b.len / b.w * 3)), speed: b.len * 1.6, dir: flow, seed: id, spread: b.w * 0.18, len: b.len * 0.05, w: U.clamp(Math.round(b.w * z * 0.07), 1, 3), maxTrail: U.clamp(b.w * z * 0.6, 3, 16), a: o.a ?? 1, ramp: flow > 0 ? ['cy3', 'cy4', 'cy5'] : ['am3', 'am4', 'am5'] });
  }
};
// ================= the acinus: alveolar ducts and sacs =================
const ALV = []; const DUCTS = [[[0, -110], [0, -46]], [[0, -46], [-38, 6]], [[0, -46], [4, 18]], [[0, -46], [40, 2]]];
for (const [cx, cy, n, r0] of [[-44, 22, 7, 15], [6, 40, 7, 15], [46, 18, 7, 15], [-22, -16, 3, 12], [24, -18, 3, 12], [-60, -4, 2, 12], [62, -6, 2, 12]]) {
  for (let k = 0; k < n; k++) { const a = k / n * TAU + hh(cx, k) * 0.4, d = n > 3 ? r0 * 1.1 : r0 * 0.4; ALV.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, r0 * (0.86 + 0.24 * hh(k, cy))]); }
  if (n > 3) ALV.push([cx, cy, r0 * 0.9]);
}
AIR.ALV = ALV;
// o: { v, flow, mol (0..1: molecules inside the alveoli), hi: index of an alveolus to mark }
AIR.acinus = (c, cam, T, o = {}) => {
  const v = o.v ?? 1, z = cam.z, s = 1 + 0.11 * v, sp = 1 + 0.05 * v;
  PIX.rect(c, 0, 0, W, H, 'al1');
  // the alveolar walls (sacs) behind, then the ducts, then the capillary mesh over the walls
  const A = ALV.map(([x, y, r]) => [x * sp, y * sp, r * s]);
  for (const [x, y, r] of A) LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [x - r, y - r, x + r, y + r]), ['al1', 'al2', 'al3', 'al4'], { bias: -0.05 });
  for (const [x, y, r] of A) LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.arc(x - r * 0.06, y - r * 0.06, r * 0.8, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [x - r, y - r, x + r, y + r]), ['al3', 'al4', 'al5', 'al5'], { edge: false, bias: -0.05 });   // the thin wall, light inside (gas-filled)
  for (const [x, y, r] of A) LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.36, r * 0.14, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [x - r, y - r, x + r, y + r]), ['w', 'w', 'w', 'w'], { edge: false, alpha: 0.5 });   // a soft membrane sheen
  for (const d of DUCTS) { const pts = d.map(([x, y]) => [x * sp, y * sp]); tube(c, cam, pts, 13, 'aw', { bias: 0.02 }); tube(c, cam, pts, 7, ['n0', 'n1', 'n2'], { edge: false }); }
  // capillaries: red vessels along the alveolar walls (dark where blood arrives, brighter where it leaves oxygenated)
  for (let i = 0; i < A.length; i++) { const [x, y, r] = A[i], a0 = hh(i, 2) * TAU; const pts = []; for (let k = 0; k <= 10; k++) { const a = a0 + k / 10 * 2.2; pts.push([x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9]); } line(c, cam, pts, i % 3 ? 'vb4' : 'ab4'); if (z > 2.2) line(c, cam, pts.map(([px, py]) => [px + 0.6, py + 0.6]), i % 3 ? 'vb2' : 'ab2'); }
  // gas: trails entering through the ducts (inspiration) and molecules jiggling inside the alveoli
  const flow = o.flow ?? 0;
  if (flow !== 0) for (let k = 0; k < DUCTS.length; k++) BREATH.stream(c, cam, BREATH.path(DUCTS[k].map(([x, y]) => [x * sp, y * sp]), 3), T, { n: 10, speed: 70, dir: flow, seed: 40 + k, spread: 2, len: 3, ramp: flow > 0 ? ['cy3', 'cy4', 'cy5'] : ['am3', 'am4', 'am5'] });
  if ((o.mol ?? 0) > 0) for (let i = 0; i < A.length; i++) { const [x, y, r] = A[i]; for (let k = 0; k < 3; k++) { const [jx, jy] = MICRO.jit(i * 5 + k, T, 2.2), px = x + jx * r * 1.1, py = y + jy * r * 1.1, [sx, sy] = K.S(cam, px, py); const s_ = U.clamp(Math.round(z * 0.9), 1, 3); c.save(); c.globalAlpha = o.mol; PIX.rect(c, Math.round(sx), Math.round(sy), s_, s_, (i + k) % 5 < 2 ? 'o22' : 'g3'); c.restore(); } }
};
// ================= the alveolar-capillary barrier =================
// layer boundaries (units, y): gas above 0
const LAY = AIR.LAY = { lining: [0, 5], epi: [5, 17], inter: [17, 23], endo: [23, 33], lumen: 33 };
// o: { o2 (0..1 flux shown), co2 (0..1), rbcX (world x of the cell's centre), bind: callback(i, x, y) }
AIR.barrier = (c, cam, T, o = {}) => {
  const z = cam.z, [, y0] = K.S(cam, 0, 0);
  const band = (a, b, ramp, o2 = {}) => { const [, ya] = K.S(cam, 0, a), [, yb] = K.S(cam, 0, b); LIT.shape(c, ctx => { ctx.fillRect(-2, ya, W + 4, yb - ya); }, [-2, ya - 1, W + 2, yb + 1], typeof ramp === 'string' ? R(ramp) : ramp, o2); };
  PIX.rect(c, 0, 0, W, Math.max(0, Math.round(y0)), 'n1');                                                     // alveolar gas
  band(LAY.lining[0], LAY.lining[1], ['wa2', 'wa3', 'wa4', 'tw4'], { edge: false });
  band(LAY.epi[0], LAY.epi[1], 'al', { bias: 0.02 });
  band(LAY.inter[0], LAY.inter[1], ['iv1', 'iv2', 'iv3', 'iv4'], { edge: false });
  band(LAY.endo[0], LAY.endo[1], ['hr2', 'hr3', 'hr4', 'hr5'], { bias: 0.05 });
  { const [, ya] = K.S(cam, 0, LAY.lumen); PIX.rect(c, 0, Math.round(ya), W, H, 'pl1'); }
  if (z > 2) {                                                                                                // cell detail: nuclei, the basement membrane line
    for (const [x, lay, col] of [[-60, 'epi', 'al1'], [70, 'endo', 'hr1']]) { const [a, b] = LAY[lay], [sx, sy] = K.S(cam, x, (a + b) / 2); LIT.shape(c, ctx => { ctx.beginPath(); ctx.ellipse(sx, sy, 14 * z, (b - a) * 0.3 * z, 0, 0, TAU); ctx.fill(); }, [sx - 15 * z, sy - 8 * z, sx + 15 * z, sy + 8 * z], [col, col, col, col], { edge: false }); }
    const [, yb] = K.S(cam, 0, (LAY.inter[0] + LAY.inter[1]) / 2); for (let x = 0; x < W; x += 3) PIX.rect(c, x, Math.round(yb), 2, 1, 'iv5');
  }
  // the red blood cell gliding along the capillary (side view of the biconcave disc)
  const rx = o.rbcX ?? 0;
  MICRO.rbc(c, cam, rx, LAY.lumen + 26, 30, 11, 0, {});
  // oxygen: diffusing from the gas (many) down through the layers into the plasma and the cell; carbon dioxide the other way
  const nO2 = 46, nCO = 16, per = 2.4;
  if ((o.o2 ?? 0) > 0) for (let k = 0; k < nO2; k++) {
    const ph = ((T / per + hh(k, 1)) % 1), x = (hh(k, 2) - 0.5) * 300 + MICRO.jit(k, T, 1.6)[0] * 18, depth = hh(k, 3);
    const y = lerp(-70 + depth * 50, LAY.lumen + 34, Math.pow(ph, 1.6)) + MICRO.jit(k + 100, T, 1.6)[1] * 6;
    if (ph > 0.92) continue;
    const [px, py] = K.S(cam, x, y); if (px < -6 || px > W + 6) continue;
    MICRO.o2(c, px, py, Math.max(1.2, 2.2 * Math.min(z, 3)), hh(k, 4) * 3 + T, { a: o.o2 });
  }
  if ((o.co2 ?? 0) > 0) for (let k = 0; k < nCO; k++) {
    const ph = ((T / per + hh(k, 11)) % 1), x = (hh(k, 12) - 0.5) * 300 + MICRO.jit(k + 50, T, 1.4)[0] * 18;
    const y = lerp(LAY.lumen + 30, -60, Math.pow(ph, 1.3)) + MICRO.jit(k + 150, T, 1.4)[1] * 6;
    const [px, py] = K.S(cam, x, y); if (px < -6 || px > W + 6) continue;
    MICRO.co2(c, px, py, Math.max(1.1, 1.8 * Math.min(z, 3)), hh(k, 14) * 3, { a: o.co2 });
  }
  // a few nitrogen molecules stay in the gas (they do not cross in any meaningful amount)
  for (let k = 0; k < 12; k++) { const [jx, jy] = MICRO.jit(k + 300, T, 1.2), x = (hh(k, 21) - 0.5) * 300 + jx * 30, y = -12 - hh(k, 22) * 60 + jy * 10, [px, py] = K.S(cam, x, y); MICRO.n2(c, px, py, Math.max(1.1, 2 * Math.min(z, 3)), hh(k, 23) * 3, {}); }
};
// ================= the heated humidifier (cross-section) =================
// o: { flow (0..1), vapour (0..1), heat (0..1) }
AIR.humid = (c, cam, T, o = {}) => {
  const z = cam.z, fl = o.flow ?? 1, vap = o.vapour ?? 1, ht = o.heat ?? 1;
  PIX.rect(c, 0, 0, W, H, 'k');
  rr(c, cam, -110, 84, 110, 112, 6, R('g'), { bias: 0.08 });                                             // heater base
  { const [ax, ay] = K.S(cam, -96, 88), [bx] = K.S(cam, 96, 0); PIX.rect(c, Math.round(ax), Math.round(ay), Math.round(bx - ax), Math.max(2, Math.round(3 * z)), ht > 0.5 ? 'ht4' : 'ht2'); }
  rr(c, cam, -96, -70, 96, 84, 14, ['n1', 'n2', 'tw0', 'tw1'], { bias: -0.15 });                         // the clear chamber
  rr(c, cam, -92, 22, 92, 82, 10, R('wa'), {});                                                          // warm water
  line(c, cam, [[-92, -66], [-92, 80]], 'tw4'); line(c, cam, [[92, -66], [92, 80]], 'tw2'); line(c, cam, [[-86, -70], [86, -70]], 'tw3');
  tube(c, cam, [[-150, -40], [-92, -40]], 26, ['tw1', 'tw2', 'tw3', 'tw4'], {}); tube(c, cam, [[92, -40], [150, -40]], 26, ['tw1', 'tw2', 'tw3', 'tw4'], {});
  // heat rising from the plate into the water (small orange chevrons)
  if (ht > 0) for (let k = 0; k < 8; k++) { const x = -80 + k * 23, ph = ((T * 0.8 + hh(k, 3)) % 1), y = lerp(80, 30, ph), [sx, sy] = K.S(cam, x, y), s = Math.max(2, 3 * z), a = Math.sin(Math.PI * ph) * ht; if (a < 0.2) continue; c.save(); c.globalAlpha = a; PIX.bline(c, sx - s, sy + s, sx, sy, 'ht4'); PIX.bline(c, sx, sy, sx + s, sy + s, 'ht4'); c.restore(); }
  // the gas path over the water surface, and water vapour leaving the surface and joining it
  const gp = BREATH.path([[-150, -40], [-80, -36], [-30, -6], [30, -6], [80, -36], [150, -40]], 3);
  if (fl > 0) BREATH.stream(c, cam, gp, T, { n: 90, speed: 140, seed: 7, spread: 10, len: 4, a: fl });
  if (vap > 0) for (let k = 0; k < 30; k++) {
    const ph = ((T * 0.7 + hh(k, 5)) % 1), x0 = (hh(k, 6) - 0.5) * 170, rise = Math.min(1, ph * 2), y = lerp(20, -10, rise), x = x0 + (ph > 0.5 ? (ph - 0.5) * 2 * 200 : 0) + MICRO.jit(k + 70, T, 1.8)[0] * 6;
    const [sx, sy] = K.S(cam, x, y); if (sx > W + 4) continue;
    MICRO.h2o(c, sx, sy, Math.max(1.2, 1.6 * z), k + T, { a: vap * (ph < 0.95 ? 1 : 0) });
  }
};
// ================= the corrugated tube, transparent, with the flow streaming through =================
AIR.tube = (c, cam, T, o = {}) => {
  const z = cam.z, r = 34, dir = o.dir ?? 1;
  PIX.rect(c, 0, 0, W, H, 'k');
  const [, yt] = K.S(cam, 0, -r), [, yb] = K.S(cam, 0, r);
  PIX.rect(c, 0, Math.round(yt), W, Math.round(yb - yt), 'n1');
  // corrugation: rings seen side-on, a pale front arc and a dim back arc
  const [x0] = K.Sinv(cam, -30, 0), [x1] = K.Sinv(cam, W + 30, 0), step = 9;
  for (let x = Math.floor(x0 / step) * step; x < x1; x += step) { const [sx] = K.S(cam, x, 0); for (let sy = Math.round(yt); sy <= Math.round(yb); sy++) { const q = (sy - yt) / Math.max(1, yb - yt), dx = Math.sin(q * Math.PI) * 3 * z; PIX.rect(c, Math.round(sx + dx), sy, 1, 1, 'tw2'); PIX.rect(c, Math.round(sx - dx * 0.6 + step * z * 0.5), sy, 1, 1, 'n2'); } }
  for (const [y, col] of [[-r, 'tw4'], [r, 'tw2']]) { const [, sy] = K.S(cam, 0, y); PIX.rect(c, 0, Math.round(sy) - 1, W, Math.max(2, Math.round(2 * z)), col); }
  // the flow: two layers of trails at different speeds (depth)
  const pts = BREATH.path([[x0 - 50, 0], [x1 + 50, 0]], 20);
  BREATH.stream(c, cam, pts, T, { n: 70, speed: 260 * dir, seed: 3, spread: r * 0.8, len: 10, ramp: o.ramp || ['cy2', 'cy3', 'cy4'], w: Math.max(1, Math.round(z * 0.6)) });
  BREATH.stream(c, cam, pts, T, { n: 40, speed: 380 * dir, seed: 9, spread: r * 0.55, len: 16, ramp: o.ramp2 || ['cy4', 'cy5', 'w'] });
  if ((o.vapour ?? 0) > 0) for (let k = 0; k < 20; k++) { const x = x0 + ((hh(k, 3) * (x1 - x0) + T * 300 * dir) % (x1 - x0 + 1) + (x1 - x0)) % (x1 - x0), y = (hh(k, 4) - 0.5) * r * 1.4, [sx, sy] = K.S(cam, x, y); MICRO.h2o(c, sx, sy, Math.max(1.2, 1.5 * z), k, { a: o.vapour }); }
};
// ================= the Y-connector, close =================
// o: { insp (0..1 flow from the inspiratory limb to the patient), exp (0..1 flow from the patient into the expiratory limb) }
AIR.YP = { pat: BREATH.path([[40, 0], [0, 0], [-160, 0]], 3), insp: BREATH.path([[170, -110], [90, -46], [40, 0]], 3), exp: BREATH.path([[40, 0], [90, 46], [170, 110]], 3) };
AIR.ypiece = (c, cam, T, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  const YP = AIR.YP;
  for (const [k, w] of [['insp', 40], ['exp', 40], ['pat', 30]]) { tube(c, cam, YP[k], w, ['tw1', 'tw2', 'tw3', 'tw4'], {}); tube(c, cam, YP[k], w * 0.7, ['n0', 'n1', 'n2'], { edge: false }); }
  LIT.sphere(c, ...K.S(cam, 40, 0), 26 * cam.z, ['tw1', 'tw2', 'tw3', 'tw4'], {}); LIT.sphere(c, ...K.S(cam, 40, 0), 18 * cam.z, ['n0', 'n1', 'n2', 'n2'], { edge: false });
  tube(c, cam, [[-60, 0], [-120, 0]], 34, R('g'), { bias: 0.1 }); tube(c, cam, [[-60, 0], [-160, 0]], 20, ['n0', 'n1', 'n2'], { edge: false });   // 15 mm connector toward the tube
  const fi = o.insp ?? 0, fe = o.exp ?? 0;
  if (fi > 0) { BREATH.stream(c, cam, YP.insp, T, { n: 40, speed: 220, seed: 2, spread: 12, len: 6, a: fi }); BREATH.stream(c, cam, YP.pat, T, { n: 40, speed: 220, seed: 3, spread: 9, len: 6, a: fi }); }
  if (fe > 0) { BREATH.stream(c, cam, BREATH.path([[-160, 0], [0, 0], [40, 0]], 3), T, { n: 40, speed: 180, seed: 4, spread: 9, len: 6, a: fe, ramp: ['am3', 'am4', 'am5'] }); BREATH.stream(c, cam, YP.exp, T, { n: 40, speed: 180, seed: 5, spread: 12, len: 6, a: fe, ramp: ['am3', 'am4', 'am5'] }); }
};
AIR.init = () => {};
})();
