// check-math.mjs — 動画に出す最適化の計算を確かめる（node tools/check-math.mjs）。
// ・2ループ再帰の答えが、同じ組から行列で作った H g と一致すること
// ・BFGS の更新が割線条件 H y = s を満たすこと
// ・2次関数で BFGS が H → A⁻¹ に近づくこと
// ・各手法の反復回数と勾配の計算回数
import '../js/opt-math.js';

const O = globalThis.OPTM;
const TOLERANCE = 1e-9;

// 2ループ再帰と行列の一致
{
  const n = 5;
  const A = [
    [4, 1, 0, 0, 0],
    [1, 3, 1, 0, 0],
    [0, 1, 5, 1, 0],
    [0, 0, 1, 2, 1],
    [0, 0, 0, 1, 6],
  ];
  const problem = O.quadratic(A);
  const run = O.lbfgs(problem, [1, -1, 2, 0.5, -2], { memory: 3, iterations: 4, keepPairs: true, tolerance: 0 });
  const pairs = run.pairs;
  const gradient = [0.3, -1, 0.7, 2, -0.4];
  const last = pairs[pairs.length - 1];
  const gamma = O.dot(last.s, last.y) / O.dot(last.y, last.y);
  let H = O.identity(n).map((row) => row.map((v) => v * gamma));
  pairs.forEach(({ s, y }) => (H = O.bfgsUpdate(H, s, y)));
  const byMatrix = O.matVec(H, gradient);
  const byLoop = O.twoLoop(gradient, pairs);
  const gap = O.norm(O.add(byMatrix, byLoop, -1));
  console.log(`2ループ再帰と行列の差: ${gap.toExponential(2)}（組の数 ${pairs.length}）`);
  if (gap > TOLERANCE) throw new Error('2ループ再帰が行列と一致しません');
  const { s, y } = pairs[pairs.length - 1];
  const secant = O.norm(O.add(O.matVec(H, y), s, -1));
  console.log(`割線条件 H y = s のずれ: ${secant.toExponential(2)}`);
  if (secant > TOLERANCE) throw new Error('割線条件を満たしません');
}

// 2次関数で H が A⁻¹ に近づく
{
  const problem = O.valley(25, 0.5);
  const run = O.bfgs(problem, [2, 2], { keepMatrices: true });
  const A = problem.h();
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const inverse = [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det],
  ];
  const last = run.matrices[run.matrices.length - 1];
  const gap = Math.hypot(...last.flat().map((v, i) => v - inverse.flat()[i]));
  console.log(`2次関数（κ = 25）: BFGS ${run.path.length - 1} 回で収束、H と A⁻¹ の差 ${gap.toExponential(2)}`);
}

const start = [-1.2, 1];
const table = {
  勾配降下法: O.gradientDescent(O.rosenbrock, start, { iterations: 20000, tolerance: 1e-5 }),
  ニュートン法: O.newton(O.rosenbrock, start, { tolerance: 1e-5 }),
  BFGS: O.bfgs(O.rosenbrock, start, { tolerance: 1e-5 }),
  'L-BFGS(m=5)': O.lbfgs(O.rosenbrock, start, { memory: 5, tolerance: 1e-5 }),
};
Object.entries(table).forEach(([name, r]) => console.log(`ローゼンブロック ${name}: 反復 ${r.path.length - 1}、勾配の計算 ${r.evaluations}、f = ${r.values[r.values.length - 1].toExponential(2)}`));

const n = 1000;
const x0 = Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1.2));
const chain = O.chainedRosenbrock(n);
for (const memory of [1, 3, 5, 10, 20, 50]) {
  const r = O.lbfgs(chain, x0, { memory, tolerance: 1e-4, iterations: 30000 });
  console.log(`1000次元 m=${memory}: 反復 ${r.path.length - 1}、勾配 ${r.evaluations}、f = ${r.values[r.values.length - 1].toExponential(2)}`);
}
