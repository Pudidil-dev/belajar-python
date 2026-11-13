"""What is on screen at film time t, and where the camera is.

One continuous shot: the hook stage sits 300 px above the machine, so the camera tilts down to the centrifuge and back
up for the reveal (the wall's crosses scroll with it). The push into the lid window and the pull back out are done on
the big pixels at output resolution (gfx.camera), and an iris joins the machine to the inside-the-tube view.
"""
import math
import numpy as np
from . import gfx, tube, machine as M, micro, fx, pixfont
from . import timeline as T
from .timeline import u_of, smooth, ease_in, ease_out, ease_in_out, back_out, lerp, clamp01
from .palette import BG, MW, TL, PL, BL, OUTLINE, GOLD_DIM

W, H = gfx.W, gfx.H
OX, OY = 135, 262             # machine at rest (centre of its top face)
STAGE = 440                   # the hook / reveal stage is this far above the machine (open lid hidden)
S_HOOK, S_SLOT, S_REVEAL, S_FINAL = 0.78, 0.24, 1.12, 1.24
RED_XY, TWIN_XY, CENTER_XY = (72, 250), (198, 250), (135, 236)
WIN_XY = (135, 256)           # lid window centre (target of the slow push)
RING_XY = (98, 258)           # left side of the spinning ring of tube caps (target of the dive)


# ---------------------------------------------------------------- camera and machine placement
def cam_scroll(t):
    if t < T.FLY[0]:
        return 0.0
    if t < T.FLY[1]:
        return STAGE * ease_out(u_of(t, T.FLY), 3)
    if t < 18.1:
        return float(STAGE)
    if t < 19.2:
        return STAGE * (1 - ease_in_out(u_of(t, (18.1, 19.2)), 2.4))
    return 0.0


def machine_oy(t):
    return OY + STAGE - cam_scroll(t)


def hover_xy(oy):
    sx, sy = M.slot_center(OX, oy)
    return sx, sy - 27.5


def inserted_xy(oy):
    sx, sy = M.slot_center(OX, oy)
    return sx, sy + 22.5


def cam_machine(t):
    """(zoom, cx, cy) for the stage / machine picture, or None while only the inside view is on screen."""
    if t < T.PUSH[0]:
        return 1.0, W / 2, H / 2
    if t < T.ZOOM_IN[0]:
        u = smooth(u_of(t, T.PUSH))
        return 1 + 0.32 * u, W / 2, lerp(H / 2, WIN_XY[1], u)
    if t < T.IRIS_IN[0]:
        u = u_of(t, T.ZOOM_IN)
        return 1.32 * (7.0 / 1.32) ** (u ** 2.0), WIN_XY[0], lerp(WIN_XY[1], RING_XY[1], smooth(u))
    if t < T.IRIS_IN[1]:
        return 7.0 * (16.0 / 7.0) ** ease_out(u_of(t, T.IRIS_IN), 3.2), RING_XY[0], RING_XY[1]
    if t < T.IRIS_OUT[0]:
        return None
    if t < T.ZOOM_OUT[0]:
        return 10.0 * 0.8 ** u_of(t, T.IRIS_OUT), RING_XY[0], RING_XY[1]
    if t < T.ZOOM_OUT[1]:
        u = ease_out(u_of(t, T.ZOOM_OUT), 3)
        return 8.0 ** (1 - u), RING_XY[0], lerp(RING_XY[1], H / 2, u)
    return 1.0, W / 2, H / 2


def shake(t, fps, amp):
    if amp <= 0.05:
        return 0, 0
    r = np.random.default_rng(int(round(t * fps)) * 7919 + 13)
    return int(round(r.uniform(-1, 1) * amp)), int(round(r.uniform(-1, 1) * amp))


# ---------------------------------------------------------------- machine state
def lid_angle(t):
    if t < T.LID_CLOSE[0]:
        return M.OPEN_DEG
    if t < T.LID_CLOSE[1]:
        return M.OPEN_DEG * (1 - ease_in(u_of(t, T.LID_CLOSE), 2.2))
    if t < T.UNLOCK:
        tau = t - T.THUNK
        return 5.0 * math.sin(tau / 0.14 * math.pi) * (1 - tau / 0.14) if tau < 0.14 else 0.0
    if t < T.LID_OPEN[1]:
        u = u_of(t, T.LID_OPEN)
        if u < 0.16:
            return 7.0 * ease_out(u / 0.16, 2)
        return 7.0 + (M.OPEN_DEG - 7.0) * back_out((u - 0.16) / 0.84, 1.3)
    return M.OPEN_DEG


