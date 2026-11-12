#!/usr/bin/env python3
"""Build the production package from the film's own sources, so the documents cannot drift from the film:
镜头表.md (shot list), the scene files' header comments, build/cues.json and build/textlog.json (render.py --cues) and
build/audio_report.json (synth_audio.py). Writes docs/: storyboard.md, timeline.md, prompts.md (keyframe, motion and SFX
prompts per scene), labels.md / .srt / .json, cue_sheet.md, rationale.md, mechanism.md, assets.md, loop.md.

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
FPS = 30
def table(md, first):
    rows, on = [], False
    for ln in md.splitlines():
        if ln.startswith('| ' + first): on = True; continue
        if on and ln.startswith('|---'): continue
        if on and ln.startswith('|'): rows.append([c.strip() for c in ln.strip().strip('|').split('|')])
        elif on: break
    return rows
SHOTS = table(shot, '场 | 时间段')
CAM = {'停': 'hold', '缓推': 'slow push', '拉远': 'pull out', '横移': 'track / pan', '快推': 'fast push (accent)', '切': 'cut'}
SCN = cues['scenes']; ids = [s['id'] for s in SCN]; TOTAL = cues['total']
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
FRAMES = {
 's01_still': ('The opening composition, no caption: the arrested heart centred in the open chest; the venous line (burgundy) leaving the right atrium to the left, the arterial line (red) arching in from the right to the ascending aorta above the cross-clamp; gloved hands with forceps at both edges; teal drapes.', 'The same composition 6 % closer; "During heart surgery" fading; both hands at rest.'),
 's02_moving': ('As the end of S01.', 'Closer on the venous line where it leaves the right atrium: a short see-through stretch with red cells and a flow arrow; the still heart behind it; "What keeps blood moving?" fading.'),
 's03_follow': ('As the end of S02.', 'The venous line over the drapes reaching the top of the machine, a bright marker riding it.'),
 's04_machine': ('The venous line entering the reservoir, close.', 'A three-quarter view of the console with the perfusionist at the left edge: reservoir, pump, oxygenator assembly, the lines; the return line lit; "Heart–lung machine" fading.'),
 's05_drain': ('The console.', 'The venous side as a diagram: the body outline over the drapes, the great veins into the right atrium, the venous line, the reservoir below the dashed heart level.'),
 's06_reservoir': ('The diagram.', 'The reservoir close and see-through: inlet tube, filter sock, steady level, submerged outlet, level sensor; "Reservoir" fading.'),
 's07_pump': ('The reservoir outlet.', 'The pump head in cutaway on its drive: blood in at the centre, red cells spiralling out to the side outlet, magnets in the drive; "Blood is pumped" fading.'),
 's08_temp': ('The pump (dissolving).', 'The heat-exchanger schematic: water channel above, solid finned wall, blood channel below, heat arrows crossing the wall; the location inset; "Temperature control" fading.'),
 's09_oxygenator': ('The schematic (dissolving to the assembly).', 'One hollow fibre across the whole frame, picked out from its neighbours, blood between the fibres.'),
 's10_fiber': ('The fibre in side view (dissolving).', 'The fibre end-on: the membrane ring, gas with oxygen inside, red cells streaming round it outside; labels Gas and Blood fading.'),
 's11_diffuse': ('The cross-section (dissolving).', 'The fibre wall magnified: many oxygen molecules on the gas side, fewer on the blood side; the followed molecule out in the plasma; "Oxygen diffuses in" fading.'),
 's12_rbc': ('The followed molecule in the plasma.', 'Inside the red cell: the membrane a see-through rim, hemoglobin molecules all round, the followed oxygen near one of them; "Into the red blood cell" fading.'),
 's13_hemoglobin': ('A small hemoglobin molecule in the middle of the frame.', 'The whole molecule: four subunits, four hemes, two carrying oxygen; "Hemoglobin carries oxygen" fading.'),
 's14_co2': ('The fibre wall again (match cut), CO₂ on the blood side.', 'The oxygenator assembly from close, its outlet at the top; the fibre bundle fading out.'),
 's15_filter': ('The assembly outlet.', 'The bubble detector on the arterial line, its light on; "Filter + monitoring" fading.'),
 's16_aorta': ('The detector.', 'The ascending aorta close: the arterial cannula above the cross-clamp, red chevrons round the arch and up its branches; "Back to the body" fading.'),
 's17_tissue': ('The aorta (dissolving).', 'A capillary with red cells in single file; oxygen molecules in the tissue; the tissue cells slightly warmer in colour; "Oxygen delivered" fading.'),
 's18_perfusionist': ('The capillary (dissolving).', 'The perfusionist at the console, the monitor inset with four steady traces; "Continuously monitored" fading.'),
 's19_system': ('The perfusionist, pulling back.', 'The whole circuit, starting to move up toward the return line; the recap fading.'),
 's20_return': ('The whole circuit.', 'The opening composition, identical to frame 0.'),
}
MATCH = {'s01_still': 'the loop: frame 0 equals the last frame', 's02_moving': 'continuous (one camera)', 's03_follow': 'continuous', 's04_machine': 'continuous', 's05_drain': 'continuous',
         's06_reservoir': 'continuous', 's07_pump': 'continuous', 
         's15_filter': 'continuous', 's16_aorta': 'continuous', 's19_system': 'continuous', 's20_return': 'continuous'}
MUSIC = [(0, 6, 'question', 'bars 0–2: a suspended G chord, no drums; at 2.25 s a rising fourth that does not resolve'),
         (6, 19, 'the machine', 'bar 3: the question resolves to C at 6.0 s; a light pulse, the marimba hook, off-beat bass'),
         (19, 30, 'its parts', 'the groove: four-on-the-floor, claps, hats, arpeggio; the hook answers itself every four bars'),
         (30, 38, 'the microscopic world', 'the kick falls away (30 s), then a quieter space inside the red cell (34 s), a riser and a held breath (37.75–38.0 s)'),
         (38, 46, 'the binding', 'bar 19 at 38.0 s, the downbeat of a cycle: the full groove, the hook doubled by a lead'),
         (46, 56, 'the way back', 'lighter; no kick while the heart is on screen (50–52 s); a small payoff at 54.0 s'),
         (56, 62, 'the team and the recap', 'thinning, no kick; three related tones on the recap'),
         (62, 68, 'the opening again', 'bars 31–33: the suspended G chord, the same balance as bar 0, continuing across the seam')]
music_at = lambda t: next(m for m in MUSIC if m[0] <= t < m[1])
BASE = ("Premium original pixel-art medical illustration with voxel-inspired 3D depth, vertical 9:16, deep navy background. A 2D pixel "
        "model lit like a 3D object: one light from the top left, hue-shifted colour ramps, flat colour bands with dither only where two "
        "bands meet, a lighter rim on lit edges and a darker edge on shaded ones, no black outlines. An adult on cardiopulmonary bypass "
        "during heart surgery: the arrested heart in an anterior-oblique educational cutaway, a venous cannula in the right atrium, an "
        "arterial cannula in the distal ascending aorta above an aortic cross-clamp, a thin subdued cardioplegia line; surgeons only as "
        "teal-gowned arms and light neutral gloves at the frame edges; one heart–lung machine (hard-shell reservoir, centrifugal pump, "
        "integrated heat exchanger / hollow-fibre oxygenator / arterial filter, clamp-on bubble detector, separate gas and water lines). "
        "Venous blood dark burgundy, oxygenated blood brighter red, never blue. O₂ cyan paired spheres, CO₂ amber three-atom symbols, "
        "hemoglobin lavender, heme gold with an iron centre. No embedded text, no logos, no faces, no gore, no heavy bloom, no toy-like organs.")
MOTION = ("Animate only the stated action. The heart never moves. Blood moves continuously and never pulses. Every tube keeps its route "
          "and attachment points. The centrifugal pump stays a smooth-rotor centrifugal pump. Gas, water and blood stay in separate "
          "channels. Red cells never cross the oxygenator membrane. Moving markers show direction only. One eased camera move per scene; "
          "scale changes are visible zooms. No shake, no flicker, no morphing, no new parts.")
SFX = {
 's01_still': 'A low, steady operating-room equipment hum (tuned to G) begins at frame 0 together with a soft room tone and a quiet, continuous, filtered blood-flow texture. At 0.3 s the left surgeon\'s gown makes a faint fabric movement. At 1.0 s a small, restrained metal contact as the right hand lifts its forceps. Under it, the score holds a soft suspended G chord. No heartbeat, no monitor beep, no alarm.',
 's02_moving': 'The blood-flow layer comes forward: a soft, filtered, continuous fluid texture, never pulsing, never splashing. A faint glassy shimmer as the tube wall becomes see-through (2.35 s). At 2.25 s the score asks its question: a soft bell rising a fourth (D → G) that does not resolve.',
 's03_follow': 'The same flow texture travels with the camera. A short, soft camera sweep. The machine\'s low motor hum fades in gradually as the line approaches the console; a quiet shaker builds toward the reveal.',
 's04_machine': 'At 6.0 s the score resolves the question onto C with a restrained bell chord — the reveal. The console hum and the pump\'s smooth tone sit low in the mix (the machine was already running: no power-on). A soft rising tone accompanies the outgoing path lighting up (6.7 s), a second one the returning path (7.85 s). A light pulse begins.',
 's05_drain': 'A quiet, steady fluid movement panned gently toward the reservoir (left). One soft tick as the height marker draws. No suction roar.',
 's06_reservoir': 'A soft enclosed-fluid texture as the camera arrives (low-passed, still). The console ambience continues. One quiet editorial tick as the level sensor\'s light glows (13.75 s). No low-level alarm, no splashing.',
 's07_pump': 'The pump\'s rotational tone comes forward: smooth, stable, slightly chorused, at one constant pitch — it does not speed up as the camera moves closer. A faint glassy shimmer as the housing turns see-through. The flow layer follows the visible spiral.',
 's08_temp': 'A subtle, smooth water-circuit texture in its own channel (no bubbling). Two small tonal glides accompany the heat arrows crossing the wall (19.6 s, 20.6 s). No boiling, steam or freezing sounds.',
 's09_oxygenator': 'A subtle reveal shimmer (a few soft glass notes) as the housing turns see-through. A very quiet, airy gas texture begins: the separate gas circuit, never bubbles in the blood. A soft blip as one fibre is picked out, then a gentle push.',
 's10_fiber': 'Two restrained textures: an airy layer for the gas compartment (left of centre) and a softer, low fluid layer for the blood (right), still clear in mono. Two tiny ticks as the labels appear.',
 's11_diffuse': 'A delicate tonal cue marks the change of scale (29.0 s). Soft granular motion — tiny tuned pops — for the molecules. Two soft marimba contacts as the followed molecule enters and leaves the membrane. No valve click, no door.',
 's12_rbc': 'The molecular texture continues, then the sound space becomes quieter and closer as the camera enters the cell: the music falls to a pad. A soft glassy tone as the molecule passes the membrane (34.9 s). No puncture, tearing or impact.',
 's13_hemoglobin': 'A soft whoosh into the molecule. At 38.0 s, on the downbeat, a delicate, satisfying contact tone (bell, marimba and glass on the chord) as oxygen binds, followed by a soft resolving harmonic layer while the full groove returns. Four tiny tuned ticks as the four sites glint; a smaller contact as a second site binds. No metallic hammer, no lock-clamp sound.',
 's14_co2': 'A soft swish for the match cut. Quiet granular motion. A restrained outward airy sweep as CO₂ leaves with the gas (44.3 s). The blood-flow layer continues underneath. A soft pull-back whoosh. No exhaust blast.',
 's15_filter': 'Soft flow continues. Two quiet editorial ticks, one for the filter highlight (46.25 s) and one for the detector (47.75 s). No emergency alarm, no arcade success chime.',
 's16_aorta': 'The flow texture broadens and climbs with the camera. A soft bell as the view arrives at the aorta. The music starts to resolve the journey; no kick while the heart is on screen.',
 's17_tissue': 'A soft whoosh into the capillary. Gentle, dispersing tuned tones as oxygen leaves the cells and spreads into the tissue. A small musical payoff on the downbeat at 54.0 s. No electric shock, no power-up.',
 's18_perfusionist': 'The operating-room ambience returns (hum, room tone, the console). A tiny interface blip only as the monitor inset appears. No rhythmic ECG beep.',
 's19_system': 'Three related soft tones (C, E, G on bell and marimba) exactly as the pump, the oxygenator and the return line light (59.75, 60.5, 61.25 s). The flow continues under them without a break.',
 's20_return': 'A soft glide as the camera follows the line back up. The balance returns to the opening: equipment hum, soft flow, room tone. The score settles on the opening suspended chord and continues across the loop seam without a gap.',
}
sb = [f'# Storyboard — {len(ids)} scenes, {TOTAL:.0f} s at {FPS} fps', '', 'Generated by `tools/make_docs.py` from `镜头表.md`, the scene files and the cue sheet. "Motion" is the header comment of the scene\'s own file, i.e. what the code animates. The start and end frames of every scene are in `storyboard_frames.png` (left to right, top to bottom: S01 start, S01 end, S02 start, …).', '']
tl = [f'# Editing timeline (exactly {TOTAL:.3f} s, {int(TOTAL * FPS)} frames at {FPS} fps)', '',
      'The engine assembles the film in one pass (`engine/film.js`). Every transition is inside its scene\'s time, as the brief requires:', '',
      '- **continuous**: one camera move carries straight on (scenes 1–7, 15–16, 19–20);',
      '- **dissolve**: an ordered-dither dissolve from the previous scene\'s last frame (0.12–0.5 s), used at every change of scale (8–14, 17, 18);',
      '- no hard cuts and no added transition time.', '',
      '- **Captions.** One at a time, top centre (art rows 60–124 of 480; nothing below row 452, nothing in the right-hand button strip). `--notext` renders the clean version; `labels.srt` has every caption with its times.',
      '- **Audio.** `mix.wav` under the labeled picture, `mix_notext.wav` under the clean one; `mix_vo.wav` (or `music.wav` + `sfx.wav`) under a voice-over. All are exactly 68.000 s.', '',
      '| # | In (s) | Out (s) | Frames | Scene | Transition in | Camera | Caption | Music |', '|---|---|---|---|---|---|---|---|---|']
pr = ['# Keyframe, motion and SFX prompts (one set per scene)', '', 'The film is drawn by code, so these are not what made it. They restate each scene for an image or video model or a sound designer (alternative keyframes, a print storyboard, a re-score), using the brief\'s constraints as the fixed base.', '', '**Image base:** ' + BASE, '', '**Motion base:** ' + MOTION, '']
for i, (sc, row) in enumerate(zip(SCN, SHOTS)):
    sid, t0, t1 = sc['id'], sc['t0'], sc['t1']; n = i + 1; key = f'S{n:02d}'
    _, span, obj, act, camw, label, how = row[:7]
    x = xin(sid); trans = f'dissolve {x:.2f} s' if x else MATCH.get(sid, 'continuous')
    snd = ', '.join(f"{c['sfx']} @{c['t'] - t0:.3f}".rstrip('0').rstrip('.') for c in by.get(sid, []))
    a, b, mname, mdesc = music_at(t0)
    small = ', '.join(e['text'] for e in textlog.get(sid, []) if e['kind'] != 'ctx')
    f0, f1 = FRAMES[sid]
    sb += [f'## {key} · {span} · `{sid}` · {t1 - t0:.0f} s', '', f'- **Picture:** {obj}.', f'- **Action:** {act}.', f'- **Start frame ({t0:.2f} s, frame {int(t0 * FPS)}):** {f0}', f'- **End frame ({t1:.2f} s, frame {int(t1 * FPS) - 1}):** {f1}',
           f'- **Camera:** {camw} ({CAM.get(camw, camw)}).', f'- **Transition in:** {trans}.', f'- **Caption:** {label}' + (f' · small labels: {small}' if small else '') + '.',
           f'- **Motion (from the code):** {header(sid)}', f'- **Sound cues:** {snd or "—"}.', f'- **Music ({a}–{b} s, {mname}):** {mdesc}.', '']
    tl.append(f'| {n} | {t0:05.2f} | {t1:05.2f} | {int(t0 * FPS)}–{int(t1 * FPS) - 1} | `{sid}` | {trans} | {CAM.get(camw, camw)} | {label} | {mname} |')
    pr += [f'## {key} · {span}', '', f'**Keyframe (start):** {BASE} Frame: {f0}', '', f'**Keyframe (end):** {BASE} Frame: {f1}', '',
           f'**Motion ({t1 - t0:.0f} s):** {MOTION} This scene: {act}. Camera: {CAM.get(camw, camw)}.', '', f'**SFX:** {SFX[sid]}', '']
(D / 'storyboard.md').write_text('\n'.join(sb) + '\n')
(D / 'timeline.md').write_text('\n'.join(tl) + '\n\nMusic grid: 120 BPM in 4/4, a bar every 2 s, 34 bars. The loop: see `loop.md`.\n')
(D / 'prompts.md').write_text('\n'.join(pr) + '\n')
# labels
labs = []
for sc in SCN:
    for e in textlog.get(sc['id'], []):
        dur = sc['t1'] - sc['t0']
        labs.append({'scene': sc['id'], 'kind': 'caption' if e['kind'] == 'ctx' else 'label', 'text': e['text'], 'start': round(sc['t0'] + e['t0'], 3), 'end': round(sc['t0'] + min(dur, (e['t1'] if e['t1'] is not None else dur) + 0.25), 3)})
labs.sort(key=lambda l: (l['start'], l['text']))
(D / 'labels.json').write_text(json.dumps(labs, indent=1, ensure_ascii=False) + '\n')
def ts(x): h_ = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h_:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'
(D / 'labels.srt').write_text('\n'.join(f"{k + 1}\n{ts(l['start'])} --> {ts(l['end'])}\n{l['text']}\n" for k, l in enumerate(labs)))
(D / 'labels.md').write_text('# Editable captions and labels\n\nThe labeled version draws these in the film\'s pixel font; the clean version (`--notext`) has none of them. The same list is in `labels.srt` (CapCut, Premiere, DaVinci …) and `labels.json`. Times are film seconds, from the first typed character to the end of the fade. The monitor\'s own words in S18 (FLOW, PRESSURE, TEMP, OXYGEN) are part of the inset and are also hidden in the clean version.\n\n| Scene | Kind | Text | Start | End |\n|---|---|---|---|---|\n'
                             + '\n'.join(f"| {l['scene']} | {l['kind']} | {l['text']} | {l['start']:.2f} | {l['end']:.2f} |" for l in labs) + '\n')
# cue sheet
cs = ['# Audio cue sheet', '', 'Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause; tonal effects are tuned to the chord of the moment. Under them runs a continuous sound environment (operating-room hum, machine hum, blood flow, pump, gas, water), mixed per scene and crossfaded over 0.6 s across every cut.', '',
      '## Music', '', '120 BPM, 4/4, 34 bars. Bars 0–2 and 31–33: a suspended G (the question). Bars 3–30: C – Am – F – G, one chord per bar, seven times; cycles start at 6, 14, 22, 30, 38, 46 and 54 s.', '',
      '| From | To | Section | What plays |', '|---|---|---|---|'] + [f'| {a} s | {b} s | {m} | {d} |' for a, b, m, d in MUSIC]
cs += ['', '## Beds (continuous)', '', '| Bed | Sound | Where it is forward |', '|---|---|---|',
       '| Operating-room hum | 49 Hz with harmonics (G), room tone | the operating field, the perfusionist, the ending |',
       '| Machine hum | a soft motor tone at 147 Hz (D), slowly beating | at the console |',
       '| Blood flow | filtered noise, continuous, only very slow drift | S02 (forward), S05–S06, S16 (broader) |',
       '| Pump | a smooth stable tone at 196 Hz (G) with a band of air | S07 |',
       '| Gas | airy high noise | S09–S11, S14 (panned to the gas side in S10) |',
       '| Water | a smooth mid-low stream | S08 |']
if rep:
    cs += ['', '## Measured levels', '', 'Measurements of the files `tools/synth_audio.py` wrote, not a listening test.', '',
           f"- **Length.** {rep['duration_s']:.3f} s, {rep['sample_rate']} Hz, 24-bit stereo.",
           f"- **`mix.wav`.** {rep['mix_lufs']} LUFS integrated, true peak {rep['mix_true_peak_db']} dB.",
           f"- **`mix_vo.wav`.** {rep['mix_vo_lufs']} LUFS, true peak {rep['mix_vo_true_peak_db']} dB (melody pulled back, 300 Hz – 3 kHz thinned).",
           f"- **Stems in the mix.** Music {rep['music_lufs']} LUFS, sound {rep['sfx_lufs']} LUFS.",
           f"- **Loop point.** The step from the last sample to the first is {rep['loop_seam_step']} of full scale; ordinary sample-to-sample steps in the last 50 ms reach {rep['loop_seam_local_p99']} (99th percentile).",
           '- **Loudness per scene (LKFS):** ' + ', '.join(f'S{k + 1:02d} {v:.0f}' for k, v in enumerate(rep['loudness_per_scene_lkfs'])) + '.']
cs += ['', '## Cues', '', '| Time (s) | Scene | Effect | Gain | Pan | Arg |', '|---|---|---|---|---|---|'] + [f"| {c['t']:.3f} | {c['scene']} | {c['sfx']} | {c['g']} | {c['pan']} | {'' if c['arg'] is None else c['arg']} |" for c in cues['cues']]
(D / 'cue_sheet.md').write_text('\n'.join(cs) + '\n')
# director's rationale, kept apart from the medical facts (mechanism.md)
(D / 'rationale.md').write_text("""# Director's rationale and simplification notes

