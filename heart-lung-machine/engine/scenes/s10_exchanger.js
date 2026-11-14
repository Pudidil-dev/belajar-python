// S10 THE HEAT EXCHANGER (32–35 s): a simplified cutaway of the heat exchanger at the bottom of the oxygenator. Blood (the
// lower channel) and the heater–cooler's water (the upper channel, blue outline) flow past each other in separate channels
// divided by a solid wall. A few small heat arrows cross the wall; the liquids never mix. The camera moves sideways along
// the two channels. A small inset shows where this is: the bottom band of the oxygenator. Labels: water, wall, blood, heat.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, R = n => window.RAMP[n];
const Y = { w0: 196, w1: 256, wall0: 256, wall1: 272, b0: 272, b1: 352 };      // screen rows of the water, the wall, the blood
window.hxView = (c, T, pan, k = 1) => {
  PIX.rect(c, 0, 0, W, H, 'k');
  const off = -pan;
  // water channel: a dark blue body, a clear wall drawn as a blue outline, water flowing to the left
  LIT.shape(c, ctx => { ctx.fillRect(0, Y.w0, W, Y.w1 - Y.w0); }, [0, Y.w0 - 2, W, Y.w1 + 2], ['n1', 'n2', 'wa0', 'wa1'], { cylX: false, amb: 0.3, dif: 0.4, edge: false, flat: 0.6 });
  PIX.rect(c, 0, Y.w0 - 3, W, 3, 'wa3'); PIX.rect(c, 0, Y.w0 - 3, W, 1, 'wa4');
  for (let i = 0; i < 14; i++) { const x = ((i * 37 - T * 26 + off) % 300 + 300) % 300 - 15, y = Y.w0 + 12 + (i % 3) * 16; for (const s of [-1, 1]) PIX.bline(c, x, y, x + 5, y + s * 4, 'wa4'); }
  // the solid wall: steel with fins on both faces (no openings anywhere)
  LIT.shape(c, ctx => { ctx.fillRect(0, Y.wall0, W, Y.wall1 - Y.wall0); }, [0, Y.wall0 - 2, W, Y.wall1 + 2], R('g'), { R: 8, amb: 0.3 });
  for (let x = ((off * 1) % 12 + 12) % 12 - 12; x < W; x += 12) { PIX.rect(c, Math.round(x), Y.wall0 - 4, 3, 4, 'g6'); PIX.rect(c, Math.round(x) + 6, Y.wall1, 3, 4, 'g3'); }
  // blood channel: burgundy, red cells drifting to the right
  LIT.shape(c, ctx => { ctx.fillRect(0, Y.b0, W, Y.b1 - Y.b0); }, [0, Y.b0 - 2, W, Y.b1 + 2], R('vb'), { amb: 0.24, dif: 0.6, flat: 0.4, edge: false });
  PIX.rect(c, 0, Y.b1, W, 2, 'tw2');
  for (let i = 0; i < 24; i++) { const x = ((i * 23 + T * 30 + off) % 300 + 300) % 300 - 15, y = Y.b0 + 10 + (i * 29 % 62); LIT.sphere(c, x, y, 3.2, ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { amb: 0.3 }); PIX.rect(c, Math.round(x) - 1, Math.round(y), 2, 1, 'rc2'); }
  // heat crossing the wall: a few small arrows that travel through it, from the water side into the blood
  for (let i = 0; i < 5; i++) {
    const x = ((i * 58 + 20 + off * 0.2) % 290 + 290) % 290 - 10, ph = ((T * 0.9 + i * 0.37) % 1), y = lerp(Y.w1 - 18, Y.b0 + 22, ph), a = Math.sin(Math.PI * ph) * k;
    if (a < 0.15) continue;
    c.save(); c.globalAlpha = Math.min(1, a * 1.4);
    PIX.bline(c, x, y - 8, x, y, 'ft3'); PIX.bline(c, x, y, x - 3, y - 3, 'ft3'); PIX.bline(c, x, y, x + 3, y - 3, 'ft3');
    c.restore();
  }
};
// the location inset: the assembly in outline, its heat-exchanger band lit
window.hxInset = (c, a = 1) => {
  if (a <= 0) return;
  const x = 196, y = 386, w = 56, h = 78;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x - 4, y - 4, w + 8, h + 8, 'n1'); PIX.rect(c, x - 4, y - 4, w + 8, 1, 'n3');
  const cam = { x: WORLD.LY.oxy.x, y: WORLD.LY.oxy.y + 50, z: 0.6 };
  const cx = x + w / 2, top = y + 8, hh = h - 16, r = 14;
  PIX.rect(c, cx - r, top, 2 * r, hh, 'n2'); PIX.rect(c, cx - r, top, 2 * r, 2, 'iv3'); PIX.rect(c, cx - r, top + hh - 2, 2 * r, 2, 'iv3');
  PIX.rect(c, cx - r + 2, top + 6, 2 * r - 4, hh - 26, 'iv1');
  PIX.rect(c, cx - r + 2, top + hh - 18, 2 * r - 4, 14, 'wa3'); PIX.rect(c, cx - r + 2, top + hh - 18, 2 * r - 4, 1, 'wa4');
  c.restore();
};
SC['s10_exchanger'] = {
  xin: 0.4,
  draw(c, t, S) {
    window.hxView(c, S.t, 70 * MO.sineInOut(clamp(t / 3)), MO.smooth(clamp((t - 0.5) / 0.5)));
    window.hxInset(c, MO.smooth(clamp((t - 0.6) / 0.4)));
    CAP.part(c, t, { text: 'WATER', ax: 150, ay: 222, x: 176, y: 172, t0: 0.7, t1: 2.85, col: 'wa4', lineCol: 'wa3' });
    CAP.part(c, t, { text: 'SOLID WALL', ax: 96, ay: 264, x: 24, y: 166, t0: 1.0, t1: 2.85, col: 'g8' });
    CAP.part(c, t, { text: 'BLOOD', ax: 120, ay: 330, x: 64, y: 372, t0: 1.3, t1: 2.85, col: 'vb5', lineCol: 'vb4' });
    CAP.part(c, t, { text: 'HEAT', ax: null, x: 214, y: 284, t0: 1.6, t1: 2.85, col: 'ft4' });
    CAP.scene(c, t, { title: 'HEAT EXCHANGER', ctx: 'Heat crosses. Nothing mixes.', t0: 0.4, t1: 2.92, acc: 'wa4' });
  },
  cues: [[0.0, 'water_flow', 0.6, 0.4, 3.0], [0.6, 'heat_glide', 0.7, 0, 1.2], [0.7, 'label', 0.3, 0.4], [1.0, 'label', 0.3, -0.4], [1.3, 'label', 0.3, -0.2], [1.6, 'heat_glide', 0.5, 0, 1.0]],
};
})();
