'use strict';
// Export. The picture is rendered ONCE per frame: each of the 3780 frames of the 360x640 pixel canvas is drawn
// without text (the clean version), copied, and then the text layer is drawn on top (the labeled version);
// both streams go to ffmpeg, scaled exactly 3x nearest-neighbour to 1080x1920 @ 60 fps, H.264 yuv420p BT.709.
// The soundtrack is synthesised in three renders (full mix, music only, SFX only) and mastered with one common
// gain (-22 LUFS full mix: room for a voice-over), then every variant is muxed:
//
//   output/Diabetic_PAD_CTA_Labeled.mp4            English labels, music + SFX
//   output/Diabetic_PAD_CTA_Labeled_No_Music.mp4   English labels, SFX only
//   output/Diabetic_PAD_CTA_Labeled_No_SFX.mp4     English labels, music only
//   output/Diabetic_PAD_CTA_Labeled_Silent.mp4     English labels, no audio
//   output/Diabetic_PAD_CTA_Clean.mp4              no text, music + SFX (the same four mixes: _No_Music, _No_SFX, _Silent)
//   output/audio/Diabetic_PAD_CTA_Full_Mix.wav, _Music_Only.wav, _SFX_Only.wav   (24-bit, 48 kHz stems)
//
//   node tools/export.js                              everything (--text both --mix all)
//   node tools/export.js --text clean                 only the text-free versions
//   node tools/export.js --mix full,silent            only some mixes (comma-separated: full, nobgm, nosfx, silent)
//   node tools/export.js --labels labels_az.js        labeled version with a translated label file (same format
//                                                     as src/04_labels_en.js); outputs get the suffix _az
//   node tools/export.js --audio-only                 only the three WAVs
//   node tools/export.js --video-only                 only the silent pictures build/video_labeled.mp4, build/video_clean.mp4
//   node tools/export.js --rerender                   render the pictures again even if they are current
//
// build/video_*.mp4 are reused while they were rendered from the current sources (build/video_*.stamp), so asking
// for another mix later only re-muxes (seconds) instead of rendering the frames again.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { load, toRGB, engineFiles, SRC } = require('./engine');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const OUT = path.join(ROOT, 'output');
const NAME = 'Diabetic_PAD_CTA';
const MIXES = {
  full: { suffix: '', audio: 'full', what: 'music + SFX' },
  nobgm: { suffix: '_No_Music', audio: 'sfx', what: 'SFX only (no background music)' },
  nosfx: { suffix: '_No_SFX', audio: 'music', what: 'music only (no SFX)' },
  silent: { suffix: '_Silent', audio: null, what: 'no audio' },
};
const WAVS = { full: `${NAME}_Full_Mix.wav`, music: `${NAME}_Music_Only.wav`, sfx: `${NAME}_SFX_Only.wav` };
const BUS = { full: undefined, music: 'm', sfx: 's' };

const args = process.argv.slice(2);
const opt = k => args.includes(k);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const mixArg = val('--mix', 'all');
const mixes = mixArg === 'all' ? Object.keys(MIXES) : mixArg.split(',').map(s => s.trim()).filter(Boolean);
for (const m of mixes) if (!MIXES[m]) { console.error(`unknown --mix "${m}" (use full, nobgm, nosfx, silent or all)`); process.exit(2); }
const textArg = val('--text', 'both');
if (!['both', 'labeled', 'clean'].includes(textArg)) { console.error('--text must be labeled, clean or both'); process.exit(2); }
const texts = textArg === 'both' ? ['labeled', 'clean'] : [textArg];
const labelsPath = val('--labels', null) ? path.resolve(val('--labels')) : null;
if (labelsPath && !fs.existsSync(labelsPath)) { console.error('labels file not found: ' + labelsPath); process.exit(2); }
const tag = labelsPath ? '_' + (path.basename(labelsPath).replace(/\.js$/, '').match(/labels_(\w+)$/) || [null, path.basename(labelsPath).replace(/\.js$/, '')])[1] : '';
const outName = (text, m) => `${NAME}_${text === 'labeled' ? 'Labeled' + tag : 'Clean'}${MIXES[m].suffix}.mp4`;
fs.mkdirSync(BUILD, { recursive: true });

const sec = t0 => ((Date.now() - t0) / 1000).toFixed(1) + ' s';

