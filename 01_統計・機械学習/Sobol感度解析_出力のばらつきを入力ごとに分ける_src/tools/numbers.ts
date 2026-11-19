// 台本（src/script.ts）に書く数値を表示する: node tools/numbers.ts
import {ISHIGAMI, MATRICES, PRECOMPUTED, PRODUCT, SCATTER, SIX} from '../src/lib/data.ts';
const f = (v: number, d = 3) => v.toFixed(d);
console.log('石上 分散', f(ISHIGAMI.total), '一次', ISHIGAMI.first.map((v) => f(v)), '総合', ISHIGAMI.totalEffect.map((v) => f(v)), '総合の和', f(ISHIGAMI.totalEffect.reduce((a, b) => a + b)));
console.log('散布図の区間平均による一次効果', SCATTER.perInput.map((p) => f(p.firstEstimate)));
console.log('X1X2 の Y の範囲', f(Math.min(...PRODUCT.ys)), f(Math.max(...PRODUCT.ys)), '分散', f(PRODUCT.ys.reduce((s, y) => s + y * y, 0) / PRODUCT.ys.length));
console.log('6入力 一次', SIX.first.map((v) => f(v)), '総合', SIX.totalEffect.map((v) => f(v)), 'X4〜X6 の総合の和', f(SIX.totalEffect[3] + SIX.totalEffect[4] + SIX.totalEffect[5]));
console.log('行列 f(A)', MATRICES.outA.map((v) => f(v, 2)).join(' '));
console.log('行列 f(AB3)', MATRICES.outAB3.map((v) => f(v, 2)).join(' '));
const b = PRECOMPUTED.bootstrap;
console.log('N=4096 一次', b.first, b.firstInterval, '総合', b.totalEffect, b.totalEffectInterval);
const i1024 = PRECOMPUTED.sampleSizes.indexOf(1024);
console.log('N=1024 の誤差 乱数', PRECOMPUTED.rmse.random[i1024], 'Sobol', PRECOMPUTED.rmse.sobol[i1024], '比', f(PRECOMPUTED.rmse.random[i1024] / PRECOMPUTED.rmse.sobol[i1024], 1));
