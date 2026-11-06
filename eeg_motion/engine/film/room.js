// ============================================================================
// ROOM — the recording: an EEG monitor with eight scrolling channels on a desk,
// the amplifier box, and the patient in profile (facing right, so we see the
// left-hemisphere electrodes Fp1 F3 C3 P3 O1, F7 T3 T5 and the midline Fz Cz Pz),
// leads gathered behind the neck. When the camera comes close to the back of the
// head a round cutaway opens through scalp, skull, fluid and cortex; later the
// brain itself shows through the head for the alpha rhythm. A clinician appears
// only from behind. World units = pixels of the 1080x1920 frame at zoom 1.
// ============================================================================
(() => {
  const { lid, alphaEnv, highlight, EV } = TL;
  const TAU = Math.PI * 2;
  const R = window.ROOM = {};
  // ---------------------------------------------------------------- layout
  const MON = { x0: 170, y0: 250, x1: 1010, y1: 790, sx0: 204, sy0: 284, sx1: 976, sy1: 756 };   // bezel and screen
  const ROWS = 8, ROW0 = MON.sy0 + 70, ROWH = (MON.sy1 - MON.sy0 - 100) / (ROWS - 1);
  const TX0 = MON.sx0 + 46, TX1 = MON.sx1 - 18;            // trace window
  const SPEED = (TX1 - TX0) / 10;                          // 10 s of EEG across the screen (units per second)
  const GAIN = 0.62;                                       // units per microvolt on the monitor
  R.MON = MON; R.rowY = i => ROW0 + i * ROWH; R.TX0 = TX0; R.TX1 = TX1;
  const HEAD = { x: 330, y: 1238, s: 1.3, rot: -0.12 };     // the patient's head (local units -> world)
  R.HEAD = HEAD;
  const BOX = { x0: 812, y0: 1268, x1: 990, y1: 1350 };     // the amplifier (headbox) on its arm
  R.BOX = BOX;
  // local head point -> world
  const hw = (x, y) => { const c = Math.cos(HEAD.rot), s = Math.sin(HEAD.rot); return [HEAD.x + (x * c - y * s) * HEAD.s, HEAD.y + (x * s + y * c) * HEAD.s]; };
  R.hw = hw;
  // the head profile (local units, facing right, head height ~250)
  const OUT = [[-10, -128], [40, -121], [78, -97], [96, -63], [101, -37], [95, -24], [103, -9], [118, 7], [104, 15], [104, 26], [99, 33], [104, 40], [98, 50],
    [97, 62], [88, 78], [60, 86], [36, 92], [34, 130], [32, 182], [-64, 182], [-66, 130], [-74, 86], [-97, 42], [-108, -6], [-103, -60], [-74, -108]];
  const HAIR = [[84, -90], [76, -104], [40, -126], [-10, -133], [-76, -113], [-107, -62], [-113, -6], [-101, 44], [-80, 78], [-70, 60], [-62, 26], [-48, -10], [-22, -38], [16, -62], [52, -74]];
  // electrodes (local), simplified 10–20 positions seen from the left
  const ELEC = { Fp1: [86, -56], F7: [64, -40], F3: [52, -92], C3: [-6, -104], T3: [-12, -50], P3: [-58, -88], T5: [-62, -30], O1: [-90, -38], Fz: [44, -117], Cz: [-10, -127], Pz: [-68, -109] };
  R.ELEC = ELEC;
  const ELEC_ORDER = ['Fp1', 'F7', 'Fz', 'F3', 'C3', 'Cz', 'T3', 'P3', 'Pz', 'T5', 'O1'];
  R.ELEC_ORDER = ELEC_ORDER;
  const NAPE = [-82, 98];
  R.O1 = () => hw(...ELEC.O1);
  // the cutaway: centred near O1; layers are concentric arcs about the head centre
  const CC = [-4, -6], CUTC = [-78, -30];
  R.diveLocal = (() => { const a = Math.atan2(CUTC[1] - CC[1], CUTC[0] - CC[0]); return [CC[0] + Math.cos(a) * 75, CC[1] + Math.sin(a) * 75]; })();
  R.dive = () => hw(...R.diveLocal);
  // ---------------------------------------------------------------- background (navy, parallax panels, drifting motes)
  R.background = (c, cam, t) => {
    c.fillStyle = COL.bg; c.fillRect(0, 0, STAGE.W, STAGE.H);
    CAM.layer(c, cam, 0.45, c2 => {
      const shapes = [[60, 120, 420, 520, COL.bg2], [620, 40, 520, 380, COL.bg2], [-120, 900, 360, 760, COL.bg2], [760, 1500, 520, 600, COL.bg2], [300, 1650, 380, 420, D.mix(COL.bg2, COL.bg, 0.4)]];
      for (const [x, y, w, h, col] of shapes) { c2.fillStyle = col; c2.beginPath(); c2.roundRect(x, y, w, h, 60); c2.fill(); }
      c2.fillStyle = D.mix(COL.bg2, COL.bg3, 0.3); c2.beginPath(); c2.arc(880, 980, 230, 0, TAU); c2.fill();
    });
    CAM.layer(c, cam, 0.75, c2 => {
      for (let i = 0; i < 46; i++) {
        const x = (U.hash(i, 3) * 1400 - 160) + 18 * D.wob(t, 1 + (i % 3), i), y = (U.hash(i, 5) * 2300 - 190) + 22 * D.wob(t, 2 + (i % 2), i * 1.7);
        c2.fillStyle = D.rgba(i % 4 ? COL.lavHi : COL.cyanHi, 0.18 + 0.12 * (i % 3)); c2.beginPath(); c2.arc(x, y, 2 + (i % 3), 0, TAU); c2.fill();
      }
    });
  };
  // ---------------------------------------------------------------- the monitor and its traces
  function trace(c, cam, ci, t, o) {
    const y0 = R.rowY(ci), ch = SIG.CHS[ci], hl = o.hl || 0, z = cam.z;
    const [vx0] = CAM.toWorld(cam, 0, 0), [vx1] = CAM.toWorld(cam, STAGE.W, 0);
    const xa = Math.max(TX0, vx0 - 10), xb = Math.min(TX1, vx1 + 10); if (xb <= xa) return;
    const step = Math.max(0.5, 2.2 / z), p = new Path2D();
    for (let x = xa, k = 0; x <= xb + step; x += step, k++) { const xx = Math.min(x, xb), v = SIG.eeg(ci, t - (TX1 - xx) / SPEED) * GAIN * (o.gain || 1); k ? p.lineTo(xx, y0 - v) : p.moveTo(xx, y0 - v); }
    const col = ch.post ? COL.cyan : COL.green, px = 2.8 + 4.2 * U.clamp((z - 1) / 4) + 2.2 * hl, w = px / z;
    const dim = o.dim === undefined ? 1 : o.dim;
    if (hl > 0) { c.save(); c.globalAlpha = 0.28 * hl; c.strokeStyle = col; c.lineWidth = w * 4.5; c.lineJoin = 'round'; c.stroke(p); c.restore(); }
    c.save(); c.globalAlpha = dim * (0.78 + 0.22 * hl); c.strokeStyle = hl > 0.5 ? D.mix(col, '#FFFFFF', 0.25) : col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(p); c.restore();
  }
  R.monitor = (c, cam, t, o = {}) => {
    // stand, desk, bezel, screen
    D.flat(c, D.rr(560, 780, 60, 100, 12), COL.eblue2, COL.eblue, COL.eblue3, 6, 2);
    D.flat(c, D.ellipse(590, 884, 150, 16), COL.eblue2, COL.eblue, COL.eblue3, 4, 2);
    D.flat(c, D.rr(70, 890, 1010, 44, 22), D.mix(COL.teal, COL.eblue, 0.55), D.mix(COL.teal, COL.eblue, 0.8), D.mix(COL.teal, COL.tealHi, 0.25), 7, 3);
    D.flat(c, D.rr(MON.x0, MON.y0, MON.x1 - MON.x0, MON.y1 - MON.y0, 30), COL.eblue2, COL.eblue, COL.eblue3, 10, 3);
    c.fillStyle = COL.panel; c.beginPath(); c.roundRect(MON.sx0, MON.sy0, MON.sx1 - MON.sx0, MON.sy1 - MON.sy0, 14); c.fill();
    c.save(); c.beginPath(); c.roundRect(MON.sx0, MON.sy0, MON.sx1 - MON.sx0, MON.sy1 - MON.sy0, 14); c.clip();
    // header strip with status dots (no text), a scrolling 1-second grid, the scale mark
    c.fillStyle = D.mix(COL.panel, COL.eblue, 0.5); c.fillRect(MON.sx0, MON.sy0, MON.sx1 - MON.sx0, 34);
    for (let i = 0; i < 5; i++) { c.fillStyle = i === 0 ? COL.green : i === 1 ? COL.cyan : D.rgba(COL.sub, 0.6); c.beginPath(); c.arc(MON.sx0 + 26 + i * 22, MON.sy0 + 17, 5, 0, TAU); c.fill(); }
    c.fillStyle = D.rgba(COL.sub, 0.35); c.fillRect(MON.sx1 - 150, MON.sy0 + 12, 120, 10);
    const off = (TL.per(t) * SPEED) % SPEED;
    c.strokeStyle = D.rgba(COL.cyan, 0.08); c.lineWidth = 1.2;
    for (let x = TX1 - off; x > TX0 - 1; x -= SPEED) { c.beginPath(); c.moveTo(x, MON.sy0 + 40); c.lineTo(x, MON.sy1 - 10); c.stroke(); }
    for (let x = TX1 - off; x > TX0 - 1; x -= SPEED / 5) { c.fillStyle = D.rgba(COL.cyan, 0.08); c.fillRect(x - 0.6, MON.sy1 - 18, 1.2, 8); }
    c.strokeStyle = D.rgba(COL.sub, 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(TX1 - 10, MON.sy1 - 60); c.lineTo(TX1 - 10, MON.sy1 - 30); c.lineTo(TX1 - 40, MON.sy1 - 30); c.stroke();
    // event markers (no text): a thin dashed line where the eyes closed (green) and opened (amber), scrolling with the data
    for (const [tm, col] of [[EV.eyesShut, COL.green], [EV.eyesOpen, COL.amber]]) {
      const age = TL.per(t - tm); if (age > 10.2) continue; const x = TX1 - age * SPEED; if (x < TX0) continue;
      c.save(); c.strokeStyle = D.rgba(col, 0.75); c.lineWidth = 2.4; c.setLineDash([9, 7]); c.beginPath(); c.moveTo(x, MON.sy0 + 44); c.lineTo(x, MON.sy1 - 14); c.stroke(); c.restore();
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 9, MON.sy0 + 40); c.lineTo(x + 9, MON.sy0 + 40); c.lineTo(x, MON.sy0 + 52); c.closePath(); c.fill();
    }
    // channel markers (colour dots: cyan = posterior, green = the rest) and traces
    const H = o.hl === undefined ? highlight(t) : o.hl;
    for (let i = 0; i < ROWS; i++) {
      const ch = SIG.CHS[i], y = R.rowY(i), isO1 = ch.id === 'O1', post = ch.post;
      const focusDim = o.postFocus ? (post ? 1 : 1 - 0.55 * o.postFocus) : 1;
      const dim = (isO1 ? 1 : 1 - 0.78 * H) * focusDim;
      c.fillStyle = D.rgba(post ? COL.cyan : COL.green, 0.85 * dim); c.beginPath(); c.arc(MON.sx0 + 24, y, 6, 0, TAU); c.fill();
      c.fillStyle = D.rgba(COL.sub, 0.25 * dim); c.fillRect(TX0, y - 0.6, TX1 - TX0, 1.2);
      trace(c, cam, i, t, { hl: isO1 ? H : (o.postFocus && post ? 0.5 * o.postFocus : 0), dim });
    }
    c.restore();
    // a soft reflection along the top of the screen
    c.fillStyle = 'rgba(255,255,255,0.025)'; c.beginPath(); c.roundRect(MON.sx0 + 6, MON.sy0 + 4, MON.sx1 - MON.sx0 - 12, 70, 10); c.fill();
  };
  // screen point of the O1 trace's newest sample (for cameras / captions)
  R.o1Row = () => R.rowY(3);
  // ---------------------------------------------------------------- the amplifier box (headbox) on its arm
  R.box = (c, t) => {
    D.flat(c, D.rr(BOX.x0 + 70, BOX.y1 - 6, 34, 420, 14), COL.eblue, D.mix(COL.eblue, COL.deep, 0.5), COL.eblue2, 6, 2);
    D.flat(c, D.rr(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0, 16), COL.eblue2, COL.eblue, COL.eblue3, 8, 3);
    c.fillStyle = COL.deep; c.beginPath(); c.roundRect(BOX.x0 + 16, BOX.y0 + 18, 96, 46, 8); c.fill();
    for (let i = 0; i < 12; i++) { const x = BOX.x0 + 26 + (i % 6) * 15, y = BOX.y0 + 31 + Math.floor(i / 6) * 20; c.fillStyle = COL.silverDk; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); }
    const blink = 0.5 + 0.5 * Math.sin(TAU * 96 * TL.per(t) / 55);   // the activity LED blinks on the beat
    D.glow(c, BOX.x1 - 32, BOX.y0 + 30, 22, COL.green, 0.5 + 0.5 * blink); c.fillStyle = COL.green; c.beginPath(); c.arc(BOX.x1 - 32, BOX.y0 + 30, 6, 0, TAU); c.fill();
    c.fillStyle = COL.cyan; c.beginPath(); c.arc(BOX.x1 - 32, BOX.y0 + 54, 5, 0, TAU); c.fill();
    // cable up to the desk
    D.line(c, [[BOX.x1 - 20, BOX.y0 + 4], [BOX.x1 + 20, BOX.y0 - 160], [BOX.x1 - 10, 960], [BOX.x1 - 70, 925]].map(p => p), COL.eblue3, 9);
  };
  // ---------------------------------------------------------------- the patient
  const lpath = pts => D.smooth(pts.map(p => hw(p[0], p[1])), true, 0.55);
  function body(c, t) {
    // chair: headrest, backrest, armrest (seams as material detail)
    const head = D.smooth([hw(-112, -150), hw(-150, -110), hw(-158, 40), hw(-140, 150), hw(-110, 160), hw(-104, 40), hw(-108, -100)], true, 0.5);
    D.flat(c, head, COL.chair, COL.chairSh, COL.chairHi, 8, 3);
    const back = D.smooth([hw(-150, 150), hw(-196, 260), hw(-206, 560), hw(-120, 600), hw(-110, 300)], true, 0.45);
    D.flat(c, back, COL.chair, COL.chairSh, COL.chairHi, 10, 3);
    D.stroke(c, D.smooth([hw(-170, 230), hw(-182, 400), hw(-176, 560)], false, 0.5), COL.chairSh, 3, 0.9);
    // torso in a sweater: chest, belly, back against the chair
    const torso = D.smooth([hw(-66, 176), hw(-118, 214), hw(-148, 300), hw(-150, 470), hw(-120, 600), hw(150, 600), hw(150, 470), hw(118, 330), hw(84, 236), hw(34, 180)], true, 0.5);
    D.flat(c, torso, COL.sweater, COL.sweaterSh, COL.sweaterHi, 12, 4);
    const collar = D.smooth([hw(-60, 180), hw(-16, 204), hw(32, 184)], false, 0.5);
    D.stroke(c, collar, COL.sweaterSh, 9 * HEAD.s); D.stroke(c, collar, COL.sweaterHi, 3 * HEAD.s, 0.6);
    for (let k = -3; k <= 3; k++) { const a = hw(-16 + k * 12, 194 + Math.abs(k) * 1.5), b = hw(-16 + k * 12, 205 + Math.abs(k) * 1.5); D.line(c, [a, b], COL.sweaterSh, 2.4, 0.8); }
    // armrest
    D.flat(c, D.smooth([hw(-70, 470), hw(250, 486), hw(258, 512), hw(-60, 512)], true, 0.4), COL.chairHi, COL.chairSh, D.mix(COL.chairHi, COL.white, 0.12), 6, 2);
    // the near arm: shoulder, upper arm down, forearm resting forward on the armrest, relaxed hand
    const arm = D.smooth([hw(-70, 222), hw(-10, 214), hw(12, 300), hw(4, 420), hw(60, 452), hw(170, 456), hw(176, 486), hw(40, 490), hw(-40, 470), hw(-62, 380), hw(-76, 280)], true, 0.5);
    D.flat(c, arm, COL.sweater, COL.sweaterSh, COL.sweaterHi, 10, 3);
    D.stroke(c, D.smooth([hw(-30, 300), hw(-28, 400), hw(0, 450)], false, 0.5), COL.sweaterSh, 3, 0.8);   // sleeve fold
    const hand = D.smooth([hw(168, 452), hw(212, 454), hw(236, 468), hw(226, 486), hw(178, 488)], true, 0.5);
    D.flat(c, hand, COL.skin, COL.skinSh, COL.skinHi, 6, 2);
    D.stroke(c, D.smooth([hw(200, 470), hw(222, 474)], false, 0.5), COL.skinSh, 2, 0.9);
  }
  function headShape(c, t, o) {
    const head = lpath(OUT);
    D.flat(c, head, COL.skin, COL.skinSh, COL.skinHi, 9, 3);
    // neck shadow under the jaw
    c.save(); c.clip(head); D.fill(c, D.smooth([hw(28, 92), hw(70, 88), hw(40, 120), hw(-40, 120), hw(-60, 96)], true, 0.5), COL.skinSh, 0.55); c.restore();
    // hair (grouped strands)
    const hair = lpath(HAIR);
    D.flat(c, hair, COL.hair, COL.hairDk, COL.hairHi, 7, 3);
    c.save(); c.clip(hair);
    for (let k = 0; k < 9; k++) { const a0 = -2.3 + k * 0.28, pts = []; for (let j = 0; j <= 6; j++) { const a = a0 + j * 0.16, rr = 104 - j * 3 + (k % 2) * 4; pts.push(hw(-6 + Math.cos(a) * rr, -8 + Math.sin(a) * rr * 1.12)); } D.stroke(c, D.smooth(pts, false, 0.5), COL.hairHi, 2.6, 0.55); }
    c.restore();
    // ear with an inner fold
    D.flat(c, lpath([[-8, -18], [4, -8], [6, 12], [-4, 28], [-18, 26], [-26, 8], [-22, -12]]), COL.skin, COL.skinSh, COL.skinHi, 5, 2);
    D.fill(c, lpath([[-10, -8], [-2, 4], [-6, 16], [-14, 10], [-14, -2]]), COL.skinSh, 0.85);
    // eyebrow and the eye (the only facial detail): the upper lid follows the eyes-closed timeline
    D.stroke(c, D.smooth([hw(70, -38), hw(84, -42), hw(96, -38)], false, 0.5), COL.hair, 4.2 * HEAD.s * 0.8);
    const L = o.lid === undefined ? lid(t) : o.lid, ex = 82, ey = -22, es = 1.3;
    const open = 1 - L;
    if (open > 0.04) {
      const eye = lpath([[ex - 9 * es, ey], [ex + 3 * es, ey - 5.5 * open * es], [ex + 10 * es, ey - 1], [ex + 2 * es, ey + 3.5 * es]]);
      D.fill(c, eye, COL.white); c.save(); c.clip(eye); D.fill(c, D.circle(...hw(ex + 4.5 * es, ey - 0.5), 3.6 * HEAD.s * es), '#3B2A26'); D.fill(c, D.circle(...hw(ex + 5.5 * es, ey - 1.6 * es), 1.1 * HEAD.s * es), '#FFFFFF', 0.9); c.restore();
    }
    // upper lid line (and lashes) — a calm curve when closed
    const lidY = ey - 5.5 * open * es;
    D.stroke(c, D.smooth([hw(ex - 10 * es, ey - 1), hw(ex + 1 * es, lidY + (L > 0.5 ? 3.5 * L * es : -0.5)), hw(ex + 10 * es, ey - 1)], false, 0.5), COL.skinDk, 2.8 * HEAD.s * 0.8);
    if (L > 0.6) for (let k = 0; k < 3; k++) { const x = ex - 4 * es + k * 5 * es, a = hw(x, ey + 2.2 * L * es), b = hw(x - 1.5, ey + 5.2 * L * es); D.line(c, [a, b], COL.hairDk, 1.7 * HEAD.s * 0.8, (L - 0.6) / 0.4); }
  }
  function electrodes(c, t, o) {
    // leads first: each electrode to the nape, then the bundle down to the box
    const nape = hw(...NAPE);
    for (const k of ELEC_ORDER) {
      const p = hw(...ELEC[k]), m = [(p[0] + nape[0]) / 2 - 30, (p[1] + nape[1]) / 2 + 10];
      const lead = new Path2D(); lead.moveTo(p[0], p[1]); lead.quadraticCurveTo(m[0], m[1], nape[0], nape[1]);
      D.stroke(c, lead, k === 'O1' && o.o1 ? D.mix(COL.silver, COL.cyan, o.o1) : COL.silverSh, 2.4, 0.95);
    }
    const bundle = new Path2D(); bundle.moveTo(nape[0], nape[1]); bundle.bezierCurveTo(nape[0] - 40, nape[1] + 160, 520, 1560, BOX.x0 + 20, BOX.y1 - 30);
    D.stroke(c, bundle, COL.silverDk, 10); D.stroke(c, bundle, COL.silverSh, 4, 0.8);
    // the cups, each on a dab of gel
    for (const k of ELEC_ORDER) {
      const p = hw(...ELEC[k]), r = 8.5 * HEAD.s * 0.85, pop = o.pop ? o.pop(k) : 1; if (pop <= 0) continue;
      const rr = r * pop;
      D.fill(c, D.circle(p[0] + 1, p[1] + 2, rr * 1.32), COL.gel, 0.45);
      D.flat(c, D.circle(p[0], p[1], rr), COL.silver, COL.silverSh, '#FFFFFF', rr * 0.32, rr * 0.12);
      D.fill(c, D.circle(p[0] + rr * 0.15, p[1] + rr * 0.15, rr * 0.38), COL.silverDk, 0.8);
      if (k === 'O1' && o.o1) D.glow(c, p[0], p[1], rr * 5, COL.cyan, o.o1);
      const gl = o.glint ? o.glint(k) : 0;
      if (gl > 0) { D.glow(c, p[0], p[1], rr * 4.5, COL.cyan, gl); D.stroke(c, D.circle(p[0], p[1], rr * (1.25 + 1.1 * (1 - gl))), COL.cyanHi, 2.4, gl); }
      if (o.gel > 0) D.stroke(c, D.circle(p[0] + 1, p[1] + 2, rr * 1.32), COL.gel, 2.2, o.gel);
    }
  }
  // the round cutaway through the layers under O1 (k = opening 0..1)
  function cutaway(c, t, k) {
    if (k <= 0) return;
    const ctr = hw(...CUTC), rad = 52 * HEAD.s * MO.backOut(Math.min(1, k), 1.2), cc = hw(...CC);
    const R0 = 108 * HEAD.s;   // scalp surface radius about the head centre here
    c.save(); c.beginPath(); c.arc(ctr[0], ctr[1], rad, 0, TAU); c.clip();
    const ring = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(cc[0], cc[1], r, 0, TAU); c.fill(); };
    c.fillStyle = COL.bg; c.fillRect(ctr[0] - rad, ctr[1] - rad, rad * 2, rad * 2);
    ring(R0 + 6 * HEAD.s, COL.skinSh); ring(R0, COL.skin);
    ring(R0 - 9 * HEAD.s, COL.bone); ring(R0 - 12 * HEAD.s, COL.boneSh);
    // spongy middle of the skull (diploe)
    for (let i = 0; i < 26; i++) { const a = -2.9 + i * 0.07, rr = R0 - 15.5 * HEAD.s + (i % 2) * 1.5; D.fill(c, D.circle(cc[0] + Math.cos(a) * rr, cc[1] + Math.sin(a) * rr, 1.6 * HEAD.s), COL.boneDk, 0.6); }
    ring(R0 - 19 * HEAD.s, COL.bone); ring(R0 - 22 * HEAD.s, COL.csf);
    // cortex with gyri: the outer surface dips into sulci
    const cor = new Path2D();
    for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU, rr = R0 - 25 * HEAD.s - 4.5 * HEAD.s * Math.pow(0.5 + 0.5 * Math.cos(a * 22), 3); const x = cc[0] + Math.cos(a) * rr, y = cc[1] + Math.sin(a) * rr; i ? cor.lineTo(x, y) : cor.moveTo(x, y); }
    cor.closePath(); D.fill(c, cor, COL.coral);
    ring(R0 - 41 * HEAD.s, COL.coralSh); ring(R0 - 43 * HEAD.s, COL.wm);
    // a bright spot on the cortex right under O1: the patch the camera dives into
    const dv = R.dive(), pul = 0.5 + 0.5 * Math.sin(TAU * 96 * TL.per(t) / 55);
    D.glow(c, dv[0], dv[1], 24 * HEAD.s, COL.cyan, 0.6 + 0.4 * pul); D.fill(c, D.circle(dv[0], dv[1], 3.2 * HEAD.s), COL.cyanHi);
    c.restore();
    // rim of the cutaway (a clean light edge)
    D.stroke(c, D.circle(ctr[0], ctr[1], rad), COL.white, 3, 0.85);
  }
  // the brain showing through the head (alpha scene): lateral view with lobes; the occipital network pulses with alpha
  function brain(c, t, k, pulse) {
    if (k <= 0) return;
    const shape = lpath([[86, -50], [70, -96], [20, -120], [-40, -116], [-86, -84], [-100, -36], [-94, 4], [-70, 18], [-40, 12], [-10, 26], [30, 30], [60, 12], [84, -14]]);
    const cereb = lpath([[-88, 8], [-64, 22], [-40, 30], [-40, 46], [-70, 50], [-94, 32]]);
    c.save(); c.globalAlpha *= k;
    D.flat(c, cereb, COL.coralSh, COL.coralDk, COL.coral, 5, 2);
    D.flat(c, shape, COL.coral, COL.coralSh, COL.coralHi, 9, 3);
    c.save(); c.clip(shape);
    const sulci = [[[38, -112], [18, -70], [26, -30]], [[-6, -6], [30, -10], [64, -24]], [[-30, -112], [-40, -70], [-30, -40]], [[60, -84], [70, -60]], [[-70, -80], [-60, -50], [-76, -20]]];
    for (const s of sulci) D.stroke(c, D.smooth(s.map(p => hw(p[0], p[1])), false, 0.5), COL.coralDk, 3.2, 0.7);
    // the occipital lobe: a lavender network whose nodes flash together with the alpha cycles
    const oc = [-76, -40];
    D.fill(c, D.ellipse(...hw(...oc), 34 * HEAD.s, 46 * HEAD.s, HEAD.rot), D.mix(COL.coral, COL.lav, 0.55), 0.85);
    const nodes = [[-66, -72], [-84, -58], [-92, -34], [-80, -14], [-64, -30], [-72, -50], [-58, -54], [-88, -10]];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 26) D.line(c, [hw(...a), hw(...b)], COL.lavHi, 2.2, 0.8); }
    for (const n of nodes) { const p = hw(...n); D.fill(c, D.circle(p[0], p[1], 5.5), COL.lav); if (pulse > 0) D.spark(c, p[0], p[1], 3.5, COL.cyan, pulse); }
    c.restore(); c.restore();
  }
  R.patient = (c, t, o = {}) => {
    body(c, t);
    headShape(c, t, o);
    if (o.brain) { const hs = lpath(OUT); c.save(); c.clip(hs); D.fill(c, hs, D.mix(COL.skin, COL.bg, 0.15), o.brain * 0.35); c.restore(); brain(c, t, o.brain, o.pulse || 0); }
    electrodes(c, t, o);
    cutaway(c, t, o.cut || 0);
    if (o.cut > 0) { const p = hw(...ELEC.O1), r = 8.5 * HEAD.s * 0.85; D.fill(c, D.circle(p[0] + 1, p[1] + 2, r * 1.32), COL.gel, 0.6); D.flat(c, D.circle(p[0], p[1], r), COL.silver, COL.silverSh, '#FFFFFF', r * 0.32, r * 0.12); D.fill(c, D.circle(p[0] + r * 0.15, p[1] + r * 0.15, r * 0.38), COL.silverDk, 0.8); }
  };
  // ---------------------------------------------------------------- the clinician, seen only from behind (over the shoulder)
  R.clinician = (c, t, k) => {
    if (k <= 0) return;
    const dx = (1 - MO.cubicOut(k)) * 360, X = 868 + dx, Y = 1065;
    c.save();
    const coat = D.smooth([[X - 210, Y + 520], [X - 200, Y + 210], [X - 150, Y + 120], [X - 60, Y + 92], [X + 60, Y + 92], [X + 160, Y + 125], [X + 215, Y + 230], [X + 230, Y + 520]], true, 0.5);
    D.flat(c, coat, COL.white, COL.silverSh, '#FFFFFF', 12, 4);
    D.stroke(c, D.smooth([[X - 4, Y + 100], [X, Y + 300], [X + 6, Y + 520]], false, 0.5), COL.silverSh, 3, 0.9);           // back seam
    D.flat(c, D.smooth([[X - 70, Y + 104], [X - 40, Y + 70], [X + 40, Y + 70], [X + 70, Y + 104], [X, Y + 128]], true, 0.5), COL.teal, D.mix(COL.teal, COL.deep, 0.4), COL.tealHi, 5, 2);   // scrubs collar
    // the near arm raised toward the screen (reviewing the recording), sleeve and a hand with a stylus
    const arm = D.smooth([[X - 150, Y + 140], [X - 210, Y + 40], [X - 290, Y - 110], [X - 318, Y - 150], [X - 290, Y - 168], [X - 246, Y - 112], [X - 168, Y + 10], [X - 96, Y + 112]], true, 0.5);
    D.flat(c, arm, COL.white, COL.silverSh, '#FFFFFF', 10, 3);
    D.stroke(c, D.smooth([[X - 196, Y + 46], [X - 250, Y - 60]], false, 0.5), COL.silverSh, 3, 0.9);
    D.flat(c, D.smooth([[X - 318, Y - 150], [X - 336, Y - 182], [X - 314, Y - 198], [X - 286, Y - 172]], true, 0.5), COL.skin, COL.skinSh, COL.skinHi, 5, 2);
    D.stroke(c, D.smooth([[X - 326, Y - 188], [X - 372, Y - 246]], false), COL.eblue3, 6);
    D.flat(c, D.ellipse(X, Y + 14, 66, 78), COL.skinSh, COL.skinDk, COL.skin, 8, 3);                                       // neck/head from behind
    const hair = D.smooth([[X - 70, Y + 10], [X - 62, Y - 50], [X - 20, Y - 76], [X + 30, Y - 74], [X + 66, Y - 44], [X + 72, Y + 12], [X + 50, Y + 46], [X, Y + 56], [X - 50, Y + 44]], true, 0.5);
    D.flat(c, hair, COL.hair, COL.hairDk, COL.hairHi, 8, 3);
    for (let i = 0; i < 6; i++) D.stroke(c, D.smooth([[X - 50 + i * 20, Y - 60 + Math.abs(i - 2.5) * 6], [X - 46 + i * 19, Y - 10], [X - 44 + i * 18, Y + 36]], false, 0.5), COL.hairHi, 2.4, 0.5);
    c.restore();
  };
  // ---------------------------------------------------------------- the whole room
  R.draw = (c, cam, t, o = {}) => {
    R.background(c, cam, t);
    CAM.with(c, cam, c2 => {
      R.monitor(c2, cam, t, o);
      R.box(c2, t);
      R.patient(c2, t, o);
    });
    if (o.clin) CAM.layer(c, cam, 1.12, c2 => R.clinician(c2, t, o.clin));
  };
})();
