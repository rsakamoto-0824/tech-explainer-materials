// make-data.mjs — 説明用の合成データ（8校のテストの点数）を作り、階層ベイズモデルを実際に推定して、図に使う数値を src/data.json に書く。
//   node tools/make-data.mjs            … 数値を計算して src/data.json に書く
//   node tools/make-data.mjs --search   … 表示用のデータの乱数の種の候補を一覧する（書き込みはしない）
// 外部のライブラリは使わず、ギブスサンプリング（MCMC の一種）をこのファイルの中で行う。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'src', 'data.json');

// ---- 設定 ----
// 学校の名前と、受験した人数（少ない学校と多い学校が混ざるようにしている）
const SCHOOLS = [
  { name: 'A', n: 15 },
  { name: 'B', n: 30 },
  { name: 'C', n: 3 },
  { name: 'D', n: 8 },
  { name: 'E', n: 40 },
  { name: 'F', n: 20 },
  { name: 'G', n: 4 },
  { name: 'H', n: 12 },
];
// データを作るときの「本当の値」（推定するときは使わない）
const TRUE_MU = 65; // 学校全体の平均的な実力
const TRUE_TAU = 6; // 学校の間の実力のばらつき（標準偏差）
const TRUE_SIGMA = 15; // 同じ学校の中での、生徒の点数のばらつき（標準偏差）
const SCORE_MIN = 0;
const SCORE_MAX = 100;
const DATA_SEED = 145; // 表示用のデータの乱数の種（--search で選んだ。理由は README を参照）

// ギブスサンプリング
const CHAINS = 4;
const ITERATIONS = 6000;
const BURN_IN = 1000;
const MCMC_SEED = 7;
const CHAIN_STARTS = [
  { mu: 30, tau: 1, sigma: 5 },
  { mu: 95, tau: 40, sigma: 40 },
  { mu: 50, tau: 15, sigma: 25 },
  { mu: 80, tau: 3, sigma: 10 },
];
const TRACE_ITERATIONS = 300; // 動く図に使う、はじめの回数
const HIST_BINS = { mu: { from: 50, to: 80, width: 1 }, tau: { from: 0, to: 25, width: 0.5 } };
const FUNNEL_POINTS = 1600;

// 「もう一度テストをしたら」の図
const RESAMPLE_COUNT = 24;
const RESAMPLE_SEED = 21;

// τ をいろいろ変えたときの図（σ は学校の中のばらつきの推定値に固定する）
const TAU_GRID_MAX = 30;
const TAU_GRID_STEPS = 300;

// 2つの変数でのギブスサンプリングの例（相関のある2次元の正規分布）
const TOY_RHO = 0.85;
const TOY_START = [-2.3, 2.1];
const TOY_STEPS = 14;
const TOY_SAMPLES = 400;
const TOY_SEED = 3;

// 本当の値との比較（同じ設定でデータを作り直して、何回も推定する）
const REPEATS = 500;
const REPEAT_SEED = 1001;
const REPEAT_ITERATIONS = 3000;
const REPEAT_BURN_IN = 600;

// 学校の間の違いが小さい場合・大きい場合
const SCENARIOS = [
  { key: 'similar', tau: 1.5, seed: 301 },
  { key: 'different', tau: 12, seed: 303 },
];

// ---- 乱数 ----
function makeRng(seed) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  // ガンマ分布（Marsaglia と Tsang の方法）。shape は 1 以上で使う
  const gamma = (shape) => {
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x;
      let v;
      do {
        x = normal();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = uniform();
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  };
  // 逆ガンマ分布（shape, scale）
  const invGamma = (shape, scale) => scale / gamma(shape);
  return { uniform, normal, gamma, invGamma };
}

const sum = (values) => values.reduce((a, b) => a + b, 0);
const mean = (values) => sum(values) / values.length;
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const quantile = (sorted, q) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const summarize = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { mean: round(mean(values)), median: round(quantile(sorted, 0.5)), lo: round(quantile(sorted, 0.025)), hi: round(quantile(sorted, 0.975)) };
};

