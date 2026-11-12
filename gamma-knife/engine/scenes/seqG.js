// SEQUENCE G — WHAT GAMMA RADIATION DOES TO CELLS (62.5–75.5 s): a gamma photon enters brain tissue; Compton scattering
// (the photon gives part of its energy to an electron and scatters, weaker); the recoil electron ionizes molecule after
// molecule along its track; water radiolysis makes reactive species (•OH, H•); they reach the DNA; direct hits and
// radicals break the strands; a cell with severe DNA damage tries to divide and fails. It happens over time, not at once.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S36 — a gamma photon enters the tissue (62.5–64.0 s)
SC['s36_enter'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: lerp(-30, 30, MO.sineInOut(clamp(t / 1.5))), y: 0, z: 1.0 };
    MICRO.bg(c, cam, S.t, {});
    for (const [x, y, r, s] of [[60, -120, 90, 1], [-90, 60, 80, 2], [120, 150, 70, 3], [-40, 240, 60, 4], [150, -300, 70, 5]]) MICRO.cell(c, cam, x, y, r, { seed: s });
    const k = MO.cubicOut(clamp(t / 1.2)); D.photon(c, cam, [-260, -40], [lerp(-260, 140, k), lerp(-40, 10, k)], { ph: S.t * 4, lam: 16, amp: 5 });
  },
  cues: [[0.0, 'hf_sweep', 0.7, -0.6, 1.2]],
};
// S37 — Compton scattering (64.0–66.25 s)
SC['s37_compton'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: 0, y: 0, z: 1.25 }; MICRO.bg(c, cam, S.t, { drift: 2 });
    const hit = 0.65, E = [10, 0], [ex, ey] = K.S(cam, E[0], E[1]);
    if (t < hit) { const k = t / hit; D.photon(c, cam, [-160, -10], [lerp(-160, E[0] - 12, k), lerp(-10, 0, k)], { ph: S.t * 4, lam: 18, amp: 7, w: 3, hs: 7 }); MICRO.electron(c, ex, ey, 16, {}); }
    else {
      const u = clamp((t - hit) / 0.9), [x, y] = K.S(cam, E[0] + 90 * MO.cubicOut(u), E[1] + 70 * MO.cubicOut(u));
      D.photon(c, cam, [-160, -10], [E[0] - 12, 0], { ph: S.t * 4, lam: 18, amp: 7, w: 3, head: false, a: 1 - u });
      D.photon(c, cam, [E[0] + 8, -4], [E[0] + 8 + 130 * MO.cubicOut(u), -4 - 90 * MO.cubicOut(u)], { ph: S.t * 3, lam: 28, amp: 6, w: 2, col: 'ga3' });   // scattered: longer wavelength, lower energy
      MICRO.electron(c, x, y, 16, { vx: 1.3, vy: 1, speed: 1.3 });
      D.flash(c, ex, ey, 18 * (1 - u), 1 - u);
    }
  },
  cues: [[0.65, 'e_snap', 0.9, 0.1]],
};
// S38 — the recoil electron ionizes molecules along its track (66.25–68.0 s)
SC['s38_track'] = {
  xin: 0.15,
  draw(c, t, S) {
    const ex = lerp(-150, 190, t / 1.75), cam = { x: lerp(-40, 70, MO.sineInOut(clamp(t / 1.75))), y: 0, z: 1.2 };
    MICRO.bg(c, cam, S.t, { drift: 5 });
    for (let k = 0; k < 3; k++) {
      const wx = -50 + k * 90, wy = (k % 2 ? 1 : -1) * 14, hitT = (wx + 150) / 340 * 1.75, [sx, sy] = K.S(cam, wx, wy);
      if (t < hitT) MICRO.water(c, sx, sy, 14, -1.2 + k, {});
      else { const u = MO.cubicOut(clamp((t - hitT) / 0.4)); MICRO.atom(c, sx + 24 * u, sy - 38 * u, 12, 'H+', {}); MICRO.atom(c, sx + 30 * u, sy + 32 * u, 15, 'OH', { glow: 1 - u }); D.flash(c, sx, sy, 14 * (1 - u), 1 - u); }
    }
    const [x, y] = K.S(cam, ex, 4 * Math.sin(ex * 0.05)); MICRO.electron(c, x, y, 14, { vx: 1, vy: 0, speed: 1.5, streaks: 5 });
    D.stroke(c, [[x - 120, y], [x - 16, y]], 'ga2', 1, 0.6, [2, 3]);
  },
  cues: [[0.27, 'ion_pop', 0.7, -0.4], [0.73, 'ion_pop', 0.7, 0], [1.2, 'ion_pop', 0.7, 0.4]],
};
// S39 — water radiolysis: H₂O breaks into •OH and H• (68.0–69.75 s)
SC['s39_radiolysis'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: 0, y: 0, z: 1.0 }; MICRO.bg(c, cam, S.t, { drift: 2 });
    const sp = 0.6, u = MO.cubicOut(clamp((t - sp) / 0.6));
    if (t < sp + 0.1) MICRO.water(c, 98, 320, 26, -Math.PI / 2, { a: 1 - clamp((t - sp) / 0.1) });
    if (t > sp) { D.flash(c, 98, 320, 18 * (1 - u), 1 - u); D.arrow(c, 136, 320, lerp(136, 176, u), 320, 'ga4', 3, 8); MICRO.atom(c, lerp(110, 222, u), 320, 22, 'OH', { glow: 0.6 }); MICRO.atom(c, lerp(110, 300, u), lerp(320, 322, u), 17, 'Hr', {}); if (u > 0.8 && !window.NOTEXT) PIX.text(c, '+', 262, 316, 'w', { align: 'center', shadow: null }); }
  },
  cues: [[0.6, 'liquid_pop', 0.9, 0], [0.75, 'liquid_pop', 0.6, 0.4]],
};
// S40 — the radicals drift toward a DNA strand (69.75–71.5 s)
SC['s40_radicals'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: 0, y: 0, z: 1.0 }; MICRO.bg(c, cam, S.t, { drift: 3 });
    MICRO.dna(c, { x: -40, y: 0, z: 1.25 }, -20, 150, 0, { ph: S.t * 0.6, A: 26 });
    const k = MO.sineInOut(clamp(t / 1.6));
    for (const [x0, y0, kind, r] of [[34, 220, 'OH', 20], [64, 330, 'OH', 19], [34, 430, 'Hr', 15]]) { const x = lerp(x0, x0 + 110, k), y = lerp(y0, 320 + (y0 - 320) * 0.4, k); D.stroke(c, [[x - 30, y], [x - 16, y]], 'cy3', 1, 0.7); MICRO.atom(c, x, y, r, kind, { glow: 0.5 }); }
  },
  cues: [[0.2, 'mol_snap', 0.6, -0.4], [0.7, 'mol_snap', 0.6, 0], [1.2, 'mol_snap', 0.6, 0.4]],
};
// S41 — DNA damage: a direct hit and an indirect hit by radicals (71.5–73.25 s)
SC['s41_dnahit'] = {
  xin: 0.15,
  draw(c, t, S) {
    const cam = { x: 0, y: 0, z: 1.25 }; MICRO.bg(c, cam, S.t, { drift: 2 });
    const d1 = clamp((t - 0.45) / 0.3), d2 = clamp((t - 0.95) / 0.3);
    MICRO.dna(c, cam, -140, 140, 0, { ph: S.t * 0.6, A: 26, nick: [d1 > 0 ? { x: -60, s: 0, open: d1 } : null, d2 > 0 ? { x: 60, s: 1, open: d2 } : null].filter(Boolean) });
    // direct: an electron track ending on the backbone; indirect: a radical arriving
    if (t < 0.45) { const k = t / 0.45, [x, y] = K.S(cam, lerp(-150, -60, k), lerp(-160, -26, k)); MICRO.electron(c, x, y, 12, { vx: 0.7, vy: 1, speed: 1.2 }); }
    else if (d1 < 1) { const [x, y] = K.S(cam, -60, -26); D.flash(c, x, y, 12 * (1 - d1), 1 - d1); }
    if (t < 0.95) { const k = clamp(t / 0.95), [x, y] = K.S(cam, lerp(170, 60, k), lerp(150, 26, k)); MICRO.atom(c, x, y, 16, 'OH', { glow: 0.5 }); }
    else if (d2 < 1) { const [x, y] = K.S(cam, 60, 26); D.flash(c, x, y, 12 * (1 - d2), 1 - d2); }
  },
  cues: [[0.45, 'crack', 0.7, -0.3], [0.95, 'crack', 0.7, 0.3]],
};
// S42 — the damaged cell tries to divide and fails (73.25–75.5 s)
SC['s42_cell'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.25)), cam = { x: lerp(-40, 30, q), y: 0, z: K.zl(1.5, 1.05, q) };
    MICRO.bg(c, cam, S.t, {});
    const split = MO.sineInOut(clamp((t - 0.6) / 0.7)), fail = t > 1.35;
    MICRO.cell(c, cam, -60 - 6 * split, 0, 84, { seed: 3, sx: 1 + 0.25 * split });
    // the nucleus with its broken DNA (a red mark)
    const [nx, ny] = K.S(cam, -74, -8); D.flash(c, nx, ny, 8, 0.6 + 0.4 * Math.sin(S.t * 6));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.rd4; c.fillRect(Math.round(nx) - 2, Math.round(ny) - 2, 4, 4); c.restore();
    // the two daughter cells it cannot make: dashed outlines to the right
    if (split > 0) for (const dy of [-60, 60]) { const pts = []; for (let k = 0; k <= 36; k++) { const a = k / 36 * TAU; pts.push(K.S(cam, 110 + Math.cos(a) * 46, dy * 0.85 + Math.sin(a) * 46)); } D.stroke(c, pts, 'br4', 1, split * 0.9, [4, 4]); }
    if (split > 0.3) { const [ax, ay] = K.S(cam, 46, 0); D.arrow(c, ax - 14, ay, ax + 12, ay, 'w', 3, 7, split); }
    if (fail) { const [x, y] = K.S(cam, 110, 0), s = 14 * cam.z, a = clamp((t - 1.35) / 0.15); D.stroke(c, [[x - s, y - s], [x + s, y + s]], 'rd4', 5, a); D.stroke(c, [[x + s, y - s], [x - s, y + s]], 'rd4', 5, a); }
  },
  cues: [[0.6, 'bio_pulse', 0.8, 0, 1.0], [1.35, 'deny', 0.7, 0.3]],
};
})();
