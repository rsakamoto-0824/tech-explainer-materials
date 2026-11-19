// 重い計算を先にしておく: node tools/precompute.ts → src/lib/precomputed.json
// ・石上関数の X3 の総合効果を、N を増やしながら推定（乱数と Sobol 列、それぞれ 20 回）
// ・N = 4096 の Sobol 列での推定値と、ブートストラップの 95% 信頼区間
import {writeFileSync} from 'node:fs';
import {
  estimateIndices,
  indicesFromOutputs,
  ishigami,
  ishigamiExact,
  makeRandom,
  sobolPoints,
  toIshigamiInput,
} from '../src/lib/sobol.ts';

const DIMENSIONS = 3;
const SAMPLE_SIZES = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
const REPLICATES = 20; // 図に描く線の本数
const ERROR_REPLICATES = 200; // 誤差の大きさを比べる回数
const BOOTSTRAP_N = 4096;
const BOOTSTRAP_RESAMPLES = 1000;
const TARGET_INPUT = 2; // X3

const randomMatrices = (n: number, seed: number) => {
  const random = makeRandom(seed);
  const make = () => Array.from({length: n}, () => Array.from({length: DIMENSIONS}, () => random()));
  return {unitA: make(), unitB: make()};
};

const sobolMatrices = (n: number, seed: number) => {
  const random = makeRandom(seed);
  const shift = Array.from({length: 2 * DIMENSIONS}, () => Math.floor(random() * 4294967296));
  const points = sobolPoints(n, 2 * DIMENSIONS, shift);
  return {unitA: points.map((p) => p.slice(0, DIMENSIONS)), unitB: points.map((p) => p.slice(DIMENSIONS))};
};

const estimate = (matrices: {unitA: number[][]; unitB: number[][]}) =>
  estimateIndices(matrices.unitA, matrices.unitB, ishigami, toIshigamiInput);

const exact = ishigamiExact();
const truth = exact.totalEffect[TARGET_INPUT];

const fans = {random: [] as number[][], sobol: [] as number[][]};
for (let r = 0; r < REPLICATES; r++) {
  fans.random.push(SAMPLE_SIZES.map((n) => estimate(randomMatrices(n, 1000 + r)).totalEffect[TARGET_INPUT]));
  fans.sobol.push(SAMPLE_SIZES.map((n) => estimate(sobolMatrices(n, 2000 + r)).totalEffect[TARGET_INPUT]));
}

// 誤差の大きさ（2乗平均の平方根）を、N ごとに比べる
const rmse = {random: [] as number[], sobol: [] as number[]};
for (const n of SAMPLE_SIZES) {
  let sumRandom = 0;
  let sumSobol = 0;
  for (let r = 0; r < ERROR_REPLICATES; r++) {
    sumRandom += (estimate(randomMatrices(n, 5000 + r)).totalEffect[TARGET_INPUT] - truth) ** 2;
    sumSobol += (estimate(sobolMatrices(n, 9000 + r)).totalEffect[TARGET_INPUT] - truth) ** 2;
  }
  rmse.random.push(Math.sqrt(sumRandom / ERROR_REPLICATES));
  rmse.sobol.push(Math.sqrt(sumSobol / ERROR_REPLICATES));
}

// ブートストラップ：行を重複を許して選び直し、指数を計算しなおす
const result = estimate(sobolMatrices(BOOTSTRAP_N, 77));
const random = makeRandom(4242);
const samples = {first: [[], [], []] as number[][], totalEffect: [[], [], []] as number[][]};
for (let b = 0; b < BOOTSTRAP_RESAMPLES; b++) {
  const rows = Array.from({length: BOOTSTRAP_N}, () => Math.floor(random() * BOOTSTRAP_N));
  const indices = indicesFromOutputs(result.outputsA, result.outputsB, result.outputsAB, rows);
  for (let i = 0; i < DIMENSIONS; i++) {
    samples.first[i].push(indices.first[i]);
    samples.totalEffect[i].push(indices.totalEffect[i]);
  }
}
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};
const interval = (values: number[]) => [percentile(values, 0.025), percentile(values, 0.975)];

const round = (value: number) => Number(value.toFixed(5));
const output = {
  sampleSizes: SAMPLE_SIZES,
  truth: round(truth),
  fans: {random: fans.random.map((row) => row.map(round)), sobol: fans.sobol.map((row) => row.map(round))},
  rmse: {random: rmse.random.map(round), sobol: rmse.sobol.map(round)},
  bootstrap: {
    n: BOOTSTRAP_N,
    first: result.first.map(round),
    totalEffect: result.totalEffect.map(round),
    firstInterval: samples.first.map((v) => interval(v).map(round)),
    totalEffectInterval: samples.totalEffect.map((v) => interval(v).map(round)),
  },
};
writeFileSync(new URL('../src/lib/precomputed.json', import.meta.url), JSON.stringify(output, null, 1) + '\n');
console.log('truth', truth.toFixed(4));
console.log('rmse random', rmse.random.map((v) => v.toFixed(3)).join(' '));
console.log('rmse sobol ', rmse.sobol.map((v) => v.toFixed(3)).join(' '));
console.log('bootstrap', JSON.stringify(output.bootstrap));
