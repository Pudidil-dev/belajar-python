# How Shock Wave Machines Break Kidney Stones — 8-bit scientific animation

*A 55-second, 24-scene 2D pixel-art explainer of electromagnetic extracorporeal shock wave lithotripsy (ESWL). The style is 8-bit crisp pixels with a 16-bit palette and shading. It is built with HTML5 Canvas 2D, JavaScript and Web Audio, and uses Kurzgesagt-style motion grammar: scale dives, K75 easing, and callouts whose leader grows before the text types.*

| | |
|---|---|
| Player | `index.html`, a single self-contained file. Open it in a browser. |
| Video | `output/eswl_8bit.mp4`, created by `node tools/export.js`. |
| Format | 9:16, 1080×1920, 60 fps, exactly 3,300 frames (55.000 s), H.264 High, yuv420p, BT.709, AAC 48 kHz stereo. |
| Loudness | −15 LUFS integrated, true peak ≤ −1.6 dBTP. The soundtrack loops seamlessly. |
| Picture | Logical canvas 270×480, upscaled exactly ×4 with nearest-neighbour. |

## Render it yourself

Requirements: Node ≥ 18, Playwright Chromium, ffmpeg with libx264, and Python 3 with numpy and scipy.

```
node tools/export.js                  # build -> audio -> master -> 3300 frames -> mux
node tools/export.js --audio-only     # soundtrack only (build/audio.wav)
node tools/export.js --video-only     # frames + mux, reusing build/audio.wav
node tools/stills.js out.png 0.5 21.4 44.3 --scale 2   # contact sheet of any times
node tools/smoke.js shot.png          # headless player check: play, pause, seek
```

| Step | Time |
|---|---|
| Audio render (offline Web Audio in headless Chromium) | about 2.5 min |
| Frames | about 30 ms each on average, slowest about 0.3 s |

`renderFrame(t)` is a pure function of time, so the player, stills and export all draw identical frames. All randomness comes from seeded hashes.

## Storyboard (exact time ranges)

