"""Palette for the dialysis pixel-art video.

Base: huashu-art-motion `navy` (flat navy ground, hue ~210 deg, never a
blue-purple gradient) + cyan accent + amber accent. Subject colours follow the
brief's colour code: blood red, dialysate blue, urea yellow, water light blue,
albumin purple (small particles only), membrane pale grey, machine cool white.
Every material has a short ramp (outline -> highlight) for 16-bit shading.
"""


def hx(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# Navy ground (hue ~210 deg)
BG0 = hx("#07111d")
BG1 = hx("#0d1b2a")   # navy bg
BG2 = hx("#122234")
BG3 = hx("#16293d")   # navy surface
BG4 = hx("#1e364f")
BG5 = hx("#2a4866")

# UI: cyan accent, ink, sub
CY0 = hx("#154a63")
CY1 = hx("#2e8fb0")
CY2 = hx("#5cc8e0")   # navy accent
CY3 = hx("#b4ecf7")
WHITE = hx("#eef3f6")  # navy ink
SUB = hx("#8fa3b3")    # navy sub
AMB = hx("#f2a93b")    # navy accent2
AMB0 = hx("#7a4a12")

# Machine body (cool whites)
M0 = hx("#1f2c3d")
M1 = hx("#44566b")
M2 = hx("#7a8ea3")
M3 = hx("#b5c3d1")
M4 = hx("#dde6ee")
M5 = hx("#f6fafc")

# Blood reds
R0 = hx("#2b0510")
R1 = hx("#5c0a1f")
R2 = hx("#8e1230")
R3 = hx("#c11d3a")
R4 = hx("#e8475a")
R5 = hx("#ff9a94")

# Plasma / blood compartment ground
PL0 = hx("#1c0911")
PL1 = hx("#2a0d19")
PL2 = hx("#381222")
PL3 = hx("#4a182d")

# Dialysate blues
B0 = hx("#06213a")
B1 = hx("#0b3a5e")
B2 = hx("#145f91")
B3 = hx("#2d8fd0")
B4 = hx("#84cff7")

# Dialysate compartment ground
DL0 = hx("#061524")
DL1 = hx("#0a1e33")
DL2 = hx("#0e2a45")
DL3 = hx("#143757")

# Urea (warm yellow, ties to the amber accent)
U0 = hx("#6b4a0e")
U1 = hx("#c98a1c")
U2 = hx("#f2c23b")
U3 = hx("#fff1a8")

# Water (light blue)
W0 = hx("#2a7cb8")
W1 = hx("#6ccbff")
W2 = hx("#d6f4ff")

# Albumin / proteins (purple, small particles only)
P0 = hx("#241042")
P1 = hx("#4b2486")
P2 = hx("#7d4bc9")
P3 = hx("#b48cf5")

# Skin (neutral medium tone)
S0 = hx("#3e2219")
S1 = hx("#7a4634")
S2 = hx("#a8664c")
S3 = hx("#c98968")
S4 = hx("#e6b292")
S5 = hx("#f6d2b8")
VEIN = hx("#94626a")

# Medical tape
T0 = hx("#8f8a7c")
T1 = hx("#c9c3b2")
T2 = hx("#ece7da")

# Arterial (red) / venous (blue) colour codes for clamps, wings, caps
CR0 = hx("#6e0f1c")
CR1 = hx("#d42c3c")
CR2 = hx("#ff6a70")
CV0 = hx("#10305e")
CV1 = hx("#2f6fd0")
CV2 = hx("#7ab0ff")

# Status LED green
G1 = hx("#2fd67a")
G2 = hx("#b6ffd0")

# Dialysate fill inside the dialyzer: a distinct cool blue so it reads as a
# moving fluid, not as empty background (review v2 #5)
DS0 = hx("#0b2c44")
DS1 = hx("#0f3a55")
DS2 = hx("#134a6a")
DS3 = hx("#1b5d84")

# Venous (return) side: maroon instead of blue, so blue means dialysate only
# (review v2 #6)
VN0 = hx("#3b0a18")
VN1 = hx("#6e1a2c")
VN2 = hx("#9a3346")
