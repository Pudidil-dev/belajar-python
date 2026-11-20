// BODY — the simplified body diagram of S17, S18 and S42 (front view, the patient's right on screen left, a silhouette:
// no face). Units ≈ px at zoom 1, origin at the heart, y down. Organs: lungs with their vessel trees, a four-chamber
// heart, the aorta and its arch, the superior vena cava, the right arm's veins (the IV site at the right forearm), the
// carotid arteries up to a small artery network in the head, the kidneys, ureters and bladder.
// The contrast route is a set of polylines (BODY.PATH): arm vein → superior vena cava → right heart → pulmonary arteries →
// lung capillaries (inside the vessels) → pulmonary veins → left heart → aorta → carotids → head, and aorta → renal
// arteries → kidneys → ureters → bladder. BODY.bolus draws a violet front moving along a route, its molecules as dots.
(() => {
const { W, H, P } = PIX;
const BODY = window.BODY = { NAME: 'BODY' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const R = {
  vein: [[-150, 46], [-146, 0], [-140, -60], [-128, -118], [-96, -138], [-62, -144], [-30, -138], [-16, -120], [-12, -86], [-10, -58]],
  right: [[-10, -58], [-8, -40], [0, -24], [6, -36], [8, -62], [8, -84]],
  pulmR: [[8, -84], [-14, -90], [-44, -84], [-62, -70], [-72, -50]],
  pulmL: [[8, -84], [30, -92], [58, -86], [74, -70], [82, -50]],
  pvR: [[-72, -50], [-64, -30], [-40, -40], [-8, -52], [14, -58]],
  pvL: [[82, -50], [70, -28], [46, -38], [20, -54], [14, -58]],
  left: [[14, -58], [22, -40], [26, -20], [22, -36], [16, -62]],
  aorta: [[16, -62], [12, -96], [2, -118], [-6, -124]],
  carR: [[-6, -124], [-16, -132], [-22, -168], [-24, -200], [-26, -232]],
  carL: [[-6, -124], [12, -126], [18, -168], [20, -200], [22, -232]],
  desc: [[-6, -124], [22, -118], [30, -96], [26, -40], [22, 40], [20, 120]],
  renR: [[20, 92], [-10, 96], [-40, 100]], renL: [[20, 92], [48, 96], [76, 100]],
  ureR: [[-48, 116], [-44, 160], [-26, 206], [-8, 222]], ureL: [[84, 116], [80, 160], [58, 206], [36, 222]],
};
BODY.R = R;
const segLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const atLen = (pts, d) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= l || i === pts.length - 1) { const q = clamp(d / l); return [lerp(a[0], b[0], q), lerp(a[1], b[1], q)]; } d -= l; } };
BODY.len = segLen; BODY.at = atLen;
const stroke = (c, pts, col, w) => { c.save(); c.strokeStyle = P[col]; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore(); };
// the silhouette: head, neck, torso, arms (navy body, lighter rim)
const silhouette = () => {
  const p = new Path2D();
  p.ellipse(0, -258, 50, 60, 0, 0, TAU);
  p.moveTo(-22, -206); p.lineTo(-20, -168); p.quadraticCurveTo(-60, -162, -118, -150); p.quadraticCurveTo(-150, -140, -156, -100);
  p.lineTo(-168, 10); p.lineTo(-178, 150); p.lineTo(-150, 156); p.lineTo(-138, 20); p.lineTo(-120, -60); p.lineTo(-110, 40);
  p.quadraticCurveTo(-96, 120, -104, 200); p.lineTo(-96, 300); p.lineTo(96, 300); p.lineTo(104, 200); p.quadraticCurveTo(96, 120, 110, 40);
  p.lineTo(120, -60); p.lineTo(138, 20); p.lineTo(150, 156); p.lineTo(178, 150); p.lineTo(168, 10); p.lineTo(156, -100);
  p.quadraticCurveTo(150, -140, 118, -150); p.quadraticCurveTo(60, -162, 20, -168); p.lineTo(22, -206); p.closePath();
  return p;
};
let SIL = null;
// o = {t, beat (0..1 heart squeeze), lungs, kidneys, head (show the artery icon), dimVeins}
BODY.draw = (c, o = {}) => {
  SIL = SIL || silhouette();
  PIX.flat(c, SIL, 'n2', 'n1', 'n3', [3, 3], [-1, -1]);
  // lungs: two lobes with a vessel tree (arteries and veins run inside the lung, round the air spaces)
  for (const s of [-1, 1]) {
    const lp = new Path2D(); lp.ellipse(s * 66, -66, 40, 64, s * 0.12, 0, TAU);
    PIX.flat(c, lp, 'p1', 'p0', 'p2', [2, 2], [-1, -1]);
    for (let k = 0; k < 7; k++) { const an = -1.2 + k * 0.4, x0 = s * 66 - s * 30, y0 = -70; stroke(c, [[x0, y0], [x0 + s * Math.cos(an) * 26, y0 + Math.sin(an) * 30], [x0 + s * Math.cos(an) * 44, y0 + Math.sin(an) * 50]], 'p0', 1.4); }
  }
  // the great vessels behind the heart
  stroke(c, R.desc, 'd2', 9); stroke(c, R.aorta, 'd3', 10); stroke(c, R.carR, 'd3', 6); stroke(c, R.carL, 'd3', 6);
  stroke(c, R.vein, 'd1', 6); stroke(c, R.pulmR, 'd2', 6); stroke(c, R.pulmL, 'd2', 6); stroke(c, R.pvR, 'd2', 4); stroke(c, R.pvL, 'd2', 4);
  // the heart: four chambers, squeezing on each beat
  const b = o.beat || 0, sc = 1 - 0.07 * b;
  c.save(); c.translate(8, -38); c.rotate(-0.35); c.scale(sc, sc);
  const hp = new Path2D(); hp.moveTo(-30, -20); hp.bezierCurveTo(-40, 10, -12, 40, 6, 52); hp.bezierCurveTo(30, 30, 44, 6, 34, -22); hp.bezierCurveTo(24, -40, -14, -40, -30, -20); hp.closePath();
  PIX.flat(c, hp, 'd3', 'd1', 'd4', [3, 3], [-1, -1]);
  PIX.line(c, 2, -30, 6, 46, 'd1', 1.5); PIX.line(c, -30, -2, 36, -6, 'd1', 1.5);
  c.restore();
  if (o.kidneys) {
    for (const s of [-1, 1]) { const kp = new Path2D(); kp.ellipse(20 + s * 52 + (s < 0 ? -8 : 8), 108, 14, 24, s * 0.25, 0, TAU); PIX.flat(c, kp, 'u1', 'u0', 'u2', [2, 2], [-1, -1]); }
    stroke(c, R.renR, 'd3', 4); stroke(c, R.renL, 'd3', 4); stroke(c, R.ureR, 'q3', 2.5); stroke(c, R.ureL, 'q3', 2.5);
    const bp = new Path2D(); bp.ellipse(14, 236, 30, 22 + 4 * (o.bladder || 0), 0, 0, TAU); PIX.flat(c, bp, 'q4', 'q2', 'q5', [2, 2], [-1, -1]);
  }
  // the head: the brain outline and a tiny artery network (the S01 network as an icon)
  const brp = new Path2D(); brp.ellipse(0, -262, 38, 40, 0, 0, TAU); PIX.flat(c, brp, 'p0', 'n2', 'p1', [2, 2], [-1, -1]);
  stroke(c, [[-26, -232], [-14, -250], [0, -252], [14, -250], [22, -232]], 'd3', 3);
  stroke(c, [[-14, -250], [-30, -262], [-36, -282]], 'd3', 2); stroke(c, [[14, -250], [30, -262], [34, -282]], 'd3', 2);
  stroke(c, [[0, -252], [0, -290]], 'd3', 2);
  PIX.circ(c, -31, -264, 3.4, 'd4');
};
// a violet bolus along a route: the vessel fills behind the front (from d0 to d1 of the route length), molecules as dots
BODY.bolus = (c, pts, d0, d1, w, t, seed = 1, a = 1) => {
  const L = segLen(pts); if (d1 <= 0 || d0 >= L) return;
  const s0 = Math.max(0, d0), s1 = Math.min(L, d1), seg = [];
  for (let d = s0; d <= s1; d += 2) seg.push(atLen(pts, d));
  seg.push(atLen(pts, s1));
  if (seg.length > 1) stroke(c, seg, 'v1', w);
  const m = c.getTransform();
  for (let k = 0; k < Math.floor((s1 - s0) / 7); k++) {
    const d = s0 + K.wrap(k * 7 + t * 40 + h(k, seed) * 7, Math.max(1, s1 - s0)), [x, y] = atLen(pts, d), off = (h(k, seed + 1) - 0.5) * w * 0.6;
    const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
    PIX.rect(c, Math.round(sx + off), Math.round(sy), 2, 2, h(k, seed + 2) < 0.5 ? 'v3' : 'v2');
  }
  if (d1 < L) { const [x, y] = atLen(pts, d1), sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f; FX.glowL(c, sx, sy, 7, ['v0', 'v1', 'v2'], 0.9 * a, 1.2); }
};
})();
