"""The vortex mixer, outside and inside.

Outside: a white body on rubber feet, a front panel with an RPM display, a lime speed knob and a mode switch (set to
TOUCH), and on top a black rubber cup. The cup sits on a mount that rides on an offset cam at the top of the motor
shaft, so as the shaft turns, the cup moves round a small circle (a 4 mm orbit) without spinning. Pressing a tube onto
the cup pushes it down 3 mm against two springs and closes the touch switch: the motor runs only while you press.

Inside (the x-ray): the motor with its copper windings, the shaft, the offset cam and its pin, the cup's mount plate,
the springs, the microswitch with its light, and the circuit board with the speed control.
"""
import math
import numpy as np
from . import world as Wd
from . import timeline as T
from . import pixfont
from .palette import (OUTLINE, WHITE, BODY, LIME, RUBBER, STEEL, COPPER, PCB, LCD, HUD, CYAN)

BODY_X = (-50.0, 50.0)
BODY_Y = (4.0, 66.0)
NECK_Y = (66.0, 70.0)
CUP_TOP = 86.0                      # the cup's rim (mm); its bowl dips 4 mm
CUP_BOWL = 82.0                     # where a tube's bottom rests
CAM_E = T.ORBIT_R                   # the cam's offset: the orbit radius


def cup_offset(t):
    """(ox, dz): the cup's sideways offset in this view (its orbit seen from the side) and how far it is pressed."""
    ph = 2 * math.pi * T.turns(t)
    ox = CAM_E * math.cos(ph) if T.turns(t) > 0 else CAM_E
    return ox, T.press(t)


def _f(buf, m, col):
    buf[Wd.full(m)] = col


def _rrect(c, x0, x1, y0, y1, r):
    core = Wd.rect(c, x0 + r, x1 - r, y0, y1) | Wd.rect(c, x0, x1, y0 + r, y1 - r)
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        core = core | Wd.circle(c, cx, cy, r)
    return core


def body_mask(c):
    return _rrect(c, BODY_X[0], BODY_X[1], BODY_Y[0], BODY_Y[1], 10.0)


def draw_body(buf, c, t):
    for fx in (-40.0, 40.0):                                   # rubber feet
        foot = Wd.rect(c, fx - 6, fx + 6, 0, 4.5)
        _f(buf, foot, RUBBER[1])
        buf[Wd.edge(foot)] = OUTLINE
    b = body_mask(c)
    _f(buf, b, BODY[3])
    _f(buf, b & (c.X < -42), BODY[4])
    _f(buf, b & (c.X > 43) & Wd.CHECK, BODY[2])
    _f(buf, b & (c.X > 46), BODY[2])
    _f(buf, b & (c.Y < 8), BODY[2])
    _f(buf, b & (c.Y > 62) & (c.X < 30), BODY[4])
    _f(buf, b & (c.Y > 41) & (c.Y < 44.5), LIME[1])            # the brand stripe
    _f(buf, b & (c.Y > 43.3) & (c.Y < 44.5), LIME[2])
    buf[Wd.edge(b)] = OUTLINE
    # the front panel
    pnl = _rrect(c, -40, 40, 12, 38, 3)
    _f(buf, pnl, BODY[2])
    _f(buf, pnl & (c.Y > 36.6), BODY[1])
    buf[Wd.edge(pnl)] = BODY[1]
    # the RPM display
    lcd = Wd.rect(c, -35, -5, 19, 32)
    _f(buf, lcd, LCD[0])
    _f(buf, lcd & (c.Y > 30.6), LCD[1])
    buf[Wd.edge(lcd)] = OUTLINE
    if c.s >= 1.3:
        x0, y0 = c.to(-7, 25.5)
        val = int(round(T.rpm(t) / 10.0) * 10)
        sc = 2 if c.s >= 3.4 else 1
        pixfont.draw_text(buf, '%4d' % val if val else '   0', x0, y0, LCD[2], font='3x5', anchor='rm', outline=None,
                          scale=sc)
        x1, y1 = c.to(-33.5, 31)
        if c.s >= 2.4:
            pixfont.draw_text(buf, 'RPM', x1, y1, LCD[2], font='3x5', anchor='lt', outline=None)
    # the speed knob (at the top of its range) and the mode switch (TOUCH)
    kx, ky, kr = 14.0, 25.0, 7.0
    knob = Wd.circle(c, kx, ky, kr)
    _f(buf, Wd.circle(c, kx + 0.5, ky - 0.6, kr + 0.9), BODY[1])
    _f(buf, knob, LIME[1])
    _f(buf, knob & (c.X < kx - 2) & (c.Y > ky + 1), LIME[2])
    a = math.radians(-40 if t > T.MOTOR_ON else 120)
    _f(buf, Wd.band(c, (kx, ky), (math.sin(a), math.cos(a)), 1.5, kr - 1.2, 0.8), WHITE)
    buf[Wd.edge(knob)] = OUTLINE
    sw = Wd.rect(c, 27, 35, 17, 33)
    _f(buf, sw, RUBBER[2])
    _f(buf, Wd.rect(c, 28.2, 33.8, 26.5, 31.8), BODY[4])          # the rocker, up: TOUCH
    buf[Wd.edge(sw)] = OUTLINE
    on = T.rpm(t) > 1 or T.press(t) > 1.5
    _f(buf, Wd.circle(c, 31, 14.6, 1.3), LIME[3] if on else RUBBER[2])  # the power light
    if c.s >= 3.0:
        x2, y2 = c.to(31, 35.5)
        pixfont.draw_text(buf, 'TOUCH', x2, y2, BODY[1], font='3x5', anchor='mb', outline=None)


