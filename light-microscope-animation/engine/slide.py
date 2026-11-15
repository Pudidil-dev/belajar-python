"""The macro view: a glass slide on the navy bench, a drop of blood, and a second slide used as a spreader.

Slide space is in millimetres: x across the slide (-12.5..12.5), y along it (the drop at 0, the far end at +53, the
frosted label end at the bottom). The canvas shows it top-down at 8 px/mm with the camera sliding along y.

The spreader's edge comes back onto the drop, the blood runs sideways along that edge, and one smooth push draws it into
a film that thins toward a feathered far end (the wedge smear). The prepared slide is the same film after drying and
staining: matte magenta-pink, darker where the film was thick.
"""
import math
import numpy as np
from . import gfx
from . import timeline as T
from .palette import BG, BL, SM, GL, CY, WH, OUTLINE, WHITE

K = 9.0                                  # px per mm
X_HALF = 12.5                            # the slide is 25 mm wide ...
Y_BOT, Y_TOP = -30.0, 45.0               # ... and 75 mm long
FROST = (-30.0, -19.0)                   # the frosted label end
DROP_R = T.DROP_R / K                    # the drop: 2.3 mm
SPREAD_HALF = 10.6                       # the spreader slide is a touch narrower than the slide
BEAD_HALF = 9.6                          # how far the blood runs along its edge
Y_CONTACT = 1.0                          # the edge sits here when it touches the drop
Y_START = -1.6                           # where the film begins
Y_END = 34.0                             # where the film's feathered tip ends (at its middle)

_rng = np.random.default_rng(2112)
_FEATHER = _rng.uniform(-1, 1, 64)       # the ragged feathered edge
_STREAK = _rng.uniform(0, 1, 40)


# ---------------------------------------------------------------- motion
def edge_y(t):
    """Where the spreader's edge is (mm)."""
    if t < T.TOUCH:
        return T.lerp(Y_CONTACT + 4.2, Y_CONTACT, T.ease_out(T.u_of(t, T.APPROACH), 2.0))
    if t < T.SWIPE[0]:
        return Y_CONTACT
    return T.lerp(Y_CONTACT, Y_END + 0.6, T.ease_in_out(T.u_of(t, T.SWIPE), 2.2))


def wick(t):
    """0..1: how far the blood has run along the edge."""
    return T.ease_out(T.u_of(t, T.WICK), 2.2)


def lift(t):
    """0..1: the spreader rising away after the swipe."""
    return T.ease_in(T.u_of(t, T.LIFT), 2.0)


def camera(t):
    """(slide y at the canvas anchor, zoom): the camera rides up the slide with the edge, then eases onto the thin end."""
    if t < 3.0:
        y = T.lerp(0.0, Y_MID, T.smooth(T.u_of(t, (0.5, 1.85))))
        y = T.lerp(y, Y_THIN, T.ease_in(T.u_of(t, (1.8, 2.0)), 2.0))
        z = T.lerp(1.0, 1.35, T.ease_in(T.u_of(t, (1.8, 2.0)), 2.0))
        return y, z
    return Y_MID, 1.0


Y_MID = 15.0                             # the camera's resting place: the whole film in view
Y_THIN = 27.0                            # the thin end, where the cells lie in one layer


def film_reach(t):
    """How far up the slide the film has been laid (mm)."""
    if t < T.SWIPE[0]:
        return Y_START
    return max(Y_START, min(edge_y(t) - 0.4, Y_END))


# ---------------------------------------------------------------- drawing
def _grid():
    Y, X = np.mgrid[0:gfx.H, 0:gfx.W]
    return X + 0.5, Y + 0.5


_XC, _YC = _grid()
_TH = gfx.BAYER[:gfx.H, :gfx.W]


def bench(buf, cam_y):
    """The navy bench: a faint dot grid that scrolls with the camera."""
    buf[:] = BG[3]
    oy = -cam_y * K * 0.6
    gx = np.floor(_XC) % 24
    gy = np.floor(_YC + oy) % 24
    buf[(gx == 0) & (gy == 0)] = BG[5]
    big = ((np.floor(_XC / 24) + np.floor((_YC + oy) / 24)) % 3) == 0
    buf[big & (((gx == 0) & (np.abs(gy) <= 1)) | ((gy == 0) & ((gx <= 1) | (gx >= 23))))] = BG[6]


