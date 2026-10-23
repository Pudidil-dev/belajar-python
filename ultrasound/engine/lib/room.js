// ROOM — the scan room, in world centimetres (x right, y down, the floor at y = 0): the ultrasound machine and its
// monitor, the exam bed, the patient's belly, the probe in a gloved hand, its cable and the coupling gel.
// Everything is drawn as flat two-tone shapes under the camera (re-rasterized at every zoom, never bitmap-scaled),
// except the monitor's static interface: a 12 px/cm texture that sits 1:1 on the pixel grid in the opening shot.
// The patient lies with her head to the left, so the image on the monitor (head end on the left, as in a sagittal
// scan) and the cutaway under the probe are the same picture.
(() => {
const { P, W, H } = PIX;
const ROOM = window.ROOM = {};
const lerp = U.lerp, clamp = U.clamp;
const SCR = { x0: -18, y0: -178.5, x1: 18, y1: -151.5 };      // monitor screen, 36 × 27 cm
const FAN = { ax: 0, ay: -177, k: 1.35 };                      // the image on the monitor: apex, cm per body cm
const PRB = { ax: 0, ay: -105.2 };                             // the probe's virtual apex (its face has radius US.RP)
Object.assign(ROOM, { SCR, FAN, PRB });
ROOM.HOOK = { x: 0, y: -166, z: 12 };                          // the opening shot: screen 1:1 with its texture
// body point (bx, bz) of the image on the monitor → world
ROOM.fanW = (bx, bz) => [FAN.ax + FAN.k * bx, FAN.ay + FAN.k * (bz + US.RP)];
ROOM.MACHINE = { x: 0, y: -147, z: 3.3 };                      // monitor, deck and the probe on the belly
ROOM.PROBEV = { x: 0, y: -106, z: 5.4 };                       // the probe, the hand, the cutaway fan
const TX = 12, TW = 432, TH = 324;                             // texture scale (px/cm) and size
const FL = (c, z, path, base, sh, hi, s = 1.5, hs = 1) => PIX.flat(c, path, base, sh, hi, [s / z, s / z], [hs / z, hs / z]);
const R = (x, y, w, h, r = 0) => PIX.rectPath(x, y, w, h, r);
ROOM.FL = FL;

// ---------- the monitor's interface (static): header, settings, depth scale, gray bar, LIVE ----------
const MT = document.createElement('canvas'); MT.width = TW; MT.height = TH;
const tex = (x, y) => [(x - SCR.x0) * TX, (y - SCR.y0) * TX];
function buildTexture() {
  const x = MT.getContext('2d');
  x.fillStyle = P.k; x.fillRect(0, 0, TW, TH);
  x.fillStyle = P.g1; x.fillRect(0, 0, TW, 12); x.fillStyle = P.g2; x.fillRect(0, 12, TW, 1);
  const T = (s, tx, ty, col = 'g8', o = {}) => PIX.text(x, s, tx, ty, col, { shadow: null, ...o });
  T('OB', 86, 3, 'e3'); T('3.5MHz', 104, 3, 'g9'); T('FR 30', 150, 3);
  T('MI 0.9', 262, 3); T('TIS 0.4', 302, 3);
  T('GAIN 52', 86, 22); T('DR 60', 86, 33); T("D 12", 86, 44);
  // depth scale along the right edge: a tick per cm below the face, numbers at 0, 5, 10; the focus marker at 8 cm
  const [ax, ay] = tex(FAN.ax, FAN.ay), pc = TX * FAN.k;
  for (let d = 0; d <= US.DEPTH; d++) {
    const y = Math.round(ay + (US.RP + d) * pc), big = d % 5 === 0;
    x.fillStyle = P[big ? 'g8' : 'g5']; x.fillRect(big ? 345 : 347, y, big ? 5 : 3, 1);
    if (big) T(String(d), 343, y - 3, 'g8', { align: 'right' });
  }
  T('cm', 337, 66, 'g6');
  const yf = Math.round(ay + (US.RP + 7) * pc); x.fillStyle = P.y3; for (let k = 0; k < 3; k++) x.fillRect(344 - k, yf - k, 1, 2 * k + 1);
  // orientation marker (matches the bump on the probe's left side)
  x.fillStyle = P.e2; x.fillRect(Math.round(ax - 34), Math.round(ay + 30), 3, 3);
  // gray map: echo strength → brightness
  ['w', 'gb', 'ga', 'g9', 'g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'g0', 'k'].forEach((k, i) => { x.fillStyle = P[k]; x.fillRect(336, 252 + i * 4, 5, 4); });
  x.fillStyle = P.g4; x.fillRect(335, 251, 7, 1); x.fillRect(335, 308, 7, 1);
  // LIVE
  x.fillStyle = P.e2; x.fillRect(86, 302, 3, 3); T('LIVE', 92, 300, 'e3');
}
ROOM.init = () => buildTexture();

// screen rectangle in screen pixels for a camera
ROOM.screenRect = cam => { const a = K.S(cam, SCR.x0, SCR.y0), b = K.S(cam, SCR.x1, SCR.y1); return [Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1])]; };
// the live image on the screen. o: {fr (frames), lines (build), sweep (show the refresh line), gain, ui (0..1)}
ROOM.drawScreen = (c, cam, t, o = {}) => {
  const clip = ROOM.screenRect(cam);
  if (clip[2] <= 0 || clip[0] >= W || clip[3] <= 0 || clip[1] >= H) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = P.k; c.fillRect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1]);
  const s = cam.z / TX, [sx, sy] = K.S(cam, SCR.x0, SCR.y0);
  if (o.ui !== 0) { c.imageSmoothingEnabled = s < 0.999; c.drawImage(MT, sx, sy, TW * s, TH * s); }
  c.restore();
  const fr = o.fr || US.sweepFrames(t, 0.5);
  US.drawFan(c, cam, FAN.ax, FAN.ay, FAN.k, { fr, lines: o.lines, clip, gain: o.gain, blank: o.blank });
  if (o.sweep !== false && fr.s != null) ROOM.sweepLine(c, cam, fr.s, clip);
};
// the refresh line of the live image (one sweep per beat)
ROOM.sweepLine = (c, cam, s, clip, a = 1) => {
  const ph = -US.HALF + 2 * US.HALF * s;
  for (const [dph, col] of [[-0.012, 'c1'], [0, 'c3']]) {
    const p = ph + dph; if (Math.abs(p) > US.HALF) continue;
    const r0 = US.RP, r1 = US.RP + US.DEPTH;
    const A = US.toScreen(cam, FAN.ax, FAN.ay, FAN.k, r0 * Math.sin(p), r0 * Math.cos(p) - US.RP), B = US.toScreen(cam, FAN.ax, FAN.ay, FAN.k, r1 * Math.sin(p), r1 * Math.cos(p) - US.RP);
    c.save(); c.globalAlpha *= a;
    c.beginPath(); c.rect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1]); c.clip();
    PIX.bline(c, A[0], A[1], B[0], B[1], col); c.restore();
  }
};

