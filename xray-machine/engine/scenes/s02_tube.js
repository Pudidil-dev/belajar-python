// S02 VACUUM TUBE (4–8 s): the housing opens into a cross-section; the camera overshoots into the tube, settles back
// to show the whole insert, tracks from the anode to the cathode while the parts are named, then pushes into the
// cathode cup (continued in S03).
(() => {
const { W, H } = PIX;
const C0 = { x: 0, y: -40, z: 1.25 }, C1 = { x: 8, y: -40, z: 1.62 }, C2 = { x: 12, y: -30, z: 0.8 }, C3 = { x: -12, y: -26, z: 0.86 };
const CUP = { x: -21.4, y: 0, z: 7.5 };
window.S02_CAM_END = CUP;
const camAt = t => {
  if (t < 0.5) return K.camLerp(C0, C1, MO.cubicOut(t / 0.5));
  if (t < 1.6) return K.camLerp(C1, C2, MO.sineInOut((t - 0.5) / 1.1));
  if (t < 3.0) return K.camLerp(C2, C3, MO.sineInOut((t - 1.6) / 1.4));
  const q = U.clamp((t - 3.0) / 1.0), e = Math.pow(q, 2.4);
  return { x: U.lerp(C3.x, CUP.x, MO.sineInOut(q)), y: U.lerp(C3.y, CUP.y, MO.sineInOut(q)), z: K.zl(C3.z, CUP.z, e) };
};
SC['s02_tube'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    const hv = U.clamp((t - 2.45) / 0.3);
    const drawTube = cc => { K.cam(cc, cam); TUBE.draw(cc, { z: cam.z, t: S.t, cut: CUT_AT(S.t), spin: 1.2, fil: 0.35 + 0.15 * U.clamp((t - 3) / 1), hv }); };
    const drawRoom = cc => { K.cam(cc, { x: ROOM.TX + cam.x * ROOM.TS, y: ROOM.TY + cam.y * ROOM.TS, z: cam.z / ROOM.TS }); ROOM.draw(cc, { t: S.t, z: cam.z / ROOM.TS, lamp: 1, cut: CUT_AT(S.t), spin: 1.2, fil: 0.35 }); };
    const fr = U.clamp((t - 0.12) / 0.4);
    if (fr >= 1) drawTube(c); else dissolve(c, drawRoom, drawTube, fr);
    K.cam(c, cam);
    // terminal signs
    if (cam.z < 2) {
      const [mx, my] = K.S(cam, -164, -40), [px_, py] = K.S(cam, 164, -40);
      if (mx > 8 && mx < W - 8) PIX.text(c, '−', mx, my - 3, 'c2', { align: 'center' });
      if (px_ > 8 && px_ < W - 8) PIX.text(c, '+', px_, py - 3, 'o1', { align: 'center' });
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    const L = (x, y) => K.S(cam, x, y), t1 = 3.0;
    { const [ax, ay] = L(2, -70); CAP.note(c, t, { ax, ay, x: 196, y: 140, text: 'ANODE (+)', t0: 1.15, t1, col: 'o2' }); }
    { const [ax, ay] = L(-28, -10); CAP.note(c, t, { ax, ay, x: 30, y: 330, text: 'CATHODE (−)', t0: 1.55, t1, col: 'c3' }); }
    { const [ax, ay] = L(-46, -78); CAP.note(c, t, { ax, ay, x: 36, y: 150, text: 'VACUUM', t0: 1.95, t1 }); }
    { const [ax, ay] = L(146, -190); CAP.note(c, t, { ax, ay, x: 258, y: 96, text: 'HIGH VOLTAGE', t0: 2.35, t1, align: 'right' }); }
    CAP.note(c, t, { x: 258, y: 107, text: '80,000 V', t0: 2.55, t1, align: 'right', col: 'y2' });
    CAP.scene(c, t, { title: 'VACUUM TUBE', ctx: 'A cathode and an anode, sealed in vacuum.', t0: 0.12, t1: 3.9 });
  },
  cues: [[0, 'tube_hum', 0.8, 0, 4], [0.12, 'type', 0.5], [1.15, 'blip', 0.5, 0.5], [1.55, 'blip', 0.5, -0.5], [1.95, 'blip', 0.5, -0.3],
    [2.35, 'hv_charge', 0.8, 0.4], [3.0, 'push_in', 0.8, -0.2, 1.0]],
};
})();