## The intended experience

The first frame shows a contradiction that needs no words: a motionless heart, surgeons' hands at work, and blood visibly
moving through two connected tubes. The question appears at 2 s and the answer, a machine, at 6 s. From there the film follows
one continuous route: down the venous line, through each part of the machine, then down in scale (fibre, membrane, red cell,
hemoglobin). It comes back out along the arterial line to the aorta and the tissue, and ends on the opening frame, which the
viewer now understands.

## Creative decisions

- **The patient and the heart come first**, so the machine has a purpose before it appears.
- **The surgeons stay at the edges** (gowned arms and gloved hands), setting the scene without competing with the heart and the tubing.
- **The answer comes early (6 s)**, then curiosity moves to how it works inside.
- **One locked circuit.** Venous blood (burgundy) runs down the viewer's left, through the machine left to right along the bottom,
  and returns (red) up the right. The same routes are drawn in every scene, so the viewer never has to re-learn the space.
- **Most time goes to gas exchange (25–46 s).** The oxygen binding at 38.0 s is the visual and musical peak.
- **The ending returns to the opening frame**, pixel for pixel, so the video loops.
- **Look.** 2D pixel models lit like 3D objects (one light, hue-shifted ramps, dither only at band edges), drawn at 270×480 and
  scaled exactly 4× with nearest neighbour, so the pixels read clearly at 1080×1920.
