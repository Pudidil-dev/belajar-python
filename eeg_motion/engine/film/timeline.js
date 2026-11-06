// ============================================================================
// TIMELINE — the beat grid and the event table shared by the picture (browser)
// and the soundtrack (Node, audio/audio.js). 55.000 s = 24 bars of 4/4 at
// 104.73 BPM (96 beats). Every event sits on the sixteenth-note grid, so each
// sound effect lands on the beat of the score.
// Also the patient's eyelids and the posterior alpha envelope (both periodic
// over 55 s, so the loop point is just another moment).
// ============================================================================
(function (G) {
  const DUR = 55, BEATS = 96, BEAT = DUR / BEATS, S16 = BEAT / 4, BPM = 60 / BEAT, BAR = 4 * BEAT;
  const q = n => n * S16;                                  // sixteenth index -> seconds
  const per = t => ((t % DUR) + DUR) % DUR;               // cyclic time
  // the 27 micro-scenes (start sixteenths); scene k runs from SC[k] to SC[k + 1]
  const SC = [0, 7, 14, 21, 35, 49, 63, 77, 91, 105, 119, 133, 147, 161, 175, 189, 202, 216, 230, 244, 258, 272, 286, 307, 321, 349, 370, 384];
  const SCENE_NAMES = ['EEG HOOK', 'THE RECORDING', 'HOW EEG WORKS', 'INTO THE HEAD', 'CORTICAL NETWORK', 'PYRAMIDAL NEURONS', 'SYNAPTIC ACTIVITY',
    'ION CURRENTS', 'POSTSYNAPTIC POTENTIALS', 'POPULATION SYNCHRONY', 'EXTRACELLULAR FIELDS', 'VOLUME CONDUCTION', 'SCALP ELECTRODES', 'ELECTRODE POTENTIALS',
    'DIFFERENTIAL RECORDING', 'THE WEAK SIGNAL', 'DIFFERENTIAL AMPLIFIER', 'COMMON-MODE REJECTION', 'FILTERING', 'ANALOG TO DIGITAL', 'MULTICHANNEL EEG',
    'EYES CLOSED', 'ALPHA RHYTHM', 'EYES OPEN', 'THE EEG RECORDING', 'BACK TO THE MONITOR', 'THE LOOP'];
  const sceneIndex = t => { let i = 0; while (i + 1 < SC.length - 1 && t >= q(SC[i + 1])) i++; return i; };
  const r = (a, b, step) => { const o = []; for (let n = a; n <= b; n += step || 1) o.push(q(n)); return o; };
  const EV = {
    // A — the hook: the trace is already scrolling; the camera pulls back; the patient finishes closing their eyes; into the head
    pull: q(0), reveal: q(7), eyesShut: q(10), label1: q(14), pushHead: q(16), cutaway: q(21), layers: r(22, 25), dive: q(28),
    // B — inside the brain: the network, pyramidal neurons, a synapse, ion channels, potentials, synchrony
    network: q(35), label2: q(36), bursts: [q(38), q(42), q(46)], pyramidal: q(49), align: q(54),
    spineDive: q(63), vesicle: q(66), release: q(68), bind: q(72), channelsOpen: q(77), cap1: q(78), ions: r(80, 86, 2),
    pspSpread: q(92), sinkSource: q(96), neighbours: q(100), population: q(105), sync: r(108, 114, 2), cap2: q(112),
    // C — to the electrodes: the field, volume conduction, the electrode array, one electrode, a differential channel
    field: q(119), contours: [q(120), q(124), q(128)], volume: q(133), cap3: q(134), layersCross: [q(134), q(137), q(140)], scalpReach: q(142),
    headOut: q(146), electrodes: r(148, 158), label3: q(152), gel: q(159), electrodeDive: q(161), sense: q(166), wave: q(170),
    twoInputs: q(175), cap4: q(178), subtract: q(180), channelOut: q(184),
    // D — the machine: the weak signal, the amplifier, common-mode rejection, filtering, sampling
    weak: q(189), cap5: q(190), hum: q(192), drift: q(196), amp: q(202), label4: q(204), gain: q(208),
    cmrr: q(216), cap6: q(218), cancel: q(222), filter: q(230), trim: q(234), pass: q(238),
    adc: q(244), cap7: q(246), samples: r(246, 253), digital: q(254),
    // E — the payoff: the display, eyes closed, alpha, eyes open, the full recording
    display: q(258), channels: q(262), toPatient: q(272), alphaFocus: q(286), label5: q(288), alphaPulses: [q(290), q(294), q(298), q(302)],
    eyesOpen: q(309), alphaBlock: q(311), cap8: q(312), setup: q(321), clinician: q(328), cap9: q(332),
    // F — the loop: back to the monitor, the eyelids relax, one trace, the opening composition
    returnMon: q(349), eyesRelax: q(362), approach: q(368), highlight: q(372),
  };
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  // eyelid closure L (0 open, 1 closed): relaxes from 51.85 s, half-closed through the loop point, fully closed at EV.eyesShut;
  // opens briskly at EV.eyesOpen. Periodic: L(55) = L(0).
  function lid(t) {
    const u = per(t), x = u < 30 ? u + DUR : u;             // x in [30, 85): the closing straddles the loop point
    if (x < EV.eyesOpen) return 1;
    if (x < EV.eyesOpen + 0.14) return 1 - sm(seg(x, EV.eyesOpen, EV.eyesOpen + 0.14));
    if (x < EV.eyesRelax) return 0;
    if (x < EV.eyesRelax + 1.0) return 0.55 * sm(seg(x, EV.eyesRelax, EV.eyesRelax + 1.0));
    if (x < DUR + 0.43) return 0.55;
    if (x < DUR + EV.eyesShut) return 0.55 + 0.45 * sm(seg(x, DUR + 0.43, DUR + EV.eyesShut));
    return 1;
  }
  // posterior alpha envelope E (0..1): grows after the eyes close, blocks within ~0.3 s when they open (periodic)
  function alphaEnv(t) {
    const u = per(t), x = u < 30 ? u + DUR : u;
    if (x < EV.eyesOpen) return 1;
    if (x < EV.eyesOpen + 0.3) return 1 - 0.88 * sm(seg(x, EV.eyesOpen, EV.eyesOpen + 0.3));
    if (x < EV.eyesRelax) return 0.12;
    if (x < EV.eyesRelax + 1.35) return 0.12 + 0.48 * sm(seg(x, EV.eyesRelax, EV.eyesRelax + 1.35));
    if (x < DUR + 0.6) return 0.6;
    if (x < DUR + 2.0) return 0.6 + 0.4 * sm(seg(x, DUR + 0.6, DUR + 2.0));
    return 1;
  }
  // the O1 trace's highlight on the monitor (1 at the loop point, fades out after the reveal, returns at the end)
  function highlight(t) {
    const u = per(t);
    if (u < 1.0) return 1;
    if (u < 1.6) return 1 - sm(seg(u, 1.0, 1.6));
    if (u < EV.approach) return 0;
    if (u < EV.highlight) return sm(seg(u, EV.approach, EV.highlight));
    return 1;
  }
  G.TL = { DUR, BEATS, BEAT, S16, BPM, BAR, q, per, SC, SCENE_NAMES, sceneIndex, EV, lid, alphaEnv, highlight, sm, seg };
})(typeof window !== 'undefined' ? window : globalThis);
