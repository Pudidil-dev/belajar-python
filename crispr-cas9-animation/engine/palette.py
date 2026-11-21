"""Palette: the repo's `ink` set, the same family as the blood centrifuge film (charcoal, warm white, gold, teal,
plus blood red), shifted to a dark navy nucleus so the molecules glow against it.

Every sprite gets a short ramp (dark .. light). Shading picks a tone from a ramp in flat bands with ordered (Bayer)
dithering, which is how 16-bit games drew gradients; every sprite carries a 1-px dark outline.

  DNA backbone   teal (#5FB3A1), the ink set's accent: the molecule the film is about
  Cas9           warm white with teal-grey shadows (#F2EFE8), like the centrifuge's machine: the protein is the
                 machine of this film
  guide RNA      gold (#F2B33D): one bright contrasting strand
  HNH / RuvC     blood red (#C8202F) and bright teal: the two cutting domains
  bases          green, red, gold and blue beads, the four letters of the code

The navy sits at hue ~214 degrees: dark navy, but clear of the blue-violet band (225-300) the quality gate flags.
"""


def hx(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


# the nucleus: the ink charcoal, tinted navy (hue ~214)
NAVY = ramp('#05080E', '#080D16', '#0C1420', '#101B2B', '#152236', '#1C2C43', '#243752', '#2E4463')
DUST = ramp('#1B2D42', '#2A4461', '#3E6288', '#5B86AE')              # specks and little proteins drifting past
CHROMATIN = ramp('#111D2C', '#17273A')                                # far, out-of-focus packed DNA

# the DNA backbone: the ink teal (#5FB3A1)
BACK = ramp('#0C1D19', '#21483E', '#438A7A', '#5FB3A1', '#86D1BF', '#E0F8EF')
# the four bases (outline, dark, mid, light)
A_ = ramp('#0E2A06', '#2E7A12', '#5CC428', '#A8F070')                 # adenine: green
T_ = ramp('#24040A', '#7C101F', '#C8202F', '#F77A74')                 # thymine: the ink red
G_ = ramp('#3D2606', '#B87C19', '#F2B33D', '#FCE196')                 # guanine: the ink gold
C_ = ramp('#0A1A33', '#1F57B8', '#2F78D6', '#A9CBFF')                 # cytosine: blue (hue ~214)
U_ = ramp('#3D1A02', '#A85E0A', '#F08A1E', '#FFD08A')                 # uracil (RNA): amber
BASES = {'A': A_, 'T': T_, 'G': G_, 'C': C_, 'U': U_}

# the guide RNA: the ink gold ramp
RNA = ramp('#3D2606', '#64400B', '#8E5D12', '#B87C19', '#DC9A25', '#F2B33D', '#F8CC63', '#FCE196', '#FFF3CF')

# Cas9: warm white with teal-grey shadows (the ink #F2EFE8 ramp, nine steps like the centrifuge film's)
CAS = ramp('#22282A', '#3C4645', '#5D6866', '#86918E', '#ADB7B3', '#CFD6D2', '#E6E9E4', '#F2EFE8', '#FFFDF7')
# aluminium, for the domains' rims and the lens-like UI
AL = ramp('#15191B', '#232A2C', '#343D3F', '#4A5556', '#64706F', '#82908D', '#A6B1AE', '#C9D1CD', '#E9EEEA')
HNH = ramp('#24040A', '#5C0B17', '#9E1626', '#C8202F', '#E2434C', '#FFB3A6')    # cuts the target strand
RUVC = ramp('#0C1D19', '#153029', '#21483E', '#2F6457', '#438A7A', '#5FB3A1', '#86D1BF', '#B5EAD9', '#E0F8EF')  # cuts the other strand
PI = ramp('#3D2606', '#8E5D12', '#DC9A25', '#F2B33D', '#F8CC63')               # reads the PAM

# repair: the ring that holds the ends (green) and the ligase that seals them (gold)
KU = ramp('#0E2A06', '#27620F', '#44961E', '#6CBB3C', '#A8F070')
LIG = ramp('#3D2606', '#B87C19', '#F2B33D', '#FCE196', '#FFF3CF')

# effects and UI
WHITE = (255, 253, 247)
SPARK = ramp('#FCE196', '#FFFDF7')
FLASH = ramp('#FFF3CF', '#FFFDF7')
BAD = ramp('#5C0B17', '#C8202F', '#F77A74')                           # a mismatch
GOOD = ramp('#0E2A06', '#5CC428', '#A8F070')                          # a match
GOLD_DIM = (40, 30, 16)                                               # gold half-mixed into the navy: reveal rays
UI_TEXT = hx('#F2EFE8')
UI_LINE = hx('#86918E')
OUTLINE = NAVY[0]
# aliases so the shared fx module (taken from the blood centrifuge film) finds its ramps
BG = NAVY
MW = CAS
TL = RUVC
PL = RNA
