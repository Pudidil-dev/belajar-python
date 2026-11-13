"""The handheld vibrating-mesh nebulizer, outside and cut open. One geometry serves both views, so the cutaway lines
up with the exterior part for part: reservoir on the left, mesh in the middle, outlet on the right.

Parts (mm, mesh dome apex at the origin, outlet axis y = 0):
  handle      x -19..3,   y 8..92     light-gray body with grip ribs, power button, battery inside
  head        x -8..5.5,  y -13.5..12.5   houses the piezo ring, the washer and the mesh
  cup         x -27..-8,  y -17..9    transparent medicine cup (the liquid touches the mesh through the ring)
  lid         x -28..-6,  y -22..-17  hinged lid
  outlet      x 5.5..18,  r 9.5       short outlet, its rim plugs into the mask port
Inside (cutaway): piezo ring x -1.6..-0.35 (|y| 4.6..8.8), washer x -0.35..-0.05 (|y| 4.3..10), mesh dome |y| < 4.3,
drive board y 14..30, AA cell y 33..83, two wires from the board to the piezo electrodes.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import (sd_box, sd_circle, sd_ellipse, sd_capsule, put, tones, mix, dither_mask, lit)

HANDLE = (-19.0, 8.0, 3.0, 92.0)
HEADB = (-8.0, -13.5, 5.5, 12.5)
CUP = (-27.0, -17.0, -8.0, 9.0)
LID = (-28.0, -22.0, -6.0, -17.0)
OUT_X0, OUT_X1, OUT_R, OUT_RI = 5.5, 18.0, 9.5, 8.0
RIM_X0, RIM_R = 16.4, 10.3
MOUTH_RX = 2.3                     # half-width of the outlet's open end seen slightly from the side
LIQ = -6.0                         # liquid level in the cup
WALL = 1.5                         # housing wall thickness (cut faces)
CUPWALL = 1.1
PZ = (-1.6, -0.35, 4.6, 8.8)       # piezo ring section: x0, x1, |y| inner, |y| outer
WASH = (-0.35, -0.05, 4.3, 10.0)
MESH_R = 4.3                       # mesh dome radius (|y|)
DOME = 0.26                        # dome depth (mm, exaggerated)
CHAN = (-8.0, -1.6, 4.4)           # liquid channel from the cup to the mesh: x0, x1, half-height
BOARD = (-15.5, 14.0, 0.0, 30.0)
CELL = (-15.0, 33.5, -2.0, 83.0)


def dome_x(y):
    """x of the mesh centre line at height y (the dome bulges toward the outlet; apex at x = 0)."""
    return -DOME * (np.asarray(y) / MESH_R) ** 2


def _grad(d, z):
    gy, gx = np.gradient(d, 1.0 / z)
    n = np.sqrt(gx * gx + gy * gy) + 1e-6
    return gx / n, gy / n


def _shade_solid(buf, view, bx, X, Y, d, ramp, R, base=0.0, amp=1.0, extra=None, outline=None):
    sel = d < 0
    if not sel.any():
        return sel
    gx, gy = _grad(d, view.z)
    v = base + amp * lit(gx, gy, d, R)
    if extra is not None:
        v = v + extra
    put(buf, bx, sel, tones(ramp, np.clip(v, 0, 1), bx))
    put(buf, bx, sel & (d > -1.0 / view.z), ramp[0] if outline is None else outline)
    return sel


def _cyl_y(Y, cy, r):
    """Lighting across a horizontal cylinder (key light from above-left)."""
    ny = np.clip((Y - cy) / r, -1, 1)
    nz = np.sqrt(np.maximum(1 - ny * ny, 0))
    return np.clip(0.62 * nz - 0.55 * ny * 0.9 + 0.12, 0, 1)


# ------------------------------------------------------------------ exterior
def draw_body(buf, view, t):
    """Handle, head housing, lid and outlet: the light-gray body."""
    z = view.z
    bx = view.box(-31, -25, 20, 95)
    if bx is None:
        return
    X, Y = view.grid(bx)
    o = 1.0 / z
    # handle with a slight waist, rounded bottom
    waist = 0.9 * np.exp(-((Y - 58) / 22) ** 2)
    dh = sd_box(X, Y, HANDLE[0] + waist, HANDLE[1], HANDLE[2] - waist * 0.6, HANDLE[3], 6.5)
    vgrad = -0.12 * np.clip((Y - 20) / 70, 0, 1)
    _shade_solid(buf, view, bx, X, Y, dh, P.GR, 9.0, 0.08, 0.86, vgrad)
    sel = dh < 0
    # grip ribs on the back, seam lines, the button and the battery lights
    grip = sel & (X < HANDLE[0] + waist + 5.0) & (Y > 32) & (Y < 84) & (dh < -0.6)
    put(buf, bx, grip, tones(P.GR, np.clip(0.3 + 0.12 * (X - HANDLE[0] - waist) / 5.0, 0, 1), bx))
    rib = grip & (np.abs(((Y - 32) % 3.2) - 1.6) < 0.4 * o + 0.12)
    put(buf, bx, rib, P.GR[1])
    put(buf, bx, sel & (np.abs(Y - 28.5) < 0.5 * o + 0.18) & (X > HANDLE[0] + 1), P.GR[4])
    put(buf, bx, sel & (np.abs(Y - 29.3) < 0.4 * o + 0.1) & (X > HANDLE[0] + 1), P.GR[7])
    btn = sd_circle(X, Y, -6.2, 20.4, 3.3)
    put(buf, bx, btn < 0, tones(P.GR, np.clip(0.55 - 0.18 * (Y - 20.4) / 3.3 - 0.1 * (X + 6.2) / 3.3, 0, 1), bx))
    put(buf, bx, (btn < 0) & (btn > -1.0 * o), P.GR[2])
    led_on = 0.75 + 0.25 * math.sin(t * 2 * math.pi * 0.5)
    ring = (btn > 0.3) & (btn < 0.3 + max(0.75, 1.1 * o))
    put(buf, bx, ring, P.CY[6] if led_on > 0.6 else P.CY[5])
    put(buf, bx, (sd_circle(X, Y, -6.2, 20.4, 1.1) < 0), P.GR[8])
    for k in range(3):
        dot = sd_circle(X, Y, -9.0 + 2.8 * k, 26.0, 0.65)
        put(buf, bx, dot < 0, P.CY[7] if k < 2 else P.CY[3])
    # head housing (around the mesh) and the mesh-cap ring
    dhead = sd_box(X, Y, *HEADB, 4.0)
    _shade_solid(buf, view, bx, X, Y, dhead, P.GR, 6.0, 0.16, 0.82)
    hsel = dhead < 0
    capr = hsel & (np.abs(X - 0.2) < 1.35) & (dhead < -0.5)
    put(buf, bx, capr, tones(P.MT, np.clip(0.55 - 0.3 * Y / 13 + 0.25 * (np.abs(X - 0.2) < 0.45), 0, 1), bx))
    put(buf, bx, hsel & (np.abs(np.abs(X - 0.2) - 1.35) < 0.45 * o + 0.1) & (dhead < -0.5), P.GR[2])
    put(buf, bx, hsel & (np.abs(Y - 9.6) < 0.5 * o + 0.15) & (X < -1.5) & (dhead < -0.4), P.GR[4])
    # outlet tube and its rim
    dout = np.maximum(sd_box(X, Y, OUT_X0 - 3, -OUT_R, OUT_X1, OUT_R, 0.0), -sd_box(X, Y, -40, -40, OUT_X0 - 3, 40))
    osel = (dout < 0) & (X > OUT_X0 - 3)
    put(buf, bx, osel, tones(P.GR, _cyl_y(Y, 0.0, OUT_R) * 0.86 + 0.1, bx))
    put(buf, bx, osel & (np.abs(np.abs(Y) - OUT_R) < 1.0 * o + 0.02), P.GR[1])
    drim = sd_box(X, Y, RIM_X0, -RIM_R, OUT_X1, RIM_R, 0.6)
    rsel = drim < 0
    put(buf, bx, rsel, tones(P.GR, np.clip(_cyl_y(Y, 0.0, RIM_R) * 0.8 + 0.06 - 0.1 * (X > OUT_X1 - 0.6), 0, 1), bx))
    put(buf, bx, rsel & (drim > -1.0 * o), P.GR[1])
    put(buf, bx, rsel & (np.abs(X - (RIM_X0 + 0.55)) < 0.4 * o + 0.1) & (drim < -0.4), P.GR[8])
    # lid with its hinge and latch
    dlid = sd_box(X, Y, *LID, 2.0)
    _shade_solid(buf, view, bx, X, Y, dlid, P.GR, 3.0, 0.2, 0.8)
    hinge = sd_circle(X, Y, -6.6, -19.4, 2.4)
    _shade_solid(buf, view, bx, X, Y, hinge, P.GR, 2.4, 0.1, 0.8)
    latch = sd_box(X, Y, -29.8, -21.2, -27.4, -15.2, 0.7)
    _shade_solid(buf, view, bx, X, Y, latch, P.GR, 1.0, 0.05, 0.7)


def draw_cup(buf, view, t):
    """The transparent medicine cup and the liquid in it (drawn over the body)."""
    z = view.z
    bx = view.box(CUP[0] - 1, CUP[1] - 1, CUP[2] + 1, CUP[3] + 1)
    if bx is None:
        return
    X, Y = view.grid(bx)
    o = 1.0 / z
    dc = sd_box(X, Y, CUP[0], CUP[1] - 3, CUP[2] + 3, CUP[3], 5.5)
    dc = np.maximum(dc, -sd_box(X, Y, CUP[2], -30, 40, 30))           # the right side tucks into the head housing
    dc = np.maximum(dc, CUP[1] - Y)                                    # flat top under the lid
    inside = dc < 0
    # plastic tint over whatever is behind
    mix(buf, bx, inside, P.CY[8], 0.10)
    # the liquid with a meniscus line and a light sway from the vibration
    sway = 0.25 * math.sin(t * 2 * math.pi * 0.7) * (X - (CUP[0] + CUP[2]) / 2) / 10
    lvl = LIQ + sway + 0.06 * np.sin(X * 3.1 + t * 30)
    liq = inside & (Y > lvl) & (dc < -CUPWALL)
    depth = np.clip((Y - lvl) / 15, 0, 1)
    v = 0.66 - 0.36 * depth + 0.12 * np.exp(-((X - CUP[0] - 4) / 3) ** 2)
    put(buf, bx, liq, tones(P.CY, np.clip(v, 0, 1), bx))
    put(buf, bx, liq & (np.abs(Y - lvl) < 0.7 * o + 0.18), P.CY[8])
    # wall, highlight streaks, graduation ticks
    wall = inside & (dc > -CUPWALL)
    mix(buf, bx, wall, P.CY[9], 0.28)
    put(buf, bx, inside & (dc > -0.8 * o), P.CY[7])
    streak = inside & (np.abs(X - (CUP[0] + 2.6)) < 0.45 * o + 0.25) & (Y > CUP[1] + 3) & (Y < CUP[3] - 4)
    put(buf, bx, streak, P.CY[9])
    for k in range(5):
        ty = -11.0 + 4.0 * k
        tick = (np.abs(Y - ty) < 0.35 * o + 0.12) & (X > CUP[2] - 4.4 + (1.6 if k % 2 else 0)) & (X < CUP[2] - 1.4)
        put(buf, bx, inside & tick, P.CY[8])


def draw_outlet_mouth(buf, view, t):
    """The open end of the outlet inside the transparent port (a dark opening seen slightly from the side)."""
    bx = view.box(OUT_X1 - MOUTH_RX - 1, -OUT_RI - 1, OUT_X1 + MOUTH_RX + 1, OUT_RI + 1)
    if bx is None:
        return
    X, Y = view.grid(bx)
    dm = sd_ellipse(X, Y, OUT_X1, 0.0, MOUTH_RX, OUT_RI)
    sel = dm < 0
    put(buf, bx, sel, tones(P.NV, np.clip(0.35 + 0.25 * (Y / OUT_RI), 0, 1), bx))
    put(buf, bx, sel & (dm > -1.2 / view.z), P.GR[7])


# ------------------------------------------------------------------ cutaway
def _hatch(view, bx, step=4):
    """Section hatching anchored to the world (diagonal lines every `step` canvas px)."""
    i0, j0, i1, j1 = bx
    ii = np.arange(i0, i1)[None, :] - int(round(view.ox))
    jj = np.arange(j0, j1)[:, None] - int(round(view.oy))
    return ((ii + jj) % step) == 0


def drive(t):
    """Drive level 0..1 of the piezo (it buzzes continuously; the glow pulses in 16ths with the music)."""
    beat = (t / (T.BEAT / 4)) % 1.0
    return 0.75 + 0.25 * math.exp(-beat * 5)


def buzz(t, fps=30):
    """Visible mesh offset (mm) and smear at the mechanism zoom: the real ~130 kHz is far above any frame rate, so
    it is drawn the way games draw a buzz: a two-frame jitter plus a motion smear."""
    k = int(round(t * fps))
    return (0.30 if k % 2 == 0 else -0.30) * drive(t)


def draw_cutaway(buf, view, t, fps=30):
    """The nebulizer cut along its middle: hatched cut faces, the liquid, the piezo ring, the mesh, the board."""
    z = view.z
    o = 1.0 / z
    bx = view.box(-31, -25, 22, 95)
    if bx is None:
        return
    X, Y = view.grid(bx)
    hat = _hatch(view, bx)
    # ---- housing section (cut faces of the shell), interior cavities behind
    dh = sd_box(X, Y, HANDLE[0], HANDLE[1], HANDLE[2], HANDLE[3], 6.5)
    dhead = sd_box(X, Y, *HEADB, 4.0)
    dout = sd_box(X, Y, OUT_X0 - 3, -OUT_R, OUT_X1, OUT_R, 0.0)
    dshell = np.minimum(np.minimum(dh, dhead), dout)
    din_h = sd_box(X, Y, HANDLE[0] + WALL, HANDLE[1] - 4, HANDLE[2] - WALL, HANDLE[3] - WALL, 5.0)
    din_head = sd_box(X, Y, HEADB[0] + WALL, HEADB[1] + WALL, HEADB[2] - WALL, HEADB[3] - WALL, 2.5)
    din_out = sd_box(X, Y, -1.0, -OUT_RI, OUT_X1 + 1, OUT_RI, 0.0)
    dcav = np.minimum(np.minimum(din_h, din_head), din_out)
    shell = (dshell < 0) & (dcav > 0)
    cav = (dshell < 0) & (dcav <= 0)
    # cavity: dark interior with a soft light falling from the open outlet side
    cv = 0.22 + 0.2 * np.clip((X + 10) / 30, 0, 1) - 0.1 * np.clip((Y - 20) / 60, 0, 1)
    put(buf, bx, cav, tones(P.NV, np.clip(cv + 0.25, 0, 1), bx))
    face = tones(P.GR, np.clip(0.62 + 0.18 * np.clip(-Y / 60, -1, 1), 0, 1), bx)
    put(buf, bx, shell, face)
    put(buf, bx, shell & hat, P.GR[4])
    put(buf, bx, (dshell < 0) & (dshell > -o), P.GR[2])
    put(buf, bx, shell & (dcav > 0) & (dcav < o), P.GR[3])
    # outlet rim section
    drim = sd_box(X, Y, RIM_X0, -RIM_R, OUT_X1, RIM_R, 0.6)
    rimsec = (drim < 0) & (np.abs(Y) > OUT_RI)
    put(buf, bx, rimsec, tones(P.GR, np.full(rimsec.shape, 0.78), bx))
    put(buf, bx, rimsec & hat, P.GR[4])
    put(buf, bx, rimsec & (drim > -o), P.GR[2])
    # ---- lid and cup section, liquid
    dlid = sd_box(X, Y, *LID, 2.0)
    lsel = dlid < 0
    put(buf, bx, lsel, tones(P.GR, np.full(lsel.shape, 0.7), bx))
    put(buf, bx, lsel & hat, P.GR[4])
    put(buf, bx, lsel & (dlid > -o), P.GR[2])
    hinge = sd_circle(X, Y, -6.6, -19.4, 2.4)
    put(buf, bx, hinge < 0, tones(P.GR, np.full(hinge.shape, 0.55), bx))
    put(buf, bx, (hinge < 0) & (hinge > -o), P.GR[2])
    dc = sd_box(X, Y, CUP[0], CUP[1] - 3, CUP[2] + 3, CUP[3], 5.5)
    dc = np.maximum(dc, -sd_box(X, Y, CUP[2], -30, 40, 30))
    dc = np.maximum(dc, CUP[1] - Y)
    cup_in = dc < -CUPWALL
    cup_wall = (dc < 0) & ~cup_in
    put(buf, bx, cup_wall, tones(P.CY, np.full(cup_wall.shape, 0.8), bx))
    put(buf, bx, cup_wall & hat, P.CY[6])
    air = cup_in & (Y < LIQ)
    put(buf, bx, air, tones(P.NV, np.full(air.shape, 0.55), bx))
    # liquid: cup + channel through the piezo ring to the mesh (left face of the dome)
    ch = (X > CHAN[0] - 0.5) & (X < dome_x(Y) - 0.03) & (np.abs(Y) < CHAN[2])
    wave = 0.12 * np.sin(X * 2.3 - t * 9) + 0.06 * np.sin(X * 5.1 + t * 13)
    liq = (cup_in & (Y >= LIQ + wave)) | ch
    depth = np.clip((Y - LIQ) / 16, 0, 1)
    lv = 0.62 - 0.3 * depth + 0.1 * np.clip((X + 4) / 4, 0, 1) * (np.abs(Y) < CHAN[2])
    put(buf, bx, liq, tones(P.CY, np.clip(lv, 0, 1), bx))
    put(buf, bx, cup_in & (np.abs(Y - LIQ - wave) < 0.7 * o + 0.15), P.CY[8])
    # ---- piezo ring (two blocks in section), electrodes, washer
    dr = drive(t)
    sq = 0.17 * dr * (1 if int(round(t * fps)) % 2 == 0 else -1)       # the ceramic breathes with the buzz
    for s in (-1, 1):
        y0, y1 = (PZ[2] - sq, PZ[3] + sq) if s > 0 else (-PZ[3] - sq, -PZ[2] + sq)
        dp = sd_box(X, Y, PZ[0] - abs(sq) * 0.5, y0, PZ[1], y1, 0.25)
        psel = dp < 0
        pv = 0.45 + 0.35 * dr + 0.1 * np.sin((Y - y0) * 4.0) * 0
        put(buf, bx, psel, tones(P.AM, np.clip(pv - 0.15 * np.abs(Y - (y0 + y1) / 2) / 2.2, 0, 1), bx))
        put(buf, bx, psel & (dp > -o), P.AM[2])
        for ex in (PZ[0], PZ[1]):
            el = psel & (np.abs(X - ex) < max(0.12, 0.7 * o))
            put(buf, bx, el, P.MT[7])
    for s in (-1, 1):
        y0, y1 = (WASH[2], WASH[3]) if s > 0 else (-WASH[3], -WASH[2])
        dw = sd_box(X, Y, WASH[0], y0, WASH[1], y1, 0.05)
        put(buf, bx, dw < 0, tones(P.MT, np.full(dw.shape, 0.7), bx))
        put(buf, bx, (dw < 0) & (dw > -o), P.MT[2])
        # O-ring seals
        oring = sd_circle(X, Y, -3.0, s * 9.8, 0.95)
        put(buf, bx, oring < 0, tones(P.NV, np.full(oring.shape, 0.2), bx))
        put(buf, bx, (oring < 0) & (oring > -o), P.NV[0])
    # ---- the mesh dome (LOD: a bright line at this zoom; the micro view takes over when it is thick enough)
    if z < 900:
        off = buzz(t, fps) * np.clip(1 - (Y / MESH_R) ** 2, 0, 1) * np.clip(1 - (z - 20) / 160, 0, 1)
        thick = max(0.05, 1.6 * o)
        mx = dome_x(Y) + off
        mesh = (np.abs(X - mx) < thick / 2 + 0.5 * o) & (np.abs(Y) < MESH_R + 0.1)
        smear = (np.abs(X - dome_x(Y)) < 0.32 + 1.5 * o) & (np.abs(Y) < MESH_R) & ~mesh & \
            (np.abs(X - dome_x(Y)) > thick)
        mix(buf, bx, smear, P.MT[7], 0.28 * np.clip(1 - (z - 20) / 160, 0, 1))
        holes = (np.floor((Y + 100) * z / 2.0) % 2 == 0) if z < 40 else (np.abs(((Y + 0.035) % T.PITCH) - 0.035)
                                                                           < 0.0045 + 0.5 * o)
        put(buf, bx, mesh, P.MT[8])
        put(buf, bx, mesh & holes & (np.abs(Y) < MESH_R - 0.6), P.MT[4])
        if z < 30:
            # comic-style buzz ticks: short arcs on the spray side, flickering with the drive
            on = int(round(t * fps)) % 2 == 0
            for s_ in ((1.0,) if on else (1.0, 1.9)):
                arc = np.abs(np.hypot((X - dome_x(Y) + 3.0) / (3.0 + s_), Y / (MESH_R * 0.95)) - 1.0) < 0.9 * o / 3
                put(buf, bx, arc & (np.abs(Y) < MESH_R * 0.7) & (X > 0.3), P.MI[6] if s_ < 1.5 else P.MI[4])
    # ---- the drive board, the battery and the two wires
    dbrd = sd_box(X, Y, *BOARD, 0.6)
    bsel = dbrd < 0
    put(buf, bx, bsel, tones(P.PC, np.clip(0.45 + 0.2 * np.sin(X * 1.7) * 0 + 0.1 * (Y < 18), 0, 1), bx))
    put(buf, bx, bsel & (np.abs(((X + 30) % 3.0) - 1.5) < 0.18 + 0.4 * o) & (Y > 26), P.PC[6])
    chip = sd_box(X, Y, -11.5, 17.5, -5.0, 24.5, 0.4)
    put(buf, bx, chip < 0, tones(P.NV, np.full(chip.shape, 0.15), bx))
    for k in range(4):
        pin = (np.abs(X - (-10.6 + 1.7 * k)) < 0.35 + 0.3 * o) & (np.abs(Y - 16.9) < 0.6) | \
            (np.abs(X - (-10.6 + 1.7 * k)) < 0.35 + 0.3 * o) & (np.abs(Y - 25.1) < 0.6)
        put(buf, bx, pin, P.MT[6])
    pulse = drive(t)
    put(buf, bx, sd_circle(X, Y, -7.0, 21.0, 0.9) < 0, P.AM[6] if pulse > 0.9 else P.AM[4])
    coil = sd_box(X, Y, -3.8, 16.0, -1.0, 21.5, 0.8)
    put(buf, bx, coil < 0, tones(P.AM, 0.35 + 0.25 * (np.floor(Y * 2.2) % 2), bx))
    put(buf, bx, (coil < 0) & (coil > -o), P.AM[1])
    cap = sd_box(X, Y, -14.2, 25.8, -11.4, 28.6, 0.4)
    put(buf, bx, cap < 0, tones(P.MT, np.full(cap.shape, 0.6), bx))
    dcell = sd_box(X, Y, *CELL, 1.5)
    csel = dcell < 0
    cv_ = _cyl_x(X, (CELL[0] + CELL[2]) / 2, (CELL[2] - CELL[0]) / 2)
    put(buf, bx, csel, tones(P.SH, np.clip(cv_ * 0.9 + 0.05, 0, 1), bx))
    band = csel & (Y > 70) & (Y < 76)
    put(buf, bx, band, tones(P.AM, np.clip(cv_ * 0.8 + 0.1, 0, 1), bx))
    term = sd_box(X, Y, -10.5, 31.6, -6.5, 33.8, 0.4)
    put(buf, bx, term < 0, P.MT[6])
    put(buf, bx, csel & (dcell > -o), P.SH[0])
    # wires: from the board up to the piezo electrodes; charge pulses run along them
    for k, (col, xs) in enumerate(((P.RED, (-2.0, -1.6, -1.2)), (P.WIRE_DARK, (-0.4, 0.1, -0.3)))):
        pts = [(xs[0], 14.2), (xs[1], 12.0), (xs[2], 10.2), (PZ[0] + 0.3 + 0.9 * k, PZ[3] - 0.2)]
        wd = np.full(X.shape if X.shape == Y.shape else np.broadcast(X, Y).shape, np.inf)
        for a, b in zip(pts[:-1], pts[1:]):
            wd = np.minimum(wd, sd_capsule(X, Y, a[0], a[1], b[0], b[1], 0.0))
        put(buf, bx, wd < 0.18 + 0.5 * o, col[3])
        put(buf, bx, wd < 0.08 + 0.25 * o, col[4] if len(col) > 4 else col[3])
        # drive pulses: bright amber dots running up the wire to the ceramic, one per 16th note
        seg_t = ((t / (T.BEAT / 4)) + 0.5 * k) % 1.0
        q = seg_t * 3.0
        i = min(int(q), 2)
        ax_, ay_ = pts[i]
        bx2, by2 = pts[i + 1]
        fx_, fy_ = ax_ + (bx2 - ax_) * (q - i), ay_ + (by2 - ay_) * (q - i)
        zap = sd_circle(X, Y, fx_, fy_, 0.35 + 0.9 * o)
        put(buf, bx, zap < 0, P.AM[8])


def _cyl_x(X, cx, r):
    nx = np.clip((X - cx) / r, -1, 1)
    nz = np.sqrt(np.maximum(1 - nx * nx, 0))
    return np.clip(0.6 * nz - 0.5 * nx * 0.8 + 0.15, 0, 1)
