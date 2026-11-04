// check-math.mjs — rbf-math.js の数値を確かめる（動画には使わない）。node tools/check-math.mjs
// 読み上げ原稿（js/narration.js）に書いた数値が、計算値と合っているかも確かめる。合わなければ終了コード 1。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
new Function(fs.readFileSync(path.join(root, 'js/rbf-math.js'), 'utf8'))();
const M = globalThis.RBFM;
const f = (v, d = 3) => v.toFixed(d);
let failed = false;

// ---- 1次元（7点）: ガウスの幅ごとの条件数と重み ----
const X1 = M.DATA1_X.map((x) => [x]);
for (const eps of [4, 1, 0.7, 0.35, 0.1]) {
  const phi = M.BASIS.gaussian(eps);
  const model = M.fit(X1, M.DATA1_Y, phi);
  const cond = M.conditionNumber(M.kernelMatrix(X1, phi));
  const err = Math.max(...M.DATA1_X.map((x, i) => Math.abs(model.at([x]) - M.DATA1_Y[i])));
  console.log(`ガウス ε=${eps}: 条件数 ${cond.toExponential(2)}、最大の重み ${Math.max(...model.w.map(Math.abs)).toExponential(2)}、点でのずれ ${err.toExponential(1)}`);
}
const lineCubic = M.fit(X1, M.LINE1_Y, M.BASIS.cubic(), { degree: 1 });
console.log(`直線のデータに r³ ＋ 直線: 重みの最大 ${Math.max(...lineCubic.w.map(Math.abs)).toExponential(1)}（0 になるはず）、直線 ${[...lineCubic.c].map((v) => f(v)).join(', ')}`);

// ---- 2次元（14点）: 曲げエネルギー ----
const tps = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.thinPlate(), { degree: 1 });
const energyTps = M.thinPlateEnergy(tps);
const energyTpsNumeric = M.bendingEnergyNumeric((p) => M.secondDerivativesThinPlate(tps, p), 8, 0.02);
console.log(`TPS の曲げエネルギー: 式 ${f(energyTps)}、数値積分 ${f(energyTpsNumeric)}`);
const EPS_2D = 1.6;
const gauss = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(EPS_2D));
const energyGauss = M.bendingEnergyNumeric((p) => M.secondDerivativesGaussian(gauss, EPS_2D, p), 5, 0.02);
console.log(`ガウス RBF（ε=${EPS_2D}）の曲げエネルギー: ${f(energyGauss)}`);
let best = { energy: Infinity, eps: 0 };
for (let eps = 0.8; eps <= 3.0001; eps += 0.1) {
  const g = M.fit(M.DATA2_P, M.DATA2_Y, M.BASIS.gaussian(eps));
  const energy = M.bendingEnergyNumeric((p) => M.secondDerivativesGaussian(g, eps, p), 5, 0.025);
  if (energy < best.energy) best = { energy, eps };
}
console.log(`ガウス RBF の曲げエネルギーが最小になる ε ≈ ${f(best.eps, 1)}（${f(best.energy, 1)}）`);

// ---- 平滑化スプライン: 1点抜き交差検証で選ぶ λ（scenes-tps.js と同じ 0.05 刻み）----
const logs = Array.from({ length: 181 }, (_, i) => -6 + i * 0.05);
const cv = logs.map((k) => M.leaveOneOutError(M.NOISY_X, M.NOISY_Y, 10 ** k));
const bestLambda = 10 ** logs[cv.indexOf(Math.min(...cv))];
console.log(`交差検証の誤差が最小の λ ≈ ${f(bestLambda)}（CV ${f(Math.min(...cv))}）、λ = 1e-6 で CV ${f(cv[0])}`);

// ---- 読み上げ原稿の数値 ----
const narration = fs.readFileSync(path.join(root, 'js/narration.js'), 'utf8');
const expect = (label, text) => {
  const ok = narration.includes(text);
  if (!ok) failed = true;
  console.log(`${ok ? 'OK ' : 'NG '} 原稿の${label}: 「${text}」`);
};
expect('曲げエネルギー（TPS とガウス）', `ティーピーエスは${f(energyTps, 0)}、ガウスは${f(energyGauss, 0)}`);
expect('交差検証で選ぶ λ', `ラムダが、${f(bestLambda, 2)}あたりで最小`);
expect('ノイズつきの点の数', `ノイズを含む、${M.NOISY_X.length}個の点`);
process.exit(failed ? 1 : 0);
