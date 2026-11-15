// すその確率の曲線と、点の例に使う乱数の種を計算して src/lib/tail.json に書く: node tools/precompute.ts
import {writeFileSync} from 'node:fs';
import {gaussianTailProbability, t3TailProbability, makeNormal, normalCdf, t3Cdf} from '../src/lib/stats.ts';

const RHO = 0.7;
const COUNT = 5000;
const Q = 0.99;
const curve = Array.from({length: 31}, (_, i) => {
  const k = 1 + (3 * i) / 30;
  const q = 1 - 10 ** -k;
  return {k, gauss: gaussianTailProbability(q, RHO), t: t3TailProbability(q, RHO)};
});
// t コピュラのすその依存係数の理論値: 2 T_{ν+1}(-sqrt((ν+1)(1-ρ)/(1+ρ)))、ν = 3。T_4 は数値積分で求める
const t4Pdf = (x: number) => (3 / 8) * (1 + (x * x) / 4) ** -2.5;
const upper = Math.sqrt((4 * (1 - RHO)) / (1 + RHO));
let area = 0;
const steps = 200000;
for (let i = 0; i < steps; i++) area += t4Pdf(upper + ((i + 0.5) * 400) / steps) * (400 / steps);
const tLimit = 2 * area;

const expectedGauss = COUNT * (1 - Q) * gaussianTailProbability(Q, RHO);
const expectedT = COUNT * (1 - Q) * t3TailProbability(Q, RHO);
const counts = (seed: number) => {
  const normal = makeNormal(seed);
  let gauss = 0;
  let t = 0;
  for (let i = 0; i < COUNT; i++) {
    const e1 = normal();
    const e2 = normal();
    const z2 = RHO * e1 + Math.sqrt(1 - RHO * RHO) * e2;
    if (normalCdf(e1) > Q && normalCdf(z2) > Q) gauss++;
    const scale = Math.sqrt((normal() ** 2 + normal() ** 2 + normal() ** 2) / 3);
    if (t3Cdf(e1 / scale) > Q && t3Cdf(z2 / scale) > Q) t++;
  }
  return {gauss, t};
};
let seed = 1;
while (true) {
  const c = counts(seed);
  if (c.gauss === Math.round(expectedGauss) && c.t === Math.round(expectedT)) break;
  seed++;
}
writeFileSync(new URL('../src/lib/tail.json', import.meta.url), JSON.stringify({seed, tLimit, expectedGauss, expectedT, curve}, null, 1));
console.log({seed, tLimit, expectedGauss, expectedT, last: curve[curve.length - 1], first: curve[0], mid: curve[10], mid2: curve[20]});