// ---- データを作る ----
function drawScore(rng, theta, sigma) {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(theta + sigma * rng.normal())));
}

function makeDataset(seed, tau) {
  const rng = makeRng(seed);
  return SCHOOLS.map((school) => {
    const theta = TRUE_MU + tau * rng.normal();
    const scores = Array.from({ length: school.n }, () => drawScore(rng, theta, TRUE_SIGMA));
    return { name: school.name, n: school.n, theta, scores, mean: mean(scores) };
  });
}

/** 学校の中のばらつき σ の推定値（学校ごとの平均からのずれを、全部まとめて測る） */
function pooledSigma(schools) {
  let squares = 0;
  let count = 0;
  for (const school of schools) {
    for (const score of school.scores) squares += (score - school.mean) ** 2;
    count += school.n - 1;
  }
  return Math.sqrt(squares / count);
}

const grandMean = (schools) => mean(schools.flatMap((school) => school.scores));

// ---- ギブスサンプリング ----
// モデル: y_ij ~ N(θ_j, σ²)、θ_j ~ N(μ, τ²)
// 事前分布: μ は一様、τ は 0 以上で一様、σ は log σ が一様（p(σ²) ∝ 1/σ²）
// どの変数も、ほかを固定したときの分布（条件付き分布）が、正規分布か逆ガンマ分布になるので、そこから順に引く。
function runGibbs(schools, { iterations, burnIn, start, rng, keepTrace = 0, onSample }) {
  const J = schools.length;
  const N = sum(schools.map((school) => school.n));
  let mu = start.mu;
  let tau = start.tau;
  let sigma = start.sigma;
  const theta = new Array(J).fill(0);
  // 動く図のために、出発点も記録しておく
  const trace = keepTrace > 0 ? [{ mu: round(mu, 2), tau: round(tau, 2) }] : [];
  for (let iter = 0; iter < iterations; iter++) {
    // 1. θ_j | μ, τ, σ, y（縮約の式の平均と、精度の和の逆数の分散をもつ正規分布）
    for (let j = 0; j < J; j++) {
      const dataPrecision = schools[j].n / sigma ** 2;
      const priorPrecision = 1 / tau ** 2;
      const precision = dataPrecision + priorPrecision;
      const center = (dataPrecision * schools[j].mean + priorPrecision * mu) / precision;
      theta[j] = center + rng.normal() / Math.sqrt(precision);
    }
    // 2. μ | θ, τ（θ の平均を中心に、分散 τ²/J の正規分布）
    mu = mean(theta) + (tau / Math.sqrt(J)) * rng.normal();
    // 3. τ² | θ, μ（逆ガンマ分布。τ が一様な事前分布のとき、形は (J−1)/2）
    const spread = sum(theta.map((value) => (value - mu) ** 2));
    tau = Math.sqrt(rng.invGamma((J - 1) / 2, spread / 2));
    // 4. σ² | θ, y（逆ガンマ分布。形は N/2）
    let residual = 0;
    schools.forEach((school, j) => {
      for (const score of school.scores) residual += (score - theta[j]) ** 2;
    });
    sigma = Math.sqrt(rng.invGamma(N / 2, residual / 2));
    if (iter < keepTrace - 1) trace.push({ mu: round(mu, 2), tau: round(tau, 2) });
    if (iter >= burnIn) onSample({ mu, tau, sigma, theta });
  }
  return trace;
}

