"""The clear film web and the blister cards made from it, seen from above (3/4 view).

The web is a strip of clear film running down the screen. Its pockets are blown down into it (so from above we look
into them: a dark floor, a lit far wall, a white rim), the capsules lie in them, and after the sealing roller the whole
strip is covered by silver foil with a diamond emboss, smooth over each pocket. After the punch a card is a separate,
foil-side-up object that can hop, spin, stack, or be held right up to the camera, where the hero's pocket bulges under
the foil and finally bursts.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import view as Vw
from .palette import OUTLINE, WHITE, GLASS, FOIL, BED, HEAT, REJ, YELLOW, STEEL

PH, PV = T.POCKET
R = T.CAP_R
FILM = Vw.mix(BED[1], GLASS[2], 0.34)
FILM_HI = Vw.mix(BED[1], GLASS[2], 0.62)
CARD_HW = T.CARD_W / 2
CARD_HL = T.CARD_L / 2


def stadium(X, Y, xc, yc, hx, hy):
    """A capsule-shaped region (half-length hx across, half-height hy)."""
    sx = np.clip(X - xc, -(hx - hy), hx - hy)
    return (X - xc - sx) ** 2 + (Y - yc) ** 2 <= hy * hy


def pocket_xy(card, row, col, S):
    return T.COLS[col], T.y_of(T.pocket_v(card, row), S)


# ---------------------------------------------------------------- the film and its pockets
def film(buf, c, S, y_lo, y_hi, heat=None):
    """The clear film between y_lo and y_hi (world), with moving glints; heat = (y0, y1) tints it orange."""
    w = pix.win(c, -T.WEB_HALF, T.WEB_HALF, y_lo, y_hi)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (np.abs(X) <= T.WEB_HALF) & (Y >= y_lo) & (Y <= y_hi)
    v[m] = FILM
    yw = Y + T.web(S)                              # web-attached coordinate
    glint = m & ((((-yw) * 1.0 + X * 0.7) % 64.0) < 2.4)
    v[glint] = FILM_HI
    px = 1.0 / c.s
    v[m & (np.abs(X) > T.WEB_HALF - 1.1 * px)] = GLASS[3]
    v[m & (np.abs(X) > T.WEB_HALF - 2.1 * px) & (np.abs(X) <= T.WEB_HALF - 1.1 * px)] = GLASS[1]
    if heat is not None:
        hz = m & (Y > heat[0]) & (Y < heat[1])
        v[hz & pix.checker(w)] = HEAT[1]
        v[hz & ~pix.checker(w) & (pix.bayer(w) < 0.35)] = HEAT[2]


def pocket(buf, c, xc, yc, d, pill=None, glow=False, ang=0.0, nudge=(0.0, 0.0)):
    """One pocket blown d mm deep into the film, and optionally a capsule lying in it."""
    if d < 0.3:
        return
    w = pix.win(c, xc - PH - 1, xc + PH + 1, yc - PV - Vw.OBL * d - 1, yc + PV + 1)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    rim = stadium(X, Y, xc, yc, PH, PV)
    flo = rim & stadium(X, Y, xc, yc - Vw.OBL * d, PH, PV)
    wall = rim & ~flo
    v[flo] = GLASS[0] if not glow else GLASS[3]
    v[flo & pix.checker(w) & (not glow)] = BED[1]
    v[wall] = GLASS[1] if not glow else WHITE
    v[wall & (Y > yc + PV * 0.35)] = GLASS[2]
    if glow:
        v[flo & pix.checker(w)] = WHITE
    if pill is not None:
        cz = Vw.zcam(c, -d + R)
        ext = T.CAP_L / 2 + 1.5
        wc = pix.win(cz, xc - ext, xc + ext, yc - ext, yc + ext)
        if wc is not None:
            saved = wc.view(buf).copy()
            pix.capsule(buf, cz, xc + nudge[0], yc + nudge[1], ang, L=T.CAP_L, r=R)
            Xg, Yg = np.broadcast_arrays(c.X[:, wc.sx] if c.X.shape[0] == 1 else c.X[wc.sy, wc.sx],
                                         c.Y[wc.sy, :] if c.Y.shape[1] == 1 else c.Y[wc.sy, wc.sx])
            keep = ~stadium(Xg, Yg, xc, yc, PH - 0.15, PV - 0.15)
            vv = wc.view(buf)
            vv[keep] = saved[keep]
            v = w.view(buf)
    ring = pix.edge(rim)
    v[ring & (Y > yc)] = WHITE
    v[ring & (Y <= yc)] = GLASS[2]


def foil_patch(v, w, X, Y, m, xc, yc, raised=True):
    """The foil over a pocket: smooth (the seal tool does not press there), a little raised."""
    p = m & stadium(X, Y, xc, yc, PH - 0.3, PV - 0.3)
    v[p] = FOIL[3]
    v[p & (Y > yc + PV * 0.25)] = FOIL[4]
    if raised:
        v[pix.edge(p) & (Y < yc)] = FOIL[1]
    return p


def emboss(v, w, X, Y, m, u, ww):
    """The seal's diamond knurl on the foil (u, ww: coordinates fixed to the foil)."""
    v[m] = FOIL[2]
    g = (((u + ww) % 3.4) < 0.55) | (((u - ww) % 3.4) < 0.55)
    v[m & g] = FOIL[1]
    v[m & (((u + ww) % 3.4) < 0.55) & (((u - ww) % 3.4) < 0.55)] = FOIL[3]


