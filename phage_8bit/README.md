# How Bacteriophages Infect Bacteria — 8-bit scientific animation (code project)

**The T4 bacteriophage lytic cycle** in 72 seconds and 22 connected scenes, 9:16, original pixel art in a
Kurzgesagt-style flat-science grammar, rendered entirely in code (HTML5 Canvas 2D, JavaScript, Web Audio).
No narration, no subtitles, only short scientific labels.

- `index.html` is a self-contained player: open it in a browser (click to play, arrows to seek, M to mute).
- `tools/export.js` renders the MP4.
- `镜头表.md` is the shot list (written and linted with the huashu-art-motion skill before any code).

| | |
|---|---|
| Video | 1080×1920 at 60 fps, exactly 4,320 frames (72.000 s). H.264, yuv420p, BT.709. The 270×480 logical canvas is upscaled ×4 with nearest-neighbour, so every pixel stays crisp. |
| Audio | Original 130 BPM bio-electronic score in D minor (39 bars = 72.000 s) plus about 240 event-synced SFX, AAC 48 kHz stereo, mastered to −15 LUFS with the true peak at or below −1.6 dBTP. |
| Loop | The last shot pushes into one of the new phages; it lands exactly on the framing, pose and background of frame one, and the music's A-major turnaround resolves into bar 1. |

## Render it yourself

Requirements:
- Node ≥ 18
- ffmpeg with libx264
- Python 3 with numpy and scipy
- Playwright Chromium: `npm i playwright && npx playwright install chromium`

```
node tools/export.js                  # full MP4 -> output/phage_8bit.mp4
node tools/export.js --video-only     # picture only -> build/video.mp4
node tools/export.js --audio-only     # soundtrack only -> build/audio.wav
node tools/stills.js out.png 0.5 7.6 29.5 62.9 --scale 2   # check any frames
```

The picture takes a few minutes (about 16–30 ms per frame); the offline audio render takes about 3–4 minutes in Chromium.

To check the result:
```
ffprobe output/phage_8bit.mp4
ffmpeg -i output/phage_8bit.mp4 -af ebur128=peak=true -f null -
```
Expect 4,320 frames, an integrated loudness around −15 LUFS and a true peak at or below −1 dBTP.

## One continuous story

The film follows **one T4 phage, one E. coli cell and one viral genome** from start to finish. The bacterium is drawn as
a cutaway at every scale, so the camera never teleports: it pulls out, glides and dives between the cell, its envelope,
single molecules and back (Kurzgesagt scale travel with log-zoom keyframes). The phage built in scene 18 is the one that
flies to a new cell in scene 22 and becomes the hero of frame one.

