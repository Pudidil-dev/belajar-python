"""The film, frame by frame: where the camera is, what the DNA is doing, where Cas9 is and what it is doing, and
the effects on top. render(t) returns one finished frame.

The five scenes run on one clock (engine/timeline.py). The molecule is one object the whole way through: the same
helix is cut in the hook, rewound, searched along, cut again in close-up, repaired two base pairs shorter, and then
left behind as the camera flies on to the next target site, which is the site the film opened on: the last frame is
the first frame.
"""
import math

import numpy as np

from . import bg, cas9 as C, dna as D, fx, gfx, hud, palette as P, repair as RP, timeline as T

W, H = gfx.W, gfx.H
PHI = -2 * math.pi * D.PERIOD / D.TURN     # the helix phase that makes the next site look like the first one

# camera scales (canvas px per A)
S_HOOK = 2.15
S_CUTIN = 6.4
S_SEARCH = 3.0
S_SITE = 5.0
S_REPAIR = 3.3
S_RESULT = 1.95


def lerp(a, b, k):
    return a + (b - a) * k


# ---------------------------------------------------------------- the hook (and the frame the loop lands on)
def hook_state(t, site=D.PAM_I, phase=0.0, del_=0.0, junction=None):
    """The opening three seconds: Cas9 swoops in, clamps, cuts, and the camera rushes into the break.
    `site` lets the loop play the same opening at the next target site along the molecule; `junction` is where the
    molecule's earlier repair sits, so the loop's DNA is shifted by the same amount everywhere in view."""
    di = site - D.PAM_I
    cut = D.CUT_I + di
    junc = cut if junction is None else junction
    approach = T.smoother(T.u(t, (0.0, T.CLICK)))
    close = T.ease_out(T.u(t, (T.CLICK - 0.12, T.CLICK + 0.05)), 2.0)
    arm = T.ease_out(T.u(t, (T.CLICK + 0.05, T.SNIP1 - 0.05)), 2.0)
    split = 7.6 * T.ease_out(T.u(t, (T.SNIP1, T.SNIP1 + 0.55)), 2.4)
    drop = 4.0 * T.ease_out(T.u(t, (T.SNIP1, T.SNIP1 + 0.7)), 2.0)
    shape = D.Shape(twist=1.0, split=split, del_=del_, cut=cut, phase=phase, drop=drop)
    if junction is not None:                                 # the deletion sits back at the real junction
        shape = D.Shape(twist=1.0, split=split, del_=del_, cut=junc, phase=phase, drop=drop)
    pose = dict(i=site, side=1, y0=lerp(126.0, 0.0, approach), close=close, hnh=arm, ruvc=arm)
    # the camera: on the site, then a rush into the break (measured on the molecule, so a shift cancels)
    k = T.ease_in(T.u(t, T.RUSH), 2.2)
    s = lerp(S_HOOK, S_CUTIN, k)
    base = shape.axis(site)[0] - 1.5 * D.RISE
    cx = lerp(base, shape.axis(cut)[0] + split * 0.5, k)
    cy = lerp(6.0, 1.0, k)
    return D.Cam(cx, cy, s), shape, pose


def draw_hook(buf, t, tdraw, site=D.PAM_I, phase=0.0, del_=0.0, blend=None):
    """Draw the opening scene at time `t` (the rewind and the loop pass a different `tdraw` for the effects)."""
    cam, shape, pose = hook_state(t, site, phase, del_)
    if blend is not None:
        cam = blend(cam)
    front = 1.0 - 0.8 * T.smoother(T.u(t, (T.SNIP1 - 0.1, T.SNIP1 + 0.35)))
    bg.draw(buf, cam, tdraw)
    C.draw(buf, cam, pose, tdraw, half='back')
    D.draw(buf, cam, shape, tdraw)
    C.draw_grna(buf, cam, pose, T.N_SPACER if t > T.CLICK else 0, 9.0)
    C.draw(buf, cam, pose, tdraw, half='front', alpha=front)
    # the cut: a flash, a ring and sparks at the break
    if T.SNIP1 <= t < T.SNIP1 + 0.9:
        bx, by = cam.to(*shape.axis(D.CUT_I + site - D.PAM_I))
        fx.ring_wave(buf, t, T.SNIP1, bx, by, 150, 0.45, P.FLASH[0])
        fx.burst(buf, t, T.SNIP1, bx, by, 77, n=26, speed=(140, 300), life=0.55,
                 cols=(P.WHITE, P.FLASH[0], P.HNH[4], P.RUVC[6]))
    return cam, shape, pose


