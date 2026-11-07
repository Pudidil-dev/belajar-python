// S12 BREMSSTRAHLUNG (44–48 s): at the bend one yellow X-ray photon is emitted near the nucleus and flies off; the electron
// goes on, deflected and slower. Two teaching bars: the electron's energy drops, the photon carries the difference. The
// electron does not turn into the photon; the nucleus is unchanged. Both outgoing paths stay drawn. Camera locked.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CPH = 17;
SC['s12_brems'] = {
  draw(c, t, S) {
    const cam = window.BREMS.CAM(), b = window.BREMS.build(), tr = b.feat.tr, te = window.BREMS.TE;
    TW.draw(c, cam, S.t, { vib: 0.5, gain: 0.8 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the photon (emission point = where the pass clock reaches tEmit)
    const ft = b.BT(S.t) - b.feat.t0, age = ft - tr.tEmit;
    const va = Math.atan2(tr.emitVy, tr.emitVx), cr = (tr.emitX - b.A.x) * tr.emitVy - (tr.emitY - b.A.y) * tr.emitVx, ang = va + (cr > 0 ? -0.5 : 0.5);
    const [ex, ey] = K.S(cam, tr.emitX, tr.emitY);
    if (age > 0) {
      const d = age * CPH, [qx, qy] = K.S(cam, tr.emitX + Math.cos(ang) * d, tr.emitY + Math.sin(ang) * d);
      for (let k = 6; k < d * cam.z; k += 5) PIX.rect(c, Math.round(ex + Math.cos(ang) * k), Math.round(ey + Math.sin(ang) * k), 1, 1, 'y1');
      if (age < 0.35) { FX.flash(c, ex, ey, 12 * (1 - age / 0.35), 'y4', 1 - age / 0.35); FX.ring(c, ex, ey, 8 + age * 140, 'y2', 1 - age / 0.35); }
      FX.ph(c, qx, qy, ang, 10, 30, 7, clamp(age / 0.08));
    }
    window.BREMS.drawPass(c, cam, S.t, { long: true, noPull: age > 0.3 });
    // energy bars: electron (cyan) before → after, photon (yellow) the difference
    const em = clamp(age / 0.25), ma = MO.smooth(clamp((t - 0.05) / 0.2));
    if (ma > 0) {
      c.save(); c.globalAlpha = ma; const x = 44, w = 272;
      for (const [y, f, col, hi, sym] of [[520, 1 - em / 3, 'c2', 'c4', 'e⁻'], [546, em / 3, 'y2', 'y4', 'γ']]) {
        PIX.rect(c, x - 3, y - 3, w + 6, 16, 'k'); PIX.rect(c, x, y, w, 10, 'n2'); PIX.rect(c, x, y, Math.round(w * f), 10, col); PIX.rect(c, x, y, Math.round(w * f), 2, hi);
        PIX.text(c, sym, x - 18, y + 1, hi, { shadow: null });
      }
      c.restore();
    }
    CAP.ctx(c, t, { text: 'TORMOZLANMA ŞÜALANMASI', t0: 0.5, t1: 3.6 });
  },
  cues: () => [[window.BREMS.TE - 44, 'photon_big', 1.0, 0.3], [0.5, 'type', 0.4], [0.6, 'bar_fill', 0.5, 0], [1.4, 'photon_tail', 0.5, 0.5, 1.6]],
};
})();
