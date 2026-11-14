// S02 WHAT THE BULGE IS (4–8 s): a flat side cutaway of the parent artery (the right M1, from the right), its bifurcation
// and the sac: neck and dome, the artery wall in three layers, the dome's wall thinner. Muted-red blood cells stream
// along with the heartbeat; most go on into the two branches, a few swirl through the sac and leave again. The sac stays
// exactly the same size: nothing grows, nothing bursts. Camera locked.
(() => {
const warp = t => t + 0.05 * Math.sin(U.TAU * (t - 0.05));      // pulsatile: the cells surge once per beat (1 s)
SC['s02_bulge'] = {
  draw(c, t, S) {
    FLOW.draw(c, { t: warp(S.t) });
    CAP.ctx(c, t, { text: 'ANEVRİZMA', t0: 0.35, t1: 3.6 });
    CAP.part(c, t, { text: 'BOYUN', ax: 156, ay: 312, x: 214, y: 236, t0: 1.2, t1: 3.6, col: 'p3', lineCol: 'g7' });
    CAP.part(c, t, { text: 'GÜNBƏZ', ax: 84, ay: 372, x: 30, y: 452, t0: 1.7, t1: 3.6, col: 'p3', lineCol: 'g7' });
  },
  cues: [[0, 'flow_bed', 0.7, 0, 4], [0.05, 'beat', 0.7], [1.05, 'beat', 0.6], [2.05, 'beat', 0.6], [3.05, 'beat', 0.6], [0.35, 'type', 0.4], [1.2, 'tag', 0.5, -0.3], [1.7, 'tag', 0.5, -0.5], [2.4, 'swirl', 0.6, -0.5, 1.2]],
  xin: 0.35,
};
})();
