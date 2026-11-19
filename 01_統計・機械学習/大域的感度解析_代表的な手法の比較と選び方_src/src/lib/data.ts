// 画面に出す例のデータ（種を固定した乱数で作るので、毎回同じになる）
import {morrisTrajectories, sixExact} from './gsa.ts';
import precomputed from './precomputed.json' with {type: 'json'};
import {binMeans, ishigami, ishigamiExact, makeRandom, mean, toIshigamiInput, variance} from './sobol.ts';

export const PI = Math.PI;
export const ISHIGAMI = ishigamiExact();
export const SIX = sixExact();
export const PRECOMPUTED = precomputed;

// 0〜1 の一様乱数の点（絵の飾り用）
export const makeRandomPoints = (count: number, seed: number): [number, number][] => {
  const random = makeRandom(seed);
  return Array.from({length: count}, () => [random(), random()]);
};

// ---- 第1章・第2章：石上関数の散布図（tools/precompute.ts の回帰・相関と同じ1000点） ----
export const SCATTER_COUNT = 1000;
export const SCATTER_BINS = 20;
export const SCATTER = (() => {
  const random = makeRandom(101);
  const xs = Array.from({length: SCATTER_COUNT}, () => toIshigamiInput([random(), random(), random()]));
  const ys = xs.map(ishigami);
  const sdY = Math.sqrt(variance(ys));
  const meanY = mean(ys);
  const perInput = [0, 1, 2].map((i) => {
    const column = xs.map((x) => x[i]);
    const bins = binMeans(column, ys, -PI, PI, SCATTER_BINS);
    // 回帰直線（標準化回帰係数を元の目盛りに戻す）
    const slope = (precomputed.regression.src[i] * sdY) / Math.sqrt(variance(column));
    return {bins, slope, intercept: meanY - slope * mean(column)};
  });
  return {xs, ys, perInput};
})();

// ---- 第3章：2入力の Morris の道のり（絵の例） ----
export const MORRIS_PICTURE = morrisTrajectories(4, 2, 4, makeRandom(17));
