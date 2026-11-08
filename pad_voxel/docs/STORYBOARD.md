# Storyboard and scene prompts — How Diabetes Damages Leg Arteries

63.000 s · 9:16 · 1080×1920 (a 540×960 voxel grid shown exactly 2× nearest-neighbour) · 60 fps · 21 scenes × 3 s.
The picture sheet is `docs/storyboard.png` (one labeled frame per scene); the shot list with camera moves is `镜头表.md`.

**Shared style for every prompt below.** 3D voxel pixel-art medical animation: every model built from cubes, flat-shaded
faces in five-step material ramps with ambient occlusion and 1-px outlines; no anti-aliasing, no blur, no bloom, no glow;
see-through skin and walls use an ordered-dither screen door. Deep navy ground `#0D1B2A`. Colour code (fixed for the whole
film): cyan artery walls `#46C6E6` (not venous blood), yellow-orange wall plaque `#F0A93B`, opaque white calcium `#F2F4F6`,
muted red blood cells `#A8323E`, white-blue contrast `#CDEBFF` (a teaching overlay — contrast does not glow), red-orange
for highlighted disease, orange for the painful working muscle, grayscale for every CTA image. One patient, framed from
the neck down; his face is never shown. The symptomatic leg is always the RIGHT leg. No numbers anywhere.

---

### S01 · 0:00–0:03 · WALKING
**Camera:** lateral tracking from the patient's right at hip height (32° lens), lead room ahead of him.
**Prompt:** A middle-aged man in a grey-blue T-shirt, dark knee-length shorts, white socks and grey trainers walks across a floor of large dark-navy tiles, framed from the shoulders down; natural adult proportions, arms swinging opposite the legs, heel strikes on each beat; the floor tiles slide past to show his speed. Text: *Pain while walking?* (optional).

### S02 · 0:03–0:06 · THE PATIENT STOPS
**Camera:** slow push in toward the right calf.
**Prompt:** His stride shortens over three steps; he stops, bends forward and holds the back of his right calf with his right hand, left hand on the left thigh; an orange glow appears inside the right calf muscle (pain on exertion). His head stays out of frame.

### S03 · 0:06–0:09 · ENTER THE LEG
**Camera:** fast push: behind the knee, then up along the artery, then a dive into its lumen.
**Prompt:** The rest of the body dissolves; the right leg stays as a dithered see-through shell. The calf skin turns transparent, revealing the gastrocnemius and soleus in orange-tinted muscle cubes; the muscle fades in turn, revealing the cyan arteries (popliteal, anterior tibial, tibioperoneal trunk, posterior tibial, peroneal) and faint bones. The camera rises along the superficial femoral artery in the thigh and dives into it at the site of the future stenosis; an ordered-dither dissolve into scene 4.

### S04 · 0:09–0:12 · NORMAL REFERENCE
**Camera:** hold (a short settle after the dive).
**Prompt:** A healthy artery cut lengthwise, standing vertical, blood flowing down the screen: the cut faces show the wall's layers (thin endothelium, intima, white internal elastic lamina, banded cyan media, darker adventitia); inside, a smooth cobblestone lining and a wide channel; disc-shaped red cells tumble downward with a gentle surge on each beat. Text: *Normal artery*.

### S05 · 0:12–0:15 · CHRONIC HIGH GLUCOSE
**Camera:** hold, same view.
**Prompt:** Small pale-yellow hexagonal glucose rings appear among the red cells, more with every beat; a small pixel hourglass beside the caption drains to mark years passing. The glucose stays dissolved in the blood — it never clumps or blocks anything. Text: *Chronic high glucose*.

### S06 · 0:15–0:18 · ENDOTHELIAL DYSFUNCTION
**Camera:** slow push to the left wall.
**Prompt:** Close on the lining: orange patches break the neat cobblestone pattern of the endothelial cells over one segment; two round white blood cells roll along the surface and stick there. Fewer red cells pass in the foreground. Text: *Endothelial dysfunction*.

### S07 · 0:18–0:21 · PLAQUE FORMATION
**Camera:** pull back.
**Prompt:** Small yellow lipid particles slip from the blood under the damaged lining into the wall; a white macrophage takes them up and turns into a speckled yellow foam cell inside the intima; the inner wall begins to bulge toward the channel. Everything stays inside the wall. Text: *Plaque builds in the wall*.

### S08 · 0:21–0:24 · CHRONIC PROGRESSION
**Camera:** hold, the same angle as scene 4 (a direct before/after).
**Prompt:** The plaque grows within the wall on one side — a fibrous cap over a yellow lipid core — and opaque white calcium specks appear in it; the channel narrows and shifts toward the opposite side; the lining still covers the plaque. The hourglass turns again. Text: *Progression over time*.

### S09 · 0:24–0:27 · STENOSIS
**Camera:** hold; the normal artery slides in beside the diseased one.
**Prompt:** Two artery cutaways side by side at the same scale: left normal, right narrowed by the calcified plaque. In the narrowed one, fewer red cells pass, and white streaks show the faster jet through the open but narrow channel. Text: *STENOSIS* (large, orange underline).

