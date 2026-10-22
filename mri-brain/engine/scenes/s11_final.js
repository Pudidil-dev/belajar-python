// S11 HOW MRI MACHINES WORK (65–70 s): the camera pulls back fast from the brain to the room: the model floats in
// front of the radiology monitor that computed it, the scanner behind the window. The chain flashes past — hydrogen,
// magnetic field, radio waves, signals, 3D image — while the brain turns once more to the opening's angle. Then the
// film rewinds into its first frame: the brain folds back into slices and the slices back into the screen, so the
// last frame is the first one (a seamless loop).
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth;
const S1 = window.S01, S10 = window.S10;
const T_RW = 4.45;                                                             // the rewind into the first frame
const Z0 = Math.pow(2.3 / 1.32, 1 / 1.12);                                     // room zoom that matches S10's last frame
const zoom = t => Math.exp(Math.log(Z0) * (1 - MO.cubicOut(clamp(t / 0.95))));
const camAt = t => { const Z = zoom(t); return { x: lerp(135, S1.CX, 1 - 1 / Z), y: lerp(240, S1.CY, 1 - 1 / Z), z: Z }; };
const YAW_E = 2 * Math.PI - Math.PI / 4;
const viewAt = t => { const Z = zoom(t), cam = camAt(t), [sx, sy] = PIX.toScreen(cam, S1.CX, S1.CY);
  return { cx: sx, cy: sy, s: 1.32 * Math.pow(Z, 1.12), yaw: YAW_E + 2 * Math.PI * io(clamp(t / T_RW)), pitch: 0.28 }; };
const CHAIN = [['HYDROGEN', 'y3'], ['MAGNETIC FIELD', 'c3'], ['RADIO WAVES', 'v3'], ['SIGNALS', 'e2'], ['3D IMAGE', 'm4']];
SC['s11_final'] = {
  draw(c, t, S) {
    if (t >= T_RW) {                                                           // rewind: the opening played backwards, landing on frame 0
      const u = clamp((t - T_RW) / (4.95 - T_RW)), t01 = u >= 1 ? 0 : 2.0 * (1 - MO.cubicIn(u) * 0.85 - 0.15 * u);
      SC['s01_monitor'].draw(c, Math.max(0, t01), S);
      return;
    }
    const cam = camAt(t), o = viewAt(t);
    ROOM.draw(c, cam, S.t, { img: ROOM.slice(ROOM.HOME), idx: ROOM.HOME, fade: 0, mode: '3d' });
    const img = K.pbegin(c); VOL.render(img, { ...o, outline: true }); K.pend(c, img);
    // the chain, one link per beat
    const y0 = 438;
    let x = 0; const parts = [];
    CHAIN.forEach(([s, col], i) => parts.push([s, col, 1.0 + 0.45 * i]));
    const line1 = parts.slice(0, 3), line2 = parts.slice(3);
    for (const [L, yy] of [[line1, y0], [line2, y0 + 12]]) {
      const txt = L.map(p => p[0]).join(' → '), w = PIX.textWidth(txt); let xx = Math.round(135 - w / 2);
      if (t > L[0][2] && t < 4.35) PIX.rect(c, xx - 3, yy - 2, w + 6, 11, 'k');
      L.forEach(([s, col, t0], i) => {
        if (i > 0) { if (t > t0 && t < 4.35) PIX.text(c, '→', xx + PIX.textWidth(' ') + 1, yy, 'g7', { shadow: null }); xx += PIX.textWidth(' → ') + 1; }
        const n = CAP.typed(s, t, t0, 4.35);
        if (n > 0) PIX.text(c, s, xx, yy, col, { n });
        xx += PIX.textWidth(s) + 1;
      });
    }
    if (t > 3.0 && t < 3.3) FX.ring(c, 135, 34, 30 + (t - 3.0) * 400, 'c4', 1 - (t - 3.0) / 0.3);
    // the title
    for (const [s, y, t0] of [['HOW MRI', 14, 2.9], ['MACHINES WORK', 36, 3.05]]) {
      const n = CAP.typed(s, t, t0, 4.4); if (n <= 0) continue;
      const tw = PIX.textWidth(s, 2), tn = PIX.textWidth([...s].slice(0, n).join(''), 2); PIX.rect(c, Math.round(W / 2 - tw / 2) - 4, y - 4, tn + 9, 22, 'k');
      PIX.text(c, s, W / 2, y, 'w', { sc: 2, align: 'center', n });
    }
  },
  cues: () => {
    const q = [[0, 'zoom_out', 1.0, 0, 0.95], [0.95, 'room_tone', 0.5, 0, 3.4]];
    CHAIN.forEach((s, i) => q.push([1.0 + 0.45 * i, 'step', 0.75, (i - 2) * 0.25, i]));
    q.push([2.9, 'type', 0.5], [3.0, 'final_impact', 1.0, 0], [3.4, 'completion', 0.9, 0], [T_RW, 'rewind', 0.9, 0, 5 - T_RW]);
    return q;
  },
};
})();
