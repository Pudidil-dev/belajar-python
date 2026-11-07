'use strict';
// ============================================================================
// DEVICE WORLD (device pixels; at zoom 1 one device pixel = one screen pixel).
// A generic, unbranded lateral-flow cassette: ivory plastic, restrained teal
// accents, sample well near the bottom, result window in the middle with C
// above T (flow runs upward: sample pad → conjugate pad → T → C → absorbent pad).
// The cutaway shows the strip lying in the bottom shell.
// ============================================================================
const DEV = {
  bx0: -34, bx1: 34, by0: -118, by1: 118, br: 16,
  win: { x0: -7, x1: 7, y0: -56, y1: 4 },
  sx0: -6, sx1: 6,                                   // strip width
  yC: -40, yT: -18, lineH: 2,                        // control line downstream (above) the test line
  well: { x: 0, y: 84, rx: 11, ry: 13 },
  samp: [58, 108], conj: [36, 66], mem: [-66, 42], abs: [-108, -60],
};
// world-anchored hash texture: is (wx, wy) a texture dot at density d (cell = 1/zs device px)
function texDot(wx, wy, zs, d, seed) { return hash3(Math.floor(wx * zs), Math.floor(wy * zs), seed) < d; }

// fibre strokes of a pad (device coords), deterministic
const PAD_FIB = (() => {
  const r = mulberry(71), out = [];
  for (let i = 0; i < 260; i++) {
    const y = lerp(DEV.mem[0] - 46, DEV.samp[1], r()), x = lerp(DEV.sx0 + 0.5, DEV.sx1 - 0.5, r());
    const a = r() * Math.PI, L = 1.5 + r() * 3.5;
    out.push([x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2, r()]);
  }
  return out;
})();
// wet colour remap (dry → wet) for strip materials
const WETMAP = new Map();
function wetInit() {
  const pairs = [['GR0', 'GW0'], ['GR1', 'GW1'], ['GR2', 'GW2'], ['GR3', 'GW3'], ['AB0', 'GW0'], ['AB1', 'GW1'], ['AB2', 'GW2'], ['AB3', 'GW3'],
    ['BG', 'WB2'], ['N1', 'WB2'], ['N2', 'WB3'], ['N3', 'WB3'], ['K0', 'WB1']];
  for (const [a, b] of pairs) WETMAP.set(P[a], P[b]);
}
// the wetting front at device scale (device y of the front at strip x; wet below it)
const frontY = (x, fy) => fy + Math.sin(x * 0.9 + fy * 0.15) * 0.8 + (hash2(Math.floor(x), Math.floor(fy * 0.25)) - 0.5) * 1.2;

