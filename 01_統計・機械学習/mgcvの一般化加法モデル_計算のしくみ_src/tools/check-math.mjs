// check-math.mjs — JavaScript で書き直した計算（js/gam-math.js）が mgcv の結果（js/gam-data.js）と合うかを確かめる。
//   node tools/check-math.mjs        動画の字幕・原稿に書く数値もここで表示する
import '../js/gam-data.js';
import '../js/gam-math.js';

const M = globalThis.GAMM;
const DATA = globalThis.GAMDATA;
const failures = [];
const check = (label, mine, theirs, tolerance) => {
  const gap = Math.abs(mine - theirs) / Math.max(1e-12, Math.abs(theirs));
  console.log(`${gap <= tolerance ? 'OK ' : 'NG '} ${label}: この動画 ${mine.toPrecision(8)} / mgcv ${theirs.toPrecision(8)}（相対差 ${gap.toExponential(1)}）`);
  if (gap > tolerance) failures.push(label);
};
// 1変数の関数を、対数の上で黄金分割して最小にする
function minimizeLog(f, lo, hi) {
  const ratio = (Math.sqrt(5) - 1) / 2;
  let [a, b] = [Math.log(lo), Math.log(hi)];
  for (let i = 0; i < 200; i++) {
    const c = b - ratio * (b - a);
    const d = a + ratio * (b - a);
    if (f(Math.exp(c)) < f(Math.exp(d))) b = d;
    else a = c;
  }
  return Math.exp((a + b) / 2);
}

console.log(`mgcv ${DATA.mgcvVersion} / ${DATA.rVersion}\n`);

// ---- 例B: 1変数 ----
const single = DATA.single;
const stats = M.gaussianStats(single.X, single.y);
const info = M.penaltyInfo([single.S], [2], single.X[0].length);
console.log('例B（1変数、k = 10）');
const atReml = M.fitGaussian(stats, info, [single.sp]);
check('REML の値（mgcv の λ で）', atReml.reml, single.reml, 1e-6);
check('尺度 φ', atReml.scale, single.scale, 1e-4);
check('有効自由度', atReml.edf, single.edf, 1e-5);
check('係数の最大のずれ', Math.max(...atReml.beta.map((v, i) => Math.abs(v - single.coef[i]))) + 1, 1, 1e-5);
check('REML で選ぶ λ', minimizeLog((l) => M.fitGaussian(stats, info, [l]).reml, 1e-6, 1e6), single.sp, 1e-3);
const atGcv = M.fitGaussian(stats, info, [single.spGcv]);
check('GCV の値（mgcv の λ で）', atGcv.gcv, single.gcv, 1e-6);
check('GCV で選ぶ λ', minimizeLog((l) => M.fitGaussian(stats, info, [l]).gcv, 1e-6, 1e6), single.spGcv, 1e-3);
console.log(`   ペナルティの階数 ${info[0].rank}、ペナルティのかからない係数 ${atReml.nullDim} 個`);
console.log(`   自分で固有値分解して作った基底と mgcv の基底の空間のずれ（相対）: ${single.spanGap.toExponential(1)}`);
console.log(`   λ: REML ${single.sp.toPrecision(4)}（edf ${single.edf.toFixed(2)}）、GCV ${single.spGcv.toPrecision(4)}（edf ${single.edfGcv.toFixed(2)}）`);
const shrink = M.shrinkageBasis(stats, M.totalPenalty(info, [1]));
console.log(`   縮みの強さ d_k: ${shrink.d.map((v) => v.toExponential(1)).join(', ')}`);
console.log(`   REML の λ での縮み率 1/(1+λd): ${shrink.d.map((v) => (1 / (1 + single.sp * v)).toFixed(3)).join(', ')}`);
check('縮み率の和 = 有効自由度', shrink.d.reduce((sum, v) => sum + 1 / (1 + single.sp * v), 0), single.edf, 1e-5);
console.log(`   固有値の大きさ（上位12）: ${single.eigenAbs.slice(0, 12).map((v) => v.toExponential(1)).join(', ')}`);
for (const lambda of [1e-4, 1e-2, 1, 1e2, 1e4, 1e6]) {
  const fit = M.fitGaussian(stats, info, [lambda]);
  console.log(`   λ = ${lambda.toExponential(0)}: edf ${fit.edf.toFixed(2)}、RSS ${fit.rss.toFixed(1)}、GCV ${fit.gcv.toFixed(3)}、REML ${fit.reml.toFixed(2)}`);
}

// ---- 例B の基底を40本にしたもの ----
const wide = DATA.wide;
const statsWide = M.gaussianStats(wide.X, single.y);
const infoWide = M.penaltyInfo([wide.S], [2], wide.X[0].length);
console.log(`\n例B（1変数、k = ${wide.k}）`);
check('REML の値（mgcv の λ で）', M.fitGaussian(statsWide, infoWide, [wide.sp]).reml, wide.reml, 1e-6);
check('REML で選ぶ λ', minimizeLog((l) => M.fitGaussian(statsWide, infoWide, [l]).reml, 1e-8, 1e6), wide.sp, 1e-3);
check('GCV で選ぶ λ', minimizeLog((l) => M.fitGaussian(statsWide, infoWide, [l]).gcv, 1e-8, 1e6), wide.spGcv, 1e-3);
check('有効自由度', M.fitGaussian(statsWide, infoWide, [wide.sp]).edf, wide.edf, 1e-5);
console.log(`   λ: REML ${wide.sp.toPrecision(4)}（edf ${wide.edf.toFixed(2)}）、GCV ${wide.spGcv.toPrecision(4)}（edf ${wide.edfGcv.toFixed(2)}）`);