| # | Time (s) | Label (+ micro-context) | What happens, and the physics behind it |
|---|---|---|---|
| 01 | 0–1.2 | KIDNEY STONE | A converging pressure front rises from below. Inside the stone the wave runs about 2.6× faster than in urine, reaches the far face on beat 1 (0.476 s), and the stone compresses. A microcrack forms at a pre-existing flaw on the spall plane. There is no explosion. |
| 02 | 1.2–2.6 | MICROCRACK FORMATION | A dive into the crystal grains. The crack chain advances in 16th-note steps along grain boundaries, with an orange stress-concentration glow at the crack tip. |
| 03 | 2.6–4.0 | INSIDE THE KIDNEY | One log-zoom outward: crystal grains, stone, renal pelvis, calyces and pyramids, kidney, then the torso cutaway (spine, both kidneys, ureters, bladder). The treatment head is drawn under the table. |
| 04 | 4.0–5.6 | SHOCK WAVE LITHOTRIPSY + No incision | Side view of the suite. The treatment head's water cushion touches the skin through the table opening. Highlights land on the beats: treatment head, imaging monitor, console, positioning column. |
| 05 | 5.6–7.4 | STONE LOCALIZATION + Imaging, not treatment | Live grayscale B-mode: hypoechoic cortex, echogenic sinus, a bright stone echo and the posterior acoustic shadow behind it. The targeting marker slides onto the stone and locks. |
| 06 | 7.4–9.3 | ACOUSTIC TARGETING + Focus aligned to stone | The focal geometry (aperture → F2, with a cigar-shaped focal zone) is fixed to the machine. The table moves the patient until the stone sits in the focus. |
| 07 | 9.3–11.0 | ACOUSTIC COUPLING + Air gaps reflect sound | Water cushion and gel. A pulse hits a small air pocket and reflects back inverted (tensile), leaving a gap beyond it. The pocket is removed and the next pulse, about 1 s later, passes cleanly. |
| 08 | 11.0–13.2 | ELECTRICAL ENERGY + Capacitor stores energy | The charger fills the capacitor. The charging current decays exponentially, so the + charges and their SFX ticks follow the RC curve. |
| 09 | 13.2–15.4 | ELECTROMAGNETIC PULSE + Induced current repels membrane | The switch closes, a short strong current pulse runs through the flat coil, and a changing (violet) magnetic field builds. Eddy currents in the conductive membrane oppose it, so the field lines are squeezed against the membrane and push it away. |
| 10 | 15.4–17.5 | PRESSURE WAVE GENERATED | ELECTRICAL PULSE > DIAPHRAGM MOTION > PRESSURE WAVE: each line types in on its event. The membrane jumps and pushes the water, launching a compression front with a rarefaction behind it. |
| 11 | 17.5–19.5 | ACOUSTIC PRESSURE PULSE + Water oscillates in place | Water particles bunch up in compression and spread out in rarefaction. The marked particle moves forward, comes back and returns to its rest tick: the medium does not flow to the stone. |
| 12 | 19.5–22.0 | ACOUSTIC FOCUSING + Lens refracts the wave | Sound is faster in the lens material than in water, so a concave lens (thicker at the edges) converges the front. Isochrone contours shrink into the focal zone and lock on the beat. |
| 13 | 22.0–24.0 | SHOCK WAVE + Compression > Rarefaction | A pressure–time plot of a Church-type lithotripter waveform: nonlinear steepening turns the rise into a near-vertical shock front, followed by a weaker, longer negative tail (about −0.2 of the peak). |
| 14 | 24.0–26.0 | THROUGH SOFT TISSUE + Tissue is also exposed | The converging front crosses gel, skin, fat, muscle and kidney. Each interface sends back a faint reflection, because soft-tissue impedances are close to water's. Orange strain marks show that tissue is stressed too. |
| 15 | 26.0–28.5 | FOCUSED SHOCK WAVE + Small focal zone | The whole kidney section, with a cigar-shaped focal zone about 6 × 40 mm, wider than a point but narrower than the stone. A rising tone runs into a strong impact on the beat (28.095 s). |
| 16 | 28.5–31.0 | COMPRESSION STRESS + Part of the energy enters | At the stone–urine boundary part of the wave reflects and part enters. The transmitted compression runs faster inside the stone. Orange arrows show the squeeze. Two pulses, 2 beats apart. |
| 17 | 31.0–33.0 | INTERNAL STRESS + Stress builds at flaws | Magnified crystal grains. As the stress wave passes, pre-existing flaws light up orange (stress concentration) and the microcracks lengthen slightly. The stone does not disintegrate instantly. |
| 18 | 33.0–35.0 | TENSILE FRACTURE + Spallation | The compression wave reaches the far face on the beat and reflects as tension (purple). Opposing arrows pull apart about 2 mm below the face, and a spall crack opens parallel to it. |
| 19 | 35.0–37.2 | SHEAR STRESS + Layers deform differently | Growth layers slide in opposite directions as the stress band sweeps through. A crack runs along the weak interface. |
| 20 | 37.2–40.0 | CAVITATION + Bubbles grow, then collapse | The tensile tail grows nuclei into bubbles; their pitch falls as they grow. Near-wall bubbles collapse asymmetrically and jet into the surface, leaving pits; distant ones collapse spherically and emit a shock ring. One jet is weak. Cracks start at the pits. Nothing chemical is shown. |
| 21 | 40.0–43.0 | REPEATED SHOCK WAVES + Many pulses over treatment | TIME-COMPRESSED. One pulse at a time on 8th notes; a counter runs to the thousands; pits and the crack network accumulate. |
| 22 | 43.0–46.0 | STONE FRAGMENTATION + Still inside the kidney | The final pulse, a stutter, then half a beat of silence. On the drop (43.81 s) the stone separates along exactly the cracks shown earlier. The fragments drift a little and stay inside the renal pelvis. |
| 23 | 46.0–50.0 | FRAGMENTS PASS IN URINE + Days to weeks later / Some fragments may remain | TIME-LAPSE map from kidney to ureter to bladder and out. Only small pieces travel with the urine; a larger piece settles in a lower-pole calyx and is ringed. |
| 24 | 50.0–55.0 | HOW SHOCK WAVE MACHINES WORK (+ KIDNEY STONE LITHOTRIPSY) | Recap cuts on consecutive beats: COIL, PRESSURE WAVE, LENS, STONE, INTERNAL STRESS, MICROCRACKS, FRAGMENTATION. Then the title, then a return to the opening shot with the first pulse approaching, so frame 3300 flows into frame 0. |

## Science notes

