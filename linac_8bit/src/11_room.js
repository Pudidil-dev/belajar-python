'use strict';
// ============================================================================
// ROOM world, end view from the foot of the couch (axial plane).
// Isocentre at world (0,0) = tumour centre after alignment. The gantry head
// orbits the isocentre; the patient section (BODY) sits on the couch.
// Head distances are compressed (schematic).
// ============================================================================
const RM = { drumR: 226, armR0: 205, faceR: 150, srcR: 196, floor: 232, wallX: 214, ceilY: -232 };
function polar(phi, r) { return [r * Math.sin(phi), -r * Math.cos(phi)]; }   // phi clockwise from top
// polygon in the gantry frame: u radial (outward), v tangential
function gpoly(cam, phi, uv) {
  const out = [], s = Math.sin(phi), c = Math.cos(phi);
  for (let i = 0; i < uv.length; i += 2) { const u = uv[i], v = uv[i + 1]; const x = u * s + v * c, y = -u * c + v * s; out.push(cam.x(x), cam.y(y)); }
  return out;
}
function roomBG(cam) {
  clear(P.BG);
  const fy = cam.y(RM.floor);
  rect(0, fy, W, H, P.N1); rect(0, fy, W, fy + 1, P.N3);
  for (let i = -12; i <= 12; i++) { const x0 = cam.x(i * 40), x1 = cam.x(i * 70); line(x0, fy + 1, x1, H, P.N2); }
}
function drawDrum(cam, phi) {
  const cx = cam.x(0), cy = cam.y(0), z = cam.z;
  const m = maskDisc(cx, cy, RM.drumR * z);
  shade(m, P.N3, P.N4, P.N2, P.K0, { k: 2 });
  ring(cx, cy, 196 * z, 1, P.N2); ring(cx, cy, 197 * z, 1, P.N4, 0.6);
  disc(cx, cy, 60 * z, P.N2, 0.5);
  // drum bolts / rotation marks turning with the gantry
  for (let i = 0; i < 24; i++) { const a = phi + i / 24 * TAU; const [x, y] = polar(a, 212); disc(cam.x(x), cam.y(y), Math.max(0.8, 1.6 * z), P.N5); }
}
// kV source / panel deploy k: 0 tucked, 1 deployed. MV head at phi.
function drawGantry(cam, phi, opt) {
  opt = opt || {};
  const z = cam.z, kv = opt.kv || 0;
  // arm block from the drum to the head
  shade(maskPoly(gpoly(cam, phi, [RM.drumR + 4, -36, RM.drumR + 4, 36, RM.armR0 - 6, 40, RM.armR0 - 6, -40])), P.C2, P.C3, P.C1, P.C0);
  // head body (casing) and collimator
  shade(maskPoly(gpoly(cam, phi, [RM.armR0, -44, RM.armR0, 44, 172, 36, RM.faceR + 8, 24, RM.faceR + 8, -24, 172, -36])), P.C4, P.C5, P.C2, P.C0, { k: 2 });
  shade(maskPoly(gpoly(cam, phi, [RM.faceR + 9, -22, RM.faceR + 9, 22, RM.faceR, 20, RM.faceR, -20])), P.C2, P.C3, P.C1, P.C0);
  poly(gpoly(cam, phi, [RM.faceR + 3, -10, RM.faceR + 3, 10, RM.faceR, 10, RM.faceR, -10]), P.C1);
  if (opt.mlc !== undefined) poly(gpoly(cam, phi, [RM.faceR + 3, -opt.mlc, RM.faceR + 3, opt.mlc, RM.faceR, opt.mlc, RM.faceR, -opt.mlc]), opt.beamOn ? P.Y2 : P.C0);
  // kV imaging arms at +/- 90 deg
  const rs = lerp(RM.drumR - 8, 176, kv), rp = lerp(RM.drumR - 6, 158, kv);
  const ps = phi + Math.PI / 2, pp = phi - Math.PI / 2;
  if (kv > 0.01) {
    for (const [p, r] of [[ps, rs], [pp, rp]]) shade(maskPoly(gpoly(cam, p, [RM.drumR, -6, RM.drumR, 6, r + 6, 6, r + 6, -6])), P.C1, P.C2, P.C0, P.K0);
  }
  shade(maskPoly(gpoly(cam, ps, [rs + 22, -17, rs + 22, 17, rs, 13, rs, -13])), P.C3, P.C4, P.C2, P.C0);
  poly(gpoly(cam, ps, [rs + 2, -5, rs + 2, 5, rs, 5, rs, -5]), P.C1);
  shade(maskPoly(gpoly(cam, pp, [rp + 7, -46, rp + 7, 46, rp, 46, rp, -46])), P.T1, P.T2, P.T0, P.K0);
  poly(gpoly(cam, pp, [rp + 1.5, -42, rp + 1.5, 42, rp, 42, rp, -42]), opt.panelGlow ? P.Y1 : P.N4, opt.panelGlow ? 0.5 + 0.5 * opt.panelGlow : 1);
}
function drawLasers(cam, off, k) {
  if (k <= 0) return;
  const z = cam.z;
  // emitters: left wall, right wall, ceiling
  const em = [[-RM.wallX, 0, 1, 0], [RM.wallX, 0, -1, 0], [0, RM.ceilY, 0, 1]];
  for (const [x, y, dx, dy] of em) {
    shade(maskRR(cam.x(x) - 6 * z - (dx ? 3 * z : 0), cam.y(y) - 6 * z, cam.x(x) + 6 * z + (dx ? 3 * z : 0), cam.y(y) + 6 * z, 2 * z), P.C2, P.C3, P.C1, P.C0);
    // beam until it meets the skin
    let s = 0, hit = null;
    for (; s < 500; s += 0.5) { const wx = x + dx * s, wy = y + dy * s; if (inBody(wx - off[0], wy - off[1], 0)) { hit = [wx, wy]; break; } }
    const ex = hit ? hit[0] : x + dx * 500, ey = hit ? hit[1] : y + dy * 500;
    line(cam.x(x + dx * 7), cam.y(y + dy * 7), cam.x(ex), cam.y(ey), P.G1, 0.85 * k);
    if (hit && k > 0.5) { const hx = cam.x(hit[0]), hy = cam.y(hit[1]); glow(hx, hy, 6, P.G0, P.G1, k); rect(hx - 1, hy - 1, hx + 2, hy + 2, P.G2); }
  }
}
function drawTattoos(cam, off) {
  for (const key of ['L', 'R', 'A']) {
    const [lx, ly] = MARKS[key];
    const x = cam.x(lx + off[0]), y = cam.y(ly + off[1]);
    rect(x - 2, y, x + 3, y + 1, P.SK0); rect(x, y - 2, x + 1, y + 3, P.SK0);
  }
}
// MV beam (one beam at a time): from the head through the isocentre
function mvBeam(cam, phi, t, lv, lohi) {
  const [lo, hi] = lohi || beamAperture(phi);
  const [dx, dy] = beamDir(phi), nx = Math.cos(phi), ny = Math.sin(phi);
  const sx = -dx * RM.srcR, sy = -dy * RM.srcR;      // source (target) position
  const d0 = RM.srcR - RM.faceR, d1 = RM.srcR + 160;
  const P4 = [];
  for (const [d, l] of [[d0, lo], [d0, hi], [d1, hi], [d1, lo]]) { const f = d / RM.srcR; P4.push(cam.x(sx + dx * d + nx * l * f), cam.y(sy + dy * d + ny * l * f)); }
  poly(P4, P.Y1, 0.3 * lv); poly(P4, P.Y2, 0.12 * lv);
  // packets travelling down the beam
  const rate = 70;
  for (let i = Math.floor((t - 1.2) * rate); i <= Math.floor(t * rate); i++) {
    const age = t - i / rate; if (age < 0) continue;
    const d = d0 + age * 300; if (d > d1) continue;
    const f = d / RM.srcR, l = lerp(lo, hi, hash(i * 5 + 1)) * f;
    const x = sx + dx * d + nx * l, y = sy + dy * d + ny * l;
    const fade = d > RM.srcR + 60 ? 0.5 : 1;
    if (hash(i * 11 + 3) < fade) photon(cam.x(x), cam.y(y), dx, dy, { len: Math.max(4, 7 * cam.z), amp: 0, c: P.Y2 });
  }
}
// kV imaging beam: faint pale cone from the kV source to the panel
function kvBeam(cam, phi, t, lv) {
  const ps = phi + Math.PI / 2, pp = phi - Math.PI / 2;
  const [sx, sy] = polar(ps, 182), [px0, py0] = polar(pp, 158);
  const nx = Math.cos(pp), ny = Math.sin(pp);
  const pts = [cam.x(sx), cam.y(sy), cam.x(px0 + nx * 44), cam.y(py0 + ny * 44), cam.x(px0 - nx * 44), cam.y(py0 - ny * 44)];
  poly(pts, P.Y3, 0.16 * lv);
  for (let i = 0; i < 26; i++) {
    const ph = (t * 2.2 + hash(i * 13) ) % 1;
    const v = (hash(i * 7 + 2) * 2 - 1) * 40;
    const x = lerp(sx, px0 + nx * v, ph), y = lerp(sy, py0 + ny * v, ph);
    const ddx = px0 + nx * v - sx, ddy = py0 + ny * v - sy;
    if (hash(i * 3 + Math.floor(t * 30)) < lv) photon(cam.x(x), cam.y(y), ddx, ddy, { len: 3, amp: 0, c: P.Y3 });
  }
}
// full room render. st: {phi, kv, lasers, off:[x,y], beam, beamLv, dose, doseReveal,
//   lowPulse, tumorR, kvBeam, panelGlow, dim, couch}
function drawRoom(cam, t, st) {
  const phi = st.phi || 0, off = st.off || [0, 0];
  roomBG(cam);
  drawDrum(cam, phi);
  // head behind the patient when it is under the couch
  const behind = Math.cos(phi) < -0.2;
  if (behind) drawGantry(cam, phi, st);
  const view = { ox: cam.x(off[0]), oy: cam.y(off[1]), s: cam.z };
  drawCouchTop(view, true, cam.y(RM.floor));
  renderBody(view, { style: 'illus', tumorR: st.tumorR === undefined ? TUMOR_R0 : st.tumorR, dose: st.dose, doseReveal: st.doseReveal, lowPulse: st.lowPulse, ghostR: st.ghostR });
  if (st.tattoo) drawTattoos(cam, off);
  if (!behind) drawGantry(cam, phi, st);
  if (st.lasers) drawLasers(cam, off, st.lasers);
  if (st.kvBeam) kvBeam(cam, phi, t, st.kvBeam);
  if (st.beam) mvBeam(cam, phi, t, st.beam, st.lohi);
}
