'use strict';
// Audio QA (numbers, not a listening test): renders the music-only and SFX-only
// stems plus the SFX event list into build/qa/, then runs tools/audio_qa.py.
//   node tools/audio_qa.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { load } = require('./engine');
const QA = path.join(__dirname, '..', 'build', 'qa'); fs.mkdirSync(QA, { recursive: true });
const E = load({ audio: true });
for (const bus of ['m', 's']) {
  const a = E.renderAudio({ bus }), n = a.L.length, inter = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { inter[2 * i] = a.L[i]; inter[2 * i + 1] = a.R[i]; }
  fs.writeFileSync(path.join(QA, 'stem_' + bus + '.f32'), Buffer.from(inter.buffer));
}
fs.writeFileSync(path.join(QA, 'sfx_events.json'), JSON.stringify(E.sfxEvents().map(e => ({ t: e.t, k: e.k, d: e.d || 0.15 }))));
console.log('music events', E.musicEvents().length, '| sfx events', E.sfxEvents().length);
execFileSync('python3', [path.join(__dirname, 'audio_qa.py'), QA, path.join(__dirname, '..', 'build', 'audio.wav')], { stdio: 'inherit' });
