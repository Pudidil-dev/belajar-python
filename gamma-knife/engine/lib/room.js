// ROOM — the treatment room around one Leksell Gamma Knife Icon. Wide (S06, S33): the white radiation unit with its bore,
// a blue stripe round the ring, the couch running into the bore, the patient under a blue blanket (a silhouette), two
// wall screens. Close (S08, S09, S43): the head lying face up on the headrest in its white thermoplastic mesh mask (the
// mask covers the face: no features are drawn), the clips, the blanket; the CBCT cone sweeping round; the infrared
// camera tracking a reflective marker on the nose.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash;
const ROOM = window.ROOM = { NAME: 'ROOM' };
// ---------- wide ----------
const MC = [96, -18], MR = [118, 150], BR = [50, 58];
ROOM.MC = MC; ROOM.BORE = BR;
ROOM.wide = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).room = cam;
  PIX.rect(c, 0, 0, W, H, 'n1');
  // the wall: panels, and the two screens (an MRI slice; the target in a crosshair)
  for (let k = -4; k <= 4; k++) D.rr(c, cam, -330 + k * 0 + (k + 4) * 82, -260, -330 + (k + 4) * 82 + 78, 108, 4, ['n1', 'n2', 'n2', 'n3'], { bias: -0.1 });
  const [fy] = [K.S(cam, 0, 112)[1]]; if (fy < H) PIX.rect(c, 0, Math.round(fy), W, H, 'n0');
  for (const [x, kind] of [[-190, 'mri'], [300, 'xh']]) {
    D.rr(c, cam, x - 34, -190, x + 34, -136, 4, ['g2', 'g3', 'g4', 'g5'], { bias: 0.05 });
    D.rr(c, cam, x - 29, -185, x + 29, -141, 2, ['k', 'n0', 'n0', 'n1'], { edge: false });
    const [sx, sy] = K.S(cam, x, -163), s = cam.z;
    if (kind === 'mri') UI.slice(c, sx, sy, 17 * s, 20 * s, { lesion: 1 });
    else { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.strokeStyle = P.cy3; c.lineWidth = 1; c.beginPath(); c.arc(sx, sy, 13 * s, 0, TAU); c.stroke(); c.restore(); D.cross(c, sx, sy, 18 * s, 'cy3', 0.9); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.tu4; c.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4); c.restore(); }
  }
  // the couch: base and the long top, sliding by o.couch (units)
  const cx = o.couch ?? 0;
  D.rr(c, cam, -170, 70, -50, 112, 6, ['g4', 'g5', 'g6', 'g7', 'g8'], { bias: 0.02 });
  // the radiation unit: the body behind, then the ring face with its bore
  D.rr(c, cam, MC[0] + 30, MC[1] - MR[1] + 12, MC[0] + MR[0] + 90, MC[1] + MR[1] - 4, 50, ['vt0', 'vt1', 'vt2', 'vt3', 'vt4'], { bias: -0.15 });
  D.ell(c, cam, MC[0], MC[1], MR[0], MR[1], 0, ['vt1', 'vt2', 'vt3', 'vt4', 'vt5'], { bias: 0.02 });
  LIT.line(c, cam, Array.from({ length: 41 }, (_, i) => { const a = Math.PI * 1.05 + i / 40 * Math.PI * 0.9; return [MC[0] + Math.cos(a) * MR[0] * 0.84, MC[1] + Math.sin(a) * MR[1] * 0.84]; }), 'cy3');
  LIT.line(c, cam, Array.from({ length: 41 }, (_, i) => { const a = Math.PI * 1.05 + i / 40 * Math.PI * 0.9; return [MC[0] + Math.cos(a) * MR[0] * 0.83, MC[1] + Math.sin(a) * MR[1] * 0.83 + 1]; }), 'cy4');
  D.ell(c, cam, MC[0] - 6, MC[1] + 6, BR[0] + 8, BR[1] + 8, 0, ['vt0', 'vt1', 'vt2', 'vt3'], { edge: false, bias: -0.1 });
  D.ell(c, cam, MC[0] - 8, MC[1] + 8, BR[0], BR[1], 0, ['n0', 'n1', 'n2', 'n3'], { edge: false });
  // the couch top and the patient, running into the bore (drawn over the ring: the bore is open)
  D.poly(c, cam, [[-300 + cx, 50], [MC[0] + 10 + cx, 50], [MC[0] + 16 + cx, 62], [-300 + cx, 62]], ['g5', 'g6', 'g7', 'g8', 'w'], { bias: 0.02 });
  ROOM.patientWide(c, cam, T, cx, o);
  // the conceptual radiation geometry, briefly (S06): faint paths from the ring to the head in the bore
  if ((o.beams ?? 0) > 0) { const [hx, hy] = K.S(cam, 50 + cx, 30); for (let k = 0; k < 14; k++) { const a = Math.PI * 0.62 + k / 13 * Math.PI * 1.1, [x0, y0] = K.S(cam, MC[0] + Math.cos(a) * MR[0] * 0.72, MC[1] + Math.sin(a) * MR[1] * 0.72); D.stroke(c, [[x0, y0], [hx, hy]], 'ga3', 1, o.beams); } c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.ga5; c.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3); c.restore(); }
  if (o.arrow > 0) { const [ax, ay] = K.S(cam, -40, 86); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = o.arrow; for (let k = 0; k < 3; k++) { c.fillStyle = P.ga4; c.fillRect(Math.round(ax + k * 7 * cam.z), Math.round(ay - 4 * cam.z), Math.max(2, Math.round(3 * cam.z)), Math.round(8 * cam.z)); } c.restore(); D.arrow(c, ax + 24 * cam.z, ay, ax + 46 * cam.z, ay, 'ga4', Math.max(2, Math.round(3 * cam.z)), 6 * cam.z, o.arrow); }
};
// the patient on the couch (wide view): a blanket over the body, the masked head toward the bore
ROOM.patientWide = (c, cam, T, cx, o = {}) => {
  D.blob(c, cam, [[-270 + cx, 50], [-262 + cx, 34], [-200 + cx, 30], [-120 + cx, 26], [-40 + cx, 22], [10 + cx, 24], [28 + cx, 34], [30 + cx, 50]], 'bl', { bias: 0 });
  for (const x of [-220, -160, -100, -40]) LIT.line(c, cam, [[x + cx, 30], [x + 10 + cx, 48]], 'bl1', {});
  // head in the mask, face up
  D.ell(c, cam, 46 + cx, 32, 22, 17, 0, 'sk', { bias: 0 });
  ROOM.meshOver(c, cam, (ctx) => { ctx.beginPath(); ctx.ellipse(46 + cx, 30, 24, 19, 0, 0, TAU); ctx.fill(); }, [22 + cx, 10, 72 + cx, 52]);
};
// a white mesh shape (the thermoplastic mask): fill with square holes on a world grid
ROOM.meshOver = (c, cam, fill, wb, o = {}) => {
  const z = cam.z, s = o.cell ?? 5;
  LIT.shape(c, ctx => { K.cam(ctx, cam); fill(ctx); }, LIT.wbox(cam, wb), ['vt2', 'vt3', 'vt4', 'vt5'], { bias: 0.05, clip: (x, y) => { const wx = cam.x + (x - W / 2) / z, wy = cam.y + (y - H / 2) / z, fx = ((wx % s) + s) % s, fy = ((wy % s) + s) % s; return !(fx > s * 0.3 && fx < s * 0.85 && fy > s * 0.3 && fy < s * 0.85); } });
};
// ---------- close: the head face up on its headrest, in the mask ----------
const HEADUP = [[-64, 6], [-60, -18], [-48, -34], [-30, -42], [-10, -44], [2, -46], [8, -44], [16, -58], [24, -46], [30, -44], [34, -40], [40, -40], [46, -36], [52, -26], [60, -16], [120, -14], [120, 28], [22, 30], [-6, 36], [-34, 34], [-54, 24]];
ROOM.HEADUP = HEADUP; ROOM.NOSE = [17, -58];
ROOM.close = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).close = cam;
  PIX.rect(c, 0, 0, W, H, 'n1');
  // the bore wall behind (the inside of the ring) and the couch
  D.rr(c, cam, -260, -260, 420, 20, 40, ['vt0', 'vt1', 'vt2', 'vt3'], { bias: -0.2 });
  for (let k = 0; k < 6; k++) LIT.line(c, cam, [[-260, -200 + k * 40], [420, -200 + k * 40]], 'vt0', { alpha: 0.5 });
  D.rr(c, cam, -200, 36, 480, 80, 6, ['g4', 'g5', 'g6', 'g7', 'g8'], { bias: 0 });
  ROOM.closeHead(c, cam, T, o);
  if (o.marker) { const [mx, my] = K.S(cam, ROOM.NOSE[0], ROOM.NOSE[1] - 4); LIT.sphere(c, mx, my, Math.max(2, 3.5 * cam.z), ['g5', 'g6', 'g7', 'g8', 'w'], { amb: 0.4 }); if (o.marker > 1) FX.glowL(c, mx, my, 6 * cam.z, ['rd1', 'rd2', 'rd3', 'rd4'], 0.4, 1.6); }
};
// the masked head on its cradle and the blanket (no background): S08, S09, S43, and under the arc of S18
ROOM.closeHead = (c, cam, T, o = {}) => {
  D.rr(c, cam, -84, 14, 40, 52, 8, ['k', 'n0', 'g1', 'g2', 'g3'], { bias: 0 });                       // the headrest cradle
  D.blob(c, cam, HEADUP, 'sk', { bias: -0.04 });                                                       // the head (a silhouette)
  D.blob(c, cam, [[60, -22], [140, -30], [260, -26], [480, -20], [480, 40], [60, 40], [52, 10]], 'bl', { bias: 0.02 });
  for (const x of [110, 190, 270, 350]) LIT.line(c, cam, [[x, -24], [x + 14, 36]], 'bl1', {});
  // the mask: a white mesh over the face and the head (it covers the face), fixed to the cradle by clips
  const cover = o.maskOn ?? 1;
  if (cover > 0) ROOM.meshOver(c, cam, ctx => { const b = D.blobPath(HEADUP.slice(0, 15).concat([[56, 12], [20, 30], [-30, 30], [-56, 22]]).map(([x, y]) => [x * 1.05, y * 1.05 - 1 - (1 - cover) * 40])); ctx.fill(b.path); }, [-70, -110, 64, 34], { cell: o.cell ?? 5.5 });
  for (const x of [-66, 30]) D.rr(c, cam, x, 14, x + 12, 30, 2, ['vt2', 'vt3', 'vt4', 'vt5'], { bias: 0.1 });
};
// the CBCT cone from above and its rotation (S09); q = sweep phase
ROOM.cbct = (c, cam, T, q, a = 1) => {
  const src = [-6, -190], L = [-90, 34], R = [80, 34];
  c.save(); c.globalAlpha = 0.42 * a; LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.beginPath(); ctx.moveTo(src[0] + 60 * Math.sin(q), src[1]); ctx.lineTo(R[0], R[1]); ctx.lineTo(L[0], L[1]); ctx.closePath(); ctx.fill(); }, LIT.wbox(cam, [-100, -200, 100, 40]), ['cy1', 'cy2', 'cy3', 'cy4'], { edge: false, alpha: 0.5 }); c.restore();
  D.wstroke(c, cam, [[src[0] + 60 * Math.sin(q), src[1]], R], 'cy4', 1, a); D.wstroke(c, cam, [[src[0] + 60 * Math.sin(q), src[1]], L], 'cy4', 1, a);
  // the rotation arrows: an ellipse round the head with two heads
  const pts = []; for (let k = 0; k <= 48; k++) { const an = k / 48 * TAU; pts.push(K.S(cam, -10 + Math.cos(an) * 96, -6 + Math.sin(an) * 22)); }
  D.stroke(c, pts.slice(0, 20), 'cy4', 2, a); D.stroke(c, pts.slice(26, 46), 'cy4', 2, a);
  const ar = (i, j) => { const [x0, y0] = pts[i], [x1, y1] = pts[j]; D.arrow(c, x0, y0, x1, y1, 'cy4', 2, 6, a); };
  ar(18, 20); ar(44, 46);
  // the X-ray source on its arm
  D.rr(c, cam, src[0] + 60 * Math.sin(q) - 14, src[1] - 16, src[0] + 60 * Math.sin(q) + 14, src[1] + 2, 3, 'vt', { bias: 0.05 });
};
// the infrared camera (S43): a housing with a ring of red LEDs, dashed beams to the nose marker
ROOM.ir = (c, cam, T, o = {}) => {
  const C = o.at || [-110, -150];
  D.poly(c, cam, [[C[0] - 40, C[1] - 26], [C[0] + 22, C[1] - 34], [C[0] + 34, C[1] + 6], [C[0] - 26, C[1] + 26]], 'g', { bias: 0.12 });
  D.ell(c, cam, C[0] + 18, C[1] + 2, 16, 16, 0, ['k', 'n0', 'g1', 'g2'], { edge: false });
  const [lx, ly] = K.S(cam, C[0] + 18, C[1] + 2);
  for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + T * 0.3, r = 10 * cam.z; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[(Math.floor(T * 8) + k) % 5 ? 'rd3' : 'rd4']; c.fillRect(Math.round(lx + Math.cos(an) * r) - 1, Math.round(ly + Math.sin(an) * r) - 1, 3, 3); c.restore(); }
  const [nx, ny] = K.S(cam, ROOM.NOSE[0], ROOM.NOSE[1] - 4);
  for (const off of [-3, 3]) D.stroke(c, [[lx + off, ly], [nx + off * 0.4, ny]], 'rd3', 1, o.a ?? 1, [5, 4]);
};
ROOM.init = () => {};
})();