/** 4本の連鎖を回して、事後分布の標本をまとめる */
function fitHierarchical(schools, seed, { iterations = ITERATIONS, burnIn = BURN_IN, chains = CHAINS, keepTrace = 0 } = {}) {
  const rng = makeRng(seed);
  const samples = { mu: [], tau: [], sigma: [], theta: schools.map(() => []) };
  const perChain = [];
  const traces = [];
  for (let chain = 0; chain < chains; chain++) {
    const chainSamples = { mu: [], tau: [] };
    const trace = runGibbs(schools, {
      iterations,
      burnIn,
      start: CHAIN_STARTS[chain % CHAIN_STARTS.length],
      rng,
      keepTrace,
      onSample: ({ mu, tau, sigma, theta }) => {
        samples.mu.push(mu);
        samples.tau.push(tau);
        samples.sigma.push(sigma);
        theta.forEach((value, j) => samples.theta[j].push(value));
        chainSamples.mu.push(mu);
        chainSamples.tau.push(tau);
      },
    });
    perChain.push(chainSamples);
    traces.push(trace);
  }
  return { samples, perChain, traces };
}

/** 収束の目安（Gelman–Rubin の R̂。1 に近いほど、連鎖どうしが同じ分布に落ち着いている） */
function rHat(chains) {
  const m = chains.length;
  const n = chains[0].length;
  const means = chains.map(mean);
  const grand = mean(means);
  const between = (n / (m - 1)) * sum(means.map((value) => (value - grand) ** 2));
  const within = mean(chains.map((chain, i) => sum(chain.map((value) => (value - means[i]) ** 2)) / (n - 1)));
  return Math.sqrt(((n - 1) / n) * within + between / n) / Math.sqrt(within);
}

function histogram(values, { from, to, width }) {
  const counts = new Array(Math.round((to - from) / width)).fill(0);
  for (const value of values) {
    const index = Math.floor((value - from) / width);
    if (index >= 0 && index < counts.length) counts[index]++;
  }
  return { from, width, density: counts.map((count) => round(count / values.length / width, 5)) };
}

const rmse = (estimates, truths) => Math.sqrt(mean(estimates.map((value, j) => (value - truths[j]) ** 2)));

// ---- τ を固定したときの推定（σ は推定値に固定）。BDA 第5章の計算 ----
function tauProfile(schools, sigma) {
  const variances = schools.map((school) => sigma ** 2 / school.n);
  const rows = [];
  for (let step = 0; step <= TAU_GRID_STEPS; step++) {
    const tau = Math.max(1e-3, (TAU_GRID_MAX * step) / TAU_GRID_STEPS);
    const weights = variances.map((v) => 1 / (v + tau ** 2));
    const muHat = sum(schools.map((school, j) => weights[j] * school.mean)) / sum(weights);
    const muVar = 1 / sum(weights);
    // τ の事後分布（μ と θ を積分で消したもの。τ の事前分布は一様）
    let logDensity = 0.5 * Math.log(muVar);
    schools.forEach((school, j) => {
      logDensity += 0.5 * Math.log(weights[j]) - 0.5 * weights[j] * (school.mean - muHat) ** 2;
    });
    const thetaHat = schools.map((school, j) => (school.mean / variances[j] + muHat / tau ** 2) / (1 / variances[j] + 1 / tau ** 2));
    rows.push({ tau: round(tau, 3), muHat, thetaHat, logDensity });
  }
  const maxLog = Math.max(...rows.map((row) => row.logDensity));
  const area = sum(rows.map((row) => Math.exp(row.logDensity - maxLog))) * (TAU_GRID_MAX / TAU_GRID_STEPS);
  return rows.map((row) => ({
    tau: row.tau,
    mu: round(row.muHat),
    theta: row.thetaHat.map((value) => round(value)),
    density: round(Math.exp(row.logDensity - maxLog) / area, 5),
  }));
}

