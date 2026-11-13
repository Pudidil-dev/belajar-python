"""The benchtop centrifuge, drawn in the 3/4 top-down view of 16-bit games (front face straight on, top face squashed).

World axes: x right, y toward the viewer, z up. Screen: sx = ox + x, sy = oy + K*y - z, with (ox, oy) the centre of the
top face. The round lid swings on a hinge at the back, so every lid angle is projected from the same geometry; the
rotor is drawn per angle and motion-blurred by averaging sub-frames, then dithered back onto the palette.
"""
import math
import numpy as np
from . import gfx, pixfont
from .palette import MW, AL, TL, BL, BG, PL, GL

K = 0.6                     # top-face foreshortening
HW, HD = 116, 84            # half width (px), half depth (world)
TRY = HD * K                # top face half height on screen (50.4)
CRX, CRY = 26, 26 * K       # rounded corners of the body
FH = 84                     # front face height
LID_R, LID_T = 72, 7        # lid radius and thickness
WIN_R = 52                  # lid window radius
BOWL_R, BOWL_DEPTH = 64, 24
ROT_R, ROT_DROP, ROT_T = 54, 12, 6
SLOT_RAD = 38
N_SLOTS = 4                 # swing-out rotor: four buckets
OPEN_DEG = 100.0            # lid fully open
EDGE_DEG = math.degrees(math.atan(K))   # lid seen edge-on (~31 deg)

LCD_GHOST = (17, 38, 33)
ROTOR_PAL = np.array(sorted(set(AL + TL[1:8] + BG[0:4])), np.float32)
WIN_PAL = np.array(sorted(set(AL[0:7] + TL[0:7] + BG[0:5] + GL[1:5])), np.float32)


class State:
    def __init__(self, **kw):
        self.lid = OPEN_DEG       # lid angle in degrees (0 closed)
        self.theta = 0.0          # rotor angle (rad); slot 0 is at the front when theta = 0 (mod 2 pi)
        self.blur = 0.0           # rotor angle swept during the frame (rad)
        self.caps = (0, 2)        # occupied buckets: our tube (0) and the balance tube (2)
        self.hide_front = False   # slot 0's cap is drawn by the tube shader instead
        self.lcd_on = False
        self.lcd = '   0'
        self.lcd_blink = True
        self.progress = 0.0
        self.led = None           # LED colour or None
        self.press = {}           # button -> 0..1 pressed
        self.lit = {}             # button -> lit
        self.tube_fn = None       # draws the tube at the right depth (after rotor, before a closing lid)
        self.window_fx = None
        self.__dict__.update(kw)


def slot_center(ox, oy, k=0, theta=0.0):
    phi = theta + k * 2 * math.pi / N_SLOTS + math.pi / 2
    return ox + SLOT_RAD * math.cos(phi), oy + ROT_DROP + SLOT_RAD * K * math.sin(phi)


SLOT_RX, SLOT_RY = 8.0, 4.8          # inner opening of a bucket (seen from above)


def slot_clip(ox, oy):
    """Keep the parts of a tube that are above the front lip of the front slot."""
    sx, sy = slot_center(ox, oy)

    def keep(X, Y):
        u = np.clip((X - sx) / SLOT_RX, -1, 1)
        lip = sy + SLOT_RY * np.sqrt(1 - u * u)
        return np.where(np.abs(X - sx) < SLOT_RX, Y < lip, Y < sy)
    return keep


