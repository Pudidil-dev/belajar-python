"""Palette: the repo's `navy` set (flat dark navy, surface, ink white, cyan accent) plus a white microscope, blood red
and the warm pink and plum of a stained blood smear.

Every colour comes from these ramps (dark -> light); shading picks a tone from a ramp with ordered (Bayer) dithering.
The navy stays near hue 210 and the stain purple is a red-leaning plum (hue > 300), so nothing lands in blue-purple.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# navy background (flat #0D1B2A, surface #16293D)
BG = ramp('#050c15', '#08121e', '#0a1622', '#0d1b2a', '#112236', '#16293d', '#1d3550', '#25425f', '#2f5272')
INK = hx('#eef3f6')
WHITE = (255, 253, 247)
OUTLINE = BG[0]
# the microscope's white body (cool shadows)
WH = ramp('#24323f', '#3b4c5c', '#5a6c7e', '#8193a5', '#a9b8c6', '#ccd7e0', '#e7eef3', '#f8fbfd')
# dark parts: stage, knobs, condenser, eyepiece
DK = ramp('#070b10', '#0e151d', '#17212c', '#22303e', '#304152', '#435668', '#5d7287')
# chrome: nosepiece and objectives
ST = ramp('#26303a', '#3f4b57', '#5f6c78', '#87949f', '#b0bcc5', '#d6dee4', '#f2f6f8')
# glass (cool) and the cyan accent
GL = ramp('#163242', '#24495c', '#386b80', '#5a93a8', '#8cc1d2', '#c4e6ee', '#ecfafd')
CY = ramp('#16495a', '#246f86', '#3a9cb6', '#5cc8e0', '#98e3f1', '#d8f7fc')
# lamp light (warm)
LT = ramp('#5b3f17', '#8a6224', '#bb8b35', '#e2b555', '#f6d98a', '#fff1c4', '#fffbec')
# objective colour bands (4x red, 10x yellow, 40x blue-cyan, 100x white)
RING = {'red': ramp('#5e1018', '#9c1d28', '#cf3340', '#ee6a6f'),
        'yellow': ramp('#6b4c08', '#b0820d', '#e8b51e', '#f8db6a'),
        'cyan': ramp('#0f4a5e', '#1b7c99', '#33aed0', '#7fd8ec'),
        'white': ramp('#7b8894', '#b7c3cc', '#e9eef2', '#ffffff')}
# fresh blood
BL = ramp('#24040a', '#3e0710', '#5c0b17', '#7c101f', '#9e1626', '#c8202f', '#e2434c', '#f77a74', '#ffb3a6')
# the stained smear seen with the naked eye (macro): magenta-pink, darker where the film is thick
SM = ramp('#3d1128', '#5c1a3c', '#7e2652', '#a03a6b', '#bf5a87', '#d684a6', '#e8b0c4', '#f5d7e1')
# under the microscope: pink red cells, plum nuclei, lilac cytoplasm, the bright field
PK = ramp('#6e2638', '#94364b', '#b84b61', '#d36a7d', '#e48d9c', '#efb0ba', '#f7d1d5')
PU = ramp('#2e0f2a', '#4b1846', '#6a2462', '#8a3580', '#a54e9a', '#be72b2')
LI = ramp('#9b8199', '#b49cb2', '#cbb6c8', '#ddcdd9', '#ece2ea')
FD = ramp('#cfc4b8', '#e0d6ca', '#ece4d9', '#f6efe5', '#fdf9f2')