// draw the strip materials inside the screen rectangle clip (sx0..sx1, sy0..sy1)
function drawStrip(cam, o, sx0, sy0, sx1, sy1) {
  sx0 = Math.max(0, Math.round(sx0)); sy0 = Math.max(0, Math.round(sy0)); sx1 = Math.min(W, Math.round(sx1)); sy1 = Math.min(H, Math.round(sy1));
  if (sx0 >= sx1 || sy0 >= sy1) return;
  const z = cam.z, zs = Math.pow(2, Math.floor(Math.log2(Math.max(1, z)))), fy = o.wetY === undefined ? Infinity : o.wetY;
  const conjK = o.conjK === undefined ? 1 : o.conjK;      // how much dried gold the conjugate pad still holds
  for (let y = sy0; y < sy1; y++) {
    const wy = cam.wy(y + 0.5);
    for (let x = sx0; x < sx1; x++) {
      const wx = cam.wx(x + 0.5);
      if (wx < DEV.sx0 || wx >= DEV.sx1) continue;
      let c;
      const inAbs = wy >= DEV.abs[0] && wy < DEV.abs[1], inSamp = wy >= DEV.samp[0] && wy < DEV.samp[1];
      const inConj = wy >= DEV.conj[0] && wy < DEV.conj[1], inMem = wy >= DEV.mem[0] && wy < DEV.mem[1];
      if (inAbs) c = texDot(wx, wy, zs * 2, 0.16, 3) ? P.AB2 : P.AB0;
      else if (inSamp) c = texDot(wx, wy, zs * 2, 0.14, 5) ? P.AB2 : P.AB1;
      else if (inConj) c = (texDot(wx, wy, zs * 2, 0.45 * conjK, 7) ? (texDot(wx, wy, zs * 2, 0.4, 9) ? P.RU2 : P.RU1) : P.AB1);
      else if (inMem) c = texDot(wx, wy, zs * 4, 0.05, 11) ? P.GR1 : P.GR0;
      else continue;
      const wet = wy > frontY(wx, fy);
      if (wet && !inConj) c = WETMAP.get(c) || c;
      buf[y * W + x] = c;
    }
  }
  // pad overlaps: a shadow row where the upper pad lies on the next one
  const edge = (yy, col) => { const py = Math.round(cam.y(yy)); if (py >= sy0 && py < sy1) rect(Math.max(sx0, cam.x(DEV.sx0)), py, Math.min(sx1, cam.x(DEV.sx1)), py + 1, col); };
  if (o.edges) { edge(DEV.abs[1], P.AB3); edge(DEV.conj[0], P.GR3); edge(DEV.samp[0], P.AB3); }
  // fibre strokes in the pads (visible when magnified)
  if (z > 1.6) for (const f of PAD_FIB) {
    const my = (f[1] + f[3]) / 2; if (my > DEV.abs[1] && my < DEV.conj[0]) continue;
    const ax = cam.x(f[0]), ay = cam.y(f[1]), bx = cam.x(f[2]), by = cam.y(f[3]);
    if (Math.max(ax, bx) < sx0 || Math.min(ax, bx) > sx1 || Math.max(ay, by) < sy0 || Math.min(ay, by) > sy1) continue;
    const wet = my > frontY((f[0] + f[2]) / 2, fy);
    const col = wet ? (f[4] < 0.5 ? P.GW2 : P.GW3) : (f[4] < 0.5 ? P.AB2 : P.AB3);
    const w = Math.max(1, z * 0.32);
    if (w <= 1.2) line(ax, ay, bx, by, col); else lineW(ax, ay, bx, by, w, col);
  }
  // the front itself: a bright pale-blue meniscus row
  if (isFinite(fy) && o.frontLine !== false) {
    for (let x = sx0; x < sx1; x++) {
      const wx = cam.wx(x + 0.5); if (wx < DEV.sx0 || wx >= DEV.sx1) continue;
      const py = Math.round(cam.y(frontY(wx, fy)));
      if (py >= sy0 && py < sy1) { buf[py * W + x] = P.LB0; if (py + 1 < sy1) buf[(py + 1) * W + x] = P.LB1; if (z > 2.5 && py + 2 < sy1) buf[(py + 2) * W + x] = P.LB2; }
    }
  }
  // capture-zone markers on an unused strip (schematic: where the antibodies are sprayed)
  if (o.zoneMarks > 0) {
    const k = o.zoneMarks;
    for (const [yy, col] of [[DEV.yT, P.MI2], [DEV.yC, P.VI2]]) {
      const py = Math.round(cam.y(yy));
      if (py < sy0 || py >= sy1) continue;
      for (let x = sx0; x < sx1; x++) { const wx = cam.wx(x + 0.5); if (wx < DEV.sx0 || wx >= DEV.sx1) continue; if (((x >> 1) & 1) === 0 && bay(x, py) < k) buf[py * W + x] = col; }
    }
  }
  // result lines (intensity 0..1 → ordered dither, then solid)
  for (const [yy, k, g] of [[DEV.yT, o.lineT || 0, o.glintT], [DEV.yC, o.lineC || 0, o.glintC]]) {
    if (k <= 0) continue;
    const ya = cam.y(yy - DEV.lineH / 2), yb = cam.y(yy + DEV.lineH / 2);
    const a = Math.max(sy0, Math.round(ya)), b = Math.min(sy1, Math.max(Math.round(ya) + 1, Math.round(yb)));
    for (let y = a; y < b; y++) for (let x = sx0; x < sx1; x++) {
      const wx = cam.wx(x + 0.5); if (wx < DEV.sx0 || wx >= DEV.sx1) continue;
      if (k >= 1 || bay(x, y) < k) buf[y * W + x] = y === a && b - a > 2 ? P.RL1 : P.RL2;
    }
    if (g !== undefined && g >= 0 && g <= 1) {           // a glint sweeps left → right across the line
      const gx = Math.round(lerp(cam.x(DEV.sx0) - 2, cam.x(DEV.sx1) + 2, g));
      for (let y = a; y < b; y++) { pset(gx, y, P.LW); pset(gx - 1, y, P.RL0); pset(gx + 1, y + 1, P.RL0); }
      pset(gx + 1, a - 1, P.LW); pset(gx + 2, a - 2, P.RL0);
    }
  }
  // moving labels drawn by the scene (negative example: dots pass T and stop at C)
  if (o.dots) for (const d of o.dots) {
    const px = Math.round(cam.x(d[0])), py = Math.round(cam.y(d[1]));
    if (px >= sx0 && px < sx1 && py >= sy0 && py < sy1) buf[py * W + px] = d[2] || P.RU1;
  }
}