# ---------------------------------------------------------------- the search
def search_i(t):
    """Which base pair Cas9 is sitting on while it hunts for a PAM."""
    if t < T.SLIDE1[0]:
        return D.DECOY_I - 15.0
    if t < T.SLIDE1[1]:
        return lerp(D.DECOY_I - 15.0, D.DECOY_I, T.smoother(T.u(t, T.SLIDE1)))
    if t < T.SLIDE2[0]:
        return float(D.DECOY_I)
    if t < T.SLIDE2[1]:
        return lerp(D.DECOY_I, D.PAM_I, T.smoother(T.u(t, T.SLIDE2)))
    return float(D.PAM_I)


def paired_count(t):
    n = 0
    for j in range(T.N_SPACER):
        if t >= T.pair_time(j):
            n = j + 1
    return n


def state(t):
    """Everything the frame needs, outside the hook and the loop."""
    st = {}
    # --- the DNA
    twist = 1.0
    if T.XRAY[0] <= t < T.KU_OFF[0]:
        twist = 1 - T.smoother(T.u(t, T.XRAY))
    elif T.KU_OFF[0] <= t:
        twist = T.smoother(T.u(t, (T.KU_OFF[0], T.RESULT[0] - 0.4)))
    split, drop, del_ = 0.0, 0.0, 0.0
    if t >= T.SNIP2:
        split = 17.0 * T.ease_out(T.u(t, (T.SNIP2, T.SLOWMO[1] - 0.2)), 1.6)
        drop = 5.5 * T.ease_out(T.u(t, (T.SNIP2, T.SLOWMO[1])), 1.8)
    if t >= T.JOIN[0]:
        split *= 1 - 0.62 * T.smoother(T.u(t, T.JOIN))
        drop *= 1 - T.smoother(T.u(t, T.JOIN))
    if t >= T.TRIM[0]:
        del_ = D.DEL * T.smoother(T.u(t, T.TRIM))
    if t >= T.CLOSE[0]:
        split *= 1 - T.smoother(T.u(t, T.CLOSE))
    open_ = None
    if T.UNWIND[0] <= t < T.RELEASE[1]:
        amt = T.smoother(T.u(t, T.UNWIND)) * (1 - T.smoother(T.u(t, (T.RELEASE[0], T.RELEASE[1]))))
        if amt > 0.02:
            open_ = (D.SPACER[0], D.SPACER[1], amt)
    st['shape'] = D.Shape(twist=twist, split=split, del_=del_, drop=drop, open_=open_)
    # --- Cas9
    if t < T.RELEASE[1]:
        i = search_i(t)
        close = T.ease_out(T.u(t, (T.TIK2, T.LOCK)), 1.6) if t >= T.TIK2 else 0.35
        if t >= T.LOCK:
            close = 1.0
        hnh = ruvc = 0.0
        if t >= T.DOMAINS[0]:
            ruvc = T.ease_out(T.u(t, (T.DOMAINS[0], T.DOMAINS[0] + 0.7)), 2.0)
            hnh = T.ease_out(T.u(t, (T.DOMAINS[0] + 0.35, T.DOMAINS[1])), 2.0)
        if t >= T.RELEASE[0]:
            back = T.smoother(T.u(t, (T.RELEASE[0], T.RELEASE[0] + 0.4)))
            hnh *= 1 - back
            ruvc *= 1 - back
            close *= 1 - back
        y0 = 0.0
        alpha = 1.0
        if t >= T.RELEASE[0]:
            k = T.ease_in(T.u(t, T.RELEASE), 1.8)
            y0 = 96.0 * k
            alpha = 1 - T.ease_in(T.u(t, (T.RELEASE[0] + 0.25, T.RELEASE[1])), 1.6)
        st['pose'] = dict(i=i, side=1, y0=y0, close=close, hnh=hnh, ruvc=ruvc)
        st['alpha'] = alpha
        st['paired'] = paired_count(t) if t < T.RELEASE[0] else T.N_SPACER * (1 - T.u(t, T.RELEASE))
    else:
        st['pose'] = None
        st['alpha'] = 0.0
        st['paired'] = 0
    # --- the camera
    if t < T.TO_SITE[0]:
        s = S_SEARCH
        cx = (search_i(t) - 6.0) * D.RISE
        cy = 12.0
        if t < T.XRAY[1]:                                   # coming out of the rewind into the ladder
            k = T.smoother(T.u(t, T.XRAY))
            s = lerp(S_HOOK, S_SEARCH, k)
            cy = lerp(4.0, 12.0, k)
    elif t < T.BACK_OUT[0]:
        k = T.smoother(T.u(t, T.TO_SITE))
        s = lerp(S_SEARCH, S_SITE, k)
        cx = lerp((D.PAM_I - 6.0) * D.RISE, (D.CUT_I + 0.5) * D.RISE, k)
        cy = lerp(12.0, 5.0, k)
        if t >= T.SNIP2:                                     # the slow-motion drift as the ends part
            d = T.u(t, T.SLOWMO)
            s = S_SITE * (1 - 0.26 * d)                      # ease back a touch so both ends stay in frame
            cx = (D.CUT_I + 0.5) * D.RISE + 7.0 * d
    elif t < T.RESULT[0]:
        k = T.smoother(T.u(t, T.BACK_OUT))
        s = lerp(S_SITE, S_REPAIR, k)
        cx = lerp((D.CUT_I + 0.5) * D.RISE, (D.CUT_I - 0.5) * D.RISE, k)
        cy = lerp(5.0, 2.0, k)
    else:
        k = T.smoother(T.u(t, (T.RESULT[0], T.RESULT[0] + 1.1)))
        s = lerp(S_REPAIR, S_RESULT, k)
        cx = (D.CUT_I - 0.5) * D.RISE
        cy = lerp(2.0, -19.0, k)
    st['cam'] = D.Cam(cx, cy, s)
    return st


