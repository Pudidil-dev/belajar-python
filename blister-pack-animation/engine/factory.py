"""The pharma factory behind the blister machine, in parallax layers, and the floor it stands on.

Far: a green panelled wall with lit cleanroom windows, two pipes with flow arrows, gauges, a clock and ceiling lights.
Middle: steel racks of carton boxes and a duct with a turning fan. The far layers pan and zoom less than the machine, so
every camera move has depth, and something in them always moves (flow arrows, glints, gauges, the clock, the fan).
"""
import math
import numpy as np
from . import world as Wd
from . import timeline as T
from . import pixfont, pix
from .palette import OUTLINE, WHITE, WALL, FLOOR, STEEL, GLASS, YELLOW, CARTON, LAMP, BODY

HOME = (110.0, 150.0, 2.4)          # the framing the layers are laid out for


def layer(cam, p):
    """The camera for a layer at depth p (1 = the machine's plane; smaller = farther: it pans and zooms less)."""
    cx0, cy0, s0 = HOME
    return Wd.Cam(cx0 + (cam.cx - cx0) * p, cy0 + (cam.cy - cy0) * p, s0 * (cam.s / s0) ** p)


def _hash(a, b):
    return ((np.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1.0 + 1.0) % 1.0


def wall(buf, cam, te):
    """The far wall. Most of it varies only along x or only along y, so it is painted with 1-D masks (fast)."""
    c = layer(cam, 0.32)
    xs, ys = c.X[0], c.Y[:, 0]
    px = 1.0 / c.s
    ck = Wd.CHECK
    buf[:] = WALL[2]
    panel = 70.0
    gx = np.floor(xs / panel)
    buf[:, _hash(gx, 3.0) < 0.35] = WALL[1]
    buf[:, np.abs(xs - gx * panel) < 0.6 * px] = WALL[0]
    buf[:, np.abs(xs - gx * panel - 1.2 * px) < 0.6 * px] = WALL[3]
    # the low wainscot and its trim
    low = ys < 34.0
    if low.any():
        sub = buf[low]
        sub[:] = WALL[1]
        tile = ((np.floor(ys[low] / 16.0)[:, None] + np.floor(xs / 16.0)[None, :]) % 2) == 0
        sub[tile] = WALL[0]
        buf[low] = sub
    buf[(ys >= 34.0) & (ys < 34.0 + 1.5 * px)] = WALL[3]
    # cleanroom windows: dark glass, a lit band, a mullion, and slow glints sliding across
    gap, win_w = 150.0, 96.0
    wx = xs - np.floor(xs / gap) * gap
    cin = (wx > 20) & (wx < 20 + win_w)
    cfr = (wx > 18) & (wx < 22 + win_w)
    rin = (ys > 112) & (ys < 172)
    rfr = (ys > 110) & (ys < 174)
    if cfr.any() and rfr.any():
        frame = rfr[:, None] & cfr[None, :]
        inwin = rin[:, None] & cin[None, :]
        buf[frame & ~inwin] = STEEL[2]
        buf[inwin] = GLASS[0]
        buf[inwin & (ys > 150)[:, None]] = WALL[4]
        glint = ((xs[None, :] + ys[:, None] * 0.8 - te * 14.0) % 64.0) < 3.0
        buf[inwin & glint & ck] = GLASS[1]
        buf[inwin & (np.abs(wx - 20 - win_w / 2) < 0.8)[None, :]] = STEEL[2]
        buf[inwin & (np.abs(ys - 142) < 0.6)[:, None]] = STEEL[2]
    # ceiling lights and their pools of light
    lx = xs - np.floor(xs / 120.0) * 120.0
    rl = (ys > 252) & (ys < 257)
    buf[rl[:, None] & (np.abs(lx - 60) < 22)[None, :]] = WHITE
    buf[((ys >= 257) & (ys < 260))[:, None] & (np.abs(lx - 60) < 24)[None, :]] = STEEL[1]
    rc = (ys > 200) & (ys < 252)
    if rc.any():
        cone = np.abs(lx - 60)[None, :] < 22 + (252 - ys[rc])[:, None] * 0.35
        stripe = (np.floor(ys[rc] * c.s) % 3 == 0)[:, None]
        sub = buf[rc]
        sub[cone & stripe & ck[rc]] = WALL[3]
        buf[rc] = sub
    # two pipes with flow arrows
    for py, d, sp in ((214.0, 1, 18.0), (224.0, -1, 14.0)):
        rp = np.abs(ys - py) <= 3.0
        if not rp.any():
            continue
        sub = buf[rp]
        yy = ys[rp][:, None]
        sub[:] = STEEL[2]
        sub[np.broadcast_to(yy > py + 1.4, sub.shape[:2])] = STEEL[3]
        sub[np.broadcast_to(yy < py - 1.6, sub.shape[:2])] = STEEL[1]
        ph = (xs - d * te * sp) % 48.0
        ph = ph if d > 0 else 48.0 - ph
        arrow = (ph[None, :] < 6.0) & (np.abs(yy - py) < 1.6 - np.abs(ph[None, :] - 3.0) * 0.45 + 1.4) & \
            (np.abs(yy - py) < 1.6)
        sub[arrow] = YELLOW[2]
        sub[:, (xs % 96.0) < 2.2] = STEEL[1]
        buf[rp] = sub
    # gauges on the pipes, a clock, a sign (each only inside its own box)
    for k in range(-6, 8):
        cx, cy = k * 220.0 + 70.0, 232.0
        w = pix.win(c, cx - 7, cx + 7, 216, cy + 7)
        if w is None:
            continue
        v = w.view(buf)
        Xw, Yw = np.broadcast_arrays(w.X, w.Y)
        r2 = (Xw - cx) ** 2 + (Yw - cy) ** 2
        m = r2 <= 36.0
        v[(np.abs(Xw - cx) < 0.8) & (Yw < cy - 5.5) & (Yw > 217)] = STEEL[2]
        v[m] = BODY[2]
        v[m & (r2 > 25.0)] = STEEL[1]
        a = math.radians(120 - 60 * (0.5 + 0.5 * math.sin(te * 2.3 + k)))
        v[(np.abs((Xw - cx) * math.sin(a) - (Yw - cy) * math.cos(a)) < 0.5) &
          (((Xw - cx) * math.cos(a) + (Yw - cy) * math.sin(a)) > -0.5) & m] = LAMP[2]
    cx, cy = 330.0, 190.0
    w = pix.win(c, cx - 12, cx + 12, cy - 12, cy + 12)
    if w is not None:
        v = w.view(buf)
        Xw, Yw = np.broadcast_arrays(w.X, w.Y)
        r2 = (Xw - cx) ** 2 + (Yw - cy) ** 2
        cm = r2 <= 121.0
        v[cm] = BODY[3]
        v[cm & (r2 > 9.6 ** 2)] = OUTLINE
        for hand, ln, wd in ((te / 60.0, 8.5, 0.5), (te / 720.0 + 0.3, 6.0, 0.8)):
            a = math.pi / 2 - 2 * math.pi * (math.floor(hand * 60) / 60.0 if ln > 7 else hand)
            al = (Xw - cx) * math.cos(a) + (Yw - cy) * math.sin(a)
            ac = -(Xw - cx) * math.sin(a) + (Yw - cy) * math.cos(a)
            v[cm & (al > -0.5) & (al < ln) & (np.abs(ac) < wd)] = OUTLINE
    sx0, sy0 = -60.0, 196.0
    w = pix.win(c, sx0, sx0 + 64, sy0, sy0 + 14)
    if w is not None:
        v = w.view(buf)
        sm = pix.full(w, pix.rrect(w.X, w.Y, sx0, sx0 + 64, sy0, sy0 + 14, 2.0))
        v[sm] = WALL[4]
        v[pix.edge(sm)] = OUTLINE
        tx, ty = c.to(sx0 + 32, sy0 + 7)
        pixfont.draw_text(buf, 'CLEAN ZONE', tx, ty, WHITE, anchor='mm', outline=None)


def _erode(m):
    e = m.copy()
    e[1:] &= m[:-1]
    e[:-1] &= m[1:]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    return e


class _FW:
    sy, sx = slice(0, Wd.H), slice(0, Wd.W)


def _full_win():
    return _FW


def racks(buf, cam, te):
    c = layer(cam, 0.62)
    X, Y = np.broadcast_arrays(c.X, c.Y)
    # a duct along the top with a turning fan every 300 mm
    duct = (Y > 262) & (Y < 276)
    buf[duct] = STEEL[1]
    buf[duct & (Y > 272)] = STEEL[2]
    buf[(Y > 261) & (Y < 262.2)] = OUTLINE
    for k in range(-5, 6):
        fx = k * 300.0 + 40.0
        w = pix.win(c, fx - 14, fx + 14, 238, 266)
        if w is None:
            continue
        v = w.view(buf)
        Xw, Yw = np.broadcast_arrays(w.X, w.Y)
        r2 = (Xw - fx) ** 2 + (Yw - 252.0) ** 2
        fm = r2 <= 169.0
        v[fm] = STEEL[0]
        v[fm & (r2 > 11.5 ** 2)] = STEEL[2]
        ang = np.arctan2(Yw - 252.0, Xw - fx) - te * 9.0
        v[fm & (np.mod(ang, 2 * math.pi / 3) < 0.7) & (r2 < 10.5 ** 2)] = STEEL[2]
        v[r2 <= 2.2 ** 2] = STEEL[3]
    # steel racks of cartons (each drawn only inside its own box)
    for k in range(-5, 6):
        x0 = k * 260.0 - 30.0
        w = pix.win(c, x0 - 3, x0 + 113, 0, 150)
        if w is None:
            continue
        v = w.view(buf)
        Xw, Yw = np.broadcast_arrays(w.X, w.Y)
        for sh in (8.0, 56.0, 104.0):
            v[(Xw > x0) & (Xw < x0 + 110) & (Yw > sh - 2.5) & (Yw < sh)] = STEEL[2]
            bx = x0 + 4
            i = 0
            while bx < x0 + 102:
                bw = 18 + 14 * float(_hash(k * 7.0 + i, sh))
                bh = 22 + 16 * float(_hash(k * 3.0 + i, sh + 1))
                if bx + bw > x0 + 106:
                    break
                m = (Xw > bx) & (Xw < bx + bw) & (Yw > sh) & (Yw < sh + bh)
                v[m] = CARTON[1]
                v[m & (Yw > sh + bh - 3)] = CARTON[2]
                v[m & (np.abs(Xw - bx - bw / 2) < 1.0)] = CARTON[3]
                v[m & (np.abs(Xw - bx - bw * 0.3) < 3.2) & (np.abs(Yw - sh - bh * 0.45) < 3.0)] = BODY[3]
                v[m & ~_erode(m)] = CARTON[0]
                bx += bw + 2.5
                i += 1
        v[((np.abs(Xw - x0) < 2.0) | (np.abs(Xw - x0 - 110) < 2.0)) & (Yw > 0) & (Yw < 150)] = STEEL[1]


def floor(buf, cam, te):
    xs, ys = cam.X[0], cam.Y[:, 0]
    rf = ys < 0.0
    if not rf.any():
        return
    sub = buf[rf]
    yy = ys[rf][:, None]
    shp = sub.shape[:2]
    sub[:] = FLOOR[2]
    sub[np.broadcast_to((yy > -6.0) | (yy < -14.0), shp)] = FLOOR[1]
    sub[(yy < -14.0) & ((xs % 140.0) < 0.8)[None, :]] = FLOOR[0]
    line = np.broadcast_to((yy < -8.0) & (yy > -12.0), shp)
    sub[line] = YELLOW[1]
    sub[line & (((xs + 4000) % 30.0) < 12.0)[None, :]] = OUTLINE
    sheen = (yy < -18) & (((xs - te * 6.0) % 90.0) < 2.0)[None, :] & Wd.CHECK[rf]
    sub[sheen] = FLOOR[3]
    buf[rf] = sub


def paint_back(buf, cam, S):
    te = T.env_time(S)
    wall(buf, cam, te)
    racks(buf, cam, te)
    floor(buf, cam, te)
