'use strict';
// ============================================================================
// AUDIO — an original, calm lo-fi score at 127.06 BPM played half-time
// (36 bars = 68 s) in D major, plus physics-synced SFX. Rhodes-style electric
// piano on a I-vi-ii-V loop (Dmaj9 Bm9 Em9 A13) with jazzy detours, a warm
// round bass, swung half-time drums (kick, soft snare on 3, rim, brushed
// hats), vinyl crackle and tape wobble. A kalimba hook opens the film and
// returns at the electrical pulse and at the image reveal; the nucleus act
// drops the drums for an airy pad; the dynode cascade builds; the last bar
// (A13) falls back into bar 1 so the loop is seamless.
// SFX are tuned to D major pentatonic (D E F# A B). Atomic events are not
// audible in reality: these are educational sonifications.
// ============================================================================
const SR = 48000, TAIL = 3.0;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const PENT = ['D', 'E', 'F#', 'A', 'B'];
const pent = (i, o) => nm(PENT[((i % 5) + 5) % 5], o + Math.floor(i / 5));
// Rhodes voicings (rootless, around middle C) and bass roots
const CHV = {
  Dmaj9: { r: ['D', 2], v: [['F#', 3], ['A', 3], ['C#', 4], ['E', 4]] },
  Bm9: { r: ['B', 1], v: [['D', 3], ['F#', 3], ['A', 3], ['C#', 4]] },
  Em9: { r: ['E', 2], v: [['G', 3], ['B', 3], ['D', 4], ['F#', 4]] },
  A13: { r: ['A', 1], v: [['G', 3], ['C#', 4], ['F#', 4], ['B', 4]] },
  Gmaj9: { r: ['G', 1], v: [['B', 3], ['D', 4], ['F#', 4], ['A', 4]] },
  'F#m7': { r: ['F#', 1], v: [['A', 3], ['C#', 4], ['E', 4], ['B', 4]] },
};
const PROG = ['Dmaj9', 'Bm9', 'Em9', 'A13', 'Dmaj9', 'Bm9', 'Gmaj9', 'Em9', 'F#m7', 'Bm9', 'Gmaj9', 'A13', 'Dmaj9', 'Bm9', 'Em9', 'A13', 'Dmaj9', 'Gmaj9',
  'A13', 'Bm9', 'Em9', 'Dmaj9', 'Bm9', 'Em9', 'A13', 'Dmaj9', 'Bm9', 'Gmaj9', 'A13', 'F#m7', 'Bm9', 'Em9', 'A13', 'Dmaj9', 'Gmaj9', 'A13'];