// ---------------------------------------------------------------- audio: three renders, one common gain
function renderAudio() {
  const t0 = Date.now();
  const E = load({ audio: true });
  for (const [k, bus] of Object.entries(BUS)) {
    const a = E.renderAudio({ bus }), n = a.L.length, inter = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { inter[2 * i] = a.L[i]; inter[2 * i + 1] = a.R[i]; }
    fs.writeFileSync(path.join(BUILD, `audio_${k}.f32`), Buffer.from(inter.buffer));
  }
  console.log(`audio synthesised (full mix, music only, SFX only) in ${sec(t0)}`);
  execFileSync('python3', [path.join(__dirname, 'master.py'), BUILD], { stdio: 'inherit' });
  fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
  for (const [k, f] of Object.entries(WAVS)) fs.copyFileSync(path.join(BUILD, `audio_${k}.wav`), path.join(OUT, 'audio', f));
  console.log('wrote', Object.values(WAVS).map(f => 'output/audio/' + f).join(', '));
}

// ---------------------------------------------------------------- pictures: one render loop, two streams
const FF_VIDEO = ['-vf', 'scale=1080:1920:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-profile:v', 'high', '-level', '4.2', '-g', '120',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const videoOf = text => path.join(BUILD, `video_${text}${text === 'labeled' ? tag : ''}.mp4`);
function stampOf(text) {
  const h = crypto.createHash('sha256').update(text);
  for (const f of engineFiles(false)) h.update(f).update(fs.readFileSync(path.join(SRC, f)));
  if (text === 'labeled' && labelsPath) h.update(fs.readFileSync(labelsPath));
  h.update(JSON.stringify(FF_VIDEO));
  return h.digest('hex');
}
function renderVideos(want) {
  const todo = want.filter(text => opt('--rerender') || !fs.existsSync(videoOf(text)) || !fs.existsSync(videoOf(text) + '.stamp') || fs.readFileSync(videoOf(text) + '.stamp', 'utf8') !== stampOf(text));
  for (const text of want) if (!todo.includes(text)) console.log(`picture: ${path.relative(ROOT, videoOf(text))} is current (same sources) — reused`);
  if (!todo.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const E = load({ labels: labelsPath });
    const streams = todo.map(text => {
      const tmp = videoOf(text).replace(/\.mp4$/, '.partial.mp4');
      if (fs.existsSync(videoOf(text) + '.stamp')) fs.unlinkSync(videoOf(text) + '.stamp');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${E.W}x${E.H}`, '-r', String(E.FPS), '-i', '-',
        ...FF_VIDEO, '-frames:v', String(E.NF), '-f', 'mp4', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      return { text, ff, tmp, done: new Promise((res, rej) => { ff.on('error', rej); ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg exit ' + code))); }) };
    });
    Promise.all(streams.map(s => s.done)).then(() => {
      for (const s of streams) { fs.renameSync(s.tmp, videoOf(s.text)); fs.writeFileSync(videoOf(s.text) + '.stamp', stampOf(s.text)); }
      resolve();
    }, reject);
    // frames 0 .. NF-1 at t = f / FPS; each frame is drawn once: clean first, then the text on top of it
    let f = 0; const t0 = Date.now();
    const pump = () => {
      while (f < E.NF) {
        const clean = E.renderPair(f / E.FPS);
        let blocked = null;
        for (const s of streams) {
          const ok = s.ff.stdin.write(toRGB(s.text === 'clean' ? clean : E.getBuf(), E.W, E.H));
          if (!ok) blocked = s;
        }
        f++;
        if (f % 300 === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${f}/${E.NF}  ${el.toFixed(0)} s elapsed, ~${(el / f * (E.NF - f)).toFixed(0)} s left`); }
        if (blocked) { blocked.ff.stdin.once('drain', pump); return; }
      }
      for (const s of streams) s.ff.stdin.end();
    };
    pump();
  });
}

function mux(text, m) {
  const v = MIXES[m], dst = path.join(OUT, outName(text, m));
  const a = v.audio ? ['-i', path.join(BUILD, `audio_${v.audio}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2']
    : ['-map', '0:v:0', '-an'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOf(text), ...a, '-c:v', 'copy', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  console.log(`wrote output/${path.basename(dst)}  (${text === 'labeled' ? 'labels' + (tag ? ' ' + tag.slice(1) : ' English') : 'no text'}, ${v.what})`);
}

(async () => {
  const t0 = Date.now();
  execFileSync('node', [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  const onlyV = opt('--video-only'), onlyA = opt('--audio-only');
  const needAudio = !onlyV && (onlyA || mixes.some(m => MIXES[m].audio));
  if (needAudio) renderAudio();
  if (onlyA) return console.log(`done in ${sec(t0)}`);
  await renderVideos(texts);
  if (onlyV) return console.log(`pictures ready: ${texts.map(x => path.relative(ROOT, videoOf(x))).join(', ')} (${sec(t0)})`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const text of texts) for (const m of mixes) mux(text, m);
  console.log(`done in ${sec(t0)}`);
})().catch(e => { console.error(e); process.exit(1); });
