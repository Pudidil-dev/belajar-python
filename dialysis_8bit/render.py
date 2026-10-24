"""Render the film.

    python3 render.py --stills 0.5,2,5 --out stills/      # PNG stills (x2)
    python3 render.py --sheet --out sheet.png             # contact sheet, 1 frame/s
    python3 render.py --out film.mp4 --audio score.wav    # 1080x1920 @ 60 fps
"""
import argparse
import os
import subprocess
import sys
import time
from multiprocessing import Pool

import numpy as np
from PIL import Image

import timeline as TL
from hud import composite, upscale
from px import H, W

SCALE = 4


def full_frame(t):
    """Art at 270x480 scaled x4, then the HUD text layer at full resolution."""
    cv = TL.frame(t)
    full = upscale(cv.a)
    composite(full, cv.hud.ops)
    return full


def render_rgb(i):
    return full_frame(i / TL.FPS).tobytes()


def stills(times, out, scale=2):
    os.makedirs(out, exist_ok=True)
    for t in times:
        a = full_frame(t)
        Image.fromarray(a, "RGB").resize((W * scale, H * scale), Image.NEAREST).save(
            os.path.join(out, f"t{t:05.2f}.png"))


def sheet(out, times, cols=9, scale=1):
    tiles = [np.asarray(Image.fromarray(full_frame(t), "RGB").resize((W, H), Image.BOX)) for t in times]
    rows = (len(tiles) + cols - 1) // cols
    pad = 4
    S = np.zeros((rows * (H + pad), cols * (W + pad), 3), np.uint8)
    for k, a in enumerate(tiles):
        r, c = divmod(k, cols)
        S[r * (H + pad):r * (H + pad) + H, c * (W + pad):c * (W + pad) + W] = a
    Image.fromarray(S).resize((S.shape[1] * scale, S.shape[0] * scale), Image.NEAREST).save(out)


def video(out, audio=None, t0=0.0, t1=TL.DUR, workers=4):
    n0, n1 = int(round(t0 * TL.FPS)), int(round(t1 * TL.FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W * SCALE}x{H * SCALE}", "-r", str(TL.FPS), "-i", "-"]
    if audio:
        cmd += ["-ss", f"{t0:.4f}", "-t", f"{(t1 - t0):.4f}", "-i", audio]
    cmd += ["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-tune", "animation",
            "-profile:v", "high", "-level", "4.2", "-g", "120",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
    if audio:
        cmd += ["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest"]
    cmd += ["-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    start = time.time()
    with Pool(workers) as pool:
        for k, buf in enumerate(pool.imap(render_rgb, range(n0, n1), chunksize=6)):
            p.stdin.write(buf)
            if k % 300 == 0:
                el = time.time() - start
                print(f"frame {n0 + k}/{n1}  {el:6.1f}s", flush=True)
    p.stdin.close()
    rc = p.wait()
    print(f"done in {time.time() - start:.1f}s rc={rc}")
    return rc


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--stills")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--audio")
    ap.add_argument("--from", dest="t0", type=float, default=0.0)
    ap.add_argument("--to", dest="t1", type=float, default=TL.DUR)
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 4)
    ap.add_argument("--step", type=float, default=1.0)
    a = ap.parse_args()
    if a.stills:
        stills([float(x) for x in a.stills.split(",")], a.out)
    elif a.sheet:
        ts = list(np.arange(a.t0 + 0.5, a.t1, a.step))
        sheet(a.out, ts)
    else:
        sys.exit(video(a.out, a.audio, a.t0, a.t1, a.workers))
