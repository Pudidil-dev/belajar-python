'use strict';
// ============================================================================
// THE TRACER (panel 4): a Tc-99m sestamibi vial (crimped metal cap, glass,
// white label with the radiation trefoil, 740 MBq / 20 mCi), a blue-gloved
// hand on a syringe and the forearm with a taped IV cannula (no needle in
// skin on screen). Units: px at zoom 1, origin = frame centre.
// ============================================================================
function drawVial(cam, x, y, sc, t, o) {
  o = o || {};
  const z = cam.z * sc, X = u => cam.x(x + u * sc), Y = v => cam.y(y + v * sc);
  // glass body (rounded), shoulders, neck
  const body = maskRR(X(-56), Y(-60), X(56), Y(120), 18 * z);
  mFill(body, P.XR6);
  for (let j = 0; j < body.h; j++) for (let i = 0; i < body.w; i++) {
    if (!body.d[j * body.w + i]) continue; const px = body.x0 + i, py = body.y0 + j, u = (px - X(0)) / (56 * z);
    let c = P.XR6; if (u < -0.82) c = P.XR4; else if (u < -0.62) c = P.XR5; else if (u > 0.86) c = P.XR3; else if (u > 0.7) c = P.XR4; else if (u > -0.5 && u < -0.36) c = P.C6;
    pset(px, py, c);
  }
  poly([X(-56), Y(-58), X(-30), Y(-86), X(30), Y(-86), X(56), Y(-58)], P.XR5);
  poly([X(-46), Y(-60), X(-30), Y(-80), X(-22), Y(-80), X(-36), Y(-60)], P.C6);
  rect(X(-32), Y(-104), X(32), Y(-84), P.XR5); rect(X(-32), Y(-104), X(-22), Y(-84), P.C6); rect(X(22), Y(-104), X(32), Y(-84), P.XR3);
  // crimped aluminium cap with ribs + flip-off top
  rect(X(-42), Y(-140), X(42), Y(-104), P.PM3); rect(X(-42), Y(-140), X(42), Y(-136), P.PM5);
  for (let k = -36; k <= 36; k += 8) rect(X(k), Y(-134), X(k + 3), Y(-108), k < -10 ? P.PM5 : k < 16 ? P.PM4 : P.PM2);
  rect(X(-42), Y(-110), X(42), Y(-104), P.PM2);
  rect(X(-34), Y(-152), X(34), Y(-140), P.PM4); rect(X(-34), Y(-152), X(34), Y(-149), P.PM5);
  // the label
  const lx0 = X(-50), lx1 = X(50), ly0 = Y(-46), ly1 = Y(104);
  rect(lx0, ly0, lx1, ly1, P.GW); rect(lx0, ly0, lx0 + Math.max(1, 3 * z), ly1, P.G1); rect(lx1 - Math.max(1, 6 * z), ly0, lx1, ly1, P.G2);
  const tsc = Math.max(1, Math.round(1.6 * z));
  text(FC, 'Tc-99m', X(0), Y(-38), { sc: tsc, c: P.K0, ol: null, align: 'center', bold: true });
  text(FC, 'SESTAMIBI', X(0), Y(-38) + 10 * tsc, { sc: Math.max(1, Math.round(1.25 * z)), c: P.K0, ol: null, align: 'center', bold: true });
  // the radiation trefoil on yellow
  const ty = Y(28), tx = X(0), ts = 26 * z;
  rect(tx - ts, ty - ts, tx + ts, ty + ts, P.YEL); rect(tx - ts, ty + ts - Math.max(1, 3 * z), tx + ts, ty + ts, P.GA2);
  trefoil(tx, ty, ts * 0.78, P.K0, P.YEL);
  text(FC, '740 MBq', X(0), Y(62), { sc: Math.max(1, Math.round(1.05 * z)), c: P.K0, ol: null, align: 'center' });
  text(FC, '(20 mCi)', X(0), Y(62) + 11 * Math.max(1, Math.round(1.05 * z)), { sc: Math.max(1, Math.round(1.05 * z)), c: P.K0, ol: null, align: 'center' });
  // faint orange glow of the tracer inside (shows through the glass above the label)
  if (o.glow > 0) for (let k = 0; k < 6; k++) { const a = hash(k + 91), b = hash(k + 92); tracerDot(X(-36 + 72 * a), Y(-56 + 10 * b), Math.max(1, 2 * z), 0.6 + 0.4 * Math.sin(t * 5 + k), false); }
}
function trefoil(cx, cy, r, c, bg) {
  disc(cx, cy, r, c);
  for (let k = 0; k < 3; k++) {             // cut the three gaps
    const a0 = -Math.PI / 2 + k * TAU / 3 + Math.PI / 3;
    poly([cx, cy, cx + Math.cos(a0 - 0.52) * r * 1.2, cy + Math.sin(a0 - 0.52) * r * 1.2, cx + Math.cos(a0 + 0.52) * r * 1.2, cy + Math.sin(a0 + 0.52) * r * 1.2], bg);
  }
  disc(cx, cy, r * 0.34, bg); disc(cx, cy, r * 0.22, c);
}
// ---------------------------------------------------------------- the forearm with a taped IV cannula
const ARM = { x0: -230, y0: 150, x1: 230, y1: 70, r0: 38, r1: 48 };
function armAt(u) { return [lerp(ARM.x0, ARM.x1, u), lerp(ARM.y0, ARM.y1, u) + 6 * Math.sin(u * 3), lerp(ARM.r0, ARM.r1, u)]; }
function drawArm(cam, t, o) {
  o = o || {};
  const z = cam.z, N = 40, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const [x, y, r] = armAt(i / N); const a = armAt(Math.min(1, i / N + 0.01)), b = armAt(Math.max(0, i / N - 0.01)); const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; top.push([x - dy / L * r, y + dx / L * r]); bot.push([x + dy / L * r, y - dx / L * r]); }
  const pts = []; for (const q of top) pts.push(cam.x(q[0]), cam.y(q[1])); for (let i = bot.length - 1; i >= 0; i--) pts.push(cam.x(bot[i][0]), cam.y(bot[i][1]));
  const m = maskPoly(pts);
  // cylinder shading across the arm (lit from the top)
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
    if (!m.d[j * m.w + i]) continue; const px = m.x0 + i, py = m.y0 + j, wx = cam.wx(px), wy = cam.wy(py);
    const u = clamp((wx - ARM.x0) / (ARM.x1 - ARM.x0), 0, 1), c = armAt(u), v = (wy - c[1]) / c[2];   // -1 top .. 1 bottom (approx)
    const l = -v * 0.9 + 0.1, ci = clamp((1 - l) * 2.2, 0, 4), i0 = Math.floor(ci), f = ci - i0;
    const ramp = [P.SK5, P.SK4, P.SK3, P.SK2, P.SK1];
    pset(px, py, ramp[(f > bay(px, py) && i0 < 4) ? i0 + 1 : i0]);
  }
  // a vein under the skin (bluish), the elbow crease, wrist hint
  const vp = []; for (let i = 0; i <= 20; i++) { const u = i / 20, c = armAt(u); vp.push(cam.x(c[0]), cam.y(c[1] - c[2] * 0.15 + 4 * Math.sin(u * 7))); }
  for (let i = 0; i + 3 < vp.length; i += 2) lineW(vp[i], vp[i + 1], vp[i + 2], vp[i + 3], Math.max(1, 5 * z), P.SK2, 0.55);
  if (o.flow > 0) {                          // the tracer travelling up the vein (orange)
    const head = o.flow;
    for (let k = 0; k < 14; k++) { const u = head - k * 0.018; if (u < IV.u || u > 1) continue; const c = armAt(u); tracerDot(cam.x(c[0]), cam.y(c[1] - c[2] * 0.15 + 4 * Math.sin(u * 7)), Math.max(1, (k === 0 ? 3 : 2) * z), 0.8, false); }
  }
  // the cannula: taped hub with blue wings, a port cap
  const [hx, hy] = IV.pos;
  const X = v => cam.x(hx + v), Y = v => cam.y(hy + v);
  rect(X(-30), Y(-18), X(26), Y(16), P.GW, 0.55); rect(X(-30), Y(-18), X(26), Y(-16), P.G1, 0.7);
  poly([X(-16), Y(-4), X(-6), Y(-22), X(6), Y(-22), X(10), Y(-4)], P.GB1); poly([X(-14), Y(-6), X(-6), Y(-20), X(0), Y(-20), X(2), Y(-6)], P.GB2);
  rect(X(-20), Y(-6), X(18), Y(6), P.GW); rect(X(-20), Y(-6), X(18), Y(-3), P.C6); rect(X(-20), Y(3), X(18), Y(6), P.G2);
  rect(X(18), Y(-8), X(34), Y(8), P.G1); rect(X(18), Y(-8), X(34), Y(-5), P.GW); rect(X(32), Y(-8), X(34), Y(8), P.G3);
}
const IV = { pos: [-52, 128], u: 0.39 };
// ---------------------------------------------------------------- syringe + gloved hand
// the syringe lies along a direction; tip at (tx, ty); push = 0..1 plunger travel
function drawSyringe(cam, tx, ty, ang, push, t, o) {
  o = o || {};
  const z = cam.z, ca = Math.cos(ang), sa = Math.sin(ang);
  const L = (u, v) => [cam.x(tx + u * ca - v * sa), cam.y(ty + u * sa + v * ca)];
  const band = (u0, u1, v0, v1, col, lv) => { const a = L(u0, v0), b = L(u1, v0), c = L(u1, v1), d = L(u0, v1); poly([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]], col, lv); };
  // needle into the cannula port
  band(-2, 26, -1.2, 1.2, P.PM4); band(-2, 26, -1.2, -0.3, P.PM5);
  // hub
  band(26, 42, -6, 6, P.G1); band(26, 42, -6, -3, P.GW); band(26, 42, 3, 6, P.G3);
  // barrel (clear) with the remaining tracer solution (faint orange) and graduations
  const bl = 112, fill = 1 - push;
  band(42, 42 + bl, -16, 16, P.XR5, 0.5); band(42, 42 + bl, -16, -12, P.C6); band(42, 42 + bl, 12, 16, P.XR4);
  band(42, 42 + bl * (0.08 + 0.86 * fill), -12, 12, P.OR2, 0.4);
  for (let k = 0; k < 10; k++) { const u = 52 + k * 13.5; band(u, u + 1.5, -15, k % 2 ? -8 : -4, P.PM2); }
  // plunger stopper (rubber), rod, thumb rest; barrel flange
  const ps = 42 + bl * (0.08 + 0.86 * fill);
  band(ps, ps + 10, -14, 14, P.PM1); band(ps, ps + 3, -14, 14, P.PM2);
  band(ps + 10, ps + 84, -4, 4, P.GW, 0.85); band(ps + 10, ps + 84, -4, -2, P.C6);
  band(ps + 84, ps + 92, -20, 20, P.G1); band(ps + 84, ps + 86, -20, 20, P.GW);
  band(42 + bl, 42 + bl + 7, -30, 30, P.G1); band(42 + bl, 42 + bl + 2, -30, 30, P.GW);
  // the gloved hand (blue nitrile): index and middle fingers hooked under the flange, thumb on the plunger head
  const G = [P.GB0, P.GB1, P.GB2, P.GB3];
  const cap = (u0, v0, u1, v1, r) => { const a = L(u0, v0), b = L(u1, v1); capsule2(a[0], a[1], b[0], b[1], r * z, G); };
  const fu = 42 + bl + 3;
  cap(fu + 60, 52, fu + 4, 36, 16);                           // back of the hand / palm edge
  cap(fu + 44, 66, fu + 70, 30, 22);
  cap(fu + 2, 42, fu - 6, 22, 7.5); cap(fu + 14, 50, fu + 4, 26, 7.5);   // two fingertips curled round the flange
  cap(fu + 30, 56, fu + 22, 34, 7);
  cap(fu + 64, 20, ps + 90, -6, 9);                            // thumb along the plunger to its head
  const wr = L(fu + 96, 70); capsule2(wr[0], wr[1], wr[0] + 30 * z * Math.cos(ang + 0.9), wr[1] + 30 * z * Math.sin(ang + 0.9), 26 * z, [P.GB0, P.GB1, P.GB1, P.GB2]);
}

// a shaded capsule between two screen points (ramp: [shadow, base, light, highlight])
function capsule2(ax, ay, bx, by, r, ramp) {
  const m = maskFn(Math.min(ax, bx) - r - 1, Math.min(ay, by) - r - 1, Math.max(ax, bx) + r + 1, Math.max(ay, by) + r + 1, (x, y) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, k = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
    return Math.hypot(x - ax - k * dx, y - ay - k * dy) < r;
  });
  shade(m, ramp[1], ramp[2], ramp[0], null, { k: Math.max(1, Math.round(r / 4)), kh: Math.max(1, Math.round(r / 6)) });
  if (r > 5) { const mx = (ax + bx) / 2 - r * 0.3, my = (ay + by) / 2 - r * 0.3; line(mx - (bx - ax) * 0.25, my - (by - ay) * 0.25, mx + (bx - ax) * 0.25, my + (by - ay) * 0.25, ramp[3]); }
}
