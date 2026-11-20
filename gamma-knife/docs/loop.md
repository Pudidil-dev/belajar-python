# Loop specification

## Picture

- **The same state at both ends.** The film opens on the transparent head with its beams converging on the target. S49
  holds that composition with the same camera (`HEAD.CAM`) and the same target glow. It draws with τ = t − 90, so the
  beam pulses (period 1/0.9 s, which divides 90 s) run straight into frame 0.
- **Measured.** `tools/render.py --stills 0,89.9999` writes both frames.
  - They differ in **228** scattered art pixels, from sub-pixel rounding of the moving beam pulses.
  - An ordinary frame step near the end (60 fps) changes about **2,300** art pixels.
  - The seam is therefore about a tenth of a normal frame step.
  - `docs/loop_compare.png` shows frame 0, the last frame, and the pixels that differ (white).
- **No text at the seam.** S49's label (*Gamma Knife (192 beams)*) has faded by 1:29.62. Frame 0 has no label; S01's
  label types on from 0:00.20.
- **Camera.** S49 holds the opening camera, and S01 starts its slow push from rest.

## Sound

- **Bars.** 45 bars at 120 BPM in 4/4 = exactly 90.000 s.
- **Harmony.** The last bar (G) resolves into the first (the A pedal of the hook).
- **The seam.** A snare roll, accelerating ticks and a riser end at 89.75–90.0 s. The opening's metallic ticks land on
  the downbeat after the wrap.
- **Beds.** The beds are periodic in 90 s, and the level automation is smoothed circularly. Tails that ring past 90 s are
  folded onto the start.
- **Measured.**
  - The step from the last sample to the first is 0.24863 of full scale. Ordinary steps near the end are 0.37954 (p99).
  - The mix is −14.0 LUFS, with a true peak of −1.48 dB.
