# Loop specification

The film is 63 s long and is built to restart without a visible or audible seam.

## Picture

- **The shared state.** `BAL.state(u)` in `engine/lib/balloon.js` describes the balloon view for u from 0 (the opening
  frame: the vignette only just cutting the corners) to 1 (the round aperture, 352 px across at 360 × 640).
- **S01** runs u from 0 to 1 between 1.875 s and 3.0 s. **S21** runs it from 1 back to 0 in its first 2.3 s and then holds.
- **So** every frame from 62.30 s to the end is the frame at 0.00 s: the same balloon position, road, vignette, focus and
  lighting. `tools/render.py --stills 0,62.9667` writes the two frames; they are identical pixel for pixel.
- **No caption at the seam.** The last text of the film (the small "Example" tag of S19) is gone by 57.5 s, at the end of the
  dissolve into S20; S20 and S21 have no text of their own; "Why THIS balloon?" starts typing 0.2 s after the restart.
- **The way in and out match too.** S20 ends on the aperture on black that S01 ends on and S21 starts on, so the last
  9 s retrace the first 6 s backwards: cutaway → exterior → aperture → full view.

## Sound

- **Bars.** 21 bars of six beats at 120 BPM = 126 beats = exactly 63.000 s.
- **Harmony.** Scene 21 holds A (the dominant, with a suspended fourth that resolves in mid-bar); the restart lands on D.
- **Melody.** Two pick-up notes, E and A, in the last beat and a half lead to the hook's first note, F sharp, on the restart.
- **Tails.** Reverb and echo that ring past 63 s are folded onto the first second of the file, so nothing is cut off.
- **Texture.** Scenes 20–21 and scene 1 have no kick: the seam joins two quiet bars, not a loud one to a quiet one.
- **Limiter.** The limiter treats the loop point like any other moment (its look-ahead and release wrap round).

## Export

- Render the file once; players that loop (Reels, TikTok, Shorts) restart it on frame 0.
- For a longer upload, join copies end to end with no transition and no gap between them.
- Do not add a fade-in or fade-out to either the picture or the sound: both would break the loop.