def draw_cup(buf, c, t, ghost=True):
    """The neck and the rubber cup, at its orbit offset and press depth. At speed, faint copies at the two ends of its
    sideways travel show the blur of the orbit."""
    ox, dz = cup_offset(t)
    neck = Wd.rect(c, -15, 15, NECK_Y[0], NECK_Y[1])
    _f(buf, neck, BODY[2])
    _f(buf, neck & (c.Y > NECK_Y[1] - 1.2), BODY[1])
    buf[Wd.edge(neck)] = OUTLINE
    fast = T.rpm(t) > 400 and T.warp(t) > 0.5
    if ghost and fast:
        for gx in (-CAM_E, CAM_E):
            gm = _cup_mask(c, gx, dz)
            _f(buf, gm & Wd.CHECK, RUBBER[2])
    cm = _cup_mask(c, ox, dz)
    _f(buf, cm, RUBBER[2])
    _f(buf, cm & (c.X < ox - 8), RUBBER[3])
    _f(buf, cm & (c.X > ox + 8), RUBBER[1])
    for k in range(3):                                         # grip ribs
        yr = 73.5 + 3.2 * k - dz
        _f(buf, cm & (np.abs(c.Y - yr) < 0.45 + 0.4 / c.s), RUBBER[1])
    _f(buf, Wd.ellipse(c, ox, CUP_TOP - dz - 0.2, 11.0, 1.7), RUBBER[0])     # the bowl, seen just from above
    buf[Wd.edge(cm)] = OUTLINE


def _cup_mask(c, ox, dz):
    y0, y1 = NECK_Y[1] - dz, CUP_TOP - dz
    body = _rrect(c, -13 + ox, 13 + ox, y0, y1 + 3, 3.0) & (c.Y <= y1)
    lip = Wd.rect(c, -14 + ox, 14 + ox, y1 - 2.2, y1)
    return body | lip


def draw_cup_front(buf, c, t):
    """The cup's front wall again, over the bottom of the tube that sits in its bowl."""
    ox, dz = cup_offset(t)
    y1 = CUP_TOP - dz
    cm = _cup_mask(c, ox, dz) & (c.Y < y1 - 0.9)
    _f(buf, cm, RUBBER[2])
    _f(buf, cm & (c.X < ox - 8), RUBBER[3])
    _f(buf, cm & (c.X > ox + 8), RUBBER[1])
    _f(buf, cm & (c.Y > y1 - 2.2), RUBBER[3])
    for k in range(3):
        yr = 73.5 + 3.2 * k - dz
        _f(buf, cm & (np.abs(c.Y - yr) < 0.45 + 0.4 / c.s), RUBBER[1])
    buf[Wd.edge(_cup_mask(c, ox, dz))] = OUTLINE


