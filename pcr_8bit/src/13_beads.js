'use strict';
// ============================================================================
// RNA PURIFICATION with silica-coated magnetic beads (microscopic, world px).
// Beads: an iron-oxide core in a silica shell. In binding buffer the RNA sticks
// to the silica; a magnet behind the tube wall (right) pulls the beads — and
// whatever is bound to them — while washes carry proteins and lipids away; in
// elution buffer the RNA lets go and stays in the liquid while the beads stay
// on the magnet. The magnet acts on the beads, never on free RNA.
// ============================================================================
const BEADS = Array.from({ length: 7 }, (_, i) => ({ x: -150 + i * 52 + (hash(i + 1100) - 0.5) * 30, y: -230 + hash(i + 1101) * 460, r: 30 + hash(i + 1102) * 8, ph: hash(i + 1103) * TAU }));
const WALL_X = 210;                    // the tube wall (the magnet is just outside it)
// bead position over the process: k magnet pull 0..1 (beads move to the wall and stack)
function beadPos(b, i, t, kMag) {
  const fx = b.x + 10 * Math.sin(t * 0.7 + b.ph), fy = b.y + 8 * Math.cos(t * 0.6 + b.ph);
  const tx = WALL_X - b.r - 6 - (i % 2) * 58, ty = -150 + i * 46;
  const e = K75(clamp(kMag, 0, 1));
  return [lerp(fx, tx, e), lerp(fy, ty, e)];
}
function drawBead(cam, x, y, r, z) {
  const X = cam.x(x), Y = cam.y(y), R = r * z;
  disc(X, Y, R + 1, P.TB0); disc(X, Y, R, P.TB2); disc(X, Y, R - 3 * z, P.BD1);
  // granular iron-oxide core
  for (let k = 0; k < 14; k++) { const a = hash(k + 1200) * TAU, d = Math.sqrt(hash(k + 1201)) * (R - 6 * z); disc(X + Math.cos(a) * d, Y + Math.sin(a) * d, (2 + hash(k + 1202) * 3) * z, k % 3 ? P.BD2 : P.BD0); }
  // silica shell highlight
  ring(X, Y, R - 1.5 * z, Math.max(1, 1.6 * z), P.TB3, 0.7); disc(X - R * 0.45, Y - R * 0.5, R * 0.14, P.C6);
}
// RNA strands: each belongs to a bead (bound) or floats free; kBind 0..1, kElute 0..1
const RNAS = Array.from({ length: 6 }, (_, i) => ({ bead: i, a0: hash(i + 1300) * TAU, fx: -140 + hash(i + 1301) * 260, fy: -220 + hash(i + 1302) * 440, ph: hash(i + 1303) * TAU, star: i === 2 }));
function rnaPoints(r, t, bx, by, br, kBind, kElute, elX, elY) {
  const pts = [], n = 18;
  const bind = smooth(clamp(kBind, 0, 1)) * (1 - smooth(clamp(kElute, 0, 1)));
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    // free: a wavy strand drifting; bound: an arc hugging the bead surface
    const freeX = (kElute > 0 ? elX : r.fx) + (u - 0.5) * 120, freeY = (kElute > 0 ? elY : r.fy) + 14 * Math.sin(u * 8 + t * 2 + r.ph);
    const a = r.a0 + (u - 0.5) * 2.4, bX = bx + Math.cos(a) * (br + 4), bY = by + Math.sin(a) * (br + 4);
    pts.push([lerp(freeX, bX, bind), lerp(freeY, bY, bind)]);
  }
  return pts;
}
function drawRNAPts(cam, pts, z, star, t) {
  let px_ = null, py_ = null;
  const S = pts.map(([x, y]) => [cam.x(x), cam.y(y)]);
  if (star) for (let i = 0; i < S.length; i += 3) glow(S[i][0], S[i][1], 6 * z, P.RN1, null, 0.5);
  for (const [x, y] of S) { if (px_ !== null) lineW(px_, py_, x, y, 3.4 * z, P.RN0); px_ = x; py_ = y; }
  px_ = null;
  for (let i = 0; i < S.length; i++) {
    const [x, y] = S[i];
    if (px_ !== null) { lineW(px_, py_, x, y, 2 * z, P.RN2); const nx = -(y - py_), ny = x - px_, l = Math.hypot(nx, ny) || 1; lineW(x, y, x + nx / l * 4 * z, y + ny / l * 4 * z, 1.2 * z, P.RN3); }
    px_ = x; py_ = y;
  }
}
// debris washed away: proteins and lipid fragments; kWash 0..1 moves them out to the left
const BDEB = Array.from({ length: 30 }, (_, i) => ({ x: -170 + hash(i + 1400) * 360, y: -300 + hash(i + 1401) * 600, k: hash(i + 1402), ph: hash(i + 1403) * TAU }));
// o: { bind, mag, wash, elute, pan (camera follows), labels }
function purifScene(cam, t, o) {
  o = o || {};
  const z = cam.z;
  // liquid tint: binding buffer (amber-grey) → wash → elution (clear blue)
  rect(0, 0, W, H, P.BG);
  if (o.elute > 0) rect(0, 0, W, H, P.CL0, 0.35 * o.elute);
  // flow lines during the wash
  if (o.wash > 0 && o.wash < 1) for (let k = 0; k < 14; k++) { const y = cam.y(-300 + k * 46), x = cam.x(250 - ((t * 260 + k * 37) % 520)); dashLine(x, y, x + 26 * z, y, P.N5, 4, 3, 0); }
  // the tube wall and the magnet outside it
  const wx = cam.x(WALL_X);
  rect(wx, 0, wx + 6 * z, H, P.TB1); rect(wx + 6 * z, 0, wx + 8 * z, H, P.TB0);
  const mk = clamp(o.mag || 0, 0, 1);
  if (mk > 0) {
    const mx = wx + 8 * z + (1 - K75(clamp(mk * 3, 0, 1))) * 80 * z;
    rect(mx, cam.y(-260), mx + 60 * z, cam.y(0), P.MR1); rect(mx, cam.y(-260), mx + 60 * z, cam.y(-250), P.MR2); text(FS, 'N', mx + 26 * z, cam.y(-140), { sc: Math.max(1, Math.round(2 * z)), c: P.C6, ol: null });
    rect(mx, cam.y(0), mx + 60 * z, cam.y(260), P.M2); rect(mx, cam.y(0), mx + 60 * z, cam.y(10), P.M1); text(FS, 'S', mx + 26 * z, cam.y(120), { sc: Math.max(1, Math.round(2 * z)), c: P.M5, ol: null });
    // field lines into the tube (they act on the beads)
    for (let k = 0; k < 6; k++) { const y0 = cam.y(-230 + k * 90), ph = (t * 40) % 10; dashLine(mx - 4 * z, y0, mx - 70 * z * (1 + 0.2 * Math.sin(k)), y0 + 20 * z * Math.sin(k + 1), P.MR2, 3, 4, ph); }
  }
  // debris (stays in the liquid during binding, leaves with the washes)
  const wk = K75(clamp(o.wash || 0, 0, 1));
  for (const d of BDEB) {
    const x = cam.x(d.x - wk * 520 + 8 * Math.sin(t + d.ph)), y = cam.y(d.y + 6 * Math.cos(t * 0.8 + d.ph));
    if (x < -20 || x > W + 20) continue;
    if (d.k < 0.55) { disc(x, y, (4 + 3 * d.k) * z, P.DB1); disc(x - z, y - z, 2 * z, P.DB2); } else ring(x, y, 6 * z, 1.6 * z, P.VE3);
  }
  // beads, then RNA (bound strands ride with their bead; eluted strands stay in the liquid)
  const bp = BEADS.map((b, i) => beadPos(b, i, t, mk));
  BEADS.forEach((b, i) => drawBead(cam, bp[i][0], bp[i][1], b.r, z));
  RNAS.forEach((r, i) => {
    const [bx, by] = bp[r.bead], br = BEADS[r.bead].r;
    const elX = bx - 120 - i * 30 - (o.elute || 0) * 140, elY = by + (i % 2 ? 40 : -40);
    const pts = rnaPoints(r, t, bx, by, br, o.bind || 0, o.elute || 0, elX, elY);
    drawRNAPts(cam, pts, z, r.star, t);
  });
  return { bp };
}
