"""The film's colours: a dark teal lab, pale amber agar, cream colonies, a white cotton swab and one mint accent.
Every ramp runs from dark to light; shading picks a step and Bayer-dithers between neighbours."""
import numpy as np


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def ramp(*cols):
    return np.array([hx(c) for c in cols], np.uint8)


TEAL = ramp('#06161a', '#0b2326', '#0e2a2c', '#13393b', '#1d4a4b', '#2b6163', '#3f7d7c', '#6aa7a3')   # lab bench
AGAR = ramp('#8a5a22', '#b07a2f', '#c98f3e', '#d9a24e', '#e9bd6e', '#f0cc85', '#f4d9a0', '#fbecc8')   # agar gel
CREAM = ramp('#6e5a33', '#8f7a4a', '#b39d68', '#c8b47e', '#dccb98', '#eadcae', '#f7efd2', '#fffaf0')  # colonies, cells
PLASTIC = ramp('#3f6f6c', '#6fa7a2', '#a9d6d0', '#d8f1ec', '#f2fffb')                                # dish wall tints
COTTON = ramp('#8c826d', '#b3a78e', '#d9cfba', '#f1ebdc', '#fffdf6')                                 # swab tip
STICK = ramp('#4c5d61', '#7f9296', '#b5c3c6', '#dfe7e9', '#f6fafb')                                  # swab shaft
MINT = ramp('#1d6a48', '#3fae78', '#6bd59b', '#b6f2cf', '#e9fff2')                                   # target bracket
DNA = ramp('#164b48', '#22706b', '#3a9a90')                                                          # nucleoid
WHITE = (255, 255, 255)
INK = hx('#f3f7f2')
OUTLINE = hx('#06161a')
