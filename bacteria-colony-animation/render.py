#!/usr/bin/env python3
"""Render "How Bacterial Colonies Grow on Agar": a 20-second seamless-loop 8-bit pixel-art science short.

    python render.py                      # the film -> out/colony.mp4 (1080x1920, 30 fps, stereo, loops seamlessly)
    python render.py --preview            # quick half-size check -> out/preview.mp4 (540x960)
    python render.py --loops 3            # three loops back to back (60 s) -> out/colony_x3.mp4
    python render.py --stills 0,3,6.6,13.25     # full-size PNG frames -> out/stills/
    python render.py --sheet 0:20:1       # one contact sheet (canvas size) -> out/sheet.png
    python render.py --from 4 --to 10 --out out/slice.mp4   # just a slice
    python render.py --audio-only         # only the soundtrack -> out/music.wav, out/sfx.wav, out/mix.wav
    python render.py --clean              # no counter, clock or bracket -> out/colony_clean.mp4
    python render.py --assets             # key frames, a cell sprite sheet and the audio stems -> assets/

Needs Python 3.9+, numpy, Pillow and ffmpeg (on PATH, or `pip install imageio-ffmpeg` and it is found automatically).
Every frame is drawn on a 270x480 pixel canvas and scaled exactly 4x (nearest neighbour) to 1080x1920.
"""
import argparse
import importlib
import multiprocessing as mp
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
OUT = ROOT / 'out'
_FPS, _SCALE, _INFO = 30, 4, True


