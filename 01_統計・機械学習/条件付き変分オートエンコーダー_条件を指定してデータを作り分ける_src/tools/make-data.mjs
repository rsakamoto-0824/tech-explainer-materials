// make-data.mjs — 説明用の合成データを作り、小さな VAE と CVAE を実際に学習させて、図に使う数値を src/data.json に書く。
//   node tools/make-data.mjs
// 外部のライブラリは使わず、ニューラルネットの計算（順伝播・逆伝播・Adam）をこのファイルの中で行う。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'src', 'data.json');

// ---- 設定 ----
const DATA_SEED = 11;
const TRAIN_SEED = 5;
const CLASS_COUNT = 3;
const POINTS_PER_CLASS = 200;
const CENTER_DISTANCE = 1.55; // 原点から各グループの中心まで
const ARC_RADIUS = 0.9;
const ARC_HALF_ANGLE = 1.1; // 円弧の広がり（ラジアン）
const ARC_HALF_WIDTH = 0.2; // 円弧の太さの半分
const LATENT_DIM = 2;
const HIDDEN = 32;
const OBS_SD = 0.12; // 復元の誤差を測るときの標準偏差（小さいほど、復元を重く見る）
const EPOCHS = 600;
const BATCH = 100;
const LEARNING_RATE = 0.003;
const SNAPSHOT_EPOCHS = [0, 3, 10, 40, EPOCHS];
const SNAPSHOT_POINTS = 150;
const SAMPLES_PER_CLASS = 150;
const VAE_SAMPLES = 450;
const SWEEP_STEPS = 25;
const SWEEP_RANGE = 2;
const FAR_DISTANCE = 0.25; // これより離れた点は「どのグループにも入らない」と数える

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
  return { uniform, normal };
}

// ---- データ：3つの円弧（バナナ形）----
// position（円弧に沿った位置）と width（太さ方向の位置）が、グループの中の「ばらつき」になる
function arcPoint(classIndex, position, width) {
  const angle = (Math.PI / 2) + (2 * Math.PI * classIndex) / CLASS_COUNT;
  const radius = ARC_RADIUS + width;
  const localX = radius * Math.sin(position);
  const localY = radius * Math.cos(position) - ARC_RADIUS;
  const rotate = angle - Math.PI / 2;
  return [
    CENTER_DISTANCE * Math.cos(angle) + localX * Math.cos(rotate) - localY * Math.sin(rotate),
    CENTER_DISTANCE * Math.sin(angle) + localX * Math.sin(rotate) + localY * Math.cos(rotate),
  ];
}

const dataRng = makeRng(DATA_SEED);
const points = [];
for (let c = 0; c < CLASS_COUNT; c++) {
  for (let i = 0; i < POINTS_PER_CLASS; i++) {
    const position = (dataRng.uniform() * 2 - 1) * ARC_HALF_ANGLE;
    const width = (dataRng.uniform() * 2 - 1) * ARC_HALF_WIDTH;
    const [x, y] = arcPoint(c, position, width);
    points.push({ x, y, c, position, width });
  }
}

// ---- 小さなニューラルネット（全結合・tanh）----
function makeNet(sizes, rng) {
  const layers = [];
  for (let l = 0; l + 1 < sizes.length; l++) {
    const fanIn = sizes[l];
    const fanOut = sizes[l + 1];
    const scale = Math.sqrt(1 / fanIn);
    const weights = Float64Array.from({ length: fanIn * fanOut }, () => rng.normal() * scale);
    layers.push({ fanIn, fanOut, weights, bias: new Float64Array(fanOut) });
  }
  return layers;
}

/** 入力（行数 n × 列数 fanIn を1列に並べたもの）を通す。途中の値を cache に残す */
function forward(net, input, n) {
  const cache = [input];
  let current = input;
  net.forEach((layer, index) => {
    const out = new Float64Array(n * layer.fanOut);
    const isLast = index === net.length - 1;
    for (let row = 0; row < n; row++) {
      for (let j = 0; j < layer.fanOut; j++) {
        let sum = layer.bias[j];
        for (let i = 0; i < layer.fanIn; i++) sum += current[row * layer.fanIn + i] * layer.weights[i * layer.fanOut + j];
        out[row * layer.fanOut + j] = isLast ? sum : Math.tanh(sum);
      }
    }
    cache.push(out);
    current = out;
  });
  return cache;
}

