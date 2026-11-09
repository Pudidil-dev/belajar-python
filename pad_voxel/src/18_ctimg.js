'use strict';
// ============================================================================
// THE CT IMAGES (scenes 16-17): this patient's axial slices, computed from the
// same body, bones and arteries as the 3D views, quickly enough to draw a new
// slice every frame (an analytic cross-section: the body parts as radial
// profiles, the bones and vessels as circles); the frontal topogram; the
// console screen; the slabs that stack into the 3D reconstruction.
// Grey levels follow CT conventions: air black, fat dark grey, muscle mid grey,
// bone cortex near white, contrast-filled arteries bright, calcium brightest;
// the veins are still grey (arterial phase); the occluded popliteal segment
// has no bright lumen, only its wall; collaterals are small bright dots.
// Image frame: tree mm (x toward the patient's LEFT, z anterior), shown the
// radiological way (the patient's right on the left, anterior up).
// ============================================================================
const CTG = { air: hexc('#000000'), skin: hexc('#5C5C5C'), fat: hexc('#2E2E2E'), fat2: hexc('#383838'), mus: hexc('#787878'), mus2: hexc('#6C6C6C'),
  bowel: hexc('#5E5E5E'), gas: hexc('#0A0A0A'), cort: hexc('#EDEDED'), marrow: hexc('#8A8A8A'), spongy: hexc('#B6B6B6'), spongy2: hexc('#A4A4A4'), lum: hexc('#D6D6D6'), lum2: hexc('#B4B4B4'),
  wall: hexc('#848484'), plq: hexc('#646464'), cal: hexc('#FFFFFF'), vein: hexc('#8E8E8E'), occ: hexc('#5A5A5A') };
