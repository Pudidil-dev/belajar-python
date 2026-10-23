// S01 MRI (0–3 s): the result first. A radiology monitor shows a T1 axial slice of the film's patient. The viewer scrolls
// through the series, then the stack leaves the screen: 18 axial slices (7 mm apart) peel off, fan out toward the
// viewer, turn into horizontal planes and click into place at their real heights; the volume they make is rendered
// voxel by voxel and the 3D brain stands in front of the monitor by 2 s — a computer reconstruction, shown as one.
// It turns 45° to a side view under a cyan scan line while the camera rushes at its centre.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth;
const N = STACK.N, KH = 11;                                         // card 11 (z = 13 mm) is the one on screen
const tA = k => 0.30 + 0.022 * Math.abs(k - KH), tB = k => 0.80 + 0.045 * k, DB = 0.32;
const tLand = z => tB(clamp((z + 64) / 7, 0, N - 1)) + DB;
const yaw = t => t < 1 ? -0.30 : t < 2 ? lerp(-0.30, -Math.PI / 4, io(t - 1)) : lerp(-Math.PI / 4, -Math.PI / 2, io(t - 2));
const pitch = t => t < 1 ? 0.45 : t < 2 ? lerp(0.45, 0.28, io(t - 1)) : lerp(0.28, 0.06, io(t - 2));
const ZOOM_T = 2.45, CX = 135, CY = 226;
const zoom = t => t < ZOOM_T ? 1 : Math.exp(Math.log(2.4) * MO.cubicInOut(clamp((t - ZOOM_T) / (3 - ZOOM_T))));
const camAt = t => { const Z = zoom(t); return { x: lerp(135, CX, 1 - 1 / Z), y: lerp(240, CY, 1 - 1 / Z), z: Z }; };
// the brain's view: centred on the monitor, growing with the push (it sits in front of the monitor: parallax 1.12)
const viewAt = t => { const Z = zoom(t), c = camAt(t), [sx, sy] = PIX.toScreen(c, CX, CY);
  return { cx: sx, cy: sy, s: 1.32 * Math.pow(Z, 1.12), yaw: yaw(t), pitch: pitch(t) }; };
const scanZ = t => lerp(66, -86, MO.cubicInOut(clamp((t - 2.05) / 0.8)));
window.S01 = { viewAt, camAt, yaw, pitch, CX, CY, zoom };
SC['s01_monitor'] = {
  draw(c, t, S) {
    const cam = camAt(t), o = viewAt(t);
    // the monitor: scroll through the series (0–0.3 s), a refresh beam, then the image leaves with the cards
    const idx = t < 0.3 ? ROOM.HOME + Math.round(6 * Math.sin(Math.PI * t / 0.3)) : ROOM.HOME;
    const uHome = sm(clamp((t - tA(KH)) / 0.25));
    ROOM.draw(c, cam, t, { img: ROOM.slice(idx), idx, scan: clamp(t / 0.3), fade: 1 - uHome, mode: t > 0.55 ? '3d' : '2d' });
    // the cards: flying ones are drawn over the brain; a landed card becomes the brain's top layer
    const mon = STACK.monitorPose(cam), flying = [], flashes = [];
    let front = -67.5;
    for (let k = 0; k < N; k++) {
      const uB = sm(clamp((t - tB(k)) / DB)); front += 7 * uB;
      if (t < tA(k)) continue;
      const fin = STACK.brainPose(o, k);
      const uA = sm(clamp((t - tA(k)) / 0.5));
      // fanned out in front of the screen: mostly still facing the viewer, spread top to bottom, lifted toward us
      const mid = STACK.lerpPose(mon, fin, 0.3), dk = k - KH;
      const E = { ...mid, s: lerp(mon.s, fin.s, 0.5) * (1.12 + 0.012 * dk), x: lerp(mon.x, fin.x, 0.5) + dk * 1.5, y: lerp(mon.y, fin.y, 0.4) - dk * o.s * 7, d: fin.d + 40 + dk };
      const A = STACK.lerpPose({ ...mon, d: mon.d - Math.abs(dk) }, E, uA), P = STACK.lerpPose(A, fin, uB);
      if (uB < 1) flying.push({ k, P, a: 1 });
      else if (t < tB(k) + DB + 0.07) flashes.push(P);
    }
    // the voxel brain grows under the landed cards, capped by its own cross-section (the newest slice, in MRI gray)
    if (t > tB(0)) {
      const img = K.pbegin(c), Sv = VOL.S, zs = scanZ(t), sc = t > 2.03 && t < 2.9, done = t > tB(N - 1) + DB;
      const c5 = PIX.hex(PIX.P.c5), c3 = PIX.hex(PIX.P.c3), c2 = PIX.hex(PIX.P.c2);
      VOL.render(img, { ...o, outline: done, clip: done ? null : { n: [0, 0, 1], d: front }, cut: !done,
        over: sc ? (m => { const d = Math.abs(Sv.z[m] - zs); return d < 1.3 ? c5 : d < 3 ? c3 : d < 6 && Sv.h[m] < 0.5 ? c2 : null; }) : null });
      K.pend(c, img);
    }
    STACK.draw(c, flying);
    // a card clicking into place flashes at its edge
    for (const P of flashes) FX.flash(c, P.x + 62 * P.s * P.M[0], P.y - 62 * P.s * P.M[3], 3, 'c4', 0.9);
    // completion: a ring from the brain's centre; the label
    if (t > 2.0 && t < 2.45) { const [bx, by] = VOL.proj(o, 0, -3, 0), u = (t - 2.0) / 0.45; FX.ring(c, bx, by, 60 + u * 150, u < 0.5 ? 'c4' : 'c2', 1 - u); }
    if (t > 0.3 && t < 0.42) { const [mx, my] = PIX.toScreen(cam, ROOM.IMG.cx, ROOM.IMG.cy); FX.ring(c, mx, my, 20 + (t - 0.3) * 900, 'c3', 1 - (t - 0.3) / 0.12); }
    CAP.scene(c, t, { title: 'MRI', t0: 2.0, acc: 'c3' });
  },
  cues: () => {
    const q = [[0, 'activate', 1.0, 0], [0, 'scroll', 0.6, 0, 0.3], [0.30, 'impact_digital', 1.0, 0], [0.80, 'assemble', 0.9, 0, 1.1],
      [1.40, 'holo_whoosh', 0.8, 0, 0.6], [2.00, 'recon_impact', 1.0, 0], [2.05, 'scanline', 0.6, 0.3, 0.8], [2.50, 'zoom_fast', 0.9, 0, 0.5]];
    return q;
  },
};
})();
