"""Export the sprites as PNGs: the capsule (and its close-up), a sealed card foil side up, the hero's card with the
pocket pushed up and then burst, the boss's hand, the sealing roller with its foil, and full-frame tiles of the key
moments; plus one labelled sheet.

The art itself is code: every object is drawn per frame at the camera's own scale. These PNGs are an export of that
code for reference and reuse (transparent where nothing is drawn). To change a sprite, edit the code and export again:

    python render.py --sprites            # -> assets/sprites/*.png and assets/sprites/_sheet.png
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from . import gfx
from . import world as Wd
from . import timeline as T
from . import pix, line, stations, hand, scenes
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


def _hand(b, c):
    hand.draw(b, c, 2.0, -24.0, 0.0, thumb_only=True)
    line.card(b, c, 0.0, 0.0, 0.0, hero_tag=True, bump=1.0, shadow=False)
    hand.draw(b, c, 2.0, -24.0, 0.0)


def _roller(b, c):
    stations.seal_over(b, c, 12.0)


SPRITES = [
    ('capsule', 'the capsule (the hero)', lambda b, c: pix.capsule(b, c, 0.0, 0.0, 0.0), Wd.Cam(0, 0, 8.0)),
    ('capsule-close', 'the capsule, close up', lambda b, c: pix.capsule(b, c, 0.0, 0.0, -26.0), Wd.Cam(0, 0, 13.0)),
    ('card-sealed', 'a sealed card, foil up', lambda b, c: line.card(b, c, 0.0, 0.0, 0.0, shadow=False),
     Wd.Cam(0, 0, 3.4)),
    ('card-pressed', "the hero's card, pushed up", lambda b, c: line.card(b, c, 0.0, 0.0, 0.0, hero_tag=True, bump=1.0,
                                                                         shadow=False), Wd.Cam(0, 0, 3.4)),
    ('card-burst', "the hero's card, burst", lambda b, c: line.card(b, c, 0.0, 0.0, 0.0, hero_tag=True, torn=1.0,
                                                                    shadow=False), Wd.Cam(0, 0, 3.4)),
    ('card-reject', 'a rejected card', lambda b, c: line.card(b, c, 0.0, 0.0, 0.0, reject=True, shadow=False),
     Wd.Cam(0, 0, 3.4)),
    ('hand', 'the final boss: the hand and the card', _hand, Wd.Cam(18.0, -40.0, 2.4)),
    ('sealing-roller', 'the foil and the sealing roller', _roller, Wd.Cam(0.0, T.Y_SEAL + 22.0, 2.6)),
]
TILES = [
    ('tile-pop', 'the hook: POP', 0.06), ('tile-question', 'how did I get in here?', 1.0),
    ('tile-rewind', 'the rewind', 1.75), ('tile-mold', 'STAGE 1 MOLD', 3.3), ('tile-fill', 'STAGE 2 FILL', 5.6),
    ('tile-perfect', 'PERFECT!', 6.8), ('tile-scan', 'STAGE 3 SCAN', 9.45), ('tile-seal', 'STAGE 4 SEAL', 12.05),
    ('tile-cut', 'STAGE 5 CUT', 13.6), ('tile-warning', 'WARNING', 15.6), ('tile-boss', 'final boss', 16.3),
    ('tile-press', 'the press', 19.6),
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
    z, pad, lab, cols = 1, 10, 14, 6
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
