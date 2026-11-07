# How MRI Machines Work

A 70-second 8-bit pixel-art explainer that opens on the result and then works backward to how it was made.

The first frame is a radiology monitor showing an axial MRI slice. Within two seconds the series leaves the screen as
18 slices, which click together into a rotating voxel 3D brain. The camera then goes into that brain and out into the
patient lying in a cutaway 1.5 T scanner. From there it dives into the tissue, the water, one hydrogen nucleus and its
magnetic moment. It follows the physics forward again: magnetic resonance, RF excitation, T1/T2 relaxation, spatial
encoding, the induced signal, k-space and the inverse Fourier transform. It ends by rebuilding the same 3D brain and
rewinding into the first frame, so the video loops.

- 1080×1920 vertical, 60 fps, exactly 70 s, H.264 + AAC stereo.
- Every frame is drawn at 270×480 and upscaled 4× with nearest-neighbour, so pixels stay crisp. The film uses one
  limited palette with ordered dithering.
- Motion follows the Kurzgesagt grammar:
  - flat shading with a soft rim;
  - hard-edged glows;
  - cutaways and cross-sections;
  - log-scale zooms between scales (the dive in scene 3 spans 14 decades, from the scanner to one proton).
- The colour code is the brief's:

  | Element | Colour |
  |---|---|
  | Backgrounds | deep navy and near-black |
  | MRI machine | white, silver and muted gray |
  | Magnetic fields | electric cyan |
  | Hydrogen nuclei | golden yellow |
  | Magnetic moments | bright cyan arrows |
  | RF pulses | violet |
  | Signal waveforms | electric green |
  | Digital reconstruction | cyan and white |
  | Brain | soft pink, dusty purple and pale gray |

- There is no narration and no subtitles. Labels are minimal: the brief's scene labels plus small part names.
- The score and sound effects are synthesized in code, with no samples:
  - 120 BPM in D minor;
  - the main drop lands on the 3D reconstruction (0:58);
  - the bass drops out before the RF pulse and returns on the beat where the magnetization tips;
  - the gradient knocking is the percussion of scene 7;
  - the final rewind runs straight into the opening hit.

The finished film is `output/How_MRI_Machines_Work.mp4`.

## One patient, computed

Everything that shows anatomy comes from one procedural model, `engine/lib/anat.js`:

- **Brain shape.** Two hemispheres are signed-distance shapes with a flat medial surface and a 2 mm longitudinal
  fissure. Temporal lobes and a concave orbital surface complete the cerebrum.
- **Cortical folds.** Sulci are radial slots cut along the zero set of band-limited 3D noise (the labyrinth of gyri),
  with rounded gyral shoulders. The named sulci are drawn explicitly: Sylvian, central, superior temporal, cingulate,
  parieto-occipital and calcarine.
- **Cerebellum and brainstem.** The cerebellum has two lobes and transverse folia, with deep fissures every fifth
  folium. The brainstem is shown with its pons, midbrain and medulla.
- **Inner structures.** The corpus callosum, lateral, third and fourth ventricles, thalamus and basal ganglia are
  included.
- **Gray and white matter.** A distance transform turns the outer 2.5 mm of the brain into cortex.
- **Head.** CSF space, skull (cortical tables and marrow), scalp fat and skin are analytic layers. The face and neck
  include the eyes in orbital fat, the nasal cavity and sinuses, the tongue, the airway and the cervical spine with
  its cord.

From that one model:

- **The 3D brain** (`lib/vol.js`): the volume is built at 1.25 mm voxels (about 116k surface voxels), and each surface
  voxel is splatted into a z-buffer every frame. Shading uses smoothed normals, cavity occlusion and sulcal depth,
  averaged over the local surface so the dither forms clean bands. Fold creases are found from depth jumps the
  surface's own slope does not explain. A cut plane shows the T1 cross-section on its face, which is how the brain
  becomes a sagittal slice in scene 2.
- **Every MRI slice** is that model sampled with a T1-weighted contrast: white matter bright, gray matter mid-gray, CSF
  dark, fat bright, bone dark. Scene 6 also uses a T2-weighted remap (CSF bright, white matter darker than gray).