def machine_state(t, fps):
    st = M.State(lid=max(0.0, lid_angle(t)))
    st.theta = T.rotor_angle(t)
    st.blur = 2 * math.pi * T.omega(t) / fps
    st.caps = (0, 4) if T.INSERT[1] <= t < T.LIFT[1] else (4,)
    st.lcd_on = t >= T.POWER
    if t < T.SPIN0:
        st.lcd = '   0'
    elif t < T.STOP:
        st.lcd = '%4d' % T.rpm(t)
    else:
        st.lcd, st.lcd_blink = ' End', False
    st.progress = u_of(t, (T.SPIN0, T.STOP))
    if t < T.POWER:
        st.led = None
    elif t < T.START_BTN or t >= T.STOP:
        st.led = TL[6]
    else:
        st.led = PL[5] if int(t * 4) % 2 == 0 else PL[3]
    st.press = {'start': 1.0 if T.START_BTN <= t < T.START_BTN + 0.12 else 0.0,
                'open': 1.0 if T.UNLOCK - 0.12 <= t < T.UNLOCK else 0.0}
    st.lit = {'start': T.START_BTN <= t < T.STOP}
    return st


def tube_in_slot(t, oy):
    """(x, y, sep) while the tube is in, entering or leaving the front slot and the lid is open; else None."""
    ix, iy = inserted_xy(oy)
    hx, hy = hover_xy(oy)
    if T.INSERT[0] <= t < T.INSERT[1]:
        return ix, lerp(hy, iy, ease_in(u_of(t, T.INSERT), 2.2)), 0.0
    if T.INSERT[1] <= t < T.LID_CLOSE[1]:
        tau = t - T.CLINK
        return ix, iy - (1 if 0.03 < tau < 0.1 else 0), 0.0
    if T.UNLOCK <= t < T.LIFT[0]:
        return ix, iy, 1.0
    if T.LIFT[0] <= t < T.LIFT[1]:
        return ix, lerp(iy, hy, ease_out(u_of(t, T.LIFT), 2.5)), 1.0
    return None


def tube_free(t):
    """(x, y, scale, angle, sep, squash) of the tube when it is out of the machine, else None."""
    if t < T.SLIDE[0]:
        return RED_XY[0], RED_XY[1] + 2.0 * math.sin(2 * math.pi * 0.9 * t), S_HOOK, 0.0, 0.0, 1.0
    if t < T.SLIDE[1]:
        u = ease_in_out(u_of(t, T.SLIDE), 3)
        bob = 2.0 * math.sin(2 * math.pi * 0.9 * t) * (1 - u)
        return lerp(RED_XY[0], CENTER_XY[0], u), lerp(RED_XY[1], CENTER_XY[1], u) + bob, \
            lerp(S_HOOK, 0.82, u), -0.18 * math.sin(math.pi * u), 0.0, 1.0
    if t < 1.6:
        u = u_of(t, (1.5, 1.6))
        return CENTER_XY[0], CENTER_XY[1] + 4 * math.sin(math.pi * u), 0.82, 0.0, 0.0, 1 - 0.08 * math.sin(math.pi * u)
    if t < T.FLY[1]:
        u = ease_in_out(u_of(t, (1.6, T.FLY[1])), 2.2)
        hx, hy = hover_xy(machine_oy(t))
        s = 0.82 * (S_SLOT / 0.82) ** u
        return lerp(CENTER_XY[0], hx, u), lerp(CENTER_XY[1], hy, u) - 34 * math.sin(math.pi * u), s, \
            -2 * math.pi * u, 0.0, 1 + 0.1 * math.sin(math.pi * u)
    if t < T.LIFT[1]:
        return None
    if t < T.FLY_OUT[1]:
        u = ease_in_out(u_of(t, T.FLY_OUT), 2.4)
        hx, hy = hover_xy(OY)
        s = S_SLOT * (S_REVEAL / S_SLOT) ** u
        return lerp(hx, CENTER_XY[0], u), lerp(hy, CENTER_XY[1], u) - 46 * math.sin(math.pi * u), s, \
            0.3 * math.sin(2 * math.pi * u) * (1 - u), 1.0, 1.0
    # reveal and final close-up
    s = S_REVEAL + (S_FINAL - S_REVEAL) * smooth(u_of(t, (21.0, T.TOTAL)))
    y = CENTER_XY[1] + 1.5 * math.sin(2 * math.pi * 0.7 * (t - T.REVEAL))
    squash = 1.0
    if T.REVEAL <= t < T.REVEAL + 0.2:            # lands with a little squash
        squash = 1 - 0.07 * math.sin(math.pi * u_of(t, (T.REVEAL, T.REVEAL + 0.2)))
    hu = u_of(t, (T.HOP, T.HOP + 0.3))
    if 0 < hu < 1:
        y -= 9 * math.sin(math.pi * hu)
    lu = u_of(t, (T.HOP + 0.3, T.HOP + 0.42))
    if 0 < lu < 1:
        squash = 1 - 0.06 * math.sin(math.pi * lu)
    return CENTER_XY[0], y, s, 0.0, 1.0, squash