/** 出力側の勾配から、重みの勾配と入力側の勾配を求める */
function backward(net, cache, gradOut, n) {
  const grads = [];
  let grad = gradOut;
  for (let index = net.length - 1; index >= 0; index--) {
    const layer = net[index];
    const input = cache[index];
    const output = cache[index + 1];
    const isLast = index === net.length - 1;
    const delta = new Float64Array(n * layer.fanOut);
    for (let k = 0; k < delta.length; k++) delta[k] = isLast ? grad[k] : grad[k] * (1 - output[k] * output[k]);
    const gradWeights = new Float64Array(layer.weights.length);
    const gradBias = new Float64Array(layer.fanOut);
    const gradIn = new Float64Array(n * layer.fanIn);
    for (let row = 0; row < n; row++) {
      for (let j = 0; j < layer.fanOut; j++) {
        const d = delta[row * layer.fanOut + j];
        gradBias[j] += d;
        for (let i = 0; i < layer.fanIn; i++) {
          gradWeights[i * layer.fanOut + j] += input[row * layer.fanIn + i] * d;
          gradIn[row * layer.fanIn + i] += layer.weights[i * layer.fanOut + j] * d;
        }
      }
    }
    grads[index] = { gradWeights, gradBias };
    grad = gradIn;
  }
  return { grads, gradIn: grad };
}

function makeAdam(net) {
  return { step: 0, moments: net.map((layer) => ({ mw: new Float64Array(layer.weights.length), vw: new Float64Array(layer.weights.length), mb: new Float64Array(layer.fanOut), vb: new Float64Array(layer.fanOut) })) };
}

function adamUpdate(net, grads, adam) {
  const BETA1 = 0.9;
  const BETA2 = 0.999;
  const EPSILON = 1e-8;
  adam.step += 1;
  const correction1 = 1 - BETA1 ** adam.step;
  const correction2 = 1 - BETA2 ** adam.step;
  const apply = (values, gradient, m, v) => {
    for (let k = 0; k < values.length; k++) {
      m[k] = BETA1 * m[k] + (1 - BETA1) * gradient[k];
      v[k] = BETA2 * v[k] + (1 - BETA2) * gradient[k] * gradient[k];
      values[k] -= (LEARNING_RATE * (m[k] / correction1)) / (Math.sqrt(v[k] / correction2) + EPSILON);
    }
  };
  net.forEach((layer, index) => {
    apply(layer.weights, grads[index].gradWeights, adam.moments[index].mw, adam.moments[index].vw);
    apply(layer.bias, grads[index].gradBias, adam.moments[index].mb, adam.moments[index].vb);
  });
}

// ---- VAE / CVAE ----
// conditional = true のとき、エンコーダとデコーダの両方の入力に、条件 c（one-hot）をつなげる
function makeModel(conditional, rng) {
  const conditionDim = conditional ? CLASS_COUNT : 0;
  return {
    conditional,
    conditionDim,
    encoder: makeNet([2 + conditionDim, HIDDEN, HIDDEN, 2 * LATENT_DIM], rng),
    decoder: makeNet([LATENT_DIM + conditionDim, HIDDEN, HIDDEN, 2], rng),
  };
}

function withCondition(model, values, valueDim, classes) {
  const n = classes.length;
  const width = valueDim + model.conditionDim;
  const out = new Float64Array(n * width);
  for (let row = 0; row < n; row++) {
    for (let i = 0; i < valueDim; i++) out[row * width + i] = values[row * valueDim + i];
    if (model.conditional) out[row * width + valueDim + classes[row]] = 1;
  }
  return out;
}

function encode(model, xs, classes) {
  const n = classes.length;
  const cache = forward(model.encoder, withCondition(model, xs, 2, classes), n);
  return { cache, out: cache[cache.length - 1] };
}

function decode(model, zs, classes) {
  const n = classes.length;
  const cache = forward(model.decoder, withCondition(model, zs, LATENT_DIM, classes), n);
  return { cache, out: cache[cache.length - 1] };
}

