# How CT Scanners Actually Work

*How X-Rays Become 3D Images.* A 120-second 8/16-bit pixel-art explainer of how a CT scanner turns X-rays into a 3D
image. It opens on the result and then works back through the machine to show how that result was made.

The first frame is a voxel skull on a radiology workstation. A scan plane sweeps down it, the vault lifts off, and the
skull opens into slabs that close again. The camera then pulls back through the monitor into the scan room and
follows the process:

1. the gantry, its cover going see-through, tube and detector turning together;
2. into the X-ray tube: a hot tungsten filament releases electrons (thermionic emission);
3. 120 kV accelerates them into the tungsten anode, where braking near nuclei makes X-ray photons (bremsstrahlung,
   about 1 % of the energy; the rest is heat);
4. the beam is filtered, collimated and shaped by a bowtie filter into a fan;
5. in the head, photons pass, are absorbed (photoelectric absorption in calcium) or scatter (Compton);
6. the same 2 cm of air, soft tissue and bone transmit 100 %, 67 % and 37 %;
7. a detector element: anti-scatter plates, scintillator, photodiode, one integrated signal per view;
8. the frame turns and records a projection at every angle;
9. rotation plus table movement make a helical scan;
10. one ray measured: I₀, I, and p = ln(I₀/I), the total attenuation along the ray;
11. the projections stack into a sinogram;
12. filtered backprojection rebuilds the slice, sharpening from 1 to 360 views;
13. CT numbers (HU), and the brain and bone windows on the same data;
14. slices stack into a volume, bone is selected, and the voxel skull builds up.

It ends on the workstation monitor with the title. The skull turns back to its opening pose, so the video loops.

- **Format:**
  - 1080×1920 vertical, 60 fps, exactly 120 s, H.264 with AAC stereo.
  - Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour.
  - One limited palette with 4×4 ordered dithering keeps the pixels crisp.
- **Colour code (from the brief):** electrons cyan, X-ray photons golden, fields blue, tungsten metallic grey, absorbed
  events red, scattered photons purple, scintillation green, signals bright cyan, reconstruction data blue/white, CT
  images grayscale, the 3D skull bone white, backgrounds deep navy/charcoal.
- **Motion:** follows the Kurzgesagt grammar:
  - flat two-tone shading and mechanical cutaways;
  - a pause before a log-scale dive, and a pull-back after every push-in;
  - object-following transitions (one photon is ridden from the tube to its detector element; the gantry shrinks
    into the corner while its projection becomes the first sinogram row);
  - glow only on things that emit or carry a signal.
- **Text:** no narration and no subtitles.
  - Each scene has a short LEVEL 1 heading, replaced by its LEVEL 2 line when the mechanism appears.
  - Labels sit next to the thing they name.
  - Every text stays up long enough to read: 17 characters per second plus 0.3 s, at least 0.8 s.
- **Sound:** score and sound effects are synthesized in code; no samples.
  - The score is 120 BPM minimal techno in A minor, with no vocals and no heavy distortion: a round four-on-the-floor
    kick, a rolling 16th bass, dub chord stabs with dotted-eighth echoes, and one FM "bleep" hook.
  - The arc follows the picture: the beat starts on frame 0 with an impact.
    - A breakdown inside the tube drops into the high-voltage switch-on.
    - Bullet time gets a half-time dip.
    - Held breaths come before the helix and before the reconstruction drop.
  - The biggest hit is the completed 3D skull.
  - Every effect comes from a cue the scene emits, so it lands on its visual cause. Crowds of particles get one grouped
    sound, not one click each.

The finished film is `output/How_CT_Scanners_Actually_Work.mp4`.

## The images are computed, not drawn

- **The head** (`engine/lib/head.js`) is a procedural model in millimetres.
  - The skull is built from signed distance functions: vault with a diploë between two cortical tables, orbits, nasal
    cavity and sinuses, maxilla and mandible with teeth, and the first two vertebrae.
  - Around the skull sit brain with ventricles and sulci, scalp, face and ears.
  - Every point has a tissue class and a CT number (air −1000, fat −90, CSF 8, white matter 26, grey matter 38,
    cancellous bone ≈ 520, cortical bone 1600, enamel 2600 HU). The linear attenuation is μ = 0.193 (1 + HU/1000) /cm,
    at about 70 keV.
