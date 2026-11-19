"""The film web and the blister cards cut from it, seen from the side.

One renderer draws a card (100 mm of film with five pockets) at any position and angle: the clear film, the pockets
hanging below it (blown to any depth), the capsules resting in them, and the aluminium foil sealed on top, with its
diamond knurl. The moving web is drawn as a row of such cards; after the punch, the same cards drop onto the stack,
one flies into the reject bin, and the hero's card ends up in the hand, where its pocket is pressed until the foil
bursts.
"""
import math
import numpy as np
from . import timeline as T
from . import pix
from . import machine as M
from .palette import OUTLINE, WHITE, GLASS, FOIL, HEAT, SCREEN, STEEL

R = T.CAP_R
HOLD = (T.XP + 4.0 - (T.pocket_u(T.HERO_K)), 215.0)      # where the hand holds the hero's card (its left end)


def _local(w, ox, oy, ang):
    X, Y = np.broadcast_arrays(w.X, w.Y)
    if ang == 0:
        return X - ox, Y - oy
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    dx, dy = X - ox, Y - oy
    return dx * ca + dy * sa, -dx * sa + dy * ca


def to_world(ox, oy, ang, lu, lv):
    if ang == 0:
        return ox + lu, oy + lv
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    return ox + lu * ca - lv * sa, oy + lu * sa + lv * ca


def card(buf, c, ox, oy, ang, pockets, seal_u0, clip=None, heat=False, torn_at=None, bulge=None):
    """Draw one card.

    ox, oy: world position of its left end on the film top; ang: degrees, counter-clockwise.
    pockets: five (depth, pill, glow) tuples: depth in mm, pill None/'pill'/'hero' (with an optional (dx, dy) nudge as
    a 4th item), glow True when the backlight shines through it.
    seal_u0: local u from which the foil is on (None: no foil). clip: (x0, x1) world range to draw.
    heat: tint the film inside the heater. torn_at: local u of a burst hole in the foil. bulge: (u, height) of the foil
    pushed up by a pressed pill.
    """
    pts = [to_world(ox, oy, ang, u, v) for u, v in ((-1, -10), (101, -10), (101, 5), (-1, 5))]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    w = pix.win(c, min(xs), max(xs), min(ys), max(ys))
    if w is None:
        return
    lu, lv = _local(w, ox, oy, ang)
    v = w.view(buf)
    px = 1.0 / c.s
    tw = max(0.55, px)
    keep = (lu >= 0) & (lu <= T.CARD)
    if clip is not None:
        X, _ = np.broadcast_arrays(w.X, w.Y)
        keep &= (X >= clip[0]) & (X <= clip[1])
    ck = pix.checker(w)
    film = keep & (lv >= -0.75) & (lv <= 0.0)
    inners, outers = [], []
    for i, pk in enumerate(pockets):
        d = pk[0]
        uc = T.pocket_u(i)
        if d < 0.25:
            inners.append(None)
            outers.append(None)
            continue
        outer = keep & pix.ucup(lu, lv, uc - T.POCKET_HALF - tw, uc + T.POCKET_HALF + tw, -d - tw, 0.0, 3.4)
        inner = keep & pix.ucup(lu, lv, uc - T.POCKET_HALF, uc + T.POCKET_HALF, -d, 0.6, 3.2)
        inners.append(inner)
        outers.append(outer)
        body = inner & (lv < -0.75)
        if pk[2]:
            v[body] = GLASS[3] if not pk[1] else GLASS[1]
            v[body & ck & (pk[1] is None)] = WHITE
        else:
            v[body & ck] = GLASS[1]
    # the film itself (tinted while it sits in the heater)
    v[film] = GLASS[2]
    v[film & (lv > -0.35)] = GLASS[3]
    if heat:
        X, _ = np.broadcast_arrays(w.X, w.Y)
        hz = (X > M.HEAT_X[0]) & (X < M.HEAT_X[1])
        v[film & hz] = HEAT[1]
        v[film & hz & (pix.bayer(w) < 0.5)] = HEAT[2]
    # the capsules
    for i, pk in enumerate(pockets):
        if pk[1] is None or inners[i] is None:
            continue
        nd = pk[3] if len(pk) > 3 else (0.0, 0.0)
        cu, cv = T.pocket_u(i) + nd[0], -pk[0] + R + 0.15 + nd[1]
        x, y = to_world(ox, oy, ang, cu, cv)
        pix.capsule(buf, c, x, y, ang)
    # the pocket walls, with a glint on the left wall
    for i, pk in enumerate(pockets):
        if inners[i] is None:
            continue
        uc = T.pocket_u(i)
        wall = outers[i] & ~inners[i] & (lv < 0.0)
        v[wall] = GLASS[2]
        v[wall & (lu < uc) & (lv > -pk[0] * 0.75)] = WHITE
        v[pix.ring(outers[i]) & keep & (lv < -0.75)] = GLASS[0]
    # the foil
    if seal_u0 is not None:
        lift = np.zeros_like(lu)
        if bulge is not None:
            bu, bh = bulge
            k = np.clip(1 - ((lu - bu) / 8.6) ** 2, 0, 1)
            lift = bh * k
        foil = keep & (lu >= seal_u0) & (lv >= lift) & (lv <= lift + 0.95)
        if torn_at is not None:
            hole = np.abs(lu - torn_at) < 5.6
            foil &= ~hole
            for side in (-1, 1):                         # the torn flaps, bent up
                fx = torn_at + side * 5.6
                flap = keep & (np.abs(lu - fx + side * 1.6) < 1.8) & (lv >= 0) & \
                    (lv <= 0.9 + 3.2 * np.clip(1 - np.abs(lu - fx) / 3.4, 0, 1)) & (side * (lu - fx) < 0.0)
                v[flap] = FOIL[3]
                v[pix.edge(flap)] = FOIL[1]
        v[foil] = FOIL[2]
        v[foil & ck] = FOIL[1]
        v[foil & (lv > lift + 0.55)] = FOIL[3]
        v[pix.ring(foil) & keep & (lv > lift)] = OUTLINE


