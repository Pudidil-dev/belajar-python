"""The film, frame by frame: which world is on screen (the plate on the bench, or the agar up close), where each
camera is, how the lens joins the two, and the game layer on top. render(t) returns one finished frame."""
import math

import numpy as np

from . import fx, gfx, hud, micro as M, palette as P, plate as PL, timeline as T

W, H = gfx.W, gfx.H
CENTER = (W / 2, H / 2)
S_DIVE = 15.0              # plate camera scale when the lens starts to open (6x)
S_DEEP = 50.0              # ... when the lens is fully open (20x), and where the way back out starts
P0 = PL.REST.to(*PL.P_ZOOM)  # where the dive point sits on screen at rest
CLOCK_XY = (W // 2 - 5, 50)
LENS_R = 128.0             # the lens the close-up is seen through, centred on the canvas
BAR_Y = 392
_SPLITS = None


def warm():
    global _SPLITS
    PL.maps()
    M.setup(PL.P_DIR)
    _SPLITS = M.splits()


def _logmix(a, b, e):
    return math.exp(math.log(a) + (math.log(b) - math.log(a)) * e)


# ================================================================ cameras
def macro_cam(t):
    s, m = PL.S_REST, 0.0
    if T.ZOOM_IN[0] <= t < T.MICRO[0]:
        if t < T.LENS_OPEN[0]:
            u = T.u(t, T.ZOOM_IN)
            s, m = _logmix(PL.S_REST, S_DIVE, T.ease_in(u, 2.0)), T.smooth(u)
        else:
            s, m = _logmix(S_DIVE, S_DEEP, T.u(t, T.LENS_OPEN)), 1.0
    elif T.LENS_CLOSE[0] <= t < T.ZOOM_OUT[1]:
        if t < T.LENS_CLOSE[1]:
            s, m = _logmix(S_DEEP, S_DIVE, T.u(t, T.LENS_CLOSE)), 1.0
        else:
            u = T.u(t, T.ZOOM_OUT)
            s, m = _logmix(S_DIVE, PL.S_REST, T.ease_out(u, 2.0)), 1 - T.smooth(u)
    else:
        f, z = follow(t)
        if f is not None or z != 1.0:                               # a game camera: it leans in on the action
            dx, dy = (0.0, 0.0) if f is None else f
            return PL.Cam(PL.REST.cx + dx, PL.REST.cy + dy, PL.S_REST * z)
    px = P0[0] + (CENTER[0] - P0[0]) * m
    py = P0[1] + (CENTER[1] - P0[1]) * m
    return PL.Cam(PL.P_ZOOM[0] - (px - W / 2) / s, PL.P_ZOOM[1] - (py - H / 2) / s, s)


def _tip_avg(t, span=0.5, n=9):
    pts = [PL.swab_state(t - span * k / (n - 1)) for k in range(n)]
    pts = [p for p in pts if p is not None]
    if not pts:
        return None
    return np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts])


def follow(t):
    """Camera offset (mm) and zoom outside the dive: it follows the swab while it streaks, closer in, and pulls
    back to show the whole zigzag; it leans in on the plate during the time-lapse and snaps back on the reveal."""
    w = T.smooth((t - 1.4) / 0.9) * (1 - T.smooth((t - 6.55) / 1.0))
    if w > 0:
        tip = _tip_avg(t)
        f = None if tip is None else (0.2 * tip[0] * w, (0.22 * tip[1] + 3.0) * w)
        return f, 1 + 0.2 * w
    if T.CLOCK[0] <= t < T.REVEAL[0]:
        return (0.0, -1.5 * T.smooth((t - T.CLOCK[0]) / 4.0)), 1 + 0.16 * T.smooth((t - T.CLOCK[0] - 0.15) / 4.0)
    if T.REVEAL[0] <= t < T.REVEAL[0] + 0.6:                        # the reveal: snap back out, a little too far
        u = (t - T.REVEAL[0]) / 0.6
        e = T.back_out(u, 2.4)
        return (0.0, -1.5 * (1 - e)), 1 + 0.16 * (1 - e)
    return None, 1.0


def lens_radius(t):
    """The lens: it bursts open from the dive point (with a little overshoot), stays open for the close-up, and
    shrinks back into the point."""
    if T.LENS_OPEN[0] <= t < T.LENS_OPEN[1]:
        return 2 + (LENS_R - 2) * T.back_out(T.u(t, T.LENS_OPEN), 1.4)
    if T.MICRO[0] <= t < T.MICRO[1]:
        return LENS_R
    if T.LENS_CLOSE[0] <= t < T.LENS_CLOSE[1]:
        return 2 + (LENS_R - 2) * T.ease_in(1 - T.u(t, T.LENS_CLOSE), 1.8)
    return None


