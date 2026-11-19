"""Export the sprites as PNGs: the capsule, a formed card and a sealed card, the hopper full of capsules, the heated
sealing roller, the hand and thumb with the hero's card, and full-frame tiles of the key moments; plus one labelled
sheet.

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
from . import pix, web, feeder, machine, hand, scenes
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
    web.draw_hand_card(b, c, 19.9)
    hand.draw_thumb(b, c, 19.9)


SPRITES = [
    ('capsule', 'the capsule (the hero)', lambda b, c: pix.capsule(b, c, 0.0, 0.0, 0.0), Wd.Cam(0, 0, 8.0)),
    ('card-formed', 'a card, pockets formed', lambda b, c: web.card(b, c, -50.0, 0.0, 0.0,
                                                                   [(T.POCKET_D, None, False)] * 5, None),
     Wd.Cam(0, -3, 2.5)),
    ('card-sealed', 'a sealed card', lambda b, c: web.card(b, c, -50.0, 0.0, 0.0, web._full_card(), 0.0),
     Wd.Cam(0, -3, 2.5)),
    ('hopper', 'the hopper, full', lambda b, c: feeder.draw_hopper(b, c, 6.5), Wd.Cam(-110.0, 198.0, 2.4)),
    ('sealing-roller', 'the heated sealing roller', lambda b, c: machine.sealing_front(b, c, 12.6),
     Wd.Cam(T.XS - 8.0, 132.0, 2.4)),
    ('hand-thumb', 'the thumb on the card', _hand, Wd.Cam(T.XP + 12.0, 190.0, 2.4)),
]
TILES = [
    ('tile-hook', 'the hook', 0.4), ('tile-question', 'how did I get in here?', 1.3),
    ('tile-rewind', 'the rewind', 3.0), ('tile-pockets', 'LV.1 pockets', 5.6), ('tile-lineup', 'LV.2 line up', 7.4),
    ('tile-drop', 'LV.3 drop', 9.3), ('tile-scan', 'LV.4 scan', 10.9), ('tile-seal', 'LV.5 seal', 12.7),
    ('tile-shield', 'the shield', 13.55), ('tile-cut', 'LV.6 cut', 14.7), ('tile-boss', 'final boss', 16.6),
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
