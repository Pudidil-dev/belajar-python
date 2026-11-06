'use strict';
// ============================================================================
// THE MOLECULAR WORLD: the cross-section drawn back to front, and its camera.
// Outside (navy, deepening away from the cell) above the membrane, cytoplasm
// (green) below; drifting specks keep the environment moving while the
// subject settles.
// ============================================================================
function molBG(cam, t) {
  for (let y = 0; y < H; y++) {
    const wy = cam.wy(y + 0.5); let c;
    if (wy < 0) { const k = clamp((-wy - 40) / 460, 0, 1); c = mixc(P.N3, P.BG, Math.round(k * 7) / 7); }
    else { const k = clamp((wy - 24) / 200, 0, 1); c = mixc(P.CP2, P.CP0, Math.round(k * 5) / 5); }
    buf.fill(c, y * W, (y + 1) * W);
  }
}
// specks: small solvent particles on a slower parallax plane (they drift on their own)
function molSpecks(cam, t) {
  const par = 0.6, ox = cam.cx * par, oy = cam.cy * par;
  for (let i = 0; i < 70; i++) {
    const bx = hash2(i, 3) * 900, by = hash2(i, 5) * 1500;
    const x = ((bx + t * (4 + hash2(i, 7) * 5) - ox * cam.z) % 900 + 900) % 900 - 270, y = ((by + Math.sin(t * 0.5 + i) * 6 - oy * cam.z) % 1500 + 1500) % 1500 - 430;
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const inside = cam.wy(y) > 26, big = hash2(i, 9) < 0.3;
    const c = inside ? (big ? P.CP3 : P.CP3) : (big ? P.N5 : P.N4);
    if (big) { disc(x, y, 1.6, c); pset(x - 1, y - 1, inside ? P.CP4 : P.N5); } else rect(x, y, x + 2, y + 2, c);
  }
}
// lipid heads are left out where membrane proteins cross the bilayer
function memSkip(t) {
  const sp = [[ST.mraY - 19, ST.mraY + 8], [ST.murJ - 19, ST.murJ + 19], [ST.phos - 9, ST.phos + 9], [ST.gt - 8, ST.gt + 3]];
  for (let i = 0; i < 4; i++) { const x = pbpX(i, t) - 1; sp.push([x - 6, x + 6]); }
  return x => { for (const s of sp) if (x >= s[0] && x <= s[1]) return true; return false; };
}
function drawMolWorld(cam, t) {
  molBG(cam, t);
  molSpecks(cam, t);
  drawMembrane(cam, t, { skip: memSkip(t) });
  drawCarrier(cam, t, 'chain');
  drawMraY(cam, t); drawMurG(cam, t);
  const flipping = t > EV.flipIn + 0.08 && t < EV.flipOut - 0.08;
  if (!flipping) drawMurJ(cam, t);
  drawPhosphatase(cam, t); drawGT(cam, t);
  for (let i = 0; i < 4; i++) drawPBP(cam, i, t);
  drawPathway(cam, t);
  drawCarrier(cam, t, 'head');
  if (flipping) drawMurJ(cam, t);
  drawMatureWall(cam, t, { sag: (x, y) => wallSag(x, y, t), skip0: nearAcceptor });
  drawAcceptors(cam, t);
  drawNewStrand(cam, t);
  drawHeroReaction(cam, t);
  drawBlockedDonor(cam, t);
  drawAmoxAll(cam, t);
  drawHydrolases(cam, t);
}
// ---------------------------------------------------------------- the molecular camera (18.4-52.6 s): [t, cx, cy, zoom, ease]
const MOL_CAM = [
  [18.3, -640, -262, 1.2], [20.15, -642, -236, 1.6],                                  // S10 the mesh, slow push
  [20.75, -690, 106, 2.3], [21.75, -616, 100, 2.3],                                   // S11 dive into the cytoplasm, pan along the ligases
  [22.45, -468, 32, 2.9], [23.9, -456, 40, 2.9],                                      // S12 MraY
  [24.4, -345, 40, 3.0], [25.9, -342, 38, 3.5],                                       // S13 MurG, slow push
  [26.4, -236, 8, 3.0], [27.3, -234, 0, 3.0], [27.95, -150, -24, 3.0],                // S14 MurJ flip, pan on
  [28.35, -108, -44, 3.0], [29.7, -100, -50, 3.6],                                    // S15 GT, slow push
  [30.35, -150, -12, 3.0], [31.45, -152, -6, 3.0], [32.35, -10, -72, 1.5],            // S16 recycling, then the pull-back
  [34.2, 40, -93, 5.6], [36.0, 40, -94, 5.7], [37.9, 38, -97, 5.5],                   // S17 pan and ease in on the PBP; S18-19 stable frames
  [38.75, 96, -124, 1.22], [39.6, 94, -126, 1.2],                                     // S20 pull back: links form along the wall
  [40.3, 62, -352, 1.7], [42.2, 54, -112, 2.4],                                       // S21 follow a drug molecule down
  [42.6, 51, -96, 7.2], [45.95, 52, -95, 7.3],                                        // S22 fast push, S23 stable
  [46.6, 66, -92, 5.5], [48.0, 64, -93, 5.5],                                         // S24 the blocked attempt
  [48.8, -18, -104, 1.45], [49.9, -14, -106, 1.4],                                    // S25 pull back: the strand end, unlinked stems, blocked PBPs
  [50.4, 214, -172, 1.6], [51.95, 236, -170, 1.6], [52.6, 236, -170, 1.0],            // S26 remodeling, start of the pull-out
];
const molCam = t => camTrack(MOL_CAM, t);
