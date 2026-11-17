"""Text: the clean caption layer (an RPG dialog box at the top, one or two short lines per step) and the result line.

The result line "His blood type is A" is part of the film in every version; the captions are on by default and off
with render.py --clean. lang='id' writes the captions (and the result line) in Bahasa Indonesia.
Markers inside a line: [cyan] = Anti-A antibody, {gold} = A markers, <mint> = Anti-B; they are not drawn.
"""
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T

W, H = gfx.W, gfx.H
CPS = 55.0

TEXT = {
    'en': {
        'drops': ['ONE BLOOD SAMPLE, FOUR DROPS', 'THEY ALL LOOK THE SAME'],
        'reagents': ['EACH SPOT GETS ITS TEST LIQUID', 'CONTROL: NO TYPING ANTIBODIES'],
        'later': ['MOMENTS LATER...', 'ONLY ANTI-A TURNS GRAINY'],
        'dive': ['WHAT HAPPENS INSIDE ANTI-A?'],
        'cells': ['RED BLOOD CELLS', 'GOLD TABS = {A MARKERS}'],
        'bind1': ['AN [ANTI-A ANTIBODY]', 'GRABS ONE {A MARKER}'],
        'bind2': ['ITS OTHER ARM GRABS', 'A 2ND CELL: A [BRIDGE]'],
        'clump': ['MANY [BRIDGES] = A CLUMP', 'AGGLUTINATION, NOT A CLOT'],
        'antib': ['<ANTI-B> NEEDS B MARKERS', 'NONE HERE: NO BRIDGES'],
        'smooth': ['THE CELLS STAY APART: SMOOTH'],
        'compare': ['ONLY ANTI-A CLUMPED', 'THE OTHER THREE STAY SMOOTH'],
        'result1': 'His blood type is', 'result2': 'A',
    },
    'id': {
        'drops': ['SATU SAMPEL DARAH, 4 TETES', 'SEMUANYA TAMPAK SAMA'],
        'reagents': ['TIAP TITIK DIBERI CAIRAN UJI', 'KONTROL: TANPA ANTIBODI'],
        'later': ['BEBERAPA SAAT KEMUDIAN...', 'HANYA ANTI-A JADI BERBUTIR'],
        'dive': ['APA YANG TERJADI DI ANTI-A?'],
        'cells': ['SEL DARAH MERAH', 'TONJOLAN EMAS = {PENANDA A}'],
        'bind1': ['[ANTIBODI ANTI-A]', 'MENGIKAT SATU {PENANDA A}'],
        'bind2': ['LENGAN LAINNYA MENGIKAT', 'SEL KEDUA: JADI [JEMBATAN]'],
        'clump': ['BANYAK [JEMBATAN] = GUMPALAN', 'AGLUTINASI, BUKAN BEKU'],
        'antib': ['<ANTI-B> BUTUH PENANDA B', 'DI SINI TIDAK ADA'],
        'smooth': ['SEL TETAP TERPISAH: HALUS'],
        'compare': ['HANYA ANTI-A MENGGUMPAL', 'TIGA LAINNYA TETAP HALUS'],
        'result1': 'Golongan darahnya', 'result2': 'A',
    },
}

CAPTIONS = [
    (0.15, 2.90, 'drops'),
    (3.00, 4.95, 'reagents'),
    (5.05, 6.15, 'later'),
    (6.25, 7.40, 'dive'),
    (7.55, 9.00, 'cells'),
    (9.10, 11.45, 'bind1'),
    (11.55, 13.45, 'bind2'),
    (13.55, 15.95, 'clump'),
    (16.05, 17.75, 'antib'),
    (17.85, 18.95, 'smooth'),
    (19.05, 20.30, 'compare'),
]
BOX_X0, BOX_X1, BOX_Y0 = 8, 262, 12
_ICON = ['.##.', '####', '####', '.##.']


def _parse(line):
    out, col = [], P.INK
    for ch in line:
        if ch == '[':
            col = P.CYAN[3]
        elif ch == '{':
            col = P.GOLD[2]
        elif ch == '<':
            col = P.MINT[3]
        elif ch in ']}>':
            col = P.INK
        else:
            out.append((ch, col))
    return out


def _rich(buf, segs, x, y, scale=1, outline=True):
    if not segs:
        return
    text = ''.join(c for c, _ in segs)
    if outline:
        gfx.fill(buf, pixfont.text_mask(text, x, y, scale=scale).dilate(1, diag=True), P.NAVY[0])
    cx = x
    run, rc = '', segs[0][1]
    for ch, col in segs + [('', None)]:
        if col != rc or ch == '':
            if run:
                gfx.fill(buf, pixfont.text_mask(run, cx, y, scale=scale), rc)
                cx += pixfont.text_size(run, scale=scale)[0] + scale
            run, rc = ch, col
        else:
            run += ch


