// OPT — the one optical diagram of the film (asset E): the instrument's measuring head in side cutaway, to the right of the
// eye, in the eye's own millimetres (world X to the right, Y down; the corneal apex is the origin and the eye–instrument
// axis is Y = 0). A simplified educational layout with three arms, not an engineering reconstruction (the working distance
// and the folded arms are compressed so that the eye and the optics share one frame):
//   fixation arm (up, visible light, amber): lamp → the balloon slide → the movable fogging lens → the dichroic mirror
//       (it reflects visible light and lets infrared through) → objective → the eye, to the fovea
//   source arm (straight back, infrared, cyan = outgoing): source → pinhole → projection lens → beam splitter → dichroic →
//       objective → a thin beam through the centre of the pupil → a spot on the retina
//   receiving arm (down, infrared, magenta = returning): from the spot out through a ring zone of the pupil → objective →
//       dichroic → beam splitter (turned down) → relay lens → ring lens → the image sensor, where the ring zone focuses to
//       a ring (two spots in this side view)
// OPT.draw draws the hardware; OPT.rays draws a bundle of guides up to a moving front, with dashes that run along the
// direction of travel; DIAG.draw composes the head, the eye, the instrument and the three pathways for the scenes.
(() => {
const { W, H, P } = PIX;
const OPT = window.OPT = { NAME: 'OPT' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const L = OPT.L = { HX0: 7.2, HX1: 46.5, HY0: -37.5, HY1: 32, WIN: 8, L1: 11.5, DM: 18, BS: 27, L2: 33.5, PIN: 37, SRC: 40.6, FOG: -13, CHART: -25, LAMP: -31.2, RELAY: 9.5, RING: 15.5, SENS: 24.2, RSPOT: 3.0, HOUT: 0.75 };
const rect = (c, x, y, w, h, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, h); };
const lensV = (c, x, y, hh, th) => {                                   // a biconvex lens standing across a horizontal beam
  const p = new Path2D(); p.ellipse(x, y, th / 2, hh, 0, 0, TAU);
  PIX.fill(c, p, 'b1'); c.save(); c.clip(p); c.fillStyle = P.b0; c.fillRect(x + th * 0.12, y - hh, th, 2 * hh); c.fillStyle = P.b2; c.fillRect(x - th * 0.32, y - hh * 0.8, th * 0.16, hh * 1.1); c.restore();
  rect(c, x - 0.5, y - hh - 0.9, 1, 0.9, 'g4'); rect(c, x - 0.5, y + hh, 1, 0.9, 'g4');
};
const lensH = (c, x, y, hw, th) => {                                   // a biconvex lens lying across a vertical beam
  const p = new Path2D(); p.ellipse(x, y, hw, th / 2, 0, 0, TAU);
  PIX.fill(c, p, 'b1'); c.save(); c.clip(p); c.fillStyle = P.b0; c.fillRect(x - hw, y + th * 0.12, 2 * hw, th); c.fillStyle = P.b2; c.fillRect(x - hw * 0.8, y - th * 0.32, hw * 1.1, th * 0.16); c.restore();
  rect(c, x - hw - 0.9, y - 0.5, 0.9, 1, 'g4'); rect(c, x + hw, y - 0.5, 0.9, 1, 'g4');
};
const plate = (c, x0, y0, x1, y1, col, hi) => { c.save(); c.lineCap = 'butt'; c.strokeStyle = P[col]; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = P[hi]; c.lineWidth = 0.22; c.beginPath(); c.moveTo(x0 - 0.18, y0 - 0.18); c.lineTo(x1 - 0.18, y1 - 0.18); c.stroke(); c.restore(); };
// the balloon slide: a small tilted plate with the picture on it (the picture is on a slide; nothing else is in there)
OPT.slide = (c, cam, lamp = 1, noGlow = false) => {
  const x = L.DM, y = L.CHART, w = 9.6, hgt = 7.2, sk = 0.34;
  K.cam(c, cam);
  if (lamp > 0 && !noGlow) { const [gx, gy] = K.S(cam, x + 1.2, y - 4); c.setTransform(1, 0, 0, 1, 0, 0); FX.glowL(c, gx, gy, 10 * cam.z, ['a0', 'a1', 'a2'], 0.55 * lamp, 1.5); K.cam(c, cam); }
  c.save(); c.transform(1, 0, -sk, 1, x + sk * y, 0);
  rect(c, -w / 2 - 0.5, y - hgt - 0.5, w + 1, hgt + 1, 'g4');
  c.beginPath(); c.rect(-w / 2, y - hgt, w, hgt); c.clip();
  const s = w / 240; c.translate(0, y - hgt / 2); c.scale(s, s * (hgt / w) * (240 / 240));
  BAL.picture(c, 0, 0, 1); c.restore();
  if (lamp < 1) { c.save(); c.transform(1, 0, -sk, 1, x + sk * y, 0); c.globalAlpha = 0.6 * (1 - lamp); rect(c, -w / 2, y - hgt, w, hgt, 'k'); c.restore(); }
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// o = {fog (mm: the fogging lens's shift along its rail), lamp (0..1), src (0..1), spots (0..1 light on the sensor), t}
OPT.draw = (c, cam, o = {}) => {
  K.cam(c, cam);
  // the lower body: column, stage, base (graphite and ivory silhouettes)
  rect(c, 15, L.HY1, 27, 13, 'q3'); rect(c, 15, L.HY1, 27, 1, 'q2'); rect(c, 6, L.HY1 + 13, 44, 5, 'g3'); rect(c, 6, L.HY1 + 13, 44, 0.6, 'g5'); rect(c, 2, L.HY1 + 18, 52, 40, 'g2'); rect(c, 2, L.HY1 + 18, 52, 0.6, 'g4');
  // the housing in section: ivory shell, dark interior, the three arms as slightly lighter tubes
  const sh = new Path2D(); sh.roundRect(L.HX0, L.HY0, L.HX1 - L.HX0, L.HY1 - L.HY0, 3.2);
  PIX.fill(c, sh, 'q5'); c.save(); c.clip(sh); rect(c, L.HX0, L.HY1 - 1.4, 60, 1.4, 'q3'); rect(c, L.HX1 - 1.4, L.HY0, 1.4, 80, 'q4'); rect(c, L.HX0, L.HY0, 60, 0.5, 'q6'); rect(c, L.HX0, L.HY0, 0.5, 80, 'q6'); c.restore();
  const inn = new Path2D(); inn.roundRect(L.HX0 + 1.4, L.HY0 + 1.4, L.HX1 - L.HX0 - 2.8, L.HY1 - L.HY0 - 2.8, 2.2); PIX.fill(c, inn, 'g0');
  rect(c, L.HX0 + 1.4, -5.7, L.HX1 - L.HX0 - 2.8, 11.4, 'g1'); rect(c, 12.4, L.HY0 + 2.6, 11.4, 31, 'g1'); rect(c, 21, 5.7, 12, 20.6, 'g1');
  rect(c, 28.6, L.HY0 + 4, 14, 12, 'g1'); for (let k = 0; k < 4; k++) { rect(c, 30 + k * 3, L.HY0 + 6, 1.6, 2.2, 'g3'); rect(c, 30 + k * 3, L.HY0 + 10.5, 1.6, 2.2, k === 1 ? 't1' : 'g3'); }   // a circuit board (decoration)
  rect(c, 36, 9, 7.5, 16, 'g1'); for (let k = 0; k < 5; k++) rect(c, 37, 10.5 + k * 2.9, 5.5, 1.3, 'g2');
  // the window in the front wall
  rect(c, L.HX0, -5.3, 1.4, 10.6, 'g0'); rect(c, L.WIN - 0.2, -5.3, 0.45, 10.6, 'b1'); rect(c, L.HX0 - 0.7, -6.6, 2.4, 1.3, 't2'); rect(c, L.HX0 - 0.7, 5.3, 2.4, 1.3, 't2');
  // fixation arm: lamp, slide (drawn by OPT.slide), fogging lens on its rail
  rect(c, L.DM - 3.2, L.LAMP - 1.6, 6.4, 1.9, 'g5'); rect(c, L.DM - 2.2, L.LAMP + 0.3, 4.4, 0.5, o.lamp > 0 ? 'a3' : 'g3');
  rect(c, 24.7, -21.5, 0.55, 15.5, 'g4'); for (let k = 0; k < 6; k++) rect(c, 25.25, -20.5 + k * 2.7, 0.8, 0.22, 'g5');
  const fy = L.FOG + (o.fog || 0);
  rect(c, L.DM + 4.4, fy - 0.45, 1.4, 0.9, 'g5'); rect(c, 23.9, fy - 1.3, 2.3, 2.6, 'g5'); rect(c, 24.5, fy - 0.5, 1.0, 1.0, 't2');
  lensH(c, L.DM, fy, 4.3, 1.7);
  // main axis: objective, dichroic mirror ( / ), beam splitter ( \ )
  lensV(c, L.L1, 0, 5.2, 2.2);
  plate(c, L.DM - 3.3, 3.3, L.DM + 3.3, -3.3, 'a1', 'a3');
  plate(c, L.BS - 3.3, -3.3, L.BS + 3.3, 3.3, 'g8', 'b3');
  // source arm: projection lens, pinhole, the infrared source
  lensV(c, L.L2, 0, 2.9, 1.5);
  rect(c, L.PIN - 0.25, -3.2, 0.5, 2.7, 'g5'); rect(c, L.PIN - 0.25, 0.5, 0.5, 2.7, 'g5');
  rect(c, L.SRC - 0.3, -2.1, 3.6, 4.2, 'g4'); rect(c, L.SRC - 0.3, -2.1, 3.6, 0.5, 'g6'); rect(c, L.SRC - 0.3, -1.2, 0.6, 2.4, 'b1');
  for (let k = 0; k < 3; k++) rect(c, L.SRC + 3.3, -1.7 + k * 1.3, 1.5, 0.6, 'g5');
  rect(c, L.SRC + 0.5, -0.5, 1.0, 1.0, o.src > 0 ? 'c4' : 'g2');
  // receiving arm: relay lens, ring lens (two lobes round a central stop), the image sensor on its board
  lensH(c, L.BS, L.RELAY, 3.9, 1.6);
  for (const s of [-1, 1]) lensH(c, L.BS + s * 2.9, L.RING, 1.55, 1.3);
  rect(c, L.BS - 1.3, L.RING - 0.7, 2.6, 1.4, 'g3');
  rect(c, L.BS - 7.5, L.SENS + 2.4, 15, 1.1, 't0'); for (let k = 0; k < 7; k++) rect(c, L.BS - 6.6 + k * 2.1, L.SENS + 3.5, 0.6, 0.9, 'y2');
  rect(c, L.BS - 5.5, L.SENS + 0.4, 11, 2.0, 'g3'); rect(c, L.BS - 5.5, L.SENS + 0.4, 11, 0.4, 'g5');
  rect(c, L.BS - 4.2, L.SENS, 8.4, 0.5, 't1'); rect(c, L.BS - 4.2, L.SENS, 8.4, 0.16, 't3');
  c.setTransform(1, 0, 0, 1, 0, 0);
  OPT.slide(c, cam, o.lamp ?? 1);
  if (o.src > 0) { const [sx, sy] = K.S(cam, L.SRC + 0.4, 0); FX.glowL(c, sx, sy, 3.2 * cam.z, ['c0', 'c1', 'c2', 'c3'], 0.8 * o.src, 1.4); }
  if (o.spots > 0) for (const s of [-1, 1]) { const [sx, sy] = K.S(cam, L.BS + s * L.RSPOT, L.SENS); FX.glowL(c, sx, sy, 1.6 * cam.z, ['m0', 'm1', 'm2', 'm3'], 0.9 * o.spots, 1.3); PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 2, 2, 'm4'); }
};
// the forehead rest: a pad on an arm (the chin rest is far below the frame)
OPT.rest = (c, cam) => {
  K.cam(c, cam);
  rect(c, 6.3, -47.6, 70, 1.5, 'g4'); rect(c, 6.3, -47.6, 70, 0.4, 'g6'); rect(c, 6.3, -47.6, 1.5, 4, 'g4');
  const p = new Path2D(); p.roundRect(4.3, -45.5, 2.9, 12, 1.3); PIX.fill(c, p, 'q6'); c.save(); c.clip(p); rect(c, 6.3, -46, 1, 13, 'q4'); c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// the closed cover over the cutaway, dissolving away as a → 0 (ordered dither): ivory panel, teal stripe, the snout ring
OPT.cover = (c, cam, a) => {
  if (a <= 0) return;
  const S = (x, y) => K.S(cam, x, y), z = cam.z, D = (x, y, w, h, col) => { const [sx, sy] = S(x, y); K.dith(c, sx, sy, w * z, h * z, col, a); };
  D(L.HX0, L.HY0, L.HX1 - L.HX0, L.HY1 - L.HY0, 'q5'); D(L.HX0, L.HY0, L.HX1 - L.HX0, 0.6, 'q6'); D(L.HX0, L.HY1 - 6, L.HX1 - L.HX0, 1.6, 't2'); D(L.HX1 - 2, L.HY0, 2, L.HY1 - L.HY0, 'q4');
  D(L.HX0, 12, 16, 0.4, 'q3'); D(30, L.HY0 + 5, 12, 0.4, 'q3'); for (let k = 0; k < 5; k++) D(34, -22 + k * 2.4, 8, 1.1, 'g3');
  D(L.HX0 - 2.6, -7.2, 3.2, 14.4, 'g3'); D(L.HX0 - 2.6, -7.2, 0.7, 14.4, 't2');
};
// ---------- pathways (world polylines) ----------
let PATHS = null;
OPT.paths = (fog = 0) => {
  if (!PATHS) {
    const Wd = EYE.W, out = [], back = [];
    for (const k of [-1, 0, 1]) {
      const hh = k * L.HOUT, tr = EYE.traceIn(hh, 0, -L.L1);
      out.push([[L.SRC, 0], [L.PIN, hh * 0.25], [L.L2, hh], [L.BS, hh], [L.DM, hh], [L.L1, hh]].map(([x, h_]) => [x, -h_]).concat(tr.slice(1).map(Wd)));
    }
    // the ring zone of the pupil: heights ±1.2 and ±1.8 at the iris plane (found by bisection on the leaving angle)
    for (const tgt of [1.2, 1.8, -1.2, -1.8]) {
      let lo = 0, hi = 0.12 * Math.sign(tgt);
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, r = EYE.traceOut(m, -L.L1); if (r.stopped || Math.abs(r.hp) > Math.abs(tgt)) hi = m; else lo = m; }
      const tr = EYE.traceOut(lo, -L.L1).map(Wd), y = tr[tr.length - 1][1], sx = L.BS + y;
      back.push(tr.concat([[L.DM, y], [sx, y], [sx, L.RELAY], [sx, L.RING], [L.BS + Math.sign(y) * L.RSPOT, L.SENS]]));
    }
    PATHS = { out, back };
  }
  const fix = [[L.DM, L.LAMP + 1], [L.DM, L.CHART], [L.DM, L.FOG + fog], [L.DM, 0], [L.L1, 0], [0, 0], [-EYE.G.AL, 0]];
  return { ...PATHS, fix: [fix] };
};
const lens = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
const atLen = (pts, s, d) => { for (let i = 1; i < pts.length; i++) if (d <= s[i] || i === pts.length - 1) { const q = clamp((d - s[i - 1]) / Math.max(1e-9, s[i] - s[i - 1])); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q), i]; } };
// rays: [[x, y], …][]; u = how far the front has come, in vertices of the first ray (fractional; ≥ its vertex count − 1 = all
// drawn). o = {col: ['c1', 'c2', 'c4'] (dim line, line, dash), t, a (0..1), dash (true), head (true), from (vertex to start at)}
OPT.rays = (c, cam, rays, u, o = {}) => {
  if (u <= (o.from || 0) || (o.a ?? 1) <= 0) return null;
  const cols = o.col || ['c1', 'c2', 'c4'], t = o.t || 0, z = cam.z, per = 11 / z, dl = 4.2 / z, speed = 46 / z, wide = o.w === 2;
  const line = (ax, ay, bx, by, col) => { PIX.bline(c, ax, ay, bx, by, col); if (wide) { if (Math.abs(bx - ax) >= Math.abs(by - ay)) PIX.bline(c, ax, ay + 1, bx, by + 1, col); else PIX.bline(c, ax + 1, ay, bx + 1, by, col); } };
  let headP = null;
  c.save(); c.globalAlpha = o.a ?? 1;
  rays.forEach((pts, ri) => {
    if (o.only && !o.only.includes(ri)) return;
    const n = pts.length - 1, uu = Math.min(u, n), i0 = Math.floor(uu), fr = uu - i0, s = lens(pts), f0 = o.from || 0;
    const dEnd = i0 >= n ? s[n] : s[i0] + fr * (s[i0 + 1] - s[i0]), dStart = s[Math.floor(f0)] + (f0 % 1) * (s[Math.min(n, Math.floor(f0) + 1)] - s[Math.floor(f0)]);
    // the guide itself
    let prev = atLen(pts, s, dStart);
    for (let i = Math.floor(f0) + 1; i <= n; i++) {
      const d = Math.min(s[i], dEnd), q = atLen(pts, s, d), [ax, ay] = K.S(cam, prev[0], prev[1]), [bx, by] = K.S(cam, q[0], q[1]);
      line(ax, ay, bx, by, cols[1]);
      prev = q; if (d >= dEnd) break;
    }
    // dashes running the way the light goes
    if (o.dash !== false) for (let d = dStart + ((t * speed) % per); d < dEnd; d += per) {
      const a = atLen(pts, s, d), b = atLen(pts, s, Math.min(dEnd, d + dl)); if (a[2] !== b[2]) continue;
      const [ax, ay] = K.S(cam, a[0], a[1]), [bx, by] = K.S(cam, b[0], b[1]); line(ax, ay, bx, by, cols[2]);
    }
    if (u < n && o.head !== false) { const hq = atLen(pts, s, dEnd), [hx, hy] = K.S(cam, hq[0], hq[1]); PIX.rect(c, Math.round(hx) - 1, Math.round(hy) - 1, 3, 3, cols[2]); if (wide) PIX.rect(c, Math.round(hx) - 2, Math.round(hy) - 1, 5, 4, cols[2]); if (ri === Math.floor(rays.length / 2)) headP = [hx, hy]; }
  });
  c.restore();
  return headP;
};
OPT.pathLen = pts => lens(pts);
// constant-speed fronts: the vertex position u for a distance d (mm) along a path, and the path's length
OPT.uAtD = (pts, d) => { const s = lens(pts); if (d <= 0) return 0; for (let i = 1; i < s.length; i++) if (d <= s[i]) return i - 1 + (d - s[i - 1]) / Math.max(1e-9, s[i] - s[i - 1]); return s.length - 1; };
OPT.len = pts => { const s = lens(pts); return s[s.length - 1]; };
OPT.dAtU = (pts, u) => { const s = lens(pts), i = Math.min(s.length - 2, Math.floor(u)); return s[i] + (u - i) * (s[i + 1] - s[i]); };
OPT.ptAtU = (pts, u) => { const i = Math.max(0, Math.min(pts.length - 2, Math.floor(u))), q = clamp(u - i); return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)]; };
// ---------- the composed diagram ----------
const DIAG = window.DIAG = {};
DIAG.WIDE = { x: 10.6, y: -10.83, z: 4.8 };                             // the whole diagram: axis at screen y = 372
// o = {t, fog, lamp, src, spots, cover (1 = closed … 0 = cutaway), fix: u (amber front; null = off), fixA (0..1), out: u, outA,
//      back: u, backA, backFrom, eye: {…}, bg (true)}
// The cutaway is one continuous shot from 6 s to 27 s (scenes 3–9): one camera track and one set of light fronts, all
// functions of film time, so nothing jumps at a scene boundary.
DIAG.FUNDUS = { x: -21.3, y: 0, z: 28 }; DIAG.EYE = { x: -11.6, y: 0, z: 12.5 }; DIAG.FRONT = { x: -2.6, y: 0, z: 24 }; DIAG.SENSOR = { x: 27, y: 21, z: 18 };
const TRACK = K.camTrack([
  [6.0, 10.6, -10.83, 4.8], [9.35, 10.6, -10.83, 4.8],                  // S03 the whole cutaway (hold)
  [10.45, 9.0, -11.6, 9.4], [11.55, 9.0, -11.6, 9.4],                   // S04 the slide, the fogging lens and the eye's own lens
  [12.5, 33.0, 0.0, 10.0], [12.95, 33.0, 0.0, 10.0],                    // S05 the infrared source …
  [15.0, 3.0, 0.0, 13.0],                                               // … following the beam to the cornea
  [16.1, -2.6, 0.0, 24.0], [17.7, -2.6, 0.0, 24.0],                     // S06 the front of the eye
  [18.9, -11.6, 0.0, 12.5], [20.8, -11.6, 0.0, 12.5],                   // S07 the whole eye
  [21.8, -21.3, 0.0, 28.0], [24.0, -21.3, 0.0, 28.0],                   // S08 the back of the eye
  [24.9, -8.0, 0.0, 10.0], [25.7, 14.0, 3.0, 7.5], [26.4, 25.0, 13.0, 11.0], [27.0, 27.0, 21.0, 18.0]]);   // S09 back out to the sensor
