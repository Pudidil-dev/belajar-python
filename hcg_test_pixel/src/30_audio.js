'use strict';
// ============================================================================
// AUDIO — an original, bouncy pixel-game chiptune at 120 BPM in D major
// (36 bars = 72.000 s) plus SFX built from the same chip voices, every one of
// them read from the picture's event table (03_clock.js), so each sound lands
// on the frame of the change it belongs to. Synthesised sample by sample in
// plain JS: two pulse channels (12.5 / 25 / 50 % duty, band-limited edges), a
// 4-bit stepped triangle (bass, kick), LFSR noise (snare, hats, sweeps), the
// classic 60 Hz arpeggiated chip chord, a dotted-eighth ping-pong echo on the
// lead. Everything that runs past 72 s wraps to 0:00, so the loop is seamless.
// Arc: a question-like hook (bars 1-2) → answer → hook → flowing arps (capillary
// flow) → gold sparkle (labels) → the hCG two-note motif → bind → build →
// capture → dense accumulation → percussion out for the optics (bars 21-24,
// a slowed oscillating tone follows the electron cloud) → the chorus when the
// line appears and the control works → calm comparison → caution → the hook
// again, whose last note (E over A) falls back into bar 1.
// Molecules, light and electrons make no sound: every SFX is illustrative.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const PENT = ['D', 'E', 'F#', 'A', 'B'];
const pent = (i, o) => { const k = ((i % 5) + 5) % 5; return nm(PENT[k], o + Math.floor(i / 5)); };
const CHD = { D: ['D', 'F#', 'A'], Bm: ['B', 'D', 'F#'], G: ['G', 'B', 'D'], A: ['A', 'C#', 'E'], Em: ['E', 'G', 'B'], Gmaj7: ['G', 'B', 'D', 'F#'], Bm7: ['B', 'D', 'F#', 'A'] };
function chordMidi(name, oct) { let prev = -1; return CHD[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
const BARS = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Bm', 'A', 'D', 'A', 'Bm', 'G',
  'Gmaj7', 'A', 'Bm7', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Em', 'A', 'D', 'A'];
function sec(b) {
  return b <= 2 ? 'hook' : b <= 4 ? 'answer' : b <= 6 ? 'hook2' : b <= 8 ? 'flow' : b <= 10 ? 'labels' : b <= 12 ? 'hcg' : b <= 14 ? 'bind' :
    b <= 16 ? 'build' : b <= 18 ? 'capture' : b <= 20 ? 'accum' : b <= 22 ? 'optic' : b <= 24 ? 'plasmon' : b <= 30 ? 'chorus' :
      b <= 32 ? 'compare' : b <= 34 ? 'caution' : 'hook';
}
// melodies: [step (16ths), note, octave, length (16ths)]
const MEL = {
  hookA: [[0, 'F#', 5, 2], [2, 'A', 5, 2], [4, 'D', 6, 3], [7, 'C#', 6, 1], [8, 'A', 5, 2], [10, 'F#', 5, 2], [12, 'A', 5, 4]],
  hookB: [[0, 'B', 5, 3], [3, 'A', 5, 1], [4, 'F#', 5, 2], [6, 'D', 5, 2], [8, 'E', 5, 6]],
  ansA: [[0, 'B', 5, 2], [2, 'D', 6, 2], [4, 'G', 5, 4], [8, 'B', 5, 2], [10, 'A', 5, 6]],
  ansB: [[0, 'C#', 6, 2], [2, 'E', 6, 2], [4, 'A', 5, 4], [8, 'E', 5, 8]],
  labA: [[0, 'F#', 5, 1], [1, 'B', 5, 1], [2, 'D', 6, 2], [4, 'B', 5, 1], [5, 'F#', 5, 1], [6, 'D', 5, 2], [8, 'F#', 5, 1], [9, 'B', 5, 1], [10, 'D', 6, 2], [12, 'C#', 6, 4]],
  labB: [[0, 'D', 6, 1], [1, 'B', 5, 1], [2, 'G', 5, 2], [4, 'B', 5, 1], [5, 'D', 6, 1], [6, 'G', 6, 2], [8, 'F#', 6, 4], [12, 'E', 6, 4]],
  hcgA: [[0, 'A', 5, 2], [2, 'D', 6, 6], [8, 'A', 5, 2], [10, 'D', 6, 2], [12, 'F#', 6, 4]],
  hcgB: [[0, 'E', 6, 4], [4, 'C#', 6, 2], [6, 'A', 5, 2], [8, 'E', 6, 8]],
  bindA: [[0, 'D', 6, 3], [3, 'B', 5, 1], [4, 'G', 5, 4], [8, 'B', 5, 2], [10, 'D', 6, 2], [12, 'G', 6, 4]],
  bindB: [[4, 'C#', 6, 4], [8, 'E', 6, 2], [10, 'A', 5, 6]],
  capA: [[8, 'F#', 6, 2], [10, 'A', 6, 6]],
  capB: [[0, 'G', 6, 2], [2, 'F#', 6, 2], [4, 'E', 6, 4], [8, 'C#', 6, 2], [10, 'E', 6, 6]],
  accA: [[0, 'B', 5, 1], [2, 'D', 6, 1], [4, 'F#', 6, 1], [6, 'B', 6, 1], [8, 'A', 6, 1], [10, 'F#', 6, 1], [12, 'D', 6, 1], [14, 'F#', 6, 1]],
  accB: [[0, 'G', 6, 1], [2, 'D', 6, 1], [4, 'B', 5, 1], [6, 'D', 6, 1], [8, 'G', 6, 2], [10, 'A', 6, 2], [12, 'B', 6, 4]],
  optA: [[0, 'F#', 6, 8], [8, 'D', 6, 8]], optB: [[0, 'E', 6, 8], [8, 'C#', 6, 8]],
  c1: [[0, 'D', 6, 2], [2, 'D', 6, 1], [3, 'E', 6, 1], [4, 'F#', 6, 2], [6, 'A', 6, 2], [8, 'F#', 6, 2], [10, 'E', 6, 2], [12, 'D', 6, 2], [14, 'A', 5, 2]],
  c2: [[0, 'C#', 6, 3], [3, 'D', 6, 1], [4, 'E', 6, 4], [8, 'A', 5, 2], [10, 'C#', 6, 2], [12, 'E', 6, 4]],
  c3: [[0, 'D', 6, 2], [2, 'C#', 6, 1], [3, 'B', 5, 1], [4, 'F#', 5, 2], [6, 'B', 5, 2], [8, 'D', 6, 2], [10, 'F#', 6, 2], [12, 'E', 6, 2], [14, 'D', 6, 2]],
  c4: [[0, 'B', 5, 2], [2, 'D', 6, 2], [4, 'G', 6, 4], [8, 'F#', 6, 2], [10, 'E', 6, 2], [12, 'D', 6, 4]],
  c6: [[0, 'C#', 6, 2], [2, 'E', 6, 2], [4, 'A', 6, 6], [10, 'G', 6, 2], [12, 'F#', 6, 2], [14, 'E', 6, 2]],
  cmpA: [[0, 'B', 5, 4], [4, 'D', 6, 4], [8, 'B', 5, 2], [10, 'A', 5, 6]], cmpB: [[0, 'C#', 6, 4], [4, 'E', 6, 4], [8, 'A', 5, 8]],
  cauA: [[0, 'G', 5, 6], [8, 'E', 5, 8]], cauB: [[0, 'C#', 5, 6], [8, 'E', 5, 4], [12, 'A', 4, 4]],
};
// which melody plays in each bar (lead instrument, volume, duty)
const LEAD_PLAN = {
  1: ['hookA', 0.36], 2: ['hookB', 0.36], 3: ['ansA', 0.3], 4: ['ansB', 0.3], 5: ['hookA', 0.34], 6: ['hookB', 0.34],
  9: ['labA', 0.26, 0.125], 10: ['labB', 0.26, 0.125], 11: ['hcgA', 0.34, 0.5], 12: ['hcgB', 0.32, 0.5], 13: ['bindA', 0.3], 14: ['bindB', 0.3],
  17: ['capA', 0.4], 18: ['capB', 0.36], 19: ['accA', 0.3, 0.5], 20: ['accB', 0.3, 0.5], 21: ['optA', 0.2, 0.125], 22: ['optB', 0.2, 0.125],
  25: ['c1', 0.4], 26: ['c2', 0.4], 27: ['c3', 0.4], 28: ['c4', 0.4], 29: ['c1', 0.42], 30: ['c6', 0.42],
  31: ['cmpA', 0.28, 0.125], 32: ['cmpB', 0.28, 0.125], 33: ['cauA', 0.24, 0.5], 34: ['cauB', 0.24, 0.5], 35: ['hookA', 0.36], 36: ['hookB', 0.36],
};
function musicEvents() {
  const ev = [];
  const N = (t, d, k, m, v, p, x) => ev.push(Object.assign({ t, d, k, f: m === null ? 0 : mtof(m), m, v, p: p || 0 }, x || {}));
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, chn = BARS[b - 1], s = sec(b), at = beat => t0 + beat * BEAT;
    const tri = chordMidi(chn, 4), root = nm(CHD[chn][0], 2) + (NOTE[CHD[chn][0]] < 2 ? 12 : 0);
    // ---- bass (triangle)
    if (s === 'hook') { N(at(0), BEAT * 1.8, 'tri', root, 0.42); N(at(2), BEAT * 1.4, 'tri', root + 7, 0.38); N(at(3.5), BEAT * 0.4, 'tri', root + 12, 0.34); }
    else if (s === 'answer' || s === 'hook2' || s === 'compare') for (let i = 0; i < 4; i++) N(at(i), BEAT * 0.85, 'tri', root + [0, 0, 7, 0][i] + (i === 3 ? 12 : 0), 0.44);
    else if (s === 'accum') for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.7, 'tri', root + (i % 4 === 2 ? 12 : 0), i % 2 ? 0.36 : 0.5);
    else if (s === 'optic' || s === 'plasmon') N(at(0), BAR * 0.96, 'tri', root, 0.36);
    else if (s === 'caution') { N(at(0), BEAT * 1.8, 'tri', root, 0.4); N(at(2), BEAT * 1.8, 'tri', root, 0.36); }
    else for (let i = 0; i < 8; i++) N(at(i / 2), E8 * 0.82, 'tri', root + (i % 2 ? 12 : 0) + (s === 'chorus' && i === 7 ? -2 : 0), s === 'build' ? 0.42 + 0.01 * i : 0.48);
    // ---- drums
    const kick = (beat, v) => ev.push({ t: at(beat), d: 0.12, k: 'kick', v });
    const snare = (beat, v) => ev.push({ t: at(beat), d: 0.16, k: 'snare', v, p: 0.1 });
    const hat = (beat, v, open) => ev.push({ t: at(beat), d: open ? 0.14 : 0.04, k: 'hat', v, p: (beat * 2) % 2 ? 0.35 : -0.35, open });
    const groove = (kv, sv, hv, h16) => { kick(0, kv); kick(1.5, kv * 0.7); kick(2, kv); snare(1, sv); snare(3, sv); for (let i = 0; i < (h16 ? 16 : 8); i++) hat(i * (h16 ? 0.25 : 0.5), hv * (i % 2 ? 0.75 : 1)); };
    if (s === 'hook') { kick(0, 0.6); for (let i = 1; i < 8; i++) hat(i * 0.5, 0.18); if (b % 2 === 0) { kick(2, 0.5); snare(3.5, 0.32); snare(3.75, 0.4); } }
    if (s === 'answer' || s === 'hook2') { kick(0, 0.75); kick(2, 0.7); snare(1, 0.42); snare(3, 0.46); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.24, i === 7 && b % 2 === 0); }
    if (s === 'flow') { groove(0.8, 0.5, 0.2, true); }
    if (s === 'labels' || s === 'hcg' || s === 'bind') groove(0.88, 0.62, 0.3, false);
    if (s === 'build') { for (let i = 0; i < 4; i++) kick(i, 0.7 + 0.04 * i); if (b === 15) { snare(1, 0.5); snare(3, 0.55); } else for (let i = 0; i < 16; i++) snare(i * 0.25, 0.16 + 0.03 * i); for (let i = 0; i < 16; i++) hat(i * 0.25, 0.2); }
    if (s === 'capture') groove(0.95, 0.7, 0.32, false);
    if (s === 'accum') { kick(0, 0.9); kick(0.5, 0.6); kick(2, 0.9); kick(2.5, 0.6); snare(1, 0.66); snare(3, 0.7); snare(3.75, 0.3); for (let i = 0; i < 16; i++) hat(i * 0.25, i % 2 ? 0.2 : 0.3, i === 15 && b === 20); }
    if (s === 'optic') { for (let i = 0; i < 4; i++) hat(i + 0.5, 0.12); }
    if (s === 'plasmon') { hat(1, 0.14); hat(3, 0.14); if (b === 24) { snare(3.5, 0.3); snare(3.75, 0.4); } }
    if (s === 'chorus') groove(0.95, 0.72, 0.32, b >= 29);
    if (s === 'compare') { kick(0, 0.7); kick(2, 0.65); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.2); }
    if (s === 'caution') { kick(0, 0.6); hat(2, 0.16, true); }
    if (b === 17 || b === 25) ev.push({ t: t0, d: 1.4, k: 'crash', v: 0.45 });
    // ---- arps and chords
    const arp16 = (v, oct, pat) => { const tones = [...tri, tri[0] + 12]; pat = pat || [0, 1, 2, 3, 2, 1, 2, 1]; for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.7, 'arp', tones[pat[i % pat.length]] + oct, v * (i % 4 === 0 ? 1 : 0.8), i % 2 ? 0.35 : -0.35, { echo: true }); };
    if (s === 'flow') arp16(0.15, 12);
    if (s === 'labels') arp16(0.12, 24, [0, 2, 3, 2]);
    if (s === 'hcg' || s === 'bind' || s === 'capture') arp16(0.1, 12);
    if (s === 'build') for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.55, 'arp', tri[i % 3] + 12 + (b - 15) * 5 + Math.floor(i / 4), 0.1 + 0.006 * i, i % 2 ? 0.3 : -0.3);
    if (s === 'accum') arp16(0.14, 12, [0, 1, 2, 3]);
    if (s === 'chorus') arp16(0.1, 12);
    if (s === 'optic' || s === 'plasmon' || s === 'caution') N(t0, BAR * 0.97, 'chord', tri[0] + 12, s === 'caution' ? 0.09 : 0.11, 0, { chord: tri.map(m => m + 12), soft: true });
    if (s === 'hook2' || s === 'answer' || s === 'compare') for (let i = 0; i < 8; i++) N(at(i / 2), E8 * 0.9, 'arp', [...tri, tri[1] + 12][i % 4] + 12, 0.11, i % 2 ? 0.4 : -0.4, { echo: true });
    // ---- the lead (pulse), with echo
    const lp = LEAD_PLAN[b];
    if (lp) MEL[lp[0]].forEach(([st, n, o, l]) => N(t0 + st * S16, l * S16 * 0.9, 'lead', nm(n, o), lp[1], 0, { duty: lp[2] || 0.25 }));
  }
  return ev;
}
// ---------------------------------------------------------------- SFX map (every cue belongs to a visible event)
function sfxEvents() {
  const ev = [], S = (t, k, v, x) => ev.push(Object.assign({ t, k, v }, x || {}));
  // 01 the mystery: two restrained percussive notes on the two glints
  S(EV.glintT, 'plink', 0.8, { f: mtof(nm('D', 6)) }); S(EV.glintC, 'plink', 0.8, { f: mtof(nm('A', 6)) });
  // 02 a fresh test
  S(EV.cut2, 'cut', 0.7); S(EV.dropper, 'slide', 0.55, { d: 0.6 }); S(EV.dropFall, 'blip', 0.35, { f: mtof(nm('B', 6)) });
  S(EV.dropHit, 'drop', 1.0); S(EV.soak, 'soak', 0.8, { d: 1.1 });
  // 03 reveal: the shell peels, each layer clicks in, the camera dives and turns
  S(EV.pull3, 'whoosh', 0.6, { d: 0.6 }); S(EV.peel, 'sweep', 0.8, { d: 1.0 });
  EV.layers.forEach((t, i) => S(t, 'layer', 0.7, { f: mtof(pent(5 + i, 5)) }));
  S(EV.dive, 'zoom', 0.9, { d: 1.2 }); S(EV.dive, 'turn90', 0.7, { d: 1.0 });
  // 04 capillary flow: soft granular texture, a drip as each pore fills
  S(EV.fibres, 'flowtex', 0.8, { d: 4.0 });
  EV.pores.forEach((t, i) => S(t, 'drip', 0.45, { f: mtof(pent(4 + (i % 3), 5)) }));
  // 05 labels: the camera pushes in, the dried labels tick free, lock-on
  S(EV.reachConj, 'zoom', 0.7, { d: 1.2 });
  EV.release.forEach((t, i) => S(t, 'tick', 0.75, { f: mtof(pent(7 + i, 5)) }));
  S(EV.lock, 'lock', 0.85);
  // 06 the target: hCG's two-note motif
  S(EV.pull6, 'whoosh', 0.55, { d: 0.9 }); S(EV.hcgTag, 'hcg', 1.0);
  // 07 first binding
  S(EV.push7, 'zoom', 0.5, { d: 0.75 });
  EV.turn.forEach((t, i) => S(t, 'nudge', 0.5, { f: mtof(pent(6 + i, 5)) }));
  S(EV.bind1, 'bind', 1.0);
  // 08 approach: travel, the zone comes into view, anticipation
  S(EV.pull8, 'whoosh', 0.7, { d: 0.9 }); S(EV.zoneIn, 'blip', 0.4, { f: mtof(nm('E', 6)) }); S(EV.rise, 'riser', 0.8, { d: 1.5 });
  // 09 the sandwich: a stronger click, then the chain lights link by link
  S(EV.push9, 'zoom', 0.45, { d: 0.75 }); S(EV.bind2, 'capture', 1.0);
  EV.chain.forEach((t, i) => S(t, 'link', 0.6, { f: mtof(pent(5 + i, 5)) }));
  EV.tags9.forEach(t => S(t, 'ui', 0.35));
  // 10 many captures: stepped pull-back, rhythmic captures, the flip to the top view
  EV.steps.forEach((t, i) => S(t, 'step', 0.7, { f: 700 - 120 * i }));
  EV.captures.forEach((t, i) => S(t, 'cap', 0.55 + 0.015 * i, { f: mtof(pent([5, 7, 6, 8][i % 4] + Math.floor(i / 8), 5)) }));
  S(EV.flip, 'flip', 0.75);
  // 11 why gold looks red: lock, the inset opens, white light arrives
  S(EV.lock11, 'lock', 0.7); S(EV.inset, 'window', 0.8); S(EV.light, 'optic', 0.9, { d: 1.8 });
  // 12 the electron cloud: an oscillating tone that follows it exactly; the light splits
  S(EV.osc, 'osc', 0.9, { d: 4.0 }); S(EV.plasmon, 'ui', 0.35); S(EV.strands, 'prism', 0.8); S(EV.absorbTag, 'ui', 0.35);
  // 13 the line: inset closes, pull back, resolving tone when the dots read as a line
  S(EV.insetClose, 'windowclose', 0.7); S(EV.zoomOut, 'zoomout', 0.8, { d: 2.0 }); S(EV.lineSeen, 'resolve', 1.0);
  // 14 control: lens opens, the different control click
  S(EV.lens14, 'lens', 0.75); S(EV.bindC, 'control', 1.0); S(EV.noHcgTag, 'ui', 0.35);
  // 15 two zones, two jobs: lens closes, two related confirmation notes
  S(EV.lensClose, 'lensclose', 0.7); S(EV.tagT, 'confirm', 0.9, { f: mtof(nm('D', 6)) }); S(EV.tagC, 'confirm', 0.9, { f: mtof(nm('A', 6)) });
  // 16 without detectable hCG: one control confirmation note
  S(EV.split, 'slide', 0.6, { d: 0.8 }); S(EV.negDots, 'trickle', 0.5, { d: 1.75 }); S(EV.negC, 'confirm', 0.9, { f: mtof(nm('A', 6)) });
  // 17 invalid: one restrained caution tone
  S(EV.invalidIn, 'slide', 0.6, { d: 0.7 }); S(EV.warn, 'caution', 0.85);
  // 18 back to the start
  S(EV.ret, 'slide', 0.7, { d: 1.2 }); S(EV.rest, 'land', 0.6);
  // the dialog box blips when a caption opens (soft)
  for (const t of [EV.cap2, EV.cap3, EV.cap4, EV.cap5, EV.cap6, EV.cap7, EV.cap8, EV.cap9, EV.cap10, EV.cap11, EV.cap12, EV.cap13, EV.cap14, EV.cap16, EV.cap17, EV.cap18]) S(t, 'box', 0.4);
  return ev.sort((a, b) => a.t - b.t);
}
const DUCK = { bind: 0.25, capture: 0.35, resolve: 0.3, control: 0.3, drop: 0.25, caution: 0.25 };
// ---------------------------------------------------------------- the chip
const LFSR = (() => {
  const long = new Float32Array(32767), short = new Float32Array(93);
  let r = 1; for (let i = 0; i < 32767; i++) { const b = ((r >> 0) ^ (r >> 1)) & 1; r = (r >> 1) | (b << 14); long[i] = r & 1 ? 1 : -1; }
  r = 1; for (let i = 0; i < 93; i++) { const b = ((r >> 0) ^ (r >> 6)) & 1; r = (r >> 1) | (b << 14); short[i] = r & 1 ? 1 : -1; }
  return { long, short };
})();
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function voice(L, R, t0, dur, pan, gain, fn) {
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR));
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) { const s = fn(k / SR, k); if (s === 0) continue; let i = i0 + k; i = ((i % NS) + NS) % NS; L[i] += s * pl; R[i] += s * pr; }
}
const env = (t, a, d, sus, rel, dur) => { const e = t < a ? t / a : t < a + d ? 1 - (1 - sus) * (t - a) / d : sus; return t > dur ? e * Math.max(0, 1 - (t - dur) / rel) : e; };
function pulseFn(fAt, duty, envFn) {
  let ph = 0;
  return (t) => {
    const f = Math.min(12000, fAt(t)), dt = f / SR; ph += dt; if (ph >= 1) ph -= 1;
    let v = ph < duty ? 1 : -1;
    v += polyblep(ph, dt); let p2 = ph - duty; if (p2 < 0) p2 += 1; v -= polyblep(p2, dt);
    return (v - (2 * duty - 1)) * envFn(t);
  };
}
function triFn(fAt, envFn) {
  let ph = 0;
  return (t) => { ph += fAt(t) / SR; if (ph >= 1) ph -= 1; const q = Math.floor(ph * 32), s = q < 16 ? q : 31 - q; return (s / 7.5 - 1) * envFn(t); };
}
function noiseFn(rateAt, envFn, short) {
  let ph = 0; const tab = short ? LFSR.short : LFSR.long, n = tab.length;
  return (t) => { ph += rateAt(t) / SR; return tab[Math.floor(ph) % n] * envFn(t); };
}
const vibAt = (f, t, depth, rate, delay) => t < delay ? f : f * Math.pow(2, depth / 12 * Math.sin((t - delay) * rate * TAU));
function playMusic(e, L, R, LL, LR) {
  const k = e.k;
  if (k === 'lead') {
    const d = e.d, duty = e.duty || 0.25, gain = 0.5 * e.v, mk = () => pulseFn(t => vibAt(e.f, t, 0.2, 5.8, 0.16), duty, t => env(t, 0.004, 0.08, 0.7, 0.05, d));
    voice(L, R, e.t, d + 0.06, -0.06, gain, mk()); voice(LL, LR, e.t, d + 0.06, -0.06, gain * 0.55, mk());
  } else if (k === 'arp') {
    voice(L, R, e.t, e.d + 0.04, e.p, 0.34 * e.v, pulseFn(() => e.f, 0.125, t => env(t, 0.002, 0.05, 0.45, 0.03, e.d)));
    if (e.echo) voice(LL, LR, e.t, e.d + 0.04, -e.p, 0.2 * e.v, pulseFn(() => e.f, 0.125, t => env(t, 0.002, 0.05, 0.45, 0.03, e.d)));
  } else if (k === 'chord') {
    const ch = e.chord, fn = pulseFn(t => mtof(ch[Math.floor(t * 60) % ch.length]), 0.25, t => env(t, e.soft ? 0.25 : 0.01, 0.4, 0.6, 0.3, e.d));
    voice(L, R, e.t, e.d + 0.3, 0.15, 0.3 * e.v, fn);
  } else if (k === 'tri') {
    voice(L, R, e.t, e.d + 0.02, 0, 0.42 * e.v, triFn(() => e.f, t => env(t, 0.003, 0.02, 1, 0.02, e.d)));
  } else if (k === 'kick') {
    voice(L, R, e.t, 0.14, 0, 0.62 * e.v, triFn(t => 58 + 190 * Math.exp(-t * 36), t => env(t, 0.001, 0.02, 0.8, 0.05, 0.07)));
    voice(L, R, e.t, 0.014, 0, 0.3 * e.v, noiseFn(() => 26000, t => Math.min(1, t / 0.0004) * (1 - t / 0.014)));
  } else if (k === 'snare') {
    voice(L, R, e.t, 0.17, e.p, 0.4 * e.v, noiseFn(() => 18000, t => Math.min(1, t / 0.0004) * Math.exp(-t * 22)));
    voice(L, R, e.t, 0.06, e.p, 0.2 * e.v, triFn(t => 220 - 600 * t, t => Math.exp(-t * 40)));
  } else if (k === 'hat') {
    voice(L, R, e.t, e.open ? 0.16 : 0.05, e.p, 0.2 * e.v, noiseFn(() => 40000, t => Math.min(1, t / 0.0004) * Math.exp(-t * (e.open ? 18 : 80)), true));
  } else if (k === 'crash') {
    voice(L, R, e.t, 1.5, 0, 0.28 * e.v, noiseFn(() => 30000, t => Math.min(1, t / 0.0004) * Math.exp(-t * 2.6)));
  }
}
// one SFX: chip blips, sweeps and noises tuned to D major pentatonic
// per-kind level trims (balanced against the music with tools/audio_qa.js)
const KG = { control: 1.6, confirm: 1.35, cap: 1.7, link: 1.6, zoom: 1.6, tick: 1.25, windowclose: 1.6, soak: 1.5, nudge: 2.2, trickle: 2.2,
  blip: 1.5, turn90: 1.5, riser: 1.35, zoomout: 1.35, layer: 1.25, drip: 1.25, ui: 1.3, box: 1.2 };
