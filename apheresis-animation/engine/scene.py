"""What is on screen at time t. There are no cuts and no transitions: one camera travels through one world.

The close-up worlds are nested inside the clinic at the place where they really are, and drawn at the scale the
camera has reached:
- the stream of cells inside the tube (in the tube's lumen on the floor line, right after the anticoagulant joins);
- the citrate and calcium ions inside a small parcel of that plasma;
- the separation channel under the centrifuge lid.
As the camera closes in, the finer world resolves inside the coarser one through an ordered pixel dither tied to the
zoom, so the detail appears because the camera got closer, not because the picture changed.

The film ends on the result of the donation: the sealed platelet bag lifts off its hook and is shown like a rare item
in a game (light rays, sparkles, a glowing outline, a banner with stars, the item's name)."""
import math
import numpy as np
from . import gfx, palette as P, pixfont
from . import timeline as T
from . import world as WD
from . import micro as M
from . import labels as LB
from .pen import Pen
from .view import View, put

W, H = gfx.W, gfx.H
_JJ, _II = np.mgrid[0:H, 0:W]
_JJ, _II = _JJ + 0.5, _II + 0.5
_BAYER = gfx.BAYER[:H, :W]
R_Q = 9.0                          # radius of the plasma parcel that holds the molecules (stream units)


def _lod(z, z0, z1):
    """0..1 as the zoom goes from z0 to z1 (log scale): how much of the finer world shows."""
    u = (math.log(max(z, 1e-9)) - math.log(z0)) / (math.log(z1) - math.log(z0))
    return T.smooth(u)


def _stream_view(view):
    return View((view.cx - T.P_S[0]) / T.K_S, (view.cy - T.P_S[1]) / T.K_S, view.z * T.K_S)


def _molecule_view(sv, t):
    qx, qy = T.parcel(t)
    return View((sv.cx - qx) / T.K_M, (sv.cy - qy) / T.K_M, sv.z * T.K_M)


def _channel_view(view, t):
    k = T.lid_k(t)
    return View((view.cx - T.CENTRIFUGE[0]) / T.B_C, T.CH_RC[1] + (view.cy - T.CENTRIFUGE[1]) / (k * T.B_C),
                view.z * T.B_C, view.z * k * T.B_C)


def _paint(fn, t, view):
    buf = np.zeros((H, W, 3), np.uint8)
    fn(Pen(buf, view), t)
    return buf


def _merge(frame, inner, mask, alpha):
    sel = mask & (_BAYER < alpha) if alpha < 1.0 else mask
    frame[sel] = inner[sel]


def render_levels(t, view):
    """The frame and the view whose labels apply (kind, view)."""
    frame = _paint(WD.draw, t, view)
    kind, kview = 'world', view
    # ---- the stream inside the tube on the floor line
    a_s = _lod(view.z, 9.0, 20.0)
    if a_s > 0:
        U = (_II - view.ox) / view.z
        V = (_JJ - view.oy) / view.zy
        lumen = (np.abs(V - T.LINE_Y) < T.R_IN) & (U > 34.0) & (U < 80.0)
        if lumen.any():
            sv = _stream_view(view)
            inner = _paint(M.stream, t, sv)
            a_m = _lod(sv.z, 9.0, 22.0)                                  # ... and the molecules in its plasma
            if a_m > 0:
                mv = _molecule_view(sv, t)
                qx, qy = T.parcel(t)
                Us, Vs = (_II - sv.ox) / sv.z, (_JJ - sv.oy) / sv.zy
                parcel = (Us - qx) ** 2 + (Vs - qy) ** 2 < R_Q * R_Q
                if parcel.any():
                    _merge(inner, _paint(M.molecule, t, mv), parcel, a_m)
                    if a_m >= 1.0 and parcel.all():
                        kind, kview = 'molecule', mv
            _merge(frame, inner, lumen, a_s)
            if a_s >= 1.0 and lumen.mean() > 0.3 and kind == 'world':     # inside the tube (walls in view)
                kind, kview = 'stream', sv
    # ---- the separation channel under the centrifuge lid
    if T.DIVE_CH[0] <= t < T.OUT_CH[1]:
        a_c = _lod(view.z, 8.0, 14.0)
        if a_c > 0:
            k = T.lid_k(t)
            U = (_II - view.ox) / view.z
            V = (_JJ - view.oy) / view.zy
            window = ((U - T.CENTRIFUGE[0]) / T.BAY_R) ** 2 + ((V - T.CENTRIFUGE[1]) / (k * T.BAY_R)) ** 2 < 1.0
            if window.any():
                cv = _channel_view(view, t)
                _merge(frame, _paint(M.channel, t, cv), window, a_c)
                if a_c >= 1.0 and window.all():
                    kind, kview = 'channel', cv
    return frame, kind, kview


