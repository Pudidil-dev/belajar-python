'use strict';
// ============================================================================
// TIME: 120 BPM with a half-time feel, 30 bars of 2 s = 60.000 s — one bar per
// technical scene. The scene table and the EVENT TABLE that both the picture
// and the SFX read (every event time is a whole frame at 60 fps).
// ============================================================================
const NBARS = 30, BEAT = DUR / (NBARS * 4), BPM = 60 / BEAT, BAR = 4 * BEAT, E8 = BEAT / 2;
const lin = x => x; const barT = b => (b - 1) * BAR;
const SC_T = Array.from({ length: 31 }, (_, i) => 2 * i);
const SEQ = { A: [0, 6], B: [6, 14], C: [14, 20], D: [20, 32], E: [32, 42], F: [42, 52], G: [52, 56], H: [56, 60] };
const SCENE_NAMES = ['INSTANT BACTERIAL RUPTURE', 'THE MICROSCOPIC ENVIRONMENT', 'THE MEDICINE', 'CAPSULE DISSOLUTION', 'INTESTINAL ABSORPTION',
  'BLOOD DISTRIBUTION', 'ARRIVAL AT THE BACTERIA', 'THE GROWING BACTERIUM', 'THE CELL-WALL CUTAWAY', 'PEPTIDOGLYCAN STRUCTURE',
  'PRECURSOR FORMATION', 'LIPID I', 'LIPID II', 'LIPID II TRANSLOCATION', 'GLYCAN POLYMERIZATION', 'CARRIER RECYCLING',
  'PENICILLIN-BINDING PROTEIN', 'NORMAL DONOR REACTION', 'A PEPTIDE CROSS-LINK', 'A STRONGER WALL', 'AMOXICILLIN APPROACHES',
  'BETA-LACTAM RECOGNITION', 'BETA-LACTAM RING OPENING', 'THE ENZYME IS INHIBITED', 'FAILED CROSS-LINKING', 'REMODELING CONTINUES',
  'OSMOTIC INSTABILITY', 'BACTERIAL LYSIS', 'THROUGH THE MICROSCOPIC WORLD', 'RETURN TO THE OPENING'];
function sceneIndex(t) { let i = 0; while (i + 1 < SC_T.length - 1 && t >= SC_T[i + 1]) i++; return i; }
const range = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(Math.round(x * 60) / 60); return o; };
const EV = {
  // A — the hook: the loop cell's membrane tears, its contents flow out; the camera backs away; match cut to the capsule
  pulse0: 0.0, tear0: 0.95, spill0: 1.2, pull: 2.0, drift: 3.2, match: 4.3, lips: 4.75, swallow: 5.2,
  // B — the drug's journey: stomach, gut lining, blood, out of a capillary
  splash: 6.2, shell: 6.6, drugOut: 7.1, gut: 8.1, villus: 8.8, cross: 9.3, blood: 10.1, rbc: 11.0, capillary: 12.1, seep: 12.7, diffuse: 13.4,
  // C — the bacterial envelope
  grow: 14.2, band: 15.2, cut: 16.2, layers: 17.0, zoom: 18.1, mesh: 18.8,
  // D — wall precursors: Mur ligases (4 additions), MraY (Lipid I), MurG (Lipid II), MurJ (flip), GT (strand), recycling
  dive: 20.2, aa: [20.55, 20.9, 21.25, 21.6], dock: 22.4, transfer: 23.0, ump: 23.3, udpglc: 24.5, sugar: 25.0, udp: 25.3,
  flipIn: 26.4, flip: 26.85, flipOut: 27.3, gtBind: 28.4, polymer: 29.0, release: 29.4, dephos: 30.4, flipBack: 31.0, reveal: 31.6,
  // E — the PBP: a normal cross-link, then more of them; amoxicillin arrives
  pbpSlide: 32.4, pbpBind: 33.3, serAttack: 34.5, dalaOut: 35.0, acyl: 35.4, acceptor: 36.5, xlink: 37.0, pbpFree: 37.4,
  xlinks: [38.4, 38.9, 39.4], amoxIn: 40.3, amoxDown: 41.0, amoxNear: 41.7,
  // F — inhibition: docking, the beta-lactam ring opens on the serine, the enzyme stays blocked; links go missing; remodeling cuts
  dock2: 42.5, fit: 43.3, attack2: 44.6, ringOpen: 45.0, covalent: 45.4, donorTry: 46.5, blocked: 47.2, newUnit: 48.4, unlinked: 49.0,
  cuts: [50.3, 50.6, 50.9, 51.2, 51.5, 51.8], gap: 51.6,
  // G — failure; H — on to the next cell (its wall gives just before the loop point)
  strain: 52.3, bulge: 53.2, lysis: 54.75, outflow: 55.1, glide: 56.3, nextCell: 57.2, orbit: 58.4, weak: 59.3, prePulse: 59.6,
};