# ---------------------------------------------------------------- the loop
def loop_cam_blend(t):
    """How far the last two seconds have travelled from the result framing to the opening framing."""
    return T.smoother(T.u(t, (T.LOOP[0], T.LOOP[1])))


def draw_loop(buf, t):
    """The camera leaves the edited DNA and flies along to the next target site, where another Cas9 is coming in.
    At t = 22 this is exactly the first frame."""
    k = loop_cam_blend(t)
    # where the film started, but at the next site along the molecule
    cam1, shape, pose1 = hook_state(0.0, site=D.NEXT_I, phase=PHI, del_=D.DEL, junction=D.CUT_I)
    st0 = state(T.RESULT[1] - 0.001)
    cam0 = st0['cam']
    cam = D.Cam(lerp(cam0.cx, cam1.cx, k), lerp(cam0.cy, cam1.cy, k),
                math.exp(lerp(math.log(cam0.s), math.log(cam1.s), k)))
    # the nucleus behind is scenery: it travels back to the view the film opens on, so the loop joins exactly
    cam_home = hook_state(0.0)[0]
    bg.draw(buf, D.Cam(lerp(cam0.cx, cam_home.cx, k), lerp(cam0.cy, cam_home.cy, k),
                       math.exp(lerp(math.log(cam0.s), math.log(cam_home.s), k))), lerp(t, T.TOTAL, k))
    # the edited DNA we are leaving behind, and the fresh one we are heading for, are the same molecule
    D.draw(buf, cam, shape, t)
    # the new Cas9 comes in from off-screen and is exactly in its opening position at the loop point
    pose = dict(pose1)
    pose['y0'] = lerp(300.0, pose1['y0'], T.smoother(T.u(t, (T.LOOP[0] + 0.5, T.LOOP[1]))))
    C.draw(buf, cam, pose, t, half='back')
    C.draw_grna(buf, cam, pose, 0, 9.0)
    C.draw(buf, cam, pose, t, half='front')
    if t < T.LOOP[0] + 0.9:                                  # the junction glints once as we leave it
        jx, jy = cam.to(*shape.axis(D.CUT_I))
        fx.twinkles(buf, t, jx - 10, jy - 14, jx + 10, jy + 14, 5, 97, (P.LIG[3], P.WHITE),
                    a=1 - T.u(t, (T.LOOP[0], T.LOOP[0] + 0.9)))
    return cam


