// S32 PROJECTION DATA (124–128 s): the gantry shrinks to a thumbnail in the corner and keeps turning; each angle's profile
// flies into the data panel as one row, building the sinogram — detector position across, angle down. Data, not an image of
// the anatomy: the skull and the bright arteries trace sine-shaped paths.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const PX = 40, PY = 214, PW = 280, PH = 330;
const rowsAt = t => Math.floor(CT.NA * MO.sineInOut(clamp((t - 0.3) / 3.2)));
SC['s32_sinogram'] = {
  draw(c, t, S) {
    // the thumbnail gantry (top right), turning in step with the rows
    const n = rowsAt(t), beta = n / CT.NA * TAU, th = { ...AXI.O, cx: 300, cy: 156, s: 0.2, Rs: 34, Rd: 30 };
    AXI.ring(c, th, 1); AXI.head(c, th, { c8: PIX.hex(PIX.P.v2) }); AXI.parts(c, beta, th, { lit: false });
    // the panel
    PIX.rect(c, PX - 6, PY - 6, PW + 12, PH + 12, 'k'); PIX.rect(c, PX - 6, PY - 6, PW + 12, 1, 'n3'); PIX.rect(c, PX - 6, PY + PH + 5, PW + 12, 1, 'n3');
    PIX.rect(c, PX, PY, PW, PH, 'n0');
    // the central half of the channels (the head fills it)
    if (n > 0) CT.blit(c, CT.ND, n, { M: [PW / (CT.ND * 0.56), 0, 0, PH / CT.NA, PX - PW * 0.22 / 0.56, PY], val: i => Math.pow(Math.max(0, CT.SINO[i] / CT.PMAX), 0.8), ramp: CT.ramps().blue, clip: [PX, PY, PX + PW, PY + PH] });
    // the newest row, white, with a flying copy from the thumbnail
    const ry = PY + PH * n / CT.NA; if (n > 0 && n < CT.NA) PIX.rect(c, PX, Math.round(ry), PW, 1, 'w');
    const fly = K.wrap(t * 6, 1); if (n < CT.NA) { const fx = lerp(290, PX + PW / 2, fly), fy = lerp(180, ry, fly); PIX.rect(c, Math.round(fx - lerp(20, PW / 2, fly)), Math.round(fy), Math.round(lerp(40, PW, fly)), 1, 'b3'); }
    CAP.part(c, t, { text: 'MƏLUMAT, ŞƏKİL DEYİL', ax: PX + 30, ay: PY + PH - 10, x: PX, y: PY + PH + 34, t0: 2.0, t1: 3.6, col: 'b4', lineCol: 'g7' });
    CAP.ctx(c, t, { text: 'PROYEKSİYA MƏLUMATLARI', t0: 0.35, t1: 3.6 });
  },
  cues: () => { const q = [[0.3, 'build_rise', 0.6, 0, 3.2], [0.35, 'type', 0.4], [2.0, 'tag', 0.4, -0.4]]; for (let k = 0; k < 13; k++) q.push([0.4 + k * 0.25, 'row_tick', 0.35, 0.2 - (k % 4) * 0.1, k]); return q; },
  xin: 0.3,
};
})();
