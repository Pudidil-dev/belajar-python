// SHOT — what several scenes share: the opening composition, the inspiratory pulse that the hook and the loop both show,
// and small camera helpers. The film loops, so the scenes at the end (S39, S40) draw with τ = t − 60: their particles,
// pulse and lungs then run straight into the first frame without a jump.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const SHOT = window.SHOT = { NAME: 'SHOT' };
SHOT.OPEN = { x: 0, y: -18, z: 2.2 };                                  // frame 0 = the last frame
// the pulse runs along the whole inspiratory route; at τ = 0 its head is just inside the mouth
const HP = SHOT.HP = MACRO.inspRoute;
const nearest = (pts, x, y) => { let best = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < bd) { bd = d; best = pts.S[i]; } } return best; };
SHOT.D_MOUTH = nearest(HP, 0, -104);
SHOT.D_CARINA = BREATH.len(HP);
SHOT.SPEED = 150;                                                       // units/s: the breath enters fast
SHOT.pulseD = tau => SHOT.D_MOUTH + SHOT.SPEED * tau;
// the opening camera move (S01): a small impact push toward the trachea, following the gas
SHOT.hookCam = tau => { const q = MO.cubicIn(clamp(tau / 0.375)); return { x: 0, y: lerp(-18, -58, q), z: K.zl(2.2, 3.4, q) }; };
// log-zoom between two cameras
SHOT.zoom = (a, b, q) => ({ x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), z: K.zl(a.z, b.z, q) });
// a camera that moves along a list of keys [[t, x, y, z]] (eased, log zoom)
SHOT.track = keys => K.camTrack(keys);
// the tau a scene should draw with: film time, except near the loop point where it runs up to 0
SHOT.tau = T => T > 57 ? T - 60 : T;
// the state of the machine's parts at film time T (one breath explained from 3 s to 60 s):
//   the breath timer fills from the last breath (3 s) and fires at 17.25 s; the processor closes the expiratory valve and
//   opens the inspiratory valve (19.125 s); the measured flow adds up to the target volume (40.5 s); the inspiratory valve
//   closes (41.625 s) and the expiratory valve opens (41.875 s); expiration is passive; the expiratory valve settles to hold
//   PEEP; the next timer cycle fires at 56.875 s.
SHOT.TRIG = 17.25; SHOT.OPEN_V = 19.125; SHOT.TARGET = 40.5; SHOT.CLOSE_V = 41.625; SHOT.EXP_OPEN = 41.875; SHOT.TRIG2 = 56.875;
SHOT.vent = T => {
  const sm = MO.smooth, st = {};
  st.airV = T < 10.875 ? 0.5 : lerp(0.5, 0.76, sm(clamp((T - 10.875) / 0.375)));
  st.o2V = T < 10.875 ? 0.5 : lerp(0.5, 0.24, sm(clamp((T - 10.875) / 0.375)));
  st.flowAir = 0.7; st.flowO2 = 0.7;
  st.psol = T < SHOT.OPEN_V ? 0.03 : T < SHOT.CLOSE_V ? 0.8 * MO.cubicOut(clamp((T - SHOT.OPEN_V) / 0.09)) : 0.8 * (1 - MO.cubicIn(clamp((T - SHOT.CLOSE_V) / 0.08)));
  st.flowBlend = T < SHOT.OPEN_V ? 0.12 : T < SHOT.CLOSE_V + 0.1 ? lerp(0.12, 1, clamp((T - SHOT.OPEN_V) / 0.15)) : 0.12;
  st.expV = T < 18.2 ? 0.55 : T < SHOT.EXP_OPEN ? lerp(0.55, 1, sm(clamp((T - 18.2) / 0.15))) : T < 49 ? lerp(1, 0.12, MO.cubicOut(clamp((T - SHOT.EXP_OPEN) / 0.12))) : lerp(0.12, 0.55, sm(clamp((T - 49) / 1.2)));
  st.flowExp = T < SHOT.EXP_OPEN ? 0 : T < 48.5 ? Math.max(0.25, Math.exp(-(T - SHOT.EXP_OPEN) / 3.5)) : Math.max(0, 0.25 * (1 - (T - 48.5) / 1.5));
  st.timer = T < SHOT.TRIG ? clamp((T - 3) / (SHOT.TRIG - 3)) : T < SHOT.TRIG + 0.25 ? 1 : clamp((T - SHOT.TRIG - 0.25) / (SHOT.TRIG2 - SHOT.TRIG - 0.25));
  if (T >= SHOT.TRIG2 && T < SHOT.TRIG2 + 0.25) st.timer = 1;
  st.vol = T < SHOT.OPEN_V ? 0 : T < SHOT.TARGET ? clamp((T - SHOT.OPEN_V) / (SHOT.TARGET - SHOT.OPEN_V)) : T < 43 ? 1 : 0;
  return st;
};
SHOT.init = () => {};
})();
