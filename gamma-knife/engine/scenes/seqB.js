// SEQUENCE B — HOW THE MACHINE FINDS ITS TARGET (7.5–15.5 s): MRI slices become a brain volume with the lesion; a custom
// thermoplastic mask holds the head; the Icon's cone-beam CT checks the head's exact position; the treatment plan
// (target, 192 beams, dose, confirm) closes its isodose rings round the target.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S07 — MRI slices stack into a 3D brain volume; the lesion lights (7.5–9.25 s)
SC['s07_mri'] = {
  xin: 0.12,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n1');
    for (let x = 0; x < W; x += 24) PIX.rect(c, x, 0, 1, H, 'n2'); for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n2');
    // three slices fall into place one after another, offset like a stack
    for (let k = 0; k < 3; k++) {
      const q = MO.cubicOut(clamp((t - k * 0.18) / 0.35)); if (q <= 0) continue;
      const x = 92 + k * 26, y = lerp(-80, 150 + k * 22, q), merge = MO.smooth(clamp((t - 0.95) / 0.5));
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.k; c.fillRect(x - 44, y - 50, 88, 100); c.fillStyle = P.g4; c.fillRect(x - 44, y - 50, 88, 1); c.fillRect(x - 44, y + 49, 88, 1); c.fillRect(x - 44, y - 50, 1, 100); c.fillRect(x + 43, y - 50, 1, 100); c.restore();
      UI.slice(c, x, y, 36, 42, { lesion: k > 0 ? 1 : 0.4, seed: 3 + k, a: 1 - merge * 0.6 });
    }
    // the arrow and the volume below
    const v = MO.smooth(clamp((t - 0.7) / 0.6));
    if (v > 0) { D.arrow(c, 180, 268, 180, 304, 'cy4', 3, 8, v); const cam = { x: 6, y: -120, z: 1.2 }; UI.brain3d(c, cam, S.t, { planes: v, glow: MO.smooth(clamp((t - 1.2) / 0.3)) }); }
  },
  cues: [[0.0, 'scan_tick', 0.6, -0.3], [0.18, 'scan_tick', 0.6, 0], [0.36, 'scan_tick', 0.6, 0.3], [0.9, 'volume', 0.7, 0, 0.6]],
};
// S08 — the thermoplastic mask comes down over the face and clips onto the headrest (9.25–11.0 s)
SC['s08_mask'] = {
  xin: 0.12,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)), cam = { x: lerp(40, 20, q), y: lerp(-34, -26, q), z: K.zl(2.0, 2.3, q) };
    ROOM.close(c, cam, S.t, { maskOn: MO.cubicOut(clamp((t - 0.1) / 0.7)) });
  },
  cues: [[0.8, 'mask_snap', 0.9, -0.2], [0.95, 'mask_snap', 0.7, 0.3]],
};
// S09 — the CBCT cone sweeps round the head; an axial slice confirms the target position (11.0–13.0 s)
SC['s09_cbct'] = {
  xin: 0.12,
  draw(c, t, S) {
    const cam = { x: 6, y: -60, z: 1.45 };
    ROOM.close(c, cam, S.t, {});
    ROOM.cbct(c, cam, S.t, Math.sin(t * 2.6) * 0.8, MO.smooth(clamp(t / 0.3)));
    const a = MO.smooth(clamp((t - 0.8) / 0.3));
    if (a > 0) { UI.panel(c, 200, 426, 140, 150, { border: 'cy3', fill: 'k', a }); if (a > 0.5) UI.slice(c, 270, 501, 56, 64, { lesion: 1, cross: true, seed: 7 }); }
  },
  cues: [[0.1, 'cbct_sweep', 0.8, -0.5, 1.6], [0.85, 'align_click', 0.7, 0.4]],
};
// S10 — the treatment plan: target, 192 beams, dose, confirm; isodose rings close round the target (13.0–15.5 s)
SC['s10_plan'] = {
  xin: 0.12,
  draw(c, t, S) { UI.plan(c, S.t, t); },
  cues: [[0.35, 'check', 0.7, -0.3], [0.67, 'check', 0.7, -0.1], [0.99, 'check', 0.7, 0.1], [1.31, 'check', 0.8, 0.3], [0.5, 'calc', 0.6, 0, 1.4]],
};
})();