# ------------------------------------------------------------------ the finale: a rare item
KEY = np.array([255, 0, 255], np.uint8)
STAR = ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '##.....##']


def _ease_back(u):
    u = T.clamp01(u)
    c = 1.70158
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2


def _dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r and (dx or dy):
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _bag_sprite(t, bx, by, zb):
    """The floating bag (with its sealed stub) drawn at canvas (bx, by), zoom zb, on a key colour."""
    buf = np.empty((H, W, 3), np.uint8)
    buf[...] = KEY
    view = View(T.BAG[0] - (bx - W / 2) / zb, T.BAG[1] - (by - H / 2) / zb, zb)
    pen = Pen(buf, view)
    top = T.BAG[1] - T.BAG_H / 2
    px = T.BAG[0] - 4
    WD._rrect(pen, px - 1.5, top - 8, px + 1.5, top + 1, 0.6, P.TUBE[2], P.TUBE[1])
    WD._rrect(pen, px - 0.7, top - 6, px + 0.7, top + 1, 0.3, P.GOLD[2])
    WD._rrect(pen, px - 2.8, top - 8.6, px + 2.8, top - 5.6, 0.6, P.WHITE, P.MACH[2])
    WD.bag(pen, T.BAG, T.BAG_W, T.BAG_H, P.TUBE[3], P.PLASMA[3], T.bag_level(t), t,
           hook=(T.BAG[0], top - 4), gold=True)
    return buf, np.any(buf != KEY, axis=2)


def _text(frame, s, cx, y, col, scale=1, shadow=True):
    w, h = pixfont.text_size(s, scale=scale)
    x = int(round(cx - w / 2))
    if shadow:
        gfx.fill(frame, pixfont.text_mask(s, x + scale, int(y) + scale, scale=scale), P.NAVY[0])
    gfx.fill(frame, pixfont.text_mask(s, x, int(y), scale=scale), col)
    return w, h


def _plate(frame, x0, y0, x1, y1, border, inner=None):
    x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))
    a0, b0, a1, b1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if a1 <= a0 or b1 <= b0:
        return
    sub = frame[b0:b1, a0:a1].astype(np.float32)
    frame[b0:b1, a0:a1] = (sub + (np.asarray(P.NAVY[0], np.float32) - sub) * 0.88).astype(np.uint8)
    for k, col in enumerate((border, inner or border)):
        xa, ya, xb, yb = x0 + k * 2, y0 + k * 2, x1 - 1 - k * 2, y1 - 1 - k * 2
        if xb <= xa or yb <= ya:
            break
        for (p0, p1) in (((xa + 1, ya), (xb - 1, ya)), ((xa + 1, yb), (xb - 1, yb))):
            if 0 <= p0[1] < H:
                frame[p0[1], max(p0[0], 0):min(p1[0] + 1, W)] = col
        for xx in (xa, xb):
            if 0 <= xx < W:
                frame[max(ya + 1, 0):min(yb, H), xx] = col


def _star(frame, cx, cy, s, col, hi):
    for j, row in enumerate(STAR):
        for i, ch in enumerate(row):
            if ch != '#':
                continue
            for dy in range(s):
                for dx in range(s):
                    x, y = int(cx + (i - 4) * s + dx), int(cy + (j - 3) * s + dy)
                    if 0 <= x < W and 0 <= y < H:
                        frame[y, x] = hi if (j <= 2 and i in (3, 4)) else col


