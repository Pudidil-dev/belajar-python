"""What is on screen at time t: a top-down 3/4 camera over the blister line, one locked shot per stage.

The hook is a close-up of the hero's card held up to the camera: the foil bursts and the capsule flies out at us,
then hangs there while a text box asks how it got in there. Then a tape glitch, and one locked shot per stage, each
cut on the beat: STAGE 1 (the pockets are blown into the film), STAGE 2 (capsules rain into the pockets), STAGE 3 (the
scanner), STAGE 4 (the foil and the hot roller), STAGE 5 (the punch and the stack). In each shot the line flows down
the screen through the station. A boss warning, then the final boss: a hand that takes the hero's card off the stack
and lifts it to the camera, where the thumb presses until the first frame comes round again.
"""
import math
import numpy as np
from . import gfx
from . import world as Wd
from . import timeline as T
from . import view as Vw
from . import line as L
from . import stations as ST
from . import hand as Hd
from . import hud as HU
from . import fx as FX
from . import pix
from .palette import YELLOW, REJ, PASS, WHITE

W, H = gfx.W, gfx.H

SHOT_CAM = {                                   # each stage framed its own way, so a cut reads as a new place
    'mold': (0.0, T.Y_FORM + 10.0, 3.4),
    'fill': (0.0, T.Y_DROP + 10.0, 2.9),
    'scan': (-4.0, T.Y_SCAN + 4.0, 4.1),
    'seal': (0.0, T.Y_SEAL + 12.0, 3.05),
    'cut': (0.0, T.Y_PRESS - 34.0, 2.7),
}

# ---------------------------------------------------------------- the close-up on the held card
STACK_X, STACK_Y = ST.STACK_XY
HERO_L = (T.COLS[T.HERO[2]], T.CARD_L / 2 - T.ROW * (T.HERO[1] + 0.5))    # the hero's pocket on its card (11, 7.5)
Z_TOP = 2.4 * (T.STACK_BASE + 1)               # the hero's card on top of the stack
S_CU = 2.7
CARD_SY = 252.0                                # the held card's centre on the canvas
ZOOM_END = 1.08                                # the slow push-in while the thumb presses


def cu_cam(zoom=1.0):
    """The camera on the held card; zoom > 1 pushes in about the hero's pocket, which stays put on the canvas."""
    k1 = S_CU * Vw.kz(T.Z_HELD)
    px0 = W / 2 + HERO_L[0] * k1
    py0 = CARD_SY - HERO_L[1] * k1
    s = S_CU * zoom
    k = s * Vw.kz(T.Z_HELD)
    cx = STACK_X + HERO_L[0] - (px0 - W / 2) / k
    cy = STACK_Y + HERO_L[1] + Vw.OBL * T.Z_HELD + (py0 - H / 2) / k
    return cx, cy, s


def camera(S):
    sh = T.shot(S)
    if sh == 'hook':
        return cu_cam(ZOOM_END)
    if S >= T.FINAL:
        a = SHOT_CAM['cut']
        b = cu_cam(T.lerp(1.0, ZOOM_END, T.ease_in_out(T.u_of(S, T.PRESS), 2.0)))
        k = T.ease_in_out(T.u_of(S, T.LIFT), 2.0)
        return tuple(T.lerp(a[i], b[i], k) for i in range(3))
    return SHOT_CAM[sh]


def held_z(S):
    if S < 2.0:
        return T.Z_HELD
    return T.lerp(Z_TOP, T.Z_HELD, T.ease_in_out(T.u_of(S, T.LIFT), 2.0))


def tremble(S):
    """The card shakes a little in the hand as the thumb pushes harder (mm)."""
    p = T.press(S) if S >= T.PRESS[0] else (1.0 if S < 0.05 else 0.0)
    if p <= 0:
        return 0.0, 0.0
    n = int(S * 30)
    return 0.22 * p * ((n * 7) % 3 - 1), 0.22 * p * ((n * 5) % 3 - 1)


def hand_at(S):
    """The index fingertip's world (x, y, z), or None while the hand is off stage."""
    if 2.0 <= S < T.HAND_IN[0]:
        return None
    zc = held_z(S)
    ax, ay = STACK_X + 2.0, STACK_Y - 24.0
    if S < 2.0 or S >= T.HAND_IN[1]:
        return ax, ay, zc + 2.0
    k = T.ease_out(T.u_of(S, T.HAND_IN), 2.6)
    return ax, ay - 95.0 * (1 - k), T.lerp(46.0, zc + 2.0, k)