- **k-space** (`lib/kspace.js`) is the real 2D FFT of the slice encoded in scene 7. The reconstruction is the real
  inverse FFT of the k-space inside a growing radius, computed every frame.
- **The scanner** (`lib/scan.js`) is ray-cast per pixel:
  - two coaxial shells: the bore liner, RF body coil and three gradient-coil layers; then the cryostat, which holds the
    vacuum, thermal shield and helium vessel at 4 K, with six main superconducting coils and two shielding coils;
  - the patient on the table, with the head in a head coil;
  - a cutting plane that opens the machine like a technical illustration.

  The patient's head is the sagittal slice in the cut plane, under a translucent skin whose rim is dense at the
  silhouette.

## Scenes

At 120 BPM one beat is 0.5 s, and every scene boundary in the brief falls on a beat.

| # | Time | Label | What happens |
|---|---|---|---|
| 1 | 0–3 | MRI | Monitor with a T1 axial slice → the series scrolls → 18 slices peel off, fan out, turn flat and click into place as the voxel brain grows beneath them (complete by 2 s) → a 45° turn under a cyan scan line, then a rush in. |
| 2 | 3–8 | INSIDE THE MRI | A cutting plane sweeps through the brain to the midline: its face is the sagittal MRI. The head appears around it under a translucent skin. The camera rolls back to the patient in the cutaway scanner and climbs through the layers (bore, RF coil, gradient coils, superconducting magnet in liquid helium). B0 runs along the bore and returns between the main and shield coils: "always on". |
| 3 | 8–14 | HYDROGEN NUCLEI | Dive into the slice → one MRI voxel (≈1 mm) → cortex (pyramidal neurons, glia, a capillary with red blood cells) → the fluid between cells → liquid water → one H₂O, its hydrogen nuclei lit gold → through the electron cloud → one proton and its magnetic moment as a cyan vector with its dipole field. A scale bar tracks every decade. |
| 4 | 14–20 | NUCLEAR MAGNETIC RESONANCE | The proton is one of many; thermal tumbling → B0 arrows → each moment settles on the parallel or antiparallel spin-½ cone and precesses at one shared rate → the net magnetization M grows. "NOT ALL ALIGN: EXCESS ≈ 5 PER MILLION". ω = γB₀ with gauges for 1.5 T (64 MHz) and 3 T (128 MHz). |
| 5 | 20–28 | RF EXCITATION | The RF body coil fires: violet, long, non-ionizing waves into the head → the nuclei at 64 MHz, the Larmor frequency → B₁ rotates in the transverse plane and tips M along a spiral (90° pulse); an ensemble of spins rides rigidly with it → one coherent Mxy precessing on the beat. |
| 6 | 28–35 | T1 RECOVERY / T2 DECAY | The 3D relaxation spiral, then two looping panels: Mz recovering, and the transverse spins fanning out of phase while Mxy shrinks. Then white matter, gray matter and CSF race each other, with the T1- and T2-weighted slices that result. |
| 7 | 35–42 | SPATIAL ENCODING | The gradient coils knock on the beat → a 3D grid of field arrows that grow with height → slice selection steps a plane through the brain (one RF band = one slice) → looking down on that slice: phase encoding twists the rows, frequency encoding spins the columns. "POSITION → PHASE + FREQUENCY". |
| 8 | 42–49 | MR SIGNAL | The rotating Mxy sweeps its flux through a receiver-coil loop, which induces a voltage. The decaying signal rides the wire down: receiver coil → amplifier → signal processor (shifted down from 64 MHz and filtered) → analog-to-digital converter → numbers. |
| 9 | 49–58 | IMAGE RECONSTRUCTION | The numbers fill k-space one line per repetition → inverse FFT as a sum of waves (blurry shape → sharp edges), computed live → slice after slice into an 18-slice viewer grid. |
| 10 | 58–65 | 3D BRAIN RECONSTRUCTION | The slices leave the grid and stand at their real heights (7 mm apart) → segmentation peels away scalp and skull (cyan contour) → voxels fill in from the bottom with the completion hit on beat 124 → the brain turns with its parts named → a push in. |
| 11 | 65–70 | HOW MRI MACHINES WORK | A fast pull-back to the monitor and the scanner behind the window → HYDROGEN → MAGNETIC FIELD → RADIO WAVES → SIGNALS → 3D IMAGE → title, final hit → the film rewinds into its first frame, ready to loop. |

