#!/usr/bin/env python3
"""Per-frame diff curve for one scene (same metric as the skill's qa.py: % of pixels whose max channel diff > 12).

  uv run -q --no-project --with playwright==1.56.0 --with pillow --with numpy python tools/frame_diffs.py s30_finale 2.8 7.6 [--fps 30]
"""
import base64, functools, http.server, io, socketserver, sys, threading
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ENGINE = Path(__file__).resolve().parent.parent / 'engine'
sid, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
fps = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 30

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
    ts = [t0 + i / fps for i in range(int(round((t1 - t0) * fps)) + 1)]
    js = "(a) => a.ts.map(t => { window.renderSolo(a.id, t); return window.__canvas.toDataURL('image/png').split(',')[1]; })"
    fr = []
    for i in range(0, len(ts), 30):
        fr += [np.asarray(Image.open(io.BytesIO(base64.b64decode(x))).convert('RGB')).astype(np.int16) for x in pg.evaluate(js, {'id': sid, 'ts': ts[i:i + 30]})]
    b.close()
srv.shutdown()
d = np.array([(np.abs(fr[i + 1] - fr[i]).max(axis=2) > 12).mean() * 100 for i in range(len(fr) - 1)])
print(f'{sid} {t0}-{t1}: median {np.median(d):.2f}  max {d.max():.2f}')
for i, v in enumerate(d):
    flag = ' <' if i > 0 and i < len(d) - 1 and v > 2.5 * max(d[i - 1], d[i + 1]) + 0.5 else ''
    print(f'{ts[i + 1]:7.3f} {v:6.2f} ' + '#' * min(80, int(v * 2)) + flag)