- **No reference images were supplied.** Following the codixel skill, the organic subjects (the heart, the people) are drawn in
  code and kept simple; the people never show a face.

## Assumptions (the chosen scenario)

- An adult, conventional cardiopulmonary bypass, already established from frame one; the patient anesthetized and anticoagulated, the circuit primed.
- An arrested-heart operation: the heart stopped with cardioplegia and the ascending aorta cross-clamped. This is the chosen scenario, not a requirement of all cardiac surgery.
- Gravity venous drainage through one cannula in the right atrium into a hard-shell reservoir below the patient.
- A centrifugal pump; an integrated assembly of heat exchanger, hollow-fibre oxygenator (gas inside the fibres, blood outside) and arterial filter; a clamp-on bubble detector on the arterial line.
- Arterial return into the distal ascending aorta, on the systemic side of the clamp; cardioplegia delivered to the aortic root, below the clamp.

## Simplifications

- **One reference layout.** Real component arrangements vary.
- **Schematic scale.** The fibre, the membrane, the red cell and the hemoglobin molecule are shown at magnifications that differ by orders of magnitude; every change of scale is a visible zoom.
- **Teaching colours.** O₂ cyan, CO₂ amber, hemoglobin lavender, heme gold, water blue are conventions, not real colours.
- **Cutaways.** The see-through tube, reservoir, pump and housing are educational.
- **The heat exchanger** is shown as two straight channels and a wall; real ones are bundles of fine tubes.
- **CO₂** is shown only as dissolved CO₂ crossing the membrane; how blood carries CO₂ is not shown.
- **The monitor** shows labelled, steady traces with no numbers, so no targets or settings are implied.
- **Accessory lines** (vents, suction, pressure lines) are left out. Cardioplegia is a thin, subdued line.
- **Nothing procedural.** There are no doses, settings, targets, or steps of cannulation or machine operation.

