// BAL — the balloon landscape (asset A) and the viewing aperture it is seen through.
// An original picture, drawn procedurally in "design" coordinates (the 360×640 opening frame at scale 1; the aperture's
// centre is A = (180, 300)): a pale sky with four flat clouds, two ranges of distant blue hills on a horizon at y = 392,
// muted green fields in perspective, a narrow road winding from the bottom of the frame to the vanishing point, and above
// it a coral-and-cream hot-air balloon with a zigzag band, a basket and four ropes. It is a still picture — a lit slide
// inside the instrument — so nothing in it moves; what changes is how the optics present it (scale, focus, the aperture).
//   BAL.picture(c, cx, cy, s)       the picture with design point A at screen (cx, cy), scale s (no clipping)
//   BAL.view(c, o)                  the patient's view: the picture inside a round aperture of radius o.R at (o.cx, o.cy),
//                                   scale o.s, defocus o.blur (px), dithered vignette bands inside the rim, dark outside
//   BAL.inset(c, o)                 the same view as a small round inset with a ring (the patient-view inset)
//   BAL.state(u)                    u = 0: the opening frame (aperture barely cutting the corners) … u = 1: the aperture
//                                   apparent (R = 176); S01 runs 0 → 1, S21 runs 1 → 0, S02/S20 continue from u = 1
(() => {
const { W, H, P } = PIX;
const BAL = window.BAL = { NAME: 'BAL' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const AX = 180, AY = 300, HZ = 392;                      // aperture centre and horizon (design px)
BAL.A = [AX, AY]; BAL.HZ = HZ;
const F = (c, col) => { c.fillStyle = P[col] || col; };
// ---------- sky ----------
const CLOUDS = [
  { c: [[50, 134, 20], [74, 122, 26], [100, 128, 22], [122, 138, 15]], base: 147 },
  { c: [[262, 200, 14], [283, 190, 20], [305, 198, 15]], base: 209 },
  { c: [[238, 68, 10], [252, 62, 13], [267, 68, 9]], base: 75 },
  { c: [[30, 304, 9], [45, 298, 12], [60, 304, 9]], base: 311 },
  { c: [[-48, 226, 14], [-28, 216, 19], [-6, 224, 13]], base: 234 },
  { c: [[392, 112, 13], [410, 104, 17], [430, 112, 12]], base: 121 },
];
function cloud(c, cl) {
  const p = new Path2D(); let x0 = 1e9, x1 = -1e9;
  for (const [x, y, r] of cl.c) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); }
  p.rect(x0 + 6, cl.base - 12, x1 - x0 - 12, 12);
  c.save(); c.clip(p);
  F(c, 'cl1'); c.fillRect(x0 - 2, cl.base - 80, x1 - x0 + 4, 84);
  F(c, 'w'); for (const [x, y, r] of cl.c) { c.beginPath(); c.arc(x - 2.5, y - 3, Math.max(1, r - 4), 0, TAU); c.fill(); }
  F(c, 'cl0'); c.fillRect(x0 - 2, cl.base - 6, x1 - x0 + 4, 8);
  c.restore();
}
// ---------- hills (rolling silhouettes: y of the ridge at x) ----------
const ridge = (x, seed, amp, base) => base - amp * (0.55 + 0.45 * Math.sin(x * 0.011 + seed)) * (0.6 + 0.4 * Math.sin(x * 0.027 + seed * 2.3)) - amp * 0.25 * Math.sin(x * 0.006 + seed * 0.7);
function hills(c) {
  for (const [seed, amp, base, col, hi] of [[1.3, 30, HZ - 4, 'hl2', 'hl3'], [4.1, 20, HZ + 1, 'hl1', 'hl2'], [2.2, 10, HZ + 2, 'hl0', 'hl1']]) {
    c.beginPath(); c.moveTo(-90, HZ + 4);
    for (let x = -90; x <= 450; x += 3) c.lineTo(x, ridge(x, seed, amp, base));
    c.lineTo(450, HZ + 4); c.closePath(); F(c, col); c.fill();
    // a lighter band along each ridge (flat two-tone)
    c.save(); c.clip(); c.beginPath(); c.moveTo(-90, HZ + 4);
    for (let x = -90; x <= 450; x += 3) c.lineTo(x, ridge(x, seed, amp, base) + 3);
    c.lineTo(450, -200); c.lineTo(-90, -200); c.closePath(); F(c, hi); c.fill(); c.restore();
  }
}
// ---------- the ground: fields in perspective, hedgerows, the road ----------
const bandY = i => HZ + 250 * Math.pow(i / 7, 1.7);                                 // field boundaries (design y)
const SECT = [-760, -420, -170, 40, 310, 520, 800, 1200];                           // where the field dividers meet y = 642
const sectX = (j, y) => AX + (SECT[j] - AX) * (y - HZ) / 250;
const FIELD = ['f2', 'f1', 'f3', 'f2', 'f4', 'f1', 'f3', 'f5', 'f2', 'f3'];
const roadX = s => AX + 34 * Math.sin(Math.PI * (1 - s) * 1.5) * Math.pow(s, 0.7) - 26 * s * s;
const roadW = s => 2.2 + 56 * Math.pow(s, 1.5);
const roadY = s => HZ + 250 * Math.pow(s, 1.7);
BAL.road = { x: roadX, w: roadW, y: roadY };
function ground(c, s) {
  F(c, 'f2'); c.fillRect(-90, HZ, 540, 400);
  for (let i = 0; i < 9; i++) for (let j = 0; j < SECT.length - 1; j++) {
    const y0 = bandY(i), y1 = bandY(i + 1) + 0.6;
    c.beginPath(); c.moveTo(sectX(j, y0), y0); c.lineTo(sectX(j + 1, y0) + 0.6, y0); c.lineTo(sectX(j + 1, y1) + 0.6, y1); c.lineTo(sectX(j, y1), y1); c.closePath();
    const k = Math.floor(h(i * 7 + 3, j * 5 + 1) * FIELD.length); F(c, FIELD[k]); c.fill();
    // furrows in every third field: thin lines toward the vanishing point
    if (s > 0.5 && (i + j) % 3 === 0 && i > 1) {
      c.save(); c.clip(); c.strokeStyle = P[k % 2 ? 'f1' : 'f3']; c.lineWidth = 1;
      for (let q = 1; q < 6; q++) { const xb = lerp(SECT[j], SECT[j + 1], q / 6); c.beginPath(); c.moveTo(AX, HZ); c.lineTo(xb, 642); c.stroke(); }
      c.restore();
    }
  }
  // hedgerows along the boundaries, thicker toward the viewer; small trees where they cross
  F(c, 'f0');
  for (let i = 1; i < 9; i++) { const y = bandY(i), t = 0.6 + i * 0.45; c.fillRect(-90, y - t / 2, 540, t); }
  c.strokeStyle = P.f0;
  for (let j = 1; j < SECT.length - 1; j++) { c.lineWidth = 1.2; c.beginPath(); c.moveTo(sectX(j, bandY(1)), bandY(1)); c.lineTo(sectX(j, 700), 700); c.stroke(); }
  for (let i = 1; i < 7; i++) for (let j = 1; j < SECT.length - 1; j++) {
    if (h(i, j + 40) < 0.45) continue;
    const y = bandY(i), x = sectX(j, y), r = 1.2 + i * 1.5;
    if (Math.abs(x - roadX(Math.pow((y - HZ) / 250, 1 / 1.7))) < roadW(Math.pow((y - HZ) / 250, 1 / 1.7)) + r + 2) continue;
    F(c, 'f0'); c.beginPath(); c.arc(x, y - r * 0.9, r, 0, TAU); c.fill();
    F(c, 'f1'); c.beginPath(); c.arc(x - r * 0.3, y - r * 1.2, r * 0.55, 0, TAU); c.fill();
  }
  // the road: edges, surface, a centre line of dashes that shrink with distance
  const L = [], R = [];
  for (let k = 0; k <= 60; k++) { const q = Math.pow(k / 60, 1.25) * 1.25, y = roadY(q); L.push([roadX(q) - roadW(q), y]); R.push([roadX(q) + roadW(q), y]); }
  const poly = (a, b, col) => { c.beginPath(); a.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); b.slice().reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); F(c, col); c.fill(); };
  poly(L.map(([x, y]) => [x - 0.8 - (y - HZ) * 0.012, y]), R.map(([x, y]) => [x + 0.8 + (y - HZ) * 0.012, y]), 'rd0');
  poly(L, R, 'rd1');
  for (let k = 0; k < 12; k++) {
    const q0 = Math.pow((k + 0.3) / 12, 1.5) * 1.2, q1 = Math.pow((k + 0.72) / 12, 1.5) * 1.2;
    if (q0 < 0.04) continue;
    const w0 = roadW(q0) * 0.07, w1 = roadW(q1) * 0.07;
    c.beginPath(); c.moveTo(roadX(q0) - w0, roadY(q0)); c.lineTo(roadX(q0) + w0, roadY(q0)); c.lineTo(roadX(q1) + w1, roadY(q1)); c.lineTo(roadX(q1) - w1, roadY(q1)); c.closePath(); F(c, 'rd2'); c.fill();
  }
}
// ---------- the balloon ----------
const BX = 180, BY = 238, BR = 52, TOP = 54, LOW = 80, MOUTH = 10;
const hw = y => y <= BY ? BR * Math.sqrt(Math.max(0, 1 - Math.pow((y - BY) / TOP, 2))) : MOUTH + (BR - MOUTH) * (1 - Math.pow((y - BY) / LOW, 1.6));
BAL.balloon = { x: BX, y: BY, r: BR, top: BY - TOP, mouth: BY + LOW };
function balloon(c, s) {
  const y0 = BY - TOP, y1 = BY + LOW, N = 7;
  const env = new Path2D();
  for (let y = y0; y <= y1; y += 1) { const x = BX - hw(y); y === y0 ? env.moveTo(x, y) : env.lineTo(x, y); }
  for (let y = y1; y >= y0; y -= 1) env.lineTo(BX + hw(y), y);
  env.closePath();
  c.save(); c.clip(env);
  // gores: equal angles round the envelope, so the stripes narrow toward the edges
  for (let k = 0; k < N; k++) {
    const a0 = -Math.PI / 2 + k * Math.PI / N, a1 = a0 + Math.PI / N;
    c.beginPath();
    for (let y = y0; y <= y1; y += 2) { const x = BX + hw(y) * Math.sin(a0); y === y0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    for (let y = y1; y >= y0; y -= 2) c.lineTo(BX + hw(y) * Math.sin(a1) + 0.6, y);
    c.closePath(); F(c, k % 2 ? 'cr1' : 'bc1'); c.fill();
  }
  // the zigzag band just below the widest part (a ring seen from below: lower in the middle)
  const bandAt = (x, off) => BY + 9 + off * 1.15 + 7 * (1 - Math.pow((x - BX) / BR, 2));
  c.beginPath(); for (let x = BX - BR; x <= BX + BR; x += 2) x === BX - BR ? c.moveTo(x, bandAt(x, 0)) : c.lineTo(x, bandAt(x, 0));
  for (let x = BX + BR; x >= BX - BR; x -= 2) c.lineTo(x, bandAt(x, 15));
  c.closePath(); F(c, 'bc0'); c.fill();
  if (s > 0.45) {
    F(c, 'cr2');
    for (let k = 0; k < 2 * N; k++) {
      const a0 = -Math.PI / 2 + k * Math.PI / (2 * N), a1 = a0 + Math.PI / (2 * N), am = (a0 + a1) / 2;
      const xa = BX + BR * Math.sin(a0), xb = BX + BR * Math.sin(a1), xm = BX + BR * Math.sin(am), up = k % 2 === 0;
      c.beginPath(); c.moveTo(xa, bandAt(xa, up ? 13 : 2)); c.lineTo(xm, bandAt(xm, up ? 2 : 13)); c.lineTo(xb, bandAt(xb, up ? 13 : 2)); c.closePath(); c.fill();
    }
  }
  // the skirt at the mouth, and flat two-tone shading: a shadow on the right third, a highlight on the upper left
  F(c, 'bc0'); c.fillRect(BX - 22, y1 - 8, 44, 9);
  c.globalAlpha = 0.3; F(c, '#3a1c28');
  c.beginPath(); for (let y = y0; y <= y1; y += 2) { const x = BX + hw(y) * 0.5; y === y0 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.lineTo(BX + BR + 4, y1); c.lineTo(BX + BR + 4, y0); c.closePath(); c.fill();
  c.globalAlpha = 0.32; F(c, 'w'); c.beginPath(); c.ellipse(BX - 20, BY - 24, 9, 20, 0.35, 0, TAU); c.fill();
  c.restore();
  // ropes and basket
  c.strokeStyle = P.bk0; c.lineWidth = 1;
  for (const [xa, xb] of [[-9, -8], [-3.5, -3], [3.5, 3], [9, 8]]) { c.beginPath(); c.moveTo(BX + xa, y1); c.lineTo(BX + xb, y1 + 15); c.stroke(); }
  F(c, 'bk1'); c.fillRect(BX - 9, y1 + 15, 18, 13);
  F(c, 'bk0'); c.fillRect(BX - 9, y1 + 15, 18, 2); c.fillRect(BX + 3, y1 + 15, 6, 13);
  if (s > 0.6) { c.fillRect(BX - 9, y1 + 21, 18, 1); F(c, 'a2'); c.fillRect(BX - 1, y1 + 4, 2, 3); }
}
// ---------- the picture ----------
BAL.picture = (c, cx, cy, s) => {
  c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-AX, -AY);
  const g = c.createLinearGradient(0, -120, 0, HZ);
  for (const [o, k] of [[0, 'sk0'], [0.36, 'sk0'], [0.4, 'sk1'], [0.62, 'sk1'], [0.66, 'sk2'], [0.86, 'sk2'], [0.9, 'sk3'], [1, 'sk3']]) g.addColorStop(o, P[k]);
  c.fillStyle = g; c.fillRect(-90, -140, 540, HZ + 141);
  for (const cl of CLOUDS) cloud(c, cl);
  hills(c);
  ground(c, s);
  balloon(c, s);
  c.restore();
};
// ---------- the view through the aperture ----------
const PAD = 24;
let off = null, ox = null;
const offscreen = () => { if (!off) { off = document.createElement('canvas'); off.width = W + 2 * PAD; off.height = H + 2 * PAD; ox = off.getContext('2d'); } return ox; };
// o = {cx, cy, R, s, blur (px), dark ('k'), vig (1: vignette bands), glare (0..1)}
BAL.view = (c, o) => {
  const { cx, cy, R, s } = o, blur = o.blur || 0;
  const x0 = Math.max(0, Math.floor(cx - R - 1)), x1 = Math.min(W, Math.ceil(cx + R + 1)), y0 = Math.max(0, Math.floor(cy - R - 1)), y1 = Math.min(H, Math.ceil(cy + R + 1));
  if (x1 <= x0 || y1 <= y0) return;
  const g = offscreen();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, off.width, off.height);
  g.save(); g.beginPath(); g.rect(x0 + PAD - PAD, y0 + PAD - PAD, x1 - x0 + 2 * PAD, y1 - y0 + 2 * PAD); g.clip();
  BAL.picture(g, cx + PAD, cy + PAD, s); g.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
  if (blur > 0.05) c.filter = `blur(${blur.toFixed(2)}px)`;
  c.drawImage(off, -PAD, -PAD);
  c.restore();
  // the rim: dithered vignette bands just inside the aperture, the dark stop outside it (within the view's box)
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, w = x1 - x0, dk = PIX.hex(P[o.dark || 'k']), vg = o.vig ?? 1;
  const b1 = R * 0.045, b2 = R * 0.1, b3 = R * 0.17;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), i = ((y - y0) * w + (x - x0)) * 4;
    if (r > R) { if (o.outside !== false && r < R + 1.5) { d[i] = dk[0]; d[i + 1] = dk[1]; d[i + 2] = dk[2]; d[i + 3] = 255; } continue; }
    const e = R - r; if (e > b3 || vg <= 0) continue;
    const a = (e < b1 ? 0.6 : e < b2 ? 0.34 : 0.15) * vg;
    if (K.BAY(x, y) < a) { d[i] = dk[0]; d[i + 1] = dk[1]; d[i + 2] = dk[2]; }
  }
  c.putImageData(img, x0, y0);
};
// the opening state u = 0 … 1 (see the header)
BAL.state = u => ({ cx: AX, cy: AY, R: lerp(356, 176, u), s: lerp(1, 0.86, u) });
// everything outside the aperture is the dark inside of the instrument
BAL.frame = (c, st, o = {}) => {
  PIX.rect(c, 0, 0, W, H, o.dark || 'k');
  BAL.view(c, { ...st, blur: o.blur || 0, dark: o.dark || 'k' });
};
// the patient-view inset: the same view, small, in a ring. o = {x, y, R, blur, a (0..1 dithered appearance), ring}
BAL.INSET = { x: 84, y: 214, R: 56 };
BAL.inset = (c, o = {}) => {
  const x = o.x ?? BAL.INSET.x, y = o.y ?? BAL.INSET.y, R = o.R ?? BAL.INSET.R;
  PIX.circ(c, x, y, R + 5, 'k'); PIX.circ(c, x, y, R + 3, o.ring || 'q5'); PIX.circ(c, x, y, R + 1, 'k');
  BAL.view(c, { cx: x, cy: y, R, s: 0.86 * R / 176, blur: o.blur || 0, outside: false });
};
})();
