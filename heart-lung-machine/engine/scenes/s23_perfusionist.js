// S23 THE PERFUSIONIST (80–83 s): a calm medium shot of the console's monitor; the perfusionist stands in front of the
// machine, seen from behind (no face), attentive. An inset shows what is watched — flow, pressure, temperature, oxygen — as
// steady traces (no numbers: no targets are implied). No knobs are turned; nothing beeps in rhythm.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
SC['s23_perfusionist'] = {
  xin: 0.4,
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T);
    SIDE.scene(c, cam, T, {});
    // the perfusionist in the foreground, from behind, at the lower left (a schematic figure, not to the machine's scale)
    PEOPLE.perfusionist(c, { x: -116, y: 588 - 8 * MO.smooth(clamp(t / 3)), z: 1.0 });
    const a = MO.smooth(clamp((t - 0.6) / 0.35));
    if (a > 0) {
      const x = 22, y = 300, w = 226, h = 120, M = SIDE.LY.mon, [mx, my] = K.S(cam, (M.x0 + M.x1) / 2, M.y1);
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < 20; k++) { const q = k / 20; PIX.rect(c, Math.round(lerp(mx, x + w * 0.6, q)), Math.round(lerp(my, y, q)), 1, 1, 'mt2'); }
      PIX.rect(c, x - 3, y - 3, w + 6, h + 6, 'g3'); PIX.rect(c, x - 3, y - 3, w + 6, 1, 'g6');
      MACHINE.screen(c, x, y, w, h, T, { labels: true, sc: 1 });
      c.restore();
    }
    const M = SIDE.LY.mon;
    SIDE.label(c, cam, t, { text: 'MONITOR', at: [M.x1, M.y0 + 4], dx: 22, dy: -22, t0: 0.3, t1: 2.85, col: 'mt4' });
    CAP.scene(c, t, { title: 'PERFUSIONIST', ctx: 'Watches every reading.', t0: 0.2, t1: 2.92, acc: 'mt3' });
  },
  cues: [[0.0, 'room', 0.6, -0.3, 3.0], [0.3, 'label', 0.3, 0.3], [0.6, 'inset', 0.4, -0.2]],
};
})();
