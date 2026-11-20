"""The surgical light: its suspension (ceiling mount, central axis, extension arm, spring arm, yoke), its head (outside,
and in x-ray: LED modules each with its own lens, the circuit boards, the heat-sink fins, the sensors, the sterile
handle with a camera inside), and its light.

The light is drawn as light: every LED module sends a beam that covers the whole light field, all aimed at one spot
on the patient, so the beams overlap there into one bright pool (the light field). In the air the beams show as a
faint glow that gets brighter where they cross; on the field the pool lights whatever is in it (the prepped skin,
the gloves, the drape). A head in the way cuts off the beams it is in front of, and only those: the pool loses a
little light but no hard shadow falls (that is what "shadow-free" means). The sensors at the rim can then shift the
power from the blocked LEDs to the others.
"""
import math
from types import SimpleNamespace
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import room as RM
from .palette import (OUTLINE, WHITE, STEEL, SHELL, LED, LENS, PCB, CHIP, SENSOR, HEAT, XRAY, SPRING, GLOVE, GOWN,
                      MASK, light_rgb)

W, H = gfx.W, gfx.H
BAYER = gfx.BAYER[:H, :W]

CEIL_MOUNT = (60.0, 300.0)
AXIS_LOW = 266.0
J1 = (-6.0, 266.0)                       # the end of the extension arm: the spring arm's top joint
ARM_L = 44.0
LAMP_X = 15.0
A0 = -math.degrees(math.acos((LAMP_X - J1[0]) / ARM_L))
YOKE = 15.3
R = 35.0                                 # half the head's width
F_DIST = 92.0                            # from the head's centre to the light field
LED_X = tuple(-30.0 + 60.0 * i / (T.LED_N - 1) for i in range(T.LED_N))
SENSOR_U = (-31.5, 31.5)


# ---------------------------------------------------------------- where everything is
def pose(t):
    """The spring arm's angle, its lower joint, the head's centre and tilt."""
    k = T.arm(t)
    a = math.radians(A0 + T.ARM_SWING * k)
    j2 = (J1[0] + ARM_L * math.cos(a), J1[1] + ARM_L * math.sin(a))
    tilt = -7.0 * k
    return a, j2, (j2[0], j2[1] - YOKE), tilt


def to_world(u, v, hc, tilt):
    a = math.radians(tilt)
    return hc[0] + u * math.cos(a) - v * math.sin(a), hc[1] + u * math.sin(a) + v * math.cos(a)


def focus(t):
    """The centre of the light field (where every beam is aimed)."""
    _, _, hc, tilt = pose(t)
    fx, _ = to_world(0.0, -F_DIST, hc, tilt)
    return fx, RM.FIELD_Y + 1.0


def bottom(u):
    return -6.0 + 2.5 * (np.asarray(u, np.float64) / R) ** 2


def top(u):
    return 2.0 + 8.0 * np.sqrt(np.clip(1.0 - (np.asarray(u, np.float64) / R) ** 2, 0.0, 1.0))


def local(c, t):
    """The head's own coordinates (u across, v up) for every canvas pixel."""
    _, _, hc, tilt = pose(t)
    rc = Wd.Rotate(c, hc[0], hc[1], tilt)
    U, V = np.broadcast_arrays(rc.X - hc[0], rc.Y - hc[1])
    return SimpleNamespace(X=U, Y=V)


def led_aim(i):
    """LED i's position (local) and the unit vector it points along (at the field centre)."""
    x = LED_X[i]
    y = float(bottom(x)) + 1.2
    dx, dy = -x, -F_DIST - y
    n = math.hypot(dx, dy)
    return (x, y), (dx / n, dy / n)


def lens_pos(i, t):
    (x, y), d = led_aim(i)
    off = T.lens_off(t)
    return x + d[0] * (2.6 - off), y + d[1] * (2.6 - off)


def light_col(t):
    return light_rgb(T.cct(t))


