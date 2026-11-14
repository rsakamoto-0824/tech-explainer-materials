// make-data.mjs — 動画の図に使う数値を計算して src/data.json に書く。
//   node tools/make-data.mjs
// どれも説明用に乱数で作った合成データ（実測ではない）。乱数の種を固定しているので、何度実行しても同じ結果になる。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(HERE, '..', 'src', 'data.json');

// ---- 設定 ----
const HEIGHT_SEED = 7;
const HEIGHT_N = 400;
const HEIGHT_TRUE = { weights: [0.5, 0.5], means: [158, 172], sds: [5.2, 5.6] }; // 身長（cm）。グループ0・グループ1
const EM_INIT = { weights: [0.5, 0.5], means: [150, 160], sds: [8, 8] }; // わざと外した出発点
const EM_TOLERANCE = 1e-9;
const EM_MAX_ITERATIONS = 500;
const SD_FLOOR = 0.5; // 山が1点に張りつくのを防ぐ下限（cm）
const BIC_MAX_COMPONENTS = 5;
const BIC_RANDOM_STARTS = 30;
const SCORE_SEED = 21;
const SCORE_N = 300;
const SCORE_TRUE = { mean: [60, 58], loading: [11, 9], noiseSd: 6 }; // 数学・理科の点数 = 平均 + 係数 × z + ノイズ

// ---- 乱数 ----
function makeRandom(seed) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  return { uniform, normal };
}

const normalPdf = (x, mean, sd) => Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
const round = (value, digits) => Number(value.toFixed(digits));

// ---- 混合ガウスモデル（1次元）の EM ----
function meanLogLikelihood(xs, params) {
  let total = 0;
  for (const x of xs) {
    let density = 0;
    for (let k = 0; k < params.weights.length; k++) density += params.weights[k] * normalPdf(x, params.means[k], params.sds[k]);
    total += Math.log(density);
  }
  return total / xs.length;
}

function emStep(xs, params) {
  const componentCount = params.weights.length;
  const sumResp = new Array(componentCount).fill(0);
  const sumX = new Array(componentCount).fill(0);
  const sumXX = new Array(componentCount).fill(0);
  for (const x of xs) {
    // E ステップ: 各点がどの山から来たらしいか（負担率）
    const joint = params.weights.map((w, k) => w * normalPdf(x, params.means[k], params.sds[k]));
    const density = joint.reduce((a, b) => a + b, 0);
    for (let k = 0; k < componentCount; k++) {
      const resp = joint[k] / density;
      sumResp[k] += resp;
      sumX[k] += resp * x;
      sumXX[k] += resp * x * x;
    }
  }
  // M ステップ: 負担率を重みにした割合・平均・標準偏差
  const weights = sumResp.map((s) => s / xs.length);
  const means = sumX.map((s, k) => s / sumResp[k]);
  const sds = sumXX.map((s, k) => Math.max(SD_FLOOR, Math.sqrt(Math.max(0, s / sumResp[k] - means[k] ** 2))));
  return { weights, means, sds };
}

function runEm(xs, init) {
  let params = init;
  const history = [{ ...params, logLik: meanLogLikelihood(xs, params) }];
  for (let iteration = 1; iteration <= EM_MAX_ITERATIONS; iteration++) {
    params = emStep(xs, params);
    const logLik = meanLogLikelihood(xs, params);
    const previous = history[history.length - 1].logLik;
    history.push({ ...params, logLik });
    if (Math.abs(logLik - previous) < EM_TOLERANCE) break;
  }
  return history;
}

// ---- 身長の例 ----
const heightRandom = makeRandom(HEIGHT_SEED);
const heights = [];
const heightGroup = [];
for (let i = 0; i < HEIGHT_N; i++) {
  const group = heightRandom.uniform() < HEIGHT_TRUE.weights[0] ? 0 : 1;
  heightGroup.push(group);
  heights.push(round(HEIGHT_TRUE.means[group] + HEIGHT_TRUE.sds[group] * heightRandom.normal(), 1));
}

const emHistory = runEm(heights, EM_INIT);
const emFinal = emHistory[emHistory.length - 1];

// 当てはめた結果で、各点をどちらのグループと見るか（負担率の大きいほう）と、その正解率
let correct = 0;
let ambiguous = 0;
for (let i = 0; i < HEIGHT_N; i++) {
  const joint = emFinal.weights.map((w, k) => w * normalPdf(heights[i], emFinal.means[k], emFinal.sds[k]));
  const resp1 = joint[1] / (joint[0] + joint[1]);
  if ((resp1 > 0.5 ? 1 : 0) === heightGroup[i]) correct++;
  if (Math.max(resp1, 1 - resp1) < 0.9) ambiguous++;
}