## Hypotheses (to test, not claims)

- The contradiction at frame 0 and the early answer at 6 s should hold viewers past the first seconds.
- The molecular payoff at 38 s should be the most remembered moment.
- The pixel-identical loop should earn replays.

These are retention bets to measure on the platform; none of them guarantees reach.
""")
# source-to-mechanism reference, with the brief's accuracy checks
(D / 'mechanism.md').write_text("""# Source-to-mechanism reference

What each mechanism in the film shows, the medical fact it rests on, and what was simplified. The facts are standard
textbook knowledge of cardiopulmonary bypass and respiratory physiology; have them reviewed by a perfusionist or cardiac
anaesthetist before publication. Creative choices and hypotheses are in `rationale.md`, not here.

| Scene | What the film shows | Fact it rests on | Simplification |
|---|---|---|---|
| S01–S02 | A still heart; blood moving in the tubes | During arrested-heart surgery with CPB, the heart is stopped with cardioplegia while the pump maintains systemic flow | Bypass is already running from frame one |
| S04 | The console and a perfusionist | CPB is run by a perfusionist with the surgical and anaesthesia team | One console, one operator shown |
| S05 | Blood drains from the right atrium to a reservoir below the patient | Gravity (siphon) venous drainage needs the reservoir below the heart | The body outline and great veins are schematic |
| S06 | A hard-shell reservoir with a steady level and a submerged outlet | The reservoir holds a working volume; the outlet stays under the surface; level sensing guards against air | Inner geometry simplified |
| S07 | A centrifugal pump: central inlet, smooth rotor, peripheral outlet, magnetic drive | Centrifugal pumps add energy by rotation (a forced vortex) and are driven magnetically through the housing | Cells shown intact and large; rotor vanes simplified |
| S08 | Water and blood in separate channels with heat crossing a solid wall | The heat exchanger transfers heat through a wall; water and blood never mix | Two straight channels instead of a tube bundle |
| S09–S10 | Hollow fibres; gas inside, blood outside | In the common hollow-fibre design the sweep gas flows inside the fibres and blood flows around them | One fibre in cross-section, enlarged |
| S11 | O₂ crosses the intact membrane by diffusion, with a net flux toward the blood | Diffusion follows the partial-pressure gradient; no cells cross; no gas bubbles form in the blood | Molecules drawn huge and few; random motion stylized |
| S12 | O₂ enters a red cell through its membrane | O₂ diffuses through plasma and the red-cell membrane | No hole or channel is shown |
| S13 | O₂ binds reversibly to the iron of a heme; four subunits, four sites; the protein shifts slightly | Hemoglobin is a tetramer (2 α, 2 β); each heme iron binds one O₂ reversibly; binding changes the protein's conformation | Shape change stylized; two of four sites filled |
| S14 | CO₂ crosses from the blood into the gas and is swept away | CO₂ is removed across the same membrane into the sweep gas | Only dissolved CO₂ shown; carriage on hemoglobin and as bicarbonate not shown |
| S15 | An arterial filter in the assembly; a separate clamp-on bubble detector | Integrated arterial filters trap particles and bubbles; ultrasonic detectors monitor the line, they do not remove anything | No air event is staged |
| S16 | Oxygenated blood returns through a cannula in the ascending aorta above the cross-clamp | The arterial cannula must be on the systemic side of the clamp to perfuse the body | Arch branches drawn short |
| S17 | O₂ leaves hemoglobin, crosses the capillary wall and reaches tissue; cells stay in the vessel | Systemic O₂ unloading by diffusion down the gradient; not all O₂ is released | The tissue response is a restrained colour change |
| S18 | Flow, pressure, temperature and oxygenation are watched continuously | These are monitored throughout CPB | No values or targets shown; monitoring does not mean complications are impossible |

