"""Tiny context labels that sit next to the thing they name and move with it (no subtitles, no narration).

5x7 pixel font at 1x, white with a 1-px dark outline; a thin leader line where the text has to sit a little away from
its object. A label types itself in quickly and disappears when its moment is over. A small fast-forward mark sits in
the top-right corner during the time-lapse.
"""
import math
from . import gfx, pixfont
from . import view as V
from . import state as S
from . import timeline as T
from .tools import lancet_state, pump_offset
from .palette import WHITE, OUTLINE, GLASS

CPS = 45.0
MARGIN = 4
LINE_H = 9
X0, Y0 = S.SPOTS[S.MAIN]


def _lancet(t):
    st = lancet_state(t, S.SPOTS)
    if st is None:
        return X0, Y0, 0.0
    (x, y), _ = st
    return x + 14.0, y - 4.0, 0.0


def _pump(t):
    from .tools import PUMP_AT
    off = pump_offset(t) or 0.0
    return X0 + PUMP_AT[0] + 23.0, Y0 + PUMP_AT[1] + off - 9.0, 12.0


def _fix(x, y, z):
    return lambda t: (x, y, z)


def _skin_at(dx):
    def f(t):
        import numpy as np
        return X0 + dx, Y0, float(S.dome_at(t, np.array(X0 + dx), Y0))
    return f


def _vessel(t):
    """The top of the capillary loop nearest 3 mm right of the main spot (the loops sit every PAP mm from x = 0.6)."""
    import numpy as np
    from .tissue import papilla, suction_at, PAP, CAP_W
    xc = 0.6 + PAP * round((X0 + 3.0 - 0.6) / PAP)
    dil = 1.0 + 0.5 * float(suction_at(t, np.array(xc), Y0))
    z0 = float(papilla(np.array(xc))) - 0.3 + CAP_W * dil
    h = float(S.dome_at(t, np.array(xc), Y0))
    return xc, Y0, z0 + h * math.exp(min(z0, 0.0) / S.LAMBDA)


def _plexus(t):
    import numpy as np
    x = X0 + 2.0
    z0 = -4.2
    h = float(S.dome_at(t, np.array(x), Y0))
    return x, Y0, z0 + h * math.exp(z0 / S.LAMBDA)


# (start, end, text, anchor(t) -> world (x, y, z), offset (dx, dy) canvas px, placement, leader)
LABELS = [
    (0.3, 1.7, 'LANCET', _lancet, (6, -6), 'l', False),
    (3.15, 4.6, 'VACUUM PUMP', _pump, (0, 4), 'm', False),
    (7.25, 9.2, 'LOW PRESSURE', _fix(X0, Y0, 28.0), (0, 0), 'm', False),
    (7.5, 9.0, 'EPIDERMIS', _fix(X0 - 25.0, Y0, -0.4), (8, -12), 'l', True),
    (7.7, 9.0, 'DERMIS', _fix(X0 - 25.0, Y0, -4.5), (8, 0), 'l', False),
    (10.0, 11.6, 'CAPILLARY', _vessel, (26, -30), 'l', True),
    (10.3, 11.6, 'RED BLOOD CELLS', _plexus, (0, 40), 'm', True),
    (11.8, 13.0, 'SKIN OPENING', _skin_at(5.0), (24, -34), 'l', True),
    (15.9, 17.2, 'RED BLOOD CELLS', _fix(X0 + 16.0, Y0, 3.5), (0, -60), 'm', False),
    (18.62, 19.5, 'AIR IN', _fix(X0, Y0, S.VCAP_Z1 + 2.0), (-14, -10), 'r', True),
    (21.9, 24.0, 'CUPPING MARK', _fix(X0 + S.R_OUT, Y0 - 6.0, 0.0), (8, 10), 'l', True),
]


def _size(text):
    lines = text.split('\n')
    return max(pixfont.text_size(l)[0] for l in lines), LINE_H * len(lines) - 2


def _line(buf, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(n + 1):
        x = int(round(x0 + (x1 - x0) * i / max(n, 1)))
        y = int(round(y0 + (y1 - y0) * i / max(n, 1)))
        if 0 <= x < gfx.W and 0 <= y < gfx.H:
            buf[y, x] = col


def draw(buf, v, t):
    for t0, t1, text, anchor, (dx, dy), side, lead in LABELS:
        if not (t0 <= t < t1):
            continue
        ax, ay = v.to(*anchor(t))
        w, h = _size(text)
        if side == 'l':
            x, y = ax + dx, ay + dy - h / 2
        elif side == 'r':
            x, y = ax + dx - w, ay + dy - h / 2
        else:
            x, y = ax + dx - w / 2, ay + dy
        x = int(round(min(max(x, MARGIN), gfx.W - MARGIN - w)))
        y = int(round(min(max(y, MARGIN), gfx.H - MARGIN - h)))
        if lead and 0 <= ax < gfx.W and 0 <= ay < gfx.H:
            cx = min(max(ax, x - 2), x + w + 1)
            cy = min(max(ay, y - 2), y + h + 1)
            if math.hypot(cx - ax, cy - ay) > 5:
                _line(buf, ax, ay, cx, cy, GLASS[2])
                buf[int(ay), int(ax)] = WHITE
        n = int((t - t0) * CPS) + 1
        for i, line in enumerate(text.split('\n')):
            shown = line[:max(0, n)]
            n -= len(line)
            if shown.strip():
                pixfont.draw_text(buf, shown, x, y + i * LINE_H, WHITE, outline=OUTLINE)


def fast_forward(buf, t):
    for span in T.FAST_FORWARD:
        if span[0] <= t < span[1] and (t * 4.0) % 1.0 < 0.75:
            for k in range(2):
                ax = gfx.W - 26 + k * 9
                for j in range(9):
                    wdt = 5 - abs(j - 4)
                    buf[12 + j, ax - 1:ax + wdt + 1] = OUTLINE
                for j in range(9):
                    wdt = 5 - abs(j - 4)
                    buf[12 + j, ax:ax + wdt] = WHITE
            return