| # | Time (s) | Caption / labels | What happens |
|---|---|---|---|
| 01 | 0–1.85 | BACTERIOPHAGE · A virus that infects bacteria | The hero T4 drifts in; its six tail fibers unfold like landing legs on the beat; a glint runs down the faceted head with the packed DNA inside. |
| 02 | 1.85–3.92 | It hijacks bacteria to reproduce · E. COLI | Fast pull-out reveal: five E. coli cells; target brackets lock onto one; the phage turns its tail toward it. |
| 03 | 3.92–6 | LYTIC CYCLE BEGINS | The phage sinks toward the cell's pole, fibers spreading; the beat drops at 5.54 s. |
| 04 | 6–9 | 1. ATTACHMENT · RECEPTOR | One fiber tip taps a bare spot, slides and locks onto an OmpC receptor; five more lock on, one per 8th note. |
| 05 | 9–11.08 | LOCKED ONTO THE CELL · BASEPLATE | The baseplate settles and flattens from a dome to a star; the short tail fibers clamp onto the surface. |
| 06 | 11.08–14.08 | 2. DNA INJECTION BEGINS · SHEATH CONTRACTS | The sheath charges from the bottom up, then snaps shut like a spring (11.54 s); the head drops and the tube drives into the envelope. |
| 07 | 14.08–17.08 | OUTER MEMBRANE · CELL WALL · INNER MEMBRANE | Close-up of the cut envelope: the tube has pierced the outer membrane, the baseplate lysozyme digests a hole in the peptidoglycan, a channel opens through the inner membrane. |
| 08 | 17.08–21 | Viral DNA enters the cell · CAPSID STAYS OUTSIDE | The genome streams through the tail into the cytoplasm; the head empties into a pale ghost that stays outside. |
| 09 | 21–24 | VIRAL DNA · BACTERIAL DNA · RIBOSOMES | Pull-out over the busy interior: the coiled viral genome, the yellow host chromosome, purple ribosomes reading host messages. |
| 10 | 24–27.92 | 3. HOST TAKEOVER · HOST DNA CHOPPED UP | Viral enzymes cut the host chromosome into shrinking fragments; the ribosomes' messages switch from host yellow to viral pink. |
| 11 | 27.92–32.08 | Viral instructions are copied · VIRAL DNA · VIRAL mRNA | Dive to the double helix: host RNA polymerase lands, unzips the DNA and pulls out a pink mRNA strand. |
| 12 | 32.08–36 | Host ribosomes build viral parts · HEAD / TAIL / FIBER PROTEIN | Glide along an mRNA to its ribosomes; protein chains grow and fold into a capsid tile, a tail ring and a fiber rod. |
| 13 | 36–39.92 | Viral DNA is replicated · ×2 ×4 ×8 ×16 COPIES | The genome copies itself on the beat: 2, 4, 8, 16 helices. |
| 14 | 39.92–44.08 | The cell becomes a virus factory · HEADS / TAILS / FIBERS | Pull-out to the whole cell: heads, tails, fibers and genome copies pile up everywhere. |
| 15 | 44.08–47.08 | CAPSID HEADS ASSEMBLE · CAPSID PROTEINS | On the inner membrane, capsid tiles snap around an orange scaffold core into an elongated head shell. |
| 16 | 47.08–50.08 | DNA is packed into new heads · PACKAGING MOTOR | The head detaches; the five-lobed motor docks at its portal and pumps a genome copy in until the head is full, then cuts it. |
| 17 | 50.08–53.08 | TAILS ASSEMBLE · BASEPLATE · TUBE · SHEATH | Baseplate wedges ring up, the tube grows ring by ring, the sheath stacks around it, the cap closes. |
| 18 | 53.08–56.08 | New phages are assembled | The filled head clicks onto the tail and six fibers snap on; the new phage glints. |
| 19 | 56.08–60 | The bacterium fills with viruses · 100+ NEW PHAGES | Pull-out: the cell packed with new phages, swelling under pressure while a counter climbs past 100. |
| 20 | 60–62.77 | 4. LYSIS · ENZYMES WEAKEN THE WALL | Holin pores open in the inner membrane, endolysin slips out and chews the wall; cracks glow and spread, the wall bulges. |
| 21 | 62.77–66.46 | — | The burst lands on the drop: the wall tears open, the phages stream out, debris and the old empty capsid fly off. |
| 22 | 66.46–72 | One virus became many | The phages scatter; two land on neighbouring cells; the camera dives into the phage built in scene 18 → frame one. |

## Colour code (fixed for the whole film)

| Colour | Meaning |
|---|---|
| Cyan / pale white, blue tips | the T4 phage (head, sheath, baseplate, fibers) |
| Hot magenta | viral DNA |
| Light pink | viral mRNA |
| Green / teal | bacterial envelope (membranes, receptors); dark teal = cytoplasm |
| Yellow-green mesh | peptidoglycan cell wall |
| Warm yellow | bacterial DNA |
| Purple | ribosomes |
| White / silver | tail proteins |
| Orange | fiber proteins, scaffold, packaging motor |
| Orange / red | lysis, cracks, the burst |
| Deep navy | the surrounding fluid (flat, no gradients) |

## Sound design

130 BPM, D minor, 39 bars = exactly 72 s. Chord loop Dm–B♭–F–C; the takeover darkens it to Dm–B♭–Gm–A.
The hook is a tresillo arpeggio (3+3+2 sixteenths up, then a stepwise fall) that returns in every act:

| Bars (time) | Act | Music |
|---|---|---|
| 1–3 (0–5.5 s) | Reveal | Glassy bell hook, soft pad, heartbeat kick, a build into the beat |
| 4–10 (5.5–18.5 s) | Invasion | Four-on-the-floor, octave bass, chip-lead hook; a one-beat stop and the SNAP on the sheath contraction |
| 11–13 (18.5–24 s) | Inside | Half-time "machine" groove, bells |
| 14–21 (24–38.8 s) | Takeover | Glitch hit, broken beat, the hook on a "hacked" detuned lead over Dm–B♭–Gm–A |
| 22 (38.8–40.6 s) | Build | Snare roll and rising bass into the factory |
| 23–30 (40.6–55.4 s) | Factory | Full groove with a metallic clank, the hook on plucks, arpeggios |
| 31–32 (55.4–59.1 s) | Fill | The hook an octave up, vocal pads, pressure building |
| 33–34 (59.1–62.8 s) | Tension | Pulsing kick and bass, risers, half a beat of silence |
| 35–36 (62.8–66.5 s) | THE DROP = the burst | Supersaw hook, vocal chops, crash |
| 37–39 (66.5–72 s) | Release + loop | Bell hook, light drums, an A-major turnaround that resolves into bar 1 |

