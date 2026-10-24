"""Labels, tags and captions: Kurzgesagt-style callouts in pixel form.

A callout draws a thin leader from a target dot (art layer, native pixels),
then types its text at ~40 chars/s on a solid chip with a cyan underline,
and erases itself char by char. The letters themselves go to the
full-resolution HUD layer (hud.py) so they stay readable on a phone.
"""
import numpy as np

import pixfont as F
from hud import (CAPTION_FPX, LABEL_FPX, TAG_FPX, Overlay, text_h, text_w)
from pal import BG0, CY1, CY2, SUB, WHITE
from px import H, W, clamp, disc_mask, ease_out

TYPE_CPS = 40.0
ERASE_CPS = 70.0
SAFE_R = 237.0   # keep text left of 950 px (platform buttons)


def _hud(cv):
    if getattr(cv, "hud", None) is None:
        cv.hud = Overlay()
    return cv.hud


def _ring(cv, x, y, r, color, level=1.0):
    m, x0, y0 = disc_mask(x, y, r)
    m2, _, _ = disc_mask(x, y, max(0.5, r - 1))
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


def callout(cv, label, age, dur, ax, ay, lx, ly, align="left", color=WHITE, accent=CY2,
            font=F.BOLD, fpx=LABEL_FPX, show_dot=True, pretyped=False):
    """age: seconds since start; dur: fully-visible time before erasing.
    (ax, ay) target in native px (None = no leader); (lx, ly) text corner."""
    if age < 0:
        return
    hud = _hud(cv)
    tw = text_w(font, label, fpx)
    th = text_h(font, fpx)
    erase = max(0.0, age - dur)
    n_typed = len(label) if pretyped else min(len(label), int(max(0.0, age - 0.12) * TYPE_CPS))
    n_vis = n_typed - int(erase * ERASE_CPS)
    if n_vis <= 0 and erase > 0:
        return
    line_k = 1.0 if pretyped else clamp(age / 0.12, 0.0, 1.0)
    if erase > 0:
        line_k = clamp(n_vis / max(1, len(label)) * 1.6, 0.0, 1.0)
    tx0 = lx if align == "left" else lx - tw
    tx0 = clamp(tx0, 8.0, SAFE_R - tw)
    uy = ly + th + 2.0
    if ax is not None and line_k > 0:
        ex = tx0 - 1 if ax < tx0 + tw / 2 else tx0 + tw + 1
        ey = uy
        px_ = ax + (ex - ax) * line_k
        py_ = ay + (ey - ay) * line_k
        cv.line(ax, ay + 1, px_, py_ + 1, BG0)
        cv.line(ax, ay, px_, py_, color)
        if show_dot:
            cv.rect(ax - 2, ay - 2, ax + 3, ay + 3, BG0)
            cv.rect(ax - 1, ay - 1, ax + 2, ay + 2, color)
            ping = age / 0.45
            if ping < 1 and not pretyped:
                _ring(cv, ax + 0.5, ay + 0.5, 2 + 6 * ease_out(ping), accent, 1.0 - ping)
    if n_vis > 0:
        shown = label[:n_vis]
        vw = text_w(font, shown, fpx)
        # solid chip + underline
        hud.rect(tx0 - 2.0, ly - 1.75, tx0 + vw + 2.0, ly + th + 1.25, BG0)
        cv.rect(tx0 - 1, uy - 1, tx0 + vw + 2, uy + 2, BG0)
        cv.rect(tx0, uy, tx0 + vw + 1, uy + 1, accent)
        hud.text(font, shown, tx0, ly, color, fpx)
        if n_typed < len(label) and erase == 0:
            cx = tx0 + vw + 1.0
            hud.rect(cx, ly, cx + fpx / 4.0 * 1.2, ly + th, accent)


def tag(cv, label, age, dur, x, y, color, align="left", fpx=TAG_FPX, font=F.BOLD):
    """Short floating tag on a chip (no leader), typed in and erased."""
    if age < 0:
        return
    hud = _hud(cv)
    erase = max(0.0, age - dur)
    n = min(len(label), int(max(0.0, age - 0.05) * TYPE_CPS)) - int(erase * ERASE_CPS)
    if n <= 0:
        return
    tw = text_w(font, label, fpx)
    th = text_h(font, fpx)
    x0 = x if align == "left" else x - tw
    x0 = clamp(x0, 8.0, SAFE_R - tw)
    shown = label[:n]
    vw = text_w(font, shown, fpx)
    hud.rect(x0 - 2.0, y - 1.75, x0 + vw + 2.0, y + th + 1.5, BG0)
    hud.rect(x0 - 2.0, y + th + 1.5, x0 + vw + 2.0, y + th + 2.25, color)
    hud.text(font, shown, x0, y, color, fpx)


def wrap_lines(s, wrap, font=F.REG, fpx=CAPTION_FPX):
    words = s.split(" ")
    lines, cur = [], ""
    for wd in words:
        nxt = (cur + " " + wd).strip()
        if text_w(font, nxt, fpx) > wrap and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = nxt
    lines.append(cur)
    return lines


def caption(cv, s, age, dur, y=300, x=124.0, color=WHITE, wrap=212):
    """Micro-caption on a solid plate: types in within ~0.3 s, then holds."""
    if age < 0:
        return
    hud = _hud(cv)
    lines = wrap_lines(s, wrap)
    total = sum(len(l) for l in lines)
    cps = max(60.0, total / 0.3)
    erase = max(0.0, age - dur)
    n_vis = min(total, int(age * cps)) - int(erase * 140.0)
    if n_vis <= 0:
        return
    lh = text_h(F.REG, CAPTION_FPX) + 2.5
    box_w = max(text_w(F.REG, l, CAPTION_FPX) for l in lines) + 9.0
    box_h = lh * len(lines) + 4.0
    bx0 = clamp(x - box_w / 2, 8.0, SAFE_R - box_w)
    by0 = y - 3.0
    hud.rect(bx0, by0, bx0 + box_w, by0 + box_h, BG0)
    hud.rect(bx0, by0, bx0 + 1.0, by0 + box_h, CY1)
    left = n_vis
    for i, l in enumerate(lines):
        if left <= 0:
            break
        part = l[:left]
        left -= len(l)
        lw = text_w(F.REG, l, CAPTION_FPX)
        hud.text(F.REG, part, bx0 + (box_w - lw) / 2 + 0.5, y + i * lh, color, CAPTION_FPX)