def torn(S):
    """The foil over the hero's pocket bursting open in the hook (0..1), and closing again as the tape rewinds."""
    if S >= 2.0:
        return 0.0
    if S >= T.REW[0]:
        return 1.0 - T.u_of(S, (1.88, 1.99))
    return T.ease_out(T.u_of(T.tau(S), (0.0, 0.1)), 2.0)


POP_TO = (126.0, 148.0)                        # where the capsule hangs in the hook (canvas)
POP_S = 12.5                                   # and how big (canvas px per mm)


def flight(S):
    """How far the capsule has flown out of its pocket toward the camera (0..1); back in as the tape rewinds."""
    if S >= T.REW[0]:
        k0 = T.ease_out(T.tau(T.REW[0]) / 0.42, 2.4)
        return k0 * (1 - T.ease_in(T.u_of(S, (T.REW[0], 1.97)), 1.5))
    return T.ease_out(T.tau(S) / 0.42, 2.4)


def pill_pose(c, S):
    """The flying capsule on the canvas: (x, y, scale, angle)."""
    k = flight(S)
    x0, y0 = Vw.to(c, STACK_X + HERO_L[0], STACK_Y + HERO_L[1], T.Z_HELD - T.POCKET_D + T.CAP_R)
    s0 = c.s * Vw.kz(T.Z_HELD - T.POCKET_D + T.CAP_R)
    te = T.tau(S) if S < T.REW[0] else T.tau(T.REW[0])
    bob = math.sin(S * 2 * math.pi * 1.0) * 1.2 * T.u_of(S, (0.5, 0.8)) if S < T.REW[0] else 0.0
    x = T.lerp(x0, POP_TO[0], k)
    y = T.lerp(y0, POP_TO[1], k) - 26.0 * math.sin(math.pi * min(k, 1.0)) * (1 - k) + bob
    s = T.lerp(s0, POP_S, T.ease_out(k, 1.3))
    ang = -26.0 * k - 30.0 * max(0.0, te - 0.2) * k
    return x, y, s, ang


# ---------------------------------------------------------------- the line
def view_y(c):
    half = H / 2 / c.s
    return c.cy - half - 20.0, c.cy + half + 70.0


def hop_pose(card, S):
    """A good card hopping from the die onto the stack: (x, y, z), or None."""
    t = T.strike_time(card)
    if not (t <= S < t + T.HOP):
        return None
    k = (S - t) / T.HOP
    below = len([x for x in T.stack_cards(t + T.HOP) if x is not None and x != card]) + T.STACK_BASE
    z_top = 2.4 * below
    return 0.0, T.lerp(T.Y_PRESS, STACK_Y, T.smooth(k)), T.lerp(0.5, z_top, k) + 28.0 * math.sin(math.pi * k)


