"""The explanation layer: tells the viewer what they are looking at, in the film's own 16-bit lab-game style.

  * Caption box: an RPG-style dialog box at the top that types one or two short lines for each step of the test
    (the question, the workflow steps 1-6, what each enzyme does, what the photometer measures, the result).
  * Part tags: small labels with leader lines pinned on the parts while a shot holds (trays, probes, cuvette,
    stirrer, the molecules, the photometer parts, the workstation and the example value).
  * HUD plates: zoom factor and a scale bar on the machine and cutaway views; TIME-LAPSE, SCHEMATIC and
    NOT TO SCALE where the picture is not a straight view.

English by default, Indonesian with lang='id'. Everything is laid out in canvas pixels from the anchors of the
artwork on screen. The opening caption wraps across the loop point, so frame 0 still follows on from the last frame.
"""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from . import analyzer as AZ
from . import molecules, optics
from .view import View

W, H = gfx.W, gfx.H
CPS = 64.0                      # caption typing speed (characters per second)
TAG_CPS = 55.0

# [word] = teal accent (machine, reagent), {word} = gold accent (serum, cholesterol), <word> = rose (dye, result).
# The markers are not drawn.
TEXT = {
    'en': {
        'drop': ['HOW MUCH {CHOLESTEROL} IS IN', 'ONE DROP OF {SERUM}?'],
        'preview': ['ENZYMES TURN CHOLESTEROL <PINK>:', 'THE [ANALYZER] MEASURES THE COLOUR'],
        'tray': ['STEP 1: THE [REAGENT TRAY] TURNS', 'TO THE CHOLESTEROL REAGENT'],
        'draw_r': ['STEP 2: THE [REAGENT PROBE]', 'DRAWS UP ENZYME [REAGENT]'],
        'fill': ['...AND FILLS AN EMPTY [CUVETTE]', 'ON THE [REACTION RING]'],
        'draw_s': ['STEP 3: THE {SAMPLE PROBE}', 'DRAWS UP A LITTLE {SERUM}'],
        'add': ['...AND ADDS IT TO THE [REAGENT]'],
        'mix': ['STEP 4: THE [STIRRER] MIXES', '{SERUM} AND [REAGENT] EVENLY'],
        'ester': ['INSIDE: [ESTERASE] CUTS THE', 'FATTY ACID OFF {CHOLESTEROL}'],
        'oxid': ['[OXIDASE] USES O₂ ON {CHOLESTEROL}', 'AND RELEASES {H₂O₂} (PEROXIDE)'],
        'perox': ['[PEROXIDASE] + {H₂O₂} → <PINK DYE>', 'MORE CHOLESTEROL = MORE <PINK>'],
        'photo': ['STEP 5: THE RING CARRIES THE', 'CUVETTE INTO THE [PHOTOMETER]'],
        'light': ['[LIGHT] SHINES THROUGH THE <DYE>', 'THE DYE ABSORBS PART OF IT'],
        'detect': ['[DETECTOR]: LESS LIGHT GETS', 'THROUGH = MORE {CHOLESTEROL}'],
        'result': ['STEP 6: A CALIBRATION TURNS IT', 'INTO A RESULT IN <mg/dL>'],
        'next': ['...THEN THE NEXT [CUVETTE],', 'THE NEXT {SAMPLE}, THE NEXT TEST'],
        'reagent_tray': 'REAGENT TRAY', 'sample_tray': 'SAMPLE TRAY', 'ring': 'REACTION RING',
        'r_probe': 'REAGENT PROBE', 'bottle': 'CHOLESTEROL REAGENT', 'cuvette': 'CUVETTE',
        's_probe': 'SAMPLE PROBE', 'tube': 'SERUM SAMPLE', 'serum': 'SERUM', 'reagent': 'REAGENT',
        'stirrer': 'STIRRER', 'ester_m': 'CHOLESTEROL ESTER', 'esterase': 'ESTERASE', 'chol': 'CHOLESTEROL',
        'fatty': 'FATTY ACID', 'oxidase': 'OXIDASE', 'o2': 'O₂', 'h2o2': 'H₂O₂', 'peroxidase': 'PEROXIDASE',
        'dye_t': 'PINK DYE', 'photometer': 'PHOTOMETER', 'lamp': 'LAMP', 'lens': 'LENS', 'filter': 'FILTER',
        'cuv_o': 'CUVETTE', 'detector': 'DETECTOR', 'electronics': 'ELECTRONICS', 'ref': 'REFERENCE',
        'meas': 'MEASURED', 'workstation': 'WORKSTATION', 'example': 'EXAMPLE VALUE', 'next_cuv': 'NEXT CUVETTE',
        'zoom': 'ZOOM', 'timelapse': 'TIME-LAPSE', 'schematic': 'SCHEMATIC', 'not_scale': 'NOT TO SCALE',
        'sep': ',',
    },
    'id': {
        'drop': ['BERAPA BANYAK {KOLESTEROL}', 'DI SETETES {SERUM} INI?'],
        'preview': ['ENZIM MENGUBAH KOLESTEROL JADI <PINK>:', '[ALAT ANALISIS] MENGUKUR WARNANYA'],
        'tray': ['LANGKAH 1: [BAKI REAGEN] BERPUTAR', 'KE REAGEN KOLESTEROL'],
        'draw_r': ['LANGKAH 2: [PROBE REAGEN]', 'MENYEDOT [REAGEN] ENZIM'],
        'fill': ['...LALU MENGISI [KUVET] KOSONG', 'DI [CINCIN REAKSI]'],
        'draw_s': ['LANGKAH 3: {PROBE SAMPEL}', 'MENYEDOT SEDIKIT {SERUM}'],
        'add': ['...LALU MENAMBAHKANNYA KE [REAGEN]'],
        'mix': ['LANGKAH 4: [PENGADUK] MENCAMPUR', '{SERUM} DAN [REAGEN] SAMPAI RATA'],
        'ester': ['DI DALAM: [ESTERASE] MEMOTONG', 'ASAM LEMAK DARI {KOLESTEROL}'],
        'oxid': ['[OKSIDASE] MEMAKAI O₂ PADA {KOLESTEROL}', 'DAN MELEPAS {H₂O₂} (PEROKSIDA)'],
        'perox': ['[PEROKSIDASE] + {H₂O₂} → <ZAT WARNA PINK>', 'MAKIN BANYAK KOLESTEROL = MAKIN <PINK>'],
        'photo': ['LANGKAH 5: CINCIN MEMBAWA KUVET', 'MASUK KE [FOTOMETER]'],
        'light': ['[CAHAYA] MENEMBUS <ZAT WARNA>', 'SEBAGIAN CAHAYA DISERAP'],
        'detect': ['CAHAYA DI [DETEKTOR] MAKIN SEDIKIT', '= {KOLESTEROL} MAKIN BANYAK'],
        'result': ['LANGKAH 6: KALIBRASI MENGUBAHNYA', 'JADI HASIL DALAM <mg/dL>'],
        'next': ['...LALU [KUVET] BERIKUTNYA,', '{SAMPEL} DAN TES BERIKUTNYA'],
        'reagent_tray': 'BAKI REAGEN', 'sample_tray': 'BAKI SAMPEL', 'ring': 'CINCIN REAKSI',
        'r_probe': 'PROBE REAGEN', 'bottle': 'REAGEN KOLESTEROL', 'cuvette': 'KUVET',
        's_probe': 'PROBE SAMPEL', 'tube': 'SAMPEL SERUM', 'serum': 'SERUM', 'reagent': 'REAGEN',
        'stirrer': 'PENGADUK', 'ester_m': 'ESTER KOLESTEROL', 'esterase': 'ESTERASE', 'chol': 'KOLESTEROL',
        'fatty': 'ASAM LEMAK', 'oxidase': 'OKSIDASE', 'o2': 'O₂', 'h2o2': 'H₂O₂', 'peroxidase': 'PEROKSIDASE',
        'dye_t': 'ZAT WARNA PINK', 'photometer': 'FOTOMETER', 'lamp': 'LAMPU', 'lens': 'LENSA', 'filter': 'FILTER',
        'cuv_o': 'KUVET', 'detector': 'DETEKTOR', 'electronics': 'ELEKTRONIK', 'ref': 'REFERENSI',
        'meas': 'TERUKUR', 'workstation': 'WORKSTATION', 'example': 'CONTOH NILAI', 'next_cuv': 'KUVET BERIKUTNYA',
        'zoom': 'ZOOM', 'timelapse': 'DIPERCEPAT', 'schematic': 'SKEMA', 'not_scale': 'BUKAN SKALA ASLI',
        'sep': '.',
    },
}