def speed_lines(buf, c, t, x, y0, y1):
    """Little vibration ticks either side of something buzzing (on twos)."""
    if T.rpm(t) < 600 or T.warp(t) < 0.5:
        return
    f = math.floor(t * 15) % 2
    for side in (-1, 1):
        for k in range(3):
            yy = y0 + (y1 - y0) * (k + 0.5 * f + 0.25) / 3.5
            xx = x + side * (17.5 + 1.5 * k)
            px, py = c.to(xx, yy)
            for j in range(3):
                Wd.dot(buf, px + side * (j // 2), py - 1 + j, WHITE)


# ---------------------------------------------------------------- the x-ray
def scan_y(t):
    """Where the scan line is (mm), and whether the cutaway is showing at all."""
    if t < T.XRAY_SCAN[0] or t >= T.XRAY_CLOSE[1]:
        return None
    if t < T.XRAY_SCAN[1]:
        return T.lerp(BODY_Y[1] + 2, BODY_Y[0] - 2, T.ease_in_out(T.u_of(t, T.XRAY_SCAN), 1.6))
    if t < T.XRAY_CLOSE[0]:
        return BODY_Y[0] - 2
    return T.lerp(BODY_Y[0] - 2, BODY_Y[1] + 2, T.ease_in_out(T.u_of(t, T.XRAY_CLOSE), 1.6))


def draw_xray(buf, c, t):
    """The cutaway: everything above the scan line is shown inside. Returns anchor points for the labels."""
    sy = scan_y(t)
    if sy is None:
        return None
    b = body_mask(c)
    reveal = Wd.full(b & (c.Y > sy) & Wd.erode(b))
    if not reveal.any():
        return None
    sub = np.zeros_like(buf)
    _internals(sub, c, t)
    buf[reveal] = sub[reveal]
    line = Wd.full(b & (np.abs(c.Y - sy) < 0.55 / c.s + 0.25))
    glow = Wd.full(b & (np.abs(c.Y - sy) < 2.2 / c.s + 0.6)) & ~line
    buf[glow & Wd.CHECK] = CYAN[1]
    buf[line] = CYAN[2]
    return True


def _internals(sub, c, t):
    ox, dz = cup_offset(t)
    turns = T.turns(t)
    run = T.rpm(t) / T.RPM_MAX
    sub[:] = HUD[1]
    px = 1.0 / c.s
    gl = ((c.X % 5.0) < max(px, 0.2)) | ((c.Y % 5.0) < max(px, 0.2))     # a faint blueprint grid
    sub[Wd.full(gl)] = HUD[2]
    # the circuit board and the speed control behind the knob
    pcb = Wd.rect(c, -42, 42, 6.5, 10)
    _f(sub, pcb, PCB[1])
    for k in range(9):
        _f(sub, Wd.rect(c, -38 + 9 * k, -34 + 9 * k, 7.6, 8.4), PCB[2])
    for xx in (-30, -12, 20, 32):
        _f(sub, Wd.rect(c, xx, xx + 5, 10, 12.5), RUBBER[1])
    _f(sub, Wd.rect(c, 10, 18, 21, 29), STEEL[2])
    _f(sub, Wd.edge(Wd.rect(c, 10, 18, 21, 29)), OUTLINE)
    # wires
    for pts, col in ((((14, 21), (14, 12.5)), LIME[1]), (((25, 47), (25, 30), (36, 14), (36, 10)), LIME[1]),
                     (((-6, 12), (-6, 10)), CYAN[1]), (((6, 12), (6, 10)), CYAN[1])):
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            L = math.hypot(x1 - x0, y1 - y0)
            _f(sub, Wd.band(c, (x0, y0), ((x1 - x0) / L, (y1 - y0) / L), 0, L, 0.6), col)
    # the motor: a steel can, cut open to show the copper windings and the turning rotor
    can = Wd.rect(c, -15, 15, 12, 41)
    _f(sub, can, STEEL[1])
    win = Wd.rect(c, -12.5, 12.5, 14.5, 38.5)
    _f(sub, win, COPPER[1])
    turn_rows = (np.floor(c.Y * 1.25) % 2 == 0)
    _f(sub, win & turn_rows, COPPER[2])
    glow = 0.5 + 0.5 * math.sin(2 * math.pi * 6 * t)
    if run > 0.05:
        _f(sub, win & turn_rows & Wd.CHECK & (c.X < -4 + 8 * glow), COPPER[3])
    rotor = Wd.rect(c, -5, 5, 15.5, 37.5)
    _f(sub, rotor, STEEL[2])
    stripes = np.floor((c.X + 10 + 12 * (turns % 1.0)) / 2.5) % 2 == 0
    _f(sub, rotor & stripes, STEEL[3])
    sub[Wd.edge(can)] = OUTLINE
    sub[Wd.edge(rotor)] = OUTLINE
    # the shaft (its stripes run round as it turns), the offset cam and its pin
    shaft = Wd.rect(c, -2, 2, 41, 58)
    _f(sub, shaft, STEEL[3])
    sp = np.floor((c.Y + c.X * 0.8 + 6 * (turns % 1.0)) / 1.6) % 2 == 0
    _f(sub, shaft & sp, STEEL[2])
    sub[Wd.edge(shaft)] = OUTLINE
    cam = Wd.rect(c, -7.5, 7.5, 56.5, 60.5)
    _f(sub, cam, STEEL[2])
    _f(sub, cam & (c.Y > 59.6), STEEL[3])
    sub[Wd.edge(cam)] = OUTLINE
    pin = Wd.rect(c, ox - 1.7, ox + 1.7, 60.5, 64.5 - dz)
    _f(sub, pin, CYAN[1])
    sub[Wd.edge(pin)] = OUTLINE
    # the cup's mount plate and bearing ride on the pin; two springs hold it up
    brg = Wd.rect(c, ox - 4, ox + 4, 61.0 - dz, 64.6 - dz)
    _f(sub, brg & ~pin, STEEL[1])
    plate = Wd.rect(c, -14 + ox, 14 + ox, 64.4 - dz, 66.8 - dz)
    _f(sub, plate, STEEL[3])
    sub[Wd.edge(plate | brg)] = OUTLINE
    for sx in (-10.0, 10.0):
        y0, y1 = 41.5, 64.4 - dz
        pts = [(sx + 0.5 * ox + (2.0 if k % 2 else -2.0) * (0 < k < 10), y0 + (y1 - y0) * k / 10) for k in range(11)]
        for (x0, yy0), (x1, yy1) in zip(pts[:-1], pts[1:]):
            L = math.hypot(x1 - x0, yy1 - yy0)
            _f(sub, Wd.band(c, (x0, yy0), ((x1 - x0) / L, (yy1 - yy0) / L), 0, L, 0.55), STEEL[3])
    # the microswitch: its lever is pushed down by the plate when the tube is pressed
    swb = Wd.rect(c, 19, 31, 47, 54)
    _f(sub, swb, RUBBER[2])
    sub[Wd.edge(swb)] = OUTLINE
    tip_y = min(60.5, 64.4 - dz - 0.4)
    L = math.hypot(4.5, tip_y - 54)
    _f(sub, Wd.band(c, (20, 54), (-4.5 / L, (tip_y - 54) / L), 0, L, 0.5), STEEL[3])
    closed = dz > 1.5
    _f(sub, Wd.circle(c, 28, 50.5, 1.4), LIME[3] if closed else RUBBER[3])


def anchors(t):
    """World points the x-ray labels point at."""
    ox, dz = cup_offset(t)
    return {'motor': (-15.0, 27.0), 'switch': (25.0, 54.0), 'spring': (-10.0, 50.0), 'cam': (ox + 1.7, 62.5 - dz / 2)}