def backdrop_k(t):
    """How far the plate view has dissolved into the dark backdrop round the lens (0 plate .. 1 backdrop)."""
    if T.LENS_OPEN[0] <= t < T.MICRO[0]:
        return T.smooth((t - T.LENS_OPEN[0] - 0.1) / 0.4)
    if T.MICRO[0] <= t < T.MICRO[1]:
        return 1.0
    if T.LENS_CLOSE[0] <= t < T.LENS_CLOSE[1]:
        return 1 - T.smooth((t - T.LENS_CLOSE[0]) / 0.38)
    return 0.0


def plates(t):
    """(x offset, active) of each plate on screen. During the last bar the finished plate slides out to the left and
    the next, fresh plate slides in from the right; when it stops it is the first frame."""
    if t < T.SLIDE[0]:
        return [(0.0, True)]
    e = T.smoother(T.u(t, T.SLIDE))
    return [(-PL.GAP * e, True), (PL.GAP * (1 - e), False)]


# ================================================================ the plate on the bench
def _glint(buf, cam, ox, t):
    """A shine sweeping across the fresh dish, top left to bottom right."""
    u = T.u(t, T.GLINT)
    if not (0 < u < 1):
        return
    x0, y0, x1, y1 = PL.plate_box(cam, ox, 0.0, 0.0)
    px = np.arange(x0, x1)[None, :]
    py = np.arange(y0, y1)[:, None]
    X, Y = cam.world(px, py)
    r = np.hypot(X - ox, Y)
    k = (X - ox) * 0.75 + Y * 0.66
    c = -70 + 140 * T.smooth(u)
    m = (r < PL.R_OUT) & (((k > c - 3.2) & (k < c)) | ((k > c - 6.5) & (k < c - 5.2)))
    gfx.blend(buf, gfx.Mask(x0, y0, m), P.WHITE, 0.55)


def _reveal_back(buf, cam, t):
    """Behind the plate on the reveal: a warm glow and slowly turning gold rays."""
    a = T.smooth((t - T.REVEAL[0]) / 0.35) * (1 - T.smooth((t - T.PAN[0] - 0.1) / 0.5))
    if a <= 0:
        return
    cx, cy = cam.to(0.0, 0.0)
    fx.glow(buf, cx, cy, 175, 230, (P.BG[3], P.BG[4], P.GOLD_DIM), 0.55 + 0.45 * a)
    fx.rays(buf, cx, cy, t, n=10, col=P.GOLD_DIM, a=0.5 * a, spin=0.18, rmax=300)


def _reveal_front(buf, cam, t):
    cx, cy = cam.to(0.0, 0.0)
    fx.burst(buf, t, T.REVEAL[0], cx, cy - 20, 61, n=30, speed=(110, 220), life=0.9)
    fx.ring_wave(buf, t, T.REVEAL[0], cx, cy, 175, 0.6, P.PL[6], 1.0)
    if T.REVEAL[0] + 0.3 <= t < T.PAN[0] + 0.3:
        fx.twinkles(buf, t, cx - 125, cy - 190, cx + 125, cy + 190, 26, 62, (P.MW[8], P.PL[7], P.PL[5]),
                    a=T.smooth((t - T.REVEAL[0] - 0.3) / 0.4) * (1 - T.smooth((t - T.PAN[0]) / 0.3)),
                    avoid=lambda x, y: math.hypot(x - cx, y - cy) < PL.R_OUT * cam.s + 4)


def draw_macro(buf, t):
    cam = macro_cam(t)
    PL.draw_stage(buf, cam, t)
    if T.REVEAL[0] <= t < T.PAN[0] + 0.6:
        _reveal_back(buf, cam, t)
    sheen = (PL.LTOT + 9.0) * T.u(t, T.SHEEN) if T.SHEEN[0] <= t < T.SHEEN[1] else None
    shine = None
    if T.REVEAL[0] <= t < T.REVEAL[1] + 0.2:
        shine = (PL.LTOT + 16.0) * T.u(t, T.REVEAL)
    main_agar = None
    for ox, active in plates(t):
        agar = PL.draw_plate(buf, cam, ox, 0.0, t, active, sheen=sheen)
        if active:
            PL.draw_colonies(buf, cam, ox, 0.0, t, agar, shine=shine)
            main_agar = agar
    if t < T.GLINT[1]:
        _glint(buf, cam, 0.0, t)
    if T.SLIDE[0] <= t < T.SLIDE[1]:
        _speed_lines(buf, cam, t)
    PL.draw_swab(buf, cam, t, main_agar)
    _swab_streaks(buf, cam, t)
    if T.REVEAL[0] <= t < T.PAN[0] + 0.3:
        _reveal_front(buf, cam, t)
    return cam


