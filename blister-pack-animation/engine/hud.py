"""The game layer: an RPG text box for the hook, a big title card per stage, the player tag over the hero capsule,
pop-up words, and the scanner's ticks and crosses.

Text is the 5x7 pixel font, scaled 2x to 4x, with a 1-px dark outline and a drop shadow. Everything important stays
in the middle band of the frame (a phone app covers the top and bottom edges).
"""
import math
import numpy as np
from . import gfx, pixfont, pix
from . import world as Wd
from . import timeline as T
from . import view as Vw
from .palette import OUTLINE, WHITE, YELLOW, REJ, PASS, HUD

W, H = gfx.W, gfx.H


def _txt(buf, s, x, y, col, scale=2, anchor='mm', shadow=HUD[0]):
    pixfont.draw_text(buf, s, x, y, col, anchor=anchor, scale=scale, shadow=shadow)


def _box(buf, x0, y0, x1, y1, col):
    x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))
    x0, x1 = max(x0, 0), min(x1, W)
    y0, y1 = max(y0, 0), min(y1, H)
    if x1 > x0 and y1 > y0:
        buf[y0:y1, x0:x1] = col


# ---------------------------------------------------------------- the RPG text box (the hook)
BOX = (10, 302, 260, 384)
LINES1 = ('HOW DID I', 'GET HERE?')
LINES2 = ('...REWIND!',)
CPS = 30.0                                           # letters typed per second


def dialogue(buf, S):
    a, b = T.DIALOG
    if not (a <= S < b):
        return
    k = T.back_out(T.u_of(S, (a, a + 0.12)), 1.4)
    x0, y0, x1, y1 = BOX
    yo = int(round((1 - k) * 100))
    y0, y1 = y0 + yo, y1 + yo
    _box(buf, x0 - 2, y0 - 2, x1 + 2, y1 + 2, OUTLINE)
    _box(buf, x0, y0, x1, y1, WHITE)
    _box(buf, x0 + 3, y0 + 3, x1 - 3, y1 - 3, HUD[1])
    _box(buf, x0 + 4, y0 + 4, x1 - 4, y0 + 6, HUD[3])
    # the speaker's name tab: who is talking is the capsule itself (a little icon of it, no name)
    _box(buf, x0 + 8, y0 - 22, x0 + 62, y0 + 1, OUTLINE)
    _box(buf, x0 + 10, y0 - 20, x0 + 60, y0 + 1, WHITE)
    _box(buf, x0 + 12, y0 - 18, x0 + 58, y0 + 1, HUD[1])
    s_ = 1.8
    ix, iy = x0 + 35, y0 - 9
    pix.capsule(buf, Wd.Cam(-(ix - W / 2) / s_, (iy - H / 2) / s_, s_), 0.0, 0.0, -14.0)
    if S < T.LINE2:
        lines, t0 = LINES1, T.LINE1
    else:
        lines, t0 = LINES2, T.LINE2
    n = int((S - t0) * CPS) + 1 if S >= t0 else 0
    shown = []
    for ln in lines:
        shown.append(ln[:max(0, n)])
        n -= len(ln)
    for i, s_ in enumerate(shown):
        if s_:
            pixfont.draw_text(buf, s_, x0 + 14, y0 + 14 + 30 * i, WHITE, scale=3, outline=None, shadow=HUD[0])
    done = n > 0
    if done and int(S * 4) % 2 == 0:                     # the blinking "more" arrow
        _txt(buf, '~', x1 - 18, y1 - 14, YELLOW[2], scale=2, shadow=None)


def typed_chars(S):
    """How many characters of the text box have been typed by story time S (for the typing blips)."""
    if S < T.LINE1:
        return 0
    if S < T.LINE2:
        return min(int((S - T.LINE1) * CPS) + 1, len(''.join(LINES1)))
    return 100 + min(int((S - T.LINE2) * CPS) + 1, len(''.join(LINES2)))


def title_up(S):
    """Is a stage title on screen (the player tag keeps out of its way)?"""
    return any(t0 + 0.04 <= S < t0 + 0.95 for _l, _n, t0 in T.STAGES)