def line_frame(buf, c, S, sh, hero_off_stack=False):
    y_lo, y_hi = view_y(c)
    ST.floor(buf, c, S)
    ST.bed(buf, c, S, y_lo, y_hi)
    if sh == 'mold':
        ST.mold_under(buf, c, S)
    if sh == 'scan':
        ST.scan_under(buf, c, S)
    if sh == 'cut':
        ST.cut_under(buf, c, S)
        y_lo = max(y_lo, ST.SLOT_Y + 1.0)
    # the film (clear above the sealing roller, foil below it)
    ys = T.Y_SEAL
    if y_hi > ys:
        heat = (T.Y_FORM + 34.0, T.Y_FORM + 76.0) if sh == 'mold' else None
        L.film(buf, c, S, max(y_lo, ys), y_hi, heat=heat)
        c0 = int(math.floor((-y_hi - T.web(S)) / T.CARD_L)) - 1
        c1 = int(math.floor((-max(y_lo, ys) - T.web(S)) / T.CARD_L)) + 1
        for card in range(c0, c1 + 1):
            for row in range(T.ROWS):
                v = T.pocket_v(card, row)
                y = T.y_of(v, S)
                if not (max(y_lo, ys) - 8 < y < y_hi + 8):
                    continue
                d = T.POCKET_D * T.formed(v, S)
                glow = sh == 'scan' and abs(y - T.Y_SCAN) < 6.5
                for col in range(2):
                    pill = T.has_pill(card, row, col, S)
                    lt = T.land_time(card, row)
                    nud = (0.0, 0.0)
                    if pill and 0 <= S - lt < 0.1:
                        nud = (0.0, -0.5 * math.sin(math.pi * (S - lt) / 0.1))
                    L.pocket(buf, c, T.COLS[col], y, d, pill=pill or None, glow=glow and not pill, nudge=nud)
    if y_lo < ys:
        L.foil_web(buf, c, S, y_lo, min(ys, y_hi))
    L.clips(buf, c, S, y_lo, y_hi)
    if sh == 'cut':                                    # punched-out cards leave holes in the web
        for card in range(-2, 6):
            if T.is_cut(card, S):
                yc = T.y_of(T.card_v(card), S)
                w = pix.win(c, -L.CARD_HW, L.CARD_HW, yc - L.CARD_HL, yc + L.CARD_HL)
                if w is not None:
                    X, Y = np.broadcast_arrays(w.X, w.Y)
                    m = pix.rrect(X, Y, -L.CARD_HW, L.CARD_HW, yc - L.CARD_HL, yc + L.CARD_HL, 3.0) & \
                        (Y > ST.SLOT_Y + 1.0)
                    v = w.view(buf)
                    v[m] = L.BED[1]
                    v[m & ((((Y + 2000.0) % 30.0) < 0.7))] = L.BED[0]
                    v[m & (Y > yc + L.CARD_HL - 3.0)] = L.BED[0]          # the web's cut edge throws a shadow
                    v[pix.edge(m)] = L.FOIL[1]
    # the stations over the film
    if sh == 'mold':
        ST.mold_over(buf, c, S)
    elif sh == 'fill':
        ST.draw_falling(buf, c, S)
        ST.draw_falling(buf, c, S, hero_only=True)
        ST.fill_over(buf, c, S)
    elif sh == 'scan':
        ST.scan_laser(buf, c, S)
        ST.scan_over(buf, c, S)
    elif sh == 'seal':
        ST.seal_over(buf, c, S)
    elif sh == 'cut':
        cards = T.stack_cards(S)
        n = len(cards) - (1 if hero_off_stack and T.HERO[0] in cards else 0)
        L.stack(buf, c, STACK_X, STACK_Y, n)
        _flying_cards(buf, c, S)
        ST.cut_over(buf, c, S)


def _flying_cards(buf, c, S):
    # the rejected card: lifted, then blasted off to the left, spinning
    t = T.strike_time(T.REJECT_CARD)
    if t <= S < t + 0.7:
        k = (S - t) / 0.7
        x = -150.0 * T.ease_in(k, 1.6)
        z = 10.0 * math.sin(math.pi * min(k * 1.6, 1.0))
        L.card(buf, c, x, T.Y_PRESS + 2.0 * k, z, ang=300.0 * T.ease_in(k, 1.4), reject=True)
    # good cards hop from the die onto the stack
    for card in (2, 0):
        p = hop_pose(card, S)
        if p is not None:
            L.card(buf, c, p[0], p[1], p[2])


def reject_xy(c, S):
    t = T.strike_time(T.REJECT_CARD)
    k = (S - t) / 0.7
    return Vw.to(c, -150.0 * T.ease_in(k, 1.6), T.Y_PRESS, 10.0 * math.sin(math.pi * min(k * 1.6, 1.0)))


# ---------------------------------------------------------------- where the hero is (for the tag and the effects)
def hero_xy(c, S, sh):
    """The hero's place on the canvas in this shot (the tag points at it), or None."""
    card, row, col = T.HERO
    v = T.pocket_v(card, row)
    x, y = T.COLS[col], T.y_of(v, S)
    if sh == 'fill':
        if ST.hero_in_hopper(S):
            hx, hy, hz, _a = ST.hero_pile(S)
            return Vw.to(c, hx, hy, hz)
        for fx_, fy_, fz_, _a, hero, _m in ST.falling(S):
            if hero:
                return Vw.to(c, fx_, fy_, fz_)
    if sh == 'cut' or S >= T.FINAL:
        if S >= T.FINAL:
            return Vw.to(c, STACK_X + HERO_L[0], STACK_Y + HERO_L[1], held_z(S))
        p = hop_pose(card, S)
        if p is not None:
            return Vw.to(c, p[0] + HERO_L[0], p[1] + HERO_L[1], p[2])
        if S >= T.strike_time(card) + T.HOP:
            return Vw.to(c, STACK_X + HERO_L[0], STACK_Y + HERO_L[1], Z_TOP)
    return Vw.to(c, x, y, 0.0)