## The brief's accuracy checks

| Check | How the film meets it |
|---|---|
| Bypass established in the opening | Blood moves in both connected lines from frame 0 (S01) |
| Arrested heart is the chosen scenario | Stated in `rationale.md`; no claim that all cardiac surgery needs it |
| Venous and arterial connections consistent | One route per tube, defined once in `engine/lib/world.js` and drawn in every scene |
| Arterial return perfuses the body despite the clamp | The cannula enters the ascending aorta above the clamp (S16, `docs/sheets/heart.png`) |
| Circuit fluid-filled and prepared | Every tube and component is filled with blood from frame 0 |
| Reservoir outlet submerged | The outlet is below the constant working level (`MACHINE.LEVEL`) in every frame |
| Centrifugal pump throughout | The same smooth-rotor head in every scene |
| Pump does not shred red cells | Cells ride the flow intact; no blades |
| Water, blood and gas separate | Separate lines and channels in every view (S08, S10) |
| Gas inside, blood outside the fibres | S09–S11 |
| O₂ crosses by diffusion | Random walks with a net flux down the gradient (S11) |
| Red cells do not cross the membrane | Cells stay on the blood side (S10, S11) |
| O₂ binds reversibly | Binding at the iron with a two-way arrow (S13) |
| CO₂ leaves through the gas pathway | S14 |
| Blood stays red / burgundy | Venous burgundy and oxygenated red ramps only; never blue |
| Bubble detector is not a filter | It only lights; nothing is removed (S15) |
| Monitoring is not a guarantee | No claim on screen; noted here |
| No emergency or defibrillation scene | None |
| No heartbeat over the arrested heart | No heartbeat sound at any point; no kick drum while the heart is on screen |
""")
(D / 'assets.md').write_text("""# Asset and continuity guide

