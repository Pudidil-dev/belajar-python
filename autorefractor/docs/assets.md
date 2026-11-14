# Asset consistency guide

Seven assets are locked for the whole film. Each is one piece of code, so it cannot drift between scenes; the reference
sheets in `docs/sheets/` are drawn by the same code.

| | Asset | Code | Appears in | Locked |
|---|---|---|---|---|
| A | The balloon landscape | `engine/lib/balloon.js` | S01, S02–S05 (inset), S03–S09 (slide), S19, S20, S21 | Coral-and-cream balloon with a zigzag band, basket and four ropes; narrow winding road; muted green fields; two ranges of blue hills; pale sky with four flat clouds. The same procedure draws the full frame, the inset and the slide. |
| B | The patient | `engine/lib/exterior.js`, `engine/lib/eye.js` | S02, S20 (from behind); S03–S09, S19 (profile silhouette) | One calm adult. Back and side only: hair, ear, cheek, shoulder. No face, no expression. Chin on the cup, forehead on the band, right eye on the window's axis. |
| C | The autorefractor | `engine/lib/exterior.js`, `engine/lib/optics.js` | S02, S20 (outside); S03–S09, S19 (cutaway) | Original and unbranded: ivory head and column, graphite base and stage, teal ring round the window, joystick, chinrest posts. No logo, no model name. |
| D | The eye | `engine/lib/eye.js` | S03–S09, S19; simplified in S13 | Millimetres. Cornea radii 7.8 / 6.5, 0.55 thick; pupil 4 mm; lens radii 10.2 / 6.0, 4.0 thick; axial length 24.0. Rays are traced with Snell's law. The eye never deforms; only the lens outline eases slightly flatter in S04. |
| E | The optical diagram | `engine/lib/optics.js` | S03–S09, S19 | Three arms: fixation (up, amber), source (straight back, cyan), receiving (down, magenta). Retinal-return, ring-image architecture. One camera track (`DIAG.track`) carries scenes 3–9. |
| F | The sensor and its ring | `engine/lib/sensor.js` | S09–S12, S15, S16, S18, S19 | 64 × 64 schematic pixels. One ring: semi-axes 18.6 (horizontal) and 15.4 (vertical) pixels against a calibration radius of 21.5. Magenta as light, gold as charge, white and grey as data. |
| G | The result | `engine/lib/result.js` | S16–S19 | SPH −2.00 D · CYL −0.75 D · AXIS 180°, tagged "Example". Defined once (`RES.VALS`) and drawn from there on the screen, the printout and the last cutaway. |

## Colour code

| Element | Colour | Palette keys |
|---|---|---|
| Background | dark navy | `k`, `n0`–`n5` |
| Device | ivory, graphite, restrained teal | `q0`–`q6`, `g0`–`gb`, `t0`–`t4` |
| Visible fixation path | warm amber | `a0`–`a3` |
| Outgoing measurement light | cyan overlay | `c0`–`c5` |
| Returning measurement light | magenta overlay | `m0`–`m4` |
| Sensor charge | pale gold | `y0`–`y4` |
| Digital result | white with mint | `w`, `e0`–`e4` |
| Eye tissues | muted natural tones | `o`, `i`, `l`, `x`, `u`, `r`, `v`, `z` |

Cyan and magenta mark the direction of travel only. The measurement light is near-infrared, the patient does not see it,
and it does not change colour on the way back. The patient-view inset never shows it.

## What must not appear

- No air puff, no OCT, no fundus photograph, no corneal topography.
- No rotating prism and no lenslet grid: the receiving arm ends in a ring lens and one image sensor.
- No physical balloon: it is a picture on a slide.
- No deformation of the eye, and nothing touching it.
- No mirror-like reflection from the retina: a diffuse fan, of which a small part is collected.
- No diopter value attached to a ring size or an angle, and no confidence percentage.
- No claim that fogging switches accommodation off: the lens only eases, and the caption says "Relax focusing".
- No prescription: the printout is "A starting estimate".
- The comparison eyes of S13 and the lens model of S14 are separate models in their own frames, not the patient.
- No brand, logo or model name anywhere.

## Captions

One dominant caption at a time, top centre, in the film's own bitmap font (`engine/lib/pix.js`), drawn by the editor
layer (`engine/lib/cap.js`) and absent from the clean version. Every string is in `labels.srt`, so it can be replaced or
translated in an editor without touching the picture.