# (start, end, key). An end past 36 s wraps: the opening question is on screen from 34.45 s through frame 0 to 1.0 s.
CAPTIONS = [
    (34.45, 37.00, 'drop'),
    (1.05, 3.80, 'preview'),
    (3.95, 5.95, 'tray'),
    (6.05, 7.95, 'draw_r'),
    (8.05, 9.95, 'fill'),
    (10.05, 11.95, 'draw_s'),
    (12.05, 13.95, 'add'),
    (14.05, 15.95, 'mix'),
    (16.10, 18.00, 'ester'),
    (18.10, 20.40, 'oxid'),
    (20.50, 22.95, 'perox'),
    (23.05, 25.45, 'photo'),
    (25.55, 27.95, 'light'),
    (28.05, 29.95, 'detect'),
    (30.05, 31.95, 'result'),
    (32.05, 34.35, 'next'),
]

BOX_X0, BOX_X1, BOX_Y0 = 8, 262, 22
TOP = 54                                          # tags and HUD stay below the caption box
_DROP_ICON = ['...#...', '...#...', '..###..', '..###..', '.#####.', '.#####.', '.#####.', '..###..']


# ------------------------------------------------------------------ anchors (canvas px) of the things we name
def _v2(t):
    from . import scenes
    return scenes.view2d(t)


