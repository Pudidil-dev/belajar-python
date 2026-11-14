// S22 SUCTION, NOTHING WASTED (76–80 s): blood that spills into the chest is not lost. A sucker in the pericardial well picks
// it up; the camera pulls back as it runs down a thin line on the left to a roller pump on the console. An inset magnifies
// the pump head: two rollers on a turning arm press the tube against a curved track and push what is inside forward, the
// same principle as the blood pump of a dialysis machine. From the pump the saved blood goes up into the reservoir's
// suction inlet, through the filter, and joins the circuit again.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const SU = SIDE.LY.suc;
SC['s22_suction'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), Ls = SIDE.len('suction'), Lr = SIDE.len('suctionRet');
    const q1 = MO.sineInOut(clamp((t - 0.5) / 1.9)), q2 = MO.sineInOut(clamp((t - 2.5) / 1.2));
    SIDE.scene(c, cam, T, { tubes: { suction: { hi: MO.smooth(clamp((t - 0.5) / 0.3)) }, suctionRet: { hi: MO.smooth(clamp((t - 2.5) / 0.3)) } },
      inner: (oc, hcam) => { LIT.shape(oc, ctx => { K.cam(ctx, hcam); ctx.beginPath(); ctx.ellipse(-50, 52, 12, 4, 0, 0, U.TAU); ctx.fill(); }, LIT.wbox(hcam, [-64, 46, -36, 58]), window.RAMP.vb, {}); } });
    if (t > 0.5 && t < 2.6) SIDE.comet(c, cam, ['suction'], q1 * (Ls + 10), 40, { a: 1 - MO.smooth(clamp((t - 2.35) / 0.25)) });
    if (t > 2.5) SIDE.comet(c, cam, ['suctionRet'], q2 * (Lr + 10), 36, { a: 1 - MO.smooth(clamp((t - 3.7) / 0.2)) });
    MACHINE.mark(c, cam, 'suc', MO.smooth(clamp((t - 1.9) / 0.2)) * (1 - MO.smooth(clamp((t - 3.7) / 0.2))));
    // the inset: the roller head magnified
    const ia = MO.smooth(clamp((t - 2.0) / 0.3)) * (1 - MO.smooth(clamp((t - 3.75) / 0.2)));
    if (ia > 0) {
      const x = 150, y = 300, w = 112, h = 112, icam = { x: SU.head[0], y: SU.head[1] - 2, z: 4.6 };
      const ic = { ...icam, x: icam.x - (x + w / 2 - W / 2) / icam.z, y: icam.y - (y + h / 2 - H / 2) / icam.z };
      c.save(); c.globalAlpha = ia;
      PIX.rect(c, x - 2, y - 2, w + 4, h + 4, 'mt3');
      window.inset(c, x, y, w, h, cc => { PIX.rect(cc, x, y, w, h, 'n0'); MACHINE.roller(cc, ic, SU.head[0], SU.head[1], SU.hr, SU.y0, T, { fluid: 'vb' }); });
      c.restore();
      CAP.part(c, t, { text: 'ROLLERS SQUEEZE', ax: null, x: x + w / 2, y: y - 26, t0: 2.3, t1: 3.75, col: 'w', align: 'center' });
      CAP.part(c, t, { text: 'THE TUBE', ax: null, x: x + w / 2, y: y - 15, t0: 2.45, t1: 3.75, col: 'w', align: 'center' });
    }
    const L = (text, at, dx, dy, t0, t1, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1, col, align });
    L('SPILLED BLOOD', SIDE.H2S(-50, 52), 30, 22, 0.2, 1.1, 'vb5');
    L('SUCKER', SIDE.H2S(-56, 10), -30, -26, 0.4, 1.1, 'w', 'right');
    L('ROLLER PUMP', [SU.x1, SU.y0 + 6], 16, 10, 1.95, 3.85, 'w');
    L('BACK TO RESERVOIR', [-83, 30], 14, -8, 2.9, 3.85, 'vb5');
    CAP.scene(c, t, { title: 'SUCTION', ctx: 'Spilled blood is saved.', t0: 0.2, t1: 3.92, acc: 'vb5' });
  },
  cues: [[0.2, 'label', 0.3, -0.2], [0.4, 'label', 0.3, -0.4], [0.5, 'drain_flow', 0.6, -0.6, 1.9], [1.95, 'label', 0.3, -0.5], [2.0, 'inset', 0.5, 0.4], [2.3, 'roller', 0.8, 0.3, 1.4], [2.5, 'climb', 0.4, -0.5, 1.2], [2.9, 'label', 0.3, -0.4]],
};
})();
