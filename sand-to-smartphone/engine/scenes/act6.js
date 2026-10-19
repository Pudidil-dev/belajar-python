// ACT 6 — the transistor and its wiring (S23–S24)
(() => {
const { P, W, H } = PIX;
const h = U.hash, clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;

// ================= stylized gate-all-around nanosheet transistor (cross-section along the channel) =================
const SH = [282, 314, 346], SX0 = 96, SX1 = 174, SHT = 12, SUBY = 390;
// s: {sheets, hik, gate, sd, cont, on (0..1)} assembly progress 0..1 each; electrons flow while on
function gaa(c, t, s) {
  PIX.rect(c, -60, -200, 390, SUBY + 200, 'n1');                                       // inter-layer dielectric
  for (let x = -56; x < 330; x += 16) PIX.rect(c, x, -200, 1, 320, 'n2', 0.5);
  PIX.rect(c, -60, SUBY, 390, 160, 'g2');                                              // p-type silicon substrate
  for (let x = -56; x < 330; x += 10) for (let y = SUBY + 6; y < 540; y += 10) K.ball(c, x + ((y / 10) % 2) * 5, y, 3, 'g3', 'g2', null);
  PIX.rect(c, -60, 360, 76, 120, 'n2'); PIX.rect(c, 254, 360, 76, 120, 'n2');          // shallow-trench isolation
  // metal gate fills around the sheets (rises in)
  if (s.gate > 0) {
    const top = lerp(SUBY, 258, MO.cubicOut(s.gate));
    PIX.flat(c, PIX.rectPath(SX0 + 4, top, SX1 - SX0 - 8, SUBY - top, 2), s.on > 0.5 ? 'b2' : 'b1', 'b0', 'c2', [3, 2]);
    if (s.gate > 0.7) PIX.flat(c, PIX.rectPath(SX0 + 4, lerp(258, 218, clamp((s.gate - 0.7) / 0.3)), SX1 - SX0 - 8, 42, 2), s.on > 0.5 ? 'b2' : 'b1', 'b0', 'c2', [3, 2]);
    if (s.on > 0) PIX.glow(c, 135, 300, 70, 'c1', 0.45 * s.on);
  }
  // high-k dielectric wrapping each sheet, then the silicon nanosheet channels
  SH.forEach((y, i) => {
    const sl = MO.cubicOut(clamp(s.sheets * 1.6 - i * 0.3)); if (sl <= 0) return;
    const x0 = lerp(-120, SX0, sl);
    if (s.hik > 0) PIX.rect(c, x0 - 0, y - 2, SX1 - SX0, SHT + 4, 'm1', clamp(s.hik * 2 - i * 0.3));
    PIX.flat(c, PIX.rectPath(x0, y, SX1 - SX0, SHT, 1), 'g4', 'g2', 'g5', [0, 3], [0, 1]);
    if (s.on > 0) PIX.rect(c, x0, y + 3, SX1 - SX0, 6, 'c2', 0.55 * s.on);           // inversion channel
  });
  // inner spacers + gate spacers
  if (s.gate > 0.5) for (const y of SH.slice(1)) { PIX.rect(c, SX0, y - 18, 4, 16, 'g4'); PIX.rect(c, SX1 - 4, y - 18, 4, 16, 'g4'); }
  if (s.gate > 0.9) { PIX.rect(c, SX0 - 4, 218, 8, 48, 'g4'); PIX.rect(c, SX1 - 4, 218, 8, 48, 'g4'); }
  // source / drain: epitaxially grown, faceted n+ silicon
  if (s.sd > 0) for (const [x0, x1] of [[18, SX0], [SX1, 252]]) {
    const top = lerp(SUBY, 266, MO.cubicOut(s.sd)), mid = (x0 + x1) / 2;
    PIX.flat(c, PIX.polyPath([[x0, SUBY], [x0, top + 14], [mid, top], [x1, top + 14], [x1, SUBY]]), 'y0', 'o0', 'y1', [3, 3], [1, 1]);
    for (let n = 0; n < 8; n++) PIX.rect(c, Math.round(x0 + 6 + h(n, x0) * (x1 - x0 - 12)), Math.round(top + 18 + h(n, x1) * (SUBY - top - 26)), 1, 1, 'r2');
  }
  // contacts dropping in from above (source, gate, drain)
  if (s.cont > 0) for (const [x, y0] of [[54, 272], [135, 220], [216, 272]]) {
    const off = (1 - MO.cubicOut(s.cont)) * -160;
    PIX.flat(c, PIX.rectPath(x - 10, 120 + off, 20, y0 - 120, 1), 'g5', 'g3', 'w', [4, 0], [1, 0]);
  }
  // electrons: wait in the source while the gate is off, stream to the drain while it is on
  const el = s.el ?? 1;                                            // free electrons of the n+ regions appear one by one
  if (s.sd > 0.9 && el > 0) {
    for (let k = 0; k < 54; k++) {                                // one formula for both states, so nothing jumps when the gate flips
      const a = clamp(el * 1.6 - h(k, 5) * 0.6); if (a <= 0) continue;
      const lane = k % 3, y = SH[lane] + 6 + Math.sin(t * 9 + k) * 1.5, ph = h(k, 3);
      const x = 28 + K.wrap(ph * 60 + s.flowT * 120, 216) + (s.on > 0.05 ? 0 : Math.sin(t * 7 + k) * 2);
      if (s.on < 0.05 && x > SX0 - 2 && x < SX1 + 2) continue;          // no inversion channel → no electrons in the sheets
      PIX.glow(c, x, y, 6, 'c1', 0.5 * a); PIX.circ(c, x, y, 1 + 2 * a, 'c3', a); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 2, 2, 'w', a);
    }
    if (s.on > 0.5) K.flow(c, [[216, 270], [216, 120]], s.flowT, { gap: 12, speed: 90, col: 'c3', size: 2 });
  }
}
// gate state: on the beat — OFF 5.0, ON 5.5, OFF 7.0, ON 7.5, OFF 8.5, ON 9.0
const SW = [[5.5, 1], [7.0, 0], [7.5, 1], [8.5, 0], [9.0, 1]];
const gateOn = t => { let v = 0; for (const [a, s] of SW) if (t >= a) v = s; return v; };
const flowTime = t => { let acc = 0; for (let x = 5.5; x < t; x += 1 / 60) acc += gateOn(x) / 60; return acc; };   // electrons only advance while on
function gaaLens(c, R) {                                           // section across the channel: the gate surrounds every sheet
  PIX.rect(c, -R, -R, 2 * R, 2 * R, 'b1'); PIX.glow(c, 0, 0, R, 'b2', 0.4);
  for (let i = 0; i < 3; i++) { const y = -24 + i * 18; PIX.rect(c, -24, y - 2, 48, 12, 'm1'); PIX.flat(c, PIX.rectPath(-22, y, 44, 8, 1), 'g4', 'g2', 'g5', [0, 2]); }
}
SC.s23_transistor = {
  draw(c, lt) {
    const st = { sheets: clamp((lt - 0.4) / 0.7), hik: clamp((lt - 1.0) / 0.5), gate: clamp((lt - 1.5) / 0.6), sd: clamp((lt - 2.0) / 0.6), cont: clamp((lt - 2.6) / 0.4), el: clamp((lt - 2.5) / 0.7), on: gateOn(lt), flowT: flowTime(lt) };
    const push = K.inout(lt, 0, 4.6);
    const k = { x: 135, y: lerp(300, 292, push), z: CAM.zlerp(0.98, 1.12, push) };
    PIX.cam(c, k); gaa(c, lt, st);
    const open = clamp((lt - 3.2) / 0.35) - clamp((lt - 4.8) / 0.3);
    if (open > 0) K.lens(c, 120, 300, 66, 170, 44, open, (c, R) => gaaLens(c, R), 'b2', 'b1');
    c.setTransform(1, 0, 0, 1, 0, 0);
    const S = (x, y) => PIX.toScreen(k, x, y);
    if (open > 0) { const [lx, ly] = S(66, 170); PIX.label(c, { tx: lx, ty: ly - 44 * k.z - 15, text: 'GATE ALL AROUND', t0: 3.45, t1: 4.55, col: 'w', align: 'center' }, lt); }   // caption above the lens
    PIX.label(c, { tx: W / 2, ty: 22, text: 'STYLIZED GATE-ALL-AROUND TRANSISTOR', t0: 0.3, t1: 4.8, col: 'g4', align: 'center' }, lt);
    const L = [['CHANNEL', 135, 320, 104, 452, 0.8, 2.3, 'g5', 'g4'], ['HIGH-k DIELECTRIC', 110, 282, 14, 440, 1.2, 2.7, 'm1', 'm1'], ['METAL GATE', 135, 236, 100, 180, 1.8, 3.6, 'b2', 'b2'],
      ['SOURCE', 40, 330, 12, 160, 2.3, 4.2, 'y0', 'y0'], ['DRAIN', 232, 330, 214, 160, 2.4, 4.3, 'y0', 'y0'], ['CONTACTS', 216, 180, 196, 120, 2.9, 4.6, 'g5', 'g4']];
    for (const [txt, ax, ay, tx, ty, t0, t1, col, lc] of L) { const [sx, sy] = S(ax, ay); PIX.label(c, { ax: sx, ay: sy, tx, ty, text: txt, t0, t1, col, lineCol: lc }, lt); }
    if (lt > 5.0) {
      const on = gateOn(lt);
      PIX.text(c, on ? 'GATE ON' : 'GATE OFF', W / 2, 70, on ? 'c3' : 'g3', { sc: 2, align: 'center' });
      PIX.text(c, on ? '1' : '0', W - 22, 64, on ? 'c3' : 'g3', { sc: 3, align: 'center' });
      if (on) PIX.glow(c, W - 22, 74, 18, 'c1', 0.5);
    }
    PIX.label(c, { tx: W / 2, ty: 452, text: 'THE GATE SWITCHES THE CURRENT', t0: 5.3, t1: 9.7, col: 'c3', align: 'center' }, lt);
    const e = S(150, SH[1] + 6); PIX.label(c, { ax: e[0], ay: e[1], tx: 160, ty: 420, text: 'ELECTRONS', t0: 6.0, t1: 6.9, col: 'c3', lineCol: 'c2' }, lt);
  },
  cues: [[-0.3, 'nano_pad', 0.5, 0, 10.3], [0.3, 'type', 0.3], ...[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((b, i) => [b, 'build', 0.6, (i % 2) * 0.4 - 0.2, i]), ...[0.8, 1.2, 1.8, 2.3, 2.9].map(b => [b, 'type', 0.25]), [3.2, 'lens', 0.4], [3.45, 'type', 0.25],
    [5.0, 'switch', 0.7, 0, 0], ...SW.map(([a, s]) => [a, 'switch', 0.9, 0, s]), [5.5, 'current', 0.5, 0.2, 1.5], [7.5, 'current', 0.5, 0.2, 1.0], [9.0, 'current', 0.5, 0.2, 1.0], [5.3, 'type', 0.3]],
};

// ================= S24 · copper interconnects; the steps repeat, layer after layer =================
const TIW = 54, TS = TIW / 270;                                    // one transistor = 1/5 of S23's frame
const th = n => n === 1 ? 32 : 26 + 3 * n;
const LV = [null, { b: 402, t: 370 }]; for (let n = 2; n <= 15; n++) LV[n] = { b: LV[n - 1].t, t: LV[n - 1].t - th(n) };
const appearAt = n => n === 1 ? 1.2 : 3.45 + (n - 2) * 0.25;
function miniTransistor(c, x, y, lod) {                            // x = left edge, y = top of S23's frame scaled
  if (!lod) { c.save(); c.beginPath(); c.rect(x, y, TIW, 90); c.clip(); c.translate(x, y); c.scale(TS, TS); c.translate(0, -120); gaa(c, 0, { sheets: 1, hik: 1, gate: 1, sd: 1, cont: 1, on: 0, flowT: 0 }); c.restore(); return; }
  PIX.rect(c, x, y + 54, TIW, 20, 'g2'); PIX.rect(c, x + 4, y + 30, 14, 24, 'y0'); PIX.rect(c, x + TIW - 18, y + 30, 14, 24, 'y0'); PIX.rect(c, x + 20, y + 20, 14, 34, 'b1');
  for (const cx of [10, 27, 44]) PIX.rect(c, x + cx - 2, y, 4, 30, 'g5');
}
function stack(c, t, k) {
  PIX.rect(c, -800, -900, 1900, 1500, 'n0');
  const vis0 = k.x - W / 2 / k.z - 60, vis1 = k.x + W / 2 / k.z + 60, lod = TIW * k.z < 70;
  PIX.rect(c, vis0, 486, vis1 - vis0, 300, 'g2');                                         // substrate continues below the row
  for (let x = Math.floor(vis0 / 10) * 10; x < vis1; x += 10) for (let y = 492; y < 700; y += 10) PIX.rect(c, x + ((y / 10) % 2) * 5, y, 2, 2, 'g3');
  for (let i = -40; i <= 40; i++) { const x = 108 + i * TIW; if (x + TIW < vis0 || x > vis1) continue; miniTransistor(c, x, 402, lod); }
  for (let n = 1; n <= 15; n++) {
    const L = LV[n], ap = t - appearAt(n); if (ap < 0) continue;
    const q = clamp(ap / 0.25), lw = Math.round(2 + n * 0.9), pitch = lw * 2 + 6 + n, horiz = n % 2 === 0;
    if (n === 1) {                                                 // the detailed damascene sequence on M1
      const dep = clamp((t - 1.2) / 0.4), etch = clamp((t - 1.6) / 0.4), fill = clamp((t - 2.2) / 0.6), cmp = clamp((t - 2.8) / 0.5);
      PIX.rect(c, vis0, lerp(L.b, L.t, dep), vis1 - vis0, (L.b - L.t) * dep, 'n3');
      if (fill > 0 && cmp < 1) { const cx = lerp(vis0, vis1, cmp); PIX.rect(c, cx, L.t - 6 * fill, vis1 - cx, 6 * fill, 'u1'); if (cmp > 0) { PIX.rect(c, cx - 3, L.t - 14, 6, 14, 'g4'); K.sparks(c, t, { x: cx, y: L.t - 2, n: 10, rate: 40, life: 0.3, speed: 40, ang: -1.9, spread: 1, g: 60, seed: 5, cols: ['w', 'u2'] }); } }
      for (let i = -40; i <= 40; i++) for (const cx of [10, 27, 44]) {
        const x = 108 + i * TIW + cx; if (x < vis0 || x > vis1) continue;
        if (etch > 0) PIX.rect(c, x - 4, L.t + 4, 8, (L.b - L.t - 4) * etch, 'k');
        if (t > 2.0) { PIX.rect(c, x - 4, L.t + 4, 1, L.b - L.t - 4, 'g4'); PIX.rect(c, x + 3, L.t + 4, 1, L.b - L.t - 4, 'g4'); }
        if (fill > 0) { const ft = lerp(L.b, L.t + 4, fill); PIX.rect(c, x - 3, ft, 6, L.b - ft, 'u1'); PIX.rect(c, x - 3, ft, 6, 1, 'u2'); }
      }
      continue;
    }
    PIX.rect(c, vis0, L.t, vis1 - vis0, L.b - L.t, n % 2 ? 'n2' : 'n3', q);
    const lineY = L.t + (L.b - L.t) * 0.35, hgt = Math.round((L.b - L.t) * 0.4), flash = 1 - clamp(ap / 0.3);
    for (let x = Math.floor(vis0 / pitch) * pitch; x < vis1; x += pitch) {
      const key = Math.round(x / pitch);
      if (horiz && h(key, n) < 0.3) continue;
      const w = horiz ? pitch * (1 + Math.floor(h(key, n + 50) * 3)) - 6 : lw;
      PIX.rect(c, x, lineY, w, hgt, flash > 0.3 ? 'w' : 'u1', q); PIX.rect(c, x, lineY, w, 1, 'u2', q);
      if (h(key, n + 99) < 0.45) PIX.rect(c, x + 1, lineY + hgt, Math.max(2, lw - 2), L.b - lineY - hgt, 'u0', q);   // via down to the level below
    }
    if (n === 15) for (let x = Math.floor(vis0 / 60) * 60; x < vis1; x += 60) { PIX.flat(c, PIX.rectPath(x + 8, L.t - 10, 44, 12, 2), 'g4', 'g2', 'g5', [0, 3]); PIX.circ(c, x + 30, L.t - 16, 8, 'g5'); }   // pads + bumps
  }
}
SC.s24_interconnect = {
  draw(c, lt) {
    const out = MO.cubicOut(clamp(lt / 1.2));
    let k = { x: lerp(135, 150, out), y: lerp(436, 410, out), z: CAM.zlerp(5.6, 1.35, out) };   // starts exactly on S23's last frame
    // then ride up with the newest layer kept in the upper third, so the stack fills the frame as it grows
    let yTop = LV[1].t; for (let n = 2; n <= 15; n++) yTop = lerp(yTop, LV[n].t, MO.smooth(clamp((lt - appearAt(n)) / 0.25)));
    const rise = K.inout(lt, 3.3, 3.8), wide = K.inout(lt, 6.2, 7.2);
    k = { x: k.x, y: lerp(k.y, yTop + 60, rise), z: CAM.zlerp(k.z, 1.0, rise) };
    k = { x: k.x, y: lerp(k.y, 30, wide), z: CAM.zlerp(k.z, 0.42, wide) };
    PIX.cam(c, k); stack(c, lt, k); c.setTransform(1, 0, 0, 1, 0, 0);
    PIX.label(c, { tx: 12, ty: 30, text: 'COPPER WIRES (DAMASCENE)', t0: 1.4, t1: 3.3, col: 'u2' }, lt);
    let top = 0; for (let n = 15; n >= 1; n--) if (lt >= appearAt(n)) { top = n; break; }
    if (top >= 2 && lt < 6.6) { const [sx, sy] = PIX.toScreen(k, 0, LV[top].t); PIX.text(c, 'M' + top, W - 14, Math.max(90, Math.min(440, sy)), 'u2', { sc: 2, align: 'right' }); }
    PIX.label(c, { tx: 12, ty: 30, text: 'THE SAME STEPS REPEAT', t0: 3.6, t1: 5.1, col: 'w' }, lt);
    PIX.label(c, { tx: 12, ty: 30, text: '×15 METAL LAYERS', t0: 5.3, t1: 6.9, col: 'u2' }, lt);
  },
  cues: [[0, 'whoosh_out', 0.5, 0, 1.2], [1.2, 'deposit', 0.5, 0, 0.4], [1.4, 'type', 0.3], [1.6, 'fizz', 0.4, 0, 0.4], [2.2, 'fill', 0.6, 0, 0.6], [2.8, 'polish', 0.5, 0, 0.5], ...Array.from({ length: 14 }, (_, i) => [appearAt(i + 2), 'layer', 0.55, (i % 2) * 0.4 - 0.2, i + 2]), [3.6, 'type', 0.3], [5.3, 'type', 0.3], [6.4, 'whoosh_out', 0.5, 0, 0.8]],
};
})();
