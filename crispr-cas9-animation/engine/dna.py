"""The DNA: its sequence, its shape (a double helix that can straighten into a ladder), the R-loop the guide RNA
opens, the double-strand break, and how all of that is drawn as 8-bit pixels.

The molecule is measured in base pairs along x: base pair i sits at x = i * RISE. The two strands wind round that
axis; a `twist` of 1 is a full double helix, 0 is a flat ladder (the film straightens the helix to show the pairing
and winds it back up at the end). Every pixel is drawn at the camera's own scale, so zooming in reveals the beads
and the base letters instead of enlarging pixels.

Strand 0 is the target strand (the guide RNA pairs with it); strand 1 is the non-target strand, which carries the
PAM. Cas9 cuts both strands 3 base pairs upstream of the PAM.
"""
import math

import numpy as np

from . import gfx, raster as R, palette as P, timeline as T

W, H = gfx.W, gfx.H

RISE = 3.4                 # one base pair along the axis (A)
RAD = 10.0                 # the helix radius (A), drawn a little wider than life so the beads read
TURN = 10.5                # base pairs per full turn
BEAD = 1.55                # backbone bead radius (A)
BASE_R = 1.15              # a base's bead radius (A)
GAP = 2.0                  # the little gap between the two bases of a pair

# The sequence round the target site. Index 0 is the first base pair we draw, and the sequence repeats every
# PERIOD base pairs, so there is an identical target site further along the molecule: the one the film flies to at
# the end, which is the one it opened on.
#
# Strand 0 (TOP) is the target strand: the guide RNA pairs with it. Strand 1 (BOT) is the non-target strand: it
# carries the protospacer and, right after it, the PAM that this Cas9 needs (5'-NGG-3'; SpCas9).
TOP = list('GTCAGCTTGGACTAGCTTAAGATCCAGCACTGGAATCCGGAGGCCTGCAACGTTGCACTAAC')
PAM_I = 42                 # the PAM (NGG on the non-target strand) starts here
SPACER = (PAM_I - 20, PAM_I)      # the 20 base pairs the guide RNA matches, PAM-proximal end at PAM_I - 1
DECOY_I = 22               # a real PAM earlier along the DNA, but the sequence beside it does not match the guide
CUT_I = PAM_I - 3          # the blunt cut: 3 base pairs before the PAM
DEL = 2                    # base pairs lost when the cell repairs the break

COMP = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
BOT = [COMP[c] for c in TOP]
GUIDE = [c if c != 'T' else 'U' for c in (COMP[c] for c in TOP[SPACER[0]:SPACER[1]])]   # RNA matching the target


PERIOD = len(TOP)          # the drawn sequence repeats, so there is an identical target site further along
NEXT_I = PAM_I + PERIOD    # the site the film flies to at the end, which is the site it opened on


def seq_at(i, strand):
    """The base letter at base pair i on strand 0 (target, top) or 1 (non-target, bottom)."""
    i = i % PERIOD
    return TOP[i] if strand == 0 else BOT[i]


# ---------------------------------------------------------------- shape
class Shape:
    """Where each strand is in space at one moment.

    twist:  1 = a full double helix, 0 = a flat ladder.
    split:  how far the two cut ends have pulled apart (A); the right-hand piece also drifts down a little.
    open_:  (i0, i1, amount) the R-loop: inside that range the target strand is pushed up and the other down.
    del_:   base pairs removed at the cut (the repair's deletion), shifting the right piece left.
    """

    def __init__(self, twist=1.0, split=0.0, open_=None, del_=0.0, cut=CUT_I, phase=0.0, drop=0.0, yoff=0.0):
        self.twist, self.split, self.open_, self.del_, self.cut = twist, split, open_, del_, cut
        self.phase, self.drop, self.yoff = phase, drop, yoff

    def piece(self, i):
        """-1 left of the cut, +1 right of it (the two pieces move apart)."""
        return -1.0 if i < self.cut else 1.0

    def axis(self, i):
        """The axis point (x, y) of base pair i, in A."""
        x = i * RISE
        y = self.yoff
        if self.split > 0 and i >= self.cut:
            x += self.split
            y += self.drop
        if self.del_ and i >= self.cut:
            x -= self.del_ * RISE
        return x, y

    def strand_xy(self, i, strand):
        """Where the backbone bead of strand `strand` at base pair i sits, and how deep it is (-1 back .. 1 front)."""
        x, y = self.axis(i)
        a = 2 * math.pi * (i / TURN) + self.phase + (0.0 if strand == 0 else math.pi * 0.62)
        off = RAD * (1 - 0.35 * self.twist) + 0.0
        depth = math.sin(a) * self.twist
        yy = y + (-1 if strand == 0 else 1) * (RAD * (1 - 0.45 * self.twist) + 0.45 * RAD * self.twist * math.cos(a))
        if self.open_ is not None and strand == 1:
            # the R-loop: the guide RNA pairs with the target strand (0), so the non-target strand (1) is peeled
            # away from it and held in a channel inside Cas9
            i0, i1, amt = self.open_
            if i0 - 1 <= i < i1 + 1:
                e = min(1.0, min(i - i0 + 1.5, i1 + 0.5 - i) / 2.0)
                yy += amt * max(0.0, e) * 13.0
        return x, yy, depth

    def base_xy(self, i, strand, f=1.0):
        """The base's bead, hanging from its backbone towards the middle (f = how far in, 1 = touching its pair)."""
        bx, by, d = self.strand_xy(i, strand)
        _, ay = self.axis(i)
        mid = ay + (by - ay) * (1 - f) * 0.0
        inner = ay + (GAP / 2) * (-1 if strand == 0 else 1)
        return bx, by + (inner - by) * f, d