// ---- 表示用のデータの種を選ぶ ----
if (process.argv.includes('--search')) {
  for (let seed = 1; seed <= 200; seed++) {
    const schools = makeDataset(seed, TRUE_TAU);
    const small = schools.find((school) => school.name === 'C');
    const smallRank = [...schools].sort((a, b) => b.mean - a.mean).indexOf(small) + 1;
    const trueRank = [...schools].sort((a, b) => b.theta - a.theta).indexOf(small) + 1;
    const g = schools.find((school) => school.name === 'G');
    const gRank = [...schools].sort((a, b) => a.mean - b.mean).indexOf(g) + 1;
    if (smallRank !== 1 || trueRank === 1 || gRank !== 1) continue;
    const fit = fitHierarchical(schools, MCMC_SEED, { iterations: 3000, burnIn: 500, chains: 2 });
    const tau = summarize(fit.samples.tau);
    const post = fit.samples.theta.map(mean);
    const truths = schools.map((school) => school.theta);
    console.log(
      `seed ${String(seed).padStart(3)}  C: 平均 ${small.mean.toFixed(1)} 本当 ${small.theta.toFixed(1)}（本当の順位 ${trueRank}）  G: 平均 ${g.mean.toFixed(1)} 本当 ${g.theta.toFixed(1)}  τ 中央値 ${tau.median}  RMSE 別々 ${rmse(schools.map((s) => s.mean), truths).toFixed(2)} 階層 ${rmse(post, truths).toFixed(2)}`,
    );
  }
  process.exit(0);
}

// ================= 表示用のデータ =================
const schools = makeDataset(DATA_SEED, TRUE_TAU);
const truths = schools.map((school) => school.theta);
const sigmaHat = pooledSigma(schools);
const pooled = grandMean(schools);
const N = sum(schools.map((school) => school.n));

// ---- もう一度テストをしたら（本当の実力は同じまま、生徒を選び直す）----
const resampleRng = makeRng(RESAMPLE_SEED);
const resample = ['C', 'E'].map((name) => {
  const school = schools.find((s) => s.name === name);
  const means = Array.from({ length: RESAMPLE_COUNT }, () => mean(Array.from({ length: school.n }, () => drawScore(resampleRng, school.theta, TRUE_SIGMA))));
  return { name, n: school.n, theta: round(school.theta, 1), means: means.map((value) => round(value, 1)), min: round(Math.min(...means), 1), max: round(Math.max(...means), 1) };
});

// ---- 階層モデルを推定する ----
const fit = fitHierarchical(schools, MCMC_SEED, { keepTrace: TRACE_ITERATIONS });
const post = {
  mu: summarize(fit.samples.mu),
  tau: summarize(fit.samples.tau),
  sigma: summarize(fit.samples.sigma),
  theta: fit.samples.theta.map(summarize),
};
const rhat = { mu: round(rHat(fit.perChain.map((chain) => chain.mu)), 3), tau: round(rHat(fit.perChain.map((chain) => chain.tau)), 3) };
const sampleCount = fit.samples.mu.length;

// 学校ごとに「8校の中で1位である確率」
const topCounts = new Array(schools.length).fill(0);
for (let s = 0; s < sampleCount; s++) {
  let best = 0;
  for (let j = 1; j < schools.length; j++) if (fit.samples.theta[j][s] > fit.samples.theta[best][s]) best = j;
  topCounts[best]++;
}
const topProbability = topCounts.map((count) => round(count / sampleCount, 3));

// 漏斗の形（学校 C の θ と τ の標本）。間引いて使う
const funnelStep = Math.floor(sampleCount / FUNNEL_POINTS);
const cIndex = schools.findIndex((school) => school.name === 'C');
const funnel = [];
for (let s = 0; s < sampleCount && funnel.length < FUNNEL_POINTS; s += funnelStep) {
  const tau = fit.samples.tau[s];
  const offset = fit.samples.theta[cIndex][s] - fit.samples.mu[s];
  funnel.push({ logTau: round(Math.log(tau), 3), offset: round(offset, 2), eta: round(offset / tau, 3) });
}

// 縮約の強さ B_j（τ と σ は事後分布の中央値に固定）
const shrink = schools.map((school) => {
  const variance = post.sigma.median ** 2 / school.n;
  const weight = variance / (variance + post.tau.median ** 2);
  return { name: school.name, n: school.n, B: round(weight, 3), estimate: round((1 - weight) * school.mean + weight * post.mu.median, 1) };
});

