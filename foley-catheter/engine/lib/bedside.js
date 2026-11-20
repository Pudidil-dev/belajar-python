// BED — the bedside and the urinary overview.
//   The bedside (side view, mm; x to the right, y up; mattress top at y = 0, floor at y = −620): the patient lies on the
//   back, head to the left, as a silhouette under a teal blanket (no face). The pelvis region is a cutaway window showing
//   the same voxel section as the close-ups (PELVIS, turned +90°: anterior up, superior left). The catheter leaves the
//   meatus, runs along the thigh under a securement strap to the bifurcation; the drainage tubing goes over the side of the
//   mattress in one gentle, steadily falling curve (no dependent loop) to a bag hung on the bed frame — below bladder
//   level, off the floor, its weight on the frame, not on the catheter.
//   KID — the front-view overview of S06: kidneys, renal pelvis, ureters, bladder, urethra, as a voxel map of its own.
(() => {
const { W, H, P } = PIX;
const BED = window.BED = { NAME: 'BED' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const PX0 = 0, PY0 = 98;                         // the bladder neck in bed coordinates; pelvis (xa, ys) → bed (PX0 − ys, PY0 + xa)
BED.fromPelvis = (xa, ys) => [PX0 - ys, PY0 + xa];
BED.S = (cam, x, y) => [(cam.cx ?? W / 2) + (x - cam.x) * cam.s, (cam.cy ?? H / 2) - (y - cam.y) * cam.s];
BED.pelvisCam = cam => ({ x: cam.y - PY0, y: PX0 - cam.x, s: cam.s, cx: cam.cx ?? W / 2, cy: cam.cy ?? H / 2, rot: Math.PI / 2 });
BED.BLADDER_Y = PY0 + 2;
BED.BAG = { x0: 470, x1: 650, y0: -470, y1: -205, hook: [560, -150] };
// the outside route: meatus → along the thigh (strap at x = 300) → the bifurcation (x = 380) → tubing → the bag's inlet
const MEATUS = BED.fromPelvis(65, -124);
BED.ROUTE = PELVIS.spline([MEATUS, [190, 160], [300, 150], [380, 144], [450, 132], [505, 70], [535, 0], [552, -80], [560, -150], [560, -205]], 2);
BED.STRAP = 300; BED.JUNCTION = 380;
const along = (pts, d) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= l || i === pts.length - 1) { const q = clamp(d / l); return [lerp(a[0], b[0], q), lerp(a[1], b[1], q)]; } d -= l; } };
const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
BED.along = along; BED.plen = plen;
const path = (c, cam, pts) => { c.beginPath(); pts.forEach(([x, y], i) => { const [sx, sy] = BED.S(cam, x, y); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }); };
const poly = (c, cam, pts, col, a = 1) => { c.save(); c.globalAlpha *= a; path(c, cam, pts); c.closePath(); c.fillStyle = P[col]; c.fill(); c.restore(); };
const BODY_TOP = PELVIS.spline([[-980, 60], [-940, 180], [-860, 225], [-760, 215], [-700, 190], [-560, 232], [-380, 238], [-200, 214], [-60, 200], [80, 184], [160, 168], [260, 150], [420, 138], [560, 128], [700, 112], [820, 104], [880, 190], [920, 196], [940, 120], [940, 30]], 6);
// o = {t, window (0..1 the pelvis cutaway), level (bladder line 0..1), bag (fill 0..1), drain (amber route 0..1), flow (0..1),
//      sway (tubing slack motion)}
BED.draw = (c, cam, o = {}) => {
  const S = (x, y) => BED.S(cam, x, y), s = cam.s, t = o.t || 0;
  PIX.rect(c, 0, 0, W, H, 'k');
  // floor and wall line
  const [, fy] = S(0, -620); PIX.rect(c, 0, Math.round(fy), W, H, 'n1'); PIX.rect(c, 0, Math.round(fy), W, 1, 'n3');
  // the bed: legs, frame rail, mattress, headboard, pillow
  for (const lx of [-920, 900]) { const [x0, y0] = S(lx - 18, -140), [x1, y1] = S(lx + 18, -600); PIX.rect(c, Math.round(x0), Math.round(y0), Math.max(1, Math.round(x1 - x0)), Math.round(y1 - y0), 'g3'); const [wx, wy] = S(lx, -605); PIX.circ(c, wx, wy, Math.max(1.5, 18 * s), 'g2'); }
  { const [x0, y0] = S(-1000, -120), [x1, y1] = S(1000, -170); const p = PIX.rectPath(x0, y0, x1 - x0, y1 - y0, 2); PIX.flat(c, p, 'g4', 'g2', 'g5'); }
  { const [x0, y0] = S(-1000, 0), [x1, y1] = S(1000, -120); PIX.flat(c, PIX.rectPath(x0, y0, x1 - x0, y1 - y0, 6 * s), 'g6', 'g4', 'g7'); }
  { const [x0, y0] = S(-1040, 380), [x1, y1] = S(-990, -170); PIX.flat(c, PIX.rectPath(x0, y0, x1 - x0, y1 - y0, 3), 'g4', 'g2', 'g5'); }
  { const pl = new Path2D(); const [px, py] = S(-860, 55); pl.ellipse(px, py, 120 * s, 50 * s, 0, 0, TAU); PIX.flat(c, pl, 'g8', 'g6', 'g9'); }
  // the patient: a silhouette (no face), the blanket over chest and lower legs, the thigh bare for the strap
  { const pts = BODY_TOP.concat([[940, 0], [-980, 0]]); c.save(); path(c, cam, pts); c.closePath(); c.fillStyle = P.g4; c.fill(); c.restore();
    c.save(); path(c, cam, BODY_TOP); c.strokeStyle = P.g6; c.lineWidth = 1; c.stroke(); c.restore(); }
  for (const [a, b] of [[-760, -170], [470, 935]]) {
    const top = BODY_TOP.filter(([x]) => x >= a && x <= b).map(([x, y]) => [x, y + 14]);
    const pts = [[a, 0]].concat(top).concat([[b, 0]]); c.save(); path(c, cam, pts); c.closePath(); c.fillStyle = P.h1; c.fill(); c.restore();
    for (let k = 1; k < 5; k++) { const fx = lerp(a, b, k / 5); const [sx, sy] = S(fx, 30), [, ty] = S(fx, 150); PIX.bline(c, sx, sy, sx + 2, ty, 'h0'); }
    c.save(); path(c, cam, top); c.strokeStyle = P.h2; c.lineWidth = 1; c.stroke(); c.restore();
  }
  // the pelvis cutaway window
  const wa = o.window ?? 1;
  if (wa > 0) {
    const [x0, y0] = S(-120, 232), [x1, y1] = S(170, 6);
    PIX.rect(c, Math.round(x0) - 1, Math.round(y0) - 1, Math.round(x1 - x0) + 2, Math.round(y1 - y0) + 2, 'n4');
    PIX.rect(c, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), 'k');
    PELVIS.draw(c, BED.pelvisCam(cam), { t, shell: 0.5, clip: [x0, y0, x1, y1] });
    // the catheter inside, in its final position (balloon expanded in the bladder)
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    FOLEY.drawCut(c, BED.pelvisCam(cam), { rTip: FOLEY.R_FINAL, inflated: 1, uMax: FOLEY.R_FINAL + 2, lift: PELVIS.lift(BED.pelvisCam(cam), 4.5), t, drain: o.drainIn || 0, drainMax: FOLEY.R_FINAL });
    c.restore();
  }
  // outside: catheter (ivory) to the junction, tubing (clear grey) to the bag, a gentle sway in the slack
  const L = plen(BED.ROUTE), sway = o.sway ?? 0;
  const pts = []; for (let d = 0; d <= L; d += 4) { let [x, y] = along(BED.ROUTE, d); if (x > 440 && x < 560) { const q = (x - 440) / 120; x += Math.sin(Math.PI * q) * sway * 10 * Math.sin(t * 2.2); } pts.push([x, y]); }
  const cath = pts.filter(([x]) => x <= BED.JUNCTION), tube = pts.filter(([x]) => x >= BED.JUNCTION - 4);
  c.save(); path(c, cam, cath); c.strokeStyle = P.q3; c.lineWidth = Math.max(2, 7 * s); c.lineCap = 'round'; c.stroke(); path(c, cam, cath); c.strokeStyle = P.q6; c.lineWidth = Math.max(1, 4 * s); c.stroke(); c.restore();
  c.save(); path(c, cam, tube); c.strokeStyle = P.g6; c.lineWidth = Math.max(2, 11 * s); c.lineCap = 'round'; c.stroke(); path(c, cam, tube); c.strokeStyle = P.g8; c.lineWidth = Math.max(1, 6 * s); c.stroke(); c.restore();
  // the securement strap on the thigh, and the bifurcation with its valve arm
  { const [sx, sy] = S(BED.STRAP, 150), [, sb] = S(BED.STRAP, 92); PIX.rect(c, Math.round(sx - 20 * s), Math.round(sy - 4), Math.max(3, Math.round(40 * s)), Math.round(sb - sy + 8), 'g8'); PIX.rect(c, Math.round(sx - 9 * s), Math.round(sy - 6), Math.max(2, Math.round(18 * s)), 5, 'g9'); }
  { const [jx, jy] = S(BED.JUNCTION, 144); PIX.circ(c, jx, jy, Math.max(2, 9 * s), 'q5'); PIX.bline(c, jx, jy, jx + 30 * s, jy - 30 * s, 'q5'); PIX.circ(c, jx + 30 * s, jy - 30 * s, Math.max(1.5, 7 * s), 'g7'); }
  // the bag on its hanger: hook on the frame rail, a clear bag with restrained markings, urine at the bottom
  const B = BED.BAG, [bx0, by0] = S(B.x0, B.y1), [bx1, by1] = S(B.x1, B.y0), [hx, hy] = S(...B.hook), fill = o.bag ?? 0.32;
  PIX.bline(c, hx, hy, hx, by0, 'g7'); PIX.rect(c, Math.round(hx - 12 * s), Math.round(hy) - 2, Math.round(24 * s), 3, 'g6');
  const bp = PIX.rectPath(bx0, by0, bx1 - bx0, by1 - by0, Math.max(2, 18 * s));
  c.save(); c.globalAlpha = 0.35; PIX.fill(c, bp, 'n4'); c.restore();
  c.save(); c.clip(bp); const fy0 = lerp(by1, by0, fill); PIX.rect(c, bx0, fy0, bx1 - bx0, by1 - fy0, 'f2'); PIX.rect(c, bx0, Math.round(fy0), bx1 - bx0, 1, 'f3'); c.restore();
  c.save(); c.strokeStyle = P.g8; c.lineWidth = 1; c.stroke(bp); c.restore();
  for (let k = 1; k < 5; k++) { const yy = lerp(by1, by0, k / 5); PIX.rect(c, Math.round(bx0 + 3), Math.round(yy), Math.max(2, Math.round(26 * s)), 1, 'g7'); }
  // overlays: bladder level, the amber route, flow markers
  if (o.level > 0) {
    const [, ly] = S(0, BED.BLADDER_Y), n = Math.round(W * o.level);
    for (let x = 0; x < n; x += 6) PIX.rect(c, x, Math.round(ly), 3, 1, 'a2');
    const [, gy] = S(0, B.y1); for (let x = Math.round(bx0) - 30; x < Math.min(n, W); x += 6) if (x > bx0 - 40) PIX.rect(c, x, Math.round(gy), 3, 1, 'g7');
  }
  if (o.drain > 0) {
    const n = Math.floor(pts.length * o.drain);
    c.save(); path(c, cam, pts.slice(0, n)); c.strokeStyle = P.a1; c.lineWidth = 2; c.stroke(); c.restore();
  }
  if (o.flow > 0) {
    for (let k = 0; k < 18; k++) { const d = K.wrap(t * 120 + k * L / 18, L), [x, y] = along(BED.ROUTE, d), [sx, sy] = S(x, y); c.save(); c.globalAlpha = o.flow; PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, 'f3'); c.restore(); }
  }
  return { S, bag: [bx0, by0, bx1, by1] };
};
// ---------- KID: the urinary overview (front view; the patient's right on screen left) ----------
const KC = { OUT: 0, SHELL: 1, KID: 2, PELV: 3, URET: 4, WALL: 5, URINE: 6, URETHRA: 7 };
const ell = (x, y, cx, cy, rx, ry, rot = 0) => { const c = Math.cos(rot), s = Math.sin(rot), dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return (Math.hypot(u, v) - 1) * Math.min(rx, ry); };
const capD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
const polyD = (x, y, pts) => { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, capD(x, y, pts[i - 1], pts[i])); return d; };
BED.URETER = s => PELVIS.spline([[s * 58, 198], [s * 54, 160], [s * 46, 120], [s * 40, 80], [s * 34, 52], [s * 24, 34]], 2);
const URL = BED.URETER(-1), URR = BED.URETER(1);
const kcls = (x, y) => {
  const ax = Math.abs(x);
  const dU = Math.min(polyD(x, y, URL), polyD(x, y, URR));
  if (dU < 2.2 && y > 30) return KC.URINE;
  if (dU < 5 && y > 28) return KC.URET;
  const k = ell(ax, y, 76, 212, 30, 56, -0.18), kp = ell(ax, y, 62, 204, 12, 20, -0.1);
  if (kp < 0) return KC.PELV;
  if (k < 0 && !(ax < 64 && Math.abs(y - 204) < 10)) return KC.KID;
  const b = ell(x, y, 0, 24, 44, 38);
  if (b < 0) return KC.URINE;
  if (b < 5) return KC.WALL;
  if (ax < 7 && y < -10 && y > -110) return ax < 2.5 ? KC.URINE : KC.URETHRA;
  if (ell(x, y, 0, 120, 140, 250) < 0) return KC.SHELL;
  return KC.OUT;
};
const KHT = [0, 0, 5, 3, 3, 5, 1, 4];
const KCOL = [null, ['n3', null, 'n4'], ['z3', 'z1', 'z4'], ['f2', 'f0', 'f3', 'liquid'], ['z4', 'z2', 'z5'], ['z3', 'z1', 'z4'], ['f2', 'f0', 'f3', 'liquid'], ['z4', 'z2', 'z5']];
BED.init = () => { BED.KID = PELVIS.buildMap(kcls, -150, 150, -120, 300, 3, KHT, KCOL); };
BED.kidDraw = (c, cam, o = {}) => PELVIS.drawMap(c, cam, BED.KID, { t: o.t || 0, shell: 0.45 });
})();
