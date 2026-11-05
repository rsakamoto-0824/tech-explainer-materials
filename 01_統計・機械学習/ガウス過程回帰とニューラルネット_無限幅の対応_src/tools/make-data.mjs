// make-data.mjs — 動画で使う「学習したネット」の結果を前もって計算し、js/nn-data.js に書く。node tools/make-data.mjs
// 全部の層の学習は時間がかかる（約3分）ため、ページを開くたびには計算しない。乱数の種を固定しているので、何度実行しても同じ結果になる。
// あわせて、カーネルの式と乱数での平均の一致など、原稿に書いた数値の確認も表示する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
new Function(fs.readFileSync(path.join(root, 'js/nn-math.js'), 'utf8'))();
const M = globalThis.NNM;
const f = (v, d = 3) => v.toFixed(d);
const maxAbs = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

// ---- 設定 ----
const FULL_WIDTHS = [1000, 4000]; // 全部の層を学習するネットの幅（線を描くのは最後の幅）
const FULL_NETS = 200; // 平均をとるネットの数
const FULL_SHOWN = 30; // 画面に線で描くネットの数
const FULL_ETA = 0.05; // 学習率（NTK の最大固有値 ≈ 21.6 なので、2/21.6 より十分小さい）
const FULL_STEPS = 3000;
const LAZY_WIDTHS = [10, 30, 100, 300, 1000, 3000];
const LAZY_NETS = 10;
const NTK_WIDTHS = [10, 100, 1000, 4000];
const NTK_NETS = 20;
const GAP_WIDTHS = [10, 30, 100, 300, 1000, 3000, 10000];
const GAP_DRAWS = 100;
const DIGITS = 4;
const round = (v) => Number(v.toFixed(DIGITS));

// ---- 1. カーネルの式と、乱数のユニットでの平均の一致 ----
{
  const random = M.makeRandom(101);
  const UNITS = 400000;
  const points = [-2, 0, 1.5];
  const sumK = points.map(() => points.map(() => 0));
  const sumT = points.map(() => points.map(() => 0));
  for (let s = 0; s < UNITS; s++) {
    const w = random.normal();
    const a = random.normal();
    const u = points.map((x) => M.SIGMA_W * w * x + M.SIGMA_A * a);
    points.forEach((x1, i) =>
      points.forEach((x2, j) => {
        const k = M.SIGMA_V2 * M.relu(u[i]) * M.relu(u[j]);
        sumK[i][j] += k;
        sumT[i][j] += k + (u[i] > 0 && u[j] > 0 ? M.SIGMA_V2 * (M.SIGMA_A ** 2 + M.SIGMA_W ** 2 * x1 * x2) : 0);
      }),
    );
  }
  points.forEach((x1, i) =>
    points.forEach((x2, j) => {
      if (j < i) return;
      console.log(`x=${x1}, x'=${x2}: NNGP 式 ${f(M.nngp(x1, x2))} / 平均 ${f(sumK[i][j] / UNITS)}、NTK 式 ${f(M.ntk(x1, x2))} / 平均 ${f(sumT[i][j] / UNITS)}`);
    }),
  );
  console.log(`K(0, 1) = ${f(M.nngp(0, 1))}、相関係数 ${f(M.nngp(0, 1) / Math.sqrt(M.nngp(0, 0) * M.nngp(1, 1)))}、K(1, 1) = ${f(M.nngp(1, 1))}`);
}

// ---- 2. ガウス過程回帰の平均（NNGP と NTK）----
const grid = M.GRID;
const inData = grid.map((x) => x >= M.DATA_X[0] && x <= M.DATA_X[M.DATA_X.length - 1]);
const gpMean = M.gpPosterior(M.nngp, grid).mean;
const ntkMean = M.gpPosterior(M.ntk, grid).mean;
const inside = (a, b) => Math.max(...a.map((v, i) => (inData[i] ? Math.abs(v - b[i]) : 0)));
console.log(`NNGP と NTK の平均の差: データの範囲 ${f(inside(gpMean, ntkMean))}、−4〜4 全体 ${f(maxAbs(gpMean, ntkMean))}`);
const eigK = M.symmetricEigen(M.DATA_X.map((a) => M.DATA_X.map((b) => M.nngp(a, b)))).values.sort((a, b) => a - b);
const eigT = M.symmetricEigen(M.DATA_X.map((a) => M.DATA_X.map((b) => M.ntk(a, b)))).values.sort((a, b) => a - b);
console.log(`固有値 K: ${eigK.map((v) => f(v, 4)).join(', ')}`);
console.log(`固有値 Θ: ${eigT.map((v) => f(v, 3)).join(', ')}`);

