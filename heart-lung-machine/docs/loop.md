# Loop specification

## Picture

- **Same state at both ends.** S25 ends on `WORLD.CAM0`, the opening camera, with both hands at rest. The flow marks are in
  the same phase, since the pattern repeats every 0.5 s and 92 s is a whole number of repeats.
- **Measured.** `tools/render.py --stills 0,91.9999` writes both frames; `docs/frame_open.png`, `docs/frame_close.png` and
  `docs/loop_compare.png` show them. The state at 91.9999 s differs from frame 0 by 9 art pixels; an ordinary step from one frame to the next near the end changes about 108 art pixels, so the seam is an ordinary frame step.
- **No text at the seam.** The recap erases by 86.9 s and S25 has none. "DURING HEART SURGERY" types in 0.15 s after the restart.
- **Camera.** It eases into the opening view and S01 starts from rest, so speed is continuous across the seam.

## Sound

- **Bars.** 46 bars at 120 BPM in 4/4 = exactly 92.000 s.
- **Harmony.** Bars 43–45 hold the opening suspended G chord, and bar 0 continues it.
- **Beds.** The hum, flow, pump, gas and water beds are exactly periodic in 92 s: tones with whole cycles in the loop, and noise
  filtered in the frequency domain of the whole loop. Their level automation is smoothed circularly, so the seam is treated like
  any other moment.
- **Tails.** Reverb and echo that ring past 92 s are folded onto the start.
- **Measured.** The step from the last sample to the first is 0.00103 of full scale, against 0.00562 for ordinary steps near the end.

## Export

- Render once; the platforms that loop restart on frame 0.
- For a longer upload, join copies end to end with no gap.
- Add no fade-in or fade-out to the picture or the sound.
