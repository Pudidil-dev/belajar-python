'use strict';
// ============================================================================
// AUDIO — an original electronic particle-physics score plus SFX locked to the
// picture, synthesised sample by sample in plain JS (no samples, no Web Audio
// graph). 120 BPM, 36 bars = 72.000 s, E minor (Em–C–G–D), ending on E major.
// One motif, the "proton launch": a rising E-minor arpeggio that speeds up as
// it climbs (quarter, dotted eighth, sixteenth, eighth, sixteenths) and lands
// on the high E — a particle gaining speed. It changes instrument with the
// story: a bright lead over the gantry · glass bells in the hydrogen gas ·
// plucks and a spiralling square arpeggio in the cyclotron, where a bass pulse
// sits on every RF kick · a saw lead on the first climax (the beam leaves the
// cyclotron, 24.0 s) · half time when the degrader slows the beam · a band-
// passed arpeggio in the energy selector · a heavy groove for the turning
// gantry · the whole band low-passed in the molecular slow motion, opening up
// as the proton slows · the second climax on its stop (the Bragg peak, 54.0 s)
// · digital arpeggios for the plan · a picardy E-major chord for the finish ·
// a riser back into bar 1 (seamless loop).
// SFX: every cue is read from the same event table (EV, 03_clock.js) that
// draws the picture, so each sound starts on the frame its event is drawn
// (event times sit on the eighth-note grid or, in fast clusters, the twelfth-
// second grid). Each physical event has its own sound: the deep activation of
// the gantry, a target lock, the zip of one proton with interaction ticks
// that speed up and a controlled stop, the ion source's ionisation click,
// injection pulses, an RF "zap" on every gap crossing that climbs in pitch with
// the energy, the high-voltage deflector and the exit sweep, graphite ticks,
// slit knocks, converging focusing tones, a deep dipole sweep, the heavy
// gantry servo and its lock, X-ray buzzes, scanning ticks, tiny ionisation
// clicks that speed up, the deep Bragg-peak impact, graph glides, layer steps,
// DNA strand snaps and a completion chord. The band ducks under them.
// Microscopic and radiation processes are not audible in reality: this is
// educational sound design.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const fq = (n, o) => mtof(nm(n, o));
const PENT_OFF = [0, 3, 5, 7, 10];
const pent = (i, o) => mtof(nm('E', o) + PENT_OFF[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5));   // i-th step up the E minor pentatonic from E(o)
const SCALE_OFF = [0, 2, 3, 5, 7, 8, 10];
const scl = (i, o) => mtof(nm('E', o) + SCALE_OFF[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7));    // i-th step of E natural minor
// ---------------------------------------------------------------- harmony and the motif
const CHORDS = ['Em', 'C', 'Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'D', 'Em', 'C', 'Am', 'Em', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'Em', 'D', 'Em', 'C', 'D', 'Em', 'C', 'G', 'D', 'C', 'E'];
const CROOT = { Em: 'E', C: 'C', G: 'G', D: 'D', Am: 'A', E: 'E' }, CMIN = { Em: 1, Am: 1 };
function rootM(ch, oct) { return nm(CROOT[ch], oct); }
function triad(ch, oct) { const r = rootM(ch, oct); return [r, r + (CMIN[ch] ? 3 : 4), r + 7]; }
// the "proton launch": E4 G4 B4 E5 G5 B5 E6, faster as it climbs; in E major the thirds rise to G#
const MOTIF_NOTES = [nm('E', 4), nm('G', 4), nm('B', 4), nm('E', 5), nm('G', 5), nm('B', 5), nm('E', 6)];
const MOTIF_RH = [[0, 4], [4, 3], [7, 1], [8, 2], [10, 1], [11, 1], [12, 4]];
const GATES = [[23.875, 24.0], [53.875, 54.0]];                                      // a breath before each climax
function musicEvents() {
  const ev = [], E = o => ev.push(o);
  const at = (b, beat) => barT(b) + beat * BEAT, ch = b => CHORDS[b - 1];
  const motif = (b, k, v, o) => { o = o || {}; const lift = 12 * (o.lift || 0), t0 = barT(b) + (o.shift || 0) * BEAT; MOTIF_RH.forEach(([st, l], i) => { if (o.only && !o.only(i)) return; let m = MOTIF_NOTES[i] + lift; if (o.major && (i === 1 || i === 4)) m += 1; E({ t: t0 + st * S16, d: l * S16, k, m, v: v * (i === 6 ? 1.12 : 1), cut: o.cut, post: o.post }); }); };
  const D = (b, beat, k, v, x) => E(Object.assign({ t: at(b, beat), d: 0.5, k, v }, x || {}));
  const kick4 = (b, v, from) => { for (let i = from || 0; i < 4; i++) D(b, i, 'kick', v); };
  const claps = (b, v) => { D(b, 1, 'clap', v); D(b, 3, 'clap', v); };
  const hats = (b, v, sixteenths, open, from) => { for (let i = 0; i < (sixteenths ? 16 : 8); i++) { const beat = i * (sixteenths ? 0.25 : 0.5); if (beat < (from || 0)) continue; const off = beat % 1 === 0.5; D(b, beat, 'hat', v * (off ? 1 : 0.6), { p: off ? 0.2 : -0.2, open: open && off }); } };
  const shaker = (b, v, from) => { for (let i = 0; i < 16; i++) { if (i / 4 < (from || 0)) continue; D(b, i / 4, 'shaker', v * (i % 2 ? 1 : 0.6), { p: 0.35 }); } };
  const roll = (b, from, to, step, v0, v1, k) => { for (let x = from; x < to - 1e-6; x += step) D(b, x, k || 'snare', lerp(v0, v1, (x - from) / (to - from))); };
  const root = (b, oct) => rootM(ch(b), oct), subR = b => { const r = rootM(ch(b), 1); return r < 28 ? r + 12 : r; };
  const sub = (b, v, beats) => (beats || [0, 2]).forEach(bt_ => E({ t: at(b, bt_), d: 1.8 * BEAT, k: 'sub', m: subR(b), v }));
  const bassOff = (b, v) => { for (let i = 0; i < 4; i++) E({ t: at(b, i + 0.5), d: 0.42 * BEAT, k: 'bass', m: root(b, 2) + (i % 2 ? 12 : 0), v }); sub(b, v * 0.9); };
  const bassPulse = (b, v) => { for (let i = 0; i < 8; i++) E({ t: at(b, i * 0.5), d: 0.38 * BEAT, k: 'bass', m: root(b, 2) + (i % 4 === 3 ? 12 : 0), v: v * (i % 2 ? 0.75 : 1) }); sub(b, v * 0.7); };
  const bassRoll = (b, v) => { for (let i = 0; i < 16; i++) E({ t: at(b, i / 4), d: 0.2 * BEAT, k: 'roll', m: root(b, 2) + (i % 4 === 2 ? 12 : 0), v: v * (i % 4 === 0 ? 1 : 0.75) }); sub(b, v * 0.6); };
  const bassLong = (b, v) => { E({ t: at(b, 0), d: 1.9 * BEAT, k: 'bass', m: root(b, 2), v }); E({ t: at(b, 2), d: 1.9 * BEAT, k: 'bass', m: root(b, 2) + 7, v: v * 0.85 }); sub(b, v * 0.8); };
  const pad = (b, v, cut, x) => E(Object.assign({ t: at(b, 0), d: 3.9 * BEAT, k: 'pad', ms: triad(ch(b), 3).concat([root(b, 4) + 7]), v, cut: cut || 1400 }, x || {}));
  const stab = (b, beat, v) => E({ t: at(b, beat), d: 0.3 * BEAT, k: 'stab', ms: triad(ch(b), 4), v });
  // the spiralling arpeggio: chord tones climbing and widening, like an orbit growing
  const spiral = (b, k, v, oct, rate) => { const tr = triad(ch(b), oct), n = rate === 8 ? 8 : 16, step = 4 / n; for (let i = 0; i < n; i++) { const up = Math.floor(i / 3), m = tr[i % 3] + 12 * Math.min(2, Math.floor(up / (n === 8 ? 2 : 3))); E({ t: at(b, i * step), d: step * 0.9 * BEAT, k, m, v: v * (i % 4 === 0 ? 1 : 0.72), p: i % 2 ? 0.35 : -0.35 }); } };
  const halfTime = (b, v) => { D(b, 0, 'kick', 0.8 * v); D(b, 2, 'snare', 0.55 * v); D(b, 3.5, 'kick', 0.45 * v); hats(b, 0.28 * v); };
  // ---- A: the hook (bars 1–2): the gantry powers up, the motif on a bright lead; bar 2 leaves room for the proton's ticks and its stop
  E({ t: 0, d: 1.2, k: 'crash', v: 0.35 }); D(1, 0, 'kick', 0.95); D(1, 1.5, 'kick', 0.6); D(1, 2, 'kick', 0.85); D(1, 3, 'clap', 0.5); hats(1, 0.35, true);
  sub(1, 0.75); pad(1, 0.38, 1300, { cutTo: 2600 }); motif(1, 'starlead', 0.8);
  D(2, 0, 'kick', 0.85); D(2, 2, 'kick', 0.7); hats(2, 0.3, false); pad(2, 0.4, 1100); sub(2, 0.6, [0]); E({ t: at(2, 2), d: 1.8 * BEAT, k: 'sub', m: nm('E', 2), v: 0.7 });
  // ---- B: where the protons come from (bars 3–6)
  for (const b of [3, 4]) { kick4(b, 0.85); claps(b, 0.5); hats(b, 0.35); bassPulse(b, 0.55); pad(b, 0.3, 1200); }
  motif(3, 'pluck', 0.7); E({ t: at(4, 0), d: 4 * BEAT, k: 'down', v: 0.25 }); motif(4, 'glass', 0.55, { lift: 1, only: i => i % 2 === 0 });
  for (const b of [5, 6]) { kick4(b, 0.9); claps(b, 0.55); hats(b, 0.4, true); bassOff(b, 0.65); pad(b, 0.32, 1500); spiral(b, 'sqarp', 0.3, 5, 8); }
  motif(5, 'marimba', 0.7); roll(6, 2, 4, 0.25, 0.2, 0.6); E({ t: at(6, 1), d: 3 * BEAT, k: 'riser', v: 0.55 });
  // ---- C: the cyclotron (bars 7–12): a bass pulse on every beat = every RF kick; the spiral arpeggio widens
  D(7, 0, 'kick', 0.85); D(7, 2, 'kick', 0.7); hats(7, 0.3, true, false, 2); E({ t: at(7, 0), d: 3.9 * BEAT, k: 'pad', ms: triad('Em', 3).concat([nm('B', 4)]), v: 0.42, cut: 500, cutTo: 3200 });
  E({ t: at(7, 0), d: 4 * BEAT, k: 'riser', v: 0.4 }); sub(7, 0.6);
  for (const b of [8, 9, 10]) { kick4(b, 0.95); claps(b, 0.55); hats(b, 0.42, true, true); for (let i = 0; i < 4; i++) E({ t: at(b, i), d: 0.45 * BEAT, k: 'bass', m: root(b, 2) + (i === 3 ? 7 : 0), v: 0.7 }); sub(b, 0.55); spiral(b, 'sqarp', 0.32, 4, 16); pad(b, 0.26, 1600); }
  motif(9, 'laser', 0.55, { cut: 3600 }); motif(10, 'pluck', 0.5, { only: i => i < 5 });
  // bars 11–12: the time-lapse build: faster arps, a rising filter, a snare roll speeding up, a riser; a breath (23.875–24.0)
  for (const b of [11, 12]) { kick4(b, 1.0); claps(b, 0.6); hats(b, 0.48, true); bassRoll(b, 0.7); spiral(b, 'chiparp', 0.38, 5, 16); }
  E({ t: at(11, 0), d: 8 * BEAT, k: 'pad', ms: triad('Em', 3).concat([nm('D', 5)]), v: 0.38, cut: 600, cutTo: 4200 });
  roll(11, 2, 4, 0.25, 0.15, 0.4); roll(12, 0, 2, 0.25, 0.4, 0.6); roll(12, 2, 3.75, 0.125, 0.6, 0.9); E({ t: at(11, 2), d: 6 * BEAT - 0.125, k: 'riser', v: 0.7 });
  // ---- first climax (bar 13): the beam leaves the cyclotron — saw lead, wide chords, sub impact
  E({ t: 24.0, d: 2.2, k: 'impact', v: 0.8 }); E({ t: 24.0, d: 1.8, k: 'crash', v: 0.7 });
  kick4(13, 1.0); claps(13, 0.7); hats(13, 0.5, false, true); bassRoll(13, 0.8);
  E({ t: at(13, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad('Em', 4).concat([nm('E', 5)]), v: 0.62 });
  motif(13, 'laser', 0.85, { cut: 5200 }); motif(13, 'pluck', 0.35, { lift: 1 });
  // ---- D: controlling the beam (bars 14–18)
  // bar 14: the degrader slows the beam — the groove drops to half time
  halfTime(14, 1); bassLong(14, 0.6); pad(14, 0.42, 900); motif(14, 'marimba', 0.55, { only: i => i < 4 });
  // bar 15: the energy selector — a band-passed arpeggio sweeps through the chord, only one band gets through
  D(15, 0, 'kick', 0.85); D(15, 2, 'kick', 0.7); D(15, 1, 'clap', 0.45); D(15, 3, 'clap', 0.45); hats(15, 0.35, true); sub(15, 0.6); spiral(15, 'bparp', 0.45, 4, 16); pad(15, 0.3, 1100);
  // bars 16–17: focused — a tight, centred groove
  for (const b of [16, 17]) { kick4(b, 0.95); claps(b, 0.55); hats(b, 0.4, true); bassPulse(b, 0.65); pad(b, 0.28, 1500); }
  motif(16, 'pluck', 0.7); for (let i = 0; i < 4; i++) stab(17, i, 0.35);
  // bar 18: the dipole — a wide sweep into the gantry
  kick4(18, 0.9); hats(18, 0.4); bassOff(18, 0.6); E({ t: at(18, 0), d: 3.9 * BEAT, k: 'pad', ms: triad('D', 3).concat([nm('A', 4)]), v: 0.4, cut: 700, cutTo: 3000 }); roll(18, 3, 4, 0.125, 0.3, 0.7, 'tom');
  // ---- E: the gantry (bars 19–22)
  for (const b of [19, 20]) { D(b, 0, 'kick', 1.0); D(b, 0.75, 'kick', 0.5); D(b, 2, 'kick', 0.85); D(b, 2.75, 'kick', 0.45); D(b, 1, 'clap', 0.6); D(b, 3, 'clap', 0.6); hats(b, 0.36, true); bassLong(b, 0.7); E({ t: at(b, 0), d: 3.9 * BEAT, k: 'supersaw', ms: triad(ch(b), 3).concat([root(b, 4)]), v: 0.32 }); }
  motif(19, 'starlead', 0.6, { only: i => i !== 2 });
  // bar 21: the X-ray check — sparse, room for the buzzes and the alignment click
  D(21, 0, 'kick', 0.8); D(21, 2.5, 'kick', 0.5); hats(21, 0.25); pad(21, 0.4, 1200); sub(21, 0.55);
  // bar 22: the nozzle scans — plucks on every eighth, with the spots
  kick4(22, 0.9); claps(22, 0.5); hats(22, 0.4, true); bassPulse(22, 0.6); for (let i = 0; i < 8; i++) E({ t: at(22, i * 0.5), d: 0.4 * BEAT, k: 'pluck', m: triad('D', 5)[i % 3] + (i > 3 ? 12 : 0), v: 0.4 });
  // ---- F: into the patient (bars 23–30)
  for (const b of [23, 24]) { kick4(b, 1.0); claps(b, 0.6); hats(b, 0.45, true, true); bassRoll(b, 0.65); pad(b, 0.26, 1700); }
  motif(23, 'laser', 0.6, { cut: 3200 }); spiral(24, 'sqarp', 0.3, 5, 8);
  // bars 25–27: the molecular slow motion (the band is low-passed; see bandFilter), then the build as the proton slows
  for (const b of [25, 26]) { halfTime(b, 0.9); pad(b, 0.45, 1300); sub(b, 0.6); }
  motif(25, 'glass', 0.5, { only: i => i % 2 === 0 }); motif(26, 'glass', 0.45, { lift: 1, only: i => i > 2 });
  kick4(27, 1.0); claps(27, 0.6); hats(27, 0.5, true); bassRoll(27, 0.75); spiral(27, 'chiparp', 0.35, 5, 16);
  roll(27, 0, 2, 0.25, 0.2, 0.5); roll(27, 2, 3.75, 0.125, 0.5, 0.9); E({ t: at(27, 0), d: 4 * BEAT - 0.125, k: 'riser', v: 0.75 });
  // ---- second climax (bar 28): the proton stops — the Bragg peak
  E({ t: 54.0, d: 2.4, k: 'impact', v: 0.9 }); E({ t: 54.0, d: 2.0, k: 'crash', v: 0.75 });
  kick4(28, 1.0); claps(28, 0.7); hats(28, 0.5, false, true); bassOff(28, 0.85);
  E({ t: at(28, 0), d: 3.8 * BEAT, k: 'supersaw', ms: triad('Em', 4).concat([nm('B', 4), nm('E', 5)]), v: 0.62 });
  motif(28, 'laser', 0.8, { cut: 5600 }); motif(28, 'glass', 0.35, { lift: 1 });
  // bars 29–30: the graph — a confident groove; the stabs land with the two shifts (58.0, 59.0)
  for (const b of [29, 30]) { kick4(b, 0.95); claps(b, 0.55); hats(b, 0.42, true); bassOff(b, 0.7); pad(b, 0.3, 1600); }
  motif(29, 'pluck', 0.7); stab(30, 0, 0.5); stab(30, 2, 0.5);
  // ---- G: the plan and the scanning (bars 31–36)
  D(31, 0, 'kick', 0.85); D(31, 2, 'kick', 0.6); hats(31, 0.3, true); pad(31, 0.42, 1300); sub(31, 0.55); motif(31, 'glass', 0.55);
  kick4(32, 0.9); claps(32, 0.5); hats(32, 0.4, true, false, 2); bassPulse(32, 0.6); spiral(32, 'chiparp', 0.32, 5, 16);
  for (const b of [33]) { kick4(b, 0.95); claps(b, 0.55); hats(b, 0.45, true); bassRoll(b, 0.65); spiral(b, 'chiparp', 0.34, 5, 16); }
  motif(33, 'pluck', 0.65);
  // bar 34: the dose covers the tumour, then into the cell
  kick4(34, 0.9); claps(34, 0.5); hats(34, 0.4); bassOff(34, 0.6); E({ t: at(34, 0), d: 3.9 * BEAT, k: 'supersaw', ms: triad('D', 4).concat([nm('A', 5)]), v: 0.36 });
  // bar 35: DNA damage — tension, sparse
  D(35, 0, 'kick', 0.8); D(35, 2.5, 'kick', 0.5); E({ t: at(35, 0), d: 3.9 * BEAT, k: 'pad', ms: [nm('C', 3), nm('G', 3), nm('B', 3), nm('E', 4)], v: 0.45, cut: 1000 }); sub(35, 0.55); hats(35, 0.25);
  // bar 36: the finish — a bright E-major chord, the motif in E major, a riser into bar 1 (the loop)
  E({ t: 70.0, d: 1.6, k: 'crash', v: 0.5 }); kick4(36, 0.85); claps(36, 0.5); hats(36, 0.4, true); bassOff(36, 0.6);
  E({ t: at(36, 0), d: 3.8 * BEAT, k: 'supersaw', ms: [nm('E', 4), nm('G#', 4), nm('B', 4), nm('E', 5)], v: 0.5 });
  motif(36, 'glass', 0.55, { major: true, lift: 1 }); motif(36, 'pluck', 0.45, { major: true });
  roll(36, 3, 4, 0.125, 0.25, 0.65); E({ t: at(36, 2), d: 2 * BEAT, k: 'riser', v: 0.5 });
  return ev;
}
// ---------------------------------------------------------------- SFX map: read from the event table (EV), one sound per physical event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440, d: 0.2 }, x || {}));
  // A — activation, the reveal, the target lock, one proton: its zip, the interaction ticks, the stop
  S(EV.power, 'activate', 1.0, { d: 0.7 }); S(EV.armed, 'ready', 0.7);
  S(EV.reveal, 'scan', 0.6, { d: 0.45 }); S(EV.target, 'lock', 0.85); S(EV.align, 'tick', 0.6);
  S(EV.shot, 'zip', 0.9, { d: 0.3 });
  EV.ticks3.forEach((tt, i) => S(tt, 'itick', 0.55 + 0.1 * i, { f: 3400 - 300 * i, p: (i % 2 ? 0.15 : -0.15) }));
  S(EV.stop3, 'impact', 1.0);
  // B — the pull back, the plant, the dive into the gas, the ionisation, the injection
  S(EV.back, 'whoosh', 0.55, { d: 0.6 }); S(EV.plan, 'hum', 0.5, { d: 1.5 }); S(EV.cyclo, 'reveal', 0.7);
  S(EV.dive, 'dive', 0.7, { d: 0.9 }); S(EV.gas, 'sparkle', 0.5, { d: 0.6 }); S(EV.atom, 'ping', 0.6, { f: fq('B', 5) });
  S(EV.fast, 'zap', 0.7, { d: 0.5 }); S(EV.ionize, 'ionclick', 1.0); S(EV.bare, 'glowup', 0.65);
  S(EV.pull, 'pull', 0.6, { d: 0.45 }); EV.inject.forEach((ti, i) => S(ti, 'inject', 0.7, { f: pent(10 + i, 4), p: -0.2 + 0.13 * i }));
  // C — the cyclotron: magnet, RF, injection; an RF kick on every gap crossing, rising with the energy
  S(EV.cycView, 'whoosh', 0.45, { d: 0.5, rev: 1 }); S(EV.magOn, 'magon', 0.75, { d: 1.2 }); S(EV.rfOn, 'rfon', 0.5, { d: 0.6 }); S(EV.inj, 'blip', 0.6, { f: fq('E', 5) });
  EV.gaps.forEach((tg, i) => { const lapse = tg >= 20.0; S(tg, 'rfkick', lapse ? 0.5 + 0.012 * i : 0.85, { f: scl(Math.min(i, 13) + (lapse ? Math.floor((i - 12) / 3) : 0), 4), p: (i % 2 ? 0.25 : -0.25), short: tg >= 22.0 }); });
  S(EV.force, 'tick', 0.55); S(EV.gaps[6], 'orbit', 0.4, { d: 3.0 }); S(EV.noGain, 'flat', 0.5, { d: 0.35 });
  S(EV.gaps[14], 'rise', 0.5, { d: 2.9 });
  S(EV.deflect, 'deflect', 0.6, { d: 0.5 }); S(EV.extract, 'exit', 1.0, { d: 1.2 });
  // D — degrader ticks and the slow-down, the selector (fan, slit knocks, the selected band), focusing tones, the dipole sweep
  EV.mat.forEach((tm, i) => S(tm, 'mat', 0.55, { f: 2400 - 90 * i, p: (i % 2 ? 0.3 : -0.3) }));
  S(EV.slow, 'slowdown', 0.7, { d: 0.6 });
  S(EV.ess, 'magon', 0.55, { d: 0.8 }); S(EV.fan, 'fan', 0.55, { d: 0.5 });
  EV.slits.forEach((ts, i) => S(ts, 'reject', 0.8, { p: [-0.5, 0.5, -0.3][i] })); S(EV.pass, 'pass', 0.7);
  EV.quads.forEach((tq, i) => S(tq, 'focus', 0.65, { d: 0.6, stage: i }));
  S(EV.bend, 'dipole', 0.8, { d: 1.4 }); S(EV.bendOut, 'whoosh', 0.4, { d: 0.5 });
  // E — the gantry turns and locks, the X-ray check, the couch correction, ALIGNED; the nozzle scans eight spots
  S(EV.toGantry, 'whoosh', 0.45, { d: 0.6, rev: 1 }); S(EV.rotate, 'servo', 0.85, { d: EV.locked - EV.rotate }); S(EV.locked, 'clunk', 1.0);
  EV.xray.forEach((tx, i) => S(tx, 'xray', 0.75, { p: i ? 0.3 : -0.3 })); S(EV.compare, 'beep2', 0.55); S(EV.shift, 'couch', 0.6, { d: 0.4 }); S(EV.aligned, 'aligned', 0.9);
  S(EV.nozzle, 'whoosh', 0.5, { d: 0.5 });
  EV.spots19.forEach((ts, i) => S(ts, 'spot', 0.7, { f: pent(8 + (i % 4), 4), p: [-0.4, -0.15, 0.15, 0.4, 0.4, 0.15, -0.15, -0.4][i] }));
  // F — protons entering, ionisation clicks (faster and faster as the proton slows), the stop, many protons, the curve, the peak; the graph shifts
  EV.enter.forEach((te, i) => S(te, 'enter', 0.5, { p: (i % 2 ? 0.25 : -0.25) }));
  EV.ion21.forEach((ti, i) => S(ti, 'ion', 0.8, { f: pent(9 + i, 4), p: (i % 2 ? 0.35 : -0.35) }));
  EV.ion22.forEach((ti, i) => S(ti, 'ion', 0.6 + 0.03 * i, { f: pent(8 - Math.floor(i / 2), 4), p: (i % 2 ? 0.3 : -0.3), small: i > 7 }));
  S(EV.stop, 'stop', 1.0, { d: 1.2 }); S(EV.many, 'many', 0.5, { d: 1.5 }); S(EV.curve, 'curve', 0.55, { d: 0.8 }); S(EV.peak, 'peak', 0.75);
  S(EV.graphRot, 'whoosh', 0.4, { d: 0.5 }); S(EV.lower, 'shift', 0.75, { dir: -1 }); S(EV.higher, 'shift', 0.75, { dir: 1 });
  // G — the plan: model, layer select, energy set; scanning ticks, layer steps, time-lapse, covered; DNA damage; the recap and the finish
  S(EV.model, 'bloop', 0.6, { f: fq('E', 4) }); S(EV.layer, 'select', 0.8); S(EV.energySet, 'eset', 0.7);
  [EV.spotsL1, EV.spotsL2, EV.spotsL3].forEach((list, L) => list.forEach((ts, i) => S(ts, 'scantick', 0.42, { f: [3200, 2700, 2300][L] * (1 + 0.04 * (i % 3)), p: ((i % 4) - 1.5) * 0.2 })));
  S(EV.layer2, 'layer', 0.75, { d: 0.45 }); S(EV.layer3, 'layer', 0.75, { d: 0.45 }); S(EV.lapse, 'lapse', 0.5, { d: 0.5 }); S(EV.covered, 'covered', 0.8);
  S(EV.dna, 'dive', 0.55, { d: 0.6 }); S(EV.electron, 'zip', 0.55, { d: 0.25 }); S(EV.direct, 'break', 0.95, { p: -0.2 }); S(EV.radical, 'radical', 0.65, { p: 0.3 });
  S(EV.attack, 'swell', 0.45, { d: 0.25 }); S(EV.indirect, 'break', 0.95, { p: 0.15 }); S(EV.lesion, 'lesion', 0.55, { d: 0.7 });
  S(EV.final, 'whoosh', 0.5, { d: 0.6, rev: 1 }); EV.recap.forEach((tr, i) => S(tr, 'pop', 0.65, { f: pent(5 + i, 4), p: -0.3 + 0.15 * i })); S(EV.title, 'complete', 0.9);
  return ev;
}
// how far the band dips under each SFX (the SFX lead)
const DUCK = { impact: 0.45, stop: 0.5, exit: 0.45, clunk: 0.4, ionclick: 0.35, lock: 0.25, aligned: 0.3, rfkick: 0.12, itick: 0.15, ion: 0.15, mat: 0.18, break: 0.35, reject: 0.2, pass: 0.15, focus: 0.15,
  spot: 0.15, shift: 0.25, select: 0.2, layer: 0.2, covered: 0.25, complete: 0.35, xray: 0.2, scantick: 0.08, inject: 0.15, glowup: 0.15, ping: 0.15, peak: 0.25, pop: 0.18, activate: 0.3, zip: 0.2, radical: 0.15, lesion: 0.2 };
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
function bpArpFn(f, d, t0) { let p = 0; const F = bpf(), dt = f / SR; return t => { p += dt; if (p >= 1) p -= 1; const v = 2 * p - 1 - blep(p, dt); const fc = 500 + 3500 * (0.5 + 0.5 * Math.sin(TAU * 0.5 * (t0 + t))); return F(v, fc, 0.25) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t * 6) * rel(t, d, 0.03); }; }
function tomFn(seed) { let p = 0; return (t, k) => { p += (95 + 60 * Math.exp(-t * 25)) / SR; return fsin(TAU * p) * Math.exp(-t * 14) + (t < 0.004 ? nz(k + seed) * 0.2 : 0); }; }
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
    case 'bass': case 'roll': case 'sub': voice(L, R, e.t, e.d + 0.05, 0, (k === 'sub' ? 0.042 : 0.115) * v, bassFn(mtof(e.m), e.d, k), { duck: k !== 'sub' }); break;
    case 'kick': voice(L, R, e.t, 0.5, 0, 0.33 * v, kickFn(sd)); break;
    case 'clap': voice(L, R, e.t, 0.35, 0.05, 0.34 * v, clapFn(sd), { send: 0.22 }); break;
    case 'snap': voice(L, R, e.t, 0.15, 0.1, 0.3 * v, snapFn(sd), { send: 0.25 }); break;
    case 'snare': voice(L, R, e.t, 0.3, -0.05, 0.24 * v, snareFn(sd), { send: 0.18 }); break;
    case 'hat': voice(L, R, e.t, e.open ? 0.3 : 0.08, e.p || 0, 0.28 * v, hatFn(sd, e.open)); break;
    case 'shaker': voice(L, R, e.t, 0.12, e.p || 0, 0.13 * v, shakerFn(sd)); break;
    case 'crash': voice(L, R, e.t, e.d, 0, 0.14 * v, crashFn(sd), { send: 0.25 }); break;
    case 'riser': voice(L, R, e.t, e.d, 0, 0.18 * v, riserFn(e.d, sd), { send: 0.3 }); break;
    case 'down': voice(L, R, e.t, e.d, 0, 0.18 * v, downFn(e.d, sd), { send: 0.4 }); break;
    case 'impact': voice(L, R, e.t, e.d, 0, 0.3 * v, impactFn(sd), { send: 0.2 }); break;
    case 'bparp': voice(L, R, e.t, e.d + 0.05, e.p || 0, 0.16 * v, bpArpFn(mtof(e.m), e.d, e.t), { send: 0.15, echo: 0.2 }); break;
    case 'tom': voice(L, R, e.t, 0.35, 0.1, 0.32 * v, tomFn(sd), { send: 0.2 }); break;
  }
}
// ---------------------------------------------------------------- SFX: one sound per physical event, tuned to E minor
function playSfx(e, L, R) {
  const k = e.k, v = e.v * 1.25, f = e.f || 440, p = e.p || 0, d = e.d || 0.2, sd = Math.round(e.t * 1000);
  const V = (t0, dur, g, fn, snd, pan) => voice(L, R, t0, dur, pan === undefined ? p : pan, g * v, fn, { send: snd === undefined ? 0.2 : snd });
  const sine = (fAt, envFn) => { let ph = 0; return t => { ph += fAt(t) / SR; ph -= Math.floor(ph); return fsin(TAU * ph) * envFn(t); }; };
  const saw = (fAt, envFn, cut) => { let ph = 0; const F = lpf(); return t => { const fr = fAt(t), dt = fr / SR; ph += dt; if (ph >= 1) ph -= 1; return F(2 * ph - 1 - blep(ph, dt), cut ? cut(t) : 3000, 0.6) * envFn(t); }; };
  const bell = (f0, r, idx) => { let pc = 0, pm = 0; return t => { pc += f0 / SR; pm += f0 * 3.5 / SR; pc -= Math.floor(pc); pm -= Math.floor(pm); return fsin(TAU * pc + idx * Math.exp(-t * 8) * fsin(TAU * pm)) * Math.exp(-t * r) * (t < 0.002 ? t / 0.002 : 1); }; };
  const noiseLP = (cutAt, envFn, seed) => { let lp = 0, lp2 = 0; return (t, kk) => { const a = 1 - Math.exp(-TAU * cutAt(t) / SR); lp += a * (nz(kk * 7 + seed) - lp); lp2 += a * (lp - lp2); return lp2 * envFn(t); }; };
  const noiseBP = (fcAt, q, envFn, seed) => { const F = bpf(); return (t, kk) => F(nz(kk * 13 + seed), fcAt(t), q) * envFn(t); };
  const swell = dd => t => Math.sin(Math.PI * clamp(t / dd, 0, 1));
  const att = (a, r) => t => (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) * r);
  const edge = (dd, a, r) => t => Math.min(1, t / a) * Math.min(1, Math.max(0, dd - t) / r);
  const click = (t0, g, len, seed, snd) => V(t0, len, g, (t, kk) => nz(kk * 3 + seed) * (1 - t / len) * (1 - t / len), snd === undefined ? 0.08 : snd);
  switch (k) {
    // the gantry wakes: a mechanical clunk, a sub sweep up and a rising machine hum
    case 'activate': click(e.t, 0.7, 0.02, sd); V(e.t, 0.3, 0.45, sine(t => 48 + 30 * Math.exp(-t * 20), dec(8)), 0.1); V(e.t, d, 0.26, sine(t => 36 + 40 * clamp(t / d, 0, 1), edge(d, 0.05, 0.2)), 0.15); V(e.t, d, 0.16, saw(t => 110 * (1 + 0.5 * clamp(t / d, 0, 1)), edge(d, 0.15, 0.25), t => 400 + 2400 * clamp(t / d, 0, 1)), 0.3); break;
    case 'ready': V(e.t, 0.12, 0.3, bell(fq('B', 5), 18, 0.6), 0.3); V(e.t + 0.08, 0.3, 0.3, bell(fq('E', 6), 10, 0.6), 0.35); break;
    case 'scan': V(e.t, d, 0.2, noiseBP(t => 400 * Math.pow(10, t / d), 0.4, swell(d), sd), 0.35); V(e.t, d, 0.08, sine(t => 900 + 1400 * t / d, swell(d)), 0.3); break;
    // the target locks: three quick beeps and a click
    case 'lock': [0, 0.06, 0.12].forEach((o, i) => V(e.t + o, 0.07, 0.34, sine(() => i < 2 ? fq('E', 6) : fq('B', 6), att(0.002, 30)), 0.2)); click(e.t, 0.35, 0.008, sd); break;
    case 'tick': click(e.t, 0.45, 0.01, sd); V(e.t, 0.05, 0.25, sine(() => 2200, dec(90)), 0.1); break;
    // one proton: a fast zip down, ticks of energy deposited, then a controlled stop
    case 'zip': V(e.t, d, 0.34, sine(t => 3200 * Math.pow(0.28, t / d), att(0.002, 9)), 0.25); V(e.t, d, 0.12, noiseLP(t => 6000 * Math.pow(0.2, t / d), swell(d), sd), 0.25); break;
    case 'itick': click(e.t, 0.45, 0.006, sd); V(e.t, 0.06, 0.3, noiseBP(() => f, 0.25, dec(70), sd + 1), 0.1); V(e.t, 0.07, 0.22, sine(() => f * 0.5, dec(60)), 0.1); break;
    case 'impact': V(e.t, 0.5, 0.55, sine(t => 48 + 60 * Math.exp(-t * 18), dec(6)), 0.12); V(e.t, 0.02, 0.35, (t, kk) => nz(kk * 9 + sd) * (1 - t / 0.02), 0.05); V(e.t, 0.9, 0.12, sine(() => fq('E', 3), att(0.01, 3)), 0.4); V(e.t, 0.9, 0.1, sine(() => fq('B', 3), att(0.01, 3)), 0.4); break;
    case 'whoosh': V(e.t, d, 0.22, noiseLP(t => e.rev ? 6000 - 5000 * t / d : 900 + 4000 * Math.sin(Math.PI * t / d), swell(d), sd), 0.3); break;
    // the plant: an industrial hum under the reveal of the cyclotron
    case 'hum': V(e.t, d, 0.085, t => (fsin(TAU * 50 * t) + 0.5 * fsin(TAU * 100 * t) + 0.25 * fsin(TAU * 150 * t)) * edge(d, 0.3, 0.6)(t), 0.2); V(e.t, d, 0.06, noiseLP(() => 500, edge(d, 0.3, 0.6), sd), 0.3); break;
    case 'reveal': V(e.t, 1.2, 0.3, bell(fq('E', 3), 2.6, 1.4), 0.45); V(e.t, 0.5, 0.3, sine(t => 82 * (1 + 0.3 * Math.exp(-t * 10)), dec(5)), 0.2); break;
    // the dive to atomic scale: a falling sweep that turns into a sparkle
    case 'dive': V(e.t, d, 0.26, noiseLP(t => 7000 * Math.pow(0.06, t / d), swell(d), sd), 0.3); V(e.t, d, 0.16, sine(t => 1600 * Math.pow(0.25, t / d), swell(d)), 0.35); break;
    case 'sparkle': for (let i = 0; i < 10; i++) V(e.t + d * hash(sd + i), 0.25, 0.12, bell(pent(10 + (i * 3) % 6, 4), 14, 0.5), 0.45, (hash(sd + i + 50) - 0.5) * 1.4); break;
    case 'ping': V(e.t, 0.6, 0.3, bell(f, 6, 0.7), 0.4); break;
    // ionisation: a fast electron buzzes in, a crisp click, the freed electron's blip flies off
    case 'zap': V(e.t, d, 0.16, saw(t => 900 + 1800 * clamp(t / d, 0, 1), swell(d), () => 4000), 0.25, -0.4); break;
    case 'ionclick': click(e.t, 0.85, 0.01, sd, 0.1); V(e.t, 0.05, 0.4, noiseBP(() => 4200, 0.2, dec(80), sd), 0.15); V(e.t + 0.01, 0.25, 0.32, sine(t => 1200 * (1 + 2 * Math.min(1, t / 0.2)), att(0.003, 10)), 0.3, 0.4); break;
    case 'glowup': V(e.t, 1.0, 0.18, bell(fq('E', 5), 3, 0.8), 0.5); V(e.t + 0.03, 1.0, 0.14, bell(fq('B', 5), 3, 0.8), 0.5); break;
    case 'pull': V(e.t, d, 0.3, saw(() => 82, edge(d, 0.02, 0.2), t => 300 + 1500 * Math.exp(-t * 6)), 0.2); break;
    case 'inject': V(e.t, 0.14, 0.36, sine(t => f * (1.5 - 0.5 * Math.min(1, t / 0.06)), att(0.002, 22)), 0.25); click(e.t, 0.25, 0.006, sd); break;
    // the cyclotron: the magnet's deep hum, the RF switching on, a tiny blip as the proton enters
    case 'magon': V(e.t, d, 0.17, sine(() => 41, edge(d, 0.3, 0.4)), 0.1); V(e.t, d, 0.14, sine(() => 82, edge(d, 0.3, 0.4)), 0.15); V(e.t, d, 0.05, sine(() => 164, edge(d, 0.3, 0.4)), 0.2); break;
    case 'rfon': V(e.t, d, 0.07, saw(() => 880, t => edge(d, 0.05, 0.3)(t) * (0.6 + 0.4 * fsin(TAU * 8 * t)), () => 5000), 0.25); break;
    case 'blip': V(e.t, 0.12, 0.3, sine(t => f * (1 + Math.min(1, t / 0.08)), att(0.002, 25)), 0.25); break;
    // an RF kick: an electric zap at the gap, one scale step higher per crossing (more energy)
    case 'rfkick': { const L_ = e.short ? 0.06 : 0.12; click(e.t, e.short ? 0.25 : 0.4, 0.004, sd); V(e.t, L_, 0.42, (t) => { const m = fsin(TAU * f * 2.01 * t) * 2.2 * Math.exp(-t * 40); return fsin(TAU * f * t + m) * Math.exp(-t * (e.short ? 50 : 26)); }, 0.18); V(e.t, L_, 0.14, noiseBP(() => f * 4, 0.3, dec(90), sd), 0.1); break; }
    case 'orbit': V(e.t, d, 0.07, noiseLP(t => 900 + 700 * Math.sin(TAU * t), edge(d, 0.3, 0.5), sd), 0.4); break;
    case 'flat': V(e.t, d, 0.22, sine(() => fq('A', 4), edge(d, 0.01, 0.05)), 0.2); break;
    case 'rise': V(e.t, d, 0.1, sine(t => 300 * Math.pow(6, t / d), edge(d, 0.4, 0.1)), 0.3); break;
    // extraction: a crackle of high voltage, then the strong exit sweep with a sub hit
    case 'deflect': for (let i = 0; i < 14; i++) V(e.t + d * hash(sd + i), 0.01, 0.22, (t, kk) => nz(kk * 5 + sd + i) * (1 - t / 0.01), 0.1, (hash(sd + i + 3) - 0.5) * 0.8); V(e.t, d, 0.08, noiseBP(() => 5000, 0.4, swell(d), sd), 0.2); break;
    case 'exit': V(e.t, d, 0.34, noiseLP(t => 400 + 7000 * Math.sin(Math.PI * Math.min(1, t / d * 1.4)) * (1 - t / d), edge(d, 0.01, 0.6), sd), 0.3); V(e.t, 0.6, 0.38, sine(t => 1400 * Math.pow(0.12, Math.min(1, t / 0.6)), att(0.003, 3)), 0.3); V(e.t, 0.45, 0.45, sine(t => 52 + 70 * Math.exp(-t * 20), dec(7)), 0.1); break;
    // the degrader: graphite ticks, lower and lower; the energy falls
    case 'mat': click(e.t, 0.3, 0.005, sd + 5); V(e.t, 0.05, 0.5, noiseBP(() => f, 0.35, dec(100), sd), 0.15); V(e.t, 0.06, 0.26, sine(() => f * 0.25, dec(70)), 0.1); break;
    case 'slowdown': V(e.t, d, 0.22, saw(t => 640 * Math.pow(0.5, t / d), edge(d, 0.01, 0.2), () => 2200), 0.3); break;
    // the selector: energies fan out, off-energy protons knock on the slit jaws, the selected band rings clean
    case 'fan': for (let i = 0; i < 5; i++) V(e.t + i * 0.05, 0.3, 0.16, bell(pent(8 + i, 4), 10, 0.5), 0.35, (i - 2) * 0.4); break;
    case 'reject': V(e.t, 0.12, 0.42, sine(t => 260 * (1 + 0.6 * Math.exp(-t * 60)), dec(30)), 0.15); click(e.t, 0.3, 0.006, sd); break;
    case 'pass': V(e.t, 0.8, 0.3, bell(fq('E', 6), 5, 0.4), 0.45); break;
    // focusing: two tones (the two planes) glide together; the third time they meet in unison
    case 'focus': { const a = e.stage === 2 ? 1 : 0.5, f1 = fq('B', 4), f2 = fq('E', 5); V(e.t, d, 0.2, sine(t => lerp(f1 * 0.84, f1, a * Math.min(1, t / 0.3)), edge(d, 0.01, 0.2)), 0.3, -0.3); V(e.t, d, 0.2, sine(t => lerp(f2 * 1.12, e.stage === 2 ? f1 * 2 : f2, a * Math.min(1, t / 0.3)), edge(d, 0.01, 0.2)), 0.3, 0.3); if (e.stage === 2) V(e.t + 0.3, 0.8, 0.22, bell(fq('B', 5), 4, 0.6), 0.45); break; }
    // the dipole: a deep sweep around the bend
    case 'dipole': V(e.t, d, 0.36, sine(t => 220 * Math.pow(0.4, t / d), edge(d, 0.05, 0.5)), 0.25); V(e.t, d, 0.12, noiseLP(t => 2500 * Math.pow(0.25, t / d), edge(d, 0.05, 0.6), sd), 0.35); break;
    // the gantry: a heavy servo whine with gear ripple, then the lock
    case 'servo': V(e.t, d, 0.2, saw(t => 70 + 50 * Math.sin(Math.PI * clamp(t / d, 0, 1)), t => edge(d, 0.15, 0.25)(t) * (0.8 + 0.2 * fsin(TAU * 31 * t)), () => 900), 0.15); V(e.t, d, 0.12, noiseLP(() => 260, edge(d, 0.2, 0.3), sd), 0.2); break;
    case 'clunk': V(e.t, 0.3, 0.55, sine(t => 72 * (1 + 0.8 * Math.exp(-t * 30)), dec(12)), 0.12); click(e.t, 0.6, 0.012, sd); V(e.t + 0.012, 0.25, 0.22, bell(fq('E', 4), 16, 1.2), 0.25); break;
    // X-ray check: two short buzzes, a comparison beep, the couch's small move, the alignment confirmed
    case 'xray': V(e.t, 0.22, 0.2, saw(() => 120, edge(0.22, 0.005, 0.03), () => 1800), 0.15); click(e.t, 0.35, 0.006, sd); break;
    case 'beep2': V(e.t, 0.08, 0.3, sine(() => fq('B', 5), att(0.002, 20)), 0.2); V(e.t + 0.09, 0.08, 0.3, sine(() => fq('G', 5), att(0.002, 20)), 0.2); break;
    case 'couch': V(e.t, d, 0.12, saw(t => 220 + 60 * Math.sin(Math.PI * t / d), edge(d, 0.05, 0.08), () => 1500), 0.15); break;
    case 'aligned': click(e.t, 0.6, 0.01, sd); V(e.t + 0.01, 0.12, 0.34, sine(() => fq('E', 6), att(0.002, 14)), 0.3); V(e.t + 0.11, 0.4, 0.34, sine(() => fq('B', 6), att(0.002, 7)), 0.35); break;
    // scanning: a quick servo glide and a monitor click per spot
    case 'spot': click(e.t, 0.4, 0.006, sd); V(e.t, 0.09, 0.22, sine(t => f * (0.8 + 0.2 * Math.min(1, t / 0.05)), att(0.002, 25)), 0.2); break;
    case 'enter': V(e.t, 0.08, 0.22, noiseBP(() => 6000, 0.5, att(0.002, 40), sd), 0.15); V(e.t, 0.06, 0.12, sine(t => 1800 * (1 - 0.4 * t / 0.06), dec(50)), 0.1); break;
    // ionisation in the molecule view: a tiny click and the electron's blip escaping
    case 'ion': click(e.t, e.small ? 0.35 : 0.5, 0.005, sd); V(e.t, e.small ? 0.06 : 0.14, e.small ? 0.2 : 0.3, sine(t => f * (1 + 1.2 * Math.min(1, t / 0.1)), att(0.002, e.small ? 40 : 18)), 0.25); break;
    // the Bragg peak: a deep, round, satisfying impact with a warm chord
    case 'stop': V(e.t, 0.9, 0.62, sine(t => 40 + 50 * Math.exp(-t * 14), dec(4.5)), 0.12); V(e.t, 0.03, 0.4, (t, kk) => nz(kk * 9 + sd) * (1 - t / 0.03), 0.05); [['E', 3], ['B', 3], ['E', 4], ['G', 4]].forEach(([n, o], i) => V(e.t + i * 0.02, 1.4, 0.1, bell(fq(n, o), 2.2, 0.7), 0.5, -0.3 + 0.2 * i)); break;
    case 'many': for (let i = 0; i < 26; i++) { const tt = e.t + d * (i / 26); V(tt, 0.03, 0.14 + 0.1 * (i / 26), noiseBP(() => 2500 + 1500 * hash(sd + i), 0.3, dec(90), sd + i), 0.15, (hash(sd + i * 3) - 0.5) * 1.2); } break;
    case 'curve': V(e.t, d, 0.16, sine(t => { const u = clamp(t / d, 0, 1); return 300 + 900 * (u < 0.8 ? Math.pow(u / 0.8, 3) : 1 - (u - 0.8) / 0.2 * 0.9); }, edge(d, 0.02, 0.08)), 0.3); break;
    case 'peak': V(e.t, 1.2, 0.26, bell(fq('E', 6), 3, 0.8), 0.5, -0.2); V(e.t + 0.03, 1.2, 0.2, bell(fq('B', 6), 3, 0.8), 0.5, 0.2); break;
    // the graph: the peak moves shallower (a glide down) or deeper (a glide up), with a click
    case 'shift': click(e.t, 0.45, 0.008, sd); V(e.t, 0.35, 0.3, sine(t => fq('B', 4) * Math.pow(e.dir > 0 ? 1.5 : 0.667, Math.min(1, t / 0.25)), att(0.003, 5)), 0.3); break;
    // the plan: digital sounds
    case 'bloop': V(e.t, 0.3, 0.32, sine(t => f * (1 + 0.6 * Math.exp(-t * 18)), att(0.005, 9)), 0.3); break;
    case 'select': click(e.t, 0.4, 0.006, sd); click(e.t + 0.05, 0.4, 0.006, sd + 1); V(e.t + 0.1, 0.15, 0.3, sine(() => fq('E', 6), att(0.002, 16)), 0.25); break;
    case 'eset': for (let i = 0; i < 5; i++) V(e.t + i * 0.04, 0.05, 0.2, sine(() => scl(7 + i, 4), att(0.002, 40)), 0.15); V(e.t + 0.22, 0.3, 0.3, bell(fq('E', 6), 8, 0.5), 0.3); break;
    case 'scantick': V(e.t, 0.025, 0.26, sine(() => f, dec(160)), 0.08); break;
    case 'layer': V(e.t, d, 0.3, sine(t => fq('E', 5) * Math.pow(0.75, Math.min(1, t / 0.08)), att(0.003, 7)), 0.3); V(e.t, d, 0.1, noiseLP(t => 3000 - 2000 * t / d, swell(d), sd), 0.3); break;
    case 'lapse': for (let i = 0; i < 12; i++) V(e.t + d * i / 12, 0.02, 0.2, sine(() => 2000 + 120 * i, dec(160)), 0.08, (i % 2 ? 0.3 : -0.3)); break;
    case 'covered': [['E', 5], ['G', 5], ['B', 5], ['F#', 6]].forEach(([n, o], i) => V(e.t + i * 0.035, 1.3, 0.13, bell(fq(n, o), 2.6, 0.8), 0.55, -0.3 + 0.2 * i)); break;
    // DNA: strand snaps, the radical's bubbly blip, a low dissonance when both strands are broken
    case 'break': click(e.t, 0.75, 0.006, sd, 0.12); V(e.t, 0.06, 0.4, noiseBP(() => 3000, 0.25, dec(55), sd + 2), 0.2); V(e.t + 0.01, 0.12, 0.25, sine(t => 900 * (1 - 0.5 * t / 0.12), dec(25)), 0.2); break;
    case 'radical': V(e.t, 0.25, 0.3, sine(t => 500 * (1 + 0.5 * fsin(TAU * 22 * t)) * (1 + t * 2), att(0.004, 10)), 0.3); break;
    case 'swell': V(e.t, d, 0.12, noiseLP(t => 600 + 1600 * t / d, swell(d), sd), 0.3); break;
    case 'lesion': V(e.t, d, 0.16, t => (fsin(TAU * fq('E', 3) * t) + fsin(TAU * fq('F', 3) * t)) * 0.5 * edge(d, 0.02, 0.5)(t), 0.4); break;
    // the recap and the finish: ascending pops, then an E-major completion chord
    case 'pop': V(e.t, 0.16, 0.4, sine(t => f * (1.5 - 0.5 * Math.min(1, t * 40)), att(0.002, 22)), 0.25); break;
    case 'complete': [['E', 5], ['G#', 5], ['B', 5], ['E', 6], ['G#', 6]].forEach(([n, o], i) => V(e.t + i * 0.03, 1.6, 0.13, bell(fq(n, o), 2.2, 0.9), 0.55, -0.4 + 0.2 * i)); V(e.t, 0.6, 0.12, sine(() => fq('E', 3), att(0.01, 4)), 0.3); break;
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
// the molecular slow motion: the whole band is low-passed (from 48.0 s), then the filter opens as the proton slows (the build into 54.0)
const FILT = { a: 48.0, b: 48.4, c: 52.0, d: 53.85, lo: 900 };
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
      const depth = ((e.t >= 24.0 && e.t < 26.0) || (e.t >= 54.0 && e.t < 56.0) || (e.t >= 70.0 && e.t < 72.0) ? 0.55 : 0.4) * e.v, j0 = Math.round(e.t * SR) >> 6, n = Math.round(0.26 * SR) >> 6;
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