# ---------------------------------------------------------------- the rewind
def rewind_time(t):
    """The hook time the rewind is showing: it runs backwards, slow, fast, slow."""
    k = T.smoother(T.u(t, T.REWIND))
    return lerp(T.REW_FROM, T.REW_TO, k)


def rewind_fx(buf, t):
    """A tape rewind over the picture: rows torn sideways, a bright band sweeping up, and scan lines."""
    u = T.u(t, T.REWIND)
    rng = np.random.default_rng(int(t * 120) % 9973)
    for _ in range(7):                                       # torn rows
        y = int(rng.integers(0, H - 3))
        h = int(rng.integers(1, 4))
        dx = int(rng.integers(-9, 10))
        buf[y:y + h] = np.roll(buf[y:y + h], dx, axis=1)
    band = int((1 - u) * (H + 60)) - 30                      # a bright band sweeping up the frame
    for k in range(6):
        y = band + k
        if 0 <= y < H:
            row = buf[y].astype(np.int16) + (70 - 10 * k)
            buf[y] = np.clip(row, 0, 255).astype(np.uint8)
    buf[::3] = (buf[::3].astype(np.int16) * 0.82).astype(np.uint8)   # scan lines


# ---------------------------------------------------------------- effects over the main scenes
def scene_fx(buf, cam, st, t):
    shape = st['shape']
    pose = st['pose']
    # the PAM check: a tick of light at the PAM-interacting domain
    for tik, ok in ((T.TIK1, False), (T.TIK2, True)):
        if tik <= t < tik + 0.5:
            i = D.DECOY_I if tik == T.TIK1 else D.PAM_I
            px, py = cam.to(*shape.axis(i + 1))
            fx.ring_wave(buf, t, tik, px, py, 34, 0.3, P.GOOD[1] if ok else P.BAD[1])
            if not ok and t >= tik + 0.1:                    # a red cross: this one does not match
                k = min(1.0, (t - tik - 0.1) / 0.12)
                r = int(5 * k)
                for d in range(-r, r + 1):
                    for (ddx, ddy) in ((d, d), (d, -d)):
                        x, y = int(px + ddx), int(py + ddy)
                        if 0 <= x < W and 0 <= y < H:
                            buf[y, x] = P.BAD[1]
    # every guide base that just paired lights up
    if T.PAIR0 <= t < T.LOCK + 0.3:
        for j in range(paired_count(t)):
            tt = t - T.pair_time(j)
            if 0 <= tt < 0.3:
                i = D.PAM_I - 1 - j
                px, py = cam.to(*shape.base_xy(i, 0, 1.0)[:2])
                fx.star(buf, px, py, 2 if tt < 0.15 else 1, P.WHITE, P.GOOD[2])
    # the lock
    if T.LOCK <= t < T.LOCK + 0.6 and pose is not None:
        px, py = cam.to(*shape.axis(D.PAM_I - 10))
        fx.ring_wave(buf, t, T.LOCK, px, py, 120, 0.5, P.RNA[5])
        fx.burst(buf, t, T.LOCK, px, py, 55, n=14, speed=(70, 150), life=0.45,
                 cols=(P.WHITE, P.RNA[6], P.GOOD[1]))
    # the cut
    if T.SNIP2 <= t < T.SNIP2 + 1.0:
        px, py = cam.to(*shape.axis(D.CUT_I))
        fx.ring_wave(buf, t, T.SNIP2, px, py, 190, 0.5, P.FLASH[0])
        fx.burst(buf, t, T.SNIP2, px, py, 88, n=30, speed=(150, 330), life=0.6,
                 cols=(P.WHITE, P.FLASH[0], P.HNH[4], P.RUVC[6]))
    # the repair
    if T.TRIM[0] <= t < T.TRIM[1] + 0.6:
        for k, i in enumerate((D.CUT_I - 1, D.CUT_I)):
            RP.crumbs(buf, cam, shape, i, t, T.TRIM[0] + 0.1 * k, n=12, seed=300 + k)
    if T.SNAP <= t < T.SNAP + 0.8:
        RP.snap_flash(buf, cam, shape, D.CUT_I, t, T.SNAP)


