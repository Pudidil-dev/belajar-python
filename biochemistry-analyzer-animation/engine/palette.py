"""Palette: the skill's `navy` set grown into 16-bit ramps, plus serum gold and the rose reaction dye.

Every colour in the film comes from these ramps (dark -> light). The navy stays at hue ~211 deg, the rose dye at
~344 deg, both outside the blue-purple zone. The reagent arm wears teal, the sample arm amber, so their roles read
without text.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# background navy (bg #0D1B2A, surface #16293D)
NV = ramp('#050b12', '#08111b', '#0b1724', '#0d1b2a', '#112135', '#16293d', '#1c3248', '#233c55', '#2c4863')
# analyzer body: off-white, slightly warm
BODY = ramp('#1d1f22', '#33363a', '#4c5054', '#6a6e71', '#8b8f90', '#acafae', '#c9cbc7', '#dfe0da', '#efeee7',
            '#fbfaf3')
# deck / mechanics: cool gray
GR = ramp('#1a2028', '#2c343e', '#424c57', '#5d6873', '#7c8792', '#9ca6b0', '#bcc5cd', '#d6dde3', '#eef3f6',
          '#ffffff')
# steel: probes, rails, stirrer
MT = ramp('#1d232a', '#2f3842', '#45505c', '#5f6b78', '#7d8996', '#9ea9b4', '#c0c9d1', '#e0e6eb', '#f8fafb')
# smoky lid
SMOKE = hx('#3a3129')
# serum (pale gold, #E0C067)
SE = ramp('#2e230c', '#4f3d16', '#76602a', '#9d813a', '#c4a14a', '#e0c067', '#eed58a', '#f8e8b4', '#fff6dc')
# reagent: nearly clear with a cool tint
RG = ramp('#16242c', '#253b47', '#3f5a68', '#62808d', '#8eaab3', '#bdd2d7', '#e0ecee', '#f5fafb')
# rose reaction dye (#D45577)
RO = ramp('#2b0a16', '#4a1226', '#6f1d39', '#96294f', '#b93a63', '#d45577', '#e57d97', '#f2a8ba', '#fbd3dc')
# teal accent: the reagent arm, its cap colours, cholesterol esterase
CY = ramp('#06222b', '#0a3340', '#0f4656', '#175f72', '#227c90', '#3399ae', '#5cc8e0', '#8edbea', '#bdecf4',
          '#e6fafd')
# amber accent: the sample arm, cholesterol oxidase, drive glow
AM = ramp('#2c1704', '#4a2707', '#6e3b0b', '#965211', '#bf6c19', '#e08b25', '#f2a93b', '#f8c56d', '#fcdea4',
          '#fff4dc')
# mint: peroxidase, OK lamps
MN = ramp('#0d2a22', '#164536', '#21614b', '#2f7f62', '#43a07c', '#62bf97', '#8fd9b6', '#c3eed9')
# measurement light
BEAM = ramp('#2e2a1a', '#575032', '#8a7e4c', '#bcae6c', '#e2d595', '#f6edbf', '#fffbe8')
# circuit board
PC = ramp('#07130f', '#0c1f19', '#123027', '#1a4436', '#255b48', '#33735b', '#468c6f')
# oxygen / peroxide beads
OXY = ramp('#3d1210', '#6e211d', '#a2352d', '#cf5446', '#ec8471', '#f8b8a8')

WHITE = (255, 255, 255)
INK = GR[8]          # #EEF3F6
SUB = hx('#8fa3b3')
OUTLINE = NV[0]
