#!/usr/bin/env python3
"""Frame-to-frame change of a rendered film, measured on the native 270×480 pixels.

Decodes the MP4 (4× nearest-neighbour upscale undone with a nearest-neighbour downscale), then reports the share of
pixels that changed by more than 12 in any channel between consecutive frames (the measure the skill's qa.py uses),
per second, plus isolated one-frame spikes (a pop) and runs where nearly the whole frame changes every frame (strobing).

  uv run --no-project --with numpy python tools/video_diffs.py build/How_Quantum_Computers_Work.mp4   (frame rate read with ffprobe)
"""
import subprocess, sys
from fractions import Fraction
import numpy as np

path = sys.argv[1]; W, H = 270, 480
fps = round(Fraction(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=neighbor', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
prev = None; d = []
while True:
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    f = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.int16)
    if prev is not None: d.append(float((np.abs(f - prev).max(axis=2) > 12).mean() * 100))
    prev = f
d = np.array(d)
print(f'frames {len(d) + 1}, median change {np.median(d):.2f}%, max {d.max():.1f}%')
print('per second (mean / max %):')
for s in range(int(np.ceil(len(d) / fps))):
    seg = d[s * fps:(s + 1) * fps]; print(f'  {s:2d}s {seg.mean():5.1f} {seg.max():5.1f} ' + '#' * int(seg.mean() / 2))
spikes = [i for i in range(1, len(d) - 1) if d[i] > 3 and d[i] > 2.5 * max(d[i - 1], d[i + 1]) + 0.5]
print('isolated spikes (frame time s, %, neighbours):', [(round((i + 1) / fps, 3), round(d[i], 1), round(d[i - 1], 1), round(d[i + 1], 1)) for i in spikes])
strobe = [i for i in range(len(d)) if d[i] > 60]
print('frames with >60% of pixels changing:', len(strobe), [round((i + 1) / fps, 2) for i in strobe[:40]])
