"""Palette: the skill's navy set grown into 16-bit ramps, plus cloudy gray, stir-bar white and magnet red.

Every colour in the film comes from these ramps (dark -> light). The navy stays at hue ~211 deg, outside the
blue-purple zone. Roles: navy = background and the stirrer's front panel; steel gray = glass, plate, motor;
off-white = stir bar and stirrer body; cloudy gray = the calcium carbonate suspension; red = the magnet's N pole;
amber = the knob pointer, the power light and the glints.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


NV = ramp('#050b12', '#08111b', '#0b1724', '#0d1b2a', '#112135', '#16293d', '#1c3248', '#233c55', '#2c4863')
# stirrer housing: off-white, slightly warm
BODY = ramp('#1d1f22', '#33363a', '#4c5054', '#6a6e71', '#8b8f90', '#acafae', '#c9cbc7', '#dfe0da', '#efeee7',
            '#fbfaf3')
# glass, plate, deck: cool gray (steel gray #8FA3B3 sits between 4 and 5)
GR = ramp('#1a2028', '#2c343e', '#424c57', '#5d6873', '#7c8792', '#9ca6b0', '#bcc5cd', '#d6dde3', '#eef3f6',
          '#ffffff')
# steel: motor can, shaft
MT = ramp('#1d232a', '#2f3842', '#45505c', '#5f6b78', '#7d8996', '#9ea9b4', '#c0c9d1', '#e0e6eb', '#f8fafb')
# the white PTFE stir bar
WB = ramp('#2a3038', '#4a535d', '#77818b', '#a6afb7', '#cdd4d9', '#e9eef1', '#f7f9fa', '#ffffff')
# the cloudy calcium carbonate suspension (#C9CFD4)
CL = ramp('#3c4248', '#5b6268', '#7d848a', '#9ea5aa', '#b6bcc0', '#c9cfd4', '#d9dee1', '#e8ebed', '#f4f6f7')
# magnet red (#E0533D) for the N pole
MR = ramp('#3a0d08', '#6b1a10', '#9c2a1b', '#c43e29', '#e0533d', '#ef7d64', '#f8aa94')
# amber accents (#F2A93B)
AM = ramp('#2c1704', '#4a2707', '#6e3b0b', '#965211', '#bf6c19', '#e08b25', '#f2a93b', '#f8c56d', '#fcdea4',
          '#fff2d6')
# copper motor windings (a shade of amber)
CU = ramp('#3b1d0c', '#6a3517', '#9a5224', '#c47436', '#e29a55', '#f3c08a')
WHITE = (255, 255, 255)
INK = GR[8]
SUB = hx('#8fa3b3')
OUTLINE = NV[0]