// ---- 3. 全部の層を勾配降下法で学習したネットの平均（幅 1000 と 4000）----
// データの外側では、有限の幅による「ずれ」が残り、幅を広げるほど小さくなる（平均の標準誤差よりずっと大きいので、偶然のばらつきではない）
const fullRuns = FULL_WIDTHS.map((width, r) => {
  const started = Date.now();
  const random = M.makeRandom(2024 + r);
  const sum = new Float64Array(grid.length);
  const squareSum = new Float64Array(grid.length);
  const lines = [];
  let worstLoss = 0;
  for (let m = 0; m < FULL_NETS; m++) {
    const net = M.randomNet(width, random);
    worstLoss = Math.max(worstLoss, M.trainFull(net, { eta: FULL_ETA, steps: FULL_STEPS }));
    const out = grid.map((x) => M.netAt(net, x));
    out.forEach((v, i) => {
      sum[i] += v;
      squareSum[i] += v * v;
    });
    if (m < FULL_SHOWN) lines.push(out.map(round));
  }
  const mean = [...sum].map((v) => v / FULL_NETS);
  const standardError = Math.max(...mean.map((v, i) => Math.sqrt(Math.max(0, squareSum[i] / FULL_NETS - v * v) / FULL_NETS)));
  const run = {
    width,
    worstLoss: Number(worstLoss.toExponential(2)),
    mean: mean.map(round),
    gapNtk: round(maxAbs(mean, ntkMean)),
    gapNtkInside: round(inside(mean, ntkMean)),
    gapNngp: round(maxAbs(mean, gpMean)),
    gapNngpInside: round(inside(mean, gpMean)),
  };
  console.log(`全部の層の学習（幅 ${width}）: ${FULL_NETS} 個、最大の損失 ${worstLoss.toExponential(1)}、${((Date.now() - started) / 1000).toFixed(0)} 秒、平均の標準誤差の最大 ${f(standardError)}`);
  console.log(`  平均と NTK の式のずれ: データの範囲 ${f(run.gapNtkInside)}、全体 ${f(run.gapNtk)}`);
  console.log(`  平均と NNGP の式のずれ: データの範囲 ${f(run.gapNngpInside)}、全体 ${f(run.gapNngp)}`);
  return { ...run, lines: r === FULL_WIDTHS.length - 1 ? lines : undefined };
});

// ---- 4. 幅と、内側の重みが動いた割合 ----
const lazyRandom = M.makeRandom(77);
const lazy = LAZY_WIDTHS.map((width) => {
  let total = 0;
  for (let m = 0; m < LAZY_NETS; m++) {
    const net = M.randomNet(width, lazyRandom);
    const w0 = net.w.slice();
    const a0 = net.a.slice();
    M.trainFull(net, { eta: FULL_ETA, steps: FULL_STEPS });
    let moved = 0;
    let size = 0;
    for (let j = 0; j < width; j++) {
      moved += (net.w[j] - w0[j]) ** 2 + (net.a[j] - a0[j]) ** 2;
      size += w0[j] ** 2 + a0[j] ** 2;
    }
    total += Math.sqrt(moved / size);
  }
  const change = total / LAZY_NETS;
  console.log(`幅 ${width}: 内側の重みが動いた割合 ${f(change * 100, 1)}%`);
  return { width, change: round(change) };
});

// ---- 5. 幅と NTK: 初期値によるずれ（式との差）と、学習の前後の変化（どちらも行列のフロベニウスノルムの比）----
const ntkMatrixOf = (net) => M.DATA_X.map((a) => M.DATA_X.map((b) => M.empiricalNtk(net, a, b)));
const frobenius = (A) => Math.sqrt(A.flat().reduce((s, v) => s + v * v, 0));
const minus = (A, B) => A.map((row, i) => row.map((v, j) => v - B[i][j]));
const ntkFormula = M.DATA_X.map((a) => M.DATA_X.map((b) => M.ntk(a, b)));
const ntkRandom = M.makeRandom(4040);
const ntkWidths = NTK_WIDTHS.map((width) => {
  let spread = 0;
  let change = 0;
  for (let m = 0; m < NTK_NETS; m++) {
    const net = M.randomNet(width, ntkRandom);
    const before = ntkMatrixOf(net);
    spread += frobenius(minus(before, ntkFormula)) / frobenius(ntkFormula);
    M.trainFull(net, { eta: FULL_ETA, steps: FULL_STEPS });
    change += frobenius(minus(ntkMatrixOf(net), before)) / frobenius(before);
  }
  console.log(`幅 ${width}: NTK の初期値によるずれ ${f((spread / NTK_NETS) * 100, 1)}%、学習の前後の変化 ${f((change / NTK_NETS) * 100, 1)}%`);
  return { width, spread: round(spread / NTK_NETS), change: round(change / NTK_NETS) };
});

// ---- 6. 幅と、事後平均のずれ（最後の層だけをベイズ推論。σ_n² = NOISE_VAR）----
const gapRandom = M.makeRandom(31);
const gpNoisy = M.gpPosterior(M.nngp, grid, M.NOISE_VAR).mean;
const gaps = GAP_WIDTHS.map((width) => {
  let total = 0;
  for (let d = 0; d < GAP_DRAWS; d++) {
    const net = M.randomNet(width, gapRandom);
    total += maxAbs(M.featurePosterior(net, grid, M.NOISE_VAR).mean, gpNoisy);
  }
  const gap = total / GAP_DRAWS;
  console.log(`幅 ${width}: 事後平均のずれ（−4〜4 での最大、${GAP_DRAWS} 回の平均）${f(gap)}`);
  return { width, gap: round(gap) };
});

const header = `// 自動生成（node tools/make-data.mjs）。手で直さない。\n// 全部の層を勾配降下法で学習したネット（幅 ${FULL_WIDTHS.join('・')}、各 ${FULL_NETS} 個、学習率 ${FULL_ETA}、${FULL_STEPS} 回）の出力と平均、幅ごとの「内側の重みが動いた割合」「NTK のずれと変化」「事後平均のずれ」\n`;
const data = {
  full: { nets: FULL_NETS, eta: FULL_ETA, steps: FULL_STEPS, runs: fullRuns },
  lazy,
  ntkWidths,
  gaps,
};
fs.writeFileSync(path.join(root, 'js/nn-data.js'), `${header}window.NN_DATA = ${JSON.stringify(data)};\n`);
console.log('js/nn-data.js を書きました');