/** 1回分の学習。noise が null のときは勾配を計算せず、損失だけ返す（z は平均を使う） */
function lossAndStep(model, batch, rng, optim) {
  const n = batch.length;
  const xs = Float64Array.from(batch.flatMap((p) => [p.x, p.y]));
  const classes = batch.map((p) => p.c);
  const enc = encode(model, xs, classes);
  const zs = new Float64Array(n * LATENT_DIM);
  const noise = new Float64Array(n * LATENT_DIM);
  let kl = 0;
  for (let row = 0; row < n; row++) {
    for (let d = 0; d < LATENT_DIM; d++) {
      const mean = enc.out[row * 2 * LATENT_DIM + d];
      const logVar = enc.out[row * 2 * LATENT_DIM + LATENT_DIM + d];
      noise[row * LATENT_DIM + d] = optim ? rng.normal() : 0;
      zs[row * LATENT_DIM + d] = mean + Math.exp(0.5 * logVar) * noise[row * LATENT_DIM + d];
      kl += 0.5 * (mean * mean + Math.exp(logVar) - 1 - logVar);
    }
  }
  const dec = decode(model, zs, classes);
  let squared = 0;
  const gradXhat = new Float64Array(n * 2);
  for (let k = 0; k < n * 2; k++) {
    const diff = dec.out[k] - xs[k];
    squared += diff * diff;
    gradXhat[k] = diff / (OBS_SD * OBS_SD) / n;
  }
  const result = { recon: squared / (2 * OBS_SD * OBS_SD) / n, kl: kl / n, rmse: Math.sqrt(squared / n) };
  if (!optim) return result;

  const decBack = backward(model.decoder, dec.cache, gradXhat, n);
  const decInputDim = LATENT_DIM + model.conditionDim;
  const gradEncOut = new Float64Array(n * 2 * LATENT_DIM);
  for (let row = 0; row < n; row++) {
    for (let d = 0; d < LATENT_DIM; d++) {
      const mean = enc.out[row * 2 * LATENT_DIM + d];
      const logVar = enc.out[row * 2 * LATENT_DIM + LATENT_DIM + d];
      const gradZ = decBack.gradIn[row * decInputDim + d];
      // 再パラメータ化 z = 平均 + 標準偏差 × ノイズ を通して、平均と分散の対数へ勾配を戻す
      gradEncOut[row * 2 * LATENT_DIM + d] = gradZ + mean / n;
      gradEncOut[row * 2 * LATENT_DIM + LATENT_DIM + d] = gradZ * noise[row * LATENT_DIM + d] * 0.5 * Math.exp(0.5 * logVar) + (0.5 * (Math.exp(logVar) - 1)) / n;
    }
  }
  const encBack = backward(model.encoder, enc.cache, gradEncOut, n);
  adamUpdate(model.decoder, decBack.grads, optim.decoder);
  adamUpdate(model.encoder, encBack.grads, optim.encoder);
  return result;
}

function shuffled(items, rng) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng.uniform() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const round = (value, digits = 3) => Number(value.toFixed(digits));
const pairs = (flat) => Array.from({ length: flat.length / 2 }, (_, i) => [round(flat[2 * i]), round(flat[2 * i + 1])]);

function train(conditional, snapshotBatch) {
  const rng = makeRng(TRAIN_SEED);
  const model = makeModel(conditional, rng);
  const optim = { encoder: makeAdam(model.encoder), decoder: makeAdam(model.decoder) };
  const history = [];
  const snapshots = [];
  const takeSnapshot = (epoch) => {
    const xs = Float64Array.from(snapshotBatch.flatMap((p) => [p.x, p.y]));
    const classes = snapshotBatch.map((p) => p.c);
    const enc = encode(model, xs, classes);
    const means = new Float64Array(classes.length * LATENT_DIM);
    for (let row = 0; row < classes.length; row++) for (let d = 0; d < LATENT_DIM; d++) means[row * LATENT_DIM + d] = enc.out[row * 2 * LATENT_DIM + d];
    snapshots.push({ epoch, recon: pairs(decode(model, means, classes).out) });
  };
  for (let epoch = 0; epoch <= EPOCHS; epoch++) {
    if (SNAPSHOT_EPOCHS.includes(epoch)) takeSnapshot(epoch);
    const whole = lossAndStep(model, points, rng, null);
    history.push({ epoch, recon: round(whole.recon, 3), kl: round(whole.kl, 3), rmse: round(whole.rmse, 4) });
    if (epoch === EPOCHS) break;
    const order = shuffled(points, rng);
    for (let start = 0; start < order.length; start += BATCH) lossAndStep(model, order.slice(start, start + BATCH), rng, optim);
  }
  return { model, history, snapshots, rng };
}

