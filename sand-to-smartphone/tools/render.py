#!/usr/bin/env python3
"""Render "From Sand to Smartphone".

Headless Chromium draws each 270×480 frame (engine/index.html), ffmpeg upscales 4× with nearest-neighbour → 1080×1920.
Adapted from the huashu-art-motion skill's engine/render.py (local http server + window.renderFrame + PNG pipe).

  uv run --with playwright==1.56.0 --with pillow python tools/render.py --out build/film.mp4 [--from 0 --to 195] [--audio build/score.wav]
  uv run ... tools/render.py --stills 0.5,3,5.5 --out build/stills [--solo s01_grain]      # 4× PNGs
  uv run ... tools/render.py --sheet 0:6:0.5 --out build/sheet.png [--solo id] [--cols 6]   # 1× contact sheet
  uv run ... tools/render.py --cues build/cues.json                                        # sound cue sheet
"""
import argparse, base64, functools, http.server, io, json, socketserver, subprocess, sys, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / 'engine'
ap = argparse.ArgumentParser()
ap.add_argument('--out')
ap.add_argument('--audio')
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--from', dest='t0', type=float, default=0)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--stills', help='comma-separated seconds → 4× PNGs in --out dir')
ap.add_argument('--sheet', help='start:end:step seconds, or comma list → one 1× contact sheet PNG at --out')
ap.add_argument('--cols', type=int, default=6)
ap.add_argument('--solo', help='render one scene in local time (no transitions)')
ap.add_argument('--cues', help='write the cue sheet JSON here')
ap.add_argument('--crf', type=int, default=17)
ap.add_argument('--tune', default=None, help='x264 tune, e.g. animation')
ap.add_argument('--batch', type=int, default=15)
a = ap.parse_args()

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
class Srv(socketserver.ThreadingTCPServer):
    request_queue_size = 128; daemon_threads = True; allow_reuse_address = True
srv = Srv(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

def frames_js(solo):
    call = f"window.renderSolo({json.dumps(solo)}, t)" if solo else "window.renderFrame(t)"
    return f"(ts) => ts.map(t => {{ {call}; return window.__canvas.toDataURL('image/png').split(',')[1]; }})"

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 600, 'height': 1000})
    errors = []
    pg.on('console', lambda m: (print('[page]', m.text), errors.append(m.text)) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: (print('[pageerror]', e), errors.append(str(e))))
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html?render=1')
    pg.wait_for_function('window.__ready === true', timeout=60000)
    total = pg.evaluate('window.__total')
    grab = frames_js(a.solo)

    if a.cues:
        cues = pg.evaluate('window.dumpCues()')
        Path(a.cues).parent.mkdir(parents=True, exist_ok=True)
        Path(a.cues).write_text(json.dumps({'total': total, 'fps': a.fps, 'scenes': pg.evaluate('ERAS.map(e => ({id: e.id, t0: e.t0, t1: e.t1}))'), 'cues': cues}, indent=1))
        print(f'cues: {len(cues)} -> {a.cues}')
    elif a.stills or a.sheet:
        from PIL import Image, ImageDraw
        if a.stills: ts = [float(s) for s in a.stills.split(',')]
        elif ':' in a.sheet:
            s0, s1, st = map(float, a.sheet.split(':')); ts = []; v = s0
            while v <= s1 + 1e-9: ts.append(round(v, 4)); v += st
        else: ts = [float(s) for s in a.sheet.split(',')]
        imgs = [Image.open(io.BytesIO(base64.b64decode(x))).convert('RGB') for x in pg.evaluate(grab, ts)]
        if a.stills:
            out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
            for t, im in zip(ts, imgs): im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(out / f'{a.solo or "film"}_t{t:07.2f}.png')
            print('stills ->', out)
        else:
            cols = min(a.cols, len(imgs)); rows = (len(imgs) + cols - 1) // cols; w, h = imgs[0].size; pad = 12
            sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + pad + 4) + 4), (40, 40, 40)); d = ImageDraw.Draw(sheet)
            for k, (t, im) in enumerate(zip(ts, imgs)):
                x, y = 4 + (k % cols) * (w + 4), 4 + (k // cols) * (h + pad + 4)
                sheet.paste(im, (x, y + pad)); d.text((x + 2, y), f'{a.solo + " " if a.solo else ""}{t:.2f}s', fill=(255, 255, 255))
            Path(a.out).parent.mkdir(parents=True, exist_ok=True); sheet.save(a.out); print('sheet ->', a.out, sheet.size)
    else:
        t0, t1 = a.t0, (a.t1 if a.t1 is not None else total)
        out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
        vid = out if not a.audio else out.with_suffix('.noaudio.mp4')
        ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(a.fps), '-c:v', 'png', '-i', '-',
                               '-vf', 'scale=iw*4:ih*4:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf)]
                              + (['-tune', a.tune] if a.tune else []) + ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(vid)], stdin=subprocess.PIPE)
        n0, n1 = round(t0 * a.fps), round(t1 * a.fps); st = time.time()
        for i in range(n0, n1, a.batch):
            ts = [k / a.fps for k in range(i, min(i + a.batch, n1))]
            for x in pg.evaluate(grab, ts): ff.stdin.write(base64.b64decode(x))
            if (i - n0) % (a.batch * 20) == 0: print(f'{i}/{n1}  {time.time() - st:.0f}s', flush=True)
        ff.stdin.close(); ff.wait()
        if a.audio:
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(vid), '-ss', str(t0), '-t', str(t1 - t0), '-i', a.audio,
                            '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', str(out)], check=True)
            vid.unlink()
        print('done ->', out, f'{time.time() - st:.0f}s')
    b.close()
srv.shutdown()
if errors: sys.exit(f'page errors: {len(errors)}')