// the cassette. o: lineT, lineC, glintT, glintC, wetY, wellWet, cutY (shell kept above it), zoneMarks, dropper, dots
function drawDevice(cam, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), S = v => cam.s(v), z = cam.z;
  const cutY = o.cutY === undefined ? Infinity : o.cutY, cutSy = Y(cutY);
  const shellClip = isFinite(cutY) ? (x, y) => y < cutSy : null;
  // flat drop shadow
  const sh = maskRR(X(DEV.bx0) + 3, Y(DEV.by0) + 4, X(DEV.bx1) + 3, Y(DEV.by1) + 4, S(DEV.br));
  mFill(sh, P.K0);
  // bottom shell (tray): visible wherever the top shell is cut away
  const body = maskRR(X(DEV.bx0), Y(DEV.by0), X(DEV.bx1), Y(DEV.by1), S(DEV.br));
  if (isFinite(cutY)) {
    shade(body, P.IV2, P.IV1, P.IV3, P.IV5, { k: 2 });
    const rimI = maskRR(X(DEV.bx0 + 4), Y(DEV.by0 + 4), X(DEV.bx1 - 4), Y(DEV.by1 - 4), S(DEV.br - 4));
    shade(rimI, P.IV3, null, P.IV2, null, { k: 1 });
    mRim(rimI, P.IV4, 1, 1);
    // strip lying in the tray, with plastic posts
    const sx0 = X(DEV.sx0), sx1 = X(DEV.sx1);
    rect(sx0 - 1, Y(DEV.abs[0]) - 1, sx1 + 1, Y(DEV.samp[1]) + 1, P.IV4);
    drawStrip(cam, Object.assign({ edges: true }, o), sx0, Y(DEV.abs[0]), sx1, Y(DEV.samp[1]));
    for (const py of [-86, -30, 22, 74]) { rect(X(-10), Y(py), X(-7), Y(py + 5), P.IV1); rect(X(7), Y(py), X(10), Y(py + 5), P.IV1); rect(X(-10), Y(py + 4), X(-7), Y(py + 5), P.IV4); rect(X(7), Y(py + 4), X(10), Y(py + 5), P.IV4); }
  }
  // top shell (kept above cutY)
  shade(body, P.IV1, P.IV0, P.IV2, P.IV4, { k: Math.max(1, Math.round(z * 1.5)), clip: shellClip });
  if (!isFinite(cutY) || cutSy > Y(DEV.by0)) {
    const inShell = (x, y) => !shellClip || shellClip(x, y);
    // grip ridges near the top
    for (let i = 0; i < 4; i++) {
      const yy = -104 + i * 4;
      if (Y(yy) < cutSy) { rect(X(-12), Y(yy), X(12), Y(yy) + Math.max(1, S(1)), P.IV2); rect(X(-12), Y(yy) + Math.max(1, S(1)), X(12), Y(yy) + Math.max(2, S(2)), P.IV0); }
    }
    // result window: teal frame, recess, strip, T / C marks
    const w = DEV.win;
    if (Y(w.y0 - 4) < cutSy) {
      const fr = maskRR(X(w.x0 - 4), Y(w.y0 - 4), X(w.x1 + 4), Y(w.y1 + 4), S(4));
      shade(fr, P.TE1, P.TE0, P.TE2, P.TE3, { k: Math.max(1, Math.round(z)), clip: shellClip });
      const wy1 = Math.min(Y(w.y1), cutSy);
      if (wy1 > Y(w.y0)) {
        rect(X(w.x0), Y(w.y0), X(w.x1), wy1, P.IV4);
        drawStrip(cam, o, X(DEV.sx0), Y(w.y0) + 1, X(DEV.sx1), wy1);
        rect(X(w.x0), Y(w.y0), X(w.x1), Y(w.y0) + Math.max(1, Math.round(z)), P.IV5);            // recess shadow (top)
        rect(X(w.x0), Y(w.y0), X(w.x0) + Math.max(1, Math.round(z * 0.8)), wy1, P.IV4);           // recess shadow (left)
      }
      const ms = Math.max(1, Math.round(z * 0.85));
      if (Y(DEV.yC) < cutSy) textZ(FS, 'C', X(w.x1 + 6), Y(DEV.yC) - 2.5 * ms, ms, P.TE2);
      if (Y(DEV.yT) < cutSy) textZ(FS, 'T', X(w.x1 + 6), Y(DEV.yT) - 2.5 * ms, ms, P.TE2);
    }
    // sample well
    const wl = DEV.well;
    if (Y(wl.y - wl.ry - 3) < cutSy) {
      const ringO = maskEll(X(wl.x), Y(wl.y), S(wl.rx + 3), S(wl.ry + 3));
      shade(ringO, P.TE1, P.TE0, P.TE2, P.TE3, { k: Math.max(1, Math.round(z)), clip: shellClip });
      const hole = maskEll(X(wl.x), Y(wl.y), S(wl.rx), S(wl.ry));
      mFill(hole, P.IV4, undefined, shellClip);
      const floor = maskEll(X(wl.x), Y(wl.y) + S(2), S(wl.rx - 1.5), S(wl.ry - 2.5));
      const ww = o.wellWet || 0;
      for (let j = 0; j < floor.h; j++) for (let i = 0; i < floor.w; i++) {
        if (!floor.d[j * floor.w + i]) continue;
        const x = floor.x0 + i, y = floor.y0 + j; if (x < 0 || y < 0 || x >= W || y >= H || (shellClip && !shellClip(x, y))) continue;
        const wx = cam.wx(x + 0.5), wy = cam.wy(y + 0.5), r = Math.hypot((wx - wl.x) / wl.rx, (wy - wl.y - 2) / wl.ry);
        const wet = r < ww * 1.1;
        buf[y * W + x] = wet ? (texDot(wx, wy, 2, 0.18, 21) ? P.LB3 : P.LB2) : (texDot(wx, wy, 2, 0.16, 21) ? P.AB2 : P.AB1);
      }
      mRim(hole, P.IV5, 0, 1); mRim(hole, P.IV3, 0, -1);
    }
    mOuter(body, P.K0);
  }
  // the cut edge: a bright sweep line across the shell
  if (isFinite(cutY) && cutSy > Y(DEV.by0) && cutSy < Y(DEV.by1)) {
    const yy = Math.round(cutSy);
    for (let x = Math.max(0, Math.floor(X(DEV.bx0))); x < Math.min(W, Math.ceil(X(DEV.bx1))); x++) if (body.get(x, yy - 1)) { pset(x, yy - 1, P.TE0); pset(x, yy - 2, P.IV3); }
  }
  // dropper tip and drop
  if (o.dropper) drawDropper(cam, o.dropper);
}
// scaled font (each glyph bit rasterised as an s x s block on the native grid)
function textZ(f, s, x, y, sc, col) { text(f, s, Math.round(x), Math.round(y), { sc, c: col, ol: null }); }