def draw_repair(buf, cam, st, t):
    """The rings on the two ends and the ligase that seals the strands."""
    shape = st['shape']
    if t < T.KU1 or t > T.KU_OFF[1]:
        return
    off = 1 - T.smoother(T.u(t, T.KU_OFF))
    k1 = T.ease_out(T.u(t, (T.KU1, T.KU1 + 0.3)), 2.0) * off
    k2 = T.ease_out(T.u(t, (T.KU2, T.KU2 + 0.3)), 2.0) * off
    RP.ring_at(buf, cam, shape, D.CUT_I - 2, k1, t, phase=0.0)
    RP.ring_at(buf, cam, shape, D.CUT_I + 1, k2, t, phase=1.7)
    if t >= T.CLOSE[0]:
        kl = T.ease_out(T.u(t, (T.CLOSE[0], T.SNAP)), 2.0) * off
        RP.ligase(buf, cam, shape, D.CUT_I, 0, kl, t)
        RP.ligase(buf, cam, shape, D.CUT_I, 1, kl, t)


def draw_result(buf, cam, st, t):
    """The before and after side by side: a dim ghost of the DNA as it was, beside the edited one, with the two
    base pairs that were lost glowing in the ghost and the new junction glowing in the real one."""
    if t < T.RESULT[0]:
        return
    a = T.smoother(T.u(t, (T.RESULT[0] + 0.15, T.RESULT[0] + 0.8)))
    if a <= 0.02:
        return
    fade = 1.0 if t < T.LOOP[0] - 0.4 else 1 - T.u(t, (T.LOOP[0] - 0.4, T.LOOP[0]))
    a *= fade
    if a <= 0.02:
        return
    ghost = D.Shape(twist=st['shape'].twist, yoff=-38.0, phase=0.0)
    tmp = np.zeros_like(buf)
    D.draw(tmp, cam, ghost, t)
    m = (tmp.sum(axis=2) > 0) & (np.random.default_rng(7).random((H, W)) < 1.0)
    PX, PY = np.broadcast_arrays(np.arange(W)[None, :], np.arange(H)[:, None])
    from . import raster as R
    sel = m & (R.bayer(PX, PY) < a * 0.75)
    buf[sel] = (tmp[sel].astype(np.int16) * 0.62 + np.asarray(P.NAVY[3], np.int16) * 0.38).astype(np.uint8)
    # the two base pairs the cell lost, still there in the ghost
    for i in (D.CUT_I - 1, D.CUT_I):
        for strand in (0, 1):
            bx, by, _ = ghost.base_xy(i, strand, 1.0)
            px, py = cam.to(bx, by)
            if int(t * 8) % 2 == 0:
                fx.star(buf, px, py, 2, P.BAD[2], P.BAD[1])
    # the new junction in the edited DNA
    jx, jy = cam.to(*st['shape'].axis(D.CUT_I))
    if int(t * 8) % 2 == 0:
        fx.star(buf, jx, jy, 3, P.WHITE, P.LIG[3])
    hud.arrow(buf, jx, jy + 10, t, P.LIG[3], 4, dirn=1)


