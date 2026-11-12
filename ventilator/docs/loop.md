# Loop specification

## Picture

- **The same state at both ends.** S40 ends on the opening camera with the lungs at the volume of frame 0 and the
  inspiratory pulse at the same point in the tube. The scenes at the end draw with τ = t − 60, so every particle stream
  and the pulse run straight into frame 0 instead of jumping.
- **Measured.** `tools/render.py --stills 0,59.9999` writes both frames. They differ in 68 art pixels (rounding of moving
  particles); an ordinary frame step near the end changes about 1,259 art pixels, so the seam is smaller than a normal
  frame step. `docs/loop_compare.png`: frame 0, the last frame, and the pixels that differ (white).
- **No text at the seam.** The only text in the film is the ventilator's screen.
- **Camera.** S40 holds the opening composition; S01 starts its push from rest, so the speed is continuous across the seam.

## Sound

- **Bars.** 30 bars at 120 BPM in 4/4 = exactly 60.000 s.
- **Harmony.** The last bar (G) resolves into the first (Am).
- **The seam.** A snare roll and a riser end at 59.75–60.0 s and the opening THUMP lands on the downbeat after the wrap.
- **Beds.** Periodic in 60 s; level automation smoothed circularly. Tails past 60 s are folded onto the start.
- **Measured.** The step from the last sample to the first is 0.02243 of full scale, against 0.31216 for
  ordinary steps near the end. The mix: -14.0 LUFS, true peak -1.25 dB.
