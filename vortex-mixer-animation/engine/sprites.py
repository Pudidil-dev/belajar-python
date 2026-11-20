"""Export the sprites as PNGs: the mixer, the tube in its three states (two layers, swirling, mixed), the tube in the
gloved hand, and full-frame tiles of the key moments; plus one labelled sheet.

The art itself is code: every object is drawn per frame at the camera's own scale. These PNGs are an export of that
code for reference and reuse (transparent where nothing is drawn). To change a sprite, edit the code and export again:

    python render.py --sprites            # -> assets/sprites/*.png and assets/sprites/_sheet.png
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from . import gfx
from . import world as Wd
from . import mixer, tube as TB, scenes
from .palette import HUD

_KEYS = ((255, 0, 255), (0, 255, 0))


def _iso(draw, cam):
    outs = []
    for key in _KEYS:
        buf = np.empty((gfx.H, gfx.W, 3), np.uint8)
        buf[:] = key
        draw(buf, cam)
        outs.append(buf)
    a, b = outs
    alpha = np.all(a == b, axis=2)
    rgba = np.dstack([a, np.where(alpha, 255, 0).astype(np.uint8)])
    rgba[~alpha, :3] = 0
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        return None
    y0, y1 = max(ys.min() - 2, 0), min(ys.max() + 3, gfx.H)
    x0, x1 = max(xs.min() - 2, 0), min(xs.max() + 3, gfx.W)
    return Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')


def _mixer(buf, c):
    mixer.draw_body(buf, c, 3.0)
    mixer.draw_cup(buf, c, 0.0, ghost=False)


SPRITES = [
    ('mixer', 'the vortex mixer', _mixer, Wd.Cam(0, 45, 2.4)),
    ('tube-layers', 'tube: two layers', lambda b, c: TB.draw(b, c, 0, 0, 0, 0, (0.0, 0, 0, 0), hand=False),
     Wd.Cam(0, 50, 2.4)),
    ('tube-vortex', 'tube: the vortex', lambda b, c: TB.draw(b, c, 0, 0, 0, 0, TB.state(9.5), hand=False),
     Wd.Cam(0, 50, 2.4)),
    ('tube-mixed', 'tube: mixed', lambda b, c: TB.draw(b, c, 0, 0, 0, 0, (1.0, 0, 0, 0), hand=False),
     Wd.Cam(0, 50, 2.4)),
    ('tube-hand', 'tube in a gloved hand', lambda b, c: TB.draw(b, c, 0, 0, 0, 0, (0.0, 0, 0, 0)),
     Wd.Cam(10, 70, 2.2)),
]
TILES = [
    ('tile-hook', 'the hook', 1.6), ('tile-lab', 'the lab', 3.0), ('tile-xray', 'the x-ray', 5.3),
    ('tile-orbit', 'the orbit', 7.2), ('tile-vortex', 'the vortex', 9.5), ('tile-stretch', 'stretch', 11.2),
    ('tile-dye', 'dye mixing', 12.9), ('tile-mixed', 'mixed!', 14.4), ('tile-versus', 'diffusion vs vortex', 20.5),
    ('tile-stars', 'three stars', 26.7),
]


def export(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name, label, draw, cam in SPRITES:
        im = _iso(draw, cam)
        if im is None:
            log(f'  (empty) {name}')
            continue
        im.save(out / f'{name}.png')
        tiles.append((label, im))
        log(f'  {name}.png  {im.size[0]}x{im.size[1]}')
    for name, label, t in TILES:
        im = Image.fromarray(scenes.frame(t)).convert('RGBA')
        im.save(out / f'{name}.png')
        tiles.append((label, im))
        log(f'  {name}.png  {im.size[0]}x{im.size[1]}')
    z, pad, lab, cols = 1, 10, 14, 5
    cw = max(im.size[0] for _, im in tiles) * z + pad
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(im.size[1] for _, im in r) * z + pad + lab for r in rows]
    sheet = Image.new('RGBA', (cols * cw + pad, sum(rh) + pad), HUD[1] + (255,))
    d = ImageDraw.Draw(sheet)
    y = pad
    for r, h in zip(rows, rh):
        for k, (label, im) in enumerate(r):
            x = pad + k * cw
            d.text((x, y), label, fill=(230, 236, 245, 255))
            sheet.alpha_composite(im, (x, y + lab))
        y += h
    sheet.convert('RGB').save(out / '_sheet.png')
    log(f'sprites -> {out}  ({len(tiles)} sprites and tiles + _sheet.png)')
    return out