# ---------------------------------------------------------------- the hold (final and hook)
def draw_hold(buf, c, S):
    """The hand and the hero's card above the line: the thumb under the card, the card, the fingers on top."""
    zc = held_z(S)
    jx, jy = tremble(S)
    cx, cy = STACK_X + jx, STACK_Y + jy
    hp = hand_at(S)
    if hp is not None:
        Hd.draw(buf, c, hp[0] + jx, hp[1] + jy, hp[2], thumb_only=True)
    if zc > Z_TOP + 0.5:                               # the card's thickness along its front edge
        L.card_edge(buf, c, cx, cy, zc)
    L.card(buf, c, cx, cy, zc, hero_tag=True, bump=T.press(S), torn=torn(S), shadow=zc > Z_TOP + 0.5)
    if hp is not None:
        Hd.draw(buf, c, hp[0] + jx, hp[1] + jy, hp[2])


def hand_shadow(buf, c, S):
    """The boss's shadow creeping up the screen during the warning: a big, dark hand shape over the line."""
    a, b = T.WARN[0] + 0.1, T.FINAL + 0.45
    if not (a <= S < b):
        return
    k = T.ease_out(T.u_of(S, (a, T.FINAL)), 1.5)
    cs = Wd.Cam(c.cx, c.cy, c.s * 1.45)
    tip_y = T.lerp(H + 6.0, 250.0, k)                 # the fingertips' height on the canvas
    ay = cs.cy - (tip_y - H / 2) / cs.s
    tmp = np.zeros_like(buf)
    Hd.draw(tmp, cs, STACK_X - 4.0, ay, 0.0)
    m = Wd.erode(Wd.dilate(tmp.any(axis=2)))          # closed, so the gaps between the fingers fill in
    fade = T.u_of(S, (T.FINAL, b))
    if fade > 0.5:
        m &= Wd.CHECK
    if fade >= 1:
        return
    buf[m] = (buf[m].astype(np.uint16) * 2 // 5).astype(np.uint8)


def dim(buf, k):
    if k <= 0:
        return buf
    return (buf.astype(np.float32) * (1.0 - k)).astype(np.uint8)


# ---------------------------------------------------------------- shake
SHAKES = [(0.0, 0.3, 3)] + [(T.strike_time(cd), 0.16, 2) for cd in (2, 1, 0)] + \
    [(T.T_LAND, 0.12, 1), (T.PACKED, 0.12, 1), (T.WARN[0], 0.15, 1), (T.WARN[0] + 0.5, 0.15, 1),
     (T.GRAB, 0.2, 2), (T.FINAL, 0.25, 1)]


def shake(S):
    a = 0.0
    for t0, dur, amp in SHAKES:
        if t0 <= S < t0 + dur:
            a = max(a, amp * (1 - (S - t0) / dur))
    if a < 0.5:
        return 0, 0
    n = int(round(S * 30))
    r = np.random.default_rng(n * 97 + 13)
    A = int(round(a))
    return int(r.integers(-A, A + 1)), int(r.integers(-A, A + 1))


# ---------------------------------------------------------------- the frame
def story_frame(S):
    sh = T.shot(S)
    cx, cy, s = camera(S)
    dx, dy = shake(S)
    cam = Wd.Cam((round(cx * s) + dx) / s, (round(cy * s) + dy) / s, s)
    buf = np.empty((H, W, 3), np.uint8)
    hold = sh == 'hook' or S >= T.FINAL
    S_bg = T.TOTAL - 1e-3 if sh == 'hook' else S
    line_frame(buf, cam, S_bg, 'cut' if sh == 'hook' else sh, hero_off_stack=hold)
    # effects that belong to the line
    if sh == 'mold':
        FX.mold_fx(buf, cam, S)
    elif sh == 'fill':
        FX.fill_fx(buf, cam, S, hero_xy(cam, S, sh) if S >= T.T_LAND else None)
    elif sh == 'seal':
        FX.seal_fx(buf, cam, S)
    elif sh == 'cut' and S < T.FINAL:
        FX.cut_fx(buf, cam, S)
    if sh == 'scan':
        HU.scan_marks(buf, cam, S)
    if T.WARN[0] <= S < T.FINAL + 0.4:
        hand_shadow(buf, cam, S)
    if hold:
        buf = dim(buf, 0.45 if sh == 'hook' else 0.45 * T.smooth(T.u_of(S, (T.HAND_IN[0], T.LIFT[1]))))
        draw_hold(buf, cam, S)
    if sh == 'hook':
        px_, py_, ps, pa = pill_pose(cam, S)
        hx, hy = Vw.to(cam, STACK_X + HERO_L[0], STACK_Y + HERO_L[1], T.Z_HELD)
        if 0.04 <= S < 1.0 and flight(S) > 0.5:
            FX.focus_lines(buf, px_, py_, S)
        if S < 0.3:
            FX.speed_trail(buf, hx, hy, px_, py_)
        if flight(S) > 0.02:
            pc = Wd.Cam(-(px_ - W / 2) / ps, (py_ - H / 2) / ps, ps)
            pix.capsule(buf, pc, 0.0, 0.0, pa)
        FX.pop_fx(buf, hx, hy, S)
    if S >= T.PRESS[0]:
        hx, hy = hero_xy(cam, S, sh)
        FX.press_fx(buf, hx, hy, S)
    hud_layer(buf, cam, S, sh)
    buf = HU.warning(buf, S)
    if S < 0.1:                                        # the pop's flash
        buf = gfx.whiten(buf, 0.55 * (1 - S / 0.1))
    return FX.cut_flash(buf, S)


HERO_POPS = (('PERFECT!', T.T_LAND, 0.62, YELLOW[2]), ('PASS!', T.T_SCAN, 0.6, PASS[1]),
             ('SEALED!', T.T_SEAL, 0.6, YELLOW[2]), ('PACKED!', T.PACKED, 0.62, YELLOW[2]))


def hud_layer(buf, c, S, sh):
    HU.stage_title(buf, S)
    HU.dialogue(buf, S)
    HU.foil_bar(buf, S, T.press(S))
    # the player tag; the hero's own pop-ups take its place for a moment
    if sh != 'hook' and S < T.PRESS[0] - 0.15:
        p = hero_xy(c, S, sh)
        if p is not None:
            lift = 14.0 if (sh in ('mold', 'scan', 'seal') or (sh == 'fill' and S >= T.T_LAND)) else 0.0
            mine = [e for e in HERO_POPS if e[1] <= S < e[1] + e[2]]
            if mine:
                text, t0, dur, col = mine[0]
                HU.pop(buf, text, p[0], p[1] - lift - 24, S, t0, t0 + dur, col, scale=3)
            elif not (HU.title_up(S) and p[1] - lift < 140):
                HU.tag(buf, p[0], p[1] - lift, 'YOUR POCKET' if sh == 'mold' else 'YOU', S)
    # other pop-ups
    if sh == 'fill':
        for x, y, z, _a, _h, miss in ST.falling(S):
            if miss:
                sx, sy = Vw.to(c, x, y, z)
                t0 = T.land_time(*T.MISS[:2])
                HU.pop(buf, 'MISS!', sx - 4, sy - 34, S, t0, t0 + 0.7, REJ[1], scale=3)
    if sh == 'scan':
        t0 = T.scan_time(*T.MISS[:2])
        sx, sy = Vw.to(c, T.COLS[T.MISS[2]], T.y_of(T.pocket_v(*T.MISS[:2]), S), 0.0)
        HU.pop(buf, 'EMPTY!', sx + 6, sy - 40, S, t0, t0 + 0.6, REJ[1], scale=3)
    if sh == 'cut' and S < T.FINAL:
        t0 = T.strike_time(T.REJECT_CARD)
        HU.pop(buf, 'REJECT!', 80, 248, S, t0 + 0.04, t0 + 0.5, REJ[1], scale=3)
    if T.FINAL <= S < T.LIFT[0]:                       # the hero notices the hand
        p = hero_xy(c, S, sh)
        HU.pop(buf, '!', p[0] + 30, p[1] - 30, S, T.FINAL + 0.1, T.LIFT[0], YELLOW[2], scale=4, rise=6)


def render(t, fps=30, scale=gfx.SCALE):
    out = gfx.upscale(story_frame(t), scale)
    return FX.vhs(out, t, fps, scale)


def frame(t):
    return render(t, 30, 1)


def warm():
    pass
