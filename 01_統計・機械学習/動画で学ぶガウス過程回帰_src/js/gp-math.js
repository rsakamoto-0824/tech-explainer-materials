// gp-math.js — ガウス過程回帰の計算（カーネル、コレスキー分解、予測、周辺尤度、サンプル）。
// 乱数は種を固定する。録画で同じ時刻 t に必ず同じ絵を出すため。
// node からも読めるように、window が無ければ globalThis に置く（数値の確認用）。
(typeof window !== 'undefined' ? window : globalThis).GPM = (() => {
  // コレスキー分解でこれより小さいピボットは 0 とみなす（サンプル用。ほぼ特異な行列でも止まらないように）
  const PIVOT_FLOOR = 1e-12;

  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 標準正規乱数（ボックス＝ミュラー法）
  function standardNormals(count, seed) {
    const rand = createRandom(seed);
    const values = new Float64Array(count);
    for (let i = 0; i < count; i += 2) {
      const radius = Math.sqrt(-2 * Math.log(1 - rand()));
      const angle = 2 * Math.PI * rand();
      values[i] = radius * Math.cos(angle);
      if (i + 1 < count) values[i + 1] = radius * Math.sin(angle);
    }
    return values;
  }

  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

  // ---- カーネル（2点 a, b を受け取り、共分散を返す関数を作る） ----
  const rbf = ({ variance = 1, lengthScale = 1 } = {}) => (a, b) =>
    variance * Math.exp(-((a - b) ** 2) / (2 * lengthScale ** 2));

  const periodic = ({ variance = 1, lengthScale = 1, period = 1 } = {}) => (a, b) => {
    const s = Math.sin((Math.PI * Math.abs(a - b)) / period);
    return variance * Math.exp((-2 * s * s) / lengthScale ** 2);
  };

  // ---- Matérn カーネル（なめらかさ ν） ----
  // ガンマ関数の対数（ランチョス近似）。ν が大きいと Γ(ν) そのものは桁あふれするので対数で扱う
  const LANCZOS = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  function logGamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    const shifted = x - 1;
    const t = shifted + 7.5;
    let series = LANCZOS[0];
    for (let i = 1; i < LANCZOS.length; i++) series += LANCZOS[i] / (shifted + i);
    return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(series);
  }

  // 変形ベッセル関数 K_ν(z) の対数。K_ν(z) = ∫₀^∞ exp(−z cosh t) cosh(νt) dt を台形則で積分する。
  // 被積分関数は t = 0 で傾きが 0 のなめらかな関数なので、台形則で十分に正確になる（半整数の閉じた式と照合済み）
  const BESSEL_STEPS = 600;
  const BESSEL_TAIL = 60; // 被積分関数の対数が、山の高さよりこれだけ下がった所で積分を打ち切る
  const CLOSED_FORM_MAX_ORDER = 20; // これより大きい半整数の ν は、閉じた式の階乗があふれるので K_ν で計算する
  function logBesselK(nu, z) {
    const logCosh = (v) => v + Math.log1p(Math.exp(-2 * v)) - Math.LN2;
    const logIntegrand = (t) => -z * Math.cosh(t) + logCosh(nu * t);
    let top = 0.25;
    let peak = Math.max(logIntegrand(0), logIntegrand(top));
    while (logIntegrand(top) > peak - BESSEL_TAIL) {
      top *= 1.25;
      peak = Math.max(peak, logIntegrand(top));
    }
    const h = top / BESSEL_STEPS;
    const values = Array.from({ length: BESSEL_STEPS + 1 }, (_, i) => logIntegrand(i * h) + (i === 0 || i === BESSEL_STEPS ? -Math.LN2 : 0));
    const max = Math.max(...values);
    return Math.log(h) + max + Math.log(values.reduce((acc, v) => acc + Math.exp(v - max), 0));
  }

  // 相関 k(r)/σ_f² を ρ = r/ℓ の関数として返す。ν = 1/2, 3/2, 5/2 … は閉じた式、ν = ∞ は RBF、それ以外は K_ν を使う
  function maternCorrelation(nu) {
    if (nu === Infinity) return (rho) => Math.exp(-0.5 * rho * rho);
    const order = nu - 0.5;
    if (Number.isInteger(order) && order <= CLOSED_FORM_MAX_ORDER) {
      // k = exp(−√(2ν)ρ) · p!/(2p)! · Σ_{i=0}^{p} (p+i)!/(i!(p−i)!) · (2√(2ν)ρ)^{p−i}　（Rasmussen & Williams 式 4.16）
      const factorial = (m) => Math.exp(logGamma(m + 1));
      const coefficients = Array.from({ length: order + 1 }, (_, i) => (factorial(order) / factorial(2 * order)) * (factorial(order + i) / (factorial(i) * factorial(order - i))));
      return (rho) => {
        const z = Math.sqrt(2 * nu) * rho;
        return Math.exp(-z) * coefficients.reduce((acc, c, i) => acc + c * (2 * z) ** (order - i), 0);
      };
    }
    const logScale = (1 - nu) * Math.LN2 - logGamma(nu);
    return (rho) => {
      const z = Math.sqrt(2 * nu) * rho;
      if (z < 1e-9) return 1;
      return Math.exp(logScale + nu * Math.log(z) + logBesselK(nu, z));
    };
  }

  const matern = ({ variance = 1, lengthScale = 1, nu = 1.5 } = {}) => {
    const correlation = maternCorrelation(nu);
    return (a, b) => variance * correlation(Math.abs(a - b) / lengthScale);
  };

  // スペクトル密度（角周波数 ω の確率密度。k(r) = σ_f² ∫ p(ω) cos(ωr) dω）。
  // Matérn は自由度 2ν・尺度 1/ℓ の t 分布、ν = ∞（RBF）は分散 1/ℓ² の正規分布になる
  function maternSpectralDensity({ lengthScale = 1, nu = 1.5 } = {}) {
    if (nu === Infinity) return (omega) => (lengthScale / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * (lengthScale * omega) ** 2);
    const logNormalizer = logGamma(nu + 0.5) - logGamma(nu) - 0.5 * Math.log(2 * nu * Math.PI);
    return (omega) => lengthScale * Math.exp(logNormalizer - (nu + 0.5) * Math.log1p((lengthScale * omega) ** 2 / (2 * nu)));
  }

  const sum = (...kernels) => (a, b) => kernels.reduce((acc, k) => acc + k(a, b), 0);
  const product = (...kernels) => (a, b) => kernels.reduce((acc, k) => acc * k(a, b), 1);
  // 多次元の入力 [x1, x2] のうち、1つの次元だけを見るカーネル
  const onDim = (dim, kernel) => (a, b) => kernel(a[dim], b[dim]);

  // ---- 行列の計算 ----
  const gram = (xa, xb, kernel) => xa.map((a) => Float64Array.from(xb, (b) => kernel(a, b)));
  const withDiagonal = (K, value) =>
    K.map((row, i) => {
      const copy = Float64Array.from(row);
      copy[i] += value;
      return copy;
    });
  const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };

  // A = L Lᵀ。lenient: true なら、ほぼ特異な行列でもピボットを 0 にして続ける（サンプルを作るときだけ使う）
  function cholesky(A, { lenient = false } = {}) {
    const n = A.length;
    const L = Array.from({ length: n }, () => new Float64Array(n));
    for (let j = 0; j < n; j++) {
      let d = A[j][j];
      for (let k = 0; k < j; k++) d -= L[j][k] * L[j][k];
      if (d <= PIVOT_FLOOR) {
        if (!lenient) throw new Error(`cholesky: 正定値ではありません（${j} 行目、${d}）`);
        continue;
      }
      const pivot = Math.sqrt(d);
      L[j][j] = pivot;
      for (let i = j + 1; i < n; i++) {
        let s = A[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        L[i][j] = s / pivot;
      }
    }
    return L;
  }

  function solveLower(L, b) {
    const n = L.length;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }
  function solveUpperTransposed(L, b) {
    const n = L.length;
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }
  const choleskySolve = (L, b) => solveUpperTransposed(L, solveLower(L, b));

  function determinant(A) {
    // 小さな行列の表示用（ガウスの消去法、部分ピボット）
    const M = A.map((row) => Array.from(row));
    const n = M.length;
    let det = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-15) return 0;
      if (p !== c) {
        [M[p], M[c]] = [M[c], M[p]];
        det = -det;
      }
      det *= M[c][c];
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return det;
  }

  // ---- サンプル: f = L z（K = L Lᵀ） ----
  function multiplyLower(L, z) {
    const n = L.length;
    const f = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k <= i; k++) s += L[i][k] * z[k];
      f[i] = s;
    }
    return f;
  }
  function sampleFunctions(xs, kernel, normalsList, jitter = 1e-6) {
    const L = cholesky(withDiagonal(gram(xs, xs, kernel), jitter), { lenient: true });
    return normalsList.map((z) => multiplyLower(L, z));
  }

  // ---- 学習と予測 ----
  function fit(xTrain, yTrain, kernel, noiseVariance) {
    const L = cholesky(withDiagonal(gram(xTrain, xTrain, kernel), noiseVariance));
    const alpha = choleskySolve(L, yTrain);
    return { xTrain, yTrain, kernel, noiseVariance, L, alpha };
  }

  // partKernel を渡すと、加法カーネルの「部品」だけの予測を返す。α は全体で共通
  function predict(model, xTest, partKernel = model.kernel, { withVariance = true } = {}) {
    const mean = new Float64Array(xTest.length);
    const variance = new Float64Array(xTest.length);
    xTest.forEach((x, i) => {
      const kStar = Float64Array.from(model.xTrain, (xt) => partKernel(x, xt));
      mean[i] = dot(kStar, model.alpha);
      if (withVariance) {
        const v = solveLower(model.L, kStar);
        variance[i] = Math.max(partKernel(x, x) - dot(v, v), 0);
      }
    });
    return { mean, variance, sd: variance.map(Math.sqrt) };
  }

  function posteriorSamples(model, xTest, normalsList, jitter = 1e-6) {
    const kernel = model.kernel;
    const V = xTest.map((x) => solveLower(model.L, Float64Array.from(model.xTrain, (xt) => kernel(x, xt))));
    const cov = xTest.map((a, i) =>
      Float64Array.from(xTest, (b, j) => kernel(a, b) - dot(V[i], V[j]) + (i === j ? jitter : 0)),
    );
    const L = cholesky(cov, { lenient: true });
    const { mean } = predict(model, xTest, kernel, { withVariance: false });
    return normalsList.map((z) => multiplyLower(L, z).map((v, i) => v + mean[i]));
  }

  // 加法カーネルの部品ごとの事後分布。部品をまたいだ共分散も返す（部品どうしは事後に相関する）。
  // Cov[f_a(x), f_b(x′) | y] = k_a(x, x′)·[a = b] − k_a(x, X)ᵀ (K + σ_n² I)⁻¹ k_b(X, x′)
  function partsPosterior(model, xTest, partKernels) {
    const V = partKernels.map((k) => xTest.map((x) => solveLower(model.L, Float64Array.from(model.xTrain, (xt) => k(x, xt)))));
    const means = partKernels.map((k) => predict(model, xTest, k, { withVariance: false }).mean);
    const covariance = (a, i, b, j) => (a === b ? partKernels[a](xTest[i], xTest[j]) : 0) - dot(V[a][i], V[b][j]);
    return { means, covariance };
  }
  // 部品をまとめて引いた事後サンプル（部品どうしの相関を保つ）。返り値は [サンプル][部品] の配列
  function samplePartsPosterior(model, xTest, partKernels, normalsList, jitter = 1e-6) {
    const { means, covariance } = partsPosterior(model, xTest, partKernels);
    const n = xTest.length;
    const size = partKernels.length * n;
    const joint = Array.from({ length: size }, (_, r) =>
      Float64Array.from({ length: size }, (_, c) => covariance(Math.floor(r / n), r % n, Math.floor(c / n), c % n) + (r === c ? jitter : 0)),
    );
    const L = cholesky(joint, { lenient: true });
    return normalsList.map((z) => {
      const f = multiplyLower(L, z);
      return means.map((mean, a) => Float64Array.from(mean, (v, i) => v + f[a * n + i]));
    });
  }

  // 対数周辺尤度 = 当てはまり + 複雑さの罰則 + 定数
  function logMarginalLikelihood(xTrain, yTrain, kernel, noiseVariance) {
    const model = fit(xTrain, yTrain, kernel, noiseVariance);
    const n = xTrain.length;
    let logDet = 0;
    for (let i = 0; i < n; i++) logDet += 2 * Math.log(model.L[i][i]);
    const dataFit = -0.5 * dot(yTrain, model.alpha);
    const complexity = -0.5 * logDet;
    const constant = -0.5 * n * Math.log(2 * Math.PI);
    return { dataFit, complexity, constant, total: dataFit + complexity + constant };
  }

  return {
    createRandom, standardNormals, linspace,
    rbf, periodic, sum, product, onDim, matern, maternCorrelation, maternSpectralDensity, logGamma,
    gram, withDiagonal, dot, cholesky, solveLower, choleskySolve, determinant, multiplyLower,
    sampleFunctions, fit, predict, posteriorSamples, partsPosterior, samplePartsPosterior, logMarginalLikelihood,
  };
})();
