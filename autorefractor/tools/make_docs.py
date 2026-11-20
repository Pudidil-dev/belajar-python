#!/usr/bin/env python3
"""Build the text documents of the production package from the film's own sources (镜头表.md, the scene files' header
comments, build/cues.json and build/textlog.json from render.py --cues, build/audio_report.json from synth_audio.py), so
they cannot drift from the film: docs/storyboard.md, timeline.md, prompts.md, labels.md / .srt / .json, cue_sheet.md,
assets.md, loop.md.

  python3 tools/make_docs.py
"""
import json, re
from collections import defaultdict
from pathlib import Path
R = Path(__file__).resolve().parent.parent
D = R / 'docs'; D.mkdir(exist_ok=True)
shot = (R / '镜头表.md').read_text()
cues = json.loads((R / 'build/cues.json').read_text())
textlog = json.loads((R / 'build/textlog.json').read_text())
rep_p = R / 'build/audio_report.json'
rep = json.loads(rep_p.read_text()) if rep_p.exists() else None
def table(md, first):
    rows, on = [], False
    for ln in md.splitlines():
        if ln.startswith('| ' + first): on = True; continue
        if on and ln.startswith('|---'): continue
        if on and ln.startswith('|'): rows.append([c.strip() for c in ln.strip().strip('|').split('|')])
        elif on: break
    return rows
SHOTS = table(shot, '场 | 时间段')
CAM = {'停': 'hold', '缓推': 'slow push', '拉远': 'pull out', '横移': 'track / pan / orbit', '快推': 'fast push (accent)', '切': 'cut'}
ids = re.findall(r"'(s\d\d_[a-z0-9]+)'", (R / 'engine/film.js').read_text())
SC = 3.0; NS = len(ids); TOTAL = NS * SC
def header(sid):
    out = []
    for ln in (R / 'engine/scenes' / f'{sid}.js').read_text().splitlines():
        if ln.startswith('//'): out.append(ln[2:].strip())
        else: break
    return ' '.join(out)
def xin(sid):
    m = re.search(r'xin:\s*([\d.]+)', (R / 'engine/scenes' / f'{sid}.js').read_text()); return float(m.group(1)) if m else 0.0
