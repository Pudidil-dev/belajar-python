// SEQUENCE E — BEAMS AND DOSE (42.75–54.0 s): one collimated beam reaches the planned target in the transparent head;
// many beams from all round meet at the isocenter; their absorbed doses add (the beams do not collide or fuse) and a high
// dose forms there while the tissue around gets a low, non-zero dose; one beam against many; an irregular target that one
// round shot cannot cover; the three nominal shot sizes.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S25 — one beam leaves its collimator and reaches the target (42.75–44.5 s)
const A25 = Math.PI * 1.02;
SC['s25_beam'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)), cam = { x: lerp(-150, -40, q), y: lerp(-10, -20, q), z: 1.3 };
    HEAD.draw(c, cam, S.t, { beams: 0, glow: MO.smooth(clamp((t - 0.9) / 0.4)) });
    HEAD.collimator(c, cam, A25, 200, {});
    const k = MO.cubicOut(clamp((t - 0.2) / 0.8)), [x0, y0] = K.S(cam, Math.cos(A25) * 200, Math.sin(A25) * 200), [x1, y1] = K.S(cam, 0, 0);
    D.stroke(c, [[x0, y0], [lerp(x0, x1, k), lerp(y0, y1, k)]], 'ga2', 7, 0.5); D.stroke(c, [[x0, y0], [lerp(x0, x1, k), lerp(y0, y1, k)]], 'ga4', 3);
  },
  cues: [[0.2, 'beam_whoosh', 0.8, -0.6, 1.0]],
};
// S26 — the sectors round the head; many beams meet at one point (44.5–46.25 s)
SC['s26_converge'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)), cam = { x: lerp(-10, 0, q), y: lerp(-30, -40, q), z: K.zl(1.3, 0.92, q) };
    HEAD.draw(c, cam, S.t, { beams: 0, glow: 0.4 + 0.6 * MO.smooth(clamp((t - 0.7) / 0.6)) });
    HEAD.ring(c, cam, S.t, { R: 190, span: Math.PI * 1.25 });
    HEAD.beams(c, cam, S.t, { a: 1, R: 180, lit: MO.smooth(clamp((t - 0.15) / 0.9)) });
  },
  cues: Array.from({ length: 6 }, (_, k) => [0.15 + k * 0.14, 'layer_tick', 0.55, -0.5 + k * 0.2, k]),
};
// S27 — the high dose forms at the isocenter (46.25–48.5 s)
SC['s27_isocenter'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.25)), cam = { x: 0, y: 10, z: K.zl(1.0, 1.25, q) };
    TISSUE.draw(c, cam, S.t, { shots: [{ x: 0, y: 0, s: 36, w: 1.05 }], dose: 0.2 + 0.8 * MO.smooth(clamp((t - 0.2) / 1.2)), floor: 0.07, cross: [0, 0], crossLen: 150 });
    CAP.legend(c, t, { x: 296, y: 112, t0: 0.3, t1: 2.0 });
  },
  cues: [[0.25, 'harmonic', 0.8, 0, 1.4]],
};
// S28 — one beam against many beams (48.5–50.5 s)
SC['s28_onevsmany'] = {
  xin: 0.15,
  draw(c, t, S) {
    const k = MO.smooth(clamp((t - 0.25) / 0.9));
    window.inset(c, 0, 0, 178, H, cc => TISSUE.draw(cc, { x: 90, y: 0, z: 1.2 }, S.t, { shots: [{ x: 0, y: 0, s: 30, w: 0.34 }], dose: 0.3 + 0.7 * k, floor: 0.05, cross: [0, 0], crossLen: 70 }));
    window.inset(c, 182, 0, 178, H, cc => TISSUE.draw(cc, { x: -92, y: 0, z: 1.2 }, S.t, { shots: [{ x: 0, y: 0, s: 30, w: 1.05 }], dose: 0.3 + 0.7 * k, floor: 0.07, cross: [0, 0], crossLen: 70 }));
    PIX.rect(c, 178, 0, 4, H, 'g3');
  },
  cues: [[0.25, 'pulse_single', 0.7, -0.5], [0.6, 'pulse_layered', 0.8, 0.5]],
};
// the irregular lesion (S29–S35): one outline, in tissue coordinates
const LES = [[-62, -10], [-48, -40], [-20, -44], [-6, -66], [22, -70], [40, -50], [36, -26], [58, -10], [66, 18], [44, 34], [20, 26], [6, 48], [-20, 52], [-30, 30], [-56, 26]];
SHOT.LES = LES;
// S29 — the target is irregular: one round shot cannot cover it (50.5–52.25 s)
SC['s29_irregular'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)), cam = { x: lerp(-10, 0, q), y: lerp(-30, -10, q), z: 1.55 };
    TISSUE.draw(c, cam, S.t, { lesion: LES, lesionFill: 1, outline: MO.smooth(clamp((t - 0.2) / 0.3)) });
    const a = MO.smooth(clamp((t - 0.5) / 0.3));
    if (a > 0) {
      UI.panel(c, 18, 430, 140, 120, { border: 'g7', fill: 'k', a });
      window.inset(c, 20, 432, 136, 116, cc => TISSUE.draw(cc, { x: 92, y: -170, z: 1 }, S.t, { shots: [{ x: 0, y: 0, s: 18, w: 1 }], dose: a }));
      if (t > 0.85) { const [x, y] = [128, 520], s = 9; D.stroke(c, [[x - s, y - s], [x + s, y + s]], 'rd4', 4); D.stroke(c, [[x + s, y - s], [x - s, y + s]], 'rd4', 4); }
    }
  },
  cues: [[0.25, 'analysis', 0.6, 0, 0.6], [0.85, 'deny', 0.7, -0.4]],
};
// S30 — the three nominal shot sizes (52.25–54.0 s)
SC['s30_shotsizes'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: 0, y: 0, z: 1.0 }, sizes = [[4, -170, 9], [8, -10, 18], [16, 160, 34]];
    const shots = sizes.map(([mm, y, s], i) => ({ x: 0, y, s, w: clamp((t - 0.2 - i * 0.3) / 0.25) }));
    TISSUE.draw(c, cam, S.t, { shots, dose: 1, floor: 0 });
    sizes.forEach(([mm, y, s], i) => { const a = clamp((t - 0.25 - i * 0.3) / 0.2); if (a <= 0) return; const [sx, sy] = K.S(cam, 0, y), half = s * 1.1; const yy = sy + s * 2.2 + 8; D.stroke(c, [[sx - half, yy], [sx + half, yy]], 'w', 1, a); D.stroke(c, [[sx - half, yy - 4], [sx - half, yy + 4]], 'w', 1, a); D.stroke(c, [[sx + half, yy - 4], [sx + half, yy + 4]], 'w', 1, a); if (a > 0.6 && !window.NOTEXT) PIX.text(c, mm + ' mm', Math.round(sx), Math.round(yy) + 6, 'w', { align: 'center', shadow: null }); });
  },
  cues: [[0.2, 'click', 0.7, -0.3, 0], [0.5, 'click', 0.7, 0, 1], [0.8, 'click', 0.7, 0.3, 2]],
};
})();