// 山の数を変えて BIC を比べる（出発点を変えて何度か走らせ、いちばん尤度が高いものを使う）
const bicRandom = makeRandom(HEIGHT_SEED + 1000);
const sortedHeights = [...heights].sort((a, b) => a - b);
const overallMean = heights.reduce((a, b) => a + b, 0) / HEIGHT_N;
const overallSd = Math.sqrt(heights.reduce((a, b) => a + (b - overallMean) ** 2, 0) / HEIGHT_N);
const bic = [];
for (let componentCount = 1; componentCount <= BIC_MAX_COMPONENTS; componentCount++) {
  let best = null;
  const finals = [];
  for (let start = 0; start < BIC_RANDOM_STARTS; start++) {
    const init = {
      weights: new Array(componentCount).fill(1 / componentCount),
      means: Array.from({ length: componentCount }, () => sortedHeights[Math.floor(bicRandom.uniform() * HEIGHT_N)]),
      sds: new Array(componentCount).fill(overallSd),
    };
    const history = runEm(heights, init);
    const final = history[history.length - 1];
    finals.push(final.logLik);
    if (!best || final.logLik > best.logLik) best = final;
  }
  const parameterCount = 3 * componentCount - 1;
  const totalLogLik = best.logLik * HEIGHT_N;
  bic.push({
    k: componentCount,
    logLik: round(totalLogLik, 2),
    parameterCount,
    bic: round(-2 * totalLogLik + parameterCount * Math.log(HEIGHT_N), 2),
    means: best.means.map((m) => round(m, 2)),
    sds: best.sds.map((s) => round(s, 2)),
    weights: best.weights.map((w) => round(w, 4)),
    worseStarts: finals.filter((value) => value < best.logLik - 1e-4).length,
  });
}

// ---- 対数尤度の地形（割合と幅を固定して、2つの山の中心だけを動かす） ----
const LANDSCAPE = { weight: 0.5, sd: 5.2, min: 148, max: 182, cells: 69 }; // 0.5 cm きざみ
const landscapeParams = (m1, m2) => ({ weights: [LANDSCAPE.weight, 1 - LANDSCAPE.weight], means: [m1, m2], sds: [LANDSCAPE.sd, LANDSCAPE.sd] });
const landscapeGrid = [];
for (let row = 0; row < LANDSCAPE.cells; row++) {
  const m2 = LANDSCAPE.min + (row * (LANDSCAPE.max - LANDSCAPE.min)) / (LANDSCAPE.cells - 1);
  const line = [];
  for (let col = 0; col < LANDSCAPE.cells; col++) {
    const m1 = LANDSCAPE.min + (col * (LANDSCAPE.max - LANDSCAPE.min)) / (LANDSCAPE.cells - 1);
    line.push(round(meanLogLikelihood(heights, landscapeParams(m1, m2)), 4));
  }
  landscapeGrid.push(line);
}
// 中心だけを更新する EM（割合と幅は固定）
function meansOnlyPath(start) {
  const pathPoints = [start];
  let [m1, m2] = start;
  for (let iteration = 0; iteration < EM_MAX_ITERATIONS; iteration++) {
    const next = emStep(heights, landscapeParams(m1, m2)).means;
    const moved = Math.hypot(next[0] - m1, next[1] - m2);
    [m1, m2] = next;
    pathPoints.push([round(m1, 3), round(m2, 3)]);
    if (moved < 1e-5) break;
  }
  return pathPoints;
}
const landscapePathA = meansOnlyPath([150, 160]);
const landscapePathB = meansOnlyPath([162, 152]);

// ---- 点数の例（連続の潜在変数が1つ） ----
const scoreRandom = makeRandom(SCORE_SEED);
const scores = [];
for (let i = 0; i < SCORE_N; i++) {
  const z = scoreRandom.normal();
  const math = SCORE_TRUE.mean[0] + SCORE_TRUE.loading[0] * z + SCORE_TRUE.noiseSd * scoreRandom.normal();
  const science = SCORE_TRUE.mean[1] + SCORE_TRUE.loading[1] * z + SCORE_TRUE.noiseSd * scoreRandom.normal();
  scores.push([round(Math.min(100, Math.max(0, math)), 1), round(Math.min(100, Math.max(0, science)), 1), round(z, 3)]);
}
// 確率的主成分分析（潜在変数1つ）の最尤推定は、共分散行列の固有値分解で求まる（Tipping & Bishop 1999）
const scoreMean = [0, 1].map((j) => scores.reduce((a, s) => a + s[j], 0) / SCORE_N);
let sxx = 0;
let sxy = 0;
let syy = 0;
for (const s of scores) {
  sxx += (s[0] - scoreMean[0]) ** 2;
  sxy += (s[0] - scoreMean[0]) * (s[1] - scoreMean[1]);
  syy += (s[1] - scoreMean[1]) ** 2;
}
sxx /= SCORE_N;
sxy /= SCORE_N;
syy /= SCORE_N;
const halfTrace = (sxx + syy) / 2;
const root = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
const eigenLarge = halfTrace + root;
const eigenSmall = halfTrace - root;
let axis = [sxy, eigenLarge - sxx];
const axisLength = Math.hypot(axis[0], axis[1]);
axis = axis.map((v) => v / axisLength);
if (axis[0] < 0) axis = axis.map((v) => -v);
const noiseVariance = eigenSmall;
const loading = axis.map((v) => v * Math.sqrt(eigenLarge - noiseVariance));
// 推定した z（事後平均）と、データを作るときに使った本当の z の相関
const loadingNorm2 = loading[0] ** 2 + loading[1] ** 2;
const zHat = scores.map((s) => (loading[0] * (s[0] - scoreMean[0]) + loading[1] * (s[1] - scoreMean[1])) / (loadingNorm2 + noiseVariance));
const zTrue = scores.map((s) => s[2]);
const meanOf = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const zHatMean = meanOf(zHat);
const zTrueMean = meanOf(zTrue);
let covZ = 0;
let varHat = 0;
let varTrue = 0;
for (let i = 0; i < SCORE_N; i++) {
  covZ += (zHat[i] - zHatMean) * (zTrue[i] - zTrueMean);
  varHat += (zHat[i] - zHatMean) ** 2;
  varTrue += (zTrue[i] - zTrueMean) ** 2;
}