# ------------------------------------------------------------------ room
def draw_room(buf, ox, oy, t=0.0, wall_off=0, bench=True, glow=1.0):
    """Charcoal wall with faint medical crosses and a soft spotlight; the bench top under the machine.

    wall_off scrolls the wall pattern with the camera (so camera tilts read as real moves)."""
    H, W = buf.shape[:2]
    buf[:] = BG[2]
    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]
    yb = int(oy - 18) if bench else 10 ** 6
    th = gfx.BAYER[:H, :W]
    wall = yy < yb
    if glow > 0:
        r = np.sqrt(((xx - ox) / 150.0) ** 2 + ((yy - (oy - 70)) / 190.0) ** 2)
        v = np.clip(1.15 - r, 0, 1) * glow
        g1 = (v * 2.2 + th) > 1.0
        g2 = (v * 2.2 + th) > 2.0
        buf[g1 & wall] = BG[3]
        buf[g2 & wall] = BG[4]
    else:
        g1 = g2 = np.zeros((H, W), bool)
    # medical crosses on a staggered 30 px grid, scrolling with the camera
    yw = yy + int(wall_off)
    row = np.floor_divide(yw + 15, 30)
    dy = yw - row * 30
    dx = np.mod(xx - (row % 2) * 15 + 15, 30) - 15
    plus = wall & (((dx == 0) & (np.abs(dy) <= 1)) | ((dy == 0) & (np.abs(dx) <= 1)))
    buf[plus & ~g1] = BG[3]
    buf[plus & g1 & ~g2] = BG[4]
    buf[plus & g2] = BG[5]
    if yb < H:
        b = gfx.rect(0, yb, W, H)
        ybb = (np.arange(b.y0, b.y1) + 0.5)[:, None]
        vb = np.clip((ybb - yb) / 260.0, 0, 1) * 0.8 + 0.25
        gfx.shade(buf, b, BG[3:7], np.broadcast_to(vb, b.m.shape))
        gfx.fill(buf, gfx.rect(0, yb, W, yb + 1), BG[6])
        gfx.fill(buf, gfx.rect(0, yb + 1, W, yb + 2), BG[1])


def draw_shadow(buf, ox, oy):
    yb = oy + TRY + FH
    sh = gfx.ellipse(ox, yb + 1, HW + 8, 11)
    gfx.fill_dither(buf, sh, None, BG[1], 0.55)
    gfx.fill(buf, gfx.ellipse(ox, yb, HW - 2, 6), BG[0])


# ------------------------------------------------------------------ body
def _body_masks(ox, oy):
    top = gfx.rrect(ox - HW, oy - TRY, ox + HW, oy + TRY, CRX, CRY)
    bx0, by0 = int(ox - HW) - 1, int(oy - TRY) - 1
    bx1, by1 = int(ox + HW) + 2, int(oy + TRY + FH) + 2
    tb = top._place(bx0, by0, bx1, by1)
    has = tb.any(0)
    bot = np.where(has, tb.shape[0] - 1 - np.argmax(tb[::-1], 0), -10 ** 6)
    yy = np.arange(tb.shape[0])[:, None]
    fr = (yy > bot[None, :]) & (yy <= bot[None, :] + FH) & has[None, :]
    front = gfx.Mask(bx0, by0, fr).clip()
    return top, front


def _button(buf, cx, cy, ramp, icon, pressed=0.0, lit=False):
    dy = 1 if pressed > 0.5 else 0
    gfx.fill(buf, gfx.ellipse(cx, cy + 1, 9.5, 8.5), BG[0])
    body = gfx.ellipse(cx, cy + dy, 8.5, 7.5)
    xs, ys = body.grid()
    v = 0.78 - 0.32 * (xs - cx) / 8.5 - 0.4 * (ys - cy - dy) / 7.5
    if pressed > 0.5:
        v = v - 0.25
    if lit:
        v = v + 0.2
    gfx.shade(buf, body, ramp, np.clip(v, 0, 1))
    gfx.fill(buf, gfx.ellipse(cx - 3, cy - 3 + dy, 2.2, 1.6), ramp[-1])
    ic = MW[1] if ramp is not BL[2:9] else MW[8]
    if icon == 'play':
        tri = gfx.polygon([(cx - 2, cy - 3 + dy), (cx - 2, cy + 3 + dy), (cx + 3, cy + dy)])
        gfx.fill(buf, tri, MW[8] if ramp is TL[2:9] else ic)
    elif icon == 'stop':
        gfx.fill(buf, gfx.rect(cx - 2, cy - 2 + dy, cx + 3, cy + 3 + dy), MW[8])
    elif icon == 'open':
        gfx.fill(buf, gfx.polygon([(cx - 3.5, cy + dy), (cx + 3.5, cy + dy), (cx, cy - 4 + dy)]), MW[1])
        gfx.fill(buf, gfx.rect(cx - 3, cy + 2 + dy, cx + 4, cy + 3 + dy), MW[1])


