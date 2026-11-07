// follow-math.js — 動画の中で計算する小さな数式（時系列の分解、ランダム射影、制約つきカーネル、乱数の関数）。
// 乱数は種を固定する（録画で同じ時刻 t に必ず同じ絵を出すため）。
window.FOLLOWM = (() => {
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
  function cholesky(A) {
    const n = A.length;
    const L = A.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = A[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        L[i][j] = i === j ? Math.sqrt(Math.max(sum, 1e-14)) : sum / L[j][j];
      }
    }
    return L;
  }
  function solveCholesky(L, b) {
    const n = b.length;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
      y[i] = sum / L[i][i];
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  }
  const se = (a, b, ell) => Math.exp(-((a - b) ** 2) / (2 * ell * ell));
  const periodic = (a, b, period, ell) => Math.exp((-2 * Math.sin((Math.PI * Math.abs(a - b)) / period) ** 2) / (ell * ell));

  // 制約つきの SE カーネル（入力の分布は [−1, 1] の一様分布）
  const normalCdf = (x) => {
    // アブラモウィッツ・ステガンの近似より精度のよい erf の級数を使う
    const erf = (v) => {
      let sum = v;
      let term = v;
      for (let n = 1; n < 80; n++) {
        term *= (-v * v) / n;
        sum += term / (2 * n + 1);
      }
      return (2 / Math.sqrt(Math.PI)) * sum;
    };
    return 0.5 * (1 + erf(x / Math.SQRT2));
  };
  const meanKernel = (x, ell) => ((ell * Math.sqrt(2 * Math.PI)) / 2) * (normalCdf((1 - x) / ell) - normalCdf((-1 - x) / ell));
  const totalKernel = (ell) => {
    let sum = 0;
    const count = 400;
    for (let i = 0; i < count; i++) sum += meanKernel(-1 + (2 * (i + 0.5)) / count, ell);
    return sum / count;
  };
  const constrained = (a, b, ell, total = totalKernel(ell)) => se(a, b, ell) - (meanKernel(a, ell) * meanKernel(b, ell)) / total;

  function drawFrom(L, seed) {
    const random = makeRandom(seed);
    const u = Array.from({ length: L.length }, () => random.normal());
    return L.map((row) => row.reduce((sum, v, j) => sum + v * u[j], 0));
  }
  return { makeRandom, cholesky, solveCholesky, se, periodic, meanKernel, totalKernel, constrained, drawFrom };
})();
