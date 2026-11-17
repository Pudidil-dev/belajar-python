#!/usr/bin/env python3
"""Render "What Happens When You Distill Grape Juice?": a 26-second looping 8-bit RPG-lab pixel-art film with chiptune
music, 1080x1920 (9:16), 30 fps, H.264 + stereo AAC.

    python render.py                      # the film -> out/grape-juice-distillation.mp4 (+ music/sfx/mix wav stems)
    python render.py --preview            # quick look: 540x960, fast encode -> out/grape-juice-distillation-preview.mp4
    python render.py --sheet 0:26:1       # one contact sheet of the whole film -> out/sheet.png
    python render.py --stills 0.4,13,23.5 # full-size PNGs of single frames -> out/stills/
    python render.py --from 12 --to 20    # just a slice
    python render.py --fps 60             # smoother motion (twice the frames)
    python render.py --audio-only         # only the soundtrack (music.wav, sfx.wav, mix.wav)
    python render.py --loops 3            # also out/grape-juice-distillation-loop3x.mp4: the loop 3 times (78 s)
    python render.py --sprites            # export every sprite (wide / close-up / cutaway) -> assets/sprites/

Defaults (output path, fps, pixel scale, x264 quality, audio bitrate and loudness, preview settings) come from
render.json next to this file; command-line flags override them.

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

OUT_DIR = ROOT / 'out'
NAME = 'grape-juice-distillation'
CONFIG = ROOT / 'render.json'


def load_config():
    """render.json: the render configuration (CLI flags override it)."""
    import json
    cfg = {'output': f'out/{NAME}.mp4', 'fps': 30, 'scale': 4, 'crf': 16, 'preset': 'medium', 'tune': 'animation',
           'audio_bitrate': '256k', 'loudness_lufs': -14.0, 'sprites': 'assets/sprites',
           'preview': {'output': f'out/{NAME}-preview.mp4', 'scale': 2, 'crf': 20, 'preset': 'veryfast'}}
    if CONFIG.exists():
        user = json.loads(CONFIG.read_text(encoding='utf-8'))
        prev = {**cfg['preview'], **user.pop('preview', {})}
        cfg.update(user)
        cfg['preview'] = prev
    return cfg


def find_ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found. Install it (https://ffmpeg.org) or run: pip install imageio-ffmpeg')


_FPS = 30
_SCALE = 4


def _init(fps, scale):
    global _FPS, _SCALE
    _FPS, _SCALE = fps, scale
    from engine import scenes
    scenes.warm()


def _frame(i):
    from engine import scenes
    return scenes.render(i / _FPS, _FPS, _SCALE).tobytes()


def render_film(a):
    from engine import timeline as T
    default = ROOT / (a.cfg['preview']['output'] if a.preview else a.cfg['output'])
    out = Path(a.out) if a.out else default
    out.parent.mkdir(parents=True, exist_ok=True)
    audio = None
    if not a.no_audio:
        from engine import audio as AU
        audio, info = AU.render(out.parent, log=lambda s: print(s, flush=True), target=a.cfg['loudness_lufs'])
    ff = find_ffmpeg()
    W, H = 270 * a.scale, 480 * a.scale
    n0 = int(round(a.t0 * a.fps))
    n1 = int(round((a.t1 if a.t1 is not None else T.TOTAL) * a.fps))
    cmd = [ff, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(a.fps),
           '-i', '-']
    if audio is not None:
        cmd += ['-ss', f'{n0 / a.fps:.4f}', '-i', str(audio)]
    cmd += ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=neighbor,format=yuv420p',
            '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-tune', a.cfg['tune'],
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if audio is not None:
        cmd += ['-c:a', 'aac', '-b:a', a.cfg['audio_bitrate'], '-shortest']
    cmd += ['-movflags', '+faststart', str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    jobs = max(1, a.jobs)
    print(f'video: {n1 - n0} frames at {W}x{H}, {a.fps} fps, {jobs} worker(s) ...', flush=True)
    st = time.time()
    frames = range(n0, n1)
    if jobs == 1:
        _init(a.fps, a.scale)
        it = map(_frame, frames)
        pool = None
    else:
        ctx = mp.get_context('spawn')
        pool = ctx.Pool(jobs, initializer=_init, initargs=(a.fps, a.scale))
        it = pool.imap(_frame, frames, chunksize=4)
    try:
        for k, buf in enumerate(it):
            proc.stdin.write(buf)
            if k % (a.fps * 2) == 0:
                done = k / max(1, n1 - n0)
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
    if a.loops > 1:
        if a.t0 > 0 or a.t1 is not None:
            print('--loops needs the whole film (no --from/--to); skipped')
        else:
            export_loops(out, a.loops, None if a.no_audio else out.parent / 'mix.wav', a.cfg['audio_bitrate'])


def export_loops(film, n, mix_wav, bitrate='256k'):
    """The film n times back to back in one MP4. The picture is stream-copied (no re-render, no quality loss); the
    sound is the mix repeated sample for sample and encoded once, so every join is as seamless as the loop itself."""
    import wave
    ff = find_ffmpeg()
    looped = film.with_name(f'{film.stem}-loop{n}x{film.suffix}')
    cmd = [ff, '-y', '-v', 'error', '-stream_loop', str(n - 1), '-i', str(film)]
    tiled = None
    if mix_wav is not None and mix_wav.exists():
        tiled = film.with_name(f'{film.stem}-loop{n}x-mix.wav')
        with wave.open(str(mix_wav)) as w:
            params, data = w.getparams(), w.readframes(w.getnframes())
        with wave.open(str(tiled), 'wb') as w:
            w.setparams(params)
            w.writeframes(data * n)
        cmd += ['-i', str(tiled), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', bitrate,
                '-shortest']
    else:
        cmd += ['-map', '0:v', '-c:v', 'copy']
    cmd += ['-movflags', '+faststart', str(looped)]
    subprocess.run(cmd, check=True)
    if tiled is not None:
        tiled.unlink()
    print(f'loop x{n} -> {looped}')


def render_stills(a):
    from PIL import Image
    from engine import scenes
    scenes.warm()
    out = Path(a.out) if a.out else OUT_DIR / 'stills'
    out.mkdir(parents=True, exist_ok=True)
    for s in a.stills.split(','):
        t = float(s)
        Image.fromarray(scenes.render(t, a.fps, a.scale)).save(out / f'frame_{t:06.2f}s.png')
    print('stills ->', out)


def render_sheet(a):
    from PIL import Image, ImageDraw
    from engine import scenes
    scenes.warm()
    if ':' in a.sheet:
        s0, s1, step = map(float, a.sheet.split(':'))
        ts, v = [], s0
        while v <= s1 + 1e-9:
            ts.append(round(v, 4))
            v += step
    else:
        ts = [float(x) for x in a.sheet.split(',')]
    ims = [scenes.render(t, a.fps, 1) for t in ts]
    cols = min(a.cols, len(ims))
    rows = (len(ims) + cols - 1) // cols
    w, h, pad = 270, 480, 14
    sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + pad + 4) + 4), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for k, (t, im) in enumerate(zip(ts, ims)):
        x, y = 4 + (k % cols) * (w + 4), 4 + (k // cols) * (h + pad + 4)
        sheet.paste(Image.fromarray(im), (x, y + pad))
        d.text((x + 2, y), f'{t:.2f}s', fill=(255, 255, 255))
    out = Path(a.out) if a.out else OUT_DIR / 'sheet.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print('sheet ->', out, sheet.size)


def main():
    cfg = load_config()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', help='output file (film/sheet) or folder (stills, sprites, audio)')
    ap.add_argument('--fps', type=int, default=cfg['fps'])
    ap.add_argument('--scale', type=int, default=cfg['scale'],
                    help='pixel size: 4 -> 1080x1920, 2 -> 540x960, 8 -> 2160x3840')
    ap.add_argument('--from', dest='t0', type=float, default=0.0)
    ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 0))
    ap.add_argument('--crf', type=int, default=cfg['crf'])
    ap.add_argument('--preset', default=cfg['preset'])
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--audio-only', action='store_true')
    ap.add_argument('--preview', action='store_true', help='540x960 with a fast encode, for a quick look')
    ap.add_argument('--loops', type=int, default=1, help='also write the film N times back to back (seamless)')
    ap.add_argument('--stills')
    ap.add_argument('--sheet')
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--sprites', action='store_true', help='export the sprites as PNGs (render.json "sprites")')
    a = ap.parse_args()
    a.cfg = cfg
    if a.preview:
        p = cfg['preview']
        a.scale, a.preset, a.crf = p['scale'], p['preset'], p['crf']
    if a.audio_only:
        from engine import audio as AU
        AU.render(Path(a.out) if a.out else OUT_DIR, log=print, target=cfg['loudness_lufs'])
    elif a.sprites:
        from engine import sprites
        sprites.export(Path(a.out) if a.out else ROOT / cfg['sprites'])
    elif a.stills:
        render_stills(a)
    elif a.sheet:
        render_sheet(a)
    else:
        render_film(a)


if __name__ == '__main__':
    main()