# ---------------------------------------------------------------- the web on the machine
def _pockets_on_web(ci, S, Wv):
    out = []
    for i in range(T.NPOCK):
        k = ci * T.NPOCK + i
        d = T.POCKET_D * T.formed(k, S)
        pill = None
        nudge = (0.0, 0.0)
        if T.pill_in(k, S):
            pill = 'hero' if k == T.HERO_K else 'pill'
            lt = T.land_time(k)
            if lt is not None and 0 <= S - lt < 0.12:
                nudge = (0.0, 0.7 * math.sin(math.pi * (S - lt) / 0.12))
        x = T.pocket_u(k) + Wv
        glow = (M.BACK_X[0] < x < M.BACK_X[1]) and (T.SCAN_ON[0] - 0.05 <= S < T.SCAN_ON[1] + 0.05)
        out.append((d, pill, glow, nudge))
    return out


def draw_web(buf, c, S):
    Wv = T.web(S)
    half = 135.0 / c.s
    x0 = max(c.cx - half - 12, M.GUIDE_F[0])
    x1 = min(c.cx + half + 12, T.XP + 52.0)
    # the skeleton edge through the punch (cards that have been cut leave the film's edge behind)
    rr = pix.win(c, T.XP - 52.0, T.XP + 52.0, T.WEB_Y - 0.8, T.WEB_Y)
    if rr is not None:
        X, Y = np.broadcast_arrays(rr.X, rr.Y)
        rr.view(buf)[(X >= T.XP - 52) & (X <= T.XP + 52) & (Y >= T.WEB_Y - 0.75) & (Y <= T.WEB_Y)] = GLASS[2]
    if x1 <= x0:
        return
    for ci in range(int(math.floor((x0 - Wv) / T.CARD)), int(math.floor((x1 - Wv) / T.CARD)) + 1):
        ct = T.cut_time(ci)
        if ct is not None and S >= ct:
            continue
        ox = T.CARD * ci + Wv
        seal = T.XS - ox
        seal_u0 = None if seal >= T.CARD else max(0.0, seal)
        card(buf, c, ox, T.WEB_Y, 0.0, _pockets_on_web(ci, S, Wv), seal_u0, clip=(M.GUIDE_F[0], T.XP + 52.0),
             heat=True)


# ---------------------------------------------------------------- cards after the punch
def _full_card(missing=None, hero=False, depth=T.POCKET_D):
    return [(depth, None if i == missing else ('hero' if hero and i == T.HERO_K else 'pill'), False)
            for i in range(T.NPOCK)]


def hero_card_pose(S):
    """(ox, oy, ang) of the hero's card once it has been cut (None before the cut)."""
    if S >= 2.0 and S < T.THUNK_HERO:
        return None
    n = len([ci for ci in T.STACKED if T.cut_time(ci) <= T.THUNK_HERO])
    top = T.stack_top(n)
    x0 = T.XP - T.CARD / 2
    if S < 2.0:
        return HOLD[0], HOLD[1], 0.0
    if S < T.STACK_LAND:
        k = T.ease_in(T.u_of(S, (T.THUNK_HERO + 0.02, T.STACK_LAND)), 2.0)
        return x0, T.lerp(T.WEB_Y, top, k), 0.0
    if S < T.LIFT[0]:
        b = 0.8 * math.sin(math.pi * T.clamp01((S - T.STACK_LAND) / 0.1)) if S < T.STACK_LAND + 0.1 else 0.0
        return x0, top + b, 0.0
    k = T.ease_in_out(T.u_of(S, T.LIFT), 2.0)
    lift = math.sin(math.pi * k) * 4.0
    return T.lerp(x0, HOLD[0], k), T.lerp(top, HOLD[1], k) + lift, 0.0


