// SEQUENCE A — THE BREATH (0–8 s on screen): the result first, calmly. One continuous shot, no cuts and no flashes: the
// chest in its transparent cutaway, the endotracheal tube in the trachea, and the lungs breathing — two whole
// ventilator breaths at the set rate. Each breath: the gas flows in (cyan) while the volume rises steadily and the lungs
// inflate (the bases move down, the sides out), then the flow stops and the lungs recoil on their own, deflating as the
// exhaled gas (amber) leaves. During the second breath the camera pulls slowly back to the whole set-up: the tube, the
// circuit and the ICU ventilator whose screen draws the same breath. The film's last frame is this shot's first frame.
// The six scene slots (S01–S06) are beats of the one shot; all of it is drawn from r, the seconds on screen.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const M = MACRO.R, HK = BREATH.HOOK;
// gas in the trachea and both main bronchi, and in the first lobar branches
const AIRWAY = [M.trachea, M.bronR, M.bronL];
const LOBAR = MACRO.TREE.filter(s => s[4] > 2.4).map(([x0, y0, x1, y1]) => BREATH.path([[x0, y0], [x1, y1]], 2));
const airwayGas = (c, cam, T, v, a = 1, dir = 1) => {
  if (a <= 0.01) return;
  const E = p => MACRO.ex(p[0], p[1], v);
  const w = U.clamp(Math.round(cam.z * 0.75), 2, 4), rd = dir > 0 ? ['cy4', 'cy5', 'cy4'] : ['am4', 'am5', 'am4'], tr = dir > 0 ? 'cy2' : 'am2';
  AIRWAY.forEach((p, k) => BREATH.stream(c, cam, BREATH.path(p.map(E), 1), T, { n: 50, speed: 120, dir, seed: 11 + k, spread: k ? 2.2 : 3.4, len: 1.5, a, ramp: rd, dot: true, w, maxTrail: 4, trail: tr }));
  LOBAR.forEach((p, k) => BREATH.stream(c, cam, BREATH.path(p.map(E), 1), T, { n: 10, speed: 90, dir, seed: 31 + k, spread: 1, len: 1, a, ramp: rd, dot: true, w: Math.max(2, w - 1), maxTrail: 3, trail: tr }));
};
window.airwayGas = airwayGas;
// the flows of the hook's breaths: in (cyan) while the ventilator delivers, out (amber) while the lungs recoil
const hookFlow = r => {
  const { k, u } = BREATH.hookPhase(r), fin = u < HK.TI ? 1 - MO.smooth(clamp((u - HK.TI + 0.12) / 0.12)) : 0;
  const fout = u >= HK.TI ? MO.smooth(clamp((u - HK.TI) / 0.15)) * Math.exp(-(u - HK.TI) / 1.1) : 0;
  return { fin, fout, k, u };
};
SHOT.hookFlow = hookFlow;
// particles move at the rate of the last scene (S40), so the loop point joins without a jump
const TP = 2 / 3;
const drawHook = (c, r) => {
  const cam = SHOT.hookCam(r), v = BREATH.hookV(r), { fin, fout } = hookFlow(r), T = r * TP;
  const sweep = ((r / HK.P) % 1 + 1) % 1;
  MACRO.scene(c, cam, T, { v, flowIn: fin, flowOut: fout, monitor: { sweep } });
  airwayGas(c, cam, T, v, fin * MO.smooth(clamp(r / 0.25)), 1);
  airwayGas(c, cam, T, v, fout, -1);
};
SHOT.drawHook = drawHook;
const hook = { draw(c, t, S) { drawHook(c, S.t / HK.W); } };
// S01 — frame 0: the lungs at rest; the breath begins, the gas flows in, the lungs start to inflate (0–1 s)
SC['s01_breath'] = { ...hook,
  // the hook's sound, on screen time (the score's grid): the valve opens and the gas flows in, the lungs stretch, the
  // passive exhale; the same for the second breath; the slow pull-back; the bass hit as the ventilator stands in frame
  gcues: [[0.0, 'valve_click', 0.45, -0.2], [0.0, 'airflow', 0.5, -0.3, 1.0], [0.5, 'elastic', 0.45, 0], [HK.TI, 'exhale', 0.55, 0.2, 2.6],
    [HK.P, 'valve_click', 0.4, -0.2], [HK.P, 'airflow', 0.45, -0.3, 1.0], [HK.P + 0.5, 'elastic', 0.4, 0], [HK.P + HK.TI, 'exhale', 0.5, 0.2, 2.4],
    [5.25, 'zoom_out', 0.4, 0, 2.6], [7.25, 'monitor_blip', 0.4, 0.3], [7.75, 'monitor_blip', 0.4, 0.3]],
};
// S02 — full inflation: the bases have moved down, the sides out (1–2 s)
SC['s02_trachea'] = { ...hook };
// S03 — the flow stops; the lungs recoil and deflate on their own, the exhaled gas leaves (2–3.25 s)
SC['s03_branches'] = { ...hook };
// S04 — at rest for a moment; the next breath begins (3.25–4.5 s)
SC['s04_alveoli'] = { ...hook };
// S05 — the second breath: inflate, deflate; the camera starts to pull back (4.5–6 s)
SC['s05_barrier'] = { ...hook };
// S06 — the whole set-up: tube, circuit, humidifier and the ventilator, its screen drawing the breath (6–8 s)
SC['s06_reveal'] = { ...hook, cues: [[0.75, 'bass_hit', 0.6, 0]] };
})();
