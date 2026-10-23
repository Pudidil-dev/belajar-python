// S01 (0–3 s) — the result first: the live image of a fetus on the monitor, a refresh line sweeping once per beat;
// "ULTRASOUND" types on; at 2.0 s the camera punches into the image until the scan lines and samples it is made of show
// as cells — a map of echoes, not a photograph.
(() => {
const S = SC.s01_hook = {};
S.TGT = (() => { const [x, y] = ROOM.fanW(-1.9, 5.1); return { x, y, z: 48 }; })();
S.cam = lt => lt < 2 ? ROOM.HOOK : K.zoomPath(ROOM.HOOK, S.TGT, MO.cubicInOut(U.clamp((lt - 2) / 0.36)));
S.draw = (c, lt, info) => {
  const t = info ? info.t : lt, cam = S.cam(lt);
  ROOM.drawWall(c, cam);
  ROOM.drawMachine(c, cam, t, {});
  CAP.scene(c, lt, { title: 'ULTRASOUND', ctx: 'SEEING INSIDE THE BODY', t0: 0.15, t1: 2.07 });
};
// [time, sound, gain, pan]
S.cues = [[0, 'click', 1], [0, 'impact', 1], [0.5, 'scan', 0.7], [1.0, 'scan', 0.7], [1.5, 'scan', 0.7], [1.86, 'whoosh', 1], [2.36, 'thud', 0.7], [2.5, 'scan', 0.5]];
})();