### S10 · 0:27–0:30 · OCCLUSION
**Camera:** pan down the same artery, then a slow push to the top of the block.
**Prompt:** Farther downstream, a segment is filled end to end with orange-brown plaque material flecked with white calcium; the channel tapers into it and stops; the wall layers still outline the vessel's course on both sides. Above the block the red cells stand almost still, only rocking with each beat (no net flow). Text: *OCCLUSION* (large, orange underline).

### S11 · 0:30–0:33 · COLLATERAL BYPASS
**Camera:** pull back.
**Prompt:** Two small cyan side channels around the blocked segment — present all along — widen into curved bypasses from above the block to below it; a thin stream of red cells travels through them and on, slowly, below the block. The block itself stays closed. Text: *Collateral flow*.

### S12 · 0:33–0:36 · WALKING INCREASES DEMAND
**Camera:** cut to a side view tracking the walking legs.
**Prompt:** The patient walks again; his right leg is a see-through shell showing orange calf muscles that bulge with each step and the cyan arteries inside; his left leg is solid. At the top, under the caption, two bars without numbers: an orange *Demand* bar (muscle icon) climbs with each step past a fixed white mark, a cyan *Supply* bar (drop icon) stays at that mark; the overflow of the demand bar pulses red-orange. Text: *Demand exceeds supply*, *Demand*, *Supply*.

### S13 · 0:36–0:39 · REST RELIEVES THE SYMPTOM
**Camera:** hold, close on the calves.
**Prompt:** He stands still and slowly straightens; his hand leaves the calf; the orange glow fades; the demand bar falls back below the unchanged supply mark. Nothing in the arteries changes. Text: *Rest reduces demand*.

### S14 · 0:39–0:42 · CT ANGIOGRAPHY
**Camera:** hold, a wide side view.
**Prompt:** A generic white CT scanner (no brand) with a cyan ring around the bore; the patient lies on his back on the table, head first, and slides into the gantry (his head is inside, never seen); a contrast injector on a stand beside the table is connected by a thin IV line to his arm; a small pulse travels down the line. Text: *CT angiography*.

### S15 · 0:42–0:45 · CONTRAST CIRCULATION
**Camera:** slow lateral move.
**Prompt:** A see-through torso diagram: ghostly pink lungs, a red heart, the arm vein, the pulmonary loop and the aorta; a white-blue contrast front travels arm vein → right heart → lungs → left heart → aorta and down. White-blue is a teaching colour.

### S16 · 0:45–0:48 · PELVIS-TO-FOOT FILLING
**Camera:** lateral/vertical tracking from the pelvis down to the feet.
**Prompt:** Against a flat blue body silhouette, the arterial tree from the aorta to both feet; the lumen casts turn from blood red to white-blue as the contrast front moves down; yellow-orange plaque and white calcium sit in the walls; on the right leg the front reaches the vessels below the popliteal block later, through the collaterals.

### S17 · 0:48–0:51 · CTA RECONSTRUCTION
**Camera:** pull back while the image turns slowly.
**Prompt:** A grayscale 3D CTA reconstruction on black: both legs' arteries from the aorta to the feet in light grey, faint mid-grey bones (pelvis, femurs, tibiae), calcium brightest white with a dark rim; viewer corner brackets, a tick ruler, *R* on the viewer's left and *L* on the right. Text: *Arterial reconstruction*, *R*, *L*.

### S18 · 0:51–0:54 · STENOSIS ON CTA
**Camera:** fast push to the right superficial femoral artery.
**Prompt:** The grey artery narrows to a thin but continuous channel with bright white calcium flecks in its wall; an orange slice line crosses it, and a dashed leader opens an axial grayscale slice: femur corner, muscle, the vein beside the artery, an eccentric small open lumen, grey plaque, a bright calcium arc. Text: *STENOSIS*.

### S19 · 0:54–0:57 · OCCLUSION ON CTA
**Camera:** move down the artery to behind the knee.
**Prompt:** The light-grey contrast column of the popliteal artery stops; a faint cyan dithered outline keeps the blocked segment's course; thin grey collaterals curve around it and refill the artery below. Text: *OCCLUSION*.

### S20 · 0:57–1:00 · NORMAL VERSUS DIABETIC PAD
**Camera:** pull back to the final framing.
**Prompt:** Two right-leg arterial trees side by side at the same scale and angle, each inside a flat blue leg silhouette, divided by a dotted line: left a normal teaching tree with smooth white-blue lumens; right this patient's tree with the mid-thigh stenosis, the popliteal occlusion with enlarged collaterals and the below-knee narrowings and calcification. Text: *Normal*, *Diabetic PAD*.

### S21 · 1:00–1:03 · FINAL DIAGNOSTIC IMAGE
**Camera:** hold while both trees turn slightly together.
**Prompt:** In turn on the beat, the stenosis and then the occlusion light up red-orange with a bracket beside each, then a dotted orange route traces the collateral bypass; the title settles at the top; the music resolves. Ends on this image (`docs/final_still_labeled.png`, `docs/final_still_clean.png`). Text: *Diabetic Peripheral Arterial Disease*.
