"""What is on screen at time t: the camera, the exterior world, the cutaway world, and the outlet-rim portal.

The exterior world is the patient, the mask and the nebulizer as you would see them. The cutaway world is the same
nebulizer cut along its middle (and, closer in, the mesh plate and the droplets). On the way in, the camera flies into
the outlet's open end: the rim grows around the camera and everything inside it is the cutaway; on the way out the
rim closes back onto the outlet. The two worlds share one geometry, so the cut lines up with the outside.
"""
import math
import numpy as np
from . import gfx, palette as P
from . import timeline as T
from .view import View, put, tones, mix, sd_circle
from . import person, device, mist, micro, fx

W, H = gfx.W, gfx.H
_JJ, _II = np.mgrid[0:H, 0:W]


def background(view, t):
    """Flat dark navy with a soft dithered lift behind the subject and slow parallax motes."""
    r = np.hypot((_II - W * 0.55) / W, (_JJ - H * 0.42) / H)
    v = np.clip(0.62 - 0.5 * r, 0, 1) * 0.5 + 0.18
    buf = tones(P.NV, v, (0, 0, W, H)).copy()
    fx.motes(buf, view, t)
    return buf


def exterior(view, t, fps):
    buf = background(view, t)
    person.draw_shirt(buf, view, t)
    person.draw_head(buf, view, t)
    person.draw_ear(buf, view, t)
    person.draw_hair(buf, view, t)
    person.draw_strap(buf, view, t)
    device.draw_body(buf, view, t)
    device.draw_cup(buf, view, t)
    person.draw_hand_back(buf, view, t)
    person.draw_mask_back(buf, view, t)
    device.draw_outlet_mouth(buf, view, t)
    mist.draw(buf, view, t, cut=False)
    person.draw_mask_front(buf, view, t)
    return buf


def cloud_alpha(z):
    """The cloud thins out as the droplets resolve (LOD hand-over between mist.py and micro.py)."""
    return float(np.clip(1.0 - (math.log(z) - math.log(70.0)) / (math.log(520.0) - math.log(70.0)), 0, 1))


def droplet_alpha(z):
    return float(np.clip((math.log(z) - math.log(30.0)) / (math.log(85.0) - math.log(30.0)), 0, 1))


def cutaway(view, t, fps, hero=False):
    buf = background(view, t)
    z = view.z
    if z < 1400:
        device.draw_cutaway(buf, view, t, fps)
    if z > 28:
        micro.draw_plate(buf, view, t)
    person.draw_mask_back(buf, view, t)
    mist.draw(buf, view, t, cut=True, alpha=cloud_alpha(z))
    micro.draw_droplets(buf, view, t, droplet_alpha(z), hero_skip=hero)
    person.draw_mask_front(buf, view, t)
    return buf


def portal_shape(view, t, p):
    """Screen-space ellipse of the rim portal: (cx, cy, rx, ry). p = 0 is the outlet's open end, p = 1 covers all."""
    e = p * p * (3 - 2 * p)
    mx, my = view.px(device.OUT_X1, 0.0)
    rx0, ry0 = max(device.MOUTH_RX * view.z, 1.0), max(device.OUT_RI * view.z, 1.0)
    R1 = 300.0
    cx = mx + (W / 2 - mx) * e
    cy = my + (H / 2 - my) * e
    rx = math.exp(math.log(rx0) + (math.log(R1) - math.log(rx0)) * e)
    ry = math.exp(math.log(ry0) + (math.log(R1) - math.log(ry0)) * e)
    return cx, cy, rx, ry


def rim_ring(buf, cx, cy, rx, ry):
    """The outlet rim the camera flies through: a light-gray ring, lit from the top-left."""
    k = np.sqrt(((_II + 0.5 - cx) / rx) ** 2 + ((_JJ + 0.5 - cy) / ry) ** 2)
    thick = (4.0 + 0.045 * min(rx, ry)) / min(rx, ry)
    ring = (k >= 1.0) & (k < 1.0 + thick)
    if not ring.any():
        return
    ang = np.arctan2((_JJ + 0.5 - cy) / ry, (_II + 0.5 - cx) / rx)
    lightv = 0.5 + 0.38 * np.cos(ang + 2.4)
    across = (k - 1.0) / thick
    v = lightv - 0.18 * np.abs(across - 0.45) * 2
    put(buf, (0, 0, W, H), ring, tones(P.GR, np.clip(v, 0, 1), (0, 0, W, H)))
    put(buf, (0, 0, W, H), (k >= 1.0) & (k < 1.0 + 1.2 / min(rx, ry)), P.GR[2])
    put(buf, (0, 0, W, H), (k >= 1.0 + thick - 1.2 / min(rx, ry)) & ring, P.GR[1])


def render_canvas(t, fps=30, label=True):
    t = t % T.TOTAL
    cx, cy, z = T.camera(t)
    view = View(cx, cy, z)
    view.apply()
    p = T.portal(t)
    hero = t >= T.HERO - 1e-6 and t <= T.RETURN[1] + 0.3
    if p <= 0.0:
        out = exterior(view, t, fps)
    elif p >= 1.0:
        out = cutaway(view, t, fps, hero)
    else:
        ext = exterior(view, t, fps)
        cut = cutaway(view, t, fps, hero)
        pcx, pcy, rx, ry = portal_shape(view, t, p)
        inside = ((_II + 0.5 - pcx) / rx) ** 2 + ((_JJ + 0.5 - pcy) / ry) ** 2 < 1.0
        out = np.where(inside[..., None], cut, ext)
        rim_ring(out, pcx, pcy, rx, ry)
    if hero:
        fx.hero_droplet(out, view, t)
    if label:
        fx.mesh_label(out, view, t)
    return out


def render(t, fps=30, scale=gfx.SCALE, label=True):
    return gfx.upscale(render_canvas(t, fps, label), scale)
