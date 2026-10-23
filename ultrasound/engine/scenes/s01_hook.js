SC.s01_hook = { draw(c, lt) {
  const t = lt, v = window.__testView || 0;
  const cams = [ROOM.HOOK, { x: 0, y: -150, z: 3.3 }, { x: 0, y: -106, z: 5.4 }];
  ROOM.draw(c, cams[v], t, { cut: v === 2 ? 1 : 0 });
} };
