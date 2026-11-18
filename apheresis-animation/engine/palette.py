"""A compact 8-bit palette for a friendly medical-tech scene. Navy background (hue ~211, outside the blue-purple
zone), an off-white machine, deep red blood, pale yellow plasma, warm gold platelets, blue-gray tubing, muted cool
chair. Flat pixel-cluster shading only (no gradients, no glow)."""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


NAVY = ramp('#050b12', '#0d1b2a', '#16293d', '#1f3550', '#2c4863')
MACH = ramp('#4f5a66', '#7d8995', '#aeb8c2', '#d5dce3', '#eef1f4', '#ffffff')
TEAL = ramp('#0e4a57', '#1c7d92', '#3fc6dc', '#9beaf5')
RED = ramp('#2a0b10', '#4a0e14', '#8e1b23', '#b3262e', '#d9483f', '#e9877b')
PLASMA = ramp('#b89a45', '#e9d27a', '#f6e7a6', '#fff6cf')
GOLD = ramp('#7a4e0e', '#b8791a', '#f2b33d', '#ffd878')
TUBE = ramp('#3e5163', '#6f8396', '#9fb3c8', '#dfe9f2')
CHAIR = ramp('#24384a', '#3e5666', '#5e7a8c', '#7e9aac')
SKIN = ramp('#6e4632', '#9c6a4c', '#c98f6b', '#e8b48f', '#f5d3b8')
BLANKET = ramp('#5f7a8f', '#8fa8bb', '#c2d3df')
SIL = ramp('#17263a', '#22354c', '#2e4560')
BLUE = ramp('#10284a', '#1f4f8a', '#3a7bc8', '#8fbdf0')
MINT = ramp('#164a33', '#2e8c5d', '#6bd59b', '#b6f2cf')
ION = ramp('#2f5f80', '#5d8fb0', '#cfe8f7')
WBC = ramp('#7f9bb5', '#d9e2e8', '#f2f4f5')
WHITE = (255, 255, 255)
INK = hx('#eef3f6')
SUB = hx('#8fa3b3')
OUTLINE = NAVY[0]
