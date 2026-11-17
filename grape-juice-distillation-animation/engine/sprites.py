"""Export the sprites as PNGs: every object at the camera scales the film uses (wide, close-up, cutaway), with a
transparent background, plus one labelled overview sheet.

The art itself is code (engine/grape.py, engine/rig.py): each object is redrawn at the camera's own scale, which is
why a zoom reveals new detail (graduations on the thermometer, the frosted joints, the boiling chips, the hatched cut
walls) instead of fattening pixels. These PNGs are an export of that code for reference and reuse. To change a sprite,
edit the code and export again:

    python render.py --sprites            # -> assets/sprites/*.png and assets/sprites/_sheet.png
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from . import world as Wd
from . import rig, grape, heater
from . import timeline as T
from .palette import NAVY

_KEYS = ((255, 0, 255), (0, 255, 0))


def _iso(draws, cam, t):
    """Draw only these objects, on two different key colours; a pixel that differs between the two is background."""
    outs = []
    for key in _KEYS:
        buf = np.empty((Wd.H, Wd.W, 3), np.uint8)
        buf[:] = key
        for d in draws:
            d(buf, cam, t)
        outs.append(buf)
    a, b = outs
    alpha = np.all(a == b, axis=2)
    rgba = np.dstack([a, np.where(alpha, 255, 0).astype(np.uint8)])
    rgba[~alpha, :3] = 0
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        return None
    pad = 2
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, Wd.H)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, Wd.W)
    return Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')


def _flask_and_neck(buf, c, t):
    rig.draw_flask(buf, c, t)


def _grape_all(buf, c, t):
    grape.draw_grape(buf, c, t)


def _stream(buf, c, t):
    grape.draw_stream(buf, c, t)
    grape.draw_landing(buf, c, t)


def _section(buf, c, t):
    rig.draw_condenser(buf, c, t)
    rig.draw_heat(buf, c, t)
    rig.draw_beads(buf, c, t)


def _receiver(buf, c, t):
    rig.draw_receiver(buf, c, t)
    rig.draw_adapter(buf, c, t)
    rig.draw_splash(buf, c, t)


def _rig_wide(buf, c, t):
    for d in (rig.draw_stand, heater.draw_cord, rig.draw_hoses, heater.draw_mantle, rig.draw_receiver,
              rig.draw_condenser, rig.draw_adapter, rig.draw_flask, rig.draw_still_head, rig.draw_vapour,
              rig.draw_clamp_jaws):
        d(buf, c, t)


def _heater_xray(buf, c, t):
    heater.draw_mantle(buf, c, t)
    rig.draw_flask(buf, c, t)
    heater.draw_heat_in(buf, c, t)


S_GRAPE = T.MATCH_R / grape.RX
COND_MID = rig.p_on(85.0)
SEC_MID = rig.p_on(rig.SEC)

# (file name, label, draw functions, camera (cx, cy, px/mm), time)
SPRITES = [
    ('grape-closeup-0', 'grape close-up (hook, t=0)', [_grape_all], (grape.G[0], grape.G[1] + 14, S_GRAPE), 0.0),
    ('grape-closeup-glint', 'grape close-up: glint', [_grape_all], (grape.G[0], grape.G[1] + 14, S_GRAPE), 0.16),
    ('grape-closeup-squash', 'grape close-up: squash', [_grape_all], (grape.G[0], grape.G[1] + 14, S_GRAPE), 0.5),
    ('grape-wide', 'grape wide', [_grape_all], (grape.G[0], grape.G[1] + 14, 1.8), 0.0),
    ('juice-stream', 'juice stream into the flask neck', [_stream, rig.draw_cork, _flask_and_neck],
     (grape.G[0], 70.0, 1.8), 1.8),
    ('flask-hop-stretch', 'flask hop: stretched in the air', [_flask_and_neck], (-90.0, 100.0, 1.6), 3.3),
    ('flask-hop-squash', 'flask hop: squashed on landing', [_flask_and_neck], (rig.F_HOME[0], 90.0, 1.6), 3.52),
    ('flask-wide', 'round-bottom flask, wide', [_flask_and_neck], (rig.F_HOME[0], rig.F_HOME[1] + 20, 1.0), 5.0),
    ('flask-closeup-boiling', 'round-bottom flask, close-up, boiling', [_flask_and_neck],
     (rig.F_HOME[0], rig.F_HOME[1] + 20, 3.0), 14.0),
    ('mantle-off', 'heating mantle, off', [heater.draw_cord, heater.draw_mantle], (rig.MX, 28.0, 2.4), 5.0),
    ('mantle-on', 'heating mantle, on (lining glows)', [heater.draw_mantle], (rig.MX, 28.0, 2.4), 14.0),
    ('heater-xray-cold', 'heater x-ray: coil, bowl, insulation, regulator', [_heater_xray],
     (rig.MX, 50.0, 3.0), 8.6),
    ('heater-xray-hot', 'heater x-ray: current, hot coil, heat into the juice', [_heater_xray],
     (rig.MX, 50.0, 3.0), 11.0),
    ('still-head-closeup', 'still head + thermometer, close-up', [rig.draw_still_head], (rig.J[0], 196.0, 3.0), 16.0),
    ('condenser-outside', 'Liebig condenser, outside view', [rig.draw_condenser], (*COND_MID, 1.55), 14.0),
    ('condenser-cutaway', 'Liebig condenser, cutaway', [rig.draw_condenser], (*COND_MID, 1.55), 19.0),
    ('condenser-section-heat', 'cutaway section: heat crosses the wall', [_section], (*SEC_MID, 10.0), 20.95),
    ('condenser-section-beads', 'cutaway section: beads on the wall', [_section], (*SEC_MID, 10.0), 23.3),
    ('receiver-splash', 'receiver, close-up: the first drop lands', [_receiver], (rig.TIP[0], 20.0, 2.6), 26.08),
    ('receiver-wide', 'receiver, wide: distillate collected', [_receiver], (rig.TIP[0], 30.0, 1.0), 29.7),
    ('hanging-drop', 'the next hanging drop (loop frame)', [rig.draw_hanging_drop, rig.draw_adapter],
     (rig.TIP[0], rig.TIP[1] - 3.0, T.MATCH_R / 3.0), 30.95),
    ('apparatus-wide', 'the whole apparatus, wide', [_rig_wide], (12.0, 128.0, 1.0), 29.7),
]


def export(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name, label, draws, cam, t in SPRITES:
        im = _iso(draws, Wd.Cam(*cam), t)
        if im is None:
            log(f'  (empty) {name}')
            continue
        im.save(out / f'{name}.png')
        tiles.append((label, cam[2], im))
        log(f'  {name}.png  {im.size[0]}x{im.size[1]}  @ {cam[2]:.2f} px/mm')
    # the overview sheet: 2x nearest-neighbour on navy, labelled
    z, pad, lab = 2, 10, 14
    cols = 4
    cw = max(im.size[0] for _, _, im in tiles) * z + pad
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(im.size[1] for _, _, im in r) * z + pad + lab for r in rows]
    sheet = Image.new('RGBA', (cols * cw + pad, sum(rh) + pad), NAVY[2] + (255,))
    d = ImageDraw.Draw(sheet)
    y = pad
    for r, h in zip(rows, rh):
        for k, (label, s, im) in enumerate(r):
            x = pad + k * cw
            d.text((x, y), f'{label}  ({s:.1f} px/mm)', fill=(230, 236, 245, 255))
            big = im.resize((im.size[0] * z, im.size[1] * z), Image.NEAREST)
            sheet.alpha_composite(big, (x, y + lab))
        y += h
    sheet.convert('RGB').save(out / '_sheet.png')
    log(f'sprites -> {out}  ({len(tiles)} sprites + _sheet.png)')
    return out