def film_thickness(x, y, reach):
    """Film thickness (0..1) at slide points (mm) for a film laid up to `reach`."""
    ax = np.abs(x)
    f = np.clip((y - Y_START) / (Y_END - Y_START), 0, 1)
    thick = 1.0 - 0.86 * f ** 0.75
    k = np.clip(np.floor((x + BEAD_HALF) / (2 * BEAD_HALF) * 63), 0, 63).astype(int)
    rag = 0.7 * _FEATHER[k]
    tip = Y_END - 4.6 * (ax / BEAD_HALF) ** 2 + rag
    feather = np.clip((tip - y) / 3.6, 0, 1)
    side = np.clip((BEAD_HALF - ax) / 0.7, 0, 1) * (1 + 0.12 * np.clip(1 - (BEAD_HALF - ax) / 2.0, 0, 1))
    start = np.clip((y - Y_START) / 0.7, 0, 1)
    laid = np.clip((reach - y) / 0.4, 0, 1)
    return thick * feather ** 0.9 * side * start * laid


def slide_mask(dx=0.0, cam_y=0.0, scale=1.0):
    x_mm = (_XC - gfx.W / 2) / (K * scale) - dx
    y_mm = cam_y + (T.DROP_XY[1] - _YC) / (K * scale)
    return x_mm, y_mm


def draw(buf, t, stained=False, slide_dx=0.0, glint=0.0):
    """The macro slide at time t (stained=True: the prepared slide). slide_dx slides it sideways (mm); glint (0..1)
    moves the light's reflection across the glass."""
    cam_y, _ = camera(t)
    bench(buf, cam_y)
    x_mm, y_mm = slide_mask(slide_dx, cam_y)
    on = (np.abs(x_mm) <= X_HALF) & (y_mm >= Y_BOT) & (y_mm <= Y_TOP)
    # the slide's shadow on the bench
    shadow = (np.abs(x_mm - 0.55) <= X_HALF) & (y_mm + 0.7 >= Y_BOT) & (y_mm + 0.7 <= Y_TOP) & ~on
    buf[shadow] = BG[1]
    # the glass: the bench seen through it, a touch lighter and cooler
    g = on & (_TH < 0.5)
    buf[on] = BG[4]
    buf[g] = BG[5]
    # frosted label end: blank, matte
    fr = on & (y_mm >= FROST[0]) & (y_mm <= FROST[1])
    buf[fr] = WH[2]
    buf[fr & (_TH < 0.45)] = WH[3]
    # the film: translucent (dithered over the glass), thick and dark near the drop, thin and pale at the far end
    reach = Y_END if stained else film_reach(t)
    tk = film_thickness(x_mm, y_mm, reach) * on
    a = np.clip(tk * 1.15 + 0.1, 0, 1) * (tk > 0.015)
    show = a > _TH
    if stained:
        v = np.clip(tk, 0, 1)
        speck = 0.35 * np.sin(x_mm * 11.0) * np.sin(y_mm * 9.7)
        idx = np.clip(np.floor(7.2 - v * 6.0 - _TH * 1.2 + speck), 1, 7).astype(int)
        col = np.asarray(SM, np.uint8)[idx]
    else:
        v = np.clip(tk, 0, 1)
        idx = np.clip(np.floor(8.0 - v * 4.6 - _TH * 1.2), 3, 8).astype(int)
        col = np.asarray(BL, np.uint8)[idx]
    buf[show] = col[show]
    # the slide's edges: light along the top and left, the glass thickness along the right and bottom
    _edges(buf, x_mm, y_mm)
    # one soft reflection band of the room light (it travels when time passes)
    gx = T.lerp(-9.0, 9.0, glint)
    band = on & (np.abs((x_mm - gx) - 0.55 * (y_mm - cam_y)) < 1.1) & (_TH < 0.5)
    buf[band] = np.clip(buf[band].astype(int) + 26, 0, 255).astype(np.uint8)
    band2 = on & (np.abs((x_mm - gx - 2.4) - 0.55 * (y_mm - cam_y)) < 0.35)
    buf[band2] = np.clip(buf[band2].astype(int) + 34, 0, 255).astype(np.uint8)
    if not stained:
        _drop_and_spreader(buf, t, x_mm, y_mm)
    return buf