# ---------------------------------------------------------------- text helpers
def words(buf, parts, cx, y, scale=2, fade=0.0, flash=False):
    """Centred line made of (text, colour) parts, with outline and shadow; fade dissolves it (SNES style)."""
    widths = [pixfont.text_size(s, scale=scale)[0] for s, _ in parts]
    sp = 4 * scale
    total = sum(widths) + sp * (len(parts) - 1)
    x = cx - total / 2
    keep = 1 - fade
    for (s, col), w in zip(parts, widths):
        mk = pixfont.text_mask(s, x, y, anchor='lt', scale=scale)
        if not mk.empty() and keep > 0:
            gfx.fill_dither(buf, mk.dilate(scale, diag=True).shifted(scale, scale), None, BG[0], keep)
            gfx.fill_dither(buf, mk.dilate(scale, diag=True), None, OUTLINE, keep)
            gfx.fill_dither(buf, mk, None, MW[8] if flash else col, keep)
        x += w + sp


# ---------------------------------------------------------------- the stage picture (hook, machine, reveal)
def stage(t, fps):
    c = cam_scroll(t)
    oy = int(round(machine_oy(t)))
    buf = np.empty((H, W, 3), np.uint8)
    M.draw_room(buf, OX, oy, t, wall_off=-(STAGE - c), glow=1.0 if c > 0 else 0.0)
    sy = -c                                   # stage elements' screen offset
    # warm glow + rays behind the reveal, cool glow behind the hook
    if t < 2.2:
        fx.glow(buf, 135, 250 + sy, 150, 190, (BG[3], BG[4]), 1.0)
    if t >= 18.0:
        a = clamp01((t - 18.4) / 0.9)
        fx.glow(buf, 135, 236 + sy, 170, 230, (BG[3], BG[4], GOLD_DIM), 0.6 + 0.5 * a)
        fx.rays(buf, 135, 236 + sy, t, n=10, col=GOLD_DIM, a=0.42 * a, spin=0.18, rmax=260)
    fx.dust(buf, t, 26, 8, BG[5], 5.0)

    # ---- the machine
    if oy < H + 140:
        st = machine_state(t, fps)
        amp = clamp01((T.omega(t) - 9.0) / 18.0) * 1.2
        if T.THUNK <= t < T.THUNK + 0.15:
            amp = max(amp, 2.0 * (1 - (t - T.THUNK) / 0.15))
        dx, dy = shake(t, fps, amp)
        ox, oym = OX + dx, oy + dy
        slot = tube_in_slot(t, oym)
        if slot is not None and st.lid > 0.5:
            sx, syy, sep = slot
            st.hide_front = True
            st.tube_fn = lambda b, sx=sx, syy=syy, sep=sep: tube.draw(b, sx, syy, S_SLOT, sep=sep,
                                                                         clip=M.slot_clip(ox, oym))
        M.draw(buf, ox, oym, st, t)
        spd = clamp01((T.omega(t) - 6.0) / 16.0)
        wx, wy = M.window_center(ox, oym)
        fx.speed_arcs(buf, wx, wy + 2, t, spd, rx0=88, spin=6.0 + 6.0 * spd)
        if spd > 0.3:
            fx.shake_marks(buf, ox - M.HW - 3, oym + 80, t, spd, -1)
            fx.shake_marks(buf, ox + M.HW + 2, oym + 80, t, spd, 1)
        if T.CLINK <= t < T.CLINK + 0.35:
            sx0, sy0 = M.slot_center(ox, oym)
            fx.burst(buf, t, T.CLINK, sx0, sy0 - 6, 31, n=10, speed=(40, 80), life=0.32, cols=(MW[8], TL[6]))
        if T.THUNK <= t < T.THUNK + 0.4:
            fx.poof(buf, t, T.THUNK, ox - 70, oym + 30, 41, n=6, rad=14, life=0.35)
            fx.poof(buf, t, T.THUNK, ox + 70, oym + 30, 42, n=6, rad=14, life=0.35)
        if T.UNLOCK <= t < T.UNLOCK + 0.4:
            fx.poof(buf, t, T.UNLOCK, ox - 64, oym + 2, 43, n=6, rad=12, life=0.4)
            fx.poof(buf, t, T.UNLOCK, ox + 64, oym + 2, 44, n=6, rad=12, life=0.4)
        if T.LIFT[0] + 0.15 <= t < T.LIFT[1] + 0.3:
            fx.twinkles(buf, t, ox - 30, oym - 80, ox + 30, oym - 10, 10, 44, (MW[8], PL[7]))

    # ---- hook stage: the twin, the words, the spin icon
    if t < 1.6:
        hy = sy
        tp = u_of(t, (T.TWIN_POP, T.TWIN_POP + 0.28))
        gone = u_of(t, (T.TWIN_POOF, T.TWIN_POOF + 0.12))
        if t >= T.TWIN_POP and gone < 1:
            s = S_HOOK * back_out(tp, 2.2) * (1 - ease_in(gone, 2))
            bob = 2.0 * math.sin(2 * math.pi * 0.9 * t + 1.7)
            tube.draw(buf, TWIN_XY[0], TWIN_XY[1] + bob + hy, s, sep=1.0,
                      glint=(-40 + 380 * u_of(t, (0.62, 0.95))) if t < 0.95 else None)
            if t < T.TWIN_POOF:
                fx.twinkles(buf, t, TWIN_XY[0] - 34, TWIN_XY[1] - 110 + hy, TWIN_XY[0] + 34, TWIN_XY[1] + 110 + hy,
                            12, 51, (MW[8], PL[7]), a=clamp01((t - 0.55) / 0.2),
                            avoid=lambda x, y: abs(x - TWIN_XY[0]) < 22)
        fx.burst(buf, t, T.TWIN_POP, TWIN_XY[0], TWIN_XY[1] + hy, 52, n=18, speed=(70, 140), life=0.5)
        fx.poof(buf, t, T.TWIN_POOF, TWIN_XY[0], TWIN_XY[1] + hy, 53)
        fade = u_of(t, (T.TWIN_POOF, T.TWIN_POOF + 0.25))
        lift = 10 * ease_in(fade, 2)
        if fade < 1:
            pa = u_of(t, (0.0, 0.18))
            off = -8 * (1 - back_out(pa, 2.4))
            words(buf, [('ONE', MW[7]), ('SPIN.', TL[6])], RED_XY[0], 122 + off - lift + hy, 2, fade, t < 0.05)
            if t >= T.TWIN_POP:
                pb = u_of(t, (T.TWIN_POP, T.TWIN_POP + 0.18))
                off = -8 * (1 - back_out(pb, 2.4))
                words(buf, [('TWO', MW[7]), ('LAYERS.', PL[6])], TWIN_XY[0], 122 + off - lift + hy, 2, fade,
                      t < T.TWIN_POP + 0.05)
            ic = u_of(t, (-0.2, 0.0)) * (1 - fade)
            if ic > 0:
                fx.spin_icon(buf, 135, 238 + hy, t, r=max(2, int(round(10 * back_out(ic, 2)))), speed=7.0)
                if ic > 0.6:
                    fx.arrow_right(buf, 135, 266 + hy, MW[7], 18)

    # ---- the free tube (hook, flight into the slot, flight out, reveal)
    fr = tube_free(t)
    if fr is not None:
        x, y, s, ang, sep, sq = fr
        glint = None
        if T.GLINT <= t < T.GLINT + 0.5:
            glint = -40 + 360 * ease_in_out(u_of(t, (T.GLINT, T.GLINT + 0.5)), 2)
        if T.REVEAL - 0.05 <= t < T.REVEAL + 0.45:
            glint = -40 + 360 * u_of(t, (T.REVEAL - 0.05, T.REVEAL + 0.45))
        tube.draw(buf, x, y, s, ang=ang, sep=sep, glint=glint, squash=sq)
        if t >= T.REVEAL - 0.1:
            reveal_fx(buf, t, x, y, s)
    return buf