# ---------------------------------------------------------------- the light
def blocker(t):
    hx, hy, r = RM.head_pos('A', t)
    return hx, hy, r - 0.5


def beams(t):
    """For every LED: (start, unit direction, length to the field, length until blocked, intensity)."""
    _, _, hc, tilt = pose(t)
    F = focus(t)
    hx, hy, hr = blocker(t)
    base = T.intensity(t)
    out = []
    for i in range(T.LED_N):
        lx, ly = lens_pos(i, t)
        px, py = to_world(lx, ly, hc, tilt)
        dx, dy = F[0] - px, F[1] - py
        L = math.hypot(dx, dy)
        d = (dx / L, dy / L)
        bx, by = px - hx, py - hy
        b = bx * d[0] + by * d[1]
        cc = bx * bx + by * by - hr * hr
        disc = b * b - cc
        cut = L
        if disc > 0:
            s1 = -b - math.sqrt(disc)
            if 0.0 < s1 < L:
                cut = s1
        out.append([(px, py), d, L, cut, base * T.led_on(i, t)])
    # the sensors shift power from the blocked LEDs to the others
    k = T.shift(t)
    if k > 0:
        tot = sum(o[4] for o in out)
        free = sum(o[4] for o in out if o[3] >= o[2])
        g = min(1.7, tot / max(free, 1e-6))
        for o in out:
            o[4] *= (1.0 + (g - 1.0) * k) if o[3] >= o[2] else (1.0 - 0.78 * k)
    return out


def pool(t, bl=None):
    """How much light reaches the field (1 = all LEDs at normal brightness)."""
    bl = bl if bl is not None else beams(t)
    return sum(o[4] for o in bl if o[3] >= o[2]) / (T.LED_N * T.BASE_I)


def blend(buf, m, col, a):
    """Lighten towards col by a (0..1), quantised with the ordered dither."""
    if a <= 0:
        return
    sel = m & (BAYER < a)
    buf[sel] = col


def draw_light(buf, c, t):
    """The beams in the air (a glow that builds where they overlap, and a brighter core along every ray) and the pool
    of light on the field."""
    bl = beams(t)
    col = light_col(t)
    fw = T.field_d(t) / 2.0
    acc = np.zeros((H, W), np.float32)
    core = np.zeros((H, W), np.float32)
    for (px, py), d, L, cut, inten in bl:
        if inten <= 0.01:
            continue
        m = Wd.full(Wd.band(c, (px, py), d, 0.0, cut, 1.3, 1.3 + (fw - 1.3) * cut / L))
        acc += m.astype(np.float32) * inten
        ray = Wd.full(Wd.band(c, (px, py), d, 0.0, cut, max(0.55, 0.7 / c.s), 0.55 + 2.0 * cut / L))
        core = np.maximum(core, ray.astype(np.float32) * inten)
    a = np.clip(acc * 0.07 + core * 0.46, 0.0, 0.85)
    lvl = np.floor(a * 6.0 + BAYER) / 6.0                # an ordered-dither glow, 6 levels
    glow = lvl > 0
    mix = lvl[..., None]
    lit = buf.astype(np.float32) * (1 - mix) + np.array(col, np.float32) * mix
    buf[glow] = lit[glow].astype(np.uint8)
    # the pool on the field
    F = focus(t)
    E = pool(t, bl)
    X, Y = np.broadcast_arrays(c.X, c.Y)
    g = np.exp(-((X - F[0]) / (fw + 2.5)) ** 2 - ((Y - F[1] - 2.0) / 7.5) ** 2)
    s = np.clip(g * E * 0.95, 0, 0.92)
    lv = np.floor(s * 5.0 + BAYER) / 5.0
    on = lv > 0
    hot = np.array(col, np.float32) * 0.6 + 255.0 * 0.4
    mixed = buf.astype(np.float32) * (1 - lv[..., None]) + hot * lv[..., None]
    buf[on] = mixed[on].astype(np.uint8)
    core = (g * E > 0.55) & (BAYER < 0.5 * min(1.0, E))
    buf[core] = WHITE


