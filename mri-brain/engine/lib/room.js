// ROOM — the MRI control room of the first and last shots: a portrait radiology monitor filling most of the frame,
// the window into the scan room behind it (the scanner, its bore lit by a cyan ring, the patient table), the desk and
// keyboard in front. Three parallax layers (window 0.55, monitor 1, desk 1.35) in "C0" coordinates: screen pixels of
// the opening frame. The monitor shows a real slice of the film's head (VOL), sampled one sample per screen pixel.
(() => {
const { W, H, P } = PIX;
const ROOM = window.ROOM = {};
const clamp = U.clamp, lerp = U.lerp;
ROOM.C0 = { x: 135, y: 240, z: 1 };
// monitor: outer bezel, screen, image area (C0 px)
const MON = ROOM.MON = { x: 24, y: 72, w: 222, h: 356 };
MON.sx = MON.x + 7; MON.sy = MON.y + 9; MON.sw = MON.w - 14; MON.sh = MON.h - 27;
const IMG = ROOM.IMG = { w: 186, h: 222, fu: 196, fv: 234 };                 // axial image: px and field of view (mm)
IMG.x = Math.round(MON.sx + (MON.sw - IMG.w) / 2); IMG.y = MON.sy + 15;
IMG.cx = IMG.x + IMG.w / 2; IMG.cy = IMG.y + IMG.h / 2; IMG.s = IMG.w / IMG.fu;   // px per mm on the monitor
// the axial series shown on the monitor: 24 slices, 5 mm apart (z of slice 1 = −50 mm … slice 24 = 65 mm)
ROOM.N_SL = 24; ROOM.zOf = i => -50 + (i - 1) * 5; ROOM.HOME = 14;              // slice 14 (z = 15 mm): the ventricles
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// grayscale canvas from a VOL intensity image (−1 = air → transparent if alpha, else black)
ROOM.toCanvas = (im, w, h, alpha = false, gamma = 1) => {
  const c = cv(w, h), x = c.getContext('2d'), d = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = im[i], j = i * 4;
    if (v < 0) { d.data[j + 3] = alpha ? 0 : 255; continue; }
    const g = Math.round(255 * Math.pow(clamp(v), gamma)); d.data[j] = d.data[j + 1] = d.data[j + 2] = g; d.data[j + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c;
};
const SL = new Map();
ROOM.slice = i => {                                                            // monitor-resolution axial slice i (cached)
  if (!SL.has(i)) SL.set(i, ROOM.toCanvas(VOL.axial(ROOM.zOf(i), IMG.w, IMG.h, IMG.fu, IMG.fv), IMG.w, IMG.h));
  return SL.get(i);
};
let SAG = null;
ROOM.locator = () => SAG || (SAG = ROOM.toCanvas(VOL.sagittal(2.5, 44, 50, 240, 272, -6, -30), 44, 50));

// ---------- far layer: back wall and the window into the scan room ----------
function back(c, t) {
  PIX.rect(c, -80, -80, 430, 640, 'k');
  // window: the scan room glows cool through the glass
  const wx = -40, wy = -36, ww = 350, wh = 170;
  PIX.vgrad(c, wx, wy, ww, wh, [[0, 'n1'], [0.55, 'n2'], [1, 'n3']]);
  // scan room: floor, back wall panels, ceiling light strips
  PIX.rect(c, wx, wy + 118, ww, wh - 118, 'n2'); PIX.rect(c, wx, wy + 118, ww, 1, 'n4');
  for (let k = 0; k < 7; k++) PIX.rect(c, wx + 10 + k * 50, wy + 6, 30, 2, k % 2 ? 'g7' : 'g8');
  // the scanner, front view: white gantry, cyan ring around the bore, the table and the patient's feet
  const gx = 135, gy = 52;
  PIX.fill(c, PIX.rectPath(gx - 64, gy - 58, 128, 124, 22), 'g6');
  PIX.flat(c, PIX.rectPath(gx - 62, gy - 60, 124, 122, 22), 'ga', 'g8', 'gb', [3, 3], [1, 1]);
  PIX.circ(c, gx, gy, 37, 'g7'); PIX.circ(c, gx, gy, 35, 'c2'); PIX.circ(c, gx, gy, 33, 'g9'); PIX.circ(c, gx, gy, 30, 'g3');
  PIX.circ(c, gx, gy + 3, 26, 'g2');
  PIX.rect(c, gx - 48, gy + 66, 96, 6, 'g5');                                   // plinth
  // table into the bore and the patient under a blanket (feet toward us)
  PIX.fill(c, PIX.polyPath([[gx - 16, gy + 18], [gx + 16, gy + 18], [gx + 30, gy + 92], [gx - 30, gy + 92]]), 'g8');
  PIX.fill(c, PIX.polyPath([[gx - 12, gy + 12], [gx + 12, gy + 12], [gx + 20, gy + 70], [gx - 20, gy + 70]]), 'g5');
  PIX.rect(c, gx - 30, gy + 92, 60, 3, 'g4');
  // window frame and mullion
  PIX.rect(c, wx, wy + wh, ww, 6, 'g2'); PIX.rect(c, wx, wy + wh, ww, 1, 'g4');
  for (const mx of [10, 260]) PIX.rect(c, mx, wy, 5, wh, 'g1');
  PIX.rect(c, wx, wy + wh + 6, ww, 400, 'n0');
  // wall panel seams below the window
  for (let k = 0; k < 6; k++) PIX.rect(c, -40 + k * 64, wy + wh + 6, 1, 400, 'k');
}

// ---------- the monitor ----------
// o = {img: canvas, idx: slice index, mode: '2d' | '3d', fade: 0..1 image visibility, scan: 0..1 refresh beam, t}
function monitor(c, t, o = {}) {
  // stand behind the panel, then the bezel
  PIX.rect(c, 120, MON.y + MON.h - 4, 30, 40, 'g1'); PIX.rect(c, 121, MON.y + MON.h - 4, 2, 40, 'g3');
  PIX.flat(c, PIX.rectPath(MON.x, MON.y, MON.w, MON.h, 4), 'g2', 'g1', 'g4', [2, 2], [1, 1]);
  PIX.rect(c, MON.sx - 1, MON.sy - 1, MON.sw + 2, MON.sh + 2, 'g0');
  PIX.rect(c, MON.sx, MON.sy, MON.sw, MON.sh, 'k');
  PIX.rect(c, MON.x + MON.w / 2 - 1, MON.y + MON.h - 11, 3, 2, 'e2');            // power LED
  const ax = IMG.x, ay = IMG.y;
  // the image
  const fade = o.fade ?? 1;
  if (o.img && fade > 0) {
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = fade; c.drawImage(o.img, ax, ay); c.restore();
  }
  // refresh beam sweeping down the image
  if (o.scan > 0 && o.scan < 1) {
    const yb = ay + o.scan * IMG.h;
    PIX.rect(c, ax, Math.round(yb), IMG.w, 1, 'c4'); PIX.rect(c, ax, Math.round(yb) - 2, IMG.w, 1, 'c2', 0.6);
  }
  // viewer furniture: series header, orientation marks, scale bar, locator, slice counter, thumbnails
  const i = o.idx ?? ROOM.HOME;
  PIX.text(c, o.mode === '3d' ? '3D VOLUME' : 'T1 AXIAL', MON.sx + 4, MON.sy + 4, 'g8', { shadow: null });
  PIX.text(c, '1.5 T', MON.sx + MON.sw - 4, MON.sy + 4, 'c3', { align: 'right', shadow: null });
  PIX.text(c, 'A', IMG.cx, ay + 2, 'g6', { align: 'center', shadow: null });
  PIX.text(c, 'L', ax + 3, IMG.cy - 3, 'g6', { shadow: null }); PIX.text(c, 'R', ax + IMG.w - 7, IMG.cy - 3, 'g6', { shadow: null });
  const sb = Math.round(50 * IMG.s);                                             // 5 cm scale bar
  PIX.rect(c, ax + 4, ay + IMG.h - 6, sb, 1, 'g6'); PIX.rect(c, ax + 4, ay + IMG.h - 9, 1, 4, 'g6'); PIX.rect(c, ax + 4 + sb, ay + IMG.h - 9, 1, 4, 'g6');
  // locator: a small sagittal view with the current slice level
  const lx = ax + IMG.w - 47, ly = ay + 4;
  if (o.mode !== '3d') {
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.85; c.drawImage(ROOM.locator(), lx, ly); c.restore();
    PIX.rect(c, lx - 1, ly - 1, 46, 1, 'g3'); PIX.rect(c, lx - 1, ly + 50, 46, 1, 'g3'); PIX.rect(c, lx - 1, ly, 1, 50, 'g3'); PIX.rect(c, lx + 44, ly, 1, 50, 'g3');
    const zl = ROOM.zOf(i), yl = Math.round(ly + 25 - (zl - (-30)) * (50 / 272) );
    PIX.rect(c, lx, yl, 44, 1, 'c3');
  }
  const by = ay + IMG.h + 6;
  PIX.text(c, `IM ${String(i).padStart(2, '0')}/${ROOM.N_SL}`, MON.sx + 4, by, 'g8', { shadow: null });
  PIX.text(c, 'TR 500 TE 12', MON.sx + MON.sw - 4, by, 'g6', { align: 'right', shadow: null });
  // thumbnails of the series; the current one framed in cyan
  const n = 7, tw = 24, gap = 4, x0 = Math.round(MON.sx + (MON.sw - (n * tw + (n - 1) * gap)) / 2), ty = by + 12;
  for (let k = 0; k < n; k++) {
    const j = clamp(Math.round(i - 3 + k), 1, ROOM.N_SL), tx = x0 + k * (tw + gap);
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.9; c.drawImage(ROOM.slice(j), tx, ty, tw, 29); c.restore();
    if (k === 3) { PIX.rect(c, tx - 1, ty - 1, tw + 2, 1, 'c3'); PIX.rect(c, tx - 1, ty + 29, tw + 2, 1, 'c3'); PIX.rect(c, tx - 1, ty, 1, 29, 'c3'); PIX.rect(c, tx + tw, ty, 1, 29, 'c3'); }
  }
}
ROOM.monitorFn = monitor;
// ---------- near layer: desk edge, keyboard, mouse, the screen's light on the desk ----------
function desk(c, t) {
  PIX.rect(c, -60, 452, 390, 80, 'g1'); PIX.rect(c, -60, 452, 390, 1, 'g3'); PIX.rect(c, -60, 453, 390, 1, 'g2');
  // keyboard
  PIX.flat(c, PIX.rectPath(30, 462, 150, 26, 2), 'g2', 'g0', 'g3', [1, 2], [1, 1]);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 16; k++) PIX.rect(c, 35 + k * 9, 466 + r * 6, 7, 4, (k + r) % 5 ? 'g3' : 'g4');
  // mouse
  PIX.flat(c, PIX.rectPath(200, 466, 16, 22, 7), 'g3', 'g1', 'g5', [1, 1], [1, 1]);
}
// the whole room under camera cam (C0 coordinates). o is passed to the monitor.
ROOM.draw = (c, cam, t, o = {}) => {
  PIX.layer(c, cam, 0.55, cc => back(cc, t));
  PIX.layer(c, cam, 1, cc => monitor(cc, t, o));
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.glow !== false) {
    const [gx, gy] = PIX.toScreen(cam, 135, 452);
    FX.glowL(c, gx, gy, 150 * (cam.z || 1), ['n2', 'n3'], 0.5, 1.2);
  }
  if (o.desk !== false) PIX.layer(c, cam, 1.35, cc => desk(cc, t));
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// screen position of a point of the monitor plane (C0 coordinates) under cam
ROOM.S = (cam, x, y) => PIX.toScreen(cam, x, y);
ROOM.init = async () => { ROOM.slice(ROOM.HOME); ROOM.locator(); };
})();
