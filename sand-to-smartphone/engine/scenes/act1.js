// ACT 1 — sand to metallurgical silicon (S01–S06)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const SQ3 = Math.sqrt(3);

// a translucent quartz grain / lump (shared by S01, S02 pull-out, S03 hero lump)
function quartzGrain(c, x, y, r, ang, glint = 0) {
  const pts = [], R = [1, 0.84, 0.97, 0.8, 1, 0.9, 0.86];
  for (let k = 0; k < 7; k++) { const a = ang + k * TAU / 7 + 0.3 * Math.sin(k * 2.1); pts.push([x + Math.cos(a) * r * R[k], y + Math.sin(a) * r * R[k]]); }
  const body = PIX.polyPath(pts);
  PIX.flat(c, body, 's3', 's1', 's4', [r * 0.35, r * 0.35], [r * 0.18, r * 0.18]);
  c.save(); c.clip(body);
  PIX.fill(c, PIX.polyPath([pts[5], pts[6], [x, y], pts[4]]), 's4', 0.7);
  PIX.line(c, x - r * 0.5, y + r * 0.1, x + r * 0.2, y - r * 0.5, 'c3', Math.max(1, r * 0.12), 0.8);
  c.restore();
  if (glint > 0) {
    const gx = x - r * 0.45, gy = y - r * 0.5, L = 3 + glint * 9;
    PIX.glow(c, gx, gy, 6 + glint * 10, 'y1', 0.5 * glint);
    PIX.rect(c, gx - L, gy, L * 2 + 1, 1, 'w', glint); PIX.rect(c, gx, gy - L, 1, L * 2 + 1, 'w', glint); PIX.rect(c, gx - 1, gy - 1, 3, 3, 'w', glint);
  }
  return body;
}
window.quartzGrain = quartzGrain;

// ================= S01 · a quartz grain on a sunrise dune =================
const slope = x => 330 + 0.30 * x + 7 * Math.sin(x / 33) + 3 * Math.sin(x / 11);
const GR = 8;
const grainX = t => lerp(18, 150, MO.cubicOut(clamp(t / 2.4)));
const hop = t => { const k = clamp(t / 2.4); return Math.abs(Math.sin(k * Math.PI * 4)) * 8 * (1 - k) * (1 - k); };
const BOUNCES = [0.02, 0.36, 0.8, 1.36];
const grainPos = t => { const x = grainX(t); return [x, slope(x) - GR - hop(t)]; };
const MATES = [[3.2, 112, 1.7, 2.1], [2.6, 176, 2.2, 2.6], [3.6, 88, 1.3, 1.6]];   // companion grains: r, rest x, settle time, delay
function dunes(c, k, t) {
  PIX.vgrad(c, 0, 0, W, H, [[0, 'n0'], [0.28, 'n1'], [0.48, 'n3'], [0.6, 'r2'], [0.68, 'o0'], [0.75, 'y0'], [1, 'y0']]);
  PIX.layer(c, k, 0.04, c => {
    for (let s = 0; s < 12; s++) { const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + h(s, 2) * 2) + s); PIX.rect(c, Math.round(h(s, 1) * W), Math.round(h(s, 3) * 110), 1, 1, 'c3', (0.3 + 0.5 * tw) * (1 - h(s, 3))); }
    PIX.glow(c, 182, 352, 160, 'o1', 0.55); PIX.glow(c, 182, 352, 70, 'y1', 0.75);
    PIX.circ(c, 182, 352, 30, 'y1'); PIX.circ(c, 182, 352, 25, 'w');
    for (const [y, x0, w, th, col, sh] of [[262, -10, 120, 8, 'r2', 'r1'], [292, 150, 150, 7, 'o0', 'r2'], [276, 170, 70, 5, 'r2', 'r1'], [312, 10, 100, 6, 'o0', 'r2'], [240, 60, 60, 5, 'n3', 'n2']]) {
      const dx = K.wrap(x0 + t * 4, W + 200) - 100;
      PIX.flat(c, PIX.rectPath(dx, y, w, th, th / 2), col, sh, 'o1', [0, 2], [0, 1]);
      PIX.flat(c, PIX.rectPath(dx + w * 0.2, y - th * 0.6, w * 0.45, th, th / 2), col, sh, 'y0', [0, 2], [0, 1]);
    }
  });
  PIX.layer(c, k, 0.22, c => {
    const pts = [[-40, H + 40]]; for (let x = -40; x <= W + 40; x += 6) pts.push([x, 352 + 10 * Math.sin(x / 47 + 1) + 6 * Math.sin(x / 19)]); pts.push([W + 40, H + 40]);
    PIX.flat(c, PIX.polyPath(pts), 's0', 'r1', 'o1', [0, 4], [0, 1]);
  });
  PIX.layer(c, k, 0.5, c => {
    const pts = [[-60, H + 60]]; for (let x = -60; x <= W + 60; x += 5) pts.push([x, 374 + 16 * Math.sin(x / 60 - 0.6) + 5 * Math.sin(x / 23)]); pts.push([W + 60, H + 60]);
    PIX.flat(c, PIX.polyPath(pts), 's1', 's0', 's2', [0, 6], [0, 2]);
    K.motes(c, t, { n: 26, seed: 41, x: -60, y: 340, w: W + 120, h: 40, vx: 40, vy: -3, col: ['s3', 's2'], a: 0.55 });
  });
  PIX.layer(c, k, 1, c => {
    const pts = [[-80, H + 120]]; for (let x = -80; x <= W + 80; x += 3) pts.push([x, slope(x)]); pts.push([W + 80, H + 120]);
    PIX.flat(c, PIX.polyPath(pts), 's2', 's1', 's3', [0, 10], [0, 2]);
    for (let r = 0; r < 9; r++) {
      const y0 = 26 + r * 15, ph = r * 1.7; c.save(); c.strokeStyle = P[r % 2 ? 's1' : 's3']; c.lineWidth = 1; c.beginPath();
      for (let x = -80; x <= W + 80; x += 3) { const y = slope(x) + y0 + 3 * Math.sin(x / 14 + ph); x === -80 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.restore();
    }
    for (let g = 0; g < 70; g++) {
      const sp = 26 + 20 * h(g, 5), x = K.wrap(h(g, 6) * 360 + t * sp, 360) - 60, y = slope(x) - 1 - h(g, 7) * 2;
      PIX.rect(c, Math.round(x), Math.round(y), 1, 1, g % 3 ? 's3' : 's4', 0.9);
    }
    for (const [r, rx, st, dl] of MATES) {                      // companion grains tumbling alongside
      const q = MO.cubicOut(clamp((t - dl + st) / st)), x = lerp(-10, rx, q), y = slope(x) - r - Math.abs(Math.sin(q * Math.PI * 3)) * 4 * (1 - q);
      K.lump(c, x, y, r, x / r, 'quartz');
    }
  });
}
window.DUNES = dunes; window.SLOPE = slope;                       // the finale returns to this dune
SC.s01_grain = {
  draw(c, lt) {
    const [gx, gy] = grainPos(lt), ang = (grainX(lt) + 14) / GR;
    // hold → slow push that centres the settled grain (2.7–4.5) → dive straight into it (4.8→, the iris opens on it)
    const e1 = K.inout(lt, 2.7, 4.5);
    let k = { x: lerp(135, gx, e1), y: lerp(240, gy, e1), z: CAM.zlerp(1, 2.4, e1) };
    if (lt > 4.8) k = { x: gx, y: gy, z: CAM.zlerp(2.4, 70, Math.pow(clamp((lt - 4.8) / 1.65), 2)) };
    dunes(c, k, lt);
    PIX.cam(c, k);
    PIX.fill(c, PIX.circPath(gx + 2, slope(gx) - 1, GR * 0.9), 's1', 0.6 * (1 - hop(lt) / 8));
    PIX.glow(c, gx, gy, GR * 2.6, 'y1', 0.4);
    quartzGrain(c, gx, gy, GR, ang, Math.max(0, Math.sin(clamp((lt - 2.9) / 0.7) * Math.PI)));
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (k.z < 1.6) PIX.layer(c, k, 1.55, c => {                  // foreground lip: dark sand ridge with dry grass (gone once we push in)
      c.globalAlpha = clamp((1.6 - k.z) / 0.5);
      const pts = [[-60, H + 80]]; for (let x = -60; x <= W + 60; x += 4) pts.push([x, 458 + 10 * Math.sin(x / 31) + 4 * Math.sin(x / 9)]); pts.push([W + 60, H + 80]);
      PIX.flat(c, PIX.polyPath(pts), 's0', 'r0', 's1', [0, 4], [0, 1]);
      for (let g = 0; g < 9; g++) {
        const bx = -20 + g * 37 + 12 * h(g, 21), by = 460 + 10 * Math.sin(bx / 31);
        for (let b = 0; b < 5; b++) { const sw = Math.sin(lt * 2.1 + g + b * 0.7) * 2, hh = 10 + 9 * h(g, b + 30); PIX.line(c, bx + b * 2, by, bx + b * 2 + sw + (b - 2) * 2, by - hh, b % 2 ? 's1' : 'r1', 1); }
      }
    });
    const [sx, sy] = PIX.toScreen(k, gx, gy);
    PIX.label(c, { ax: sx - 3, ay: sy - 11, tx: sx - 52, ty: sy - 62, text: 'QUARTZ · SiO₂', t0: 3.2, t1: 4.9, col: 'w', lineCol: 's4' }, lt);
  },
  cues: [...BOUNCES.map((b, i) => [b, 'grain', 0.75 - i * 0.1, -0.3 + i * 0.12]), [0.0, 'wind', 0.55, 0, 6.5], [1.9, 'grain', 0.35, 0.25], [2.95, 'glint', 0.85, 0.1], [3.2, 'type', 0.35], [5.0, 'riser', 0.7, 0, 1.4]],
};