def _box(buf, x0, x1, y0, y1):
    sub = buf[y0:y1, x0:x1]
    sub[...] = P.NAVY[1]
    buf[y0, x0 + 1:x1 - 1] = P.IVORY[3]
    buf[y1 - 1, x0 + 1:x1 - 1] = P.IVORY[3]
    buf[y0 + 1:y1 - 1, x0] = P.IVORY[3]
    buf[y0 + 1:y1 - 1, x1 - 1] = P.IVORY[3]
    buf[y0 + 1, x0 + 1:x1 - 1] = P.NAVY[3]


def caption(buf, t, lang):
    for t0, t1, key in CAPTIONS:
        if not t0 <= t < t1:
            continue
        lines = TEXT[lang][key]
        el, left = t - t0, t1 - t
        n = len(lines)
        h = 10 + 7 * n + 3 * (n - 1)
        if el < 0.07 or left < 0.07:                        # the box opens and closes in two frames
            cx = (BOX_X0 + BOX_X1) // 2
            _box(buf, cx - 40, cx + 40, BOX_Y0 + h // 2 - 2, BOX_Y0 + h // 2 + 3)
            return
        _box(buf, BOX_X0, BOX_X1, BOX_Y0, BOX_Y0 + h)
        iy = BOX_Y0 + (h - 4) // 2                          # narrator icon: a red cell
        for r, row in enumerate(_ICON):
            for c, ch in enumerate(row):
                if ch == '#':
                    buf[iy + r, BOX_X0 + 6 + c] = P.RED[3] if (r, c) not in ((1, 1), (1, 2)) else P.RED[5]
        shown = int((el - 0.07) * CPS)
        y = BOX_Y0 + 5
        for line in lines:
            segs = _parse(line)
            k = max(0, min(len(segs), shown))
            _rich(buf, segs[:k], BOX_X0 + 16, y)
            if k < len(segs):
                break
            shown -= len(segs)
            y += 10
        return


def result(buf, t, lang, dx=0):
    """'His blood type is' + a big gold A (it appears, scales up once, and settles on the chime)."""
    if t < T.HEAD:
        return
    L = TEXT[lang]
    line = L['result1']
    n = min(len(line), int((t - T.HEAD) * 60) + 1)
    w, h = pixfont.text_size(line, scale=2)
    x = (W - w) // 2 + dx
    _rich(buf, [(c, P.IVORY[3]) for c in line[:n]], x, 22, scale=2)
    if t < T.A_POP:
        return
    f = T.frame(t) - T.frame(T.A_POP)
    scale = 12 if (t >= T.CHIME or f < 2) else 13
    aw, ah = pixfont.text_size(L['result2'], scale=scale)
    ax = (W - aw) // 2 + dx
    ay = 44 - (ah - pixfont.text_size(L['result2'], scale=12)[1]) // 2
    mk = pixfont.text_mask(L['result2'], ax, ay, scale=scale)
    gfx.fill(buf, mk.dilate(2, diag=True), P.NAVY[0])
    gfx.fill(buf, pixfont.text_mask(L['result2'], ax + 2, ay + 2, scale=scale), P.GOLD[0])
    gfx.fill(buf, mk, P.GOLD[1])
    base = pixfont.text_bitmap(L['result2'])                   # light on the exposed top and left of each block
    for (r, c) in zip(*np.nonzero(base)):
        top = r == 0 or not base[r - 1, c]
        lft = c == 0 or not base[r, c - 1]
        y0, x0 = ay + r * scale, ax + c * scale
        if top:
            buf[max(y0, 0):max(min(y0 + 2, H), 0), max(x0, 0):max(min(x0 + scale, W), 0)] = P.GOLD[2]
        if lft:
            buf[max(y0, 0):max(min(y0 + scale, H), 0), max(x0, 0):max(min(x0 + 2, W), 0)] = P.GOLD[2]


def typing_events(lang='en'):
    ev = []
    for t0, t1, key in CAPTIONS:
        ev.append((t0, 'open'))
        n = sum(len(_parse(l)) for l in TEXT[lang][key])
        for i in range(0, n, 2):
            ev.append((t0 + 0.07 + i / CPS, 'type'))
    return sorted(ev)