// ---------------------------------------------------------------- the body as radial profiles per level
const CTS = { y0: 0, y1: 1200, dy: 10, NA: 36 };
const CT_PARTS = () => cached('ctparts', () => {
  // body frame (forward x, up y, right z, hips at y 0) → tree frame: x = −z, y = y + 920, z = x; parts of the standing patient
  const parts = [];
  const legs = [['R', 92], ['L', -92]];
  for (const [, zs] of legs) {
    parts.push({ y: [-470, 70], c: yb => [lerp(6, 0, clamp(-yb / 440, 0, 1)), zs], f: (x, y, z) => SD.thigh(x, y, z - zs) });
    parts.push({ y: [-880, -420], c: yb => [-6, zs], f: (x, y, z) => SD.shin(x, y + 440, z - zs) });
    parts.push({ y: [-950, -800], c: yb => [30, zs], f: (x, y, z) => SD.foot(x, y + 860, z - zs) });
  }
  parts.push({ y: [-130, 190], c: () => [-14, 0], f: (x, y, z) => SD.pelvis(x, y, z) });
  parts.push({ y: [40, 620], c: () => [0, 0], f: (x, y, z) => SD.torso(x + 6, Math.max(y - 140, 70), z) });   // the belly keeps its width down to the hips
  return parts;
});
// one level: for each part present, its centre (tree x, z) and NA radii
const CT_LEVELS = () => cached('ctlevels', () => {
  const L = [];
  for (let Y = CTS.y0; Y <= CTS.y1; Y += CTS.dy) {
    const yb = Y - 920, list = [];
    for (const p of CT_PARTS()) {
      if (yb < p.y[0] || yb > p.y[1]) continue;
      const c = p.c(yb); if (p.f(c[0], yb, c[1]) > 0) continue;
      const R = new Float32Array(CTS.NA);
      for (let k = 0; k < CTS.NA; k++) {
        const a = k / CTS.NA * TAU, dx = Math.cos(a), dz = Math.sin(a);
        let lo = 0, hi = 320; if (p.f(c[0] + dx * hi, yb, c[1] + dz * hi) <= 0) { R[k] = hi; continue; }
        for (let it = 0; it < 16; it++) { const m = (lo + hi) / 2; if (p.f(c[0] + dx * m, yb, c[1] + dz * m) <= 0) lo = m; else hi = m; }
        R[k] = lo;
      }
      // stored in tree coordinates: centre (x = −z_b, z = x_b); body angle a ↦ tree direction (−sin a, cos a)
      list.push({ cx: -c[1], cz: c[0], R });
    }
    L.push(list);
  }
  return L;
});
// depth inside the body at tree (x, z) on a level (≤ 0 outside)
function ctDepth(list, x, z) {
  let best = -1e9;
  for (const p of list) {
    const tx = x - p.cx, tz = z - p.cz, d = Math.hypot(tx, tz);
    // tree direction (tx, tz) = (−sin a, cos a) → a = atan2(−tx, tz)
    let a = Math.atan2(-tx, tz); if (a < 0) a += TAU;
    const f = a / TAU * CTS.NA, i = Math.floor(f) % CTS.NA, j = (i + 1) % CTS.NA, r = lerp(p.R[i], p.R[j], f - Math.floor(f));
    const dep = r - d; if (dep > best) best = dep;
  }
  return best;
}
// ---------------------------------------------------------------- bones per level (circles: cortex ring + marrow)
const CT_BONE_TUBES = (() => {
  const T = [];
  for (const sx of [-1, 1]) {
    const X = p => [p[0] * -sx, p[1], p[2], p[3]];
    T.push(BONE_CTRL.femur.map(X), BONE_CTRL.tibia.map(X), BONE_CTRL.fibula.map(X));                                                           // the 3D bones' centre-lines
  }
  return T;
})();
function ctBones(Y) {
  const out = [];
  for (const tube of CT_BONE_TUBES) for (let i = 0; i + 1 < tube.length; i++) {
    const a = tube[i], b = tube[i + 1]; if ((Y - a[1]) * (Y - b[1]) > 0 || a[1] === b[1]) continue;
    const u = (Y - a[1]) / (b[1] - a[1]); out.push([lerp(a[0], b[0], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u), 0]);
  }
  for (const sx of [-1, 1]) {
    // the ends of bones are spongy (bright through and through), the shafts have marrow inside a cortex
    const hd = 24 * 24 - (Y - 868) * (Y - 868); if (hd > 0) out.push([92 * sx, -12, Math.sqrt(hd), 1]);                                    // femoral heads
    const pt = 1 - ((Y - 505) / 18) ** 2; if (pt > 0) out.push([74 * sx, 36, 11 * Math.sqrt(pt), 1]);                                       // patellae
    const hl = 1 - ((Y - 34) / 24) ** 2; if (hl > 0) out.push([68 * sx, -18, 21 * Math.sqrt(hl), 1]);                                       // heels (calcaneus)
  }
  if (Y > 995 && Y < 1200) out.push([0, -78, 21, 1]);                                                                                      // lumbar vertebral bodies
  return out;
}
// the pelvic ring (same shape as the 3D bones), sampled per level into a small bitmap at 4 mm
const CT_PELVIS = () => cached('ctpelvis', () => {
  const pel = (x, y, z) => {
    const ax = Math.abs(x), bladeOuter = sdE(ax, y, z, 54, 978, -30, 50, 60, 50), bladeInner = sdE(ax, y, z, 52, 982, -26, 43, 54, 43);
    const blade = Math.max(bladeOuter, -bladeInner, -(y - 912), -(ax - 44), z - 22);
    const acet = Math.max(sdE(ax, y, z, 90, 868, -12, 30, 30, 30), -sdE(ax, y, z, 92, 868, -6, 24, 24, 26));
    const ramus = Math.max(sdE(ax, y, z, 50, 852, 10, 40, 30, 18), -sdE(ax, y, z, 52, 852, 10, 22, 16, 30), -(y - 822));
    return Math.min(blade, acet, ramus, sdE(x, y, z, 0, 935, -82, 34, 70, 18));
  };
  const M = {};
  for (let Y = 820; Y <= 1040; Y += CTS.dy) { const g = new Float32Array(76 * 46); for (let j = 0; j < 46; j++) for (let i = 0; i < 76; i++) g[j * 76 + i] = pel(-150 + i * 4, Y, -120 + j * 4); M[Y] = g; }
  return M;
});
function ctPelvisAt(Y, x, z) {
  if (Y < 820 || Y > 1040) return 1;
  const g = CT_PELVIS()[Math.round(Y / CTS.dy) * CTS.dy]; if (!g) return 1;
  const fi = (x + 150) / 4, fj = (z + 120) / 4; if (fi < 0 || fj < 0 || fi >= 75 || fj >= 45) return 1;
  const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, a = g[j * 76 + i], b = g[j * 76 + i + 1], c = g[(j + 1) * 76 + i], d = g[(j + 1) * 76 + i + 1];
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// ---------------------------------------------------------------- vessels per level
// [x, z, r, kind]: kind 'a' artery (k: residual lumen, cal: calcium), 'v' vein; from the same centre-lines (ART, LES, MEDCAL)
function ctVessels(Y, sc) {
  sc = sc || 1; const out = [];
  for (const name in ART) {
    const pts = ART[name].pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1]; if ((Y - a[1]) * (Y - b[1]) > 0 || a[1] === b[1]) continue;
      const u = (Y - a[1]) / (b[1] - a[1]), x = lerp(a[0], b[0], u), z = lerp(a[2], b[2], u), r = lerp(a[3], b[3], u) * sc;
      const gen = isGen(name), k = gen ? 1 : lumenK(name, Y), mc = MEDCAL[name], cal = (mc && Y > mc[0] && Y < mc[1]) || (name === 'RSFA' && Math.abs(Y - LES.L1.yc) < 18);
      out.push({ x, z, r: gen && name[0] === 'R' ? r * 1.6 : r, k, cal, name });
      // the companion vein: beside and a little behind the big arteries (grey, not yet filled with contrast)
      if (!gen && r > 2.2 * sc && !/IIA|PER|AO/.test(name)) { const med = x < 0 ? 1 : -1; out.push({ x: x + med * r * 1.5, z: z - r * 0.9, r: r * 1.25, vein: true }); }
      if (name === 'AO') out.push({ x: x - 26, z: z + 4, r: r * 1.15, vein: true });                       // the inferior vena cava, on the right of the aorta
    }
  }
  return out;
}
// ---------------------------------------------------------------- one pixel of an axial slice
// Y: level (tree mm); x, z: tree mm; ves: ctVessels(Y); lv: the body level list; o: {soft: 0..1 soft tissue shown}
function ctPix(Y, x, z, lv, ves, bones, o) {
  const soft = o && o.soft !== undefined ? o.soft : 1;
  for (const v of ves) {
    const d = Math.hypot(x - v.x, z - v.z); if (d > v.r) continue;
    if (v.vein) return soft > 0.5 ? CTG.vein : 0;
    const lr = v.r * 0.82 * v.k;
    if (v.cal) { const a = Math.atan2(z - v.z, x - v.x); if (d > v.r * 0.72 && (Math.abs(Math.sin(a)) > 0.86 || (v.name === 'RSFA' && a > -2.6 && a < -1.1))) return CTG.cal; }
    if (v.k <= 0.01) return d > v.r * 0.75 ? CTG.wall : CTG.occ;                     // occluded: the wall, no bright lumen
    // the open channel: at the SFA stenosis it sits off-centre, pushed away from the plaque (posteromedial, LES.L1.side)
    const ec = v.name === 'RSFA' && v.k < 0.95 ? v.r * (1 - v.k) * 0.55 : 0, ldx = x - (v.x - LES.L1.side[0] * ec), ldz = z - (v.z - LES.L1.side[2] * ec);
    if (Math.hypot(ldx, ldz) < lr) return v.name && v.name[0] === 'R' && /POP|TPT|ATA|PTA|PER/.test(v.name) && Y < 490 ? CTG.lum2 : CTG.lum;   // refilled below the block: a little fainter
    return soft > 0.5 ? (v.k < 0.95 ? CTG.plq : CTG.wall) : 0;
  }
  for (const b of bones) {
    const d = Math.hypot(x - b[0], z - b[1]); if (d >= b[2]) continue;
    if (d > b[2] - 3.4) return CTG.cort;
    return b[3] ? (hash2(Math.floor(x / 2.5), Math.floor(z / 2.5)) < 0.3 ? CTG.spongy2 : CTG.spongy) : (soft > 0.5 ? CTG.marrow : CTG.cort);
  }
  if (Y >= 820 && Y <= 1040) { const pv = ctPelvisAt(Y, x, z); if (pv < 0) return pv > -3.5 ? CTG.cort : (hash2(Math.floor(x / 2.5), Math.floor(z / 2.5)) < 0.3 ? CTG.spongy2 : CTG.spongy); }
  if (soft <= 0) return 0;
  const dep = ctDepth(lv, x, z); if (dep <= 0) return 0;
  if (dep < 2.4) return CTG.skin;
  const h = hash2(Math.floor(x / 3), Math.floor(z / 3));
  if (dep < 9 + 3 * h) return h < 0.5 ? CTG.fat : CTG.fat2;
  if (Y > 960 && dep > 22 && z > -40) return h < 0.12 ? CTG.gas : CTG.bowel;      // abdomen: bowel loops with a little gas
  return hash2(Math.floor(x / 4) + 7, Math.floor(z / 5)) < 0.14 ? CTG.fat2 : (h < 0.5 ? CTG.mus : CTG.mus2);
}
function ctLevel(Y) { const L = CT_LEVELS(), i = clamp(Math.round((Y - CTS.y0) / CTS.dy), 0, L.length - 1); return L[i]; }
// draw an axial slice at level Y into a screen box (x0, y0, w, h), covering `span` mm across, centred at (cx, cz)
function drawSlice(Y, x0, y0, w, h, span, cx, cz, o) {
  const lv = ctLevel(Y), ves = ctVessels(Y), bones = ctBones(Y), mm = span / w;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = cx + (i + 0.5 - w / 2) * mm, z = cz - (j + 0.5 - h / 2) * mm, c = ctPix(Y, x, z, lv, ves, bones, o);
    pset(x0 + i, y0 + j, c || CTG.air);
  }
}
// the slice's natural centre and width: the abdomen is one wide section, the legs two
const sliceFrame = Y => Y > 940 ? { cx: 0, cz: -10, span: 420 } : { cx: 0, cz: 0, span: 420 };
// ---------------------------------------------------------------- the topogram (a frontal scout image, taken before the contrast)
const TOPO = { w: 66, h: 236, x0: -270, x1: 270, y0: 1240, y1: 0 };
const TOPO_IMG = () => cached('topo', () => {
  const img = new Uint32Array(TOPO.w * TOPO.h);
  for (let j = 0; j < TOPO.h; j++) {
    const Y = lerp(TOPO.y0, TOPO.y1, (j + 0.5) / TOPO.h), lv = ctLevel(Y), bones = ctBones(Y);
    for (let i = 0; i < TOPO.w; i++) {
      const x = lerp(TOPO.x0, TOPO.x1, (i + 0.5) / TOPO.w);
      let th = 0, bn = 0;
      for (let k = 0; k < 24; k++) { const z = -180 + k * 15; if (ctDepth(lv, x, z) > 0) th += 15; }
      for (const b of bones) { const dx = Math.abs(x - b[0]); if (dx < b[2]) bn += 2 * Math.sqrt(b[2] * b[2] - dx * dx); }
      if (Y >= 820 && Y <= 1040) for (let k = 0; k < 24; k++) if (ctPelvisAt(Y, x, -120 + k * 7.5) < 0) bn += 7.5;
      const v = clamp(0.06 + th / 420 * 0.55 + bn / 40 * 0.42, 0, 1), q = Math.round(v * 12) / 12, g = Math.round(lerp(8, 236, q));
      img[j * TOPO.w + i] = (255 << 24) | (g << 16) | (g << 8) | g;
    }
  }
  return img;
});
// ---------------------------------------------------------------- the slabs of the 3D reconstruction (scene 17)
// precomputed slice textures (bones and contrast only, or with the soft tissue), sampled by the renderer's pixFn
const SLABS = { n: 34, y0: 1150, y1: 30, w: 84, h: 64, x0: -240, x1: 240, z0: -180, z1: 180 };
const SLAB_TEX = () => cached('slabtex', () => {
  const out = [];
  for (let s = 0; s < SLABS.n; s++) {
    const Y = lerp(SLABS.y0, SLABS.y1, s / (SLABS.n - 1)), lv = ctLevel(Y), ves = ctVessels(Y, TREE_RK), bones = ctBones(Y);
    const full = new Uint32Array(SLABS.w * SLABS.h), hard = new Uint32Array(SLABS.w * SLABS.h);
    for (let j = 0; j < SLABS.h; j++) for (let i = 0; i < SLABS.w; i++) {
      const x = lerp(SLABS.x0, SLABS.x1, (i + 0.5) / SLABS.w), z = lerp(SLABS.z0, SLABS.z1, (j + 0.5) / SLABS.h);
      full[j * SLABS.w + i] = ctPix(Y, x, z, lv, ves, bones, { soft: 1 }) || 0; hard[j * SLABS.w + i] = ctPix(Y, x, z, lv, ves, bones, { soft: 0 }) || 0;
    }
    out.push({ Y, full, hard });
  }
  return out;
});
const SLAB_MESH = () => cached('slabmesh', () => quadMesh([SLABS.x0, 0, SLABS.z0], [SLABS.x1 - SLABS.x0, 0, 0], [0, 0, SLABS.z1 - SLABS.z0]));
// k: how many slabs are in place (0..n, fractional: the next one is dropping in); soft: 1 soft tissue shown → 0 only bone and contrast
function drawSlabs(cam, k, soft, fade) {
  const T = SLAB_TEX(), M = SLAB_MESH();
  for (let s = 0; s < T.length; s++) {
    const a = clamp(k - s, 0, 1); if (a <= 0) continue;
    const S = T[s], drop = (1 - eout(a)) * 120, al = (1 - fade) * (0.35 + 0.65 * a);
    const pix = (u, v, x, y) => {
      const i = Math.min(SLABS.w - 1, Math.floor(u * SLABS.w)), j = Math.min(SLABS.h - 1, Math.floor(v * SLABS.h)), q = j * SLABS.w + i;
      const c = S.hard[q]; if (c) return c;                                 // bone and contrast stay
      const f = S.full[q]; if (!f) return 0;
      return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < soft * 0.55 * al ? f : 0;   // the soft tissue as a thinning screen door
    };
    drawMesh(cam, M, { ramp: [0], back: [0], unlit: true, id: 0, pixFn: pix, alpha: al < 0.99 ? al : undefined }, mT(0, S.Y + drop, 0));
  }
}
// ---------------------------------------------------------------- the console screen (scene 16)
const CON = { x0: 18, y0: 266, x1: 342, y1: 552 };
function drawConsole(t, scanY, nThumb, glow) {
  const { x0, y0, x1, y1 } = CON;
  // the monitor: bezel, screen, a soft reflection
  rect(x0 - 6, y0 - 6, x1 + 6, y1 + 8, hexc('#1A1E24')); rect(x0 - 4, y0 - 4, x1 + 4, y1 + 4, hexc('#2A3038')); rect(x0, y0, x1, y1, hexc('#0A0F15'));
  rect(x0 - 6, y1 + 8, x1 + 6, y1 + 10, hexc('#101317'));
  // the top bar: a patient symbol, the scan progress, the radiation lamp (on while scanning)
  rect(x0, y0, x1, y0 + 12, hexc('#141C26'));
  rect(x0 + 6, y0 + 3, x0 + 9, y0 + 6, P.SUB); rect(x0 + 5, y0 + 7, x0 + 10, y0 + 10, P.SUB);
  const prog = clamp((1150 - scanY) / 1120, 0, 1);
  rect(x0 + 16, y0 + 5, x1 - 22, y0 + 8, hexc('#24303C')); rect(x0 + 16, y0 + 5, Math.round(lerp(x0 + 16, x1 - 22, prog)), y0 + 8, P.ACC);
  const on = glow > 0 && Math.floor(t * 4) % 2 === 0;
  const lx = x1 - 12, ly = y0 + 6; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const r = Math.hypot(i, j); if (r <= 4.2) { const a = Math.atan2(j, i); pset(lx + i, ly + j, r < 1.4 ? hexc('#0A0F15') : (Math.floor((a + Math.PI) / (Math.PI / 3)) % 2 === 0 ? (on ? P.WARN : hexc('#5A4A20')) : hexc('#0A0F15'))); } }
  // the topogram with the scan range (orange box) and the table position (a cyan line moving down)
  const tx = x0 + 6, ty = y0 + 18, img = TOPO_IMG();
  rect(tx - 1, ty - 1, tx + TOPO.w + 1, ty + TOPO.h + 1, hexc('#2A3440'));
  for (let j = 0; j < TOPO.h; j++) for (let i = 0; i < TOPO.w; i++) pset(tx + i, ty + j, img[j * TOPO.w + i]);
  const yOf = Y => ty + Math.round((TOPO.y0 - Y) / (TOPO.y0 - TOPO.y1) * TOPO.h);
  const ya = yOf(1150), yb = yOf(25);
  rect(tx, ya, tx + TOPO.w, ya + 1, P.WARN); rect(tx, yb, tx + TOPO.w, yb + 1, P.WARN); rect(tx, ya, tx + 1, yb + 1, P.WARN); rect(tx + TOPO.w - 1, ya, tx + TOPO.w, yb + 1, P.WARN);
  const ys = yOf(scanY); if (ys > ya && ys < yb) { rect(tx - 3, ys, tx + TOPO.w + 3, ys + 1, P.ACC); rect(tx - 4, ys - 1, tx - 2, ys + 2, P.ACC); }
  // the axial image, the newest slice at the table position
  const vx = tx + TOPO.w + 8, vy = ty, vw = x1 - 6 - vx, vh = 186, F = sliceFrame(scanY);
  rect(vx - 1, vy - 1, vx + vw + 1, vy + vh + 1, hexc('#2A3440'));
  drawSlice(scanY, vx, vy, vw, vh, F.span, F.cx, F.cz);
  // the images already taken, as small thumbnails along the bottom (each arrives with the score's chime)
  const tw = 34, th = 30, gap = 4, n = Math.floor(nThumb), ty2 = vy + vh + 8, levels = [1100, 980, 860, 700, 520, 330];
  for (let k = 0; k < Math.min(6, n + 1); k++) {
    const a = k < n ? 1 : nThumb - n; if (a <= 0.02) continue;
    const bx = vx + k * (tw + gap), by = ty2 + Math.round((1 - eout(a)) * 10), Y = levels[k], Fk = sliceFrame(Y);
    rect(bx - 1, by - 1, bx + tw + 1, by + th + 1, hexc('#2A3440'));
    if (a < 1) { rect(bx, by, bx + tw, by + th, hexc('#06090D')); continue; }
    drawSlice(Y, bx, by, tw, th, Fk.span, Fk.cx, Fk.cz);
  }
}