function latentMeans(model) {
  const xs = Float64Array.from(points.flatMap((p) => [p.x, p.y]));
  const classes = points.map((p) => p.c);
  const out = encode(model, xs, classes).out;
  return points.map((_, row) => ({
    mean: [round(out[row * 2 * LATENT_DIM]), round(out[row * 2 * LATENT_DIM + 1])],
    sd: [round(Math.exp(0.5 * out[row * 2 * LATENT_DIM + 2])), round(Math.exp(0.5 * out[row * 2 * LATENT_DIM + 3]))],
  }));
}

/** いちばん近いデータ点までの距離と、そのグループ */
function nearest(x, y) {
  let best = Infinity;
  let bestClass = -1;
  for (const p of points) {
    const distance = Math.hypot(p.x - x, p.y - y);
    if (distance < best) {
      best = distance;
      bestClass = p.c;
    }
  }
  return { distance: best, c: bestClass };
}

// ---- 学習 ----
const snapshotRng = makeRng(DATA_SEED + 1);
const snapshotBatch = shuffled(points, snapshotRng).slice(0, SNAPSHOT_POINTS);
console.log('VAE を学習中 …');
const vae = train(false, snapshotBatch);
console.log('CVAE を学習中 …');
const cvae = train(true, snapshotBatch);

// ---- 生成 ----
const sampleRng = makeRng(TRAIN_SEED + 100);
const drawLatent = (count) => Float64Array.from({ length: count * LATENT_DIM }, () => sampleRng.normal());

// VAE：z を標準正規分布から取って作る（グループは選べない）
const vaeLatent = drawLatent(VAE_SAMPLES);
const vaeOut = decode(vae.model, vaeLatent, new Array(VAE_SAMPLES).fill(0)).out;
const vaeSamples = pairs(vaeOut).map(([x, y], i) => {
  const near = nearest(x, y);
  return { x, y, z: [round(vaeLatent[2 * i]), round(vaeLatent[2 * i + 1])], c: near.distance > FAR_DISTANCE ? -1 : near.c };
});
const vaeShare = [-1, 0, 1, 2].map((c) => round(vaeSamples.filter((s) => s.c === c).length / VAE_SAMPLES, 3));

// CVAE：c を指定し、z を標準正規分布から取って作る。同じ z の列を、3つの c で使い回す
const sharedLatent = drawLatent(SAMPLES_PER_CLASS);
const cvaeSamples = [];
const cvaeHit = [];
for (let c = 0; c < CLASS_COUNT; c++) {
  const out = pairs(decode(cvae.model, sharedLatent, new Array(SAMPLES_PER_CLASS).fill(c)).out);
  const nears = out.map(([x, y]) => nearest(x, y));
  cvaeHit.push(round(nears.filter((near) => near.c === c && near.distance <= FAR_DISTANCE).length / SAMPLES_PER_CLASS, 3));
  cvaeSamples.push(out);
}

// z の片方だけを動かしたときに、作られる点がたどる道
function sweep(axis) {
  const zs = new Float64Array(SWEEP_STEPS * LATENT_DIM);
  for (let i = 0; i < SWEEP_STEPS; i++) zs[i * LATENT_DIM + axis] = -SWEEP_RANGE + (2 * SWEEP_RANGE * i) / (SWEEP_STEPS - 1);
  return Array.from({ length: CLASS_COUNT }, (_, c) => pairs(decode(cvae.model, zs, new Array(SWEEP_STEPS).fill(c)).out));
}