def _m(x, y, z):
    """A fixed point of the analyzer drawing."""
    return lambda t: _v2(t).px(*AZ.proj(x, y, z))


def _arm(post, which, length):
    """The middle of a probe's tip housing (it moves with the arm)."""
    def f(t):
        st = T.machine(t)
        a = math.radians(st[which + '_ang'])
        x, y = post[0] + math.cos(a) * length, post[1] + math.sin(a) * length
        return _v2(t).px(*AZ.proj(x, y, st[which + '_z'] - 10.0))
    return f


def _hero_rim(t):
    x, y = AZ.slot_xy(T.hero_slot(t))
    return _v2(t).px(*AZ.proj(x, y, AZ.CUV_Z1))


def _hero_band(dz):
    def f(t):
        x, y = AZ.slot_xy(T.hero_slot(t))
        return _v2(t).px(*AZ.proj(x - 2.0, y + AZ.CUV_IN, AZ.CUV_Z0 + dz))
    return f


def _cut(cx, cy, zoom, x, y):
    """A point of a cutaway seen through its (static) camera."""
    v = View(cx, cy, zoom)
    return lambda t: v.px(x, y)


def _asp(x, y):
    """A point of the aspiration cutaways (their camera creeps in a little)."""
    def f(t):
        tt = t % T.TOTAL
        a, b = (6.55, 7.45) if tt < 9.0 else (10.8, 11.6)
        u = T.clamp01((tt - a) / (b - a))
        return View(0.0, 2.0, 9.5 + 1.0 * u).px(x, y)
    return f


def _opt(x, y):
    v = View(*optics.VIEW)
    return lambda t: v.px(x, y)


def _mol(key):
    def f(t):
        p = molecules.anchors(t).get(key)
        return None if p is None else molecules.view(t).px(*p)
    return f


_O = AZ.slot_xy(AZ.SLOT_O)
_SCR = AZ.SCREEN
_VAL = (_SCR[0] + 20.0 / 120.0 * (_SCR[1] - _SCR[0]), AZ.MON[3] + 0.5, _SCR[3] - 33.0 / 80.0 * (_SCR[3] - _SCR[2]))

