// S17 (118–120 s): the finished 3D skull on the workstation screen turns back toward the opening pose; the camera eases
// out just enough to show the monitor's edge, the title types on, and the camera returns to the screen: the last frame
// runs straight into the first.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp;
const yawAt = t => { const y16 = MON.POSE.yaw + 0.25; return lerp(y16, MON.POSE.yaw, MO.sineInOut(clamp(t / 1.9))); };
const pitchAt = t => lerp(MON.POSE.pitch + 0.05, MON.POSE.pitch, MO.sineInOut(clamp(t / 1.9)));
// distance of the camera from the screen: out and back (350 mm fills the frame exactly)
const distAt = t => 350 + 260 * Math.sin(Math.PI * MO.sineInOut(clamp((t - 0.05) / 1.9)));
SC['s17_final'] = {
  draw(c, t, S) {
    const view = { ...MON.POSE, yaw: yawAt(t), pitch: pitchAt(t) }, d = distAt(t);
    if (d < 351) MON.draw(c, view, { cutWin: [40, 110] });
    else {
      const M = ROOM.G.MON, sc = [M.x, M.y + 135 + M.h / 2, M.z];
      const C = ROOM.camera([sc[0], sc[1] + (d - 350) * 0.12, sc[2] + d], [sc[0], sc[1], sc[2]], [0, 1, 0], 300);
      const mips = MON.texture(view, { cutWin: [40, 110] }), a = ROOM.proj(C, [M.x, M.y + 135, M.z]), b = ROOM.proj(C, [M.x, M.y + 135 + M.h, M.z]);
      PIX.rect(c, 0, 0, W, H, 'k');
      const img = K.pbegin(c); ROOM.render(img, C, { t: S.t, tz: 0, screen: MON.mip(mips, Math.abs(a[1] - b[1])), led: 1 }); K.pend(c, img);
    }
    // the title, centred in the safe area
    const ta = MO.smooth(clamp((t - 0.25) / 0.2)) * (1 - MO.smooth(clamp((t - 1.78) / 0.18)));
    if (ta > 0) {
      c.save(); c.globalAlpha = ta;
      const s = 'HOW CT SCANNERS WORK', n = Math.floor((t - 0.25) * 70), w = PIX.textWidth(s, 2);
      PIX.rect(c, 135 - w / 2 - 6, 96, w + 12, 24, 'k');
      PIX.text(c, s, 135, 101, 'w', { sc: 2, align: 'center', n });
      c.restore();
    }
  },
  cues: () => [[0, 'whoosh_soft', 0.6, 0, 0.9], [0.25, 'title_hit', 1, 0], [1.0, 'clean_tone', 0.7, 0], [1.5, 'whoosh_in', 0.7, 0, 0.5]],
};
})();