# ---------------------------------------------------------------- camera
class Cam:
    """Maps molecule coordinates (A) to canvas pixels: cx, cy is what the camera looks at, s = canvas px per A.

    The molecule's axis runs along x, but the film is 9:16, so the camera is turned a quarter turn by default: the
    DNA runs down the screen and fills the tall frame. `rot` is the extra tilt on top of that."""

    def __init__(self, cx, cy, s, rot=math.pi / 2):
        self.cx, self.cy, self.s, self.rot = float(cx), float(cy), float(s), float(rot)
        self._c, self._s = math.cos(rot), math.sin(rot)

    def to(self, x, y):
        dx, dy = (x - self.cx) * self.s, (y - self.cy) * self.s
        return W / 2 + dx * self._c - dy * self._s, H / 2 + dx * self._s + dy * self._c


# ---------------------------------------------------------------- drawing
def _disc(buf, cx, cy, r, ramp, lit=0.45, outline=True, glow=0.0):
    """One 8-bit bead: a flat filled circle, a hard highlight arc at the top left, a darker arc at the bottom right
    and a 1-px outline. `lit` (0..1) picks how bright the body is (used for depth in the helix)."""
    r = float(r)
    if r < 0.9:
        if 0 <= int(cx) < W and 0 <= int(cy) < H and r > 0.12:
            buf[int(cy), int(cx)] = ramp[2 if lit > 0.45 else 1]
        return
    x0, x1 = max(0, int(cx - r - 2)), min(W, int(cx + r + 3))
    y0, y1 = max(0, int(cy - r - 2)), min(H, int(cy + r + 3))
    if x1 <= x0 or y1 <= y0:
        return
    px = np.arange(x0, x1)[None, :] + 0.5
    py = np.arange(y0, y1)[:, None] + 0.5
    dx, dy = px - cx, py - cy
    d = np.hypot(dx, dy)
    sub = buf[y0:y1, x0:x1]
    if glow > 0:
        ring = (d >= r) & (d < r + 1 + 2.5 * glow)
        PXg = np.broadcast_to(np.arange(x0, x1)[None, :], ring.shape)
        PYg = np.broadcast_to(np.arange(y0, y1)[:, None], ring.shape)
        sub[ring & (R.bayer(PXg, PYg) < glow)] = P.SPARK[0]
    inside = d <= r
    if not inside.any():
        return
    n = len(ramp)
    body = min(n - 2, max(1, int(round(1 + lit * (n - 3)))))        # which ramp step the body uses
    sub[inside] = ramp[body]
    if r >= 1.6:                                                     # the lit shoulder and the shaded one
        k = -(dx * 0.6 + dy * 0.8) / max(r, 1e-6)
        sub[inside & (k > 0.42)] = ramp[min(n - 1, body + 1)]
        sub[inside & (k < -0.45)] = ramp[max(1, body - 1)]
    if r >= 2.8:                                                     # a single bright pixel glint
        sub[inside & (k > 0.84)] = ramp[n - 1]
    if outline and r >= 1.3:
        sub[inside & (d > r - 1.0)] = ramp[0]


