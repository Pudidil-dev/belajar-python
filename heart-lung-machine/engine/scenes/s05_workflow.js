// S05 THE WORKFLOW, ONE DROP AT A TIME (10–18 s): the whole machine from the side, explained the way a dialysis circuit is
// explained: one bright drop of blood is followed all the way round, and each part lights and is named — with its step
// number — as the drop passes through it: 1 drain (venous line), 2 reservoir, 3 pump, 4 heat exchanger, 5 oxygenator,
// 6 filter, 7 return (arterial line, into the aorta). The names stay, so the last second is a labelled diagram of the
// circuit. The camera drifts gently with the drop (a light point of view), then pushes into the chest for step 1.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const LY = SIDE.LY, O = LY.oxy, Pp = LY.pump;
// the drop's path: through the inside of every part, joined into one route
const IN = {
  res: WORLD.smooth([[-58, -2], [-58, 18], [-59, 26], [-61, 40], [-62, 56], [-62, 66]], 1),
  pump: WORLD.smooth([[-14, 101], [-14, 109], [-11, 114], [-6, 118], [0, 120], [3, 121]], 1),
  oxy: WORLD.smooth([[52, 102], [52, 94], [52, 72], [52, 44], [52, 16], [52, 2], [52, -3]], 1),
};
const PTS = [...SIDE.R.venous, ...IN.res, ...SIDE.R.resPump, ...IN.pump, ...SIDE.R.pumpOxy, ...IN.oxy, ...SIDE.R.arterial].map(p => [p[0], p[1]]);
PTS.S = WORLD.lens(PTS);
const L = PTS.S.at(-1), Q0 = 0.5, Q1 = 7.1;
const dropD = t => clamp((t - Q0) / (Q1 - Q0)) * L;
const dAt = (x, y) => { let best = 0, bd = 1e9; for (let i = 0; i < PTS.length; i++) { const d = (PTS[i][0] - x) ** 2 + (PTS[i][1] - y) ** 2; if (d < bd) { bd = d; best = PTS.S[i]; } } return best; };
// the seven steps: where the drop is when each one lights, the part to bracket, the label
const STEPS = [
  { n: 1, text: 'DRAIN', at: [-72, -50], dx: -4, dy: -5, align: 'right', d: dAt(-67, -60), mark: [-72, -88, -62, -6] },
  { n: 2, text: 'COLLECT', at: [-47, 30], dx: 5, dy: -5, d: dAt(-60, 30), mark: 'res' },
  { n: 3, text: 'PUMP', at: [-32, 112], dx: -5, dy: -5, align: 'right', d: dAt(-11, 114), mark: 'pump' },
  { n: 4, text: 'WARM/COOL', at: [39, 84], dx: -5, dy: -5, align: 'right', d: dAt(52, 84), mark: 'hx' },
  { n: 5, text: 'ADD O₂', at: [39, 52], dx: -5, dy: -5, align: 'right', d: dAt(52, 44), mark: 'fib' },
  { n: 6, text: 'FILTER', at: [65, 7], dx: 5, dy: -4, d: dAt(52, 9), mark: 'filt' },
  { n: 7, text: 'RETURN', at: [55, -60], dx: 5, dy: -5, d: dAt(40, -92), mark: [36, -100, 54, -40] },
];
const tOf = d => Q0 + d / L * (Q1 - Q0);
STEPS.forEach(s => { s.t = +tOf(s.d).toFixed(2); });
const camAt = t => {
  const V = SIDE.CAMV, [px, py] = PTS.length ? WORLD.at(PTS, PTS.S, dropD(Math.max(Q0, t - 0.4))) : [0, 0];
  const f = 0.16 * MO.smooth(clamp((t - 0.3) / 0.8)) * (1 - MO.smooth(clamp((t - 7.0) / 0.4)));
  const base = { x: lerp(V.x, px, f), y: lerp(V.y, py, f), z: lerp(V.z, 1.08, MO.smooth(clamp(t / 0.8))) };
  if (t < 7.2) return base;
  return K.camLerp(base, SIDE.track(window.T0.s06_drain), MO.cubicInOut(clamp((t - 7.2) / 0.8)));
};
SC['s05_workflow'] = {
  draw(c, t, S) {
    const T = S.t, cam = camAt(t), d = dropD(t), a = 1 - MO.smooth(clamp((t - 7.25) / 0.25));
    SIDE.scene(c, cam, T, {});
    // the stretch the drop has travelled glows faintly behind it; the drop itself rides on top
    if (t > Q0 && t < Q1 + 0.2) {
      const [x, y, ang] = WORLD.at(PTS, PTS.S, d);
      SIDE.drop(c, cam, x, y, ang, window.RAMP[d < dAt(52, 44) ? 'vb' : 'ab'], a);
    }
    STEPS.forEach(s => {
      const on = MO.smooth(clamp((t - s.t) / 0.15)) * (1 - MO.smooth(clamp((t - s.t - 0.9) / 0.3)));
      MACHINE.mark(c, cam, s.mark, on);
      if (!window.NOTEXT && t >= s.t) {
        const [ax, ay] = K.S(cam, s.at[0], s.at[1]), tw = PIX.textWidth(s.text) + 13;
        let x = ax + s.dx; const left = s.align === 'right' ? x - tw : x; if (left < 3) x += 3 - left; if (left + tw > W - 3) x -= left + tw - (W - 3);
        CAP.badge(c, t, { n: s.n, text: s.text, x, y: ay + s.dy, t0: s.t, t1: 7.15, align: s.align, col: 'mt3' });
      }
    });
    CAP.scene(c, t, { title: 'ONE LOOP, SEVEN STEPS', ctx: 'Follow one drop of blood.', t0: 0.15, t1: 7.1, acc: 'mt3' });
  },
  cues() { return [[0.0, 'glide', 0.4, 0, 0.8], [Q0, 'drop', 0.8, -0.3], ...STEPS.map(s => [s.t, 'step', 0.9, U.clamp((s.at[0]) / 90, -0.8, 0.8), s.n]), [7.2, 'push', 0.6, -0.3, 0.8]]; },
};
window.WORKFLOW = { STEPS, PTS, dropD };
})();