// ---- 例A の2項モデル: REML の面とニュートン法 ----
const two = DATA.two;
const stats2 = { XtX: two.XtX, Xty: two.Xty, yty: two.yty, n: two.n };
const info2 = M.penaltyInfo(two.S, two.off, two.Xty.length);
console.log('\n例A の2項モデル（s(x1) + s(x2)）');
check('REML の値（mgcv の λ で）', M.fitGaussian(stats2, info2, two.sp).reml, two.reml, 1e-6);
const path = M.newtonReml(stats2, info2, two.initialSp);
const last = path[path.length - 1];
check('ニュートン法の λ₁', Math.exp(last.rho[0]), two.sp[0], 1e-3);
check('ニュートン法の λ₂', Math.exp(last.rho[1]), two.sp[1], 1e-3);
console.log(`   出発点 log λ = (${two.initialSp.map((v) => Math.log(v).toFixed(2)).join(', ')})、この動画の反復 ${path.length - 1} 回、mgcv の反復 ${two.outerIter} 回`);
path.forEach((step, i) => console.log(`   ${i}: log λ = (${step.rho.map((v) => v.toFixed(3)).join(', ')})  REML ${step.reml.toFixed(4)}`));

// ---- 例C: ポアソンの P-IRLS ----
const pois = DATA.poisson;
const infoP = M.penaltyInfo([pois.S], [2], pois.X[0].length);
const steps = M.pirlsPoisson(pois.X, pois.y, M.totalPenalty(infoP, [pois.sp]));
const final = steps[steps.length - 1];
console.log('\n例C（ポアソン）');
check('逸脱度', final.deviance, pois.deviance, 1e-6);
check('係数の最大のずれ', Math.max(...final.beta.map((v, i) => Math.abs(v - pois.coef[i]))) + 1, 1, 1e-5);
console.log(`   P-IRLS の反復 ${steps.length - 1} 回: 逸脱度 ${steps.map((s) => s.deviance.toFixed(3)).join(' → ')}`);
console.log(`   λ ${pois.sp.toPrecision(4)}、edf ${pois.edf.toFixed(2)}、mgcv の外側の反復 ${pois.outerIter} 回、y の最大 ${Math.max(...pois.y)}`);

// ---- 例A: 4変数 ----
const main = DATA.main;
console.log('\n例A（4変数、REML）');
console.log(`   λ: ${main.sp.map((v) => v.toPrecision(4)).join(', ')}`);
console.log(`   edf: ${main.edf.map((v) => v.toFixed(2)).join(', ')}（GCV: ${main.edfGcv.map((v) => v.toFixed(2)).join(', ')}）`);
console.log(`   λ（GCV）: ${main.spGcv.map((v) => v.toPrecision(4)).join(', ')}`);
console.log(`   切片 ${main.intercept.toFixed(3)}、尺度 ${main.scale.toFixed(3)}（真値 ${main.noiseSd ** 2}）、係数 ${main.coefCount} 個、外側の反復 ${main.outerIter} 回、R²(adj) ${main.rsq.toFixed(3)}`);
main.terms.forEach((term) => {
  const inside = term.truth.filter((v, i) => Math.abs(v - term.fit[i]) <= 2 * term.se[i]).length;
  console.log(`   s(${term.name}): 真の関数が帯（±2SE）に入る割合 ${inside}/${term.truth.length}`);
});
console.log(main.summaryText.join('\n'));

// ---- k の確認 ----
console.log('\nk を変えた当てはめ（例B）');
DATA.kStudy.forEach((item) => {
  const rmse = Math.sqrt(item.fit.reduce((sum, v, i) => sum + (v - single.truth[i]) ** 2, 0) / item.fit.length);
  console.log(`   k = ${item.k}: k' ${item.kPrime}、edf ${item.edf.toFixed(2)}、k-index ${item.kIndex.toFixed(2)}、p ${item.pValue.toFixed(3)}、真の関数との差（RMSE）${rmse.toFixed(3)}、AIC ${item.aic.toFixed(1)}`);
});

// ---- GCV と REML の繰り返し ----
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const quantile = (values, q) => values.slice().sort((a, b) => a - b)[Math.round(q * (values.length - 1))];
for (const [name, study] of [['なめらかな関数 2sin(πx)', DATA.repeats.smooth], ['細かい山のある関数 f2', DATA.repeats.wiggly]]) {
  console.log(`\n繰り返し ${DATA.repeats.count} 回（${name}、k = ${DATA.repeats.k}）`);
  for (const [label, edf, mse] of [['REML', study.edfReml, study.mseReml], ['GCV ', study.edfGcv, study.mseGcv]]) {
    console.log(`   ${label}: edf 中央値 ${quantile(edf, 0.5).toFixed(2)}、5%点 ${quantile(edf, 0.05).toFixed(2)}、95%点 ${quantile(edf, 0.95).toFixed(2)}、最大 ${Math.max(...edf).toFixed(2)}、平均二乗誤差の平均 ${mean(mse).toFixed(4)}`);
  }
  const median = quantile(study.edfReml, 0.5);
  console.log(`   edf が REML の中央値の2倍を超えた回数: REML ${study.edfReml.filter((v) => v > 2 * median).length}、GCV ${study.edfGcv.filter((v) => v > 2 * median).length}`);
  console.log(`   GCV のほうが誤差が小さかった回数: ${study.mseGcv.filter((v, i) => v < study.mseReml[i]).length}`);
}

if (failures.length) throw new Error(`mgcv と合わない項目: ${failures.join('、')}`);
console.log('\nすべて mgcv と一致');