// ---- 2つの変数でのギブスサンプリングの例 ----
const toyRng = makeRng(TOY_SEED);
const toyConditionalSd = Math.sqrt(1 - TOY_RHO ** 2);
const toyPath = [TOY_START.slice()];
let [toyX, toyY] = TOY_START;
for (let step = 0; step < TOY_STEPS; step++) {
  toyX = TOY_RHO * toyY + toyConditionalSd * toyRng.normal();
  toyPath.push([toyX, toyY]);
  toyY = TOY_RHO * toyX + toyConditionalSd * toyRng.normal();
  toyPath.push([toyX, toyY]);
}
const toySamples = [];
for (let i = 0; i < TOY_SAMPLES; i++) {
  toyX = TOY_RHO * toyY + toyConditionalSd * toyRng.normal();
  toyY = TOY_RHO * toyX + toyConditionalSd * toyRng.normal();
  toySamples.push([round(toyX, 3), round(toyY, 3)]);
}

// ---- 本当の値との比較（同じ設定で、データを作り直して推定する）----
const repeatErrors = { separate: [], pooled: [], hierarchical: [] };
const perSchoolSquared = { separate: schools.map(() => 0), hierarchical: schools.map(() => 0) };
let hierarchicalWins = 0;
for (let r = 0; r < REPEATS; r++) {
  const data = makeDataset(REPEAT_SEED + r, TRUE_TAU);
  const truth = data.map((school) => school.theta);
  const separate = data.map((school) => school.mean);
  const all = data.map(() => grandMean(data));
  const repeatFit = fitHierarchical(data, REPEAT_SEED + 50000 + r, { iterations: REPEAT_ITERATIONS, burnIn: REPEAT_BURN_IN, chains: 1 });
  const hierarchical = repeatFit.samples.theta.map(mean);
  const errSeparate = rmse(separate, truth);
  const errHierarchical = rmse(hierarchical, truth);
  repeatErrors.separate.push(errSeparate);
  repeatErrors.pooled.push(rmse(all, truth));
  repeatErrors.hierarchical.push(errHierarchical);
  if (errHierarchical < errSeparate) hierarchicalWins++;
  data.forEach((school, j) => {
    perSchoolSquared.separate[j] += (separate[j] - truth[j]) ** 2;
    perSchoolSquared.hierarchical[j] += (hierarchical[j] - truth[j]) ** 2;
  });
}
const repeatSummary = {
  count: REPEATS,
  // 500回の RMSE の2乗平均の平方根（学校と繰り返しの全体で、誤差の大きさの平均）
  separate: round(Math.sqrt(mean(repeatErrors.separate.map((e) => e * e))), 2),
  pooled: round(Math.sqrt(mean(repeatErrors.pooled.map((e) => e * e))), 2),
  hierarchical: round(Math.sqrt(mean(repeatErrors.hierarchical.map((e) => e * e))), 2),
  hierarchicalWins: round(hierarchicalWins / REPEATS, 3),
  perSchool: schools.map((school, j) => ({
    name: school.name,
    n: school.n,
    separate: round(Math.sqrt(perSchoolSquared.separate[j] / REPEATS), 2),
    hierarchical: round(Math.sqrt(perSchoolSquared.hierarchical[j] / REPEATS), 2),
  })),
};

// ---- 学校の間の違いが小さい場合・大きい場合 ----
const scenarios = SCENARIOS.map((scenario) => {
  const data = makeDataset(scenario.seed, scenario.tau);
  const scenarioFit = fitHierarchical(data, scenario.seed + 7);
  return {
    key: scenario.key,
    trueTau: scenario.tau,
    schools: data.map((school, j) => ({ name: school.name, n: school.n, mean: round(school.mean, 1), post: round(mean(scenarioFit.samples.theta[j]), 1) })),
    mu: summarize(scenarioFit.samples.mu),
    tau: summarize(scenarioFit.samples.tau),
    tauHist: histogram(scenarioFit.samples.tau, { from: 0, to: 30, width: 0.75 }),
  };
});

