# Loop specification

## Picture

- **Same state at both ends.** S20 ends on `WORLD.CAM0`, the opening camera, with both hands at rest. The flow markers are in
  the same phase, since the pattern repeats every 0.5 s and 68 s is a whole number of repeats.
- **Measured.** The state at 68.0 s differs from frame 0 by 2 art pixels, from rounding. A normal step from one frame to the
  next changes about 490 art pixels, so the seam is an ordinary frame step.
  `tools/render.py --stills 0,67.9999` writes both frames; `docs/frame_open.png`, `docs/frame_close.png` and
  `docs/loop_compare.png` show them.
- **No text at the seam.** The recap fades by 62.65 s and S20 has none. "During heart surgery" types in 0.2 s after the restart.
- **Camera.** It eases into the opening view and S01 starts from rest, so speed is continuous across the seam.

## Sound

- **Bars.** 34 bars at 120 BPM in 4/4 = exactly 68.000 s.
- **Harmony.** Bars 31–33 hold the opening suspended G chord, and bar 0 continues it.
- **Beds.** The hum, flow, pump, gas and water beds are exactly periodic in 68 s: tones with whole cycles in the loop, and noise
  filtered in the frequency domain of the whole loop. Their level automation is smoothed circularly, so the seam is treated like
  any other moment.
- **Tails.** Reverb and echo that ring past 68 s are folded onto the start.
- **Measured.** The step from the last sample to the first is 0.00435 of full scale, against 0.0061 for ordinary steps near the end.

## Export

- Render once; the platforms that loop restart on frame 0.
- For a longer upload, join copies end to end with no gap.
- Add no fade-in or fade-out to the picture or the sound.
