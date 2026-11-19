"""A limited 8-bit palette for a pharma factory at work.

A dark pharma-green factory wall; a white and stainless blister machine; the hero's red-and-white capsule; yellow game
text; orange for heat and only for heat; light blue for air and water and only for those; aluminium greys for the foil;
skin tones for the hand at the end. The UI adds a green for PASS and a crimson for REJECT. No hue sits in the
blue-violet range (225-300 degrees).
"""


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def ramp(*cols):
    return [hx(c) for c in cols]


OUTLINE = hx('#0b1a17')
WHITE = hx('#ffffff')
WALL = ramp('#0f2420', '#163029', '#1d3b34', '#285043', '#356653')          # pharma-green wall, dark .. light
FLOOR = ramp('#121c1a', '#1c2a27', '#283a35', '#384f48')                   # epoxy floor
STEEL = ramp('#262e32', '#46535a', '#74838b', '#a9b6bd', '#d7e0e4')         # stainless parts, dark .. light
BODY = ramp('#7f8c94', '#b9c3c9', '#e1e8eb', '#f6f9fa')                    # the machine's white panels
RED = ramp('#76101f', '#b3182c', '#e2343c', '#ff7a66')                      # the capsule's red cap
CAPW = ramp('#8d989f', '#cdd5da', '#eef2f4', '#ffffff')                     # the capsule's white body
YELLOW = ramp('#9e7404', '#e0b010', '#ffd736', '#fff3a0')                   # game text, the player tag, stars
HEAT = ramp('#7a3206', '#c8580c', '#ff8a1f', '#ffc06a')                     # heat only
AIR = ramp('#246f93', '#4aa9d8', '#8fd8f6', '#d6f4ff')                      # air and water only (hue ~199)
GLASS = ramp('#2c4d49', '#6d9a95', '#b6dcd7', '#e8fbf8')                    # clear PVC film and acrylic
FOIL = ramp('#4e5a60', '#7e8b92', '#aeb9bf', '#dbe3e7')                     # aluminium lidding foil
SKIN = ramp('#6b3524', '#a8603d', '#dc966b', '#f4c39b')                     # the hand
PASS = ramp('#14602c', '#2fbf5c', '#9cf5b4')                                # UI: tick, PASS
REJ = ramp('#6e0b25', '#e0284f', '#ff8ca2')                                 # UI: cross, REJECT
HUD = ramp('#061210', '#0e221e', '#183a33')                                 # dark UI panels, the monitor
SCREEN = ramp('#06140f', '#0c2a1f', '#8dffad')                              # monitor: dark .. lit
SPARK = ramp('#ffab00', '#ffe066', '#fff8cc')
CARTON = ramp('#5a3c22', '#8a6440', '#b48a5c', '#d8b585')                   # boxes on the racks
LAMP = ramp('#3fcf6a', '#ffb020', '#ff3b3b')                                # the stack light: green, amber, red