def foil_web(buf, c, S, y_lo, y_hi):
    """The sealed part of the web (below the roller): foil with the emboss, smooth over every pocket."""
    w = pix.win(c, -T.WEB_HALF, T.WEB_HALF, y_lo, y_hi)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    m = (np.abs(X) <= T.WEB_HALF) & (Y >= y_lo) & (Y <= y_hi)
    yw = -(Y + T.web(S))
    emboss(v, w, X, Y, m, X, yw)
    # shine: a soft diagonal band sweeping along
    te = T.env_time(S)
    band = m & (np.abs(((yw + X * 0.9 - te * 140.0) % 160.0) - 80.0) < 5.0)
    v[band & pix.checker(w)] = FOIL[4]
    c0 = int(math.floor((-y_hi - T.web(S)) / T.CARD_L)) - 1
    c1 = int(math.floor((-y_lo - T.web(S)) / T.CARD_L)) + 1
    for card in range(c0, c1 + 1):
        for row in range(T.ROWS):
            for col in range(2):
                xc, yc = pocket_xy(card, row, col, S)
                if y_lo - 6 < yc < y_hi + 6:
                    foil_patch(v, w, X, Y, m, xc, yc)
        # the cut lines between cards: a faint score line
        yb = T.y_of(T.CARD_L * card, S)
        v[m & (np.abs(Y - yb) < 0.35 + 0.5 / c.s)] = FOIL[1]
    v[m & (np.abs(X) > T.WEB_HALF - 1.1 / c.s)] = FOIL[1]