function playSfx(e, L, R) {
  const k = e.k, v = e.v * (KG[e.k] || 1), f = e.f || 880, p = e.p || 0;
  const pls = (t0, d, fAt, duty, envFn, g, pan) => voice(L, R, t0, d, pan === undefined ? p : pan, g * v, pulseFn(fAt, duty, envFn));
  const nz = (t0, d, rateAt, envFn, g, short, pan) => voice(L, R, t0, d, pan === undefined ? p : pan, g * v, noiseFn(rateAt, envFn, short));
  const tr = (t0, d, fAt, envFn, g) => voice(L, R, t0, d, p, g * v, triFn(fAt, envFn));
  const dec = r => t => Math.exp(-t * r), win = d => t => Math.sin(Math.PI * clamp(t / d, 0, 1));
  const atk = (r, a) => t => (t < a ? t / a : 1) * Math.exp(-t * r);            // short attack: onset stays crisp, no click
  switch (k) {
    case 'plink': pls(e.t, 0.3, () => f, 0.125, atk(12, 0.002), 0.34); tr(e.t, 0.12, () => f / 2, atk(25, 0.002), 0.3); break;
    case 'cut': nz(e.t, 0.05, () => 30000, atk(70, 0.001), 0.4, true); break;
    case 'slide': nz(e.t, e.d, t => 6000 + 9000 * (t / e.d), win(e.d), 0.16); break;
    case 'whoosh': nz(e.t, e.d, t => 9000 - 6000 * (t / e.d), win(e.d), 0.16); break;
    case 'blip': pls(e.t, 0.1, () => f, 0.25, atk(24, 0.002), 0.26); break;
    case 'drop': pls(e.t, 0.14, t => 520 * Math.pow(3.2, t / 0.1), 0.5, atk(16, 0.002), 0.36); nz(e.t + 0.02, 0.12, () => 22000, atk(30, 0.003), 0.18, true); tr(e.t, 0.1, t => 140 * Math.exp(-t * 8), atk(30, 0.002), 0.4); break;
    case 'soak': nz(e.t, e.d, t => 3000 + 1500 * Math.sin(t * 7), t => 0.6 * Math.sin(Math.PI * clamp(t / e.d, 0, 1)) * (0.7 + 0.3 * Math.sin(t * 31)), 0.16); break;
    case 'sweep': { const n = 10; for (let i = 0; i < n; i++) pls(e.t + i * e.d / n, 0.07, () => mtof(pent(i, 5)), 0.125, atk(30, 0.002), 0.14); nz(e.t, e.d, t => 4000 + 12000 * t / e.d, win(e.d), 0.08); break; }
    case 'layer': pls(e.t, 0.09, () => f, 0.5, atk(26, 0.002), 0.28); nz(e.t, 0.012, () => 36000, atk(200, 0.001), 0.18, true); break;
    case 'zoom': nz(e.t, e.d, t => 2500 + 30000 * (t / e.d), t => Math.pow(clamp(t / e.d, 0, 1), 1.5) * (t < e.d * 0.9 ? 1 : (e.d - t) / (e.d * 0.1)), 0.16); break;
    case 'turn90': pls(e.t, e.d, t => 220 * Math.pow(2, 2 * t / e.d) * (1 + 0.04 * Math.sign(Math.sin(t * 120))), 0.25, win(e.d), 0.12); break;
    case 'flowtex': { const r = mulberry(404); for (let tt = 0.15; tt < e.d - 0.1; tt += 0.025 + r() * 0.05) { const g = 0.05 + 0.06 * r(); nz(e.t + tt, 0.012, () => 9000 + 9000 * r(), dec(260), g * Math.sin(Math.PI * tt / e.d), true, (r() - 0.5) * 0.8); } break; }
    case 'drip': pls(e.t, 0.09, t => f * (1 + 2.5 * t), 0.5, atk(26, 0.002), 0.2); break;
    case 'tick': pls(e.t, 0.05, () => f, 0.5, atk(70, 0.001), 0.3); nz(e.t, 0.01, () => 40000, atk(220, 0.001), 0.16, true); break;
    case 'lock': pls(e.t, 0.05, () => mtof(nm('E', 6)), 0.5, atk(40, 0.001), 0.28); pls(e.t + 0.06, 0.12, () => mtof(nm('B', 6)), 0.5, atk(22, 0.001), 0.28); break;
    case 'hcg': {               // the hCG motif: A5 → D6, a fourth up, with a triangle an octave below
      pls(e.t, 0.16, () => mtof(nm('A', 5)), 0.5, t => env(t, 0.003, 0.03, 0.7, 0.03, 0.12), 0.3); tr(e.t, 0.16, () => mtof(nm('A', 4)), t => env(t, 0.003, 0.03, 0.7, 0.03, 0.12), 0.32);
      pls(e.t + 0.25, 0.5, t => vibAt(mtof(nm('D', 6)), t, 0.35, 7, 0.1), 0.5, t => env(t, 0.003, 0.08, 0.6, 0.12, 0.38), 0.3); tr(e.t + 0.25, 0.5, () => mtof(nm('D', 5)), t => env(t, 0.003, 0.08, 0.6, 0.12, 0.38), 0.32); break;
    }
    case 'nudge': pls(e.t, 0.04, () => f, 0.25, atk(70, 0.001), 0.18); break;
    case 'bind': nz(e.t, 0.02, () => 34000, atk(160, 0.001), 0.3, true); pls(e.t, 0.14, () => mtof(nm('F#', 6)), 0.5, atk(26, 0.001), 0.3); tr(e.t, 0.12, t => 200 * Math.exp(-t * 10) + 60, atk(18, 0.002), 0.4); break;
    case 'riser': { const n = Math.floor(e.d / 0.0625); for (let i = 0; i < n; i++) pls(e.t + i * 0.0625, 0.06, () => mtof(pent(i, 4)), 0.125, atk(40, 0.001), 0.08 + 0.008 * i); break; }
    case 'capture': nz(e.t, 0.03, () => 30000, atk(110, 0.001), 0.4, true); pls(e.t, 0.3, () => mtof(nm('D', 6)), 0.5, atk(9, 0.001), 0.24); pls(e.t, 0.3, () => mtof(nm('A', 6)), 0.25, atk(9, 0.001), 0.2); tr(e.t, 0.18, t => 260 * Math.exp(-t * 12) + 50, atk(12, 0.002), 0.55); break;
    case 'link': pls(e.t, 0.08, () => f, 0.25, atk(28, 0.001), 0.22); break;
    case 'ui': pls(e.t, 0.04, () => mtof(nm('E', 6)), 0.5, atk(70, 0.001), 0.14); break;
    case 'box': pls(e.t, 0.035, () => mtof(nm('A', 5)), 0.5, atk(80, 0.001), 0.12); pls(e.t + 0.04, 0.035, () => mtof(nm('E', 6)), 0.5, atk(80, 0.001), 0.12); break;
    case 'step': pls(e.t, 0.12, t => f * Math.pow(0.5, t / 0.1), 0.5, atk(18, 0.001), 0.24); break;
    case 'cap': nz(e.t, 0.012, () => 38000, atk(240, 0.001), 0.22, true); pls(e.t, 0.06, () => f, 0.5, atk(45, 0.001), 0.2, (hash(Math.round(e.t * 8)) - 0.5) * 0.8); break;
    case 'flip': nz(e.t, 0.12, t => 26000 - 120000 * t, win(0.12), 0.2); nz(e.t + 0.25, 0.12, t => 12000 + 120000 * t, win(0.12), 0.2); break;
    case 'window': [0, 0.1875, 0.375, 0.5625].forEach((dt, i) => pls(e.t + dt, 0.05, () => mtof(pent(5 + i, 5)), 0.25, atk(50, 0.001), 0.2)); break;
    case 'windowclose': [0, 0.125, 0.25, 0.375].forEach((dt, i) => pls(e.t + dt, 0.05, () => mtof(pent(8 - i, 5)), 0.25, atk(50, 0.001), 0.18)); break;
    case 'optic': tr(e.t, e.d, () => mtof(nm('A', 6)), t => env(t, 0.02, 0.3, 0.5, 0.4, e.d - 0.4), 0.2); for (let i = 0; i < 8; i++) pls(e.t + i * 0.09, 0.08, () => mtof(pent(10 + i, 5)), 0.125, atk(30, 0.002), 0.1); break;
    case 'osc': {              // follows the drawn electron cloud: pitch and pan swing with its displacement
      pls(e.t, e.d, t => mtof(nm('D', 5)) * (1 + 0.06 * cloudDy(e.t + t) / 9), 0.25, t => env(t, 0.05, 0.1, 0.8, 0.2, e.d - 0.25) * 0.7, 0.2, 0);
      tr(e.t, e.d, t => mtof(nm('D', 4)) * (1 + 0.06 * cloudDy(e.t + t) / 9), t => env(t, 0.05, 0.1, 0.8, 0.2, e.d - 0.25), 0.22); break;
    }
    case 'prism': [0, 0.08, 0.16].forEach((dt, i) => pls(e.t + dt, 0.18, () => mtof([nm('A', 6), nm('F#', 6), nm('D', 6)][i]), 0.125, atk(16, 0.001), 0.2)); break;
    case 'zoomout': nz(e.t, e.d, t => 26000 - 22000 * (t / e.d), t => win(e.d)(t) * 0.8, 0.13); pls(e.t, e.d * 0.8, t => 900 * Math.pow(0.35, t / (e.d * 0.8)), 0.125, win(e.d * 0.8), 0.08); break;
    case 'resolve': [nm('D', 5), nm('F#', 5), nm('A', 5), nm('D', 6)].forEach((m, i) => pls(e.t + i * 0.06, 0.7 - i * 0.06, () => mtof(m), 0.25, t => env(t, 0.002, 0.1, 0.55, 0.25, 0.4 - i * 0.04), 0.17)); tr(e.t, 0.6, () => mtof(nm('D', 4)), t => env(t, 0.002, 0.1, 0.6, 0.2, 0.4), 0.3); break;
    case 'lens': pls(e.t, 0.3, t => 300 * Math.pow(4, t / 0.3), 0.25, win(0.3), 0.18); break;
    case 'lensclose': pls(e.t, 0.3, t => 1200 * Math.pow(0.25, t / 0.3), 0.25, win(0.3), 0.18); break;
    case 'control': pls(e.t, 0.1, () => mtof(nm('G', 5)), 0.125, atk(24, 0.001), 0.3); pls(e.t + 0.05, 0.2, () => mtof(nm('B', 5)), 0.125, atk(16, 0.001), 0.3); nz(e.t, 0.02, () => 16000, atk(140, 0.001), 0.3, true); tr(e.t, 0.14, t => 180 * Math.exp(-t * 9) + 50, atk(16, 0.002), 0.45); break;
    case 'confirm': pls(e.t, 0.45, () => f, 0.25, t => env(t, 0.002, 0.06, 0.5, 0.2, 0.25), 0.2); tr(e.t, 0.45, () => f / 2, t => env(t, 0.002, 0.06, 0.5, 0.2, 0.25), 0.26); break;
    case 'trickle': { const r = mulberry(55); for (let tt = 0; tt < e.d; tt += 0.08 + r() * 0.07) pls(e.t + tt, 0.03, () => mtof(pent(8 + Math.floor(r() * 4), 5)), 0.5, atk(80, 0.001), 0.07); break; }
    case 'caution': pls(e.t, 0.16, () => mtof(nm('A', 3)), 0.5, t => env(t, 0.004, 0.03, 0.8, 0.04, 0.12), 0.2); pls(e.t + 0.2, 0.22, () => mtof(nm('G#', 3)), 0.5, t => env(t, 0.004, 0.03, 0.8, 0.06, 0.16), 0.2); break;
    case 'land': tr(e.t, 0.14, t => 120 * Math.exp(-t * 6) + 45, atk(14, 0.002), 0.5); nz(e.t, 0.04, () => 8000, atk(60, 0.001), 0.12); break;
  }
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    let LL = new Float32Array(NS), LR = new Float32Array(NS);
    for (const e of musicEvents()) playMusic(e, L, R, LL, LR);
    // dotted-eighth ping-pong echo on the lead bus (feedback 0.32, 6 taps, circular)
    const D = Math.round(0.375 * SR), fb = 0.32, mix = 0.36;
    for (let i = 0; i < NS; i++) {
      let el = 0, er = 0, w = 1;
      for (let k = 1; k <= 6; k++) { w *= fb; const j = (i - k * D + NS * 6) % NS; if (k % 2) { el += w * LR[j]; er += w * LL[j]; } else { el += w * LL[j]; er += w * LR[j]; } }
      L[i] += (LL[i] + el) * mix; R[i] += (LR[i] + er) * mix;
    }
    LL = null; LR = null;
    // in the full mix only: the music dips a little under the big hits
    if (opts.bus === undefined) for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.45 * SR), att = 0.01 * SR;
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k / SR - 0.01) * 7), gg = 1 - dk * a; L[i] *= gg; R[i] *= gg; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // the chip's output filter (gentle low-pass), DC blocking and soft clipping; circular, in place
  const a = Math.exp(-TAU * 11000 / SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9995 * (hp + y - x1); x1 = y;
      if (pass === 1) ch[i] = Math.tanh(hp * 0.9);
    }
  }
  return { L, R };
}
// ---------------------------------------------------------------- player playback (one buffer, the audio clock drives the picture)
const LIVE = { ctx: null, buf: null, src: null, gain: null, muted: false, startAt: 0, offset: 0, ready: false };
function liveInit() {
  if (LIVE.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  LIVE.ctx = new AC({ sampleRate: SR });
  LIVE.gain = LIVE.ctx.createGain(); LIVE.gain.gain.value = 0.9; LIVE.gain.connect(LIVE.ctx.destination);
}
function liveBuild() {
  if (LIVE.buf) return;
  liveInit();
  const a = renderAudio();
  const b = LIVE.ctx.createBuffer(2, NS, SR); b.getChannelData(0).set(a.L); b.getChannelData(1).set(a.R);
  LIVE.buf = b; LIVE.ready = true;
}
function livePlay(t) {
  liveBuild();
  if (LIVE.ctx.state === 'suspended') LIVE.ctx.resume();
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.loop = true; s.connect(LIVE.gain);
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return (LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt)) % DUR; }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