by = defaultdict(list)
for c in cues['cues']: by[c['scene']].append(c)
# start and end frames, as the code draws them
FRAMES = {
 's01_balloon': ('The balloon landscape fills the frame; a round vignette only just cuts the four corners; everything sharp. No caption yet: it starts typing at 0.2 s.',
                 'The round aperture has closed in to a circle 352 px across (at 360 × 640), centred a little above the middle; black round it; the picture sharp again.'),
 's02_exam': ('The same aperture on black: a match with the end of S01.',
              'The patient from behind and to the right, chin on the chin cup, forehead on the band; the ivory autorefractor in line with the right eye; the balloon view as a round inset top left, tied to the eye by a dotted amber leader; a letter chart on the wall.'),
 's03_gaze': ('The exterior, dissolving into the side cutaway with the instrument\'s cover still closed.',
              'The cutaway open: lamp, balloon slide, fogging lens, mirror. An amber line runs from the slide by the mirror, through the window, into the eye and on to the centre of the retina; amber brackets are closed round the pupil; the inset stays top left.'),
 's04_fog': ('The whole cutaway with the amber line in place.',
             'Closer on the fixation arm: the fogging lens has moved toward the slide; the inset is slightly soft; the camera is already drifting toward the source arm.'),
 's05_infrared': ('The camera arriving at the infrared source, which is still dark; the inset still showing only the balloon.',
                  'Three cyan guides run from the source through the projection lens, the beam splitter, the mirror, the objective and the window; their front is at the cornea. The inset has gone.'),
 's06_front': ('The cyan front touching the cornea; the front of the eye at the left of the frame.',
               'Close on the front of the eye: the guides through the cornea and the middle of the pupil, reaching the lens; the labels Cornea and Pupil fading.'),
 's07_bend': ('The front of the eye, the guides at the lens.',
              'The whole eye in section: the guides converge to one small glowing spot on the retina.'),
 's08_return': ('The whole eye with the lit spot.',
                'The back of the eye, close: a fan of magenta scatter from the spot, fading with distance; a narrow bright part heading back toward the pupil.'),
 's09_sensor': ('The fundus with the fan; the narrow return under way.',
                'Close on the image sensor at the bottom of the receiving arm: four magenta guides converge through the ring lens to two bright points on the sensor.'),
 's10_pattern': ('The sensor edge-on with the two points: a match with the end of S09.',
                 'The sensor face-on, pushed in to one arc of the magenta ring on the pixel grid; single pixels can be told apart.'),
 's11_charge': ('The arc of the ring on the grid, dissolving into the cross-section.',
                'One pixel in cross-section: microlens, wiring, silicon; thirteen gold dots stacked in the collection well, the well\'s rim lit.'),
 's12_data': ('The grid close up, the ring now in gold charge.',
              'The whole sensor: the ring as a white and grey digital image; the readout chain (amplifier, converter) under the chip.'),
 's13_focus': ('The digital ring, dissolving into two panels.',
               'Two panels: an eye with the light focused on the retina (mint mark, "On retina"); a longer eye with the focus in front of the retina (coral mark and gap bracket, "In front").'),
 's14_astig': ('The two panels, dissolving into the lens model.',
               'One lens, two fans: the white fan (vertical meridian) focused nearer, the mint fan (horizontal meridian) farther; two markers on the ruler below them, joined by a white span.'),
 's15_analyze': ('The lens model, dissolving into the digital ring.',
                 'The digital ring with the dashed calibration circle, 32 sample marks, the fitted ellipse, and two arrows along its long and its short direction.'),
 's16_repeat': ('The analysed ring, full size.',
                'The result panel with three checked ring thumbnails in its header and three empty fields (SPH, CYL, AXIS).'),
 's17_numbers': ('The panel with its fields empty.',
                 'All three fields lit: SPH −2.00 D, CYL −0.75 D, AXIS 180°; the tag "Example" above the panel.'),
 's18_print': ('The lit panel.',
               'The printer with the paper strip fully out: the same three lines and the small printed ring; the tag "Example" beside it.'),
 's19_both': ('The printout, dissolving into the cutaway.',
              'The whole cutaway with everything on: the amber fixation line and the balloon inset (amber ring); cyan guides in, magenta guides back to the sensor; bottom left, the ring thumbnail with the three values.'),
 's20_return': ('The cutaway, dissolving into the exterior of S02.',
                'The round aperture on black, exactly as at the end of S01.'),
 's21_loop': ('The aperture on black: a match with the end of S20.',
              'The balloon landscape filling the frame inside its vignette: identical to frame 0.'),
}
MATCH = {'s02_exam': 'match cut (the same aperture on black)', 's04_fog': 'none: one continuous shot', 's05_infrared': 'none: one continuous shot', 's06_front': 'none: one continuous shot',
         's07_bend': 'none: one continuous shot', 's08_return': 'none: one continuous shot', 's09_sensor': 'none: one continuous shot', 's10_pattern': 'match cut (the sensor, edge-on, then turning)',
         's16_repeat': 'none: the image shrinks in place', 's17_numbers': 'none: the same panel', 's18_print': 'none: the view slides down', 's21_loop': 'match cut (the same aperture on black)', 's01_balloon': 'the loop: identical to the last frame'}
