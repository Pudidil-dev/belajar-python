"""Palette: the skill's `navy` set (#0D1B2A #16293D #EEF3F6 #8FA3B3 #5CC8E0 #F2A93B) grown into 16-bit ramps.

Every colour in the film comes from these ramps (dark -> light). Shading picks a tone from a ramp with ordered
(Bayer) dithering, the way 16-bit games drew gradients. The navy stays at hue ~211 deg (outside the blue-purple zone);
the device is the brief's light gray, the medicine and the mist are the cyan accent, the piezo ceramic and its drive
glow are the amber accent.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# background navy (bg #0D1B2A, surface #16293D)
NV = ramp('#050b12', '#08111b', '#0b1724', '#0d1b2a', '#112135', '#16293d', '#1c3248', '#233c55', '#2c4863')
# device light gray (cool neutral, highlights reach the navy palette's ink #EEF3F6)
GR = ramp('#1a2028', '#2c343e', '#424c57', '#5d6873', '#7c8792', '#9ca6b0', '#bcc5cd', '#d6dde3', '#eef3f6',
          '#ffffff')
# medicine / liquid (accent #5CC8E0)
CY = ramp('#06222b', '#0a3340', '#0f4656', '#175f72', '#227c90', '#3399ae', '#5cc8e0', '#8edbea', '#bdecf4',
          '#e6fafd')
# aerosol white (cool whites)
MI = ramp('#2e4a5a', '#4d6f80', '#7899a8', '#a3c1cc', '#c9e0e7', '#e4f2f6', '#f7fcfd')
# piezo ceramic, drive glow (accent2 #F2A93B)
AM = ramp('#2c1704', '#4a2707', '#6e3b0b', '#965211', '#bf6c19', '#e08b25', '#f2a93b', '#f8c56d', '#fcdea4',
          '#fff4dc')
# mesh / steel
MT = ramp('#1d232a', '#2f3842', '#45505c', '#5f6b78', '#7d8996', '#9ea9b4', '#c0c9d1', '#e0e6eb', '#f8fafb')
# skin (warm medium)
SK = ramp('#2a140f', '#4a2318', '#6b3422', '#8c4a2f', '#ab603c', '#c4774c', '#d89261', '#e8af80', '#f4cba4',
          '#fbe3c9')
# lips / inner mouth / blush
LP = ramp('#3a1414', '#5c201f', '#7e302c', '#9e4239', '#ba5849', '#cf725d')
# hair (dark brown)
HR = ramp('#0c0807', '#16100e', '#211915', '#2e231d', '#3d2f26', '#4f3d31', '#66503f', '#7e6550')
# shirt (muted slate teal)
SH = ramp('#0b161b', '#112229', '#183039', '#21404a', '#2b525d', '#376571', '#467985', '#5b8f9a')
# elastic strap (soft teal gray)
ST = ramp('#1f3036', '#2f4750', '#41606a', '#557a84', '#6c949d', '#87aeb5')
# circuit board (dark green-teal)
PC = ramp('#07130f', '#0c1f19', '#123027', '#1a4436', '#255b48', '#33735b', '#468c6f')
# wires / battery accents
RED = ramp('#3d0d0d', '#6a1717', '#962424', '#bf3838', '#dd5a4c')
WIRE_DARK = ramp('#0b0d10', '#1a1e24', '#2b3139', '#3e4650')

EYE_WHITE = hx('#e6e1d8')
EYE_SHADE = hx('#b9b2a8')
IRIS = hx('#3a2416')
PUPIL = hx('#0b0706')
WHITE = (255, 255, 255)
INK = GR[8]          # text colour (#EEF3F6)
SUB = hx('#8fa3b3')  # thin lines, leader lines
OUTLINE = NV[0]      # darkest outline