# ---------------------------------------------------------------- stage titles
def stage_title(buf, S):
    for i, (lab, name, t0) in enumerate(T.STAGES):
        a, b = t0 + 0.04, t0 + 0.95                       # gone before the stage's big moment
        if not (a <= S < b):
            continue
        u = S - a
        k = T.back_out(T.u_of(S, (a, a + 0.2)), 2.2)
        out = T.ease_in(T.u_of(S, (b - 0.18, b)), 2.0)
        dy = int(round((1 - k) * -60 - out * 90))
        sc = 5 if u < 0.06 else 4
        _txt(buf, lab, W // 2, 52 + dy, YELLOW[2], scale=2)
        _txt(buf, name, W // 2, 84 + dy, WHITE, scale=sc)
    a, b = T.FINAL + 0.02, T.FINAL + 1.5
    if a <= S < b:
        u = S - a
        jx = int(round(3 * math.sin(u * 70))) if u < 0.5 else 0
        out = T.ease_in(T.u_of(S, (b - 0.2, b)), 2.0)
        if not (b - S < 0.22 and int(S * 20) % 2):
            _txt(buf, 'FINAL', W // 2 + jx, 52 - int(out * 90), REJ[2], scale=2)
            _txt(buf, 'BOSS', W // 2 + jx, 84 - int(out * 90), REJ[1], scale=5 if u < 0.07 else 4)


# ---------------------------------------------------------------- the player tag, pop-ups
def tag(buf, sx, sy, text, S, col=YELLOW[2], scale=2):
    bob = 1 if int(T.env_time(S) * 4) % 2 else 0
    sy = sy - 4 - bob
    if not (-30 < sx < W + 30 and -30 < sy < H + 30):
        return
    tw = pixfont.text_size(text, scale=scale)[0]
    sx = min(max(sx, tw / 2 + 4), W - tw / 2 - 4)
    _txt(buf, '~', sx, sy, col, scale=scale, anchor='mb')
    _txt(buf, text, sx, sy - 8 * scale, col, scale=scale, anchor='mb')


def pop(buf, text, sx, sy, S, t0, t1, col, scale=3, rise=10):
    if not (t0 <= S < t1):
        return
    sy = sy - int(rise * T.ease_out(T.u_of(S, (t0, t0 + 0.25)), 2.0))
    if t1 - S < 0.12 and int(S * 20) % 2:
        return
    sc = scale + 1 if S - t0 < 0.06 else scale
    tw = pixfont.text_size(text, scale=sc)[0]
    sx = min(max(sx, tw / 2 + 4), W - tw / 2 - 4)
    _txt(buf, text, sx, sy, col, scale=sc)


# ---------------------------------------------------------------- the scanner's marks
_TICK = ['.........', '........#', '.......##', '#.....##.', '##...##..', '.##.##...', '..###....', '...#.....']
_CROSS = ['#.....#', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '#.....#']


def _mark(buf, sx, sy, shape, col, scale):
    m = np.array([[ch == '#' for ch in r] for r in shape], bool)
    m = np.kron(m, np.ones((scale, scale), bool)).astype(bool)
    h, w = m.shape
    x0, y0 = int(round(sx - w / 2)), int(round(sy - h / 2))
    big = np.zeros((h + 2, w + 2), bool)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            big[dy:dy + h, dx:dx + w] |= m
    for mm, cc, off in ((big, OUTLINE, -1), (m, col, 0)):
        hh, ww = mm.shape
        ys, xs = y0 + off, x0 + off
        a0, b0 = max(ys, 0), max(xs, 0)
        a1, b1 = min(ys + hh, H), min(xs + ww, W)
        if a1 > a0 and b1 > b0:
            sub = buf[a0:a1, b0:b1]
            sub[mm[a0 - ys:a1 - ys, b0 - xs:b1 - xs]] = cc


def scan_marks(buf, c, S):
    """A tick (or a cross, for the empty pocket) pops up over each pocket as it crosses the laser, and fades."""
    for card in range(-3, 6):
        for row in range(T.ROWS):
            t = T.scan_time(card, row)
            if not (t <= S < t + 0.55):
                continue
            u = (S - t) / 0.55
            for col in range(2):
                bad = (card, row, col) == T.MISS
                x = T.COLS[col]
                y = T.y_of(T.pocket_v(card, row), S)
                sx, sy = Vw.to(c, x, y, 8.0 + 10.0 * u)
                if u > 0.8 and int(S * 30) % 2:
                    continue
                sc = 3 if u < 0.1 else 2
                if bad:
                    _mark(buf, sx, sy, _CROSS, REJ[1], sc + 1)
                else:
                    _mark(buf, sx, sy, _TICK, PASS[1], sc)


# ---------------------------------------------------------------- the boss warning, the foil bar
def warning(buf, S):
    """An arcade boss warning: the screen pulses red on each beat and a hazard band with WARNING blinks across it."""
    a, b = T.WARN
    if not (a <= S < b):
        return buf
    u = S - a
    k = 0.28 * T.pulse(S, a, 0.3) + 0.28 * T.pulse(S, a + 0.5, 0.3) + 0.08
    f = buf.astype(np.float32)
    buf = (f + (np.asarray(REJ[0], np.float32) - f) * k).astype(np.uint8)
    grow = T.back_out(T.u_of(S, (a, a + 0.15)), 1.6)
    half = int(round(26 * grow))
    if T.u_of(S, (b - 0.12, b)) > 0:
        half = int(round(26 * (1 - T.u_of(S, (b - 0.12, b)))))
    if half <= 0:
        return buf
    y0, y1 = 228 - half, 228 + half
    _box(buf, 0, y0 - 2, W, y1 + 2, OUTLINE)
    _box(buf, 0, y0, W, y1, REJ[0])
    xs = np.arange(W)
    off = int(u * 60)
    for yy, d in ((y0 + 2, 1), (y1 - 6, -1)):            # chevrons scrolling in opposite directions
        for r in range(4):
            row = buf[yy + r] if 0 <= yy + r < H else None
            if row is None:
                continue
            m = ((xs + d * off + (r if d > 0 else 3 - r)) % 12) < 4
            row[m] = YELLOW[2]
    if int(u * 8) % 4 != 3 and half > 14:
        _txt(buf, 'WARNING', W // 2, 228, WHITE, scale=4, shadow=OUTLINE)
    return buf


def foil_bar(buf, S, press):
    """The pill's last shield: the foil, draining as the thumb pushes (an RPG health bar)."""
    if not (T.PRESS[0] - 0.1 <= S < T.TOTAL):
        return
    a = T.back_out(T.u_of(S, (T.PRESS[0] - 0.1, T.PRESS[0] + 0.1)), 1.8) if S >= 2.0 else 1.0
    hp = 1.0 - press if S >= 2.0 else 0.0
    x0, y0 = 70, 44 - int(round((1 - a) * 40))
    nseg, sw = 10, 14
    _txt(buf, 'FOIL', x0 - 6, y0 + 6, WHITE, scale=2, anchor='rm')
    _box(buf, x0 - 2, y0 - 2, x0 + nseg * sw + 2, y0 + 14, OUTLINE)
    _box(buf, x0 - 1, y0 - 1, x0 + nseg * sw + 1, y0 + 13, WHITE)
    _box(buf, x0, y0, x0 + nseg * sw, y0 + 12, HUD[0])
    full = hp * nseg
    low = hp < 0.3
    blink = low and int(S * 10) % 2 == 0
    for i in range(nseg):
        f = T.clamp01(full - i)
        if f <= 0:
            continue
        col = REJ[1] if low else (PASS[1] if hp > 0.6 else YELLOW[2])
        if blink:
            col = WHITE
        w_ = int(round((sw - 2) * f))
        _box(buf, x0 + i * sw + 1, y0 + 1, x0 + i * sw + 1 + w_, y0 + 11, col)
        _box(buf, x0 + i * sw + 1, y0 + 1, x0 + i * sw + 1 + w_, y0 + 3, WHITE if not blink else col)