Every asset is one piece of code, so it cannot drift between scenes. The reference sheets in `docs/sheets/` are drawn by the same code.

| Asset | Code | Locked |
|---|---|---|
| The circuit layout | `engine/lib/world.js` (`WORLD.LY`, `WORLD.R`) | Positions of every component and the route of every tube; the order of points is the direction of flow |
| The operative field and the heart | `engine/lib/heart.js` | Anterior view; the heart never moves; cannula above the clamp, cardioplegia below it; three arch branches |
| The team | `engine/lib/people.js` | Surgeons: arms and gloved hands at the frame edges; the perfusionist from behind; no faces |
| The machine | `engine/lib/machine.js` | Reservoir (constant level, submerged outlet), centrifugal pump, integrated HX / oxygenator / filter, detector, monitor |
| The microscopic models | `engine/lib/micro.js` | O₂ pair, CO₂ triad, red cell (biconcave), hemoglobin (2 α + 2 β, four hemes), heme with iron |
| The look | `engine/lib/lit.js`, `engine/lib/pix.js` | One light from the top left; hue-shifted ramps; dither only at band edges; 270×480 drawn, 4× nearest-neighbour |

## Tubing rules

- **Venous line.** From the right atrium down the viewer's left to the reservoir inlet. Burgundy, 11 units wide.
- **Machine path.** Reservoir outlet → pump inlet (top) → pump outlet (side) → assembly inlet (bottom). Burgundy.
- **Arterial line.** Assembly outlet (top) → bubble detector → up the viewer's right → the aortic cannula. Red, 9 units wide.
- **Cardioplegia.** Thin (3 units) and subdued, beside the arterial line, ending at the aortic root.
- **Gas and water.**
  - Gas (pale cyan) runs from the blender to the assembly's gas inlet, and leaves at its gas outlet.
  - Water (blue) runs between the heater–cooler and the assembly's water ports.
