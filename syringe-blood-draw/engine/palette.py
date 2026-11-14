"""Palette: the repo's `navy` set (flat dark navy, surface, ink white, cyan accent) plus blood red and skin.

Every colour comes from these ramps (dark -> light). Shading picks a tone from a ramp with ordered (Bayer) dithering.
The navy stays near hue 210 (not blue-purple); clear plastic and steel lean the same cool grey so they sit on it.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# navy background (flat #0D1B2A, surface #16293D)
BG = ramp('#050c15', '#08121e', '#0a1622', '#0d1b2a', '#112236', '#16293d', '#1d3550', '#25425f', '#2f5272')
INK = hx('#eef3f6')
# clear plastic (barrel, flange, plunger rod)
GL = ramp('#2a4258', '#3e5a72', '#5d7f97', '#8fa3b3', '#b7c9d6', '#dce7ee', '#f4f9fc')
# black rubber stopper
RB = ramp('#101317', '#1a1e24', '#262b33', '#343a44', '#4a525e', '#626b78')
# stainless steel needle
ST = ramp('#2c3640', '#46525e', '#66737f', '#8a97a2', '#b1bcc5', '#d6dee3', '#f2f6f8')
# needle hub (green, 21 G)
HB = ramp('#0c3326', '#145036', '#1d6d48', '#2a8c5b', '#41ab73', '#73cc98', '#b0ebc6')
# cyan accent (glints, cut line)
CY = ramp('#16495a', '#246f86', '#3a9cb6', '#5cc8e0', '#98e3f1', '#d8f7fc')
# skin (epidermis)
SK = ramp('#4f2c1f', '#6e412e', '#8c5a40', '#a87252', '#c08763', '#d9a07a', '#e8b791', '#f3cfae')
# soft tissue (dermis / subcutis)
TS = ramp('#8a4d4b', '#a8625d', '#c27b72', '#d8948a', '#e8ad9f', '#f3c6b8', '#fadbd0')
# fat lobules
FT = ramp('#a77f47', '#c49b5e', '#dcb878', '#ecd195', '#f6e4b6', '#fcf2d8')
# muscle
MU = ramp('#3d1015', '#55171d', '#6e2027', '#872a31', '#a0363c', '#b9494c', '#cc6563')
# vein wall
VW = ramp('#2d0710', '#470c19', '#621426', '#7d1e33', '#9a2c42', '#b8465a')
# blood
BL = ramp('#24040a', '#3e0710', '#5c0b17', '#7c101f', '#9e1626', '#c8202f', '#e2434c', '#f77a74', '#ffb3a6')

WHITE = (255, 253, 247)
OUTLINE = BG[0]