// ================= S02 · SiO₂ lattice inside the grain =================
const A2 = 22, RG = 900;                        // Si–Si spacing (honeycomb edge), grain radius in lattice units
const a1 = [A2 * SQ3, 0], a2 = [A2 * SQ3 / 2, A2 * 1.5];
const site = (i, j, b) => [i * a1[0] + j * a2[0], i * a1[1] + j * a2[1] + (b ? A2 : 0)];
const jit = (i, j, b, t, amp = 0.8) => { const st = K.step(t, 12); return [Math.sin(st * 13 + i * 3.1 + j * 1.7 + b) * amp, Math.cos(st * 11 + i * 2.3 + j * 2.9 + b * 2) * amp]; };
function lattice(c, k, t, hi, dim = false) {
  const z = k.z, vw = W / z / 2 + 30, vh = H / z / 2 + 30;
  const jmin = Math.floor((k.y - vh) / a2[1]) - 1, jmax = Math.ceil((k.y + vh) / a2[1]) + 1;
  const pix = z < 0.3;                                         // LOD: atoms as single pixels
  const atoms = [], bonds = [];
  for (let j = jmin; j <= jmax; j++) {
    const i0 = Math.floor((k.x - vw - j * a2[0]) / a1[0]) - 1, i1 = Math.ceil((k.x + vw - j * a2[0]) / a1[0]) + 1;
    for (let i = i0; i <= i1; i++) {
      const s0 = site(i, j, 0), s1 = site(i, j, 1);
      if (Math.hypot(s0[0], s0[1]) > RG) continue;
      const j0 = jit(i, j, 0, t), j1 = jit(i, j, 1, t);
      const p0 = [s0[0] + j0[0], s0[1] + j0[1]], p1 = [s1[0] + j1[0], s1[1] + j1[1]];
      atoms.push(['Si', p0, i, j, 0], ['Si', p1, i, j, 1]);
      for (const nb of [site(i, j, 1), site(i, j - 1, 1), site(i + 1, j - 1, 1)]) {
        const m = [(s0[0] + nb[0]) / 2, (s0[1] + nb[1]) / 2], jo = jit(i * 7 + nb[0], j * 5 + nb[1], 2, t, 1.1);
        atoms.push(['O', [m[0] + jo[0], m[1] + jo[1]], i, j, 2]); bonds.push([p0, [m[0] + jo[0], m[1] + jo[1]]], [[m[0] + jo[0], m[1] + jo[1]], nb]);
      }
      atoms.push(['Oz', [p0[0] + 3, p0[1] - 4.5], i, j, 3], ['Oz', [p1[0] + 3, p1[1] - 4.5], i, j, 4]);
    }
  }
  if (pix) {
    for (const [el, [x, y]] of atoms) { const [sx, sy] = PIX.toScreen(k, x, y); if (sx < -1 || sy < -1 || sx > W || sy > H) continue; c.fillStyle = P[el === 'Si' ? 'g4' : 'o0']; c.fillRect(Math.floor(sx), Math.floor(sy), 1, 1); }
    return;
  }
  PIX.cam(c, k);
  if (dim) {                                                    // a deeper lattice plane behind: dark, no highlights
    c.save(); c.strokeStyle = P.n3; c.lineWidth = 1.3; c.beginPath(); for (const [a, b] of bonds) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); c.restore();
    for (const [el, [x, y]] of atoms) if (el !== 'Oz') K.ball(c, x, y, el === 'Si' ? 5.2 : 3.6, el === 'Si' ? 'n3' : 'r1', el === 'Si' ? 'n2' : 'r0', null);
    return;
  }
  c.save(); c.strokeStyle = P.g3; c.lineWidth = 1.3; c.beginPath(); for (const [a, b] of bonds) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); c.restore();
  for (const [el, [x, y], i, j, b] of atoms) {
    if (el === 'Si') K.atom(c, x, y, 5.2, 'Si', 1, hi && i === 0 && j === 0 && b === 0 ? 0.9 * hi : 0);
    else if (el === 'O') K.atom(c, x, y, 3.6, 'O');
  }
  for (const [el, [x, y], i, j, b] of atoms) if (el === 'Oz') { PIX.line(c, x - 3, y + 4.5, x, y, 'g4', 1.2); K.ball(c, x, y, 3.2, 'o1', 'o0', 'y1'); }
}
SC.s02_lattice = {
  draw(c, lt) {
    // camera: still diving in (z 0.3 → 1, eases out), hold, then a pull-out that accelerates out of the grain
    let z = CAM.zlerp(0.45, 1.5, MO.cubicOut(clamp((lt + 0.5) / 1.4)));
    if (lt > 3.4) z = lt <= 5.0 ? CAM.zlerp(1.5, 0.05, Math.pow((lt - 3.4) / 1.6, 2)) : 0.05 * Math.exp(-4 * (lt - 5.0));
    const k = { x: 0, y: 0, z };
    const grainA = clamp((0.2 - z) / 0.08);                     // grain silhouette takes over when atoms get sub-pixel
    PIX.vgrad(c, 0, 0, W, H, [[0, 'n0'], [0.5, 'n1'], [1, 'n0']]);
    PIX.glow(c, W / 2, H / 2, 260, 'c0', 0.35 * (1 - grainA));
    K.motes(c, lt, { n: 30, seed: 77, x: 0, y: 0, w: W, h: H, vx: 2, vy: -4, col: 'c2', a: 0.35, tw: true });
    const hi = K.sm(lt, 1.2, 1.6) * (1 - K.sm(lt, 3.6, 4.0));
    if (grainA < 1) {
      c.save();
      if (z < 0.3) { PIX.cam(c, k); c.clip(quartzGrain(c, 0, 0, RG, 0.4)); c.setTransform(1, 0, 0, 1, 0, 0); PIX.rect(c, 0, 0, W, H, 'n1', 0.85); }
      else lattice(c, { x: k.x + 13, y: k.y + 9, z: k.z * 0.62 }, lt * 0.8, 0, true);
      c.setTransform(1, 0, 0, 1, 0, 0); if (z >= 0.3) PIX.rect(c, 0, 0, W, H, 'n0', 0.35);
      lattice(c, k, lt, hi);
      c.restore();
    }
    if (grainA > 0) { PIX.cam(c, k); c.save(); c.globalAlpha = grainA; quartzGrain(c, 0, 0, RG, 0.4); c.restore(); }
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (hi > 0 && z > 0.6) {                                    // the SiO₄ tetrahedron: centre Si, 3 in-plane O + 1 apex O
      PIX.cam(c, k);
      const s0 = site(0, 0, 0), os = [site(0, 0, 1), site(0, -1, 1), site(1, -1, 1)].map(nb => [(s0[0] + nb[0]) / 2, (s0[1] + nb[1]) / 2]), apex = [s0[0] + 3, s0[1] - 4.5];
      PIX.glow(c, s0[0], s0[1], 34, 'c1', 0.5 * hi);
      const pulse = 0.7 + 0.3 * Math.sin(lt * 8);
      for (let a = 0; a < 3; a++) { const A = os[a], B = os[(a + 1) % 3]; PIX.line(c, A[0], A[1], B[0], B[1], 'c2', 1.4, hi * pulse); PIX.line(c, A[0], A[1], apex[0], apex[1], 'c3', 1.4, hi * pulse); }
      for (const q of [...os, apex]) PIX.circ(c, q[0], q[1], 5.2, 'c2', 0.35 * hi);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    const [sx, sy] = PIX.toScreen(k, 0, 0), [ox, oy] = PIX.toScreen(k, site(0, 0, 1)[0] / 2, A2 / 2);
    PIX.label(c, { ax: sx - 4, ay: sy + 2, tx: sx - 60, ty: sy + 40, text: 'Si', t0: 1.6, t1: 3.3, col: 'c3', lineCol: 'c2' }, lt);
    PIX.label(c, { ax: ox + 3, ay: oy, tx: ox + 40, ty: oy - 34, text: 'O', t0: 1.9, t1: 3.3, col: 'y1', lineCol: 'o1' }, lt);
    PIX.label(c, { tx: W / 2, ty: 404, text: 'SiO₄ TETRAHEDRON', t0: 2.2, t1: 3.4, col: 'c2', align: 'center' }, lt);
  },
  cues: [[-0.4, 'shimmer', 0.5, 0, 4.0], [1.2, 'crystal', 0.8, 0, 76], [1.6, 'type', 0.3], [2.2, 'type', 0.3], [3.4, 'riser', 0.6, 0, 1.6]],
};

// ================= S03 · quartz + carbon up the conveyor into the furnace house =================
const BS = [10, 640], BE = [420, 220], BL = Math.hypot(BE[0] - BS[0], BE[1] - BS[1]);
const BU = [(BE[0] - BS[0]) / BL, (BE[1] - BS[1]) / BL], BN = [BU[1], -BU[0]];        // along, up-normal
const BV = 38;                                                                       // belt speed px/s
const onBelt = (s, off = 0) => [BS[0] + BU[0] * s + BN[0] * off, BS[1] + BU[1] * s + BN[1] * off];
const HERO_S0 = 120;
const lumpS = (n, t) => K.wrap(n * BL / 64 + h(n, 1) * 6 + t * BV, BL + 40) - 20;
function plant(c, k, t) {
  PIX.layer(c, k, 0.1, c => PIX.vgrad(c, -400, -500, 1300, 1500, [[0, 'n0'], [0.38, 'n2'], [0.55, 'r1'], [0.64, 'r2'], [0.71, 'o0'], [0.78, 'y0'], [1, 'y0']]));
  PIX.layer(c, k, 0.25, c => {                                  // far hills, pylons, plant lights — silhouettes against the sunrise
    PIX.glow(c, 120, 520, 220, 'y0', 0.4);
    const pts = [[-200, 900]]; for (let x = -200; x <= 700; x += 8) pts.push([x, 520 + 18 * Math.sin(x / 70) + 8 * Math.sin(x / 23)]); pts.push([700, 900]);
    PIX.fill(c, PIX.polyPath(pts), 'r0');
    for (let p = 0; p < 5; p++) {
      const px = -120 + p * 160;
      PIX.line(c, px, 520, px + 10, 440, 'k', 2); PIX.line(c, px + 20, 520, px + 10, 440, 'k', 2); PIX.line(c, px - 6, 452, px + 26, 452, 'k', 1.5);
      if (p < 4) { c.save(); c.strokeStyle = P.k; c.lineWidth = 1; c.beginPath(); c.moveTo(px - 4, 453); c.quadraticCurveTo(px + 90, 470, px + 156, 453); c.stroke(); c.restore(); }
    }
    for (let l = 0; l < 16; l++) K.blink(c, Math.round(-150 + h(l, 3) * 800), Math.round(506 + h(l, 4) * 20), l % 3 ? 'y0' : 'o1', t, 0.3 + h(l, 5), h(l, 6));
  });
  PIX.cam(c, k);
  // furnace house
  K.panel(c, 380, 110, 280, 540, 'g1', 'g0', 'g2', { seams: 9 });
  for (let x = 386; x < 660; x += 6) PIX.rect(c, x, 112, 1, 536, 'g0', 0.6);                       // corrugation
  for (let r = 0; r < 4; r++) for (let w_ = 0; w_ < 6; w_++) { const fl = 0.6 + 0.4 * Math.sin(t * 9 + r * 3 + w_ * 1.7); PIX.rect(c, 400 + w_ * 40, 180 + r * 90, 22, 12, 'o0', 0.7 * fl); PIX.rect(c, 400 + w_ * 40, 180 + r * 90, 22, 3, 'y0', 0.8 * fl); }
  PIX.glow(c, 520, 640, 140, 'o0', 0.5); PIX.rect(c, 470, 560, 100, 80, 'o0'); PIX.rect(c, 476, 566, 88, 74, 'y0', 0.9); PIX.glow(c, 520, 600, 60, 'y1', 0.6);
  for (let e = 0; e < 3; e++) {                                   // electrode columns through the roof, bus-bar cables
    const ex = 470 + e * 44;
    K.panel(c, ex - 9, 26, 18, 90, 'g2', 'g1', 'g3'); PIX.rect(c, ex - 12, 60, 24, 10, 'u1'); PIX.rect(c, ex - 12, 60, 24, 2, 'u2');
    c.save(); c.strokeStyle = P.u1; c.lineWidth = 3; c.beginPath(); c.moveTo(ex + 12, 66); c.quadraticCurveTo(ex + 40, 40 - e * 6, 690, 30 + e * 8); c.stroke(); c.restore();
  }
  K.panel(c, 600, -120, 26, 232, 'g2', 'g1', 'g3', { seams: 6 }); K.smoke(c, t, { x: 613, y: -120, n: 10, rise: 26, life: 4, r0: 6, r1: 26, col: 'g3', a: 0.5, drift: 6 });
  // hopper funnel at the head pulley
  PIX.flat(c, PIX.polyPath([[396, 214], [452, 214], [436, 262], [412, 262]]), 'g2', 'g1', 'g3', [2, 3]);
  PIX.rect(c, 412, 262, 24, 40, 'g1');
  // ground & rails
  PIX.rect(c, -300, 646, 1100, 300, 'g0'); PIX.rect(c, -300, 646, 1100, 2, 'g1');
}
function belt(c, t) {
  // supports
  for (let s = 40; s < BL; s += 90) { const [x, y] = onBelt(s, -8); PIX.line(c, x, y, x - 8, 646, 'g1', 3); PIX.line(c, x, y, x + 14, 646, 'g1', 3); PIX.line(c, x - 4, y + (646 - y) * 0.5, x + 7, y + (646 - y) * 0.5, 'g1', 2); }
  // frame & belt
  const A = onBelt(-6, -6), B = onBelt(BL + 6, -6), A2_ = onBelt(-6, 0), B2_ = onBelt(BL + 6, 0);
  PIX.line(c, A[0], A[1], B[0], B[1], 'g2', 6); PIX.line(c, A2_[0], A2_[1], B2_[0], B2_[1], 'k', 3); PIX.line(c, A2_[0], A2_[1] - 1, B2_[0], B2_[1] - 1, 'g1', 1);
  for (let s = 0; s < BL; s += 26) { const [x, y] = onBelt(s, -4.5); K.gear(c, x, y, 3.2, 5, -t * BV / 3.2, 'g3', 'g1'); }
  // load: quartz, carbon (coke), wood chips — the same seeded stream every frame
  for (let n = 0; n < 64; n++) {
    const s = lumpS(n, t); if (s < -10 || s > BL - 4) continue;
    const kind = ['quartz', 'carbon', 'quartz', 'carbon', 'wood'][n % 5], r = kind === 'wood' ? 4 : 3.4 + 2.2 * h(n, 2);
    const [x, y] = onBelt(s, r + 1.5); K.lump(c, x, y, r, n + s / 9, kind);
  }
}
SC.s03_conveyor = {
  draw(c, lt) {
    const hero = onBelt(HERO_S0 + lt * BV, 7.5);
    // camera: continue S02's pull-out from the hero lump (z 7 → 1), then track up the belt to the hopper
    const zpull = lt < 0 ? 7 * Math.exp(-3.5 * lt) : CAM.zlerp(7, 1, MO.cubicOut(clamp(lt / 1.65)));
    const ep = MO.cubicOut(clamp(lt / 1.65)), g = K.inout(lt, 1.7, 4.3), pz = K.inout(lt, 4.2, 5.2);
    let k = { x: lerp(hero[0], 150, ep), y: lerp(hero[1], 470, ep), z: zpull };
    k = { x: lerp(k.x, 330, g), y: lerp(k.y, 300, g), z: k.z * (1 + 0.15 * pz) };
    plant(c, k, lt);
    PIX.cam(c, k); belt(c, lt);
    quartzGrain(c, hero[0], hero[1], 6, 0.4 + lt * 0.2);
    for (let f = 0; f < 6; f++) {                                 // lumps tipping off the head pulley into the hopper
      const age = K.wrap(lt * 2.2 + f / 6, 1), x = 424 + 2 * h(f, 2), y = 214 + 60 * age * age;
      K.lump(c, x, y, 2.5, f + age * 6, f % 2 ? 'carbon' : 'quartz');
    }
    PIX.glow(c, 400, 280, 120, 'o0', 0.3);                        // furnace-house light spilling onto the belt head
    c.setTransform(1, 0, 0, 1, 0, 0);
    // labels ride on real lumps: the hero quartz lump, and carbon lump #21 when it is near the hero
    let cn = 21, best = 1e9; for (let n = 1; n < 64; n += 2) if (n % 5 === 1 || n % 5 === 3) { const d = Math.abs(lumpS(n, 2.4) - (HERO_S0 + 2.4 * BV) + 40); if (d < best) { best = d; cn = n; } }
    const q = PIX.toScreen(k, hero[0], hero[1]), cb = PIX.toScreen(k, ...onBelt(lumpS(cn, lt), 4));
    PIX.label(c, { ax: q[0] - 2, ay: q[1] - 6, tx: Math.max(6, q[0] - 70), ty: q[1] - 66, text: 'QUARTZ', t0: 2.0, t1: 4.2, col: 's4', lineCol: 's4' }, lt);
    PIX.label(c, { ax: cb[0], ay: cb[1] + 3, tx: Math.max(8, cb[0] - 40), ty: cb[1] + 50, text: 'CARBON: COKE + WOOD', t0: 2.4, t1: 4.3, col: 'g5', lineCol: 'g4' }, lt);
  },
  cues: [[0, 'conveyor', 0.5, 0, 5.4], [2.0, 'type', 0.3], [2.4, 'type', 0.3], [3.5, 'clunk', 0.5, 0.4], [4.0, 'clunk', 0.6, 0.45], [4.5, 'clunk', 0.7, 0.5], [3.8, 'rumble_in', 0.5, 0, 1.6]],
};

// ================= S04 · submerged-arc furnace, cut open =================
const EX = [62, 135, 208];
const tipY = (i, t) => 300 + 4 * Math.sin(t * 0.9 + i * 2.1);                    // electrodes are regulated up/down
function furnace(c, t) {
  PIX.vgrad(c, -200, -200, 700, 900, [[0, 'k'], [0.6, 'n0'], [1, 'r0']]);
  for (const x of [-30, 286]) K.panel(c, x, -200, 22, 900, 'g0', 'k', 'g1', { seams: 12 });
  K.panel(c, -40, 150, 350, 20, 'g1', 'g0', 'g2', { rivets: true });             // fume hood rim
  K.smoke(c, t, { x: 135, y: 186, n: 14, spread: 180, rise: 40, life: 2.5, r0: 4, r1: 18, col: 'g2', a: 0.35 });
  // shell, refractory brick, carbon lining
  const shell = PIX.rectPath(8, 196, 254, 250, 18);
  PIX.flat(c, shell, 'g2', 'g1', 'g3', [3, 3]);
  K.bricks(c, 14, 200, 242, 240, 12, 6, 'r1', 'r0', 'r2');
  PIX.fill(c, PIX.rectPath(26, 196, 218, 232, 12), 'g1');
  const inner = PIX.rectPath(31, 196, 208, 227, 10);
  c.save(); c.clip(inner);
  PIX.rect(c, 0, 196, W, 240, 's0');
  for (let n = 0; n < 150; n++) {                                // charge sinking slowly as it is consumed
    const x = 31 + h(n, 1) * 208, y = 206 + K.wrap(h(n, 2) * 150 + t * 3, 150), kind = n % 3 ? 'quartz' : 'carbon';
    if (y < 342) K.lump(c, x, y, 2 + 2.2 * h(n, 3), n, kind);
  }
  PIX.vgrad(c, 31, 300, 208, 70, [[0, 'r1', 0], [1, 'r1', 0.9]]);
  for (let i = 0; i < 3; i++) {                                  // craters under the tips
    const ty = tipY(i, t), cx = EX[i];
    PIX.fill(c, PIX.circPath(cx, ty + 20, 25), 'r1'); PIX.glow(c, cx, ty + 24, 44, 'o0', 0.7); PIX.fill(c, PIX.circPath(cx, ty + 22, 18), 'r2');
  }
  PIX.rect(c, 31, 372, 208, 60, 'o0');                          // molten silicon pool
  for (let x = 31; x < 240; x += 2) PIX.rect(c, x, 371 + Math.round(1.5 * Math.sin(x / 9 + t * 4)), 2, 2, 'y1');
  PIX.glow(c, 135, 390, 120, 'y0', 0.5);
  K.bubbles(c, t, { x: 40, y: 376, w: 190, h: 50, n: 14, seed: 12, speed: 12, r: 1.6, col: 'y1' });
  c.restore();
  for (let i = 0; i < 3; i++) {                                  // electrodes + arcs
    const cx = EX[i], ty = tipY(i, t);
    PIX.flat(c, PIX.rectPath(cx - 12, -60, 24, ty + 60, 3), 'g1', 'k', 'g2', [5, 0], [2, 0]);
    for (let jy = -20; jy < ty; jy += 70) PIX.rect(c, cx - 12, jy, 24, 1, 'g0');
    PIX.rect(c, cx - 15, 150, 30, 14, 'u1'); PIX.rect(c, cx - 15, 150, 30, 2, 'u2'); PIX.rect(c, cx - 15, 162, 30, 2, 'u0');
    c.save(); c.strokeStyle = P.u1; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 15, 156); c.quadraticCurveTo(cx + 30, 100, cx + 20 + i * 8, -60); c.stroke(); c.restore();
    PIX.glow(c, cx, ty, 30, 'y1', 0.7);
    K.arc(c, cx - 4, ty, cx - 8 + 4 * Math.sin(t * 3 + i), ty + 40, t + i * 0.37, i + 1, { glow: 26, glowCol: 'c2', jit: 5 });
    K.arc(c, cx + 4, ty, cx + 10, ty + 38, t * 1.1 + i, i + 7, { glow: 0, jit: 4, w: 2 });
  }
  for (let b = 0; b < 18; b++) {                                 // CO gas rising through the charge, burning on top
    const i = b % 3, age = K.wrap(t * 0.8 + h(b, 4), 1), x = EX[i] + (h(b, 5) - 0.5) * 50, y = tipY(i, t) + 10 - age * 110;
    if (y > 208) PIX.circ(c, x + Math.sin(age * 9 + b) * 2, y, 1.6, 'y0', 0.85);
  }
  K.flames(c, 31, 208, 208, t, { n: 14, h: 8, fw: 5, outer: 'o0', inner: 'y1' });
  for (let x = 33; x < 238; x += 3) PIX.rect(c, x, 207, 2, 1, 'c1', 0.6 + 0.4 * Math.sin(x + t * 9));   // blue CO flame base
  // rotating base
  PIX.rect(c, 4, 446, 262, 14, 'g1'); for (let x = -20; x < 290; x += 10) PIX.rect(c, Math.round(K.wrap(x + t * 6, 300) - 20), 449, 4, 8, 'g3');
  for (const x of [40, 230]) K.gear(c, x, 470, 12, 10, t * 0.5, 'g2', 'g0');
}
SC.s04_furnace = {
  draw(c, lt) {
    const e = K.inout(lt, 1.2, 5.6), fl = MO.cubicIn(clamp((lt - 5.55) / 0.6));
    const k = { x: lerp(135, 135, e), y: lerp(240, 318, e), z: CAM.zlerp(1, 2.6, e) * CAM.zlerp(1, 1.6, fl) };
    PIX.cam(c, k); furnace(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    const E = PIX.toScreen(k, 62, 120), A = PIX.toScreen(k, 135, tipY(1, lt) + 26), M = PIX.toScreen(k, 90, 400);
    PIX.label(c, { ax: E[0] - 10, ay: E[1], tx: 12, ty: Math.max(14, E[1] - 70), text: 'GRAPHITE ELECTRODE', t0: 1.0, t1: 3.4, col: 'g5' }, lt);
    PIX.label(c, { ax: A[0] + 8, ay: A[1] - 6, tx: Math.min(A[0] + 20, 200), ty: A[1] - 66, text: 'ARC ~2000 °C', t0: 2.3, t1: 5.2, col: 'y1', lineCol: 'y0' }, lt);
    PIX.label(c, { ax: M[0], ay: M[1], tx: Math.max(6, M[0] - 40), ty: Math.min(M[1] + 34, 452), text: 'MOLTEN Si', t0: 3.5, t1: 5.3, col: 'y1', lineCol: 'o1' }, lt);
  },
  cues: [[-0.4, 'rumble', 0.8, 0, 6.6], [-0.4, 'hum', 0.35, 0, 6.6], ...[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((b, i) => [b, 'arc', 0.35 + 0.1 * (i % 2), i % 3 - 1]), [1.0, 'type', 0.3], [2.3, 'type', 0.3], [3.5, 'type', 0.3]],
};

// ================= S05 · carbothermic reduction: SiO₂ + 2C → Si + 2CO =================
const UNITS = [[70, 300, 0.4], [194, 226, 1.4], [92, 150, 2.4], [186, 378, 3.4]];   // x, y, start
const RSI = 10, RO = 7, RC = 7, DO = 16;                                           // atom radii, Si–O spacing
function reduction(c, t) {
  PIX.vgrad(c, 0, 0, W, H, [[0, 'r0'], [0.55, 'r1'], [1, 'r2']]);
  for (let g = 0; g < 5; g++) PIX.glow(c, h(g, 1) * W, 120 + h(g, 2) * 330, 70 + 40 * h(g, 3), 'o0', 0.28);
  K.motes(c, t, { n: 40, seed: 5, x: 0, y: 0, w: W, h: H, vy: -18, vx: 3, col: ['y0', 'o1'], a: 0.6 });
  // liquid silicon pool gathering at the bottom
  const level = 452 - 26 * K.sm(t, 2.0, 5.8);
  const pool = []; for (let x = -4; x <= W + 4; x += 3) pool.push([x, level + 2 * Math.sin(x / 13 + t * 3)]); pool.push([W + 4, H + 4], [-4, H + 4]);
  PIX.glow(c, W / 2, level + 30, 200, 'y0', 0.5); PIX.fill(c, PIX.polyPath(pool), 'o1');
  for (let x = 0; x < W; x += 2) PIX.rect(c, x, Math.round(level + 2 * Math.sin(x / 13 + t * 3)) - 1, 2, 1, 'y1');
  for (const [ux, uy, st] of UNITS) {
    const lt = t - st;
    const s1 = 0.6, s2 = 1.1;                                     // carbon snaps (on the beat)
    const fly1 = lt - s1, fly2 = lt - s2, free = lt - s2;
    // carbon atoms approach from below-left / below-right
    const c1 = lt < s1 ? [lerp(ux - 64, ux - DO - 6, MO.cubicIn(clamp(lt / s1))), lerp(uy + 58, uy + 2, MO.cubicIn(clamp(lt / s1)))] : null;
    const c2 = lt < s2 ? [lerp(ux + 66, ux + DO + 6, MO.cubicIn(clamp((lt - 0.3) / (s2 - 0.3)))), lerp(uy + 60, uy + 2, MO.cubicIn(clamp((lt - 0.3) / (s2 - 0.3))))] : null;
    const oL = [ux - DO, uy], oR = [ux + DO, uy];
    // CO molecules rising after each snap
    const co = (f, o, dir) => { const y = o[1] - 52 * f - 10 * f * f, x = o[0] + dir * 8 * f + Math.sin(f * 5) * 3, a = clamp(1 - (f - 2.4) / 0.6);
      if (a > 0) { K.bond(c, x - 6, y, x + 6, y, 'g4', 2, a); K.atom(c, x - 7, y, RC * 0.85, 'C', a); K.atom(c, x + 7, y, RO * 0.85, 'O', a); }
      if (f < 0.25) PIX.glow(c, o[0], o[1], 22, 'y1', 0.8 * (1 - f / 0.25)); };
    if (lt < -0.2) { /* not started: show the intact SiO₂ unit waiting */ }
    // silicon atom: bonded → freed (flash) → melts and sinks into the pool
    const sink = free > 0 ? 70 * free * free + 10 * free : 0, siY = Math.min(uy + sink, level + 4), melt = clamp(free / 0.6);
    if (siY < level + 3) {
      if (free > 0 && free < 0.3) PIX.glow(c, ux, siY, 34, 'c2', 0.9 * (1 - free / 0.3));
      if (melt > 0) PIX.glow(c, ux, siY, 20, 'y0', 0.6 * melt);
      K.ball(c, ux, siY, RSI, melt > 0.5 ? 'o1' : 'g3', melt > 0.5 ? 'o0' : 'g2', melt > 0.5 ? 'y1' : 'g5');
    }
    if (fly1 < 0) { K.bond(c, ux - RSI, uy, oL[0], oL[1], 'g4', 3); K.atom(c, oL[0], oL[1], RO, 'O'); } else co(fly1, oL, -1);
    if (fly2 < 0) { K.bond(c, ux + RSI, uy, oR[0], oR[1], 'g4', 3); K.atom(c, oR[0], oR[1], RO, 'O'); } else co(fly2, oR, 1);
    if (c1 && lt > -0.3) K.atom(c, c1[0], c1[1], RC, 'C');
    if (c2 && lt > 0) K.atom(c, c2[0], c2[1], RC, 'C');
  }
}
SC.s05_reduction = {
  draw(c, lt) {
    const d = CAM.drift(lt, 2, 3), k = { x: 135 + d[0] * 0.5, y: 240 + d[1] * 0.5, z: 1 + 0.03 * K.sm(lt, 0, 6) };
    PIX.cam(c, k); reduction(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: W / 2, ty: 34, text: 'SiO₂ + 2C → Si + 2CO', t0: 0.6, t1: 5.5, col: 'y1', align: 'center', sc: 1 }, lt);
    const [ux, uy, st] = UNITS[1], f = Math.max(0, lt - st - 0.6);            // follow unit 2's first CO molecule
    const co = PIX.toScreen(k, ux - DO - 8 * f + Math.sin(f * 5) * 3, uy - 52 * f - 10 * f * f);
    PIX.label(c, { ax: co[0] - 8, ay: co[1] - 6, tx: co[0] - 64, ty: co[1] - 40, text: 'CO GAS', t0: 2.3, t1: 3.9, col: 'g5' }, lt);
    PIX.label(c, { ax: 110, ay: 432, tx: 20, ty: 392, text: 'LIQUID Si', t0: 3.8, t1: 5.6, col: 'y1', lineCol: 'y0' }, lt);
  },
  cues: [[-0.3, 'heat', 0.5, 0, 6.6], [0.6, 'type', 0.35], ...UNITS.flatMap(([x, , st], i) => [[st + 0.6, 'pop', 0.8, (x - 135) / 135, 1], [st + 1.1, 'pop', 0.8, (x - 135) / 135, 2], [st + 1.15, 'bubble', 0.5, 0], [st + 1.7, 'liquid', 0.5, (x - 135) / 135]]), [2.2, 'type', 0.25], [3.8, 'type', 0.3]],
};

// ================= S06 · tapping, casting and crushing =================
function tapping(c, t) {
  PIX.vgrad(c, -100, -100, 470, 1100, [[0, 'k'], [0.5, 'n0'], [1, 'g0']]);
  for (let x = -60; x < 330; x += 8) PIX.rect(c, x, 160, 1, 760, 'n1', 0.9);          // corrugated cast-house wall
  for (const x of [-14, 262]) K.panel(c, x, 150, 18, 760, 'g1', 'g0', 'g2', { seams: 10 });
  PIX.glow(c, 156, 600, 170, 'o0', 0.22); PIX.glow(c, 156, 380, 150, 'o0', 0.3);
  PIX.rect(c, -60, 476, 390, 9, 'g1'); for (let x = -60; x < 330; x += 10) PIX.rect(c, x + 2, 478, 5, 5, 'y0');   // gantry crane beam
  const tx = 46 + 26 * Math.sin(t * 0.6);
  PIX.rect(c, tx - 11, 485, 22, 8, 'g2'); PIX.rect(c, tx - 11, 485, 22, 2, 'g3'); PIX.line(c, tx, 493, tx, 518, 'g3', 1);
  PIX.flat(c, PIX.rectPath(tx - 16, 518, 32, 10, 2), 'g3', 'g1', 'g5', [2, 2]);
  K.bricks(c, -40, -60, 350, 230, 14, 7, 'r1', 'r0', 'r2');                 // furnace lower wall
  K.panel(c, -40, 150, 350, 10, 'g2', 'g1', 'g3', { rivets: true });
  PIX.glow(c, 56, 140, 40, 'o1', 0.8); PIX.circ(c, 56, 140, 8, 'o0'); PIX.circ(c, 56, 140, 5, 'y1');
  PIX.flat(c, PIX.polyPath([[44, 146], [70, 146], [160, 210], [146, 220]]), 'g2', 'g1', 'g3', [0, 3]);   // launder
  K.stream(c, [[56, 146], [100, 176], [150, 212]], 5, t, { speed: 70 });
  K.stream(c, [[150, 212], [154, 250], [156, 300], [156, 352 - 0]], 4, t, { speed: 120 });
  K.smoke(c, t, { x: 140, y: 200, n: 10, rise: 34, life: 2.4, r0: 3, r1: 14, col: 'g2', a: 0.45 });
  // ladle on its cart
  const ladle = PIX.polyPath([[100, 332], [212, 332], [198, 430], [114, 430]]);
  PIX.flat(c, ladle, 'g2', 'g1', 'g3', [4, 4]); PIX.rect(c, 96, 328, 120, 6, 'g3');
  const inner = PIX.polyPath([[108, 336], [204, 336], [192, 422], [120, 422]]);
  c.save(); c.clip(inner); PIX.rect(c, 100, 330, 120, 100, 'r1');
  const lvl = lerp(418, 352, K.sm(t, 0, 3.4));
  PIX.rect(c, 100, lvl, 120, 100, 'o0'); for (let x = 108; x < 206; x += 2) PIX.rect(c, x, Math.round(lvl + Math.sin(x / 7 + t * 6)), 2, 1, 'y1');
  c.restore(); PIX.glow(c, 156, lvl, 60, 'y0', 0.55);
  K.sparks(c, t, { x: 156, y: lvl, n: 30, rate: 40, life: 0.7, speed: 70, spread: 2.4, g: 160, seed: 11 });
  PIX.rect(c, 90, 432, 132, 8, 'g1'); for (const x of [108, 204]) K.gear(c, x, 444, 7, 8, -t * 0.4, 'g2', 'g0'); PIX.rect(c, -40, 451, 350, 3, 'g2');
  // casting bed: hot → cooling → solid silver
  for (let m = 0; m < 3; m++) {
    const x = 18 + m * 82, cool = clamp(m / 2 + t * 0.06);
    PIX.flat(c, PIX.rectPath(x, 556, 72, 30, 3), 'g2', 'g1', 'g3', [2, 3]);
    const cols = [['y1', 'o1'], ['o0', 'r2'], ['g3', 'g4']][Math.min(2, Math.floor(cool * 2.99))];
    PIX.rect(c, x + 4, 560, 64, 14, cols[1]); PIX.rect(c, x + 4, 560, 64, 3, cols[0]);
    if (cool < 0.6) PIX.glow(c, x + 36, 566, 40, 'o0', 0.5 * (1 - cool));
    K.smoke(c, t + m, { x: x + 36, y: 556, n: 5, rise: 20, life: 2, r0: 2, r1: 9, col: 'g3', a: 0.3 });
  }
  // jaw crusher
  K.panel(c, 50, 650, 170, 150, 'g1', 'g0', 'g2', { rivets: true, seams: 3 });
  const swing = 0.07 * Math.max(0, Math.sin(t * Math.PI * 4));                      // 2 Hz = one crunch per beat
  PIX.fill(c, PIX.polyPath([[78, 664], [118, 664], [128, 774], [112, 784]]), 'g3');
  c.save(); c.translate(198, 660); c.rotate(-swing); PIX.flat(c, PIX.polyPath([[0, 0], [-46, 4], [-34, 114], [-18, 124]]), 'g3', 'g1', 'g4', [3, 2]); c.restore();
  K.gear(c, 210, 664, 16, 12, t * 4 * Math.PI, 'g2', 'g0');
  const slabY = 616 + K.wrap(t * 30, 70);
  PIX.flat(c, PIX.rectPath(118, Math.min(slabY, 680), 40, 22, 2), 'g3', 'g1', 'g5', [2, 2]);
  for (let n = 0; n < 26; n++) {                                  // lumps falling out of the jaws onto the belt
    const age = K.wrap(t * 1.2 + h(n, 1), 1), x = 124 + (h(n, 2) - 0.5) * 30 + age * 40 * (h(n, 3) - 0.3), y = 790 + 70 * age * age;
    if (y < 846) K.lump(c, x, y, 2 + 2 * h(n, 4), n + age * 4, 'silicon');
  }
  PIX.rect(c, -40, 850, 360, 6, 'k'); PIX.rect(c, -40, 849, 360, 1, 'g2');
  for (let n = 0; n < 30; n++) { const x = K.wrap(n * 13 + t * 26, 360) - 40; K.lump(c, x, 846, 2 + 1.5 * h(n, 7), n, 'silicon'); }
}
SC.s06_tapping = {
  draw(c, lt) {
    const a = K.inout(lt, 2.0, 3.3), b = K.inout(lt, 3.3, 4.8);
    let k = { x: lerp(150, 135, a), y: lerp(250, 520, a), z: lerp(1.25, 1.0, a) };
    k = { x: lerp(k.x, 135, b), y: lerp(k.y, 640, b), z: CAM.zlerp(k.z, 0.78, b) };
    if (lt < 0) k.y += lt * 60;
    PIX.cam(c, k); tapping(c, lt); c.setTransform(1, 0, 0, 1, 0, 0);
    const s = PIX.toScreen(k, 154, 270), l = PIX.toScreen(k, 140, 846);
    PIX.label(c, { ax: s[0] + 4, ay: s[1], tx: s[0] + 20, ty: s[1] - 40, text: 'MOLTEN SILICON', t0: 0.8, t1: 2.5, col: 'y1', lineCol: 'o1' }, lt);
    PIX.label(c, { ax: l[0], ay: l[1] - 6, tx: 18, ty: Math.max(8, l[1] - 60), text: 'METALLURGICAL-GRADE Si', t0: 3.7, t1: 5.5, col: 'g5' }, lt);
    PIX.label(c, { tx: 18, ty: l[1] - 48, text: '~99% PURE', t0: 4.0, t1: 5.5, col: 'g4' }, lt);
  },
  cues: [[-0.4, 'pour', 0.7, -0.2, 3.6], [0.2, 'sizzle', 0.4, 0.2, 3.0], [0.8, 'type', 0.3], ...[3.0, 3.5, 4.0, 4.5, 5.0, 5.5].map((b, i) => [b, 'crunch', 0.55 + 0.05 * i, 0.1]), [3.7, 'type', 0.3]],
};
})();
