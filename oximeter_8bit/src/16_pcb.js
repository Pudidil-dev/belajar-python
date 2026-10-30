'use strict';
// ============================================================================
// THE CIRCUIT BOARD inside the upper jaw (px world units, face-on). The
// photodiode current comes in on a flex cable, a transimpedance amplifier
// turns it into a voltage, the ADC samples it into numbers, the processor
// runs the algorithm and drives the display; an LED driver flashes the red
// and infrared LEDs in turn. Analog signal = green, digital data = cyan/white.
// ============================================================================
const CHIPS_PCB = {
  amp: { x: -92, y: 150, w: 54, h: 40, pins: 4, label: 'AMP' },
  adc: { x: -6, y: 60, w: 58, h: 58, pins: 5, label: 'ADC', quad: true },
  mcu: { x: 66, y: -78, w: 104, h: 104, pins: 9, label: 'MCU', quad: true },
  drv: { x: -96, y: -112, w: 54, h: 36, pins: 4, label: 'LED' },
};
const PCB_ROUTES = {
  pd: [[-170, 238, -130, 238, -130, 150, -119, 150]],                   // photodiode flex -> amplifier
  amp2adc: [[-65, 150, -40, 150, -40, 60, -35, 60]],
  adc2mcu: [[23, 60, 40, 60, 40, -40, 14, -40, 14, -60]],
  mcu2disp: [[118, -78, 140, -78, 140, -184, 170, -184]],
  mcu2drv: [[14, -96, -40, -96, -40, -112, -69, -112]],
  drv2led: [[-123, -112, -150, -112, -150, -196, -170, -196]],
};
let PCB_P = null;
function pcbPaths() { if (!PCB_P) { PCB_P = {}; for (const k in PCB_ROUTES) PCB_P[k] = PCB_ROUTES[k].map(r => new Path(r)); } return PCB_P; }
function chipBoxW(cam, c, hot, t) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const x0 = c.x - c.w / 2, y0 = c.y - c.h / 2, x1 = c.x + c.w / 2, y1 = c.y + c.h / 2;
  // pins
  const pl = 7, pw = 3.2;
  for (let i = 0; i < c.pins; i++) {
    const u = (i + 0.5) / c.pins;
    const py = lerp(y0 + 4, y1 - 4, u), px = lerp(x0 + 4, x1 - 4, u);
    rect(X(x0 - pl), Y(py - pw / 2), X(x0), Y(py + pw / 2), P.G2); rect(X(x1), Y(py - pw / 2), X(x1 + pl), Y(py + pw / 2), P.G2);
    if (c.quad) { rect(X(px - pw / 2), Y(y0 - pl), X(px + pw / 2), Y(y0), P.G2); rect(X(px - pw / 2), Y(y1), X(px + pw / 2), Y(y1 + pl), P.G2); }
  }
  const m = maskRR(X(x0), Y(y0), X(x1), Y(y1), 2 * z);
  shade(m, P.CH1, P.CH3, P.CH0, P.K0, { k: Math.max(1, Math.round(z)), kh: Math.max(1, Math.round(z)) });
  disc(X(x0 + 7), Y(y0 + 7), Math.max(1.5, 2.4 * z), P.CH3);
  text(FS, c.label, X(c.x), Y(c.y - 4), { sc: Math.max(1, Math.round(2 * z)), c: hot ? P.DT4 : P.G3, ol: null, align: 'center' });
  if (hot > 0) { frame(X(x0) - 2, Y(y0) - 2, X(x1) + 2, Y(y1) + 2, P.DT3); if (hot > 0.5) frame(X(x0) - 4, Y(y0) - 4, X(x1) + 4, Y(y1) + 4, P.DT1); }
}
// o: { flow (0..1 how far the data has travelled), led (red/ir pulse) }
function pcbScene(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(0, 0, W, H, P.CB1);
  // board texture: fine fibre dither, silkscreen outlines, vias
  for (let y = 0; y < H; y += 2) rect(0, y, W, y + 1, P.CB0, 0.18);
  const mb = maskRR(X(-178), Y(-300), X(178), Y(300), 14 * z);
  mOutline(mb, P.CB3);
  for (let i = 0; i < 60; i++) { const vx = (hash(i + 7100) - 0.5) * 330, vy = (hash(i + 7101) - 0.5) * 560; disc(X(vx), Y(vy), Math.max(1.5, 2.6 * z), P.AU0); disc(X(vx), Y(vy), Math.max(1, 1.2 * z), P.CB0); }
  // copper pours (darker green patches)
  for (let i = 0; i < 7; i++) rect(X(-170 + i * 50), Y(200 + (i % 2) * 30), X(-140 + i * 50), Y(290), P.CB2, 0.6);
  // traces
  const PT = pcbPaths();
  for (const k in PT) for (const p of PT[k]) { const pts = p.sub(0, p.L, 3).map((v, i) => i % 2 ? Y(v) : X(v)); for (let i = 0; i + 3 < pts.length; i += 2) lineW(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], Math.max(2, 3.2 * z), P.CB3); }
  // passive parts (resistors / capacitors)
  for (let i = 0; i < 16; i++) {
    const x = (hash(i + 7200) - 0.5) * 300, y = (hash(i + 7201) - 0.5) * 500, v = hash(i + 7202) > 0.5;
    if (Object.values(CHIPS_PCB).some(c => Math.abs(x - c.x) < c.w / 2 + 16 && Math.abs(y - c.y) < c.h / 2 + 16)) continue;
    const w = v ? 6 : 12, h = v ? 12 : 6;
    rect(X(x - w), Y(y - h), X(x + w), Y(y + h), hash(i + 7203) > 0.5 ? P.CH2 : P.AU1); rect(X(x - w), Y(y - h), X(x - w + 3), Y(y + h), P.G2); rect(X(x + w - 3), Y(y - h), X(x + w), Y(y + h), P.G2);
  }
  // connectors: photodiode flex (bottom left), LEDs (top left), display (top right)
  rect(X(-178), Y(226), X(-150), Y(250), P.AU1); text(FS, 'PD', X(-176), Y(256), { sc: Math.max(1, Math.round(1.6 * z)), c: P.G2, ol: null });
  rect(X(-178), Y(-208), X(-150), Y(-184), P.AU1); text(FS, 'LEDs', X(-176), Y(-176), { sc: Math.max(1, Math.round(1.6 * z)), c: P.G2, ol: null });
  rect(X(150), Y(-200), X(178), Y(-168), P.AU1); text(FS, 'DISPLAY', X(146), Y(-160), { sc: Math.max(1, Math.round(1.6 * z)), c: P.G2, ol: null, align: 'right' });
  // battery contacts
  rect(X(90), Y(200), X(170), Y(270), P.G3); rect(X(92), Y(202), X(168), Y(206), P.G1); text(FS, '+', X(160), Y(210), { sc: 2, c: P.G5, ol: null });
  // chips
  const f = o.flow === undefined ? 1 : o.flow;
  chipBoxW(cam, CHIPS_PCB.amp, f > 0.15 ? 1 : 0, t); chipBoxW(cam, CHIPS_PCB.adc, f > 0.4 ? 1 : 0, t); chipBoxW(cam, CHIPS_PCB.mcu, f > 0.65 ? 1 : 0, t); chipBoxW(cam, CHIPS_PCB.drv, 0, t);
  // signal on the traces: analog (green waves) before the ADC, digital (cyan/white bits) after
  const run = (path, u0, u1, kind, speed) => {
    if (f <= u0) return;
    const p = path, L = p.L * clamp((f - u0) / (u1 - u0), 0, 1);
    for (let s = ((t * speed) % 22); s < L; s += 22) {
      const [px_, py_] = p.at(s);
      if (kind === 'a') { disc(X(px_), Y(py_), Math.max(2, 3.6 * z), P.SG1); disc(X(px_), Y(py_), Math.max(1, 2 * z), P.SG2); }
      else { const b = hash(Math.floor(s / 22) + Math.floor(t * 8) * 31) > 0.45; rect(X(px_) - 2.6 * z, Y(py_) - 2.6 * z, X(px_) + 2.6 * z, Y(py_) + 2.6 * z, b ? P.DT4 : P.DT2); }
    }
  };
  run(PT.pd[0], 0, 0.15, 'a', 70); run(PT.amp2adc[0], 0.15, 0.4, 'a', 70); run(PT.adc2mcu[0], 0.4, 0.65, 'd', 90); run(PT.mcu2disp[0], 0.65, 1, 'd', 90);
  // LED driver: alternating red / infrared pulses up to the LEDs
  const slot = ledSlot(t, 4.3);
  const pl = PT.drv2led[0];
  for (let s = (t * 120) % 30; s < pl.L; s += 30) { const [px_, py_] = pl.at(s), c = slot === 'red' ? P.LR3 : slot === 'ir' ? P.IR3 : P.N4; disc(X(px_), Y(py_), Math.max(1.5, 2.6 * z), c); }
  const PT2 = PT.mcu2drv[0]; for (let s = (t * 90) % 26; s < PT2.L; s += 26) { const [px_, py_] = PT2.at(s); rect(X(px_) - 2 * z, Y(py_) - 2 * z, X(px_) + 2 * z, Y(py_) + 2 * z, P.DT2); }
}