MUSIC = [(0, 6, 'curious opening motif', 'the hook on bell and marimba over a pad; from 3 s, hats and a half-time kick'),
         (6, 15, 'light rhythmic development', 'off-beat bass, shaker and rim come in; the kick on every beat from 12 s'),
         (15, 30, 'smooth forward motion', 'the whole groove: the hook every bar, a 16th-note arpeggio, pads ducking under the kick'),
         (30, 36, 'small satisfying electronic details', 'no kick; the electrons of S11 climb a pentatonic scale, the readout of S12 clicks down in sixteenths'),
         (36, 48, 'build anticipation', 'the pulse returns, then the full kick, claps, a snare roll and a riser; a held breath from 47.75 to 48.00 s'),
         (48, 54, 'clear payoff', 'everything: the hook doubled by a lead, chord stabs in its rhythm; the three values of S17 are the hook\'s own first three notes'),
         (54, 63, 'return to the opening texture', 'the pulse thins, the hook on the bell again; the last bar holds the dominant and leans into bar 1')]
music_at = lambda t: next(m for m in MUSIC if m[0] <= t < m[1])
BASE = ("Premium cinematic 3D voxel and pixel-art medical illustration, vertical 9:16, dark navy background. One calm adult patient at one original, "
        "unbranded tabletop autorefractor (ivory and graphite with restrained teal accents); one anatomical eye in side section; one simplified optical "
        "cutaway; one monochrome image sensor with a ring pattern on it. Smooth anatomy and optical surfaces, controlled pixel detail, clean clinical "
        "lighting. Colour code: the visible fixation path warm amber, outgoing measurement light cyan, returning light magenta (direction only), sensor "
        "charge pale gold, digital results white with mint, eye tissues in muted natural tones. Room for one short caption top centre, added separately "
        "in editing. No embedded text, no brand logos, no air puff, no rotating prism, no lenslet grid, no fundus photograph, no OCT, no corneal "
        "topography, no exaggerated anatomy, no excessive bloom.")
MOTION = ("Animate only the specified action. Preserve: the balloon picture (a slide inside the instrument, never a physical balloon), the patient's pose, "
          "the instrument's shape, the eye's anatomy and proportions, the layout of the optical diagram, the ring's size and shape, the three result "
          "values. The eye never deforms. Light traces are slow visualizations whose moving dashes show direction only: cyan goes in as a thin beam "
          "through the centre of the pupil; magenta comes back as a small part of a diffuse scatter, not a mirror reflection. The patient's view never "
          "shows the infrared. One eased camera move per scene; no shake, no flicker, no morphing, no new parts.")
sb = [f'# Storyboard — {NS} scenes × 3 s = {TOTAL:.0f} s', '', 'Generated by `tools/make_docs.py` from `镜头表.md`, the scene files and the cue sheet. "Motion" is the header '
      'comment of the scene\'s own file, i.e. what the code animates. The start and end frames of every scene are in `storyboard_frames.png` (left to right, '
      'top to bottom: S01 start, S01 end, S02 start, …).', '']
tl = [f'# Editing timeline (exactly {TOTAL:.3f} s)', '',
      f'The engine assembles the film in one pass (`engine/film.js`): {NS} scenes of exactly 3.000 s. Delivery is 30 fps (1890 frames); the engine is time-based, so '
      '`--fps 60` renders the same film in 3780 frames.', '',
      '- **Transitions.** Three kinds only, all in the engine:',
      '  - *match cut*: the next scene starts on the frame the last one ended on;',
      '  - *continuous*: no cut at all — scenes 3–9 are one camera move through the cutaway, scenes 15–18 one continuous screen;',
      '  - *dissolve*: an ordered-dither dissolve from the last frame of the previous scene (0.4–0.5 s). There are no hard cuts.',
      '- **Captions.** The editor layer (`engine/lib/cap.js`): one caption at a time, top centre (cap-top at y = 300 px of 1920, below the platform\'s top '
      'interface), typed on in about 0.3 s, held to 2.7 s, gone before the last frame of the scene. Small labels sit next to what they name. Nothing is written below '
      'y = 1500 px or in the right-hand control strip. `--notext` renders the clean version; `docs/labels.srt` has every label with its times.',
      '- **Audio.** `mix.wav` under the picture (or `mix_notext.wav` under the clean one). For narration use `mix_vo.wav`, or `music.wav` and `sfx.wav` as '
      'separate tracks. All stems are exactly 63.000 s.', '',
      '| # | In (s) | Out (s) | Scene | Transition in | Camera | Caption | Music |', '|---|---|---|---|---|---|---|---|']
