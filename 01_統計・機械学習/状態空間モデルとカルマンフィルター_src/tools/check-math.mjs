// check-math.mjs — 計算（js/ssm-math.js）が正しいかを、別の求め方と比べて確かめる。動画に出る主な数値も表示する。
//   node tools/check-math.mjs
globalThis.window = globalThis;
await import('../js/ssm-math.js');
await import('../js/ssm-data.js');
const M = globalThis.SSM;
const D = globalThis.SSMDATA;

const failures = [];
const check = (label, a, b, tolerance = 1e-9) => {
  const gap = Math.abs(a - b);
  console.log(`${gap <= tolerance ? 'OK ' : 'NG '} ${label}: ${a.toPrecision(8)} / ${b.toPrecision(8)}（差 ${gap.toExponential(1)}）`);
  if (gap > tolerance) failures.push(label);
};
const maxGap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

console.log('■ 1次元の式と、行列の式（温度の例）');
const f1 = D.tempFilter;
const steps = D.tempKalman.steps;
check('推定値の最大の差', maxGap(f1.mean, steps.map((s) => s.x[0])), 0);
check('分散の最大の差', maxGap(f1.variance, steps.map((s) => s.P[0][0])), 0);
check('ゲインの最大の差', maxGap(f1.gain, steps.map((s) => s.K[0][0])), 0);
check('対数尤度', f1.logLik, D.tempKalman.logLik);

console.log('\n■ 定常ゲイン（式と、フィルターを回した結果）');
check('温度の例', M.steadyGain(D.TEMP.q, D.TEMP.r), f1.gain[f1.gain.length - 1], 1e-8);

console.log('\n■ 2つの情報を混ぜる（ゲインの形と、分散の逆数で重みをつけた平均）');
const [a, va, b, vb] = [20, 4, 23, 1];
const k = va / (va + vb);
check('平均', a + k * (b - a), (a / va + b / vb) / (1 / va + 1 / vb));
check('分散', (1 - k) * va, 1 / (1 / va + 1 / vb));

console.log('\n■ 平滑化（RTS）: 最後の時刻はフィルターと同じ、分散はフィルター以下');
const smoothMean = D.tempSmooth.xs.map((x) => x[0]);
const smoothVar = D.tempSmooth.Ps.map((P) => P[0][0]);
check('最後の時刻の推定値', smoothMean.at(-1), f1.mean.at(-1));
check('分散がフィルターを超える時刻の数', smoothVar.filter((v, i) => v > f1.variance[i] + 1e-12).length, 0);

console.log('\n■ 平滑化を、全部の観測を一度に使う計算（多変量正規分布の条件づけ）と比べる');
// ローカルレベルモデルでは、x と y の共分散が式で書ける: Cov(x_s, x_t) = P0 + min(s, t)·Q、Cov(y_s, y_t) はそれに R を対角に足したもの
const n = 12;
const ys = D.tempSim.y.slice(0, n);
const { q, r } = D.TEMP;
const { m0, p0 } = D.TEMP_INIT;
const covX = (s, t) => p0 + Math.min(s, t) * q;
const Kyy = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => covX(i + 1, j + 1) + (i === j ? r : 0)));
const weights = M.matVec(M.inverse(Kyy), ys.map((y) => y - m0));
const direct = Array.from({ length: n }, (_, i) => m0 + weights.reduce((sum, w, j) => sum + covX(i + 1, j + 1) * w, 0));
const shortModel = M.localLevelModel(q, r);
const shortFilter = M.kalmanFilter(ys.map((y) => [y]), { ...shortModel, m0: [m0], P0: [[p0]] });
const shortSmooth = M.rtsSmoother(shortFilter.steps, shortModel.F).xs.map((x) => x[0]);
check('平滑化した推定値の最大の差（最初の12点）', maxGap(shortSmooth, direct), 0, 1e-9);
check('フィルターの最後の推定値', shortFilter.steps.at(-1).x[0], direct.at(-1), 1e-9);

console.log('\n■ 動画に出る主な数値');
const fmt = (v, d = 3) => v.toFixed(d);
console.log(`温度: 観測のずれ ${fmt(M.rmse(D.tempSim.y, D.tempSim.x))}、フィルター ${fmt(M.rmse(f1.mean, D.tempSim.x))}、平滑化 ${fmt(M.rmse(smoothMean, D.tempSim.x))}、定常ゲイン ${fmt(M.steadyGain(q, r))}`);
console.log(`手計算の例: ゲイン ${D.handFilter.gain.map((v) => fmt(v)).join(', ')}、推定 ${D.handFilter.mean.map((v) => fmt(v)).join(', ')}、分散 ${D.handFilter.variance.map((v) => fmt(v)).join(', ')}`);
const speedF = D.cartKalman.steps.map((s) => s.x[1]);
const speedS = D.cartSmooth.xs.map((x) => x[1]);
console.log(`台車: 速度のずれ フィルター ${fmt(M.rmse(speedF, D.cartSim.velocity))}、平滑化 ${fmt(M.rmse(speedS, D.cartSim.velocity))}、10秒のゲイン ${D.cartKalman.steps[9].K.map((row) => fmt(row[0])).join(', ')}`);

if (failures.length) throw new Error(`合わない項目: ${failures.join('、')}`);
console.log('\nすべて一致');