def reject_pose(S):
    """(ox, oy, ang) of the rejected card after the punch (None before; it ends in the bin)."""
    if S >= 2.0 and S < T.THUNK_REJ:
        return None
    x0 = T.XP - T.CARD / 2
    if S >= 2.0 and S < T.BLAST:
        k = T.ease_in(T.u_of(S, (T.THUNK_REJ + 0.02, T.BLAST)), 2.0)
        return x0, T.WEB_Y - 9.0 * k, 0.0
    land = (M.BIN[0] + 6.0, 64.0, -74.0)
    if S >= 2.0 and S < T.BIN_LAND:
        k = T.u_of(S, (T.BLAST, T.BIN_LAND))
        x = T.lerp(x0, land[0], T.ease_out(k, 1.6))
        y = T.lerp(T.WEB_Y - 9.0, land[1], T.ease_in(k, 1.4)) + 14.0 * math.sin(math.pi * k)
        return x, y, land[2] * T.ease_out(k, 1.3)
    return land


def draw_after_punch(buf, c, S):
    """The stack in the bay, the rejected card (falling, blown, in the bin) and the hero's card until it is lifted."""
    for i, ci in enumerate(T.stack_cards(S)):
        if ci == T.HERO_CARD:
            continue
        card(buf, c, T.XP - T.CARD / 2, T.stack_top(i), 0.0, _full_card(), 0.0)
    rp = reject_pose(S)
    if rp is not None:
        landed = S < 2.0 or S >= T.BIN_LAND
        clip_bin = None
        if landed:
            card_clip(buf, c, rp, M.BIN[3] - 1.0)
        else:
            card(buf, c, rp[0], rp[1], rp[2], _full_card(missing=0), 0.0, clip=clip_bin)
    hp = hero_card_pose(S)
    if hp is not None and (2.0 <= S < T.GRAB + 0.001):
        card(buf, c, hp[0], hp[1], hp[2], _full_card(hero=True), 0.0)


def card_clip(buf, c, pose, ymin):
    """A card in the bin: only the part above the bin's rim shows."""
    tmp = buf.copy()
    card(tmp, c, pose[0], pose[1], pose[2], _full_card(missing=0), 0.0)
    w = pix.win(c, pose[0] - 10, pose[0] + T.CARD + 10, ymin, pose[1] + 60)
    if w is None:
        return
    _, Y = np.broadcast_arrays(w.X, w.Y)
    m = Y >= ymin
    v = w.view(buf)
    v[m] = tmp[w.sy, w.sx][m]


def hero_in_hand(S):
    """(pocket depth, foil bulge, torn) of the hero's pocket in the hand."""
    p = T.press(S)
    d = T.POCKET_D - 3.6 * p
    top = -d + 2 * R + 0.15
    return d, max(0.0, top), S < 2.0


def draw_hand_card(buf, c, S):
    """The hero's card from the moment the hand lifts it: the pressed pocket, the bulging foil, the burst."""
    if 2.0 <= S < T.GRAB + 0.001:
        return
    ox, oy, ang = hero_card_pose(S)
    d, bulge, torn = hero_in_hand(S)
    pk = []
    for i in range(T.NPOCK):
        if i == T.HERO_K:
            pk.append((d, None if torn else 'hero', False))
        else:
            pk.append((T.POCKET_D, 'pill', False))
    card(buf, c, ox, oy, ang, pk, 0.0, torn_at=T.pocket_u(T.HERO_K) if torn else None,
         bulge=None if torn else (T.pocket_u(T.HERO_K), bulge))


def hero_pocket_world(S):
    """World centre of the hero capsule while it rides in its pocket (web, falling card, stack, hand)."""
    hp = hero_card_pose(S)
    if hp is None:
        return T.pocket_u(T.HERO_K) + T.web(S), T.WEB_Y - T.POCKET_D + R + 0.15
    d = hero_in_hand(S)[0] if S >= T.GRAB else T.POCKET_D
    return to_world(hp[0], hp[1], hp[2], T.pocket_u(T.HERO_K), -d + R + 0.15)
