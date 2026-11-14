# Lessons for huashu-art-motion (feedback from this film)

These notes follow the skill's own "回流" (feedback) step: what worked, with evidence, and what went wrong.
They live in the project folder so the installed skill copy stays byte-identical to upstream. Copy them into
`references/07-正面经验.md` and a style card yourself if you want them in the skill.

## A pixel-art pipeline that keeps Kurzgesagt camera moves crisp

- Draw every frame on a 270×480 canvas with normal Canvas paths under a camera transform. Then quantize to
  one palette through a 32³ lookup table, and let ffmpeg upscale 4× with `flags=neighbor`.
  Zooms are re-rasterized at every scale, so a 70× dive into a sand grain never blurs.
- Ordered (4×4 Bayer) dither only for colours that are not already within about 9 units of a palette entry.
  Flat fills stay perfectly clean, while glows, gradients and anti-aliased edges turn into retro dither bands.
- Cost was about 11 frames per second for the whole film, including PNG transfer.

## Pitfalls hit

- **A foreign hue sneaking into grey gradients.** A g5→g4 gradient dithered toward a lavender entry (p4)
  because, in red-mean distance, lavender was closer to the grey midpoint than either grey. Fix: keep accent
  colours away from the midpoints of neutral ramps, or avoid gradients between near neutrals.
- **Contact sheets lie about dither.** Downscaled sheets blend a two-grey checkerboard into what looks like a
  third colour. Check suspicious tints by counting palette entries in the full-size frame.
- **Screen-space text in world-space drawing code.** A bitmap-font helper that resets the transform will print
  at the wrong place if it is given world coordinates. Always convert with `toScreen(cam, x, y)`.
- **Foreground parallax at high zoom.** A d=1.6 layer blows up to giant black bars during a 7× zoom. Fade
  foreground layers out once `z` passes about 1.6.
- **Sound effects peak-normalized one by one.** This makes sustained beds (rumble, air, rising tones) far
  louder than clicks. Scale beds down (×0.5 here) before the mix.

## Pitfalls found in the final QA pass

- **Bitmap text inside a lens never showed.** The text helper resets the transform and takes screen pixels, but
  lens contents are drawn after `translate(x, y)` in local units. The text landed near the top-left corner and was
  clipped away by the lens, with no error. Fix: map the point through `getTransform()` first (`K.wtext`).
- **qa.py cannot see a fillRect bitmap font.** Its framing check hooks `fillText`/`strokeText`, so it reported
  zero text problems while one caption was still erasing as the next typed over it. Start the next caption at
  `t1 + length / 70` or later, and scan label boxes yourself (two overlaps and three half-cut labels were found).
- **A lens placed in world units for z = 1 opened half off-frame at z = 1.8.** Place it from the screen
  position you want, using the camera state while it is open.
- **Threshold colour steps pop.** Heaters stepping g2 → r2 → o0 → y0, a lump switching from silicon to hot, and
  a plasma band switching on each changed in one frame. Draw the next colour on top with a fractional alpha and
  let the Bayer quantizer dither it; no extra palette entries are needed.
- **Grids of 4-px cells crawl under a zoom.** Replacing the phone wallpaper's cells with three solid bands once
  it was fully lit cut the median frame-to-frame change during the 4.2 s pull-out from 8.9 % to 3.7 %.
- **Reading qa.py's jump count in pixel art.** Smooth camera moves longer than 2 s are counted as jumps (108 in
  the finale's slow pull-out), and an integer-snapped camera moves the whole frame 1 px at a time at the slow
  end of an ease, which reads as a one-frame spike. Plot the per-frame difference curve and diff the spike's two
  frames before changing anything.

## What made continuity work

- **Matching on-screen size and log-zoom speed across a cut.** S02 (pulling out of the lattice) ends at
  d ln z/dt ≈ −4/s. S03 starts a cubic-out pull-out at about −3.5/s, with the grain and the lump the same
  size on screen. The dither dissolve between them is invisible and the motion never stops.
- **Shared worlds for adjacent scenes.** S09–S11 draw the same Czochralski puller, and S23→S24 draws the same
  transistor at 1/5 scale with the camera at 5.6× zoom. A 0.4 s dissolve between identical frames reads as
  one continuous shot.
- **Semantic zoom with level of detail.** Atoms are drawn as spheres, then as single pixels, then as the
  grain's silhouette. One continuous zoom goes from 1 nm to 1 mm.
- **Music sections on the picture's grid.** Each section was rendered into its own buffer and cut with a
  150 ms release where the next one starts. That gives hard section starts exactly on mid-bar scene
  changes (67 s, 131 s, 141 s, 183 s).
