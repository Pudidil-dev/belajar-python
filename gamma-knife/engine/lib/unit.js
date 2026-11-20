// UNIT — the radiation unit of the Icon. The front ring (S12, S23, S32, S34, S45): 8 independently motorized sectors of
// 24 sealed Co-60 sources each (192), round the bore where the masked head lies. The cutaway (S11): shell, heavy
// shielding, the source sectors, the collimator body, the sector drive. The arc (S18): sectors above the head with the
// collimator block and the paths to the focal point. A sector sliding on the collimator body (S19), the collimator block
// with its 4 mm channels (S20), the size selector (S21), ON beside OFF (S22), the tunnel of one tungsten channel (S24).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const UNIT = window.UNIT = { NAME: 'UNIT' };
const RO = 150, RI = 58;
UNIT.RO = RO; UNIT.RI = RI;
const SEC = k => -Math.PI / 2 - Math.PI / 8 + k * Math.PI / 4;     // sector k's centre angle (sector 1 at the top, clockwise)
UNIT.SEC = SEC;
const capsule = (c, cam, x, y, ang, len, w, ramp, o = {}) => { const ca = Math.cos(ang), sa = Math.sin(ang); D.tube(c, cam, [[x - ca * len / 2, y - sa * len / 2], [x + ca * len / 2, y + sa * len / 2]], w, ramp, o); };
UNIT.capsule = capsule;
// the masked head seen from the end of the couch, lying in the bore (front view): a mesh oval on a pillow, the blanket
UNIT.headFront = (c, cam, x, y, s = 1) => {
  D.ell(c, cam, x, y + 26 * s, 50 * s, 16 * s, 0, ['g2', 'g3', 'g4', 'g5'], {});
  D.ell(c, cam, x, y, 30 * s, 34 * s, 0, 'sk', { bias: -0.05 });
  ROOM.meshOver(c, cam, ctx => { ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 32 * s, 36 * s, 0, 0, TAU); ctx.fill(); }, [x - 34 * s, y - 40 * s, x + 34 * s, y + 36 * s], { cell: 5 * s });
  D.blob(c, cam, [[x - 70 * s, y + 70 * s], [x - 60 * s, y + 36 * s], [x, y + 30 * s], [x + 60 * s, y + 36 * s], [x + 70 * s, y + 70 * s]], 'bl', {});
};
// the front ring. o: { st: [{on, hi, off, size}] × 8, nums, head, beams (0..1), labelsOff, cx, cy }
UNIT.front = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).unit = cam;
  const st = o.st || [];
  PIX.rect(c, 0, 0, W, H, 'n0');
  // the housing behind the sectors
  D.circ(c, cam, 0, 0, RO + 22, ['vt0', 'vt1', 'vt2', 'vt3', 'vt4'], { bias: -0.1 });
  D.circ(c, cam, 0, 0, RO + 6, ['sh0', 'sh1', 'sh2', 'sh3'], { edge: false });
  for (let k = 0; k < 8; k++) {
    const s = st[k] || {}, a = SEC(k), a0 = a - Math.PI / 8 + 0.035, a1 = a + Math.PI / 8 - 0.035;
    const ramp = s.hi > 0.5 ? ['au2', 'au3', 'au4', 'au5', 'au6'] : s.off ? ['sh1', 'sh2', 'sh3', 'sh4', 'sh5'] : ['g2', 'g3', 'g4', 'g5', 'g6'];
    D.ring(c, cam, 0, 0, RI + 4, RO, a0, a1, ramp, { bias: 0.02 });
    // 24 sources: 3 rows × 8, each a small capsule pointing at the centre
    for (let r = 0; r < 3; r++) for (let j = 0; j < 8; j++) {
      const rr = 80 + r * 22, aj = lerp(a0 + 0.06, a1 - 0.06, (j + 0.5) / 8), x = Math.cos(aj) * rr, y = Math.sin(aj) * rr;
      const lit = s.off ? ['sh2', 'sh3', 'sh4', 'sh5'] : (s.on ?? 1) > 0.5 ? ['au2', 'au3', 'au4', 'au5', 'au6'] : ['au1', 'au2', 'au3', 'au4'];
      capsule(c, cam, x, y, aj, 9, 4.6, lit, { bias: 0.05 });
    }
    if (o.nums !== false) { const [nx, ny] = K.S(cam, Math.cos(a) * (RO + 12), Math.sin(a) * (RO + 12)), r = Math.max(5, 6 * cam.z); LIT.sphere(c, nx, ny, r, ['g6', 'g7', 'g8', 'w'], { amb: 0.6 }); PIX.text(c, String(k + 1), Math.round(nx), Math.round(ny) - 3, 'k', { align: 'center', shadow: null }); }
    if (s.offBadge > 0) { const [bx, by] = K.S(cam, Math.cos(a) * 112, Math.sin(a) * 112); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = s.offBadge; c.fillStyle = P.k; c.fillRect(Math.round(bx) - 12, Math.round(by) - 7, 25, 13); c.fillStyle = P.ga4; c.fillRect(Math.round(bx) - 11, Math.round(by) - 6, 23, 11); PIX.text(c, 'OFF', Math.round(bx) + 1, Math.round(by) - 3, 'k', { align: 'center', shadow: null }); c.restore(); }
  }
  // the bore and the collimator body round it
  D.circ(c, cam, 0, 0, RI + 4, ['g3', 'g4', 'g5', 'g6'], { bias: 0.05 });
  D.circ(c, cam, 0, 0, RI - 4, ['n0', 'n1', 'n1', 'n2'], { edge: false });
  if (o.head) UNIT.headFront(c, cam, 0, 6, 0.78);
  // the paths of the sectors that are ON, toward the focus (conceptual)
  if ((o.beams ?? 0) > 0) for (let k = 0; k < 8; k++) { const s = st[k] || {}; if (!s.on || s.off) continue; const a = SEC(k), w = s.size === 16 ? 3 : s.size === 8 ? 2 : 1; for (const da of [-0.12, 0, 0.12]) { const [x0, y0] = K.S(cam, Math.cos(a + da) * 74, Math.sin(a + da) * 74), [x1, y1] = K.S(cam, 0, 4); D.stroke(c, [[x0, y0], [x1, y1]], 'ga4', w, o.beams * 0.9); } }
};
// the cutaway (S11): the ring with its upper-right quarter cut open in layers; q = how far the cut has opened (0..1)
UNIT.cutaway = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).unit = cam;
  PIX.rect(c, 0, 0, W, H, 'n1');
  const q = o.q ?? 1, a0 = -Math.PI / 2, a1 = lerp(-Math.PI / 2, Math.PI * 0.22, q);
  D.circ(c, cam, 0, 0, 176, ['vt1', 'vt2', 'vt3', 'vt4', 'vt5'], { bias: 0.02 });
  if (q > 0.01) {
    D.ring(c, cam, 0, 0, 120, 172, a0, a1, ['sh0', 'sh1', 'sh2', 'sh3', 'sh4'], { bias: 0, tone: (x, y) => ((x + y) % 7 === 0 ? 0.25 : 0) });   // heavy shielding
    D.ring(c, cam, 0, 0, 92, 120, a0, a1, ['g1', 'g2', 'g3', 'g4'], { bias: -0.05 });
    for (let r = 0; r < 2; r++) for (let j = 0; j < 14; j++) { const aj = lerp(a0 + 0.08, a1 - 0.08, (j + 0.5) / 14), rr = 99 + r * 12; if (aj > a1 - 0.06) continue; capsule(c, cam, Math.cos(aj) * rr, Math.sin(aj) * rr, aj, 10, 6, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.05 }); }
    D.ring(c, cam, 0, 0, 66, 92, a0, a1, ['g3', 'g4', 'g5', 'g6'], { bias: 0.05 });
    for (let j = 0; j < 12; j++) { const aj = lerp(a0 + 0.08, a1 - 0.08, (j + 0.5) / 12); if (aj > a1 - 0.06) continue; D.wstroke(c, cam, [[Math.cos(aj) * 68, Math.sin(aj) * 68], [Math.cos(aj) * 90, Math.sin(aj) * 90]], 'g1', 1); }
    LIT.line(c, cam, [[0, -176], [0, -66]], 'g8', {}); const ea = a1; LIT.line(c, cam, [[Math.cos(ea) * 66, Math.sin(ea) * 66], [Math.cos(ea) * 176, Math.sin(ea) * 176]], 'g8', {});
    // the sector drive: a gear on the right
    if (q > 0.6) { const gx = 128, gy = 64, gr = 18; for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + T * 1.2; capsule(c, cam, gx + Math.cos(an) * gr, gy + Math.sin(an) * gr, an, 8, 6, ['g3', 'g4', 'g5', 'g6'], {}); } D.circ(c, cam, gx, gy, gr, ['g3', 'g4', 'g5', 'g6', 'g7'], { bias: 0.1 }); D.circ(c, cam, gx, gy, 6, ['g1', 'g2', 'g3'], { edge: false }); }
  }
  D.circ(c, cam, 0, 0, 64, ['n0', 'n1', 'n1', 'n2'], { edge: false });
  UNIT.headFront(c, cam, -4, 8, 0.72);
};
// the arc (S18): sectors above the head (side view), the collimator block, the paths to the focal point
UNIT.arc = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).unit = cam;
  PIX.rect(c, 0, 0, W, H, 'n0');
  const R1 = 170, R0 = 110, n = 6, A0 = Math.PI * 1.08, A1 = Math.PI * 1.92;
  for (let k = 0; k < n; k++) {
    const a0 = lerp(A0, A1, k / n) + 0.02, a1 = lerp(A0, A1, (k + 1) / n) - 0.02, am = (a0 + a1) / 2;
    D.ring(c, cam, 0, 0, R0 + 22, R1, a0, a1, ['g2', 'g3', 'g4', 'g5', 'g6'], { bias: 0.04 });
    for (let r = 0; r < 2; r++) for (let j = 0; j < 4; j++) { const aj = lerp(a0 + 0.05, a1 - 0.05, (j + 0.5) / 4), rr = R0 + 36 + r * 16; capsule(c, cam, Math.cos(aj) * rr, Math.sin(aj) * rr, aj, 10, 6, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.05 }); }
    D.ring(c, cam, 0, 0, R0, R0 + 20, a0, a1, ['g3', 'g4', 'g5', 'g6', 'g7'], { bias: 0.08 });   // the collimator block
    // paths through the collimator to the focal point
    const lit = clamp((o.lit ?? 1) * n - k, 0, 1);
    if (lit > 0) for (const da of [-0.05, 0.05]) { const [x0, y0] = K.S(cam, Math.cos(am + da) * (R0 + 10), Math.sin(am + da) * (R0 + 10)), [x1, y1] = K.S(cam, 0, 0); D.stroke(c, [[x0, y0], [lerp(x0, x1, lit), lerp(y0, y1, lit)]], 'ga4', 1, 0.95); }
  }
  // the masked head lying under the arc (side view, face up), the focal point inside it
  const hc = o.head || [0, 18];
  c.save(); const cam2 = { x: cam.x - hc[0], y: cam.y - hc[1] + 6, z: cam.z * 0.62 }; ROOM.closeHead(c, cam2, T); c.restore();
  const [fx, fy] = K.S(cam, 0, 0); FX.glowL(c, fx, fy, 7, ['tu2', 'tu3', 'tu4', 'ga4'], 0.6, 1.5); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.tu4; c.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 5, 5); c.fillStyle = P.w; c.fillRect(Math.round(fx), Math.round(fy), 1, 1); c.restore();
  // the two cyan arrows: the sectors can move
  if ((o.arrows ?? 1) > 0) for (const s of [-1, 1]) { const pts = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + s * (0.12 + k / 12 * 0.32); pts.push(K.S(cam, Math.cos(a) * (R1 + 18), Math.sin(a) * (R1 + 18))); } D.stroke(c, pts, 'cy4', 2); const [x0, y0] = pts[11], [x1, y1] = pts[12]; D.arrow(c, x0, y0, x1, y1, 'cy4', 2, 5); }
};
// a sector sliding along the collimator body (S19): x = the sector's position (units); the drive gear turns with it
UNIT.slide = (c, cam, T, x, o = {}) => {
  (window.__cams = window.__cams || {}).unit = cam;
  PIX.rect(c, 0, 0, W, H, 'n0');
  D.rr(c, cam, -200, 30, 200, 92, 6, ['g2', 'g3', 'g4', 'g5', 'g6'], { bias: 0.02 });            // the collimator body
  for (let k = -9; k <= 9; k++) { D.rr(c, cam, k * 20 - 3, 36, k * 20 + 3, 86, 2, ['k', 'n0', 'g1', 'g2'], { edge: false }); }   // its channels
  D.rr(c, cam, -200, 104, 200, 116, 2, ['g3', 'g4', 'g5', 'g6'], {});                              // the rack
  for (let k = -40; k <= 40; k++) D.rr(c, cam, k * 5, 100, k * 5 + 2.5, 104, 0.5, ['g3', 'g4', 'g5'], { edge: false });
  // the sector: a shielded carrier with its sources in columns
  D.rr(c, cam, x - 70, -110, x + 70, 26, 10, ['sh1', 'sh2', 'sh3', 'sh4', 'sh5'], { bias: 0.04 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) capsule(c, cam, x - 50 + i * 20, -84 + j * 26, Math.PI / 2, 18, 11, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.05 });
  // the drive gear on the rack
  const gx = x + 54, gy = 122, gr = 16, an0 = -x / gr; for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + an0; capsule(c, cam, gx + Math.cos(an) * gr, gy + Math.sin(an) * gr, an, 7, 5, ['g3', 'g4', 'g5', 'g6'], {}); }
  D.circ(c, cam, gx, gy, gr, ['g4', 'g5', 'g6', 'g7'], { bias: 0.1 }); D.circ(c, cam, gx, gy, 5, ['g1', 'g2', 'g3'], { edge: false });
  if ((o.arrow ?? 0) > 0) { const [ax, ay] = K.S(cam, x + 86, -40); D.arrow(c, ax, ay, ax + 46 * cam.z, ay, 'cy4', 3, 8, o.arrow); D.arrow(c, ax - 6, ay, ax + 30 * cam.z, ay, 'cy3', 1, 1, o.arrow * 0.6); }
};
// the collimator block with its 4 mm channels (S20): sources on the left, paths through the channels to the right
UNIT.block = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).unit = cam;
  PIX.rect(c, 0, 0, W, H, 'n0');
  for (let j = 0; j < 5; j++) capsule(c, cam, -150, -80 + j * 40, 0, 26, 16, ['au2', 'au3', 'au4', 'au5', 'au6'], { bias: 0.05 });
  D.rr(c, cam, -128, -110, -112, 110, 3, ['sh2', 'sh3', 'sh4', 'sh5'], {});
  D.rr(c, cam, -40, -110, 60, 110, 6, ['g3', 'g4', 'g5', 'g6', 'g7'], { bias: 0.06 });
  const lit = o.lit ?? 1;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 5; j++) {
    const x = -10 + i * 40, y = -80 + j * 40; D.circ(c, cam, x, y, 7, ['k', 'n0', 'g1', 'g2'], { edge: false });
    if (i === 0) { const [x0, y0] = K.S(cam, -136, y), [x1, y1] = K.S(cam, 200, y); D.stroke(c, [[x0, y0], [lerp(x0, x1, lit), y0]], 'ga4', 2, 0.95); }
  }
};
// the tunnel down one tungsten channel (S24): rings recede to the bright exit; f = how far the camera has travelled
UNIT.tunnel = (c, T, f, o = {}) => {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const cx = W / 2, cy = H * 0.46, n = 16;
  for (let k = n; k >= 0; k--) {
    const d = k + 1 - (f * 4) % 1, s = 300 / Math.max(0.6, d), shade = clamp(1 - d / n, 0, 1);
    const col = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'][Math.min(5, Math.floor(shade * 6))];
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col]; c.beginPath(); c.arc(cx, cy, s * 0.55, 0, TAU); c.fill(); c.fillStyle = P[['k', 'n0', 'g1', 'g2', 'g3', 'g4'][Math.min(5, Math.floor(shade * 6))]]; c.beginPath(); c.arc(cx, cy, s * 0.5, 0, TAU); c.fill(); c.restore();
  }
  FX.glowL(c, cx, cy, 26, ['g6', 'g7', 'g8', 'w'], 0.8, 1.6);
  // the beam down the channel toward the light (a conceptual path)
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.85; c.fillStyle = P.ga3; c.beginPath(); c.moveTo(cx - 3, cy); c.lineTo(cx + 3, cy); c.lineTo(cx + 34, H + 10); c.lineTo(cx - 34, H + 10); c.closePath(); c.fill(); c.globalAlpha = 1; c.fillStyle = P.ga5; c.beginPath(); c.moveTo(cx - 1, cy); c.lineTo(cx + 1, cy); c.lineTo(cx + 9, H + 10); c.lineTo(cx - 9, H + 10); c.closePath(); c.fill(); c.restore();
};
UNIT.init = () => {};
})();