- **Device:** electromagnetic source (flat coil with an acoustic lens). The capacitor discharge goes through the coil, eddy currents repel the conductive membrane, and that launches a plane pressure wave in water. The lens focuses it at F2. Imaging (ultrasound) is separate from therapy.
- **Waveform:** a sharp positive front (rise time of nanoseconds at the focus) followed by a tensile tail lasting a few microseconds, after Church 1989. The plot is normalised; no absolute pressures are claimed.
- **Mechanisms shown:**
  - compression wave entering the stone;
  - stress concentration at flaws;
  - spallation from the tension reflected at the far face;
  - shear between layers;
  - cavitation with varied collapses;
  - cumulative damage over many pulses.

  These are the main accepted mechanisms of stone comminution (Hopkinson spallation, squeezing/shear, cavitation erosion, dynamic fatigue).
- **The crack network is fixed:** cracks grow only along the boundaries on which the stone later splits, so the fragments are the cracked regions.
- **Rates:**
  - Real treatments use about 60–90 shocks per minute (about 1 Hz), typically a few thousand shocks per session.
  - Real-time moments in the film are spaced about 2 beats apart, about 1.05 Hz.
  - Microsecond physics is labelled SLOW MOTION, the treatment montage TIME-COMPRESSED and fragment passage TIME-LAPSE.
  - The 126 BPM music tempo is not the shock rate.
- **Safety and limits:**
  - Tissue is shown being exposed: there are strain marks and weak reflections.
  - Some fragments may remain.
  - ESWL does not suit every stone, and retreatment may be needed.
  - This is an educational illustration, not medical guidance.

### Simplifications

- Distances and the speed ratio are compressed to fit 9:16.
- Membrane displacement and stone squash are exaggerated so they can be seen.
- Microscopic sounds are artistic sonifications; real cavitation and shock fronts are ultrasonic or inaudible.
- Anatomy is illustrative; it is not from a patient.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | Pixel buffer, rasterizers, masks with 16-bit shading, camera, easing, fonts. |
| `src/01_ui.js` | Callouts, micro-context, tags. |
| `src/02_pal.js` | ESWL palette, extra title glyphs, value noise, the UI switch for recap renders. |
| `src/05_fx.js` | Arc-length paths and particle helpers. |
| `src/10_stone.js` | The stone: growth layers, striations, grains, flaws, the fixed jittered-Voronoi fracture network with damage windows, cavitation pits, separation into fragments, the crystal micro view. Static views are cached. |
| `src/11_body.js` | Kidney frontal section (cortex, pyramids, sinus, calyces, pelvis, ureter, bladder), torso cutaway, treatment suite side view. |
| `src/12_machine.js` | Pressure fronts (plane and converging arcs), ultrasound B-mode, focal geometry, coupling, capacitor circuit, coil and membrane, acoustic lens. |
| `src/13_waves.js` | Oscillating water particles, waveform steepening, tissue layers, shear layers, cavitation bubbles. |
| `src/20_scenes.js` | The 24-scene master timeline, transitions, SLOW MOTION / TIME-COMPRESSED / TIME-LAPSE chips. |
| `src/30_audio.js` | 126 BPM score in F minor plus about 60 synced SFX types; offline render with loop folding; live scheduler. |
| `src/40_player.js` | Controls and the `window.LINAC` export API. |

## Sound design

126 BPM in F minor. The bars are Fm | Db | Ab | Eb with a syncopated hook riff from frame one.

| Time (s) | Section |
|---|---|
| 0–5.7 | Hook and impact |
| 5.7–17.1 | Machine: pulse-wave bass, mechanical 16ths, servo blips |
| 17.1–28.6 | Wave generation: filter opening, rising counter-line, snare roll into the impact |
| 28.6–36.2 | Fracture mechanics: half-time, crystalline bells, precise ticks |
| 36.2–43.8 | Main build: snares accelerate, riser, stutter, half a beat of silence |
| 43.8 | THE DROP: supersaw hook, formant choir and the fragmentation shatter |
| 47.6–49.5 | Resolution |
| 49.5–55 | Reveal; the 3.5-beat pickup loops into 0:00 |

Every SFX comes from the same timing constants as the picture. The offline render's tail past 55 s is folded onto the start, so the loop is seamless. The approaching first pulse is scheduled at 54.6 s and lands on beat 1.