// ---- 書き出し ----
const output = {
  settings: { trueMu: TRUE_MU, trueTau: TRUE_TAU, trueSigma: TRUE_SIGMA, seed: DATA_SEED, chains: CHAINS, iterations: ITERATIONS, burnIn: BURN_IN, repeats: REPEATS },
  schools: schools.map((school, j) => ({
    name: school.name,
    n: school.n,
    scores: school.scores,
    mean: round(school.mean, 1),
    theta: round(school.theta, 1),
    // 別々に推定したときの 95% 区間（平均 ± 1.96 × σ/√n）
    sepLo: round(school.mean - (1.96 * sigmaHat) / Math.sqrt(school.n), 1),
    sepHi: round(school.mean + (1.96 * sigmaHat) / Math.sqrt(school.n), 1),
    post: post.theta[j],
    top: topProbability[j],
  })),
  N,
  sigmaHat: round(sigmaHat, 2),
  pooledMean: round(pooled, 1),
  resample,
  post: { mu: post.mu, tau: post.tau, sigma: post.sigma },
  rhat,
  sampleCount,
  traces: fit.traces,
  hist: { mu: histogram(fit.samples.mu, HIST_BINS.mu), tau: histogram(fit.samples.tau, HIST_BINS.tau) },
  funnel,
  shrink,
  tauProfile: tauProfile(schools, sigmaHat),
  toy: { rho: TOY_RHO, path: toyPath.map(([x, y]) => [round(x, 3), round(y, 3)]), samples: toySamples },
  repeat: repeatSummary,
  scenarios,
  rmse: {
    separate: round(rmse(schools.map((school) => school.mean), truths), 2),
    pooled: round(rmse(schools.map(() => pooled), truths), 2),
    hierarchical: round(rmse(post.theta.map((summary) => summary.mean), truths), 2),
  },
};
fs.writeFileSync(OUT_FILE, JSON.stringify(output));

// ---- 字幕に書く数値の確認用 ----
console.log(`生徒 ${N} 人、学校の中のばらつき σ の推定値 ${sigmaHat.toFixed(2)}、全員の平均 ${pooled.toFixed(1)}`);
for (const [j, school] of schools.entries()) {
  const summary = post.theta[j];
  console.log(
    `  ${school.name}（${String(school.n).padStart(2)}人） 平均 ${school.mean.toFixed(1)}  本当 ${school.theta.toFixed(1)}  階層 ${summary.mean}［${summary.lo}, ${summary.hi}］  別々の区間［${output.schools[j].sepLo}, ${output.schools[j].sepHi}］  1位の確率 ${topProbability[j]}  B ${shrink[j].B}`,
  );
}
console.log(`μ ${JSON.stringify(post.mu)}  τ ${JSON.stringify(post.tau)}  σ ${JSON.stringify(post.sigma)}  R̂ ${JSON.stringify(rhat)}  標本 ${sampleCount}`);
console.log(`もう一度テスト: ${resample.map((r) => `${r.name} 本当 ${r.theta} 平均の範囲 ${r.min}〜${r.max}`).join(' ／ ')}`);
console.log(`この1回の RMSE: ${JSON.stringify(output.rmse)}`);
console.log(`${REPEATS} 回の RMSE: 別々 ${repeatSummary.separate}  まとめて ${repeatSummary.pooled}  階層 ${repeatSummary.hierarchical}  階層のほうが小さかった割合 ${repeatSummary.hierarchicalWins}`);
console.log(`  学校ごと: ${repeatSummary.perSchool.map((s) => `${s.name}(${s.n}) ${s.separate}→${s.hierarchical}`).join('  ')}`);
for (const scenario of scenarios) {
  console.log(`場合 ${scenario.key}（本当の τ ${scenario.trueTau}）: τ ${JSON.stringify(scenario.tau)}  μ ${scenario.mu.mean}  ${scenario.schools.map((s) => `${s.name} ${s.mean}→${s.post}`).join('  ')}`);
}
const peak = output.tauProfile.reduce((best, row) => (row.density > best.density ? row : best));
console.log(`τ の格子計算（σ 固定）: 最頻値 ${peak.tau}`);