def finale(frame, t, view, lang='en'):
    """The donation's result as a rare item: the bag lifts, rays turn behind it, sparkles, a banner, the name."""
    if t < T.LIFT[0]:
        if T.SEAL <= t < T.SEAL + 0.12:                                # a little glint as the seal clicks shut
            x, y = view.px(*T.path_point('plt', 0.955))
            for dx, dy in ((0, 0), (2, 0), (-2, 0), (0, 2), (0, -2), (3, 0), (-3, 0), (0, 3), (0, -3)):
                xx, yy = int(x + dx), int(y + dy)
                if 0 <= xx < W and 0 <= yy < H:
                    frame[yy, xx] = P.WHITE
        return
    u = (t - T.LIFT[0]) / (T.LIFT[1] - T.LIFT[0])
    hx, hy = view.px(*T.BAG)
    tx, ty = W / 2, 236.0
    e = _ease_back(u)
    bx, by = hx + (tx - hx) * e, hy + (ty - hy) * e
    zb = view.z * (1 - 0.1 * T.smooth(u))
    if t >= T.LIFT[1]:
        by += 3.0 * math.sin(2 * math.pi * (t - T.LIFT[1]) / 1.6)
        zb *= 1 + 0.03 * max(0.0, math.cos(2 * math.pi * 2 * t)) ** 4
    dim = 0.74 * T.smooth((t - T.LIFT[0]) / 0.5)                        # the clinic dims behind the reward
    if dim > 0:
        f = frame.astype(np.float32)
        frame[...] = (f + (np.asarray(P.NAVY[0], np.float32) - f) * dim).astype(np.uint8)
    g = T.smooth((t - T.LIFT[0] - 0.25) / 0.5)                          # light rays turning behind the bag
    if g > 0:
        dx, dy = _II - bx, _JJ - by
        rr = np.hypot(dx, dy)
        ang = np.arctan2(dy, dx) + 0.35 * (t - T.LIFT[0])
        ray = ((ang * 14 / (2 * math.pi)) % 1.0) < 0.5
        reach = 300.0 * g
        fade = 1 - rr / max(reach, 1)
        frame[ray & (rr < reach) & (_BAYER < fade * 0.42)] = P.GOLD[1]
        frame[(rr < 46 * g) & (_BAYER < 0.5 * (1 - rr / (46 * g + 1e-6)))] = P.GOLD[2]
    rng = np.random.default_rng(3)                                      # twinkling sparkles
    for k in range(18):
        a = rng.uniform(0, 2 * math.pi)
        rad = rng.uniform(64, 128)
        per, ph = rng.uniform(0.5, 0.9), rng.uniform(0, 1)
        life = ((t - T.LIFT[0]) / per + ph) % 1.0
        if t - T.LIFT[0] < 0.3 or life > 0.6:
            continue
        sz = int(round(3 * math.sin(math.pi * life / 0.6)))
        sx, sy = int(bx + rad * math.cos(a)), int(by + rad * math.sin(a) * 1.1)
        for d in range(-sz, sz + 1):
            for xx, yy in ((sx + d, sy), (sx, sy + d)):
                if 0 <= xx < W and 0 <= yy < H:
                    frame[yy, xx] = P.WHITE if d == 0 else P.GOLD[3]
    spr, m = _bag_sprite(t, bx, by, zb)                                 # the bag, with a glowing outline
    halo = _dilate(m, 3) & ~_dilate(m, 1)
    frame[halo & (_BAYER < 0.5)] = P.GOLD[2]
    ring = _dilate(m, 1) & ~m
    frame[ring] = (P.WHITE, P.GOLD[3], P.GOLD[2])[int(t * 15) % 3]
    frame[m] = spr[m]
    ph = ((t - T.LIFT[0]) % 1.4) / 1.4                                  # a shine sweeping across it
    if ph < 0.4:
        jj, ii = np.nonzero(m)
        if len(ii):
            span = (ii.max() - ii.min()) + (jj.max() - jj.min())
            pos = ii.min() + jj.min() + span * ph / 0.4
            band = m & (np.abs((_II + _JJ) - pos) < 2.5)
            frame[band] = P.WHITE
    if t < T.BANNER:
        return
    v = (t - T.BANNER) / 0.45                                           # the banner drops in with a bounce
    y0 = -70 + (36 + 70) * _ease_back(v)
    _plate(frame, 22, y0, W - 22, y0 + 62, P.GOLD[2], P.GOLD[1])
    _text(frame, LB.TEXT[lang]['rare'], W / 2, y0 + 9, P.GOLD[3], scale=2)
    for k in range(5):                                                  # five stars pop in, one by one
        ts = T.BANNER + 0.35 + 0.14 * k
        if t >= ts:
            big = 2 if t < ts + 0.08 else 1
            _star(frame, W / 2 + (k - 2) * 22, y0 + 44, big, P.GOLD[3], P.WHITE)
    if t >= T.BANNER + 1.1:                                             # the item's name types in under the bag
        n = int((t - T.BANNER - 1.1) * 40) + 1
        name, sub = LB.TEXT[lang]['item'], LB.TEXT[lang]['item_sub']
        w = max(pixfont.text_size(name)[0], pixfont.text_size(sub)[0])
        y1 = 352
        _plate(frame, W / 2 - w / 2 - 9, y1, W / 2 + w / 2 + 9, y1 + 34, P.GOLD[2])
        _text(frame, name[:n], W / 2, y1 + 8, P.WHITE)
        if n > len(name):
            _text(frame, sub[:n - len(name)], W / 2, y1 + 19, P.GOLD[3])


# ------------------------------------------------------------------ the frame
def render_canvas(t, info=True, lang='en'):
    t = min(max(t, 0.0), T.TOTAL - 1e-6)
    view = View(*T.world_camera(t))
    frame, kind, kview = render_levels(t, view)
    if info:
        LB.draw(frame, kind, kview, t, lang)
    finale(frame, t, view, lang)
    return frame


def render(t, scale=gfx.SCALE, info=True, lang='en'):
    return gfx.upscale(render_canvas(t, info, lang), scale)