DIAG.track = T => TRACK(T);
let FR = null;
// how far each front has come at film time T (mm along its centre ray)
DIAG.fronts = T => {
  if (!FR) {
    const Pth = OPT.paths(0), Lf = OPT.len(Pth.fix[0]), Lo = OPT.len(Pth.out[1]), Lb = OPT.len(Pth.back[0]), dC = OPT.dAtU(Pth.out[1], 6);
    FR = { Lf, Lo, Lb, dC,
      fix: K.pchip([6.875, 8.0], [0, Lf]),
      out: K.pchip([12.0, 12.75, 15.0, 17.375, 18.375, 20.25], [0, 0, dC, dC + 3.6, dC + 7.6, Lo]),
      back: K.pchip([22.625, 24.0, 24.875, 25.75, 26.75], [0, 4.5, 24, 51, Lb]) };
  }
  const Pth = OPT.paths(0);
  return { fix: T < 6.875 ? null : OPT.uAtD(Pth.fix[0], FR.fix(T)), out: T < 12.75 ? null : OPT.uAtD(Pth.out[1], FR.out(T)), back: T < 22.625 ? null : OPT.uAtD(Pth.back[0], FR.back(T)),
    outAt: T >= 20.25, backAt: T >= 26.75, dOut: FR.out(T), dBack: FR.back(T), L: FR };
};
DIAG.draw = (c, cam, o = {}) => {
  if (o.bg !== false) { PIX.rect(c, 0, 0, W, H, 'n0'); const [gx, gy] = K.S(cam, 24, -4); PIX.glow(c, gx, gy, 52 * cam.z, 'n2', 0.8); }
  EYE.draw(c, cam, o.eye || {});
  OPT.rest(c, cam);
  OPT.draw(c, cam, o);
  const Pth = OPT.paths(o.fog || 0), t = o.t || 0;
  const res = {};
  if (o.fix != null) res.fix = OPT.rays(c, cam, Pth.fix, o.fix, { col: ['a0', 'a1', 'a3'], t, a: o.fixA ?? 1, head: o.fix < 6, w: o.w });
  if (o.out != null) res.out = OPT.rays(c, cam, Pth.out, o.out, { col: ['c1', 'c2', 'c4'], t, a: o.outA ?? 1, from: o.outFrom, w: o.w, only: o.outOnly });
  if (o.under) o.under(c, cam);
  if (o.back != null) res.back = OPT.rays(c, cam, Pth.back, o.back, { col: ['m1', 'm2', 'm4'], t, a: o.backA ?? 1, from: o.backFrom, w: o.w });
  if (o.cover > 0) OPT.cover(c, cam, o.cover);
  return res;
};
})();
