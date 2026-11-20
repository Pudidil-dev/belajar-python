# Loop specification

## Picture

- **The same state at both ends.**
  - The film opens on the chest with the lungs at rest, at the instant the ventilator's next breath starts.
  - S39 brings the camera back to that composition, and S40 holds it. During S40 the lungs stay at rest (PEEP) while the
    gas of the next breath arrives along the circuit.
  - The scenes at the end draw with τ = t − 60 (the film's own time). Every particle stream therefore runs straight into
    frame 0 instead of jumping.
  - The hook's particles move at S40's rate, so the speed is continuous too.
- **Measured.** `tools/render.py --stills 0,87.9999` writes both frames.
  - They differ in **1** art pixel (rounding of a moving particle).
  - An ordinary frame step near the end (60 fps) changes about **270** art pixels.
  - The seam is therefore far smaller than a normal frame step.
  - `docs/loop_compare.png` shows frame 0, the last frame, and the pixels that differ (white).
- **No text at the seam.** The last label (*NEXT BREATH*) has faded by 1:27.45. The first label (*LUNGS INFLATE*) types
  on from 0:00.20.
- **Camera.** S40 holds the opening composition. The hook starts its slow push from rest, so the camera's speed is
  continuous across the seam.
- **Breathing.**
  - The lungs are still at the end and start to inflate at frame 0 with the constant inspiratory flow. This is how a
    time-triggered breath begins.

## Sound

- **Bars.** 44 bars at 120 BPM in 4/4 = exactly 88.000 s.
- **Harmony.** The last bar (G) resolves into the first (Am).
- **The seam.** A snare roll and a riser end at 87.75–88.0 s. The breath's valve click and the inflow land on the
  downbeat after the wrap.
- **Beds.** The beds are periodic in 88 s, and the level automation is smoothed circularly. Tails that ring past 88 s are
  folded onto the start.
- **Measured.**
  - The step from the last sample to the first is 0.25489 of full scale. Ordinary steps near the end are 0.32908 (p99),
    so the seam is no larger than the music's own movement there.
  - The mix is −14.0 LUFS, with a true peak of −1.53 dB.