def reveal_fx(buf, t, x, y, s):
    fx.burst(buf, t, T.REVEAL, x, y - 30, 61, n=30, speed=(90, 190), life=0.9)
    fx.ring_wave(buf, t, T.REVEAL, x, y, 120, 0.6, PL[6], 1.0)
    fx.twinkles(buf, t, x - 80, y - 150, x + 80, y + 150, 22, 62, (MW[8], PL[7], PL[5]),
                a=clamp01((t - T.REVEAL) / 0.4), avoid=lambda xx, yy: abs(xx - x) < 30 * s)
    py = tube.to_canvas(x, y, s, 0, tube.layer_mid('plasma'))[1]
    ry = tube.to_canvas(x, y, s, 0, tube.layer_mid('rbc'))[1]
    edge = (tube.R_OUT + 2.5) * s
    fx.label(buf, t, T.LABEL_PLASMA, x - edge, py, -1, ['PLASMA'], PL[6])
    fx.label(buf, t, T.LABEL_RBC, x + edge, ry, +1, ['RED BLOOD', 'CELLS'], BL[6])


# ---------------------------------------------------------------- final frame at output resolution
def micro_zoom(t):
    return 1.0 + 0.3 * (1 - ease_out(u_of(t, (T.IRIS_IN[0], T.IRIS_IN[0] + 0.7)), 3))


