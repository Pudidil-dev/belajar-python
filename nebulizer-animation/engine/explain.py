"""The explanation layer: tells the viewer what they are looking at, in the film's own 16-bit game style.

  * Caption box: an RPG-style dialog box at the top that types one short line at each step
    (what a nebulizer does, the droplet, the mesh, the piezo ring, slow motion, the pinch-off, the mist, the lungs).
  * Part tags: small labels with leader lines that pin names on the parts while each shot holds
    (nebulizer, mask, medicine, piezo ring, vibrating mesh, mist, driver chip, battery, liquid, mesh hole, droplet).
  * HUD: zoom factor, a scale bar (1 cm ... 5 um) and the slow-motion factor (up to 195,000x), so the viewer always
    knows how small and how slowed-down the picture is.

English by default, Indonesian with lang='id'. Everything is laid out in screen pixels from world anchors, and the
first caption and the two hook tags wrap across the loop point, so frame 0 still equals the last frame.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import pixfont, micro
from . import device as D

W, H = gfx.W, gfx.H
CPS = 45.0                      # caption typing speed (characters per second)
TAG_CPS = 55.0

# [word] = cyan accent, {word} = amber accent (the markers are not drawn)
TEXT = {
    'en': {
        'intro': ['[LIQUID MEDICINE] → [BREATHABLE MIST]'],
        'dive': ['ZOOMING INTO THE MIST...'],
        'pop': ['POP! ONE [DROPLET], ≈5 µm', 'LIQUID, NOT STEAM'],
        'mesh': ['A METAL [MESH] WITH ~1000 HOLES'],
        'piezo': ['{PIEZO RING} SHAKES IT', '{130,000×} A SECOND'],
        'slow': ['SLOW MOTION: {195,000×} SLOWER'],
        'squeeze': ['EACH SHAKE PUSHES [LIQUID] OUT'],
        'pinch': ['TIP → NECK → PINCH → [DROPLET]'],
        'mist': ['~100 MILLION [DROPS] EVERY SECOND'],
        'lungs': ['SMALL ENOUGH TO REACH THE [LUNGS]'],
        'nebulizer': 'NEBULIZER', 'mask': 'MASK', 'medicine': 'MEDICINE', 'piezo_t': 'PIEZO RING',
        'mesh_t': 'VIBRATING MESH', 'mist_t': 'MIST', 'driver': 'DRIVER CHIP', 'battery': 'BATTERY',
        'liquid': 'LIQUID', 'hole': 'MESH HOLE', 'droplet': 'DROPLET ≈5 µm',
        'zoom': 'ZOOM', 'slowmo': 'SLOW-MO', 'sep': ',',
    },
    'id': {
        'intro': ['[OBAT CAIR] → [KABUT UNTUK DIHIRUP]'],
        'dive': ['MASUK KE DALAM KABUT...'],
        'pop': ['POP! SATU [TETES], ≈5 µm', 'CAIRAN, BUKAN UAP'],
        'mesh': ['[JARING LOGAM] DENGAN ~1000 LUBANG'],
        'piezo': ['{CINCIN PIEZO} MENGGETARKANNYA', '{130.000×} PER DETIK'],
        'slow': ['GERAK LAMBAT: {195.000×} LEBIH PELAN'],
        'squeeze': ['TIAP GETARAN MENDORONG [CAIRAN]'],
        'pinch': ['UJUNG → LEHER → PUTUS → [TETES]'],
        'mist': ['~100 JUTA [TETES] SETIAP DETIK'],
        'lungs': ['CUKUP KECIL SAMPAI KE [PARU-PARU]'],
        'nebulizer': 'NEBULIZER', 'mask': 'MASKER', 'medicine': 'OBAT CAIR', 'piezo_t': 'CINCIN PIEZO',
        'mesh_t': 'MESH BERGETAR', 'mist_t': 'KABUT', 'driver': 'CHIP PENGGERAK', 'battery': 'BATERAI',
        'liquid': 'CAIRAN', 'hole': 'LUBANG MESH', 'droplet': 'TETESAN ≈5 µm',
        'zoom': 'ZOOM', 'slowmo': 'LAMBAT', 'sep': '.',
    },
}

# (start, end, key). End past 20 s wraps: the intro is on screen from 18.9 s through the loop point to 1.2 s.
CAPTIONS = [
    (18.90, 21.20, 'intro'),
    (1.30, 2.75, 'dive'),
    (3.02, 4.70, 'pop'),
    (4.80, 6.55, 'mesh'),
    (6.65, 8.45, 'piezo'),
    (8.60, 10.25, 'slow'),
    (10.40, 12.55, 'squeeze'),
    (12.65, 14.90, 'pinch'),
    (15.20, 16.95, 'mist'),
    (17.05, 18.75, 'lungs'),
]

# (start, end, key, world anchor (mm), label offset from the anchor in canvas px)
TAGS = [
    (19.15, 20.95, 'nebulizer', (-17.0, -20.5), (-20, -26)),
    (19.25, 20.95, 'mask', (46.0, -38.5), (-14, -30)),
    (5.05, 8.45, 'medicine', (-17.0, -4.6), (-38, -52)),
    (5.30, 8.45, 'piezo_t', (-1.0, 7.2), (22, 48)),
    (5.55, 8.45, 'mesh_t', (0.12, -3.6), (12, -78)),
    (5.80, 8.45, 'mist_t', (11.0, 3.0), (-14, 48)),
    (6.05, 8.45, 'driver', (-7.5, 21.0), (78, 4)),
    (6.30, 8.45, 'battery', (-8.5, 39.0), (76, -6)),
    (10.05, 12.45, 'liquid', (-0.036, -0.03), (-16, -52)),
    (10.30, 12.45, 'hole', (-0.006, 0.0), (-26, 56)),
]
DROPLET_TAG = (13.56, 14.86, 13.5)      # bracket on the droplet that pinches off the middle hole at 13.5 s

BOX_X0, BOX_X1, BOX_Y0 = 8, 262, 22
_DROP_ICON = ['...#...', '...#...', '..###..', '..###..', '.#####.', '.#####.', '.#####.', '..###..']


def _since(t, t0):
    return (t - t0) % T.TOTAL


def _active(t, t0, t1):
    return _since(t, t0) < (t1 - t0)


def _parse(line):
    """'[A] b {C}' -> [(char, colour), ...] without the markers."""
    out, col = [], P.INK
    for ch in line:
        if ch == '[':
            col = P.CY[7]
        elif ch == '{':
            col = P.AM[7]
        elif ch in ']}':
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
        # the narrator icon: a little droplet
        iy = BOX_Y0 + (h - 8) // 2
        for r, row in enumerate(_DROP_ICON):
            for c, ch in enumerate(row):
                if ch == '#':
                    col = P.CY[6] if (c > 3 or r < 4) else P.CY[5]
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
    w, h = pixfont.text_size(text)
    lx = int(min(max(lx, 3), W - 3 - w))
    ly = int(min(max(ly, 3), H - 3 - h))
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


def tags(buf, view, t, lang):
    for t0, t1, key, (wx, wy), (dx, dy) in TAGS:
        if not _active(t, t0, t1):
            continue
        ax, ay = view.px(wx, wy)
        _tag(buf, t, t0, t1, TEXT[lang][key], ax, ay, ax + dx, ay + dy)
    a, b, born = DROPLET_TAG
    if a <= t < b:
        age = T.mu(t) - T.mu(born)
        x = float(D.dome_x(0.0)) + micro.HT + micro.HEAD_AT_PINCH + float(micro.xdrift(age))
        px, py = view.px(x, 0.0)
        r = micro.R_DROP * view.z + 4
        k = 4
        for sx in (-1, 1):
            for sy in (-1, 1):
                cx, cy = px + sx * r, py + sy * r
                _line(buf, cx, cy, cx - sx * k, cy, P.CY[7])
                _line(buf, cx, cy, cx, cy - sy * k, P.CY[7])
        _tag(buf, t, a, b, TEXT[lang]['droplet'], px + r * 0.7, py - r * 0.7, px + 6, py - r - 22)


def _fmt(v, sep):
    s = f'{int(round(v)):,}'
    return s.replace(',', sep)


def _sig2(v):
    if v < 10:
        return round(v, 1)
    if v >= 192000:                       # land exactly on the caption's number
        return 195000
    p = 10 ** (int(math.floor(math.log10(v))) - 1)
    return round(v / p) * p


SCALES = [(10.0, '1 cm'), (5.0, '5 mm'), (2.0, '2 mm'), (1.0, '1 mm'), (0.5, '500 µm'), (0.2, '200 µm'),
          (0.1, '100 µm'), (0.05, '50 µm'), (0.02, '20 µm'), (0.01, '10 µm'), (0.005, '5 µm')]
_MU_FACE = None


def slowmo(t):
    """Displayed slow-motion factor: 1x at the patient, 195,000x on the mesh holes (a real cycle is ~7.7 us)."""
    global _MU_FACE
    if _MU_FACE is None:
        _MU_FACE = T.mu_rate(0.0)
    m = max(T.mu_rate(t), 1.0)
    u = (math.log(_MU_FACE) - math.log(m)) / math.log(_MU_FACE)
    return 195000.0 ** max(0.0, min(1.0, u))


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


def hud(buf, view, t, lang):
    ratio = view.z / T.Z0
    if ratio < 1.12:
        return
    L = TEXT[lang]
    sep = L['sep']
    right = W - 7
    y = 58 if not any(_active(t, a, b) and len(TEXT[lang][k]) > 1 for a, b, k in CAPTIONS) else 62
    v = _sig2(ratio)
    num = (f'{v:.1f}'.replace('.', ',' if sep == '.' else '.') if v < 10 else _fmt(v, sep))
    s1 = [(c, P.SUB) for c in L['zoom'] + ' '] + [(c, P.INK) for c in '×' + num]
    w1 = pixfont.text_size(''.join(c for c, _ in s1))[0]
    for length, label in SCALES:
        px = length * view.z
        if px <= 46:
            break
    if lang == 'id':
        label = label.replace('.', ',')
    wl = pixfont.text_size(label)[0]
    f = slowmo(t)
    s3 = None
    if f >= 8:
        s3 = [(c, P.SUB) for c in L['slowmo'] + ' '] + [(c, P.AM[7]) for c in '×' + _fmt(_sig2(f), sep)]
    w3 = pixfont.text_size(''.join(c for c, _ in s3))[0] if s3 else 0
    wmax = max(w1, wl + int(px) + 5, w3)
    _panel(buf, right - wmax - 5, y - 4, right + 4, y + (29 if s3 else 19))
    _rich(buf, s1, right - w1, y)
    # scale bar
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
    if s3:
        _rich(buf, s3, right - w3, y + 20)


def draw(buf, view, t, lang='en'):
    t = t % T.TOTAL
    tags(buf, view, t, lang)
    hud(buf, view, t, lang)
    caption(buf, t, lang)


def typing_events(lang='en'):
    """(time, kind) for the soundtrack: one soft blip every other typed character, a tick when a tag pops in."""
    ev = []
    for t0, t1, key in CAPTIONS:
        n = sum(len(_parse(l)) for l in TEXT[lang][key])
        for i in range(0, n, 2):
            ev.append(((t0 + 0.1 + i / CPS) % T.TOTAL, 'type'))
        ev.append((t0 % T.TOTAL, 'open'))
    for t0, t1, key, _, _ in TAGS:
        ev.append(((t0 + 0.15) % T.TOTAL, 'tag'))
    ev.append((DROPLET_TAG[0] + 0.15, 'tag'))
    return sorted(ev)
