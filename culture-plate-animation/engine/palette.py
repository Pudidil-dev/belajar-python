"""Palette: the repo's `ink` set (charcoal, warm white, gold, teal, teal-grey glass), the same ramps as the blood
centrifuge film, plus the agar, the colonies and the bacteria.

Every colour comes from these ramps (dark -> light). Shading picks a tone from a ramp with ordered (Bayer)
dithering, the way 16-bit games drew gradients. The bench is a dark charcoal lab bench (black epoxy), so the pale
plate glows on it. No blue-purple anywhere: glass and shadows lean teal-grey, the background is neutral charcoal.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# background charcoal (ink #121417, surface #1E2226): the lab bench
BG = ramp('#08090a', '#0d0f11', '#121417', '#171a1d', '#1e2226', '#262b30', '#30363c', '#3b4248')
# warm white with teal-grey shadows (ink #F2EFE8): the swab's stick, the clock face, UI white
MW = ramp('#22282a', '#3c4645', '#5d6866', '#86918e', '#adb7b3', '#cfd6d2', '#e6e9e4', '#f2efe8', '#fffdf7')
# aluminium: the lens barrel
AL = ramp('#15191b', '#232a2c', '#343d3f', '#4a5556', '#64706f', '#82908d', '#a6b1ae', '#c9d1cd', '#e9eeea')
# teal accent (#5FB3A1): lens glow, clock rim, trims
TL = ramp('#0c1d19', '#153029', '#21483e', '#2f6457', '#438a7a', '#5fb3a1', '#86d1bf', '#b5ead9', '#e0f8ef')
# gold (#F2B33D): the cursor, sparkles, the reveal's light
PL = ramp('#3d2606', '#64400b', '#8e5d12', '#b87c19', '#dc9a25', '#f2b33d', '#f8cc63', '#fce196', '#fff3cf')
# glass (teal grey): the Petri dish
GL = ramp('#1f2827', '#2f3c3a', '#465956', '#637b77', '#86a19c', '#adc6c0', '#d3e6e0', '#f1faf6')
# whites (cotton)
WC = ramp('#5d6866', '#86918e', '#b9bfb7', '#dcdcd2', '#efede4', '#fffdf6')

# the agar: pale yellow and translucent, deep amber where it climbs the wall, glowing on the dark bench
AG = ramp('#3a2a10', '#5e4519', '#856427', '#ab853a', '#c9a352', '#ddbc6c', '#ead08a', '#f3e0a8', '#faefc9')
# colonies: warm white domes
COL = ramp('#4c4231', '#7d725a', '#a99f84', '#cec5aa', '#e7e0c9', '#f6f2e4', '#fffef8')
# the bacteria up close: cream rods with a warm dark outline
CELL = ramp('#2a1d10', '#6b5332', '#a08559', '#c9b07f', '#e4d1a5', '#f5e9cb', '#fffaf0')

GOLD_DIM = (40, 30, 16)    # gold half-mixed into the charcoal: the reveal's rays
WHITE = (255, 253, 247)
INK = MW[7]
OUTLINE = BG[0]
