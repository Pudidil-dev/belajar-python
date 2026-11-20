// SEQUENCE C — INSIDE THE COBALT-60 RADIATION SYSTEM (15.5–29.5 s): the unit cut open (shielding, sources, sector
// drive); 8 sectors × 24 = 192 sealed Co-60 sources; one capsule; a Co-60 nucleus decays (beta-minus) to excited Ni-60,
// which releases two gamma photons (1.17 and 1.33 MeV); the betas stop in the capsule, the gammas leave it; the
// shielding stops most directions and only selected paths reach the collimators. The decay never stops.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S11 — the shell peels back: shielding, Co-60 sources, the sector mechanism (15.5–17.5 s)
SC['s11_cutaway'] = {
  xin: 0.15,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 2.0)); UNIT.cutaway(c, { x: lerp(10, 30, q), y: lerp(0, -10, q), z: K.zl(0.95, 1.12, q) }, S.t, { q: MO.cubicInOut(clamp((t - 0.1) / 0.8)) }); },
  cues: [[0.1, 'metal_reveal', 0.9, 0.2, 0.9]],
};
// S12 — the ring of 8 sectors; they light one by one: 8 × 24 = 192 sources (17.5–20.0 s)
SC['s12_sectors'] = {
  xin: 0.12,
  draw(c, t, S) {
    const st = Array.from({ length: 8 }, (_, k) => { const a = clamp((t - 0.25 - k * 0.16) / 0.12), b = 1 - clamp((t - 0.25 - k * 0.16 - 0.3) / 0.25); return { on: 1, hi: Math.min(a, b) > 0.5 ? 1 : 0 }; });
    UNIT.front(c, { x: 0, y: 20, z: 1.05 }, S.t, { st });
  },
  cues: Array.from({ length: 8 }, (_, k) => [0.25 + k * 0.16, 'sector_tick', 0.7, -0.6 + k * 0.17, k]),
};
// S13 — one sealed source capsule; the steel turns transparent over the cobalt (20.0–21.75 s)
SC['s13_capsule'] = {
  xin: 0.15,
  draw(c, t, S) { const q = MO.cubicOut(clamp(t / 0.8)); NUC.capsule(c, { x: 0, y: -10, z: K.zl(0.7, 1.2, q) }, S.t, { cut: MO.smooth(clamp((t - 0.45) / 0.5)) }); },
  cues: [[0.0, 'whoosh_down', 0.8, 0, 0.8]],
};
// S14 — beta-minus decay: a neutron becomes a proton; an electron and an antineutrino leave; Ni-60* remains (21.75–24.0 s)
SC['s14_decay'] = {
  xin: 0.15,
  draw(c, t, S) {
    MICRO.bg(c, { x: 0, y: 0, z: 1 }, S.t, { tint: 0.35 });
    const dec = 0.75, cx0 = -88, cx1 = 92, y = -20;
    const [ax, ay] = [180 + cx0, 320 + y], [bx, by] = [180 + cx1, 320 + y];
    NUC.nucleus(c, ax, ay, 38, { rot: S.t * 0.4, flip: t > dec ? 1 : clamp((t - dec + 0.2) / 0.2) * 0.4 });
    if (t > dec) {
      const u = clamp((t - dec) / 0.7);
      D.arrow(c, ax + 46, ay, lerp(ax + 46, bx - 50, MO.cubicOut(u)), ay, 'ga4', 3, 7);
      const [ex, ey] = [lerp(180, 200, u), lerp(ay + 10, ay + 120, MO.cubicOut(u))]; MICRO.electron(c, ex, ey, 9, { vx: 0.2, vy: 1, speed: 1.2 });
      const [nx, ny] = [lerp(170, 120, u), lerp(ay + 10, ay + 110, MO.cubicOut(u))]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.g6; c.beginPath(); c.arc(nx, ny, 3.5, 0, TAU); c.fill(); c.restore(); if (u > 0.3 && !window.NOTEXT) PIX.text(c, 'ν', Math.round(nx) - 2, Math.round(ny) + 6, 'g7', { shadow: null });
      const v = clamp((t - dec - 0.35) / 0.35); if (v > 0) { c.save(); c.globalAlpha = v; NUC.nucleus(c, bx, by, 38, { rot: S.t * 0.4 + 1, flip: 1, excited: 1 }); c.restore(); }
      if (u < 1) D.flash(c, ax, ay, 16 * (1 - u), 1 - u);
    }
  },
  cues: [[0.75, 'nuc_pulse', 1.0, 0], [0.8, 'beta', 0.6, 0.2]],
};
// S15 — Ni-60* settles in two steps: gamma photons of 1.17 MeV and 1.33 MeV (24.0–25.75 s)
SC['s15_gamma'] = {
  xin: 0.12,
  draw(c, t, S) {
    MICRO.bg(c, { x: 0, y: 0, z: 1 }, S.t, { tint: 0.35 });
    const nx = 82, ny = 320, e1 = 0.3, e2 = 0.8;
    NUC.nucleus(c, nx, ny, 38, { rot: S.t * 0.4 + 1, flip: 1, excited: t < e2 ? 1 : 1 - clamp((t - e2) / 0.4) });
    for (const [te, dy] of [[e1, -70], [e2, 70]]) { if (t < te) continue; const u = clamp((t - te) / 0.6); D.photon(c, { x: 0, y: 0, z: 1 }, [nx - 180 + 44, ny - 320 + dy * 0.25], [nx - 180 + 44 + 230 * MO.cubicOut(u), ny - 320 + dy * (0.25 + 0.75 * MO.cubicOut(u))], { ph: S.t * 4, lam: 14, amp: 5, w: 2 }); if (u < 0.5) D.flash(c, nx + 30, ny + dy * 0.2, 10 * (1 - u * 2), 1 - u * 2); }
  },
  cues: [[0.3, 'gamma_pulse', 0.9, 0.3, 0], [0.8, 'gamma_pulse', 0.9, 0.5, 1]],
};
// S16 — the sealed source: the betas stop in the capsule, the gamma rays leave it (25.75–27.5 s)
SC['s16_source'] = {
  xin: 0.15,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.75)); NUC.capsule(c, { x: lerp(10, 40, q), y: -10, z: K.zl(1.25, 0.95, q) }, S.t, { cut: 1, beta: 1, gamma: MO.smooth(clamp(t / 0.3)) }); },
  cues: [[0.2, 'absorb_tick', 0.6, -0.3], [0.55, 'absorb_tick', 0.6, 0.1], [0.9, 'absorb_tick', 0.6, -0.1], [0.3, 'gamma_out', 0.7, 0.5, 1.2]],
};
// S17 — the source inside its shielding: most directions are stopped, selected paths reach the collimators (27.5–29.5 s)
SC['s17_shield'] = {
  xin: 0.15,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 2.0)); NUC.shield(c, { x: lerp(-10, 30, q), y: 0, z: K.zl(1.15, 1.0, q) }, S.t, { q: clamp(t / 1.1) }); },
  cues: [[0.3, 'absorb_tick', 0.6, -0.4], [0.45, 'absorb_tick', 0.6, 0.0], [0.6, 'absorb_tick', 0.6, 0.4], [0.8, 'path_through', 0.7, 0.6, 0.8]],
};
})();