def iris_radius(t):
    if T.IRIS_IN[0] <= t < T.IRIS_IN[1]:
        return 290 * ease_out(u_of(t, T.IRIS_IN), 2.5)
    if T.IRIS_OUT[0] <= t < T.IRIS_OUT[1]:
        return 290 * (1 - ease_in(u_of(t, T.IRIS_OUT), 2.5))
    return None


def render(t, fps=30, scale=gfx.SCALE):
    """The finished frame at film time t: (H*scale, W*scale, 3) uint8."""
    cam = cam_machine(t)
    r = iris_radius(t)
    inside = T.IRIS_IN[0] <= t < T.IRIS_OUT[1]
    if cam is not None:
        out = gfx.camera(stage(t, fps), cam[0], cam[1], cam[2], scale)
    if inside:
        zm = micro_zoom(t)
        hi_u = gfx.camera(micro.render(t), zm, W / 2, H / 2, scale)
        if r is None or cam is None:
            out = hi_u
        else:
            m = fx.iris_mask(W / 2, H / 2, r)
            ring = np.zeros((H, W, 3), np.uint8)
            fx.iris_ring(ring, W / 2, H / 2, r)
            ring_m = ring.any(-1)
            m_hi = gfx.upscale(m[..., None], scale)[..., 0]
            out[m_hi] = hi_u[m_hi]
            rh = gfx.upscale(ring_m[..., None], scale)[..., 0]
            out[rh] = gfx.upscale(ring, scale)[rh]
    # flashes on the accents (SNES colour math, 16 steps)
    for t0, k0, dur in ((T.IRIS_IN[0], 0.6, 0.14), (T.ZOOM_OUT[0], 0.35, 0.1), (T.REVEAL, 0.45, 0.14)):
        if t0 <= t < t0 + dur:
            out = gfx.whiten(out, k0 * (1 - (t - t0) / dur))
    if t >= T.OUTRO[0]:
        out = gfx.brightness(out, 1 - ease_in(u_of(t, T.OUTRO), 2.0))
    return out
