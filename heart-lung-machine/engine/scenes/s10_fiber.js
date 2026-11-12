// S10 GAS AND BLOOD, SEPARATE PATHS (25–29 s): the picked fibre turns end-on and becomes a magnified cross-section. Its
// membrane is the ring; inside it flows the gas (a cool field with oxygen molecules); outside it flows the blood (plasma
// with red cells streaming round the fibre). The red cells stay outside the ring. Labels: Gas, Blood. Stable hold.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, hh = U.hash, R = n => window.RAMP[n];
const RO = 78, RI = 63;
// a red cell's position on a streamline round a cylinder of radius a (potential flow): psi = y (1 - a^2 / r^2)
const stream = (psi, x, a) => { let y = psi + Math.sign(psi || 1) * 2; for (let i = 0; i < 12; i++) { const r2 = x * x + y * y, f = y * (1 - a * a / r2) - psi, df = 1 - a * a * (x * x - y * y) / (r2 * r2); y -= f / df; } return y; };
window.fiberSection = (c, cam, T, o = {}) => {
  const z = cam.z, [cx, cy] = K.S(cam, 0, 0), turn = o.turn ?? 1, sx = Math.max(0.02, Math.sin(turn * Math.PI / 2));
  MICRO.plasma(c, cam, T);
  // red cells streaming round the fibre (left to right), outside the membrane only
  for (let k = 0; k < 26; k++) {
    const psi = (hh(k, 11) - 0.5) * 520, sp = 36 + 10 * hh(k, 12), x = ((hh(k, 13) * 520 + T * sp) % 520) - 260;
    const y = Math.abs(psi) < 8 ? (psi < 0 ? -RO - 14 : RO + 14) * Math.sqrt(Math.max(0, 1 - Math.min(1, (x / (RO + 40)) ** 2))) + psi : stream(psi, x, RO + 10);
    if (x * x / (sx * sx + 1e-6) + y * y < (RO + 8) ** 2 && Math.abs(x) < (RO + 8) * sx) continue;
    MICRO.rbc(c, cam, x, y, 11, 8, 0.3 + 0.4 * Math.sin(k + T * 0.4), { a: 1 });
  }
  // the fibre: the side wall (while turning), then the cut end: membrane ring and the gas lumen
  if (sx < 0.98) {
    const L = 600 * (1 - sx);
    LIT.shape(c, ctx => { ctx.beginPath(); ctx.rect(cx - L, cy - RO * z, L, 2 * RO * z); ctx.fill(); }, [cx - L - 2, cy - RO * z - 2, cx + 2, cy + RO * z + 2], R('iv'), { amb: 0.24, dif: 0.8, R: RO * z, bias: -0.1 });
  }
  const box = [cx - RO * z - 3, cy - RO * z - 3, cx + RO * z + 3, cy + RO * z + 3];
  LIT.shape(c, ctx => { ctx.beginPath(); ctx.ellipse(cx, cy, RO * z * sx, RO * z, 0, 0, TAU); ctx.fill(); }, box, R('iv'), { amb: 0.3, dif: 0.7, R: (RO - RI) * z * 0.5 });
  // the gas lumen
  window.inset(c, 0, 0, W, H, cc => { cc.beginPath(); cc.ellipse(cx, cy, RI * z * sx, RI * z, 0, 0, TAU); cc.clip(); MICRO.gas(cc, cx - RI * z, cx + RI * z, T); PIX.glow(cc, cx - 10 * z, cy - 14 * z, RI * z, 'ox0', 0.6); });
  // membrane texture: fine pores (one ramp step darker), and the inner edge in shade
  if (sx > 0.6) for (let k = 0; k < 70; k++) { const a = k / 70 * TAU, rr = lerp(RI + 3, RO - 3, hh(k, 3)), [px, py] = [cx + Math.cos(a) * rr * z * sx, cy + Math.sin(a) * rr * z]; PIX.rect(c, Math.round(px), Math.round(py), 1, 1, 'iv2'); }
  // oxygen molecules in the gas (gently jiggling)
  if (sx > 0.7) for (let k = 0; k < 9; k++) {
    const [jx, jy] = MICRO.jit(k, T), ang = (hh(k, 5) - 0.5) * 3 + jy, rx = (hh(k, 6) - 0.5) * 1.4 * RI * 0.8, ry = (hh(k, 7) - 0.5) * 1.4 * RI * 0.8;
    const x = rx + jx * 16, y = ry + jy * 16; if (x * x + y * y > (RI - 8) ** 2) continue;
    const [px, py] = K.S(cam, x * sx, y); MICRO.o2(c, px, py, 3.4 * z, ang, {});
  }
};
SC['s10_fiber'] = {
  xin: 0.4,
  draw(c, t, S) {
    const turn = MO.smooth(clamp((t - 0.1) / 0.9)), cam = { x: 0, y: -10, z: lerp(0.55, 1, MO.cubicOut(clamp(t / 1.1))) * (1 + 0.03 * clamp((t - 1) / 3)) };
    window.fiberSection(c, cam, S.t, { turn });
    const [cx, cy] = K.S(cam, 0, 0);
    CAP.part(c, t, { text: 'Gas', ax: cx, ay: cy + 6, x: cx, y: cy - 24, t0: 1.3, t1: 3.7, col: 'ox4', lineCol: 'ox3', align: 'center', dot: false });
    CAP.part(c, t, { text: 'Blood', ax: cx + 70 * cam.z, ay: cy + 70 * cam.z, x: 196, y: 392, t0: 1.7, t1: 3.7, col: 'rc5', lineCol: 'rc4', align: 'center' });
  },
  cues: [[0.1, 'turn', 0.6, 0, 0.9], [1.0, 'gas_bed', 0.6, -0.5, 3.0], [1.0, 'blood_bed', 0.6, 0.5, 3.0], [1.3, 'label', 0.4, -0.2], [1.75, 'label', 0.4, 0.3]],
};
})();
