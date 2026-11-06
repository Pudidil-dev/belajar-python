'use strict';
// Audio QA (numbers, not a listening test): renders the music-only and SFX-only stems plus the SFX list into build/qa/,
// then runs tools/audio_qa.py on the mastered full mix (build/audio_full.wav).   node tools/audio_qa.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const A = require('../audio/audio.js');
const QA = path.join(__dirname, '..', 'build', 'qa'); fs.mkdirSync(QA, { recursive: true });
for (const bus of ['m', 's']) {
  const a = A.renderAudio({ bus }), n = a.L.length, inter = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { inter[2 * i] = a.L[i]; inter[2 * i + 1] = a.R[i]; }
  fs.writeFileSync(path.join(QA, 'stem_' + bus + '.f32'), Buffer.from(inter.buffer));
}
fs.writeFileSync(path.join(QA, 'sfx_events.json'), JSON.stringify(A.sfxEvents().map(e => ({ t: e.t, k: e.k, d: e.d || 0.15 }))));
console.log('music events', A.musicEvents().length, '| sfx events', A.sfxEvents().length);
execFileSync('python3', [path.join(__dirname, 'audio_qa.py'), QA, path.join(__dirname, '..', 'build', 'audio_full.wav')], { stdio: 'inherit' });