// ---------- the room ----------
ROOM.drawWall = (c, cam) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.n1; c.fillRect(0, 0, W, H); c.restore();
  PIX.cam(c, cam); const z = cam.z;
  for (const x of [-90, -30, 30, 90]) PIX.fill(c, R(x - 0.3, -260, 0.6, 260), 'n2');                 // wall panel seams
  PIX.fill(c, R(-400, -96, 800, 2.4), 'n2'); PIX.fill(c, R(-400, -96, 800, 0.6), 'n3');              // rail behind the bed
  PIX.fill(c, R(-400, 0, 800, 40), 'n0');
  c.setTransform(1, 0, 0, 1, 0, 0);
};

// the machine: cart, control deck (keys, trackball, TGC sliders, probe holders), arm and monitor
ROOM.drawMachine = (c, cam, t, o = {}) => {
  PIX.cam(c, cam); const z = cam.z;
  // cart body
  FL(c, z, R(-26, -127, 52, 122, 2.5), 'g7', 'g5', 'g8', 2);
  for (let k = 0; k < 6; k++) PIX.fill(c, R(-20, -116 + k * 2.2, 14, 0.7, 0.3), 'g5');                // vents
  PIX.fill(c, R(8, -118, 12, 9, 0.8), 'g6');                                                          // printer bay
  PIX.fill(c, R(9.5, -114, 9, 0.8), 'g4');
  // deck: top face and front edge
  FL(c, z, U.poly([[-32, -133.5], [32, -133.5], [35, -129], [-35, -129]]), 'ga', 'g9', 'gb', 1.2);
  FL(c, z, R(-35, -129, 70, 3.6, 0.8), 'g8', 'g6', 'g9', 1.2);
  // probe holders on the left with a parked linear probe, gel bottle on the right
  FL(c, z, R(-39, -131, 5, 7, 0.8), 'g8', 'g6', 'g9', 1.2);
  FL(c, z, U.poly([[-37.6, -139], [-35.6, -139], [-35.2, -131], [-38, -131]]), 'g9', 'g7', 'gb', 1.2);
  FL(c, z, R(34, -131, 5, 7, 0.8), 'g8', 'g6', 'g9', 1.2);
  FL(c, z, R(34.8, -140, 3.4, 9.5, 1), 'l1', 'l0', 'l2', 1.2);
  PIX.fill(c, R(35.7, -142.4, 1.6, 2.4, 0.4), 'w');
  // keys, trackball, TGC sliders
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) PIX.fill(c, R(-29 + i * 2.6 + r * 0.6, -132.6 + r * 1.6, 2, 1, 0.25), 'g4');
  PIX.fill(c, R(-12.5, -132.2, 3.5, 1.4, 0.3), 'e1'); PIX.fill(c, R(-12.2, -132, 1, 0.5), 'e3');      // freeze key
  K.ball(c, 0, -131.4, 1.5, 'g4', 'g2', 'g7');
  for (let i = 0; i < 8; i++) { PIX.fill(c, R(11 + i * 2.1, -133, 0.5, 3.2), 'g5'); PIX.fill(c, R(10.7 + i * 2.1, -132.4 + 0.5 * Math.sin(i * 0.8) + i * 0.12, 1.1, 0.8, 0.2), 'g2'); }
  PIX.fill(c, R(-25.5, -126.8, 3, 1.4, 0.6), 'g3');                                                    // probe port
  // arm
  FL(c, z, R(-2.4, -149, 4.8, 16, 0.4), 'g8', 'g6', 'g9', 1.2);
  FL(c, z, R(-5, -135.5, 10, 2.4, 0.8), 'g8', 'g6', 'g9', 1.2);
  ROOM.drawMonitor(c, cam, t, o);
  c.setTransform(1, 0, 0, 1, 0, 0);
};
ROOM.drawMonitor = (c, cam, t, o = {}) => {
  PIX.cam(c, cam); const z = cam.z;
  FL(c, z, R(-20.4, -180.3, 40.8, 32.4, 1.2), 'ga', 'g8', 'gb', 2);
  PIX.fill(c, R(-18.7, -179.2, 37.4, 28.6, 0.3), 'g1');
  PIX.fill(c, R(-1.2, -149.5, 2.4, 0.5, 0.2), 'g7');                                                 // chin badge
  PIX.fill(c, R(16.2, -149.6, 0.7, 0.7), 'e2');                                                      // power LED
  c.setTransform(1, 0, 0, 1, 0, 0);
  ROOM.drawScreen(c, cam, t, o);
};