// a schematic dropper tip; d = {y: tip device y, drop: null | {y, k}}
function drawDropper(cam, d) {
  const X = v => cam.x(v), Y = v => cam.y(v);
  const tip = d.y;
  const pts = [X(-3), Y(tip - 2), X(-7), Y(tip - 30), X(-9), Y(tip - 140), X(9), Y(tip - 140), X(7), Y(tip - 30), X(3), Y(tip - 2)];
  const m = maskPoly(pts);
  shade(m, P.IV0, P.LW, P.IV2, P.IV4, { k: 1 });
  // liquid inside the tip
  const lq = maskPoly([X(-2), Y(tip - 3), X(-5), Y(tip - 26), X(-6), Y(tip - 60), X(6), Y(tip - 60), X(5), Y(tip - 26), X(2), Y(tip - 3)]);
  mFill(lq, P.LB2); mRim(lq, P.LB1, 1, 0);
  rect(X(-6), Y(tip - 61), X(6), Y(tip - 60), P.LB0);
  if (d.drop) {
    const r = 3.2 * d.drop.k, cy = d.drop.y;
    const dm = maskPoly([X(0), Y(cy - r * 2.1), X(r * 0.9), Y(cy - r * 0.6), X(r), Y(cy), X(r * 0.7), Y(cy + r * 0.75), X(0), Y(cy + r), X(-r * 0.7), Y(cy + r * 0.75), X(-r), Y(cy), X(-r * 0.9), Y(cy - r * 0.6)]);
    shade(dm, P.LB1, P.LB0, P.LB3, P.LB4, { k: 1 });
    pset(X(-r * 0.4), Y(cy - r * 0.2), P.LW);
  }
}
// a bare result window panel (scenes 16-17): the window region of a cassette, magnified
function drawWindowPanel(cam, o, x0, y0, x1, y1) {
  const m = maskRR(x0, y0, x1, y1, 6);
  mFill(maskRR(x0 + 3, y0 + 4, x1 + 3, y1 + 4, 6), P.K0);
  shade(m, P.IV1, P.IV0, P.IV2, P.IV4, { k: 2 });
  const w = DEV.win, X = v => cam.x(v), Y = v => cam.y(v), S = v => cam.s(v), z = cam.z;
  const fr = maskRR(X(w.x0 - 4), Y(w.y0 - 4), X(w.x1 + 4), Y(w.y1 + 4), S(4));
  shade(fr, P.TE1, P.TE0, P.TE2, P.TE3, { k: Math.max(1, Math.round(z)) });
  rect(X(w.x0), Y(w.y0), X(w.x1), Y(w.y1), P.IV4);
  drawStrip(cam, o, X(DEV.sx0), Y(w.y0) + 1, X(DEV.sx1), Y(w.y1));
  rect(X(w.x0), Y(w.y0), X(w.x1), Y(w.y0) + Math.max(1, Math.round(z)), P.IV5);
  rect(X(w.x0), Y(w.y0), X(w.x0) + Math.max(1, Math.round(z * 0.8)), Y(w.y1), P.IV4);
  const ms = Math.max(1, Math.round(z * 0.85));
  textZ(FS, 'C', X(w.x1 + 6), Y(DEV.yC) - 2.5 * ms, ms, P.TE2);
  textZ(FS, 'T', X(w.x1 + 6), Y(DEV.yT) - 2.5 * ms, ms, P.TE2);
  mOuter(m, P.K0);
}
// the ground: deep navy, flat (the brief: no extra particles to fill the frame)
function ground(cam) { clear(P.BG); }
let G_T = 0;   // the current film time (set by renderFrame; used by ambient layers)
