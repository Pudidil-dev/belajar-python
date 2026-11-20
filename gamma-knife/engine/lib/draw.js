// D — small world-space drawing helpers on top of LIT's flat shading (every shape: a flat base colour, a light top-left
// edge, a darker band bottom-right), and a few screen-space marks (wavy photon paths, arrows, small flashes).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const D = window.D = {};
const R = n => typeof n === 'string' ? window.RAMP[n] : n;
D.R = R;
const blobPath = pts => {
  const n = pts.length, p = new Path2D(), sm = [];
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < 6; k++) { const t = k / 6, t2 = t * t, t3 = t2 * t; sm.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  sm.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath();
  return { path: p, box: LIT.ptsBox(sm), pts: sm };
};
D.blobPath = blobPath;
D.rr = (c, cam, x0, y0, x1, y1, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fill(); }, LIT.wbox(cam, [x0, y0, x1, y1]), R(ramp), o);
D.circ = (c, cam, x, y, r, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [x - r, y - r, x + r, y + r]), R(ramp), o);
D.ell = (c, cam, x, y, rx, ry, rot, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }, LIT.wbox(cam, [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)]), R(ramp), o);
D.poly = (c, cam, pts, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }, LIT.wbox(cam, LIT.ptsBox(pts)), R(ramp), o);
D.blob = (c, cam, pts, ramp, o = {}) => { const b = blobPath(pts); return LIT.path(c, cam, b.path, b.box, R(ramp), o); };
D.ring = (c, cam, x, y, r0, r1, a0, a1, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.arc(x, y, r1, a0, a1); ctx.arc(x, y, r0, a1, a0, true); ctx.closePath(); ctx.fill(); }, LIT.wbox(cam, [x - r1, y - r1, x + r1, y + r1]), R(ramp), o);
D.tube = (c, cam, pts, w, ramp, o = {}) => LIT.tube(c, cam, pts, w, R(ramp), o);
D.line = (c, cam, pts, col, o = {}) => LIT.line(c, cam, pts, col, o);
D.sphere = (c, cam, x, y, r, ramp, o = {}) => { const [sx, sy] = K.S(cam, x, y); LIT.sphere(c, sx, sy, r * cam.z, R(ramp), o); };
// a screen-space line of width w px (crisp after quantizing), solid colour
D.stroke = (c, pts, col, w = 1, a = 1, dash = null) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= a; c.strokeStyle = P[col] || col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore();
};
D.wstroke = (c, cam, pts, col, w = 1, a = 1, dash = null) => D.stroke(c, pts.map(([x, y]) => K.S(cam, x, y)), col, w, a, dash);
// text centred on a world point (atom symbols, signs on spheres)
D.wtext = (c, cam, s, x, y, col = 'w', o = {}) => { const [sx, sy] = K.S(cam, x, y); PIX.text(c, s, Math.round(sx), Math.round(sy) - 3, col, { align: 'center', shadow: o.shadow ?? null }); };
// a gamma photon: a wavy line from a to b (world), wavelength lam and amplitude amp in px, travelling phase ph, an arrowhead
D.photon = (c, cam, a, b, o = {}) => {
  const [ax, ay] = K.S(cam, a[0], a[1]), [bx, by] = K.S(cam, b[0], b[1]), L = Math.hypot(bx - ax, by - ay); if (L < 2) return;
  const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux, lam = o.lam ?? 12, amp = o.amp ?? 4, ph = o.ph ?? 0, head = o.head ?? true;
  const pts = []; for (let s = 0; s <= L; s += 1) { const k = Math.min(1, s / 8, (L - s) / 6); pts.push([ax + ux * s + nx * Math.sin((s / lam - ph) * TAU) * amp * k, ay + uy * s + ny * Math.sin((s / lam - ph) * TAU) * amp * k]); }
  if (o.glow !== false) D.stroke(c, pts, o.glowCol || 'ga1', (o.w ?? 2) + 2, 0.5 * (o.a ?? 1));
  D.stroke(c, pts, o.col || 'ga4', o.w ?? 2, o.a ?? 1);
  if (head) { const hx = bx, hy = by, s = o.hs ?? 5; D.stroke(c, [[hx - ux * s + nx * s * 0.7, hy - uy * s + ny * s * 0.7], [hx, hy], [hx - ux * s - nx * s * 0.7, hy - uy * s - ny * s * 0.7]], o.col || 'ga4', o.w ?? 2, o.a ?? 1); }
};
D.arrow = (c, x0, y0, x1, y1, col = 'ga4', w = 2, hs = 5, a = 1) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  D.stroke(c, [[x0, y0], [x1, y1]], col, w, a); D.stroke(c, [[x1 - ux * hs - uy * hs * 0.7, y1 - uy * hs + ux * hs * 0.7], [x1, y1], [x1 - ux * hs + uy * hs * 0.7, y1 - uy * hs - ux * hs * 0.7]], col, w, a);
};
// a small ionization / interaction flash: a few short spikes round a bright core (kept small: no explosions)
D.flash = (c, sx, sy, r, a = 1, ph = 0) => {
  if (a <= 0.02 || r < 1) return;
  FX.glowL(c, sx, sy, r * 1.6, ['ga1', 'ga2', 'ga3', 'ga4'], 0.35 * a, 1.7);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= a; c.fillStyle = P.ga5;
  for (let k = 0; k < 8; k++) { const an = k / 8 * TAU + ph, rr = r * (k % 2 ? 0.55 : 1); for (let s = 2; s < rr; s++) c.fillRect(Math.round(sx + Math.cos(an) * s), Math.round(sy + Math.sin(an) * s), 1, 1); }
  c.fillStyle = P.w; c.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); c.restore();
};
// dashed crosshair through a screen point
D.cross = (c, sx, sy, len, col = 'g8', a = 1) => { D.stroke(c, [[sx - len, sy], [sx + len, sy]], col, 1, a, [4, 3]); D.stroke(c, [[sx, sy - len], [sx, sy + len]], col, 1, a, [4, 3]); };
D.init = () => {};
})();
