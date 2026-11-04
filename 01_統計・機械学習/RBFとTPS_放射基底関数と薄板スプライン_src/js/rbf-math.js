// rbf-math.js — RBF 補間・TPS の計算と、説明用のデータ（1次元・2次元の点、ノイズつきの点、顔の絵のランドマーク）。
// 乱数は種を固定する。録画で同じ時刻 t に必ず同じ絵を出すため。
// node からも読めるように、window が無ければ globalThis に置く（数値の確認用: node tools/check-math.mjs）。
// 点は座標の配列（1次元なら [x]、2次元なら [x, y]）で持つ。
(typeof window !== 'undefined' ? window : globalThis).RBFM = (() => {
  // ---- 乱数 ----
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

  // ---- 基底関数 φ(r)。r は中心からの距離 ----
  const BASIS = {
    gaussian: (eps) => (r) => Math.exp(-((eps * r) ** 2)),
    inverseMultiquadric: (eps) => (r) => 1 / Math.sqrt(1 + (eps * r) ** 2),
    multiquadric: (eps) => (r) => Math.sqrt(1 + (eps * r) ** 2),
    cubic: () => (r) => r ** 3,
    // r = 0 では r² log r → 0 なので 0 とする（log 0 を計算しない）
    thinPlate: () => (r) => (r > 0 ? r * r * Math.log(r) : 0),
  };
  const distance = (p, q) => {
    let sum = 0;
    for (let k = 0; k < p.length; k++) sum += (p[k] - q[k]) ** 2;
    return Math.sqrt(sum);
  };
  // 多項式の項: degree = 1 なら [1, x, y]（平面）、0 なら [1]、−1 なら無し
  const polyTerms = (p, degree) => (degree < 0 ? [] : degree === 0 ? [1] : [1, ...p]);

  // ---- 連立1次方程式（部分ピボット選択つきのガウスの消去法）。A は行の配列。A と b は書きかえない ----
  function solve(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const diagonal = M[col][col];
      if (diagonal === 0) throw new Error('solve: 行列が特異です');
      for (let r = col + 1; r < n; r++) {
        const factor = M[r][col] / diagonal;
        if (factor === 0) continue;
        for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let sum = M[r][n];
      for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
      x[r] = sum / M[r][r];
    }
    return x;
  }

  // 点どうしの距離の行列 Φᵢⱼ = φ(‖xᵢ − xⱼ‖)
  const kernelMatrix = (centers, phi) => centers.map((p) => centers.map((q) => phi(distance(p, q))));

  // ---- RBF 補間（平滑化つき）----
  // [Φ + smooth·I   P] [w]   [y]
  // [Pᵀ             0] [c] = [0]
  // smooth = 0 なら全点を通る補間。返す model.at(p) が補間した値
  function fit(centers, values, phi, { degree = -1, smooth = 0 } = {}) {
    const n = centers.length;
    const m = polyTerms(centers[0], degree).length;
    const A = Array.from({ length: n + m }, () => new Float64Array(n + m));
    const K = kernelMatrix(centers, phi);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] = K[i][j] + (i === j ? smooth : 0);
      polyTerms(centers[i], degree).forEach((v, k) => {
        A[i][n + k] = v;
        A[n + k][i] = v;
      });
    }
    const rhs = new Float64Array(n + m);
    values.forEach((v, i) => (rhs[i] = v));
    const solution = solve(A, rhs);
    const w = solution.slice(0, n);
    const c = solution.slice(n);
    const at = (p) => {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += w[j] * phi(distance(p, centers[j]));
      polyTerms(p, degree).forEach((v, k) => (sum += c[k] * v));
      return sum;
    };
    // 多項式の部分だけ（TPS なら平面）と、基底関数の部分だけ
    const polyAt = (p) => polyTerms(p, degree).reduce((sum, v, k) => sum + c[k] * v, 0);
    const basisAt = (p) => at(p) - polyAt(p);
    return { centers, values, phi, degree, smooth, w, c, K, at, polyAt, basisAt };
  }

  // ---- 対称行列の固有値（ヤコビ法）と条件数 ----
  const JACOBI_SWEEPS = 60;
  function symmetricEigenvalues(K) {
    const n = K.length;
    const A = K.map((row) => Float64Array.from(row));
    for (let sweep = 0; sweep < JACOBI_SWEEPS; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] ** 2;
      if (off < 1e-30) break;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p];
            const akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k];
            const aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
        }
      }
    }
    return Array.from({ length: n }, (_, i) => A[i][i]).sort((a, b) => b - a);
  }
  // 条件数 = 最大の固有値 ÷ 最小の固有値（正定値の行列。ガウスの Φ に使う）
  const conditionNumber = (K) => {
    const eig = symmetricEigenvalues(K);
    return Math.abs(eig[0]) / Math.abs(eig[eig.length - 1]);
  };

  // ---- 比べるための素朴な方法（2次元） ----
  // 最近傍: いちばん近い点の値
  const nearest = (centers, values) => (p) => {
    let best = 0;
    let bestDistance = Infinity;
    centers.forEach((q, j) => {
      const d = distance(p, q);
      if (d < bestDistance) [best, bestDistance] = [j, d];
    });
    return values[best];
  };
  // 逆距離加重（IDW）: 距離の power 乗の逆数で重みをつけた平均
  const IDW_POWER = 2;
  const inverseDistance = (centers, values) => (p) => {
    let num = 0;
    let den = 0;
    for (let j = 0; j < centers.length; j++) {
      const d = distance(p, centers[j]);
      if (d < 1e-12) return values[j];
      const weight = d ** -IDW_POWER;
      num += weight * values[j];
      den += weight;
    }
    return num / den;
  };

  // ---- 2階微分（曲げエネルギーの密度に使う）。2次元の点 p での [fxx, fxy, fyy] ----
  // r² log r: fxx = 2 log r + 1 + 2dx²/r²、fxy = 2 dx dy / r²、fyy = 2 log r + 1 + 2dy²/r²（平面の項の2階微分は 0）
  function secondDerivativesThinPlate(model, p) {
    let fxx = 0;
    let fxy = 0;
    let fyy = 0;
    model.centers.forEach((q, j) => {
      const dx = p[0] - q[0];
      const dy = p[1] - q[1];
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-24) return;
      const logTerm = Math.log(r2) + 1; // 2 log r + 1
      fxx += model.w[j] * (logTerm + (2 * dx * dx) / r2);
      fxy += model.w[j] * ((2 * dx * dy) / r2);
      fyy += model.w[j] * (logTerm + (2 * dy * dy) / r2);
    });
    return [fxx, fxy, fyy];
  }
  // exp(−ε²r²): fxx = (4ε⁴dx² − 2ε²)φ、fxy = 4ε⁴ dx dy φ、fyy = (4ε⁴dy² − 2ε²)φ
  function secondDerivativesGaussian(model, eps, p) {
    const e2 = eps * eps;
    let fxx = 0;
    let fxy = 0;
    let fyy = 0;
    model.centers.forEach((q, j) => {
      const dx = p[0] - q[0];
      const dy = p[1] - q[1];
      const phi = Math.exp(-e2 * (dx * dx + dy * dy));
      fxx += model.w[j] * (4 * e2 * e2 * dx * dx - 2 * e2) * phi;
      fxy += model.w[j] * 4 * e2 * e2 * dx * dy * phi;
      fyy += model.w[j] * (4 * e2 * e2 * dy * dy - 2 * e2) * phi;
    });
    return [fxx, fxy, fyy];
  }
  const energyDensity = ([fxx, fxy, fyy]) => fxx * fxx + 2 * fxy * fxy + fyy * fyy;
  // 曲げエネルギー J = ∬ (fxx² + 2fxy² + fyy²) dx dy を、[−half, half]² の格子の中点で数値積分する
  function bendingEnergyNumeric(second, half, step) {
    let sum = 0;
    for (let x = -half + step / 2; x < half; x += step) {
      for (let y = -half + step / 2; y < half; y += step) sum += energyDensity(second([x, y]));
    }
    return sum * step * step;
  }
  // TPS の曲げエネルギーは式で出せる: Δ²(r² log r) = 8πδ なので J = 8π Σ wⱼ yⱼ（= 8π wᵀΦw）
  const thinPlateEnergy = (model) => 8 * Math.PI * model.w.reduce((sum, w, j) => sum + w * model.values[j], 0);
  // 1次元の r³（自然3次スプライン）: d⁴|x|³/dx⁴ = 12δ なので ∫ f''² dx = 12 Σ wⱼ yⱼ
  const cubicEnergy1D = (model) => 12 * model.w.reduce((sum, w, j) => sum + w * model.values[j], 0);

  // ---- 平滑化スプライン（1次元、r³ ＋ 直線）と1点抜き交差検証 ----
  // Σ(yᵢ − f(xᵢ))² + λ ∫ f''² dx の最小化は、Φ の対角に 12λ を足すのと同じ
  const CUBIC_ENERGY_FACTOR = 12;
  const smoothingSpline1D = (xs, ys, lambda) =>
    fit(xs.map((x) => [x]), ys, BASIS.cubic(), { degree: 1, smooth: CUBIC_ENERGY_FACTOR * lambda });
  // 1点抜き交差検証の誤差 CV(λ) = (1/n) Σ ((yᵢ − ŷᵢ) / (1 − Hᵢᵢ))²。H は y → ŷ の行列（ハット行列）
  function leaveOneOutError(xs, ys, lambda) {
    const n = xs.length;
    const fitted = smoothingSpline1D(xs, ys, lambda);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const unit = ys.map((_, k) => (k === i ? 1 : 0));
      const hii = smoothingSpline1D(xs, unit, lambda).at([xs[i]]);
      sum += ((ys[i] - fitted.at([xs[i]])) / (1 - hii)) ** 2;
    }
    return sum / n;
  }

  // ================================================================ 説明用のデータ
  // 1次元: 7点（間隔は少し不ぞろい）。値は式で作った（実在のデータではない）
  const curve1D = (x) => 0.9 * Math.sin(0.85 * x + 0.3) + 0.12 * x;
  const DATA1_X = [0.6, 1.9, 3.1, 4.5, 5.6, 7.3, 8.9];
  const DATA1_Y = DATA1_X.map(curve1D);
  // 1次元: 同じ x で、直線の上に並んだ値
  const LINE1_Y = DATA1_X.map((x) => 0.22 * x - 0.6);

  // 1次元: ノイズつきの 30 点（もとの関数 + 標準偏差 NOISE_SD の正規乱数、種を固定）
  const NOISY_COUNT = 30;
  const NOISE_SD = 0.3;
  const NOISY_SEED = 7;
  const NOISY_X = (() => {
    const rand = createRandom(NOISY_SEED);
    return Array.from({ length: NOISY_COUNT }, (_, i) => 0.25 + (9.5 * (i + 0.2 + 0.6 * rand())) / NOISY_COUNT);
  })();
  const NOISY_Y = (() => {
    const noise = standardNormals(NOISY_COUNT, NOISY_SEED + 1);
    return NOISY_X.map((x, i) => curve1D(x) + NOISE_SD * noise[i]);
  })();

  // 2次元: [−1, 1]² に散らばった 14 点。値は「傾いた平面 + 山 + 谷」の式で作った
  const surface2D = ([x, y]) =>
    0.2 + 0.45 * x + 0.3 * y + 0.75 * Math.exp(-((x - 0.25) ** 2 + (y - 0.2) ** 2) / 0.16) - 0.55 * Math.exp(-((x + 0.5) ** 2 + (y + 0.45) ** 2) / 0.1);
  const DATA2_P = [
    [-0.85, -0.7], [-0.3, -0.85], [0.35, -0.75], [0.85, -0.55],
    [-0.75, -0.05], [-0.45, -0.4], [0.25, -0.15], [0.7, 0.1],
    [-0.9, 0.6], [-0.4, 0.4], [0.1, 0.35], [0.55, 0.65],
    [-0.05, 0.85], [0.9, 0.85],
  ];
  const DATA2_Y = DATA2_P.map(surface2D);

  // 顔の絵のランドマーク（[−1, 1]²）。四すみ、目、鼻、口
  const LANDMARKS = [
    [-1, -1], [1, -1], [1, 1], [-1, 1],
    [-0.34, 0.3], [0.34, 0.3],
    [0, -0.02],
    [-0.4, -0.38], [0.4, -0.38], [0, -0.46],
  ];

  return {
    createRandom, standardNormals, BASIS, distance, solve, kernelMatrix, fit,
    symmetricEigenvalues, conditionNumber, nearest, inverseDistance,
    secondDerivativesThinPlate, secondDerivativesGaussian, energyDensity, bendingEnergyNumeric, thinPlateEnergy, cubicEnergy1D,
    smoothingSpline1D, leaveOneOutError,
    curve1D, DATA1_X, DATA1_Y, LINE1_Y, NOISY_X, NOISY_Y, NOISE_SD,
    surface2D, DATA2_P, DATA2_Y, LANDMARKS,
  };
})();
