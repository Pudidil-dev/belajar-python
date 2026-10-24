# How Coronary Stents Work — 8-bit scientific animation (code project)

This project builds a 55-second, 24-scene, 9:16 pixel-art explainer, rendered entirely in code with HTML5 Canvas 2D, JavaScript and Web Audio.

- `index.html` is a self-contained player: open it in a browser.
- `tools/export.js` renders the MP4.

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 3,300 frames (55.000 s). H.264, yuv420p, BT.709. The 270×480 logical canvas is upscaled ×4 with nearest-neighbour. |
| Audio | Original 128 BPM electronic score in A minor plus synced SFX, AAC 48 kHz stereo, −15 LUFS, true peak ≤ −1 dBTP. |
| Loop | The last 1.33 beats are a drum pickup on E that resolves into the opening downbeat. The picture dissolves back to frame 0. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy
- Playwright Chromium: `npm i playwright && npx playwright install chromium`

```
node tools/export.js                  # full MP4 -> output/stent_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0.3 26.3 54.3 --scale 2   # check any frames
```

To check the result:
```
ffprobe output/stent_8bit.mp4
ffmpeg -i output/stent_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 3,300 frames, an integrated loudness between −16 and −14 LUFS, and a true peak at or below −1 dBTP.

## Scenes

| # | Time (s) | Caption |
|---|---|---|
| 01 | 0–1.5 | HEALTHY ARTERY |
| 02 | 1.5–3 | PLAQUE BUILDS UP (YEARS LATER, time-lapse) |
| 03 | 3–4.5 | ARTERY NARROWS |
| 04 | 4.5–6 | REDUCED BLOOD SUPPLY |
| 05 | 6–8 | CORONARY ARTERY |
| 06 | 8–10 | CARDIAC CATHETERIZATION |
| 07 | 10–12 | RADIAL ACCESS |
| 08 | 12–14 | GUIDING CATHETER |
| 09 | 14–16 | X-RAY GUIDANCE |
| 10 | 16–18 | GUIDEWIRE |
| 11 | 18–20 | LESION CROSSED |
| 12 | 20–22 | STENT DELIVERY |
| 13 | 22–24 | STENT POSITIONED |
| 14 | 24–27 | BALLOON INFLATION |
| 15 | 27–29 | STENT EXPANSION |
| 16 | 29–31 | ARTERY WIDENS |
| 17 | 31–33 | BALLOON DEFLATES |
| 18 | 33–35 | STENT STAYS IN PLACE |
| 19 | 35–38 | IMPROVED BLOOD FLOW |
| 20 | 38–40 | BEFORE / AFTER |
| 21 | 40–42 | FLOW ASSESSMENT |
| 22 | 42–46 | DRUG-ELUTING STENT (Helps limit tissue regrowth, time-lapse) |
| 23 | 46–51 | BLOOD FLOW IMPROVED |
| 24 | 51–55 | Recap cuts → title HOW CORONARY STENTS WORK → loop |

What happens on screen:
- **01:** The film opens inside the artery with red blood cells already flowing.
- **02:** Plaque grows inside the wall. LDL particles and monocytes move in, foam cells form, and a fibrous cap develops.
- **03:** A width bar shows the lumen shrinking.
- **04:** A flow meter drops.
- **05:** The camera zooms out continuously from the vessel to the beating heart's LAD, then to the patient on the table.
- **06:** The cath lab is seen from above.
- **07:** A side cutaway shows local anaesthetic, then the sheath entering the radial artery.
- **08:** The guiding catheter travels radial → brachial → subclavian → aorta → coronary ostium.
- **09:** Contrast fills the grayscale angiogram and the camera zooms into the stenosis.
- **10–11:** The wire stays in the lumen and crosses the lesion, with a success cue.
- **12–13:** The crimped lattice slides along the wire and locks across the lesion.
- **14:** The balloon inflates in pressure steps:
  - each stent ring is a cylindrical zig-zag whose struts keep their length and rotate, so the stent foreshortens as it opens;
  - the plaque compresses and the wall remodels outward;
  - flow stops while the balloon is inflated.
- **15:** Close-up of the unrolled lattice, with diamond cells opening and the hinges glowing.
- **16:** Contact-force arrows push outward.
- **17:** The balloon shrinks inside the stent, which stays where it is.
- **18:** The balloon catheter and wire withdraw.
- **19:** Free flow and the meter back up.
- **20:** Split screen in the same orientation.
- **21:** Post-stent angiogram.
- **22:** The strut coating releases drug molecules over time:
  - excess tissue regrowth near the strut is held back;
  - an endothelial layer heals over the strut.
- **23:** The heart's downstream muscle perfuses again.
- **24:** Six recap cuts, then the title.

## Sound design

- **Hook (0–6 s):** a 4-bar hook (Am–F–C–G) plays from frame one on a delayed pulse lead.
- **Bass, pads and arpeggios:** sidechain-pumped on every kick.
- **Precision (16–24 s):** 16th-note staccato plucks match the wire and catheter moves. One percussion layer drops out at 22.5 s.
- **Build to the drop:** a snare roll and riser start at 24.4 s, with the music ducked under the rising pressure tone. The **drop lands at 26.25 s, exactly when the balloon reaches full pressure.**
- **Climax:** a supersaw hook with harmony.
- **Relief (35–42 s):** bell melody.
- **Micro (42–46 s):** light digital textures, with pitched molecular ticks on the 16th grid.
- **Resolution (46–55 s):** the strong beat and hook return.

Each SFX belongs to a visible event:
- heartbeat (lub-dub), flow, biological ticks, tension, reverse whoosh;
- UI activation, sheath click, catheter tracking, X-ray scan and chirp;
- lesion-crossed reward, sliding delivery, target lock;
- pressure, accelerating strut clicks, drop, deployment shimmer;
- release whoosh, extraction, recap cut blips and the final impact.

The SFX are simulated cues, not real biological sounds.

## Medical notes

This is one simplified, successful example procedure with schematic scales. It shows:
- radial access;
- a guiding catheter;
- fluoroscopy with contrast;
- a guidewire;
- a balloon-expandable stent;
- a drug-eluting coating.

Plaque is compressed and displaced, never removed. The stent stays in place while the delivery system leaves. Stents do not cure atherosclerosis, and outcomes vary.

## Source map

| File | What it holds |
|---|---|
| `src/00_core.js` | Pixel engine, fonts, easing. |
| `src/01_ui.js` | Callouts and chips. |
| `src/10_vessel.js` | Artery cutaway, plaque, RBC flow, wire, catheter, balloon and cylindrical stent lattice. |
| `src/11_anatomy.js` | Heart, cath lab, wrist, route map, angiogram, strut close-up and drug-eluting coating. |
| `src/20_scenes.js` | 24-scene timeline. |
| `src/30_audio.js` | Score, SFX, live scheduler and offline render. |
| `src/40_player.js` | Controls. |
| `tools/` | Build, export, stills and mastering. |