def _panel(buf, ox, yft, st, t):
    px0, px1, py0, py1 = ox - 102, ox + 102, yft + 12, yft + 52
    pan = gfx.rrect(px0, py0, px1, py1, 3)
    gfx.fill(buf, pan.outline(), MW[2])
    gfx.fill(buf, pan, BG[5])
    gfx.fill(buf, gfx.rect(px0 + 2, py0, px1 - 2, py0 + 1), BG[2])
    gfx.fill(buf, gfx.rect(px0 + 2, py1 - 1, px1 - 2, py1), BG[6])
    # LCD
    lx0, ly0, lx1, ly1 = ox - 96, py0 + 5, ox - 34, py0 + 30
    gfx.fill(buf, gfx.rect(lx0 - 1, ly0 - 1, lx1 + 1, ly1 + 1), BG[0])
    on = st.lcd_on
    gfx.fill(buf, gfx.rect(lx0, ly0, lx1, ly1), TL[0] if on else BG[1])
    if on:
        gfx.fill(buf, gfx.rect(lx0, ly0, lx1, ly0 + 1), TL[1])
    txt = st.lcd if (st.lcd_blink or int(t * 4) % 2 == 0) else '    '
    pixfont.draw_lcd(buf, txt, lx0 + 4, ly0 + 4, TL[7] if on else None, LCD_GHOST if on else BG[2])
    pixfont.draw_text(buf, 'RPM', lx0 + 34, ly0 + 8, TL[6] if on else BG[3], font='3x5', outline=None)
    bar = gfx.rect(lx0 + 4, ly0 + 17, lx1 - 4, ly0 + 19)
    gfx.fill(buf, bar, TL[1] if on else BG[2])
    if on and st.progress > 0:
        gfx.fill(buf, gfx.rect(lx0 + 4, ly0 + 17, lx0 + 4 + (lx1 - lx0 - 8) * min(st.progress, 1), ly0 + 19), TL[6])
    # glare on the LCD glass
    gfx.fill(buf, gfx.line(lx1 - 13, ly0 + 1, lx1 - 4, ly0 + 10), TL[2] if on else BG[3])
    # status LED
    lc = st.led
    gfx.fill(buf, gfx.rect(ox - 27, py0 + 7, ox - 22, py0 + 12), BG[0])
    if lc is not None:
        gfx.fill(buf, gfx.rect(ox - 30, py0 + 4, ox - 19, py0 + 15).outline(), BG[5])
        gfx.fill_dither(buf, gfx.ellipse(ox - 24.5, py0 + 9.5, 5.5, 5.5), None, tuple(int(c * 0.45) for c in lc), 0.5)
        gfx.fill(buf, gfx.rect(ox - 26, py0 + 8, ox - 23, py0 + 11), lc)
        gfx.fill(buf, gfx.rect(ox - 26, py0 + 8, ox - 25, py0 + 9), MW[8])
    else:
        gfx.fill(buf, gfx.rect(ox - 26, py0 + 8, ox - 23, py0 + 11), BG[4])
    pixfont.draw_text(buf, 'RUN', ox - 30, py0 + 18, MW[3], font='3x5', outline=None)
    # buttons
    for name, bx, rmp, icon in (('start', ox + 4, TL[2:9], 'play'), ('stop', ox + 36, BL[2:9], 'stop'),
                                ('open', ox + 68, MW[3:9], 'open')):
        _button(buf, bx, py0 + 15, rmp, icon, st.press.get(name, 0.0), st.lit.get(name, False))
        lab = {'start': 'START', 'stop': 'STOP', 'open': 'OPEN'}[name]
        pixfont.draw_text(buf, lab, bx, py0 + 27, MW[4], font='3x5', anchor='mt', outline=None)
    # knob (timer)
    kx, ky = ox + 92, py0 + 15
    gfx.fill(buf, gfx.ellipse(kx, ky + 1, 6.5, 6.5), BG[0])
    kn = gfx.ellipse(kx, ky, 5.5, 5.5)
    xs, ys = kn.grid()
    gfx.shade(buf, kn, AL[3:9], np.clip(0.75 - 0.35 * (xs - kx) / 5.5 - 0.35 * (ys - ky) / 5.5, 0, 1))
    gfx.fill(buf, gfx.line(kx, ky, kx + 3, ky - 3), MW[1])
    return py1