# ---------------------------------------------------------------- a cut card (foil side up)
def card(buf, c, xc, yc, z, ang=0.0, reject=False, hero_tag=False, bump=0.0, torn=0.0, hero_id=0, shadow=True,
         clip_y=None):
    """A blister card, foil up, centred at (xc, yc) at height z, turned ang degrees. bump: the hero's pocket pushed
    up under the foil (0..1); torn: the foil burst open there (0..1, the flaps opening)."""
    cz = Vw.zcam(c, z)
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    ext = math.hypot(CARD_HW, CARD_HL) + 2
    if shadow and z > 0.5:
        sx, sy = xc + Vw.SHADOW[0] * z, yc + Vw.SHADOW[1] * z
        ws = pix.win(c, sx - ext, sx + ext, sy - ext, sy + ext)
        if ws is not None:
            Xs, Ys = np.broadcast_arrays(ws.X, ws.Y)
            lu = (Xs - sx) * ca + (Ys - sy) * sa
            lw = -(Xs - sx) * sa + (Ys - sy) * ca
            sm = pix.rrect(lu, lw, -CARD_HW, CARD_HW, -CARD_HL, CARD_HL, 3.0)
            Vw.darken(buf, ws, sm, 0.55)
    w = pix.win(cz, xc - ext, xc + ext, yc - ext, yc + ext)
    if w is None:
        return None
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    lu = (X - xc) * ca + (Y - yc) * sa                 # across the card
    lw = -(X - xc) * sa + (Y - yc) * ca                # along it (up the screen = upstream)
    m = pix.rrect(lu, lw, -CARD_HW, CARD_HW, -CARD_HL, CARD_HL, 3.0)
    if clip_y is not None:
        m &= Y > clip_y
    if not m.any():
        return None
    emboss(v, w, X, Y, m, lu, lw)
    hx, hy = T.COLS[T.HERO[2]], T.CARD_L / 2 - T.ROW * (T.HERO[1] + 0.5)
    for row in range(T.ROWS):
        for col in range(2):
            px_, py_ = T.COLS[col], T.CARD_L / 2 - T.ROW * (row + 0.5)
            p = foil_patch(v, w, lu, lw, m, px_, py_)
            if hero_tag and (row, col) == T.HERO[1:] and (bump > 0 or torn > 0):
                _bump(v, w, lu, lw, m, px_, py_, bump, torn)
    v[pix.edge(m)] = OUTLINE
    if reject:                                         # the red REJECT sticker in the corner
        st = m & pix.rrect(lu, lw, -CARD_HW + 3, -CARD_HW + 15, CARD_HL - 15, CARD_HL - 3, 2.0)
        v[st] = REJ[1]
        xm = st & (np.abs(np.abs(lu - (-CARD_HW + 9)) - np.abs(lw - (CARD_HL - 9))) < 0.9) & \
            (np.abs(lu - (-CARD_HW + 9)) < 4.2)
        v[xm] = WHITE
        v[pix.edge(st)] = REJ[0]
    return w


def _bump(v, w, lu, lw, m, px_, py_, bump, torn):
    d2 = ((lu - px_) / PH) ** 2 + ((lw - py_) / (PV + 0.6)) ** 2
    if torn <= 0:
        dome = m & (d2 <= 1.0 + 0.6 * bump)
        k = np.sqrt(np.clip(d2, 0, None))
        v[dome] = FOIL[3]
        v[dome & (k < 0.65 + 0.2 * bump) & (lw > py_ - 0.6)] = FOIL[4]
        v[dome & (k < 0.35 + 0.15 * bump) & (lw > py_)] = WHITE
        v[dome & (k > 0.82) & (lw < py_)] = FOIL[1]
        v[pix.edge(dome) & (lw < py_)] = FOIL[0]
        if bump > 0.45:                                # the foil starts to split: cracks run out from the top
            ang = np.arctan2(lw - py_, (lu - px_) * PV / PH)
            reach = 0.25 + 1.1 * (bump - 0.45) / 0.55
            for i, a0 in enumerate((0.5, 1.4, 2.3, 3.4, 4.6, 5.6)):
                da = np.angle(np.exp(1j * (ang - a0 - 0.25 * np.sin(k * 9.0 + i))))
                cr = dome & (np.abs(da) * np.maximum(k, 0.05) < 0.05) & (k > 0.18) & (k < 0.18 + reach * (0.7 + 0.3 * (i % 2)))
                v[cr] = FOIL[0]
        return
    # burst: a dark hole with silver flaps curling back
    hole = m & (d2 <= 0.75)
    v[hole] = GLASS[0]
    v[hole & (lw > py_ + PV * 0.2)] = BED[0]
    ang = np.arctan2(lw - py_, (lu - px_) * PV / PH)
    rr = np.sqrt(np.clip(d2, 0, None))
    for i in range(6):
        a0 = i * math.pi / 3 + 0.3
        da = np.angle(np.exp(1j * (ang - a0)))
        flap = m & (np.abs(da) < 0.42 * (1.2 - rr * 0.6)) & (rr > 0.55) & (rr < 0.95 + 0.55 * torn)
        v[flap] = FOIL[3] if i % 2 else FOIL[4]
        v[pix.edge(flap)] = FOIL[1]
    v[pix.edge(hole)] = FOIL[0]


