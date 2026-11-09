# Lesion continuity map

One patient, one symptomatic leg (the **right** leg), one fixed lesion map. Every view draws from the same data
(`src/13_tree.js`: centre-lines `ART`, lesions `LES`, medial calcification `MEDCAL`), so a lesion sits at the same
place in the leg cutaway, the artery close-ups, the filling, the CTA and the final comparison. Anatomy is never
mirrored. Picture: `docs/lesion_map.png` (map + legend); normal anatomy: `docs/anatomy_reference.png`.

Coordinates are millimetres above the floor in the standing patient (hip joint ≈ 920, knee joint ≈ 480).

| ID | Where | What it is | How every view shows it | Scenes |
|---|---|---|---|---|
| **L1** | Right superficial femoral artery (SFA), mid thigh, 668–712 | Flow-limiting **stenosis**: eccentric wall plaque with calcium; the channel stays open and continuous | Micro: the stenosis site of the artery cutaway (plaque grows in the wall, the channel narrows and shifts, a faster jet passes) · Tree: yellow-orange plaque sleeve, narrowed white-blue cast · CTA: thin continuous ivory channel with bright calcium, axial slice · Final: orange highlight + bracket | 3 (dive site), 4–9, 16–18, 20–21 |
| **L2** | Right popliteal artery above the knee joint, 490–548 | Chronic **occlusion**: no channel through the segment; the wall outline remains | Micro: the occluded segment downstream (an orange-brown fibrous plug with calcium, stagnant blood above, no passage) · Tree: an interrupted cast with the orange-brown plug · CTA: the contrast column stops, a faint cyan glass outline keeps the course · Final: orange highlight + bracket | 10–12, 16, 19–21 |
| **COL** | Genicular collaterals from the distal SFA and the profunda to the popliteal below L2 | Pre-existing small channels that enlarge and **bypass** L2; they never reopen it | Micro: two pink side channels widen and carry a thin stream around the block · Tree/CTA: enlarged curved branches refilling the popliteal below the block (it fills later in scene 16) · Final: a dotted orange route | 11, 16, 19–21 |
| **L3a / L3b** | Right anterior tibial artery, 378 and 252 | Two below-knee stenoses | Narrowed casts with plaque in the tree and CTA views | 16–21 |
| **L3c** | Right peroneal artery, around 268 | A longer narrowing | Narrowed cast in the tree and CTA views | 16–21 |
| **MEDCAL** | Right anterior tibial, posterior tibial and peroneal arteries (below the knee) | Medial (rail-track) calcification — in the media, separate from plaque | White nodules along the vessel walls; the brightest white with a dark outline on CTA | 16–21 |
| **PTA** | Right posterior tibial artery | **Open** to the foot | A continuous cast to the foot | 16–21 |
| **LEFT** | Left leg | Milder disease: calcified tibial arteries, one mild anterior tibial and one mild SFA narrowing | Tree and CTA views of both legs | 16–19 |

The artery close-ups (scenes 4–11) show one representative segment of the same femoro-popliteal axis, top to
bottom in the direction of flow: the **stenosis site (L1) upstream**, the **occlusion (L2) downstream**. The camera
dives into the right SFA at L1 at the end of scene 3, and scene 4 shows that site *before* the disease (the normal
reference); scenes 5–8 show it changing over time.

Rules kept in every scene: glucose stays dissolved in the blood and never forms a plug · plaque stays inside the
wall under the lining · calcium is opaque white and never confused with contrast · the stenosis keeps a continuous
channel (faster jet) · the occlusion has no passage and keeps its wall outline · collaterals bypass, they do not
reopen · rest lowers demand, the lesions remain · CTA shows the anatomy and treats nothing · the white-blue contrast
colour is a teaching overlay · calibres are drawn exaggerated for legibility (2.3× real in the leg, 3.9× in the
whole-tree and CTA views, 4.6× in the final two-tree comparison) · no numbers anywhere.