## Physics notes

- **Field and frequency.** 1.5 T superconducting magnet; B0 lies along the bore and is never switched on in the film.
  Protons: γ/2π = 42.58 MHz/T, so 64 MHz at 1.5 T and 128 MHz at 3 T. The thermal excess is ≈ 5 per million at body
  temperature; it is exaggerated on screen and labelled as such.
- **Spin.** It is shown only as the magnetic moment vector, never as a spinning ball. The electron cloud is a separate,
  static haze.
- **Precession and excitation.**
  - Precession is clockwise seen from the tip of B0 (γ > 0).
  - The 90° pulse is a rotation of the whole ensemble.
  - In the lab frame, M's tip spirals down while B₁ turns a quarter turn ahead of M's transverse part.
- **Relaxation times** are stretched for the screen. Real values at 1.5 T are about:

  | Tissue | T1 | T2 |
  |---|---|---|
  | White matter | 0.6 s | 80 ms |
  | Gray matter | 1.0 s | 100 ms |
  | CSF | 4 s | 2 s |

- **Encoding and reconstruction.**
  - Slice selection, phase encoding and frequency encoding follow the usual axial scheme (S-I, A-P, L-R).
  - The image is reconstructed from Cartesian k-space with an inverse 2D FFT.
  - The 70 s film compresses an acquisition that really takes minutes; scene 9's text says "ONE LINE PER REPETITION OF
    THE PULSE SEQUENCE".
- **What the 3D brain is.** It is a computer reconstruction (stacked slices → volume → segmentation → voxel rendering),
  shown floating in front of the monitor as a visualization, not as an object.

## Files

```
engine/
  index.html, film.js          timeline (11 scenes, exactly 70 s) and frame loop
  lib/anat.js                  the procedural head and brain
  lib/vol.js                   voxel volume, surface splatting renderer, slice sampling (T1, T2)
  lib/stack.js                 slices as 3D cards with slerped poses (S01, S09, S10, S11)
  lib/scan.js                  ray-cast cutaway scanner, patient, head slice under translucent skin
  lib/room.js                  control room, radiology monitor and its viewer UI
  lib/micro.js                 tissue, water, the proton and its moment, scale bar
  lib/spin.js                  magnetization vectors, cones, populations
  lib/kspace.js                FFT, k-space, partial reconstructions
  lib/pix.js, kit.js, fx.js, cap.js, util.js, motion.js, camera.js   pixel pipeline, font, effects, captions
  scenes/s01_monitor.js … s11_final.js
tools/
  render.py                    headless render (frames → ffmpeg), stills, contact sheets, cue sheet
  synth_audio.py               score and sound effects from the cue sheet
  anat_preview.mjs             the anatomy under node: 3D views and slices on one sheet
  text_check.py, video_diffs.py, frame_diffs.py, pair_diff.py   checks
镜头表.md                      shot list (storyboard lint: green)
output/                        the film and its delivery note
```

## Rebuild

```sh
cd mri-brain
uv run --with playwright==1.56.0 --with pillow python tools/render.py --cues build/cues.json
uv run --no-project --with numpy --with scipy --with soundfile --with pillow python tools/synth_audio.py build/cues.json build/score.wav build/loudness.png
uv run --with playwright==1.56.0 --with pillow python tools/render.py --out build/film.mp4 --audio build/score.wav --fps 60 --crf 18 --tune animation
```

Quick looks: `--sheet 0:3:0.25 --solo s01_monitor --out build/s01.png` or `node tools/anat_preview.mjs build/anat.png`.