def light_head(buf, c, t):
    """The lit top of the lead surgeon's cap when the head is inside the beams."""
    k = T.lean(t)
    if k <= 0.05:
        return
    hx, hy, r = RM.head_pos('A', t)
    col = light_col(t)
    rim = Wd.full(Wd.ellipse(c, hx, hy + 1.5, 11.0, 11.4) & (c.Y > hy + 5.0)) & ~Wd.full(
        Wd.ellipse(c, hx + 1.2, hy + 0.4, 11.0, 11.4))
    buf[rim & (BAYER < 0.9 * k * T.intensity(t))] = col


# ---------------------------------------------------------------- the suspension
def draw_arm(buf, c, t):
    a, j2, hc, tilt = pose(t)
    xr = arm_xray(t)
    mount = Wd.rect(c, CEIL_MOUNT[0] - 9.0, CEIL_MOUNT[0] + 9.0, 294.0, 300.0)
    axis = Wd.rect(c, CEIL_MOUNT[0] - 3.2, CEIL_MOUNT[0] + 3.2, AXIS_LOW - 2.0, 296.0)
    ext = Wd.band(c, (CEIL_MOUNT[0], AXIS_LOW), (-1.0, 0.0), 0.0, CEIL_MOUNT[0] - J1[0], 2.7)
    d = (math.cos(a), math.sin(a))
    sarm = Wd.band(c, J1, d, 0.0, ARM_L, 2.9, 2.5)
    yoke = Wd.band(c, j2, unit(*sub(to_world(0.0, 9.0, hc, tilt), j2)), 0.0, dist(j2, to_world(0.0, 9.0, hc, tilt)), 1.5)
    for m, col in ((mount, STEEL[1]), (axis, STEEL[2]), (ext, STEEL[2]), (yoke, STEEL[1])):
        buf[Wd.full(m)] = col
        buf[Wd.full(m) & (BAYER < 0.25)] = STEEL[3]
        buf[Wd.edge(m)] = OUTLINE
    buf[Wd.full(sarm)] = STEEL[2]
    buf[Wd.full(sarm) & (BAYER < 0.25)] = STEEL[3]
    if xr > 0:                                           # in x-ray: the balancing spring inside the arm
        al, ac = Wd.axis(c, J1, d)
        see = Wd.full(sarm) & (BAYER < xr)
        buf[see] = XRAY[1]
        n_coils = 9
        length = ARM_L * (0.7 - 0.12 * T.arm(t))
        s0 = ARM_L * 0.15
        ph = (al - s0) / length * n_coils
        zig = 1.9 * (2.0 * np.abs(np.mod(ph, 1.0) - 0.5) * 2.0 - 1.0)
        coil = (al > s0) & (al < s0 + length) & (np.abs(ac - zig) < 0.55)
        buf[Wd.full(coil) & see] = SPRING[0]
        buf[Wd.full(coil & (np.abs(ac - zig) < 0.2)) & see] = SPRING[2]
        rod = (al > s0 + length) & (al < ARM_L * 0.9) & (np.abs(ac) < 0.6)
        buf[Wd.full(rod) & see] = SPRING[1]
    buf[Wd.edge(sarm)] = OUTLINE
    for (x, y, r) in ((J1[0], J1[1], 3.6), (j2[0], j2[1], 3.0), (CEIL_MOUNT[0], AXIS_LOW, 3.6)):
        m = Wd.circle(c, x, y, r)
        buf[Wd.full(m)] = STEEL[1]
        buf[Wd.full(Wd.circle(c, x, y, r * 0.38))] = STEEL[0]
        buf[Wd.edge(m)] = OUTLINE


