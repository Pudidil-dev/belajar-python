"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 18 bars = 36 s, every event sits on the 8th-note grid.

Drop -> thin film -> stained slide -> microscope -> an x-ray view of how its lenses make the image -> focus ->
individual cells -> back to the drop. The last frame is the eyepiece circle shrunk to the size and place of the opening
drop, so the 36 s video loops on a match cut.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 36.0

# ---- the ten scenes
SCENES = [
    (0.0, 2.0, 'swipe'),      # 1 the glass swipe (macro)
    (2.0, 3.0, 'glimpse'),    # 2 first glimpse through the eyepiece
    (3.0, 6.0, 'prepared'),   # 3 back to the slide: fresh smear -> prepared, stained slide
    (6.0, 9.0, 'stage'),      # 4 the slide moves onto the stage; pull back to the whole microscope
    (9.0, 12.0, 'turret'),    # 5 the objective clicks into place; the camera drops toward the lamp
    (12.0, 22.0, 'xray'),     # 6 x-ray side view: how the light and the lenses make the image, step by step
    (22.0, 26.0, 'focus'),    # 7 fine focus: the knob turns, the cells sharpen in place
    (26.0, 30.0, 'pan'),      # 8 the stage control turns; the field glides; a plum-stained cell enters
    (30.0, 33.0, 'reveal'),   # 9 the field stops on the white blood cell
    (33.0, 36.0, 'loop'),     # 10 pull back to the circle the size of the drop; cut to the drop
]

# ---- scene 1: the glass swipe
APPROACH = (0.0, 0.25)     # the spreader's edge slides back onto the drop
TOUCH = 0.25
WICK = (0.25, 0.5)         # the blood runs sideways along the glass edge
SWIPE = (0.5, 1.75)        # one smooth push draws the drop into a thin film ("shhk")
LIFT = (1.7, 2.0)          # the spreader lifts away
# ---- scene 2: first glimpse
GLIMPSE_SNAP = 2.5         # a small group of pink cells snaps into focus ("tik")
# ---- scene 3: the prepared slide
DISSOLVE = (3.6, 4.6)      # a match dissolve: fresh smear -> the stained slide, time has passed
SETTLE3 = (4.6, 6.0)
# ---- scene 4: onto the stage, reveal the microscope
SLIDE_IN = (6.0, 6.85)     # the slide slides onto the stage
CLIP = (6.75, 7.0)         # the stage clip closes and settles ("tik" at 7.0)
PULLBACK = (7.0, 8.9)      # pull back and swing round to the whole microscope
# ---- scene 5: the objective
TO_TURRET = (9.0, 9.8)
TURN = (9.65, 10.5)        # the nosepiece turns; it locks on the click at 10.5
DOWN = (11.4, 12.0)        # the camera drops toward the lamp
# ---- scene 6: the x-ray view of the light path and the lenses
XRAY_ON = (12.0, 12.5)     # a scan line turns the side view into an x-ray
STEP1 = (12.5, 15.0)       # 1: lamp, collector and condenser focus a cone of light onto the thin film
STEP2 = (15.0, 17.5)       # 2: the objective makes a real, magnified, upside-down image in the tube
STEP3 = (17.5, 20.0)       # 3: the eyepiece magnifies that image again, like a magnifying glass, for the eye
TOTALMAG = (20.0, 22.0)    # the whole path: 40x times 10x = 400x
LIGHT = (12.5, 14.3)       # the band of light climbs from the lamp to the film
# ---- scene 7: focus
FINE_TURN = (22.0, 23.0)   # the fine-focus knob turns slightly
FOCUS_CUT = 23.0           # match cut into the eyepiece
FOCUS = (23.0, 24.5)       # the fuzzy discs sharpen in place; crisp note at 24.5
# ---- scene 8: move across the sample
STAGE_TURN = (26.0, 27.0)  # a small turn of the stage control
PAN_CUT = 27.0
GLIDE = (27.25, 30.0)      # the whole field glides sideways together
# ---- scene 9: the reveal
CHIME = 30.0               # the field settles on the white blood cell: two-note chime
# ---- scene 10: the loop
PULLOUT = (33.0, 36.0)     # the eyepiece circle shrinks onto the drop's size and place, still moving at the cut


def scene_at(t):
    for a, b, name in SCENES:
        if a <= t < b:
            return name, a, b
    return SCENES[-1][2], SCENES[-1][0], SCENES[-1][1]


# ---------------------------------------------------------------- easing
def clamp01(u):
    return max(0.0, min(1.0, u))


def u_of(t, span):
    a, b = span
    return clamp01((t - a) / (b - a))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def smoother(u):
    u = clamp01(u)
    return u * u * u * (u * (u * 6 - 15) + 10)


def ease_in(u, p=2.0):
    return clamp01(u) ** p


def ease_out(u, p=3.0):
    return 1 - (1 - clamp01(u)) ** p


def ease_in_out(u, p=3.0):
    u = clamp01(u)
    return 0.5 * (2 * u) ** p if u < 0.5 else 1 - 0.5 * (2 - 2 * u) ** p


def back_out(u, s=1.7):
    u = clamp01(u) - 1
    return u * u * ((s + 1) * u + s) + 1


def lerp(a, b, u):
    return a + (b - a) * u


def lerp3(a, b, u):
    return tuple(lerp(x, y, u) for x, y in zip(a, b))


# ---------------------------------------------------------------- the drop and the eyepiece circle share one place
DROP_R = 24.0               # canvas px: the opening drop's radius, and the eyepiece circle's final radius
DROP_XY = (135.0, 236.0)    # canvas px: the opening drop's centre, and the eyepiece circle's final centre
EYE_R = 126.0               # canvas px: the eyepiece circle at full size
EYE_XY = (135.0, 236.0)


def eye_circle(t):
    """(centre x, centre y, radius) of the eyepiece circle; it shrinks onto the drop's place at the end."""
    u = u_of(t, PULLOUT)
    k = 1 - math.cos(math.pi * u / 2)          # starts gently, still moving when the loop cuts back to the drop
    r = EYE_R * (DROP_R / EYE_R) ** k
    return lerp(EYE_XY[0], DROP_XY[0], k), lerp(EYE_XY[1], DROP_XY[1], k), r
