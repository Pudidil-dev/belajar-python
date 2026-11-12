#!/usr/bin/env python3
"""Build the production package from the film's own sources, so the documents cannot drift from the film:
镜头表.md (shot list), the scene files' header comments, build/cues.json and build/textlog.json (render.py --cues) and
build/audio_report.json (synth_audio.py), and build/loop_check.json (the loop measurement, optional). Writes docs/: storyboard.md, timeline.md, prompts.md (keyframe, motion and SFX
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
 's01_still': ('The opening composition, the title typing in: the arrested heart centred in the open chest; the venous line (burgundy) leaving the right atrium to the left, the arterial line (red) arching in from the right to the ascending aorta above the cross-clamp; gloved hands with forceps at both edges; teal drapes.', 'The same composition 6 % closer; "DURING HEART SURGERY" and its first context line on screen; both hands at rest.'),
 's02_moving': ('As the end of S01.', 'Closer on the venous line where it leaves the right atrium: a see-through stretch with red cells in steady files; labels RED BLOOD CELLS and VENOUS LINE; the heart still behind.'),
 's03_follow': ('As the end of S02.', 'The venous line running off the end of the table into darkness, a bright marker on it, the label TO THE MACHINE riding with it.'),
 's04_machine': ('The view from above folding flat to a line across the middle of the frame.', 'The whole set-up from the side: the patient on the table with the heart in a round cutaway window, the machine on the floor below; the outgoing and the returning line lit in turn and labelled; the title HEART–LUNG MACHINE.'),
 's05_workflow': ('The whole circuit from the side; a bright drop leaving the right atrium.', 'The drop back in the aorta; seven numbered badges on the diagram (1 DRAIN … 7 RETURN); the camera pushing into the chest window.'),
 's06_drain': ('The chest window close: the right atrium and the venous cannula, labelled.', 'The top of the reservoir; two dashed levels (heart, reservoir) with an arrow between them and the label GRAVITY.'),
 's07_reservoir': ('The reservoir cap and its two inlets.', 'The reservoir close up: particles running down through the filter into the pool and out of the submerged outlet; six parts labelled; the level sensor lit once.'),
 's08_pump': ('The line from the reservoir outlet descending to the pump.', 'The pump head and drive cut open: motor, magnets, rotor and red cells spiralling out of the side outlet; five parts labelled; the strip IN → SPIN → OUT lit.'),
 's09_heater': ('The pump; the camera starting to move right.', 'The heater–cooler cut open (water tank, heater coil, cooling coil, water pump) and its two water lines lit up to the heat exchanger.'),
 's10_exchanger': ('A dissolve into the heat-exchanger cutaway.', 'Water and blood channels with the solid wall between, heat arrows crossing it; the location inset; four labels.'),
 's11_gas': ('A dissolve to the gas blender close up, the oxygen and air hoses lit.', 'The gas line into the oxygenator lit, used gas puffing from the exhaust; six labels.'),
 's12_oxygenator': ('The oxygenator from the side, its ports labelled.', 'One hollow fibre across the whole frame, picked out in white among the others.'),
 's13_fiber': ('The picked fibre turning end-on (dissolving).', 'The fibre in cross-section: gas core with oxygen molecules, the membrane ring, red cells streaming round it; five labels.'),
 's14_diffuse': ('The cross-section (dissolving).', 'The fibre wall magnified: many oxygen molecules on the gas side, fewer on the blood side; one tagged molecule in the plasma; four labels.'),
 's15_rbc': ('The tagged molecule in the plasma.', 'Inside the red cell: the membrane a see-through rim, hemoglobin molecules, the molecule heading for one; labels RED BLOOD CELL and HEMOGLOBIN.'),
 's16_hemoglobin': ('A small hemoglobin molecule in the middle of the frame.', 'The whole molecule: four subunits, two hemes holding oxygen; labels HEMOGLOBIN and 4 HEMES, 4 SEATS FOR O₂.'),
 's17_co2': ('The fibre wall again (match cut), CO₂ on the blood side.', 'Pulled back to the oxygenator from the side, at its outlet.'),
 's18_filter': ('The top of the oxygenator, the filter lighting.', 'The bubble detector on the arterial line lit and labelled.'),
 's19_return': ('The arterial line, a bright marker climbing it.', 'The chest window close: chevrons running round the aortic arch and up its branches; AORTA, TO THE BODY and CROSS-CLAMP labelled.'),
 's20_tissue': ('The aorta (dissolving).', 'A capillary with red cells in single file; oxygen spreading into the tissue cells, which warm slightly; three labels.'),
 's21_cardioplegia': ('The capillary dissolving to the cardioplegia roller pump and its bag on the mast.', 'The chest window: white chevrons running down the coronary arteries from the aortic root; CROSS-CLAMP, AORTIC ROOT and CORONARY ARTERIES labelled.'),
 's22_suction': ('The chest window: the sucker in a small pool of spilled blood.', 'The left side of the machine: the suction line lit to the roller pump, the magnified rollers squeezing the tube, the return line into the reservoir.'),
 's23_perfusionist': ('The console monitor (dissolving), the perfusionist from behind in the foreground.', 'The monitor inset with four steady traces: FLOW, PRESSURE, TEMP, OXYGEN.'),
 's24_system': ('The monitor, the camera easing back.', 'The whole set-up from the side, subdued; the return line lit; PUMP, OXYGENATE, RETURN listed under the title.'),
 's25_loop': ('The whole set-up from the side, a marker on the arterial line.', 'The opening composition from above, identical to frame 0.'),
}
MATCH = {'s01_still': 'the loop: frame 0 equals the last frame', 's04_machine': 'the view turns (a fold from above to the side)', 's25_loop': 'continuous, then the view turns back (a fold to above)'}
MUSIC = [(0, 6, 'question', 'bars 0–2: a suspended G chord, no drums; at 2.25 s a rising fourth that does not resolve'),
         (6, 10, 'the machine', 'bars 3–4: the question resolves to C at 6.0 s as the view turns to the machine; the marimba hook, no kick while the heart is in frame'),
         (10, 18, 'the workflow', 'bars 5–8: a light half-time pulse; each of the seven steps rings one note higher than the last (a pentatonic ladder)'),
         (18, 22, 'drainage', 'bars 9–10: hats, shaker and bass, no kick (the heart is on screen)'),
         (22, 34, 'the parts', 'bars 11–16: the groove — four-on-the-floor, claps, hats, arpeggio; the hook answers itself every four bars'),
         (34, 42, 'gas and the oxygenator', 'bars 17–20: the groove opens up (open hats, a brighter arpeggio)'),
         (42, 46, 'one fibre', 'bars 21–22: the groove without the clap'),
         (46, 54, 'the microscopic world', 'the kick falls away (46 s), then a quieter space inside the red cell (50 s), a riser and a held breath (53.75–54.0 s)'),
         (54, 62, 'the binding', 'bar 27 at 54.0 s, the downbeat of a cycle: the full groove, the hook doubled by a lead'),
         (62, 70, 'the way back', 'lighter; no kick while the heart is on screen (66–70 s)'),
         (70, 72, 'oxygen delivered', 'bar 35 at 70.0 s: a small payoff, one bar of four-on-the-floor'),
         (72, 80, 'the other lines', 'cardioplegia (bells, no kick: the heart is on screen), then suction (marimba, shaker)'),
         (80, 86, 'the team and the whole loop', 'thinning, no kick; three related tones on the recap'),
         (86, 92, 'the opening again', 'bars 43–45: the suspended G chord, the same balance as bar 0, continuing across the seam')]
music_at = lambda t: next(m for m in MUSIC if m[0] <= t < m[1])
BASE = ("Original pixel-art medical explainer in simple flat 2D, vertical 9:16, near-black background. Each part is one flat colour "
        "with a 1-px light edge on its top left and a darker band on its bottom right; no gradients, no soft glows, no black outlines. "
        "An adult on cardiopulmonary bypass during heart surgery, in two views. From above: the arrested heart in the open chest, a "
        "venous cannula in the right atrium, an arterial cannula in the ascending aorta above a cross-clamp, surgeons only as "
        "teal-gowned arms and light neutral gloves at the edges. From the side: the patient on the table (the head hidden behind the "
        "anaesthesia screen, a round cutaway window showing the heart) and the heart–lung machine on the floor below, in flow order — "
        "hard-shell reservoir, centrifugal pump on its drive, one oxygenator assembly (heat exchanger, hollow fibres, arterial "
        "filter), clamp-on bubble detector — with a gas blender (oxygen and air), a heater–cooler on the floor, cardioplegia and "
        "suction roller pumps and a monitor; every line shows its direction of flow. Venous blood dark burgundy, oxygenated blood "
        "brighter red, never blue. O₂ cyan paired spheres, CO₂ amber three-atom symbols, hemoglobin lavender, heme gold with an iron "
        "centre. No embedded text, no logos, no faces, no gore, no toy-like organs.")
MOTION = ("Animate only the stated action. The heart never moves. Blood moves continuously and never pulses. Every line keeps its route "
          "and attachment points and shows its direction with moving marks. The centrifugal pump stays a smooth-rotor pump turned by "
          "magnets; roller pumps push by squeezing the tube. Gas, water, cardioplegia and blood stay in separate channels. Red cells "
          "never cross the oxygenator membrane. One eased camera move per scene; scale changes are visible zooms; the change of view "
          "is a fold. No shake, no flicker, no morphing, no new parts.")
SFX = {
 's01_still': 'A low, steady operating-room equipment hum (tuned to G) begins at frame 0 together with a soft room tone and a quiet, continuous, filtered blood-flow texture. At 0.3 s the left surgeon\'s gown makes a faint fabric movement. At 1.0 s a small, restrained metal contact as the right hand lifts its forceps. Under it, the score holds a soft suspended G chord. No heartbeat, no monitor beep, no alarm.',
 's02_moving': 'The blood-flow layer comes forward: a soft, filtered, continuous fluid texture, never pulsing, never splashing. A faint glassy shimmer as the tube wall becomes see-through (2.35 s). At 2.25 s the score asks its question: a soft bell rising a fourth that does not resolve. Two small ticks as the labels appear.',
 's03_follow': 'The same flow texture travels with the camera. A short, soft camera sweep; a small tick for the label. The machine\'s low motor hum fades in gradually; a quiet shaker builds toward the turn.',
 's04_machine': 'A soft whoosh as the view folds from above to the side (6.0 s). At 6.5 s the score resolves the question onto C with a restrained bell chord: the reveal. The console hum and the pump\'s smooth tone sit low (the machine was already running: no power-on). A soft rising tone follows the outgoing line and a higher one the returning line; small ticks as the labels appear.',
 's05_workflow': 'A soft pop as the drop sets off (10.5 s). Each of the seven steps rings as the drop reaches it: a marimba note with a little bell, one pentatonic step higher each time, a ladder from drain to return. The flow and pump beds come forward under a light half-time pulse. A short push at the end.',
 's06_drain': 'A quiet, steady fluid movement down the line, panned left. One soft tick as the height marks draw. No suction roar.',
 's07_reservoir': 'A soft enclosed-fluid texture as the camera arrives (low-passed, still). One quiet editorial tick as the level sensor\'s light glows (22.75 s). Small ticks for the labels. No low-level alarm, no splashing.',
 's08_pump': 'The pump\'s rotational tone comes forward: smooth, stable, at one constant pitch; it does not speed up as the camera moves closer. A faint glassy shimmer as the housing opens. Three bright marimba notes as IN, SPIN and OUT light (25.0, 25.8, 26.6 s). The flow follows the visible spiral.',
 's09_heater': 'A subtle, smooth water texture in its own channel (no bubbling) as the heater–cooler opens; a soft tonal glide as the water lines light. No boiling and no compressor noise.',
 's10_exchanger': 'The water texture continues. Two small tonal glides as the heat arrows cross the wall (32.6, 33.6 s). No boiling, steam or freezing sounds.',
 's11_gas': 'A quiet airy gas texture: the separate gas circuit. A soft glassy shimmer as the blender opens, small ticks for the labels, a short soft puff from the exhaust (37.15 s). Never bubbles in the blood.',
 's12_oxygenator': 'A subtle reveal shimmer (a few soft glass notes) as the fibres appear. A soft blip as one fibre is picked out, then a gentle push.',
 's13_fiber': 'Two restrained textures: an airy layer for the gas compartment (left of centre) and a softer, low fluid layer for the blood (right), still clear in mono. Small ticks as the labels appear.',
 's14_diffuse': 'A delicate tonal cue marks the change of scale (45.0 s). Soft granular motion, tiny tuned pops, for the molecules. Two soft marimba contacts as the followed molecule enters and leaves the membrane. No valve click, no door.',
 's15_rbc': 'The molecular texture continues, then the sound space becomes quieter and closer as the camera enters the cell: the music falls to a pad. A soft glassy tone as the molecule passes the membrane (50.9 s). No puncture, tearing or impact.',
 's16_hemoglobin': 'A soft whoosh into the molecule. At 54.0 s, on the downbeat, a delicate, satisfying contact tone (bell, marimba and glass on the chord) as oxygen binds, followed by a soft resolving harmonic layer while the full groove returns. Four tiny tuned tones as the four sites glint.',
 's17_co2': 'A soft swish for the match cut. Quiet granular motion. A restrained outward airy sweep as CO₂ leaves with the gas (60.3 s). The blood-flow layer continues underneath. A soft pull-back whoosh. No exhaust blast.',
 's18_filter': 'Soft flow continues. Two quiet editorial ticks, one for the filter highlight (62.25 s) and one for the detector (63.75 s). No emergency alarm, no arcade success chime.',
 's19_return': 'The flow texture broadens and climbs with the camera. A soft bell as the view arrives at the aorta. The music starts to resolve the journey; no kick while the heart is on screen.',
 's20_tissue': 'A soft whoosh into the capillary. Gentle, dispersing tuned tones as oxygen leaves the cells and spreads into the tissue. A small musical payoff on the downbeat at 70.0 s. No electric shock, no power-up.',
 's21_cardioplegia': 'A soft glide to the pump on the mast. The rollers turn with a quiet, even motor sound (no rhythmic thump). A soft rising tone follows the solution up the line; a cool glassy shimmer as it reaches the coronary arteries (74.4 s). No heartbeat.',
 's22_suction': 'A soft fluid draw as the sucker picks up spilled blood (no slurping roar). A small interface blip as the inset opens (78.0 s), a quiet, even roller whirr under it, and a rising tone as the blood climbs back to the reservoir.',
 's23_perfusionist': 'The operating-room ambience returns (hum, room tone, the console). A tiny interface blip only as the monitor inset appears. No rhythmic ECG beep.',
 's24_system': 'Three related soft tones (C, E, G on bell and marimba) exactly as the pump, the oxygenator and the return line light (84.0, 84.75, 85.5 s). The flow continues under them without a break.',
 's25_loop': 'A soft glide as the camera follows the line up; a whoosh as the view folds back to above (88.7 s). The balance returns to the opening: equipment hum, soft flow, room tone. The score settles on the opening suspended chord and continues across the loop seam without a gap.',
}
sb = [f'# Storyboard — {len(ids)} scenes, {TOTAL:.0f} s at {FPS} fps', '', 'Generated by `tools/make_docs.py` from `镜头表.md`, the scene files and the cue sheet. "Motion" is the header comment of the scene\'s own file, i.e. what the code animates. The start and end frames of every scene are in `storyboard_frames.png` (left to right, top to bottom: S01 start, S01 end, S02 start, …).', '']
tl = [f'# Editing timeline (exactly {TOTAL:.3f} s, {int(TOTAL * FPS)} frames at {FPS} fps)', '',
      'The engine assembles the film in one pass (`engine/film.js`). Every transition is inside its scene\'s time, as the brief requires:', '',
      '- **continuous**: one camera move carries straight on (scenes 1–3, 5–9, 12, 18–19, 22, 24);',
      '- **fold**: the view turns between above and the side, the first picture folding flat to a line and the second unfolding from it (S04, and inside S25);',
      '- **dissolve**: an ordered-dither dissolve from the previous scene\'s last frame (0.12–0.5 s), used at every change of scale (10, 11, 13–17, 20, 21, 23);',
      '- no hard cuts and no added transition time.', '',
      '- **Captions.** The X-ray film\'s style: a small upper-case title top left with an accent bar and one context line under it (art rows 42–66 of 480), typed on at 40 characters/s and erased at 70 before the scene ends; part and particle labels on leader lines; numbered step badges in S05. Nothing below row 452 except the S08 strip, nothing in the right-hand button strip. `--notext` renders the clean version; `labels.srt` has every caption and label with its times.',
      '- **Audio.** `mix.wav` under the labeled picture, `mix_notext.wav` under the clean one; `mix_vo.wav` (or `music.wav` + `sfx.wav`) under a voice-over. All are exactly 92.000 s.', '',
      '| # | In (s) | Out (s) | Frames | Scene | Transition in | Camera | Caption | Music |', '|---|---|---|---|---|---|---|---|---|']
pr = ['# Keyframe, motion and SFX prompts (one set per scene)', '', 'The film is drawn by code, so these are not what made it. They restate each scene for an image or video model or a sound designer (alternative keyframes, a print storyboard, a re-score), using the brief\'s constraints as the fixed base.', '', '**Image base:** ' + BASE, '', '**Motion base:** ' + MOTION, '']
for i, (sc, row) in enumerate(zip(SCN, SHOTS)):
    sid, t0, t1 = sc['id'], sc['t0'], sc['t1']; n = i + 1; key = f'S{n:02d}'
    _, span, obj, act, camw, label, how = row[:7]
    x = xin(sid); trans = f'dissolve {x:.2f} s' if x else MATCH.get(sid, 'continuous')
    snd = ', '.join(f"{c['sfx']} @{c['t'] - t0:.3f}".rstrip('0').rstrip('.') for c in by.get(sid, []))
    a, b, mname, mdesc = music_at(t0)
    small = ', '.join(e['text'] for e in textlog.get(sid, []) if e['kind'] not in ('ctx', 'title'))
    f0, f1 = FRAMES[sid]
    sb += [f'## {key} · {span} · `{sid}` · {t1 - t0:.0f} s', '', f'- **Picture:** {obj}.', f'- **Action:** {act}.', f'- **Start frame ({t0:.2f} s, frame {int(t0 * FPS)}):** {f0}', f'- **End frame ({t1:.2f} s, frame {int(t1 * FPS) - 1}):** {f1}',
           f'- **Camera:** {camw} ({CAM.get(camw, camw)}).', f'- **Transition in:** {trans}.', f'- **Caption:** {label}' + (f' · small labels: {small}' if small else '') + '.',
           f'- **Motion (from the code):** {header(sid)}', f'- **Sound cues:** {snd or "—"}.', f'- **Music ({a}–{b} s, {mname}):** {mdesc}.', '']
    tl.append(f'| {n} | {t0:05.2f} | {t1:05.2f} | {int(t0 * FPS)}–{int(t1 * FPS) - 1} | `{sid}` | {trans} | {CAM.get(camw, camw)} | {label} | {mname} |')
    pr += [f'## {key} · {span}', '', f'**Keyframe (start):** {BASE} Frame: {f0}', '', f'**Keyframe (end):** {BASE} Frame: {f1}', '',
           f'**Motion ({t1 - t0:.0f} s):** {MOTION} This scene: {act}. Camera: {CAM.get(camw, camw)}.', '', f'**SFX:** {SFX[sid]}', '']
(D / 'storyboard.md').write_text('\n'.join(sb) + '\n')
(D / 'timeline.md').write_text('\n'.join(tl) + '\n\nMusic grid: 120 BPM in 4/4, a bar every 2 s, 46 bars. The loop: see `loop.md`.\n')
(D / 'prompts.md').write_text('\n'.join(pr) + '\n')
# labels
labs = []
for sc in SCN:
    for e in textlog.get(sc['id'], []):
        dur = sc['t1'] - sc['t0']
        cap = e['kind'] in ('ctx', 'title'); t1 = e['t1'] if e['t1'] is not None else dur
        labs.append({'scene': sc['id'], 'kind': 'caption' if cap else 'label', 'text': e['text'], 'start': round(sc['t0'] + e['t0'], 3), 'end': round(sc['t0'] + (t1 if cap else min(dur, t1 + 0.25)), 3)})
labs.sort(key=lambda l: (l['start'], l['text']))
(D / 'labels.json').write_text(json.dumps(labs, indent=1, ensure_ascii=False) + '\n')
def ts(x): h_ = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h_:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'
(D / 'labels.srt').write_text('\n'.join(f"{k + 1}\n{ts(l['start'])} --> {ts(l['end'])}\n{l['text']}\n" for k, l in enumerate(labs)))
(D / 'labels.md').write_text('# Editable captions and labels\n\nThe labeled version draws these in the film\'s pixel font; the clean version (`--notext`) has none of them. The same list is in `labels.srt` (CapCut, Premiere, DaVinci …) and `labels.json`. Times are film seconds, from the first typed character to the end of the fade. The monitor\'s own words in S18 (FLOW, PRESSURE, TEMP, OXYGEN) are part of the inset and are also hidden in the clean version.\n\n| Scene | Kind | Text | Start | End |\n|---|---|---|---|---|\n'
                             + '\n'.join(f"| {l['scene']} | {l['kind']} | {l['text']} | {l['start']:.2f} | {l['end']:.2f} |" for l in labs) + '\n')
# cue sheet
cs = ['# Audio cue sheet', '', 'Every effect comes from a cue the picture emits (`window.dumpCues()` → `build/cues.json`), so it lands on its visual cause; tonal effects are tuned to the chord of the moment. Under them runs a continuous sound environment (operating-room hum, machine hum, blood flow, pump, gas, water), mixed per scene and crossfaded over 0.6 s across every cut.', '',
      '## Music', '', '120 BPM, 4/4, 46 bars. Bars 0–2 and 43–45: a suspended G (the question). Bars 3–42: C – Am – F – G, one chord per bar, ten times; cycles start at 6, 14, 22, 30, 38, 46, 54, 62, 70 and 78 s.', '',
      '| From | To | Section | What plays |', '|---|---|---|---|'] + [f'| {a} s | {b} s | {m} | {d} |' for a, b, m, d in MUSIC]
cs += ['', '## Beds (continuous)', '', '| Bed | Sound | Where it is forward |', '|---|---|---|',
       '| Operating-room hum | 49 Hz with harmonics (G), room tone | the operating field, the perfusionist, the ending |',
       '| Machine hum | a soft motor tone at 147 Hz (D), slowly beating | at the console |',
       '| Blood flow | filtered noise, continuous, only very slow drift | S02 (forward), S05–S07, S19 (broader) |',
       '| Pump | a smooth stable tone at 196 Hz (G) with a band of air | S08 (forward), S05, S21–S22 |',
       '| Gas | airy high noise | S11–S14, S17 (panned to the gas side in S13) |',
       '| Water | a smooth mid-low stream | S09–S10 |']
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
moving through two connected tubes. The question is on screen by 2 s and the answer, a machine, at 6 s. Then the view turns
to the side, and the film becomes an explanation of the machine, the way a dialysis set-up is usually explained: the patient
above, the machine below, the lines between them with their direction of flow. One drop of blood goes round the whole loop
in seven numbered steps (S05); then each step gets its own close-up, from the drainage by gravity to the return into the
aorta, with the oxygenator taken down in scale to one fibre, the membrane, a red cell and hemoglobin. Two more jobs of the
machine follow (cardioplegia, suction), then the perfusionist, the whole loop, and the opening frame again.

## Creative decisions

- **The machine is the subject.** Fourteen of the twenty-five scenes are about the console and its lines (S04–S12, S18–S19,
  S21–S24); the molecular sequence keeps its place as the payoff of step 5.
- **Seen from the side.** The side view shows what the view from above cannot: the height difference that drives venous
  drainage, the order of the parts, and every line's direction. The surgeon's view from above stays for the opening and the
  closing, so the loop frame is the operating field.
- **A workflow in seven steps first, then the details.** The numbered overview (drain, collect, pump, warm/cool, add O₂,
  filter, return) gives the viewer a map; every later step title carries its number.
- **Every highlighted part is named.** Parts and particles get small upper-case labels on leader lines as they light.
- **Pumps shown working.** The centrifugal pump in a side cutaway (motor → magnets → rotor; in → spin → out) and the roller
  pump magnified (rollers squeezing a tube, the principle of a dialysis blood pump).
- **One locked circuit.** Every line is defined once (`engine/lib/side.js`) and drawn the same way in every scene.
- **The ending returns to the opening frame**, so the video loops.
- **Look.** Simple flat 2D pixels like the X-ray film: one flat colour per part with a light top-left edge and a shadow band,
  near-black background, no soft glows; drawn at 270×480 and scaled exactly 4× with nearest neighbour.
- **No reference images were supplied.** Following the codixel skill, the organic subjects (the heart, the people) are drawn in
  code and kept simple; the people never show a face.

## Assumptions (the chosen scenario)

- An adult, conventional cardiopulmonary bypass, already established from frame one; the patient anesthetized and anticoagulated, the circuit primed.
- An arrested-heart operation: the heart stopped with cardioplegia and the ascending aorta cross-clamped. This is the chosen scenario, not a requirement of all cardiac surgery.
- Gravity venous drainage through one cannula in the right atrium into a hard-shell reservoir well below the patient.
- A centrifugal pump; an integrated assembly of heat exchanger, hollow-fibre oxygenator (gas inside the fibres, blood outside) and arterial filter; a clamp-on bubble detector on the arterial line.
- Arterial return into the distal ascending aorta, on the systemic side of the clamp; cardioplegia delivered by a roller pump to the aortic root, below the clamp; cardiotomy suction by a roller pump into the reservoir.

## Simplifications

- **A schematic side view.** The machine is drawn large and well below the table so that it fits a vertical frame; real consoles stand beside the table, and their parts are arranged in many different ways.
- **Two views of one set-up.** The view from above and the side view are joined by a fold; the heart in the side view's window is the same model as the view from above.
- **Schematic scale.** The fibre, the membrane, the red cell and the hemoglobin molecule are shown at magnifications that differ by orders of magnitude; every change of scale is a visible zoom.
- **Teaching colours.** O₂ cyan, CO₂ amber, hemoglobin lavender, heme gold, water blue are conventions, not real colours.
- **Cutaways.** The see-through tube, reservoir, pump, heater–cooler and blender are educational.
- **The heat exchanger** is shown as two straight channels and a wall; real ones are bundles of fine tubes. One water loop is shown; heater–cooler units often also serve the cardioplegia circuit.
- **Cardioplegia** is shown as a bag pumped by a roller pump; blood cardioplegia (mixed with oxygenated blood from the circuit) and its own heat exchanger are left out. It is given in doses; none are shown.
- **Suction** goes straight to the reservoir; vents and other accessory lines are left out.
- **CO₂** is shown only as dissolved CO₂ crossing the membrane; how blood carries CO₂ is not shown.
- **The monitor** shows labelled, steady traces with no numbers, so no targets or settings are implied.
- **Nothing procedural.** There are no doses, settings, targets, or steps of cannulation or machine operation.

## Hypotheses (to test, not claims)

- The contradiction at frame 0 and the early answer at 6 s should hold viewers past the first seconds.
- The numbered seven-step loop should make the machine easy to retell.
- The molecular payoff at 54 s should be the most remembered moment.
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
| S04–S05 | The machine below the patient; one loop in seven steps | CPB drains venous blood, pumps it through an oxygenator with temperature control and a filter, and returns it to the arterial system | One schematic layout, not to scale |
| S06 | Blood drains from the right atrium down to a reservoir well below the heart | Gravity (siphon) venous drainage needs the reservoir below the heart; the height difference drives it | Heights exaggerated for the frame |
| S07 | A hard-shell reservoir: inlets, filter, steady level, submerged outlet, level sensor | The reservoir holds a working volume; the outlet stays under the surface; level sensing guards against air entering the pump | Inner geometry simplified |
| S08 | A centrifugal pump: motor, magnets, smooth rotor; in at the centre, out at the side | Centrifugal pumps add energy by rotation (a forced vortex) and are driven magnetically through the closed housing | Rotation slowed to be readable; cells shown large |
| S09–S10 | A heater–cooler pumps water to the heat exchanger; heat crosses a solid wall | Temperature is managed by water from a heater–cooler through the heat exchanger; water and blood never mix | One water loop; two straight channels instead of a tube bundle |
| S11 | Oxygen and air mixed in a blender, metered by flowmeters, into the oxygenator; exhaust out | The sweep gas (an oxygen/air mix set by a blender and flowmeter) flows through the oxygenator and leaves through its exhaust | No settings shown |
| S12–S13 | Hollow fibres; gas inside, blood outside | In the common hollow-fibre design the sweep gas flows inside the fibres and blood flows around them | One fibre in cross-section, enlarged |
| S14 | O₂ crosses the intact membrane by diffusion, with a net flux toward the blood | Diffusion follows the partial-pressure gradient; no cells cross; no gas bubbles form in the blood | Molecules drawn huge and few; random motion stylized |
| S15 | O₂ enters a red cell through its membrane | O₂ diffuses through plasma and the red-cell membrane | No hole or channel is shown |
| S16 | O₂ binds reversibly to the iron of a heme; four subunits, four sites; the protein shifts slightly | Hemoglobin is a tetramer (2 α, 2 β); each heme iron binds one O₂ reversibly; binding changes the protein's conformation | Shape change stylized; two of four sites filled |
| S17 | CO₂ crosses from the blood into the gas and is swept away | CO₂ is removed across the same membrane into the sweep gas | Only dissolved CO₂ shown; carriage on hemoglobin and as bicarbonate not shown |
| S18 | An arterial filter in the assembly; a separate clamp-on bubble detector | Integrated arterial filters trap particles and bubbles; ultrasonic detectors monitor the line, they do not remove anything | No air event is staged |
| S19 | Oxygenated blood returns through a cannula in the ascending aorta above the cross-clamp | The arterial cannula must be on the systemic side of the clamp to perfuse the body | Arch branches drawn short |
| S20 | O₂ leaves hemoglobin, crosses the capillary wall and reaches tissue; cells stay in the vessel | Systemic O₂ unloading by diffusion down the gradient; not all O₂ is released | The tissue response is a restrained colour change |
| S21 | A roller pump sends cold cardioplegia into the aortic root, below the clamp, and into the coronary arteries | Antegrade cardioplegia is delivered into the aortic root proximal to the cross-clamp; the clamp keeps it out of the systemic circulation, so it perfuses the coronaries and keeps the heart arrested | Bag and roller pump only; blood mixing, doses and timing not shown |
| S22 | A sucker returns spilled blood through a roller pump to the reservoir | Cardiotomy suction returns shed blood to the circuit through the reservoir's filter; roller pumps push by occluding a tube against a raceway | Vents and suction control not shown |
| S23 | Flow, pressure, temperature and oxygenation are watched continuously | These are monitored throughout CPB by the perfusionist | No values or targets shown; monitoring does not mean complications are impossible |

## The brief's accuracy checks

| Check | How the film meets it |
|---|---|
| Bypass established in the opening | Blood moves in both connected lines from frame 0 (S01) |
| Arrested heart is the chosen scenario | Stated in `rationale.md`; S21 shows how cardioplegia keeps it still; no claim that all cardiac surgery needs it |
| Venous and arterial connections consistent | One route per line, defined once in `engine/lib/side.js` (and `world.js` for the view from above) and drawn in every scene |
| Arterial return perfuses the body despite the clamp | The cannula enters the ascending aorta above the clamp (S19, `docs/sheets/heart.png`) |
| Circuit fluid-filled and prepared | Every line and component is filled from frame 0 |
| Reservoir outlet submerged | The outlet is below the constant working level (`MACHINE.LEVEL`) in every frame |
| Centrifugal pump throughout | The same smooth-rotor head in every scene; the roller pumps are only for cardioplegia and suction |
| Pump does not shred red cells | Cells ride the flow intact; no blades |
| Water, blood and gas separate | Separate lines and channels in every view (S09–S11, S13) |
| Gas inside, blood outside the fibres | S12–S14 |
| O₂ crosses by diffusion | Random walks with a net flux down the gradient (S14) |
| Red cells do not cross the membrane | Cells stay on the blood side (S13, S14) |
| O₂ binds reversibly | Binding at the iron with a two-way arrow (S16) |
| CO₂ leaves through the gas pathway | S17; the exhaust in S11 |
| Blood stays red / burgundy | Venous burgundy and oxygenated red ramps only; never blue |
| Bubble detector is not a filter | It only lights; nothing is removed (S18) |
| Monitoring is not a guarantee | No claim on screen; noted here |
| No emergency or defibrillation scene | None |
| No heartbeat over the arrested heart | No heartbeat sound at any point; no kick drum while the heart is on screen |
""")
(D / 'assets.md').write_text("""# Asset and continuity guide

Every asset is one piece of code, so it cannot drift between scenes. The reference sheets in `docs/sheets/` are drawn by the same code.

| Asset | Code | Locked |
|---|---|---|
| The side view (the machine's world) | `engine/lib/side.js` (`SIDE.LY`, `SIDE.R`, `SIDE.track`) | Positions of every part and the route of every line; the order of points is the direction of flow |
| The machine's parts | `engine/lib/machine.js` | Reservoir (constant level, submerged outlet), centrifugal pump and drive, oxygenator (HX, fibres, filter), detector, blender, heater–cooler, roller pumps, monitor |
| The view from above and the heart | `engine/lib/world.js`, `engine/lib/heart.js` | The opening and closing composition; the heart never moves; cannula above the clamp, cardioplegia below it |
| The team | `engine/lib/people.js` | Surgeons: arms and gloved hands at the frame edges; the perfusionist from behind; no faces |
| The microscopic models | `engine/lib/micro.js` | O₂ pair, CO₂ triad, red cell (biconcave), hemoglobin (2 α + 2 β, four hemes), heme with iron |
| The look | `engine/lib/lit.js`, `engine/lib/pix.js` | Flat colour per part, light edge top left, shadow band bottom right; 270×480 drawn, 4× nearest-neighbour |
| The text | `engine/lib/cap.js` | Title top left with accent bar and context line; part labels on leader lines; step badges |

## Line rules (side view)

- **Venous line.** From the right atrium out of the chest window and down to the reservoir's venous inlet. Burgundy, 7 units.
- **Machine path.** Reservoir outlet → pump inlet (top, centre) → pump outlet (side) → oxygenator inlet (bottom). Burgundy, 7 units.
- **Arterial line.** Oxygenator outlet (top) → bubble detector → up and over the drapes → the aortic cannula. Red, 5 units.
- **Cardioplegia.** Bag → roller pump on the mast → a thin rose line (2 units) to the aortic root, below the clamp.
- **Suction.** Sucker in the chest → down the far left → roller pump on the cart → up into the reservoir's suction inlet. 3 units.
- **Gas.** Oxygen and air hoses → blender → the oxygenator's gas inlet (pale cyan); the exhaust at its bottom.
- **Water.** Heater–cooler ↔ the heat exchanger's two ports (blue).
- **Flow.** Marks move at one constant speed (blood 30 units/s, 15 apart: a 0.5-s pattern; other lines at half speed).

## What must not appear

- **The heart.** No heartbeat, no heart motion, and no heart restarting.
- **Alarms and emergencies.**
  - No alarm, no flatline, and no rhythmic monitor beep.
  - No emergency, defibrillation or crisis scene.
- **Blood colour.** No blue blood.
- **Blood and the circuit.**
  - No bubbles in the blood.
  - No blades in the pump.
  - No mixing of water, gas, cardioplegia and blood.
  - No cells crossing the membrane.
  - No hole punched into a cell.
  - No line changing its attachment.
- **Molecules.** No O₂ split into atoms, and no rusting iron.
- **Clinical numbers.** No numbers on the monitor or the blender; no doses, settings or targets.
""")
lp = R / 'build/loop_check.json'
LOOP_NOTE = (lambda d: f"The state at {d['t1']} s differs from frame 0 by {d['diff_px']} art pixels; an ordinary step from one frame to the next near the end changes about {d['step_px']} art pixels, so the seam is an ordinary frame step.")(json.loads(lp.read_text())) if lp.exists() else ''
(D / 'loop.md').write_text(f"""# Loop specification

## Picture

- **Same state at both ends.** S25 ends on `WORLD.CAM0`, the opening camera, with both hands at rest. The flow marks are in
  the same phase, since the pattern repeats every 0.5 s and 92 s is a whole number of repeats.
- **Measured.** `tools/render.py --stills 0,91.9999` writes both frames; `docs/frame_open.png`, `docs/frame_close.png` and
  `docs/loop_compare.png` show them. {LOOP_NOTE}
- **No text at the seam.** The recap erases by 86.9 s and S25 has none. "DURING HEART SURGERY" types in 0.15 s after the restart.
- **Camera.** It eases into the opening view and S01 starts from rest, so speed is continuous across the seam.

## Sound

- **Bars.** 46 bars at 120 BPM in 4/4 = exactly 92.000 s.
- **Harmony.** Bars 43–45 hold the opening suspended G chord, and bar 0 continues it.
- **Beds.** The hum, flow, pump, gas and water beds are exactly periodic in 92 s: tones with whole cycles in the loop, and noise
  filtered in the frequency domain of the whole loop. Their level automation is smoothed circularly, so the seam is treated like
  any other moment.
- **Tails.** Reverb and echo that ring past 92 s are folded onto the start.
- **Measured.** {('The step from the last sample to the first is ' + str(rep['loop_seam_step']) + ' of full scale, against ' + str(rep['loop_seam_local_p99']) + ' for ordinary steps near the end.') if rep else 'see cue_sheet.md.'}

## Export

- Render once; the platforms that loop restart on frame 0.
- For a longer upload, join copies end to end with no gap.
- Add no fade-in or fade-out to the picture or the sound.
""")
print('docs ->', sorted(p.name for p in D.iterdir()))