def draw_body(buf, ox, oy, st, t=0.0):
    top, front = _body_masks(ox, oy)
    gfx.fill(buf, (top | front).outline(), MW[0])
    # front face: columns turn into the rounded corners
    xs, ys = front.grid()
    ax = np.abs(xs - ox)
    u = np.clip((ax - (HW - CRX)) / CRX, 0, 1)
    side = np.sign(xs - ox)
    v = 0.64 + np.where(side < 0, 0.12 * np.sin(u * math.pi) - 0.38 * u ** 3, -0.42 * u ** 1.6)
    yft = oy + TRY
    v = v - 0.10 * np.clip((ys - yft - 40) / 40.0, 0, 1)
    gfx.shade(buf, front, MW[2:9], np.clip(v, 0, 1))
    # crease under the top face, and the dark rubber plinth
    gfx.fill(buf, front.top_edge(), MW[4])
    yfb = int(yft + FH)
    plinth = front & gfx.rect(ox - HW - 2, yfb - 9, ox + HW + 2, yfb + 2)
    xs2, _ = plinth.grid()
    gfx.shade(buf, plinth, AL[1:5], np.clip(0.55 - 0.45 * (xs2 - ox) / HW, 0, 1))
    gfx.fill(buf, plinth.top_edge(), MW[3])
    for fx in (ox - HW + 18, ox + HW - 30):
        gfx.fill(buf, gfx.rect(fx, yfb, fx + 12, yfb + 3), AL[0])
    # top face
    xs, ys = top.grid()
    vt = 0.70 + 0.16 * np.clip((ys - oy) / TRY, -1, 1) - 0.06 * (xs - ox) / HW
    gfx.shade(buf, top, MW[4:9], np.clip(vt, 0, 1))
    gfx.fill(buf, top.bottom_edge(), MW[8])
    py1 = _panel(buf, ox, int(round(yft)), st, t)
    # brand plate and vents
    gfx.fill(buf, gfx.ellipse(ox - 92.5, py1 + 8.5, 3.5, 3.5), TL[4])
    gfx.fill(buf, gfx.ellipse(ox - 92.5, py1 + 8.5, 1.5, 1.5), MW[7])
    pixfont.draw_text(buf, 'CENTRIFUGE', ox - 86, py1 + 6, MW[3], font='3x5', outline=None)
    for k in range(5):
        y = py1 + 5 + 3 * k
        gfx.fill(buf, gfx.rect(ox + 46, y, ox + 100, y + 1), MW[2])
        gfx.fill(buf, gfx.rect(ox + 46, y + 1, ox + 100, y + 2), MW[8])
    return top, front


# ------------------------------------------------------------------ bowl and rotor
def draw_bowl(buf, ox, oy):
    rim = gfx.ellipse(ox, oy, BOWL_R + 3, (BOWL_R + 3) * K)
    opening = gfx.ellipse(ox, oy, BOWL_R, BOWL_R * K)
    gfx.fill(buf, rim, AL[6])
    gfx.fill(buf, rim.bottom_edge(), AL[8])
    floor = gfx.ellipse(ox, oy + BOWL_DEPTH, BOWL_R, BOWL_R * K) & opening
    wall = opening - floor
    xs, ys = wall.grid()
    gfx.shade(buf, wall, AL[1:6], np.clip(0.85 - (ys - (oy - BOWL_R * K)) / 40.0 + 0.1 * (xs - ox) / BOWL_R, 0, 1))
    gfx.fill(buf, floor, AL[1])
    return opening


