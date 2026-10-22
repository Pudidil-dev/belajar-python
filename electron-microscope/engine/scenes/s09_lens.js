// S09 · 0:52–0:59 — ELECTROMAGNETIC LENSES. The camera settles on the condenser lens and the cut section becomes a
// diagram of it: copper coil, iron yoke, pole pieces. Current flows (⊙ out of the page, ⊗ in) and the magnetic field
// crosses the pole-piece gap, bulging into the bore. Electrons coming down parallel bend toward the axis — each one
// spiralling a little as it goes — and cross at a focus. More current makes the field stronger and pulls the focus up.
// No glass: the lens is only a magnetic field.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_DIAG = 0.55, T_FIELD = 1.0, T_RAYS = 2.2, T_CUR0 = 4.4, T_CUR1 = 5.6, T_OUT = 6.2;
const A = 16, ZF0 = 78, ZF1 = 46;                                             // field half-width, focus before / after
let K0 = 0, K1 = 0, RAYS0 = null, RAYS1 = null;
const RS = [-19, -14, -9, -4.5, 4.5, 9, 14, 19];
const camCol = lt => { const a = SC.s08_wave.camEnd(); const p = MO.sineInOut(U.clamp(lt / 0.5)); return { x: U.lerp(a.x, X, p), y: U.lerp(a.y, Y.c2, p), z: CAM.zlerp(a.z, 7, p) }; };
const geo = () => { const cam = { x: X, y: Y.c2, z: 7 }, [cx, cy] = K.S(cam, X, Y.c2); return { cx, cy, s: 18.2 / 100 * 7 }; };
const curK = lt => MO.smooth(U.clamp((lt - T_CUR0) / (T_CUR1 - T_CUR0)));
const rayAt = (i, lt) => { const k = curK(lt), a = RAYS0[i], b = RAYS1[i]; return a.map((p, j) => ({ z: p.z, r: U.lerp(p.r, b[j].r, k), th: U.lerp(p.th, b[j].th, k) })); };
function diagram(c, lt) {
  const { cx, cy, s } = geo(), T = 52 + lt;
  PIX.rect(c, 0, 0, W, H, 'k');
  for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  // the axis
  for (let y = 0; y < H; y += 4) PIX.rect(c, Math.round(cx), y, 1, 2, 'n3');
  OPT.lens(c, cx, cy, s, { hot: U.clamp((lt - T_DIAG) / 0.4), t: T });
  OPT.field(c, cx, cy, s, MO.smooth(U.clamp((lt - T_FIELD) / 0.8)) * (0.85 + 0.15 * curK(lt)), T);
  // electrons: paths drawn behind the front, particles at the front
  if (lt > T_RAYS) {
    const v = 150;                                                             // lens units per second
    RS.forEach((r0, i) => {
      const tr = rayAt(i, lt), zFront = -120 + (lt - T_RAYS - (i % 3) * 0.06) * v;
      let pv = null;
      for (const p of tr) {
        if (p.z > zFront) break;
        const x = cx + p.r * s, y = cy + p.z * s;
        if (pv) PIX.bline(c, pv[0], pv[1], x, y, zFront - p.z < 30 ? 'c2' : 'c1');
        pv = [x, y];
      }
      if (pv && zFront < 150) FX.e(c, pv[0], pv[1], 2, 1);
      // a repeating stream once the first wave has passed
      for (let q = 1; q < 4; q++) { const zz = -120 + K.wrap((lt - T_RAYS) * v + q * 87, 270); if (lt - T_RAYS < 1.8) continue; const pp = tr[Math.min(tr.length - 1, Math.max(0, Math.round((zz + 120) / 270 * (tr.length - 1))))]; FX.e(c, cx + pp.r * s, cy + pp.z * s, 1, 1); }
    });
    // one electron in 3D: it spirals as it is focused (projection, slightly tilted)
    const tr = rayAt(7, lt), zf = -120 + (lt - T_RAYS - 0.3) * 120;
    let pv = null;
    for (const p of tr) {
      if (p.z > zf) break;
      const ang = p.th * 1.0 + 0.6, x = cx + p.r * Math.cos(ang) * s, dep = p.r * Math.sin(ang), y = cy + (p.z + dep * 0.35) * s;
      if (pv) PIX.bline(c, pv[0], pv[1], x, y, dep > 0 ? 'y3' : 'y1');
      pv = [x, y];
    }
    if (pv && zf < 150) FX.e(c, pv[0], pv[1], 2, 1, true);
  }
  // focus marker
  const zfoc = U.lerp(ZF0, ZF1, curK(lt)), [fx, fy] = [cx, cy + zfoc * s];
  if (lt > T_RAYS + 1.2) { const k = U.clamp((lt - T_RAYS - 1.2) / 0.2); PIX.bline(c, fx - 9 * k, fy, fx - 4, fy, 'w'); PIX.bline(c, fx + 4, fy, fx + 9 * k, fy, 'w'); }
  return { cx, cy, s, fx, fy };
}
SC.s09_lens = {
  init() { K0 = OPT.Kfor(ZF0, A); K1 = OPT.Kfor(ZF1, A); RAYS0 = RS.map(r => OPT.trace(r, K0, A, -120, 150)); RAYS1 = RS.map(r => OPT.trace(r, K1, A, -120, 150)); },
  draw(c, lt) {
    const T = 52 + lt;
    if (lt < T_DIAG + 0.4) {
      const cam = camCol(lt);
      LAB.back(c, cam, T); COL.draw(c, cam, T, { airlock: 1, glow: 0.6, hot: { c1: 0.6, c2: 0.6 + 0.4 * U.clamp(lt / 0.5), obj: 0.3 } });
      if (lt > T_DIAG) window.dissolve(c, () => {}, cc => diagram(cc, lt), MO.smooth((lt - T_DIAG) / 0.4));
    } else diagram(c, lt);
    const { cx, cy, s } = geo();
    const at = (x, y) => [cx + x * s, cy + y * s];
    // labels
    const [q1x, q1y] = at(65, -30), [p1x, p1y] = at(-30, -20), [m1x, m1y] = at(14, 0), [fx, fy] = at(0, U.lerp(ZF0, ZF1, curK(lt)));
    CAP.note(c, lt, { text: 'COPPER COIL', x: 168, y: q1y - 66, ax: q1x, ay: q1y, t0: T_DIAG + 0.3, t1: 4.2, col: 'u3', lineCol: 'u2', box: true });
    CAP.note(c, lt, { text: 'IRON POLE PIECE', x: 12, y: p1y - 74, ax: p1x, ay: p1y, t0: T_DIAG + 0.55, t1: 4.2, col: 'g9', lineCol: 'g6', box: true });
    CAP.note(c, lt, { text: 'MAGNETIC FIELD', x: 150, y: m1y + 66, ax: m1x, ay: m1y, t0: T_FIELD + 0.4, t1: 4.2, col: 'm4', lineCol: 'm2', box: true });
    CAP.note(c, lt, { text: 'FOCUS', x: fx + 22, y: fy - 3, ax: fx + 8, ay: fy, t0: T_RAYS + 1.25, col: 'w', lineCol: 'g6', box: true });
    CAP.note(c, lt, { text: 'EACH ELECTRON SPIRALS AS IT FOCUSES', x: W / 2, y: 392, t0: T_RAYS + 0.9, t1: T_CUR0 - 1.0, col: 'y4', box: true, align: 'center', rate: 60 });
    CAP.note(c, lt, { text: 'NO GLASS - ONLY A MAGNETIC FIELD', x: W / 2, y: 406, t0: T_RAYS + 1.4, t1: T_CUR0 - 1.0, col: 'g9', box: true, align: 'center', rate: 60 });
    // coil current meter: more current, stronger lens, focus moves up
    const kM = U.clamp((lt - T_CUR0 + 0.4) / 0.3);
    if (kM > 0) {
      PIX.rect(c, 16, 384, 128, 34, 'k', kM);
      FX.meter(c, 22, 388, 116, 0.55 + 0.45 * curK(lt), 'COIL CURRENT', curK(lt) > 0.02 ? '↑' : '', 'u2', kM);
      CAP.note(c, lt, { text: 'MORE CURRENT = STRONGER FOCUS', x: W / 2, y: 428, t0: T_CUR0 + 0.3, col: 'u3', box: true, align: 'center', rate: 60 });
    }
    CAP.scene(c, lt, { title: 'ELECTROMAGNETIC LENS', ctx: ['MAGNETIC LENSES FOCUS ELECTRONS'], t0: 0.35, acc: 'm3' });
  },
  cues: [[0.0, 'current_on', 1, 0, 0.6], [0.35, 'title_hit', 0.7], [T_FIELD, 'field_hum', 1, 0, 3.2], [T_DIAG + 0.3, 'blip', 0.6, 0.3], [T_DIAG + 0.55, 'blip', 0.6, -0.3], [T_FIELD + 0.4, 'blip', 0.6, 0.2],
    [T_RAYS, 'beam_focus', 1, 0, 1.4], [T_RAYS + 1.25, 'focus_lock'], [T_CUR0, 'current_up', 1, 0, T_CUR1 - T_CUR0], [T_CUR1, 'focus_lock', 0.8], [T_OUT, 'swoosh', 0.6]],
};
})();
