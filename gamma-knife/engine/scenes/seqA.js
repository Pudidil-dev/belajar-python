// SEQUENCE A — THE IMPOSSIBLE SURGERY (0–7.5 s): the result first. Frame 0 already shows the transparent head with its
// 192 beam paths converging on a tiny target; the dose builds there; one gamma photon hands its energy to an electron;
// the electron ionizes water; a DNA double helix breaks. Then one continuous pull-out — DNA, cell, tissue, brain, head —
// to the Gamma Knife Icon with the patient on its couch.
(() => {
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const SHOT = window.SHOT = window.SHOT || {};
// the opening composition and its state (the loop's frame 0 = the last frame of S49)
SHOT.open = (c, T, o = {}) => HEAD.draw(c, o.cam || HEAD.CAM, T, { beams: 1, pulse: T, glow: o.glow ?? 0.4, lit: 1 });
// S01 — the beams light toward the target; the camera pushes in (0–1.25 s)
SC['s01_beams'] = {
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.25)), cam = { x: lerp(4, 2, q), y: lerp(-18, -6, q), z: K.zl(1.62, 2.25, q) };
    HEAD.draw(c, cam, S.t, { beams: 1, pulse: S.t, glow: 0.4 + 0.6 * MO.smooth(clamp((t - 0.2) / 0.8)) });
    // a highlight running round the beams, in order (the paths "light up" toward the target)
    const hl = clamp(t / 0.7);
    if (hl > 0 && hl < 1) HEAD.beams(c, cam, S.t, { a: 0.9 * Math.sin(Math.PI * hl), list: HEAD.BEAMS.map((_, i) => i).filter(i => Math.abs(i / 44 - hl) < 0.18), R: 230 });
  },
  cues: [[0.0, 'ticks', 0.8, -0.2, 0.5], [0.5, 'impact', 0.9, 0]],
};
// S02 — the dose builds at the target, lower all round (1.25–2.25 s)
SC['s02_dose'] = {
  xin: 0.18,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.0)), cam = { x: 0, y: 0, z: K.zl(1.0, 1.55, q) };
    TISSUE.draw(c, cam, S.t, { shots: [{ x: 0, y: 0, s: 34, w: 1.0 }], dose: 0.25 + 0.75 * MO.smooth(clamp(t / 0.8)), floor: 0.07 });
    CAP.legend(c, t, { x: 296, y: 120, t0: 0.15, t1: 0.85 });
  },
  cues: [[0.0, 'bloom', 0.8, 0, 0.9]],
};
// S03 — a gamma photon hands energy to an electron; the electron flies off, the photon carries on, changed (2.25–3.25 s)
const P3 = { e: [30, 0], from: [-200, -40] };
SC['s03_photon'] = {
  xin: 0.12,
  draw(c, t, S) {
    const cam = { x: lerp(-10, 20, MO.sineInOut(clamp(t / 1.0))), y: 0, z: 1.5 };
    MICRO.bg(c, cam, S.t, {});
    const hit = 0.42, k = clamp(t / hit), [ex, ey] = K.S(cam, P3.e[0], P3.e[1]);
    if (t < hit) D.photon(c, cam, P3.from, [lerp(P3.from[0], P3.e[0] - 10, k), lerp(P3.from[1], P3.e[1], k)], { ph: S.t * 4, lam: 20, amp: 7, w: 3, hs: 7 });
    else {
      const u = clamp((t - hit) / 0.55);
      D.photon(c, cam, [P3.e[0] + 6, P3.e[1] - 4], [P3.e[0] + 6 + 150 * u, P3.e[1] - 4 - 120 * u], { ph: S.t * 3, lam: 28, amp: 6, w: 2, col: 'ga3' });
      const [x, y] = K.S(cam, P3.e[0] + 120 * MO.cubicOut(u), P3.e[1] + 70 * MO.cubicOut(u));
      MICRO.electron(c, x, y, 15, { vx: 1.7, vy: 1, speed: 1.4 });
      D.flash(c, ex, ey, 14 * (1 - u), 1 - u);
    }
    if (t < hit) MICRO.electron(c, ex, ey, 15, {});
  },
  cues: [[0.42, 'snap', 0.9, 0.1]],
};
// S04 — the energetic electron ionizes a water molecule: H⁺ and •OH (3.25–4.25 s)
SC['s04_ionize'] = {
  xin: 0.12,
  draw(c, t, S) {
    const cam = { x: lerp(-20, 10, MO.sineInOut(clamp(t / 1.0))), y: 0, z: 1.5 };
    MICRO.bg(c, cam, S.t, { drift: 6 });
    const W0 = [40, 10], hit = 0.4;
    for (const [x, y, a] of [[-60, -90, 0.6], [110, -120, 2.1], [130, 90, 4.0], [-90, 110, 1.2]]) { const [sx, sy] = K.S(cam, x, y); MICRO.water(c, sx, sy, 12, a + S.t * 0.4, { a: 0.85 }); }
    const [wx, wy] = K.S(cam, W0[0], W0[1]);
    if (t < hit) { const [x, y] = K.S(cam, lerp(-170, W0[0] - 16, t / hit), lerp(40, W0[1] + 4, t / hit)); MICRO.electron(c, x, y, 14, { vx: 1, vy: -0.2, speed: 1.3 }); MICRO.water(c, wx, wy, 19, -1.2 + S.t * 0.3, {}); }
    else {
      const u = MO.cubicOut(clamp((t - hit) / 0.5));
      MICRO.atom(c, wx + 66 * u, wy - 50 * u, 14, 'H+', {}); MICRO.atom(c, wx + 72 * u, wy + 42 * u, 17, 'OH', { glow: 1 - u * 0.5 });
      D.flash(c, wx, wy, 14 * (1 - u), 1 - u);
      const [x, y] = K.S(cam, W0[0] - 16 + 150 * clamp((t - hit) / 0.6), W0[1] + 4 + 60 * clamp((t - hit) / 0.6)); MICRO.electron(c, x, y, 12, { vx: 2.4, vy: 1, speed: 1.2 });
      if (u < 0.35) MICRO.water(c, wx, wy, 19, -1.2, { a: 1 - u * 3 });
    }
  },
  cues: [[0.15, 'pop', 0.5, -0.3], [0.4, 'pop', 0.8, 0.1], [0.55, 'pop', 0.5, 0.4]],
};
// S05 — the DNA double helix; both strands break at one point (4.25–5.5 s)
SC['s05_dsb'] = {
  xin: 0.12,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.25)), cam = { x: 0, y: 0, z: K.zl(1.7, 2.05, q) };
    MICRO.bg(c, cam, S.t, { drift: 3 });
    const br = clamp((t - 0.45) / 0.35);
    MICRO.dna(c, cam, -140, 140, 0, { ph: S.t * 0.8, break: br > 0 ? { x: 6, open: MO.cubicOut(br) } : null });
    if (br > 0 && br < 1) { const [sx, sy] = K.S(cam, 8, 0); D.flash(c, sx, sy, 12 * (1 - br), 1 - br); MICRO.fragments(c, sx, sy, br); }
  },
  cues: [[0.45, 'crack', 1.0, 0]],
};
// S06 — the scale reveal: DNA → cell → tissue → head → the machine (5.5–7.5 s)
SC['s06_reveal'] = {
  draw(c, t, S) {
    const T = S.t, st = [0.32, 0.62, 0.92, 1.24];
    const dna = cc => { const q = clamp(t / st[0]); MICRO.bg(cc, { x: 0, y: 0, z: 2 }, T, {}); MICRO.dna(cc, { x: 0, y: 0, z: K.zl(2.05, 0.5, q) }, -140, 140, 0, { ph: T * 0.8, break: { x: 6, open: 1 } }); };
    const cell = cc => { const q = clamp((t - st[0]) / (st[1] - st[0])), cam = { x: 0, y: 0, z: K.zl(2.2, 0.55, q) }; MICRO.bg(cc, cam, T, {}); MICRO.cell(cc, cam, 0, 0, 110, { seed: 2 }); MICRO.dna(cc, { x: 0, y: 0, z: cam.z * 0.12 }, -140, 140, 0, { ph: T, w: 7 }); };
    const tis = cc => { const q = clamp((t - st[1]) / (st[2] - st[1])); TISSUE.draw(cc, { x: 0, y: 0, z: K.zl(2.2, 0.55, q) }, T, { shots: [{ x: 0, y: 0, s: 34 }], dose: 0.9, floor: 0.06 }); };
    const head = cc => { const q = clamp((t - st[2]) / (st[3] - st[2])); HEAD.draw(cc, { x: lerp(0, 4, q), y: lerp(0, -18, q), z: K.zl(4.5, 1.1, q) }, T, { beams: 1, glow: 0.6 }); };
    const room = cc => { const q = MO.cubicOut(clamp((t - st[3]) / (2.0 - st[3]))); ROOM.wide(cc, { x: lerp(60, 30, q), y: lerp(20, -10, q), z: K.zl(2.6, 0.92, q) }, T, { beams: 0.35 * (1 - q * 0.5) }); };
    const seq = [dna, cell, tis, head, room], dz = 0.06;
    let i = 0; while (i < 4 && t >= st[i]) i++;
    if (i > 0 && t < st[i - 1] + dz) window.dissolve(c, seq[i - 1], seq[i], (t - st[i - 1]) / dz); else seq[i](c);
  },
  cues: [[0.0, 'zoomout', 0.9, 0, 1.4], [1.5, 'reveal', 1.0, 0]],
};
})();
