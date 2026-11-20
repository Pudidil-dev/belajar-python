// S01 HOOK (0–4 s): the X-ray room. The tube clicks on, the X-RAY lamp turns red, a pulse; the radiograph pops up on
// the monitor; then the camera rushes up into the tube head and its housing starts to open (continued in S02).
(() => {
const { W, H } = PIX;
const ROOMCAM0 = { x: 150, y: 252, z: 1.0 }, ROOMCAM1 = { x: 152, y: 246, z: 1.06 };
const Z_END = 1.25 / ROOM.TS;                        // = S02's opening zoom (1.25 px/mm on the tube)
const TUBE_C = ROOM.tube(0, -40);                    // tube centre in room px
// camera over the scene's local time; exported so S14 can mirror it
const camAt = t => {
  if (t < 2.5) { const p = MO.sineInOut(U.clamp(t / 2.5)); return { x: U.lerp(ROOMCAM0.x, ROOMCAM1.x, p), y: U.lerp(ROOMCAM0.y, ROOMCAM1.y, p), z: K.zl(ROOMCAM0.z, ROOMCAM1.z, p) }; }
  const q = U.clamp((t - 2.5) / 1.5);
  const e = Math.pow(q, 2.2);                        // accelerating rush
  return { x: U.lerp(ROOMCAM1.x, TUBE_C[0], MO.cubicOut(q) * 0.3 + e * 0.7), y: U.lerp(ROOMCAM1.y, TUBE_C[1], MO.cubicOut(q) * 0.3 + e * 0.7), z: K.zl(ROOMCAM1.z, Z_END, e) };
};
window.CUT_AT = T => MO.smooth(U.clamp((T - 3.25) / 1.45));      // housing cutaway over film time (S01 → S02)
SC['s01_hook'] = {
  init() { HAND.init(); },
  draw(c, t, S) {
    let cam = camAt(t);
    const shake = t > 1.0 && t < 1.22 ? Math.round(Math.sin(t * 90)) : 0;
    cam = { ...cam, x: cam.x + shake / cam.z };
    K.cam(c, cam);
    const lamp = t >= 1.0 ? 1 : 0, pulse = t >= 1.0 && t < 1.32 ? Math.pow(1 - (t - 1.0) / 0.32, 1.5) : 0;
    ROOM.draw(c, { t: S.t, z: cam.z, lamp, pulse, led: t > 1.05 && t < 1.6 ? 1 : 0, cut: CUT_AT(S.t), spin: 1.2, fil: 0.35, hv: t > 1.0 && t < 1.3 ? 1 : 0 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the radiograph arrives on the monitor (scan), then pops out big for a beat
    const rv = U.clamp((t - 1.25) / 0.4);
    ROOM.monitorImage(c, cam, { reveal: rv });
    const pop = t < 1.45 ? 0 : t < 2.3 ? MO.backOut(U.clamp((t - 1.45) / 0.3), 1.6) : 1 - MO.cubicIn(U.clamp((t - 2.3) / 0.22));
    if (pop > 0.02) {
      const M = ROOM.MON, [mx, my] = K.S(cam, M.x + M.w / 2, M.y + M.h / 2);
      const w = U.lerp(M.w * cam.z, 132, pop), h_ = w * 1.3, cx = U.lerp(mx, 82, pop), cy = U.lerp(my, 238, pop);
      PIX.rect(c, Math.round(cx - w / 2) - 3, Math.round(cy - h_ / 2) - 3, Math.round(w) + 6, Math.round(h_) + 6, 'd2');
      PIX.rect(c, Math.round(cx - w / 2) - 1, Math.round(cy - h_ / 2) - 1, Math.round(w) + 2, Math.round(h_) + 2, 'd5');
      PIX.rect(c, Math.round(cx - w / 2), Math.round(cy - h_ / 2), Math.round(w), Math.round(h_), 'k');
      HAND.draw(c, Math.round(cx - w / 2), Math.round(cy - h_ / 2), Math.round(w), Math.round(h_), { marker: w > 100 });
    }
    // labels: what is in the room
    const L = (wx, wy) => K.S(cam, wx, wy);
    const lt1 = 2.3;
    { const [ax, ay] = L(...ROOM.tube(178, -60)); CAP.note(c, t, { ax, ay, x: 214, y: 112, text: 'X-RAY TUBE', t0: 0.55, t1: lt1 }); }
    { const [ax, ay] = L(196, 333); CAP.note(c, t, { ax, ay, x: 214, y: 300, text: 'HAND', t0: 0.75, t1: lt1 }); }
    { const [ax, ay] = L(150, 351); CAP.note(c, t, { ax, ay, x: 150, y: 384, text: 'DETECTOR', t0: 0.95, t1: lt1, align: 'center' }); }
    // title + context (the hook)
    const n = CAP.typed('HOW X-RAYS ARE MADE', t, 0.45, 3.55);
    if (n > 0) { const tw = PIX.textWidth('HOW X-RAYS ARE MADE', 2); PIX.rect(c, Math.round(W / 2 - tw / 2) - 4, 26, tw + 9, 22, 'k'); PIX.text(c, 'HOW X-RAYS ARE MADE', W / 2, 30, 'w', { sc: 2, align: 'center', n }); }
    const n2 = CAP.typed('One click shows the bones. How?', t, 1.2, 3.55);
    if (n2 > 0) { const tw = PIX.textWidth('One click shows the bones. How?'); PIX.rect(c, Math.round(W / 2 - tw / 2) - 3, 49, tw + 7, 12, 'k'); PIX.text(c, 'One click shows the bones. How?', W / 2, 52, 'd9', { align: 'center', n: n2 }); }
  },
  cues: [[0, 'room_tone', 1, 0, 2.5], [0.45, 'type', 0.6], [0.55, 'blip', 0.5, 0.5], [0.75, 'blip', 0.5, 0.4], [0.95, 'blip', 0.5, 0],
    [1.0, 'click', 1], [1.0, 'xray_pulse', 1], [1.25, 'image_ping', 0.9, -0.4], [1.45, 'pop', 0.7, -0.4], [2.3, 'pop_out', 0.4, -0.3],
    [2.5, 'zoom_rush', 1, 0, 1.5], [3.25, 'cut_open', 0.8, 0, 1.4]],
};
})();
