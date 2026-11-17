"""A compact 8-bit palette: navy bench, warm ivory card, three reds (plus outline and plasma darks), gold A markers,
cyan Anti-A antibody, mint Anti-B antibody, glass for the droppers. Shading is done with flat clusters of these
colours (no gradients, no glow). Navy stays at hue ~211 deg, outside the blue-purple zone."""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


NAVY = ramp('#050b12', '#0d1b2a', '#16293d', '#1f3550', '#2c4863')
IVORY = ramp('#6b5a45', '#a8957a', '#e2d3b5', '#f5ead3', '#fffbef')     # border, line, shade, card, highlight
RED = ramp('#2a0b10', '#4a0e14', '#8e1b23', '#b3262e', '#d9483f', '#e9877b')   # plasma, outline, dark, mid, light, pale
GOLD = ramp('#7a4e0e', '#f2b33d', '#ffd878')
CYAN = ramp('#0e4a57', '#1c7d92', '#3fc6dc', '#9beaf5')
MINT = ramp('#164a33', '#2e8c5d', '#6bd59b', '#b6f2cf')
GLASS = ramp('#5d6873', '#9ca6b0', '#d6dde3', '#eef3f6')
RUBBER = ramp('#1d1f22', '#33363a', '#4c5054', '#6a6e71')
WHITE = (255, 255, 255)
INK = hx('#eef3f6')
SUB = hx('#8fa3b3')
OUTLINE = NAVY[0]