# (start, end, key, anchor(t) -> canvas (x, y), label offset from the anchor in canvas px)
TAGS = [
    # the reveal: the parts of the analyzer
    (2.60, 3.80, 'reagent_tray', _m(AZ.RT[0], AZ.RT[1], 330.0), (-26, -40)),
    (2.70, 3.80, 'sample_tray', _m(AZ.ST[0], AZ.ST[1], 330.0), (-34, -40)),
    (2.80, 3.80, 'ring', _m(-40.0, AZ.DISK[1] + AZ.RING_R, 318.0), (-40, 36)),
    # the reagent side
    (4.25, 5.90, 'r_probe', _arm(AZ.RA_POST, 'ra', AZ.RA_LEN), (-60, 40)),
    (5.60, 6.50, 'bottle', _m(AZ.RA_BOTTLE[0], AZ.RA_BOTTLE[1] + 18.0, 360.0), (-40, 46)),
    (6.70, 7.40, 'reagent', _asp(-6.0, 14.0), (-30, 40)),
    (8.95, 9.95, 'cuvette', _hero_rim, (14, 36)),
    # the sample side
    (10.15, 10.75, 's_probe', _arm(AZ.SA_POST, 'sa', AZ.SA_LEN), (-70, 40)),
    (10.30, 10.75, 'tube', _m(AZ.SA_TUBE[0], AZ.SA_TUBE[1] + 6.0, 370.0), (16, 50)),
    (10.95, 11.55, 'serum', _asp(-5.0, 8.0), (-30, 40)),
    (11.70, 12.85, 's_probe', _arm(AZ.SA_POST, 'sa', AZ.SA_LEN), (-70, 40)),
    (13.35, 13.95, 'serum', _hero_band(19.0), (-62, -30)),
    (13.45, 13.95, 'reagent', _hero_band(10.0), (-74, -4)),
    (14.45, 15.50, 'stirrer', _cut(0.0, -12.5, 13.0, 2.9, -13.0), (24, -40)),
    # the molecules
    (16.55, 16.98, 'ester_m', _mol('ester_m'), (-30, -46)),
    (16.60, 17.85, 'esterase', _mol('esterase'), (30, 44)),
    (17.10, 18.60, 'chol', _mol('chol'), (-10, -44)),
    (17.15, 17.90, 'fatty', _mol('fatty'), (-20, 42)),
    (18.30, 19.90, 'oxidase', _mol('oxidase'), (34, 44)),
    (18.45, 18.98, 'o2', _mol('o2'), (26, -30)),
    (19.10, 21.20, 'h2o2', _mol('h2o2'), (-20, -40)),
    (20.30, 21.90, 'peroxidase', _mol('peroxidase'), (-40, 56)),
    (21.35, 21.95, 'dye_t', _mol('dye_t'), (24, -40)),
    # the photometer
    (23.20, 24.30, 'photometer', _m(_O[0], _O[1], 368.0), (-60, -44)),
    (24.70, 27.90, 'lamp', _opt(-26.5, optics.BEAM_Y), (-22, -110)),
    (24.85, 27.90, 'lens', _opt(-17.5, optics.BEAM_Y - 4.0), (-10, -82)),
    (25.00, 27.90, 'filter', _opt(-11.5, optics.BEAM_Y - 4.0), (6, -60)),
    (25.15, 27.90, 'cuv_o', _opt(0.0, -18.0), (-20, -30)),
    (25.30, 29.90, 'detector', _opt(28.0, optics.BEAM_Y - 5.5), (-36, -60)),
    (28.30, 29.90, 'electronics', _opt(-14.0, 39.0), (-4, -2)),
    # the result
    (30.30, 31.95, 'workstation', _m(AZ.MON[0] + 30.0, AZ.MON[3], AZ.MON[5]), (-60, -30)),
    (30.95, 31.95, 'example', _m(*_VAL), (-56, 92)),
    # the next test
    (32.60, 34.30, 'next_cuv', _m(AZ.S_POS[0], AZ.S_POS[1], AZ.CUV_Z1), (-40, 40)),
]


# ------------------------------------------------------------------ drawing helpers
def _since(t, t0):
    return (t - t0) % T.TOTAL


def _active(t, t0, t1):
    return _since(t, t0) < (t1 - t0)


