"""One timeline for picture and sound: 120 BPM, a bar is 2 s, 18 bars = 36 s, every event sits on the 8th-note grid.

The film opens inside the microscope: red blood cells snap into focus. Then it shows how that image was made: drop ->
thin film -> stained slide -> microscope -> an x-ray view of how its lenses make the image -> focus -> moving the stage
-> the white blood cell. At the end the stage glides back to the opening field and the focus softens, so the last frame
leads straight into the first and the 36 s video loops.
"""
import math

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
TOTAL = 36.0

# ---- the ten scenes
SCENES = [
    (0.0, 2.0, 'hook'),       # 1 inside the microscope: red blood cells snap into focus
    (2.0, 4.0, 'swipe'),      # 2 how it was made: a drop on a slide, smeared thin in one swipe (macro)
    (4.0, 6.0, 'prepared'),   # 3 the same slide: fresh smear -> dried, stained slide
    (6.0, 9.0, 'stage'),      # 4 the slide moves onto the stage; pull back to the whole microscope
    (9.0, 12.0, 'turret'),    # 5 the objective clicks into place; the camera drops toward the lamp
    (12.0, 22.0, 'xray'),     # 6 x-ray side view: how the light and the lenses make the image, step by step
    (22.0, 26.0, 'focus'),    # 7 fine focus: the knob turns, the cells sharpen in place
    (26.0, 30.0, 'pan'),      # 8 the stage control turns; the field glides; a plum-stained cell enters
    (30.0, 33.0, 'reveal'),   # 9 the field stops on the white blood cell
    (33.0, 36.0, 'loop'),     # 10 the stage glides back to the opening field and the focus softens: the loop
]

# ---- scene 1: the hook, inside the microscope
HOOK_SNAP = 0.5            # the red cells snap into focus ("tik")
# ---- scene 2: the glass swipe
APPROACH = (2.0, 2.25)     # the spreader's edge slides back onto the drop
TOUCH = 2.25
WICK = (2.25, 2.5)         # the blood runs sideways along the glass edge
SWIPE = (2.5, 3.75)        # one smooth push draws the drop into a thin film ("shhk")
LIFT = (3.7, 4.0)          # the spreader lifts away

# ---- scene 3: the prepared slide
DISSOLVE = (4.4, 5.4)      # a match dissolve: fresh smear -> the stained slide, time has passed
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
GLIDE_BACK = (33.5, 35.8)  # the stage glides back to the opening field (the white cell leaves at the side)
DEFOCUS = (34.6, 36.0)     # the focus softens to exactly where the film begins


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


# ---------------------------------------------------------------- sizes and places on the canvas
DROP_R = 24.0               # canvas px: the drop's radius in the macro view
DROP_XY = (135.0, 236.0)    # canvas px: the drop's centre in the macro view
EYE_R = 126.0               # canvas px: the eyepiece circle
EYE_XY = (135.0, 236.0)


def eye_circle(t):
    """(centre x, centre y, radius) of the eyepiece circle."""
    return EYE_XY[0], EYE_XY[1], EYE_R