// z と、データを作ったときの本当の位置（円弧に沿った位置・太さ方向の位置）との相関
function correlation(a, b) {
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varA += (a[i] - meanA) ** 2;
    varB += (b[i] - meanB) ** 2;
  }
  return cov / Math.sqrt(varA * varB);
}

const vaeLatents = latentMeans(vae.model);
const cvaeLatents = latentMeans(cvae.model);
const correlations = [];
for (let c = 0; c < CLASS_COUNT; c++) {
  const index = points.map((p, i) => (p.c === c ? i : -1)).filter((i) => i >= 0);
  correlations.push(
    [0, 1].map((d) => ({
      position: round(correlation(index.map((i) => cvaeLatents[i].mean[d]), index.map((i) => points[i].position)), 2),
      width: round(correlation(index.map((i) => cvaeLatents[i].mean[d]), index.map((i) => points[i].width)), 2),
    })),
  );
}
const classMeans = (latents) =>
  Array.from({ length: CLASS_COUNT }, (_, c) => {
    const own = latents.filter((_, i) => points[i].c === c);
    return [0, 1].map((d) => round(own.reduce((s, l) => s + l.mean[d], 0) / own.length, 2));
  });
const meanSd = (latents) => [0, 1].map((d) => round(latents.reduce((s, l) => s + l.sd[d], 0) / latents.length, 3));

const HISTORY_STRIDE = 3;
const thin = (history) => history.filter((h) => h.epoch % HISTORY_STRIDE === 0 || h.epoch < 30);
const last = (history) => history[history.length - 1];

const data = {
  settings: { classCount: CLASS_COUNT, pointsPerClass: POINTS_PER_CLASS, obsSd: OBS_SD, epochs: EPOCHS, latentDim: LATENT_DIM, hidden: HIDDEN, sweepRange: SWEEP_RANGE },
  points: points.map((p) => ({ x: round(p.x), y: round(p.y), c: p.c })),
  snapshotClasses: snapshotBatch.map((p) => p.c),
  snapshotTargets: snapshotBatch.map((p) => [round(p.x), round(p.y)]),
  vae: { history: thin(vae.history), latents: vaeLatents.map((l) => l.mean), samples: vaeSamples, share: vaeShare, classMeans: classMeans(vaeLatents) },
  cvae: {
    history: thin(cvae.history),
    snapshots: cvae.snapshots,
    latents: cvaeLatents.map((l) => l.mean),
    samples: cvaeSamples,
    sharedLatent: pairs(sharedLatent),
    hit: cvaeHit,
    sweeps: [sweep(0), sweep(1)],
    classMeans: classMeans(cvaeLatents),
    correlations,
    meanSd: meanSd(cvaeLatents),
  },
};
fs.writeFileSync(OUT_FILE, JSON.stringify(data));

console.log('\n== 字幕に書く数値 ==');
console.log(`データ: ${points.length} 点（${CLASS_COUNT} グループ × ${POINTS_PER_CLASS} 点）`);
for (const [name, run] of [['VAE', vae], ['CVAE', cvae]]) {
  const first = run.history[0];
  const final = last(run.history);
  console.log(`${name}: 学習前 復元誤差(RMSE) ${first.rmse} → 学習後 ${final.rmse}、再構成の項 ${final.recon}、KL ${final.kl}、合計 ${(final.recon + final.kl).toFixed(3)}`);
}
console.log(`VAE の生成 ${VAE_SAMPLES} 点の内訳（どこにも入らない, グループ1, 2, 3）: ${vaeShare.join(', ')}`);
console.log(`VAE の潜在空間でのグループごとの中心: ${JSON.stringify(data.vae.classMeans)}`);
console.log(`CVAE の潜在空間でのグループごとの中心: ${JSON.stringify(data.cvae.classMeans)}`);
console.log(`CVAE の生成が、指定したグループの近く（${FAR_DISTANCE} 以内）に入った割合: ${cvaeHit.join(', ')}`);
console.log(`CVAE のエンコーダが出す標準偏差の平均: ${data.cvae.meanSd.join(', ')}`);
console.log(`CVAE の z と本当の位置の相関（グループごと、[z1, z2]）: ${JSON.stringify(correlations)}`);
console.log(`\n${OUT_FILE} に書きました（${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB）`);
