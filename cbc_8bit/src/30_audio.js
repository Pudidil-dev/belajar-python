'use strict';
// ============================================================================
// AUDIO — an original, story-driven electronic score plus event-synced SFX,
// synthesised sample by sample in plain JS (no samples, no Web Audio graph).
// 118.15 BPM (32 bars = 65.000 s), F major, I–V–vi–IV (F – C – Dm – Bb, one
// chord per bar). One three-note motif (the chord's 3rd, 5th and octave, in a
// 3-3-2 rhythm) runs through the whole film and changes instrument with the
// chapter, so the music tells you where you are:
//   hook — bright synth pluck · the sample's journey — bubbly marimba ·
//   impedance — a square-wave "pulse" lead, then sparse so the cell bips carry
//   the tune · time-lapse — square arpeggios · hemoglobin — the drums cut out
//   on the hard cut, a soft heartbeat and a glass bell · white cells — a saw
//   "laser" lead that builds, a one-beat gap, and a half-time drop exactly on
//   the laser hit (42.66 s) · data — chip arpeggios on a driving beat ·
//   report — everything together, landing on the tonic for QC PASSED ·
//   recap — each tile pops with its chapter's instrument · title — a riser
//   that runs straight back into bar 1 (seamless loop; every tail wraps).
// The impedance "bip" is the voltage itself: its loudness is computed from the
// same particle positions that draw the scope trace. Cells, light and current
// make no sound: all effects are sonifications.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
// ---------------------------------------------------------------- harmony and the motif
const CHORDS = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb',
  'F', 'C', 'Dm', 'Bb', 'C', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Bb', 'C'];   // bar 21: dominant build · bar 22: the drop on F · 30: QC on F · 31–32: IV–V back into bar 1
