'use strict';
// QA proxy (not a deliverable): native frames -> build/qa/proxy.mp4 (720x1280) for the skill's film_gate.py
//   node tools/proxy.js [fps]
const path = require('path'), { spawn } = require('child_process');
const { load, toRGB } = require('./engine');
const fps = +(process.argv[2] || 30), E = load(), out = path.join(__dirname, '..', 'build', 'qa', 'proxy.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${E.W}x${E.H}`, '-r', String(fps), '-i', '-', '-vf', 'scale=720:1280:flags=neighbor,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const NF = Math.round(E.DUR * fps); let f = 0;
const pump = () => { while (f < NF) { E.renderFrame(f / fps); const ok = ff.stdin.write(toRGB(E.getBuf(), E.W, E.H)); f++; if (!ok) { ff.stdin.once('drain', pump); return; } } ff.stdin.end(); };
ff.on('close', c => console.log('proxy done', c, NF, 'frames ->', out));
pump();