def _swab_streaks(buf, cam, t):
    """Three short speed lines behind the cotton tip while it swipes fast."""
    a, b = PL.swab_state(t), PL.swab_state(t - 1 / 30)
    if a is None or b is None or a[2] > 0.3:
        return
    vx, vy = (a[0] - b[0]) * 30, (a[1] - b[1]) * 30
    sp = math.hypot(vx, vy)
    if sp < 70:
        return
    dx, dy = vx / sp, vy / sp
    nx, ny = -dy, dx
    sx, sy = cam.to(a[0], a[1])
    L = min(18.0, (sp - 70) / 110 * 16)
    for k, off in enumerate((-3.5, 0.0, 3.5)):
        x0 = sx - dx * (9 + 3 * k) + nx * off
        y0 = sy - dy * (9 + 3 * k) + ny * off
        ln = L * (0.7 if k != 1 else 1.0)
        gfx.fill(buf, gfx.line(x0, y0, x0 - dx * ln, y0 - dy * ln, 1), P.WHITE)


def _speed_lines(buf, cam, t):
    u = T.u(t, T.SLIDE)
    sp = math.sin(math.pi * u) ** 2                                  # how fast the plates move (0..1)
    if sp < 0.25:
        return
    e = T.smoother(u)
    for ox in (-PL.GAP * e, PL.GAP * (1 - e)):
        for dy, ln in ((-30.0, 22.0), (-8.0, 34.0), (16.0, 26.0), (34.0, 16.0)):
            sx, sy = cam.to(ox + math.sqrt(max(PL.R_OUT ** 2 - dy * dy, 0)) + 4.0, dy)
            L = ln * sp * cam.s * 0.5
            gfx.fill(buf, gfx.rect(sx, sy, sx + L, sy + 1), P.MW[3])


# ================================================================ up close
def draw_micro(buf, t, rad=LENS_R):
    s = M.mscale(t)
    M.draw_agar(buf, s, PL.P_DIR, t, lens=(CENTER[0], CENTER[1], rad))
    M.draw_cells(buf, s, t)
    _split_fx(buf, s, t)
    return s


def _split_fx(buf, s, t):
    """A pop for the splits you can see: a ring wave and a burst for the first rounds, a twinkle for the later."""
    if s < 4.5 or _SPLITS is None:
        return
    sp = _SPLITS
    age = t - sp[:, 0]
    sel = (age >= 0) & (age < 0.4)
    if not sel.any():
        return
    big = s >= 12
    for (ts, x, y, g, ci), a in zip(sp[sel], age[sel]):
        sx, sy = W / 2 + x * s, H / 2 + y * s
        if not (-4 <= sx < W + 4 and -4 <= sy < H + 4):
            continue
        if big and ci == 0:                                          # the hero's splits: a pop
            fx.ring_wave(buf, t, ts, sx, sy, 44, 0.35, P.MW[8])
            fx.burst(buf, t, ts, sx, sy, int(ts * 100) % 997, n=14, speed=(90, 170), life=0.4,
                     cols=(P.MW[8], P.PL[7], P.PL[5]))
        elif a < 0.24:
            if not big and ci != 0 and (int(ts * 1000) + int(ci)) % 3:
                continue
            k = a / 0.24
            hud.sparkle(buf, sx, sy, (2 if big else 1) if k < 0.4 else (1 if k < 0.75 else 0))


def _backdrop(t):
    """The dark stage round the lens during the close-up: the bench in the dark, a teal glow behind the lens."""
    b = np.zeros((H, W, 3), np.uint8)
    PL.draw_stage(b, PL.REST, t)
    fx.glow(b, CENTER[0], CENTER[1], 175, 205, (P.BG[3], P.TL[1], P.TL[2]), 0.85)
    return b