def draw_rotor(buf, cx, cy, theta, caps=(0, 2), hide_front=False):
    """Swing-out rotor seen from above: a hub with four arms, each ending in a yoke that holds a bucket."""
    phis = [theta + k * 2 * math.pi / N_SLOTS + math.pi / 2 for k in range(N_SLOTS)]
    ends = []
    for phi in phis:
        c, s_ = math.cos(phi), math.sin(phi)
        ends.append((cx + (SLOT_RAD - 9) * c, cy + (SLOT_RAD - 9) * K * s_))
    for (x1, y1) in ends:                      # arm thickness (underside)
        gfx.fill(buf, gfx.line(cx, cy + 3, x1, y1 + 3, 7), AL[2])
    for (x1, y1) in ends:                      # arm tops
        arm = gfx.line(cx, cy, x1, y1, 7)
        gfx.fill(buf, arm, AL[5])
        gfx.fill(buf, arm.top_edge(), AL[7])
    order = sorted(range(N_SLOTS), key=lambda k: math.sin(phis[k]))
    for k in order:
        phi = phis[k]
        bx, by = cx + SLOT_RAD * math.cos(phi), cy + SLOT_RAD * K * math.sin(phi)
        tx, ty = -math.sin(phi), K * math.cos(phi)
        n = math.hypot(tx, ty) or 1.0
        tx, ty = tx / n * 12.5, ty / n * 12.5
        gfx.fill(buf, gfx.line(bx - tx, by - ty + 2, bx + tx, by + ty + 2, 3), AL[3])       # yoke
        gfx.fill(buf, gfx.ellipse(bx, by + 4, SLOT_RX + 1.5, SLOT_RY + 1), AL[2])           # bucket body below rim
        rim = gfx.ellipse(bx, by, SLOT_RX + 1.5, SLOT_RY + 1)
        gfx.fill(buf, rim, AL[6])
        gfx.fill(buf, rim.top_edge(), AL[8])
        hole = gfx.ellipse(bx, by + 0.5, SLOT_RX, SLOT_RY)
        gfx.fill(buf, hole, BG[0])
        gfx.fill(buf, gfx.ellipse(bx, by + 1.5, SLOT_RX - 2, SLOT_RY - 1.6) & hole, BG[1])
        for sgn in (-1, 1):                                                                 # pivot pins
            gfx.fill(buf, gfx.rect(bx + sgn * tx - 1, by + sgn * ty + 1, bx + sgn * tx + 1, by + sgn * ty + 3), AL[7])
        if k in caps and not (hide_front and k == 0):
            gfx.fill(buf, gfx.ellipse(bx, by - 1, 6.2, 3.8), TL[2])
            capt = gfx.ellipse(bx, by - 3, 6.2, 3.8)
            gfx.fill(buf, capt, TL[5])
            gfx.fill(buf, capt.bottom_edge(), TL[4])
            gfx.fill(buf, gfx.rect(bx - 3, by - 5, bx - 1, by - 4), TL[7])
    hub_s = gfx.ellipse(cx, cy - 1, 12, 7.2)
    gfx.fill(buf, hub_s, AL[2])
    hub = gfx.ellipse(cx, cy - 4, 12, 7.2)
    xs, ys = hub.grid()
    gfx.shade(buf, hub, AL[4:9], np.clip(0.7 - 0.3 * (xs - cx) / 12 - 0.35 * (ys - cy + 4) / 7.2, 0, 1))
    gfx.fill(buf, gfx.ellipse(cx, cy - 4, 5, 3), AL[2])
    gfx.fill(buf, gfx.ellipse(cx, cy - 5, 2, 1.2), AL[1])
    # an orientation mark on one arm so slow turns read
    phi = phis[1]
    mx, my = cx + 21 * math.cos(phi), cy + 21 * K * math.sin(phi) - 1
    gfx.fill(buf, gfx.ellipse(mx, my, 2.2, 1.4), BL[5])


_full_blur = {}
_scratch = {}


def rotor_layer(cx, cy, theta, blur, caps=(0, 2), hide_front=False, tint=None, pal=None, bg=None, key=None):
    """Render the rotor with motion blur over a background canvas `bg`; returns the cropped (rgb, mask, x0, y0).

    The mask covers the whole box: the caller clips it to the bowl opening or the lid window."""
    x0, y0 = int(cx - SLOT_RAD - 14), int(cy - SLOT_RAD * K - 12)
    x1, y1 = int(cx + SLOT_RAD + 15), int(cy + SLOT_RAD * K + 16)
    x0c, y0c, x1c, y1c = max(x0, 0), max(y0, 0), min(x1, gfx.W), min(y1, gfx.H)
    if x1c <= x0c or y1c <= y0c:
        return None
    n = 1 if blur < 0.04 else int(min(40, max(3, math.ceil(blur / 0.09))))
    full = blur >= 2 * math.pi
    ck = None if key is None else (key, round(cx, 3), round(cy, 3), tuple(caps), hide_front)
    if full and ck is not None and ck in _full_blur:
        acc = _full_blur[ck]
    else:
        if 'c' not in _scratch:
            _scratch['c'] = np.zeros((gfx.H, gfx.W, 3), np.uint8)
        scratch = _scratch['c']
        base = (bg[y0c:y1c, x0c:x1c] if bg is not None else np.zeros((y1c - y0c, x1c - x0c, 3), np.uint8)).copy()
        acc = np.zeros((y1c - y0c, x1c - x0c, 3), np.float32)
        samples = 48 if full else n
        span = 2 * math.pi if full else blur
        for i in range(samples):
            a = theta - span * (i + 0.5) / samples if not full else 2 * math.pi * i / samples
            scratch[y0c:y1c, x0c:x1c] = base
            draw_rotor(scratch, cx, cy, a, caps, hide_front)
            acc += scratch[y0c:y1c, x0c:x1c]
        acc /= samples
        if full and ck is not None:
            _full_blur[ck] = acc.copy()
    msk = np.ones((y1c - y0c, x1c - x0c), bool)
    rgb = acc.copy()
    if tint is not None:
        rgb = rgb * tint[0] + np.asarray(tint[1], np.float32) * (1 - tint[0])
    if n > 1 or full or tint is not None:
        img = gfx.quantize(rgb, pal if pal is not None else ROTOR_PAL, x0c, y0c, spread=20)
    else:
        img = rgb.astype(np.uint8)
    return img, msk, x0c, y0c


