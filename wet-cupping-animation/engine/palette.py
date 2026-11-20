"""A limited 8-bit palette: flat colours, at most a checker dither between two neighbours.

Dark navy background; warm skin; friendly reds for blood (never a dark, realistic gore red); clear glass in pale
grey-blue with white glints; teal nitrile gloves; a reddish-purple cupping mark (hue ~340, so it never reads as
blue-violet); pale yellow fat, red-brown muscle and pink dermis in the cutaway.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


NAVY = ramp('#050912', '#08101e', '#0b1527', '#0e1b30', '#13233c', '#1a2d4a', '#22395a')     # 0 darkest .. 6
OUTLINE = NAVY[0]
WHITE = hx('#ffffff')
SKIN = ramp('#7a4632', '#a8634a', '#cf865f', '#e7a77d', '#f5c9a2')       # shadow .. highlight
EPI = ramp('#b8714f', '#d99772', '#f0bf98')                          # epidermis (cut face)
DERMIS = ramp('#c9707a', '#e0949a', '#f2b8b8')                      # dermis (cut face), collagen lines in [0]
FAT = ramp('#c9a24e', '#e8c76a', '#f6e3a0')                          # subcutaneous fat lobules
MUSCLE = ramp('#6e2424', '#953333', '#b8504a')                       # muscle (striated)
BLOOD = ramp('#8e0f1c', '#c81e2b', '#ef3b45', '#ff8a7a')             # dark .. highlight
CLOT = ramp('#5e0a16', '#861422', '#b02a36')                         # the collected blood thickening
PLASMA = ramp('#d8574a', '#f07a5e')                                  # fluid around the cells, close up
VESSEL = ramp('#7c1424', '#b8202e', '#e04048')                       # vessel walls / lumen
MARK = ramp('#7a2342', '#a3375a', '#c45577')                         # the cupping mark (reddish purple)
MARKER = hx('#8a3a2a')                                               # skin-marker dots on the chosen spots
GLASS = ramp('#3d5372', '#6d86a6', '#a9bdd4', '#dfe9f4')             # glass edges: shadow .. light
GLOVE = ramp('#1f6f68', '#2fa59a', '#6fd6c8')                        # teal nitrile gloves
STEEL = ramp('#5a6372', '#9aa4b0', '#d4dae2')
PUMP = ramp('#262b33', '#3a414c', '#59626f', '#7d8794')              # the hand pump body
ORANGE = ramp('#c4621c', '#f28a2e', '#ffc06a')                       # lancet button, pump trigger
HOSE = ramp('#5a7088', '#8fa6bf', '#c4d4e4')                         # clear silicone hose
GAUZE = ramp('#c9cbc4', '#e6e7e1', '#ffffff')
AIR = hx('#cfd8e6')                                                  # air particles
HAIR = ramp('#1e1410', '#3a261c', '#5a3c2a')
TABLE = ramp('#0b1220', '#122036', '#1b2d48')
