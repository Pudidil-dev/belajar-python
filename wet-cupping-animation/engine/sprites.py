"""Export the sprites as PNGs: the tools and cups with a transparent background, plus a few full-frame tiles of the
textures (the back, the cross-section, the capillaries, the collected blood, the mark), and one labelled sheet.

The art itself is code: every object is drawn per frame at the camera's own scale and angle. These PNGs are an export
of that code for reference and reuse. To change a sprite, edit the code and export again:

    python render.py --sprites            # -> assets/sprites/*.png and assets/sprites/_sheet.png
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from . import view as V
from . import state as S
from . import cups, tools, scenes
from . import timeline as T
from .palette import NAVY

_KEYS = ((255, 0, 255), (0, 255, 0))
X0, Y0 = S.SPOTS[S.MAIN]


def _iso(draws, view, t):
    outs = []
    for key in _KEYS:
        buf = np.empty((V.H, V.W, 3), np.uint8)
        buf[:] = key
        for d in draws:
            d(buf, view, t)
        outs.append(buf)
    a, b = outs
    alpha = np.all(a == b, axis=2)
    rgba = np.dstack([a, np.where(alpha, 255, 0).astype(np.uint8)])
    rgba[~alpha, :3] = 0
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        return None
    y0, y1 = max(ys.min() - 2, 0), min(ys.max() + 3, V.H)
    x0, x1 = max(xs.min() - 2, 0), min(xs.max() + 3, V.W)
    return Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')


def _one_cup(e, zl=0.0):
    return lambda buf, v, t: cups.draw_cup(buf, v, t, X0, Y0, zl)


SPRITES = [
    ('lancet-top', 'lancet pen in a gloved hand (top view)', [tools.draw_lancet], V.View(0, 110, 0, 2.0, 90), 1.2),
    ('cup-top', 'clear cup, top view', [_one_cup(90)], V.View(X0, Y0, 0, 4.0, 90), 2.0),
    ('cup-angled', 'clear cup, angled view', [_one_cup(45)], V.View(X0, Y0 + 8, 18, 4.0, 45), 2.0),
    ('cup-side-cut', 'the cup cut in half (side view)',
     [lambda buf, v, t: cups.draw_cut_cup(buf, v, t, X0)], V.View(X0, Y0, 20, 4.5, 0, Y0), 8.0),
    ('pump-hose', 'hand vacuum pump and hose (top view)', [tools.draw_pump], V.View(14, 122, 0, 2.35, 90), 4.6),
    ('gauze-hand', 'gauze pad in a gloved hand (angled view)', [tools.draw_gauze], V.View(X0, Y0 + 3, 0, 3.0, 58),
     22.8),
    ('hand-valve', 'gloved hand opening the valve (side view)', [tools.draw_side_hand],
     V.View(X0, Y0, 10, 5.0, 0, Y0), 18.75),
    ('hand-lift', 'gloved hand lifting the cup (side view)', [tools.draw_side_hand], V.View(X0, Y0, 30, 4.2, 0, Y0),
     20.0),
]
TILES = [
    ('tile-back-top', 'the back from above, marked spots (opening frame)', 0.0),
    ('tile-cutaway', 'skin cross-section: low pressure lifts a dome', 8.6),
    ('tile-capillaries', 'capillary loops with red blood cells', 10.6),
    ('tile-collected-blood', 'red blood cells in the collected blood', 16.5),
    ('tile-cupping-mark', 'the round mark after cleaning', 23.9),
]


def export(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name, label, draws, view, t in SPRITES:
        im = _iso(draws, view, t)
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
    z, pad, lab = 2, 10, 14
    cols = 4
    cw = max(im.size[0] for _, im in tiles) * z + pad
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(im.size[1] for _, im in r) * z + pad + lab for r in rows]
    sheet = Image.new('RGBA', (cols * cw + pad, sum(rh) + pad), NAVY[2] + (255,))
    d = ImageDraw.Draw(sheet)
    y = pad
    for r, h in zip(rows, rh):
        for k, (label, im) in enumerate(r):
            x = pad + k * cw
            d.text((x, y), label, fill=(230, 236, 245, 255))
            sheet.alpha_composite(im.resize((im.size[0] * z, im.size[1] * z), Image.NEAREST), (x, y + lab))
        y += h
    sheet.convert('RGB').save(out / '_sheet.png')
    log(f'sprites -> {out}  ({len(tiles)} sprites and tiles + _sheet.png)')
    return out