const CROOT = { F: 'F', C: 'C', Dm: 'D', Bb: 'Bb' }, CMIN = { Dm: 1 };
function triad(ch, oct) { const r = nm(CROOT[ch], oct); return [r, r + (CMIN[ch] ? 3 : 4), r + 7]; }
// motif: 3rd, 5th, octave of the chord, kept between D4 and F5
function motifOf(ch) { const r = nm(CROOT[ch], 4), q = CMIN[ch] ? 3 : 4; let o = r + q > 72 ? -12 : 0; return [r + q + o, r + 7 + o, r + 12 + o]; }
const MOTIF = [[0, 0, 2], [3, 1, 2], [6, 2, 5]], ANSWER = [[10, 1, 2], [12, 0, 3]];       // [16th step, motif note, length in 16ths]
const GATES = [[27.0, 32.0], [bt(83), bt(84)]];                                         // the hemoglobin cut, the beat of silence before the drop
// ---------------------------------------------------------------- score → events
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const motif = (b, k, v, o) => {
    o = o || {}; const ns = motifOf(ch(b)), lift = 12 * (o.lift || 0);
    MOTIF.forEach(([st, j, l], i) => { if (!o.only || o.only(i)) E({ t: barT(b) + st * S16, d: l * S16, k, m: ns[j] + lift, v, cut: o.cut, post: o.post }); });
    if (o.answer) ANSWER.forEach(([st, j, l]) => E({ t: barT(b) + st * S16, d: l * S16, k, m: ns[j] + lift, v: v * 0.8, cut: o.cut, post: o.post }));
  };
  const D = (b, beat, k, v, x) => E(Object.assign({ t: at(b, beat), d: 0.5, k, v }, x || {}));
  const kick4 = (b, v, n) => { for (let i = 0; i < (n || 4); i++) D(b, i, 'kick', v); };
  const claps = (b, v) => { D(b, 1, 'clap', v); D(b, 3, 'clap', v); };
  const hats = (b, v, sixteenths, open) => { for (let i = 0; i < (sixteenths ? 16 : 8); i++) { const beat = i * (sixteenths ? 0.25 : 0.5), off = beat % 1 === 0.5; D(b, beat, 'hat', v * (off ? 1 : 0.6), { p: off ? 0.2 : -0.2, open: open && off }); } };
  const shaker = (b, v) => { for (let i = 0; i < 16; i++) D(b, i / 4, 'shaker', v * (i % 2 ? 1 : 0.6), { p: 0.35 }); };
  const roll = (b, from, to, step, v0, v1, k) => { for (let x = from; x < to - 1e-6; x += step) D(b, x, k || 'snare', lerp(v0, v1, (x - from) / (to - from))); };
  const root = (b, oct) => nm(CROOT[ch(b)], oct);
  const bassOff = (b, v) => { for (let i = 0; i < 4; i++) E({ t: at(b, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(b, 2) + (i % 2 ? 12 : 0), v }); E({ t: at(b, 0), d: 1.8 * BEAT, k: 'sub', m: root(b, 2), v: v * 0.9 }); E({ t: at(b, 2), d: 1.8 * BEAT, k: 'sub', m: root(b, 2), v: v * 0.8 }); };
  const bassRoll = (b, v) => { for (let i = 0; i < 16; i++) E({ t: at(b, i / 4), d: 0.2 * BEAT, k: 'roll', m: root(b, 2) + (i % 4 === 2 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.75) }); for (const beat of [0, 2]) E({ t: at(b, beat), d: 1.6 * BEAT, k: 'sub', m: root(b, 2), v: v * 0.6 }); };
  const bassBounce = (b, v) => { [[0, 0, 0.7], [1.5, 7, 0.4], [2, 0, 0.7], [3.5, 12, 0.4]].forEach(([beat, iv, l]) => E({ t: at(b, beat), d: l * BEAT, k: 'bass', m: root(b, 2) + iv, v })); };
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 3.9 * BEAT, k: 'pad', ms: triad(ch(b), 4).concat([root(b, 3) + 12 + (CMIN[ch(b)] ? 10 : 11)]), v, cut: cut || 1400 }, x || {}));
  const stabs = (b, v) => [0.5, 1.5, 2.75, 3.5].forEach(beat => E({ t: at(b, beat), d: 0.3 * BEAT, k: 'stab', ms: triad(ch(b), 4), v }));
  const arp = (b, k, v, oct, up) => { const tr = triad(ch(b), oct), seq = up ? [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6] : [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3]; for (let i = 0; i < 16; i++) { const s_ = seq[i], m = tr[s_ % 3] + 12 * Math.floor(s_ / 3); E({ t: at(b, i / 4), d: 0.22 * BEAT, k, m, v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.3 : -0.3 }); } };
  // ---- A: hook (bars 1–2) — full groove from frame one; a breath from bar 2 beat 2 as the film goes back to the needle
  for (const b of [1, 2]) { const n = b === 1 ? 4 : 2; kick4(b, 0.95, n); D(b, 1, 'clap', 0.6); if (b === 1) D(b, 3, 'clap', 0.6); for (let i = 0; i < n * 4; i++) D(b, i / 4, 'hat', i % 2 ? 0.55 : 0.3, { p: 0.2, open: b === 1 && i === 14 }); }
  bassOff(1, 0.8); for (let i = 0; i < 2; i++) E({ t: at(2, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(2, 2) + (i % 2 ? 12 : 0), v: 0.8 }); E({ t: at(2, 0), d: 1.8 * BEAT, k: 'sub', m: root(2, 2), v: 0.72 });
  motif(1, 'pluck', 0.9); motif(1, 'glass', 0.25, { lift: 1 }); motif(2, 'pluck', 0.9, { answer: true }); motif(2, 'glass', 0.25, { lift: 1, answer: true });
  pad(1, 0.5); E({ t: 0, d: 1.6, k: 'crash', v: 0.7 });
  // ---- B: the sample (bars 3–6) — bouncy, lighter; bubbly marimba motif; a riser into the impedance chapter
  for (let b = 3; b <= 6; b++) {
    if (b <= 4) { D(b, 0, 'kick', 0.85); D(b, 2, 'kick', 0.8); if (b === 4) D(b, 2.75, 'kick', 0.5); } else kick4(b, 0.85);
    claps(b, b <= 4 ? 0.35 : 0.5); shaker(b, 0.55); bassBounce(b, 0.7); pad(b, 0.35, 1100);
    motif(b, 'bubble', 0.8, { answer: b >= 5 });
  }
  roll(6, 2, 4, 0.5, 0.15, 0.45); E({ t: at(6, 0), d: 4 * BEAT, k: 'riser', v: 0.55 });
  // ---- C: impedance (bars 7–14) — an electric groove with ticking 16th hats; sparse while the single cell is measured
  for (const b of [7, 8]) { kick4(b, 0.9); claps(b, 0.55); hats(b, 0.6, true); bassOff(b, 0.75); motif(b, 'square', 0.75, { answer: true }); }
  E({ t: at(7, 0), d: 1.6, k: 'crash', v: 0.55 });
  for (let b = 9; b <= 12; b++) {
    D(b, 0, 'kick', 0.7); D(b, 2, 'kick', 0.6); hats(b, 0.28, true); pad(b, 0.4, 900);
    E({ t: at(b, 0), d: 3.8 * BEAT, k: 'sub', m: root(b, 2), v: 0.55 });
    if (b === 9) motif(b, 'square', 0.5);
  }
  roll(12, 3, 4, 0.25, 0.15, 0.35, 'rim');
  for (const b of [13, 14]) { kick4(b, 0.95); claps(b, 0.6); hats(b, 0.65, true); shaker(b, 0.5); bassRoll(b, 0.7); arp(b, 'sqarp', 0.5, 5); motif(b, 'square', 0.75); }
  E({ t: at(13, 0), d: 1.6, k: 'crash', v: 0.6 }); roll(14, 0, 1.25, 0.125, 0.25, 0.6);
  // ---- D: hemoglobin (27–32 s) — the band drops out on the cut; a heartbeat, a pad and a glass-bell motif (rendered after the gate)
  E({ t: 27.0, d: 0.7, k: 'down', v: 0.6, post: true });
  for (const b of [14, 15, 16]) { const t0 = b === 14 ? 27.42 : barT(b); E({ t: t0, d: 0.3, k: 'heart', v: 0.85, post: true }); E({ t: t0 + 0.24, d: 0.3, k: 'heart', v: 0.55, post: true }); if (b === 16) { E({ t: t0 + BEAT * 2, d: 0.3, k: 'heart', v: 0.75, post: true }); E({ t: t0 + BEAT * 2 + 0.24, d: 0.3, k: 'heart', v: 0.5, post: true }); } }
  pad(15, 0.55, 1600, { post: true, d: 4.2 * BEAT }); pad(16, 0.55, 1600, { post: true });
  E({ t: 27.4, d: 1.0 * BAR, k: 'pad', ms: triad('C', 4), v: 0.4, cut: 1200, post: true });
  motif(15, 'glass', 0.75, { post: true, answer: true }); motif(16, 'glass', 0.7, { post: true });
  E({ t: 31.0, d: 1.5, k: 'revcym', v: 0.5, post: true }); roll(16, 3, 4, 0.25, 0.3, 0.7, 'snare'); ev.slice(-4).forEach(e => e.post = true);
  E({ t: at(16, 3.75), d: 0.4, k: 'kick', v: 0.8, post: true });
  // ---- E: white cells (bars 17–21) — the laser lead enters dark and opens up; a build, then one beat of silence
  for (let b = 17; b <= 19; b++) { kick4(b, 0.9); claps(b, 0.55); hats(b, 0.55, false, true); bassOff(b, 0.75); pad(b, 0.3, 1000); motif(b, 'laser', 0.6, { cut: 900 + (b - 17) * 700, answer: b === 19 }); }
  E({ t: at(17, 0), d: 1.6, k: 'crash', v: 0.6 });
  kick4(20, 0.9); claps(20, 0.5); hats(20, 0.6, true); bassRoll(20, 0.7); arp(20, 'sqarp', 0.4, 5, true); motif(20, 'laser', 0.7, { cut: 3000, answer: true }); roll(20, 0, 4, 0.5, 0.2, 0.45);
  for (let i = 0; i < 6; i++) D(21, i / 2, 'kick', 0.9); bassRoll(21, 0.75); motif(21, 'laser', 0.8, { cut: 4200, only: i => i < 2 }); roll(21, 0, 2, 0.25, 0.45, 0.75); roll(21, 2, 3, 0.125, 0.75, 1.0);
  E({ t: at(20, 0), d: 7 * BEAT, k: 'riser', v: 0.8 });
  // ---- the drop (bars 22–24): half-time on the laser hit — big chords, the laser lead an octave up, a sub impact
  E({ t: at(22, 0), d: 2.5, k: 'impact', v: 0.9 }); E({ t: at(22, 0), d: 2.0, k: 'crash', v: 0.8 });
  for (let b = 22; b <= 24; b++) {
    D(b, 0, 'kick', 1.0); D(b, 2.5, 'kick', 0.75); if (b === 23) D(b, 3.75, 'kick', 0.6); D(b, 2, 'clap', 0.8); D(b, 2, 'snare', 0.5); hats(b, 0.5, false, true);
    E({ t: at(b, 0), d: 3.9 * BEAT, k: 'sub', m: root(b, 2), v: 0.85 }); E({ t: at(b, 2.5), d: 1.3 * BEAT, k: 'bass', m: root(b, 2) + 12, v: 0.6 });
    E({ t: at(b, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad(ch(b), 4).concat([root(b, 5)]), v: 0.75 });
    motif(b, 'laser', 0.85, { lift: 1, cut: 5200, answer: true }); motif(b, 'pluck', 0.35, { answer: true });
  }
  roll(24, 2, 4, 0.25, 0.3, 0.8); E({ t: at(24, 0), d: 4 * BEAT, k: 'riser', v: 0.6 });
  // ---- F: detection and data (bars 25–28) — the driving section: chip motif, chip arps, rolling bass, stabs
  for (let b = 25; b <= 28; b++) { kick4(b, 0.95); claps(b, 0.7); hats(b, 0.65, true); shaker(b, 0.5); bassRoll(b, 0.85); stabs(b, 0.65); arp(b, 'chiparp', 0.65, 5, b >= 27); motif(b, 'chip', 0.85, { lift: 1, answer: true }); }
  E({ t: at(25, 0), d: 1.6, k: 'crash', v: 0.7 }); roll(28, 2, 4, 0.25, 0.25, 0.7);
  // ---- G: results (bars 29–30), recap (31), title and the run back into bar 1 (32)
  for (const b of [29, 30]) { kick4(b, 0.95); claps(b, 0.6); hats(b, 0.55, false, true); bassOff(b, 0.8); pad(b, 0.45, 1800); stabs(b, 0.3); motif(b, 'pluck', 0.8, { answer: true }); motif(b, 'laser', 0.45, { lift: 1, cut: 4500, answer: true }); motif(b, 'glass', 0.3, { lift: 1 }); }
  E({ t: at(29, 0), d: 1.6, k: 'crash', v: 0.7 }); E({ t: at(30, 0), d: 1.6, k: 'crash', v: 0.6 });
  { // recap: one tile per beat, each in its chapter's instrument (impedance square, laser saw, hemoglobin glass, report chord)
    const ns = motifOf('Bb'), inst = ['square', 'laser', 'glass', 'pluck'];
    for (let i = 0; i < 4; i++) { E({ t: at(31, i), d: 0.9 * BEAT, k: inst[i], m: [ns[0], ns[1], ns[2], ns[2] + 4][i] + 12, v: 0.85, cut: 5000 }); D(31, i, 'kick', 0.8); }
    E({ t: at(31, 3), d: 0.9 * BEAT, k: 'stab', ms: triad('Bb', 4), v: 0.6 }); claps(31, 0.45); hats(31, 0.4); bassOff(31, 0.7); pad(31, 0.45, 1600);
  }
  D(32, 0, 'kick', 0.9); D(32, 2, 'kick', 0.8); D(32, 1, 'clap', 0.5); bassOff(32, 0.7); pad(32, 0.5, 2000);
  motif(32, 'pluck', 0.85); motif(32, 'laser', 0.5, { lift: 1, cut: 5000 }); motif(32, 'glass', 0.35, { lift: 1 });
  roll(32, 2, 4, 0.125, 0.2, 0.75); E({ t: at(32, 1), d: 3 * BEAT, k: 'riser', v: 0.7 });
  return ev;
}
// ---------------------------------------------------------------- SFX map (every cue belongs to a visible event)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A: hook
  S(0.14, 'pierce', 1.0); S(0.42, 'suck', 0.9, { d: 0.36 }); S(0.8, 'cut', 0.6); S(0.8, 'tick', 0.5, { f: fq('C', 6) });
  S(T_RBC, 'ding', 0.75, { f: fq('A', 5) }); S(T_WBC, 'tick', 0.45, { f: fq('E', 6) }); S(T_PLT, 'tick', 0.45, { f: fq('G', 6) });
  S(1.86, 'dive', 0.5, { d: 0.38 }); S(HOOK_RBC.keys[1][0] - 0.06, 'bip', 0.8, { part: HOOK_RBC, f: fq('F', 4), d: 0.6 }); S(T_HOOKCOUNT, 'count', 0.85, { f: fq('D', 6) });
  S(3.0, 'undive', 0.45, { d: 0.3 });
  // B: the sample
  S(3.35, 'pump', 0.5, { d: 1.65 }); S(5.0, 'dive', 0.45, { d: 0.35 }); S(7.5, 'swish', 0.35, { d: 0.35 }); S(7.75, 'pour', 0.55, { d: 1.15 });
  S(9.0, 'undive', 0.4, { d: 0.35 }); [10.2, 10.3, 10.4].forEach((tt, i) => S(tt, 'tick', 0.4, { f: fq(['A', 'C', 'E'][i], 6) })); S(10.35, 'select', 0.4); S(10.7, 'dive', 0.45, { d: 0.3 });
  // C: impedance (the current hums; each cell's pulse is heard as its voltage)
  S(11.0, 'hum', 0.3, { d: 16.0 }); S(13.35, 'ping', 0.35, { f: fq('C', 6) }); S(14.9, 'scope', 0.4);
  S(RBC1.keys[1][0] - 0.1, 'bip', 0.9, { part: RBC1, f: fq('F', 4), d: RBC1.keys[4][0] - RBC1.keys[1][0] + 0.2 }); S(T_RBC1, 'count', 0.7, { f: fq('D', 6) });
  S(PLT1.keys[1][0] - 0.06, 'bip', 0.8, { part: PLT1, f: fq('C', 6), d: 0.4 }); S(T_PLTC, 'count', 0.55, { f: fq('A', 6) });
  S(RBC2.keys[1][0] - 0.06, 'bip', 0.8, { part: RBC2, f: fq('F', 4), d: 0.4 }); S(T_RBC2, 'count', 0.6, { f: fq('D', 6) });
  STREAM.forEach(p => S(p.keys[1][0] - 0.12, 'bip', 0.32, { part: p, f: p.k === 'rbc' ? fq('F', 4) : fq('C', 6), d: 0.24 }));
  S(25.4, 'build', 0.4, { d: 1.4 });
  // D: hemoglobin
  S(27.0, 'cut', 0.5); HG_RBC.forEach((c, i) => S(27.72 + 0.05 * i + 0.04 * hash(i + 31), 'burst', 0.35, { f: fq(['C', 'D', 'F', 'G', 'A'][i % 5], 5) }));
  S(28.5, 'bind', 0.4, { d: 0.5 }); S(29.0, 'undive', 0.4, { d: 0.3 }); S(29.38, 'led', 0.6); S(29.45, 'beam', 0.4, { d: 2.5 }); S(T_HGB, 'result', 0.75);
  // E: white cells
  S(32.0, 'swish', 0.4, { d: 0.3 }); for (let k = 0; k < 12; k++) S(34.35 + k * 0.11 + 0.04 * hash(k + 51), 'burst', 0.24, { f: fq(['D', 'F', 'G', 'A', 'C'][k % 5], 6) });
  S(36.0, 'dive', 0.45, { d: 0.3 }); for (let k = 0; k < 6; k++) S(36.5 + k * 0.24, 'dye', 0.35, { f: fq(['C', 'D', 'F', 'G', 'A', 'C'][k], k < 5 ? 6 : 7) });
  S(38.0, 'undive', 0.4, { d: 0.3 }); S(38.4, 'flow', 0.4, { d: 2.6 }); S(40.0, 'laser', 0.35, { d: 8.4 });
  S(T_CROSS, 'hit', 0.85); S(T_CROSS + 0.05, 'slowmo', 0.45, { d: 0.9 }); S(43.2, 'glow', 0.5, { d: 1.2 });
  [[45.3, 'A', 5], [45.8, 'C', 6], [46.3, 'E', 6]].forEach(([tt, n, o]) => S(tt, 'scatter', 0.45, { f: fq(n, o) }));
  // F: detection and data
  S(48.4, 'resume', 0.45, { d: 0.4 }); [T_P1, T_P2, T_P3].forEach(tt => S(tt, 'detect', 0.5));
  S(51.0, 'swish', 0.35, { d: 0.3 }); S(51.35, 'plot', 0.55, { f: fq('A', 6) });
  for (let k = 0; k < 26; k++) { const u = k / 25, tt = 51.9 + 1.4 * Math.sqrt(u); S(tt, 'tick', 0.16 + 0.1 * u, { f: fq(['F', 'G', 'A', 'C', 'D'][k % 5], 6) }); }
  S(53.0, 'shimmer', 0.45, { d: 0.8 }); S(54.0, 'swish', 0.35, { d: 0.35 });
  ['F', 'G', 'A', 'C', 'D'].forEach((n, i) => S(55.0 + i * 0.12, 'tick', 0.42, { f: fq(n, 5) }));
  // G: results and loop
  S(56.0, 'swish', 0.35, { d: 0.3 }); S(56.3, 'data', 0.65, { d: 1.4 }); S(57.95, 'undive', 0.4, { d: 0.35 });
  for (let i = 0; i < 5; i++) S(REP0 + i * REPD, 'tick', 0.4, { f: fq(['C', 'D', 'F', 'G', 'A'][i], 6) });
  for (let i = 0; i < 4; i++) S(59.35 + i * 0.11, 'check', 0.4, { f: fq(['A', 'C', 'D', 'F'][i], 6) });
  S(59.6, 'result', 0.7); S(60.0, 'swish', 0.3, { d: 0.6 });
  S(62.8, 'swish', 0.3, { d: 0.35 }); S(63.1, 'retract', 0.4, { d: 0.6 }); S(63.2, 'title', 0.55, { d: 1.2 });
  return ev;
}
const DUCK = { ding: 0.3, result: 0.3, hit: 0.35, count: 0.12 };
// ---------------------------------------------------------------- synthesis helpers
let SND_L = null, SND_R = null, ECH_L = null, ECH_R = null, SCG = null;    // reverb send, delay send, sidechain gain (one value per 64 samples)
const nz = i => hash(i) * 2 - 1;
// write one voice into (L, R); wraps at 65 s; o: { send (reverb), echo (delay), duck (sidechain) }
function voice(L, R, t0, dur, pan, gain, fn, o) {
  o = o || {};
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR)), snd = o.send || 0, ech = o.echo || 0, dk = !!o.duck;
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    let s = fn(k / SR, k); if (s === 0) continue;
    let i = (i0 + k) % NS; if (i < 0) i += NS;
    if (dk) s *= SCG[i >> 6];
    const l = s * pl, r = s * pr;
    L[i] += l; R[i] += r;
    if (snd) { SND_L[i] += l * snd; SND_R[i] += r * snd; }
    if (ech) { ECH_L[i] += l * ech; ECH_R[i] += r * ech; }
  }
}
const dec = r => t => Math.exp(-t * r);
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
// state-variable filters (Chamberlin); cutoff in Hz, q = damping (lower = more resonant)
function lpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return lo; }; }
function bpf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = Math.min(0.8, TAU * fc / SR); lo += f * bp; const hi = x - lo - q * bp; bp += f * hi; return bp; }; }
const rel = (t, d, r) => t > d ? Math.max(0, 1 - (t - d) / r) : 1;
// ---- tonal instruments
function pluckFn(f, d) { let p1 = 0, p2 = 0; const F = lpf(), a = f * 1.0035 / SR, b = f * 0.9965 / SR; return t => { p1 += a; if (p1 >= 1) p1 -= 1; p2 += b; if (p2 >= 1) p2 -= 1; const x = (2 * p1 - 1 - blep(p1, a)) + (2 * p2 - 1 - blep(p2, b)); return F(x * 0.5, 380 + 5200 * Math.exp(-t * 15), 0.45) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t * 4) * rel(t, d, 0.08); }; }
function bubbleFn(f) { let p = 0, q = 0; return t => { const ff = f * (1 + 0.1 * Math.exp(-t * 50)); p += ff / SR; q += ff * 4 / SR; p -= Math.floor(p); q -= Math.floor(q); return (fsin(TAU * p) + 0.25 * fsin(TAU * q) * Math.exp(-t * 28)) * Math.exp(-t * 6.5) * (t < 0.002 ? t / 0.002 : 1); }; }
function squareFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt); return F(v, 2800, 0.6) * (t < 0.004 ? t / 0.004 : 1) * (0.5 + 0.5 * Math.exp(-t * 7)) * rel(t, d, 0.05); }; }
function glassFn(f) { let pc = 0, pm = 0; return t => { pc += f / SR; pm += f * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + 1.2 * Math.exp(-t * 5) * fsin(TAU * pm)) * Math.exp(-t * 2.4) * (t < 0.004 ? t / 0.004 : 1); }; }
function laserFn(f, d, f0, cut) {
  const p = [0, 0, 0], det = [1, 1.006, 0.994], F = lpf();
  return t => {
    const g = f0 ? f0 * Math.pow(f / f0, Math.min(1, t / 0.05)) : f, vib = t > 0.16 ? 1 + 0.01 * fsin(TAU * 5.6 * t) : 1; let x = 0;
    for (let j = 0; j < 3; j++) { const dt = g * vib * det[j] / SR; p[j] += dt; if (p[j] >= 1) p[j] -= 1; x += 2 * p[j] - 1 - blep(p[j], dt); }
    return F(x / 3, cut * (0.65 + 0.35 * Math.exp(-t * 6)), 0.5) * (t < 0.008 ? t / 0.008 : 1) * rel(t, d, 0.08);
  };
}
function chipFn(f, d) { let p = 0; const dt = f / SR, w = 0.125; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < w ? 1 : -1) + blep(p, dt) - blep((p - w + 1) % 1, dt) - (2 * w - 1); return v * (t < 0.002 ? t / 0.002 : 1) * (0.65 + 0.35 * Math.exp(-t * 10)) * rel(t, d, 0.03); }; }
function chordFn(ms, d, cut, att, env) { // detuned saws through a low-pass: pads, stabs, the drop's supersaw
  const n = ms.length * 2, ph = new Float64Array(n), dts = []; ms.forEach(m => { const f = mtof(m); dts.push(f * 1.005 / SR, f * 0.995 / SR); }); const F = lpf();
  return t => { let x = 0; for (let j = 0; j < n; j++) { let q = ph[j] + dts[j]; if (q >= 1) q -= 1; ph[j] = q; x += 2 * q - 1; } const fc = env ? cut * (0.25 + 0.75 * Math.exp(-t * env)) : cut; return F(x / n, fc, 0.7) * Math.min(1, t / att) * rel(t, d, att > 0.1 ? 0.5 : 0.06) * (env ? Math.exp(-t * 3) : 1); };
}
function bassFn(f, d, kind) {
  let p = 0, s = 0; const F = lpf(), dt = f / SR;
  return t => {
    p += dt; if (p >= 1) p -= 1; s += dt; s -= Math.floor(s);
    const y = kind === 'sub' ? 0.9 * fsin(TAU * s) + 0.3 * fsin(2 * TAU * s) : F(2 * p - 1 - blep(p, dt), 160 + (kind === 'roll' ? 900 : 1500) * Math.exp(-t * 20), 0.55) * 0.85 + 0.3 * fsin(TAU * s);
    return y * (t < 0.004 ? t / 0.004 : 1) * rel(t, d, 0.03);
  };
}
// ---- drums and effects
function kickFn(seed) { let p = 0, q = 0; return (t, k) => { p += (58 + 115 * Math.exp(-t * 38)) / SR; q += 1600 / SR; return fsin(TAU * p) * Math.exp(-t * 9) * (t < 0.0015 ? t / 0.0015 : 1) + fsin(TAU * q) * 0.18 * Math.exp(-t * 110) + (t < 0.003 ? nz(k * 7 + seed) * 0.3 * (1 - t / 0.003) : 0); }; }
function clapFn(seed) { const F = bpf(); return (t, k) => { let e = Math.exp(-t * 20) * 0.5; for (const o of [0, 0.009, 0.019]) if (t >= o) e += Math.exp(-(t - o) * 280) * 0.8; return F(nz(k * 3 + seed), 1400, 0.8) * e * 1.6; }; }
function snareFn(seed) { const F = bpf(); let p = 0; return (t, k) => { p += 190 / SR; return F(nz(k * 5 + seed), 2300, 0.9) * Math.exp(-t * 20) * 1.5 + fsin(TAU * p) * Math.exp(-t * 32) * 0.45; }; }
function rimFn(seed) { let p = 0; return (t, k) => { p += 1700 / SR; return fsin(TAU * p) * Math.exp(-t * 80) * 0.6 + nz(k * 11 + seed) * Math.exp(-t * 140) * 0.4; }; }
function hatFn(seed, open) { let lp = 0; return (t, k) => { const x = nz(k * 11 + seed); lp += 0.55 * (x - lp); return (x - lp) * Math.exp(-t * (open ? 11 : 65)); }; }
function shakerFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 13 + seed), 6200, 1.0) * (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) * 32)) * 1.4; }
function crashFn(seed) { let lp = 0; return (t, k) => { const x = nz(k * 17 + seed); lp += 0.4 * (x - lp); return (x - lp) * Math.exp(-t * 2.0) * (t < 0.002 ? t / 0.002 : 1); }; }
function heartFn() { let p = 0; return t => { p += (46 + 34 * Math.exp(-t * 30)) / SR; return (fsin(TAU * p) + 0.25 * fsin(2 * TAU * p)) * Math.exp(-t * 11) * (t < 0.004 ? t / 0.004 : 1); }; }
function riserFn(d, seed) { const F = bpf(); let p = 0; return (t, k) => { const u = clamp(t / d, 0, 1); p += 110 * Math.pow(4, u) / SR; p -= Math.floor(p); return (F(nz(k * 19 + seed), 300 * Math.pow(22, u), 0.7) + (2 * p - 1) * 0.12) * u * u; }; }
function downFn(d, seed) { const F = bpf(); return (t, k) => { const u = clamp(t / d, 0, 1); return F(nz(k * 23 + seed), 6000 * Math.pow(0.05, u), 0.7) * (1 - u) * (1 - u); }; }
function impactFn(seed) { let p = 0; return (t, k) => { p += (32 + 52 * Math.exp(-t * 6)) / SR; return fsin(TAU * p) * Math.exp(-t * 2.6) + (t < 0.05 ? nz(k * 29 + seed) * 0.3 * (1 - t / 0.05) : 0); }; }
function revcymFn(d, seed) { let lp = 0; return (t, k) => { const x = nz(k * 31 + seed); lp += 0.4 * (x - lp); return (x - lp) * Math.pow(clamp(t / d, 0, 1), 2.4) * (t > d - 0.02 ? Math.max(0, (d - t) / 0.02) : 1); }; }
// one music event
const LEAD_PREV = {};
function playMusic(e, L, R) {
  const k = e.k, sd = Math.round(e.t * 1000), v = e.v;
  switch (k) {
    case 'pluck': voice(L, R, e.t, e.d + 0.5, -0.1, 0.32 * v, pluckFn(mtof(e.m), e.d), { send: 0.18, echo: 0.22 }); break;
    case 'bubble': voice(L, R, e.t, 0.8, 0.1, 0.42 * v, bubbleFn(mtof(e.m)), { send: 0.2, echo: 0.2 }); break;
    case 'square': voice(L, R, e.t, e.d + 0.1, 0.05, 0.17 * v, squareFn(mtof(e.m), e.d), { send: 0.15, echo: 0.25 }); break;
    case 'glass': voice(L, R, e.t, 1.6, 0.15, 0.26 * v, glassFn(mtof(e.m)), { send: 0.4, echo: 0.2 }); break;
    case 'laser': { const f = mtof(e.m), pf = LEAD_PREV.laser && e.t - LEAD_PREV.laser.t < 0.6 ? LEAD_PREV.laser.f : 0; LEAD_PREV.laser = { t: e.t + e.d, f }; voice(L, R, e.t, e.d + 0.12, -0.05, 0.23 * v, laserFn(f, e.d, pf, e.cut || 3000), { send: 0.2, echo: 0.28 }); break; }
    case 'chip': voice(L, R, e.t, e.d + 0.05, 0.1, 0.15 * v, chipFn(mtof(e.m), e.d), { send: 0.12, echo: 0.25 }); break;
    case 'sqarp': voice(L, R, e.t, e.d + 0.06, e.p || 0, 0.1 * v, squareFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'chiparp': voice(L, R, e.t, e.d + 0.04, e.p || 0, 0.1 * v, chipFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.6, 0, 0.28 * v, chordFn(e.ms, e.d, e.cut || 1400, 0.25), { send: 0.4, duck: 1 }); break;
    case 'stab': voice(L, R, e.t, e.d + 0.1, 0.1, 0.28 * v, chordFn(e.ms, e.d, 4200, 0.003, 14), { send: 0.15, duck: 1 }); break;
    case 'supersaw': voice(L, R, e.t, e.d + 0.6, 0, 0.32 * v, chordFn(e.ms, e.d, 2600, 0.02), { send: 0.3, duck: 1 }); break;
    case 'bass': case 'roll': case 'sub': voice(L, R, e.t, e.d + 0.05, 0, (k === 'sub' ? 0.16 : 0.22) * v, bassFn(mtof(e.m), e.d, k), { duck: k !== 'sub' }); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.55 * v, kickFn(sd)); break;
    case 'clap': voice(L, R, e.t, 0.35, 0.05, 0.36 * v, clapFn(sd), { send: 0.22 }); break;
    case 'snare': voice(L, R, e.t, 0.3, -0.05, 0.26 * v, snareFn(sd), { send: 0.18 }); break;
    case 'rim': voice(L, R, e.t, 0.1, 0.15, 0.22 * v, rimFn(sd), { send: 0.1 }); break;
    case 'hat': voice(L, R, e.t, e.open ? 0.3 : 0.08, e.p || 0, 0.15 * v, hatFn(sd, e.open)); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.08 * v, shakerFn(sd)); break;
    case 'crash': voice(L, R, e.t, e.d, 0, 0.15 * v, crashFn(sd), { send: 0.25 }); break;
    case 'heart': voice(L, R, e.t, 0.35, 0, 0.6 * v, heartFn()); break;
    case 'riser': voice(L, R, e.t, e.d, 0, 0.2 * v, riserFn(e.d, sd), { send: 0.3 }); break;
    case 'down': voice(L, R, e.t, e.d, 0, 0.2 * v, downFn(e.d, sd), { send: 0.4 }); break;
    case 'impact': voice(L, R, e.t, e.d, 0, 0.6 * v, impactFn(sd), { send: 0.2 }); break;
    case 'revcym': voice(L, R, e.t, e.d, 0, 0.16 * v, revcymFn(e.d, sd), { send: 0.4 }); break;
  }
}
// ---------------------------------------------------------------- SFX: clean, rounded, tuned to F major
function playSfx(e, L, R) {
  const k = e.k, v = e.v, f = e.f || 440, p = e.p || 0, d = e.d || 0.2;
  const V = (t0, dur, g, fn, snd) => voice(L, R, t0, dur, p, g * v, fn, { send: snd === undefined ? 0.2 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.002 ? t / 0.002 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  switch (k) {
    case 'pierce': V(e.t, 0.02, 0.75, noiseLP(() => 6000, dec(250), 3)); V(e.t, 0.08, 0.75, sine(t => 190 - 900 * t, dec(45))); V(e.t, 0.05, 0.25, sine(() => 2600, dec(120))); break;
    case 'suck': V(e.t, d, 0.35, noiseLP(t => 3500 - 2800 * t / d, swell(d), 5)); break;
    case 'slam': V(e.t, 0.3, 0.7, sine(t => 40 + 60 * Math.exp(-t * 20), dec(10)), 0.1); V(e.t, 0.12, 0.25, noiseLP(() => 2200, dec(30), 7)); break;
    case 'ding': V(e.t, 1.2, 0.36, bell(f, 3.2, 1.4), 0.35); V(e.t + 0.002, 1.0, 0.18, bell(f * 2, 4.5, 0.6), 0.35); break;
    case 'tick': V(e.t, 0.12, 0.4, sine(() => f, dec(45))); break;
    case 'count': V(e.t, 0.1, 0.34, sine(() => f, dec(35))); V(e.t + 0.06, 0.25, 0.3, sine(() => f * 1.5, dec(16)), 0.3); break;
    case 'dive': V(e.t, d, 0.3, noiseLP(t => 600 + 7000 * (t / d) ** 2, swell(d), 9), 0.25); V(e.t, d, 0.12, sine(t => 300 + 700 * t / d, swell(d))); break;
    case 'undive': V(e.t, d, 0.28, noiseLP(t => 6000 - 5200 * t / d, swell(d), 11), 0.25); break;
    case 'swish': V(e.t, d, 0.22, noiseLP(t => 1500 + 3000 * Math.sin(Math.PI * t / d), swell(d), 13), 0.3); break;
    case 'pump': { let ph = 0; V(e.t, d, 0.3, (t) => { ph += (52 + 6 * t) / SR; ph -= Math.floor(ph); return (ph * 2 - 1) * 0.5 * (0.6 + 0.4 * fsin(TAU * 11 * t)) * Math.min(1, t / 0.15) * Math.min(1, (d - t) / 0.2); }, 0.05); V(e.t, d, 0.12, noiseLP(() => 900, t => Math.min(1, t / 0.2) * Math.min(1, (d - t) / 0.2), 15)); break; }
    case 'pour': V(e.t, d, 0.4, noiseLP(t => 1400 + 900 * fsin(TAU * 7 * t), swell(d), 17), 0.3); for (let i = 0; i < 9; i++) { const t1 = e.t + 0.1 + i * 0.11 + 0.05 * hash(i + 3); V(t1, 0.07, 0.3, sine(t => (320 + 150 * hash(i + 9)) * (1 + 6 * t), dec(40))); } break;
    case 'select': V(e.t, 0.18, 0.3, sine(t => t < 0.06 ? fq('C', 6) : fq('F', 6), dec(18))); break;
    case 'hum': { const h = fq('F', 2); V(e.t, d, 0.2, (t) => { const a = Math.min(1, t / 0.6) * Math.min(1, (d - t) / 0.4) * (0.85 + 0.15 * fsin(TAU * 0.7 * t)); return a * (fsin(TAU * h * t) * 0.6 + fsin(TAU * 2 * h * t) * 0.35 + fsin(TAU * 3 * h * t) * 0.22); }, 0.05); break; }
    case 'ping': V(e.t, 0.6, 0.3, bell(f, 6, 0.8), 0.35); break;
    case 'scope': V(e.t, 0.2, 0.28, sine(t => fq('A', 5) * (1 + 1.2 * t / 0.2), dec(10))); break;
    case 'bip': { // the voltage, made audible: loudness = the same sensing-zone response that draws the scope
      const prt = e.part, vn = prt.vol || VOL[prt.k]; let ph = 0;
      V(e.t, d, 0.33, (t) => { const s = impSignal([prt], e.t + t) / vn; if (s <= 0.001) return 0; ph += f / SR; ph -= Math.floor(ph); return s * (fsin(TAU * ph) + 0.22 * fsin(2 * TAU * ph)); }, 0.12); break;
    }
    case 'build': for (let i = 0; i < 10; i++) V(e.t + i * d / 10, 0.12, 0.12 + 0.012 * i, sine(() => fq(['F', 'G', 'A', 'C', 'D'][i % 5], 5 + Math.floor(i / 5)), dec(30))); break;
    case 'cut': V(e.t, 0.25, 0.45, sine(t => 60 + 40 * Math.exp(-t * 25), dec(14)), 0.05); break;
    case 'burst': V(e.t, 0.06, 0.32, sine(t => f * (1.8 - 14 * t), dec(55))); V(e.t, 0.015, 0.12, noiseLP(() => 5000, dec(300), 21)); break;
    case 'bind': for (let i = 0; i < 6; i++) V(e.t + i * d / 6, 0.4, 0.1, bell(fq(['C', 'D', 'F', 'G', 'A', 'C'][i], i < 5 ? 6 : 7), 9, 0.5), 0.4); break;
    case 'led': V(e.t, 0.03, 0.4, noiseLP(() => 5000, dec(300), 23)); V(e.t, 0.05, 0.25, sine(() => 2093, dec(90))); break;
    case 'beam': V(e.t, d, 0.07, sine(() => fq('A', 6), t => Math.min(1, t / 0.3) * Math.min(1, (d - t) / 0.3) * (0.8 + 0.2 * fsin(TAU * 3 * t))), 0.3); break;
    case 'result': V(e.t, 0.6, 0.3, bell(fq('C', 6), 4, 1.0), 0.35); V(e.t + 0.12, 1.2, 0.34, bell(fq('F', 6), 3, 1.0), 0.35); break;
    case 'dye': V(e.t, 0.5, 0.22, bell(f, 7, 1.2), 0.45); break;
    case 'flow': V(e.t, d, 0.2, noiseLP(t => 700 + 300 * fsin(TAU * 1.3 * t), t => Math.min(1, t / 0.4) * Math.min(1, (d - t) / 0.4), 25), 0.2); break;
    case 'laser': V(e.t, d, 0.07, (t) => { const a = Math.min(1, t / 0.5) * Math.min(1, (d - t) / 0.3); return a * (fsin(TAU * fq('E', 6) * t) + 0.3 * fsin(TAU * fq('E', 6) * 1.003 * t)); }, 0.2); break;
    case 'hit': V(e.t, 0.5, 0.5, sine(t => 45 + 50 * Math.exp(-t * 18), dec(8)), 0.1); [['F', 6], ['A', 6], ['C', 7], ['E', 7]].forEach(([n, o], i) => V(e.t + i * 0.018, 1.6, 0.13, bell(fq(n, o), 2.4, 1.2), 0.6)); break;
    case 'slowmo': V(e.t, d, 0.22, noiseLP(t => 5000 * Math.pow(0.08, t / d), swell(d), 27), 0.4); break;
    case 'glow': for (let i = 0; i < 7; i++) V(e.t + i * 0.09, 1.0, 0.09, bell(fq(['F', 'A', 'C', 'E', 'G', 'A', 'C'][i], i < 2 ? 6 : 7), 3.5, 0.5), 0.6); break;
    case 'scatter': V(e.t, 0.8, 0.26, bell(f, 4, 1.1), 0.4); break;
    case 'resume': V(e.t, d, 0.26, noiseLP(t => 500 + 6000 * (t / d) ** 2, swell(d), 29), 0.3); break;
    case 'detect': [['F', 6], ['A', 6], ['C', 7]].forEach(([n, o], i) => V(e.t + i * 0.035, 0.1, 0.38, sine(() => fq(n, o), dec(45)))); break;
    case 'plot': V(e.t, 0.2, 0.36, sine(t => f * (1 + 0.5 * Math.exp(-t * 60)), dec(20)), 0.3); break;
    case 'shimmer': for (let i = 0; i < 10; i++) V(e.t + i * d / 10, 0.4, 0.11, bell(fq(['A', 'C', 'D', 'F', 'G'][i % 5], 6 + (i > 6 ? 1 : 0)), 8, 0.6), 0.5); break;
    case 'data': for (let i = 0; i < 18; i++) if (hash(i + 400) > 0.3) V(e.t + i * d / 18, 0.05, 0.17, sine(() => fq(['F', 'G', 'A', 'C', 'D'][Math.floor(hash(i + 401) * 5)], 6), dec(80))); break;
    case 'check': V(e.t, 0.08, 0.26, sine(() => f, dec(35))); V(e.t + 0.05, 0.16, 0.24, sine(() => f * 1.5, dec(24))); break;
    case 'recap': V(e.t, 0.9, 0.34, bell(f, 3.6, 1.1), 0.4); V(e.t, 0.12, 0.2, sine(t => f * 0.5 * (1 + 3 * t), dec(30))); break;
    case 'retract': { let ph = 0; V(e.t, d, 0.18, (t) => { ph += (70 - 20 * t / d) / SR; ph -= Math.floor(ph); return (ph * 2 - 1) * swell(d)(t); }, 0.05); break; }
    case 'title': [['F', 4], ['A', 4], ['C', 5], ['E', 5], ['G', 5]].forEach(([n, o], i) => V(e.t + i * 0.03, d + 0.8, 0.12, bell(fq(n, o), 1.6, 0.9), 0.5)); break;
  }
}
// ---------------------------------------------------------------- effects
// plate-like Schroeder reverb (4 damped combs + 2 allpasses per side), run twice round the loop so the tail wraps
function reverb(inL, inR, outL, outR, wet) {
  const C = [1116, 1188, 1277, 1356].map(n => Math.round(n * SR / 44100)), A = [556, 441].map(n => Math.round(n * SR / 44100));
  [[inL, outL, 0], [inR, outR, 23]].forEach(([inp, out, sp]) => {
    const c0 = new Float32Array(C[0] + sp), c1 = new Float32Array(C[1] + sp), c2 = new Float32Array(C[2] + sp), c3 = new Float32Array(C[3] + sp);
    const a0 = new Float32Array(A[0] + sp), a1 = new Float32Array(A[1] + sp);
    let i0 = 0, i1 = 0, i2 = 0, i3 = 0, j0 = 0, j1 = 0, f0 = 0, f1 = 0, f2 = 0, f3 = 0;
    const fb = 0.86, dm = 0.32, dm1 = 1 - dm;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = inp[i] * 0.2; let o, y = 0;
      o = c0[i0]; f0 = o * dm1 + f0 * dm; c0[i0] = x + f0 * fb; if (++i0 >= c0.length) i0 = 0; y += o;
      o = c1[i1]; f1 = o * dm1 + f1 * dm; c1[i1] = x + f1 * fb; if (++i1 >= c1.length) i1 = 0; y += o;
      o = c2[i2]; f2 = o * dm1 + f2 * dm; c2[i2] = x + f2 * fb; if (++i2 >= c2.length) i2 = 0; y += o;
      o = c3[i3]; f3 = o * dm1 + f3 * dm; c3[i3] = x + f3 * fb; if (++i3 >= c3.length) i3 = 0; y += o;
      o = a0[j0]; a0[j0] = y + o * 0.5; y = o - y; if (++j0 >= a0.length) j0 = 0;
      o = a1[j1]; a1[j1] = y + o * 0.5; y = o - y; if (++j1 >= a1.length) j1 = 0;
      if (pass === 1) out[i] += y * wet;
    }
  });
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  SND_L = new Float32Array(NS); SND_R = new Float32Array(NS); ECH_L = new Float32Array(NS); ECH_R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    const inGate = t => GATES.some(([a, b]) => t >= a - 0.005 && t < b);
    const mus = musicEvents().filter(e => e.post || !inGate(e.t));
    // sidechain: the bed ducks under every kick (deeper in the drop)
    SCG = new Float32Array((NS >> 6) + 2).fill(1);
    for (const e of mus) if (e.k === 'kick') {
      const depth = (e.t >= bt(84) && e.t < barT(25) ? 0.55 : 0.4) * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
      for (let q = 0; q < n; q++) { const j = (j0 + q) % SCG.length, u = q * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j] *= 1 - depth * a; }
    }
    LEAD_PREV.laser = null;
    for (const e of mus) if (!e.post) playMusic(e, L, R);
    // the gates: the band stops dead on the hemoglobin cut, and for one beat before the drop (reverb tails ring on)
    for (const [a, b] of GATES) {
      const i0 = Math.round(a * SR), i1 = Math.round(b * SR), r = Math.round(0.008 * SR);
      for (let i = i0; i < i1; i++) { const g = i < i0 + r ? 1 - (i - i0) / r : i > i1 - r ? (i - (i1 - r)) / r : 0; L[i] *= g; R[i] *= g; ECH_L[i] *= g; ECH_R[i] *= g; }
    }
    for (const e of mus) if (e.post) playMusic(e, L, R);
    // the music dips a little under the big hits
    for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.5 * SR), att = Math.round(0.01 * SR);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k - att) / SR * 6), g = 1 - dk * a; L[i] *= g; R[i] *= g; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // dotted-eighth ping-pong delay on the leads (circular)
  { const D = Math.round(0.75 * BEAT * SR), fb = 0.38;
    for (let i = 0; i < NS; i++) { let el = 0, er = 0, w = 1; for (let k = 1; k <= 4; k++) { w *= fb; const j = (i - k * D + NS * 4) % NS; if (k % 2) { el += w * ECH_R[j]; er += w * ECH_L[j]; } else { el += w * ECH_L[j]; er += w * ECH_R[j]; } } L[i] += el; R[i] += er; SND_L[i] += el * 0.3; SND_R[i] += er * 0.3; } }
  ECH_L = null; ECH_R = null; SCG = null;
  reverb(SND_L, SND_R, L, R, 0.8);
  SND_L = null; SND_R = null;
  // master: DC blocking, a gentle top roll-off (~15 kHz) and soft saturation; circular, in place
  const a = Math.exp(-TAU * 15000 / SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9993 * (hp + y - x1); x1 = y;
      if (pass === 1) ch[i] = Math.tanh(hp * 1.15) / 1.15;
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
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.connect(LIVE.gain);
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt); }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
