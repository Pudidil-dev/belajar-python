#!/usr/bin/env python3
"""Render a scene at two local times and save [frame A | frame B | changed pixels] (4× nearest) to inspect a one-frame spike.

  uv run -q --no-project --with playwright==1.56.0 --with pillow --with numpy python tools/pair_diff.py s09_measure 4.050 4.0833 out.png
"""
import base64, functools, http.server, io, socketserver, sys, threading
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ENGINE = Path(__file__).resolve().parent.parent / 'engine'
sid, ta, tb, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
class Srv(socketserver.ThreadingTCPServer):
    daemon_threads = True; allow_reuse_address = True
srv = Srv(('127.0.0.1', 0), functools.partial(Q, directory=str(ENGINE)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html?render=1')
    pg.wait_for_function('window.__ready === true', timeout=60000)
    js = "(a) => a.ts.map(t => { window.renderSolo(a.id, t); return window.__canvas.toDataURL('image/png').split(',')[1]; })"
    A, B = [np.asarray(Image.open(io.BytesIO(base64.b64decode(x))).convert('RGB')) for x in pg.evaluate(js, {'id': sid, 'ts': [ta, tb]})]
    b.close()
srv.shutdown()
m = np.abs(A.astype(int) - B.astype(int)).max(axis=2) > 12
ys, xs = np.nonzero(m)
print(f'changed {m.mean() * 100:.2f}%', f'bbox x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}' if len(xs) else '')
for y0 in range(0, 480, 60): print(f'  rows {y0:3d}-{y0 + 59:3d}: {m[y0:y0 + 60].mean() * 100:5.2f}%')
D = np.where(m[..., None], np.array([255, 0, 255], np.uint8), (B * 0.35).astype(np.uint8))
im = Image.fromarray(np.concatenate([A, B, D], axis=1)); im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(out)
