#!/usr/bin/env python3
"""Render "How a Nebulizer Turns Liquid Into Mist": a 20-second looping 16-bit pixel-art explainer with chiptune.

    python render.py                      # the film -> output/How_a_Nebulizer_Turns_Liquid_Into_Mist.mp4 (+ wav stems)
    python render.py --preview            # quick half-size check -> output/preview.mp4 (540x960)
    python render.py --stills 0,3,12      # full-size PNG frames -> output/stills/
    python render.py --sheet 0:20:1       # one contact sheet (canvas size) -> output/sheet.png
    python render.py --from 8 --to 15     # just a slice
    python render.py --audio-only         # only the soundtrack (music.wav, sfx.wav, mix.wav)

Needs Python 3.9+, numpy, Pillow and ffmpeg (on PATH, or `pip install imageio-ffmpeg` and it is found automatically).
Every frame is drawn on a 270x480 pixel canvas and scaled exactly 4x (nearest neighbour) to 1080x1920.
"""
import argparse
import multiprocessing as mp
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

TITLE = 'How_a_Nebulizer_Turns_Liquid_Into_Mist'


def find_ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found. Install it (https://ffmpeg.org) or run: pip install imageio-ffmpeg')


_FPS, _SCALE, _LABEL = 30, 4, True


def _init(fps, scale, label):
    global _FPS, _SCALE, _LABEL
    _FPS, _SCALE, _LABEL = fps, scale, label
    from engine import person, mist
    person.grids()
    mist.mask_grid()
    person._MASK_SDF()


def _frame(i):
    from engine import scenes
    return scenes.render(i / _FPS, _FPS, _SCALE, _LABEL).tobytes()


def render_film(a):
    from engine import timeline as T
    if a.preview:
        a.scale, a.preset, a.crf = min(a.scale, 2), 'veryfast', 20
    default = ROOT / 'output' / ('preview.mp4' if a.preview else f'{TITLE}.mp4')
    out = Path(a.out) if a.out else default
    out.parent.mkdir(parents=True, exist_ok=True)
    audio = None
    if not a.no_audio:
        from engine import audio as AU
        audio, info = AU.render(out.parent, log=lambda s: print(s, flush=True))
    ff = find_ffmpeg()
    W, H = 270 * a.scale, 480 * a.scale
    n0 = int(round(a.t0 * a.fps))
    n1 = int(round((a.t1 if a.t1 is not None else T.TOTAL) * a.fps))
    cmd = [ff, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps),
           '-i', '-']
    if audio is not None:
        cmd += ['-ss', f'{n0 / a.fps:.4f}', '-t', f'{(n1 - n0) / a.fps:.4f}', '-i', str(audio)]
    cmd += ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=neighbor,format=yuv420p',
            '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-tune', 'animation',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if audio is not None:
        cmd += ['-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-ar', '48000', '-shortest']
    cmd += ['-movflags', '+faststart', str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    jobs = max(1, a.jobs)
    print(f'video: {n1 - n0} frames at {W}x{H}, {a.fps} fps, {jobs} worker(s) ...', flush=True)
    st = time.time()
    frames = range(n0, n1)
    if jobs == 1:
        _init(a.fps, a.scale, not a.no_label)
        it = map(_frame, frames)
        pool = None
    else:
        ctx = mp.get_context('spawn')
        pool = ctx.Pool(jobs, initializer=_init, initargs=(a.fps, a.scale, not a.no_label))
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
        proc.wait()
    if proc.returncode != 0:
        sys.exit(f'ffmpeg failed ({proc.returncode})')
    print(f'done -> {out}  ({time.time() - st:.0f}s)')


def render_stills(a):
    from PIL import Image
    from engine import scenes
    _init(a.fps, a.scale, not a.no_label)
    out = Path(a.out) if a.out else ROOT / 'output' / 'stills'
    out.mkdir(parents=True, exist_ok=True)
    for s in a.stills.split(','):
        t = float(s)
        Image.fromarray(scenes.render(t, a.fps, a.scale, not a.no_label)).save(out / f'frame_{t:06.2f}s.png')
    print('stills ->', out)


def render_sheet(a):
    from PIL import Image, ImageDraw
    from engine import scenes
    _init(a.fps, 1, not a.no_label)
    if ':' in a.sheet:
        s0, s1, step = map(float, a.sheet.split(':'))
        ts, v = [], s0
        while v <= s1 + 1e-9:
            ts.append(round(v, 4))
            v += step
    else:
        ts = [float(x) for x in a.sheet.split(',')]
    ims = [scenes.render_canvas(t, a.fps, not a.no_label) for t in ts]
    cols = min(a.cols, len(ims))
    rows = (len(ims) + cols - 1) // cols
    w, h, pad = 270, 480, 14
    sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + pad + 4) + 4), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for k, (t, im) in enumerate(zip(ts, ims)):
        x, y = 4 + (k % cols) * (w + 4), 4 + (k // cols) * (h + pad + 4)
        sheet.paste(Image.fromarray(im), (x, y + pad))
        d.text((x + 2, y), f'{t:.2f}s', fill=(255, 255, 255))
    out = Path(a.out) if a.out else ROOT / 'output' / 'sheet.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print('sheet ->', out, sheet.size)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', help='output file (film/sheet) or folder (stills)')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--scale', type=int, default=4, help='pixel size: 4 -> 1080x1920, 2 -> 540x960, 8 -> 2160x3840')
    ap.add_argument('--from', dest='t0', type=float, default=0.0)
    ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--jobs', type=int, default=max(1, os.cpu_count() or 2))
    ap.add_argument('--crf', type=int, default=16)
    ap.add_argument('--preset', default='medium')
    ap.add_argument('--preview', action='store_true', help='quick half-size MP4 -> output/preview.mp4')
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--no-label', action='store_true', help='leave out the tiny VIBRATING MESH tag')
    ap.add_argument('--audio-only', action='store_true')
    ap.add_argument('--stills')
    ap.add_argument('--sheet')
    ap.add_argument('--cols', type=int, default=5)
    a = ap.parse_args()
    if a.audio_only:
        from engine import audio as AU
        AU.render(Path(a.out) if a.out else ROOT / 'output', log=print)
    elif a.stills:
        render_stills(a)
    elif a.sheet:
        render_sheet(a)
    else:
        render_film(a)


if __name__ == '__main__':
    main()
