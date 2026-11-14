// HEAD — the patient's head in a sagittal, transparent cutaway, facing left: a glass-blue silhouette, the skull line, the
// pink brain with its folds, the cerebellum and brainstem, and a small muted-red lesion deep inside (the target, at the
// world origin). Beam paths are conceptual overlays (radiation is invisible): thin yellow lines from all round the head
// to the target, with bright pulses running inward. Also: the ring of source sectors and collimators round the head
// (S26, S46) and one collimator with its beam (S25). World units: at z = 1 one unit is one art pixel.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const HEAD = window.HEAD = { NAME: 'HEAD' };
const HEADP = [[8, -120], [42, -116], [72, -101], [94, -77], [106, -45], [108, -10], [102, 22], [90, 48], [78, 66], [74, 92], [74, 130], [76, 168],
  [-30, 168], [-32, 128], [-36, 100], [-54, 88], [-70, 80], [-80, 68], [-86, 56], [-88, 46], [-92, 40], [-93, 33], [-90, 28], [-94, 22], [-97, 15], [-93, 9],
  [-101, 5], [-113, -7], [-105, -13], [-97, -19], [-95, -29], [-97, -42], [-93, -58], [-81, -82], [-59, -104], [-28, -118]];
const BRAIN = [[-76, -44], [-72, -72], [-54, -95], [-23, -109], [11, -112], [44, -104], [71, -85], [89, -58], [97, -30], [93, -4], [81, 12], [60, 18], [40, 21], [24, 27], [9, 35], [-7, 31], [-25, 25], [-42, 25], [-58, 18], [-71, 4], [-78, -19]];
const CEREB = [[52, 22], [75, 15], [91, 24], [95, 41], [83, 57], [61, 59], [47, 49], [45, 33]];
const SKULL_C = [12, -42];
HEAD.P = { HEADP, BRAIN, CEREB };
HEAD.TARGET = [0, 0];
HEAD.CAM = { x: 4, y: -18, z: 1.62 };                                   // the opening composition (frame 0 = the last frame)
// the beam directions (192 beams in reality; 44 drawn), from all round the head
const BEAMS = Array.from({ length: 44 }, (_, i) => { const a = -Math.PI * 1.08 + (i + 0.5) / 44 * Math.PI * 1.5 + (hh(i, 3) - 0.5) * 0.04; return a; });
HEAD.BEAMS = BEAMS;
const brainTone = (cam, amp = 1) => (x, y) => {
  const z = cam.z, wx = cam.x + (x - W / 2) / z, wy = cam.y + (y - H / 2) / z;
  const n1 = K.fbm(wx * 0.042, wy * 0.042, 11, 3), n2 = K.fbm(wx * 0.075 + 9, wy * 0.075, 23, 2), e = Math.min(Math.abs(n1 - 0.5) * 9, Math.abs(n2 - 0.5) * 12 + 0.1);
  return (e < 0.1 ? -0.36 : e < 0.22 ? -0.14 : e > 0.6 && n1 > 0.5 ? 0.12 : 0) * amp;
};
HEAD.brainTone = brainTone;
// o: { beams (0..1 visibility), pulse (phase, s), glow (0..1 at the target), brainA, lesion (scale), eye }
HEAD.draw = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).head = cam;
  const z = cam.z;
  if (o.bg !== false) { PIX.rect(c, 0, 0, W, H, 'n0'); }
  // the glass head: a translucent silhouette and its outline
  const hd = D.blobPath(HEADP);
  LIT.path(c, cam, hd.path, hd.box, ['hg0', 'hg1', 'hg1', 'hg2'], { edge: false });
  LIT.path(c, cam, hd.path, hd.box, ['hg2', 'hg2', 'hg2', 'hg2'], { edge: false, clip: (x, y) => { const z2 = cam.z, wx = cam.x + (x - W / 2) / z2, wy = cam.y + (y - H / 2) / z2; return Math.floor(wx / 3) % 4 === 0 && Math.floor(wy / 3) % 4 === 0; } });   // a sparse glass sheen (dots)
  LIT.line(c, cam, hd.pts.concat([hd.pts[0]]), 'hg5', {});
  // the skull: an inner line round the cranium
  const sk = HEADP.slice(0, 9).concat(HEADP.slice(31)).map(([x, y]) => [SKULL_C[0] + (x - SKULL_C[0]) * 0.93, SKULL_C[1] + (y - SKULL_C[1]) * 0.93]);
  LIT.line(c, cam, D.blobPath(sk).pts.slice(0, -12), 'hg3', { alpha: 0.8 });
  // brainstem and cerebellum, then the cerebrum with its folds
  D.tube(c, cam, [[26, 22], [34, 60], [40, 100], [44, 150]], 17, ['br1', 'br2', 'br3', 'br4', 'br5'], { bias: -0.04 });
  HEAD.cerebellum(c, cam);
  const bp = D.blobPath(BRAIN);
  LIT.path(c, cam, bp.path, bp.box, ['br1', 'br2', 'br3', 'br4', 'br5', 'br6'], { alpha: o.brainA ?? 1, bias: 0.02, tone: brainTone(cam) });
  // the closed eye (a single lid line) and the corner of the mouth: the face stays a silhouette
  if (o.eye !== false && z > 0.6) { LIT.line(c, cam, [[-90, -27], [-86, -25], [-80, -25], [-77, -27]], 'hg4', {}); }
  // the lesion: a small irregular muted-red mass
  const ls = o.lesion ?? 1;
  if (ls > 0) D.blob(c, cam, [[-6, -3], [-2, -7], [4, -6], [7, -1], [5, 5], [-1, 7], [-6, 4]].map(([x, y]) => [x * ls, y * ls]), 'tu', { bias: 0.04 });
  // the beam paths (conceptual): thin lines from all round, pulses running inward
  const bv = o.beams ?? 1;
  if (bv > 0) HEAD.beams(c, cam, T, { a: bv, pulse: o.pulse ?? T, n: o.n, R: o.R ?? 230, from: o.from, list: o.list });
  if ((o.glow ?? 0) > 0) { const [sx, sy] = K.S(cam, 0, 0); FX.glowL(c, sx, sy, (8 + 6 * o.glow) * Math.min(2, z), ['tu2', 'tu4', 'ga3', 'ga4', 'ga5'], 0.55 * o.glow, 1.5); }
};
// the cerebellum: a rounded lobe under the occipital brain with its fine parallel folia
HEAD.cerebellum = (c, cam) => { const z = cam.z, cb = D.blobPath(CEREB); LIT.path(c, cam, cb.path, cb.box, ['br1', 'br2', 'br3', 'br4', 'br5'], { bias: -0.04, tone: (x, y) => { const wy = cam.y + (y - H / 2) / z, wx = cam.x + (x - W / 2) / z; return ((wy * 0.5 + wx * 0.16) % 3 + 3) % 3 < 0.8 ? -0.24 : 0; } }); };
// beams: o = { a, pulse (s), R (start radius), list (indices to draw), lit (0..1: how many are lit, in order) }
HEAD.beams = (c, cam, T, o = {}) => {
  const [tx, ty] = K.S(cam, 0, 0), z = cam.z, R = o.R ?? 230, idx = o.list || BEAMS.map((_, i) => i), lit = o.lit ?? 1;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  idx.forEach((i, k) => {
    if (k / idx.length > lit) return;
    const a = BEAMS[i], x0 = tx + Math.cos(a) * R * z, y0 = ty + Math.sin(a) * R * z;
    c.globalAlpha = 0.75 * (o.a ?? 1); c.strokeStyle = P.ga2; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(tx, ty); c.stroke();
    // two pulses per beam travelling inward
    for (let m = 0; m < 2; m++) { const ph = ((o.pulse ?? T) * 0.9 + hh(i, 5) + m * 0.5) % 1, d = (1 - ph) * R * z, len = 10; c.globalAlpha = (o.a ?? 1); c.strokeStyle = P.ga4; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + Math.cos(a) * (d + len), ty + Math.sin(a) * (d + len)); c.lineTo(tx + Math.cos(a) * d, ty + Math.sin(a) * d); c.stroke(); }
  });
  c.restore();
  // the focus: a small bright point (the conceptual convergence, no explosion)
  const [sx, sy] = K.S(cam, 0, 0); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = o.a ?? 1; c.fillStyle = P.ga5; c.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); c.restore();
};
// the source ring round the head (S26, S46): the 8 sector blocks on an arc, each with a collimator nose pointing at the target
HEAD.ring = (c, cam, T, o = {}) => {
  const R0 = o.R ?? 200, n = 8, span = o.span ?? Math.PI * 1.25, a0 = o.a0 ?? -Math.PI / 2 - span / 2;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k + 0.5) / n * span, ca = Math.cos(a), sa = Math.sin(a), px = ca * R0, py = sa * R0, tx = -sa, ty = ca;
    const box = [[px + tx * 22, py + ty * 22], [px - tx * 22, py - ty * 22], [px - tx * 22 + ca * 34, py - ty * 22 + sa * 34], [px + tx * 22 + ca * 34, py + ty * 22 + sa * 34]];
    D.poly(c, cam, box, ['sh1', 'sh2', 'sh3', 'sh4', 'sh5'], { bias: 0.02 });
    for (let j = -2; j <= 2; j++) { const qx = px + tx * j * 7.5 + ca * 17, qy = py + ty * j * 7.5 + sa * 17; D.sphere(c, cam, qx, qy, 3.2, ['au2', 'au3', 'au4', 'au5', 'au6'], {}); }
    // the collimator nose (tungsten) between the sector and the head
    D.poly(c, cam, [[px + tx * 8, py + ty * 8], [px - tx * 8, py - ty * 8], [px - tx * 5 - ca * 18, py - ty * 5 - sa * 18], [px + tx * 5 - ca * 18, py + ty * 5 - sa * 18]], ['g3', 'g4', 'g5', 'g6', 'g7'], { bias: 0.05 });
  }
};
// one collimator (S25): a grey block with a channel, its axis along angle a at distance R
HEAD.collimator = (c, cam, a, R, o = {}) => {
  const ca = Math.cos(a), sa = Math.sin(a), tx = -sa, ty = ca, px = ca * R, py = sa * R;
  D.poly(c, cam, [[px + tx * 26, py + ty * 26], [px - tx * 26, py - ty * 26], [px - tx * 26 + ca * 60, py - ty * 26 + sa * 60], [px + tx * 26 + ca * 60, py + ty * 26 + sa * 60]], 'g', { bias: 0.1 });
  D.poly(c, cam, [[px + tx * 9, py + ty * 9], [px - tx * 9, py - ty * 9], [px - tx * 9 + ca * 60, py - ty * 9 + sa * 60], [px + tx * 9 + ca * 60, py + ty * 9 + sa * 60]], ['g1', 'g2', 'g3', 'g4'], { edge: false });
  D.ell(c, cam, px, py, 10, 10, 0, ['g2', 'g3', 'g4', 'g5'], { bias: 0.1 });
  D.ell(c, cam, px, py, 5, 5, 0, ['k', 'n0', 'g1', 'g2'], { edge: false });
};
HEAD.init = () => {};
})();