pr = ['# Keyframe and motion prompts (one pair per scene)', '', 'The film is drawn by code, so these are not what made it. They restate each scene for an image or '
      'video model — alternative keyframes, a print storyboard, a pitch — using the brief\'s constraints as the fixed base.', '', '**Image base:** ' + BASE, '',
      '**Motion base:** ' + MOTION, '']
for i, (sid, row) in enumerate(zip(ids, SHOTS)):
    n = i + 1; t0 = i * SC; key = f'S{n:02d}'
    _, span, obj, act, camw, label, how = row[:7]
    x = xin(sid); trans = f'dissolve {x:.2f} s' if x else MATCH.get(sid, 'match cut')
    snd = ', '.join(f"{c['sfx']} @{c['t'] - t0:.3f}".rstrip('0').rstrip('.') for c in by.get(sid, []) if c['sfx'] != 'type')
    a, b, mname, mdesc = music_at(t0)
    small = ', '.join(e['text'] for e in textlog.get(sid, []) if e['kind'] != 'ctx')
    f0, f1 = FRAMES[sid]
    sb += [f'## {key} · {span} · `{sid}`', '', f'- **Picture:** {obj}.', f'- **Action:** {act}.', f'- **Start frame ({t0:.2f} s):** {f0}', f'- **End frame ({t0 + SC:.2f} s):** {f1}',
           f'- **Camera:** {camw} ({CAM.get(camw, camw)}).', f'- **Transition in:** {trans}.', f'- **Caption:** {label}' + (f' · small labels: {small}' if small else '') + ('' if label[-1] in '?.!' and not small else '.'),
           f'- **Motion (from the code):** {header(sid)}', f'- **Sound:** {snd or "—"}.', f'- **Music ({a}–{b} s):** {mname} — {mdesc}.', '']
    tl.append(f'| {n} | {t0:05.2f} | {t0 + SC:05.2f} | `{sid}` | {trans} | {CAM.get(camw, camw)} | {label} | {mname} |')
    pr += [f'## {key} · {span}', '', f'**Keyframe (start):** {BASE} Frame: {f0}', '', f'**Keyframe (end):** {BASE} Frame: {f1}', '',
           f'**Motion:** {MOTION} This scene, 3.0 s: {act}. Camera: {CAM.get(camw, camw)}.', '']
(D / 'storyboard.md').write_text('\n'.join(sb) + '\n')
(D / 'timeline.md').write_text('\n'.join(tl) + '\n\nThe loop: see `loop.md`.\n')
(D / 'prompts.md').write_text('\n'.join(pr) + '\n')
# labels: list, SRT and JSON (film times; every label in the film, with its scene and kind)
labs = []
for i, sid in enumerate(ids):
    for e in textlog.get(sid, []):
        labs.append({'scene': sid, 'kind': 'caption' if e['kind'] == 'ctx' else 'label', 'text': e['text'], 'start': round(i * SC + e['t0'], 3), 'end': round(i * SC + min(SC, (e['t1'] or SC) + 0.25), 3)})
