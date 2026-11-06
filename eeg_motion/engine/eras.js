// HOW EEG MACHINES READ YOUR BRAIN — the segment table for the skill engine (engine.js).
// 1080x1920, 60 fps, 55.000 s. Segments are worlds; the camera inside each world is computed from the film time t
// (film/scenes.js), so every transition is drawn live (vector redraw, never an enlarged bitmap).
// Segment starts sit on the sixteenth-note grid of the score (104.73 BPM, film/timeline.js).
window.FILM_SIZE = [1080, 1920];
window.FILM_DURATION = 55;
window.PUNCH = 0;                         // an explainer: no beat-punch zoom on transitions
window.SCENE_LIBS = ['film/timeline.js', 'film/signals.js', 'film/draw.js', 'film/room.js', 'film/cortex.js', 'film/synapse.js', 'film/chain.js', 'film/scenes.js'];
(() => {
  const S16 = 55 / 384, d = (a, b) => (b - a) * S16;   // durations from sixteenth indices
  window.ERAS = [
    { id: 'room_a', dur: d(0, 28) },                                                                                    // S01–S04 the trace, the monitor and patient, the head cutaway
    { id: 'cortex_a', dur: d(28, 63), transition: { type: 'lensReveal', dur: 0.8, lens: t => SCN.lens('room_a', t), ring: [79, 227, 240] } },   // S05–S06 the network, pyramidal neurons
    { id: 'synapse', dur: d(63, 90), transition: { type: 'lensReveal', dur: 0.7, lens: t => SCN.lens('cortex_a', t), ring: [255, 201, 74], ring2: [255, 224, 138] } },   // S07–S08
    { id: 'cortex_b', dur: d(90, 146), transition: { type: 'crossfade', dur: 0.45 } },                                // S09–S12 potentials, population, fields, volume conduction
    { id: 'room_b', dur: d(146, 161), transition: { type: 'crossfade', dur: 0.5 } },                                  // S13 the electrode array
    { id: 'chain', dur: d(161, 258), transition: { type: 'lensReveal', dur: 0.7, lens: t => SCN.lens('room_b', t), ring: [232, 238, 242], ring2: [79, 227, 240] } },   // S14–S20 the signal chain
    { id: 'room_c', dur: d(258, 384), transition: { type: 'matchCut', dur: 0.6, at: 0.5, width: 0.16 } },             // S21–S27 the recording, alpha, the loop
  ];
})();
