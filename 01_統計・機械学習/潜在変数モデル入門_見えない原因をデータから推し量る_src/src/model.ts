// model.ts — 図で共通に使うデータと計算（身長の例の混合ガウスモデル）。
import data from './data.json';
import { linear, normalPdf } from './kit';

export const HEIGHT = data.height;
export const SCORE = data.score;

export type MixtureParams = { weights: number[]; means: number[]; sds: number[] };
export const EM_HISTORY: (MixtureParams & { logLik: number })[] = HEIGHT.emHistory;
export const FINAL = EM_HISTORY[EM_HISTORY.length - 1];

// 身長の軸の範囲（cm）とヒストグラムの区間の幅
export const X_MIN = 138;
export const X_MAX = 192;
export const BIN_WIDTH = 2;
export const X_TICKS = [140, 150, 160, 170, 180, 190];

/** 区間ごとの人数。group を渡すと、そのグループだけ数える */
export const histogram = (group?: number) => {
  const counts = new Array(Math.round((X_MAX - X_MIN) / BIN_WIDTH)).fill(0);
  HEIGHT.x.forEach((x, i) => {
    if (group !== undefined && HEIGHT.group[i] !== group) return;
    counts[Math.floor((x - X_MIN) / BIN_WIDTH)]++;
  });
  return counts as number[];
};
export const COUNTS_ALL = histogram();
export const COUNTS_GROUP = [histogram(0), histogram(1)];
/** 人数を、確率密度の高さに直す係数 */
export const COUNT_TO_DENSITY = 1 / (HEIGHT.n * BIN_WIDTH);

/** 割合を掛けた、k 番めの山の高さ */
export const weighted = (params: MixtureParams, k: number, x: number) => params.weights[k] * normalPdf(x, params.means[k], params.sds[k]);
export const mixture = (params: MixtureParams, x: number) => weighted(params, 0, x) + weighted(params, 1, x);
/** グループ2の負担率 */
export const resp2 = (params: MixtureParams, x: number) => weighted(params, 1, x) / mixture(params, x);

/** 2組のパラメータの間 */
export const lerpParams = (a: MixtureParams, b: MixtureParams, k: number): MixtureParams => ({
  weights: a.weights.map((v, i) => v + (b.weights[i] - v) * k),
  means: a.means.map((v, i) => v + (b.means[i] - v) * k),
  sds: a.sds.map((v, i) => v + (b.sds[i] - v) * k),
});

/** 身長のグラフの目盛り合わせ */
export const heightScales = (left: number, right: number, top: number, bottom: number, yMax: number) => ({
  sx: linear(X_MIN, X_MAX, left, right),
  sy: linear(0, yMax, bottom, top),
});