def arm_xray(t):
    return T.smooth(T.u_of(t, (T.bar(11) + 0.05, T.bar(11) + 0.4))) * (1 - T.smooth(T.u_of(t, (T.bar(12) - 0.2,
                                                                                            T.bar(12) + 0.2))))


# ---------------------------------------------------------------- the head
def draw_head(buf, c, t):
    Lc = local(c, t)
    U, V = Lc.X, Lc.Y
    xr = T.xray(t)
    col = light_col(t)
    shell = (np.abs(U) <= R) & (V >= bottom(U)) & (V <= top(U))
    handle = ((np.abs(U) <= 3.6) & (V <= bottom(0.0) + 0.5) & (V >= -22.5)) | \
        (((U / 3.6) ** 2 + ((V + 22.5) / 2.0) ** 2) <= 1.0)
    # outside: a white dome lit from above, ribs of the heat sink on top, the dark emitter face underneath
    buf[shell] = SHELL[2]
    buf[shell & (V > top(U) - 2.5) & (U < 10.0)] = SHELL[3]
    buf[shell & (V < bottom(U) + 3.0)] = SHELL[1]
    ribs = shell & (V > top(U) - 1.2) & (np.abs(np.mod(U + 1.5, 3.0) - 1.5) < 0.45) & (np.abs(U) < 28.0)
    buf[ribs] = SHELL[1]
    face = shell & (V < bottom(U) + 1.1)
    buf[face] = STEEL[1]
    buf[handle] = SHELL[2]
    buf[handle & (V < -12.0) & (V > -19.0)] = MASK[0]           # the sterile cover's grip
    buf[handle & (U < -1.2)] = SHELL[3]
    if xr > 0:
        draw_xray(buf, Lc, t, xr)
    # the light leaving the lenses: a glow under each, sized by its power
    bl = beams(t)
    for i, ((px, py), d, L, cut, it) in enumerate(bl):
        lx, ly = lens_pos(i, t)
        g = Wd.full(((U - lx) / (1.6 + 2.2 * it)) ** 2 + ((V - ly + 0.9) / (1.0 + 1.6 * it)) ** 2 <= 1.0) & ~shell
        buf[g & (BAYER < 0.55 * min(1.0, it))] = col
        if xr < 0.5:
            buf[Wd.full((np.abs(U - lx) < 1.0) & (np.abs(V - ly - 0.6) < 0.6)) & (it > 0.05)] = LED[2]
    buf[Wd.edge(shell | handle)] = OUTLINE
    draw_sensors(buf, Lc, t)
    draw_hand(buf, Lc, t)


