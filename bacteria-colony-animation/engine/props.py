"""World building: the lab bench around the dishes, seen from above while the camera pans in and out.

Every stretch of bench between two dishes holds the same set of props (the bench repeats every T.DELTA mm, like
the dishes, so the loop stays exact): the empty swab packet and a marker next to the dish, a pipette-tip box, a
flask of broth with a cotton plug (bubbling), a Bunsen burner (flickering flame, warm light on the bench), an
inoculating loop, an open lab notebook (cell doodles, a pen), a 37.0 C display, a test-tube rack, a magnetic stirrer
with a beaker of broth (spinning bar, vortex, blinking LED), a wash bottle and a sticky note with the streak plan.
Dust motes float above it all.

Each prop is drawn per pixel in its own coordinates (mm, rotated with the prop) on the plane of its top, so it pans
and zooms with the world, and casts a shadow on the bench toward the front right, like the dishes. All animation
runs on whole cycles per 20 s.
"""
import math
import numpy as np
from . import palette as P
from . import timeline as T
from .world import W, H, XX, YY, hash2, blend

SHADOW = np.array([0.25, -0.36])            # shadow offset on the bench per mm of height (same light as the dishes)


# ------------------------------------------------------------------ signed distances (negative inside)
def circ(lx, ly, cx, cy, r):
    return np.hypot(lx - cx, ly - cy) - r


