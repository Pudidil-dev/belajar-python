"""A limited 8-bit palette for a bright, fun lab.

Teal tile walls and a grey bench; a white vortex mixer with lime-green accents and a black rubber cup; clear glass with
white glints; blue nitrile gloves (hue ~213, below the blue-violet range); and the two dyes of the story: a dense red
layer that sinks and a light yellow layer that floats, which mix into orange. Each colour has one job.
"""


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def ramp(*cols):
    return [hx(c) for c in cols]


OUTLINE = hx('#0b1a1d')
WHITE = hx('#ffffff')
WALL = ramp('#132a2d', '#1b3b3f', '#24494d', '#2e5a5d', '#3d6f6f')          # teal tiles, dark .. light
BENCH = ramp('#1d2126', '#2c3238', '#5d666f', '#a3acb4', '#d3d9de')         # cabinet .. top highlight
WOOD = ramp('#4a3020', '#6b4a2f', '#8a6440', '#a77d52')
BODY = ramp('#4f5b65', '#808c96', '#b3bdc5', '#d8dee3', '#f2f5f7')          # the mixer's white plastic
LIME = ramp('#2f6a16', '#5bb22a', '#9be452', '#d8ffaa')                     # mixer accents (knob, stripe, light)
RUBBER = ramp('#16191c', '#272b30', '#3b4148', '#565e66')
GLASS = ramp('#2f4a52', '#6f939c', '#b4cfd5', '#e2f0f2')
RED = ramp('#76101f', '#b3182c', '#e2343c', '#ff7a66')                      # the dense, red dye layer
YELLOW = ramp('#9e7404', '#e0b010', '#ffd736', '#fff3a0')                   # the light, yellow layer
MIXED = ramp('#9a3c0c', '#d86414', '#ff9628', '#ffc867')                    # the two mixed: orange
COPPER = ramp('#5e2c12', '#a3561f', '#d98a45', '#ffc07a')
STEEL = ramp('#262d33', '#4f5962', '#848f98', '#bcc5cc')
PCB = ramp('#0f3b26', '#1a5c3a', '#3fa66a')
LCD = ramp('#0c241a', '#163c2a', '#8dffad')                                 # display: dark .. lit digits
HUD = ramp('#081416', '#10262a', '#1b3d42')                                 # game UI panels
CYAN = ramp('#1f8f8a', '#3fd2c8', '#a6fff5')                                # UI accents, the x-ray scan
SPARK = ramp('#ffab00', '#ffe066', '#fff8cc')
GLOVE = ramp('#1b4c94', '#2f78d6', '#79b5ff')
GREEN = ramp('#1f6b2c', '#3fae4a', '#8be37a')                               # a flask on the shelf
PINK = ramp('#8c1f4e', '#d8457f', '#ff9cc0')                                # another flask (hue ~335)
AMBER = ramp('#6a3a08', '#b8701a', '#f0a840')                               # a brown bottle
SKY = ramp('#7fc6c0', '#b9e6df', '#e9fbf6')                                 # the window
