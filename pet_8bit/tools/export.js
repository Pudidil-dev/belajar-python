'use strict';
// Full export: index.html -> offline Web Audio render (Chromium) -> mastering
// -> 4200 frames from the same engine code -> H.264/yuv420p 1080x1920@60 + AAC.
//   node tools/export.js [--video-only] [--audio-only] [--out output/pet_8bit.mp4]
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { load, toRGB } = require('./engine');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const args = process.argv.slice(2);
const OUT = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'output/pet_8bit.mp4');
fs.mkdirSync(BUILD, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function renderAudio() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?headless');
  await page.waitForFunction(() => window.LINAC && window.LINAC.ready, null, { timeout: 60000 });
  const t0 = Date.now();
  const info = await page.evaluate(async () => {
    const ab = await window.LINAC.renderAudioOffline();
    const L = ab.getChannelData(0), R = ab.getChannelData(1);
    const inter = new Float32Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
    window.__aud = new Uint8Array(inter.buffer);
    return { len: L.length, sr: ab.sampleRate };
  });
  console.log(`audio rendered: ${info.len} samples @ ${info.sr} Hz in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const raw = path.join(BUILD, 'audio_raw.f32');
  const fd = fs.openSync(raw, 'w');
  const total = info.len * 8, CH = 4 * 1024 * 1024;
  for (let off = 0; off < total; off += CH) {
    const b64 = await page.evaluate(([o, n]) => {
      const a = window.__aud.subarray(o, Math.min(o + n, window.__aud.length));
      let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return btoa(s);
    }, [off, CH]);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  await browser.close();
  execFileSync('python3', [path.join(__dirname, 'master.py'), raw, path.join(BUILD, 'audio.wav')], { stdio: 'inherit' });
}

function renderVideo() {
  return new Promise((resolve, reject) => {
    const E = load();
    const out = path.join(BUILD, 'video.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${E.W}x${E.H}`, '-r', String(E.FPS), '-i', '-',
      '-vf', 'scale=1080:1920:flags=neighbor:out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-profile:v', 'high', '-level', '4.2', '-g', '120',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-frames:v', String(E.NF), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', code => code === 0 ? resolve(out) : reject(new Error('ffmpeg exit ' + code)));
    let f = 0; const t0 = Date.now();
    const pump = () => {
      while (f < E.NF) {
        E.renderFrame(f / E.FPS);
        const ok = ff.stdin.write(toRGB(E.getBuf(), E.W, E.H));
        f++;
        if (f % 600 === 0) console.log(`frame ${f}/${E.NF} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        if (!ok) { ff.stdin.once('drain', pump); return; }
      }
      ff.stdin.end();
    };
    pump();
  });
}

(async () => {
  const onlyV = args.includes('--video-only'), onlyA = args.includes('--audio-only');
  execFileSync('node', [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  if (!onlyV) await renderAudio();
  if (!onlyA) await renderVideo();
  if (onlyA || onlyV) return;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(BUILD, 'video.mp4'), '-i', path.join(BUILD, 'audio.wav'),
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log('wrote', OUT);
})().catch(e => { console.error(e); process.exit(1); });
