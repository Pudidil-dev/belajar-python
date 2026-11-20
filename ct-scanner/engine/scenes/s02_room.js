// S02 HOW DOES CT SEE INSIDE THE BODY? (4–10 s): the pull-back that began at 3 s keeps going: the screen is a portrait
// monitor on the operator's desk; behind it the lead-glass window and, through it, the scan room — the white ring of the
// gantry, the patient on the table. The camera flies over the monitor and through the window, arcs round to the back
// of the gantry while the table slides the patient's head into the bore, and approaches until the ring fills the frame.
// The computer and the scanner stay clearly apart: the monitor is in the control room, the gantry beyond the glass.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
// camera keyframes (film seconds): position, target
const KEYS = [
  [3.0, [-1250, 95, 3910], [-1250, 95, 3560]],
  [4.0, [-1250, 130, 4500], [-1250, 95, 3560]],
  [5.3, [-1050, 800, 5300], [-600, -100, 800]],
  [6.5, [-1600, 480, 2400], [-300, -180, -500]],
  [7.7, [-2550, 650, -200], [0, -260, -700]],
  [8.9, [-1700, 260, 1750], [0, -40, 0]],
  [10.0, [0, 60, 2250], [0, 0, 0]],
];
// Catmull-Rom through the keys, with each segment's time eased (k75 at the ends, smooth in between)
const cr = (p0, p1, p2, p3, u) => p1.map((_, i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u * u + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u * u * u));
const pathAt = T => {
  T = clamp(T, KEYS[0][0], KEYS[KEYS.length - 1][0]);
  let i = 0; while (i < KEYS.length - 2 && T > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], q = (T - a[0]) / (b[0] - a[0]);
  // the first segment starts from rest and accelerates (log-like pull-back); the rest move smoothly
  const u = i === 0 ? MO.cubicIn(q) * 0.85 + q * 0.15 : i === KEYS.length - 2 ? MO.cubicOut(q) : MO.sineInOut(q) * 0.5 + q * 0.5;
  const P = k => KEYS[Math.max(0, Math.min(KEYS.length - 1, k))];
  return { pos: cr(P(i - 1)[1], a[1], b[1], P(i + 2)[1], u), tgt: cr(P(i - 1)[2], a[2], b[2], P(i + 2)[2], u) };
};
const camAt = T => { const { pos, tgt } = pathAt(T); return ROOM.camera(pos, tgt, [0, 1, 0], 300); };
const tzAt = T => lerp(-760, 0, MO.cubicInOut(clamp((T - 6.0) / 2.6)));
// the monitor's texture (the skull keeps turning slowly on it)
let MIPS = null, MIPT = -1;
const screenAt = (T, C) => {
  const M = ROOM.G.MON, a = ROOM.proj(C, [M.x, M.y + 135, M.z]), b = ROOM.proj(C, [M.x, M.y + 135 + M.h, M.z]);
  if (!a || !b) return null;
  const projH = Math.abs(a[1] - b[1]);
  if (MIPT !== T) { MIPS = MON.texture(window.S01.viewAt(T), { cutWin: [40, 110] }); MIPT = T; }
  return MON.mip(MIPS, projH);
};
window.S02 = { camAt, tzAt, pathAt };
window.S02.drawRoom = (c, T, S) => {
  const C = camAt(T);
  PIX.rect(c, 0, 0, W, H, 'k');
  const img = K.pbegin(c);
  ROOM.render(img, C, { t: T, tz: tzAt(T), screen: T < 7.4 ? screenAt(T, C) : null, led: 1 });
  K.pend(c, img);
};
SC['s02_room'] = {
  draw(c, t, S) {
    window.S02.drawRoom(c, S.t, S);
    CAP.cap(c, t, { l2: ['HOW DOES CT SEE', 'INSIDE THE BODY?'], t0: 0.35, t1: 5.75, acc: 'c3' });
  },
  cues: () => [[0, 'whoosh_long', 0.9, 0, 2.0], [0.3, 'room_tone', 0.5, 0, 5.6], [2.0, 'table_motor', 0.6, 0.2, 2.6], [2.9, 'air_glide', 0.6, -0.3, 1.6], [4.4, 'approach', 0.6, 0, 1.4]],
};
})();