def _stick(buf, x0, y0, x1, y1, w, col):
    if w <= 0:
        return
    gfx.fill(buf, gfx.line(x0, y0, x1, y1, max(1, int(round(w)))), col)


def visible_range(cam, shape, pad=3):
    """Which base pairs can be on screen."""
    half = (W / 2 + 40) / cam.s
    i0 = int((cam.cx - half) / RISE) - pad
    i1 = int((cam.cx + half) / RISE) + pad + int(shape.split / RISE) + 2
    return i0, i1


def draw(buf, cam, shape, t, glow_pairs=None, dim=0.0, letters=True, cut_flash=0.0, hide=None):
    """Draw the double helix. glow_pairs: {base pair index: 0..1} to light up (freshly paired guide bases)."""
    i0, i1 = visible_range(cam, shape)
    s = cam.s
    bead = max(0.7, BEAD * s)
    base_r = max(0.5, BASE_R * s)
    items = []                       # (depth, kind, args) so the back of the helix is drawn first
    for i in range(i0, i1):
        if hide is not None and hide(i):
            continue
        open_amt = 0.0
        if shape.open_ is not None and shape.open_[0] - 1 <= i < shape.open_[1] + 1:
            e = min(1.0, min(i - shape.open_[0] + 1.5, shape.open_[1] + 0.5 - i) / 2.0)
            open_amt = shape.open_[2] * max(0.0, e)
        for strand in (0, 1):
            bx, by, d = shape.strand_xy(i, strand)
            sx, sy = cam.to(bx, by)
            if not (-30 <= sx < W + 30 and -30 <= sy < H + 30):
                continue
            items.append((d, 'back', (sx, sy, i, strand, d)))
            # the base hanging from it
            f = 1.0 if strand == 0 else 1.0 - 1.45 * open_amt   # the displaced strand's bases swing outward
            fx_, fy_, _ = shape.base_xy(i, strand, f)
            bsx, bsy = cam.to(fx_, fy_)
            g = 0.0 if glow_pairs is None else glow_pairs.get(i, 0.0)
            items.append((d - 0.01, 'base', (sx, sy, bsx, bsy, i, strand, d, g, open_amt)))
    items.sort(key=lambda it: it[0])
    for d, kind, a in items:
        if kind == 'back':
            sx, sy, i, strand, dep = a
            r = bead * (0.82 + 0.18 * (dep + 1) / 2)
            ramp = P.BACK
            lit = 0.3 + 0.35 * (dep + 1) / 2
            _disc(buf, sx, sy, r, ramp, lit)
        else:
            sx, sy, bsx, bsy, i, strand, dep, g, open_amt = a
            letter = seq_at(i, strand)
            ramp = P.BASES[letter]
            _stick(buf, sx, sy, bsx, bsy, 1 if s < 2.2 else 2, ramp[1])
            _disc(buf, bsx, bsy, base_r * (0.85 + 0.15 * (dep + 1) / 2), ramp, 0.35 + 0.3 * (dep + 1) / 2,
                  glow=g * 0.9)
            if letters and s > 5.5 and base_r > 2.6:
                from . import pixfont as PF
                PF.draw_text(buf, letter, bsx, bsy, ramp[3], font='3x5', anchor='mm', outline=ramp[0])
    if dim > 0:
        gfx.blend(buf, gfx.Mask(0, 0, np.ones((H, W), bool)), P.NAVY[2], dim)


def draw_bonds(buf, cam, shape, i0, i1, paired):
    """The little hydrogen-bond ticks between two paired bases (drawn when the camera is close)."""
    if cam.s < 3.5:
        return
    for i in range(i0, i1):
        if not paired(i):
            continue
        ax, ay, _ = shape.base_xy(i, 0, 1.0)
        bx, by, _ = shape.base_xy(i, 1, 1.0)
        x0, y0 = cam.to(ax, ay)
        x1, y1 = cam.to(bx, by)
        n = 2 if seq_at(i, 0) in 'AT' else 3
        for k in range(n):
            f = (k + 1) / (n + 1)
            px = x0 + (x1 - x0) * 0.5 + (f - 0.5) * 2.4 * cam.s * 0.25
            py = y0 + (y1 - y0) * 0.5
            gfx.fill(buf, gfx.rect(px, py - 0.5, px + 1, py + 0.5), P.BACK[4])
