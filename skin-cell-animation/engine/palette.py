"""A limited 8-bit palette for a slice of skin seen from the side, kept friendly to watch: no wound or raw-meat reds.

Clear light-blue water on top; pale cream dead skin; living layers in peach that turns rosier toward the bottom; the
dermis below in a soft rose with pale collagen fibres and one small capillary. Captions are white with a dark outline.
No hue sits in the blue-violet range (225-300 degrees).
"""


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def ramp(*cols):
    return [hx(c) for c in cols]


OUTLINE = hx('#2B1418')                                                        # outlines, caption edges
WHITE = hx('#FFFFFF')
WATER = ramp('#2F86AB', '#4FB3D9', '#86D3EE', '#C7EEF9', '#EFFBFE')          # deep .. foam (hue ~195)
DEAD = ramp('#A88E6A', '#D9C6A3', '#EEE2C8', '#FBF4E4')                       # corneocytes: dead skin, pale cream
LIPID = ramp('#D9B865', '#F1D98E')                                            # the "mortar" between dead cells
GRAN = ramp('#B97E63', '#DBA283', '#EDC2A2', '#F8DCC2')                       # granular layer: flattening, beige
SPIN = ramp('#C46F62', '#E39782', '#F4B79F', '#FDD6C3')                       # spinous layer: peach
BASAL = ramp('#B4525F', '#D97A80', '#EEA09E', '#F9C2BB')                      # basal layer: rosy
GAP = ramp('#A65B5E', '#C98479')                                              # the narrow spaces between living cells
NUC = ramp('#5E1E33', '#86304A', '#B04E64', '#D27C8C')                        # nuclei: rim, chromatin, body, glint
GRANULE = hx('#5A2430')                                                       # keratohyalin granules
KERATIN = ramp('#E9CFAE', '#FFF3DD')                                          # keratin fibres inside cells
DERMIS = ramp('#7E3446', '#9C4656', '#B95E6B', '#D88791')                     # the dermis below
COLLAGEN = ramp('#E2A0A2', '#F3C6C4')
BLOOD = ramp('#8E1C2C', '#C8323F', '#EE6466')                                 # the capillary and its red cells
HERO = hx('#FFF1B8')                                                          # the rim light on the cell we follow
WARM = hx('#FFB070')                                                          # and the warm tint of its fill
SPARK = ramp('#FFE7A0', '#FFFFFF')
MELANIN = ramp('#3B2016', '#6B3E26', '#9A6440')                               # melanin and the melanocytes that make it
FIBRO = ramp('#8A3A4C', '#E6A7A4')                                             # fibroblasts in the dermis

# inside the dividing basal cell
NUC_IN = ramp('#E7A2AC', '#F4C6CB')                                            # the inside of the nucleus
CHROMO = (ramp('#5E1E33', '#9A3556', '#D9809A'),                               # four chromosomes, each its own colour
          ramp('#8A5A12', '#E0A930', '#FFE08A'),                               # (both copies of one share it, so you
          ramp('#1F5F73', '#2F9AB8', '#8AD8EC'),                               # can see each new cell get one of
          ramp('#3D6B2E', '#6FA34A', '#B7DE8C'))                               # each)
SPINDLE = ramp('#E9CFAE', '#FFF8EC')                                           # spindle fibres, the poles' glow
RIBO = ramp('#4E1C2D', '#86354F', '#BB6479')                                   # free ribosomes (speckles)
MITO = ramp('#6E2618', '#B9472A', '#EC7B4E', '#FFC29C')                        # mitochondria
RING = ramp('#A3244F', '#E0567F')                                              # the contractile ring that pinches
