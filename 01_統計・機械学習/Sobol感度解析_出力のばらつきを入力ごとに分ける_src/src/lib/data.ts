// 画面に出す例のデータ（種を固定した乱数で作るので、毎回同じになる）
import precomputed from './precomputed.json' with {type: 'json'};
import {binMeans, ishigami, ishigamiExact, makeRandom, mean, sobolPoints, variance} from './sobol.ts';

export const PI = Math.PI;
export const ISHIGAMI = ishigamiExact();
export const PRECOMPUTED = precomputed;

// 0〜1 の一様乱数の点（絵の飾り用）
export const makeRandomPoints = (count: number, seed: number): [number, number][] => {
  const random = makeRandom(seed);
  return Array.from({length: count}, () => [random(), random()]);
};

// ---- 第1章：Y = X1 × X2 ----
export const PRODUCT_COUNT = 1500;
export const PRODUCT = (() => {
  const random = makeRandom(11);
  const xs = Array.from({length: PRODUCT_COUNT}, () => [2 * random() - 1, 2 * random() - 1]);
  return {xs, ys: xs.map(([a, b]) => a * b)};
})();

// ---- 第2章：石上関数の散布図 ----
export const SCATTER_COUNT = 2000;
export const SCATTER_BINS = 24;
export const SCATTER = (() => {
  const random = makeRandom(21);
  const xs = Array.from({length: SCATTER_COUNT}, () => [0, 1, 2].map(() => -PI + 2 * PI * random()));
  const ys = xs.map(ishigami);
  const total = variance(ys);
  const average = mean(ys);
  const perInput = [0, 1, 2].map((i) => {
    const column = xs.map((x) => x[i]);
    const bins = binMeans(column, ys, -PI, PI, SCATTER_BINS);
    // 区間の平均の分散（点の数で重みをつける）÷ 全体の分散
    const between = bins.reduce((sum, b) => sum + b.count * (b.mean - average) ** 2, 0) / SCATTER_COUNT;
    return {bins, firstEstimate: between / total};
  });
  return {xs, ys, total, perInput};
})();

// ---- 第5章：列の入れかえを見せる小さな行列（8行） ----
export const MATRIX_ROWS = 8;
export const MATRICES = (() => {
  const random = makeRandom(31);
  const make = () => Array.from({length: MATRIX_ROWS}, () => [0, 1, 2].map(() => random()));
  const unitA = make();
  const unitB = make();
  const toInput = (row: number[]) => row.map((u) => -PI + 2 * PI * u);
  const swapped = (i: number) => unitA.map((row, j) => row.map((v, k) => (k === i ? unitB[j][i] : v)));
  const outA = unitA.map((row) => ishigami(toInput(row)));
  const outAB3 = swapped(2).map((row) => ishigami(toInput(row)));
  return {unitA, unitB, swapped, outA, outAB3};
})();

// ---- 第6章：乱数と Sobol 列の点 ----
export const POINT_COUNT = 256;
export const UNIFORM_POINTS = (() => {
  const random = makeRandom(41);
  return Array.from({length: POINT_COUNT}, () => [random(), random()]);
})();
export const SOBOL_POINTS = sobolPoints(POINT_COUNT, 2);

// ---- 第7章：入力が6つの例 Y = 2X1 + 1.5X2 + 3X1X3 + 0.3X4 + 0.1X5 + 0.1X6（どれも −1〜1 の一様分布） ----
// 一様分布 U(−1, 1) の分散は 1/3、2つの積の分散は 1/9
export const SIX_LINEAR = [2, 1.5, 0, 0.3, 0.1, 0.1];
export const SIX_INTERACTION = 3; // X1 × X3 の係数
export const SIX = (() => {
  const parts = SIX_LINEAR.map((c) => (c * c) / 3);
  const interaction = (SIX_INTERACTION * SIX_INTERACTION) / 9;
  const total = parts.reduce((s, v) => s + v, 0) + interaction;
  const first = parts.map((v) => v / total);
  const totalEffect = parts.map((v, i) => (v + (i === 0 || i === 2 ? interaction : 0)) / total);
  return {total, first, totalEffect};
})();
