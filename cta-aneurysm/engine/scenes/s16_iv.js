// S16 INTRAVENOUS CONTRAST (60–64 s): the injector's syringe (violet: the film's colour code for iodinated contrast), the
// IV tubing and the patient's right forearm with the cannula in a vein. The plunger moves; the contrast runs down the
// tubing; the camera pushes in to a cutaway of the vein, where it leaves the cannula tip and mixes into the blood flowing
// toward the heart (to the left). An arm vein — no catheter goes anywhere near the head.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const camAt = t => { const q = MO.cubicInOut(clamp((t - 0.9) / 2.3)); return K.zoomPath({ x: -10, y: -70, z: 1.0 }, { x: 30, y: 64, z: 3.4 }, q); };
const TUB = [[-6, -206], [30, -200], [64, -170], [70, -110], [58, -40], [44, 14], [40, 30]];
const VEIN_Y = 64, VR = 9;
const cells = []; for (let k = 0; k < 40; k++) cells.push({ ph: h(k, 1), off: (h(k, 2) - 0.5) * 1.4, v: 46 + 14 * h(k, 3) });
const tubeFill = t => clamp((t - 0.35) / 1.3);                    // fraction of the tubing holding contrast
const veinFront = t => clamp((t - 1.65) / 2.0);                   // how far the contrast has spread from the tip (0..1)
SC['s16_iv'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    PIX.rect(c, -400, -500, 800, 1000, 'n0');
    // the forearm (skin), elbow to the left, wrist to the right
    const arm = new Path2D(); arm.moveTo(-260, 22); arm.quadraticCurveTo(0, 10, 250, 34); arm.lineTo(250, 104); arm.quadraticCurveTo(0, 122, -260, 112); arm.closePath();
    PIX.flat(c, arm, 's2', 's1', 's3', [0, 4], [0, -1]);
    // the vein under the skin, and the cutaway window that opens as the camera arrives
    const cut = MO.smooth(clamp((t - 1.5) / 0.7));
    PIX.line(c, -260, VEIN_Y, 250, VEIN_Y - 4, 's1', VR * 2 + 2);
    if (cut > 0) {
      c.save(); const win = new Path2D(); win.rect(-60, VEIN_Y - 22 * cut, 150, 44 * cut); c.clip(win);
      PIX.rect(c, -60, VEIN_Y - 22, 150, 44, 'p0');
      PIX.rect(c, -260, VEIN_Y - VR - 2, 520, VR * 2 + 4, 'p1'); PIX.rect(c, -260, VEIN_Y - VR, 520, VR * 2, 'd0');
      const f = veinFront(t);
      for (let x = -60; x < 90; x += 1) { const q = (40 - x) / 100; if (q < f * 1.1 && q > -0.1) { for (let y = -VR; y < VR; y++) if (K.BAY(x * 3, (VEIN_Y + y) * 3) < clamp((f * 1.1 - q) * 3)) PIX.rect(c, x, VEIN_Y + y, 1, 1, 'v0'); } }
      for (const e of cells) { const x = 90 - K.wrap(t * e.v + e.ph * 150, 150), y = VEIN_Y + e.off * VR * 0.8; c.fillStyle = P.d3; c.beginPath(); c.ellipse(x, y, 3.2, 2.2, 0, 0, TAU); c.fill(); c.fillStyle = P.d2; c.fillRect(Math.round(x - 1), Math.round(y), 2, 1); }
      c.restore();
      c.setTransform(1, 0, 0, 1, 0, 0);
      for (let k = 0; k < 26; k++) { const age = t - 1.7 - k * 0.07; if (age < 0) continue; const x = 36 - age * 34 - h(k, 7) * 8, y = VEIN_Y + (h(k, 8) - 0.5) * VR * 1.4; if (x < -60) continue; const [sx, sy] = K.S(cam, x, y); FLOW.mol(c, sx, sy, k + t * 3, cam.z > 2.5 ? 1 : 0.6); }
      K.cam(c, cam);
    }
    // the cannula: tape wings, hub, the catheter going in at a shallow angle into the vein
    PIX.rect(c, 22, 20, 36, 10, 'q5'); PIX.rect(c, 22, 20, 36, 2, 'q6'); PIX.rect(c, 34, 14, 12, 10, 'q4');
    PIX.line(c, 40, 26, 30 - 0, VEIN_Y - 2, 'g9', 1.6);
    // the tubing (clear) with the violet column moving down it
    const tl = BODY.len(TUB), f = tubeFill(t);
    c.save(); c.strokeStyle = P.g8; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); TUB.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore();
    if (f > 0) { const seg = []; for (let d = 0; d <= tl * f; d += 2) seg.push(BODY.at(TUB, d)); if (seg.length > 1) { c.save(); c.strokeStyle = P.v1; c.lineWidth = 2.4; c.beginPath(); seg.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore(); } }
    // the injector's syringe: barrel, violet contrast, plunger pushing to the right
    const pl = MO.smooth(clamp((t - 0.25) / 2.6));
    PIX.flat(c, PIX.rectPath(-150, -232, 150, 52, 6), 'q5', 'q3', 'q6');
    PIX.rect(c, -128, -218, 118, 24, 'g7'); PIX.rect(c, -126, -216, 114, 20, 'n1');
    const fw = Math.round(114 * (1 - 0.3 * pl)); PIX.rect(c, -126 + 114 - fw, -216, fw, 20, 'v1'); PIX.rect(c, -126 + 114 - fw, -216, fw, 2, 'v2');
    PIX.rect(c, -126 + 114 - fw - 4, -222, 4, 32, 'g8'); PIX.rect(c, -180, -208, 54 + 114 - fw, 6, 'g6');
    PIX.rect(c, -10, -210, 6, 8, 'g8');
    c.setTransform(1, 0, 0, 1, 0, 0);
    CAP.ctx(c, t, { text: 'KONTRAST QOL VENASINA', t0: 0.4, t1: 3.6 });
  },
  cues: [[0.25, 'inject', 0.9, -0.4, 2.6], [0.4, 'type', 0.4], [0.9, 'push_in', 0.6, 0, 2.3], [1.5, 'cut_open', 0.7, 0, 0.7], [1.7, 'mix', 0.7, -0.2, 2.2]],
  xin: 0.3,
};
})();
