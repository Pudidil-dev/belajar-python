'use strict';
const { load } = require('./engine');
const E = load();
const res = [];
for (let s = 0; s < 60; s += 1) {
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 4; k++) E.renderFrame(s + 0.13 + k * 0.21);
  const ms = Number(process.hrtime.bigint() - t0) / 4e6;
  res.push([s, ms]);
}
res.sort((a, b) => b[1] - a[1]);
console.log(res.slice(0, 25).map(([s, ms]) => `${s}s:${ms.toFixed(0)}ms`).join('  '));
const tot = res.reduce((a, b) => a + b[1], 0) / res.length;
console.log('avg ms/frame', tot.toFixed(1), ' est export min', (tot * 3600 / 60000).toFixed(1));
