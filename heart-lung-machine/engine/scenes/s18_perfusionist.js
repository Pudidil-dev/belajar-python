// S18 THE PERFUSIONIST (56–59 s): back at the machine, a calm medium shot: the perfusionist beside the console, attentive to
// the monitor. An inset shows what is being watched: flow, pressure, temperature and oxygen, as steady traces (no numbers:
// no targets are implied). No knobs are turned; nothing beeps in rhythm.
(() => {
const clamp = U.clamp, lerp = U.lerp;
SC['s18_perfusionist'] = {
  xin: 0.5,
  draw(c, t, S) {
    const cam = WORLD.track(S.t);
    WORLD.scene(c, cam, S.t);
    const a = MO.smooth(clamp((t - 0.6) / 0.35));
    if (a > 0) {
      const x = 22, y = 300, w = 226, h = 142, M = WORLD.LY.mon, [mx, my] = K.S(cam, M.x + M.w * 0.6, M.y + M.h);
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < 20; k++) { const q = k / 20; PIX.rect(c, Math.round(lerp(mx, x + w * 0.6, q)), Math.round(lerp(my, y, q)), 1, 1, 'mt2'); }
      PIX.rect(c, x - 4, y - 4, w + 8, h + 8, 'g3'); PIX.rect(c, x - 4, y - 4, w + 8, 1, 'g6'); PIX.rect(c, x - 3, y + h + 3, w + 6, 1, 'g1');
      MACHINE.screen(c, x, y, w, h, S.t, { labels: true, sc: 2 });
      c.restore();
    }
    CAP.ctx(c, t, { text: 'Continuously\nmonitored', t0: 0.3, t1: 2.7, acc: 'mt3' });
  },
  cues: [[0.0, 'room', 0.6, -0.3, 3.0], [0.6, 'inset', 0.4, -0.2]],
};
})();
