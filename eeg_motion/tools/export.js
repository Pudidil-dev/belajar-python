'use strict';
// Export: the picture is rendered ONCE with the skill's renderer (engine/render.py: headless Chromium draws every frame
// of the Canvas engine, 1080x1920 @ 60 fps, H.264 yuv420p BT.709), the soundtrack is synthesised in three renders
// (full mix, music only, SFX only) and mastered with one common gain, then each variant is muxed:
//
//   output/EEG_How_It_Works.mp4             music + SFX                 (--mix full)
//   output/EEG_How_It_Works_No_Music.mp4    SFX only, no BGM            (--mix nobgm)
//   output/EEG_How_It_Works_No_SFX.mp4      music only, no SFX          (--mix nosfx)
//   output/EEG_How_It_Works_Silent.mp4      no audio track (audio-free master)   (--mix silent)
//   output/audio/EEG_How_It_Works_Full_Mix.wav, _Music_Only.wav, _SFX_Only.wav (24-bit, 48 kHz)
//
//   node tools/export.js                        everything (default: --mix all)
//   node tools/export.js --mix nobgm,silent     only some variants (comma-separated)
//   node tools/export.js --audio-only           only the three WAVs
//   node tools/export.js --video-only           only the silent picture build/video.mp4
//   node tools/export.js --rerender             render the picture again even if build/video.mp4 is current
//
// The picture needs uv and Playwright's Chromium (once: uv run --with playwright playwright install chromium).
// PW_PKG overrides the Playwright package uv installs (e.g. PW_PKG="playwright==1.63.0" to match an installed browser).
// build/video.mp4 is reused while the engine sources are unchanged (build/video.stamp).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), BUILD = path.join(ROOT, 'build'), OUT = path.join(ROOT, 'output'), ENG = path.join(ROOT, 'engine');
const NAME = 'EEG_How_It_Works';
const VARIANTS = {
  full: { file: `${NAME}.mp4`, audio: 'full', what: 'music + SFX' },
  nobgm: { file: `${NAME}_No_Music.mp4`, audio: 'sfx', what: 'SFX only (no background music)' },
  nosfx: { file: `${NAME}_No_SFX.mp4`, audio: 'music', what: 'music only (no SFX)' },
  silent: { file: `${NAME}_Silent.mp4`, audio: null, what: 'no audio (audio-free master)' },
};
const WAVS = { full: `${NAME}_Full_Mix.wav`, music: `${NAME}_Music_Only.wav`, sfx: `${NAME}_SFX_Only.wav` };
const args = process.argv.slice(2), opt = k => args.includes(k), val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const mixArg = val('--mix', 'all'), mixes = mixArg === 'all' ? Object.keys(VARIANTS) : mixArg.split(',').map(s => s.trim()).filter(Boolean);
for (const m of mixes) if (!VARIANTS[m]) { console.error(`unknown --mix "${m}" (use full, nobgm, nosfx, silent or all)`); process.exit(2); }
fs.mkdirSync(BUILD, { recursive: true });
const sec = t0 => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
function audio() {
  const t0 = Date.now();
  execFileSync('node', [path.join(ROOT, 'audio', 'audio.js'), BUILD], { stdio: 'inherit' });
  execFileSync('python3', [path.join(__dirname, 'master.py'), BUILD], { stdio: 'inherit' });
  fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
  for (const [k, f] of Object.entries(WAVS)) fs.copyFileSync(path.join(BUILD, `audio_${k}.wav`), path.join(OUT, 'audio', f));
  console.log('wrote', Object.values(WAVS).map(f => 'output/audio/' + f).join(', '), `(${sec(t0)})`);
}
function stamp() {
  const h = crypto.createHash('sha256'), walk = d => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else h.update(f).update(fs.readFileSync(p)); } };
  walk(ENG); return h.digest('hex');
}
function video() {
  const out = path.join(BUILD, 'video.mp4'), sf = path.join(BUILD, 'video.stamp'), st = stamp();
  if (!opt('--rerender') && fs.existsSync(out) && fs.existsSync(sf) && fs.readFileSync(sf, 'utf8') === st) { console.log('picture: build/video.mp4 is current — reused'); return out; }
  if (fs.existsSync(sf)) fs.unlinkSync(sf);
  const t0 = Date.now(), pw = process.env.PW_PKG || 'playwright';
  const r = spawnSync('uv', ['run', '--with', pw, 'python', path.join(ENG, 'render.py'), '--width', '1080', '--height', '1920', '--fps', '60', '--from', '0', '--to', '55', '--crf', '15', '--out', out], { stdio: 'inherit', cwd: ENG });
  if (r.status !== 0) { console.error('render.py failed (is uv installed, and Chromium for Playwright: uv run --with playwright playwright install chromium ?)'); process.exit(1); }
  fs.writeFileSync(sf, st); console.log(`picture rendered in ${sec(t0)}`); return out;
}
function mux(vid, m) {
  const v = VARIANTS[m], dst = path.join(OUT, v.file);
  const a = v.audio ? ['-i', path.join(BUILD, `audio_${v.audio}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2'] : ['-map', '0:v:0', '-an'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vid, ...a, '-c:v', 'copy', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  console.log(`wrote output/${v.file}  (${v.what})`);
}
const t0 = Date.now();
const onlyV = opt('--video-only'), onlyA = opt('--audio-only');
if (!onlyV && (onlyA || mixes.some(m => VARIANTS[m].audio))) audio();
if (onlyA) { console.log(`done in ${sec(t0)}`); process.exit(0); }
const vid = video();
if (onlyV) { console.log(`picture ready: build/video.mp4 (${sec(t0)})`); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
for (const m of mixes) mux(vid, m);
console.log(`done in ${sec(t0)}`);