# ------------------------------------------------------------------ lid
def _lid_pts(ox, oy, alpha, R, face='outer', n=96, center_d=None):
    a = math.radians(alpha)
    cd = LID_R if center_d is None else center_d
    ph = np.linspace(0, 2 * math.pi, n, endpoint=False)
    u = R * np.cos(ph)
    d = cd + R * np.sin(ph)
    y = -LID_R + d * math.cos(a)
    z = LID_T + d * math.sin(a)
    if face == 'inner':
        y = y + LID_T * math.sin(a)
        z = z - LID_T * math.cos(a)
    return np.stack([ox + u, oy + K * y - z], 1)


def lid_point(ox, oy, alpha, u, d, face='outer'):
    a = math.radians(alpha)
    y = -LID_R + d * math.cos(a)
    z = LID_T + d * math.sin(a)
    if face == 'inner':
        y += LID_T * math.sin(a)
        z -= LID_T * math.cos(a)
    return ox + u, oy + K * y - z


def outer_visible(alpha):
    a = math.radians(alpha)
    return -math.sin(a) + K * math.cos(a) > 0


def draw_lid(buf, ox, oy, st, t=0.0):
    alpha = st.lid
    outer = gfx.polygon(_lid_pts(ox, oy, alpha, LID_R, 'outer'))
    inner = gfx.polygon(_lid_pts(ox, oy, alpha, LID_R, 'inner'))
    gfx.fill(buf, (outer | inner).outline(), MW[0])
    if outer_visible(alpha):
        gfx.fill(buf, inner, MW[3])
        gfx.fill(buf, inner.bottom_edge(), MW[2])
        xs, ys = outer.grid()
        wx, wy = lid_point(ox, oy, alpha, 0, LID_R)
        v = 0.72 - 0.18 * (xs - wx) / LID_R - 0.22 * (ys - wy) / (LID_R * K + 1)
        gfx.shade(buf, outer, MW[4:9], np.clip(v, 0, 1))
        trim = gfx.polygon(_lid_pts(ox, oy, alpha, WIN_R + 4, 'outer'))
        win = gfx.polygon(_lid_pts(ox, oy, alpha, WIN_R, 'outer'))
        tr = trim - win
        xs, ys = tr.grid()
        gfx.shade(buf, tr, TL[3:8], np.clip(0.6 - 0.35 * (xs - wx) / WIN_R - 0.4 * (ys - wy) / (WIN_R * K + 1), 0, 1))
        gfx.fill(buf, trim.outline() & outer, MW[3])
        # through the window: the rotor (smoked glass)
        if st.window_fx is not None:
            st.window_fx(buf, win, wx, wy)
        else:
            gfx.fill(buf, win, GL[1])
        gfx.fill(buf, win.top_edge(), BG[0])
        # glass reflections
        refl = (gfx.line(wx - 30, wy + 6, wx - 12, wy - 14, 2) | gfx.line(wx - 18, wy + 10, wx - 4, wy - 6)) & win
        gfx.blend(buf, refl, MW[8], 0.55)
        # latch at the front edge
        lx, ly = lid_point(ox, oy, alpha, 0, 2 * LID_R)
        gfx.fill(buf, gfx.rrect(lx - 12, ly - 3, lx + 12, ly + 2, 2) & outer, MW[3])
        gfx.fill(buf, gfx.rect(lx - 10, ly - 2, lx + 10, ly - 1) & outer, MW[2])
    else:
        gfx.fill(buf, outer, MW[4])
        gfx.fill(buf, outer.top_edge(), MW[6])
        xs, ys = inner.grid()
        cx, cy = lid_point(ox, oy, alpha, 0, LID_R, 'inner')
        v = 0.55 - 0.2 * (xs - cx) / LID_R - 0.15 * (ys - cy) / LID_R
        gfx.shade(buf, inner, MW[3:7], np.clip(v, 0, 1))
        g1 = gfx.polygon(_lid_pts(ox, oy, alpha, LID_R - 4, 'inner'))
        g2 = gfx.polygon(_lid_pts(ox, oy, alpha, LID_R - 7, 'inner'))
        gfx.fill(buf, g1 - g2, MW[1])
        win = gfx.polygon(_lid_pts(ox, oy, alpha, WIN_R, 'inner'))
        gfx.fill(buf, win, GL[1])
        gfx.fill(buf, win.outline() & inner, MW[2])
        refl = (gfx.line(cx - 26, cy + 18, cx - 6, cy - 18, 2) | gfx.line(cx - 12, cy + 20, cx + 4, cy - 8)) & win
        gfx.fill(buf, refl, GL[3])
        # the latch hook pointing down at the top edge
        lx, ly = lid_point(ox, oy, alpha, 0, 2 * LID_R, 'inner')
        gfx.fill(buf, gfx.rrect(lx - 8, ly - 1, lx + 8, ly + 5, 2), MW[2])


