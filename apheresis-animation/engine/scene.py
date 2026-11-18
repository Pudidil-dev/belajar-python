"""What is on screen at time t: the clinic (world), the stream inside the tube, the citrate close-up or the
separation channel, the round magnifier lens that opens into a close-up and closes back out of it, the two
"what comes out" bubbles (platelets in the bag, red cells and plasma going back), and the labels. The last frame
flows into the first."""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from . import world as WD
from . import micro as M
from . import labels as LB
from .pen import Pen
from .view import View, put

W, H = gfx.W, gfx.H
_CAMS = {'stream': M.stream_camera, 'molecule': M.molecule_camera, 'channel': M.channel_camera}
_JJ, _II = np.mgrid[0:H, 0:W]
_JJ, _II = _JJ + 0.5, _II + 0.5


def _view(kind, t, scale=1.0):
    if kind == 'world':
        return View(*T.world_camera(t))
    v = _CAMS[kind](t)
    return View(v.cx, v.cy, v.z * scale) if scale != 1.0 else v


def _render(kind, t, view):
    buf = np.zeros((H, W, 3), np.uint8)
    pen = Pen(buf, view)
    if kind == 'world':
        WD.draw(pen, t)
    else:
        getattr(M, kind)(pen, t)
    return buf


def _ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * u * (u * (6 * u - 15) + 10)


def lens_composite(outer, inner, cx, cy, r):
    """The close-up shows inside a round lens of radius r centred on (cx, cy), with a light rim and a dark edge."""
    d = np.hypot(_II - cx, _JJ - cy)
    out = outer.copy()
    m = d < r
    out[m] = inner[m]
    if r > 0.5:
        out[(d >= r) & (d < r + 2.0)] = P.MACH[5]
        out[(d >= r + 2.0) & (d < r + 3.0)] = P.NAVY[0]
    return out


# ------------------------------------------------------------------ "what comes out" bubbles
_CALLOUTS = {
    # name: (window, anchor in the world, bubble offset from the anchor in px, radius px)
    'bag': (T.BAG_CALLOUT, (T.BAG[0], T.BAG[1] + T.BAG_H * 0.28), (-96, 34), 44),
    'return': (T.RETURN_CALLOUT, (110.0, 112.6), (-62, 92), 40),
}


def callout_geometry(name, t, view):
    """(bubble centre x, y, radius, anchor x, y) on the canvas, or None when the bubble is not shown."""
    (t0, t1), anchor, (ox, oy), r = _CALLOUTS[name]
    t = t % T.TOTAL
    if not t0 <= t < t1:
        return None
    grow = _ease((t - t0) / 0.45) * (1 - _ease((t - (t1 - 0.3)) / 0.3))
    ax, ay = view.px(*anchor)
    cx = min(max(ax + ox, r + 6), W - r - 6)
    cy = min(max(ay + oy, r + 6), H - r - 6)
    return cx, cy, r * grow, ax, ay


def _bubble_content(name, t, cx, cy, r):
    buf = np.zeros((H, W, 3), np.uint8)
    z = 2.0
    view = View(-(cx - W / 2) / z, -(cy - H / 2) / z, z)              # world (0, 0) at the bubble centre
    pen = Pen(buf, view)
    buf[...] = P.PLASMA[3] if name == 'bag' else P.PLASMA[2]
    rw = r / z
    if name == 'bag':                                                  # platelets floating in plasma
        for k in range(11):
            a = k * 2.399 + 0.25 * t
            rad = rw * 0.78 * math.sqrt((k + 0.5) / 11)
            M.platelet(pen, rad * math.cos(a), rad * math.sin(a) + 1.5 * math.sin(t * 1.3 + k), 2.6, k + t * 0.8)
    else:                                                              # red cells (and plasma) going back
        for k in range(7):
            a = k * 2.399 - 0.3 * t
            rad = rw * 0.66 * math.sqrt((k + 0.5) / 7)
            M.rbc(pen, rad * math.cos(a), rad * math.sin(a), 5.2, tilt=0.3 + 0.4 * abs(math.sin(k + t * 0.5)),
                  psi=k + t * 0.4)
    return buf


def draw_callouts(frame, t, view):
    for name in _CALLOUTS:
        g = callout_geometry(name, t, view)
        if g is None or g[2] < 1.0:
            continue
        cx, cy, r, ax, ay = g
        dx, dy = ax - cx, ay - cy                                      # dotted leader from the rim to the anchor
        dist = math.hypot(dx, dy)
        if dist > r + 4:
            for k in range(int(r + 3), int(dist), 3):
                x, y = int(cx + dx * k / dist), int(cy + dy * k / dist)
                if 0 <= x < W and 0 <= y < H:
                    frame[y, x] = P.MACH[5]
            if 0 <= int(ax) < W and 0 <= int(ay) < H:
                frame[max(int(ay) - 1, 0):int(ay) + 1, max(int(ax) - 1, 0):int(ax) + 1] = P.MACH[5]
        content = _bubble_content(name, t, cx, cy, r)
        d = np.hypot(_II - cx, _JJ - cy)
        m = d < r
        frame[m] = content[m]
        frame[(d >= r) & (d < r + 2.0)] = P.MACH[5]
        frame[(d >= r + 2.0) & (d < r + 3.0)] = P.NAVY[0]


# ------------------------------------------------------------------ the frame
def render_canvas(t, info=True, lang='en'):
    t = t % T.TOTAL
    ln = T.lens(t)
    if ln is not None:                                                 # a magnifier lens opens or closes
        kind, way, p, focus = ln
        wv = _view('world', t)
        world = _render('world', t, wv)
        fx, fy = wv.px(*focus)
        rmax = max(math.hypot(fx - x, fy - y) for x in (0, W) for y in (0, H)) + 4
        e = _ease(p)
        r, scale = (rmax * e, 0.72 + 0.28 * e) if way == 'in' else (rmax * (1 - e), 1.0 - 0.22 * e)
        inner = _render(kind, t, _view(kind, t, scale))
        return lens_composite(world, inner, fx, fy, max(r, 0.0))
    kind = T.view_kind(t)
    view = _view(kind, t)
    frame = _render(kind, t, view)
    if kind == 'world':
        draw_callouts(frame, t, view)
    if info:
        LB.draw(frame, kind, view, t, lang)
        if kind == 'world':
            LB.draw(frame, 'screen', view, t, lang)
    return frame


def render(t, scale=gfx.SCALE, info=True, lang='en'):
    return gfx.upscale(render_canvas(t, info, lang), scale)
