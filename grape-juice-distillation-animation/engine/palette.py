"""A limited 8-bit palette: flat colours, at most a checker dither between two neighbours.

Dark navy background; deep grape purple for the juice (red-leaning, hue ~308-325, so it never reads as blue-violet);
violet only as a highlight on the grapes; cyan only for the cooling water; white edges for clear liquid and glass
glints; amber only for the heat cue; a grey mantle with a red indicator; yellow only for electric current.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


NAVY = ramp('#050912', '#08101e', '#0b1527', '#0e1b30', '#13233c', '#1a2d4a', '#22395a')     # 0 darkest .. 6
OUTLINE = NAVY[0]
WHITE = hx('#ffffff')
GLASS = ramp('#3d5372', '#6d86a6', '#a9bdd4', '#dfe9f4')          # glass edges: shadow .. light
JUICE = ramp('#2a0a26', '#4a1042', '#6a1a5c', '#8e2e78')          # deep grape purple, dark .. surface
GRAPE = ramp('#2e0b34', '#4d1450', '#702070', '#9b5fd0', '#c9a0ee')   # body .. violet highlights
STEM = ramp('#3b4a1e', '#61752e', '#8ea444')
WATER = ramp('#0c5470', '#1f9ec4', '#6fdcf2')                      # cooling water only
AMBER = ramp('#c9781e', '#f2b347', '#ffe08a')                      # heat cue only
MANTLE = ramp('#1b2029', '#2c3442', '#454f60', '#69748a')
LED_OFF, LED_ON = hx('#4a1414'), hx('#ff4a3a')
GLOW = ramp('#5a1e10', '#9a3a14', '#d8641c')                       # the mantle's heating lining
METAL = ramp('#1c232e', '#2e3846', '#4a5666', '#6f7c8e')          # stand, clamps
HOSE = ramp('#14181e', '#252b33', '#3a424d')
CORK = ramp('#5a3a1c', '#8a5a2c', '#b58648')
VAPOR = hx('#dfe7f2')
CLEAR = ramp('#24406a', '#36577f', '#4d6f96')                      # clear liquid: the navy behind, lifted (not cyan)
BENCH = ramp('#0a1220', '#141f33', '#22324d')
SILVER = ramp('#8b94a3', '#d4d9e1')
FABRIC = ramp('#6f6658', '#9a8f7a', '#c9bda3')                     # the heater's glass-fibre bowl
ELEC = hx('#fff35c')                                               # electric current, inside the heater x-ray only