# ---------------------------------------------------------------- labels
def labels(buf, cam, st, t):
    shape = st['shape']
    pose = st['pose']
    if T.LABEL_CAS <= t < T.LABEL_CAS + 2.0 and pose is not None:
        px, py = cam.to(*C.local_to_world(pose, -C.SPAN * 0.5, 34.0))
        hud.label(buf, t, T.LABEL_CAS, px, py, ['CAS9'], side=1, life=2.0, reach=16)
        gx, gy = cam.to(*C.local_to_world(pose, -C.SPAN * 0.80, C.SC_Y))
        hud.label(buf, t, T.LABEL_CAS + 0.5, gx, gy, ['GUIDE RNA'], col=P.RNA[6], side=1, life=1.6, reach=14)
    if T.LABEL_PAM <= t < T.LABEL_PAM + 1.6:
        px, py = cam.to(*shape.base_xy(D.PAM_I + 1, 1, 1.0)[:2])
        hud.label(buf, t, T.LABEL_PAM, px, py, ['PAM'], col=P.PI[4], side=-1, life=1.6, reach=18)
    if T.LABEL_REPAIR <= t < T.LABEL_REPAIR + 1.8:
        px, py = cam.to(*shape.axis(D.CUT_I - 2))
        hud.label(buf, t, T.LABEL_REPAIR, px, py, ['REPAIR'], col=P.KU[3], side=-1, life=1.8, reach=20)
    if T.LABEL_EDITED <= t:
        hud.banner(buf, t, T.LABEL_EDITED, 'DNA EDITED', life=1.5, y=H // 2 + 150)


# ---------------------------------------------------------------- the whole frame
def frame(t):
    t = t % T.TOTAL
    buf = np.zeros((H, W, 3), np.uint8)
    if t < T.HOOK[1]:
        draw_hook(buf, t, t)
        return buf
    if t < T.REWIND[1]:
        draw_hook(buf, rewind_time(t), t)
        rewind_fx(buf, t)
        return buf
    if t >= T.LOOP[0]:
        draw_loop(buf, t)
        return buf
    st = state(t)
    cam, shape, pose = st['cam'], st['shape'], st['pose']
    bg.draw(buf, cam, t)
    hide = None
    if t >= T.TRIM[0]:
        lost = (D.CUT_I - 1, D.CUT_I)
        hide = lambda i: i in lost
    xray = 1.0 if t >= T.XRAY[0] else 0.0
    front = st['alpha']
    if t >= T.DOMAINS[1]:                                   # the near half of the protein opens away for the cut
        front *= 1 - 0.85 * T.smoother(T.u(t, (T.DOMAINS[1], T.SNIP2)))
    if pose is not None:
        C.draw(buf, cam, pose, t, xray=xray, alpha=st['alpha'], half='back')
    D.draw(buf, cam, shape, t, hide=hide)
    if pose is not None:
        C.draw_grna(buf, cam, pose, st['paired'], t, alpha=st['alpha'])
        C.draw(buf, cam, pose, t, xray=xray, alpha=front, half='front')
    draw_repair(buf, cam, st, t)
    draw_result(buf, cam, st, t)
    scene_fx(buf, cam, st, t)
    labels(buf, cam, st, t)
    return buf


def warm():
    pass


def render(t, fps=30, scale=4):
    return gfx.upscale(frame(t % T.TOTAL), scale)
