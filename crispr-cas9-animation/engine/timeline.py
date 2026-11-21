"""The film's clock: 120 BPM, 11 bars of 4/4 = 22 s. One beat is exactly 15 frames at 30 fps, so every hit (the
clicks, the snips, the locks) lands on a frame and on the beat grid. Picture and sound both read their times here.

  0.0-3.0   HOOK     Cas9 + guide RNA swoop in (WHOOSH), clamp onto the helix (CLICK 1.0), cut both strands
                     (SNIP 1.5); the camera rushes into the cut
  3.0-3.6   REWIND   the hook runs backwards
  3.6-8.0   SEARCH   the helix straightens into a ladder; Cas9 (seen x-ray) slides along: TIK at a wrong PAM
                     (4.5), TIK at the right PAM (5.5), 20 guide bases pair one by one, LOCK (7.0)
  8.0-13.0  CUT      closer: the two cutting domains close on the strands, SNIP (10.0), slow motion as the ends part
  13.0-18.0 REPAIR   Cas9 lets go; repair rings grab the ends (TIK 14.0, TIK 14.5); 2 base pairs are trimmed
                     away; the ligase seals the strands (SNAP 16.0)
  18.0-22.0 RESULT   before / after side by side, DNA EDITED; another Cas9 heads for a new DNA: the first frame
"""

BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2 s
STEP = BEAT / 4            # one 16th = 0.125 s
TOTAL = 22.0               # 11 bars

# hook
HOOK = (0.0, 3.0)
CLICK = 1.0
SNIP1 = 1.5
RUSH = (1.6, 2.6)
# rewind
REWIND = (3.0, 3.6)
REW_FROM, REW_TO = 2.6, 0.32           # hook times the rewind runs between
# search
XRAY = (3.6, 4.25)                     # zoom in, the helix straightens, Cas9 turns see-through
LABEL_CAS = 3.85
SLIDE1 = (4.05, 4.5)
TIK1 = 4.5                             # a PAM, but the wrong sequence
REJECT = (4.5, 4.95)
SLIDE2 = (4.95, 5.5)
TIK2 = 5.5                             # the right PAM
LABEL_PAM = 5.5
UNWIND = (5.5, 5.75)
PAIR0, PAIR_DT, N_SPACER = 5.625, 0.0625, 20   # one guide base pairs every 32nd note, PAM-proximal first
LOCK = 7.0
# cut
TO_SITE = (7.4, 8.8)                   # the camera moves in on the cutting domains
DOMAINS = (8.8, 9.875)                 # HNH and RuvC swing in and close on the strands
SNIP2 = 10.0
SLOWMO = (10.0, 12.0)
BACK_OUT = (12.0, 13.0)
# repair
RELEASE = (13.0, 13.8)
KU1, KU2 = 14.0, 14.5
LABEL_REPAIR = 14.0
JOIN = (14.5, 15.0)
TRIM = (15.0, 15.5)
CLOSE = (15.5, 15.95)
SNAP = 16.0
KU_OFF = (16.6, 17.6)
# result
RESULT = (18.0, 20.0)
LABEL_EDITED = 18.75
LOOP = (20.0, 22.0)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def u(t, span):
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
    x = clamp(x) - 1
    return 1 + x * x * ((k + 1) * x + k)


def grid(t):
    return round(t / STEP) * STEP


def pair_time(j):
    """When guide base j pairs (j = 0 is the PAM-proximal base)."""
    return PAIR0 + j * PAIR_DT
