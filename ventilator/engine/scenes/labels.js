// LABELS — the small explanatory captions of the revision, scene by scene. Each label names a part, molecule or tissue
// (white capitals) and says in a few words what it does (grey), on a leader line to it. Anchors live in the world the
// scene draws (w: 'macro' | 'inside' | 'tree' | 'acinus' | 'barrier' | 'humid' | 'tube' | 'ypiece' | 'hb'), so a label
// follows its object as the camera moves; at: a world point or (S, lo, cam) => point; rel: a point relative to the camera
// centre (world units); scr: a fixed screen point. dx, dy: the text block's offset from the anchor (screen px); align.
// Times t0, t1 are screen seconds inside the scene (t1 defaults to 0.4 s before the cut). The last scene's labels are gone
// well before its end, so the loop point (frame 0 has none) stays clean.
(() => {
const { W, H } = PIX;
const L = {};
const ALV_C1 = v => [-44 * (1 + 0.05 * v), 22 * (1 + 0.05 * v)];
const capPt = (i, v) => { const [x, y, r] = AIR.ALV[i], s = 1 + 0.11 * v, sp = 1 + 0.05 * v, a = U.hash(i, 2) * U.TAU + 1.1; return [x * sp + Math.cos(a) * r * s * 0.9, y * sp + Math.sin(a) * r * s * 0.9]; };
const v = S => BREATH.v(S.t);
// ---- A: the breath (one continuous shot over S01–S06: its labels run on the film's screen time, g0–g1) ----
const HOOKL = [
  { w: 'macro', at: [-36, -62], name: 'LUNGS INFLATE', note: 'the ventilator pushes air in', g0: 0.2, g1: 1.3, scrX: 10, scrY: 50 },
  { w: 'macro', at: [-36, -62], name: 'LUNGS DEFLATE', note: 'they recoil by themselves', g0: 1.55, g1: 3.95, scrX: 10, scrY: 50 },
  { w: 'macro', at: [1, -94], name: 'ENDOTRACHEAL TUBE', note: 'carries each breath in', dx: 18, dy: -14, g0: 4.35, g1: 5.55 },
  { w: 'macro', at: [128, 236], name: 'VENTILATOR', note: 'it breathes for the patient', dx: -24, dy: -64, g0: 6.9, g1: 7.75 },
];
for (const id of ['s01_breath', 's02_trachea', 's03_branches', 's04_alveoli', 's05_barrier', 's06_reveal']) L[id] = HOOKL;
// ---- B: into the machine ----
L.s07_circuit = [
  { w: 'macro', at: [53, 0], name: 'INSPIRATORY LIMB', note: 'fresh gas to the patient', dx: -16, dy: -34, t0: 0.45, t1: 1.45 },
  { w: 'macro', at: [73, 110], name: 'EXPIRATORY LIMB', note: 'used gas back', dx: 16, dy: 14, t0: 1.25, t1: 2.15 },
];
L.s08_cutaway = [
  { w: 'macro', at: [80, 292], name: 'INSPIRATORY PORT', note: 'where the gas leaves', dx: -16, dy: -40, t0: 0.04, t1: 0.52 },
  { w: 'inside', at: [100, 586], name: 'INSIDE THE VENTILATOR', note: 'gas channels, valves, sensors', dx: 16, dy: -86, t0: 0.85, t1: 1.6 },
  { w: 'inside', at: [240, 340], name: 'CONTROL BOARD', note: 'the electronic controller', dx: 20, dy: -60, t0: 1.62, t1: 2.15 },
];
L.s09_sources = [
  { w: 'inside', at: [472, 70], name: 'AIR INLET', note: 'medical air, 21% O₂', dx: -18, dy: -40, t0: 2.0, t1: 2.66 },
  { w: 'inside', at: [472, 150], name: 'O₂ INLET', note: 'pure oxygen', dx: -18, dy: 36, t0: 2.12, t1: 2.66 },
];
// ---- C: the gas blender ----
L.s10_air = [
  { w: 'inside', at: [472, 70], name: 'MEDICAL AIR', note: '21% O₂, mostly N₂', dx: -24, dy: -62, t0: 0.08, t1: 0.82 },
  { w: 'inside', at: [446, 82], name: 'FILTER', note: 'cleans the gas', dx: 8, dy: 46, t0: 0.6, t1: 1.3 },
  { w: 'inside', at: [404, 55], name: 'REGULATOR', note: 'keeps the pressure steady', dx: -10, dy: -62, t0: 1.05, t1: 1.62 },
];
L.s11_oxygen = [{ w: 'inside', at: [446, 150], name: 'OXYGEN SUPPLY', note: '100% O₂, filtered, regulated', dx: -30, dy: -64, t0: 0.65, t1: 1.62 }];
L.s12_valves = [
  { w: 'inside', at: [355, 64], name: 'AIR VALVE', note: 'opens wider', dx: 20, dy: -40, t0: 0.25, t1: 2.08 },
  { w: 'inside', at: [355, 144], name: 'O₂ VALVE', note: 'opens less', dx: 20, dy: -40, t0: 0.6, t1: 2.08 },
  { w: 'inside', at: [326, 112], name: 'SETS FiO₂ 40%', note: 'the share of oxygen', dx: -14, dy: -6, t0: 1.05, t1: 2.08 },
];
L.s13_mix = [{ w: 'inside', at: [222, 98], name: 'MIXING CHAMBER', note: 'air + O₂ → one blend, 40% O₂', dx: -8, dy: -62, align: 'center', t0: 0.4, t1: 2.08 }];
L.s14_o2sensor = [
  { w: 'inside', at: [160, 130], name: 'O₂ SENSOR', note: 'checks the blend', dx: 24, dy: 44, t0: 0.08, t1: 0.95 },
  { w: 'inside', at: (S, lo) => { const R = INSIDE.R.tO2, q = SHOT.sig14(lo); return q > 0.02 && q < 0.98 ? BREATH.at(R, R.S, q * BREATH.len(R)) : null; }, name: 'SIGNAL', note: 'reading to the controller', dx: 22, dy: -40, t0: 1.0, t1: 2.55 },
];
// ---- D: the breath controller ----
L.s15_timer = [{ w: 'inside', at: [216, 296], name: 'BREATH TIMER', note: 'one breath every 4.3 s', dx: 22, dy: 34, t0: 0.12, t1: 2.08 }];
L.s16_signals = [
  { w: 'inside', at: [222, 346], name: 'PROCESSOR', note: 'starts the breath', dx: 22, dy: 30, t0: 0.1, t1: 1.05 },
  { w: 'inside', at: [134, 196], name: 'INSPIRATORY VALVE', note: 'signal: open', dx: 10, dy: -42, t0: 1.1, t1: 1.85 },
];
L.s17_inspvalve = [
  { w: 'inside', at: [100, 192], name: 'INSPIRATORY VALVE', note: 'opens: the gas flows', dx: -14, dy: -46, t0: 0.12, t1: 1.85 },
  { w: 'inside', at: [134, 226], name: 'ACTUATOR', note: 'a coil moves the valve', dx: 8, dy: 42, t0: 0.6, t1: 1.85 },
];
L.s18_flowsensor = [
  { w: 'inside', at: [91, 300], name: 'FLOW SENSOR', note: 'measures the flow', dx: -14, dy: -52, t0: 0.3, t1: 1.2 },
  { w: 'inside', at: [244, 514], name: 'VOLUME', note: 'flow added up = mL delivered', dx: -10, dy: -52, align: 'center', t0: 1.45, t1: 2.1 },
];
L.s19_feedback = [
  { w: 'inside', at: [129, 372], name: 'PRESSURE SENSOR', note: 'airway pressure', dx: -12, dy: 46, t0: 0.15, t1: 1.15 },
  { w: 'inside', at: [240, 346], name: 'FEEDBACK', note: 'measure → compare → adjust', dx: 0, dy: -64, align: 'center', t0: 1.0, t1: 2.1 },
];
// ---- E: delivering the breath ----
L.s20_outlet = [
  { w: 'inside', at: [100, 600], name: 'OUTLET', note: 'the blend leaves', dx: 18, dy: -50, t0: 0.02, t1: 0.58 },
  { w: 'macro', at: [68, 296], name: 'TO THE HUMIDIFIER', note: 'warm and wet the gas', dx: 0, dy: -64, align: 'center', t0: 0.9, t1: 1.6 },
];
L.s21_humidifier = [
  { w: 'humid', at: [-50, 86], name: 'HEATER PLATE', note: 'warms the water', dx: 14, dy: 34, t0: 0.1, t1: 1.05 },
  { w: 'humid', at: [24, 4], name: 'WATER VAPOUR', note: 'molecules, not mist', dx: -10, dy: -70, align: 'center', t0: 0.9, t1: 1.85 },
];
L.s22_tube = [{ w: 'tube', rel: [-6, -34], name: 'INSPIRATORY LIMB', note: 'warm, moist gas to the patient', dx: 0, dy: -62, align: 'center', t0: 0.1, t1: 1.35 }];
L.s23_ypiece = [
  { w: 'ypiece', at: [40, -26], name: 'Y-PIECE', note: 'the two limbs meet', dx: -16, dy: -50, t0: 0.3, t1: 1.6 },
  { w: 'ypiece', at: [100, 50], name: 'EXPIRATORY LIMB', note: 'still: nothing goes out yet', dx: 14, dy: 26, t0: 0.35, t1: 1.05 },
];
L.s24_ett = [
  { w: 'macro', at: [3, -100], name: 'ENDOTRACHEAL TUBE', note: 'into the trachea', dx: 16, dy: -28, t0: 0.15, t1: 0.95 },
  { w: 'macro', at: [5.5, -71], name: 'CUFF', note: 'seals the airway', dx: 16, dy: 14, t0: 0.95, t1: 1.6 },
];
L.s25_bronchi = [{ scr: [135, 240], name: 'BRONCHIAL TREE', note: 'every airway splits in two', dx: 0, dy: -84, align: 'center', t0: 0.15, t1: 1.6 }];
// ---- F: gas exchange ----
L.s26_alveoli = [
  { w: 'acinus', at: S => ALV_C1(v(S)), name: 'ALVEOLI', note: 'they fill and stretch', dx: 30, dy: -96, t0: 0.2, t1: 1.2 },
  { w: 'acinus', at: S => capPt(7, v(S)), name: 'CAPILLARIES', note: 'blood flows round each sac', dx: -6, dy: 64, align: 'center', t0: 1.05, t1: 1.85 },
];
L.s27_membrane = [
  ['FLUID LINING', 2.5, 0.1], ['EPITHELIUM', 11, 0.35], ['INTERSTITIUM', 20, 0.6], ['ENDOTHELIUM', 28, 0.85], ['PLASMA', 46, 1.1],
].map(([name, y, t0]) => ({ w: 'barrier', rel: [-12, y - 14], name, dx: 36, dy: -4, t0, t1: 2.08 }));
L.s27_membrane.push({ scr: [135, 120], name: 'THE BARRIER', note: 'O₂ crosses five thin layers', dx: 0, dy: -60, align: 'center', t0: 0.15, t1: 2.08, noLeader: true });
L.s28_hemoglobin = [
  { w: 'barrier', at: S => [SHOT.rbc28(S.t) - 14, AIR.LAY.lumen + 22], name: 'RED BLOOD CELL', note: 'O₂ enters it', dx: 0, dy: 60, align: 'center', t0: 0.1, t1: 0.95 },
  { w: 'hb', at: [-30, -24], name: 'HEMOGLOBIN', note: 'four subunits, four hemes', dx: 0, dy: -70, align: 'center', t0: 1.3, t1: 2.3 },
  { w: 'hb', at: () => MICRO.hbHeme(0, 0, 0, 40, 0), name: 'HEME + O₂', note: 'iron holds O₂ (reversibly)', dx: -16, dy: 70, align: 'left', t0: 1.65, t1: 2.3 },
];
L.s29_exchange = [
  { scr: [70, 70], name: 'O₂ → BLOOD', note: 'down its gradient', col: 'o24', dx: 0, dy: 0, t0: 0.15, t1: 2.08, noLeader: true },
  { scr: [70, 400], name: 'CO₂ → AIR', note: 'the other way', col: 'co4', dx: 0, dy: 0, t0: 0.55, t1: 2.08, noLeader: true },
];
// ---- G: exhalation and PEEP ----
L.s30_volume = [{ w: 'inside', at: [272, 514], name: 'TARGET VOLUME', note: '450 mL: stop inspiration', dx: -14, dy: -60, t0: 0.6, t1: 1.6 }];
L.s31_switch = [
  { w: 'inside', at: [100, 194], name: 'INSPIRATORY VALVE', note: 'closes', dx: -12, dy: -46, t0: 0.1, t1: 0.9 },
  { w: 'inside', at: [366, 420], name: 'EXPIRATORY VALVE', note: 'opens: gas can leave', dx: -14, dy: -60, t0: 1.25, t1: 1.85 },
];
L.s32_recoil = [
  { w: 'macro', at: [30, -10], name: 'ELASTIC RECOIL', note: 'the lungs spring back (passive)', dx: 0, dy: 70, align: 'center', t0: 0.2, t1: 1.25 },
  { w: 'macro', at: [0, -52], name: 'EXHALED GAS', note: 'more CO₂, less O₂', dx: 18, dy: -20, t0: 1.25, t1: 2.1 },
];
L.s33_expflow = [
  { w: 'ypiece', at: [100, 46], name: 'EXPIRATORY LIMB', note: 'back to the ventilator', dx: -16, dy: 40, t0: 0.15, t1: 0.82 },
  { w: 'tube', rel: [-6, -34], name: 'EXHALED GAS', note: 'flows back to the machine', dx: 0, dy: -62, align: 'center', t0: 1.12, t1: 1.85 },
];
L.s34_expvalve = [
  { w: 'inside', at: [362, 424], name: 'EXPIRATORY VALVE', note: 'gas lifts the diaphragm', dx: -12, dy: -60, t0: 0.25, t1: 1.3 },
  { w: 'inside', at: [420, 432], name: 'EXHAUST', note: 'out of the machine', dx: 6, dy: 44, t0: 1.2, t1: 2.1 },
];
L.s35_peep = [
  { scr: [67, 360], name: 'PEEP 5 cmH₂O', note: 'pressure kept on', dx: 0, dy: -36, align: 'center', t0: 0.3, t1: 2.08 },
  { w: 'acinus', at: S => ALV_C1(v(S) + 0.18), name: 'ALVEOLI STAY OPEN', note: 'no collapse', dx: 0, dy: -100, align: 'center', t0: 0.6, t1: 2.08 },
];
// ---- H: feedback and the loop ----
L.s36_sensors = [{ w: 'inside', at: [220, 360], name: 'SENSOR DATA', note: 'pressure + flow to the processor', dx: 0, dy: 56, align: 'center', t0: 0.2, t1: 1.3 }];
L.s37_machine = [
  { w: 'macro', at: [92, 152], name: 'SCREEN', note: 'pressure, flow, volume', dx: -6, dy: -46, t0: 0.08, t1: 0.75 },
  { w: 'macro', at: [134, 268], name: 'VENTILATOR', note: 'one breath every 4.3 s', dx: 10, dy: 50, t0: 1.15, t1: 2.08 },
  { w: 'macro', at: [36, 302], name: 'HUMIDIFIER', dx: -14, dy: 26, t0: 1.3, t1: 2.08 },
  { w: 'macro', at: [-30, -40], name: 'PATIENT', dx: -10, dy: -40, t0: 1.45, t1: 2.08 },
];
L.s38_next = [{ scr: [204, 338], name: 'BREATH TIMER', note: 'the next breath is due', dx: 0, dy: -44, align: 'center', t0: 0.3, t1: 2.08 }];
L.s39_return = [{ w: 'macro', at: [-40, 4], name: 'LUNGS AT REST', note: 'PEEP keeps them open', dx: 26, dy: 62, t0: 0.3, t1: 1.6 }];
L.s40_loop = [{ w: 'macro', at: [0, -92], name: 'NEXT BREATH', note: 'the cycle repeats', dx: 16, dy: -8, t0: 0.2, t1: 1.45 }];
window.LABELS = { L };
LABELS.draw = (c, id, S, lo) => {
  const list = L[id]; if (!list) return;
  for (const o of list) {
    let ax, ay;
    if (o.scr) [ax, ay] = o.scr;
    else {
      const cam = (window.__cams || {})[o.w]; if (!cam) continue;
      const p = o.rel ? [cam.x + o.rel[0], cam.y + o.rel[1]] : typeof o.at === 'function' ? o.at(S, lo, cam) : o.at;
      if (!p) continue;
      [ax, ay] = K.S(cam, p[0], p[1]);
    }
    if (!(ax >= 3 && ay >= 3 && ax <= W - 3 && ay <= H - 3)) continue;   // its object has left the frame
    const [bw, bh] = CAP.size(o), dx = o.dx ?? 18, dy = o.dy ?? -26, align = o.align || (dx >= 0 ? 'left' : 'right');
    let x = o.scrX ?? ax + dx, y = o.scrY ?? ay + dy;
    const left = align === 'right' ? x - bw : align === 'center' ? x - bw / 2 : x, nl = U.clamp(left, 8, W - 8 - bw);
    x += nl - left; y = U.clamp(y, 30, H - 58 - bh);
    const t0 = o.g0 != null ? o.g0 - window.T0[id] : o.t0, t1 = o.g1 != null ? o.g1 - window.T0[id] : o.t1 ?? S.rdur - 0.4;
    if (o.g0 != null && (S.rt < t0 - 0.01 || S.rt > t1 + PIX.FADE)) continue;
    CAP.tag(c, S.rt, { ...o, ax: o.noLeader ? null : ax, ay, x: Math.round(x), y: Math.round(y), align, t0, t1 });
  }
};
})();
