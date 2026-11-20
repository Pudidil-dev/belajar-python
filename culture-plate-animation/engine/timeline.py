"""The film's clock: 120 BPM, 15 bars of 4/4 = 30 s. One beat is exactly 15 frames at 30 fps, so every hit lands on
a frame. All the picture's events and the score read their times from here.

  0.00-0.75  a fresh plate on the bench; a shine sweeps across the dish
  0.75-2.00  the swab swoops in from the top right and touches down on the downbeat of bar 1
  2.00-6.50  six zigzag strokes, one per dotted quarter (2.00, 2.75, 3.50, 4.25, 5.00, 5.75)
  6.50-7.40  the swab lifts and leaves; 7.0-7.6 a shine runs along the wet zigzag
  8.00-8.90  a target cursor snaps onto one point of the streak (8.0) and confirms (8.5)
  8.50-10.0  the camera dives into the point; at 9.5 a lens bursts open on the bacteria
  10.0-20.0  the bacteria divide: 12.0, 13.5, ~14.75, ~15.75, ~16.5, ~17.0, ~17.5, ~18.0 (time-lapse, faster)
  20.0-21.75 the lens closes into the point (20.0-20.5) and the camera pulls out to the whole plate
  21.75-26.1 time-lapse: a clock spins; colonies rise along the zigzag (22.0-25.8)
  26.0-28.0  a shine runs along the white zigzag; sparkles
  28.0-30.0  the camera slides along the bench to the next fresh plate = the first frame
"""

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2 s
STEP = BEAT / 4            # one 16th = 0.125 s
TOTAL = 30.0               # 15 bars

GLINT = (0.10, 0.70)
SWAB_IN = (0.75, 2.0)
STROKE_T0 = 2.0
STROKE_DUR = 0.75          # a dotted quarter
N_STROKES = 6
STROKES = tuple((STROKE_T0 + k * STROKE_DUR, STROKE_T0 + (k + 1) * STROKE_DUR) for k in range(N_STROKES))
STREAK_END = STROKES[-1][1]            # 6.5
SWAB_OUT = (6.5, 7.4)
SHEEN = (7.0, 7.6)
CURSOR = (8.0, 9.2)
CONFIRM = 8.5
ZOOM_IN = (8.5, 9.5)
LENS_OPEN = (9.5, 10.0)
MICRO = (10.0, 20.0)
LENS_CLOSE = (20.0, 20.5)
ZOOM_OUT = (20.5, 21.75)
CLOCK = (21.75, 26.1)
GROW = (22.0, 25.8)
REVEAL = (26.0, 26.75)
TWINKLE = (26.75, 28.0)
PAN = (28.0, 30.0)
SLIDE = (28.4, 29.9)       # the plates actually move inside the last bar

# when each round of division happens (the first two are exact; later rounds spread round these)
DIVISIONS = (12.0, 13.5, 14.75, 15.75, 16.5, 17.0, 17.5, 18.0)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def u(t, span):
    """Progress 0..1 of t through the (t0, t1) span."""
    return clamp((t - span[0]) / (span[1] - span[0]))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ease_in(x, p=2.0):
    return clamp(x) ** p


def ease_out(x, p=2.0):
    return 1 - (1 - clamp(x)) ** p


def back_out(x, k=1.7):
    """Overshoot a little, then settle (a cursor snapping into place)."""
    x = clamp(x) - 1
    return 1 + x * x * ((k + 1) * x + k)


def grid(t):
    """Snap a time to the 16th-note grid."""
    return round(t / STEP) * STEP