const NBARS = PROG.length;   // 36
function sect(b) {
  return b <= 2 ? 'hook' : b <= 6 ? 'micro' : b === 7 ? 'dive' : b <= 9 ? 'nucleus' : b === 10 ? 'photon' : b <= 14 ? 'detector' : b <= 17 ? 'crystal' :
    b <= 19 ? 'pmt' : b <= 21 ? 'cascade' : b === 22 ? 'signal' : b <= 27 ? 'data' : b <= 29 ? 'rotate' : b <= 31 ? 'angles' : b <= 33 ? 'recon' : b <= 35 ? 'reveal' : 'recap';
}
// the kalimba hook, one phrase per chord: [16th step, note, octave, length in 16ths]
const HOOK = {
  Dmaj9: [[0, 'F#', 5, 3], [3, 'E', 5, 1], [4, 'C#', 5, 2], [6, 'A', 4, 4], [10, 'E', 5, 2], [12, 'F#', 5, 4]],
  Bm9: [[0, 'D', 5, 3], [3, 'C#', 5, 1], [4, 'B', 4, 2], [6, 'F#', 4, 4], [10, 'A', 4, 2], [12, 'B', 4, 4]],
  Em9: [[0, 'G', 5, 3], [3, 'F#', 5, 1], [4, 'D', 5, 2], [6, 'B', 4, 4], [10, 'F#', 5, 2], [12, 'E', 5, 4]],
  A13: [[0, 'E', 5, 3], [3, 'F#', 5, 1], [4, 'G', 5, 2], [6, 'A', 5, 2], [8, 'G', 5, 2], [10, 'E', 5, 2], [12, 'C#', 5, 4]],
  Gmaj9: [[0, 'B', 4, 3], [3, 'A', 4, 1], [4, 'F#', 4, 2], [6, 'D', 5, 4], [10, 'A', 4, 2], [12, 'B', 4, 4]],
  'F#m7': [[0, 'C#', 5, 3], [3, 'B', 4, 1], [4, 'A', 4, 2], [6, 'E', 5, 4], [10, 'C#', 5, 2], [12, 'A', 4, 4]],
};
// swing: off-beat 8ths late by 0.09 beat, off-beat 16ths by 0.05
function sw(beat) { const q = Math.round(beat * 4) % 4; return beat + (q === 2 ? 0.09 : q === 1 || q === 3 ? 0.05 : 0); }
function musicEvents() {
  const ev = [];
  const MIX = { rhodes: 1.3, bass: 0.72, kal: 1.45, flute: 1.05, glock: 1.0, pad: 0.7, kick: 0.72, snare: 0.95, rim: 0.9, hat: 1.25, ohat: 1.0, shaker: 0.85, crash: 0.75, tick: 1.0, riser: 0.9, vinyl: 1.2, hiss: 1.1 };
  const N = (t, d, k, m, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d, k, f: m === null ? 0 : mtof(m), v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const D = (t, k, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d: 0.5, k, v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const S16 = BEAT / 4;
  // the texture bed: tape hiss for the whole film (folded at the loop) and crackle per bar
  N(0, DUR, 'hiss', null, 0.05, 0);
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, s = sect(b), name = PROG[b - 1], C = CHV[name], nxt = CHV[PROG[b % NBARS]];
    const at = beat => t0 + sw(beat) * BEAT;
    const root = nm(C.r[0], C.r[1]), voic = C.v.map(([n, o]) => nm(n, o));
    D(t0, 'vinyl', s === 'nucleus' ? 0.6 : 1, 0, { d: BAR, seed: b });
    // ---- Rhodes comping (rolled chords, lazy re-strikes)
    const rh = (beat, len, v, sub) => { voic.forEach((m, i) => { if (sub && i % 2) return; N(at(beat) + i * 0.014, len * BEAT, 'rhodes', m, v * (i === 0 ? 1 : 0.86), (i - 1.5) * 0.22); }); };
    if (s === 'nucleus') { rh(0, 3.8, 0.11); }
    else if (s === 'dive') { rh(0, 1.9, 0.12); rh(2, 1.8, 0.09, true); }
    else if (s === 'rotate') { rh(0, 2.4, 0.12); rh(2.75, 1.1, 0.08, true); }
    else { const k = s === 'micro' ? 0.85 : s === 'reveal' || s === 'signal' ? 1.1 : 1; rh(0, 1.4, 0.13 * k); rh(1.5, 0.6, 0.07 * k, true); rh(2.75, 1.15, 0.1 * k); }
    // ---- pad (airy, under everything; brighter in the nucleus and the reveal)
    const padV = { hook: 0.04, micro: 0.045, dive: 0.05, nucleus: 0.085, photon: 0.05, detector: 0.035, crystal: 0.045, pmt: 0.04, cascade: 0.05, signal: 0.035, data: 0.03, rotate: 0.06, angles: 0.045, recon: 0.05, reveal: 0.065, recap: 0.045 }[s];
    for (const m of voic.slice(0, 3)) N(t0, BAR + 0.05, 'pad', m + 12, padV, (m % 3 - 1) * 0.5, { cut: s === 'nucleus' ? 2600 : 1400 });
    // ---- bass: round, half-time walk with an approach note into the next bar
    if (s !== 'nucleus') {
      const nr = nm(nxt.r[0], nxt.r[1]), appr = nr + (nr > root ? -1 : 1);
      const bv = s === 'micro' || s === 'rotate' || s === 'dive' ? 0.16 : 0.18;
      N(at(0), BEAT * 1.6, 'bass', root, bv); N(at(2.5), BEAT * 0.8, 'bass', root + 7, bv * 0.75);
      if (s !== 'dive') N(at(3.5), BEAT * 0.45, 'bass', appr, bv * 0.7);
    } else N(t0, BAR * 0.98, 'bass', root, 0.09, 0, { soft: true });
    // ---- drums (half-time: kick 1 + "and of 2", snare on 3)
    const kick = (beat, v) => D(at(beat), 'kick', v), snare = (beat, v) => D(at(beat), 'snare', v), rim = (beat, v) => D(at(beat), 'rim', v, 0.2);
    const hats = (v, open16) => { for (let i = 0; i < 8; i++) D(at(i / 2), i === 7 && open16 ? 'ohat' : 'hat', v * (i % 2 ? 0.62 : 1), ((i * 0.37) % 0.5) - 0.25); };
    const full = (kv, sv, hv) => { kick(0, kv); kick(1.75, kv * 0.7); snare(2, sv); rim(3.5, sv * 0.35); hats(hv); if (b % 2 === 0) kick(3.25, kv * 0.45); };
    if (s === 'hook' || s === 'detector' || s === 'signal' || s === 'reveal' || s === 'recap') full(0.5, 0.34, 0.06);
    if (s === 'micro') { kick(0, 0.4); snare(2, 0.24); hats(0.04); }
    if (s === 'dive') { kick(0, 0.42); snare(2, 0.22); for (let i = 0; i < 8; i++) D(at(2 + i / 4), 'tick', 0.03 + 0.012 * i, 0); }
    if (s === 'photon') { kick(0, 0.38); hats(0.035); D(at(2), 'snare', 0.16); }
    if (s === 'crystal') { full(0.44, 0.28, 0.05); for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.8, 'glock', pent(10 + ((i * 3 + b) % 7), 0) + 12, i % 4 === 0 ? 0.04 : 0.022, i % 2 ? 0.4 : -0.4); }
    if (s === 'pmt') { full(0.48, 0.3, 0.055); }
    if (s === 'cascade') {
      full(0.5, 0.32, 0.06);
      for (let i = 0; i < 16; i++) D(at(i / 4), 'tick', (b === 21 ? 0.05 : 0.03) + 0.002 * i, i % 2 ? 0.3 : -0.3);
      const arpN = b === 21 ? 16 : 8; for (let i = 0; i < arpN; i++) N(at(i * 4 / arpN), S16 * 0.9, 'glock', pent(8 + i + (b === 21 ? 3 : 0), 0) + 12, 0.025 + 0.002 * i, i % 2 ? 0.35 : -0.35);
      if (b === 21) { for (let i = 0; i < 6; i++) D(at(3 + i / 6), 'snare', 0.06 + 0.035 * i); N(t0, BAR, 'riser', null, 0.12); }
    }
    if (s === 'data') { full(0.46, 0.3, 0.05); for (let i = 0; i < 16; i++) D(at(i / 4), 'tick', i % 4 === 2 ? 0.05 : 0.022, ((i * 5) % 7) / 7 - 0.5); }
    if (s === 'rotate') { kick(0, 0.38); snare(2, 0.2); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.05 : 0.03, 0.3); }
    if (s === 'angles') { full(0.46, 0.3, 0.05); }
    if (s === 'recon') { full(0.46, 0.3, 0.055); for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.8, 'glock', pent(5 + (i % 8) + (b === 33 ? 2 : 0), 0) + 12, 0.022, i % 2 ? 0.35 : -0.35); if (b === 33) N(t0 + BEAT * 2, BEAT * 2, 'riser', null, 0.1); }
    if ([1, 11, 22, 34].includes(b)) D(t0, 'crash', b === 34 ? 0.3 : 0.2);
  }
  // ---- melodies: kalimba hook at the hook, the pulse and the reveal; a soft flute in between
  const mel = (bar, inst, v, opt) => {
    opt = opt || {};
    const arr = HOOK[PROG[bar - 1]];
    arr.forEach(([st, n, o, l], j) => {
      if (opt.only && !opt.only(st)) return;
      const t = (bar - 1) * BAR + sw(st / 4) * BEAT, m = nm(n, o + (opt.oct || 0));
      N(t, l * S16 * (opt.leg || 0.95), inst, m, v * (j === 0 ? 1.1 : 1), opt.p || 0);
    });
  };
  for (const b of [1, 2]) mel(b, 'kal', 0.1, { p: 0.15 });
  for (const b of [5, 6]) mel(b, 'kal', 0.06, { p: -0.2, only: st => st < 8 });
  for (const b of [12, 13, 14]) mel(b, 'flute', 0.06, { p: 0.1 });
  for (const b of [18, 19]) mel(b, 'kal', 0.075, { p: 0.15 });
  mel(22, 'kal', 0.1, { p: 0.1 }); mel(23, 'kal', 0.08, { p: -0.1 });
  for (const b of [26, 27]) mel(b, 'flute', 0.055, { p: 0.15 });
  for (const b of [34, 35, 36]) { mel(b, 'kal', 0.1, { p: 0.12 }); mel(b, 'flute', 0.04, { oct: -1, p: -0.15 }); }
  return ev;
}
// ---------------------------------------------------------------- SFX: every sound belongs to a visible event
// level trims from the stem check (SFX-only vs music-only render): lifts the effects that the groove masked
const SFX_TRIM = { fluid: 2.0, flow: 2.8, heart: 4.0, pop: 2.8, gather: 1.8, tension: 2.8, absorb: 2.8, scatter: 4.0, reveal: 2.5, mtick: 4.0, transit: 2.8,
  ionize: 3.2, beep: 1.8, scintsoft: 1.6, bars: 3.2, energy: 2.5, reject: 1.6, counts: 3.5, motor: 3.2, tone: 1.6, stream: 1.4, recap: 3.2, slicepop: 1.6, block: 1.4 };
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => { if (t >= 0 && t < DUR + TAIL) ev.push(Object.assign({ t, d: 0.5, k, v: (v === undefined ? 1 : v) * (SFX_TRIM[k] || 1), p: 0 }, x || {})); };
  // S01 machine wakes, the push, the lens, the emission
  S(0.0, 'machine', 0.55, { d: 1.2 }); S(0.4, 'zoom', 0.42, { d: 0.55 }); S(0.58, 'lensw', 0.35, { d: 0.38 }); S(T_EMIT, 'gping', 0.9); S(T_EMIT + 0.02, 'gtravel', 0.32, { d: 0.75 });
  // S02 the teaser chain: channel, crystal, PMTs, cascade, pulse, counts
  S(HK.tFace, 'channel', 0.5); S(HK.tHit, 'scint', 0.6); [0, 1, 2, 3, 4].forEach(i => S(2.9 + i * 0.04, 'lping', 0.25 + 0.4 * HOOK_L[i], { f: mtof(pent(12 + i, 4)) }));
  S(3.0, 'cascade', 0.4, { d: 0.26 }); S(3.27, 'epulse', 0.6); S(3.42, 'count', 0.45); S(3.62, 'counts', 0.3, { d: 0.36 });
  // S03 tracer: rewind to the injection, a click, the fluid
  S(4.0, 'rewind', 0.38, { d: 0.22 }); S(4.55, 'click', 0.45); S(4.6, 'fluid', 0.32, { d: 0.75 }); S(5.55, 'lensw', 0.3, { d: 0.4 });
  // S04 blood: flow and a soft pulse
  S(5.95, 'flow', 0.36, { d: 2.1 }); for (const t of [6.05, 6.97, 7.89]) S(t, 'heart', 0.3);
  // S05 uptake: crossing, magnifier, gathering
  S(MYO_IN, 'pop', 0.35); S(9.45, 'magnify', 0.38); for (let i = 0; i < 6; i++) S(9.7 + i * 0.2, 'gather', 0.22, { f: mtof(pent(15 + i, 4)) });
  // S06 the dive: zoom, lens, nuclear resonance, the metastable level lights
  S(11.1, 'dive', 0.36, { d: 0.32 }); S(11.4, 'lensw', 0.3, { d: 0.3 }); S(11.9, 'resonance', 0.5, { d: 1.6 }); S(12.5, 'level', 0.35);
  // S07 the isomeric transition: tension, ping, release
  S(T_DROP0, 'tension', 0.3, { d: T_GAMMA - T_DROP0 }); S(T_GAMMA, 'gping', 1.0); S(T_GAMMA + 0.02, 'gtravel', 0.36, { d: 1.2 }); S(14.45, 'level', 0.22);
  // S08 the photon flies on
  S(16.06, 'gtravel', 0.3, { d: 1.8 }); S(17.0, 'tissue', 0.25, { d: 0.9 });
  // S09 absorption and scatter
  S(18.75, 'absorb', 0.5); S(18.95, 'scatter', 0.45);
  // S10 the head opens; precise ticks along the channels
  S(20.25, 'reveal', 0.45); for (let i = 0; i < 9; i++) S(21.9 + i * BEAT / 2, 'mtick', 0.22 + 0.02 * (i % 2));
  // S11 two photons blocked, ours passes
  S(23.25, 'block', 0.45); S(23.42, 'block', 0.4); S(23.4, 'transit', 0.45, { d: 1.2 });
  // S12-S14 the crystal: interaction, ionisation ticks, scintillation
  S(T_PE, 'pe', 0.85); S(28.1, 'ionize', 0.38, { d: 1.6 }); S(T_SCINT, 'shimmer', 0.75);
  // S15 light reaches the tubes (louder for the nearer ones)
  [1, 2, 3, 0, 4].forEach((i, k) => S(32.45 + k * 0.07, 'lping', 0.2 + 0.45 * HOOK_L[i], { f: mtof(pent(12 + i, 4)) }));
  // S16 light -> photoelectron (only one of four photons releases an electron)
  for (const [x, ta] of LP) S(ta, x === PE_X ? 'pec' : 'pcsoft', x === PE_X ? 0.7 : 0.22);
  // S17 dynode cascade: tick, tick-tick, ... then the anode pulse
  DH_T.forEach((h, k) => S(h, 'dyn', 0.3 + 0.07 * k, { n: Math.min(8, 1 + k * 1.5) }));
  S(T_ANODE, 'anode', 0.8); S(39.667, 'beep', 0.45);
  // S19 position + energy
  S(41.25, 'scintsoft', 0.3); S(41.5, 'bars', 0.32, { d: 0.7 }); S(42.972, 'coord', 0.45); S(43.444, 'energy', 0.42);
  // S20 the energy window
  S(T_ACC, 'accept', 0.6); S(T_REJ, 'reject', 0.5);
  // S21 one count
  S(46.5, 'plus1', 0.6);
  // S22 counting (accelerating, quiet)
  S(48.05, 'counts', 0.28, { d: 2.55, accel: true });
  // S23 rotation and acquisitions
  S(51.75, 'motor', 0.35, { d: 0.7 }); S(52.5, 'acq', 0.45); S(52.85, 'motor', 0.35, { d: 0.7 }); S(53.6, 'acq', 0.45);
  // S24 views around the heart, then into the computer
  SEMI_V.forEach((v, i) => { if (RAIL_V.indexOf(v) < 0) S(54.6 + i * 0.118, 'tone', 0.22, { f: mtof(pent(10 + i, 4)) }); });
  S(56.75, 'stream', 0.35, { d: 0.9 });
  // S25 iterations: estimate / project / compare / update
  RSTEP.forEach(([ts, node], i) => S(ts, node === 3 ? 'compute' : 'step', node === 3 ? 0.35 : 0.16, { f: mtof(pent(8 + (i % 6), 5)) }));
  S(61.9, 'confirm', 0.42);
  // S26 the image: warm reveal, slices
  S(T_SLAM, 'impact', 0.85); [62.81, 62.928, 63.046, 63.164].forEach((t, i) => S(t, 'slicepop', 0.22, { f: mtof(pent(10 + i, 4)) })); S(63.75, 'slicepop', 0.3, { f: mtof(nm('A', 5)) }); S(64.222, 'slicepop', 0.3, { f: mtof(nm('D', 6)) });
  // S27 recap ticks, the image collapses into one event, back to the scanner
  for (let k = 0; k < 12; k++) S(T_REC + k * D_REC, 'recap', 0.2 + 0.01 * k, { f: mtof(pent(5 + k, 4)) });
  S(66.4, 'collapse', 0.4, { d: 0.45 }); S(66.85, 'final', 0.7);
  return ev;
}
function allEvents() {
  const ev = musicEvents().map(e => Object.assign(e, { bus: 'm' })).concat(sfxEvents().map(e => Object.assign(e, { bus: 's' })));
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
// ---------------------------------------------------------------- synthesis core
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MUSIC_GAIN = 0.62;
function makeAudioGraph(ctx) {
  const G = { ctx };
  const rnd = mulberry(1357);
  const nb = ctx.createBuffer(1, SR * 2, SR); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  G.noise = nb;
  // vinyl crackle buffer: sparse clicks of random size
  const cb = ctx.createBuffer(1, SR * 2, SR); const cd = cb.getChannelData(0);
  for (let i = 0; i < 70; i++) { const p = Math.floor(rnd() * (cd.length - 200)), a = (rnd() * 0.8 + 0.2) * (rnd() < 0.15 ? 1 : 0.35); for (let k = 0; k < 40; k++) cd[p + k] += a * (rnd() * 2 - 1) * Math.exp(-k / 6); }
  G.crackle = cb;
  const ir = ctx.createBuffer(2, Math.floor(SR * 2.6), SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (rnd() * 2 - 1) * Math.pow(1 - t / 2.6, 2) * Math.exp(-t * 1.6) * (t < 0.012 ? t / 0.012 : 1); } }
  G.rev = ctx.createConvolver(); G.rev.buffer = ir;
  G.revIn = ctx.createGain(); G.revIn.connect(G.rev);
  G.mix = ctx.createGain();
  G.revOut = ctx.createGain(); G.revOut.gain.value = 0.3; G.rev.connect(G.revOut); G.revOut.connect(G.mix);
  G.dIn = ctx.createGain();   // dotted-8th ping-pong delay for the kalimba and some SFX
  const dl = ctx.createDelay(1.0), dr = ctx.createDelay(1.0); dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.3; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
  const pl = ctx.createStereoPanner(); pl.pan.value = -0.55; const prr = ctx.createStereoPanner(); prr.pan.value = 0.55;
  G.dIn.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl); dl.connect(pl); dr.connect(prr);
  G.dOut = ctx.createGain(); G.dOut.gain.value = 0.42; pl.connect(G.dOut); prr.connect(G.dOut); G.dOut.connect(G.mix);
  // lo-fi music bus: tape wobble (modulated delay) -> soft saturation -> gentle low-pass
  G.music = ctx.createGain(); G.music.gain.value = MUSIC_GAIN;
  G.pump = ctx.createGain(); G.pump.gain.value = 1; G.pump.connect(G.music);
  const wow = ctx.createDelay(0.05); wow.delayTime.value = 0.012;
  const wl = ctx.createOscillator(); wl.frequency.value = 0.55; const wg = ctx.createGain(); wg.gain.value = 0.0011; wl.connect(wg); wg.connect(wow.delayTime); wl.start(0);
  const fl = ctx.createOscillator(); fl.frequency.value = 5.8; const fg = ctx.createGain(); fg.gain.value = 0.00012; fl.connect(fg); fg.connect(wow.delayTime); fl.start(0);
  const sat = ctx.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); } sat.curve = curve;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 12500; tone.Q.value = 0.5;
  G.duck = ctx.createGain(); G.duck.gain.value = 1;   // short dips under the low SFX (summed offsets, see duck())
  G.music.connect(G.duck); G.duck.connect(wow); wow.connect(sat); sat.connect(tone); tone.connect(G.mix);
  G.sfx = ctx.createGain(); G.sfx.gain.value = 1.1; G.sfx.connect(G.mix);
  G.comp = ctx.createDynamicsCompressor(); G.comp.threshold.value = -14; G.comp.knee.value = 8; G.comp.ratio.value = 2.5; G.comp.attack.value = 0.006; G.comp.release.value = 0.2;
  G.master = ctx.createGain(); G.master.gain.value = 0.9;
  G.mix.connect(G.comp); G.comp.connect(G.master); G.master.connect(ctx.destination);
  G.pw = {};
  for (const duty of [0.125, 0.25, 0.5]) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI); im[k] = 2 * Math.pow(Math.sin(Math.PI * k * duty), 2) / (k * Math.PI); }
    G.pw[duty] = ctx.createPeriodicWave(re, im);
  }
  return G;
}
const PUMPED = { pad: 1, bass: 1, rhodes: 1 };
function voice(G, ev, when, send, delay) {
  const ctx = G.ctx, vg = ctx.createGain(); vg.gain.value = 0;
  const pan = ctx.createStereoPanner(); pan.pan.value = clamp(ev.p || 0, -1, 1);
  vg.connect(pan); pan.connect(ev.bus === 'm' ? (PUMPED[ev.k] ? G.pump : G.music) : G.sfx);
  if (send) { const s = ctx.createGain(); s.gain.value = send; pan.connect(s); s.connect(G.revIn); }
  if (delay) { const s = ctx.createGain(); s.gain.value = delay; pan.connect(s); s.connect(G.dIn); }
  return { vg, srcs: [], end: when + (ev.d || 0.5) + 0.8 };
}
function osc(G, V, type, f, t0, t1) {
  const o = G.ctx.createOscillator();
  if (typeof type === 'number') o.setPeriodicWave(G.pw[type]); else o.type = type;
  o.frequency.setValueAtTime(f, t0); o.start(t0); o.stop(t1); V.srcs.push(o); return o;
}
function noiseSrc(G, V, t0, t1, rate, buf2) {
  const s = G.ctx.createBufferSource(); s.buffer = buf2 || G.noise; s.loop = true; s.playbackRate.value = rate || 1;
  s.start(t0, hash(Math.floor(t0 * 1000)) * 1.5); s.stop(t1); V.srcs.push(s); return s;
}
function filt(G, type, f, q) { const b = G.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; return b; }
function adsr(g, t, a, d, s, r, dur, peak) {
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3 + 1e-4);
  g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 3 + 1e-4);
}
function perc(g, t, a, dec, peak) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, dec / 3 + 1e-4); }
function playEvent(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  let V;
  switch (k) {
    case 'rhodes': { // FM electric piano: tine attack, warm body, gentle tremolo
      V = voice(G, ev, when, 0.3); const lp = filt(G, 'lowpass', 4600, 0.6); lp.connect(V.vg);
      const c = osc(G, V, 'sine', f, when, when + d + 1.2), m = osc(G, V, 'sine', f, when, when + d + 1.2);
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, when); mg.gain.setTargetAtTime(f * 0.25, when, 0.08); m.connect(mg); mg.connect(c.frequency);
      const t2 = osc(G, V, 'sine', f * 4.02, when, when + 0.4); const t2g = ctx.createGain(); t2g.gain.setValueAtTime(0.2, when); t2g.gain.setTargetAtTime(0, when, 0.03); t2.connect(t2g); t2g.connect(lp);
      const trem = ctx.createGain(); trem.gain.value = 0.9; c.connect(trem); trem.connect(lp);
      const lfo = osc(G, V, 'sine', 4.6, when, when + d + 1.2); const lg = ctx.createGain(); lg.gain.value = 0.1; lfo.connect(lg); lg.connect(trem.gain);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v, when + 0.004); V.vg.gain.setTargetAtTime(v * 0.45, when + 0.004, 0.35); V.vg.gain.setTargetAtTime(0, when + d, 0.12);
      V.end = when + d + 1.0; break;
    }
    case 'pad': {
      V = voice(G, ev, when, 0.6); const lp = filt(G, 'lowpass', ev.cut || 1400, 0.7); lp.connect(V.vg);
      for (const det of [-9, 9]) { const o = osc(G, V, 'triangle', f, when, when + d + 1.2); o.detune.value = det; o.connect(lp); }
      const o3 = osc(G, V, 'sawtooth', f, when, when + d + 1.2); const og = ctx.createGain(); og.gain.value = 0.25; o3.connect(og); og.connect(lp);
      adsr(V.vg, when, 0.5, 0.6, 0.9, 0.6, d, v); V.end = when + d + 1.5; break;
    }
    case 'bass': { // round lo-fi bass: sine + soft triangle, low-passed, a little thump
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', ev.soft ? 300 : 520, 0.8); lp.connect(V.vg);
      osc(G, V, 'sine', f, when, when + d + 0.3).connect(lp);
      const tri = osc(G, V, 'triangle', f, when, when + d + 0.3); const tg = ctx.createGain(); tg.gain.value = 0.45; tri.connect(tg); tg.connect(lp);
      if (ev.soft) adsr(V.vg, when, 0.3, 0.4, 0.8, 0.5, d, v); else adsr(V.vg, when, 0.006, 0.25, 0.75, 0.08, d, v);
      break;
    }
    case 'kal': { // kalimba: bright pluck with a metallic overtone and a soft click
      V = voice(G, ev, when, 0.35, 0.4);
      const c = osc(G, V, 'sine', f, when, when + 1.6); c.connect(V.vg);
      const o2 = osc(G, V, 'sine', f * 5.95, when, when + 0.3); const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.25, when); g2.gain.setTargetAtTime(0, when, 0.025); o2.connect(g2); g2.connect(V.vg);
      const n = noiseSrc(G, V, when, when + 0.02, 1); const hp = filt(G, 'highpass', 3000); const ng = ctx.createGain(); ng.gain.value = 0.15; n.connect(hp); hp.connect(ng); ng.connect(V.vg);
      perc(V.vg, when, 0.002, Math.max(0.6, d * 2.2), v); V.end = when + 2.0; break;
    }
    case 'flute': { // breathy soft lead with delayed vibrato
      V = voice(G, ev, when, 0.45, 0.25); const lp = filt(G, 'lowpass', 2600, 0.7); lp.connect(V.vg);
      const o = osc(G, V, 'triangle', f, when, when + d + 0.4); o.connect(lp);
      const vib = osc(G, V, 'sine', 5.2, when, when + d + 0.4); const vg2 = ctx.createGain(); vg2.gain.setValueAtTime(0, when); vg2.gain.linearRampToValueAtTime(f * 0.006, when + 0.25); vib.connect(vg2); vg2.connect(o.frequency);
      const n = noiseSrc(G, V, when, when + d + 0.3, 1); const bp = filt(G, 'bandpass', f * 2, 2); const ng = ctx.createGain(); ng.gain.value = 0.12; n.connect(bp); bp.connect(ng); ng.connect(lp);
      adsr(V.vg, when, 0.05, 0.2, 0.75, 0.15, d, v); break;
    }
    case 'glock': {
      V = voice(G, ev, when, 0.4, 0.25); const c = osc(G, V, 'sine', f, when, when + 1.2); const m = osc(G, V, 'sine', f * 3.5, when, when + 1.2);
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.6, when); mg.gain.setTargetAtTime(f * 0.1, when, 0.12); m.connect(mg); mg.connect(c.frequency);
      c.connect(V.vg); perc(V.vg, when, 0.003, 0.45, v); V.end = when + 1.3; break;
    }
    case 'kick': {
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', 900, 0.7); lp.connect(V.vg);
      const o = osc(G, V, 'sine', 120, when, when + 0.5); o.frequency.exponentialRampToValueAtTime(46, when + 0.12); o.connect(lp);
      const n = noiseSrc(G, V, when, when + 0.012, 1); const bp = filt(G, 'bandpass', 1800, 1); const ng = ctx.createGain(); ng.gain.value = 0.12; n.connect(bp); bp.connect(ng); ng.connect(V.vg);
      perc(V.vg, when, 0.002, 0.34, v);
      G.pump.gain.setValueAtTime(0.7, when); G.pump.gain.setTargetAtTime(1.0, when + 0.02, 0.09);
      break;
    }
    case 'snare': {
      V = voice(G, ev, when, 0.5); const n = noiseSrc(G, V, when, when + 0.35, 0.9); const bp = filt(G, 'bandpass', 1700, 0.7); const lp = filt(G, 'lowpass', 5200, 0.7); n.connect(bp); bp.connect(lp); lp.connect(V.vg);
      const o = osc(G, V, 'triangle', 185, when, when + 0.12); o.frequency.exponentialRampToValueAtTime(150, when + 0.08); const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(V.vg);
      perc(V.vg, when, 0.003, 0.17, v); break;
    }
    case 'rim': { V = voice(G, ev, when, 0.25); const o = osc(G, V, 'triangle', 1650, when, when + 0.05); o.connect(V.vg); const n = noiseSrc(G, V, when, when + 0.02, 1); const hp = filt(G, 'highpass', 2500); n.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.001, 0.035, v); break; }
    case 'hat': case 'ohat': case 'tick': case 'shaker': {
      V = voice(G, ev, when, 0.1); const n = noiseSrc(G, V, when, when + 0.3, 1); const hp = filt(G, k === 'shaker' ? 'bandpass' : 'highpass', k === 'shaker' ? 6000 : k === 'tick' ? 8800 : 7200, 0.8); const lp = filt(G, 'lowpass', 11000, 0.7); n.connect(hp); hp.connect(lp); lp.connect(V.vg);
      perc(V.vg, when, k === 'shaker' ? 0.015 : 0.001, k === 'ohat' ? 0.16 : k === 'tick' ? 0.014 : k === 'shaker' ? 0.05 : 0.035, v); break;
    }
    case 'crash': { V = voice(G, ev, when, 0.5); const n = noiseSrc(G, V, when, when + 2.4, 0.8); const hp = filt(G, 'highpass', 4200); const lp = filt(G, 'lowpass', 9000); n.connect(hp); hp.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.01, 0.4, 0.4, 1.2, 0.3, v); V.end = when + 2.6; break; }
    case 'riser': { V = voice(G, ev, when, 0.4); const n = noiseSrc(G, V, when, when + d + 0.2, 1); const bp = filt(G, 'bandpass', 400, 1.6); bp.frequency.setValueAtTime(400, when); bp.frequency.exponentialRampToValueAtTime(5200, when + d); n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.9, 0.05, 1, 0.08, d, v * 0.35); break; }
    case 'vinyl': { V = voice(G, ev, when, 0); const n = noiseSrc(G, V, when, when + d + 0.05, 1, G.crackle); n.playbackRate.value = 0.8 + hash(ev.seed || 1) * 0.4; const hp = filt(G, 'highpass', 900); const lp = filt(G, 'lowpass', 7000); n.connect(hp); hp.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.05, 0.1, 1, 0.05, d, v * 0.16); V.end = when + d + 0.2; break; }
    case 'hiss': { V = voice(G, ev, when, 0); const n = noiseSrc(G, V, when, when + d + 0.1, 1); const bp = filt(G, 'bandpass', 5200, 0.6); n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, 0.3, 0.1, 1, 0.3, d, v * 0.1); V.end = when + d + 0.5; break; }
    default: V = sfx(G, ev, when);
  }
  return V;
}
function sweepNoise(G, V, when, d, f0, f1, q, peak, att) {
  const n = noiseSrc(G, V, when, when + d + 0.3, 1); const bp = filt(G, 'bandpass', f0, q || 1.2);
  bp.frequency.setValueAtTime(f0, when); bp.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + d);
  n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, (att || 0.5) * d, d * 0.3, 0.9, 0.12, d * 0.85, peak);
}
// the music dips a few dB under these low effects so they read on small speakers: [depth (gain offset), hold s]
const DUCK = { heart: [0.3, 0.32], pop: [0.25, 0.15], resonance: [0.3, 1.3], tension: [0.2, 0.45], absorb: [0.35, 0.3], scatter: [0.3, 0.2], motor: [0.3, 0.65], impact: [0.3, 0.5] };
function duck(G, V, when, depth, hold) {
  const c = G.ctx.createConstantSource(), t0 = Math.max(0, when - 0.04);
  c.offset.setValueAtTime(0, t0); c.offset.linearRampToValueAtTime(-depth, when + 0.01);
  c.offset.setValueAtTime(-depth, when + hold); c.offset.linearRampToValueAtTime(0, when + hold + 0.25);
  c.connect(G.duck.gain); c.start(t0); c.stop(when + hold + 0.3); V.srcs.push(c);
}
// SFX design (tuned to D major pentatonic; microscopic events are sonifications)
function sfx(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  const wet = { gping: 1, pe: 1, scint: 1, shimmer: 1, accept: 1, plus1: 1, impact: 1, final: 1, beep: 1, kal: 1, level: 1, tone: 1, compute: 1, confirm: 1, lping: 1, pec: 1, anode: 1 };
  const V = voice(G, ev, when, 0.35, wet[k] ? 0.3 : 0);
  if (DUCK[k]) duck(G, V, when, DUCK[k][0], k === 'motor' ? d : DUCK[k][1]);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  const blip = (type, fr, t, dec, peak, dest) => { const g = ctx.createGain(); g.gain.value = 0; tone(type, fr, t, t + dec * 4 + 0.05, g); g.connect(dest || V.vg); perc(g, t, 0.002, dec, peak); return g; };
  const nz = (t, dur, type, fr, q, peak, att, dec, rate) => { const s = noiseSrc(G, V, t, t + dur, rate || 1), b = filt(G, type, fr, q), g = ctx.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(V.vg); perc(g, t, att || 0.001, dec, peak); return b; };
  const boom = (f0, f1, t, dec, peak) => { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', f0, t, t + dec * 4 + 0.1, g); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6); g.connect(V.vg); perc(g, t, 0.003, dec, peak); };
  const level = (x, end) => { V.vg.gain.setValueAtTime(x, when); V.end = when + (end || 1); };
  const P5 = i => mtof(pent(i, 5)), P6 = i => mtof(pent(i, 6));
  switch (k) {
    case 'machine': { // deep power-up: low hum swells, a relay click, a soft servo whirr
      const lp = filt(G, 'lowpass', 400, 1); lp.connect(V.vg);
      for (const [fr, g] of [[mtof(nm('D', 1)), 1], [mtof(nm('A', 1)), 0.5], [mtof(nm('D', 2)), 0.4]]) { const gg = ctx.createGain(); gg.gain.value = g; tone('sawtooth', fr, when, when + d + 0.4, gg); gg.connect(lp); }
      adsr(V.vg, when, 0.25, 0.3, 0.6, 0.4, d, v * 0.16);
      nz(when + 0.02, 0.02, 'highpass', 3000, 0.7, v * 0.5, 0.0005, 0.01); break;
    }
    case 'zoom': sweepNoise(G, V, when, d, 260, 6200, 1.3, v * 0.32, 0.8); { const o = tone('sine', 220, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(1500, when + d); } level(v * 0.5, d + 0.4); break;
    case 'lensw': sweepNoise(G, V, when, d, 700, 5600, 1.1, v * 0.28, 0.7); blip('sine', P6(0), when + d, 0.25, v * 0.12); break;
    case 'gping': { // gamma emission: a sharp, pure particle ping (A6) with a glassy FM shimmer
      const f0 = mtof(nm('A', 6));
      const c = tone('sine', f0, when, when + 1.4), m = tone('sine', f0 * 2.76, when, when + 1.4); m.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime(f0 * 0.9, when); mg.gain.setTargetAtTime(0, when, 0.15); m.connect(mg); mg.connect(c.frequency);
      blip('sine', f0 * 2, when, 0.12, 0.35); nz(when, 0.03, 'highpass', 7000, 0.7, 0.6, 0.0005, 0.015);
      perc(V.vg, when, 0.002, 0.7, v * 0.32); V.end = when + 1.6; break;
    }
    case 'gtravel': { const o = tone('sine', 3600, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(5200, when + d); const trm = tone('sine', 22, when, when + d + 0.1); trm.disconnect(); const tg = ctx.createGain(); tg.gain.value = 0.3; trm.connect(tg); tg.connect(V.vg.gain); adsr(V.vg, when, 0.05, 0.2, 0.7, 0.2, d, v * 0.04); break; }
    case 'channel': { nz(when, 0.02, 'bandpass', 4200, 4, 0.8, 0.0005, 0.01); for (const [r, a] of [[2400, 0.4], [3730, 0.25], [5110, 0.15]]) blip('sine', r, when, 0.08, a); level(v * 0.5, 0.5); break; }
    case 'scint': case 'shimmer': case 'scintsoft': { // crystalline shimmer: a cloud of high bell partials
      const n = k === 'shimmer' ? 9 : k === 'scint' ? 6 : 4;
      for (let i = 0; i < n; i++) blip('sine', P6(i * 2 % 7) * (i % 3 === 2 ? 2 : 1), when + i * 0.028, 0.35 - i * 0.02, 0.5 / (1 + i * 0.25));
      nz(when, 0.9, 'highpass', 8000, 0.7, 0.35, 0.01, 0.35);
      level(v * (k === 'shimmer' ? 0.2 : 0.16), 1.6); break;
    }
    case 'lping': blip('sine', f, when, 0.18, 1); blip('triangle', f * 2, when, 0.04, 0.3); level(v * 0.12, 0.8); break;
    case 'cascade': case 'dyn': { // rapid accelerating ticks
      const n = ev.n ? Math.round(ev.n) : 9;
      for (let i = 0; i < n; i++) { const tt = when + (k === 'dyn' ? i * 0.028 : d * Math.pow(i / n, 0.6)); blip('square', P6(i % 5) * (k === 'dyn' ? 1 : 0.5), tt, 0.012, 0.6); }
      if (k === 'dyn') { boom(260, 120, when, 0.05, 0.4); blip('sine', mtof(pent(9 + Math.min(4, n >> 1), 5)), when, 0.09, 0.45); }
      level(v * (k === 'dyn' ? 0.32 : 0.2), 0.8); break;
    }
    case 'epulse': case 'anode': { // electrical pulse: thump + zap + bright blip
      boom(160, 55, when, 0.12, 1); const o = tone('sawtooth', 900, when, when + 0.14); o.frequency.exponentialRampToValueAtTime(180, when + 0.12); o.disconnect(); const lp = filt(G, 'lowpass', 3000); const og = ctx.createGain(); og.gain.value = 0.18; o.connect(lp); lp.connect(og); og.connect(V.vg);
      blip('square', mtof(nm('D', 6)), when + 0.01, 0.05, 0.6); blip('sine', mtof(nm('A', 6)), when + 0.06, 0.15, 0.45); nz(when, 0.03, 'bandpass', 2500, 1.2, 0.5, 0.0005, 0.02);
      level(v * (k === 'anode' ? 0.62 : 0.6), 0.9); break;
    }
    case 'count': blip('square', P6(1), when, 0.02, 1); nz(when, 0.008, 'highpass', 6000, 0.7, 0.4, 0.0003, 0.004); level(v * 0.3, 0.3); break;
    case 'counts': { // detection clicks (accelerating for the time-lapse)
      const n = ev.accel ? 60 : 14;
      for (let i = 0; i < n; i++) { const u = i / n, tt = when + d * (ev.accel ? Math.sqrt(u) : u); blip('square', P6((i * 3) % 5), tt, 0.008, 0.25 + 0.4 * hash(i + 900)); }
      level(v * 0.16, d + 0.3); break;
    }
    case 'rewind': { const o = tone('sawtooth', 1800, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(220, when + d); o.disconnect(); const bp = filt(G, 'bandpass', 1400, 1.5); o.connect(bp); bp.connect(V.vg); sweepNoise(G, V, when, d, 4000, 600, 1.2, v * 0.2, 0.2); adsr(V.vg, when, 0.01, 0.05, 0.8, 0.04, d, v * 0.12); break; }
    case 'click': { nz(when, 0.015, 'bandpass', 2400, 3, 1, 0.0005, 0.008); nz(when + 0.035, 0.015, 'bandpass', 1900, 3, 0.7, 0.0005, 0.008); blip('triangle', 1300, when, 0.03, 0.3); level(v * 0.7, 0.4); break; }
    case 'fluid': case 'flow': case 'tissue': {
      const n = noiseSrc(G, V, when, when + d + 0.3, 0.7), lp = filt(G, 'lowpass', k === 'tissue' ? 600 : 900, 1.5); n.connect(lp); lp.connect(V.vg);
      const lfo = tone('sine', k === 'flow' ? 1.1 : 0.8, when, when + d + 0.3); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency);
      adsr(V.vg, when, d * 0.25, 0.4, 0.8, d * 0.3, d, v * 0.14); V.end = when + d + 1; break;
    }
    case 'heart': // lub-dub: a sub thump plus a soft 150-300 Hz body so it still reads on phone speakers
      boom(70, 45, when, 0.14, 0.8); boom(64, 42, when + 0.17, 0.12, 0.5); boom(150, 95, when, 0.07, 0.7); boom(140, 90, when + 0.17, 0.06, 0.45);
      nz(when, 0.08, 'lowpass', 320, 1, 0.8, 0.004, 0.05); nz(when + 0.17, 0.07, 'lowpass', 300, 1, 0.5, 0.004, 0.045); level(v * 0.3, 0.6); break;
    case 'pop': { const o = tone('sine', 320, when, when + 0.14); o.frequency.exponentialRampToValueAtTime(900, when + 0.06); perc(V.vg, when, 0.002, 0.08, v * 0.25); break; }
    case 'magnify': sweepNoise(G, V, when, 0.35, 900, 5200, 1.2, v * 0.22, 0.6); blip('sine', P6(2), when + 0.3, 0.3, v * 0.12); blip('sine', P6(4), when + 0.36, 0.3, v * 0.1); break;
    case 'gather': blip('sine', f, when, 0.06, 1); level(v * 0.1, 0.3); break;
    case 'dive': sweepNoise(G, V, when, d, 240, 5600, 1.4, v * 0.34, 0.75); { const o = tone('sine', 200, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1200, when + d); } level(v * 0.4, d + 0.4); break;
    case 'resonance': { // low nuclear resonance: two close sines beating, a soft swell
      const lp = filt(G, 'lowpass', 500, 1); lp.connect(V.vg);
      for (const fr of [mtof(nm('D', 2)), mtof(nm('D', 2)) * 1.007, mtof(nm('A', 2))]) tone('sine', fr, when, when + d + 0.5, lp);
      for (const [fr, a] of [[mtof(nm('D', 3)), 0.6], [mtof(nm('D', 4)) * 1.004, 0.35]]) { const g = ctx.createGain(); g.gain.value = a; tone('sine', fr, when, when + d + 0.5, g); g.connect(lp); }
      adsr(V.vg, when, d * 0.35, 0.3, 0.8, 0.4, d, v * 0.18); break;
    }
    case 'level': blip('sine', mtof(nm('D', 6)), when, 0.25, 0.6); blip('sine', mtof(nm('A', 6)), when + 0.05, 0.25, 0.4); level(v * 0.14, 1.0); break;
    case 'tension': { const o = tone('sine', mtof(nm('A', 4)), when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(mtof(nm('A', 5)), when + d); adsr(V.vg, when, d * 0.5, 0.1, 1, 0.05, d, v * 0.08); break; }
    case 'absorb': boom(120, 60, when, 0.1, 1); nz(when, 0.12, 'lowpass', 700, 0.7, 0.85, 0.002, 0.06); nz(when, 0.02, 'bandpass', 1800, 2, 0.4, 0.001, 0.01); level(v * 0.4, 0.5); break;
    case 'scatter': blip('square', P6(3), when, 0.02, 0.7); blip('square', P6(1), when + 0.05, 0.03, 0.5); level(v * 0.18, 0.4); break;
    case 'reveal': { // metallic mechanism reveal: a slide and a soft clank
      sweepNoise(G, V, when, 0.4, 500, 2200, 2.5, v * 0.15, 0.6);
      for (const [r, a] of [[220, 0.5], [534, 0.35], [1127, 0.25], [1790, 0.12]]) blip('sine', r, when + 0.38, 0.35, a);
      nz(when + 0.38, 0.03, 'bandpass', 2600, 3, 0.6, 0.0005, 0.015); level(v * 0.4, 1.2); break;
    }
    case 'mtick': nz(when, 0.012, 'bandpass', 5200, 5, 1, 0.0003, 0.006); blip('sine', 3100, when, 0.02, 0.3); level(v * 0.2, 0.2); break;
    case 'block': boom(180, 90, when, 0.05, 0.6); nz(when, 0.02, 'bandpass', 2200, 1.5, 0.8, 0.0005, 0.012); blip('triangle', 880, when, 0.03, 0.3); level(v * 0.6, 0.3); break;
    case 'transit': { sweepNoise(G, V, when, Math.min(1.2, d), 1200, 4200, 2.2, v * 0.12, 0.3); blip('sine', P6(4), when, 0.2, v * 0.12); break; }
    case 'pe': { // the photoelectric interaction: one precise click and a golden ping
      nz(when, 0.01, 'highpass', 4000, 0.7, 1, 0.0003, 0.005); boom(300, 120, when, 0.04, 0.5);
      blip('sine', mtof(nm('D', 7)), when + 0.005, 0.35, 0.5); blip('sine', mtof(nm('A', 6)), when + 0.005, 0.3, 0.35);
      level(v * 0.34, 1.2); break;
    }
    case 'ionize': { // fast descending sequence of tiny ticks (the electron slows)
      const n = 18; for (let i = 0; i < n; i++) { const u = i / n, tt = when + d * Math.pow(u, 1.5); blip('square', P6(14 - i % 15) * 0.5, tt, 0.008, 0.6 - u * 0.35); }
      level(v * 0.15, d + 0.3); break;
    }
    case 'pec': blip('sine', 2100, when, 0.06, 1); nz(when, 0.008, 'highpass', 5000, 0.7, 0.5, 0.0003, 0.004); blip('sine', P5(4), when + 0.02, 0.2, 0.4); level(v * 0.24, 0.6); break;
    case 'pcsoft': blip('sine', 1500, when, 0.03, 1); level(v * 0.12, 0.2); break;
    case 'beep': blip(0.25, mtof(nm('A', 5)), when, 0.07, 1); blip(0.25, mtof(nm('D', 6)), when + 0.09, 0.1, 1); level(v * 0.32, 0.6); break;
    case 'bars': { for (let i = 0; i < 7; i++) blip('triangle', P5(i), when + i * (d / 7), 0.05, 0.6); level(v * 0.14, d + 0.4); break; }
    case 'coord': { [0, 1, 2].forEach(i => blip('square', P6(i * 2), when + i * 0.07, 0.02, 0.7)); level(v * 0.36, 0.5); break; }
    case 'energy': { const o = tone('sine', P5(0), when, when + 0.35); o.frequency.exponentialRampToValueAtTime(P6(0), when + 0.3); perc(V.vg, when, 0.01, 0.25, v * 0.14); break; }
    case 'accept': { blip(0.25, mtof(nm('D', 6)), when, 0.07, 1); blip(0.25, mtof(nm('A', 6)), when + 0.05, 0.1, 1); level(v * 0.4, 0.6); break; }
    case 'reject': { const o = tone('square', mtof(nm('A', 3)), when, when + 0.18); o.frequency.exponentialRampToValueAtTime(mtof(nm('E', 3)), when + 0.12); nz(when, 0.05, 'bandpass', 1200, 1, 0.4, 0.001, 0.03); perc(V.vg, when, 0.002, 0.12, v * 0.36); break; }
    case 'plus1': boom(220, 120, when, 0.04, 0.4); blip('square', mtof(nm('F#', 6)), when, 0.04, 0.9); blip('sine', mtof(nm('D', 7)), when + 0.04, 0.2, 0.5); level(v * 0.4, 0.6); break;
    case 'motor': { const lp = filt(G, 'lowpass', 1400, 2); lp.connect(V.vg); const o = tone('sawtooth', 82, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(110, when + d * 0.5); o.frequency.linearRampToValueAtTime(90, when + d); adsr(V.vg, when, 0.08, 0.1, 0.8, 0.08, d, v * 0.1); break; }
    case 'acq': nz(when, 0.01, 'highpass', 3500, 0.7, 1, 0.0003, 0.005); nz(when + 0.05, 0.01, 'highpass', 3500, 0.7, 0.7, 0.0003, 0.005); blip('sine', P6(3), when + 0.06, 0.15, 0.5); level(v * 0.4, 0.5); break;
    case 'tone': blip('sine', f, when, 0.18, 1); blip('triangle', f * 2, when, 0.03, 0.2); level(v * 0.14, 0.7); break;
    case 'stream': { sweepNoise(G, V, when, d, 3000, 600, 1.5, v * 0.12, 0.3); for (let i = 0; i < 12; i++) blip('square', P6((i * 2) % 5), when + i * d / 12, 0.01, 0.3); break; }
    case 'step': blip('triangle', f, when, 0.03, 1); level(v * 0.14, 0.3); break;
    case 'compute': { for (let i = 0; i < 6; i++) blip('triangle', mtof(pent(8 + i, 5)), when + i * 0.03, 0.03, 0.8); blip('sine', mtof(pent(14, 5)), when + 0.18, 0.15, 0.5); level(v * 0.15, 0.6); break; }
    case 'confirm': { [nm('D', 5), nm('F#', 5), nm('A', 5), nm('E', 6)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.05, 0.4, 0.7)); level(v * 0.16, 1.2); break; }
    case 'impact': { // the medical image lands: soft sub drop, air, a warm Dmaj9 bloom
      boom(90, 45, when, 0.3, 1); nz(when, 0.6, 'highpass', 5000, 0.7, 0.3, 0.02, 0.25);
      [nm('D', 4), nm('A', 4), nm('C#', 5), nm('E', 5), nm('F#', 5)].forEach((m, i) => { const g = ctx.createGain(); g.gain.value = 0; tone('triangle', mtof(m), when + i * 0.012, when + 1.8, g); g.connect(V.vg); adsr(g, when + i * 0.012, 0.02, 0.6, 0.5, 0.5, 1.0, 0.28); });
      level(v * 0.32, 2.0); break;
    }
    case 'slicepop': { const o = tone('sine', f * 0.5, when, when + 0.16); o.frequency.exponentialRampToValueAtTime(f, when + 0.05); perc(V.vg, when, 0.002, 0.1, v * 0.22); break; }
    case 'recap': blip('triangle', f, when, 0.05, 1); level(v * 0.14, 0.3); break;
    case 'collapse': { const o = tone('sine', 1600, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(300, when + d); sweepNoise(G, V, when, d, 4000, 500, 1.4, v * 0.15, 0.2); adsr(V.vg, when, 0.02, 0.1, 0.8, 0.05, d, v * 0.1); break; }
    case 'final': { // one last detection event: a bright ping into the loop
      boom(140, 60, when, 0.14, 0.7); blip('sine', mtof(nm('D', 6)), when, 0.4, 0.6); blip('sine', mtof(nm('A', 6)), when + 0.04, 0.35, 0.45); blip('sine', mtof(nm('F#', 6)), when + 0.08, 0.35, 0.3);
      nz(when, 0.4, 'highpass', 7000, 0.7, 0.25, 0.01, 0.2); level(v * 0.3, 1.6); break;
    }
    default: level(0, 0.1);
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export): the tail past 68 s is folded onto 0:00 (seamless loop)
async function renderAudioOffline() {
  const len = Math.round(SR * DUR), lenT = Math.round(SR * (DUR + TAIL));
  const ctx = new OfflineAudioContext(2, lenT, SR);
  const G = makeAudioGraph(ctx);
  for (const ev of allEvents()) playEvent(G, ev, ev.t);
  const r = await ctx.startRendering();
  const out = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) { const a = r.getChannelData(c), o = out.getChannelData(c); o.set(a.subarray(0, len)); for (let i = 0; i < lenT - len; i++) o[i] += a[len + i]; }
  return out;
}
// ---------------------------------------------------------------- live scheduler (preview)
const LIVE = { ctx: null, G: null, ev: null, playing: false, t0ctx: 0, pos0: 0, idx: 0, voices: [], timer: null, muted: false };
function liveInit() {
  if (LIVE.ctx) return LIVE.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  LIVE.ctx = new AC({ sampleRate: SR, latencyHint: 'interactive' });
  LIVE.G = makeAudioGraph(LIVE.ctx);
  LIVE.ev = allEvents();
  return LIVE.ctx;
}
function liveNow() { return LIVE.playing ? LIVE.pos0 + (LIVE.ctx.currentTime - LIVE.t0ctx) : LIVE.pos0; }
function liveStopVoices() {
  const now = LIVE.ctx.currentTime;
  for (const V of LIVE.voices) {
    try { V.vg.gain.cancelScheduledValues(now); V.vg.gain.setValueAtTime(V.vg.gain.value, now); V.vg.gain.linearRampToValueAtTime(0, now + 0.02); } catch (e) { }
    for (const s of V.srcs) { try { s.stop(now + 0.03); } catch (e) { } }
  }
  LIVE.voices = [];
  for (const [p, v] of [[LIVE.G.music.gain, MUSIC_GAIN], [LIVE.G.pump.gain, 1]]) { try { p.cancelScheduledValues(now); p.setValueAtTime(v, now); } catch (e) { } }
}
function liveTick() {
  if (!LIVE.playing) return;
  const ctx = LIVE.ctx, ahead = 0.18, now = ctx.currentTime, pos = liveNow();
  while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos + ahead) {
    const ev = LIVE.ev[LIVE.idx++];
    if (ev.t >= DUR) continue;
    const when = LIVE.t0ctx + (ev.t - LIVE.pos0);
    if (when < now - 0.02) continue;
    LIVE.voices.push(playEvent(LIVE.G, ev, Math.max(when, now + 0.005)));
  }
  LIVE.voices = LIVE.voices.filter(V => V.end > now);
}
const SUSTAINED = { pad: 1, hiss: 1, vinyl: 1, flow: 1, fluid: 1, resonance: 1, riser: 1, tension: 1, gtravel: 1 };
function livePlay(pos) {
  const ctx = liveInit();
  if (ctx.state === 'suspended') ctx.resume();
  liveStopVoices();
  LIVE.pos0 = pos; LIVE.t0ctx = ctx.currentTime + 0.05; LIVE.playing = true;
  LIVE.idx = 0; while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos) {
    const ev = LIVE.ev[LIVE.idx++], rem = ev.t + (ev.d || 0) - pos;
    if (SUSTAINED[ev.k] && rem > 0.3) LIVE.voices.push(playEvent(LIVE.G, Object.assign({}, ev, { t: pos, d: rem }), LIVE.t0ctx));
  }
  clearInterval(LIVE.timer); LIVE.timer = setInterval(liveTick, 25); liveTick();
}
function livePause() {
  if (!LIVE.ctx) return;
  LIVE.pos0 = liveNow(); LIVE.playing = false; clearInterval(LIVE.timer); liveStopVoices();
}
function liveMute(m) { LIVE.muted = m; if (LIVE.G) LIVE.G.master.gain.setTargetAtTime(m ? 0 : 0.9, LIVE.ctx.currentTime, 0.02); }
