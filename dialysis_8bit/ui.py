"""Labels and captions: Kurzgesagt-style callouts in pixel form.

A callout draws a thin leader from a target dot, then types its text at
~40 chars/s with a cyan underline, and erases itself char by char.
"""
import math

import numpy as np

import pixfont as F
from pal import BG0, CY1, CY2, CY3, SUB, WHITE
from px import BAYER4, H, W, clamp, disc_mask, dilate, ease_out, text

TYPE_CPS = 40.0
ERASE_CPS = 70.0


def _ring(cv, x, y, r, color, level=1.0):
    m, x0, y0 = disc_mask(x, y, r)
    m2, _, _ = disc_mask(x - 0.0, y - 0.0, max(0.5, r - 1))
    # align inner mask to outer
    h, w = m.shape
    inner = np.zeros_like(m)
    ih, iw = m2.shape
    oy, ox = (h - ih) // 2, (w - iw) // 2
    inner[oy:oy + ih, ox:ox + iw] = m2
    ring = m & ~inner
    if level >= 1:
        cv.stamp(ring, x0, y0, color)
    else:
        cv.stamp_dither(ring, x0, y0, color, level)


def callout(cv, label, age, dur, ax, ay, lx, ly, align="left", color=WHITE,
            accent=CY2, font=F.BOLD, show_dot=True):
    """Draw a callout.

    age  : seconds since the callout started (negative = not yet)
    dur  : how long it stays fully visible before erasing
    ax,ay: target point on screen (None = no leader)
    lx,ly: text top-left (align='left') or top-right (align='right')
    """
    if age < 0:
        return
    tw = font.width(label)
    erase = max(0.0, age - dur)
    n_typed = min(len(label), int(max(0.0, age - 0.12) * TYPE_CPS))
    n_vis = n_typed - int(erase * ERASE_CPS)
    if n_vis <= 0 and erase > 0:
        return
    line_k = clamp(age / 0.12, 0.0, 1.0)
    if erase > 0:
        line_k = clamp(1.0 - (erase * ERASE_CPS - len(label) * 0.6) / (len(label) * 0.4 + 1), 0.0, 1.0)
    tx0 = lx if align == "left" else lx - tw
    ux = tx0 if align == "left" else tx0 + tw  # underline attach end
    uy = ly + font.h + 2
    if ax is not None and line_k > 0:
        # leader: from target to the underline attach point
        ex = ux - 1 if align == "left" else ux
        ex = tx0 - 2 if (ax < tx0) else (tx0 + tw + 1 if ax > tx0 + tw else ex)
        ey = uy
        px_ = ax + (ex - ax) * line_k
        py_ = ay + (ey - ay) * line_k
        cv.line(ax, ay + 1, px_, py_ + 1, BG0)
        cv.line(ax, ay, px_, py_, color)
        if show_dot:
            cv.rect(ax - 2, ay - 2, ax + 3, ay + 3, BG0)
            cv.rect(ax - 1, ay - 1, ax + 2, ay + 2, color)
            ping = age / 0.45
            if ping < 1:
                _ring(cv, ax + 0.5, ay + 0.5, 2 + 6 * ease_out(ping), accent, 1.0 - ping)
    if n_vis > 0:
        frac_u = n_vis / max(1, len(label))
        uw = int(round(tw * frac_u))
        if align == "left":
            cv.rect(tx0 - 1, uy - 1, tx0 + uw + 2, uy + 2, BG0)
            cv.rect(tx0, uy, tx0 + uw + 1, uy + 1, accent)
        else:
            cv.rect(tx0 + tw - uw - 1, uy - 1, tx0 + tw + 2, uy + 2, BG0)
            cv.rect(tx0 + tw - uw, uy, tx0 + tw + 1, uy + 1, accent)
        shown = label[:n_vis]
        text(cv, font, shown, tx0, ly, color, outline=BG0)
        if n_typed < len(label) and erase == 0:
            # typing cursor block
            cx = tx0 + font.width(shown) + 2
            cv.rect(cx, ly, cx + 4, ly + font.h, accent)


def tag(cv, label, age, dur, x, y, color, align="center", font=F.BOLD):
    """Short floating tag (no leader), typed in and erased."""
    callout(cv, label, age, dur, None, None, x if align != "center" else x - font.width(label) / 2,
            y, align="left" if align == "center" else align, color=color)


def caption(cv, s, age, dur, y=372, x=W / 2, color=WHITE, wrap=210):
    """Micro-caption: regular mixed-case font on a soft dark band."""
    if age < 0:
        return
    words = s.split(" ")
    lines, cur = [], ""
    for wd in words:
        nxt = (cur + " " + wd).strip()
        if F.REG.width(nxt) > wrap and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = nxt
    lines.append(cur)
    total = sum(len(l) for l in lines)
    erase = max(0.0, age - dur)
    n_vis = min(total, int(age * 55.0)) - int(erase * 90.0)
    if n_vis <= 0:
        return
    lh = 11
    box_w = max(F.REG.width(l) for l in lines) + 10
    box_h = lh * len(lines) + 5
    bx0 = int(round(x - box_w / 2))
    by0 = int(round(y - 3))
    k = clamp(min(age / 0.15, (dur + 0.4 - age) / 0.15 if erase > 0 else 1.0), 0.0, 1.0)
    cv.rect_dither(bx0, by0, bx0 + box_w, by0 + box_h, BG0, 0.62 * k)
    cv.rect(bx0, by0, bx0 + 1, by0 + box_h, CY1)
    left = n_vis
    for i, l in enumerate(lines):
        if left <= 0:
            break
        part = l[:left]
        left -= len(l)
        lw = F.REG.width(l)
        text(cv, F.REG, part, x - lw / 2, y + i * lh, color, outline=BG0)