def _edges(buf, x_mm, y_mm):
    px = 1.0 / K
    inside = (np.abs(x_mm) <= X_HALF) & (y_mm >= Y_BOT) & (y_mm <= Y_TOP)
    left = inside & (x_mm < -X_HALF + px)
    top = inside & (y_mm > Y_TOP - px)
    right = inside & (x_mm > X_HALF - 2 * px)
    bot = inside & (y_mm < Y_BOT + 2 * px)
    out = ~inside & (np.abs(x_mm) <= X_HALF + px) & (y_mm >= Y_BOT - px) & (y_mm <= Y_TOP + px)
    buf[out] = OUTLINE
    buf[right | bot] = GL[2]
    buf[(right & (x_mm > X_HALF - px)) | (bot & (y_mm < Y_BOT + px))] = GL[1]
    buf[left] = CY[2]
    buf[top] = CY[4]


def _drop_and_spreader(buf, t, x_mm, y_mm):
    ye = edge_y(t)
    w = wick(t)
    up = lift(t)
    # ---- the blood: the dome, then the bead running along the edge
    m_drop = np.zeros(buf.shape[:2], bool)
    if t < T.SWIPE[0] + 0.15:
        r = DROP_R * (1 - 0.45 * w - 0.4 * T.u_of(t, (T.SWIPE[0], T.SWIPE[0] + 0.15)))
        d = np.hypot(x_mm, (y_mm - 0.35 * w) * (1 + 0.25 * w))
        m_drop = d < r
    m_bead = np.zeros_like(m_drop)
    if t >= T.TOUCH and up < 1:
        bead_l = DROP_R * 0.6 + (BEAD_HALF - DROP_R * 0.6) * w
        rem = 1 - 0.6 * T.u_of(t, T.SWIPE)
        bt = (0.45 + 0.55 * w) * rem
        ax = np.clip(np.abs(x_mm) - bead_l, 0, None)
        m_bead = (np.hypot(ax, (y_mm - (ye - bt)) / 1.0) < bt) & (y_mm <= ye)
    m = m_drop | m_bead
    if m.any():
        buf[m] = BL[5]
        # dark rim
        rim = m & ~_erode(m)
        buf[rim] = BL[2]
        # the dome: a caustic low right, a glossy highlight up left
        if m_drop.any():
            r = DROP_R * (1 - 0.45 * w)
            caus = m_drop & (((x_mm - 0.35 * r) ** 2 + (y_mm + 0.35 * r) ** 2) < (0.45 * r) ** 2) & ~rim
            buf[caus] = BL[6]
            hl = m_drop & ((((x_mm + 0.38 * r) / 1.25) ** 2 + (y_mm - 0.42 * r) ** 2) < (0.26 * r) ** 2)
            buf[hl] = WHITE
            hl2 = m_drop & (np.hypot(x_mm - 0.5 * r, y_mm + 0.5 * r) < 0.12 * r)
            buf[hl2] = BL[8]
        if m_bead.any():
            buf[m_bead & (np.abs(y_mm - (ye - 0.12)) < 0.12)] = BL[7]
    # ---- the spreader slide, held at an angle above the edge: tinted glass fading as it rises toward us
    if up >= 1:
        return
    yy = ye + 9.0 * up
    rise = np.clip((yy - y_mm) / 15.0, 0, 1)
    under = (np.abs(x_mm) <= SPREAD_HALF) & (y_mm <= yy)
    tint = under & (_TH < 0.42 * (1 - rise) * (1 - up))
    f = buf[tint].astype(np.float32)
    buf[tint] = (f * 0.7 + np.asarray(GL[5], np.float32) * 0.3).astype(np.uint8)
    px = 1.0 / K
    edge = (np.abs(x_mm) <= SPREAD_HALF) & (np.abs(y_mm - yy) < 0.5 * px)
    buf[edge] = WHITE
    shade = (np.abs(x_mm) <= SPREAD_HALF) & (y_mm > yy) & (y_mm < yy + 1.2 * px)
    buf[shade] = OUTLINE
    sides = under & (np.abs(np.abs(x_mm) - SPREAD_HALF) < 0.5 * px) & (_TH < 1 - rise)
    buf[sides] = CY[3]
    # its shadow on the slide, offset to the right: it is held up above the glass
    shadow = (x_mm > SPREAD_HALF) & (x_mm < SPREAD_HALF + 0.35 + 1.4 * rise) & (y_mm <= yy) & (rise < 0.95) \
        & (np.abs(x_mm) <= X_HALF) & (_TH < 0.6)
    buf[shadow] = (buf[shadow].astype(np.float32) * 0.55).astype(np.uint8)


def _erode(m):
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return e
