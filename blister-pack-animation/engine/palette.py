"""A limited 8-bit palette for a clean, bright blister line seen from above.

A deep teal factory floor far below; a dark steel machine bed with mint-green machine paint; clear film with white
glints; the hero's red-and-white capsule; silver foil; yellow game text; orange for heat and only for heat; light blue
for air and only for air; skin tones for the hand. The UI adds a green for PASS and a crimson for REJECT. No hue sits
in the blue-violet range (225-300 degrees).
"""


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def ramp(*cols):
    return [hx(c) for c in cols]


OUTLINE = hx('#0a1416')
WHITE = hx('#ffffff')
FLOOR = ramp('#0b2a2c', '#0f3a3c', '#14494b', '#1b5c5d')                   # the factory floor far below
BED = ramp('#1a2124', '#232c30', '#2e393e', '#3c494f', '#53626a')           # the machine bed under the film
PAINT = ramp('#0f5a45', '#17805f', '#25a879', '#5fd3a2', '#b4f2d6')        # mint machine paint (frames, gantries)
STEEL = ramp('#262e32', '#46535a', '#74838b', '#a9b6bd', '#d7e0e4')
GLASS = ramp('#2f5f63', '#5f989b', '#a6d6d6', '#e3faf8')                   # clear PVC film
FOIL = ramp('#4e5a60', '#7e8b92', '#aab6bc', '#d3dce0', '#f2f6f8')
RED = ramp('#76101f', '#b3182c', '#e2343c', '#ff7a66')                      # the capsule's red cap
CAPW = ramp('#8d989f', '#cdd5da', '#eef2f4', '#ffffff')                     # the capsule's white body
YELLOW = ramp('#9e7404', '#e0b010', '#ffd736', '#fff3a0')                   # game text, the player tag, hazard stripes
HEAT = ramp('#7a3206', '#c8580c', '#ff8a1f', '#ffc06a')                     # heat only
AIR = ramp('#246f93', '#4aa9d8', '#8fd8f6', '#d6f4ff')                      # air only (hue ~199)
SKIN = ramp('#6b3524', '#a8603d', '#dc966b', '#f4c39b', '#ffe0c6')          # the hand
PASS = ramp('#14602c', '#2fbf5c', '#9cf5b4')                                # UI: tick, PASS
REJ = ramp('#6e0b25', '#e0284f', '#ff8ca2')                                 # UI: cross, REJECT
HUD = ramp('#061210', '#0e221e', '#183a33', '#2b5a50')                      # dark UI panels, the text box
SPARK = ramp('#ffab00', '#ffe066', '#fff8cc')
LASER = ramp('#a3002a', '#ff2a4d', '#ffb3c1')                               # the scanner's laser
