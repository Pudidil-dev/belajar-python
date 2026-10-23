// S07 (39–47 s) — from signal to image. On the receiver trace: arrival time is depth (sound goes down and back at
// 1540 m/s, so 13 µs per cm), and the size of each echo becomes a brightness: the scan line as a column of gray pixels.
// Then that column takes its place in the fan on the monitor, and line after line fills the fan (each line is one pulse
// sent and its echoes heard), faster and faster, while the camera pulls back to the opening shot.
(() => {
const S = SC.s07_build = {}, R6 = SC.s06_receive, PX = R6.PX, LINE = 28;
// the scan line's direction and middle, on the monitor
const PH = US.phi(LINE);
const MID = ROOM.fanW((US.RP + 6) * Math.sin(PH), (US.RP + 6) * Math.cos(PH) - US.RP);
S.CAM0 = { x: MID[0] + 2.0, y: MID[1] + 1.0, z: 19 };
S.cam = lt => K.zoomPath(S.CAM0, ROOM.HOOK, MO.k75(U.clamp((lt - 3.35) / 4.3)));
// acquisition order: lines 0 → 95, accelerating; line i is acquired at local time TL(i)
const B0 = 3.55, B1 = 7.35;
S.TL = i => i === LINE ? 3.0 : B0 + (B1 - B0) * Math.pow(i / (US.NL - 1), 1 / 1.9);
S.nAt = lt => { let n = 0; for (let i = 0; i < US.NL; i++) if (i !== LINE && S.TL(i) <= lt) n++; return n; };
S.frames = (lt, t) => {
  if (lt >= 7.5) return US.sweepFrames(t, 0.5);
  const out = new Array(US.NL);
  for (let i = 0; i < US.NL; i++) out[i] = S.TL(i) <= lt ? US.frame(US.q30(39 + S.TL(i))) : null;
  return out;
};
// the gray column beside the trace: each depth's brightness from the echo there
const GX = 236, GW = 12;
S.column = (c, a) => {
  if (a <= 0) return;
  const L = R6.line(), B = L.B, y0 = PX.ty0, y1 = PX.ty1;
  for (let y = y0; y < y1; y++) {
    const q = (y - y0) / (y1 - y0); if (q > a) break;
    const j = Math.min(US.NS - 1, Math.floor(q * US.NS));
    for (let x = GX; x < GX + GW; x++) { const g = US.grayRGB(B[j], x, y); c.fillStyle = `rgb(${g[0]},${g[1]},${g[2]})`; c.fillRect(x, y, 1, 1); }
  }
  PIX.rect(c, GX - 1, y0 - 1, GW + 2, 1, 'g5'); PIX.rect(c, GX - 1, y1, GW + 2, 1, 'g5');
};
S.panel = (c, lt) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PIX.P.n0; c.fillRect(0, 0, PIX.W, PIX.H); c.restore();
  R6.drawScope(c, lt + 8, 156);
  R6.notes(c, lt + 8, 8.3);
  // time axis (µs) on the left; depth (cm) beside it: the same ticks
  const ax = U.clamp((lt - 0.35) / 0.3);
  if (ax > 0) {
    c.save(); c.globalAlpha *= ax;
    for (const [us, d] of [[0, 0], [65, 5], [130, 10]]) {
      const y = Math.round(R6.yOfUs(us));
      PIX.rect(c, PX.x0 + 4, y, 8, 1, 'g8');
      PIX.text(c, us + ' µs', PX.x0 + 14, y - 3, 'c3');
      PIX.text(c, d + ' cm', 146, y - 3, 'w');
    }
    c.restore();
  }
  // the skull echo: its time and its depth
  const ys = Math.round(R6.yOfUs(13 * 5.41));
  CAP.note(c, lt, { x: PX.x0 + 6, y: ys - 3, text: '70 µs', t0: 0.9, t1: 99, col: 'c4', box: true });
  CAP.note(c, lt, { x: 146, y: ys - 3, text: '5.4 cm', t0: 1.05, t1: 99, col: 'w', box: true });
  if (lt > 0.9) for (let x = PX.x0 + 40; x < 144; x += 3) if (lt > 0.9 + (x - PX.x0 - 40) / 400) PIX.rect(c, x, ys, 2, 1, 'g7');
  CAP.note(c, lt, { x: 26, y: 449, text: 'DEPTH = 1540 m/s × TIME ÷ 2', t0: 1.2, t1: 99, col: 'g9', box: true });
  // echo strength → brightness
  S.column(c, U.clamp((lt - 1.7) / 0.6));
  CAP.note(c, lt, { x: 232, y: 100, text: 'ECHO', t0: 1.7, t1: 99, col: 'w', align: 'right', box: true });
  CAP.note(c, lt, { x: 232, y: 111, text: 'INTENSITY', t0: 1.8, t1: 99, col: 'w', align: 'right', box: true });
  CAP.note(c, lt, { ax: GX - 1, ay: ys, x: 232, y: ys + 14, text: 'BRIGHT', t0: 2.2, t1: 99, col: 'w', lineCol: 'g6', align: 'right', box: true });
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 39 + lt;
  const panel = cc => S.panel(cc, lt);
  const fan = cc => {
    const cam = S.cam(lt), fr = S.frames(lt, t);
    ROOM.drawWall(cc, cam); ROOM.drawMachine(cc, cam, t, { fr, sweep: false, blank: PIX.hex(PIX.P.k) });
    // the newest line, bright, and the fan's outline while it is still mostly empty
    const n = S.nAt(lt), clip = ROOM.screenRect(cam);
    if (lt < 7.5) {
      const edge = U.clamp(1 - (lt - 6.6) / 0.6);
      if (edge > 0) {
        const P2 = (r, p) => US.toScreen(cam, ROOM.FAN.ax, ROOM.FAN.ay, ROOM.FAN.k, r * Math.sin(p), r * Math.cos(p) - US.RP), r0 = US.RP, r1 = US.RP + US.DEPTH;
        cc.save(); cc.globalAlpha *= edge;
        for (const p of [-US.HALF, US.HALF]) { const A = P2(r0, p), B = P2(r1, p); PIX.bline(cc, A[0], A[1], B[0], B[1], 'c1', 1); }
        for (const r of [r0, r1]) { let q = null; for (let k = 0; k <= 48; k++) { const p = -US.HALF + 2 * US.HALF * k / 48, w = P2(r, p); if (q) PIX.bline(cc, q[0], q[1], w[0], w[1], 'c1', 1); q = w; } }
        cc.restore();
      }
      const s = lt < B0 ? LINE / US.NL : (n + 0.5) / US.NL;
      ROOM.sweepLine(cc, cam, s, clip);
    } else ROOM.sweepLine(cc, cam, fr.s, clip);
  };
  const dz = U.clamp((lt - 3.0) / 0.35);
  if (dz <= 0) panel(c); else if (dz >= 1) fan(c); else window.dissolve(c, panel, fan, dz);
  CAP.scene(c, lt, { title: 'TIME OF FLIGHT', ctx: ['THE MACHINE CALCULATES', 'DEPTH FROM ECHO TIME.'], t0: 0.1, t1: 3.2 });
  CAP.scene(c, lt, { title: 'IMAGE RECONSTRUCTION', ctx: 'LINE BY LINE, 30 TIMES A SECOND', t0: 3.45, t1: 7.6 });
  if (lt > 3.6 && lt < 7.85) {
    const n = Math.min(US.NL, S.nAt(lt) + 1), s = `SCAN LINE ${String(n).padStart(2, ' ')} / ${US.NL}`;
    c.save(); c.globalAlpha *= lt < 7.6 ? 1 : 1 - (lt - 7.6) / 0.25;
    PIX.rect(c, 135 - PIX.textWidth(s) / 2 - 3, 464, PIX.textWidth(s) + 6, 11, 'k'); PIX.text(c, s, 135, 466, 'c4', { align: 'center' });
    c.restore();
  }
};
S.cues = () => {
  const out = [[0.4, 'tick', 0.6], [0.9, 'chirp', 0.8], [1.7, 'build', 0.7], [3.0, 'tone', 0.8]];
  for (let i = 0; i < US.NL; i++) if (i !== LINE && i % 2 === 0) out.push([S.TL(i), 'line', 0.35 + 0.3 * (i / US.NL), (i % 4 ? 0.3 : -0.3), i]);
  out.push([7.5, 'resolve', 0.9]);
  return out;
};
})();