def _parse(line):
    """'[A] b {C} <D>' -> [(char, colour), ...] without the markers."""
    out, col = [], P.INK
    for ch in line:
        if ch == '[':
            col = P.CY[7]
        elif ch == '{':
            col = P.SE[7]
        elif ch == '<':
            col = P.RO[6]
        elif ch in ']}>':
            col = P.INK
        else:
            out.append((ch, col))
    return out


def _rich(buf, segs, x, y):
    if not segs:
        return
    text = ''.join(c for c, _ in segs)
    full = pixfont.text_mask(text, x, y)
    gfx.fill(buf, full.dilate(1, diag=True), P.NV[0])
    cx = x
    run, rc = '', segs[0][1]
    for ch, col in segs + [('', None)]:
        if col != rc or ch == '':
            if run:
                gfx.fill(buf, pixfont.text_mask(run, cx, y), rc)
                cx += pixfont.text_size(run)[0] + 1
            run, rc = ch, col
        else:
            run += ch


def _box(buf, x0, x1, y0, y1):
    bx = (max(x0, 0), max(y0, 0), min(x1, W), min(y1, H))
    if bx[2] <= bx[0] or bx[3] <= bx[1]:
        return
    sub = buf[bx[1]:bx[3], bx[0]:bx[2]].astype(np.float32)
    col = np.asarray(P.NV[1], np.float32)
    buf[bx[1]:bx[3], bx[0]:bx[2]] = (sub + (col - sub) * 0.86).astype(np.uint8)
    # double border with clipped corners (SNES dialog box)
    for xx in range(x0 + 1, x1 - 1):
        for yy, c in ((y0, P.INK), (y1 - 1, P.INK), (y0 + 1, P.NV[6])):
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = c
    for yy in range(y0 + 1, y1 - 1):
        for xx, c in ((x0, P.INK), (x1 - 1, P.INK)):
            if 0 <= xx < W and 0 <= yy < H:
                buf[yy, xx] = c