labs.sort(key=lambda l: l['start'])
(D / 'labels.json').write_text(json.dumps(labs, indent=1, ensure_ascii=False) + '\n')
def ts(x): h_ = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h_:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'
(D / 'labels.srt').write_text('\n'.join(f"{k + 1}\n{ts(l['start'])} --> {ts(l['end'])}\n{l['text']}\n" for k, l in enumerate(labs)))
(D / 'labels.md').write_text('# Editable caption and label list\n\nThe labeled version draws these with the film\'s pixel font; the clean version (`--notext`) has none of them. '
                             'The same list is in `labels.srt` (for CapCut, Premiere, DaVinci …) and `labels.json`. Times are film seconds, from the first typed character to '
                             'the end of the fade. The three result values on the instrument\'s screen and printout are picture content, not labels: they stay in the clean '
                             'version (`--nodata` blanks them as well).\n\n| Scene | Kind | Text | Start | End |\n|---|---|---|---|---|\n'
                             + '\n'.join(f"| {l['scene']} | {l['kind']} | {l['text']} | {l['start']:.2f} | {l['end']:.2f} |" for l in labs) + '\n')
# cue sheet
cs = ['# Music and SFX cue sheet', '', 'Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause. The '
      'picture\'s events are themselves placed on the 16th-note grid (0.125 s at 120 BPM), and every tonal effect is tuned to the chord of its bar, so the effects '
      'play as part of the music. The caption-typing ticks (`type`, `label`) are left out of the `*_notext` stems.', '', '## Music', '',
      '120 BPM · one 3-s scene = one bar of six beats · 21 bars, 126 beats · D – A – Bm – G, one chord per scene, five times, then A in scene 21.', '',
      '| From | To | Section | What plays |', '|---|---|---|---|'] + [f'| {a} s | {b} s | {m} | {d} |' for a, b, m, d in MUSIC]
if rep:
    cs += ['', '## Measured levels', '', 'These are measurements of the files `tools/synth_audio.py` wrote, not a listening test.', '',
           f"- **Length.** {rep['duration_s']:.3f} s, {rep['sample_rate']} Hz, 24-bit stereo.",
           f"- **`mix.wav`.** {rep['mix_lufs']} LUFS integrated, true peak {rep['mix_true_peak_db']} dB.",
           f"- **`mix_vo.wav`** (melody pulled back, 300 Hz – 3 kHz thinned). {rep['mix_vo_lufs']} LUFS, true peak {rep['mix_vo_true_peak_db']} dB.",
           f"- **Stems in the mix.** Music {rep['music_lufs']} LUFS, effects {rep['sfx_lufs']} LUFS.",
           f"- **Loop point.** The step from the last sample to the first is {rep['loop_seam_step']} of full scale; ordinary sample-to-sample steps in the last 50 ms reach {rep['loop_seam_local_p99']} (99th percentile), so the seam is no larger than the signal's own motion.",
           '- **Loudness per scene (LKFS):** ' + ', '.join(f'S{k + 1:02d} {v:.0f}' for k, v in enumerate(rep['loudness_per_scene_lkfs'])) + '.']
cs += ['', '## Cues', '', '| Time (s) | Scene | Effect | Gain | Pan | Arg |', '|---|---|---|---|---|---|'] + \
      [f"| {c['t']:.3f} | {c['scene']} | {c['sfx']} | {c['g']} | {c['pan']} | {'' if c['arg'] is None else c['arg']} |" for c in cues['cues']]