def rrect(lx, ly, cx, cy, hw, hh, r):
    qx, qy = np.abs(lx - cx) - (hw - r), np.abs(ly - cy) - (hh - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def seg(lx, ly, ax, ay, bx, by, r):
    vx, vy = bx - ax, by - ay
    tt = np.clip(((lx - ax) * vx + (ly - ay) * vy) / (vx * vx + vy * vy + 1e-12), 0, 1)
    return np.hypot(lx - (ax + tt * vx), ly - (ay + tt * vy)) - r


BUBBLES, BUBBLE_PERIOD = 7, 2.0           # the flask: 7 bubbles, each pops once every 2 s (10 times a loop)


def bubble_born(k):
    return (k * BUBBLE_PERIOD / BUBBLES + 0.37 * k) % BUBBLE_PERIOD


def flick(t):
    """Flame flicker: whole cycles per second, so it repeats exactly every loop."""
    return (1 + 0.10 * math.sin(2 * math.pi * 7 * t) + 0.07 * math.sin(2 * math.pi * 11 * t + 1.3)
            + 0.05 * math.sin(2 * math.pi * 17 * t + 0.4))


class Pen:
    """Paints one prop into a small local colour buffer."""

    def __init__(self, lx, ly, D, t, pxmm):
        self.lx, self.ly, self.D, self.t, self.px = lx, ly, D, t, pxmm
        self.col = np.zeros(lx.shape + (3,), np.uint8)
        self.m = np.zeros(lx.shape, bool)
        self.no_outline = np.zeros(lx.shape, bool)

    def fill(self, inside, col, outline=True):
        if not np.any(inside):
            return
        col = np.asarray(col, np.uint8)
        if col.ndim == 3:
            self.col[inside] = col[inside]
        else:
            self.col[inside] = col
        self.m |= inside
        if not outline:
            self.no_outline |= inside

    def glow(self, inside, col, a):
        self.fill(inside & (self.D < a), col, outline=False)


# ------------------------------------------------------------------ the props
def burner(p):
    lx, ly, t = p.lx, p.ly, p.t
    hose = np.minimum(np.minimum(seg(lx, ly, 0, 20, 7, 46, 3.2), seg(lx, ly, 7, 46, 20, 78, 3.2)),
                      seg(lx, ly, 20, 78, 27, 112, 3.2))
    p.fill(hose < 0, P.AGAR[1])
    p.fill(hose < -1.9, P.AGAR[2])
    base = circ(lx, ly, 0, 0, 19)
    ang = np.arctan2(ly, lx)
    lit = np.cos(ang - 2.36)
    p.fill(base < 0, P.METAL[1])
    ring = (base < 0) & (base > -3.4)
    p.fill(ring & (lit > 0.25), P.METAL[3])
    p.fill(ring & (lit < -0.45), P.METAL[0])
    p.fill(seg(lx, ly, 0, 13, 0, 22, 2.2) < 0, P.METAL[2])
    knob = circ(lx, ly, 13, -12, 3.6)
    p.fill(knob < 0, P.METAL[3])
    p.fill((knob < 0) & (np.abs(lx - 13 - (ly + 12)) < 0.6), P.METAL[1])
    barrel = circ(lx, ly, 0, 0, 6.5)
    p.fill(barrel < 0, P.METAL[2])
    p.fill((barrel < 0) & (barrel > -1.2) & (lit > 0.2), P.METAL[4])
    p.fill(circ(lx, ly, 0, 0, 3.6) < 0, P.METAL[0])
    fl = flick(t)
    wx, wy = 0.6 * math.sin(2 * math.pi * 3 * t), 0.5 * math.cos(2 * math.pi * 2 * t)
    r = np.hypot(lx - wx, ly - wy)
    ro = 9.5 * fl
    p.glow(r < ro, P.AGAR[6], 0.95 * np.clip(1 - r / ro, 0, 1) ** 0.7)
    p.glow(r < ro * 0.62, P.COTTON[4], 0.9 * np.clip(1 - r / (ro * 0.62), 0, 1) ** 0.6)
    p.fill((r > 1.8) & (r < 3.9), P.PLASTIC[2], outline=False)
    p.fill((r >= 3.9) & (r < 4.7), P.PLASTIC[3], outline=False)
    p.fill(r <= 1.8, P.WHITE, outline=False)


def flask(p):
    """An Erlenmeyer flask of broth seen from above: the cone of glass shaded like a cone, the neck, a cotton plug."""
    lx, ly, t = p.lx, p.ly, p.t
    r = np.hypot(lx, ly)
    ang = np.arctan2(ly, lx)
    lit = np.cos(ang - 2.36)                                   # the cone's lit side faces the upper left
    p.fill(r < 27, P.AGAR[2])                                  # broth seen through the glass
    cone = (r < 27) & (r > 8.8)
    lv = 2.0 + 1.6 * lit + 0.9 * np.cos(ang * 6 + 0.4) * (r > 15)  # the glass cone: lit side, darker side, facets
    k = np.clip(np.floor(lv + p.D * 0.95), 0, 4).astype(int)
    ramp = np.stack([P.AGAR[1], P.AGAR[2], P.AGAR[3], P.AGAR[4], P.AGAR[6]])
    p.fill(cone, ramp[k])
    p.fill((r < 27) & (r > 25.4), P.PLASTIC[2])
    p.fill((r < 26.8) & (r > 24.6) & (lit > 0.75), P.PLASTIC[4])
    p.fill((r > 10) & (r < 24) & (np.abs(((ang - 2.36) + math.pi) % (2 * math.pi) - math.pi) < 0.07), P.PLASTIC[4])
    for k in range(BUBBLES):                                   # bubbles rise and pop, on a 20 s cycle
        age = (t - bubble_born(k)) % BUBBLE_PERIOD
        if age > 1.1:
            continue
        a, rr = hash2(k, 71) * 2 * math.pi, 12 + 11 * hash2(k, 72)
        bx, by = rr * math.cos(a), rr * math.sin(a)
        br = 0.6 + 1.1 * age / 1.1
        d = np.hypot(lx - bx, ly - by)
        if age < 1.0:
            p.fill(np.abs(d - br) < 0.45, P.AGAR[6], outline=False)
        else:
            p.fill(np.abs(d - br * 1.4) < 0.4, P.COTTON[4], outline=False)
    p.fill((r < 8.8) & (r > 6.4), P.PLASTIC[3])
    p.fill((r < 8.8) & (r > 7.6) & (lit > 0.4), P.PLASTIC[4])
    plug = r < 6.9 + 0.8 * np.sin(ang * 5 + 1.0)               # the cotton plug bulges out of the neck
    fib = hash2(np.floor(lx * 1.4), np.floor(ly * 1.4), 73)
    p.fill(plug, P.COTTON[3])
    p.fill(plug & ((fib > 0.55) | (lit > 0.5) & (r > 3)), P.COTTON[4])
    p.fill(plug & (fib < 0.16) | plug & (lit < -0.6) & (r > 4), P.COTTON[2])


def tip_box(p):
    lx, ly = p.lx, p.ly
    lid = rrect(lx, ly, 0, 25, 25, 10.5, 2)
    p.fill(lid < 0, P.PLASTIC[1])
    p.fill((lid < 0) & (lid > -1.1), P.PLASTIC[2])
    box = rrect(lx, ly, 0, 0, 25, 17, 2)
    p.fill(box < 0, P.MINT[0])
    p.fill(rrect(lx, ly, -0.5, 0.5, 23.5, 15.5, 1.5) < 0, P.MINT[1])
    gx = np.round((lx + 19.25) / 5.5)
    gy = np.round((ly + 11.0) / 5.5)
    inside = (gx >= 0) & (gx <= 7) & (gy >= 0) & (gy <= 4)
    d = np.hypot(lx - (-19.25 + 5.5 * gx), ly - (-11.0 + 5.5 * gy))
    p.fill(inside & (d < 2.0), P.AGAR[5])
    p.fill(inside & (d < 2.0) & (lx - (-19.25 + 5.5 * gx) - (ly - (-11.0 + 5.5 * gy)) > 0.8), P.AGAR[3])
    p.fill(inside & (d < 0.75), P.AGAR[1])


def notebook(p):
    lx, ly = p.lx, p.ly
    left, right = rrect(lx, ly, -19.5, 0, 19.2, 27, 1.2), rrect(lx, ly, 19.5, 0, 19.2, 27, 1.2)
    page = (left < 0) | (right < 0)
    p.fill(page, P.CREAM[6])
    p.fill(page & (np.abs(lx) < 3.2), P.CREAM[5])
    p.fill(page & (np.abs(lx) < 0.55), P.CREAM[3])
    p.fill(page & (np.abs(lx) > 37.6), P.CREAM[4])
    ruled = page & (((ly + 24.0) % 4.2) < 0.5) & (ly < 21) & (np.abs(lx) > 3.2)
    p.fill(ruled, P.PLASTIC[1])
    p.fill(page & ((np.abs(lx + 32) < 0.4) | (np.abs(lx - 7.5) < 0.4)), P.AGAR[2])
    ink = np.zeros(lx.shape, bool)
    for k in range(7):                                         # handwriting on the left page
        yk = 19.6 - 4.2 * k - 1.3
        x_end = -30 + 8 + 18 * hash2(k, 81)
        wav = yk + 0.65 * np.sin(lx * 2.6 + k) * np.sin(lx * 0.9 + 2 * k)
        ink |= (np.abs(ly - wav) < 0.42) & (lx > -30.5) & (lx < x_end) & (np.sin(lx * 1.7 + k * 3) > -0.75)
    for (ax, ay, bx, by) in ((11, 13, 21, 13),):               # a rod cell ...
        ink |= np.abs(seg(lx, ly, ax, ay, bx, by, 3.0)) < 0.42
    ink |= np.abs(np.minimum(seg(lx, ly, 9, 1, 14, 1, 2.6), seg(lx, ly, 17, 1, 22, 1, 2.6))) < 0.42   # ... in two
    ink |= (np.abs(ly - 1) < 0.4) & (lx > 26) & (lx < 32)      # an arrow
    ink |= (np.abs(np.abs(lx - 31) - (ly - 1) * 0) < 0.4) & False
    ink |= (np.abs((lx - 32) + np.abs(ly - 1)) < 0.45) & (lx > 29.5) & (lx < 32.4)
    sx = (lx > 9) & (lx < 33)                                  # the streak plan: an S with dots
    ink |= sx & (np.abs(ly - (-14 + 3.2 * np.sin((lx - 9) * 0.39))) < 0.45)
    for k, xd in enumerate((12, 18.5, 25, 31)):
        ink |= np.hypot(lx - xd, ly - (-14 + 3.2 * np.sin((xd - 9) * 0.39))) < 0.95
    p.fill(page & ink, P.TEAL[2])
    pen = seg(lx, ly, 42, -22, 66, -35, 2.1)
    p.fill(pen < 0, P.MINT[1])
    p.fill((pen < 0) & (ly - (-22 + (lx - 42) * (-13 / 24)) > 0.6), P.MINT[2])
    p.fill(circ(lx, ly, 42, -22, 1.6) < 0, P.METAL[3])


_SEG7 = {'3': 'abcdg', '7': 'abc', '0': 'abcdef'}


def _digit(lx, ly, cx, cy, ch, w=3.8, h=6.4, th=0.85):
    on = np.zeros(lx.shape, bool)
    off = np.zeros(lx.shape, bool)
    segs = {'a': (cx, cy + h / 2, w / 2, th / 2), 'd': (cx, cy - h / 2, w / 2, th / 2), 'g': (cx, cy, w / 2, th / 2),
            'b': (cx + w / 2, cy + h / 4, th / 2, h / 4), 'c': (cx + w / 2, cy - h / 4, th / 2, h / 4),
            'f': (cx - w / 2, cy + h / 4, th / 2, h / 4), 'e': (cx - w / 2, cy - h / 4, th / 2, h / 4)}
    for k, (sx, sy, hw, hh) in segs.items():
        m = (np.abs(lx - sx) < hw) & (np.abs(ly - sy) < hh)
        if k in _SEG7[ch]:
            on |= m
        else:
            off |= m
    return on, off


def display(p):
    lx, ly, t = p.lx, p.ly, p.t
    body = rrect(lx, ly, 0, 0, 18, 12, 2.5)
    p.fill(body < 0, P.STICK[3])
    p.fill((body < 0) & (body > -1.2) & ((lx > 15) | (ly < -9)), P.STICK[2])
    lcd = rrect(lx, ly, 0, 2.2, 14.5, 6.2, 1)
    p.fill(lcd < 0, P.TEAL[0])
    for k, ch in enumerate('370'):
        on, off = _digit(lx, ly, -9.2 + 6.4 * k + (1.0 if k == 2 else 0), 2.2, ch)
        p.fill(off & (lcd < 0), P.TEAL[2])
        p.fill(on & (lcd < 0), P.MINT[3])
    p.fill(circ(lx, ly, 0.9, -0.9, 0.55) < 0, P.MINT[3])       # the decimal point
    for bx in (-7.0, 1.0):
        p.fill(circ(lx, ly, bx, -7.6, 1.8) < 0, P.STICK[2])
    heat = (t * 1.0) % 1.0 < 0.5
    p.fill(circ(lx, ly, 10.5, -7.6, 1.3) < 0, P.AGAR[5] if heat else P.AGAR[1])


def tube_rack(p):
    lx, ly = p.lx, p.ly
    rack = rrect(lx, ly, 0, 0, 46, 13, 2)
    p.fill(rack < 0, P.STICK[2])
    p.fill(rrect(lx, ly, -0.6, 0.6, 44.8, 11.8, 1.5) < 0, P.STICK[3])
    caps = (P.MINT[2], P.AGAR[5], P.CREAM[5], P.PLASTIC[2], None, P.MINT[3])
    for k, cap in enumerate(caps):
        cx = -37.5 + 15 * k
        r = np.hypot(lx - cx, ly)
        p.fill((r < 6.6) & (r > 5.3), P.PLASTIC[3])
        if cap is None:
            p.fill(r <= 5.3, P.AGAR[3])
            p.fill(np.hypot(lx - cx + 1.6, ly - 1.6) < 1.1, P.AGAR[6])
            continue
        p.fill(r <= 5.3, cap)
        p.fill((r < 4.3) & (r > 3.5), np.clip(np.asarray(cap, int) - 28, 0, 255).astype(np.uint8))
        p.fill(np.hypot(lx - cx + 1.8, ly - 1.8) < 1.0, P.WHITE)


def stirrer(p):
    lx, ly, t = p.lx, p.ly, p.t
    body = rrect(lx, ly, 0, 0, 30, 30, 4)
    p.fill(body < 0, P.METAL[1])
    p.fill(rrect(lx, ly, 0, 2, 27, 26, 3) < 0, P.METAL[2])
    knob = circ(lx, ly, -18, -26, 3.2)
    p.fill(knob < 0, P.METAL[3])
    p.fill((knob < 0) & (np.abs(lx + 18) < 0.6) & (ly > -26), P.METAL[1])
    led = (t * 2.0) % 1.0 < 0.5
    p.fill(circ(lx, ly, 18, -26, 1.7) < 0, P.MINT[3] if led else P.MINT[0])
    r = np.hypot(lx, ly - 2)
    ang = np.arctan2(ly - 2, lx)
    p.fill(r < 21.5, P.PLASTIC[3])
    p.fill(r < 19.6, P.AGAR[4])
    k = np.clip(np.floor(r / 3.2), 0, 6).astype(int)
    m = np.array([60, 52, 44, 36, 28, 22, 16])[k]              # whole turns per 20 s for every ring of the vortex
    ph = ang - 2 * math.pi * m * t / T.TOTAL
    p.fill((r < 19.6) & (np.cos(3 * ph + 0.55 * r) > 0.82), P.AGAR[6], outline=False)
    p.fill((r < 4.2), P.AGAR[3], outline=False)
    a = 2 * math.pi * 3.0 * t                                  # the stir bar: 3 turns a second
    bar = seg(lx, ly - 2, -7 * math.cos(a), -7 * math.sin(a), 7 * math.cos(a), 7 * math.sin(a), 2.0)
    p.fill(bar < 0, P.STICK[4], outline=False)
    p.fill((bar < 0) & (bar > -0.6), P.STICK[1], outline=False)
    p.fill((r < 21.5) & (r > 19.6) & (np.abs(((ang - 2.4) + math.pi) % (2 * math.pi) - math.pi) < 0.5), P.PLASTIC[4])


def wash_bottle(p):
    lx, ly = p.lx, p.ly
    r = np.hypot(lx, ly)
    lit = np.cos(np.arctan2(ly, lx) - 2.36)
    p.fill(r < 17, P.STICK[3])
    p.fill((r < 17) & (r > 12) & (lit > 0.3), P.STICK[4])
    p.fill((r < 17) & (r > 14.5) & (lit < -0.4), P.STICK[2])
    noz = np.minimum(seg(lx, ly, 0, 0, 4, 22, 1.5), seg(lx, ly, 4, 22, 14, 27, 1.3))
    p.fill(noz < 0, P.STICK[2])
    cap = circ(lx, ly, 0, 0, 7)
    p.fill(cap < 0, P.MINT[2])
    p.fill((cap < 0) & (cap > -1.1), P.MINT[1])


def sticky(p):
    lx, ly = p.lx, p.ly
    note = rrect(lx, ly, 0, 0, 16, 16, 0.6)
    p.fill(note < 0, P.AGAR[7])
    p.fill((note < 0) & (lx + ly > 22), P.AGAR[6])
    ink = (np.abs(lx) < 11) & (np.abs(ly - 4.0 * np.sin(lx * 0.42)) < 0.45)
    for xd in (-8, -2.5, 3, 8.5):
        ink |= np.hypot(lx - xd, ly - 4.0 * math.sin(xd * 0.42)) < 1.0
    p.fill((note < 0) & ink, P.TEAL[2])


def inoc_loop(p):
    lx, ly = p.lx, p.ly
    handle = seg(lx, ly, -30, 0, -4, 0, 2.2)
    p.fill(handle < 0, P.TEAL[5])
    p.fill((handle < 0) & (ly > 0.6), P.TEAL[6])
    p.fill(seg(lx, ly, -4, 0, 22, 0, 0.55) < 0, P.METAL[3])
    p.fill(np.abs(np.hypot(lx - 25, ly) - 2.8) < 0.55, P.METAL[4])


def packet(p):
    lx, ly = p.lx, p.ly
    torn = lx > 36 + 1.2 * np.abs(((ly * 0.9) % 2.4) - 1.2)
    paper = (rrect(lx, ly, 0, 0, 40, 9, 1) < 0) & ~torn
    p.fill(paper, P.CREAM[6])
    p.fill(paper & (np.abs(((lx + ly * 0.6) % 3.2) - 1.6) < 0.55) & (lx < -22), P.TEAL[4])
    p.fill(paper & (lx > -20) & ((np.abs(ly) > 7.6) | (np.abs(lx + 20) < 0.5)), P.PLASTIC[2])
    p.fill(paper & (lx > -20) & (np.abs(ly) < 1.4) & (lx < 30), P.CREAM[5])


def marker(p):
    lx, ly = p.lx, p.ly
    body = seg(lx, ly, -28, 0, 18, 0, 4.4)
    p.fill(body < 0, P.STICK[3])
    p.fill((body < 0) & (ly > 1.2), P.STICK[4])
    p.fill((body < 0) & (ly < -2.8), P.STICK[2])
    cap = seg(lx, ly, 18, 0, 33, 0, 4.8)
    p.fill(cap < 0, P.MINT[2])
    p.fill((cap < 0) & (ly < -3.0), P.MINT[1])
    p.fill((cap < 0) & (np.abs(ly - 3.4) < 0.6) & (lx > 20) & (lx < 31), P.MINT[1])
    p.fill(circ(lx, ly, -28, 0, 3.0) < 0, P.MINT[1])


def _rr_shadow(cx, cy, hw, hh, r, h):
    return [('rr', cx, cy, hw, hh, r, h)]


# (draw, x, y, angle, top height, reach mm, shadow primitives in local coords: (kind, ..., height))
PROPS = [
    (packet, -4.0, -64.0, 0.03, 1.5, 42, [('rr', 0, 0, 40, 9, 1, 1.5)]),
    (marker, 36.0, 72.0, -0.3, 9.0, 40, [('seg', -28, 0, 33, 0, 4.6, 9.0)]),
    (tip_box, 76.0, -70.0, 0.04, 40.0, 34, [('rr', 0, 0, 25, 17, 2, 40.0), ('rr', 0, 25, 25, 10.5, 2, 6.0)]),
    (flask, 82.0, 66.0, 0.0, 90.0, 30, [('circ', 0, 0, 26, 30.0), ('cyl', 0, 0, 9, 30.0, 95.0)]),
    (burner, 122.0, 30.0, 0.0, 8.0, 116, [('circ', 0, 0, 19, 8.0), ('cyl', 0, 0, 6.5, 8.0, 100.0)]),
    (inoc_loop, 118.0, -50.0, 0.55, 4.0, 34, [('seg', -30, 0, 22, 0, 2.0, 4.0)]),
    (notebook, 168.0, -26.0, -0.1, 4.0, 70, [('rr', 0, 0, 38.8, 27, 1, 4.0)]),
    (display, 158.0, 62.0, 0.08, 22.0, 22, [('rr', 0, 0, 18, 12, 2.5, 22.0)]),
    (tube_rack, 212.0, 58.0, 0.0, 70.0, 50, [('rr', 0, 0, 46, 13, 2, 70.0)]),
    (stirrer, 234.0, -36.0, 0.0, 40.0, 36, [('rr', 0, 0, 30, 30, 4, 40.0), ('cyl', 0, 2, 21.5, 40.0, 110.0)]),
    (wash_bottle, 262.0, 62.0, 0.0, 120.0, 30, [('cyl', 0, 0, 17, 0.0, 120.0)]),
    (sticky, 270.0, -80.0, 0.18, 0.4, 20, []),
]
BURNER = next((x, y) for f, x, y, *_ in PROPS if f is burner)


def _copies(cam, x, reach):
    """Which repeats of a prop (one per bench stretch) can be on screen."""
    half = (W / 2) / cam.z + reach + 60
    n0 = math.floor((cam.xc - half - x) / T.DELTA)
    n1 = math.floor((cam.xc + half - x) / T.DELTA)
    return range(n0, n1 + 1)


def _plane_box(cam, wx, wy, h, reach):
    zp = T.Z_BENCH + h
    sx, sy = cam.px(wx, wy, zp)
    rx, ry = reach * cam.z, reach * cam.z * max(cam.s, 0.2)
    X0, X1 = max(0, int(sx - rx) - 1), min(W, int(sx + rx) + 2)
    Y0, Y1 = max(0, int(sy - ry) - 1), min(H, int(sy + ry) + 2)
    return X0, X1, Y0, Y1


def _local(cam, X0, X1, Y0, Y1, wx, wy, h, ang):
    zp = T.Z_BENCH + h
    x = cam.xc + (XX[X0:X1] - W / 2) / cam.z
    Ys = ((H / 2 - YY[Y0:Y1]) / cam.z)[:, None]
    y = cam.yc + (Ys - zp * cam.c) / cam.s
    dx, dy = x[None, :] - wx, y - wy
    ca, sa = math.cos(ang), math.sin(ang)
    return dx * ca + dy * sa, -dx * sa + dy * ca


def ground(buf, ctx):
    """Before the dishes' contents: the burner's warm light pool and every prop's shadow on the bench."""
    cam, t = ctx.cam, ctx.t % T.TOTAL
    if cam.z > 12:
        return
    fl = flick(t)
    for n in _copies(cam, BURNER[0], 70):
        wx, wy = BURNER[0] + n * T.DELTA, BURNER[1]
        X0, X1, Y0, Y1 = _plane_box(cam, wx, wy, 0.0, 62)
        if X0 >= X1 or Y0 >= Y1:
            continue
        lx, ly = _local(cam, X0, X1, Y0, Y1, wx, wy, 0.0, 0.0)
        r = np.hypot(lx, ly) / (58 * (0.96 + 0.04 * fl))
        a = 0.28 * np.clip(1 - r, 0, 1) ** 2
        m = ctx.bench[Y0:Y1, X0:X1] & (r < 1)
        sub = buf[Y0:Y1, X0:X1]
        if np.any(m):
            f = sub[m].astype(np.float32)
            sub[m] = (f + (np.asarray(P.AGAR[2], np.float32) - f) * a[m][:, None]).astype(np.uint8)
    for draw, x, y, ang, h, reach, shadows in PROPS:
        if not shadows:
            continue
        hmax = max(s[-1] for s in shadows)
        for n in _copies(cam, x, reach + hmax * 0.45):
            wx, wy = x + n * T.DELTA, y
            cx, cy = wx + SHADOW[0] * hmax * 0.5, wy + SHADOW[1] * hmax * 0.5
            X0, X1, Y0, Y1 = _plane_box(cam, cx, cy, 0.0, reach + hmax * 0.3)
            if X0 >= X1 or Y0 >= Y1:
                continue
            m = np.zeros((Y1 - Y0, X1 - X0), bool)
            for sh in shadows:
                kind, hh = sh[0], sh[-1]
                if kind == 'cyl':                              # a standing cylinder: its shadow is a long capsule
                    _, ox, oy, rad, h0, h1 = sh
                    a0x, a0y = wx + ox + SHADOW[0] * h0, wy + oy + SHADOW[1] * h0
                    a1x, a1y = wx + ox + SHADOW[0] * h1, wy + oy + SHADOW[1] * h1
                    gx, gy = _local(cam, X0, X1, Y0, Y1, 0.0, 0.0, 0.0, 0.0)
                    m |= seg(gx, gy, a0x, a0y, a1x, a1y, rad) < 0
                    continue
                lx, ly = _local(cam, X0, X1, Y0, Y1, wx + SHADOW[0] * hh, wy + SHADOW[1] * hh, 0.0, ang)
                if kind == 'rr':
                    _, cx_, cy_, hw, hh_, rr_, _ = sh
                    m |= rrect(lx, ly, cx_, cy_, hw, hh_, rr_) < 0
                elif kind == 'circ':
                    _, cx_, cy_, rad, _ = sh
                    m |= circ(lx, ly, cx_, cy_, rad) < 0
                elif kind == 'seg':
                    _, ax, ay, bx, by, rad, _ = sh
                    m |= seg(lx, ly, ax, ay, bx, by, rad) < 0
            m &= ctx.bench[Y0:Y1, X0:X1]
            blend(buf[Y0:Y1, X0:X1], m, P.TEAL[0], 0.5)


def draw(buf, ctx):
    cam, t, D = ctx.cam, ctx.t % T.TOTAL, ctx.D
    if cam.z > 12:
        return
    for fn, x, y, ang, h, reach, _ in PROPS:
        for n in _copies(cam, x, reach):
            wx, wy = x + n * T.DELTA, y
            X0, X1, Y0, Y1 = _plane_box(cam, wx, wy, h, reach)
            if X0 >= X1 or Y0 >= Y1:
                continue
            lx, ly = _local(cam, X0, X1, Y0, Y1, wx, wy, h, ang)
            pen = Pen(lx, ly, D[Y0:Y1, X0:X1], t, 1.0 / cam.z)
            fn(pen)
            m = pen.m & ctx.bench[Y0:Y1, X0:X1]
            if not np.any(m):
                continue
            core = m.copy()                                     # dark 1-px outline round the prop
            core[1:, :] &= m[:-1, :]
            core[:-1, :] &= m[1:, :]
            core[:, 1:] &= m[:, :-1]
            core[:, :-1] &= m[:, 1:]
            col = pen.col
            col[m & ~core & ~pen.no_outline] = P.OUTLINE
            buf[Y0:Y1, X0:X1][m] = col[m]


# ------------------------------------------------------------------ dust in the air
_MOTES = [(hash2(k, 1) * 320, hash2(k, 2) * 520, 0.6 + 0.8 * hash2(k, 3), hash2(k, 4)) for k in range(24)]


def motes(buf, ctx):
    cam, t, D = ctx.cam, ctx.t % T.TOTAL, ctx.D
    fade = 1 - T.S(cam.z, 4.5, 8.0)
    if fade < 0.02:
        return
    xr = cam.xc - T.ref_plate(t) * T.DELTA
    for k, (bx, by, size, ph) in enumerate(_MOTES):
        sx = (bx - 4.0 * xr + 9 * math.sin(2 * math.pi * (2 * t / T.TOTAL + ph))) % 320 - 25
        sy = (by + 4.0 * cam.yc + 7 * math.sin(2 * math.pi * (t / T.TOTAL + 2 * ph))) % 520 - 20
        tw = 0.55 + 0.45 * math.sin(2 * math.pi * ((k % 4 + 1) * t / 2.0 + ph))
        xi, yi = int(sx), int(sy)
        if not (0 <= xi < W and 0 <= yi < H) or D[yi, xi] > fade * tw:
            continue
        col = P.CREAM[7] if size > 1.0 else P.CREAM[6]
        buf[yi, xi] = col
        if size > 0.95 and xi + 1 < W and yi + 1 < H:
            buf[yi, xi + 1] = buf[yi + 1, xi] = P.CREAM[6] if size > 1.2 else P.CREAM[5]