Every SFX belongs to a visible event and is tuned to D minor pentatonic, so the clicks are part of the music:
fiber legs unfolding, target lock-on, tap and slip, six rising receptor locks, baseplate clunk, ratchets, the charge and
the spring SNAP, puncture, wall crunch, pore pop, the DNA stream, takeover glitch, host-DNA snips, writing ticks,
translation clicks, part pops, duplication pulses, tile snaps, the packaging motor, tail clicks, the docking click,
fiber snaps, the completion chime, pressure hum, crackles, the suck before the burst, the burst and the swarm.
Microscopic sounds are artistic sonifications, not real sounds.

## Quality checks run before delivery

- **Shot list:** `镜头表.md` passes the skill's `storyboard_lint.py` with no red flags (two yellows required by the brief: a 1.85 s hook shot and six words in the first shot).
- **Skill film gate** (`film_gate.py`, run on a 540×960 QA proxy rendered from the same engine; the proxy is not a deliverable): all three gates green. Fast-motion frames 0.27 (needs ≥ 0.06), no blank frames, 0% blue-purple frames, 8% fixed-frame share. The one yellow is about 9 push-ins per minute. These are the scale dives the topic needs, and every dive is answered by a pull-out.
- **Motion scan** at 30 fps: no window of 0.5 s or more without motion; average render time 16 ms per frame.
- **Audio** (numbers only, not a listening test): exactly 72.000 s; −15.0 LUFS integrated and −1.74 dBTP true peak after mastering. Each second measures between −23 and −13.6 dBFS RMS, and the loudest second is the burst. Below 250 Hz holds 76% of the energy, with the hook kept forward for phone speakers.
- **Player:** headless Chromium smoke test (play, seek) with no errors.

To run the skill's delivery gate on your own render:
```
uv run ../.claude/skills/huashu-art-motion/scripts/film_gate.py output/phage_8bit.mp4
```

## Science notes

What the film shows, simplified but correct in order and cause:
- T4 infects *E. coli*. The long tail fibers bind reversibly to receptors (OmpC / LPS); the baseplate then changes from a dome to a flat star and the short tail fibers bind the LPS core irreversibly.
- The sheath contracts (starting at the baseplate) and drives the rigid tube through the outer membrane; the tube tip's lysozyme digests the peptidoglycan and the tube reaches the inner membrane.
- Only the DNA (~169 kb) enters the cell. The empty capsid stays outside.
- Viral enzymes degrade the host chromosome (its nucleotides are reused); host RNA polymerase is redirected to viral genes; host ribosomes translate viral mRNA.
- The viral genome is replicated many times (in reality as long concatemers).
- Heads assemble on the inner membrane around a scaffold, are packed with DNA by a terminase motor at the portal ("headful" packaging), and join separately built tails; the long tail fibers attach last.
- At a programmed time holins open the inner membrane, endolysin degrades the wall and the cell bursts, releasing ~100–200 new phages. The whole cycle takes about 25–30 minutes at 37 °C (time-lapse in the film).

Simplifications: a 2-D cutaway; molecules are magnified inside the same world; genome copies are drawn as short helix rods;
about 66 phages stand in for the 100+ of a real burst; the packed DNA is shown through the shell.

## Source map

| File | Contents |
|---|---|
| `src/00_core.js` | pixel buffer, palette, rasterisers, masks, camera, fonts |
| `src/01_ui.js`, `src/02_pal.js`, `src/05_fx.js` | callouts and tags, extra glyphs, noise, splines, IK, paths |
| `src/10_env.js` | the biofluid: parallax suspended matter, far bacteria (all periodic in 72 s) |
| `src/11_phage.js` | the T4 model with level of detail and partial-build flags |
| `src/12_cell.js` | the E. coli cutaway: LPS, receptors, bilayers, peptidoglycan, cytoplasm, cracks and tears |
| `src/13_host.js`, `src/14_virus.js` | nucleoid, ribosomes, mRNA; viral DNA helix, polymerase, parts, prohead, motor |
| `src/20_story.js`, `src/21_units.js`, `src/22_world.js` | beat-locked timeline, the hero phage, the factory crowd, the burst, the world at time t |
| `src/23_scenes.js`, `src/24_overlay.js` | the one camera track, captions, tags, counters, scene table |
| `src/30_audio.js` | score, SFX map, Web Audio synthesis, offline render with loop folding |
| `src/40_player.js` | the player |
| `tools/` | build, export (Chromium audio + ffmpeg video), mastering, stills, smoke test, profiler |