(D / 'cue_sheet.md').write_text('\n'.join(cs) + '\n')
# asset consistency guide
(D / 'assets.md').write_text("""# Asset consistency guide

Seven assets are locked for the whole film. Each is one piece of code, so it cannot drift between scenes; the reference
sheets in `docs/sheets/` are drawn by the same code.

| | Asset | Code | Appears in | Locked |
|---|---|---|---|---|
| A | The balloon landscape | `engine/lib/balloon.js` | S01, S02–S05 (inset), S03–S09 (slide), S19, S20, S21 | Coral-and-cream balloon with a zigzag band, basket and four ropes; narrow winding road; muted green fields; two ranges of blue hills; pale sky with four flat clouds. The same procedure draws the full frame, the inset and the slide. |
| B | The patient | `engine/lib/exterior.js`, `engine/lib/eye.js` | S02, S20 (from behind); S03–S09, S19 (profile silhouette) | One calm adult. Back and side only: hair, ear, cheek, shoulder. No face, no expression. Chin on the cup, forehead on the band, right eye on the window's axis. |
| C | The autorefractor | `engine/lib/exterior.js`, `engine/lib/optics.js` | S02, S20 (outside); S03–S09, S19 (cutaway) | Original and unbranded: ivory head and column, graphite base and stage, teal ring round the window, joystick, chinrest posts. No logo, no model name. |
| D | The eye | `engine/lib/eye.js` | S03–S09, S19; simplified in S13 | Millimetres. Cornea radii 7.8 / 6.5, 0.55 thick; pupil 4 mm; lens radii 10.2 / 6.0, 4.0 thick; axial length 24.0. Rays are traced with Snell's law. The eye never deforms; only the lens outline eases slightly flatter in S04. |
| E | The optical diagram | `engine/lib/optics.js` | S03–S09, S19 | Three arms: fixation (up, amber), source (straight back, cyan), receiving (down, magenta). Retinal-return, ring-image architecture. One camera track (`DIAG.track`) carries scenes 3–9. |
| F | The sensor and its ring | `engine/lib/sensor.js` | S09–S12, S15, S16, S18, S19 | 64 × 64 schematic pixels. One ring: semi-axes 18.6 (horizontal) and 15.4 (vertical) pixels against a calibration radius of 21.5. Magenta as light, gold as charge, white and grey as data. |
| G | The result | `engine/lib/result.js` | S16–S19 | SPH −2.00 D · CYL −0.75 D · AXIS 180°, tagged "Example". Defined once (`RES.VALS`) and drawn from there on the screen, the printout and the last cutaway. |

## Colour code

| Element | Colour | Palette keys |
|---|---|---|
| Background | dark navy | `k`, `n0`–`n5` |
| Device | ivory, graphite, restrained teal | `q0`–`q6`, `g0`–`gb`, `t0`–`t4` |
| Visible fixation path | warm amber | `a0`–`a3` |
| Outgoing measurement light | cyan overlay | `c0`–`c5` |
| Returning measurement light | magenta overlay | `m0`–`m4` |
| Sensor charge | pale gold | `y0`–`y4` |
| Digital result | white with mint | `w`, `e0`–`e4` |
| Eye tissues | muted natural tones | `o`, `i`, `l`, `x`, `u`, `r`, `v`, `z` |

Cyan and magenta mark the direction of travel only. The measurement light is near-infrared, the patient does not see it,
and it does not change colour on the way back. The patient-view inset never shows it.

## What must not appear

- No air puff, no OCT, no fundus photograph, no corneal topography.
- No rotating prism and no lenslet grid: the receiving arm ends in a ring lens and one image sensor.
- No physical balloon: it is a picture on a slide.
- No deformation of the eye, and nothing touching it.
- No mirror-like reflection from the retina: a diffuse fan, of which a small part is collected.
- No diopter value attached to a ring size or an angle, and no confidence percentage.
- No claim that fogging switches accommodation off: the lens only eases, and the caption says "Relax focusing".
- No prescription: the printout is "A starting estimate".
- The comparison eyes of S13 and the lens model of S14 are separate models in their own frames, not the patient.
- No brand, logo or model name anywhere.

## Captions

One dominant caption at a time, top centre, in the film's own bitmap font (`engine/lib/pix.js`), drawn by the editor
layer (`engine/lib/cap.js`) and absent from the clean version. Every string is in `labels.srt`, so it can be replaced or
translated in an editor without touching the picture.
""")
# loop specification
(D / 'loop.md').write_text(f"""# Loop specification

The film is {TOTAL:.0f} s long and is built to restart without a visible or audible seam.

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
""")
print('docs ->', sorted(p.name for p in D.iterdir()))
