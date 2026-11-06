// ============================================================================
// SCENES — the segment draws registered for the engine (SCENES[id].draw), their
// cameras (computed from the film time t only), labels and captions, and the lens
// circles the Kurzgesagt lens-reveal transitions dive through.
// ============================================================================
(() => {
  const { EV, q } = TL;
  const SCN = window.SCN = {};
  const k75 = MO.k75, quick = MO.bezier(0.32, 0, 0.12, 1);
  const key = (t, x, y, z, ease) => ({ t, x, y, z, ease });
  // ---------------------------------------------------------------- room_a: the hook, the reveal, the dive into the head
  const O1ROW = () => ROOM.rowY(3);
  SCN.camRoomA = t => {
    const cut = ROOM.hw(-78, -30), dv = ROOM.dive();
    return CAM.at([key(0, ROOM.TX1 - 96, O1ROW(), 6.5), key(EV.reveal, 576, 1010, 0.94, quick), key(EV.pushHead, 560, 1046, 0.98, MO.sineInOut),
      key(EV.cutaway, cut[0] + 30, cut[1] - 10, 2.6, k75), key(EV.dive, dv[0], dv[1], 7, MO.sineInOut), key(EV.dive + 0.8, dv[0], dv[1], 420, MO.expoIn)], t);
  };
  SCN.lens = (id, t) => {
    if (id === 'room_a') { const cam = SCN.camRoomA(t), [x, y] = CAM.toScreen(cam, ...ROOM.dive()); return { x, y, r: 2.7 * cam.z }; }
    if (id === 'room_b') return SCN.lensRoomB(t);
    if (id === 'cortex_a') { const cam = SCN.camCortexA(t), sp = CORTEX.SPINE, [x, y] = CAM.toScreen(cam, sp[0] + 6, sp[1] - 2); return { x, y, r: 6.8 * cam.z }; }
    return { x: 540, y: 960, r: 0 };
  };
  SCENES.room_a = { draw(c, lt, t) {
    const cam = SCN.camRoomA(t);
    ROOM.draw(c, cam, t, { cut: U.clamp((t - EV.cutaway) / 0.45) });
    { const [lx, ly] = CAM.toScreen(cam, 640, 1100); D.label(c, 'HOW EEG WORKS', lx, ly, t, EV.label1, EV.cutaway - 0.25); }
  } };
  // ---------------------------------------------------------------- cortex_a: the network, pyramidal neurons, the dive into a spine
  SCN.camCortexA = t => { const sp = CORTEX.SPINE;
    return CAM.at([key(EV.dive, 160, 860, 0.5), key(EV.network, -160, 860, 1.12, MO.quintOut), key(EV.pyramidal - 0.1, 240, 880, 1.12, MO.sineInOut),
      key(EV.align + 0.6, 30, 800, 1.55, MO.sineInOut), key(EV.spineDive, sp[0] + 6, sp[1] - 2, 6.5, k75), key(EV.spineDive + 0.7, sp[0] + 6, sp[1] - 2, 170, MO.expoIn)], t); };
  SCENES.cortex_a = { draw(c, lt, t) {
    const cam = SCN.camCortexA(t);
    CORTEX.draw(c, cam, t, { bursts: EV.bursts.concat([EV.pyramidal, EV.align]), align: U.clamp((t - EV.align) / 0.2) * (1 - U.clamp((t - EV.align - 1.3) / 0.3)), alignT: EV.align, spineGlow: U.clamp((t - EV.spineDive + 0.6) / 0.4) });
    D.label(c, 'NEURONS', 540, 330, t, EV.label2, EV.pyramidal - 0.2);
  } };
  // ---------------------------------------------------------------- synapse: release, binding, ion channels
  SCN.camSyn = t => CAM.at([key(EV.spineDive, 0, 0, 0.5), key(EV.spineDive + 0.85, 0, -20, 1.0, MO.quintOut), key(EV.channelsOpen - 0.3, 0, -10, 1.3, MO.sineInOut),
    key(EV.channelsOpen + 0.35, 0, 110, 2.05, k75), key(EV.pspSpread - 0.25, 0, 120, 2.1, MO.sineInOut), key(EV.pspSpread + 0.5, 0, 60, 0.7, MO.cubicIn)], t);
  SCENES.synapse = { draw(c, lt, t) {
    const cam = SCN.camSyn(t);
    SYN.draw(c, cam, t, { inside: U.clamp((t - EV.ions[1]) / 0.8) });
    { const [ax, ay] = CAM.toScreen(cam, SYN.RECEPT[1], 30); D.caption(c, 'ion currents', 120, 520, t, EV.cap1, EV.pspSpread - 0.3, { ax, ay }); }
  } };
  // ---------------------------------------------------------------- cortex_b: potentials, population, fields, volume conduction
  SCN.camCortexB = t => { const sp = CORTEX.SPINE;
    return CAM.at([key(EV.pspSpread - 0.3, sp[0] + 6, sp[1], 9), key(EV.pspSpread + 0.8, 0, 760, 1.45, MO.quintOut), key(EV.neighbours, 0, 800, 1.32, MO.sineInOut),
      key(EV.population, -260, 820, 0.9, k75), key(EV.field - 0.1, 380, 820, 0.84, MO.sineInOut), key(EV.volume, 0, 120, 0.3, k75),
      key(EV.headOut - 0.05, 0, -5200, 0.135, MO.sineInOut), key(EV.headOut + 0.6, 0, -5900, 0.125, MO.sineInOut)], t); };
  SCENES.cortex_b = { draw(c, lt, t) {
    const cam = SCN.camCortexB(t), syncK = n => { let a = 0; for (const ts of EV.sync) { const d = t - ts; if (d >= 0 && d < 0.45) a = Math.max(a, 1 - d / 0.45); } return a; };
    const near = U.clamp((t - EV.neighbours) / 0.5), pop = U.clamp((t - EV.population) / 0.4), fade = 1 - U.clamp((t - EV.volume) / 0.8);
    CORTEX.draw(c, cam, t, {
      psp: (t - EV.pspSpread) / 0.85, heroDip: U.clamp((t - EV.sinkSource) / 0.35) * fade,
      dip: (n, i) => { const d = Math.abs(n.x); const nb = d < 520 ? U.clamp((t - EV.neighbours - d / 2600) / 0.35) : 0; return Math.max(nb * (1 - pop * 0.5), pop * (0.35 + 0.65 * syncK(n))) * fade; },
      sum: U.clamp((t - EV.cap2) / 0.5) * (1 - U.clamp((t - EV.volume - 0.4) / 0.8)), rip: U.clamp((t - EV.field) / 0.3), ripT0: EV.field,
      scalpGlow: U.clamp((t - EV.scalpReach) / 0.5), heroCol: [D.mix(COL.lav, COL.cyan, 0.25), COL.lavSh, COL.lavHi],
    });
    { const [ax, ay] = CAM.toScreen(cam, 0, 700); D.caption(c, 'fields add up', 600, 420, t, EV.cap2, EV.field + 0.6, { ax, ay }); }
    { const [ax, ay] = CAM.toScreen(cam, 2600, -3800); D.caption(c, 'spreads to the scalp', 560, 330, t, EV.cap3, EV.headOut - 0.2, { ax, ay, align: 'center' }); }
  } };
  // ---------------------------------------------------------------- room_b: the head from outside, the electrode array, the dive into O1
  SCN.camRoomB = t => { const o1 = ROOM.O1();
    return CAM.at([key(EV.headOut, o1[0], o1[1], 3.6), key(EV.headOut + 0.95, 300, 1176, 1.75, MO.quintOut), key(EV.electrodeDive - 0.45, 292, 1170, 1.85, MO.sineInOut),
      key(EV.electrodeDive, o1[0], o1[1], 6, k75), key(EV.electrodeDive + 0.7, o1[0], o1[1], 125, MO.expoIn)], t); };
  SCENES.room_b = { draw(c, lt, t) {
    const cam = SCN.camRoomB(t);
    ROOM.draw(c, cam, t, { glint: k => { const i = ROOM.ELEC_ORDER.indexOf(k), te = EV.electrodes[i]; const d = t - te; return d >= 0 && d < 0.5 ? 1 - d / 0.5 : 0; },
      gel: U.clamp((t - EV.gel) / 0.3) * (1 - U.clamp((t - EV.gel - 0.6) / 0.4)), o1: U.clamp((t - EV.electrodeDive + 0.5) / 0.4) });
    { const [ax, ay] = CAM.toScreen(cam, ...ROOM.hw(...ROOM.ELEC.C3)); D.label(c, 'SCALP ELECTRODES', 540, 420, t, EV.label3, EV.electrodeDive - 0.3); }
  } };
  // ---------------------------------------------------------------- chain: electrode -> differential channel -> amplifier -> filter -> ADC
  SCN.camChain = t => { const Y = CHAIN.Y;
    return CAM.at([key(EV.electrodeDive, 540, Y.skin - 120, 0.45), key(EV.electrodeDive + 0.85, 560, 470, 1.0, MO.quintOut), key(EV.twoInputs - 0.1, 560, 500, 1.04, MO.sineInOut),
      key(EV.twoInputs + 0.55, 540, 1240, 1.0, k75), key(EV.weak - 0.15, 540, 1460, 1.0, MO.sineInOut), key(EV.weak + 0.35, 540, Y.weak - 40, 1.0, k75),
      key(EV.amp - 0.1, 540, Y.weak, 1.0, MO.sineInOut), key(EV.amp + 0.45, 540, Y.amp + 60, 0.98, k75), key(EV.cmrr - 0.2, 540, Y.amp + 40, 1.1, MO.sineInOut),
      key(EV.filter - 0.1, 540, Y.amp + 40, 1.1, MO.sineInOut), key(EV.filter + 0.45, 540, Y.filt + 20, 1.0, k75), key(EV.adc - 0.1, 540, Y.filt + 60, 1.02, MO.sineInOut),
      key(EV.adc + 0.35, 540, Y.adc, 1.0, k75), key(EV.digital, 540, Y.adc - 10, 1.12, MO.sineInOut), key(EV.display + 0.6, 540, Y.adc - 20, 2.4, MO.cubicIn)], t); };
  SCN.lensRoomB = t => { const cam = SCN.camRoomB(t), [x, y] = CAM.toScreen(cam, ...ROOM.O1()); return { x, y, r: 9 * cam.z }; };
  SCENES.chain = { draw(c, lt, t) {
    const cam = SCN.camChain(t), Y = CHAIN.Y;
    CHAIN.draw(c, cam, t);
    { const [ax, ay] = CAM.toScreen(cam, 540, Y.diff); D.caption(c, 'measures A − B', 830, 1010, t, EV.cap4, EV.weak - 0.2, { ax, ay, align: 'center' }); }
    { const [ax, ay] = CAM.toScreen(cam, 540, Y.weak - 330); D.caption(c, 'microvolts', 300, 470, t, EV.cap5, EV.amp - 0.25, { ax, ay }); }
    D.label(c, 'AMPLIFIER', 540, 300, t, EV.label4, EV.cmrr - 0.2);
    { const [ax, ay] = CAM.toScreen(cam, 190, Y.amp - 330); D.caption(c, 'shared noise cancels', 200, 960, t, EV.cap6, EV.filter - 0.2, { ax, ay, align: 'center' }); }
    { const [ax, ay] = CAM.toScreen(cam, 540, Y.adc + 250); D.caption(c, 'sampled → digital', 540, 1395, t, EV.cap7, EV.display - 0.05, { ax, ay, align: 'center' }); }
  } };
  // ---------------------------------------------------------------- room_c: the recording, eyes closed, alpha, eyes open, the full setup, back to frame 0
  SCN.camRoomC = t => { const o1y = ROOM.rowY(3);
    return CAM.at([key(EV.display, (ROOM.TX0 + ROOM.TX1) / 2 + 60, o1y, 3.2), key(EV.channels + 0.7, 590, 530, 1.35, MO.quintOut), key(EV.toPatient - 0.05, 590, 540, 1.38, MO.sineInOut),
      key(EV.toPatient + 1.15, 420, 1170, 1.55, MO.sineInOut), key(EV.alphaFocus - 0.1, 410, 1160, 1.6, MO.sineInOut), key(EV.alphaFocus + 0.5, 560, 900, 1.0, k75), key(EV.eyesOpen - 0.45, 552, 890, 1.12, MO.sineInOut),
      key(EV.eyesOpen - 0.05, 640, 900, 1.45, k75), key(EV.setup, 642, 902, 1.47, MO.sineInOut), key(EV.setup + 0.85, 600, 1060, 0.82, MO.quintOut), key(EV.returnMon, 610, 1050, 0.86, MO.sineInOut),
      key(EV.returnMon + 1.0, 590, 640, 1.35, k75), key(EV.approach, 600, 600, 1.42, MO.sineInOut), key(55, ROOM.TX1 - 96, o1y, 6.5, MO.sineInOut)], t); };
  SCENES.room_c = { draw(c, lt, t) {
    const cam = SCN.camRoomC(t);
    const brain = U.clamp((t - EV.alphaFocus + 0.4) / 0.6) * (1 - U.clamp((t - EV.setup + 0.2) / 0.6));
    const pulse = (() => { let a = 0; for (const tp of EV.alphaPulses) { const d = t - tp; if (d >= 0 && d < 0.4) a = Math.max(a, 1 - d / 0.4); } return Math.max(a, 0.35 + 0.35 * Math.sin(TL.per(t) * Math.PI * 2 / TL.BEAT)) * TL.alphaEnv(t); })();
    const postFocus = U.clamp((t - EV.toPatient) / 0.6) * (1 - U.clamp((t - EV.alphaBlock - 0.4) / 0.6));
    const clin = U.clamp((t - EV.clinician) / 0.7) * (1 - U.clamp((t - EV.returnMon) / 0.8));
    ROOM.draw(c, cam, t, { brain, pulse, postFocus, clin });
    D.label(c, 'ALPHA RHYTHM', 540, 1010, t, EV.label5, EV.eyesOpen - 0.4);
    { const [ax, ay] = CAM.toScreen(cam, ROOM.TX1 - 180, ROOM.rowY(3)); D.caption(c, 'eyes open: alpha fades', 540, 1010, t, EV.cap8, EV.setup - 0.1, { ax, ay, align: 'center' }); }
    { const [ax, ay] = CAM.toScreen(cam, 590, 600); D.caption(c, 'voltage, not thoughts', 360, 905, t, EV.cap9, EV.returnMon - 0.2, { ax, ay, align: 'center' }); }
  } };
  const stub = id => ({ draw(c, lt, t) { c.fillStyle = COL.bg; c.fillRect(0, 0, 1080, 1920); c.fillStyle = COL.sub; c.font = '40px "Inter"'; c.fillText(id + ' ' + t.toFixed(2), 60, 120); } });
  for (const id of ['cortex_a', 'synapse', 'cortex_b', 'room_b', 'chain', 'room_c']) SCENES[id] = SCENES[id] || stub(id);
})();
