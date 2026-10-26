'use strict';
// ============================================================================
// STORY CLOCK. Grid: 129.23 BPM (beat = 13/28 s), 42 bars = 78.000 s.
// Scene starts sit on the 8th-note grid; the touch, the dive, the current
// surge and the number land on downbeats. One drop, one strip, one meter and
// one glucose molecule are followed from frame one to the number 104.
// ============================================================================
const BEAT = 13 / 28, E8 = BEAT / 2, BAR = 4 * BEAT;
const barT = n => (n - 1) * BAR, e8 = n => n * E8, bt = n => n * BEAT;
const SC_T = [0, 9, 17, 26, 34, 47, 60, 73, 86, 99, 112, 125, 138, 151, 164, 177, 190, 202, 215, 228, 237, 250, 267, 280, 293, 306, 336].map(e8);
function lin(x) { return x; }
// ---------------------------------------------------------------- key moments (s)
const T_CLICK = bt(1), T_STRIP0 = SC_T[1], T_TOUCH = barT(3);
const T_DIVE0 = SC_T[3], T_DIVE1 = barT(5);
const T_FILL0 = 7.62, T_FILL1 = 10.45, T_FD = 10.21;                 // front leaves the CE region .. reaches the vent; fill detect
const T_WAKE = barT(9);                                              // the dry reagent wakes up
const T_SR0 = SC_T[7], T_SR1 = 17.95;                                // strip -> molecules (lens)
const T_DOCKG = bt(42), T_GRIP = barT(12), T_E1 = bt(45.5), T_E2 = bt(46), T_REL = barT(13);
const T_MD1 = bt(50), T_MD2 = bt(51), T_H1 = barT(14), T_H2 = bt(53);
const T_WALL = bt(70), T_SURGE = barT(19);
const T_OUT0 = SC_T[14], T_OUT1 = 38.9, T_OUT2 = 39.75, T_PORT = barT(23);
const T_OPEN0 = 41.3, T_OPEN1 = 42.35, T_AFE = barT(24);
const T_SPIKE = barT(25), T_WIN = bt(99), T_ADC0 = 47.1, T_BITS = 48.5, T_CAL = bt(110), T_104 = barT(29);
const T_CLOSE0 = SC_T[19], T_CLOSE1 = 53.55, T_UNIT = barT(30);
const T_SNAP = SC_T[20], T_D1 = 55.25, T_D2 = 55.48, T_NUM = barT(31);
const T_RECAP = SC_T[21];
const T_RES = barT(37);
const T_TURN0 = 68.25, T_TURN1 = 69.6, T_GLOW = barT(38);
const T_RET = barT(40), T_SIP1 = 73.3, T_AWAY0 = 73.45, T_AWAY1 = 74.7, T_PEN0 = barT(41), T_PEN1 = 77.55;
// ---------------------------------------------------------------- scene names (player HUD)
const SCENE_NAMES = ['FINGER PRICK', 'THE STRIP TOUCHES', 'BLOOD ENTERS THE STRIP', 'INSIDE THE TEST STRIP', 'CAPILLARY ACTION', 'GLUCOSE IN THE SAMPLE',
  'THE REACTION ZONE', 'GLUCOSE MEETS THE ENZYME', 'ENZYME REACTION', 'ELECTRONS ARE TRANSFERRED', 'MEDIATOR CARRIES THE SIGNAL', 'WORKING ELECTRODE',
  'CHEMISTRY BECOMES CURRENT', 'MORE GLUCOSE, STRONGER SIGNAL', 'SIGNAL ENTERS THE METER', 'METER READS THE SIGNAL', 'MEASURING THE RESPONSE',
  'SIGNAL BECOMES DATA', 'GLUCOSE IS CALCULATED', 'BLOOD GLUCOSE READING', '104 mg/dL', 'FROM CHEMISTRY TO ELECTRICITY', 'A CHEMICAL SIGNAL',
  'SAMPLE QUALITY MATTERS', 'ONE DROP, ONE NUMBER', 'LOOP'];
function sceneIndex(t) { for (let i = 1; i < SC_T.length; i++) if (t < SC_T[i]) return i - 1; return SC_T.length - 2; }
