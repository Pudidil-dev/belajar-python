// S06 · 0:30–0:38 — GENERATING ELECTRONS. Into the gun: the tungsten tip and the extraction anode; the field switches
// on and its lines crowd onto the tip's point. The camera dives down the tip to its apex (radius ~100 nm, field
// ~5 V/nm) and rolls so the surface faces right. The barrier diagram appears over the surface atoms: the metal's
// electrons sit below a 4.5 eV wall; when the field tilts it, the wall is only ~1 nm thick and the electron's wave
// leaks through — tunnelling. Past the barrier each one becomes a cyan electron. Then back out: a narrow jet leaves
// the apex and threads the anode's hole toward the accelerator.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_FIELD = 0.55, T_DIVE = 1.3, T_XF = 1.85, T_SURF = 2.75, T_FON = 3.45, T_LEAK = 3.95, T_BACK = 5.6, T_COL = 6.75;
const fieldK = lt => MO.smooth(U.clamp((lt - T_FIELD) / 0.5));
// column-world camera (before the dive and after the return)
const camIn = lt => {
  const a = SC.s05_vacuum.camAt(7);
  if (lt < T_DIVE) { const p = MO.sineInOut(lt / T_DIVE); return { x: U.lerp(a.x, X, p), y: U.lerp(a.y, Y.tip + 1.2, p), z: CAM.zlerp(a.z, 15, p) }; }
  const p = MO.cubicIn(U.clamp((lt - T_DIVE) / (T_XF + 0.15 - T_DIVE)));
  return { x: X, y: Y.tip + 1.2 * (1 - p), z: CAM.zlerp(15, 80, p) };
};
const camOut = lt => {
  const p = MO.cubicOut(U.clamp((lt - T_COL) / (8 - T_COL)));
  return { x: X, y: U.lerp(Y.tip + 0.4, -251, p), z: CAM.zlerp(80, 9, p) };
};
// dive / return field of view (m) and roll
const fovIn = lt => Math.exp(Math.log(2.6e-3) + (Math.log(4.6e-9) - Math.log(2.6e-3)) * MO.smooth(U.clamp((lt - T_XF) / (T_SURF - T_XF))));
const fovOut = lt => Math.exp(Math.log(4.6e-9) + (Math.log(2.6e-3) - Math.log(4.6e-9)) * MO.cubicIn(U.clamp((lt - T_BACK) / (T_COL + 0.1 - T_BACK))));
const rollIn = lt => -Math.PI / 2 * MO.smooth(U.clamp((lt - T_XF - 0.25) / 0.6));
const rollOut = lt => -Math.PI / 2 * (1 - MO.smooth(U.clamp((lt - T_BACK - 0.1) / 0.7)));
const OX = -38;                                                              // apex offset (px) in the rolled views
// the tip/apex/surface views for a field of view
function micro(c, fov, rot, lt, o = {}) {
  if (fov > 2.5e-8) GUN.tipView(c, fov, rot, lt, { field: o.field ?? 1, ox: OX * Math.abs(rot) / (Math.PI / 2) });
  if (fov < 6e-8) {
    const k = U.clamp((Math.log10(6e-8) - Math.log10(fov)) / (Math.log10(6e-8) - Math.log10(2.5e-8)));
    const surf = cc => GUN.surface(cc, fov, rot, lt, { ox: OX * Math.abs(rot) / (Math.PI / 2) });
    if (fov > 2.5e-8) window.dissolve(c, () => {}, surf, MO.smooth(k)); else surf(c);
  }
}
// electrons tunnelled out (barrier phase): born at the exit point at fixed times, accelerating to the right
const BORN = [4.05, 4.32, 4.5, 4.78, 4.93, 5.12, 5.3, 5.42, 5.55];
// electrons leaving the apex during the return (tip frame px)
function jet(c, lt, fov, rot) {
  const s = W / (fov * 1e9), cx = W / 2 + OX * Math.abs(rot) / (Math.PI / 2), cy = H / 2;
  for (let i = 0; i < 26; i++) {
    const t0 = T_BACK - 0.6 + i * 0.07, age = lt - t0; if (age < 0) continue;
    const d = 0.5 + age * age * 60 * Math.pow(fov / 4.6e-9, 0.5);          // nm from the apex, growing with time and scale
    const ang = (U.hash(i, 5) - 0.5) * 0.5;
    const lx = Math.sin(ang) * d * s, ly = d * s;                            // tip frame: +y away from the apex
    const X_ = cx + lx * Math.cos(rot) - ly * Math.sin(rot), Y_ = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
    if (X_ < -10 || Y_ < -10 || X_ > W + 10 || Y_ > H + 10) continue;
    FX.e(c, X_, Y_, 2, 1);
  }
}
SC.s06_emission = {
  camAt: lt => lt < T_XF ? camIn(lt) : camOut(lt),
  draw(c, lt) {
    const T = 30 + lt;
    const colView = (cc, cam, beam) => {
      LAB.back(cc, cam, T); COL.draw(cc, cam, T, { airlock: 1, glow: fieldK(lt) * 0.8, hot: { c1: 0.3, c2: 0.3, obj: 0.3 } });
      // the extraction field: lines from the anode crowding onto the tip
      const f = fieldK(lt);
      if (f > 0) for (let k = -6; k <= 6; k++) {
        const [ax, ay] = K.S(cam, X + k * 2.1, Y.anode - 0.9), [tx, ty] = K.S(cam, X + k * 0.05, Y.tip + 0.1), [mx, my] = K.S(cam, X + k * 0.9, Y.anode - 2.4);
        let pv = null;
        for (let q = 0; q <= 16; q++) { const u = q / 16, x = (1 - u) ** 2 * ax + 2 * u * (1 - u) * mx + u * u * tx, y = (1 - u) ** 2 * ay + 2 * u * (1 - u) * my + u * u * ty; if (pv && u <= f) PIX.bline(cc, pv[0], pv[1], x, y, Math.abs(k) < 3 ? 'u3' : 'u2'); pv = [x, y]; }
      }
      if (beam > 0) {                                                        // the beam threading the anode, into the accelerator
        const [sx, s0] = K.S(cam, X, Y.tip + 0.3), [, s1] = K.S(cam, X, -247);
        for (let i = 0; i < 18; i++) { const u = K.wrap(lt * 1.6 + i / 18, 1), y = U.lerp(s0, s1, u * u); FX.e(cc, sx, y, 1, beam); }
        PIX.bline(cc, sx, s0, sx, s1, 'c1');
      }
    };
    if (lt < T_XF) {
      const cam = camIn(lt); colView(c, cam, 0);
      const [tx, ty] = K.S(cam, X, Y.tip), [ax, ay] = K.S(cam, X + 9, Y.anode);
      CAP.note(c, lt, { text: 'TUNGSTEN TIP', x: tx + 46, y: ty - 40, ax: tx + 3, ay: ty - 4, t0: 0.35, t1: T_XF - 0.2, col: 'w', lineCol: 'g6', box: true });
      CAP.note(c, lt, { text: 'EXTRACTION ANODE', x: Math.min(W - 100, ax + 10), y: ay + 22, ax, ay: ay + 2, t0: 0.6, t1: T_XF - 0.2, col: 'w', lineCol: 'g6', box: true });
      CAP.note(c, lt, { text: 'STRONG ELECTRIC FIELD', x: 30, y: ty + 46, ax: tx - 6, ay: ty + 12, t0: 0.85, t1: T_XF - 0.2, col: 'u3', lineCol: 'u2', box: true });
      if (lt > T_XF - 0.22) { const k = (lt - (T_XF - 0.22)) / 0.22; window.dissolve(c, () => {}, cc => micro(cc, fovIn(T_XF), 0, lt), MO.smooth(k)); }
    } else if (lt < T_SURF) {
      const fov = fovIn(lt), rot = rollIn(lt); micro(c, fov, rot, lt);
      SAMPLE.scaleBar(c, fov, 1);
      if (fov < 3e-6 && fov > 1.5e-7) CAP.note(c, lt, { text: 'APEX RADIUS ~100 nm', x: 150, y: 120, t0: 2.05, t1: 2.6, col: 'w', box: true });
    } else if (lt < T_BACK) {
      const fov = 4.6e-9, s = W / (fov * 1e9), xs = W / 2 + OX;
      GUN.surface(c, fov, -Math.PI / 2, lt, { ox: OX });
      const F = MO.smooth(U.clamp((lt - T_FON) / 0.5)), w = U.clamp((lt - T_SURF - 0.15) / 0.35);
      const kD = U.clamp((lt - T_SURF) / 0.25);
      let info = { yF: 280, xTurn: 1e4 };
      if (kD > 0) window.shifted(c, cc => { info = GUN.barrier(cc, xs, s, F, w, lt); }, 0, 0);
      // tunnelled electrons
      for (const tb of BORN) {
        const age = lt - tb; if (age < 0 || info.xTurn > W) continue;
        const x = info.xTurn + 4 + age * 30 + age * age * 160, y = info.yF - 22 + (U.hash(tb * 100, 3) - 0.5) * 30;
        if (x > W + 6) continue;
        FX.trail(c, [[x, y], [x - 6 - age * 30, y]], 0.8); FX.e(c, x, y, 2, 1, age < 0.08);
        if (age < 0.12) FX.ring(c, x, y, 3 + age * 50, 'c4', 1 - age / 0.12);
      }
      // labels
      CAP.note(c, lt, { text: 'METAL', x: 18, y: 96, t0: T_SURF + 0.2, t1: T_BACK - 0.1, col: 'g9', box: true });
      CAP.note(c, lt, { text: 'VACUUM', x: W - 50, y: 96, t0: T_SURF + 0.3, t1: T_BACK - 0.1, col: 'g9', box: true });
      CAP.note(c, lt, { text: 'ELECTRON WAVE', x: 14, y: 330, ax: xs - 30, ay: info.yF + 6, t0: T_SURF + 0.4, t1: T_BACK - 0.1, col: 'c4', lineCol: 'c2', box: true });
      CAP.note(c, lt, { text: 'BARRIER', x: xs + 40, y: 164, ax: xs + 6, ay: info.yF - 70, t0: T_SURF + 0.55, t1: T_BACK - 0.1, col: 'w', lineCol: 'g6', box: true });
      CAP.note(c, lt, { text: 'FIELD THINS IT TO ~1 nm', x: xs + 40, y: 176, t0: T_FON + 0.3, t1: T_BACK - 0.1, col: 'u3', box: true });
      CAP.note(c, lt, { text: 'THE WAVE LEAKS THROUGH', x: W - 8, y: 350, ax: Math.min(W - 30, info.xTurn + 14), ay: info.yF + 8, t0: T_LEAK + 0.1, t1: T_BACK - 0.1, col: 'c3', lineCol: 'c2', box: true, align: 'right' });
      if (lt > T_LEAK + 0.6) PIX.text(c, 'wave amplitude exaggerated', W - 6, 452, 'g5', { align: 'right', shadow: null });
    } else if (lt < T_COL) {
      const fov = fovOut(lt), rot = rollOut(lt); micro(c, fov, rot, lt); jet(c, lt, fov, rot);
      SAMPLE.scaleBar(c, fov, 1 - U.clamp((lt - T_COL + 0.3) / 0.3));
    } else {
      const cam = camOut(lt), k = U.clamp((lt - T_COL) / 0.25);
      if (k < 1) window.dissolve(c, cc => { micro(cc, fovOut(T_COL), 0, lt); jet(cc, lt, fovOut(T_COL), 0); }, cc => colView(cc, cam, 1), MO.smooth(k));
      else colView(c, cam, 1);
      const [tx, ty] = K.S(cam, X, -250);
      CAP.note(c, lt, { text: 'A NARROW ELECTRON BEAM', x: W - 8, y: ty - 6, ax: tx + 2, ay: ty, t0: T_COL + 0.4, col: 'c4', lineCol: 'c2', box: true, align: 'right' });
    }
    CAP.scene(c, lt, { title: 'FIELD EMISSION', ctx: ['ELECTRONS TUNNEL OUT', 'OF A TUNGSTEN TIP'], t0: 0.3, acc: 'c2' });
  },
  cues: () => [[0.0, 'glide', 1, 0, 1.2], [T_FIELD, 'field_on', 1, 0, 0.6], [0.35, 'blip', 0.6, 0.3], [0.6, 'blip', 0.6, -0.3], [0.3, 'title_hit', 0.7],
    [T_DIVE, 'dive', 1, 0, T_SURF - T_DIVE], [T_SURF, 'reveal', 0.7], [T_FON, 'tilt_tone', 1, 0, 0.6], [T_LEAK, 'leak', 1, 0.2, 0.8],
    ...BORN.map((t, i) => [t, 'emit', 1, 0.2 + i * 0.05, i]), [T_BACK, 'whoosh_back', 1, 0, 1.2], [T_COL, 'beam_on', 1, 0, 1.2]],
};
})();
