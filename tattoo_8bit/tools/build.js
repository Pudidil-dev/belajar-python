'use strict';
// Builds the self-contained index.html (engine + audio + player in one closure).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const files = fs.readdirSync(SRC).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
let js = '(function(){\n';
for (const f of files) js += '// ---- ' + f + '\n' + fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^'use strict';\n/, '') + '\n';
js += '})();\n';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>How Lasers Remove Tattoos</title>
<meta name="description" content="How laser energy breaks tattoo pigment and how immune cells help clear it: a 48-second pixel-art scientific animation of Q-switched Nd:YAG 1064 nm tattoo removal (frosting, photon absorption, thermoelastic expansion, pigment fragmentation, macrophage phagocytosis, lymphatic transport, gradual fading over sessions), with an electronic soundtrack synthesised in JavaScript.">
<style>
:root { --bg: #05070d; --panel: #0b1020; --line: #1e2949; --ink: #e9eef6; --sub: #9aa7bd; --accent: #8fe9f5; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--ink); font: 500 14px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
body { display: flex; flex-direction: column; min-height: 100%; }
#stage { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 12px 16px 6px; position: relative; }
#screen { display: block; image-rendering: pixelated; image-rendering: crisp-edges; background: #0b1020; box-shadow: 0 0 0 1px var(--line), 0 18px 50px rgba(0,0,0,.55); cursor: pointer; }
#loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--sub); letter-spacing: .08em; }
#bar { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 8px 16px 6px; max-width: 720px; width: 100%; margin: 0 auto; }
.btn { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); display: grid; place-items: center; cursor: pointer; padding: 0; }
.btn:hover { border-color: #3a4b7c; }
.btn:focus-visible, #scrub:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn svg { width: 20px; height: 20px; fill: currentColor; }
#scrub { flex: 1 1 auto; min-width: 60px; height: 40px; background: transparent; -webkit-appearance: none; appearance: none; margin: 0; --p: 0%; }
#scrub::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(90deg, var(--accent) var(--p), var(--line) var(--p)); }
#scrub::-moz-range-track { height: 6px; border-radius: 3px; background: var(--line); }
#scrub::-moz-range-progress { height: 6px; border-radius: 3px; background: var(--accent); }
#scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -5px; border-radius: 50%; background: var(--ink); border: 0; }
#scrub::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--ink); border: 0; }
#time { flex: 0 0 auto; font-variant-numeric: tabular-nums; color: var(--sub); min-width: 104px; text-align: right; }
#scene { text-align: center; color: var(--sub); font-size: 12px; letter-spacing: .06em; padding: 0 16px 12px; min-height: 28px; }
@media (max-width: 420px) { #time { min-width: 0; font-size: 12px; } .btn { width: 36px; height: 36px; } #bar { gap: 6px; } }
</style>
</head>
<body>
<div id="stage">
  <canvas id="screen" width="360" height="640" role="img" aria-label="Animation: a laser handpiece fires four pulses on a black star tattoo on a forearm, which frosts white; weeks later the star is a little lighter; the camera enters the skin, where near-infrared light is absorbed by an ink aggregate in the dermis, which heats, expands and cracks into smaller fragments; a macrophage engulfs some fragments, some ink travels through a lymphatic vessel to a lymph node; over weeks and several sessions the star fades until it is no longer visible"></canvas>
  <div id="loading">LOADING…</div>
</div>
<div id="bar">
  <button id="play" class="btn" aria-label="Play"></button>
  <button id="replay" class="btn" aria-label="Replay"></button>
  <input id="scrub" type="range" min="0" max="2879" step="1" value="0" aria-label="Seek">
  <span id="time">0:00.0 / 0:48.0</span>
  <button id="mute" class="btn" aria-label="Mute"></button>
</div>
<div id="scene" aria-live="polite"></div>
<script>
${js}</script>
</body>
</html>
`;
const out = path.join(ROOT, 'index.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB', files.join(' '));
