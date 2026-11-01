'use strict';
// ============================================================================
// AUDIO — an original electronic score plus event-synced SFX, synthesised
// sample by sample in plain JS (no samples, no Web Audio graph).
// 120 BPM, 24 bars = 48.000 s, A major. The lead melody is a heartbeat drawn
// in pitch — P (a small step up), Q-R-S (down, a leap up, down past the start)
// and T (a rounded step) — and its R note on A is the monitor's own beep (A5,
// 880 Hz). The melody changes instrument with the story:
//   hook — a bright beep-lead · slowed heart and ion channels — a soft
//   marimba over a half-time groove · AV node — the melody plays only its P,
//   holds for the whole delay (ticking), then lands Q-R-S-T on the release ·
//   His–Purkinje — plucks and 16th arps, a build, one eighth of silence ·
//   QRS — the drop on the beep (22.0 s): saw lead and wide chords · the body
//   and the electrode — glass bells, half-time · the electronics — chip lead
//   and arps; the "×1000" lands on a downbeat; on "noise filtering" the whole
//   band is literally low-pass filtered and opened again · the end — everything
//   together, the recap climbs, and a riser runs straight back into bar 1
//   (seamless loop; every tail wraps).
// SFX are mixed forward: the band ducks under them, and they are tuned to the
// A-major pentatonic (A B C# E F#) so they sit inside the music. Every cue is a
// visible event (a beep on every R wave the picture shows, a bloop for each Na⁺
// ion through its channel, a falling blip for each K⁺, one pluck per cell in
// the gap-junction cascade, ticks for the AV-node hold, a hum that stops dead
// when the difference amplifier cancels it, a sample tick per ADC sample …).
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const PENT_OFF = [0, 2, 4, 7, 9];
const pent = (i, o) => mtof(nm('A', o) + PENT_OFF[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5));   // i-th step up the A pentatonic from A(o)
// ---------------------------------------------------------------- harmony and the heartbeat melody
const CHORDS = ['A', 'D', 'F#m', 'E', 'A', 'D', 'F#m', 'E', 'Bm', 'D', 'E', 'A',
  'E', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'E', 'A', 'F#m', 'Bm', 'D'];               // every bar with a monitor beep holds an A (or A as a 7th)