def draw_hinges(buf, ox, oy):
    hy = oy - K * LID_R - 2
    for hx in (ox - 36, ox + 36):
        b = gfx.rrect(hx - 7, hy - 4, hx + 7, hy + 4, 2)
        gfx.fill(buf, b.outline(), MW[0])
        xs, ys = b.grid()
        gfx.shade(buf, b, AL[3:8], np.clip(0.7 - 0.4 * (ys - hy) / 4, 0, 1))


# ------------------------------------------------------------------ whole machine
_win_bg = {}


def _window_bg(wx, wy):
    """What lies under the rotor seen through the window: the bowl, drawn once per window position."""
    k = (round(wx, 2), round(wy, 2))
    if k not in _win_bg:
        b = np.zeros((gfx.H, gfx.W, 3), np.uint8)
        b[:] = BG[1]
        draw_bowl(b, wx, wy + 2 - ROT_DROP)
        _win_bg[k] = b
    return _win_bg[k]


def window_rotor_fx(st, ox, oy):
    def fx(buf, win, wx, wy):
        lay = rotor_layer(wx, wy + 2, st.theta, st.blur, st.caps, False, tint=(0.8, TL[0]), pal=WIN_PAL,
                          bg=_window_bg(wx, wy), key='win')
        gfx.fill(buf, win, BG[1])
        if lay is not None:
            img, msk, x0, y0 = lay
            m = gfx.Mask(x0, y0, msk) & win
            gfx.paste_rgb(buf, img, x0, y0, m)
    return fx


def draw(buf, ox, oy, st, t=0.0):
    """Draw the whole machine with its top-face centre at (ox, oy)."""
    draw_shadow(buf, ox, oy)
    top, front = draw_body(buf, ox, oy, st, t)
    lid_behind = not outer_visible(st.lid)
    if lid_behind:
        draw_lid(buf, ox, oy, st, t)
    opening = None
    if st.lid > 0.5:
        opening = draw_bowl(buf, ox, oy)
        lay = rotor_layer(ox, oy + ROT_DROP, st.theta, st.blur, st.caps, st.hide_front, bg=buf)
        if lay is not None:
            img, msk, x0, y0 = lay
            gfx.paste_rgb(buf, img, x0, y0, gfx.Mask(x0, y0, msk) & opening)
    if lid_behind:
        draw_hinges(buf, ox, oy)
    if st.tube_fn is not None:
        st.tube_fn(buf)
    if not lid_behind:
        if st.window_fx is None:
            st.window_fx = window_rotor_fx(st, ox, oy)
        draw_lid(buf, ox, oy, st, t)
    return top, front


def window_center(ox, oy, alpha=0.0):
    return lid_point(ox, oy, alpha, 0, LID_R)
