// S17 CARBON DIOXIDE LEAVES (58–62 s): a match cut back to the same piece of fibre wall. Carbon dioxide (amber, O=C=O)
// dissolved in the blood crosses the membrane into the gas side and is carried away with the gas stream (it recedes along
// the fibre, out of the picture plane). The compartments are unchanged. The view then pulls back to the oxygenator, seen
// from the side, at its outlet. Labels: CO2, sweep gas.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, hh = U.hash;
const trackCO2 = t => { const [jx, jy] = MICRO.jit(55, t, 2.1); let x; if (t < 1.0) x = lerp(80, 18, MO.smooth(clamp((t - 0.1) / 0.9))); else if (t < 1.8) x = lerp(18, -18, MO.smooth((t - 1.0) / 0.8)); else x = lerp(-18, -60, MO.sineInOut(clamp((t - 1.8) / 0.6))); return [x + jx * 8, -10 + jy * 10]; };
SC['s17_co2'] = {
  xin: 0.12,
  draw(c, t, S) {
    const T = S.t;
    if (t < 3.3) {
      const out = MO.smooth(clamp((t - 2.8) / 0.5)), cam = { x: lerp(40, -40, MO.sineInOut(clamp((t - 0.2) / 2.2))), y: 0, z: lerp(1.1, 0.45, out) };
      const draw = cc => {
        window.membraneView(cc, cam, T, t, { guides: 0 });
        // CO2 dissolved in the blood: more on the blood side, drifting toward the gas
        for (let k = 0; k < 22; k++) { const [jx, jy] = MICRO.jit(k + 300, T, 1.3); let x = 160 - 300 * Math.pow(hh(k, 31), 1.5) - T * 5 + jx * 40; x = ((x + 150) % 320 + 320) % 320 - 150; if (x < -30) continue; const [px, py] = K.S(cam, x, (hh(k, 32) - 0.5) * 540 + jy * 34); MICRO.co2(cc, px, py, 3 * cam.z, hh(k, 33) * 3, {}); }
        // the followed CO2: across, then swept away with the gas (it shrinks into the depth, with streaks)
        const [x, y] = trackCO2(t), [px, py] = K.S(cam, x, y), away = clamp((t - 2.3) / 0.5), sc = 1 - 0.85 * MO.cubicIn(away);
        if (away > 0) for (let k = 0; k < 5; k++) { const a = k / 5 * U.TAU + 0.3, r0 = 18 * cam.z * (1 - away * 0.5); PIX.bline(cc, px + Math.cos(a) * r0, py + Math.sin(a) * r0, px + Math.cos(a) * r0 * 0.5, py + Math.sin(a) * r0 * 0.5, 'ox2'); }
        if (sc > 0.2) { MICRO.co2(cc, px, py, 3.4 * cam.z * sc, 0.4, {}); if (away < 0.4) MICRO.tag(cc, px, py, 9 * cam.z, T, 'co4'); }
        if (sc > 0.4) CAP.part(cc, t, { text: 'CO₂', ax: px, ay: py - 9 * cam.z, x: px + 26, y: py - 44, t0: 0.4, t1: 2.25, col: 'co4', lineCol: 'co3' });
        const [gx] = K.S(cam, -14, 0);
        CAP.part(cc, t, { text: 'SWEEP GAS', ax: null, x: Math.max(6, gx - 76), y: 412, t0: 1.0, t1: 2.6, col: 'ox4' });
        CAP.scene(cc, t, { title: 'CARBON DIOXIDE LEAVES', ctx: 'Swept away with the gas.', t0: 0.3, t1: 2.75, acc: 'co4' });
      };
      if (out > 0) window.dissolve(c, draw, cc => window.fiberSection(cc, { x: 0, y: -10, z: lerp(0.9, 0.3, out) }, T, { turn: 1 }), MO.smooth(clamp((t - 3.0) / 0.3)));
      else draw(c);
    } else {
      // back in the assembly: the camera pulls out of the fibre bundle to the outlet
      const cam = SIDE.track(T), k = MO.smooth(clamp((t - 3.3) / 0.35));
      window.dissolve(c, cc => window.fiberSection(cc, { x: 0, y: -10, z: 0.3 }, T, { turn: 1 }), cc => SIDE.scene(cc, cam, T, { machine: { fibers: MO.smooth(clamp((4 - t) / 0.5)), sel: 0 } }), k);
    }
  },
  cues: [[0.0, 'matchcut', 0.6, 0], [0.4, 'granular', 0.5, 0.4, 2.0], [1.0, 'cross', 0.6, 0], [0.4, 'label', 0.3, 0.3], [1.0, 'label', 0.3, -0.5], [2.3, 'sweep_out', 0.7, -0.5, 0.6], [2.8, 'pull', 0.6, 0, 1.2]],
};
})();