def draw_xray(buf, Lc, t, xr):
    U, V = Lc.X, Lc.Y
    see = BAYER < xr
    shell = (np.abs(U) <= R) & (V >= bottom(U)) & (V <= top(U))
    inner = shell & (V > bottom(U) + 0.8) & (V < top(U) - 0.8) & (np.abs(U) < R - 0.8)
    buf[inner & see] = XRAY[1]
    buf[inner & see & gfx_check()] = XRAY[2]
    hot = T.heat(t)
    # the heat-sink fins under the dome
    fins = inner & (V > top(U) - 3.6) & (np.abs(np.mod(U + 1.5, 3.0) - 1.5) < 0.5) & (np.abs(U) < 27.0)
    buf[fins & see] = STEEL[2]
    if hot > 0:
        buf[fins & see & (BAYER < 0.85 * hot)] = HEAT[1]
    # the driver board and its chips, wires up to the yoke
    drv = (np.abs(U) < 13.0) & (V > 3.2) & (V < 5.6)
    buf[drv & see] = PCB[0]
    for x in (-9.0, -3.0, 3.0, 9.0):
        buf[(np.abs(U - x) < 1.4) & (V > 4.0) & (V < 5.4) & see] = CHIP[0]
    buf[(np.abs(U - 0.6) < 0.35) & (V > 5.6) & (V < top(0.0)) & see] = HEAT[0]
    buf[(np.abs(U + 0.6) < 0.35) & (V > 5.6) & (V < top(0.0)) & see] = CHIP[1]
    # the LED board along the emitter face
    pcb = (np.abs(U) < 32.0) & (V > bottom(U) + 2.5) & (V < bottom(U) + 3.6)
    buf[pcb & see] = PCB[1]
    buf[pcb & see & (BAYER < 0.3)] = PCB[2]
    col = light_col(t)
    bl = beams(t)
    for i in range(T.LED_N):
        (x, y), d = led_aim(i)
        on = T.led_on(i, t)
        pkg = Wd.band(Lc, (x, y), d, -1.3, 0.75, 1.45)          # the LED package on the board
        emit = Wd.band(Lc, (x, y), d, 0.25, 0.75, 0.95)         # its yellow phosphor face, towards the lens
        buf[pkg & see] = SHELL[2]
        buf[Wd.edge(pkg) & see] = SHELL[0]
        buf[emit & see] = LED[0] if on < 0.5 else LED[2]
        lx, ly = lens_pos(i, t)
        lens = ((U - lx) ** 2 + (V - ly) ** 2 <= 1.55 ** 2) & see
        buf[lens] = LENS[1]
        buf[lens & ((U - lx + 0.5) ** 2 + (V - ly - 0.4) ** 2 <= 0.45)] = LENS[2]
        buf[lens & ((U - lx) ** 2 + (V - ly) ** 2 > 1.0)] = LENS[0]
        it = bl[i][4]
        if it > 0.05:                                    # its own small glow inside the lens
            buf[((U - x) ** 2 + (V - y + 0.6) ** 2 <= (0.5 + 1.0 * it) ** 2) & see & (BAYER < 0.8)] = col
    # the lens panel they sit in (it slides as one piece)
    off = T.lens_off(t)
    panel = (np.abs(U) < 31.5) & (np.abs(V - (bottom(U) - 1.0 + off * 0.85)) < 0.3)
    buf[panel & see & gfx_check()] = LENS[0]
    # the camera in the handle
    cam = (np.abs(U) < 2.3) & (V > -19.5) & (V < -14.0)
    buf[cam & see] = CHIP[0]
    buf[(((U) ** 2 + (V + 20.6) ** 2) <= 1.3 ** 2) & see] = LENS[1]
    buf[(((U + 0.4) ** 2 + (V + 20.2) ** 2) <= 0.3) & see] = WHITE
    buf[(np.abs(U) < 0.35) & (V > -14.0) & (V < bottom(0.0) + 3.0) & see] = CHIP[1]


def draw_sensors(buf, Lc, t):
    U, V = Lc.X, Lc.Y
    sc = T.scanning(t)
    blink = 0.5 + 0.5 * math.sin(t * 2 * math.pi * 3.2)
    for su in SENSOR_U:
        sv = float(bottom(su)) + 0.4
        win_ = (np.abs(U - su) < 1.7) & (np.abs(V - sv) < 0.75)
        buf[win_] = SENSOR[0]
        if sc > 0 and blink > 0.4:
            buf[(np.abs(U - su) < 0.7) & (np.abs(V - sv) < 0.4)] = SENSOR[2]


def draw_hand(buf, Lc, t):
    """A gloved hand around the sterile handle, the sleeve running down out of the frame."""
    k = T.hand(t)
    if k <= 0:
        return
    U, V = Lc.X, Lc.Y
    slide = (1.0 - k) * 45.0
    d = unit(-0.55, -1.0)
    hx, hy = 0.0 + d[0] * slide, -16.5 + d[1] * slide
    sleeve = Wd.band(Lc, (hx - 3.0, hy - 4.0), d, 0.0, 60.0, 4.8, 5.6)
    buf[sleeve] = GOWN[2]
    buf[sleeve & (BAYER < 0.3)] = GOWN[3]
    buf[Wd.edge(sleeve)] = OUTLINE
    cuff = Wd.band(Lc, (hx - 3.0, hy - 4.0), d, -1.0, 3.0, 4.6)
    buf[cuff] = GLOVE[0]
    glove = (((U - hx) / 5.4) ** 2 + ((V - hy) / 4.4) ** 2 <= 1.0)
    buf[glove] = GLOVE[1]
    buf[glove & (np.abs(np.mod(V - hy + 4.4, 2.2) - 1.1) < 0.28) & (U > hx - 1.0)] = GLOVE[0]
    buf[glove & (U < hx - 2.5)] = GLOVE[2]
    buf[Wd.edge(glove)] = OUTLINE