// ---------- bed and patient ----------
// top of the body (skin or cloth) at x, without the probe's dent
const bellyTop = x => {
  const b = -95 - 7 * Math.exp(-(((x - 2) / 22) ** 2));
  if (x <= 34) return b;
  const e = U.ss(34, 72, x); return lerp(b, -88.5 + (x - 72) * 0.012, e);
};
// the skin under and around the probe: it follows the probe's curved face where they touch
const FACE_EDGE = 34 * Math.PI / 180;
const faceY = x => PRB.ay + Math.sqrt(Math.max(0, US.RP * US.RP - x * x));
ROOM.skinY = (x, press = 1) => {
  const b = bellyTop(x), xe = US.RP * Math.sin(FACE_EDGE), ye = faceY(xe);
  if (press <= 0) return b;
  const ax = Math.abs(x - PRB.ax);
  if (ax <= xe) return lerp(b, Math.max(b, faceY(x - PRB.ax)), press);
  return b + (ye - bellyTop(PRB.ax + Math.sign(x) * xe)) * Math.exp(-(((ax - xe) / 1.4) ** 2)) * press;
};
ROOM.bellyTop = bellyTop;
const profile = (x0, x1, f, step = 0.5) => { const pts = []; for (let x = x0; x <= x1 + 1e-9; x += step) pts.push([x, f(x)]); return pts; };
ROOM.drawBed = (c, cam) => {
  PIX.cam(c, cam); const z = cam.z;
  FL(c, z, R(-170, -77, 440, 9, 2), 'n3', 'n2', 'n4', 1.5);                                          // mattress
  FL(c, z, R(-170, -68, 440, 3.5), 'g5', 'g3', 'g6', 1.2);                                           // frame
  for (const x of [-120, 180]) FL(c, z, R(x, -64.5, 3.5, 64.5), 'g5', 'g3', 'g6', 1.2);
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// o: {press (probe dent 0..1), gel (0..1 bead), cut (draw no skin inside the fan: the cutaway shows through)}
ROOM.drawPatient = (c, cam, t, o = {}) => {
  PIX.cam(c, cam); const z = cam.z, press = o.press ?? 1;
  const top = x => ROOM.skinY(x, press);
  // whole torso and legs in skin, then the gown and the sheet over it
  const body = [[-200, -76], ...profile(-200, 270, top, 0.4), [270, -76]];
  FL(c, z, U.poly(body), 's3', 's2', 's4', 1.6);
  PIX.fill(c, R(15.2, top(15.5) + 0.25, 0.9, 0.35, 0.15), 's1');                                     // navel
  // gown (upper body): a hem with soft folds at x ≈ −24
  const gown = [[-200, -76], ...profile(-200, -24, x => top(x) - 0.6, 0.4), [-23.2, -97.2], [-24.4, -90], [-25.4, -82], [-25, -76]];
  FL(c, z, U.poly(gown), 'h2', 'h1', 'h3', 1.6);
  for (const fx of [-36, -48, -63]) PIX.fill(c, U.poly([[fx, top(fx) - 0.2], [fx + 1.4, top(fx + 1.4) + 0.4], [fx - 2, -84], [fx - 2.8, -84]]), 'h1');
  // sheet over the hips and legs
  const sheet = [[30.5, -76], [29.4, -86], [29.2, top(29.2) - 1.2], ...profile(30, 270, x => top(x) - 1.3, 0.5), [270, -76]];
  FL(c, z, U.poly(sheet), 'gb', 'g9', 'w', 1.6);
  PIX.fill(c, U.poly([[29.2, top(29.2) - 1.2], [33, top(33) - 1.3], [32.4, -88], [30, -86]]), 'ga');  // folded hem
  for (const fx of [48, 64, 92]) PIX.fill(c, U.poly([[fx, top(fx) - 1.2], [fx + 1.2, top(fx + 1.2) - 1], [fx - 3, -79], [fx - 4, -79]]), 'g9');
  // gel: a bead along both edges of the probe face
  const g = o.gel ?? 1;
  if (g > 0) {
    const xe = US.RP * Math.sin(FACE_EDGE);
    for (const sgn of [-1, 1]) {
      const cx = PRB.ax + sgn * (xe + 0.5), w = 1.5 * g, hgt = 0.55 * g;
      const pts = []; for (let k = 0; k <= 12; k++) { const u = -1 + 2 * k / 12, xx = cx + u * w; pts.push([xx, top(xx) - hgt * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.35 * sgn * u)]); }
      pts.push([cx + w, top(cx + w) + 0.1], [cx - w, top(cx - w) + 0.1]);
      FL(c, z, U.poly(pts), 'l1', 'l0', 'l2', 1);
      PIX.fill(c, R(cx - 0.4 * sgn - 0.25, top(cx) - hgt * 0.8, 0.5, 0.25, 0.1), 'w');
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------- probe, hand, cable ----------
// the probe's outline (convex head on the skin, handle up to the cable), world coordinates
const probePath = (ax, ay) => {
  // right face edge → up the right side → across the top → down the left side → along the face back to the right
  const side = [[2.75, -1.6], [2.55, -3.6], [1.6, -5.6], [1.55, -14.6], [1.1, -16.4], [-1.1, -16.4], [-1.55, -14.6], [-1.6, -5.6], [-2.55, -3.6], [-2.75, -1.6]];
  const out = [[ax + (US.RP + 0.02) * Math.sin(FACE_EDGE), ay + (US.RP + 0.02) * Math.cos(FACE_EDGE)]];
  for (const [dx, dy] of side) out.push([ax + dx, ay + dy]);
  for (let k = 0; k <= 16; k++) { const a = -FACE_EDGE + 2 * FACE_EDGE * k / 16; out.push([ax + (US.RP + 0.02) * Math.sin(a), ay + (US.RP + 0.02) * Math.cos(a)]); }
  return U.poly(out);
};
ROOM.probeTop = [PRB.ax, PRB.ay - 16.4];
ROOM.probePath = probePath;
// o: {lit (0..1, the face glows when it fires), cut (0..1: the housing opens to show the layers inside)}
ROOM.drawProbe = (c, cam, t, o = {}) => {
  PIX.cam(c, cam); const z = cam.z, ax = PRB.ax, ay = PRB.ay;
  FL(c, z, probePath(ax, ay), 'ga', 'g8', 'gb', 1.6);
  // acoustic lens: a dark band along the face
  const lens = [];
  for (let k = 0; k <= 16; k++) { const a = -FACE_EDGE * 0.97 + 2 * FACE_EDGE * 0.97 * k / 16; lens.push([ax + (US.RP + 0.02) * Math.sin(a), ay + (US.RP + 0.02) * Math.cos(a)]); }
  for (let k = 16; k >= 0; k--) { const a = -FACE_EDGE * 0.97 + 2 * FACE_EDGE * 0.97 * k / 16; lens.push([ax + (US.RP - 0.45) * Math.sin(a), ay + (US.RP - 0.45) * Math.cos(a)]); }
  PIX.fill(c, U.poly(lens), 'g3');
  // grip ridges, orientation bump (left), strain relief
  for (let k = 0; k < 3; k++) PIX.fill(c, R(ax - 1.4, ay - 8.2 - k * 1.2, 2.8, 0.35), 'g9');
  PIX.fill(c, R(ax - 2.05, ay - 4.4, 0.55, 0.9, 0.2), 'e2');
  FL(c, z, U.poly([[ax - 0.75, ay - 16.4], [ax + 0.75, ay - 16.4], [ax + 0.5, ay - 19.6], [ax - 0.5, ay - 19.6]]), 'g4', 'g2', 'g5', 1.2);
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// the cable: from the probe's strain relief up and over to the machine's port, hanging in a gentle curve
ROOM.cablePts = () => {
  const a = [PRB.ax, PRB.ay - 19.4], b = [-24, -126.1], cp = [-7, -118], pts = [];
  for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push([(1 - u) ** 2 * a[0] + 2 * u * (1 - u) * cp[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * cp[1] + u * u * b[1]]); }
  return pts;
};
ROOM.drawCable = (c, cam, o = {}) => {
  PIX.cam(c, cam); const z = cam.z, pts = ROOM.cablePts();
  K.pipe(c, pts, 0.85, 'g4', 'g6', 'g2');
  c.setTransform(1, 0, 0, 1, 0, 0);
  // a signal travelling along the cable (o.sig = 0..1 from probe to machine, or machine to probe with o.dir = −1)
  if (o.sig != null && o.sig >= 0 && o.sig <= 1) {
    const L = K.polyLen(pts), p = K.along(pts, (o.dir === -1 ? 1 - o.sig : o.sig) * L), s = K.S(cam, p[0], p[1]);
    FX.glowL(c, s[0], s[1], Math.max(3, 1.6 * z), ['c1', 'c2', 'c3'], 0.9, 1.3);
  }
};
// the sonographer's gloved right hand around the handle; forearm to the right, upper arm in a scrub sleeve
ROOM.drawHand = (c, cam) => {
  PIX.cam(c, cam); const z = cam.z, ax = PRB.ax, ay = PRB.ay;
  K.pipe(c, [[ax + 20.5, ay - 17.5], [ax + 34, ay - 46]], 4.6, 's1', 's2', 's0');                       // upper arm (under the sleeve)
  FL(c, z, U.poly([[ax + 21, ay - 23], [ax + 26.5, ay - 21], [ax + 40, ay - 50], [ax + 33, ay - 54]]), 'h1', 'h0', 'h2', 1.6);
  K.pipe(c, [[ax + 4.4, ay - 12.2], [ax + 13, ay - 14.6], [ax + 21, ay - 18.2]], 3.5, 's1', 's2', 's0');  // forearm
  // glove: cuff, back of the hand from the wrist to the knuckles at the handle's right edge
  FL(c, z, U.poly([[ax + 4.4, ay - 14.4], [ax + 6.4, ay - 14.2], [ax + 6.4, ay - 10.2], [ax + 4.4, ay - 10.4]]), 'ga', 'g8', 'gb', 1);
  FL(c, z, U.poly([[ax + 1.2, ay - 13.2], [ax + 3.2, ay - 14.3], [ax + 5.0, ay - 14.0], [ax + 5.1, ay - 10.4], [ax + 3.3, ay - 7.6], [ax + 1.2, ay - 7.4]]), 'gb', 'g9', 'w', 1.4);
  // four fingers wrapped across the front of the handle; fingertips round its left edge
  for (let k = 0; k < 4; k++) {
    const y = ay - 12.6 + k * 1.3;
    FL(c, z, R(ax - 1.95, y, 3.6, 1.2, 0.55), 'gb', 'g9', 'w', 1);
  }
  // thumb down the right side, pressing toward the head
  K.pipe(c, [[ax + 2.5, ay - 8.6], [ax + 2.3, ay - 6.4], [ax + 2.0, ay - 5.3]], 1.1, 'gb', 'w', 'g9');
  c.setTransform(1, 0, 0, 1, 0, 0);
};
// everything in the room, back to front. o: {press, gel, cut (cutaway alpha), screen (opts for the monitor), t}
ROOM.draw = (c, cam, t, o = {}) => {
  ROOM.drawWall(c, cam);
  ROOM.drawMachine(c, cam, t, o.screen || {});
  ROOM.drawBed(c, cam);
  ROOM.drawPatient(c, cam, t, o);
  if (o.cut > 0) ROOM.drawCutaway(c, cam, t, o.cut);
  ROOM.drawCable(c, cam, o);
  ROOM.drawProbe(c, cam, t, o);
  if (o.hand !== false) ROOM.drawHand(c, cam);
};
// the fan the probe images, cut away under the skin (flat illustration of the same slice), with a cyan outline
ROOM.drawCutaway = (c, cam, t, a = 1) => {
  US.drawAnatomy(c, cam, PRB.ax, PRB.ay, 1, { t, a });
  if (a < 0.5) return;
  const S = (r, p) => US.toScreen(cam, PRB.ax, PRB.ay, 1, r * Math.sin(p), r * Math.cos(p) - US.RP), r0 = US.RP, r1 = US.RP + US.DEPTH;
  c.save(); c.globalAlpha *= U.clamp((a - 0.5) * 2);
  for (const p of [-US.HALF, US.HALF]) { const A = S(r0, p), B = S(r1, p); PIX.bline(c, A[0], A[1], B[0], B[1], 'c2', 1); }
  let prev = null; for (let k = 0; k <= 40; k++) { const p = -US.HALF + 2 * US.HALF * k / 40, q = S(r1, p); if (prev) PIX.bline(c, prev[0], prev[1], q[0], q[1], 'c2', 1); prev = q; }
  c.restore();
};
})();
