'use strict';
// Export: the picture is rendered ONCE (4320 frames of the 180x320 pixel canvas from the same engine
// code as the player, scaled exactly 6x nearest-neighbour to 1080x1920 @ 60 fps, H.264 yuv420p BT.709),
// the soundtrack is synthesised in three renders (full mix, music only, SFX only) and mastered with one
// common gain, then each variant is muxed:
//
//   output/Pregnancy_Test_Two_Lines.mp4             music + SFX            (--mix full)
//   output/Pregnancy_Test_Two_Lines_No_Music.mp4    SFX only, no BGM       (--mix nobgm)
//   output/Pregnancy_Test_Two_Lines_No_SFX.mp4      music only, no SFX     (--mix nosfx)
//   output/Pregnancy_Test_Two_Lines_Silent.mp4      no audio track         (--mix silent)
//   output/audio/Pregnancy_Test_Two_Lines_Full_Mix.wav, _Music_Only.wav, _SFX_Only.wav (24-bit, 48 kHz)
//
//   node tools/export.js                        everything (default: --mix all)
//   node tools/export.js --mix nobgm,silent     only some variants (comma-separated)
//   node tools/export.js --audio-only           only the three WAVs
//   node tools/export.js --video-only           only the silent picture build/video.mp4
//   node tools/export.js --rerender             render the picture again even if build/video.mp4 is current
//
// build/video.mp4 is reused when it was rendered from the current engine sources (build/video.stamp),
// so asking for another variant later only re-muxes (a few seconds) instead of rendering 4320 frames again.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { load, toRGB, engineFiles, SRC } = require('./engine');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const OUT = path.join(ROOT, 'output');
const NAME = 'Pregnancy_Test_Two_Lines';
const VARIANTS = {
  full: { file: `${NAME}.mp4`, audio: 'full', what: 'music + SFX' },
  nobgm: { file: `${NAME}_No_Music.mp4`, audio: 'sfx', what: 'SFX only (no background music)' },
  nosfx: { file: `${NAME}_No_SFX.mp4`, audio: 'music', what: 'music only (no SFX)' },
  silent: { file: `${NAME}_Silent.mp4`, audio: null, what: 'no audio' },
};
const WAVS = { full: `${NAME}_Full_Mix.wav`, music: `${NAME}_Music_Only.wav`, sfx: `${NAME}_SFX_Only.wav` };
const BUS = { full: undefined, music: 'm', sfx: 's' };

const args = process.argv.slice(2);
const opt = k => args.includes(k);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const mixArg = val('--mix', 'all');
const mixes = mixArg === 'all' ? Object.keys(VARIANTS) : mixArg.split(',').map(s => s.trim()).filter(Boolean);
for (const m of mixes) if (!VARIANTS[m]) { console.error(`unknown --mix "${m}" (use full, nobgm, nosfx, silent or all)`); process.exit(2); }
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

// ---------------------------------------------------------------- picture: rendered once, reused while the sources are unchanged
const FF_VIDEO = ['-vf', 'scale=1080:1920:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-profile:v', 'high', '-level', '4.2', '-g', '120',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
function sourceStamp() {
  const h = crypto.createHash('sha256');
  for (const f of engineFiles(false)) h.update(f).update(fs.readFileSync(path.join(SRC, f)));
  h.update(JSON.stringify(FF_VIDEO));
  return h.digest('hex');
}
function renderVideo() {
  const out = path.join(BUILD, 'video.mp4'), stampFile = path.join(BUILD, 'video.stamp'), stamp = sourceStamp();
  if (!opt('--rerender') && fs.existsSync(out) && fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp) {
    console.log('picture: build/video.mp4 is current (same engine sources) — reused, not rendered again');
    return Promise.resolve(out);
  }
  return new Promise((resolve, reject) => {
    const E = load();
    const tmp = path.join(BUILD, 'video.partial.mp4');
    if (fs.existsSync(stampFile)) fs.unlinkSync(stampFile);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${E.W}x${E.H}`, '-r', String(E.FPS), '-i', '-',
      ...FF_VIDEO, '-frames:v', String(E.NF), '-f', 'mp4', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', code => {
      if (code !== 0) return reject(new Error('ffmpeg exit ' + code));
      fs.renameSync(tmp, out); fs.writeFileSync(stampFile, stamp); resolve(out);
    });
    // frames 0 .. NF-1 at t = f / FPS: the last frame (71.983 s) is the moment just before frame 0, never a copy of it
    let f = 0; const t0 = Date.now();
    const pump = () => {
      while (f < E.NF) {
        E.renderFrame(f / E.FPS);
        const ok = ff.stdin.write(toRGB(E.getBuf(), E.W, E.H));
        f++;
        if (f % 300 === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${f}/${E.NF}  ${el.toFixed(0)} s elapsed, ~${(el / f * (E.NF - f)).toFixed(0)} s left`); }
        if (!ok) { ff.stdin.once('drain', pump); return; }
      }
      ff.stdin.end();
    };
    pump();
  });
}

function mux(video, m) {
  const v = VARIANTS[m], dst = path.join(OUT, v.file);
  const a = v.audio ? ['-i', path.join(BUILD, `audio_${v.audio}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2']
    : ['-map', '0:v:0', '-an'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...a, '-c:v', 'copy', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  console.log(`wrote output/${v.file}  (${v.what})`);
}

(async () => {
  const t0 = Date.now();
  execFileSync('node', [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  const onlyV = opt('--video-only'), onlyA = opt('--audio-only');
  const needAudio = !onlyV && (onlyA || mixes.some(m => VARIANTS[m].audio));
  if (needAudio) renderAudio();
  if (onlyA) return console.log(`done in ${sec(t0)}`);
  const video = await renderVideo();
  if (onlyV) return console.log(`picture ready: build/video.mp4 (${sec(t0)})`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const m of mixes) mux(video, m);
  console.log(`done in ${sec(t0)}`);
})().catch(e => { console.error(e); process.exit(1); });
