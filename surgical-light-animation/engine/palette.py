"""A limited 8-bit palette for an operating room seen from the side, and the surgical light in x-ray.

Pale teal-grey walls, teal-blue drapes, teal-green gowns, steel for the table and the arm, a white lamp shell; in the
x-ray, green circuit boards, cyan lenses, bright LED chips, an orange heat glow and a small red sensor light. The
light itself is warm white to cool white (computed from its colour temperature). No hue sits in the blue-violet range
(225-300 degrees); the "blue" drapes are teal (about 190 degrees).
"""


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def ramp(*cols):
    return [hx(c) for c in cols]


OUTLINE = hx('#1E2B2E')
WHITE = hx('#FFFFFF')
HERO = hx('#FFF1B8')                                       # caption second lines
WALL = ramp('#A9C4C0', '#BCD3CF', '#CFE2DE', '#E0EEEB')     # operating-room walls (dark .. light)
CEIL = ramp('#B4C9C6', '#D5E3E0', '#EEF5F3')
FLOOR = ramp('#7D8B8C', '#93A2A2', '#A9B6B5')
STEEL = ramp('#4F5C61', '#76848A', '#A4B1B5', '#D6DFE1')    # table, arm, poles
SHELL = ramp('#8E9B9E', '#BCC6C7', '#E3E9E8', '#F8FAF9')    # the lamp's white housing
DRAPE = ramp('#1C5560', '#2C7A86', '#3F96A0', '#6BB7BC')    # sterile drapes (teal-blue)
GOWN = ramp('#2A615C', '#3E8C84', '#58A89C', '#86C7B8')     # surgical gowns (teal-green)
CAP = ramp('#2F6E86', '#4B8FA6', '#76B2C3')
MASK = ramp('#B9D6DA', '#DCEDEF', '#F3FAFB')
SKIN = ramp('#A86B4F', '#CF9573', '#E8B997')
GLOVE = ramp('#B9A882', '#D9CCA9', '#F1E8CF')
FIELD = ramp('#C9A27C', '#E2C29C', '#F5DFC0')               # the prepped skin in the drape window
INSTR = ramp('#6E7C82', '#C4CED1', '#FFFFFF')               # instruments
LED = ramp('#FFE9A8', '#FFF8E2', '#FFFFFF')
LENS = ramp('#5FA9B4', '#9FD3DA', '#D8F1F3')
PCB = ramp('#1C5534', '#2B7B4C', '#57B07A')
CHIP = ramp('#262C30', '#454E54')
SENSOR = ramp('#8E1E30', '#E2475B', '#FF9AA6')              # the sensors' infrared window and its indicator
HEAT = ramp('#B23A0E', '#EE7A2C', '#FFC46B')
XRAY = ramp('#9FCFD3', '#C6E8EA', '#E6F7F8')                # the see-through shell
MONITOR = ramp('#0D151A', '#1B2A33', '#34505D')
ECG = hx('#5EE6A0')
SCOPE = ramp('#C27E7A', '#E8A99A', '#F7CDBD', '#FFEBDD')    # the keyhole camera's picture (soft, no wound)
SPRING = ramp('#5D686D', '#9AA6AA', '#D3DBDD')
SPARK = ramp('#FFE7A0', '#FFFFFF')

# the light's colour at a few colour temperatures (warm .. cool white); scenes interpolate between them
CCT_RGB = ((3000, hx('#FFC48A')), (4000, hx('#FFDDB8')), (4500, hx('#FFE8CC')), (5500, hx('#F6F2EC')),
           (6700, hx('#E2ECFA')))


def light_rgb(k):
    """The light's colour at colour temperature k (kelvin)."""
    pts = CCT_RGB
    if k <= pts[0][0]:
        return pts[0][1]
    for (k0, c0), (k1, c1) in zip(pts[:-1], pts[1:]):
        if k <= k1:
            f = (k - k0) / (k1 - k0)
            return tuple(int(round(a + (b - a) * f)) for a, b in zip(c0, c1))
    return pts[-1][1]
