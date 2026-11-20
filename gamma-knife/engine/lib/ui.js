// UI — imaging and the machine's own screens. An axial MRI slice (grey brain, ventricles, the lesion); the MRI stack
// becoming a brain volume (S07); the treatment-plan screen with its checklist and isodose rings (S10); the CBCT check
// slice (S09); the motion-management display (S44). Text that belongs to the machine's interface is drawn even in the
// textless version.
(() => {
const { W, H, P, BAYER } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const UI = window.UI = { NAME: 'UI' };
const RGB = k => PIX.hex(P[k]);
// an axial MRI slice in screen space, centred at (sx, sy), half sizes rx, ry; o: { lesion (0..1), cross, seed, a }
UI.slice = (c, sx, sy, rx, ry, o = {}) => {
  const x0 = Math.floor(sx - rx - 2), y0 = Math.floor(sy - ry - 2), w = Math.ceil(rx * 2 + 4), h = Math.ceil(ry * 2 + 4);
  if (w < 4 || h < 4) return;
  const img = c.getImageData(clamp(x0, 0, W - 1), clamp(y0, 0, H - 1), Math.max(1, Math.min(w, W - clamp(x0, 0, W - 1))), Math.max(1, Math.min(h, H - clamp(y0, 0, H - 1)))), d = img.data, iw = img.width;
  const ox = clamp(x0, 0, W - 1), oy = clamp(y0, 0, H - 1), C = ['cb0', 'cb1', 'cb2', 'cb3', 'cb4'].map(RGB), seed = o.seed ?? 3, a = o.a ?? 1;
  for (let j = 0; j < img.height; j++) for (let i = 0; i < iw; i++) {
    const X = ox + i, Y = oy + j, u = (X + 0.5 - sx) / rx, v = (Y + 0.5 - sy) / ry, r2 = u * u + v * v; if (r2 > 1) continue;
    if (a < 1 && BAYER[(Y & 3) << 2 | (X & 3)] + 0.5 > a) continue;
    let k;
    if (r2 > 0.86) k = 4;                                                            // the skull (bright rim)
    else if (r2 > 0.78) k = 0;
    else { const g = K.fbm(u * 3.2, v * 3.2, seed, 2), vent = Math.abs(u) < 0.22 - Math.abs(v + 0.05) * 0.5 && Math.abs(v + 0.05) < 0.3 && Math.abs(u) > 0.04; k = vent ? 0 : g > 0.56 ? 3 : g > 0.44 ? 2 : 1; }
    const col = C[k], p = (j * iw + i) * 4; d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2];
  }
  c.putImageData(img, ox, oy);
  if ((o.lesion ?? 0) > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = o.lesion; c.fillStyle = P.tu4; const lx = sx + rx * 0.22, ly = sy - ry * 0.1, lr = Math.max(1.5, rx * 0.1); c.beginPath(); c.arc(lx, ly, lr, 0, TAU); c.fill(); c.restore(); }
  if (o.cross) D.cross(c, sx + rx * 0.22, sy - ry * 0.1, Math.max(rx, ry) * 1.05, 'w', 0.9);
};
UI.lesionAt = (sx, sy, rx, ry) => [sx + rx * 0.22, sy - ry * 0.1];
// a panel frame
UI.panel = (c, x, y, w, h, o = {}) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= o.a ?? 1; c.fillStyle = P[o.fill || 'n0']; c.fillRect(x, y, w, h); c.fillStyle = P[o.border || 'cy4']; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h); c.restore(); };
// the brain as a volume (lateral view) with three orthogonal planes and the lesion (S07)
UI.brain3d = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).ui = cam;
  const cb = D.blobPath(HEAD.P.BRAIN), cr = D.blobPath(HEAD.P.CEREB);
  HEAD.cerebellum(c, cam);
  LIT.path(c, cam, cb.path, cb.box, ['br1', 'br2', 'br3', 'br4', 'br5', 'br6'], { bias: 0.02, tone: HEAD.brainTone(cam) });
  const pa = o.planes ?? 1;
  if (pa > 0) {
    // the planes: axial (an ellipse seen edge-on), coronal and sagittal (tilted rectangles), cyan, through the lesion
    D.poly(c, cam, [[-120, -10], [100, -24], [120, 12], [-100, 26]], ['cy2', 'cy2', 'cy2', 'cy2'], { edge: false, alpha: 0.28 * pa }); D.poly(c, cam, [[-14, -130], [14, -138], [14, 60], [-14, 68]], ['cy2', 'cy2', 'cy2', 'cy2'], { edge: false, alpha: 0.28 * pa });
    for (const pts of [[[-120, -10], [100, -24], [120, 12], [-100, 26], [-120, -10]], [[-14, -130], [14, -138], [14, 60], [-14, 68], [-14, -130]]]) D.wstroke(c, cam, pts, 'cy4', 1, pa);
  }
  D.blob(c, cam, [[-6, -3], [-2, -7], [4, -6], [7, -1], [5, 5], [-1, 7], [-6, 4]], 'tu', { bias: 0.05 });
  if ((o.glow ?? 0) > 0) { const [sx, sy] = K.S(cam, 0, 0); FX.glowL(c, sx, sy, 12, ['tu2', 'tu3', 'tu4', 'ga4'], 0.5 * o.glow, 1.6); }
};
// the treatment-plan screen (S10): t = local time
UI.plan = (c, T, t, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'n1');
  const X = 14, Y = 96, Wd = W - 28, Hd = 420;
  UI.panel(c, X, Y, Wd, Hd, { border: 'cy3', fill: 'k' });
  PIX.text(c, 'Treatment Plan', X + 12, Y + 10, 'w', { shadow: null });
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.cy3; c.fillRect(X + 12, Y + 21, 74, 1); c.restore();
  const items = ['Target', 'Beams (192)', 'Dose', 'Confirm'];
  items.forEach((s, i) => {
    const y = Y + 32 + i * 16, on = t > 0.35 + i * 0.32;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[on ? 'gn3' : 'g3']; c.fillRect(X + 12, y, 10, 10); c.fillStyle = P.k; c.fillRect(X + 13, y + 1, 8, 8); if (on) { c.fillStyle = P.gn3; c.fillRect(X + 13, y + 1, 8, 8); } c.restore();
    if (on) PIX.text(c, '✓', X + 14, y + 2, 'k', { shadow: null });
    PIX.text(c, s, X + 28, y + 2, on ? 'w' : 'g5', { shadow: null });
  });
  // the axial slice with isodose rings closing round the target
  const sx = W / 2, sy = Y + 236, rx = 108, ry = 128;
  UI.slice(c, sx, sy, rx, ry, { lesion: 1, seed: 5 });
  const [lx, ly] = UI.lesionAt(sx, sy, rx, ry), q = MO.cubicOut(clamp((t - 0.5) / 1.4));
  const rings = [['rd3', 9], ['ga4', 15], ['gn3', 22], ['cy3', 30], ['d1', 39]];
  rings.forEach(([col, r], i) => { const k = clamp(q * 5 - i, 0, 1); if (k <= 0) return; const pts = []; for (let a = 0; a <= 40; a++) { const an = a / 40 * TAU, rr = r * (1 + 0.08 * Math.sin(an * 3 + i)) * k; pts.push([lx + Math.cos(an) * rr, ly + Math.sin(an) * rr * 0.9]); } D.stroke(c, pts, col, 1); });
  D.cross(c, lx, ly, 120, 'g8', 0.5);
  // the dose (%) legend
  const LX = X + Wd - 74, LY = Y + 30; UI.panel(c, LX, LY, 66, 76, { border: 'g7', fill: 'n0' });
  PIX.text(c, 'Dose (%)', LX + 33, LY + 4, 'w', { align: 'center', shadow: null });
  [['rd3', '100'], ['ga4', '80'], ['gn3', '60'], ['cy3', '40'], ['d1', '20']].forEach(([col, v], i) => { const y = LY + 18 + i * 11; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col]; c.fillRect(LX + 6, y + 3, 14, 2); c.restore(); PIX.text(c, '= ' + v, LX + 26, y, 'w', { shadow: null }); });
};
// the motion-management display (S44): reference vs current position, the offset growing past the tolerance
UI.motion = (c, T, t, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'n1');
  const drift = MO.smooth(clamp((t - 0.35) / 0.8)), over = drift > 0.7;
  const panels = [[16, 'gn3', 0], [186, over ? 'rd3' : 'ga4', drift]];
  for (const [x, col, d] of panels) {
    UI.panel(c, x, 110, 158, 170, { border: col, fill: 'n0' });
    window.inset(c, x + 2, 112, 154, 166, cc => { const z = 1.3, px = x + 79, py = 200, wx = -4 + d * 8, wy = -10 - d * 5; const cam = { x: wx + (W / 2 - px) / z, y: wy + (H / 2 - py) / z, z }; PIX.rect(cc, x + 2, 112, 154, 166, 'n1'); ROOM.closeHead(cc, cam, T, { cell: 5 }); });
    const cx = x + 79, cy = 182; D.stroke(c, [[cx - 70, cy], [cx + 70, cy]], col, 1, 0.9, [4, 3]); D.stroke(c, [[cx, 116], [cx, 274]], col, 1, 0.9, [4, 3]);
  }
  if (drift > 0.05) { const ax = 186 + 110, ay = 140; const pts = []; for (let k = 0; k <= 10; k++) { const an = -1.2 + k / 10 * 1.0 * drift; pts.push([ax + Math.cos(an) * 26, ay + 20 + Math.sin(an) * 26]); } D.stroke(c, pts, 'rd3', 2); const [x0, y0] = pts[9], [x1, y1] = pts[10]; D.arrow(c, x0, y0, x1, y1, 'rd3', 2, 5); }
  // the offset trace against the tolerance line
  UI.panel(c, 16, 300, W - 32, 70, { border: 'g6', fill: 'k' });
  const tol = 336 - 22;
  D.stroke(c, [[22, tol], [W - 22, tol]], 'rd2', 1, 1, [3, 3]);
  const pts = []; for (let x = 22; x <= W - 22; x++) { const u = (x - 22) / (W - 44); if (u > clamp(t / 1.2)) break; const v = 6 * Math.sin(u * 40) * 0.2 + (u > 0.55 ? (u - 0.55) * 80 : 0); pts.push([x, 356 - v]); }
  if (pts.length > 1) D.stroke(c, pts, over ? 'rd4' : 'gn3', 1);
  // the warning
  if (over) {
    const a = clamp((t - 1.0) / 0.15); UI.panel(c, 22, 392, W - 44, 46, { border: 'rd3', fill: 'rd0', a });
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P.rd4; c.beginPath(); c.moveTo(46, 399); c.lineTo(62, 429); c.lineTo(30, 429); c.closePath(); c.fill(); c.fillStyle = P.w; c.fillRect(45, 408, 3, 11); c.fillRect(45, 422, 3, 3); c.restore();
    if (a > 0.5) { PIX.text(c, 'Motion exceeds', 76, 403, 'w', { shadow: null }); PIX.text(c, 'the safe limit', 76, 417, 'w', { shadow: null }); }
  }
};
UI.init = () => {};
})();