- **Flow.** Markers move at one constant speed; the pattern repeats every 0.5 s (blood) or 1 s (gas, water), so it is identical at 0 and 68 s.

## What must not appear

- **The heart.** No heartbeat, no heart motion, and no heart restarting.
- **Alarms and emergencies.**
  - No alarm, no flatline, and no rhythmic monitor beep.
  - No emergency, defibrillation or crisis scene.
- **Blood colour.** No blue blood.
- **Blood and the circuit.**
  - No bubbles in the blood.
  - No blades in the pump.
  - No mixing of water, gas and blood.
  - No cells crossing the membrane.
  - No hole punched into a cell.
  - No tube changing its attachment.
- **Molecules.** No O₂ split into atoms, and no rusting iron.
- **Clinical numbers.** No numbers on the monitor; no doses, settings or targets.
""")
(D / 'loop.md').write_text(f"""# Loop specification

## Picture

- **Same state at both ends.** S20 ends on `WORLD.CAM0`, the opening camera, with both hands at rest. The flow markers are in
  the same phase, since the pattern repeats every 0.5 s and 68 s is a whole number of repeats.
- **Measured.** The state at 68.0 s differs from frame 0 by 2 art pixels, from rounding. A normal step from one frame to the
  next changes about 490 art pixels, so the seam is an ordinary frame step.
  `tools/render.py --stills 0,67.9999` writes both frames; `docs/frame_open.png`, `docs/frame_close.png` and
  `docs/loop_compare.png` show them.
- **No text at the seam.** The recap fades by 62.65 s and S20 has none. "During heart surgery" types in 0.2 s after the restart.
- **Camera.** It eases into the opening view and S01 starts from rest, so speed is continuous across the seam.

## Sound

- **Bars.** 34 bars at 120 BPM in 4/4 = exactly 68.000 s.
- **Harmony.** Bars 31–33 hold the opening suspended G chord, and bar 0 continues it.
- **Beds.** The hum, flow, pump, gas and water beds are exactly periodic in 68 s: tones with whole cycles in the loop, and noise
  filtered in the frequency domain of the whole loop. Their level automation is smoothed circularly, so the seam is treated like
  any other moment.
- **Tails.** Reverb and echo that ring past 68 s are folded onto the start.
- **Measured.** {('The step from the last sample to the first is ' + str(rep['loop_seam_step']) + ' of full scale, against ' + str(rep['loop_seam_local_p99']) + ' for ordinary steps near the end.') if rep else 'see cue_sheet.md.'}

## Export

- Render once; the platforms that loop restart on frame 0.
- For a longer upload, join copies end to end with no gap.
- Add no fade-in or fade-out to the picture or the sound.
""")
print('docs ->', sorted(p.name for p in D.iterdir()))