def find_ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found. Install it (https://ffmpeg.org) or run: pip install imageio-ffmpeg')


def _init(fps, scale, info=True):
    global _FPS, _SCALE, _INFO
    _FPS, _SCALE, _INFO = fps, scale, info


def _frame(i):
    from engine import scene, timeline as T
    return scene.render((i / _FPS) % T.TOTAL, _SCALE, _INFO).tobytes()


def render_film(a):
    from engine import timeline as T
    importlib.import_module('engine.cells')    # runs the cell model once and caches it before the workers start
    if a.preview:
        a.scale, a.preset, a.crf = min(a.scale, 2), 'veryfast', 20
    loops = max(1, a.loops)
    name = 'preview' if a.preview else 'colony'
    name += '_clean' if a.clean else ''
    name += f'_x{loops}' if loops > 1 else ''
    out = Path(a.out) if a.out else OUT / f'{name}.mp4'
    out.parent.mkdir(parents=True, exist_ok=True)
    audio = None
    if not a.no_audio:
        from engine import audio as AU
        audio, _ = AU.render(OUT, log=lambda s: print(s, flush=True))
    ff = find_ffmpeg()
    W, H = 270 * a.scale, 480 * a.scale
    n0 = int(round(a.t0 * a.fps))
    n1 = int(round((a.t1 if a.t1 is not None else T.TOTAL * loops) * a.fps))
    cmd = [ff, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps),
           '-i', '-']
    if audio is not None:
        cmd += ['-stream_loop', str(loops + 1), '-i', str(audio)]
    cmd += ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=neighbor,format=yuv420p',
            '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart']
    if audio is not None:
        cmd += ['-af', f'atrim=start={n0 / a.fps:.4f}:end={n1 / a.fps:.4f},asetpts=PTS-STARTPTS',
                '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-ar', '48000', '-shortest']
    cmd += [str(out)]
    print(f'video: {n1 - n0} frames at {W}x{H}, {a.fps} fps, {a.jobs} worker(s) ...', flush=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    st = time.time()
    frames = range(n0, n1)
    if a.jobs <= 1:
        _init(a.fps, a.scale, not a.clean)
        it = map(_frame, frames)
        pool = None
    else:
        ctx = mp.get_context('spawn')
        pool = ctx.Pool(a.jobs, initializer=_init, initargs=(a.fps, a.scale, not a.clean))
        it = pool.imap(_frame, frames, chunksize=4)
    try:
        for k, buf in enumerate(it):
            proc.stdin.write(buf)
            if k % (a.fps * 2) == 0:
                print(f'  {k:4d}/{n1 - n0}  {time.time() - st:5.0f}s', flush=True)
    finally:
        if pool is not None:
            pool.close()
            pool.join()
        proc.stdin.close()
    if proc.wait() != 0:
        sys.exit(f'ffmpeg failed ({proc.returncode})')
    print(f'done -> {out}  ({time.time() - st:.0f}s)')


def render_stills(a):
    from PIL import Image
    from engine import scene
    out = Path(a.out) if a.out else OUT / 'stills'
    out.mkdir(parents=True, exist_ok=True)
    for s in a.stills.split(','):
        t = float(s)
        Image.fromarray(scene.render(t, a.scale, not a.clean)).save(out / f'frame_{t:06.2f}s.png')
    print('stills ->', out)


def render_sheet(a):
    from PIL import Image, ImageDraw
    from engine import scene, timeline as T
    if ':' in a.sheet:
        s0, s1, step = map(float, a.sheet.split(':'))
        ts, v = [], s0
        while v <= s1 + 1e-9:
            ts.append(round(min(v, T.TOTAL - 0.01), 4))
            v += step
    else:
        ts = [float(x) for x in a.sheet.split(',')]
    ims = [scene.render_canvas(t, not a.clean) for t in ts]
    cols = min(a.cols, len(ims))
    rows = (len(ims) + cols - 1) // cols
    w, h, pad = 270, 480, 14
    sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + pad + 4) + 4), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for k, (t, im) in enumerate(zip(ts, ims)):
        x, y = 4 + (k % cols) * (w + 4), 4 + (k // cols) * (h + pad + 4)
        sheet.paste(Image.fromarray(im), (x, y + pad))
        d.text((x + 2, y), f'{t:.2f}s', fill=(255, 255, 255))
    out = Path(a.out) if a.out else OUT / 'sheet.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print('sheet ->', out, sheet.size)


def export_assets(a):
    """Key frames (4x, nearest neighbour), a sprite sheet of one cell dividing, and the audio stems."""
    import numpy as np
    from PIL import Image
    from engine import scene
    sp = ROOT / 'assets' / 'sprites'
    sp.mkdir(parents=True, exist_ok=True)
    big = lambda im: Image.fromarray(im).resize((im.shape[1] * 4, im.shape[0] * 4), Image.NEAREST)
    for name, t in (('bench_pan', 0.0), ('swab_lands', 1.9), ('swab_streak', 3.0), ('dive_lock_on', 5.0),
                    ('one_cell', 6.6), ('dividing', 7.75), ('microcolony', 10.05), ('dome', 11.0),
                    ('plate_overnight', 12.0), ('our_colony_glint', 13.25), ('bench_burner', 18.3),
                    ('bench_stirrer', 19.4)):
        big(scene.render_canvas(t, not a.clean)).save(sp / f'{name}.png')
    tiles = []
    for t in (6.05, 6.6, 7.1, 7.5, 7.8, 7.95, 8.1, 8.6):          # one cell becoming two, cut out of the film
        im = scene.render_canvas(t, False)
        tiles.append(im[180:300, 60:210])
    big(np.concatenate(tiles, axis=1)).save(sp / 'sprite_sheet_binary_fission.png')
    from engine import audio as AU
    AU.render(ROOT / 'assets' / 'audio', log=print)
    print('assets ->', ROOT / 'assets')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', help='output file (film/sheet) or folder (stills)')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--scale', type=int, default=4, help='pixel size: 4 -> 1080x1920, 2 -> 540x960, 8 -> 2160x3840')
    ap.add_argument('--from', dest='t0', type=float, default=0.0)
    ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--loops', type=int, default=1, help='render the loop this many times back to back')
    ap.add_argument('--jobs', type=int, default=max(1, os.cpu_count() or 2))
    ap.add_argument('--crf', type=int, default=16)
    ap.add_argument('--preset', default='medium')
    ap.add_argument('--preview', action='store_true', help='quick half-size MP4 -> out/preview.mp4')
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--audio-only', action='store_true')
    ap.add_argument('--stills')
    ap.add_argument('--sheet')
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--clean', action='store_true', help='no counter, clock or target bracket')
    ap.add_argument('--assets', action='store_true', help='export key frames, a sprite sheet and audio stems to assets/')
    a = ap.parse_args()
    if a.assets:
        export_assets(a)
    elif a.audio_only:
        from engine import audio as AU
        AU.render(Path(a.out) if a.out else OUT, log=print)
    elif a.stills:
        render_stills(a)
    elif a.sheet:
        render_sheet(a)
    else:
        render_film(a)


if __name__ == '__main__':
    main()
