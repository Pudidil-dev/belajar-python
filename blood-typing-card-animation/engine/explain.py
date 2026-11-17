"""Text: the tracking explanations (small labels pinned to the things they explain, following them on screen) and
the result line.

The result line "His blood type is A" is part of the film in every version; the captions are on by default and off
with render.py --clean. lang='id' writes the captions (and the result line) in Bahasa Indonesia.
Markers inside a line: [cyan] = Anti-A antibody, {gold} = A markers, <mint> = Anti-B; they are not drawn.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T

W, H = gfx.W, gfx.H
CPS = 55.0

TEXT = {
    'en': {
        'sample': 'SAME BLOOD SAMPLE', 'same': '4 DROPS, ALL THE SAME', 'testliquid': 'ANTI-A REAGENT',
        'noab': 'CONTROL: NO ANTIBODIES', 'clumped': 'CLUMPS = GRAINY', 'smooth': 'SMOOTH',
        'speck': 'ONE DARK SPECK...', 'rbc': 'RED BLOOD CELL', 'marker': 'A MARKER (ANTIGEN)',
        'antiA': 'ANTI-A ANTIBODY', 'grabs': 'GRABS AN A MARKER', 'cell2': '2ND CELL',
        'bridge': 'BRIDGE: 2 CELLS LINKED', 'clump': 'MANY BRIDGES = A CLUMP', 'agglut': 'AGGLUTINATION, NOT A CLOT',
        'antiB': 'ANTI-B ANTIBODY', 'nogrip': 'NO B MARKERS: NO GRIP', 'staysmooth': 'STAYS SMOOTH',
        'f_clumped': 'CLUMPED', 'f_smooth': 'SMOOTH',
        'result1': 'His blood type is', 'result2': 'A',
    },
    'id': {
        'sample': 'SAMPEL DARAH SAMA', 'same': '4 TETES, SEMUA SAMA', 'testliquid': 'REAGEN ANTI-A',
        'noab': 'KONTROL: TANPA ANTIBODI', 'clumped': 'MENGGUMPAL = BERBUTIR', 'smooth': 'HALUS',
        'speck': 'SATU BINTIK GELAP...', 'rbc': 'SEL DARAH MERAH', 'marker': 'PENANDA A (ANTIGEN)',
        'antiA': 'ANTIBODI ANTI-A', 'grabs': 'MENGIKAT PENANDA A', 'cell2': 'SEL KEDUA',
        'bridge': 'JEMBATAN: 2 SEL TERHUBUNG', 'clump': 'BANYAK JEMBATAN = GUMPALAN',
        'agglut': 'AGLUTINASI, BUKAN BEKU DARAH', 'antiB': 'ANTIBODI ANTI-B', 'nogrip': 'TAK ADA PENANDA B',
        'staysmooth': 'TETAP HALUS', 'f_clumped': 'MENGGUMPAL', 'f_smooth': 'HALUS',
        'result1': 'Golongan darahnya', 'result2': 'A',
    },
}


# ------------------------------------------------------------------ anchors (world coordinates of the explained thing)
def _body(tip):
    x, y, a = tip
    r = math.radians(a)
    return x + 30 * math.sin(r), y - 30 * math.cos(r)


def _sample(t):
    d = T.sample_dropper(t)
    return None if d is None else _body(d)


def _reagent(sp):
    def f(t):
        for s_, x, y, a in T.reagent_droppers(t):
            if s_ == sp:
                return _body((x, y, a))
        return None
    return f


def _spot(sp, dx=0.0, dy=0.0):
    return lambda t: (T.SPOTS[sp][0] + dx, T.SPOTS[sp][1] + dy)


def _fixed(x, y):
    return lambda t: (x, y)


C_RED, C_GOLD, C_CYAN, C_MINT, C_GLASS, C_IVORY = P.RED[5], P.GOLD[2], P.CYAN[3], P.MINT[3], P.GLASS[3], P.IVORY[3]
_C1x = T.C1[0]
# (start, end, key, space, anchor(t) -> world (x, y), label offset (dx, dy) in px or None = centred, accent, on card)
CALLOUTS = [
    (0.30, 2.15, 'sample', 'card', _sample, (16, -10), C_RED, False),
    (2.20, 2.95, 'same', 'card', _fixed(0.0, 10.0), None, C_RED, True),
    (2.95, 4.50, 'testliquid', 'card', _reagent('A'), (14, -16), C_GLASS, False),
    (3.55, 4.50, 'noab', 'card', _reagent('C'), (14, -16), C_GLASS, False),
    (5.15, 6.20, 'clumped', 'card', _spot('A', 0.0, -T.SPOT_R), (-30, -22), C_RED, True),
    (5.30, 6.20, 'smooth', 'card', _spot('B', 0.0, -T.SPOT_R), (-20, -22), C_IVORY, True),
    (6.35, 7.30, 'speck', 'card', lambda t: T.SPECK, (18, -26), C_RED, False),
    (7.60, 9.00, 'rbc', 'cell', _fixed(_C1x - 18.0, 12.0), (-60, 34), C_RED, False),
    (8.10, 10.35, 'marker', 'cell', _fixed(_C1x, -T.R_CELL - 2.2), (-36, -40), C_GOLD, False),
    (9.10, 10.45, 'antiA', 'cell', lambda t: T.hero_antibody(t)[0], (18, -22), C_CYAN, False),
    (10.55, 11.50, 'grabs', 'cell', _fixed(_C1x + T.R_CELL + T.TAB_LEN, 0.0), (-50, 36), C_CYAN, False),
    (11.55, 12.45, 'cell2', 'cell', lambda t: T.c2_pos(t), (-10, 40), C_RED, False),
    (12.55, 13.45, 'bridge', 'cell', _fixed(8.0, -6.0), (-60, -46), C_CYAN, False),
    (13.60, 15.95, 'clump', 'cell', _fixed(8.0, -60.0), (-66, -40), C_CYAN, False),
    (14.30, 15.95, 'agglut', 'cell', _fixed(8.0, 80.0), (-76, 36), C_RED, False),
    (16.15, 16.95, 'antiB', 'cell', lambda t: T.anti_b(t)[0], (18, -16), C_MINT, False),
    (16.95, 17.70, 'nogrip', 'cell', lambda t: T.anti_b(t)[0], (18, -16), C_MINT, False),
    (17.95, 18.95, 'staysmooth', 'card', _spot('B', 0.0, -T.SPOT_R), (-30, -22), C_IVORY, True),
    (19.10, 20.30, 'f_clumped', 'card', _spot('A', 0.0, -T.SPOT_R - 6), (-22, -18), C_RED, True),
    (19.20, 20.30, 'f_smooth', 'card', _spot('B', 0.0, -T.SPOT_R), (-18, -18), C_IVORY, True),
    (19.25, 20.30, 'f_smooth', 'card', _spot('D', 0.0, -T.SPOT_R), (-18, -18), C_IVORY, True),
    (19.30, 20.30, 'f_smooth', 'card', _spot('C', 0.0, -T.SPOT_R), (-18, -18), C_IVORY, True),
]
CPS = 75.0


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


def _line(buf, x0, y0, x1, y1, col, dotted=True):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        if dotted and i % 2:
            continue
        u = i / max(n - 1, 1)
        x, y = int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def _plate(buf, x0, y0, x1, y1, accent):
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if x1 <= x0 or y1 <= y0:
        return
    sub = buf[y0:y1, x0:x1].astype(np.float32)
    col = np.asarray(P.NAVY[0], np.float32)
    buf[y0:y1, x0:x1] = (sub + (col - sub) * 0.86).astype(np.uint8)
    buf[y1 - 1, x0:x1] = accent


def callouts(buf, space, view, card_off, t, lang):
    """Tracking explanations: a small dark label pinned to the thing it explains by a dotted leader line. The anchor
    is recomputed every frame through the camera on screen, so the label follows the object."""
    for t0, t1, key, sp, anchor, off, accent, on_card in CALLOUTS:
        if sp != space or not t0 <= t < t1:
            continue
        p = anchor(t)
        if p is None:
            continue
        el, left = t - t0, t1 - t
        if left < 0.1 and int(left / 0.034) % 2 == 0:
            continue                                             # blink out
        x, y = p
        if on_card:
            x += card_off
        ax, ay = view.px(x, y)
        if not (-30 < ax < W + 30 and -30 < ay < H + 30):
            continue
        text = TEXT[lang][key]
        w, h = pixfont.text_size(text)
        if off is None:
            lx, ly = int(round(ax - w / 2)), int(round(ay - h / 2))
        else:
            dx, dy = off
            lx = ax + dx if ax + dx + w < W - 4 else ax - abs(dx) - w     # flip sides near the right edge
            if lx < 4:
                lx = ax + abs(dx)
            ly = ay + dy
            lx, ly = int(round(lx)), int(round(ly))
        lx = min(max(lx, 4), W - 4 - w)
        ly = min(max(ly, 6), H - 10 - h)
        g = min(1.0, el / 0.08)
        if off is not None:
            tx = min(max(ax, lx - 2), lx + w + 1)
            ty = ly + h + 2 if ay > ly + h else ly - 3
            _line(buf, ax, ay, ax + (tx - ax) * g, ay + (ty - ay) * g, accent)
            for ddx, ddy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                xx, yy = int(ax) + ddx - 1, int(ay) + ddy - 1
                if 0 <= xx < W and 0 <= yy < H:
                    buf[yy, xx] = accent
        if g < 1.0:
            continue
        n = int((el - 0.08) * CPS) + 1
        _plate(buf, lx - 3, ly - 3, lx + w + 3, ly + h + 3, accent)
        _rich(buf, [(c, P.INK) for c in text[:n]], lx, ly, outline=False)


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


def events(lang='en'):
    """When each tracking label appears (for a soft pop in the soundtrack)."""
    return sorted(t0 + 0.08 for t0, *_ in CALLOUTS)
