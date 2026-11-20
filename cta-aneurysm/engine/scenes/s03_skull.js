// S03 INSIDE THE SKULL (8–12 s): from the S01 close view the artery network turns from the front to the patient's right
// side while the camera pulls back: the brain grows round it, then the skull, its near half cut away so the arteries stay
// in view; at the end the head lies back (face up) on the CT table — the pose S04 finds it in.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const viewAt = t => {
  const r = MO.cubicInOut(clamp((t - 0.1) / 2.2)), z = MO.cubicInOut(clamp((t - 0.0) / 2.8)), lie = MO.cubicInOut(clamp((t - 2.3) / 1.5));
  const a = VES.AN.cDraw;
  return { yaw: lerp(-0.16, Math.PI / 2, r), pitch: lerp(lerp(0.32, 0.12, r), 0, lie), roll: lerp(0, Math.PI / 2, lie), s: K.zl(4.6, 1.0, z), cx: lerp(W / 2, W / 2 - 30, lie), cy: lerp(360, 318, z),
    ox: lerp(a[0] * 0.8, 0, z), oy: lerp(a[1] * 0.8, 4, z), oz: lerp(a[2] * 0.8 + 3, 8, z) };
};
// both renderers share one frame: convert the view's centre offset into a screen offset of the head's origin
const zeroed = v => { const [X, Y] = VES.view(v)(-v.ox, -v.oy, -v.oz); return { ...v, cx: v.cx + v.s * X, cy: v.cy - v.s * Y, ox: 0, oy: 0, oz: 0 }; };
window.S03 = { viewAt, zeroed };
SC['s03_skull'] = {
  draw(c, t, S) {
    const v = zeroed(viewAt(t)), lie = MO.smooth(clamp((t - 2.6) / 1.2));
    // the CT table under the lying head (slate, in screen space)
    if (lie > 0) {
      // the table just under the occiput, and the body under its blanket running off to the right (silhouette only)
      const occ = VES.proj(v, 0, -104, 12), y = Math.round(occ[1] + 3), nk = VES.proj(v, 0, -20, -112);
      K.dith(c, 0, y, W, 12, 'g3', lie); K.dith(c, 0, y, W, 2, 'g5', lie); K.dith(c, 0, y + 12, W, 30, 'g1', lie);
      const bx = Math.round(nk[0] - 6), top = Math.round(y - 128 * v.s);
      c.save(); c.globalAlpha = 1; const p = new Path2D(); p.moveTo(bx, y); p.lineTo(bx, top + 34); p.quadraticCurveTo(bx + 30, top, bx + 90, top + 4); p.lineTo(W + 10, top + 8); p.lineTo(W + 10, y); p.closePath();
      c.restore(); K.dith(c, 0, 0, 0, 0, 'k', 0);
      c.save(); c.clip(p); K.dith(c, bx, top, W - bx, y - top, 'h1', lie); K.dith(c, bx, top, W - bx, 3, 'h2', lie); c.restore();
    }
    const sk = MO.smooth(clamp((t - 1.2) / 1.0));
    const img = c.getImageData(0, 0, W, H);
    if (sk > 0) {
      const view = SKULL.view(v), V = SKULL.V;
      SKULL.render(img, { ...v, show: m => view(V.x[m], V.y[m], V.z[m])[2] < -2 && (sk >= 1 || ((m * 2654435761) >>> 0) % 1000 / 1000 < sk), outline: true, gain: 1.05 });
    }
    c.putImageData(img, 0, 0);
    BRAIN.backdrop(c, v, { a: MO.smooth(clamp((t - 0.35) / 0.9)) * 0.9, t });
    const im2 = c.getImageData(0, 0, W, H);
    VES.render(im2, { ...v, mode: 'blood', fadeZ: [-70, -46] });
    c.putImageData(im2, 0, 0);
    const a = VES.anScreen(v);
    VES.ring(c, a.x, a.y, Math.max(4, a.r + 5), 1 - MO.smooth(clamp((t - 0.2) / 0.8)), S.t);
    CAP.ctx(c, t, { text: 'KƏLLƏ DAXİLİNDƏ', t0: 0.9, t1: 3.6 });
  },
  cues: [[0, 'pull_back', 0.8, 0, 2.6], [1.2, 'bone_in', 0.7, 0, 1.0], [0.9, 'type', 0.4], [2.4, 'lie_down', 0.6, 0, 1.5], [3.6, 'table_thud', 0.5]],
};
})();
