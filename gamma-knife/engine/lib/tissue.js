// TISSUE — brain tissue close up (pink folds with dark sulci) and the dose field over it: the absorbed dose as a
// heatmap from dark blue (low) through cyan, green, yellow and orange to red (high), in hard pixel bands with a dithered
// edge. Shots are gaussian dose spots that add (they do not collide or fuse); the surrounding tissue keeps a low,
// non-zero dose. Also the irregular lesion and its dashed outline, and the isocenter crosshair.
// The folds are one world-space texture made once (2 texels per unit) and drawn under the camera.
(() => {
const { W, H, P, BAYER } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const TISSUE = window.TISSUE = { NAME: 'TISSUE' };
const TX0 = -320, TY0 = -480, TW = 640, TH = 960, TS = 2;              // texture: world rect and texels per unit
let tex = null;
const RGB = k => PIX.hex(P[k]);
TISSUE.init = () => {
  tex = document.createElement('canvas'); tex.width = TW * TS; tex.height = TH * TS;
  const x = tex.getContext('2d'), img = x.createImageData(tex.width, tex.height), d = img.data;
  const C = ['br2', 'br3', 'br4', 'br5', 'br6'].map(RGB), BG = RGB('br1');
  for (let j = 0; j < tex.height; j++) for (let i = 0; i < tex.width; i++) {
    const wx = TX0 + i / TS, wy = TY0 + j / TS;
    // gyri: the sulci are one level set of a smooth noise (main grooves) plus thinner grooves from a second one; the
    // folds between them are shaded by their distance from the nearest groove (darker at the edge, light along the crest)
    const n1 = K.fbm(wx * 0.019, wy * 0.019, 5, 3), n2 = K.fbm(wx * 0.042 + 17, wy * 0.042, 13, 2), d1 = Math.abs(n1 - 0.5) * 9, d2 = Math.abs(n2 - 0.5) * 12, e = Math.min(d1, d2 + 0.1);
    const k = e < 0.08 ? -1 : e < 0.18 ? 0 : e < 0.32 ? 1 : e < 0.5 ? 2 : (e < 0.62 && n1 > 0.5 ? 4 : 3);
    const col = k < 0 ? BG : C[k], o = (j * tex.width + i) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
};
// shots: [{x, y, s, sy, w}] in world units; returns the dose at a world point (0..1+)
TISSUE.doseAt = (shots, wx, wy) => { let v = 0; for (const s of shots) { const dx = (wx - s.x) / s.s, dy = (wy - s.y) / (s.sy ?? s.s); v += (s.w ?? 1) * Math.exp(-0.5 * (dx * dx + dy * dy)); } return v; };
// o: { shots, dose (0..1 overall scale), floor (0..1: the low dose on all the tissue), lesion (pts), lesionFill, outline,
//      cross: [x, y], dim (0..1 darken the folds) }
TISSUE.draw = (c, cam, T, o = {}) => {
  (window.__cams = window.__cams || {}).tissue = cam;
  const z = cam.z;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.ti1; c.fillRect(0, 0, W, H);
  const [ox, oy] = K.S(cam, TX0, TY0); c.imageSmoothingEnabled = z / TS < 1; c.drawImage(tex, ox, oy, TW * z, TH * z); c.restore();
  if (o.lesionFill > 0 && o.lesion) {
    D.blob(c, cam, o.lesion, ['tu1', 'tu2', 'tu3', 'tu4', 'tu5'], { alpha: o.lesionFill, bias: 0.02, tone: (x, y) => { const wx = cam.x + (x - W / 2) / z, wy = cam.y + (y - H / 2) / z, g = K.fbm(wx * 0.08, wy * 0.08, 3, 2) * 5, f = g - Math.floor(g); return Math.abs(f - 0.5) < 0.05 ? 0.3 : 0; } });
  }
  const shots = o.shots || [], sc = o.dose ?? 1, fl = o.floor ?? 0;
  if ((shots.length && sc > 0) || fl > 0) {
    // the dose overlay, pixel by pixel inside the frame
    const [X0, Y0, X1, Y1] = LIT.CLIP || [0, 0, W, H], bw = X1 - X0;              // putImageData ignores clipping: keep to the inset
    const img = c.getImageData(X0, Y0, bw, Y1 - Y0), d = img.data, cols = RAMP.d.map(RGB);
    for (let y = Y0; y < Y1; y++) { const wy = cam.y + (y - H / 2) / z; for (let x = X0; x < X1; x++) {
      const wx = cam.x + (x - W / 2) / z, v = TISSUE.doseAt(shots, wx, wy) * sc + fl, b = BAYER[(y & 3) << 2 | (x & 3)];
      if (v < 0.06 + b * 0.05) continue;
      const k = clamp(Math.floor(v * 8 + b * 0.55), 0, 7), cc = cols[k], i = ((y - Y0) * bw + (x - X0)) * 4;
      if (v < 0.12 && b > -0.1) continue;                                        // a dithered outer edge
      d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2];
    } }
    c.putImageData(img, X0, Y0);
  }
  if (o.outline && o.lesion) { const b = D.blobPath(o.lesion); D.stroke(c, b.pts.concat([b.pts[0]]).map(([x, y]) => K.S(cam, x, y)), 'w', 1, o.outline, [4, 3]); }
  if (o.cross) { const [sx, sy] = K.S(cam, o.cross[0], o.cross[1]); D.cross(c, sx, sy, o.crossLen ?? 120, 'w', o.crossA ?? 0.9); }
};
})();
