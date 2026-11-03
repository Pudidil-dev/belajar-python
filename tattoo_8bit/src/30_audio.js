'use strict';
// ============================================================================
// AUDIO — an original electronic science score plus SFX locked to the picture,
// synthesised sample by sample in plain JS (no samples, no Web Audio graph).
// 120 BPM, 24 bars = 48.000 s, D major. One five-note motif climbs the
// D-major pentatonic in leaps (D–F#–B–E–A, every second note, on dotted
// eighths). It changes instrument with the story and gets lighter as the
// tattoo fades: bright lead in the hook · glass bell for the time jumps ·
// marimba in the dermis · a saw lead on the first climax (the fragmentation,
// 14.0 s) · warm plucks on the second (the phagocytosis click, 24.0 s) · the
// band low-passed inside the cell · liquid arpeggios down the lymphatic
// vessel · chip pulses climbing an octave through the treatment course · bells
// on the final result (44.0 s) · a riser back into bar 1 (seamless loop).
// SFX: every cue is read from the same event table (EV, 03_clock.js) that
// draws the picture, so each sound starts on the frame its event is drawn
// (all event times sit on the eighth-note grid = 15 frames). Each physical
// event has its own sound: the laser's sharp snap, the frosting's fizz, a tick
// per absorbed photon rising with the energy under a low rumble, a tight
// pressure pulse, bubble pops, four cracks, the shatter, membrane stretches,
// the closure gloop and its uptake click, lysosome plops, the lymph flow, the
// diminishing tones of clearance, ascending time-lapse ticks and a clean
// completion tone. The band ducks under them. Microscopic processes are not
// audible in reality: this is educational sound design.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const PENT_OFF = [0, 2, 4, 7, 9];
const pent = (i, o) => mtof(nm('D', o) + PENT_OFF[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5));   // i-th step up the D pentatonic from D(o)
// ---------------------------------------------------------------- harmony and the motif
const CHORDS = ['D', 'A', 'Bm', 'G', 'Bm', 'G', 'A', 'D', 'A', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A'];
const CROOT = { D: 'D', A: 'A', Bm: 'B', G: 'G' }, CMIN = { Bm: 1 };
function rootM(ch, oct) { return nm(CROOT[ch], oct); }
function triad(ch, oct) { const r = rootM(ch, oct); return [r, r + (CMIN[ch] ? 3 : 4), r + 7]; }
const MOTIF_NOTES = [nm('D', 4), nm('F#', 4), nm('B', 4), nm('E', 5), nm('A', 5)];  // every second note of the pentatonic, rising
const MOTIF_RH = [[0, 2], [3, 2], [6, 2], [9, 2], [12, 4]];                          // dotted eighths: [16th step, length]
const GATES = [[13.875, 14.0], [23.875, 24.0]];                                      // a breath before each climax
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const motif = (b, k, v, o) => { o = o || {}; const lift = 12 * (o.lift || 0), t0 = barT(b) + (o.shift || 0) * BEAT; MOTIF_RH.forEach(([st, l], i) => { if (!o.only || o.only(i)) E({ t: t0 + st * S16, d: l * S16, k, m: MOTIF_NOTES[i] + lift, v: v * (i === 4 ? 1.1 : 1), cut: o.cut, post: o.post }); }); };
  const D = (b, beat, k, v, x) => E(Object.assign({ t: at(b, beat), d: 0.5, k, v }, x || {}));
  const kick4 = (b, v, from) => { for (let i = from || 0; i < 4; i++) D(b, i, 'kick', v); };
  const claps = (b, v) => { D(b, 1, 'clap', v); D(b, 3, 'clap', v); };
  const hats = (b, v, sixteenths, open, from) => { for (let i = 0; i < (sixteenths ? 16 : 8); i++) { const beat = i * (sixteenths ? 0.25 : 0.5); if (beat < (from || 0)) continue; const off = beat % 1 === 0.5; D(b, beat, 'hat', v * (off ? 1 : 0.6), { p: off ? 0.2 : -0.2, open: open && off }); } };
  const shaker = (b, v, from) => { for (let i = 0; i < 16; i++) { if (i / 4 < (from || 0)) continue; D(b, i / 4, 'shaker', v * (i % 2 ? 1 : 0.6), { p: 0.35 }); } };
  const roll = (b, from, to, step, v0, v1, k) => { for (let x = from; x < to - 1e-6; x += step) D(b, x, k || 'snare', lerp(v0, v1, (x - from) / (to - from))); };
  const root = (b, oct) => rootM(ch(b), oct), subR = b => { const r = rootM(ch(b), 1); return r < 28 ? r + 12 : r; };
  const sub = (b, v, beats) => (beats || [0, 2]).forEach(bt_ => E({ t: at(b, bt_), d: 1.8 * BEAT, k: 'sub', m: subR(b), v }));
  const bassOff = (b, v) => { for (let i = 0; i < 4; i++) E({ t: at(b, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(b, 2) + (i % 2 ? 12 : 0), v }); sub(b, v * 0.9); };
  const bassRoll = (b, v) => { for (let i = 0; i < 16; i++) E({ t: at(b, i / 4), d: 0.2 * BEAT, k: 'roll', m: root(b, 2) + (i % 4 === 2 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.75) }); sub(b, v * 0.6); };
  const bassBounce = (b, v) => { [[0, 0, 0.7], [1.5, 7, 0.4], [2, 0, 0.7], [2.75, 12, 0.3], [3.5, 10, 0.4]].forEach(([beat, iv, l]) => E({ t: at(b, beat), d: l * BEAT, k: 'bass', m: root(b, 2) + (CMIN[ch(b)] || iv !== 10 ? iv : 9), v })); };
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 3.9 * BEAT, k: 'pad', ms: triad(ch(b), 3).concat([root(b, 4) + 7]), v, cut: cut || 1400 }, x || {}));
  const stab = (b, beat, v) => E({ t: at(b, beat), d: 0.3 * BEAT, k: 'stab', ms: triad(ch(b), 4), v });
  const arp = (b, k, v, oct, up) => { const tr = triad(ch(b), oct), seq = up ? [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6] : [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3]; for (let i = 0; i < 16; i++) { const s_ = seq[i], m = tr[s_ % 3] + 12 * Math.floor(s_ / 3); E({ t: at(b, i / 4), d: 0.22 * BEAT, k, m, v: v * (i % 4 === 0 ? 1 : 0.7), p: i % 2 ? 0.3 : -0.3 }); } };
  const halfTime = (b, v) => { D(b, 0, 'kick', 0.75 * v); D(b, 2.5, 'kick', 0.55 * v); D(b, 2, 'snap', 0.5 * v); shaker(b, 0.4 * v); };
  // ---- A: the hook (bar 1) — kick, sub and pad leave room for the laser's four snaps; the motif on a bright lead
  E({ t: 0, d: 1.4, k: 'crash', v: 0.45 }); D(1, 0, 'kick', 0.9); D(1, 1.5, 'kick', 0.7); D(1, 2, 'kick', 0.85); D(1, 3, 'clap', 0.5); hats(1, 0.4, true);
  sub(1, 0.7); pad(1, 0.4, 1500); motif(1, 'starlead', 0.75);
  // bar 2: weeks pass (the motif on a glass bell), then the lift into the skin (a downlifter and the dive)
  D(2, 0, 'kick', 0.8); hats(2, 0.3); pad(2, 0.42, 1100); sub(2, 0.55, [0]); motif(2, 'glass', 0.55, { only: i => i < 3 });
  E({ t: 3.0, d: 0.9, k: 'down', v: 0.45 });
  // ---- B: the ink in the dermis and the pulse inside it (bars 3–7)
  for (const b of [3, 4]) { halfTime(b, 0.85); pad(b, 0.36, 1000); bassBounce(b, 0.55); }
  motif(3, 'marimba', 0.8); arp(4, 'sqarp', 0.32, 5, true);                                           // bar 4: light shimmer as the photons cross the skin
  // bars 5–6: the absorption builds (pulsing bass, an opening pad, a riser), the expansion lands at 11.0 s
  for (const b of [5, 6]) { kick4(b, 0.85); hats(b, 0.35, true); for (let i = 0; i < 8; i++) E({ t: at(b, i * 0.5), d: 0.4 * BEAT, k: 'bass', m: root(b, 2) + (i % 2 ? 12 : 0), v: 0.5 + 0.03 * i + (b - 5) * 0.1 }); sub(b, 0.55); }
  E({ t: at(5, 0), d: 4 * BAR / 2, k: 'pad', ms: triad('Bm', 3).concat([nm('F#', 4)]), v: 0.4, cut: 700, cutTo: 2600 });
  E({ t: 9.0, d: 2.0, k: 'riser', v: 0.45 });
  // bar 7: after the pressure pulse the band thins; a riser under the bubbles; the cracks get the stage; a breath (13.875–14.0)
  D(7, 0, 'kick', 0.8); D(7, 2, 'kick', 0.7); pad(7, 0.35, 900); sub(7, 0.5); roll(7, 0, 1.75, 0.25, 0.15, 0.45);
  E({ t: 12.0, d: 1.875, k: 'riser', v: 0.6 });
  // ---- first climax (bar 8): the fragmentation — saw lead, wide chords, sub impact
  E({ t: 14.0, d: 2.2, k: 'impact', v: 0.8 }); E({ t: 14.0, d: 1.8, k: 'crash', v: 0.7 });
  kick4(8, 1.0); claps(8, 0.7); hats(8, 0.5, false, true); bassRoll(8, 0.8);
  E({ t: at(8, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad('D', 4).concat([nm('D', 5)]), v: 0.65 });
  motif(8, 'laser', 0.8, { cut: 5200 }); motif(8, 'pluck', 0.35, { lift: 1 });
  // bar 9: before / after — lighter
  D(9, 0, 'kick', 0.85); D(9, 2, 'kick', 0.75); D(9, 3, 'clap', 0.5); hats(9, 0.4); pad(9, 0.4, 1500); sub(9, 0.6); motif(9, 'pluck', 0.6);
  // ---- C: the macrophage (bars 10–12): an organic, bouncing groove, then the build to the closure
  for (const b of [10, 11]) { D(b, 0, 'kick', 0.85); D(b, 1.75, 'kick', 0.55); D(b, 2.5, 'kick', 0.7); D(b, 1, 'snap', 0.5); D(b, 3, 'snap', 0.5); shaker(b, 0.45); bassBounce(b, 0.65); pad(b, 0.34, 1200); }
  motif(10, 'marimba', 0.75); motif(11, 'marimba', 0.6, { only: i => i !== 2 });
  kick4(12, 0.9); hats(12, 0.45, true); bassRoll(12, 0.7); pad(12, 0.38, 1800); roll(12, 0, 3.5, 0.25, 0.15, 0.6); roll(12, 3, 3.75, 0.125, 0.6, 0.85);
  E({ t: at(12, 0), d: 3.75 * BEAT, k: 'riser', v: 0.7 });
  // ---- second climax (bar 13): the uptake click — warm and satisfying
  E({ t: 24.0, d: 2.0, k: 'impact', v: 0.7 }); E({ t: 24.0, d: 1.6, k: 'crash', v: 0.6 });
  kick4(13, 1.0); claps(13, 0.65); hats(13, 0.5, true); bassOff(13, 0.8);
  E({ t: at(13, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad('D', 4).concat([nm('A', 4)]), v: 0.55 });
  motif(13, 'pluck', 0.85); motif(13, 'glass', 0.35, { lift: 1 });
  // bar 14: inside the cell (the whole band is low-passed: see bandFilter)
  halfTime(14, 0.8); pad(14, 0.5, 1400); sub(14, 0.6); motif(14, 'glass', 0.5, { only: i => i % 2 === 0 });
  // ---- the lymphatic vessel (bars 15–16): liquid arpeggios on a steady beat
  for (const b of [15, 16]) { kick4(b, 0.85); D(b, 1, 'clap', 0.4); D(b, 3, 'clap', 0.4); hats(b, 0.35); bassOff(b, 0.65); arp(b, 'sqarp', 0.4, 5, b === 16); pad(b, 0.3, 1300); }
  motif(15, 'glass', 0.55);
  // bar 17: weeks of clearance — a ticking clock, sparse motif
  D(17, 0, 'kick', 0.7); D(17, 2, 'kick', 0.6); hats(17, 0.3, true); pad(17, 0.45, 1000); sub(17, 0.5); motif(17, 'marimba', 0.55, { only: i => i % 2 === 0 });
  // bar 18: back to the surface; a riser into the next session
  D(18, 0, 'kick', 0.8); D(18, 2, 'kick', 0.7); pad(18, 0.4, 1600); sub(18, 0.55); E({ t: at(18, 1), d: 3 * BEAT, k: 'riser', v: 0.55 });
  // ---- D: the next session (bars 19–20): the groove returns; four stabs land with the four steps
  kick4(19, 0.95); claps(19, 0.6); hats(19, 0.45, true); bassOff(19, 0.75); pad(19, 0.35, 1800); motif(19, 'pluck', 0.75);
  kick4(20, 0.95); hats(20, 0.4, true); bassOff(20, 0.7); for (let i = 0; i < 4; i++) stab(20, i, 0.45);
  // ---- E: the treatment course (bars 21–22): building as the tattoo fades; the motif climbs an octave
  for (const b of [21, 22]) { kick4(b, 1.0); claps(b, 0.65); hats(b, 0.5, true); shaker(b, 0.35); bassRoll(b, 0.75); arp(b, 'chiparp', 0.4, 5, b === 22); }
  motif(21, 'chip', 0.75); motif(22, 'chip', 0.75, { lift: 1 }); roll(22, 2, 4, 0.25, 0.2, 0.7); E({ t: at(22, 0), d: 4 * BEAT, k: 'riser', v: 0.65 });
  // ---- the final result (bar 23): the tattoo is gone — a big, clean D-major chord, the motif on bells
  E({ t: 44.0, d: 2.2, k: 'impact', v: 0.7 }); E({ t: 44.0, d: 2.0, k: 'crash', v: 0.7 });
  kick4(23, 1.0); claps(23, 0.6); hats(23, 0.45, false, true); bassOff(23, 0.8);
  E({ t: at(23, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad('D', 4).concat([nm('F#', 5), nm('A', 5)]), v: 0.6 });
  motif(23, 'glass', 0.7, { lift: 1 }); motif(23, 'pluck', 0.5);
  // bar 24: the title, the rewind, a riser into bar 1
  D(24, 0, 'kick', 0.8); D(24, 2, 'kick', 0.6); pad(24, 0.5, 2000); sub(24, 0.6); motif(24, 'glass', 0.45, { only: i => i < 4 });
  roll(24, 3, 4, 0.125, 0.25, 0.7); E({ t: at(24, 1), d: 3 * BEAT, k: 'riser', v: 0.6 });
  return ev;
}
// ---------------------------------------------------------------- SFX map: read from the event table (EV), one sound per physical event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A — the laser snaps, the frosting fizzes, weeks pass, the skin lifts and the camera dives
  EV.hook.forEach((tp, i) => { S(tp, 'snap', 1.0, { p: -0.15 + 0.1 * i }); S(tp + 1 / 60, 'fizz', 0.55, { d: 0.45, p: -0.15 + 0.1 * i }); });
  S(EV.weeks1, 'timelapse', 0.75, { d: 0.6 }); S(EV.tilt, 'whoosh', 0.5, { d: 0.45 }); S(EV.dive, 'dive', 0.65, { d: 0.75 }); S(EV.ambient, 'ambience', 0.35, { d: 1.75 });
  // B — the aggregate singled out, the pulse inside the skin, scattering, absorption, expansion, bubbles, cracks, the split
  S(EV.agg, 'ping', 0.6, { f: fq('A', 5) }); S(EV.micro, 'snap', 0.9, { deep: 1 }); S(EV.micro, 'beam', 0.45, { d: 1.7 });
  EV.scatter.forEach((ts, i) => S(ts, 'ping', 0.45, { f: pent(7 + i, 4), p: [-0.6, 0.6, -0.4][i] }));
  EV.hits.forEach((th, i) => S(th, 'absorb', 0.55 + 0.03 * i, { f: pent(2 + i, 4), p: (i % 2 ? 0.25 : -0.25) }));
  S(EV.hits[0], 'rumble', 0.6, { d: EV.expand - EV.hits[0] });
  S(EV.expand, 'boom', 1.0); S(EV.expand, 'pressure', 0.55, { d: 1.4 });
  EV.bubbles.forEach((tb, i) => S(tb, 'bubble', 0.6, { f: pent(9 + i, 4), p: (i % 2 ? 0.4 : -0.4) }));
  EV.cracks.forEach((tc, i) => S(tc, 'crack', 0.75 + 0.08 * i, { f: [2600, 3100, 2300, 3500][i], p: [-0.3, 0.3, -0.1, 0.2][i] }));
  S(EV.split, 'shatter', 1.0, { d: 0.9 });
  S(EV.compare, 'swoosh', 0.45, { d: 0.35 }); S(EV.disperse, 'liquid', 0.35, { d: 2.6 }); S(EV.merge, 'swoosh', 0.45, { d: 0.5, rev: 1 });
  // C — the macrophage: movement, four reaches, the membrane stretching, the closure and the uptake click, the vesicle, lysosomes
  S(EV.macro, 'organic', 0.5, { d: 2.0 }); S(EV.macro, 'bloop', 0.55, { f: fq('D', 4) });
  EV.reach.forEach((tr, i) => S(tr, 'boing', 0.55, { f: pent(3 + i, 3), p: -0.3 + 0.2 * i }));
  S(EV.wrap, 'stretch', 0.6, { d: EV.close - EV.wrap });
  S(EV.close, 'gloop', 0.9); S(EV.close, 'click', 1.0);
  S(EV.vesicle, 'popin', 0.7, { f: fq('F#', 5) });
  S(EV.inside, 'muffle', 0.45, { d: 2.0 });
  EV.lyso.forEach((tl, i) => S(tl, 'plop', 0.7, { f: pent(5 + 2 * i, 3), p: [-0.4, 0.4, 0][i] }));
  // the lymphatic vessel: the flow, three slips through the wall, one squeeze, the node
  S(EV.lymph, 'flow', 0.5, { d: 3.0 }); EV.enter.forEach((te, i) => S(te, 'slip', 0.6, { f: pent(8 + i, 4), p: [-0.3, 0, 0.3][i] }));
  S(EV.cellIn, 'squelch', 0.65); S(EV.node, 'chime', 0.55, { f: fq('B', 5) });
  // weeks of clearance: seven diminishing tones
  EV.clear.forEach((tc, i) => S(tc, 'dim', 0.6 - 0.06 * i, { f: pent(12 - i, 4), p: (i % 2 ? 0.3 : -0.3) }));
  // D — back to the surface, weeks later, the next session, four quick steps
  S(EV.out, 'undive', 0.55, { d: 0.75 }); S(EV.weeks2, 'timelapse', 0.7, { d: 0.6 });
  S(EV.session, 'whoosh', 0.4, { d: 0.6 });
  EV.pulses2.forEach((tp, i) => { S(tp, 'snap', 0.9, { p: [-0.3, -0.2, 0.25, 0.35][i] }); S(tp + 1 / 60, 'fizz', 0.45, { d: 0.4 }); });
  EV.steps4.forEach((ts, i) => S(ts, 'cue' + (i + 1), 0.8));
  // E — the course: five ascending stage ticks over a fading tone, softer session snaps; the result; the recap; the title; the rewind
  EV.stages.forEach((ts, i) => S(ts, 'stage', 0.7 + 0.05 * i, { f: pent(5 + 2 * i, 4) }));
  S(EV.stages[0], 'fadetone', 0.45, { d: EV.stages[4] + 0.5 - EV.stages[0] });
  EV.pulses3.forEach((tp, i) => { S(tp, 'snap', 0.55, { soft: 1, p: (i % 2 ? 0.25 : -0.25) }); S(tp + 1 / 60, 'fizz', 0.3, { d: 0.3 }); });
  S(EV.done, 'complete', 0.9);
  EV.recap.forEach((tr, i) => S(tr, 'pop', 0.65, { f: pent(5 + i, 4), p: [-0.3, 0.3, -0.3, 0.3][i] }));
  S(EV.title, 'title', 0.6, { d: 1.0 }); S(EV.rewind, 'rewind', 0.65, { d: DUR - EV.rewind });
  return ev;
}
// how far the band dips under each SFX (the SFX lead)
const DUCK = { snap: 0.35, boom: 0.45, crack: 0.3, shatter: 0.45, click: 0.4, gloop: 0.3, complete: 0.35, absorb: 0.12, bubble: 0.12, plop: 0.2, slip: 0.15, squelch: 0.2, boing: 0.15, popin: 0.2, stage: 0.2, pop: 0.18, cue1: 0.2, cue2: 0.2, cue3: 0.2, cue4: 0.2, ping: 0.15, dim: 0.12, chime: 0.15, fizz: 0.12, timelapse: 0.2, rewind: 0.25 };
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
function chordFn(ms, d, cut, att, env, cutTo) { // detuned saws through a low-pass: pads, stabs, the drop's supersaw (cutTo: the filter opens over d)
  const n = ms.length * 2, ph = new Float64Array(n), dts = []; ms.forEach(m => { const f = mtof(m); dts.push(f * 1.005 / SR, f * 0.995 / SR); }); const F = lpf();
  return t => { let x = 0; for (let j = 0; j < n; j++) { let q = ph[j] + dts[j]; if (q >= 1) q -= 1; ph[j] = q; x += 2 * q - 1; } const fc = env ? cut * (0.25 + 0.75 * Math.exp(-t * env)) : cutTo ? cut * Math.pow(cutTo / cut, clamp(t / d, 0, 1)) : cut; return F(x / n, fc, 0.7) * Math.min(1, t / att) * rel(t, d, att > 0.1 ? 0.5 : 0.06) * (env ? Math.exp(-t * 3) : 1); };
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
    case 'starlead': voice(L, R, e.t, e.d + 0.1, 0.05, 0.2 * v, beepLeadFn(mtof(e.m), e.d), { send: 0.15, echo: 0.25 }); break;
    case 'pluck': voice(L, R, e.t, e.d + 0.5, -0.1, 0.3 * v, pluckFn(mtof(e.m), e.d), { send: 0.18, echo: 0.22 }); break;
    case 'marimba': voice(L, R, e.t, 0.8, 0.1, 0.36 * v, marimbaFn(mtof(e.m)), { send: 0.2, echo: 0.2 }); break;
    case 'glass': voice(L, R, e.t, 1.6, 0.15, 0.24 * v, glassFn(mtof(e.m)), { send: 0.4, echo: 0.2 }); break;
    case 'laser': { const f = mtof(e.m), pf = LEAD_PREV.laser && e.t - LEAD_PREV.laser.t < 0.3 ? LEAD_PREV.laser.f : 0; LEAD_PREV.laser = { t: e.t + e.d, f }; voice(L, R, e.t, e.d + 0.1, -0.05, 0.22 * v, laserFn(f, e.d, pf, e.cut || 3000), { send: 0.2, echo: 0.28 }); break; }
    case 'chip': voice(L, R, e.t, e.d + 0.05, 0.1, 0.14 * v, chipFn(mtof(e.m), e.d), { send: 0.12, echo: 0.25 }); break;
    case 'sqarp': voice(L, R, e.t, e.d + 0.06, e.p || 0, 0.09 * v, squareFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'chiparp': voice(L, R, e.t, e.d + 0.04, e.p || 0, 0.09 * v, chipFn(mtof(e.m), e.d), { send: 0.1, duck: 1 }); break;
    case 'pad': voice(L, R, e.t, e.d + 0.6, 0, 0.26 * v, chordFn(e.ms, e.d, e.cut || 1400, 0.25, 0, e.cutTo), { send: 0.4, duck: 1 }); break;
    case 'stab': voice(L, R, e.t, e.d + 0.1, 0.1, 0.26 * v, chordFn(e.ms, e.d, 4200, 0.003, 14), { send: 0.15, duck: 1 }); break;
    case 'supersaw': voice(L, R, e.t, e.d + 0.6, 0, 0.3 * v, chordFn(e.ms, e.d, 2600, 0.02), { send: 0.3, duck: 1 }); break;
    case 'bass': case 'roll': case 'sub': voice(L, R, e.t, e.d + 0.05, 0, (k === 'sub' ? 0.06 : 0.13) * v, bassFn(mtof(e.m), e.d, k), { duck: k !== 'sub' }); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.4 * v, kickFn(sd)); break;
    case 'clap': voice(L, R, e.t, 0.35, 0.05, 0.34 * v, clapFn(sd), { send: 0.22 }); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.3 * v, snapFn(sd), { send: 0.25 }); break;
    case 'snare': voice(L, R, e.t, 0.3, -0.05, 0.24 * v, snareFn(sd), { send: 0.18 }); break;
    case 'hat': voice(L, R, e.t, e.open ? 0.3 : 0.08, e.p || 0, 0.22 * v, hatFn(sd, e.open)); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.1 * v, shakerFn(sd)); break;
    case 'crash': voice(L, R, e.t, e.d, 0, 0.14 * v, crashFn(sd), { send: 0.25 }); break;
    case 'riser': voice(L, R, e.t, e.d, 0, 0.18 * v, riserFn(e.d, sd), { send: 0.3 }); break;
    case 'down': voice(L, R, e.t, e.d, 0, 0.18 * v, downFn(e.d, sd), { send: 0.4 }); break;
    case 'impact': voice(L, R, e.t, e.d, 0, 0.4 * v, impactFn(sd), { send: 0.2 }); break;
  }
}
// ---------------------------------------------------------------- SFX: one sound per physical event, tuned to the D pentatonic
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.25, f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.2 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.002 ? t / 0.002 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, q, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), q) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  switch (k) {
    // the Q-switched laser: a sharp, dry snap (a photoacoustic crack) — broadband click, a high ring, a small low thump
    case 'snap': {
      const s = e.soft ? 0.55 : 1;
      V(e.t, 0.012, 0.95 * s, (t, kk) => nz(kk * 3 + sd) * (1 - t / 0.012) ** 2, 0.08);
      V(e.t, 0.06, 0.38 * s, noiseBP(() => 5200, 0.25, dec(70), sd + 1), 0.12);
      V(e.t, 0.09, 0.42 * s, sine(t => 95 + 120 * Math.exp(-t * 60), dec(45)), 0.05);
      if (e.deep) V(e.t, 0.4, 0.3, sine(t => 55 + 40 * Math.exp(-t * 20), dec(9)), 0.2);
      break;
    }
    // frosting: tiny gas bubbles crackling under the skin's surface
    case 'fizz': { const n = 22; for (let i = 0; i < n; i++) { const tt = e.t + d * Math.pow(hash(sd + i), 1.6); V(tt, 0.012, 0.16 * (1 - (tt - e.t) / d), (t, kk) => nz(kk * 5 + sd + i) * (1 - t / 0.012), 0.15, p + (hash(sd + i + 40) - 0.5) * 0.6); } V(e.t, d, 0.06, noiseLP(() => 7000, t => (1 - t / d) ** 2, sd), 0.2); break; }
    // a time jump: a rising sweep and a clock that ticks faster and faster
    case 'timelapse': { V(e.t, d, 0.22, noiseBP(t => 600 * Math.pow(9, t / d), 0.5, swell(d), sd), 0.3); for (let i = 0; i < 9; i++) { const tt = e.t + d * (1 - Math.pow(1 - i / 9, 1.7)); V(tt, 0.03, 0.22, sine(() => i % 2 ? 2600 : 2100, dec(160)), 0.1); } break; }
    case 'whoosh': V(e.t, d, 0.22, noiseLP(t => 1200 + 3000 * Math.sin(Math.PI * t / d), swell(d), sd), 0.3); break;
    case 'dive': V(e.t, d, 0.28, noiseLP(t => 7000 * Math.pow(0.06, t / d), swell(d), sd), 0.3); V(e.t, d, 0.18, sine(t => 220 * Math.pow(0.35, t / d), swell(d)), 0.3); break;
    case 'undive': V(e.t, d, 0.26, noiseLP(t => 500 * Math.pow(14, t / d), swell(d), sd), 0.3); V(e.t, d, 0.14, sine(t => 80 * Math.pow(3, t / d), swell(d)), 0.3); break;
    case 'ambience': V(e.t, d, 0.1, noiseLP(t => 700 + 250 * fsin(TAU * 0.7 * t), edge(d, 0.4, 0.5), sd), 0.4); break;
    case 'ping': V(e.t, 0.6, 0.3, bell(f, 6, 0.7), 0.4); break;
    // the beam entering the skin: a faint descending shimmer
    case 'beam': V(e.t, d, 0.1, (t) => { const fr = 1760 * Math.pow(0.5, t / d); return (fsin(TAU * fr * t) + 0.5 * fsin(TAU * fr * 1.5 * t)) * edge(d, 0.08, 0.4)(t); }, 0.5); break;
    // one photon absorbed: a short tick, rising in pitch with the energy
    case 'absorb': V(e.t, 0.09, 0.32, sine(t => f * (1 + 0.2 * Math.exp(-t * 80)), att(0.001, 40)), 0.15); V(e.t, 0.01, 0.16, (t, kk) => nz(kk + sd) * (1 - t / 0.01), 0.05); break;
    // the low-frequency energy rise under the absorption
    case 'rumble': { let ph = 0; V(e.t, d + 0.05, 0.3, t => { const u = clamp(t / d, 0, 1); ph += (38 + 52 * u * u) / SR; ph -= Math.floor(ph); return (fsin(TAU * ph) + 0.35 * fsin(2 * TAU * ph) * u) * u * u * (t > d ? Math.max(0, 1 - (t - d) / 0.05) : 1); }, 0.05); break; }
    // thermoelastic expansion: a deep, tight pressure pulse
    case 'boom': V(e.t, 0.45, 0.7, sine(t => 48 + 85 * Math.exp(-t * 26), dec(9)), 0.1); V(e.t, 0.02, 0.4, (t, kk) => nz(kk * 9 + sd) * (1 - t / 0.02), 0.05); V(e.t, 0.18, 0.22, noiseLP(() => 900, dec(18), sd + 3), 0.2); break;
    case 'pressure': V(e.t, d, 0.16, noiseLP(t => 3000 * Math.pow(0.12, t / d), edge(d, 0.02, d * 0.8), sd), 0.45, -0.5); V(e.t, d, 0.16, noiseLP(t => 3000 * Math.pow(0.12, t / d), edge(d, 0.02, d * 0.8), sd + 7), 0.45, 0.5); break;
    case 'bubble': V(e.t, 0.1, 0.34, sine(t => f * (0.6 + 0.9 * Math.min(1, t / 0.03)), att(0.002, 35)), 0.3); break;
    // one crack running through the aggregate
    case 'crack': V(e.t, 0.006, 0.8, (t, kk) => nz(kk * 11 + sd), 0.1); V(e.t, 0.07, 0.42, noiseBP(() => f, 0.18, dec(55), sd + 2), 0.2); V(e.t + 0.012, 0.03, 0.3, (t, kk) => nz(kk * 17 + sd) * (1 - t / 0.03), 0.15); break;
    // the split: a crunchy shatter, fragments tinkling apart, a chime
    case 'shatter': {
      V(e.t, 0.3, 0.55, sine(t => 70 + 70 * Math.exp(-t * 20), dec(10)), 0.1); V(e.t, 0.05, 0.5, noiseBP(() => 2400, 0.4, dec(40), sd), 0.2);
      for (let i = 0; i < 14; i++) { const tt = e.t + 0.02 + 0.5 * Math.pow(i / 14, 1.4); V(tt, 0.12, 0.2 * (1 - i / 18), bell(pent(8 + (i * 3) % 7, 4), 22, 0.5), 0.35, (hash(sd + i) - 0.5) * 1.4); }
      V(e.t, 1.2, 0.18, bell(fq('D', 6), 3, 1.0), 0.5, -0.2); V(e.t + 0.02, 1.2, 0.15, bell(fq('A', 6), 3, 1.0), 0.5, 0.2); break;
    }
    case 'swoosh': V(e.t, d, 0.2, noiseLP(t => e.rev ? 6000 - 5000 * t / d : 1000 + 5000 * t / d, swell(d), sd), 0.3); break;
    case 'liquid': for (let i = 0; i < 9; i++) V(e.t + d * hash(sd + i), 0.14, 0.12, sine(t => (300 + 300 * hash(sd + i + 9)) * (1 + 2.5 * t), att(0.004, 20)), 0.3, (hash(sd + i + 3) - 0.5) * 1.2); break;
    // the macrophage: a soft, squishy living texture
    case 'organic': V(e.t, d, 0.12, noiseLP(t => 400 + 300 * fsin(TAU * 1.7 * t) + 200 * fsin(TAU * 3.1 * t), edge(d, 0.3, 0.6), sd), 0.4); break;
    case 'bloop': V(e.t, 0.35, 0.38, sine(t => f * (1 + 0.6 * Math.exp(-t * 18)), att(0.005, 9)), 0.35); break;
    case 'boing': V(e.t, 0.32, 0.32, sine(t => f * (1 + 0.35 * Math.min(1, t / 0.12)) * (1 + 0.03 * fsin(TAU * 11 * t)), att(0.008, 8)), 0.35); break;
    case 'stretch': V(e.t, d, 0.2, sine(t => fq('D', 4) * Math.pow(2, t / d), t => Math.min(1, t / 0.15) * (0.7 + 0.3 * fsin(TAU * 6 * t)) * Math.min(1, (d - t) / 0.05 + 0.0001)), 0.3); break;
    // the closure: the membrane meets (gloop) and the uptake click
    case 'gloop': V(e.t, 0.35, 0.42, sine(t => 140 * (1 + 1.4 * Math.exp(-t * 14)), att(0.004, 10)), 0.2); V(e.t, 0.2, 0.18, noiseLP(() => 900, dec(16), sd), 0.2); break;
    case 'click': V(e.t + 0.004, 0.012, 0.75, (t, kk) => nz(kk * 19 + sd) * (1 - t / 0.012), 0.1); V(e.t + 0.004, 0.25, 0.32, bell(fq('A', 6), 14, 0.9), 0.35); V(e.t + 0.03, 0.9, 0.2, bell(fq('D', 6), 4, 1.0), 0.5); break;
    case 'popin': V(e.t, 0.3, 0.34, sine(t => f * (0.7 + 0.3 * Math.min(1, t / 0.04)), att(0.003, 12)), 0.35); break;
    case 'muffle': V(e.t, d, 0.12, noiseLP(() => 300, edge(d, 0.3, 0.5), sd), 0.3); V(e.t, d, 0.08, sine(() => fq('D', 2), edge(d, 0.3, 0.5)), 0.2); break;
    case 'plop': V(e.t, 0.22, 0.4, sine(t => f * (0.55 + 0.8 * Math.min(1, t / 0.05)), att(0.003, 14)), 0.35); break;
    case 'flow': V(e.t, d, 0.14, noiseBP(t => 700 + 250 * fsin(TAU * 0.9 * t), 0.6, edge(d, 0.3, 0.6), sd), 0.4, -0.3); V(e.t, d, 0.14, noiseBP(t => 750 + 250 * fsin(TAU * 0.7 * t + 1), 0.6, edge(d, 0.3, 0.6), sd + 5), 0.4, 0.3); break;
    case 'slip': V(e.t, 0.18, 0.34, sine(t => f * (1.4 - 0.5 * Math.min(1, t / 0.08)), att(0.003, 16)), 0.3); break;
    case 'squelch': V(e.t, 0.35, 0.3, sine(t => 180 * (1 + 0.5 * fsin(TAU * 18 * t)) * (1 - 0.4 * t), att(0.01, 8)), 0.3); V(e.t, 0.3, 0.12, noiseLP(() => 1200, att(0.01, 9), sd), 0.3); break;
    case 'chime': V(e.t, 1.0, 0.3, bell(f, 3.5, 1.0), 0.5); break;
    // clearance: tones that grow quieter step by step
    case 'dim': V(e.t, 0.4, 0.3, bell(f, 7, 0.6), 0.45); break;
    // the four quick steps of the next session
    case 'cue1': V(e.t, 0.2, 0.42, sine(t => fq('D', 4) * (1 + 0.2 * Math.exp(-t * 40)), att(0.002, 16)), 0.25); break;
    case 'cue2': { let ph = 0; V(e.t, 0.16, 0.3, t => { ph += 300 * Math.pow(5, Math.min(1, t / 0.1)) / SR; ph -= Math.floor(ph); return (2 * ph - 1) * 0.5 * (t < 0.1 ? 1 : Math.max(0, 1 - (t - 0.1) / 0.06)); }, 0.2); break; }
    case 'cue3': for (let i = 0; i < 4; i++) V(e.t + i * 0.025, 0.05, 0.28, noiseBP(() => 2800 + 400 * i, 0.2, dec(60), sd + i), 0.15, -0.3 + 0.2 * i); break;
    case 'cue4': V(e.t, 0.25, 0.36, sine(t => 160 * (1 + 1.2 * Math.exp(-t * 16)), att(0.004, 12)), 0.2); V(e.t + 0.06, 0.4, 0.22, bell(fq('A', 5), 8, 0.8), 0.4); break;
    // the treatment course: ascending clock ticks over a tone that fades as the tattoo does
    case 'stage': V(e.t, 0.025, 0.3, sine(() => 2400, dec(180)), 0.1); V(e.t, 0.5, 0.3, bell(f, 6, 0.8), 0.45); break;
    case 'fadetone': V(e.t, d, 0.07, (t) => (fsin(TAU * fq('A', 4) * t) + 0.4 * fsin(TAU * fq('E', 5) * t)) * Math.min(1, t / 0.3) * Math.pow(1 - clamp(t / d, 0, 1), 1.5), 0.5); break;
    case 'complete': [['D', 5], ['F#', 5], ['A', 5], ['D', 6], ['E', 6]].forEach(([n, o], i) => V(e.t + i * 0.03, 1.6, 0.13, bell(fq(n, o), 2.2, 0.9), 0.55, -0.4 + 0.2 * i)); V(e.t, 0.6, 0.12, sine(() => fq('D', 3), att(0.01, 4)), 0.3); break;
    case 'pop': V(e.t, 0.16, 0.4, sine(t => f * (1.5 - 0.5 * Math.min(1, t * 40)), att(0.002, 22)), 0.25); break;
    case 'title': [['D', 4], ['A', 4], ['D', 5], ['F#', 5], ['A', 5]].forEach(([n, o], i) => V(e.t + i * 0.035, d + 0.8, 0.12, bell(fq(n, o), 1.6, 0.9), 0.5, -0.4 + 0.2 * i)); break;
    // the timeline rewinds: fast reverse chatter rising in pitch
    case 'rewind': { const n = 16; for (let i = 0; i < n; i++) V(e.t + d * (i / n), 0.02, 0.16, sine(() => 900 + 1400 * (i / n), dec(140)), 0.1, (i % 2 ? 0.3 : -0.3)); V(e.t, d, 0.14, noiseBP(t => 500 * Math.pow(8, t / d), 0.5, swell(d), sd), 0.25); break; }
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
// inside the macrophage the whole band is heard muffled (low-passed from 26.0 s, opened again as the camera leaves at 28 s)
const FILT = { a: 25.9, b: 26.4, c: 27.85, d: 28.5, lo: 800 };
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
      const depth = ((e.t >= 14.0 && e.t < 16.0) || (e.t >= 24.0 && e.t < 26.0) || (e.t >= 44.0 && e.t < 46.0) ? 0.55 : 0.4) * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
      for (let q = 0; q < n; q++) { const j = (j0 + q) % SCG.length, u = q * 64 / SR, a = u < 0.004 ? u / 0.004 : Math.exp(-(u - 0.004) * 13); SCG[j] *= 1 - depth * a; }
    }
    LEAD_PREV.laser = null;
    for (const e of mus) if (!e.post) playMusic(e, L, R);
    // the gates: a sixteenth of silence before each climax (reverb tails ring on)
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