def stack(buf, c, xc, yc, n, top_tag=False, top_id=None, reject_ids=()):
    """A stack of n cards, foil up, its front edge showing the layers."""
    if n <= 0:
        return
    for i in range(n):
        z = 2.4 * i
        cz = Vw.zcam(c, z)
        w = pix.win(cz, xc - CARD_HW - 1, xc + CARD_HW + 1, yc - CARD_HL - 4, yc + CARD_HL + 1)
        if w is not None:
            X, Y = np.broadcast_arrays(w.X, w.Y)
            front = (np.abs(X - xc) <= CARD_HW - 0.5) & (Y < yc - CARD_HL + 0.5) & (Y > yc - CARD_HL - 2.4 / Vw.OBL)
            v = w.view(buf)
            v[front] = GLASS[1] if i % 2 else GLASS[2]
            v[front & (Y < yc - CARD_HL - 2.4 / Vw.OBL + 0.9)] = OUTLINE
        if i < n - 1:
            card(buf, c, xc, yc, z, shadow=False)
        else:
            card(buf, c, xc, yc, z, shadow=False, hero_tag=top_tag)


# ---------------------------------------------------------------- the gripper chain, a card's edge
CLIP_Z = 2.0


def clips(buf, c, S, y_lo, y_hi):
    """The gripper chain: a steel clip on each edge of the web every row, carried along with it."""
    cz = Vw.zcam(c, CLIP_Z)
    k0 = int(math.floor((-y_hi - T.web(S)) / T.ROW)) - 1
    k1 = int(math.floor((-y_lo - T.web(S)) / T.ROW)) + 1
    w = pix.win(cz, -T.WEB_HALF - 4, T.WEB_HALF + 4, y_lo, y_hi)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    ax = np.abs(X)
    side = (ax > T.WEB_HALF - 2.6) & (ax < T.WEB_HALF + 3.4)
    if not side.any():
        return
    yw = -(Y + T.web(S))                               # web coordinate
    ph = yw % T.ROW
    m = side & (ph < 5.0) & (Y >= y_lo) & (Y <= y_hi)
    v[m] = STEEL[2]
    v[m & (ph > 3.6)] = STEEL[4]
    v[m & (ph < 1.1)] = STEEL[1]
    v[m & (np.abs(ax - (T.WEB_HALF + 1.6)) < 0.55) & (ph > 1.6) & (ph < 3.2)] = OUTLINE
    v[pix.edge(m)] = OUTLINE


def card_edge(buf, c, xc, yc, z, th=3.0):
    """The front edge of a card lifted off the stack: foil on top, the clear film under it."""
    cz = Vw.zcam(c, z)
    w = pix.win(cz, xc - CARD_HW, xc + CARD_HW, yc - CARD_HL - Vw.OBL * th - 1, yc - CARD_HL + 1)
    if w is None:
        return
    v = w.view(buf)
    X, Y = np.broadcast_arrays(w.X, w.Y)
    yf = yc - CARD_HL
    m = (np.abs(X - xc) <= CARD_HW - 2.0) & (Y < yf + 0.5) & (Y > yf - Vw.OBL * th)
    v[m] = GLASS[2]
    v[m & (Y > yf - Vw.OBL * th * 0.35)] = FOIL[1]
    v[m & (Y < yf - Vw.OBL * th * 0.75)] = GLASS[1]
    v[pix.edge(m)] = OUTLINE
