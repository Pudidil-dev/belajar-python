"""The patient: an adult in left-facing side profile, breathing through the mask, holding the nebulizer.

Drawn like a 16-bit cutscene portrait, at real proportions (no chibi): a hand-placed profile outline smoothed with a
spline, lit as an inflated 3D surface from the signed distance to that outline (key light from the front-left, a cool
navy rim light from behind), then the features (eye, brow, ear, nostril, lips, jaw shadow) and the hair in strand
groups. Everything is in millimetres and re-rasterized at every zoom.

World layout (mm): the mesh is at the origin, the nebulizer outlet axis is y = 0, so the mask port sits at the mouth.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import catmull, poly_sel, poly_bounds, SDFGrid, lit, put, tones, mix, sd_ellipse, sd_capsule, sd_circle

# ------------------------------------------------------------------ outlines (control points, mm)
HEAD_CTRL = [
    (82, -126), (69, -113), (61, -97), (56.5, -80), (54, -65), (53.5, -57), (56.5, -48.5), (52.5, -39),
    (46.5, -29), (41, -20), (37, -13.8), (35.6, -9.6), (37.4, -6.2), (42, -3.8), (48.6, -2.6), (48.2, 0.8),
    (46.6, 4.4), (48.0, 7.0), (50.4, 8.2), (48.6, 9.8), (47.4, 12.6), (49.8, 16.2), (53.8, 20.2), (53.0, 26),
    (51.6, 31), (53.2, 36.6), (58.5, 41.2), (67, 44.4), (79, 47.2), (90, 50.5), (98, 56), (101, 65), (103, 80),
    (105.5, 100), (109, 120), (114, 142), (119, 165), (123, 205), (206, 205), (196, 162), (186, 128), (181, 100),
    (182, 72), (188, 45), (197, 18), (204, -12), (206, -42), (203, -71), (196, -97), (184, -117), (166, -133),
    (144, -142), (120, -143), (100, -137), (88, -131),
]
HAIR_CTRL = [
    (84, -113), (71, -108), (63, -117), (69, -133), (96, -151), (124, -154), (152, -148), (176, -135), (195, -116),
    (207, -90), (212, -58), (211, -25), (204, 4), (193, 26), (184, 31), (178, 18), (174, -2), (171, -26),
    (166, -44), (156, -53), (143, -56), (134, -55), (128, -49), (127.5, -36), (124, -31), (120.5, -40),
    (116, -60), (106, -82), (96, -101), (89, -115),
]
EAR_CTRL = [
    (139, -36), (142, -43), (149, -46.5), (157, -44), (162, -36), (163.5, -22), (161, -8), (156, 4), (149.5, 12),
    (143.5, 12.5), (140, 7), (139.5, 0), (137.2, -8), (136, -14), (137.5, -22),
]
# the near hand (back of the left hand) gripping the handle, thumb on top
HAND_CTRL = [
    (-9, 48.4), (0, 49.4), (8, 52), (14, 57), (19, 66), (24, 79), (29, 94), (34, 108), (14, 117), (6, 101),
    (0, 92), (-9, 88.4),
]
FINGERS = [(-22.6, 52.9, -5.0, 53.4, 4.3), (-23.2, 61.5, -5.0, 61.9, 4.3), (-23.0, 70.1, -5.0, 70.3, 4.3),
           (-22.0, 78.6, -5.5, 78.6, 4.0)]
THUMB_CTRL = [
    (-19, 46.8), (-14, 43.0), (-6, 42.0), (2, 43.3), (9, 47.3), (13, 53), (8, 55), (1, 52.3), (-6, 50.8),
    (-13, 50.8), (-18.5, 50.3),
]
# long sleeve: forearm from the wrist down to the bottom of the frame
SLEEVE_CTRL = [
    (6, 99), (17, 92), (31, 96), (52, 130), (78, 172), (100, 215), (52, 230), (34, 190), (17, 150), (5, 118),
]
SHIRT_CTRL = [
    (101, 150), (104, 141), (126, 147), (152, 151), (182, 142), (208, 147), (228, 230), (66, 232), (78, 200),
    (90, 172),
]
# mask: front shell + the edge that seals on the face, and the port that takes the nebulizer outlet
MASK_CTRL = [
    (51.5, -38.0), (44, -38.8), (36, -33.2), (29.5, -23), (25.4, -10), (23.9, 3), (25, 16), (29, 28),
    (36.5, 39), (46.5, 47.5), (58, 52.6), (69, 53.2), (77, 47.6), (83, 36), (86.5, 20), (86, 4), (82, -11),
    (75, -24), (66, -32.5), (58, -37),
]
MASK_RIM_CTRL = [(55, -37.6), (66, -32.5), (75, -24), (82, -11), (86, 4), (86.5, 20), (83, 36), (77, 47.6),
                 (69, 53.2)]
STRAP_CTRL = [(84.0, -6), (100, -19), (122, -33), (150, -44), (180, -51), (220, -56)]
PORT = (16.2, 27.5, 10.6)          # mask connector: x0, x1, outer radius (mm)
VENT = (67.5, 27.5, 3.3, 2.7)      # side exhalation port: cx, cy, rx, ry
NOSTRIL = (44.6, -4.6)
MOUTH = (50.4, 8.3)

HEAD = catmull(HEAD_CTRL, 6)
HAIR = catmull(HAIR_CTRL, 6)
EAR = catmull(EAR_CTRL, 6)
HAND = catmull(HAND_CTRL, 6)
THUMB = catmull(THUMB_CTRL, 6)
SLEEVE = catmull(SLEEVE_CTRL, 6)
SHIRT = catmull(SHIRT_CTRL, 6)
MASK = catmull(MASK_CTRL, 6)
MASK_RIM = catmull(MASK_RIM_CTRL, 6, closed=False)
STRAP = catmull(STRAP_CTRL, 6, closed=False)
JAW = catmull([(57, 41), (75, 39), (98, 34), (118, 27), (131, 20), (138, 8)], 6, closed=False)

_GRIDS = {}


def grids():
    """Signed-distance grids for lighting (built once per process, ~1 s)."""
    if not _GRIDS:
        _GRIDS['head'] = SDFGrid(HEAD, 0.6)
        _GRIDS['hair'] = SDFGrid(HAIR, 0.6)
        _GRIDS['ear'] = SDFGrid(EAR, 0.35)
        _GRIDS['hand'] = SDFGrid(HAND, 0.4)
        _GRIDS['thumb'] = SDFGrid(THUMB, 0.35)
        _GRIDS['sleeve'] = SDFGrid(SLEEVE, 0.8)
        _GRIDS['shirt'] = SDFGrid(SHIRT, 0.8)
    return _GRIDS


def _bx(view, pts, pad=1.0, ox=0.0, oy=0.0):
    x0, y0, x1, y1 = poly_bounds(pts, pad)
    return view.box(x0 + ox, y0 + oy, x1 + ox, y1 + oy)


def _polyline_dist(X, Y, pts):
    d = np.full(np.broadcast(X, Y).shape, np.inf)
    for a, b in zip(pts[:-1], pts[1:]):
        d = np.minimum(d, sd_capsule(X, Y, a[0], a[1], b[0], b[1], 0.0))
    return d


def _signed_below(X, Y, pts):
    """Distance to a polyline, positive below it (for the jaw shadow on the neck)."""
    d = _polyline_dist(X, Y, pts)
    ys = np.interp(np.broadcast_to(X, d.shape), pts[:, 0], pts[:, 1])
    return np.where(Y > ys, d, -d)


# ------------------------------------------------------------------ body parts
def draw_shirt(buf, view, t):
    lift = -1.6 * T.chest(t)
    g = grids()['shirt']
    bx = _bx(view, SHIRT, 2, 0, lift)
    if bx is None:
        return
    X, Y = view.grid(bx)
    sel = poly_sel(view, SHIRT, bx, 0, lift)
    d = g.sample(X, Y, 0, lift)
    v = 0.3 + 0.55 * lit(g.sample(X, Y, 0, lift, 'gx'), g.sample(X, Y, 0, lift, 'gy'), d, 22.0)
    # fabric folds: soft diagonal creases from the collar and the shoulder
    fold = np.sin((X * 0.09 + Y * 0.05) * 1.0 + 0.6 * np.sin(Y * 0.05)) * np.exp(-((Y - lift - 175) / 40) ** 2)
    v = v - 0.12 * np.clip(fold, 0, 1) + 0.06 * np.clip(-fold, 0, 1)
    col = tones(P.SH, np.clip(v, 0, 1), bx)
    put(buf, bx, sel, col)
    # collar band and its inner shadow
    neck = _polyline_dist(X, Y - lift, np.array([[101, 150], [112, 144.5], [126, 147], [152, 151], [182, 142]]))
    band = sel & (neck < 3.4)
    put(buf, bx, band, tones(P.SH, np.clip(v + 0.18, 0, 1), bx))
    put(buf, bx, sel & (np.abs(neck - 3.4) < 0.75 / view.z + 0.3), P.SH[1])
    put(buf, bx, sel & (d > -1.0 / view.z), P.SH[0])


def draw_head(buf, view, t):
    G = grids()
    g = G['head']
    bx = _bx(view, HEAD, 2)
    if bx is None:
        return None
    X, Y = view.grid(bx)
    sel = poly_sel(view, HEAD, bx)
    if not sel.any():
        return None
    d = g.sample(X, Y)
    gx, gy = g.sample(X, Y, what='gx'), g.sample(X, Y, what='gy')
    v = 0.18 + 0.78 * lit(gx, gy, d, 26.0)
    # big forms: cheekbone light, the side plane of the face, temple, the back of the jaw and the neck in shadow
    v += 0.12 * np.exp(-(((X - 84) / 15) ** 2 + ((Y + 23) / 9) ** 2))
    v += 0.06 * np.exp(-(((X - 70) / 12) ** 2 + ((Y + 85) / 20) ** 2))
    v -= 0.10 * np.exp(-(((X - 79) / 9) ** 2 + ((Y + 37) / 6) ** 2))       # eye socket
    v -= 0.07 * np.exp(-(((X - 104) / 14) ** 2 + ((Y + 4) / 16) ** 2))     # cheek turning away
    v -= 0.16 * np.clip((X - 120) / 50, 0, 1)                               # back of the head turns from the light
    jaw = _signed_below(X, Y, JAW)
    neck_shadow = np.clip(1 - jaw / 16, 0, 1) * (jaw > 0) * (X > 58)
    v -= 0.30 * neck_shadow
    v -= 0.10 * np.exp(-(((X - 57) / 5) ** 2 + ((Y - 5) / 9) ** 2)) * 0  # (kept for tuning)
    # nasolabial fold and the shadow under the nose
    fold = _polyline_dist(X, Y, np.array([[51, -12], [54, -4], [56.5, 5], [59.5, 13]]))
    v -= 0.10 * np.exp(-(fold / 1.6) ** 2)
    v -= 0.12 * np.exp(-(((X - 47.5) / 4.5) ** 2 + ((Y + 0.8) / 2.0) ** 2))
    # cool rim light from behind (the navy room) on the back edge of the neck
    rim = (gx > 0.35) & (d > -2.2) & (Y > 40)
    col = tones(P.SK, np.clip(v, 0, 1), bx)
    put(buf, bx, sel, col)
    mix(buf, bx, sel & rim, P.NV[8], 0.45)
    put(buf, bx, sel & (d > -1.0 / view.z), P.SK[1])
    _face_features(buf, view, t, bx, X, Y, sel)
    return bx


def _face_features(buf, view, t, bx, X, Y, sel):
    z = view.z
    o = 1.0 / z
    # blush on the cheek (lips ramp, dithered)
    bl = np.exp(-(((X - 76) / 9) ** 2 + ((Y + 12) / 6) ** 2))
    mix(buf, bx, sel & (bl > gfx.bayer_at(bx[0], bx[1], bx[3] - bx[1], bx[2] - bx[0]) * 1.6), P.LP[5], 0.35)
    # lips (vermilion) along the profile, slightly parted for breathing in through the mouth
    up = sd_ellipse(X, Y, 49.6, 5.4, 3.4, 2.4)
    lo = sd_ellipse(X, Y, 49.8, 12.4, 3.5, 3.0)
    lips = sel & ((up < 0) | (lo < 0))
    mix(buf, bx, lips, P.LP[4], 0.42)
    mix(buf, bx, lips & (Y < 7.2) & (Y > 5.6), P.LP[2], 0.35)
    gap = sd_capsule(X, Y, 50.0, 8.6, 57.5, 9.4, 0.55 + 0.25 * T.inhale(t))
    put(buf, bx, sel & (gap < 0), P.LP[0])
    put(buf, bx, sel & (sd_circle(X, Y, 58.2, 9.4, 0.9) < 0), P.SK[2])            # mouth corner
    # nose: alar wing and the nostril (flares a touch on the in-breath)
    flare = 1.0 + 0.12 * T.inhale(t)
    ala = sd_ellipse(X, Y, 47.6, -7.2, 4.8 * flare, 3.6)
    ring = (ala < 0) & (ala > -1.2 * o - 0.25)
    put(buf, bx, sel & ring & (X > 44.5), P.SK[3])
    nos = sd_ellipse(X, Y, NOSTRIL[0], NOSTRIL[1], 2.6 * flare, 1.25)
    put(buf, bx, sel & (nos < 0), P.SK[1])
    hl = sd_ellipse(X, Y, 41.0, -14.5, 2.4, 1.6)
    put(buf, bx, sel & (hl < 0), P.SK[8])                                          # nose tip highlight
    put(buf, bx, sel & (sd_ellipse(X, Y, 49.5, -31, 1.6, 4.5) < 0), P.SK[7])       # bridge highlight
    # eye: in profile the opening is a wedge, the cornea at the front, the lids meeting at the outer corner
    cl = T.blink(t)
    upper = np.array([(63.3, -42.4), (64.4, -44.7), (68.6, -45.7), (73.6, -44.4), (77.9, -41.5)])
    lower = np.array([(77.9, -41.5), (73.6, -39.2), (68.6, -38.7), (64.6, -39.3), (63.3, -41.0)])
    closed = np.array([(63.3, -41.2), (64.4, -40.4), (68.6, -39.9), (73.6, -40.1), (77.9, -41.5)])
    upper = upper + (closed - upper) * cl
    opening = np.vstack([upper, lower])
    shape = sel & poly_sel(view, opening, bx)
    put(buf, bx, shape, P.EYE_WHITE)
    put(buf, bx, shape & (X > 73.0), P.EYE_SHADE)
    put(buf, bx, shape & (Y < upper[2][1] + 1.3), P.EYE_SHADE)                     # lid shadow on the ball
    iris = sd_ellipse(X, Y, 66.3, -41.7, 2.3, 3.1)
    put(buf, bx, shape & (iris < 0), P.IRIS)
    put(buf, bx, shape & (sd_ellipse(X, Y, 65.4, -41.6, 1.0, 1.8) < 0), P.PUPIL)
    put(buf, bx, shape & (sd_circle(X, Y, 66.6, -43.1, 0.6) < 0), P.WHITE)         # catch light
    lid_d = np.full(sel.shape, np.inf)
    for a, b in zip(upper[:-1], upper[1:]):
        lid_d = np.minimum(lid_d, sd_capsule(X, Y, a[0], a[1], b[0], b[1], 0.0))
    put(buf, bx, sel & (lid_d < 0.45 + 0.6 * o), P.HR[1])                         # upper lid line + lashes
    put(buf, bx, sel & (sd_capsule(X, Y, 64.2, -44.8, 62.2, -46.4, 0.35 + 0.45 * o) < 0), P.HR[1])
    put(buf, bx, sel & (sd_capsule(X, Y, 65.8, -45.4, 64.6, -47.4, 0.3 + 0.45 * o) < 0), P.HR[1])
    crease = np.full(sel.shape, np.inf)
    cr = upper + np.array([0.6, -2.6])
    for a, b in zip(cr[1:-1], cr[2:]):
        crease = np.minimum(crease, sd_capsule(X, Y, a[0], a[1], b[0], b[1], 0.0))
    put(buf, bx, sel & (crease < 0.3 + 0.45 * o), P.SK[3])
    low_d = np.full(sel.shape, np.inf)
    for a, b in zip(lower[:-1], lower[1:]):
        low_d = np.minimum(low_d, sd_capsule(X, Y, a[0], a[1], b[0], b[1], 0.0))
    put(buf, bx, sel & ~shape & (low_d < 0.3 + 0.45 * o), P.SK[4])
    # brow
    brow = sd_capsule(X, Y, 58.0, -52.6, 69.5, -55.4, 1.35)
    brow = np.minimum(brow, sd_capsule(X, Y, 69.5, -55.4, 81.5, -53.4, 1.0))
    hairs = np.sin(X * 2.4 + Y * 0.8) > 0.2
    put(buf, bx, sel & (brow < 0), P.HR[3])
    put(buf, bx, sel & (brow < 0) & hairs, P.HR[2])
    put(buf, bx, sel & (brow < 0) & (brow > -0.5) & (Y < -55), P.HR[5])


def draw_ear(buf, view, t):
    g = grids()['ear']
    bx = _bx(view, EAR, 2)
    if bx is None:
        return
    X, Y = view.grid(bx)
    sel = poly_sel(view, EAR, bx)
    d = g.sample(X, Y)
    v = 0.2 + 0.7 * lit(g.sample(X, Y, what='gx'), g.sample(X, Y, what='gy'), d, 5.0)
    concha = sd_ellipse(X, Y, 148.5, -16, 5.2, 9.5)
    anti = sd_ellipse(X, Y, 151, -18, 8.0, 13.5)
    v = np.where(anti < 0, v - 0.18, v)
    v = np.where(concha < 0, v - 0.2, v)
    put(buf, bx, sel, tones(P.SK, np.clip(v, 0, 1), bx))
    helix = sel & (d > -2.4) & (d < -1.0)
    put(buf, bx, helix & (X > 148), P.SK[3])
    put(buf, bx, sel & (sd_ellipse(X, Y, 141.6, -11, 1.5, 2.0) < 0), P.SK[1])     # ear canal shadow
    put(buf, bx, sel & (np.abs(anti) < 0.6 / view.z + 0.25) & (X > 146), P.SK[7])  # antihelix ridge light
    put(buf, bx, sel & (d > -1.0 / view.z), P.SK[1])


def draw_hair(buf, view, t):
    g = grids()['hair']
    bx = _bx(view, HAIR, 2)
    if bx is None:
        return
    X, Y = view.grid(bx)
    sel = poly_sel(view, HAIR, bx)
    if not sel.any():
        return
    d = g.sample(X, Y)
    v = 0.1 + 0.7 * lit(g.sample(X, Y, what='gx'), g.sample(X, Y, what='gy'), d, 16.0)
    # strand groups: bands that follow the hair flow (swept back from the forehead), sheen on the crown
    ang = np.arctan2(Y + 40, X - 150)
    flow = np.sin(ang * 26 + 0.035 * np.hypot(X - 150, Y + 40))
    sheen = np.exp(-(((X - 112) / 26) ** 2 + ((Y + 134) / 9) ** 2))
    v = v + 0.16 * sheen * (flow > -0.2) + 0.07 * (flow > 0.55) - 0.07 * (flow < -0.6)
    put(buf, bx, sel, tones(P.HR, np.clip(v, 0, 1), bx))
    put(buf, bx, sel & (d > -1.0 / view.z), P.HR[0])


def draw_strap(buf, view, t):
    bx = _bx(view, STRAP, 5)
    if bx is None:
        return
    X, Y = view.grid(bx)
    dist = _polyline_dist(X, Y, STRAP)
    band = dist < 2.4
    v = np.clip(0.55 - 0.25 * (dist / 2.4) + 0.25 * (Y < np.interp(np.broadcast_to(X, dist.shape), STRAP[:, 0],
                                                                         STRAP[:, 1])), 0, 1)
    put(buf, bx, band, tones(P.ST, v, bx))
    put(buf, bx, (np.abs(dist - 2.4) < 0.6 / view.z + 0.1), P.ST[0])
    # the clip where the strap meets the mask
    clip_ = sd_ellipse(X, Y, 84.0, -6.0, 2.6, 3.4)
    put(buf, bx, clip_ < 0, P.GR[6])
    put(buf, bx, (clip_ < 0) & (clip_ > -0.8 / view.z - 0.15), P.GR[2])


def draw_hand_back(buf, view, t):
    """Sleeve and the back of the hand (drawn after the handle, so it wraps around it)."""
    G = grids()
    g = G['sleeve']
    bx = _bx(view, SLEEVE, 2)
    if bx is not None:
        X, Y = view.grid(bx)
        sel = poly_sel(view, SLEEVE, bx)
        d = g.sample(X, Y)
        v = 0.22 + 0.62 * lit(g.sample(X, Y, what='gx'), g.sample(X, Y, what='gy'), d, 14.0)
        crease = np.sin((X * 0.16 - Y * 0.11)) * np.exp(-((Y - 150) / 45) ** 2)
        v -= 0.12 * (crease > 0.75)
        put(buf, bx, sel, tones(P.SH, np.clip(v, 0, 1), bx))
        cuff = _polyline_dist(X, Y, np.array([[5, 116], [10, 104], [17, 95], [31, 98]]))
        put(buf, bx, sel & (cuff < 4.2), tones(P.SH, np.clip(v + 0.15, 0, 1), bx))
        put(buf, bx, sel & (np.abs(cuff - 4.2) < 0.6 / view.z + 0.15), P.SH[1])
        put(buf, bx, sel & (d > -1.0 / view.z), P.SH[0])
    _draw_fingers(buf, view, t)
    for name, pts, R in (('hand', HAND, 9.0), ('thumb', THUMB, 4.5)):
        g = G[name]
        bx = _bx(view, pts, 2)
        if bx is None:
            continue
        X, Y = view.grid(bx)
        sel = poly_sel(view, pts, bx)
        d = g.sample(X, Y)
        v = 0.16 + 0.8 * lit(g.sample(X, Y, what='gx'), g.sample(X, Y, what='gy'), d, R)
        if name == 'hand':
            # knuckle bumps (MCP joints) along the front edge and the tendons fanning back to the wrist
            for ky in (53.2, 61.8, 70.2, 78.6):
                kn = sd_ellipse(X, Y, -6.0, ky, 3.6, 3.4)
                v = np.where(kn < 0, v + 0.08, v)
            for ty, tx0 in ((58, -6), (65.5, -6), (73, -6)):
                ten = sd_capsule(X, Y, tx0, ty, 10, ty + 18, 0.9)
                v = np.where(ten < 0, v + 0.06, v)
            v -= 0.18 * np.clip((Y - 84) / 10, 0, 1)
        else:
            nail = sd_ellipse(X, Y, -14.6, 45.4, 3.2, 2.0)
            put_nail = nail < 0
        put(buf, bx, sel, tones(P.SK, np.clip(v, 0, 1), bx))
        if name == 'thumb':
            put(buf, bx, sel & put_nail, tones(P.SK, np.full(sel.shape, 0.85), bx))
            put(buf, bx, sel & (np.abs(nail) < 0.5 / view.z + 0.1), P.SK[4])
        put(buf, bx, sel & (d > -1.0 / view.z), P.SK[1])


# ------------------------------------------------------------------ the transparent mask
def _mask_geom(view):
    bx = _bx(view, MASK, 3)
    bxp = view.box(PORT[0] - 2.5, -PORT[2] - 1, PORT[1] + 1, PORT[2] + 1)
    return bx, bxp


def draw_mask_back(buf, view, t):
    """The plastic tint (drawn before the mist)."""
    bx, bxp = _mask_geom(view)
    if bx is not None:
        sel = poly_sel(view, MASK, bx)
        mix(buf, bx, sel, P.CY[8], 0.13)
    if bxp is not None:
        X, Y = view.grid(bxp)
        port = (np.abs(Y) < PORT[2]) & (X > PORT[0]) & (X < PORT[1] + 2)
        mix(buf, bxp, port, P.CY[8], 0.10)


def draw_mask_front(buf, view, t):
    """Edges, the soft seal, highlights, the vent and the port rims (drawn over the mist)."""
    z = view.z
    o = 1.0 / z
    bx, bxp = _mask_geom(view)
    if bx is not None:
        X, Y = view.grid(bx)
        sel = poly_sel(view, MASK, bx)
        md = _MASK_SDF().sample(X, Y)
        # the seal along the face: a softer, more opaque band
        rim = _polyline_dist(X, Y, MASK_RIM)
        band = sel & (rim < 3.2)
        mix(buf, bx, band, P.CY[7], 0.32)
        put(buf, bx, band & (np.abs(rim - 3.2) < 0.5 * o + 0.1), P.CY[8])
        # outer edge: light rim on the lit side, darker on the far side
        edge = sel & (md > -1.0 * o - 0.05)
        lit_side = (X < 60) & (Y < 30)
        put(buf, bx, edge & lit_side, P.CY[9])
        put(buf, bx, edge & ~lit_side, P.CY[6])
        # specular streaks following the shell (16-bit glass highlights)
        s1 = np.abs(md + 2.6) < 0.45 * o + 0.18
        put(buf, bx, sel & s1 & (Y > -40) & (Y < -14) & (X < 40), P.WHITE)
        put(buf, bx, sel & s1 & (Y > 26) & (Y < 36) & (X < 40), P.CY[9])
        s2 = np.abs(md + 4.4) < 0.4 * o + 0.12
        put(buf, bx, sel & s2 & (Y > -34) & (Y < -26) & (X < 40), P.CY[9])
        # side exhalation port: a round hole with a raised rim; mist puffs out of it while breathing out
        vd = np.sqrt(((X - VENT[0]) / VENT[2]) ** 2 + ((Y - VENT[1]) / VENT[3]) ** 2)
        mix(buf, bx, sel & (vd < 1.0), P.NV[2], 0.25)
        put(buf, bx, sel & (vd >= 1.0) & (vd < 1.0 + 1.2 / VENT[2] + 0.6 * o / VENT[2]), P.CY[8])
        put(buf, bx, sel & (vd >= 1.0) & (vd < 1.0 + 0.6 * o / VENT[2] + 0.3 / VENT[2]) & (Y > VENT[1]), P.CY[5])
    if bxp is not None:
        X, Y = view.grid(bxp)
        ay = np.abs(Y)
        port = (ay < PORT[2]) & (X > PORT[0]) & (X < PORT[1])
        put(buf, bxp, port & (np.abs(ay - PORT[2]) < 0.9 * o + 0.1), P.CY[7])
        put(buf, bxp, port & (np.abs(Y + PORT[2] - 1.6) < 0.45 * o + 0.1) & (X > PORT[0] + 1.5), P.WHITE)
        # the port's open front edge, seen slightly from the side
        fr = np.sqrt(((X - PORT[0]) / 1.9) ** 2 + (Y / PORT[2]) ** 2)
        put(buf, bxp, (fr < 1.0) & (fr > 1.0 - 1.1 / max(PORT[2] * z, 1)) & (X < PORT[0] + 0.2), P.CY[8])


_MS = {}


def _MASK_SDF():
    if not _MS:
        _MS['m'] = SDFGrid(MASK, 0.5)
    return _MS['m']


def _draw_fingers(buf, view, t):
    """Four finger rolls wrapped round the front of the handle (curling round its left edge), lit as cylinders."""
    bx = view.box(-29, 47, -2, 85)
    if bx is None:
        return
    X, Y = view.grid(bx)
    o = 1.0 / view.z
    for k in (3, 2, 1, 0):                       # bottom first, so each finger overlaps the one below
        ax, ay, bx_, by, r = FINGERS[k]
        d = sd_capsule(X, Y, ax, ay, bx_, by, r)
        sel = d < 0
        if not sel.any():
            continue
        # cylinder across the finger + the rounded curl at the left end
        ny = np.clip((Y - (ay + (by - ay) * np.clip((X - ax) / (bx_ - ax), 0, 1))) / r, -1, 1)
        v = 0.62 - 0.42 * ny - 0.15 * ny * ny
        v = v - 0.12 * np.clip((ax + 4 - X) / 4, 0, 1)          # the curl turns away round the edge
        pip = sd_ellipse(X, Y, ax + 6.0, (ay + by) / 2, 2.6, r * 0.9)
        v = np.where(pip < 0, v + 0.07, v)                      # middle knuckle
        put(buf, bx, sel, tones(P.SK, np.clip(v, 0, 1), bx))
        put(buf, bx, sel & (d > -1.0 * o - 0.05), P.SK[1])
