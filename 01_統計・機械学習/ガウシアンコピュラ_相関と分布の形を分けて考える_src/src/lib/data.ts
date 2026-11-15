// 動画で使う例のデータ（すべて種を固定した乱数で作る、説明用の架空データ）
import {
  crowdInv,
  makeNormal,
  normalCdf,
  normalInv,
  pearson,
  ranks,
  t3Cdf,
  waitInv,
} from './stats.ts';
import tail from './tail.json' with {type: 'json'};

export const RHO = 0.7;
export const SAMPLE_COUNT = 400;

// 独立な標準正規乱数の組（ε1, ε2）。相関は後から付ける
const normal = makeNormal(20261114);
export const EPS1 = Array.from({length: SAMPLE_COUNT}, () => normal());
export const EPS2 = Array.from({length: SAMPLE_COUNT}, () => normal());

// 相関 rho の正規乱数 z = (ε1, rho ε1 + sqrt(1 - rho^2) ε2)
export const zPair = (index: number, rho: number): [number, number] => [
  EPS1[index],
  rho * EPS1[index] + Math.sqrt(1 - rho * rho) * EPS2[index],
];

export type Sample = {
  z1: number;
  z2: number;
  u1: number;
  u2: number;
  crowd: number; // 混雑率（0〜1）
  wait: number; // 待ち時間（分）
  uIndependent: number; // つながりがないときの u2
};

export const SAMPLES: Sample[] = EPS1.map((_, i) => {
  const [z1, z2] = zPair(i, RHO);
  const u1 = normalCdf(z1);
  const u2 = normalCdf(z2);
  return {z1, z2, u1, u2, crowd: crowdInv(u1), wait: waitInv(u2), uIndependent: normalCdf(EPS2[i])};
});

// 追いかける1点（z を切りのよい値に決める）
const trackedZ1 = 1.2;
const trackedZ2 = 0.6;
export const TRACKED = {
  z1: trackedZ1,
  z2: trackedZ2,
  u1: normalCdf(trackedZ1),
  u2: normalCdf(trackedZ2),
  crowd: crowdInv(normalCdf(trackedZ1)),
  wait: waitInv(normalCdf(trackedZ2)),
};

// 当てはめ：生データの相関係数と、順位 → 正規スコアの相関係数
const crowdValues = SAMPLES.map((s) => s.crowd);
const waitValues = SAMPLES.map((s) => s.wait);
export const RAW_CORRELATION = pearson(crowdValues, waitValues);
export const LOG_CORRELATION = pearson(crowdValues, waitValues.map((w) => Math.log(w)));
const toScores = (values: number[]) => ranks(values).map((r) => normalInv(r / (values.length + 1)));
export const SCORE1 = toScores(crowdValues);
export const SCORE2 = toScores(waitValues);
export const RANK_U1 = ranks(crowdValues).map((r) => r / (SAMPLE_COUNT + 1));
export const RANK_U2 = ranks(waitValues).map((r) => r / (SAMPLE_COUNT + 1));
export const SCORE_CORRELATION = pearson(SCORE1, SCORE2);

// すその比較：ガウシアンコピュラと、自由度3の t コピュラ（どちらも相関 0.7）
export const TAIL_COUNT = 5000;
export const TOP_Q = 0.99;
export const makeTailSamples = (seed: number) => {
  const tailNormal = makeNormal(seed);
  const gauss: [number, number][] = [];
  const t: [number, number][] = [];
  for (let i = 0; i < TAIL_COUNT; i++) {
    const e1 = tailNormal();
    const e2 = tailNormal();
    const z1 = e1;
    const z2 = RHO * e1 + Math.sqrt(1 - RHO * RHO) * e2;
    gauss.push([normalCdf(z1), normalCdf(z2)]);
    // カイ二乗（自由度3）を3で割った値の平方根で割ると t 分布になる
    const chi = tailNormal() ** 2 + tailNormal() ** 2 + tailNormal() ** 2;
    const scale = Math.sqrt(chi / 3);
    t.push([t3Cdf(z1 / scale), t3Cdf(z2 / scale)]);
  }
  const countTop = (points: [number, number][]) => points.filter(([a, b]) => a > TOP_Q && b > TOP_Q).length;
  return {gauss, t, topGauss: countTop(gauss), topT: countTop(t)};
};
// 種と曲線は tools/precompute.ts が書き出す（種は、角の点の数が理論の期待値に近いものを選んでいる）
const tailSamples = makeTailSamples(tail.seed);
export const TAIL_GAUSS = tailSamples.gauss;
export const TAIL_T = tailSamples.t;
export const TOP_COUNT_GAUSS = tailSamples.topGauss;
export const TOP_COUNT_T = tailSamples.topT;
// すその確率の曲線。横軸 k は「上位 10^(-k)」（k = 1 が上位10%、k = 4 が上位0.01%）
export const TAIL_CURVE: {k: number; gauss: number; t: number}[] = tail.curve;
export const T_TAIL_LIMIT: number = tail.tLimit;
