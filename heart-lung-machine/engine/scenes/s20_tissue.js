// S20 OXYGEN REACHES TISSUE (68–72 s): a simplified systemic capillary. Red cells pass in single file, held inside the
// vessel. Some oxygen leaves their hemoglobin, leaves the cells, crosses the thin capillary wall and diffuses into the
// tissue cells around it, which warm slightly in colour. Not all the oxygen leaves: the cells stay red. The camera holds a
// moment, then begins to pull back. Labels: capillary, red blood cells, O2, tissue cells.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, hh = U.hash, R = n => window.RAMP[n];
const CY = 250, LUM = 26, WALL = 6;
const CELLS = []; for (let k = 0; k < 40; k++) { const side = k % 2 ? 1 : -1, x = -40 + (k >> 1) * 22 + hh(k, 1) * 8, y = CY + side * (LUM + WALL + 30 + hh(k, 2) * 70); CELLS.push([x, y, 22 + 8 * hh(k, 3), side, k]); }
SC['s20_tissue'] = {
  xin: 0.5,
  draw(c, t, S) {
    const T = S.t, q = MO.smooth(clamp(t / 2.4)), cam = { x: 135, y: CY, z: t < 2.6 ? lerp(1.0, 1.12, q) : lerp(1.12, 0.92, MO.smooth(clamp((t - 2.6) / 1.4))) };
    PIX.rect(c, 0, 0, W, H, 'pl0');
    // tissue cells: rounded, packed, each with a nucleus; they warm a little as oxygen reaches them
    const warm = MO.smooth(clamp((t - 1.2) / 2.2));
    for (const [x, y, r, side, k] of CELLS) {
      const [sx, sy] = K.S(cam, x, y), rr = r * cam.z, b = HEART.blob([0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * U.TAU + k; const f = 0.86 + 0.18 * hh(k, i + 9); return [x + Math.cos(a) * r * f, y + Math.sin(a) * r * 0.8 * f]; }));
      LIT.path(c, cam, b.path, b.box, R('ts'), { amb: 0.22, bias: -0.08 + 0.14 * warm * (Math.abs(y - CY) < 90 ? 1 : 0.5) });
      const [nx, ny] = K.S(cam, x + r * 0.12, y + r * 0.05); LIT.sphere(c, nx, ny, rr * 0.3, ['ts0', 'ts1', 'ts2', 'ts3'], { amb: 0.2 });
    }
    // the capillary: a thin wall (endothelium) round a narrow lumen
    for (const s_ of [-1, 1]) LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(-60, CY + s_ * (LUM + WALL / 2) - WALL / 2, 400, WALL); }, LIT.wbox(cam, [-60, CY - LUM - WALL - 2, 340, CY + LUM + WALL + 2]), R('hr'), { amb: 0.3, bias: 0.12 });
    LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fillRect(-60, CY - LUM, 400, 2 * LUM); }, LIT.wbox(cam, [-60, CY - LUM, 340, CY + LUM]), ['pl1', 'pl2', 'pl2', 'pl3'], { flat: 1, amb: 0.6, edge: false });
    // red cells in single file, moving right, slightly squeezed by the narrow vessel
    for (let k = 0; k < 8; k++) { const x = ((k * 46 + T * 34) % 368) - 50; MICRO.rbc(c, cam, x, CY, 13, 20, Math.PI / 2 + 0.15 * Math.sin(k + T)); }
    // oxygen leaving the cells: each crosses the wall and drifts into the tissue, then fades into a cell
    for (let k = 0; k < 14; k++) {
      const per = 1.6, ph = ((T * 0.9 + hh(k, 41) * per) % per) / per, side = k % 2 ? 1 : -1, x0 = ((k * 29 + T * 34 * 0.0) % 300) - 10;
      const y = CY + side * lerp(4, LUM + WALL + 40, MO.cubicOut(ph)), x = x0 + MICRO.jit(k + 500, T, 2)[0] * 14, a = ph < 0.85 ? 1 : (1 - ph) / 0.15;
      if (t < 0.4 + hh(k, 44) * 0.8) continue;
      const [px, py] = K.S(cam, x, y); MICRO.o2(c, px, py, 3.2 * cam.z, k, { a });
    }
    const [wx, wy] = K.S(cam, 60, CY - LUM - WALL / 2), [ux, uy] = K.S(cam, 170, CY + LUM + WALL + 60);
    CAP.part(c, t, { text: 'CAPILLARY WALL', ax: wx, ay: wy, x: 18, y: Math.max(92, wy - 44), t0: 0.7, t1: 3.85, col: 'hr5', lineCol: 'hr3' });
    CAP.part(c, t, { text: 'TISSUE CELLS', ax: ux, ay: uy, x: Math.min(190, ux + 14), y: Math.min(440, uy + 40), t0: 1.2, t1: 3.85, col: 'ts5', lineCol: 'ts3' });
    CAP.part(c, t, { text: 'O₂ LEAVES THE BLOOD', ax: null, x: 135, y: 412, t0: 1.7, t1: 3.85, col: 'ox5', align: 'center' });
    CAP.scene(c, t, { title: 'OXYGEN DELIVERED', ctx: 'From blood into tissue.', t0: 0.5, t1: 3.92, acc: 'ox4' });
  },
  cues: [[0.0, 'capillary', 0.5, 0, 0.5], [0.6, 'disperse', 0.8, 0, 2.6], [0.7, 'label', 0.3, -0.4], [1.2, 'label', 0.3, 0.4], [2.0, 'payoff', 1.0, 0]],
};
})();