# ---------------------------------------------------------------- effects
def draw_effects(buf, c, t):
    """The sensors' scanning rays and the moment they find the head; the heat rising off the top; the camera's view."""
    _, _, hc, tilt = pose(t)
    if T.scanning(t) > 0:
        hx, hy, hr = RM.head_pos('A', t)
        for su in SENSOR_U:
            sx, sy = to_world(su, float(bottom(su)), hc, tilt)
            for k, tx in enumerate((-6.0, 6.0, 18.0, 30.0) if su < 0 else (36.0, 24.0, 12.0, 0.0)):
                ex, ey = tx, 128.0
                n = 16
                for j in range(n):
                    f = (j + (t * 3.0) % 1.0) / n
                    if (j % 2) == 0:
                        x0, y0 = sx + (ex - sx) * f, sy + (ey - sy) * f
                        if math.hypot(x0 - hx, y0 - hy) < hr and t > T.T_DETECT:
                            break
                        cx_, cy_ = c.to(x0, y0)
                        Wd.dot(buf, cx_, cy_, SENSOR[1], 2 if c.s > 3 else 1)
        age = t - T.T_DETECT
        if 0 <= age < 0.6:
            r = hr + 2.0 + 14.0 * age
            for j in range(24):
                a_ = j * 2 * math.pi / 24
                if j % 2:
                    continue
                px, py = c.to(hx + r * math.cos(a_), hy + r * math.sin(a_))
                Wd.dot(buf, px, py, SENSOR[2], 2)
    hot = T.heat(t)
    if hot > 0:                                          # heat leaving through the top: warm specks rising, fading
        rng = np.random.default_rng(3)
        for k in range(46):
            u0 = rng.uniform(-26.0, 26.0)
            ph = (t * 0.55 + rng.uniform(0, 1)) % 1.0
            v = float(bottom(u0)) + 3.0 + ph * 34.0
            u = u0 + 1.6 * math.sin(ph * 9.0 + k)
            x, y = to_world(u, v, hc, tilt)
            colr = HEAT[2] if ph < 0.35 else (HEAT[1] if ph < 0.7 else HEAT[0])
            if (k % 3) < 3 * hot:
                px, py = c.to(x, y)
                Wd.dot(buf, px, py, OUTLINE, 3 if c.s > 3 else 2)
                Wd.dot(buf, px, py, colr, 2 if c.s > 3 else 1)
    cv = T.camview(t)
    if cv > 0:                                           # what the camera in the handle sees: the field
        lx, ly = to_world(0.0, -21.5, hc, tilt)
        F = focus(t)
        fw = T.field_d(t) / 2.0
        for ex in (F[0] - fw, F[0] + fw):
            n = 26
            for j in range(n):
                f = (j + (t * 2.0) % 1.0) / n
                if j % 2 or f > cv:
                    continue
                px, py = c.to(lx + (ex - lx) * f, ly + (F[1] - ly) * f)
                Wd.dot(buf, px, py, OUTLINE, 3)
                Wd.dot(buf, px, py, LENS[2], 2)


# ---------------------------------------------------------------- small helpers
def gfx_check():
    return Wd.CHECK


def unit(dx, dy):
    n = math.hypot(dx, dy) or 1.0
    return dx / n, dy / n


def sub(a, b):
    return a[0] - b[0], a[1] - b[1]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])
