#!/usr/bin/env python3
"""Write engine/index.html: the libraries in load order, then every scene file that exists (in film order), then film.js."""
import re
from pathlib import Path
E = Path(__file__).resolve().parent.parent / 'engine'
LIBS = ['util', 'motion', 'camera', 'pix', 'kit', 'fx', 'cap', 'ves', 'head', 'skull', 'ct', 'room', 'monitor', 'gantry2d', 'phys', 'tube', 'tungsten',
        'brain', 'axial', 'flow', 'body', 'atom', 'det', 'ws', 'sheets']
ids = re.findall(r"'(s\d\d_[a-z0-9]+)'", (E / 'film.js').read_text())
libs = [l for l in LIBS if (E / 'lib' / f'{l}.js').exists()]
scenes = [i for i in ids if (E / 'scenes' / f'{i}.js').exists()]
html = ['<!doctype html>', '<html><head><meta charset="utf-8"><title>How Does CT Angiography Detect a Brain Aneurysm?</title>',
        '<style>html,body{margin:0;background:#05080f}canvas{display:block;width:540px;height:960px;image-rendering:pixelated}</style>',
        '</head><body>', '<canvas id="c" width="360" height="640"></canvas>', '<!-- util / motion / camera: from the huashu-art-motion skill (MIT) -->']
html += [f'<script src="lib/{l}.js"></script>' for l in libs]
html += [f'<script src="scenes/{s}.js"></script>' for s in scenes]
html += ['<script src="film.js"></script>', '</body></html>']
(E / 'index.html').write_text('\n'.join(html) + '\n')
print(f'index.html: {len(libs)} libs, {len(scenes)}/{len(ids)} scenes')