const CROOT = { A: 'A', D: 'D', 'F#m': 'F#', E: 'E', Bm: 'B' }, CMIN = { 'F#m': 1, Bm: 1 };
function rootM(ch, oct) { let r = nm(CROOT[ch], oct); return r; }
function triad(ch, oct) { const r = rootM(ch, oct); return [r, r + (CMIN[ch] ? 3 : 4), r + 7]; }
// P Q R S T: [16th step, interval above the root (kept between B3 and A4), length in 16ths]
function beatNotes(ch) { let r = rootM(ch, 4); if (r > 69) r -= 12; const q = CMIN[ch] ? 3 : 4; return { P: r + q, Q: r, R: r + 12, S: r - 5, T: r + 7, a: [r + 12, r + 7, r + q] }; }
const MELODY = [[0, 'P', 1], [2, 'Q', 1], [3, 'R', 1], [4, 'S', 1], [6, 'T', 2]], ANSWER = [[10, 0, 1], [12, 1, 2], [14, 2, 2]];
const GATES = [[2.9, 3.0], [21.75, 22.0]];                                   // the tape-stop into slow motion, the breath before the drop
// ---------------------------------------------------------------- score → events
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const mel = (b, k, v, o) => {
    o = o || {}; const N = beatNotes(ch(b)), lift = 12 * (o.lift || 0), t0 = barT(b) + (o.shift || 0) * BEAT;
    MELODY.forEach(([st, j, l], i) => { if (!o.only || o.only(i)) E({ t: t0 + st * S16, d: l * S16, k, m: N[j] + lift, v: v * (j === 'R' ? 1.1 : 1), cut: o.cut, post: o.post }); });
    if (o.answer) ANSWER.forEach(([st, j, l]) => E({ t: t0 + st * S16, d: l * S16, k, m: N.a[j] + lift, v: v * 0.8, cut: o.cut, post: o.post }));
  };
  const D = (b, beat, k, v, x) => E(Object.assign({ t: at(b, beat), d: 0.5, k, v }, x || {}));
  const kick4 = (b, v, from) => { for (let i = from || 0; i < 4; i++) D(b, i, 'kick', v); };
  const claps = (b, v) => { D(b, 1, 'clap', v); D(b, 3, 'clap', v); };
  const hats = (b, v, sixteenths, open, from) => { for (let i = 0; i < (sixteenths ? 16 : 8); i++) { const beat = i * (sixteenths ? 0.25 : 0.5); if (beat < (from || 0)) continue; const off = beat % 1 === 0.5; D(b, beat, 'hat', v * (off ? 1 : 0.6), { p: off ? 0.2 : -0.2, open: open && off }); } };
  const shaker = (b, v, from) => { for (let i = 0; i < 16; i++) { if (i / 4 < (from || 0)) continue; D(b, i / 4, 'shaker', v * (i % 2 ? 1 : 0.6), { p: 0.35 }); } };
  const roll = (b, from, to, step, v0, v1, k) => { for (let x = from; x < to - 1e-6; x += step) D(b, x, k || 'snare', lerp(v0, v1, (x - from) / (to - from))); };
  const root = (b, oct) => rootM(ch(b), oct), subR = b => { const r = rootM(ch(b), 1); return r < 28 ? r + 12 : r; };   // sub roots kept between E1 and D#2
  const bassOff = (b, v, from) => { for (let i = from || 0; i < 4; i++) E({ t: at(b, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(b, 2) + (i % 2 ? 12 : 0), v }); for (const beat of [0, 2]) if (beat >= (from || 0)) E({ t: at(b, beat), d: 1.8 * BEAT, k: 'sub', m: subR(b), v: v * 0.9 }); };
  const bassRoll = (b, v, from) => { for (let i = (from || 0) * 4; i < 16; i++) E({ t: at(b, i / 4), d: 0.2 * BEAT, k: 'roll', m: root(b, 2) + (i % 4 === 2 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.75) }); for (const beat of [0, 2]) if (beat >= (from || 0)) E({ t: at(b, beat), d: 1.6 * BEAT, k: 'sub', m: subR(b), v: v * 0.6 }); };
  const bassBounce = (b, v, from) => { [[0, 0, 0.7], [1.5, 7, 0.4], [2, 0, 0.7], [3.5, 12, 0.4]].forEach(([beat, iv, l]) => { if (beat >= (from || 0)) E({ t: at(b, beat), d: l * BEAT, k: 'bass', m: root(b, 2) + iv, v }); }); };
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 3.9 * BEAT, k: 'pad', ms: triad(ch(b), 3).concat([root(b, 4) + 7]), v, cut: cut || 1400 }, x || {}));
  const stabs = (b, v) => [0.5, 1.5, 2.75, 3.5].forEach(beat => E({ t: at(b, beat), d: 0.3 * BEAT, k: 'stab', ms: triad(ch(b), 4), v }));
  const arp = (b, k, v, oct, up, from) => { const tr = triad(ch(b), oct), seq = up ? [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6] : [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3]; for (let i = (from || 0) * 4; i < 16; i++) { const s_ = seq[i], m = tr[s_ % 3] + 12 * Math.floor(s_ / 3); E({ t: at(b, i / 4), d: 0.22 * BEAT, k, m, v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.3 : -0.3 }); } };
  const halfTime = (b, v, from) => { from = from || 0; if (from <= 0) D(b, 0, 'kick', 0.75 * v); if (from <= 2.5) D(b, 2.5, 'kick', 0.55 * v); if (from <= 2) D(b, 2, 'snap', 0.55 * v); shaker(b, 0.45 * v, from); };
  // ---- A: the hook (0–2.9 s) — the full groove from frame one, the beep-lead plays the heartbeat
  E({ t: 0, d: 1.6, k: 'crash', v: 0.7 });
  kick4(1, 0.95); claps(1, 0.6); hats(1, 0.55, true); bassOff(1, 0.8); pad(1, 0.45, 1500);
  mel(1, 'beepl', 0.85, { answer: true }); mel(1, 'glass', 0.22, { lift: 1 });
  D(2, 0, 'kick', 0.95); D(2, 1, 'kick', 0.9); D(2, 1, 'clap', 0.6); hats(2, 0.5, true); for (let i = 0; i < 2; i++) E({ t: at(2, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(2, 2) + (i % 2 ? 12 : 0), v: 0.8 });
  E({ t: at(2, 0), d: 1.8 * BEAT, k: 'sub', m: subR(2), v: 0.7 }); E({ t: at(2, 0), d: 1.8 * BEAT, k: 'pad', ms: triad('D', 3).concat([root(2, 4) + 7]), v: 0.45, cut: 1500 });
  mel(2, 'beepl', 0.85, { only: i => i < 4 });
  // ---- B: slow motion — the SA node and its ion channels (3–12 s): half-time, a soft marimba
  E({ t: 3.0, d: 2 * BEAT, k: 'pad', ms: triad('D', 3).concat([root(2, 4) + 7]), v: 0.4, cut: 900, post: true });
  halfTime(2, 0.8, 2.5); E({ t: at(2, 2), d: 1.8 * BEAT, k: 'sub', m: subR(2), v: 0.5, post: true });
  for (let b = 3; b <= 6; b++) { halfTime(b, b === 4 || b === 5 ? 0.75 : 0.9); pad(b, 0.38, 1000); bassBounce(b, 0.6); }
  mel(3, 'marimba', 0.85, { answer: true });                                        // bar 4: the Ca²⁺ zip and K⁺ blips carry the tune; bar 5: the cascade
  mel(6, 'marimba', 0.85, { answer: true }); mel(6, 'glass', 0.25, { lift: 1 });
  E({ t: at(6, 2), d: 2 * BEAT, k: 'riser', v: 0.35 });
  // ---- C: through the heart (12–21.75 s)
  // bar 7–8a: the AV node holds the signal — the melody plays its P and waits; only ticks and a pad move
  D(7, 0, 'kick', 0.7); D(7, 2, 'kick', 0.55); hats(7, 0.3); pad(7, 0.45, 800); E({ t: at(7, 0), d: 3.8 * BEAT, k: 'sub', m: subR(7), v: 0.5 });
  mel(7, 'pluck', 0.9, { only: i => i === 0 });
  pad(8, 0.45, 800, { d: 1.9 * BEAT }); E({ t: at(8, 0), d: 1.9 * BEAT, k: 'sub', m: subR(8), v: 0.45 }); hats(8, 0.3);
  // 15.0 s: released — Q R S T land, the band comes in
  { const N = beatNotes('E'); [['Q', 0, 1], ['R', 1, 1], ['S', 2, 1], ['T', 4, 2]].forEach(([j, st, l]) => E({ t: 15.0 + st * S16, d: l * S16, k: 'pluck', m: N[j], v: j === 'R' ? 1.0 : 0.9 })); }
  E({ t: 15.0, d: 1.4, k: 'crash', v: 0.5 }); kick4(8, 0.9, 2); D(8, 3, 'clap', 0.6); hats(8, 0.55, true, false, 2); bassOff(8, 0.75, 2); pad(8, 0.4, 1600, { t: 15.0, d: 1.9 * BEAT });
  for (const b of [9, 10]) { kick4(b, 0.92); claps(b, 0.6); hats(b, 0.55, true); bassRoll(b, 0.72); arp(b, 'sqarp', 0.42, 5, b === 10); pad(b, 0.35, 1400 + (b - 9) * 600); mel(b, 'pluck', 0.85, { answer: b === 9 }); }
  roll(10, 2, 4, 0.5, 0.15, 0.4);
  // bar 11: the build to the drop (the ventricular cell fires on 20.25 s), then one eighth of silence
  kick4(11, 0.95); D(11, 2.5, 'kick', 0.7); D(11, 3, 'kick', 0.8); D(11, 3.25, 'kick', 0.7); D(11, 3.5, 'kick', 0.8);
  bassRoll(11, 0.75); arp(11, 'sqarp', 0.45, 5, true); mel(11, 'pluck', 0.9, { lift: 1, only: i => i < 3 });
  roll(11, 0, 2, 0.25, 0.3, 0.55); roll(11, 2, 3.5, 0.125, 0.55, 0.95);
  E({ t: at(10, 0), d: 7.5 * BEAT, k: 'riser', v: 0.8 });
  // ---- the drop (22–26 s): the QRS beep — saw lead on the heartbeat melody, wide chords
  E({ t: 22.0, d: 2.5, k: 'impact', v: 0.85 }); E({ t: 22.0, d: 2.0, k: 'crash', v: 0.8 });
  for (const b of [12, 13]) {
    kick4(b, 1.0); if (b === 12) D(b, 3.75, 'kick', 0.6); claps(b, 0.75); hats(b, 0.55, false, true); shaker(b, 0.4);
    E({ t: at(b, 0), d: 3.9 * BEAT, k: 'sub', m: subR(b), v: 0.8 }); for (const beat of [0.5, 1.5, 2.5, 3.5]) E({ t: at(b, beat), d: 0.4 * BEAT, k: 'bass', m: root(b, 2) + 12, v: 0.6 });
    E({ t: at(b, 0), d: (b === 12 ? 3.8 : 1.8) * BEAT, k: 'supersaw', ms: triad(ch(b), 4).concat([root(b, 5)]), v: 0.7 });
  }
  mel(12, 'laser', 0.85, { cut: 5200, answer: true }); mel(12, 'pluck', 0.35, { lift: 1, answer: true });
  stabs(13, 0.35); E({ t: at(13, 3), d: 1.0 * BEAT * 2, k: 'down', v: 0.5 });          // bar 13: the K⁺ blips are the melody
  // ---- D: the body, the skin, the electrode (26–33.5 s): half-time, glass bells
  for (let b = 14; b <= 16; b++) { halfTime(b, 0.9); pad(b, 0.42, 1300); E({ t: at(b, 0), d: 3.8 * BEAT, k: 'sub', m: subR(b), v: 0.55 }); }
  mel(14, 'glass', 0.9, { only: i => true }); hats(16, 0.35); mel(16, 'glass', 0.85, { shift: 2, only: i => true });
  E({ t: at(15, 0), d: 3.6 * BEAT, k: 'pad', ms: triad('D', 4), v: 0.18, cut: 3000 });
  // bar 17: the raw electrode voltages hum on the board … until the subtraction cancels it (33.5 s) and the beat drops in
  for (let i = 0; i < 6; i++) E({ t: at(17, i * 0.5), d: 0.4 * BEAT, k: 'bass', m: root(17, 2) + (i % 2 ? 12 : 0), v: 0.55 });
  pad(17, 0.35, 900); D(17, 0, 'kick', 0.7); D(17, 2, 'snap', 0.5);
  kick4(17, 0.95, 3); D(17, 3.5, 'kick', 0.85); D(17, 3, 'clap', 0.6); hats(17, 0.55, true, false, 3); E({ t: at(17, 3), d: 1.0, k: 'crash', v: 0.45 });
  // ---- E: the electronics (34–42 s): chip lead and arps, driving
  kick4(18, 0.95); claps(18, 0.6); hats(18, 0.5); bassRoll(18, 0.75); pad(18, 0.35, 1600); mel(18, 'chip', 0.8);
  E({ t: at(18, 2), d: 2 * BEAT, k: 'riser', v: 0.6 }); roll(18, 3, 4, 0.125, 0.3, 0.8);
  E({ t: 36.0, d: 2.2, k: 'impact', v: 0.7 }); E({ t: 36.0, d: 1.8, k: 'crash', v: 0.75 });   // "× 1000"
  for (const b of [19, 20, 21]) {
    kick4(b, 1.0); claps(b, 0.7); hats(b, 0.6, true); shaker(b, 0.45); bassRoll(b, 0.85); stabs(b, 0.5);
    arp(b, 'chiparp', 0.55, 5, b === 21); mel(b, 'chip', 0.85, { lift: b === 21 ? 1 : 0, answer: true });
  }
  E({ t: 40.0, d: 1.4, k: 'crash', v: 0.5 });
  // ---- F: the monitor again, the recap, the title, and the run back into bar 1 (42–48 s)
  kick4(22, 0.95); claps(22, 0.6); hats(22, 0.5, true); bassOff(22, 0.8); pad(22, 0.45, 1800); mel(22, 'pluck', 0.85); mel(22, 'glass', 0.3, { lift: 1 });
  E({ t: 43.0, d: 1.6, k: 'crash', v: 0.55 });
  kick4(23, 0.95); claps(23, 0.55); hats(23, 0.5, true); bassOff(23, 0.8); pad(23, 0.5, 2000); E({ t: at(23, 0), d: 1.5, k: 'crash', v: 0.35 });
  kick4(24, 0.9); D(24, 1, 'clap', 0.5); bassOff(24, 0.75); pad(24, 0.5, 2200); mel(24, 'pluck', 0.8); mel(24, 'laser', 0.45, { lift: 1, cut: 5000 });
  roll(24, 2, 4, 0.125, 0.2, 0.8); E({ t: at(24, 1), d: 3 * BEAT, k: 'riser', v: 0.7 });
  return ev;
}
// ---------------------------------------------------------------- SFX map (every cue belongs to a visible event)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // the monitor beeps on every real-time R wave the picture shows (the loop point 48 s ≡ 0 s carries one)
  for (const r of rPeaks(-0.01, 3.0)) S(r, 'beep', 0.9);
  for (const r of rPeaks(42.99, DUR - 0.01)) S(r, 'beep', 0.9);
  S(22.0, 'beep', 1.0, { big: 1 });                                             // the slowed beat's QRS: the drop
  // A: hook
  S(1.0, 'swish', 0.55, { d: 0.55 }); [['A', 6], ['C#', 7], ['E', 7]].forEach(([n, o], i) => S(1.5 + i * 0.125, 'snap', 0.8, { f: fq(n, o), p: [-0.4, 0.4, 0.3][i] }));
  S(2.05, 'dive', 0.55, { d: 0.55 }); S(2.6, 'dive', 0.5, { d: 0.4 }); S(2.75, 'tapestop', 0.6, { d: 0.25 });
  S(3.0, 'arrive', 0.7); S(3.0, 'slowmo', 0.5, { d: 0.7 });
  // B: the SA node, one pacemaker cell, gap junctions, the atria
  S(3.5, 'pop', 0.7, { f: fq('E', 6) }); S(3.6, 'swell', 0.35, { d: 1.3 }); S(4.95, 'dive', 0.5, { d: 0.45 });
  S(5.0, 'gate', 0.6, { f: fq('A', 3), p: -0.3 });
  for (let i = 0; i < 6; i++) S(5.25 + i * 0.25, 'bloop', 0.75, { f: pent(i, 4), p: -0.25 });               // each Na⁺ through the funny channel; Vm creeps up
  S(6.4, 'gate', 0.6, { f: fq('E', 3) }); S(6.5, 'zip', 0.85, { d: 0.17 });                                // Ca²⁺ upstroke
  S(6.9, 'gate', 0.6, { f: fq('B', 3), p: 0.3 });
  for (let i = 0; i < 6; i++) S(7.0 + i * 0.125, 'blip', 0.7, { f: pent(10 - i, 4), p: 0.3 });             // each K⁺ leaving; Vm falls back
  S(7.8, 'undive', 0.45, { d: 0.45 });
  for (let i = 0; i < 7; i++) S(8.0 + i * 0.25, 'cell', 0.8, { f: pent(5 + i, 4), p: -0.6 + i * 0.2 });   // one pluck per cell as the activation hops along
  S(9.55, 'undive', 0.5, { d: 0.45 }); S(10.0, 'bloom', 0.55, { d: 1.6 });
  // C: the AV hold, His, the branches, Purkinje, one ventricular cell
  S(12.0, 'swish', 0.5, { d: 0.6 }); S(12.5, 'pop', 0.65, { f: fq('C#', 6) });
  for (let i = 0; i < 10; i++) S(12.5 + i * 0.25, 'tick', 0.32 + 0.03 * i, { f: i % 2 ? fq('E', 6) : fq('A', 6), p: i % 2 ? 0.25 : -0.25 });
  S(15.0, 'release', 0.85); S(15.25, 'pop', 0.55, { f: fq('E', 6) });
  S(16.25, 'branch', 0.8);
  for (let i = 0; i < 10; i++) S(17.75 + i * 0.125, 'spark', 0.55, { f: pent(8 + i, 4), p: (i % 2 ? 1 : -1) * (0.2 + 0.07 * i) });
  S(19.55, 'dive', 0.5, { d: 0.4 }); S(20.17, 'gate', 0.5, { f: fq('A', 3) }); S(20.25, 'zap', 1.0);
  for (let i = 0; i < 4; i++) S(20.5 + i * 0.25, 'bloop', 0.55, { f: fq('E', 5), ca: 1, p: 0.15 });           // Ca²⁺ trickling in: the plateau
  S(21.35, 'undive', 0.45, { d: 0.4 }); S(21.5, 'inhale', 0.5, { d: 0.25 });
  S(24.2, 'dive', 0.45, { d: 0.4 }); S(24.25, 'gate', 0.5, { f: fq('B', 3) });
  for (let i = 0; i < 8; i++) S(24.5 + i * 0.125, 'blip', 0.7, { f: pent(10 - i, 4), p: 0.3 - i * 0.08 });  // K⁺ out: the T wave
  S(25.45, 'undive', 0.45, { d: 0.4 });
  // D: the voltage map, one electrode
  S(26.0, 'undive', 0.55, { d: 0.6 }); S(27.0, 'ripple', 0.75, { d: 1.3 }); S(27.25, 'neg', 0.75); S(27.5, 'pos', 0.75); S(28.0, 'measure', 0.7);
  S(29.0, 'snap', 0.7, { f: fq('A', 6), p: 0.3 }); S(29.1, 'dive', 0.55, { d: 0.6 }); S(30.0, 'squish', 0.65);
  [['A', 5], ['C#', 6], ['E', 6], ['A', 6]].forEach(([n, o], i) => S(30.25 + i * 0.25, 'pop', 0.6, { f: fq(n, o), p: i % 2 ? 0.25 : -0.25 }));
  S(31.6, 'swish', 0.5, { d: 0.6 });
  // D–E: the board — hum, cancellation, gain, filtering, sampling
  S(32.25, 'hum', 0.55, { d: 1.25 }); S(33.0, 'pop', 0.6, { f: fq('E', 6), p: 0.2 }); S(33.25, 'pop', 0.6, { f: fq('A', 5), p: -0.2 }); S(33.5, 'cancel', 0.9);
  S(34.8, 'swish', 0.45, { d: 0.5 }); S(35.0, 'boost', 0.75, { d: 1.0 }); S(36.0, 'hit', 1.0);
  S(38.0, 'fsweep', 0.6, { d: 1.6 }); [38.5, 38.75, 39.0].forEach((tt, i) => S(tt, 'crackle', 0.6, { f: pent(3 + i, 5), p: [-0.3, 0.3, 0] [i] }));
  S(40.0, 'digital', 0.75, { d: 0.3 }); S(40.3, 'adc', 0.45, { d: 2.6 });
  for (let k = 0; k < 5; k++) S(40.5 + k * 0.5, 'packet', 0.6, { f: pent(5 + [0, 2, 4, 3, 5][k], 4), p: -0.3 + 0.15 * k });
  // F: the monitor, the recap, the title
  S(42.8, 'undive', 0.5, { d: 0.45 }); S(43.5, 'pop', 0.55, { f: fq('E', 6) });
  [['A', 6], ['C#', 7], ['E', 7]].forEach(([n, o], i) => S(44.25 + i * 0.07, 'tick', 0.5, { f: fq(n, o) }));
  [['A', 5], ['C#', 6], ['E', 6], ['F#', 6], ['A', 6]].forEach(([n, o], i) => S(45.0 + i * 0.25, 'level', i === 4 ? 1.0 : 0.75, { f: fq(n, o), last: i === 4 }));
  S(46.9, 'title', 0.75, { d: 1.0 });
  return ev;
}
// how far the band dips under each SFX (the SFX are the stars)
const DUCK = { beep: 0.35, zap: 0.45, hit: 0.4, cancel: 0.35, level: 0.3, release: 0.35, bloop: 0.18, blip: 0.16, cell: 0.22, ripple: 0.3, title: 0.3, snap: 0.15, pop: 0.14, spark: 0.14, zip: 0.3, branch: 0.25, packet: 0.14, crackle: 0.12, neg: 0.2, pos: 0.2, measure: 0.2, arrive: 0.25, digital: 0.2, tick: 0.06 };
// ---------------------------------------------------------------- synthesis helpers
let SND_L = null, SND_R = null, ECH_L = null, ECH_R = null, SCG = null;    // reverb send, delay send, sidechain gain (one value per 64 samples)
const nz = i => hash(i) * 2 - 1;
// write one voice into (L, R); wraps at 48 s; o: { send (reverb), echo (delay), duck (sidechain) }
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
function beepLeadFn(f, d) { let p = 0; return t => { p += f / SR; p -= Math.floor(p); return (fsin(TAU * p) + 0.22 * fsin(3 * TAU * p) + 0.1 * fsin(2 * TAU * p)) * (t < 0.003 ? t / 0.003 : 1) * (0.55 + 0.45 * Math.exp(-t * 9)) * rel(t, d, 0.04); }; }
function pluckFn(f, d) { let p1 = 0, p2 = 0; const F = lpf(), a = f * 1.0035 / SR, b = f * 0.9965 / SR; return t => { p1 += a; if (p1 >= 1) p1 -= 1; p2 += b; if (p2 >= 1) p2 -= 1; const x = (2 * p1 - 1 - blep(p1, a)) + (2 * p2 - 1 - blep(p2, b)); return F(x * 0.5, 380 + 5200 * Math.exp(-t * 15), 0.45) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t * 4) * rel(t, d, 0.08); }; }
function marimbaFn(f) { let p = 0, q = 0; return t => { p += f / SR; q += f * 3.98 / SR; p -= Math.floor(p); q -= Math.floor(q); return (fsin(TAU * p) + 0.35 * fsin(TAU * q) * Math.exp(-t * 30)) * Math.exp(-t * 7) * (t < 0.002 ? t / 0.002 : 1); }; }
function squareFn(f, d) { let p = 0; const F = lpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt); return F(v, 2800, 0.6) * (t < 0.004 ? t / 0.004 : 1) * (0.5 + 0.5 * Math.exp(-t * 7)) * rel(t, d, 0.05); }; }
function glassFn(f) { let pc = 0, pm = 0; return t => { pc += f / SR; pm += f * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + 1.2 * Math.exp(-t * 5) * fsin(TAU * pm)) * Math.exp(-t * 2.4) * (t < 0.004 ? t / 0.004 : 1); }; }
function laserFn(f, d, f0, cut) {
  const p = [0, 0, 0], det = [1, 1.006, 0.994], F = lpf();
  return t => {
    const g = f0 ? f0 * Math.pow(f / f0, Math.min(1, t / 0.04)) : f, vib = t > 0.16 ? 1 + 0.01 * fsin(TAU * 5.6 * t) : 1; let x = 0;
    for (let j = 0; j < 3; j++) { const dt = g * vib * det[j] / SR; p[j] += dt; if (p[j] >= 1) p[j] -= 1; x += 2 * p[j] - 1 - blep(p[j], dt); }
    return F(x / 3, cut * (0.65 + 0.35 * Math.exp(-t * 6)), 0.5) * (t < 0.006 ? t / 0.006 : 1) * rel(t, d, 0.07);
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
function kickFn(seed) { let p = 0, q = 0; return (t, k) => { p += (60 + 120 * Math.exp(-t * 38)) / SR; q += 1600 / SR; return fsin(TAU * p) * Math.exp(-t * 11) * (t < 0.0015 ? t / 0.0015 : 1) + fsin(TAU * q) * 0.18 * Math.exp(-t * 110) + (t < 0.003 ? nz(k * 7 + seed) * 0.3 * (1 - t / 0.003) : 0); }; }
function clapFn(seed) { const F = bpf(); return (t, k) => { let e = Math.exp(-t * 20) * 0.5; for (const o of [0, 0.009, 0.019]) if (t >= o) e += Math.exp(-(t - o) * 280) * 0.8; return F(nz(k * 3 + seed), 1400, 0.8) * e * 1.6; }; }
function snapFn(seed) { const F = bpf(); let p = 0; return (t, k) => { p += 900 / SR; return F(nz(k * 3 + seed), 2600, 0.6) * Math.exp(-t * 60) * 1.4 + fsin(TAU * p) * Math.exp(-t * 90) * 0.35; }; }
function snareFn(seed) { const F = bpf(); let p = 0; return (t, k) => { p += 190 / SR; return F(nz(k * 5 + seed), 2300, 0.9) * Math.exp(-t * 20) * 1.5 + fsin(TAU * p) * Math.exp(-t * 32) * 0.45; }; }
function hatFn(seed, open) { let lp = 0; return (t, k) => { const x = nz(k * 11 + seed); lp += 0.55 * (x - lp); return (x - lp) * Math.exp(-t * (open ? 11 : 65)); }; }
function shakerFn(seed) { const F = bpf(); return (t, k) => F(nz(k * 13 + seed), 6200, 1.0) * (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) * 32)) * 1.4; }
function crashFn(seed) { let lp = 0; return (t, k) => { const x = nz(k * 17 + seed); lp += 0.4 * (x - lp); return (x - lp) * Math.exp(-t * 2.0) * (t < 0.002 ? t / 0.002 : 1); }; }
function riserFn(d, seed) { const F = bpf(); let p = 0; return (t, k) => { const u = clamp(t / d, 0, 1); p += 110 * Math.pow(4, u) / SR; p -= Math.floor(p); return (F(nz(k * 19 + seed), 300 * Math.pow(22, u), 0.7) + (2 * p - 1) * 0.12) * u * u; }; }
function downFn(d, seed) { const F = bpf(); return (t, k) => { const u = clamp(t / d, 0, 1); return F(nz(k * 23 + seed), 6000 * Math.pow(0.05, u), 0.7) * (1 - u) * (1 - u); }; }
function impactFn(seed) { let p = 0; return (t, k) => { p += (32 + 52 * Math.exp(-t * 6)) / SR; return fsin(TAU * p) * Math.exp(-t * 2.6) + (t < 0.05 ? nz(k * 29 + seed) * 0.3 * (1 - t / 0.05) : 0); }; }
// one music event
const LEAD_PREV = {};
function playMusic(e, L, R) {
  const k = e.k, sd = Math.round(e.t * 1000), v = e.v;
  switch (k) {
    case 'beepl': voice(L, R, e.t, e.d + 0.1, 0.05, 0.2 * v, beepLeadFn(mtof(e.m), e.d), { send: 0.15, echo: 0.25 }); break;
    case 'pluck': voice(L, R, e.t, e.d + 0.5, -0.1, 0.3 * v, pluckFn(mtof(e.m), e.d), { send: 0.18, echo: 0.22 }); break;
    case 'marimba': voice(L, R, e.t, 0.8, 0.1, 0.36 * v, marimbaFn(mtof(e.m)), { send: 0.2, echo: 0.2 }); break;
    case 'glass': voice(L, R, e.t, 1.6, 0.15, 0.24 * v, glassFn(mtof(e.m)), { send: 0.4, echo: 0.2 }); break;
    case 'laser': { const f = mtof(e.m), pf = LEAD_PREV.laser && e.t - LEAD_PREV.laser.t < 0.3 ? LEAD_PREV.laser.f : 0; LEAD_PREV.laser = { t: e.t + e.d, f }; voice(L, R, e.t, e.d + 0.1, -0.05, 0.22 * v, laserFn(f, e.d, pf, e.cut || 3000), { send: 0.2, echo: 0.28 }); break; }
    case 'chip': voice(L, R, e.t, e.d + 0.05, 0.1, 0.14 * v, chipFn(mtof(e.m), e.d), { send: 0.12, echo: 0.25 }); break;
    case 'sqarp': voice(L, R, e.t, e.d + 0.06, e.p || 0, 0.09 * v, squareFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'chiparp': voice(L, R, e.t, e.d + 0.04, e.p || 0, 0.09 * v, chipFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.6, 0, 0.26 * v, chordFn(e.ms, e.d, e.cut || 1400, 0.25), { send: 0.4, duck: 1 }); break;
    case 'stab': voice(L, R, e.t, e.d + 0.1, 0.1, 0.26 * v, chordFn(e.ms, e.d, 4200, 0.003, 14), { send: 0.15, duck: 1 }); break;
    case 'supersaw': voice(L, R, e.t, e.d + 0.6, 0, 0.3 * v, chordFn(e.ms, e.d, 2600, 0.02), { send: 0.3, duck: 1 }); break;
    case 'bass': case 'roll': case 'sub': voice(L, R, e.t, e.d + 0.05, 0, (k === 'sub' ? 0.115 : 0.19) * v, bassFn(mtof(e.m), e.d, k), { duck: k !== 'sub' }); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.52 * v, kickFn(sd)); break;
    case 'clap': voice(L, R, e.t, 0.35, 0.05, 0.34 * v, clapFn(sd), { send: 0.22 }); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.3 * v, snapFn(sd), { send: 0.25 }); break;
    case 'snare': voice(L, R, e.t, 0.3, -0.05, 0.24 * v, snareFn(sd), { send: 0.18 }); break;
    case 'hat': voice(L, R, e.t, e.open ? 0.3 : 0.08, e.p || 0, 0.19 * v, hatFn(sd, e.open)); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.1 * v, shakerFn(sd)); break;
    case 'crash': voice(L, R, e.t, e.d, 0, 0.14 * v, crashFn(sd), { send: 0.25 }); break;
    case 'riser': voice(L, R, e.t, e.d, 0, 0.18 * v, riserFn(e.d, sd), { send: 0.3 }); break;
    case 'down': voice(L, R, e.t, e.d, 0, 0.18 * v, downFn(e.d, sd), { send: 0.4 }); break;
    case 'impact': voice(L, R, e.t, e.d, 0, 0.55 * v, impactFn(sd), { send: 0.2 }); break;
  }
}
// ---------------------------------------------------------------- SFX: crisp, rounded, tuned to the A pentatonic
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.25, f = e.f || 440, p = e.p || 0, d = e.d || 0.2;
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.2 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.002 ? t / 0.002 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  switch (k) {
    // the monitor's QRS beep: a clean A5 tone (a bigger, wider one on the drop)
    case 'beep': {
      const len = e.big ? 0.2 : 0.11, env = t => (t < 0.004 ? t / 0.004 : 1) * (t > len ? Math.max(0, 1 - (t - len) / 0.03) : 1);
      let ph = 0; V(e.t, len + 0.04, 0.34, t => { ph += 880 / SR; ph -= Math.floor(ph); return (fsin(TAU * ph) + 0.12 * fsin(3 * TAU * ph)) * env(t); }, 0.18);
      if (e.big) { V(e.t, 0.6, 0.16, bell(1760, 6, 0.6), 0.4, -0.4); V(e.t, 0.6, 0.16, bell(1318.5, 6, 0.6), 0.4, 0.4); }
      break;
    }
    case 'snap': V(e.t, 0.03, 0.5, noiseLP(() => 7000, dec(260), 3)); V(e.t, 0.14, 0.42, sine(t => f * (1 + 0.25 * Math.exp(-t * 80)), dec(32)), 0.25); break;
    case 'pop': V(e.t, 0.16, 0.45, sine(t => f * (1.5 - 0.5 * Math.min(1, t * 40)), att(0.002, 26)), 0.25); V(e.t, 0.012, 0.15, noiseLP(() => 5000, dec(400), 5)); break;
    case 'tick': V(e.t, 0.08, 0.36, sine(() => f, dec(60)), 0.15); break;
    case 'gate': V(e.t, 0.05, 0.35, noiseLP(() => 2500, dec(120), 7)); V(e.t, 0.12, 0.35, sine(t => f * (1 + 0.6 * Math.exp(-t * 60)), dec(38)), 0.1); break;
    case 'bloop': { // an ion through its channel: a rounded upward glide (Ca²⁺ a little rounder)
      const up = e.ca ? 0.25 : 0.45; V(e.t, 0.22, 0.42, sine(t => f * (1 - up + up * Math.min(1, t / 0.05)), att(0.004, e.ca ? 12 : 16)), 0.3); break;
    }
    case 'blip': V(e.t, 0.14, 0.38, sine(t => f * (1 + 0.35 * Math.exp(-t * 45)), att(0.002, 22)), 0.3); break;
    case 'zip': { // the pacemaker's Ca²⁺ upstroke: a fast rising zip with a sparkle on top
      let ph = 0; V(e.t, d + 0.08, 0.32, t => { const u = clamp(t / d, 0, 1); ph += (220 * Math.pow(8, u)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * 0.5 * (t < d ? 0.4 + 0.6 * u : Math.max(0, 1 - (t - d) / 0.08)); }, 0.2);
      V(e.t + d, 0.5, 0.2, bell(fq('A', 6), 6, 0.9), 0.4); break;
    }
    case 'zap': { // the ventricular cell's fast Na⁺ upstroke: a snappy laser-zap, a thump, and a bright ring
      let ph = 0; V(e.t, 0.16, 0.42, t => { ph += (180 * Math.pow(14, Math.min(1, t / 0.1))) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * 0.55 * (t < 0.1 ? 1 : Math.max(0, 1 - (t - 0.1) / 0.06)); }, 0.2);
      V(e.t, 0.25, 0.5, sine(t => 60 + 90 * Math.exp(-t * 30), dec(14)), 0.05); V(e.t, 0.04, 0.3, noiseLP(() => 6000, dec(120), 9));
      V(e.t + 0.1, 0.8, 0.24, bell(fq('E', 6), 4.5, 1.0), 0.45, -0.3); V(e.t + 0.1, 0.8, 0.2, bell(fq('A', 6), 4.5, 1.0), 0.45, 0.3); break;
    }
    case 'cell': V(e.t, 0.5, 0.36, bell(f, 7, 1.1), 0.35); V(e.t, 0.08, 0.2, sine(t => f * 0.5 * (1 + 2 * Math.exp(-t * 50)), dec(40))); break;
    case 'bloom': [['A', 4], ['C#', 5], ['E', 5], ['A', 5]].forEach(([n, o], i) => V(e.t + i * 0.06, d, 0.12, sine(() => fq(n, o), t => Math.sin(Math.PI * clamp(t / d, 0, 1)) * (1 - 0.3 * t / d)), 0.6, -0.3 + 0.2 * i)); break;
    case 'release': // the AV node lets go: a whoosh down the bundle and a two-note chime
      V(e.t, 0.35, 0.3, noiseLP(t => 7000 * Math.pow(0.08, t / 0.35), swell(0.35), 11), 0.3);
      V(e.t, 0.6, 0.3, bell(fq('E', 6), 5, 1.0), 0.4, -0.2); V(e.t + 0.125, 0.8, 0.3, bell(fq('B', 5), 4, 1.0), 0.4, 0.2); break;
    case 'branch': V(e.t, 0.7, 0.3, bell(fq('C#', 6), 5, 0.9), 0.4, -0.7); V(e.t + 0.06, 0.7, 0.3, bell(fq('E', 6), 5, 0.9), 0.4, 0.7); V(e.t, 0.25, 0.2, noiseLP(t => 3000 + 3000 * t, swell(0.25), 13), 0.3, 0); break;
    case 'spark': V(e.t, 0.3, 0.28, bell(f, 10, 0.7), 0.4); break;
    case 'inhale': V(e.t, d, 0.3, noiseLP(t => 800 + 7000 * (t / d) ** 2, t => (t / d) ** 2, 15), 0.2); break;
    case 'ripple': // the voltage pattern blooming across the chest: a chorus of bells over a soft swell
      for (let i = 0; i < 6; i++) V(e.t + i * 0.05, 1.2, 0.12, bell(pent(i * 2, 5), 3.5, 0.7), 0.6, -0.6 + 0.24 * i);
      V(e.t, d, 0.18, noiseLP(() => 900, swell(d), 17), 0.4, 0); break;
    case 'neg': V(e.t, 0.5, 0.42, sine(t => fq('A', 3) * (1 - 0.06 * t), att(0.006, 6)), 0.3, -0.3); V(e.t, 0.5, 0.15, sine(() => fq('E', 4), att(0.006, 8)), 0.3, -0.3); break;
    case 'pos': V(e.t, 0.6, 0.3, bell(fq('A', 5), 4, 1.0), 0.35, 0.3); V(e.t, 0.6, 0.2, bell(fq('E', 6), 5, 0.8), 0.35, 0.3); break;
    case 'measure': V(e.t, 0.12, 0.3, sine(() => fq('A', 5), dec(30)), 0.25, -0.3); V(e.t + 0.08, 0.4, 0.34, sine(() => fq('E', 6), dec(9)), 0.35, 0.3); break;
    case 'squish': V(e.t, 0.3, 0.3, noiseLP(t => 600 + 900 * Math.exp(-t * 10), att(0.01, 10), 19), 0.2); V(e.t, 0.3, 0.3, sine(t => 120 + 60 * Math.exp(-t * 20), dec(14)), 0.1); break;
    case 'hum': { // the shared mains hum on both electrodes (buzzy A, a little unsteady)
      const h = fq('A', 2); V(e.t, d, 0.3, (t) => { const a = Math.min(1, t / 0.15) * (0.85 + 0.15 * fsin(TAU * 3.1 * t)); return a * (fsin(TAU * h * t) * 0.5 + fsin(TAU * 2 * h * t) * 0.35 + fsin(TAU * 3 * h * t) * 0.3 + fsin(TAU * 5 * h * t) * 0.18); }, 0.05); break;
    }
    case 'cancel': // the subtraction: the hum is gone — a clean, satisfying chord
      V(e.t, 0.03, 0.3, noiseLP(() => 4000, dec(200), 21));
      [['A', 5], ['C#', 6], ['E', 6], ['A', 6]].forEach(([n, o], i) => V(e.t + i * 0.025, 1.2, 0.17, bell(fq(n, o), 3.2, 0.8), 0.5, -0.45 + 0.3 * i)); break;
    case 'boost': { let ph = 0; V(e.t, d, 0.26, t => { const u = clamp(t / d, 0, 1); ph += (110 * Math.pow(8, u)) / SR; ph -= Math.floor(ph); return (fsin(TAU * ph) + 0.3 * (2 * ph - 1)) * u * u * (t > d - 0.02 ? (d - t) / 0.02 : 1); }, 0.2); break; }
    case 'hit': // "× 1000": a punchy thump and a wide chord
      V(e.t, 0.5, 0.55, sine(t => 48 + 60 * Math.exp(-t * 18), dec(7)), 0.05);
      [['A', 5], ['E', 6], ['A', 6], ['C#', 7]].forEach(([n, o], i) => V(e.t + i * 0.015, 1.4, 0.13, bell(fq(n, o), 2.6, 1.2), 0.55, -0.5 + 0.33 * i)); break;
    case 'fsweep': V(e.t, d, 0.24, noiseLP(t => 9000 * Math.pow(0.04, Math.min(1, t / (d * 0.45))) * (t > d * 0.6 ? Math.pow(25, (t - d * 0.6) / (d * 0.4)) : 1), swell(d), 23), 0.35); break;
    case 'crackle': for (let i = 0; i < 3; i++) V(e.t + i * 0.025, 0.02, 0.25, noiseLP(() => 6000, dec(300), 25 + i)); V(e.t, 0.14, 0.32, sine(t => f * (1 + 0.5 * Math.exp(-t * 60)), dec(30)), 0.2); break;
    case 'digital': for (let i = 0; i < 6; i++) V(e.t + i * 0.04, 0.05, 0.28, (() => { let ph = 0; const ff = pent(5 + i * 2, 4); return t => { ph += ff / SR; ph -= Math.floor(ph); return (ph < 0.25 ? 1 : -1) * Math.exp(-t * 50) * 0.5; }; })(), 0.15, -0.4 + 0.16 * i); break;
    case 'adc': { // one tiny click per sample (2 per 16th note), alternating sides
      const n = Math.round(d / 0.0625); for (let i = 0; i < n; i++) V(e.t + i * 0.0625, 0.012, 0.16 * (i % 2 ? 0.8 : 1), noiseLP(() => 9000, dec(500), 27 + i), 0.05, i % 2 ? 0.45 : -0.45); break;
    }
    case 'packet': for (let i = 0; i < 2; i++) V(e.t + i * 0.06, 0.07, 0.38, (() => { let ph = 0; const ff = f * (i ? 1.5 : 1); return t => { ph += ff / SR; ph -= Math.floor(ph); return (ph < 0.5 ? 1 : -1) * Math.exp(-t * 35) * 0.45; }; })(), 0.2); break;
    case 'level': V(e.t, 0.9, e.last ? 0.42 : 0.32, bell(f, 3.4, 1.1), 0.4); V(e.t, 0.12, 0.2, sine(t => f * 0.5 * (1 + 3 * t), dec(30))); if (e.last) V(e.t, 1.0, 0.18, bell(f * 1.5, 3, 0.8), 0.5, 0.3); break;
    case 'title': [['A', 4], ['C#', 5], ['E', 5], ['A', 5], ['C#', 6]].forEach(([n, o], i) => V(e.t + i * 0.035, d + 0.8, 0.13, bell(fq(n, o), 1.6, 0.9), 0.5, -0.4 + 0.2 * i)); break;
    case 'arrive': V(e.t, 0.6, 0.45, sine(t => 52 + 30 * Math.exp(-t * 12), dec(5)), 0.15); V(e.t, 0.6, 0.12, bell(fq('A', 5), 4, 0.6), 0.5); break;
    case 'slowmo': V(e.t, d, 0.2, noiseLP(t => 5000 * Math.pow(0.08, t / d), swell(d), 29), 0.4); break;
    case 'tapestop': { let ph = 0; V(e.t, d, 0.22, t => { const u = clamp(t / d, 0, 1); ph += (220 * (1 - u * 0.92)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * 0.5 * (1 - u); }, 0.1); break; }
    case 'swell': V(e.t, d, 0.1, sine(t => fq('E', 5) * (1 + 0.02 * t), swell(d)), 0.5); V(e.t, d, 0.08, sine(() => fq('A', 5), swell(d)), 0.5); break;
    case 'dive': V(e.t, d, 0.26, noiseLP(t => 600 + 7000 * (t / d) ** 2, swell(d), 31), 0.25); V(e.t, d, 0.1, sine(t => 300 + 700 * t / d, swell(d))); break;
    case 'undive': V(e.t, d, 0.24, noiseLP(t => 6000 - 5200 * t / d, swell(d), 33), 0.25); break;
    case 'swish': V(e.t, d, 0.2, noiseLP(t => 1500 + 3000 * Math.sin(Math.PI * t / d), swell(d), 35), 0.3); break;
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
// "noise filtering": the whole band is low-pass filtered (38.0–38.6 s down to ~450 Hz) and opened again by 39.75 s
const FILT = { a: 38.0, b: 38.6, c: 39.0, d: 39.75, lo: 450 };
function bandFilter(L, R) {
  const i0 = Math.round((FILT.a - 0.05) * SR), i1 = Math.round((FILT.d + 0.05) * SR);
  for (const ch of [L, R]) {
    const F = lpf();
    for (let i = i0; i < i1; i++) {
      const t = i / SR, u = t < FILT.b ? seg(t, FILT.a, FILT.b) : t < FILT.c ? 1 : 1 - seg(t, FILT.c, FILT.d);
      const fc = 16000 * Math.pow(FILT.lo / 16000, smooth(u)), y = F(ch[i], fc, 0.55);
      const w = t < FILT.a ? 0 : t > FILT.d ? 0 : 1;
      ch[i] = w ? y : ch[i];
    }
  }
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
    // sidechain: the bed ducks under every kick
    SCG = new Float32Array((NS >> 6) + 2).fill(1);
    for (const e of mus) if (e.k === 'kick') {
      const depth = (e.t >= 22.0 && e.t < 26.0 ? 0.55 : 0.4) * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
      for (let q = 0; q < n; q++) { const j = (j0 + q) % SCG.length, u = q * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j] *= 1 - depth * a; }
    }
    LEAD_PREV.laser = null;
    for (const e of mus) if (!e.post) playMusic(e, L, R);
    // the gates: the band stops for the tape-stop into slow motion, and for the eighth before the drop (reverb tails ring on)
    for (const [a, b] of GATES) {
      const i0 = Math.round(a * SR), i1 = Math.round(b * SR), r = Math.round(0.008 * SR);
      for (let i = i0; i < i1; i++) { const g = i < i0 + r ? 1 - (i - i0) / r : i > i1 - r ? (i - (i1 - r)) / r : 0; L[i] *= g; R[i] *= g; ECH_L[i] *= g; ECH_R[i] *= g; }
    }
    for (const e of mus) if (e.post) playMusic(e, L, R);
    bandFilter(L, R);
    // the band dips under the SFX
    for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.45 * SR), att = Math.round(0.006 * SR);
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k - att) / SR * 7), g = 1 - dk * a; L[i] *= g; R[i] *= g; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // dotted-eighth ping-pong delay on the leads (circular)
  { const D = Math.round(0.75 * BEAT * SR), fb = 0.36;
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
