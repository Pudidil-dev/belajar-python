// SEQUENCE D — THE PRECISION COLLIMATOR SYSTEM (29.5–42.75 s): sources, sectors, collimator and focus in one picture;
// a motorized sector slides along the fixed tungsten collimator body; its sources line up with the 4 mm channels; the
// same sector can select 4, 8 or 16 mm, or a shielded OFF position (the decay goes on while it is OFF); the eight
// sectors take the plan's settings; down one collimator channel.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S18 — the arc of sectors above the head: the paths through the collimator meet at the focal point (29.5–31.5 s)
SC['s18_focus'] = {
  xin: 0.15,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 2.0)); UNIT.arc(c, { x: 0, y: lerp(-40, -60, q), z: K.zl(1.25, 0.98, q) }, S.t, { lit: clamp((t - 0.2) / 0.9) }); },
  cues: [[0.2, 'servo_start', 0.7, 0, 0.8]],
};
// S19 — one motorized sector slides along the collimator body (31.5–33.25 s)
SC['s19_translate'] = {
  xin: 0.12,
  draw(c, t, S) { const x = lerp(-50, 40, MO.sineInOut(clamp((t - 0.2) / 1.2))); UNIT.slide(c, { x: x * 0.5, y: -10, z: 1.05 }, S.t, x, { arrow: MO.smooth(clamp((t - 0.2) / 0.3)) * (1 - MO.smooth(clamp((t - 1.4) / 0.3))) }); },
  cues: [[0.2, 'servo', 0.8, -0.3, 1.2], [1.4, 'align_click', 0.7, 0.3]],
};
// S20 — the sources line up with the 4 mm channels; the paths pass (33.25–35.0 s)
SC['s20_collimate'] = {
  xin: 0.12,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)); UNIT.block(c, { x: lerp(-10, 10, q), y: -40, z: K.zl(1.05, 1.18, q) }, S.t, { lit: MO.cubicOut(clamp((t - 0.25) / 0.6)) });
    // the inset: one channel, 4 mm across
    const a = MO.smooth(clamp((t - 0.7) / 0.3));
    if (a > 0) { UI.panel(c, 214, 452, 120, 104, { border: 'cy3', fill: 'k', a }); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P.g5; c.beginPath(); c.arc(274, 498, 34, 0, TAU); c.fill(); c.fillStyle = P.k; c.beginPath(); c.arc(274, 498, 22, 0, TAU); c.fill(); c.restore(); D.arrow(c, 258, 498, 290, 498, 'w', 1, 4, a); D.arrow(c, 290, 498, 258, 498, 'w', 1, 4, a); if (a > 0.6) PIX.text(c, '4 mm', 274, 536, 'w', { align: 'center', shadow: null }); }
  },
  cues: [[0.25, 'align_click', 0.9, -0.2], [0.35, 'beam_on', 0.6, 0.3, 0.8]],
};
// S21 — the same sector selects 4 → 8 → 16 mm (35.0–36.75 s)
SC['s21_sizes'] = {
  xin: 0.12,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const sel = t < 0.55 ? 0 : t < 1.1 ? 1 : 2, cam = { x: 60, y: -104, z: 1.3 };
    // the sector, cut from the ring, its edge glowing
    D.ring(c, cam, 0, 0, UNIT.RI + 4, UNIT.RO, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42, ['g2', 'g3', 'g4', 'g5', 'g6'], {});
    for (let r = 0; r < 3; r++) for (let j = 0; j < 6; j++) { const aj = -Math.PI / 2 - 0.34 + (j + 0.5) / 6 * 0.68, rr = 80 + r * 22; UNIT.capsule(c, cam, Math.cos(aj) * rr, Math.sin(aj) * rr, aj, 9, 4.6, ['au2', 'au3', 'au4', 'au5', 'au6'], {}); }
    // the selector: three rows, a radio button and a collimator opening each
    for (let i = 0; i < 3; i++) {
      const y = 210 + i * 70, on = i === sel, x = 196;
      UI.panel(c, x, y, 146, 54, { border: on ? 'gn3' : 'g5', fill: on ? 'n1' : 'n0' });
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.strokeStyle = P[on ? 'gn3' : 'g6']; c.lineWidth = 1; c.beginPath(); c.arc(x + 16, y + 27, 6, 0, TAU); c.stroke(); if (on) { c.fillStyle = P.gn3; c.beginPath(); c.arc(x + 16, y + 27, 3, 0, TAU); c.fill(); }
      c.fillStyle = P.g5; c.beginPath(); c.arc(x + 54, y + 27, 18, 0, TAU); c.fill(); c.fillStyle = P.k; c.beginPath(); c.arc(x + 54, y + 27, [3, 6, 11][i], 0, TAU); c.fill(); c.restore();
      PIX.text(c, ['4 mm', '8 mm', '16 mm'][i], x + 84, y + 23, on ? 'w' : 'g6', { shadow: null });
    }
    for (let i = 0; i < 2; i++) { const a = clamp((t - (0.45 + i * 0.55)) / 0.15) * (1 - clamp((t - (0.75 + i * 0.55)) / 0.15)); if (a > 0) D.arrow(c, 336, 254 + i * 70, 336, 278 + i * 70, 'ga4', 2, 5, a); }
  },
  cues: [[0.55, 'click', 0.8, 0.3], [1.1, 'click', 0.8, 0.4]],
};
// S22 — ON beside OFF (36.75–38.5 s)
SC['s22_onoff'] = {
  xin: 0.12,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const side = (cc, x0, on, k) => {
      const cam = { x: -x0 * 0.85, y: -112, z: 1.2 };
      D.ring(cc, cam, 0, 0, UNIT.RI + 4, UNIT.RO + 20, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5, ['g2', 'g3', 'g4', 'g5'], {});
      const off = on ? 0 : 1;
      for (let r = 0; r < 3; r++) for (let j = 0; j < 5; j++) { const aj = -Math.PI / 2 - 0.36 + (j + 0.5) / 5 * 0.72, rr = 84 + r * 22 + off * 26; UNIT.capsule(cc, cam, Math.cos(aj) * rr, Math.sin(aj) * rr, aj, 9, 4.6, on ? ['au2', 'au3', 'au4', 'au5', 'au6'] : ['au1', 'au2', 'au3', 'au4'], {}); }
      if (!on) D.ring(cc, cam, 0, 0, UNIT.RI + 4, 104, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42, ['sh2', 'sh3', 'sh4', 'sh5'], { tone: (x, y) => ((x + y) % 5 === 0 ? 0.2 : 0) });   // the shielded block in the path
      if (on && k > 0) for (let j = 0; j < 5; j++) { const aj = -Math.PI / 2 - 0.36 + (j + 0.5) / 5 * 0.72, [x1, y1] = K.S(cam, Math.cos(aj) * 74, Math.sin(aj) * 74), [x2, y2] = K.S(cam, Math.cos(aj) * (74 - 64 * k), Math.sin(aj) * (74 - 64 * k)); D.stroke(cc, [[x1, y1], [x2, y2]], 'ga4', 2); }
    };
    const k = MO.cubicOut(clamp((t - 0.25) / 0.4));
    window.inset(c, 0, 0, 178, H, cc => side(cc, -90, true, k));
    window.inset(c, 182, 0, 178, H, cc => side(cc, 90, false, 0));
    PIX.rect(c, 178, 0, 4, H, 'g3');
  },
  cues: [[0.25, 'click', 0.9, -0.5], [0.6, 'click', 0.9, 0.5]],
};
// S23 — the eight sectors take the plan's sizes round the head (38.5–41.0 s)
const PLAN8 = [4, 8, 4, 16, 8, 4, 16, 8];
SHOT.PLAN8 = PLAN8;
SC['s23_plan8'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.5)), st = PLAN8.map((s, k) => ({ on: 1, size: s, hi: clamp((t - 0.2 - k * 0.12) / 0.1) > 0.5 && t < 0.2 + k * 0.12 + 0.25 ? 1 : 0 }));
    UNIT.front(c, { x: 0, y: 30, z: K.zl(1.12, 0.98, q) }, S.t, { st, head: true, beams: MO.smooth(clamp((t - 0.6) / 0.5)), nums: false });
  },
  cues: Array.from({ length: 8 }, (_, k) => [0.2 + k * 0.12, 'servo_click', 0.6, -0.6 + k * 0.17, k]),
};
// S24 — down one tungsten collimator channel (41.0–42.75 s)
SC['s24_channel'] = {
  xin: 0.12,
  draw(c, t, S) {
    UNIT.tunnel(c, S.t, MO.sineInOut(clamp(t / 1.75)) * 0.9);
    const a = MO.smooth(clamp((t - 0.5) / 0.3));
    if (a > 0) { UI.panel(c, 236, 92, 108, 100, { border: 'g7', fill: 'n0', a }); const cam = { x: -110, y: 180, z: 1 }; c.save(); c.globalAlpha = a; D.tube(c, cam, [[0, 0], [40, -14]], 30, ['g3', 'g4', 'g5', 'g6', 'g7'], {}); D.ell(c, cam, 0, 0, 10, 15, -0.34, ['g4', 'g5', 'g6', 'g7'], {}); D.ell(c, cam, 0, 0, 4, 6, -0.34, ['k', 'n0', 'g1'], { edge: false }); c.restore(); }
  },
  cues: [[0.0, 'energy_sweep', 0.8, 0, 1.6]],
};
})();