const data = {
  note: '説明用に乱数で作った合成データ。tools/make-data.mjs が書く。手で直さない。',
  height: {
    n: HEIGHT_N,
    truth: HEIGHT_TRUE,
    x: heights,
    group: heightGroup,
    emInit: EM_INIT,
    emHistory: emHistory.map((h) => ({
      weights: h.weights.map((w) => round(w, 5)),
      means: h.means.map((m) => round(m, 4)),
      sds: h.sds.map((s) => round(s, 4)),
      logLik: round(h.logLik, 6),
    })),
    accuracy: round(correct / HEIGHT_N, 4),
    ambiguousShare: round(ambiguous / HEIGHT_N, 4),
    bic,
    landscape: { ...LANDSCAPE, grid: landscapeGrid, pathA: landscapePathA, pathB: landscapePathB },
  },
  score: {
    n: SCORE_N,
    truth: SCORE_TRUE,
    points: scores.map((s) => [s[0], s[1]]),
    mean: scoreMean.map((v) => round(v, 3)),
    axis: axis.map((v) => round(v, 5)),
    loading: loading.map((v) => round(v, 3)),
    noiseSd: round(Math.sqrt(noiseVariance), 3),
    zCorrelation: round(covZ / Math.sqrt(varHat * varTrue), 4),
  },
};

fs.writeFileSync(OUT_FILE, JSON.stringify(data));

// 字幕や読み上げ原稿に書く数値を確かめるための表示
console.log(`身長: n=${HEIGHT_N}  平均 ${overallMean.toFixed(2)}  標準偏差 ${overallSd.toFixed(2)}`);
console.log(`EM: ${emHistory.length - 1} 回で収束`);
for (const index of [0, 1, 2, 3, 5, 10, 20, emHistory.length - 1]) {
  const h = emHistory[index];
  if (!h) continue;
  console.log(
    `  ${String(index).padStart(3)}回目  割合 ${h.weights.map((w) => w.toFixed(3)).join(' / ')}  平均 ${h.means.map((m) => m.toFixed(2)).join(' / ')}  標準偏差 ${h.sds.map((s) => s.toFixed(2)).join(' / ')}  対数尤度 ${h.logLik.toFixed(5)}`,
  );
}
console.log(`  正解率 ${(100 * correct / HEIGHT_N).toFixed(1)}%  迷う点（負担率の最大が0.9未満）${(100 * ambiguous / HEIGHT_N).toFixed(1)}%`);
const endA = landscapePathA[landscapePathA.length - 1];
const endB = landscapePathB[landscapePathB.length - 1];
console.log(`地形: 道A ${landscapePathA.length - 1}歩で (${endA})  対数尤度 ${meanLogLikelihood(heights, landscapeParams(...endA)).toFixed(5)} / 道B ${landscapePathB.length - 1}歩で (${endB})  対数尤度 ${meanLogLikelihood(heights, landscapeParams(...endB)).toFixed(5)}`);
for (const x of [155, 168]) {
  const joint = emFinal.weights.map((w, k) => w * normalPdf(x, emFinal.means[k], emFinal.sds[k]));
  console.log(`  ${x}cm の負担率（グループ1）${(joint[0] / (joint[0] + joint[1])).toFixed(4)}`);
}
console.log('BIC:');
for (const row of bic) console.log(`  K=${row.k}  対数尤度 ${row.logLik}  パラメータ ${row.parameterCount}  BIC ${row.bic}  悪い出発点 ${row.worseStarts}/${BIC_RANDOM_STARTS}`);
console.log(`点数: 平均 ${data.score.mean.join(' / ')}  係数 ${data.score.loading.join(' / ')}  ノイズの標準偏差 ${data.score.noiseSd}  zの相関 ${data.score.zCorrelation}`);
console.log(`wrote ${OUT_FILE}`);