- **The voxel skull** (`engine/lib/skull.js`) is about 85,000 surface voxels at 1.5 mm, taken from the same model.
  - They are shaded with ambient occlusion computed from the distance field.
  - The renderer supports lifting layers, clipping, a scan plane and a build-up from the jaw to the vault.
- **The CT scanner** (`engine/lib/ct.js`) has third-generation fan-beam geometry. It measures one axial slice at
  z = 20 mm through that head.
  - Geometry: source 570 mm from the isocentre, 1040 mm to the detector, a ±26° fan, 360 views × 360 channels.
  - Measurement: I = I₀ e^(−p) with Poisson noise (I₀ = 4 × 10⁶), logged back to p.
  - Reconstruction: fan-beam filtered backprojection (D cos γ weighting, ramp kernel, 1/L² backprojection) on a
    192 × 192 grid over 240 mm. Any subset of views can be reconstructed (1, 2, 4 … 360) for the build-up.
  - Calibration: a least-squares scale, plus an offset fitted on brain interior, the way a scanner is
    water-calibrated.
- **The same CT data drive several scenes:**
  - the projection profiles at every angle (S10);
  - the measured ray (S12);
  - the sinogram (S13);
  - the backprojection and its build-up (S14);
  - the windows (S15);
  - the first slice of the 3D stack (S16).

Numbers on screen and where they come from:

| On screen | Source |
|---|---|
| SLOWED: 1 TURN ≈ 0.3 s | modern gantries rotate in about 0.25–0.5 s; the film shows it slowed |
| 120 kV, photons up to 120 keV | a typical CT tube voltage; the bremsstrahlung spectrum ends at the tube voltage |
| HEAT >99 % / X-RAYS ~1 % | bremsstrahlung efficiency ≈ 9 × 10⁻¹⁰ · Z · V ≈ 0.9 % for tungsten at 120 kV |
| 100 %, 67 %, 37 % through 2 cm | e^(−μ·2 cm) with μ = 0.0002 (air), 0.200 (soft tissue), 0.50 (bone) /cm |
| I/I₀ = 1.3 %, p = 4.36 | the model's line integral along the most attenuated ray of the view at 0° |
| 129,600 MEASUREMENTS | 360 views × 360 channels for one slice (a real scanner records about 1,000 views per turn, with ~900 channels × many rows) |
| VIEWS: 1, 2, 4 … 360 | the reconstruction with that many views |
| AIR −1000, WATER 0, BONE +1000; HU = 1000 × (μ − μwater) / μwater | the definition of the Hounsfield scale |
| brain window, bone window | W 80 / L 40 and W 2000 / L 500, on the same reconstructed data |
| BONE: CT VALUE > 300 HU | the threshold that selects bone for the 3D view |

Shown slowed down and not to scale, with a note on screen:

- the gantry rotation;
- the electrons in the tube;
- the atoms and photons.

The real detector is energy-integrating. It records one total per view, not single photons, and the film says so.

## Files

- `镜头表.md` — the shot list: 46 shots over the brief's 17 scenes, the physics fixed for the whole film, and the
  style lock.
- `engine/` — the renderer:
  - `index.html`, `film.js` (timeline, dissolves, cue sheet);
  - `lib/`:
    - the pixel pipeline, bitmap font, camera and captions;
    - `head.js`, the model;
    - `skull.js`, the voxel renderer;
    - `ct.js`, the measurement and reconstruction;
    - `room.js`, the scan room ray caster;
    - `gantry2d.js`, the gantry face-on;
    - `monitor.js`, the workstation;
    - `tube.js`, `tungsten.js` and `phys.js`, inside the tube;
  - `scenes/` (one file per scene).
- `tools/`:
  - `render.py` (frames, stills, contact sheets, cue sheet);
  - `synth_audio.py` (score and SFX);
  - `caption_audit.py` (reading time of every text);
  - `text_check.py` (text collisions and text leaving the frame);
  - `video_diffs.py`, `frame_diffs.py`, `pair_diff.py` (frame-to-frame change).
- `审片/` — the independent review of the finished film, and what was done about each finding.
- `output/` — the delivered film and its delivery note.

```sh
uv run --with playwright==1.56.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav build/loudness.png
uv run --with playwright==1.56.0 --with pillow python tools/render.py --out build/film.mp4 --audio build/score.wav --fps 60
```