def caption(buf, t, lang):
    for t0, t1, key in CAPTIONS:
        if not _active(t, t0, t1):
            continue
        lines = TEXT[lang][key]
        el = _since(t, t0)
        left = (t1 - t0) - el
        e = min(1.0, el / 0.1, left / 0.1)
        n = len(lines)
        h = 10 + 7 * n + 3 * (n - 1)
        cx = (BOX_X0 + BOX_X1) / 2
        half = (BOX_X1 - BOX_X0) / 2 * e
        x0, x1 = int(round(cx - half)), int(round(cx + half))
        if x1 - x0 < 6:
            return
        _box(buf, x0, x1, BOX_Y0, BOX_Y0 + h)
        if e < 1.0:
            return
        # the narrator icon: the pale-gold serum drop the film follows
        iy = BOX_Y0 + (h - 8) // 2
        for r, row in enumerate(_DROP_ICON):
            for c, ch in enumerate(row):
                if ch == '#':
                    col = P.SE[7] if (c > 3 or r < 4) else P.SE[5]
                    if r in (4, 5) and c == 2:
                        col = P.WHITE
                    buf[iy + r, BOX_X0 + 5 + c] = col
        shown = int((el - 0.1) * CPS)
        y = BOX_Y0 + 5
        typing = False
        for line in lines:
            segs = _parse(line)
            k = max(0, min(len(segs), shown))
            _rich(buf, segs[:k], BOX_X0 + 16, y)
            if k < len(segs):
                typing = True
                cxp = BOX_X0 + 16 + (pixfont.text_size(''.join(c for c, _ in segs[:k]))[0] + 1 if k else 0)
                if int(t * 12) % 2 == 0:
                    buf[y:y + 7, cxp:cxp + 2] = P.CY[6]
                break
            shown -= len(segs)
            y += 10
        if not typing and int(t * 3) % 2 == 0:              # "continue" marker
            mx, my = BOX_X1 - 9, BOX_Y0 + h - 6
            for dy, w_ in enumerate((5, 3, 1)):
                buf[my + dy, mx + (5 - w_) // 2: mx + (5 - w_) // 2 + w_] = P.CY[6]
        return


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        u = i / max(n - 1, 1)
        x, y = int(round(x0 + (x1 - x0) * u)), int(round(y0 + (y1 - y0) * u))
        if 0 <= x < W and 0 <= y < H:
            buf[y, x] = col


def _tag(buf, t, t0, t1, text, ax, ay, lx, ly):
    el = _since(t, t0)
    left = (t1 - t0) - el
    if left < 0.15 and int(left / 0.05) % 2 == 0:            # blink out
        return
    if not (-20 < ax < W + 20 and -20 < ay < H + 20):
        return
    w, h = pixfont.text_size(text)
    lx = int(min(max(lx, 3), W - 3 - w))
    ly = int(min(max(ly, TOP), H - 3 - h))
    # leader from the anchor to the nearest edge of the label, growing in
    tx = min(max(ax, lx), lx + w)
    ty = ly + h + 1 if ay > ly + h else ly - 2
    g = min(1.0, el / 0.15)
    _line(buf, ax, ay, ax + (tx - ax) * g, ay + (ty - ay) * g, P.SUB)
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        xx, yy = int(ax) + dx - 1, int(ay) + dy - 1
        if 0 <= xx < W and 0 <= yy < H:
            buf[yy, xx] = P.INK
    if g < 1.0:
        return
    n = int((el - 0.15) * TAG_CPS) + 1
    _rich(buf, [(c, P.INK) for c in text[:n]], lx, ly)
    if n >= len(text):
        for xx in range(lx, lx + w):
            if 0 <= ly + h + 1 < H:
                buf[ly + h + 1, xx] = P.CY[6]


def tags(buf, t, lang):
    for t0, t1, key, anchor, (dx, dy) in TAGS:
        if not _active(t, t0, t1):
            continue
        p = anchor(t)
        if p is None:
            continue
        ax, ay = p
        _tag(buf, t, t0, t1, TEXT[lang][key], ax, ay, ax + dx, ay + dy)
    # reference vs measured under the two bars of the comparison (before it squashes into the data packet)
    if 28.95 <= t < 29.6:
        v = View(*optics.VIEW)
        for x, key in ((-9.0, 'ref'), (9.0, 'meas')):
            text = TEXT[lang][key]
            u, vv = v.px(x, -26.0 + 1.3)
            w = pixfont.text_size(text)[0]
            n = int((t - 28.95) * TAG_CPS) + 1
            _rich(buf, [(c, P.INK) for c in text[:n]], int(round(u - w / 2)), int(round(vv)))


# ------------------------------------------------------------------ HUD
SCALES = [(200.0, '20 cm'), (100.0, '10 cm'), (50.0, '5 cm'), (20.0, '2 cm'), (10.0, '1 cm'), (5.0, '5 mm'),
          (2.0, '2 mm'), (1.0, '1 mm'), (0.5, '0.5 mm'), (0.2, '0.2 mm'), (0.1, '0.1 mm')]
WIDE_Z = 0.37                                      # the zoom of the wide shot of the whole analyzer (x1)


def _fmt(v, sep):
    return f'{int(round(v)):,}'.replace(',', sep)


def _sig2(v):
    if v < 10:
        return round(v, 1)
    p = 10 ** (int(math.floor(math.log10(v))) - 1)
    return round(v / p) * p


def _panel(buf, x0, y0, x1, y1):
    """Small translucent HUD plate with a thin frame."""
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if x1 <= x0 or y1 <= y0:
        return
    sub = buf[y0:y1, x0:x1].astype(np.float32)
    col = np.asarray(P.NV[1], np.float32)
    buf[y0:y1, x0:x1] = (sub + (col - sub) * 0.72).astype(np.uint8)
    buf[y0, x0 + 1:x1 - 1] = P.NV[6]
    buf[y1 - 1, x0 + 1:x1 - 1] = P.NV[6]
    buf[y0 + 1:y1 - 1, x0] = P.NV[6]
    buf[y0 + 1:y1 - 1, x1 - 1] = P.NV[6]


def _plate(buf, text, col):
    """A one-word HUD plate at the top right (TIME-LAPSE, SCHEMATIC, NOT TO SCALE)."""
    right, y = W - 7, TOP + 4
    w = pixfont.text_size(text)[0]
    _panel(buf, right - w - 5, y - 4, right + 4, y + 11)
    _rich(buf, [(c, col) for c in text], right - w, y)


def _zoom_view(t):
    """The camera whose zoom and scale the HUD reports, or None where a scale bar would not mean anything."""
    from . import cutaway
    tt = t % T.TOTAL
    if tt < 0.95 or 2.22 <= tt < 6.55 or 7.45 <= tt < 10.8 or 11.6 <= tt < 14.0 or 23.0 <= tt < 24.3 \
            or 30.0 <= tt:
        return _v2(tt)
    if 6.55 <= tt < 7.45 or 10.8 <= tt < 11.6:
        a, b = (6.55, 7.45) if tt < 9.0 else (10.8, 11.6)
        return View(0.0, 2.0, 9.5 + T.clamp01((tt - a) / (b - a)))
    if 14.0 <= tt < 16.25:
        z = 13.0 if tt <= 15.85 else 13.0 * math.exp(3.4 * T.smoother((tt - 15.85) / 0.6))
        return View(0.0, 0.0, z)
    if 22.5 <= tt < 23.0:
        z = 13.0 if tt >= 22.55 else 13.0 * math.exp(3.4 * T.smoother((22.55 - tt) / 0.55))
        return View(0.0, 0.0, z)
    if 0.95 <= tt < 2.10:
        z = 13.0 if tt <= 1.95 else 13.0 * (1 - 0.55 * T.smoother((tt - 1.95) / 0.27))
        return View(0.0, 0.0, z)
    return None


def hud(buf, t, lang):
    L = TEXT[lang]
    tt = t % T.TOTAL
    if 1.05 <= tt < 1.95:
        _plate(buf, L['timelapse'], P.AM[7])
        return
    if 16.45 <= tt < 22.0:
        _plate(buf, L['not_scale'], P.SUB)
        return
    if 24.55 <= tt < 28.8:
        _plate(buf, L['schematic'], P.SUB)
        return
    view = _zoom_view(tt)
    if view is None:
        return
    ratio = view.z / WIDE_Z
    if ratio < 1.8:
        return
    sep = L['sep']
    right = W - 7
    y = TOP + 4
    v = _sig2(ratio)
    num = (f'{v:.1f}'.replace('.', ',' if sep == '.' else '.') if v < 10 else _fmt(v, sep))
    s1 = [(c, P.SUB) for c in L['zoom'] + ' '] + [(c, P.INK) for c in '×' + num]
    w1 = pixfont.text_size(''.join(c for c, _ in s1))[0]
    px, label = 0.0, SCALES[-1][1]
    for length, label in SCALES:
        px = length * view.z
        if px <= 46:
            break
    if lang == 'id':
        label = label.replace('.', ',')
    wl = pixfont.text_size(label)[0]
    wmax = max(w1, wl + int(px) + 5)
    _panel(buf, right - wmax - 5, y - 4, right + 4, y + 19)
    _rich(buf, s1, right - w1, y)
    _rich(buf, [(c, P.INK) for c in label], right - wl, y + 10)
    bx1 = right - wl - 4
    bx0 = int(round(bx1 - px))
    yb = y + 13
    for xx in range(bx0, bx1 + 1):
        if 0 <= xx < W:
            buf[yb, xx] = P.INK
            buf[yb + 1, xx] = P.NV[0]
    for xx in (bx0, bx1):
        if 0 <= xx < W:
            buf[yb - 2:yb + 2, xx] = P.INK


def draw(buf, t, lang='en'):
    t = t % T.TOTAL
    tags(buf, t, lang)
    hud(buf, t, lang)
    caption(buf, t, lang)


def typing_events(lang='en'):
    """(time, kind) for the soundtrack: one soft blip every other typed character, a chime when a box opens,
    a tick when a tag pops in."""
    ev = []
    for t0, t1, key in CAPTIONS:
        n = sum(len(_parse(l)) for l in TEXT[lang][key])
        for i in range(0, n, 2):
            ev.append(((t0 + 0.1 + i / CPS) % T.TOTAL, 'type'))
        ev.append((t0 % T.TOTAL, 'open'))
    for t0, t1, key, _, _ in TAGS:
        ev.append(((t0 + 0.15) % T.TOTAL, 'tag'))
    return sorted(ev)
