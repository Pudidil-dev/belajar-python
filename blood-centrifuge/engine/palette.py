"""Palette: the repo's `ink` set (charcoal, warm white, gold, teal) plus blood red.

Every colour in the film comes from these ramps (dark -> light). Shading picks a tone from a ramp with ordered
(Bayer) dithering, which is how 16-bit games did gradients. No blue-purple anywhere: the glass and the machine
shadows lean teal-grey, the background is neutral charcoal.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# background charcoal (ink #121417, surface #1E2226)
BG = ramp('#08090a', '#0d0f11', '#121417', '#171a1d', '#1e2226', '#262b30', '#30363c', '#3b4248')
# machine warm white with teal-grey shadows (ink #F2EFE8)
MW = ramp('#22282a', '#3c4645', '#5d6866', '#86918e', '#adb7b3', '#cfd6d2', '#e6e9e4', '#f2efe8', '#fffdf7')
# aluminium / steel (rotor, bowl, hinges)
AL = ramp('#15191b', '#232a2c', '#343d3f', '#4a5556', '#64706f', '#82908d', '#a6b1ae', '#c9d1cd', '#e9eeea')
# teal accent (#5FB3A1): cap, LCD, START, trims
TL = ramp('#0c1d19', '#153029', '#21483e', '#2f6457', '#438a7a', '#5fb3a1', '#86d1bf', '#b5ead9', '#e0f8ef')
# whole blood / red blood cells (#C8202F)
BL = ramp('#24040a', '#3e0710', '#5c0b17', '#7c101f', '#9e1626', '#c8202f', '#e2434c', '#f77a74', '#ffb3a6')
# packed red cells: same hue, one step darker and less bright
PK = ramp('#1a0307', '#2c050c', '#420812', '#5a0b18', '#741020', '#8f1628', '#ad2535', '#cc4a52')
# plasma gold (#F2B33D)
PL = ramp('#3d2606', '#64400b', '#8e5d12', '#b87c19', '#dc9a25', '#f2b33d', '#f8cc63', '#fce196', '#fff3cf')
# glass (teal grey)
GL = ramp('#1f2827', '#2f3c3a', '#465956', '#637b77', '#86a19c', '#adc6c0', '#d3e6e0', '#f1faf6')
# buffy coat / white cells
WC = ramp('#5d6866', '#86918e', '#b9bfb7', '#dcdcd2', '#efede4', '#fffdf6')

GOLD_DIM = (40, 30, 16)    # PL[0] half-mixed into the charcoal: reveal rays
WHITE = (255, 253, 247)
INK = MW[7]          # text colour
OUTLINE = BG[0]      # darkest outline
