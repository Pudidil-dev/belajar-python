'use strict';
// ============================================================================
// THE EVENING PARK (scenes 1-3, 12-13): 2D pixel-art layers standing in the 3D
// world behind the walker, so they slide past at their own speeds as the camera
// tracks him (parallax): stars and a crescent moon (at infinity), a far skyline
// with a few lit windows, a line of trees, the lawn beyond the path with its
// kerb. All of it is dark, hazy and low in contrast — a backdrop that gives
// the walk a place and a speed; the lit figure in front stays the subject.
// World: x along the walk, y up, z toward the camera; the path is |z| < 1500.
// ============================================================================
const PK = {}; for (const [k, v] of Object.entries({
  lawn: '#0D1A22', lawn2: '#0F1F28', lawn3: '#0B171E', kerb: '#213245', kerbS: '#172432',
  tree: '#132435', treeL: '#1B3247', treeD: '#0F1D2B', trunk: '#101E2C',
  bld: '#101C2C', bld2: '#121F31', win: '#2E445A', winL: '#7E9AB2',
  moon: '#CCDAE4', moonS: '#9FB4C4', halo: '#1E3249', halo2: '#2A4058',
})) PK[k] = hexc(v);
const PARK = { lawnZ: -1500, treeZ: -90000, skyZ: -700000 };
// ---------------------------------------------------------------- the pictures (world mm on each layer's plane)
function parkSkyline(X, Y) {
  const cw = 30000, i = Math.floor(X / cw), fx = X - i * cw, h1 = hash2(i, 1), h2 = hash2(i, 2), h3 = hash2(i, 3);
  const w = cw * (0.5 + 0.42 * h1), x0 = (cw - w) * h3, lx = fx - x0, H = 13000 + 50000 * h2 * h2;
  if (lx < 0 || lx > w) return 0;
  const top = h2 > 0.5 && (lx < w * 0.2 || lx > w * 0.8) ? H * 0.84 : H;                     // taller ones step in at the top
  if (Y > top) return h2 > 0.72 && Math.abs(lx - w * 0.5) < 420 && Y < H + 9000 ? PK.bld : 0;   // a mast
  const inx = lx % 3300, iny = Y % 3900;
  if (inx > 950 && inx < 2500 && iny > 1300 && iny < 2950 && lx > 1600 && lx < w - 1600 && Y < top - 2600) {
    const hw = hash2(i * 31 + Math.floor(lx / 3300), Math.floor(Y / 3900)); if (hw < 0.09) return PK.win; if (hw < 0.115) return PK.winL;
  }
  return i & 1 ? PK.bld : PK.bld2;
}
const TREE_CW = 6500, TREE_CELL = {};                                  // one tree per cell: [x, crown radius, crown height] or null (a gap)
function treeCell(i) {
  let c = TREE_CELL[i];
  if (c === undefined) { const h1 = hash2(i, 11), h2 = hash2(i, 12), r = 1900 + 1500 * h2; c = TREE_CELL[i] = hash2(i, 13) < 0.16 ? null : [(i + 0.5 + 0.5 * (h1 - 0.5)) * TREE_CW, r, 2500 + 2900 * h1 + r * 0.2]; }
  return c;
}
const TREE_LOBE = [[0, 0, 1], [-0.58, -0.36, 0.7], [0.56, -0.3, 0.72]];  // a crown of three lobes
function parkTrees(X, Y) {
  if (Y > 9700) return 0;
  const i0 = Math.floor(X / TREE_CW);
  let c = Y < 2300 && Y < 1500 + 480 * Math.sin(X / 2100) + 260 * Math.sin(X / 700 + 1.3) ? PK.treeD : 0;      // low shrubs under the trees
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const tc = treeCell(i); if (!tc) continue;
    const cx = tc[0], r = tc[1], cy = tc[2], ax = X - cx;
    if (ax > 1.6 * r || ax < -1.6 * r || Y > cy + r) continue;
    for (let l = 0; l < 3; l++) {
      const L = TREE_LOBE[l], dx = ax - L[0] * r, dy = Y - cy - L[1] * r, rr = r * L[2];
      if (dx * dx + dy * dy < rr * rr) { const lit = (dx * 0.5 + dy * 0.86) / rr; c = lit > 0.52 ? PK.treeL : lit < -0.35 ? PK.treeD : PK.tree; }   // moonlit from the upper right
    }
    if (!c && ax < 190 && ax > -190 && Y < cy) c = PK.trunk;
  }
  return c;
}
function parkLawn(X, Z) {
  if (Z > PARK.lawnZ - 90) return Z > PARK.lawnZ - 60 ? PK.kerb : PK.kerbS;                    // the kerb along the path
  const h = hash2(Math.floor(X / 520), Math.floor(Z / 520));
  return h < 0.2 ? PK.lawn2 : h > 0.86 ? PK.lawn3 : PK.lawn;
}
// ---------------------------------------------------------------- the layers as big quads
const PARK_M = () => cached('park', () => ({
  lawn: quadMesh([-150000, 0, PARK.lawnZ], [450000, 0, 0], [0, 0, -148500]),
  trees: quadMesh([-200000, 0, PARK.treeZ], [500000, 0, 0], [0, 10000, 0]),
  sky: quadMesh([-1500000, 0, PARK.skyZ], [3000000, 0, 0], [0, 80000, 0]),
}));
const PARK_STARS = (() => { const r = mulberry(91), s = []; for (let i = 0; i < 64; i++) { const az = (r() - 0.5) * 0.9, el = 0.03 + r() * 0.3; s.push({ d: [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)], b: r(), ph: r() * TAU, w: 0.5 + r() }); } return s; })();
const PARK_MOON = (() => { const az = 0.07, el = 0.182; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; })();
// o: {fog (for the lawn), fade (0..1: the park dissolves pixel by pixel), t}
function drawPark(cam, o) {
  o = o || {};
  const fade = o.fade || 0; if (fade >= 1) return;
  const t = o.t || 0, far = d => project(cam, [cam.eye[0] + d[0] * 1e7, cam.eye[1] + d[1] * 1e7, cam.eye[2] + d[2] * 1e7]);
  // stars (they twinkle slowly) and the moon: at infinity, so they hold still while everything nearer slides past
  const tones = [P.ST1, P.ST2, P.ST3, P.ST4];
  PARK_STARS.forEach((s, i) => {
    if (hash2(i, 5) < fade) return;
    const p = far(s.d); if (!p) return;
    const lv = clamp(Math.floor(s.b * 2.4 + 1.1 + 0.9 * Math.sin(t * s.w + s.ph)), 0, 3), x = Math.round(p[0]), y = Math.round(p[1]);
    pset(x, y, tones[lv]); if (s.b > 0.86 && lv === 3) { pset(x - 1, y, P.ST2); pset(x + 1, y, P.ST2); pset(x, y - 1, P.ST2); pset(x, y + 1, P.ST2); }
  });
  const m = far(PARK_MOON);
  if (m && fade < 0.6) {
    const x = Math.round(m[0]), y = Math.round(m[1]), sky = buf[clamp(y, 0, H - 1) * W + clamp(x - 30, 0, W - 1)];
    disc(x, y, 17, PK.halo, 0.22); disc(x, y, 12, PK.halo2, 0.3); disc(x, y, 7.5, PK.moon); disc(x + 1.5, y + 2, 5, PK.moonS, 0.35);
    disc(x - 4, y - 2.5, 6.6, sky);                                    // the crescent's shadow side
  }
  const M = PARK_M(), mat = pix => ({ ramp: [0], back: [0], unlit: true, id: 0, pixFn: fade > 0 ? (u, v, x, y) => (bay(x, y) < fade ? 0 : pix(u, v)) : pix });
  drawMesh(cam, M.sky, mat((u, v) => parkSkyline(-1500000 + u * 3000000, v * 80000)));
  drawMesh(cam, M.trees, mat((u, v) => parkTrees(-200000 + u * 500000, v * 10000)));
  drawMesh(cam, M.lawn, Object.assign(mat((u, v) => parkLawn(-150000 + u * 450000, PARK.lawnZ - v * 148500)), { fog: o.fog }));
}