# ================================================================ the whole frame
def frame(t):
    t = t % T.TOTAL
    buf = np.zeros((H, W, 3), np.uint8)
    rad = lens_radius(t)
    k = backdrop_k(t)
    cam = None
    if k < 1.0:
        cam = draw_macro(buf, t)
    if k > 0.0:
        back = _backdrop(t)
        if k >= 1.0:
            buf[...] = back
        else:                                                        # an iris: the dark spreads out from the lens
            rb = (rad or 0.0) + 300.0 * k
            d = np.hypot(np.arange(W)[None, :] + 0.5 - CENTER[0], np.arange(H)[:, None] + 0.5 - CENTER[1])
            th = (gfx._B4[np.arange(H)[:, None] % 4, np.arange(W)[None, :] % 4] + 0.5) / 16.0
            m = d < rb - 6 + 6 * th
            buf[m] = back[m]
            edge = (d >= rb - 6 + 6 * th) & (d < rb - 5 + 6 * th)
            buf[edge] = P.TL[3]
    if rad is not None:
        mic = np.zeros_like(buf)
        draw_micro(mic, t, rad)
        px = np.arange(W)[None, :] + 0.5
        py = np.arange(H)[:, None] + 0.5
        inside = np.hypot(px - CENTER[0], py - CENTER[1]) < rad
        buf[inside] = mic[inside]
        hud.lens_rim(buf, CENTER[0], CENTER[1], rad, t, ticks=k > 0.5)
        if T.MICRO[0] - 0.1 <= t < T.LENS_CLOSE[0] + 0.3:
            _bar(buf, t)
    if cam is not None and rad is None:
        if T.CURSOR[0] <= t < T.CURSOR[1]:
            sx, sy = cam.to(*PL.P_ZOOM)
            hud.cursor(buf, sx, sy, t)
        _game_layer(buf, cam, t)
    return buf


def _bar(buf, t):
    """The division bar slides up under the lens as the close-up starts and drops away as it ends."""
    if t < T.MICRO[0] + 0.25:
        y = BAR_Y + 60 * (1 - T.back_out((t - T.MICRO[0] + 0.1) / 0.35, 1.6))
    elif t >= T.LENS_CLOSE[0]:
        y = BAR_Y + 90 * T.ease_in((t - T.LENS_CLOSE[0]) / 0.3, 2)
    else:
        y = BAR_Y
    hud.division_bar(buf, t, y=int(round(y)))


def clock_turns(t):
    a, b = T.GROW[0], T.GROW[1]
    if t <= a:
        return 0.0
    x = min(t, b) - a
    return 3.2 * x - 0.5 * 0.0 + (0.0 if t <= b else 0.6 * (1 - math.exp(-(t - b) / 0.15)))


def _game_layer(buf, cam, t):
    c0, c1 = T.CLOCK
    if c0 <= t < c1:
        if t < c0 + 0.3:
            y = CLOCK_XY[1] - 70 * (1 - T.back_out((t - c0) / 0.3, 1.5))
        elif t > c1 - 0.25:
            y = CLOCK_XY[1] - 70 * T.ease_in((t - (c1 - 0.25)) / 0.25, 2)
        else:
            y = CLOCK_XY[1]
        hud.clock(buf, CLOCK_XY[0], y, t, clock_turns(t))
    if T.REVEAL[0] <= t < T.REVEAL[1]:                               # a star rides the front of the shine
        lam = (PL.LTOT + 16.0) * T.u(t, T.REVEAL) - 3.0
        if 0 <= lam <= PL.LTOT:
            p, _ = PL.path_at(lam)
            sx, sy = cam.to(p[0], p[1])
            hud.sparkle(buf, sx, sy, 3)
    if T.TWINKLE[0] <= t < T.PAN[0] + 0.3:
        for k, f in enumerate((0.06, 0.23, 0.37, 0.52, 0.66, 0.79, 0.9, 0.97)):
            t0 = T.TWINKLE[0] + 0.125 * k
            a = (t - t0) % 0.75
            if t < t0 or a > 0.4:
                continue
            p, _ = PL.path_at(f * PL.LTOT)
            sx, sy = cam.to(p[0], p[1])
            sx += 5 * math.sin(k * 2.1)
            sy += 4 * math.cos(k * 1.3) - 1
            size = 1 + int(3 * math.sin(math.pi * a / 0.4) + 0.5)
            hud.sparkle(buf, sx, sy, min(size, 4))


def shake(t):
    """A small screen shake (canvas px) on the first split and on the reveal."""
    for t0, amp, dur in ((T.DIVISIONS[0], 2.0, 0.2), (T.REVEAL[0], 1.5, 0.16)):
        if t0 <= t < t0 + dur:
            k = (t - t0) / dur
            a = amp * (1 - k)
            return round(a * math.sin(2 * math.pi * 2.5 * k + 0.6)), round(0.6 * a * math.cos(2 * math.pi * 2.5 * k))
    return 0, 0


def render(t, fps=30, scale=4):
    t = t % T.TOTAL
    sx, sy = shake(t)
    if sx or sy:
        return gfx.camera(frame(t), 1.0, W / 2 - sx, H / 2 - sy, scale)
    return gfx.upscale(frame(t), scale)
