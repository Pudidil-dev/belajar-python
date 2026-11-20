// S04 CT ANGIOGRAPHY (12–16 s): the scan room from the patient's right side. The table slides the head into the ivory
// gantry; next to the table a power injector stands with its syringe of contrast (violet: the film's colour code) and
// IV tubing to the patient's right arm. A violet pulse runs down the tubing, the gantry fires, and the image lands on
// the workstation monitor in the foreground. Camera: a slow lateral glide along the table.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const q = MO.sineInOut(clamp(t / 4)); return ROOM.camera([lerp(2350, 2150, q), lerp(760, 700, q), lerp(-2500, -2100, q)], [lerp(-40, 0, q), -260, lerp(-760, -560, q)], [0, 1, 0], 300); };
const tzAt = t => lerp(-700, 0, MO.cubicInOut(clamp((t - 0.1) / 1.6)));
// the injector (world mm): pedestal on the floor, head with the syringe; the tubing ends at the right forearm
const INJ = [1050, -380, -1650], ARM = [300, -80, -1000];
const tubePts = () => { const pts = []; for (let k = 0; k <= 24; k++) { const q = k / 24; pts.push([lerp(INJ[0] - 30, ARM[0], q), lerp(INJ[1] + 40, ARM[1], q) - Math.sin(Math.PI * q) * 160, lerp(INJ[2] + 40, ARM[2], q)]); } return pts; };
const TUBE_P = tubePts();
// the monitor's picture: the vessel network rendered small (the same model as S01)
const MW = 132, MH = 92, mcv = document.createElement('canvas'); mcv.width = MW; mcv.height = MH; const mcx = mcv.getContext('2d', { willReadFrequently: true });
let MIMG = null;
const monitorImage = () => {
  if (MIMG) return MIMG;
  mcx.fillStyle = PIX.P.n0; mcx.fillRect(0, 0, MW, MH);
  const img = mcx.getImageData(0, 0, MW, MH);
  VES.render(img, { ...window.S01.V0, s: 0.86, cx: MW / 2, cy: 54, mode: 'vr', fadeZ: [-70, -50], rim: true });
  mcx.putImageData(img, 0, 0); PIX.quantize && null;
  MIMG = mcx.getImageData(0, 0, MW, MH); return MIMG;
};
const drawMonitor = (c, t, x, y) => {
  // a dark slate workstation monitor in the foreground, bottom left
  K.panel(c, x - 6, y - 6, MW + 12, MH + 12, 'g2', 'g1', 'g3');
  PIX.rect(c, x + MW / 2 - 8, y + MH + 6, 16, 26, 'g2'); PIX.rect(c, x + MW / 2 - 30, y + MH + 30, 60, 6, 'g3'); PIX.rect(c, x + MW / 2 - 30, y + MH + 30, 60, 1, 'g5');
  PIX.rect(c, x, y, MW, MH, 'n0');
  const a = MO.smooth(clamp((t - 2.85) / 0.45));
  if (a > 0) {
    const src = monitorImage(), img = c.getImageData(x, y, MW, MH);
    for (let yy = 0; yy < MH; yy++) for (let xx = 0; xx < MW; xx++) { if (K.BAY(xx, yy) > a) continue; const i = (yy * MW + xx) * 4; img.data[i] = src.data[i]; img.data[i + 1] = src.data[i + 1]; img.data[i + 2] = src.data[i + 2]; }
    c.putImageData(img, x, y);
    if (a >= 1) { const av = VES.anScreen({ ...window.S01.V0, s: 0.86, cx: MW / 2, cy: 54 }); VES.ring(c, x + av.x, y + av.y, 4, MO.cubicOut(clamp((t - 3.25) / 0.4)), t); }
  }
  PIX.rect(c, x, y, MW, 1, 'g4');
};
SC['s04_cta'] = {
  draw(c, t, S) {
    const C = camAt(t);
    PIX.rect(c, 0, 0, W, H, 'k');
    const img = K.pbegin(c);
    ROOM.render(img, C, { t: S.t, tz: tzAt(t), led: 1, room: true });
    K.pend(c, img);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // injector: pedestal and head (screen-space sprite at its projected position, scaled with distance)
    const pb = ROOM.proj(C, [INJ[0], -1050, INJ[2]]), ph = ROOM.proj(C, INJ);
    if (pb && ph) {
      const k = 300 / ph[2] * 2.6;
      PIX.rect(c, Math.round(pb[0] - 30 * k), Math.round(pb[1] - 6 * k), Math.round(60 * k), Math.round(10 * k), 'g3');
      PIX.rect(c, Math.round(pb[0] - 30 * k), Math.round(pb[1] - 6 * k), Math.round(60 * k), 1, 'g5');
      K.panel(c, Math.round(ph[0] - 6 * k), Math.round(ph[1]), Math.max(2, Math.round(12 * k)), Math.round(pb[1] - ph[1]), 'g5', 'g3', 'g7');
      K.panel(c, Math.round(ph[0] - 60 * k), Math.round(ph[1] - 70 * k), Math.round(120 * k), Math.round(80 * k), 'q5', 'q3', 'q6', { r: 2 });
      // the syringe barrel (clear) with violet contrast, and the plunger that moves in
      const pl = MO.smooth(clamp((t - 1.3) / 1.2));
      const bx = Math.round(ph[0] - 46 * k), by = Math.round(ph[1] - 58 * k), bw = Math.round(92 * k), bh = Math.round(22 * k);
      PIX.rect(c, bx, by, bw, bh, 'g7'); PIX.rect(c, bx + 1, by + 1, bw - 2, bh - 2, 'n1');
      const fillW = Math.round((bw - 2) * (1 - 0.35 * pl)); PIX.rect(c, bx + 1 + (bw - 2 - fillW), by + 1, fillW, bh - 2, 'v1'); PIX.rect(c, bx + 1 + (bw - 2 - fillW), by + 1, fillW, 1, 'v2');
      PIX.rect(c, bx + (bw - 2 - fillW) - 2, by - 2, 3, bh + 4, 'g8');
      PIX.rect(c, Math.round(ph[0] - 40 * k), Math.round(ph[1] - 26 * k), Math.round(30 * k), Math.round(10 * k), 'n1'); PIX.rect(c, Math.round(ph[0] - 38 * k), Math.round(ph[1] - 24 * k), Math.round(10 * k), Math.round(5 * k), 'e2');
    }
    // IV tubing to the arm, a violet pulse running down it
    const sp = TUBE_P.map(p => ROOM.proj(C, p)).filter(Boolean);
    for (let i = 1; i < sp.length; i++) PIX.bline(c, sp[i - 1][0], sp[i - 1][1], sp[i][0], sp[i][1], 'g8');
    const pu = clamp((t - 1.35) / 1.1);
    if (pu > 0 && pu < 1.2) for (let i = 1; i < sp.length; i++) { const q = i / (sp.length - 1); if (q < pu && q > pu - 0.35) { PIX.bline(c, sp[i - 1][0], sp[i - 1][1], sp[i][0], sp[i][1], 'v2'); PIX.rect(c, Math.round(sp[i][0]), Math.round(sp[i][1]) - 1, 1, 1, 'v3'); } }
    const pa = ROOM.proj(C, ARM); if (pa) { PIX.rect(c, Math.round(pa[0]) - 3, Math.round(pa[1]) - 2, 7, 5, 'g8'); PIX.rect(c, Math.round(pa[0]) - 2, Math.round(pa[1]) - 1, 5, 3, 'q6'); }
    // the gantry fires: a yellow ring glow in the bore
    const fire = clamp((t - 2.45) / 0.5), bc = ROOM.proj(C, [0, 0, 0]);
    if (fire > 0 && fire < 1 && bc) { FX.glowL(c, bc[0], bc[1], 70 * (0.6 + fire), ['y0', 'y1', 'y2'], (1 - fire) * 0.9, 1.3); }
    drawMonitor(c, t, 18, 468);
    CAP.ctx(c, t, { text: 'KT-ANGİOQRAFİYA', t0: 0.4, t1: 3.6 });
  },
  cues: [[0, 'room_tone', 0.6, 0, 4], [0.1, 'table_motor', 0.7, 0.2, 1.6], [0.4, 'type', 0.4], [1.35, 'inject', 0.8, 0.5, 1.1], [2.45, 'scan_fire', 0.9, -0.2], [2.85, 'image_land', 0.8, -0.5], [3.25, 'ring', 0.6, -0.6]],
  xin: 0.4,
};
})();
