// G2 — the gantry seen face-on (scan plane), as flat illustration: bore and cover outlines, the table, the head (either
// as an illustrated cross-section from HEAD's tissue classes or as CT grey levels), and the rotating parts — the tube
// housing with its focal spot, bowtie filter and collimator, the curved detector arc with its elements, the electronics.
// World: gantry mm, isocentre at the origin, X right (the patient's left, as seen from the feet), Y up. The camera is
// {x, y, s (px/mm), cx, cy, r (roll)}; it maps world → screen with Y flipped.
(() => {
const { W, H, P } = PIX;
const G2 = window.G2 = {};
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
G2.S = (cam, X, Y) => {
  const dx = (X - cam.x) * cam.s, dy = -(Y - cam.y) * cam.s, r = cam.r || 0;
  return [(cam.cx ?? W / 2) + dx * Math.cos(r) - dy * Math.sin(r), (cam.cy ?? H / 2) + dx * Math.sin(r) + dy * Math.cos(r)];
};
G2.Sinv = (cam, sx, sy) => {
  const r = cam.r || 0, ex = sx - (cam.cx ?? W / 2), ey = sy - (cam.cy ?? H / 2), dx = ex * Math.cos(r) + ey * Math.sin(r), dy = -ex * Math.sin(r) + ey * Math.cos(r);
  return [cam.x + dx / cam.s, cam.y - dy / cam.s];
};
// a canvas transform that maps world → screen (for paths): call ctx.setTransform(...G2.M(cam))
G2.M = cam => { const r = cam.r || 0, s = cam.s, c = Math.cos(r), sn = Math.sin(r), [ox, oy] = G2.S(cam, 0, 0); return [s * c, s * sn, s * sn, -s * c, ox, oy]; };
// tissue colours for the illustration
const CLS_COL = ['k', 's3', 's4', 'q5', 'p2', 'b4', 'g8', 'w'];
const CLS_SH = ['k', 's2', 'u3', 'q4', 'p1', 'b3', 'g6', 'q6'];
let CC = null;
const ccols = () => CC || (CC = { a: CLS_COL.map(k => PIX.hex(P[k])), b: CLS_SH.map(k => PIX.hex(P[k])) });
// the illustrated cross-section, per screen pixel (nearest class on the 2× grid); o.alpha dithered coverage, o.clip
G2.head = (c, cam, o = {}) => {
  const n2 = CT.N2, px2 = CT.PX / 2, cols = ccols(), a = o.alpha ?? 1, R = (CT.FOV / 2) * 1.0;
  const [x0s, y0s] = G2.S(cam, -R, R), [x1s, y1s] = G2.S(cam, R, -R);
  const bx0 = Math.max(0, Math.floor(Math.min(x0s, x1s)) - 2), bx1 = Math.min(W, Math.ceil(Math.max(x0s, x1s)) + 2), by0 = Math.max(0, Math.floor(Math.min(y0s, y1s)) - 2), by1 = Math.min(H, Math.ceil(Math.max(y0s, y1s)) + 2);
  if (bx1 <= bx0 || by1 <= by0) return;
  const img = c.getImageData(bx0, by0, bx1 - bx0, by1 - by0), d = img.data, w = bx1 - bx0;
  for (let sy = by0; sy < by1; sy++) for (let sx = bx0; sx < bx1; sx++) {
    if (a < 1 && K.BAY(sx, sy) > a) continue;
    const [X, Y] = G2.Sinv(cam, sx + 0.5, sy + 0.5), ci = Math.floor(X / px2 + n2 / 2), ri = Math.floor(n2 / 2 - Y / px2);
    if (ci < 0 || ri < 0 || ci >= n2 || ri >= n2) continue;
    const k = CT.CLS[ri * n2 + ci]; if (!k) continue;
    // a one-texel darker rim where the class changes (flat two-tone look)
    const kr = ri + 1 < n2 ? CT.CLS[(ri + 1) * n2 + ci] : k, kl = ci > 0 ? CT.CLS[ri * n2 + ci - 1] : k;
    const col = (kr !== k || kl !== k) && cam.s > 0.9 ? cols.b[k] : cols.a[k];
    const i = ((sy - by0) * w + (sx - bx0)) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  c.putImageData(img, bx0, by0);
};
// CT grey levels of an N × N μ (or HU) image under the gantry camera
G2.ct = (c, cam, img, o = {}) => {
  const N = CT.N, k = CT.PX * cam.s, r = cam.r || 0, co = Math.cos(r) * k, si = Math.sin(r) * k, [ox, oy] = G2.S(cam, -CT.FOV / 2, CT.FOV / 2);
  const L = o.L ?? 40, Wd = o.W ?? 100, lo = L - Wd / 2;
  CT.blit(c, N, N, { ...o, M: [co, si, -si, co, ox, oy], val: i => { const v = o.hu ? img[i] : CT.toHU(img[i]); if (o.mask && !o.mask(i, v)) return null; return (v - lo) / Wd; } });
};
// outlines of the cover and the bore, and the table under the head
G2.ring = (c, cam, a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.setTransform(...G2.M(cam));
  c.lineWidth = 1.5 / cam.s; c.strokeStyle = P.g4; c.beginPath(); c.arc(0, 0, 1000, 0, TAU); c.stroke();
  c.strokeStyle = P.g6; c.beginPath(); c.arc(0, 0, 350, 0, TAU); c.stroke();
  c.strokeStyle = P.c2; c.lineWidth = 1 / cam.s; c.beginPath(); c.arc(0, 0, 362, 0, TAU); c.stroke();
  c.restore();
};
G2.table = (c, cam, a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.setTransform(...G2.M(cam));
  c.fillStyle = P.g3; c.fillRect(-230, -175, 460, 40); c.fillStyle = P.g5; c.fillRect(-230, -137, 460, 4);
  c.fillStyle = P.g2; c.fillRect(-150, -220, 300, 45);
  c.restore();
};
// rotating parts at gantry angle beta (0 = tube at the top), in the frame's own coordinates rotated into the world
G2.frame = (c, cam, beta, o = {}) => {
  const a = o.alpha ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.setTransform(...G2.M(cam)); c.rotate(-beta);
  const F = CT.D;
  // tube housing (end-on: the tube's axis runs along the patient) with the focal spot near its bottom
  c.fillStyle = P.g4; c.beginPath(); c.arc(0, F + 40, 92, 0, TAU); c.fill();
  c.fillStyle = P.g6; c.beginPath(); c.arc(-12, F + 52, 70, 0, TAU); c.fill();
  c.fillStyle = P.g5; c.beginPath(); c.arc(0, F + 40, 48, 0, TAU); c.fill();
  // bowtie filter + collimator under the port
  c.fillStyle = P.g3; c.fillRect(-60, F - 122, 120, 70);
  c.fillStyle = P.g7; c.beginPath(); c.moveTo(-55, F - 58); c.lineTo(55, F - 58); c.lineTo(55, F - 78); c.quadraticCurveTo(0, F - 62, -55, F - 78); c.closePath(); c.fill();
  c.fillStyle = P.g1; c.fillRect(-60, F - 122, 52, 12); c.fillRect(8, F - 122, 52, 12);
  // detector arc: elements on an arc of radius SDD round the focal spot, the electronics behind
  const half = CT.FAN, n = 48;
  for (let i = 0; i < n; i++) {
    const g0 = -half + 2 * half * i / n, g1 = g0 + 2 * half / n * 0.82;
    c.fillStyle = P[o.lit && o.lit(i / n) ? 'e2' : (i % 2 ? 'e1' : 'e0')];
    c.beginPath();
    for (const [g, r] of [[g0, CT.SDD], [g1, CT.SDD], [g1, CT.SDD + 30], [g0, CT.SDD + 30]]) { const x = Math.sin(g) * r, y = F - Math.cos(g) * r; c.lineTo(x, y); }
    c.closePath(); c.fill();
  }
  c.fillStyle = P.c0; c.fillRect(-300, F - CT.SDD - 120, 600, 70);
  c.restore();
};
// the fan from the focal spot to the detector arc: a sparse dither with thin edges (photons carry the beam, not a ray)
G2.fan = (c, cam, beta, a = 1, col = 'y1') => {
  if (a <= 0) return;
  const S = CT.src(beta), A = CT.det(beta, -CT.FAN), B = CT.det(beta, CT.FAN);
  const [sx, sy] = G2.S(cam, ...S), [ax, ay] = G2.S(cam, ...A), [bx, by] = G2.S(cam, ...B);
  const img = c.getImageData(0, 0, W, H), d = img.data, cl = PIX.hex(P[col]);
  const sg = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const s0 = Math.sign(sg([sx, sy], [ax, ay], bx, by));
  for (let y = 0; y < H; y++) for (let x = (y & 1); x < W; x += 2) {
    if (K.BAY(x, y) > 0.14 * a) continue;
    if (Math.sign(sg([sx, sy], [ax, ay], x, y)) !== s0 || Math.sign(sg([ax, ay], [bx, by], x, y)) !== s0 || Math.sign(sg([bx, by], [sx, sy], x, y)) !== s0) continue;
    const i = (y * W + x) * 4; d[i] = cl[0]; d[i + 1] = cl[1]; d[i + 2] = cl[2];
  }
  c.putImageData(img, 0, 0);
  c.save(); c.globalAlpha = a; PIX.bline(c, sx, sy, ax, ay, 'y1'); PIX.bline(c, sx, sy, bx, by, 'y1'); c.restore();
};
})();
